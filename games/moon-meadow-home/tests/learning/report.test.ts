// G/tests/learning/report.test.ts
import { describe, it, expect } from 'vitest';
import { learnerReport, isSecure } from '../../src/core/learning/report.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, DAY, resetSeq, visitStart, override, result, passed } from '../fixtures/events.ts';

describe('learnerReport', () => {
  const c = miniContent();
  it('reports each strand', () => {
    resetSeq();
    const l = foldLearner([
      override(T0 - 1, { type: 'learn.override', op: 'profile', profile: 'fresh' }),
      visitStart(T0),
      result(T0 + 1, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' }),
      result(T0 + 2, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'helped' }),
      result(T0 + 3, { strand: 'r', step: 'R01', items: ['r:g:t'], r: 'miss', error: 'dutch' }),
      result(T0 + 4, { strand: 'r', step: 'R01', items: ['r:g:p'], r: 'first' }),
      passed(T0 + 5, 's', 'S01'),
    ], c);
    const [r, s] = learnerReport(l, c, T0 + DAY);
    expect(r).toMatchObject({ strand: 'r', placing: false, current: 'R01', level: 1, ceiling: false, waiting: ['R30'] });
    expect(r.week).toEqual({ moments: 4, firstTry: 0.5, helped: 0.25, dutch: 1 });
    expect(s.passed).toEqual(['S01']);
    expect(isSecure(l, c, 'S01')).toBe(false);
  });
  it('shows the probe while placing', () => {
    resetSeq();
    const [r] = learnerReport(foldLearner([visitStart(T0)], c), c, T0);
    expect(r).toMatchObject({ placing: true, placement: { lo: 'R13', hi: 'R21', items: 0 }, current: null, level: null });
  });
  it('counts this week\'s Dutch pair errors per pair and drops older weeks', () => {
    resetSeq();
    const evs: LearnEvent[] = [visitStart(T0)];
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, 'r', 'R05')));
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, 's', 'S04')));
    evs.push(
      result(T0 + 2, { strand: 'r', step: 'R04D', items: ['r:pair:a-e-u'], r: 'miss', error: 'dutch', slot: 'side', moment: 'twin-wish', carrier: 'pan|pen' }),
      result(T0 + 8 * DAY, { strand: 'r', step: 'R04D', items: ['r:pair:a-e-u'], r: 'miss', error: 'dutch', slot: 'side', moment: 'twin-wish', carrier: 'hat|hut' }),
      result(T0 + 8 * DAY + 1, { strand: 'r', step: 'R05', items: ['r:g:h'], r: 'miss', error: 'dutch', carrier: 'hat' }),
      result(T0 + 8 * DAY + 2, { strand: 's', step: 'S03D', items: ['s:pair:a-e-u'], r: 'miss', error: 'dutch', slot: 'side', moment: 'label', carrier: 'bed' }),
      result(T0 + 8 * DAY + 3, { strand: 's', step: 'S03D', items: ['s:pair:a-e-u'], r: 'first', slot: 'side', moment: 'label', carrier: 'bed' }),
    );
    const [r, s, m] = learnerReport(foldLearner(evs, c), c, T0 + 9 * DAY);
    expect(r.week.dutch).toBe(2);
    expect(r.dutchPairs).toEqual([{ pair: 'a-e-u', count: 1 }]);
    expect(s.dutchPairs).toEqual([{ pair: 'a-e-u', count: 1 }]);
    expect(m.dutchPairs).toEqual([]);
    expect(r.side).toEqual(['R04D']);
    expect(r.placed).toEqual(['R01', 'R02', 'R03', 'R04']);
    expect(r.week.firstTry).toBe(0);
    expect(m.week).toEqual({ moments: 0, firstTry: null, helped: null, dutch: 0 });
  });
  it('a placed step is secure once every item is in box 4', () => {
    resetSeq();
    const evs: LearnEvent[] = [visitStart(T0)];
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, 'm', 'M05')));
    const lift = [1, 2, 3].flatMap(n => [0, 1].map(k =>
      result(T0 + DAY * (n + k), { strand: 'm', step: 'M01', items: [`m:sub:${n}`], r: 'first', slot: 'review', scaffold: 1, moment: 'egg-moon' })));
    const l = foldLearner([...evs, ...lift], c);
    expect(isSecure(l, c, 'M01')).toBe(true);
    expect(isSecure(l, c, 'M02')).toBe(false);
    expect(learnerReport(l, c, T0 + 5 * DAY)[2].secure).toEqual(['M01']);
  });
});
