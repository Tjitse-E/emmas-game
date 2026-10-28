// One unicorn's behaviour: a task (idle, graze, walk, follow, slide, swim, carried, stall, hatching) moves it about,
// an emote plays on top, and the pose for drawing is worked out from both every frame.
import * as THREE from 'three';
import type { Unicorn, UnicornEmote, UnicornLook, UnicornMode, Vec2 } from '../contracts';
import { POND, SLIDE, dist2, doorFront, doorIsUpper, inPond, pondSpot, stallSpot } from '../layout';
import { slideSounds } from './sounds';
import type { Beam, FxImpl } from './fx';
import type { Leader } from './princess';
import { PartList, Xf } from './parts';
import {
  RouteWalker, SlideQueue, type ActorDepsPlus, damp, exitLanding, followTarget, headingOf, keepInPond, lineWalkable, nearestExit, queueSpot, turnTowards, wrap,
} from './motion';
import { CLIMB_SPEED, CURVE_LEN, SEAT_U, SLIDE_V0, slideAt, slideDir, slideStep } from './ride';
import { BUILDS, type Build, type Coat, type Pose, coatOf, drawUnicorn, headMatrix, restPose } from './unicornBody';

export interface HerdCtx {
  deps: ActorDepsPlus;
  fx: FxImpl;
  queue: SlideQueue<object>;
  leader: Leader;
  scene: THREE.Scene;
  sounds(): boolean;
  /** A baby's happy nicker (the herd keeps it rare and out of checked moments). */
  nicker?(): void;
  /** Everyone in the water, to splash. */
  swimmers(): { position: THREE.Vector3; unicorn?: UnicornActor }[];
  toyTexture(url: string): THREE.Texture;
}

type Then = 'follow' | 'graze';
type SlideStage = 'line' | 'ladder' | 'climb' | 'top' | 'sit' | 'slide';
type Task =
  | { kind: 'idle' }
  | { kind: 'hatching'; t: number }
  | { kind: 'graze'; home: Vec2; wait: number; target: Vec2 | null; nibble: boolean }
  | { kind: 'walk'; walker: RouteWalker; trot: boolean; done: (ok: boolean) => void }
  | { kind: 'follow'; walker: RouteWalker | null; replan: number }
  | {
      kind: 'slide'; stage: SlideStage; t: number; u: number; v: number; walker: RouteWalker | null; spot: Vec2 | null;
      resolve: () => void; short: boolean;
    }
  | {
      kind: 'swim'; stage: 'shore' | 'in' | 'paddle' | 'exit' | 'out'; t: number; until: number; target: Vec2; splashIn: number;
      ripple: number; from: THREE.Vector3; exit: Vec2; walker: RouteWalker | null;
    }
  | { kind: 'carried'; target: Vec2; beam: Beam; land: Landing | null }
  | {
      kind: 'stall'; door: number; stage: 'walk' | 'in' | 'turn' | 'inside'; walker: RouteWalker | null; t: number;
      from: THREE.Vector3; to: THREE.Vector3; beam: Beam | null; resolve: () => void;
    };

interface Landing {
  t: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  outcome: 'slide' | 'pond' | 'ground';
}

const EMOTE_TIME: Record<UnicornEmote, number> = {
  hop: 0.7, nuzzle: 1.4, shake: 1.1, munch: 1.6, happy: 1.2, shiver: 1.2, look: 1.8, yawn: 1.6,
};
const CARRY_HEIGHT = 1.0;
const SWIM_DEPTH: Record<'baby' | 'foal', number> = { baby: 0.3, foal: 0.42 };
/**
 * Peeking in a lower stall it stands this far forward of its stall spot (0.3 m behind the door): further back, the
 * balcony and the arch over the door hide its face from the raised camera. Upper stalls have no balcony above them.
 */
const PEEK_FORWARD_LOWER = 0.45;
/** And on a straw bed this much higher, so the muzzle clears the half door as well. */
const PEEK_LIFT_LOWER = 0.18;
/** The bath toy picture's size in metres. */
const TOY_SIZE = 0.5;
/** A picture it wears on its head (the dress-up wish): a little smaller, so its face stays clear. */
const WEAR_SIZE = 0.4;

