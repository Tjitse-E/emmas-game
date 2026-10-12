// Unicorn and word-picture colours (art stream Task A6). The body and mane palettes are v2's.
import type { Colours, Traits as ContractTraits } from '../types/contracts.ts';
import type { Rng } from '../core/rng.ts';

export type { Colours };
/** The trait flags the art reads. Events always carry all four (contracts C1); art accepts a partial set. */
export type Traits = Partial<ContractTraits>;
export type ColourWord = 'red' | 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'brown' | 'black' | 'white' | 'grey' | 'gold' | 'silver';

export const BODY_COLOURS: readonly string[] = ['#ffe0ef', '#e6dcff', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf', '#ffffff', '#f5d9ff'];
export const MANE_COLOURS: readonly string[] = ['#ff7fbf', '#9d7bff', '#4fc3ff', '#ffbf3f', '#3fd69a', '#ff8f6b', '#c46bff', '#ff5f8f'];
export const GOLDEN_BODY = '#f7d77c';
export const DEFAULT_COLOURS: Colours = { body: '#e6dcff', mane: '#ff7fbf', mane2: '#3fd69a' };
export const NAMED_COLOURS: Record<ColourWord, string> = {
  red: '#e8505b', pink: '#f48fb1', orange: '#f6a04d', yellow: '#f9d65c', green: '#6cc070', blue: '#5aa9e6',
  purple: '#a77bd6', brown: '#a8754f', black: '#4a4a55', white: '#f7f7f7', grey: '#a7a9b4', gold: '#e8c15a', silver: '#c9ccd6',
};

/** Below these, multiply turns the shading into a dark blob (art Review Focus 3). */
export const MIN_BODY_LUMINANCE = 0.55;
export const MIN_MANE_LUMINANCE = 0.25;

const HEX = /^#[0-9a-f]{6}$/i;
const choose = (rng: Rng, xs: readonly string[]): string => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];

export function randomColours(rng: Rng): Colours {
  const body = choose(rng, BODY_COLOURS);
  const mane = choose(rng, MANE_COLOURS);
  let mane2 = choose(rng, MANE_COLOURS);
  if (mane2 === mane) mane2 = MANE_COLOURS[(MANE_COLOURS.indexOf(mane) + 3) % MANE_COLOURS.length];
  return { body, mane, mane2 };
}

const toHex = (v: number[]): string => `#${v.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** Mixes a colour with white in small steps until it is light enough; keeps the hue. */
function lift(hex: string, min: number): string {
  if (luminance(hex) >= min) return hex;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let t = 0.05; t < 1; t += 0.05) {
    const c = toHex(rgb.map((x) => x + (255 - x) * t));
    if (luminance(c) >= min) return c;
  }
  return '#ffffff';
}

/**
 * A baby's colours, safe to draw: an invalid colour takes the default, a too-dark one is lifted,
 * and golden replaces the body colour.
 */
export function resolveColours(c: Partial<Colours> | undefined | null, traits: Traits = {}): Colours {
  const ok = (v: unknown, d: string, min: number) => (typeof v === 'string' && HEX.test(v) ? lift(v.toLowerCase(), min) : d);
  const out = {
    body: ok(c?.body, DEFAULT_COLOURS.body, MIN_BODY_LUMINANCE),
    mane: ok(c?.mane, DEFAULT_COLOURS.mane, MIN_MANE_LUMINANCE),
    mane2: ok(c?.mane2, DEFAULT_COLOURS.mane2, MIN_MANE_LUMINANCE),
  };
  if (traits?.golden) out.body = GOLDEN_BODY;
  return out;
}

/** WCAG relative luminance of '#rrggbb', 0 to 1. */
export function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
