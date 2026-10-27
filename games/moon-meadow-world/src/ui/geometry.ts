// Pure layout and rule helpers for the 2D layer. No DOM here, so tests/ui.test.ts can check them in node.
import type { LookRow } from '../contracts';
import { LOOK_ROWS } from '../wardrobe';

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

/** The design frame: every size in the layer is a number of design pixels times the unit. */
export const DESIGN = { w: 1180, h: 820 } as const;

/** One design pixel in CSS pixels: 1 at 1180 x 820, smaller or bigger so the whole layout fits the screen. */
export function unitFor(w: number, h: number): number {
  return Math.max(0.5, Math.min(w / DESIGN.w, h / DESIGN.h));
}

export function clamp(v: number, lo: number, hi: number): number {
  return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function inBox(p: Point, b: Box, pad = 0): boolean {
  return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
}

// ------------------------------------------------------------------------------------------------ stones

const DICE: Record<number, Point[]> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 30, y: 30 }, { x: 70, y: 70 }],
  3: [{ x: 28, y: 28 }, { x: 50, y: 50 }, { x: 72, y: 72 }],
  4: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
  5: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 50, y: 50 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
  6: [{ x: 30, y: 24 }, { x: 70, y: 24 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 76 }, { x: 70, y: 76 }],
  7: [{ x: 26, y: 24 }, { x: 50, y: 24 }, { x: 74, y: 24 }, { x: 50, y: 50 }, { x: 26, y: 76 }, { x: 50, y: 76 }, { x: 74, y: 76 }],
  8: [{ x: 28, y: 24 }, { x: 50, y: 24 }, { x: 72, y: 24 }, { x: 36, y: 50 }, { x: 64, y: 50 }, { x: 28, y: 76 }, { x: 50, y: 76 }, { x: 72, y: 76 }],
  9: [{ x: 28, y: 26 }, { x: 50, y: 26 }, { x: 72, y: 26 }, { x: 28, y: 50 }, { x: 50, y: 50 }, { x: 72, y: 50 }, { x: 28, y: 74 }, { x: 50, y: 74 }, { x: 72, y: 74 }],
};

/** Dice dots for a stone of 1 to 9, in percent of the stone (7, 8 and 9 extend the dice patterns, never a ten-frame). */
export function dicePoints(n: number): Point[] {
  const d = DICE[n];
  if (!d) throw new RangeError(`dicePoints: ${n}`);
  return d;
}

// ------------------------------------------------------------------------------------------------ moon cups

export type CupState = 'warm' | 'cold' | 'extra';

/** Cups in each nest of ten: one nest up to ten cups, a second beside it above ten. */
export function nestsFor(need: number, have: number): number[] {
  const total = Math.max(need, have);
  return total <= 10 ? [total] : [10, total - 10];
}

/**
 * Each cup at the start of an egg. A warm egg has `have` warm cups and the rest cold; a snow egg has `have` warm
 * cups of which those past `need` are the extra ones that must cool.
 */
export function cupStates(kind: 'warm' | 'snow', need: number, have: number): CupState[] {
  const total = Math.max(need, have);
  return Array.from({ length: total }, (_, i) => (i < Math.min(need, have) ? 'warm' : kind === 'warm' ? 'cold' : 'extra'));
}

/**
 * What a stone of `k` does. Warm: its dots fill the cold cups in order, and dots beyond the last cold cup bounce off
 * (`over`). Snow: it cools cups from the end, extra cups first, and past them it cools cups the egg needs (`over`).
 */
export function stoneEffect(kind: 'warm' | 'snow', need: number, have: number, k: number): { cups: number[]; over: number } {
  if (kind === 'warm') {
    const room = Math.max(0, need - have);
    const n = Math.min(k, room);
    return { cups: Array.from({ length: n }, (_, i) => have + i), over: Math.max(0, k - room) };
  }
  const n = Math.min(k, have);
  return { cups: Array.from({ length: n }, (_, i) => have - 1 - i), over: Math.max(0, k - (have - need)) };
}

