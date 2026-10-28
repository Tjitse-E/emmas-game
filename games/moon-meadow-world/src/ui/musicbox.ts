// The wardrobe's music box (docs/v4/2.3.md sections 3 and 16), without the DOM: the tune plays for limitMs while six
// moon beads fade, one every limitMs / 6. There is no clock and no number. 15 s before the end Elizabeth says
// "Nearly ready!" (unless someone is speaking: then it waits at most 3 s, and is skipped). onBox(true) when the tune
// starts and onBox(false) when it stops, so the game counts the Corner's free time as the box's time. At the end the
// panel stops taking new touches and waits until no finger is down (Fingers, at most FINGERS_WAIT_MS), then ends
// kindly. Done stops the tune sooner. audio.stop() never stops it; stop() here does.
import type { MusicBox } from '../audio';

/** "Nearly ready!" this long before the end. */
export const NEARLY_BEFORE_MS = 15_000;
/** The nearly line waits this long for speech to end, then it is skipped. */
export const NEARLY_WAIT_MS = 3000;
/** The kind ending waits at most this long for her fingers to lift. */
export const FINGERS_WAIT_MS = 2000;
export const BEAD_COUNT = 6;
/** A bead fades from 1 to BEAD_DIM over this long. */
export const BEAD_FADE_MS = 600;
export const BEAD_DIM = 0.25;

const NEARLY_POLL_MS = 100;

/** When each of the six beads fades: one every limitMs / 6, the last one at the end. */
export function beadTimes(limitMs: number): number[] {
  return Array.from({ length: BEAD_COUNT }, (_, i) => Math.round(((i + 1) * limitMs) / BEAD_COUNT));
}

/** When "Nearly ready!" is due, or null when the box is too short for it (the flows' 5 s box). */
export function nearlyAt(limitMs: number): number | null {
  return limitMs > NEARLY_BEFORE_MS ? limitMs - NEARLY_BEFORE_MS : null;
}

export interface BoxDeps {
  /** audio.musicBox: the tune for `ms`. */
  musicBox(ms: number): MusicBox;
  /** Someone speaks now (the nearly line never cuts a word). */
  speaking(): boolean;
  /** Say "Nearly ready!" (as guidance, so the pick words wait for it). */
  nearly(): void;
  /** Fade bead i (0 to 5). */
  bead(i: number): void;
  /** The tune started (true) or stopped (false). */
  onBox(on: boolean): void;
  /** The tune ran out: the panel ends kindly. */
  timeUp(): void;
  now?(): number;
}

/** One music box run. start() once the rails take touches; stop() on Done or when the panel closes. */
export class BoxClock {
  readonly limitMs: number;
  private readonly deps: BoxDeps;
  private box: MusicBox | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private startedAt = 0;
  private left: number;
  private on = false;

  constructor(limitMs: number, deps: BoxDeps) {
    this.limitMs = Math.max(0, limitMs);
    this.left = this.limitMs;
    this.deps = deps;
  }

  private now(): number {
    return this.deps.now ? this.deps.now() : performance.now();
  }

  /** The tune is playing. */
  get running(): boolean {
    return this.on;
  }

  /** The time the box has left: all of it before the start, what was left at a stop, 0 after the end. */
  get leftMs(): number {
    return this.on ? Math.max(0, this.limitMs - (this.now() - this.startedAt)) : this.left;
  }

  start(): void {
    if (this.box) return;
    this.startedAt = this.now();
    this.on = true;
    this.box = this.deps.musicBox(this.limitMs);
    this.deps.onBox(true);
    beadTimes(this.limitMs).forEach((t, i) => this.later(t, () => this.deps.bead(i)));
    const n = nearlyAt(this.limitMs);
    if (n !== null) this.later(n, () => this.sayNearly(0));
    // Our own timer, so the end never waits on the audio context (a silent iPad keeps time too).
    this.later(this.limitMs, () => this.end());
  }

  /** Done, or the panel closing: the tune stops now. */
  stop(): void {
    if (!this.on) return;
    this.left = this.leftMs;
    this.halt();
  }

  private end(): void {
    if (!this.on) return;
    this.left = 0;
    this.halt();
    this.deps.timeUp();
  }

  private halt(): void {
    this.on = false;
    for (const t of this.timers.splice(0)) clearTimeout(t);
    this.box?.stop();
    this.deps.onBox(false);
  }

  private sayNearly(waited: number): void {
    if (!this.on) return;
    if (!this.deps.speaking()) {
      this.deps.nearly();
      return;
    }
    if (waited >= NEARLY_WAIT_MS) return;
    this.later(NEARLY_POLL_MS, () => this.sayNearly(waited + NEARLY_POLL_MS));
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }
}
