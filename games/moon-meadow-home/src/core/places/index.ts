// The places workstream's public face for the store and other lanes (contracts C7 "Places exports others use").
import type { DraftOf } from '../events.ts';
import type { Slice } from '../fold/engine.ts';
import type { GameState, World } from '../../types/contracts.ts';
import { reducePlaces } from './fold.ts';
import { initPlaces, type PlacesState } from './state.ts';

export { reducePlaces } from './fold.ts';
export { currentVisit, initPlaces } from './state.ts';
export type { PlacesState } from './state.ts';
export { applyPlaceAction, PLACE_SAMPLE_ACTIONS } from './actions.ts';
export type { PlaceAction, PlaceDraft, LearnPayload } from './actions.ts';
export { CURRENT_RELEASE, released } from './content.ts';
export { earned, isAnnounced, JEWELS_OPENING, openingCtx, openingDefs, openingDue, REWARD_OPENINGS } from './openings.ts';
export type { OpeningCtx, OpeningDef } from './openings.ts';

/** Bump when the places fold changes (part of the snapshot key). */
export const PLACES_FOLD_VERSION = 1;

export function createPlacesSlice(): Slice<'places', PlacesState> {
  return { name: 'places', version: PLACES_FOLD_VERSION, init: initPlaces, apply: (s, e) => reducePlaces(s, e) };
}

/** Titles earned and not yet given. Task C5 fills it; until then nothing is due. */
export function titlesToGive(_state: GameState, _world: World): DraftOf<'title.given'>[] {
  return [];
}

/** Moment pins due and not yet given. Task B2 fills it; until then nothing is due. */
export function momentPinsDue(_state: GameState, _world: World): DraftOf<'pin.given'>[] {
  return [];
}
