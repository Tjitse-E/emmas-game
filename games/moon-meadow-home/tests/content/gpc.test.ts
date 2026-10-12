// G/tests/content/gpc.test.ts
import { describe, it, expect } from 'vitest';
import { spell, phonemesOf, splitUsual, baseText, isUsual, slugName, soundKey, collapseRuns, PHONEMES } from '../../src/core/content/gpc.ts';
import type { RawGpc } from '../../src/core/content/types.ts';

const rows: RawGpc[] = [
  { id: 'c', text: 'c', phonemes: ['k'], vowel: false, sound: 'c', fluency: true },
  { id: 'k', text: 'k', phonemes: ['k'], vowel: false, sound: 'k', fluency: true },
  { id: 'ck', text: 'ck', phonemes: ['k'], vowel: false, sound: 'ck', fluency: true },
  { id: 'a', text: 'a', phonemes: ['a'], vowel: true, sound: 'a', fluency: true },
  { id: 'a-e', text: 'a-e', phonemes: ['ai'], vowel: true, sound: 'ai', fluency: false, split: true },
  { id: 'e', text: 'e', phonemes: ['e'], vowel: true, sound: 'e', fluency: true },
  { id: 'p', text: 'p', phonemes: ['p'], vowel: false, sound: 'p', fluency: true },
  { id: 'ph', text: 'ph', phonemes: ['f'], vowel: false, sound: 'f', fluency: false },
  { id: 'f', text: 'f', phonemes: ['f'], vowel: false, sound: 'f', fluency: true },
  { id: 'u', text: 'u', phonemes: ['u'], vowel: true, sound: 'u', fluency: true },
  { id: 'x', text: 'x', phonemes: ['k', 's'], vowel: false, sound: 'x', fluency: true },
  { id: 'o', text: 'o', phonemes: ['o'], vowel: true, sound: 'o', fluency: true },
  { id: 'ow', text: 'ow', phonemes: ['ow'], vowel: true, sound: 'ow', fluency: true },
  { id: 'ow.oa', text: 'ow', phonemes: ['oa'], vowel: true, sound: 'oa', fluency: false },
  { id: 'n', text: 'n', phonemes: ['n'], vowel: false, sound: 'n', fluency: true },
  { id: 's', text: 's', phonemes: ['s'], vowel: false, sound: 's', fluency: true },
  { id: 'l', text: 'l', phonemes: ['l'], vowel: false, sound: 'l', fluency: true },
  { id: 'i', text: 'i', phonemes: ['i'], vowel: true, sound: 'i', fluency: true },
  { id: 'y.ee', text: 'y', phonemes: ['ee'], vowel: true, sound: 'ee', fluency: false },
  { id: 'igh', text: 'igh', phonemes: ['igh'], vowel: true, sound: 'igh', fluency: true },
  { id: 'g', text: 'g', phonemes: ['g'], vowel: false, sound: 'g', fluency: true },
  { id: 'h', text: 'h', phonemes: ['h'], vowel: false, sound: 'h', fluency: true },
  { id: 't', text: 't', phonemes: ['t'], vowel: false, sound: 't', fluency: true },
];
const T = Object.fromEntries(rows.map(g => [g.id, g]));

describe('spell', () => {
  it('joins gem texts', () => expect(spell(['f', 'o', 'x'], T)).toBe('fox'));
  it('puts the e of a split digraph after the next GPC', () => expect(spell(['c', 'a-e', 'k'], T)).toBe('cake'));
  it('uses the base text of an alternative', () => {
    expect(spell(['s', 'n', 'ow.oa'], T)).toBe('snow');
    expect(spell(['l', 'i', 'l', 'y.ee'], T)).toBe('lily');
  });
  it('throws on an unknown GPC and on a split digraph at the end', () => {
    expect(() => spell(['q'], T)).toThrow(/Unknown GPC q/);
    expect(() => spell(['c', 'a-e'], T)).toThrow(/needs a GPC after it/);
  });
});

describe('phonemesOf', () => {
  it('expands x into two phonemes', () => expect(phonemesOf(['f', 'o', 'x'], T)).toEqual(['f', 'o', 'k', 's']));
  it('reads alternatives by their own phoneme', () => expect(phonemesOf(['s', 'n', 'ow.oa'], T)).toEqual(['s', 'n', 'oa']));
});

describe('splitUsual', () => {
  it('splits greedily over usual GPCs, longest first', () => {
    expect(splitUsual('fuck', T)).toEqual(['f', 'u', 'ck']);
    expect(splitUsual('phuk', T)).toEqual(['ph', 'u', 'k']);
    expect(splitUsual('night', T)).toEqual(['n', 'igh', 't']);
    expect(splitUsual('Fox', T)).toEqual(['f', 'o', 'x']);
  });
  it('never uses alternatives or split digraphs', () => expect(splitUsual('snow', T)).toEqual(['s', 'n', 'ow']));
  it('returns null when a letter has no GPC', () => expect(splitUsual('qq', T)).toBeNull());
});

describe('small helpers', () => {
  it('baseText and isUsual', () => {
    expect(baseText('ow.oa')).toBe('ow');
    expect(isUsual('ow.oa')).toBe(false);
    expect(isUsual('ow')).toBe(true);
  });
  it('slugName keeps lowercase letters only', () => {
    expect(slugName('Lily-Rose')).toBe('lilyrose');
    expect(slugName("O'Neil")).toBe('oneil');
    expect(slugName('Zoë')).toBe('zoe');
  });
  it('soundKey reads the phonics key', () => {
    expect(soundKey('ow.oa', T)).toBe('oa');
    expect(soundKey('zz', T)).toBeNull();
  });
  it('collapseRuns merges repeated phonemes', () => expect(collapseRuns(['f', 'f', 'u', 'u', 'k'])).toEqual(['f', 'u', 'k']));
  it('the phoneme inventory has the schwa and no duplicates', () => {
    expect(PHONEMES).toContain('@');
    expect(new Set(PHONEMES).size).toBe(PHONEMES.length);
  });
});
