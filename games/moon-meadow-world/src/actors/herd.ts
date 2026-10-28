// The herd: adds unicorns, runs them every frame, keeps them a little apart, lets Princess Emma's followers play when
// she stands still, decides who is drawn (and how finely), and finds the unicorn under a tap.
import * as THREE from 'three';
import type { Herd, UnicornLook, Vec2 } from '../contracts';
import { dist2 } from '../layout';
import type { PartList } from './parts';
import { UnicornActor, type HerdCtx } from './unicorn';
import { createNickers } from './sounds';

/**
 * The unicorns nearest the camera (around Princess Emma, whom it follows) get the full animation and detail (the spec
 * allows 8; 5 keeps 20 unicorns on screen inside the triangle budget). The rest pose every third frame with coarser
 * shapes and fewer curls. On a slow iPad (setDetail 1 and 2) fewer get full detail and the rest pose less often.
 */
const DETAIL = [
  { full: 5, every: 3 },
  { full: 3, every: 4 },
  { full: 2, every: 6 },
] as const;
/** A tap this close to a unicorn's hit centre on screen picks it, however far away it is (spec 7.4: 64 px targets). */
const MIN_TAP_PX = 32;

type PlayKind = 'circle' | 'hop' | 'nuzzle';

export interface HerdImpl extends Herd {
  add(o: { id: string; name: string; look: UnicornLook; at: Vec2; mode?: 'idle' | 'hatching' }): UnicornActor;
  get(id: string): UnicornActor | undefined;
  all(): UnicornActor[];
  pick(ray: THREE.Raycaster): UnicornActor | null;
  /** Take a unicorn out of the herd (the game's jump back to before a newborn hatched). */
  remove(id: string): void;
  update(dt: number, t: number, camera: THREE.Camera | null): void;
  /** The part lists of the unicorns to draw this frame. */
  visibleParts(): PartList[];
  /** Princess Emma starts a slide ride: her followers queue up behind her. */
  followersRide(): void;
  /** How many unicorns were posed in full detail last frame (for the harness). */
  readonly stats: { full: number; cheap: number; culled: number };
  /** Make the herd cheaper on a slow iPad: 0 full, 1 and 2 fewer full-detail unicorns, cheap ones posed less often. */
  setDetail(level: 0 | 1 | 2): void;
}

