// The 2.3.0 wardrobe catalogue (src/wardrobe.ts, docs/v4/2.3.md sections 15 and 16, tests of 22.4): the palette in
// rails of six, the six tabs with fixed rows within five rails, no cell that moves when she earns an item in any
// order, no jewel rail before a jewel, the default look and what she owns at the start, normaliseLook with ownership,
// every 2.2 look in 2.3 terms, the gift sets to the end of every set, the goodnight ribbons, the crown on every hair,
// the words and the busiest look line.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GiftItem, GiftSet, LookField, Owned, OwnedField, PrincessLook } from '../src/contracts';
import {
  COLOURS, COLOUR_FIELDS, CROWN_CONTRAST, DEFAULT_LOOK, EYE_HEX, GIFT_SETS, HAIR_COLOURS, HAIR_HEX, OPTIONS, OWNED_FIELDS, PALETTE,
  RAIL_CELLS, START_OWNED, TABS, TAB_RAILS, contrast, crownOutline, fieldRows, fromLegacy, giftChoices, giftSetFor, lookFields,
  nextRibbon, normaliseLook, owns, parseOwned, railsOf, setOfQuest, stillToEarn, wardrobeClipIds, withItem, wordOf,
} from '../src/wardrobe';
import { DIAG_MAX, diagQuery } from '../src/game/results';
import { type Rand, seeded } from '../src/content/rand';
import { lineFor } from '../tools/lines';

const v3Audio = resolve(import.meta.dirname, '../../moon-meadow-home/public/audio');
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'];
const v3Ok = new Set<string>();
for (const pack of V3_PACKS) {
  const clips = (JSON.parse(readFileSync(join(v3Audio, pack, 'manifest.json'), 'utf8')) as { clips: Record<string, { ok?: boolean; file?: string }> }).clips;
  for (const [id, c] of Object.entries(clips)) if (c.ok === true && c.file && existsSync(join(v3Audio, pack, c.file))) v3Ok.add(id);
}

const FIELDS = Object.keys(OPTIONS) as LookField[];
const SETS = Object.keys(GIFT_SETS) as GiftSet[];
const QUESTS = ['picnic', 'rack', 'beads', 'corner'];
const GIFTS: GiftItem[] = SETS.flatMap((s) => [...GIFT_SETS[s].items]);
/** Everything earned. */
const ALL_OWNED = GIFTS.reduce(withItem, START_OWNED);

/** 2.2.0's catalogue: the ids a v1 save (mmw.save) can hold, and 2.2's default look. */
const V22 = {
  hair: ['sunny', 'strawberry', 'chestnut', 'midnight', 'candy', 'rainbow'],
  eyes: ['blue', 'green', 'brown', 'hazel', 'grey', 'violet'],
  gown: ['rose', 'rainbow', 'lilac', 'moon', 'fairy', 'tutu'],
  style: ['ponytails', 'high', 'plaits', 'bun'],
  thing: ['bows', 'unicorn', 'flowers', 'stars', 'butterflies', 'hearts'],
  ribbon: ['pink', 'lilac', 'sky', 'mint', 'gold', 'coral'],
} as const;
type V22Look = { [K in keyof typeof V22]: (typeof V22)[K][number] };
const V22_DEFAULT: V22Look = { hair: 'sunny', eyes: 'blue', gown: 'rose', style: 'ponytails', thing: 'bows', ribbon: 'pink' };

/** Vowel groups, less a silent final e. Good enough for short words. */
function syllables(w: string): number {
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  return groups > 1 && /[^aeiou]e$/.test(w) ? groups - 1 : groups;
}

function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

function shuffled<T>(xs: readonly T[], rand: Rand): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Where every cell she can see sits: "field id" to "tab row:cell". */
function cellsOf(owned: Owned): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of TABS) for (const r of railsOf(t.tab, owned)) r.ids.forEach((id, i) => out.set(`${r.field} ${id}`, `${t.tab} ${r.row}:${i}`));
  return out;
}

/** The first row of a field on its tab. */
function firstRow(field: LookField): number {
  const tab = TABS.find((t) => t.fields.includes(field))!;
  return tab.fields.slice(0, tab.fields.indexOf(field)).reduce((n, f) => n + fieldRows(f), 0);
}

const sameItems = (a: Owned, b: Owned) => {
  for (const f of OWNED_FIELDS) expect([...a[f]].sort(), f).toEqual([...b[f]].sort());
};

