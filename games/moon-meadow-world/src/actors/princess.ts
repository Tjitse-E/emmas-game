// Princess Emma: a chibi princess built from smooth shapes, with two long blonde ponytails on verlet chains.
// She walks and runs routes, waves, claps, jumps and twirls, and rides the slide into the pond and swims out.
import * as THREE from 'three';
import type { Princess, PrincessMode, Vec2 } from '../contracts';
import { POND, SLIDE } from '../layout';
import { audio } from '../audio';
import { B, PartList, Xf, col, rimLambert } from './parts';
import * as S from './shapes';
import { HairTubes, Ponytail } from './ponytail';
import type { FxImpl } from './fx';
import { RouteWalker, SlideQueue, damp, exitLanding, headingOf, nearestExit, turnTowards, type ActorDepsPlus } from './motion';
import { CLIMB_SPEED, CURVE_LEN, SEAT_U, SLIDE_V0, slideAt, slideDir, slideStep } from './ride';

export const WALK_SPEED = 2.6;
export const RUN_SPEED = 4.5;
const SWIM_SPEED = 1.0;
/** How deep she is drawn in the water: up to her shoulders. */
const SWIM_DEPTH = 0.76;

/** What followers need to know about her. */
export interface Leader {
  readonly position: THREE.Vector3;
  /** The direction she last walked in (followers line up behind it). */
  readonly moveHeading: number;
  readonly moving: boolean;
  /** Seconds she has stood still on the grass (followers play after 1.5 s). */
  readonly still: number;
  /** On the ladder, the slide or in the water. */
  readonly riding: boolean;
}

export interface PrincessCtx {
  deps: ActorDepsPlus;
  fx: FxImpl;
  queue: SlideQueue<object>;
  /** She starts a slide ride: her followers queue up behind her. */
  onRide(): void;
  sounds(): boolean;
}

type Emote = 'wave' | 'clap' | 'jump' | 'twirl';
const EMOTE_TIME: Record<Emote, number> = { wave: 1.7, clap: 1.5, jump: 0.95, twirl: 1.4 };

type RideStage = 'toLadder' | 'wait' | 'climb' | 'top' | 'sit' | 'slide' | 'swim' | 'out';
interface Ride {
  stage: RideStage;
  t: number;
  u: number;
  v: number;
  walker: RouteWalker | null;
  from: THREE.Vector3;
  to: Vec2;
  ripple: number;
  resolve: () => void;
}

const SKIN = '#ffe2d0';
/** A pale blonde, so the deeper gold crown stands out against it. */
const HAIR = '#ffdf86';
const HAIR_LIGHT = '#fff0b8';
/** The crown: a deep warm gold with a light rim, about 1.3 times her old crown. */
const CROWN = '#f5a623';
const CROWN_SIZE = 1.3;
/** Ponytail tube radius: thickest just below the tie, a soft rounded tip. */
const TAIL_PEAK = 0.085;
const TAIL_TIP = 0.025;
/** How much thicker the tubes are than the first build, so the chain keeps them out of her head and dress. */
const TAIL_EXTRA = TAIL_PEAK - 0.052;
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

export class PrincessActor implements Princess {
  readonly position = new THREE.Vector3();
  readonly parts = new PartList(120);
  mode: PrincessMode = 'idle';
  heading = 0;
  moveHeading = Math.PI;
  still = 0;

  private readonly ctx: PrincessCtx;
  private targetHeading = 0;
  private speed = 0;
  private walker: RouteWalker | null = null;
  private run = false;
  private walkDone: ((ok: boolean) => void) | null = null;
  private ride: Ride | null = null;
  private pending: { to: Vec2; run: boolean; resolve: (ok: boolean) => void } | null = null;
  private emoteNow: { kind: Emote; t: number; resolve: () => void } | null = null;
  private readonly tails = [new Ponytail(8, 0.145), new Ponytail(8, 0.145)];
  private crownOn = false;
  private crownScale = 0;
  private readonly ribbon = col('#ff5c9d');
  private readonly ribbonLight = col('#ff8fbd');

  // Pose, recomputed every frame.
  private phase = 0;
  private blinkIn = 2;
  private blink = 0;
  private lookIn = 2;
  private lookYaw = 0;
  private headYaw = 0;
  private sit = 0;
  private depth = 0;
  private plunge = 0;

