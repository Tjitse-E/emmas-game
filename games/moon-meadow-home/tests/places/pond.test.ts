import { describe, expect, it } from 'vitest';
import { bathers, planBathWish, pondPool } from '../../src/core/places/pond.ts';
import { baby, rng, served, word } from './helpers.ts';

const p = (id: string, g: string[], tags = ['bath']) => word(id, g, { tags, plural: { word: `${id}s`, ending: 's', graphemes: [...g, 's'] } });
const words = [p('duck', ['d', 'u', 'ck']), p('boat', ['b', 'oa', 't']), p('cup', ['c', 'u', 'p']), p('shell', ['sh', 'e', 'll'], ['pond']), p('hat', ['h', 'a', 't'], ['found'])];

describe('bath wishes', () => {
  it('only uses bath things (learning tag bath, places tag pond)', () => {
    expect(pondPool(words).map((w) => w.id)).toEqual(['duck', 'boat', 'cup', 'shell']);
    expect(pondPool([word('soap', ['s', 'oa', 'p'], { tags: ['bath'] })])).toEqual([]);
  });

  it('plans one or many from the served R19 item', () => {
    const many = planBathWish(served('r', 'R19', 'duck', ['-s'], { kind: 'school' }), words, rng(1))!;
    expect(many.shown).toBe('ducks');
    expect(many.plural).toBe(true);
    expect(many.options.every((o) => ['duck', 'boat', 'cup', 'shell'].includes(o.word))).toBe(true);
    const one = planBathWish(served('r', 'R19', 'cup', ['none'], { kind: 'school', scaffold: 3 }), words, rng(2))!;
    expect(one.shown).toBe('cup');
    expect(one.options).toHaveLength(6);
  });

  it('uses the planner count for the heap', () => {
    const t = planBathWish(served('r', 'R19', 'boat', ['-s'], { count: 4 }), words, rng(3))!;
    expect(t.options.find((o) => o.id === 'boat:n')?.count).toBe(4);
  });

  it('returns null with no item, a word that is not a bath thing, or another step', () => {
    expect(planBathWish(null, words, rng(1))).toBeNull();
    expect(planBathWish(served('r', 'R19', 'hat', ['-s']), words, rng(1))).toBeNull();
    expect(planBathWish(served('r', 'R21', 'duck', ['ck']), words, rng(1))).toBeNull();
  });
});

describe('pond bank', () => {
  it('puts the babies she touched last first, then the newest, six at most', () => {
    const herd = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => baby(id, id.toUpperCase(), { order: i + 1 }));
    expect(bathers(herd, ['c', 'x', 'a']).map((b) => b.id)).toEqual(['c', 'a', 'h', 'g', 'f', 'e']);
    expect(bathers(herd.slice(0, 2), [])).toHaveLength(2);
  });
});
