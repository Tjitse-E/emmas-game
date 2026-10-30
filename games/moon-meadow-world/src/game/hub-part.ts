// The hub part (2.4.0, docs/v4/2.4.md sections 5.2 and 5.6; plan Tasks 4 and 5): after the welcome Emma picks from
// three learning bubbles and at most one play bubble until bedtime. hub.ts holds the pure rules (the play clock, the
// refill, the play bubbles, done early); this file runs them in the world: it pops the bubbles in 0.4 s apart with a
// sparkle on each place, explains them on the first hub ever with the ghost hand gliding over them, runs the place she
// asks (a bubble tap, a tap on its place, or a walk that ends near it after its bubble shows), refills after each place,
// lands the shore egg between places, prompts every 30 s without a touch, nudges the nearest learning bubble after 90 s
// with no place running, runs the pond visits (3 minutes or 6 slides) with the slide resting between them, and ends at
// bedtime.
//
// Bubbles hide while a place runs, except the learning ones during a pond visit: a tap on one ends the visit at once.
// Nothing starts by itself, and nothing moves or swaps while she decides.
import * as THREE from 'three';
import type { PrincessMode, ScreenPoint, Vec2 } from '../contracts';
import { BEAD_TREE, CORNER, HAY_RACK, NEST, PICNIC, RIDE, SLIDE, WILD_EGG, dist2 } from '../layout';
import { PALETTE } from '../wardrobe';
import { audio } from '../audio';
import { v3Art, wordPic } from '../assets';
import { CLIPS } from '../content';
import { type Game, GOALS, flat, headScreen, lumiSay, princessAt, say, setTime, v3, walkTo } from './game';
import { type HubPlace, QUEST_IDS, type QuestId, type StartStep } from './options';
import {
  FREE_WAIT_MS, type HubCtx, type HubState, LEARNING, NUDGE_MS, POND_SLIDES, POND_VISIT_MS, POP_GAP_MS, PROMPT_MS, STOP_NEAR_M,
  bedtimeDue, cutoffs, isPast, placeEnded, refill, tickPlay,
} from './hub';
import { HATCH_SPOT, NEST_EGG, WILD_EGG_AT, eggPlace, naming, snapBabies, wish } from './eggs-part';
import { canOfferWish, offerWish, withdrawWish, wishPlace } from './moments';
import { ridePlace } from './ride';
import { afterPlace } from './report';
import { prepareEggPlans } from './maths';
import { badgeOf, helpersHome, herBox, hungryHerd, picnicQuest, rackQuest, runQuest, showBasket, trayLineOnce } from './quests';
import { beadsQuest } from './beads';
import { cornerQuest } from './corner';

// ---- the pure parts (tested in tests/hub.test.ts) -------------------------------------------------------------------

/** A walk ended: her mode went from walk or run to idle this frame (a route's waypoints are no end). Pure. */
export function walkEnded(prev: PrincessMode, now: PrincessMode, at: Vec2, ms: number): { at: Vec2; ms: number } | null {
  return (prev === 'walk' || prev === 'run') && now === 'idle' ? { at: { x: at.x, z: at.z }, ms } : null;
}

/**
 * The place a walk end starts: an offered place within STOP_NEAR_M of the end, whose bubble showed before the walk
 * ended (end.ms > shownAt[p]), the nearest; wishes never (a wish starts only from its bubble or its baby). Pure.
 */
export function walkEndStart(
  end: { at: Vec2; ms: number },
  shown: readonly HubPlace[],
  shownAt: Partial<Record<HubPlace, number>>,
  at: (p: HubPlace) => Vec2 | null,
): HubPlace | null {
  let best: HubPlace | null = null;
  let bestD = STOP_NEAR_M;
  for (const p of shown) {
    const when = shownAt[p];
    const where = p === 'wish' ? null : at(p);
    if (!where || when === undefined || !(end.ms > when)) continue;
    const d = dist2(end.at, where);
    if (d <= bestD) [best, bestD] = [p, d];
  }
  return best;
}

