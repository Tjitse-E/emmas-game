// G/tests/learning/mastery.test.ts
import { describe, it, expect } from 'vitest';
import { newStepState, pushWindow, readyToPass, recordReview } from '../../src/core/learning/mastery.ts';
import type { ItemMemory, Result } from '../../src/core/learning/types.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';

const ITEMS = ['r:g:s', 'r:g:a'];
const tried = (firsts = 1): Record<string, ItemMemory> => Object.fromEntries(ITEMS.map(id =>
  [id, { box: 1, lastT: 0, lastVisit: 1, seen: 1, firsts, seeded: false, placedInit: false }]));
function stepWith(results: [Result, number][], level: 1 | 2 | 3 = 3) {
  const s = newStepState();
  s.level = level;
  for (const [r, day] of results) pushWindow(s, r, day, b);
  return s;
}
const run = (r: Result, n: number, day: number): [Result, number][] => Array.from({ length: n }, () => [r, day]);

describe('readyToPass', () => {
  it('passes with 12 of 15 first tries at the top over two days and every item tried', () => {
    expect(readyToPass(stepWith([...run('first', 12, 100), ...run('miss', 3, 101)]), ITEMS, tried(), 3, b)).toBe(true);
  });
  it('needs two days', () => {
    expect(readyToPass(stepWith([...run('first', 12, 100), ...run('miss', 3, 100)]), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('needs 12 first tries', () => {
    expect(readyToPass(stepWith([...run('first', 11, 100), ...run('miss', 4, 101)]), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('needs the scaffold at the top level', () => {
    expect(readyToPass(stepWith([...run('first', 12, 100), ...run('first', 3, 101)], 2), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('needs a first try on every item', () => {
    const mem = tried();
    mem['r:g:a'].firsts = 0;
    expect(readyToPass(stepWith([...run('first', 8, 100), ...run('first', 7, 101)]), ITEMS, mem, 3, b)).toBe(false);
  });
  it('only looks at the last 15', () => {
    expect(readyToPass(stepWith([...run('first', 15, 100), ...run('miss', 4, 101)]), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('is false once passed', () => {
    const s = stepWith([...run('first', 12, 100), ...run('first', 3, 101)]);
    s.passed = true;
    expect(readyToPass(s, ITEMS, tried(), 3, b)).toBe(false);
  });
});

describe('recordReview', () => {
  it('reopens after 10 review results with fewer than 7 first tries', () => {
    const s = newStepState();
    s.passed = true;
    for (const r of [...run('first', 6, 1), ...run('miss', 3, 1)]) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(false);
    recordReview(s, 'miss', 1, b);
    expect(s.reopened).toBe(true);
  });
  it('stays open on a good run of 10 review results', () => {
    const s = newStepState();
    for (const r of [...run('first', 7, 1), ...run('miss', 3, 1)]) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(false);
  });
  it('closes after 8 of the next 10 are first tries over two days', () => {
    const s = newStepState();
    s.reopened = true;
    for (const r of [...run('first', 8, 1), ...run('miss', 2, 1)]) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(true);
    for (const r of run('first', 2, 2)) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(false);
  });
});
