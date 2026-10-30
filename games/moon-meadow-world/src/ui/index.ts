// The 2D layer over the WebGL canvas (contracts: Layer). Plain DOM and CSS, pointer events, every size from one
// design unit (--u) so it fits 1180 x 820, 1080 x 810 and 1366 x 1024. The root lets touches through to the 3D
// world; only the things she can touch take them. The only print is the learning: words, gems, numerals, names.
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import './ui.css';
import type { Layer, LayerDeps, PrincessLook } from '../contracts';
import { audio } from '../audio';
import { skyWash, unitFor, type Box } from './geometry';
import { el, setUnit } from './dom';
import { createGhost } from './ghost';
import { releaseDrags } from './drag';
import { createLumi } from './lumi';
import { createArrow } from './arrow';
import { createFoodBasket, createHome, createTags } from './hud';
import { createCurtain, createTurn, endScreen, startScreen } from './screens';
import { runEgg } from './egg';
import { runNaming } from './naming';
import { runWish } from './wish';
import { runWardrobe, type WardrobeHandle, type WardrobeSnapshot } from './wardrobe';
import { runGift, type GiftHandle } from './gift';
import { BOARD_MS, showBoard, type BoardHandle } from './board';
import { runBeads } from './beads';
import { createOffers } from './offer';
import { runSign } from './sign';
import { createSaddles } from './saddle';
import { DEFAULT_LOOK } from '../wardrobe';
import type { LayerCtx, MomentSnapshot, OpenMoment, UiTarget } from './moment';
import { target } from './moment';

export type { MomentSnapshot, UiTarget } from './moment';
export type { WardrobeSnapshot } from './wardrobe';

/** Extras beyond the contract, for the game's test hook and the flows. */
export interface LayerExtras {
  /**
   * The open moment (kind, phase, hint level, misses, the answer's name), the customiser (open while it takes
   * touches, and the framed row; it is not a moment) and every touchable thing on screen.
   */
  snapshot(): { moment: MomentSnapshot | null; wardrobe: WardrobeSnapshot | null; targets: UiTarget[] };
  /**
   * Run the open moment's next idle step now, instead of waiting 15 s (10 s for reading). In the customiser: the
   * first-visit ghost slide, then the idle line.
   */
  idleNow(): boolean;
}

/** Stop the browser's own gestures: pinch and double-tap zoom, the long-press menu, text selection. */
function installGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  for (const t of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart']) {
    document.addEventListener(t, prevent, { passive: false });
  }
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.documentElement.classList.add('mmw-guarded');
}

