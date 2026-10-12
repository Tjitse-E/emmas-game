// What the ghost hand and the moonbeam point at.
import type { Point, Rect } from '../platform/geometry.ts';
import { elementRect, stageEl } from '../platform/stage.svelte.ts';

/** An element, an aria-label inside the stage, or a stage point. */
export type Target = Element | string | Point;

export function findByLabel(label: string): Element | null {
  const root = stageEl();
  return root ? root.querySelector(`[aria-label="${CSS.escape(label)}"]`) : null;
}

export function rectOf(t: Target): Rect | null {
  if (typeof t === 'string') {
    const el = findByLabel(t);
    if (!el) { console.warn(`[ui] no element with label ${t}`); return null; }
    return elementRect(el);
  }
  if (t instanceof Element) return elementRect(t);
  return { x: t.x - 40, y: t.y - 40, w: 80, h: 80 };
}

export function centreOf(t: Target): Point | null {
  const r = rectOf(t);
  return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null;
}
