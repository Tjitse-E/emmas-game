// The choice hub (2.4.0, docs/v4/2.4.md sections 5.2 and 5.6): after the welcome Emma picks from three learning
// bubbles and at most one play bubble, until bedtime at 30 minutes of play time. This file holds the hub's pure state
// and rules; hub-part.ts runs it in the world. Step 0 writes the constants, the state and its snapshot; the hub lane
// writes the rules (docs/v4/2.4-plan.md Tasks 1 to 6). BEDTIME_MS is the only bedtime number: every cutoff derives
// from it.
import type { Game } from './game';
import type { HubPlace } from './options';

export type { HubPlace } from './options';

/** Bedtime starts at 30:00 of play time (Tjitse, 30 October 2026: "bedtime after 30 minutes instead of 20"). */
export const BEDTIME_MS = 30 * 60_000;
/** A pond visit ends 3 minutes after she arrives (Tjitse: 3-minute visits), or after POND_SLIDES slides, or at bedtime. */
export const POND_VISIT_MS = 180_000;
export const POND_SLIDES = 6;
/** The nudge: after 90 s of hub time with no place running, then every 90 s. Touches never reset it. */
export const NUDGE_MS = 90_000;
/** A quiet prompt after 30 s without a touch. */
export const PROMPT_MS = 30_000;
/** The Dressing Corner's music box, always 60 s (decision 1 of 2.3); `cornerLimitMs` goes. Off the play clock. */
export const CORNER_BOX_MS = 60_000;
/** A walk that ends within this of an offered place, after its bubble shows, starts it. */
export const STOP_NEAR_M = 2.5;
/** The bubbles pop in this far apart, each with a sparkle on its place. */
export const POP_GAP_MS = 400;
/** The hub's longest wait: a safety only, bedtime ends the hub long before. */
export const FREE_WAIT_MS = 40 * 60_000;

export interface HubState {
  readonly bedMs: number;
  /** Play time in ms (tickPlay). */
  playMs: number;
  /** The bubbles now: learning ones in slot order, then the play bubbles. */
  shown: HubPlace[];
  /** playMs when each shown bubble first showed (the nudge's tie, and a walk end starts a place only after this). */
  shownAt: Partial<Record<HubPlace, number>>;
  /** Finished places in order (the sq letters). */
  done: HubPlace[];
  running: HubPlace | null;
  asked: HubPlace | null;
  shoreLanded: boolean;
  /** The play bubbles earned and waiting: at most one, two only after done early (the pond and the Corner). */
  play: ('corner' | 'pond')[];
  /** playMs when done early began, or null. */
  early: number | null;
  /** Done early's wait: play time with no place running since done early began or since the last place ended after it. */
  earlyIdleMs: number;
  /**
   * The nudge's count: hub play time with no place running (a pond visit is a running place) since the last place
   * ended or the last nudge. Touches never reset it.
   */
  nudgeIdleMs: number;
  /** The pond visit under way, and the pond's time so far this play. */
  visit: { fromMs: number; slides: number } | null;
  pondMs: number;
  /** playMs when bedtime began. */
  bedtimeAt: number | null;
  /** Hub play time with no place running (the play line's fr). */
  idleMs: number;
}

/** A new play's hub: nothing shown or done yet, bedtime at `bedMs` (?bed=, else BEDTIME_MS). */
export function startHub(bedMs: number = BEDTIME_MS): HubState {
  return {
    bedMs, playMs: 0, shown: [], shownAt: {}, done: [], running: null, asked: null, shoreLanded: false, play: [], early: null,
    earlyIdleMs: 0, nudgeIdleMs: 0, visit: null, pondMs: 0, bedtimeAt: null, idleMs: 0,
  };
}

// ---- the play clock, the cutoffs and bedtime (5.6; plan Task 1) ---------------------------------------------------

/** The play clock's times for one bedtime: the last ride, the last egg, the last place, done early's last check and wait. */
export interface Cutoffs {
  ride: number;
  egg: number;
  all: number;
  early: number;
  wait: number;
  bed: number;
}

/** Bedtime under this is a flow's short ?bed=: its cutoffs scale with it. */
const SHORT_BED_MS = 5 * 60_000;

/**
 * 4, 3, 2 and 1 minutes before bedtime and a 2-minute wait; under 5 minutes 87%, 90%, 93% and 97% of it and a wait of
 * 7%. Everything derives from the one bedtime, so ?bed= moves every cutoff with it.
 */
export function cutoffs(bedMs: number): Cutoffs {
  if (bedMs < SHORT_BED_MS) {
    const at = (f: number) => Math.round(bedMs * f);
    return { ride: at(0.87), egg: at(0.9), all: at(0.97), early: at(0.93), wait: at(0.07), bed: bedMs };
  }
  const min = 60_000;
  return { ride: bedMs - 4 * min, egg: bedMs - 3 * min, all: bedMs - min, early: bedMs - 2 * min, wait: 2 * min, bed: bedMs };
}

