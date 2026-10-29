// The phrase wish (docs/v4/2.3.md sections 6 and 18): "the", a colour and a thing, at the Dressing Corner gate. The
// unit is the phrase, and she must read past the first letter of both words: gr against go, bl against br, sock
// against shirt, bow against bead. "the" is printed in every phrase and never decides an answer.
//
// The colours, the things and "the" come from data.json, checked against v3 by tools/build-content.ts. A pair plays
// only when its tinted picture passed the picture check (tools/phrase-check.json): in the live game every ok pair of
// the file, Claude's checks too, minus each pair crossed on check.html on her iPad (phrase-device.ts). ?phrases=emma
// keeps the 2.3.0 rule (only the pairs Emma has checked), ?phrases=all every ok pair whatever the iPad holds. With
// fewer than 6 strong phrases the gate plays two dress-up word wishes instead (gateKind, and planWish in
// game/moments.ts).
//
// The basket is a two by two grid plus one:
//   level 1 (4 items): {colour, a target colour of another first letter} x {thing, its partner}. The colours differ
//     at the first letter, the things after it, so a reader of both first letters is right half the time.
//   level 2 (5 items): {colour, its sibling} x {thing, its partner}, plus red or pink on one of the two things, at
//     random. On the target's thing every time, the thing shown three times would give the wish's thing away.
//   level 3 (5 items): the level 2 grid plus a third thing of the same first letter in one of the two colours. Sock
//     and shirt have no third thing, so they play and log as level 2.
// Every grid item is a strong phrase itself, so any grid item can be the wish and none can be ruled out; only the
// fifth item of levels 2 and 3 is never the wish.
import type { Colour, WishDecoy, WishItem, WishSpec } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import { PALETTE } from '../wardrobe.ts';
import { DATA, type PhraseColourData, type PhraseThingData, type PhraseWordData } from './data.ts';
import { type DeviceChecks, type PhraseRule, checkedPairs, readDeviceChecks } from './phrase-device.ts';
import { WISH_CLIPS, type WishOpts } from './wishes.ts';
import { type Rand, pick, shuffle } from './rand.ts';

export type PhraseColour = 'green' | 'gold' | 'blue' | 'brown' | 'red' | 'pink';
export type PhraseThing = 'bag' | 'bead' | 'bow' | 'sock' | 'shirt';
export type PhraseLevel = 1 | 2 | 3;

/** The checked colours and things a phrase is made of (data.json, or a test's own). */
export interface PhraseTables {
  colours: readonly PhraseColourData[];
  things: readonly PhraseThingData[];
}

/** Fewer strong phrases than this and the gate plays word wishes (section 18). tools/build-content.ts warns by it. */
export const MIN_PHRASES = 6;

// data.json may be an older one while tools/build-content.ts rebuilds it, so nothing here reads it at load time.
const TABLES = (): PhraseTables => ({ colours: DATA.phraseColours ?? [], things: DATA.phraseThings ?? [] });
const THE = (): Pick<PhraseWordData, 'word' | 'gpcs'> => DATA.phraseThe ?? { word: 'the', gpcs: ['th', 'e'] };
/** The clip a tap on the printed "the" says (v3's word-the, checked by the build). ui/wish.ts has it too (tested). */
export const theClip = (): string => DATA.phraseThe?.clip ?? 'word-the';

/** The phrase's key, the log word and the picture check key: "green sock". */
export const phraseKey = (c: string, t: string): string => `${c} ${t}`;
const splitKey = (k: string): [string, string] => k.split(' ') as [string, string];
/** The phrase's clip ("The green sock."), a line in tools/lines.ts until gen.sh has made it. */
export const phraseClip = (c: string, t: string): string => `phrase-${c}-${t}`;

const first = (w: string): string => w[0];
const colourOf = (t: PhraseTables, c: string): PhraseColourData | undefined => t.colours.find((x) => x.word === c);
const thingOf = (t: PhraseTables, x: string): PhraseThingData | undefined => t.things.find((y) => y.word === x);
const alike = (t: PhraseTables, a: string, b: string): boolean =>
  a === b || !!thingOf(t, a)?.alike?.includes(b) || !!thingOf(t, b)?.alike?.includes(a);

/** Target colours with the same first letter (green and gold, blue and brown). */
const siblings = (t: PhraseTables, c: string): string[] =>
  t.colours.filter((x) => x.target && x.word !== c && first(x.word) === first(c)).map((x) => x.word);
/** Target colours of another first letter: the level 1 pairing. */
const others = (t: PhraseTables, c: string): string[] =>
  t.colours.filter((x) => x.target && first(x.word) !== first(c)).map((x) => x.word);
/** Things of the same first letter from another look-alike group (bag: bead, bow; sock: shirt). */
const partners = (t: PhraseTables, x: string): string[] =>
  t.things.filter((y) => first(y.word) === first(x) && !alike(t, y.word, x)).map((y) => y.word);
