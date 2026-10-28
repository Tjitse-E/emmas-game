// The phrase wish (docs/v4/2.3.md Part 2, section 5): "the", a colour and a thing, at the Dressing Corner gate. The
// unit is the phrase: a basket is a two by two grid of two colours with the same first letter times two things with
// the same first letter (level 1 lets one of the two pairs differ), so a child who reads only first letters picks
// right 1 time in 4 at levels 2 and 3. Only colours a tint can show are used; red and pink are decoys only.
//
// Step 0: the tables and a first planner, so the gate can run. The reading lane moves the tables behind the tinted
// picture check (tools/build-content.ts, tools/phrase-check.json), adds level 3 and the guesser tests.
import type { Colour, WishDecoy, WishItem, WishSpec } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import { PALETTE } from '../wardrobe.ts';
import { WISH_CLIPS, type WishOpts } from './wishes.ts';
import { type Rand, pick, shuffle } from './rand.ts';

/**
 * A printed word of a phrase: its written graphemes, its grapheme tier (1 phase2, 2 phase3-4, 3 year1) and, when they
 * differ from the graphemes, the letter sounds the hint plays (shared/audio/phonics keys).
 */
export interface PhraseWord {
  word: string;
  gpcs: string[];
  sounds?: string[];
  tier: 1 | 2 | 3;
}

/**
 * The phrase colours. Green, gold, blue and brown are targets (each has a sibling with the same first letter); red and
 * pink are decoys only. Green and blue are v3's tiers; gold and brown are not in v3's packs, so their tier comes from
 * their graphemes (ow is phase 3, the o of gold is year 1). The o of gold is written o and said oa.
 */
export const PHRASE_COLOURS: Record<'green' | 'gold' | 'blue' | 'brown' | 'red' | 'pink', PhraseWord & { target: boolean }> = {
  green: { word: 'green', gpcs: ['g', 'r', 'ee', 'n'], tier: 2, target: true },
  gold: { word: 'gold', gpcs: ['g', 'o', 'l', 'd'], sounds: ['g', 'oa', 'l', 'd'], tier: 3, target: true },
  blue: { word: 'blue', gpcs: ['b', 'l', 'ue'], tier: 3, target: true },
  brown: { word: 'brown', gpcs: ['b', 'r', 'ow', 'n'], tier: 2, target: true },
  red: { word: 'red', gpcs: ['r', 'e', 'd'], tier: 1, target: false },
  pink: { word: 'pink', gpcs: ['p', 'i', 'nk'], tier: 1, target: false },
};
export type PhraseColour = keyof typeof PHRASE_COLOURS;

/**
 * The phrase things: v3 greyscale word pictures that take a tint, with an ok Elizabeth clip, one syllable and at most
 * five letters, that a baby can wear on its head. Pairs share a first letter and do not look alike: bag, bead, bow and
 * sock, shirt. Cape and coat look alike (2.2's group), cup and mug are not worn, hat and dress have no partner.
 */
export const PHRASE_THINGS: Record<'bag' | 'bead' | 'bow' | 'sock' | 'shirt', PhraseWord> = {
  bag: { word: 'bag', gpcs: ['b', 'a', 'g'], tier: 1 },
  bead: { word: 'bead', gpcs: ['b', 'ea', 'd'], tier: 3 },
  // v3 writes bow as ['b', 'ow.oa']: written ow, said oa.
  bow: { word: 'bow', gpcs: ['b', 'ow'], sounds: ['b', 'oa'], tier: 3 },
  sock: { word: 'sock', gpcs: ['s', 'o', 'ck'], tier: 1 },
  shirt: { word: 'shirt', gpcs: ['sh', 'ir', 't'], tier: 3 },
};
export type PhraseThing = keyof typeof PHRASE_THINGS;

const THE: PhraseWord = { word: 'the', gpcs: ['th', 'e'], tier: 1 };
const COLOURS = Object.keys(PHRASE_COLOURS) as PhraseColour[];
const THINGS = Object.keys(PHRASE_THINGS) as PhraseThing[];

/** The phrase's clip ("The green sock."), a line in tools/lines.ts. */
export const phraseClip = (c: PhraseColour, t: PhraseThing): string => `phrase-${c}-${t}`;

