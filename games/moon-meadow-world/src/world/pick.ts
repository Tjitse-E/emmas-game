// What a tap hits in the world: doors (by where the ray meets the stable fronts, so every door gets its full width),
// the slide, the nest, the hay rack, the picnic and the gazebo (generous invisible shapes), the rest of the stable
// buildings (their roofs and walls count as the nearest door, so a tap there never walks her behind them), then the
// pond and the ground.
import * as THREE from 'three';
import { GAZEBO, HAY_RACK, NEST, PICNIC, SLIDE, SLIDE_CURVE, STABLE, inPond, type Vec2 } from '../layout';
import type { WorldPick } from '../contracts';

/** A tap this far in front of a lower door (on the ground) still counts as the door. */
const DOOR_APRON = 0.7;
const ROW_HALF_PICK = 3.85;
const DOOR_TOP = STABLE.upperFloorY * 2 + 0.1;
/** One stable building with its roof, eaves and the balcony ramp on its outer end. */
const BUILDING = { halfX: 3.9 + 0.8, top: STABLE.upperFloorY * 2 + 1.4, eave: 0.4 } as const;
/** The hay rack's tap box: its crib (turned a little), legs and a full heap of hay, a little wider than they are. */
const RACK_BOX = { x: 2.1, y: 1.5, z: 1.4 } as const;
/** The picnic's tap box: the rug with its tassels and the hamper, as high as the hamper's handle. */
const PICNIC_BOX = { pad: 0.1, hamper: 0.3, y: 0.55 } as const;

export interface Picker {
  pick(ray: THREE.Ray): WorldPick | null;
  ground(ray: THREE.Ray): Vec2 | null;
}

export function buildPicker(): Picker {
  const hidden = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const group = new THREE.Group();
  // The slide: a fat tube along the riders' curve covers the ladder, the platform and the chute.
  const slide = new THREE.Mesh(new THREE.TubeGeometry(SLIDE_CURVE, 24, 0.75, 6, false), hidden);
  const slideTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.4, 1.4), hidden);
  slideTop.position.set(SLIDE.top.x - 0.1, 1.7, SLIDE.top.z - 0.1);
  const nest = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, 1.3, 16), hidden);
  nest.position.set(NEST.center.x, 0.65, NEST.center.z);
  const gazebo = new THREE.Mesh(new THREE.CylinderGeometry(GAZEBO.radius + 0.1, GAZEBO.radius + 0.2, 6.2, 16), hidden);
  gazebo.position.set(GAZEBO.center.x, 3.1, GAZEBO.center.z);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(RACK_BOX.x, RACK_BOX.y, RACK_BOX.z), hidden);
  rack.position.set(HAY_RACK.center.x, RACK_BOX.y / 2, HAY_RACK.center.z);
  const { rug, hamper } = PICNIC;
  const minX = Math.min(rug.center.x - rug.halfX, hamper.x - PICNIC_BOX.hamper) - PICNIC_BOX.pad;
  const maxX = Math.max(rug.center.x + rug.halfX, hamper.x + PICNIC_BOX.hamper) + PICNIC_BOX.pad;
  const minZ = Math.min(rug.center.z - rug.halfZ, hamper.z - PICNIC_BOX.hamper) - PICNIC_BOX.pad;
  const maxZ = Math.max(rug.center.z + rug.halfZ, hamper.z + PICNIC_BOX.hamper) + PICNIC_BOX.pad;
  const picnic = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, PICNIC_BOX.y, maxZ - minZ), hidden);
  picnic.position.set((minX + maxX) / 2, PICNIC_BOX.y / 2, (minZ + maxZ) / 2);
  // The buildings: a box each from the ground to above the ridge, the eaves to the back wall. The ramps stand on the
  // outer ends, so each box reaches 0.8 m further out on that side.
  const buildings = STABLE.rows.map((r) => {
    const outer = Math.sign(r.centerX) || 1;
    const depth = STABLE.depth + BUILDING.eave * 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(BUILDING.halfX * 2 - 0.8, BUILDING.top, depth), hidden);
    box.position.set(r.centerX + outer * 0.4, BUILDING.top / 2, STABLE.frontZ + BUILDING.eave - depth / 2);
    return box;
  });
  group.add(slide, slideTop, nest, gazebo, rack, picnic, ...buildings);
  group.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const hit = new THREE.Vector3();
  const front = new THREE.Vector3();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const frontPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(STABLE.frontZ + 0.12));

  const ground = (ray: THREE.Ray): Vec2 | null => (ray.intersectPlane(groundPlane, hit) ? { x: hit.x, z: hit.z } : null);

  const door = (ray: THREE.Ray): number | null => {
    if (!ray.intersectPlane(frontPlane, front)) return null;
    // Below the ground means the ray met the yard first: allow a small apron in front of the lower doors.
    const groundHit = ground(ray);
    if (front.y < 0 && !(groundHit && groundHit.z < STABLE.frontZ + DOOR_APRON)) return null;
    if (front.y > DOOR_TOP) return null;
    for (let row = 0; row < 2; row++) {
      const dx = front.x - STABLE.rows[row].centerX;
      if (Math.abs(dx) > ROW_HALF_PICK) continue;
      const col = THREE.MathUtils.clamp(Math.round(dx / STABLE.doorWidth) + 2, 0, 4);
      const upper = front.y >= STABLE.upperFloorY;
      return row * 10 + (upper ? 6 : 1) + col;
    }
    return null;
  };

  const hits = (ray: THREE.Ray, ...objects: THREE.Object3D[]): boolean => {
    raycaster.ray.copy(ray);
    return raycaster.intersectObjects(objects, false).length > 0;
  };

  /** A tap on a roof, a side wall or a ramp: the door of that building nearest to where the ray met it. */
  const building = (ray: THREE.Ray): number | null => {
    raycaster.ray.copy(ray);
    const hit = raycaster.intersectObjects(buildings, false)[0];
    if (!hit) return null;
    const row = (buildings as THREE.Object3D[]).indexOf(hit.object);
    const col = THREE.MathUtils.clamp(Math.round((hit.point.x - STABLE.rows[row].centerX) / STABLE.doorWidth) + 2, 0, 4);
    return row * 10 + (hit.point.y >= STABLE.upperFloorY ? 6 : 1) + col;
  };

  return {
    ground,
    pick(ray) {
      const d = door(ray);
      if (d !== null) return { kind: 'door', door: d };
      if (hits(ray, slide, slideTop)) return { kind: 'slide' };
      if (hits(ray, nest)) return { kind: 'nest' };
      // The rack and the picnic come after the doors, so they can never take a door's tap.
      if (hits(ray, rack)) return { kind: 'rack' };
      if (hits(ray, picnic)) return { kind: 'picnic' };
      if (hits(ray, gazebo)) return { kind: 'gazebo' };
      const b = building(ray);
      if (b !== null) return { kind: 'door', door: b };
      const g = ground(ray);
      if (!g) return null;
      return inPond(g) ? { kind: 'pond', at: g } : { kind: 'ground', at: g };
    },
  };
}