/** The nudge is due: no place runs and nudgeIdleMs >= NUDGE_MS (the caller sets nudgeIdleMs to 0 when it nudges). Pure. */
export function nudgeDue(h: HubState): boolean {
  return !h.running && h.nudgeIdleMs >= NUDGE_MS;
}

/** The learning bubble the nudge points at: the shortest route, a tie to the one shown longest; never a play bubble. Pure. */
export function firstLearning(h: HubState, routeM: (p: HubPlace) => number): HubPlace | null {
  let best: HubPlace | null = null;
  for (const p of h.shown) {
    if (!LEARNING.includes(p)) continue;
    if (best === null) {
      best = p;
      continue;
    }
    const d = routeM(p) - routeM(best);
    if (d < -1e-6 || (Math.abs(d) <= 1e-6 && (h.shownAt[p] ?? Infinity) < (h.shownAt[best] ?? Infinity))) best = p;
  }
  return best;
}

/**
 * A pond visit is over (5.2): no slide is under way, and it has run 3 minutes of play time, or 6 slides (a slide
 * counts at its splash), or the play clock has reached bedtime. Pure.
 */
export function visitOver(h: HubState, o: { sliding: boolean }): boolean {
  if (!h.visit) return true;
  if (o.sliding) return false;
  return h.playMs - h.visit.fromMs >= POND_VISIT_MS || h.visit.slides >= POND_SLIDES || h.playMs >= h.bedMs;
}

/** The slide runs only during a pond visit; between visits it rests, with the ducks under its chute. */
export function slideOpen(g: Game): boolean {
  return g.hub.visit !== null;
}

// ---- the places ----------------------------------------------------------------------------------------------------

/** Where each place is on the ground: walking near and the nudge's route measure to it. A wish has no fixed place. */
export function placePoint(g: Game, p: HubPlace): Vec2 | null {
  switch (p) {
    case 'egg':
      return NEST.center;
    case 'shore':
      return WILD_EGG.at;
    case 'ride':
      return RIDE.stand;
    case 'picnic':
      return PICNIC.rug.center;
    case 'beads':
      return BEAD_TREE.center;
    case 'rack':
      return HAY_RACK.center;
    case 'corner':
      return CORNER.stand;
    case 'pond':
      return SLIDE.ladderBase;
    case 'wish':
      return g.waiting ? flat(g.waiting.position) : null;
  }
}

/** Where she stands for a place, when a tap on it walks her there. */
const STAND: Record<Exclude<HubPlace, 'wish' | 'pond'>, Vec2> = {
  egg: NEST.stand, shore: WILD_EGG.stand, ride: RIDE.stand, picnic: PICNIC.stand, beads: BEAD_TREE.stand, rack: HAY_RACK.stand, corner: CORNER.stand,
};

/** The bubble pictures (v3 art, 5.2's table), their tint and base, and the world point each bubble floats over. */
const BUBBLE: Record<Exclude<HubPlace, 'wish'>, { pic: () => string; tint?: string; base?: () => string; at: THREE.Vector3 }> = {
  egg: { pic: () => v3Art('items/egg-moon.webp'), base: () => v3Art('items/item-nest.webp'), at: v3(NEST.center, 1.5) },
  shore: { pic: () => v3Art('items/egg-snow.webp'), at: v3(WILD_EGG.at, 1.3) },
  // Over the rug's east end: after the Corner she stands at the step north of the rug's middle (2.3).
  picnic: { pic: () => wordPic('picnic'), at: new THREE.Vector3(PICNIC.rug.center.x + 1.2, 1.3, PICNIC.rug.center.z) },
  rack: { pic: () => v3Art('items/item-hay-bundle.webp'), at: v3(HAY_RACK.center, 2.3) },
  beads: { pic: () => wordPic('bead'), tint: PALETTE.pink.pic, at: v3(BEAD_TREE.center, 3.0) },
  ride: { pic: () => wordPic('saddle'), at: v3(RIDE.stand, 2.4) },
  corner: { pic: () => v3Art('items/place-dressing.webp'), at: v3(CORNER.trunk, 1.1) },
  pond: { pic: () => wordPic('slide'), at: SLIDE.top.clone().setY(SLIDE.top.y + 0.9) },
};
const WISH_PIC = (): string => v3Art('items/item-wish-basket.webp');

