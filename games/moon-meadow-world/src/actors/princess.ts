// Princess Emma: a chibi princess built from smooth shapes, with long hair on verlet chains. She walks and runs
// routes, waves, claps, jumps and twirls, rides the slide into the pond and swims out, and wears the look Emma picks in
// the wardrobe (docs/v4/2.3.md section 15): hair colour and style, eyes, gown shape, colour and extra, crown, shoes,
// hair things, earrings and a necklace, all from the shared shapes, so a new look costs no draw call, no material and
// no shader program.
import * as THREE from 'three';
import type { Princess, PrincessEmote, PrincessLook, PrincessMode, Vec2 } from '../contracts';
import { POND, SLIDE } from '../layout';
import { DEFAULT_LOOK, EYE_HEX, HAIR_HEX, PALETTE, crownOutline, normaliseLook, thingShade } from '../wardrobe';
import { B, CAPACITY, PartList, Xf, col, rimLambert, shapeTriangles, type BatchId } from './parts';
import * as S from './shapes';
import { Hair, crownForward, hairExtra } from './hair';
import {
  SIT_SQUASH, THING_SIDE, accentOf, backBow, bootShaft, drawEarring, drawNecklace, drawRose, drawThing, gownOf, gownRowColour, piece, shoeExtras,
  skirtAt, skirtTable, toeTips, wings, type Gown3D, type SmallColours, type SmallPaint, type ThingColours,
} from './looks3d';
import { slideSounds } from './sounds';
import type { FxImpl } from './fx';
import type { UnicornActor } from './unicorn';
import { HOP_S, HOP_UP, SEAT, drapeDress } from './mount';
import { RIDE } from '../layout';

/** The trail's gallop (RIDE.speed): her hair flies fully out at it. */
const RIDE_GALLOP = RIDE.speed;
import { BUILDS, bodyEllipsoids, mountShape } from './unicornBody';
import { RouteWalker, SlideQueue, damp, exitLanding, headingOf, nearestExit, turnTowards, wrap, type ActorDepsPlus } from './motion';
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
  /** On a mount (2.4.0): nobody is pushed away from her then, she sits on its back. */
  readonly seated: boolean;
}

export interface PrincessCtx {
  deps: ActorDepsPlus;
  fx: FxImpl;
  queue: SlideQueue<object>;
  /** She starts a slide ride: her followers queue up behind her. */
  onRide(): void;
  sounds(): boolean;
}

type Emote = PrincessEmote;
/** Seconds per emote. toss, blink, show, tilt and curtsy are the wardrobe's reactions (2.4). */
const EMOTE_TIME: Record<Emote, number> = {
  wave: 1.7, clap: 1.5, jump: 0.95, twirl: 1.4, toss: 1.0, blink: 1.6, show: 1.6, tilt: 1.2, curtsy: 1.2,
};

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
/** The crown: about 1.3 times her first one, in the crown colour's small shade with a rim line and gems. */
const CROWN_SIZE = 1.3;
/** How much the crown glows in its own colour (2.2's gold crown had a warm glow). */
const CROWN_GLOW = 0.3;
/** A shoe star's colour when it stands out on the shoe. */
const STAR_GOLD = '#ffc93a';
/** How fast her heading eases back after the preview drag (about 1.5 s to settle). */
const EASE_BACK = 3;
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
/** Up, hold, down: 0 to 1 over the first `a` of an emote, back to 0 over the last `a`. */
const swell = (k: number, a: number) => ease(Math.min(1, k / a, (1 - k) / a));

export class PrincessActor implements Princess {
  readonly position = new THREE.Vector3();
  readonly parts = new PartList(192);
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
  private emoteNow: { kind: Emote; t: number; side: number; resolve: () => void } | null = null;
  private crownOn = false;
  private crownScale = 0;
  private readonly ribbon = col('#ff5c9d');
  private readonly ribbonLight = col('#ff8fbd');
  /** What she wears. */
  private worn: PrincessLook = { ...DEFAULT_LOOK };
  private gown: Gown3D = gownOf(DEFAULT_LOOK.gown, DEFAULT_LOOK.gownColour);
  /** Each dress shape's geometry, built the first time a gown needs it, and its radius table for the hair. */
  private readonly dresses = new Map<S.DressShape, { g: THREE.BufferGeometry; skirt: Float32Array }>();
  /** Each dress shape's side-saddle skirt (2.4.0), built the first time she rides in it. */
  private readonly drapes = new Map<S.DressShape, THREE.BufferGeometry>();
  /** Sitting on a mount (2.4.0): hopping up, on its back, or hopping down to `to`. */
  private seat: { u: UnicornActor; stage: 'up' | 'on' | 'down'; t: number; from: THREE.Vector3; to: THREE.Vector3; resolve: () => void } | null = null;
  /** 0 standing to 1 sitting side-saddle (the legs, arms and dress ease between them). */
  private saddleK = 0;
  /** This frame the hair also keeps out of the mount's body (its matrices in _body and _bodyInv). */
  private hairOnMount = false;
  /** Each crown shape, built the first time she wears it. */
  private readonly crowns = new Map<S.CrownShapeId, S.CrownBuild>();
  private crownNow: S.CrownBuild;
  private skirt: Float32Array;
  /** The dress's scale and lift in root space this frame (the hair keeps out of it). */
  private readonly dressScale = new THREE.Vector4(1, 1, 1, 0);
  /** How much thicker than the first build's tubes her hair is (the chains keep this much further out). */
  private extraR = hairExtra('ponytails');
  private holding = false;
  /** Turned by the preview drag; the next face() then eases back slowly (easeBack) instead of snapping round. */
  private turned = false;
  private easeBack = false;
  private rose = false;
  private portraitOn = false;
  private drawn = false;
  private wingPhase = 0;
  private flutter = 0;
  private fold = 0;
  /** Her head's centre, the point between her eyes, her hair thing (on her left) and her dress, from the last frame. */
  private readonly headAt = new THREE.Vector3();
  private readonly eyesAt = new THREE.Vector3();
  private readonly thingAt = new THREE.Vector3();
  private readonly dressAt = new THREE.Vector3();
  /** A rainbow's bands (PALETTE.rainbow): on the small parts each piece takes its own band, as the swatch shows. */
  private readonly rainbow = (PALETTE.rainbow.bands ?? []).map((h) => col(h));
  private readonly colours: ThingColours = { ribbon: this.ribbon, ribbonLight: this.ribbonLight, bands: null };
  /** The shoes (their small shade and a colour that stands out on them) and the earrings' and necklace's colour. */
  private readonly shoe: SmallColours = { main: col('#ff5c9d'), accent: col('#ffffff'), bands: null };
  private readonly shoeStar = col(STAR_GOLD);
  private readonly jewel: SmallPaint = { main: col('#ffb62e'), bands: null };
  /** The crown band (the crown colour's small shade) and its outline (crownOutline: the rim line, gems and tips). */
  private readonly crownBand = col('#ffb62e');
  private readonly crownLine = col('#ffffff');
  private readonly collideFn = (q: THREE.Vector3): void => this.collide(q);

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
  readonly hair: Hair;
  private readonly c = {
    skin: col(SKIN),
    white: col('#ffffff'),
    iris: col('#4f8fe0'),
    lash: col('#4a2a35'),
    cheek: col('#ff8fb3'),
    mouth: col('#d9466f'),
    sleeve: col('#ffc6e1'),
    legs: col(SKIN),
    hand: col(SKIN),
    leotard: col('#ffffff'),
    gownMain: col('#ffb7d8'),
    backBow: col('#ffffff'),
    shadow: col('#2e4a2b'),
    shadowWater: col('#1b4964'),
  };

