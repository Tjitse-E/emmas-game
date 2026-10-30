import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BEAD_TREE, CORNER, GAZEBO, HAY_RACK, MIST, PICNIC, RIDE, STABLE, START, doorCenter, v2, type Vec2 } from '../src/layout';
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

describe('pick: the Dressing Corner, the bead tree and the saddle sign (2.3.0)', () => {
  const at = (p: Vec2, y: number) => new THREE.Vector3(p.x, y, p.z);

  it('picks the Corner at the trunk, the mirror and the step, from her spot, the start and the picnic', () => {
    for (const from of [CORNER.stand, START, PICNIC.stand]) {
      follow(from);
      const spots = [at(CORNER.trunk, 0.25), at(CORNER.trunk, 0.6), at(CORNER.mirror, 0.4), at(CORNER.mirror, 1.2), at(CORNER.mirror, 1.7)];
      spots.push(new THREE.Vector3(CORNER.stand.x, 0.3, 1.8));
      for (const p of spots) expect(tapAt(p), `${p.x},${p.y},${p.z} from ${from.x},${from.z}`).toEqual({ kind: 'corner' });
    }
  });

  it('in the Corner frame too, and leaves her spot, the picnic and the gazebo dome as they were', () => {
    frame({ x: -14, z: 3 }, 5.5);
    expect(tapAt(at(CORNER.trunk, 0.3))).toEqual({ kind: 'corner' });
    expect(tapAt(at(CORNER.mirror, 1.1))).toEqual({ kind: 'corner' });
    for (const from of [CORNER.stand, START]) {
      follow(from);
      expect(tapAt(at(CORNER.stand, 0))?.kind).toBe('ground');
      expect(tapAt(at(PICNIC.rug.center, 0.05))).toEqual({ kind: 'picnic' });
      expect(tapAt(new THREE.Vector3(GAZEBO.center.x, 2, GAZEBO.center.z + GAZEBO.radius - 0.3))).toEqual({ kind: 'gazebo' });
    }
  });

  it('picks the bead tree at its crown, its strings and its trunk, and leaves the grass round it to walking', () => {
    for (const from of [BEAD_TREE.stand, v2(8, -6), STABLE.emmaStand]) {
      follow(from);
      for (const p of [at(BEAD_TREE.center, 2.1), at(BEAD_TREE.center, 0.5), new THREE.Vector3(BEAD_TREE.center.x, 1.1, BEAD_TREE.center.z + 0.55)]) {
        const hit = tapAt(p);
        if (hit === undefined) continue;
        expect(hit, `${p.y} from ${from.x},${from.z}`).toEqual({ kind: 'beads' });
      }
    }
    follow(BEAD_TREE.stand);
    for (const p of [BEAD_TREE.stand, BEAD_TREE.baby, v2(BEAD_TREE.center.x + 2.2, BEAD_TREE.center.z)]) expect(tapAt(at(p, 0))?.kind).toBe('ground');
  });

  it('picks the saddle sign at its board and post, and never takes a door tap', () => {
    for (const from of [MIST.signStand, v2(16, -11)]) {
      follow(from);
      for (const y of [0.4, 1.3, 1.6]) expect(tapAt(at(MIST.sign, y)), `${y} from ${from.x},${from.z}`).toEqual({ kind: 'sign' });
    }
    let seen = 0;
    for (const from of [BEAD_TREE.stand, MIST.signStand, v2(12, -12)]) {
      follow(from);
      seen += expectDoors();
    }
    expect(seen).toBeGreaterThan(10);
  });
});

describe('pick: the paddock (2.4.0)', () => {
  const at = (p: Vec2, y = 0): THREE.Vector3 => new THREE.Vector3(p.x, y, p.z);

  it('picks the paddock ground at her stand, the mounts\' spots and the back rail, from where she comes', () => {
    for (const from of [RIDE.stand, v2(16, -9), BEAD_TREE.stand]) {
      follow(from);
      for (const p of [RIDE.stand, RIDE.mounts.bella, RIDE.mounts.hazel, v2(24, -11), v2(RIDE.rail.minX + 0.2, RIDE.rail.z)]) {
        const hit = tapAt(at(p));
        if (hit === undefined) continue;
        expect(hit, `${p.x},${p.z} from ${from.x},${from.z}`).toEqual({ kind: 'paddock' });
      }
    }
    follow(RIDE.stand);
    expect(tapAt(at(RIDE.stand))).toEqual({ kind: 'paddock' });
  });

  it('leaves the grass round it to walking and the saddle sign its own', () => {
    follow(RIDE.stand);
    for (const p of [v2(RIDE.paddock.minX - 0.8, -12), v2(23, RIDE.paddock.maxZ + 0.8), v2(18, -10)]) expect(tapAt(at(p))?.kind, `${p.x},${p.z}`).toBe('ground');
    follow(MIST.signStand);
    expect(tapAt(at(MIST.sign, 1.3))).toEqual({ kind: 'sign' });
  });
});
