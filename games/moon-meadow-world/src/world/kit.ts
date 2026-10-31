// The clearing kit (2.4.0, docs/v4/2.4.md section 5.5): one low-poly model per sign word, built to look like its v3
// word picture (dev/world.html?view=clearings shows all 13 side by side, the contact sheet). Each is one geometry of
// under 600 triangles in the shared vertex-coloured material, so it compiles no shader of its own; world/trail.ts
// makes one mesh per kind at load, hidden, and moves it to its slot when the slots are dressed. Each model stands in
// a circle of KIT_RADIUS round its origin, on the ground, its front to the south (to the camera).
import * as THREE from 'three';
import type { SignWord } from '../contracts';
import { RIDE, type Vec2 } from '../layout';
import { blob, fillSouth, merge, paint, paintBy, paintY, place, type Geo } from './geo';

/** Every model stands inside this circle (metres) round its origin, and lower than KIT_HEIGHT. */
export const KIT_RADIUS = 1.6;
export const KIT_HEIGHT = 3;

/**
 * Where each slot's kit stands: behind the slot (north of it, so the mount stopping at the slot sees it ahead or to
 * its side and the follow camera sees it past the mount), inside its clearing (terrain.ts CLEARINGS).
 */
export const KIT_AT: readonly Vec2[] = [
  { x: RIDE.slots[0].x, z: RIDE.slots[0].z - 2.5 },
  { x: RIDE.slots[1].x, z: RIDE.slots[1].z - 2.8 },
  { x: RIDE.slots[2].x - 0.4, z: RIDE.slots[2].z - 2.5 },
];

const WOOD = { dark: '#b8733a', light: '#e0954a' } as const;

/** A box from its bottom (y0) up, h high. */
function box(w: number, h: number, d: number, colour: string | [string, string], at: { x?: number; y0?: number; z?: number; rx?: number; ry?: number; rz?: number } = {}): Geo {
  const g = new THREE.BoxGeometry(w, h, d);
  const painted = typeof colour === 'string' ? paint(g, colour) : paintY(g, colour[0], colour[1], -h / 2, h / 2);
  return place(painted, { x: at.x ?? 0, y: (at.y0 ?? 0) + h / 2, z: at.z ?? 0, rx: at.rx, ry: at.ry, rz: at.rz });
}

/** A post from a to b (ground points with heights), w thick. */
function beam(a: THREE.Vector3, b: THREE.Vector3, w: number, colour: string): Geo {
  const len = a.distanceTo(b);
  const g = paint(new THREE.BoxGeometry(w, len, w), colour);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
}

/** A shape in the x-y plane (a house's front), extruded `depth` along z and centred on z = 0. */
function prism(outline: [number, number][], depth: number, colour: string | [string, string], y0: number, y1: number): Geo {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return typeof colour === 'string' ? paint(g, colour) : paintY(g, colour[0], colour[1], y0, y1);
}

/** Finish a kind: one geometry, its south faces lifted like the scenery's. */
const done = (parts: Geo[]): Geo => fillSouth(merge(parts));

// ---------------------------------------------------------------------------------------------------------------
// s: sand, stump, swing, stone
// ---------------------------------------------------------------------------------------------------------------

/** A pile of sand: a soft heap with a little spill round its foot. */
function sand(): Geo {
  const pts = [[1.4, 0], [1.15, 0.08], [0.85, 0.3], [0.55, 0.55], [0.25, 0.74], [0.001, 0.78]].map(([x, y]) => new THREE.Vector2(x, y));
  const heap = paintY(new THREE.LatheGeometry(pts, 14), '#e3c182', '#f6dfa8', 0, 0.78);
  const spill = (x: number, z: number, sx: number, sz: number): Geo => place(paintY(blob(1, 0), '#e8c88d', '#f3d9a2', -1, 1), { x, y: 0.02, z, sx, sy: 0.07, sz });
  return done([heap, spill(0.95, 0.5, 0.45, 0.3), spill(-0.85, 0.6, 0.3, 0.25)]);
}