  constructor(scene: THREE.Scene, ctx: PrincessCtx, at: Vec2) {
    this.ctx = ctx;
    this.position.set(at.x, 0, at.z);
    this.headAt.set(at.x, 1.08, at.z);
    const party = this.dressFor('party');
    this.skirt = party.skirt;
    this.dress = new THREE.Mesh(party.g, rimLambert({ vertexColors: true }, 0.15));
    this.paintGown();
    this.dress.name = 'actors-dress';
    this.crownNow = this.crownFor('lumi');
    this.crownMesh = new THREE.Mesh(
      this.crownNow.geometry,
      rimLambert({ vertexColors: true, emissive: '#8a4b00', emissiveIntensity: CROWN_GLOW, side: THREE.DoubleSide }, 1.1),
    );
    this.crownMesh.name = 'actors-crown';
    this.wearCrown();
    this.paintSmall();
    this.hair = new Hair(rimLambert({ vertexColors: true }, 0.3));
    this.hair.tubes.mesh.name = 'actors-ponytails';
    scene.add(this.hair.tubes.mesh);
    for (const m of [this.dress, this.crownMesh]) {
      m.matrixAutoUpdate = false;
      m.frustumCulled = false;
      scene.add(m);
    }
  }

  // --- the contract ---------------------------------------------------------------------------------------------

  walkTo(route: Vec2[], o: { run?: boolean } = {}): Promise<boolean> {
    // On a mount she does not walk (2.4.0): the ride gets her off first.
    if (this.seat) return Promise.resolve(false);
    if (this.ride && this.ride.stage !== 'toLadder' && this.ride.stage !== 'wait') {
      // Mid-ride she cannot turn back: she walks there once she has climbed out.
      const to = route[route.length - 1];
      if (!to) return Promise.resolve(false);
      this.pending?.resolve(false);
      return new Promise((resolve) => (this.pending = { to, run: !!o.run, resolve }));
    }
    this.cancelRide();
    this.endWalk(false);
    this.turned = this.easeBack = false;
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
    if (this.seat) return;
    if (this.ride && this.ride.stage !== 'toLadder' && this.ride.stage !== 'wait') return;
    this.cancelRide();
    this.endWalk(false);
    this.mode = 'idle';
  }

  rideSlide(): Promise<void> {
    if (this.seat) return Promise.resolve();
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
    const fx = this.ctx.fx;
    const side = THING_SIDE[this.worn.thing];
    if (kind === 'twirl') fx.sparkle(this.position.clone().setY(this.position.y + 0.7), { count: 10, colour: this.gown.main[0] });
    if (kind === 'toss') {
      // Sparkles in the hair colour at her head and halfway down each tail.
      const h = HAIR_HEX[this.worn.hair];
      fx.sparkle(_sp.copy(this.headAt).setY(this.headAt.y + 0.12), { count: 9, colour: h.bands?.[0] ?? h.base });
      for (let i = 0; i < 2; i++) {
        if (this.hair.mid(i, _sp)) fx.sparkle(_sp, { count: 6, colour: h.bands?.[3 + i] ?? h.light });
      }
    }
    if (kind === 'tilt') fx.sparkle(this.thingAt, { count: 8, colour: PALETTE[this.worn.thingColour].small });
    return new Promise((resolve) => (this.emoteNow = { kind, t: 0, side, resolve }));
  }

  face(p: Vec2): void {
    const dx = p.x - this.position.x;
    const dz = p.z - this.position.z;
    if (Math.hypot(dx, dz) > 0.05) this.targetHeading = headingOf(dx, dz);
    if (this.turned) {
      this.turned = false;
      this.easeBack = true;
    }
  }

