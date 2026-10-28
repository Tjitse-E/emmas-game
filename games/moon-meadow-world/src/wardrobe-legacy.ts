// The 2.2.0 wardrobe (docs/v4/2.2.md 2.5), kept only while the 2.3.0 lanes move to src/wardrobe.ts: the five rows,
// the 2.2 ids, swatch colours and words, and legacyOf(), which shows a 2.3 look in 2.2's terms so the 2.2 actor and
// customiser code keeps working on top of the 2.3 contracts. Every lane drops its imports from here; the integrator
// deletes this file when nothing imports it (docs/v4/2.3.md section 22).
import type { EyeColour, PrincessLook, Ribbon } from './contracts.ts';
import { fromLegacy } from './wardrobe.ts';

export type LegacyHairColour = 'sunny' | 'strawberry' | 'chestnut' | 'midnight' | 'candy' | 'rainbow';
export type LegacyGown = 'rose' | 'rainbow' | 'lilac' | 'moon' | 'fairy' | 'tutu';
export type LegacyStyle = 'ponytails' | 'high' | 'plaits' | 'bun';
export type LegacyThing = 'bows' | 'unicorn' | 'flowers' | 'stars' | 'butterflies' | 'hearts';
/** The 2.2.0 look (the v1 save holds it). */
export interface LegacyLook {
  hair: LegacyHairColour;
  eyes: EyeColour;
  gown: LegacyGown;
  style: LegacyStyle;
  thing: LegacyThing;
  ribbon: Ribbon;
}
/** The 2.2.0 customiser's five rows. */
export type LegacyRow = 'hair' | 'eyes' | 'gown' | 'style' | 'thing';

/** What Elizabeth says when an option is picked (an ok v3 word clip or a line in tools/lines.ts), and its print. */
export interface LookWord {
  clip: string;
  /** The word in the pill: one syllable, at most five letters. */
  print: string;
}

export interface LookOption<Id extends string = string> {
  id: Id;
  /**
   * The colours its swatch is drawn with. hair: base and light (rainbow: its six bands); eyes: the iris; gown: trim,
   * main, deep, sash (rainbow: trim, the four tier colours from the hem up, sash); style: none, it is drawn in her
   * hair colour; thing: its fixed colours, the rest is drawn in her ribbon colour.
   */
  swatch: readonly string[];
  word?: LookWord;
}

/** One row of the wardrobe. Checking `row` narrows the option ids. */
export type LookRowSpec = { [R in LegacyRow]: { row: R; options: readonly LookOption<LegacyLook[R]>[] } }[LegacyRow];

/**
 * Hair colours (base and light). Each reaches the cap, the fringe, the side locks, the tubes, the plait lobes and the
 * bun. No gold: Lumi's crown (#f5a623) would vanish against it. Rainbow has a cream cap; its tubes fade through
 * `bands` and its four fringe puffs take `fringe`.
 */
export interface HairHex {
  base: string;
  light: string;
  bands?: readonly string[];
  fringe?: readonly string[];
}
export const HAIR_HEX: Record<LegacyHairColour, HairHex> = {
  sunny: { base: '#ffdf86', light: '#fff0b8' },
  strawberry: { base: '#f9b08a', light: '#ffd6bd' },
  chestnut: { base: '#9a6142', light: '#c99a72' },
  // A soft black, so the bands and the rim still show at night.
  midnight: { base: '#3d3346', light: '#6f6180' },
  candy: { base: '#ff9ccc', light: '#ffd3ea' },
  rainbow: {
    base: '#fff0c8',
    light: '#fff0c8',
    bands: ['#ff9ccc', '#ffc49a', '#ffe98a', '#9fe8c2', '#9cd3ff', '#c4a6ff'],
    fringe: ['#ff9ccc', '#c4a6ff', '#9cd3ff', '#9fe8c2'],
  },
};

/** Iris colours. The iris shader darkens the centre, so the pupil stays visible. No red or pink eyes. */
export const EYE_HEX: Record<EyeColour, string> = {
  blue: '#4f8fe0',
  green: '#3fa66a',
  brown: '#9a6238',
  hazel: '#b7832f',
  grey: '#7f93a6',
  violet: '#9a6cf0',
};

/** The dress shape of each gown. The fairy dress is a party dress with wings. */
export const GOWN_SHAPE: Record<LegacyGown, 'party' | 'ball' | 'tutu'> = {
  rose: 'party',
  rainbow: 'party',
  lilac: 'ball',
  moon: 'ball',
  fairy: 'party',
  tutu: 'tutu',
};

/** Ribbon colours: pink is hers from the start, the rest are goodnight gifts. */
export const RIBBON_HEX: Record<Ribbon, string> = {
  pink: '#ff5c9d',
  lilac: '#a77bff',
  sky: '#5fb4ff',
  mint: '#3fc59a',
  gold: '#ffb62e',
  coral: '#ff7a6b',
};

