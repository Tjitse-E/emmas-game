// Princess Emma's wardrobe (docs/v4/2.3.md section 15): one palette for every coloured part, the shapes of
// each part, the six tabs and their rails, her default look, what she owns at the start and the four gift sets.
// Shared by every lane, like layout.ts: the ui draws the swatches from it, the actors take the hex values, the game
// saves the ids. The 3D shapes live in src/actors/. A 2.2.0 look comes in once, through fromLegacy.
import type {
  Colour, CrownShape, Earrings, EyeColour, GiftItem, GiftSet, GownExtra, GownShape, HairColour, HairStyle, HairThing,
  LookField, LookTab, Necklace, Owned, OwnedField, PrincessLook, Ribbon, ShoeShape,
} from './contracts.ts';

/** What Elizabeth says when an option is picked (an ok v3 word clip or a line in tools/lines.ts), and its print. */
export interface LookWord {
  clip: string;
  /** The word in the pill, only when it is one syllable of at most five letters. */
  print?: string;
}

const said = (w: string): LookWord => ({ clip: `word-${w}` });
const word = (w: string): LookWord => ({ clip: `word-${w}`, print: w });

// ------------------------------------------------------------------------------------------------ the palette

/**
 * One palette colour for every part. Big areas (the gown) use light, base, deep and sash; small parts (hair things,
 * shoes, the crown, jewels) use `small`. `pic` is the multiply colour for v3's greyscale word pictures (the phrase
 * wish, from v3's own tint defaults where one exists); only the six phrase colours have one, because white, silver
 * and pale colours cannot be shown by multiply (geometry.ts safeTint).
 */
export interface PaletteColour {
  light: string;
  base: string;
  deep: string;
  sash: string;
  small: string;
  pic?: string;
  /** Rainbow: its six bands, light to the gown's tiers and the hair tubes. */
  bands?: readonly string[];
  word: LookWord;
}

const RAINBOW_BANDS = ['#ff9ccc', '#ffc49a', '#ffe98a', '#9fe8c2', '#9cd3ff', '#c4a6ff'] as const;

export const PALETTE: Record<Colour, PaletteColour> = {
  pink: { light: '#fff4f9', base: '#ffb7d8', deep: '#ff92c6', sash: '#f0609f', small: '#ff5c9d', pic: '#ff6fa8', word: word('pink') },
  red: { light: '#ffe3e5', base: '#ff8f99', deep: '#f25c6a', sash: '#ffc93a', small: '#e8404f', pic: '#e8505b', word: word('red') },
  orange: { light: '#fff0e2', base: '#ffc59a', deep: '#ffa04d', sash: '#ff7a9c', small: '#ff8a2e', word: said('orange') },
  gold: { light: '#fff8e0', base: '#f6c86c', deep: '#ecb238', sash: '#ff8fbd', small: '#ffb62e', pic: '#f2b233', word: word('gold') },
  green: { light: '#effcf3', base: '#a4e3b2', deep: '#6fd08f', sash: '#ff8fbd', small: '#3fb36b', pic: '#6cc070', word: word('green') },
  blue: { light: '#eef6ff', base: '#bfe2ff', deep: '#92c9ff', sash: '#ff8fbd', small: '#4f9dff', pic: '#5aa9e6', word: word('blue') },
  lilac: { light: '#faf5ff', base: '#d9c6ff', deep: '#bfa0ff', sash: '#ffb62e', small: '#a77bff', word: said('lilac') },
  purple: { light: '#f3eaff', base: '#c9a2f2', deep: '#9b5de5', sash: '#ffc93a', small: '#8a4fd8', word: said('purple') },
  white: { light: '#ffffff', base: '#f8f6ff', deep: '#e4e0f0', sash: '#ff8fbd', small: '#ffffff', word: word('white') },
  silver: { light: '#f6f8ff', base: '#e2e6f2', deep: '#c6cddf', sash: '#ff8fbd', small: '#b8c2d8', word: said('silver') },
  brown: { light: '#f4e6da', base: '#c9a07e', deep: '#9a6a48', sash: '#ffc93a', small: '#7a4e33', pic: '#a8754f', word: word('brown') },
  rainbow: {
    light: '#fffaf4', base: '#ffe79a', deep: '#b8dcff', sash: '#d6c2ff', small: '#ff9ccc', bands: RAINBOW_BANDS, word: said('rainbow'),
  },
};

