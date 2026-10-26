// The touchable parts the moments share, ported from v3's Svelte parts to plain DOM: number stones, letter gems,
// gem slots, the star slider, a printed word with sound dots, the crown and v3's pictures.
import { v3Art } from '../assets';
import { audio } from '../audio';
import { dicePoints, gemKind, nearestIndex, printUnits, type Point, type PrintUnit } from './geometry';
import { el, img } from './dom';

export const PIC = {
  star: v3Art('ui/ui-star.webp'),
  sparkle: v3Art('ui/ui-sparkle.webp'),
  turn: v3Art('ui/ui-turn-ipad.webp'),
  lumi: v3Art('lumi/lumi.webp'),
  lumiMouth: v3Art('lumi/lumi-mouth.webp'),
  cup: v3Art('items/item-moon-cup.webp'),
  cupNest: v3Art('items/item-cup-nest.webp'),
  bell: v3Art('items/item-name-bell.webp'),
  basket: v3Art('items/item-wish-basket.webp'),
  heart: v3Art('items/item-heart.webp'),
  moon: v3Art('items/item-moon.webp'),
  crown: v3Art('items/item-crown-emma.webp'),
  nest: v3Art('items/item-nest.webp'),
  eggMoon: v3Art('items/egg-moon.webp'),
  eggSnow: v3Art('items/egg-snow.webp'),
  door: v3Art('items/item-stall-door.webp'),
  baby: v3Art('unicorns/moon-baby-flat.webp'),
  babyBerry: v3Art('unicorns/berry-baby-flat.webp'),
  babySnow: v3Art('unicorns/snow-baby-flat.webp'),
  duck: v3Art('words/duck.webp'),
} as const;

export const CROWN_SVG = '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" stroke="#c98a14" stroke-width="2" stroke-linejoin="round"/></svg>';

// ------------------------------------------------------------------------------------------------ stones

/** A number stone: a tinted pebble with dice dots, and the numeral on a badge below it so it never hides a dot. */
export function stoneEl(value: number, kind: 'warm' | 'snow'): HTMLElement {
  const cell = el('div', `stone-cell touch ${kind}`);
  cell.setAttribute('aria-label', `stone ${value}`);
  cell.dataset.value = String(value);
  const pebble = el('div', 'stone', cell);
  el('span', 'stone-shine', pebble);
  const dots = el('div', 'stone-dots', pebble);
  for (const p of dicePoints(value)) {
    const d = el('i', '', dots);
    d.style.left = `${p.x}%`;
    d.style.top = `${p.y}%`;
  }
  el('b', 'stone-num', cell).textContent = String(value);
  return cell;
}

// ------------------------------------------------------------------------------------------------ gems

/** A letter gem: a round faceted jewel, pink for a vowel, blue for a consonant, lilac for y (v3's Gem colours). */
export function gemEl(g: string): HTMLElement {
  const e = el('div', `gem ${gemKind(g)}`);
  e.dataset.g = g;
  e.setAttribute('aria-label', `gem ${g}`);
  el('span', 'gem-face', e);
  el('span', 'gem-t', e).textContent = g;
  return e;
}

/** A gem slot; the first has a small crown for the capital. */
export function slotEl(i: number, need: string): HTMLElement {
  const s = el('div', `slot touch ${gemKind(need) === 'vowel' ? 'vowel' : 'consonant'}`);
  s.setAttribute('aria-label', `slot ${i + 1}`);
  if (i === 0) el('span', 'slot-crown', s).innerHTML = CROWN_SVG;
  return s;
}

// ------------------------------------------------------------------------------------------------ star slider

/**
 * The star slider under the gem slots (v3 SoundSlider): sliding the star past slot i calls onPass(i) once per
 * slide; letting go at the end calls onDone. `centres` gives the slot centres on screen (they can move on resize).
 */
export interface StarSlider {
  readonly el: HTMLElement;
  readonly star: HTMLElement;
  /** The ghost hand holds the star with its centre at clientX, passing the slots as a finger would. */
  ghostTo(clientX: number): void;
  /** The ghost hand lets go: the star flies back to the start. */
  ghostEnd(): void;
  destroy(): void;
}

