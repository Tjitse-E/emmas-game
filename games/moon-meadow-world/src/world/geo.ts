// Small helpers for code-built scenery: every part carries its colours as vertex colours, so parts that share the
// one Lambert material merge into a single mesh and a single draw call.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Geo = THREE.BufferGeometry;

const tmp = new THREE.Color();

/** A seeded random generator (mulberry32), so the meadow looks the same every time. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keep only position, normal and color, and give every part an index, so any two parts can be merged. */
function prep(g: Geo): Geo {
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
  }
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** One flat colour for the whole part. */
export function paint(g: Geo, colour: string): Geo {
  tmp.set(colour);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([tmp.r, tmp.g, tmp.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return prep(g);
}

/** A colour per vertex from its local position (before placing). `out` is a Color to set. */
export function paintBy(g: Geo, fn: (x: number, y: number, z: number, out: THREE.Color) => void): Geo {
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    fn(p.getX(i), p.getY(i), p.getZ(i), tmp);
    c.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return prep(g);
}

/** A vertical gradient from `bottom` at y0 to `top` at y1 (local coordinates): soft shading baked into colour. */
export function paintY(g: Geo, bottom: string, top: string, y0: number, y1: number): Geo {
  const a = new THREE.Color(bottom);
  const b = new THREE.Color(top);
  return paintBy(g, (_x, y, _z, out) => out.copy(a).lerp(b, THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1)));
}

export interface Placement {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Uniform scale, or per axis. */
  s?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sv = new THREE.Vector3();

export function matrixOf(o: Placement, out = new THREE.Matrix4()): THREE.Matrix4 {
  e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ');
  q.setFromEuler(e);
  const s = o.s ?? 1;
  sv.set(o.sx ?? s, o.sy ?? s, o.sz ?? s);
  v.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  return out.compose(v, q, sv);
}

/** Move, turn and scale a part in place. Rotations apply yaw last (YXZ), so `ry` turns a tilted part around. */
export function place(g: Geo, o: Placement): Geo {
  g.applyMatrix4(matrixOf(o, m4));
  return g;
}

/** Merge parts into one geometry (they must all have gone through paint/prep). */
export function merge(parts: Geo[]): Geo {
  const out = mergeGeometries(parts, false);
  if (!out) throw new Error('merge failed: parts have different attributes');
  for (const p of parts) p.dispose();
  return out;
}

/** Smooth an icosphere (it comes with flat normals and split vertices) into a soft, slightly lumpy blob. */
export function blob(radius: number, detail = 1): Geo {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const m = mergeVertices(g);
  m.computeVertexNormals();
  return m;
}

/**
 * Static scenery sorted into regions of the meadow. Each region becomes one merged mesh: one draw call, and the
 * camera skips the regions it cannot see.
 */
export class Scenery {
  private readonly regions = new Map<string, Geo[]>();
  private readonly box = new THREE.Box3();
  private readonly centre = new THREE.Vector3();
  /** Parts that move inside their merged region (the trunk lid), found again after build() by their key. */
  private readonly movers = new Map<Geo, string>();
  private readonly placed = new Map<string, MovablePart>();

  /** Add a painted part. Its region comes from where its bounding box centre is, unless `region` is given. */
  add(g: Geo, region?: string): void {
    if (!region) {
      this.box.setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute).getCenter(this.centre);
      region = Scenery.regionOf(this.centre.x, this.centre.z);
    }
    let list = this.regions.get(region);
    if (!list) this.regions.set(region, (list = []));
    list.push(g);
  }

  /**
   * Add a part that moves later (a hinged lid) without a mesh of its own: it is merged into its region like any part,
   * and movable(key) after build() says where its vertices are, so they can be rewritten in place. No draw call.
   */
  addMovable(g: Geo, region: string, key: string): void {
    this.movers.set(g, key);
    this.add(g, region);
  }

  /** Where a movable part's vertices ended up (after build()). */
  movable(key: string): MovablePart | undefined {
    return this.placed.get(key);
  }

  /** Thirds of the meadow, west to east and north to south, plus the land far beyond the fence (north, and the rest). */
  static regionOf(x: number, z: number): string {
    if (z < -36) return 'far-n';
    if (z > 30 || Math.abs(x) > 40) return 'far-rim';
    const col = x < -9 ? 'w' : x < 9 ? 'c' : 'e';
    const row = z < -12 ? 'n' : z < 4 ? 'm' : 's';
    return row + col;
  }

  build(material: THREE.Material, name: string): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [region, parts] of this.regions) {
      // mergeGeometries keeps the parts' vertices in order, so a movable part starts after the ones before it.
      const found: { key: string; start: number; count: number }[] = [];
      let at = 0;
      for (const p of parts) {
        const n = p.attributes.position.count;
        const key = this.movers.get(p);
        if (key) found.push({ key, start: at, count: n });
        at += n;
      }
      const mesh = new THREE.Mesh(fillSouth(merge(parts)), material);
      mesh.name = `${name}-${region}`;
      mesh.matrixAutoUpdate = false;
      for (const f of found) this.placed.set(f.key, { mesh, start: f.start, count: f.count });
      out.push(mesh);
    }
    this.regions.clear();
    this.movers.clear();
    return out;
  }
}

