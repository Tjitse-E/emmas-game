// Pure stage geometry: drag threshold, drop target snapping and the moonbeam shape. Units are stage pixels.

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export function pastThreshold(dx: number, dy: number, threshold: number): boolean {
  return dx * dx + dy * dy >= threshold * threshold;
}

export function distanceToRect(p: Point, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** The closest target within snap. Ties (a point inside nested targets) go to the smaller target. */
export function nearestTarget(p: Point, targets: { id: string; rect: Rect }[], snap: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  let bestArea = Infinity;
  for (const t of targets) {
    const d = distanceToRect(p, t.rect);
    if (d > snap) continue;
    const area = t.rect.w * t.rect.h;
    if (d < bestD || (d === bestD && area < bestArea)) {
      best = t.id;
      bestD = d;
      bestArea = area;
    }
  }
  return best;
}

/** One rectangle around all rects, padded and kept inside bounds. Null for no rects. */
export function unionRect(rects: Rect[], pad: number, bounds: Rect): Rect | null {
  if (rects.length === 0) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
  }
  x1 = Math.max(bounds.x, x1 - pad);
  y1 = Math.max(bounds.y, y1 - pad);
  x2 = Math.min(bounds.x + bounds.w, x2 + pad);
  y2 = Math.min(bounds.y + bounds.h, y2 + pad);
  return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
}

/** A CSS clip-path: a narrow strip of sky that widens down to the bottom of the lit area. */
export function beamPolygon(r: Rect): string {
  const cx = r.x + r.w / 2;
  const half = Math.max(20, r.w * 0.2);
  const f = (n: number): string => `${Math.round(n * 10) / 10}px`;
  return `polygon(${f(cx - half)} 0px, ${f(cx + half)} 0px, ${f(r.x + r.w)} ${f(r.y + r.h)}, ${f(r.x)} ${f(r.y + r.h)})`;
}
