// The game's shared state and the small helpers every part of the level uses: goals with their beacon and edge
// arrow, speech, camera framing by screen fraction, and screen points of world things.
import * as THREE from 'three';
import type { HerdMember, Layer, Place, ScreenPoint, UnicornLook, Vec2 } from '../contracts';
import type { ActorsImpl, UnicornActor } from '../actors';
import type { WorldWithExtras } from '../world';
import type { LayerExtras } from '../ui';
import { PITCH } from '../world/camera';
import { NEST, STABLE, SLIDE, WILD_EGG, dist2, doorCenter, doorIsUpper } from '../layout';
import { audio } from '../audio';
import { type Rand, seeded, wayTo } from '../content';
import { Followers } from './followers';
import { Results } from './results';
import { Run } from './run';

/** The parts of the level, in order (docs/v4/demo.md section 1). */
export const PARTS = ['welcome', 'egg1', 'naming1', 'wish1', 'pond', 'egg2', 'naming2', 'wish2', 'free', 'bedtime', 'goodnight'] as const;
export type Part = (typeof PARTS)[number];
export const isPart = (s: string | null): s is Part => !!s && (PARTS as readonly string[]).includes(s);

/** A walk goal: the beacon point, where she walks to when the arrow is tapped, and how near counts as there. */
export interface Goal {
  place: Place;
  at: Vec2;
  stand: Vec2;
  near: number;
}

export const GOALS: Record<'nest' | 'pond' | 'wildEgg' | 'stable', Goal> = {
  nest: { place: 'nest', at: NEST.center, stand: NEST.stand, near: 2.2 },
  pond: { place: 'pond', at: SLIDE.ladderBase, stand: { x: SLIDE.ladderBase.x - 1.2, z: SLIDE.ladderBase.z + 1.4 }, near: 5 },
  wildEgg: { place: 'wildEgg', at: WILD_EGG.at, stand: WILD_EGG.stand, near: 2.2 },
  stable: { place: 'stable', at: STABLE.emmaStand, stand: STABLE.emmaStand, near: 3 },
};

/** One of the two newborns: door 13 (warm egg) and door 14 (snow egg). */
export interface Baby {
  door: 13 | 14;
  look: UnicornLook;
  unicorn: UnicornActor;
  /** Set once she has named it. */
  member: HerdMember | null;
}

/** The door moment that is open (roll call or visit), for input, Lumi and the test hook. */
export interface DoorMoment {
  kind: 'roll call' | 'visit';
  door: number;
  readonly misses: number;
  readonly level: number;
  /** A door tap counts now (the goal has been said, no wrong-door reaction is playing). */
  readonly open: boolean;
  tap(door: number): void;
  replay(): void;
  idleNow(): void;
}

export interface Game {
  readonly world: WorldWithExtras;
  readonly actors: ActorsImpl;
  readonly layer: Layer & LayerExtras;
  readonly seed: number;
  rand: Rand;
  /** The starting herd of 12 (doors 1 to 12). */
  readonly herd: HerdMember[];
  babies: Baby[];
  part: Part | 'start' | 'end';
  goal: Goal | null;
  /** World taps walk, call and carry (outside cut scenes). */
  free: boolean;
  /** Bedtime: unicorn taps say hello but nobody new follows or is carried. */
  bedtime: boolean;
  door: DoorMoment | null;
  /** Who is in which stall. */
  readonly stalls: Map<number, UnicornActor>;
  readonly followers: Followers;
  /** Followers that stepped aside for an egg and its baby; they follow again after the baby's wish. */
  parked: UnicornActor[];
  readonly results: Results;
  run: Run;
  /** Someone slid down into the pond since the pond part began. */
  slid: boolean;
  /** performance.now() of her last touch anywhere (free play prompts after a quiet while). */
  lastTouch: number;
  /** The word of the bath wish at the pond, kept out of the second bath wish. */
  pondWord: string | null;
  /** Doors whose unicorn is walking in right now (not in g.stalls until it is inside). */
  readonly entering: Set<number>;
}

export function createGame(o: { world: WorldWithExtras; actors: ActorsImpl; layer: Layer & LayerExtras; seed: number; herd: HerdMember[] }): Game {
  return {
    ...o,
    rand: seeded(o.seed),
    babies: [],
    part: 'start',
    goal: null,
    free: false,
    bedtime: false,
    door: null,
    stalls: new Map(),
    followers: new Followers(),
    parked: [],
    results: new Results(),
    run: new Run((fn) => o.world.onFrame(fn)),
    slid: false,
    lastTouch: performance.now(),
    pondWord: null,
    entering: new Set(),
  };
}

// ---- small helpers ---------------------------------------------------------------------------------------------

export const v3 = (p: Vec2, y = 0): THREE.Vector3 => new THREE.Vector3(p.x, y, p.z);
export const flat = (p: THREE.Vector3): Vec2 => ({ x: p.x, z: p.z });

/** Every herd member and named baby, by unicorn id. */
export function memberOf(g: Game, id: string): HerdMember | undefined {
  return g.herd.find((h) => h.id === id) ?? g.babies.find((b) => b.unicorn.id === id)?.member ?? undefined;
}

/** The herd member or named baby whose stall is door n. */
export function memberOfDoor(g: Game, door: number): HerdMember | undefined {
  return g.herd.find((h) => h.door === door) ?? g.babies.find((b) => b.door === door)?.member ?? undefined;
}

export function princessAt(g: Game): Vec2 {
  return flat(g.actors.princess.position);
}

export function near(g: Game, p: Vec2, r: number): boolean {
  return dist2(princessAt(g), p) <= r;
}

