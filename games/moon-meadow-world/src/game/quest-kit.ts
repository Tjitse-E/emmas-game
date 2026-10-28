// What the afternoon's quests share (moved out of quests.ts in 2.3.0, so the bead tree and the Dressing Corner can use
// it from their own files): walking to a quest's spot, her babies as guests, and following again afterwards.
import type { Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { GRAZE_HOMES, dist2 } from '../layout';
import { type Game, flat, princessAt, walkTo } from './game';

/** The longest walk to a quest's spot; after that she is there at once. */
const WALK_MS = 12_000;

/** She walks to a quest's spot; a long way (or a slide still going) ends with her there at once. */
export async function walkThere(g: Game, to: Vec2): Promise<void> {
  const her = g.actors.princess;
  await g.run.until(() => ['idle', 'walk', 'run'].includes(her.mode), 15_000);
  await g.run.w(Promise.race([walkTo(g, to), new Promise((r) => setTimeout(r, WALK_MS))]));
  if (dist2(princessAt(g), to) > 0.6) g.actors.placePrincess(to, 0);
}

/** Her babies as quest guests and helpers: they stop following until the quest is over. */
export function guests(g: Game): UnicornActor[] {
  return g.babies.slice(0, 2).map((b) => b.unicorn);
}

export function followAgain(g: Game, babies: UnicornActor[]): void {
  for (const p of g.parked.splice(0)) g.followers.add(p);
  babies.forEach((u, k) => g.followers.add(u, k === 0));
}

/**
 * The herd grazing at a quest's place steps aside (on) or goes home again (off). `pairs` are [grazing home, aside
 * spot] (CORNER.herd, BEAD_TREE.herd). They walk there, or with `place` are put there at once when far. Followers and
 * unicorns in a stall stay where they are. Frozen for the lanes (docs/v4/2.3.md section 22.1).
 */
export function herdAsideAt(g: Game, pairs: readonly (readonly [Vec2, Vec2])[], on: boolean, o: { place?: boolean } = {}): void {
  g.herd.forEach((h, i) => {
    const pair = pairs.find(([home]) => dist2(home, GRAZE_HOMES[i]) < 0.01);
    const u = g.actors.herd.get(h.id);
    if (!pair || !u || u.mode === 'stall' || u.followSlot !== null) return;
    if (on) {
      if (o.place && dist2(flat(u.position), pair[1]) > 3) u.place(pair[1]);
      u.graze(pair[1]);
    } else u.graze(GRAZE_HOMES[i]);
  });
}
