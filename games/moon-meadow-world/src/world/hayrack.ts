// The hay rack by the stable yard (2.2.0 side quest): a slatted wooden crib on crossed legs, like the v3 picture the
// game shows for it, and the hay that fills it. Pure geometry, so the tests can check it in node; stable.ts merges
// the wood into the stable scenery and draws the hay as its own mesh.
import * as THREE from 'three';
import { blob, fillSouth, merge, paint, paintBy, paintY, place, rng, type Geo } from './geo';
import { aim } from './places';

const tmpC = new THREE.Color();

/**
 * The hay rack, like the v3 picture the game shows for it: a slatted wooden crib, wide at the top, on crossed A-frame
 * legs at both ends, its long side to the camera. Local space: x along the crib, +z south (the side the herd eats
 * from), y up from the ground.
 */
export const CRIB = { y0: 0.5, y1: 0.92, halfL: 0.78, bottom: 0.16, top: 0.36 } as const;
const HAY_WOOD = ['#dba062', '#e4ad70'];
/** The rack turns its front a little towards the yard, so the camera sees a little of its west end. */
export const RACK_YAW = 0.2;

/** Pull the vertices of a box below y = 0 (local) in towards z = 0: a trapezoid, narrow at the bottom. */
function taper(g: Geo, kz: number): Geo {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setZ(i, p.getZ(i) * kz);
  g.computeVertexNormals();
  return g;
}

export function rackGeometry(): Geo[] {
  const parts: Geo[] = [];
  const { y0, y1, halfL, bottom, top } = CRIB;
  const rise = y1 - y0;
  const slope = Math.atan2(top - bottom, rise);
  const slopeLen = Math.hypot(top - bottom, rise);
  // Front and back: three planks each along the slope, with small gaps between them (the slats).
  const PLANKS = 3;
  const gap = 0.035;
  const plankH = (slopeLen - gap * (PLANKS - 1)) / PLANKS;
  for (const side of [-1, 1]) {
    for (let i = 0; i < PLANKS; i++) {
      const s = (i * (plankH + gap) + plankH / 2) / slopeLen;
      parts.push(place(paintY(new THREE.BoxGeometry(halfL * 2 + 0.08, plankH, 0.04), '#c98b52', HAY_WOOD[i % 2], -plankH / 2, plankH / 2), {
        y: y0 + rise * s, z: side * (bottom + (top - bottom) * s + 0.02), rx: side * slope,
      }));
    }
  }
  // The bottom board and the two end boards (trapezoids).
  parts.push(place(paint(new THREE.BoxGeometry(halfL * 2, 0.04, bottom * 2 + 0.04), '#b97b45'), { y: y0 - 0.02 }));
  for (const sx of [-1, 1]) {
    parts.push(place(taper(paintY(new THREE.BoxGeometry(0.05, rise, top * 2 + 0.06), '#c98b52', '#dda266', -rise / 2, rise / 2), (bottom + 0.03) / (top + 0.03)), {
      x: sx * (halfL + 0.025), y: y0 + rise / 2,
    }));
  }
  // The legs: a crossed trestle under each end, in the plane that faces the camera, with a bolt where they cross.
  const legH = y0 - 0.02;
  const foot = 0.26;
  const head = 0.16;
  const legLen = Math.hypot(legH, foot + head);
  const lean = Math.atan2(foot + head, legH);
  for (const sx of [-1, 1]) {
    const cx = sx * (halfL - 0.2);
    // The two legs of an X cross at y = legH * foot / (foot + head).
    const crossY = (legH * foot) / (foot + head);
    for (const [k, dz] of [[1, 0.1], [-1, 0.14]] as const) {
      parts.push(place(paintY(new THREE.BoxGeometry(0.07, legLen, 0.06), '#b97b45', '#dda266', -legLen / 2, legLen / 2), {
        x: cx + (k * (foot - head)) / 2, y: legH / 2, z: dz, rz: k * lean,
      }));
    }
    parts.push(place(paint(new THREE.SphereGeometry(0.03, 6, 4), '#8f8fa8'), { x: cx, y: crossY, z: 0.17 }));
  }
  // Two bolts on the top front plank, as in the picture.
  for (const sx of [-1, 1]) {
    parts.push(place(paint(new THREE.SphereGeometry(0.026, 6, 4), '#8f8fa8'), { x: sx * (halfL - 0.06), y: y1 - plankH / 2, z: top + 0.028 }));
  }
  return parts;
}

/** Golden straw colours for the heap's mottle and the blades. */
const STRAW = ['#f7d36a', '#e9b347', '#ffe591', '#dba03a', '#fbe08a'];

/**
 * Straw blades: thin triangles from a base point along a direction, turned to face the raised camera (south and up).
 * Their normals point up, like the grass tufts, so they light like the top of the heap.
 */
