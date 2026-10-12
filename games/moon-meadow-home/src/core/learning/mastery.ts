// G/src/core/learning/mastery.ts
// Step mastery (spec 3.4): the pass window, the pass check, and reopening and closing a passed step.
import type { Budget, ItemId } from '../content/types.ts';
import type { ItemMemory, Result, StepState } from './types.ts';

/** Reopened steps close only when the good run covers at least this many days. */
const CLOSE_DAYS = 2;

export function newStepState(): StepState {
  return {
    level: 1, up: 0, down: 0, window: [], passed: false, passedT: null, placed: false,
    review: [], reopened: false, closeRun: [], startT: null,
  };
}

export function pushWindow(s: StepState, r: Result, day: number, b: Budget): void {
  s.window.push({ r, day });
  if (s.window.length > b.passWindow) s.window.splice(0, s.window.length - b.passWindow);
}

/** `stepItems` holds only the step's servable items, so an item no carrier can serve never blocks a pass. */
export function readyToPass(s: StepState, stepItems: ItemId[], mem: Record<ItemId, ItemMemory>, top: 1 | 2 | 3, b: Budget): boolean {
  if (s.passed || s.level !== top) return false;
  const firsts = s.window.filter(w => w.r === 'first');
  if (firsts.length < b.passFirst) return false;
  if (new Set(s.window.map(w => w.day)).size < b.passDays) return false;
  return stepItems.every(id => (mem[id]?.firsts ?? 0) > 0);
}

export function recordReview(s: StepState, r: Result, day: number, b: Budget): void {
  if (!s.reopened) {
    s.review.push(r);
    if (s.review.length > b.reopenWindow) s.review.splice(0, s.review.length - b.reopenWindow);
    if (s.review.length === b.reopenWindow && s.review.filter(x => x === 'first').length < b.reopenMinFirst) {
      s.reopened = true;
      s.closeRun = [];
    }
    return;
  }
  s.closeRun.push({ r, day });
  if (s.closeRun.length > b.closeWindow) s.closeRun.splice(0, s.closeRun.length - b.closeWindow);
  if (s.closeRun.length < b.closeWindow) return;
  const firsts = s.closeRun.filter(x => x.r === 'first');
  if (firsts.length >= b.closeFirst && new Set(s.closeRun.map(x => x.day)).size >= CLOSE_DAYS) {
    s.reopened = false;
    s.review = [];
    s.closeRun = [];
  }
}