describe('the palette and the options', () => {
  it('has twelve colours with green in the first rail, and hair has the six natural shades before the palette', () => {
    expect(COLOURS).toHaveLength(12);
    expect(COLOURS.indexOf('green')).toBeLessThan(RAIL_CELLS);
    expect(COLOURS[COLOURS.length - 1]).toBe('rainbow');
    expect(HAIR_COLOURS).toEqual(['sunny', 'honey', 'strawberry', 'auburn', 'chestnut', 'midnight', ...COLOURS]);
    for (const f of COLOUR_FIELDS) expect(OPTIONS[f].length % RAIL_CELLS, f).toBe(0);
    for (const f of COLOUR_FIELDS.filter((f) => f !== 'hair')) expect(OPTIONS[f], f).toEqual(COLOURS);
  });

  it('gives every colour five shades and every hair colour a base and a light', () => {
    for (const c of COLOURS) for (const k of ['light', 'base', 'deep', 'sash', 'small'] as const) expect(PALETTE[c][k], `${c} ${k}`).toMatch(/^#[0-9a-f]{6}$/);
    for (const h of HAIR_COLOURS) for (const k of ['base', 'light'] as const) expect(HAIR_HEX[h][k], `${h} ${k}`).toMatch(/^#[0-9a-f]{6}$/);
    for (const e of OPTIONS.eyes) expect(EYE_HEX[e]).toMatch(/^#[0-9a-f]{6}$/);
    expect(PALETTE.rainbow.bands).toHaveLength(6);
    expect(HAIR_HEX.rainbow.bands).toHaveLength(6);
  });

  it('gives a picture tint only to the six phrase colours, which a multiply tint can show', () => {
    const tinted = COLOURS.filter((c) => PALETTE[c].pic);
    expect(tinted.sort()).toEqual(['blue', 'brown', 'gold', 'green', 'pink', 'red']);
    for (const c of tinted) expect(PALETTE[c].pic).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('has unique ids in every field, and the default look is 2.2\'s Princess Emma in start items only', () => {
    for (const f of FIELDS) expect(new Set(OPTIONS[f]).size, f).toBe(OPTIONS[f].length);
    for (const f of FIELDS) expect(OPTIONS[f] as readonly string[], f).toContain(DEFAULT_LOOK[f]);
    expect(DEFAULT_LOOK).toMatchObject({
      hair: 'sunny', style: 'ponytails', eyes: 'blue', gown: 'party', gownColour: 'pink', extra: 'none', crown: 'lumi', crownColour: 'gold',
      shoes: 'slippers', shoeColour: 'pink', thing: 'bows', thingColour: 'pink', earrings: 'none', necklace: 'none',
    });
    for (const f of OWNED_FIELDS) {
      if (DEFAULT_LOOK[f] !== 'none') expect(START_OWNED[f] as readonly string[], f).toContain(DEFAULT_LOOK[f]);
    }
  });

  it('owns the 8 start styles, the 6 start hair things, Lumi\'s crown and the slippers at the start, and no jewel', () => {
    expect(START_OWNED.style).toHaveLength(8);
    expect(START_OWNED.thing).toHaveLength(6);
    expect(START_OWNED.crown).toEqual(['lumi']);
    expect(START_OWNED.shoes).toEqual(['slippers']);
    expect(START_OWNED.earrings).toEqual([]);
    expect(START_OWNED.necklace).toEqual([]);
  });

  it('puts every earned item after every start item in its field', () => {
    for (const f of OWNED_FIELDS) {
      const ids = OPTIONS[f] as readonly string[];
      const start = (START_OWNED[f] as readonly string[]).map((id) => ids.indexOf(id));
      for (const g of GIFTS.filter((i) => i.field === f)) expect(ids.indexOf(g.id), g.id).toBeGreaterThan(Math.max(-1, ...start));
    }
  });
});

describe('the tabs and their fixed rows', () => {
  it('has six tabs in order that hold every field once, the eyes and sparkles tabs in the face frame', () => {
    expect(TABS.map((t) => t.tab)).toEqual(['hair', 'eyes', 'gown', 'crown', 'shoes', 'sparkles']);
    expect(TABS.flatMap((t) => t.fields).sort()).toEqual([...FIELDS].sort());
    expect(TABS.filter((t) => t.frame === 'face').map((t) => t.tab)).toEqual(['eyes', 'sparkles']);
    expect(TABS.find((t) => t.tab === 'eyes')!.fields).toEqual(['eyes', 'earrings', 'necklace', 'jewelColour']);
  });

  it('fits every tab\'s fixed rows within five rails of six, also with everything earned', () => {
    for (const t of TABS) expect(t.fields.reduce((n, f) => n + fieldRows(f), 0), t.tab).toBeLessThanOrEqual(TAB_RAILS);
    for (const f of FIELDS) expect(fieldRows(f) * RAIL_CELLS, f).toBeGreaterThanOrEqual(OPTIONS[f].length);
    for (const owned of [START_OWNED, ALL_OWNED]) {
      for (const t of TABS) {
        const rails = railsOf(t.tab, owned);
        expect(rails.length, t.tab).toBeLessThanOrEqual(TAB_RAILS);
        expect(new Set(rails.map((r) => r.row)).size, t.tab).toBe(rails.length);
        for (const r of rails) {
          expect(r.ids.length).toBeGreaterThan(0);
          expect(r.ids.length).toBeLessThanOrEqual(RAIL_CELLS);
          // A rail sits inside its own field's rows.
          expect(r.row).toBeGreaterThanOrEqual(firstRow(r.field));
          expect(r.row).toBeLessThan(firstRow(r.field) + fieldRows(r.field));
        }
      }
    }
    // With everything earned, every option of every field shows once.
    const all = TABS.flatMap((t) => railsOf(t.tab, ALL_OWNED)).flatMap((r) => r.ids.map((id) => `${r.field} ${id}`));
    expect(all.sort()).toEqual(FIELDS.flatMap((f) => OPTIONS[f].map((id) => `${f} ${id}`)).sort());
    expect(railsOf('hair', ALL_OWNED)).toHaveLength(5);
  });

  it('shows only what she owns, and every colour, eye colour, gown shape and extra from the first play', () => {
    const shown = cellsOf(START_OWNED);
    for (const f of FIELDS) {
      for (const id of OPTIONS[f]) {
        const own = !(OWNED_FIELDS as readonly string[]).includes(f) || (START_OWNED[f as OwnedField] as readonly string[]).includes(id);
        // She owns no jewel at the start, so the jewel rails (their 'none' too) and the jewel colour wait.
        const jewel = f === 'earrings' || f === 'necklace' || f === 'jewelColour';
        expect(shown.has(`${f} ${id}`), `${f} ${id}`).toBe(own && !jewel);
      }
    }
    const crowns = railsOf('crown', withItem(START_OWNED, { field: 'crown', id: 'heart' })).find((r) => r.field === 'crown')!.ids;
    expect(crowns).toEqual(['lumi', 'heart']);
  });

  it('never moves a cell she knows when she earns an item, in every order of the gift sets', () => {
    const walk = (order: GiftItem[]) => {
      let owned = START_OWNED;
      for (const item of order) {
        const before = cellsOf(owned);
        owned = withItem(owned, item);
        const after = cellsOf(owned);
        for (const [cell, at] of before) expect(after.get(cell), `${cell} after ${item.id}`).toBe(at);
        // The new item lands after every cell of its field.
        const key = (at: string) => at.split(' ')[1].split(':').map(Number).reduce((r, c) => r * 10 + c);
        const mine = after.get(`${item.field} ${item.id}`)!;
        expect(mine, item.id).toBeDefined();
        for (const [cell, at] of after) if (cell.startsWith(`${item.field} `) && cell !== `${item.field} ${item.id}`) expect(key(at)).toBeLessThan(key(mine));
      }
      sameItems(owned, ALL_OWNED);
    };
    const rand = seeded(23);
    for (const sets of permutations(SETS)) walk(sets.flatMap((s) => shuffled(GIFT_SETS[s].items, rand)));
    // And gifts from all four sets mixed, as the quests pay them.
    for (let n = 0; n < 200; n++) walk(shuffled(GIFTS, rand));
  });

  it('shows no jewel rail and no jewel colour before she owns a jewel', () => {
    expect(railsOf('eyes', START_OWNED).map((r) => r.field)).toEqual(['eyes']);
    for (const t of TABS) for (const r of railsOf(t.tab, START_OWNED)) expect(['earrings', 'necklace', 'jewelColour']).not.toContain(r.field);
    const studs = railsOf('eyes', withItem(START_OWNED, { field: 'earrings', id: 'studs' }));
    expect(studs.map((r) => [r.field, r.row])).toEqual([['eyes', 0], ['earrings', 1], ['jewelColour', 3], ['jewelColour', 4]]);
    expect(studs.find((r) => r.field === 'earrings')!.ids).toEqual(['none', 'studs']);
    const pearls = railsOf('eyes', withItem(START_OWNED, { field: 'necklace', id: 'pearls' }));
    expect(pearls.map((r) => [r.field, r.row])).toEqual([['eyes', 0], ['necklace', 2], ['jewelColour', 3], ['jewelColour', 4]]);
    expect(pearls.find((r) => r.field === 'necklace')!.ids).toEqual(['none', 'pearls']);
    // Every jewel rail starts with 'none', so she can always take it off again.
    for (const r of railsOf('eyes', ALL_OWNED)) if (r.field === 'earrings' || r.field === 'necklace') expect(r.ids[0]).toBe('none');
  });
});

describe('normaliseLook and parseOwned', () => {
  it('falls back field by field on junk', () => {
    for (const junk of [null, undefined, 5, 'sunny', [], {}]) expect(normaliseLook(junk)).toEqual(DEFAULT_LOOK);
    expect(normaliseLook({ hair: 'green', gown: 'cape', crownColour: 7 })).toEqual({ ...DEFAULT_LOOK, hair: 'green' });
    const base: PrincessLook = { ...DEFAULT_LOOK, gownColour: 'green', hair: 'green' };
    expect(normaliseLook({ gownColour: 'black', eyes: 'green' }, base)).toEqual({ ...base, eyes: 'green' });
  });

  it('returns a new object, never the default itself', () => {
    const a = normaliseLook(null);
    a.hair = 'pink';
    expect(DEFAULT_LOOK.hair).toBe('sunny');
  });

  it('never wears an earned item she does not own, also when the fallback look holds one', () => {
    const look = normaliseLook({ crown: 'star', style: 'plait', earrings: 'hearts', thing: 'unicorn' }, DEFAULT_LOOK, START_OWNED);
    expect(look).toEqual({ ...DEFAULT_LOOK, thing: 'unicorn' });
    const mine = withItem(START_OWNED, { field: 'crown', id: 'star' });
    expect(normaliseLook({ crown: 'star' }, DEFAULT_LOOK, mine).crown).toBe('star');
    const dressed: PrincessLook = { ...DEFAULT_LOOK, crown: 'tiara', style: 'curls', necklace: 'heart', shoes: 'boots' };
    expect(normaliseLook({}, dressed, START_OWNED)).toEqual(DEFAULT_LOOK);
    // 'none' needs no jewel, and colours, eyes, gowns and extras are always hers.
    const free: PrincessLook = { ...DEFAULT_LOOK, gown: 'gala', gownColour: 'rainbow', extra: 'wings', eyes: 'violet', hair: 'midnight', earrings: 'none' };
    expect(normaliseLook(free, DEFAULT_LOOK, START_OWNED)).toEqual(free);
  });

  it('keeps every look as it is once she owns everything', () => {
    const rand = seeded(5);
    for (let n = 0; n < 500; n++) {
      const look = Object.fromEntries(FIELDS.map((f) => [f, OPTIONS[f][Math.floor(rand() * OPTIONS[f].length)]])) as unknown as PrincessLook;
      expect(normaliseLook(look, DEFAULT_LOOK, ALL_OWNED)).toEqual(look);
    }
  });

  it('keeps the start items and every known id once, in the order she earned them', () => {
    expect(parseOwned(null)).toEqual(START_OWNED);
    expect(parseOwned('junk')).toEqual(START_OWNED);
    const o = parseOwned({ crown: ['star', 'star', 'cape', 3, 'tiara'], earrings: ['none', 'drops'], style: ['curls', 'ponytails'] });
    expect(o.crown).toEqual(['lumi', 'star', 'tiara']);
    expect(o.earrings).toEqual(['drops']);
    expect(o.style).toEqual([...START_OWNED.style, 'curls']);
    expect(parseOwned(JSON.parse(JSON.stringify(ALL_OWNED)))).toEqual(ALL_OWNED);
  });
});

describe('a 2.2 look in 2.3 terms', () => {
  it('maps the gowns, candy hair and the ribbon as section 15 says', () => {
    const gown = (g: string) => {
      const l = fromLegacy({ ...V22_DEFAULT, gown: g });
      return [l.gown, l.gownColour, l.extra, l.shoes, l.shoeColour].join(' ');
    };
    expect(V22.gown.map(gown)).toEqual([
      'party pink none slippers pink', 'party rainbow none slippers pink', 'gala lilac bow slippers lilac', 'ball silver bow slippers pink',
      'party green wings slippers pink', 'tutu blue none slippers blue',
    ]);
    expect(fromLegacy({ ...V22_DEFAULT, hair: 'candy' }).hair).toBe('pink');
    expect(V22.ribbon.map((r) => fromLegacy({ ...V22_DEFAULT, ribbon: r }).thingColour)).toEqual(['pink', 'lilac', 'blue', 'green', 'gold', 'orange']);
    expect(fromLegacy(V22_DEFAULT)).toEqual(DEFAULT_LOOK);
  });

  it('brings every 2.2 option over in start items, and keeps the fields it does not name', () => {
    for (const row of Object.keys(V22) as (keyof typeof V22)[]) {
      for (const id of V22[row]) {
        const old = { ...V22_DEFAULT, [row]: id };
        const look = fromLegacy(old);
        expect(normaliseLook(look, DEFAULT_LOOK, START_OWNED), JSON.stringify(old)).toEqual(look);
        if (row === 'hair' || row === 'eyes' || row === 'style' || row === 'thing') expect(look[row]).toBe(id === 'candy' ? 'pink' : id);
        expect(look.crown).toBe('lumi');
        expect(look.crownColour).toBe('gold');
        expect([look.earrings, look.necklace]).toEqual(['none', 'none']);
      }
    }
  });

  it('keeps every 2.2 look apart, so nothing she chose in 2.2 is lost', () => {
    const seen = new Set<string>();
    let n = 0;
    for (const hair of V22.hair) for (const eyes of V22.eyes) for (const gown of V22.gown) for (const style of V22.style) for (const thing of V22.thing) {
      for (const ribbon of V22.ribbon) {
        seen.add(JSON.stringify(fromLegacy({ hair, eyes, gown, style, thing, ribbon })));
        n++;
      }
    }
    expect(seen.size).toBe(n);
  });

  it('falls back to the default look for junk and unknown 2.2 ids', () => {
    for (const junk of [null, undefined, 7, 'rose', [], {}]) expect(fromLegacy(junk)).toEqual(DEFAULT_LOOK);
    expect(fromLegacy({ gown: 'cape', hair: 'gold?', ribbon: 'teal' })).toEqual(DEFAULT_LOOK);
  });
});

describe('the gift sets', () => {
  it('holds 21 items in four sets, none of them a start item, each set paid by its own quest', () => {
    expect(GIFTS).toHaveLength(21);
    expect(SETS.map((s) => GIFT_SETS[s].items.length)).toEqual([4, 3, 6, 8]);
    expect(new Set(GIFTS.map((i) => `${i.field} ${i.id}`)).size).toBe(21);
    for (const i of GIFTS) {
      expect(OPTIONS[i.field] as readonly string[]).toContain(i.id);
      expect(owns(START_OWNED, i)).toBe(false);
    }
    expect(QUESTS.map(setOfQuest)).toEqual(['crowns', 'shoes', 'jewels', 'hair']);
    // Every earned option is in a set, so she can earn all of them.
    for (const f of OWNED_FIELDS) for (const id of OPTIONS[f]) if (id !== 'none') expect(owns(START_OWNED, { field: f, id } as GiftItem) || GIFTS.some((g) => g.field === f && g.id === id), id).toBe(true);
  });

  it('pays from the quest\'s own set while it has items, then from the set with the most left, to the end of every set', () => {
    const left = (s: GiftSet, owned: Owned) => stillToEarn(s, owned).length;
    // Every order the quests come in, and each quest on its own (she may only ever do the picnic).
    const orders = [...permutations(QUESTS), ...QUESTS.map((q) => [q])];
    for (const order of orders) {
      for (const seed of [1, 2, 3]) {
        const rand = seeded(seed);
        let owned = START_OWNED;
        let paid = 0;
        for (let turn = 0; ; turn++) {
          const quest = order[turn % order.length];
          const set = giftSetFor(quest, owned);
          if (set === null) break;
          const own = setOfQuest(quest)!;
          expect(left(set, owned)).toBeGreaterThan(0);
          if (left(own, owned) > 0) expect(set).toBe(own);
          else expect(left(set, owned)).toBe(Math.max(...SETS.map((s) => left(s, owned))));
          const offer = giftChoices(set, owned, rand);
          owned = withItem(owned, offer[Math.floor(rand() * offer.length)]);
          paid++;
        }
        expect(paid, order.join(',')).toBe(21);
        sameItems(owned, ALL_OWNED);
        for (const q of QUESTS) expect(giftSetFor(q, owned)).toBeNull();
      }
    }
  });

  it('pays from the first set in GIFT_SETS order when two sets have the most left', () => {
    expect(SETS).toEqual(['crowns', 'shoes', 'jewels', 'hair']);
    const earn = (items: readonly GiftItem[]) => items.reduce<Owned>((o, i) => withItem(o, i), START_OWNED);
    // Crowns full; shoes 3 left, jewels 3 left, hair 2 left: the picnic pays from shoes, not jewels.
    const a = earn([...GIFT_SETS.crowns.items, ...GIFT_SETS.jewels.items.slice(0, 3), ...GIFT_SETS.hair.items.slice(0, 6)]);
    expect(giftSetFor('picnic', a)).toBe('shoes');
    // Crowns and shoes full; jewels 3 left, hair 3 left: the picnic and the rack pay from jewels, not hair.
    const b = earn([...GIFT_SETS.crowns.items, ...GIFT_SETS.shoes.items, ...GIFT_SETS.jewels.items.slice(0, 3), ...GIFT_SETS.hair.items.slice(0, 5)]);
    expect(giftSetFor('picnic', b)).toBe('jewels');
    expect(giftSetFor('rack', b)).toBe('jewels');
  });

  it('offers two different gifts she does not own, then the last one, then none, to the end of every set', () => {
    for (const r of [seeded(7), () => 0, () => 0.9999999]) {
      let owned = START_OWNED;
      for (const set of SETS) {
        for (;;) {
          const offer = giftChoices(set, owned, r);
          expect(offer.length).toBe(Math.min(2, stillToEarn(set, owned).length));
          if (!offer.length) break;
          expect(new Set(offer.map((i) => i.id)).size).toBe(offer.length);
          for (const i of offer) {
            expect(owns(owned, i)).toBe(false);
            expect(GIFT_SETS[set].items).toContainEqual(i);
          }
          owned = withItem(owned, offer[offer.length - 1]);
        }
      }
      sameItems(owned, ALL_OWNED);
    }
  });

  it('can offer every item of a set first', () => {
    for (const set of SETS) {
      const offered = new Set<string>();
      for (let seed = 0; seed < 300; seed++) for (const i of giftChoices(set, START_OWNED, seeded(seed))) offered.add(i.id);
      expect(offered.size, set).toBe(GIFT_SETS[set].items.length);
    }
  });

  it('adds an item once and leaves the old list alone', () => {
    const star: GiftItem = { field: 'crown', id: 'star' };
    const a = withItem(START_OWNED, star);
    expect(withItem(a, star)).toEqual(a);
    expect(START_OWNED.crown).toEqual(['lumi']);
  });
});

describe('the goodnight ribbons', () => {
  it('gives each ribbon once in order, then the one after the colour she wears', () => {
    expect(nextRibbon([], 'pink')).toBe('lilac');
    expect(nextRibbon(['lilac', 'sky'], 'pink')).toBe('mint');
    const all = ['lilac', 'sky', 'mint', 'gold', 'coral'] as const;
    expect(nextRibbon(all, 'pink')).toBe('lilac');
    expect(nextRibbon(all, 'orange')).toBe('pink');
  });
});

describe('the crown on her hair', () => {
  // Section 15's number, written here and not read from the code, so lowering CROWN_CONTRAST to pass a tuned shade fails.
  const MIN = 1.8;

  it('has an outline that stands out from every one of the 18 hair colours, in every one of the 12 crown colours', () => {
    expect(CROWN_CONTRAST).toBe(MIN);
    let pairs = 0;
    for (const h of HAIR_COLOURS) {
      for (const c of COLOURS) {
        const o = crownOutline(h, c);
        const at = `${c} crown on ${h} hair`;
        expect(o).toMatch(/^#[0-9a-f]{6}$/);
        expect(contrast(o, HAIR_HEX[h].base), at).toBeGreaterThanOrEqual(MIN);
        // Section 15's order: white (as in 2.2), the crown's deep shade, dark gold, dark purple. The first that stands out.
        const first = ['#ffffff', PALETTE[c].deep, '#b8860b', '#5a3d8a'].find((x) => contrast(x, HAIR_HEX[h].base) >= MIN);
        expect(first, at).toBeDefined();
        expect(o, at).toBe(first);
        pairs++;
      }
    }
    expect(pairs).toBe(18 * 12);
  });
});

describe('words and the log', () => {
  const words = FIELDS.flatMap((f) => OPTIONS[f].map((id) => wordOf(f, id))).filter((w) => w !== undefined);

  it('prints only one-syllable words of at most five letters, and every word has a clip', () => {
    for (const w of words) {
      if (w.print) {
        expect(w.print, w.print).toMatch(/^[a-z]{1,5}$/);
        expect(syllables(w.print), w.print).toBe(1);
        expect(w.clip).toBe(`word-${w.print}`);
      }
    }
    for (const id of wardrobeClipIds()) expect(v3Ok.has(id) || lineFor(id) !== null, id).toBe(true);
  });

  it('says every colour\'s name, prints the short ones, and says nothing for the natural hair shades', () => {
    for (const f of COLOUR_FIELDS) for (const c of COLOURS) expect(wordOf(f, c)?.clip, `${f} ${c}`).toBe(`word-${c}`);
    const printed = COLOURS.filter((c) => wordOf('gownColour', c)?.print);
    expect(printed).toEqual(['pink', 'red', 'gold', 'green', 'blue', 'white', 'brown']);
    for (const h of HAIR_COLOURS.slice(0, 6)) expect(wordOf('hair', h), h).toBeUndefined();
  });

  it('says blue, green and brown for those eyes and nothing for the others', () => {
    const said = OPTIONS.eyes.filter((e) => wordOf('eyes', e));
    expect(said).toEqual(['blue', 'green', 'brown']);
    for (const e of said) expect(wordOf('eyes', e)).toEqual(PALETTE[e as 'blue'].word);
  });

  it('says the shape words of section 15, printing the short ones', () => {
    const shapes = FIELDS.filter((f) => !COLOUR_FIELDS.includes(f) && f !== 'eyes');
    const shapeWords = shapes.flatMap((f) => OPTIONS[f].map((id) => wordOf(f, id))).filter((w) => w !== undefined);
    const printed = new Set(shapeWords.filter((w) => w.print).map((w) => w.print));
    const saidOnly = new Set(shapeWords.filter((w) => !w.print).map((w) => w.clip.slice('word-'.length)));
    expect([...printed].sort()).toEqual(['boots', 'bow', 'bows', 'bun', 'clip', 'crown', 'dress', 'gown', 'heart', 'moon', 'star', 'stars', 'wings']);
    expect([...saidOnly].sort()).toEqual(['cherry', 'daisy', 'earrings', 'flower', 'shells', 'slippers']);
    expect(wordOf('earrings', 'none')).toBeUndefined();
    expect(wordOf('necklace', 'none')).toBeUndefined();
  });

  it('lists every clip the wardrobe can say once', () => {
    const ids = wardrobeClipIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(words.map((w) => w.clip)));
  });

  it('keeps the busiest look line under 300 characters, with every field in it', () => {
    const longest = <T extends string>(ids: readonly T[]) => ids.reduce((a, b) => (encodeURIComponent(b).length > encodeURIComponent(a).length ? b : a));
    const busiest = Object.fromEntries(FIELDS.map((f) => [f, longest(OPTIONS[f] as readonly string[])])) as unknown as PrincessLook;
    const line = diagQuery(
      { kind: 'look', at: 'corner', end: 'time', tabs: TABS.map((t) => t.tab).join(','), ms: 999999, ...lookFields(busiest) },
      Infinity,
    );
    expect(line.length).toBeLessThan(300);
    expect(line.length).toBeLessThan(DIAG_MAX);
    for (const k of Object.keys(lookFields(busiest))) expect(line).toContain(`&${k}=`);
    expect(new Set(Object.keys(lookFields(DEFAULT_LOOK))).size).toBe(FIELDS.length);
  });
});
