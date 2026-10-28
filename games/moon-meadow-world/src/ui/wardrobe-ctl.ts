// The wardrobe's rules without the DOM (docs/v4/2.3.md section 16, and 2.2.md 2.3 for what stays), so
// tests/wardrobe-ui.test.ts can drive them: which option a rail gesture selects, when the 3D look hears of it (onLook),
// what the end of a gesture does (onPicked, the word or the one effect), the tabs that act on pointerdown, the focus
// that frames her face, the words she hears and sees on release, the fingers the kind ending waits for, and the rows
// of the treasure board.
import type { BoardSpec, GiftItem, GiftSet, LookField, LookTab, PrincessLook, Ribbon } from '../contracts';
import { GIFT_ORDER, GIFT_SETS, TABS, normaliseLook, owns, tabOf, wordOf, type LookWord, type RailSpec } from '../wardrobe';
import { cellAt } from './geometry';
import { press } from './press';

/** Gown, crown, shoes and style build new 3D shapes, so they wait until the finger rests on a cell this long. */
export const SETTLE_MS = 150;
/** The focus (a face frame for the eyes and sparkles tabs) goes back to the body frame this long after the last touch. */
export const UNFOCUS_MS = 2500;
/** At most one spoken word in this time. */
export const WORD_GAP_MS = 1200;
/** How long the printed word stays in its pill. */
export const PILL_MS = 1500;

/** The fields whose change waits for SETTLE_MS (Layer.wardrobe: gown, crown, shoes and style). The rest apply at once. */
export const SETTLE_FIELDS: readonly LookField[] = ['gown', 'crown', 'shoes', 'style'];
/** A pick of these that says no word now plays the dress swish (section 16). */
const SWISH_FIELDS: readonly LookField[] = ['gown', 'extra'];

/** The effects a pick can play, through audio.fx (section 20: wardrobe-ui wires these two for picks). */
export type PickFx = 'dress-swish' | 'crown-twinkle';

/** What the rails show and play; the wardrobe implements it with the DOM and audio. */
export interface RailOut {
  /** The option a field wears changed: move its knob. */
  select(field: LookField, id: string): void;
  /** These fields changed: draw the pictures that depend on them again (swatches.ts SWATCH_DEPS). */
  changed(look: PrincessLook, fields: LookField[]): void;
  /** A little hop of a swatch that was tapped again. */
  bounce(rail: RailSpec, cell: number): void;
  sfx(name: 'tick' | 'pop'): void;
  fx(id: PickFx): void;
  /** Say and print a word, rate limited (WordVoice). True when it is said now, false when it waits. */
  word(w: LookWord): boolean;
}

export interface RailHooks {
  onLook(look: PrincessLook, field: LookField): void;
  onPicked(look: PrincessLook, field: LookField): void;
  onFocus(tab: LookTab | null): void;
}

interface Gesture {
  rail: RailSpec;
  /** The look when the finger went down. */
  start: PrincessLook;
  cell: number;
}

/**
 * The rails' state. A finger going down selects the cell under it at once (with a tick), a move into a new cell
 * selects that one, and the end of the gesture (however it ends) gives the one sound of the pick and its reaction:
 * the option's word when it has one, else its effect. A pick that says a word plays no effect, so nothing plays under
 * her word; a gown shape or extra whose word must wait for the word gap plays the swish now instead.
 */
export class Rails {
  private current: PrincessLook;
  private g: Gesture | null = null;
  private settle: { field: LookField; timer: ReturnType<typeof setTimeout> } | null = null;
  private unfocusTimer: ReturnType<typeof setTimeout> | null = null;
  private focused: LookTab | null = null;
  private muted = false;
  private readonly hooks: RailHooks;
  private readonly out: RailOut;

  constructor(look: PrincessLook, hooks: RailHooks, out: RailOut) {
    this.current = normaliseLook(look);
    this.hooks = hooks;
    this.out = out;
  }

  get look(): PrincessLook {
    return { ...this.current };
  }
  get focus(): LookTab | null {
    return this.focused;
  }
  /** A finger is on a rail. */
  get active(): boolean {
    return this.g !== null;
  }

  /** A finger went down on a rail at a cell. A gesture still open ends first. */
  down(rail: RailSpec, cell: number): void {
    if (this.g) this.end();
    this.clearUnfocus();
    this.setFocus(tabOf(rail.field));
    this.g = { rail, start: this.look, cell };
    this.select(rail, cell);
  }

  /** The finger moved; only a new cell counts. */
  move(cell: number): void {
    const g = this.g;
    if (!g || cell === g.cell) return;
    g.cell = cell;
    this.select(g.rail, cell);
  }

