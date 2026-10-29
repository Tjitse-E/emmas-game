// The bead tree's patterns (docs/v4/2.3.md sections 6 and 19.2): a baby's necklace of 9 beads with 3 gaps, filled
// left to right from one tray. A bead is a shape in a colour, and the units of one pattern differ in both, so neither
// colour alone nor shape alone fills a gap.
//
//   level 1  AAB, ABB; the gaps are the last three places; tray of 3: both units and one cross bead (A's shape in B's
//            colour), so a blind pick is right 1 time in 3
//   level 2  AAB, ABB, ABC, AABB; the last three places; tray of 4: the units and cross beads up to 4 (1 in 4)
//   level 3  the same kinds; three spread gaps, never side by side, at least one in places 0 to 5 (1 in 4)
//
// AB is left out: swapping between two beads always solves it. Every string the planner returns passes these checks
// (tests/patterns.test.ts): copying the bead left of the gap is wrong at least once; swapping between the last two
// beads (taking the bead two places back) is wrong at least once; matching only the colour, and only the shape, can
// each be wrong at least once (a tray bead has the right colour and the wrong shape at some gap, and one the right
// shape and the wrong colour at some gap). Claude's calls on top of the doc: the three gaps never all take the same
// bead (so repeating her last right bead never wins), no gap is at place 0 (there is no bead on its left to go on
// from), the strings of level 1 start with their unit, and at every gap one full repeat of the pattern can be seen
// whole, so the hints always have a repeat to light (repeatFor, contrastFor).
//
// The pattern level is its own small level (game/beads.ts, save.patterns); it never moves the maths band.
import type { Bead, BeadShape, Colour, MomentResult, Outcome, PatternDecoy, PatternKind, PatternSpec } from '../contracts.ts';
import { type Rand, pick, shuffle } from './rand.ts';

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
/** Each kind's repeating unit, as indexes of its units (A 0, B 1, C 2). */
export const UNIT: Record<PatternKind, readonly number[]> = { AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1] };
/** The gaps of levels 1 and 2: the last three places. */
export const END_GAPS: readonly number[] = [6, 7, 8];

export const PATTERN_CLIPS: PatternSpec['clips'] = {
  intro: ['g4-beads'],
  goal: ['g4-pattern'],
  again: ['fb4-pattern'],
  hint: ['h4-pattern'],
  done: ['fb4-necklace'],
};

export const beadKey = (b: Bead): string => `${b.shape}-${b.colour}`;
export const sameBead = (a: Bead, b: Bead): boolean => a.shape === b.shape && a.colour === b.colour;
/** How many places one repeat of the pattern takes. */
export const periodOf = (kind: PatternKind): number => UNIT[kind].length;

/**
 * Level 3's gap sets: three places from 1 to 8, never side by side, at least one in places 0 to 5. Place 0 is left out
 * (there is no bead on its left to go on from), and so are the end gaps of levels 1 and 2.
 */
export const SPREAD_GAPS: readonly (readonly number[])[] = (() => {
  const out: number[][] = [];
  for (let a = 1; a < STRING_LENGTH; a++) {
    for (let b = a + 2; b < STRING_LENGTH; b++) {
      for (let c = b + 2; c < STRING_LENGTH; c++) if (a <= 5) out.push([a, b, c]);
    }
  }
  return out;
})();

/** A repeat the hints can light for gap `i`: its places, left to right, and the index in it of the place that matches. */
type Window = { places: number[]; at: number; dist: number };

/**
 * Every full repeat of the pattern she can see when gap `i` is open: `periodOf(kind)` places in a row with no gap from
 * `i` on among them (the earlier gaps are filled by then). `dist` is how far it is from the gap (the one on its left
 * wins a tie), and `at` is the index of the place in it that matches the gap.
 */
