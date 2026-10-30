// The level script: "Emma's first day in Moon Meadow" (docs/v4/demo.md section 1, docs/v4/2.2.md). Each part is an
// async step on the current Run; jump(part) stops the run, snaps the world into that part's state and starts from
// there. 2.2.0 adds the customiser before the welcome (wardrobe-part.ts), the dress-up, pond and picnic wishes, and
// the afternoon's side quests (quests.ts); the shared moment code is in moments.ts. 2.3.0 adds the effects of the
// welcome crown, the bedtime bell and the goodnight owl (each line waits for its effect, at most 1 s) and one kind=play
// line per play before the end screen.
//
// 2.4.0 step 0 (docs/v4/2.4-plan.md Task 0): the naming and the wishes moved to eggs-part.ts, bedtime and goodnight to
// bedtime.ts and the play line to report.ts, unchanged; a play starts where resolveStart says (options.ts), and a jump
// honours ?babies= and ?bed=. The parts stay 2.3.3's until the hub lane's wardrobe, welcome, hub, bedtime, goodnight.
import type { Vec2 } from '../contracts';
import { GRAZE_HOMES, NEST, SLIDE, STABLE, STABLE_FRAME, START, WILD_EGG, dist2 } from '../layout';
import { audio } from '../audio';
import { CLIPS, allGraphemes, wishClipIds } from '../content';
import {
  type Game, type Part, GOALS, PARTS, faceBeside, flat, frameAt, isPart, lumiSay, preload, princessAt, say, sayWay, setGoal,
  setTime, startClock, startQuests, v3, waitToReach, walkTo,
} from './game';
import { Run, Cancelled } from './run';
import { startMaths } from './band';
import { afterWish, parkFollowers, planWish, runWish } from './moments';
import { type EggSpot, HATCH_SPOT, NEST_EGG, SIDE, WILD_EGG_AT, bathSwim, egg, naming, snapBabies, wish } from './eggs-part';
import { herdAside, wardrobe, wardrobePartClipIds } from './wardrobe-part';
import { hideOffers } from './quests';
import { hub } from './hub-part';
import { bedtime, goodnight } from './bedtime';
import { BEDTIME_MS, startHub } from './hub';
import type { StartAt } from './options';

/** Width of ground across the screen for each framing. */
const CROWN_WIDTH = 6;
const WILD_EGG_WIDTH = 9;
const INTRO_MS = 3500;
/** The pond: the tap line after 12 s without a slide, the slide line once more 20 s later, the egg comes at 45 s. */
const POND_TAP_MS = 12_000;
const POND_AGAIN_MS = 20_000;
const POND_WAIT_MS = 45_000;
/** Play after the first slide before the bath wish at the pond. */
const POND_PLAY_MS = 8000;
/** Where she and her baby stand for the bath wish at the pond: on the shore with the water behind them. */
const POND_WISH: { her: Vec2; baby: Vec2 }[] = [
  { her: { x: 3.4, z: 7.4 }, baby: { x: 5.1, z: 8.1 } },
  { her: { x: 8.6, z: 9.6 }, baby: { x: 10.3, z: 10.0 } },
];
/** The longest walk to those spots. */
const POND_WISH_MS = 12_000;

/** The level's clips said at any time, preloaded at the start with the herd's names. */
export function startClipIds(g: Game): string[] {
  const ids: string[] = [];
  for (const v of Object.values(CLIPS)) {
    if (Array.isArray(v)) ids.push(...v);
    else if (typeof v === 'object') ids.push(...Object.values(v).flat());
  }
  ids.push(...CLIPS.herdCount(14), ...g.herd.map((h) => h.clip));
  return [...new Set(ids)];
}

/** Her feet are on the grass (not climbing, sliding or swimming). */
const onLand = (g: Game): boolean => ['idle', 'walk', 'run'].includes(g.actors.princess.mode);

// ---- the parts -------------------------------------------------------------------------------------------------

