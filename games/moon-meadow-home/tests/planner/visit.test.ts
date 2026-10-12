// G/tests/planner/visit.test.ts
import { describe, it, expect } from 'vitest';
import { visitStats, spellingShareLow, wantsLabelBubble, leastPractisedStrand, visitRange, shouldVisitDoor, isTired } from '../../src/core/planner/visit.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, resetSeq, visitStart, override, result } from '../fixtures/events.ts';
import { setup, VISIT2 } from './setup.ts';

const c = miniContent();
const r = (t: number, strand: 'r' | 's' | 'm') =>
  result(t, { strand, step: strand === 'r' ? 'R01' : strand === 's' ? 'S01' : 'M01', items: [], r: 'first' });
function fresh(...strands: ('r' | 's' | 'm')[]): LearnEvent[] {
  resetSeq();
  return [override(T0 - 1, { type: 'learn.override', op: 'profile', profile: 'fresh' }), visitStart(T0), ...strands.map((s, i) => r(T0 + i + 1, s))];
}

describe('visit signals', () => {
  it('counts the visit', () => {
    expect(visitStats(foldLearner(fresh('r', 's', 'm', 'r'), c))).toEqual({ r: 2, s: 1, m: 1, name: 0, ladder: 4, spell: 1, total: 4 });
    expect(isTired(foldLearner(fresh('r'), c), c)).toBe(false);
  });
  it('is tired after thirty checked moments', () => {
    expect(isTired(foldLearner(fresh(...Array.from({ length: 30 }, () => 'm' as const)), c), c)).toBe(true);
  });
  it('flags a low spelling share only after five ladder moments', () => {
    expect(spellingShareLow(foldLearner(fresh('r', 'm', 'r', 'm'), c), c)).toBe(false);
    expect(spellingShareLow(foldLearner(fresh('r', 'm', 'r', 'm', 'r'), c), c)).toBe(true);
    expect(spellingShareLow(foldLearner(fresh('r', 'm', 's', 'm', 'r'), c), c)).toBe(false);
  });
  it('wants a label bubble while the spelling school step is open', () => {
    expect(wantsLabelBubble(setup({ r: 'R21', s: 'S12', m: 'M10' }).ctx().l, c)).toBe(true);
    expect(wantsLabelBubble(setup({ r: 'R21', s: 'S12', m: 'M10' }, { school: false }).ctx().l, c)).toBe(false);
  });
  it('names the strand practised least, spelling first on a tie', () => {
    expect(leastPractisedStrand(foldLearner(fresh('r', 'r', 's', 'm'), c))).toBe('s');
    expect(leastPractisedStrand(foldLearner(fresh('r', 's'), c))).toBe('m');
    expect(leastPractisedStrand(foldLearner(fresh(), c))).toBe('s');
  });
  it('opens door visits from M02', () => {
    expect(visitRange(foldLearner(fresh(), c), c)).toBeNull();
    expect(visitRange(setup({ m: 'M02' }).ctx().l, c)).toEqual([1, 10]);
    expect(visitRange(setup({ m: 'M07' }).ctx().l, c)).toEqual([1, 20]);
  });
  it('sends every third newborn visiting once the range is secure', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false });
    expect(shouldVisitDoor(s.ctx().l, c, 10)).toBe(true);
    const lift = Array.from({ length: 10 }, (_, i) => i + 1).flatMap(n => [
      result(VISIT2 + n * 10, { strand: 'm', step: 'M02', items: [`m:num:${n}`], r: 'first', slot: 'review', scaffold: 3 }),
      result(VISIT2 + n * 10 + 5, { strand: 'm', step: 'M02', items: [`m:num:${n}`], r: 'first', slot: 'review', scaffold: 3 }),
    ]);
    const l = s.ctx(lift).l;
    expect(shouldVisitDoor(l, c, 9)).toBe(true);
    expect(shouldVisitDoor(l, c, 10)).toBe(false);
    expect(shouldVisitDoor(foldLearner(fresh(), c), c, 9)).toBe(false);
  });
});