/** A cone with its base at a and its tip at b (a root), base radius r. */
function spike(a: THREE.Vector3, b: THREE.Vector3, r: number, colours: [string, string]): Geo {
  const len = a.distanceTo(b);
  const g = paintY(new THREE.ConeGeometry(r, len, 5), colours[0], colours[1], -len / 2, len / 2);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}

/** A tree stump: rings on top, bark round it, four thick roots and two small leaves. */
function stump(): Geo {
  const parts: Geo[] = [];
  const H = 0.78;
  parts.push(place(paintY(new THREE.CylinderGeometry(0.62, 0.78, H, 12, 1, true), '#8a4e2c', '#ad6a3e', -H / 2, H / 2), { y: H / 2 }));
  const top = new THREE.CircleGeometry(0.62, 12);
  top.rotateX(-Math.PI / 2);
  parts.push(place(paintBy(top, (x, _y, z, out) => {
    const r = Math.hypot(x, z);
    out.set(r > 0.54 ? '#b77443' : Math.floor(r / 0.13) % 2 ? '#e2b47a' : '#f3cd96');
  }), { y: H }));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    parts.push(place(paintY(blob(1, 0), '#8a4e2c', '#ad6a3e', -1, 1), { x: Math.cos(a) * 0.82, y: 0.1, z: Math.sin(a) * 0.82, sx: 0.42, sy: 0.17, sz: 0.2, ry: -a }));
  }
  for (const [x, z, ry] of [[-0.62, 0.42, 0.5], [0.66, 0.25, -0.6]] as const) {
    parts.push(place(paintY(blob(1, 0), '#4f9a3e', '#7cc35f', -1, 1), { x, y: 0.7, z, sx: 0.24, sy: 0.07, sz: 0.13, ry }));
  }
  return done(parts);
}

/** A garden swing: an A-frame at each end, a top beam, green feet and corners, two ropes and a seat. */
function swing(): Geo {
  const parts: Geo[] = [];
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  const H = 1.95;
  for (const x of [-1.0, 1.0]) {
    for (const z of [-0.55, 0.55]) {
      parts.push(beam(v(x, 0, z), v(x, H, 0), 0.13, WOOD.light));
      parts.push(box(0.2, 0.14, 0.2, '#5fae4a', { x, z }));
    }
    parts.push(box(0.22, 0.22, 0.22, '#5fae4a', { x, y0: H - 0.1 }));
  }
  parts.push(box(2.2, 0.14, 0.14, WOOD.dark, { y0: H - 0.05 }));
  for (const x of [-0.38, 0.38]) parts.push(box(0.04, H - 0.55, 0.04, '#d9c08a', { x, y0: 0.5 }));
  parts.push(box(0.95, 0.08, 0.4, [WOOD.dark, WOOD.light], { y0: 0.45 }));
  return done(parts);
}

/** A big smooth stone, grey with a white vein, long and low enough to climb. */
function stone(): Geo {
  const n = new THREE.Vector3(0.45, 0.25, 0.86).normalize();
  const g = paintBy(blob(1, 2), (x, y, z, out) => {
    out.set('#8f96a3').lerp(new THREE.Color('#cfd4dc'), THREE.MathUtils.clamp((y + 0.4) / 1.4, 0, 1));
    if (Math.abs(x * n.x + y * n.y + z * n.z - 0.1) < 0.07) out.lerp(new THREE.Color('#ffffff'), 0.75);
  });
  return done([place(g, { y: 0.7, sx: 1.25, sy: 0.72, sz: 0.95 })]);
}

// ---------------------------------------------------------------------------------------------------------------
// sh: shed, ship, shell
// ---------------------------------------------------------------------------------------------------------------

