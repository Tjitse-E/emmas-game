// The save (src/game/save.ts, 2.3.0: mmw.save2 next to 2.2's mmw.save) and the address options (src/game/options.ts).
import { describe, expect, it } from 'vitest';
import type { GiftItem } from '../src/contracts';
import { DEFAULT_LOOK, GIFT_SETS, START_OWNED, fromLegacy, withItem } from '../src/wardrobe';
import { type KeyStore, SAVE_KEY, SAVE_KEY_V1, createSave, defaultSave, memoryStore, ownedRibbons, parseSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';

/** 2.2.0's look ids, as a v1 save (mmw.save) holds them. */
const V22 = {
  hair: ['sunny', 'strawberry', 'chestnut', 'midnight', 'candy', 'rainbow'],
  eyes: ['blue', 'green', 'brown', 'hazel', 'grey', 'violet'],
  gown: ['rose', 'rainbow', 'lilac', 'moon', 'fairy', 'tutu'],
  style: ['ponytails', 'high', 'plaits', 'bun'],
  thing: ['bows', 'unicorn', 'flowers', 'stars', 'butterflies', 'hearts'],
  ribbon: ['pink', 'lilac', 'sky', 'mint', 'gold', 'coral'],
} as const;
const V22_DEFAULT = { hair: 'sunny', eyes: 'blue', gown: 'rose', style: 'ponytails', thing: 'bows', ribbon: 'pink' };
const GIFTS: GiftItem[] = Object.values(GIFT_SETS).flatMap((s) => [...s.items]);

/** A store that records every write and removal by key. */
function recording(): KeyStore & { touched: string[] } {
  const mem = memoryStore();
  const touched: string[] = [];
  return {
    touched,
    getItem: (k) => mem.getItem(k),
    setItem: (k, v) => {
      touched.push(k);
      mem.setItem(k, v);
    },
    removeItem: (k) => {
      touched.push(k);
      mem.removeItem(k);
    },
  };
}

describe('parseSave', () => {
  it('gives the defaults and a first visit for junk and an empty store', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', '42', '"x"', '{', 7, [], 'null']) {
      const s = parseSave(raw);
      expect(s).toEqual(defaultSave());
      expect(s.seen.wardrobe).toBe(false);
      expect(s.reading.level).toBe(2);
      expect(s.look).toEqual(DEFAULT_LOOK);
    }
  });

  it('reads a whole save back', () => {
    const save = {
      v: 2,
      look: { ...DEFAULT_LOOK, hair: 'green', gownColour: 'green', crown: 'star', earrings: 'drops' },
      owned: { ...START_OWNED, crown: ['lumi', 'star'], earrings: ['drops'] },
      ribbons: ['lilac', 'sky'],
      plays: 4,
      seen: { wardrobe: true, crown: true, beads: true },
      reading: { level: 3, recent: ['first', 'miss'] },
      phrases: { level: 1, recent: ['miss'] },
      patterns: { level: 2, recent: ['first'] },
      last: { words: ['crown', 'seal', 'plum'], totals: [13, 14] },
      afternoon: { maths: 'beads', done: ['picnic', 'beads', 'corner'] },
    };
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });

  it('starts from a 2.2 save: the look in 2.3 terms, the crown given, the start items owned', () => {
    const old = {
      v: 1,
      look: { hair: 'candy', eyes: 'violet', gown: 'fairy', style: 'plaits', thing: 'stars', ribbon: 'lilac' },
      ribbons: ['lilac', 'sky'],
      plays: 4,
      seen: { wardrobe: true },
      reading: { level: 3, recent: ['first', 'miss'] },
      last: { words: ['crown', 'seal', 'plum'], totals: [13, 14] },
    };
    const s = parseSave(JSON.stringify(old));
    expect(s.v).toBe(2);
    expect(s.look).toEqual(fromLegacy(old.look));
    expect(s.look).toMatchObject({ hair: 'pink', gown: 'party', extra: 'wings', thingColour: 'lilac' });
    expect(s.owned).toEqual(START_OWNED);
    expect(s.seen).toEqual({ wardrobe: true, crown: true, beads: false });
    expect(s.ribbons).toEqual(['lilac', 'sky']);
    expect(s.reading).toEqual(old.reading);
    // The phrase level starts at her word level, so the new form is neither too easy nor too hard on its first play.
    expect(s.phrases).toEqual({ level: 3, recent: [] });
    expect(s.last).toEqual(old.last);
  });

  it('gives the crown to a 2.2 save only after a play', () => {
    expect(parseSave({ v: 1, plays: 0 }).seen.crown).toBe(false);
    expect(parseSave({ v: 1 }).seen.crown).toBe(false);
    expect(parseSave({ v: 1, plays: 1 }).seen.crown).toBe(true);
  });

  it('reads data from mmw.save2 without a v as 2.3, and data that says v 1 as 2.2', () => {
    const raw = { look: { ...DEFAULT_LOOK, crown: 'tiara', gownColour: 'green', shoes: 'boots', earrings: 'studs' }, owned: { crown: ['lumi', 'tiara'], shoes: ['slippers', 'boots'], earrings: ['studs'] }, plays: 2 };
    const s = parseSave(raw, true);
    expect(s.look).toMatchObject({ crown: 'tiara', gownColour: 'green', shoes: 'boots', earrings: 'studs' });
    expect(s.owned.crown).toEqual(['lumi', 'tiara']);
    expect(s.seen.crown).toBe(false);
    // Without the flag (2.2's key), the same data is 2.2's.
    expect(parseSave(raw).owned).toEqual(START_OWNED);
    const old = { v: 1, look: { gown: 'tutu' }, plays: 3 };
    expect(parseSave(old, true)).toEqual(parseSave(old));
  });

  it('keeps every field it understands from a newer shape', () => {
    const s = parseSave(JSON.stringify({ v: 3, look: { hair: 'midnight', cape: 'red' }, plays: 2, pets: ['cat'], seen: { wardrobe: true, trunk: true } }));
    expect(s.v).toBe(2);
    expect(s.look).toEqual({ ...DEFAULT_LOOK, hair: 'midnight' });
    expect(s.plays).toBe(2);
    expect(s.seen).toEqual({ wardrobe: true, crown: false, beads: false });
  });

  it('drops unknown ids and broken fields one by one', () => {
    const s = parseSave({
      v: 2,
      look: { hair: 'black', eyes: 'green', gown: 7, style: null, thing: 'crown', crown: 'star', thingColour: 'black' },
      ribbons: ['pink', 'lilac', 'lilac', 'black', 3, 'coral'],
      plays: -3,
      seen: 'yes',
      reading: { level: 9, recent: ['first', 'oops', 'helped', 'miss', 'first'] },
      last: { words: ['seal', 4, '', 'a-very-long-word-here'], totals: [13, 'x', 2.5, -1, 15] },
    });
    expect(s.look).toEqual({ ...DEFAULT_LOOK, eyes: 'green' });
    expect(s.ribbons).toEqual(['lilac', 'coral']);
    expect(s.plays).toBe(0);
    expect(s.seen.wardrobe).toBe(false);
    expect(s.reading).toEqual({ level: 2, recent: ['helped', 'miss', 'first'] });
    expect(s.last).toEqual({ words: ['seal'], totals: [13, 15] });
  });

  it('always owns pink', () => {
    expect(ownedRibbons(defaultSave())).toEqual(['pink']);
    expect(ownedRibbons(parseSave({ ribbons: ['sky', 'lilac'] }))).toEqual(['pink', 'sky', 'lilac']);
  });
});

