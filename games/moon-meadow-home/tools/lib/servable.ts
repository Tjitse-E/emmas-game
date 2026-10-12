// G/tools/lib/servable.ts
// The learning gate (L-A22, master R62): how many carriers each step that can be current can really serve with the
// committed assets. Servable means the planner's own carrierChoices accepts it: an `ok` clip in the audio manifests
// and, where the moment needs one, a picture in public/art/manifest.json. A step blocks the gate when it has fewer
// than 3 servable carriers, or fewer than 6 for the school steps R19 and S10. THIN_STEPS lists the documented
// exceptions, which still need one.
import type { Content, MomentKind, Step, StepId } from '../../src/core/content/types.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { carrierChoices, carrierKey, newCarrierCache } from '../../src/core/planner/carriers.ts';
import type { AssetIndex, Carrier, ItemRequest, PlanContext } from '../../src/core/planner/types.ts';
import { mulberry32 } from '../../src/core/rng.ts';
import { readManifests, readPictureIds } from './read-content.ts';

/** Carrier kinds that need no clip or picture: they are always servable. */
const ASSET_FREE: readonly Carrier['kind'][] = ['spell', 'first-sound', 'maths', 'door', 'letters'];
/** Door moments show a stall door number: no clip or picture, and the range depends on the visit, so they always count. */
const DOOR_MOMENTS: readonly MomentKind[] = ['door-visit', 'roll-call-door'];
/** Station wishes only serve review and mixed picks (R34), never the current step, so they do not count here. */
const NOT_CURRENT: readonly MomentKind[] = ['station-wish'];
/** Steps that get many repetitions in her first weeks need a wider pool (spec 3.10, master R62). */
export const WIDE_STEPS: readonly StepId[] = ['R19', 'S10'];
export const MIN_CARRIERS = 3;
export const MIN_CARRIERS_WIDE = 6;
/** Steps the honest word list cannot fill. They must still serve at least one carrier. */
export const THIN_STEPS: Readonly<Record<StepId, string>> = {
  R01: 'only tap is a picturable thing spelled with s, a, t and p (learning.md A7); her year1 start is R13',
};

/** The asset index the app builds at runtime, read from the committed manifests. */
export function committedAssets(): AssetIndex {
  const clips = new Set(Object.values(readManifests()).flat());
  const pictures = new Set(readPictureIds());
  return { clip: id => clips.has(id), picture: id => pictures.has(id) };
}

/** A loaded step that can be current, or is served as a school step: not a contrast or display step, with items. */
export function gateSteps(c: Content): Step[] {
  return (['r', 's', 'm'] as const)
    .flatMap(s => c.loaded[s])
    .map(id => c.steps[id])
    .filter(st => !st.contrast && !st.display && st.items.length > 0);
}

export type StepCarriers = {
  step: StepId;
  /** Distinct servable carriers over every item and loaded moment of the step (a word in two moments counts once). */
  carriers: number;
  /** True when a loaded moment of the step serves a carrier that needs no asset. */
  assetFree: boolean;
  need: number;
  ok: boolean;
};

/** Servable carriers of one step, as the planner sees them when she is at that step (everything below known). */
export function stepCarriers(c: Content, stepId: StepId, assets: AssetIndex): StepCarriers {
  const st = c.steps[stepId];
  const need = THIN_STEPS[stepId] !== undefined ? 1 : WIDE_STEPS.includes(stepId) ? MIN_CARRIERS_WIDE : MIN_CARRIERS;
  const ctx: PlanContext = { c, l: foldLearner([], c), now: 0, assets };
  const moments = st.moments.filter((m): m is MomentKind => c.moments[m]?.loaded === true && !NOT_CURRENT.includes(m));
  const keys = new Set<string>();
  let assetFree = moments.some(m => DOOR_MOMENTS.includes(m));
  for (const moment of moments) {
    if (DOOR_MOMENTS.includes(moment)) continue;
    const req: ItemRequest = { strand: st.strand, moments: [moment], place: 'gate', doors: { built: 1000, own: null } };
    for (const item of st.items) {
      for (const scaffold of [1, 2, 3] as const) {
        if (scaffold > st.top) break;
        const choices = carrierChoices(ctx, stepId, item.id, moment, scaffold, mulberry32(1), req, true, newCarrierCache());
        for (const ch of choices) {
          if (ASSET_FREE.includes(ch.carrier.kind)) assetFree = true;
          keys.add(carrierKey(ch.carrier));
        }
      }
    }
  }
  return { step: stepId, carriers: keys.size, assetFree, need, ok: assetFree || keys.size >= need };
}

export function gateReport(c: Content, assets: AssetIndex): StepCarriers[] {
  return gateSteps(c).map(st => stepCarriers(c, st.id, assets));
}