/** A garden shed: planked walls, a dark pitched roof, a door with black hinges and a knob. */
function shed(): Geo {
  const parts: Geo[] = [];
  const W = 1.6;
  const D = 1.3;
  parts.push(prism([[-W / 2, 0], [W / 2, 0], [W / 2, 1.55], [0, 2.15], [-W / 2, 1.55]], D, [WOOD.dark, WOOD.light], 0, 2.15));
  const slope = Math.atan2(0.6, W / 2);
  const len = Math.hypot(0.6, W / 2) + 0.18;
  for (const side of [-1, 1]) {
    parts.push(place(paintY(new THREE.BoxGeometry(len, 0.08, D + 0.3), '#4c566a', '#66718a', -0.04, 0.04), { x: side * (W / 4 + 0.03), y: 1.88, rz: -side * slope }));
  }
  for (let k = -3; k <= 3; k++) parts.push(box(0.025, 1.5, 0.02, '#a8652f', { x: k * 0.22, z: D / 2 + 0.005 }));
  parts.push(box(0.66, 1.25, 0.05, ['#9a5a2c', '#b8743e'], { y0: 0.02, z: D / 2 + 0.02 }));
  for (const y of [0.3, 1.0]) parts.push(box(0.32, 0.06, 0.03, '#2e2a2e', { x: 0.17, y0: y, z: D / 2 + 0.05 }));
  parts.push(place(paint(new THREE.SphereGeometry(0.045, 6, 4), '#2e2a2e'), { x: -0.22, y: 0.66, z: D / 2 + 0.06 }));
  return done(parts);
}

/** A toy ship: a red, blue and white hull with a pointed bow, two decks with windows, two red funnels. */
function ship(): Geo {
  const parts: Geo[] = [];
  // The hull in plan, extruded up: bow to the east (+x), a little turned to the camera.
  const hull = new THREE.Shape([[-1.15, -0.42], [0.65, -0.42], [1.25, 0], [0.65, 0.42], [-1.15, 0.42]].map(([x, z]) => new THREE.Vector2(x, z)));
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 0.62, bevelEnabled: false, curveSegments: 1 });
  hg.rotateX(Math.PI / 2);
  hg.translate(0, 0.62, 0);
  parts.push(paintBy(hg, (_x, y, _z, out) => void out.set(y < 0.2 ? '#e2424b' : y < 0.42 ? '#3b6fd1' : '#ffffff')));
  parts.push(box(1.5, 0.32, 0.62, '#ffffff', { x: -0.2, y0: 0.62 }));
  parts.push(box(1.52, 0.1, 0.64, '#5aa9e6', { x: -0.2, y0: 0.74 }));
  parts.push(box(0.95, 0.28, 0.5, '#ffffff', { x: -0.3, y0: 0.94 }));
  parts.push(box(0.97, 0.08, 0.52, '#5aa9e6', { x: -0.3, y0: 1.04 }));
  for (const x of [-0.55, -0.1]) {
    parts.push(place(paintY(new THREE.CylinderGeometry(0.13, 0.14, 0.5, 8), '#e2424b', '#ef5f66', -0.25, 0.25), { x, y: 1.47 }));
    parts.push(place(paint(new THREE.CylinderGeometry(0.142, 0.142, 0.1, 8, 1, true), '#ffffff'), { x, y: 1.42 }));
  }
  // A gold anchor mark on the bow.
  parts.push(box(0.05, 0.16, 0.02, '#f2c94c', { x: 0.75, y0: 0.24, z: 0.36, ry: -0.6 }));
  return done(parts.map((g) => place(g, { ry: -0.25 })));
}

