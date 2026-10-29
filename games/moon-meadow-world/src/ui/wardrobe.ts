// The wardrobe (docs/v4/2.3.md section 16, Layer.wardrobe): six fixed tabs in the icon column, at most five rails of
// six on the right, Princess Emma in 3D on the left (the game draws and frames her; the layer only has the preview box
// that turns her), the music box under her and the big pink play button for Done. Every rail is a static element: the
// cell under a finger comes from clientX against the rail's own box, and press() ends every gesture, also when the
// iPad loses the release. A tab acts on pointerdown and changes what the rails hold; nothing moves under a finger.
// The rules (selection, onLook timing, the one sound of a pick, focus, words, fingers) are in wardrobe-ctl.ts and the
// music box's clock in musicbox.ts.
import './wardrobe.css';
import type { Layer, LookField, LookTab, PrincessLook } from '../contracts';
import { audio } from '../audio';
import { FX_WAIT_MS } from '../audio/sound';
import { TABS, railsOf, tabOf, type RailSpec } from '../wardrobe';
import type { Ghost } from './ghost';
import { cellAt, clamp, railIn, wardrobeLayout, type Box, type Point, type WardrobeLayout } from './geometry';
import { centreOf, el, html, img, play, sleep } from './dom';
import { press } from './press';
import { PIC } from './parts';
import { target, type UiTarget } from './moment';
import { Fingers, Rails, WordVoice, railPress, tabPress } from './wardrobe-ctl';
import { BEAD_DIM, BEAD_FADE_MS, BoxClock, FINGERS_WAIT_MS } from './musicbox';
import { MOON_BEAD_SVG, MUSIC_BOX_SVG, MUSIC_KEY_SVG, PLAY_SVG, SWATCH_DEPS, TAB_DEPS, swatchSvg, tabIconSvg } from './swatches';
import { BOARD_MS, showBoard } from './board';

export type WardrobeOpts = Parameters<Layer['wardrobe']>[0];
export type WardrobeResult = Awaited<ReturnType<Layer['wardrobe']>>;