/** The palette in rail order: two rails of six. */
export const COLOURS: readonly Colour[] = ['pink', 'red', 'orange', 'gold', 'green', 'blue', 'lilac', 'purple', 'white', 'silver', 'brown', 'rainbow'];

/**
 * Hair colours (base and light): the six natural shades, then the palette. Each reaches the cap, the fringe, the side
 * locks, the tubes, the plait lobes and the bun. Rainbow has a cream cap; its tubes fade through `bands` and its four
 * fringe puffs take `fringe`. Natural shades have no word (as in 2.2); palette colours say their name.
 */
export interface HairHex {
  base: string;
  light: string;
  bands?: readonly string[];
  fringe?: readonly string[];
}
export const HAIR_HEX: Record<HairColour, HairHex> = {
  sunny: { base: '#ffdf86', light: '#fff0b8' },
  honey: { base: '#e9b860', light: '#f7d99c' },
  strawberry: { base: '#f9b08a', light: '#ffd6bd' },
  auburn: { base: '#b4562f', light: '#dd8c62' },
  chestnut: { base: '#9a6142', light: '#c99a72' },
  // A soft black, so the bands and the rim still show at night.
  midnight: { base: '#3d3346', light: '#6f6180' },
  pink: { base: '#ff9ccc', light: '#ffd3ea' },
  red: { base: '#e8505b', light: '#ff9aa2' },
  orange: { base: '#ff9a3d', light: '#ffc690' },
  gold: { base: '#f2b233', light: '#fbd77e' },
  green: { base: '#5cc27a', light: '#a9e8bb' },
  blue: { base: '#5fa8ff', light: '#b2d6ff' },
  lilac: { base: '#c4a6ff', light: '#e3d6ff' },
  purple: { base: '#9b5de5', light: '#c9a7f2' },
  white: { base: '#f6f3ee', light: '#ffffff' },
  silver: { base: '#c9d0de', light: '#eef1f7' },
  brown: { base: '#6e452b', light: '#a3765a' },
  rainbow: { base: '#fff0c8', light: '#fff0c8', bands: RAINBOW_BANDS, fringe: ['#ff9ccc', '#c4a6ff', '#9cd3ff', '#9fe8c2'] },
};
export const HAIR_COLOURS: readonly HairColour[] = ['sunny', 'honey', 'strawberry', 'auburn', 'chestnut', 'midnight', ...COLOURS];
const isColour = (c: string): c is Colour => (COLOURS as readonly string[]).includes(c);

/** Iris colours. The iris shader darkens the centre, so the pupil stays visible. No red or pink eyes. */
export const EYE_HEX: Record<EyeColour, string> = {
  blue: '#4f8fe0',
  green: '#3fa66a',
  brown: '#9a6238',
  hazel: '#b7832f',
  grey: '#7f93a6',
  violet: '#9a6cf0',
};

// ------------------------------------------------------------------------------------------------ the shapes

/** The dress shape of each gown cell (actors/shapes.ts): the gala gown is the ball gown with white gloves. */
export const GOWN_DRESS: Record<GownShape, 'party' | 'ball' | 'tutu'> = { party: 'party', ball: 'ball', gala: 'ball', tutu: 'tutu' };

/**
 * Every option of every field, in catalogue order. A rail shows the start items in this order and then the earned
 * ones in the order she earned them (ownedOptions), so a new one never moves a cell she knows. Do not read this as
 * the rail order of a look with earned items.
 */
