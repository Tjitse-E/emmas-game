// Walking routes over the meadow: A* on a 0.5 m grid, then string-pulled by line of sight so routes are short and
// straight. No rendering code here, so it runs in Vitest (node).
import { BOUNDS, OBSTACLES, POND, STABLE, inPond, type Vec2 } from '../layout';

export const CELL = 0.5;
/** Clearance kept from round obstacles, the water and the stable walls, so bodies do not clip into them. */
export const OBSTACLE_MARGIN = 0.4;
export const POND_MARGIN = 0.3;
export const BUILDING_MARGIN = 0.3;
/**
 * The slide's platform posts and first chute support stand here (not an obstacle in layout.ts). Walkers go round
 * them; LADDER_BASE and the queue spots stay walkable, so riders still reach the ladder.
 */
export const SLIDE_BLOCK = { minX: 2.85, maxX: 4.85, minZ: -0.1, maxZ: 0.9, margin: 0.2 } as const;
function inSlide(p: Vec2, margin = SLIDE_BLOCK.margin): boolean {
  return p.x > SLIDE_BLOCK.minX - margin && p.x < SLIDE_BLOCK.maxX + margin && p.z > SLIDE_BLOCK.minZ - margin && p.z < SLIDE_BLOCK.maxZ + margin;
}
/**
 * The stables as one block for walking: both buildings, the narrow gap between them and the balcony ramps on their
 * outer ends (x ±9.2), from the door fronts back. North of the buildings' back walls (BEHIND_Z) nobody walks at all:
 * the buildings hide that strip from every camera the game uses.
 */
export const STABLE_BLOCK = {
  halfX: Math.max(...STABLE.rows.map((r) => Math.abs(r.centerX))) + 3.9 + 0.8,
  frontZ: STABLE.frontZ,
} as const;
export const BEHIND_Z = STABLE.frontZ - STABLE.depth;
function inStableArea(p: Vec2, margin = BUILDING_MARGIN): boolean {
  if (p.z < BEHIND_Z) return true;
  return p.z < STABLE_BLOCK.frontZ + margin && Math.abs(p.x) < STABLE_BLOCK.halfX + margin;
}
/** Projections out of a blocked area land this far past the edge, so the result tests as walkable. */
const EDGE = 0.03;
/** Line-of-sight sample step in metres. */
const LOS_STEP = 0.1;

export function isWalkable(p: Vec2): boolean {
  if (p.x < BOUNDS.minX || p.x > BOUNDS.maxX || p.z < BOUNDS.minZ || p.z > BOUNDS.maxZ) return false;
  if (inPond(p, POND_MARGIN) || inStableArea(p) || inSlide(p)) return false;
  for (const o of OBSTACLES) {
    if (Math.hypot(p.x - o.center.x, p.z - o.center.z) < o.radius + OBSTACLE_MARGIN) return false;
  }
  return true;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const d2 = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** The nearest point on the pond's no-walk ellipse (water plus margin), pushed just outside it. */
function outOfPond(p: Vec2): Vec2 {
  const rx = POND.rx + POND_MARGIN + EDGE;
  const rz = POND.rz + POND_MARGIN + EDGE;
  const at = (t: number): Vec2 => ({ x: POND.center.x + Math.cos(t) * rx, z: POND.center.z + Math.sin(t) * rz });
  const N = 180;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const d = d2(at(t), p);
    if (d < bestD) [best, bestD] = [t, d];
  }
  // Ternary search inside the best coarse step: the distance is unimodal there.
  let lo = best - (Math.PI * 2) / N;
  let hi = best + (Math.PI * 2) / N;
  for (let i = 0; i < 30; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (d2(at(m1), p) < d2(at(m2), p)) hi = m2;
    else lo = m1;
  }
  return at((lo + hi) / 2);
}