/** The test hook's view of the wardrobe (section 16): open while it takes touches, the tab, the framed tab, the box. */
export interface WardrobeSnapshot {
  open: boolean;
  tab: LookTab;
  focus: LookTab | null;
  box: { limitMs: number; leftMs: number };
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
/** First visit only: the ghost hand slides along the gown colour rail after this long without a touch. */
const GHOST_AFTER_MS = 8000;
/** The idle line ("When you are ready, tap play."), once. */
const IDLE_AFTER_MS = 25000;
/** A finger on the preview that moves less than this is a tap (she waves). */
const TAP_SLOP_PX = 10;
/** 170 degrees at 1 degree per 2 px. */
const TURN_MAX_PX = 340;

interface RowEls {
  rail: HTMLElement;
  knob: HTMLElement;
  swatches: HTMLElement[];
  /** What the rail holds on this tab, or null (the row stays empty). */
  spec: RailSpec | null;
  /** Its index among its field's rails (the target name 'rail <field> <n>'). */
  n: number;
}

/** The tab the panel opens on: the tab of today's newest gift at the Corner (she sees it at once), else hair. */
function startTab(o: WardrobeOpts): LookTab {
  const fresh = o.board?.fresh.at(-1);
  const tab = fresh ? tabOf(fresh.field) : TABS[0].tab;
  return tab === 'crown' && !o.crownTab ? TABS[0].tab : tab;
}

export function runWardrobe(
  ctx: { parent: HTMLElement; ghost: Ghost; screen(): { w: number; h: number } },
  o: WardrobeOpts,
  setOpen: (h: WardrobeHandle | null) => void,
): Promise<WardrobeResult> {
  return new Promise((resolve) => {
    const undo: (() => void)[] = [];
    let alive = true;
    let inputOn = false;
    let finished = false;
    const fingers = new Fingers();
    undo.push(() => fingers.close());

    // ---- the elements: the sliding panel with its tabs and rows, then Done, the preview, the pill, the music box
    const root = el('div', 'wardrobe', ctx.parent);
    const slide = el('div', 'wd-slide', root);
    const panel = el('div', 'wd-panel panel', slide);
    const tabs = TABS.map(({ tab }) => {
      const t = el('div', `wd-tab touch tab-${tab}`, slide);
      t.setAttribute('aria-label', `tab ${tab}`);
      // The crown's place stays empty until Lumi has given the crown; nothing moves into it.
      if (tab === 'crown' && !o.crownTab) t.classList.add('empty');
      return t;
    });
    const tabEl = (tab: LookTab) => tabs[TABS.findIndex((t) => t.tab === tab)];
    const rows: RowEls[] = Array.from({ length: 5 }, () => {
      const rail = el('div', 'wd-rail touch', slide);
      el('div', 'wd-track', rail);
      const swatches = Array.from({ length: 6 }, () => el('div', 'wd-swatch', rail));
      const knob = el('div', 'wd-knob', rail);
      return { rail, knob, swatches, spec: null, n: 0 };
    });
    const done = html(PLAY_SVG, 'wd-done touch', root);
    done.setAttribute('aria-label', 'done');
    const preview = el('div', 'wd-preview touch', root);
    preview.setAttribute('aria-label', 'preview');
    const pill = el('div', 'wd-pill', root);
    const boxEl = el('div', 'wd-box', root);
    html(MUSIC_BOX_SVG, 'wd-box-face', boxEl);
    html(MUSIC_KEY_SVG, 'wd-key', boxEl);
    const beads = Array.from({ length: 6 }, () => html(MOON_BEAD_SVG, 'wd-bead', root));
    undo.push(() => root.remove());

    const fresh = new Set((o.board?.fresh ?? []).map((i) => `${i.field} ${i.id}`));
    let tab: LookTab = startTab(o);

    // ---- layout from wardrobeLayout(), so the game, the tests and the screen agree
    let L: WardrobeLayout = wardrobeLayout(ctx.screen().w, ctx.screen().h);
    const place = (e: HTMLElement, b: Box, from: Point = { x: 0, y: 0 }) => {
      e.style.left = `${b.x - from.x}px`;
      e.style.top = `${b.y - from.y}px`;
      e.style.width = `${b.w}px`;
      e.style.height = `${b.h}px`;
    };
    const knobTo = (r: RowEls, i: number, still = false) => {
      const row = L.rows[rows.indexOf(r)];
      const c = row.cells[i];
      const k = r.knob;
      k.classList.toggle('off', !c);
      if (!c) return;
      if (still) k.style.transition = 'none';
      k.style.transform = `translate(${c.x + c.w / 2 - row.rail.x - L.knob / 2}px, ${c.y + c.h / 2 - row.rail.y - L.knob / 2}px)`;
      if (still) {
        void k.offsetWidth;
        k.style.transition = '';
      }
    };
    /** The knob of every rail of this field: on the cell she wears, or hidden on a rail that does not hold it. */
    const knobs = (field: LookField, id: string, still = false) => {
      for (const r of rows) if (r.spec?.field === field) knobTo(r, r.spec.ids.indexOf(id), still);
    };
    const placeRow = (r: RowEls) => {
      const row = L.rows[rows.indexOf(r)];
      if (!r.spec) return;
      const { rail, cells } = railIn(row, r.spec.ids.length);
      place(r.rail, rail);
      cells.forEach((c, j) => place(r.swatches[j], c, rail));
      knobs(r.spec.field, rails.look[r.spec.field], true);
    };
    const layout = () => {
      const s = ctx.screen();
      L = wardrobeLayout(s.w, s.h);
      place(panel, L.panel);
      L.tabs.forEach((t, i) => place(tabs[i], t.box));
      rows.forEach(placeRow);
      place(done, L.done);
      place(preview, L.preview);
      place(boxEl, L.box);
      L.beads.forEach((b, i) => place(beads[i], b));
      pill.style.left = `${L.pill.x}px`;
      pill.style.top = `${L.pill.y}px`;
    };

    // ---- pictures: a rail is drawn again when a field its pictures show changes (SWATCH_DEPS), a tab tile likewise
    const paintRow = (r: RowEls, look: PrincessLook) => {
      if (!r.spec) return;
      const field = r.spec.field;
      r.spec.ids.forEach((id, j) => {
        r.swatches[j].innerHTML = swatchSvg(field, id, look);
        r.swatches[j].classList.toggle('fresh', fresh.has(`${field} ${id}`));
      });
    };
    const paint = (look: PrincessLook, changed: readonly LookField[] | null) => {
      for (const r of rows) {
        if (r.spec && (!changed || SWATCH_DEPS[r.spec.field].some((f) => changed.includes(f)))) paintRow(r, look);
      }
      TABS.forEach(({ tab: t }, i) => {
        if (!changed || TAB_DEPS[t].some((f) => changed.includes(f))) tabs[i].innerHTML = tabIconSvg(t, look);
      });
    };

    /** Fill the five rows with the tab's rails: each field on its fixed rows, owned options only (railsOf). */
    const fillRows = () => {
      const specs = railsOf(tab, o.owned);
      const seen = new Map<LookField, number>();
      rows.forEach((r, i) => {
        const spec = specs.find((s) => s.row === i) ?? null;
        r.spec = spec;
        r.rail.classList.toggle('empty', !spec);
        if (!spec) return;
        r.n = seen.get(spec.field) ?? 0;
        seen.set(spec.field, r.n + 1);
        r.rail.setAttribute('aria-label', `rail ${spec.field} ${r.n}`);
        r.swatches.forEach((s, j) => {
          s.classList.toggle('empty', j >= spec.ids.length);
          s.setAttribute('aria-label', j < spec.ids.length ? `swatch ${spec.field} ${spec.ids[j]}` : '');
        });
        paintRow(r, rails.look);
        placeRow(r);
      });
      tabs.forEach((t, i) => t.classList.toggle('on', TABS[i].tab === tab));
    };
    const setTab = (next: LookTab) => {
      if (next === 'crown' && !o.crownTab) return;
      if (next === tab) return;
      tab = next;
      fillRows();
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
    /** Guide lines running now: a word waits until the last one has ended (two may overlap). */
    let guiding = 0;
    const voice = new WordVoice({
      say: (clip) => void audio.say(clip),
      show: (p) => {
        if (p) {
          pill.textContent = p.text;
          // The normal ink, never the colour itself: a word printed in its colour could be matched without reading.
          pill.style.color = p.ink;
        }
        pill.classList.toggle('on', p !== null);
      },
      guiding: () => guiding > 0,
    });
    undo.push(() => voice.close());
    const guide = async (clips: string[]) => {
      if (!clips.length || !alive) return;
      guiding++;
      try {
        await audio.sayAll(clips);
      } finally {
        guiding--;
      }
      if (alive && !finished && guiding === 0) voice.pump();
    };

    // ---- the rails' rules
    const rowOf = (rail: RailSpec) => rows.find((r) => r.spec === rail);
    const rails = new Rails(o.look, {
      onLook: (look, field) => o.onLook(look, field),
      onPicked: (look, field) => o.onPicked(look, field),
      onFocus: (t) => o.onFocus(t),
    }, {
      select: (field, id) => knobs(field, id),
      changed: (look, fields) => paint(look, fields),
      bounce: (rail, cell) => {
        const r = rowOf(rail);
        if (r) hop(r.swatches[cell]);
      },
      // The synthesised tick and pop play outside the channel, so they keep its rule here: nothing under Elizabeth.
      sfx: (name) => {
        if (!audio.speaking) void audio.sfx(name);
      },
      // Before the sound pack exists, a pick's effect plays 2.2's pop, so every pick still gives one sound.
      fx: (id) => void audio.fx(id, { fallback: 'pop' }),
      word: (w, o) => voice.push(w, o),
    });
    paint(rails.look, null);
    fillRows();
    layout();
    const onResize = () => layout();
    addEventListener('resize', onResize);
    addEventListener('orientationchange', onResize);
    undo.push(() => {
      removeEventListener('resize', onResize);
      removeEventListener('orientationchange', onResize);
    });

    for (const r of rows) undo.push(railPress(r.rail, () => r.spec, rails, () => inputOn));
    TABS.forEach(({ tab: t }, i) => {
      undo.push(tabPress(tabs[i], t, (next) => {
        stopDemo(true);
        setTab(next);
        rails.tab(next);
        hop(tabs[i]);
      }, () => inputOn && !(t === 'crown' && !o.crownTab)));
    });

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
    let demo: { start: PrincessLook; stopped: boolean } | null = null;
    let demoDone = !o.firstTime;
    let idleSaid = false;
    /** Any touch stops the ghost's slide and puts her look back, before the touch itself selects anything. */
    function stopDemo(restore: boolean) {
      const d = demo;
      if (!d) return;
      d.stopped = true;
      demo = null;
      ctx.ghost.hide();
      if (restore) rails.restore(d.start);
    }
    const onDown = () => {
      lastTouch = performance.now();
      stopDemo(true);
    };
    addEventListener('pointerdown', onDown, true);
    undo.push(() => removeEventListener('pointerdown', onDown, true));

    /**
     * The ghost hand slides along the gown colour rail across three colours (she really changes) and back to her own.
     * On another tab it first taps the gown tab.
     */
    const runDemo = async () => {
      demoDone = true;
      const d = { start: rails.look, stopped: false };
      demo = d;
      if (tab !== 'gown') {
        await ctx.ghost.tap(() => ({ ...centreOf(tabEl('gown')), visible: true }));
        if (d.stopped || !alive) return;
        setTab('gown');
        await sleep(250);
        if (d.stopped || !alive) return;
      }
      const g = rows.find((r) => r.spec?.field === 'gownColour');
      if (!g?.spec) return;
      const spec = g.spec;
      const n = spec.ids.length;
      const i0 = Math.max(0, spec.ids.indexOf(d.start.gownColour));
      const i1 = i0 + 3 < n ? i0 + 3 : Math.max(0, i0 - 3);
      const at = (i: number) => () => centreOf(g.swatches[i]);
      const follow = (p: Point) => {
        if (d.stopped) return;
        const b = g.rail.getBoundingClientRect();
        rails.demo(spec, cellAt(p.x, { x: b.left, w: b.width }, n));
      };
      await ctx.ghost.drag(at(i0), at(i1), { follow, ms: 1700 });
      if (!d.stopped && alive) await ctx.ghost.drag(at(i1), at(i0), { follow, ms: 1300 });
      if (demo === d) demo = null;
      if (d.stopped || !alive) return;
      rails.restore(d.start);
      lastTouch = performance.now();
    };
    // Only a finger on a rail or turning her holds these back: a thumb resting anywhere else (or a release the window
    // never heard) must not keep the ghost and the idle line away. Fingers is for the kind ending only.
    const quietStep = (now: boolean): boolean => {
      if (!inputOn || guiding || demo || rails.active || turn) return false;
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

    // ---- the music box: the beads fade, "Nearly ready!", and at the end the kind ending
    const clock = new BoxClock(o.limitMs, {
      musicBox: (ms) => audio.musicBox(ms),
      speaking: () => audio.speaking,
      nearly: () => void guide(o.clips.nearly),
      bead: (i) => void play(beads[i], [{ opacity: 1 }, { opacity: BEAD_DIM }], { duration: BEAD_FADE_MS, easing: 'ease-in-out', fill: 'forwards' }),
      onBox: (on) => {
        boxEl.classList.toggle('on', on);
        o.onBox?.(on);
      },
      timeUp: () => void endKindly(),
    });
    undo.push(() => clock.stop());

    /**
     * The tune ran out: no new touches, no more words; a finger still on a rail keeps its gesture, and the panel waits
     * until every finger is up (at most 2 s). Then it ends as Done does. Nothing is taken off and nothing says no.
     */
    const endKindly = async () => {
      if (finished || !alive) return;
      inputOn = false;
      stopDemo(true);
      rails.mute();
      voice.drop();
      root.classList.add('resting');
      await fingers.allUp(FINGERS_WAIT_MS);
      if (alive) finish('time');
    };

    // ---- the end: Done (pointerdown) or the kind ending; the look is resolved, then the panel slides out by itself
    /** The layer closed the panel from outside (a reset or the next wardrobe). */
    let reset = false;
    const close = () => {
      if (!alive) return;
      alive = false;
      inputOn = false;
      stopDemo(false);
      rails.close(false);
      for (const fn of undo.splice(0).reverse()) fn();
    };
    const finish = (end: WardrobeResult['end']) => {
      if (finished || !alive) return;
      finished = true;
      inputOn = false;
      stopDemo(true);
      rails.close(true);
      voice.drop();
      clock.stop();
      if (end === 'done') done.classList.add('pressed');
      // Her last word stops and the chime sounds on its own; "Lovely!" follows it, as her line waits for an effect (at
      // most 1 s, section 8), and only when no other speech has begun by then, so it never cuts a line.
      // The speech count drops only once stop()'s promises settle (microtasks), and the chime and the line both check
      // it, so they wait a task, as the gift paper does (gift.ts).
      audio.stop();
      setTimeout(() => {
        void Promise.race([audio.sfx('chime'), sleep(FX_WAIT_MS)]).then(() => {
          if (!reset && !audio.speaking) void audio.sayAll(o.clips.done);
        });
      }, 0);
      resolve({ look: rails.look, end });
      root.classList.add('leaving');
      void play(slide, [{ transform: 'none' }, { transform: `translateX(${ctx.screen().w - L.panel.x + 24}px)` }], { duration: SLIDE_MS, easing: 'cubic-bezier(.5, 0, .8, .4)', fill: 'forwards' });
      void (async () => {
        await sleep(SLIDE_MS + 60);
        if (!alive) return;
        close();
        setOpen(null);
      })();
    };
    undo.push(press(done, {
      down: () => {
        if (!inputOn || finished) return false;
        finish('done');
        return false;
      },
      end: () => {},
    }));

    const handle: WardrobeHandle = {
      snapshot: () => ({ open: inputOn, tab, focus: rails.focus, box: { limitMs: clock.limitMs, leftMs: Math.round(clock.leftMs) } }),
      targets: () => {
        if (!inputOn) return [];
        const out: UiTarget[] = [];
        TABS.forEach(({ tab: t }, i) => {
          if (!(t === 'crown' && !o.crownTab)) out.push(target(`tab ${t}`, tabs[i]));
        });
        for (const r of rows) {
          if (!r.spec) continue;
          const spec = r.spec;
          out.push(target(`rail ${spec.field} ${r.n}`, r.rail));
          spec.ids.forEach((id, j) => out.push(target(`swatch ${spec.field} ${id}`, r.swatches[j])));
        }
        out.push(target('done', done), target('preview', preview));
        return out;
      },
      idleNow: () => quietStep(true),
      close: () => {
        reset = true;
        close();
      },
    };
    setOpen(handle);

    // ---- in: the panel slides in from the right; the trunk lid's board shows first at the Corner; only then do the
    // rails take touches, the music box start and Elizabeth speak.
    void (async () => {
      await play(slide, [{ transform: `translateX(${ctx.screen().w - L.panel.x + 24}px)` }, { transform: 'none' }], { duration: SLIDE_MS, easing: 'cubic-bezier(.2, .9, .3, 1)' });
      if (!alive) return;
      if (o.board) {
        const b = showBoard(root, o.board, BOARD_MS, { look: rails.look, screen: ctx.screen });
        undo.push(() => b.close());
        await b.done;
        if (!alive) return;
      }
      inputOn = true;
      done.classList.add('on');
      clock.start();
      if (o.board) for (const r of rows) r.swatches.forEach((s) => s.classList.contains('fresh') && sparkleAt(s));
      await guide([...o.clips.ready, ...(o.firstTime ? o.clips.firstTime : [])]);
      lastTouch = performance.now();
    })();
  });
}
