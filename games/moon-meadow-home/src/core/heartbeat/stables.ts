// Stable rows of ten, the Moonbeam Camp, pages of twenty doors and door visit rules. Door items use learning's ids ('m:num:7').
import { type Rng, pick } from '../rng.ts';
import type { StepState } from './types.ts';

export const ROW_SIZE = 10;
export const PAGE_ROWS = 2;

export type Door = { number: number; row: number; baby: string | null };
export type StableLayout = { rows: Door[][]; camp: string[] };

export function rowOf(n: number): number {
  return Math.ceil(n / ROW_SIZE);
}
export function pageOf(n: number): number {
  return Math.ceil(rowOf(n) / PAGE_ROWS);
}
export function hasDoor(order: number, rowsBuilt: number): boolean {
  return rowOf(order) <= rowsBuilt;
}

export function stableLayout(herd: { id: string; order: number }[], rowsBuilt: number): StableLayout {
  const rows: Door[][] = [];
  for (let r = 1; r <= rowsBuilt; r++) {
    rows.push(Array.from({ length: ROW_SIZE }, (_, i) => ({ number: (r - 1) * ROW_SIZE + i + 1, row: r, baby: null })));
  }
  const camp: string[] = [];
  for (const b of [...herd].sort((a, c) => a.order - c.order)) {
    if (hasDoor(b.order, rowsBuilt)) rows[rowOf(b.order) - 1][(b.order - 1) % ROW_SIZE].baby = b.id;
    else camp.push(b.id);
  }
  return { rows, camp };
}

export function pageCount(layout: StableLayout): number {
  return Math.max(1, Math.ceil(layout.rows.length / PAGE_ROWS));
}
export function pageDoors(layout: StableLayout, page: number): Door[] {
  return layout.rows.slice((page - 1) * PAGE_ROWS, page * PAGE_ROWS).flat();
}

export function rowsEarned(herdCount: number): number {
  return Math.max(1, Math.ceil(herdCount / ROW_SIZE));
}

export function visitRange(status: (step: string) => StepState): 0 | 10 | 20 | 50 | 100 {
  const ok = (s: string) => ['current', 'passed', 'placed'].includes(status(s));
  if (ok('M28')) return 100;
  if (ok('M27')) return 50;
  if (ok('M07')) return 20;
  if (ok('M02')) return 10;
  return 0;
}

export function rangeStep(range: number): 'M02' | 'M07' | 'M27' | 'M28' | null {
  return range === 10 ? 'M02' : range === 20 ? 'M07' : range === 50 ? 'M27' : range === 100 ? 'M28' : null;
}

export function shouldVisit(input: { range: number; secure: boolean; babyOrder: number }): boolean {
  if (input.range === 0) return false;
  return input.secure ? input.babyOrder % 3 === 0 : true;
}

export function pickVisitDoor(layout: StableLayout, range: number, own: number, rng: Rng): number | null {
  const doors = layout.rows.flat().filter((d) => d.baby !== null && d.number <= range && d.number !== own);
  return doors.length ? pick(doors, rng).number : null;
}

export function doorItem(n: number): { step: 'M02' | 'M07'; id: string } {
  return { step: n <= 10 ? 'M02' : 'M07', id: `m:num:${n}` };
}
