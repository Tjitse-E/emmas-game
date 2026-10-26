// The pure parts of moving about: route following, follow slots, the shared slide queue and small angle helpers.
// No three.js scene in here, so it is unit tested (tests/actors.test.ts).
import type { ActorDeps } from '../contracts';
import { POND, SLIDE, dist2, inPond, type Vec2 } from '../layout';

/** ActorDeps plus the world's optional ground height (world.heightAt), so feet stay on the nest mound. */
export interface ActorDepsPlus extends ActorDeps {
  heightAt?(p: Vec2): number;
}

/** Heading of a direction in the xz plane: 0 faces south (+z), PI/2 faces east (+x). */
export function headingOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** An angle in (-PI, PI]. */
export function wrap(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

/** Turn `from` towards `to` by at most `step` radians, the short way round. */
export function turnTowards(from: number, to: number, step: number): number {
  const d = wrap(to - from);
  return Math.abs(d) <= step ? to : wrap(from + Math.sign(d) * step);
}

/** Ease a value towards a target with a time constant (frame-rate independent). */
export function damp(from: number, to: number, rate: number, dt: number): number {
  return to + (from - to) * Math.exp(-rate * dt);
}

/**
 * Walks a route (a list of points from world.route) at a given speed. The route ends at the destination; a first point
 * that is where the walker already stands is skipped.
 */
export class RouteWalker {
  readonly points: Vec2[];
  private i = 0;

  constructor(route: Vec2[], from: Vec2) {
    this.points = route.filter((p, k) => !(k === 0 && dist2(p, from) < 0.05));
  }

  get done(): boolean {
    return this.i >= this.points.length;
  }

  /** The point being walked to, or null at the end. */
  get next(): Vec2 | null {
    return this.points[this.i] ?? null;
  }

  get end(): Vec2 | null {
    return this.points[this.points.length - 1] ?? null;
  }

  /** Metres left from `at` to the end. */
  remaining(at: Vec2): number {
    let d = 0;
    let p = at;
    for (let k = this.i; k < this.points.length; k++) {
      d += dist2(p, this.points[k]);
      p = this.points[k];
    }
    return d;
  }

  /** Move `at` (in place) up to `dist` metres along the route. Returns the heading of the last step, or null when it did not move. */
  step(at: Vec2, dist: number): number | null {
    let heading: number | null = null;
    while (dist > 1e-6 && this.i < this.points.length) {
      const p = this.points[this.i];
      const dx = p.x - at.x;
      const dz = p.z - at.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-4) heading = headingOf(dx, dz);
      if (d <= dist) {
        at.x = p.x;
        at.z = p.z;
        dist -= d;
        this.i++;
      } else {
        at.x += (dx / d) * dist;
        at.z += (dz / d) * dist;
        dist = 0;
      }
    }
    return heading;
  }
}

/** Where followers walk, behind Princess Emma as she goes: [metres back, metres to the side]. */
export const FOLLOW_SLOTS: readonly (readonly [number, number])[] = [
  [1.3, 0],
  [2.0, -0.85],
  [2.15, 0.85],
];

/** The ground point of follow slot `slot` behind a leader at `at` heading `heading`. */
export function followTarget(at: Vec2, heading: number, slot: number): Vec2 {
  const [back, side] = FOLLOW_SLOTS[Math.max(0, Math.min(FOLLOW_SLOTS.length - 1, slot))];
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  return { x: at.x - fx * back + fz * side, z: at.z - fz * back - fx * side };
}

/** Is the straight line from a to b walkable (checked every `step` metres)? */
export function lineWalkable(a: Vec2, b: Vec2, isWalkable: (p: Vec2) => boolean, step = 0.4): boolean {
  const d = dist2(a, b);
  const n = Math.max(1, Math.ceil(d / step));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    if (!isWalkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return true;
}

/**
 * The slide's waiting line. Riders wait in line at SLIDE.queue; the first in line may climb once nobody else is on
 * the ladder or the top platform. A rider frees the slide when it starts sliding down, so the next one climbs while
 * it slides and never meets it on top.
 */
export class SlideQueue<T> {
  private readonly line: T[] = [];
  private onTop: T | null = null;

  /** Join the line (at the front for Princess Emma: it is her tap). Joining twice keeps the first place. */
  join(r: T, front = false): void {
    if (this.line.includes(r) || this.onTop === r) return;
    if (front) this.line.unshift(r);
    else this.line.push(r);
  }

  /** Leave the line or the ladder (the rider got another command). */
  leave(r: T): void {
    const k = this.line.indexOf(r);
    if (k >= 0) this.line.splice(k, 1);
    if (this.onTop === r) this.onTop = null;
  }

  /** Place in line (0 is first), or -1. */
  place(r: T): number {
    return this.line.indexOf(r);
  }

  get rider(): T | null {
    return this.onTop;
  }

  get waiting(): readonly T[] {
    return this.line;
  }

  mayGo(r: T): boolean {
    return this.onTop === null && this.line[0] === r;
  }

  /** The first in line takes the ladder. */
  go(r: T): void {
    this.leave(r);
    this.onTop = r;
  }

  /** Someone put straight on the top (a dropped unicorn) takes the slide without queueing. */
  takeTop(r: T): void {
    this.leave(r);
    this.onTop = r;
  }

  /** The rider started sliding down: the next may climb. */
  free(r: T): void {
    if (this.onTop === r) this.onTop = null;
  }
}

/** Where the k-th rider in line waits: SLIDE.queue, then further rows to the west. */
export function queueSpot(k: number): Vec2 {
  const q = SLIDE.queue;
  if (k < q.length) return q[k];
  const extra = k - q.length;
  const base = q[extra % q.length];
  return { x: base.x - 1.1 * (1 + Math.floor(extra / q.length)), z: base.z };
}

/** The shore exit nearest to a point in the pond. */
export function nearestExit(p: Vec2): Vec2 {
  let best = POND.exits[0];
  for (const e of POND.exits) if (dist2(e, p) < dist2(best, p)) best = e;
  return best;
}

/** The point on the water where a swimmer leaves for `exit`: just inside the shore, on the line from the centre. */
export function exitLanding(exit: Vec2, inset = 0.45): Vec2 {
  const c = POND.center;
  const dx = exit.x - c.x;
  const dz = exit.z - c.z;
  // Scale the direction onto the ellipse, then step in a little.
  const k = 1 / Math.sqrt((dx / POND.rx) ** 2 + (dz / POND.rz) ** 2);
  const d = Math.hypot(dx, dz);
  const s = Math.max(0, k - inset / d);
  return { x: c.x + dx * s, z: c.z + dz * s };
}

/** Keep a swimmer on the water, at least `inset` metres in from the shore. */
export function keepInPond(p: Vec2, inset = 0.4): Vec2 {
  if (inPond(p, -inset)) return p;
  const c = POND.center;
  const dx = p.x - c.x;
  const dz = p.z - c.z;
  const rx = POND.rx - inset;
  const rz = POND.rz - inset;
  const k = 1 / Math.sqrt((dx / rx) ** 2 + (dz / rz) ** 2 || 1);
  return { x: c.x + dx * k * 0.98, z: c.z + dz * k * 0.98 };
}
