// The reading level (docs/v4/2.2.md 3.1): a pure fold over her reading results, kept in the save. Nothing on screen
// shows it. It decides the wish basket: level 1 has 4 items of the easier graphemes, levels 2 and 3 have 5, and level 3
// prefers targets with a twin or a frame word. Every checked word read feeds it: the three wishes and the two picnic
// guests (and the gate's two dress-up wishes before Emma's picture check).
//
// 2.3.0: the phrase wish at the Dressing Corner has its own level, `save.phrases`, the same fold over the gate's
// phrase reads (docs/v4/2.3.md section 18). A phrase read never moves the word level, and a word read never moves the
// phrase level, so a hard start with the new two-word form never makes her word baskets easier.
import type { Outcome } from '../contracts';

export type ReadingLevel = 1 | 2 | 3;

export interface ReadingState {
  level: ReadingLevel;
  /** Her latest results since the level last moved, oldest first (at most UP_AFTER). */
  recent: Outcome[];
}

/** A first play ever starts in the middle. */
export const FIRST_LEVEL: ReadingLevel = 2;
/** Up after this many first tries in a row. */
export const UP_AFTER = 3;
/** Down after this many struggles in a row (a miss, or helped). */
export const DOWN_AFTER = 2;

export const startReading = (): ReadingState => ({ level: FIRST_LEVEL, recent: [] });

const clampLevel = (n: number): ReadingLevel => Math.max(1, Math.min(3, n)) as ReadingLevel;

/** 1, 2 or 3 from a URL option or a save; anything else is null. */
export function parseLevel(v: unknown): ReadingLevel | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return n === 1 || n === 2 || n === 3 ? n : null;
}

/**
 * One reading result. Three `first` in a row move the level up, two `miss` or `helped` in a row move it down; the
 * history clears after each step, also when the level is already at its end.
 */
export function foldReading(s: ReadingState, outcome: Outcome): ReadingState {
  const recent = [...s.recent, outcome].slice(-UP_AFTER);
  const last = (n: number, ok: (o: Outcome) => boolean) => recent.length >= n && recent.slice(-n).every(ok);
  if (last(UP_AFTER, (o) => o === 'first')) return { level: clampLevel(s.level + 1), recent: [] };
  if (last(DOWN_AFTER, (o) => o !== 'first')) return { level: clampLevel(s.level - 1), recent: [] };
  return { level: s.level, recent };
}

/**
 * The level a reading moment is planned at. The play's first wish is one level lower, as a warm-up (the picnic
 * guests never are). `?rl=` forces a level for every moment, warm-up included.
 */
export function readingLevelFor(s: ReadingState, o: { warmUp: boolean; forced?: ReadingLevel | null }): ReadingLevel {
  if (o.forced) return o.forced;
  return o.warmUp ? clampLevel(s.level - 1) : s.level;
}

/** Which level a reading result moves: a phrase read its own phrase level, every word read the word level. */
export function levelOf(kind: string): 'phrases' | 'reading' {
  return kind === 'phrase' ? 'phrases' : 'reading';
}

/** Both reading levels after one result of a wish of `kind`: only the level of that kind moves. */
export function foldReadingFor<S extends { reading: ReadingState; phrases: ReadingState }>(s: S, kind: string, outcome: Outcome): S {
  const which = levelOf(kind);
  return { ...s, [which]: foldReading(s[which], outcome) };
}
