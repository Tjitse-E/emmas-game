// The reactive scene router (contracts C7). The URL never changes; the scene lives in memory.
import { RouterCore, type SceneEntry, type RouteListener } from './router-core.ts';
import { ghost } from '../ui/ghost-hand.svelte.ts';
import { moonbeam } from '../ui/moonbeam.svelte.ts';
import { audio } from '../audio/index.ts';

export type { SceneEntry };

const core = new RouterCore<string>(20);
export const route = $state<{ current: SceneEntry | null; navKey: number }>({ current: null, navKey: 0 });

let mountedKey = 0;
const waiting: { key: number; resolve: () => void }[] = [];

// On every scene change: no ghost hand, no moonbeam, no speech from the old scene. Scenes preload and
// release their own audio scene (R3).
core.onChange((_from, to) => {
  ghost.hide();
  moonbeam.clear();
  audio.stop();
  route.current = to;
  route.navKey += 1;
});

function settled(): Promise<void> {
  const key = route.navKey;
  if (mountedKey >= key) return Promise.resolve();
  return new Promise((resolve) => { waiting.push({ key, resolve }); });
}

export const router = {
  get current(): SceneEntry | null { return core.current; },
  /** Every promise resolves once the new scene is in the DOM. */
  go(id: string, params: Record<string, unknown> = {}): Promise<void> { core.go(id, params); return settled(); },
  replace(id: string, params: Record<string, unknown> = {}): Promise<void> { core.replace(id, params); return settled(); },
  reset(id: string, params: Record<string, unknown> = {}): Promise<void> { core.reset(id, params); return settled(); },
  async back(): Promise<boolean> { const moved = core.back(); if (moved) await settled(); return moved; },
  onChange(fn: RouteListener<string>): () => void { return core.onChange(fn); },
  /** Router.svelte calls this when the scene for navKey is in the DOM. */
  mounted(key: number): void {
    mountedKey = Math.max(mountedKey, key);
    for (let i = waiting.length - 1; i >= 0; i--) {
      if (waiting[i].key <= mountedKey) { waiting[i].resolve(); waiting.splice(i, 1); }
    }
  },
};