/** The goodnight gifts in the order Lumi gives them. */
export const GIFT_ORDER: readonly Ribbon[] = ['lilac', 'sky', 'mint', 'gold', 'coral'];
const RIBBONS: readonly Ribbon[] = ['pink', ...GIFT_ORDER];

const word = (w: string): LookWord => ({ clip: `word-${w}`, print: w });
const hair = (id: LegacyHairColour): LookOption<LegacyHairColour> => {
  const h = HAIR_HEX[id];
  return { id, swatch: h.bands ?? [h.base, h.light] };
};

/** The rows in Emma's order. The first option of every row is today's Princess Emma. */
export const LEGACY_ROWS: readonly LookRowSpec[] = [
  {
    row: 'hair',
    options: (['sunny', 'strawberry', 'chestnut', 'midnight', 'candy', 'rainbow'] as const).map(hair),
  },
  {
    row: 'eyes',
    options: (['blue', 'green', 'brown', 'hazel', 'grey', 'violet'] as const).map((id) => ({ id, swatch: [EYE_HEX[id]] })),
  },
  {
    row: 'gown',
    options: [
      { id: 'rose', swatch: ['#fff4f9', '#ffb7d8', '#ff92c6', '#f0609f'], word: word('dress') },
      { id: 'rainbow', swatch: ['#fffaf4', '#ffc9a3', '#ffe79a', '#bdf0c8', '#b8dcff', '#d6c2ff'], word: word('dress') },
      { id: 'lilac', swatch: ['#faf5ff', '#d9c6ff', '#bfa0ff', '#ffb62e'], word: word('gown') },
      { id: 'moon', swatch: ['#f6f8ff', '#dfe6fa', '#c3cff0', '#ff8fbd'], word: word('gown') },
      { id: 'fairy', swatch: ['#f2fff8', '#c2f0da', '#96e0bd', '#ff8fbd'], word: word('wings') },
      { id: 'tutu', swatch: ['#ffffff', '#bfe2ff', '#92c9ff', '#ff8fbd'] },
    ],
  },
  {
    row: 'style',
    options: [
      { id: 'ponytails', swatch: [] },
      { id: 'high', swatch: [] },
      // No word: braid is the American word for a plait, and v3 has no plait clip.
      { id: 'plaits', swatch: [] },
      { id: 'bun', swatch: [], word: word('bun') },
    ],
  },
  {
    row: 'thing',
    options: [
      { id: 'bows', swatch: [], word: word('bow') },
      // White head, gold horn, closed eye and cheek; the mane puffs take the ribbon colour.
      { id: 'unicorn', swatch: ['#ffffff', '#ffc93a', '#4a2a35', '#ff9ccc'] },
      // Petals in the ribbon colour round a yellow centre, two green leaves (as v3's clip.webp).
      { id: 'flowers', swatch: ['#ffd23f', '#6cc070'], word: word('clip') },
      { id: 'stars', swatch: ['#ffc93a'], word: word('stars') },
      { id: 'butterflies', swatch: ['#4a2a35'] },
      { id: 'hearts', swatch: [], word: word('heart') },
    ],
  },
];

/** 2.2's Princess Emma. */
export const LEGACY_DEFAULT: Readonly<LegacyLook> = Object.freeze({
  hair: 'sunny',
  eyes: 'blue',
  gown: 'rose',
  style: 'ponytails',
  thing: 'bows',
  ribbon: 'pink',
});

const idsOf = (row: LegacyRow): readonly string[] => LEGACY_ROWS.find((r) => r.row === row)!.options.map((o) => o.id);

/** A look from anything (a save, a URL option): each unknown or missing field falls back to `base`. */
export function normaliseLegacy(raw: unknown, base: LegacyLook = LEGACY_DEFAULT): LegacyLook {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const field = <K extends keyof LegacyLook>(k: K, ids: readonly string[]): LegacyLook[K] => {
    const v = r[k];
    return (typeof v === 'string' && ids.includes(v) ? v : base[k]) as LegacyLook[K];
  };
  return {
    hair: field('hair', idsOf('hair')),
    eyes: field('eyes', idsOf('eyes')),
    gown: field('gown', idsOf('gown')),
    style: field('style', idsOf('style')),
    thing: field('thing', idsOf('thing')),
    ribbon: field('ribbon', RIBBONS),
  };
}

/**
 * Lumi's goodnight gift: the first colour in gift order she does not own yet. When she owns them all, the next one
 * after the colour she wears.
 */
export function nextLegacyRibbon(look: LegacyLook, owned: readonly Ribbon[]): Ribbon {
  const gift = GIFT_ORDER.find((r) => !owned.includes(r));
  if (gift) return gift;
  return RIBBONS[(RIBBONS.indexOf(look.ribbon) + 1) % RIBBONS.length];
}

/** The word clip of every option, each once. The part's own lines are CLIPS.ready, lookTap, readyPlay and lovely. */
export function legacyClipIds(): string[] {
  const ids = LEGACY_ROWS.flatMap((r) => r.options.flatMap((o) => (o.word ? [o.word.clip] : [])));
  return [...new Set(ids)];
}

