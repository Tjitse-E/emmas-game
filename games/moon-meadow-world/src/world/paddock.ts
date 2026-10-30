// The paddock east of the grand tree (2.4.0, docs/v4/2.4.md section 5.4): trodden sand over RIDE.paddock, a low
// post-and-rail fence along the back only with a gap for the ride path, a hay trough and a water tub (round obstacles
// in layout.ts), the bed from the rail's gap to the gate, and the gate in the north fence. The paddock's parts go into
// the scenery region `paddock` and the gate into `trail-gate`, never by Scenery.regionOf: by position the paddock's
// north half would fall in `ne`, which the stable views draw (5.5). The gate's two leaves are movable parts of their
// merged region, so swinging them costs no draw call (as the Corner's trunk lid).
import * as THREE from 'three';
import { RIDE_PATHS, RIDE, type Vec2 } from '../layout';
import { EARTH, SAND, patch, ribbon, roundedRect } from './beds';
import { Scenery, blob, merge, paint, paintY, place, type Geo } from './geo';

export const PADDOCK_REGION = 'paddock';
/** The stretch from the gate to the fork, with the gate itself (world/trail.ts adds the bed). */
export const GATE_REGION = 'trail-gate';

/** The gate in the north fence: two leaves of half the width each, hinged on the posts, swinging into the meadow. */
export const GATE = { width: 3.0, height: 1.0, postW: 0.16, openAngle: THREE.MathUtils.degToRad(92), ms: 1000 } as const;
const GATE_KEYS = ['gate-w', 'gate-e'] as const;

const WOOD = { dark: '#a8784f', light: '#c99a6c' } as const;
const WHITE = '#fffdf7';

/** The sand: the paddock's rectangle with round corners, lying on the ground like the yard. */
const SAND_Y = 0.012;
/** The bed from the rail's gap to the gate: on top of the sand, under the trail beyond the gate. */
const BED_Y = 0.03;
const BED_HALF = 1.0;

/** The back rail's posts, west to east: the ends, the two posts of the gap and one between. */
function railPosts(): number[] {
  const { minX, maxX, gapX, gapWidth } = RIDE.rail;
  const g0 = gapX - gapWidth / 2;
  const g1 = gapX + gapWidth / 2;
  return [minX, g0, g1, (g1 + maxX) / 2, maxX];
}

function railGeometry(): Geo[] {
  const { z, gapX } = RIDE.rail;
  const parts: Geo[] = [];
  const posts = railPosts();
  for (const x of posts) {
    parts.push(place(paintY(new THREE.BoxGeometry(0.11, 0.78, 0.11), WOOD.dark, WOOD.light, -0.39, 0.39), { x, y: 0.39, z }));
    parts.push(place(paint(new THREE.ConeGeometry(0.09, 0.1, 4), WOOD.light), { x, y: 0.83, z, ry: Math.PI / 4 }));
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const [a, b] = [posts[i], posts[i + 1]];
    if (a < gapX && b > gapX) continue;
    for (const y of [0.32, 0.62]) parts.push(place(paint(new THREE.BoxGeometry(b - a, 0.08, 0.05), WOOD.light), { x: (a + b) / 2, y, z: z + 0.07 }));
  }
  return parts;
}

/** The hay trough: a slatted wooden box on four short legs with a heap of hay, inside its 0.5 m circle. */
export function troughGeometry(): Geo[] {
  const L = 0.84;
  const D = 0.4;
  const parts: Geo[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(place(paint(new THREE.BoxGeometry(0.06, 0.14, 0.06), WOOD.dark), { x: sx * (L / 2 - 0.05), y: 0.07, z: sz * (D / 2 - 0.05) }));
  }
  parts.push(place(paintY(new THREE.BoxGeometry(L, 0.04, D), WOOD.dark, WOOD.light, -0.02, 0.02), { y: 0.14 }));
  for (const sz of [-1, 1]) parts.push(place(paintY(new THREE.BoxGeometry(L, 0.26, 0.04), WOOD.dark, WOOD.light, -0.13, 0.13), { y: 0.27, z: sz * (D / 2 - 0.02) }));
  for (const sx of [-1, 1]) parts.push(place(paintY(new THREE.BoxGeometry(0.04, 0.26, D - 0.08), WOOD.dark, WOOD.light, -0.13, 0.13), { x: sx * (L / 2 - 0.02), y: 0.27 }));
  parts.push(place(paintY(blob(1, 1), '#e6c25e', '#f7e08e', -0.6, 1), { y: 0.36, sx: 0.36, sy: 0.12, sz: 0.15 }));
  return parts;
}

