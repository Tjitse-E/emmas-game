// The afternoon (docs/v4/2.2.md section 5, 2.3.md sections 5 and 17): free play with its side quests. It starts with
// the offer bubbles: a picnic over the rug by the gazebo, and this play's maths quest (the hay rack and the bead tree in
// turn, quest-kit.ts mathsQuestFor), explained once a play. Then the basket line and the food basket, as before. A
// bubble tap, a tap on the place or walking within 2.5 m of it starts that quest; free play itself is never checked,
// and a skipped quest costs nothing. Each bubble carries the swatch of a gift its quest can still give (the badge).
//
// Every quest resolves still framed with a release function: the gift picker runs in that frame, then the release.
// After her first finished quest (once its gift is picked) the trunk bubble shows over the Dressing Corner, with Lumi's
// "Come and try my Dressing Corner!" once a play; it stays until the Corner is done or free play ends.
//
// Time (17.3, quest-kit.ts): free time runs while no quest runs and nobody speaks, and while the Corner's music box
// plays. Free play ends once there is 120 s of it, no quest runs, the wardrobe is closed and no picnic or maths bubble
// still waits (so a learning quest, then a 60 s Corner, still leaves time for the other one; at most 150 s). No picnic
// or maths quest starts after 90 s of free time without dressing; a running quest always finishes. Every quest needs
// her two named babies. The bubbles hide while a quest runs, once it is done, past the cutoff and at bedtime. The
// bubbles, the wish bubbles and the gift cards keep clear of her (layer.keepClear, herBox).
import type { EggSpec, MomentHooks, ScreenBox, Vec2, WishSpec } from '../contracts';
import * as THREE from 'three';
import type { UnicornActor } from '../actors';
import { BEAD_TREE, CORNER, GRAZE_HOMES, HAY_RACK, PICNIC, PLACES, dist2 } from '../layout';
import { PALETTE, giftSetFor, stillToEarn } from '../wardrobe';
import { giftSwatchUrl } from '../ui/swatches';
import { audio } from '../audio';
import { v3Art, wordPic } from '../assets';
import { CLIPS, eggClipIds, foods, rackSpec, wishClipIds } from '../content';
import { type Game, checked, flat, frameAt, lumiSay, preload, princessAt, say, sayAside, synth, v3 } from './game';
import { afterWish, crownKeep, momentLog, parkFollowers, planWish, runWish } from './moments';
import { eggAsk, noteMaths } from './maths';
import { useSum } from './band';
import { herdAside } from './wardrobe-part';
import { freePlayOver, giveGift, pastCutoff, tickFree, walkThere } from './quest-kit';
import { followAgain, guests } from './guests';
import { beadsQuest } from './beads';
import { cornerQuest } from './corner';
import { QUEST_IDS, type QuestId } from './options';

export { FREE_PLAY_MS, QUEST_CUTOFF_MS } from './quest-kit';

/** The free-play wait's longest stretch: a safety only, free play ends by its clocks (freePlayOver) long before. */
const FREE_WAIT_MS = 600_000;
/** A quiet while without a touch brings the next suggestion. */
const FREE_PROMPT_MS = 30_000;
/** Walking this near a quest's place starts it (the nearest one when two are near). */
const NEAR_M = 2.5;
/** The picnic guests sit down on their cushions after this long at the latest. */
const SEAT_MS = 4000;
/** The picnic frame: the rug's centre a little east, 5.5 m across, the babies' head tops at 45%. */
const PICNIC_FRAME = { east: 0.6, width: 5.5, frac: 0.45 };
/**
 * The hay rack frame: 6 m across, centred a little west of the rack so the stone tray on the right stays clear, the
 * rack's top high on the screen above the hay panel.
 */
const RACK_FRAME = { west: 0.3, width: 6, top: 1.5, frac: 0.28 };
/**
 * Her spot for the hay rack moment: beside the rack on the west (the left of the screen), clear of the eat spots. At
 * HAY_RACK.stand she would stand between the camera and the rack, hidden behind the hay panel.
 */
