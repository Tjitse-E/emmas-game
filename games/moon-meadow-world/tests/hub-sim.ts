// The model of docs/v4/2.4.md section 5.7 for the hub's tests (plan Task 3): a play through the pure hub (hub.ts
// refill, placeEnded, tickPlay and bedtimeDue only) with the place times of 5.2 at her pace, walks at 2.6 m/s over
// routes a quarter longer than a straight line between the place points, 0.2 min between places, and the moments each
// place gives. Time goes through tickPlay in 1 s frames with `hub` on, so the nudge and done early's wait count as the
// game counts them. Not a test file itself: tests/hub-history.test.ts and tests/hub.test.ts read it.
import type { Vec2 } from '../src/contracts';
import { BEAD_TREE, CORNER, HAY_RACK, NEST, PICNIC, RIDE, SLIDE, START, WILD_EGG } from '../src/layout';
import { seeded } from '../src/content/rand';
import { HUB_PLACES } from '../src/game/options';
import {
  type HubCtx, type HubPlace, type HubState, LEARNING, NUDGE_MS, POND_VISIT_MS, bedtimeDue, isLeft, placeEnded, refill,
  startHub, tickPlay,
} from '../src/game/hub';

export type Policy = 'pond-lover' | 'skips-corner' | 'slide-only' | 'nearest' | 'idle-then-nearest';

export interface SimPlay {
  places: HubPlace[];
  /** playMs when each place ended. */
  ends: number[];
  learning: number;
  pondVisits: number;
  pondMs: number;
  /** How many learning places she had done when the first pond bubble showed, or null. */
  firstPondAfter: number | null;
  /** Play bubbles that showed, each counted once from when it showed until it went. */
  playBubbles: number;
  /** "The ducks are having their swim!": once a play, at her first tap on the resting slide. */
  ducksLines: number;
  /** playMs at each nudge. */
  nudges: number[];
  r: number;
  s: number;
  m: number;
  early: number | null;
  bedtimeAt: number;
}

const MIN = 60_000;
/** 5.2's place times at her pace, in play time (the Corner's 60 s music box is off the clock). */
const PLACE_MS: Record<Exclude<HubPlace, 'pond'>, number> = {
  egg: 3.1 * MIN, shore: 3.1 * MIN, wish: 0.7 * MIN, picnic: 1.9 * MIN, beads: 1.8 * MIN, rack: 1.5 * MIN, ride: 5.1 * MIN, corner: 1.4 * MIN,
};
const BETWEEN_MS = 0.2 * MIN;
/** The opening on the play clock: the short welcome (the start mirror is off the clock). */
const WELCOME_MS = 0.3 * MIN;
const WALK_M_S = 2.6;
const ROUTE = 1.25;
const WISH_M = 3;

/** The moments each place gives (reading r, spelling s, maths m). */
const MOMENTS: Record<HubPlace, { r: number; s: number; m: number }> = {
  egg: { r: 1, s: 1, m: 3 }, shore: { r: 1, s: 1, m: 3 }, ride: { r: 3, s: 1, m: 3 }, picnic: { r: 2, s: 0, m: 0 }, wish: { r: 1, s: 0, m: 0 },
  beads: { r: 0, s: 0, m: 3 }, rack: { r: 0, s: 0, m: 1 }, corner: { r: 2, s: 0, m: 0 }, pond: { r: 0, s: 0, m: 0 },
};
/** The roll call and the visit at bedtime: three door numerals. */
const BEDTIME_M = 3;

/** Where she does each place (a wish is 3 m from wherever she is). */
export const PLACE_AT: Record<Exclude<HubPlace, 'wish'>, Vec2> = {
  egg: NEST.stand, shore: WILD_EGG.stand, ride: RIDE.stand, picnic: PICNIC.stand, beads: BEAD_TREE.stand, rack: HAY_RACK.stand,
  corner: CORNER.stand, pond: SLIDE.ladderBase,
};

const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);
/** The walk's metres from `from` to the place (a quarter longer than straight). */
export const walkM = (from: Vec2, p: HubPlace): number => ROUTE * (p === 'wish' ? WISH_M : dist(from, PLACE_AT[p]));