async function welcome(g: Game): Promise<void> {
  // The long welcome until Lumi has given the crown: a first play left before the crown would else never save it.
  if (g.save.data.plays >= 2 && g.save.data.seen.crown) return welcomeBack(g);
  const { actors, layer, world } = g;
  // She may walk and call unicorns while Lumi talks; taps never cut Lumi (names wait their turn).
  g.free = true;
  layer.lumi.show(true);
  await lumiSay(g, CLIPS.welcome);
  // The crown: she stops and turns to the camera, which comes close, so the crown and the clap are seen.
  g.free = false;
  await g.run.until(() => onLand(g), 8000);
  if (actors.princess.mode === 'walk' || actors.princess.mode === 'run') actors.princess.stop();
  const p = princessAt(g);
  actors.princess.face({ x: p.x, z: p.z + 6 });
  await frameAt(g, p, CROWN_WIDTH, actors.princess.position.clone().setY(1.2), 0.42, 1000);
  const head = actors.princess.position.clone().setY(1.6);
  // The stars fall and the crown appears with its twinkle, before Lumi's line (2.3 section 20: a line waits for an
  // effect, at most 1 s).
  await g.run.w(actors.fx.starfall(head));
  actors.princess.crown(true);
  // From now on the wardrobe has its crown tab (2.3 section 16). Saved as it appears, so leaving during Lumi's line
  // keeps it.
  g.save.write((s) => void (s.seen.crown = true));
  actors.fx.sparkle(head, { count: 16 });
  await g.run.w(audio.fx('crown-twinkle'));
  await lumiSay(g, CLIPS.crown);
  await g.run.w(actors.princess.emote('clap'));
  world.releaseFrame();
  actors.egg.place(NEST_EGG, 'warm');
  actors.fx.sparkle(NEST_EGG.clone().setY(1), { count: 18 });
  world.nestGlow(true);
  setGoal(g, GOALS.nest);
  g.free = true;
  await say(g, CLIPS.eggWaiting);
  // The ghost hand taps the grass between her and the nest (not the nest: that is the goal).
  const q = princessAt(g);
  const grass = v3({ x: (q.x + NEST.stand.x) / 2, z: (q.z + NEST.stand.z) / 2 + 0.6 });
  void layer.ghost.tap(() => world.toScreen(grass));
  await say(g, CLIPS.walk);
}

/**
 * From the second play on the welcome is short: "Hello, Emma!", the crown appears at once with a sparkle, then "An
 * egg is waiting." (no crown close-up, ghost tap or walk line; about 35 s less).
 */
async function welcomeBack(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = true;
  layer.lumi.show(true);
  await lumiSay(g, CLIPS.helloBack);
  const head = actors.princess.position.clone().setY(1.6);
  actors.princess.crown(true);
  actors.fx.sparkle(head, { count: 16 });
  await g.run.w(audio.fx('crown-twinkle'));
  actors.egg.place(NEST_EGG, 'warm');
  actors.fx.sparkle(NEST_EGG.clone().setY(1), { count: 18 });
  world.nestGlow(true);
  setGoal(g, GOALS.nest);
  await say(g, CLIPS.eggWaiting);
}

/** The first baby's bath wish at the pond, after the first slide: they stand on the shore, facing the camera. */
async function pondWish(g: Game): Promise<void> {
  const { actors, world } = g;
  const baby = g.babies[0];
  if (!baby?.member) return;
  const u = baby.unicorn;
  g.free = false;
  // A slide ends with a swim to the shore: she climbs out, and the baby is off the slide, first.
  await g.run.until(() => onLand(g) && u.mode !== 'slide', 15_000);
  const spec = planWish(g, 'bath', 'pond', { wish: true });
  await preload(g, [...wishClipIds(spec), ...afterWish(spec)]);
  // The nearer shore spot; a swimming baby climbs out at once when it is called.
  const here = princessAt(g);
  const stand = POND_WISH.reduce((a, b) => (dist2(here, a.her) <= dist2(here, b.her) ? a : b));
  g.followers.remove(u);
  parkFollowers(g, stand.her);
  const her = walkTo(g, stand.her);
  const babyRoute = [...world.route(flat(u.position), stand.baby), { x: stand.baby.x, z: stand.baby.z + 0.25 }];
  const walks = Promise.all([her, u.goTo(babyRoute)]);
  await g.run.w(Promise.race([walks, new Promise((r) => setTimeout(r, POND_WISH_MS))]));
  // Still on the way (a long swim to the shore): they appear at their spots, so the frame shows them.
  if (dist2(princessAt(g), stand.her) > 0.6) actors.placePrincess(stand.her, 0);
  if (dist2(flat(u.position), stand.baby) > 0.8) u.place({ x: stand.baby.x, z: stand.baby.z + 0.25 }, 0);
  u.lookAt(stand.her);
  actors.princess.face(flat(u.position));
  await runWish(g, u, spec, 'pond');
  bathSwim(u);
  for (const p of g.parked.splice(0)) g.followers.add(p);
  g.followers.add(u, true);
}