  crown(on: boolean): void {
    this.crownOn = on;
  }

  get look(): PrincessLook {
    return this.worn;
  }

  /**
   * Wear a look; missing fields keep what she wears. Colours change at once, a gown or crown swaps to its cached shape
   * and repaints it, a style builds new chains (with a sparkle over the pop). Nothing compiles a program.
   */
  setLook(look: Partial<PrincessLook>): void {
    const was = this.worn;
    const next = normaliseLook({ ...was, ...look }, was);
    this.worn = next;
    if (next.thingColour !== was.thingColour || next.hair !== was.hair) this.paintThings();
    if (next.eyes !== was.eyes) this.c.iris.set(EYE_HEX[next.eyes]);
    if (next.hair !== was.hair) this.hair.setColour(next.hair);
    if (next.gown !== was.gown || next.gownColour !== was.gownColour) this.wearGown();
    if (next.crown !== was.crown || next.crownColour !== was.crownColour || next.hair !== was.hair) this.wearCrown();
    if (next.shoeColour !== was.shoeColour || next.jewelColour !== was.jewelColour) this.paintSmall();
    if (next.style !== was.style) {
      this.hair.setStyle(next.style);
      this.extraR = hairExtra(next.style);
      if (this.drawn) this.ctx.fx.sparkle(_sp.copy(this.headAt).setY(this.headAt.y - 0.1), { count: 12, colour: HAIR_HEX[next.hair].light });
    }
  }

  /** Stand still for the portrait: no random look-around. */
  hold(on: boolean): void {
    this.holding = on;
  }

  /** Turn from the current heading and stay there (the preview drag); the next face() eases back in about 1.5 s. */
  turnBy(rad: number): void {
    this.heading = this.targetHeading = wrap(this.heading + rad);
    this.turned = true;
    this.easeBack = false;
  }

  /** World points for sparkles and framing, from the last drawn frame. `thing` is the hair thing on her left. */
  point(part: 'head' | 'eyes' | 'thing' | 'dress', out = new THREE.Vector3()): THREE.Vector3 {
    switch (part) {
      case 'head':
        return out.copy(this.headAt);
      case 'eyes':
        return out.copy(this.eyesAt);
      case 'thing':
        return out.copy(this.thingAt);
      case 'dress':
        return out.copy(this.dressAt);
    }
  }

  /** The picnic rose behind her right ear, beside her hair thing, for the day. Never part of her look. */
  extra(kind: 'rose' | null): void {
    this.rose = kind === 'rose';
  }

  /** Finer shapes while the camera is close (the wardrobe): her Mid parts as Fine, her Lo parts as Mid. */
  portrait(on: boolean): void {
    this.portraitOn = on;
  }

  private dressFor(shape: S.DressShape): { g: THREE.BufferGeometry; skirt: Float32Array } {
    let d = this.dresses.get(shape);
    if (!d) {
      d = { g: S.dressGeometry(shape), skirt: skirtTable(shape, S.DRESS_ROWS[shape]) };
      this.dresses.set(shape, d);
    }
    return d;
  }

  private wearGown(): void {
    this.gown = gownOf(this.worn.gown, this.worn.gownColour);
    const d = this.dressFor(this.gown.shape);
    this.dress.geometry = d.g;
    this.skirt = d.skirt;
    this.paintGown();
  }

  private paintGown(): void {
    const g = this.gown;
    S.paintDress(this.dressFor(g.shape).g, g.shape, (role, k, out) => gownRowColour(g, role, k, out));
    const drape = this.drapes.get(g.shape);
    if (drape) S.paintDress(drape, g.shape, (role, k, out) => gownRowColour(g, role, k, out));
    const c = this.c;
    c.sleeve.set(g.sleeve);
    c.legs.set(g.legs === null || g.legs === 'skin' ? SKIN : g.legs);
    c.hand.set(g.gloves ? '#ffffff' : SKIN);
    c.gownMain.set(g.base);
    c.leotard.set(g.bodice);
    c.backBow.set(g.sash);
  }

  private crownFor(shape: S.CrownShapeId): S.CrownBuild {
    let c = this.crowns.get(shape);
    if (!c) {
      c = S.crownBuild(shape);
      this.crowns.set(shape, c);
    }
    return c;
  }

  /** The crown's shape (its cached geometry), its band colour and its outline on her hair. */
  private wearCrown(): void {
    const look = this.worn;
    this.crownNow = this.crownFor(look.crown);
    this.crownMesh.geometry = this.crownNow.geometry;
    const p = PALETTE[look.crownColour];
    this.crownBand.set(p.small);
    this.crownLine.set(crownOutline(look.hair, look.crownColour));
    S.paintCrown(this.crownNow, p.bands ? this.rainbow : this.crownBand, this.crownLine);
    // It glows a little in its own colour, as 2.2's gold crown did; a rainbow glows white, so no band turns pink.
    const glow = (this.crownMesh.material as THREE.MeshLambertMaterial).emissive;
    if (p.bands) glow.set('#ffffff').multiplyScalar(0.25);
    else glow.set(p.small).multiplyScalar(0.5);
  }

  /**
   * Her hair things' colour, and a light tint of it for the knots (a highlight that reads as a bow at a glance). On
   * hair of nearly the same colour the shade moves until it stands out (thingShade).
   */
  private paintThings(): void {
    const p = PALETTE[this.worn.thingColour];
    const shade = thingShade(this.worn.hair, this.worn.thingColour);
    this.ribbon.set(shade);
    this.ribbonLight.set(shade).lerp(_white, 0.55);
    this.colours.bands = p.bands ? this.rainbow : null;
  }