/** A big sea shell standing up: a fan of ribs from its hinge, pale pink, tipped back a little. */
function shell(): Geo {
  const parts: Geo[] = [];
  const N = 9;
  for (let k = 0; k < N; k++) {
    const a = ((k / (N - 1)) - 0.5) * 2.3;
    const rib = paintY(new THREE.SphereGeometry(1, 7, 5), '#f2a594', '#ffe1d6', -1, 1);
    parts.push(place(rib, { x: Math.sin(a) * 0.58, y: 0.12 + Math.cos(a) * 0.6, z: 0.02 * Math.abs(k - 4), sx: 0.17, sy: 0.62, sz: 0.11, rz: -a }));
  }
  for (const side of [-1, 1]) parts.push(place(paintY(new THREE.BoxGeometry(0.26, 0.18, 0.1), '#f2a594', '#f9c2b4', -0.09, 0.09), { x: side * 0.18, y: 0.1 }));
  return done(parts.map((g) => place(g, { y: 0.02, rx: -0.35 })));
}

// ---------------------------------------------------------------------------------------------------------------
// b: barn, bench, beach
// ---------------------------------------------------------------------------------------------------------------

/** A red barn: a gambrel front, a grey roof, two white-framed doors with a white cross, and a loft window. */
function barn(): Geo {
  const parts: Geo[] = [];
  const W = 1.1;
  const D = 1.5;
  parts.push(prism([[-W, 0], [W, 0], [W, 1.35], [0.72, 1.95], [0, 2.3], [-0.72, 1.95], [-W, 1.35]], D, ['#c9342f', '#e2544a'], 0, 2.3));
  // The roof: two steep lower slabs and two shallow upper ones.
  const slab = (x0: number, y0: number, x1: number, y1: number): Geo => {
    const len = Math.hypot(x1 - x0, y1 - y0) + 0.12;
    return place(paintY(new THREE.BoxGeometry(len, 0.08, D + 0.2), '#4d5664', '#68727f', -0.04, 0.04), { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 0.04, rz: Math.atan2(y1 - y0, x1 - x0) });
  };
  parts.push(slab(-W - 0.06, 1.33, -0.72, 1.95), slab(-0.72, 1.95, 0, 2.3), slab(0, 2.3, 0.72, 1.95), slab(0.72, 1.95, W + 0.06, 1.33));
  const z = D / 2 + 0.02;
  const white = '#ffffff';
  for (const side of [-1, 1]) {
    const cx = side * 0.33;
    parts.push(box(0.6, 1.15, 0.02, '#b52c28', { x: cx, z: z - 0.005 }));
    for (const x of [cx - 0.29, cx + 0.29]) parts.push(box(0.06, 1.15, 0.04, white, { x, z }));
    for (const y of [0, 1.1]) parts.push(box(0.64, 0.06, 0.04, white, { x: cx, y0: y, z }));
    for (const s of [-1, 1]) parts.push(place(paint(new THREE.BoxGeometry(0.05, 1.22, 0.035), white), { x: cx, y: 0.575, z: z + 0.01, rz: s * 0.47 }));
  }
  parts.push(box(0.36, 0.34, 0.04, white, { y0: 1.55, z }));
  parts.push(box(0.24, 0.24, 0.05, '#3a3340', { y0: 1.6, z: z + 0.005 }));
  return done(parts);
}

/** A garden bench: three seat slats, two back slats, and an arm and two legs at each end. */
function bench(): Geo {
  const parts: Geo[] = [];
  const L = 1.55;
  for (const z of [-0.14, 0, 0.14]) parts.push(box(L, 0.05, 0.12, [WOOD.dark, WOOD.light], { y0: 0.43, z }));
  for (const y of [0.62, 0.8]) parts.push(box(L, 0.12, 0.04, [WOOD.dark, WOOD.light], { y0: y, z: -0.25, rx: -0.12 }));
  for (const x of [-L / 2 + 0.06, L / 2 - 0.06]) {
    parts.push(box(0.07, 0.46, 0.07, '#9a5a2c', { x, z: 0.17 }));
    parts.push(box(0.07, 0.95, 0.07, '#9a5a2c', { x, z: -0.24 }));
    parts.push(box(0.08, 0.05, 0.5, WOOD.light, { x, y0: 0.66, z: -0.02 }));
    parts.push(box(0.07, 0.22, 0.07, '#9a5a2c', { x, y0: 0.46, z: 0.17 }));
  }
  // A garden bench a grown-up sits on: a little bigger than life next to the mounts.
  return done(parts.map((g) => place(g, { s: 1.2 })));
}

