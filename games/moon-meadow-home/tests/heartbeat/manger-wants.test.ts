// Free feeding at the mangers (review 2026-10-13): babies in neighbouring stalls want different foods. The stable
// row is a 5 by 2 ten-frame, so door 3's neighbours are 2, 4 and 8, and door 6's are 1 and 7.
import { describe, expect, it } from 'vitest';
import { mangerWants } from '../../src/core/heartbeat/feed.ts';
import { makeRng } from '../../src/core/rng.ts';

function neighbours(d: number): number[] {
  const base = Math.floor((d - 1) / 10) * 10;
  const i = (d - 1) % 10, col = i % 5, line = Math.floor(i / 5);
  const out: number[] = [];
  if (col > 0) out.push(d - 1);
  if (col < 4) out.push(d + 1);
  out.push(base + (line ? col : col + 5) + 1);
  return out;
}
function clashes(w: Record<number, string>): string[] {
  const out: string[] = [];
  for (const [k, f] of Object.entries(w)) {
    for (const n of neighbours(Number(k))) if (w[n] === f) out.push(`${k}-${n} ${f}`);
  }
  return out;
}

describe('mangerWants neighbours', () => {
  const full = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('gives side-by-side and stacked stalls different foods with three tray foods', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const w = mangerWants(full, ['apple', 'carrot', 'peach'], makeRng(seed));
      expect(Object.keys(w).map(Number).sort((a, b) => a - b)).toEqual(full);
      expect(clashes(w)).toEqual([]);
    }
  });
  it('does not depend on the order of the spots (walked babies come first)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const w = mangerWants([7, 3, 1, 2, 6, 8, 4, 5, 9, 10], ['apple', 'carrot', 'peach'], makeRng(seed));
      expect(clashes(w)).toEqual([]);
    }
  });
  it('alternates two foods like a chessboard, also with empty stalls', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const w = mangerWants([2, 3, 6, 9, 10, 4], ['apple', 'plum'], makeRng(seed));
      expect(clashes(w)).toEqual([]);
    }
  });
  it('treats each row of ten on its own (doors 11 to 20)', () => {
    const w = mangerWants([11, 12, 16, 17], ['apple', 'carrot', 'peach'], makeRng(3));
    expect(clashes(w)).toEqual([]);
    expect(Object.keys(w).length).toBe(4);
  });
  it('with one food every baby wants it', () => {
    expect(mangerWants([1, 2, 6], ['apple'], makeRng(1))).toEqual({ 1: 'apple', 2: 'apple', 6: 'apple' });
  });
});
