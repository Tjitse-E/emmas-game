import { beforeEach, describe, expect, it } from 'vitest';
import {
  askAccepts, litStones, nextPart, nextRow, partAsks, partsDone, partsFor, passedThisVisit, readyPlots, rowOfPlot, rowPlotId,
  rowsEarned, signFor, signResults, signTask, trimTask, wallLines, wallMistakeLines, wallOutcome, wallStones, wallTask,
} from '../../src/core/places/building.ts';
import { plotDefs, rowDef } from '../../src/core/places/content.ts';
import { rowCount } from '../../src/core/world/herd.ts';
import type { HerdState, Pick } from '../../src/types/contracts.ts';
import { ev, foldAll, hatched, imported, learner, resetSeq, rng, served, visitStart } from './helpers.ts';

beforeEach(resetSeq);
const hatch = (n: number, from = 0) => Array.from({ length: n }, (_, i) => hatched(`b${from + i}`));
const herd = (granted: number, built: number): HerdState => ({ babies: {}, order: [], rowsGranted: granted, rowsBuilt: built, nameCounts: {} });
const pick = (slot: Pick['slot'], step: string | null): Pick =>
  ({ strand: 'm', step, slot, moment: 'wall', items: [], carrier: { kind: 'word', word: 'x' }, scaffold: 1, probe: false });

describe('rows (R26: rows built come from core)', () => {
  it('earns a new row at every ten babies', () => {
    expect([0, 9, 10, 19, 20, 45, 50].map(rowsEarned)).toEqual([1, 1, 2, 2, 3, 5, 6]);
  });

  it('names row plots', () => {
    expect(rowPlotId(3)).toBe('row-3');
    expect(rowOfPlot('row-12')).toBe(12);
    expect(rowOfPlot('salon')).toBeNull();
  });

  it('a herd of 45 on Moving Day has its five rows and nothing to build until 50', () => {
    const ids = Array.from({ length: 45 }, (_, i) => `v${i}`);
    const s = foldAll([imported(ids)]);
    const built = rowCount(herd(Math.ceil(45 / 10), 0));
    expect(built).toBe(5);
    expect(nextRow(s, built)).toBeNull();
    expect(readyPlots({ s, release: '1.3', rowsBuilt: built }).filter((p) => p.startsWith('row-'))).toEqual([]);
    const s50 = foldAll([imported(ids), ...hatch(5, 100)]);
    expect(nextRow(s50, built)).toBe(6);
    expect(partsFor('row-6')).toEqual(['walls', 'row-name']);
  });

  it('offers one row at a time, even when several are earned', () => {
    const s = foldAll(hatch(25));
    expect(nextRow(s, 1)).toBe(2);
    expect(readyPlots({ s, release: '1.3', rowsBuilt: 1 }).filter((p) => p.startsWith('row-'))).toEqual(['row-2']);
    expect(nextRow(s, 2)).toBe(3);
    expect(nextRow(s, 3)).toBeNull();
  });
});

describe('parts', () => {
  it('gives buildings and rows 2 to 5 a full day and later rows a short build', () => {
    expect(partsFor('bath-pond')).toEqual(['walls', 'trim', 'sign', 'ribbon', 'circle']);
    expect(partsFor('row-5')).toEqual(['walls', 'trim', 'sign', 'ribbon', 'circle', 'row-name']);
    expect(partsFor('row-6')).toEqual(['walls', 'row-name']);
    expect(rowDef.fullUntil).toBe(5);
  });

  it('carries on where she left off', () => {
    expect(nextPart('bath-pond', [])).toBe('walls');
    expect(nextPart('bath-pond', ['walls', 'trim'])).toBe('sign');
    expect(nextPart('bath-pond', ['walls', 'trim', 'sign', 'ribbon', 'circle'])).toBeNull();
  });

  it('keeps finished parts after leaving halfway and never counts a part twice', () => {
    const s = foldAll([
      visitStart('v1'), ev('building.part', { plot: 'row-2', part: 'walls' }), ev('building.part', { plot: 'row-2', part: 'walls' }),
      visitStart('v2'), ev('building.part', { plot: 'row-2', part: 'trim' }),
    ]);
    expect(partsDone(s, 'row-2')).toEqual(['walls', 'trim']);
    expect(nextPart('row-2', partsDone(s, 'row-2'))).toBe('sign');
    const named = foldAll([ev('row.named', { row: 6, name: 'Pip' }), ev('building.part', { plot: 'row-6', part: 'walls' })]);
    expect(nextPart('row-6', partsDone(named, 'row-6'))).toBeNull();
  });
});