describe('createSave', () => {
  it('writes to the store and reads it back', () => {
    const mem = memoryStore();
    const a = createSave(() => mem);
    expect(a.data.plays).toBe(0);
    a.write((s) => {
      s.plays += 1;
      s.look.gown = 'tutu';
    });
    expect(a.data.plays).toBe(1);
    expect(JSON.parse(mem.getItem(SAVE_KEY)!).look.gown).toBe('tutu');
    const b = createSave(() => mem);
    expect(b.data.plays).toBe(1);
    expect(b.load().look.gown).toBe('tutu');
    b.clear();
    expect(JSON.parse(mem.getItem(SAVE_KEY)!)).toEqual(defaultSave());
    expect(b.data).toEqual(defaultSave());
  });

  it("reads 2.2's save once and never writes it", () => {
    const mem = memoryStore();
    const old = JSON.stringify({ v: 1, look: { gown: 'tutu' }, plays: 3, seen: { wardrobe: true } });
    mem.setItem(SAVE_KEY_V1, old);
    const s = createSave(() => mem);
    expect(s.data.plays).toBe(3);
    expect(s.data.look.gown).toBe('tutu');
    s.write((x) => void (x.plays += 1));
    expect(mem.getItem(SAVE_KEY_V1)).toBe(old);
    expect(JSON.parse(mem.getItem(SAVE_KEY)!).plays).toBe(4);
    s.clear();
    expect(createSave(() => mem).data.plays).toBe(0);
    expect(mem.getItem(SAVE_KEY_V1)).toBe(old);
  });

  it('keeps a mmw.save2 entry without a v as it is, also through a write', () => {
    const mem = memoryStore();
    mem.setItem(SAVE_KEY_V1, JSON.stringify({ v: 1, look: { gown: 'tutu' }, plays: 7 }));
    mem.setItem(SAVE_KEY, JSON.stringify({ look: { ...DEFAULT_LOOK, crown: 'tiara', crownColour: 'red' }, owned: { crown: ['lumi', 'tiara'] }, plays: 2 }));
    const s = createSave(() => mem);
    expect(s.data.plays).toBe(2);
    expect(s.data.look).toMatchObject({ crown: 'tiara', crownColour: 'red' });
    expect(s.data.owned.crown).toEqual(['lumi', 'tiara']);
    s.write((x) => void (x.plays += 1));
    const back = createSave(() => mem).data;
    expect(back.plays).toBe(3);
    expect(back.look.crown).toBe('tiara');
    expect(back.owned.crown).toEqual(['lumi', 'tiara']);
  });

  it('plays on with the defaults when the storage throws', () => {
    const throwing: KeyStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    for (const storage of [() => throwing, () => null, () => { throw new Error('no access'); }]) {
      const s = createSave(storage);
      expect(s.data).toEqual(defaultSave());
      s.write((x) => void (x.seen.wardrobe = true));
      // The change stays for this play.
      expect(s.data.seen.wardrobe).toBe(true);
      expect(() => s.clear()).not.toThrow();
    }
  });

  it('never touches the storage with fresh', () => {
    const mem = memoryStore();
    mem.setItem(SAVE_KEY, JSON.stringify({ plays: 9, seen: { wardrobe: true } }));
    const s = createSave(() => mem, true);
    expect(s.memoryOnly).toBe(true);
    expect(s.data.plays).toBe(0);
    s.write((x) => void (x.plays = 1));
    expect(s.load().plays).toBe(1);
    expect(JSON.parse(mem.getItem(SAVE_KEY)!).plays).toBe(9);
  });

  it('normalises what the game writes', () => {
    const s = createSave(() => memoryStore());
    s.write((x) => {
      (x.look as unknown as Record<string, string>).hair = 'black';
      x.look.crown = 'star';
      x.ribbons.push('lilac', 'lilac');
    });
    expect(s.data.look.hair).toBe('sunny');
    // Not owned: back to Lumi's crown.
    expect(s.data.look.crown).toBe('lumi');
    expect(s.data.ribbons).toEqual(['lilac']);
  });
});

