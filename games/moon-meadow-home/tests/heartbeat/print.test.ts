// Printed words with sound dots and heart parts (R36): heart graphemes glow and have no dot.
import { describe, it, expect } from 'vitest';
import { printParts, unitHearts } from '../../src/core/heartbeat/print.ts';
import { printUnits } from '../../src/core/heartbeat/wish.ts';

describe('printParts', () => {
  it('marks the heart part of "the" and gives it no dot', () => {
    expect(printParts(['th', 'e'], [1])).toEqual([
      { text: 'th', dot: true, heart: false },
      { text: 'e', dot: false, heart: true },
    ]);
  });
  it('gives every part a dot when there is no heart part', () => {
    expect(printParts(['c', 'a', 't'])).toEqual([
      { text: 'c', dot: true, heart: false },
      { text: 'a', dot: true, heart: false },
      { text: 't', dot: true, heart: false },
    ]);
  });
  it('prints a split digraph as its vowel and a tail e with no dot of its own', () => {
    expect(printParts(['m', 'a-e', 'k'], [])).toEqual([
      { text: 'm', dot: true, heart: false },
      { text: 'a', dot: true, heart: false },
      { text: 'k', dot: true, heart: false },
      { text: 'e', dot: false, heart: false },
    ]);
  });
  it('prints an ending without its dash', () => {
    expect(printParts(['b', 'u', 's', '-es']).map((p) => p.text).join('')).toBe('buses');
  });
  it('keeps a split digraph tail in the heart when its grapheme is a heart part', () => {
    const p = printParts(['c', 'o-e', 'm'], [1]);
    expect(p.map((x) => x.text).join('')).toBe('come');
    expect(p.filter((x) => x.heart).map((x) => x.text)).toEqual(['o', 'e']);
    expect(p.filter((x) => x.dot).map((x) => x.text)).toEqual(['c', 'm']);
  });
});

describe('unitHearts', () => {
  it('maps heart grapheme indexes onto printed units', () => {
    const units = printUnits(['s', 'ai', 'd'], () => false);
    expect(unitHearts(units, [1])).toEqual([false, true, false]);
    const split = printUnits(['h', 'o-e', 'm'], () => false);
    expect(unitHearts(split, [1])).toEqual([false, true, false, true]);
    expect(unitHearts(split, undefined)).toEqual([false, false, false, false]);
  });
});

describe('split e-e', () => {
  it('pairs the tail of "these" with its vowel', () => {
    const p = printParts(['th', 'e-e', 's']);
    expect(p.map((x) => x.text).join('')).toBe('these');
    expect(p.map((x) => x.dot)).toEqual([true, true, true, false]);
  });
});