/** The nudge's "this way" lines (5.2). A play bubble is never nudged, so the Corner and the pond have none. */
const WAY: Record<Exclude<HubPlace, 'corner' | 'pond'>, string[]> = {
  egg: CLIPS.way.nest, shore: CLIPS.way.wildEgg, ride: CLIPS.way.saddle, picnic: CLIPS.way.picnic, beads: CLIPS.way.beads, rack: CLIPS.way.rack,
  wish: CLIPS.way.wish,
};

const isQuest = (p: HubPlace): p is QuestId => (QUEST_IDS as readonly string[]).includes(p);

/** A jump into a step of an egg place (?step=naming|wish): the snapped baby's naming and its wish, or the wish alone. */
const steps = new WeakMap<Game, StartStep>();
/** A jump asks its step with the place (level.ts snapTo); the hub's first run of that place takes it. */
export function askStep(g: Game, step: StartStep | null): void {
  if (step) steps.set(g, step);
  else steps.delete(g);
}

async function eggStep(g: Game, p: 'egg' | 'shore', step: StartStep): Promise<() => void> {
  const spot = p === 'egg' ? 'nest' : 'shore';
  const i = g.babies.length;
  g.actors.egg.hide();
  snapBabies(g, [spot], spot === 'nest' ? HATCH_SPOT[13] : HATCH_SPOT[14], step === 'wish');
  if (step === 'naming') await naming(g, i);
  await wish(g, i);
  return () => {};
}

/**
 * Each place resolves framed with its release (2.3's rule); n is its count this play, so the ride gets its trip
 * number. The gift quests run their gift picker in the hub (runPlace), as runQuest does.
 */
export const RUN: Record<HubPlace, (g: Game, n: number) => Promise<() => void>> = {
  egg: (g) => eggPlace(g, 'nest'),
  shore: (g) => eggPlace(g, 'shore'),
  wish: async (g) => (g.waiting ? wishPlace(g, g.waiting) : () => {}),
  picnic: (g) => picnicQuest(g),
  beads: (g) => beadsQuest(g),
  rack: (g) => rackQuest(g),
  corner: (g) => cornerQuest(g),
  ride: (g, n) => ridePlace(g, n >= 2 ? 2 : 1),
  pond: (g) => pondVisit(g),
};

// ---- asking a place --------------------------------------------------------------------------------------------------

/** The hub runs (between the welcome and bedtime): only then can a place be asked. */
const running = new WeakSet<Game>();

/**
 * Ask a place (a bubble tap, a tap on its place, stopping near it, a tap on the waiting wish baby): the hub starts it
 * at its next frame. During a pond visit a learning bubble's place ends the visit at once. False when it cannot start
 * now: no hub, bedtime, another place asked or running, its bubble not showing, or its cutoff passed.
 */
export function askPlace(g: Game, p: HubPlace): boolean {
  const h = g.hub;
  if (!running.has(g) || g.bedtime || h.asked || isPast(h, p) || !h.shown.includes(p)) return false;
  if (h.running && !(h.running === 'pond' && LEARNING.includes(p))) return false;
  if (p === 'wish' && !g.waiting) return false;
  h.asked = p;
  return true;
}

/** What the refill reads from the game: the maths quest, a herd baby that can wait with a wish, the moments so far. */
export function hubCtx(g: Game): HubCtx {
  let r = 0;
  let m = 0;
  for (const l of g.results.lines) {
    if (l.strand === 'm') m++;
    else r++;
  }
  return { maths: g.quests.maths, wishBaby: g.waiting !== null || canOfferWish(g), moments: { r, m } };
}

// ---- the play clock --------------------------------------------------------------------------------------------------

