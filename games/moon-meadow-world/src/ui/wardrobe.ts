// The customiser (docs/v4/2.2.md 2.1 to 2.3, Layer.wardrobe): five picture rails on the right in Emma's order,
// Princess Emma in 3D on the left (the game draws and frames her; the layer only has the preview box that turns her)
// and the big pink play button under her for Done. Every rail is a static element: the cell under a finger comes from
// clientX against the rail's own box, and press() ends every gesture, also when the iPad loses the release. The rules
// themselves (selection, onLook timing, the ribbon tap, focus, words) are in wardrobe-ctl.ts.
import './wardrobe.css';
import type { Ribbon } from '../contracts';
import { audio } from '../audio';
import { LEGACY_ROWS as LOOK_ROWS, type LegacyLook as PrincessLook, type LegacyRow as LookRow } from '../wardrobe-legacy';
import type { Ghost } from './ghost';
import { cellAt, clamp, wardrobeLayout, type Box, type Point, type WardrobeLayout } from './geometry';
import { centreOf, el, html, img, play, sleep } from './dom';
import { press } from './press';
import { PIC } from './parts';
import { target, type UiTarget } from './moment';
import { Rails, WordVoice, indexIn, optionsOf, railPress } from './wardrobe-ctl';
import { PLAY_SVG, rowIconSvg, swatchSvg } from './swatches';

/**
 * 2.2.0's customiser options. Step 0 of 2.3.0 keeps this panel on the legacy catalogue; ui/index.ts turns the 2.3
 * contract into it until the wardrobe-ui lane builds the tabs (docs/v4/2.3.md Part 2, section 3).
 */
export interface WardrobeOpts {
  look: PrincessLook;
  ribbons: Ribbon[];
  firstTime: boolean;
  clips: { ready: string[]; firstTime: string[]; idle: string[]; done: string[] };
  onLook(look: PrincessLook, row: LookRow): void;
  onPicked(look: PrincessLook, row: LookRow): void;
  onFocus(row: LookRow | null): void;
  onTurn(dxPx: number, ended: boolean): void;
  onPreviewTap(): void;
}

/** The test hook's view of the customiser (2.8): open while it takes touches, and the framed row. */
export interface WardrobeSnapshot {
  open: boolean;
  focus: LookRow | null;
}

export interface WardrobeHandle {
  snapshot(): WardrobeSnapshot;
  targets(): UiTarget[];
  /** Run the next idle step now (the first-visit ghost slide, then the idle line). False when there is none. */
  idleNow(): boolean;
  /** Remove everything at once (reset). The promise stays pending. */
  close(): void;
}

const SLIDE_MS = 400;
/** First visit only: the ghost hand slides along the gown rail after this long without a touch. */
const GHOST_AFTER_MS = 8000;
/** The idle line ("When you are ready, tap play."), once. */
const IDLE_AFTER_MS = 25000;
/** A finger on the preview that moves less than this is a tap (she waves). */
const TAP_SLOP_PX = 10;
/** 170 degrees at 1 degree per 2 px. */
const TURN_MAX_PX = 340;

interface RowEls {
  row: LookRow;
  icon: HTMLElement;
  rail: HTMLElement;
  knob: HTMLElement;
  swatches: HTMLElement[];
}

