// The moonbeam (contracts C7, R10): the only one in the app, mounted once in App.svelte.
import { rectOf, type Target } from './targets.ts';
import { unionRect, type Rect } from '../platform/geometry.ts';
import { STAGE_W, STAGE_H } from '../platform/fit.ts';

export const beamState = $state<{ rect: Rect | null }>({ rect: null });

export const moonbeam = {
  get rect(): Rect | null { return beamState.rect; },
  /** Lights one area. Several targets are lit together, so a choice step never points at the answer. */
  show(targets: Target | Target[], pad = 24): void {
    const list = Array.isArray(targets) ? targets : [targets];
    const rects = list.map(rectOf).filter((r): r is Rect => r !== null);
    beamState.rect = unionRect(rects, pad, { x: 0, y: 0, w: STAGE_W, h: STAGE_H });
  },
  clear(): void { beamState.rect = null; },
};