export const OPTIONS: { readonly [F in LookField]: readonly PrincessLook[F][] } = {
  hair: HAIR_COLOURS,
  style: ['ponytails', 'high', 'plaits', 'bun', 'low', 'side', 'curly', 'bunches', 'long', 'curls', 'plait', 'lowbun'],
  eyes: ['blue', 'green', 'brown', 'hazel', 'grey', 'violet'],
  gown: ['party', 'ball', 'gala', 'tutu'],
  gownColour: COLOURS,
  extra: ['none', 'wings', 'bow'],
  crown: ['lumi', 'tiara', 'star', 'heart', 'flower'],
  crownColour: COLOURS,
  shoes: ['slippers', 'bows', 'boots', 'stars'],
  shoeColour: COLOURS,
  thing: ['bows', 'unicorn', 'flowers', 'stars', 'butterflies', 'hearts', 'shells', 'moons', 'daisies', 'cherries'],
  thingColour: COLOURS,
  earrings: ['none', 'studs', 'hearts', 'stars', 'drops'],
  necklace: ['none', 'pearls', 'heart'],
  jewelColour: COLOURS,
};

/** The colour fields: each takes the palette (hair also the natural shades), and picking one says its name. */
export const COLOUR_FIELDS: readonly LookField[] = ['hair', 'gownColour', 'crownColour', 'shoeColour', 'thingColour', 'jewelColour'];

/**
 * The word of a shape option, when it has one (ok v3 clips; word-heart is the demo's own). Shapes without a word stay
 * silent, as 2.2's styles did. Colours have theirs in PALETTE.
 */
const SHAPE_WORDS: { readonly [F in LookField]?: Partial<Record<PrincessLook[F], LookWord>> } = {
  // Eyes are not a palette field, but the three eye colours that are palette words say them (section 15).
  eyes: { blue: PALETTE.blue.word, green: PALETTE.green.word, brown: PALETTE.brown.word },
  gown: { party: word('dress'), ball: word('gown'), gala: word('gown') },
  extra: { wings: word('wings'), bow: word('bow') },
  style: { bun: word('bun'), lowbun: word('bun') },
  crown: { lumi: word('crown'), star: word('star'), heart: word('heart'), flower: said('flower') },
  shoes: { slippers: said('slippers'), bows: word('bows'), boots: word('boots'), stars: word('stars') },
  thing: {
    bows: word('bow'), flowers: word('clip'), stars: word('stars'), hearts: word('heart'), shells: said('shells'), moons: word('moon'),
    daisies: said('daisy'), cherries: said('cherry'),
  },
  earrings: { studs: said('earrings'), hearts: word('heart'), stars: word('stars'), drops: said('earrings') },
  necklace: { heart: word('heart') },
};

/** What Elizabeth says and prints when an option of a field is picked, or nothing. */
export function wordOf(field: LookField, id: string): LookWord | undefined {
  if (COLOUR_FIELDS.includes(field)) return isColour(id) ? PALETTE[id].word : undefined;
  return (SHAPE_WORDS[field] as Record<string, LookWord> | undefined)?.[id];
}

// ------------------------------------------------------------------------------------------------ tabs and rails

/** A rail holds at most six cells; a tab at most five rails (the panel's five rows of 100 design px). */
export const RAIL_CELLS = 6;
export const TAB_RAILS = 5;

/**
 * The six fixed tabs and the fields each one holds, in rail order. Earrings and the necklace sit on the eyes tab
 * (the face frame), because the sparkles tab cannot hold hair things, jewels and two colour runs in five rails.
 */
export const TABS: readonly { tab: LookTab; fields: readonly LookField[]; frame: 'body' | 'face' | 'feet' }[] = [
  { tab: 'hair', fields: ['style', 'hair'], frame: 'body' },
  { tab: 'eyes', fields: ['eyes', 'earrings', 'necklace', 'jewelColour'], frame: 'face' },
  { tab: 'gown', fields: ['gown', 'extra', 'gownColour'], frame: 'body' },
  { tab: 'crown', fields: ['crown', 'crownColour'], frame: 'body' },
  { tab: 'shoes', fields: ['shoes', 'shoeColour'], frame: 'feet' },
  { tab: 'sparkles', fields: ['thing', 'thingColour'], frame: 'face' },
];

