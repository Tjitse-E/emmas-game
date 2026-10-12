// The heartbeat controllers' hint interface on top of places' moment controller (R10, R31, Task 17B).
// The moment runs the hint ladder, the idle timer and the idle flag; the controller says its own goal and
// supplies the repeat, the focused hint and the ghost answer. The moment is also what the replay button
// and the test hook's activeMoment() fallback see.
import { createMoment, type Moment } from '../../ui/moment.ts';
import { defaultDeps } from '../../ui/moment-deps.ts';
import type { Target } from '../../ui/targets.ts';
import type { Strand } from '../../core/heartbeat/types.ts';

export type HintGoal = {
  step?: string | null;
  /** Says the goal again (idle level 1 and the replay button). */
  repeat: () => Promise<void>;
  /** Level 2: the part that matters (slow sounds, counting). */
  focused: () => Promise<void>;
  /** Level 3: the ghost hand shows the answer and the controller makes it. */
  answer: () => Promise<void>;
  /** The right answer's element or aria-label, for the test hook's target(). */
  target?: () => Target | null;
};

export interface HintRunner {
  begin(goal: HintGoal): void;
  touch(): void;
  miss(): Promise<void>;
  /** 2 after an idle-triggered focused hint, 3 after the ghost hand (master R31). */
  readonly level: 0 | 1 | 2 | 3;
  /** The test hook's idle(): runs the next idle step at once. */
  idle(): void;
  end(): void;
}

export function createHintRunner(meta: { place: string; strand: Strand }): HintRunner {
  let m: Moment | null = null;
  let ghosted = false;
  return {
    begin(g) {
      m?.dispose();
      ghosted = false;
      let started = false;
      const deps = defaultDeps();
      m = createMoment({
        strand: meta.strand, step: g.step ?? null, place: meta.place, goal: [],
        target: g.target,
        focused: () => g.focused(),
        ghost: async () => { ghosted = true; await g.answer(); },
      }, {
        ...deps,
        // The moment says its goal once at start (the controller already did), then on each repeat.
        say: async () => { if (started) await g.repeat(); started = true; },
      });
      void m.start();
    },
    touch() { m?.touch(); },
    async miss() { m?.miss(); },
    get level() {
      const s = m?.state;
      if (!s) return ghosted ? 3 : 0;
      if (ghosted || s.level === 3) return 3;
      if (s.idleHint) return 2;
      return Math.min(s.level, 1) as 0 | 1;
    },
    idle() { m?.hookIdle(); },
    end() { m?.dispose(); },
  };
}
