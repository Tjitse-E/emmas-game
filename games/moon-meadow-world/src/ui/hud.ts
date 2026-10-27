// The free parts of the layer: name tags over unicorns, the food basket of free play, the home button and the
// perf box. Nothing here is checked.
import type { ScreenPoint, WishItem } from '../contracts';
import { audio } from '../audio';
import { menuUrl } from './geometry';
import { draggable } from './drag';
import { el, html, img, onPress, onTick, play, sleep } from './dom';
import { press } from './press';
import { CROWN_SVG, PIC } from './parts';

/** A printed name with a small crown over its capital (v3 NameTag). */
export function namePill(name: string, cls = ''): HTMLElement {
  const p = el('div', `name-pill ${cls}`);
  p.setAttribute('aria-label', `name ${name}`);
  const cap = html(CROWN_SVG, 'cap', p, 'span');
  cap.append(name.charAt(0));
  p.append(name.slice(1));
  return p;
}

export function createTags(parent: HTMLElement) {
  const live = new Set<() => void>();
  return {
    show(name: string, at: () => ScreenPoint, ms = 2500) {
      const p = namePill(name, 'tag');
      parent.appendChild(p);
      const follow = () => {
        const a = at();
        p.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -100%)`;
        p.style.visibility = a.visible ? 'visible' : 'hidden';
      };
      follow();
      const stop = onTick(follow);
      const end = () => {
        stop();
        p.remove();
        live.delete(end);
      };
      live.add(end);
      void (async () => {
        await sleep(ms);
        if (!live.has(end)) return;
        await play(p, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
        end();
      })();
    },
    reset() {
      for (const end of [...live]) end();
    },
  };
}

export interface FoodBasketOpts {
  show: boolean;
  foods?: WishItem[];
  drop?(item: WishItem, x: number, y: number): boolean;
}

/** Free play: a basket button bottom right opens a tray of foods; tap one to hear it, drag it to any unicorn. */
export function createFoodBasket(parent: HTMLElement, dragLayer: HTMLElement) {
  const btn = el('div', 'food-btn touch', parent);
  btn.setAttribute('aria-label', 'food basket');
  img(PIC.basket, '', btn);
  const tray = el('div', 'food-tray', parent);
  let opts: FoodBasketOpts = { show: false };
  let detach: (() => void)[] = [];
  let open = false;

  const setOpen = (on: boolean) => {
    open = on;
    tray.classList.toggle('open', on);
    btn.classList.toggle('open', on);
  };
  onPress(btn, () => {
    void audio.sfx('pop');
    setOpen(!open);
  });

  const build = (foods: WishItem[]) => {
    detach.forEach((d) => d());
    detach = [];
    tray.innerHTML = '';
    for (const f of foods) {
      const cell = el('div', 'food touch', tray);
      cell.setAttribute('aria-label', `food ${f.word}`);
      img(f.pic, 'food-pic', cell);
      el('span', 'food-word', cell).textContent = f.word.toLowerCase();
      detach.push(draggable(cell, dragLayer, {
        // Free play may say names: a tap says the food's word.
        onTap: () => void audio.say(f.clip),
        onDrop: (p, fl) => {
          if (!opts.drop?.(f, p.x, p.y)) return false;
          void (async () => {
            await fl.moveTo(p, { ms: 520, scale: 0.15, opacity: 0, easing: 'ease-in' });
            fl.drop({ keepHidden: true });
            await sleep(500);
            cell.classList.remove('lifted');
            void play(cell, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' });
          })();
          return true;
        },
      }));
    }
  };

  return {
    set(o: FoodBasketOpts) {
      const foods = o.foods ?? opts.foods ?? [];
      const changed = o.foods !== undefined && o.foods !== opts.foods;
      opts = { ...opts, ...o, foods };
      if (changed) build(foods);
      btn.classList.toggle('on', o.show);
      if (!o.show) setOpen(false);
    },
    reset() {
      opts = { show: false, foods: opts.foods };
      btn.classList.remove('on');
      setOpen(false);
    },
  };
}

/** How long the home button must be held before the demo leaves (the level keeps no save, so a stray tap must not). */
export const HOME_HOLD_MS = 1000;
/** The hold ring's circle: radius in its 100 x 100 view box, and its length. */
const RING_R = 46;
const RING_LEN = 2 * Math.PI * RING_R;

/**
 * The round home button (shared/home.js): goes to the picture menu after a press and hold of about 1 s, while a ring
 * fills around it. A quick tap only wiggles it, and a finger that slides off lets go. The hold runs only while the
 * press is open: press() ends it on a release anywhere (the window hears it too), a cancel, a lost capture or another
 * touch, so a release that misses the button on Emma's iPad cancels the hold instead of letting it finish by itself.
 */
export function createHome(parent: HTMLElement): HTMLElement {
  const b = html(
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 L44 23 L38 23 L38 42 L10 42 L10 23 L4 23 Z" fill="#ff8fc7" stroke="#c2468a" stroke-width="3" stroke-linejoin="round"/><rect x="19" y="28" width="10" height="14" rx="3" fill="#fff6dd" stroke="#c2468a" stroke-width="2.5"/><circle cx="24" cy="19" r="3.2" fill="#ffd25e"/></svg>' +
      `<svg class="home-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="${RING_R}"/><circle class="fill" cx="50" cy="50" r="${RING_R}" stroke-dasharray="${RING_LEN.toFixed(2)}" stroke-dashoffset="${RING_LEN.toFixed(2)}"/></svg>`,
    'home touch',
    parent,
  );
  b.setAttribute('aria-label', 'Home');
  const ring = b.querySelector('.home-ring .fill') as SVGCircleElement;
  const fillTo = (k: number) => ring.setAttribute('stroke-dashoffset', (RING_LEN * (1 - k)).toFixed(2));
  let t0 = 0;
  let from = { x: 0, y: 0 };
  let stop: (() => void) | null = null;
  let holding = false;
  let left = false;

  /** The finger let go early (a wiggle after a tap), slid off or went missing: the ring empties again. */
  const letGo = (wiggle: boolean) => {
    if (!holding) return;
    holding = false;
    stop?.();
    stop = null;
    b.classList.remove('down', 'holding');
    fillTo(0);
    if (wiggle) void play(b, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], { duration: 420, easing: 'ease-in-out' });
  };
  press(b, {
    down: (e) => {
      if (left) return false;
      holding = true;
      t0 = performance.now();
      from = { x: e.clientX, y: e.clientY };
      b.classList.add('down', 'holding');
      stop = onTick(() => {
        const k = Math.min(1, (performance.now() - t0) / HOME_HOLD_MS);
        fillTo(k);
        if (k < 1 || !holding) return;
        stop?.();
        stop = null;
        left = true;
        audio.stop();
        location.href = menuUrl(location.pathname);
      });
    },
    move: (e) => {
      if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > 40) letGo(false);
    },
    // Every end lets go; only a release is a tap that wiggles.
    end: (_e, how) => letGo(how === 'up'),
  });
  return b;
}
