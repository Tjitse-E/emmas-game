// The customiser's rules without the DOM (docs/v4/2.2.md 2.3), so tests/wardrobe-ui.test.ts can drive them: which
// option a rail gesture selects, when the 3D look hears of it (onLook), what the end of a gesture does (onPicked, the
// ribbon tap, the word), the focus that frames her face, and the words she hears and sees on release.
import type { Ribbon } from '../contracts';
import {
  LEGACY_ROWS as LOOK_ROWS, normaliseLegacy as normaliseLook, type LegacyLook as PrincessLook, type LegacyRow as LookRow, type LookOption,
  type LookWord,
} from '../wardrobe-legacy';
import { cellAt } from './geometry';
import { press } from './press';

/** Gown and style build new 3D shapes, so they wait until the finger rests on a cell this long. */
export const SETTLE_MS = 150;
/** The focus (a face frame for eyes and hair things) goes back to the body frame this long after the last touch. */
export const UNFOCUS_MS = 2500;
/** At most one spoken word in this time. */
export const WORD_GAP_MS = 1200;
/** How long the printed word stays in its pill. */
export const PILL_MS = 1500;

/** Rows whose change is applied at once; the others wait for SETTLE_MS (2.3: gown and style). */
const AT_ONCE: Record<LookRow, boolean> = { hair: true, eyes: true, gown: false, style: false, thing: true };

export function optionsOf(row: LookRow): readonly LookOption[] {
  return LOOK_ROWS.find((r) => r.row === row)!.options;
}

/** The cell of the option she wears in a row. */
export function indexIn(look: PrincessLook, row: LookRow): number {
  return Math.max(0, optionsOf(row).findIndex((o) => o.id === look[row]));
}

/** The colours she owns, pink first (always hers), each once, in the order she earned them. */
export function ownedRibbons(ribbons: readonly Ribbon[]): Ribbon[] {
  return [...new Set<Ribbon>(['pink', ...ribbons])];
}

/** The ribbon tap: the next colour she owns after the one she wears, round again after the last. */
export function nextOwnedRibbon(current: Ribbon, owned: readonly Ribbon[]): Ribbon {
  const list = ownedRibbons(owned);
  return list[(list.indexOf(current) + 1) % list.length];
}

/** What the rails show and play; the wardrobe implements it with the DOM and audio. */
export interface RailOut {
  /** Move the knob of a row to a cell. */
  select(row: LookRow, cell: number): void;
  /** Her hair colour or ribbon changed: draw the style and hair thing pictures again. */
  recolour(look: PrincessLook): void;
  /** A sparkle on a swatch (the ribbon tap). */
  sparkle(row: LookRow, cell: number): void;
  /** A little hop of a swatch that was tapped again. */
  bounce(row: LookRow, cell: number): void;
  sfx(name: 'tick' | 'pop' | 'sparkle'): void;
  /** Say and print a word, rate limited (WordVoice). */
  word(w: LookWord): void;
}

export interface RailHooks {
  onLook(look: PrincessLook, row: LookRow): void;
  onPicked(look: PrincessLook, row: LookRow): void;
  onFocus(row: LookRow | null): void;
}

interface Gesture {
  row: LookRow;
  /** The look when the finger went down. */
  start: PrincessLook;
  startCell: number;
  cell: number;
  /** The finger has been on another cell since it went down. */
  left: boolean;
}

/**
 * The five rails' state. A finger going down selects the cell under it at once (with a tick), a move into a new cell
 * selects that one, and the end of the gesture (however it ends) speaks the word, plays the reaction and saves.
 */
export class Rails {
  private current: PrincessLook;
  private readonly owned: Ribbon[];
  private g: Gesture | null = null;
  private settle: { row: LookRow; timer: ReturnType<typeof setTimeout> } | null = null;
  private unfocusTimer: ReturnType<typeof setTimeout> | null = null;
  private focused: LookRow | null = null;
  private readonly hooks: RailHooks;
  private readonly out: RailOut;

