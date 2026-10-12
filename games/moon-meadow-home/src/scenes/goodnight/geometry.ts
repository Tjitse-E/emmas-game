// Stage geometry of the goodnight scene (1180 x 820 stage pixels, docs/v3/next/plan.md N3 and 3.7).
// Movement along a path is a list of points animated with transform (no CSS offset-path: Safari 15).
import type { Point } from '../../platform/geometry.ts';

/** Where the babies of the dusk meadow stand (centre points), left two thirds, clear of the lantern and the path. */
export const DUSK_SPOTS: readonly Point[] = [
  { x: 120, y: 300 }, { x: 310, y: 290 }, { x: 140, y: 490 }, { x: 340, y: 470 }, { x: 530, y: 500 },
  { x: 110, y: 690 }, { x: 300, y: 690 }, { x: 490, y: 700 }, { x: 680, y: 710 }, { x: 720, y: 570 },
];
/** The lantern on its post (centre of the lamp). */
export const LANTERN: Point = { x: 520, y: 120 };
/** The stable gate (centre) at the right. */
export const GATE: Point = { x: 1010, y: 450 };
/** The glowing path from under the lantern to the gate, as 8 points. */
export const PATH: readonly Point[] = [
  { x: 560, y: 330 }, { x: 630, y: 350 }, { x: 700, y: 375 }, { x: 770, y: 400 },
  { x: 840, y: 420 }, { x: 900, y: 435 }, { x: 950, y: 445 }, { x: GATE.x, y: GATE.y },
];

/** The SVG path of the glowing path (a smooth line through PATH). */
export function pathD(points: readonly Point[] = PATH): string {
  return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}

/** The walk of a led baby: from its spot onto the path and along it into the gate, as offsets from the spot. */
export function walkOffsets(from: Point, points: readonly Point[] = PATH): Point[] {
  return [{ x: 0, y: 0 }, ...points.map((p) => ({ x: p.x - from.x, y: p.y - from.y }))];
}

/** A stall of the stable row: the row's ten doors as a 5 by 2 ten-frame. */
export const STALL_W = 210;
export const STALL_H = 320;
export function stallBox(index: number): { x: number; y: number; w: number; h: number } {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return { x: 40 + col * 224, y: row === 0 ? 140 : 480, w: STALL_W, h: STALL_H };
}
/** The manger centre of a stall (plan N3: (x + 56, y + 270)). */
export function mangerOf(index: number): Point {
  const b = stallBox(index);
  return { x: b.x + 56, y: b.y + 270 };
}
