// The hint ladder of one checked moment (v3 spec 3.3, ported from v3's core/places/hints.ts):
//   level 1  idle (15 s; reading 10 s, or 14 s with 5 items): the goal again
//   level 2  one miss, or a second idle: the focused hint
//   level 3  two misses: the ghost hand shows the answer, result 'helped'
// Idle never goes past level 2; an idle after the ghost only nudges (the moment says its next step again). An answer
// after a level 2 hint is 'helped', because the hint gives part of the answer (spec 3.3), whether a miss or idling
// brought it. A miss answered right before any hint ran would be 'miss'. The state functions are pure; HintRunner
// adds the timer.
//
// Reading in 2.2.0 (docs/v4/2.2.md 3.1) has the miss step 'contrast': the first miss shows the word of the wrong
// picture and lights the letters that differ (level 1, not hinted), the next idle gives the focused hint, and a
// second miss brings the ghost. A right answer after only the contrast is 'miss': guessed, then read.
import type { MomentResult, Outcome } from '../contracts';

export type Strand = 'maths' | 'spelling' | 'reading';
export type HintLevel = 0 | 1 | 2 | 3;
export type LadderState = {
  level: HintLevel;
  misses: number;
  idles: number;
  touchedSinceIdle: boolean;
  /** A focused hint (level 2) has been given, after a miss or a second idle: the answer counts as helped. */
  hinted: boolean;
  done: boolean;
};
export type HintEffect = 'repeat' | 'focused' | 'contrast' | 'ghost' | 'nudge';
/** What one miss does: v3's focused hint, or the reading contrast. */
export type MissStep = 'focused' | 'contrast';

/** The quiet time before an idle step: 15 s, and for reading 10 s with up to 4 items or 14 s with 5. */
export function idleDelay(strand: Strand, items = 0): number {
  if (strand !== 'reading') return 15_000;
  return items >= 5 ? 14_000 : 10_000;
}

/** The quiet time before the name bells are asked for again: 20 s, then 5 s longer each time, at most 30 s. */
export function bellIdleDelay(repeats: number): number {
  return Math.min(30_000, 20_000 + Math.max(0, repeats) * 5_000);
}

export function openLadder(): LadderState {
  return { level: 0, misses: 0, idles: 0, touchedSinceIdle: true, hinted: false, done: false };
}

export function onIdle(s: LadderState): [LadderState, HintEffect | null] {
  if (s.done) return [s, null];
  const next: LadderState = { ...s, idles: s.idles + 1, touchedSinceIdle: false };
  if (s.level === 3) return [next, 'nudge'];
  if (s.level === 0) return [{ ...next, level: 1 }, 'repeat'];
  return [{ ...next, level: 2, hinted: true }, 'focused'];
}

export function onTouch(s: LadderState): LadderState {
  return s.done ? s : { ...s, touchedSinceIdle: true };
}

export function onMiss(s: LadderState, step: MissStep = 'focused'): [LadderState, HintEffect | null] {
  if (s.done) return [s, null];
  const misses = s.misses + 1;
  if (misses >= 2) return [{ ...s, misses, level: 3, touchedSinceIdle: true }, 'ghost'];
  // The contrast gives no sounds of the word, so the answer is not helped; the next idle gives the focused hint.
  if (step === 'contrast') return [{ ...s, misses, level: s.level === 0 ? 1 : s.level, touchedSinceIdle: true }, 'contrast'];
  return [{ ...s, misses, level: 2, hinted: true, touchedSinceIdle: true }, 'focused'];
}

export function outcomeOf(s: LadderState): Outcome {
  if (s.level === 3 || s.hinted) return 'helped';
  return s.misses > 0 ? 'miss' : 'first';
}

export interface LadderHooks {
  /** Level 1: say the goal again. */
  repeat(still: () => boolean): Promise<void>;
  /** Level 2: the focused hint. `still()` turns false when she touches something, so the hint stops early. */
  focused(reason: 'idle' | 'miss', still: () => boolean): Promise<void>;
  /** The first miss with missStep 'contrast': the word of the wrong picture and the letters that differ. */
  contrast?(still: () => boolean): Promise<void>;
  /** Level 3: the ghost hand shows the answer; the moment then makes the move itself. */
  ghost(): Promise<void>;
  /** An idle after the ghost: the moment says its next step again (a safety net when the answer is not finished). */
  nudge?(still: () => boolean): Promise<void>;
  /** True while speech plays that an idle step must not cut into. */
  busy?(): boolean;
}

