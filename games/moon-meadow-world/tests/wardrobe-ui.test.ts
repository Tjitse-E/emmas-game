// The customiser's layer side (docs/v4/2.2.md 2.2, 2.3 and 8.1): the layout at every iPad size, cellAt, the rail
// rules (select on down and on move, onLook timing, one end per gesture on every end path, the ribbon tap, the
// focus), the words on release, the swatch pictures, and onPress on press() (the play-again moon, Lumi, the arrow).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LookRow, PrincessLook, Ribbon } from '../src/contracts';
import { DEFAULT_LOOK, LOOK_ROWS, type LookWord } from '../src/wardrobe';
import { cellAt, overlaps, unitFor, wardrobeLayout, type Box } from '../src/ui/geometry';
import { PILL_MS, Rails, SETTLE_MS, UNFOCUS_MS, WORD_GAP_MS, WordVoice, nextOwnedRibbon, ownedRibbons, printable, railPress } from '../src/ui/wardrobe-ctl';
import { rowIconSvg, swatchSvg } from '../src/ui/swatches';
import { onPress } from '../src/ui/dom';

// ------------------------------------------------------------------------------------------------ fakes

type Fn = (e: PointerEvent) => void;

class FakeTarget {
  private readonly listeners: { type: string; fn: Fn; capture: boolean }[] = [];
  addEventListener(type: string, fn: Fn, capture: boolean | { capture?: boolean } = false): void {
    this.listeners.push({ type, fn, capture: typeof capture === 'boolean' ? capture : !!capture.capture });
  }
  removeEventListener(type: string, fn: Fn, capture: boolean | { capture?: boolean } = false): void {
    const c = typeof capture === 'boolean' ? capture : !!capture.capture;
    const i = this.listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === c);
    if (i >= 0) this.listeners.splice(i, 1);
  }
  fire(type: string, o: { id?: number; x?: number; y?: number } = {}): void {
    const e = { type, pointerId: o.id ?? 1, clientX: o.x ?? 0, clientY: o.y ?? 0, preventDefault() {}, stopPropagation() {} } as unknown as PointerEvent;
    for (const l of this.listeners.filter((l) => l.type === type)) l.fn(e);
  }
}

/** An element at a fixed box, with pointer capture and a class list. */
class FakeElement extends FakeTarget {
  captured = new Set<number>();
  readonly classes = new Set<string>();
  readonly classList = {
    add: (...c: string[]) => c.forEach((x) => this.classes.add(x)),
    remove: (...c: string[]) => c.forEach((x) => this.classes.delete(x)),
  };
  private readonly box: Box;
  constructor(box: Box) {
    super();
    this.box = box;
  }
  getBoundingClientRect() {
    const b = this.box;
    return { left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h, width: b.w, height: b.h, x: b.x, y: b.y };
  }
  setPointerCapture(id: number): void {
    this.captured.add(id);
  }
  releasePointerCapture(id: number): void {
    if (!this.captured.delete(id)) throw new Error('NotFoundError');
  }
}

