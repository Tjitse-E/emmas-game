// The 2.3.0 wardrobe catalogue (src/wardrobe.ts, docs/v4/2.3.md Part 2 section 2): the palette in rails of six, the
// tabs within five rails, the default look and what she owns at the start, normaliseLook with ownership, a 2.2 look
// in 2.3 terms, the gift sets, the goodnight ribbons, the crown on every hair, the look line and every word.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GiftSet, LookField, PrincessLook } from '../src/contracts';
import {
  COLOURS, COLOUR_FIELDS, CROWN_CONTRAST, DEFAULT_LOOK, GIFT_SETS, HAIR_COLOURS, HAIR_HEX, OPTIONS, OWNED_FIELDS, PALETTE, RAIL_CELLS,
  START_OWNED, TABS, TAB_RAILS, contrast, crownOutline, fromLegacy, giftChoices, lookFields, nextRibbon, normaliseLook, owns, parseOwned,
  railsOf, stillToEarn, wardrobeClipIds, withItem, wordOf,
} from '../src/wardrobe';
import { LEGACY_DEFAULT, LEGACY_ROWS, legacyOf } from '../src/wardrobe-legacy';
import { DIAG_MAX, diagQuery } from '../src/game/results';
import { seeded } from '../src/content/rand';
import { lineFor } from '../tools/lines';

const v3Audio = resolve(import.meta.dirname, '../../moon-meadow-home/public/audio');
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'];
const v3Ok = new Set<string>();
for (const pack of V3_PACKS) {
  const clips = (JSON.parse(readFileSync(join(v3Audio, pack, 'manifest.json'), 'utf8')) as { clips: Record<string, { ok?: boolean; file?: string }> }).clips;
  for (const [id, c] of Object.entries(clips)) if (c.ok === true && c.file && existsSync(join(v3Audio, pack, c.file))) v3Ok.add(id);
}

const FIELDS = Object.keys(OPTIONS) as LookField[];
/** Everything earned, as a gift set full of it. */
const ALL_OWNED = Object.fromEntries(OWNED_FIELDS.map((f) => [f, OPTIONS[f].filter((id) => id !== 'none')])) as unknown as typeof START_OWNED;

/** Vowel groups, less a silent final e. Good enough for short words. */
function syllables(w: string): number {
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  return groups > 1 && /[^aeiou]e$/.test(w) ? groups - 1 : groups;
}

