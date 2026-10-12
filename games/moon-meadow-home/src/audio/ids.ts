/**
 * Audio clip ids. The id builders live in one owner file, src/core/keys.ts (contracts C12, R40); this file
 * re-exports them and adds only audio's own helpers.
 */
import { slug } from '../core/keys.ts';

export { slug, slugName, wordId, nameId, phraseId, numId, bondId, ordId } from '../core/keys.ts';
export type { NumKind } from '../core/keys.ts';
export type { NameMark, DynamicClipId } from '../types/contracts.ts';

export type WordId = `word-${string}`;
export type PhraseId = `phrase-${string}`;
export type NameClipId = `name-${string}`;
export type NumId = `num-${string}`;
export type OrdId = `ord-${number}`;
export type DynamicId = WordId | PhraseId | NameClipId | NumId | OrdId;

/** Clip ids built at runtime from content. The facade skips one that has no clip instead of playing it. */
export const DYNAMIC_PREFIXES = ['word-', 'phrase-', 'name-', 'num-', 'ord-'] as const;

/** "Seven brushes." for a parcel of seven: num-parcel-7-brushes. */
export function parcelId(n: number, plural: string): NumId {
  return `num-parcel-${n}-${slug(plural)}`;
}

export function isDynamic(id: string): boolean {
  return DYNAMIC_PREFIXES.some((p) => id.startsWith(p));
}
