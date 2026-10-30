// The trail beyond the fence (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5): the gate, the trail from the gate to the
// fork, the three roads, the clearing slots with their kit, the ride camera's clamp, the occlusion check and the ducks
// under the slide. The trail lane builds them (docs/v4/2.4-plan.md Tasks 17 to 20); step 0's stub keeps the names, so
// the game and the mount lane build on them: dress() records the words, slots() returns them off screen, arm(i) is the
// fork at card height, the gate opens at once, show() records `shown`, nothing is ever occluded, the rest does nothing.
import * as THREE from 'three';
import type { SignWord } from '../contracts';
import { RIDE } from '../layout';
import type { Scenery } from './geo';

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

export interface TrailWorld {
  readonly trail: TrailApi;
  readonly ducks: DucksApi;
  /** For each point, whether the trees or the scenery hide it from the camera. */
  occluded(points: readonly THREE.Vector3[]): boolean[];
  /** The follow camera's clamp: the meadow's, or the wide one of a ride. */
  cameraClamp(kind: 'meadow' | 'ride'): void;
  update(dt: number, t: number): void;
}

export function buildTrail(_scene: THREE.Scene, _scenery: Scenery): TrailWorld {
  let words: (SignWord | null)[] = [null, null, null];
  let shown = false;
  const trail: TrailApi = {
    dress(w) {
      words = w ? [...w] : [null, null, null];
    },
    slots: () => words.map((word) => ({ word, onScreen: false })),
    arm: () => new THREE.Vector3(RIDE.fork.x, 1.3, RIDE.fork.z),
    gate: () => Promise.resolve(),
    show(on) {
      shown = on;
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
    update() {},
  };
}