function windowsFor(spec: { kind: PatternKind; gaps: readonly number[] }, i: number): Window[] {
  const n = periodOf(spec.kind);
  const g = spec.gaps[i];
  if (g === undefined) return [];
  const open = new Set(spec.gaps.slice(i));
  const out: Window[] = [];
  for (let s = 0; s + n <= STRING_LENGTH; s++) {
    const places = Array.from({ length: n }, (_, k) => s + k);
    if (places.some((p) => open.has(p))) continue;
    const end = s + n - 1;
    out.push({ places, at: (((g - s) % n) + n) % n, dist: end < g ? g - end : s - g + 0.5 });
  }
  return out;
}

/**
 * The full repeat the focused hint lights for gap `i` (its places, left to right) and the place in it that matches
 * the gap, which then pulses gold: the repeat nearest the gap, the one on its left on a tie. Null when no full repeat
 * can be seen; the planner never returns such a string.
 */
export function repeatFor(spec: { kind: PatternKind; gaps: readonly number[] }, i: number): { places: number[]; match: number } | null {
  let best: Window | null = null;
  for (const w of windowsFor(spec, i)) if (!best || w.dist < best.dist) best = w;
  return best ? { places: best.places, match: best.places[best.at] } : null;
}

/**
 * The full repeat the light contrast lights for gap `i` after a first miss. It must not show the answer, as the
 * nearest repeat would: that one ends just left of the gap, so its first bead is always the gap's bead. So `rand`
 * picks among the nearest repeat for each place the match can take in it. Then no place in the lit order holds the
 * answer much more often than the pattern's own mix of beads does (about 1 in 2; tested). Null when no full repeat
 * can be seen.
 */
export function contrastFor(spec: { kind: PatternKind; gaps: readonly number[] }, i: number, rand: Rand): { places: number[]; match: number } | null {
  const nearest = new Map<number, Window>();
  for (const w of windowsFor(spec, i)) {
    const b = nearest.get(w.at);
    if (!b || w.dist < b.dist) nearest.set(w.at, w);
  }
  const options = [...nearest.values()].sort((a, b) => a.at - b.at);
  if (!options.length) return null;
  const w = options[Math.min(options.length - 1, Math.floor(rand() * options.length))];
  return { places: w.places, match: w.places[w.at] };
}

/**
 * Why each wrong tray bead is wrong for the bead at place `g` (by tray index): the bead left of the gap (copy),
 * another unit of the pattern (unit), the right colour only (colour) or the right shape only (shape). In ABC a cross
 * bead can share neither with a gap's bead; it is then 'other'.
 */
export function decoysAt(string: readonly Bead[], g: number, tray: readonly Bead[], units: readonly Bead[]): Record<number, PatternDecoy> {
  const want = string[g];
  const left = g > 0 ? string[g - 1] : null;
  const out: Record<number, PatternDecoy> = {};
  tray.forEach((t, i) => {
    if (sameBead(t, want)) return;
    if (left && sameBead(t, left)) out[i] = 'copy';
    else if (units.some((u) => sameBead(u, t))) out[i] = 'unit';
    else if (t.colour === want.colour) out[i] = 'colour';
    else if (t.shape === want.shape) out[i] = 'shape';
    else out[i] = 'other';
  });
  return out;
}

/** The tray before shuffling: the units, then cross beads (one unit's shape in another unit's colour) up to the size. */
function trayOf(level: PatternLevel, units: readonly Bead[], rand: Rand): Bead[] {
  const [a, b] = units;
  if (level === 1) return [...units, { shape: a.shape, colour: b.colour }];
  if (units.length === 2) return [...units, { shape: a.shape, colour: b.colour }, { shape: b.shape, colour: a.colour }];
  const pairs: [Bead, Bead][] = [];
  for (const p of units) for (const q of units) if (p !== q) pairs.push([p, q]);
  const [p, q] = pick(rand, pairs);
  return [...units, { shape: p.shape, colour: q.colour }];
}

