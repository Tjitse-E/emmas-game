// The level script: "Emma's first day in Moon Meadow" (docs/v4/demo.md section 1, docs/v4/2.2.md). Each part is an
// async step on the current Run; jump(part) stops the run, snaps the world into that part's state and starts from
// there. 2.2.0 adds the customiser before the welcome (wardrobe-part.ts), the dress-up, pond and picnic wishes, and
// the afternoon's side quests (quests.ts); the shared moment code is in moments.ts.
import * as THREE from 'three';
import type { EndMember, NameChoice, Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { GRAZE_HOMES, NEST, SLIDE, STABLE, START, WILD_EGG, dist2, doorFront, doorIsUpper } from '../layout';
import { RIBBON_HEX, nextRibbon } from '../wardrobe';
import { audio } from '../audio';
import {
  CLIPS, allGraphemes, babyLook, doorClipIds, doorVisit, eggClipIds, moveIn, namingClipIds, namingSpec, newborn,
  rollCall, wishClipIds,
} from '../content';
import {
  type Baby, type Game, type Goal, type Part, GOALS, PARTS, doorPoint, flat, frameAt, lumiSay, memberOfDoor, preload,
  princessAt, reached, say, sayWay, setGoal, setTime, startQuests, v3, walkTo,
} from './game';
import { Run, Cancelled } from './run';
import { doorMoment, heartsBetween } from './doors';
import { startMaths } from './band';
import { ownedRibbons } from './save';
import {
  afterWish, babyReact, crownKeep, dropToyAfter, momentLog, noteMaths, parkFollowers, planEgg, planWish, runWish,
  settleBy,
} from './moments';
import { herdAside, wardrobe, wardrobePartClipIds } from './wardrobe-part';
import { afternoon, hideOffers } from './quests';

const NEST_EGG = new THREE.Vector3(NEST.center.x, NEST.eggY, NEST.center.z);
const WILD_EGG_AT = new THREE.Vector3(WILD_EGG.at.x, 0, WILD_EGG.at.z);
/** Where each newborn sits when it hatches: in the nest, and on the grass where the wild egg lay. */
const HATCH_SPOT: Record<13 | 14, Vec2> = { 13: { x: NEST.center.x, z: NEST.center.z + 0.25 }, 14: WILD_EGG.at };
/**
 * Where she stands for an egg and its baby: beside it at its depth (a little behind), so she turns a three-quarter
 * face to the camera instead of her back.
 */
const SIDE: Record<0 | 1, Vec2> = { 0: { x: NEST.center.x - 1.55, z: NEST.center.z - 0.15 }, 1: { x: WILD_EGG.at.x - 1.5, z: WILD_EGG.at.z - 0.15 } };
/** Width of ground across the screen for each framing. */
const EGG_WIDTH = 6;
const BABY_WIDTH = 5.5;
const CROWN_WIDTH = 6;
const WILD_EGG_WIDTH = 9;
/** The ribbons close-up: her chest at `frac` of the height, both door rows with their peeking heads behind her. */
const RIBBONS = { width: 8.6, pitch: 24, frac: 0.64 };
/**
 * "Fourteen unicorns!": the camera tilts up so the stars and the castle rise above the stable roofs. The star band
 * and the castle sit 2 to 11 degrees above the horizon, so the view looks only 12 degrees down and its window is
 * shifted up (shiftY), which puts the top edge about 15 degrees above the horizon.
 */
const NIGHT_SKY = { center: { x: 0, z: -12 }, width: 19, pitch: 12, shiftY: 0.2 };
const STABLE_FRAME = { center: { x: 0, z: -11.6 }, width: 19 };
const INTRO_MS = 3500;
/** The pond: the tap line after 12 s without a slide, the slide line once more 20 s later, the egg comes at 45 s. */
const POND_TAP_MS = 12_000;
const POND_AGAIN_MS = 20_000;
const POND_WAIT_MS = 45_000;
/** Play after the first slide before the bath wish at the pond. */
const POND_PLAY_MS = 8000;
/** Where she and her baby stand for the bath wish at the pond: on the shore with the water behind them. */
const POND_WISH: { her: Vec2; baby: Vec2 }[] = [
  { her: { x: 3.4, z: 7.4 }, baby: { x: 5.1, z: 8.1 } },
  { her: { x: 8.6, z: 9.6 }, baby: { x: 10.3, z: 10.0 } },
];
/** The longest walk to those spots. */
const POND_WISH_MS = 12_000;
/** The longest walk into a stall; after that the unicorn pops straight in (bedtime never waits on a slow walker). */
const WALK_IN_MS = 4000;
/** Roll call: the next door is asked this long after the right door, while that unicorn still walks in. */
const NEXT_DOOR_MS = 1200;
const HERD_STAGGER_MS = 250;

/** The level's clips said at any time, preloaded at the start with the herd's names. */
export function startClipIds(g: Game): string[] {
  const ids: string[] = [];
  for (const v of Object.values(CLIPS)) {
    if (Array.isArray(v)) ids.push(...v);
    else if (typeof v === 'object') ids.push(...Object.values(v).flat());
  }
  ids.push(...CLIPS.herdCount(14), ...g.herd.map((h) => h.clip));
  return [...new Set(ids)];
}

/** Her feet are on the grass (not climbing, sliding or swimming). */
const onLand = (g: Game): boolean => ['idle', 'walk', 'run'].includes(g.actors.princess.mode);

// ---- the parts -------------------------------------------------------------------------------------------------

async function welcome(g: Game): Promise<void> {
  if (g.save.data.plays >= 2) return welcomeBack(g);
  const { actors, layer, world } = g;
  // She may walk and call unicorns while Lumi talks; taps never cut Lumi (names wait their turn).
  g.free = true;
  layer.lumi.show(true);
  await lumiSay(g, CLIPS.welcome);
  // The crown: she stops and turns to the camera, which comes close, so the crown and the clap are seen.
  g.free = false;
  await g.run.until(() => onLand(g), 8000);
  if (actors.princess.mode === 'walk' || actors.princess.mode === 'run') actors.princess.stop();
  const p = princessAt(g);
  actors.princess.face({ x: p.x, z: p.z + 6 });
  await frameAt(g, p, CROWN_WIDTH, actors.princess.position.clone().setY(1.2), 0.42, 1000);
  const head = actors.princess.position.clone().setY(1.6);
  const crown = actors.fx.starfall(head).then(() => {
    actors.princess.crown(true);
    actors.fx.sparkle(head, { count: 16 });
  });
  await lumiSay(g, CLIPS.crown);
  await g.run.w(crown);
  await g.run.w(actors.princess.emote('clap'));
  world.releaseFrame();
  actors.egg.place(NEST_EGG, 'warm');
  actors.fx.sparkle(NEST_EGG.clone().setY(1), { count: 18 });
  world.nestGlow(true);
  setGoal(g, GOALS.nest);
  g.free = true;
  await say(g, CLIPS.eggWaiting);
  // The ghost hand taps the grass between her and the nest (not the nest: that is the goal).
  const q = princessAt(g);
  const grass = v3({ x: (q.x + NEST.stand.x) / 2, z: (q.z + NEST.stand.z) / 2 + 0.6 });
  void layer.ghost.tap(() => world.toScreen(grass));
  await say(g, CLIPS.walk);
}

/**
 * From the second play on the welcome is short: "Hello, Emma!", the crown appears at once with a sparkle, then "An
 * egg is waiting." (no crown close-up, ghost tap or walk line; about 35 s less).
 */
async function welcomeBack(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = true;
  layer.lumi.show(true);
  await lumiSay(g, CLIPS.helloBack);
  const head = actors.princess.position.clone().setY(1.6);
  actors.princess.crown(true);
  actors.fx.sparkle(head, { count: 16 });
  actors.egg.place(NEST_EGG, 'warm');
  actors.fx.sparkle(NEST_EGG.clone().setY(1), { count: 18 });
  world.nestGlow(true);
  setGoal(g, GOALS.nest);
  await say(g, CLIPS.eggWaiting);
}

/** She turns a three-quarter face to the camera: towards a point between the egg (or baby) and the camera. */
function faceBeside(g: Game, at: Vec2): void {
  g.actors.princess.face({ x: at.x, z: at.z + 2 });
}

/** The egg moment and the hatch, for the nest egg (index 0) and the wild egg (index 1). */
async function egg(g: Game, i: 0 | 1): Promise<void> {
  const { actors, layer, world } = g;
  const goal = i === 0 ? GOALS.nest : GOALS.wildEgg;
  const eggAt = i === 0 ? NEST_EGG : WILD_EGG_AT;
  if (!actors.egg.visible) actors.egg.place(eggAt, i === 0 ? 'warm' : 'snow');
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
  const part = i === 0 ? 'egg1' : 'egg2';
  const spec = planEgg(g, i === 0 ? 'warm' : 'snow', part, true);
  await preload(g, eggClipIds(spec));
  const eggPoint = actors.egg.position.clone();
  await frameAt(g, flat(eggPoint), EGG_WIDTH, eggPoint, 0.4);
  const t = momentLog();
  g.openSpec = spec;
  const r = await g.run.w(
    layer.egg(spec, {
      anchor: () => world.toScreen(actors.egg.position),
      react: (k) => {
        if (k === 'hot') void actors.egg.steam();
        else if (k === 'cold') void actors.egg.frost();
        else void actors.egg.wobble();
      },
      log: t.log,
    }),
  );
  g.openSpec = null;
  noteMaths(g, part, spec, r, t);
  await hatch(g, i);
}

async function hatch(g: Game, i: 0 | 1): Promise<void> {
  const { actors } = g;
  const door = i === 0 ? 13 : 14;
  const talk = g.layer.lumi.speak(CLIPS.hatching);
  await g.run.w(actors.egg.hatch());
  const rand = g.randFor(i === 0 ? 'hatch1' : 'hatch2');
  const look = i === 0 ? babyLook('warm', rand) : babyLook('snow', rand, g.babies[0] ? [g.babies[0].look] : []);
  const u = actors.herd.add({ id: `baby-${door}`, name: '', look, at: HATCH_SPOT[door], mode: 'hatching' });
  g.babies[i] = { door, look, unicorn: u, member: null };
  actors.fx.sparkle(u.headTop().setY(0.8), { count: 24, colour: '#ffe27a' });
  faceBeside(g, HATCH_SPOT[door]);
  await g.run.w(talk);
  await lumiSay(g, CLIPS.baby);
  await say(g, CLIPS.foalHello);
}

async function naming(g: Game, i: 0 | 1): Promise<void> {
  const { layer, world } = g;
  const baby = g.babies[i];
  const u = baby.unicorn;
  g.free = false;
  // The second naming has a fourth wrong gem (docs/v4/2.2.md 3.1).
  const spec = namingSpec(g.randFor(i === 0 ? 'naming1' : 'naming2'), i === 1 && g.babies[0]?.member ? [g.babies[0].member.name] : [], i === 0 ? 3 : 4);
  await preload(g, namingClipIds(spec));
  faceBeside(g, flat(u.position));
  // The frame centre a little towards her, so her crown stays clear of Lumi's portrait (top left).
  await frameAt(g, { x: u.position.x - 0.5, z: u.position.z }, BABY_WIDTH, u.headTop(), 0.27, 900, undefined, crownKeep(g));
  const t = momentLog();
  g.openSpec = { bells: spec.bells, chosen: null as NameChoice | null };
  const r = await g.run.w(
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
  g.results.add(i === 0 ? 'naming1' : 'naming2', 's', r, { name: r.name.name, tried: t.tried });
  layer.tag(r.name.name, () => world.toScreen(u.headTop()), 3500);
}

function named(g: Game, baby: Baby, choice: NameChoice): void {
  baby.unicorn.name = choice.name;
  baby.member = newborn(choice, baby.look, baby.door);
}

/** After a bath wish the baby goes for a swim with its toy, then follows her. */
function bathSwim(u: UnicornActor): void {
  u.swim();
  dropToyAfter(u, 14_000);
}

/**
 * A baby's wish beside her: the first baby wants to dress up like her (at the nest), the second asks for a picnic
 * treat (by the wild egg). "Your baby wants to dress up like you!" before the dress-up wish. Nothing before the picnic
 * wish: "I'm hungry!" only before a food would tell her the answer is a food.
 */
async function wish(g: Game, i: 0 | 1): Promise<void> {
  const baby = g.babies[i];
  const u = baby.unicorn;
  g.free = false;
  const part = i === 0 ? 'wish1' : 'wish2';
  const kind = i === 0 ? 'dress' : 'picnic';
  const spec = planWish(g, kind, part, { wish: true });
  const before = kind === 'dress' ? CLIPS.dressUp : [];
  await preload(g, [...wishClipIds(spec), ...afterWish(spec), ...before]);
  await settleBy(g, u);
  await say(g, before);
  await runWish(g, u, spec, part);
  for (const p of g.parked.splice(0)) g.followers.add(p);
  g.followers.add(u, i === 0);
}

/** The first baby's bath wish at the pond, after the first slide: they stand on the shore, facing the camera. */
async function pondWish(g: Game): Promise<void> {
  const { actors, world } = g;
  const baby = g.babies[0];
  if (!baby?.member) return;
  const u = baby.unicorn;
  g.free = false;
  // A slide ends with a swim to the shore: she climbs out, and the baby is off the slide, first.
  await g.run.until(() => onLand(g) && u.mode !== 'slide', 15_000);
  const spec = planWish(g, 'bath', 'pond', { wish: true });
  await preload(g, [...wishClipIds(spec), ...afterWish(spec)]);
  // The nearer shore spot; a swimming baby climbs out at once when it is called.
  const here = princessAt(g);
  const stand = POND_WISH.reduce((a, b) => (dist2(here, a.her) <= dist2(here, b.her) ? a : b));
  g.followers.remove(u);
  parkFollowers(g, stand.her);
  const her = walkTo(g, stand.her);
  const babyRoute = [...world.route(flat(u.position), stand.baby), { x: stand.baby.x, z: stand.baby.z + 0.25 }];
  const walks = Promise.all([her, u.goTo(babyRoute)]);
  await g.run.w(Promise.race([walks, new Promise((r) => setTimeout(r, POND_WISH_MS))]));
  // Still on the way (a long swim to the shore): they appear at their spots, so the frame shows them.
  if (dist2(princessAt(g), stand.her) > 0.6) actors.placePrincess(stand.her, 0);
  if (dist2(flat(u.position), stand.baby) > 0.8) u.place({ x: stand.baby.x, z: stand.baby.z + 0.25 }, 0);
  u.lookAt(stand.her);
  actors.princess.face(flat(u.position));
  await runWish(g, u, spec, 'pond');
  bathSwim(u);
  for (const p of g.parked.splice(0)) g.followers.add(p);
  g.followers.add(u, true);
}

async function pond(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = true;
  g.slid = false;
  setGoal(g, GOALS.pond);
  await say(g, CLIPS.pond);
  await say(g, CLIPS.follow);
  await waitToReach(g, GOALS.pond);
  setGoal(g, null);
  // The ghost hand drags a follower to the top of the slide once.
  const shown = g.followers.list[0] ?? g.babies[0]?.unicorn;
  const demo = shown ? layer.ghost.drag(() => world.toScreen(shown.headTop()), () => world.toScreen(SLIDE.top)) : Promise.resolve();
  await say(g, CLIPS.slideDrag);
  await g.run.w(demo);
  const riding = () => actors.princess.mode === 'slide' || actors.princess.mode === 'climb';
  // Waiting for the first slide: the tap line, then the slide line once more, and the egg comes anyway at 45 s.
  if (!(await g.run.until(() => g.slid, POND_TAP_MS))) {
    if (!riding()) await say(g, CLIPS.slideTap);
    if (!(await g.run.until(() => g.slid, POND_AGAIN_MS))) {
      if (!riding()) await say(g, CLIPS.slideTap);
      await g.run.until(() => g.slid, POND_WAIT_MS - POND_TAP_MS - POND_AGAIN_MS);
    }
  }
  // A little more play (she may slide down too) before the bath wish.
  await g.run.sleep(POND_PLAY_MS);
  await pondWish(g);
  await wildEggArrives(g);
}

async function wildEggArrives(g: Game): Promise<void> {
  const { actors, world } = g;
  g.free = false;
  // The camera frames the egg's landing spot and stays until Lumi has spoken.
  const beam = actors.fx.moonbeam(WILD_EGG_AT, 3600);
  await frameAt(g, WILD_EGG.at, WILD_EGG_WIDTH, WILD_EGG_AT, 0.5, 1100);
  const talk = g.layer.lumi.speak(CLIPS.anotherEgg);
  await g.run.sleep(500);
  actors.egg.place(WILD_EGG_AT, 'snow');
  actors.fx.sparkle(WILD_EGG_AT.clone().setY(0.8), { count: 24, colour: '#cfe8ff' });
  void actors.fx.starfall(WILD_EGG_AT.clone().setY(0.6));
  await g.run.w(talk);
  await g.run.w(beam);
  await g.run.sleep(700);
  world.releaseFrame();
  setGoal(g, GOALS.wildEgg);
  g.free = true;
}

/** Where a herd member waits in the yard: in front of its door, upper doors a step further out. */
function waitSpot(door: number): Vec2 {
  const f = doorFront(door);
  return doorIsUpper(door) ? { x: f.x + 0.45, z: f.z + 2.4 } : { x: f.x - 0.2, z: f.z + 1.3 };
}

async function bedtime(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  const stable = world.stable;
  g.free = true;
  g.bedtime = true;
  layer.foodBasket({ show: false });
  hideOffers(g);
  stable.lanterns(true);
  await g.run.w(setTime(g, 0.5, 3000));
  await say(g, CLIPS.dusk);
  // The herd walks to the yard; her two babies come with her.
  for (const h of g.herd) {
    const u = actors.herd.get(h.id);
    if (!u || u.mode === 'stall') continue;
    g.followers.remove(u);
    void u.goTo(world.route(flat(u.position), waitSpot(h.door)));
  }
  g.followers.set(g.babies.map((b) => b.unicorn));
  setGoal(g, GOALS.stable);
  await say(g, CLIPS.toStable);
  await waitToReach(g, GOALS.stable);
  setGoal(g, null);
  g.free = false;
  await g.run.w(walkTo(g, STABLE.emmaStand));
  actors.princess.face({ x: 0, z: STABLE.frontZ });
  await g.run.w(world.frame(STABLE_FRAME.center, STABLE_FRAME.width, { ms: 1000 }));

  // 1. Roll call: two doors from 7 to 12 of unicorns still outside. The next door is asked while the last walks in.
  const outside = g.herd.filter((h) => !g.stalls.has(h.door)).map((h) => h.door);
  const calls = rollCall(outside, g.randFor('rollcall'), 2);
  const b1 = g.babies[0].member!;
  const b2 = g.babies[1].member!;
  await preload(g, [...doorClipIds(calls), ...moveIn(b1), ...moveIn(b2)]);
  const walking: Promise<void>[] = [];
  for (const spec of calls) {
    const r = await doorMoment(g, spec, 'roll call', async () => {
      walking.push(goIn(g, spec.door, true).catch(() => {}));
      await g.run.sleep(NEXT_DOOR_MS);
    });
    g.results.add('bedtime', 'm', r, { moment: 'roll call', door: spec.door, tried: r.tried });
  }
  // 2. Everyone else of the herd goes in, while the two newborns move in at doors 13 and 14 (not checked).
  const rest = g.herd.filter((h) => !g.stalls.has(h.door) && !g.entering.has(h.door));
  const herdIn = Promise.all(rest.map((h, k) => g.run.sleep(k * HERD_STAGGER_MS).then(() => goIn(g, h.door, false)))).catch(() => {});
  await say(g, CLIPS.herdIn);
  await moveInBaby(g, 0);
  await moveInBaby(g, 1);
  await g.run.w(Promise.all([herdIn, ...walking]));
  // 3. The visit (checked): one of the newborns visits a teen door, 11 to 14.
  const visiting = g.randFor('visit');
  const visitor = visiting() < 0.5 ? b1 : b2;
  const visit = doorVisit(visitor, [...g.stalls.keys()], visiting, calls.map((c) => c.door));
  await preload(g, doorClipIds([visit]));
  const r = await doorMoment(g, visit, 'visit', async () => {
    const u = g.stalls.get(visit.door);
    if (u) {
      u.peek(true);
      void u.emote('hop');
    }
    heartsBetween(g, visitor.door, visit.door);
    await say(g, CLIPS.foalHello);
  });
  g.results.add('bedtime', 'm', r, { moment: 'visit', door: visit.door, visitor: visitor.name, tried: r.tried });
}

/**
 * A unicorn goes into its stall: the door opens, it steps in, the door closes and its head peeks out. A walk that
 * takes longer than WALK_IN_MS ends with a sparkle and the unicorn inside.
 */
async function goIn(g: Game, door: number, hearts: boolean): Promise<void> {
  const { actors, world } = g;
  const h = memberOfDoor(g, door);
  const u = h ? actors.herd.get(h.id) : undefined;
  if (!u || g.stalls.has(door) || g.entering.has(door)) return;
  g.entering.add(door);
  g.followers.remove(u);
  void world.stable.open(door);
  let inside = false;
  const walk = u.enterStall(door).then(() => void (inside = true));
  const wait = (ms: number) => g.run.w(Promise.race([walk, new Promise<void>((r) => setTimeout(r, ms))]));
  await wait(WALK_IN_MS);
  // Still walking: pop it in. Already floating up or stepping in: give it a moment more.
  if (!inside && u.mode !== 'walk') await wait(2500);
  if (!inside) {
    actors.fx.sparkle(doorPoint(door), { count: 14, colour: '#fff1b8' });
    u.putInStall(door, true);
  }
  g.entering.delete(door);
  g.stalls.set(door, u);
  void world.stable.close(door);
  u.peek(true);
  if (hearts) actors.fx.hearts(u.headTop());
}

/** "Pip!" "Baby number thirteen.": the door glows and the baby walks in while the line plays. */
async function moveInBaby(g: Game, i: 0 | 1): Promise<void> {
  const baby = g.babies[i];
  if (!baby?.member) return;
  const stable = g.world.stable;
  stable.glow(baby.door);
  await Promise.all([say(g, moveIn(baby.member)), goIn(g, baby.door, true)]);
  stable.glow(null);
}

/** Every unicorn for the end screen: the two new babies first, then the herd. */
function endMembers(g: Game): EndMember[] {
  const babies = g.babies.filter((b) => b.member).map((b) => ({ name: b.member!.name, body: b.look.body, mane: b.look.mane, isNew: true }));
  return [...babies, ...g.herd.map((h) => ({ name: h.name, body: h.look.body, mane: h.look.mane }))];
}

async function goodnight(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = false;
  g.bedtime = true;
  await g.run.w(setTime(g, 1, 3000));
  // The heads yawn (they duck down to sleep only after the ribbons).
  const inside = [...g.stalls.values()];
  inside.forEach((u, k) => setTimeout(() => void u.emote('yawn'), k * 140));
  await say(g, CLIPS.yawn);
  // "Fourteen unicorns!": the camera tilts up to the stars and the castle over the stable roofs.
  const sky = world.frame(NIGHT_SKY.center, NIGHT_SKY.width, { ms: 2200, pitch: NIGHT_SKY.pitch, shiftY: NIGHT_SKY.shiftY });
  await say(g, CLIPS.herdCount(14));
  await g.run.w(sky);
  await g.run.sleep(800);
  // The ribbons: she stands in front of the door rows, the peeking heads behind her.
  const p = princessAt(g);
  actors.princess.face({ x: p.x, z: p.z + 6 });
  await frameAt(g, p, RIBBONS.width, actors.princess.position.clone().setY(1.0), RIBBONS.frac, 1400, RIBBONS.pitch);
  const head = actors.princess.position.clone().setY(1.6);
  const talk = g.layer.lumi.speak(CLIPS.ribbons);
  await g.run.sleep(1800);
  // The stars land just in front of her head, so they do not hide the new ribbons. The gift is the next colour of
  // her collection, on whatever hair thing she wears; it is saved at once (the end reloads the page).
  await g.run.w(actors.fx.starfall(head.clone().setZ(head.z + 0.35)));
  const gift = nextRibbon(actors.princess.look, ownedRibbons(g.save.data));
  actors.princess.setLook({ ribbon: gift });
  g.save.write((s) => {
    if (gift !== 'pink' && !s.ribbons.includes(gift)) s.ribbons.push(gift);
    s.look.ribbon = gift;
  });
  actors.fx.sparkle(head, { count: 20, colour: RIBBON_HEX[gift] });
  await g.run.w(actors.princess.emote('twirl'));
  actors.princess.face({ x: p.x, z: p.z + 6 });
  actors.fx.hearts(head.clone().setY(1.9));
  sparkleRing(g, p);
  await g.run.w(talk);
  await g.run.sleep(2200);
  // Now the heads duck down to sleep.
  inside.forEach((u, k) => setTimeout(() => u.peek(false), k * 90));
  await lumiSay(g, CLIPS.goodnight);
  g.part = 'end';
  // This play's targets and totals: the next play leaves them out while it can.
  g.save.write((s) => {
    s.last = { words: [...g.today.words], totals: [...g.maths.used.totals] };
  });
  const end = layer.theEnd({ herd: 14, members: endMembers(g) });
  // Once the end screen covers the world, the world stops drawing.
  const pause = setTimeout(() => world.setPaused(true), 1100);
  g.run.defer(() => clearTimeout(pause));
  await g.run.w(end);
  location.reload();
}

/** A ring of sparkles around her feet (the ribbons reward). */
function sparkleRing(g: Game, at: Vec2): void {
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    g.actors.fx.sparkle(new THREE.Vector3(at.x + Math.cos(a) * 0.9, 0.5, at.z + Math.sin(a) * 0.9), { count: 5, colour: k % 2 ? '#d9c2ff' : '#fff1b8' });
  }
}

/** Wait until she has reached the goal (the "this way" helper below keeps her on track). */
async function waitToReach(g: Game, goal: Goal): Promise<void> {
  await g.run.until(() => reached(g, goal));
}

/** Notice the first slide by anyone: a unicorn that goes from the slide into the water, or Princess Emma sliding. */
export function installSlideWatch(g: Game): void {
  const was = new Map<string, string>();
  g.world.onFrame(() => {
    if (g.actors.princess.mode === 'slide') g.slid = true;
    for (const u of g.actors.herd.all()) {
      const m = u.mode;
      if (m === 'swim' && was.get(u.id) === 'slide') g.slid = true;
      was.set(u.id, m);
    }
  });
}

/** The "this way" helper runs on every frame and watches progress towards the current goal. */
export function installWayHelper(g: Game): void {
  let best = Infinity;
  let goalRef: object | null = null;
  let quiet = 0;
  let wait = 20_000;
  g.world.onFrame((dt) => {
    const goal = g.goal;
    if (!goal || !g.free || g.door || g.layer.snapshot().moment) {
      goalRef = goal;
      quiet = 0;
      best = Infinity;
      return;
    }
    if (goal !== goalRef) {
      goalRef = goal;
      best = Infinity;
      quiet = 0;
      wait = 20_000;
    }
    const d = dist2(princessAt(g), goal.stand);
    if (d < best - 0.5) {
      best = d;
      quiet = 0;
      return;
    }
    quiet += dt * 1000;
    if (quiet >= wait && !audio.speaking) {
      sayWay(g);
      quiet = 0;
      wait = 30_000;
    }
  });
}

// ---- running and jumping -----------------------------------------------------------------------------------------

const STEPS: Record<Part, (g: Game) => Promise<void>> = {
  wardrobe,
  welcome,
  egg1: (g) => egg(g, 0),
  naming1: (g) => naming(g, 0),
  wish1: (g) => wish(g, 0),
  pond,
  egg2: (g) => egg(g, 1),
  naming2: (g) => naming(g, 1),
  wish2: (g) => wish(g, 1),
  free: afternoon,
  bedtime,
  goodnight,
};

/** Play the level from `from` to the end on a fresh run. */
export function playFrom(g: Game, from: Part): void {
  g.run.stop();
  const run = new Run((fn) => g.world.onFrame(fn));
  g.run = run;
  void (async () => {
    try {
      for (const part of PARTS.slice(PARTS.indexOf(from))) {
        if (!run.alive) return;
        g.part = part;
        await STEPS[part](g);
      }
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error('[mmw level]', e);
    }
  })();
}

/**
 * Fixed choices for the parts a jump skips: the first bell's name for each baby. The look and the bells come from the
 * same streams as in a full play.
 */
function snapBaby(g: Game, i: 0 | 1, at: Vec2, nameIt: boolean): Baby {
  const door = i === 0 ? 13 : 14;
  const rand = g.randFor(i === 0 ? 'hatch1' : 'hatch2');
  const look = i === 0 ? babyLook('warm', rand) : babyLook('snow', rand, [g.babies[0].look]);
  const u = g.actors.herd.add({ id: `baby-${door}`, name: '', look, at });
  const baby: Baby = { door, look, unicorn: u, member: null };
  const naming = g.randFor(i === 0 ? 'naming1' : 'naming2');
  if (nameIt) named(g, baby, namingSpec(naming, i === 1 && g.babies[0].member ? [g.babies[0].member.name] : [], i === 0 ? 3 : 4).bells[0]);
  return baby;
}

/** Put the world into the state of the start of `part`, at once. */
export function snapTo(g: Game, part: Part): void {
  const { actors, layer, world } = g;
  const k = PARTS.indexOf(part);
  const after = (p: Part) => k > PARTS.indexOf(p);
  g.run.stop();
  layer.reset();
  audio.stop();
  g.streams.reset();
  g.maths = startMaths(g.options.band);
  g.today = { wishes: 0, words: [] };
  g.quests = startQuests();
  g.openSpec = null;
  g.door = null;
  g.free = false;
  g.bedtime = part === 'bedtime' || part === 'goodnight';
  g.slid = false;
  g.entering.clear();
  setGoal(g, null);
  g.followers.clear();
  g.parked = [];
  g.stalls.clear();
  world.setPaused(false);
  world.releaseFrame();
  world.nestGlow(false);
  world.stable.glow(null);
  world.stable.glowRow(null);
  for (let d = 1; d <= 20; d++) void world.stable.close(d);
  void setTime(g, part === 'goodnight' ? 0.5 : 0, 0);
  world.stable.lanterns(part === 'goodnight');
  world.stable.hay(0, 0);
  hideOffers(g);
  layer.lumi.show(part !== 'welcome' && part !== 'wardrobe');
  // Her saved look (the customiser starts from it too); the picnic rose is for one day only.
  actors.princess.setLook(g.save.data.look);
  actors.princess.extra(null);
  actors.princess.crown(part !== 'welcome' && part !== 'wardrobe');

  // The egg of this part.
  actors.egg.hide();
  if (part === 'egg1') actors.egg.place(NEST_EGG, 'warm');
  if (part === 'egg2') actors.egg.place(WILD_EGG_AT, 'snow');
  if (part === 'egg1') world.nestGlow(true);

  // Princess Emma.
  const where: Record<Part, [Vec2, number]> = {
    wardrobe: [START, 0],
    welcome: [START, 0],
    egg1: [SIDE[0], Math.PI / 2],
    naming1: [SIDE[0], Math.PI / 2],
    wish1: [SIDE[0], Math.PI / 2],
    pond: [NEST.stand, Math.PI / 2],
    egg2: [SIDE[1], Math.PI / 2],
    naming2: [SIDE[1], Math.PI / 2],
    wish2: [SIDE[1], Math.PI / 2],
    free: [{ x: SLIDE.ladderBase.x - 1.5, z: SLIDE.ladderBase.z + 2.5 }, 0],
    bedtime: [{ x: 1, z: -2 }, Math.PI],
    goodnight: [STABLE.emmaStand, Math.PI],
  };
  const [at, heading] = where[part];
  actors.placePrincess(at, heading);
  if (part === 'egg1' || part === 'naming1') faceBeside(g, NEST.center);
  if (part === 'egg2' || part === 'naming2') faceBeside(g, WILD_EGG.at);

  // The herd grazes, or sleeps in its stalls at goodnight.
  g.herd.forEach((h, i) => {
    const u = actors.herd.get(h.id);
    if (!u) return;
    u.nightcap(false);
    u.showToy(null);
    if (part === 'goodnight') {
      u.putInStall(h.door, true);
      g.stalls.set(h.door, u);
    } else {
      u.place(GRAZE_HOMES[i]);
      u.followSlot = null;
      u.graze(GRAZE_HOMES[i]);
    }
  });
  if (part === 'wardrobe') herdAside(g, true);

  // The newborns.
  actors.herd.remove('baby-13');
  actors.herd.remove('baby-14');
  g.babies = [];
  if (after('egg1')) {
    const spot = part === 'naming1' ? HATCH_SPOT[13] : { x: at.x + 1.7, z: at.z + 1.3 };
    g.babies[0] = snapBaby(g, 0, spot, after('naming1'));
  }
  if (after('egg2')) {
    const spot = part === 'naming2' ? HATCH_SPOT[14] : { x: at.x - 0.9, z: at.z + 1.4 };
    g.babies[1] = snapBaby(g, 1, spot, after('naming2'));
  }
  for (const b of g.babies) {
    if (part === 'goodnight') {
      b.unicorn.putInStall(b.door, true);
      g.stalls.set(b.door, b.unicorn);
    }
  }
  const followNow = g.babies.filter((b, i) => b.member && part !== 'goodnight' && !(part === 'wish1' && i === 0) && !(part === 'wish2' && i === 1));
  g.followers.set(followNow.map((b) => b.unicorn));

  // The camera: on the part's spot at once.
  if (part === 'goodnight') void world.frame(STABLE_FRAME.center, STABLE_FRAME.width, { ms: 0 });
  world.snapCamera();
}

/** Jump to a part (test hook, ?at=): snap the world, then play on from there. */
export function jump(g: Game, part: Part): void {
  snapTo(g, part);
  playFrom(g, part);
}

/**
 * The start, right after the Play tap (a play started: the save counts it): preload the customiser's clips first,
 * sweep down to Princess Emma, then the customiser. With ?at= the sweep is skipped and the level jumps to that part
 * (?at=wardrobe to the customiser; any other part keeps her saved look).
 */
export async function begin(g: Game, at: Part | null): Promise<void> {
  g.save.write((s) => void (s.plays += 1));
  const dressing = audio.preload(wardrobePartClipIds());
  const loading = Promise.all([dressing, audio.preload(startClipIds(g)), audio.preloadSounds(allGraphemes())]);
  if (at) {
    await Promise.race([loading, new Promise((r) => setTimeout(r, 4000))]);
    jump(g, at);
    return;
  }
  await Promise.all([g.world.introSweep(INTRO_MS), Promise.race([loading, new Promise((r) => setTimeout(r, 6000))])]);
  playFrom(g, 'wardrobe');
}