  constructor(look: PrincessLook, ribbons: readonly Ribbon[], hooks: RailHooks, out: RailOut) {
    this.current = normaliseLook(look);
    this.owned = ownedRibbons(ribbons);
    this.hooks = hooks;
    this.out = out;
  }

  get look(): PrincessLook {
    return { ...this.current };
  }
  get focus(): LookRow | null {
    return this.focused;
  }
  /** A finger is on a rail. */
  get active(): boolean {
    return this.g !== null;
  }

  /** A finger went down on a rail at a cell. A gesture still open ends first. */
  down(row: LookRow, cell: number): void {
    if (this.g) this.end();
    this.clearUnfocus();
    this.setFocus(row);
    this.g = { row, start: this.look, startCell: cell, cell, left: false };
    this.select(row, cell);
  }

  /** The finger moved; only a new cell counts. */
  move(cell: number): void {
    const g = this.g;
    if (!g || cell === g.cell) return;
    g.cell = cell;
    g.left = true;
    this.select(g.row, cell);
  }

  /**
   * The gesture ended (a release anywhere, a cancel, a lost capture or a new touch). Selection already happened; the
   * end applies a waiting gown or style at once, then changes the ribbon (a tap on the worn hair thing), plays the
   * reaction (onPicked, also when nothing changed, so a tap is never dead) and says the option's word.
   */
  end(): void {
    const g = this.g;
    if (!g) return;
    this.g = null;
    this.flush();
    const opt = optionsOf(g.row)[g.cell];
    if (g.row === 'thing' && !g.left && g.startCell === indexIn(g.start, 'thing')) {
      const next = nextOwnedRibbon(this.current.ribbon, this.owned);
      if (next !== this.current.ribbon) {
        this.current = { ...this.current, ribbon: next };
        this.out.recolour(this.look);
        this.hooks.onLook(this.look, 'thing');
      }
      this.out.sparkle('thing', g.cell);
      this.out.sfx('sparkle');
    } else if (this.current[g.row] !== g.start[g.row]) {
      this.out.sfx('pop');
    } else {
      this.out.bounce(g.row, g.cell);
    }
    this.hooks.onPicked(this.look, g.row);
    if (opt?.word) this.out.word(opt.word);
    this.armUnfocus();
  }

  /** A tap on a row's picture tile: frame that part and play its reaction, with no word. */
  icon(row: LookRow): void {
    if (this.g) this.end();
    this.clearUnfocus();
    this.setFocus(row);
    this.hooks.onPicked(this.look, row);
    this.armUnfocus();
  }

  /** The ghost hand's slide: select like a finger does (she really changes), with no reaction and no word. */
  demo(row: LookRow, cell: number): void {
    if (this.g) return;
    this.select(row, cell);
  }

  /** Put a look back at once (the ghost's slide was stopped): every changed row is applied without waiting. */
  restore(look: PrincessLook): void {
    this.cancelSettle();
    const was = this.current;
    this.current = normaliseLook(look);
    for (const r of LOOK_ROWS) {
      if (was[r.row] === this.current[r.row]) continue;
      this.out.select(r.row, indexIn(this.current, r.row));
      this.hooks.onLook(this.look, r.row);
    }
    if (was.hair !== this.current.hair || was.ribbon !== this.current.ribbon) this.out.recolour(this.look);
  }

  /** A waiting gown or style is applied now. */
  flush(): void {
    const s = this.settle;
    if (!s) return;
    this.cancelSettle();
    this.hooks.onLook(this.look, s.row);
  }

  /** The preview is being turned: keep the focus while she looks at her face. */
  hold(): void {
    this.clearUnfocus();
  }
  /** The preview was let go: the focus goes back after the usual time. */
  release(): void {
    if (this.focused) this.armUnfocus();
  }

  /** Stop every timer: on Done a waiting gown or style is applied first (`flush`); a reset drops it. */
  close(flush: boolean): void {
    if (flush) this.flush();
    this.cancelSettle();
    this.clearUnfocus();
    this.g = null;
  }

