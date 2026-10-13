// G/tests/planner/egg-preview.test.ts
// The next-band preview (review 2026-10-13): once half of her current step's items have a first try, one review or
// mixed egg a visit comes from the pair step of the next band, so 11 and 12 (and later 13 to 15) show up early.
import { describe, it, expect } from 'vitest';
import { content as c } from '../../src/core/content/static.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { mathsTotal, mulberry32, nextEgg, previewStep } from '../../src/core/planner/index.ts';
import { T0, DAY, resetSeq, visitStart, override, result } from '../fixtures/events.ts';

const assets = { clip: () => true, picture: () => true };

function at(step: string, firsts: number): LearnEvent[] {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0)];
  evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c, 'year1'), c, 'm', step)));
  let t = T0 + 10;
  for (const it of c.steps[step].items.slice(0, firsts)) {
    evs.push(result((t += 1000), { strand: 'm', step, items: [it.id], r: 'first', moment: c.steps[step].moments[0], place: 'nest' }));
  }
  evs.push(visitStart(T0 + DAY));
  return evs;
}

describe('the next-band preview', () => {
  it('waits until half of the current step has a first try', () => {
    expect(previewStep(foldLearner(at('M12A', 3), c, 'year1'), c)).toBeNull();
    expect(previewStep(foldLearner(at('M12A', 4), c, 'year1'), c)).toBe('M12C');
    expect(previewStep(foldLearner(at('M12B', 5), c, 'year1'), c)).toBe('M12C');
    expect(previewStep(foldLearner(at('M12C', 4), c, 'year1'), c)).toBe('M12E');
    expect(previewStep(foldLearner(at('M12E', 8), c, 'year1'), c)).toBeNull();
    expect(previewStep(foldLearner(at('M12', 26), c, 'year1'), c)).toBeNull();
  });

  it('serves one preview egg a visit, from the first three items of the next pair step, never a probe or a current egg', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const evs = at('M12A', 8);
      const rng = mulberry32(seed);
      let t = T0 + DAY + 1000;
      const totals: number[] = [];
      for (let i = 0; i < 12; i++) {
        const l = foldLearner(evs, c, 'year1');
        const p = nextEgg({ c, l, now: t, assets }, rng).pick!;
        const total = p.carrier.kind === 'maths' ? mathsTotal(p.carrier.task)! : -1;
        totals.push(total);
        if (total > 10) {
          expect(p.step, `seed ${seed}`).toBe('M12C');
          expect(p.slot).toMatch(/^(review|mixed)$/);
          expect(c.steps.M12C.items.slice(0, 3).map((x) => x.id)).toContain(p.items[0]);
        }
        evs.push(result((t += 30_000), { strand: 'm', step: p.step!, items: p.items, r: 'first', slot: p.slot, probe: p.probe, moment: p.moment, place: 'nest' }));
      }
      expect(totals.filter((x) => x > 10).length, `seed ${seed} ${totals}`).toBeLessThanOrEqual(1);
    }
  });

  it('shows 11 or 12 in most visits once M12A is half secure', () => {
    let visits = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const evs = at('M12A', 8);
      const rng = mulberry32(seed);
      let t = T0 + DAY + 1000;
      let seen = false;
      for (let i = 0; i < 6; i++) {
        const p = nextEgg({ c, l: foldLearner(evs, c, 'year1'), now: t, assets }, rng).pick!;
        if (p.carrier.kind === 'maths' && mathsTotal(p.carrier.task)! > 10) seen = true;
        evs.push(result((t += 30_000), { strand: 'm', step: p.step!, items: p.items, r: 'first', slot: p.slot, probe: p.probe, moment: p.moment, place: 'nest' }));
      }
      if (seen) visits += 1;
    }
    expect(visits).toBeGreaterThanOrEqual(6);
  });
});
