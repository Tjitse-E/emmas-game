import { describe, it, expect } from 'vitest';
import { judgeGive, planBasket, planPluralBasket } from '../../src/core/phonics/basket.ts';
import { makeRng } from '../../src/core/rng.ts';
import { BY_WORD, POOL, get } from './words.ts';

const W = (x: string) => BY_WORD.get(x)!;

describe('planBasket', () => {
  it('fills 3, 4 or 6 different single things with the target among them', () => {
    for (const size of [3, 4, 6] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const b = planBasket({ target: W('pan'), size, pool: POOL, rng: makeRng(seed) })!;
        expect(b).toHaveLength(size);
        expect(b.map((i) => i.word)).toContain('pan');
        expect(new Set(b.map((i) => i.word)).size).toBe(size);
        expect(b.every((i) => !i.heap)).toBe(true);
      }
    }
  });
  it('puts the vowel partner in when it exists', () => {
    const b = planBasket({ target: W('pan'), size: 3, pool: POOL, rng: makeRng(1) })!;
    expect(b.map((i) => i.word)).toContain('pen');
  });
  it('never puts confusable pictures together', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const words = planBasket({ target: W('hat'), size: 6, pool: POOL, rng: makeRng(seed) })!.map((i) => i.word);
      expect(words.includes('hat') && words.includes('cap')).toBe(false);
    }
  });
  it('returns null when the basket cannot be filled', () => {
    expect(planBasket({ target: W('pan'), size: 3, pool: [W('pan'), W('pen')], rng: makeRng(1) })).toBeNull();
  });
  it('keeps a required partner in the basket for twin wishes', () => {
    const b = planBasket({ target: W('pin'), size: 3, pool: POOL, rng: makeRng(2), must: ['pan'] })!;
    expect(b.map((i) => i.word)).toEqual(expect.arrayContaining(['pin', 'pan']));
  });
});

describe('planPluralBasket', () => {
  it('level 1 holds one thing, a heap of it and one other thing', () => {
    const b = planPluralBasket({ target: W('hats'), scaffold: 1, pool: POOL, get, rng: makeRng(1) })!;
    expect(b).toHaveLength(3);
    expect(b.filter((i) => i.word === 'hat').map((i) => i.heap).sort()).toEqual([false, true]);
    expect(b.filter((i) => i.word !== 'hat')).toHaveLength(1);
    expect(b.find((i) => i.word !== 'hat')!.heap).toBe(false);
  });
  it('level 2 holds one and a heap of two words, level 3 of three words', () => {
    const two = planPluralBasket({ target: W('hat'), scaffold: 2, pool: POOL, get, rng: makeRng(2) })!;
    expect(two).toHaveLength(4);
    expect(new Set(two.map((i) => i.word)).size).toBe(2);
    const three = planPluralBasket({ target: W('foxes'), scaffold: 3, pool: POOL, get, rng: makeRng(3) })!;
    expect(three).toHaveLength(6);
    expect(new Set(three.map((i) => i.word)).size).toBe(3);
    expect(three.filter((i) => i.heap)).toHaveLength(3);
  });
});

describe('judgeGive', () => {
  const one = (word: string) => ({ key: word, word, picture: `${word}`, heap: false });
  const heap = (word: string) => ({ key: `${word}-heap`, word, picture: `${word}`, heap: true });
  it('wants the heap for a plural and the one for a singular', () => {
    expect(judgeGive(W('hats'), heap('hat'), get)).toEqual({ ok: true });
    expect(judgeGive(W('hats'), one('hat'), get)).toEqual({ ok: false, error: 'other', funny: 'one-for-many' });
    expect(judgeGive(W('hat'), one('hat'), get)).toEqual({ ok: true });
    expect(judgeGive(W('hat'), heap('hat'), get)).toEqual({ ok: false, error: 'other', funny: 'heap-for-one' });
  });
  it('tags the Dutch vowel pair, other vowel slips and other mistakes', () => {
    expect(judgeGive(W('pan'), one('pen'), get)).toEqual({ ok: false, error: 'dutch', funny: 'wrong-thing' });
    expect(judgeGive(W('pan'), one('pin'), get)).toEqual({ ok: false, error: 'vowel', funny: 'wrong-thing' });
    expect(judgeGive(W('pan'), one('map'), get)).toEqual({ ok: false, error: 'other', funny: 'wrong-thing' });
  });
});

describe('feeding baskets (docs/v3/next/plan.md F2)', async () => {
  const { content } = await import('../../src/core/content/static.ts');
  const { wordEntries } = await import('../../src/scenes/heartbeat/learn-bridge.ts');
  const { foodPool, isUnicornFood, withoutLookAlikes } = await import('../../src/core/heartbeat/feed.ts');
  const words = wordEntries(content);
  it('a food-only pool gives a basket of food only', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed);
      const pool = withoutLookAlikes(foodPool(words.values()), 'peach', rng);
      const b = planBasket({ target: words.get('peach')!, size: 6, pool, rng })!;
      expect(b).toHaveLength(6);
      expect(b.every((i) => isUnicornFood(i.word))).toBe(true);
      const p = planPluralBasket({ target: words.get('peaches')!, scaffold: 3, pool, get: (w) => words.get(w), rng })!;
      expect(p.every((i) => isUnicornFood(i.word))).toBe(true);
      expect(p.filter((i) => i.word === 'peach')).toHaveLength(2);
    }
  });
});