  /** The shoes and the jewels: their small shade, and what stands out on the shoes. */
  private paintSmall(): void {
    const look = this.worn;
    this.shoe.main.set(PALETTE[look.shoeColour].small);
    this.shoe.bands = PALETTE[look.shoeColour].bands ? this.rainbow : null;
    this.shoe.accent.set(accentOf(look.shoeColour));
    this.shoeStar.set(accentOf(look.shoeColour, STAR_GOLD));
    this.jewel.main.set(PALETTE[look.jewelColour].small);
    this.jewel.bands = PALETTE[look.jewelColour].bands ? this.rainbow : null;
  }

  // --- for the herd and the harness ------------------------------------------------------------------------------

  get moving(): boolean {
    return this.speed > 0.2;
  }

  get riding(): boolean {
    return !!this.ride && this.ride.stage !== 'toLadder' && this.ride.stage !== 'wait';
  }

  // --- riding a mount (2.4.0, docs/v4/2.4.md section 5.4) -------------------------------------------------------

  /**
   * The mount she sits on, or null. Not `riding`: that name is the slide's (on the ladder, the slide or in the water),
   * which the followers read (Leader.riding).
   */
  mountedOn: UnicornActor | null = null;

  /** On a mount, from the hop up to the hop down (Leader.seated: nobody is pushed away from her then). */
  get seated(): boolean {
    return this.mountedOn !== null;
  }

  /**
   * Hop up onto a mount with a sparkle and sit side-saddle on its left (mode 'mounted'): both legs and the skirt on that
   * side. Her place follows its saddle every frame. Resolves as she sits.
   */
  mount(u: UnicornActor): Promise<void> {
    this.cancelRide();
    this.endWalk(false);
    this.pending?.resolve(false);
    this.pending = null;
    this.seat?.resolve();
    this.ctx.fx.sparkle(_sp.copy(this.position).setY(this.position.y + 0.5), { count: 12 });
    return new Promise((resolve) => {
      this.seat = { u, stage: 'up', t: 0, from: this.position.clone(), to: new THREE.Vector3(), resolve };
      this.mountedOn = u;
      this.mode = 'mounted';
      this.speed = 0;
    });
  }

  /** Hop down to a ground point with a sparkle. Resolves when she stands there. */
  dismount(at: Vec2): Promise<void> {
    const s = this.seat;
    if (!s) {
      this.place(at, this.heading);
      return Promise.resolve();
    }
    s.resolve();
    this.ctx.fx.sparkle(_sp.copy(this.position).setY(this.position.y + 0.3), { count: 10 });
    return new Promise((resolve) => {
      this.seat = { u: s.u, stage: 'down', t: 0, from: this.position.clone(), to: new THREE.Vector3(at.x, this.groundY(at), at.z), resolve };
    });
  }

  /** Where she sits on u now (her root, feet level as she sits) and her heading there. */
  private seatOn(u: UnicornActor, out: THREE.Vector3): number {
    u.saddleTop(out);
    const yaw = u.yaw;
    // Out to its left (+x when it faces +z) and a little forward.
    out.x += Math.cos(yaw) * SEAT.side + Math.sin(yaw) * SEAT.forward;
    out.z += -Math.sin(yaw) * SEAT.side + Math.cos(yaw) * SEAT.forward;
    out.y -= SEAT.hips - SEAT.sink;
    return wrap(yaw + SEAT.turn);
  }

  private updateSeat(dt: number): void {
    const s = this.seat!;
    s.t += dt;
    this.speed = 0;
    this.walker = null;
    const k = Math.min(1, s.t / HOP_S);
    if (s.stage === 'down') {
      this.position.lerpVectors(s.from, s.to, ease(k));
      this.position.y += Math.sin(Math.PI * k) * HOP_UP * 0.6;
      if (k >= 1) {
        this.position.copy(s.to);
        this.seat = null;
        this.mountedOn = null;
        this.mode = 'idle';
        this.still = 0;
        this.ctx.fx.sparkle(_sp.copy(this.position).setY(0.2), { count: 8 });
        s.resolve();
      }
      return;
    }
    const heading = this.seatOn(s.u, _seat);
    this.targetHeading = heading;
    if (s.stage === 'up') {
      this.position.lerpVectors(s.from, _seat, ease(k));
      this.position.y += Math.sin(Math.PI * k) * HOP_UP;
      if (k >= 1) {
        s.stage = 'on';
        this.ctx.fx.sparkle(_sp.copy(_seat).setY(_seat.y + SEAT.hips), { count: 14, colour: '#ffe27a' });
        s.resolve();
      }
      return;
    }
    this.position.copy(_seat);
    this.heading = heading;
  }

  /** The side-saddle skirt for a dress shape (cached; painted as the dress is). */
  private drapeFor(shape: S.DressShape): THREE.BufferGeometry {
    let d = this.drapes.get(shape);
    if (!d) {
      d = drapeDress(this.dressFor(shape).g, mountShape(BUILDS.grown));
      this.drapes.set(shape, d);
    }
    return d;
  }

