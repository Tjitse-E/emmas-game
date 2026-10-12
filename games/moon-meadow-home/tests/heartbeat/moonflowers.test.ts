import { describe, it, expect } from 'vitest';
import { MAX_PATCHES, moonflowerLayout } from '../../src/core/heartbeat/moonflowers.ts';

describe('moonflowerLayout', () => {
  it('draws one patch per flower up to sixty', () => {
    expect(moonflowerLayout(0, 1)).toEqual([]);
    const l = moonflowerLayout(10, 1);
    expect(l).toHaveLength(10);
    expect(l.every((p) => p.density === 1)).toBe(true);
  });
  it('makes existing patches denser above sixty', () => {
    const l = moonflowerLayout(61, 1);
    expect(l).toHaveLength(MAX_PATCHES);
    expect(l[0].density).toBe(2);
    expect(l[1].density).toBe(1);
    expect(moonflowerLayout(400, 1).every((p) => p.density === 3)).toBe(true);
  });
  it('keeps earlier patches where they were when a flower is added', () => {
    const a = moonflowerLayout(30, 7);
    const b = moonflowerLayout(31, 7);
    expect(b.slice(0, 30).map((p) => [p.x, p.y])).toEqual(a.map((p) => [p.x, p.y]));
  });
  it('stays in the meadow band', () => {
    for (const p of moonflowerLayout(60, 3)) {
      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.x).toBeLessThanOrEqual(1140);
      expect(p.y).toBeGreaterThanOrEqual(600);
      expect(p.y).toBeLessThanOrEqual(790);
    }
  });
});