  private readonly dress: THREE.Mesh;
  private readonly crownMesh: THREE.Mesh;
  private readonly hair: HairTubes;
  private readonly c = {
    skin: col(SKIN),
    hair: col(HAIR),
    hairLight: col(HAIR_LIGHT),
    white: col('#ffffff'),
    iris: col('#4f8fe0'),
    lash: col('#4a2a35'),
    cheek: col('#ff8fb3'),
    mouth: col('#d9466f'),
    sleeve: col('#ffc6e1'),
    shoe: col('#ff6fa8'),
    gold: col('#ffb62e'),
    gem: col('#ff4f9a'),
    shadow: col('#2e4a2b'),
    shadowWater: col('#1b4964'),
  };

  constructor(scene: THREE.Scene, ctx: PrincessCtx, at: Vec2) {
    this.ctx = ctx;
    this.position.set(at.x, 0, at.z);
    this.dress = new THREE.Mesh(S.dress(), rimLambert({ vertexColors: true }, 0.15));
    this.dress.name = 'actors-dress';
    this.crownMesh = new THREE.Mesh(
      S.crown(),
      rimLambert({ color: CROWN, emissive: '#8a4b00', emissiveIntensity: 0.45, side: THREE.DoubleSide }, 1.1),
    );
    this.crownMesh.name = 'actors-crown';
    this.hair = new HairTubes(2, rimLambert({ vertexColors: true }, 0.3), col(HAIR), col(HAIR_LIGHT));
    this.hair.mesh.name = 'actors-ponytails';
    scene.add(this.hair.mesh);
    for (const m of [this.dress, this.crownMesh]) {
      m.matrixAutoUpdate = false;
      m.frustumCulled = false;
      scene.add(m);
    }
  }

  // --- the contract ---------------------------------------------------------------------------------------------

  walkTo(route: Vec2[], o: { run?: boolean } = {}): Promise<boolean> {
    if (this.ride && this.ride.stage !== 'toLadder' && this.ride.stage !== 'wait') {
      // Mid-ride she cannot turn back: she walks there once she has climbed out.
      const to = route[route.length - 1];
      if (!to) return Promise.resolve(false);
      this.pending?.resolve(false);
      return new Promise((resolve) => (this.pending = { to, run: !!o.run, resolve }));
    }
    this.cancelRide();
    this.endWalk(false);
    this.walker = new RouteWalker(route, this.flat());
    this.run = !!o.run;
    if (this.walker.done) {
      this.walker = null;
      return Promise.resolve(true);
    }
    this.mode = this.run ? 'run' : 'walk';
    return new Promise((resolve) => (this.walkDone = resolve));
  }

  stop(): void {
    if (this.ride && this.ride.stage !== 'toLadder' && this.ride.stage !== 'wait') return;
    this.cancelRide();
    this.endWalk(false);
    this.mode = 'idle';
  }

  rideSlide(): Promise<void> {
    if (this.ride) return new Promise((resolve) => this.whenRideEnds(resolve));
    this.endWalk(false);
    return new Promise((resolve) => {
      const route = this.ctx.deps.route(this.flat(), SLIDE.ladderBase);
      this.ride = { stage: 'toLadder', t: 0, u: 0, v: 0, walker: new RouteWalker(route, this.flat()), from: new THREE.Vector3(), to: SLIDE.ladderBase, ripple: 0, resolve };
      this.ctx.queue.join(this, true);
      this.mode = 'walk';
      this.run = false;
      this.ctx.onRide();
    });
  }

  emote(kind: Emote): Promise<void> {
    this.emoteNow?.resolve();
    if (kind === 'twirl') this.ctx.fx.sparkle(this.position.clone().setY(this.position.y + 0.7), { count: 10, colour: '#ffb3df' });
    return new Promise((resolve) => (this.emoteNow = { kind, t: 0, resolve }));
  }

  face(p: Vec2): void {
    const dx = p.x - this.position.x;
    const dz = p.z - this.position.z;
    if (Math.hypot(dx, dz) > 0.05) this.targetHeading = headingOf(dx, dz);
  }

  crown(on: boolean): void {
    this.crownOn = on;
  }

  ribbons(colour: string): void {
    this.ribbon.set(colour);
    // The knot is a light tint of the colour: a highlight that reads as a bow at a glance.
    this.ribbonLight.set(colour).lerp(col('#ffffff'), 0.55);
  }

