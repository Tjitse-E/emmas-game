import { type Rng, shuffle } from '../rng.ts';
// Wish baskets: plain baskets, one-or-many baskets (R19) and twin baskets. Picture ids are the bare word (R13).
import type { ErrorTag, Scaffold, WordEntry } from '../heartbeat/types.ts';

export type BasketItem = { key: string; word: string; picture: string; heap: boolean };
export type Funny = 'one-for-many' | 'heap-for-one' | 'wrong-thing';
export type GiveVerdict = { ok: true } | { ok: false; error: ErrorTag; funny: Funny };

const DUTCH_TAGS = new Set(['aeu', 'final', 'vw', 'jy', 'th', 'ch', 'r20']);
const SHORT_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

const one = (w: WordEntry): BasketItem => ({ key: w.word, word: w.word, picture: w.picture, heap: false });
const heap = (w: WordEntry): BasketItem => ({ key: `${w.word}-heap`, word: w.word, picture: w.picture, heap: true });

function confusable(a: WordEntry, b: WordEntry): boolean {
  return (a.confuse ?? []).includes(b.word) || (b.confuse ?? []).includes(a.word);
}

export function planBasket(input: { target: WordEntry; size: 3 | 4 | 6; pool: WordEntry[]; rng: Rng; must?: string[] }): BasketItem[] | null {
  const { target, size, pool, rng } = input;
  const chosen: WordEntry[] = [target];
  const byWord = new Map(pool.map((w) => [w.word, w]));
  const okWith = (w: WordEntry) => w.basket && !w.one && !chosen.some((x) => x.word === w.word) && chosen.every((x) => !confusable(x, w));
  for (const m of input.must ?? []) {
    const w = byWord.get(m);
    if (!w || !okWith(w)) return null;
    chosen.push(w);
  }
  const addOne = (cands: WordEntry[]) => {
    for (const w of shuffle(cands, rng)) {
      if (chosen.length >= size) return;
      if (okWith(w)) { chosen.push(w); return; }
    }
  };
  // v2 pantry rules: the vowel partner, then a same-onset item, then a same-ending item, then any.
  if (target.pair) { const p = byWord.get(target.pair); if (p && okWith(p) && chosen.length < size) chosen.push(p); }
  addOne(pool.filter((w) => w.gr[0] === target.gr[0]));
  addOne(pool.filter((w) => w.gr[w.gr.length - 1] === target.gr[target.gr.length - 1]));
  for (const w of shuffle(pool, rng)) {
    if (chosen.length >= size) break;
    if (okWith(w)) chosen.push(w);
  }
  if (chosen.length < size) return null;
  return shuffle(chosen.map(one), rng);
}

export function planPluralBasket(input: { target: WordEntry; scaffold: Scaffold; pool: WordEntry[]; get: (w: string) => WordEntry | undefined; rng: Rng }): BasketItem[] | null {
  const stem = input.target.one ? input.get(input.target.one) : input.target;
  if (!stem) return null;
  const items: BasketItem[] = [one(stem), heap(stem)];
  const chosen: WordEntry[] = [stem];
  const need = input.scaffold === 3 ? 2 : 1;
  for (const w of shuffle(input.pool, input.rng)) {
    if (chosen.length - 1 >= need) break;
    if (!w.basket || w.one || chosen.some((c) => c.word === w.word || confusable(c, w))) continue;
    chosen.push(w);
    if (input.scaffold === 1) items.push(one(w));
    else items.push(one(w), heap(w));
  }
  if (chosen.length - 1 < need) return null;
  return shuffle(items, input.rng);
}

function vowelOnly(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!SHORT_VOWELS.has(a[i]) || !SHORT_VOWELS.has(b[i])) return false;
    diff++;
  }
  return diff === 1;
}

export function judgeGive(target: WordEntry, item: BasketItem, get: (w: string) => WordEntry | undefined): GiveVerdict {
  const stemWord = target.one ?? target.word;
  const wantsHeap = target.one !== undefined;
  if (item.word === stemWord) {
    if (item.heap === wantsHeap) return { ok: true };
    return { ok: false, error: 'other', funny: wantsHeap ? 'one-for-many' : 'heap-for-one' };
  }
  const stem = get(stemWord) ?? target;
  const picked = get(item.word);
  let error: ErrorTag = 'other';
  if (stem.pair === item.word) error = stem.pairTag && DUTCH_TAGS.has(stem.pairTag) ? 'dutch' : 'vowel';
  else if (picked && vowelOnly(stem.gr, picked.gr)) error = 'vowel';
  return { ok: false, error, funny: 'wrong-thing' };
}
