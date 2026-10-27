// Touch on the 3D world (the canvas; the ui root lets taps on empty space through). A tap is a press and release
// within 12 px and 600 ms; anything else is a drag, which only does something when it starts on a unicorn.
// Priority: a unicorn before the world. While a checked ui moment is open the world takes no taps; during a door
// moment a door counts as the answer, and a waiting unicorn only hops and looks at its own door.
// A tap never cuts the speech that plays: names wait their turn (sayAside).
// In free play a tap on the picnic rug or the hay rack starts that side quest when it is offered (quests.ts).
import * as THREE from 'three';
import type { Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { HAY_RACK, NEST, PICNIC, SLIDE, STABLE, WILD_EGG, dist2 } from '../layout';
import { audio } from '../audio';
import { type Game, GOALS, doorPoint, flat, memberOf, princessAt, sayAside, walkTo } from './game';
import { peekDoor } from './doors';
import { askQuest } from './quests';

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
  let press: { id: number; x: number; y: number; t: number; unicorn: UnicornActor | null; carrying: boolean; hold: ReturnType<typeof setTimeout> | null } | null = null;
  let lastWalk: { at: Vec2; t: number } | null = null;

  const momentOpen = (): boolean => layer.snapshot().moment !== null;

  /** May she pick this unicorn up now? Not during a moment, a door moment, bedtime or a cut scene. */
  const canCarry = (u: UnicornActor): boolean =>
    g.free && !g.bedtime && !g.door && !momentOpen() && !['stall', 'hatching', 'slide'].includes(u.mode);

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

  canvas.addEventListener('pointerdown', (e) => {
    if (press) return;
    const allowUnicorn = g.free && !g.door && !momentOpen();
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      unicorn: allowUnicorn ? actors.herd.pick(world.ray(e.clientX, e.clientY)) : null,
      carrying: false,
      hold: null,
    };
    // Holding still on a unicorn lifts it too.
    if (press.unicorn) press.hold = setTimeout(startCarry, TAP_MS);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Not supported: moves outside the canvas are lost, which is harmless.
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (!press.carrying && Math.hypot(e.clientX - press.x, e.clientY - press.y) > TAP_PX) startCarry();
    if (press.carrying && press.unicorn) {
      const p = carryPoint(e.clientX, e.clientY);
      if (p) press.unicorn.carryTo(p);
    }
  });

  const end = (e: PointerEvent, cancelled: boolean) => {
    if (!press || e.pointerId !== press.id) return;
    if (press.hold) clearTimeout(press.hold);
    if (press.carrying) drop(e.clientX, e.clientY);
    else if (!cancelled && Math.hypot(e.clientX - press.x, e.clientY - press.y) <= TAP_PX && performance.now() - press.t <= TAP_MS) {
      tap(e.clientX, e.clientY);
    }
    press = null;
  };
  canvas.addEventListener('pointerup', (e) => end(e, false));
  canvas.addEventListener('pointercancel', (e) => end(e, true));

  function tap(x: number, y: number): void {
    if (momentOpen()) return;
    if (g.door) {
      const p = world.pick(x, y);
      if (p?.kind === 'door') return g.door.tap(p.door);
      const u = actors.herd.pick(world.ray(x, y));
      if (u && u.mode !== 'stall') waitingHop(u);
      return;
    }
    if (!g.free) return;
    const u = actors.herd.pick(world.ray(x, y));
    if (u) return tapUnicorn(u);
    if (eggUnder(x, y)) {
      const egg = flat(actors.egg.position);
      void walkTo(g, dist2(egg, NEST.center) < 2 ? NEST.stand : WILD_EGG.stand);
      return;
    }
    const p = world.pick(x, y);
    if (!p) return;
    switch (p.kind) {
      case 'door':
        // On the way to the stable a door (or the roof) means "the stable": she walks to her bedtime spot.
        if (g.goal === GOALS.stable) return void walkTo(g, STABLE.emmaStand);
        if (!peekDoor(g, p.door)) void walkTo(g, world.nearestWalkable({ x: world.groundAt(x, y)?.x ?? 0, z: -11.4 }));
        return;
      case 'slide':
        void actors.princess.rideSlide();
        return;
      case 'nest':
        void walkTo(g, NEST.stand);
        return;
      case 'pond':
        void walkTo(g, world.nearestWalkable(p.at));
        return;
      // A side quest's place: the quest starts when it is offered; otherwise she walks to its spot.
      case 'rack':
      case 'picnic':
        if (askQuest(g, p.kind)) return;
        void walkTo(g, p.kind === 'rack' ? HAY_RACK.stand : PICNIC.stand);
        return;
      case 'gazebo':
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

  /** The egg on screen near the tap (it sits in the nest or on the grass by the pond). */
  function eggUnder(x: number, y: number): boolean {
    if (!actors.egg.visible) return false;
    const s = world.toScreen(actors.egg.position);
    return s.visible && Math.hypot(s.x - x, s.y - y) < 70;
  }

  function tapUnicorn(u: UnicornActor): void {
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