  // --- for the herd and the harness ------------------------------------------------------------------------------

  get moving(): boolean {
    return this.speed > 0.2;
  }

  get riding(): boolean {
    return !!this.ride && this.ride.stage !== 'toLadder' && this.ride.stage !== 'wait';
  }

  /** Put her somewhere at once (jump() in the level script). */
  place(at: Vec2, heading = 0): void {
    this.cancelRide();
    this.endWalk(false);
    this.position.set(at.x, this.groundY(at), at.z);
    this.heading = this.targetHeading = this.moveHeading = heading;
    this.mode = 'idle';
    this.sit = this.depth = 0;
    for (const t of this.tails) t.reset();
  }

  private flat(): Vec2 {
    return { x: this.position.x, z: this.position.z };
  }

  /** Ground height under a point (the nest mound), 0 when the world gives none. */
  private groundY(p: Vec2): number {
    return this.ctx.deps.heightAt?.(p) ?? 0;
  }

  private endWalk(ok: boolean): void {
    this.walker = null;
    const done = this.walkDone;
    this.walkDone = null;
    done?.(ok);
  }

  private cancelRide(): void {
    if (!this.ride) return;
    this.ctx.queue.leave(this);
    const r = this.ride;
    this.ride = null;
    r.resolve();
  }

  private whenRideEnds(fn: () => void): void {
    const r = this.ride!;
    const prev = r.resolve;
    r.resolve = () => {
      prev();
      fn();
    };
  }

  // --- behaviour -----------------------------------------------------------------------------------------------

  update(dt: number, t: number): void {
    if (this.ride) this.updateRide(dt);
    else this.updateWalk(dt);
    this.heading = turnTowards(this.heading, this.targetHeading, 10 * dt);
    this.still = !this.ride && !this.walker && !this.emoteNow ? this.still + dt : 0;
    this.crownScale = damp(this.crownScale, this.crownOn ? 1 : 0, 9, dt);
    this.pose(dt, t);
  }

  private updateWalk(dt: number): void {
    if (!this.walker) {
      this.speed = damp(this.speed, 0, 12, dt);
      this.position.y = this.groundY(this.flat());
      if (this.mode === 'walk' || this.mode === 'run') this.mode = 'idle';
      return;
    }
    const target = this.run ? RUN_SPEED : WALK_SPEED;
    this.speed = Math.min(target, damp(this.speed, target, 8, dt) + 0.05);
    const at = this.flat();
    const h = this.walker.step(at, this.speed * dt);
    this.position.set(at.x, this.groundY(at), at.z);
    if (h !== null) this.targetHeading = this.moveHeading = h;
    this.phase += ((this.speed * dt) / (this.run ? 1.0 : 0.72)) * Math.PI * 2;
    if (this.walker.done) {
      this.mode = 'idle';
      this.endWalk(true);
    }
  }

