// The wardrobe's layer side (docs/v4/2.3.md sections 16 and 22.4): the layout with tabs at every iPad size, cellAt,
// the rails on their fixed rows, tabs that act on pointerdown, the rail rules (select on down and on move, onLook
// timing, one end per gesture on every end path, the one sound of a pick), the words on release in normal ink, the
// music box (beads, onBox, "Nearly ready!") and the kind ending's fingers, the treasure board, the gift cards, the
// pictures, and onPress on press().
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiftItem, LookField, LookTab, Owned, PrincessLook } from '../src/contracts';
import {
  COLOURS, COLOUR_FIELDS, DEFAULT_LOOK, GIFT_SETS, OPTIONS, PALETTE, START_OWNED, TABS, copyOwned, railsOf, tabOf, withItem, wordOf,
  type LookWord, type RailSpec,
} from '../src/wardrobe';
import { boardLayout, cellAt, giftCards, overlaps, railIn, unitFor, wardrobeLayout, type Box } from '../src/ui/geometry';
import {
  Fingers, PILL_MS, PRINT_INK, Rails, SETTLE_MS, UNFOCUS_MS, WORD_GAP_MS, WordVoice, boardRows, pillOf, printable, railPress, tabPress,
  type Pill,
} from '../src/ui/wardrobe-ctl';
import { BEAD_COUNT, BoxClock, FINGERS_WAIT_MS, NEARLY_BEFORE_MS, beadTimes, nearlyAt } from '../src/ui/musicbox';
import { giftSwatch, giftSwatchUrl, ribbonSwatch, swatchSvg, tabIconSvg } from '../src/ui/swatches';
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

/** A real touch: the window hears it first (capture phase), then the element. */
function touch(el: FakeElement, x: number, id = 1) {
  win.fire('pointerdown', { id, x });
  el.fire('pointerdown', { id, x });
}

const rail = (tab: LookTab, field: LookField, n = 0, owned: Owned = START_OWNED): RailSpec =>
  railsOf(tab, owned).filter((r) => r.field === field)[n];

/** Rails with every output recorded as a line. `word` says at once unless `gap` (the word gap or a guidance line). */
function railsWith(o: { look?: Partial<PrincessLook>; gap?: () => boolean } = {}) {
  const log: string[] = [];
  const looks: PrincessLook[] = [];
  const words: LookWord[] = [];
  const rails = new Rails({ ...DEFAULT_LOOK, ...o.look }, {
    onLook: (l, f) => {
      looks.push(l);
      log.push(`look ${f} ${l[f]}`);
    },
    onPicked: (l, f) => log.push(`picked ${f} ${l[f]}`),
    onFocus: (t) => log.push(`focus ${t}`),
  }, {
    select: (f, id) => log.push(`knob ${f} ${id}`),
    changed: (_l, fields) => log.push(`paint ${fields.join(',')}`),
    bounce: (r, cell) => log.push(`bounce ${r.field} ${cell}`),
    sfx: (name) => log.push(`sfx ${name}`),
    fx: (id) => log.push(`fx ${id}`),
    word: (w) => {
      words.push(w);
      const now = !o.gap?.();
      log.push(`word ${w.clip}${now ? '' : ' waits'}`);
      return now;
    },
  });
  return { rails, log, looks, words, take: () => log.splice(0), sounds: () => log.filter((l) => /^(sfx|fx|word)/.test(l)) };
}

/** Pick a cell with a finger: down, then the end of the gesture. */
const pick = (r: Rails, spec: RailSpec, id: string) => {
  r.down(spec, spec.ids.indexOf(id));
  r.end();
};

// ------------------------------------------------------------------------------------------------ layout

const SIZES: [number, number][] = [[1080, 810], [1080, 740], [1024, 690], [1180, 820], [1366, 1024]];
const inside = (a: Box, b: Box, pad = 0.01) => a.x >= b.x - pad && a.y >= b.y - pad && a.x + a.w <= b.x + b.w + pad && a.y + a.h <= b.y + b.h + pad;
/** Every option of every earned field. */
const ALL_OWNED: Owned = Object.values(GIFT_SETS).flatMap((s) => [...s.items]).reduce((o, i) => withItem(o, i), copyOwned(START_OWNED));

describe('cellAt', () => {
  const r = { x: 100, w: 6 * 86 };
  it('divides the rail into cells of one pitch', () => {
    expect(cellAt(100, r, 6)).toBe(0);
    expect(cellAt(185.9, r, 6)).toBe(0);
    expect(cellAt(186, r, 6)).toBe(1);
    expect(cellAt(100 + 5 * 86, r, 6)).toBe(5);
    expect(cellAt(100 + 6 * 86 - 0.1, r, 6)).toBe(5);
  });
  it('clamps a finger off either end to the first or last cell', () => {
    expect(cellAt(-500, r, 6)).toBe(0);
    expect(cellAt(99, r, 6)).toBe(0);
    expect(cellAt(100 + 6 * 86, r, 6)).toBe(5);
    expect(cellAt(5000, r, 6)).toBe(5);
    expect(cellAt(5000, { x: 100, w: 4 * 86 }, 4)).toBe(3);
  });
  it('takes an explicit pitch and survives junk', () => {
    expect(cellAt(100 + 90, r, 6, 90)).toBe(1);
    expect(cellAt(Number.NaN, r, 6)).toBe(0);
    expect(cellAt(150, r, 0)).toBe(-1);
  });
});

