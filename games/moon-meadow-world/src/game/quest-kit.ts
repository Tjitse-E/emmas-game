// What the afternoon's quests share (moved out of quests.ts in 2.3.0, so the bead tree and the Dressing Corner can use
// it from their own files): walking to a quest's spot, her babies as guests, following again afterwards and the herd
// stepping aside; and the pure rules of the afternoon (docs/v4/2.3.md section 17): the free-play clocks, the maths
// quest's rotation and the gifts.
import * as THREE from 'three';
import type { GiftItem, GiftSet, Owned, PrincessLook, Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { CORNER, GRAZE_HOMES, dist2 } from '../layout';
import { copyOwned, giftChoices, giftSetFor, stillToEarn, withItem } from '../wardrobe';
import { CLIPS } from '../content';
import { type Game, type QuestState, flat, lumiSay, princessAt, synth, walkTo } from './game';
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

// ---- the free-play clocks (docs/v4/2.3.md section 17.3) ------------------------------------------------------------

/**
 * Free play's own time: it ends once this much has passed, no quest runs, the wardrobe is closed and no picnic or
 * maths bubble is still offered (or the quest cutoff has passed).
 */
export const FREE_PLAY_MS = 120_000;
/** No picnic or maths quest starts after this much free time, not counting the Corner's dressing. */
export const QUEST_CUTOFF_MS = 90_000;
/** The Corner's music box gets the free time that is left, at least and at most this long. */
export const CORNER_MIN_MS = 30_000;
export const CORNER_MAX_MS = 60_000;
/**
 * Free time stands still while Lumi or Elizabeth speaks (the bubbles line, the basket line, a prompt), up to this
 * much in a play, so a voice that never ends cannot keep free play open.
 */
export const TALK_MAX_MS = 45_000;

/** What the clocks read and write: the afternoon's state and the play clock's dressing time. */
export interface FreeClocks {
  quests: Pick<QuestState, 'freeMs' | 'wallMs' | 'talkMs' | 'running' | 'dressing' | 'offered' | 'maths'>;
  clock: { dressMs: { corner: number } };
}

/**
 * One frame of the afternoon: wall time always (for the log), free time while no quest runs and nobody speaks, and
 * while the Corner's music box plays, and that same music box time as the Corner's dressing time. The music box
 * counts while a colour word plays: its limit is wall time.
 */
export function tickFree(c: FreeClocks, ms: number, speaking = false): void {
  const q = c.quests;
  q.wallMs += ms;
  if (q.dressing) {
    q.freeMs += ms;
    c.clock.dressMs.corner += ms;
  } else if (!q.running) {
    if (speaking && q.talkMs < TALK_MAX_MS) q.talkMs += ms;
    else q.freeMs += ms;
  }
}

/** Free time without the Corner's dressing: what the quest cutoff counts. */
export const freeWithoutDressing = (c: FreeClocks): number => c.quests.freeMs - c.clock.dressMs.corner;

/** Past the cutoff: no new picnic or maths quest. The Corner may still start while free play is on. */
export const pastCutoff = (c: FreeClocks): boolean => freeWithoutDressing(c) >= QUEST_CUTOFF_MS;

/** A learning quest's bubble still shows: the picnic's or this play's maths quest's. */
export const learningOffered = (c: FreeClocks): boolean => c.quests.offered.has('picnic') || c.quests.offered.has(c.quests.maths);

/**
 * Free play is over: its time is up, no quest runs (the Corner runs until its wardrobe closes), nobody dresses, and
 * no learning bubble still waits (or the cutoff has passed). So a learning quest, then a 60 s Corner, still leaves the
 * time to the cutoff for the other learning quest, and free time stays at most 150 s (section 17.3).
 */
export const freePlayOver = (c: FreeClocks): boolean =>
  c.quests.freeMs >= FREE_PLAY_MS && !c.quests.running && !c.quests.dressing && (pastCutoff(c) || !learningOffered(c));

/** The Corner's music box when it starts: the free time that is left, at least 30 s and at most 60 s. */
export function cornerLimitMs(freeMs: number): number {
  return Math.min(CORNER_MAX_MS, Math.max(CORNER_MIN_MS, FREE_PLAY_MS - freeMs));
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
