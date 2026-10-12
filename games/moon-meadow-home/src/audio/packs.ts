import type { PackSpec } from './facade.ts';

/** Audio packs in load order (contracts C8). The player looks a clip up in the first pack that lists it. */
export const PACKS = [
  'core', 'numbers', 'words-phase2', 'words-phase3-4', 'words-year1',
  'phrases-meadow', 'phrases-notes', 'phrases-salon', 'places', 'area-stable-yard', 'area-village-lane',
  'names-t1', 'names-new',
] as const;
export type PackName = (typeof PACKS)[number];

/** Name packs are fetched fresh (no-cache), so new names reach the iPad on the next start without a rebuild (AD13). */
export const PACK_SPECS: readonly PackSpec[] = PACKS.map((name) => ({ name, fresh: name.startsWith('names-') }));