const RACK_SIDE: Vec2 = { x: HAY_RACK.center.x - 2.2, z: HAY_RACK.center.z + 0.4 };
/** After a full rack, the herd and her babies munch with hearts this long before going home. */
const MUNCH_MS = 3000;

/** The bubble pictures (v3 art), their tint, and where each bubble floats. */
const OFFER: Record<QuestId, { pic: (g: Game) => string; tint?: string; at: { x: number; y: number; z: number } }> = {
  // Over the rug's east end: after the Corner she stands at the step north of the rug's middle, and a bubble over the
  // middle sat on her (and on the trunk bubble, west of her).
  picnic: { pic: () => wordPic('picnic'), at: { x: PICNIC.rug.center.x + 1.2, y: 1.3, z: PICNIC.rug.center.z } },
  rack: { pic: () => v3Art('items/item-hay-bundle.webp'), at: { x: HAY_RACK.center.x, y: 2.3, z: HAY_RACK.center.z } },
  // v3's bead picture tinted pink over the tree.
  beads: { pic: () => wordPic('bead'), tint: PALETTE.pink.pic, at: { x: BEAD_TREE.center.x, y: 3.0, z: BEAD_TREE.center.z } },
  // Just over the trunk (not up by the gazebo roof): v3's dressing place picture, with the badge of a hair gift she can
  // earn there, as every bubble. 2.3.0's last pass: the newest gift's swatch here read as one more present to pick.
  corner: { pic: () => v3Art('items/place-dressing.webp'), at: { x: CORNER.trunk.x, y: 1.1, z: CORNER.trunk.z } },
};

/**
 * Each quest's moment (2.3 section 17.2). It walks, frames and runs its moments, and resolves while the camera is
 * still framed and its guests, the followers and the herd are still aside, with the function that lets them go. The
 * afternoon runs the gift picker in that frame, then calls it (the Corner runs its own picker, after its gate).
 */
const RUN: Record<QuestId, (g: Game) => Promise<() => void>> = {
  picnic: (g) => picnicQuest(g),
  rack: (g) => rackQuest(g),
  beads: (g) => beadsQuest(g),
  corner: (g) => cornerQuest(g),
};

const bothNamed = (g: Game): boolean => !!g.babies[0]?.member && !!g.babies[1]?.member;

/** The Dressing Corner opens after her first finished quest (once its gift is picked), or at once with ?quest=corner. */
const cornerOpen = (g: Game): boolean => g.options.quest === 'corner' || [...g.quests.done].some((id) => id !== 'corner');

/**
 * The quests this play's free play offers: the royal picnic, this play's maths quest (the hay rack or the bead tree)
 * and the Dressing Corner. Only these can start (canQuest), and wish2's kind follows the picnic (moments.ts
 * secondWishKind).
 */
export function playQuests(g: Game): QuestId[] {
  return QUEST_IDS.filter((id) => id === 'picnic' || id === 'corner' || id === g.quests.maths);
}

/** May this quest start now? */
export function canQuest(g: Game, id: QuestId): boolean {
  const q = g.quests;
  if (g.part !== 'free' || g.bedtime || q.over || !bothNamed(g) || q.done.has(id) || q.running) return false;
  if (!playQuests(g).includes(id)) return false;
  if (id === 'corner') return cornerOpen(g);
  return !pastCutoff(g);
}

/** Start a quest at the afternoon's next frame (a bubble tap, a tap on its place, walking near). False when it cannot. */
export function askQuest(g: Game, id: QuestId): boolean {
  if (g.quests.asked || !canQuest(g, id)) return false;
  g.quests.asked = id;
  return true;
}

/**
 * A bubble's badge: the swatch of the first gift its quest can still give (from the set it pays from now), so the
 * prize shows without reading. The Corner's too (a hair gift). None when every set is full.
 */
export function badgeOf(g: Game, id: QuestId): string | undefined {
  const set = giftSetFor(id, g.save.data.owned);
  const item = set ? stillToEarn(set, g.save.data.owned)[0] : undefined;
  return item ? giftSwatchUrl(item, g.actors.princess.look) : undefined;
}

