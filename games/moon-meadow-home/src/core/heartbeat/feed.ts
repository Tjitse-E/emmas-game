// Feeding (docs/v3/next/plan.md F1, N11, N20, N21, N23, N25): which words are unicorn foods, when a first wish is
// hungry, the meadow and manger tray, what each baby wants at its manger, tonight's checked manger moment, and the
// hay rack as an egg-like task with its lines. Pure: no scene, store or audio here.
import type { Pick } from '../planner/index.ts';
import type { EggTask } from '../maths/eggs.ts';
import { bondId, numId } from '../keys.ts';
import { type Rng, shuffle } from '../rng.ts';
import type { WordEntry } from './types.ts';
import { ROW_SIZE } from './stables.ts';

/** N11: the long-run share of hungry first wishes. */
export const HUNGRY_SHARE = 1 / 3;
/** N20: the share of evenings whose manger moment is the hay rack, when a hay-rack pick exists. */
export const RACK_SHARE = 0.4;
/** Foods on the meadow tray and the manger tray. */
export const TRAY_SIZE = 3;

/** N25: what a baby unicorn eats. Words outside this list (tin, egg, burger, pepper, chip ...) never feed a baby. */
export const UNICORN_FOODS: readonly string[] = [
  'apple', 'carrot', 'peach', 'grape', 'plum', 'melon', 'cherry', 'strawberry', 'berry', 'corn', 'turnip', 'beetroot',
  'leek', 'pea', 'bean', 'fig', 'lemon', 'pumpkin', 'cake', 'cupcake', 'muffin', 'bun', 'pancake', 'cookie', 'toast',
  'pie', 'jelly', 'lolly', 'marshmallow', 'popcorn', 'treat',
];
/**
 * N25: pictures that look alike. A basket or tray holds at most one word of a group. The plan's six groups, plus
 * three from the contact sheet of the food pictures (2026-10-12): the grape and the pea are both small green balls,
 * the plum and the fig are both purple drops, the turnip and the beetroot are both round roots with leaves.
 */
export const LOOK_ALIKE: readonly (readonly string[])[] = [
  ['pea', 'bean', 'grape'],
  ['corn', 'popcorn'],
  ['cherry', 'strawberry', 'berry'],
  ['cake', 'cupcake', 'muffin', 'bun', 'pie'],
  ['pancake', 'cookie'],
  ['lemon', 'peach'],
  ['plum', 'fig'],
  ['turnip', 'beetroot'],
];

const FOODS = new Set(UNICORN_FOODS);
const GROUP = new Map<string, number>();
LOOK_ALIKE.forEach((g, i) => g.forEach((w) => GROUP.set(w, i)));

export function isUnicornFood(word: string): boolean {
  return FOODS.has(word);
}

/** The look-alike group of a food word, or the word itself when it has none. */
export function lookAlikeKey(word: string): string {
  const g = GROUP.get(word);
  return g === undefined ? `w:${word}` : `g:${g}`;
}

/**
 * A first wish is hungry one time in three, never twice in a row; a test flag forces it on or off.
 * Never twice in a row turns a plain 1 in 3 into 1 in 4, so after a plain wish the chance is
 * HUNGRY_SHARE / (1 - HUNGRY_SHARE) (one half), which makes the long-run share one in three.
 */
export function hungryDue(i: { rng: Rng; forced: boolean | null; lastWasHungry: boolean }): boolean {
  if (i.forced !== null) return i.forced;
  if (i.lastWasHungry) return false;
  return i.rng() < HUNGRY_SHARE / (1 - HUNGRY_SHARE);
}

/** Food words for a basket: on UNICORN_FOODS, pictured, with a clip, not a plural entry and not a station. */
export function foodPool(words: Iterable<WordEntry>): WordEntry[] {
  const out: WordEntry[] = [];
  for (const w of words) {
    if (!isUnicornFood(w.word) || !w.basket || w.one || w.station || !w.picture || !w.clip) continue;
    out.push(w);
  }
  return out;
}

/** Drops words so that no two of one look-alike group remain; the target word always stays. Keeps the pool's order. */
export function withoutLookAlikes(pool: WordEntry[], keep: string | null, rng: Rng): WordEntry[] {
  const chosen = new Map<string, string>();
  if (keep !== null) chosen.set(lookAlikeKey(keep), keep);
  for (const w of shuffle(pool, rng)) {
    const k = lookAlikeKey(w.word);
    if (!chosen.has(k)) chosen.set(k, w.word);
  }
  const ok = new Set(chosen.values());
  return pool.filter((w) => ok.has(w.word));
}

