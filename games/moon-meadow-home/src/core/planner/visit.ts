// G/src/core/planner/visit.ts
// Visit signals for scenes: door visit range.
import type { Content } from '../content/types.ts';
import type { Learner } from '../learning/types.ts';
import { currentStep, isPassedStep, isPlacedStep } from '../learning/status.ts';

/** The door range entry that applies now: the last entry whose step is current, passed or placed. */
export function doorRangeEntry(l: Learner, c: Content): { step: string; max: number } | null {
  const cur = currentStep(l, c, 'm');
  const ranges = c.budget.doorRanges;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    if (!c.steps[r.step]) continue;
    if (r.step === cur || isPassedStep(l, r.step) || isPlacedStep(l, c, r.step)) return r;
  }
  return null;
}

/** Doors she can be asked to find: [1, max], or null while only M01 is open (spec 2.2). */
export function visitRange(l: Learner, c: Content): [number, number] | null {
  const r = doorRangeEntry(l, c);
  return r ? [1, r.max] : null;
}
