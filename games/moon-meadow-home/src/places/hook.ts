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
