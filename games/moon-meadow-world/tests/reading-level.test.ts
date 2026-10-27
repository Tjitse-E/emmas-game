// The reading level (src/game/reading.ts): a hidden fold over her reading results with a warm-up per play.
import { describe, expect, it } from 'vitest';
import type { Outcome } from '../src/contracts';
import { type ReadingState, foldReading, parseLevel, readingLevelFor, startReading } from '../src/game/reading';

const fold = (s: ReadingState, outcomes: Outcome[]): ReadingState => outcomes.reduce(foldReading, s);

describe('reading level', () => {
  it('starts in the middle', () => {
    expect(startReading()).toEqual({ level: 2, recent: [] });
  });

  it('moves up after three first tries in a row and clears the history', () => {
    expect(fold(startReading(), ['first', 'first'])).toEqual({ level: 2, recent: ['first', 'first'] });
    expect(fold(startReading(), ['first', 'first', 'first'])).toEqual({ level: 3, recent: [] });
    // A struggle in between starts the count again.
    expect(fold(startReading(), ['first', 'first', 'helped', 'first', 'first']).level).toBe(2);
  });

  it('moves down after two misses or helped answers in a row', () => {
    expect(fold(startReading(), ['miss', 'helped'])).toEqual({ level: 1, recent: [] });
    expect(fold(startReading(), ['helped', 'helped']).level).toBe(1);
    expect(fold(startReading(), ['miss', 'first', 'miss']).level).toBe(2);
  });

  it('stays between 1 and 3', () => {
    expect(fold({ level: 3, recent: [] }, ['first', 'first', 'first'])).toEqual({ level: 3, recent: [] });
    expect(fold({ level: 1, recent: [] }, ['miss', 'miss'])).toEqual({ level: 1, recent: [] });
    expect(fold({ level: 1, recent: [] }, ['miss', 'miss', 'first', 'first', 'first']).level).toBe(2);
  });

  it('keeps only what the rules need', () => {
    expect(fold(startReading(), ['first', 'first', 'miss', 'first']).recent).toEqual(['first', 'miss', 'first']);
  });

  it('warms up one level lower, never below 1, unless a level is forced', () => {
    expect(readingLevelFor({ level: 2, recent: [] }, { warmUp: true })).toBe(1);
    expect(readingLevelFor({ level: 3, recent: [] }, { warmUp: true })).toBe(2);
    expect(readingLevelFor({ level: 1, recent: [] }, { warmUp: true })).toBe(1);
    expect(readingLevelFor({ level: 3, recent: [] }, { warmUp: false })).toBe(3);
    expect(readingLevelFor({ level: 1, recent: [] }, { warmUp: true, forced: 3 })).toBe(3);
  });

  it('reads a level from a URL option or a save', () => {
    expect([parseLevel('1'), parseLevel('3'), parseLevel(2), parseLevel('4'), parseLevel('x'), parseLevel(null)]).toEqual([1, 3, 2, null, null, null]);
  });
});
