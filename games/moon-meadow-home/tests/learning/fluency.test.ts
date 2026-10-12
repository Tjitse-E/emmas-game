// G/tests/learning/fluency.test.ts
import { describe, it, expect } from 'vitest';
import { emptyFluency, isFast, recordFirstTry } from '../../src/core/learning/fluency.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';
import { T0, HOUR, DAY } from '../fixtures/events.ts';

describe('fluency', () => {
  it('uses the 3 second ceiling before there is a median', () => {
    const f = emptyFluency();
    expect(isFast(f, 2900, b)).toBe(true);
    expect(isFast(f, 3100, b)).toBe(false);
    expect(isFast(f, null, b)).toBe(false);
  });
  it('computes the median after 10 first tries and recomputes it once a week', () => {
    const f = emptyFluency();
    for (let i = 0; i < 10; i++) recordFirstTry(f, 1000 + i * 100, T0 + i, b);
    expect(f.median).toBe(1450);
    expect(isFast(f, 1400, b)).toBe(true);
    expect(isFast(f, 1500, b)).toBe(false);
    for (let i = 0; i < 10; i++) recordFirstTry(f, 500, T0 + HOUR, b);
    expect(f.median).toBe(1450);
    recordFirstTry(f, 500, T0 + 7 * DAY + 10, b);
    expect(f.median).toBe(500);
  });
  it('keeps only the newest 50 samples', () => {
    const f = emptyFluency();
    for (let i = 0; i < 60; i++) recordFirstTry(f, 1000, T0 + i, b);
    expect(f.samples).toHaveLength(50);
  });
  it('the median never goes above the ceiling', () => {
    const f = emptyFluency();
    for (let i = 0; i < 10; i++) recordFirstTry(f, 5000, T0 + i, b);
    expect(isFast(f, 3500, b)).toBe(false);
    expect(isFast(f, 2900, b)).toBe(true);
  });
});
