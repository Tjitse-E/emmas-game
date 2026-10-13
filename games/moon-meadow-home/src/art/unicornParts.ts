import type { AnchorName, OutfitSlot, PartAnim, PartId, PictureEntry, Point, Stage, Tint, UnicornEntry } from './manifest.ts';

export type LayerLayout = { src: string; tint: Tint; left: number; top: number; width: number; height: number };
export type PartLayout = { id: PartId; left: number; top: number; width: number; height: number; originX: number; originY: number; anim: PartAnim; hidden: boolean; layers: LayerLayout[] };
export type UnicornLayout = { rendition: 'sm' | 'lg'; k: number; width: number; height: number; parts: PartLayout[] };
export type Box = { left: number; top: number; width: number; height: number };
export type AnimName = PartAnim | 'breath' | 'bob';

export const SLOT_WIDTH: Record<OutfitSlot, number> = { head: 0.34, neck: 0.3, back: 0.46, mane: 0.2, flank: 0.12 };
export const SLOT_ANCHOR: Record<OutfitSlot, AnchorName> = { head: 'head', neck: 'neck', back: 'back', mane: 'mane', flank: 'flank' };
export const ANIM_PERIOD: Record<AnimName, number> = { none: 0, tail: 2.4, blink: 5.2, head: 4, leg: 0.7, mane: 3, breath: 3.2, bob: 0.7 };

export function chooseRendition(entry: UnicornEntry, heightCss: number, dpr: number): 'sm' | 'lg' {
  const smPx = entry.h * entry.renditions.sm.scale;
  return heightCss * dpr <= smPx * 1.1 ? 'sm' : 'lg';
}

export function layoutUnicorn(entry: UnicornEntry, heightCss: number, dpr: number): UnicornLayout {
  const rendition = chooseRendition(entry, heightCss, dpr);
  const k = heightCss / entry.h;
  const parts = entry.renditions[rendition].parts.map((p) => ({
    id: p.id, left: p.box[0] * k, top: p.box[1] * k, width: p.box[2] * k, height: p.box[3] * k,
    originX: (p.pivot[0] - p.box[0]) * k, originY: (p.pivot[1] - p.box[1]) * k, anim: p.anim, hidden: !!p.hidden,
    layers: p.layers.map((l) => ({ src: l.src, tint: l.tint, left: (l.box[0] - p.box[0]) * k, top: (l.box[1] - p.box[1]) * k,
      width: l.box[2] * k, height: l.box[3] * k })),
  }));
  return { rendition, k, width: entry.w * k, height: heightCss, parts };
}

export function anchorCss(entry: UnicornEntry, name: AnchorName, heightCss: number) {
  const k = heightCss / entry.h;
  const [x, y] = entry.anchors[name];
  return { x: x * k, y: y * k };
}

/**
 * Where food sits while a baby munches (docs/v3/next/plan.md N24), as a fraction of the frame height from the eye
 * anchor. The art has no mouth anchor; the muzzle tip and the chin were measured on every sprite (2026-10-13) and
 * sit at the same place relative to the eye within a few pixels per stage. The food is centred just in front of
 * the muzzle at the mouth line, so its bitten (left) side is at the mouth and it never covers the eye.
 */
export const MOUTH_FROM_EYE: Record<Stage, Point> = { baby: [160 / 720, 92 / 720], foal: [145 / 720, 76 / 720] };
/** The food's side as a fraction of the unicorn's drawn height. */
export const MUNCH_SIZE = 0.32;
/** The drawn fallback unicorn's mouth, in its 400 x 330 frame (just in front of the muzzle ellipse). */
export const FALLBACK_MOUTH: Point = [356, 128];

/** The centre of the munched food, in CSS px from the unicorn's top-left corner (facing right). */
export function mouthCss(entry: UnicornEntry, heightCss: number): { x: number; y: number } {
  const k = heightCss / entry.h;
  const [ex, ey] = entry.anchors.eye;
  const [fx, fy] = MOUTH_FROM_EYE[entry.stage] ?? MOUTH_FROM_EYE.baby;
  return { x: (ex + fx * entry.h) * k, y: (ey + fy * entry.h) * k };
}

export function outfitPlacement(entry: UnicornEntry, pic: PictureEntry | undefined, slot: OutfitSlot, heightCss: number): Box | null {
  if (!pic) return null;
  const k = heightCss / entry.h;
  const width = entry.w * k * SLOT_WIDTH[slot];
  const s = width / pic.w;
  const attach = pic.attach ?? [pic.w / 2, pic.h / 2];
  const a = anchorCss(entry, SLOT_ANCHOR[slot], heightCss);
  return { left: a.x - attach[0] * s, top: a.y - attach[1] * s, width, height: pic.h * s };
}

export function headCrop(entry: UnicornEntry, heightCss: number) {
  const [x, y, , h] = entry.headBox;
  const k = heightCss / h;
  return { left: 0 - x * k, top: 0 - y * k, width: entry.w * k, height: entry.h * k, size: heightCss }; // 0 - n avoids -0
}

export function animDelay(seed: number, anim: AnimName): number {
  const p = ANIM_PERIOD[anim];
  if (!p) return 0;
  const t = Math.sin((seed + 1) * 12.9898 + p * 78.233) * 43758.5453;
  return -Number(((t - Math.floor(t)) * p).toFixed(3));
}