export interface RailSpec {
  field: LookField;
  ids: readonly string[];
  /** Its row on the panel, 0 to 4. A field always keeps the same rows, so a rail never moves under her finger. */
  row: number;
}

const isOwnedField = (f: LookField): f is OwnedField => (OWNED_FIELDS as readonly string[]).includes(f);

/**
 * A field's options she owns, in rail order. Fields that are not earned are all hers. An earned field shows 'none'
 * (when it has one), then its start items in catalogue order, then what she earned in the order she earned it, so a
 * new item always lands after every cell she knows, whatever order the gifts come in.
 */
export function ownedOptions(field: LookField, owned: Owned): readonly string[] {
  const all = OPTIONS[field] as readonly string[];
  if (!isOwnedField(field)) return all;
  const mine = (owned[field] as readonly string[]).filter((id) => id !== 'none' && all.includes(id));
  const start = START_OWNED[field] as readonly string[];
  const first = all.filter((id) => id === 'none' || (start.includes(id) && mine.includes(id)));
  return [...first, ...new Set(mine.filter((id) => !start.includes(id)))];
}

/** The rows a field always takes on its tab: enough for every option it has, owned or not. */
export const fieldRows = (field: LookField): number => Math.ceil(OPTIONS[field].length / RAIL_CELLS);

/** She owns an earring or a necklace, so the jewel colour changes something she can see. */
const ownsJewel = (owned: Owned): boolean => owned.earrings.length > 0 || owned.necklace.length > 0;

/**
 * The rails of a tab for what she owns. Each field has fixed rows (fieldRows, in the tab's field order), and its owned
 * options fill them in rails of six; a row it does not fill stays empty, so an earned item or rail never moves a cell
 * she knows. A field whose only option is 'none' shows no rail, and the jewel colour shows only once she owns a jewel.
 */
export function railsOf(tab: LookTab, owned: Owned): RailSpec[] {
  const spec = TABS.find((t) => t.tab === tab)!;
  const out: RailSpec[] = [];
  let row = 0;
  for (const field of spec.fields) {
    const ids = ownedOptions(field, owned);
    const shown = !(ids.length === 1 && ids[0] === 'none') && (field !== 'jewelColour' || ownsJewel(owned));
    if (shown) for (let i = 0; i < ids.length; i += RAIL_CELLS) out.push({ field, ids: ids.slice(i, i + RAIL_CELLS), row: row + i / RAIL_CELLS });
    row += fieldRows(field);
  }
  return out;
}

/** The tab a field is on. */
export function tabOf(field: LookField): LookTab {
  return TABS.find((t) => t.fields.includes(field))!.tab;
}

// ------------------------------------------------------------------------------------------------ her look and what she owns

/** Today's Princess Emma: 2.2's default look in 2.3's terms. */
export const DEFAULT_LOOK: Readonly<PrincessLook> = Object.freeze({
  hair: 'sunny',
  style: 'ponytails',
  eyes: 'blue',
  gown: 'party',
  gownColour: 'pink',
  extra: 'none',
  crown: 'lumi',
  crownColour: 'gold',
  shoes: 'slippers',
  shoeColour: 'pink',
  thing: 'bows',
  thingColour: 'pink',
  earrings: 'none',
  necklace: 'none',
  jewelColour: 'gold',
});

export const OWNED_FIELDS: readonly OwnedField[] = ['crown', 'shoes', 'earrings', 'necklace', 'style', 'thing'];