  /** Put her somewhere at once (jump() in the level script). */
  place(at: Vec2, heading = 0): void {
    if (this.seat) {
      const s = this.seat;
      this.seat = null;
      s.resolve();
    }
    this.mountedOn = null;
    this.saddleK = 0;
    this.cancelRide();
    this.endWalk(false);
    this.position.set(at.x, this.groundY(at), at.z);
    this.heading = this.targetHeading = this.moveHeading = heading;
    this.mode = 'idle';
    this.sit = this.depth = 0;
    this.turned = this.easeBack = false;
    this.hair.reset();
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
    if (this.seat) this.updateSeat(dt);
    else if (this.ride) this.updateRide(dt);
    else this.updateWalk(dt);
    if (this.easeBack && !this.walker && !this.ride) {
      // After the preview drag she eases back to face the camera instead of snapping round.
      const d = wrap(this.targetHeading - this.heading);
      this.heading = wrap(this.heading + d * (1 - Math.exp(-EASE_BACK * dt)));
      if (Math.abs(d) < 0.004) this.easeBack = false;
    } else {
      this.easeBack = false;
      this.heading = turnTowards(this.heading, this.targetHeading, 10 * dt);
    }
    this.still = !this.ride && !this.walker && !this.emoteNow && !this.seat ? this.still + dt : 0;
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
          if (this.ctx.sounds()) slideSounds.whoosh();
        }
        break;
      case 'slide': {
        [r.u, r.v] = slideStep(r.u, r.v, dt);
        slideAt(r.u, this.position);
        this.targetHeading = this.heading = slideDir(r.u).heading;
        if (r.u >= 1) {
          const at = this.position.clone().setY(POND.waterY);
          this.ctx.fx.splash(at);
          if (this.ctx.sounds()) slideSounds.splash();
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
    // On a mount she sits from the top of the hop up to the start of the hop down.
    const seat = this.seat;
    const onMount = !!seat && (seat.stage === 'on' || (seat.stage === 'up' && seat.t > HOP_S * 0.5));
    this.saddleK = seat ? (onMount ? (seat.stage === 'on' ? 1 : damp(this.saddleK, 1, 14, dt)) : seat.stage === 'down' ? damp(this.saddleK, 0, 14, dt) : this.saddleK) : 0;
    const sitting = stage === 'sit' || stage === 'slide' || onMount;
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
    this.headYaw = damp(this.headYaw, idle && !this.emoteNow && !this.holding ? this.lookYaw : 0, 4, dt);

    // Wings flap faster when she runs or slides and fold flat while she swims; butterflies flutter faster on the move.
    const fast = this.mode === 'run' || this.mode === 'slide';
    this.wingPhase += dt * Math.PI * 2 * (fast ? 5 : 1.5);
    this.flutter += dt * Math.PI * 2 * (this.moving || fast ? 6 : 2.5);
    this.fold = damp(this.fold, this.depth > 0.2 ? 1 : 0, 6, dt);

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
    const g = this.gown;
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
    /** A wide smile with open eyes (the wardrobe's reactions show her eyes). */
    let grin = 0;
    /** Eyes a little wider (the blink reaction) and how closed they are in its slow blink. */
    let wide = 1;
    let shut = 0;
    /** Knees bent this far (the curtsy): her feet stay on the ground. */
    let knees = 0;

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
    // Side-saddle (2.4.0): both legs forward and down on the mount's left, her hands on the seat's front, no sway of
    // her own (she rides the mount's gait).
    const sk = this.saddleK;
    if (sk > 0) {
      for (let i = 0; i < 2; i++) {
        const sg = i ? 1 : -1;
        hip[i] = THREE.MathUtils.lerp(hip[i], -0.95 + sg * 0.05, sk);
        armPitch[i] = THREE.MathUtils.lerp(armPitch[i], -0.75 + Math.sin(t * 3 + i) * 0.05, sk);
        armRoll[i] = THREE.MathUtils.lerp(armRoll[i], sg * 0.22, sk);
      }
      bob *= 1 - sk;
      roll *= 1 - sk;
      lean *= 1 - sk;
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
      } else if (e.kind === 'toss') {
        // A hair toss: the head rolls 0.25, then -0.15, then back, and the tails swing with it.
        headRoll = k < 0.3 ? 0.25 * ease(k / 0.3) : k < 0.65 ? THREE.MathUtils.lerp(0.25, -0.15, ease((k - 0.3) / 0.35)) : -0.15 * (1 - ease((k - 0.65) / 0.35));
        roll += headRoll * 0.2;
        headPitch = -0.08 * swell(k, 0.3);
        grin = 1;
      } else if (e.kind === 'blink') {
        // Eyes a little wider for a second, then one slow blink. Never the happy arcs: they would hide the eyes.
        wide = 1 + 0.1 * swell(Math.min(1, k / 0.62), 0.25);
        shut = k > 0.62 ? Math.sin(Math.PI * ((k - 0.62) / 0.38)) : 0;
        grin = 1;
      } else if (e.kind === 'show') {
        // Turn one way, hold, the other way, hold, back: the back of her hair shows.
        const a = k < 0.22 ? ease(k / 0.22) : k < 0.4 ? 1 : k < 0.62 ? 1 - 2 * ease((k - 0.4) / 0.22) : k < 0.78 ? -1 : -1 + ease((k - 0.78) / 0.22);
        spin = 0.6 * a;
        grin = 1;
      } else if (e.kind === 'tilt') {
        // The head leans towards the side of her hair thing (its top goes that way).
        headRoll = -e.side * 0.22 * swell(k, 0.25);
        roll -= e.side * 0.03 * swell(k, 0.25);
        grin = 1;
      } else if (e.kind === 'curtsy') {
        // Knees bend, the dress flares, the head bows and her hands hold the skirt out.
        const up = swell(k, 0.3);
        knees = 0.08 * up;
        flare = 1 + 0.1 * up;
        headPitch = 0.25 * up;
        lean = 0.08 * up;
        hip[0] = THREE.MathUtils.lerp(hip[0], -0.12, up);
        hip[1] = THREE.MathUtils.lerp(hip[1], 0.42, up);
        for (let i = 0; i < 2; i++) {
          armRoll[i] = THREE.MathUtils.lerp(armRoll[i], sg[i] * 0.78, up);
          armPitch[i] = THREE.MathUtils.lerp(armPitch[i], -0.3, up);
        }
        happy = up > 0.5 ? 1 : 0;
      }
    }
    // No twirl, turn, jump or knee bend of her own on a mount: her skirt lies over its flank, and her legs stay down
    // its side whatever her arms do.
    if (sk > 0) {
      for (let i = 0; i < 2; i++) hip[i] = THREE.MathUtils.lerp(hip[i], -0.95 + (i ? 0.05 : -0.05), sk);
      spin *= 1 - sk;
      knees *= 1 - sk;
      bob *= 1 - sk;
      flare = THREE.MathUtils.lerp(flare, 1, sk);
    }
    // The blink reaction owns her eyelids.
    const blinking = e?.kind === 'blink';

    const p = this.position;
    const groundY = stage === 'swim' || stage === 'out' ? POND.waterY : stage === 'sit' || stage === 'slide' || stage === 'top' ? p.y : 0;
    const rootY = p.y + bob - knees - this.sit * 0.27 - this.depth;

    // Shadow: on the grass, the slide or (fainter) the water. Smaller while she is in the air.
    const air = Math.max(0, rootY - groundY);
    const wet = stage === 'swim' || stage === 'out';
    m.identity().at(p.x, groundY + 0.012, p.z).tilt(-Math.PI / 2).size(0.42 / (1 + air * 1.5));
    L.push(B.Soft, m, wet ? c.shadowWater : c.shadow, (wet ? 0.18 : 0.32) / (1 + air));

    const root = _root.identity().at(p.x, rootY, p.z).turn(this.heading + spin).tilt(lean).roll(roll);
    const look = this.worn;

    // The dress (its own mesh) follows her root, flaring in a twirl and folding up when she sits. In the slide chute a
    // gown or a tutu is narrowed so it sits inside the chute.
    const sq = SIT_SQUASH[g.shape];
    const sxz = THREE.MathUtils.lerp(1, sq.xz, this.sit);
    const ds = this.dressScale.set(flare * sxz + this.sit * 0.08 * sq.flare, 1 - this.sit * sq.y, flare * sxz + this.sit * 0.1 * sq.flare, this.sit * sq.lift);
    // On a mount the dress is its side-saddle skirt (pressed out over the flank), not squashed as in the slide.
    const draped = sk > 0.5;
    if (draped) ds.set(1, 1, 1, 0);
    const geometry = draped ? this.drapeFor(g.shape) : this.dressFor(g.shape).g;
    if (this.dress.geometry !== geometry) this.dress.geometry = geometry;
    this.dress.matrix.copy(root).multiply(_t.makeScale(ds.x, ds.y, ds.z)).multiply(_t.makeTranslation(0, ds.w, 0));
    this.dress.matrixWorldNeedsUpdate = true;

    // Legs and shoes (mostly under the dress). A floor-length gown hides them: she glides, and two toe tips peek out
    // of the hem front (not while she sits in the slide).
    if (g.legs !== null) {
      for (let i = 0; i < 2; i++) {
        const x = i ? 0.072 : -0.072;
        const legM = _k.from(root).at(x, 0.3, 0).tilt(hip[i]);
        m.from(legM).at(0, -0.255 + knees, 0).size(0.036, 0.25 - knees, 0.036);
        L.push(B.Limb, m, c.legs, 0);
        const boots = look.shoes === 'boots';
        const foot = _a.from(legM).at(0, -0.255 + knees, 0.03);
        m.from(foot).size(boots ? 0.056 : 0.052, boots ? 0.048 : 0.042, boots ? 0.088 : 0.082);
        L.push(B.Lo, m, piece(this.shoe, i * 3), 0.2);
        if (boots) bootShaft(L, _r.from(legM).at(0, -0.255 + knees, 0), this.shoe, i);
        else shoeExtras(L, look.shoes, foot, this.shoe, this.shoeStar);
      }
      // Under a tutu the legs show up to the ruffles: the leotard (the bodice colour) covers the top of them.
      if (g.shape === 'tutu') {
        m.from(root).at(0, 0.365, 0).size(0.112, 0.07, 0.092);
        L.push(B.Lo, m, c.leotard, 0.2);
      }
    } else if (this.sit < 0.05) {
      // The toes never sink into the ground under her (the curtsy, a jump's crouch, the run's lean, the nest mound);
      // in the water they swim.
      const floor = wet || this.depth > 0.05 ? null : p.y;
      toeTips(L, look.shoes, root, S.HEM_FRONT[g.shape] * ds.z, moving ? s * stepAmp : 0, this.shoe, this.shoeStar, floor);
    }

    // Arms with puff sleeves (bigger on a ball gown) and white gloves with the lilac gown.
    const puff = g.shape === 'ball' ? 1.2 : 1;
    for (let i = 0; i < 2; i++) {
      const x = i ? 0.158 : -0.158;
      const sh = _k.from(root).at(x, 0.78, 0).roll(armRoll[i]).tilt(armPitch[i]);
      m.from(sh).at(0, -0.25, 0).size(0.034, 0.25, 0.034);
      L.push(B.Limb, m, c.skin, 0);
      m.from(sh).at(0, -0.262, 0).size(g.gloves ? 0.05 : 0.044);
      L.push(B.Lo, m, c.hand, 0);
      m.from(root).at(x * 1.02, 0.79, 0).size(0.088 * puff, 0.078 * puff, 0.084 * puff);
      L.push(B.Mid, m, c.sleeve, 0.15);
    }

    // The gown's extras, on any gown: fairy wings, or a bow at the back of the sash.
    if (look.extra === 'wings') wings(L, root, Math.sin(this.wingPhase) * 0.25, this.fold, c.white, c.gownMain);
    else if (look.extra === 'bow') backBow(L, root, c.backBow, t);
    drawNecklace(L, look.necklace, root, ds, this.jewel);

    // Head: a big round head with the hair as a cap, a soft fringe and side locks.
    const hair = this.hair;
    const neck = _n.from(root).at(0, 0.86, 0).turn(this.headYaw).tilt(headPitch).roll(headRoll);
    const head = _h.from(neck).at(0, 0.22, 0);
    this.headAt.setFromMatrixPosition(head);
    m.from(head).size(HR * 1.02, HR * 0.98, HR);
    L.push(B.Fine, m, c.skin, 0);
    m.from(head).at(0, 0.036, -0.032).size(0.266, 0.258, 0.262);
    L.push(B.Fine, m, hair.base, 0.2);
    // The hair at her nape, so the back of her head is hair when she turns round (the cap sits high at the back).
    m.from(head).at(0, -0.05, -0.075).size(0.244, 0.214, 0.232);
    L.push(B.Mid, m, hair.base, 0.15);
    // A soft scalloped fringe over the forehead and a lock in front of each ear.
    for (let k = 0; k < 4; k++) {
      const u = (k - 1.5) * 0.25;
      onHead(m.from(head), u, 0.54 - u * u * 0.5, -0.028).roll(u * -0.9).size(0.078, 0.062, 0.045);
      L.push(B.Mid, m, hair.fringe[k], 0.15);
    }
    for (const sg of [-1, 1]) {
      onHead(m.from(head), sg * 0.84, 0.08, -0.035).roll(sg * -0.2).size(0.06, 0.105, 0.05);
      L.push(B.Mid, m, hair.locks[sg > 0 ? 1 : 0], 0.15);
    }

    // Face: big eyes with two highlights and lashes, rosy cheeks, a small smile.
    const closed = blinking ? shut > 0.55 : this.blink > 0 && !happy;
    for (let i = 0; i < 2; i++) {
      const sg = i ? 1 : -1;
      const eye = onHead(_k.from(head), sg * 0.36, -0.1, -0.004);
      if (happy && !blinking) {
        m.from(eye).at(0, -0.006, 0.008).size(0.05, 0.042, 1);
        L.push(B.Arc, m, c.lash, 0);
      } else if (closed) {
        m.from(eye).at(0, -0.004, 0.008).roll(Math.PI).size(0.05, 0.03, 1);
        L.push(B.Arc, m, c.lash, 0);
      } else {
        // In the slow blink the eye narrows before it closes.
        const h = wide * (1 - shut * 0.6);
        m.from(eye).size(0.056 * wide, 0.07 * h, 0.012);
        L.push(B.Mid, m, c.white, 0);
        m.from(eye).at(0, -0.006, 0.0125).size(0.045 * wide, 0.053 * h, 1);
        L.push(B.Iris, m, c.iris, 0);
        m.from(eye).at(-0.016, 0.019 * h, 0.0132).size(0.016, 0.019, 1);
        L.push(B.Dot, m, c.white, 0);
        m.from(eye).at(0.015, -0.025 * h, 0.0132).size(0.008);
        L.push(B.Dot, m, c.white, 0);
        m.from(eye).at(0, 0, 0.009).size(0.057 * wide, 0.07 * h, 1);
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
      const big = happy || grin;
      onHead(m.from(head), 0, -0.45, 0.004).roll(Math.PI).size(big ? 0.034 : 0.027, big ? 0.026 : 0.018, 1);
      L.push(B.Arc, m, c.mouth, 0);
    }
    onHead(_k.from(head), 0, -0.1, 0).decompose(this.eyesAt, _q, _sc);
    // Earrings below her side locks, hanging straight down whatever her head does.
    if (look.earrings !== 'none') {
      for (const sg of [-1, 1]) {
        onHead(_a.from(head), sg * 0.88, -0.2, 0.004).decompose(_ep, _q, _sc);
        _a.makeRotationY(this.heading + spin + sg * 1.2).setPosition(_ep);
        drawEarring(L, look.earrings, _a, sg, t, this.jewel);
      }
    }

    // The crown, with its gems and tips in the outline colour.
    const cs = this.crownScale;
    this.crownMesh.visible = cs > 0.02;
    if (this.crownMesh.visible) {
      const pop = cs * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, cs)) * (this.crownOn ? 1 : 0));
      const z = CROWN_SIZE * pop;
      // The band rests on her hair a little lower than before, as it is wider now.
      const cm = _k.from(head).at(0, 0.212, -0.02 + crownForward(look.style)).tilt(-0.2).size(0.115 * z, 0.1 * z, 0.115 * z);
      this.crownMesh.matrix.copy(cm);
      this.crownMesh.matrixWorldNeedsUpdate = true;
      const gems = this.crownNow.parts;
      for (let i = 0; i < gems.length; i++) {
        const q = gems[i];
        m.from(cm).at(q.at[0], q.at[1], q.at[2]).size(q.size[0], q.size[1], q.size[2]);
        L.push(B.Lo, m, this.crownLine, i === 0 ? 0.8 : 0.6);
      }
    }

    // The hanging hair: chains from the style's ties, kept out of her head and dress, drawn as tubes or plaits.
    const water = wet || this.depth > 0.2 ? POND.waterY : null;
    _inv.copy(root).invert();
    // On a mount the hair also keeps out of its body and chest: it falls over its back and down its flank.
    const mount = draped ? this.seat?.u ?? null : null;
    if (mount) {
      bodyEllipsoids(mount.pose, mount.build, _body);
      _bodyInv[0].copy(_body[0]).invert();
      _bodyInv[1].copy(_body[1]).invert();
    }
    this.hairOnMount = !!mount;
    // Faster than a trot the tails fly out behind her: the wind takes up to 70% of their weight at a full gallop.
    const fly = mount ? THREE.MathUtils.clamp((mount.speed - mount.speeds.trot) / (RIDE_GALLOP - mount.speeds.trot), 0, 1) * 0.7 : 0;
    hair.update(dt, head, this.collideFn, groundY, water, fly);

    // The hair thing on both sides (today's bow spots), each with two ribbon tails in its colour.
    const thing = look.thing;
    for (const sg of [-1, 1]) {
      const at = onHead(_a.from(head), sg * 0.8, 0.45, 0.02).turn(sg * -0.25);
      if (sg > 0) this.thingAt.setFromMatrixPosition(at);
      else _r.from(at);
      drawThing(L, thing, at, sg, t, this.flutter, this.colours);
    }
    hair.draw(L, head, this.colours);
    // The picnic rose, tucked in just under her hair thing on her right, where it shows from the front and the side.
    if (this.rose) drawRose(L, _r.at(0.012, -0.075, 0.03));

    m.from(root).at(0, 0.45, 0).decompose(this.dressAt, _q, _sc);
    if (this.portraitOn) finer(L);
    this.drawn = true;
  }

  /** Keep a hair chain point out of her head and her dress (this frame's root, its inverse `_inv`, and head). */
  private collide(q: THREE.Vector3): void {
    if (this.hairOnMount) {
      // Out of the mount's body and chest (unit spheres in `_bodyInv`), a little past their surface.
      for (let i = 0; i < 2; i++) {
        _l.copy(q).applyMatrix4(_bodyInv[i]);
        const r = _l.length();
        if (r < 1.03 && r > 1e-5) q.copy(_l.multiplyScalar(1.03 / r).applyMatrix4(_body[i]));
      }
    }
    _hc.setFromMatrixPosition(_h);
    _d.subVectors(q, _hc);
    const dh = _d.length();
    const headR = 0.29 + this.extraR;
    if (dh < headR && dh > 1e-5) q.copy(_hc).addScaledVector(_d, headR / dh);
    _l.copy(q).applyMatrix4(_inv);
    const r = this.skirtRadius(_l.y);
    if (r > 0) {
      const d = Math.hypot(_l.x, _l.z);
      if (d < r && d > 1e-5) {
        _l.x *= r / d;
        _l.z *= r / d;
        q.copy(_l.applyMatrix4(_root));
      }
    }
  }

  /** The dress radius the hair keeps outside at height y in root space (0 where there is no dress), this frame. */
  private skirtRadius(y: number): number {
    const ds = this.dressScale;
    const r = skirtAt(this.skirt, y / ds.y - ds.w);
    return r > 0 ? r * Math.max(ds.x, ds.z) + this.extraR : 0;
  }

  /**
   * For the tests: how far the deepest free hair chain point is inside her head sphere or her dress this frame, in
   * metres (0 when all are outside).
   */
  hairPenetration(): number {
    let worst = 0;
    _hc.setFromMatrixPosition(_h);
    for (const ch of this.hair.chains) {
      for (let i = 2; i < ch.p.length; i++) {
        const q = ch.p[i];
        worst = Math.max(worst, 0.29 + this.extraR - q.distanceTo(_hc));
        _l.copy(q).applyMatrix4(_inv);
        const r = this.skirtRadius(_l.y);
        if (r > 0) worst = Math.max(worst, r - Math.hypot(_l.x, _l.z));
      }
    }
    return worst;
  }

  /** Triangles she draws now: her parts, the dress, the crown and the hair tubes (the budget helper). */
  triangles(): number {
    const L = this.parts;
    let n = 0;
    for (let i = 0; i < L.n; i++) n += shapeTriangles(L.id[i] as BatchId);
    const g = this.dress.geometry;
    n += g.index!.count / 3;
    if (this.crownMesh.visible) n += this.crownMesh.geometry.index!.count / 3;
    return n + this.hair.tubes.triangles;
  }
}

