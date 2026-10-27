// The side quests' offer bubbles (docs/v4/2.2.md 5, Layer.offer): a picture in a round bubble over a place in the
// world (the picnic rug, the hay rack), following its point every frame and bobbing gently. While the place is off
// screen the bubble waits at the screen edge in its direction. It acts on pointerdown, because it moves with the
// camera and a release could land beside it. A tapped bubble pops away by itself.
import './wardrobe.css';
import type { ScreenPoint } from '../contracts';
import { audio } from '../audio';
import { bubbleBox, edgeArrow } from './geometry';
import { el, img, onTick, play, u } from './dom';
import { press } from './press';
import { PIC } from './parts';
import { target, type UiTarget } from './moment';

export interface OfferOpts {
  pic: string;
  at: () => ScreenPoint;
  onTap(): void;
}

/** The bubble's size and the gap from its tail to the point, in design px. */
const SIZE = 132;
const TAIL = 26;

export function createOffers(parent: HTMLElement, screen: () => { w: number; h: number }) {
  const live = new Map<string, { box: HTMLElement; ball: HTMLElement; end(pop: boolean): void }>();

  const remove = (id: string, pop: boolean) => live.get(id)?.end(pop);

  const add = (id: string, o: OfferOpts) => {
    const box = el('div', 'offer', parent);
    const bob = el('div', 'offer-bob', box);
    const ball = el('div', 'offer-ball touch', bob);
    ball.setAttribute('aria-label', `offer ${id}`);
    img(o.pic, 'offer-pic', ball);
    img(PIC.sparkle, 'offer-spark', ball);
    el('span', 'offer-tail', bob);
    // Each bubble bobs on its own beat.
    bob.style.animationDelay = `${-((live.size * 1.3) % 3).toFixed(2)}s`;
    let taken = false;
    let shown = false;

    let edge = false;
    const follow = () => {
      const a = o.at();
      const scr = screen();
      const s = u(SIZE);
      const margin = u(12);
      const gap = u(10);
      // A place off screen keeps its bubble at the screen edge, in its direction and without the tail, so she can
      // always see it is waiting (a tap walks her there). The head point is set so the ball centres on that edge point.
      const out = edgeArrow(a, a.visible, scr, margin + s / 2, 0);
      const head = out ? { x: out.x, y: out.y + s / 2 + u(TAIL) + gap } : a;
      const b = bubbleBox(head, s, s + u(TAIL), scr, {
        gap,
        margin,
        topLeft: { x: 0, y: 0, w: u(160), h: u(160) },
        topRight: { x: scr.w - u(112), y: 0, w: u(112), h: u(112) },
      });
      // Never over the food basket in the bottom right corner.
      const basket = { x: scr.w - u(150), y: scr.h - u(150) };
      if (b.x + s > basket.x && b.y + s > basket.y) b.x = Math.max(margin, basket.x - s);
      box.style.transform = `translate(${b.x}px, ${b.y}px)`;
      box.style.setProperty('--tail-x', `${b.tailX}px`);
      if (!!out !== edge) {
        edge = !!out;
        box.classList.toggle('edge', edge);
      }
      const on = !taken;
      if (on !== shown) {
        shown = on;
        box.classList.toggle('on', on);
      }
    };
    follow();
    const stop = onTick(follow);

    const end = (pop: boolean) => {
      if (live.get(id)?.box !== box) return;
      live.delete(id);
      stop();
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
    live.set(id, { box, ball, end });
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