async function pond(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = true;
  g.slid = false;
  setGoal(g, GOALS.pond);
  await say(g, CLIPS.pond);
  await say(g, CLIPS.follow);
  await waitToReach(g, GOALS.pond);
  setGoal(g, null);
  // The ghost hand drags a follower to the top of the slide once.
  const shown = g.followers.list[0] ?? g.babies[0]?.unicorn;
  const demo = shown ? layer.ghost.drag(() => world.toScreen(shown.headTop()), () => world.toScreen(SLIDE.top)) : Promise.resolve();
  await say(g, CLIPS.slideDrag);
  await g.run.w(demo);
  const riding = () => actors.princess.mode === 'slide' || actors.princess.mode === 'climb';
  // Waiting for the first slide: the tap line, then the slide line once more, and the egg comes anyway at 45 s.
  if (!(await g.run.until(() => g.slid, POND_TAP_MS))) {
    if (!riding()) await say(g, CLIPS.slideTap);
    if (!(await g.run.until(() => g.slid, POND_AGAIN_MS))) {
      if (!riding()) await say(g, CLIPS.slideTap);
      await g.run.until(() => g.slid, POND_WAIT_MS - POND_TAP_MS - POND_AGAIN_MS);
    }
  }
  // A little more play (she may slide down too) before the bath wish.
  await g.run.sleep(POND_PLAY_MS);
  await pondWish(g);
  await wildEggArrives(g);
}

async function wildEggArrives(g: Game): Promise<void> {
  const { actors, world } = g;
  g.free = false;
  // The camera frames the egg's landing spot and stays until Lumi has spoken.
  const beam = actors.fx.moonbeam(WILD_EGG_AT, 3600);
  await frameAt(g, WILD_EGG.at, WILD_EGG_WIDTH, WILD_EGG_AT, 0.5, 1100);
  const talk = g.layer.lumi.speak(CLIPS.anotherEgg);
  await g.run.sleep(500);
  actors.egg.place(WILD_EGG_AT, 'snow');
  actors.fx.sparkle(WILD_EGG_AT.clone().setY(0.8), { count: 24, colour: '#cfe8ff' });
  void actors.fx.starfall(WILD_EGG_AT.clone().setY(0.6));
  await g.run.w(talk);
  await g.run.w(beam);
  await g.run.sleep(700);
  world.releaseFrame();
  setGoal(g, GOALS.wildEgg);
  g.free = true;
}

/** Notice the first slide by anyone: a unicorn that goes from the slide into the water, or Princess Emma sliding. */
export function installSlideWatch(g: Game): void {
  const was = new Map<string, string>();
  g.world.onFrame(() => {
    if (g.actors.princess.mode === 'slide') g.slid = true;
    for (const u of g.actors.herd.all()) {
      const m = u.mode;
      if (m === 'swim' && was.get(u.id) === 'slide') g.slid = true;
      was.set(u.id, m);
    }
  });
}

/** The "this way" helper runs on every frame and watches progress towards the current goal. */
export function installWayHelper(g: Game): void {
  let best = Infinity;
  let goalRef: object | null = null;
  let quiet = 0;
  let wait = 20_000;
  g.world.onFrame((dt) => {
    const goal = g.goal;
    if (!goal || !g.free || g.door || g.layer.snapshot().moment) {
      goalRef = goal;
      quiet = 0;
      best = Infinity;
      return;
    }
    if (goal !== goalRef) {
      goalRef = goal;
      best = Infinity;
      quiet = 0;
      wait = 20_000;
    }
    const d = dist2(princessAt(g), goal.stand);
    if (d < best - 0.5) {
      best = d;
      quiet = 0;
      return;
    }
    quiet += dt * 1000;
    if (quiet >= wait && !audio.speaking) {
      sayWay(g);
      quiet = 0;
      wait = 30_000;
    }
  });
}

