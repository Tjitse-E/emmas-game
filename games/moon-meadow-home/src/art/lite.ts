// Lite unicorns (R63): on a slow iPad each baby is drawn as one flat picture, tinted once on a canvas,
// so the meadow composites no multiply blends and no masks. The baby keeps its own colours; only the
// tail swish and the blink are lost. Browser only: without a canvas the promise resolves to null and
// the component shows the breed's flat picture in the default colours.
import { artUrl, type UnicornEntry } from './manifest.ts';
import type { Colours } from './palette.ts';

const ready = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

export function liteKey(entry: UnicornEntry, rendition: 'sm' | 'lg', c: Colours, speckle: string | undefined): string {
  return [entry.breed, entry.stage, entry.source, rendition, c.body, c.mane, c.mane2, speckle ?? ''].join('|');
}

/** The finished picture for this key, if it was made before (so a remount does not flash). */
export function liteCached(key: string): string | null | undefined {
  return ready.get(key);
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`lite: cannot load ${url}`));
    im.src = url;
  });
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** One shade layer multiplied by a colour and cut to its own alpha, as tintLayerStyle does in CSS. */
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

function speckled(mask: HTMLImageElement, pattern: HTMLImageElement, w: number, h: number, scale: number): HTMLCanvasElement {
  const c = canvas(w, h);
  const x = c.getContext('2d')!;
  const p = x.createPattern(pattern, 'repeat');
  if (p) {
    if (p.setTransform) p.setTransform(new DOMMatrix().scale(scale, scale));
    x.fillStyle = p;
    x.fillRect(0, 0, c.width, c.height);
  }
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(mask, 0, 0, c.width, c.height);
  return c;
}

async function make(entry: UnicornEntry, rendition: 'sm' | 'lg', c: Colours, speckle: string | undefined): Promise<string | null> {
  const r = entry.renditions[rendition];
  const k = r.scale;
  const out = canvas(entry.w * k, entry.h * k);
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  const pattern = speckle ? await load(artUrl(speckle)).catch(() => null) : null;
  for (const part of r.parts) {
    if (part.hidden) continue;
    for (const l of part.layers) {
      const im = await load(artUrl(l.src));
      const [x, y, w, h] = l.box.map((v) => v * k);
      if (l.tint === 'none') {
        ctx.drawImage(im, x, y, w, h);
        continue;
      }
      ctx.drawImage(tinted(im, w, h, c[l.tint]), x, y);
      if (pattern && l.tint === 'body' && part.id === 'body') {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(speckled(im, pattern, w, h, 0.5), x, y);
        ctx.globalAlpha = 1;
      }
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  return blob ? URL.createObjectURL(blob) : null;
}

/** A tinted flat picture of the whole unicorn (tail and body, no lids), or null when it cannot be made. */
export function liteSprite(entry: UnicornEntry, rendition: 'sm' | 'lg', c: Colours, speckle?: string): Promise<string | null> {
  const key = liteKey(entry, rendition, c, speckle);
  if (ready.has(key)) return Promise.resolve(ready.get(key)!);
  let p = pending.get(key);
  if (!p) {
    p = (typeof document === 'undefined' ? Promise.resolve(null) : make(entry, rendition, c, speckle))
      .catch(() => null)
      .then((url) => {
        ready.set(key, url);
        pending.delete(key);
        return url;
      });
    pending.set(key, p);
  }
  return p;
}
