// G/src/core/learning/egg-visit.ts
// The eggs of this visit (docs/v3/next/plan.md 3.4a): their totals keep two eggs in a row from asking the same
// total (N7), keep making 10 rare (N8), and say the two-nest and two-stone goals once a visit (N27).
import type { MathsTask } from '../content/types.ts';
import type { Learner } from './types.ts';

/** The number a maths task is about: the pair's total, the whole of a missing part, the count of a numeral. */
export function mathsTotal(task: MathsTask): number | null {
  switch (task.op) {
    case 'pair': return task.a + task.b;
    case 'missing': return task.whole;
    case 'numeral': case 'subitise': return task.n;
    default: return null;
  }
}

const eggsOf = (l: Learner) => l.visit.eggs ?? [];

/** The total of the last egg of this visit, or null before the first. Words, doors and the hay rack do not count. */
export function lastEggTotal(l: Learner): number | null {
  const eggs = eggsOf(l);
  return eggs.length > 0 ? eggs[eggs.length - 1].total : null;
}

/** Eggs of this visit that asked for a total of 10. */
export function tensThisVisit(l: Learner): number {
  return eggsOf(l).filter(e => e.total === 10).length;
}

/** Whether an egg of this visit already had two nests (a total above 10) or two stones. */
export function visitEggSeen(l: Learner): { twoNests: boolean; twoStones: boolean } {
  const eggs = eggsOf(l);
  return { twoNests: eggs.some(e => e.total > 10), twoStones: eggs.some(e => e.moment === 'egg-two-stone') };
}
