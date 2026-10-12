import { SCENE_IDS } from '../types/contracts.ts';

/** Scene ids of the contract (contracts C7, with rest from R45). Unknown ids still work; the registry only warns. */
export const KNOWN_SCENES: readonly string[] = SCENE_IDS;

/** Scenes that may show in portrait. Every other scene shows the turn-the-iPad picture. */
export const PORTRAIT_OK: ReadonlySet<string> = new Set(['parent']);

/** BuildingDay.svelte is building-day. src/parent/ParentCorner.svelte is parent. */
export function sceneIdFromPath(path: string): string {
  const base = (path.split('/').pop() ?? '').replace(/\.svelte$/, '');
  if (base === 'ParentCorner') return 'parent';
  return base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
