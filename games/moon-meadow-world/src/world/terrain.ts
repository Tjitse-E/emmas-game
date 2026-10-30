// The ground: a flat meadow inside the fence (soft greens), sandy paths and the stable yard, the pond basin, the
// white fence with flower hedges, trees, rolling hills beyond and the castle hill far to the north.
import * as THREE from 'three';
import { BOUNDS, GAZEBO, NEST, POND, RIDE, RIDE_PATHS, SLIDE, STABLE, TREES, type Vec2 } from '../layout';
import { Scenery, eachFaceUp, faceUp, fillSouth, merge, paint, paintBy, paintY, place, rng, type Geo } from './geo';

const smooth = (e0: number, e1: number, x: number): number => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The fence runs this far outside BOUNDS; hedges and trees stand further out. */
const FENCE_OUT = 0.7;
const HEDGE_OUT = 2.0;
/** Distance from the meadow rectangle (BOUNDS plus a margin) where the hills start to rise. */
const MEADOW_PAD = 3.5;

/** Signed distance in metres from the pond's edge (negative on the water). */
function pondEdge(x: number, z: number): number {
  const dx = (x - POND.center.x) / POND.rx;
  const dz = (z - POND.center.z) / POND.rz;
  const r = Math.hypot(dx, dz);
  if (r < 1e-6) return -Math.min(POND.rx, POND.rz);
  return (r - 1) * Math.hypot((dx / r) * POND.rx, (dz / r) * POND.rz);
}

function outside(x: number, z: number): number {
  const dx = Math.max(BOUNDS.minX - MEADOW_PAD - x, 0, x - BOUNDS.maxX - MEADOW_PAD);
  const dz = Math.max(BOUNDS.minZ - MEADOW_PAD - z, 0, z - BOUNDS.maxZ - MEADOW_PAD);
  return Math.hypot(dx, dz);
}

/** Where the castle hill rises, far to the north. */
export const CASTLE_HILL = { x: 6, z: -100, height: 15, sigma: 13 };

/** The nest's grassy mound: a soft bump that melts into the meadow at MOUND.radius. */
export const MOUND = { radius: 2.1, height: 0.3 } as const;
export function moundHeight(x: number, z: number): number {
  const d = Math.hypot(x - NEST.center.x, z - NEST.center.z) / MOUND.radius;
  return d >= 1 ? 0 : MOUND.height * (1 - d * d) ** 2;
}

// ---------------------------------------------------------------------------------------------------------------
// The trail beyond the gate (2.4.0, docs/v4/2.4.md 5.5)
// ---------------------------------------------------------------------------------------------------------------

/** A curve as a ground polyline, a point about every `step` metres. */
function lineOf(c: THREE.Curve<THREE.Vector3>, step = 0.4): Vec2[] {
  return c.getSpacedPoints(Math.max(4, Math.round(c.getLength() / step))).map((p) => ({ x: p.x, z: p.z }));
}

/**
 * The trail beyond the fence as ground lines: the stretch from the fork to the gate (the way home, from the fork to
 * just inside the gate), then the three roads (west, north, east), each from the fork. world/trail.ts lays its beds
 * on them; the ground cuts them flat and the trees keep off them.
 */
export const TRAIL_LINES: Vec2[][] = [
  lineOf(RIDE_PATHS.home).filter((p, i, all) => all.slice(0, i + 1).every((q) => q.z <= RIDE.gate.z + 0.5)),
  ...RIDE_PATHS.roads.map((r) => lineOf(r)),
];

/**
 * The three clearings, west, north, east: round their slots and reaching north of them, where the kit stands behind
 * the mount (world/kit.ts KIT_AT). The east one is a little smaller and further west, so it stays on the fine ground
 * cells (the base grid's columns are 6 m wide east of x 34).
 */
export const CLEARINGS: { center: Vec2; radius: number }[] = [
  { center: { x: RIDE.slots[0].x, z: RIDE.slots[0].z - 1.2 }, radius: 3.2 },
  { center: { x: RIDE.slots[1].x, z: RIDE.slots[1].z - 1.2 }, radius: 3.2 },
  { center: { x: RIDE.slots[2].x - 0.4, z: RIDE.slots[2].z - 1.3 }, radius: 2.9 },
];

/**
 * The cutting: the beds lie flat at y 0, 3 m wide, the clearings on flat pads and the fork on a flat plaza; the hills
 * stay beside them. The flat ground reaches `verge` past each bed, so every ground cell (2 m, 2.83 m across) that a
 * bed reaches has all its corners at 0 and a hidden road leaves plain ground; the banks then rise over `bank`.
 */
export const CUT = { bed: 1.5, plaza: 2.4, verge: 2.9, bank: 2.0, box: { minX: 2, maxX: 42, minZ: -52, maxZ: -19 } } as const;

function segDist(px: number, pz: number, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const t = THREE.MathUtils.clamp(((px - a.x) * abx + (pz - a.z) * abz) / (abx * abx + abz * abz || 1), 0, 1);
  return Math.hypot(px - a.x - abx * t, pz - a.z - abz * t);
}

/** Each trail line's bounds grown by the cutting's reach, so a point far from a line skips its segments. */
const REACH = CUT.bed + CUT.verge + CUT.bank;
const LINE_BOXES = TRAIL_LINES.map((l) => ({
  minX: Math.min(...l.map((p) => p.x)) - REACH, maxX: Math.max(...l.map((p) => p.x)) + REACH,
  minZ: Math.min(...l.map((p) => p.z)) - REACH, maxZ: Math.max(...l.map((p) => p.z)) + REACH,
}));

/** How far a point is outside the trail's flat ground (beds, plaza and pads with their verges), 0 or less inside. */
function pastTrail(x: number, z: number): number {
  let d = Math.hypot(x - RIDE.fork.x, z - RIDE.fork.z) - CUT.plaza;
  for (const c of CLEARINGS) d = Math.min(d, Math.hypot(x - c.center.x, z - c.center.z) - c.radius);
  TRAIL_LINES.forEach((line, k) => {
    const b = LINE_BOXES[k];
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return;
    for (let i = 1; i < line.length; i++) d = Math.min(d, segDist(x, z, line[i - 1], line[i]) - CUT.bed);
  });
  return d - CUT.verge;
}

/** 0 on the trail's flat ground, rising to 1 (the hills as they are) over the banks. */
function trailCut(x: number, z: number): number {
  const b = CUT.box;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return 1;
  return smooth(0, CUT.bank, pastTrail(x, z));
}

