// The Bath Pond (Task A11, spec 2.5): free splash play and one-or-many bath wishes at R19.
import type { BabyView, Rng, ServedItem, WordView } from './types.ts';
import { planOneOrMany, type OneOrManyTask } from './plurals.ts';

/** Bath things with a plural: learning's tag `bath` (R22), or places' own `pond`. */
export function pondPool(words: WordView[]): WordView[] {
  return words.filter((w) => (w.tags.includes('bath') || w.tags.includes('pond')) && w.plural);
}

export function planBathWish(item: ServedItem | null, words: WordView[], rng: Rng): OneOrManyTask | null {
  if (!item || item.step !== 'R19') return null;
  const pool = pondPool(words);
  const target = pool.find((w) => w.id === item.carrier);
  if (!target) return null;
  const plural = item.items.some((i) => i === '-s' || i === '-es');
  return planOneOrMany(target, plural, item.scaffold, pool, rng, item.count);
}

/** Up to six babies on the bank: the ones she touched last, then the newest. */
export function bathers(herd: readonly BabyView[], recent: readonly string[], max = 6): BabyView[] {
  const byId = new Map(herd.map((b) => [b.id, b]));
  const out: BabyView[] = [];
  for (const id of recent) { const b = byId.get(id); if (b && !out.includes(b)) out.push(b); }
  for (const b of [...herd].reverse()) { if (out.length >= max) break; if (!out.includes(b)) out.push(b); }
  return out.slice(0, max);
}
