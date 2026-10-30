// The paddock, the gate, the trail beyond it, the fork, the slots, the clearing kit, the ride camera, the occlusion
// check and the ducks (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5; docs/v4/2.4-plan.md Tasks 17 to 20).
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MIST, NIGHT_SKY, RIDE, RIDE_PATHS, STABLE_FRAME, dist2, inPond, type Vec2 } from '../src/layout';
import { CameraRig, FOV } from '../src/world/camera';
import { Scenery, type Geo } from '../src/world/geo';
import { GATE, GATE_REGION, PADDOCK_REGION, buildPaddock } from '../src/world/paddock';
import {
  FENCE_GAP, HEDGE_GAP, TRAIL_LINES, buildFence, buildGround, buildGrowth, buildHedges, buildOverlays, buildTrees, groundHeight, treeSpots,
} from '../src/world/terrain';
import { CLEARINGS, TRAIL_REGIONS, buildTrail, occludersOf, type TrailWorld } from '../src/world/trail';
import { DUCK_SPOTS, buildCorner, buildGazebo, buildNest, buildPicnic, buildSlide, createDucks, signGeometry } from '../src/world/places';
import { buildBeadTree } from '../src/world/beadtree';
import { KIT, KIT_AT, KIT_HEIGHT, KIT_RADIUS } from '../src/world/kit';

// src/assets.ts (the sign words' pictures, through content/signs.ts) reads the page location when it loads.
vi.stubGlobal('location', { pathname: '/' });
const { SIGN_WORDS } = await import('../src/content/signs');

const triangles = (g: Geo): number => (g.index ? g.index.count : g.attributes.position.count) / 3;

/** Collect what a build adds to the scenery, with the region it asks for (none: placed by Scenery.regionOf). */
function collect(build: (s: Scenery) => void): { geo: Geo; region?: string }[] {
  const out: { geo: Geo; region?: string }[] = [];
  const add = (geo: Geo, region?: string) => void out.push({ geo, region });
  build({ add, addMovable: add, movable: () => undefined } as unknown as Scenery);
  return out;
}

/** Every vertex of a list of parts. */
function* vertices(parts: { geo: Geo }[]): Generator<THREE.Vector3> {
  for (const { geo } of parts) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) yield new THREE.Vector3().fromBufferAttribute(pos, i);
  }
}