/** The longest frame the play clock counts: a hidden tab or a stall never jumps the clock. */
const FRAME_CAP_MS = 1000;

/**
 * One frame of play time: rawMs capped at 1000, nothing while paused (the start mirror, the Corner's music box). With
 * `hub` (the hub part runs) and no place running it also adds to idleMs, nudgeIdleMs and, after done early, earlyIdleMs.
 */
export function tickPlay(h: HubState, rawMs: number, o: { paused: boolean; hub: boolean }): void {
  if (o.paused || !(rawMs > 0)) return;
  const ms = Math.min(rawMs, FRAME_CAP_MS);
  h.playMs += ms;
  if (!o.hub || h.running) return;
  h.idleMs += ms;
  h.nudgeIdleMs += ms;
  if (h.early !== null) h.earlyIdleMs += ms;
}

/** Past the place's cutoff: ride at `ride`, egg and shore at `egg`, every other place at `all`. */
export function isPast(h: HubState, p: HubPlace): boolean {
  const c = cutoffs(h.bedMs);
  return h.playMs >= (p === 'ride' ? c.ride : p === 'egg' || p === 'shore' ? c.egg : c.all);
}

/**
 * Bedtime may start: no place runs and the wardrobe is closed, and the play clock has reached bedtime, or she is done
 * early and either no play bubble is left or done early's wait has passed with no place running. Nothing else starts
 * bedtime before 30:00.
 */
export function bedtimeDue(h: HubState, o: { dressing: boolean }): boolean {
  if (h.running || o.dressing) return false;
  const c = cutoffs(h.bedMs);
  if (h.playMs >= c.bed) return true;
  return h.early !== null && (h.play.length === 0 || h.earlyIdleMs >= c.wait);
}

// ---- the refill and the play bubbles (5.2, 5.6; plan Task 2) -----------------------------------------------------

/** How often each place can run in a play. A pond visit comes once per pond bubble, so the pond has no limit of its own. */
export const PLACE_LIMIT: Record<HubPlace, number> = { egg: 1, shore: 1, wish: 2, picnic: 1, beads: 1, rack: 1, ride: 2, corner: 1, pond: Infinity };
/** The places with reading or maths in them; the Corner and the pond are play places. */
export const LEARNING: readonly HubPlace[] = ['egg', 'shore', 'ride', 'picnic', 'beads', 'rack', 'wish'];
/** At most one bubble of each kind shows: the two eggs are one kind, and so are the two maths quests. */
export const KIND: Record<HubPlace, 'egg' | 'wish' | 'picnic' | 'maths' | 'ride' | 'corner' | 'pond'> = {
  egg: 'egg', shore: 'egg', wish: 'wish', picnic: 'picnic', beads: 'maths', rack: 'maths', ride: 'ride', corner: 'corner', pond: 'pond',
};
/** Each place's strands: an egg and a ride have sums and their newborn's naming and wish; the picnic and a wish are reading. */
export const STRANDS: Record<HubPlace, readonly ('r' | 'm')[]> = {
  egg: ['r', 'm'], shore: ['r', 'm'], wish: ['r'], picnic: ['r'], beads: ['m'], rack: ['m'], ride: ['r', 'm'], corner: [], pond: [],
};
/** The play line's sq letters (5.8). */
export const LETTER: Record<HubPlace, string> = { egg: 'e', shore: 's', wish: 'w', picnic: 'p', beads: 'b', rack: 'k', ride: 'r', corner: 'c', pond: 'o' };

/**
 * What the refill reads besides the hub: this play's maths quest, whether a herd baby can wait with a wish, and the
 * moments she has done this play per strand (reading counts spelling too).
 */
export interface HubCtx {
  maths: 'beads' | 'rack';
  wishBaby: boolean;
  moments: { r: number; m: number };
}

const SLOTS = 3;
const timesDone = (h: HubState, p: HubPlace): number => h.done.reduce((n, q) => n + (q === p ? 1 : 0), 0);

/** The place could start now if the just-finished rule did not exist: under its limit, before its cutoff, landed, this play's. */
function canRun(h: HubState, p: HubPlace, c: HubCtx): boolean {
  if (timesDone(h, p) >= PLACE_LIMIT[p] || isPast(h, p)) return false;
  if (p === 'shore' && !h.shoreLanded) return false;
  if ((p === 'beads' || p === 'rack') && p !== c.maths) return false;
  if (p === 'wish' && !c.wishBaby) return false;
  return true;
}

/** Some learning place can still run this play (each other one is done, past its cutoff or not landed). */
const learningLeft = (h: HubState, c: HubCtx, but: (p: HubPlace) => boolean = () => false): boolean =>
  LEARNING.some((p) => !but(p) && canRun(h, p, c));

/**
 * Can start in this refill (5.2's "left"): under its limit, before its cutoff, the shore egg once it has landed, and
 * not the kind just finished. That last rule gives way when it would leave no learning place, so ride 2 or wish 2
 * comes back at once when it is the only learning place left. A play place is left while its bubble is earned.
 */
