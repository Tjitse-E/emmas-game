// Riding (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5): Bella and Hazel in the paddock, getting on, the trip out along
// the trail to two signposts and a star egg, and home. The ride is a hub place: she walks to her stand, both mounts
// turn to her and a saddle icon floats over each saddle (a tap on the mount counts as its icon); she hops up
// side-saddle and up to two babies trot behind on the mount's track. Out through the gate to the fork, sign 1, the
// happy beat at its clearing, back to the fork, sign 2, the star egg at its clearing (three sums, the hatch, the
// naming and the baby's wish beside her), and home through the gate, where she gets off.
//
// The trail's roads, slots and kit are drawn only from getting on to getting off (world.trail.show), and a slot is
// dressed only while the mount stands at the fork and none is on screen. The sign level folds and is saved only after
// home, so a trip left halfway (a reload, a jump) changes no level; seen.ride is written as she first sits.
import * as THREE from 'three';
import type { MountId, MomentResult, Outcome, ScreenPoint, SignWord, Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { MOUNT_LOOKS } from '../actors/mount';
import { GRAZE_HOMES, RIDE, RIDE_PATHS, dist2 } from '../layout';
import { CLIPS, planTrip, type TripPlan } from '../content';
import { audio } from '../audio';
import { type Baby, type Game, checked, flat, frameAt, lumiSay, memberOf, princessAt, say, sayAside, walkTo } from './game';
import { momentLog } from './moments';
import { foldSigns } from './reading';
import { newbornAt, runEggSums } from './eggs-part';
import type { StartStep } from './options';
import { saddleCentre } from '../ui/saddle';

/** The two mounts: their herd ids, names and the Elizabeth clips of their names (v3's name-bella and name-hazel). */
export const MOUNTS: Record<MountId, { id: string; name: string; clip: string }> = {
  bella: { id: 'mount-bella', name: 'Bella', clip: 'name-bella' },
  hazel: { id: 'mount-hazel', name: 'Hazel', clip: 'name-hazel' },
};
const MOUNT_IDS: readonly MountId[] = ['bella', 'hazel'];

/** Where a trip is: at the paddock, out to the fork, a sign, a clearing, back, the star egg, its naming and wish, home. */
export type RideStep = 'paddock' | 'out' | 'sign1' | 'clearing1' | 'back' | 'sign2' | 'clearing2' | 'egg' | 'naming' | 'wish' | 'home';

/** The trip under way (g.ride), or null while she is not riding. */
export interface RideState {
  trip: 1 | 2;
  mount: MountId | null;
  step: RideStep;
  /** The unicorns that ride along behind the mount (ids). */
  followers: string[];
}

// ---- the numbers of a trip (5.4 and 5.5) --------------------------------------------------------------------------

/** "Tap the saddle, and ride!" again after 20 s without a tap; after 45 s the ghost taps an icon and she gets on. */
export const SADDLE_AGAIN_MS = 20_000;
export const SADDLE_GHOST_MS = 45_000;
/** The saddle icon floats this far over the saddle. */
const ICON_UP = 0.35;
/** The mount stops this far before the fork, facing the signpost, and the fork frame is this wide. */
export const FORK_STOP = 2.2;
const FORK_WIDTH = 8;
/** It stops this far before a clearing's middle, where the kit stands. */
const CLEARING_STOP = 3;
/** The happy beat at clearing 1. */
const BEAT_MS = 5000;
/** A wrong road: two steps onto it at 1 m/s, a shake of the head, and back. */
const WRONG_STEP_M = 1.2;
const WRONG_SPEED = 1;
/** The slots wait this long at most to be off screen before they are dressed (the fork frame has settled by then). */
export const DRESS_WAIT_MS = 4000;
/** After the trip the mount walks back to its spot, or is put there with a sparkle after 3 s. */
const BACK_MS = 3000;
/** The clearings where the happy beat splashes. */
const WET: readonly SignWord[] = ['pond', 'pool', 'beach'];
/** Her stand beside a mount: out to its left, where she sits. */
const BESIDE = 0.95;
/** A rider further than this from its place on the track walks there by the paths first; one not there in time is put there with a sparkle. */
export const JOIN_M = 2.5;
export const JOIN_WAIT_MS = 3000;
/** The mount turns round on the spot at a clearing while its riders step aside. */
const TURN_MS = 700;

/**
 * The trail lane's fork frame and signpost, once the layout has them (the pose its test proves keeps every slot out of
 * view and the cards clear of her head); until then step 0's frame between the mount and the fork.
 */
const TRAIL_RIDE = RIDE as typeof RIDE & { forkFrame?: { center: Vec2; width: number; pitch?: number; shiftY?: number }; post?: Vec2 };

/** The trip's own working state, kept off the game (the snapshot shows g.ride). */
interface Trip {
  trip: 1 | 2;
  id: MountId | null;
  mount: UnicornActor | null;
  plan: TripPlan | null;
  /** Ride along behind the mount (her newborns, her followers, or two called herd babies), and the wild baby. */
  riders: UnicornActor[];
  wild: UnicornActor | null;
  /** Of the riders: those that followed her before (they follow her again), and the herd babies called for the ride. */
  following: UnicornActor[];
  called: UnicornActor[];
  /** The riders (and the wild baby) in their order behind the mount: 1.6, 3.0 and 4.4 m. A turn round reverses it. */
  order: UnicornActor[];
  outcomes: Outcome[];
  /** The sign level is folded (once, after home). */
  folded: boolean;
  /** The road each sign sent the mount down (the target's card). */
  roads: number[];
  /** She sits on the mount (from getting on, or a snapped trip, to getting off). */
  seated: boolean;
  /** Stops counting her mounted time (visible frames only). */
  clockOff: (() => void) | null;
  /** Takes the run's cleanup off again at getting off. */
  undo: (() => void) | null;
}

/** A trip snapped by ?step= (snapTrip), which the next ridePlace carries on. */
const snapped = new WeakMap<Game, Trip>();
/** While the saddle icons wait: a tap on a mount counts as its icon. */
const choosing = new WeakMap<Game, (m: MountId) => void>();
/** The runs on which ?step= has been used (a trip snaps once a play). */
const stepped = new WeakSet<object>();

/** One of the two mounts. */
export function isMount(u: UnicornActor): boolean {
  return u.id === MOUNTS.bella.id || u.id === MOUNTS.hazel.id;
}

/** Bella and Hazel at their spots in the paddock, turned towards her stand, grazing within 0.6 m. */
export function addMounts(g: Game): void {
  for (const m of MOUNT_IDS) {
    const at = RIDE.mounts[m];
    const u = g.actors.herd.add({ id: MOUNTS[m].id, name: MOUNTS[m].name, look: MOUNT_LOOKS[m], at });
    u.place(at, Math.atan2(RIDE.stand.x - at.x, RIDE.stand.z - at.z));
    u.graze(at, { radius: 0.6 });
  }
}

/** The mount actors, or null when they are not there (a test game, a harness). */
function mountOf(g: Game, m: MountId): UnicornActor | null {
  return g.actors.herd.get(MOUNTS[m].id) ?? null;
}

/** A unicorn that can come along now: not a mount, not the herd baby whose wish waits, not in a stall or the water. */
function free(g: Game, u: UnicornActor | null | undefined): u is UnicornActor {
  return !!u && !isMount(u) && u !== g.waiting && !['stall', 'hatching', 'slide', 'swim', 'carried'].includes(u.mode);
}

/**
 * Who rides along (5.4): her newborns first (the newest first), then her followers nearest the paddock, at most two;
 * with neither, the two herd babies nearest the paddock. The followers left behind go back to graze. Pure choice.
 */
export function rideFollowers(g: Game): { ride: UnicornActor[]; graze: UnicornActor[] } {
  const near = (a: UnicornActor, b: UnicornActor) => dist2(flat(a.position), RIDE.stand) - dist2(flat(b.position), RIDE.stand);
  const newborns = g.babies
    .slice()
    .reverse()
    .map((b) => b.unicorn)
    .filter((u) => free(g, u));
  const followers = g.followers.list.filter((u) => free(g, u) && !newborns.includes(u)).sort(near);
  let ride = [...newborns, ...followers].slice(0, 2);
  if (!ride.length) {
    ride = g.herd
      .map((h) => g.actors.herd.get(h.id))
      .filter((u): u is UnicornActor => free(g, u) && u.look.stage === 'baby' && u.followSlot === null && !g.quests.helpers.includes(u.id))
      .sort(near)
      .slice(0, 2);
  }
  return { ride, graze: g.followers.list.filter((u) => !ride.includes(u)) };
}

// ---- paths ----------------------------------------------------------------------------------------------------------

/** A stretch of a path by arc length, from `a` to `b` metres (either way), as a curve of its own. */
class Stretch extends THREE.Curve<THREE.Vector3> {
  private readonly c: THREE.Curve<THREE.Vector3>;
  private readonly a: number;
  private readonly b: number;
  private readonly len: number;
  constructor(c: THREE.Curve<THREE.Vector3>, a: number, b: number) {
    super();
    this.c = c;
    this.a = a;
    this.b = b;
    this.len = c.getLength();
  }
  override getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const s = this.a + (this.b - this.a) * t;
    return this.c.getPointAt(this.len > 0 ? THREE.MathUtils.clamp(s / this.len, 0, 1) : 0, out);
  }
}