/** Candidate points just outside every blocked shape that holds p. */
function escapes(p: Vec2): Vec2[] {
  const out: Vec2[] = [];
  for (const o of OBSTACLES) {
    const r = o.radius + OBSTACLE_MARGIN + EDGE;
    const d = d2(p, o.center);
    if (d >= r) continue;
    // From the exact centre, step out towards the camera (south), where things stay in view.
    const ux = d > 1e-6 ? (p.x - o.center.x) / d : 0;
    const uz = d > 1e-6 ? (p.z - o.center.z) / d : 1;
    out.push({ x: o.center.x + ux * r, z: o.center.z + uz * r });
  }
  if (inPond(p, POND_MARGIN)) out.push(outOfPond(p));
  if (inSlide(p)) {
    const m = SLIDE_BLOCK.margin + EDGE;
    out.push({ x: SLIDE_BLOCK.minX - m, z: p.z }, { x: SLIDE_BLOCK.maxX + m, z: p.z });
    out.push({ x: p.x, z: SLIDE_BLOCK.minZ - m }, { x: p.x, z: SLIDE_BLOCK.maxZ + m });
  }
  if (inStableArea(p)) {
    const m = BUILDING_MARGIN + EDGE;
    const side = STABLE_BLOCK.halfX + m;
    if (Math.abs(p.x) < side) {
      // Out in front into the yard, where the stable framing sees it. Only over the ramps at the outer ends is the
      // side of the stables an option too (never back behind them).
      out.push({ x: p.x, z: STABLE_BLOCK.frontZ + m });
      if (Math.abs(p.x) > STABLE_BLOCK.halfX - 0.8) {
        const z = Math.min(STABLE_BLOCK.frontZ + m, Math.max(p.z, BEHIND_Z + EDGE));
        out.push({ x: Math.sign(p.x) * side, z });
      }
    } else {
      // Behind the stables but off to the side: step south onto the meadow.
      out.push({ x: p.x, z: BEHIND_Z + EDGE });
    }
  }
  return out;
}

/** The walkable point nearest to p (p itself when it is walkable). */
export function nearestWalkable(p: Vec2): Vec2 {
  if (isWalkable(p)) return { x: p.x, z: p.z };
  const c = { x: clamp(p.x, BOUNDS.minX, BOUNDS.maxX), z: clamp(p.z, BOUNDS.minZ, BOUNDS.maxZ) };
  if (isWalkable(c)) return c;
  let best: Vec2 | null = null;
  let bestD = Infinity;
  let overlap = false;
  for (const q of escapes(c)) {
    const qc = { x: clamp(q.x, BOUNDS.minX, BOUNDS.maxX), z: clamp(q.z, BOUNDS.minZ, BOUNDS.maxZ) };
    if (!isWalkable(qc)) overlap = true;
    else if (d2(qc, p) < bestD) [best, bestD] = [qc, d2(qc, p)];
  }
  if (best && !overlap) return best;
  // Two shapes overlap here (a tree touching the stable), so a single escape can land in the other one: search
  // rings around c for anything nearer than the best escape.
  for (let r = 0.1; r < Math.min(bestD, 30); r += 0.1) {
    const n = Math.max(16, Math.ceil((Math.PI * 2 * r) / 0.1));
    let ringBest: Vec2 | null = null;
    let ringD = Infinity;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const q = { x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r };
      if (!isWalkable(q)) continue;
      const d = d2(q, p);
      if (d < ringD) [ringBest, ringD] = [q, d];
    }
    if (ringBest) return ringBest;
  }
  return best ?? { x: 0, z: 0 };
}

/** True when the straight walk from a to b stays walkable. */
export function lineOfSight(a: Vec2, b: Vec2): boolean {
  const len = d2(a, b);
  const steps = Math.max(1, Math.ceil(len / LOS_STEP));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isWalkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return isWalkable(b);
}

// ---------------------------------------------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------------------------------------------

const COLS = Math.round((BOUNDS.maxX - BOUNDS.minX) / CELL);
const ROWS = Math.round((BOUNDS.maxZ - BOUNDS.minZ) / CELL);
const cellCentre = (i: number): Vec2 => ({
  x: BOUNDS.minX + ((i % COLS) + 0.5) * CELL,
  z: BOUNDS.minZ + (Math.floor(i / COLS) + 0.5) * CELL,
});

/** 1 where a cell centre is blocked. Built once: the world's obstacles never move. */
const blocked = new Uint8Array(COLS * ROWS);
for (let i = 0; i < blocked.length; i++) blocked[i] = isWalkable(cellCentre(i)) ? 0 : 1;

/** The free cell nearest to a point, preferring cells it can see. */
function cellNear(p: Vec2): number {
  const ci = clamp(Math.floor((p.x - BOUNDS.minX) / CELL), 0, COLS - 1);
  const cj = clamp(Math.floor((p.z - BOUNDS.minZ) / CELL), 0, ROWS - 1);
  for (let r = 0; r < Math.max(COLS, ROWS); r++) {
    let best = -1;
    let bestScore = Infinity;
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
        const k = j * COLS + i;
        if (blocked[k]) continue;
        const c = cellCentre(k);
        // A visible cell wins over a hidden one at the same ring, so the first leg never cuts a corner.
        const score = d2(c, p) + (lineOfSight(p, c) ? 0 : 100);
        if (score < bestScore) [best, bestScore] = [k, score];
      }
    }
    if (best >= 0) return best;
  }
  return 0;
}

