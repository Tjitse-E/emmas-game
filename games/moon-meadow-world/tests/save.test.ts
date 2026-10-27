// The save (src/game/save.ts) and the address options (src/game/options.ts).
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../src/wardrobe';
import { type KeyStore, SAVE_KEY, createSave, defaultSave, memoryStore, ownedRibbons, parseSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';

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
      v: 1,
      look: { hair: 'candy', eyes: 'violet', gown: 'fairy', style: 'plaits', thing: 'stars', ribbon: 'lilac' },
      ribbons: ['lilac', 'sky'],
      plays: 4,
      seen: { wardrobe: true },
      reading: { level: 3, recent: ['first', 'miss'] },
      last: { words: ['crown', 'seal', 'plum'], totals: [13, 14] },
    };
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });

  it('keeps every field it understands from a newer shape', () => {
    const s = parseSave(JSON.stringify({ v: 3, look: { hair: 'midnight', cape: 'red' }, plays: 2, pets: ['cat'], seen: { wardrobe: true, trunk: true } }));
    expect(s.v).toBe(1);
    expect(s.look).toEqual({ ...DEFAULT_LOOK, hair: 'midnight' });
    expect(s.plays).toBe(2);
    expect(s.seen).toEqual({ wardrobe: true });
  });

  it('drops unknown ids and broken fields one by one', () => {
    const s = parseSave({
      look: { hair: 'gold', eyes: 'green', gown: 7, style: null, thing: 'crown', ribbon: 'black' },
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
    expect(mem.getItem(SAVE_KEY)).toBeNull();
    expect(b.data).toEqual(defaultSave());
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
      (x.look as unknown as Record<string, string>).hair = 'gold';
      x.ribbons.push('lilac', 'lilac');
    });
    expect(s.data.look.hair).toBe('sunny');
    expect(s.data.ribbons).toEqual(['lilac']);
  });
});

describe('parseOptions', () => {
  it('reads every option', () => {
    const o = parseOptions('?seed=5&at=wardrobe&fresh=1&rl=3&maths=b&contrast=0&quest=rack&portrait=0&perf=1', 1);
    expect(o).toEqual({ seed: 5, at: 'wardrobe', fresh: true, readingLevel: 3, band: 'b', contrast: false, quest: 'rack', portrait: false, perf: true });
  });

  it('falls back for missing and unknown values', () => {
    const o = parseOptions('?rl=7&maths=c&quest=hunt&seed=x', 42);
    expect(o).toEqual({ seed: 42, at: null, fresh: false, readingLevel: null, band: null, contrast: true, quest: null, portrait: true, perf: false });
  });
});
