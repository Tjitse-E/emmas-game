// What the level and the side quests share around a checked moment (moved out of level.ts in 2.2.0): planning a wish
// with the reading level, an egg with the maths band and this play's sums, each from its own random stream; running
// a wish beside a baby; how a baby shows the reactions; and noting every result (the results log, the reading level,
// the maths band and the save).
import * as THREE from 'three';
import type { EggSpec, MomentHooks, MomentResult, Vec2, WishItem, WishSpec } from '../contracts';
import type { UnicornActor } from '../actors';
import { dist2 } from '../layout';
import { CLIPS, eggSpec, wishSpec } from '../content';
import { type Game, flat, frameAt, princessAt, say } from './game';
import { foldReading, readingLevelFor } from './reading';
import { type Band, noteBand, useSum } from './band';

const BABY_WIDTH = 5.5;
/** A worn picture stays on the baby's head this long. */
const WEAR_MS = 20_000;
/** A dish or a mug from a picnic wish stays at the baby's feet this long (the bath toy stays for the swim). */
const PLAY_MS = 8000;

// ---- the moment log ------------------------------------------------------------------------------------------------

/** What a moment logged: every wrong choice (`tried`) and the ui's flags for the diag line (print touched, quick). */
export interface MomentLog {
  readonly tried: string[];
  readonly flags: { printTouched?: boolean; quick?: boolean };
  readonly log: NonNullable<MomentHooks['log']>;
}

export function momentLog(): MomentLog {
  const tried: string[] = [];
  const flags: MomentLog['flags'] = {};
  return {
    tried,
    flags,
    log: (event, data) => {
      if (event === 'tried') {
        tried.push(String(data?.what ?? ''));
        return;
      }
      for (const k of ['printTouched', 'quick'] as const) {
        if (typeof data?.[k] === 'boolean') flags[k] = data[k] as boolean;
      }
    },
  };
}

// ---- babies --------------------------------------------------------------------------------------------------------

/** A picture shown by a baby, taken away after `ms` unless another one replaced it meanwhile. */
const toys = new WeakMap<UnicornActor, number>();
export function showToy(u: UnicornActor, pic: string | null, o: { on?: 'ground' | 'head'; ms?: number } = {}): void {
  const token = (toys.get(u) ?? 0) + 1;
  toys.set(u, token);
  u.showToy(pic, pic ? { on: o.on ?? 'ground' } : undefined);
  if (pic && o.ms) setTimeout(() => toys.get(u) === token && u.showToy(null), o.ms);
}

/** Take a baby's picture away after `ms`, unless another one replaced it meanwhile. */
export function dropToyAfter(u: UnicornActor, ms: number): void {
  const token = toys.get(u) ?? 0;
  setTimeout(() => toys.get(u) === token && u.showToy(null), ms);
}

/**
 * How a baby shows the reactions a naming or wish moment asks for. `toy` is the wish's picture; a played-with toy is
 * taken away after `playMs` (none: it stays until someone takes it away, as bathSwim does).
 */
export function babyReact(g: Game, u: UnicornActor, toy?: string, playMs?: number): MomentHooks['react'] {
  return (k) => {
    const heart = () => g.actors.fx.hearts(u.headTop().setY(u.headTop().y - 0.1));
    switch (k) {
      case 'munch':
        void u.emote('munch');
        heart();
        return;
      case 'play':
        showToy(u, toy ?? null, { ms: playMs });
        void u.emote('hop');
        heart();
        return;
      case 'wear':
        // The picture on its head for a while, a happy wiggle and a sparkle.
        showToy(u, toy ?? null, { on: 'head', ms: WEAR_MS });
        void u.emote('happy');
        g.actors.fx.sparkle(u.headTop().setY(u.headTop().y + 0.15), { count: 14, colour: '#fff1b8' });
        return;
      case 'shake':
        void u.emote('shake');
        return;
      case 'happy':
        void u.emote('happy');
        return;
      case 'look':
        void u.emote('look');
        return;
      default:
        void u.emote('happy');
    }
  };
}

/**
 * Her followers step aside, behind her and away from the camera, while an egg and its baby have her attention, so
 * nobody plays in front of the egg, the bubble or the basket. They follow again after the baby's wish. A place with
 * its own waiting spots (the picnic) passes them as `spots`.
 */
export function parkFollowers(g: Game, her: { x: number; z: number }, spots?: readonly Vec2[]): void {
  g.followers.sync();
  const list = g.followers.list.slice();
  list.forEach((u, k) => {
    g.followers.remove(u);
    const spot = g.world.nearestWalkable(spots?.[k] ?? { x: her.x - 1.6 - 0.9 * k, z: her.z - 1.4 + 0.6 * k });
    void u.goTo(g.world.route(flat(u.position), spot));
  });
  g.parked.push(...list);
}

/**
 * The named baby follows Princess Emma (slot 0); for its wish it stops beside her, so followers' play cannot move
 * it away from the bubble and the basket.
 */
export async function settleBy(g: Game, u: UnicornActor): Promise<void> {
  g.followers.add(u, true);
  await g.run.until(() => dist2(flat(u.position), princessAt(g)) < 2.2, 2500);
  g.followers.remove(u);
  const p = princessAt(g);
  const spot = g.world.nearestWalkable({ x: p.x + 1.7, z: p.z + 0.7 });
  // The last small step is towards the camera, so the baby ends facing her (Emma, holding the iPad).
  const route = [...g.world.route(flat(u.position), spot), { x: spot.x, z: spot.z + 0.25 }];
  await g.run.w(Promise.race([u.goTo(route), new Promise((r) => setTimeout(r, 4000))]));
  u.lookAt(p);
  g.actors.princess.face(flat(u.position));
}

