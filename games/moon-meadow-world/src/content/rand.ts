// Randomness for the content functions. Every function takes a `rand: () => number` (0 inclusive to 1 exclusive),
// so tests and the flows can pass a seeded one and get the same level every time.

export type Rand = () => number;

/** A small seeded generator (mulberry32). The same seed gives the same sequence. */
export function seeded(seed: number): Rand {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit hash of a label (FNV-1a). */
export function hash(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A moment's own generator: the same seed and label give the same sequence. Each moment draws from its own stream
 * (g.randFor('egg1'), 'wish1', 'picnic', ...), so the customiser or a quest never shifts a later sum or word, and
 * ?at=egg2&seed=5 gives the same egg as a full play with seed 5.
 */
export function stream(seed: number, label: string): Rand {
  return seeded(seed ^ hash(label));
}

/** A whole number from lo to hi, both included. */
export function between(rand: Rand, lo: number, hi: number): number {
  return lo + Math.min(hi - lo, Math.floor(rand() * (hi - lo + 1)));
}

export function pick<T>(rand: Rand, xs: readonly T[]): T {
  if (xs.length === 0) throw new Error('pick from an empty list');
  return xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))];
}

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(rand: Rand, xs: readonly T[]): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