/** What every player owns from the start: 2.2's styles and hair things, four new styles, Lumi's crown, slippers. */
export const START_OWNED: Readonly<Owned> = Object.freeze({
  crown: ['lumi'],
  shoes: ['slippers'],
  earrings: [],
  necklace: [],
  style: ['ponytails', 'high', 'plaits', 'bun', 'low', 'side', 'curly', 'bunches'],
  thing: ['bows', 'unicorn', 'flowers', 'stars', 'butterflies', 'hearts'],
});

/** The quests that pay a gift (game/options.ts QuestId). */
export type GiftQuest = 'picnic' | 'rack' | 'beads' | 'corner';

/** The four gift sets (2.3 section 5): 21 items, each set paid by one quest. */
export const GIFT_SETS: Readonly<Record<GiftSet, { quest: GiftQuest; items: readonly GiftItem[] }>> = {
  crowns: {
    quest: 'picnic',
    items: [{ field: 'crown', id: 'tiara' }, { field: 'crown', id: 'star' }, { field: 'crown', id: 'heart' }, { field: 'crown', id: 'flower' }],
  },
  shoes: { quest: 'rack', items: [{ field: 'shoes', id: 'bows' }, { field: 'shoes', id: 'boots' }, { field: 'shoes', id: 'stars' }] },
  jewels: {
    quest: 'beads',
    items: [
      { field: 'earrings', id: 'studs' }, { field: 'earrings', id: 'hearts' }, { field: 'earrings', id: 'stars' }, { field: 'earrings', id: 'drops' },
      { field: 'necklace', id: 'pearls' }, { field: 'necklace', id: 'heart' },
    ],
  },
  hair: {
    quest: 'corner',
    items: [
      { field: 'style', id: 'long' }, { field: 'style', id: 'curls' }, { field: 'style', id: 'plait' }, { field: 'style', id: 'lowbun' },
      { field: 'thing', id: 'shells' }, { field: 'thing', id: 'moons' }, { field: 'thing', id: 'daisies' }, { field: 'thing', id: 'cherries' },
    ],
  },
};

/** The set a quest pays from, or null. */
export function setOfQuest(quest: string): GiftSet | null {
  return (Object.keys(GIFT_SETS) as GiftSet[]).find((s) => GIFT_SETS[s].quest === quest) ?? null;
}

/**
 * The set a quest's gift comes from now: its own set while it has items left, else the set with the most items left
 * (the first in GIFT_SETS order on a tie), so a quest keeps paying after its set is full. Null when every set is full.
 */
export function giftSetFor(quest: string, owned: Owned): GiftSet | null {
  const own = setOfQuest(quest);
  if (own && stillToEarn(own, owned).length) return own;
  let best: GiftSet | null = null;
  for (const s of Object.keys(GIFT_SETS) as GiftSet[]) {
    const left = stillToEarn(s, owned).length;
    if (left && (!best || left > stillToEarn(best, owned).length)) best = s;
  }
  return best;
}

export const owns = (owned: Owned, item: GiftItem): boolean => (owned[item.field] as readonly string[]).includes(item.id);

/** A set's items she does not own yet, in set order. */
export function stillToEarn(set: GiftSet, owned: Owned): GiftItem[] {
  return GIFT_SETS[set].items.filter((i) => !owns(owned, i));
}

/** The one or two gifts a quest offers (she picks one), or none when its set is full. `rand` is the quest's stream. */
export function giftChoices(set: GiftSet, owned: Owned, rand: () => number): GiftItem[] {
  const left = stillToEarn(set, owned);
  if (left.length <= 2) return left;
  const a = Math.min(left.length - 1, Math.floor(rand() * left.length));
  const rest = left.filter((_, i) => i !== a);
  const b = Math.min(rest.length - 1, Math.floor(rand() * rest.length));
  return [left[a], rest[b]];
}

/** Owned with one more item (once). */
export function withItem(owned: Owned, item: GiftItem): Owned {
  const next = copyOwned(owned);
  if (!owns(next, item)) (next[item.field] as string[]).push(item.id);
  return next;
}

export function copyOwned(o: Owned): Owned {
  return { crown: [...o.crown], shoes: [...o.shoes], earrings: [...o.earrings], necklace: [...o.necklace], style: [...o.style], thing: [...o.thing] };
}