/** Several stretches one after the other, as one curve. */
function joined(...parts: THREE.Curve<THREE.Vector3>[]): THREE.Curve<THREE.Vector3> {
  const p = new THREE.CurvePath<THREE.Vector3>();
  for (const c of parts) p.add(c);
  return p;
}

const outOf = (m: MountId) => RIDE_PATHS.out[m];
const lenOf = (c: THREE.Curve<THREE.Vector3>) => c.getLength();
/** Where the mount stands at the fork, facing the signpost. */
function forkStand(m: MountId): THREE.Vector3 {
  const out = outOf(m);
  return out.getPointAt(Math.max(0, lenOf(out) - FORK_STOP) / lenOf(out));
}

// ---- the place ------------------------------------------------------------------------------------------------------

/**
 * The ride as a hub place: the paddock, getting on, the trip and home; resolves framed with its release. A trip
 * snapped by ?step= (snapTrip) carries on from its step.
 */
export async function ridePlace(g: Game, trip: 1 | 2): Promise<() => void> {
  const bella = mountOf(g, 'bella');
  if (!bella || !mountOf(g, 'hazel')) return () => {};
  if (!snapped.has(g) && trip === 1 && isTripStep(g.options.step) && !stepped.has(g.run)) {
    stepped.add(g.run);
    snapTrip(g, g.options.step);
  }
  const t: Trip = snapped.get(g) ?? newTrip(trip);
  snapped.delete(g);
  t.trip = trip;
  g.ride ??= { trip, mount: t.id, step: 'paddock', followers: [] };
  g.ride.trip = trip;
  g.free = false;
  const at = g.ride.step;
  t.undo = g.run.defer(() => abort(g, t));
  const from = (s: RideStep) => STEP_ORDER.indexOf(at) <= STEP_ORDER.indexOf(s);

  if (from('paddock')) await paddock(g, t);
  if (from('out')) await rideOut(g, t);
  if (from('sign1')) await signpost(g, t, 1);
  if (from('clearing1')) await clearing1(g, t);
  if (from('sign2')) await signpost(g, t, 2);
  if (from('clearing2')) await toClearing(g, t, 2);
  if (from('naming')) await starEgg(g, t, !from('egg'));
  await rideHome(g, t, from('home') && at === 'home');
  // Home: the sign level folds and is saved now, so a jump while she gets off keeps it.
  keepSigns(g, t);
  await getOff(g, t);
  return () => {
    g.world.releaseFrame();
    g.free = true;
  };
}