describe('the phrase level and the bead tree', () => {
  it('starts the phrase level at her word level, and keeps its own once it has one', () => {
    expect(defaultSave().phrases).toEqual({ level: defaultSave().reading.level, recent: [] });
    for (const level of [1, 2, 3] as const) {
      expect(parseSave({ v: 1, reading: { level, recent: [] } }).phrases).toEqual({ level, recent: [] });
      expect(parseSave({ v: 2, reading: { level, recent: ['first'] } }).phrases).toEqual({ level, recent: [] });
      expect(parseSave({ v: 2, reading: { level }, phrases: { level: 9 } }).phrases.level).toBe(level);
    }
    const own = parseSave({ v: 2, reading: { level: 3, recent: [] }, phrases: { level: 1, recent: ['miss', 'miss'] } });
    expect(own.phrases).toEqual({ level: 1, recent: ['miss', 'miss'] });
    expect(own.reading.level).toBe(3);
  });

  it('shows the bead tree demo only before her first visit', () => {
    expect(defaultSave().seen.beads).toBe(false);
    expect(parseSave({ v: 1, plays: 9, seen: { wardrobe: true } }).seen.beads).toBe(false);
    expect(parseSave({ v: 2, seen: { beads: true } }).seen.beads).toBe(true);
    expect(parseSave({ v: 2, seen: { beads: 'yes' } }).seen.beads).toBe(false);
  });

  it('gives a 2.2 save and a first play the bead tree as their maths quest', () => {
    expect(defaultSave().afternoon).toEqual({ maths: null, done: [] });
    expect(parseSave({ v: 1, plays: 5 }).afternoon).toEqual({ maths: null, done: [] });
  });
});

