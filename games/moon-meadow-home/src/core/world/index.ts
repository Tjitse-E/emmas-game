// The core slices, in fold order. Facts come first, because other slices ask whether an event won its key.
import { createFolder } from '../fold/engine.ts';
import type { AnySlice, Folder, StateOf } from '../fold/engine.ts';
import { cosmeticsSlice } from './cosmetics.ts';
import { factsSlice } from './facts.ts';
import { herdSlice } from './herd.ts';
import { namesSlice } from './names.ts';
import { diagSlice, settingsSlice } from './settings.ts';
import { visitsSlice } from './visits.ts';

export const CORE_SLICES = [factsSlice, visitsSlice, herdSlice, namesSlice, cosmeticsSlice, settingsSlice, diagSlice] as const;
export type CoreState = StateOf<typeof CORE_SLICES>;

/** The game's folder: the core slices, then the slices of other workstreams (learner, plots, openings, ...). */
export function createGameFolder<const X extends readonly AnySlice[]>(extra: X): Folder<CoreState & StateOf<X>> {
  return createFolder([...CORE_SLICES, ...extra]) as unknown as Folder<CoreState & StateOf<X>>;
}
