// The parts renderer. Every character is drawn from a fixed set of instanced meshes (one per shape), so Princess
// Emma, the whole herd and the egg's face cost the same small number of draw calls however many there are. Each
// character writes its parts (shape, matrix, colour) into its own PartList when it poses; once a frame the lists of the
// visible characters are copied into the instanced meshes.
import * as THREE from 'three';
import * as S from './shapes';

/** The shapes. Lit ones use MeshLambertMaterial with a soft rim; flat ones are unlit (eyes, lines). */
export const B = {
  Hi: 0, // smooth sphere: bodies, heads, hair
  Mid: 1, // medium sphere: snouts, chests, eye whites, ponytail links
  Lo: 2, // small sphere: mane and tail puffs, bows, hands, gems
  Cone: 3, // ears, the nightcap
  Limb: 4, // legs, arms, hooves
  Horn: 5, // the golden spiral horn
  Iris: 6, // unlit disc with a dark pupil gradient
  Dot: 7, // unlit disc: eye highlights, lashes, open mouths
  Arc: 8, // unlit half ring: lash lines, closed eyes, smiles
  Soft: 9, // transparent soft disc: blob shadows, rosy cheeks
  Ripple: 10, // transparent ring on the water
  Beam: 11, // transparent moonbeam column
  Straw: 12, // lit soft mound: the straw bed in a stall
  Fine: 13, // finer sphere for Princess Emma's head and hair, always close to the camera
} as const;
export type BatchId = (typeof B)[keyof typeof B];

/**
 * Max instances per shape: Princess Emma in her busiest look (plaits, fairy wings, star clips and the rose), 20
 * unicorns and the egg with room to spare. Fine is only hers: her head, the bun and, in the portrait, her Mid parts.
 */
export const CAPACITY: Record<BatchId, number> = {
  [B.Hi]: 64, [B.Mid]: 224, [B.Lo]: 640, [B.Cone]: 112, [B.Limb]: 200, [B.Horn]: 24, [B.Iris]: 56,
  [B.Dot]: 220, [B.Arc]: 90, [B.Soft]: 90, [B.Ripple]: 48, [B.Beam]: 8, [B.Straw]: 24, [B.Fine]: 48,
};

/** The geometry of each shape (built by the Parts renderer, and once more by `shapeTriangles`). */
const GEOMETRY: Record<BatchId, () => THREE.BufferGeometry> = {
  [B.Hi]: () => S.sphere(4),
  [B.Mid]: () => S.sphere(3),
  [B.Lo]: () => S.sphere(2),
  [B.Cone]: S.ear,
  [B.Limb]: S.limb,
  [B.Horn]: S.horn,
  [B.Iris]: S.iris,
  [B.Dot]: () => S.disc(7),
  [B.Arc]: S.arc,
  [B.Soft]: S.softDisc,
  [B.Ripple]: S.ring,
  [B.Beam]: S.beam,
  [B.Straw]: S.straw,
  [B.Fine]: () => S.sphere(6),
};

const triangleCache = new Map<BatchId, number>();
/** Triangles of one instance of a shape (for the budget helpers and the tests). */
export function shapeTriangles(id: BatchId): number {
  let n = triangleCache.get(id);
  if (n === undefined) {
    const g = GEOMETRY[id]();
    n = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    g.dispose();
    triangleCache.set(id, n);
  }
  return n;
}

/** Names of the shapes, for warnings. */
const NAMES = Object.fromEntries(Object.entries(B).map(([k, v]) => [v, k])) as Record<BatchId, string>;

/** A dropped part is a bug (a missing bow, or herd parts that vanish): say so once per batch or list. */
function warnOnce(owner: { warned: boolean }, what: string): void {
  if (owner.warned) return;
  owner.warned = true;
  console.warn(`[mmw] actors: ${what} is full, parts are dropped`);
}

/**
 * Character shading: the light is pulled part of the way towards the plain colour, so the shade side stays clean and
 * bright (no grey-green faces under the meadow's sky light) while the top-left light still models the shapes; a soft
 * light rim gives the plush, picture-book look. `instanceExtra` adds a stronger sheen for shiny unicorns. A plain Mesh
 * (no instancing) uses the fixed `sheen` value instead.
 */
