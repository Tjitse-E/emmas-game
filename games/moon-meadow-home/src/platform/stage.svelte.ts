// The fixed 1180 x 820 stage, scaled to fit, with letterbox bands in the scene colour.
import { computeFit, toStagePoint, type Fit } from './fit.ts';
import type { Point, Rect } from './geometry.ts';

export const stage = $state<{ fit: Fit; bandTop: string; bandBottom: string; el: HTMLElement | null }>({
  fit: computeFit(1180, 820),
  bandTop: '#11163d',
  bandBottom: '#1d4a37',
  el: null,
});

export function refit(): void {
  stage.fit = computeFit(window.innerWidth, window.innerHeight);
}

/** Colour of the letterbox bands above and below (or beside) the stage. Scenes call it on mount. */
export function setBands(top: string, bottom: string = top): void {
  stage.bandTop = top;
  stage.bandBottom = bottom;
}

export const stageEl = (): HTMLElement | null => stage.el;
export const clientToStage = (x: number, y: number): Point => toStagePoint(x, y, stage.fit);

/** An element's box in stage units. */
export function elementRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  const f = stage.fit;
  return { x: (r.left - f.x) / f.scale, y: (r.top - f.y) / f.scale, w: r.width / f.scale, h: r.height / f.scale };
}