const STEP_ORDER: readonly RideStep[] = ['paddock', 'out', 'sign1', 'clearing1', 'back', 'sign2', 'clearing2', 'egg', 'naming', 'wish', 'home'];
const TRIP_STEPS: readonly StartStep[] = ['sign2', 'egg', 'naming', 'wish', 'home'];
const isTripStep = (s: StartStep | null): s is StartStep => !!s && TRIP_STEPS.includes(s);

function newTrip(trip: 1 | 2): Trip {
  return {
    trip, id: null, mount: null, plan: null, riders: [], wild: null, following: [], called: [], order: [], outcomes: [], folded: false, roads: [],
    seated: false, clockOff: null, undo: null,
  };
}

function setStep(g: Game, s: RideStep): void {
  if (g.ride) g.ride.step = s;
}

/** The saddle icon's point over a mount's saddle. */
function iconPoint(u: UnicornActor): THREE.Vector3 {
  return u.saddleTop(new THREE.Vector3()).add(UP);
}

/**
 * Wait for a frame where pred(ms) holds, or `maxMs` of visible time; true when it held. Its cleanup leaves the run's
 * list as it found it, so each ride leaves `run.deferred` level (the long play checks it).
 */
function waitFor(g: Game, pred: (ms: number) => boolean, maxMs = Infinity): Promise<boolean> {
  if (!g.run.alive) return g.run.w(Promise.resolve(false));
  return g.run.w(
    new Promise<boolean>((resolve) => {
      let ms = 0;
      let done = false;
      let undo: () => void = () => {};
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        off();
        undo();
        resolve(v);
      };
      const off = g.world.onFrame((dt) => {
        ms += dt * 1000;
        if (pred(ms)) finish(true);
        else if (ms >= maxMs) finish(false);
      });
      undo = g.run.defer(() => finish(false));
    }),
  );
}

/** Load clips on the side; a stopped run or a missing clip never matters here. */
function warm(ids: string[]): void {
  try {
    void audio.preload(ids)?.catch?.(() => undefined);
  } catch {
    /* nothing to load */
  }
}

/** She walks to her stand; a long way (or a slide still going) ends with her there at once. */
async function walkToStand(g: Game, to: Vec2): Promise<void> {
  const her = g.actors.princess;
  await waitFor(g, () => ['idle', 'walk', 'run'].includes(her.mode), 15_000);
  await g.run.w(Promise.race([walkTo(g, to), new Promise((r) => setTimeout(r, 12_000))]));
  if (dist2(princessAt(g), to) > 0.6) g.actors.placePrincess(to, 0);
}

/** 5.4 getting on: her stand, the mounts turn to her, the saddle icons and their lines, her tap (or the ghost's). */
async function paddock(g: Game, t: Trip): Promise<void> {
  const { actors, layer, world } = g;
  setStep(g, 'paddock');
  const first = !g.save.data.seen.ride;
  warm([...CLIPS.saddle, ...(first ? CLIPS.saddleReady : []), ...MOUNT_IDS.map((m) => MOUNTS[m].clip)]);
  // Those who ride along and do not follow her (a newborn left grazing, or with no newborn and no follower the two herd
  // babies nearest the paddock) come trotting by the paths.
  const pick = rideFollowers(g);
  for (const u of pick.ride) {
    if (g.followers.list.includes(u)) continue;
    void u.goTo(world.route(flat(u.position), world.nearestWalkable({ x: RIDE.stand.x + 0.8, z: RIDE.stand.z + 1.2 })), { trot: true });
  }
  await walkToStand(g, RIDE.stand);
  const mounts = MOUNT_IDS.map((m) => mountOf(g, m)!);
  for (const u of mounts) u.faceTo(RIDE.stand);
  actors.princess.face({ x: (RIDE.mounts.bella.x + RIDE.mounts.hazel.x) / 2, z: (RIDE.mounts.bella.z + RIDE.mounts.hazel.z) / 2 });

  let chosen: MountId | null = null;
  const choose = (m: MountId) => {
    chosen ??= m;
  };
  choosing.set(g, choose);
  const at = Object.fromEntries(MOUNT_IDS.map((m, i) => [m, () => world.toScreen(iconPoint(mounts[i]))])) as Record<MountId, () => ScreenPoint>;
  layer.saddles({ at, onTap: choose });
  try {
    if (first) {
      await lumiSay(g, CLIPS.saddleReady);
      if (!chosen) await say(g, CLIPS.saddle);
      // The ghost taps the middle of the icon, which floats over the saddle point.
      if (!chosen) await g.run.w(layer.ghost.tap(() => saddleCentre(at.bella())));
    } else await say(g, CLIPS.saddle);
    // 20 s without a tap: the line again; 45 s: the ghost taps the nearer icon, and she gets on.
    if (!(await waitFor(g, () => chosen !== null, SADDLE_AGAIN_MS))) {
      await say(g, CLIPS.saddle);
      if (!(await waitFor(g, () => chosen !== null, SADDLE_GHOST_MS - SADDLE_AGAIN_MS))) {
        const m: MountId = dist2(princessAt(g), RIDE.mounts.bella) <= dist2(princessAt(g), RIDE.mounts.hazel) ? 'bella' : 'hazel';
        await g.run.w(layer.ghost.tap(() => saddleCentre(at[m]())));
        chosen ??= m;
      }
    }
  } finally {
    choosing.delete(g);
    layer.saddles(null);
  }
  await getOn(g, t, chosen!);
}

