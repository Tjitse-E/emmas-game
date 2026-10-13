// G/tests/learning/lift.test.ts
// The 1.0.1 maths lift (docs/v3/next/plan.md N9, N10, E4): a year 1 placement in the bonds-to-10 band moves to M12A once.
import { describe, it, expect } from 'vitest';
import { content as c } from '../../src/core/content/static.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { searchList } from '../../src/core/learning/placement.ts';
import { currentStep, mathsLift, pendingLearnFacts, schoolFn, stepStatus } from '../../src/core/learning/status.ts';
import type { LearnEvent, LearnFact } from '../../src/core/learning/types.ts';
import { createLearnerSlice } from '../../src/core/learning/index.ts';
import { validateEvent } from '../../src/core/events.ts';
import type { GameEvent, GameEventDraft } from '../../src/core/events.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import type { CoreState } from '../../src/core/world/index.ts';
import type { Learner } from '../../src/core/learning/types.ts';
import { openGameData } from '../../src/save/game-data.ts';
import { memoryBackend } from '../../src/save/backend.ts';
import { T0, DAY, resetSeq, visitStart, placementDone, override, result, stamp } from '../fixtures/events.ts';

const BELOW_M10 = ['M01', 'M02', 'M05', 'M07', 'M08', 'M09'];
const placedBelow = (step: string) => c.order.m.filter((id) => c.steps[id].loaded && c.steps[id].index < c.steps[step].index);

/** A year 1 log whose maths placement ended at `current`. */
function placedAt(current: string, extra: LearnEvent[] = []): LearnEvent[] {
  resetSeq();
  return [visitStart(T0), ...extra, placementDone(T0 + 10, 'm', current, current === 'M10' ? BELOW_M10 : placedBelow(current)), visitStart(T0 + DAY)];
}
const lifts = (facts: LearnFact[]) => facts.filter((f) => f.type === 'learn.override');

describe('mathsLift', () => {
  it('moves a placement at M10 to M12A once', () => {
    const evs = placedAt('M10');
    const l = foldLearner(evs, c, 'year1');
    expect(currentStep(l, c, 'm')).toBe('M10');
    const facts = lifts(pendingLearnFacts(l, c));
    expect(facts).toHaveLength(1);
    const f = facts[0];
    if (f.type !== 'learn.override' || f.op !== 'set-current') throw new Error('not a set-current');
    expect(f).toMatchObject({ strand: 'm', step: 'M12A', side: [] });
    for (const s of ['M09', 'M10', 'M11', 'M12']) expect(f.placed).toContain(s);
    expect(f.placed).not.toContain('M12A');
    const after = foldLearner([...evs, stamp(T0 + DAY + 1, f) as LearnEvent], c, 'year1');
    expect(currentStep(after, c, 'm')).toBe('M12A');
    expect(stepStatus(after, c, 'M10')).toBe('placed');
    expect(stepStatus(after, c, 'M12')).toBe('placed');
    expect(after.placement.m.overridden).toBe(true);
    expect(lifts(pendingLearnFacts(after, c))).toEqual([]);
  });

  it('lifts from M09, M11 and M12 too, but not from M05 or M12B', () => {
    for (const s of ['M09', 'M11', 'M12']) {
      const l = foldLearner(placedAt(s), c, 'year1');
      expect(currentStep(l, c, 'm'), s).toBe(s);
      expect(mathsLift(l, c), s).toMatchObject({ op: 'set-current', step: 'M12A' });
    }
    for (const s of ['M05', 'M12B']) {
      const l = foldLearner(placedAt(s), c, 'year1');
      expect(currentStep(l, c, 'm'), s).toBe(s);
      expect(mathsLift(l, c), s).toBeNull();
    }
  });

  it('keeps a placement that measured the new steps', () => {
    const probe = result(T0 + 5, { strand: 'm', step: 'M12A', items: ['m:pair:3+5'], r: 'miss', probe: true, moment: 'egg-two-stone', place: 'nest' });
    const l = foldLearner(placedAt('M12', [probe]), c, 'year1');
    expect(currentStep(l, c, 'm')).toBe('M12');
    expect(mathsLift(l, c)).toBeNull();
  });

  it('never lifts after a set-current from a parent or a flow', () => {
    const evs = placedAt('M10');
    const l0 = foldLearner(evs, c, 'year1');
    evs.push(override(T0 + DAY + 5, { type: 'learn.override', op: 'set-current', strand: 'm', step: 'M09', placed: BELOW_M10.filter((s) => s !== 'M09'), side: [] }));
    const l = foldLearner(evs, c, 'year1');
    expect(mathsLift(l0, c)).not.toBeNull();
    expect(currentStep(l, c, 'm')).toBe('M09');
    expect(mathsLift(l, c)).toBeNull();
  });

  it('never lifts another profile', () => {
    const evs = placedAt('M10');
    evs.push(override(T0 + DAY + 5, { type: 'learn.override', op: 'profile', profile: 'fresh' }));
    const l = foldLearner(evs, c, 'year1');
    expect(l.profile).toBe('fresh');
    expect(mathsLift(l, c)).toBeNull();
  });

  it('waits while the maths placement runs, and the placement now reaches M12F', () => {
    resetSeq();
    const l = foldLearner([visitStart(T0)], c, 'year1');
    expect(l.placement.m.done).toBe(false);
    expect(mathsLift(l, c)).toBeNull();
    expect(lifts(pendingLearnFacts(l, c))).toEqual([]);
    const list = searchList(c, 'm', schoolFn(l, c));
    expect(list.at(-1)).toBe('M12F');
    expect(list.slice(-7)).toEqual(['M12', 'M12A', 'M12B', 'M12C', 'M12D', 'M12E', 'M12F']);
  });
});