/** Show the bubble of every quest that can start, hide the others. Returns true when the trunk bubble is new. */
function showOffers(g: Game): boolean {
  const q = g.quests;
  let trunk = false;
  for (const id of QUEST_IDS) {
    if (canQuest(g, id)) {
      if (q.offered.has(id)) continue;
      q.offered.add(id);
      if (id === 'corner') trunk = true;
      const o = OFFER[id];
      const p = v3({ x: o.at.x, z: o.at.z }, o.at.y);
      g.layer.offer(id, { pic: o.pic(g), tint: o.tint, badge: badgeOf(g, id), at: () => g.world.toScreen(p), onTap: () => void askQuest(g, id) });
    } else hideOffer(g, id);
  }
  return trunk;
}

function hideOffer(g: Game, id: QuestId): void {
  if (!g.quests.offered.delete(id)) return;
  g.layer.offer(id, null);
}

export function hideOffers(g: Game): void {
  for (const id of QUEST_IDS) {
    g.quests.offered.delete(id);
    g.layer.offer(id, null);
  }
}

const HEAD = new THREE.Vector3();
const WAIST = new THREE.Vector3();
/** From her head point to the top of her hair, a little under the crown's top. */
const HAIR_TOP_M = 0.24;

/**
 * Princess Emma on screen, from the top of her hair to her waist: what the afternoon's bubbles and gift cards keep
 * clear of (layer.keepClear). Null while she is off screen.
 */
export function herBox(g: Game): ScreenBox | null {
  const her = g.actors.princess;
  her.point('head', HEAD);
  HEAD.y += HAIR_TOP_M;
  const top = g.world.toScreen(HEAD);
  const low = g.world.toScreen(her.point('dress', WAIST));
  if (!top.visible || !low.visible) return null;
  const h = Math.max(24, low.y - top.y);
  const w = Math.max(24, h * 0.7);
  return { x: top.x - w / 2, y: top.y, w, h };
}

/** The free-play food basket: tap a food to hear it, drop it on any unicorn to feed it (with the munch). */
function showBasket(g: Game): void {
  const { actors, world } = g;
  g.layer.foodBasket({
    show: true,
    foods: foods(),
    drop: (item, x, y) => {
      const u = actors.herd.pick(world.ray(x, y));
      if (!u || u.mode === 'stall' || u.mode === 'carried') return false;
      void u.emote('munch');
      synth('munch');
      actors.fx.hearts(u.headTop().setY(u.headTop().y - 0.1));
      sayAside(CLIPS.yum[0]);
      console.info('[mmw free] fed', item.word, 'to', u.name);
      return true;
    },
  });
}

/** The first time she opens the basket: "Tap a food to hear its name. Then give it to a baby." */
function trayLineOnce(g: Game): void {
  const btn = g.layer.root.querySelector('.food-btn');
  if (!btn) return;
  const on = () => {
    btn.removeEventListener('pointerdown', on);
    if (g.part === 'free') setTimeout(() => void audio.sayAll(CLIPS.tray), 250);
  };
  btn.addEventListener('pointerdown', on);
  g.run.defer(() => btn.removeEventListener('pointerdown', on));
}

/**
 * The quest place she is at: the nearest within NEAR_M, offered or not, or null. The Corner's step and the picnic rug
 * are 1.9 m apart, so the nearest one counts.
 */
export function placeAt(here: Vec2): QuestId | null {
  let best: QuestId | null = null;
  let bestD = NEAR_M;
  for (const id of QUEST_IDS) {
    const d = dist2(here, PLACES[id]);
    if (d <= bestD) [best, bestD] = [id, d];
  }
  return best;
}

/**
 * One quest from the table: it runs and resolves framed; the gift picker runs in that frame (not after the Corner,
 * which has its own), then the release. A jump during it ends the run before the release (snapTo resets everything).
 */
export async function runQuest(g: Game, id: QuestId, run: (g: Game) => Promise<() => void> = RUN[id]): Promise<void> {
  const release = await run(g);
  if (id !== 'corner') await giveGift(g, id);
  release();
}

