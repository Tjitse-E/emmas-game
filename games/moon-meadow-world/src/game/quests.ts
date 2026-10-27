// The afternoon (docs/v4/2.2.md section 5): free play with two optional side quests. It starts as before, with the
// basket line and the food basket. A second later two offer bubbles appear: a picnic over the rug by the gazebo and a
// hay bundle over the hay rack by the stable. A bubble tap, a tap on the place or walking within 2.5 m of it starts
// that quest; free play itself is never checked, and a skipped quest costs nothing.
//
// Time: free play ends after two minutes without a quest running (a quest pauses the clock), once no quest runs. No
// quest starts later than three minutes after free play began, and a running quest always finishes. Both quests need
// her two named babies. The bubbles hide while a quest runs, once it is done, after three minutes and at bedtime.
import type { EggSpec, MomentHooks, Vec2, WishSpec } from '../contracts';
import type { UnicornActor } from '../actors';
import { GRAZE_HOMES, HAY_RACK, PICNIC, PLACES, dist2 } from '../layout';
import { audio } from '../audio';
import { v3Art, wordPic } from '../assets';
import { CLIPS, eggClipIds, foods, rackSpec, wishClipIds } from '../content';
import { type Game, flat, frameAt, lumiSay, preload, princessAt, say, sayAside, v3, walkTo } from './game';
import { afterWish, crownKeep, eggAsk, momentLog, noteMaths, parkFollowers, planWish, reactOf, runWish } from './moments';
import { useSum } from './band';
import { herdAside } from './wardrobe-part';
import type { QuestId } from './options';

const QUESTS: readonly QuestId[] = ['picnic', 'rack'];
/** Free play's own time, not counting quests. */
export const FREE_PLAY_MS = 120_000;
/** No quest starts this long after free play began. */
export const QUEST_CUTOFF_MS = 180_000;
/** A quiet while without a touch brings the next suggestion. */
const FREE_PROMPT_MS = 30_000;
const BUBBLES_AFTER_MS = 1000;
/** Walking this near a quest's place starts it. */
const NEAR_M = 2.5;
/** The longest walk to a quest's spot; after that she is there at once. */
const WALK_MS = 12_000;
/** The picnic guests sit down on their cushions after this long at the latest. */
const SEAT_MS = 4000;
/** The picnic frame: the rug's centre a little east, 5.5 m across, the babies' head tops at 45%. */
const PICNIC_FRAME = { east: 0.6, width: 5.5, frac: 0.45 };
/** The hay rack frame: the rack, 6 m across, its top high on the screen above the egg panel. */
const RACK_FRAME = { width: 6, top: 1.5, frac: 0.28 };
/** After a full rack, the herd and her babies munch with hearts this long before going home. */
const MUNCH_MS = 3000;

/** The bubble pictures (v3 art) and where each bubble floats. */
const OFFER: Record<QuestId, { pic: () => string; at: { x: number; y: number; z: number } }> = {
  picnic: { pic: () => wordPic('picnic'), at: { x: PICNIC.rug.center.x, y: 1.3, z: PICNIC.rug.center.z } },
  rack: { pic: () => v3Art('items/item-hay-bundle.webp'), at: { x: HAY_RACK.center.x, y: 2.3, z: HAY_RACK.center.z } },
};

const bothNamed = (g: Game): boolean => !!g.babies[0]?.member && !!g.babies[1]?.member;

/** May this quest start now? */
export function canQuest(g: Game, id: QuestId): boolean {
  const q = g.quests;
  return g.part === 'free' && !g.bedtime && bothNamed(g) && !q.done.has(id) && !q.running && q.wallMs < QUEST_CUTOFF_MS;
}

/** Start a quest at the afternoon's next frame (a bubble tap, a tap on its place, walking near). False when it cannot. */
export function askQuest(g: Game, id: QuestId): boolean {
  if (g.quests.asked || !canQuest(g, id)) return false;
  g.quests.asked = id;
  return true;
}

/** Show the bubble of every quest that can start, hide the others. The first bubbles of a play are explained once. */
function showOffers(g: Game): void {
  const q = g.quests;
  for (const id of QUESTS) {
    if (canQuest(g, id)) {
      if (q.offered.has(id)) continue;
      q.offered.add(id);
      const p = v3({ x: OFFER[id].at.x, z: OFFER[id].at.z }, OFFER[id].at.y);
      g.layer.offer(id, { pic: OFFER[id].pic(), at: () => g.world.toScreen(p), onTap: () => void askQuest(g, id) });
    } else hideOffer(g, id);
  }
  if (q.offered.size && !q.explained) {
    q.explained = true;
    sayAside(CLIPS.bubbles[0]);
  }
}

function hideOffer(g: Game, id: QuestId): void {
  g.quests.offered.delete(id);
  g.layer.offer(id, null);
}

export function hideOffers(g: Game): void {
  for (const id of QUESTS) hideOffer(g, id);
}