/** The decoy-only colours (red, pink). */
const decoyColours = (t: PhraseTables): string[] => t.colours.filter((x) => !x.target).map((x) => x.word);

type Grid = [string, string];
/** The other colour and thing of every grid around (c, x) whose four items are all in `s`. */
function grids(t: PhraseTables, s: ReadonlySet<string>, c: string, x: string, colours: string[]): Grid[] {
  if (!s.has(phraseKey(c, x))) return [];
  return colours.flatMap((c2) => partners(t, x)
    .filter((x2) => s.has(phraseKey(c2, x)) && s.has(phraseKey(c, x2)) && s.has(phraseKey(c2, x2)))
    .map((x2): Grid => [c2, x2]));
}
const level1Grids = (t: PhraseTables, s: ReadonlySet<string>, c: string, x: string) => grids(t, s, c, x, others(t, c));
const level2Grids = (t: PhraseTables, s: ReadonlySet<string>, c: string, x: string) => grids(t, s, c, x, siblings(t, c));
/** Red or pink on a thing, as far as the pictures passed the check: the level 2 fifth item. */
const decoysOn = (t: PhraseTables, allowed: ReadonlySet<string>, x: string): string[] =>
  decoyColours(t).filter((d) => allowed.has(phraseKey(d, x)));
/** The level 2 grids whose two things both have red or pink, so the decoy can go on either thing. */
const decoyGrids = (t: PhraseTables, s: ReadonlySet<string>, allowed: ReadonlySet<string>, c: string, x: string): Grid[] =>
  decoysOn(t, allowed, x).length ? level2Grids(t, s, c, x).filter(([, x2]) => decoysOn(t, allowed, x2).length > 0) : [];
/** A third thing of the first letter in one of the grid's colours: the level 3 fifth item. */
const fifthsOf = (t: PhraseTables, allowed: ReadonlySet<string>, [c, x]: Grid, [c2, x2]: Grid): Grid[] =>
  partners(t, x).filter((x3) => x3 !== x2 && !alike(t, x3, x2))
    .flatMap((x3) => [c, c2].filter((y) => allowed.has(phraseKey(y, x3))).map((y): Grid => [y, x3]));

/**
 * The strong phrases among the pairs that passed the picture check (section 18): a target colour with a sibling, a
 * thing with a partner, and a basket at level 1 and at level 2 whose grid items are all strong themselves, with red or
 * pink passed by the check on both of the level 2 grid's things. It removes phrases until every one left keeps its
 * baskets, so every grid item of every basket is a phrase the wish can ask for. In table order (colour, then thing).
 */
export function strongPhrases(t: PhraseTables, allowed: ReadonlySet<string>): string[] {
  let s = new Set(t.colours.filter((c) => c.target && siblings(t, c.word).length)
    .flatMap((c) => t.things.filter((x) => partners(t, x.word).length).map((x) => phraseKey(c.word, x.word)))
    .filter((k) => allowed.has(k)));
  for (;;) {
    const next = new Set([...s].filter((k) => {
      const [c, x] = splitKey(k);
      return level1Grids(t, s, c, x).length > 0 && decoyGrids(t, s, allowed, c, x).length > 0;
    }));
    if (next.size === s.size) return [...next];
    s = next;
  }
}

/**
 * Which pairs a play may use: who checked each ok pair (data.json, or a test's own), Emma's verdicts on this device,
 * and the rule of ?phrases= (phrase-device.ts).
 */
export interface PhraseScope {
  /**
   * 'default' (the live game): every ok pair minus this device's crosses. 'emma' (?phrases=emma): only Emma's checks.
   * 'all' (?phrases=all, the flows and dev): every ok pair; the device's verdicts do not count.
   */
  rule?: PhraseRule;
  /** The ok pairs and who checked them; data.json's by default. */
  pairs?: Readonly<Record<string, string>>;
  /** The colours and things; data.json's by default. */
  tables?: PhraseTables;
  /** Emma's verdicts from check.html: a cross turns a pair off, a tick checks it for 'emma'. This device's by default. */
  device?: DeviceChecks;
}

/** The pairs (keys) the scope allows, by its rule over the file's ok pairs and this device's verdicts. */
export function allowedPairs(o: PhraseScope = {}): Set<string> {
  const rule = o.rule ?? 'default';
  return checkedPairs(o.pairs ?? DATA.phrasePairs ?? {}, rule === 'all' ? {} : (o.device ?? readDeviceChecks()), rule);
}

const strongCache = new Map<string, string[]>();
/** The phrases a wish can ask for in this scope, the same at every level. */
export function phraseTargets(o: PhraseScope = {}): string[] {
  const allowed = allowedPairs(o);
  if (o.tables || o.pairs) return strongPhrases(o.tables ?? TABLES(), allowed);
  const key = [...allowed].sort().join(',');
  if (!strongCache.has(key)) strongCache.set(key, strongPhrases(TABLES(), allowed));
  return strongCache.get(key)!;
}

