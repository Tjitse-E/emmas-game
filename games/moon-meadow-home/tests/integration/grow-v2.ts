// A v2 save with a herd of n babies: the first baby of core's fixture cloned n times with fresh ids and names.
// v2 names are letters only (core's import drops anything else), so the names are Babya, Babyb, ... Babyba.
import { makeV2Save } from '../fixtures/v2.ts';

function letters(i: number): string {
  let s = '';
  let n = i;
  do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

export function growV2Save(n: number): Record<string, unknown> {
  const base = makeV2Save();
  const first = (base.herd as Record<string, unknown>[])[0];
  const herd = Array.from({ length: n }, (_, i) => ({ ...first, id: i + 1, name: `baby${letters(i)}`, night: 1 + Math.floor(i / 4) }));
  return { ...base, herd, nextId: n + 1 };
}
