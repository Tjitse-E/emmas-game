import type { Result } from './types.ts';

// Spec 3.3 as read in places.md D1 (master R31, L1): level 2 here means an idle-triggered focused hint;
// level 3 is the ghost hand. An answer after either is helped. A miss followed by a right answer stays a miss.
export function momentResult(misses: number, hintLevel: number): Result {
  if (hintLevel >= 2) return 'helped';
  return misses > 0 ? 'miss' : 'first';
}
