// The places test API, `window.__game.places` (contracts C10). Tasks A7, A10, A11 and A15 add their methods
// to PlacesHook and to the object below. It registers itself when this module loads (src/places/scenes.ts imports it).
// Store-bound parts load lazily, so this module stays importable in a plain unit test.
import { registerHook, registerHookExtension } from '../platform/hooks.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlacesHook = Record<string, any>;

const api: PlacesHook = {};

export function placesHook(): PlacesHook {
  return api;
}

const parentStore = () => import('../parent/store.svelte.ts');

/** Task A7: the meadow's part, set while the meadow is on screen. */
export type MeadowApi = {
  bubbles(): { kind: string; place: string }[];
  tapBubble(kind: string): void;
  opening(): string | null;
  edges(): string[];
  lite(): boolean;
};
let meadow: MeadowApi | null = null;
export function registerMeadow(m: MeadowApi | null): void {
  meadow = m;
}
/** Bubbles on the meadow now (empty when the meadow is not on screen). */
api.bubbles = (): { kind: string; place: string }[] => meadow?.bubbles() ?? [];
/** Taps the first bubble of this kind, as Emma would. */
api.tapBubble = (kind: string): void => meadow?.tapBubble(kind);
/** The opening the meadow announced on this arrival, or null. */
api.opening = (): string | null => meadow?.opening() ?? null;
/** The meadow's edges as `<id>:<open|plot>`. */
api.edges = (): string[] => meadow?.edges() ?? [];
/** Whether the meadow draws lite unicorns (R63). */
api.lite = (): boolean => meadow?.lite() ?? false;
/** Goes to a place scene (`meadow`, `toy-shelf`, `bath-pond`, ...) as an edge tap would. */
api.goPlace = async (id: string, params: Record<string, unknown> = {}): Promise<void> => {
  const { enterPlace } = await import('./nav.ts');
  await enterPlace(id, params);
};

/** Task A15: the parent corner. */
api.parent = {
  async open(pin?: string): Promise<boolean> { return (await parentStore()).unlock(pin); },
  async close(): Promise<void> { (await parentStore()).closeGate(); },
  async report() { return (await parentStore()).report(); },
  async exportJson(): Promise<string> { return (await parentStore()).exportText(); },
  async importJson(text: unknown): Promise<string> { return (await parentStore()).restoreText(typeof text === 'string' ? text : JSON.stringify(text)); },
  async devices() { return (await parentStore()).devices(); },
};

// The eviction flow's hooks (master Task I-6): window.__game.call(name, ...args).
registerHook('parentExport', async () => {
  const s = await parentStore();
  const { game } = await import('../game.svelte.ts');
  await game.ready();
  return s.exportText();
});
registerHook('parentUnlock', async (pin?: string) => (await parentStore()).unlock(pin));
registerHook('parentImport', async (text: unknown) => (await parentStore()).restoreText(typeof text === 'string' ? text : JSON.stringify(text)));
registerHook('hatchedSinceRestore', async () => (await parentStore()).hatchedSinceRestore());

/** Registers a place's hook part (`label`, `pond`, ...). Scenes call it on mount and remove it on destroy. */
export function setPlaceHook(key: string, part: object | null): void {
  if (part) api[key] = part;
  else delete api[key];
}

registerHookExtension('places', api);
