// Hint ladder for one checked moment (spec 3.3, decision D1, R31). Pure: the moment controller
// (src/ui/moment.ts) runs the timers, audio and effects around it.
import type { AnyStrand, Result } from './types.ts';

export type HintLevel = 0 | 1 | 2 | 3;
export type MomentState = {
  strand: AnyStrand; level: HintLevel; misses: number; idles: number; touchedSinceIdle: boolean;
  idleFlagged: boolean; idleHint: boolean; openedAt: number; done: boolean;
};
export type HintEffect = { kind: 'repeat-goal' } | { kind: 'focused' } | { kind: 'ghost-answer' } | { kind: 'idle-flag' };

export function idleDelay(strand: AnyStrand): number {
  return strand === 'r' ? 10_000 : 15_000;
}

export function openMoment(strand: AnyStrand, now: number): MomentState {
  return { strand, level: 0, misses: 0, idles: 0, touchedSinceIdle: true, idleFlagged: false, idleHint: false, openedAt: now, done: false };
}

export function onIdle(s: MomentState): [MomentState, HintEffect[]] {
  if (s.done || s.level === 3) return [s, []];
  const second = s.idles >= 1 && !s.touchedSinceIdle;
  const next: MomentState = { ...s, idles: s.idles + 1, touchedSinceIdle: false };
  if (s.level === 0) return [{ ...next, level: 1 }, [{ kind: 'repeat-goal' }]];
  const fx: HintEffect[] = [{ kind: 'focused' }];
  if (second && !s.idleFlagged) { fx.push({ kind: 'idle-flag' }); next.idleFlagged = true; }
  return [{ ...next, level: 2, idleHint: s.misses === 0 ? true : s.idleHint }, fx];
}

export function onTouch(s: MomentState): MomentState {
  return s.done ? s : { ...s, touchedSinceIdle: true };
}

export function onMiss(s: MomentState): [MomentState, HintEffect[]] {
  if (s.done) return [s, []];
  const misses = s.misses + 1;
  if (misses >= 2) return [{ ...s, misses, level: 3, touchedSinceIdle: true }, [{ kind: 'ghost-answer' }]];
  return [{ ...s, misses, level: 2, touchedSinceIdle: true }, [{ kind: 'focused' }]];
}

export function onAnswer(s: MomentState, chosenTouchAt: number): { state: MomentState; result: Result; ms: number } {
  const ms = Math.max(0, chosenTouchAt - s.openedAt);
  let result: Result = 'first';
  if (s.level === 3 || s.idleHint) result = 'helped';
  else if (s.misses > 0) result = 'miss';
  return { state: { ...s, done: true }, result, ms };
}