/** What the Dressing Corner's gate plays: phrase wishes, or two dress-up word wishes while fewer than 6 are strong. */
export function gateKind(o: PhraseScope = {}): 'phrase' | 'word' {
  return phraseTargets(o).length >= MIN_PHRASES ? 'phrase' : 'word';
}

const wordPart = (w: Pick<PhraseWordData, 'word' | 'gpcs' | 'sounds'>) => ({ word: w.word, gpcs: [...w.gpcs], ...(w.sounds ? { sounds: [...w.sounds] } : {}) });

/** The basket item of a phrase: its thing's picture in the colour's picture tint, worn on the baby's head. */
export function phraseItem(c: string, x: string, t: PhraseTables = TABLES()): WishItem {
  const cw = colourOf(t, c);
  const tw = thingOf(t, x);
  if (!cw || !tw) throw new Error(`phraseItem: no data for ${c} ${x}`);
  return {
    word: phraseKey(c, x),
    gpcs: [...cw.gpcs, ...tw.gpcs],
    pic: wordPic(tw.pic),
    tint: PALETTE[c as Colour]?.pic ?? '#ffffff',
    clip: phraseClip(c, x),
    // The phrase tier is the higher of the colour's and the thing's, for the log.
    tier: Math.max(cw.tier, tw.tier) as WishItem['tier'],
    react: 'wear',
    parts: [wordPart(THE()), wordPart(cw), wordPart(tw)],
  };
}

export interface PhraseOpts extends WishOpts, PhraseScope {}

/**
 * A phrase wish at its own level (save.phrases; default 2). The target is a strong phrase not in `exclude` while one
 * is left (the last play's and today's targets). Level 3 without a third thing plays and logs as level 2.
 */
export function phraseSpec(rand: Rand, o: PhraseOpts = {}): WishSpec {
  const t = o.tables ?? TABLES();
  const allowed = allowedPairs(o);
  const strong = phraseTargets(o);
  if (!strong.length) throw new Error('phraseSpec: no strong phrase in this scope (the gate plays word wishes)');
  const s = new Set(strong);
  const out = new Set(o.exclude ?? []);
  const fresh = strong.filter((k) => !out.has(k));
  const [c, x] = splitKey(pick(rand, fresh.length ? fresh : strong));
  let level: PhraseLevel = o.level ?? 2;

  const items: Grid[] = [[c, x]];
  const decoys: Record<string, WishDecoy> = {};
  const add = (g: Grid, why: WishDecoy) => {
    items.push(g);
    decoys[phraseKey(g[0], g[1])] = why;
  };
  if (level === 1) {
    // The other colour differs at the first letter; the partner thing shares it.
    const [c2, x2] = pick(rand, level1Grids(t, s, c, x));
    add([c2, x], 'other');
    add([c, x2], 'onset');
    add([c2, x2], 'other');
  } else {
    const with3 = level2Grids(t, s, c, x).filter((g) => fifthsOf(t, allowed, [c, x], g).length);
    if (level === 3 && !with3.length) level = 2;
    const [c2, x2] = pick(rand, level === 3 ? with3 : decoyGrids(t, s, allowed, c, x));
    add([c2, x], 'onset');
    add([c, x2], 'onset');
    add([c2, x2], 'onset');
    if (level === 3) add(pick(rand, fifthsOf(t, allowed, [c, x], [c2, x2])), 'onset');
    else {
      // Red or pink on either thing at random, so the thing shown three times is the wish's thing only half the time.
      const on = pick(rand, [x, x2]);
      add([pick(rand, decoysOn(t, allowed, on)), on], 'other');
    }
  }
  const { again, ...v3Rule } = WISH_CLIPS.phrase;
  return {
    kind: 'phrase',
    target: phraseItem(c, x, t),
    basket: shuffle(rand, items).map(([y, z]) => phraseItem(y, z, t)),
    level,
    decoys,
    clips: o.contrast === false ? v3Rule : { ...v3Rule, again },
  };
}

/** Every pair of colour and thing, checked or not: the picture check's 30 entries and their clips. */
export function phraseCombos(t: PhraseTables = TABLES()): [string, string][] {
  return t.colours.flatMap((c) => t.things.map((x): [string, string] => [c.word, x.word]));
}

/** Every clip a phrase wish can say: every colour on every thing, "the" on a tap, and the wish's lines. */
export function allPhraseClipIds(): string[] {
  const ids = phraseCombos().map(([c, x]) => phraseClip(c, x));
  return [...new Set([...ids, theClip(), ...Object.values(WISH_CLIPS.phrase).flat()])];
}

/** Every letter sound the phrase hint can play: the colours' and things' sounds ("the" is never sounded). */
export function allPhraseGraphemes(t: PhraseTables = TABLES()): string[] {
  return [...new Set([...t.colours, ...t.things].flatMap((w) => w.sounds ?? w.gpcs))];
}
