// Trodden ground drawn as overlays just above the ground (2.4.0): the paddock's sand, the trail beds, the fork's
// plaza and the clearings. Like the paths and the yard (terrain.ts buildOverlays): fine ribbons and patches whose
// vertices sit where the bed ends and where its soft edge meets the grass, so the edge stays crisp on coarse cells.
import * as THREE from 'three';
import type { Vec2 } from '../layout';
import { eachFaceUp, type Geo } from './geo';
import { grassColour } from './terrain';

/** Two tones of a trodden ground, mixed by a soft grain so it does not read as one flat colour. */
export interface Tones {
  light: string;
  dark: string;
}
/** The paddock's sand: the yard's. */
export const SAND: Tones = { light: '#f4dfb2', dark: '#ead09d' };
/** The trail beds: a warmer, earthier sand, so the trail reads as a track out into the hills. */
export const EARTH: Tones = { light: '#ecd3a2', dark: '#dcbb88' };

const grassC = new THREE.Color();
const tone = new THREE.Color();
const toneB = new THREE.Color();

/** The colour at (x, z) of a bed of `tones` over the grass, `mask` 1 on the bed and 0 on the grass. */
export function bedColour(x: number, z: number, mask: number, tones: Tones, out: THREE.Color): THREE.Color {
  grassColour(x, z, grassC);
  const grain = 0.5 + 0.5 * Math.sin(x * 2.1 + z * 1.3) * Math.sin(x * 0.7 - z * 1.9);
  tone.set(tones.light).lerp(toneB.set(tones.dark), grain * 0.6);
  return out.copy(grassC).lerp(tone, THREE.MathUtils.clamp(mask, 0, 1));
}

function finish(p: number[], c: number[], idx: number[]): Geo {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.setIndex(idx);
  eachFaceUp(g);
  // Overlays light like the flat ground around them, whatever their triangulation.
  const n = new Float32Array(p.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

/**
 * A ribbon of bed along `points` at height `y`: `half` metres of bed each side of the line, and a soft edge of `soft`
 * metres where it fades into the grass. The ends are square: they lie under the next patch.
 */
export function ribbon(points: readonly Vec2[], half: number, soft: number, y: number, tones: Tones): Geo {
  const across: [number, number][] = [[-half - soft, 0], [-half, 1], [0, 1], [half, 1], [half + soft, 0]];
  const p: number[] = [];
  const c: number[] = [];
  const idx: number[] = [];
  const col = new THREE.Color();
  points.forEach((pt, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / l;
    const nz = (b.x - a.x) / l;
    for (const [o, mask] of across) {
      const x = pt.x + nx * o;
      const z = pt.z + nz * o;
      p.push(x, y, z);
      bedColour(x, z, mask, tones, col);
      c.push(col.r, col.g, col.b);
    }
  });
  const w = across.length;
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < w - 1; j++) {
      const a0 = i * w + j;
      idx.push(a0, a0 + 1, a0 + w, a0 + w, a0 + 1, a0 + w + 1);
    }
  }
  return finish(p, c, idx);
}

/**
 * A patch of bed inside a closed outline (around `centre`) at height `y`, with inner rings for the grain to live on
 * and a soft rim of `rim` metres pushed out from the outline into the grass. `under` is the bed already lying there
 * (1 on it, 0 on grass): over it the rim keeps the bed's colour, so a patch laid over a road shows no grass ring.
 */
export function patch(outline: readonly Vec2[], centre: Vec2, rim: number, y: number, tones: Tones, under?: (x: number, z: number) => number): Geo {
  const rings = [0, 0.4, 0.75, 1];
  const p: number[] = [];
  const c: number[] = [];
  const idx: number[] = [];
  const col = new THREE.Color();
  const n = outline.length;
  for (const k of [...rings, -1]) {
    for (const o of outline) {
      let x = centre.x + (o.x - centre.x) * Math.max(k, 0);
      let z = centre.z + (o.z - centre.z) * Math.max(k, 0);
      if (k < 0) {
        const dl = Math.hypot(o.x - centre.x, o.z - centre.z) || 1;
        x = o.x + ((o.x - centre.x) / dl) * rim;
        z = o.z + ((o.z - centre.z) / dl) * rim;
      }
      p.push(x, y, z);
      bedColour(x, z, k < 0 ? (under?.(x, z) ?? 0) : 1, tones, col);
      c.push(col.r, col.g, col.b);
    }
  }
  for (let r = 0; r < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const a0 = r * n + i;
      const a1 = r * n + ((i + 1) % n);
      idx.push(a0, a1, a0 + n, a1, a1 + n, a0 + n);
    }
  }
  return finish(p, c, idx);
}

/** A rounded rectangle's outline, corners of radius r, 6 steps a corner. */
export function roundedRect(r: { minX: number; maxX: number; minZ: number; maxZ: number }, radius: number): Vec2[] {
  const out: Vec2[] = [];
  const corners: [number, number, number][] = [
    [r.maxX - radius, r.maxZ - radius, 0], [r.minX + radius, r.maxZ - radius, 0.5], [r.minX + radius, r.minZ + radius, 1], [r.maxX - radius, r.minZ + radius, 1.5],
  ];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = (a0 + (i / 6) * 0.5) * Math.PI;
      out.push({ x: cx + Math.cos(a) * radius, z: cz + Math.sin(a) * radius });
    }
  }
  return out;
}

/** A circle's outline (an ellipse with rx, rz), n steps. */
export function ellipse(centre: Vec2, rx: number, rz: number, n = 24): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: centre.x + Math.cos(a) * rx, z: centre.z + Math.sin(a) * rz };
  });
}