describe('the palette and the options', () => {
  it('has twelve colours with green, hair has eighteen, and every colour run fills whole rails of six', () => {
    expect(COLOURS).toHaveLength(12);
    expect(COLOURS).toContain('green');
    expect(HAIR_COLOURS).toHaveLength(18);
    for (const f of COLOUR_FIELDS) expect(OPTIONS[f].length % RAIL_CELLS, f).toBe(0);
    for (const c of COLOURS) for (const k of ['light', 'base', 'deep', 'sash', 'small'] as const) expect(PALETTE[c][k]).toMatch(/^#[0-9a-f]{6}$/);
    for (const h of HAIR_COLOURS) expect(HAIR_HEX[h].base).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('gives a picture tint only to colours a multiply tint can show', () => {
    const tinted = COLOURS.filter((c) => PALETTE[c].pic);
    expect(tinted.sort()).toEqual(['blue', 'brown', 'gold', 'green', 'pink', 'red']);
  });

  it('has unique ids in every field, and the default look is all start items', () => {
    for (const f of FIELDS) expect(new Set(OPTIONS[f]).size, f).toBe(OPTIONS[f].length);
    for (const f of FIELDS) expect(OPTIONS[f] as readonly string[], f).toContain(DEFAULT_LOOK[f]);
    for (const f of OWNED_FIELDS) {
      if (DEFAULT_LOOK[f] !== 'none') expect(START_OWNED[f] as readonly string[], f).toContain(DEFAULT_LOOK[f]);
    }
  });
});

describe('the tabs', () => {
  it('holds every field once, each tab within five rails of six, also with everything earned', () => {
    expect(TABS.map((t) => t.tab)).toEqual(['hair', 'eyes', 'gown', 'crown', 'shoes', 'sparkles']);
    expect(TABS.flatMap((t) => t.fields).sort()).toEqual([...FIELDS].sort());
    for (const owned of [START_OWNED, ALL_OWNED]) {
      for (const t of TABS) {
        const rails = railsOf(t.tab, owned);
        expect(rails.length, t.tab).toBeLessThanOrEqual(TAB_RAILS);
        for (const r of rails) expect(r.ids.length).toBeLessThanOrEqual(RAIL_CELLS);
      }
    }
    expect(railsOf('hair', ALL_OWNED)).toHaveLength(5);
  });

  it('shows only what she owns, earned items after the ones she knows', () => {
    const styles = railsOf('hair', START_OWNED).filter((r) => r.field === 'style').flatMap((r) => r.ids);
    expect(styles).toEqual(START_OWNED.style);
    const crowns = railsOf('crown', withItem(START_OWNED, { field: 'crown', id: 'heart' })).find((r) => r.field === 'crown')!.ids;
    expect(crowns).toEqual(['lumi', 'heart']);
    const earrings = railsOf('eyes', START_OWNED).find((r) => r.field === 'earrings')!.ids;
    expect(earrings).toEqual(['none']);
  });
});

describe('normaliseLook and parseOwned', () => {
  it('falls back field by field on junk', () => {
    expect(normaliseLook(null)).toEqual(DEFAULT_LOOK);
    expect(normaliseLook({ hair: 'green', gown: 'cape', crownColour: 7 })).toEqual({ ...DEFAULT_LOOK, hair: 'green' });
  });

  it('never wears an earned item she does not own', () => {
    const look = normaliseLook({ crown: 'star', style: 'plait', earrings: 'hearts', thing: 'unicorn' }, DEFAULT_LOOK, START_OWNED);
    expect(look.crown).toBe('lumi');
    expect(look.style).toBe('ponytails');
    expect(look.earrings).toBe('none');
    expect(look.thing).toBe('unicorn');
    const mine = withItem(START_OWNED, { field: 'crown', id: 'star' });
    expect(normaliseLook({ crown: 'star' }, DEFAULT_LOOK, mine).crown).toBe('star');
  });

  it('keeps the start items and every known id once', () => {
    expect(parseOwned(null)).toEqual(START_OWNED);
    const o = parseOwned({ crown: ['star', 'star', 'cape', 3], earrings: ['none', 'drops'] });
    expect(o.crown).toEqual(['lumi', 'star']);
    expect(o.earrings).toEqual(['drops']);
  });
});

describe('a 2.2 look in 2.3 terms', () => {
  it('maps every 2.2 option, and shows it again as the same 2.2 look', () => {
    for (const r of LEGACY_ROWS) {
      for (const o of r.options) {
        const old = { ...LEGACY_DEFAULT, [r.row]: o.id };
        const look = fromLegacy(old);
        expect(normaliseLook(look, DEFAULT_LOOK, START_OWNED), JSON.stringify(old)).toEqual(look);
        expect(legacyOf(look), JSON.stringify(old)).toEqual(old);
      }
    }
    expect(fromLegacy(LEGACY_DEFAULT)).toEqual(DEFAULT_LOOK);
    expect(fromLegacy({ gown: 'fairy', hair: 'candy', ribbon: 'mint' })).toMatchObject({ gown: 'party', extra: 'wings', hair: 'pink', thingColour: 'green' });
  });
});

describe('the gift sets', () => {
  it('holds 21 items, none of them a start item, each set paid by its own quest', () => {
    const all = Object.values(GIFT_SETS).flatMap((s) => s.items);
    expect(all).toHaveLength(21);
    for (const i of all) {
      expect(OPTIONS[i.field] as readonly string[]).toContain(i.id);
      expect(owns(START_OWNED, i)).toBe(false);
    }
    expect(new Set(Object.values(GIFT_SETS).map((s) => s.quest)).size).toBe(4);
  });

  it('offers two gifts she does not own, then the last one, then none', () => {
    let owned = START_OWNED;
    const rand = seeded(7);
    for (const set of Object.keys(GIFT_SETS) as GiftSet[]) {
      for (;;) {
        const left = stillToEarn(set, owned).length;
        const offer = giftChoices(set, owned, rand);
        expect(offer.length).toBe(Math.min(2, left));
        if (!offer.length) break;
        expect(new Set(offer.map((i) => i.id)).size).toBe(offer.length);
        for (const i of offer) expect(owns(owned, i)).toBe(false);
        owned = withItem(owned, offer[0]);
      }
    }
    for (const f of OWNED_FIELDS) expect([...owned[f]].sort(), f).toEqual([...ALL_OWNED[f]].sort());
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
  it('has an outline that stands out from every hair colour, in every crown colour', () => {
    for (const h of HAIR_COLOURS) {
      for (const c of COLOURS) {
        const o = crownOutline(h, c);
        expect(contrast(o, HAIR_HEX[h].base), `${c} crown on ${h} hair`).toBeGreaterThanOrEqual(CROWN_CONTRAST);
      }
    }
  });
});

describe('words and the log', () => {
  it('prints only one-syllable words of at most five letters, and every word has a clip', () => {
    const words = FIELDS.flatMap((f) => OPTIONS[f].map((id) => wordOf(f, id))).filter((w) => w !== undefined);
    for (const w of words) {
      if (w.print) {
        expect(w.print.length, w.print).toBeLessThanOrEqual(5);
        expect(syllables(w.print), w.print).toBe(1);
      }
    }
    for (const id of wardrobeClipIds()) expect(v3Ok.has(id) || lineFor(id) !== null, id).toBe(true);
    for (const c of COLOURS) expect(wordOf('gownColour', c)?.clip).toBe(`word-${c}`);
  });

  it('keeps the busiest look line under the diag limit', () => {
    const busiest: PrincessLook = {
      hair: 'strawberry', style: 'lowbun', eyes: 'violet', gown: 'gala', gownColour: 'rainbow', extra: 'wings', crown: 'flower',
      crownColour: 'silver', shoes: 'slippers', shoeColour: 'purple', thing: 'butterflies', thingColour: 'rainbow', earrings: 'hearts',
      necklace: 'pearls', jewelColour: 'silver',
    };
    const q = diagQuery({ kind: 'look', at: 'corner', end: 'time', tabs: 'hair,eyes,gown,crown,shoes,sparkles', ms: 60000, ...lookFields(busiest) });
    expect(q.length).toBeLessThan(DIAG_MAX - 100);
    expect(q).toContain('jc=silver');
  });
});