/**
 * The frame callback of the play clock (performance.now() deltas, capped at 1 s by tickPlay): it stands still while
 * the start mirror is open (g.clock.mirror) and while the Corner's music box plays (g.quests.dressing, which also counts
 * as the Corner's dressing time), and counts from the Play tap to the end of the play. The hub's idle counts run while
 * the part is the hub and no place runs.
 */
export function installPlayClock(g: Game): void {
  let last = performance.now();
  g.world.onFrame(() => {
    const now = performance.now();
    const ms = now - last;
    last = now;
    if (g.part === 'start' || g.part === 'end') return;
    if (g.quests.dressing) g.clock.dressMs.corner += Math.min(ms, 1000);
    tickPlay(g.hub, ms, { paused: g.clock.mirror || g.quests.dressing, hub: g.part === 'hub' && running.has(g) });
  });
}

// ---- the hub part ----------------------------------------------------------------------------------------------------

/** Lumi tapped in the hub (main.ts): "Where do you want to go? Tap a bubble!", and every bubble bobs once. */
export function lumiInHub(g: Game): boolean {
  if (!running.has(g) || g.hub.running || audio.speaking) return false;
  void audio.sayAll(CLIPS.pick);
  for (const p of g.hub.shown) g.layer.offerBob(p, false);
  return true;
}

/** The prompts every PROMPT_MS without a touch, in turn: the bubbles line, "Tap a bubble!", the follow line. */
const PROMPTS: string[][] = [CLIPS.bubbles, CLIPS.pick, CLIPS.follow];
/** g4-pick plays at the hub's opening and after her first two places of a play, then no more. */
const PICK_REFILLS = 3;

