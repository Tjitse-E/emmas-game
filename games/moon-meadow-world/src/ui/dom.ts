// Small DOM helpers for the 2D layer: element builders, the design unit, a frame ticker and promise timing.
import { type Box, type Point, tintedPicStyle } from './geometry';
import { press } from './press';

/** One design pixel in CSS pixels (see geometry.unitFor). Set by the layer on every resize. */
let unit = 1;
export function setUnit(v: number): void {
  unit = v;
}
/** Design pixels to CSS pixels. */
export function u(n: number): number {
  return n * unit;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: Element | null): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent?.appendChild(e);
  return e;
}

/** A picture that never starts a native drag, a callout or a selection. */
export function img(src: string, cls = '', parent?: Element | null): HTMLImageElement {
  const i = el('img', cls, parent);
  i.src = src;
  i.alt = '';
  i.draggable = false;
  i.decoding = 'async';
  return i;
}

/**
 * A word picture: a plain img, or for a greyscale picture with a tint (WishItem.tint) a box that shows it in its
 * colour, as v3 does (tintedPicStyle). The class sizes either one.
 */
export function wordPicEl(it: { pic: string; tint?: string }, cls = '', parent?: Element | null): HTMLElement {
  if (!it.tint) return img(it.pic, cls, parent);
  const d = el('div', cls ? `${cls} tinted` : 'tinted', parent);
  d.setAttribute('style', tintedPicStyle(it.pic, it.tint));
  return d;
}

/** An element from a trusted SVG or HTML string written in this folder. */
export function html(markup: string, cls = '', parent?: Element | null, tag: 'div' | 'span' = 'div'): HTMLElement {
  const e = el(tag, cls, parent);
  e.innerHTML = markup;
  return e;
}

export function boxOf(e: Element): Box {
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

export function centreOf(e: Element): Point {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

/** Web Animations with a promise that also resolves when the animation is cancelled or the element is gone. */
export function play(e: Element, frames: Keyframe[], o: KeyframeAnimationOptions): Promise<void> {
  const a = e.animate(frames, o);
  return new Promise((r) => {
    a.onfinish = () => r();
    a.oncancel = () => r();
  });
}

/** Fade an element in or out with a CSS opacity transition, then resolve. */
export async function fade(e: HTMLElement, on: boolean, ms = 400): Promise<void> {
  e.style.transition = `opacity ${ms}ms ease`;
  await nextFrame();
  e.style.opacity = on ? '1' : '0';
  await sleep(ms);
}

// ------------------------------------------------------------------------------------------------ ticker

const tickers = new Set<() => void>();
let rafId = 0;

function loop(): void {
  rafId = 0;
  for (const fn of [...tickers]) fn();
  if (tickers.size) rafId = requestAnimationFrame(loop);
}

/** Run fn every frame until the returned function is called. Only runs while something needs it. */
export function onTick(fn: () => void): () => void {
  tickers.add(fn);
  if (!rafId) rafId = requestAnimationFrame(loop);
  return () => {
    tickers.delete(fn);
  };
}

/** How far outside the element a release still counts as a tap on it. */
const PRESS_SLOP = 12;

/**
 * A tap that only fires when the finger lifts on the element it went down on, or within 12 px of it (no tap on a
 * stray slide). Built on press(), so the release also counts when only the window hears it, and when the capture is
 * lost with the finger last seen on the element: on Emma's iPad a release can miss the element, and the tap was lost
 * (the play-again moon). A pointercancel or a new touch elsewhere is no tap.
 */
export function onPress(e: HTMLElement, fn: (ev: PointerEvent) => void, o: { down?: (ev: PointerEvent) => void } = {}): () => void {
  let last = { x: 0, y: 0 };
  return press(e, {
    down: (ev) => {
      last = { x: ev.clientX, y: ev.clientY };
      e.classList.add('down');
      o.down?.(ev);
    },
    move: (ev) => {
      last = { x: ev.clientX, y: ev.clientY };
    },
    end: (ev, how) => {
      e.classList.remove('down');
      if (how === 'cancel' || how === 'other') return;
      const p = how === 'up' ? { x: ev.clientX, y: ev.clientY } : last;
      const r = e.getBoundingClientRect();
      if (p.x >= r.left - PRESS_SLOP && p.x <= r.right + PRESS_SLOP && p.y >= r.top - PRESS_SLOP && p.y <= r.bottom + PRESS_SLOP) fn(ev);
    },
  });
}
