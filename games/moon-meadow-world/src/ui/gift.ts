// The gift picker (docs/v4/2.3.md sections 5 and 16): after a quest, one or two big cards with a gift each. Elizabeth
// says "Pick one present!" first. A card acts on pointerdown; the other card fades, the chosen one pops with the
// gift-paper effect and its sparkles fly to `to` (Princess Emma on screen, who puts it on and keeps it), and the
// picker resolves with it once they have landed. Never a checked moment: no result, no hint ladder, nothing is wrong.
// If she waits, the line comes again, and after that the ghost hand shows a tap on a card.
import type { GiftItem, Layer } from '../contracts';
import { audio } from '../audio';
import type { Ghost } from './ghost';
import { giftCards } from './geometry';
import { centreOf, el, html, img, play, sleep } from './dom';
import { press } from './press';
import { PIC } from './parts';
import { target, type UiTarget } from './moment';
import { giftSwatch } from './swatches';

export type GiftOpts = Parameters<Layer['gift']>[0];

export interface GiftHandle {
  targets(): UiTarget[];
  /** Run the next idle step now (say the line again, then the ghost tap). False when there is none. */
  idleNow(): boolean;
  /** Remove it at once (a reset). The promise stays pending. */
  close(): void;
}

/** The cards pop in over this long; they take touches after it. */
const IN_MS = 420;
/** Without a pick the line comes again after this long, then the ghost taps a card. */
const AGAIN_MS = 12000;
const GHOST_MS = 24000;
/** The sparkles' flight to her. */
const FLY_MS = 900;

/** The wrapped present round the gift's picture: a card with a ribbon and a bow on top. */
const CARD_BOW =
  '<svg viewBox="0 0 100 50" aria-hidden="true"><path d="M50 40 C38 14 14 12 18 30 C20 40 36 42 50 40 C64 42 80 40 82 30 C86 12 62 14 50 40 Z" fill="#ff8fbd" stroke="#d9466f" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="40" r="7" fill="#ffb7d8" stroke="#d9466f" stroke-width="3"/></svg>';

export function runGift(ctx: { parent: HTMLElement; ghost: Ghost; screen(): { w: number; h: number } }, o: GiftOpts, setOpen: (h: GiftHandle | null) => void): Promise<GiftItem> {
  // No picker when every set is full (17.2): a call without items is the caller's mistake, so it fails at once
  // instead of waiting forever with nothing on screen.
  if (!o.items.length) return Promise.reject(new Error('layer.gift: no items to pick (no picker when every set is full)'));
  return new Promise((resolve) => {
    let alive = true;
    let picked = false;
    let inputOn = false;
    const undo: (() => void)[] = [];
    const root = el('div', 'gift', ctx.parent);
    undo.push(() => root.remove());
    const boxes = giftCards(ctx.screen().w, ctx.screen().h, o.items.length);
    const cards = o.items.map((item, i) => {
      const card = el('div', 'gift-card touch', root);
      card.setAttribute('aria-label', `gift ${item.id}`);
      const b = boxes[i];
      card.style.left = `${b.x}px`;
      card.style.top = `${b.y}px`;
      card.style.width = `${b.w}px`;
      card.style.height = `${b.h}px`;
      card.style.animationDelay = `${i * 90}ms`;
      el('div', 'gift-band', card);
      html(giftSwatch(item, o.look), 'gift-pic', card);
      html(CARD_BOW, 'gift-bow', card);
      return card;
    });

    const close = () => {
      if (!alive) return;
      alive = false;
      ctx.ghost.hide();
      for (const fn of undo.splice(0).reverse()) fn();
    };

    /** Sparkles from the card to her; resolves when they have landed. */
    const fly = async (from: HTMLElement) => {
      const a = centreOf(from);
      const to = o.to();
      const end = to.visible ? to : { x: ctx.screen().w * 0.3, y: ctx.screen().h * 0.5 };
      const flights: Promise<void>[] = [];
      for (let i = 0; i < 9; i++) {
        const s = img(PIC.sparkle, 'gift-spark', root);
        s.style.left = `${a.x}px`;
        s.style.top = `${a.y}px`;
        const dx = end.x - a.x;
        const dy = end.y - a.y;
        const arc = -60 - (i % 3) * 30;
        const wob = (i - 4) * 14;
        flights.push(play(s, [
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
          { transform: `translate(calc(-50% + ${(dx * 0.45 + wob).toFixed(1)}px), calc(-50% + ${(dy * 0.45 + arc).toFixed(1)}px)) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(0.5)`, opacity: 0 },
        ], { duration: FLY_MS, delay: i * 40, easing: 'ease-in-out', fill: 'both' }));
      }
      await Promise.all(flights);
    };

    const pick = async (i: number) => {
      picked = true;
      inputOn = false;
      ctx.ghost.hide();
      const card = cards[i];
      // Her pick cuts the line, so the paper sounds on its own and never under Elizabeth. The speech count drops only
      // once stop()'s promises settle (microtasks), and fx() skips an effect while it is up, so the paper waits a task.
      audio.stop();
      setTimeout(() => {
        if (alive) void audio.fx('gift-paper');
      }, 0);
      card.classList.add('chosen');
      cards.forEach((c, j) => j !== i && c.classList.add('other'));
      await play(card, [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.4 }, { transform: 'scale(0.92)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
      if (!alive) return;
      await fly(card);
      if (!alive) return;
      resolve(o.items[i]);
      root.classList.add('leaving');
      await sleep(300);
      // A reset or the next picker closed this one meanwhile: the handle the layer holds is no longer ours.
      if (!alive) return;
      close();
      setOpen(null);
    };
    cards.forEach((card, i) => {
      undo.push(press(card, {
        down: () => {
          if (!inputOn || picked) return false;
          void pick(i);
          return false;
        },
        end: () => {},
      }));
    });

    // ---- waiting: the line again, then the ghost hand taps the first card
    let shown = performance.now();
    let step = 0;
    const idle = (now: boolean): boolean => {
      if (!inputOn || picked) return false;
      const quiet = performance.now() - shown;
      if (step === 0 && (now || quiet >= AGAIN_MS)) {
        step = 1;
        void audio.sayAll(o.clips);
        return true;
      }
      if (step === 1 && (now || quiet >= GHOST_MS)) {
        step = 2;
        void ctx.ghost.tap(() => ({ ...centreOf(cards[0]), visible: true }));
        return true;
      }
      return false;
    };
    const timer = setInterval(() => void idle(false), 250);
    undo.push(() => clearInterval(timer));

    setOpen({
      targets: () => (inputOn ? cards.map((c, i) => target(`gift ${o.items[i].id}`, c)) : []),
      idleNow: () => idle(true),
      close,
    });

    void (async () => {
      void audio.sayAll(o.clips);
      await sleep(IN_MS + (cards.length - 1) * 90);
      if (!alive) return;
      inputOn = true;
      shown = performance.now();
    })();
  });
}