/** What she owns, from anything (a save): the start items always, then every known id once, in the order given. */
export function parseOwned(raw: unknown): Owned {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = copyOwned(START_OWNED);
  for (const f of OWNED_FIELDS) {
    const list = Array.isArray(r[f]) ? (r[f] as unknown[]) : [];
    for (const id of list) {
      if (typeof id === 'string' && id !== 'none' && (OPTIONS[f] as readonly string[]).includes(id) && !(out[f] as string[]).includes(id)) {
        (out[f] as string[]).push(id);
      }
    }
  }
  return out;
}

/**
 * A look from anything (a save, a URL option): each unknown or missing field falls back to `base`, and then to the
 * default look. With `owned`, an earned item she does not own falls back too (also one in `base`), so a look never
 * shows what is not in her trunk. The default look holds only start items, which she always owns.
 */
export function normaliseLook(raw: unknown, base: PrincessLook = DEFAULT_LOOK, owned?: Owned): PrincessLook {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const wearable = (f: LookField, v: unknown): v is string =>
    typeof v === 'string' && (OPTIONS[f] as readonly string[]).includes(v) &&
    (!owned || !isOwnedField(f) || v === 'none' || (owned[f] as readonly string[]).includes(v));
  const out = {} as Record<LookField, string>;
  for (const f of Object.keys(OPTIONS) as LookField[]) out[f] = [r[f], base[f]].find((v) => wearable(f, v)) ?? DEFAULT_LOOK[f];
  return out as unknown as PrincessLook;
}

// ------------------------------------------------------------------------------------------------ a 2.2 save

/** 2.2's gowns as a shape, a colour and an extra. */
const LEGACY_GOWN: Record<string, Pick<PrincessLook, 'gown' | 'gownColour' | 'extra' | 'shoeColour'>> = {
  rose: { gown: 'party', gownColour: 'pink', extra: 'none', shoeColour: 'pink' },
  rainbow: { gown: 'party', gownColour: 'rainbow', extra: 'none', shoeColour: 'pink' },
  lilac: { gown: 'gala', gownColour: 'lilac', extra: 'bow', shoeColour: 'lilac' },
  moon: { gown: 'ball', gownColour: 'silver', extra: 'bow', shoeColour: 'pink' },
  fairy: { gown: 'party', gownColour: 'green', extra: 'wings', shoeColour: 'pink' },
  tutu: { gown: 'tutu', gownColour: 'blue', extra: 'none', shoeColour: 'blue' },
};

/** Lumi's goodnight ribbons as palette colours for her hair things. */
export const RIBBON_COLOUR: Record<Ribbon, Colour> = { pink: 'pink', lilac: 'lilac', sky: 'blue', mint: 'green', gold: 'gold', coral: 'orange' };

/**
 * A 2.2 look (the v1 save, mmw.save) in 2.3's terms: the same hair, eyes, style and hair thing, the gown as a shape,
 * a colour and an extra, the ribbon as the hair things' colour, candy hair as pink. Unknown fields keep the default.
 */
export function fromLegacy(raw: unknown): PrincessLook {
  const r = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '');
  const hair = str('hair') === 'candy' ? 'pink' : str('hair');
  const gown = LEGACY_GOWN[str('gown')] ?? {};
  const ribbon = str('ribbon') as Ribbon;
  return normaliseLook({ hair, eyes: str('eyes'), style: str('style'), thing: str('thing'), ...gown, thingColour: RIBBON_COLOUR[ribbon] }, DEFAULT_LOOK);
}

// ------------------------------------------------------------------------------------------------ goodnight ribbons

/** The goodnight gifts in the order Lumi gives them; pink is hers from the start. */
export const GIFT_ORDER: readonly Ribbon[] = ['lilac', 'sky', 'mint', 'gold', 'coral'];
const RIBBONS: readonly Ribbon[] = ['pink', ...GIFT_ORDER];