/** The water tub: a round wooden tub with two dark bands and water at the top, inside its 0.5 m circle. */
export function tubGeometry(): Geo[] {
  const parts: Geo[] = [];
  parts.push(place(paintY(new THREE.CylinderGeometry(0.42, 0.38, 0.44, 14, 1, true), WOOD.dark, WOOD.light, -0.22, 0.22), { y: 0.22 }));
  for (const y of [0.09, 0.35]) parts.push(place(paint(new THREE.CylinderGeometry(0.43, 0.43, 0.04, 14, 1, true), '#7c6a72'), { y }));
  const water = new THREE.CircleGeometry(0.39, 14);
  water.rotateX(-Math.PI / 2);
  parts.push(place(paintY(water, '#7fd0f0', '#b4e8fa', -0.39, 0.39), { y: 0.4 }));
  return parts;
}

/** The ride path's line from just inside the sand, through the rail's gap, to the gate (from RIDE_PATHS.home). */
function bedLine(): Vec2[] {
  const out: Vec2[] = [];
  for (const p of RIDE_PATHS.home.getSpacedPoints(240)) {
    if (p.z > RIDE.gate.z - 0.2 && p.z < RIDE.paddock.minZ + 0.6) out.push({ x: p.x, z: p.z });
  }
  return out;
}

/**
 * One leaf of the gate in its hinge's frame: along +x for the west leaf (hinged at the west post), along -x for the
 * east one. Rails, two stiles and a brace, white like the meadow's fence.
 */
export function leafGeometry(side: -1 | 1): Geo {
  const len = GATE.width / 2 - 0.04;
  const parts: Geo[] = [];
  const along = (x: number): number => -side * x;
  for (const y of [0.2, 0.56, 0.92]) parts.push(place(paint(new THREE.BoxGeometry(len - 0.05, 0.08, 0.05), WHITE), { x: along(0.04 + len / 2), y }));
  for (const x of [0.07, len]) parts.push(place(paint(new THREE.BoxGeometry(0.07, 0.86, 0.05), WHITE), { x: along(x), y: 0.55 }));
  const dx = len - 0.16;
  const dy = 0.72;
  parts.push(place(paint(new THREE.BoxGeometry(Math.hypot(dx, dy), 0.06, 0.04), '#fbf5ee'), { x: along(0.08 + dx / 2), y: 0.56, rz: -side * Math.atan2(dy, dx) }));
  return merge(parts);
}

/** The hinge of a leaf at `open` (0 shut, 1 open): its post's point, turned into the meadow (south). */
function hingeMatrix(side: -1 | 1, open: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  const x = RIDE.gate.x + side * (GATE.width / 2);
  return out.makeRotationY(side * GATE.openAngle * open).setPosition(x, 0, RIDE.gate.z);
}

function gatePosts(): Geo[] {
  const parts: Geo[] = [];
  for (const side of [-1, 1]) {
    const x = RIDE.gate.x + side * (GATE.width / 2 + GATE.postW / 2);
    parts.push(place(paintY(new THREE.BoxGeometry(GATE.postW, 1.12, GATE.postW), '#f3ece2', WHITE, -0.56, 0.56), { x, y: 0.56, z: RIDE.gate.z }));
    parts.push(place(paint(new THREE.SphereGeometry(0.1, 8, 5), WHITE), { x, y: 1.18, z: RIDE.gate.z }));
  }
  return parts;
}