function blades(list: { at: THREE.Vector3; dir: THREE.Vector3; len: number }[]): Geo {
  const toCam = new THREE.Vector3(0, 0.72, 0.69);
  const side = new THREE.Vector3();
  const p: number[] = [];
  const c: number[] = [];
  const base = new THREE.Color('#d99a35');
  const tip = new THREE.Color();
  list.forEach(({ at, dir, len }, i) => {
    side.crossVectors(toCam, dir).normalize().multiplyScalar(0.022);
    const end = at.clone().addScaledVector(dir, len);
    p.push(at.x - side.x, at.y - side.y, at.z - side.z, end.x, end.y, end.z, at.x + side.x, at.y + side.y, at.z + side.z);
    tip.set(STRAW[(i * 3) % STRAW.length]).lerp(white, 0.35);
    c.push(base.r, base.g, base.b, tip.r, tip.g, tip.b, base.r, base.g, base.b);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(p.length / 3).fill([0, 1, 0]).flat(), 3));
  g.setIndex([...Array(p.length / 3).keys()]);
  return g;
}
const white = new THREE.Color('#ffffff');

/**
 * The hay that fills the crib, built for a fill of 1 around the crib's inner bottom: the packed hay inside and a
 * ragged golden heap over the top, mottled like straw, with blades poking out all round (the v3 picture's heap).
 */
export function hayGeometry(): Geo {
  const parts: Geo[] = [];
  const { y0, y1, halfL, bottom, top } = CRIB;
  const H = y1 - y0 - 0.02;
  parts.push(place(taper(paintY(new THREE.BoxGeometry(halfL * 2 - 0.04, H, top * 2 - 0.04), '#d9a23f', '#f2c55c', -H / 2, H / 2), (bottom - 0.02) / (top - 0.02)), { y: H / 2 }));
  // The heap: an ellipsoid with every point pushed in or out a little, so its outline is ragged, not round.
  const r = rng(53);
  const heap = blob(1, 2);
  const hp = heap.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const y = hp.getY(i);
    const k = 0.9 + r() * (0.16 + 0.22 * Math.max(0, y));
    // Below its middle the heap narrows like the crib's slanted walls, so no hay pokes out through the planks.
    const narrow = 1 + 0.45 * Math.min(0, y);
    hp.setXYZ(i, hp.getX(i) * k, y * k, hp.getZ(i) * k * narrow);
  }
  heap.computeVertexNormals();
  const HEAP = { y: H - 0.04, sx: halfL - 0.06, sy: 0.36, sz: top - 0.02 };
  parts.push(place(paintBy(heap, (_x, y, _z, out) => {
    out.set(STRAW[Math.floor(r() * STRAW.length)]);
    if (y < 0) out.lerp(tmpC.set('#c98a2e'), -y * 0.6);
  }), HEAP));
  // Blades all over the heap: steep near the top, leaning out at the sides. Their tips stay within the crib's top
  // width, so a part-full crib (the mesh squashed down) never shows a blade through its slats.
  const list: { at: THREE.Vector3; dir: THREE.Vector3; len: number }[] = [];
  for (let i = 0; i < 70; i++) {
    const u = r() * 2 - 1;
    const a = r() * Math.PI;
    const at = new THREE.Vector3(u * 0.92, Math.sin(a) * Math.sqrt(1 - u * u) * 0.92, Math.cos(a) * Math.sqrt(1 - u * u) * 0.92);
    const dir = at.clone().multiply(new THREE.Vector3(1.2, 1, 1.6)).add(new THREE.Vector3((r() - 0.5) * 0.8, 0.5, (r() - 0.5) * 0.8)).normalize();
    at.set(at.x * HEAP.sx, HEAP.y + at.y * HEAP.sy, at.z * HEAP.sz);
    if (Math.abs(at.x) > halfL - 0.1) at.x = Math.sign(at.x) * (halfL - 0.1);
    const len = 0.14 + r() * 0.14;
    const end = at.clone().addScaledVector(dir, len);
    end.x = THREE.MathUtils.clamp(end.x, -(halfL - 0.05), halfL - 0.05);
    end.z = THREE.MathUtils.clamp(end.z, -(top - 0.03), top - 0.03);
    const reach = end.distanceTo(at);
    list.push({ at, dir: end.sub(at).divideScalar(reach), len: reach });
  }
  parts.push(blades(list));
  return fillSouth(merge(parts));
}

/** How wide the hay is (z) at fill f, so a part-full crib keeps its hay inside the slanted walls. */
export const hayDepth = (f: number): number => (CRIB.bottom + (CRIB.top - CRIB.bottom) * f) / CRIB.top;
