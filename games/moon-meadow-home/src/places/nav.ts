// Moving between places (R32): the store writes place.enter and place.leave on every router change, so these
// only navigate. Task A7 adds the meadow's own helpers.
import { game } from '../game.svelte.ts';
import { audio } from '../audio/index.ts';
import type { WorldBaby } from '../types/contracts.ts';
import { registerState } from '../platform/hooks.ts';

export function enterPlace(place: string, params: Record<string, unknown> = {}): Promise<void> {
  return game.go(place, params);
}

export function toMeadow(): Promise<void> {
  audio.stop();
  return game.go('meadow');
}

/** The herd in hatch order, as the world view gives it. */
export const herdView = (): WorldBaby[] => game.world?.herd ?? [];

// Flows read the places slice as window.__game.state().places (announced openings, buildings, row names).
// The registry is shipped in every build but only test builds read it.
registerState('places', () => game.state?.places ?? null);