/** Do the string, its gaps and its tray pass every rule of the header? */
function playable(string: readonly Bead[], gaps: readonly number[], tray: readonly Bead[], kind: PatternKind): boolean {
  const wants = gaps.map((g) => string[g]);
  const copyWrong = gaps.some((g) => g > 0 && !sameBead(string[g - 1], string[g]));
  const swapWrong = gaps.some((g) => g > 1 && !sameBead(string[g - 2], string[g]));
  const colourWrong = wants.some((w) => tray.some((t) => !sameBead(t, w) && t.colour === w.colour));
  const shapeWrong = wants.some((w) => tray.some((t) => !sameBead(t, w) && t.shape === w.shape));
  const mixed = new Set(wants.map(beadKey)).size > 1;
  const seen = gaps.every((_, i) => repeatFor({ kind, gaps }, i) !== null);
  return copyWrong && swapWrong && colourWrong && shapeWrong && mixed && seen;
}

/** A necklace string at `level` from its own stream. */
export function patternSpec(rand: Rand, level: PatternLevel = 1): PatternSpec {
  for (let tries = 0; tries < 400; tries++) {
    const kind = pick(rand, KINDS_AT[level]);
    const n = new Set(UNIT[kind]).size;
    const shapes = shuffle(rand, BEAD_SHAPES).slice(0, n);
    const colours = shuffle(rand, BEAD_COLOURS).slice(0, n);
    const units: Bead[] = shapes.map((shape, k) => ({ shape, colour: colours[k] }));
    const period = periodOf(kind);
    // Level 1 starts with the unit (AAB AAB AAB); later levels may start anywhere in it (ABA ABA ABA).
    const phase = level === 1 ? 0 : Math.floor(rand() * period);
    const string = Array.from({ length: STRING_LENGTH }, (_, p) => ({ ...units[UNIT[kind][(p + phase) % period]] }));
    const tray = shuffle(rand, trayOf(level, units, rand));
    const sets = level === 3 ? shuffle(rand, SPREAD_GAPS) : [END_GAPS];
    const gaps = sets.find((s) => playable(string, s, tray, kind));
    if (!gaps) continue;
    const decoys = gaps.map((g) => decoysAt(string, g, tray, units));
    return { kind, level, string, gaps: [...gaps], tray, decoys, clips: PATTERN_CLIPS };
  }
  throw new Error(`patternSpec: no playable string at level ${level}`);
}

/**
 * How a visit to the bead tree plays: at her pattern level, or at `?pl=` (`forced`), which is then not stored; on her
 * first visit ever (`seen` false) the ghost fills the first gap (the demo).
 */
export function beadsVisit(o: { seen: boolean; level: PatternLevel; forced?: PatternLevel | null }): { level: PatternLevel; demo: boolean; store: boolean } {
  return { level: o.forced ?? o.level, demo: !o.seen, store: !o.forced };
}

/** The result of the demo's first gap, which the ghost filled: helped, and it never moves the level. */
export const DEMO_RESULT: Readonly<MomentResult> = { outcome: 'helped', misses: 0, ms: 0 };

/** Is gap `i` of this visit the demo's (her first visit ever, the first gap)? Its result line gets `demo: 1`. */
export const demoGap = (visit: { demo: boolean }, i: number): boolean => visit.demo && i === 0;

/** The gap results that move the pattern level, in gap order: all of them but the demo's first gap. */
export function levelOutcomes(results: readonly MomentResult[], demo: boolean): Outcome[] {
  return results.filter((_, i) => !demoGap({ demo }, i)).map((r) => r.outcome);
}

/**
 * The save after a visit (game/beads.ts, inside save.write): the bead tree is seen, and unless `?pl=` forced the level
 * every gap result but the demo's folds into the pattern level with `fold` (foldReading). Never the maths band.
 */
export function saveVisit<S>(
  s: { seen: { beads: boolean }; patterns: S }, results: readonly MomentResult[], visit: { demo: boolean; store: boolean }, fold: (p: S, o: Outcome) => S,
): void {
  s.seen.beads = true;
  if (visit.store) for (const o of levelOutcomes(results, visit.demo)) s.patterns = fold(s.patterns, o);
}

/** Every clip the bead tree can say. */
export function allPatternClipIds(): string[] {
  return [...new Set(Object.values(PATTERN_CLIPS).flat())];
}
