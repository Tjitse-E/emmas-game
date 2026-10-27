// A fixed run of Princess Emma for the actor tests: idle, a blink, walking, running, every v3 emote, the crown and a
// slide ride into the pond. Math.random must be stubbed by the caller so blinks and look-arounds repeat.
import * as THREE from 'three';
import { SlideQueue } from '../src/actors/motion';
import { PrincessActor } from '../src/actors/princess';
import type { FxImpl } from '../src/actors/fx';
import type { Vec2 } from '../src/contracts';

/** An fx stub: the princess only calls it for sparkles, splashes and ripples. */
export const fxStub = { sparkle() {}, hearts() {}, splash() {}, ripple() {}, starfall: async () => {}, moonbeam: async () => {} } as unknown as FxImpl;

export function makePrincess(at: Vec2 = { x: -9, z: 3 }): PrincessActor {
  return new PrincessActor(
    new THREE.Scene(),
    {
      deps: { route: (_a, b) => [b], isWalkable: () => true, nearestWalkable: (q) => q },
      fx: fxStub,
      queue: new SlideQueue<object>(),
      onRide() {},
      sounds: () => false,
    },
    at,
  );
}

export interface Snap {
  label: string;
  /** Per part: the batch id, the 16 matrix elements, the colour and the extra. */
  parts: number[][];
}

export function snapParts(p: PrincessActor): number[][] {
  const L = p.parts;
  const out: number[][] = [];
  for (let i = 0; i < L.n; i++) {
    const row = [L.id[i]];
    for (let j = 0; j < 16; j++) row.push(L.mat[i * 16 + j]);
    row.push(L.col[i * 3], L.col[i * 3 + 1], L.col[i * 3 + 2], L.ext[i]);
    out.push(row);
  }
  return out;
}

/** Run the fixed scenario and hand a snapshot to `take` at each labelled moment. */
export async function scenario(p: PrincessActor, take: (label: string) => void): Promise<void> {
  const dt = 1 / 60;
  let t = 0;
  const run = (s: number) => {
    for (let k = 0; k < Math.round(s / dt); k++) {
      t += dt;
      p.update(dt, t);
    }
  };
  run(0.5);
  take('idle');
  run(1.6);
  take('blink');
  void p.walkTo([{ x: -4, z: 3 }]);
  run(0.4);
  take('walk');
  void p.walkTo([{ x: -9, z: 6 }], { run: true });
  run(0.5);
  take('run');
  run(3);
  for (const e of ['wave', 'clap', 'jump', 'twirl'] as const) {
    void p.emote(e);
    run(0.5);
    take(e);
    run(1.6);
  }
  p.crown(true);
  run(1);
  take('crown');
  void p.rideSlide();
  for (let k = 0; k < 4000 && p.mode !== 'slide'; k++) run(dt);
  run(0.3);
  take('slide');
  for (let k = 0; k < 4000 && p.mode !== 'swim'; k++) run(dt);
  run(1);
  take('swim');
}
