// G/src/core/learning/leitner.ts
// Leitner boxes (spec 3.4): box moves after a result and the rule for when an item is due again.
import type { Budget, ItemId } from '../content/types.ts';
import type { Box, ItemMemory, Result, VisitState } from './types.ts';
import { DAY_MS, HOUR_MS } from './time.ts';

/** First try: up one box (4 to 5 and 5 to retired need a fast answer for fluency items). Otherwise down by the table. */
export function nextBox(box: Box, r: Result, fast: boolean, fluency: boolean): Box {
  if (r === 'first') {
    if (box >= 6) return 6;
    if (fluency && box >= 4 && !fast) return box;
    return (box + 1) as Box;
  }
  if (box <= 1) return box;
  if (box <= 3) return 1;
  if (box === 4) return 2;
  return 3;
}

export function newMemory(): ItemMemory {
  return { box: 0, lastT: 0, lastVisit: 0, seen: 0, firsts: 0, seeded: false, placedInit: false };
}

/** Applies one result. `countFirst` is false for probes, so a probe never counts as a first try toward a pass. */
export function updateMemory(m: ItemMemory, r: Result, t: number, visitSeq: number, fast: boolean, fluency: boolean, countFirst: boolean): void {
  m.box = nextBox(m.box, r, fast, fluency);
  m.lastT = Math.max(m.lastT, t);
  m.lastVisit = Math.max(m.lastVisit, visitSeq);
  m.seen += 1;
  if (r === 'first' && countFirst) m.firsts += 1;
}

function daysFor(box: Box, b: Budget): number {
  return box >= 6 ? b.retiredDays : b.boxDays[box - 2];
}

export function dueAt(m: ItemMemory, b: Budget): number {
  if (m.box <= 1) return m.lastT;
  return m.lastT + daysFor(m.box, b) * DAY_MS;
}

export function isDue(id: ItemId, m: ItemMemory, now: number, v: VisitState, b: Budget): boolean {
  if (m.box === 0) {
    if (m.lastVisit < v.seq) return true;
    // No counter means nothing tracked it this visit, so it is not held back.
    return (v.box0[id] ?? b.box0Gap) >= b.box0Gap;
  }
  if (m.box === 1) return m.lastVisit < v.seq && v.startT >= m.lastT + b.box1MinHours * HOUR_MS;
  return now >= dueAt(m, b);
}