export function createLayer(root: HTMLElement, _deps: LayerDeps = {}): Layer & LayerExtras {
  installGuards();
  root.classList.add('mmw-ui');

  // The time-of-day wash lies over the world and under everything of the layer.
  const skyLayer = el('div', 'ui-sky', root);
  const sunset = el('div', 'sky-sunset', skyLayer);
  const night = el('div', 'sky-night', skyLayer);
  const moments = el('div', 'ui-moments', root);
  const tagsLayer = el('div', 'ui-tags', root);
  const hudLayer = el('div', 'ui-hud', root);
  const dragLayer = el('div', 'ui-drag', root);
  const ghostLayer = el('div', 'ui-ghost', root);
  const screens = el('div', 'ui-screens', root);
  const perfBox = el('div', 'perf', root);
  // Before the tags layer, so tags sit under the moment panels.
  root.insertBefore(tagsLayer, moments);

  const screen = () => ({ w: root.clientWidth || innerWidth, h: root.clientHeight || innerHeight });
  const ghost = createGhost(ghostLayer);
  // The box bubbles and the gift cards keep clear of (layer.keepClear), read every frame.
  let keep: (() => Box | null) | null = null;
  const clear = (): Box | null => keep?.() ?? null;
  const ctx: LayerCtx = { moments, drag: dragLayer, ghost, seen: new Set(), screen, clear };
  let open: OpenMoment | null = null;
  const setOpen = (m: OpenMoment | null) => {
    open = m;
  };

  const replay = (): boolean => {
    if (!open) return false;
    open.replay();
    return true;
  };

  const lumi = createLumi(hudLayer, () => void replay());
  const arrow = createArrow(hudLayer, screen);
  const tags = createTags(tagsLayer);
  const food = createFoodBasket(hudLayer, dragLayer);
  const home = createHome(hudLayer);
  // Offer bubbles follow places in the world like the name tags, under the moment panels.
  const offers = createOffers(tagsLayer, screen, clear);
  // 2.4.0: the saddle icons over the mounts, on the hud.
  const saddles = createSaddles(hudLayer);
  let wardrobe: WardrobeHandle | null = null;
  let gift: GiftHandle | null = null;
  let board: BoardHandle | null = null;
  /** The look she wore at the last wardrobe or gift picker: the board on its own draws her gifts in its colours. */
  let lastLook: PrincessLook = { ...DEFAULT_LOOK };
  const curtain = createCurtain(screens);
  const turn = createTurn(screens);

  // One design unit for every size, and the turn picture in portrait (Elizabeth asks once, after Play). The turn line
  // cuts any goal that was playing, so back in landscape an open moment says its goal again.
  let started = false;
  let turnSaid = false;
  let wasPortrait = false;
  const fit = () => {
    const { w, h } = screen();
    const unit = unitFor(Math.max(w, h), Math.min(w, h));
    setUnit(unit);
    root.style.setProperty('--u', `${unit}px`);
    const portrait = h > w;
    turn.show(portrait);
    if (portrait && started && !turnSaid) {
      turnSaid = true;
      void audio.say('platform-turn');
    }
    if (wasPortrait && !portrait && started) {
      const phase = open?.snapshot().phase;
      if (phase && phase !== 'busy' && phase !== 'done') replay();
    }
    wasPortrait = portrait;
  };
  fit();
  addEventListener('resize', fit);
  addEventListener('orientationchange', fit);

  const layer: Layer & LayerExtras = {
    root,
    start: (onTap) =>
      startScreen(screens, () => {
        started = true;
        onTap();
        fit();
      }),
    curtain: (on, colour) => curtain.set(on, colour),
    lumi: {
      show: (on) => lumi.show(on),
      speak: (clips) => lumi.speak(clips),
      onTap: (fn) => lumi.onTap(fn),
    },
    egg: (spec, hooks) => {
      // 2.3.0: an egg's second and third sums open on the panel the sum before left on screen (egg.ts keeps it).
      if (!(open?.kind === 'egg' && (spec.round?.index ?? 0) > 0)) open?.close();
      return runEgg(ctx, spec, hooks, setOpen);
    },
    naming: (spec, hooks) => {
      open?.close();
      return runNaming(ctx, spec, hooks, setOpen);
    },
    wish: (spec, hooks) => {
      open?.close();
      return runWish(ctx, spec, hooks, setOpen);
    },
    sign: (spec, hooks) => {
      open?.close();
      return runSign(ctx, spec, hooks, setOpen);
    },
    saddles: (o) => saddles.set(o),
    replay,
    ghost: {
      tap: (at) => ghost.tap(at),
      drag: (from, to) => ghost.drag(from, to),
      glide: (points) => ghost.glide(points),
      hide: () => ghost.hide(),
    },
    arrow: (goal, onTap) => arrow.set(goal, onTap),
    tag: (name, at, ms) => tags.show(name, at, ms),
    wardrobe: (o) => {
      wardrobe?.close();
      lastLook = { ...o.look };
      return runWardrobe({ parent: moments, ghost, screen }, o, (h) => {
        wardrobe = h;
      }).then((r) => {
        lastLook = { ...r.look };
        return r;
      });
    },
    gift: (o) => {
      gift?.close();
      lastLook = { ...o.look };
      return runGift({ parent: moments, ghost, screen, clear }, o, (h) => {
        gift = h;
      });
    },
    board: (spec, ms = BOARD_MS) => {
      board?.close();
      const b = showBoard(moments, spec, ms, { look: lastLook, screen });
      board = b;
      return b.done.then(() => {
        if (board === b) board = null;
      });
    },
    beads: (spec, hooks, o) => {
      open?.close();
      return runBeads(ctx, spec, hooks, setOpen, o);
    },
    offer: (id, o) => offers.set(id, o),
    offerBob: (id, grow) => offers.bob(id, grow),
    keepClear: (box) => {
      keep = box;
    },
    foodBasket: (o) => food.set(o),
    theEnd: (o) => endScreen(screens, o),
    sky: (t) => {
      const w = skyWash(t);
      sunset.style.opacity = w.sunset.toFixed(3);
      night.style.opacity = w.night.toFixed(3);
    },
    perf: (text) => {
      perfBox.textContent = text;
      perfBox.classList.toggle('on', text !== '');
    },
    reset: () => {
      open?.close();
      open = null;
      wardrobe?.close();
      wardrobe = null;
      gift?.close();
      gift = null;
      board?.close();
      board = null;
      offers.reset();
      saddles.set(null);
      keep = null;
      ghost.hide();
      releaseDrags();
      dragLayer.innerHTML = '';
      root.querySelectorAll('.lifted').forEach((e) => e.classList.remove('lifted'));
      arrow.set(null);
      tags.reset();
      food.reset();
      lumi.reset();
      curtain.reset();
      screens.querySelectorAll('.screen').forEach((s) => s.remove());
      ctx.seen.clear();
      audio.stop();
    },
    snapshot: () => {
      const m = open?.snapshot() ?? null;
      const targets: UiTarget[] = [...(m?.targets ?? [])];
      const add = (name: string, e: Element | null) => {
        if (!e) return;
        const r = e.getBoundingClientRect();
        if (r.width > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0') targets.push(target(name, e));
      };
      if (!lumi.el.classList.contains('hidden')) add('lumi', lumi.el);
      add('home', home);
      if (arrow.shown) add('arrow', hudLayer.querySelector('.arrow'));
      add('food basket', hudLayer.querySelector('.food-btn.on'));
      hudLayer.querySelectorAll('.food-tray.open .food').forEach((f) => add(f.getAttribute('aria-label') ?? 'food', f));
      add('play', screens.querySelector('.screen.start .play'));
      add('play again', screens.querySelector('.screen.end .end-moon'));
      targets.push(...(wardrobe?.targets() ?? []), ...(gift?.targets() ?? []), ...offers.targets(), ...saddles.targets());
      return { moment: m, wardrobe: wardrobe?.snapshot() ?? null, targets };
    },
    idleNow: () => {
      const l = open?.ladder;
      if (!l) return (gift?.idleNow() ?? false) || (wardrobe?.idleNow() ?? false);
      l.idleNow();
      return true;
    },
  };
  return layer;
}
