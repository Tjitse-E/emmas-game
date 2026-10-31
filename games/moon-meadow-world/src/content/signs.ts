// The signposts on the trail (2.4.0, docs/v4/2.4.md section 5.5): thirteen place words in four first-sound groups, a
// trip's two sign sets at her sign level, and their clips. Every word has a v3 picture and an ok Elizabeth clip in a
// pack v4 already loads; the goal lines ("Bella wants to go to the pond.") are the demo's own (tools/lines.ts signLine).
// The kit is DATA.signWords: the words that passed their picture check (tools/build-content.ts), so a crossed word
// leaves the planner and the clip lists with one rebuild.
//
// The levels (5.5): level 1, three different first letters (one s or sh word, one b, one p); level 2, a pair of one
// group and an odd word with another first letter; level 3, three words of one group, a pair sharing its first two
// letters and an odd word that does not. Levels 1 and 2 take tier 1 or 2 words while a trip fits. The target is any of
// the three cards, drawn evenly, so the odd word is the target one time in three and tapping one of the look-alike
// pair wins one time in three, as a random tap does.
import type { MountId, SignGroup, SignItem, SignSpec, SignWord } from '../contracts.ts';
import { DATA } from './data.ts';
import { type Rand, pick, shuffle } from './rand.ts';

/** The 13 sign words by first-sound group, in this order: s, sh, b, p. */
export const SIGN_WORDS: readonly { word: SignWord; group: SignGroup }[] = [
  { word: 'sand', group: 's' }, { word: 'stump', group: 's' }, { word: 'swing', group: 's' }, { word: 'stone', group: 's' },
  { word: 'shed', group: 'sh' }, { word: 'ship', group: 'sh' }, { word: 'shell', group: 'sh' },
  { word: 'barn', group: 'b' }, { word: 'bench', group: 'b' }, { word: 'beach', group: 'b' },
  { word: 'pond', group: 'p' }, { word: 'pool', group: 'p' }, { word: 'pines', group: 'p' },
];

/** The goal line of a word for the mount she rides: "Bella wants to go to the pond." (g4-go-bella-pond). */
export function goalClip(m: MountId, w: SignWord): string {
  return `g4-go-${m}-${w}`;
}

/** Every clip the signposts can say: each kit word's v3 clip and both mounts' goal lines. */
export function allSignClipIds(kit: readonly SignItem[] = DATA.signWords): string[] {
  return kit.flatMap(({ word, clip }) => [clip, goalClip('bella', word), goalClip('hazel', word)]);
}

/** Every letter sound a sign's focused hint can play: the kit's sounds (pines ends in z), else its graphemes. */
export function allSignGraphemes(kit: readonly SignItem[] = DATA.signWords): string[] {
  return [...new Set(kit.flatMap((w) => w.sounds ?? w.gpcs))];
}

/** What this play's trips have used: the sets (their words sorted and joined, setKey) and the targets. */
export interface SignUse {
  sets: string[];
  targets: SignWord[];
}

/** A trip's two signs, planned at saddle-up from the stream sign-<trip>. */
export interface TripPlan {
  trip: 1 | 2;
  /** The level the trip plays and logs at (a level 3 trip without two sets that share no word plays at 2). */
  level: 1 | 2 | 3;
  signs: [SignSpec, SignSpec];
}

/** A set's key in SignUse.sets: its words sorted and joined with commas ("bench,beach,barn" is "barn,beach,bench"). */
export function setKey(words: readonly SignWord[]): string {
  return [...words].sort().join(',');
}

/** One sign's three words: the pair that starts alike and the odd word (level 1 has neither). */
export interface SignSet {
  words: SignWord[];
  pair: [SignWord, SignWord] | null;
  odd: SignWord | null;
}

const ORDER: readonly SignGroup[] = ['s', 'sh', 'b', 'p'];

/** The sets at a level from these words. With `low`, levels 1 and 2 use only tier 1 and 2 words. */
function setsFrom(level: 1 | 2 | 3, kit: readonly SignItem[], low: boolean): SignSet[] {
  const words = low && level < 3 ? kit.filter((w) => w.tier <= 2) : kit;
  const of = (g: SignGroup) => words.filter((w) => w.group === g).map((w) => w.word);
  const out: SignSet[] = [];
  if (level === 1) {
    for (const a of [...of('s'), ...of('sh')]) for (const b of of('b')) for (const p of of('p')) out.push({ words: [a, b, p], pair: null, odd: null });
    return out;
  }
  const n = level === 2 ? 1 : 2;
  const start = (w: SignWord) => w.slice(0, n);
  for (const g of ORDER) {
    const own = of(g);
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        const [x, y] = [own[i], own[j]];
        if (level === 3 && start(x) !== start(y)) continue;
        // Level 2: an odd word with another first letter (so an s pair never takes an sh word, nor the other way).
        // Level 3: a word of the same group whose first two letters differ (so sh, all sh, never plays level 3).
        const odds = level === 2 ? words.map((w) => w.word).filter((w) => w[0] !== x[0]) : own.filter((w) => start(w) !== start(x));
        for (const z of odds) out.push({ words: [x, y, z], pair: [x, y], odd: z });
      }
    }
  }
  return out;
}

/** The sets of a level: tier 1 and 2 words at levels 1 and 2 while any such set fits, else every kit word. */
export function signSets(level: 1 | 2 | 3, kit: readonly SignItem[] = DATA.signWords): SignSet[] {
  const low = setsFrom(level, kit, true);
  return low.length ? low : setsFrom(level, kit, false);
}

interface Table {
  sets: SignSet[];
  keys: string[];
  /** apart[i][j]: sets i and j share no word. */
  apart: boolean[][];
  /** Best ordered pairs per what the play has used (a small cache: most trips plan with nothing used yet). */
  best: Map<string, [number, number][]>;
}
const tables = new WeakMap<readonly SignItem[], Map<string, Table>>();

