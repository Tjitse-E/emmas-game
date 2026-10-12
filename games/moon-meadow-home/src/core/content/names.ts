// G/src/core/content/names.ts
import type { Content, Phoneme } from './types.ts';

/** The list name with exactly these sounds ("Lili" finds "Lily"), or null. Contracts C5 return the name itself. */
export function findSamePhonemes(phonemes: readonly Phoneme[], c: Pick<Content, 'names'>): string | null {
  const key = phonemes.join('.');
  return c.names.find(n => n.phonemes.join('.') === key)?.name ?? null;
}
