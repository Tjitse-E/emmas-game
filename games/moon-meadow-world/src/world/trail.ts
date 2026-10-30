// The trail beyond the fence (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5): the paddock and the gate (paddock.ts),
// the bed from the gate to the fork, the fork with its signpost, the three roads with the fork's plaza, the three
// clearings and their kit (kit.ts), the ride camera's clamp, the occlusion check and the ducks under the slide.
//
// Each part is a scenery region of its own by name, never by Scenery.regionOf (5.5): `paddock`, `trail-gate` and
// `fork` lie outside every night view and are always drawn; `roads`, `slot-w`, `slot-n`, `slot-e` and the kit are
// built once at load and drawn only during a ride (show), so the bedtime stable frame and the goodnight sky shot gain
// nothing. The ground keeps its cutting and pads (terrain.ts), so a hidden road leaves plain ground.
import * as THREE from 'three';
import type { SignWord } from '../contracts';
import { RIDE, RIDE_PATHS, type Vec2 } from '../layout';
import { EARTH, ellipse, patch, ribbon } from './beds';
import type { CameraRig } from './camera';
import { Scenery, blob, paint, paintY, place, type Geo } from './geo';
import { KIT, KIT_AT, KIT_HEIGHT, KIT_RADIUS } from './kit';
import { buildPaddock } from './paddock';
import { CLEARINGS, CUT, TRAIL_LINES } from './terrain';

export { CLEARINGS };

export const TRAIL_REGIONS = ['paddock', 'trail-gate', 'fork', 'roads', 'slot-w', 'slot-n', 'slot-e'] as const;
/** The regions drawn only during a ride. */
export const RIDE_ONLY = ['roads', 'slot-w', 'slot-n', 'slot-e'] as const;
const SLOT_REGIONS = ['slot-w', 'slot-n', 'slot-e'] as const;

/**
 * A slot counts as on screen while its kit's bounds (a sphere round the kit's spot, holding any of the 13 kinds)
 * reach into the view: what would pop in if it were dressed now. A sphere centred on the ground would reach under it
 * and call a slot on screen when nothing above the ground there is.
 */
const ON_SCREEN = { y: KIT_HEIGHT / 2, r: Math.hypot(KIT_RADIUS, KIT_HEIGHT / 2) } as const;

/** Bed heights over the flat ground: the trail-gate bed under the roads, the roads under the plaza and the clearings. */
const Y = { gate: 0.035, road: 0.04, plaza: 0.045, clearing: 0.05 } as const;

/**
 * The signpost at RIDE.post: a post with three finger boards, west, north and east, each pointing the way its road
 * leaves the fork. The cards (ui/sign.ts) sit on the boards' outer ends (arm(i)); the north board sits higher, so on
 * screen its card shows above the other two.
 */
export const SIGNPOST = { height: 2.25, arms: [{ y: 1.45, len: 1.15 }, { y: 1.9, len: 1.0 }, { y: 1.45, len: 1.15 }] } as const;

/** The way road i leaves the fork: towards its point 4 m along. */
function armDir(i: 0 | 1 | 2): Vec2 {
  const r = RIDE_PATHS.roads[i];
  const p = r.getPointAt(4 / r.getLength());
  const l = Math.hypot(p.x - RIDE.fork.x, p.z - RIDE.fork.z);
  return { x: (p.x - RIDE.fork.x) / l, z: (p.z - RIDE.fork.z) / l };
}

/** The end of arm i of the signpost, at its card height. */
export function armEnd(i: 0 | 1 | 2, out = new THREE.Vector3()): THREE.Vector3 {
  const d = armDir(i);
  const a = SIGNPOST.arms[i];
  return out.set(RIDE.post.x + d.x * (a.len + 0.07), a.y, RIDE.post.z + d.z * (a.len + 0.07));
}

const WOOD = { dark: '#9b6a42', light: '#c08a5c' } as const;

/** 1 on a trail bed, fading to 0 over its soft edge (the beds' ribbons): what lies under the plaza and the clearings. */
const BED_SOFT = 0.4;
function onBed(x: number, z: number): number {
  let d = Infinity;
  for (const line of TRAIL_LINES) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const t = THREE.MathUtils.clamp(((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz || 1), 0, 1);
      d = Math.min(d, Math.hypot(x - a.x - abx * t, z - a.z - abz * t));
    }
  }
  return 1 - THREE.MathUtils.smoothstep(d, CUT.bed, CUT.bed + BED_SOFT);
}

