// The level script: "Emma's first day in Moon Meadow" (docs/v4/demo.md section 1, docs/v4/2.2.md). Each part is an
// async step on the current Run; jump(start) stops the run, snaps the world into that start's state and plays on from
// there. 2.2.0 adds the customiser before the welcome (wardrobe-part.ts); 2.3.0 the effects of the welcome crown, the
// bedtime bell and the goodnight owl, and one kind=play line per play before the end screen.
//
// 2.4.0 (docs/v4/2.4.md section 5.1): the parts are the wardrobe, the welcome, the hub, bedtime and goodnight. The hub
// (hub-part.ts) took over the fixed script: the eggs, the wishes, the pond, the gift quests, the Corner and the ride are
// its places. The first play ever (or a save without the crown) keeps the long welcome, which ends with the nest egg
// waiting, and the hub starts with that egg asked; from the second play the short welcome goes straight to the hub's
// bubbles. The old part names stay as aliases of hub starts (options.ts resolveStart).
import type { Vec2 } from '../contracts';
import { CORNER, BEAD_TREE, GRAZE_HOMES, HAY_RACK, NEST, PICNIC, RIDE, STABLE, STABLE_FRAME, START, WILD_EGG } from '../layout';
import { audio } from '../audio';
import { CLIPS, allGraphemes } from '../content';
import {
  type Game, type Part, GOALS, PARTS, faceBeside, frameAt, isPart, lumiSay, princessAt, say, sayWay, setGoal, setTime, startClock,
  startQuests, v3,
} from './game';
import { Run, Cancelled } from './run';
import { startMaths } from './band';
import { type EggSpot, NEST_EGG, SIDE, WILD_EGG_AT, snapBabies } from './eggs-part';
import { herdAside, wardrobe, wardrobePartClipIds } from './wardrobe-part';
import { hideOffers } from './quests';
import { askStep, hub } from './hub-part';
import { bedtime, goodnight } from './bedtime';
import { BEDTIME_MS, type HubState, startHub } from './hub';
import { snapTrip } from './ride';
import type { HubPlace, StartAt } from './options';
import { dist2 } from '../layout';

/** Width of ground across the screen for each framing. */
const CROWN_WIDTH = 6;
const INTRO_MS = 3500;

/** The level's clips said at any time, preloaded at the start with the herd's names. */
export function startClipIds(g: Game): string[] {
  const ids: string[] = [];
  for (const v of Object.values(CLIPS)) {
    if (Array.isArray(v)) ids.push(...v);
    else if (typeof v === 'object') ids.push(...Object.values(v).flat());
  }
  ids.push(...g.herd.map((h) => h.clip));
  return [...new Set(ids)];
}

/** Her feet are on the grass (not climbing, sliding or swimming). */
const onLand = (g: Game): boolean => ['idle', 'walk', 'run'].includes(g.actors.princess.mode);

// ---- the play's shape (plan Task 6, pure) ------------------------------------------------------------------------

/**
 * The place the play opens with: the nest egg on the first play ever and on a save without the crown (2.3's rule for
 * the long welcome), else none, and the hub's bubbles come at once. `plays` already counts this play. Pure.
 */
export function opening(s: { plays: number; seen: { crown: boolean } }): HubPlace | null {
  return s.plays >= 2 && s.seen.crown ? null : 'egg';
}

/**
 * The hub a start opens with (pure): its places counted as done, its place asked, the shore egg landed when the shore
 * egg is done or asked, and a forced Corner or pond counted as earned, so its bubble is the play bubble.
 */
export function hubAt(start: StartAt, bedMs: number): HubState {
  const h = startHub(bedMs);
  h.done = start.done.slice();
  h.asked = start.place;
  h.shoreLanded = h.done.includes('shore') || start.place === 'shore';
  if (start.place === 'corner' || start.place === 'pond') h.play = [start.place];
  return h;
}

/**
 * The babies a start snaps, in hatch order (pure): the nest egg's, the shore egg's and a ride's, in the order they were
 * done; ?babies=n gives the first n of the nest, the shore and two trail eggs instead.
 */
export function spotsOf(done: readonly HubPlace[], babies: number | null): EggSpot[] {
  if (babies !== null) return (['nest', 'shore', 'trail', 'trail'] as EggSpot[]).slice(0, babies);
  const spot: Partial<Record<HubPlace, EggSpot>> = { egg: 'nest', shore: 'shore', ride: 'trail' };
  return done.flatMap((p) => (spot[p] ? [spot[p]!] : []));
}

/** Where she stands as a jump into the hub opens: beside the asked place (the eggs at their side spots), else START. */
function hubSpot(start: StartAt): [Vec2, number] {
  const at: Partial<Record<HubPlace, Vec2>> = {
    egg: SIDE[0], shore: SIDE[1], picnic: PICNIC.stand, beads: BEAD_TREE.stand, rack: HAY_RACK.stand, corner: CORNER.stand, ride: RIDE.stand,
    pond: GOALS.pond.stand,
  };
  const p = start.place ? at[start.place] : undefined;
  return p ? [p, start.place === 'egg' || start.place === 'shore' ? Math.PI / 2 : 0] : [START, 0];
}

