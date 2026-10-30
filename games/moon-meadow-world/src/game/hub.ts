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
