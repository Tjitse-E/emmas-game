// The moment controller (Task A3, contracts C7): one checked moment with its spoken goal, the hint ladder
// (src/core/places/hints.ts), the idle flag, the result and the decision time. Heartbeat's hint runner and
// integration's Moving Day door wrap it. Pure apart from its deps: `src/ui/moment-deps.ts` wires the store,
// the audio facade, platform's moonbeam and ghost hand (R10), so this file loads in a plain unit test.
import { idleDelay, onAnswer, onIdle, onMiss, onTouch, openMoment, type HintEffect, type MomentState } from '../core/places/hints.ts';
import type { AnyStrand, Result, StepId } from '../core/places/types.ts';
import type { PlaceAction } from '../core/places/actions.ts';
import type { Target } from './targets.ts';

export type MomentDeps = {
  now(): number;
  /** Returns a cancel function. */
  setTimer(fn: () => void, ms: number): () => void;
  say(ids: string[]): Promise<void>;
  /** Emma acted: running speech stops (audio.act). */
  act(): void;
  dispatch(a: PlaceAction): void;
  /** R51: false when the goal clip is missing (never generated, or speech-to-text marked it not ok). */
  hasClip(id: string): boolean;
  /** The default focused hint: the moonbeam on the target. */
  show?(target: Target): void;
  /** The default ghost hint: the ghost hand taps the target. */
  demo?(target: Target): Promise<void> | void;
  /** Takes the moonbeam and the ghost hand away when the moment ends. */
  clear?(): void;
};

export type MomentOpts = {
  /** The learning strand of the moment; without one (a Moving Day door) no idle flag is logged. */
  strand?: AnyStrand;
  step?: StepId | null;
  place: string;
  /** Clip ids of the spoken goal. */
  goal: string[];
  /** The right answer: an element, its aria-label, or a stage point. Used by the default hints and `target()`. */
  target?: () => Target | null;
  /** Level 2: the moonbeam on the part that matters (default: the moonbeam on `target`). */
  focused?(): Promise<void> | void;
  /** Level 3: the ghost hand shows the answer (default: the ghost hand taps `target`). */
  ghost?(): Promise<void> | void;
  /** The test hook's answer: the scene makes the right move. */
  hookAnswer?(): void;
  /** The test hook's wrong move of a given kind ('one-for-many', 'count-low', ...). Default: a plain miss. */
  hookWrong?(kind?: string): void;
};

export type Moment = {
  readonly state: MomentState;
  start(): Promise<void>;
  touch(): void;
  miss(): void;
  answer(chosenTouchAt?: number): { result: Result; ms: number };
  replay(): Promise<void>;
  dispose(): void;
  hookAnswer(): void;
  hookWrong(kind?: string): void;
  hookIdle(): void;
  /** aria-label of the right answer, so a flow can tap it for real (contracts C7). */
  target(): string | null;
};

let active: Moment | null = null;
/** The moment on screen, for the test hook's answer, wrong, idle and target fallback (master Task I-3b). */
export function activeMoment(): Moment | null {
  return active;
}

function labelOf(t: Target | null | undefined): string | null {
  if (typeof t === 'string') return t;
  if (t && typeof (t as Element).getAttribute === 'function') return (t as Element).getAttribute('aria-label');
  return null;
}

export function createMoment(o: MomentOpts, d: MomentDeps): Moment {
  const strand: AnyStrand = o.strand ?? 'r';
  let state = openMoment(strand, d.now());
  let cancel: (() => void) | null = null;
  let firstChosenTouch: number | null = null;

  const focused = async () => {
    if (o.focused) return o.focused();
    const t = o.target?.();
    if (t) d.show?.(t);
  };
  const ghost = async () => {
    if (o.ghost) return o.ghost();
    const t = o.target?.();
    if (t) await d.demo?.(t);
  };

  const run = (fx: HintEffect[]) => {
    for (const f of fx) {
      if (f.kind === 'repeat-goal') void d.say(o.goal);
      if (f.kind === 'focused') void focused();
      if (f.kind === 'ghost-answer') void ghost();
      if (f.kind === 'idle-flag' && o.strand) {
        d.dispatch({ type: 'place/idle', strand: o.strand, step: o.step ?? null, place: o.place, level: 2 });
      }
    }
  };
  const arm = () => {
    cancel?.();
    cancel = null;
    if (state.done) return;
    cancel = d.setTimer(() => idle(), idleDelay(strand));
  };
  const idle = () => {
    let fx: HintEffect[];
    [state, fx] = onIdle(state);
    run(fx);
    arm();
  };

  const m: Moment = {
    get state() { return state; },
    async start() {
      active = m;
      state = openMoment(strand, d.now());
      firstChosenTouch = null;
      const missing = o.goal.length > 0 && o.goal.some((id) => !d.hasClip(id));
      if (missing) {
        // R51: she cannot hear the goal, so she sees it: the moonbeam on the target and one ghost demo now.
        // The answer counts as helped (the ghost showed it), the same as after a level 3 hint.
        state = { ...state, level: 2, idleHint: true };
        void focused();
        void ghost();
      }
      arm();
      await d.say(o.goal);   // still asked for, so the facade records the gap in audio.missing (R52)
    },
    touch() {
      if (state.done) return;
      d.act();
      state = onTouch(state);
      firstChosenTouch ??= d.now();
      arm();
    },
    miss() {
      if (state.done) return;
      d.act();
      let fx: HintEffect[];
      [state, fx] = onMiss(state);
      firstChosenTouch = null;
      run(fx);
      arm();
    },
    answer(chosenTouchAt?: number) {
      d.act();
      const out = onAnswer(state, chosenTouchAt ?? firstChosenTouch ?? d.now());
      state = out.state;
      m.dispose();
      return { result: out.result, ms: out.ms };
    },
    async replay() {
      if (state.done) return;
      state = onTouch(state);
      arm();
      await d.say(o.goal);
    },
    dispose() {
      cancel?.();
      cancel = null;
      if (active === m) {
        active = null;
        d.clear?.();
      }
    },
    hookAnswer() {
      d.act();
      o.hookAnswer?.();
    },
    hookWrong(kind?: string) {
      d.act();
      if (o.hookWrong) o.hookWrong(kind);
      else m.miss();
    },
    hookIdle() {
      cancel?.();
      cancel = null;
      idle();
    },
    target() {
      return labelOf(o.target?.());
    },
  };
  return m;
}