// ---- running and jumping -----------------------------------------------------------------------------------------

const STEPS: Record<Part, (g: Game) => Promise<void>> = {
  wardrobe,
  welcome,
  egg1: (g) => egg(g, 0),
  naming1: (g) => naming(g, 0),
  wish1: (g) => wish(g, 0),
  pond,
  egg2: (g) => egg(g, 1),
  naming2: (g) => naming(g, 1),
  wish2: (g) => wish(g, 1),
  hub,
  bedtime,
  goodnight,
};

/** Play the level from `from` to the end on a fresh run. */
export function playFrom(g: Game, from: Part): void {
  g.run.stop();
  const run = new Run((fn) => g.world.onFrame(fn));
  g.run = run;
  void (async () => {
    try {
      for (const part of PARTS.slice(PARTS.indexOf(from))) {
        if (!run.alive) return;
        g.part = part;
        await STEPS[part](g);
      }
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error('[mmw level]', e);
    }
  })();
}

/** Put the world into the state of the start of `part`, at once. */
export function snapTo(g: Game, part: Part): void {
  const { actors, layer, world } = g;
  const k = PARTS.indexOf(part);
  const after = (p: Part) => k > PARTS.indexOf(p);
  g.run.stop();
  layer.reset();
  audio.stop();
  g.streams.reset();
  g.maths = startMaths(g.options.band);
  g.today = { wishes: 0, words: [] };
  g.clock = startClock();
  g.quests = startQuests(g.quests.maths);
  // 2.4.0: a new hub (with ?bed=, its bedtime), no trip, no waiting wish, no sign set used.
  g.hub = startHub(g.options.bedMs ?? BEDTIME_MS);
  g.ride = null;
  g.waiting = null;
  g.signUse = { sets: [], targets: [] };
  g.openSpec = null;
  g.door = null;
  g.free = false;
  g.bedtime = part === 'bedtime' || part === 'goodnight';
  g.slid = false;
  g.entering.clear();
  setGoal(g, null);
  g.followers.clear();
  g.parked = [];
  g.stalls.clear();
  world.setPaused(false);
  world.releaseFrame();
  world.nestGlow(false);
  world.stable.glow(null);
  world.stable.glowRow(null);
  for (let d = 1; d <= 20; d++) void world.stable.close(d);
  void setTime(g, part === 'goodnight' ? 0.5 : 0, 0);
  world.stable.lanterns(part === 'goodnight');
  world.stable.hay(0, 0);
  void world.corner.lid(false, 0);
  audio.ambience(part === 'bedtime' || part === 'goodnight' ? 'night' : 'day');
  hideOffers(g);
  layer.lumi.show(part !== 'welcome' && part !== 'wardrobe');
  // Her saved look (the customiser starts from it too); the picnic rose is for one day only.
  actors.princess.setLook(g.save.data.look);
  actors.princess.extra(null);
  actors.princess.crown(part !== 'welcome' && part !== 'wardrobe');

  // The egg of this part.
  actors.egg.hide();
  if (part === 'egg1') actors.egg.place(NEST_EGG, 'warm');
  if (part === 'egg2') actors.egg.place(WILD_EGG_AT, 'snow');
  if (part === 'egg1') world.nestGlow(true);

  // Princess Emma.
  const where: Record<Part, [Vec2, number]> = {
    wardrobe: [START, 0],
    welcome: [START, 0],
    egg1: [SIDE[0], Math.PI / 2],
    naming1: [SIDE[0], Math.PI / 2],
    wish1: [SIDE[0], Math.PI / 2],
    pond: [NEST.stand, Math.PI / 2],
    egg2: [SIDE[1], Math.PI / 2],
    naming2: [SIDE[1], Math.PI / 2],
    wish2: [SIDE[1], Math.PI / 2],
    hub: [{ x: SLIDE.ladderBase.x - 1.5, z: SLIDE.ladderBase.z + 2.5 }, 0],
    bedtime: [{ x: 1, z: -2 }, Math.PI],
    goodnight: [STABLE.emmaStand, Math.PI],
  };
  const [at, heading] = where[part];
  actors.placePrincess(at, heading);
  if (part === 'egg1' || part === 'naming1') faceBeside(g, NEST.center);
  if (part === 'egg2' || part === 'naming2') faceBeside(g, WILD_EGG.at);

  // The herd grazes, or sleeps in its stalls at goodnight.
  g.herd.forEach((h, i) => {
    const u = actors.herd.get(h.id);
    if (!u) return;
    u.nightcap(false);
    u.showToy(null);
    if (part === 'goodnight') {
      u.putInStall(h.door, true);
      g.stalls.set(h.door, u);
    } else {
      u.place(GRAZE_HOMES[i]);
      u.followSlot = null;
      u.graze(GRAZE_HOMES[i]);
    }
  });
  if (part === 'wardrobe') herdAside(g, true);

  // The newborns: those of the parts before this one, or with ?babies=n that many named ones (2.4.0: the nest's, the
  // shore's and two of the trail's, in that hatch order).
  for (let d = 13; d <= 16; d++) actors.herd.remove(`baby-${d}`);
  g.babies = [];
  if (g.options.babies !== null) {
    const spots: EggSpot[] = ['nest', 'shore', 'trail', 'trail'];
    snapBabies(g, spots.slice(0, g.options.babies), { x: at.x + 1.7, z: at.z + 1.3 }, true);
  } else {
    if (after('egg1')) snapBabies(g, ['nest'], part === 'naming1' ? HATCH_SPOT[13] : { x: at.x + 1.7, z: at.z + 1.3 }, after('naming1'));
    if (after('egg2')) snapBabies(g, ['shore'], part === 'naming2' ? HATCH_SPOT[14] : { x: at.x - 0.9, z: at.z + 1.4 }, after('naming2'));
  }
  for (const b of g.babies) {
    if (part === 'goodnight') {
      b.unicorn.putInStall(b.door, true);
      g.stalls.set(b.door, b.unicorn);
    }
  }
  const followNow = g.babies.filter((b, i) => b.member && part !== 'goodnight' && !(part === 'wish1' && i === 0) && !(part === 'wish2' && i === 1));
  g.followers.set(followNow.map((b) => b.unicorn));

  // The camera: on the part's spot at once.
  if (part === 'goodnight') void world.frame(STABLE_FRAME.center, STABLE_FRAME.width, { ms: 0 });
  world.snapCamera();
}