/** The cups the focused hint counts: the cold cups of a warm egg, the extra cups of a snow egg (in reading order). */
export function hintCups(kind: 'warm' | 'snow', need: number, have: number): number[] {
  return kind === 'warm'
    ? Array.from({ length: Math.max(0, need - have) }, (_, i) => have + i)
    : Array.from({ length: Math.max(0, have - need) }, (_, i) => need + i);
}

/** The ten-frame grid in a nest, in design px (ui.css .cup-grid): five columns and two rows of cups. */
export const CUP_GRID = { cupW: 66, cupH: 56, colGap: 8, rowGap: 4 } as const;

/**
 * The blanket of a warm egg (v3's blanket egg, M11): in nest `f` it covers every place from the first one after the
 * warm cups to the end of the ten-frame, cold cups and empty places alike, so she cannot count the cold cups and must
 * work out how many are missing. One patch per covered row, or one for a whole ten-frame, as a box in design px
 * relative to the nest's grid (`pad` past the cells, so the patches look puffy and overlap a little where two rows
 * meet). None when the nest has nothing to cover.
 */
export function blanketPatches(have: number, f: number, pad = 7): Box[] {
  const from = Math.max(0, have - f * 10);
  if (from >= 10) return [];
  const { cupW, cupH, colGap, rowGap } = CUP_GRID;
  const gridW = 5 * cupW + 4 * colGap;
  // A whole ten-frame under one blanket.
  if (from === 0) return [{ x: 0 - pad, y: 0 - pad, w: gridW + 2 * pad, h: 2 * cupH + rowGap + 2 * pad }];
  const out: Box[] = [];
  for (let row = 0; row < 2; row++) {
    const first = Math.max(0, from - row * 5);
    if (first >= 5) continue;
    const x = first * (cupW + colGap);
    out.push({ x: x - pad, y: row * (cupH + rowGap) - pad, w: gridW - x + 2 * pad, h: cupH + 2 * pad });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ gems and slots

/** A vowel gem is pink, a consonant gem blue, y both (v3's gem colours). */
export function gemKind(g: string): 'vowel' | 'consonant' | 'both' {
  const s = g.toLowerCase();
  if (s === 'y') return 'both';
  return /^[aeiou]/.test(s) ? 'vowel' : 'consonant';
}

/** The capital form of a first grapheme: 'p' gives 'P', 'th' gives 'Th'. */
export function capitalOf(g: string): string {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

/** The gems the name needs, in order, with the first as a capital. */
export function nameGems(gpcs: string[]): string[] {
  return gpcs.map((g, i) => (i === 0 ? capitalOf(g) : g));
}

/** A seeded random source (mulberry32), so a shuffle can be repeated in tests and flows. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], rand: () => number = Math.random): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The gem tray: the name's gems plus the distractors, shuffled so that the tray never spells the name in order
 * at its start (that would give the answer away).
 */
export function planTray(gpcs: string[], distractors: string[], rand: () => number = Math.random): string[] {
  const need = nameGems(gpcs);
  const all = [...need, ...distractors];
  if (all.length < 2) return all;
  for (let tries = 0; tries < 20; tries++) {
    const t = shuffle(all, rand);
    if (!need.every((g, i) => t[i] === g)) return t;
  }
  return [...all.slice(1), all[0]];
}

/**
 * A full build checked slot by slot. Case does not decide a slot (the capital P in the last slot still says p);
 * `caseFix` is true when the right sounds are built but the capital is not first, so the layer swaps it into place.
 */
export function judgeBuild(slots: readonly (string | null)[], gpcs: string[]): { complete: boolean; right: boolean; wrong: number[]; caseFix: boolean } {
  const complete = slots.length === gpcs.length && slots.every((s) => s !== null);
  const wrong = gpcs.map((g, i) => (slots[i]?.toLowerCase() === g.toLowerCase() ? -1 : i)).filter((i) => i >= 0);
  const right = complete && wrong.length === 0;
  const caseFix = right && nameGems(gpcs).some((g, i) => slots[i] !== g);
  return { complete, right, wrong, caseFix };
}

/** The index of the centre closest to x, or -1 when there are none. */
export function nearestIndex(x: number, centres: readonly number[]): number {
  let best = -1;
  centres.forEach((c, i) => {
    if (best < 0 || Math.abs(c - x) < Math.abs(centres[best] - x)) best = i;
  });
  return best;
}

// ------------------------------------------------------------------------------------------------ print

export type PrintUnit = {
  /** The grapheme it sounds ('sh', 'a-e'); empty for a silent tail. */
  g: string;
  /** The letters printed. */
  text: string;
  /** Two or more letters for one sound: one dot and a small underline. */
  digraph: boolean;
  /** The e of a split digraph (a-e): printed, no dot of its own, no sound (v3 PrintWithDots). */
  tail: boolean;
};

/** Display units of a printed word from its grapheme split, split digraphs included ('cake': c, a-e, k). */
export function printUnits(word: string, gpcs: string[]): PrintUnit[] {
  const out: PrintUnit[] = [];
  let at = 0;
  let tails = 0;
  for (const g of gpcs) {
    const split = /^[a-z]-e$/.test(g);
    const len = split ? 1 : g.length;
    const text = word.slice(at, at + len);
    out.push({ g, text: text || g, digraph: !split && g.length > 1, tail: false });
    at += len;
    if (split) tails++;
    else if (tails > 0 && word.charAt(at) === 'e') {
      out.push({ g: '', text: 'e', digraph: false, tail: true });
      at += 1;
      tails--;
    }
  }
  if (at < word.length) out.push({ g: word.slice(at), text: word.slice(at), digraph: word.length - at > 1, tail: false });
  return out;
}

// ------------------------------------------------------------------------------------------------ placement

/**
 * A bubble of size w x h above a head point, kept on screen inside `margin`, and out of the top corners where
 * Lumi and the home button sit. Returns the bubble's top left and the x of its tail on the bubble (clamped to it).
 */
export function bubbleBox(head: Point, w: number, h: number, screen: { w: number; h: number }, o: { gap: number; margin: number; topLeft: Box; topRight: Box }): { x: number; y: number; tailX: number } {
  let x = clamp(head.x - w / 2, o.margin, screen.w - o.margin - w);
  const y = clamp(head.y - o.gap - h, o.margin, screen.h - o.margin - h);
  // Slide sideways out of a corner box it would cover.
  for (const c of [o.topLeft, o.topRight]) {
    const overlaps = x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y;
    if (!overlaps) continue;
    x = c.x === 0 ? Math.min(c.x + c.w, screen.w - o.margin - w) : Math.max(o.margin, c.x - w);
  }
  const tailX = clamp(head.x - x, w * 0.18, w * 0.82);
  return { x, y, tailX };
}

/**
 * Where the edge arrow sits for a goal at `p`: on the inset screen rectangle in the direction of the goal from the
 * screen centre. Points behind the camera (not visible, yet projected inside the screen) are mirrored, so their
 * direction is flipped. Returns null while she can see the goal, so the arrow never covers it: when the point is on
 * screen, or just past an edge, less than `band` px out (the egg or the beacon around it still shows). The band is
 * open: a point exactly `band` px out gets the arrow (the game parks a goal hidden behind Lumi, the home button or
 * the food basket there). `angle` is the direction in radians (0 = right, y down).
 */
export function edgeArrow(p: Point, visible: boolean, screen: { w: number; h: number }, inset: number, band: number): { x: number; y: number; angle: number } | null {
  const onScreen = p.x >= 0 && p.x <= screen.w && p.y >= 0 && p.y <= screen.h;
  if (visible && onScreen) return null;
  if (!onScreen && p.x > -band && p.x < screen.w + band && p.y > -band && p.y < screen.h + band) return null;
  const cx = screen.w / 2;
  const cy = screen.h / 2;
  let dx = p.x - cx;
  let dy = p.y - cy;
  // Off screen but projected inside: it is behind the camera, so its true direction is the other way.
  if (!visible && p.x >= 0 && p.x <= screen.w && p.y >= 0 && p.y <= screen.h) {
    dx = -dx;
    dy = -dy;
  }
  if (dx === 0 && dy === 0) dy = 1;
  const hw = screen.w / 2 - inset;
  const hh = screen.h / 2 - inset;
  const s = Math.min(Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity);
  return { x: cx + dx * s, y: cy + dy * s, angle: Math.atan2(dy, dx) };
}

// ------------------------------------------------------------------------------------------------ sky and end screen

/**
 * The CSS wash over the world for the time of day t (0 day, 0.5 sunset, 1 night): the opacity of the pink-gold
 * sunset wash (full at 0.5, gone by 0.2 and 0.8) and of the faint night vignette (from 0.55, full at 1).
 */
export function skyWash(t: number): { sunset: number; night: number } {
  const c = clamp(t, 0, 1);
  return { sunset: clamp(1 - Math.abs(c - 0.5) / 0.3, 0, 1), night: clamp((c - 0.55) * (20 / 9), 0, 1) };
}

/**
 * The end screen's herd in at most two rows, as indexes into `members`: her new babies alone in the first row (they
 * are drawn bigger, with their name tags) and the rest of the herd in the second. Without new ones the herd fills one
 * row, or two even rows above `perRow`.
 */
export function endRows(members: readonly { isNew?: boolean }[], perRow = 12): number[][] {
  const fresh = members.flatMap((m, i) => (m.isNew ? [i] : []));
  const rest = members.flatMap((m, i) => (m.isNew ? [] : [i]));
  if (fresh.length) return rest.length ? [fresh, rest] : [fresh];
  if (rest.length <= perRow) return rest.length ? [rest] : [];
  const half = Math.ceil(rest.length / 2);
  return [rest.slice(0, half), rest.slice(half)];
}

// ------------------------------------------------------------------------------------------------ colour

const HEX = /^#[0-9a-f]{6}$/i;

/** WCAG relative luminance of '#rrggbb', 0 to 1 (v3 art palette.ts). */
export function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** A colour mixed with white by t (0 keeps it, 1 is white). */
export function mixWhite(hex: string, t: number): string {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `#${rgb.map((x) => Math.round(x + (255 - x) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A tint colour that is safe to multiply over v3's shaded layers: an invalid colour gives `fallback`, a too-dark
 * one is mixed with white in small steps until it is light enough (v3 palette.ts resolveColours; below the minimum
 * multiply turns the shading into a dark blob).
 */
export function safeTint(hex: string | undefined, min: number, fallback: string): string {
  if (typeof hex !== 'string' || !HEX.test(hex)) return fallback;
  const c = hex.toLowerCase();
  if (luminance(c) >= min) return c;
  for (let t = 0.05; t < 1; t += 0.05) {
    const m = mixWhite(c, t);
    if (luminance(m) >= min) return m;
  }
  return '#ffffff';
}

// ------------------------------------------------------------------------------------------------ home

/**
 * The picture menu (the repo root index.html) from the page's path: under /games/moon-meadow-world/ it is the path
 * before /games/ plus index.html (Emma's server, a test server, online). Elsewhere (vite dev) it is the dev root.
 */
export function menuUrl(pathname: string): string {
  const at = pathname.indexOf('/games/moon-meadow-world/');
  return at >= 0 ? pathname.slice(0, at) + '/index.html' : '/';
}

// ------------------------------------------------------------------------------------------------ wardrobe

/**
 * The customiser's sizes in design px (docs/v4/2.2.md 2.2). The panel hangs from the right edge under the home
 * button; each row has a picture tile and a rail of swatches. A rail box starts half a gap before its first swatch
 * and is `pitch` wide per cell, so the cell under a finger is a plain division (cellAt).
 */
export const WARDROBE = {
  panel: { right: 16, top: 112, w: 628, h: 550, border: 5, pad: 20 },
  rowH: 100,
  /**
   * The row's picture tile, from the panel's outer left edge. 78 instead of the design's 72, so it is a 64 CSS px
   * target at 1024 x 690 too.
   */
  icon: { x: 12, size: 78 },
  /** The rail box, from the panel's outer left edge (its first swatch starts at 100). */
  rail: { x: 96, pitch: 86, track: 88 },
  swatch: 78,
  knob: 92,
  done: { size: 140, bottom: 18 },
  preview: { gap: 12, top: 112, bottom: 180 },
  pill: { top: 14, h: 60 },
  /** The home button (hud.ts): right 16, top 16, 80 round, and its hold ring 17 beyond that. */
  home: { right: 16, top: 16, size: 80 },
} as const;

export interface WardrobeRowBox {
  row: LookRow;
  /** The whole row inside the panel. */
  box: Box;
  /** The picture tile (a tap frames the row). */
  icon: Box;
  /** The rail: the touch target, the full row height, `pitch` wide per cell. */
  rail: Box;
  /** Each swatch. */
  cells: Box[];
}

export interface WardrobeLayout {
  /** One design px in CSS px. */
  unit: number;
  panel: Box;
  rows: WardrobeRowBox[];
  /** Cell pitch, swatch and knob sizes in CSS px. */
  pitch: number;
  swatch: number;
  knob: number;
  /** The round Done button, centred under Princess Emma. */
  done: Box;
  /** Where a drag turns her and a tap makes her wave. */
  preview: Box;
  /** The printed word's pill: its centre x, top and height. */
  pill: { x: number; y: number; h: number };
  /** The home button (without its hold ring). */
  home: Box;
}

/**
 * Every box of the customiser for a screen of w x h CSS px, in CSS px. The game uses it to place Princess Emma (she
 * stands at x = panel.x / 2) and the tests check it at every iPad size. `counts` is the number of options per row.
 */
export function wardrobeLayout(w: number, h: number, counts: readonly number[] = LOOK_ROWS.map((r) => r.options.length)): WardrobeLayout {
  const W = WARDROBE;
  const k = unitFor(Math.max(w, h), Math.min(w, h));
  const px = (n: number) => n * k;
  const panel: Box = { x: w - px(W.panel.right + W.panel.w), y: px(W.panel.top), w: px(W.panel.w), h: px(W.panel.h) };
  const top = panel.y + px(W.panel.border + W.panel.pad);
  const rows = LOOK_ROWS.map((spec, i): WardrobeRowBox => {
    const y = top + px(i * W.rowH);
    const n = counts[i] ?? spec.options.length;
    const rail: Box = { x: panel.x + px(W.rail.x), y, w: px(n * W.rail.pitch), h: px(W.rowH) };
    const inset = (W.rail.pitch - W.swatch) / 2;
    return {
      row: spec.row,
      box: { x: panel.x + px(W.panel.border), y, w: panel.w - px(2 * W.panel.border), h: px(W.rowH) },
      icon: { x: panel.x + px(W.icon.x), y: y + px((W.rowH - W.icon.size) / 2), w: px(W.icon.size), h: px(W.icon.size) },
      rail,
      cells: Array.from({ length: n }, (_, c) => ({
        x: rail.x + px(c * W.rail.pitch + inset),
        y: y + px((W.rowH - W.swatch) / 2),
        w: px(W.swatch),
        h: px(W.swatch),
      })),
    };
  });
  const done: Box = { x: panel.x / 2 - px(W.done.size / 2), y: h - px(W.done.bottom + W.done.size), w: px(W.done.size), h: px(W.done.size) };
  const previewTop = px(W.preview.top);
  const preview: Box = { x: 0, y: previewTop, w: Math.max(0, panel.x - px(W.preview.gap)), h: Math.max(0, h - px(W.preview.bottom) - previewTop) };
  return {
    unit: k,
    panel,
    rows,
    pitch: px(W.rail.pitch),
    swatch: px(W.swatch),
    knob: px(W.knob),
    done,
    preview,
    pill: { x: preview.w / 2, y: px(W.pill.top), h: px(W.pill.h) },
    home: { x: w - px(W.home.right + W.home.size), y: px(W.home.top), w: px(W.home.size), h: px(W.home.size) },
  };
}

/**
 * The cell of a rail under a finger at clientX, from the rail's own box (never elementFromPoint, so a finger that
 * drifts onto the next row stays on this rail): floor((x - left) / pitch), clamped to 0 to n - 1.
 */
export function cellAt(x: number, rail: { x: number; w: number }, n: number, pitch = rail.w / Math.max(1, n)): number {
  if (n < 1) return -1;
  const c = Math.floor((x - rail.x) / pitch);
  if (!Number.isFinite(c)) return 0;
  return Math.max(0, Math.min(n - 1, c));
}

/** True when two boxes share any area. */
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