/** She hops up side-saddle; the roads show, the riders line up on the mount's track, the gate opens. */
async function getOn(g: Game, t: Trip, id: MountId): Promise<void> {
  const { actors, world } = g;
  const mount = mountOf(g, id)!;
  t.id = id;
  t.mount = mount;
  if (g.ride) g.ride.mount = id;
  // The trip's two signs, planned at saddle-up from its own stream; trip 2 sees what trip 1 used.
  t.plan ??= plan(g, t.trip, id);
  const pick = rideFollowers(g);
  t.following = pick.ride.filter((u) => g.followers.list.includes(u) || g.babies.some((b) => b.unicorn === u && b.member));
  t.called = pick.ride.filter((u) => !t.following.includes(u));
  t.riders = pick.ride;
  for (const u of g.followers.list.slice()) g.followers.remove(u);
  for (const u of pick.graze) grazeHome(g, u);
  // Beside its left, then up.
  const yaw = mount.yaw;
  const side = world.nearestWalkable({ x: mount.position.x + Math.cos(yaw) * BESIDE, z: mount.position.z - Math.sin(yaw) * BESIDE });
  await g.run.w(Promise.race([walkTo(g, side), new Promise((r) => setTimeout(r, 4000))]));
  mount.faceTo({ x: mount.position.x + Math.sin(yaw), z: mount.position.z + Math.cos(yaw) });
  await g.run.w(actors.princess.mount(mount));
  sfx('nicker-1');
  seat(g, t);
  g.save.write((s) => void (s.seen.ride = true));
  world.trail.show(true);
  // The mount she did not choose grazes again by its spot.
  const otherId: MountId = id === 'bella' ? 'hazel' : 'bella';
  mountOf(g, otherId)?.graze(RIDE.mounts[otherId], { radius: 0.6 });
  // The riders' lead-in runs from behind her stand to the mount, so they line up there before it sets off.
  const back = { x: RIDE.stand.x - mount.position.x, z: RIDE.stand.z - mount.position.z };
  const k = 3 / Math.max(0.1, Math.hypot(back.x, back.z));
  mount.seedTrack([{ x: RIDE.stand.x + back.x * k, z: RIDE.stand.z + back.z * k }, RIDE.stand, flat(mount.position)]);
  t.order = t.riders.slice();
  await joinTrack(g, t);
  t.order.forEach((u, i) => u.trackBehind(mount, RIDE.gaps[i]));
  if (g.ride) g.ride.followers = t.riders.map((u) => u.id);
  focus(g, t);
  world.cameraClamp('ride');
  world.follow(() => ahead(mount));
  sfx('stable-door');
  void world.trail.gate(true);
}

/** She sits: her mounted time counts from now, in visible frames only (a hidden page draws none). */
function seat(g: Game, t: Trip): void {
  t.seated = true;
  t.clockOff?.();
  t.clockOff = g.world.onFrame((dt) => {
    if (g.actors.princess.mountedOn) g.clock.rideMs += Math.min(dt, 1) * 1000;
  });
}

/**
 * Each rider walks to its place on the mount's track by the paths when it is more than JOIN_M from it (the track
 * itself runs outside the routes); one that is not there after JOIN_WAIT_MS is put there with a sparkle.
 */
async function joinTrack(g: Game, t: Trip): Promise<void> {
  const { actors, world } = g;
  const mount = t.mount!;
  const place = (i: number) => mount.trackPoint(RIDE.gaps[i]);
  const far = (u: UnicornActor, i: number) => {
    const q = place(i);
    return Math.hypot(u.position.x - q.x, u.position.z - q.z) > JOIN_M;
  };
  const walking = t.order.filter((u, i) => far(u, i));
  for (const u of walking) {
    const q = place(t.order.indexOf(u));
    void u.goTo(world.route(flat(u.position), world.nearestWalkable(q)), { trot: true });
  }
  if (!walking.length) return;
  await waitFor(g, () => t.order.every((u, i) => !far(u, i)), JOIN_WAIT_MS);
  t.order.forEach((u, i) => {
    if (!far(u, i)) return;
    const q = place(i);
    actors.fx.sparkle(new THREE.Vector3(u.position.x, 0.5, u.position.z), { count: 12 });
    u.place({ x: q.x, z: q.z }, q.heading);
    actors.fx.sparkle(new THREE.Vector3(q.x, 0.5, q.z), { count: 16 });
  });
}

/**
 * The mount turns round on the spot (a clearing), so its track folds back: the riders step out to its free side (her
 * side now, its right once it has turned), it passes them, and they fall in behind it in the opposite order, the wild
 * baby last. Ends facing `toward`.
 */