/** `view` is the canvas size in CSS pixels (kept up to date by the parts renderer), for the minimum tap size. */
export function createHerd(base: Omit<HerdCtx, 'toyTexture' | 'swimmers'>, view?: THREE.Vector2): HerdImpl {
  const list: UnicornActor[] = [];
  const byId = new Map<string, UnicornActor>();
  const drawn: PartList[] = [];
  const textures = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader();
  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();
  const sphere = new THREE.Sphere();
  const tmp = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const stats = { full: 0, cheap: 0, culled: 0 };
  const tapNdc = new THREE.Vector3();
  const hitNdc = new THREE.Vector3();
  /** Reused every frame: the unicorns and their squared distance to the camera, sorted in place. */
  const ranked: { u: UnicornActor; d: number }[] = [];
  const byDistance = (a: { d: number }, b: { d: number }): number => a.d - b.d;
  let detail: (typeof DETAIL)[number] = DETAIL[0];
  let frame = 0;
  let play: { kind: PlayKind; t: number; dur: number; centre: Vec2; who: UnicornActor[] } | null = null;
  let playPause = 0;

  const nickers = createNickers();
  const ctx: HerdCtx = {
    ...base,
    nicker() {
      nickers.nicker();
    },
    toyTexture(url) {
      let t = textures.get(url);
      if (!t) {
        t = loader.load(url);
        t.colorSpace = THREE.SRGBColorSpace;
        textures.set(url, t);
      }
      return t;
    },
    swimmers() {
      const out: { position: THREE.Vector3; unicorn?: UnicornActor }[] = list.filter((u) => u.isSwimming).map((u) => ({ position: u.position, unicorn: u }));
      if (base.leader.riding && base.leader.position.y < 0) out.push({ position: base.leader.position });
      return out;
    },
  };

  function followers(): UnicornActor[] {
    return list.filter((u) => u.mode === 'follow');
  }

  /** Followers play when she has stood still for 1.5 s: run in little circles, hop, or come for a nuzzle. */
  function updatePlay(dt: number): void {
    const L = ctx.leader;
    const fs = followers();
    if (L.still < 1.5 || L.riding || fs.length === 0) {
      if (play) for (const u of play.who) u.playTarget = null;
      play = null;
      playPause = 0.4;
      return;
    }
    if (!play) {
      playPause -= dt;
      if (playPause > 0) return;
      const r = Math.random();
      const kind: PlayKind = fs.length >= 2 && r < 0.45 ? 'circle' : r < 0.75 ? 'hop' : 'nuzzle';
      // Play in front of her (towards the camera) where it is easy to see.
      const centre = ctx.deps.nearestWalkable({ x: L.position.x, z: L.position.z + 1.6 });
      play = { kind, t: 0, dur: kind === 'circle' ? 3.6 : kind === 'hop' ? 1.6 : 2.6, centre, who: kind === 'nuzzle' ? [fs[Math.floor(Math.random() * fs.length)]] : fs };
      if (kind === 'hop') play.who.forEach((u, i) => setTimeout(() => void u.emote('hop'), i * 220));
    }
    play.t += dt;
    const p = play;
    if (p.kind === 'circle') {
      const n = p.who.length;
      p.who.forEach((u, i) => {
        const a = p.t * 1.9 + (i / n) * Math.PI * 2;
        u.playTarget = { x: p.centre.x + Math.cos(a) * 0.95, z: p.centre.z + Math.sin(a) * 0.7 };
        u.playSpeed = u.speeds.trot * 0.85;
      });
    } else if (p.kind === 'nuzzle') {
      const u = p.who[0];
      const side = u.position.x < L.position.x ? -1 : 1;
      const spot = { x: L.position.x + side * 0.6, z: L.position.z + 0.35 };
      u.playTarget = spot;
      u.playSpeed = u.speeds.walk;
      if (dist2(spot, { x: u.position.x, z: u.position.z }) < 0.2 && p.t < p.dur) {
        u.lookAt({ x: L.position.x, z: L.position.z });
        void u.emote('nuzzle');
        p.t = p.dur - 1.4;
        p.kind = 'hop'; // the nuzzle is playing; let it finish where it stands
        u.playTarget = null;
      }
    }
    if (p.t >= p.dur) {
      for (const u of p.who) {
        u.playTarget = null;
        u.lookAt(null);
      }
      play = null;
      playPause = 1 + Math.random() * 1.5;
    }
  }

  /** Keep unicorns on the grass a little apart from each other and from Princess Emma. */
  function separate(): void {
    const L = ctx.leader;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.onLand) continue;
      const ra = a.build.body[2] + 0.18;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.onLand) continue;
        const min = ra + b.build.body[2] + 0.18;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const d = Math.hypot(dx, dz);
        if (d >= min || d < 1e-4) continue;
        const push = (min - d) * 0.25;
        nudge(a, (-dx / d) * push, (-dz / d) * push);
        nudge(b, (dx / d) * push, (dz / d) * push);
      }
      if (!L.riding) {
        const dx = a.position.x - L.position.x;
        const dz = a.position.z - L.position.z;
        const d = Math.hypot(dx, dz);
        const min = ra + 0.42;
        if (d < min && d > 1e-4) nudge(a, (dx / d) * (min - d) * 0.5, (dz / d) * (min - d) * 0.5);
      }
    }
  }

  function nudge(u: UnicornActor, dx: number, dz: number): void {
    const p = { x: u.position.x + dx, z: u.position.z + dz };
    if (ctx.deps.isWalkable(p)) {
      u.position.x = p.x;
      u.position.z = p.z;
    }
  }

  const herd: HerdImpl = {
    stats,
    add(o: { id: string; name: string; look: UnicornLook; at: Vec2; mode?: 'idle' | 'hatching' }) {
      const old = byId.get(o.id);
      if (old) {
        old.dispose();
        list.splice(list.indexOf(old), 1);
      }
      const u = new UnicornActor(o, ctx);
      list.push(u);
      byId.set(o.id, u);
      return u;
    },
    get(id) {
      return byId.get(id);
    },
    remove(id) {
      const u = byId.get(id);
      if (!u) return;
      u.dispose();
      list.splice(list.indexOf(u), 1);
      byId.delete(id);
    },
    all() {
      return list.slice();
    },
    pick(ray) {
      // The tap's point on screen (normalised), when the ray came from a camera (world.ray does).
      const cam = ray.camera as THREE.Camera | undefined;
      const onScreen = !!cam && !!view;
      if (onScreen) tapNdc.copy(ray.ray.direction).multiplyScalar(10).add(ray.ray.origin).project(cam);
      let best: UnicornActor | null = null;
      let score = Infinity;
      for (const u of list) {
        if (u.hidden) continue;
        u.hitCentre(tmp);
        const r = u.build.hit;
        // How squarely the finger is on it: in the 3D hit sphere, or within MIN_TAP_PX of its middle on screen (so far
        // unicorns are never smaller than 64 px to tap). 1 is the edge of whichever is bigger.
        let k = ray.ray.distanceToPoint(tmp) / r;
        if (onScreen) {
          hitNdc.copy(tmp).project(cam);
          if (hitNdc.z < 1) {
            const px = Math.hypot(((hitNdc.x - tapNdc.x) * view.x) / 2, ((hitNdc.y - tapNdc.y) * view.y) / 2);
            k = Math.min(k, px / MIN_TAP_PX);
          }
        }
        if (k > 1) continue;
        // Prefer the one the finger is most squarely on; then the one nearer the camera.
        const s = k + ray.ray.origin.distanceTo(tmp) * 0.002;
        if (s < score) {
          score = s;
          best = u;
        }
      }
      return best;
    },
    setDetail(level) {
      detail = DETAIL[level] ?? DETAIL[0];
    },
    followersRide() {
      for (const u of followers()) u.rideAfterPrincess();
    },
    update(dt, t, camera) {
      nickers.tick(t);
      updatePlay(dt);
      for (const u of list) u.update(dt, t);
      separate();

      // Who is on screen, and who is near enough to Princess Emma for full detail.
      frame++;
      drawn.length = 0;
      stats.full = stats.cheap = stats.culled = 0;
      if (camera) {
        camera.updateMatrixWorld();
        pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(pv);
      }
      // Detail follows what is big on screen: the unicorns nearest the camera (or Princess Emma before the first frame).
      const eye = camera ? camPos.setFromMatrixPosition(camera.matrixWorld) : ctx.leader.position;
      ranked.length = list.length;
      for (let i = 0; i < list.length; i++) {
        const u = list[i];
        const d = (u.position.x - eye.x) ** 2 + (u.position.y - eye.y) ** 2 + (u.position.z - eye.z) ** 2;
        const e = ranked[i];
        if (e) {
          e.u = u;
          e.d = d;
        } else ranked[i] = { u, d };
      }
      ranked.sort(byDistance);
      for (let i = 0; i < ranked.length; i++) {
        const u = ranked[i].u;
        sphere.center.copy(u.hitCentre(tmp));
        sphere.radius = 1.4;
        if (u.hidden || (camera && !frustum.intersectsSphere(sphere))) {
          stats.culled++;
          continue;
        }
        const full = i < detail.full || u.mode === 'carried' || u.mode === 'slide';
        if (full || (frame + i) % detail.every === 0 || u.parts.n === 0) u.draw(full);
        if (full) stats.full++;
        else stats.cheap++;
        drawn.push(u.parts);
      }
    },
    visibleParts() {
      return drawn;
    },
  };
  return herd;
}