  private updateRide(dt: number): void {
    const r = this.ride!;
    const q = this.ctx.queue;
    r.t += dt;
    switch (r.stage) {
      case 'toLadder': {
        this.speed = damp(this.speed, WALK_SPEED, 8, dt);
        const at = this.flat();
        const h = r.walker!.step(at, this.speed * dt);
        this.position.set(at.x, this.groundY(at), at.z);
        if (h !== null) this.targetHeading = this.moveHeading = h;
        this.phase += ((this.speed * dt) / 0.72) * Math.PI * 2;
        if (r.walker!.done) this.setStage(r, 'wait');
        break;
      }
      case 'wait':
        this.speed = damp(this.speed, 0, 12, dt);
        this.mode = 'idle';
        this.targetHeading = slideDir(0).heading;
        if (q.mayGo(this)) {
          q.go(this);
          this.setStage(r, 'climb');
          this.mode = 'climb';
        }
        break;
      case 'climb':
        this.speed = 0;
        r.u += (CLIMB_SPEED * dt) / CURVE_LEN;
        this.phase += dt * 7;
        this.targetHeading = this.heading = slideDir(r.u).heading;
        if (r.u >= SLIDE.climbEnd) this.setStage(r, 'top');
        slideAt(Math.min(r.u, SLIDE.climbEnd), this.position);
        break;
      case 'top':
        r.u = Math.min(SEAT_U, r.u + (0.9 * dt) / CURVE_LEN);
        this.phase += dt * 8;
        slideAt(r.u, this.position);
        this.targetHeading = slideDir(SEAT_U + 0.04).heading;
        if (r.u >= SEAT_U) {
          this.setStage(r, 'sit');
          this.mode = 'slide';
        }
        break;
      case 'sit':
        slideAt(r.u, this.position);
        if (r.t > 0.55) {
          q.free(this);
          r.v = SLIDE_V0;
          this.setStage(r, 'slide');
          if (this.ctx.sounds()) void audio.sfx('whoosh');
        }
        break;
      case 'slide': {
        [r.u, r.v] = slideStep(r.u, r.v, dt);
        slideAt(r.u, this.position);
        this.targetHeading = this.heading = slideDir(r.u).heading;
        if (r.u >= 1) {
          const at = this.position.clone().setY(POND.waterY);
          this.ctx.fx.splash(at);
          if (this.ctx.sounds()) void audio.sfx('splash');
          this.position.y = POND.waterY;
          r.to = exitLanding(nearestExit(this.flat()));
          this.setStage(r, 'swim');
          this.mode = 'swim';
          this.plunge = 1;
        }
        break;
      }
      case 'swim': {
        const dx = r.to.x - this.position.x;
        const dz = r.to.z - this.position.z;
        const d = Math.hypot(dx, dz);
        const step = Math.min(d, SWIM_SPEED * Math.min(1, r.t / 0.6) * dt);
        if (d > 1e-3) {
          this.position.x += (dx / d) * step;
          this.position.z += (dz / d) * step;
          this.targetHeading = headingOf(dx, dz);
        }
        this.position.y = POND.waterY;
        this.phase += dt * 6;
        r.ripple -= dt;
        if (r.ripple <= 0) {
          r.ripple = 0.45;
          this.ctx.fx.ripple(this.position, 0.3, 1.0, 1.1);
        }
        if (d < 0.05) {
          r.from.copy(this.position);
          r.to = nearestExit(this.flat());
          this.targetHeading = headingOf(r.to.x - this.position.x, r.to.z - this.position.z);
          this.setStage(r, 'out');
        }
        break;
      }
      case 'out': {
        const k = Math.min(1, r.t / 0.8);
        this.position.x = r.from.x + (r.to.x - r.from.x) * ease(k);
        this.position.z = r.from.z + (r.to.z - r.from.z) * ease(k);
        this.position.y = THREE.MathUtils.lerp(POND.waterY, 0, ease(k)) + Math.sin(Math.PI * k) * 0.28;
        this.phase += dt * 8;
        if (k >= 1) {
          this.position.y = 0;
          this.ride = null;
          this.mode = 'idle';
          this.speed = 0;
          this.still = 0;
          r.resolve();
          const p = this.pending;
          this.pending = null;
          if (p) void this.walkTo(this.ctx.deps.route(this.flat(), p.to), { run: p.run }).then(p.resolve);
        }
        break;
      }
    }
    if (this.ride) this.mode = rideMode(this.ride.stage, this.mode);
  }

  private setStage(r: Ride, s: RideStage): void {
    r.stage = s;
    r.t = 0;
  }

  // --- pose and drawing ------------------------------------------------------------------------------------------

  private pose(dt: number, t: number): void {
    const stage = this.ride?.stage;
    const sitting = stage === 'sit' || stage === 'slide';
    const swimming = stage === 'swim' || (stage === 'out' && (this.ride!.t < 0.45));
    this.sit = damp(this.sit, sitting ? 1 : 0, 12, dt);
    this.depth = damp(this.depth, swimming ? SWIM_DEPTH : 0, stage === 'out' ? 7 : 10, dt);
    this.plunge = damp(this.plunge, 0, 3, dt);

    // Blinks and looking around when she stands about.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blink = 0.14;
      this.blinkIn = 2 + Math.random() * 3;
    }
    this.blink = Math.max(0, this.blink - dt);
    this.lookIn -= dt;
    if (this.lookIn <= 0) {
      this.lookIn = 2 + Math.random() * 3;
      this.lookYaw = Math.random() < 0.4 ? 0 : (Math.random() - 0.5) * 0.9;
    }
    const idle = this.mode === 'idle' && !this.walker;
    this.headYaw = damp(this.headYaw, idle && !this.emoteNow ? this.lookYaw : 0, 4, dt);