export function isLeft(h: HubState, p: HubPlace, c: HubCtx): boolean {
  if (!canRun(h, p, c)) return false;
  if (p === 'corner' || p === 'pond') return h.play.includes(p);
  const last = h.done.at(-1);
  if (!last || KIND[last] !== KIND[p]) return true;
  return !learningLeft(h, c, (q) => KIND[q] === KIND[last]);
}

/**
 * The bubbles after a refill: the shown learning bubbles that are still left stay where they are (nothing swaps while
 * she decides), and each empty slot of three fills with the first place left that does not show yet, in 5.2's order:
 * (1) a missing strand, maths first, from egg, shore, ride, the maths quest (or picnic), wish; (2) the egg; (3) the
 * ride; (4) of the picnic and the maths quest, the one whose strand the bubbles lack, else the strand with fewer
 * moments this play (a tie to reading); (5) a herd baby's wish. Then the play bubbles in their order. From the last
 * cutoff (29:00) nothing. Pure.
 */
export function refill(h: HubState, c: HubCtx): HubPlace[] {
  if (h.playMs >= cutoffs(h.bedMs).all) return [];
  const out = h.shown.filter((p, i, all) => LEARNING.includes(p) && all.indexOf(p) === i && isLeft(h, p, c));
  const has = (s: 'r' | 'm') => out.some((p) => STRANDS[p].includes(s));
  const can = (p: HubPlace) => isLeft(h, p, c) && !out.some((q) => KIND[q] === KIND[p]);
  const next = (): HubPlace | null => {
    for (const s of ['m', 'r'] as const) {
      if (has(s)) continue;
      const list: HubPlace[] = s === 'm' ? ['egg', 'shore', 'ride', c.maths] : ['egg', 'shore', 'ride', 'picnic', 'wish'];
      const p = list.find(can);
      if (p) return p;
    }
    const first = (['egg', 'shore', 'ride'] as const).find(can);
    if (first) return first;
    const picnic = can('picnic');
    const maths = can(c.maths);
    if (picnic && maths) {
      if (!has('r')) return 'picnic';
      if (!has('m')) return c.maths;
      return c.moments.m < c.moments.r ? c.maths : 'picnic';
    }
    if (picnic) return 'picnic';
    if (maths) return c.maths;
    return can('wish') ? 'wish' : null;
  };
  while (out.length < SLOTS) {
    const p = next();
    if (!p) break;
    out.push(p);
  }
  return [...out, ...h.play.filter((p) => isLeft(h, p, c))];
}

/**
 * A place finished, in this order: it is done; the nudge's and done early's counts start again; the shore egg lands
 * after the nest egg and one more learning place (or at once after the nest egg when no other learning place is left);
 * the play bubble (5.2: a learning place earns one when none waits, the Corner's while she has not been, else the
 * pond's; a waiting one swaps for the other while she has not been to the Corner; a visit uses its own); then done
 * early's check (5.6), only here, only before its last check: when no learning place can run any more she gets a last
 * pond bubble (only after a learning place, or when one still waits) and the Corner's if she has not been.
 */
export function placeEnded(h: HubState, p: HubPlace, c: HubCtx): void {
  h.done.push(p);
  h.nudgeIdleMs = 0;
  h.earlyIdleMs = 0;
  const learning = LEARNING.includes(p);
  if (!h.shoreLanded && h.done.includes('egg')) {
    if (p !== 'egg' && learning) h.shoreLanded = true;
    else if (p === 'egg' && !learningLeft(h, c, (q) => q === 'shore')) h.shoreLanded = true;
  }
  const cornerDone = h.done.includes('corner');
  if (p === 'pond' || p === 'corner') h.play = h.play.filter((q) => q !== p);
  else if (learning && h.early === null) {
    const waiting = h.play[0];
    if (!waiting) h.play = [cornerDone ? 'pond' : 'corner'];
    else if (!cornerDone) h.play = [waiting === 'corner' ? 'pond' : 'corner'];
  }
  if (h.early !== null || h.playMs >= cutoffs(h.bedMs).early || learningLeft(h, c)) return;
  h.early = h.playMs;
  const pond = learning || h.play.includes('pond');
  h.play = [...(pond ? (['pond'] as const) : []), ...(cornerDone ? [] : (['corner'] as const))];
}

/** The hub for the test hook (__game.state().hub). */
export function hubSnapshot(g: Game): {
  shown: HubPlace[];
  done: HubPlace[];
  running: HubPlace | null;
  playMs: number;
  play: ('corner' | 'pond')[];
  early: number | null;
  visit: { fromMs: number; slides: number } | null;
  bedtimeAt: number | null;
} {
  const h = g.hub;
  return {
    shown: h.shown.slice(), done: h.done.slice(), running: h.running, playMs: Math.round(h.playMs), play: h.play.slice(), early: h.early,
    visit: h.visit ? { ...h.visit } : null, bedtimeAt: h.bedtimeAt,
  };
}
