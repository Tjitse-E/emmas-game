// The places test API, `window.__game.places` (contracts C10). Tasks A7, A10, A11 and A15 add their methods
// to PlacesHook and to the object below. It registers itself when this module loads (src/places/scenes.ts imports it).
import { registerHookExtension } from '../platform/hooks.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlacesHook = Record<string, (...args: any[]) => unknown>;

const api: PlacesHook = {};

export function placesHook(): PlacesHook {
  return api;
}

registerHookExtension('places', api);