export function signpostGeometry(): Geo[] {
  const parts: Geo[] = [];
  const { x, z } = RIDE.post;
  const h = SIGNPOST.height;
  parts.push(place(paintY(new THREE.BoxGeometry(0.14, h, 0.14), WOOD.dark, WOOD.light, -h / 2, h / 2), { x, y: h / 2, z }));
  parts.push(place(paint(new THREE.ConeGeometry(0.13, 0.16, 4), WOOD.light), { x, y: h + 0.08, z, ry: Math.PI / 4 }));
  ([0, 1, 2] as const).forEach((i) => {
    const d = armDir(i);
    const { y, len } = SIGNPOST.arms[i];
    const ry = Math.atan2(-d.z, d.x);
    const mid = 0.07 + len / 2;
    parts.push(place(paintY(new THREE.BoxGeometry(len, 0.26, 0.05), '#f6e2bd', '#fff4dc', -0.13, 0.13), { x: x + d.x * mid, y, z: z + d.z * mid, ry }));
    // A pointed end: a square board turned 45 degrees, half of it past the board's end.
    const tip = 0.07 + len;
    parts.push(place(paint(new THREE.BoxGeometry(0.184, 0.184, 0.05), '#fff4dc'), { x: x + d.x * tip, y, z: z + d.z * tip, ry, rz: Math.PI / 4 }));
  });
  return parts;
}

/** The way into a clearing: from its slot back towards the fork, along its road's last metres. */
function entryAngle(i: 0 | 1 | 2): number {
  const r = RIDE_PATHS.roads[i];
  const a = r.getPointAt(1 - 3 / r.getLength());
  const s = RIDE.slots[i];
  return Math.atan2(a.z - s.z, a.x - s.x);
}

/** A bare clearing: trodden ground round its slot and a few grey stones on its rim, clear of the way in and the kit. */
export function clearingGeometry(i: 0 | 1 | 2): Geo[] {
  const c = CLEARINGS[i];
  const parts: Geo[] = [patch(ellipse(c.center, c.radius, c.radius, 28), c.center, 0.45, Y.clearing, EARTH, onBed)];
  const entry = entryAngle(i);
  const north = -Math.PI / 2;
  const off = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.2;
    if (off(a, entry) < 0.8 || off(a, north) < 1.1) continue;
    const r = c.radius + 0.1;
    const s = 0.16 + 0.1 * ((k * 7) % 3) / 2;
    parts.push(place(paintY(blob(1, 0), '#c9c2d6', '#ebe6f2', -0.6, 1), { x: c.center.x + Math.cos(a) * r, y: s * 0.35, z: c.center.z + Math.sin(a) * r, sx: s * 1.3, sy: s * 0.8, sz: s, ry: a }));
  }
  return parts;
}

export interface TrailApi {
  /** Dress the three slots (west, north, east) with these words' kit, or bare them with null. */
  dress(words: readonly [SignWord, SignWord, SignWord] | null): void;
  /** Each slot's word and whether it is on screen now. */
  slots(): { word: SignWord | null; onScreen: boolean }[];
  /** The end of arm i of the signpost, at card height (where card i sits). */
  arm(i: 0 | 1 | 2): THREE.Vector3;
  /** Swing the gate in the north fence open or shut. */
  gate(open: boolean, ms?: number): Promise<void>;
  /** The roads, the slots and the kit: drawn only during a ride (shown at getting on, hidden at getting off). Hidden at load. */
  show(on: boolean): void;
  readonly shown: boolean;
}

export interface DucksApi {
  /** The three ducks swim under the chute (the resting slide) or to the far shore (a pond visit). */
  set(at: 'chute' | 'far', ms?: number): void;
  /** A small bob (a tap on the resting slide). */
  bob(): void;
}

/** What the trail needs from the world once the scenery is built (world/index.ts). */
export interface TrailAttach {
  scene: THREE.Scene;
  /** The shared scenery material: the kit uses it, so it compiles no shader of its own. */
  material: THREE.Material;
  camera?: THREE.Camera;
  rig?: CameraRig;
  /** What can hide a point from the camera: the scenery's meshes and the trees. */
  occluders?: () => THREE.Object3D[];
  ducks?: DucksApi;
}

export interface TrailWorld {
  readonly trail: TrailApi;
  readonly ducks: DucksApi;
  /** For each point, whether the trees or the scenery hide it from the camera. */
  occluded(points: readonly THREE.Vector3[]): boolean[];
  /** The follow camera's clamp: the meadow's, or the wide one of a ride. */
  cameraClamp(kind: 'meadow' | 'ride'): void;
  update(dt: number, t: number): void;
  /** Wire the parts the trail does not build: its built meshes, the camera, the occluders and the pond's ducks. */
  attach(o: TrailAttach): void;
  /** Every mesh the trail draws (its regions and the kit), for the harness's budget check. */
  meshes(): THREE.Object3D[];
  /**
   * Upload the ride's meshes (the roads, the slots and every kind of kit) to the GPU once, at load: drawn hidden into
   * a 1 x 1 target, so a ride adds no geometry to renderer.info.memory (the long play's level check).
   */
  warm(renderer: THREE.WebGLRenderer): void;
}