/** Tray foods: readable first (passed, placed or current step), one per look-alike group, shuffled. */
export function trayFoods(words: Iterable<WordEntry>, readable: (w: WordEntry) => boolean, rng: Rng, n = TRAY_SIZE): string[] {
  const pool = foodPool(words);
  const order = [...shuffle(pool.filter(readable), rng), ...shuffle(pool.filter((w) => !readable(w)), rng)];
  const groups = new Set<string>();
  const out: string[] = [];
  for (const w of order) {
    if (out.length >= n) break;
    const k = lookAlikeKey(w.word);
    if (groups.has(k)) continue;
    groups.add(k);
    out.push(w.word);
  }
  return shuffle(out, rng);
}

/** Free-stage wants (N20): each door's baby wants one of the tray foods. Babies in neighbouring stalls (side by side
 * or one above the other in the row's 5 by 2 ten-frame) want different foods when the tray has two or more. */
export function mangerWants(doors: number[], tray: string[], rng: Rng): Record<number, string> {
  const out: Record<number, string> = {};
  if (tray.length === 0) return out;
  const at = (d: number) => {
    const i = (d - 1) % ROW_SIZE;
    return { row: Math.floor((d - 1) / ROW_SIZE), col: i % 5, line: Math.floor(i / 5) };
  };
  // Two foods: a chessboard, so no neighbours match even across empty stalls.
  const flip = tray.length === 2 && rng() < 0.5 ? 1 : 0;
  for (const d of [...doors].sort((a, b) => a - b)) {
    const p = at(d);
    if (tray.length === 1) { out[d] = tray[0]; continue; }
    if (tray.length === 2) { out[d] = tray[(p.col + p.line + flip) % 2]; continue; }
    // Three or more: in door order the left and upper neighbours are already set, so at least one food is free.
    const taken = new Set([d - 1, d - 5].filter((n) => n >= 1 && n in out && at(n).row === p.row
      && (n === d - 1 ? at(n).line === p.line : true)).map((n) => out[n]));
    const opts = tray.filter((f) => !taken.has(f));
    out[d] = opts[Math.floor(rng() * opts.length)];
  }
  return out;
}

/** Tonight's checked manger moment (N20): the hay rack on RACK_SHARE of the evenings both can be served. */
export function mangerPlan(i: { rng: Rng; forced: 'wish' | 'rack' | null; wish: boolean; rack: boolean }): 'wish' | 'rack' | 'none' {
  if (i.forced === 'rack' && i.rack) return 'rack';
  if (i.forced === 'wish' && i.wish) return 'wish';
  if (i.wish && i.rack) return i.rng() < RACK_SHARE ? 'rack' : 'wish';
  if (i.wish) return 'wish';
  if (i.rack) return 'rack';
  return 'none';
}

/** The hay rack as an EggTask literal (mode 'cups'), from the pick's MathsTask; null unless missing with whole 6 to 15. */
export function rackTask(pick: Pick): EggTask | null {
  const k = pick.carrier;
  if (k.kind !== 'maths' || k.task.op !== 'missing') return null;
  const { whole, part } = k.task;
  if (whole < 6 || whole > 15 || part < 1 || part >= whole || whole - part > 9 || part > 9) return null;
  return {
    kind: 'small-nest', mode: 'cups', step: pick.step ?? '', itemId: pick.items[0] ?? '', scaffold: pick.scaffold,
    cups: whole, warm: part, shown: 0, bowls: null, moreLess: null, target: whole - part, stonesNeeded: 1,
  };
}

/** "The hay rack needs fifteen bundles. Nine bundles are in. Drag the hay that fills it up." */
export function rackGoalLines(t: EggTask): string[] {
  return [numId('rack', t.cups), numId('in', t.warm), 'g-hay-rack'];
}

export function rackMissLines(diff: number): string[] {
  return diff > 0 ? ['fb-too-many', numId('over', Math.min(9, diff))] : [numId('more', Math.min(9, -diff))];
}

export function rackSuccessLines(t: EggTask): string[] {
  return ['fb-rack-full', bondId(t.warm, t.target)];
}

/**
 * The hay rack's slots in frames of ten (one frame up to 10, two over 10, as nestsOf), per slot: 0 already in,
 * 1 filled by the dropped pile, -1 empty. `spill` is how many bundles of a too-big pile do not fit.
 */
export function rackSlots(t: EggTask, filled: number | null): { frames: (0 | 1 | -1)[][]; spill: number } {
  const sizes = t.cups <= 10 ? [t.cups] : [10, t.cups - 10];
  const add = filled ?? 0;
  let i = 0;
  const frames = sizes.map((n) => Array.from({ length: n }, (): 0 | 1 | -1 => {
    const k = i++;
    return k < t.warm ? 0 : k < t.warm + add ? 1 : -1;
  }));
  return { frames, spill: Math.max(0, t.warm + add - t.cups) };
}

/** Level 2: count the empty slots, one to the answer. */
export function rackHintLines(t: EggTask): string[] {
  const out = ['h-count-gaps'];
  for (let i = 1; i <= t.target; i++) out.push(numId('n', i));
  return out;
}