/** Part 11, free play: the afternoon with its side quests. */
export async function afternoon(g: Game): Promise<void> {
  const { layer, world } = g;
  const q = g.quests;
  g.free = true;
  if (g.options.quest) askQuest(g, g.options.quest);
  // The bubbles first, explained once a play: "When you see a bubble, someone is waiting for you." The basket and its
  // lines come after it, Lumi waits while it plays and a unicorn's name waits its turn. Only the turn line in portrait
  // can cut it, so it counts as said only when it played to its end; a cut one is said again once she is back in
  // landscape and the turn line is over, unless a bubble was tapped meanwhile.
  let basket = false;
  const basketOnce = () => {
    showBasket(g);
    if (!basket) trayLineOnce(g);
    basket = true;
  };
  if (!q.asked) {
    showOffers(g);
    while (q.offered.size && !q.explained && !q.asked) {
      q.explained = await g.run.w(audio.sayWhole(CLIPS.bubbles));
      if (!q.explained) await g.run.until(() => q.asked !== null || (innerWidth >= innerHeight && !audio.speaking));
    }
  }
  // A bubble tapped meanwhile starts its quest at once: no basket line, the basket shows after the quest.
  if (!q.asked) {
    await say(g, CLIPS.basket);
    basketOnce();
  }

  layer.keepClear(() => herBox(g));
  g.run.defer(() => layer.keepClear(null));
  // The afternoon's clocks, the walk-near trigger and the cutoff for new picnic and maths quests. Walking near starts
  // a quest when she comes to its place, not while she still stands where the last quest left her (after the Corner
  // she stands 1.9 m from the picnic rug).
  // `at` starts empty: she may have walked to a place while the opening lines played, and that counts as coming.
  let at: QuestId | null = null;
  const offClock = world.onFrame((dt) => {
    tickFree(g, dt * 1000, audio.speaking);
    if (!q.cut && pastCutoff(g)) {
      q.cut = true;
      if (!q.running) showOffers(g);
    }
    const now = placeAt(princessAt(g));
    const came = now !== at;
    at = now;
    if (q.running || q.asked || !came || !now || !q.offered.has(now)) return;
    askQuest(g, now);
  });
  g.run.defer(offClock);
  if (canQuest(g, 'rack')) hungryHerd(g);

  // After a quiet while without a touch: the slide, a follower, the basket, the bubbles, and Lumi's Corner line while
  // the trunk bubble shows, in turn.
  const prompts: (() => boolean)[] = [
    () => (void audio.sayAll(CLIPS.slideTap), true),
    () => (void audio.sayAll(CLIPS.follow), true),
    () => (void audio.sayAll(CLIPS.basket), true),
    () => q.offered.size > 0 && (void audio.sayAll(CLIPS.bubbles), true),
    () => q.offered.has('corner') && (void layer.lumi.speak(CLIPS.cornerOpen), true),
  ];
  let next = 0;
  let prompted = performance.now();
  const prompt = () => {
    const now = performance.now();
    if (now - Math.max(g.lastTouch, prompted) < FREE_PROMPT_MS || audio.speaking) return;
    for (let k = 0; k < prompts.length && !prompts[next++ % prompts.length](); k++);
    prompted = now;
  };

  for (;;) {
    // Free play waits for a quest or for its end by the clocks (freePlayOver). The free-play wait is the one skip()
    // ends (the flows skip the two minutes). A running quest is never skipped.
    if (freePlayOver(g) || !(await g.run.until(() => (prompt(), q.asked !== null || freePlayOver(g)), FREE_WAIT_MS))) break;
    if (q.asked === null) break;
    const id = q.asked;
    q.asked = null;
    hideOffers(g);
    layer.foodBasket({ show: false });
    q.running = id;
    try {
      await runQuest(g, id);
    } finally {
      q.running = null;
      q.dressing = false;
    }
    q.done.add(id);
    g.free = true;
    basketOnce();
    // The trunk bubble after her first finished quest: Lumi invites her once a play.
    if (showOffers(g) && !q.cornerSaid) {
      q.cornerSaid = true;
      await lumiSay(g, CLIPS.cornerOpen);
    }
    prompted = performance.now();
    if (freePlayOver(g)) break;
  }
  q.over = true;
  offClock();
  layer.keepClear(null);
  hideOffers(g);
  layer.foodBasket({ show: false });
  // This play's afternoon: the next play's maths quest comes from it (quest-kit.ts mathsQuestFor).
  const done = [...q.done];
  g.save.write((s) => void (s.afternoon = { maths: q.maths, done }));
}

