// G/tests/learning/errors.test.ts
import { describe, it, expect } from 'vitest';
import { tagError } from '../../src/core/learning/errors.ts';
import { miniContent } from '../fixtures/mini.ts';

const c = miniContent();

describe('tagError', () => {
  it('returns null for the right answer', () => {
    expect(tagError(c, { strand: 'r', target: 'pan', chosen: 'pan' })).toBeNull();
    expect(tagError(c, { strand: 'm', target: 5, chosen: 5 })).toBeNull();
  });
  it('tags twin words and one-vowel swaps inside a pair as dutch', () => {
    expect(tagError(c, { strand: 'r', target: 'pan', chosen: 'pen' })).toBe('dutch');
    expect(tagError(c, { strand: 'r', target: 'cot', chosen: 'cut' })).toBe('other');
    expect(tagError(c, { strand: 'r', target: 'hat', chosen: 'hut' })).toBe('dutch');
  });
  it('tags other vowel swaps as vowel and anything else as other', () => {
    expect(tagError(c, { strand: 'r', target: 'pin', chosen: 'pan' })).toBe('vowel');
    expect(tagError(c, { strand: 'r', target: 'cap', chosen: 'map' })).toBe('other');
    expect(tagError(c, { strand: 'r', target: 'hat', chosen: 'fox' })).toBe('other');
  });
  it('tags spelling slots', () => {
    expect(tagError(c, { strand: 's', target: 'e', chosen: 'a', position: 'middle' })).toBe('dutch');
    expect(tagError(c, { strand: 's', target: 'i', chosen: 'a', position: 'middle' })).toBe('vowel');
    expect(tagError(c, { strand: 's', target: 'd', chosen: 't', position: 'final' })).toBe('other');
  });
  it('tags maths answers', () => {
    expect(tagError(c, { strand: 'm', target: 24, chosen: 42 })).toBe('reversal');
    expect(tagError(c, { strand: 'm', target: 7, chosen: 8 })).toBe('off-by-one');
    expect(tagError(c, { strand: 'm', target: 3, chosen: 9 })).toBe('other');
  });
  it('honours the position of a pair and ignores magic-e pairs', () => {
    const k = miniContent();
    k.pairs['d-t'] = { id: 'd-t', gpcs: ['d', 't'], position: 'final', kind: 'voicing', unlock: {} };
    k.pairs['a-ai'] = { id: 'a-ai', gpcs: ['a', 'ai'], position: 'any', kind: 'magic-e', unlock: {} };
    expect(tagError(k, { strand: 's', target: 'd', chosen: 't', position: 'final' })).toBe('dutch');
    expect(tagError(k, { strand: 's', target: 'd', chosen: 't', position: 'initial' })).toBe('other');
    expect(tagError(k, { strand: 's', target: 'ai', chosen: 'a', position: 'middle' })).toBe('vowel');
  });
});
