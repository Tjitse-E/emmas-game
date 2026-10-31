// Bedtime and goodnight (moved out of level.ts in 2.4.0, so the babies lane owns them): the bell and the dusk, the herd
// and her babies to the stable yard, the roll call, everyone in while the newborns move in, a newborn's visit to a teen
// door; then the night, the count under the stars, Lumi's ribbons, the kind=play line and the end screen. 2.3.0 added
// the effects of the bedtime bell and the goodnight owl (each line waits for its effect, at most 1 s). 2.4.0
// (docs/v4/2.4.md section 5.6): no baby up to four. With none "The stable is this way." replaces "Walk to the stable
// with your babies.", the roll call asks 3 doors and there is no visit; with n the roll call asks 2, the babies move in
// at 13 to 12 + n, one visits a door from 11 to 12 + n, and goodnight counts 12 + n. Babies that follow her keep
// following; the others walk to the yard as the herd does. Bedtime writes the play clock's minute it began.
import * as THREE from 'three';
import type { EndMember, Vec2 } from '../contracts';
import { NIGHT_SKY, STABLE, STABLE_FRAME, doorFront, doorIsUpper } from '../layout';
import { PALETTE, RIBBON_COLOUR, nextRibbon } from '../wardrobe';
import { audio } from '../audio';
import { CLIPS, doorClipIds, moveIn } from '../content';
import { bedtimeDoors } from '../content/doors';
import { type Game, GOALS, doorPoint, flat, frameAt, lumiSay, memberOfDoor, preload, princessAt, say, setGoal, setTime, waitToReach, walkTo } from './game';
import { doorMoment, heartsBetween } from './doors';
import { ownedRibbons } from './save';
import { hideOffers } from './quests';
import { diagQuery, playFields, sendDiag } from './results';
import { mergeLast, playOf, todayOf } from './report';

/** The ribbons close-up: her chest at `frac` of the height, both door rows with their peeking heads behind her. */
const RIBBONS = { width: 8.6, pitch: 24, frac: 0.64 };
/** The longest walk into a stall; after that the unicorn pops straight in (bedtime never waits on a slow walker). */
const WALK_IN_MS = 4000;
/** Roll call: the next door is asked this long after the right door, while that unicorn still walks in. */
const NEXT_DOOR_MS = 1200;
const HERD_STAGGER_MS = 250;

/** Where a herd member waits in the yard: in front of its door, upper doors a step further out. */
export function waitSpot(door: number): Vec2 {
  const f = doorFront(door);
  return doorIsUpper(door) ? { x: f.x + 0.45, z: f.z + 2.4 } : { x: f.x - 0.2, z: f.z + 1.3 };
}

/**
 * Bedtime's lines and count for `babies` named babies: the walk line (with none "The stable is this way.", else "Walk
 * to the stable with your babies."), the count under the stars and the end screen's herd, 12 + n.
 */
export function bedtimeLines(babies: number): { walk: string[]; count: string[]; herd: number } {
  const herd = 12 + babies;
  return { walk: babies > 0 ? CLIPS.toStable : CLIPS.herdWay, count: CLIPS.herdCount(herd), herd };
}

/** Her named babies, in hatch order. */
const namedBabies = (g: Game) => g.babies.filter((b) => b.member);

/**
 * Everyone to the stable yard: the herd walks to its doors' waiting spots and stops following her; her babies that
 * follow her keep following, the others walk to the yard as the herd does.
 */
export function toTheYard(g: Game): void {
  const { actors, world } = g;
  for (const h of g.herd) {
    const u = actors.herd.get(h.id);
    if (!u || u.mode === 'stall') continue;
    g.followers.remove(u);
    void u.goTo(world.route(flat(u.position), waitSpot(h.door)));
  }
  g.followers.sync();
  const following = g.babies.map((b) => b.unicorn).filter((u) => g.followers.list.includes(u));
  g.followers.set(following);
  for (const b of g.babies) {
    const u = b.unicorn;
    if (following.includes(u) || u.mode === 'stall') continue;
    void u.goTo(world.route(flat(u.position), waitSpot(b.door)));
  }
}