/**
 * Jump to where a start says (test hook, ?at=, ?place=, ?step=; options.ts resolveStart): snap the world into its part,
 * ask its place, then play on from there.
 */
export function jump(g: Game, start: StartAt): void {
  if (!isPart(start.part)) return;
  snapTo(g, start.part);
  if (start.part === 'hub') g.hub.asked = start.place;
  playFrom(g, start.part);
}

/**
 * The start, right after the Play tap (a play started: the save counts it): preload the customiser's clips first,
 * sweep down to Princess Emma, then the customiser. With a start (?at=) the sweep is skipped and the level jumps there
 * (?at=wardrobe to the customiser; any other part keeps her saved look).
 */
export async function begin(g: Game, at: StartAt | null): Promise<void> {
  g.save.write((s) => void (s.plays += 1));
  // 2.4.0: every result line carries the play number (pn).
  g.results.pn = g.save.data.plays;
  g.clock = startClock();
  const dressing = audio.preload(wardrobePartClipIds());
  const loading = Promise.all([dressing, audio.preload(startClipIds(g)), audio.preloadSounds(allGraphemes())]);
  // The effects and the day loop load after the speech, so they never hold up a line.
  void loading.then(() => audio.preloadFx());
  audio.ambience('day');
  if (at) {
    await Promise.race([loading, new Promise((r) => setTimeout(r, 4000))]);
    jump(g, at);
    return;
  }
  await Promise.all([g.world.introSweep(INTRO_MS), Promise.race([loading, new Promise((r) => setTimeout(r, 6000))])]);
  playFrom(g, 'wardrobe');
}
