// G/src/core/learning/ids.ts
// Item id helpers. Name keys and grapheme ids come from src/core/keys.ts (contracts C12, R40); no local copy.
import type { ItemId, LearnStrand } from '../content/types.ts';

export { nameKey, slugName, nameItemId, graphemeItem } from '../keys.ts';

export function itemStrand(id: ItemId): LearnStrand | null {
  if (id.startsWith('name:')) return 'name';
  if (id[1] === ':' && (id[0] === 'r' || id[0] === 's' || id[0] === 'm')) return id[0];
  return null;
}
export const isNameItem = (id: ItemId): boolean => id.startsWith('name:');
