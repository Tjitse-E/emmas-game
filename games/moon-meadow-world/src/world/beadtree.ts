// The bead tree in the east yard (docs/v4/2.3.md sections 7 and 17.1): a small round tree, 2.6 m high, with three bead
// strings hanging from its branches in the five bead colours. It is static, so it is merged into its scenery region
// (the meadow's middle east): no draw call of its own, under 1,000 triangles. Its trunk is an obstacle (layout.ts).
import * as THREE from 'three';
import { BEAD_TREE } from '../layout';
import { PALETTE } from '../wardrobe';
import { Scenery, blob, paint, paintBy, paintY, place, rng, type Geo } from './geo';

/** The tree's height and the crown's middle, in metres. */
export const BEAD_TREE_SHAPE = { height: 2.6, crownY: 1.95, crownR: 0.62, trunkTop: 1.5 } as const;
/** The bead colours (content/patterns.ts BEAD_COLOURS), in their small shade, the one jewels use. */
const BEADS = (['pink', 'blue', 'gold', 'green', 'purple'] as const).map((c) => PALETTE[c].small);
/** The three strings: where they hang from (angle round the trunk, 0 is south towards the camera) and how long. */
const STRINGS = [
  { a: -0.75, r: 0.52, top: 1.42, len: 0.62 },
  { a: 0.1, r: 0.58, top: 1.36, len: 0.72 },
  { a: 0.95, r: 0.5, top: 1.44, len: 0.58 },
] as const;

const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const q = new THREE.Quaternion();

/** A branch from `a` to `b`: a thin tapered cylinder. */
function branch(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number): Geo {
  const len = a.distanceTo(b);
  const g = paintY(new THREE.CylinderGeometry(r1, r0, len, 5, 1), '#8a5a36', '#b07a4c', -len / 2, len / 2);
  g.applyQuaternion(q.setFromUnitVectors(UP, dir.subVectors(b, a).normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/** A bead: round ones, gems and little flat hearts in turn, so the strings read as bead strings, not fruit. */
function bead(k: number, colour: string): Geo {
  if (k % 3 === 0) return paint(new THREE.IcosahedronGeometry(0.07, 0), colour);
  if (k % 3 === 1) return place(paint(new THREE.OctahedronGeometry(0.075, 0), colour), { sy: 1.25 });
  return place(paint(new THREE.CylinderGeometry(0.065, 0.065, 0.035, 6), colour), { rx: Math.PI / 2 });
}

/** The tree in its own space (the trunk at the origin), every part painted. */
export function beadTreeGeometry(): Geo[] {
  const { crownY, crownR, trunkTop } = BEAD_TREE_SHAPE;
  const r = rng(73);
  const parts: Geo[] = [];
  parts.push(place(paintY(new THREE.CylinderGeometry(0.11, 0.17, trunkTop, 7, 1), '#7d5032', '#a8734a', -trunkTop / 2, trunkTop / 2), { y: trunkTop / 2 }));
  // The crown: four soft green blobs with pink blossoms, round on top.
  const blobs = [
    { x: 0, y: crownY + 0.1, z: 0, s: 1 },
    { x: -0.42, y: crownY - 0.12, z: 0.05, s: 0.78 },
    { x: 0.42, y: crownY - 0.1, z: -0.02, s: 0.8 },
    { x: 0.02, y: crownY - 0.18, z: 0.36, s: 0.7 },
  ];
  const leaf = new THREE.Color('#8fd27f');
  const light = new THREE.Color('#c2ec9a');
  for (const b of blobs) {
    const g = paintBy(blob(crownR * b.s, 1), (_x, y, _z, out) => {
      if (r() < 0.12) out.set(r() < 0.5 ? '#ffb7d8' : '#fff1f6');
      else out.copy(leaf).lerp(light, THREE.MathUtils.clamp(0.5 + y / (crownR * 2), 0, 1));
    });
    parts.push(place(g, { x: b.x, y: b.y, z: b.z }));
  }
  // Three branches reach out under the crown; a bead string hangs from the end of each.
  STRINGS.forEach((s, i) => {
    const end = new THREE.Vector3(Math.sin(s.a) * s.r, s.top, Math.cos(s.a) * s.r);
    parts.push(branch(new THREE.Vector3(0, trunkTop - 0.25, 0), end, 0.06, 0.035));
    const len = s.len;
    parts.push(place(paint(new THREE.CylinderGeometry(0.008, 0.008, len, 3, 1), '#fff4e0'), { x: end.x, y: end.y - len / 2, z: end.z }));
    const n = 7;
    for (let k = 0; k < n; k++) {
      const colour = BEADS[(k + i * 2) % BEADS.length];
      parts.push(place(bead(k + i, colour), { x: end.x, y: end.y - 0.08 - (k * (len - 0.1)) / (n - 1), z: end.z, ry: r() * Math.PI }));
    }
  });
  return parts;
}

/** The bead tree at BEAD_TREE.center, merged into its scenery region. */
export function buildBeadTree(scenery: Scenery): void {
  const { x, z } = BEAD_TREE.center;
  const region = Scenery.regionOf(x, z);
  for (const g of beadTreeGeometry()) scenery.add(g.translate(x, 0, z), region);
}
