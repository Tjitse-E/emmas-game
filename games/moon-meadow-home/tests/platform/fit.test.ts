import { describe, it, expect } from 'vitest';
import { computeFit, toStagePoint } from '../../src/platform/fit.ts';

describe('computeFit', () => {
  it('fits the stage exactly at 1180 x 820', () => {
    expect(computeFit(1180, 820)).toEqual({ scale: 1, x: 0, y: 0, portrait: false, vw: 1180, vh: 820 });
  });
  it('letterboxes top and bottom on an iPad Air 2 (1024 x 768)', () => {
    const f = computeFit(1024, 768);
    expect(f.scale).toBeCloseTo(1024 / 1180, 6);
    expect(f.x).toBeCloseTo(0, 6);
    expect(f.y).toBeCloseTo((768 - 820 * (1024 / 1180)) / 2, 6);
  });
  it('fits 1080 x 810 by width', () => {
    const f = computeFit(1080, 810);
    expect(f.scale).toBeCloseTo(1080 / 1180, 6);
    expect(f.y).toBeCloseTo((810 - 820 * (1080 / 1180)) / 2, 6);
  });
  it('adds side bands on a wide screen', () => {
    const f = computeFit(1400, 820);
    expect(f.scale).toBe(1);
    expect(f.x).toBe(110);
  });
  it('reports portrait', () => {
    expect(computeFit(820, 1180).portrait).toBe(true);
  });
  it('maps a screen point back to stage units', () => {
    const f = computeFit(1024, 768);
    const p = toStagePoint(512, f.y + 410 * f.scale, f);
    expect(p.x).toBeCloseTo(590, 6);
    expect(p.y).toBeCloseTo(410, 6);
  });
  it('never returns a zero or negative scale for an empty viewport', () => {
    const f = computeFit(0, 0);
    expect(f.scale).toBeGreaterThan(0);
    expect(Number.isFinite(toStagePoint(10, 10, f).x)).toBe(true);
  });
});
