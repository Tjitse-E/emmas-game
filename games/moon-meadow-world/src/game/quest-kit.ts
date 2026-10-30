// What the afternoon's quests share (moved out of quests.ts in 2.3.0, so the bead tree and the Dressing Corner can use
// it from their own files): walking to a quest's spot and the herd stepping aside (the guests and following again moved
// to guests.ts in 2.4.0); and the pure rules of the afternoon (docs/v4/2.3.md section 17): the maths quest's rotation and
// the gifts. 2.4.0: free play's clocks went; the hub's play clock (hub.ts) ends the play at bedtime.
import * as THREE from 'three';
import type { GiftItem, GiftSet, Owned, PrincessLook, Vec2 } from '../contracts';
import { CORNER, GRAZE_HOMES, dist2 } from '../layout';
import { copyOwned, giftChoices, giftSetFor, stillToEarn, withItem } from '../wardrobe';
import { CLIPS } from '../content';
import { type Game, flat, lumiSay, princessAt, synth, walkTo } from './game';
import type { QuestId } from './options';

/** The longest walk to a quest's spot; after that she is there at once. */
const WALK_MS = 12_000;

/** She walks to a quest's spot; a long way (or a slide still going) ends with her there at once. */
export async function walkThere(g: Game, to: Vec2): Promise<void> {
  const her = g.actors.princess;
  await g.run.until(() => ['idle', 'walk', 'run'].includes(her.mode), 15_000);
  await g.run.w(Promise.race([walkTo(g, to), new Promise((r) => setTimeout(r, WALK_MS))]));
  if (dist2(princessAt(g), to) > 0.6) g.actors.placePrincess(to, 0);
}

/**
 * The herd grazing at a quest's place steps aside (on) or goes home again (off). `pairs` are [grazing home, aside
 * spot] (CORNER.herd, BEAD_TREE.herd). They walk there, or with `place` are put there at once when far. Followers,
 * unicorns in a stall and the hay rack's helpers stay where they are. Frozen for the lanes (docs/v4/2.3.md section 22.1).
 */
export function herdAsideAt(g: Game, pairs: readonly (readonly [Vec2, Vec2])[], on: boolean, o: { place?: boolean } = {}): void {
  g.herd.forEach((h, i) => {
    const pair = pairs.find(([home]) => dist2(home, GRAZE_HOMES[i]) < 0.01);
    const u = g.actors.herd.get(h.id);
    // A hay rack helper waits at the rack for its quest (quests.ts hungryHerd): sent aside and home again, it would
    // graze too far from the rack to eat there.
    if (!pair || !u || u.mode === 'stall' || u.followSlot !== null || g.quests.helpers.includes(h.id)) return;
    if (on) {
      if (o.place && dist2(flat(u.position), pair[1]) > 3) u.place(pair[1]);
      u.graze(pair[1]);
    } else u.graze(GRAZE_HOMES[i]);
  });
}

// ---- the maths quest's rotation (17.2) ------------------------------------------------------------------------------

/**
 * This play's maths quest: last play's when she did not finish it, else the other one. A save without an afternoon
 * (2.2's, a first play) gets the bead tree. `?quest=rack|beads` sets it.
 */
export function mathsQuestFor(last: { maths: 'rack' | 'beads' | null; done: readonly string[] }, forced: string | null = null): 'rack' | 'beads' {
  if (forced === 'rack' || forced === 'beads') return forced;
  if (!last.maths) return 'beads';
  if (!last.done.includes(last.maths)) return last.maths;
  return last.maths === 'rack' ? 'beads' : 'rack';
}

// ---- gifts (17.2) ---------------------------------------------------------------------------------------------------

/**
 * A quest's gift: the set it pays from now (its own while it has items left, else the set with the most left) and
 * the one or two items she picks from, from the stream 'gift-<quest>'. No items when every set is full.
 */
export function giftOffer(quest: string, owned: Owned, rand: () => number): { set: GiftSet | null; items: GiftItem[] } {
  const set = giftSetFor(quest, owned);
  return { set, items: set ? giftChoices(set, owned, rand) : [] };
}

/**
 * Did this pick fill the set the gift came from (items left before it, none after)? Then Lumi puts a sticker on the
 * trunk lid ("You found them all!"). Once per set: a later gift comes from another set, and a set that was already
 * full before the pick never counts again.
 */
export function fillsSet(set: GiftSet, before: Owned, after: Owned): boolean {
  return stillToEarn(set, before).length > 0 && stillToEarn(set, after).length === 0;
}

/** Her look with a gift on top: she keeps wearing it (2.3 section 17.2). */
export function wearing(look: PrincessLook, item: GiftItem): PrincessLook {
  return { ...look, [item.field]: item.id };
}

/** The sparkle trail from her to the trunk: this many sparkles, this far apart in time, over at most this length. */
const TRAIL = { n: 9, ms: 70, maxM: 6 } as const;

/**
 * A quest's gift (2.3 sections 5 and 17.2), in the quest's frame: the set it pays from now and one or two items from
 * it on the picker's cards ("Pick one present!"). The picked item is saved at once in what she owns and on her look,
 * and she keeps wearing it. She twirls, the fanfare plays (never over Elizabeth), and a sparkle trail flies from her
 * to the trunk. When the pick filled the set it came from, Lumi says "You found them all! A sticker for your trunk.",
 * once per set. Resolves with the item, or null when every set is full (no picker).
 */
export async function giveGift(g: Game, quest: QuestId): Promise<GiftItem | null> {
  const { actors, layer, world } = g;
  const her = actors.princess;
  const before = copyOwned(g.save.data.owned);
  const { set, items } = giftOffer(quest, before, g.randFor(`gift-${quest}`));
  if (!set || !items.length) return null;
  const chest = new THREE.Vector3();
  const item = await g.run.w(layer.gift({ items, look: { ...her.look }, clips: CLIPS.gift, to: () => world.toScreen(her.point('dress', chest)) }));
  wearGift(g, item);
  synth('fanfare');
  sparkleTrail(g);
  await g.run.w(her.emote('twirl'));
  if (fillsSet(set, before, g.save.data.owned)) await lumiSay(g, CLIPS.sticker);
  return item;
}

/** The gift goes on and stays on: saved in what she owns and in her look at the pick, and today's gifts. */
export function wearGift(g: Game, item: GiftItem): void {
  const look = wearing(g.actors.princess.look, item);
  g.actors.princess.setLook(look);
  g.save.write((s) => {
    s.owned = withItem(s.owned, item);
    s.look = { ...look };
  });
  g.quests.gifts.push(item);
}

/** Sparkles fly from her head towards the trunk (off screen when the trunk is far: they go its way). */
function sparkleTrail(g: Game): void {
  const from = g.actors.princess.position.clone().setY(1.3);
  const to = new THREE.Vector3(CORNER.trunk.x, 0.6, CORNER.trunk.z);
  const d = from.distanceTo(to);
  if (d > TRAIL.maxM) to.sub(from).setLength(TRAIL.maxM).add(from);
  for (let k = 1; k <= TRAIL.n; k++) {
    const p = from.clone().lerp(to, k / TRAIL.n);
    p.y += Math.sin((k / TRAIL.n) * Math.PI) * 0.6;
    setTimeout(() => g.actors.fx.sparkle(p, { count: 4, colour: k % 2 ? '#fff1b8' : '#ffc4e1' }), k * TRAIL.ms);
  }
}
