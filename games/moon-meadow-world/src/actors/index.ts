// The actors: Princess Emma, the herd, the egg and the effects, all drawn through one shared set of instanced parts.
import type * as THREE from 'three';
import type { Actors, Vec2 } from '../contracts';
import { START } from '../layout';
import { Parts } from './parts';
import { createFx, type FxImpl } from './fx';
import { SlideQueue, type ActorDepsPlus } from './motion';
import { PrincessActor } from './princess';
import { createHerd, type HerdImpl } from './herd';
import { createEgg, type EggImpl } from './egg';

export type { PrincessActor } from './princess';
export type { UnicornActor } from './unicorn';

/** createActors' result: the contract plus a few optional extras (see notes/actors.md). */
export interface ActorsImpl extends Actors {
  readonly princess: PrincessActor;
  readonly herd: HerdImpl;
  readonly egg: EggImpl;
  readonly trailEgg: EggImpl;
  readonly fx: FxImpl;
  /** The actors' own sound effects for things only they know the timing of (slide whoosh, splashes). On by default. */
  sounds: boolean;
  /** Put Princess Emma somewhere at once, facing `heading` (0 = south), for jump(). */
  placePrincess(at: Vec2, heading?: number): void;
  /** How many unicorns were drawn in full detail, cheaply, or culled last frame. */
  stats(): { full: number; cheap: number; culled: number };
}

/**
 * `deps` may also carry the world's `heightAt` (an extra on the world), so feet stay on the nest mound; without it
 * the ground is flat at y = 0.
 */
export function createActors(scene: THREE.Scene, deps: ActorDepsPlus): ActorsImpl {
  const parts = new Parts();
  scene.add(parts.group);
  const fx = createFx(scene);
  const queue = new SlideQueue<object>();
  let sounds = true;
  const princess = new PrincessActor(scene, { deps, fx, queue, onRide: () => herd.followersRide(), sounds: () => sounds }, START);
  const herd = createHerd({ deps, fx, queue, leader: princess, scene, sounds: () => sounds }, parts.viewSize);
  const egg = createEgg(scene, fx);
  // 2.4.0: the trail's star egg, a second egg actor (2 calls and about 800 triangles, only while it shows).
  const trailEgg = createEgg(scene, fx);

  return {
    princess,
    herd,
    egg,
    trailEgg,
    fx,
    get sounds() {
      return sounds;
    },
    set sounds(on: boolean) {
      sounds = on;
    },
    placePrincess(at, heading = 0) {
      princess.place(at, heading);
    },
    stats() {
      return { ...herd.stats };
    },
    setDetail(level) {
      herd.setDetail(level);
    },
    update(dt, t) {
      princess.update(dt, t);
      herd.update(dt, t, parts.camera);
      egg.update(dt, t);
      trailEgg.update(dt, t);
      fx.update(dt, t);
      parts.flush([princess.parts, ...herd.visibleParts(), egg.parts, trailEgg.parts, fx.parts]);
    },
  };
}
