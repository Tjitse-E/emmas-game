// G/tests/content/names.test.ts
import { describe, it, expect } from 'vitest';
import { findSamePhonemes } from '../../src/core/content/names.ts';
import { phonemesOf } from '../../src/core/content/gpc.ts';
import { miniContent } from '../fixtures/mini.ts';

describe('findSamePhonemes', () => {
  const c = miniContent();
  it('finds a list name with the same sounds', () => {
    expect(findSamePhonemes(phonemesOf(['p', 'i', 'p'], c.gpcs), c)).toBe('Pip');
  });
  it('matches by sound, not by spelling', () => {
    expect(findSamePhonemes(phonemesOf(['sh', 'ai'], c.gpcs), c)).toBe('Shay');
  });
  it('returns null for a new name', () => {
    expect(findSamePhonemes(phonemesOf(['p', 'a', 'p'], c.gpcs), c)).toBeNull();
  });
});
