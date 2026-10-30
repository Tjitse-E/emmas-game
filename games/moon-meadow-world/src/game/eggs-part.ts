// The egg parts of the level (moved out of level.ts in 2.3.0, so the eggs lane owns them): she walks to the egg,
// the egg moment runs, and the baby hatches. 2.3.0 asks three sums per egg (docs/v4/2.3.md sections 12 and 19.1), all
// within 10: an easy one, a middle one and a bond to 10 at her band, each its own checked moment and result line, on
// one panel that stays on screen between them. Three hearts light one per sum (as Elizabeth says the fact, 2.3.2), the
// egg glows and wobbles more with each, and it hatches after the third. The background stays silent across all three
// (audio.checked(true) around them), and checked() per sum keeps the clock.
//
// 2.4.0 (docs/v4/2.4.md section 5.3): babies come in any order, up to four a play, door 13 + index in hatch order; each
// egg has its own spot (the nest, the pond shore, the trail clearing) and kind (warm, snow, star). The hub's egg place
// (eggPlace) walks to the nest or shore egg, asks its three sums (runEggSums) and brings the newborn (newbornAt): the
// hatch, the naming and its first wish beside her. The ride runs runEggSums and newbornAt on the trail. Each baby's look
// avoids every earlier baby's, each naming leaves out every name given this play (3 wrong gems at the first naming,
// 4 at every later one), and a kind's intro plays only on its first egg of the play. Streams and result parts:
// egg-nest, egg-shore, egg-trail-<k>, hatch-<n>, naming-<n>, wish-<n> (n counts babies, k trail eggs, both from 1).
// 2.3.3's index-based egg, naming and wish stay for level.ts's 2.3 parts until the hub replaces them.
import * as THREE from 'three';
import type { EggKind, EggSpec, MomentHooks, MomentResult, NameChoice, Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import type { EggImpl } from '../actors/egg';
import { NEST, WILD_EGG, dist2 } from '../layout';
import { CLIPS, babyLook, eggClipIds, namingClipIds, namingSpec, newborn, wishClipIds } from '../content';
import { audio } from '../audio';
import {
  type Baby, type Game, type Goal, GOALS, checked, faceBeside, flat, frameAt, lumiSay, preload, princessAt, say, setGoal, waitToReach,
  walkTo,
} from './game';
import {
  type MomentLog, afterWish, babyReact, crownKeep, dropToyAfter, frameWish, momentLog, nextWishKind, parkFollowers, planWish, runWish,
  secondWishKind, settleBy,
} from './moments';
import { noteMaths, planEggs } from './maths';
import { playQuests } from './quests';
import { walkThere } from './quest-kit';
import { MAX_FOLLOWERS } from './followers';

export const NEST_EGG = new THREE.Vector3(NEST.center.x, NEST.eggY, NEST.center.z);
export const WILD_EGG_AT = new THREE.Vector3(WILD_EGG.at.x, 0, WILD_EGG.at.z);
/** Where each newborn sits when it hatches: in the nest, and on the grass where the wild egg lay. */
export const HATCH_SPOT: Record<13 | 14, Vec2> = { 13: { x: NEST.center.x, z: NEST.center.z + 0.25 }, 14: WILD_EGG.at };
/**
 * Where she stands for an egg and its baby: beside it at its depth (a little behind), so she turns a three-quarter
 * face to the camera instead of her back.
 */
export const SIDE: Record<0 | 1, Vec2> = { 0: { x: NEST.center.x - 1.55, z: NEST.center.z - 0.15 }, 1: { x: WILD_EGG.at.x - 1.5, z: WILD_EGG.at.z - 0.15 } };
/** Width of ground across the screen for the egg moment. */
const EGG_WIDTH = 6;
/** Width of ground across the screen for the baby's naming. */
const BABY_WIDTH = 5.5;
/** A pond toy from wish2 stays at the baby's feet this long after the wish, as a picnic dish does (moments.ts PLAY_MS). */
const WISH_TOY_MS = 8000;

/** Where an egg lies (2.4.0): the nest, the pond shore, or a clearing on the trail. */
export type EggSpot = 'nest' | 'shore' | 'trail';
/** The kind of each spot's egg: the nest egg is warm, the shore egg snow, a trail egg a star egg. */
export const KIND_AT: Record<EggSpot, EggKind> = { nest: 'warm', shore: 'snow', trail: 'star' };

/** The egg actor of a spot: the home egg (the nest or the shore, one at a time) or the trail egg. */
const eggOf = (g: Game, spot: EggSpot): EggImpl => (spot === 'trail' ? g.actors.trailEgg : g.actors.egg);
/** The stream (and result part) of a spot's egg sums: egg-nest, egg-shore, or egg-trail-<k> for the k-th trail egg. */
function sumsLabel(g: Game, spot: EggSpot): string {
  return spot === 'trail' ? `egg-trail-${g.babies.filter((b) => b.spot === 'trail').length + 1}` : `egg-${spot}`;
}

/** A home egg's places: where it lies, its walk goal, her spot beside it and where its baby sits when it hatches. */
function homeOf(spot: 'nest' | 'shore'): { egg: THREE.Vector3; goal: Goal; side: Vec2; hatch: Vec2 } {
  return spot === 'nest'
    ? { egg: NEST_EGG, goal: GOALS.nest, side: SIDE[0], hatch: HATCH_SPOT[13] }
    : { egg: WILD_EGG_AT, goal: GOALS.wildEgg, side: SIDE[1], hatch: HATCH_SPOT[14] };
}

/** No baby of this egg kind has hatched yet this play: its egg says the kind's intro (2.4 section 5.3). */
export function firstOfKind(g: Game, kind: EggKind): boolean {
  return !g.babies.some((b) => KIND_AT[b.spot] === kind);
}

/**
 * The naming's rules this play (2.4 section 5.3): every name given so far is left out, and the play's first naming
 * has 3 wrong gems, every later one 4 (docs/v4/2.2.md 3.1).
 */
export function namingRules(g: Game): { exclude: string[]; decoys: 3 | 4 } {
  const exclude = g.babies.filter((b) => b.member).map((b) => b.member!.name);
  return { exclude, decoys: exclude.length ? 4 : 3 };
}

// ---- the hub's egg places (2.4.0) ----------------------------------------------------------------------------------

/**
 * The nest or shore egg as a hub place: she walks to the egg, its three sums, the hatch, the naming and the newborn's
 * first wish beside her. Resolves framed on the wish, with its release: the frame lets go, the followers that stepped
 * aside follow again, and the newborn follows her.
 *
 * On the first play the welcome has set the nest as the walk goal and said "Tap the grass to walk.": then she walks
 * there herself, as in 2.3. Asked from a bubble or a tap on the egg, she walks there by herself, as to every place.
 */
export async function eggPlace(g: Game, spot: 'nest' | 'shore'): Promise<() => void> {
  const { actors, world } = g;
  const home = homeOf(spot);
  // One home egg at a time: the egg of this place, at its spot (the hub shows it; a jump may not have).
  if (!actors.egg.visible || dist2(flat(actors.egg.position), flat(home.egg)) > 0.5) actors.egg.place(home.egg, KIND_AT[spot]);
  if (g.goal === home.goal) {
    g.free = true;
    await waitToReach(g, home.goal);
  }
  setGoal(g, null);
  // The glow's job (find the nest) is done: it would only bleach the egg moment.
  if (spot === 'nest') world.nestGlow(false);
  g.free = false;
  parkFollowers(g, home.side);
  await walkThere(g, home.side);
  faceBeside(g, flat(actors.egg.position));
  const eggPoint = actors.egg.position.clone();
  await frameAt(g, flat(eggPoint), EGG_WIDTH, eggPoint, 0.4);
  await runEggSums(g, spot);
  const baby = await bringNewborn(g, spot, true);
  return () => {
    world.releaseFrame();
    for (const p of g.parked.splice(0)) g.followers.add(p);
    followHer(g, baby.unicorn);
  };
}

/**
 * The egg's three sums at `spot` (the caller frames: the egg place at home, the ride on the trail with her on the mount
 * beside the egg), each a checked moment, from the stream egg-nest, egg-shore or egg-trail-<k>. The kind's intro only
 * on its first egg of the play.
 */
export async function runEggSums(g: Game, spot: EggSpot): Promise<void> {
  const specs = await planSums(g, spot);
  await askSums(g, spot, specs);
}

/**
 * The hatch at the spot's egg, the naming and the newborn's first wish beside her; resolves with the baby, the camera
 * back with her. At the nest and the shore the baby settles beside her for its wish; on the trail it stays at its
 * hatch spot and turns to her on the mount. The ride takes it along; nothing here makes it follow.
 */
export async function newbornAt(g: Game, spot: EggSpot): Promise<Baby> {
  return bringNewborn(g, spot, false);
}

/** The hatch, the naming and the first wish; `keepFrame` leaves the camera on the wish (the egg place's release). */
async function bringNewborn(g: Game, spot: EggSpot, keepFrame: boolean): Promise<Baby> {
  const i = g.babies.length;
  await hatch(g, i, spot);
  const baby = g.babies[i];
  await nameBaby(g, baby);
  await firstWish(g, baby, keepFrame);
  return baby;
}

/**
 * A newborn follows her after its place: in front when it is her only baby following (slot 0, as 2.3's first baby),
 * else after them. With three following already, a herd follower goes back to graze first, so no baby is sent off for
 * it while a herd unicorn follows.
 */
function followHer(g: Game, u: UnicornActor): void {
  const isBaby = (x: UnicornActor) => g.babies.some((b) => b.unicorn === x);
  g.followers.sync();
  if (g.followers.list.length >= MAX_FOLLOWERS) {
    const herd = [...g.followers.list].reverse().find((x) => !isBaby(x));
    if (herd) {
      g.followers.remove(herd);
      herd.graze(flat(herd.position));
    }
  }
  g.followers.add(u, !g.followers.list.some(isBaby));
}

// ---- 2.3.3's egg parts ---------------------------------------------------------------------------------------------

/** The egg moment and the hatch, for the nest egg (index 0) and the wild egg (index 1); the baby takes the next baby index. */
export async function egg(g: Game, i: 0 | 1): Promise<void> {
  const { actors, world } = g;
  const goal = i === 0 ? GOALS.nest : GOALS.wildEgg;
  const eggAt = i === 0 ? NEST_EGG : WILD_EGG_AT;
  const spot = i === 0 ? 'nest' : 'shore';
  if (!actors.egg.visible) actors.egg.place(eggAt, KIND_AT[spot]);
  if (!g.goal) setGoal(g, goal);
  g.free = true;
  await waitToReach(g, goal);
  setGoal(g, null);
  // The glow's job (find the nest) is done: it would only bleach the egg moment.
  world.nestGlow(false);
  g.free = false;
  parkFollowers(g, SIDE[i]);
  const eggFlat = flat(actors.egg.position);
  void walkTo(g, SIDE[i]).then(() => faceBeside(g, eggFlat));
  // 2.4.0: no "plan egg 1 first" for a jump to the wild egg any more; each egg plans with what the play has asked.
  const specs = await planSums(g, spot);
  const eggPoint = actors.egg.position.clone();
  await frameAt(g, flat(eggPoint), EGG_WIDTH, eggPoint, 0.4);
  await askSums(g, spot, specs);
  await hatch(g, g.babies.length, spot);
}

/** An egg's three sums from its stream, with their clips loaded; the kind's intro only on its first egg of the play. */
async function planSums(g: Game, spot: EggSpot): Promise<EggSpec[]> {
  const kind = KIND_AT[spot];
  const specs = planEggs(g, kind, sumsLabel(g, spot), firstOfKind(g, kind));
  await preload(g, [...new Set(specs.flatMap((s) => eggClipIds(s)))]);
  return specs;
}

/** The three sums on one panel. The background stays out from before the first sum to after the third, between the sums too. */
async function askSums(g: Game, spot: EggSpot, specs: EggSpec[]): Promise<void> {
  const label = sumsLabel(g, spot);
  const actor = eggOf(g, spot);
  audio.checked(true);
  try {
    for (const spec of specs) {
      const t = momentLog();
      g.openSpec = spec;
      const r = await checked(g, eggSum(g, actor, spec, t));
      g.openSpec = null;
      noteMaths(g, label, spec, r, t);
    }
  } finally {
    audio.checked(false);
  }
}

/**
 * One of the egg's three sums on the panel. After the first and the second, the panel stays and its next heart lights
 * as Elizabeth says the fact (the ui's react('heart'), and the egg glows and wobbles more); the next sum's goal follows
 * at once (2.3.2).
 */
async function eggSum(g: Game, actor: EggImpl, spec: EggSpec, t: MomentLog): Promise<MomentResult> {
  const { layer, world } = g;
  const lit = ((spec.round?.index ?? 0) + 1) as 1 | 2 | 3;
  const hooks: MomentHooks = {
    anchor: () => world.toScreen(actor.position),
    react: (k) => {
      if (k === 'hot') void actor.steam();
      else if (k === 'cold') void actor.frost();
      else if (k === 'heart') {
        actor.hearts(lit);
        void actor.wobble();
      } else void actor.wobble();
    },
    log: t.log,
  };
  return layer.egg(spec, hooks);
}

/** She sits on a mount (the trail): she stays as she sits, and the baby turns to her instead. */
const mounted = (g: Game): boolean => !!g.actors.princess.mountedOn;

/** She turns a three-quarter face to a baby, or on the mount the baby turns to her. */
function faceBaby(g: Game, u: UnicornActor): void {
  if (mounted(g)) u.lookAt(princessAt(g));
  else faceBeside(g, flat(u.position));
}

/**
 * Baby `i` hatches from the spot's egg: door 13 + i, its egg's breed (warm, snow, or moon from a star egg), a look no
 * earlier baby of this play has, from the stream hatch-<i + 1>.
 */
async function hatch(g: Game, i: number, spot: EggSpot): Promise<void> {
  const { actors } = g;
  const door = 13 + i;
  const actor = eggOf(g, spot);
  const at: Vec2 = spot === 'trail' ? flat(actor.position) : homeOf(spot).hatch;
  const talk = g.layer.lumi.speak(CLIPS.hatching);
  // The crack plays ducked under Lumi's "It's hatching!" (the synthesised hatch until its file is made).
  void audio.fx('egg-crack', { duck: true, fallback: 'hatch' });
  await g.run.w(actor.hatch());
  const rand = g.randFor(`hatch-${i + 1}`);
  const look = babyLook(KIND_AT[spot], rand, g.babies.slice(0, i).map((b) => b.look));
  const u = actors.herd.add({ id: `baby-${door}`, name: '', look, at, mode: 'hatching' });
  g.babies[i] = { door, spot, look, unicorn: u, member: null };
  actors.fx.sparkle(u.headTop().setY(0.8), { count: 24, colour: '#ffe27a' });
  faceBaby(g, u);
  await g.run.w(talk);
  await lumiSay(g, CLIPS.baby);
  await say(g, CLIPS.foalHello);
}

/**
 * A baby's naming, from the stream naming-<n> (n its place in the hatch order): it leaves out every name given this
 * play, with 3 wrong gems at the play's first naming and 4 at every later one (namingRules).
 */
async function nameBaby(g: Game, baby: Baby): Promise<void> {
  const { layer, world } = g;
  const u = baby.unicorn;
  const n = g.babies.indexOf(baby) + 1;
  g.free = false;
  const rules = namingRules(g);
  const spec = namingSpec(g.randFor(`naming-${n}`), rules.exclude, rules.decoys);
  await preload(g, namingClipIds(spec));
  faceBaby(g, u);
  // The frame centre a little towards her, so her crown stays clear of Lumi's portrait (top left).
  await frameAt(g, { x: u.position.x - 0.5, z: u.position.z }, BABY_WIDTH, u.headTop(), 0.27, 900, undefined, crownKeep(g));
  const t = momentLog();
  g.openSpec = { bells: spec.bells, chosen: null as NameChoice | null };
  const r = await checked(
    g,
    layer.naming(spec, {
      anchor: () => world.toScreen(u.headTop()),
      react: babyReact(g, u),
      log: t.log,
      chosen: (c) => {
        u.name = c.name;
        g.openSpec = { bells: spec.bells, chosen: c };
      },
    }),
  );
  g.openSpec = null;
  named(g, baby, r.name);
  g.results.add(`naming-${n}`, 's', r, { name: r.name.name, tried: t.tried });
  layer.tag(r.name.name, () => world.toScreen(u.headTop()), 3500);
}

/**
 * Baby `i`'s naming (2.3's naming1 and naming2 parts): every later naming has a fourth wrong gem (docs/v4/2.2.md 3.1)
 * and leaves out the names of the babies named before it.
 */
export async function naming(g: Game, i: number): Promise<void> {
  await nameBaby(g, g.babies[i]);
}

export function named(g: Game, baby: Baby, choice: NameChoice): void {
  baby.unicorn.name = choice.name;
  baby.member = newborn(choice, baby.look, baby.door);
}

/** After a bath wish the baby goes for a swim with its toy, then follows her. */
export function bathSwim(u: UnicornActor): void {
  u.swim();
  dropToyAfter(u, 14_000);
}

/**
 * A newborn's first wish, right after its naming (2.4 section 5.3), from the stream and part wish-<n>, of the kind the
 * play has read least (moments.ts nextWishKind: so the play's first baby wants to dress up like her): at the nest and
 * the shore the baby settles beside her, on the trail it stays where it hatched. "Your baby wants to dress up like
 * you!" before a dress-up wish; nothing before the others ("I'm hungry!" before a food would give the answer away).
 * With `keepFrame` the camera stays on the wish (the egg place lets it go in its release).
 */
async function firstWish(g: Game, baby: Baby, keepFrame: boolean): Promise<void> {
  const u = baby.unicorn;
  const n = g.babies.indexOf(baby) + 1;
  g.free = false;
  const part = `wish-${n}`;
  const kind = nextWishKind(g);
  const spec = planWish(g, kind, part, { wish: true });
  const before = kind === 'dress' ? CLIPS.dressUp : [];
  await preload(g, [...wishClipIds(spec), ...afterWish(spec), ...before]);
  if (baby.spot === 'trail') faceBaby(g, u);
  else await settleBy(g, u);
  await say(g, before);
  if (keepFrame) await frameWish(g, u);
  await runWish(g, u, spec, part, { frame: !keepFrame });
  // A pond toy stays until the swim takes it at the pond (bathSwim); here it goes as a picnic dish does.
  if (spec.kind === 'bath') dropToyAfter(u, WISH_TOY_MS);
}

/**
 * A baby's wish beside her: the first baby wants to dress up like her (at the nest), the second (by the wild egg)
 * wants a pond toy when free play offers the royal picnic, which every play in 2.3 does, and else a picnic treat
 * (2.3.2, moments.ts secondWishKind): the picnic's two guests read picnic words, so a picnic wish here made three
 * picnic baskets in about 100 s. "Your baby wants to dress up like you!" before the dress-up wish. Nothing before the
 * other wish: "I'm hungry!" only before a food would tell her the answer is a food.
 */
export async function wish(g: Game, i: number): Promise<void> {
  const baby = g.babies[i];
  const u = baby.unicorn;
  g.free = false;
  const part = `wish-${i + 1}`;
  const kind = i === 0 ? 'dress' : secondWishKind(playQuests(g));
  const spec = planWish(g, kind, part, { wish: true });
  const before = kind === 'dress' ? CLIPS.dressUp : [];
  await preload(g, [...wishClipIds(spec), ...afterWish(spec), ...before]);
  await settleBy(g, u);
  await say(g, before);
  await runWish(g, u, spec, part);
  // A pond toy stays until the swim takes it at the pond (bathSwim); here it goes as a picnic dish does.
  if (spec.kind === 'bath') dropToyAfter(u, WISH_TOY_MS);
  for (const p of g.parked.splice(0)) g.followers.add(p);
  g.followers.add(u, i === 0);
}

// ---- the babies of a jump ------------------------------------------------------------------------------------------

/** Where the second, third and fourth snapped babies stand, from the first one's point. */
const SNAP_OFFSETS: readonly Vec2[] = [{ x: 0, z: 0 }, { x: -2.6, z: 0.1 }, { x: -1.2, z: 1.3 }, { x: 0.9, z: 1.5 }];

/**
 * Fixed choices for the places a jump skips: one named baby per spot, in that hatch order, doors 13 on (after the
 * babies already there), near `near`; with `named` each takes its first bell's name. The look and the bells come from
 * the same streams and the same rules as in a full play (hatch-<n>, naming-<n>, babyLook by the egg's kind,
 * namingRules).
 */
export function snapBabies(g: Game, spots: readonly EggSpot[], near: Vec2, isNamed: boolean): void {
  spots.forEach((spot, k) => {
    const i = g.babies.length;
    const door = 13 + i;
    const look = babyLook(KIND_AT[spot], g.randFor(`hatch-${i + 1}`), g.babies.map((b) => b.look));
    const o = SNAP_OFFSETS[k % SNAP_OFFSETS.length];
    const u = g.actors.herd.add({ id: `baby-${door}`, name: '', look, at: { x: near.x + o.x, z: near.z + o.z } });
    const baby: Baby = { door, spot, look, unicorn: u, member: null };
    g.babies.push(baby);
    if (!isNamed) return;
    const rules = namingRules(g);
    named(g, baby, namingSpec(g.randFor(`naming-${i + 1}`), rules.exclude, rules.decoys).bells[0]);
  });
}
