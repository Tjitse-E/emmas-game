// The two egg parts of the level (moved out of level.ts in 2.3.0, so the eggs lane owns them): she walks to the egg,
// the egg moment runs, and the baby hatches. 2.3.0 asks three sums per egg (docs/v4/2.3.md sections 12 and 19.1): an
// easy one within 10, a middle one just past 10, a hard one across ten at her band, each its own checked moment and
// result line; three hearts light one per sum and the egg hatches after the third. The background stays silent across
// all three (audio.checked(true) around them), and checked() per sum keeps the clock.
//
// Step 0: one sum per egg, as in 2.2.0. The eggs lane builds the three sums.
import * as THREE from 'three';
import type { Vec2 } from '../contracts';
import { NEST, WILD_EGG } from '../layout';
import { CLIPS, babyLook, eggClipIds } from '../content';
import { type Game, GOALS, checked, faceBeside, flat, frameAt, lumiSay, preload, say, setGoal, waitToReach, walkTo } from './game';
import { momentLog, parkFollowers } from './moments';
import { noteMaths, planEgg } from './maths';

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
  const r = await checked(
    g,
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
