// The light contrast after a wrong wish item (docs/v4/2.2.md 3.1): which printed units of the wish word and of the
// wrong picture's word differ. Pure, so tests/reading.test.ts checks it in node.
import type { PrintUnit } from './geometry';

/**
 * The units that differ, by position, as indexes into `a` (the wish word) and `b` (the wrong word). With the same
 * number of units, each position whose letters differ glows (seal and sail: the middle). With different numbers,
 * everything from the first difference glows in both (plum and pie: l, u, m and ie).
 */
export function diffUnits(a: readonly PrintUnit[], b: readonly PrintUnit[]): { a: number[]; b: number[] } {
  const same = (i: number) => a[i]?.text.toLowerCase() === b[i]?.text.toLowerCase();
  if (a.length === b.length) {
    const d = a.map((_, i) => i).filter((i) => !same(i));
    return { a: d, b: d };
  }
  let from = 0;
  while (from < Math.min(a.length, b.length) && same(from)) from++;
  const tail = (n: number) => Array.from({ length: Math.max(0, n - from) }, (_, i) => from + i);
  return { a: tail(a.length), b: tail(b.length) };
}