async function turnRound(g: Game, t: Trip, toward: Vec2): Promise<void> {
  const mount = t.mount!;
  mount.turnRound({ x: Math.cos(mount.yaw), z: -Math.sin(mount.yaw) });
  t.order = t.order.filter((u) => u !== t.wild).reverse();
  if (t.wild) t.order.push(t.wild);
  t.order.forEach((u, i) => u.trackBehind(mount, RIDE.gaps[i]));
  mount.faceTo(toward);
  await g.run.sleep(TURN_MS);
}

/** A point 1 m behind the mount: where it faces once it has turned round. */
function behind(u: UnicornActor): Vec2 {
  return { x: u.position.x - Math.sin(u.yaw), z: u.position.z - Math.cos(u.yaw) };
}

/** The camera's target while riding: 1 m ahead of the mount. */
function ahead(u: UnicornActor): Vec2 {
  return { x: u.position.x + Math.sin(u.yaw) * RIDE.ahead, z: u.position.z + Math.cos(u.yaw) * RIDE.ahead };
}

/** Full detail for the mount first, then the riders nearest it. */
function focus(g: Game, t: Trip): void {
  const us = [...t.riders, ...(t.wild ? [t.wild] : [])].sort((a, b) => a.position.distanceTo(t.mount!.position) - b.position.distanceTo(t.mount!.position));
  g.actors.herd.setFocus([t.mount!.id, ...us.map((u) => u.id)]);
}

/** Plan the trip's two signs at her level, and note their sets and targets for this play's next trip. */
function plan(g: Game, trip: 1 | 2, mount: MountId): TripPlan {
  const level = g.options.signLevel ?? g.save.data.signs.level;
  const p = planTrip(g.randFor(`sign-${trip}`), { level, mount, trip, used: g.signUse });
  for (const s of p.signs) {
    g.signUse.sets.push(s.cards.map((c) => c.word).sort().join(','));
    g.signUse.targets.push(s.target.word);
  }
  warm([...new Set(p.signs.flatMap((s) => [...s.clips.intro, ...s.clips.goal, ...s.clips.right, ...s.clips.hint, ...s.clips.again, ...s.cards.map((c) => c.clip)]))]);
  return p;
}

/** Out through the gate to the fork, "Wheee!" once, then the fork frame once the mount has stopped. */
async function rideOut(g: Game, t: Trip): Promise<void> {
  setStep(g, 'out');
  const out = outOf(t.id!);
  let wee = false;
  const off = g.world.onFrame(() => {
    if (!wee && t.mount!.position.z < RIDE.gate.z + 1 && !audio.speaking) {
      wee = true;
      void audio.sayAll(CLIPS.wee);
    }
  });
  try {
    // A mount that grazed a little off its spot first steps onto the path's start.
    const start = out.getPointAt(0);
    const off = Math.hypot(t.mount!.position.x - start.x, t.mount!.position.z - start.z);
    if (off > 0.15) await g.run.w(t.mount!.ridePath(new THREE.LineCurve3(t.mount!.position.clone().setY(0), start), 0, off, { speed: 1.5 }));
    await g.run.w(t.mount!.ridePath(out, 0, Math.max(0, lenOf(out) - FORK_STOP), { speed: RIDE.speed }));
  } finally {
    off();
  }
  await forkFrame(g, t);
}

/** The fork frame (about 8 m), on the signpost, once the mount stands facing it. */
async function forkFrame(g: Game, t: Trip): Promise<void> {
  t.mount!.faceTo(TRAIL_RIDE.post ?? RIDE.fork);
  const f = TRAIL_RIDE.forkFrame;
  if (f && Number.isFinite(f.center?.x) && Number.isFinite(f.center?.z) && Number.isFinite(f.width)) {
    await g.run.w(g.world.frame(f.center, f.width, { shiftY: f.shiftY, pitch: f.pitch }));
    return;
  }
  const arm = g.world.trail.arm(1);
  await frameAt(g, { x: (RIDE.fork.x + t.mount!.position.x) / 2, z: (RIDE.fork.z + t.mount!.position.z) / 2 }, FORK_WIDTH, arm, 0.36);
}

/**
 * Dress the three slots with a sign's words once none of them is on screen (the fork frame holds). A slot still in
 * view after DRESS_WAIT_MS is dressed all the same, with a sparkle and a warning: a right card that led to a clearing
 * of another word (or a bare one) would teach the wrong word, so every sign's slots always show its own words.
 */
async function dressHidden(g: Game, words: readonly [SignWord, SignWord, SignWord]): Promise<boolean> {
  const trail = g.world.trail;
  const hidden = () => trail.slots().every((s) => !s.onScreen);
  const ok = (await waitFor(g, hidden, DRESS_WAIT_MS)) && hidden();
  if (!ok) {
    const seen = trail.slots().flatMap((s, i) => (s.onScreen ? [i] : []));
    console.warn(`[mmw] slot ${seen.join(', ')} still on screen at the fork: dressed in view`);
    for (const i of seen) g.actors.fx.sparkle(new THREE.Vector3(RIDE.slots[i].x, 0.8, RIDE.slots[i].z), { count: 24 });
  }
  trail.dress(words);
  return ok;
}

/** The road of a sign's target: the arm of the card with its word. */
function roadOf(spec: { cards: readonly { word: SignWord }[]; target: { word: SignWord } }): number {
  return Math.max(0, spec.cards.findIndex((c) => c.word === spec.target.word));
}