export function buildTrail(_scene: THREE.Scene, scenery: Scenery): TrailWorld {
  const paddock = buildPaddock(scenery);
  // The bed from the gate to the fork, then the roads with the fork's plaza over their starts.
  scenery.add(ribbon(TRAIL_LINES[0], CUT.bed, BED_SOFT, Y.gate, EARTH), 'trail-gate');
  for (const line of TRAIL_LINES.slice(1)) scenery.add(ribbon(line, CUT.bed, BED_SOFT, Y.road, EARTH), 'roads');
  scenery.add(patch(ellipse(RIDE.fork, CUT.plaza, CUT.plaza, 28), RIDE.fork, 0.4, Y.plaza, EARTH, onBed), 'roads');
  for (const g of signpostGeometry()) scenery.add(g, 'fork');
  ([0, 1, 2] as const).forEach((i) => {
    for (const g of clearingGeometry(i)) scenery.add(g, SLOT_REGIONS[i]);
  });

  let words: (SignWord | null)[] = [null, null, null];
  let shown = false;
  let rideOnly: THREE.Object3D[] = [];
  let all: THREE.Object3D[] = [];
  let camera: THREE.Camera | null = null;
  const kit = new Map<SignWord, THREE.Mesh>();
  const apply = (): void => {
    for (const m of rideOnly) m.visible = shown;
    for (const m of kit.values()) m.visible = false;
    words.forEach((w, i) => {
      const m = w ? kit.get(w) : undefined;
      if (!m) return;
      m.position.set(KIT_AT[i].x, 0, KIT_AT[i].z);
      m.updateMatrix();
      m.visible = shown;
    });
  };
  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
  const onScreen = (i: number): boolean => {
    if (!camera) return false;
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const at = KIT_AT[i];
    return frustum.intersectsSphere(sphere.set(new THREE.Vector3(at.x, ON_SCREEN.y, at.z), ON_SCREEN.r));
  };
  const trail: TrailApi = {
    dress(w) {
      words = w ? [...w] : [null, null, null];
      apply();
    },
    slots: () => words.map((word, i) => ({ word, onScreen: onScreen(i) })),
    arm: (i) => armEnd(i),
    gate: (open, ms) => paddock.gate(open, ms),
    show(on) {
      shown = on;
      apply();
    },
    get shown() {
      return shown;
    },
  };
  return {
    trail,
    ducks: { set() {}, bob() {} },
    occluded: (points) => points.map(() => false),
    cameraClamp() {},
    update(dt) {
      paddock.update(dt);
    },
    attach(o) {
      const region = (r: string): THREE.Object3D | undefined => o.scene.getObjectByName(`scenery-${r}`);
      rideOnly = RIDE_ONLY.map(region).filter((m): m is THREE.Object3D => !!m);
      camera = o.camera ?? null;
      if (kit.size === 0) {
        for (const w of Object.keys(KIT) as SignWord[]) {
          const m = new THREE.Mesh(KIT[w](), o.material);
          m.name = `kit-${w}`;
          m.matrixAutoUpdate = false;
          m.visible = false;
          o.scene.add(m);
          kit.set(w, m);
        }
      }
      all = [...TRAIL_REGIONS.map(region).filter((m): m is THREE.Object3D => !!m), ...kit.values()];
      apply();
    },
    meshes: () => all.slice(),
    warm(renderer) {
      const scene = rideOnly[0]?.parent;
      if (!scene || !camera) return;
      const ride = new Set<THREE.Object3D>([...rideOnly, ...kit.values()]);
      const was = new Map<THREE.Object3D, { visible: boolean; culled: boolean }>();
      // Only the ride's meshes draw; the lights and the fog stay, so the draw uses the scenery's own shader.
      scene.traverse((ob) => {
        if (!(ob as THREE.Mesh).isMesh && !(ob as THREE.Points).isPoints && !(ob as THREE.Line).isLine && !(ob as THREE.Sprite).isSprite) return;
        was.set(ob, { visible: ob.visible, culled: ob.frustumCulled });
        ob.visible = ride.has(ob);
        ob.frustumCulled = false;
      });
      const target = new THREE.WebGLRenderTarget(1, 1);
      const before = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(scene as THREE.Scene, camera);
      renderer.setRenderTarget(before);
      target.dispose();
      for (const [ob, w] of was) {
        ob.visible = w.visible;
        ob.frustumCulled = w.culled;
      }
      apply();
    },
  };
}