/** Ground height: 0 in the meadow, a basin under the pond, hills beyond the fence, cut flat along the trail. */
export function groundHeight(x: number, z: number): number {
  let h = 0;
  const s = pondEdge(x, z);
  if (s < 0.35) h -= 0.62 * smooth(0.35, -1.1, s);
  let hills = 0;
  const d = outside(x, z);
  if (d > 0) {
    hills += smooth(0, 18, d) * (2 + 1.6 * (0.5 + 0.5 * Math.sin(x * 0.13 + 0.5) * Math.cos(z * 0.11 + 1.3)));
    hills += smooth(10, 70, d) * (4 + 5 * (0.5 + 0.5 * Math.sin(x * 0.045 + 2.1) * Math.sin(z * 0.05 + 0.7)));
  }
  const c = CASTLE_HILL;
  hills += c.height * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / (2 * c.sigma * c.sigma));
  return h + hills * trailCut(x, z);
}

// ---------------------------------------------------------------------------------------------------------------
// Paths and the yard
// ---------------------------------------------------------------------------------------------------------------

const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
/** Sandy paths between the gazebo, the nest, the slide, the pond and the stable yard. */
const PATH_POINTS: THREE.Vector3[][] = [
  [v(-11.0, -0.2), v(-9.2, 1.4), v(-7.2, 2.5), v(-5.6, 2.9)],
  [v(-2.2, 3.5), v(-0.4, 3.3), v(1.1, 2.4), v(2.0, 1.2)],
  [v(1.1, 2.4), v(1.9, 3.5), v(2.6, 4.3)],
  [v(-4.3, 1.2), v(-3.7, -1.8), v(-2.5, -4.6), v(-1.6, -7.0)],
  [v(9.6, -1.7), v(8.5, -3.4), v(6.5, -5.6), v(4.3, -7.1)],
  [v(14.6, 9.6), v(12.2, 9.9), v(10.4, 9.4)],
];
const PATH_HALF = 0.62;
const PATH_SOFT = 0.2;
const paths: Vec2[][] = PATH_POINTS.map((pts) =>
  new THREE.CatmullRomCurve3(pts).getSpacedPoints(Math.max(4, Math.round(lengthOf(pts) / 0.4))).map((p) => ({ x: p.x, z: p.z })),
);
function lengthOf(pts: THREE.Vector3[]): number {
  return pts.slice(1).reduce((s, p, i) => s + p.distanceTo(pts[i]), 0);
}

/** The stable yard: a sandy rounded rectangle reaching under the stable fronts. */
const YARD = { minX: -10.8, maxX: 10.8, minZ: -14.2, maxZ: -7.2, r: 2.2 };

function yardDistance(x: number, z: number): number {
  const cx = (YARD.minX + YARD.maxX) / 2;
  const cz = (YARD.minZ + YARD.maxZ) / 2;
  const hx = (YARD.maxX - YARD.minX) / 2 - YARD.r;
  const hz = (YARD.maxZ - YARD.minZ) / 2 - YARD.r;
  const qx = Math.abs(x - cx) - hx;
  const qz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - YARD.r;
}

function segDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const t = THREE.MathUtils.clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / (abx * abx + abz * abz || 1), 0, 1);
  return Math.hypot(p.x - a.x - abx * t, p.z - a.z - abz * t);
}