/** A signpost (5.5): the slots dressed, the moment on the arms, its result line; the road the mount takes. */
async function signpost(g: Game, t: Trip, n: 1 | 2): Promise<void> {
  const { layer, world } = g;
  setStep(g, n === 1 ? 'sign1' : 'sign2');
  const spec = t.plan!.signs[n - 1];
  await dressHidden(g, spec.cards.map((c) => c.word) as [SignWord, SignWord, SignWord]);
  const log = momentLog();
  g.openSpec = spec;
  const mount = t.mount!;
  let right: number | null = null;
  const r: MomentResult = await checked(
    g,
    layer.sign(spec, {
      anchor: () => world.toScreen(world.trail.arm(1)),
      react: (k) => {
        if (k === 'right' || k === 'happy') void mount.emote('happy');
        else if (k === 'wrong' || k === 'shake') void mount.emote('shake');
      },
      log: log.log,
      cardAt: (i) => world.toScreen(world.trail.arm(i)),
      road: (i, ok) => {
        if (ok) right = i;
        return ok ? rightRoad(mount) : wrongRoad(g, t, i);
      },
    }),
  );
  g.openSpec = null;
  g.results.add(`sign-${t.trip}`, 'r', r, {
    kind: 'sign', word: spec.target.word, words: spec.cards.map((c) => c.word), level: spec.level, tried: log.tried, trip: t.trip, read: n,
  });
  t.outcomes.push(r.outcome);
  t.roads[n - 1] = right ?? roadOf(spec);
}

/** A right card: the mount nickers and is happy. */
async function rightRoad(mount: UnicornActor): Promise<void> {
  sfx('nicker-1');
  await mount.emote('happy');
}

/** A wrong card: two steps onto that road, a shake of the head, and back to face the signpost. */
async function wrongRoad(g: Game, t: Trip, i: 0 | 1 | 2): Promise<void> {
  const mount = t.mount!;
  const from = mount.position.clone().setY(0);
  const road = RIDE_PATHS.roads[i];
  const to = road.getPointAt(Math.min(1, 2 / lenOf(road)));
  const dir = to.sub(from).setY(0).normalize();
  const step = new THREE.LineCurve3(from.clone(), from.clone().addScaledVector(dir, WRONG_STEP_M));
  await g.run.w(mount.ridePath(step, 0, WRONG_STEP_M, { speed: WRONG_SPEED }));
  await g.run.w(mount.emote('shake'));
  await g.run.w(mount.ridePath(step, WRONG_STEP_M, 0, { speed: WRONG_SPEED, backwards: true }));
  mount.faceTo(RIDE.fork);
}

/** Gallop from the fork stand down sign n's road to its clearing (stopping before the kit). */
async function toClearing(g: Game, t: Trip, n: 1 | 2): Promise<void> {
  setStep(g, n === 1 ? 'clearing1' : 'clearing2');
  g.world.releaseFrame();
  const out = outOf(t.id!);
  const road = RIDE_PATHS.roads[t.roads[n - 1] ?? 0];
  const path = joined(new Stretch(out, Math.max(0, lenOf(out) - FORK_STOP), lenOf(out)), road);
  await g.run.w(t.mount!.ridePath(path, 0, Math.max(0, lenOf(path) - CLEARING_STOP), { speed: RIDE.speed }));
}

/** Clearing 1: the happy beat (5 s), then back to the fork by themselves, and the frame again. */
async function clearing1(g: Game, t: Trip): Promise<void> {
  await toClearing(g, t, 1);
  const word = t.plan!.signs[0].target.word;
  const mount = t.mount!;
  void mount.emote('happy');
  g.actors.fx.hearts(mount.headTop().setY(mount.headTop().y + 0.1));
  t.riders.forEach((u, i) => setTimeout(() => void u.emote(i ? 'happy' : 'hop'), 300 + i * 350));
  if (WET.includes(word)) sfx('splash-1');
  await say(g, CLIPS.yay);
  await g.run.sleep(BEAT_MS);
  setStep(g, 'back');
  const road = RIDE_PATHS.roads[t.roads[0] ?? 0];
  const out = outOf(t.id!);
  await turnRound(g, t, behind(mount));
  await g.run.w(mount.ridePath(road, Math.max(0, lenOf(road) - CLEARING_STOP), 0, { speed: RIDE.speed }));
  await g.run.w(mount.ridePath(out, lenOf(out), Math.max(0, lenOf(out) - FORK_STOP), { speed: 1.4, backwards: true }));
  await forkFrame(g, t);
}

/** Clearing 2 (5.5): the star egg in a moonbeam, Lumi's line, the three sums with her on the mount, the hatch, the naming and the wish. */
async function starEgg(g: Game, t: Trip, hatchOnly: boolean): Promise<void> {
  const { actors } = g;
  const mount = t.mount!;
  setStep(g, 'egg');
  const yaw = mount.yaw;
  // On her side of the mount, a little ahead, between it and the clearing's kit (the trail is beyond the walk grid,
  // so no nearestWalkable here: it would pull the egg back inside the fence).
  const egg = { x: mount.position.x + Math.sin(yaw) * 1.3 + Math.cos(yaw) * 0.9, z: mount.position.z + Math.cos(yaw) * 1.3 - Math.sin(yaw) * 0.9 };
  if (!actors.trailEgg.visible) {
    void actors.fx.moonbeam(new THREE.Vector3(egg.x, 0, egg.z), 1800);
    actors.trailEgg.place(new THREE.Vector3(egg.x, 0, egg.z), 'star');
    actors.fx.sparkle(new THREE.Vector3(egg.x, 0.6, egg.z), { count: 18 });
  }
  const eggAt = actors.trailEgg.position.clone();
  await frameAt(g, { x: (eggAt.x + mount.position.x) / 2, z: (eggAt.z + mount.position.z) / 2 }, 6, eggAt, 0.42, 900, undefined, {
    point: actors.princess.point('head', new THREE.Vector3()),
    frac: 0.2,
  });
  if (!hatchOnly) {
    await lumiSay(g, CLIPS.anotherEgg);
    await runEggSums(g, 'trail');
  }
  setStep(g, 'naming');
  // The hatch, the naming and the baby's first wish (its 'wish' step is only a place a jump starts from: see
  // notes/ride.md). The newborn stays at its hatch spot beside her until the mount turns for home (turnRound).
  const baby: Baby = await newbornAt(g, 'trail');
  t.wild = baby.unicorn;
  if (g.followers.list.includes(t.wild)) g.followers.remove(t.wild);
  if (g.ride) g.ride.followers = [...t.riders, t.wild].map((u) => u.id);
  focus(g, t);
  g.world.releaseFrame();
}