describe('ready plots', () => {
  it('needs the Bath Pond earned and announced, and not built', () => {
    expect(readyPlots({ s: foldAll(hatch(5)), release: '1.3', rowsBuilt: 1 })).not.toContain('bath-pond');
    const announced = foldAll([visitStart('v2'), ...hatch(5), ev('opening.announced', { opening: 'bath-pond' })]);
    expect(readyPlots({ s: announced, release: '1.0', rowsBuilt: 1 })).toEqual(['bath-pond']);
    const built = foldAll([visitStart('v2'), ...hatch(5), ev('opening.announced', { opening: 'bath-pond' }), ev('building.done', { plot: 'bath-pond' })]);
    expect(readyPlots({ s: built, release: '1.3', rowsBuilt: 1 })).not.toContain('bath-pond');
  });

  it('readies a jewel plot when every stone is lit', () => {
    const two = foldAll([ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'R30', plot: 'salon' })]);
    expect(litStones(two, 'salon')).toEqual(['S20', 'R30']);
    expect(readyPlots({ s: two, release: '1.3', rowsBuilt: 1 })).not.toContain('salon');
    const three = foldAll([ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'R30', plot: 'salon' }), ev('jewel.placed', { jewel: 'M10', plot: 'salon' })]);
    expect(readyPlots({ s: three, release: '1.3', rowsBuilt: 1 })).toContain('salon');
    expect(readyPlots({ s: three, release: '1.1', rowsBuilt: 1 })).not.toContain('salon');
  });

  it('skips plots of a later release', () => {
    const s = foldAll([visitStart('v6'), ...hatch(15), ev('opening.announced', { opening: 'post-box' })]);
    expect(readyPlots({ s, release: '1.0', rowsBuilt: 2 })).not.toContain('post-box');
    expect(readyPlots({ s, release: '1.1', rowsBuilt: 2 })).toContain('post-box');
  });

  it('uses building pictures from the art lists where they exist', () => {
    const pic = Object.fromEntries(plotDefs.map((p) => [p.id, p.picture]));
    expect([pic['bath-pond'], pic['post-box'], pic.salon]).toEqual(['building-bath-pond', 'building-post-box', 'building-salon']);
    expect(signFor('bath-pond').clip).toBe('word-pond');
  });
});

describe('what each part asks for (R38)', () => {
  const l = learner({ current: { r: 'R21', s: 'S12', m: 'M10' } });

  it('a part yields one current and one review request', () => {
    const walls = partAsks('walls', l, 'v3');
    expect(walls.map((a) => [a.strand, a.want, a.step, a.moments])).toEqual([['m', 'current', 'M10', ['wall']], ['m', 'review', null, ['wall']]]);
    expect(partAsks('trim', l, 'v3').map((a) => a.want)).toEqual(['current', 'review']);
  });

  it('the sign part asks for her current spelling item; the name sign is its review moment', () => {
    expect(partAsks('sign', l, 'v3').map((a) => [a.strand, a.want, a.step, a.moments])).toEqual([['s', 'current', 'S12', ['label']]]);
  });

  it('parts without learning ask for nothing', () => {
    expect([partAsks('ribbon', l, 'v3'), partAsks('circle', l, 'v3'), partAsks('row-name', l, 'v3')]).toEqual([[], [], []]);
  });

  it('after step.passed S10 in this visit, the spelling part requests S10 items', () => {
    const fresh = learner({ current: { r: 'R21', s: 'S11', m: 'M10' }, passed: [{ step: 'S09', strand: 's', t: 1, visit: 'v2' }, { step: 'S10', strand: 's', t: 5, visit: 'v3' }] });
    expect(passedThisVisit(fresh, 's', 'v3')).toBe('S10');
    expect(partAsks('sign', fresh, 'v3')[0]).toMatchObject({ want: 'passed', step: 'S10' });
    expect(partAsks('walls', fresh, 'v3')[0]).toMatchObject({ want: 'current', step: 'M10' });
    expect(partAsks('sign', fresh, 'v4')[0]).toMatchObject({ want: 'current', step: 'S11' });
  });

  it('the veto keeps each request to its own slot', () => {
    const [cur, rev] = partAsks('walls', l, 'v3');
    expect([cur, rev].map((a) => [askAccepts(a)(pick('current', 'M10')), askAccepts(a)(pick('review', 'M05')), askAccepts(a)(pick('mixed', 'M06'))]))
      .toEqual([[true, false, false], [false, true, true]]);
    const passed = { ...cur, want: 'passed' as const, step: 'M09' };
    expect([askAccepts(passed)(pick('review', 'M09')), askAccepts(passed)(pick('review', 'M05'))]).toEqual([true, false]);
  });
});

