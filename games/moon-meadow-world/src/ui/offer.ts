// The side quests' offer bubbles (docs/v4/2.2.md 5, Layer.offer): a picture in a round bubble over a place in the
// world (the picnic rug, the hay rack), following its point every frame and bobbing gently. While the place is off
// screen the bubble waits at the screen edge in its direction. It acts on pointerdown, because it moves with the
// camera and a release could land beside it. A tapped bubble pops away by itself. 2.3: a quest bubble can carry a
// badge on its rim, the picture of a gift that quest can still give (swatches.ts giftSwatchUrl), so the prize shows
// without reading (docs/v4/2.3.md section 17.2). 2.3.0's last pass: bubbles never cover each other (a later one moves
// along the screen edge it waits at, or up), and never Princess Emma (layer.keepClear): one that would goes above her.
// 2.4.0 (the hub, docs/v4/2.4.md section 5.2): a bubble at a screen edge is small, 100 design px (90 on a screen under
// 760 CSS px high) without its tail, so four fit on one edge between the home button and the food basket
// (geometry.ts edgeBubbles); `base` draws a picture under the bubble's own (the nest under the moon egg); bob() bobs a
// bubble once, or grows it and bobs it for about 3 s (the hub's nudge).
import './wardrobe.css';
import type { ScreenPoint } from '../contracts';
import { audio } from '../audio';
import { EDGE_BUBBLE, apart, bubbleBox, clamp, clearOf, edgeArrow, edgeBand, edgeSize, stackOnEdge, type Box } from './geometry';
import { el, img, onTick, play, u, wordPicEl } from './dom';
import { press } from './press';
import { PIC } from './parts';
import { target, type UiTarget } from './moment';

export interface OfferOpts {
  pic: string;
  /** A greyscale picture's colour (2.3: the bead tree's bead). */
  tint?: string;
  /** A small picture on the bubble's rim: the swatch of a gift the quest can still give (2.3; drawn by wardrobe-ui). */
  badge?: string;
  /** A picture drawn under `pic` (2.4.0: the nest under the moon egg). */
  base?: string;
  at: () => ScreenPoint;
  onTap(): void;
}

/** The bubble's size and the gap from its tail to the point, in design px. */
const SIZE = 132;
const TAIL = 26;