/** Her crown stays on screen in a baby close-up, also when she stands further back than the baby (the nest wish). */
export function crownKeep(g: Game): { point: THREE.Vector3; frac: number } {
  return { point: g.actors.princess.position.clone().setY(1.6), frac: 0.04 };
}

/**
 * Frame a wish: the baby's head top at 45% of the height, and the frame centre between the baby and her, so she is
 * well clear of Lumi's portrait in the top left corner.
 */
export function frameWish(g: Game, u: UnicornActor): Promise<void> {
  const b = flat(u.position);
  return frameAt(g, { x: b.x - 0.6, z: b.z }, BABY_WIDTH, u.headTop(), 0.45, 900, undefined, crownKeep(g));
}

// ---- wishes --------------------------------------------------------------------------------------------------------

/** How the baby takes an item: its own reaction, or the kind's (food and picnic munch, dress-up wears, the rest play). */
export function reactOf(item: WishItem, kind: WishSpec['kind']): 'munch' | 'play' | 'wear' {
  if (item.react) return item.react;
  if (kind === 'food' || kind === 'picnic') return 'munch';
  return kind === 'dress' ? 'wear' : 'play';
}

/**
 * A wish of `kind` from the stream `label`. The three wishes count for the warm-up (the play's first one is a level
 * lower); the picnic guests do not. Targets leave out the last play's and the ones asked earlier today.
 * `?contrast=0` drops the miss contrast (a spec without clips.again keeps v3's miss rule).
 */
export function planWish(g: Game, kind: WishSpec['kind'], label: string, o: { wish: boolean }): WishSpec {
  const level = readingLevelFor(g.save.data.reading, { warmUp: o.wish && g.today.wishes === 0, forced: g.options.readingLevel });
  if (o.wish) g.today.wishes++;
  const exclude = [...new Set([...g.save.data.last.words, ...g.today.words])];
  const rand = g.randFor(label);
  const spec = wishSpec(kind, rand, exclude, { level, contrast: g.options.contrast });
  g.today.words.push(spec.target.word);
  return spec;
}

/** The baby's line after it has its wish: "Pretty!", "Yum!" or "Yay!". */
export function afterWish(spec: WishSpec): string[] {
  const r = reactOf(spec.target, spec.kind);
  return r === 'wear' ? CLIPS.pretty : r === 'munch' ? CLIPS.yum : CLIPS.yay;
}

/** Every clip a wish needs besides wishClipIds(spec): the baby's line after it. */
export const wishExtraClipIds = (spec: WishSpec): string[] => afterWish(spec);

/** A reading result moves the hidden level (unless ?rl= forces one) and goes into the save. */
export function noteReading(g: Game, outcome: MomentResult['outcome']): void {
  if (g.options.readingLevel) return;
  g.save.write((s) => {
    s.reading = foldReading(s.reading, outcome);
  });
}

/**
 * One wish of a baby; returns when the baby has had its food, toy or dress-up. Framed beside her unless `frame` is
 * false (the picnic keeps its own frame on the rug).
 */
export async function runWish(g: Game, u: UnicornActor, spec: WishSpec, part: string, o: { frame?: boolean } = {}): Promise<MomentResult> {
  const { layer, world } = g;
  const framed = o.frame !== false;
  if (framed) await frameWish(g, u);
  const t = momentLog();
  g.openSpec = spec;
  const r: MomentResult = await g.run.w(
    layer.wish(spec, {
      anchor: () => world.toScreen(u.headTop()),
      react: babyReact(g, u, spec.target.pic, spec.kind === 'bath' ? undefined : PLAY_MS),
      log: t.log,
    }),
  );
  g.openSpec = null;
  g.results.add(part, 'r', r, {
    kind: spec.kind, word: spec.target.word, level: spec.level, size: spec.basket.length, tried: t.tried, decoys: spec.decoys, ...t.flags,
  });
  noteReading(g, r.outcome);
  u.lookAt(null);
  await say(g, afterWish(spec));
  if (framed) world.releaseFrame();
  return r;
}

// ---- maths ---------------------------------------------------------------------------------------------------------

/** What the maths lane's eggSpec and rackSpec read (docs/v4/2.2.md 4.2), beyond `first`. */
export interface EggAsk {
  /** The first egg of its kind: the intro (and the warm egg's spoken gesture). */
  first?: boolean;
  /** 4 stones and the narrower ranges (a), or 5 and the wider ones (b). */
  band: Band;
  /** Totals and answers asked earlier this play: never again while other sums are left. */
  used: { totals: number[]; answers: number[] };
  /** The last play's totals, left out while other sums are left. */
  lastTotals: number[];
}

export function eggAsk(g: Game, first = false): EggAsk {
  const used = { totals: [...g.maths.used.totals], answers: [...g.maths.used.answers] };
  return { first, band: g.maths.band, used, lastTotals: [...g.save.data.last.totals] };
}

/** An egg from the stream `label` in the current band; its sum is then used for this play. */
export function planEgg(g: Game, kind: EggSpec['kind'], label: string, first: boolean): EggSpec {
  const ask: EggAsk = eggAsk(g, first);
  const spec = eggSpec(kind, g.randFor(label), ask);
  useSum(g.maths, spec);
  return spec;
}

/** A maths result (an egg or the hay rack): the results log with the tray, and the band moves. */
export function noteMaths(g: Game, part: string, spec: EggSpec, r: MomentResult, t: MomentLog): void {
  g.results.add(part, 'm', r, {
    kind: spec.kind, need: spec.need, have: spec.have, answer: spec.answer, band: spec.band ?? g.maths.band,
    stones: spec.stones, place: spec.stones.indexOf(spec.answer), decoys: spec.decoys ?? {}, tried: t.tried, ...t.flags,
  });
  noteBand(g.maths, r.outcome);
}