// ---- the parts -------------------------------------------------------------------------------------------------

async function welcome(g: Game): Promise<void> {
  // The long welcome until Lumi has given the crown: a first play left before the crown would else never save it.
  // 2.4.0: it ends as in 2.3, with the nest egg, and the hub starts with the nest egg asked; the short welcome goes
  // straight to the hub.
  if (opening({ plays: g.save.data.plays, seen: g.save.data.seen }) === null) return welcomeBack(g);
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
  g.hub.asked = 'egg';
}

/**
 * From the second play on the welcome is short: "Hello, Emma!", the crown appears at once with a sparkle (no crown
 * close-up, ghost tap or walk line; about 35 s less). 2.4.0: no egg here; the hub's bubbles come straight after it.
 */
async function welcomeBack(g: Game): Promise<void> {
  const { actors, layer } = g;
  g.free = true;
  layer.lumi.show(true);
  await lumiSay(g, CLIPS.helloBack);
  const head = actors.princess.position.clone().setY(1.6);
  actors.princess.crown(true);
  actors.fx.sparkle(head, { count: 16 });
  await g.run.w(audio.fx('crown-twinkle'));
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

const STEPS: Record<Part, (g: Game) => Promise<void>> = { wardrobe, welcome, hub, bedtime, goodnight };

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

/** Put the world into the state of a start, at once: its part, and for the hub its done places, its babies and its place. */
export function snapTo(g: Game, start: StartAt): void {
  const { actors, layer, world } = g;
  const part = start.part as Part;
  g.run.stop();
  layer.reset();
  audio.stop();
  g.streams.reset();
  g.maths = startMaths(g.options.band);
  g.today = { wishes: 0, words: [] };
  g.clock = startClock();
  g.quests = startQuests(g.quests.maths);
  // 2.4.0: the hub this start opens with (with ?bed=, its bedtime), no trip, no waiting wish, no sign set used.
  g.hub = part === 'hub' ? hubAt(start, g.options.bedMs ?? BEDTIME_MS) : startHub(g.options.bedMs ?? BEDTIME_MS);
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

  // The home egg of an asked egg place, where it lies (the hub places the nest egg when its bubble shows).
  actors.egg.hide();
  if (part === 'hub' && start.place === 'egg' && !start.step) {
    actors.egg.place(NEST_EGG, 'warm');
    world.nestGlow(true);
  }
  if (part === 'hub' && g.hub.shoreLanded && !g.hub.done.includes('shore') && !(start.place === 'shore' && start.step)) actors.egg.place(WILD_EGG_AT, 'snow');

  // Princess Emma.
  const where: Record<Part, [Vec2, number]> = {
    wardrobe: [START, 0],
    welcome: [START, 0],
    hub: hubSpot(start),
    bedtime: [{ x: 1, z: -2 }, Math.PI],
    goodnight: [STABLE.emmaStand, Math.PI],
  };
  const [at, heading] = where[part];
  actors.placePrincess(at, heading);
  if (part === 'hub' && start.place === 'egg') faceBeside(g, NEST.center);
  if (part === 'hub' && start.place === 'shore') faceBeside(g, WILD_EGG.at);

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

  // The newborns of the places counted as done, in hatch order, named and following her; or with ?babies=n that many
  // (the nest's, the shore's and two of the trail's).
  for (let d = 13; d <= 16; d++) actors.herd.remove(`baby-${d}`);
  g.babies = [];
  snapBabies(g, spotsOf(part === 'hub' ? start.done : [], g.options.babies), { x: at.x + 1.7, z: at.z + 1.3 }, true);
  for (const b of g.babies) {
    if (part === 'goodnight') {
      b.unicorn.putInStall(b.door, true);
      g.stalls.set(b.door, b.unicorn);
    }
  }
  g.followers.set(part === 'goodnight' ? [] : g.babies.filter((b) => b.member).map((b) => b.unicorn));

  // A step inside the asked place: an egg place's naming or its baby's wish (the hub runs it), or a trip's step.
  askStep(g, part === 'hub' && (start.place === 'egg' || start.place === 'shore') ? start.step : null);
  if (part === 'hub' && start.place === 'ride' && start.step) snapTrip(g, start.step);

  // The camera: on the part's spot at once.
  if (part === 'goodnight') void world.frame(STABLE_FRAME.center, STABLE_FRAME.width, { ms: 0 });
  world.snapCamera();
}

/**
 * Jump to where a start says (test hook, ?at=, ?place=, ?step=; options.ts resolveStart): snap the world into it,
 * then play on from its part (the hub runs its asked place first).
 */
export function jump(g: Game, start: StartAt): void {
  if (!isPart(start.part)) return;
  snapTo(g, start);
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
