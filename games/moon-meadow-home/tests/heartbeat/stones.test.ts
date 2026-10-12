import { describe, it, expect } from 'vitest';
import { planStones, stoneFace } from '../../src/core/maths/stones.ts';
import { buildEggTask } from '../../src/core/maths/eggs.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';

const task = (step: string, id: string, scaffold: 1 | 2 | 3 = 1) =>
  buildEggTask({ strand: 'm', step, id, carrier: '', items: [id], scaffold, probe: false, source: 'current' } as Served);

describe('stoneFace', () => {
  it('follows the maths scaffold, and subitising always shows dots', () => {
    expect(stoneFace(task('M09', 'm:miss:10-3', 1))).toBe('dots');
    expect(stoneFace(task('M09', 'm:miss:10-3', 2))).toBe('dots-numeral');
    expect(stoneFace(task('M09', 'm:miss:10-3', 3))).toBe('numeral');
    expect(stoneFace(task('M01', 'm:sub:3', 3))).toBe('dots');
  });
});

describe('planStones', () => {
  it('gives 3, 4 or 5 different stones with the answer among them', () => {
    for (const [sc, size] of [[1, 3], [2, 4], [3, 5]] as const) {
      for (let seed = 1; seed <= 50; seed++) {
        const t = task('M09', 'm:miss:10-3', sc);
        const s = planStones(t, makeRng(seed));
        expect(s).toHaveLength(size);
        expect(s.map((x) => x.value)).toContain(7);
        expect(new Set(s.map((x) => x.value)).size).toBe(size);
        for (const x of s) expect(x.value).toBeGreaterThanOrEqual(1);
        for (const x of s) expect(x.value).toBeLessThanOrEqual(9);
      }
    }
  });
  it('keeps small nest stones inside the nest size', () => {
    const s = planStones(task('M05', 'm:miss:5-2', 3), makeRng(3));
    expect(s.map((x) => x.value).sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('always offers at least three stones, even in the smallest nest', () => {
    for (const sc of [1, 2, 3] as const) {
      const s = planStones(task('M05', 'm:miss:2-1', sc), makeRng(1));
      expect(s.length).toBeGreaterThanOrEqual(3);
      expect(s.map((x) => x.value)).toContain(1);
    }
  });
  it('uses dice up to six and a scatter above', () => {
    const s = planStones(task('M02', 'm:num:9', 1), makeRng(4));
    for (const x of s) expect(x.layout).toBe(x.value <= 6 ? 'dice' : 'scatter');
  });
  it('gives two-stone eggs three pairs to ten, including the served pair', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = planStones(task('M10', 'm:pair:3+7'), makeRng(seed)).map((x) => x.value);
      expect(s).toHaveLength(6);
      expect(s).toContain(3);
      expect(s).toContain(7);
      const counts = new Map<number, number>();
      for (const v of s) counts.set(v, (counts.get(v) ?? 0) + 1);
      for (const v of s) expect(counts.get(10 - v)).toBeGreaterThanOrEqual(v === 5 ? 2 : 1);
    }
  });
  it('gives two fives when the served pair is five and five', () => {
    const s = planStones(task('M10', 'm:pair:5+5'), makeRng(9)).map((x) => x.value);
    expect(s.filter((v) => v === 5)).toHaveLength(2);
  });
  it('gives every stone its own id', () => {
    const s = planStones(task('M10', 'm:pair:5+5'), makeRng(9));
    expect(new Set(s.map((x) => x.id)).size).toBe(s.length);
  });
  it('is deterministic for a seed', () => {
    expect(planStones(task('M09', 'm:miss:10-4', 2), makeRng(5))).toEqual(planStones(task('M09', 'm:miss:10-4', 2), makeRng(5)));
  });
});