/** The hub part (takes over afternoon()): bubbles, place taps, prompts, the nudge, the pond visits, until bedtime. */
export async function hub(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  const h = g.hub;
  const q = g.quests;
  running.add(g);
  g.run.defer(() => running.delete(g));
  g.free = true;
  layer.lumi.show(true);
  layer.keepClear(() => herBox(g));
  g.run.defer(() => layer.keepClear(null));

  // ---- the bubbles on screen ----
  const displayed = new Set<HubPlace>();
  let popToken = 0;
  let talkToken = 0;
  let basket = false;
  /** Places run in this hub: g4-pick plays at the opening and after her first two. */
  let placesRun = 0;
  let pondSaid = false;
  let soonSaid = false;
  let sky = false;

  const bubbleAt = (p: HubPlace): (() => ScreenPoint) => {
    if (p === 'wish') return () => (g.waiting ? headScreen(g, g.waiting) : { x: -999, y: -999, visible: false });
    const at = BUBBLE[p].at;
    return () => world.toScreen(at);
  };
  const onTap = (p: HubPlace) => () => {
    // Her first bubble tap counts as the first hub's explanation heard (2.4 section 7).
    if (!g.save.data.seen.hub) g.save.write((s) => void (s.seen.hub = true));
    if (askPlace(g, p)) return;
    // The layer popped the tapped bubble away: it shows again, and she walks there.
    displayed.delete(p);
    void sync(false);
    void walkToPlace(g, p);
  };
  const showBubble = (p: HubPlace) => {
    const o = p === 'wish' ? { pic: WISH_PIC() } : { pic: BUBBLE[p].pic(), tint: BUBBLE[p].tint, base: BUBBLE[p].base?.() };
    layer.offer(p, { ...o, badge: isQuest(p) ? badgeOf(g, p) : undefined, at: bubbleAt(p), onTap: onTap(p) });
    displayed.add(p);
    if (isQuest(p)) q.offered.add(p);
    if (h.shownAt[p] === undefined) h.shownAt[p] = h.playMs;
  };
  const hideBubble = (p: HubPlace) => {
    layer.offer(p, null);
    displayed.delete(p);
    if (isQuest(p)) q.offered.delete(p);
  };
  /** What shows now: nothing while a place runs, the learning bubbles during a pond visit, else every shown bubble. */
  const wanted = (): HubPlace[] => (g.bedtime ? [] : h.running === 'pond' ? h.shown.filter((p) => LEARNING.includes(p)) : h.running ? [] : h.shown);
  /** Put the layer's bubbles in line with the hub; new ones pop in POP_GAP_MS apart with a sparkle on their place. */
  const sync = (pop: boolean): Promise<void> => {
    const want = wanted();
    for (const p of [...displayed]) if (!want.includes(p)) hideBubble(p);
    const fresh = want.filter((p) => !displayed.has(p));
    if (!pop) {
      fresh.forEach(showBubble);
      return Promise.resolve();
    }
    const mine = ++popToken;
    return (async () => {
      for (const [k, p] of fresh.entries()) {
        if (k) await g.run.sleep(POP_GAP_MS);
        if (mine !== popToken || !wanted().includes(p) || displayed.has(p)) continue;
        showBubble(p);
        const at = p === 'wish' && g.waiting ? g.waiting.headTop() : p === 'wish' ? null : BUBBLE[p].at;
        if (at) actors.fx.sparkle(at.clone(), { count: 14 });
      }
    })();
  };

  /** The places in h.shown that need the world: the waiting wish baby, the rack's helpers, the eggs and the nest glow. */
  const dress = () => {
    if (h.shown.includes('wish') && !g.waiting) {
      g.waiting = offerWish(g);
      if (g.waiting) g.followers.remove(g.waiting);
      else h.shown = h.shown.filter((p) => p !== 'wish');
    }
    if (!h.shown.includes('wish') && g.waiting && h.running !== 'wish') {
      withdrawWish(g, g.waiting);
      g.waiting = null;
    }
    if (h.running) return;
    if (h.shown.includes('rack') && !q.helpers.length) hungryHerd(g);
    if (!h.shown.includes('rack') && q.helpers.length) helpersHome(g);
    // The nest keeps its glow while the nest egg waits (the shore egg is placed as it lands, landShore).
    const eggShown = h.shown.includes('egg');
    if (eggShown && !actors.egg.visible) actors.egg.place(NEST_EGG, 'warm');
    world.nestGlow(eggShown);
  };

  /**
   * The shore egg lands between places (5.2): a moonbeam and a sparkle at the shore, and Lumi's "Oh! Another egg!"
   * while its bubble pops in; the camera stays with her. Resolves with Lumi's line.
   */
  const landShore = async (): Promise<Promise<void>> => {
    void actors.fx.moonbeam(WILD_EGG_AT, 3600);
    await g.run.sleep(500);
    actors.egg.place(WILD_EGG_AT, 'snow');
    actors.fx.sparkle(WILD_EGG_AT.clone().setY(0.8), { count: 24, colour: '#cfe8ff' });
    void actors.fx.starfall(WILD_EGG_AT.clone().setY(0.6));
    return lumiSay(g, CLIPS.anotherEgg);
  };

  /** A refill between places (or as the hub opens, or at a cutoff): the bubbles, then what is said about them. */
  const refillNow = (o: { landed?: boolean; talk?: boolean } = {}) => {
    const before = h.shown.slice();
    h.shown = refill(h, hubCtx(g));
    for (const p of before) if (!h.shown.includes(p)) delete h.shownAt[p];
    dress();
    prepareEggPlans(g);
    if (!basket && h.shown.length) {
      basket = true;
      showBasket(g);
      trayLineOnce(g);
    }
    if (o.talk === false) {
      void sync(false);
      return;
    }
    const mine = ++talkToken;
    const ok = () => mine === talkToken && !h.running && !h.asked;
    const corner = h.shown.includes('corner') && !q.cornerSaid;
    const pond = h.shown.includes('pond') && !pondSaid;
    if (corner) q.cornerSaid = true;
    if (pond) pondSaid = true;
    const pick = placesRun < PICK_REFILLS && h.shown.length > 0;
    void (async () => {
      try {
        const lumi = o.landed ? await landShore() : null;
        if (!ok()) return;
        await sync(true);
        if (lumi) await lumi;
        if (!ok()) return;
        if (corner) await lumiSay(g, CLIPS.cornerOpen);
        if (pond && ok()) await say(g, CLIPS.pond);
        if (!g.save.data.seen.hub && displayed.size && ok()) {
          // The first hub ever: the bubbles line while the ghost hand glides over each bubble in turn.
          const points = [...displayed].map((p) => bubbleAt(p));
          void layer.ghost.glide(points);
          if (await g.run.w(audio.sayWhole(CLIPS.bubbles))) g.save.write((s) => void (s.seen.hub = true));
        }
        if (pick && ok()) await say(g, CLIPS.pick);
      } catch {
        /* a jump ended the run */
      }
    })();
  };
  g.hubRefresh = () => refillNow({ talk: false });
  g.run.defer(() => {
    g.hubRefresh = null;
    for (const p of [...displayed]) hideBubble(p);
    world.markGoal(null);
  });

  // ---- walking near, the prompts, the nudge, the cutoffs ----
  let prev: PrincessMode = actors.princess.mode;
  const offWalk = world.onFrame(() => {
    // A cutoff passed: its bubble goes, during a place too (the learning bubbles of a pond visit).
    const c = cutoffs(h.bedMs);
    if (h.shown.some((p) => isPast(h, p)) || (h.shown.length && h.playMs >= c.all)) refillNow({ talk: false });
    const now = actors.princess.mode;
    const end = walkEnded(prev, now, princessAt(g), h.playMs);
    prev = now;
    if (!end || h.running || h.asked || !g.free || layer.snapshot().moment) return;
    const p = walkEndStart(end, h.shown.filter((x) => displayed.has(x)), h.shownAt, (x) => placePoint(g, x));
    if (p) askPlace(g, p);
  });
  g.run.defer(offWalk);

  let prompt = 0;
  let prompted = performance.now();
  const tickHub = () => {
    const c = cutoffs(h.bedMs);
    // From 29:00 every bubble has gone: the sky turns golden over 60 s and "Soon it is bedtime!" once.
    if (h.playMs >= c.all && !h.running) {
      if (!sky) {
        sky = true;
        void setTime(g, 0.3, 60_000);
      }
      if (!soonSaid && !audio.speaking && !bedtimeDue(h, { dressing: q.dressing })) {
        soonSaid = true;
        void audio.sayAll(CLIPS.soonBed);
      }
    }
    if (h.running) return;
    // The nudge: the first learning bubble grows and bobs, the beacon marks its place, its "this way" line.
    if (nudgeDue(h) && !audio.speaking) {
      h.nudgeIdleMs = 0;
      nudge();
    }
    const t = performance.now();
    if (t - Math.max(g.lastTouch, prompted) >= PROMPT_MS && !audio.speaking && h.shown.length) {
      prompted = t;
      void audio.sayAll(PROMPTS[prompt++ % PROMPTS.length]);
    }
  };
  const nudge = () => {
    const here = princessAt(g);
    const p = firstLearning(h, (x) => {
      const at = placePoint(g, x);
      return at ? routeM(world.route(here, at), here) : Infinity;
    });
    if (!p || p === 'corner' || p === 'pond') return;
    layer.offerBob(p, true);
    const at = placePoint(g, p);
    if (at) world.markGoal(at);
    void audio.sayAll(WAY[p]);
  };

  // ---- the places ----
  const runPlace = async (p: HubPlace) => {
    h.asked = null;
    const n = h.done.filter((x) => x === p).length + 1;
    talkToken++;
    popToken++;
    world.markGoal(null);
    h.running = p;
    if (isQuest(p)) q.running = p;
    void sync(false);
    if (p !== 'pond') layer.foodBasket({ show: false });
    // The egg of the place, where it lies (a forced shore egg before the nest egg moves the one home egg there).
    if (p === 'egg' && (!actors.egg.visible || dist2(flat(actors.egg.position), NEST.center) > 1)) actors.egg.place(NEST_EGG, 'warm');
    if (p === 'shore' && (!actors.egg.visible || dist2(flat(actors.egg.position), WILD_EGG.at) > 1)) actors.egg.place(WILD_EGG_AT, 'snow');
    // A tap asks the place and she walks there; the first play's forced egg keeps its goal, so she walks herself.
    if ((p === 'egg' || p === 'shore') && !g.goal) void walkTo(g, STAND[p]);
    if (p === 'wish' && !g.waiting) g.waiting = offerWish(g);
    const fromMs = h.playMs;
    const ck0 = g.clock.checkedMs;
    const step = steps.get(g);
    steps.delete(g);
    let counted = true;
    try {
      if (step && (p === 'egg' || p === 'shore') && (step === 'naming' || step === 'wish')) (await eggStep(g, p, step))();
      else if (isQuest(p)) await runQuest(g, p, (gg) => RUN[p](gg, n));
      else (await RUN[p](g, n))();
      if (p === 'pond') counted = visitedNow.has(g);
      if (p === 'wish' && !g.waiting) counted = false;
    } finally {
      visitedNow.delete(g);
      h.running = null;
      q.running = null;
      q.dressing = false;
    }
    if (p === 'wish') g.waiting = null;
    g.free = true;
    if (!counted) {
      refillNow({ talk: false });
      return;
    }
    const landed = h.shoreLanded;
    placeEnded(h, p, hubCtx(g));
    if (isQuest(p)) q.done.add(p);
    afterPlace(g, p, { n, fromMs, checkedMs: g.clock.checkedMs - ck0 });
    placesRun++;
    showBasket(g);
    refillNow({ landed: !landed && h.shoreLanded });
    // After a visit the first learning bubble grows and bobs, and its "this way" line plays (5.2).
    if (p === 'pond' && !h.asked) nudge();
    prompted = performance.now();
  };

  // ---- the loop ----
  const t0 = performance.now();
  if (!h.asked) refillNow();
  for (;;) {
    if (h.asked) {
      await runPlace(h.asked);
      continue;
    }
    if (bedtimeDue(h, { dressing: q.dressing })) break;
    // The wait's safety is FREE_WAIT_MS; skip() (the test hook) ends the wait without ending the hub.
    const ended = await g.run.until(() => (tickHub(), h.asked !== null || bedtimeDue(h, { dressing: q.dressing })), FREE_WAIT_MS);
    if (!ended && performance.now() - t0 >= FREE_WAIT_MS) break;
  }
  talkToken++;
  popToken++;
  for (const p of [...displayed]) hideBubble(p);
  if (g.waiting) {
    withdrawWish(g, g.waiting);
    g.waiting = null;
  }
  layer.keepClear(null);
  layer.foodBasket({ show: false });
  world.markGoal(null);
  if (h.bedtimeAt === null) h.bedtimeAt = h.playMs;
  running.delete(g);
  g.hubRefresh = null;
}