describe('walls (decision D7)', () => {
  it('uses the served fact', () => {
    const it10 = served('m', 'M10', '6+4', ['6+4']);
    expect(wallTask(it10, rng(1))).toEqual({ total: 10, up: 6, answer: 4, served: it10 });
    expect(wallTask(served('m', 'M12', '4+3', ['4+3']), rng(1))).toMatchObject({ total: 7, up: 4, answer: 3 });
  });

  it('builds a free wall of ten without an item or with a fact it cannot show', () => {
    for (const item of [null, served('m', 'M08', 'AB', ['AB']), served('m', 'M14', '9-5', ['9-5']), served('m', 'M20', '8+7', ['8+7'])]) {
      const t = wallTask(item, rng(2));
      expect(t.total).toBe(10);
      expect(t.up + t.answer).toBe(10);
      expect(t.served).toBeNull();
    }
  });

  it('judges the planks with the number lines', () => {
    const t = { total: 10, up: 6, answer: 4, served: null };
    expect(wallOutcome(t, 4)).toEqual({ kind: 'done', diff: 0 });
    expect(wallOutcome(t, 1)).toEqual({ kind: 'gap', diff: 3 });
    expect(wallOutcome(t, 6)).toEqual({ kind: 'wobble', diff: 2 });
    expect(wallMistakeLines({ kind: 'gap', diff: 3 })).toEqual(['num-more-3']);
    expect(wallMistakeLines({ kind: 'wobble', diff: 2 })).toEqual(['num-over-2']);
    expect(wallLines(t)).toEqual(['bd-needs-10', 'num-up-6']);
  });

  it('offers at least three different stacks from 1 to 9, the answer among them', () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const answer of [1, 4, 9]) {
        const st = wallStones({ total: 10, up: 10 - answer, answer, served: null }, rng(seed));
        expect(st).toContain(answer);
        expect(new Set(st).size).toBe(st.length);
        expect(st.length).toBeGreaterThanOrEqual(3);
        for (const v of st) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(9); }
      }
    }
  });
});

describe('trim', () => {
  it.each([['AB', 5, 1], ['ABB', 7, 1], ['ABC', 7, 1], ['AAB', 7, 0]] as const)('continues %s', (pattern, len, answerIndex) => {
    const t = trimTask(served('m', 'M08', pattern, [pattern]), rng(5));
    if (!t.checked) throw new Error('expected a checked trim');
    expect(t.shown).toHaveLength(len);
    const unit = [...new Set(t.shown)];
    expect(t.answer).toBe(unit[answerIndex]);
    expect(t.options).toHaveLength(3);
    expect(new Set(t.options).size).toBe(3);
    expect(t.options).toContain(t.answer);
  });

  it('is free colours without an M08 item', () => {
    expect(trimTask(null, rng(1)).checked).toBe(false);
    expect(trimTask(served('m', 'M10', '6+4', ['6+4']), rng(1)).checked).toBe(false);
  });
});

describe('sign (R38, replaces decision D9)', () => {
  const l = learner({ passed: [{ step: 'S02', strand: 's', t: 1, visit: 'v1' }], placed: [{ step: 'S03', strand: 's' }] });

  it('checks a slot only when its own step is passed or placed, and keeps gifts as gifts', () => {
    const t = signTask(signFor('bath-pond'), ['S02', 'S03', 'S02', 'S05'], l);
    expect(t.slots.map((s) => s.slot)).toEqual(['review', 'mixed', 'review', null]);
    expect(t.own).toEqual([true, true, true, false]);
    expect(t.checked).toBe(true);
    expect(signTask(signFor('post-box'), ['S02', 'S02', 'S02', 'S02'], l).own).toEqual([true, false, true, true]);
    expect(signTask(signFor('bath-pond'), ['S07', 'S08', null, 'S09'], l).checked).toBe(false);
    expect(signFor('row-3').word).toBe('stalls');
  });

  it('logs each slot under the step of its own grapheme, never as current', () => {
    const t = signTask(signFor('bath-pond'), ['S02', 'S03', 'S02', 'S05'], l);
    const out = signResults(t, ['first', 'first', 'miss', 'first']);
    expect(out.map((o) => [o.pick.step, o.pick.slot, o.pick.moment, o.pick.items, o.outcome.result])).toEqual([
      ['S02', 'review', 'sign', ['s:g:p', 's:g:n'], 'miss'],
      ['S03', 'mixed', 'sign', ['s:g:o'], 'first'],
    ]);
    expect(out[0].outcome.slots).toEqual([{ id: 's:g:p', r: 'first' }, { id: 's:g:n', r: 'miss' }]);
    for (const o of out) expect(o.pick.slot).not.toBe('current');
  });
});
