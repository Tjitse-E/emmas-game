// Meadow life (spec 2.5, 2.7): which babies stand in the meadow (at most 12), care tools and the babies' lines.
import type { CareStation } from '../../types/contracts.ts';

export const MEADOW_MAX = 12;   // spec 2.7 and 5.2: the meadow animates at most 12 babies
/** 1.0.1 (docs/v3/next/plan.md F4): the treat tool became the food tray; a food fed to a baby is a treat. */
export type CareTool = 'brush' | 'food' | 'heart';
export type FreeCare = 'brush' | 'treat' | 'cuddle' | 'trick';
export const CARE_OF_TOOL: Record<CareTool, FreeCare> = { brush: 'brush', food: 'treat', heart: 'cuddle' };
/** The tiny fixed word a baby says after a care act (foal lines are in common.json). */
export const FOAL_LINE: Record<Extract<CareStation, FreeCare | 'splash' | 'rollcall'>, string> = {
  brush: 'foal-cuddle', treat: 'foal-yum', cuddle: 'foal-cuddle', trick: 'foal-wee', splash: 'foal-wee', rollcall: 'foal-yawn',
};

/** Favourites first, then the newest, at most `max`. */
export function meadowBabies<T extends { id: string; order: number; favourite?: boolean }>(herd: readonly T[], max = MEADOW_MAX): T[] {
  const newest = (a: T, b: T) => b.order - a.order;
  return [...herd.filter((b) => b.favourite).sort(newest), ...herd.filter((b) => !b.favourite).sort(newest)].slice(0, max);
}
