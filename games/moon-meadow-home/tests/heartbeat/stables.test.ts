import { describe, it, expect } from 'vitest';
import { doorItem, hasDoor, pageCount, pageDoors, pageOf, pickVisitDoor, rowsEarned, shouldVisit, stableLayout, visitRange } from '../../src/core/heartbeat/stables.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { StepState } from '../../src/core/heartbeat/types.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));

describe('stableLayout', () => {
  it('puts baby one behind door one', () => {
    const l = stableLayout(herd(1), 1);
    expect(l.rows).toHaveLength(1);
    expect(l.rows[0][0]).toEqual({ number: 1, row: 1, baby: 'b1' });
    expect(l.rows[0][9]).toEqual({ number: 10, row: 1, baby: null });
    expect(l.camp).toEqual([]);
  });
  it('sends babies without a built row to the Moonbeam Camp', () => {
    const l = stableLayout(herd(12), 1);
    expect(l.camp).toEqual(['b11', 'b12']);
    expect(hasDoor(11, 1)).toBe(false);
    expect(hasDoor(11, 2)).toBe(true);
  });
  it('follows hatch order, whatever the array order', () => {
    const l = stableLayout([{ id: 'x', order: 3 }, { id: 'y', order: 1 }], 1);
    expect(l.rows[0][0].baby).toBe('y');
    expect(l.rows[0][2].baby).toBe('x');
  });
  it('pages rows two at a time', () => {
    const l = stableLayout(herd(45), 5);
    expect(pageCount(l)).toBe(3);
    expect(pageDoors(l, 1).map((d) => d.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(pageDoors(l, 3).map((d) => d.number)).toEqual([41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
    expect(pageOf(14)).toBe(1);
    expect(pageOf(21)).toBe(2);
  });
  it('earns a row for every ten babies', () => {
    expect(rowsEarned(0)).toBe(1);
    expect(rowsEarned(10)).toBe(1);
    expect(rowsEarned(11)).toBe(2);
  });
});

describe('door visits', () => {
  it('opens the range by maths step', () => {
    const st = (cur: string) => (s: string): StepState => (s === cur ? 'current' : 'locked');
    expect(visitRange(st('M01'))).toBe(0);
    expect(visitRange((s) => (s === 'M02' ? 'placed' : 'locked'))).toBe(10);
    expect(visitRange(st('M07'))).toBe(20);
    expect(visitRange(st('M27'))).toBe(50);
    expect(visitRange(st('M28'))).toBe(100);
  });
  it('visits every time until the range is secure, then every third baby', () => {
    expect(shouldVisit({ range: 0, secure: false, babyOrder: 3 })).toBe(false);
    expect(shouldVisit({ range: 10, secure: false, babyOrder: 4 })).toBe(true);
    expect(shouldVisit({ range: 10, secure: true, babyOrder: 4 })).toBe(false);
    expect(shouldVisit({ range: 10, secure: true, babyOrder: 6 })).toBe(true);
  });
  it('picks an occupied door in range that is not her own', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const n = pickVisitDoor(stableLayout(herd(5), 1), 10, 5, makeRng(seed))!;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(4);
    }
  });
  it('gives no visit to a lone baby, and never a camp baby as target', () => {
    expect(pickVisitDoor(stableLayout(herd(1), 1), 10, 1, makeRng(1))).toBeNull();
    for (let seed = 1; seed <= 30; seed++) {
      const n = pickVisitDoor(stableLayout(herd(12), 1), 20, 12, makeRng(seed))!;
      expect(n).toBeLessThanOrEqual(10);
    }
  });
  it('logs doors under M02 or M07', () => {
    expect(doorItem(7)).toEqual({ step: 'M02', id: 'm:num:7' });
    expect(doorItem(14)).toEqual({ step: 'M07', id: 'm:num:14' });
  });
});
