// A ponytail as a verlet chain: two pinned points at the tie (so it flares out from the head) and free points that
// hang, swing, trail behind in the air when she runs or slides, and float on the water when she swims.
import * as THREE from 'three';

const STEP = 1 / 120;
const GRAVITY = -9.8;
/** Air drag: at a steady run the hair trails at about 40 degrees. */
const DRAG = 2.0;
const _d = new THREE.Vector3();

export class Ponytail {
  readonly p: THREE.Vector3[];
  private readonly prev: THREE.Vector3[];
  private readonly seg: number;
  private acc = 0;
  private placed = false;

  constructor(links = 8, seg = 0.13) {
    this.seg = seg;
    this.p = Array.from({ length: links + 1 }, () => new THREE.Vector3());
    this.prev = this.p.map((v) => v.clone());
  }

  /**
   * Advance the chain. `tie` and `flare` are the two pinned points (world), `collide` pushes a point out of her head and
   * body, `ground` is the floor height under her and `water` the water surface while she swims (or null).
   */
  update(dt: number, tie: THREE.Vector3, flare: THREE.Vector3, collide: (q: THREE.Vector3) => void, ground: number, water: number | null): void {
    const p = this.p;
    if (!this.placed) {
      this.placed = true;
      const dir = flare.clone().sub(tie).normalize();
      for (let i = 0; i < p.length; i++) {
        if (i < 2) p[i].copy(i ? flare : tie);
        else p[i].copy(flare).addScaledVector(dir, 0.03 * (i - 1)).add(new THREE.Vector3(0, -this.seg * (i - 1), 0));
        this.prev[i].copy(p[i]);
      }
    }
    this.acc = Math.min(this.acc + dt, STEP * 6);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.step(tie, flare, collide, ground, water);
    }
  }

  private step(tie: THREE.Vector3, flare: THREE.Vector3, collide: (q: THREE.Vector3) => void, ground: number, water: number | null): void {
    const { p, prev, seg } = this;
    const h = STEP;
    p[0].copy(tie);
    p[1].copy(flare);
    for (let i = 2; i < p.length; i++) {
      const q = p[i];
      const vx = (q.x - prev[i].x) / h;
      const vy = (q.y - prev[i].y) / h;
      const vz = (q.z - prev[i].z) / h;
      prev[i].copy(q);
      const wet = water !== null && q.y < water + 0.03;
      const drag = wet ? 7 : DRAG;
      let ay = GRAVITY - drag * vy;
      // Floating: hair in the water rises to the surface and spreads.
      if (wet) ay += 16 + (water! - q.y) * 60;
      const ax = -drag * vx;
      const az = -drag * vz;
      q.x += vx * h * 0.995 + ax * h * h;
      q.y += vy * h * 0.995 + ay * h * h;
      q.z += vz * h * 0.995 + az * h * h;
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 2; i < p.length; i++) {
        const a = p[i - 1];
        const b = p[i];
        const d = b.distanceTo(a) || 1e-6;
        // Pinned neighbours do not move: the free point takes the whole correction.
        const share = i - 1 >= 2 ? 0.5 : 1;
        _d.subVectors(b, a).multiplyScalar((d - seg) / d);
        b.addScaledVector(_d, -share);
        if (share < 1) a.addScaledVector(_d, share);
      }
      // A little stiffness: no sharp folds.
      for (let i = 2; i < p.length; i++) {
        const a = p[i - 2];
        const b = p[i];
        const d = b.distanceTo(a);
        const min = seg * 1.75;
        if (d < min && d > 1e-6) b.addScaledVector(_d.subVectors(b, a), ((min - d) / d) * 0.5);
      }
      for (let i = 2; i < p.length; i++) {
        collide(p[i]);
        if (p[i].y < ground + 0.025) p[i].y = ground + 0.025;
      }
    }
  }

  /** Forget the old positions (after a jump cut, so the hair does not whip across the meadow). */
  reset(): void {
    this.placed = false;
  }
}

/**
 * The ponytails drawn as smooth tubes through their chains (one mesh for both), rebuilt every frame: a Catmull-Rom
 * curve through the points, tapering to a soft tip, with gentle bulges and light bands so they read as curly hair.
 */
export class HairTubes {
  readonly mesh: THREE.Mesh;
  private readonly rings: number;
  private readonly radial: number;
  private readonly pos: THREE.BufferAttribute;
  private readonly nor: THREE.BufferAttribute;

  constructor(tails: number, material: THREE.Material, dark: THREE.Color, light: THREE.Color, rings = 24, radial = 8) {
    this.rings = rings;
    this.radial = radial;
    const n = tails * rings * radial;
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.nor = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const colour = new Float32Array(n * 3);
    const c = new THREE.Color();
    const index: number[] = [];
    for (let k = 0; k < tails; k++) {
      for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        c.copy(dark).lerp(light, 0.3 + 0.35 * t + 0.25 * Math.sin(t * Math.PI * 2 * 5));
        for (let j = 0; j < radial; j++) c.toArray(colour, ((k * rings + i) * radial + j) * 3);
        if (i === rings - 1) continue;
        for (let j = 0; j < radial; j++) {
          const a = (k * rings + i) * radial + j;
          const b = (k * rings + i) * radial + ((j + 1) % radial);
          index.push(a, b, a + radial, b, b + radial, a + radial);
        }
      }
    }
    g.setAttribute('position', this.pos);
    g.setAttribute('normal', this.nor);
    g.setAttribute('color', new THREE.BufferAttribute(colour, 3));
    g.setIndex(index);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
  }

  /** Rebuild tail k through `pts`, radius r(t) from the tie (t = 0) to the tip (t = 1). */
  set(k: number, pts: THREE.Vector3[], r: (t: number) => number): void {
    const { rings, radial } = this;
    const last = pts.length - 1;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      const f = t * last;
      const s = Math.min(last - 1, Math.floor(f));
      catmull(pts[Math.max(0, s - 1)], pts[s], pts[s + 1], pts[Math.min(last, s + 2)], f - s, _p, _tan);
      _tan.normalize();
      // Parallel transport keeps the tube from twisting.
      if (i === 0) {
        _n.set(0, 1, 0).cross(_tan);
        if (_n.lengthSq() < 1e-6) _n.set(1, 0, 0);
        _n.normalize();
      } else {
        _n.addScaledVector(_tan, -_n.dot(_tan)).normalize();
      }
      _b.crossVectors(_tan, _n);
      const radius = r(t) * (1 + 0.13 * Math.sin(t * Math.PI * 2 * 5));
      for (let j = 0; j < radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        _d.copy(_n).multiplyScalar(Math.cos(a)).addScaledVector(_b, Math.sin(a));
        const v = (k * rings + i) * radial + j;
        this.nor.setXYZ(v, _d.x, _d.y, _d.z);
        this.pos.setXYZ(v, _p.x + _d.x * radius, _p.y + _d.y * radius, _p.z + _d.z * radius);
      }
    }
    this.pos.needsUpdate = true;
    this.nor.needsUpdate = true;
  }
}

const _p = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();

/** Uniform Catmull-Rom point and tangent between p1 and p2. */
function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3, tan: THREE.Vector3): void {
  const t2 = t * t;
  const t3 = t2 * t;
  for (const ax of ['x', 'y', 'z'] as const) {
    const a = p0[ax];
    const b = p1[ax];
    const c = p2[ax];
    const d = p3[ax];
    out[ax] = 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    tan[ax] = 0.5 * (-a + c + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t2);
  }
}
