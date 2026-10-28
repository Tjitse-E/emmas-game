// The treasure board inside the trunk lid (docs/v4/2.3.md Part 2, section 3): every gift set as a row of places. An
// owned item shows its picture; an empty place shows the picture of the quest that fills it; a full set has a sticker.
// It shows when the Dressing Corner's trunk opens, before the rails, and today's gifts sparkle on it. Nothing on it can
// be touched.
//
// Step 0 stub: shows nothing. The wardrobe-ui lane builds it and calls it from the wardrobe when o.board is set.
import type { BoardSpec } from '../contracts';

/** Show the board in `parent` for `ms`, then fold it away. Resolves when it is gone. */
export function showBoard(_parent: HTMLElement, _spec: BoardSpec, _ms: number): Promise<void> {
  return Promise.resolve();
}