describe('wardrobeLayout', () => {
  it('keeps the 2.2 panel and Done, so she still stands at half the panel edge', () => {
    const a = wardrobeLayout(1080, 810);
    expect(Math.round(a.panel.x)).toBe(491);
    expect(Math.round(a.panel.y)).toBe(103);
    expect(Math.round(a.panel.y + a.panel.h)).toBe(606);
    expect(Math.round(a.done.w)).toBe(128);
    const b = wardrobeLayout(1080, 740);
    expect(Math.round(b.panel.x)).toBe(499);
    expect(Math.round(b.swatch)).toBe(70);
  });

  it('has six tab tiles in TABS order at a pitch of 83, and 65.6 CSS px at 1024 x 690', () => {
    const l = wardrobeLayout(1024, 690);
    expect(l.tabs.map((t) => t.tab)).toEqual(TABS.map((t) => t.tab));
    expect(l.tabs[0].box.w).toBeCloseTo(65.6, 1);
    for (let i = 1; i < 6; i++) expect(l.tabs[i].box.y - l.tabs[i - 1].box.y).toBeCloseTo(83 * l.unit);
  });

  for (const [w, h] of SIZES) {
    describe(`at ${w} x ${h}`, () => {
      const l = wardrobeLayout(w, h);
      const screen: Box = { x: 0, y: 0, w, h };
      const inner: Box = { x: l.panel.x + 5 * l.unit, y: l.panel.y + 5 * l.unit, w: l.panel.w - 10 * l.unit, h: l.panel.h - 10 * l.unit };

      it('has tab tiles, swatches, rails and Done of at least 64 CSS px', () => {
        expect(l.swatch).toBeGreaterThanOrEqual(64);
        for (const t of l.tabs) expect(Math.min(t.box.w, t.box.h)).toBeGreaterThanOrEqual(64);
        for (const r of l.rows) {
          for (const c of r.cells) expect(Math.min(c.w, c.h)).toBeGreaterThanOrEqual(64);
          expect(r.rail.h).toBeGreaterThanOrEqual(64);
        }
        expect(l.done.w).toBeGreaterThanOrEqual(64);
      });

      it('keeps the tabs in the icon column and the rails beside them, all inside the panel', () => {
        l.tabs.forEach((t, i) => {
          expect(inside(t.box, inner)).toBe(true);
          if (i > 0) expect(overlaps(t.box, l.tabs[i - 1].box)).toBe(false);
          for (const r of l.rows) expect(overlaps(t.box, r.rail)).toBe(false);
        });
        l.rows.forEach((r, i) => {
          expect(r.row).toBe(i);
          expect(inside(r.rail, inner)).toBe(true);
          for (const c of r.cells) expect(inside(c, r.rail)).toBe(true);
          if (i > 0) expect(r.rail.y).toBeCloseTo(l.rows[i - 1].rail.y + l.rows[i - 1].rail.h);
        });
      });

      it('puts the panel on screen and below the home button, Done under her and clear of both', () => {
        expect(inside(l.panel, screen)).toBe(true);
        expect(l.panel.y).toBeGreaterThanOrEqual(l.home.y + l.home.h + 12 * l.unit);
        expect(l.unit).toBeCloseTo(unitFor(w, h));
        expect(inside(l.done, screen)).toBe(true);
        expect(overlaps(l.done, l.panel)).toBe(false);
        expect(l.done.x + l.done.w / 2).toBeCloseTo(l.panel.x / 2);
      });

      it('puts the music box and its beads on screen, clear of Done, the preview and the panel', () => {
        for (const b of [l.box, ...l.beads]) {
          expect(inside(b, screen)).toBe(true);
          expect(overlaps(b, l.done)).toBe(false);
          expect(overlaps(b, l.preview)).toBe(false);
          expect(overlaps(b, l.panel)).toBe(false);
        }
        expect(l.beads).toHaveLength(BEAD_COUNT);
        // The beads sit round the box, inside its circle.
        for (const b of l.beads) expect(inside(b, l.box, 1)).toBe(true);
      });

      it('keeps the preview clear of Done, the panel and the home button, and the pill above it', () => {
        expect(l.preview.w).toBeGreaterThan(300);
        expect(l.preview.h).toBeGreaterThan(300);
        expect(overlaps(l.preview, l.done)).toBe(false);
        expect(overlaps(l.preview, l.panel)).toBe(false);
        expect(overlaps(l.preview, l.home)).toBe(false);
        expect(l.pill.y + l.pill.h).toBeLessThanOrEqual(l.preview.y);
      });

      it('puts the treasure board on the preview side, with every place inside it', () => {
        const rows = boardRows({ owned: START_OWNED, fresh: [], ribbons: [], pics: { crowns: '', shoes: '', jewels: '', hair: '' } });
        const b = boardLayout(w, h, rows.map((r) => r.places.length));
        expect(inside(b.board, l.preview)).toBe(true);
        for (const r of b.rows) {
          expect(inside(r.sticker, b.board)).toBe(true);
          for (const p of r.places) expect(inside(p, b.board)).toBe(true);
          for (const p of r.places) expect(overlaps(p, r.sticker)).toBe(false);
        }
      });

      it('centres one or two gift cards of at least 64 px on screen, 60 design px apart', () => {
        for (const n of [1, 2]) {
          const cards = giftCards(w, h, n);
          for (const c of cards) {
            expect(inside(c, screen)).toBe(true);
            expect(Math.min(c.w, c.h)).toBeGreaterThanOrEqual(64);
            expect(overlaps(c, l.home)).toBe(false);
          }
          const left = cards[0].x;
          const right = cards[n - 1].x + cards[n - 1].w;
          expect((left + right) / 2).toBeCloseTo(w / 2);
          if (n === 2) expect(cards[1].x - (cards[0].x + cards[0].w)).toBeCloseTo(60 * l.unit);
        }
      });
    });
  }
});

