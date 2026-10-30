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