/** A sandy beach: a patch of sand with the sea's edge and its foam, a pink bucket with a yellow handle, a shell. */
function beach(): Geo {
  const parts: Geo[] = [];
  const sandG = new THREE.CircleGeometry(1.45, 18);
  sandG.rotateX(-Math.PI / 2);
  parts.push(place(paintBy(sandG, (x, _y, z, out) => void out.set('#f1d79e').lerp(new THREE.Color('#e5c486'), THREE.MathUtils.clamp((x + z) * 0.3 + 0.5, 0, 1))), { y: 0.03, sz: 0.85 }));
  const sea = new THREE.CircleGeometry(0.92, 16, -1.2, 2.4);
  sea.rotateX(-Math.PI / 2);
  parts.push(place(paintBy(sea, (x, _y, z, out) => void out.set('#5cc0ea').lerp(new THREE.Color('#bdf0ff'), THREE.MathUtils.clamp(1 - Math.hypot(x, z), 0, 1))), { x: 0.55, y: 0.05, z: -0.1, sz: 0.95 }));
  const foam = new THREE.RingGeometry(0.88, 0.98, 14, 1, -1.1, 2.2);
  foam.rotateX(-Math.PI / 2);
  parts.push(place(paint(foam, '#ffffff'), { x: 0.55, y: 0.06, z: -0.1, sz: 0.95 }));
  parts.push(place(paintY(new THREE.CylinderGeometry(0.34, 0.25, 0.55, 12, 1, true), '#ff5d8f', '#ff86ac', -0.27, 0.27), { x: -0.6, y: 0.31, z: 0.15 }));
  const bottom = new THREE.CircleGeometry(0.25, 12);
  bottom.rotateX(-Math.PI / 2);
  parts.push(place(paint(bottom, '#e84a7c'), { x: -0.6, y: 0.05, z: 0.15 }));
  const inside = new THREE.CircleGeometry(0.33, 12);
  inside.rotateX(-Math.PI / 2);
  parts.push(place(paint(inside, '#f1d79e'), { x: -0.6, y: 0.5, z: 0.15 }));
  parts.push(place(paint(new THREE.TorusGeometry(0.32, 0.03, 3, 12, Math.PI), '#ffd23f'), { x: -0.6, y: 0.58, z: 0.15, ry: 0.3 }));
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * 2.0;
    parts.push(place(paintY(new THREE.SphereGeometry(1, 5, 3), '#f2a594', '#ffe1d6', -1, 1), { x: 0.15 + Math.sin(a) * 0.2, y: 0.12 + Math.cos(a) * 0.2, z: 0.6, sx: 0.08, sy: 0.24, sz: 0.06, rz: -a, rx: -0.9 }));
  }
  return done(parts);
}

// ---------------------------------------------------------------------------------------------------------------
// p: pond, pool, pines
// ---------------------------------------------------------------------------------------------------------------