describe('the paddock and the gate (Task 17)', () => {
  it('puts the paddock\'s parts in the region paddock and the gate in trail-gate, never ne', () => {
    const parts = collect((s) => void buildPaddock(s));
    expect(parts.length).toBeGreaterThan(5);
    for (const p of parts) expect([PADDOCK_REGION, GATE_REGION]).toContain(p.region);
    expect(PADDOCK_REGION).toBe('paddock');
    expect(GATE_REGION).toBe('trail-gate');
    // The sand, the back rail, the trough and the tub stand in the paddock, the bed runs from its rail to the gate;
    // the gate stands in the north fence.
    const paddock = parts.filter((p) => p.region === PADDOCK_REGION);
    for (const v of vertices(paddock)) {
      expect(v.x).toBeGreaterThan(Math.min(RIDE.paddock.minX, RIDE.gate.x - 1.5) - 0.4);
      expect(v.x).toBeLessThan(RIDE.rail.maxX + 0.4);
      expect(v.z).toBeLessThan(RIDE.paddock.maxZ + 0.6);
      expect(v.z).toBeGreaterThan(RIDE.gate.z - 0.4);
      expect(v.y).toBeLessThan(1.1);
    }
    for (const v of vertices(parts.filter((p) => p.region === GATE_REGION))) {
      expect(Math.abs(v.x - RIDE.gate.x)).toBeLessThan(GATE.width / 2 + 0.3);
      expect(Math.abs(v.z - RIDE.gate.z)).toBeLessThan(0.3);
    }
    expect(parts.reduce((n, p) => n + triangles(p.geo), 0)).toBeLessThan(2500);
  });

  it('keeps the back rail\'s gap open and the trough and the tub inside their obstacle circles', () => {
    const parts = collect((s) => void buildPaddock(s));
    const half = RIDE.rail.gapWidth / 2;
    for (const v of vertices(parts.filter((p) => p.region === PADDOCK_REGION))) {
      // Nothing stands in the gap above the sand.
      if (v.y > 0.08 && Math.abs(v.z - RIDE.rail.z) < 0.4) expect(Math.abs(v.x - RIDE.rail.gapX), `${v.x},${v.z}`).toBeGreaterThan(half - 0.1);
      // Nothing stands up anywhere else but on the rail, the trough and the tub.
      if (v.y > 0.08) {
        const onRail = Math.abs(v.z - RIDE.rail.z) < 0.15;
        const inTrough = Math.hypot(v.x - RIDE.trough.center.x, v.z - RIDE.trough.center.z) <= RIDE.trough.radius + 0.01;
        const inTub = Math.hypot(v.x - RIDE.tub.center.x, v.z - RIDE.tub.center.z) <= RIDE.tub.radius + 0.01;
        expect(onRail || inTrough || inTub, `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('leaves a gap in the fence and the hedge where the gate is, and nowhere else', () => {
    const fence = collect(buildFence);
    for (const v of vertices(fence)) {
      if (Math.abs(v.z - RIDE.gate.z) < 0.3) expect(v.x < FENCE_GAP.minX || v.x > FENCE_GAP.maxX, `fence at ${v.x}`).toBe(true);
    }
    expect(FENCE_GAP.minX).toBeLessThanOrEqual(RIDE.gate.x - GATE.width / 2);
    expect(FENCE_GAP.maxX).toBeGreaterThanOrEqual(RIDE.gate.x + GATE.width / 2);
    const hedges = collect((s) => buildHedges(s, { at: [] }));
    const flowers: THREE.Vector3[] = [];
    collect((s) => buildHedges(s, { at: flowers }));
    for (const v of [...vertices(hedges), ...flowers]) {
      if (v.x > HEDGE_GAP.minX && v.x < HEDGE_GAP.maxX && v.z < RIDE.gate.z - 1) expect(v.y, `hedge at ${v.x},${v.z}`).toBeLessThan(0.01);
    }
    // The trail bed (3 m) passes the hedge with room to spare, and the hedge still stands on both sides of it.
    expect(HEDGE_GAP.minX).toBeLessThan(RIDE.gate.x - 1.5 - 0.5);
    expect(HEDGE_GAP.maxX).toBeGreaterThan(RIDE.gate.x + 1.5 + 0.5);
    const tall = [...vertices(hedges)].filter((v) => v.z < RIDE.gate.z - 1 && v.y > 0.6);
    expect(tall.some((v) => v.x < HEDGE_GAP.minX && v.x > HEDGE_GAP.minX - 2)).toBe(true);
    expect(tall.some((v) => v.x > HEDGE_GAP.maxX && v.x < HEDGE_GAP.maxX + 2)).toBe(true);
  });

  it('swings the gate open inwards and shut again, inside its merged region', async () => {
    const scenery = new Scenery();
    const paddock = buildPaddock(scenery);
    const meshes = scenery.build(new THREE.MeshLambertMaterial({ vertexColors: true }), 'scenery');
    const gate = meshes.find((m) => m.name === `scenery-${GATE_REGION}`)!;
    expect(gate).toBeDefined();
    const pos = gate.geometry.attributes.position as THREE.BufferAttribute;
    const box = (): THREE.Box3 => new THREE.Box3().setFromBufferAttribute(pos);
    const shut = box();
    expect(shut.max.z - shut.min.z).toBeLessThan(0.5);
    const done = paddock.gate(true, 600);
    for (let i = 0; i < 40; i++) paddock.update(0.02);
    await done;
    expect(paddock.open).toBe(1);
    const open = box();
    // Both leaves lie along the bed's sides, south of the fence (into the meadow), and the bed between stays clear.
    expect(open.max.z).toBeGreaterThan(RIDE.gate.z + GATE.width / 2 - 0.2);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.z > RIDE.gate.z + 0.3) expect(Math.abs(v.x - RIDE.gate.x), `${v.x},${v.z}`).toBeGreaterThan(GATE.width / 2 - 0.25);
    }
    await paddock.gate(false, 0);
    expect(paddock.open).toBe(0);
    expect(box().max.z).toBeCloseTo(shut.max.z, 5);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Task 18: the trail ground, the fork and the slots
// ---------------------------------------------------------------------------------------------------------------

const flatOf = (p: THREE.Vector3): Vec2 => ({ x: p.x, z: p.z });
const allPaths = (): THREE.CatmullRomCurve3[] => [...Object.values(RIDE_PATHS.out), ...RIDE_PATHS.roads, RIDE_PATHS.home];
const material = new THREE.MeshLambertMaterial({ vertexColors: true });

/** The world's trail as createWorld builds it: the paddock and the trail in the scenery, built, then attached. */
function buildTrailForTest(): { t: TrailWorld; scene: THREE.Scene } {
  const scene = new THREE.Scene();
  const scenery = new Scenery();
  const t = buildTrail(scene, scenery);
  for (const m of scenery.build(material, 'scenery')) scene.add(m);
  t.attach({ scene, material });
  return { t, scene };
}
const regionMesh = (scene: THREE.Scene, r: string): THREE.Mesh => scene.getObjectByName(`scenery-${r}`) as THREE.Mesh;
const geometryCount = (scene: THREE.Scene): number => {
  const seen = new Set<THREE.BufferGeometry>();
  scene.traverse((o) => void ((o as THREE.Mesh).geometry && seen.add((o as THREE.Mesh).geometry)));
  return seen.size;
};
/** The camera camera.ts puts at a frame pose (the bedtime stable frame, the goodnight sky shot) on a W x H screen. */
function framePose(pose: { center: Vec2; width: number; pitch?: number; shiftY?: number }, w: number, h: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(FOV, w / h, 0.5, 700);
  const rig = new CameraRig(cam);
  rig.resize(w, h);
  void rig.frame(pose.center, pose.width, { ms: 0, pitch: pose.pitch, shiftY: pose.shiftY });
  rig.update(0);
  cam.updateMatrixWorld();
  return cam;
}
/** Whether the renderer would draw a mesh from this camera (three.js culls by the bounding sphere). */
function inFrustum(cam: THREE.Camera, mesh: THREE.Mesh): boolean {
  const f = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  mesh.updateMatrixWorld(true);
  return f.intersectsObject(mesh);
}
/** The distance from a point to a polyline. */
function lineDist(p: Vec2, line: readonly Vec2[]): number {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const t = THREE.MathUtils.clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / (abx * abx + abz * abz || 1), 0, 1);
    d = Math.min(d, Math.hypot(p.x - a.x - abx * t, p.z - a.z - abz * t));
  }
  return d;
}
const pathLine = (c: THREE.Curve<THREE.Vector3>, n = 200): Vec2[] => c.getSpacedPoints(n).map(flatOf);

describe('the trail ground, the fork and the slots (Task 18)', () => {
  it('runs each path flat at y 0, at least 3 m from every seeded tree, ending where the next one starts', () => {
    for (const c of allPaths()) for (let u = 0; u <= 1; u += 0.01) expect(c.getPointAt(u).y).toBe(0);
    for (const c of Object.values(RIDE_PATHS.out)) expect(dist2(flatOf(c.getPointAt(1)), RIDE.fork)).toBeLessThan(0.01);
    expect(dist2(flatOf(RIDE_PATHS.home.getPointAt(0)), RIDE.fork)).toBeLessThan(0.01);
    expect(dist2(flatOf(RIDE_PATHS.home.getPointAt(1)), RIDE.stand)).toBeLessThan(0.01);
    for (const m of ['bella', 'hazel'] as const) expect(dist2(flatOf(RIDE_PATHS.out[m].getPointAt(0)), RIDE.mounts[m])).toBeLessThan(0.01);
    expect(RIDE_PATHS.roads.every((r) => dist2(flatOf(r.getPointAt(0)), RIDE.fork) < 0.01)).toBe(true);
    for (const [i, r] of RIDE_PATHS.roads.entries()) expect(dist2(flatOf(r.getPointAt(1)), RIDE.slots[i])).toBeLessThan(0.01);
    expect(RIDE_PATHS.roads.every((r) => r.getLength() > 9 && r.getLength() < 14)).toBe(true);
    const trees = treeSpots();
    expect(trees.length).toBe(76);
    for (const c of allPaths()) {
      const line = pathLine(c);
      for (const t of trees) expect(lineDist(t, line), `tree ${t.x.toFixed(1)},${t.z.toFixed(1)}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('rides out through the rail\'s gap and the gate, clear of the trough, the tub and the other mount', () => {
    const sample = (c: THREE.CatmullRomCurve3): Vec2[] => pathLine(c, 400);
    const other = { bella: RIDE.mounts.hazel, hazel: RIDE.mounts.bella };
    for (const m of ['bella', 'hazel'] as const) {
      const pts = sample(RIDE_PATHS.out[m]);
      for (const p of pts) {
        for (const o of [RIDE.trough, RIDE.tub]) expect(dist2(p, o.center), `${m} at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBeGreaterThan(o.radius + 0.35);
        expect(dist2(p, other[m]), `${m} past the other mount`).toBeGreaterThan(1.1);
      }
    }
    // Home with either mount: the other one stands at its spot.
    for (const p of sample(RIDE_PATHS.home)) {
      for (const o of [RIDE.trough, RIDE.tub]) expect(dist2(p, o.center)).toBeGreaterThan(o.radius + 0.35);
      if (p.z > RIDE.rail.z) for (const s of Object.values(RIDE.mounts)) expect(dist2(p, s), `home at ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBeGreaterThan(1.1);
    }
    // Where a path crosses the rail and the fence, it is inside the gap and the gate, and runs about straight across.
    for (const c of allPaths().filter((c) => c !== RIDE_PATHS.roads[0] && c !== RIDE_PATHS.roads[1] && c !== RIDE_PATHS.roads[2])) {
      const pts = sample(c);
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        for (const [z, x, half] of [[RIDE.rail.z, RIDE.rail.gapX, RIDE.rail.gapWidth / 2], [RIDE.gate.z, RIDE.gate.x, GATE.width / 2]] as const) {
          if ((a.z - z) * (b.z - z) > 0) continue;
          expect(Math.abs(a.x - x), `crossing at ${z}`).toBeLessThan(half - 0.4);
          expect(Math.abs(b.x - a.x) / Math.abs(b.z - a.z || 1e-9)).toBeLessThan(0.6);
        }
      }
    }
  });

  it('cuts the north road through the hill and sits the north slot on a 6 m pad at y 0', () => {
    const slot = RIDE.slots[1];
    for (let dx = -3; dx <= 3; dx += 0.25) for (let dz = -3; dz <= 3; dz += 0.25) {
      if (Math.hypot(dx, dz) <= 3) expect(groundHeight(slot.x + dx, slot.z + dz), `${dx},${dz}`).toBe(0);
    }
    // Every bed of the trail beyond the fence, 3 m wide, is flat at y 0 (inside the fence the meadow is flat anyway).
    for (const c of [...RIDE_PATHS.roads, RIDE_PATHS.home]) {
      const pts = c.getSpacedPoints(120);
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        if (a.z > RIDE.gate.z) continue;
        const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        for (const o of [-1.5, -0.75, 0, 0.75, 1.5]) expect(groundHeight(a.x - ((b.z - a.z) / l) * o, a.z + ((b.x - a.x) / l) * o)).toBe(0);
      }
    }
    // Without the cutting the north slot's ground would stand about 2.7 m up; beside it the hills stay.
    expect(groundHeight(slot.x + 10, slot.z)).toBeGreaterThan(1.5);
    expect(groundHeight(slot.x, slot.z - 10)).toBeGreaterThan(1.5);
  });

  it('lays the ground mesh flat wherever a bed or a clearing lies on it, so a hidden road leaves plain ground', () => {
    const parts = collect(buildGround);
    const lines = TRAIL_LINES;
    const v = new THREE.Vector3();
    let near = 0;
    for (const { geo } of parts) {
      const pos = geo.attributes.position;
      const idx = geo.index!;
      for (let i = 0; i < idx.count; i += 3) {
        // A cell that a bed (1.5 m each side of its line) or a clearing (2.8 m round its slot) reaches into has all
        // three corners at 0. The cell is sampled at 15 points, its corners and edges included.
        const corners = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i + k)));
        const samples: Vec2[] = [];
        for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4 - a; b++) {
          const c = 4 - a - b;
          samples.push({ x: (corners[0].x * a + corners[1].x * b + corners[2].x * c) / 4, z: (corners[0].z * a + corners[1].z * b + corners[2].z * c) / 4 });
        }
        const touches = samples.some((q) => lines.some((l) => lineDist(q, l) < 1.5) || CLEARINGS.some((s) => Math.hypot(q.x - s.center.x, q.z - s.center.z) < s.radius));
        if (!touches) continue;
        // Cells of the meadow and the first hills only: the bed reaches no coarse cell but the east slot's last 0.5 m.
        const span = Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x));
        if (span > 2.01) continue;
        near++;
        for (const c of corners) expect(c.y, `${c.x},${c.z}`).toBeLessThan(0.001);
      }
    }
    expect(near).toBeGreaterThan(100);
    void v;
  });

  it('names the trail regions, none of them ne or far-n: one mesh each', () => {
    const scenery = new Scenery();
    const regions = new Set<string | undefined>();
    const fake = { add: (_g: Geo, r?: string) => void regions.add(r), addMovable: (_g: Geo, r?: string) => void regions.add(r), movable: () => undefined } as unknown as Scenery;
    buildTrail(new THREE.Scene(), fake);
    expect([...regions].sort()).toEqual(TRAIL_REGIONS.slice().sort());
    expect(TRAIL_REGIONS.slice().sort()).toEqual(['fork', 'paddock', 'roads', 'slot-e', 'slot-n', 'slot-w', 'trail-gate']);
    buildTrail(new THREE.Scene(), scenery);
    const meshes = scenery.build(material, 'scenery');
    expect(meshes.map((m) => m.name).sort()).toEqual(TRAIL_REGIONS.map((r) => `scenery-${r}`).sort());
  });

  it('keeps the night views clear: the paddock, trail-gate and the fork outside both night frames, the roads and slots hidden', () => {   // 5.5
    const { t, scene } = buildTrailForTest();
    for (const [w, h] of [[1080, 810], [1080, 740]]) for (const [name, pose] of [['stable', STABLE_FRAME], ['sky', NIGHT_SKY]] as const) {
      const cam = framePose(pose, w, h);
      for (const r of ['paddock', 'trail-gate', 'fork']) expect(inFrustum(cam, regionMesh(scene, r)), `${r} in the ${name} frame at ${w}x${h}`).toBe(false);
    }
    expect(t.trail.shown).toBe(false);
    for (const r of ['roads', 'slot-w', 'slot-n', 'slot-e']) expect(regionMesh(scene, r).visible, r).toBe(false);
    for (const r of ['paddock', 'trail-gate', 'fork']) expect(regionMesh(scene, r).visible, r).toBe(true);
    t.trail.show(true);
    expect(t.trail.shown).toBe(true);
    for (const r of ['roads', 'slot-w', 'slot-n', 'slot-e']) expect(regionMesh(scene, r).visible, r).toBe(true);
    t.trail.show(false);
    expect(regionMesh(scene, 'roads').visible).toBe(false);
  });

  it('builds the roads, the slots and the kit once at load, so a ride adds no geometry', () => {   // the long play's memory check
    const { t, scene } = buildTrailForTest();
    const before = geometryCount(scene);
    const children = scene.children.length;
    t.trail.show(true); t.trail.dress(['sand', 'barn', 'pond']); t.trail.dress(['stump', 'bench', 'pool']); t.trail.dress(null); t.trail.show(false);
    expect(geometryCount(scene)).toBe(before);
    expect(scene.children.length).toBe(children);
  });

  it('points the signpost\'s arms along the roads, at card height, its post clear of every bed', () => {
    const { t } = buildTrailForTest();
    const post = RIDE.post;
    for (const l of TRAIL_LINES) expect(lineDist(post, l)).toBeGreaterThan(1.5 + 0.4);
    expect(dist2(post, RIDE.fork)).toBeLessThan(4.5);
    const arms = ([0, 1, 2] as const).map((i) => t.trail.arm(i));
    for (const [i, a] of arms.entries()) {
      expect(a.y, `arm ${i}`).toBeGreaterThan(1.2);
      expect(a.y).toBeLessThan(2.3);
      // Each arm points the way its road leaves the fork.
      const along = RIDE_PATHS.roads[i].getPointAt(4 / RIDE_PATHS.roads[i].getLength());
      const road = new THREE.Vector2(along.x - RIDE.fork.x, along.z - RIDE.fork.z).normalize();
      const arm = new THREE.Vector2(a.x - post.x, a.z - post.z);
      expect(arm.length()).toBeGreaterThan(0.8);
      expect(arm.normalize().dot(road), `arm ${i}`).toBeGreaterThan(0.95);
    }
    // West to east on screen: the west card left of the east one, the north card above both.
    expect(arms[0].x).toBeLessThan(arms[2].x - 1.5);
    expect(arms[1].z).toBeLessThan(Math.min(arms[0].z, arms[2].z));
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Task 19: the clearing kit
// ---------------------------------------------------------------------------------------------------------------

describe('the clearing kit (Task 19)', () => {
  it('builds each of the 13 kinds under 600 triangles as one geometry', () => {
    expect(Object.keys(KIT).sort()).toEqual(SIGN_WORDS.map((w) => w.word).sort());
    for (const w of SIGN_WORDS) {
      const g = KIT[w.word]();
      expect(g, w.word).toBeInstanceOf(THREE.BufferGeometry);
      expect(triangles(g), w.word).toBeGreaterThan(60);
      expect(triangles(g), w.word).toBeLessThan(600);
      expect(Object.keys(g.attributes).sort(), w.word).toEqual(['color', 'normal', 'position']);
    }
  });

  it('keeps each kind on its clearing: inside its 1.6 m round its spot, on the ground, under 3 m high', () => {
    expect([KIT_RADIUS, KIT_HEIGHT]).toEqual([1.6, 3]);
    for (const w of SIGN_WORDS) {
      const g = KIT[w.word]();
      const box = new THREE.Box3().setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute);
      expect(box.min.y, w.word).toBeGreaterThan(-0.05);
      expect(box.min.y, w.word).toBeLessThan(0.15);
      expect(box.max.y, w.word).toBeLessThan(KIT_HEIGHT);
      expect(box.max.y, w.word).toBeGreaterThan(0.25);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) expect(Math.hypot(pos.getX(i), pos.getZ(i)), w.word).toBeLessThan(KIT_RADIUS);
    }
    for (const [i, at] of KIT_AT.entries()) {
      const c = CLEARINGS[i];
      // The kit stands behind the slot (where the mount stops), inside its clearing, clear of the mount.
      expect(Math.hypot(at.x - c.center.x, at.z - c.center.z) + KIT_RADIUS, `slot ${i}`).toBeLessThanOrEqual(c.radius + 0.01);
      expect(dist2(at, RIDE.slots[i]) - KIT_RADIUS, `slot ${i}`).toBeGreaterThan(0.85);
      for (let dx = -KIT_RADIUS; dx <= KIT_RADIUS; dx += 0.4) for (let dz = -KIT_RADIUS; dz <= KIT_RADIUS; dz += 0.4) {
        if (Math.hypot(dx, dz) <= KIT_RADIUS) expect(groundHeight(at.x + dx, at.z + dz)).toBe(0);
      }
    }
  });

  it('dresses the three slots with one mesh per kind and bares them with null', () => {
    const { t, scene } = buildTrailForTest();
    const kit = (w: string): THREE.Mesh => scene.getObjectByName(`kit-${w}`) as THREE.Mesh;
    const visible = (): string[] => SIGN_WORDS.map((w) => w.word).filter((w) => kit(w).visible);
    for (const w of SIGN_WORDS) expect(kit(w.word), w.word).toBeDefined();
    // Hidden while the trail is hidden, even dressed.
    t.trail.dress(['sand', 'barn', 'pond']);
    expect(visible()).toEqual([]);
    expect(t.trail.slots().map((s) => s.word)).toEqual(['sand', 'barn', 'pond']);
    t.trail.show(true);
    expect(visible().sort()).toEqual(['barn', 'pond', 'sand']);
    for (const [i, w] of (['sand', 'barn', 'pond'] as const).entries()) {
      const m = kit(w);
      m.updateMatrixWorld();
      const p = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
      expect(dist2(flatOf(p), KIT_AT[i]), w).toBeLessThan(0.01);
    }
    t.trail.dress(['stump', 'bench', 'pool']);
    expect(visible().sort()).toEqual(['bench', 'pool', 'stump']);
    t.trail.dress(null);
    expect(visible()).toEqual([]);
    expect(t.trail.slots().map((s) => s.word)).toEqual([null, null, null]);
    t.trail.dress(['pines', 'shell', 'swing']);
    t.trail.show(false);
    expect(visible()).toEqual([]);
  });

  it('says a slot is on screen when its kit\'s bounds are in the camera\'s view', () => {
    const scene = new THREE.Scene();
    const scenery = new Scenery();
    const t = buildTrail(scene, scenery);
    for (const m of scenery.build(material, 'scenery')) scene.add(m);
    const cam = new THREE.PerspectiveCamera(FOV, 1080 / 740, 0.5, 700);
    const rig = new CameraRig(cam);
    rig.resize(1080, 740);
    t.attach({ scene, material, camera: cam, rig });
    t.trail.dress(['sand', 'barn', 'pond']);
    const frameAt = (p: Vec2, width: number): void => {
      void rig.frame(p, width, { ms: 0 });
      rig.update(0);
    };
    // The fork's frame (about 8 m): no slot shows, so the ride dresses them there.
    frameAt({ x: RIDE.fork.x, z: RIDE.fork.z - 1.5 }, 8);
    expect(t.trail.slots().map((s) => s.onScreen)).toEqual([false, false, false]);
    // Riding up to a clearing it shows; the paddock sees none.
    frameAt(RIDE.slots[1], 13.5);
    expect(t.trail.slots()[1].onScreen).toBe(true);
    frameAt(RIDE.slots[0], 13.5);
    expect(t.trail.slots()[0].onScreen).toBe(true);
    frameAt(RIDE.stand, 13.5);
    expect(t.trail.slots().map((s) => s.onScreen)).toEqual([false, false, false]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Task 20: the ride camera, occlusion and the ducks
// ---------------------------------------------------------------------------------------------------------------

/** The world's scenery and trees as createWorld builds them (without the stable, the pond and the sky: they need a canvas). */
function meadowForTest(w: number, h: number): { t: TrailWorld; rig: CameraRig; cam: THREE.PerspectiveCamera; scene: THREE.Scene } {
  const scene = new THREE.Scene();
  const scenery = new Scenery();
  buildGround(scenery);
  buildOverlays(scenery);
  buildFence(scenery);
  const hedge = { at: [] as THREE.Vector3[] };
  buildHedges(scenery, hedge);
  buildGazebo(scenery);
  buildCorner(scenery);
  buildPicnic(scenery);
  buildBeadTree(scenery);
  for (const g of signGeometry()) scenery.add(g.applyMatrix4(new THREE.Matrix4().makeTranslation(MIST.sign.x, 0, MIST.sign.z)), Scenery.regionOf(MIST.sign.x, MIST.sign.z));
  buildNest(scenery);
  buildSlide(scenery);
  buildGrowth(scenery, hedge, []);
  const t = buildTrail(scene, scenery);
  for (const m of scenery.build(material, 'scenery')) scene.add(m);
  for (const m of buildTrees(material)) scene.add(m);
  const cam = new THREE.PerspectiveCamera(FOV, w / h, 0.5, 700);
  const rig = new CameraRig(cam);
  rig.resize(w, h);
  t.attach({ scene, material, camera: cam, rig, occluders: () => occludersOf(scene) });
  scene.updateMatrixWorld(true);
  return { t, rig, cam, scene };
}

describe('the ride camera, occlusion and the ducks (Task 20)', () => {
  it('widens the follow clamp for a ride and narrows it again', () => {
    const { t, rig } = meadowForTest(1080, 810);
    let at: Vec2 = RIDE.slots[1];
    rig.follow(() => at);
    const pose = (): Vec2 => ({ x: rig.followPose().x, z: rig.followPose().z });
    expect(pose()).toEqual({ x: RIDE.slots[1].x, z: -19.5 });
    t.cameraClamp('ride');
    expect(pose()).toEqual(RIDE.slots[1]);
    at = { x: 40, z: -50 };
    expect(pose()).toEqual({ x: RIDE.clamp.maxX, z: RIDE.clamp.minZ });
    at = { x: -30, z: 20 };
    expect(pose()).toEqual({ x: RIDE.clamp.minX, z: RIDE.clamp.maxZ });
    t.cameraClamp('meadow');
    at = { x: 40, z: -50 };
    expect(pose()).toEqual({ x: 23, z: -19.5 });
  });

  it('sees her stand, both saddles and the icons\' points from the follow camera at the paddock, past the tree crown', () => {
    for (const [w, h] of [[1080, 810], [1080, 740]]) {
      const { t, rig } = meadowForTest(w, h);
      rig.follow(() => RIDE.stand);
      rig.snap();
      rig.update(0);
      // Her head (Princess Emma is 1.05 m), each mount's saddle (the back at about 0.85 m) and its icon 0.35 m above.
      const points = [new THREE.Vector3(RIDE.stand.x, 0.95, RIDE.stand.z)];
      for (const m of Object.values(RIDE.mounts)) points.push(new THREE.Vector3(m.x, 0.85, m.z), new THREE.Vector3(m.x, 1.2, m.z));
      expect(t.occluded(points), `${w}x${h}`).toEqual(points.map(() => false));
      // The check does see the grand tree: a point inside its crown, or just behind it from the camera, is hidden.
      const crown = new THREE.Vector3(19, 2.9, -7);
      expect(t.occluded([crown, new THREE.Vector3(19, 2.2, -9.5)])).toEqual([true, true]);
    }
  });

  it('frames the fork with the mount, the signpost\'s three cards and the road starts, and no kit in view', () => {
    for (const [w, h] of [[1080, 810], [1080, 740]]) {
      const { t, rig, cam } = meadowForTest(w, h);
      t.trail.dress(['sand', 'barn', 'pond']);
      void rig.frame(RIDE.forkFrame.center, RIDE.forkFrame.width, { ms: 0 });
      rig.update(0);
      cam.updateMatrixWorld();
      const screen = (p: THREE.Vector3): { x: number; y: number } => {
        const n = p.clone().project(cam);
        return { x: ((n.x + 1) / 2) * w, y: ((1 - n.y) / 2) * h };
      };
      const inside = (p: { x: number; y: number }, m: number): boolean => p.x > m && p.x < w - m && p.y > m && p.y < h - m;
      // The cards (at least 64 px high, about 200 px wide) sit on the arms' ends, clear of the edges and of each other.
      const cards = ([0, 1, 2] as const).map((i) => screen(t.trail.arm(i)));
      for (const [i, c] of cards.entries()) expect(inside(c, 110), `card ${i} at ${w}x${h}: ${c.x.toFixed(0)},${c.y.toFixed(0)}`).toBe(true);
      expect(cards[2].x - cards[0].x, `${w}x${h}`).toBeGreaterThan(220);
      expect(Math.min(cards[0].y, cards[2].y) - cards[1].y, `${w}x${h}`).toBeGreaterThan(70);
      // The mount at the fork, its rider's head (seated about 1.7 m up) and the starts of the three roads.
      for (const p of [new THREE.Vector3(RIDE.fork.x, 0, RIDE.fork.z), new THREE.Vector3(RIDE.fork.x, 1.7, RIDE.fork.z)]) expect(inside(screen(p), 40), `${w}x${h}`).toBe(true);
      for (const r of RIDE_PATHS.roads) expect(inside(screen(r.getPointAt(2.5 / r.getLength())), 20), `${w}x${h}`).toBe(true);
      // The rider's head stays below the west and east cards.
      expect(screen(new THREE.Vector3(RIDE.fork.x, 1.7, RIDE.fork.z)).y - Math.max(cards[0].y, cards[2].y), `${w}x${h}`).toBeGreaterThan(60);
      expect(t.trail.slots().map((s) => s.onScreen), `${w}x${h}`).toEqual([false, false, false]);
    }
  });

  it('swims the three ducks under the chute or at the far shore, inside the pond\'s one batch', () => {
    const d = createDucks(material);
    expect(d.mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(d.mesh.count).toBe(5);
    const spots = (): Vec2[] => [2, 3, 4].map((i) => {
      const m = new THREE.Matrix4();
      d.mesh.getMatrixAt(i, m);
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      return { x: p.x, z: p.z };
    });
    const near = (ps: Vec2[], to: readonly Vec2[]): boolean => ps.every((p, i) => dist2(p, to[i]) < 0.45);
    d.update(0.016, 1);
    expect(near(spots(), DUCK_SPOTS.chute), 'they start under the chute').toBe(true);
    d.api.set('far', 0);
    d.update(0.016, 2);
    expect(near(spots(), DUCK_SPOTS.far)).toBe(true);
    // Back under the chute over 4 s, swimming in the water all the way.
    d.api.set('chute');
    for (let k = 0; k < 300; k++) {
      d.update(1 / 60, 2 + k / 60);
      for (const p of spots()) expect(inPond(p, -0.6), `${p.x},${p.z}`).toBe(true);
    }
    expect(near(spots(), DUCK_SPOTS.chute)).toBe(true);
    // A bob is a little hop in place: they stay where they swim.
    const before = spots();
    d.api.bob();
    for (let k = 0; k < 30; k++) d.update(1 / 60, 7 + k / 60);
    expect(spots().every((p, i) => dist2(p, before[i]) < 0.3)).toBe(true);
    // The two paddling ducks of 2.3 keep their circles; every duck sits in the batch's bounds, so the batch is culled
    // where the pond is out of view (the stable at night).
    const sphere = d.mesh.boundingSphere!;
    expect(d.mesh.frustumCulled).toBe(true);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Matrix4();
      d.mesh.getMatrixAt(i, m);
      expect(sphere.distanceToPoint(new THREE.Vector3().setFromMatrixPosition(m))).toBeLessThan(-0.3);
    }
    for (const [w, h] of [[1080, 810], [1080, 740]]) {
      expect(inFrustum(framePose(STABLE_FRAME, w, h), d.mesh), `stable ${w}x${h}`).toBe(false);
      expect(inFrustum(framePose(NIGHT_SKY, w, h), d.mesh), `sky ${w}x${h}`).toBe(false);
    }
  });
});
