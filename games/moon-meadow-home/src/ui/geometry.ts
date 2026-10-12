// Pure layout helpers for the heartbeat touch parts: the sound slider, dice dots and the loose scatter.
// Drag, drop and snapping are platform's (src/platform/input.ts, R11); heaps are art's (R12).
import { makeRng } from '../core/rng.ts';

export type Point = { x: number; y: number };

/** The index of the centre closest to x, or -1 when there are no centres. */
export function sliderIndex(x: number, centres: readonly number[]): number {
  let best = -1;
  centres.forEach((c, i) => { if (best < 0 || Math.abs(c - x) < Math.abs(centres[best] - x)) best = i; });
  return best;
}

const DICE: Record<number, Point[]> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 28, y: 28 }, { x: 72, y: 72 }],
  3: [{ x: 26, y: 26 }, { x: 50, y: 50 }, { x: 74, y: 74 }],
  4: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
  5: [{ x: 26, y: 26 }, { x: 74, y: 26 }, { x: 50, y: 50 }, { x: 26, y: 74 }, { x: 74, y: 74 }],
  6: [{ x: 28, y: 22 }, { x: 72, y: 22 }, { x: 28, y: 50 }, { x: 72, y: 50 }, { x: 28, y: 78 }, { x: 72, y: 78 }],
};

/** Dice dots for 1 to 6, in percent of the stone. */
export function dicePoints(n: number): Point[] {
  const d = DICE[n];
  if (!d) throw new RangeError(`dicePoints: ${n}`);
  return d;
}

/**
 * A loose scatter of n dots in percent of the stone, never a ten-frame grid (spec 2.6).
 * Seeded, so a stone always looks the same. The gap shrinks for big counts so every dot fits.
 */
export function scatterPoints(n: number, seed: number): Point[] {
  const rng = makeRng(seed * 31 + n);
  const radius = 34;
  let gap = Math.min(15, Math.max(6, Math.floor(56 / Math.sqrt(Math.max(1, n)))));
  const pts: Point[] = [];
  let tries = 0;
  while (pts.length < n) {
    if (tries++ > 4000) { gap -= 1; tries = 0; pts.length = 0; if (gap < 3) break; }
    const p = { x: Math.round(50 - radius + rng() * radius * 2), y: Math.round(50 - radius + rng() * radius * 2) };
    if (Math.hypot(p.x - 50, p.y - 50) > radius) continue;
    if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= gap)) pts.push(p);
  }
  return pts;
}

/** Drop target id of gem slot i in a GemSlots row (registered with platform's use:dropTarget). */
export function slotTargetId(i: number, prefix = 'slot'): string {
  return `${prefix}-${i}`;
}

/** The slot index of a drop target id from slotTargetId, or null for any other target. */
export function slotIndexOf(id: string | null, prefix = 'slot'): number | null {
  if (id === null || !id.startsWith(`${prefix}-`)) return null;
  const n = Number(id.slice(prefix.length + 1));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Dot size for a stone in percent: smaller dots for bigger counts so a scatter of 20 still reads. */
export function dotSize(n: number): number {
  return n <= 6 ? 14 : n <= 10 ? 11 : 8;
}
