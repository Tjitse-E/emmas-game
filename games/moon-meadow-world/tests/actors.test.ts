// The pure parts of the actors: route following, follow slots, the slide queue and the pond helpers.
import { describe, expect, it } from 'vitest';
import { POND, SLIDE, dist2, inPond } from '../src/layout';
import {
  FOLLOW_SLOTS, RouteWalker, SlideQueue, exitLanding, followTarget, headingOf, keepInPond, lineWalkable, nearestExit, queueSpot,
  turnTowards, wrap,
} from '../src/actors/motion';

describe('RouteWalker', () => {
  it('walks the points in order and stops at the end', () => {
    const at = { x: 0, z: 0 };
    const w = new RouteWalker([{ x: 3, z: 0 }, { x: 3, z: 4 }], at);
    expect(w.remaining(at)).toBeCloseTo(7);
    expect(w.step(at, 2)).toBeCloseTo(Math.PI / 2); // heading east
    expect(at).toEqual({ x: 2, z: 0 });
    // Turns the corner within one step.
    expect(w.step(at, 2)).toBeCloseTo(0); // heading south
    expect(at.x).toBeCloseTo(3);
    expect(at.z).toBeCloseTo(1);
    w.step(at, 10);
    expect(at).toEqual({ x: 3, z: 4 });
    expect(w.done).toBe(true);
    expect(w.step(at, 1)).toBeNull();
  });

  it('skips a first point where the walker already stands', () => {
    const w = new RouteWalker([{ x: 1, z: 1 }, { x: 2, z: 1 }], { x: 1, z: 1 });
    expect(w.points).toHaveLength(1);
    expect(w.next).toEqual({ x: 2, z: 1 });
  });

  it('is done at once for an empty route', () => {
    expect(new RouteWalker([], { x: 0, z: 0 }).done).toBe(true);
  });
});

describe('follow slots', () => {
  it('puts slot 0 straight behind her and slots 1 and 2 behind on either side', () => {
    const at = { x: 0, z: 0 };
    // Walking south (heading 0): behind is north (-z).
    const s0 = followTarget(at, 0, 0);
    expect(s0.x).toBeCloseTo(0);
    expect(s0.z).toBeCloseTo(-FOLLOW_SLOTS[0][0]);
    const s1 = followTarget(at, 0, 1);
    const s2 = followTarget(at, 0, 2);
    expect(s1.z).toBeLessThan(-1.2);
    expect(s2.z).toBeLessThan(-1.2);
    expect(Math.sign(s1.x)).toBe(-Math.sign(s2.x));
  });

  it('keeps every slot between 1.2 and 2.5 m from her, whichever way she walks', () => {
    for (let h = -Math.PI; h < Math.PI; h += 0.4) {
      for (let slot = 0; slot < 3; slot++) {
        const d = dist2({ x: 5, z: 5 }, followTarget({ x: 5, z: 5 }, h, slot));
        expect(d).toBeGreaterThanOrEqual(1.2);
        expect(d).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it('turns with her: walking east, the followers are to the west', () => {
    const s0 = followTarget({ x: 0, z: 0 }, Math.PI / 2, 0);
    expect(s0.x).toBeCloseTo(-FOLLOW_SLOTS[0][0]);
    expect(s0.z).toBeCloseTo(0);
  });

  it('clamps slot numbers', () => {
    expect(followTarget({ x: 0, z: 0 }, 0, 7)).toEqual(followTarget({ x: 0, z: 0 }, 0, 2));
    expect(followTarget({ x: 0, z: 0 }, 0, -1)).toEqual(followTarget({ x: 0, z: 0 }, 0, 0));
  });
});

describe('SlideQueue', () => {
  it('lets one rider at a time onto the ladder, in order', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.join('b');
    q.join('c');
    expect(q.mayGo('a')).toBe(true);
    expect(q.mayGo('b')).toBe(false);
    q.go('a');
    expect(q.rider).toBe('a');
    // b is first in line now but must wait until a starts sliding down.
    expect(q.place('b')).toBe(0);
    expect(q.mayGo('b')).toBe(false);
    q.free('a');
    expect(q.mayGo('b')).toBe(true);
    q.go('b');
    expect(q.waiting).toEqual(['c']);
  });

  it('puts Princess Emma at the front and ignores a second join', () => {
    const q = new SlideQueue<string>();
    q.join('u1');
    q.join('u2');
    q.join('emma', true);
    q.join('u1');
    expect(q.waiting).toEqual(['emma', 'u1', 'u2']);
  });

  it('frees the ladder when the rider leaves (another command)', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.join('b');
    q.go('a');
    q.leave('a');
    expect(q.rider).toBeNull();
    expect(q.mayGo('b')).toBe(true);
  });

  it('lets a dropped unicorn take the top straight away and holds the line until it slides', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.takeTop('dropped');
    expect(q.mayGo('a')).toBe(false);
    q.free('dropped');
    expect(q.mayGo('a')).toBe(true);
  });

  it('only the rider can free the ladder', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.go('a');
    q.free('someone else');
    expect(q.rider).toBe('a');
  });
});

describe('queue spots', () => {
  it('uses SLIDE.queue first, then rows further west on walkable grass', () => {
    expect(queueSpot(0)).toEqual(SLIDE.queue[0]);
    expect(queueSpot(2)).toEqual(SLIDE.queue[2]);
    const spots = Array.from({ length: 9 }, (_, i) => queueSpot(i));
    for (const s of spots.slice(3)) expect(s.x).toBeLessThan(SLIDE.queue[0].x);
    for (const s of spots) expect(inPond(s)).toBe(false);
    // No two riders wait on the same spot.
    const keys = new Set(spots.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`));
    expect(keys.size).toBe(spots.length);
  });
});

describe('the pond', () => {
  it('finds the nearest exit and a landing point just inside the shore', () => {
    for (const e of POND.exits) {
      expect(nearestExit({ x: e.x * 0.98 + POND.center.x * 0.02, z: e.z * 0.98 + POND.center.z * 0.02 })).toEqual(e);
      const l = exitLanding(e);
      expect(inPond(l)).toBe(true);
      expect(dist2(l, e)).toBeLessThan(1.2);
    }
  });

  it('keeps swimmers on the water', () => {
    const p = keepInPond({ x: POND.center.x + POND.rx + 3, z: POND.center.z });
    expect(inPond(p, -0.3)).toBe(true);
    const inside = { x: POND.center.x, z: POND.center.z };
    expect(keepInPond(inside)).toEqual(inside);
  });
});

describe('helpers', () => {
  it('measures headings with 0 facing south and PI/2 facing east', () => {
    expect(headingOf(0, 1)).toBeCloseTo(0);
    expect(headingOf(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(headingOf(0, -1))).toBeCloseTo(Math.PI);
  });

  it('turns the short way round', () => {
    expect(turnTowards(3, -3, 0.1)).toBeCloseTo(wrap(3.1));
    expect(turnTowards(0, 0.05, 0.1)).toBeCloseTo(0.05);
  });

  it('checks a straight line for walkability', () => {
    const notPond = (p: { x: number; z: number }) => !inPond(p);
    expect(lineWalkable({ x: 0, z: 4 }, { x: 20, z: 4 }, notPond)).toBe(false);
    expect(lineWalkable({ x: 0, z: 12 }, { x: 20, z: 12 }, notPond)).toBe(true);
  });
});
