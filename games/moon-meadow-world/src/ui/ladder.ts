// The hint ladder of one checked moment (v3 spec 3.3, ported from v3's core/places/hints.ts):
//   level 1  idle (15 s, 10 s on reading): the goal again
//   level 2  one miss, or a second idle: the focused hint
//   level 3  two misses: the ghost hand shows the answer, result 'helped'
// Idle never goes past level 2; an idle after the ghost only nudges (the moment says its next step again). An answer
// after a level 2 hint is 'helped', because the hint gives part of the answer (spec 3.3), whether a miss or idling
// brought it. A miss answered right before any hint ran would be 'miss'. The state functions are pure; HintRunner
// adds the timer.
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
export type HintEffect = 'repeat' | 'focused' | 'ghost' | 'nudge';

export function idleDelay(strand: Strand): number {
  return strand === 'reading' ? 10_000 : 15_000;
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

export function onMiss(s: LadderState): [LadderState, HintEffect | null] {
  if (s.done) return [s, null];
  const misses = s.misses + 1;
  if (misses >= 2) return [{ ...s, misses, level: 3, touchedSinceIdle: true }, 'ghost'];
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
  /** Level 3: the ghost hand shows the answer; the moment then makes the move itself. */
  ghost(): Promise<void>;
  /** An idle after the ghost: the moment says its next step again (a safety net when the answer is not finished). */
  nudge?(still: () => boolean): Promise<void>;
  /** True while speech plays that an idle step must not cut into. */
  busy?(): boolean;
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
  /** True while a hint (repeat or focused) is running. */
  hinting = false;

  constructor(strand: Strand, hooks: LadderHooks) {
    this.strand = strand;
    this.hooks = hooks;
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

  /** A wrong answer: the focused hint or the ghost, in the background. Resolves when the hint has run. */
  async miss(): Promise<void> {
    let fx: HintEffect | null;
    [this.state, fx] = onMiss(this.state);
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
    this.stopTimer();
    this.hintToken++;
  }

  private stopTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private arm(): void {
    this.stopTimer();
    if (this.state.done || !this.opened) return;
    this.timer = setTimeout(() => this.idle(), idleDelay(this.strand));
  }

  private idle(force = false): void {
    if (this.state.done) return;
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
      else if (fx === 'nudge') await this.hooks.nudge?.(still);
      else await this.hooks.ghost();
    } finally {
      if (mine === this.hintToken) this.hinting = false;
    }
  }
}
