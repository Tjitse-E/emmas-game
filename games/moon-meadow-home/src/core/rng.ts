// Contracts section 1 verbatim (docs/v3/plan/contracts.ts, R25): the one random generator.
export type Rng = () => number; // [0, 1)
/** mulberry32, as v2. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const makeRng = mulberry32;
export function pick<T>(xs: readonly T[], rng: Rng): T {
  if (xs.length === 0) throw new Error('pick from an empty list');
  return xs[Math.floor(rng() * xs.length)];
}
export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