describe('her collection across 2.2 and 2.3', () => {
  it('brings every 2.2 option over and keeps it through the 2.3 save', () => {
    for (const row of Object.keys(V22) as (keyof typeof V22)[]) {
      for (const id of V22[row]) {
        const store = recording();
        const old = JSON.stringify({ v: 1, look: { ...V22_DEFAULT, [row]: id }, ribbons: ['lilac'], plays: 2, seen: { wardrobe: true } });
        store.setItem(SAVE_KEY_V1, old);
        store.touched.length = 0;
        const first = createSave(() => store);
        const look = fromLegacy({ ...V22_DEFAULT, [row]: id });
        expect(first.data.look, `${row} ${id}`).toEqual(look);
        // The Play tap writes the save; the next load reads it from mmw.save2.
        first.write((s) => void (s.plays += 1));
        const next = createSave(() => store);
        expect(next.data.look, `${row} ${id}`).toEqual(look);
        expect(next.data.plays).toBe(3);
        expect(next.data.ribbons).toEqual(['lilac']);
        expect(next.data.seen).toEqual({ wardrobe: true, crown: true, beads: false });
        expect(store.getItem(SAVE_KEY_V1)).toBe(old);
        expect(store.touched).not.toContain(SAVE_KEY_V1);
      }
    }
  });

  it('reads mmw.save2 when both keys are there', () => {
    const store = memoryStore();
    const old = JSON.stringify({ v: 1, look: { ...V22_DEFAULT, gown: 'tutu', hair: 'candy' }, plays: 9 });
    store.setItem(SAVE_KEY_V1, old);
    const owned = withItem(START_OWNED, { field: 'crown', id: 'tiara' });
    const look = { ...DEFAULT_LOOK, crown: 'tiara', hair: 'green', gownColour: 'green' };
    store.setItem(SAVE_KEY, JSON.stringify({ v: 2, look, owned, plays: 4 }));
    const s = createSave(() => store);
    expect(s.data.look).toEqual(look);
    expect(s.data.owned).toEqual(owned);
    expect(s.data.plays).toBe(4);
    expect(store.getItem(SAVE_KEY_V1)).toBe(old);
  });

  it('falls back to 2.2\'s save when mmw.save2 is broken, never to nothing', () => {
    for (const broken of ['', 'not json', '{', '[]', '7', 'null', '"x"']) {
      const store = memoryStore();
      store.setItem(SAVE_KEY_V1, JSON.stringify({ v: 1, look: { ...V22_DEFAULT, gown: 'fairy' }, plays: 6 }));
      store.setItem(SAVE_KEY, broken);
      const s = createSave(() => store);
      expect(s.data.look, broken).toMatchObject({ gown: 'party', extra: 'wings', gownColour: 'green' });
      expect(s.data.plays).toBe(6);
    }
  });

  it('never writes or removes the 2.2 key, whatever the game does', () => {
    const starts: [string, string | null][] = [
      [SAVE_KEY_V1, JSON.stringify({ v: 1, look: V22_DEFAULT, plays: 1 })],
      [SAVE_KEY, JSON.stringify({ v: 2, plays: 3 })],
      ['', null],
    ];
    for (const [key, value] of starts) {
      const store = recording();
      if (value !== null) store.setItem(key, value);
      store.touched.length = 0;
      const s = createSave(() => store);
      s.write((x) => void (x.plays += 1));
      s.write((x) => void (x.owned = withItem(x.owned, GIFTS[0])));
      s.load();
      s.clear();
      createSave(() => store).write((x) => void (x.seen.wardrobe = true));
      expect(new Set(store.touched)).toEqual(new Set([SAVE_KEY]));
    }
  });

  it('keeps her whole collection in the order she earned it, and what she wears from it', () => {
    const store = memoryStore();
    const s = createSave(() => store);
    const order = [...GIFTS].reverse();
    s.write((x) => {
      x.owned = order.reduce(withItem, x.owned);
      x.look = { ...x.look, crown: 'flower', shoes: 'stars', earrings: 'drops', necklace: 'heart', style: 'lowbun', thing: 'cherries' };
      x.ribbons = ['lilac', 'sky', 'mint', 'gold', 'coral'];
    });
    const back = createSave(() => store).data;
    expect(back.owned).toEqual(order.reduce(withItem, START_OWNED));
    expect(back.look).toMatchObject({ crown: 'flower', shoes: 'stars', earrings: 'drops', necklace: 'heart', style: 'lowbun', thing: 'cherries' });
    expect(back.ribbons).toEqual(['lilac', 'sky', 'mint', 'gold', 'coral']);
  });
});

describe('parseOptions', () => {
  it('reads every option', () => {
    const o = parseOptions('?seed=5&at=wardrobe&fresh=1&rl=3&maths=b&contrast=0&quest=beads&pl=2&phrases=all&box=5&portrait=0&perf=1', 1);
    expect(o).toEqual({
      seed: 5, at: 'wardrobe', fresh: true, readingLevel: 3, band: 'b', contrast: false, quest: 'beads', patternLevel: 2, phraseRule: 'all',
      boxMs: 5000, portrait: false, perf: true,
    });
  });

  it('falls back for missing and unknown values', () => {
    const o = parseOptions('?rl=7&maths=c&quest=hunt&pl=0&phrases=some&seed=x', 42);
    expect(o).toEqual({
      seed: 42, at: null, fresh: false, readingLevel: null, band: null, contrast: true, quest: null, patternLevel: null, phraseRule: 'default',
      boxMs: null, portrait: true, perf: false,
    });
  });

  it('reads ?phrases=emma as the rule of Emma\'s checks only, and no ?phrases= as the default rule', () => {
    expect(parseOptions('?phrases=emma', 1).phraseRule).toBe('emma');
    expect(parseOptions('?phrases=all', 1).phraseRule).toBe('all');
    expect(parseOptions('', 1).phraseRule).toBe('default');
  });
});
