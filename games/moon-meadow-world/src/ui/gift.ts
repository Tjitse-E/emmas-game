// The gift picker (docs/v4/2.3.md section 16): after a quest, one or two big cards with a gift each. A card acts on
// pointerdown (64 CSS px and more, never under a finger that is already down); the other card fades, the chosen one
// pops with the gift-paper effect and its sparkles fly to `to` (Princess Emma on screen, who puts it on and keeps it),
// and the picker resolves with it. Not a checked moment.
//
// Step 0 stub: resolves with the first gift at once. The wardrobe-ui lane builds it.
import type { Layer } from '../contracts';

export type GiftOpts = Parameters<Layer['gift']>[0];

export function runGift(_parent: HTMLElement, o: GiftOpts): ReturnType<Layer['gift']> {
  return Promise.resolve(o.items[0]);
}
