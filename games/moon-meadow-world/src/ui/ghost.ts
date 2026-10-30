// The ghost hand (v3 spec 2.11 rule 6): v3's translucent hand picture shows a tap or a drag. Points are getters,
// so it follows a moving baby. Any touch by Emma hides it at once; a running demonstration then resolves early.
import type { ScreenPoint } from '../contracts';
import { v3Art } from '../assets';
import { easeInOut, lerp, type Point } from './geometry';
import type { Flyer } from './drag';
import { el, img, onTick, u } from './dom';

/** The touch point of the hand picture (the soft circle under the fingertip), as a fraction of its size. */
const HOT = { x: 0.36, y: 0.79 };
const SIZE = 128;
/** The first hub's glide: this long to each bubble (2.4.0). */
const GLIDE_MS = 900;

export interface Ghost {
  tap(at: () => ScreenPoint, times?: number): Promise<void>;
  /**
   * A drag from a to b. `fraction` stops part of the way (a gesture demo that must not finish); `carry` moves with the
   * hand, and `follow` gets the hand's point each frame while it drags (the star slider). With either, the drag is
   * part of an answer, so it also starts while a finger is down. `ms` is how long the move takes (1 s).
   */
  drag(from: () => Point, to: () => Point, o?: { fraction?: number; carry?: Flyer; follow?(p: Point): void; ms?: number }): Promise<void>;
  /** The open hand glides over each point in turn, without a press (2.4.0: the first hub's bubbles). */
  glide(points: (() => Point)[]): Promise<void>;
  hide(): void;
  readonly visible: boolean;
}

export function createGhost(layer: HTMLElement): Ghost {
  const hand = el('div', 'ghost', layer);
  img(v3Art('ui/ui-ghost-hand.webp'), '', hand);
  let token = 0;
  let visible = false;
  /** Fingers on the screen now: a demonstration never starts under a finger. */
  const down = new Set<number>();

  const place = (p: Point, pressed: boolean) => {
    const s = u(SIZE);
    hand.style.transform = `translate(${p.x - s * HOT.x}px, ${p.y - s * HOT.y}px)`;
    hand.classList.toggle('pressed', pressed);
  };
  const show = (on: boolean) => {
    visible = on;
    hand.classList.toggle('on', on);
  };

  /** Animate over ms, calling step(t) each frame with eased t. Resolves false when hidden on the way. */
  const run = (ms: number, mine: number, step: (t: number) => void): Promise<boolean> =>
    new Promise((resolve) => {
      const t0 = performance.now();
      const stop = onTick(() => {
        if (mine !== token) {
          stop();
          resolve(false);
          return;
        }
        const t = Math.min(1, (performance.now() - t0) / ms);
        step(t);
        if (t >= 1) {
          stop();
          resolve(true);
        }
      });
    });

  const g: Ghost = {
    get visible() {
      return visible;
    },
    async tap(at, times = 2) {
      if (down.size) return;
      const mine = ++token;
      const p = () => at();
      const start = () => ({ x: p().x + u(70), y: p().y + u(100) });
      show(true);
      if (!(await run(600, mine, (t) => { const s = start(); const e = p(); const k = easeInOut(t); place({ x: lerp(s.x, e.x, k), y: lerp(s.y, e.y, k) }, false); }))) return;
      for (let i = 0; i < times; i++) {
        if (!(await run(180, mine, () => place(p(), true)))) return;
        if (!(await run(420, mine, () => place(p(), false)))) return;
      }
      show(false);
    },
    async drag(from, to, o = {}) {
      if (down.size && !o.carry && !o.follow) return;
      const mine = ++token;
      const f = Math.max(0, Math.min(1, o.fraction ?? 1));
      const at = (t: number): Point => { const a = from(); const b = to(); const k = easeInOut(t) * f; return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }; };
      place(from(), false);
      show(true);
      if (!(await run(320, mine, () => place(from(), false)))) return;
      if (!(await run(200, mine, () => place(from(), true)))) return;
      if (!(await run(o.ms ?? 1000, mine, (t) => { const p = at(t); place(p, true); o.carry?.jump(p); o.follow?.(p); }))) return;
      if (!(await run(380, mine, () => place(at(1), false)))) return;
      show(false);
    },
    // 2.4.0, the first hub ever: the open hand glides from bubble to bubble, 900 ms each, without a press, so she
    // sees there is more than one. Never under a finger; her touch ends it early, as every demonstration.
    async glide(points) {
      if (down.size || !points.length) return;
      const mine = ++token;
      const off = (p: Point): Point => ({ x: p.x + u(30), y: p.y + u(40) });
      let from = off(points[0]());
      place(from, false);
      show(true);
      for (const at of points) {
        const start = from;
        if (!(await run(GLIDE_MS, mine, (t) => { const e = off(at()); const k = easeInOut(t); place({ x: lerp(start.x, e.x, k), y: lerp(start.y, e.y, k) }, false); }))) return;
        from = off(at());
      }
      if (!(await run(300, mine, () => place(from, false)))) return;
      show(false);
    },
    hide() {
      token++;
      show(false);
    },
  };

  // Any touch of hers ends a demonstration at once (v3 GhostHand).
  document.addEventListener('pointerdown', (e) => {
    down.add(e.pointerId);
    if (visible) g.hide();
  }, true);
  const up = (e: PointerEvent) => down.delete(e.pointerId);
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', up, true);
  return g;
}
