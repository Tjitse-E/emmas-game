// The maths band and this play's sums (docs/v4/2.2.md 4.2). A play's first maths moment uses band A (4 stones, the
// narrower ranges). A first try moves to band B (5 stones, wider ranges), a helped answer back to A; a miss and the
// door moments leave it. `?maths=a|b` fixes it. The totals and answers asked so far keep sums from repeating; 2.4.0's
// `asked` keeps any sum and any take-away fact from coming twice in a play (docs/v4/2.4.md section 5.3).
import type { EggSpec, Outcome } from '../contracts';
import { type AskedSums, type Band, emptyAsked, nextBand, noteAsked, totalOf } from '../content/eggs';

export { type Band, nextBand, totalOf };

export interface MathsState {
  band: Band;
  /** Set by ?maths=: the band never moves. */
  fixed: boolean;
  /** Totals and answers asked this play (eggs and the hay rack). */
  used: { totals: number[]; answers: number[] };
  /** What this play asked per kind and grade, its sums and its take-away facts (2.4.0: no sum twice). */
  asked: AskedSums;
}

export function startMaths(fixed: Band | null): MathsState {
  return { band: fixed ?? 'a', fixed: fixed !== null, used: { totals: [], answers: [] }, asked: emptyAsked() };
}

/**
 * Remember a sum that was asked: its total and answer, and for "no sum twice" its answer under its kind and grade (the
 * hay rack's as a warm sum of its total's grade), the sum, and a snow or star sum's take-away fact.
 */
export function useSum(m: MathsState, spec: Pick<EggSpec, 'kind' | 'need' | 'have' | 'answer'> & Partial<Pick<EggSpec, 'grade' | 'skin'>>): void {
  m.used.totals.push(totalOf(spec));
  m.used.answers.push(spec.answer);
  noteAsked(m.asked, spec);
}

/** Note a result: the band moves unless it is fixed. */
export function noteBand(m: MathsState, outcome: Outcome): void {
  if (!m.fixed) m.band = nextBand(m.band, outcome);
}

export function parseBand(v: string | null): Band | null {
  return v === 'a' || v === 'b' ? v : null;
}