export function runWardrobe(
  ctx: { parent: HTMLElement; ghost: Ghost; screen(): { w: number; h: number } },
  o: WardrobeOpts,
  setOpen: (h: WardrobeHandle | null) => void,
): Promise<PrincessLook> {
  return new Promise((resolve) => {
    const undo: (() => void)[] = [];
    let alive = true;
    let inputOn = false;
    let finished = false;

    // ---- the elements: the sliding panel with its rows, then Done, the preview box and the word pill
    const root = el('div', 'wardrobe', ctx.parent);
    const slide = el('div', 'wd-slide', root);
    const panel = el('div', 'wd-panel panel', slide);
    const rows: RowEls[] = LOOK_ROWS.map((spec) => {
      const icon = el('div', `wd-icon touch row-${spec.row}`, slide);
      icon.setAttribute('aria-label', `row ${spec.row}`);
      const rail = el('div', `wd-rail touch row-${spec.row}`, slide);
      rail.setAttribute('aria-label', `rail ${spec.row}`);
      el('div', 'wd-track', rail);
      const swatches = spec.options.map((opt) => {
        const s = el('div', 'wd-swatch', rail);
        s.setAttribute('aria-label', `swatch ${spec.row} ${opt.id}`);
        return s;
      });
      const knob = el('div', 'wd-knob', rail);
      return { row: spec.row, icon, rail, knob, swatches };
    });
    const rowOf = (row: LookRow) => rows.find((r) => r.row === row)!;
    const done = html(PLAY_SVG, 'wd-done touch', root);
    done.setAttribute('aria-label', 'done');
    const preview = el('div', 'wd-preview touch', root);
    preview.setAttribute('aria-label', 'preview');
    const pill = el('div', 'wd-pill', root);
    undo.push(() => root.remove());

    // ---- pictures: every swatch once; the style pictures follow her hair, the hair things her ribbon
    let painted = { hair: '', ribbon: '' };
    const paint = (look: PrincessLook, all: boolean) => {
      const hair = all || painted.hair !== look.hair;
      const ribbon = all || painted.ribbon !== look.ribbon;
      painted = { hair: look.hair, ribbon: look.ribbon };
      for (const r of rows) {
        const live = (r.row === 'style' && hair) || (r.row === 'thing' && ribbon);
        if (all || live) optionsOf(r.row).forEach((opt, i) => (r.swatches[i].innerHTML = swatchSvg(r.row, opt.id, look)));
        const iconLive = ((r.row === 'hair' || r.row === 'style') && hair) || (r.row === 'thing' && ribbon);
        if (all || iconLive) r.icon.innerHTML = rowIconSvg(r.row, look);
      }
    };

    // ---- layout from wardrobeLayout(), so the game, the tests and the screen agree
    let L: WardrobeLayout = wardrobeLayout(ctx.screen().w, ctx.screen().h);
    const place = (e: HTMLElement, b: Box, from: Point = { x: 0, y: 0 }) => {
      e.style.left = `${b.x - from.x}px`;
      e.style.top = `${b.y - from.y}px`;
      e.style.width = `${b.w}px`;
      e.style.height = `${b.h}px`;
    };
    const knobTo = (row: LookRow, cell: number, still = false) => {
      const i = rows.findIndex((r) => r.row === row);
      const rb = L.rows[i];
      const c = rb?.cells[cell];
      if (!c) return;
      const k = rows[i].knob;
      if (still) k.style.transition = 'none';
      k.style.transform = `translate(${c.x + c.w / 2 - rb.rail.x - L.knob / 2}px, ${c.y + c.h / 2 - rb.rail.y - L.knob / 2}px)`;
      if (still) {
        void k.offsetWidth;
        k.style.transition = '';
      }
    };
    const layout = () => {
      const s = ctx.screen();
      L = wardrobeLayout(s.w, s.h);
      place(panel, L.panel);
      L.rows.forEach((rb, i) => {
        const r = rows[i];
        place(r.icon, rb.icon);
        place(r.rail, rb.rail);
        rb.cells.forEach((c, j) => place(r.swatches[j], c, rb.rail));
        knobTo(r.row, indexIn(rails.look, r.row), true);
      });
      place(done, L.done);
      place(preview, L.preview);
      pill.style.left = `${L.pill.x}px`;
      pill.style.top = `${L.pill.y}px`;
    };

    // ---- small effects on the swatches
    const hop = (e: HTMLElement) => void play(e, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
    const sparkleAt = (e: HTMLElement) => {
      const b = e.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      for (let i = 0; i < 5; i++) {
        const s = img(PIC.sparkle, 'wd-spark', root);
        s.style.left = `${cx}px`;
        s.style.top = `${cy}px`;
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const d = b.width * 0.66;
        const to = `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px))`;
        void play(s, [
          { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
          { transform: `${to} scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `${to} scale(0.5)`, opacity: 0 },
        ], { duration: 760, delay: i * 50, easing: 'ease-out', fill: 'both' }).then(() => s.remove());
      }
    };

    // ---- words on release, never over Elizabeth's guidance
    let guiding = false;
    const voice = new WordVoice({
      say: (clip) => void audio.say(clip),
      show: (print) => {
        if (print) pill.textContent = print;
        pill.classList.toggle('on', print !== null);
      },
      guiding: () => guiding,
    });
    undo.push(() => voice.close());
    const guide = async (clips: string[]) => {
      if (!clips.length || !alive) return;
      guiding = true;
      try {
        await audio.sayAll(clips);
      } finally {
        guiding = false;
      }
      if (alive && !finished) voice.pump();
    };

    // ---- the rails' rules
    const rails = new Rails(o.look, o.ribbons, {
      onLook: (look, row) => o.onLook(look, row),
      onPicked: (look, row) => o.onPicked(look, row),
      onFocus: (row) => o.onFocus(row),
    }, {
      select: (row, cell) => knobTo(row, cell),
      recolour: (look) => paint(look, false),
      sparkle: (row, cell) => sparkleAt(rowOf(row).swatches[cell]),
      bounce: (row, cell) => hop(rowOf(row).swatches[cell]),
      sfx: (name) => void audio.sfx(name),
      word: (w) => voice.push(w),
    });
    paint(rails.look, true);
    layout();
    const onResize = () => layout();
    addEventListener('resize', onResize);
    addEventListener('orientationchange', onResize);
    undo.push(() => {
      removeEventListener('resize', onResize);
      removeEventListener('orientationchange', onResize);
    });

    for (const r of rows) {
      undo.push(railPress(r.rail, r.row, rails, () => inputOn));
      undo.push(press(r.icon, {
        down: () => {
          if (!inputOn) return false;
          rails.icon(r.row);
          hop(r.icon);
        },
        end: () => {},
      }));
    }

    // ---- the preview box: a drag turns her, a tap makes her wave
    let turn: { x0: number; y0: number; lastX: number; total: number; moved: boolean } | null = null;
    undo.push(press(preview, {
      down: (e) => {
        if (!inputOn) return false;
        rails.hold();
        turn = { x0: e.clientX, y0: e.clientY, lastX: e.clientX, total: 0, moved: false };
      },
      move: (e) => {
        const t = turn;
        if (!t) return;
        if (!t.moved) {
          if (Math.hypot(e.clientX - t.x0, e.clientY - t.y0) < TAP_SLOP_PX) return;
          t.moved = true;
        }
        const want = clamp(t.total + e.clientX - t.lastX, -TURN_MAX_PX, TURN_MAX_PX);
        t.lastX = e.clientX;
        const d = want - t.total;
        t.total = want;
        if (d !== 0) o.onTurn(d, false);
      },
      end: (_e, how) => {
        const t = turn;
        turn = null;
        rails.release();
        if (!t || !alive) return;
        if (t.moved) o.onTurn(0, true);
        else if (how === 'up' || how === 'lost') o.onPreviewTap();
      },
    }));

    // ---- touches, the first-visit ghost slide and the idle line
    let lastTouch = performance.now();
    const fingers = new Set<number>();
    let demo: { start: PrincessLook; stopped: boolean } | null = null;
    let demoDone = !o.firstTime;
    let idleSaid = false;
    /** Any touch stops the ghost's slide and puts her look back, before the touch itself selects anything. */
    const stopDemo = (restore: boolean) => {
      const d = demo;
      if (!d) return;
      d.stopped = true;
      demo = null;
      ctx.ghost.hide();
      if (restore) rails.restore(d.start);
    };
    const onDown = (e: PointerEvent) => {
      fingers.add(e.pointerId);
      lastTouch = performance.now();
      stopDemo(true);
    };
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
    };
    addEventListener('pointerdown', onDown, true);
    addEventListener('pointerup', onUp, true);
    addEventListener('pointercancel', onUp, true);
    undo.push(() => {
      removeEventListener('pointerdown', onDown, true);
      removeEventListener('pointerup', onUp, true);
      removeEventListener('pointercancel', onUp, true);
    });

    /** The ghost hand slides along the gown rail across three gowns (she really changes) and back to her own. */
    const runDemo = async () => {
      demoDone = true;
      const d = { start: rails.look, stopped: false };
      demo = d;
      const g = rowOf('gown');
      const n = g.swatches.length;
      const i0 = indexIn(d.start, 'gown');
      const i1 = i0 + 3 < n ? i0 + 3 : Math.max(0, i0 - 3);
      const at = (i: number) => () => centreOf(g.swatches[i]);
      const follow = (p: Point) => {
        if (d.stopped) return;
        const b = g.rail.getBoundingClientRect();
        rails.demo('gown', cellAt(p.x, { x: b.left, w: b.width }, n));
      };
      await ctx.ghost.drag(at(i0), at(i1), { follow, ms: 1700 });
      if (!d.stopped && alive) await ctx.ghost.drag(at(i1), at(i0), { follow, ms: 1300 });
      if (demo === d) demo = null;
      if (d.stopped || !alive) return;
      rails.restore(d.start);
      lastTouch = performance.now();
    };
    const quietStep = (now: boolean): boolean => {
      if (!inputOn || guiding || demo || rails.active || fingers.size) return false;
      const quiet = performance.now() - lastTouch;
      if (!demoDone && (now || quiet >= GHOST_AFTER_MS)) {
        void runDemo();
        return true;
      }
      if (!idleSaid && (now || (quiet >= IDLE_AFTER_MS && !audio.speaking))) {
        idleSaid = true;
        void guide(o.clips.idle);
        return true;
      }
      return false;
    };
    const idleTimer = setInterval(() => void quietStep(false), 250);
    undo.push(() => clearInterval(idleTimer));

    // ---- Done: acts on pointerdown, resolves at once, then the panel slides out by itself
    const close = () => {
      if (!alive) return;
      alive = false;
      inputOn = false;
      stopDemo(false);
      rails.close(false);
      for (const fn of undo.splice(0).reverse()) fn();
    };
    undo.push(press(done, {
      down: () => {
        if (!inputOn || finished) return false;
        finished = true;
        inputOn = false;
        stopDemo(true);
        rails.close(true);
        voice.drop();
        const look = rails.look;
        done.classList.add('pressed');
        void audio.sfx('chime');
        void audio.sayAll(o.clips.done);
        resolve(look);
        root.classList.add('leaving');
        void play(slide, [{ transform: 'none' }, { transform: `translateX(${ctx.screen().w - L.panel.x + 24}px)` }], { duration: SLIDE_MS, easing: 'cubic-bezier(.5, 0, .8, .4)', fill: 'forwards' });
        void (async () => {
          await sleep(SLIDE_MS + 60);
          if (!alive) return;
          close();
          setOpen(null);
        })();
      },
      end: () => {},
    }));

    const handle: WardrobeHandle = {
      snapshot: () => ({ open: inputOn, focus: rails.focus }),
      targets: () => {
        if (!inputOn) return [];
        const out: UiTarget[] = [];
        for (const r of rows) {
          out.push(target(`row ${r.row}`, r.icon), target(`rail ${r.row}`, r.rail));
          optionsOf(r.row).forEach((opt, i) => out.push(target(`swatch ${r.row} ${opt.id}`, r.swatches[i])));
        }
        out.push(target('done', done), target('preview', preview));
        return out;
      },
      idleNow: () => quietStep(true),
      close,
    };
    setOpen(handle);

    // ---- in: the panel slides in from the right, and only then takes touches and speaks
    void (async () => {
      await play(slide, [{ transform: `translateX(${ctx.screen().w - L.panel.x + 24}px)` }, { transform: 'none' }], { duration: SLIDE_MS, easing: 'cubic-bezier(.2, .9, .3, 1)' });
      if (!alive) return;
      inputOn = true;
      done.classList.add('on');
      await guide([...o.clips.ready, ...(o.firstTime ? o.clips.firstTime : [])]);
      lastTouch = performance.now();
    })();
  });
}
