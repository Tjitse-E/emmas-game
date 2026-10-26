// window.__game: the test hook for the flows and for Tjitse in the console. State, every touchable thing on screen
// (ui targets and 3D targets), the answer of the open moment, and jumps between parts.
import * as THREE from 'three';
import type { UiTarget } from './ui';
import { NEST, SLIDE, SLIDE_CURVE, WILD_EGG, dist2 } from './layout';
import { audio } from './audio';
import { type Game, type Part, doorPoint, flat, isPart } from './game/game';
import { jump } from './game/level';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

/**
 * A world point and a size in metres as a screen target, when it is on screen. Taps on these find a sphere around
 * the point (herd.pick) or a picker shape, so the size is measured across the view (the camera's right and up).
 */
function target3d(g: Game, name: string, p: THREE.Vector3, sizeM: number): UiTarget | null {
  const s = g.world.toScreen(p);
  if (!s.visible) return null;
  const cam = g.world.camera;
  const right = g.world.toScreen(_w.set(1, 0, 0).applyQuaternion(cam.quaternion).multiplyScalar(sizeM / 2).add(p));
  const top = g.world.toScreen(_v.set(0, 1, 0).applyQuaternion(cam.quaternion).multiplyScalar(sizeM / 2).add(p));
  const w = Math.round(Math.abs(right.x - s.x) * 2);
  const h = Math.round(Math.abs(top.y - s.y) * 2);
  return { name, x: Math.round(s.x), y: Math.round(s.y), w, h };
}

/** Door n's tap area: its full width and storey on the stable front. */
function doorTarget(g: Game, n: number): UiTarget | null {
  const c = doorPoint(n);
  const s = g.world.toScreen(c);
  if (!s.visible) return null;
  const l = g.world.toScreen(_v.copy(c).setX(c.x - 0.75));
  const r = g.world.toScreen(_w.copy(c).setX(c.x + 0.75));
  const t = g.world.toScreen(_v.copy(c).setY(c.y + 0.97));
  const b = g.world.toScreen(_w.copy(c).setY(c.y - 0.97));
  return { name: `door ${n}`, x: Math.round(s.x), y: Math.round(s.y), w: Math.round(r.x - l.x), h: Math.round(b.y - t.y) };
}

export function installHook(g: Game): void {
  const { world, actors, layer } = g;

  const moment = () => {
    const m = layer.snapshot().moment;
    if (m) return m;
    if (g.door) {
      return { kind: 'door', phase: g.door.kind, open: g.door.open, level: g.door.level, misses: g.door.misses, answer: `door ${g.door.door}` };
    }
    return null;
  };

  const targets = (): UiTarget[] => {
    const out: (UiTarget | null)[] = [...layer.snapshot().targets];
    const p = actors.princess.position;
    out.push(target3d(g, 'princess', _v.set(p.x, p.y + 0.6, p.z).clone(), 1.0));
    for (const u of actors.herd.all()) {
      if (u.mode === 'stall') continue;
      // herd.pick takes a tap in the 3D hit sphere or within 32 px of its middle on screen, so the real tap area is
      // never under 64 px.
      const t = target3d(g, `unicorn ${u.id}`, u.hitCentre(new THREE.Vector3()), u.build.hit * 2);
      out.push(t && { ...t, w: Math.max(t.w, 64), h: Math.max(t.h, 64) });
    }
    for (let n = 1; n <= 20; n++) out.push(doorTarget(g, n));
    out.push(target3d(g, 'nest', new THREE.Vector3(NEST.center.x, 0.4, NEST.center.z), 2.4));
    if (actors.egg.visible) {
      const e = actors.egg.position.clone();
      out.push(target3d(g, dist2(flat(e), WILD_EGG.at) < 1 ? 'wild egg' : 'egg', e, 0.9));
    }
    out.push(target3d(g, 'slide', SLIDE_CURVE.getPointAt(0.62), 1.4));
    out.push(target3d(g, 'slide top', SLIDE.top.clone(), 1.2));
    if (g.goal) out.push(target3d(g, 'goal', new THREE.Vector3(g.goal.stand.x, 0, g.goal.stand.z), 1.2));
    return out.filter((t): t is UiTarget => t !== null);
  };

  const hook = {
    state() {
      const p = actors.princess;
      return {
        part: g.part,
        moment: moment(),
        princess: { x: +p.position.x.toFixed(2), z: +p.position.z.toFixed(2), mode: p.mode },
        herd: actors.herd.all().map((u) => {
          const door = g.herd.find((h) => h.id === u.id)?.door ?? g.babies.find((b) => b.unicorn === u)?.door ?? null;
          return { id: u.id, name: u.name, door, mode: u.mode, x: +u.position.x.toFixed(2), z: +u.position.z.toFixed(2) };
        }),
        followers: g.followers.list.map((u) => u.id),
        goal: g.goal?.place ?? null,
        egg: actors.egg.visible ? { x: +actors.egg.position.x.toFixed(2), z: +actors.egg.position.z.toFixed(2) } : null,
        timeOfDay: +world.timeOfDay.toFixed(2),
        stalls: [...g.stalls.keys()].sort((a, b) => a - b),
        results: g.results.lines,
      };
    },
    targets,
    /** The name of the target that answers the open moment now (a stone, a bell, a gem, the star, an item, a door). */
    answer(): string | null {
      return moment()?.answer ?? null;
    },
    /** Run the open moment's next idle step now (repeat, then the focused hint). */
    idleNow(): boolean {
      if (g.door) {
        g.door.idleNow();
        return true;
      }
      return layer.idleNow();
    },
    jump(part: string): boolean {
      if (!isPart(part)) return false;
      jump(g, part as Part);
      return true;
    },
    /** End the current timed wait (free play's two minutes, the pond's 45 s). */
    skip(): number {
      return g.run.skip();
    },
    perf() {
      return { ...world.perf(), ...actors.stats(), pixelRatio: world.renderer.getPixelRatio() };
    },
    missingClips(): string[] {
      return audio.missing.slice();
    },
    /** A world point on screen (flows tap the ground with it). */
    screenOf(x: number, z: number, y = 0) {
      return world.toScreen(new THREE.Vector3(x, y, z));
    },
  };
  (window as unknown as { __game: typeof hook }).__game = hook;
}
