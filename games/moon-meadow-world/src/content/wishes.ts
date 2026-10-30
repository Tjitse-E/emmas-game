// The wishes (docs/v4/2.2.md 3.1 to 3.3) and the free-play food basket. Every word obeys spec 4.3 (one syllable, at
// most five letters, pictured, with an ok Elizabeth clip) and passed the picture check; tools/build-content.ts checks
// that and keeps only strong targets. The basket is planned so that a child who only reads the first letter, or the
// last, guesses wrong most of the time: twins, frame words and words with the same first and last letters.
import type { WishDecoy, WishItem, WishSpec } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import { DATA, type KindData, type WordData } from './data.ts';
import { type Rand, pick, shuffle } from './rand.ts';

/**
 * dress (wish 1 at the nest), bath (the pond wish, and wish 2 by the wild egg since 2.3.2), picnic (the royal picnic,
 * and wish 2 in a play without it), food (picnic foods only), phrase (2.3: the Dressing Corner gate, planned in
 * phrases.ts).
 */
export type WishKind = WishSpec['kind'];
/** The kinds whose wish is one word from a pool (all but the phrase). */
export type WordKind = Exclude<WishKind, 'phrase'>;
export type ReadingLevel = WishSpec['level'];

export interface WishOpts {
  /** The hidden reading level (src/game/reading.ts): 1 gives 4 items, 2 and 3 give 5. Default 2. */
  level?: ReadingLevel;
  /** Words that cannot be the wish: the last play's targets and the targets used earlier in this play. */
  exclude?: readonly string[];
  /** false brings back v3's miss rule (?contrast=0): no clips.again, so one miss gives the focused hint at once. */
  contrast?: boolean;
  /**
   * The words of this play's earlier wishes of the same kind (their targets and baskets): none of them in this wish
   * while others are left (2.3.2: wish2 as a second pond wish; 2.4.0: every dress-up, pond and picnic wish of a play,
   * the picnic's two guests too, moments.ts planWish).
   */
  avoid?: readonly string[];
}

/** After a miss's contrast tag: "Look at the letters again." */
const AGAIN = ['fb-letters'];
/** The goal for every kind but food: "Read the wish. Then give it to your baby." */
const GIVE: WishSpec['clips'] = { intro: ['g-wish', 'g4-give'], goal: ['g4-give'], right: ['fb-yes'], hint: ['h-sounds'], again: AGAIN };

export const WISH_CLIPS: Record<WishKind, WishSpec['clips']> = {
  food: { intro: ['g-wish', 'g-hungry'], goal: ['g-hungry'], right: ['fb-yes'], hint: ['h-sounds'], again: AGAIN },
  bath: GIVE,
  picnic: GIVE,
  dress: GIVE,
  phrase: GIVE,
};

/** Basket sizes by reading level (3.1). */
export const BASKET_SIZE: Record<ReadingLevel, number> = { 1: 4, 2: 5, 3: 5 };

/** The 11 words without an ok clip. build-content.ts never lets them in; the planner skips them all the same. */
export const BAD_WORDS: readonly string[] = ['sun', 'fig', 'wok', 'bee', 'pair', 'pea', 'tea', 'sea', 'tie', 'fir', 'hay'];

const WORDS = new Map(DATA.words.map((w) => [w.word, w]));
function wordData(w: string): WordData {
  const d = WORDS.get(w);
  if (!d) throw new Error(`wishes: no data for ${w}`);
  return d;
}

const FOODS = new Set(DATA.foods);
const isFood = (w: string): boolean => FOODS.has(w);

/** A kind's lists. 'food' is the picnic pool with only foods as targets (the hungry wish and the free-play basket). */
function kindData(kind: WordKind): KindData {
  if (kind !== 'food') return DATA.kinds[kind];
  const p = DATA.kinds.picnic;
  return { pool: p.pool, targets: p.targets.filter(isFood), level1: p.level1.filter(isFood), level3: p.level3.filter(isFood) };
}