    const e = this.emoteNow;
    if (e) {
      e.t += dt;
      if (e.t >= EMOTE_TIME[e.kind]) {
        this.emoteNow = null;
        e.resolve();
      }
    }
    this.draw(dt, t);
  }

  private draw(dt: number, t: number): void {
    const L = this.parts;
    L.clear();
    const c = this.c;
    const m = _m;
    const e = this.emoteNow;
    const ek = e ? e.t / EMOTE_TIME[e.kind] : 0;
    const stage = this.ride?.stage;
    const run = this.mode === 'run';
    const moving = this.speed > 0.15 && !this.ride;
    const stepAmp = moving ? Math.min(1, this.speed / WALK_SPEED) : 0;
    const s = Math.sin(this.phase);

    // Body sway, bob and lean.
    let bob = moving ? Math.abs(Math.sin(this.phase)) * (run ? 0.06 : 0.04) : Math.sin(t * 2.2) * 0.006;
    let lean = moving ? (run ? 0.16 : 0.06) : 0;
    let roll = moving ? 0 : Math.sin(t * 0.9) * 0.025;
    let spin = 0;
    let flare = 1 + (moving ? 0.03 * Math.abs(s) : 0);
    const hip = [s * 0.5 * stepAmp * (run ? 1.4 : 1), -s * 0.5 * stepAmp * (run ? 1.4 : 1)];
    const armPitch = [-s * 0.6 * stepAmp * (run ? 1.5 : 1), s * 0.6 * stepAmp * (run ? 1.5 : 1)];
    const armRoll = [-0.38, 0.38];
    let headPitch = 0;
    let headRoll = roll * 1.5;
    let happy = 0;
    let open = 0;

    if (stage === 'climb' || stage === 'top') {
      const cs = Math.sin(this.phase);
      lean = stage === 'climb' ? 0.32 : 0.05;
      bob = 0;
      for (let i = 0; i < 2; i++) {
        const sg = i ? 1 : -1;
        armPitch[i] = stage === 'climb' ? -2.5 + sg * cs * 0.35 : -sg * cs * 0.4;
        hip[i] = stage === 'climb' ? -0.5 - sg * cs * 0.45 : sg * cs * 0.4;
      }
      headPitch = stage === 'climb' ? -0.35 : 0;
    }
    if (this.sit > 0.02) {
      const k = this.sit;
      for (let i = 0; i < 2; i++) {
        hip[i] = THREE.MathUtils.lerp(hip[i], -1.45, k);
        armPitch[i] = THREE.MathUtils.lerp(armPitch[i], -2.75 + Math.sin(t * 9 + i) * 0.12, k);
        armRoll[i] = THREE.MathUtils.lerp(armRoll[i], (i ? 1 : -1) * 0.45, k);
      }
      if (stage === 'slide') {
        open = 1;
        lean = -0.15;
      }
    }
    if (this.depth > 0.05 || stage === 'out') {
      const k = Math.min(1, this.depth / SWIM_DEPTH);
      for (let i = 0; i < 2; i++) {
        const ph = this.phase + i * Math.PI;
        armPitch[i] = THREE.MathUtils.lerp(armPitch[i], -1.5 + Math.sin(ph) * 0.65, k);
        armRoll[i] = THREE.MathUtils.lerp(armRoll[i], (i ? 1 : -1) * (0.45 + Math.cos(ph) * 0.15), k);
        hip[i] = THREE.MathUtils.lerp(hip[i], Math.sin(ph * 1.3) * 0.5, k);
      }
      headPitch = -0.15 * k;
      happy = this.plunge > 0.3 ? 1 : 0;
      bob = Math.sin(t * 3) * 0.02 * k;
    }
    if (e) {
      const k = ek;
      const sg = [-1, 1];
      if (e.kind === 'wave') {
        const up = Math.min(1, k * 6, (1 - k) * 6);
        armRoll[0] = THREE.MathUtils.lerp(armRoll[0], -2.45 + Math.sin(e.t * 11) * 0.35, up);
        armPitch[0] = THREE.MathUtils.lerp(armPitch[0], -0.25, up);
        headRoll = -0.12 * up;
        happy = up > 0.5 ? 1 : 0;
      } else if (e.kind === 'clap') {
        const up = Math.min(1, k * 6, (1 - k) * 6);
        for (let i = 0; i < 2; i++) {
          armPitch[i] = THREE.MathUtils.lerp(armPitch[i], -1.3, up);
          armRoll[i] = THREE.MathUtils.lerp(armRoll[i], -sg[i] * 0.52 * (0.72 + 0.28 * Math.cos(e.t * 15)), up);
        }
        bob += Math.abs(Math.sin(e.t * 7.5)) * 0.03 * up;
        happy = 1;
      } else if (e.kind === 'jump') {
        if (k < 0.18) {
          bob -= 0.07 * (k / 0.18);
          for (let i = 0; i < 2; i++) armPitch[i] = 0.5 * (k / 0.18);
        } else if (k < 0.78) {
          const a = (k - 0.18) / 0.6;
          bob += Math.sin(Math.PI * a) * 0.4;
          for (let i = 0; i < 2; i++) {
            armPitch[i] = -2.5;
            armRoll[i] = sg[i] * 0.5;
            hip[i] = -0.35 + sg[i] * 0.15;
          }
          open = 1;
          happy = 1;
        } else {
          bob -= Math.sin(Math.PI * ((k - 0.78) / 0.22)) * 0.05;
        }
      } else if (e.kind === 'twirl') {
        spin = ease(k) * Math.PI * 2;
        const out = Math.sin(Math.PI * k);
        flare = 1 + 0.22 * out;
        for (let i = 0; i < 2; i++) {
          armRoll[i] = THREE.MathUtils.lerp(armRoll[i], sg[i] * 1.25, Math.min(1, out * 2));
          armPitch[i] = THREE.MathUtils.lerp(armPitch[i], -0.2, Math.min(1, out * 2));
        }
        headRoll = 0.15 * out;
        bob += out * 0.05;
        happy = 1;
      }
    }

    const p = this.position;
    const groundY = stage === 'swim' || stage === 'out' ? POND.waterY : stage === 'sit' || stage === 'slide' || stage === 'top' ? p.y : 0;
    const rootY = p.y + bob - this.sit * 0.27 - this.depth;

    // Shadow: on the grass, the slide or (fainter) the water. Smaller while she is in the air.
    const air = Math.max(0, rootY - groundY);
    const wet = stage === 'swim' || stage === 'out';
    m.identity().at(p.x, groundY + 0.012, p.z).tilt(-Math.PI / 2).size(0.42 / (1 + air * 1.5));
    L.push(B.Soft, m, wet ? c.shadowWater : c.shadow, (wet ? 0.18 : 0.32) / (1 + air));

    const root = _root.identity().at(p.x, rootY, p.z).turn(this.heading + spin).tilt(lean).roll(roll);

    // Legs and shoes (mostly under the dress).
    for (let i = 0; i < 2; i++) {
      const x = i ? 0.072 : -0.072;
      const legM = _k.from(root).at(x, 0.3, 0).tilt(hip[i]);
      m.from(legM).at(0, -0.255, 0).size(0.036, 0.25, 0.036);
      L.push(B.Limb, m, c.skin, 0);
      m.from(legM).at(0, -0.255, 0.03).size(0.052, 0.042, 0.082);
      L.push(B.Lo, m, c.shoe, 0.2);
    }

    // The dress (its own mesh) follows her root, flaring in a twirl and folding up when she sits.
    this.dress.matrix
      .copy(root)
      .multiply(_t.makeScale(flare + this.sit * 0.08, 1 - this.sit * 0.22, flare + this.sit * 0.1))
      .multiply(_t.makeTranslation(0, this.sit * 0.07, 0));
    this.dress.matrixWorldNeedsUpdate = true;

    // Arms with puff sleeves.
    for (let i = 0; i < 2; i++) {
      const x = i ? 0.158 : -0.158;
      const sh = _k.from(root).at(x, 0.78, 0).roll(armRoll[i]).tilt(armPitch[i]);
      m.from(sh).at(0, -0.25, 0).size(0.034, 0.25, 0.034);
      L.push(B.Limb, m, c.skin, 0);
      m.from(sh).at(0, -0.262, 0).size(0.044);
      L.push(B.Lo, m, c.skin, 0);
      m.from(root).at(x * 1.02, 0.79, 0).size(0.088, 0.078, 0.084);
      L.push(B.Mid, m, c.sleeve, 0.15);
    }

    // Head: a big round head with the hair as a cap, a soft fringe and side locks.
    const neck = _n.from(root).at(0, 0.86, 0).turn(this.headYaw).tilt(headPitch).roll(headRoll);
    const head = _h.from(neck).at(0, 0.22, 0);
    m.from(head).size(HR * 1.02, HR * 0.98, HR);
    L.push(B.Fine, m, c.skin, 0);
    m.from(head).at(0, 0.036, -0.032).size(0.266, 0.258, 0.262);
    L.push(B.Fine, m, c.hair, 0.2);
    // A soft scalloped fringe over the forehead and a lock in front of each ear.
    for (let k = 0; k < 4; k++) {
      const u = (k - 1.5) * 0.25;
      onHead(m.from(head), u, 0.54 - u * u * 0.5, -0.028).roll(u * -0.9).size(0.078, 0.062, 0.045);
      L.push(B.Mid, m, c.hair, 0.15);
    }
    for (const sg of [-1, 1]) {
      onHead(m.from(head), sg * 0.84, 0.08, -0.035).roll(sg * -0.2).size(0.06, 0.105, 0.05);
      L.push(B.Mid, m, c.hair, 0.15);
    }

    // Face: big eyes with two highlights and lashes, rosy cheeks, a small smile.
    const closed = this.blink > 0 && !happy;
    for (let i = 0; i < 2; i++) {
      const sg = i ? 1 : -1;
      const eye = onHead(_k.from(head), sg * 0.36, -0.1, -0.004);
      if (happy) {
        m.from(eye).at(0, -0.006, 0.008).size(0.05, 0.042, 1);
        L.push(B.Arc, m, c.lash, 0);
      } else if (closed) {
        m.from(eye).at(0, -0.004, 0.008).roll(Math.PI).size(0.05, 0.03, 1);
        L.push(B.Arc, m, c.lash, 0);
      } else {
        m.from(eye).size(0.056, 0.07, 0.012);
        L.push(B.Mid, m, c.white, 0);
        m.from(eye).at(0, -0.006, 0.0125).size(0.045, 0.053, 1);
        L.push(B.Iris, m, c.iris, 0);
        m.from(eye).at(-0.016, 0.019, 0.0132).size(0.016, 0.019, 1);
        L.push(B.Dot, m, c.white, 0);
        m.from(eye).at(0.015, -0.025, 0.0132).size(0.008);
        L.push(B.Dot, m, c.white, 0);
        m.from(eye).at(0, 0, 0.009).size(0.057, 0.07, 1);
        L.push(B.Arc, m, c.lash, 0);
        m.from(eye).at(sg * 0.056, 0.042, 0.009).roll(sg * -0.8).size(0.02, 0.0065, 1);
        L.push(B.Dot, m, c.lash, 0);
        m.from(eye).at(sg * 0.045, 0.06, 0.009).roll(sg * -0.4).size(0.017, 0.006, 1);
        L.push(B.Dot, m, c.lash, 0);
      }
      onHead(m.from(head), sg * 0.6, -0.36, 0.004).size(0.05, 0.036, 1);
      L.push(B.Soft, m, c.cheek, 0.6);
    }
    if (open) {
      onHead(m.from(head), 0, -0.5, 0.004).size(0.024, 0.028, 1);
      L.push(B.Dot, m, c.mouth, 0);
    } else {
      onHead(m.from(head), 0, -0.45, 0.004).roll(Math.PI).size(happy ? 0.034 : 0.027, happy ? 0.026 : 0.018, 1);
      L.push(B.Arc, m, c.mouth, 0);
    }

    // Crown with a pink gem and gold balls on its points.
    const cs = this.crownScale;
    this.crownMesh.visible = cs > 0.02;
    if (this.crownMesh.visible) {
      const pop = cs * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, cs)) * (this.crownOn ? 1 : 0));
      const z = CROWN_SIZE * pop;
      // The band rests on her hair a little lower than before, as it is wider now.
      const cm = _k.from(head).at(0, 0.212, -0.02).tilt(-0.2).size(0.115 * z, 0.1 * z, 0.115 * z);
      this.crownMesh.matrix.copy(cm);
      this.crownMesh.matrixWorldNeedsUpdate = true;
      m.from(cm).at(0, 0.3, 1.1).size(0.2, 0.24, 0.1);
      L.push(B.Lo, m, c.gem, 0.8);
      for (const tip of CROWN_TIPS) {
        m.from(cm).at(tip.x, tip.y - 0.04, tip.z).size(0.11);
        L.push(B.Lo, m, c.gold, 0.6);
      }
    }

    // Ponytails, tied high at the sides with bows. The second pinned point sits close to the head and below the tie,
    // so the tails hang down past her shoulders instead of splaying out sideways.
    const water = wet || this.depth > 0.2 ? POND.waterY : null;
    _inv.copy(root).invert();
    for (let i = 0; i < 2; i++) {
      const sg = i ? 1 : -1;
      _tie.set(sg * 0.21, 0.11, -0.085).applyMatrix4(head);
      _flare.set(sg * 0.27, 0.0, -0.13).applyMatrix4(head);
      const tail = this.tails[i];
      tail.update(dt, _tie, _flare, (q) => this.collide(q, root, head), groundY, water);
      this.hair.set(i, tail.p, tailRadius);
      // The bow faces out and forward: two big loops, a light knot and two streamers, so a new colour reads at once.
      const bow = onHead(_k.from(head), sg * 0.8, 0.45, 0.02).turn(sg * -0.25);
      for (const lx of [-1, 1]) {
        m.from(bow).at(lx * 0.075, 0.018, 0).roll(lx * 0.4).size(0.084, 0.054, 0.036);
        L.push(B.Mid, m, this.ribbon, 0.35);
      }
      m.from(bow).at(0, 0, 0.016).size(0.038, 0.036, 0.03);
      L.push(B.Lo, m, this.ribbonLight, 0.4);
      for (const lx of [-1, 1]) {
        const sway = Math.sin(t * 2.6 + lx + sg) * 0.06;
        m.from(bow).at(lx * 0.03, -0.012, -0.004).roll(lx * 0.32 + sway).at(0, -0.075, 0).size(0.024, 0.078, 0.014);
        L.push(B.Lo, m, this.ribbon, 0.35);
      }
    }
  }

  /** Keep a ponytail point out of her head and her dress (`_inv` holds the inverse of `root` this frame). */
  private collide(q: THREE.Vector3, root: THREE.Matrix4, head: THREE.Matrix4): void {
    _hc.setFromMatrixPosition(head);
    _d.subVectors(q, _hc);
    const dh = _d.length();
    const headR = 0.29 + TAIL_EXTRA;
    if (dh < headR && dh > 1e-5) q.copy(_hc).addScaledVector(_d, headR / dh);
    _l.copy(q).applyMatrix4(_inv);
    if (_l.y > 0.12 && _l.y < 0.9) {
      const y = _l.y;
      const r =
        (y < 0.4 ? THREE.MathUtils.lerp(0.4, 0.31, (y - 0.12) / 0.28) : y < 0.62 ? THREE.MathUtils.lerp(0.34, 0.2, (y - 0.4) / 0.22) : 0.2) +
        TAIL_EXTRA +
        (this.sit > 0.5 ? 0.05 : 0);
      const d = Math.hypot(_l.x, _l.z);
      if (d < r && d > 1e-5) {
        _l.x *= r / d;
        _l.z *= r / d;
        q.copy(_l.applyMatrix4(root));
      }
    }
  }
}