export interface Paddock {
  /**
   * Swing the gate open (into the meadow) or shut over `ms` (1 s). Resolves when it is there, or at once when a later
   * call replaces this move (as world.frame does), so `await gate(true)` can return with the gate part open.
   */
  gate(open: boolean, ms?: number): Promise<void>;
  /** 0 shut to 1 open. */
  readonly open: number;
  update(dt: number): void;
}

/** Add the paddock and the gate to the scenery; the gate's leaves move once the scenery is built. */
export function buildPaddock(scenery: Scenery): Paddock {
  const centre = { x: (RIDE.paddock.minX + RIDE.paddock.maxX) / 2, z: (RIDE.paddock.minZ + RIDE.paddock.maxZ) / 2 };
  scenery.add(patch(roundedRect(RIDE.paddock, 1.0), centre, 0.35, SAND_Y, SAND), PADDOCK_REGION);
  scenery.add(ribbon(bedLine(), BED_HALF, 0.35, BED_Y, EARTH), PADDOCK_REGION);
  for (const g of railGeometry()) scenery.add(g, PADDOCK_REGION);
  const trough = new THREE.Matrix4().makeTranslation(RIDE.trough.center.x, 0, RIDE.trough.center.z);
  for (const g of troughGeometry()) scenery.add(g.applyMatrix4(trough), PADDOCK_REGION);
  const tub = new THREE.Matrix4().makeTranslation(RIDE.tub.center.x, 0, RIDE.tub.center.z);
  for (const g of tubGeometry()) scenery.add(g.applyMatrix4(tub), PADDOCK_REGION);
  for (const g of gatePosts()) scenery.add(g, GATE_REGION);
  const sides = [-1, 1] as const;
  sides.forEach((side, i) => scenery.addMovable(leafGeometry(side).applyMatrix4(hingeMatrix(side, 0)), GATE_REGION, GATE_KEYS[i]));

  // The leaves in their hinges' frames, to rewrite their vertices inside the merged region mesh.
  const local = sides.map((side) => leafGeometry(side));
  const m = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  let open = 0;
  let tween: { from: number; to: number; ms: number; t: number; done: () => void } | null = null;
  const pose = (k: number): void => {
    // Both leaves sit in the one merged mesh: its update ranges are cleared once, then each leaf adds its own.
    const first = scenery.movable(GATE_KEYS[0]);
    if (first) for (const a of [first.mesh.geometry.attributes.position, first.mesh.geometry.attributes.normal]) (a as THREE.BufferAttribute).clearUpdateRanges();
    sides.forEach((side, i) => {
      const part = scenery.movable(GATE_KEYS[i]);
      if (!part) return;
      const pos = part.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const nor = part.mesh.geometry.attributes.normal as THREE.BufferAttribute;
      const lp = local[i].attributes.position;
      const ln = local[i].attributes.normal;
      hingeMatrix(side, k, m);
      nm.getNormalMatrix(m);
      for (let j = 0; j < part.count; j++) {
        v.fromBufferAttribute(lp, j).applyMatrix4(m);
        pos.setXYZ(part.start + j, v.x, v.y, v.z);
        v.fromBufferAttribute(ln, j).applyMatrix3(nm).normalize();
        nor.setXYZ(part.start + j, v.x, v.y, v.z);
      }
      for (const a of [pos, nor]) {
        a.addUpdateRange(part.start * 3, part.count * 3);
        a.needsUpdate = true;
      }
    });
  };
  const ease = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  return {
    get open() {
      return open;
    },
    gate(on, ms = GATE.ms) {
      tween?.done();
      const to = on ? 1 : 0;
      if (ms <= 0 || to === open) {
        tween = null;
        open = to;
        pose(open);
        return Promise.resolve();
      }
      return new Promise((done) => {
        tween = { from: open, to, ms, t: 0, done };
      });
    },
    update(dt) {
      if (!tween) return;
      const tw = tween;
      tw.t += dt * 1000;
      const k = Math.min(1, tw.t / tw.ms);
      open = tw.from + (tw.to - tw.from) * ease(k);
      pose(open);
      if (k >= 1) {
        tween = null;
        tw.done();
      }
    },
  };
}