// ---------------------------------------------------------------------------------------------------------------
// A 2.3 look in 2.2's terms (temporary)
// ---------------------------------------------------------------------------------------------------------------

/** The nearest 2.2 hair colour of every 2.3 hair colour. */
const HAIR_TO_LEGACY: Record<PrincessLook['hair'], LegacyHairColour> = {
  sunny: 'sunny', honey: 'sunny', strawberry: 'strawberry', auburn: 'strawberry', chestnut: 'chestnut', midnight: 'midnight',
  pink: 'candy', red: 'strawberry', orange: 'strawberry', gold: 'sunny', green: 'candy', blue: 'candy', lilac: 'candy',
  purple: 'candy', white: 'sunny', silver: 'sunny', brown: 'chestnut', rainbow: 'rainbow',
};
/** The nearest 2.2 ribbon of every palette colour. */
const COLOUR_TO_RIBBON: Record<PrincessLook['thingColour'], Ribbon> = {
  pink: 'pink', red: 'coral', orange: 'coral', gold: 'gold', green: 'mint', blue: 'sky', lilac: 'lilac', purple: 'lilac',
  white: 'pink', silver: 'sky', brown: 'gold', rainbow: 'pink',
};
const STYLE_TO_LEGACY: Record<PrincessLook['style'], LegacyStyle> = {
  ponytails: 'ponytails', high: 'high', plaits: 'plaits', bun: 'bun', low: 'ponytails', side: 'high', curly: 'ponytails',
  bunches: 'ponytails', long: 'ponytails', curls: 'high', plait: 'plaits', lowbun: 'bun',
};
const THING_TO_LEGACY: Record<PrincessLook['thing'], LegacyThing> = {
  bows: 'bows', unicorn: 'unicorn', flowers: 'flowers', stars: 'stars', butterflies: 'butterflies', hearts: 'hearts',
  shells: 'flowers', moons: 'stars', daisies: 'flowers', cherries: 'hearts',
};

/** The 2.2 gown nearest to a 2.3 gown shape, colour and extra. */
function legacyGown(look: PrincessLook): LegacyGown {
  if (look.extra === 'wings') return 'fairy';
  if (look.gown === 'tutu') return 'tutu';
  if (look.gown === 'gala') return 'lilac';
  if (look.gown === 'ball') return look.gownColour === 'lilac' || look.gownColour === 'purple' ? 'lilac' : 'moon';
  return look.gownColour === 'rainbow' ? 'rainbow' : 'rose';
}

/** A 2.3 look shown with 2.2's parts: the nearest 2.2 id of every field (temporary, see the file comment). */
export function legacyOf(look: PrincessLook): LegacyLook {
  return {
    hair: HAIR_TO_LEGACY[look.hair],
    eyes: look.eyes,
    gown: legacyGown(look),
    style: STYLE_TO_LEGACY[look.style],
    thing: THING_TO_LEGACY[look.thing],
    ribbon: COLOUR_TO_RIBBON[look.thingColour],
  };
}

/** A 2.2 row's pick on top of a 2.3 look (the step 0 adapter in ui/index.ts). */
export function applyLegacy(base: PrincessLook, l: LegacyLook, row: LegacyRow): PrincessLook {
  // A tap on the hair thing she wears changes its ribbon: the thing row carries both.
  const picked = row === 'thing' ? { thing: l.thing, ribbon: l.ribbon } : { [row]: l[row] };
  const next = fromLegacy({ ...legacyOf(base), ...picked });
  switch (row) {
    case 'hair':
      return { ...base, hair: next.hair };
    case 'eyes':
      return { ...base, eyes: next.eyes };
    case 'gown':
      return { ...base, gown: next.gown, gownColour: next.gownColour, extra: next.extra };
    case 'style':
      return { ...base, style: next.style };
    case 'thing':
      return { ...base, thing: next.thing, thingColour: next.thingColour };
  }
}

/** Every 2.2 row's pick on top of a 2.3 look. */
export function applyLegacyAll(base: PrincessLook, l: LegacyLook): PrincessLook {
  const same = (look: PrincessLook, row: LegacyRow) => l[row] === legacyOf(look)[row] && (row !== 'thing' || l.ribbon === legacyOf(look).ribbon);
  return (['hair', 'eyes', 'gown', 'style', 'thing'] as const).reduce((look, row) => (same(look, row) ? look : applyLegacy(look, l, row)), base);
}

/** The 2.3 field and tab of a 2.2 row. */
export const LEGACY_FIELD: Record<LegacyRow, 'hair' | 'eyes' | 'gown' | 'style' | 'thing'> = {
  hair: 'hair', eyes: 'eyes', gown: 'gown', style: 'style', thing: 'thing',
};
export const LEGACY_TAB: Record<LegacyRow, 'hair' | 'eyes' | 'gown' | 'sparkles'> = { hair: 'hair', eyes: 'eyes', gown: 'gown', style: 'hair', thing: 'sparkles' };