/** Never two pond visits without a learning place between. */
export function noTwoPondsInARow(places: readonly HubPlace[]): boolean {
  let pond = false;
  for (const p of places) {
    if (p === 'pond') {
      if (pond) return false;
      pond = true;
    } else if (LEARNING.includes(p)) pond = false;
  }
  return true;
}

export function simulate(policy: Policy, o: { maths?: 'beads' | 'rack' } = {}): SimPlay {
  const maths = o.maths ?? 'beads';
  const h = startHub();
  const out: SimPlay = {
    places: [], ends: [], learning: 0, pondVisits: 0, pondMs: 0, firstPondAfter: null, playBubbles: 0, ducksLines: 0, nudges: [], r: 0, s: 0, m: 0,
    early: null, bedtimeAt: 0,
  };
  let at: Vec2 = START;
  const ctx = (): HubCtx => ({ maths, wishBaby: true, moments: { r: out.r + out.s, m: out.m } });
  const playShown = new Set<HubPlace>();
  const show = () => {
    h.shown = refill(h, ctx());
    for (const p of h.shown) {
      if (p !== 'corner' && p !== 'pond') continue;
      if (!playShown.has(p)) out.playBubbles++;
      if (p === 'pond' && out.firstPondAfter === null) out.firstPondAfter = out.learning;
    }
    for (const p of [...playShown]) if (!h.shown.includes(p)) playShown.delete(p);
    for (const p of h.shown) if (p === 'corner' || p === 'pond') playShown.add(p);
  };
  /** Hub time with no place running, 1 s frames, until `ms` passed, bedtime is due or `stop()`; nudges as the game nudges. */
  const wait = (ms: number, stop: () => boolean = () => false): boolean => {
    for (let t = 0; t < ms; t += 1000) {
      if (bedtimeDue(h, { dressing: false })) return true;
      if (stop()) return false;
      tickPlay(h, 1000, { paused: false, hub: true });
      // The game refills when a cutoff passes, so a bubble past its cutoff goes while she waits.
      show();
      if (h.nudgeIdleMs >= NUDGE_MS) {
        out.nudges.push(h.playMs);
        h.nudgeIdleMs = 0;
      }
    }
    return bedtimeDue(h, { dressing: false });
  };
  const runFor = (p: HubPlace, ms: number) => {
    h.running = p;
    for (let t = 0; t < ms; t += 1000) tickPlay(h, 1000, { paused: false, hub: true });
  };
  const nearest = (from: Vec2, among: readonly HubPlace[]): HubPlace | null =>
    among.reduce<HubPlace | null>((best, p) => (best === null || walkM(from, p) < walkM(from, best) ? p : best), null);
  const learningShown = () => h.shown.filter((p) => LEARNING.includes(p));

  const go = (p: HubPlace) => {
    const walk = (walkM(at, p) / WALK_M_S) * 1000;
    runFor(p, walk);
    if (p !== 'wish') at = PLACE_AT[p];
    if (p === 'pond') {
      const ms = Math.min(POND_VISIT_MS, Math.max(0, h.bedMs - h.playMs));
      runFor(p, ms);
      out.pondVisits++;
      out.pondMs += ms;
    } else runFor(p, PLACE_MS[p]);
    h.running = null;
    placeEnded(h, p, ctx());
    out.places.push(p);
    out.ends.push(h.playMs);
    if (LEARNING.includes(p)) out.learning++;
    const k = MOMENTS[p];
    out.r += k.r;
    out.s += k.s;
    out.m += k.m;
    show();
  };

  tickPlay(h, 0, { paused: false, hub: false });
  for (let t = 0; t < WELCOME_MS; t += 1000) tickPlay(h, 1000, { paused: false, hub: false });
  show();
  if (policy === 'slide-only') {
    // She taps only the slide: it rests all play (no pond bubble without a learning place), Lumi's ducks line once.
    out.ducksLines = 1;
    at = SLIDE.ladderBase;
  }
  if (policy === 'idle-then-nearest') wait(10 * MIN);
  let walkedToSlide = false;
  for (let guard = 0; guard < 200; guard++) {
    if (bedtimeDue(h, { dressing: false })) break;
    if (policy === 'slide-only') {
      wait(BEDTIME_MS_CAP);
      continue;
    }
    // 0.2 min between places: not before the first one, which comes straight after the welcome.
    if (out.places.length && wait(BETWEEN_MS)) break;
    let p: HubPlace | null = null;
    if (policy === 'pond-lover') p = h.shown.find((q) => q === 'pond') ?? h.shown.find((q) => q === 'corner') ?? nearest(at, learningShown());
    else if (policy === 'skips-corner') {
      if (h.shown.includes('pond')) p = 'pond';
      else {
        // At the resting slide she waits for the 90 s nudge, then takes the nearest learning bubble.
        if (!walkedToSlide || at !== SLIDE.ladderBase) {
          wait((walkM(at, 'pond') / WALK_M_S) * 1000);
          at = SLIDE.ladderBase;
          walkedToSlide = true;
        }
        const n0 = out.nudges.length;
        if (wait(BEDTIME_MS_CAP, () => out.nudges.length > n0)) break;
        p = nearest(at, learningShown());
      }
    } else p = nearest(at, h.shown);
    if (!p) {
      if (wait(BEDTIME_MS_CAP, () => h.shown.length > 0)) break;
      continue;
    }
    go(p);
  }
  out.early = h.early;
  out.bedtimeAt = h.playMs;
  out.m += BEDTIME_M;
  return out;
}