/**
 * Lumi's goodnight gift: the first ribbon in gift order she does not own yet. When she owns them all, the ribbon after
 * the one whose colour she wears on her hair things. The gift's colour goes on her hair things (setLook).
 */
export function nextRibbon(owned: readonly Ribbon[], wearing: Colour): Ribbon {
  const gift = GIFT_ORDER.find((r) => !owned.includes(r));
  if (gift) return gift;
  const at = RIBBONS.findIndex((r) => RIBBON_COLOUR[r] === wearing);
  return RIBBONS[(at + 1) % RIBBONS.length];
}

// ------------------------------------------------------------------------------------------------ the crown on her hair

/** WCAG relative luminance of '#rrggbb', 0 to 1. */
export function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** WCAG contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** The crown's outline must stand out this much from her hair. */
export const CROWN_CONTRAST = 1.8;
const OUTLINES = ['#ffffff', '#b8860b', '#5a3d8a'] as const;

/**
 * The colour of the crown's rim line and gems on this hair (2.2 kept white gems as the outline): white, else the
 * crown's own deep shade, else dark gold, else dark purple, whichever first stands out from the hair base by
 * CROWN_CONTRAST. The actors draw it; tests/wardrobe.test.ts checks every hair against every crown colour.
 */
export function crownOutline(hair: HairColour, crown: Colour): string {
  const h = HAIR_HEX[hair].base;
  const options = [OUTLINES[0], PALETTE[crown].deep, OUTLINES[1], OUTLINES[2]];
  return options.find((c) => contrast(c, h) >= CROWN_CONTRAST) ?? OUTLINES[2];
}

/** `a` moved towards `b` by t (0 to 1), as #rrggbb. */
function mixHex(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The colour her hair things are painted on this hair (2.3.0's last pass): the colour's small shade, or when it does
 * not stand out from the hair base by CROWN_CONTRAST (green bows on green hair vanished), that shade moved the least
 * towards a deep plum or towards white that does. Rainbow things keep their bands.
 */
export function thingShade(hair: HairColour, colour: Colour): string {
  const h = HAIR_HEX[hair].base;
  const c = PALETTE[colour].small;
  for (const t of [0, 0.25, 0.4, 0.55, 0.7, 0.85]) {
    for (const to of ['#3d2a55', '#ffffff']) {
      const m = mixHex(c, to, t);
      if (contrast(m, h) >= CROWN_CONTRAST) return m;
    }
  }
  return luminance(h) > 0.3 ? '#3d2a55' : '#ffffff';
}

// ------------------------------------------------------------------------------------------------ the log and the clips

/** Short keys for the look in a diag line (kind=look), so the line stays under results.ts DIAG_MAX. */
export const LOOK_KEYS: Record<LookField, string> = {
  hair: 'h', style: 'st', eyes: 'e', gown: 'g', gownColour: 'gc', extra: 'x', crown: 'c', crownColour: 'cc', shoes: 'sh',
  shoeColour: 'sc', thing: 't', thingColour: 'tc', earrings: 'er', necklace: 'nk', jewelColour: 'jc',
};

export function lookFields(look: PrincessLook): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of Object.keys(LOOK_KEYS) as LookField[]) out[LOOK_KEYS[f]] = look[f];
  return out;
}

/** Every clip the wardrobe can say: each colour's name and each shape's word, once. */
export function wardrobeClipIds(): string[] {
  const ids: string[] = COLOURS.map((c) => PALETTE[c].word.clip);
  for (const f of Object.keys(SHAPE_WORDS) as LookField[]) {
    for (const w of Object.values(SHAPE_WORDS[f] ?? {}) as LookWord[]) ids.push(w.clip);
  }
  return [...new Set(ids)];
}

// The id types, re-exported for lanes that only import this file.
export type { Colour, CrownShape, Earrings, GownExtra, GownShape, HairColour, HairStyle, HairThing, Necklace, ShoeShape };
