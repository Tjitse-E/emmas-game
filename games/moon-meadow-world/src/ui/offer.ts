// The side quests' offer bubbles (docs/v4/2.2.md 5, Layer.offer): a picture in a round bubble over a place in the
// world (the picnic rug, the hay rack), following its point every frame and bobbing gently. While the place is off
// screen the bubble waits at the screen edge in its direction. It acts on pointerdown, because it moves with the
// camera and a release could land beside it. A tapped bubble pops away by itself. 2.3: a quest bubble can carry a
// badge on its rim, the picture of a gift that quest can still give (swatches.ts giftSwatchUrl), so the prize shows
// without reading (docs/v4/2.3.md section 17.2). 2.3.0's last pass: bubbles never cover each other (a later one moves
// along the screen edge it waits at, or up), and never Princess Emma (layer.keepClear): one that would goes above her.
import './wardrobe.css';
import type { ScreenPoint } from '../contracts';
import { audio } from '../audio';
import { apart, bubbleBox, clearOf, edgeArrow, type Box } from './geometry';
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
    wordPicEl({ pic: o.pic, tint: o.tint }, 'offer-pic', ball);
    img(PIC.sparkle, 'offer-spark', ball);
    if (o.badge) img(o.badge, 'offer-badge-pic', el('div', 'offer-badge', ball));
    el('span', 'offer-tail', bob);
    // Each bubble bobs on its own beat.
    bob.style.animationDelay = `${-((live.size * 1.3) % 3).toFixed(2)}s`;
    let taken = false;
    let shown = false;

    let edge = false;
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
      // A place off screen keeps its bubble at the screen edge, in its direction and without the tail, so she can
      // always see it is waiting (a tap walks her there). The head point is set so the ball centres on that edge point.
      const out = edgeArrow(a, a.visible, scr, margin + s / 2, 0);
      const head = out ? { x: out.x, y: out.y + s / 2 + u(TAIL) + gap } : a;
      let b = bubbleBox(head, s, h, scr, corners);
      // Never over her: above her head instead (after the Corner she stands beside the picnic rug).
      if (!out) b = clearOf(b, head, s, h, her, scr, corners);
      // Never over the food basket in the bottom right corner.
      const basket = { x: scr.w - u(150), y: scr.h - u(150) };
      const x = b.x + s > basket.x && b.y + s > basket.y ? Math.max(margin, basket.x - s) : b.x;
      // Never over a bubble placed before it: along the edge it waits at, or up when it is on screen.
      const side = !!out && (Math.abs(out.x - (margin + s / 2)) < 1 || Math.abs(out.x - (scr.w - margin - s / 2)) < 1);
      const r = apart({ x, y: b.y, w: s, h }, placed, scr, { gap, margin, along: out ? (side ? 'y' : 'x') : 'up' });
      box.style.transform = `translate(${r.x}px, ${r.y}px)`;
      box.style.setProperty('--tail-x', `${Math.max(s * 0.18, Math.min(s * 0.82, head.x - r.x))}px`);
      if (!!out !== edge) {
        edge = !!out;
        box.classList.toggle('edge', edge);
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