export async function bedtime(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  const stable = world.stable;
  g.free = true;
  g.bedtime = true;
  // The play clock's time when bedtime began (the play line's bt).
  if (g.hub.bedtimeAt === null) g.hub.bedtimeAt = g.hub.playMs;
  const named = namedBabies(g);
  const lines = bedtimeLines(named.length);
  layer.foodBasket({ show: false });
  hideOffers(g);
  stable.lanterns(true);
  audio.ambience('night');
  // The bedtime bell (2 s) starts 1 s into the 3 s dusk fade, so it ends with the fade; "The sun is going down."
  // follows the fade and never cuts the bell's second ring (2.3 section 20).
  await g.run.w(Promise.all([setTime(g, 0.5, 3000), g.run.sleep(1000).then(() => audio.fx('bedtime-bell'))]));
  await say(g, CLIPS.dusk);
  // The herd walks to the yard; the babies that follow her come with her.
  toTheYard(g);
  setGoal(g, GOALS.stable);
  await say(g, lines.walk);
  await waitToReach(g, GOALS.stable);
  setGoal(g, null);
  g.free = false;
  await g.run.w(walkTo(g, STABLE.emmaStand));
  actors.princess.face({ x: 0, z: STABLE.frontZ });
  await g.run.w(world.frame(STABLE_FRAME.center, STABLE_FRAME.width, { ms: 1000 }));

  // 1. Roll call: two doors from 7 to 12 of unicorns still outside (three with no baby). The next door is asked while
  // the last walks in. The visit is drawn with them, so its lines load now too.
  const outside = g.herd.filter((h) => !g.stalls.has(h.door)).map((h) => h.door);
  const { calls, visit } = bedtimeDoors(named.length, outside, g.randFor('rollcall'), named.map((b) => b.member!));
  await preload(g, [...doorClipIds(visit ? [...calls, visit] : calls), ...named.flatMap((b) => moveIn(b.member!)), ...lines.count]);
  const walking: Promise<void>[] = [];
  for (const spec of calls) {
    const r = await doorMoment(g, spec, 'roll call', async () => {
      walking.push(goIn(g, spec.door, true).catch(() => {}));
      await g.run.sleep(NEXT_DOOR_MS);
    });
    g.results.add('bedtime', 'm', r, { moment: 'roll call', door: spec.door, tried: r.tried });
  }
  // 2. Everyone else of the herd goes in, while the newborns move in at their doors, 13 on (not checked).
  const rest = g.herd.filter((h) => !g.stalls.has(h.door) && !g.entering.has(h.door));
  const herdIn = Promise.all(rest.map((h, k) => g.run.sleep(k * HERD_STAGGER_MS).then(() => goIn(g, h.door, false)))).catch(() => {});
  await say(g, CLIPS.herdIn);
  for (let i = 0; i < g.babies.length; i++) await moveInBaby(g, i);
  await g.run.w(Promise.all([herdIn, ...walking]));
  // 3. The visit (checked): one of the newborns visits a door from 11 to 12 + n. No named baby, no visit.
  if (!visit) return;
  const visitor = named.map((b) => b.member!).find((m) => m.clip === visit.goal[0]) ?? named[0].member!;
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
export async function goIn(g: Game, door: number, hearts: boolean): Promise<void> {
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
export async function moveInBaby(g: Game, i: number): Promise<void> {
  const baby = g.babies[i];
  if (!baby?.member) return;
  const stable = g.world.stable;
  stable.glow(baby.door);
  await Promise.all([say(g, moveIn(baby.member)), goIn(g, baby.door, true)]);
  stable.glow(null);
}

/** Every unicorn for the end screen: the new babies first, then the herd. */
export function endMembers(g: Game): EndMember[] {
  const babies = g.babies.filter((b) => b.member).map((b) => ({ name: b.member!.name, body: b.look.body, mane: b.look.mane, isNew: true }));
  return [...babies, ...g.herd.map((h) => ({ name: h.name, body: h.look.body, mane: h.look.mane }))];
}

export async function goodnight(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  g.free = false;
  g.bedtime = true;
  await g.run.w(setTime(g, 1, 3000));
  // The heads yawn (they duck down to sleep only after the ribbons).
  const inside = [...g.stalls.values()];
  inside.forEach((u, k) => setTimeout(() => void u.emote('yawn'), k * 140));
  await say(g, CLIPS.yawn);
  // "Fourteen unicorns!" (12 and her babies): the camera tilts up to the stars and the castle over the stable roofs.
  const lines = bedtimeLines(namedBabies(g).length);
  const sky = world.frame(NIGHT_SKY.center, NIGHT_SKY.width, { ms: 2200, pitch: NIGHT_SKY.pitch, shiftY: NIGHT_SKY.shiftY });
  await say(g, lines.count);
  await g.run.w(sky);
  await g.run.sleep(800);
  // An owl hoots after the sky shot, while the camera comes down to her; Lumi's ribbons line waits for it.
  const owl = audio.fx('owl');
  // The ribbons: she stands in front of the door rows, the peeking heads behind her.
  const p = princessAt(g);
  actors.princess.face({ x: p.x, z: p.z + 6 });
  await frameAt(g, p, RIBBONS.width, actors.princess.position.clone().setY(1.0), RIBBONS.frac, 1400, RIBBONS.pitch);
  await g.run.w(owl);
  const head = actors.princess.position.clone().setY(1.6);
  const talk = g.layer.lumi.speak(CLIPS.ribbons);
  await g.run.sleep(1800);
  // The stars land just in front of her head, so they do not hide the new ribbons. The gift is the next colour of
  // her collection, on whatever hair thing she wears; it is saved at once (the end reloads the page).
  await g.run.w(actors.fx.starfall(head.clone().setZ(head.z + 0.35)));
  const gift = nextRibbon(ownedRibbons(g.save.data), actors.princess.look.thingColour);
  const colour = RIBBON_COLOUR[gift];
  actors.princess.setLook({ thingColour: colour });
  g.save.write((s) => {
    if (gift !== 'pink' && !s.ribbons.includes(gift)) s.ribbons.push(gift);
    s.look.thingColour = colour;
  });
  actors.fx.sparkle(head, { count: 20, colour: PALETTE[colour].small });
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
  // This play's targets and totals added to the ones it started with (as after each place): the next play leaves them
  // out while it can, and a short play never drops the last full play's words.
  const last = mergeLast(g.start.last, todayOf(g));
  g.save.write((s) => {
    s.last = last;
  });
  // One kind=play line per play, before the end screen and its reload (2.3 section 17.5).
  sendDiag(diagQuery(playFields(playOf(g))));
  const end = layer.theEnd({ herd: lines.herd, members: endMembers(g) });
  // Once the end screen covers the world, the world stops drawing.
  const pause = setTimeout(() => world.setPaused(true), 1100);
  g.run.defer(() => clearTimeout(pause));
  await g.run.w(end);
  location.reload();
}

/** A ring of sparkles around her feet (the ribbons reward). */
export function sparkleRing(g: Game, at: Vec2): void {
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    g.actors.fx.sparkle(new THREE.Vector3(at.x + Math.cos(a) * 0.9, 0.5, at.z + Math.sin(a) * 0.9), { count: 5, colour: k % 2 ? '#d9c2ff' : '#fff1b8' });
  }
}
