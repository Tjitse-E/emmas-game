// Inline CSS for picture layers (art stream Task A6). Safari 15.4: both -webkit-mask-* and mask-*.
import type { Tint } from './manifest.ts';
import type { Colours } from './palette.ts';

/** A url that cannot close the quotes or the declaration it sits in. */
const u = (url: string) => `url("${url.replace(/["\\\n\r]/g, (ch) => encodeURIComponent(ch))}")`;
/** A colour that cannot add a declaration; anything odd becomes white, which multiply leaves unchanged. */
const safeColour = (c: string) => (/^[#a-z0-9(),.%\s-]+$/i.test(c) ? c : '#ffffff');

export function tintLayerStyle(url: string, colour: string): string {
  return [`background-image:${u(url)}`, 'background-size:100% 100%', 'background-repeat:no-repeat', `background-color:${safeColour(colour)}`,
    'background-blend-mode:multiply', `-webkit-mask-image:${u(url)}`, `mask-image:${u(url)}`,
    '-webkit-mask-size:100% 100%', 'mask-size:100% 100%', '-webkit-mask-repeat:no-repeat', 'mask-repeat:no-repeat'].join(';');
}

export function plainLayerStyle(url: string): string {
  return `background-image:${u(url)};background-size:100% 100%;background-repeat:no-repeat`;
}

export function patternLayerStyle(maskUrl: string, patternUrl: string, opacity: number): string {
  return [`background-image:${u(patternUrl)}`, 'background-repeat:repeat', 'background-size:64px 64px',
    `-webkit-mask-image:${u(maskUrl)}`, `mask-image:${u(maskUrl)}`, '-webkit-mask-size:100% 100%', 'mask-size:100% 100%',
    '-webkit-mask-repeat:no-repeat', 'mask-repeat:no-repeat', `opacity:${Number.isFinite(opacity) ? opacity : 1}`].join(';');
}

export function colourForTint(tint: Tint, c: Colours): string | null {
  return tint === 'none' ? null : c[tint];
}