export function rimLambert(o: THREE.MeshLambertMaterialParameters, sheen: number | 'instanced' = 0): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial(o);
  const inst = sheen === 'instanced';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${inst ? 'attribute float instanceExtra;' : ''}\nvarying float vSheen;`)
      .replace('#include <color_vertex>', `#include <color_vertex>\nvSheen = ${inst ? 'instanceExtra' : (sheen as number).toFixed(3)};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSheen;')
      .replace(
        '#include <opaque_fragment>',
        `outgoingLight = mix( outgoingLight, diffuseColor.rgb, 0.4 );
        float rimF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
        outgoingLight += diffuseColor.rgb * pow( rimF, 2.5 ) * 0.18 + vec3( 1.0, 0.97, 0.99 ) * pow( rimF, 1.8 ) * 0.45 * vSheen;
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'rim-' + (inst ? 'i' : String(sheen));
  return m;
}

/** An unlit material whose instances each carry their own opacity in `instanceExtra`. */
function alphaBasic(o: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, ...o });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instanceExtra;\nvarying float vInstAlpha;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvInstAlpha = instanceExtra;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstAlpha;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vInstAlpha;');
  };
  m.customProgramCacheKey = () => 'inst-alpha';
  return m;
}

class Batch {
  readonly mesh: THREE.InstancedMesh;
  private readonly mat: Float32Array;
  private readonly col: Float32Array;
  private readonly ext: Float32Array;
  private readonly extAttr: THREE.InstancedBufferAttribute;
  /** The three per-instance attributes and their item sizes, uploaded up to n each frame. */
  private readonly uploads: readonly (readonly [THREE.BufferAttribute, number])[];
  private readonly capacity: number;
  private readonly name: string;
  n = 0;
  warned = false;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number, name: string) {
    this.capacity = capacity;
    this.name = name;
    this.extAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.extAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('instanceExtra', this.extAttr);
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    // Instances spread over the whole meadow; the characters are culled one by one on the CPU instead.
    this.mesh.frustumCulled = false;
    this.mat = this.mesh.instanceMatrix.array as Float32Array;
    this.col = this.mesh.instanceColor.array as Float32Array;
    this.ext = this.extAttr.array as Float32Array;
    this.uploads = [[this.mesh.instanceMatrix, 16], [this.mesh.instanceColor!, 3], [this.extAttr, 1]];
  }

  add(src: PartList, i: number): void {
    if (this.n >= this.capacity) return warnOnce(this, `the ${this.name} batch (${this.capacity})`);
    const k = this.n++;
    // A plain loop: no subarray views to collect every frame.
    const from = i * 16;
    const to = k * 16;
    for (let j = 0; j < 16; j++) this.mat[to + j] = src.mat[from + j];
    this.col[k * 3] = src.col[i * 3];
    this.col[k * 3 + 1] = src.col[i * 3 + 1];
    this.col[k * 3 + 2] = src.col[i * 3 + 2];
    this.ext[k] = src.ext[i];
  }

  /** `prime`: an empty batch still draws one instance shrunk to nothing (the actors' start-up draw, 2.4.0). */
  commit(prime = false): void {
    const m = this.mesh;
    if (!this.n && prime) {
      this.mat.fill(0, 0, 16);
      m.count = 1;
      m.visible = true;
      this.mesh.instanceMatrix.clearUpdateRanges();
      this.mesh.instanceMatrix.addUpdateRange(0, 16);
      this.mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    m.count = this.n;
    m.visible = this.n > 0;
    if (!this.n) return;
    for (const [a, size] of this.uploads) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * size);
      a.needsUpdate = true;
    }
  }
}

/** One character's parts for this frame, written when it poses and copied into the batches while it is visible. */
export class PartList {
  readonly id: Uint8Array;
  readonly mat: Float32Array;
  readonly col: Float32Array;
  readonly ext: Float32Array;
  n = 0;
  warned = false;

  constructor(capacity: number) {
    this.id = new Uint8Array(capacity);
    this.mat = new Float32Array(capacity * 16);
    this.col = new Float32Array(capacity * 3);
    this.ext = new Float32Array(capacity);
  }

  clear(): void {
    this.n = 0;
  }

  /** Add a part. `extra` is the sheen for lit shapes and the opacity for transparent ones. */
  push(id: BatchId, m: THREE.Matrix4, c: THREE.Color, extra = 0): void {
    if (this.n >= this.id.length) return warnOnce(this, `a part list (${this.id.length})`);
    const k = this.n++;
    this.id[k] = id;
    const e = m.elements;
    for (let j = 0; j < 16; j++) this.mat[k * 16 + j] = e[j];
    this.col[k * 3] = c.r;
    this.col[k * 3 + 1] = c.g;
    this.col[k * 3 + 2] = c.b;
    this.ext[k] = extra;
  }
}

export class Parts {
  readonly group = new THREE.Group();
  private readonly batches: Batch[] = [];
  /** The camera that drew the last frame, for culling (captured in onBeforeRender, so nobody has to pass it in). */
  camera: THREE.Camera | null = null;
  /** The canvas size in CSS pixels at the last frame (for the herd's minimum tap size on screen). */
  readonly viewSize = new THREE.Vector2(1024, 768);
  /**
   * While true (until the world has drawn its first frame, 2.4.0), every empty batch draws one instance shrunk to
   * nothing, so three.js counts each batch's geometry at start-up and not the first time a part of it shows (a
   * moonbeam, an egg's face): the long play checks that the counts stay level from place to place.
   */
  prime = false;

  /** `scale` multiplies every batch's capacity (the harness's line-up of princesses; the game uses 1). */
  constructor(scale = 1) {
    this.group.name = 'actors-parts';
    const lit = rimLambert({}, 'instanced');
    const flat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const soft = alphaBasic({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const ripple = alphaBasic({ vertexColors: true, side: THREE.DoubleSide });
    const beam = alphaBasic({ vertexColors: true, side: THREE.DoubleSide });
    const mats: Record<BatchId, THREE.Material> = {
      [B.Hi]: lit, [B.Mid]: lit, [B.Lo]: lit, [B.Cone]: lit, [B.Limb]: lit, [B.Horn]: lit, [B.Iris]: flat, [B.Dot]: flat,
      [B.Arc]: flat, [B.Soft]: soft, [B.Ripple]: ripple, [B.Beam]: beam, [B.Straw]: lit, [B.Fine]: lit,
    };
    for (const k of Object.keys(mats).map(Number) as BatchId[]) {
      const g = GEOMETRY[k]();
      const m = mats[k];
      const b = new Batch(g, m, Math.ceil(CAPACITY[k] * scale), NAMES[k]);
      b.mesh.name = 'actors-' + NAMES[k];
      // Shadows, cheeks and ripples draw after the world's own transparent things (the pond water).
      if (k === B.Soft || k === B.Ripple) b.mesh.renderOrder = 2;
      if (k === B.Beam) b.mesh.renderOrder = 3;
      this.batches[k] = b;
      this.group.add(b.mesh);
    }
    // The soft batch always holds Princess Emma's shadow, so it is drawn every frame and sees the camera.
    this.batches[B.Soft].mesh.onBeforeRender = (renderer, _s, cam) => {
      this.camera = cam;
      renderer.getSize(this.viewSize);
    };
  }

  /** Copy the visible characters' parts into the instanced meshes. Call once a frame after every character posed. */
  flush(lists: Iterable<PartList>): void {
    for (const b of this.batches) b.n = 0;
    for (const l of lists) for (let i = 0; i < l.n; i++) this.batches[l.id[i]].add(l, i);
    for (const b of this.batches) b.commit(this.prime);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Posing helpers: a reusable matrix with chainable local moves, and colour helpers.
// ---------------------------------------------------------------------------------------------------------------

const _t = new THREE.Matrix4();
const _v = new THREE.Vector3();

/** A matrix with chainable local transforms: m.from(parent).at(x, y, z).turn(yaw).tilt(pitch).size(sx, sy, sz). */
export class Xf extends THREE.Matrix4 {
  from(m: THREE.Matrix4): this {
    return this.copy(m);
  }
  at(x: number, y: number, z: number): this {
    return this.multiply(_t.makeTranslation(x, y, z));
  }
  /** Rotation about the local y axis (yaw). */
  turn(a: number): this {
    return a ? this.multiply(_t.makeRotationY(a)) : this;
  }
  /** Rotation about the local x axis (pitch; positive tips the +z end down). */
  tilt(a: number): this {
    return a ? this.multiply(_t.makeRotationX(a)) : this;
  }
  /** Rotation about the local z axis (roll). */
  roll(a: number): this {
    return a ? this.multiply(_t.makeRotationZ(a)) : this;
  }
  size(x: number, y = x, z = x): this {
    return this.scale(_v.set(x, y, z));
  }
  /**
   * From the centre of a sphere of radius `r`, move onto its surface at (u, v) in radii (u to the right, v up, on the
   * +z side), facing out along the surface, `depth` metres in front of it. Faces, eyes and cheeks sit on heads this way.
   */
  onSphere(r: number, u: number, v: number, depth = 0): this {
    const w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const d = r + depth;
    return this.at(u * d, v * d, w * d).turn(Math.atan2(u, w)).tilt(-Math.asin(v));
  }
}

/** A linear colour from a CSS hex string. */
export function col(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/** Mix two colours (t = 0 gives a). */
export function mix(a: string | THREE.Color, b: string | THREE.Color, t: number): THREE.Color {
  const ca = typeof a === 'string' ? new THREE.Color(a) : a.clone();
  return ca.lerp(typeof b === 'string' ? new THREE.Color(b) : b, t);
}
