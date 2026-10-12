import { describe, expect, it } from 'vitest';
import { FRAME_MS, decodedBytes, summarise, verdict } from '../../src/stress/frameStats.ts';

describe('frame stats', () => {
  it('summarises a smooth run', () => {
    const s = summarise(Array(120).fill(FRAME_MS));
    expect(s.p50).toBeCloseTo(16.67, 1);
    expect(s.p95).toBeCloseTo(16.67, 1);
    expect(s.dropPct).toBe(0);
    expect(s.fps).toBeCloseTo(60, 0);
  });

  it('counts missed frames from long frames', () => {
    const s = summarise([...Array(90).fill(FRAME_MS), ...Array(10).fill(50)]);
    expect(s.dropPct).toBeCloseTo(16.7, 0);   // 20 missed of 120 expected
    expect(s.p95).toBe(50);
  });

  it('counts each decoded image once', () => {
    const b = decodedBytes([{ url: 'a', w: 100, h: 100 }, { url: 'a', w: 100, h: 100 }, { url: 'b', w: 10, h: 10 }]);
    expect(b).toBe(100 * 100 * 4 + 10 * 10 * 4);
  });

  it('verdict fails on decoded memory', () => {
    const smooth = summarise(Array(120).fill(FRAME_MS));
    expect(verdict(smooth, 120)).toBe(true);
    expect(verdict(smooth, 151)).toBe(false);
    expect(verdict(summarise(Array(120).fill(30)), 50)).toBe(false);
  });
});
