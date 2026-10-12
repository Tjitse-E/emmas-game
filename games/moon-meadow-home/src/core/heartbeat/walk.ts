// The lantern walk (docs/v3/next/plan.md N15 to N20): which stable row comes to the dusk meadow, which names the
// lantern asks, how many babies a free walk leads, and when the mangers are skipped because the visit is long.
// Roll call's logging rule (three heads) stays in rollcall.ts.
import { type Rng, shuffle } from '../rng.ts';
import { type Door, type StableLayout, rowOf } from './stables.ts';
import { meadowBabies } from './meadow.ts';

export const WALK_MAX = 10;               // babies on the dusk meadow: one stable row
export const FREE_LEADS = 3;              // N16: leads in a free walk
export const LONG_VISIT_MS = 20 * 60_000;
export const LONG_VISIT_CHECKED = 30;

export type WalkPick = { baby: string; name: string; door: number };

type Ask = { names: Map<string, string | null>; eligible: (b: string) => boolean };

function rowDoors(layout: StableLayout, row: number): Door[] {
  return (layout.rows[row - 1] ?? []).filter((d) => d.baby !== null);
}

/** Heads of a row that can be asked: a name no other baby of the row shares (any case), and eligible. */
function askable(layout: StableLayout, row: number, a: Ask): Door[] {
  const heads = rowDoors(layout, row);
  const count = new Map<string, number>();
  for (const d of heads) {
    const n = a.names.get(d.baby!)?.toLowerCase();
    if (n) count.set(n, (count.get(n) ?? 0) + 1);
  }
  return heads.filter((d) => {
    const n = a.names.get(d.baby!)?.toLowerCase();
    return !!n && count.get(n) === 1 && a.eligible(d.baby!);
  });
}

/** The row whose askable heads (unique names, eligible, >= 3 heads) have the most due names; ties go to the lower row; null when none. */
export function walkRow(i: { layout: StableLayout; names: Map<string, string | null>; eligible: (b: string) => boolean; isDue: (b: string) => boolean }): number | null {
  let best: number | null = null;
  let bestDue = -1;
  for (let r = 1; r <= i.layout.rows.length; r++) {
    if (rowDoors(i.layout, r).length < 3) continue;
    const a = askable(i.layout, r, i);
    if (!a.length) continue;
    const due = a.filter((d) => i.isDue(d.baby!)).length;
    if (due > bestDue) { best = r; bestDue = due; }
  }
  return best;
}

/** The walk picks of that row: due first, then the rest, at most `count`, unique names. */
export function pickWalk(i: {
  layout: StableLayout; row: number; names: Map<string, string | null>; count: 1 | 2 | 3;
  eligible: (b: string) => boolean; isDue: (b: string) => boolean; rng: Rng;
}): WalkPick[] {
  const options = askable(i.layout, i.row, i);
  const due = shuffle(options.filter((d) => i.isDue(d.baby!)), i.rng);
  const rest = shuffle(options.filter((d) => !i.isDue(d.baby!)), i.rng);
  return [...due, ...rest].slice(0, i.count).map((d) => ({ baby: d.baby!, name: i.names.get(d.baby!)!, door: d.number }));
}

/** Babies on the dusk meadow: the row's babies; without a row with heads, the newest WALK_MAX (meadowBabies order). */
export function duskBabies(layout: StableLayout, row: number | null, herd: readonly { id: string; order: number; favourite?: boolean }[]): string[] {
  if (row !== null) return rowDoors(layout, row).map((d) => d.baby!);
  return meadowBabies(herd, WALK_MAX).map((b) => b.id);
}

/**
 * The stable row shown inside (lane night decision): the walk row, else the row of the newest baby with a door,
 * else row 1. A free walk may lead a camp baby or a baby of another row; it still goes in.
 */
export function stableRowOf(layout: StableLayout, row: number | null, herd: readonly { id: string; order: number }[]): number {
  if (row !== null) return row;
  const withDoor = herd.filter((b) => b.order <= layout.rows.length * 10).sort((a, b) => b.order - a.order);
  return withDoor.length ? rowOf(withDoor[0].order) : 1;
}

/** How many leads a free walk asks for. */
export function freeLeads(dusk: number): number {
  return Math.min(FREE_LEADS, dusk);
}

/** The manger part runs unless the visit is long (N20). A test flag forces long (true) or short (false). */
export function mangerDue(i: { checked: number; visitMs: number; forcedLong: boolean | null }): boolean {
  if (i.forcedLong !== null) return !i.forcedLong;
  return i.checked < LONG_VISIT_CHECKED && i.visitMs < LONG_VISIT_MS;
}
