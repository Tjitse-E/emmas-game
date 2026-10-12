// G/src/core/planner/eggs.ts
// The nest's egg offer: the egg kind follows the moment of the maths pick. No pick gives a free egg (Decision 10).
import type { Content, EggKind, MomentKind, StepId } from '../content/types.ts';
import { currentStep, isPassedStep, isPlacedStep } from '../learning/status.ts';
import { lastEggTotal, mathsTotal, tensThisVisit } from '../learning/egg-visit.ts';
import type { Learner } from '../learning/types.ts';
import type { Rng } from '../rng.ts';
import { nextItem } from './select.ts';
import type { ItemRequest, Pick, PlanContext } from './types.ts';

export type EggOffer = { kind: EggKind; pick: Pick | null };

export function eggKindOf(c: Content, m: MomentKind): EggKind | null {
  return c.moments[m]?.egg ?? null;
}

/** Loaded moments with an egg kind, in content order. */
export function eggMoments(c: Content): MomentKind[] {
  return Object.values(c.moments).filter(m => m.loaded && m.egg !== undefined).map(m => m.id);
}

function firstEggOf(c: Content, step: string | null): EggKind | null {
  if (!step) return null;
  for (const m of c.steps[step]?.moments ?? []) {
    const mo = c.moments[m];
    if (mo?.loaded && mo.egg) return mo.egg;
  }
  return null;
}

/** N8 applies once her current maths step is this one or later. */
const EASY_FROM: StepId = 'M12A';
/** N8: review below this step is too easy once she is past bonds to 10. */
const REVIEW_FLOOR: StepId = 'M09';
const FILTERED_SLOTS: readonly string[] = ['review', 'mixed', 'side'];

const totalOf = (p: Pick): number | null => (p.carrier.kind === 'maths' ? mathsTotal(p.carrier.task) : null);

/** Her current maths step's position: past the end when every loaded step is done, before the start while placing. */
function currentIndex(l: Learner, c: Content): number {
  const cur = currentStep(l, c, 'm');
  if (cur !== null) return c.steps[cur]?.index ?? -1;
  return l.placement.m.done ? Infinity : -1;
}

/** N8: after M12A, review and mixed maths are bonds from M09 on, one 10 a visit at most, no one-steps. */
export function easyReview(l: Learner, c: Content, p: Pick): boolean {
  const from = c.steps[EASY_FROM];
  if (!from || currentIndex(l, c) < from.index) return false;
  if (!FILTERED_SLOTS.includes(p.slot)) return false;
  const step = p.step ? c.steps[p.step] : undefined;
  const floor = c.steps[REVIEW_FLOOR]?.index ?? 0;
  if (step && step.index < floor) return true;
  if (p.carrier.kind !== 'maths') return false;
  const t = p.carrier.task;
  if (totalOf(p) === 10 && tensThisVisit(l) >= 1) return true;
  if (t.op === 'pair' && (t.a === 1 || t.b === 1)) return true;
  if (t.op === 'missing' && (t.part === 1 || t.whole - t.part === 1)) return true;
  return false;
}

/** The egg filter: not the last egg total (N7) and not easyReview (N8). Probes always pass. */
export function eggOk(l: Learner, c: Content): (p: Pick) => boolean {
  const last = lastEggTotal(l);
  return (p) => p.probe || (!easyReview(l, c, p) && (last === null || totalOf(p) !== last));
}

/**
 * The planner's own pick first. A probe, or a pick that passes the filter, stands. Otherwise the same step and
 * slot with the filter; then, only for review, mixed or side, any slot with the filter; else the first pick
 * (docs/v3/next/plan.md N7: the veto never moves her off her current step or a placement probe).
 */
function filtered(ctx: PlanContext, req: ItemRequest, ok: (p: Pick) => boolean, rng: Rng): Pick | null {
  const p0 = nextItem(ctx, req, rng);
  if (!p0 || p0.probe || ok(p0)) return p0;
  const same = nextItem(ctx, { ...req, accept: (p) => p.step === p0.step && p.slot === p0.slot && ok(p) }, rng);
  if (same) return same;
  if (FILTERED_SLOTS.includes(p0.slot)) {
    const other = nextItem(ctx, { ...req, accept: ok }, rng);
    if (other) return other;
  }
  return p0;
}

export function nextEgg(ctx: PlanContext, rng: Rng): EggOffer {
  const { c, l } = ctx;
  const moments = eggMoments(c);
  const pick = moments.length > 0 ? filtered(ctx, { strand: 'm', moments, place: 'nest' }, eggOk(l, c), rng) : null;
  if (pick) return { kind: eggKindOf(c, pick.moment) ?? 'moon', pick };
  let kind = firstEggOf(c, currentStep(l, c, 'm'));
  if (!kind) {
    const done = c.loaded.m.filter(id => isPassedStep(l, id) || isPlacedStep(l, c, id));
    for (let i = done.length - 1; i >= 0 && !kind; i--) kind = firstEggOf(c, done[i]);
  }
  return { kind: kind ?? 'moon', pick: null };
}

/** The hay rack's maths pick (docs/v3/next/plan.md 3.1), with the easy-review filter (N8) and no last-total rule. */
export function nextRack(ctx: PlanContext, rng: Rng): Pick | null {
  const { c, l } = ctx;
  return filtered(ctx, { strand: 'm', moments: ['hay-rack'], place: 'manger' }, (p) => !easyReview(l, c, p), rng);
}
