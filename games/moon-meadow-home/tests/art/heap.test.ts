import { describe, expect, it } from 'vitest';
import { heapLayout, jarLayout, layoutFor, mulberry32 } from '../../src/art/heap.ts';
import { mulberry32 as coreMulberry32 } from '../../src/core/rng.ts';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('heaps', () => {
  it('mulberry32 is the core generator, deterministic and in [0, 1)', () => {
    expect(mulberry32).toBe(coreMulberry32);
    const a = mulberry32(5), b = mulberry32(5);
    for (let i = 0; i < 100; i++) { const v = a(); expect(v).toBe(b()); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });

  it('heapLayout gives count copies inside the box, back to front', () => {
    for (const n of [3, 4, 5]) {
      const h = heapLayout(n, 11);
      expect(h).toHaveLength(n);
      for (const p of h) {
        expect(p.x).toBeGreaterThanOrEqual(0.1); expect(p.x).toBeLessThanOrEqual(0.9);
        expect(p.y).toBeGreaterThanOrEqual(0.1); expect(p.y).toBeLessThanOrEqual(0.9);
        expect(p.scale).toBeGreaterThanOrEqual(0.5); expect(p.scale).toBeLessThanOrEqual(0.62);
        expect(Math.abs(p.rot)).toBeLessThanOrEqual(18);
      }
      const z = h.map((p) => p.z);
      expect(new Set(z).size).toBe(n);
      expect(heapLayout(n, 11)).toEqual(h);
    }
  });

  it('heapLayout refuses counts outside 3 to 5', () => {
    expect(() => heapLayout(2, 1)).toThrow(RangeError);
    expect(() => heapLayout(6, 1)).toThrow(RangeError);
  });

  it('jarLayout keeps every thing countable', () => {
    for (let n = 1; n <= 5; n++) {
      for (let seed = 0; seed < 20; seed++) {
        const j = jarLayout(n, seed);
        expect(j).toHaveLength(n);
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) expect(dist(j[a], j[b])).toBeGreaterThanOrEqual(0.22);
      }
    }
    expect(() => jarLayout(0, 1)).toThrow(RangeError);
  });

  it('layoutFor never throws and keeps any count countable', () => {
    expect(layoutFor(0, 1, 'heap')).toEqual([]);
    expect(layoutFor(-2, 1, 'jar')).toEqual([]);
    expect(layoutFor(Number.NaN, 1, 'heap')).toEqual([]);
    expect(layoutFor(4, 3, 'heap')).toEqual(heapLayout(4, 3));
    expect(layoutFor(4, 3, 'jar')).toEqual(jarLayout(4, 3));
    expect(layoutFor(2, 3, 'heap')).toEqual(jarLayout(2, 3));
    for (const n of [6, 7, 10, 12, 20]) {
      const g = layoutFor(n, 9, 'heap');
      expect(g).toHaveLength(n);
      for (const p of g) {
        expect(p.x - p.scale / 2).toBeGreaterThanOrEqual(-0.001); expect(p.x + p.scale / 2).toBeLessThanOrEqual(1.001);
        expect(p.y - p.scale / 2).toBeGreaterThanOrEqual(-0.001); expect(p.y + p.scale / 2).toBeLessThanOrEqual(1.001);
      }
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) expect(dist(g[a], g[b])).toBeGreaterThanOrEqual(g[a].scale * 0.9);
    }
  });
});
