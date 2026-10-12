// G/tests/learning/leitner.test.ts
import { describe, it, expect } from 'vitest';
import { nextBox, isDue, dueAt, newMemory, updateMemory } from '../../src/core/learning/leitner.ts';
import type { Box, ItemMemory, Result, VisitState } from '../../src/core/learning/types.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';
import { T0, HOUR, DAY } from '../fixtures/events.ts';

const visit = (seq: number, startT: number, box0: Record<string, number> = {}): VisitState =>
  ({ seq, startT, tz: 120, counts: { r: 0, s: 0, m: 0, name: 0 }, ladder: 0, spell: 0, golden: false, box0, recent: [], eggs: [] });
const mem = (box: Box, lastT: number, lastVisit: number): ItemMemory =>
  ({ box, lastT, lastVisit, seen: 1, firsts: 0, seeded: false, placedInit: false });
const ID = 'r:g:a';

describe('nextBox', () => {
  it.each([
    [0, 'first', 1], [1, 'first', 2], [2, 'first', 3], [3, 'first', 4], [4, 'first', 5], [5, 'first', 6], [6, 'first', 6],
    [0, 'miss', 0], [1, 'miss', 1], [2, 'miss', 1], [3, 'miss', 1], [4, 'miss', 2], [5, 'miss', 3], [6, 'miss', 3],
    [2, 'helped', 1], [4, 'helped', 2],
  ])('box %i with %s goes to %i for a non-fluency item', (box, r, want) => {
    expect(nextBox(box as Box, r as Result, false, false)).toBe(want);
  });
  it('a fluency item needs a fast first try to leave box 4 and box 5', () => {
    expect(nextBox(4, 'first', false, true)).toBe(4);
    expect(nextBox(4, 'first', true, true)).toBe(5);
    expect(nextBox(5, 'first', false, true)).toBe(5);
    expect(nextBox(5, 'first', true, true)).toBe(6);
    expect(nextBox(3, 'first', false, true)).toBe(4);
  });
});

describe('isDue', () => {
  it('box 0 comes back after 2 other results of its strand in the same visit', () => {
    expect(isDue(ID, mem(0, T0, 1), T0, visit(1, T0, { [ID]: 1 }), b)).toBe(false);
    expect(isDue(ID, mem(0, T0, 1), T0, visit(1, T0, { [ID]: 2 }), b)).toBe(true);
  });
  it('box 0 from an earlier visit is due at once', () => {
    expect(isDue(ID, mem(0, T0, 1), T0 + HOUR, visit(2, T0 + HOUR), b)).toBe(true);
  });
  it('box 1 waits for a later visit that starts at least 4 hours later', () => {
    expect(isDue(ID, mem(1, T0, 1), T0 + HOUR, visit(2, T0 + HOUR), b)).toBe(false);
    expect(isDue(ID, mem(1, T0, 1), T0 + 5 * HOUR, visit(2, T0 + 5 * HOUR), b)).toBe(true);
    expect(isDue(ID, mem(1, T0, 1), T0 + 5 * HOUR, visit(1, T0), b)).toBe(false);
  });
  it.each([[2, 2], [3, 4], [4, 8], [5, 16], [6, 42]])('box %i is due after %i days', (box, days) => {
    expect(isDue(ID, mem(box as Box, T0, 1), T0 + days * DAY - 1, visit(5, T0 + days * DAY - 1), b)).toBe(false);
    expect(isDue(ID, mem(box as Box, T0, 1), T0 + days * DAY, visit(5, T0 + days * DAY), b)).toBe(true);
    expect(dueAt(mem(box as Box, T0, 1), b)).toBe(T0 + days * DAY);
  });
});

describe('updateMemory', () => {
  it('counts results and first tries', () => {
    const m = newMemory();
    updateMemory(m, 'first', T0, 1, false, false, true);
    expect(m).toMatchObject({ box: 1, lastT: T0, lastVisit: 1, seen: 1, firsts: 1 });
    updateMemory(m, 'first', T0 + 1, 1, false, false, false);
    expect(m).toMatchObject({ box: 2, seen: 2, firsts: 1 });
  });
  it('lastT never goes backwards when the clock jumps back', () => {
    const m = newMemory();
    updateMemory(m, 'first', T0 + HOUR, 1, false, false, true);
    updateMemory(m, 'first', T0, 1, false, false, true);
    expect(m.lastT).toBe(T0 + HOUR);
    expect(m.box).toBe(2);
  });
});
