// The paddock, the gate, the trail beyond it, the fork, the slots, the clearing kit, the ride camera, the occlusion
// check and the ducks (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5; docs/v4/2.4-plan.md Tasks 17 to 20).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { RIDE } from '../src/layout';
import { Scenery, type Geo } from '../src/world/geo';
import { GATE, GATE_REGION, PADDOCK_REGION, buildPaddock } from '../src/world/paddock';
import { FENCE_GAP, HEDGE_GAP, buildFence, buildHedges } from '../src/world/terrain';

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