/** How sandy the ground is here: 1 on a path or in the yard, 0 on grass, soft in between. */
function sandMask(x: number, z: number): number {
  let m = 1 - smooth(-0.05, 0.3, yardDistance(x, z));
  const p = { x, z };
  for (const path of paths) {
    let d = Infinity;
    for (let i = 1; i < path.length; i++) d = Math.min(d, segDistance(p, path[i - 1], path[i]));
    m = Math.max(m, 1 - smooth(PATH_HALF, PATH_HALF + PATH_SOFT, d));
    if (m >= 1) break;
  }
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------------------------------------------

const C = {
  grassA: new THREE.Color('#8fcf62'),
  grassB: new THREE.Color('#b9e275'),
  grassSun: new THREE.Color('#d2ea86'),
  hillA: new THREE.Color('#9cd68a'),
  hillTop: new THREE.Color('#c6eba6'),
  far: new THREE.Color('#a9d9b0'),
  sand: new THREE.Color('#f4dfb2'),
  sandDark: new THREE.Color('#ead09d'),
  wetSand: new THREE.Color('#dfc596'),
  under: new THREE.Color('#9fcfc8'),
};

/** The grass colour of the meadow and the hills (no sand). */
export function grassColour(x: number, z: number, out: THREE.Color): THREE.Color {
  const n = 0.5 + 0.28 * Math.sin(x * 0.21 + z * 0.13) + 0.22 * Math.sin(-x * 0.17 + z * 0.29 + 1.7);
  out.copy(C.grassA).lerp(C.grassB, THREE.MathUtils.clamp(n, 0, 1));
  const sun = Math.sin(x * 0.09 - z * 0.12 + 0.4) * Math.sin(x * 0.05 + 2);
  if (sun > 0.45) out.lerp(C.grassSun, (sun - 0.45) * 1.2);
  const d = outside(x, z);
  if (d > 2) {
    const h = groundHeight(x, z);
    const hill = tmpC.copy(C.hillA).lerp(C.hillTop, THREE.MathUtils.clamp(h / 12, 0, 1));
    out.lerp(hill, smooth(2, 10, d));
    out.lerp(C.far, smooth(40, 120, d) * 0.6);
  }
  return out;
}
const tmpC = new THREE.Color();
const tmpS = new THREE.Color();

/** The ground colour: grass, sand on paths and in the yard (unless `sand` is false), sand and wet sand at the pond. */
function groundColour(x: number, z: number, out: THREE.Color, sand = true): THREE.Color {
  grassColour(x, z, out);
  const m = sand ? sandMask(x, z) : 0;
  if (m > 0) {
    const grain = 0.5 + 0.5 * Math.sin(x * 2.1 + z * 1.3) * Math.sin(x * 0.7 - z * 1.9);
    out.lerp(tmpS.copy(C.sand).lerp(C.sandDark, grain * 0.5), m);
  }
  const s = pondEdge(x, z);
  if (s < 1.1) {
    out.lerp(C.sand, smooth(1.1, 0.55, s));
    if (s < 0.25) out.lerp(C.wetSand, smooth(0.25, -0.15, s));
    if (s < -0.25) out.lerp(C.under, smooth(-0.25, -1.0, s));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The ground mesh
// ---------------------------------------------------------------------------------------------------------------

function axis(stops: [from: number, to: number, step: number][]): number[] {
  const out: number[] = [];
  for (const [from, to, step] of stops) {
    for (let x = from; x <= to + 1e-6; x += step) if (out.length === 0 || x > out[out.length - 1] + 1e-6) out.push(x);
  }
  return out;
}

const tmpN = new THREE.Vector3();
function normalAt(x: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const e = 0.25;
  return out.set(groundHeight(x - e, z) - groundHeight(x + e, z), 2 * e, groundHeight(x, z - e) - groundHeight(x, z + e)).normalize();
}

/**
 * The ground: fine cells over the meadow and the first hills, coarser cells further out, sorted into the scenery's
 * regions so the far hills cost nothing in the follow view.
 */
/**
 * Where the ground needs fine cells beyond the meadow's (2.4.0): round the north road's cutting and the north slot's
 * pad, where the base grid's rows are 6 m apart. The patch's cells are 2 m; on its edges its extra vertices take the
 * base cell edge's own straight line, so no crack opens where the two grids meet. It adds 48 triangles to `far-n`.
 */
export const FINE_PATCHES = [{ minX: 12, maxX: 32, minZ: -48, maxZ: -36 }] as const;

export function buildGround(scenery: Scenery): void {
  const xs = axis([[-180, -70, 22], [-70, -34, 6], [-34, 34, 2], [34, 70, 6], [70, 180, 22]]);
  const zs = axis([[-230, -90, 20], [-90, -34, 6], [-34, 24, 2], [24, 54, 6], [54, 100, 23]]);
  type Buf = { p: number[]; n: number[]; c: number[] };
  const bufs = new Map<string, Buf>();
  const col = new THREE.Color();
  // Under the shore overlay the coarse cells sink a little, so their straight edges never poke through it.
  const h0 = (x: number, z: number): number => groundHeight(x, z) - 0.25 * smooth(0.5, 0, pondEdge(x, z));
  const vert = (b: Buf, x: number, z: number, y = h0(x, z)): void => {
    b.p.push(x, y, z);
    normalAt(x, z, tmpN);
    b.n.push(tmpN.x, tmpN.y, tmpN.z);
    // Grass only: paths, the yard and the shore are fine overlays, so no sand bleeds across a coarse cell.
    grassColour(x, z, col);
    b.c.push(col.r, col.g, col.b);
  };
  const cell = (x0: number, x1: number, z0: number, z1: number, alt: boolean, y: (x: number, z: number) => number): void => {
    const key = Scenery.regionOf((x0 + x1) / 2, (z0 + z1) / 2);
    let b = bufs.get(key);
    if (!b) bufs.set(key, (b = { p: [], n: [], c: [] }));
    const at = (x: number, z: number): void => vert(b, x, z, y(x, z));
    // Alternate the diagonal so the facets do not line up.
    if (alt) {
      at(x0, z0); at(x0, z1); at(x1, z1);
      at(x0, z0); at(x1, z1); at(x1, z0);
    } else {
      at(x0, z0); at(x0, z1); at(x1, z0);
      at(x1, z0); at(x0, z1); at(x1, z1);
    }
  };
  const eps = 1e-6;
  const inPatch = (x0: number, x1: number, z0: number, z1: number): boolean =>
    FINE_PATCHES.some((q) => x0 >= q.minX - eps && x1 <= q.maxX + eps && z0 >= q.minZ - eps && z1 <= q.maxZ + eps);
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const [x0, x1, z0, z1] = [xs[i], xs[i + 1], zs[j], zs[j + 1]];
      if (inPatch(x0, x1, z0, z1)) continue;
      cell(x0, x1, z0, z1, (i + j) % 2 === 0, h0);
    }
  }
  // The fine patches. A vertex on a patch's edge lies on a base cell's edge: it takes that edge's straight line
  // between the base vertices on either side of it, as the base cell draws it.
  const around = (list: number[], v: number): [number, number] => {
    let k = 0;
    while (k < list.length - 2 && list[k + 1] < v - eps) k++;
    return [list[k], list[k + 1]];
  };
  const onList = (list: number[], v: number): boolean => list.some((w) => Math.abs(w - v) < eps);
  for (const q of FINE_PATCHES) {
    const edgeY = (x: number, z: number): number => {
      const side = Math.abs(x - q.minX) < eps || Math.abs(x - q.maxX) < eps;
      const end = Math.abs(z - q.minZ) < eps || Math.abs(z - q.maxZ) < eps;
      if (side && !onList(zs, z)) {
        const [za, zb] = around(zs, z);
        return THREE.MathUtils.lerp(h0(x, za), h0(x, zb), (z - za) / (zb - za));
      }
      if (end && !onList(xs, x)) {
        const [xa, xb] = around(xs, x);
        return THREE.MathUtils.lerp(h0(xa, z), h0(xb, z), (x - xa) / (xb - xa));
      }
      return h0(x, z);
    };
    for (let z = q.minZ, j = 0; z < q.maxZ - eps; z += 2, j++) {
      for (let x = q.minX, i = 0; x < q.maxX - eps; x += 2, i++) cell(x, x + 2, z, z + 2, (i + j) % 2 === 0, edgeY);
    }
  }
  for (const [key, b] of bufs) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    g.setIndex([...Array(b.p.length / 3).keys()]);
    scenery.add(g, key);
  }
}

/**
 * Paths, the yard and the pond shore drawn as fine overlays just above the ground, so their edges and the waterline
 * stay smooth where the ground cells are coarse.
 */
