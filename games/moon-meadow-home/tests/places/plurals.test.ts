import { describe, expect, it } from 'vitest';
import { afterLines, endingSound, heapCount, oneOrManyMistake, planOneOrMany, pluralWord } from '../../src/core/places/plurals.ts';
import { rng, word } from './helpers.ts';

const p = (id: string, graphemes: string[], plural: string, ending: 's' | 'es') => word(id, graphemes, { plural: { word: plural, ending, graphemes: [...graphemes, ending] } });
const hat = p('hat', ['h', 'a', 't'], 'hats', 's');
const duck = p('duck', ['d', 'u', 'ck'], 'ducks', 's');
const boat = p('boat', ['b', 'oa', 't'], 'boats', 's');
const cup = p('cup', ['c', 'u', 'p'], 'cups', 's');
const shell = p('shell', ['sh', 'e', 'll'], 'shells', 's');
const fox = p('fox', ['f', 'o', 'x'], 'foxes', 'es');

describe('ending sounds', () => {
  it.each([
    ['hat', 's', 's'], ['cup', 's', 's'], ['cake', 's', 's'], ['kite', 's', 's'], ['bike', 's', 's'], ['plank', 's', 's'], ['brick', 's', 's'], ['carrot', 's', 's'],
    ['giraffe', 's', 's'], ['sock', 's', 's'],
    ['key', 's', 'z'], ['bell', 's', 'z'], ['bead', 's', 'z'], ['apple', 's', 'z'], ['castle', 's', 'z'], ['ring', 's', 'z'], ['chair', 's', 'z'], ['bow', 's', 'z'],
    ['glove', 's', 'z'], ['tree', 's', 'z'],
    ['horse', 's', 'iz'], ['house', 's', 'iz'], ['fox', 'es', 'iz'], ['dress', 'es', 'iz'], ['brush', 'es', 'iz'], ['peach', 'es', 'iz'],
  ] as const)('%s + %s sounds /%s/', (stem, ending, sound) => {
    expect(endingSound(stem, ending)).toBe(sound);
  });
});

describe('heap counts', () => {
  it('has three to five things, the same for the same seed', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect([3, 4, 5]).toContain(heapCount(seed));
      expect(heapCount(seed)).toBe(heapCount(seed));
    }
    expect([3, 4, 5]).toContain(heapCount(-7.5));
  });
});

describe('one or many', () => {
  const pool = [hat, duck, boat, cup, shell];

  it.each([[1, 3, 500], [2, 4, 300], [3, 6, null]] as const)('scaffold %i shows %i things with dots %s', (level, n, dots) => {
    const t = planOneOrMany(duck, true, level, pool, rng(level))!;
    expect(t.options).toHaveLength(n);
    expect(t.dots).toBe(dots);
    expect(t.options.filter((o) => o.id === t.answer)).toHaveLength(1);
    expect(t.options.some((o) => o.word === 'duck' && o.many)).toBe(true);
    expect(t.options.some((o) => o.word === 'duck' && !o.many)).toBe(true);
    expect(new Set(t.options.map((o) => o.id)).size).toBe(n);
  });

  it('gives every heap three to five things and every single thing one', () => {
    for (let seed = 1; seed < 20; seed++) {
      const t = planOneOrMany(duck, true, 3, pool, rng(seed))!;
      for (const o of t.options) expect(o.many ? [3, 4, 5] : [1]).toContain(o.count);
    }
  });

  it('uses the count the planner chose for the right heap', () => {
    const t = planOneOrMany(duck, true, 2, pool, rng(1), 4)!;
    expect(t.options.find((o) => o.id === t.answer)?.count).toBe(4);
  });

  it('shows the plural word for many and the bare word for one', () => {
    const many = planOneOrMany(duck, true, 1, pool, rng(1))!;
    const one = planOneOrMany(duck, false, 1, pool, rng(1))!;
    expect(many.shown).toBe('ducks');
    expect(many.items).toEqual(['-s']);
    expect(one.shown).toBe('duck');
    expect(one.items).toEqual(['none']);
    expect(planOneOrMany(fox, true, 1, [...pool, fox], rng(1))!.items).toEqual(['-es']);
    expect(many.options.find((o) => o.id === many.answer)?.many).toBe(true);
    expect(one.options.find((o) => o.id === one.answer)?.many).toBe(false);
  });

  it('keeps the ending silent at scaffold 3', () => {
    expect(planOneOrMany(duck, true, 3, pool, rng(1))!.silentEnding).toBe(true);
    expect(planOneOrMany(duck, true, 2, pool, rng(1))!.silentEnding).toBe(false);
  });

  it('is the same for the same seed', () => {
    expect(planOneOrMany(duck, true, 3, pool, rng(9))).toEqual(planOneOrMany(duck, true, 3, pool, rng(9)));
  });

  it('returns null when it cannot offer three things', () => {
    expect(planOneOrMany(duck, true, 1, [duck], rng(1))).toBeNull();
    expect(planOneOrMany(duck, true, 3, [duck, hat], rng(1))).toBeNull();
    expect(planOneOrMany(word('sun', ['s', 'u', 'n']), true, 1, pool, rng(1))).toBeNull();
  });

  it('never offers another word with the same picture or a word without a plural', () => {
    const twin = p('duck2', ['d', 'u', 'ck'], 'ducks', 's');
    const sun = word('sun', ['s', 'u', 'n']);
    for (let seed = 1; seed < 20; seed++) {
      const t = planOneOrMany(duck, true, 3, [duck, { ...twin, picture: 'duck' }, sun, hat, cup], rng(seed))!;
      expect(t.options.every((o) => o.word !== 'sun' && o.word !== 'duck2')).toBe(true);
    }
  });

  it('names the mistake', () => {
    const t = planOneOrMany(duck, true, 2, pool, rng(4))!;
    const one = t.options.find((o) => o.word === 'duck' && !o.many)!;
    const other = t.options.find((o) => o.word !== 'duck')!;
    expect(oneOrManyMistake(t, one)).toBe('one-for-many');
    expect(oneOrManyMistake(t, other)).toBe('other');
    expect(oneOrManyMistake(t, t.options.find((o) => o.id === t.answer)!)).toBeNull();
    const single = planOneOrMany(duck, false, 2, pool, rng(4))!;
    expect(oneOrManyMistake(single, single.options.find((o) => o.word === 'duck' && o.many)!)).toBe('many-for-one');
  });

  it('reads the word after the act with more than one or just one (shared feedback lines)', () => {
    expect(afterLines(planOneOrMany(duck, true, 1, pool, rng(1))!)).toEqual(['word-ducks', 'fb-more-than-one']);
    expect(afterLines(planOneOrMany(duck, false, 1, pool, rng(1))!)).toEqual(['word-duck', 'fb-just-one']);
  });

  it('knows the plural of a word', () => {
    expect(pluralWord(duck)).toBe('ducks');
    expect(pluralWord(fox)).toBe('foxes');
    expect(pluralWord(word('sun', ['s', 'u', 'n']))).toBe('suns');
  });
});
