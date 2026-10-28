// The bead tree (docs/v4/2.3.md Part 2, section 6): a maths side quest in the east yard. She walks to the tree, her
// first baby wants a necklace, and she finishes its pattern: three gaps, each its own checked choice with its own
// hint ladder (layer.beads). Each gap logs a result (part beads1 to beads3, strand m, kind pattern) and moves the
// pattern level, a small level of its own that never moves the maths band.
//
// Step 0 stub: the quest ends at once. The patterns lane builds it; quests.ts runs it and adds the gift after it.
import type { Game } from './game';

export async function beadsQuest(g: Game): Promise<void> {
  g.free = true;
}
