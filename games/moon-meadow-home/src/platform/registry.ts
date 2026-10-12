// Scene id to component loader. Three ways to register a scene, the later wins:
// a file src/scenes/<Pascal>.svelte, a plain-object export of src/<folder>/scenes.ts, registerScenes(map).
import type { Component } from 'svelte';
import { KNOWN_SCENES, sceneIdFromPath } from './scene-ids.ts';

export type SceneProps = { params: Record<string, unknown> };
type SceneModule = { default: Component<SceneProps> };
type Loader = () => Promise<SceneModule>;

const loaders = new Map<string, Loader>();
const known = new Set<string>(KNOWN_SCENES);

function add(id: string, load: Loader, from: string): void {
  if (!known.has(id)) console.warn(`[router] scene ${id} from ${from} is not in KNOWN_SCENES`);
  loaders.set(id, load);
}

// 3. Files: src/scenes/<PascalCase>.svelte and the parent corner (lazy). The demo scene only in test builds.
const files: Record<string, Loader> = {
  ...import.meta.glob<SceneModule>('../scenes/*.svelte'),
  ...import.meta.glob<SceneModule>('../parent/ParentCorner.svelte'),
  ...(import.meta.env.MODE !== 'production' ? import.meta.glob<SceneModule>('./PlatformDemo.svelte') : {}),
};
for (const [path, load] of Object.entries(files)) add(sceneIdFromPath(path), load, path);

// 2. Maps: plain-object named exports of src/<folder>/scenes.ts (eager), for example placeScenes.
const maps = import.meta.glob<Record<string, unknown>>('../*/scenes.ts', { eager: true });
for (const [path, mod] of Object.entries(maps)) {
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) continue;
    for (const [id, comp] of Object.entries(value as Record<string, Component<SceneProps>>)) {
      add(id, async () => ({ default: comp }), path);
    }
  }
}

// 1. Explicit registration wins over both.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerScenes(map: Record<string, Component<any>>): void {
  for (const [id, comp] of Object.entries(map)) add(id, async () => ({ default: comp as Component<SceneProps> }), 'registerScenes');
}

export const loaderFor = (id: string): Loader | null => loaders.get(id) ?? null;
export const builtScenes = (): string[] => [...loaders.keys()].sort();