/** Every word a wish of this kind can show. */
export function wishWords(kind: WordKind): WordData[] {
  return kindData(kind).pool.map(wordData);
}

/** The words a wish of this kind can ask for at a reading level. */
export function wishTargets(kind: WordKind, level: ReadingLevel): WordData[] {
  const k = kindData(kind);
  return (level === 1 ? k.level1 : level === 3 ? k.level3 : k.targets).map(wordData);
}

/** How the baby takes it: dress-up things go on its head, foods are munched, everything else is played with. */
export function reactOf(kind: WishKind, word: string): NonNullable<WishItem['react']> {
  if (kind === 'dress' || kind === 'phrase') return 'wear';
  if (kind === 'bath') return 'play';
  return isFood(word) ? 'munch' : 'play';
}

// "First letter" means the printed letter (s for sh), because that is what a guesser sees (3.1).
export const firstLetter = (w: WordData): string => w.word[0];
export const lastLetter = (w: WordData): string => w.word[w.word.length - 1];
const isVowel = (g: string): boolean => /^[aeiou]/.test(g) || g === 'yoo';
/** The graphemes from the vowel on ('u.g' for mug): two words with the same rime rhyme. */
export function rime(w: WordData): string {
  return w.gpcs.slice(Math.max(0, w.gpcs.findIndex(isVowel))).join('.');
}
/** Two words that never share a basket: the same word or picture, or pictures that look alike. */
export function alike(a: WordData, b: WordData): boolean {
  return a.word === b.word || a.pic === b.pic || !!a.alike?.includes(b.word) || !!b.alike?.includes(a.word);
}

export interface BasketPlan {
  /** The target first, then the decoys in the order they were planned (wishSpec shuffles them). */
  words: WordData[];
  /** Why each decoy is in the basket, for the log. */
  decoys: Record<string, WishDecoy>;
}

/**
 * The basket for a target (3.1). Level 1 (4 items): one word with the same first letter, one rhyme with another first
 * letter (or else one with the same last letter), one any. Levels 2 and 3 (5 items), in this order: the twin, a frame
 * word (same first and last letter), the same first letter until 3 share it, a rhyme with another first letter, the
 * same last letter while fewer than 2 share it, the same letter count while fewer than 2 match, then any word. Never
 * two look-alikes or two of one picture, only words of `pool`, never one of the 11 bad words. With `prefer` each step
 * takes a preferred word whenever one fits (the gate's dress-up words over the words it borrows), and another word
 * only where none does.
 */
