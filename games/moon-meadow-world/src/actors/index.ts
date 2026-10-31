// The actors: Princess Emma, the herd, the egg and the effects, all drawn through one shared set of instanced parts.
import * as THREE from 'three';
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
  // 2.4.0: what shows only later in a play (every dress shape and its side-saddle skirt, every crown, both eggs' shells
  // and their textures, the effects' points and sprite atlas, and every empty batch of parts) is drawn in the first
  // rendered frame, shrunk to nothing, and then taken out of the scene, so three.js counts its geometry and textures
  // before the first place. The long play checks that those counts stay level from place to place. The world draws
  // nothing behind the start screen, so this waits until the world has drawn a frame with them.
  const warm = [...princess.warmables(), ...egg.warmables(), ...trailEgg.warmables(), ...fx.warmables()].map((w) => {
    const m: THREE.Mesh | THREE.Points = 'points' in w ? new THREE.Points(w.geometry, w.material) : new THREE.Mesh(w.geometry, w.material);
    m.name = 'actors-warm';
    m.matrixAutoUpdate = false;
    m.matrix.makeScale(0, 0, 0);
    m.matrixWorld.makeScale(0, 0, 0);
    m.frustumCulled = false;
    m.onAfterRender = () => void (m.userData.drawn = true);
    scene.add(m);
    return m;
  });
  parts.prime = true;

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
      // The start-up draw is done once the world has drawn a frame with it (the empty batches too, parts.prime).
      if (warm.length && warm.every((m) => m.userData.drawn)) for (const m of warm.splice(0)) scene.remove(m);
      parts.prime = warm.length > 0;
      // On a mount (2.4.0) she sits where its saddle is this frame, so the herd moves first.
      if (princess.mountedOn) {
        herd.update(dt, t, parts.camera);
        princess.update(dt, t);
      } else {
        princess.update(dt, t);
        herd.update(dt, t, parts.camera);
      }
      egg.update(dt, t);
      trailEgg.update(dt, t);
      fx.update(dt, t);
      parts.flush([princess.parts, ...herd.visibleParts(), egg.parts, trailEgg.parts, fx.parts]);
    },
  };
}
