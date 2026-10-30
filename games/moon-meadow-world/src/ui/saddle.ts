// The saddle icons over the mounts' saddles (2.4.0, docs/v4/2.4.md section 5.4; Layer.saddles): v3's saddle picture,
// 120 px, acting on pointerdown, targets 'saddle bella' and 'saddle hazel'. The mount lane fills it
// (docs/v4/2.4-plan.md Task 24); step 0's stub shows nothing.
import type { MountId, ScreenPoint } from '../contracts';
import type { UiTarget } from './moment';

export interface Saddles {
  /** Show the icons over these points, or take them away with null. */
  set(o: { at: Record<MountId, () => ScreenPoint>; onTap(m: MountId): void } | null): void;
  /** The icons on screen, as 'saddle <mount>'. */
  targets(): UiTarget[];
}

export function createSaddles(_parent: HTMLElement): Saddles {
  return { set() {}, targets: () => [] };
}
