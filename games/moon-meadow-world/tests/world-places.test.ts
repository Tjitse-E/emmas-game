import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HAY_RACK, PICNIC, START } from '../src/layout';
import { Scenery, type Geo } from '../src/world/geo';
import { CRIB, hayDepth, hayGeometry, rackGeometry } from '../src/world/hayrack';
import { buildPicnic, picnicHeight } from '../src/world/places';

const triangles = (g: Geo): number => (g.index ? g.index.count : g.attributes.position.count) / 3;

/** Collect what a build adds to the scenery, with the region it asks for. */
function collect(build: (s: Scenery) => void): { geo: Geo; region?: string }[] {
  const out: { geo: Geo; region?: string }[] = [];
  build({ add: (geo: Geo, region?: string) => out.push({ geo, region }) } as unknown as Scenery);
  return out;
}

describe('the royal picnic', () => {
  const parts = collect(buildPicnic);

  it('costs about 900 triangles and goes into one scenery region (no draw call of its own)', () => {
    const tris = parts.reduce((s, p) => s + triangles(p.geo), 0);
    expect(tris).toBeGreaterThan(600);
    expect(tris).toBeLessThan(1100);
    const region = Scenery.regionOf(PICNIC.rug.center.x, PICNIC.rug.center.z);
    for (const p of parts) expect(p.region).toBe(region);
  });

  it('stays on and around the rug, low enough to see over', () => {
    const { center, halfX, halfZ } = PICNIC.rug;
    const v = new THREE.Vector3();
    for (const { geo } of parts) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        expect(v.x).toBeGreaterThan(center.x - halfX - 0.3);
        expect(v.x).toBeLessThan(Math.max(center.x + halfX, PICNIC.hamper.x + 0.4) + 0.3);
        expect(Math.abs(v.z - center.z)).toBeLessThan(halfZ + 0.3);
        // The tassels sink a little into the grass.
        expect(v.y).toBeGreaterThanOrEqual(-0.03);
        expect(v.y).toBeLessThan(0.6);
      }
    }
  });

  it('lifts guests onto the rug and their cushions, and nowhere else', () => {
    const { center, halfX, halfZ } = PICNIC.rug;
    expect(picnicHeight(START.x, START.z)).toBe(0);
    expect(picnicHeight(PICNIC.stand.x, PICNIC.stand.z)).toBe(0);
    expect(picnicHeight(center.x + halfX + 0.05, center.z)).toBe(0);
    const rug = picnicHeight(center.x, center.z + halfZ - 0.1);
    expect(rug).toBeGreaterThan(0.01);
    expect(rug).toBeLessThan(0.04);
    for (const s of PICNIC.seats) {
      const h = picnicHeight(s.x, s.z);
      expect(h).toBeGreaterThan(0.08);
      expect(h).toBeLessThan(0.15);
    }
    for (let x = center.x - halfX; x <= center.x + halfX; x += 0.05) {
      for (let z = center.z - halfZ; z <= center.z + halfZ; z += 0.05) {
        const h = picnicHeight(x, z);
        expect(Number.isFinite(h)).toBe(true);
        expect(h).toBeLessThan(0.15);
      }
    }
  });
});

describe('the hay rack', () => {
  it('costs about 700 triangles or less and stays inside its obstacle circle', () => {
    const parts = rackGeometry();
    expect(parts.reduce((s, g) => s + triangles(g), 0)).toBeLessThanOrEqual(700);
    for (const g of parts) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        expect(Math.hypot(pos.getX(i), pos.getZ(i))).toBeLessThan(HAY_RACK.radius + 0.05);
        // The slanted legs' square ends sink a little into the grass.
        expect(pos.getY(i)).toBeGreaterThanOrEqual(-0.05);
      }
    }
  });

  it('keeps the hay mesh small and inside the crib at every fill', () => {
    const hay = hayGeometry();
    expect(triangles(hay)).toBeLessThan(800);
    const { y0, y1, halfL, bottom, top } = CRIB;
    const pos = hay.attributes.position;
    for (const f of [0.05, 0.25, 0.5, 0.75, 1]) {
      for (let i = 0; i < pos.count; i++) {
        // The mesh stands on the crib's inner bottom and scales (1, f, hayDepth(f)).
        const y = y0 + 0.01 + pos.getY(i) * f;
        const z = pos.getZ(i) * hayDepth(f);
        expect(y).toBeGreaterThan(y0 - 0.01);
        expect(Math.abs(pos.getX(i))).toBeLessThan(halfL);
        // Below the rim (straws may lean out over it) the hay stays inside the slanted walls' planks.
        if (y < y1 - 0.05) expect(Math.abs(z), `fill ${f} at y ${y.toFixed(2)}`).toBeLessThan(bottom + ((top - bottom) * (y - y0)) / (y1 - y0) + 0.03);
      }
    }
  });

  it('gets wider (deeper) hay as it fills, up to the crib top', () => {
    expect(hayDepth(0)).toBeCloseTo(CRIB.bottom / CRIB.top, 6);
    expect(hayDepth(1)).toBeCloseTo(1, 6);
    expect(hayDepth(0.5)).toBeGreaterThan(hayDepth(0.25));
  });

  it('stands where the layout says, clear of the stand and the eat spots', () => {
    for (const p of [HAY_RACK.stand, ...HAY_RACK.eat]) {
      expect(Math.hypot(p.x - HAY_RACK.center.x, p.z - HAY_RACK.center.z)).toBeGreaterThan(HAY_RACK.radius);
    }
  });
});
