// The 2.2.0 catalogue (src/wardrobe-legacy.ts, docs/v4/2.2.md 2.5), kept while the 2.3.0 lanes move over: the rows,
// the default look, normaliseLegacy, the ribbon gifts, the crown against every hair colour, and every word. Deleted
// with wardrobe-legacy.ts (docs/v4/2.3.md Part 2, section 9).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Ribbon } from '../src/contracts';
import {
  EYE_HEX, GIFT_ORDER, HAIR_HEX, LEGACY_DEFAULT as DEFAULT_LOOK, LEGACY_ROWS as LOOK_ROWS, RIBBON_HEX, legacyClipIds as wardrobeClipIds,
  nextLegacyRibbon as nextRibbon, normaliseLegacy as normaliseLook, type LegacyLook as PrincessLook, type LegacyRow as LookRow,
} from '../src/wardrobe-legacy';
import { SENTENCES } from '../tools/lines';

const v3Audio = resolve(import.meta.dirname, '../../moon-meadow-home/public/audio');
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'];
/** v3's ok clips with their text. */
const v3Ok = new Map<string, string>();
for (const pack of V3_PACKS) {
  const clips = (JSON.parse(readFileSync(join(v3Audio, pack, 'manifest.json'), 'utf8')) as {
    clips: Record<string, { ok?: boolean; file?: string; text: string }>;
  }).clips;
  for (const [id, c] of Object.entries(clips)) if (c.ok === true && c.file && existsSync(join(v3Audio, pack, c.file))) v3Ok.set(id, c.text);
}

const ROWS: LookRow[] = ['hair', 'eyes', 'gown', 'style', 'thing'];
const words = LOOK_ROWS.flatMap((r) => r.options.flatMap((o) => (o.word ? [o.word] : [])));

/** Vowel groups, less a silent final e. Good enough for short words. */
function syllables(w: string): number {
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  return groups > 1 && /[^aeiou]e$/.test(w) ? groups - 1 : groups;
}

/** Hue (degrees) and lightness (0 to 1) of a #rrggbb colour. */
function hsl(hex: string): { h: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, l: (max + min) / 2 };
}
const CROWN = '#f5a623';

describe('wardrobe rows', () => {
  it('has five rows in Emma\'s order, at most six options each, unique ids, today\'s look first', () => {
    expect(LOOK_ROWS.map((r) => r.row)).toEqual(ROWS);
    for (const r of LOOK_ROWS) {
      const ids = r.options.map((o) => o.id);
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(ids.length).toBeLessThanOrEqual(6);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids[0]).toBe(DEFAULT_LOOK[r.row]);
      for (const o of r.options) for (const c of o.swatch) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('takes the hair and eye colours from the palettes', () => {
    const hair = LOOK_ROWS.find((r) => r.row === 'hair')!;
    expect(hair.options.map((o) => o.id)).toEqual(Object.keys(HAIR_HEX));
    expect(HAIR_HEX.sunny).toEqual({ base: '#ffdf86', light: '#fff0b8' });
    expect(HAIR_HEX.rainbow.bands).toHaveLength(6);
    const eyes = LOOK_ROWS.find((r) => r.row === 'eyes')!;
    expect(eyes.options.map((o) => [o.id, o.swatch[0]])).toEqual(Object.entries(EYE_HEX));
    expect(EYE_HEX.blue).toBe('#4f8fe0');
  });

  it('keeps every hair colour apart from Lumi\'s crown in lightness or hue', () => {
    const crown = hsl(CROWN);
    for (const [id, h] of Object.entries(HAIR_HEX)) {
      // The crown rests on the cap (the base colour); rainbow's bands run down the tails.
      for (const c of [h.base, ...(h.bands ?? [])]) {
        const x = hsl(c);
        const hueGap = Math.min(Math.abs(x.h - crown.h), 360 - Math.abs(x.h - crown.h));
        expect(Math.abs(x.l - crown.l) >= 0.15 || hueGap >= 15, `${id} ${c}`).toBe(true);
      }
    }
  });
});

describe('look words', () => {
  it('prints only words of one syllable and at most five letters', () => {
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.print).toMatch(/^[a-z]{1,5}$/);
      expect(syllables(w.print), w.print).toBe(1);
    }
  });

  it('has an ok v3 clip or a new line for every word, and the clip says the printed word', () => {
    const own = new Map(SENTENCES.map((l) => [l.id, l.text]));
    for (const w of words) {
      const text = v3Ok.get(w.clip) ?? own.get(w.clip);
      expect(text, w.clip).toBeDefined();
      expect(text!.toLowerCase().replace(/[^a-z]/g, '')).toBe(w.print);
    }
  });

  it('lists every word clip once', () => {
    const ids = wardrobeClipIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(words.map((w) => w.clip)));
  });
});

describe('normaliseLook', () => {
  it('gives the default look for junk', () => {
    for (const junk of [null, undefined, 5, 'sunny', [], {}, { hair: 7 }]) expect(normaliseLook(junk)).toEqual(DEFAULT_LOOK);
  });

  it('keeps known ids and falls back per field', () => {
    const look: PrincessLook = { hair: 'rainbow', eyes: 'violet', gown: 'tutu', style: 'bun', thing: 'hearts', ribbon: 'mint' };
    expect(normaliseLook(look)).toEqual(look);
    expect(normaliseLook({ ...look, gown: 'cape', extra: 1 })).toEqual({ ...look, gown: 'rose' });
    expect(normaliseLook({ eyes: 'green' })).toEqual({ ...DEFAULT_LOOK, eyes: 'green' });
    expect(normaliseLook({ eyes: 'red', ribbon: 'gold' }, look)).toEqual({ ...look, ribbon: 'gold' });
  });

  it('returns a new object, never the default itself', () => {
    const a = normaliseLook(null);
    a.hair = 'candy';
    expect(DEFAULT_LOOK.hair).toBe('sunny');
  });
});

describe('ribbons', () => {
  it('starts with pink and gives the other five in gift order', () => {
    expect(Object.keys(RIBBON_HEX)).toEqual(['pink', ...GIFT_ORDER]);
    expect(GIFT_ORDER).toEqual(['lilac', 'sky', 'mint', 'gold', 'coral']);
    expect(RIBBON_HEX.pink).toBe('#ff5c9d');
    expect(RIBBON_HEX.lilac).toBe('#a77bff');
  });

  it('gives the first colour she does not own, then the one after hers', () => {
    expect(nextRibbon(DEFAULT_LOOK, ['pink'])).toBe('lilac');
    expect(nextRibbon(DEFAULT_LOOK, [])).toBe('lilac');
    expect(nextRibbon(DEFAULT_LOOK, ['pink', 'lilac', 'mint'])).toBe('sky');
    const all: Ribbon[] = ['pink', ...GIFT_ORDER];
    expect(nextRibbon({ ...DEFAULT_LOOK, ribbon: 'mint' }, all)).toBe('gold');
    expect(nextRibbon({ ...DEFAULT_LOOK, ribbon: 'coral' }, all)).toBe('pink');
  });
});