function tableOf(level: 1 | 2 | 3, kit: readonly SignItem[], low: boolean): Table {
  let byKit = tables.get(kit);
  if (!byKit) tables.set(kit, (byKit = new Map()));
  const id = `${level}${low ? 'low' : 'all'}`;
  let t = byKit.get(id);
  if (!t) {
    const sets = setsFrom(level, kit, low);
    t = {
      sets,
      keys: sets.map((s) => setKey(s.words)),
      apart: sets.map((a) => sets.map((b) => !a.words.some((w) => b.words.includes(w)))),
      best: new Map(),
    };
    byKit.set(id, t);
  }
  return t;
}

/**
 * The ordered pairs of sets sharing no word that a trip may take, all equally good: both sets fresh this play if any
 * such pair fits (one fresh, else none), and on trip 1 a pair that leaves two fresh sets sharing no word for trip 2 if
 * any does (so two level 3 trips take one s set each and use all four sets).
 */
function bestPairs(t: Table, used: SignUse, trip: 1 | 2): [number, number][] {
  const cacheKey = `${trip}|${[...used.sets].sort().join(';')}`;
  const hit = t.best.get(cacheKey);
  if (hit) return hit;
  const n = t.sets.length;
  const fresh = t.keys.map((k) => !used.sets.includes(k));
  // deg[i]: fresh sets that share no word with i; pairs: such unordered pairs among the fresh sets.
  const deg = t.apart.map((row) => row.reduce((c, ok, j) => c + (ok && fresh[j] ? 1 : 0), 0));
  const pairs = fresh.reduce((c, f, i) => c + (f ? deg[i] : 0), 0) / 2;
  let top = -1;
  let out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j || !t.apart[i][j]) continue;
      let left = pairs;
      if (fresh[i]) left -= deg[i];
      if (fresh[j]) left -= deg[j];
      if (fresh[i] && fresh[j]) left += 1;
      const score = (Number(fresh[i]) + Number(fresh[j])) * 2 + (trip === 1 && left > 0 ? 1 : 0);
      if (score > top) [top, out] = [score, []];
      if (score === top) out.push([i, j]);
    }
  }
  if (t.best.size > 64) t.best.clear();
  t.best.set(cacheKey, out);
  return out;
}

function signSpec(n: 1 | 2, level: 1 | 2 | 3, mount: MountId, set: SignSet, kit: readonly SignItem[], rand: Rand, avoid: readonly SignWord[]): SignSpec {
  const cards = shuffle(rand, set.words).map((w) => kit.find((k) => k.word === w)!) as [SignItem, SignItem, SignItem];
  // Any card, evenly; never a target this play has had while one of the three is fresh.
  const fresh = cards.filter((c) => !avoid.includes(c.word));
  const target = pick(rand, fresh.length ? fresh : cards);
  return {
    sign: n,
    level,
    cards,
    target,
    clips: { intro: n === 1 ? ['g4-signs'] : [], goal: [goalClip(mount, target.word)], right: [target.clip, 'fb-yes'], hint: ['h-sounds'], again: ['fb-letters'] },
  };
}

function trip(rand: Rand, o: { mount: MountId; trip: 1 | 2; used: SignUse }, level: 1 | 2 | 3, t: Table, [a, b]: [number, number], kit: readonly SignItem[]): TripPlan {
  const one = signSpec(1, level, o.mount, t.sets[a], kit, rand, o.used.targets);
  const two = signSpec(2, level, o.mount, t.sets[b], kit, rand, [...o.used.targets, one.target.word]);
  return { trip: o.trip, level, signs: [one, two] };
}

/**
 * A trip's two sign sets at her level, from the trip's own stream (sign-<trip>). Sign 2's set shares no word with sign
 * 1's; across a play no set and no target comes twice while another fits (`used`: what this play's trips took). A level
 * that has no two sets sharing no word plays one level lower (a level 3 trip with a word crossed plays and logs at 2).
 * `kit` is DATA.signWords unless a test passes another.
 */
export function planTrip(rand: Rand, o: { level: 1 | 2 | 3; mount: MountId; trip: 1 | 2; used: SignUse; kit?: readonly SignItem[] }): TripPlan {
  const kit = o.kit ?? DATA.signWords;
  for (let level = o.level; level >= 1; level--) {
    for (const low of level < 3 ? [true, false] : [false]) {
      const t = tableOf(level as 1 | 2 | 3, kit, low);
      const pairs = bestPairs(t, o.used, o.trip);
      if (pairs.length) return trip(rand, o, level as 1 | 2 | 3, t, pick(rand, pairs), kit);
    }
  }
  // No level has two sets that share no word (a kit cut to a few words): the set with the fewest shared words, sign 2
  // with a fresh target if one of its cards is. tools/build-content.ts keeps at least one level 1 set in the kit.
  for (let level = o.level; level >= 1; level--) {
    const t = tableOf(level as 1 | 2 | 3, kit, false);
    if (!t.sets.length) continue;
    const shared = (i: number, j: number) => t.sets[i].words.filter((w) => t.sets[j].words.includes(w)).length;
    const all = t.sets.flatMap((_, i) => t.sets.map((__, j) => [i, j] as [number, number])).filter(([i, j]) => i !== j || t.sets.length === 1);
    const least = Math.min(...all.map(([i, j]) => shared(i, j)));
    return trip(rand, o, level as 1 | 2 | 3, t, pick(rand, all.filter(([i, j]) => shared(i, j) === least)), kit);
  }
  throw new Error('planTrip: the sign kit has no level 1 set (tools/build-content.ts stops before this)');
}
