// The opening queue (Task A6, spec 2.9 and 2.11 rule 8, decision D4): at most one new thing per visit,
// none from the queue in visit 1, the first fresh jewel ahead of the queue, and nothing unreleased or unearned.
import type { GameState, World } from '../../types/contracts.ts';
import type { LearnerView, StepId } from './types.ts';
import { currentVisit, type PlacesState } from './state.ts';
import { CURRENT_RELEASE, jewelsOpening, openingDefs, released } from './content.ts';

export { openingDefs } from './content.ts';

export type OpeningDef = { id: string; release: string; where: 'meadow' | 'nest'; lines: string[]; ghost: string | null };
export type OpeningCtx = {
  visitIndex: number; herd: number; announced: Record<string, string>; announcedThisVisit: boolean; release: string;
  mathsPlacementEnded: boolean; postBuilt: boolean; villageStoneLit: boolean; reachedR33: boolean; freshJewelWaiting: boolean;
};
export type OpeningExtra = { postBuilt?: boolean; villageStoneLit?: boolean; freshJewelWaiting?: boolean; release?: string };

/** Rewards that may share a visit with a queue opening. */
export const REWARD_OPENINGS: ReadonlySet<string> = new Set(['hundred-party', 'herd-banner']);
export const JEWELS_OPENING: OpeningDef = jewelsOpening;

export function earned(id: string, c: OpeningCtx): boolean {
  switch (id) {
    case 'bath-pond': return c.herd >= 5;
    case 'bubbles': return c.visitIndex >= 2;
    case 'two-egg': return c.mathsPlacementEnded;
    case 'dressing': return true;
    case 'post-box': return c.herd >= 15;
    case 'notes': return c.postBuilt;
    case 'letter-lane': return c.herd >= 20;
    case 'valley-map': return c.villageStoneLit;
    case 'asking-wishes': return c.reachedR33;
    case 'come-along': return c.herd >= 12 && c.visitIndex >= 6;
    default: return false;
  }
}

function isWorld(x: unknown): x is World {
  return typeof x === 'object' && x !== null && 'byId' in x && 'herd' in x;
}

/**
 * The opening due now, or null. Two forms: the pure one over an OpeningCtx (optionally with other defs),
 * and the contracts C7 one over the store's state and world view.
 */
export function openingDue(c: OpeningCtx, defs?: readonly OpeningDef[]): string | null;
export function openingDue(state: GameState, world: World): string | null;
export function openingDue(a: OpeningCtx | GameState, b?: readonly OpeningDef[] | World): string | null {
  if (isWorld(b)) return dueFor(storeCtx(a as GameState, b), openingDefs);
  return dueFor(a as OpeningCtx, (b as readonly OpeningDef[] | undefined) ?? openingDefs);
}

function dueFor(c: OpeningCtx, defs: readonly OpeningDef[]): string | null {
  if (c.visitIndex <= 1 || c.announcedThisVisit) return null;
  if (c.freshJewelWaiting && !('jewels' in c.announced) && released(jewelsOpening.release, c.release)) return 'jewels';
  for (const d of defs) {
    if (d.id in c.announced) continue;
    if (!released(d.release, c.release)) continue;
    if (earned(d.id, c)) return d.id;
  }
  return null;
}

/** Whether an opening was announced. Takes the places state or the world view (contracts C7). */
export function isAnnounced(s: PlacesState | World, id: string): boolean {
  if (isWorld(s)) return s.announced.has(id) || id in (s.places as unknown as PlacesState).announced;
  return id in s.announced;
}

function isLearnerView(l: unknown): l is LearnerView {
  return typeof l === 'object' && l !== null && typeof (l as LearnerView).reached === 'function' && 'placementEnded' in l;
}

const stepNumber = (id: string): number => Number.parseInt(id.slice(1), 10);

/**
 * A reading or spelling step counts as reached when it is passed, placed, current at the end of placement,
 * or when a later step of its strand is. Used when no LearnerView is at hand (the raw learner slice).
 */
export function reachedFromPlaces(s: PlacesState, step: StepId): boolean {
  const L = s.learn;
  if (L.passed.includes(step) || L.placed.includes(step)) return true;
  const strand = step[0].toLowerCase();
  const n = stepNumber(step);
  const later = (id: string | undefined) => !!id && id[0].toLowerCase() === strand && stepNumber(id) >= n;
  return later(L.placementCurrent[strand as 'r' | 's' | 'm']) || L.passed.some(later) || L.placed.some(later);
}

/** The queue context from the places fold. `l` is places' LearnerView; anything else falls back to the places fold. */
export function openingCtx(s: PlacesState, l: LearnerView | unknown, extra: OpeningExtra = {}): OpeningCtx {
  const v = currentVisit(s);
  const view = isLearnerView(l) ? l : null;
  return {
    visitIndex: v?.index ?? 0,
    herd: s.herd,
    announced: s.announced,
    announcedThisVisit: (v?.announced ?? []).some((id) => !REWARD_OPENINGS.has(id)),
    release: extra.release ?? CURRENT_RELEASE,
    mathsPlacementEnded: view ? view.placementEnded.m : s.learn.placementEnded.m,
    postBuilt: extra.postBuilt ?? s.buildings['post-box']?.done ?? false,
    villageStoneLit: extra.villageStoneLit ?? false,
    reachedR33: view ? view.reached('R33') : reachedFromPlaces(s, 'R33'),
    freshJewelWaiting: extra.freshJewelWaiting ?? false,
  };
}

function storeCtx(state: GameState, world: World): OpeningCtx {
  const s = state.places as unknown as PlacesState;
  return { ...openingCtx(s, null), visitIndex: world.visitIndex || (currentVisit(s)?.index ?? 0), herd: world.herd.length };
}
