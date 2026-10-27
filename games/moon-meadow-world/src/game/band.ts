// The maths band and this play's sums (docs/v4/2.2.md 4.2). A play's first maths moment uses band A (4 stones, the
// narrower ranges). A first try moves to band B (5 stones, wider ranges), a helped answer back to A; a miss and the
// door moments leave it. `?maths=a|b` fixes it. The totals and answers asked so far keep sums from repeating.
import type { EggSpec, Outcome } from '../contracts';
import { type Band, nextBand, totalOf } from '../content/eggs';

export { type Band, nextBand, totalOf };

export interface MathsState {
  band: Band;
  /** Set by ?maths=: the band never moves. */
  fixed: boolean;
  /** Totals and answers asked this play (eggs and the hay rack). */
  used: { totals: number[]; answers: number[] };
}

export function startMaths(fixed: Band | null): MathsState {
  return { band: fixed ?? 'a', fixed: fixed !== null, used: { totals: [], answers: [] } };
}

/** Remember a sum that was asked. */
export function useSum(m: MathsState, spec: Pick<EggSpec, 'kind' | 'need' | 'have' | 'answer'>): void {
  m.used.totals.push(totalOf(spec));
  m.used.answers.push(spec.answer);
}

/** Note a result: the band moves unless it is fixed. */
export function noteBand(m: MathsState, outcome: Outcome): void {
  if (!m.fixed) m.band = nextBand(m.band, outcome);
}

export function parseBand(v: string | null): Band | null {
  return v === 'a' || v === 'b' ? v : null;
}