export function planBasket(target: WordData, pool: readonly WordData[], level: ReadingLevel, rand: Rand, prefer?: (w: WordData) => boolean): BasketPlan {
  const n = BASKET_SIZE[level];
  const words: WordData[] = [target];
  const decoys: Record<string, WishDecoy> = {};
  const usable = pool.filter((w) => !BAD_WORDS.includes(w.word));
  const f = firstLetter(target);
  const l = lastLetter(target);
  const sameFirst = (w: WordData) => firstLetter(w) === f;
  const sameLast = (w: WordData) => lastLetter(w) === l;
  const sameLength = (w: WordData) => w.word.length === target.word.length;
  const onset = usable.filter(sameFirst);
  const rhyme = usable.filter((w) => !sameFirst(w) && rime(w) === rime(target));
  const ending = usable.filter((w) => !sameFirst(w) && sameLast(w));
  const lengths = usable.filter(sameLength);

  /**
   * Whether the basket can still meet its rules after adding `w`: enough room and words left for 3 with the first
   * letter (2 at level 1), and for 2 with the last letter and 2 of the same length (at levels 2 and 3), or a rhyme or
   * an ending at level 1. An early pick never takes away the only word a later step needs (dish for peach).
   */
  const keeps = (w: WordData): boolean => {
    const after = [...words, w];
    const open = (x: WordData) => !after.some((c) => alike(c, x));
    const room = n - after.length;
    const needFirst = Math.max(0, (level === 1 ? 2 : 3) - after.filter(sameFirst).length);
    let need = needFirst;
    if (onset.filter(open).length < needFirst) return false;
    if (level === 1) {
      if (!after.slice(1).some((x) => !sameFirst(x) && (rime(x) === rime(target) || sameLast(x)))) {
        if (![...rhyme, ...ending].some(open)) return false;
        need++;
      }
    } else {
      if (after.filter(sameLast).length < 2) {
        if (!ending.some(open) && !onset.some((x) => open(x) && sameLast(x))) return false;
        need++;
      }
      if (after.filter(sameLength).length < 2) {
        if (!lengths.some(open)) return false;
        need++;
      }
    }
    return need <= room;
  };
  const fits = (w: WordData) => words.length < n && !words.some((c) => alike(c, w));
  /** Add one word of `cands` that fits, picked at random, preferring one that keeps the later steps possible. */
  const add = (cands: readonly WordData[], why: WishDecoy): boolean => {
    let open = shuffle(rand, cands).filter(fits);
    if (prefer) open = [...open.filter(prefer), ...open.filter((x) => !prefer(x))];
    const w = open.find(keeps) ?? open[0];
    if (!w) return false;
    words.push(w);
    decoys[w.word] = why;
    return true;
  };
  const count = (test: (w: WordData) => boolean) => words.filter(test).length;

  if (level === 1) {
    add(onset, 'onset');
    if (!add(rhyme, 'rhyme')) add(ending, 'ending');
  } else {
    add(usable.filter((w) => target.twins?.includes(w.word)), 'twin');
    add(usable.filter((w) => sameFirst(w) && sameLast(w)), 'frame');
    while (count(sameFirst) < 3 && add(onset, 'onset')) { /* until three share the first letter */ }
    add(rhyme, 'rhyme');
    while (count(sameLast) < 2 && add(ending, 'ending')) { /* until two share the last letter */ }
    while (count(sameLength) < 2 && add(usable.filter(sameLength), 'length')) { /* length never decides */ }
  }
  while (add(usable, 'other')) { /* fill up */ }
  if (words.length < n) throw new Error(`planBasket: the pool cannot fill a basket of ${n} for ${target.word}`);
  return { words, decoys };
}

function item(kind: WordKind, w: WordData): WishItem {
  return {
    word: w.word, gpcs: w.gpcs, pic: wordPic(w.pic), ...(w.tint ? { tint: w.tint } : {}), clip: w.clip, tier: w.tier as WishItem['tier'],
    react: reactOf(kind, w.word),
  };
}

const isList = (x: readonly string[] | WishOpts): x is readonly string[] => Array.isArray(x);

/**
 * A wish and its basket at a reading level (default 2). The target is a strong word not in `exclude` (while one is
 * left); level 3 asks only targets with a twin or a frame word, and with none left it plays and logs as level 2.
 * `exclude` can be passed as the third argument (a list of words, as the demo did) or inside the options.
 *
 * With `avoid` (2.3.2) no avoided word is the target or in the basket while others are left: the basket comes from
 * the pool without them, and the target is one whose basket can still meet 3.1 there (basketFits; at level 3 with a
 * twin or a frame word). Level 3 with no such fresh target, and level 1 with every level 1 target avoided, play and
 * log as level 2. Without `avoid` the wish is planned exactly as before (the same draws).
 */