  /**
   * The gesture ended (a release anywhere, a cancel, a lost capture or a new touch). Selection already happened; the
   * end applies a waiting shape at once, then gives the pick's one sound (its word, or its effect when it says none
   * now), and its reaction (onPicked, also when nothing changed, so a tap is never dead).
   */
  end(): void {
    const g = this.g;
    if (!g) return;
    this.g = null;
    this.flush();
    const field = g.rail.field;
    const id = g.rail.ids[g.cell];
    const changed = this.current[field] !== g.start[field];
    if (!changed) this.out.bounce(g.rail, g.cell);
    else if (!this.muted) {
      const w = id === undefined ? undefined : wordOf(field, id);
      const now = w ? this.out.word(w) : false;
      if (SWISH_FIELDS.includes(field) && !now) this.out.fx('dress-swish');
      else if (field === 'crown' && !w) this.out.fx('crown-twinkle');
      else if (!w) this.out.sfx('pop');
    }
    // A tap on what she wears says its word again (no effect): hearing a colour's name is the point.
    if (!changed && !this.muted && id !== undefined) {
      const w = wordOf(field, id);
      if (w) this.out.word(w);
    }
    this.hooks.onPicked(this.look, field);
    this.armUnfocus();
  }

  /**
   * A tab tile was pressed (it acts on pointerdown): an open gesture ends first, then the tab frames her and she plays
   * the reaction of its first field. No speech.
   */
  tab(tab: LookTab): void {
    if (this.g) this.end();
    this.clearUnfocus();
    this.setFocus(tab);
    this.hooks.onPicked(this.look, TABS.find((t) => t.tab === tab)!.fields[0]);
    this.armUnfocus();
  }

  /** The ghost hand's slide: select like a finger does (she really changes), with no reaction and no word. */
  demo(rail: RailSpec, cell: number): void {
    if (this.g) return;
    this.select(rail, cell);
  }

  /** Put a look back at once (the ghost's slide was stopped): every changed field is applied without waiting. */
  restore(look: PrincessLook): void {
    this.cancelSettle();
    const was = this.current;
    this.current = normaliseLook(look);
    const fields = (Object.keys(this.current) as LookField[]).filter((f) => was[f] !== this.current[f]);
    for (const f of fields) {
      this.out.select(f, this.current[f]);
      this.hooks.onLook(this.look, f);
    }
    if (fields.length) this.out.changed(this.look, fields);
  }

  /** A waiting shape is applied now. */
  flush(): void {
    const s = this.settle;
    if (!s) return;
    this.cancelSettle();
    this.hooks.onLook(this.look, s.field);
  }

  /** The preview is being turned: keep the focus while she looks at her face. */
  hold(): void {
    this.clearUnfocus();
  }
  /** The preview was let go: the focus goes back after the usual time. */
  release(): void {
    if (this.focused) this.armUnfocus();
  }

  /** The music box ran out: a release still picks, but says no word and plays no effect (the kind ending speaks). */
  mute(): void {
    this.muted = true;
  }

  /** Stop every timer: at the end a waiting shape is applied first (`flush`); a reset drops it. */
  close(flush: boolean): void {
    if (flush) this.flush();
    this.cancelSettle();
    this.clearUnfocus();
    this.g = null;
  }

  private select(rail: RailSpec, cell: number): void {
    const field = rail.field;
    const id = rail.ids[cell];
    if (id === undefined || this.current[field] === id) return;
    // Another field still waiting goes first, so onLook never skips a change.
    if (this.settle && this.settle.field !== field) this.flush();
    this.current = { ...this.current, [field]: id };
    this.out.select(field, id);
    this.out.sfx('tick');
    this.out.changed(this.look, [field]);
    if (!SETTLE_FIELDS.includes(field)) {
      this.hooks.onLook(this.look, field);
      return;
    }
    this.cancelSettle();
    this.settle = { field, timer: setTimeout(() => this.flush(), SETTLE_MS) };
  }

  private cancelSettle(): void {
    if (this.settle) clearTimeout(this.settle.timer);
    this.settle = null;
  }

