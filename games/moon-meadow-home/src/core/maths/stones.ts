// Answer stones for an egg: faces by maths scaffold, decoys near the answer, pairs to ten for two-stone eggs.
import { type Rng, shuffle } from '../rng.ts';
import { type EggTask, maxStone, parseMathsItem } from './eggs.ts';

export type StoneFace = 'dots' | 'dots-numeral' | 'numeral';
export type StoneSpec = { id: string; value: number; face: StoneFace; layout: 'dice' | 'scatter'; tint: number };

export function stoneFace(task: EggTask): StoneFace {
  if (task.mode === 'stars-flash') return 'dots';
  return task.scaffold === 1 ? 'dots' : task.scaffold === 2 ? 'dots-numeral' : 'numeral';
}

export function planStones(task: EggTask, rng: Rng): StoneSpec[] {
  const face = stoneFace(task);
  // Stones show dice dots or a loose scatter, never a ten-frame layout (spec 2.6).
  const make = (value: number, i: number): StoneSpec =>
    ({ id: `stone-${i + 1}`, value, face, layout: value <= 6 ? 'dice' : 'scatter', tint: i % 7 });

  if (task.stonesNeeded === 2) {
    const it = parseMathsItem(task.itemId);
    if (it.op !== 'pair') throw new Error(`Two-stone item must be a pair: ${task.itemId}`);
    const pairs: [number, number][] = [[it.a, it.b]];
    for (const p of shuffle<[number, number]>([[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]], rng)) {
      if (pairs.length >= 3) break;
      if (!pairs.some((q) => q.includes(p[0]) || q.includes(p[1]))) pairs.push(p);
    }
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
