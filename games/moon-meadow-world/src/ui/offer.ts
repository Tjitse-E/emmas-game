// The side quests' offer bubbles (docs/v4/2.2.md 5, Layer.offer): a picture in a round bubble over a place in the
// world (the picnic rug, the hay rack), following its point every frame and bobbing gently. It acts on pointerdown,
// because it moves with the camera and a release could land beside it. A tapped bubble pops away by itself.
import './wardrobe.css';
import type { ScreenPoint } from '../contracts';
import { audio } from '../audio';
import { bubbleBox } from './geometry';
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

    const follow = () => {
      const a = o.at();
      const scr = screen();
      const s = u(SIZE);
      const b = bubbleBox(a, s, s + u(TAIL), scr, {
        gap: u(10),
        margin: u(12),
        topLeft: { x: 0, y: 0, w: u(160), h: u(160) },
        topRight: { x: scr.w - u(112), y: 0, w: u(112), h: u(112) },
      });
      box.style.transform = `translate(${b.x}px, ${b.y}px)`;
      box.style.setProperty('--tail-x', `${b.tailX}px`);
      const on = a.visible && !taken;
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