export function starSlider(parent: HTMLElement, o: { centres: () => number[]; enabled(): boolean; onPass(i: number): void; onDone(): void; onDown?(): void }): StarSlider {
  const track = el('div', 'slider', parent);
  const star = el('div', 'slider-star touch', track);
  star.setAttribute('aria-label', 'star');
  img(PIC.star, '', star);
  let held = -1;
  let ghosting = false;
  let x = 0;
  let grabX = 0;
  let last = -1;

  const limits = () => {
    const r = track.getBoundingClientRect();
    const s = star.getBoundingClientRect();
    return { left: r.left, max: Math.max(0, r.width - s.width), half: s.width / 2 };
  };
  const setX = (v: number) => {
    x = v;
    star.style.transform = `translateX(${v}px)`;
  };
  const pass = () => {
    const { left, half } = limits();
    const cs = o.centres();
    const c = left + x + half;
    const i = nearestIndex(c, cs);
    const pitch = cs.length > 1 ? Math.abs(cs[1] - cs[0]) : 100;
    if (i >= 0 && i !== last && Math.abs(cs[i] - c) < pitch * 0.4) {
      last = i;
      o.onPass(i);
    }
  };
  const down = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (held !== -1 || !o.enabled()) return;
    held = e.pointerId;
    try {
      star.setPointerCapture(e.pointerId);
    } catch {
      /* gone */
    }
    star.classList.add('held');
    star.getAnimations().forEach((a) => a.cancel());
    grabX = e.clientX - x;
    last = -1;
    o.onDown?.();
    pass();
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== held) return;
    const { max } = limits();
    setX(Math.max(0, Math.min(max, e.clientX - grabX)));
    pass();
  };
  /** The star flies back to the start. */
  const back = () => {
    star.classList.remove('held');
    const from = x;
    setX(0);
    star.animate([{ transform: `translateX(${from}px)` }, { transform: 'translateX(0px)' }], { duration: 360, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== held) return;
    held = -1;
    const { max } = limits();
    const end = max > 0 && x >= max * 0.86;
    back();
    if (end) o.onDone();
  };
  star.addEventListener('pointerdown', down);
  star.addEventListener('pointermove', move);
  star.addEventListener('pointerup', up);
  star.addEventListener('pointercancel', up);
  return {
    el: track,
    star,
    ghostTo(clientX) {
      if (!ghosting) {
        ghosting = true;
        last = -1;
        star.classList.add('held');
        star.getAnimations().forEach((a) => a.cancel());
      }
      const { left, max, half } = limits();
      setX(Math.max(0, Math.min(max, clientX - left - half)));
      pass();
    },
    ghostEnd() {
      if (!ghosting) return;
      ghosting = false;
      back();
    },
    destroy: () => track.remove(),
  };
}

// ------------------------------------------------------------------------------------------------ print with dots

export interface Print {
  readonly el: HTMLElement;
  readonly units: PrintUnit[];
  /** The dot under unit i. */
  dot(i: number): HTMLElement;
  /** Pulse one unit (the slow sounds) or glow the whole word (after a miss). */
  pulse(i: number): void;
  glow(on: boolean): void;
}

/**
 * A printed word in lower case with one sound dot under each grapheme (a digraph gets one dot and a small
 * underline). A touch on the word plays the grapheme under the finger; sliding along plays each one it passes.
 * `onTouch` runs first (the moment stops Elizabeth there); while `enabled()` is false a touch does nothing.
 */
export function printEl(word: string, gpcs: string[], o: { onTouch?(): void; enabled?(): boolean } = {}): Print {
  const units = printUnits(word.toLowerCase(), gpcs.map((g) => g.toLowerCase()));
  const box = el('div', 'print touch');
  box.setAttribute('aria-label', `word ${word}`);
  const unitEls = units.map((un, i) => {
    const e = el('span', `unit${un.digraph ? ' digraph' : ''}${un.tail ? ' tail' : ''}`, box);
    e.dataset.i = String(i);
    el('span', 'txt', e).textContent = un.text;
    el('span', 'bar', e);
    el('span', 'dot', e).setAttribute('aria-label', `dot ${un.g}`);
    return e;
  });
  let held = -1;
  let lastPlayed = -1;
  const at = (p: Point) => {
    for (let i = 0; i < unitEls.length; i++) {
      const r = unitEls[i].getBoundingClientRect();
      if (p.x >= r.left && p.x <= r.right) {
        if (i !== lastPlayed) {
          lastPlayed = i;
          if (units[i].tail) return;
          pulse(i);
          void audio.sound(units[i].g);
        }
        return;
      }
    }
  };
  const pulse = (i: number) => {
    const e = unitEls[i];
    if (!e) return;
    e.classList.remove('pulse');
    void e.offsetWidth;
    e.classList.add('pulse');
  };
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (held !== -1 || (o.enabled && !o.enabled())) return;
    held = e.pointerId;
    try {
      box.setPointerCapture(e.pointerId);
    } catch {
      /* gone */
    }
    lastPlayed = -1;
    o.onTouch?.();
    at({ x: e.clientX, y: e.clientY });
  });
  box.addEventListener('pointermove', (e) => { if (e.pointerId === held) at({ x: e.clientX, y: e.clientY }); });
  const up = (e: PointerEvent) => { if (e.pointerId === held) held = -1; };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  return {
    el: box,
    units,
    dot: (i) => unitEls[i].querySelector('.dot') as HTMLElement,
    pulse,
    glow: (on) => box.classList.toggle('glow', on),
  };
}

/** A burst of v3's sparkle pictures from a point (a name tag landing, a stone that was just right). */
export function sparkleBurst(layer: HTMLElement, at: Point, n = 7): void {
  for (let i = 0; i < n; i++) {
    const s = img(PIC.sparkle, 'sparkle-pop', layer);
    s.style.left = `${at.x}px`;
    s.style.top = `${at.y}px`;
    const a = (i / n) * Math.PI * 2 + 0.3;
    const r = 70 + (i % 3) * 22;
    const dx = Math.cos(a) * r;
    const dy = Math.sin(a) * r;
    void s.animate([
      { transform: 'translate(-50%, -50%) scale(.2) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(90deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy * 1.2}px)) scale(.4) rotate(140deg)`, opacity: 0 },
    ], { duration: 900, delay: i * 30, easing: 'ease-out', fill: 'both' }).finished.then(() => s.remove(), () => s.remove());
  }
}
