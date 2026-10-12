// G/tests/planner/hay-rack.test.ts
// The hay rack's maths serve (docs/v3/next/plan.md 3.1, I-0.5): a missing-part pick on the real content at 1.0.1.
import { describe, it, expect } from 'vitest';
import { content } from '../../src/core/content/static.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { nextRack, mulberry32 } from '../../src/core/planner/index.ts';
import type { PlanContext } from '../../src/core/planner/types.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

function ctxAt(step: string): PlanContext {
  resetSeq();
  const c = content;
  const evs: LearnEvent[] = [visitStart(T0)];
  evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c, 'year1'), c, 'm', step)));
  evs.push(visitStart(T0 + 3 * DAY));
  const l = foldLearner(evs, c, 'year1');
  expect(l.placement.m.done).toBe(true);
  return { c, l, now: T0 + 3 * DAY + 60_000, assets: { clip: () => true, picture: () => true } };
}

describe('nextRack', () => {
  it('runs on release 1.0.1 with the hay-rack moment loaded', () => {
    expect(content.release).toBe('1.0.1');
    expect(content.moments['hay-rack']?.loaded).toBe(true);
    expect(content.steps.M12.moments).toContain('hay-rack');
  });

  it('serves a missing-part maths pick at current step M12', () => {
    const p = nextRack(ctxAt('M12'), mulberry32(7));
    expect(p).not.toBeNull();
    expect(p!.moment).toBe('hay-rack');
    expect(p!.carrier.kind).toBe('maths');
    if (p!.carrier.kind !== 'maths') return;
    expect(p!.carrier.task.op).toBe('missing');
  });

  it('serves nothing at current step M10, where no step with a hay rack is open', () => {
    expect(nextRack(ctxAt('M10'), mulberry32(7))).toBeNull();
  });
});