export function buildOverlays(scenery: Scenery): void {
  const col = new THREE.Color();
  const lift = (x: number, z: number, y: number): number => Math.max(groundHeight(x, z), 0) + y;

  // Paths: a ribbon each with round caps. Vertices sit exactly where the sand ends and where the soft edge meets
  // the grass, so the edge stays crisp; colours come from the shared sand mask, so crossings agree.
  paths.forEach((path, k) => {
    const lift = 0.045 + k * 0.004;
    const H = PATH_HALF;
    const O = PATH_HALF + PATH_SOFT;
    const across = [-O, -H, 0, H, O];
    const p: number[] = [];
    const c: number[] = [];
    const idx: number[] = [];
    const vert = (x: number, z: number): number => {
      p.push(x, Math.max(groundHeight(x, z), 0) + lift, z);
      groundColour(x, z, col);
      c.push(col.r, col.g, col.b);
      return p.length / 3 - 1;
    };
    const normal = (i: number): [number, number] => {
      const a = path[Math.max(0, i - 1)];
      const b = path[Math.min(path.length - 1, i + 1)];
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return [-(b.z - a.z) / l, (b.x - a.x) / l];
    };
    for (let i = 0; i < path.length; i++) {
      const [nx, nz] = normal(i);
      for (const o of across) vert(path[i].x + nx * o, path[i].z + nz * o);
    }
    const w = across.length;
    for (let i = 0; i < path.length - 1; i++) {
      for (let j = 0; j < w - 1; j++) {
        const a0 = i * w + j;
        const b0 = a0 + w;
        idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
      }
    }
    // Round caps: half discs at both ends, turning from one side of the ribbon to the other.
    for (const end of [0, path.length - 1]) {
      const [nx, nz] = normal(end);
      const dir = end === 0 ? -1 : 1;
      // Outwards along the path: forwards at the last point, backwards at the first.
      const tx = nz * dir;
      const tz = -nx * dir;
      const e = path[end];
      const centre = end * w + 2;
      const SEG = 9;
      let prevIn = end * w + (dir > 0 ? 1 : 3);
      let prevOut = end * w + (dir > 0 ? 0 : 4);
      for (let s2 = 1; s2 <= SEG; s2++) {
        const ang = (s2 / SEG) * Math.PI;
        const sx = dir > 0 ? -nx : nx;
        const sz = dir > 0 ? -nz : nz;
        const ux = sx * Math.cos(ang) + tx * Math.sin(ang);
        const uz = sz * Math.cos(ang) + tz * Math.sin(ang);
        const vin = s2 === SEG ? end * w + (dir > 0 ? 3 : 1) : vert(e.x + ux * H, e.z + uz * H);
        const vout = s2 === SEG ? end * w + (dir > 0 ? 4 : 0) : vert(e.x + ux * O, e.z + uz * O);
        idx.push(centre, prevIn, vin, prevIn, prevOut, vout, prevIn, vout, vin);
        prevIn = vin;
        prevOut = vout;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    eachFaceUp(g);
    g.computeVertexNormals();
    flattenNormals(g);
    scenery.add(g);
  });

  // The yard: an exact rounded rectangle (fan from its centre) with a soft rim that fades into the grass.
  {
    const cx = (YARD.minX + YARD.maxX) / 2;
    const cz = (YARD.minZ + YARD.maxZ) / 2;
    const hx = (YARD.maxX - YARD.minX) / 2 - YARD.r;
    const hz = (YARD.maxZ - YARD.minZ) / 2 - YARD.r;
    const outline: Vec2[] = [];
    const corners: [number, number, number][] = [[hx, hz, 0], [-hx, hz, 0.5], [-hx, -hz, 1], [hx, -hz, 1.5]];
    for (const [ox, oz, a0] of corners) {
      for (let i = 0; i <= 8; i++) {
        const a = (a0 + (i / 8) * 0.5) * Math.PI;
        outline.push({ x: cx + ox + Math.cos(a) * YARD.r, z: cz + oz + Math.sin(a) * YARD.r });
      }
    }
    // Inner rings so the sand's colour variation has vertices to live on.
    const rings = [0, 0.35, 0.7, 0.88, 1];
    const rim = 0.3;
    const p: number[] = [];
    const c: number[] = [];
    const idx: number[] = [];
    const n = outline.length;
    for (const k of [...rings, -1]) {
      for (const o of outline) {
        let x = cx + (o.x - cx) * Math.max(k, 0);
        let z = cz + (o.z - cz) * Math.max(k, 0);
        if (k < 0) {
          // The soft rim: pushed out along the direction from the nearest straight-edge point.
          const dx = o.x - THREE.MathUtils.clamp(o.x, cx - hx, cx + hx);
          const dz = o.z - THREE.MathUtils.clamp(o.z, cz - hz, cz + hz);
          const dl = Math.hypot(dx, dz) || 1;
          x = o.x + (dx / dl) * rim;
          z = o.z + (dz / dl) * rim;
        }
        p.push(x, 0.012, z);
        groundColour(x, z, col);
        c.push(col.r, col.g, col.b);
      }
    }
    const ringCount = rings.length + 1;
    for (let r = 0; r < ringCount - 1; r++) {
      for (let i = 0; i < n; i++) {
        const a0 = r * n + i;
        const a1 = r * n + ((i + 1) % n);
        const b0 = a0 + n;
        const b1 = a1 + n;
        idx.push(a0, a1, b0, a1, b1, b0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    eachFaceUp(g);
    g.computeVertexNormals();
    flattenNormals(g);
    scenery.add(g);
  }

  // The pond shore: rings around the ellipse from under the water to the grass, on the true basin shape.
  {
    const offsets = [-1.6, -1.0, -0.55, -0.25, 0, 0.25, 0.55, 0.85, 1.25];
    const N = 96;
    const p: number[] = [];
    const c: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const ex = Math.cos(t) * POND.rx;
      const ez = Math.sin(t) * POND.rz;
      // Outward normal of the ellipse.
      const nx = Math.cos(t) / POND.rx;
      const nz = Math.sin(t) / POND.rz;
      const nl = Math.hypot(nx, nz);
      for (const o of offsets) {
        const x = POND.center.x + ex + (nx / nl) * o;
        const z = POND.center.z + ez + (nz / nl) * o;
        p.push(x, groundHeight(x, z) + 0.035, z);
        // Paths lie on top of the shore, so the shore itself carries no path sand (it would show its coarse cells).
        groundColour(x, z, col, false);
        c.push(col.r, col.g, col.b);
      }
    }
    const k = offsets.length;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < k - 1; j++) {
        const a0 = i * k + j;
        const b0 = a0 + k;
        idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    scenery.add(g);
  }
}

/** Ground overlays light like the flat ground around them, whatever their triangulation. */
function flattenNormals(g: Geo): void {
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
}

// ---------------------------------------------------------------------------------------------------------------
// Fence and hedges
// ---------------------------------------------------------------------------------------------------------------

const FENCE = {
  minX: BOUNDS.minX - FENCE_OUT, maxX: BOUNDS.maxX + FENCE_OUT, minZ: BOUNDS.minZ - FENCE_OUT, maxZ: BOUNDS.maxZ + FENCE_OUT,
};

/** The four sides of a rectangle as [from, to] pairs, split into pieces of at most `max` metres. */
function sides(r: { minX: number; maxX: number; minZ: number; maxZ: number }, max: number): [Vec2, Vec2][] {
  const corners: Vec2[] = [
    { x: r.minX, z: r.maxZ }, { x: r.maxX, z: r.maxZ }, { x: r.maxX, z: r.minZ }, { x: r.minX, z: r.minZ },
  ];
  const out: [Vec2, Vec2][] = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / max);
    for (let k = 0; k < n; k++) {
      out.push([
        { x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n },
        { x: a.x + ((b.x - a.x) * (k + 1)) / n, z: a.z + ((b.z - a.z) * (k + 1)) / n },
      ]);
    }
  }
  return out;
}

/**
 * The gate's opening in the north fence (2.4.0, docs/v4/2.4.md 5.5): the gate and its posts (world/paddock.ts) fill
 * it. The fence's own posts keep a metre clear of it, so the fence there has no more triangles than 2.3's (its
 * region, `ne`, is drawn in the stable views).
 */
export const FENCE_GAP = { minX: RIDE.gate.x - 1.62, maxX: RIDE.gate.x + 1.62, z: BOUNDS.minZ - FENCE_OUT, postClear: 1.0 } as const;

export function buildFence(scenery: Scenery): void {
  const white = '#fffdf7';
  for (const [a, b] of sides(FENCE, 13.5)) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ry = -Math.atan2(b.z - a.z, b.x - a.x);
    const parts: Geo[] = [];
    const posts = Math.max(1, Math.round(len / 2.6));
    // The north side's piece that holds the gate: its posts keep clear and its rails stop at the gate's posts.
    const north = Math.abs(a.z - FENCE_GAP.z) < 1e-6 && Math.abs(b.z - FENCE_GAP.z) < 1e-6;
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    const gated = north && lo < FENCE_GAP.minX && hi > FENCE_GAP.maxX;
    for (let i = 0; i < posts; i++) {
      const t = i / posts;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (gated && x > FENCE_GAP.minX - FENCE_GAP.postClear && x < FENCE_GAP.maxX + FENCE_GAP.postClear) continue;
      parts.push(place(paint(new THREE.BoxGeometry(0.15, 0.95, 0.15), white), { x, y: 0.475, z, ry }));
      parts.push(place(paint(new THREE.ConeGeometry(0.12, 0.16, 4), white), { x, y: 1.03, z, ry: ry + Math.PI / 4 }));
    }
    // Rails along the piece, or on both sides of the gate.
    const spans: [number, number][] = gated
      ? [[hi + 0.05, FENCE_GAP.maxX + 0.02], [FENCE_GAP.minX - 0.02, lo - 0.05]]
      : [[(a.x + b.x) / 2 + (len + 0.1) / 2, (a.x + b.x) / 2 - (len + 0.1) / 2]];
    for (const y of [0.42, 0.76]) {
      if (!gated) {
        parts.push(place(paint(new THREE.BoxGeometry(len + 0.1, 0.1, 0.06), '#fbf5ee'), { x: (a.x + b.x) / 2, y, z: (a.z + b.z) / 2, ry }));
        continue;
      }
      for (const [x0, x1] of spans) parts.push(place(paint(new THREE.BoxGeometry(x0 - x1, 0.1, 0.06), '#fbf5ee'), { x: (x0 + x1) / 2, y, z: a.z, ry }));
    }
    for (const g of parts) scenery.add(g, Scenery.regionOf((a.x + b.x) / 2, (a.z + b.z) / 2));
  }
}

/** Places on the hedge tops for flowers, filled by buildHedges. */
export interface HedgeFlowers {
  at: THREE.Vector3[];
}

/**
 * The trail's opening in the north hedge (2.4.0): 4.2 m, the 3 m bed with room to spare. The hedge's rings that fall
 * in the opening fold into a round end of `cap` metres on each side of it, and the rest lie flat on the ground across
 * the opening, so the hedge keeps every triangle it had (its region is drawn in the stable views) and the random
 * flowers on the rest stay where they were.
 */
export const HEDGE_GAP = { minX: RIDE.gate.x - 2.1, maxX: RIDE.gate.x + 2.1, z: BOUNDS.minZ - FENCE_OUT - HEDGE_OUT, cap: 0.65, flat: 0.75 } as const;

/**
 * Where a hedge ring at (x, z) goes, and how much of the hedge stands there (1 full, 0 flat): the rings from a cap's
 * start to `flat` short of the opening's middle fold into the cap, standing in a quarter circle down to the opening's
 * edge; the rings nearer the middle lie flat at the edge (rings are at most 0.7 m apart, so each side has one).
 */
function hedgeRing(x: number, z: number): { x: number; stands: number } {
  if (Math.abs(z - HEDGE_GAP.z) > 0.01) return { x, stands: 1 };
  const { minX, maxX, cap, flat } = HEDGE_GAP;
  const mid = (minX + maxX) / 2;
  const west = x <= mid;
  const from = west ? minX - cap : maxX + cap;
  const to = west ? mid - flat : mid + flat;
  const u = (x - from) / (to - from);
  if (u <= 0) return { x, stands: 1 };
  if (u >= 1) return { x: west ? minX : maxX, stands: 0 };
  return { x: from + (west ? cap : -cap) * u, stands: Math.sqrt(1 - u * u) };
}

export function buildHedges(scenery: Scenery, flowers: HedgeFlowers): void {
  const r = rng(11);
  const H = { minX: FENCE.minX - HEDGE_OUT, maxX: FENCE.maxX + HEDGE_OUT, minZ: FENCE.minZ - HEDGE_OUT, maxZ: FENCE.maxZ + HEDGE_OUT };
  const lo = new THREE.Color('#6db56c');
  const hi = new THREE.Color('#a4dc8c');
  for (const [a, b] of sides(H, 14.5)) {
    const len = Math.hypot(b.x - a.x, b.z - a.z) + 1.2;
    const ux = (b.x - a.x) / (len - 1.2);
    const uz = (b.z - a.z) / (len - 1.2);
    // Outward is to the left of the walking direction (corners run clockwise seen from above).
    const ox = -uz;
    const oz = ux;
    const steps = Math.ceil(len / 0.7);
    const ring = 5;
    const p: number[] = [];
    const c: number[] = [];
    const idx: number[] = [];
    const col = new THREE.Color();
    for (let i = 0; i <= steps; i++) {
      const s = -0.6 + (i / steps) * len;
      const fold = hedgeRing(a.x + ux * s, a.z + uz * s);
      const wx = fold.x;
      const wz = a.z + uz * s;
      const g = wx * 0.9 + wz * 1.1;
      const stands = fold.stands;
      const height = (0.82 + 0.14 * Math.sin(g * 1.7) + 0.08 * Math.sin(g * 4.1 + 1)) * stands;
      const half = (0.62 + 0.08 * Math.sin(g * 2.3 + 0.5)) * stands;
      for (let k = 0; k <= ring; k++) {
        const ang = (k / ring) * Math.PI;
        const across = Math.cos(ang) * half;
        const up = Math.sin(ang) * height;
        p.push(wx + ox * across, up - 0.04, wz + oz * across);
        col.copy(lo).lerp(hi, Math.pow(Math.sin(ang) * (0.7 + 0.3 * Math.cos(ang + 0.6)), 1.2));
        c.push(col.r, col.g, col.b);
      }
      if (i % 2 === 0 && r() < 0.7) {
        const ang = Math.PI * (0.25 + r() * 0.5);
        if (stands > 0.95) flowers.at.push(new THREE.Vector3(wx + ox * Math.cos(ang) * half, Math.sin(ang) * height - 0.02, wz + oz * Math.cos(ang) * half));
      }
    }
    for (let i = 0; i < steps; i++) {
      for (let k = 0; k < ring; k++) {
        const a0 = i * (ring + 1) + k;
        const b0 = a0 + ring + 1;
        idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    faceUp(g);
    scenery.add(g, Scenery.regionOf((a.x + b.x) / 2, (a.z + b.z) / 2));
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------------------------------------------

export interface TreeSpot {
  x: number;
  z: number;
  s: number;
  colour: string;
  kind: 'round' | 'cypress';
}

const TREE_COLOURS = ['#8fd18a', '#7fca8e', '#a2d877', '#94d6a4', '#f5b5cf', '#cdb8f2', '#9fd68f', '#f7c7a8'];

/**
 * Every tree: the six inside the fence (the round obstacles in layout.ts) and the woods and hills beyond, with the
 * trees beyond the fence kept off the trail (2.4.0): each keeps 3 m and its crown from a bed, its crown and the kit's
 * room from a clearing, and clear of the signpost. A tree in the way moves to the nearest free spot and keeps its kind
 * and size, so the woods cost exactly what they did.
 */
export function treeSpots(): TreeSpot[] {
  const spots = seededTrees();
  for (let k = TREES.length; k < spots.length; k++) {
    const t = spots[k];
    if (offTrail(t.x, t.z, t.s)) continue;
    const others = spots.filter((o) => o !== t);
    const free = (x: number, z: number): boolean =>
      offTrail(x, z, t.s) && beyondHedge(x, z) && others.every((o) => Math.hypot(o.x - x, o.z - z) >= (o.s + t.s) * 1.25);
    found: for (let r = 0.5; r < 30; r += 0.5) {
      const n = Math.max(12, Math.ceil((Math.PI * 2 * r) / 0.75));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = t.x + Math.cos(a) * r;
        const z = t.z + Math.sin(a) * r;
        if (!free(x, z)) continue;
        t.x = x;
        t.z = z;
        break found;
      }
    }
  }
  return spots;
}

/** Off the trail with a crown of `s`: 3 m and the crown from every bed, the kit's room from the clearings, the post. */
function offTrail(x: number, z: number, s: number): boolean {
  for (const line of TRAIL_LINES) for (let i = 1; i < line.length; i++) if (segDist(x, z, line[i - 1], line[i]) < 3 + s * 1.15) return false;
  for (const c of CLEARINGS) if (Math.hypot(x - c.center.x, z - c.center.z) < c.radius + 2.2 + s * 1.15) return false;
  if (Math.hypot(x - RIDE.fork.x, z - RIDE.fork.z) < CUT.plaza + 2 + s) return false;
  return Math.hypot(x - RIDE.post.x, z - RIDE.post.z) >= 1.5 + s;
}

/** Outside the hedges, where the woods grow. */
function beyondHedge(x: number, z: number): boolean {
  const m = HEDGE_OUT + 1.5;
  return x < FENCE.minX - m || x > FENCE.maxX + m || z < FENCE.minZ - m || z > FENCE.maxZ + m;
}

function seededTrees(): TreeSpot[] {
  const r = rng(7);
  const out: TreeSpot[] = [];
  const pick = (): string => {
    const k = r();
    // Mostly greens, with pink, lilac and peach blossom trees as accents.
    if (k < 0.6) return TREE_COLOURS[[0, 1, 2, 3, 6][Math.floor(r() * 5)]];
    return TREE_COLOURS[[4, 5, 7][Math.floor(r() * 3)]];
  };
  for (const o of TREES) out.push({ x: o.center.x, z: o.center.z, s: o.radius * 1.05, colour: pick(), kind: 'round' });
  // A belt of trees just outside the hedges, denser to the north (the top of the screen).
  const tryAdd = (x: number, z: number, s: number, kind: TreeSpot['kind']): void => {
    for (const t of out) if (Math.hypot(t.x - x, t.z - z) < (t.s + s) * 1.25) return;
    out.push({ x, z, s, colour: pick(), kind });
  };
  for (let i = 0; i < 900 && out.length < 56; i++) {
    const side = r();
    let x: number;
    let z: number;
    if (side < 0.42) {
      x = -36 + r() * 72;
      z = FENCE.minZ - 4 - r() * 9;
    } else if (side < 0.62) {
      x = FENCE.minX - 4.2 - r() * 8;
      z = -34 + r() * 56;
    } else if (side < 0.82) {
      x = FENCE.maxX + 4.2 + r() * 8;
      z = -34 + r() * 56;
    } else {
      x = -34 + r() * 68;
      z = FENCE.maxZ + 4.2 + r() * 6;
    }
    tryAdd(x, z, 1.1 + r() * 0.6, r() < 0.22 ? 'cypress' : 'round');
  }
  // Scattered trees on the hills, for the opening shot.
  for (let i = 0; i < 400 && out.length < 76; i++) {
    const x = -90 + r() * 180;
    const z = -120 + r() * 95;
    if (outside(x, z) < 14 || Math.hypot(x - CASTLE_HILL.x, z - CASTLE_HILL.z) < 22) continue;
    tryAdd(x, z, 1.8 + r() * 1.2, r() < 0.6 ? 'cypress' : 'round');
  }
  return out;
}

/** A lumpy sphere: soft bumps, shaded lighter on top and to the west (the vertex colours are a shade; trees tint them). */
function lumpy(segW: number, segH: number, seed: number): Geo {
  const g = new THREE.SphereGeometry(1, segW, segH);
  const p = g.attributes.position;
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i);
    const bump = 1 + 0.08 * Math.sin(n.x * 5 + n.y * 3 + seed) * Math.cos(n.z * 4 - n.y * 2 + seed);
    p.setXYZ(i, n.x * bump, n.y * bump * 0.92, n.z * bump);
  }
  g.computeVertexNormals();
  return g;
}

function shadeCrown(g: Geo, y0: number, y1: number): Geo {
  return paintBy(g, (x, y, z, out) => {
    const shade = 0.78 + 0.22 * THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1) + 0.05 * THREE.MathUtils.clamp(-x + z * 0.3, -1, 1);
    out.setRGB(shade, shade, shade);
  });
}

/** The big round trees inside the fence: three soft blobs, a cloud of leaves. */
function grandCrown(): Geo {
  return fillSouth(merge([
    shadeCrown(place(lumpy(12, 8, 0), { y: 0.15 }), -1, 1.2),
    shadeCrown(place(lumpy(10, 7, 1), { x: 0.62, y: -0.25, z: 0.25, s: 0.68 }), -1, 1.2),
    shadeCrown(place(lumpy(10, 7, 2), { x: -0.6, y: -0.2, z: 0.2, s: 0.64 }), -1, 1.2),
  ]), 0.7);
}

function roundCrown(): Geo {
  return fillSouth(shadeCrown(lumpy(10, 7, 0), -0.4, 0.9), 0.6);
}

function cypressCrown(): Geo {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(new THREE.Vector2(Math.max(0.001, Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.62 * (1 - t * 0.35)), t * 3.2 - 0.6));
  }
  const g = new THREE.LatheGeometry(pts, 8);
  return fillSouth(paintBy(g, (_x, y, _z, out) => {
    const shade = 0.8 + 0.2 * THREE.MathUtils.clamp((y + 0.6) / 3.2, 0, 1);
    out.setRGB(shade, shade, shade);
  }), 0.6);
}