export type Speeds = { readonly graze: number; readonly walk: number; readonly trot: number; readonly gallop: number; readonly swim: number };
/** Walking speeds in m/s; foals are a little quicker. */
function speedsOf(look: UnicornLook): Speeds {
  const k = look.stage === 'foal' ? 1.15 : 1;
  return { graze: 0.45 * k, walk: 1.15 * k, trot: 2.3 * k, gallop: 5.0 * k, swim: 0.55 * k };
}
/** Where the head shows over the door of stall n while peeking (its feet). */
function peekSpot(door: number): THREE.Vector3 {
  const s = stallSpot(door);
  if (!doorIsUpper(door)) s.z += PEEK_FORWARD_LOWER;
  return s;
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

export class UnicornActor implements Unicorn {
  readonly id: string;
  name: string;
  readonly position = new THREE.Vector3();
  readonly parts = new PartList(80);
  readonly pose: Pose = restPose();
  build: Build;
  coat: Coat;
  /** Walking speeds for its look (worked out once, not every frame). */
  speeds: Speeds;
  /** The follow slot it keeps between rides and swims, or null. */
  followSlot: number | null = null;
  /** Set by the herd while the followers play: a point to run to, or null. */
  playTarget: Vec2 | null = null;
  playSpeed = 0;
  yaw = 0;
  speed = 0;

  private _look: UnicornLook;
  private readonly ctx: HerdCtx;
  private task: Task = { kind: 'idle' };
  private emoteNow: { kind: UnicornEmote; t: number; resolve: () => void } | null = null;
  private desiredYaw = 0;
  private lookTarget: Vec2 | null = null;
  private peekOn = true;
  private cap = false;
  private blinkIn = rand(1, 4);
  private blinkLeft = 0;
  private earIn = rand(1, 4);
  private earLeft = 0;
  private earSide = 1;
  private swishIn = rand(2, 5);
  private swish = 0;
  private height = 0;
  private depth = 0;
  private bed = 0;
  private tuck = 0;
  /** The toy on show, or null. */
  private toy: THREE.Sprite | null = null;
  /**
   * Its toy sprite, kept between toys: disposing the material would let three.js delete the sprite's shader program,
   * and the next toy would link it again (main.ts compiles it once at boot).
   */
  private toySprite: THREE.Sprite | null = null;
  /** Where the toy is: on the grass (or bobbing in the water) or worn on its head. */
  private toyOn: 'ground' | 'head' = 'ground';
  /** A command given in the water, done once it has climbed out. */
  private afterSwim: Task | null = null;

  constructor(o: { id: string; name: string; look: UnicornLook; at: Vec2; mode?: 'idle' | 'hatching' }, ctx: HerdCtx) {
    this.id = o.id;
    this.name = o.name;
    this.ctx = ctx;
    this._look = o.look;
    this.build = BUILDS[o.look.stage];
    this.coat = coatOf(o.look);
    this.speeds = speedsOf(o.look);
    this.position.set(o.at.x, 0, o.at.z);
    this.pose.phase = Math.random() * 10;
    if (o.mode === 'hatching') {
      this.task = { kind: 'hatching', t: 0 };
      this.tuck = 1;
    }
  }

  /** A new look recolours and resizes it at once (the level gives a new baby its colours). */
  get look(): UnicornLook {
    return this._look;
  }
  set look(look: UnicornLook) {
    this._look = look;
    this.build = BUILDS[look.stage];
    this.coat = coatOf(look);
    this.speeds = speedsOf(look);
  }

  get mode(): UnicornMode {
    const t = this.task;
    switch (t.kind) {
      case 'idle':
      case 'graze':
      case 'walk':
      case 'follow':
      case 'hatching':
        return t.kind;
      case 'slide':
        return 'slide';
      case 'swim':
        return 'swim';
      case 'carried':
        return 'carried';
      case 'stall':
        return t.stage === 'walk' ? 'walk' : 'stall';
    }
  }

  get isSwimming(): boolean {
    return this.task.kind === 'swim' && this.task.stage !== 'out';
  }

  /** On the grass and free to be nudged apart from the others. */
  get onLand(): boolean {
    const k = this.task.kind;
    return k === 'idle' || k === 'graze' || k === 'follow' || k === 'walk' || (k === 'slide' && (this.task.stage === 'line' || this.task.stage === 'ladder'));
  }

  // --- the contract ---------------------------------------------------------------------------------------------

  headTop(out = new THREE.Vector3()): THREE.Vector3 {
    this.syncPose();
    headMatrix(this.pose, this.build, _hm);
    const R = this.build.headR;
    return out.set(0, R * 1.62, R * 0.45).applyMatrix4(_hm);
  }

  goTo(route: Vec2[], o: { trot?: boolean } = {}): Promise<boolean> {
    this.followSlot = null;
    return new Promise((resolve) => {
      const walker = new RouteWalker(route, this.flat());
      if (walker.done) {
        this.setTask({ kind: 'idle' });
        resolve(true);
        return;
      }
      this.setTask({ kind: 'walk', walker, trot: !!o.trot, done: resolve });
    });
  }

  follow(slot: number): void {
    this.followSlot = slot;
    if (this.task.kind === 'follow') return;
    this.setTask({ kind: 'follow', walker: null, replan: 0 });
  }

  graze(home: Vec2): void {
    this.followSlot = null;
    this.setTask({ kind: 'graze', home: { ...home }, wait: rand(0.3, 2), target: null, nibble: false });
  }

  rideSlide(): Promise<void> {
    return this.startSlide(false);
  }

  /** Join the slide queue behind Princess Emma, ride, swim a short while, then follow her again. */
  rideAfterPrincess(): void {
    void this.startSlide(true);
  }

  swim(): void {
    if (this.task.kind === 'swim') return;
    if (inPond(this.flat(), -0.2)) return this.startSwim(rand(6, 12));
    // Not in the water yet: walk to the nearest shore, then hop in.
    const water = keepInPond(this.flat(), 0.9);
    const shore = this.ctx.deps.nearestWalkable({ x: water.x + (water.x - POND.center.x) * 0.2, z: water.z + (water.z - POND.center.z) * 0.2 });
    this.setTask({
      kind: 'swim', stage: 'shore', t: 0, until: rand(6, 12), target: water, splashIn: rand(2, 4), ripple: 0, from: new THREE.Vector3(),
      exit: nearestExit(water), walker: new RouteWalker(this.ctx.deps.route(this.flat(), shore), this.flat()),
    });
  }

  lift(): void {
    if (this.task.kind === 'carried') return;
    const beam = this.ctx.fx.beam(this.position, 0.5);
    this.setTask({ kind: 'carried', target: this.flat(), beam, land: null });
    this.height = Math.max(this.height, 0);
  }

  carryTo(p: Vec2): void {
    if (this.task.kind === 'carried' && !this.task.land) this.task.target = { ...p };
  }

  drop(p: Vec2): void {
    const t = this.task;
    if (t.kind !== 'carried' || t.land) return;
    const from = this.position.clone().setY(this.position.y + this.height);
    let outcome: Landing['outcome'];
    const to = new THREE.Vector3();
    if (dist2(p, SLIDE.dropZone.center) < SLIDE.dropZone.radius) {
      outcome = 'slide';
      slideAt(SEAT_U, to);
      this.ctx.queue.takeTop(this);
    } else if (inPond(p, -0.3)) {
      outcome = 'pond';
      const q = keepInPond(p, 0.6);
      to.set(q.x, POND.waterY, q.z);
    } else {
      outcome = 'ground';
      const q = this.ctx.deps.nearestWalkable(p);
      to.set(q.x, 0, q.z);
    }
    if (outcome === 'ground') this.followSlot = null;
    this.height = 0;
    this.position.copy(from);
    t.land = { t: 0, from, to, outcome };
  }

  enterStall(door: number): Promise<void> {
    this.followSlot = null;
    return new Promise((resolve) => {
      const route = this.ctx.deps.route(this.flat(), doorFront(door));
      this.setTask({
        kind: 'stall', door, stage: 'walk', walker: new RouteWalker(route, this.flat()), t: 0, from: new THREE.Vector3(),
        to: stallSpot(door), beam: null, resolve,
      });
      this.peekOn = true;
    });
  }

  /** Optional extra: put it straight into stall `door` (no walk), facing out, peeking or not. */
  putInStall(door: number, peek = true): void {
    this.followSlot = null;
    const spot = stallSpot(door);
    this.setTask({ kind: 'stall', door, stage: 'inside', walker: null, t: 0, from: spot.clone(), to: spot, beam: null, resolve: () => {} });
    this.position.copy(peek ? peekSpot(door) : spot);
    if (!peek) this.position.z -= 0.5;
    this.yaw = this.desiredYaw = 0;
    this.peekOn = peek;
    this.bed = peek ? this.build.bed + (doorIsUpper(door) ? 0 : PEEK_LIFT_LOWER) : 0;
    this.tuck = peek ? 0 : 1;
  }

  peek(on: boolean): void {
    this.peekOn = on;
  }

  nightcap(on: boolean): void {
    this.cap = on;
  }

  lookAt(p: Vec2 | null): void {
    this.lookTarget = p ? { ...p } : null;
  }

  emote(kind: UnicornEmote): Promise<void> {
    this.emoteNow?.resolve();
    if (kind === 'happy' || kind === 'nuzzle') this.ctx.fx.hearts(this.headTop(_v).setY(_v.y - 0.1));
    if ((kind === 'hop' || kind === 'happy') && this.look.stage === 'baby' && this.ctx.sounds()) this.ctx.nicker?.();
    return new Promise((resolve) => (this.emoteNow = { kind, t: 0, resolve }));
  }

  /**
   * A picture next to it on the grass or in the water (the bath wish), or with `on: 'head'` worn on top of its head
   * (the dress-up wish's 'wear'): it sits on the head between the ears, behind the horn, and moves with every nod.
   */
  showToy(url: string | null, o: { on?: 'ground' | 'head'; tint?: string } = {}): void {
    if (this.toy) this.ctx.scene.remove(this.toy);
    this.toy = null;
    if (!url) return;
    this.toyOn = o.on ?? 'ground';
    if (!this.toySprite) {
      this.toySprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      this.toySprite.name = 'actors-toy';
      this.toySprite.renderOrder = 3;
    }
    const toy = this.toySprite;
    toy.material.map = this.ctx.toyTexture(url);
    // A greyscale picture's tint is the material colour, which the sprite shader multiplies with the picture (as v3's
    // multiply in CSS). Colour and map are uniforms: every toy, tinted or not, uses the one sprite program.
    toy.material.color.set(o.tint ?? '#ffffff');
    toy.scale.setScalar(this.toyOn === 'head' ? WEAR_SIZE : TOY_SIZE);
    this.toy = toy;
    this.ctx.scene.add(toy);
  }

  // --- task plumbing ---------------------------------------------------------------------------------------------

  private flat(): Vec2 {
    return { x: this.position.x, z: this.position.z };
  }

  private setTask(next: Task): void {
    const t = this.task;
    // In the water, a command for the grass waits until it has swum to the shore and climbed out.
    if (t.kind === 'swim' && (t.stage === 'paddle' || t.stage === 'exit') && next.kind !== 'carried') {
      if (this.afterSwim) release(this.afterSwim, this.ctx);
      this.afterSwim = next;
      if (t.stage === 'paddle') {
        t.stage = 'exit';
        t.exit = nearestExit(this.flat());
      }
      return;
    }
    release(t, this.ctx, this);
    if (this.afterSwim) {
      release(this.afterSwim, this.ctx);
      this.afterSwim = null;
    }
    // Leaving the beam or the stall by command: stand on the nearest walkable ground.
    if ((t.kind === 'carried' || t.kind === 'stall') && next.kind !== 'carried' && next.kind !== 'stall') {
      const q = this.ctx.deps.nearestWalkable(this.flat());
      this.position.set(q.x, 0, q.z);
    }
    if (t.kind === 'stall') this.bed = 0;
    this.task = next;
  }

  /** A task that waited for the climb out starts from the shore: walks get a fresh route from here. */
  private resume(next: Task): Task {
    const here = this.flat();
    if (next.kind === 'walk' && next.walker.end) next.walker = new RouteWalker(this.ctx.deps.route(here, next.walker.end), here);
    if (next.kind === 'stall' && next.stage === 'walk') next.walker = new RouteWalker(this.ctx.deps.route(here, doorFront(next.door)), here);
    if (next.kind === 'slide') this.ctx.queue.join(this);
    return next;
  }

  private startSlide(short: boolean): Promise<void> {
    const t = this.task;
    if (t.kind === 'slide') return new Promise((resolve) => this.chain(resolve));
    return new Promise((resolve) => {
      this.setTask({ kind: 'slide', stage: 'line', t: 0, u: 0, v: 0, walker: null, spot: null, resolve, short });
      // Still in the water, it joins the line once it has climbed out (resume).
      if (this.task.kind === 'slide') this.ctx.queue.join(this);
    });
  }

  private chain(fn: () => void): void {
    const t = this.task;
    if (t.kind !== 'slide') return fn();
    const prev = t.resolve;
    t.resolve = () => {
      prev();
      fn();
    };
  }

  private startSwim(seconds: number): void {
    const here = this.flat();
    this.task = {
      kind: 'swim', stage: 'paddle', t: 0, until: seconds, target: pondSpot(Math.random, 1.2), splashIn: rand(2, 4), ripple: 0,
      from: new THREE.Vector3(), exit: nearestExit(here), walker: null,
    };
    this.position.y = POND.waterY;
  }

  private afterWater(then: Then): void {
    if (then === 'follow' && this.followSlot !== null) {
      this.task = { kind: 'follow', walker: null, replan: 0 };
    } else {
      const shore = this.flat();
      const out = { x: shore.x + (shore.x - POND.center.x) * 0.12, z: shore.z + (shore.z - POND.center.z) * 0.12 };
      this.task = { kind: 'graze', home: this.ctx.deps.nearestWalkable(out), wait: rand(0.5, 1.5), target: null, nibble: false };
    }
  }

  // --- behaviour -----------------------------------------------------------------------------------------------

  update(dt: number, t: number): void {
    const task = this.task;
    switch (task.kind) {
      case 'idle':
        this.speed = damp(this.speed, 0, 10, dt);
        break;
      case 'hatching':
        task.t += dt;
        if (task.t > 2.6) this.task = { kind: 'idle' };
        break;
      case 'graze':
        this.updateGraze(task, dt);
        break;
      case 'walk':
        if (this.walkRoute(task.walker, task.trot ? this.speeds.trot : this.speeds.walk, dt)) {
          const done = task.done;
          this.task = { kind: 'idle' };
          done(true);
        }
        break;
      case 'follow':
        this.updateFollow(task, dt);
        break;
      case 'slide':
        this.updateSlide(task, dt);
        break;
      case 'swim':
        this.updateSwim(task, dt);
        break;
      case 'carried':
        this.updateCarried(task, dt);
        break;
      case 'stall':
        this.updateStall(task, dt);
        break;
    }
    if (this.grounded) this.position.y = this.groundY();
    this.yaw = turnTowards(this.yaw, this.desiredYaw, 7 * dt);
    this.updatePose(dt, t);
  }

  /** Walk a route; true on arrival. */
  private walkRoute(w: RouteWalker, speed: number, dt: number): boolean {
    this.speed = damp(this.speed, speed, 6, dt);
    const at = this.flat();
    const h = w.step(at, Math.max(this.speed, 0.2) * dt);
    this.position.x = at.x;
    this.position.z = at.z;
    if (h !== null) this.desiredYaw = h;
    return w.done;
  }

  /** Step straight towards a point; true on arrival. */
  private stepTo(p: Vec2, speed: number, dt: number, near = 0.05): boolean {
    const dx = p.x - this.position.x;
    const dz = p.z - this.position.z;
    const d = Math.hypot(dx, dz);
    if (d <= near) return true;
    this.speed = damp(this.speed, speed, 6, dt);
    const s = Math.min(d, Math.max(this.speed, 0.15) * dt);
    this.position.x += (dx / d) * s;
    this.position.z += (dz / d) * s;
    this.desiredYaw = headingOf(dx, dz);
    return d - s <= near;
  }

  private updateGraze(g: Extract<Task, { kind: 'graze' }>, dt: number): void {
    const deps = this.ctx.deps;
    if (g.target) {
      const next = { x: this.position.x, z: this.position.z };
      if (this.stepTo(g.target, this.speeds.graze, dt)) {
        g.target = null;
        g.wait = rand(1.5, 4.5);
        g.nibble = Math.random() < 0.65;
      } else if (!deps.isWalkable(this.flat())) {
        this.position.x = next.x;
        this.position.z = next.z;
        g.target = null;
        g.wait = rand(0.5, 1.5);
      }
      return;
    }
    this.speed = damp(this.speed, 0, 8, dt);
    g.wait -= dt;
    if (g.wait > 0) return;
    const a = rand(0, Math.PI * 2);
    const r = rand(0.6, 3);
    const p = { x: g.home.x + Math.cos(a) * r, z: g.home.z + Math.sin(a) * r };
    if (deps.isWalkable(p) && lineWalkable(this.flat(), p, deps.isWalkable)) {
      g.target = p;
      g.nibble = false;
    } else g.wait = 0.3;
  }

  private updateFollow(f: Extract<Task, { kind: 'follow' }>, dt: number): void {
    const L = this.ctx.leader;
    const deps = this.ctx.deps;
    const slot = this.followSlot ?? 0;
    const playing = this.playTarget !== null;
    let target = playing ? this.playTarget! : followTarget(L.position, L.moveHeading, slot);
    if (!deps.isWalkable(target)) target = deps.nearestWalkable(target);
    const here = this.flat();
    const d = dist2(here, target);
    if (d < (playing ? 0.15 : 0.12)) {
      this.speed = damp(this.speed, 0, 10, dt);
      f.walker = null;
      if (!L.moving && !playing) this.desiredYaw = headingOf(L.position.x - here.x, L.position.z - here.z);
      return;
    }
    const want = playing ? this.playSpeed : Math.min(this.speeds.gallop, 0.5 + d * 1.7);
    f.replan -= dt;
    const direct = d < 6 && lineWalkable(here, target, deps.isWalkable);
    if (direct) {
      f.walker = null;
      this.stepTo(target, want, dt, 0.1);
      return;
    }
    if (!f.walker || f.replan <= 0 || (f.walker.end && dist2(f.walker.end, target) > 1)) {
      f.walker = new RouteWalker(deps.route(here, target), here);
      f.replan = 0.8;
    }
    if (this.walkRoute(f.walker, want, dt)) f.walker = null;
  }

  private updateSlide(s: Extract<Task, { kind: 'slide' }>, dt: number): void {
    const q = this.ctx.queue;
    s.t += dt;
    switch (s.stage) {
      case 'line': {
        const place = Math.max(0, q.place(this));
        const spot = queueSpot(place);
        if (!s.spot || dist2(s.spot, spot) > 0.05) {
          s.spot = spot;
          s.walker = new RouteWalker(this.ctx.deps.route(this.flat(), spot), this.flat());
        }
        const arrived = s.walker ? this.walkRoute(s.walker, this.speeds.trot, dt) : true;
        if (arrived) {
          s.walker = null;
          this.speed = damp(this.speed, 0, 10, dt);
          this.desiredYaw = headingOf(SLIDE.ladderBase.x - this.position.x, SLIDE.ladderBase.z - this.position.z);
        }
        if (q.mayGo(this)) {
          q.go(this);
          s.stage = 'ladder';
          s.walker = new RouteWalker(this.ctx.deps.route(this.flat(), SLIDE.ladderBase), this.flat());
        }
        break;
      }
      case 'ladder':
        if (this.walkRoute(s.walker!, this.speeds.walk, dt)) {
          s.stage = 'climb';
          s.t = 0;
          s.u = 0;
        }
        break;
      case 'climb':
        this.speed = 0;
        s.u += ((CLIMB_SPEED * 0.85) * dt) / CURVE_LEN;
        this.pose.phase += dt * 9;
        slideAt(Math.min(s.u, SLIDE.climbEnd), this.position);
        this.desiredYaw = this.yaw = slideDir(s.u).heading;
        if (s.u >= SLIDE.climbEnd) {
          s.stage = 'top';
          s.t = 0;
        }
        break;
      case 'top':
        s.u = Math.min(SEAT_U, s.u + (0.8 * dt) / CURVE_LEN);
        this.pose.phase += dt * 9;
        slideAt(s.u, this.position);
        this.desiredYaw = slideDir(SEAT_U + 0.04).heading;
        if (s.u >= SEAT_U) {
          s.stage = 'sit';
          s.t = 0;
        }
        break;
      case 'sit':
        slideAt(s.u, this.position);
        this.desiredYaw = slideDir(SEAT_U + 0.04).heading;
        if (s.t > 0.5) {
          q.free(this);
          s.stage = 'slide';
          s.v = SLIDE_V0;
          if (this.ctx.sounds()) slideSounds.whoosh();
        }
        break;
      case 'slide':
        [s.u, s.v] = slideStep(s.u, s.v, dt);
        slideAt(s.u, this.position);
        this.desiredYaw = this.yaw = slideDir(s.u).heading;
        if (s.u >= 1) {
          this.position.y = POND.waterY;
          this.ctx.fx.splash(this.position);
          if (this.ctx.sounds()) slideSounds.splash();
          const resolve = s.resolve;
          this.startSwim(s.short ? rand(4, 7) : rand(6, 12));
          resolve();
        }
        break;
    }
  }

  private updateSwim(w: Extract<Task, { kind: 'swim' }>, dt: number): void {
    w.t += dt;
    this.pose.phase += dt * 4;
    if (w.stage === 'out') {
      const k = Math.min(1, w.t / 0.7);
      this.position.x = w.from.x + (w.exit.x - w.from.x) * ease(k);
      this.position.z = w.from.z + (w.exit.z - w.from.z) * ease(k);
      this.position.y = THREE.MathUtils.lerp(POND.waterY, 0, ease(k)) + Math.sin(Math.PI * k) * 0.3;
      if (k >= 1) {
        this.position.y = 0;
        const next = this.afterSwim;
        this.afterSwim = null;
        if (next) this.task = this.resume(next);
        else this.afterWater(this.followSlot !== null ? 'follow' : 'graze');
      }
      return;
    }
    if (w.stage === 'shore') {
      if (this.walkRoute(w.walker!, this.speeds.trot, dt)) {
        w.stage = 'in';
        w.t = 0;
        w.from.copy(this.position);
        this.desiredYaw = headingOf(w.target.x - this.position.x, w.target.z - this.position.z);
      }
      return;
    }
    if (w.stage === 'in') {
      const k = Math.min(1, w.t / 0.7);
      this.position.x = w.from.x + (w.target.x - w.from.x) * ease(k);
      this.position.z = w.from.z + (w.target.z - w.from.z) * ease(k);
      this.position.y = THREE.MathUtils.lerp(0, POND.waterY, ease(k)) + Math.sin(Math.PI * k) * 0.35;
      if (k >= 1) {
        this.ctx.fx.splash(this.position);
        if (this.ctx.sounds()) slideSounds.splash();
        this.startSwim(w.until);
      }
      return;
    }
    this.position.y = POND.waterY;
    w.ripple -= dt;
    if (w.ripple <= 0 && this.speed > 0.1) {
      w.ripple = 0.55;
      this.ctx.fx.ripple(this.position, 0.25, 0.8, 1.0);
    }
    if (w.stage === 'exit') {
      if (this.stepTo(exitLanding(w.exit), this.speeds.swim * 1.3, dt, 0.06)) {
        w.stage = 'out';
        w.t = 0;
        w.from.copy(this.position);
        this.desiredYaw = headingOf(w.exit.x - this.position.x, w.exit.z - this.position.z);
      }
      return;
    }
    if (this.stepTo(w.target, this.speeds.swim * Math.min(1, w.t), dt, 0.2)) w.target = pondSpot(Math.random, 1.2);
    // Now and then splash a friend nearby, who giggles.
    w.splashIn -= dt;
    if (w.splashIn <= 0) {
      w.splashIn = rand(3, 6);
      let best: { position: THREE.Vector3; unicorn?: UnicornActor } | null = null;
      let bd = 2.8;
      for (const o of this.ctx.swimmers()) {
        if (o.unicorn === this) continue;
        const d = o.position.distanceTo(this.position);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      if (best) {
        this.desiredYaw = headingOf(best.position.x - this.position.x, best.position.z - this.position.z);
        this.ctx.fx.spray(this.position, best.position);
        if (this.ctx.sounds()) slideSounds.splash();
        if (best.unicorn) void best.unicorn.emote('shake');
        void this.emote('happy');
      }
    }
    if (w.t >= w.until) {
      w.stage = 'exit';
      w.exit = nearestExit(this.flat());
    }
  }

  private updateCarried(c: Extract<Task, { kind: 'carried' }>, dt: number): void {
    const land = c.land;
    if (!land) {
      this.height = damp(this.height, CARRY_HEIGHT, 7, dt);
      const ground = inPond(this.flat()) ? POND.waterY : this.groundY();
      this.position.y = damp(this.position.y, ground, 7, dt);
      const nx = damp(this.position.x, c.target.x, 12, dt);
      const nz = damp(this.position.z, c.target.z, 12, dt);
      const moved = Math.hypot(nx - this.position.x, nz - this.position.z);
      if (moved > 1e-3) this.desiredYaw = turnTowards(this.desiredYaw, headingOf(nx - this.position.x, nz - this.position.z), 3 * dt);
      this.position.x = nx;
      this.position.z = nz;
      this.speed = 0;
      c.beam.at.set(this.position.x, this.position.y, this.position.z);
      return;
    }
    land.t += dt;
    const k = Math.min(1, land.t / 0.55);
    this.position.lerpVectors(land.from, land.to, ease(k));
    c.beam.at.set(this.position.x, Math.min(land.to.y, this.position.y), this.position.z);
    if (k < 1) return;
    c.beam.alpha = 0;
    c.beam.done = true;
    this.position.copy(land.to);
    if (land.outcome === 'slide') {
      this.task = { kind: 'slide', stage: 'sit', t: 0, u: SEAT_U, v: 0, walker: null, spot: null, resolve: () => {}, short: false };
      this.desiredYaw = this.yaw = slideDir(SEAT_U + 0.04).heading;
    } else if (land.outcome === 'pond') {
      this.ctx.fx.splash(this.position);
      if (this.ctx.sounds()) slideSounds.splash();
      this.startSwim(rand(6, 12));
    } else {
      this.ctx.fx.sparkle(this.position.clone().setY(0.2), { count: 8 });
      this.task = { kind: 'graze', home: this.flat(), wait: rand(1, 2), target: null, nibble: false };
    }
  }

  private updateStall(s: Extract<Task, { kind: 'stall' }>, dt: number): void {
    s.t += dt;
    switch (s.stage) {
      case 'walk':
        if (this.walkRoute(s.walker!, this.speeds.walk, dt)) {
          s.stage = 'in';
          s.t = 0;
          s.from.copy(this.position);
          this.desiredYaw = Math.PI;
          if (doorIsUpper(s.door)) s.beam = this.ctx.fx.beam(this.position, 0.5);
        }
        break;
      case 'in':
        if (doorIsUpper(s.door)) {
          // Float up on a moonbeam to the upper stall: first up, then in.
          const k = Math.min(1, s.t / 1.7);
          const up = ease(Math.min(1, k / 0.6));
          const fwd = ease(Math.max(0, (k - 0.5) / 0.5));
          this.position.set(
            s.from.x + (s.to.x - s.from.x) * fwd,
            s.from.y + (s.to.y + 0.25 - s.from.y) * up - 0.25 * fwd,
            s.from.z + (s.to.z - s.from.z) * fwd,
          );
          s.beam!.at.set(this.position.x, 0, this.position.z);
          this.speed = fwd > 0 && fwd < 1 ? 0.6 : 0;
          if (k >= 1) {
            s.beam!.alpha = 0;
            s.beam!.done = true;
            s.stage = 'turn';
            s.t = 0;
          }
        } else if (this.stepTo({ x: s.to.x, z: s.to.z }, 0.9, dt, 0.03)) {
          s.stage = 'turn';
          s.t = 0;
        }
        break;
      case 'turn':
        this.speed = damp(this.speed, 0, 10, dt);
        this.desiredYaw = 0;
        this.position.x = s.to.x;
        this.position.z = s.to.z;
        if (Math.abs(wrap(this.yaw)) < 0.05) {
          s.stage = 'inside';
          const done = s.resolve;
          s.resolve = () => {};
          done();
        }
        break;
      case 'inside': {
        // Peeking it steps up to the door (lower stalls); ducking it lies down and shuffles back into the stall, and
        // is then out of sight (not drawn).
        this.speed = 0;
        const z = this.peekOn ? peekSpot(s.door).z : s.to.z - 0.5;
        this.position.z = damp(this.position.z, z, 5, dt);
        break;
      }
    }
  }

  /** Standing or walking on the meadow (not swimming, sliding, carried or in a stall). */
  private get grounded(): boolean {
    const t = this.task;
    switch (t.kind) {
      case 'idle':
      case 'graze':
      case 'walk':
      case 'follow':
      case 'hatching':
        return true;
      case 'slide':
        return t.stage === 'line' || t.stage === 'ladder';
      case 'stall':
        return t.stage === 'walk';
      case 'swim':
        return t.stage === 'shore';
      default:
        return false;
    }
  }

  /** Ground height here (the nest mound), 0 when the world gives none. */
  private groundY(): number {
    return this.ctx.deps.heightAt?.(this.flat()) ?? 0;
  }

  /** Ducked down at the back of its stall: out of sight, so the herd does not draw it. */
  get hidden(): boolean {
    const t = this.task;
    return t.kind === 'stall' && t.stage === 'inside' && !this.peekOn && this.tuck > 0.95 && this.position.z < t.to.z - 0.45;
  }

  // --- pose ------------------------------------------------------------------------------------------------------

  /** Where it stands and how high, without the animation (for headTop between frames). */
  private syncPose(): void {
    const p = this.pose;
    p.x = this.position.x;
    p.y = this.position.y;
    p.z = this.position.z;
    p.yaw = this.yaw;
  }

  private updatePose(dt: number, t: number): void {
    const p = this.pose;
    const task = this.task;
    const b = this.build;
    this.syncPose();
    p.t = t;

    const swimming = task.kind === 'swim' && (task.stage !== 'out' || task.t < 0.3);
    const carried = task.kind === 'carried';
    const slide = task.kind === 'slide' ? task.stage : null;
    const sitting = slide === 'sit' || slide === 'slide';
    const climbing = slide === 'climb';
    const inStall = task.kind === 'stall' && (task.stage === 'turn' || task.stage === 'inside');
    const hatching = task.kind === 'hatching' ? task.t : -1;

    this.depth = damp(this.depth, swimming ? SWIM_DEPTH[this._look.stage] : 0, 8, dt);
    if (!carried) this.height = damp(this.height, 0, 10, dt);
    const lowerStall = task.kind === 'stall' && !doorIsUpper(task.door);
    this.bed = damp(this.bed, inStall && this.peekOn ? b.bed + (lowerStall ? PEEK_LIFT_LOWER : 0) : 0, 6, dt);
    const lying = (inStall && !this.peekOn) || (hatching >= 0 && hatching < 1.7);
    this.tuck = damp(this.tuck, lying ? 1 : sitting ? 0.55 : 0, hatching >= 0 ? 4 : 8, dt);

    // Walking legs: the phase advances with the distance walked.
    const moving = !swimming && !carried && !climbing && !sitting ? this.speed : 0;
    p.phase += ((moving * dt) / b.stride) * Math.PI * 2;
    p.swing = Math.min(1.5, moving / this.speeds.walk);
    p.paddle = swimming ? 1 : 0;
    p.dangle = carried ? 1 : 0;
    p.climb = climbing ? 1 : 0;
    p.tuck = this.tuck;
    p.lift = this.height + this.bed - this.depth;
    p.bed = this.bed;
    p.wet = swimming ? 1 : 0;
    const onChute = slide === 'top' || slide === 'sit' || slide === 'slide';
    p.shadowY = swimming ? POND.waterY : onChute || inStall ? this.position.y : carried ? (inPond(this.flat()) ? POND.waterY : 0) : climbing ? 0 : this.position.y;

    // Breathing, the bob of a walk, blinking, ear flicks and tail swishes.
    const gait = moving > 0.1 ? Math.abs(Math.sin(p.phase)) * 0.025 * Math.min(1.5, p.swing) : 0;
    p.lift += gait;
    p.squash = 1 + Math.sin(t * 2.4 + p.phase * 0.1) * 0.012;
    p.pitch = climbing ? -0.85 : sitting ? slideDir(task.kind === 'slide' ? task.u : 0).slope * 0.8 : moving > this.speeds.trot ? 0.08 : 0;
    p.roll = carried ? Math.sin(t * 2.1) * 0.08 : 0;
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkLeft = 0.13;
      this.blinkIn = rand(2.5, 5);
    }
    this.blinkLeft -= dt;
    this.earIn -= dt;
    if (this.earIn <= 0) {
      this.earLeft = 0.25;
      this.earSide = Math.random() < 0.5 ? -1 : 1;
      this.earIn = rand(2, 5);
    }
    this.earLeft -= dt;
    const flick = this.earLeft > 0 ? Math.sin((this.earLeft / 0.25) * Math.PI) * 0.45 : 0;
    p.earL = this.earSide < 0 ? flick : 0;
    p.earR = this.earSide > 0 ? flick : 0;
    this.swishIn -= dt;
    if (this.swishIn <= 0) {
      this.swish = 1;
      this.swishIn = rand(2.5, 6);
    }
    this.swish = Math.max(0, this.swish - dt * 1.2);
    p.tailYaw = Math.sin(t * 1.6) * 0.15 + Math.sin(t * 11) * 0.45 * this.swish + (moving ? Math.sin(p.phase) * 0.15 : 0);
    p.tailLift = swimming ? 0.6 : moving > this.speeds.trot ? 0.4 : 0;

    // Head: grazing nibbles, looking at a point, sleepy in a nightcap.
    const g = task.kind === 'graze' && !task.target && task.nibble;
    let neckPitch = g ? 0.75 : climbing ? 0.5 : 0;
    let headPitch = g ? 0.4 : swimming ? -0.15 : 0;
    let headYaw = 0;
    if (this.lookTarget) {
      const want = wrap(headingOf(this.lookTarget.x - this.position.x, this.lookTarget.z - this.position.z) - this.yaw);
      headYaw = Math.max(-1, Math.min(1, want));
    }
    let headRoll = 0;
    let eyes: Pose['eyes'] = this.blinkLeft > 0 ? 'blink' : this.cap ? 'sleepy' : 'open';
    let mouth: Pose['mouth'] = g ? 'chew' : 'smile';
    if (carried || sitting) {
      eyes = 'happy';
      mouth = slide === 'slide' ? 'open' : 'grin';
    }
    if (hatching >= 0) {
      eyes = hatching < 0.8 ? 'closed' : hatching < 1.0 ? 'blink' : 'open';
      p.roll = Math.sin(t * 6) * 0.1 * Math.max(0, 1 - hatching / 2.2);
      neckPitch = 0.25 * Math.max(0, 1 - hatching / 1.7);
    }
    if (task.kind === 'stall' && task.stage === 'inside' && !this.peekOn) eyes = this.blinkLeft > 0 ? 'blink' : eyes;

    // An emote on top.
    const e = this.emoteNow;
    if (e) {
      e.t += dt;
      const dur = EMOTE_TIME[e.kind];
      const k = Math.min(1, e.t / dur);
      const env = Math.min(1, k * 6, (1 - k) * 6);
      switch (e.kind) {
        case 'hop': {
          const h = Math.sin(Math.PI * k);
          p.lift += h * 0.3 * (b.headR / 0.16);
          p.squash *= k < 0.15 || k > 0.85 ? 0.88 : 1.08;
          p.tuck = Math.max(p.tuck, h * 0.35);
          eyes = 'happy';
          mouth = 'grin';
          break;
        }
        case 'nuzzle':
          neckPitch += 0.35 * env;
          headYaw += Math.sin(e.t * 10) * 0.3 * env;
          headRoll = Math.sin(e.t * 10) * 0.12 * env;
          eyes = 'happy';
          break;
        case 'shake':
          headYaw += Math.sin(e.t * 17) * 0.45 * env;
          p.lift += Math.abs(Math.sin(e.t * 9)) * 0.03 * env;
          eyes = 'happy';
          mouth = 'open';
          break;
        case 'munch':
          neckPitch += 0.15 * env;
          mouth = 'chew';
          eyes = e.t % 1 < 0.5 ? 'happy' : eyes;
          break;
        case 'happy':
          p.lift += Math.abs(Math.sin(k * Math.PI * 2)) * 0.12 * (b.headR / 0.16);
          headPitch -= 0.15 * env;
          eyes = 'happy';
          mouth = 'grin';
          break;
        case 'shiver':
          p.roll += Math.sin(e.t * 55) * 0.05 * env;
          headRoll += Math.sin(e.t * 47) * 0.05 * env;
          eyes = 'closed';
          p.earL = p.earR = 0.5 * env;
          break;
        case 'look':
          headYaw += Math.sin(k * Math.PI * 2) * 0.8 * env;
          headPitch -= 0.1 * env;
          break;
        case 'yawn':
          headPitch -= 0.45 * env;
          neckPitch -= 0.15 * env;
          eyes = 'closed';
          mouth = env > 0.5 ? 'open' : 'smile';
          break;
      }
      if (e.t >= dur) {
        this.emoteNow = null;
        e.resolve();
      }
    }
    p.neckPitch = damp(p.neckPitch, neckPitch, 7, dt);
    p.headPitch = damp(p.headPitch, headPitch, 7, dt);
    p.headYaw = e ? headYaw : damp(p.headYaw, headYaw, 5, dt);
    p.headRoll = headRoll;
    p.eyes = eyes;
    p.mouth = mouth;
    p.chew = t * 14;
    p.nightcap = this.cap;

    if (this.toy && this.toyOn === 'head') {
      // Worn: its lower edge rests on the top of the head, a little behind the horn.
      headMatrix(p, b, _hm);
      const R = b.headR;
      this.toy.position.set(0, R * 0.95 + WEAR_SIZE * 0.36, -R * 0.2).applyMatrix4(_hm);
    } else if (this.toy) {
      if (swimming) {
        // In the water the toy bobs beside it at head height.
        const top = this.headTop(_v);
        const side = this.yaw + Math.PI / 2;
        this.toy.position.set(
          this.position.x + Math.sin(side) * 0.55,
          top.y - 0.15 + Math.sin(t * 2.5) * 0.06,
          this.position.z + Math.cos(side) * 0.55,
        );
      } else {
        // On land it lies on the grass at its front feet, a little to the side so it does not cover the face.
        const ahead = 0.42 * (b.headR / 0.18);
        const side = 0.22;
        this.toy.position.set(
          this.position.x + Math.sin(this.yaw) * ahead + Math.cos(this.yaw) * side,
          this.groundY() + TOY_SIZE * 0.42,
          this.position.z + Math.cos(this.yaw) * ahead - Math.sin(this.yaw) * side,
        );
      }
    }
  }

  /** Write this frame's parts (the herd decides who is drawn and in how much detail). */
  draw(full: boolean): void {
    drawUnicorn(this.parts, this.pose, this.build, this.coat, full);
  }

  /** The world-space point the herd uses for taps. */
  hitCentre(out: THREE.Vector3): THREE.Vector3 {
    const b = this.build;
    return out.set(this.position.x, this.position.y + this.pose.lift + (b.bodyY + b.neckAt[0] + b.headAt[0]) / 2, this.position.z);
  }

  /** Take it out of the world (replaced by a new unicorn with the same id). */
  dispose(): void {
    release(this.task, this.ctx, this);
    if (this.afterSwim) release(this.afterSwim, this.ctx);
    this.afterSwim = null;
    this.ctx.queue.leave(this);
    this.showToy(null);
    this.toySprite?.material.dispose();
    this.toySprite = null;
  }

  /** Put it somewhere at once (jump() in the level script). */
  place(at: Vec2, yaw = 0): void {
    release(this.task, this.ctx, this);
    if (this.afterSwim) release(this.afterSwim, this.ctx);
    this.afterSwim = null;
    this.task = { kind: 'idle' };
    this.height = this.depth = this.bed = this.tuck = 0;
    this.position.set(at.x, 0, at.z);
    this.yaw = this.desiredYaw = yaw;
  }
}

/** End a task that is replaced: settle its promise, leave the slide line, let its moonbeam fade. */
function release(t: Task, ctx: HerdCtx, who?: UnicornActor): void {
  if (t.kind === 'walk') t.done(false);
  if (t.kind === 'slide') {
    if (who) ctx.queue.leave(who);
    t.resolve();
  }
  if (t.kind === 'stall') {
    t.resolve();
    if (t.beam) t.beam.done = true;
  }
  if (t.kind === 'carried') {
    t.beam.alpha = 0;
    t.beam.done = true;
  }
}

const _hm = new Xf();
const _v = new THREE.Vector3();