export function wishSpec(kind: WordKind, rand: Rand, exclude: readonly string[] | WishOpts = [], opts: WishOpts = {}): WishSpec {
  const o: WishOpts = isList(exclude) ? { ...opts, exclude: [...exclude, ...(opts.exclude ?? [])] } : { ...exclude, ...opts };
  const avoid = new Set(o.avoid ?? []);
  const out = new Set([...(o.exclude ?? []), ...avoid]);
  const fresh = (ws: WordData[]) => ws.filter((w) => !out.has(w.word));
  const unseen = (ws: WordData[]) => ws.filter((w) => !avoid.has(w.word));
  const all = wishWords(kind);
  const left = unseen(all);
  const pool = left.length >= BASKET_SIZE[3] ? left : all;
  /** With words to avoid: can the pool still give `t` a basket of level `l` (at level 3 with a twin or a frame word)? */
  const fits = (t: WordData, l: ReadingLevel) => !avoid.size || (basketFits(t, pool, l) && (l !== 3 || hasNear(t, pool)));
  let level: ReadingLevel = o.level ?? 2;
  if (level === 3 && !fresh(wishTargets(kind, 3)).filter((t) => fits(t, 3)).length) level = 2;
  if (level === 1 && !unseen(wishTargets(kind, 1)).length) level = 2;
  const targets = wishTargets(kind, level);
  const ok = (t: WordData) => fits(t, level);
  const choices = [fresh(targets).filter(ok), fresh(targets), unseen(targets).filter(ok), unseen(targets)];
  const target = pick(rand, choices.find((c) => c.length) ?? targets);
  const plan = planBasket(target, pool, level, rand);
  const { again, ...v3Rule } = WISH_CLIPS[kind];
  return {
    kind,
    target: item(kind, target),
    basket: shuffle(rand, plan.words).map((w) => item(kind, w)),
    level,
    decoys: plan.decoys,
    clips: o.contrast === false ? v3Rule : { ...v3Rule, again },
  };
}

// ---- the gate's word wish -------------------------------------------------------------------------------------------

/**
 * The Dressing Corner's gate with fewer than 6 strong phrases (docs/v4/2.3.md sections 17.4 and 18): two dress-up word
 * wishes after the nest's dress-up wish, so up to three dress-up reads a play. The dress-up set alone is too small for
 * that: its 24 pictures cannot fill three baskets without repeats, and only 5 of its targets have a twin or a frame
 * word for level 3. So the gate's targets are the dress-up targets, and its baskets take the pond and picnic pictures
 * she also reads (every one with its ok clip and picture check) where no dress-up word fits a step. Its level 3 asks
 * the dress-up targets with a twin or a frame word among all of them.
 */
const GATE_BORROWS: readonly ('bath' | 'picnic')[] = ['bath', 'picnic'];

/** Is this a dress-up word (a picture of the dress-up set)? */
export function isDressWord(w: Pick<WordData, 'word'>): boolean {
  return DATA.kinds.dress.pool.includes(w.word);
}

/** The gate's pictures: the dress-up set first, then the pond and picnic pictures it may borrow. */
export function gateWords(): WordData[] {
  const words = [...DATA.kinds.dress.pool, ...GATE_BORROWS.flatMap((k) => DATA.kinds[k].pool)];
  return [...new Set(words)].map(wordData);
}

/** A twin, or a frame word (the same first and last letter), that can share the target's basket. */
function hasNear(t: WordData, pool: readonly WordData[]): boolean {
  return pool.some((w) => !alike(w, t) && (!!t.twins?.includes(w.word) || (firstLetter(w) === firstLetter(t) && lastLetter(w) === lastLetter(t))));
}

/**
 * Can `pool` still give `t` a basket that meets the counts of 3.1 (planBasket)? Level 1: another word with its first
 * letter, and a rhyme or a word with its last letter but another first letter. Levels 2 and 3: two more with its first
 * letter, one more with its last letter and one more of its length. Words that look like the target, or like a word
 * already counted (ship and sail), do not count.
 */
function basketFits(t: WordData, pool: readonly WordData[], level: ReadingLevel): boolean {
  const others = pool.filter((w) => !alike(w, t));
  const count = (test: (w: WordData) => boolean) => {
    const apart: WordData[] = [];
    for (const w of others) if (test(w) && !apart.some((a) => alike(a, w))) apart.push(w);
    return apart.length;
  };
  const sameFirst = (w: WordData) => firstLetter(w) === firstLetter(t);
  if (level === 1) return count(sameFirst) >= 1 && count((w) => !sameFirst(w) && (rime(w) === rime(t) || lastLetter(w) === lastLetter(t))) >= 1;
  return count(sameFirst) >= 2 && count((w) => lastLetter(w) === lastLetter(t)) >= 1 && count((w) => w.word.length === t.word.length) >= 1;
}