/** The length of a route from `from` (the nudge's "nearest along the route"). */
function routeM(route: readonly Vec2[], from: Vec2): number {
  let d = 0;
  let a = from;
  for (const b of route) {
    d += dist2(a, b);
    a = b;
  }
  return d;
}

/** A tap on a bubble or a place that cannot start now: she walks there. */
export function walkToPlace(g: Game, p: HubPlace): Promise<boolean> | void {
  if (p === 'wish') return g.waiting ? walkTo(g, g.world.nearestWalkable(flat(g.waiting.position))) : undefined;
  if (p === 'pond') return walkTo(g, GOALS.pond.stand);
  return walkTo(g, g.world.nearestWalkable(STAND[p]));
}

// ---- the pond visit (plan Task 5) ------------------------------------------------------------------------------------

/** A visit that started (she arrived), for runPlace. */
const visitedNow = new WeakSet<Game>();
/** The longest walk to the ladder; after that she is there at once. */
const POND_WALK_MS = 15_000;

/**
 * The pond as a hub place (5.2): she walks to the ladder (a learning bubble tapped on the way ends it, with no
 * visit); the visit counts as done when she arrives. The first visit of a play gets the ghost drag of a follower to
 * the slide's top and "Drag a unicorn to the top of the slide." The ducks paddle to the far shore. Slides, hers and
 * her babies', count at their splash. It ends at 3 minutes of play time, at 6 slides or at bedtime (a slide under way
 * finishes), or at once when she taps a learning bubble. Then the ducks paddle back under the chute.
 */