describe('rails on their rows', () => {
  const L = wardrobeLayout(1080, 740);
  /** Where a cell is on screen for a tab and what she owns: its rail on RailSpec.row, its place in the rail. */
  const cellBox = (tab: LookTab, owned: Owned, field: LookField, id: string): Box | null => {
    const spec = railsOf(tab, owned).find((r) => r.field === field && r.ids.includes(id));
    return spec ? railIn(L.rows[spec.row], spec.ids.length).cells[spec.ids.indexOf(id)] : null;
  };

  it('puts every rail of every tab on its own row inside the panel, one rail per row', () => {
    for (const owned of [START_OWNED, ALL_OWNED]) {
      for (const { tab } of TABS) {
        const specs = railsOf(tab, owned);
        expect(new Set(specs.map((s) => s.row)).size).toBe(specs.length);
        for (const s of specs) {
          const { rail: box, cells } = railIn(L.rows[s.row], s.ids.length);
          expect(box.y).toBe(L.rows[s.row].rail.y);
          expect(cells).toHaveLength(s.ids.length);
          expect(box.x + box.w).toBeLessThanOrEqual(L.panel.x + L.panel.w);
          // The cell under a swatch's centre is that swatch.
          cells.forEach((c, j) => expect(cellAt(c.x + c.w / 2, box, s.ids.length)).toBe(j));
        }
      }
    }
  });

  it('never moves a cell she knows when she earns an item, in the order of every gift set', () => {
    let owned = copyOwned(START_OWNED);
    for (const set of Object.values(GIFT_SETS)) {
      for (const item of set.items) {
        const before = new Map<string, Box>();
        for (const { tab, fields } of TABS) {
          for (const f of fields) for (const id of OPTIONS[f] as readonly string[]) {
            const b = cellBox(tab, owned, f, id);
            if (b) before.set(`${tab} ${f} ${id}`, b);
          }
        }
        owned = withItem(owned, item);
        for (const [key, b] of before) {
          const [tab, f, id] = key.split(' ') as [LookTab, LookField, string];
          expect(cellBox(tab, owned, f, id), key).toEqual(b);
        }
      }
    }
  });

  it('shows a first play only what she owns: no jewel rails, the start styles and hair things', () => {
    const eyes = railsOf('eyes', START_OWNED);
    expect(eyes.map((r) => r.field)).toEqual(['eyes']);
    expect(rail('hair', 'style').ids).toEqual(['ponytails', 'high', 'plaits', 'bun', 'low', 'side']);
    expect(rail('crown', 'crown').ids).toEqual(['lumi']);
  });
});

// ------------------------------------------------------------------------------------------------ tabs