export interface LadderOpts {
  /** What one miss does (default 'focused', v3's rule). */
  missStep?: MissStep;
  /** Items to choose from: a reading moment with 5 waits 14 s before an idle step instead of 10 s. */
  items?: number;
}

/** Runs the ladder for one moment: the idle timer, the hints and the result. */
export class HintRunner {
  state = openLadder();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private hintToken = 0;
  private openedAt = 0;
  private opened = false;
  private chosenAt: number | null = null;
  private readonly strand: Strand;
  private readonly hooks: LadderHooks;
  private readonly opts: LadderOpts;
  /** True while a hint (repeat, contrast or focused) is running. */
  hinting = false;
  /** close() was called: a hint still running when it resolves never arms the timer again (an orphan ladder). */
  private closed = false;

  constructor(strand: Strand, hooks: LadderHooks, opts: LadderOpts = {}) {
    this.strand = strand;
    this.hooks = hooks;
    this.opts = opts;
  }

  /**
   * Input is on, so an answer is possible: decision time starts and the idle timer runs (v3 spec 3.2). The goal may
   * still be playing; an idle step waits for it, and restartIdle() starts the quiet time again once it has ended.
   */
  open(now = performance.now()): void {
    this.opened = true;
    this.openedAt = now;
    this.arm();
  }

  /** The goal (and any demonstration) has just ended: the quiet time before the next idle step starts from now. */
  restartIdle(): void {
    this.arm();
  }

  /**
   * A touch on a thing of the moment. Ends a running hint and restarts the idle timer. Returns true when a hint was
   * running, so the moment can stop its speech ("a touch always ends a hint, and the touch still works").
   */
  touch(): boolean {
    if (this.state.done) return false;
    const was = this.hinting;
    this.state = onTouch(this.state);
    this.hintToken++;
    this.hinting = false;
    this.arm();
    return was;
  }

  /** She touched the object she then chose (decision time ends at the first such touch). */
  chose(now = performance.now()): void {
    this.chosenAt ??= now;
  }

  /** A wrong answer: the focused hint (or the contrast) or the ghost, in the background. Resolves when it has run. */
  async miss(): Promise<void> {
    let fx: HintEffect | null;
    [this.state, fx] = onMiss(this.state, this.opts.missStep);
    this.chosenAt = null;
    this.stopTimer();
    await this.run(fx, 'miss');
    this.arm();
  }

  /** Run the next idle step now, even while speech plays (test hook and flows). */
  idleNow(): void {
    this.idle(true);
  }

  /** The moment is solved: the result. */
  finish(now = performance.now()): MomentResult {
    const outcome = outcomeOf(this.state);
    const at = this.chosenAt ?? now;
    const ms = this.opened ? Math.max(0, Math.round(at - this.openedAt)) : 0;
    this.state = { ...this.state, done: true };
    this.close();
    return { outcome, misses: this.state.misses, ms };
  }

  close(): void {
    this.closed = true;
    this.stopTimer();
    this.hintToken++;
  }

  private stopTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private arm(): void {
    this.stopTimer();
    if (this.closed || this.state.done || !this.opened) return;
    this.timer = setTimeout(() => this.idle(), idleDelay(this.strand, this.opts.items));
  }

  private idle(force = false): void {
    if (this.closed || this.state.done) return;
    // Never talk over Elizabeth: wait a little and try again.
    if (!force && this.hooks.busy?.()) {
      this.stopTimer();
      this.timer = setTimeout(() => this.idle(), 1500);
      return;
    }
    let fx: HintEffect | null;
    [this.state, fx] = onIdle(this.state);
    void this.run(fx, 'idle').then(() => this.arm());
  }

  private async run(fx: HintEffect | null, reason: 'idle' | 'miss'): Promise<void> {
    if (!fx) return;
    const mine = ++this.hintToken;
    const still = () => mine === this.hintToken && !this.state.done;
    this.hinting = true;
    try {
      if (fx === 'repeat') await this.hooks.repeat(still);
      else if (fx === 'focused') await this.hooks.focused(reason, still);
      else if (fx === 'contrast') await this.hooks.contrast?.(still);
      else if (fx === 'nudge') await this.hooks.nudge?.(still);
      else await this.hooks.ghost();
    } finally {
      if (mine === this.hintToken) this.hinting = false;
    }
  }
}