/** The free-play food basket: tap a food to hear it, drop it on any unicorn to feed it. */
function showBasket(g: Game): void {
  const { actors, world } = g;
  g.layer.foodBasket({
    show: true,
    foods: foods(),
    drop: (item, x, y) => {
      const u = actors.herd.pick(world.ray(x, y));
      if (!u || u.mode === 'stall' || u.mode === 'carried') return false;
      void u.emote('munch');
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

/** Part 11, free play: the afternoon with its two side quests. */
export async function afternoon(g: Game): Promise<void> {
  const { layer, world } = g;
  const q = g.quests;
  g.free = true;
  await say(g, CLIPS.basket);
  showBasket(g);
  trayLineOnce(g);

  // The afternoon's clocks, the walk-near trigger and the three-minute cut-off for new quests.
  const offClock = world.onFrame((dt) => {
    q.wallMs += dt * 1000;
    if (!q.running) q.freeMs += dt * 1000;
    if (q.offered.size && q.wallMs >= QUEST_CUTOFF_MS) hideOffers(g);
    if (q.running || q.asked) return;
    const here = princessAt(g);
    for (const id of q.offered) {
      if (dist2(here, PLACES[id]) <= NEAR_M && askQuest(g, id)) break;
    }
  });
  g.run.defer(offClock);
  if (canQuest(g, 'rack')) hungryHerd(g);
  const bubbles = setTimeout(() => g.part === 'free' && !q.running && showOffers(g), BUBBLES_AFTER_MS);
  g.run.defer(() => clearTimeout(bubbles));
  if (g.options.quest) askQuest(g, g.options.quest);

  // After a quiet while without a touch: the slide, a follower, the basket or the bubbles, in turn.
  const prompts = [CLIPS.slideTap, CLIPS.follow, CLIPS.basket, CLIPS.bubbles];
  let next = 0;
  let prompted = performance.now();
  const prompt = () => {
    const now = performance.now();
    if (now - Math.max(g.lastTouch, prompted) < FREE_PROMPT_MS || audio.speaking) return;
    let ids = prompts[next++ % prompts.length];
    if (ids === CLIPS.bubbles && !q.offered.size) ids = prompts[next++ % prompts.length];
    void audio.sayAll(ids);
    prompted = now;
  };

  for (;;) {
    const left = FREE_PLAY_MS - q.freeMs;
    // The free-play wait is the one skip() ends (the flows skip the two minutes).
    if (left <= 0 || !(await g.run.until(() => (prompt(), q.asked !== null), left))) break;
    const id = q.asked!;
    q.asked = null;
    clearTimeout(bubbles);
    hideOffers(g);
    layer.foodBasket({ show: false });
    q.running = id;
    try {
      await (id === 'picnic' ? picnicQuest(g) : rackQuest(g));
    } finally {
      q.running = null;
    }
    q.done.add(id);
    g.free = true;
    showBasket(g);
    showOffers(g);
    prompted = performance.now();
  }
  clearTimeout(bubbles);
  offClock();
  hideOffers(g);
  layer.foodBasket({ show: false });
}

/** She walks to a quest's spot; a long way (or a slide still going) ends with her there at once. */
async function walkThere(g: Game, to: Vec2): Promise<void> {
  const her = g.actors.princess;
  await g.run.until(() => ['idle', 'walk', 'run'].includes(her.mode), 15_000);
  await g.run.w(Promise.race([walkTo(g, to), new Promise((r) => setTimeout(r, WALK_MS))]));
  if (dist2(princessAt(g), to) > 0.6) g.actors.placePrincess(to, 0);
}

/** Her babies as quest guests and helpers: they stop following until the quest is over. */
function guests(g: Game): UnicornActor[] {
  return g.babies.slice(0, 2).map((b) => b.unicorn);
}

function followAgain(g: Game, babies: UnicornActor[]): void {
  for (const p of g.parked.splice(0)) g.followers.add(p);
  babies.forEach((u, k) => g.followers.add(u, k === 0));
}

// ---- the royal picnic (reading) -------------------------------------------------------------------------------------

/** A picnic guest's wish: the hamper basket, with "Read the wish. Then give it to your baby." as intro and goal. */
function guestWish(g: Game): WishSpec {
  const spec = planWish(g, 'picnic', 'picnic', { wish: false });
  return { ...spec, clips: { ...spec.clips, intro: ['g4-give'], goal: ['g4-give'] } };
}

async function picnicQuest(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = false;
  const babies = guests(g);
  for (const u of babies) g.followers.remove(u);
  parkFollowers(g, PICNIC.stand);
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
  await lumiSay(g, CLIPS.picnic);

  // Guest 1, then guest 2: two different targets from the picnic pool.
  for (const [k, u] of babies.entries()) {
    const spec = guestWish(g);
    await preload(g, [...wishClipIds(spec), ...afterWish(spec), ...CLIPS.hungry]);
    if (reactOf(spec.target, spec.kind) === 'munch') await say(g, CLIPS.hungry);
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
  world.releaseFrame();
  herdAside(g, false);
  followAgain(g, babies);
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

async function rackQuest(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = false;
  await walkThere(g, HAY_RACK.stand);
  actors.princess.face(HAY_RACK.center);
  const spec = planRack(g);
  await preload(g, eggClipIds(spec));
  const top = v3(HAY_RACK.center, RACK_FRAME.top);
  await frameAt(g, HAY_RACK.center, RACK_FRAME.width, top, RACK_FRAME.frac);
  const helpers = rackHelpers(g);
  const eaters = () => [...rackHelpers(g), ...guests(g)];
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
  const r = await g.run.w(layer.egg(spec, hooks));
  g.openSpec = null;
  noteMaths(g, 'rack', spec, r, t);
  fill();
  await g.run.sleep(MUNCH_MS);
  world.releaseFrame();
  // The helpers go back to grazing at home; the rack stays full for the day.
  for (const u of rackHelpers(g)) {
    const i = g.herd.findIndex((h) => h.id === u.id);
    u.lookAt(null);
    if (i >= 0) u.graze(GRAZE_HOMES[i]);
  }
  g.quests.helpers = [];
  g.free = true;
}
