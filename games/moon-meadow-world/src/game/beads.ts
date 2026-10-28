// The bead tree (docs/v4/2.3.md section 19.2): a maths side quest in the east yard. She walks to the tree, her first
// baby wants a necklace, and she finishes its pattern: three gaps, each its own checked choice with its own hint
// ladder (layer.beads). Each gap logs a result (part beads1 to beads3, strand m, kind pattern) and moves the pattern
// level, a small level of its own that never moves the maths band.
//
// Like every quest in quests.ts's table it returns while the camera is still framed and the baby, the followers and
// the herd are still aside, with the function that releases them. quests.ts runs the gift picker in that frame and
// then calls it.
//
// Step 0 stub: the quest ends at once. The patterns lane builds it.
import type { Game } from './game';

export async function beadsQuest(g: Game): Promise<() => void> {
  return () => {
    g.free = true;
  };
}
