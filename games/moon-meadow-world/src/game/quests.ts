// The gift quests (docs/v4/2.2.md section 5, 2.3.md sections 5 and 17): the royal picnic, the hay rack, and what they
// share with the bead tree (beads.ts) and the Dressing Corner (corner.ts): the badges, the food basket, her box on
// screen that bubbles keep clear of, the hay rack's helpers and running a quest with its gift. 2.4.0: the hub
// (hub-part.ts) took over free play: its bubbles, place taps, prompts and clocks are there, and each quest is one of
// its places (hub-part.ts RUN).
//
// Every quest resolves still framed with a release function: the gift picker runs in that frame, then the release.
import type { EggSpec, MomentHooks, ScreenBox, Vec2, WishSpec } from '../contracts';
import * as THREE from 'three';
import type { UnicornActor } from '../actors';
import { GRAZE_HOMES, HAY_RACK, PICNIC, dist2 } from '../layout';
import { giftSetFor, stillToEarn } from '../wardrobe';
import { giftSwatchUrl } from '../ui/swatches';
import { audio } from '../audio';
import { CLIPS, eggClipIds, foods, rackSpec, wishClipIds } from '../content';
import { type Game, checked, flat, frameAt, preload, sayAside, synth, v3 } from './game';
import { afterWish, crownKeep, momentLog, parkFollowers, planWish, runWish } from './moments';
import { eggAsk, noteMaths } from './maths';
import { useSum } from './band';
import { herdAside } from './wardrobe-part';
import { giveGift, walkThere } from './quest-kit';
import { followAgain, guests } from './guests';
import { beadsQuest } from './beads';
import { cornerQuest } from './corner';
import { HUB_PLACES, QUEST_IDS, type QuestId } from './options';

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

/**
 * Each quest's moment (2.3 section 17.2). It walks, frames and runs its moments, and resolves while the camera is
 * still framed and its guests, the followers and the herd are still aside, with the function that lets them go. The
 * hub runs the gift picker in that frame, then calls it (the Corner runs its own picker, after its gate).
 */
const QUEST_RUN: Record<QuestId, (g: Game) => Promise<() => void>> = {
  picnic: (g) => picnicQuest(g),
  rack: (g) => rackQuest(g),
  beads: (g) => beadsQuest(g),
  corner: (g) => cornerQuest(g),
};

/**
 * The quests this play offers: the royal picnic, this play's maths quest (the hay rack or the bead tree) and the
 * Dressing Corner (moments.ts secondWishKind reads it).
 */
export function playQuests(g: Game): QuestId[] {
  return QUEST_IDS.filter((id) => id === 'picnic' || id === 'corner' || id === g.quests.maths);
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

/** Take every hub bubble off the screen (bedtime, a jump). The hub shows them again from its own state. */
export function hideOffers(g: Game): void {
  g.quests.offered.clear();
  for (const id of HUB_PLACES) g.layer.offer(id, null);
}

const HEAD = new THREE.Vector3();
const WAIST = new THREE.Vector3();
/** From her head point to the top of her hair, a little under the crown's top. */
const HAIR_TOP_M = 0.24;

/**
 * Princess Emma on screen, from the top of her hair to her waist: what the hub's bubbles and gift cards keep clear of
 * (layer.keepClear). Null while she is off screen.
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

/** The hub's food basket: tap a food to hear it, drop it on any unicorn to feed it (with the munch). */
export function showBasket(g: Game): void {
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
      console.info('[mmw hub] fed', item.word, 'to', u.name);
      return true;
    },
  });
}

/** The first time she opens the basket: "Tap a food to hear its name. Then give it to a baby." */
export function trayLineOnce(g: Game): void {
  const btn = g.layer.root.querySelector('.food-btn');
  if (!btn) return;
  const on = () => {
    btn.removeEventListener('pointerdown', on);
    if (g.part === 'hub') setTimeout(() => void audio.sayAll(CLIPS.tray), 250);
  };
  btn.addEventListener('pointerdown', on);
  g.run.defer(() => btn.removeEventListener('pointerdown', on));
}

/**
 * One quest: it runs and resolves framed; the gift picker runs in that frame (not after the Corner, which has its
 * own), then the release. A jump during it ends the run before the release (snapTo resets everything).
 */
export async function runQuest(g: Game, id: QuestId, run: (g: Game) => Promise<() => void> = QUEST_RUN[id]): Promise<void> {
  const release = await run(g);
  if (id !== 'corner') await giveGift(g, id);
  release();
}

// ---- the royal picnic (reading) -------------------------------------------------------------------------------------

/** A picnic guest's wish: the hamper basket, with "Read the wish. Then give it to your baby." as intro and goal. */
function guestWish(g: Game): WishSpec {
  const spec = planWish(g, 'picnic', 'picnic', { wish: false });
  return { ...spec, clips: { ...spec.clips, intro: ['g4-give'], goal: ['g4-give'] } };
}

export async function picnicQuest(g: Game): Promise<() => void> {
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
 * When the hay rack's bubble shows (2.4.0: not for the whole hub), the three grazing herd unicorns nearest the rack go
 * and wait at it; one says "I'm hungry!" once, as an aside, when it gets there.
 */
export function hungryHerd(g: Game): void {
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
      if (k === crier && g.hub.shown.includes('rack') && !g.hub.running) {
        void u.emote('hop');
        sayAside(CLIPS.hungry[0]);
      }
    });
  });
}

/** The hay rack's bubble has gone without its quest: the helpers go back to graze at home (2.4 section 5.2). */
export function helpersHome(g: Game): void {
  for (const id of g.quests.helpers) {
    const u = g.actors.herd.get(id);
    const i = g.herd.findIndex((h) => h.id === id);
    if (!u || u.mode === 'stall' || u.followSlot !== null || i < 0) continue;
    u.lookAt(null);
    u.graze(GRAZE_HOMES[i]);
  }
  g.quests.helpers = [];
}

/** The helpers still waiting at the rack. */
function rackHelpers(g: Game): UnicornActor[] {
  return g.quests.helpers
    .map((id) => g.actors.herd.get(id))
    .filter((u): u is UnicornActor => !!u && u.mode !== 'stall' && u.followSlot === null && dist2(flat(u.position), HAY_RACK.center) < 4);
}

export async function rackQuest(g: Game): Promise<() => void> {
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
