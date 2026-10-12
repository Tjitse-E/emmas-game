import { describe, expect, it } from 'vitest';
import { mulberry32, pick, shuffle } from '../../src/core/rng.ts';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('shuffle keeps every element and pick refuses an empty list', () => {
    const r = mulberry32(1);
    expect(shuffle([1, 2, 3, 4], r).sort()).toEqual([1, 2, 3, 4]);
    expect(() => pick([], r)).toThrow();
  });
});