/** A tiny binary min-heap of cell indices keyed by f. */
class Heap {
  private items: number[] = [];
  private readonly f: Float64Array;
  constructor(f: Float64Array) {
    this.f = f;
  }
  get size(): number {
    return this.items.length;
  }
  push(k: number): void {
    const a = this.items;
    a.push(k);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.f[a[p]] <= this.f[a[i]]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.f[a[l]] < this.f[a[m]]) m = l;
        if (r < a.length && this.f[a[r]] < this.f[a[m]]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const g = new Float64Array(COLS * ROWS);
const f = new Float64Array(COLS * ROWS);
const from = new Int32Array(COLS * ROWS);
const state = new Uint8Array(COLS * ROWS); // 0 new, 1 open, 2 closed
const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** Cells from start to goal (or to the reachable cell closest to goal). */
function astar(start: number, goal: number): number[] {
  g.fill(Infinity);
  state.fill(0);
  const gc = cellCentre(goal);
  const h = (k: number): number => {
    const dx = Math.abs((k % COLS) - (goal % COLS));
    const dz = Math.abs(Math.floor(k / COLS) - Math.floor(goal / COLS));
    return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * CELL;
  };
  const heap = new Heap(f);
  g[start] = 0;
  f[start] = h(start);
  from[start] = -1;
  state[start] = 1;
  heap.push(start);
  let closest = start;
  let closestD = d2(cellCentre(start), gc);
  while (heap.size > 0) {
    const k = heap.pop();
    if (state[k] === 2) continue;
    state[k] = 2;
    if (k === goal) {
      closest = k;
      break;
    }
    const kd = d2(cellCentre(k), gc);
    if (kd < closestD) [closest, closestD] = [k, kd];
    const ki = k % COLS;
    const kj = Math.floor(k / COLS);
    for (const [di, dj, cost] of NEIGHBOURS) {
      const i = ki + di;
      const j = kj + dj;
      if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
      const n = j * COLS + i;
      if (blocked[n] || state[n] === 2) continue;
      // No corner cutting: a diagonal step needs both side cells free.
      if (di !== 0 && dj !== 0 && (blocked[kj * COLS + i] || blocked[j * COLS + ki])) continue;
      const ng = g[k] + cost * CELL;
      if (ng >= g[n]) continue;
      g[n] = ng;
      f[n] = ng + h(n);
      from[n] = k;
      state[n] = 1;
      heap.push(n);
    }
  }
  const cells: number[] = [];
  for (let k = closest; k !== -1; k = from[k]) cells.push(k);
  return cells.reverse();
}

/** Greedy string pulling: from each kept point, jump to the furthest later point it can see. */
function pull(points: Vec2[]): Vec2[] {
  const out = [points[0]];
  let i = 0;
  while (i < points.length - 1) {
    let j = i + 1;
    while (j + 1 < points.length && lineOfSight(points[i], points[j + 1])) j++;
    out.push(points[j]);
    i = j;
  }
  return out;
}

/**
 * A walking route from `a` to `b`: the list starts with `a` itself and ends at `b`, or at the walkable point nearest
 * to `b` when `b` is blocked (in the pond, a building, a tree, outside the fence). When `a` is blocked (a swimmer),
 * the second point is the nearest walkable point to `a`.
 */
export function route(a: Vec2, b: Vec2): Vec2[] {
  const start = nearestWalkable(a);
  let end = nearestWalkable(b);
  const head: Vec2[] = [{ x: a.x, z: a.z }];
  if (d2(start, a) > 1e-6) head.push(start);
  let body: Vec2[];
  if (lineOfSight(start, end)) {
    body = [start, end];
  } else {
    const goal = cellNear(end);
    const cells = astar(cellNear(start), goal);
    const reached = cells[cells.length - 1];
    // When b's area cannot be reached at all, end at the reachable cell nearest to it.
    if (reached !== goal) end = cellCentre(reached);
    body = pull([start, ...cells.map(cellCentre), end]);
  }
  const out = head;
  for (const p of body) {
    if (d2(p, out[out.length - 1]) > 0.01) out.push({ x: p.x, z: p.z });
  }
  if (out.length === 1) out.push({ x: end.x, z: end.z });
  return out;
}
