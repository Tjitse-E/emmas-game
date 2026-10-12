// Answer stones for an egg: faces by maths scaffold, decoys near the answer, three pairs of the total for two-stone eggs.
import { type Rng, pick, shuffle } from '../rng.ts';
import { type EggTask, maxStone, parseMathsItem } from './eggs.ts';

export type StoneFace = 'dots' | 'dots-numeral' | 'numeral';
export type StoneSpec = { id: string; value: number; face: StoneFace; layout: 'dice' | 'scatter'; tint: number };

export function stoneFace(task: EggTask): StoneFace {
  if (task.mode === 'stars-flash') return 'dots';
  return task.scaffold === 1 ? 'dots' : task.scaffold === 2 ? 'dots-numeral' : 'numeral';
}

const TRAY_PAIRS = 3;

/** Every pair of stones (1 to 9) that makes the total, smaller stone first. */
export function pairsOf(total: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = Math.max(1, total - 9); x <= total - x; x++) out.push([x, total - x]);
  return out;
}

export function planStones(task: EggTask, rng: Rng): StoneSpec[] {
  const face = stoneFace(task);
  // Stones show dice dots or a loose scatter, never a ten-frame layout (spec 2.6).
  const make = (value: number, i: number): StoneSpec =>
    ({ id: `stone-${i + 1}`, value, face, layout: value <= 6 ? 'dice' : 'scatter', tint: i % 7 });

  if (task.stonesNeeded === 2) {
    const it = parseMathsItem(task.itemId);
    if (it.op !== 'pair') throw new Error(`Two-stone item must be a pair: ${task.itemId}`);
    // N29: three pairs of the total and no decoys, so every stone has a partner and any first stone can be finished.
    const own: [number, number] = [it.a, it.b];
    const key = (p: readonly number[]) => Math.min(p[0], p[1]);
    const pairs: [number, number][] = [own];
    for (const p of shuffle(pairsOf(task.target), rng)) {
      if (pairs.length >= TRAY_PAIRS) break;
      if (!pairs.some((q) => key(q) === key(p))) pairs.push(p);
    }
    while (pairs.length < TRAY_PAIRS) pairs.push(pick(pairs, rng));
    return shuffle(pairs.flat(), rng).map(make);
  }

  const max = maxStone(task);
  const size = task.scaffold === 1 ? 3 : task.scaffold === 2 ? 4 : 5;
  const opts: number[] = [task.target];
  const add = (v: number) => {
    if (opts.length < size && v >= 1 && v <= max && !opts.includes(v)) opts.push(v);
  };
  add(task.target + 1);
  add(task.target - 1);
  if (task.warm) add(task.warm);
  for (const d of [2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8]) add(task.target + d);
  return shuffle(opts, rng).map(make);
}