/** "Time to ride home!": back to the fork and home through the gate to her stand. */
async function rideHome(g: Game, t: Trip, fromGate: boolean): Promise<void> {
  setStep(g, 'home');
  const mount = t.mount!;
  g.world.releaseFrame();
  const home = RIDE_PATHS.home;
  if (fromGate) {
    await say(g, CLIPS.rideHome);
    await g.run.w(mount.ridePath(home, gateAlong(), lenOf(home), { speed: RIDE.speed }));
    return;
  }
  // It turns round for home while the line plays, the riders and the newborn stepping aside.
  await Promise.all([say(g, CLIPS.rideHome), turnRound(g, t, behind(mount))]);
  const road = RIDE_PATHS.roads[t.roads[1] ?? 0];
  await g.run.w(mount.ridePath(joined(new Stretch(road, Math.max(0, lenOf(road) - CLEARING_STOP), 0), home), 0, lenOf(road) - CLEARING_STOP + lenOf(home), { speed: RIDE.speed }));
}

/** How far along the home path the gate is. */
function gateAlong(): number {
  const home = RIDE_PATHS.home;
  let best = 0;
  let d = Infinity;
  for (let k = 0; k <= 100; k++) {
    const p = home.getPointAt(k / 100);
    const e = Math.hypot(p.x - RIDE.gate.x, p.z - RIDE.gate.z);
    if (e < d) {
      d = e;
      best = (k / 100) * lenOf(home);
    }
  }
  return best;
}

/** Getting off at her stand: the roads hide, the gate closes, the mount goes back to its spot, the babies follow her. */
async function getOff(g: Game, t: Trip): Promise<void> {
  const { actors, world } = g;
  const mount = t.mount!;
  const yaw = mount.yaw;
  const at = world.nearestWalkable({ x: mount.position.x + Math.cos(yaw) * BESIDE, z: mount.position.z - Math.sin(yaw) * BESIDE });
  await g.run.w(actors.princess.dismount(at));
  t.undo?.();
  t.undo = null;
  finish(g, t);
  sfx('stable-door');
  // Back to its spot, or put there with a sparkle after 3 s.
  const spot = RIDE.mounts[t.id!];
  const there = await g.run.w(Promise.race([mount.goTo(world.route(flat(mount.position), spot)), new Promise<boolean>((r) => setTimeout(() => r(false), BACK_MS))]));
  if (!there || dist2(flat(mount.position), spot) > 0.4) {
    actors.fx.sparkle(new THREE.Vector3(spot.x, 0.6, spot.z), { count: 16 });
    mount.place(spot, mount.yaw);
  }
  mount.faceTo(RIDE.stand);
  mount.graze(spot, { radius: 0.6 });
}

/** The signs fold and are saved once a trip is home, never before (?sign= is not stored). */
function keepSigns(g: Game, t: Trip): void {
  if (t.folded) return;
  t.folded = true;
  if (g.options.signLevel === null && t.outcomes.length) g.save.write((s) => void (s.signs = foldSigns(s.signs, t.outcomes)));
}

/** The trip ends (home, or the run stopped): the trail hides, the camera and the herd go back, the riders off the track. */
function finish(g: Game, t: Trip): void {
  const { actors, world } = g;
  world.trail.show(false);
  world.trail.dress(null);
  void world.trail.gate(false);
  world.cameraClamp('meadow');
  world.follow(() => princessAt(g));
  actors.herd.setFocus([]);
  t.clockOff?.();
  t.clockOff = null;
  t.seated = false;
  for (const u of [...t.riders, ...(t.wild ? [t.wild] : [])]) u.trackBehind(null, 0);
  // Her babies and followers follow her again (the wild baby first), the called herd babies graze at home.
  const after = [...(t.wild ? [t.wild] : []), ...t.following];
  after.forEach((u, i) => g.followers.add(u, i === 0 && !!t.wild));
  for (const u of t.called) grazeHome(g, u);
  layerOff(g);
  g.ride = null;
}

function layerOff(g: Game): void {
  g.layer.saddles(null);
}

/** The run stopped in the middle of a trip (a jump, a new play): nothing of it stays, and no sign level changes. */
function abort(g: Game, t: Trip): void {
  choosing.delete(g);
  const her = g.actors.princess;
  if (her.mountedOn) g.actors.placePrincess(RIDE.stand, 0);
  if (g.ride || t.seated) finish(g, t);
  for (const m of MOUNT_IDS) {
    const u = mountOf(g, m);
    if (!u || dist2(flat(u.position), RIDE.mounts[m]) < 0.7) continue;
    u.place(RIDE.mounts[m], Math.atan2(RIDE.stand.x - RIDE.mounts[m].x, RIDE.stand.z - RIDE.mounts[m].z));
    u.graze(RIDE.mounts[m], { radius: 0.6 });
  }
  g.ride = null;
}

