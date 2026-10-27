// Princess Emma's wardrobe (docs/v4/2.2.md 2.5): the five rows in Emma's order, each option's id, swatch colours and
// word, her default look and the ribbon colours. Shared by every lane, like layout.ts: the ui draws the swatches from
// it, the actors take the hair and eye colours, the game saves the ids. The 3D shapes live in src/actors/.
import type { EyeColour, Gown, HairColour, LookRow, PrincessLook, Ribbon } from './contracts.ts';

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
export type LookRowSpec = { [R in LookRow]: { row: R; options: readonly LookOption<PrincessLook[R]>[] } }[LookRow];

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
export const HAIR_HEX: Record<HairColour, HairHex> = {
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
export const GOWN_SHAPE: Record<Gown, 'party' | 'ball' | 'tutu'> = {
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
const hair = (id: HairColour): LookOption<HairColour> => {
  const h = HAIR_HEX[id];
  return { id, swatch: h.bands ?? [h.base, h.light] };
};

/** The rows in Emma's order. The first option of every row is today's Princess Emma. */
export const LOOK_ROWS: readonly LookRowSpec[] = [
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
      { id: 'plaits', swatch: [], word: word('braid') },
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

/** Today's Princess Emma. */
export const DEFAULT_LOOK: Readonly<PrincessLook> = Object.freeze({
  hair: 'sunny',
  eyes: 'blue',
  gown: 'rose',
  style: 'ponytails',
  thing: 'bows',
  ribbon: 'pink',
});

const idsOf = (row: LookRow): readonly string[] => LOOK_ROWS.find((r) => r.row === row)!.options.map((o) => o.id);

/** A look from anything (a save, a URL option): each unknown or missing field falls back to `base`. */
export function normaliseLook(raw: unknown, base: PrincessLook = DEFAULT_LOOK): PrincessLook {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const field = <K extends keyof PrincessLook>(k: K, ids: readonly string[]): PrincessLook[K] => {
    const v = r[k];
    return (typeof v === 'string' && ids.includes(v) ? v : base[k]) as PrincessLook[K];
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
export function nextRibbon(look: PrincessLook, owned: readonly Ribbon[]): Ribbon {
  const gift = GIFT_ORDER.find((r) => !owned.includes(r));
  if (gift) return gift;
  return RIBBONS[(RIBBONS.indexOf(look.ribbon) + 1) % RIBBONS.length];
}

/** The word clip of every option, each once. The part's own lines are CLIPS.ready, lookTap, readyPlay and lovely. */
export function wardrobeClipIds(): string[] {
  const ids = LOOK_ROWS.flatMap((r) => r.options.flatMap((o) => (o.word ? [o.word.clip] : [])));
  return [...new Set(ids)];
}
