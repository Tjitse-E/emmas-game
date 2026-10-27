// What the stones of the egg moment act on (src/ui/egg.ts): the egg's cups, or the hay rack's bundles (src/ui/hay.ts).
// runEgg runs the stones, the sleep and wake, the ladder and the speech; a skin draws the panel and what a stone does.
import type { MomentHooks } from '../contracts';
import type { Point } from './geometry';

export type React = Parameters<MomentHooks['react']>[0];

/** What the stones act on: the egg's cups or the hay rack's bundles. runEgg runs the stones, the ladder and the speech. */
export interface Skin {
  /** The drop target and the 'cups' target of the snapshot. */
  readonly panel: HTMLElement;
  /** True while the answer cannot be counted off the panel (blanket or board on, extra cups not marked). */
  covered(): boolean;
  /** A stone was dropped: the cover comes off for good, so its effect shows. */
  lift(): Promise<void>;
  /** The focused hint: everything that matters shows. */
  reveal(): Promise<void>;
  /** True when reveal() waits for the hint line ("Let's count the empty spaces."), false when it runs with it. */
  readonly revealAfterHintLine: boolean;
  /** The places the hint counts, in order (count[i] is said at place i). */
  hintPlaces(): HTMLElement[];
  /** A stone of k landed above the panel at `from`: its dots or bundles fly in. Resolves with the spill (too big). */
  show(k: number, from: Point): Promise<HTMLElement[]>;
  /** A wrong stone (k - answer = diff), while the miss line plays: show what is wrong; returns the 3D reaction. */
  wrong(diff: number, spill: HTMLElement[]): React;
  /** After the miss line: back to how it started. */
  reset(spill: HTMLElement[]): void;
  /** The right stone landed: everything is glad. Returns a reaction for at once (before the praise), if any. */
  right(): React | null;
  /** The reaction after the praise, if any (the egg warms and is ready to hatch). */
  readonly afterPraise: React | null;
}

/** A gentle pulse on a place the hint counts or a stone just filled (restarts if it is still running). */
export function pulse(e: HTMLElement | undefined): void {
  if (!e) return;
  e.classList.remove('pulse');
  void e.offsetWidth;
  e.classList.add('pulse');
}
