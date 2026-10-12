// Master Review Focus 3: a clip marked ok:false or a missing picture never reaches Emma.
import { describe, expect, it } from 'vitest';
import { nextItem } from '../../src/core/planner/index.ts';
import { foldLearner } from '../../src/core/learning/index.ts';
import { content } from '../../src/core/content/static.ts';
import { mulberry32 } from '../../src/core/rng.ts';
import type { PlanContext, Pick } from '../../src/types/contracts.ts';

const learner = foldLearner([], content);
const wordOf = (p: Pick | null) => (p && (p.carrier.kind === 'word' || p.carrier.kind === 'plural') ? p.carrier.word : null);
const ctxWith = (noClip: Set<string>, noPic: Set<string>): PlanContext => ({
  c: content, l: learner, now: 1_760_000_000_000,
  assets: { clip: (id) => !noClip.has(id), picture: (id) => !noPic.has(id) },
} as never);
const req = { strand: 'r' as const, moments: ['wish' as const], place: 'wish' };

describe('planContext hides ok:false clips and missing pictures', () => {
  it('never serves a word whose clip is ok:false or whose picture is missing', () => {
    const served = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const w = wordOf(nextItem(ctxWith(new Set(), new Set()) as never, req, mulberry32(seed)));
      if (w) served.add(w);
    }
    const [a, b] = [...served];
    expect(a && b, 'the planner serves at least two wish words').toBeTruthy();
    const noClip = new Set([content.words[a].clip]);
    const noPic = new Set([content.words[b].pic as string]);
    for (let seed = 1; seed <= 200; seed++) {
      const w = wordOf(nextItem(ctxWith(noClip, noPic) as never, req, mulberry32(seed)));
      expect(w).not.toBe(a);
      expect(w).not.toBe(b);
    }
  });
  it('hasPicture is false, not an error, for an id the manifest lacks (R49)', async () => {
    const { hasPicture } = await import('../../src/art/manifest.ts');
    expect(hasPicture('no-such-picture')).toBe(false);
  });
});