describe('tabs', () => {
  const L = wardrobeLayout(1080, 740);
  const tabBox = (t: LookTab) => L.tabs.find((x) => x.tab === t)!.box;

  it('act on pointerdown: the rails change while the finger is still on the tab', () => {
    let tab: LookTab = 'hair';
    const el = new FakeElement(tabBox('gown'));
    tabPress(el as unknown as HTMLElement, 'gown', (t) => (tab = t), () => true);
    expect(railsOf(tab, START_OWNED).map((r) => r.field)).toEqual(['style', 'style', 'hair', 'hair', 'hair']);
    touch(el, tabBox('gown').x + 10, 4);
    // No release yet: the tab has acted, and nothing waits for the finger.
    expect(tab).toBe('gown');
    expect(railsOf(tab, START_OWNED).map((r) => r.field)).toEqual(['gown', 'extra', 'gownColour', 'gownColour']);
    expect(el.captured.size).toBe(0);
  });

  it('end a palm resting on a rail as a release before the tab acts', () => {
    const r = railsWith();
    const order: string[] = [];
    const style = rail('hair', 'style');
    const railEl = new FakeElement(railIn(L.rows[style.row], style.ids.length).rail);
    railPress(railEl as unknown as HTMLElement, () => style, r.rails, () => true);
    const tabEl = new FakeElement(tabBox('eyes'));
    tabPress(tabEl as unknown as HTMLElement, 'eyes', (t) => {
      order.push(`active ${r.rails.active}`);
      r.rails.tab(t);
    }, () => true);
    const c = railIn(L.rows[style.row], style.ids.length).cells[3];
    touch(railEl, c.x + c.w / 2, 1);
    expect(r.rails.look.style).toBe('bun');
    touch(tabEl, tabBox('eyes').x + 10, 2);
    expect(order).toEqual(['active false']);
    const picked = r.log.filter((l) => l.startsWith('picked'));
    expect(picked).toEqual(['picked style bun', 'picked eyes blue']);
    expect(r.rails.focus).toBe('eyes');
  });

  it('frame her on their tab and play no speech', () => {
    const r = railsWith();
    r.rails.tab('sparkles');
    expect(r.take()).toEqual(['focus sparkles', 'picked thing bows']);
    expect(r.words).toEqual([]);
  });

  it('refuse touches while the panel does not take them', () => {
    let acted = 0;
    const el = new FakeElement(tabBox('crown'));
    tabPress(el as unknown as HTMLElement, 'crown', () => acted++, () => false);
    touch(el, tabBox('crown').x + 5);
    expect(acted).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------ rails

describe('the rails', () => {
  it('selects on down with a tick, and every new cell of a slide', () => {
    const r = railsWith();
    const hair = rail('hair', 'hair');
    r.rails.down(hair, 2);
    expect(r.take()).toEqual(['focus hair', 'knob hair strawberry', 'sfx tick', 'paint hair', 'look hair strawberry']);
    r.rails.move(2);
    expect(r.take()).toEqual([]);
    r.rails.move(3);
    expect(r.take()).toEqual(['knob hair auburn', 'sfx tick', 'paint hair', 'look hair auburn']);
    expect(r.rails.look.hair).toBe('auburn');
  });

  it('gives no tick and no onLook for the option she already wears', () => {
    const r = railsWith();
    r.rails.down(rail('eyes', 'eyes'), 0);
    expect(r.take()).toEqual(['focus eyes']);
  });

  it('applies colours and eyes at once, gown, crown, shoes and style 150 ms after the finger settles', () => {
    vi.useFakeTimers();
    for (const [tab, field, cells] of [['gown', 'gown', [1, 2, 3]], ['crown', 'crown', [0]], ['hair', 'style', [1, 2]]] as const) {
      const r = railsWith({ look: { crown: 'lumi' } });
      const owned = field === 'crown' ? ALL_OWNED : START_OWNED;
      const spec = rail(tab, field, 0, owned);
      r.rails.down(spec, cells[0] + 1);
      for (const c of cells) r.rails.move(c + 1);
      expect(r.log.filter((l) => l.startsWith('look'))).toEqual([]);
      vi.advanceTimersByTime(SETTLE_MS);
      expect(r.log.filter((l) => l.startsWith('look'))).toHaveLength(1);
      r.rails.end();
    }
    const c = railsWith();
    c.rails.down(rail('gown', 'gownColour'), 4);
    expect(c.log).toContain('look gownColour green');
  });

  it('ends a gesture once, with the reaction and the word only at the end', () => {
    const r = railsWith();
    r.rails.down(rail('hair', 'style'), 3);
    expect(r.log.some((l) => l.startsWith('picked') || l.startsWith('word'))).toBe(false);
    r.rails.end();
    r.rails.end();
    expect(r.log.filter((l) => l.startsWith('picked'))).toEqual(['picked style bun']);
    expect(r.words.map((w) => w.clip)).toEqual(['word-bun']);
  });

  it('a tap on what she wears hops and says its word again, with no effect', () => {
    const r = railsWith();
    pick(r.rails, rail('gown', 'gownColour'), 'pink');
    expect(r.take()).toEqual(['focus gown', 'bounce gownColour 0', 'word word-pink', 'picked gownColour pink']);
  });

  it('ends a stale gesture when a new one starts', () => {
    const r = railsWith();
    r.rails.down(rail('hair', 'hair'), 1);
    r.rails.down(rail('eyes', 'eyes'), 2);
    expect(r.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair honey']);
    expect(r.rails.active).toBe(true);
    r.rails.end();
    expect(r.rails.active).toBe(false);
  });

  it('frames a tab on touch and lets go of the focus 2.5 s after the last touch', () => {
    vi.useFakeTimers();
    const r = railsWith();
    r.rails.down(rail('eyes', 'eyes'), 1);
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
  });

  it('the ghost slide changes her without a reaction, and a stop puts her look back at once', () => {
    const r = railsWith();
    const colours = rail('gown', 'gownColour');
    r.rails.demo(colours, 1);
    r.rails.demo(colours, 3);
    expect(r.rails.look.gownColour).toBe('gold');
    r.take();
    r.rails.restore(DEFAULT_LOOK);
    expect(r.take()).toEqual(['knob gownColour pink', 'look gownColour pink', 'paint gownColour']);
    expect(r.rails.look).toEqual(DEFAULT_LOOK);
  });

  it('close at the end applies a waiting shape; close on reset drops it', () => {
    vi.useFakeTimers();
    const a = railsWith();
    a.rails.down(rail('gown', 'gown'), 3);
    a.rails.close(true);
    expect(a.looks.at(-1)?.gown).toBe('tutu');
    const b = railsWith();
    b.rails.down(rail('gown', 'gown'), 3);
    b.rails.close(false);
    vi.advanceTimersByTime(1000);
    expect(b.looks).toEqual([]);
  });

  it('after the music box ran out, a release still picks but says nothing and plays nothing', () => {
    const r = railsWith();
    r.rails.down(rail('gown', 'gown'), 3);
    r.rails.mute();
    r.rails.end();
    expect(r.sounds()).toEqual(['sfx tick']);
    expect(r.rails.look.gown).toBe('tutu');
    expect(r.log).toContain('picked gown tutu');
  });
});

describe('the one sound of a pick', () => {
  const ALL = { owned: ALL_OWNED };

  it('a pick with a word says it and plays no effect', () => {
    const cases: [LookTab, LookField, string][] = [
      ['gown', 'gownColour', 'green'], ['gown', 'gown', 'ball'], ['gown', 'extra', 'wings'], ['crown', 'crown', 'star'],
      ['hair', 'hair', 'blue'], ['shoes', 'shoes', 'boots'], ['sparkles', 'thingColour', 'gold'], ['eyes', 'earrings', 'hearts'],
    ];
    for (const [tab, field, id] of cases) {
      const r = railsWith();
      const spec = railsOf(tab, ALL.owned).find((s) => s.field === field && s.ids.includes(id))!;
      pick(r.rails, spec, id);
      const s = r.sounds().filter((l) => l !== 'sfx tick');
      expect(s, `${field} ${id}`).toEqual([`word ${wordOf(field, id)!.clip}`]);
    }
  });

  it('every palette colour has a word, so a colour pick never plays an effect', () => {
    for (const f of COLOUR_FIELDS) for (const c of COLOURS) expect(wordOf(f, c), `${f} ${c}`).toBeDefined();
  });

  it('a gown shape or extra without a word swishes, a crown shape without one twinkles, anything else pops', () => {
    const one = (tab: LookTab, field: LookField, id: string) => {
      const r = railsWith();
      const spec = railsOf(tab, ALL.owned).find((s) => s.field === field && s.ids.includes(id))!;
      pick(r.rails, spec, id);
      return r.sounds().filter((l) => l !== 'sfx tick');
    };
    expect(one('gown', 'gown', 'tutu')).toEqual(['fx dress-swish']);
    expect(one('gown', 'extra', 'wings')).toEqual(['word word-wings']);
    expect(one('crown', 'crown', 'tiara')).toEqual(['fx crown-twinkle']);
    expect(one('hair', 'hair', 'honey')).toEqual(['sfx pop']);
    expect(one('sparkles', 'thing', 'unicorn')).toEqual(['sfx pop']);
  });

  it('a gown pick inside the word gap swishes now and its word waits; other picks only wait', () => {
    let gap = false;
    const r = railsWith({ gap: () => gap });
    gap = true;
    pick(r.rails, rail('gown', 'gown'), 'ball');
    expect(r.sounds().filter((l) => l !== 'sfx tick')).toEqual(['word word-gown waits', 'fx dress-swish']);
    r.take();
    pick(r.rails, rail('gown', 'gownColour'), 'blue');
    expect(r.sounds().filter((l) => l !== 'sfx tick')).toEqual(['word word-blue waits']);
  });

  it('with the real word gap: a second word within 1.2 s waits, and a gown picked then swishes', () => {
    vi.useFakeTimers();
    const said: string[] = [];
    const fx: string[] = [];
    const voice = new WordVoice({ say: (c) => said.push(c), show: () => {}, guiding: () => false, now: () => Date.now() });
    const rails = new Rails(DEFAULT_LOOK, { onLook() {}, onPicked() {}, onFocus() {} }, {
      select() {}, changed() {}, bounce() {}, sfx() {}, fx: (id) => fx.push(id), word: (w) => voice.push(w),
    });
    pick(rails, rail('gown', 'gownColour'), 'green');
    expect(said).toEqual(['word-green']);
    vi.advanceTimersByTime(400);
    pick(rails, rail('gown', 'gown'), 'ball');
    expect(fx).toEqual(['dress-swish']);
    expect(said).toEqual(['word-green']);
    vi.advanceTimersByTime(WORD_GAP_MS);
    expect(said).toEqual(['word-green', 'word-gown']);
    vi.advanceTimersByTime(WORD_GAP_MS);
    pick(rails, rail('gown', 'gown'), 'gala');
    expect(fx).toEqual(['dress-swish']);
    expect(said.at(-1)).toBe('word-gown');
  });
});

describe('a rail on press()', () => {
  const L = wardrobeLayout(1080, 740);
  const setup = (enabled = () => true) => {
    const r = railsWith();
    const make = (spec: RailSpec) => {
      const { rail: box } = railIn(L.rows[spec.row], spec.ids.length);
      const el = new FakeElement(box);
      railPress(el as unknown as HTMLElement, () => spec, r.rails, enabled);
      const at = (id: string) => {
        const c = railIn(L.rows[spec.row], spec.ids.length).cells[spec.ids.indexOf(id)];
        return c.x + c.w / 2;
      };
      return { el, at };
    };
    return { ...r, make };
  };

  it('selects from clientX on down and on move, and ends once on a window release far off the rail', () => {
    const s = setup();
    const eyes = s.make(rail('eyes', 'eyes'));
    touch(eyes.el, eyes.at('green'));
    expect(s.rails.look.eyes).toBe('green');
    // The finger drifts down over the next rows and the canvas: only x counts.
    eyes.el.fire('pointermove', { x: eyes.at('violet'), y: 700 });
    expect(s.rails.look.eyes).toBe('violet');
    win.fire('pointerup', { x: eyes.at('violet'), y: 700 });
    eyes.el.fire('lostpointercapture');
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked eyes violet']);
    expect(s.rails.active).toBe(false);
  });

  it('ends on a lost capture with no release at all, and on a window pointercancel mid-slide', () => {
    const s = setup();
    const hair = s.make(rail('hair', 'hair'));
    touch(hair.el, hair.at('auburn'));
    hair.el.fire('lostpointercapture');
    win.fire('pointerup');
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair auburn']);
    const colour = s.make(rail('gown', 'gownColour'));
    touch(colour.el, colour.at('red'), 2);
    colour.el.fire('pointermove', { id: 2, x: colour.at('orange') });
    win.fire('pointercancel', { id: 2 });
    expect(s.rails.active).toBe(false);
    touch(colour.el, colour.at('blue'), 3);
    win.fire('pointerup', { id: 3 });
    expect(s.rails.look.gownColour).toBe('blue');
    expect(s.log.filter((l) => l.startsWith('picked'))).toEqual(['picked hair auburn', 'picked gownColour orange', 'picked gownColour blue']);
  });

  it('refuses touches while the panel is not taking them, and a rail that holds nothing', () => {
    const s = setup(() => false);
    const hair = s.make(rail('hair', 'hair'));
    touch(hair.el, hair.at('honey'));
    win.fire('pointerup');
    expect(s.log).toEqual([]);
    expect(hair.el.captured.size).toBe(0);
    const t = setup();
    const el = new FakeElement(L.rows[4].rail);
    railPress(el as unknown as HTMLElement, () => null, t.rails, () => true);
    touch(el, L.rows[4].cells[0].x + 5);
    expect(t.log).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------ words

describe('words on release', () => {
  const w = (print: string): LookWord => ({ clip: `word-${print}`, print });
  const voice = () => {
    let guiding = false;
    const said: string[] = [];
    const pill: (Pill | null)[] = [];
    const v = new WordVoice({ say: (c) => said.push(c), show: (p) => pill.push(p), guiding: () => guiding, now: () => Date.now() });
    return { v, said, pill, guide: (on: boolean) => (guiding = on) };
  };

  it('says at most one word per 1.2 s, and only the newest waits', () => {
    vi.useFakeTimers();
    const s = voice();
    expect(s.v.push(w('dress'))).toBe(true);
    expect(s.v.push(w('gown'))).toBe(false);
    s.v.push(w('bun'));
    expect(s.said).toEqual(['word-dress']);
    vi.advanceTimersByTime(WORD_GAP_MS - 1);
    expect(s.said).toEqual(['word-dress']);
    vi.advanceTimersByTime(1);
    expect(s.said).toEqual(['word-dress', 'word-bun']);
  });

  it('never speaks over a guidance line, and goes when it ends', () => {
    vi.useFakeTimers();
    const s = voice();
    s.guide(true);
    expect(s.v.ready()).toBe(false);
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
    expect(s.pill.map((p) => p?.text ?? null)).toEqual(['stars']);
    vi.advanceTimersByTime(PILL_MS);
    expect(s.pill.map((p) => p?.text ?? null)).toEqual(['stars', null]);
  });

  it('prints only short words, and says the others without a pill', () => {
    expect(printable('heart')).toBe(true);
    expect(printable('ribbon')).toBe(false);
    expect(printable(undefined)).toBe(false);
    const s = voice();
    s.v.push({ clip: 'word-orange' });
    expect(s.said).toEqual(['word-orange']);
    expect(s.pill).toEqual([]);
  });

  it('prints every colour word in the normal ink, never in its own colour', () => {
    const hexes = new Set(Object.values(PALETTE).flatMap((p) => [p.light, p.base, p.deep, p.sash, p.small, p.pic ?? '', ...(p.bands ?? [])]).filter(Boolean));
    let printed = 0;
    for (const f of COLOUR_FIELDS) {
      for (const c of COLOURS) {
        const word = wordOf(f, c);
        const p = word ? pillOf(word) : null;
        if (!p) continue;
        printed++;
        expect(p.text).toBe(c);
        expect(p.ink).toBe(PRINT_INK);
        expect(hexes.has(p.ink.toLowerCase())).toBe(false);
      }
    }
    // pink, red, gold, green, blue, white and brown print (section 14 fix 1), on each colour rail.
    expect(printed).toBe(7 * COLOUR_FIELDS.length);
    // Through the voice too: what the pill is given for green is the ink, not green.
    const s = voice();
    s.v.push(wordOf('gownColour', 'green')!);
    expect(s.pill[0]).toEqual({ text: 'green', ink: PRINT_INK });
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

// ------------------------------------------------------------------------------------------------ the music box

describe('the music box', () => {
  const clock = (limitMs: number, o: { speaking?: () => boolean } = {}) => {
    const log: string[] = [];
    const stopped: number[] = [];
    const c = new BoxClock(limitMs, {
      musicBox: (ms) => {
        log.push(`tune ${ms}`);
        return { stop: () => stopped.push(Date.now()), done: new Promise<void>(() => {}) };
      },
      speaking: o.speaking ?? (() => false),
      nearly: () => log.push(`nearly ${Date.now()}`),
      bead: (i) => log.push(`bead ${i} ${Date.now()}`),
      onBox: (on) => log.push(`box ${on} ${Date.now()}`),
      timeUp: () => log.push(`time ${Date.now()}`),
      now: () => Date.now(),
    });
    return { c, log, stopped };
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  it('calls onBox(true) when the tune starts and onBox(false) at its end, then ends the panel', () => {
    const s = clock(60_000);
    expect(s.log).toEqual([]);
    expect(s.c.leftMs).toBe(60_000);
    s.c.start();
    s.c.start();
    expect(s.log).toEqual(['tune 60000', 'box true 0']);
    vi.advanceTimersByTime(30_000);
    expect(s.c.leftMs).toBe(30_000);
    vi.advanceTimersByTime(30_000);
    expect(s.log.filter((l) => /^(box|time)/.test(l))).toEqual(['box true 0', 'box false 60000', 'time 60000']);
    expect(s.c.leftMs).toBe(0);
    expect(s.c.running).toBe(false);
  });

  it('Done stops the tune sooner: onBox(false) once, and no end of its own after it', () => {
    const s = clock(45_000);
    s.c.start();
    vi.advanceTimersByTime(12_000);
    s.c.stop();
    s.c.stop();
    vi.advanceTimersByTime(60_000);
    expect(s.log.filter((l) => /^(box|time)/.test(l))).toEqual(['box true 0', 'box false 12000']);
    expect(s.stopped).toEqual([12_000]);
    expect(s.c.leftMs).toBe(33_000);
  });

  it('fades the six beads one every limit / 6, the last at the end, with no clock and no number', () => {
    const s = clock(60_000);
    s.c.start();
    vi.advanceTimersByTime(60_000);
    expect(s.log.filter((l) => l.startsWith('bead'))).toEqual(['bead 0 10000', 'bead 1 20000', 'bead 2 30000', 'bead 3 40000', 'bead 4 50000', 'bead 5 60000']);
    expect(beadTimes(45_000)).toEqual([7500, 15000, 22500, 30000, 37500, 45000]);
  });

  it('says "Nearly ready!" 15 s before the end, and never in a box too short for it', () => {
    for (const limit of [60_000, 45_000, 30_000]) {
      const s = clock(limit);
      s.c.start();
      vi.advanceTimersByTime(limit);
      expect(s.log.filter((l) => l.startsWith('nearly'))).toEqual([`nearly ${limit - NEARLY_BEFORE_MS}`]);
      vi.setSystemTime(0);
    }
    expect(nearlyAt(5000)).toBe(null);
    const short = clock(5000);
    short.c.start();
    vi.advanceTimersByTime(5000);
    expect(short.log.some((l) => l.startsWith('nearly'))).toBe(false);
  });

  it('lets the nearly line wait at most 3 s for speech to end, then skips it', () => {
    let talking = true;
    const s = clock(60_000, { speaking: () => talking });
    s.c.start();
    vi.advanceTimersByTime(45_000 + 2000);
    expect(s.log.some((l) => l.startsWith('nearly'))).toBe(false);
    talking = false;
    vi.advanceTimersByTime(200);
    expect(s.log.filter((l) => l.startsWith('nearly'))).toHaveLength(1);
    vi.setSystemTime(0);
    const t = clock(60_000, { speaking: () => true });
    t.c.start();
    vi.advanceTimersByTime(60_000);
    expect(t.log.some((l) => l.startsWith('nearly'))).toBe(false);
  });
});

describe('the kind ending waits for her fingers', () => {
  it('waits until a window pointerup, after every handler of that release', async () => {
    vi.useFakeTimers();
    const f = new Fingers(win as unknown as Window);
    win.fire('pointerdown', { id: 7 });
    let ended: boolean | null = null;
    void f.allUp(FINGERS_WAIT_MS).then((ok) => (ended = ok));
    await vi.advanceTimersByTimeAsync(1500);
    expect(ended).toBe(null);
    win.fire('pointerup', { id: 7 });
    expect(ended).toBe(null);
    await vi.advanceTimersByTimeAsync(1);
    expect(ended).toBe(true);
    f.close();
  });

  it('gives up after 2 s with a finger still down', async () => {
    vi.useFakeTimers();
    const f = new Fingers(win as unknown as Window);
    win.fire('pointerdown', { id: 3 });
    let ended: boolean | null = null;
    void f.allUp(FINGERS_WAIT_MS).then((ok) => (ended = ok));
    await vi.advanceTimersByTimeAsync(FINGERS_WAIT_MS - 1);
    expect(ended).toBe(null);
    await vi.advanceTimersByTimeAsync(1);
    expect(ended).toBe(false);
  });

  it('counts a lost capture or a cancel as the finger gone, and waits for every finger', async () => {
    vi.useFakeTimers();
    const f = new Fingers(win as unknown as Window);
    win.fire('pointerdown', { id: 1 });
    win.fire('pointerdown', { id: 2 });
    expect(f.count).toBe(2);
    let ended: boolean | null = null;
    void f.allUp(FINGERS_WAIT_MS).then((ok) => (ended = ok));
    win.fire('lostpointercapture', { id: 1 });
    await vi.advanceTimersByTimeAsync(10);
    expect(ended).toBe(null);
    win.fire('pointercancel', { id: 2 });
    await vi.advanceTimersByTimeAsync(10);
    expect(ended).toBe(true);
  });

  it('ends at once when no finger is down', async () => {
    const f = new Fingers(win as unknown as Window);
    win.fire('pointerdown', { id: 1 });
    win.fire('pointerup', { id: 1 });
    expect(await f.allUp(FINGERS_WAIT_MS)).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ the treasure board

describe('the treasure board', () => {
  const pics = { crowns: 'p.webp', shoes: 'h.webp', jewels: 'b.webp', hair: 'd.webp' };

  it('has a row per gift set (4, 3, 6, 8 places) and the 5 ribbons, empty on a first play', () => {
    const rows = boardRows({ owned: START_OWNED, fresh: [], ribbons: ['pink'], pics });
    expect(rows.map((r) => r.set)).toEqual(['crowns', 'shoes', 'jewels', 'hair', 'ribbons']);
    expect(rows.map((r) => r.places.length)).toEqual([4, 3, 6, 8, 5]);
    expect(rows.every((r) => !r.full && r.places.every((p) => !p.owned))).toBe(true);
  });

  it('shows what she owns, today\'s gifts as fresh, and a sticker on a full row', () => {
    const fresh: GiftItem[] = [{ field: 'shoes', id: 'stars' }];
    const owned = GIFT_SETS.shoes.items.reduce((o, i) => withItem(o, i), withItem(copyOwned(START_OWNED), { field: 'crown', id: 'heart' }));
    const rows = boardRows({ owned, fresh, ribbons: ['lilac', 'sky', 'mint', 'gold', 'coral'], pics });
    expect(rows[0].places.map((p) => p.owned)).toEqual([false, false, true, false]);
    expect(rows[1].full).toBe(true);
    expect(rows[1].places.map((p) => p.fresh)).toEqual([false, false, true]);
    expect(rows[4].full).toBe(true);
    expect(rows[2].full).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------------ pictures

describe('swatch pictures', () => {
  const looks: PrincessLook[] = [
    DEFAULT_LOOK,
    { ...DEFAULT_LOOK, hair: 'rainbow', gownColour: 'rainbow', crownColour: 'rainbow', shoeColour: 'rainbow', thingColour: 'rainbow', jewelColour: 'rainbow', earrings: 'drops', necklace: 'heart', gown: 'gala', extra: 'wings' },
    { ...DEFAULT_LOOK, hair: 'white', gownColour: 'white', crownColour: 'white', shoeColour: 'white', thingColour: 'white', jewelColour: 'white', gown: 'tutu', extra: 'bow', crown: 'flower', shoes: 'boots' },
  ];
  const plain = (s: string) => expect(s).not.toMatch(/<text|<foreignObject|NaN|undefined|null/);

  it('draws every option of every field as SVG with no text, for any look', () => {
    for (const look of looks) {
      for (const f of Object.keys(OPTIONS) as LookField[]) {
        for (const id of OPTIONS[f] as readonly string[]) {
          const s = swatchSvg(f, id, look);
          expect(s.startsWith('<svg viewBox="0 0 100 100"'), `${f} ${id}`).toBe(true);
          plain(s);
        }
      }
      for (const { tab } of TABS) plain(tabIconSvg(tab, look));
    }
  });

  it('draws every gift of every set as its own picture with no text, and as an image URL', () => {
    const seen = new Set<string>();
    for (const set of Object.values(GIFT_SETS)) {
      for (const item of set.items) {
        const s = giftSwatch(item, DEFAULT_LOOK);
        expect(s.startsWith('<svg viewBox="0 0 100 100"')).toBe(true);
        plain(s);
        seen.add(s.replace(/wd-[a-z]+-\d+/g, ''));
        const url = giftSwatchUrl(item, DEFAULT_LOOK);
        expect(url.startsWith('data:image/svg+xml,')).toBe(true);
        // The default look has no rainbow, so the picture has no gradient ids and both calls draw the same.
        expect(decodeURIComponent(url.slice('data:image/svg+xml,'.length))).toBe(s.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      }
    }
    // 21 items, 21 different pictures.
    expect(seen.size).toBe(21);
    for (const r of ['lilac', 'sky', 'mint', 'gold', 'coral'] as const) plain(ribbonSwatch(r));
  });

  it('draws a style in her hair colour, a shape in its part\'s colour and a colour cell in her shape', () => {
    const chestnut = { ...DEFAULT_LOOK, hair: 'chestnut' as const };
    expect(swatchSvg('style', 'bun', chestnut)).toContain('#9a6142');
    expect(swatchSvg('style', 'bun', DEFAULT_LOOK)).not.toContain('#9a6142');
    const green = { ...DEFAULT_LOOK, thingColour: 'green' as const, shoeColour: 'green' as const, crownColour: 'green' as const };
    expect(swatchSvg('thing', 'cherries', green)).toContain(PALETTE.green.small);
    expect(swatchSvg('shoes', 'bows', green)).toContain(PALETTE.green.small);
    expect(swatchSvg('crown', 'tiara', green)).toContain(PALETTE.green.small);
    expect(swatchSvg('gownColour', 'blue', DEFAULT_LOOK)).toContain(PALETTE.blue.base);
    expect(giftSwatch({ field: 'thing', id: 'moons' }, green)).toContain(PALETTE.green.small);
  });

  it('gives every style its own outline, and every gradient its own id', () => {
    const outlines = (OPTIONS.style as readonly string[]).map((id) => swatchSvg('style', id, DEFAULT_LOOK));
    expect(new Set(outlines).size).toBe(OPTIONS.style.length);
    const ids = [swatchSvg('hair', 'rainbow', DEFAULT_LOOK), swatchSvg('hair', 'rainbow', DEFAULT_LOOK), swatchSvg('gownColour', 'rainbow', DEFAULT_LOOK)]
      .flatMap((s) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('puts every field on the tab the catalogue says', () => {
    for (const { tab, fields } of TABS) for (const f of fields) expect(tabOf(f)).toBe(tab);
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
  });
});