/** The portrait: her Mid parts as Fine (while the Fine batch has room, it is only hers) and her Lo parts as Mid. */
function finer(L: PartList): void {
  let fine = 0;
  for (let i = 0; i < L.n; i++) if (L.id[i] === B.Fine) fine++;
  for (let i = 0; i < L.n; i++) {
    if (L.id[i] === B.Mid && fine < CAPACITY[B.Fine]) {
      L.id[i] = B.Fine;
      fine++;
    } else if (L.id[i] === B.Lo) {
      L.id[i] = B.Mid;
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

/** Onto the surface of her head at (u, v) in head radii. */
function onHead(m: Xf, u: number, v: number, depth: number): Xf {
  return m.onSphere(HR, u, v, depth);
}

const _m = new Xf();
const _root = new Xf();
const _k = new Xf();
const _a = new Xf();
const _r = new Xf();
const _n = new Xf();
const _h = new Xf();
const _t = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _hc = new THREE.Vector3();
const _d = new THREE.Vector3();
const _l = new THREE.Vector3();
const _sp = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _sc = new THREE.Vector3();
const _ep = new THREE.Vector3();
const _seat = new THREE.Vector3();
const _body: [THREE.Matrix4, THREE.Matrix4] = [new THREE.Matrix4(), new THREE.Matrix4()];
const _bodyInv = [new THREE.Matrix4(), new THREE.Matrix4()];
const _white = new THREE.Color(1, 1, 1);
