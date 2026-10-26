import { describe, expect, it } from 'vitest';
import {
  BOUNDS, GAZEBO, GRAZE_HOMES, NEST, OBSTACLES, PLACES, POND, SLIDE, STABLE, START, WILD_EGG,
  doorFront, inPond, inStableBuilding, v2, type Vec2,
} from '../src/layout';
import { BEHIND_Z, SLIDE_BLOCK, STABLE_BLOCK, isWalkable, lineOfSight, nearestWalkable, route } from '../src/world/route';

const len = (r: Vec2[]): number => r.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - r[i].x, p.z - r[i].z), 0);
const near = (a: Vec2, b: Vec2, eps = 1e-6): boolean => Math.hypot(a.x - b.x, a.z - b.z) <= eps;

/** Every point along the route (every 5 cm) stays out of the water, the buildings and the trees. */
function expectClear(r: Vec2[], from = 0): void {
  for (let i = from + 1; i < r.length; i++) {
    const a = r[i - 1];
    const b = r[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05));
    for (let k = 0; k <= n; k++) {
      const p = { x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n };
      expect(inPond(p, 0.2), `pond at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(false);
      expect(inStableBuilding(p, 0.2), `stable at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(false);
      for (const o of OBSTACLES) expect(Math.hypot(p.x - o.center.x, p.z - o.center.z)).toBeGreaterThan(o.radius + 0.3);
      expect(p.x >= BOUNDS.minX && p.x <= BOUNDS.maxX && p.z >= BOUNDS.minZ && p.z <= BOUNDS.maxZ).toBe(true);
      const inSlide = p.x > SLIDE_BLOCK.minX && p.x < SLIDE_BLOCK.maxX && p.z > SLIDE_BLOCK.minZ && p.z < SLIDE_BLOCK.maxZ;
      expect(inSlide, `slide at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(false);
    }
  }
}

describe('isWalkable', () => {
  it('knows the meadow, the water, the buildings and the edge', () => {
    expect(isWalkable(START)).toBe(true);
    expect(isWalkable(NEST.stand)).toBe(true);
    expect(isWalkable(POND.center)).toBe(false);
    expect(isWalkable(NEST.center)).toBe(false);
    expect(isWalkable(GAZEBO.center)).toBe(false);
    expect(isWalkable(v2(STABLE.rows[0].centerX, STABLE.frontZ - 1))).toBe(false);
    expect(isWalkable(v2(BOUNDS.maxX + 1, 0))).toBe(false);
  });

  it('lets every place the level uses be stood on', () => {
    const spots = [START, NEST.stand, SLIDE.ladderBase, ...SLIDE.queue, WILD_EGG.stand, STABLE.emmaStand, ...POND.exits, ...GRAZE_HOMES];
    for (let n = 1; n <= 20; n++) spots.push(doorFront(n));
    for (const p of spots) expect(isWalkable(p), `${p.x},${p.z}`).toBe(true);
  });
});

describe('nearestWalkable', () => {
  it('returns a walkable point unchanged', () => {
    expect(nearestWalkable(START)).toEqual(START);
  });

  it('steps out of the pond onto the nearest shore', () => {
    const p = nearestWalkable(v2(POND.center.x, POND.center.z + 4));
    expect(isWalkable(p)).toBe(true);
    expect(p.x).toBeCloseTo(POND.center.x, 1);
    expect(p.z).toBeGreaterThan(POND.center.z + POND.rz);
    expect(p.z).toBeLessThan(POND.center.z + POND.rz + 0.4);
  });

  it('steps out of a building to its front, and out of the meadow back inside the fence', () => {
    const front = nearestWalkable(v2(-4.5, STABLE.frontZ - 0.2));
    expect(isWalkable(front)).toBe(true);
    expect(front.z).toBeGreaterThan(STABLE.frontZ);
    expect(front.z).toBeLessThan(STABLE.frontZ + 0.4);
    const outside = nearestWalkable(v2(BOUNDS.maxX + 5, BOUNDS.minZ - 5));
    expect(isWalkable(outside)).toBe(true);
    expect(outside.x).toBeLessThanOrEqual(BOUNDS.maxX);
    expect(outside.z).toBeGreaterThanOrEqual(BOUNDS.minZ);
    expect(outside.z).toBeGreaterThanOrEqual(BEHIND_Z);
  });

  it('brings a unicorn dropped on a roof or behind the stables out in front of the doors', () => {
    // A drop on a roof meets the carry plane behind the building.
    for (const p of [v2(-4.5, -15), v2(4.8, -21.37), v2(0, -19), v2(-6, -17.5), v2(7.5, -18.15), v2(0.1, -14)]) {
      const q = nearestWalkable(p);
      expect(isWalkable(q), `${p.x},${p.z}`).toBe(true);
      expect(q.z, `${p.x},${p.z}`).toBeGreaterThan(STABLE.frontZ);
      expect(Math.abs(q.x - p.x), `${p.x},${p.z}`).toBeLessThan(0.01);
    }
  });

  it('finds a spot where a tree touches the stable, not behind it', () => {
    const p = nearestWalkable(v2(-8, -17));
    expect(isWalkable(p)).toBe(true);
    expect(p.z).toBeGreaterThanOrEqual(BEHIND_Z);
    expect(Math.hypot(p.x + 8, p.z + 17)).toBeLessThan(3);
  });

  it('steps out beside the stables from over a ramp, and south from behind the meadow edge', () => {
    const ramp = nearestWalkable(v2(STABLE_BLOCK.halfX - 0.2, -16));
    expect(isWalkable(ramp)).toBe(true);
    expect(ramp.z).toBeGreaterThanOrEqual(BEHIND_Z);
    const side = nearestWalkable(v2(18, -20));
    expect(isWalkable(side)).toBe(true);
    expect(side.x).toBeCloseTo(18, 5);
    expect(side.z).toBeGreaterThanOrEqual(BEHIND_Z);
    expect(side.z).toBeLessThan(BEHIND_Z + 0.1);
  });
});

describe('route', () => {
  it('walks straight when nothing is in the way', () => {
    const r = route(START, NEST.stand);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual(START);
    expect(r[1]).toEqual(NEST.stand);
  });

  it('starts at from and ends at to', () => {
    const to = v2(20, 6);
    const r = route(START, to);
    expect(r[0]).toEqual(START);
    expect(near(r[r.length - 1], to)).toBe(true);
    expectClear(r);
  });

  it('goes around the pond, not through it, and stays short', () => {
    const a = v2(2, 4);
    const b = v2(18.5, 4);
    const r = route(a, b);
    expectClear(r);
    expect(r.length).toBeGreaterThan(2);
    // Around the ellipse: half its circumference plus the margins is about 19 m.
    expect(len(r)).toBeLessThan(22);
    expect(near(r[r.length - 1], b)).toBe(true);
  });

  it('never crosses a stable building or goes behind it', () => {
    const r = route(v2(-4.5, -11), v2(-4.5, -19.5));
    expectClear(r);
    expect(r[r.length - 1].z).toBeGreaterThan(STABLE.frontZ);
    for (const p of r) expect(p.z).toBeGreaterThanOrEqual(BEHIND_Z);
    const across = route(v2(-12, -15), v2(12, -15));
    expectClear(across);
    for (const p of across) expect(p.z).toBeGreaterThanOrEqual(BEHIND_Z);
  });

  it('goes round the slide platform but still reaches the ladder', () => {
    const r = route(v2(5, 8.6), v2(12.5, -1.2));
    expectClear(r);
    const ladder = route(v2(-2, -3), SLIDE.ladderBase);
    expectClear(ladder);
    expect(near(ladder[ladder.length - 1], SLIDE.ladderBase)).toBe(true);
  });

  it('keeps the gap between the two stable rows and the strip behind them closed', () => {
    expect(isWalkable(v2(0, -14.5))).toBe(false);
    expect(isWalkable(v2(0, BEHIND_Z - 0.5))).toBe(false);
    expect(isWalkable(v2(20, BEHIND_Z - 0.5))).toBe(false);
    expect(isWalkable(v2(STABLE_BLOCK.halfX - 0.3, -15))).toBe(false);
    expect(isWalkable(v2(STABLE_BLOCK.halfX + 0.5, -15))).toBe(true);
    const r = route(v2(0, -11), v2(0, -19));
    expectClear(r);
    expect(r[r.length - 1].z).toBeGreaterThan(STABLE.frontZ);
    expect(len(r)).toBeLessThan(3);
  });

  it('reaches every door, the slide, the wild egg and the nest from the start', () => {
    const targets = [SLIDE.ladderBase, WILD_EGG.stand, NEST.stand, STABLE.emmaStand, PLACES.gazebo, PLACES.pond];
    for (let n = 1; n <= 20; n++) targets.push(doorFront(n));
    for (const t of targets) {
      const r = route(START, t);
      expectClear(r);
      expect(isWalkable(r[r.length - 1])).toBe(true);
    }
  });

  it('ends at the nearest walkable point when the target is blocked', () => {
    for (const to of [POND.center, NEST.center, GAZEBO.center, v2(4.5, -15), v2(40, 40), OBSTACLES[2].center]) {
      const r = route(START, to);
      const end = r[r.length - 1];
      expectClear(r);
      expect(isWalkable(end)).toBe(true);
      expect(near(end, nearestWalkable(to), 1e-6)).toBe(true);
    }
  });

  it('brings a swimmer out of the water first', () => {
    const swimmer = v2(POND.center.x + 1, POND.center.z);
    const r = route(swimmer, START);
    expect(r[0]).toEqual(swimmer);
    expect(isWalkable(r[1])).toBe(true);
    expectClear(r, 1);
    expect(near(r[r.length - 1], START)).toBe(true);
  });

  it('keeps every leg in line of sight and plans fast', () => {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) route(v2(-24, 13), v2(24, -20));
    const ms = (performance.now() - t0) / 20;
    const r = route(v2(-24, 13), v2(24, -20));
    for (let i = 1; i < r.length; i++) expect(lineOfSight(r[i - 1], r[i])).toBe(true);
    expect(ms).toBeLessThan(25);
  });
});
