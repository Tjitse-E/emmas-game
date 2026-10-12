// Hybrid logical clock. Encoded as "<13 digit ms>-<4 base36 counter>", so string order is clock order.
export type Hlc = { wall: number; n: number };

export const HLC_RE = /^\d{13}-[0-9a-z]{4}$/;
export const HLC_MAX_N = 36 ** 4 - 1;
export const HLC_ZERO: Hlc = { wall: 0, n: 0 };

export function formatHlc(h: Hlc): string {
  return String(h.wall).padStart(13, '0') + '-' + h.n.toString(36).padStart(4, '0');
}

export function parseHlc(s: string): Hlc | null {
  if (!HLC_RE.test(s)) return null;
  return { wall: Number(s.slice(0, 13)), n: parseInt(s.slice(14), 36) };
}

export function compareHlc(a: Hlc, b: Hlc): number {
  return a.wall !== b.wall ? a.wall - b.wall : a.n - b.n;
}

/** The next clock value for a local event: never below the last value, even when the device clock jumps back. */
export function tick(last: Hlc, now: number): Hlc {
  const wall = Math.max(last.wall, Math.floor(now));
  if (wall !== last.wall) return { wall, n: 0 };
  if (last.n >= HLC_MAX_N) return { wall: wall + 1, n: 0 };
  return { wall, n: last.n + 1 };
}

/** The highest of `last` and every parseable clock in `seen`. */
export function maxHlc(last: Hlc, seen: Iterable<string>): Hlc {
  let best = last;
  for (const s of seen) {
    const h = parseHlc(s);
    if (h && compareHlc(h, best) > 0) best = h;
  }
  return best;
}