const first = (w: string): string => w[0];
const tierOf = (c: PhraseColour, t: PhraseThing): 1 | 2 | 3 => Math.max(PHRASE_COLOURS[c].tier, PHRASE_THINGS[t].tier) as 1 | 2 | 3;

export function phraseItem(c: PhraseColour, t: PhraseThing): WishItem {
  const cw = PHRASE_COLOURS[c];
  const tw = PHRASE_THINGS[t];
  return {
    word: `${c} ${t}`,
    gpcs: [...cw.gpcs, ...tw.gpcs],
    pic: wordPic(t),
    tint: PALETTE[c as Colour].pic,
    clip: phraseClip(c, t),
    tier: tierOf(c, t),
    react: 'wear',
    parts: [THE, cw, tw].map((w) => ({ word: w.word, gpcs: w.gpcs, ...(w.sounds ? { sounds: w.sounds } : {}) })),
  };
}

const siblingsOf = <K extends string>(all: readonly K[], k: K): K[] => all.filter((x) => x !== k && first(x) === first(k));

/** Every target phrase at a level: a target colour with a sibling, a thing with a partner; level 1 tiers 1 and 2. */
export function phraseTargets(level: 1 | 2 | 3): [PhraseColour, PhraseThing][] {
  const out: [PhraseColour, PhraseThing][] = [];
  for (const c of COLOURS) {
    if (!PHRASE_COLOURS[c].target || !siblingsOf(COLOURS, c).length) continue;
    for (const t of THINGS) {
      if (!siblingsOf(THINGS, t).length) continue;
      if (level === 1 && tierOf(c, t) > 2) continue;
      out.push([c, t]);
    }
  }
  return out;
}

/**
 * A phrase wish at a reading level (2.3 Part 2, 5): level 1 has 4 items where one of the two word pairs shares the
 * first letter, level 2 the full grid and a decoy colour on the target's thing. Step 0 plays level 3 as level 2.
 */
export function phraseSpec(rand: Rand, o: WishOpts = {}): WishSpec {
  let level = o.level ?? 2;
  if (level === 3) level = 2;
  const out = new Set(o.exclude ?? []);
  const all = phraseTargets(level);
  const fresh = all.filter(([c, t]) => !out.has(`${c} ${t}`));
  const [c, t] = pick(rand, fresh.length ? fresh : all);
  const cs = siblingsOf(COLOURS, c);
  const ts = siblingsOf(THINGS, t);
  const decoys: Record<string, WishDecoy> = {};
  const items: [PhraseColour, PhraseThing][] = [[c, t]];
  const add = (x: PhraseColour, y: PhraseThing, why: WishDecoy) => {
    items.push([x, y]);
    decoys[`${x} ${y}`] = why;
  };
  if (level === 1) {
    // One pair shares the first letter, the other differs: a first-letter guesser picks right half the time.
    const sameColour = rand() < 0.5;
    const c2 = sameColour ? pick(rand, cs) : pick(rand, COLOURS.filter((x) => first(x) !== first(c)));
    const t2 = sameColour ? pick(rand, THINGS.filter((x) => first(x) !== first(t))) : pick(rand, ts);
    add(c2, t, sameColour ? 'onset' : 'other');
    add(c, t2, sameColour ? 'other' : 'onset');
    add(c2, t2, 'other');
  } else {
    const c2 = pick(rand, cs);
    const t2 = pick(rand, ts);
    add(c2, t, 'onset');
    add(c, t2, 'onset');
    add(c2, t2, 'onset');
    add(pick(rand, COLOURS.filter((x) => !PHRASE_COLOURS[x].target)), t, 'other');
  }
  const { again, ...v3Rule } = WISH_CLIPS.phrase;
  return {
    kind: 'phrase',
    target: phraseItem(c, t),
    basket: shuffle(rand, items).map(([x, y]) => phraseItem(x, y)),
    level,
    decoys,
    clips: o.contrast === false ? v3Rule : { ...v3Rule, again },
  };
}

/** Every clip a phrase wish can say: every colour on every thing, and the wish's lines. */
export function allPhraseClipIds(): string[] {
  const ids = COLOURS.flatMap((c) => THINGS.map((t) => phraseClip(c, t)));
  return [...new Set([...ids, ...Object.values(WISH_CLIPS.phrase).flat()])];
}