function rideMode(stage: RideStage, current: PrincessMode): PrincessMode {
  switch (stage) {
    case 'toLadder':
      return 'walk';
    case 'wait':
      return 'idle';
    case 'climb':
    case 'top':
      return 'climb';
    case 'sit':
    case 'slide':
      return 'slide';
    case 'swim':
    case 'out':
      return 'swim';
  }
  return current;
}

/** Head radius. */
const HR = 0.25;

/** Ponytail radius from the tie (t = 0) to the tip (t = 1). */
function tailRadius(t: number): number {
  if (t < 0.1) return TAIL_PEAK * (0.6 + 4 * t);
  return (TAIL_PEAK - TAIL_TIP) * Math.pow(1 - (t - 0.1) / 0.9, 0.6) + TAIL_TIP;
}

/** Onto the surface of her head at (u, v) in head radii. */
function onHead(m: Xf, u: number, v: number, depth: number): Xf {
  return m.onSphere(HR, u, v, depth);
}

const CROWN_TIPS = S.crownTips();
const _m = new Xf();
const _root = new Xf();
const _k = new Xf();
const _n = new Xf();
const _h = new Xf();
const _t = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _tie = new THREE.Vector3();
const _flare = new THREE.Vector3();
const _hc = new THREE.Vector3();
const _d = new THREE.Vector3();
const _l = new THREE.Vector3();