// ---- the royal picnic (reading) -------------------------------------------------------------------------------------

/** A picnic guest's wish: the hamper basket, with "Read the wish. Then give it to your baby." as intro and goal. */
function guestWish(g: Game): WishSpec {
  const spec = planWish(g, 'picnic', 'picnic', { wish: false });
  return { ...spec, clips: { ...spec.clips, intro: ['g4-give'], goal: ['g4-give'] } };
}

async function picnicQuest(g: Game): Promise<() => void> {
  const { actors, layer, world } = g;
  g.free = false;
  const babies = guests(g, PICNIC.stand, 2);
  for (const u of babies) g.followers.remove(u);
  // Other followers wait beside the rug, off the cushions (the egg moments' spots would put them on the rug).
  parkFollowers(g, PICNIC.stand, PICNIC.aside);
  // The unicorns grazing by the gazebo step back behind the camera, as for the customiser.
  herdAside(g, true, { walk: true });
  // Both babies walk to their cushions while she walks to her spot; they sit there after 4 s at the latest, facing
  // the camera (the last small step is towards it).
  const seats = babies.map((u, k) => {
    const s = PICNIC.seats[k];
    return u.goTo([...world.route(flat(u.position), { x: s.x, z: s.z - 0.3 }), s]);
  });
  await walkThere(g, PICNIC.stand);
  await g.run.w(Promise.race([Promise.all(seats), new Promise((r) => setTimeout(r, SEAT_MS))]));
  babies.forEach((u, k) => {
    if (dist2(flat(u.position), PICNIC.seats[k]) > 0.5) u.place(PICNIC.seats[k], 0);
  });
  actors.princess.face({ x: PICNIC.rug.center.x, z: PICNIC.rug.center.z + 3 });
  const rug = PICNIC.rug.center;
  await frameAt(g, { x: rug.x + PICNIC_FRAME.east, z: rug.z }, PICNIC_FRAME.width, babies[0].headTop(), PICNIC_FRAME.frac, 1000, undefined, crownKeep(g));

  // Guest 1, then guest 2: two different targets from the picnic pool. Nothing is said first, by Lumi ("Who is
  // hungry?") or a guest ("I'm hungry!"): four of the 15 targets are dishes (mug, plate, mat, pan), and a food cue
  // would send her to the foods without reading (docs/v4/2.2.md 3.2).
  for (const [k, u] of babies.entries()) {
    const spec = guestWish(g);
    await preload(g, [...wishClipIds(spec), ...afterWish(spec)]);
    await runWish(g, u, spec, `picnic${k + 1}`, { frame: false });
    u.lookAt(null);
  }

  // The reward: stars fall on her head and leave a rose in her hair (for today only), a twirl and hearts.
  const head = actors.princess.position.clone().setY(1.6);
  const talk = layer.lumi.speak(CLIPS.picnicDone);
  await g.run.sleep(900);
  await g.run.w(actors.fx.starfall(head.clone().setZ(head.z + 0.35)));
  actors.princess.extra('rose');
  g.quests.rose = true;
  actors.fx.sparkle(head, { count: 18, colour: '#ff9ccc' });
  await g.run.w(actors.princess.emote('twirl'));
  actors.fx.hearts(head.clone().setY(1.9));
  await g.run.w(talk);
  return () => {
    world.releaseFrame();
    herdAside(g, false);
    followAgain(g, babies);
  };
}

// ---- the hungry herd at the hay rack (maths) -----------------------------------------------------------------------

/**
 * The rack's sum from its own stream, in the current band (the maths lane's rackSpec, docs/v4/2.2.md 4.3: a 'warm'
 * spec with skin 'hay' and the rack's clips); it is then used for this play.
 */