/** A little pond: blue water in a grassy rim, a few round stones, a lily pad and three reeds. */
function pond(): Geo {
  const parts: Geo[] = [];
  const water = new THREE.CircleGeometry(1.0, 20);
  water.rotateX(-Math.PI / 2);
  parts.push(place(paintBy(water, (x, _y, z, out) => void out.set('#4fb3e6').lerp(new THREE.Color('#a6e6f6'), THREE.MathUtils.clamp(Math.hypot(x, z) * 1.1, 0, 1))), { y: 0.05, sx: 1.3, sz: 0.95 }));
  const rim = new THREE.RingGeometry(1.0, 1.15, 20, 1);
  rim.rotateX(-Math.PI / 2);
  parts.push(place(paintY(rim, '#6fbf54', '#8fd46a', -1, 1), { y: 0.07, sx: 1.3, sz: 0.95 }));
  for (let k = 0; k < 20; k += 2) {
    const a = (k / 20) * Math.PI * 2;
    parts.push(place(paint(new THREE.ConeGeometry(0.06, 0.2, 3), '#5aae4a'), { x: Math.cos(a) * 1.4, y: 0.13, z: Math.sin(a) * 1.04, rz: Math.cos(a) * 0.3 }));
  }
  for (const [a, s] of [[0.5, 0.17], [2.4, 0.13], [3.6, 0.19], [5.2, 0.14]] as const) {
    parts.push(place(paintY(blob(1, 0), '#b9b3c6', '#e4e0ec', -0.6, 1), { x: Math.cos(a) * 1.3, y: s * 0.45, z: Math.sin(a) * 0.98, sx: s * 1.3, sy: s * 0.8, sz: s }));
  }
  const pad = new THREE.CircleGeometry(0.22, 10, 0.35, Math.PI * 2 - 0.7);
  pad.rotateX(-Math.PI / 2);
  parts.push(place(paint(pad, '#7cc96e'), { x: -0.45, y: 0.065, z: 0.2 }));
  for (const [x, z, h] of [[0.95, -0.55, 0.75], [1.08, -0.4, 0.6], [0.82, -0.62, 0.55]] as const) {
    parts.push(place(paintY(new THREE.CylinderGeometry(0.015, 0.025, h, 4), '#6fb85e', '#9bd77c', -h / 2, h / 2), { x, y: h / 2, z }));
    parts.push(place(paint(new THREE.CapsuleGeometry(0.035, 0.12, 1, 4), '#a8693f'), { x, y: h, z }));
  }
  return done(parts);
}

/** A paddling pool: three blue rings stacked, light water inside. */
function pool(): Geo {
  const parts: Geo[] = [];
  for (const [k, y] of [0.13, 0.37, 0.61].entries()) {
    const ring = paintBy(new THREE.TorusGeometry(0.92, 0.13, 5, 16), (_x, _y, z, out) => void out.set(k === 2 ? '#4f9df0' : '#3a86de').lerp(new THREE.Color('#8cc8ff'), THREE.MathUtils.clamp(z / 0.13 * 0.5 + 0.5, 0, 1) * 0.6));
    parts.push(place(ring, { y, rx: -Math.PI / 2 }));
  }
  const water = new THREE.CircleGeometry(0.86, 16);
  water.rotateX(-Math.PI / 2);
  parts.push(place(paintBy(water, (x, _y, z, out) => void out.set('#7fd3ff').lerp(new THREE.Color('#d2f3ff'), THREE.MathUtils.clamp(0.6 - (x - z) * 0.4, 0, 1))), { y: 0.55 }));
  return done(parts);
}

/** A little wood of three pine trees: tiers of dark green on brown trunks, one big and two smaller. */
function pines(): Geo {
  const parts: Geo[] = [];
  for (const [x, z, s] of [[-0.25, -0.35, 1.0], [0.85, 0.35, 0.75], [-0.95, 0.55, 0.62]] as const) {
    parts.push(place(paintY(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 5, 1, true), '#8a5a35', '#a8703f', -0.25, 0.25), { x, y: 0.25 * s, z, sy: s }));
    for (const [k, [r, h, y]] of [[0.62, 0.9, 0.35], [0.5, 0.8, 0.85], [0.36, 0.7, 1.3]].entries()) {
      parts.push(place(paintY(new THREE.ConeGeometry(r, h, 8), '#2c8547', k === 2 ? '#62c070' : '#4ba85f', -h / 2, h / 2), { x, y: (y + h / 2) * s, z, s }));
    }
  }
  return done(parts);
}

/** The thirteen kinds, one geometry each (built anew on each call). */
export const KIT: Record<SignWord, () => Geo> = { sand, stump, swing, stone, shed, ship, shell, barn, bench, beach, pond, pool, pines };
