// The touchable parts the moments share, ported from v3's Svelte parts to plain DOM: number stones, letter gems,
// gem slots, the star slider, a printed word with sound dots, a printed phrase (2.3.0), the crown and v3's pictures.
import { v3Art } from '../assets';
import { audio } from '../audio';
import { dicePoints, gemKind, nearestIndex, phraseUnits, printUnits, type PhrasePart, type Point, type PrintUnit } from './geometry';
import { el, img } from './dom';
import { press } from './press';

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
  /** True while a finger holds the star. */
  readonly held: boolean;
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
  let held = false;
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
  /** The star flies back to the start. */
  const back = () => {
    star.classList.remove('held');
    const from = x;
    setX(0);
    star.animate([{ transform: `translateX(${from}px)` }, { transform: 'translateX(0px)' }], { duration: 360, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  };
  // press() ends the slide on any release, also one the iPad lost (a lost capture, a release over another layer, or
  // the next touch), so the star can never stay held and block every later slide: the naming freeze of the bell.
  const unpress = press(star, {
    down: (e) => {
      if (held || !o.enabled()) return false;
      held = true;
      star.classList.add('held');
      star.getAnimations().forEach((a) => a.cancel());
      grabX = e.clientX - x;
      last = -1;
      o.onDown?.();
      pass();
    },
    move: (e) => {
      const { max } = limits();
      setX(Math.max(0, Math.min(max, e.clientX - grabX)));
      pass();
    },
    // However the slide ended, a star slid to the end is a slide she made: the build is checked.
    end: () => {
      held = false;
      const { max } = limits();
      const end = max > 0 && x >= max * 0.86;
      back();
      if (end) o.onDone();
    },
  });
  return {
    el: track,
    star,
    get held() {
      return held;
    },
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
    destroy: () => {
      unpress();
      track.remove();
    },
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
  /** Light these units in gold (the miss contrast: the letters that differ); an empty list puts them out. */
  glowUnits(indexes: readonly number[]): void;
  /** Remove the listeners (the moment's end). */
  destroy(): void;
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
  // press() ends the touch on any release, also one the iPad lost, so the dots never stop answering.
  const unpress = press(box, {
    down: (e) => {
      if (o.enabled && !o.enabled()) return false;
      lastPlayed = -1;
      o.onTouch?.();
      at({ x: e.clientX, y: e.clientY });
    },
    move: (e) => at({ x: e.clientX, y: e.clientY }),
    end: () => {
      lastPlayed = -1;
    },
  });
  return {
    el: box,
    units,
    dot: (i) => unitEls[i].querySelector('.dot') as HTMLElement,
    pulse,
    glow: (on) => box.classList.toggle('glow', on),
    glowUnits: (indexes) => unitEls.forEach((e, i) => e.classList.toggle('diff', indexes.includes(i))),
    destroy: unpress,
  };
}

export interface PhrasePrint extends Print {
  /** Each word's unit indexes in `units`, in order: "the", the colour, the thing. */
  readonly words: number[][];
  /** The units of the words read whole ("the"): no dots, never sounded out, never lit by the contrast. */
  readonly whole: number[];
}

/**
 * The phrase wish's print (docs/v4/2.3.md section 18): "the green sock" on one line, every word in the normal print
 * ink (never in its own colour, or she could match the picture without reading). The colour and the thing have a
 * dot under each grapheme and play its letter sound under the finger, as printEl does. "the" has no dots: a touch
 * on it says the whole word (`wholeClip`, v3's word-the), because it is a tricky word she sees, not one she decodes.
 */
export function phrasePrintEl(parts: readonly PhrasePart[], o: { onTouch?(): void; enabled?(): boolean; wholeClip?: string } = {}): PhrasePrint {
  const perWord = phraseUnits(parts);
  const units = perWord.flat();
  const box = el('div', 'print phrase touch');
  box.setAttribute('aria-label', `word ${parts.map((p) => p.word).join(' ')}`);
  const words: number[][] = [];
  const whole: number[] = [];
  const unitEls: HTMLElement[] = [];
  perWord.forEach((list, w) => {
    const isWhole = parts[w].word.toLowerCase() === 'the';
    const wordEl = el('span', `pword${isWhole ? ' whole' : ''}`, box);
    words.push(list.map((un) => {
      const i = unitEls.length;
      const e = el('span', `unit${un.digraph && !isWhole ? ' digraph' : ''}${un.tail ? ' tail' : ''}`, wordEl);
      e.dataset.i = String(i);
      el('span', 'txt', e).textContent = un.text;
      el('span', 'bar', e);
      el('span', 'dot', e).setAttribute('aria-label', isWhole ? '' : `dot ${un.g}`);
      unitEls.push(e);
      if (isWhole) whole.push(i);
      return i;
    }));
  });
  const wordOf = (i: number) => words.findIndex((w) => w.includes(i));
  let lastPlayed = -1;
  let lastWhole = -1;
  const pulse = (i: number) => {
    const e = unitEls[i];
    if (!e) return;
    e.classList.remove('pulse');
    void e.offsetWidth;
    e.classList.add('pulse');
  };
  const at = (p: Point) => {
    for (let i = 0; i < unitEls.length; i++) {
      const r = unitEls[i].getBoundingClientRect();
      if (p.x < r.left || p.x > r.right) continue;
      if (i === lastPlayed) return;
      lastPlayed = i;
      if (whole.includes(i)) {
        // The whole word once per touch, however many of its letters the finger passes.
        const w = wordOf(i);
        if (w === lastWhole) return;
        lastWhole = w;
        words[w].forEach(pulse);
        if (o.wholeClip) void audio.say(o.wholeClip);
        return;
      }
      lastWhole = -1;
      if (units[i].tail) return;
      pulse(i);
      void audio.sound(units[i].g);
      return;
    }
  };
  const unpress = press(box, {
    down: (e) => {
      if (o.enabled && !o.enabled()) return false;
      lastPlayed = -1;
      lastWhole = -1;
      o.onTouch?.();
      at({ x: e.clientX, y: e.clientY });
    },
    move: (e) => at({ x: e.clientX, y: e.clientY }),
    end: () => {
      lastPlayed = -1;
      lastWhole = -1;
    },
  });
  return {
    el: box,
    units,
    words,
    whole,
    dot: (i) => unitEls[i].querySelector('.dot') as HTMLElement,
    pulse,
    glow: (on) => box.classList.toggle('glow', on),
    glowUnits: (indexes) => unitEls.forEach((e, i) => e.classList.toggle('diff', indexes.includes(i) && !whole.includes(i))),
    destroy: unpress,
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