const CYPRESS_COLOURS = ['#6fc28e', '#7dcc98', '#76c3a6', '#8bd29a'];

/** Trees as instanced meshes: the grand trees, round crowns, cypress crowns and trunks (four draw calls). */
export function buildTrees(material: THREE.Material): THREE.InstancedMesh[] {
  const spots = treeSpots();
  const inner = new Set(spots.slice(0, TREES.length));
  const grands = spots.filter((t) => inner.has(t));
  const rounds = spots.filter((t) => t.kind === 'round' && !inner.has(t));
  const cypresses = spots.filter((t) => t.kind === 'cypress');
  const grand = new THREE.InstancedMesh(grandCrown(), material, grands.length);
  const crowns = new THREE.InstancedMesh(roundCrown(), material, rounds.length);
  const cones = new THREE.InstancedMesh(cypressCrown(), material, cypresses.length);
  const trunkGeo = fillSouth(paintY(new THREE.CylinderGeometry(0.13, 0.2, 1, 7, 1, true), '#a8784f', '#c99a6c', -0.5, 0.5));
  place(trunkGeo, { y: 0.5 });
  const trunks = new THREE.InstancedMesh(trunkGeo, material, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  const r = rng(3);
  const crown = (mesh: THREE.InstancedMesh, list: TreeSpot[]): void =>
    list.forEach((t, i) => {
      const y = groundHeight(t.x, t.z);
      const sy = t.s * (0.9 + r() * 0.2);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (r() - 0.5) * 0.8);
      m.compose(new THREE.Vector3(t.x, y + 1.15 * t.s + 0.85 * sy, t.z), q, new THREE.Vector3(t.s, sy, t.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(t.colour));
    });
  crown(grand, grands);
  crown(crowns, rounds);
  cypresses.forEach((t, i) => {
    const y = groundHeight(t.x, t.z);
    m.compose(new THREE.Vector3(t.x, y + 0.75 * t.s, t.z), q.identity(), new THREE.Vector3(t.s, t.s, t.s));
    cones.setMatrixAt(i, m);
    cones.setColorAt(i, col.set(CYPRESS_COLOURS[i % CYPRESS_COLOURS.length]));
  });
  spots.forEach((t, i) => {
    const y = groundHeight(t.x, t.z);
    const h = t.kind === 'round' ? 1.25 * t.s : 0.9 * t.s;
    m.compose(new THREE.Vector3(t.x, y, t.z), q.identity(), new THREE.Vector3(t.s * 0.9, h, t.s * 0.9));
    trunks.setMatrixAt(i, m);
  });
  for (const mesh of [grand, crowns, cones, trunks]) {
    mesh.computeBoundingSphere();
    mesh.matrixAutoUpdate = false;
  }
  grand.name = 'tree-grand';
  crowns.name = 'tree-crowns';
  cones.name = 'tree-cypress';
  trunks.name = 'tree-trunks';
  return [grand, crowns, cones, trunks];
}

// ---------------------------------------------------------------------------------------------------------------
// Grass tufts and flowers
// ---------------------------------------------------------------------------------------------------------------

/**
 * The paddock's sand and the bed from its rail to the gate (2.4.0, world/paddock.ts): no tuft or flower shows there.
 * The growth loop still counts and draws its random numbers for them as before, so everywhere else every tuft and
 * flower stays where 2.3 put it.
 */
function onPaddockSand(x: number, z: number): boolean {
  const p = RIDE.paddock;
  if (x > p.minX - 0.45 && x < p.maxX + 0.45 && z > p.minZ - 0.45 && z < p.maxZ + 0.45) return true;
  return z < p.minZ && z > RIDE.gate.z - 0.3 && x > RIDE.gate.x - 1.6 && x < RIDE.rail.gapX + 1.6;
}

/** True where grass and flowers may grow: on the meadow, off paths and clear of every place. */
function growsHere(x: number, z: number): boolean {
  if (x < BOUNDS.minX - 0.2 || x > BOUNDS.maxX + 0.2 || z < BOUNDS.minZ - 0.2 || z > BOUNDS.maxZ + 0.2) return false;
  if (sandMask(x, z) > 0.02 || pondEdge(x, z) < 1.4) return false;
  if (Math.hypot(x - NEST.center.x, z - NEST.center.z) < 2.5) return false;
  if (Math.hypot(x - GAZEBO.center.x, z - GAZEBO.center.z) < GAZEBO.radius + 0.6) return false;
  if (x > SLIDE.ladderBase.x - 1 && x < 7 && z > -0.8 && z < 2.2) return false;
  for (const r of STABLE.rows) {
    if (Math.abs(x - r.centerX) < 5.4 && z < STABLE.frontZ + 0.8 && z > STABLE.frontZ - STABLE.depth - 0.8) return false;
  }
  for (const o of TREES) if (Math.hypot(x - o.center.x, z - o.center.z) < 0.5) return false;
  return true;
}

function tuftGeometry(): Geo {
  const p: number[] = [];
  const c: number[] = [];
  const lo = new THREE.Color('#68b852');
  const hi = new THREE.Color('#b9e98a');
  const blades = [
    [-0.1, 0.22, -0.4],
    [-0.03, 0.3, -0.1],
    [0.04, 0.27, 0.2],
    [0.11, 0.2, 0.45],
  ];
  for (const [x, h, lean] of blades) {
    p.push(x - 0.035, 0, 0, x + 0.035, 0, 0, x + lean * 0.2, h, -0.02);
    c.push(lo.r, lo.g, lo.b, lo.r, lo.g, lo.b, hi.r, hi.g, hi.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  // Blades light like the ground under them, so tufts read as grass rather than paper.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(p.length / 3).fill([0, 1, 0]).flat(), 3));
  return g;
}

/** A five-petal flower head lying in the grass: kite petals (white, tinted per flower) and a golden centre. */
function flowerGeometry(): Geo {
  const p: number[] = [];
  const c: number[] = [];
  const centre = [1, 0.84, 0.3];
  const at = (a: number, r: number, y: number): void => void p.push(Math.cos(a) * r, y, Math.sin(a) * r);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    // Two triangles per petal (base, shoulder, tip, shoulder), wound to face up.
    at(a, 0.03, 0.02); at(a, 0.175, 0.035); at(a - 0.5, 0.12, 0.03);
    at(a, 0.03, 0.02); at(a + 0.5, 0.12, 0.03); at(a, 0.175, 0.035);
    for (let i = 0; i < 6; i++) c.push(1, 1, 1);
  }
  const ring = [0, 1, 2, 3, 4].map((k) => (k / 5) * Math.PI * 2 + 0.3);
  for (const [i, j, k] of [[0, 2, 1], [0, 3, 2], [0, 4, 3]]) {
    for (const n of [i, j, k]) at(ring[n], 0.06, 0.05);
    c.push(...centre, ...centre, ...centre);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

const FLOWER_COLOURS = ['#ffffff', '#ffc4df', '#ff8fc2', '#fff09a', '#d4bdff', '#ffbd9e', '#b5dcff', '#ffffff'];

/**
 * Copies of a small template (a tuft, a flower) baked into the region meshes: they are static, so they cost no draw
 * calls of their own and the camera skips them with their region.
 */
class Sprinkle {
  private readonly out = new Map<string, { p: number[]; n: number[]; c: number[] }>();
  private readonly v = new THREE.Vector3();
  private readonly nm = new THREE.Matrix3();
  private readonly template: Geo;
  constructor(template: Geo) {
    this.template = template;
  }

  add(m: THREE.Matrix4, tint: THREE.Color | null, x: number, z: number): void {
    const key = Scenery.regionOf(x, z);
    let b = this.out.get(key);
    if (!b) this.out.set(key, (b = { p: [], n: [], c: [] }));
    const tp = this.template.attributes.position;
    const tn = this.template.attributes.normal;
    const tc = this.template.attributes.color;
    this.nm.getNormalMatrix(m);
    for (let i = 0; i < tp.count; i++) {
      this.v.fromBufferAttribute(tp, i).applyMatrix4(m);
      b.p.push(this.v.x, this.v.y, this.v.z);
      this.v.fromBufferAttribute(tn, i).applyMatrix3(this.nm).normalize();
      b.n.push(this.v.x, this.v.y, this.v.z);
      b.c.push(tc.getX(i) * (tint?.r ?? 1), tc.getY(i) * (tint?.g ?? 1), tc.getZ(i) * (tint?.b ?? 1));
    }
  }

  into(scenery: Scenery): void {
    for (const [key, b] of this.out) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
      g.setIndex([...Array(b.p.length / 3).keys()]);
      scenery.add(g, key);
    }
    this.template.dispose();
  }
}

/** Grass tufts and flowers, baked into the scenery regions. */
export function buildGrowth(scenery: Scenery, hedge: HedgeFlowers, extra: THREE.Vector3[]): void {
  const r = rng(21);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const tufts = new Sprinkle(tuftGeometry());
  let count = 0;
  // Tufts in loose clumps, so the meadow reads as grass without carpeting it.
  for (let i = 0; i < 6000 && count < 850; i++) {
    const cx = BOUNDS.minX + r() * (BOUNDS.maxX - BOUNDS.minX);
    const cz = BOUNDS.minZ + r() * (BOUNDS.maxZ - BOUNDS.minZ);
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const x = cx + (r() - 0.5) * 1.0;
      const z = cz + (r() - 0.5) * 1.0;
      if (!growsHere(x, z)) continue;
      e.set(0, (r() - 0.5) * 1.1, 0);
      const s = 0.9 + r() * 0.8;
      const at = m.compose(pos.set(x, 0, z), q.setFromEuler(e), sc.set(s, s * (0.8 + r() * 0.5), s));
      if (!onPaddockSand(x, z)) tufts.add(at, null, x, z);
      count++;
    }
  }
  tufts.into(scenery);

  const flowers = new Sprinkle(flowerGeometry());
  const tint = new THREE.Color();
  const add = (x: number, y: number, z: number, s: number, colour: string, tilt: number): void => {
    // Spin each head, then tilt it a little towards the camera (south) so it reads as a flower from above.
    e.set(tilt * (0.6 + r() * 0.4), r() * Math.PI * 2, 0, 'XYZ');
    if (onPaddockSand(x, z)) return;
    flowers.add(m.compose(pos.set(x, y, z), q.setFromEuler(e), sc.set(s, s, s)), tint.set(colour), x, z);
  };
  // Flower patches on the meadow, one colour each with a few white ones among them.
  count = 0;
  for (let i = 0; i < 900 && count < 380; i++) {
    const cx = BOUNDS.minX + r() * (BOUNDS.maxX - BOUNDS.minX);
    const cz = BOUNDS.minZ + r() * (BOUNDS.maxZ - BOUNDS.minZ);
    if (!growsHere(cx, cz)) continue;
    const colour = FLOWER_COLOURS[Math.floor(r() * FLOWER_COLOURS.length)];
    const n = 5 + Math.floor(r() * 7);
    for (let k = 0; k < n; k++) {
      const x = cx + (r() - 0.5) * 1.8;
      const z = cz + (r() - 0.5) * 1.8;
      if (!growsHere(x, z)) continue;
      add(x, 0, z, 1.0 + r() * 0.6, r() < 0.78 ? colour : '#ffffff', 0.25);
      count++;
    }
  }
  for (const p of hedge.at) add(p.x, p.y, p.z, 1.2 + r() * 0.5, ['#ffffff', '#ff8fc2', '#fff09a', '#ffc4df'][Math.floor(r() * 4)], 0.6);
  for (const p of extra) add(p.x, p.y, p.z, 1.1 + r() * 0.4, ['#ffffff', '#ffc4df', '#fff09a'][Math.floor(r() * 3)], 0.2);
  flowers.into(scenery);
}
