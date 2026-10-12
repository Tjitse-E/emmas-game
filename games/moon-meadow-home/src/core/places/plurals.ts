// Plurals for the first playable (spec item 10): ending sounds, heap counts and one-or-many planning.
// Pure part of Task A8. Heaps are drawn by art's Heap and heapLayout (R12); feedback lines are the
// shared fb-* clips and word clips come from keys.ts (R6, A16 reconciliation).
import { wordId } from '../keys.ts';
import { shuffle } from '../rng.ts';
import type { Rng, WordView } from './types.ts';

/** The sound of a plural ending in British English: cats /s/, dogs /z/, horses and foxes /iz/. */
export function endingSound(stem: string, ending: 's' | 'es'): 's' | 'z' | 'iz' {
  if (ending === 'es') return 'iz';
  const w = stem.toLowerCase();
  if (/(se|ce|ge|ze|s|x|z|sh|ch)$/.test(w)) return 'iz';
  const core = /[^aeiou]e$/.test(w) ? w.slice(0, -1) : w;
  if (/(p|t|k|ck|f|ff|ph)$/.test(core)) return 's';
  return 'z';
}

export function pluralWord(w: WordView): string {
  return w.plural?.word ?? `${w.word}s`;
}

/** Three to five things in a heap, the same for the same seed. */
export function heapCount(seed: number): 3 | 4 | 5 {
  return (3 + (Math.abs(Math.floor(seed)) % 3)) as 3 | 4 | 5;
}

export type OneOrManyOption = { id: string; word: string; picture: string; many: boolean; count: number };
export type OneOrManyTask = {
  target: WordView; plural: boolean; shown: string; options: OneOrManyOption[]; answer: string;
  dots: 500 | 300 | null;
  /** Place short item names: '-s', '-es' or 'none'. The adapter (src/places/serve.ts) maps them to 'r:end:*'. */
  items: string[];
  silentEnding: boolean;
};

const one = (w: WordView): OneOrManyOption => ({ id: `${w.id}:1`, word: w.word, picture: w.picture, many: false, count: 1 });
const many = (w: WordView, rng: Rng, count?: number): OneOrManyOption => ({
  id: `${w.id}:n`, word: w.word, picture: w.picture, many: true, count: count ?? heapCount(Math.floor(rng() * 1000)),
});

/**
 * One or many: the target as one thing and as a heap, plus other words. Scaffold 1 shows 3 things
 * (dots every 500 ms), 2 shows 4 (300 ms), 3 shows 6 with a silent ending. Null when the target has
 * no plural or the pool cannot give three plausible options. `manyCount` is the planner's count for
 * the target heap (Carrier `plural.count`); without it the heap gets three to five.
 */
export function planOneOrMany(
  target: WordView, plural: boolean, scaffold: 1 | 2 | 3, pool: WordView[], rng: Rng, manyCount?: number,
): OneOrManyTask | null {
  const pl = target.plural;
  if (!pl) return null;
  const seen = new Set<string>([target.word]);
  const candidates = pool.filter((w) => {
    if (w.id === target.id || w.picture === target.picture || !w.plural || seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });
  const others = shuffle(candidates, rng);
  const need = scaffold === 3 ? 2 : 1;
  if (others.length < need) return null;
  const count = manyCount !== undefined && manyCount >= 2 ? Math.floor(manyCount) : undefined;
  const options: OneOrManyOption[] = [one(target), many(target, rng, count)];
  if (scaffold === 1) options.push(rng() < 0.5 ? one(others[0]) : many(others[0], rng));
  else for (const w of others.slice(0, need)) options.push(one(w), many(w, rng));
  return {
    target, plural,
    shown: plural ? pl.word : target.word,
    options: shuffle(options, rng),
    answer: plural ? `${target.id}:n` : `${target.id}:1`,
    dots: scaffold === 1 ? 500 : scaffold === 2 ? 300 : null,
    items: plural ? [`-${pl.ending}`] : ['none'],
    silentEnding: scaffold === 3,
  };
}

export type OneOrManyMistake = 'one-for-many' | 'many-for-one' | 'other';

export function oneOrManyMistake(task: OneOrManyTask, given: OneOrManyOption): OneOrManyMistake | null {
  if (given.id === task.answer) return null;
  if (given.word !== task.target.word) return 'other';
  return task.plural ? 'one-for-many' : 'many-for-one';
}

/** After the act Elizabeth reads the word, then "More than one." or "Just one." */
export function afterLines(task: OneOrManyTask): string[] {
  return [wordId(task.shown), task.plural ? 'fb-more-than-one' : 'fb-just-one'];
}
