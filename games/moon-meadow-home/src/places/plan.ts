// The planner adapter bound to the store (Task A1b). Scenes call these; the pure part is serve.ts.
// Every place result goes out as `place/learn` with a payload from learning's `learnResultPayload` (R17):
// `logResult(served, mine, outcome, baby)` builds and dispatches it.
import { game } from '../game.svelte.ts';
import type { PlanContext } from '../core/planner/types.ts';
import type { PlacesState } from '../core/places/state.ts';
import type { ItemResult, ServedItem } from '../core/places/types.ts';
import type { Pick as PlanPick } from '../core/planner/types.ts';
import { createPlaceAdapter, learnAction, type PlaceOutcome } from './serve.ts';

const adapter = createPlaceAdapter({
  ctx: () => game.planContext() as unknown as PlanContext,
  rng: () => game.rng,
  visits: () => (game.state.places as unknown as PlacesState).visits,
});

export const { serve, serveAsk, canServeSlot, visitPlan, spellStepNow, wordViews, learnerView, logFor } = adapter;

/** Logs one served moment. Returns false when there was nothing to log (no planner pick). */
export function logResult(served: ServedItem, mine: ItemResult[], o: PlaceOutcome, baby: string | null = null): boolean {
  const a = adapter.resultAction(served, mine, o, baby);
  if (!a) return false;
  game.dispatch(a);
  return true;
}

/** Logs a pick that places built themselves (the Building Day sign, R38). `slots` already hold planner ids. */
export function logPick(pick: PlanPick, o: PlaceOutcome & { place: string; slots?: ItemResult[] }, baby: string | null = null): void {
  game.dispatch(learnAction(pick, o, baby));
}
