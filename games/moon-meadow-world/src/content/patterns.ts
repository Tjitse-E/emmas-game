// The bead tree's patterns (docs/v4/2.3.md Part 2, section 6): a baby's necklace of 9 beads with 3 gaps. A bead is a
// shape in a colour, and the units of one pattern differ in both, so neither colour alone nor shape alone fills a
// gap. Each string is chosen so that copying the bead left of a gap, or swapping between two beads, is wrong at least
// once. The pattern level is its own small level (game/beads.ts); it never moves the maths band.
//
// Step 0: the types, the clips and one fixed ABB string per level, so the bead tree can run. The patterns lane builds
// the planner, the level rules, the decoy kinds and the tests.
import type { Bead, BeadShape, Colour, PatternDecoy, PatternKind, PatternSpec } from '../contracts.ts';
import type { Rand } from './rand.ts';

/** The pattern level: 1 to 3, as the reading level. */
export type PatternLevel = PatternSpec['level'];

/** The bead colours: five palette colours that differ clearly in light and hue. */
export const BEAD_COLOURS: readonly Colour[] = ['pink', 'blue', 'gold', 'green', 'purple'];
export const BEAD_SHAPES: readonly BeadShape[] = ['heart', 'star', 'moon', 'round'];
/** Places on a string, and gaps per string. */
export const STRING_LENGTH = 9;
export const GAPS = 3;
/** Tray beads per level: 1 in 3 per gap at level 1, 1 in 4 at levels 2 and 3. */
export const TRAY_SIZE: Record<PatternLevel, 3 | 4> = { 1: 3, 2: 4, 3: 4 };
/** The pattern kinds each level draws from (AB is left out: swapping between two beads always solves it). */
export const KINDS_AT: Record<PatternLevel, readonly PatternKind[]> = {
  1: ['AAB', 'ABB'],
  2: ['AAB', 'ABB', 'ABC', 'AABB'],
  3: ['AAB', 'ABB', 'ABC', 'AABB'],
};

export const PATTERN_CLIPS: PatternSpec['clips'] = {
  intro: ['g4-beads'],
  goal: ['g4-pattern'],
  again: ['fb4-pattern'],
  hint: ['h4-pattern'],
  done: ['fb4-necklace'],
};

export const beadKey = (b: Bead): string => `${b.shape}-${b.colour}`;

/** Step 0's string: ABB with the gaps at the end, a pink heart and a blue star, and a pink star as the cross decoy. */
export function patternSpec(_rand: Rand, level: PatternLevel = 1): PatternSpec {
  const a: Bead = { shape: 'heart', colour: 'pink' };
  const b: Bead = { shape: 'star', colour: 'blue' };
  const string = [a, b, b, a, b, b, a, b, b];
  const gaps = [6, 7, 8];
  const tray: Bead[] = [a, b, { shape: 'star', colour: 'pink' }];
  if (TRAY_SIZE[level] === 4) tray.push({ shape: 'heart', colour: 'blue' });
  const decoys = gaps.map((g) => {
    const out: Record<number, PatternDecoy> = {};
    tray.forEach((t, i) => {
      const want = string[g];
      if (beadKey(t) === beadKey(want)) return;
      if (t.colour === want.colour) out[i] = 'colour';
      else if (t.shape === want.shape) out[i] = 'shape';
      else out[i] = beadKey(t) === beadKey(string[g - 1]) ? 'copy' : 'unit';
    });
    return out;
  });
  return { kind: 'ABB', level, string, gaps, tray, decoys, clips: PATTERN_CLIPS };
}

/** Every clip the bead tree can say. */
export function allPatternClipIds(): string[] {
  return [...new Set(Object.values(PATTERN_CLIPS).flat())];
}
