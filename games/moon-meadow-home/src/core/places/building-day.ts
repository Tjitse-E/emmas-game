// Building Day scene rules (Task A13): the pure part of src/scenes/places/BuildingDay.svelte and its parts.
// Which moments a part plays, what is logged when a part ends, plank rows, the ribbon swipe and the sign's
// spelling steps. The tasks themselves (wall, trim, sign) are Task A12's, in building.ts.
import { graphemeItem } from '../keys.ts';
import type { PlaceAction } from './actions.ts';
import { nextPart, rowOfPlot, trimTask, wallTask, type PartId, type SignDef, type TrimTask, type WallTask } from './building.ts';
import type { Result, Rng, ServedItem, StepId } from './types.ts';

/** Bead colours of the trim as paint. */
export const BEAD_HEX: Readonly<Record<string, string>> = {
  pink: '#ff9cc8', blue: '#8cc8ff', gold: '#ffd75e', green: '#8fdc9a', purple: '#b89cff',
};

/**
 * What to dispatch when a part ends: `building.part` (a row's name is logged by `row.named` instead) and
 * `building.done` after the last part. `done` holds the parts finished before this one.
 */
export function afterPart(plot: string, part: PartId, done: readonly string[]): { actions: PlaceAction[]; built: boolean } {
  const actions: PlaceAction[] = [];
  if (part !== 'row-name') actions.push({ type: 'place/part', plot, part });
  const built = nextPart(plot, [...done, part]) === null;
  if (built) actions.push({ type: 'place/built', plot });
  return { actions, built };
}

const distinct = (items: (ServedItem | null)[]): ServedItem[] => {
  const seen = new Set<string>();
  const out: ServedItem[] = [];
  for (const it of items) {
    if (!it || seen.has(it.carrier)) continue;
    seen.add(it.carrier);
    out.push(it);
  }
  return out;
};

/**
 * The walls of the walls part (R38): one per served item (current, then review), the same fact once. Items
 * that are not `a+b` facts are dropped. Nothing left: one free wall of ten, not logged (decision D7).
 */
export function wallMoments(items: (ServedItem | null)[], rng: Rng): WallTask[] {
  const out = distinct(items).map((it) => wallTask(it, rng)).filter((t) => t.served !== null);
  return out.length ? out : [wallTask(null, rng)];
}

/** The trims of the trim part: one per served pattern, else one free trim. */
export function trimMoments(items: (ServedItem | null)[], rng: Rng): TrimTask[] {
  const out = distinct(items).map((it) => trimTask(it, rng)).filter((t) => t.checked);
  return out.length ? out : [trimTask(null, rng)];
}

/** Plank spots per row: one row up to five, two rows above five (the longer row at the bottom). */
export function plankRows(total: number): number[] {
  const n = Math.max(1, Math.round(total));
  return n <= 5 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
}

/** The ribbon is cut when the pointer travels more than 120 px while it is down. */
export function isCut(x0: number, y0: number, x1: number, y1: number): boolean {
  return Math.hypot(x1 - x0, y1 - y0) > 120;
}

/** The content a sign needs: words, grapheme texts and spelling items. */
export type SignContent = {
  words: Record<string, { gpcs: string[] } | undefined>;
  gpcs: Record<string, { id: string; text: string } | undefined>;
  items: Record<string, { step: StepId } | undefined>;
};

/**
 * The spelling step of each sign grapheme (null when it has no spelling item). The sign word's own GPCs
 * come first; otherwise the grapheme text names its GPC.
 */
export function signSteps(sign: SignDef, c: SignContent): (StepId | null)[] {
  const own = c.words[sign.word]?.gpcs;
  const fit = own && own.length === sign.graphemes.length ? own : null;
  return sign.graphemes.map((g, i) => {
    const gpc = fit?.[i] ?? (c.gpcs[g] ? g : Object.values(c.gpcs).find((x) => x?.text === g)?.id ?? null);
    return gpc ? c.items[graphemeItem('s', gpc)]?.step ?? null : null;
  });
}

/** Per slot of the name sign: null for a given slot, else first, or miss when that slot was wrong once. */
export function signSlotResults(own: readonly boolean[], wrongOnce: ReadonlySet<number>, result: Result): (Result | null)[] {
  return own.map((o, i) => (!o ? null : result === 'helped' ? 'helped' : wrongOnce.has(i) ? 'miss' : 'first'));
}

/** The row number of a row plot, or 0 for other plots. */
export const rowNumber = (plot: string): number => rowOfPlot(plot) ?? 0;
