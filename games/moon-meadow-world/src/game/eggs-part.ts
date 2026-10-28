// The two egg parts of the level (moved out of level.ts in 2.3.0, so the eggs lane owns them): she walks to the egg,
// the egg moment runs, and the baby hatches. 2.3.0 asks three sums per egg (docs/v4/2.3.md sections 12 and 19.1): an
// easy one within 10, a middle one just past 10, a hard one across ten at her band, each its own checked moment and
// result line, on one panel that stays on screen between them. Three hearts light one per sum ("A happy heart!"), the
// egg glows and wobbles more with each, and it hatches after the third. The background stays silent across all three
// (audio.checked(true) around them), and checked() per sum keeps the clock.
import * as THREE from 'three';
import type { EggSpec, MomentHooks, MomentResult, Vec2 } from '../contracts';
import { NEST, WILD_EGG } from '../layout';
import { CLIPS, babyLook, eggClipIds } from '../content';
import { audio } from '../audio';
import { type Game, GOALS, checked, faceBeside, flat, frameAt, lumiSay, preload, say, setGoal, waitToReach, walkTo } from './game';
import { type MomentLog, momentLog, parkFollowers } from './moments';
import { noteMaths, planEggs } from './maths';

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

/** The egg moment and the hatch, for the nest egg (index 0) and the wild egg (index 1). */
export async function egg(g: Game, i: 0 | 1): Promise<void> {
  const { actors, world } = g;
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
  const kind = i === 0 ? 'warm' : 'snow';
  const part = i === 0 ? 'egg1' : 'egg2';
  // A jump to the wild egg skipped the nest egg: plan its sums all the same, so this egg leaves out what a full play
  // leaves out and ?at=egg2&seed=5 asks the same three sums as a whole play with seed 5 (in the same band).
  if (i === 1 && g.maths.used.totals.length === 0) planEggs(g, 'warm', 'egg1', true);
  const specs = planEggs(g, kind, part, true);
  await preload(g, [...new Set([...specs.flatMap((s) => eggClipIds(s)), ...CLIPS.heart])]);
  const eggPoint = actors.egg.position.clone();
  await frameAt(g, flat(eggPoint), EGG_WIDTH, eggPoint, 0.4);
  // The background stays out from before the first sum to after the third, "A happy heart!" included.
  audio.checked(true);
  try {
    for (const spec of specs) {
      const t = momentLog();
      g.openSpec = spec;
      const r = await checked(g, eggSum(g, spec, t));
      g.openSpec = null;
      noteMaths(g, part, spec, r, t);
    }
  } finally {
    audio.checked(false);
  }
  await hatch(g, i);
}

/**
 * One of the egg's three sums on the panel. After the first and the second, the panel stays while its next heart
 * lights (the ui's react('heart'), and the egg glows and wobbles more), and Elizabeth says "A happy heart!" once the
 * heart's effect has played (the ui awaits it before it resolves).
 */
async function eggSum(g: Game, spec: EggSpec, t: MomentLog): Promise<MomentResult> {
  const { actors, layer, world } = g;
  const lit = ((spec.round?.index ?? 0) + 1) as 1 | 2 | 3;
  const hooks: MomentHooks = {
    anchor: () => world.toScreen(actors.egg.position),
    react: (k) => {
      if (k === 'hot') void actors.egg.steam();
      else if (k === 'cold') void actors.egg.frost();
      else if (k === 'heart') {
        actors.egg.hearts(lit);
        void actors.egg.wobble();
      } else void actors.egg.wobble();
    },
    log: t.log,
  };
  const r = await layer.egg(spec, hooks);
  if (lit < 3) await say(g, CLIPS.heart);
  return r;
}

async function hatch(g: Game, i: 0 | 1): Promise<void> {
  const { actors } = g;
  const door = i === 0 ? 13 : 14;
  const talk = g.layer.lumi.speak(CLIPS.hatching);
  // The crack plays ducked under Lumi's "It's hatching!" (the synthesised hatch until its file is made).
  void audio.fx('egg-crack', { duck: true, fallback: 'hatch' });
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