let win: FakeTarget;
beforeEach(() => {
  win = new FakeTarget();
  vi.stubGlobal('window', win);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** A real release: the window hears it first (capture phase), then the element. */
function touch(el: FakeElement, x: number, id = 1) {
  win.fire('pointerdown', { id, x });
  el.fire('pointerdown', { id, x });
}

/** Rails with every output recorded as a line. */
function railsWith(o: { look?: Partial<PrincessLook>; ribbons?: Ribbon[] } = {}) {
  const log: string[] = [];
  const looks: PrincessLook[] = [];
  const words: LookWord[] = [];
  const rails = new Rails({ ...DEFAULT_LOOK, ...o.look }, o.ribbons ?? [], {
    onLook: (l, row) => {
      looks.push(l);
      log.push(`look ${row} ${row === 'thing' ? `${l.thing} ${l.ribbon}` : l[row]}`);
    },
    onPicked: (l, row) => log.push(`picked ${row} ${l[row]}`),
    onFocus: (row) => log.push(`focus ${row}`),
  }, {
    select: (row, cell) => log.push(`knob ${row} ${cell}`),
    recolour: (l) => log.push(`recolour ${l.hair} ${l.ribbon}`),
    sparkle: (row, cell) => log.push(`sparkle ${row} ${cell}`),
    bounce: (row, cell) => log.push(`bounce ${row} ${cell}`),
    sfx: (name) => log.push(`sfx ${name}`),
    word: (w) => {
      words.push(w);
      log.push(`word ${w.print}`);
    },
  });
  return { rails, log, looks, words, take: () => log.splice(0) };
}

// ------------------------------------------------------------------------------------------------ layout

const SIZES: [number, number][] = [[1080, 810], [1080, 740], [1024, 690], [1180, 820], [1366, 1024]];
const inside = (a: Box, b: Box, pad = 0.01) => a.x >= b.x - pad && a.y >= b.y - pad && a.x + a.w <= b.x + b.w + pad && a.y + a.h <= b.y + b.h + pad;

describe('cellAt', () => {
  const rail = { x: 100, w: 6 * 86 };
  it('divides the rail into cells of one pitch', () => {
    expect(cellAt(100, rail, 6)).toBe(0);
    expect(cellAt(185.9, rail, 6)).toBe(0);
    expect(cellAt(186, rail, 6)).toBe(1);
    expect(cellAt(100 + 5 * 86, rail, 6)).toBe(5);
    expect(cellAt(100 + 6 * 86 - 0.1, rail, 6)).toBe(5);
  });
  it('clamps a finger off either end to the first or last cell', () => {
    expect(cellAt(-500, rail, 6)).toBe(0);
    expect(cellAt(99, rail, 6)).toBe(0);
    expect(cellAt(100 + 6 * 86, rail, 6)).toBe(5);
    expect(cellAt(5000, rail, 6)).toBe(5);
    expect(cellAt(5000, { x: 100, w: 4 * 86 }, 4)).toBe(3);
  });
  it('takes an explicit pitch and survives junk', () => {
    expect(cellAt(100 + 90, rail, 6, 90)).toBe(1);
    expect(cellAt(Number.NaN, rail, 6)).toBe(0);
    expect(cellAt(150, rail, 0)).toBe(-1);
  });
});

describe('wardrobeLayout', () => {
  it('matches the design table at 1080 x 810 and 1080 x 740', () => {
    const a = wardrobeLayout(1080, 810);
    expect(Math.round(a.panel.x)).toBe(491);
    expect(Math.round(a.panel.x + a.panel.w)).toBe(1065);
    expect(Math.round(a.panel.y)).toBe(103);
    expect(Math.round(a.panel.y + a.panel.h)).toBe(606);
    expect(a.rows[0].box.h).toBeCloseTo(91.5, 0);
    expect(Math.round(a.done.w)).toBe(128);
    const b = wardrobeLayout(1080, 740);
    expect(Math.round(b.panel.x)).toBe(499);
    expect(Math.round(b.panel.y)).toBe(101);
    expect(Math.round(b.panel.y + b.panel.h)).toBe(597);
    expect(Math.round(b.swatch)).toBe(70);
    expect(Math.round(b.done.w)).toBe(126);
  });

  it('keeps the rows in Emma order, with six cells or fewer, left-aligned', () => {
    const l = wardrobeLayout(1080, 740);
    expect(l.rows.map((r) => r.row)).toEqual(['hair', 'eyes', 'gown', 'style', 'thing']);
    expect(l.rows.map((r) => r.cells.length)).toEqual(LOOK_ROWS.map((r) => r.options.length));
    const style = l.rows[3];
    expect(style.cells).toHaveLength(4);
    expect(style.rail.x).toBe(l.rows[0].rail.x);
    expect(style.rail.w).toBeCloseTo(4 * l.pitch);
  });

  for (const [w, h] of SIZES) {
    describe(`at ${w} x ${h}`, () => {
      const l = wardrobeLayout(w, h);
      const screen: Box = { x: 0, y: 0, w, h };

      it('has swatches and targets of at least 64 CSS px', () => {
        expect(l.swatch).toBeGreaterThanOrEqual(64);
        for (const r of l.rows) {
          for (const c of r.cells) expect(Math.min(c.w, c.h)).toBeGreaterThanOrEqual(64);
          expect(Math.min(r.icon.w, r.icon.h)).toBeGreaterThanOrEqual(64);
          expect(r.rail.h).toBeGreaterThanOrEqual(64);
        }
        expect(l.done.w).toBeGreaterThanOrEqual(64);
      });

      it('puts the panel on screen and below the home button', () => {
        expect(inside(l.panel, screen)).toBe(true);
        expect(l.panel.y).toBeGreaterThanOrEqual(l.home.y + l.home.h + 12 * l.unit);
        expect(overlaps(l.panel, l.home)).toBe(false);
        expect(l.unit).toBeCloseTo(unitFor(w, h));
      });

      it('keeps every row, tile, rail and swatch inside the panel, and the swatches inside their rail', () => {
        const inner: Box = { x: l.panel.x + 5 * l.unit, y: l.panel.y + 5 * l.unit, w: l.panel.w - 10 * l.unit, h: l.panel.h - 10 * l.unit };
        l.rows.forEach((r, i) => {
          expect(inside(r.icon, inner)).toBe(true);
          expect(inside(r.rail, inner)).toBe(true);
          expect(overlaps(r.icon, r.rail)).toBe(false);
          for (const c of r.cells) expect(inside(c, r.rail)).toBe(true);
          if (i > 0) expect(r.rail.y).toBeCloseTo(l.rows[i - 1].rail.y + l.rows[i - 1].rail.h);
          // The cell under a swatch's centre is that swatch.
          r.cells.forEach((c, j) => expect(cellAt(c.x + c.w / 2, r.rail, r.cells.length)).toBe(j));
        });
      });

      it('puts Done on screen, under her, clear of the panel and of the home button', () => {
        expect(inside(l.done, screen)).toBe(true);
        expect(overlaps(l.done, l.panel)).toBe(false);
        expect(overlaps(l.done, l.home)).toBe(false);
        expect(l.done.x + l.done.w / 2).toBeCloseTo(l.panel.x / 2);
      });

      it('keeps the preview box clear of Done, the panel and the home button, and the pill above it', () => {
        expect(l.preview.w).toBeGreaterThan(300);
        expect(l.preview.h).toBeGreaterThan(300);
        expect(overlaps(l.preview, l.done)).toBe(false);
        expect(overlaps(l.preview, l.panel)).toBe(false);
        expect(overlaps(l.preview, l.home)).toBe(false);
        expect(l.pill.y + l.pill.h).toBeLessThanOrEqual(l.preview.y);
        expect(l.pill.x).toBeCloseTo(l.preview.w / 2);
      });
    });
  }
});

// ------------------------------------------------------------------------------------------------ rails

describe('the rails', () => {
  it('selects on down with a tick, and every new cell of a slide', () => {
    const r = railsWith();
    r.rails.down('hair', 2);
    expect(r.take()).toEqual(['focus hair', 'knob hair 2', 'sfx tick', 'recolour chestnut pink', 'look hair chestnut']);
    r.rails.move(2);
    expect(r.take()).toEqual([]);
    r.rails.move(3);
    r.rails.move(3);
    expect(r.take()).toEqual(['knob hair 3', 'sfx tick', 'recolour midnight pink', 'look hair midnight']);
    expect(r.rails.look.hair).toBe('midnight');
  });

  it('gives no tick and no onLook for the option she already wears', () => {
    const r = railsWith();
    r.rails.down('eyes', 0);
    expect(r.take()).toEqual(['focus eyes']);
  });

  it('applies eyes and hair things at once, gown and style 150 ms after the finger settles', () => {
    vi.useFakeTimers();
    const r = railsWith();
    r.rails.down('eyes', 5);
    expect(r.log).toContain('look eyes violet');
    r.rails.end();
    r.take();
    r.rails.down('gown', 1);
    r.rails.move(2);
    r.rails.move(3);
    expect(r.log.filter((l) => l.startsWith('look'))).toEqual([]);
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(r.log.filter((l) => l.startsWith('look'))).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(r.log.filter((l) => l.startsWith('look'))).toEqual(['look gown moon']);
    r.take();
    r.rails.move(4);
    // The end applies a waiting gown at once, before the reaction.
    r.rails.end();
    expect(r.take()).toEqual(['knob gown 4', 'sfx tick', 'look gown fairy', 'sfx pop', 'picked gown fairy', 'word wings']);
    vi.advanceTimersByTime(1000);
    expect(r.log.filter((l) => l.startsWith('look'))).toEqual([]);
  });

  it('ends a gesture once, with the reaction and the word only at the end', () => {
    const r = railsWith();
    r.rails.down('style', 3);
    expect(r.log.some((l) => l.startsWith('picked') || l.startsWith('word'))).toBe(false);
    r.rails.end();
    r.rails.end();
    expect(r.log.filter((l) => l.startsWith('picked'))).toEqual(['picked style bun']);
    expect(r.words.map((w) => w.clip)).toEqual(['word-bun']);
  });

  it('plays the reaction and a hop when she taps what she wears, without a pop', () => {
    const r = railsWith();
    r.rails.down('gown', 0);
    r.rails.end();
    expect(r.take()).toEqual(['focus gown', 'bounce gown 0', 'picked gown rose', 'word dress']);
  });

  it('a tap on the worn hair thing changes the ribbon to the next one she owns, round again', () => {
    const r = railsWith({ ribbons: ['lilac', 'sky'] });
    r.rails.down('thing', 0);
    r.rails.end();
    expect(r.take()).toEqual(['focus thing', 'recolour sunny lilac', 'look thing bows lilac', 'sparkle thing 0', 'sfx sparkle', 'picked thing bows', 'word bow']);
    for (const want of ['sky', 'pink', 'lilac']) {
      r.rails.down('thing', 0);
      r.rails.end();
      expect(r.rails.look.ribbon).toBe(want);
    }
  });

  it('with only pink, a tap on the worn hair thing is just a sparkle', () => {
    const r = railsWith();
    r.rails.down('thing', 0);
    r.rails.end();
    expect(r.rails.look.ribbon).toBe('pink');
    expect(r.take()).toEqual(['focus thing', 'sparkle thing 0', 'sfx sparkle', 'picked thing bows', 'word bow']);
  });

  it('keeps the ribbon when the finger left the worn cell, or picked another hair thing', () => {
    const r = railsWith({ ribbons: ['lilac'] });
    r.rails.down('thing', 0);
    r.rails.move(1);
    r.rails.move(0);
    r.rails.end();
    expect(r.rails.look).toMatchObject({ thing: 'bows', ribbon: 'pink' });
    r.rails.down('thing', 2);
    r.rails.end();
    expect(r.rails.look).toMatchObject({ thing: 'flowers', ribbon: 'pink' });
    // The thing she wears now is the flower clip: a tap on it changes the ribbon.
    r.rails.down('thing', 2);
    r.rails.end();
    expect(r.rails.look).toMatchObject({ thing: 'flowers', ribbon: 'lilac' });
  });

  it('ends a stale gesture when a new one starts', () => {
    const r = railsWith();
    r.rails.down('hair', 1);
    r.rails.down('eyes', 2);
    expect(r.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair strawberry']);
    expect(r.rails.active).toBe(true);
    r.rails.end();
    expect(r.rails.active).toBe(false);
  });

  it('frames a row on touch and lets go of the focus 2.5 s after the last touch', () => {
    vi.useFakeTimers();
    const r = railsWith();
    r.rails.down('eyes', 1);
    expect(r.rails.focus).toBe('eyes');
    vi.advanceTimersByTime(UNFOCUS_MS * 2);
    expect(r.rails.focus).toBe('eyes');
    r.rails.end();
    vi.advanceTimersByTime(UNFOCUS_MS - 1);
    expect(r.rails.focus).toBe('eyes');
    r.rails.hold();
    vi.advanceTimersByTime(UNFOCUS_MS * 2);
    expect(r.rails.focus).toBe('eyes');
    r.rails.release();
    vi.advanceTimersByTime(UNFOCUS_MS);
    expect(r.rails.focus).toBe(null);
    expect(r.log.filter((l) => l.startsWith('focus'))).toEqual(['focus eyes', 'focus null']);
  });

  it('a row tile frames that row and plays its reaction, with no word', () => {
    const r = railsWith();
    r.rails.icon('thing');
    expect(r.take()).toEqual(['focus thing', 'picked thing bows']);
  });

  it('the ghost slide changes her without a reaction, and a stop puts her look back at once', () => {
    vi.useFakeTimers();
    const r = railsWith();
    r.rails.demo('gown', 1);
    r.rails.demo('gown', 2);
    vi.advanceTimersByTime(SETTLE_MS);
    expect(r.rails.look.gown).toBe('lilac');
    r.rails.demo('gown', 3);
    r.take();
    r.rails.restore(DEFAULT_LOOK);
    expect(r.take()).toEqual(['knob gown 0', 'look gown rose']);
    vi.advanceTimersByTime(1000);
    expect(r.log).toEqual([]);
    expect(r.rails.look).toEqual(DEFAULT_LOOK);
  });

  it('close on Done applies a waiting gown; close on reset drops it', () => {
    vi.useFakeTimers();
    const a = railsWith();
    a.rails.down('gown', 4);
    a.rails.close(true);
    expect(a.looks.at(-1)?.gown).toBe('fairy');
    const b = railsWith();
    b.rails.down('gown', 4);
    b.rails.close(false);
    vi.advanceTimersByTime(1000);
    expect(b.looks).toEqual([]);
  });

  it('owns pink first and cycles the ribbons she owns', () => {
    expect(ownedRibbons([])).toEqual(['pink']);
    expect(ownedRibbons(['lilac', 'pink', 'sky', 'lilac'])).toEqual(['pink', 'lilac', 'sky']);
    expect(nextOwnedRibbon('pink', [])).toBe('pink');
    expect(nextOwnedRibbon('pink', ['lilac', 'sky'])).toBe('lilac');
    expect(nextOwnedRibbon('sky', ['lilac', 'sky'])).toBe('pink');
    expect(nextOwnedRibbon('coral', ['lilac'])).toBe('pink');
  });
});

describe('a rail on press()', () => {
  // Rail boxes as at 1080 x 740.
  const L = wardrobeLayout(1080, 740);
  const at = (row: LookRow, cell: number) => {
    const c = L.rows.find((r) => r.row === row)!.cells[cell];
    return c.x + c.w / 2;
  };
  const setup = (enabled = () => true) => {
    const r = railsWith();
    const rail = (row: LookRow) => {
      const el = new FakeElement(L.rows.find((x) => x.row === row)!.rail);
      railPress(el as unknown as HTMLElement, row, r.rails, enabled);
      return el;
    };
    return { ...r, rail };
  };

  it('selects from clientX on down and on move, and ends once on a window release far off the rail', () => {
    const s = setup();
    const eyes = s.rail('eyes');
    touch(eyes, at('eyes', 1));
    expect(s.rails.look.eyes).toBe('green');
    // The finger drifts down over the next rows and the canvas: only x counts.
    eyes.fire('pointermove', { x: at('eyes', 5), y: 700 });
    expect(s.rails.look.eyes).toBe('violet');
    win.fire('pointerup', { x: at('eyes', 5), y: 700 });
    eyes.fire('lostpointercapture');
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked eyes violet']);
    expect(s.rails.active).toBe(false);
  });

  it('ends on a lost capture with no release at all, and on a window pointercancel mid-slide', () => {
    const s = setup();
    const hair = s.rail('hair');
    touch(hair, at('hair', 3));
    hair.fire('lostpointercapture');
    win.fire('pointerup');
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair midnight']);
    const gown = s.rail('gown');
    touch(gown, at('gown', 1), 2);
    gown.fire('pointermove', { id: 2, x: at('gown', 2) });
    win.fire('pointercancel', { id: 2 });
    expect(s.rails.active).toBe(false);
    // The rail is free: the next touch works.
    touch(gown, at('gown', 5), 3);
    win.fire('pointerup', { id: 3 });
    expect(s.rails.look.gown).toBe('tutu');
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair midnight', 'picked gown lilac', 'picked gown tutu']);
  });

  it('a touch on another rail ends the open one first', () => {
    const s = setup();
    const hair = s.rail('hair');
    const gown = s.rail('gown');
    touch(hair, at('hair', 4), 1);
    touch(gown, at('gown', 3), 2);
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair candy']);
    win.fire('pointerup', { id: 1 });
    win.fire('pointerup', { id: 2 });
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair candy', 'picked gown moon']);
  });

  it('refuses touches while the panel is not taking them', () => {
    const s = setup(() => false);
    const hair = s.rail('hair');
    touch(hair, at('hair', 4));
    win.fire('pointerup');
    expect(s.log).toEqual([]);
    expect(hair.captured.size).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------ words

describe('words on release', () => {
  const w = (print: string): LookWord => ({ clip: `word-${print}`, print });
  const voice = () => {
    let guiding = false;
    const said: string[] = [];
    const pill: (string | null)[] = [];
    const v = new WordVoice({ say: (c) => said.push(c), show: (p) => pill.push(p), guiding: () => guiding, now: () => Date.now() });
    return { v, said, pill, guide: (on: boolean) => (guiding = on) };
  };

  it('says at most one word per 1.2 s, and only the newest waits', () => {
    vi.useFakeTimers();
    const s = voice();
    s.v.push(w('dress'));
    s.v.push(w('gown'));
    s.v.push(w('bun'));
    expect(s.said).toEqual(['word-dress']);
    vi.advanceTimersByTime(WORD_GAP_MS - 1);
    expect(s.said).toEqual(['word-dress']);
    vi.advanceTimersByTime(1);
    expect(s.said).toEqual(['word-dress', 'word-bun']);
    vi.advanceTimersByTime(5000);
    expect(s.said).toEqual(['word-dress', 'word-bun']);
  });

  it('never speaks over a guidance line, and goes when it ends', () => {
    vi.useFakeTimers();
    const s = voice();
    s.guide(true);
    s.v.push(w('bow'));
    vi.advanceTimersByTime(5000);
    expect(s.said).toEqual([]);
    s.guide(false);
    s.v.pump();
    expect(s.said).toEqual(['word-bow']);
  });

  it('prints the word for 1.5 s while it is said', () => {
    vi.useFakeTimers();
    const s = voice();
    s.v.push(w('stars'));
    expect(s.pill).toEqual(['stars']);
    vi.advanceTimersByTime(PILL_MS);
    expect(s.pill).toEqual(['stars', null]);
  });

  it('prints only short words', () => {
    expect(printable('heart')).toBe(true);
    expect(printable('wings')).toBe(true);
    expect(printable('ribbon')).toBe(false);
    expect(printable('')).toBe(false);
  });

  it('drop forgets the waiting word', () => {
    vi.useFakeTimers();
    const s = voice();
    s.v.push(w('dress'));
    s.v.push(w('gown'));
    s.v.drop();
    vi.advanceTimersByTime(5000);
    expect(s.said).toEqual(['word-dress']);
  });
});

// ------------------------------------------------------------------------------------------------ pictures

describe('swatch pictures', () => {
  it('draws every option and every row tile as SVG with no text', () => {
    for (const r of LOOK_ROWS) {
      for (const o of r.options) {
        const s = swatchSvg(r.row, o.id, DEFAULT_LOOK);
        expect(s.startsWith('<svg viewBox="0 0 100 100"')).toBe(true);
        expect(s).not.toMatch(/<text|<foreignObject|NaN|undefined/);
      }
      const icon = rowIconSvg(r.row, DEFAULT_LOOK);
      expect(icon).not.toMatch(/<text|NaN|undefined/);
    }
  });

  it('draws the styles in her hair colour and the hair things in her ribbon colour', () => {
    const chestnut = { ...DEFAULT_LOOK, hair: 'chestnut' as const };
    expect(swatchSvg('style', 'bun', chestnut)).toContain('#9a6142');
    expect(swatchSvg('style', 'bun', DEFAULT_LOOK)).not.toContain('#9a6142');
    expect(rowIconSvg('hair', chestnut)).toContain('#9a6142');
    const sky = { ...DEFAULT_LOOK, ribbon: 'sky' as const };
    for (const id of ['bows', 'unicorn', 'flowers', 'stars', 'butterflies', 'hearts']) expect(swatchSvg('thing', id, sky)).toContain('#5fb4ff');
    expect(rowIconSvg('thing', sky)).toContain('#5fb4ff');
  });

  it('gives every gradient its own id, since SVG ids are global in the page', () => {
    const ids = [swatchSvg('hair', 'rainbow', DEFAULT_LOOK), swatchSvg('hair', 'rainbow', DEFAULT_LOOK), swatchSvg('gown', 'rainbow', DEFAULT_LOOK)]
      .flatMap((s) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});

// ------------------------------------------------------------------------------------------------ onPress

describe('onPress on press()', () => {
  const box: Box = { x: 100, y: 100, w: 100, h: 100 };
  const setup = () => {
    const el = new FakeElement(box);
    const taps: number[] = [];
    onPress(el as unknown as HTMLElement, () => taps.push(1));
    const down = (x = 150, y = 150, id = 1) => {
      win.fire('pointerdown', { id, x, y });
      el.fire('pointerdown', { id, x, y });
    };
    return { el, taps, down };
  };

  it('taps on a release on the element, or one only the window hears near it', () => {
    const s = setup();
    s.down();
    expect(s.el.classes.has('down')).toBe(true);
    win.fire('pointerup', { x: 150, y: 150 });
    s.el.fire('pointerup', { x: 150, y: 150 });
    expect(s.taps).toHaveLength(1);
    expect(s.el.classes.has('down')).toBe(false);
    s.down();
    win.fire('pointerup', { x: 208, y: 150 });
    expect(s.taps).toHaveLength(2);
  });

  it('is no tap when the finger slid off', () => {
    const s = setup();
    s.down();
    win.fire('pointerup', { x: 400, y: 150 });
    expect(s.taps).toHaveLength(0);
    expect(s.el.classes.has('down')).toBe(false);
  });

  it('taps when the capture is lost with the finger last seen on the element', () => {
    const s = setup();
    s.down();
    s.el.fire('pointermove', { x: 160, y: 160 });
    s.el.fire('lostpointercapture', { x: 0, y: 0 });
    expect(s.taps).toHaveLength(1);
    s.down();
    s.el.fire('pointermove', { x: 500, y: 160 });
    s.el.fire('lostpointercapture');
    expect(s.taps).toHaveLength(1);
  });

  it('is no tap on a cancel or when another touch starts', () => {
    const s = setup();
    s.down();
    win.fire('pointercancel');
    expect(s.taps).toHaveLength(0);
    s.down(150, 150, 1);
    win.fire('pointerdown', { id: 2, x: 600, y: 600 });
    win.fire('pointerup', { id: 1, x: 150, y: 150 });
    expect(s.taps).toHaveLength(0);
    expect(s.el.classes.has('down')).toBe(false);
  });
});