/** The stable yard: anywhere in front of the doors, from the door plane to z = -7, between the yard's sides. */
const YARD_NEAR_Z = -7;
export function inStableYard(p: Vec2): boolean {
  return Math.abs(p.x) <= STABLE.yard.halfX && p.z >= STABLE.frontZ && p.z <= YARD_NEAR_Z;
}

/** Has she reached the goal? Near its stand or its point; the stable counts anywhere in the yard. */
export function reached(g: Game, goal: Goal): boolean {
  if (goal === GOALS.stable && inStableYard(princessAt(g))) return true;
  return near(g, goal.stand, goal.near) || near(g, goal.at, goal.near);
}

export function screenOf(g: Game, p: THREE.Vector3): ScreenPoint {
  return g.world.toScreen(p);
}

const _head = new THREE.Vector3();
/** A unicorn's head top on screen (bubbles, name tags, the naming and wish anchors). */
export function headScreen(g: Game, u: UnicornActor): ScreenPoint {
  return g.world.toScreen(u.headTop(_head));
}

/** The middle of door n's storey on the stable front (taps there pick the door). */
export function doorPoint(n: number): THREE.Vector3 {
  const c = doorCenter(n);
  return new THREE.Vector3(c.x, (doorIsUpper(n) ? STABLE.upperFloorY : 0) + STABLE.upperFloorY / 2, c.z);
}

/** Princess Emma walks to a point along a route. */
export function walkTo(g: Game, to: Vec2, run = false): Promise<boolean> {
  return g.actors.princess.walkTo(g.world.route(princessAt(g), to), { run });
}

/** Set the walk goal: beacon, edge arrow (tap walks her there) and the "this way" helper. */
export function setGoal(g: Game, goal: Goal | null): void {
  g.goal = goal;
  g.world.markGoal(goal ? goal.at : null);
  if (!goal) {
    g.layer.arrow(null);
    return;
  }
  const at = v3(goal.at, 0.6);
  g.layer.arrow({ place: goal.place, at: () => uncovered(g.world.toScreen(at)) }, () => {
    if (g.free) void walkTo(g, goal.stand);
  });
}

/**
 * A goal point hidden behind Lumi (top left), the home button (top right) or the food basket (bottom right) counts
 * as just off screen, so the edge arrow shows for it.
 */
function uncovered(s: ScreenPoint): ScreenPoint {
  if (!s.visible) return s;
  const w = innerWidth;
  const h = innerHeight;
  const u = Math.min(w / 1180, h / 820);
  if ((s.x < 190 * u && s.y < 190 * u) || (s.x > w - 150 * u && s.y < 150 * u)) return { x: s.x, y: -40, visible: true };
  if (s.x > w - 160 * u && s.y > h - 160 * u) return { x: s.x, y: h + 40, visible: true };
  return s;
}

/** Elizabeth (or a unicorn) speaks; the run stops waiting if it is cancelled. */
export function say(g: Game, ids: string[]): Promise<void> {
  return g.run.w(audio.sayAll(ids));
}

/** Queen Lumi speaks from her moon. */
export function lumiSay(g: Game, ids: string[]): Promise<void> {
  return g.run.w(g.layer.lumi.speak(ids));
}

/** The "this way" line for the current goal. */
export function sayWay(g: Game): void {
  if (g.goal) {
    const ids = wayTo(g.goal.place);
    if (ids.length) void audio.sayAll(ids);
  }
}

let asideQueued = false;
/**
 * A line on the side (a unicorn's name after a tap, "Yum!"): it never cuts the speech that plays. While speech
 * plays it waits its turn, and only one waits at a time; more taps meanwhile only show the tag and the hop.
 */
export function sayAside(id: string): void {
  if (!audio.speaking) {
    void audio.say(id);
    return;
  }
  if (asideQueued) return;
  asideQueued = true;
  void audio.say(id, { queue: true }).finally(() => (asideQueued = false));
}

/** Time of day in the 3D world and the soft colour wash of the 2D layer, together. */
export function setTime(g: Game, t: number, ms?: number): Promise<void> {
  g.layer.sky(t);
  return g.world.setTimeOfDay(t, ms);
}

/** Preload clips, but never wait more than `ms` for them. */
export async function preload(g: Game, ids: string[], ms = 2500): Promise<void> {
  await g.run.w(Promise.race([audio.preload(ids).then(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]));
}

/**
 * Frame the ground at `center` so that `point` shows at `frac` of the screen height from the top. The frame's
 * view shift is a pure screen offset, so it is the wanted fraction minus where the point would sit without one.
 * `pitch` (degrees below the horizon) defaults to the follow pitch; a lower one shows more of what stands behind.
 * `keep` is a second point that must show at least `keep.frac` from the top (her crown, when she stands further back
 * than the baby): the view moves down for it when needed.
 */
export function frameAt(
  g: Game,
  center: Vec2,
  width: number,
  point: THREE.Vector3,
  frac: number,
  ms = 900,
  pitchDeg = PITCH,
  keep?: { point: THREE.Vector3; frac: number },
): Promise<void> {
  const cam = g.world.camera;
  const probe = new THREE.PerspectiveCamera(cam.fov, cam.aspect, cam.near, cam.far);
  const dist = width / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);
  probe.position.set(center.x, Math.sin(pitch) * dist, center.z + Math.cos(pitch) * dist);
  probe.lookAt(center.x, 0, center.z);
  probe.updateMatrixWorld();
  const y0 = (1 - point.clone().project(probe).y) / 2;
  let shift = frac - y0;
  if (keep) shift = Math.max(shift, keep.frac - (1 - keep.point.clone().project(probe).y) / 2);
  const shiftY = THREE.MathUtils.clamp(shift, -0.35, 0.35);
  return g.run.w(g.world.frame(center, width, { ms, shiftY, pitch: pitchDeg }));
}
