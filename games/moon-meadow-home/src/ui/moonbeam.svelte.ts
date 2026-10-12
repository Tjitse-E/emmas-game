// First version (platform A9). Task A11 adds show.
import type { Rect } from '../platform/geometry.ts';

export const beamState = $state<{ rect: Rect | null }>({ rect: null });
export const moonbeam = {
  get rect(): Rect | null { return beamState.rect; },
  clear(): void { beamState.rect = null; },
};
