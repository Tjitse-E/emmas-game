// The naming moment (docs/v4/demo.md parts 4 and 9): three name bells, then the chosen name spelled with gems.
import type { NameChoice, NamingSpec } from '../contracts.ts';
import { DATA, type BellData } from './data.ts';
import { HERD_LOOKS } from './looks.ts';
import { type Rand, pick, shuffle } from './rand.ts';

export const NAMING_CLIPS: NamingSpec['clips'] = {
  bells: ['g-bells'],
  drag: ['g-bell-drag'],
  spell: ['g-spell'],
  gems: ['g-gems'],
  slide: ['g-slide'],
  done: ['fb-spelled'],
  again: ['fb-listen'],
};

/** Short vowels a child mixes up. e and a come first: bed and bad are the pair Emma's Dutch ear finds hardest. */
const NEAR_VOWEL: Record<string, string[]> = {
  a: ['e', 'u'], e: ['a', 'i'], i: ['e', 'a'], o: ['u', 'a'], u: ['o', 'a'],
};
/** Consonants that sound or look alike: b/d/p, voiced and unvoiced pairs, m/n, w/v, th/f, sh/ch. */
const NEAR_CONSONANT: Record<string, string[]> = {
  p: ['b'], b: ['d', 'p'], d: ['b', 't'], t: ['d'], m: ['n'], n: ['m'], g: ['k'], k: ['g'], c: ['g'], ck: ['g'],
  f: ['v'], v: ['f', 'w'], w: ['v'], s: ['z'], ss: ['z'], z: ['s'], l: ['r'], ll: ['r'], r: ['w'], j: ['ch'],
  sh: ['ch'], ch: ['sh'], th: ['f'],
};
/** Fallbacks for a name whose own letters have no near neighbour left. */
const ANY_VOWEL = ['a', 'e', 'i', 'o', 'u'];
const ANY_CONSONANT = ['m', 's', 't', 'p', 'n'];
/** Spellings of one sound. A gem from the target's family would spell the name another way, so it is never a distractor. */
const SAME_SOUND = [['c', 'k', 'ck'], ['s', 'ss'], ['l', 'll'], ['f', 'ff'], ['z', 'zz']];
const family = (g: string): string[] => SAME_SOUND.find((f) => f.includes(g)) ?? [g];

/** Every gem a distractor can be, for preloading letter sounds. */
export const GEM_SOUNDS: readonly string[] = [
  ...new Set([...Object.values(NEAR_VOWEL).flat(), ...Object.values(NEAR_CONSONANT).flat(), ...ANY_VOWEL, ...ANY_CONSONANT]),
];

/** Two wrong gems for a name: a nearby short vowel and a similar consonant, neither of which can spell the name. */
export function distractorsFor(gpcs: string[], rand: Rand): string[] {
  const blocked = new Set(gpcs.flatMap(family));
  const usable = (g: string) => !blocked.has(g);
  const vowels = gpcs.flatMap((g) => NEAR_VOWEL[g] ?? []).filter(usable);
  const vowel = pick(rand, vowels.length ? vowels : ANY_VOWEL.filter(usable));
  const consonants = shuffle(rand, gpcs.filter((g) => NEAR_CONSONANT[g]))
    .flatMap((g) => NEAR_CONSONANT[g])
    .filter(usable);
  const consonant = consonants[0] ?? pick(rand, ANY_CONSONANT.filter(usable));
  return shuffle(rand, [vowel, consonant]);
}

const HERD_NAMES = new Set(HERD_LOOKS.map((h) => h.name.toLowerCase()));

function choice(b: BellData, rand: Rand): NameChoice {
  return { name: b.name, gpcs: b.gpcs, clip: b.clip, distractors: distractorsFor(b.gpcs, rand) };
}

/** Three bells with names that start with three different sounds. `exclude` holds names already given. */
export function namingSpec(rand: Rand, exclude: string[] = []): NamingSpec {
  const out = new Set(exclude.map((n) => n.toLowerCase()));
  const pool = shuffle(rand, DATA.bells.filter((b) => !HERD_NAMES.has(b.name.toLowerCase()) && !out.has(b.name.toLowerCase())));
  const bells: BellData[] = [];
  for (const b of pool) {
    if (bells.length === 3) break;
    if (!bells.some((x) => family(x.gpcs[0]).includes(b.gpcs[0]))) bells.push(b);
  }
  for (const b of pool) if (bells.length < 3 && !bells.includes(b)) bells.push(b);
  if (bells.length < 3) throw new Error('namingSpec: fewer than three bell names left');
  return { bells: bells.map((b) => choice(b, rand)), clips: NAMING_CLIPS };
}
