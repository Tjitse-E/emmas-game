// Tinted unicorn pictures for the end screen, so every little unicorn there wears its own coat and mane. Built the
// way v3's lite unicorns are (games/moon-meadow-home/src/art/lite.ts): v3's layered baby art, each shade layer
// multiplied by its colour and cut to its own alpha on a canvas, once per picture. The page then shows a plain
// canvas: no masks or blend modes for the Air 2 to composite.
import { v3Art } from '../assets';
import { mixWhite, safeTint } from './geometry';

/** The moon baby's frame and layers, from v3's art manifest (public/art/manifest.json, 'moon.baby', rendition 'sm'). */
const FRAME = { w: 734, h: 720 } as const;
type Tint = 'body' | 'mane' | 'mane2' | 'none';
const LAYERS: readonly { src: string; tint: Tint; box: readonly [number, number, number, number] }[] = [
  { src: 'unicorns/moon.baby.sm.tail-mane.webp', tint: 'mane', box: [15, 293, 248, 349] },
  { src: 'unicorns/moon.baby.sm.tail-mane2.webp', tint: 'mane2', box: [21, 332, 205, 306] },
  { src: 'unicorns/moon.baby.sm.body.webp', tint: 'body', box: [77, 18, 597, 662] },
  { src: 'unicorns/moon.baby.sm.mane.webp', tint: 'mane', box: [14, 16, 706, 596] },
  { src: 'unicorns/moon.baby.sm.mane2.webp', tint: 'mane2', box: [22, 84, 688, 338] },
  { src: 'unicorns/moon.baby.sm.fixed.webp', tint: 'none', box: [102, 14, 569, 691] },
];

/** v3's lowest safe luminance for a coat and a mane under multiply (art palette.ts). */
const MIN_BODY = 0.55;
const MIN_MANE = 0.25;

export interface Coat {
  body: string;
  mane: string;
}

/** The frame's width over its height, for sizing the picture box. */
export const UNICORN_ASPECT = FRAME.w / FRAME.h;

let images: Promise<HTMLImageElement[]> | null = null;

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`tint: cannot load ${url}`));
    im.src = url;
  });
}

/** The layer pictures, loaded once. */
function layers(): Promise<HTMLImageElement[]> {
  images ??= Promise.all(LAYERS.map((l) => load(v3Art(l.src))));
  images.catch(() => { images = null; });
  return images;
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** One shade layer multiplied by a colour and cut to its own alpha (v3 tint.ts tintLayerStyle, on a canvas). */
function tinted(im: HTMLImageElement, w: number, h: number, colour: string): HTMLCanvasElement {
  const c = canvas(w, h);
  const x = c.getContext('2d')!;
  x.fillStyle = colour;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'multiply';
  x.drawImage(im, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(im, 0, 0, c.width, c.height);
  return c;
}

/**
 * A moon baby in this coat and mane, `heightPx` device pixels tall, as a canvas (the second mane colour is the mane
 * mixed with white). Null when the layers cannot be loaded or there is no 2D canvas; the caller then shows v3's flat
 * picture.
 */
export async function tintedUnicorn(coat: Coat, heightPx: number): Promise<HTMLCanvasElement | null> {
  try {
    const ims = await layers();
    const k = heightPx / FRAME.h;
    const out = canvas(FRAME.w * k, FRAME.h * k);
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    const body = safeTint(coat.body, MIN_BODY, '#e6dcff');
    const mane = safeTint(coat.mane, MIN_MANE, '#ff7fbf');
    const colours: Record<Exclude<Tint, 'none'>, string> = { body, mane, mane2: mixWhite(mane, 0.45) };
    LAYERS.forEach((l, i) => {
      const [x, y, w, h] = l.box.map((v) => v * k);
      if (l.tint === 'none') ctx.drawImage(ims[i], x, y, w, h);
      else ctx.drawImage(tinted(ims[i], w, h, colours[l.tint]), x, y);
    });
    return out;
  } catch {
    return null;
  }
}