describe('the lift through the store (3.3)', () => {
  type St = CoreState & { learner: Learner };
  const folder = createGameFolder([createLearnerSlice(c)]);
  const open = (backend = memoryBackend()) => {
    let t = T0;
    return openGameData<St>({
      folder, contentHash: 'lift-test', codeVersion: 't', backend, now: () => (t += 1000), schedule: () => {},
      reconcile: (s) => pendingLearnFacts(s.learner, c) as GameEventDraft[],
    });
  };
  const overrides = (evs: readonly GameEvent[]) => evs.filter((e) => e.type === 'learn.override');

  it('writes exactly one valid learn.override after a placement at M10, also after a reopen', async () => {
    const backend = memoryBackend();
    const d = await open(backend);
    d.commit([{ type: 'placement.done', strand: 'm', current: 'M10', placed: BELOW_M10, side: [] } as GameEventDraft]);
    const ovs = overrides(d.allEvents());
    expect(ovs).toHaveLength(1);
    expect(ovs[0]).toMatchObject({ op: 'set-current', strand: 'm', step: 'M12A', side: [] });
    expect(validateEvent(ovs[0])).toMatchObject({ ok: true });
    expect(currentStep(d.folded().state.learner, c, 'm')).toBe('M12A');
    d.commit([{ type: 'step.passed', strand: 'r', step: 'R01' } as GameEventDraft]);
    expect(overrides(d.allEvents())).toHaveLength(1);
    await d.flush();
    const again = await open(backend);
    expect(overrides(again.allEvents())).toHaveLength(1);
    expect(currentStep(again.folded().state.learner, c, 'm')).toBe('M12A');
  });

  it('writes the re-probe landing once, after the lift (review 2026-10-13)', async () => {
    const backend = memoryBackend();
    const d = await open(backend);
    d.commit([{ type: 'placement.done', strand: 'm', current: 'M10', placed: BELOW_M10, side: [] } as GameEventDraft]);
    const probe = (step: string, id: string, r: 'first' | 'miss') => ({
      type: 'learn.result', strand: 'm', step, carrier: 'test', items: [{ id, r }], result: r, ms: 1500, scaffold: 3, error: null,
      place: 'nest', moment: c.steps[step].moments[0], slot: 'probe', probe: true,
    }) as GameEventDraft;
    const [a, b] = [c.steps.M12A.items, c.steps.M12B.items];
    d.commit([probe('M12A', a[0].id, 'first'), probe('M12A', a[1].id, 'first'), probe('M12B', b[0].id, 'first'), probe('M12B', b[1].id, 'first')]);
    d.commit([probe('M12C', c.steps.M12C.items[0].id, 'miss'), probe('M12C', c.steps.M12C.items[1].id, 'miss')]);
    const steps = (evs: readonly GameEvent[]) => overrides(evs).map((e) => (e as unknown as { step: string }).step);
    expect(steps(d.allEvents())).toEqual(['M12A', 'M12C']);
    expect(currentStep(d.folded().state.learner, c, 'm')).toBe('M12C');
    await d.flush();
    const again = await open(backend);
    expect(steps(again.allEvents())).toEqual(['M12A', 'M12C']);
    expect(currentStep(again.folded().state.learner, c, 'm')).toBe('M12C');
  });
});
