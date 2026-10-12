// G/tests/learning/gate.test.ts
// The learning gate (L-A22, master R62 and Gate A check 2). It blocks when a loaded step that can be current has fewer
// than 3 servable carriers (6 for the school steps R19 and S10). Servable means the planner itself would serve it with
// the committed assets: an `ok` clip in public/audio/*/manifest.json and a picture in public/art/manifest.json.
import { describe, it, expect } from 'vitest';
import { buildContent } from '../../src/core/content/build.ts';
import { readRawContent } from '../../tools/lib/read-content.ts';
import {
  committedAssets, gateReport, gateSteps, stepCarriers, MIN_CARRIERS, MIN_CARRIERS_WIDE, THIN_STEPS,
} from '../../tools/lib/servable.ts';
import type { AssetIndex } from '../../src/core/planner/types.ts';
import { miniContent } from '../fixtures/mini.ts';

const all: AssetIndex = { clip: () => true, picture: () => true };
const noClips: AssetIndex = { clip: () => false, picture: () => true };

describe('the servable carrier count', () => {
  const c = miniContent();

  it('takes loaded steps that can be current or are school steps, never contrast or display steps', () => {
    const ids = gateSteps(c).map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['R02', 'R19', 'S10', 'M01']));
    expect(ids).not.toContain('R04D');
    expect(ids).not.toContain('S03D');
    expect(ids).not.toContain('R06');
    expect(ids).not.toContain('R30');   // release 1.2, not loaded at 1.0
  });

  it('asks 6 of R19 and S10 and 3 of other steps', () => {
    expect(stepCarriers(c, 'R19', all).need).toBe(MIN_CARRIERS_WIDE);
    expect(stepCarriers(c, 'S10', all).need).toBe(MIN_CARRIERS_WIDE);
    expect(stepCarriers(c, 'R02', all).need).toBe(MIN_CARRIERS);
  });

  it('counts only carriers whose clip exists, so a reading step without clips fails', () => {
    expect(stepCarriers(c, 'R02', all).carriers).toBeGreaterThan(0);
    const r = stepCarriers(c, 'R02', noClips);
    expect(r.carriers).toBe(0);
    expect(r.ok).toBe(false);
  });

  it('a word that misses only its picture is not servable for a wish', () => {
    const word = Object.values(c.words).find(w => w.rStep === 'R02' && w.pic !== null)!;
    const before = stepCarriers(c, 'R02', all).carriers;
    const after = stepCarriers(c, 'R02', { clip: () => true, picture: id => id !== word.pic }).carriers;
    expect(after).toBe(before - 1);
  });

  it('spelling, maths and door steps need no asset and always pass', () => {
    for (const id of ['S02', 'M01', 'M07']) {
      const r = stepCarriers(c, id, { clip: () => false, picture: () => false });
      expect(r.ok, id).toBe(true);
      expect(r.assetFree, id).toBe(true);
    }
  });
});

describe('the learning gate on the committed content and assets', () => {
  const c = buildContent(readRawContent());
  const report = gateReport(c, committedAssets());

  it('every loaded step that can be current has enough servable carriers', () => {
    const short = report.filter(r => !r.ok).map(r => `${r.step}: ${r.carriers} servable carriers, needs ${r.need}`);
    expect(short).toEqual([]);
  });

  it('R19 and S10 are loaded and have at least 6 servable carriers each', () => {
    for (const id of ['R19', 'S10']) {
      const r = report.find(x => x.step === id);
      expect(r, id).toBeDefined();
      expect(r!.carriers, id).toBeGreaterThanOrEqual(MIN_CARRIERS_WIDE);
    }
  });

  it('every thin step is loaded, documented and still serves at least one carrier', () => {
    for (const [id, why] of Object.entries(THIN_STEPS)) {
      expect(why.length, id).toBeGreaterThan(0);
      const r = report.find(x => x.step === id);
      if (!r) continue;   // not loaded at this release
      expect(r.carriers, id).toBeGreaterThanOrEqual(1);
    }
  });
});
