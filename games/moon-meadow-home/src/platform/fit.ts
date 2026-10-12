import type { Point } from './geometry.ts';

export const STAGE_W = 1180;
export const STAGE_H = 820;

export type Fit = { scale: number; x: number; y: number; portrait: boolean; vw: number; vh: number };

/** Scales the fixed stage to fit the viewport and centres it. The rest is bands in the scene colour. */
export function computeFit(vw: number, vh: number): Fit {
  // A hidden or collapsed viewport can report 0. Keep the scale positive so client points still map.
  const scale = Math.max(0.01, Math.min(vw / STAGE_W, vh / STAGE_H));
  return { scale, x: (vw - STAGE_W * scale) / 2, y: (vh - STAGE_H * scale) / 2, portrait: vh > vw, vw, vh };
}

export function toStagePoint(clientX: number, clientY: number, f: Fit): Point {
  return { x: (clientX - f.x) / f.scale, y: (clientY - f.y) / f.scale };
}
