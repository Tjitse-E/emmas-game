// The reading level (src/game/reading.ts): a hidden fold over her reading results with a warm-up per play. 2.3.0:
// the phrase wish has its own level (docs/v4/2.3.md section 18).
import { describe, expect, it } from 'vitest';
import type { Outcome, WishSpec } from '../src/contracts';
import { type ReadingState, foldReading, foldReadingFor, levelOf, parseLevel, readingLevelFor, startReading } from '../src/game/reading';

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

describe('the phrase level', () => {
  const WORD_KINDS: WishSpec['kind'][] = ['dress', 'bath', 'picnic', 'food'];
  const both = (): { reading: ReadingState; phrases: ReadingState } => ({ reading: { level: 2, recent: [] }, phrases: { level: 2, recent: [] } });
  const fold = (kind: WishSpec['kind'], outcomes: Outcome[]) => outcomes.reduce((s, o) => foldReadingFor(s, kind, o), both());

  it('moves only on phrase reads, by the same rule as the word level', () => {
    expect(fold('phrase', ['first', 'first', 'first'])).toEqual({ reading: { level: 2, recent: [] }, phrases: { level: 3, recent: [] } });
    expect(fold('phrase', ['miss', 'helped'])).toEqual({ reading: { level: 2, recent: [] }, phrases: { level: 1, recent: [] } });
    // The phrase level is the word level's fold over the phrase reads alone.
    const outcomes: Outcome[] = ['first', 'miss', 'first', 'first', 'first', 'helped', 'helped', 'first'];
    expect(fold('phrase', outcomes).phrases).toEqual(outcomes.reduce(foldReading, { level: 2, recent: [] }));
  });

  it('never moves the word level, and word reads never move it', () => {
    for (const outcomes of [['miss', 'miss'], ['first', 'first', 'first'], ['helped', 'first', 'helped', 'helped']] as Outcome[][]) {
      expect(fold('phrase', outcomes).reading).toEqual(both().reading);
      for (const kind of WORD_KINDS) {
        expect(fold(kind, outcomes).phrases, kind).toEqual(both().phrases);
        expect(fold(kind, outcomes).reading, kind).toEqual(outcomes.reduce(foldReading, both().reading));
      }
    }
    expect(levelOf('phrase')).toBe('phrases');
    for (const kind of WORD_KINDS) expect(levelOf(kind)).toBe('reading');
  });

  it('a mixed play keeps the two apart', () => {
    let s = both();
    // A play: three word wishes right, two gate phrases missed, two picnic guests right.
    for (const [kind, o] of [['dress', 'first'], ['bath', 'first'], ['picnic', 'first'], ['phrase', 'miss'], ['phrase', 'miss'], ['picnic', 'first']] as [WishSpec['kind'], Outcome][]) {
      s = foldReadingFor(s, kind, o);
    }
    expect(s.reading).toEqual({ level: 3, recent: ['first'] });
    expect(s.phrases).toEqual({ level: 1, recent: [] });
  });
});
