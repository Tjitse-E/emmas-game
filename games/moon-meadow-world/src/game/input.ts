// Touch on the 3D world (the canvas; the ui root lets taps on empty space through). A tap is a press and release
// within 12 px and 600 ms; anything else is a drag, which only does something when it starts on a unicorn.
// Priority: a unicorn before the world. While a checked ui moment is open the world takes no taps; during a door
// moment a door counts as the answer, and a waiting unicorn only hops and looks at its own door.
// A tap never cuts the speech that plays: names wait their turn (sayAside).
// In the hub (2.4.0, hub-part.ts) a tap on a place (the nest or its egg, the shore egg, the picnic rug, the hay rack,
// the bead tree, the Dressing Corner's trunk, mirror or step, the paddock, the slide) asks that place when its bubble
// shows, and so does the gazebo while the Corner's bubble shows; otherwise she walks there. A tap on the herd baby whose
// wish waits asks its wish; it is never carried and never follows. The slide runs only during a pond visit: while it
// rests a tap makes the ducks bob, and a unicorn dropped on its top lands beside the ladder. After her Corner visit the
// trunk shows its treasure board (corner.ts trunkTap); the saddle sign shimmers and Lumi says "The saddle is ready! Now
// you can ride." once a play.
// A touch is a press() (ui/press.ts): it also ends on a release only the window hears, a cancel, a lost capture or the
// next touch. On her iPad the release does not always reach the canvas, and a touch waiting for it blocked every later
// world tap. Only a real release taps; the other ends set a carried unicorn down where the finger last was.
import * as THREE from 'three';
import type { Egg3D, Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { BEAD_TREE, CORNER, HAY_RACK, MIST, NEST, PICNIC, RIDE, SLIDE, STABLE, WILD_EGG, dist2 } from '../layout';
import { audio } from '../audio';
import { press as pressable, type PressEnd } from '../ui/press';
import { type Game, GOALS, doorPoint, flat, memberOf, princessAt, sayAside, walkTo } from './game';
import { peekDoor } from './doors';
import { BESIDE_LADDER, askPlace, slideOpen, slideTap } from './hub-part';
import { trunkTap } from './corner';
import { CLIPS } from '../content';
import type { QuestId } from './options';
import { isMount, mountTap, rideTap } from './ride';

/** Where a tap on a quest's place walks her when the quest cannot start now. */
const QUEST_STAND: Record<QuestId, Vec2> = { rack: HAY_RACK.stand, picnic: PICNIC.stand, beads: BEAD_TREE.stand, corner: CORNER.stand };

const TAP_PX = 12;
const TAP_MS = 600;
const RUN_MS = 1000;
const RUN_M = 1.2;
/** A carried unicorn floats about this high, so the plane at this height keeps it under her finger. */
const CARRY_Y = 0.9;

export function installInput(g: Game): void {
  const { world, actors, layer } = g;
  const canvas = world.canvas;
  const carryPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CARRY_Y);
  const hit = new THREE.Vector3();
  let press: {
    x: number;
    y: number;
    t: number;
    /** The finger's last point: a lost capture or a cancel may come without one (0, 0). */
    lastX: number;
    lastY: number;
    unicorn: UnicornActor | null;
    carrying: boolean;
    hold: ReturnType<typeof setTimeout> | null;
  } | null = null;
  let lastWalk: { at: Vec2; t: number } | null = null;

  const momentOpen = (): boolean => layer.snapshot().moment !== null;

  /** May she pick this unicorn up now? Not during a moment, a door moment, bedtime or a cut scene. */
  const canCarry = (u: UnicornActor): boolean =>
    g.free && !g.bedtime && !g.door && !momentOpen() && !['stall', 'hatching', 'slide'].includes(u.mode) && !isMount(u) && !g.ride && u !== g.waiting;

  /** The point under the finger at carrying height (falls back to the ground). */
  const carryPoint = (x: number, y: number): Vec2 | null => {
    if (world.ray(x, y).ray.intersectPlane(carryPlane, hit)) return { x: hit.x, z: hit.z };
    return world.groundAt(x, y);
  };

  const startCarry = () => {
    if (!press || press.carrying || !press.unicorn || !canCarry(press.unicorn)) return;
    press.carrying = true;
    press.unicorn.lift();
    void audio.sfx('magic');
  };

  const drop = (x: number, y: number) => {
    if (!press?.unicorn) return;
    const u = press.unicorn;
    const p = world.pick(x, y);
    const top = world.toScreen(SLIDE.top);
    // Over the slide (or near its top on screen) counts as the top of the slide, whatever ground lies behind it.
    if (p?.kind === 'slide' || (top.visible && Math.hypot(top.x - x, top.y - y) < 90)) {
      // 2.4.0: while the slide rests it lands beside the ladder and grazes there, as a drop anywhere else does.
      if (!slideOpen(g)) {
        u.drop(BESIDE_LADDER);
        setTimeout(() => g.followers.sync(), 50);
        return;
      }
      u.drop(SLIDE.dropZone.center);
      g.followers.sync();
      return;
    }
    const at = carryPoint(x, y) ?? flat(u.position);
    u.drop(at);
    // Set down on the grass it stops following; on the slide or in the pond it comes back by itself.
    setTimeout(() => g.followers.sync(), 50);
  };

  // Any touch, on the world or on the 2D layer, counts as play (free play prompts wait for a quiet while).
  document.addEventListener('pointerdown', () => (g.lastTouch = performance.now()), { capture: true });

  const down = (e: PointerEvent) => {
    const allowUnicorn = g.free && !g.door && !momentOpen();
    press = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      lastX: e.clientX,
      lastY: e.clientY,
      unicorn: allowUnicorn ? actors.herd.pick(world.ray(e.clientX, e.clientY)) : null,
      carrying: false,
      hold: null,
    };
    // Holding still on a unicorn lifts it too.
    if (press.unicorn) press.hold = setTimeout(startCarry, TAP_MS);
  };

  const move = (e: PointerEvent) => {
    if (!press) return;
    press.lastX = e.clientX;
    press.lastY = e.clientY;
    if (!press.carrying && Math.hypot(e.clientX - press.x, e.clientY - press.y) > TAP_PX) startCarry();
    if (press.carrying && press.unicorn) {
      const p = carryPoint(e.clientX, e.clientY);
      if (p) press.unicorn.carryTo(p);
    }
  };

  const end = (e: PointerEvent, how: PressEnd) => {
    if (!press) return;
    if (press.hold) clearTimeout(press.hold);
    // 'other': `e` is the next touch, not this finger. A cancel or a lost capture has no point to trust either.
    const up = how === 'up';
    const x = up ? e.clientX : press.lastX;
    const y = up ? e.clientY : press.lastY;
    if (press.carrying) drop(x, y);
    else if (up && Math.hypot(x - press.x, y - press.y) <= TAP_PX && performance.now() - press.t <= TAP_MS) tap(x, y);
    press = null;
  };
  pressable(canvas, { down, move, end });

  function tap(x: number, y: number): void {
    if (momentOpen()) return;
    if (g.door) {
      const p = world.pick(x, y);
      if (p?.kind === 'door') return g.door.tap(p.door);
      const u = actors.herd.pick(world.ray(x, y));
      if (u && u.mode !== 'stall') waitingHop(u);
      return;
    }
    // 2.4.0: while riding, the mount, its followers and the trail egg take the taps (ride.ts); the ground none.
    if (g.ride) return rideTap(g, x, y);
    if (!g.free) return;
    const u = actors.herd.pick(world.ray(x, y));
    if (u) return tapUnicorn(u);
    const tapped = eggUnder(x, y);
    if (tapped === actors.egg) {
      const nest = dist2(flat(actors.egg.position), NEST.center) < 2;
      if (askPlace(g, nest ? 'egg' : 'shore')) return;
      void walkTo(g, nest ? NEST.stand : WILD_EGG.stand);
      return;
    }
    // The trail egg shows only on a ride, which takes its taps above.
    if (tapped) return;
    const p = world.pick(x, y);
    if (!p) return;
    switch (p.kind) {
      case 'door':
        // On the way to the stable a door (or the roof) means "the stable": she walks to her bedtime spot.
        if (g.goal === GOALS.stable) return void walkTo(g, STABLE.emmaStand);
        if (!peekDoor(g, p.door)) void walkTo(g, world.nearestWalkable({ x: world.groundAt(x, y)?.x ?? 0, z: -11.4 }));
        return;
      case 'slide':
        slideTap(g);
        return;
      case 'nest':
        if (askPlace(g, 'egg')) return;
        void walkTo(g, NEST.stand);
        return;
      case 'paddock':
        // While the ride's bubble shows the paddock asks the ride; otherwise she walks to her stand there.
        if (askPlace(g, 'ride')) return;
        void walkTo(g, world.nearestWalkable(RIDE.stand));
        return;
      case 'pond':
        void walkTo(g, world.nearestWalkable(p.at));
        return;
      // A gift quest's place: it starts when its bubble shows; otherwise she walks to its spot.
      case 'corner':
        // After her visit the trunk opens on her treasure board; it never starts the Corner again.
        if (!g.bedtime && trunkTap(g)) return;
      // falls through
      case 'rack':
      case 'picnic':
      case 'beads':
        if (askPlace(g, p.kind)) return;
        void walkTo(g, QUEST_STAND[p.kind]);
        return;
      case 'sign':
        signTap();
        return;
      case 'gazebo':
        // While the trunk bubble shows, the gazebo means the Dressing Corner at its step.
        if (askPlace(g, 'corner')) return;
      // falls through
      case 'ground': {
        const at = p.kind === 'ground' ? p.at : world.groundAt(x, y);
        if (!at) return;
        const now = performance.now();
        const run = !!lastWalk && now - lastWalk.t < RUN_MS && dist2(lastWalk.at, at) < RUN_M;
        lastWalk = { at, t: now };
        actors.fx.sparkle(new THREE.Vector3(at.x, 0.15, at.z), { count: 5, colour: '#fff6c0' });
        void walkTo(g, at, run);
        return;
      }
    }
  }

  /**
   * The saddle sign at the moon mist (2.3.0): it shimmers with a sparkle and Lumi says "Soon you can ride here!" once
   * a play (never over a line that plays). She does not walk there: a big tree stands between the follow camera and
   * the sign, and the sign is only a look ahead.
   */
  function signTap(): void {
    g.quests.signs++;
    world.sign.shimmer();
    actors.fx.sparkle(new THREE.Vector3(MIST.sign.x, 1.7, MIST.sign.z + 0.1), { count: 14, colour: '#e6dcff' });
    if (!g.quests.signSaid && !audio.speaking) {
      g.quests.signSaid = true;
      void g.layer.lumi.speak(CLIPS.soon);
    }
  }

  /** The egg on screen near the tap: the home egg (in the nest or on the grass by the pond) or the trail egg (2.4.0). */
  function eggUnder(x: number, y: number): Egg3D | null {
    for (const e of [actors.egg, actors.trailEgg]) {
      if (!e?.visible) continue;
      const s = world.toScreen(e.position);
      if (s.visible && Math.hypot(s.x - x, s.y - y) < 70) return e;
    }
    return null;
  }

  function tapUnicorn(u: UnicornActor): void {
    if (isMount(u)) return mountTap(g, u);
    // The herd baby whose wish waits: a tap asks its wish; it never follows while it waits.
    if (u === g.waiting) {
      void u.emote('hop');
      askPlace(g, 'wish');
      return;
    }
    if (u.mode === 'stall') {
      const door = [...g.stalls].find(([, x]) => x === u)?.[0];
      if (door !== undefined) peekDoor(g, door);
      return;
    }
    void u.emote('hop');
    const m = memberOf(g, u.id);
    if (m) {
      g.layer.tag(m.name, () => world.toScreen(u.headTop()), 2500);
      sayAside(m.clip);
    }
    u.lookAt(princessAt(g));
    setTimeout(() => u.lookAt(null), 1200);
    if (g.bedtime || u.mode === 'hatching') return;
    g.followers.add(u);
  }

  /** During a door moment: a waiting unicorn hops and looks at its own door (no speech, the goal is playing). */
  function waitingHop(u: UnicornActor): void {
    void u.emote('hop');
    const door = memberOf(g, u.id)?.door;
    if (door === undefined) return;
    u.lookAt(flat(doorPoint(door)));
    setTimeout(() => u.lookAt(null), 1800);
  }
}