/** A unicorn goes back to graze at its herd home (or where it stands). */
function grazeHome(g: Game, u: UnicornActor): void {
  const i = g.herd.findIndex((h) => h.id === u.id);
  u.graze(i >= 0 ? GRAZE_HOMES[i] : flat(u.position));
}

/** An effect of v4's own audio that never holds anything up (silent while its file is missing). */
function sfx(id: 'nicker-1' | 'stable-door' | 'splash-1'): void {
  try {
    void audio.fx(id)?.catch?.(() => undefined);
  } catch {
    /* a missing effect stays silent */
  }
}

// ---- taps -----------------------------------------------------------------------------------------------------------

/** A unicorn hops and says its name, with its tag. */
function hopAndName(g: Game, u: UnicornActor): void {
  void u.emote('hop');
  const m = MOUNT_IDS.find((id) => MOUNTS[id].id === u.id);
  const name = m ? MOUNTS[m].name : memberOf(g, u.id)?.name;
  const clip = m ? MOUNTS[m].clip : memberOf(g, u.id)?.clip;
  if (name) g.layer.tag(name, () => g.world.toScreen(u.headTop()), 2500);
  if (clip) sayAside(clip);
}

/** A world tap while riding: the mount or a follower hops and says its name, the trail egg wobbles; the ground does nothing. */
export function rideTap(g: Game, x: number, y: number): void {
  const { actors, world } = g;
  const u = actors.herd.pick(world.ray(x, y));
  const riders = g.ride ? [...g.ride.followers] : [];
  // At the paddock a tap on a mount counts as its saddle icon (mountTap).
  if (u && isMount(u)) return mountTap(g, u);
  if (u && riders.includes(u.id)) return hopAndName(g, u);
  const egg = actors.trailEgg;
  if (egg.visible) {
    const s = world.toScreen(egg.position);
    if (s.visible && Math.hypot(s.x - x, s.y - y) < 70) void egg.wobble();
  }
}

/** A tap on a mount outside a ride: at the paddock it counts as its saddle icon; else it hops and says its name. */
export function mountTap(g: Game, u: UnicornActor): void {
  const choose = choosing.get(g);
  const m = MOUNT_IDS.find((id) => MOUNTS[id].id === u.id);
  if (choose && m) return choose(m);
  hopAndName(g, u);
}

// ---- jumps ----------------------------------------------------------------------------------------------------------

/**
 * Put her mounted at a step of trip 1 (a jump with ?step=): at the fork for sign 2 and the star egg, at clearing 2 for
 * the naming and the wish, at the gate for home; on ?mount= (Bella by default). The next ridePlace carries it on.
 */
export function snapTrip(g: Game, step: StartStep): void {
  if (!isTripStep(step)) return;
  const id: MountId = g.options.mount ?? 'bella';
  const mount = mountOf(g, id);
  if (!mount) return;
  const t = newTrip(1);
  t.id = id;
  t.mount = mount;
  t.plan = plan(g, 1, id);
  t.roads = t.plan.signs.map(roadOf);
  // The signs it skips were never read: only the ones she answers fold into her level.
  t.outcomes = [];
  const ride: RideState = { trip: 1, mount: id, step: 'sign2', followers: [] };
  let at: THREE.Vector3;
  let yaw: number;
  if (step === 'sign2' || step === 'egg') {
    at = forkStand(id);
    yaw = Math.atan2(RIDE.fork.x - at.x, RIDE.fork.z - at.z);
    ride.step = step === 'sign2' ? 'sign2' : 'clearing2';
  } else if (step === 'home') {
    at = RIDE_PATHS.home.getPointAt(gateAlong() / lenOf(RIDE_PATHS.home));
    yaw = 0;
    ride.step = 'home';
  } else {
    const road = RIDE_PATHS.roads[t.roads[1]];
    at = road.getPointAt(Math.max(0, lenOf(road) - CLEARING_STOP) / lenOf(road));
    const tan = road.getTangentAt(Math.max(0, lenOf(road) - CLEARING_STOP) / lenOf(road));
    yaw = Math.atan2(tan.x, tan.z);
    ride.step = 'naming';
    const egg = { x: at.x + Math.sin(yaw) * 1.3 + Math.cos(yaw) * 0.9, z: at.z + Math.cos(yaw) * 1.3 - Math.sin(yaw) * 0.9 };
    g.actors.trailEgg.place(new THREE.Vector3(egg.x, 0, egg.z), 'star');
  }
  mount.place({ x: at.x, z: at.z }, yaw);
  mount.seedTrack([]);
  g.actors.placePrincess({ x: at.x + Math.cos(yaw) * BESIDE, z: at.z - Math.sin(yaw) * BESIDE }, yaw);
  void g.actors.princess.mount(mount);
  seat(g, t);
  g.world.trail.show(true);
  g.world.cameraClamp('ride');
  g.world.follow(() => ahead(mount));
  void g.world.trail.gate(true, 0);
  g.ride = ride;
  snapped.set(g, t);
}

/** The trip for the test hook (__game.state().ride), with each slot's word and whether it is on screen, or null. */
export function rideSnapshot(g: Game): (RideState & { slots: { word: SignWord | null; onScreen: boolean }[] }) | null {
  if (!g.ride) return null;
  return { ...g.ride, followers: g.ride.followers.slice(), slots: g.world.trail.slots() };
}

const UP = new THREE.Vector3(0, ICON_UP, 0);