/** A movable part inside a merged region mesh: its first vertex and how many it has. */
export interface MovablePart {
  mesh: THREE.Mesh;
  start: number;
  count: number;
}

/**
 * A baked fill light for the fixed camera. Under the shared sky and sun, faces that look south (at the camera) get
 * little sun and a green bounce, so cream walls read grey-green. Lifting their vertex colours (warm, per channel)
 * keeps them bright and clean while tops keep the full light from above.
 */
const FILL = [0.72, 0.5, 0.8];
export function fillSouth(g: Geo, amount = 1): Geo {
  const n = g.attributes.normal;
  const c = g.attributes.color;
  if (!n || !c) return g;
  for (let i = 0; i < n.count; i++) {
    const k = amount * THREE.MathUtils.clamp(n.getZ(i), 0, 1) * (1 - THREE.MathUtils.clamp(n.getY(i), 0, 1));
    if (k <= 0) continue;
    c.setXYZ(i, c.getX(i) * (1 + FILL[0] * k), c.getY(i) * (1 + FILL[1] * k), c.getZ(i) * (1 + FILL[2] * k));
  }
  return g;
}

/** Turn every triangle of a flat ground overlay to face up, one by one. */
export function eachFaceUp(g: Geo): Geo {
  const idx = g.index!;
  const p = g.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(p, idx.getX(i));
    b.fromBufferAttribute(p, idx.getX(i + 1)).sub(a);
    c.fromBufferAttribute(p, idx.getX(i + 2)).sub(a);
    if (b.cross(c).y >= 0) continue;
    const t = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, t);
  }
  return g;
}

/** Flip every triangle when, taken together, they face down (strips built in either direction around a shape). */
export function faceUp(g: Geo): Geo {
  const idx = g.index!;
  const p = g.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let up = 0;
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(p, idx.getX(i));
    b.fromBufferAttribute(p, idx.getX(i + 1)).sub(a);
    c.fromBufferAttribute(p, idx.getX(i + 2)).sub(a);
    up += b.cross(c).y;
  }
  if (up >= 0) return g;
  for (let i = 0; i < idx.count; i += 3) {
    const t = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, t);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A canvas texture drawn once. With `mask`, the canvas starts opaque black and shapes are drawn in white: such a
 * texture is a clean `map` for additive glows and a clean `alphaMap` for soft shapes (no fringe noise from
 * un-premultiplied transparent pixels).
 */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, mask = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (mask) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
  }
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (!mask) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft round glow mask (white fading to black), shared by halos, fireflies and mist. */
let softDot: THREE.CanvasTexture | null = null;
export function softDotTexture(): THREE.CanvasTexture {
  softDot ??= canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, true);
  return softDot;
}

/** A four-point twinkle star mask for sparkles and stars. */
let star: THREE.CanvasTexture | null = null;
export function starTexture(): THREE.CanvasTexture {
  star ??= canvasTexture(64, 64, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    glow.addColorStop(0, 'rgba(255,255,255,0.6)');
    glow.addColorStop(0.18, 'rgba(255,255,255,0.12)');
    glow.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const R = w * 0.48;
    const r = w * 0.07;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? R : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }, true);
  return star;
}

