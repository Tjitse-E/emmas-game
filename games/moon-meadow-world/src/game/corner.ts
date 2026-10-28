// The Dressing Corner (docs/v4/2.3.md section 3 and Part 2, section 4): once a play, after her first finished quest,
// at the south step of Lumi's gazebo. Her two babies dress up first (two phrase reads, the gate), she picks a gift
// from the hair set, then the wardrobe opens with the trunk lid's treasure board and the music box. The gate is quest
// time; the dressing is free-play time (quests.ts counts it), and free play cannot end while the wardrobe is open.
//
// Step 0 stub: the visit ends at once. The quests-world lane builds it.
import type { Game } from './game';

export async function cornerQuest(g: Game): Promise<void> {
  g.free = true;
}
