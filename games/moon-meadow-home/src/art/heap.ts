// Heap and jar layouts (art stream Task A6, R12). Positions are fractions of a square box, centre of each copy.
import { mulberry32 } from '../core/rng.ts';

export { mulberry32 };

export type Placement = { x: number; y: number; scale: number; rot: number; z: number };

const HEAP: Record<number, [number, number][]> = {
  3: [[0.32, 0.66], [0.68, 0.66], [0.5, 0.4]],
  4: [[0.3, 0.68], [0.7, 0.68], [0.38, 0.4], [0.64, 0.42]],
  5: [[0.24, 0.7], [0.5, 0.72], [0.76, 0.7], [0.37, 0.42], [0.63, 0.42]],
};
const JAR: Record<number, [number, number][]> = {
  1: [[0.5, 0.6]],
  2: [[0.33, 0.6], [0.67, 0.6]],
  3: [[0.27, 0.68], [0.73, 0.68], [0.5, 0.36]],
  4: [[0.3, 0.7], [0.7, 0.7], [0.3, 0.36], [0.7, 0.36]],
  5: [[0.25, 0.72], [0.5, 0.72], [0.75, 0.72], [0.37, 0.38], [0.63, 0.38]],
};

/** Back to front: copies higher in the box are drawn first. */
function stack(ps: Placement[]): Placement[] {
  [...ps].sort((a, b) => a.y - b.y).forEach((p, i) => { p.z = i; });
  return ps;
}

function place(t: [number, number][], seed: number, jitter: number, scale: [number, number], rot: number): Placement[] {
  const r = mulberry32(seed);
  return stack(t.map(([x, y]) => ({ x: x + (r() * 2 - 1) * jitter, y: y + (r() * 2 - 1) * jitter,
    scale: scale[0] + r() * (scale[1] - scale[0]), rot: (r() * 2 - 1) * rot, z: 0 })));
}

export function heapLayout(count: number, seed: number): Placement[] {
  if (!Object.prototype.hasOwnProperty.call(HEAP, count)) throw new RangeError(`heap of ${count}`);
  return place(HEAP[count], seed, 0.04, [0.5, 0.62], 18);
}

export function jarLayout(count: number, seed: number): Placement[] {
  if (!Object.prototype.hasOwnProperty.call(JAR, count)) throw new RangeError(`jar of ${count}`);
  return place(JAR[count], seed, 0.01, count >= 4 ? [0.26, 0.26] : [0.3, 0.3], 10);
}

/** Six or more copies: a centred grid, one copy per cell, so each one can still be counted. */
function gridLayout(count: number, seed: number): Placement[] {
  const r = mulberry32(seed);
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cell = 1 / Math.max(cols, rows);
  const top = (1 - rows * cell) / 2;
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const left = (1 - inRow * cell) / 2;
    out.push({ x: left + (i - row * cols + 0.5) * cell, y: top + (row + 0.5) * cell, scale: cell * 0.9, rot: (r() * 2 - 1) * 6, z: 0 });
  }
  return stack(out);
}

/**
 * The layout a component draws. Never throws: 0 or less draws nothing, a heap of 1 or 2 uses the jar
 * layout, 3 to 5 the asked layout, and 6 or more a grid.
 */
export function layoutFor(count: number, seed: number, mode: 'heap' | 'jar' = 'heap'): Placement[] {
  const n = Number.isFinite(count) ? Math.floor(count) : 0;
  const s = Number.isFinite(seed) ? seed : 1;
  if (n <= 0) return [];
  if (n > 5) return gridLayout(n, s);
  if (mode === 'heap' && n >= 3) return heapLayout(n, s);
  return jarLayout(n, s);
}
