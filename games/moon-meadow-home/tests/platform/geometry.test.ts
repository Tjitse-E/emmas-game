import { describe, it, expect } from 'vitest';
import { pastThreshold, distanceToRect, nearestTarget, unionRect, beamPolygon } from '../../src/platform/geometry.ts';

const box = { x: 0, y: 0, w: 10, h: 10 };
const stage = { x: 0, y: 0, w: 1180, h: 820 };

describe('geometry', () => {
  it('starts a drag at 6 px, not before', () => {
    expect(pastThreshold(3, 4, 6)).toBe(false);
    expect(pastThreshold(6, 0, 6)).toBe(true);
  });
  it('measures the distance to a rectangle edge', () => {
    expect(distanceToRect({ x: 5, y: 5 }, box)).toBe(0);
    expect(distanceToRect({ x: 20, y: 5 }, box)).toBe(10);
    expect(distanceToRect({ x: 13, y: 14 }, box)).toBe(5);
  });
  it('picks the target under the point, the smaller one when nested', () => {
    const t = [{ id: 'nest', rect: { x: 0, y: 0, w: 200, h: 200 } }, { id: 'cup', rect: { x: 50, y: 50, w: 40, h: 40 } }];
    expect(nearestTarget({ x: 60, y: 60 }, t, 48)).toBe('cup');
    expect(nearestTarget({ x: 150, y: 150 }, t, 48)).toBe('nest');
  });
  it('snaps to a near target and ignores far ones', () => {
    const t = [{ id: 'door 3', rect: { x: 100, y: 100, w: 80, h: 80 } }];
    expect(nearestTarget({ x: 220, y: 140 }, t, 48)).toBe('door 3');
    expect(nearestTarget({ x: 300, y: 140 }, t, 48)).toBeNull();
  });
  it('joins rectangles with padding inside the stage', () => {
    expect(unionRect([{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 30, w: 10, h: 10 }], 5, stage)).toEqual({ x: 0, y: 0, w: 35, h: 45 });
    expect(unionRect([], 5, stage)).toBeNull();
  });
  it('draws the beam from the sky down to the area', () => {
    expect(beamPolygon({ x: 100, y: 200, w: 200, h: 100 })).toBe('polygon(160px 0px, 240px 0px, 300px 300px, 100px 300px)');
  });
});