/** A wait long enough to reach bedtime from anywhere in a play. */
const BEDTIME_MS_CAP = 40 * MIN;

/**
 * Random hub histories for the invariant test: random choices among the shown bubbles, random waits and place lengths
 * (so cutoffs pass in the middle), a random maths quest and a wish baby that comes and goes. One step per refill, with
 * what was left in it, the learning bubbles that stayed from the refill before, and whether the kind just finished
 * held back a place that could otherwise run.
 */
export function randomHistory(seed: number): { shown: HubPlace[]; left: HubPlace[]; stayed: HubPlace[]; afterSameKind: boolean }[] {
  const rand = seeded(seed);
  const maths = rand() < 0.5 ? 'beads' : 'rack';
  const h: HubState = startHub();
  const steps: { shown: HubPlace[]; left: HubPlace[]; stayed: HubPlace[]; afterSameKind: boolean }[] = [];
  const tick = (ms: number) => {
    for (let t = 0; t < ms; t += 1000) tickPlay(h, 1000, { paused: false, hub: true });
  };
  let r = 0;
  let m = 0;
  for (let k = 0; k < 40 && h.playMs < h.bedMs; k++) {
    const c: HubCtx = { maths, wishBaby: rand() < 0.8, moments: { r, m } };
    const before = h.shown.filter((p) => LEARNING.includes(p));
    const left = HUB_PLACES.filter((p) => isLeft(h, p, c));
    // The just-finished rule held a place back: it would be left if the last place had been of another kind.
    const other: HubState = { ...h, done: [...h.done, 'pond'] };
    const afterSameKind = LEARNING.some((p) => !isLeft(h, p, c) && isLeft(other, p, c));
    h.shown = refill(h, c);
    steps.push({ shown: h.shown.slice(), left, stayed: before.filter((p) => isLeft(h, p, c)), afterSameKind });
    if (!h.shown.length) {
      tick(60_000);
      continue;
    }
    tick(Math.floor(rand() * 4) * 30_000);
    const p = h.shown[Math.floor(rand() * h.shown.length)];
    h.running = p;
    tick(30_000 + Math.floor(rand() * 10) * 30_000);
    h.running = null;
    placeEnded(h, p, c);
    h.shown = h.shown.filter((q) => q !== p);
    r += LEARNING.includes(p) && p !== 'beads' && p !== 'rack' ? 1 : 0;
    m += p === 'beads' || p === 'rack' || p === 'egg' || p === 'shore' || p === 'ride' ? 3 : 0;
  }
  return steps;
}