export function createOffers(parent: HTMLElement, screen: () => { w: number; h: number }, clear: () => Box | null = () => null) {
  const live = new Map<string, { box: HTMLElement; ball: HTMLElement; follow(placed: readonly Box[], her: Box | null): Box; end(pop: boolean): void }>();

  // One tick places every bubble in the order they came, each off the ones placed before it.
  let stopTick: (() => void) | null = null;
  const tick = () => {
    const her = clear();
    const placed: Box[] = [];
    for (const b of live.values()) placed.push(b.follow(placed, her));
  };
  const ticking = (on: boolean) => {
    if (on && !stopTick) stopTick = onTick(tick);
    if (!on && stopTick) {
      stopTick();
      stopTick = null;
    }
  };

  const remove = (id: string, pop: boolean) => live.get(id)?.end(pop);

  const add = (id: string, o: OfferOpts) => {
    const box = el('div', 'offer', parent);
    const bob = el('div', 'offer-bob', box);
    const ball = el('div', 'offer-ball touch', bob);
    ball.setAttribute('aria-label', `offer ${id}`);
    if (o.base) img(o.base, 'offer-base', ball);
    wordPicEl({ pic: o.pic, tint: o.tint }, 'offer-pic', ball);
    img(PIC.sparkle, 'offer-spark', ball);
    if (o.badge) img(o.badge, 'offer-badge-pic', el('div', 'offer-badge', ball));
    el('span', 'offer-tail', bob);
    // Each bubble bobs on its own beat.
    bob.style.animationDelay = `${-((live.size * 1.3) % 3).toFixed(2)}s`;
    let taken = false;
    let shown = false;

    let edge = false;
    let edgePx = 0;
    const follow = (placed: readonly Box[], her: Box | null): Box => {
      const a = o.at();
      const scr = screen();
      const s = u(SIZE);
      const h = s + u(TAIL);
      const margin = u(12);
      const gap = u(10);
      const corners = {
        gap,
        margin,
        topLeft: { x: 0, y: 0, w: u(160), h: u(160) },
        topRight: { x: scr.w - u(112), y: 0, w: u(112), h: u(112) },
      };
      // A place off screen keeps its bubble at the screen edge, in its direction, small and without the tail, so
      // she can always see it is waiting (a tap walks her there). 2.4.0: 100 design px (90 under 760 CSS px high).
      const es = edgeSize(scr);
      const out = edgeArrow(a, a.visible, scr, margin + es / 2, 0);
      let r: Box;
      let tailX = s / 2;
      if (out) {
        const side = Math.abs(out.x - (margin + es / 2)) < 1 ? 'left' : Math.abs(out.x - (scr.w - margin - es / 2)) < 1 ? 'right' : null;
        const want = { x: out.x - es / 2, y: out.y - es / 2, w: es, h: es };
        if (side) {
          // Along a side edge, between the top corner (Lumi or the home button) and, on the right, the food basket.
          r = stackOnEdge(want, placed, edgeBand(side, scr), gap);
        } else {
          // Along the top or the bottom edge, clear of Lumi, the home button and the food basket.
          const top = out.y < scr.h / 2;
          const lo = top ? u(EDGE_BUBBLE.topLeft) : margin;
          const hi = scr.w - (top ? u(EDGE_BUBBLE.topRight) : u(EDGE_BUBBLE.basket)) - es;
          r = apart({ ...want, x: clamp(want.x, lo, hi) }, placed, scr, { gap, margin, along: 'x' });
        }
      } else {
        let b = bubbleBox(a, s, h, scr, corners);
        // Never over her: above her head instead (after the Corner she stands beside the picnic rug).
        b = clearOf(b, a, s, h, her, scr, corners);
        // Never over the food basket in the bottom right corner.
        const basket = { x: scr.w - u(150), y: scr.h - u(150) };
        const x = b.x + s > basket.x && b.y + s > basket.y ? Math.max(margin, basket.x - s) : b.x;
        // Never over a bubble placed before it: up when it is on screen.
        r = apart({ x, y: b.y, w: s, h }, placed, scr, { gap, margin, along: 'up' });
        tailX = Math.max(s * 0.18, Math.min(s * 0.82, a.x - r.x));
      }
      box.style.transform = `translate(${r.x}px, ${r.y}px)`;
      box.style.setProperty('--tail-x', `${tailX}px`);
      if (!!out !== edge || (out && edgePx !== es)) {
        edge = !!out;
        edgePx = es;
        box.classList.toggle('edge', edge);
        // The small edge size on the bubble and its ball; the CSS sizes come back on screen.
        for (const e of [box, ball]) {
          e.style.width = edge ? `${es}px` : '';
          e.style.height = edge ? `${es}px` : '';
        }
      }
      const on = !taken;
      if (on !== shown) {
        shown = on;
        box.classList.toggle('on', on);
      }
      return r;
    };

    const end = (pop: boolean) => {
      if (live.get(id)?.box !== box) return;
      live.delete(id);
      if (!live.size) ticking(false);
      dispose();
      if (!pop) {
        box.remove();
        return;
      }
      void play(ball, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0.9, offset: 0.4 }, { transform: 'scale(0.2)', opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).then(() => box.remove());
    };
    // The whole tap happens on pointerdown, so the press is refused afterwards: nothing waits for a release.
    const dispose = press(ball, {
      down: () => {
        if (taken || !shown) return false;
        taken = true;
        void audio.sfx('pop');
        end(true);
        o.onTap();
        return false;
      },
      end: () => {},
    });
    live.set(id, { box, ball, follow, end });
    tick();
    ticking(true);
  };

  return {
    /** Show or replace the bubble with this id; null takes it away. */
    set(id: string, o: OfferOpts | null) {
      remove(id, false);
      if (o) add(id, o);
    },
    /**
     * A bubble bobs once (a Lumi tap in the hub), or with `grow` grows and bobs for about 3 s (the hub's nudge, 2.4.0).
     * Unknown ids do nothing.
     */
    bob(id: string, grow: boolean): void {
      const b = live.get(id);
      if (!b) return;
      const frames: Keyframe[] = grow
        ? [
            { transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.12 }, { transform: 'scale(1.22)', offset: 0.3 },
            { transform: 'scale(1.38)', offset: 0.48 }, { transform: 'scale(1.22)', offset: 0.66 }, { transform: 'scale(1.32)', offset: 0.84 },
            { transform: 'scale(1)' },
          ]
        : [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }];
      void play(b.ball, frames, { duration: grow ? 3000 : 520, easing: 'ease-in-out' });
    },
    /** The bubbles on screen, as 'offer <id>'. */
    targets(): UiTarget[] {
      const out: UiTarget[] = [];
      for (const [id, b] of live) if (b.box.classList.contains('on')) out.push(target(`offer ${id}`, b.ball));
      return out;
    },
    reset() {
      for (const id of [...live.keys()]) remove(id, false);
    },
  };
}
