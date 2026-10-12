// G/src/core/planner/visit.ts
// Visit signals for scenes: counts, tired, spelling share, the label bubble, the least practised strand and doors.
import type { Content, Strand } from '../content/types.ts';
import type { Learner } from '../learning/types.ts';
import { currentStep, isPassedStep, isPlacedStep, openSchoolSteps } from '../learning/status.ts';

export type VisitStats = { r: number; s: number; m: number; name: number; ladder: number; spell: number; total: number };

export function visitStats(l: Learner): VisitStats {
  const { r, s, m, name } = l.visit.counts;
  return { r, s, m, name, ladder: l.visit.ladder, spell: l.visit.spell, total: r + s + m + name };
}

/** After visitCap checked moments the visit is tired: eggs and first wishes only review (spec 3.6). */
export function isTired(l: Learner, c: Content): boolean {
  return visitStats(l).total >= c.budget.visitCap;
}

export function spellingShareLow(l: Learner, c: Content): boolean {
  const v = visitStats(l);
  return v.ladder >= c.budget.spellShareAfter && v.spell / v.ladder < c.budget.spellShareMin;
}

export function wantsLabelBubble(l: Learner, c: Content): boolean {
  return spellingShareLow(l, c) || openSchoolSteps(l, c, 's').length > 0;
}

/** Fewest checked moments this visit; ties go to spelling, then reading, then maths. */
export function leastPractisedStrand(l: Learner): Strand {
  const order: Strand[] = ['s', 'r', 'm'];
  let best: Strand = order[0];
  for (const s of order) if (l.visit.counts[s] < l.visit.counts[best]) best = s;
  return best;
}

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

/** A newborn goes visiting while the range is still being learnt; once it is secure, every visitSecureEvery-th newborn. */
export function shouldVisitDoor(l: Learner, c: Content, herdCount: number): boolean {
  const r = doorRangeEntry(l, c);
  if (!r) return false;
  const items = c.steps[r.step]?.items ?? [];
  if (items.some(it => (l.items[it.id]?.box ?? 0) < 4)) return true;
  return herdCount % c.budget.visitSecureEvery === 0;
}
