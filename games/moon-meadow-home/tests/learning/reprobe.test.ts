// G/tests/learning/reprobe.test.ts
// The short re-probe after the maths lift (review 2026-10-13): the lift places her at M12A, then two probe eggs a
// step climb M12A to M12F, so she lands where she really is instead of spending weeks on totals 7 to 9.
import { describe, it, expect } from 'vitest';
import { content as c } from '../../src/core/content/static.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { currentStep, pendingLearnFacts, reprobeStep, stepStatus } from '../../src/core/learning/status.ts';
import type { LearnEvent, LearnFact, Result } from '../../src/core/learning/types.ts';
import { mulberry32, nextEgg } from '../../src/core/planner/index.ts';
import { T0, DAY, resetSeq, visitStart, placementDone, override, result, stamp } from '../fixtures/events.ts';

const BELOW_M10 = ['M01', 'M02', 'M05', 'M07', 'M08', 'M09'];
const assets = { clip: () => true, picture: () => true };

/** A year 1 log placed at M10, with the lift recorded as the store does. */
function lifted(): LearnEvent[] {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0), placementDone(T0 + 10, 'm', 'M10', BELOW_M10), visitStart(T0 + DAY)];
  const lift = pendingLearnFacts(foldLearner(evs, c, 'year1'), c).find((f) => f.type === 'learn.override')!;
  evs.push(stamp(T0 + DAY + 1, lift) as LearnEvent);
  return evs;
}
const overrides = (fs: LearnFact[]) => fs.filter((f) => f.type === 'learn.override');

/** Plays `n` probe eggs from the planner, answering each with `answer(step)`, recording facts as the store does. */
function play(evs: LearnEvent[], n: number, answer: (step: string) => Result): string[] {
  const rng = mulberry32(3);
  const steps: string[] = [];
  let t = T0 + DAY + 1000;
  for (let i = 0; i < n; i++) {
    const l = foldLearner(evs, c, 'year1');
    const offer = nextEgg({ c, l, now: t, assets }, rng);
    const p = offer.pick!;
    steps.push(`${p.step}${p.probe ? '' : ':' + p.slot}`);
    evs.push(result((t += 30_000), {
      strand: 'm', step: p.step!, items: p.items, r: p.probe ? answer(p.step!) : 'first', probe: p.probe, slot: p.slot,
      moment: p.moment, place: 'nest',
    }));
    for (const f of pendingLearnFacts(foldLearner(evs, c, 'year1'), c)) evs.push(stamp((t += 1), f) as LearnEvent);
  }
  return steps;
}

describe('the re-probe after the maths lift', () => {
  it('starts at M12A right after the lift and offers probe eggs there', () => {
    const evs = lifted();
    const l = foldLearner(evs, c, 'year1');
    expect(currentStep(l, c, 'm')).toBe('M12A');
    expect(reprobeStep(l, c)).toBe('M12A');
    const p = nextEgg({ c, l, now: T0 + DAY + 1000, assets }, mulberry32(1)).pick!;
    expect(p).toMatchObject({ step: 'M12A', slot: 'probe', probe: true });
  });

  it('climbs two eggs a step and lands on the first step she misses', () => {
    const evs = lifted();
    const steps = play(evs, 6, (s) => (s === 'M12C' ? 'miss' : 'first'));
    expect(steps).toEqual(['M12A', 'M12A', 'M12B', 'M12B', 'M12C', 'M12C']);
    const l = foldLearner(evs, c, 'year1');
    expect(currentStep(l, c, 'm')).toBe('M12C');
    expect(stepStatus(l, c, 'M12A')).toBe('placed');
    expect(stepStatus(l, c, 'M12B')).toBe('placed');
    expect(reprobeStep(l, c)).toBeNull();
    expect(overrides(pendingLearnFacts(l, c))).toEqual([]);
    const sc = evs.filter((e) => e.type === 'learn.override').map((e) => (e as { step: string }).step);
    expect(sc).toEqual(['M12A', 'M12C']);
    // After landing, eggs are ordinary current, review or mixed picks again.
    expect(play(evs, 1, () => 'first')[0]).not.toBe('M12C');
  });

  it('gives one slip a third egg, and climbs on two first tries', () => {
    const evs = lifted();
    let n = 0;
    const steps = play(evs, 4, () => (n++ === 0 ? 'miss' : 'first'));
    expect(steps).toEqual(['M12A', 'M12A', 'M12A', 'M12B']);
  });

  it('stays at M12A after two tries that are not first, with no second override', () => {
    const evs = lifted();
    expect(play(evs, 2, () => 'helped')).toEqual(['M12A', 'M12A']);
    const l = foldLearner(evs, c, 'year1');
    expect(currentStep(l, c, 'm')).toBe('M12A');
    expect(reprobeStep(l, c)).toBeNull();
    expect(evs.filter((e) => e.type === 'learn.override')).toHaveLength(1);
  });

  it('lands on M12F when she knows every step', () => {
    const evs = lifted();
    play(evs, 12, () => 'first');
    const l = foldLearner(evs, c, 'year1');
    expect(currentStep(l, c, 'm')).toBe('M12F');
    expect(reprobeStep(l, c)).toBeNull();
    for (const s of ['M12A', 'M12B', 'M12C', 'M12D', 'M12E']) expect(stepStatus(l, c, s), s).toBe('placed');
  });

  it('never asks the same total twice in a row', () => {
    const evs = lifted();
    play(evs, 12, () => 'first');
    const totals = evs.filter((e) => e.type === 'learn.result').map((e) => {
      const id = (e as { items: { id: string }[] }).items[0].id;
      const t = c.items[id].task!;
      return t.op === 'pair' ? t.a + t.b : t.op === 'missing' ? t.whole : null;
    });
    for (let i = 1; i < totals.length; i++) expect(totals[i], `egg ${i}`).not.toBe(totals[i - 1]);
  });

  it('stops for a parent override, and never starts for a parent who sets M12A on a lifted save', () => {
    const evs = lifted();
    evs.push(override(T0 + DAY + 5, { type: 'learn.override', op: 'set-current', strand: 'm', step: 'M12B', placed: [], side: [] }));
    const l = foldLearner(evs, c, 'year1');
    expect(reprobeStep(l, c)).toBeNull();
    expect(currentStep(l, c, 'm')).toBe('M12B');
    evs.push(override(T0 + DAY + 6, { type: 'learn.override', op: 'set-current', strand: 'm', step: 'M12A', placed: [], side: [] }));
    expect(reprobeStep(foldLearner(evs, c, 'year1'), c)).toBeNull();
  });

  it('never starts for a flow or parent set-current on a fresh placement', () => {
    resetSeq();
    const evs: LearnEvent[] = [visitStart(T0)];
    evs.push(override(T0 + 1, { type: 'learn.override', op: 'set-current', strand: 'm', step: 'M12A', placed: [], side: [] }));
    expect(reprobeStep(foldLearner(evs, c, 'year1'), c)).toBeNull();
  });
});