/**
 * The words a gate word wish can ask for at a reading level: dress-up targets only, at level 3 those with a twin or
 * a frame word in `pool` (the gate's pictures, or what is left of them).
 */
export function gateTargets(level: ReadingLevel, pool: readonly WordData[] = gateWords()): WordData[] {
  const d = DATA.kinds.dress;
  if (level === 1) return d.level1.map(wordData);
  const targets = d.targets.map(wordData);
  return level === 2 ? targets : targets.filter((t) => hasNear(t, pool));
}

export interface GateWordOpts extends WishOpts {
  /** The words of this play's earlier dress-up reads (targets and baskets): never in this one. */
  avoid?: readonly string[];
}

/**
 * A gate word wish: kind 'dress' (worn, logged as dress), with a dress-up target that is not in `exclude` and not in
 * `avoid` while one is left, and a basket without any `avoid` word, dress-up pictures first. Level 3 without a fresh
 * target plays and logs as level 2, and so does level 1 when every level 1 target is in `avoid` (both baskets before
 * it held only level 1 targets: about 1 read in 6,000), so no word of this play comes back.
 */
export function gateWordSpec(rand: Rand, o: GateWordOpts = {}): WishSpec {
  const avoid = new Set(o.avoid ?? []);
  const out = new Set([...(o.exclude ?? []), ...avoid]);
  const fresh = (ws: WordData[]) => ws.filter((w) => !out.has(w.word));
  const unseen = (ws: WordData[]) => ws.filter((w) => !avoid.has(w.word));
  const pool = gateWords().filter((w) => !avoid.has(w.word));
  let level: ReadingLevel = o.level ?? 2;
  if (level === 3 && !fresh(gateTargets(3, pool)).length) level = 2;
  if (level === 1 && !unseen(gateTargets(1)).length) level = 2;
  const targets = gateTargets(level, pool);
  // A target asked in the last play comes back before a word she has seen in this play's baskets.
  const target = pick(rand, fresh(targets).length ? fresh(targets) : unseen(targets).length ? unseen(targets) : targets);
  const plan = planBasket(target, pool, level, rand, isDressWord);
  const { again, ...v3Rule } = WISH_CLIPS.dress;
  return {
    kind: 'dress',
    target: item('dress', target),
    basket: shuffle(rand, plan.words).map((w) => item('dress', w)),
    level,
    decoys: plan.decoys,
    clips: o.contrast === false ? v3Rule : { ...v3Rule, again },
  };
}

const KINDS: readonly WordKind[] = ['food', 'bath', 'picnic', 'dress'];

/** Every clip a word wish can say: each kind's lines and every word of its pool (phrases.ts has the phrase's). */
export function allWishClipIds(): string[] {
  return [...new Set(KINDS.flatMap((k) => [...wishWords(k).map((w) => w.clip), ...Object.values(WISH_CLIPS[k]).flat()]))];
}

/**
 * Every letter sound a wish word can play, and the phrase wish's (the colours' and things' sounds, phrases.ts; read
 * from the data here, so this file never imports phrases.ts, which imports it). "the" is never sounded.
 */
export function allWishGraphemes(): string[] {
  const phrase = [...(DATA.phraseColours ?? []), ...(DATA.phraseThings ?? [])].flatMap((w) => w.sounds ?? w.gpcs);
  return [...new Set([...KINDS.flatMap((k) => wishWords(k).flatMap((w) => w.gpcs)), ...phrase])];
}

/** The four foods of the free-play basket. Tapping one says its clip; dropping it on a unicorn feeds it. */
export function foods(): WishItem[] {
  return DATA.freeFoods.map((w) => item('food', wordData(w)));
}