export async function pondVisit(g: Game): Promise<() => void> {
  const { actors, layer, world } = g;
  const h = g.hub;
  g.free = true;
  const there = () => dist2(princessAt(g), SLIDE.ladderBase) <= STOP_NEAR_M + 0.5 || ['climb', 'slide', 'swim'].includes(actors.princess.mode);
  if (!there()) {
    void walkTo(g, GOALS.pond.stand);
    const ok = await g.run.until(() => there() || h.asked !== null, POND_WALK_MS);
    if (h.asked) return () => {};
    if (!ok) actors.placePrincess(GOALS.pond.stand, 0);
  }
  visitedNow.add(g);
  h.visit = { fromMs: h.playMs, slides: 0 };
  world.ducks.set('far');
  const first = !pondVisited.has(g.hub);
  pondVisited.add(g.hub);
  // Slides count at their splash: a unicorn from the slide into the water, or Princess Emma.
  const was = new Map<string, string>();
  let herWas: PrincessMode = actors.princess.mode;
  const sliding = () => actors.princess.mode === 'climb' || actors.princess.mode === 'slide' || actors.herd.all().some((u) => u.mode === 'slide');
  const offSlides = world.onFrame(() => {
    const v = h.visit;
    if (!v) return;
    const m = actors.princess.mode;
    if (herWas === 'slide' && m === 'swim') v.slides++;
    herWas = m;
    for (const u of actors.herd.all()) {
      if (u.mode === 'swim' && was.get(u.id) === 'slide') v.slides++;
      was.set(u.id, u.mode);
    }
  });
  const undo = g.run.defer(offSlides);
  try {
    if (first) {
      const shown = g.followers.list[0] ?? g.babies[0]?.unicorn;
      const demo = shown ? layer.ghost.drag(() => world.toScreen(shown.headTop()), () => world.toScreen(SLIDE.top)) : Promise.resolve();
      await say(g, CLIPS.slideDrag);
      await g.run.w(demo);
    }
    // The visit's wait; skip() (the test hook) ends it, and so does a learning bubble tap.
    await g.run.until(() => h.asked !== null || visitOver(h, { sliding: sliding() }), 2 * POND_VISIT_MS + 60_000);
  } finally {
    offSlides();
    undo();
    if (h.visit) h.pondMs += Math.max(0, h.playMs - h.visit.fromMs);
    h.visit = null;
    world.ducks.set('chute');
  }
  g.followers.sync();
  return () => {};
}
/** Hubs whose play has had its first pond visit (the ghost drag comes once a play). */
const pondVisited = new WeakSet<HubState>();

/** Lumi's "The ducks are having their swim!" at the first tap on the resting slide in a play. */
const ducksSaid = new WeakSet<HubState>();
/**
 * A tap on the slide or its ladder (input.ts): during a visit she rides it; with the pond bubble showing it asks the
 * pond; while it rests the ducks bob, and the first time a play Lumi says why (no refusal, she is not walked away).
 */
export function slideTap(g: Game): void {
  if (slideOpen(g)) {
    void g.actors.princess.rideSlide();
    return;
  }
  if (askPlace(g, 'pond')) return;
  g.world.ducks.bob();
  if (!ducksSaid.has(g.hub) && !audio.speaking) {
    ducksSaid.add(g.hub);
    void g.layer.lumi.speak(CLIPS.ducks);
  }
}

/** Where a unicorn dropped on the resting slide's top lands: on the grass beside the ladder, where it grazes. */
export const BESIDE_LADDER: Vec2 = { x: SLIDE.ladderBase.x - 1.3, z: SLIDE.ladderBase.z + 0.9 };