function planRack(g: Game): EggSpec {
  const spec = rackSpec(g.randFor('rack'), eggAsk(g));
  useSum(g.maths, spec);
  return spec;
}

/**
 * As free play starts, the three grazing herd unicorns nearest the rack go and wait at it; one says "I'm hungry!"
 * once, as an aside, when it gets there.
 */
function hungryHerd(g: Game): void {
  const { actors, world } = g;
  const grazing = g.herd
    .map((h) => actors.herd.get(h.id))
    .filter((u): u is UnicornActor => !!u && u.mode === 'graze' && u.followSlot === null)
    .sort((a, b) => dist2(flat(a.position), HAY_RACK.center) - dist2(flat(b.position), HAY_RACK.center))
    .slice(0, HAY_RACK.eat.length);
  const crier = Math.floor(g.randFor('rack-herd')() * grazing.length);
  g.quests.helpers = grazing.map((u) => u.id);
  grazing.forEach((u, k) => {
    void u.goTo(world.route(flat(u.position), HAY_RACK.eat[k])).then((there) => {
      if (!there) return;
      u.lookAt(HAY_RACK.center);
      if (k === crier && canQuest(g, 'rack')) {
        void u.emote('hop');
        sayAside(CLIPS.hungry[0]);
      }
    });
  });
}

/** The helpers still waiting at the rack. */
function rackHelpers(g: Game): UnicornActor[] {
  return g.quests.helpers
    .map((id) => g.actors.herd.get(id))
    .filter((u): u is UnicornActor => !!u && u.mode !== 'stall' && u.followSlot === null && dist2(flat(u.position), HAY_RACK.center) < 4);
}

async function rackQuest(g: Game): Promise<() => void> {
  const { actors, layer, world } = g;
  g.free = false;
  await walkThere(g, world.nearestWalkable(RACK_SIDE));
  // Half towards the rack, half towards the camera, as at the picnic.
  actors.princess.face({ x: HAY_RACK.center.x, z: HAY_RACK.center.z + 3 });
  const spec = planRack(g);
  await preload(g, eggClipIds(spec));
  const top = v3(HAY_RACK.center, RACK_FRAME.top);
  await frameAt(g, { x: HAY_RACK.center.x - RACK_FRAME.west, z: HAY_RACK.center.z }, RACK_FRAME.width, top, RACK_FRAME.frac);
  const helpers = rackHelpers(g);
  const eaters = () => [...rackHelpers(g), ...guests(g, HAY_RACK.center, 2)];
  let filled = false;
  const fill = () => {
    if (filled) return;
    filled = true;
    world.stable.hay(1, 1200);
    g.quests.hay = 1;
    for (const u of eaters()) {
      void u.emote('munch');
      actors.fx.hearts(u.headTop().setY(u.headTop().y - 0.1));
    }
  };
  const t = momentLog();
  const hooks: MomentHooks = {
    anchor: () => world.toScreen(top),
    react: (k) => {
      // Too many: the extra bundles tumble off while a helper munches them. Too few: the helpers look at the rack.
      // Right: the bundles land and the rack fills (the hay skin says 'munch', 'look' and 'right'; an egg panel would
      // say 'hot', 'cold' and 'warm').
      if (k === 'munch' || k === 'hot') void helpers[0]?.emote('munch');
      else if (k === 'look' || k === 'cold') for (const u of helpers) void u.emote('look');
      else if (k === 'right' || k === 'warm') fill();
    },
    log: t.log,
  };
  g.openSpec = spec;
  const r = await checked(g, layer.egg(spec, hooks));
  g.openSpec = null;
  noteMaths(g, 'rack', spec, r, t);
  fill();
  await g.run.sleep(MUNCH_MS);
  return () => {
    world.releaseFrame();
    // The helpers go back to grazing at home; the rack stays full for the day.
    for (const u of rackHelpers(g)) {
      const i = g.herd.findIndex((h) => h.id === u.id);
      u.lookAt(null);
      if (i >= 0) u.graze(GRAZE_HOMES[i]);
    }
    g.quests.helpers = [];
    g.free = true;
  };
}
