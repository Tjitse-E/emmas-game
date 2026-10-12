// G/src/core/planner/eggs.ts
// The nest's egg offer: the egg kind follows the moment of the maths pick. No pick gives a free egg (Decision 10).
import type { Content, EggKind, MomentKind } from '../content/types.ts';
import { currentStep, isPassedStep, isPlacedStep } from '../learning/status.ts';
import type { Rng } from '../rng.ts';
import { nextItem } from './select.ts';
import type { Pick, PlanContext } from './types.ts';

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

export function nextEgg(ctx: PlanContext, rng: Rng): EggOffer {
  const { c, l } = ctx;
  const moments = eggMoments(c);
  const pick = moments.length > 0 ? nextItem(ctx, { strand: 'm', moments, place: 'nest' }, rng) : null;
  if (pick) return { kind: eggKindOf(c, pick.moment) ?? 'moon', pick };
  let kind = firstEggOf(c, currentStep(l, c, 'm'));
  if (!kind) {
    const done = c.loaded.m.filter(id => isPassedStep(l, id) || isPlacedStep(l, c, id));
    for (let i = done.length - 1; i >= 0 && !kind; i--) kind = firstEggOf(c, done[i]);
  }
  return { kind: kind ?? 'moon', pick: null };
}

/** The hay rack's maths pick (docs/v3/next/plan.md 3.1). Lane eggs adds the easy-review filter (N8). */
export function nextRack(ctx: PlanContext, rng: Rng): Pick | null {
  return nextItem(ctx, { strand: 'm', moments: ['hay-rack'], place: 'manger' }, rng);
}
