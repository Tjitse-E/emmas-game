import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GAZEBO, HAY_RACK, PICNIC, STABLE, START, doorCenter, v2, type Vec2 } from '../src/layout';
import { CameraRig, FOV } from '../src/world/camera';
import { buildPicker } from '../src/world/pick';

const W = 1080;
const H = 810;
const picker = buildPicker();
const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 700);
const rig = new CameraRig(camera);
rig.resize(W, H);

/** Put the camera where the game puts it: following a point, or holding a frame. */
function follow(p: Vec2): void {
  rig.follow(() => p);
  rig.releaseFrame();
  rig.snap();
  rig.update(0);
  camera.updateMatrixWorld();
}
function frame(center: Vec2, width: number): void {
  void rig.frame(center, width, { ms: 0 });
  rig.update(0);
  camera.updateMatrixWorld();
}

/** A tap on the screen point of a world point, or null when that point is off screen. */
const raycaster = new THREE.Raycaster();
function tapAt(p: THREE.Vector3): ReturnType<typeof picker.pick> | undefined {
  const ndc = p.clone().project(camera);
  if (Math.abs(ndc.x) > 0.98 || Math.abs(ndc.y) > 0.98 || ndc.z > 1) return undefined;
  raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
  return picker.pick(raycaster.ray);
}

/** Every door on screen picks itself, at its plaque and near both of its sides. */
function expectDoors(): number {
  let seen = 0;
  for (let n = 1; n <= 20; n++) {
    const c = doorCenter(n);
    for (const dx of [-0.5, 0, 0.5]) {
      const hit = tapAt(new THREE.Vector3(c.x + dx, c.y, c.z));
      if (hit === undefined) continue;
      seen++;
      expect(hit, `door ${n} (${dx})`).toEqual({ kind: 'door', door: n });
    }
  }
  return seen;
}

describe('pick: the hay rack', () => {
  const crib = new THREE.Vector3(HAY_RACK.center.x, 0.8, HAY_RACK.center.z);

  it('is picked at its crib, its heap and its legs', () => {
    follow(HAY_RACK.stand);
    for (const p of [crib, new THREE.Vector3(HAY_RACK.center.x - 0.5, 1.15, HAY_RACK.center.z), new THREE.Vector3(HAY_RACK.center.x + 0.6, 0.2, HAY_RACK.center.z + 0.15)]) {
      expect(tapAt(p)).toEqual({ kind: 'rack' });
    }
  });

  it('never takes a door tap, from wherever she stands near it or the stable', () => {
    let seen = 0;
    for (const at of [HAY_RACK.stand, ...HAY_RACK.eat, v2(-10, -9.5), v2(-14, -8), STABLE.emmaStand, v2(-6, -9)]) {
      follow(at);
      seen += expectDoors();
    }
    frame({ x: 0, z: -11.6 }, 19);
    seen += expectDoors();
    expect(seen).toBeGreaterThan(60);
  });

  it('leaves the grass round it to walking', () => {
    follow(HAY_RACK.stand);
    for (const p of [v2(HAY_RACK.center.x - 2, HAY_RACK.center.z + 1), v2(HAY_RACK.center.x + 2.2, HAY_RACK.center.z), HAY_RACK.stand]) {
      expect(tapAt(new THREE.Vector3(p.x, 0, p.z))?.kind).toBe('ground');
    }
  });
});

describe('pick: the picnic', () => {
  it('is picked on the rug, the cushions and the hamper', () => {
    for (const at of [PICNIC.stand, START]) {
      follow(at);
      const spots = [PICNIC.rug.center, ...PICNIC.seats, PICNIC.hamper].map((p) => new THREE.Vector3(p.x, 0.05, p.z));
      spots.push(new THREE.Vector3(PICNIC.hamper.x, 0.4, PICNIC.hamper.z));
      for (const p of spots) expect(tapAt(p), `${p.x},${p.z} from ${at.x},${at.z}`).toEqual({ kind: 'picnic' });
    }
  });

  it('leaves Lumi\'s gazebo behind it to the gazebo, and the grass round it to walking', () => {
    let gazebo = 0;
    for (const at of [PICNIC.stand, START, v2(-14, 6)]) {
      follow(at);
      for (const y of [0.5, 2, 4, 5.3]) {
        const hit = tapAt(new THREE.Vector3(GAZEBO.center.x, y, GAZEBO.center.z + GAZEBO.radius - 0.3));
        if (hit === undefined) continue;
        gazebo++;
        expect(hit, `gazebo at ${y} from ${at.x},${at.z}`).toEqual({ kind: 'gazebo' });
      }
      const { center, halfX, halfZ } = PICNIC.rug;
      for (const p of [v2(center.x - halfX - 0.6, center.z), v2(center.x, center.z + halfZ + 0.6), PICNIC.stand]) {
        const hit = tapAt(new THREE.Vector3(p.x, 0, p.z));
        if (hit !== undefined) expect(hit?.kind, `${p.x},${p.z}`).toBe('ground');
      }
    }
    expect(gazebo).toBeGreaterThan(6);
  });
});
