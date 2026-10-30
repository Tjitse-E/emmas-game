// The saddle icons over the mounts' saddles (2.4.0, docs/v4/2.4.md section 5.4; Layer.saddles): v3's saddle picture in
// a round bubble, 120 design px, floating over each saddle and following it every frame. Each acts on pointerdown
// (the offer bubble's pattern: the press is refused, so no release is awaited) and pops away; a tap on the mount in
// the world counts as its icon too (ride.ts mountTap). Targets 'saddle bella' and 'saddle hazel'.
import type { MountId, ScreenPoint } from '../contracts';
import { v3Art } from '../assets';
import { audio } from '../audio';
import { el, img, onTick, play, u } from './dom';
import { press } from './press';
import { target, type UiTarget } from './moment';

export interface Saddles {
  /** Show the icons over these points, or take them away with null. */
  set(o: { at: Record<MountId, () => ScreenPoint>; onTap(m: MountId): void } | null): void;
  /** The icons on screen, as 'saddle <mount>'. */
  targets(): UiTarget[];
}

/** The icon's size and its gap above the saddle point, in design px. */
export const SADDLE_ICON = 120;
const GAP = 8;
const MOUNTS: readonly MountId[] = ['bella', 'hazel'];

/** The middle of the icon over the saddle point `p` (the icon floats wholly above it): where the ghost taps. */
export function saddleCentre(p: ScreenPoint): ScreenPoint {
  return { ...p, y: p.y - u(SADDLE_ICON) / 2 - u(GAP) };
}

export function createSaddles(parent: HTMLElement): Saddles {
  let live: { boxes: Map<MountId, HTMLElement>; stop: () => void; dispose: (() => void)[] } | null = null;

  const remove = () => {
    if (!live) return;
    live.stop();
    for (const d of live.dispose) d();
    for (const b of live.boxes.values()) b.remove();
    live = null;
  };

  return {
    set(o) {
      remove();
      if (!o) return;
      const boxes = new Map<MountId, HTMLElement>();
      const dispose: (() => void)[] = [];
      let taken = false;
      for (const [k, m] of MOUNTS.entries()) {
        const box = el('div', 'saddle-icon', parent);
        const bob = el('div', 'saddle-bob', box);
        const ball = el('div', 'saddle-ball touch', bob);
        ball.setAttribute('aria-label', `saddle ${m}`);
        img(v3Art('words/saddle.webp'), 'saddle-pic', ball);
        bob.style.animationDelay = `${-(k * 1.4).toFixed(1)}s`;
        dispose.push(
          press(ball, {
            down: () => {
              if (taken || !box.classList.contains('on')) return false;
              taken = true;
              void audio.sfx('pop');
              void play(ball, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0.9, offset: 0.4 }, { transform: 'scale(0.2)', opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
              o.onTap(m);
              return false;
            },
            end: () => {},
          }),
        );
        boxes.set(m, box);
      }
      // Each frame: the icon's bottom sits just above its saddle point; off screen it hides.
      const place = () => {
        const s = u(SADDLE_ICON);
        for (const [m, box] of boxes) {
          const p = o.at[m]();
          box.style.transform = `translate(${(p.x - s / 2).toFixed(1)}px, ${(p.y - s - u(GAP)).toFixed(1)}px)`;
          box.classList.toggle('on', p.visible && !taken);
        }
      };
      place();
      live = { boxes, stop: onTick(place), dispose };
    },
    targets() {
      const out: UiTarget[] = [];
      if (!live) return out;
      for (const [m, box] of live.boxes) if (box.classList.contains('on')) out.push(target(`saddle ${m}`, box.querySelector('.saddle-ball')!));
      return out;
    },
  };
}