  private setFocus(tab: LookTab | null): void {
    if (tab === this.focused) return;
    this.focused = tab;
    this.hooks.onFocus(tab);
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
 * the touch, every end path into rails.end(). `spec` is what the rail holds now (the tab decides; null while it is
 * empty). `enabled` refuses touches while the panel slides, the board shows or the music box has run out.
 */
export function railPress(el: HTMLElement, spec: () => RailSpec | null, rails: Rails, enabled: () => boolean): () => void {
  let box: { x: number; w: number } | null = null;
  let n = 0;
  return press(el, {
    down: (e) => {
      const r = spec();
      if (!enabled() || !r) return false;
      const b = el.getBoundingClientRect();
      box = { x: b.left, w: b.width };
      n = r.ids.length;
      rails.down(r, cellAt(e.clientX, box, n));
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

/**
 * A tab tile acts on pointerdown (section 16): the rails change while the finger is on the tab, never under it. The
 * press is refused straight after, so nothing waits for a release; press() has already ended a palm resting on a rail
 * (its window pointerdown runs first), as a release.
 */
export function tabPress(el: HTMLElement, tab: LookTab, act: (tab: LookTab) => void, enabled: () => boolean): () => void {
  return press(el, {
    down: () => {
      if (enabled()) act(tab);
      return false;
    },
    end: () => {},
  });
}

// ------------------------------------------------------------------------------------------------ words

/** Only one-syllable words of at most five letters are printed (2.3); the catalogue test checks the syllable. */
export function printable(word: string | undefined): word is string {
  return !!word && /^[a-z]{1,5}$/.test(word);
}

/** The normal print ink (ui.css --ink): every printed word, colour words included, is in it. */
export const PRINT_INK = 'var(--ink)';

/** What the word pill shows: the printed word in the normal ink, never in its own colour (section 14 fix 5). */
export interface Pill {
  text: string;
  ink: string;
}

/** The pill of a word, or null when it is said only. */
export function pillOf(w: LookWord): Pill | null {
  return printable(w.print) ? { text: w.print, ink: PRINT_INK } : null;
}

export interface WordVoiceOpts {
  say(clip: string): void;
  show(pill: Pill | null): void;
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

  /** A word may be said at once: no guidance line and the gap since the last word is over. */
  ready(): boolean {
    return !this.o.guiding() && this.now() >= this.last + WORD_GAP_MS;
  }

  /** Say this word now, or let it wait as the newest. True when it was said at once. */
  push(w: LookWord): boolean {
    this.pending = w;
    return this.pump();
  }

  /** Say the waiting word when it may be said, or wait for that. True when a word was said. */
  pump(): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending || this.o.guiding()) return false;
    const wait = this.last + WORD_GAP_MS - this.now();
    if (wait > 0) {
      this.timer = setTimeout(() => void this.pump(), wait);
      return false;
    }
    const w = this.pending;
    this.pending = null;
    this.last = this.now();
    this.o.say(w.clip);
    const pill = pillOf(w);
    if (!pill) return true;
    this.o.show(pill);
    if (this.pillTimer) clearTimeout(this.pillTimer);
    this.pillTimer = setTimeout(() => {
      this.pillTimer = null;
      this.o.show(null);
    }, PILL_MS);
    return true;
  }

  /** Forget the waiting word (the end). The pill fades as usual. */
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

// ------------------------------------------------------------------------------------------------ fingers

type Listenable = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/**
 * The fingers on the screen, read from window in the capture phase as press.ts does: a pointerdown adds one, a
 * pointerup, a pointercancel or a lost capture takes it away (on her iPad the release can miss every element, and
 * a lost capture may be all that comes). The kind ending waits until none is down (allUp).
 */
export class Fingers {
  private readonly down = new Set<number>();
  private waiters: (() => void)[] = [];
  private readonly target: Listenable;
  private readonly onDown = (e: PointerEvent) => void this.down.add(e.pointerId);
  private readonly onUp = (e: PointerEvent) => this.lift(e.pointerId);

  constructor(target: Listenable = window) {
    this.target = target;
    target.addEventListener('pointerdown', this.onDown, true);
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) target.addEventListener(t, this.onUp, true);
  }

  get count(): number {
    return this.down.size;
  }

  /**
   * Resolves true once no finger is down, or false after `maxMs` with a finger still down. It resolves on the next
   * task after the last lift, so every handler of that release (the rail's own end) has run first.
   */
  allUp(maxMs: number): Promise<boolean> {
    if (!this.down.size) return Promise.resolve(true);
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.waiters = this.waiters.filter((w) => w !== up);
        resolve(ok);
      };
      const up = () => setTimeout(() => finish(true), 0);
      const timer = setTimeout(() => finish(false), maxMs);
      this.waiters.push(up);
    });
  }

  close(): void {
    this.target.removeEventListener('pointerdown', this.onDown, true);
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.target.removeEventListener(t, this.onUp, true);
    this.down.clear();
    this.waiters = [];
  }

  private lift(id: number): void {
    if (!this.down.delete(id) || this.down.size) return;
    for (const w of this.waiters.splice(0)) w();
  }
}

// ------------------------------------------------------------------------------------------------ the treasure board

export interface BoardPlace {
  item?: GiftItem;
  ribbon?: Ribbon;
  owned: boolean;
  /** Got today: it sparkles. */
  fresh: boolean;
}

export interface BoardRow {
  set: GiftSet | 'ribbons';
  places: BoardPlace[];
  /** Every place is hers: the row has its gold star sticker. */
  full: boolean;
}

/** The board's rows (section 16): the four gift sets in GIFT_SETS order (4, 3, 6, 8 places), then the 5 ribbons. */
export function boardRows(spec: BoardSpec): BoardRow[] {
  const isFresh = (i: GiftItem) => spec.fresh.some((f) => f.field === i.field && f.id === i.id);
  const rows: BoardRow[] = (Object.keys(GIFT_SETS) as GiftSet[]).map((set) => {
    const places = GIFT_SETS[set].items.map((item): BoardPlace => ({ item, owned: owns(spec.owned, item), fresh: isFresh(item) }));
    return { set, places, full: places.every((p) => p.owned) };
  });
  const ribbons = GIFT_ORDER.map((ribbon): BoardPlace => ({ ribbon, owned: spec.ribbons.includes(ribbon), fresh: false }));
  rows.push({ set: 'ribbons', places: ribbons, full: ribbons.every((p) => p.owned) });
  return rows;
}