  private select(row: LookRow, cell: number): void {
    const opt = optionsOf(row)[cell];
    if (!opt || this.current[row] === opt.id) return;
    // Another row still waiting goes first, so onLook never skips a change.
    if (this.settle && this.settle.row !== row) this.flush();
    this.current = { ...this.current, [row]: opt.id };
    this.out.select(row, cell);
    this.out.sfx('tick');
    if (row === 'hair') this.out.recolour(this.look);
    if (AT_ONCE[row]) {
      this.hooks.onLook(this.look, row);
      return;
    }
    this.cancelSettle();
    this.settle = { row, timer: setTimeout(() => this.flush(), SETTLE_MS) };
  }

  private cancelSettle(): void {
    if (this.settle) clearTimeout(this.settle.timer);
    this.settle = null;
  }

  private setFocus(row: LookRow | null): void {
    if (row === this.focused) return;
    this.focused = row;
    this.hooks.onFocus(row);
  }

  private armUnfocus(): void {
    this.clearUnfocus();
    this.unfocusTimer = setTimeout(() => {
      this.unfocusTimer = null;
      this.setFocus(null);
    }, UNFOCUS_MS);
  }

  private clearUnfocus(): void {
    if (this.unfocusTimer) clearTimeout(this.unfocusTimer);
    this.unfocusTimer = null;
  }
}

/**
 * A rail's touch handling: press() on the static rail element, the cell from clientX against the rail's box taken at
 * the touch, every end path into rails.end(). `enabled` refuses touches while the panel slides. Returns the remover.
 */
export function railPress(el: HTMLElement, row: LookRow, rails: Rails, enabled: () => boolean): () => void {
  const n = optionsOf(row).length;
  let box: { x: number; w: number } | null = null;
  return press(el, {
    down: (e) => {
      if (!enabled()) return false;
      const b = el.getBoundingClientRect();
      box = { x: b.left, w: b.width };
      rails.down(row, cellAt(e.clientX, box, n));
    },
    // Only clientX counts: a finger drifting onto the next row stays on this rail while the capture holds.
    move: (e) => {
      if (box) rails.move(cellAt(e.clientX, box, n));
    },
    end: () => {
      box = null;
      rails.end();
    },
  });
}

/** Only one-syllable words of at most five letters are printed (2.3); the catalogue test checks the syllable. */
export function printable(word: string): boolean {
  return /^[a-z]{1,5}$/.test(word);
}

export interface WordVoiceOpts {
  say(clip: string): void;
  show(print: string | null): void;
  /** True while a guidance line plays; the wardrobe calls pump() when it ends. */
  guiding(): boolean;
  now?(): number;
}

/**
 * The words on release: at most one per WORD_GAP_MS, never over Elizabeth's guidance lines, and while she speaks only
 * the newest word waits. The printed word shows with its sound for PILL_MS.
 */
export class WordVoice {
  private pending: LookWord | null = null;
  private last = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pillTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly o: WordVoiceOpts;

  constructor(o: WordVoiceOpts) {
    this.o = o;
  }

  private now(): number {
    return this.o.now ? this.o.now() : performance.now();
  }

  push(w: LookWord): void {
    this.pending = w;
    this.pump();
  }

  /** Say the waiting word when it may be said, or wait for that. */
  pump(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending || this.o.guiding()) return;
    const wait = this.last + WORD_GAP_MS - this.now();
    if (wait > 0) {
      this.timer = setTimeout(() => this.pump(), wait);
      return;
    }
    const w = this.pending;
    this.pending = null;
    this.last = this.now();
    this.o.say(w.clip);
    if (!printable(w.print)) return;
    this.o.show(w.print);
    if (this.pillTimer) clearTimeout(this.pillTimer);
    this.pillTimer = setTimeout(() => {
      this.pillTimer = null;
      this.o.show(null);
    }, PILL_MS);
  }

  /** Forget the waiting word (Done). The pill fades as usual. */
  drop(): void {
    this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Stop everything at once (a reset). */
  close(): void {
    this.drop();
    if (this.pillTimer) clearTimeout(this.pillTimer);
    this.pillTimer = null;
  }
}
