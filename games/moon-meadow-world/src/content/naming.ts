// The naming moment (docs/v4/demo.md parts 4 and 9, 2.2.md 3.1): three name bells, then the chosen name spelled with
// gems. The tray holds the name's gems plus 3 wrong ones on the first naming and 4 on the second, one of them a
// capital for the crowned first slot, so neither the capital nor the vowel comes for free.
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
/**
 * A capital that looks or sounds like the name's own first letter, for slot 1 (docs/v4/2.2.md 3.1): P and B, B and D,
 * M and N, T and D, K and G, C and G, F and V, and J and Y (Emma's Dutch j/y). The second capital is a fallback for
 * a name that already holds the first one (Bud cannot take D).
 */
const NEAR_CAPITAL: Record<string, string[]> = {
  p: ['B', 'D'], b: ['D', 'P'], d: ['B', 'P'], m: ['N', 'W'], n: ['M', 'H'], t: ['D', 'F'], k: ['G', 'T'],
  g: ['K', 'D'], c: ['G', 'D'], f: ['V', 'T'], v: ['F', 'W'], j: ['Y', 'G'],
};
/** Fallbacks for a name whose own letters have no near neighbour left. */
const ANY_VOWEL = ['a', 'e', 'i', 'o', 'u'];
const ANY_CONSONANT = ['m', 's', 't', 'p', 'n'];
const ANY_CAPITAL = ['B', 'D', 'P', 'M', 'N', 'T'];
/** Spellings of one sound. A gem from the target's family would spell the name another way, so it is never a distractor. */
const SAME_SOUND = [['c', 'k', 'ck'], ['s', 'ss'], ['l', 'll'], ['f', 'ff'], ['z', 'zz']];
const family = (g: string): string[] => SAME_SOUND.find((f) => f.includes(g)) ?? [g];

/** Every gem a distractor can be, for preloading letter sounds (capitals play their lower-case sound). */
export const GEM_SOUNDS: readonly string[] = [
  ...new Set([
    ...Object.values(NEAR_VOWEL).flat(), ...Object.values(NEAR_CONSONANT).flat(), ...ANY_VOWEL, ...ANY_CONSONANT,
    ...[...Object.values(NEAR_CAPITAL).flat(), ...ANY_CAPITAL].map((g) => g.toLowerCase()),
  ]),
];

/**
 * Wrong gems for a name, none of which can spell it: 3 for the first naming (a near capital for slot 1, a near short
 * vowel and a similar consonant) or 4 for the second (the capital, both near vowels and the consonant).
 */
export function distractorsFor(gpcs: string[], rand: Rand, count: 3 | 4 = 3): string[] {
  const blocked = new Set(gpcs.flatMap(family));
  const usable = (g: string) => !blocked.has(g.toLowerCase());
  const lead = gpcs[0].charAt(0);
  const capitals = (NEAR_CAPITAL[lead] ?? []).filter(usable);
  const capital = capitals[0] ?? pick(rand, ANY_CAPITAL.filter((g) => usable(g) && g.toLowerCase() !== lead));
  const near = [...new Set(gpcs.flatMap((g) => NEAR_VOWEL[g] ?? []).filter(usable))];
  const spare = shuffle(rand, ANY_VOWEL.filter((v) => usable(v) && !near.includes(v)));
  const want = count === 4 ? 2 : 1;
  // Naming 1 takes one of the near vowels at random; naming 2 takes both (a and i for Meg).
  const vowels = [...(count === 4 ? near : shuffle(rand, near)), ...spare].slice(0, want);
  const consonants = shuffle(rand, gpcs.filter((g) => NEAR_CONSONANT[g]))
    .flatMap((g) => NEAR_CONSONANT[g])
    .filter(usable);
  const consonant = consonants[0] ?? pick(rand, ANY_CONSONANT.filter(usable));
  return shuffle(rand, [capital, ...vowels, consonant]);
}

const HERD_NAMES = new Set(HERD_LOOKS.map((h) => h.name.toLowerCase()));

function choice(b: BellData, rand: Rand, decoys: 3 | 4): NameChoice {
  return { name: b.name, gpcs: b.gpcs, clip: b.clip, distractors: distractorsFor(b.gpcs, rand, decoys) };
}

/**
 * Three bells with names that start with three different sounds. `exclude` holds names already given. `decoys` is 3
 * for the first naming and 4 for the second (a number, or `{ decoys }`).
 */
export function namingSpec(rand: Rand, exclude: string[] = [], o: 3 | 4 | { decoys?: 3 | 4 } = 3): NamingSpec {
  const decoys = typeof o === 'number' ? o : (o.decoys ?? 3);
  const out = new Set(exclude.map((n) => n.toLowerCase()));
  const pool = shuffle(rand, DATA.bells.filter((b) => !HERD_NAMES.has(b.name.toLowerCase()) && !out.has(b.name.toLowerCase())));
  const bells: BellData[] = [];
  for (const b of pool) {
    if (bells.length === 3) break;
    if (!bells.some((x) => family(x.gpcs[0]).includes(b.gpcs[0]))) bells.push(b);
  }
  for (const b of pool) if (bells.length < 3 && !bells.includes(b)) bells.push(b);
  if (bells.length < 3) throw new Error('namingSpec: fewer than three bell names left');
  return { bells: bells.map((b) => choice(b, rand, decoys)), clips: NAMING_CLIPS };
}
