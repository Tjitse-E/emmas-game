// Dragging for every touchable thing in the layer. On touch a copy of the thing (the flyer) lifts into the drag
// layer, grows a little and follows the finger; the original stays in place, invisible, holding the pointer
// capture. On release the moment decides: it takes the flyer (to snap, eat or dissolve it) or the flyer flies home.
import type { Point } from './geometry';
import { el, play } from './dom';

export interface Flyer {
  readonly el: HTMLElement;
  /** The flyer's centre on screen. */
  centre(): Point;
  /** Glide the flyer's centre to p (and to a scale), eased. */
  moveTo(p: Point, o?: { ms?: number; scale?: number; easing?: string; opacity?: number }): Promise<void>;
  /** Set the flyer's centre at once (following a finger or the ghost hand). */
  jump(p: Point, scale?: number): void;
  /** Fly back to the original, then show the original again. */
  home(ms?: number): Promise<void>;
  /** Remove the flyer. The original shows again unless `keepHidden`. */
  drop(o?: { keepHidden?: boolean }): void;
}

const GROW = 1.14;

/** Lift a copy of `source` into `layer` at the source's place. */
export function lift(source: HTMLElement, layer: HTMLElement): Flyer {
  const r = source.getBoundingClientRect();
  const copy = source.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  copy.classList.add('flyer');
  copy.classList.remove('lifted', 'down');
  const box = el('div', 'flyer-box', layer);
  box.style.left = `${r.left}px`;
  box.style.top = `${r.top}px`;
  box.style.width = `${r.width}px`;
  box.style.height = `${r.height}px`;
  box.appendChild(copy);
  source.classList.add('lifted');
  const home: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  let at = { ...home };
  let scale = 1;

  const transform = (p: Point, s: number) => `translate(${p.x - home.x}px, ${p.y - home.y}px) scale(${s})`;
  const set = (p: Point, s: number) => {
    at = { ...p };
    scale = s;
    box.style.transform = transform(p, s);
  };

  const f: Flyer = {
    el: box,
    centre: () => ({ ...at }),
    async moveTo(p, o = {}) {
      const from = transform(at, scale);
      const s = o.scale ?? scale;
      const fromOpacity = box.style.opacity || '1';
      set(p, s);
      const frames: Keyframe[] = [{ transform: from, opacity: fromOpacity }, { transform: transform(p, s), opacity: String(o.opacity ?? fromOpacity) }];
      if (o.opacity !== undefined) box.style.opacity = String(o.opacity);
      await play(box, frames, { duration: o.ms ?? 320, easing: o.easing ?? 'cubic-bezier(.34,1.3,.5,1)' });
    },
    jump: (p, s = scale) => set(p, s),
    async home(ms = 380) {
      await f.moveTo(home, { ms, scale: 1, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      f.drop();
    },
    drop(o = {}) {
      box.remove();
      if (!o.keepHidden) source.classList.remove('lifted');
    },
  };
  set(home, 1);
  return f;
}

export interface DragOpts {
  /** False while the thing cannot be moved (a reply plays, the moment is closing). */
  enabled?(): boolean;
  /** The finger touched it (decision time, the hint ladder). */
  onDown?(): void;
  /** A touch without a drag. */
  onTap?(): void;
  /** While dragging. */
  onMove?(p: Point): void;
  /** Released at p after a drag. Return true when the moment takes the flyer; otherwise it flies home. */
  onDrop(p: Point, f: Flyer): boolean;
}

/** Only one finger drags at a time in the whole layer. */
let active = -1;

/** Make `source` draggable into `layer`. Returns a function that removes the listeners. */
export function draggable(source: HTMLElement, layer: HTMLElement, o: DragOpts): () => void {
  let id = -1;
  let flyer: Flyer | null = null;
  let start: Point = { x: 0, y: 0 };
  let grab: Point = { x: 0, y: 0 };
  let moved = false;

  const down = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (active !== -1 || flyer || (o.enabled && !o.enabled())) return;
    active = id = e.pointerId;
    try {
      source.setPointerCapture(e.pointerId);
    } catch {
      /* the element left the page */
    }
    start = { x: e.clientX, y: e.clientY };
    moved = false;
    flyer = lift(source, layer);
    const c = flyer.centre();
    grab = { x: e.clientX - c.x, y: e.clientY - c.y };
    void flyer.moveTo(c, { ms: 140, scale: GROW });
    o.onDown?.();
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id || !flyer) return;
    if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) return;
    moved = true;
    const p = { x: e.clientX - grab.x, y: e.clientY - grab.y };
    flyer.el.getAnimations().forEach((a) => a.cancel());
    flyer.jump(p, GROW);
    o.onMove?.({ x: e.clientX, y: e.clientY });
  };
  const end = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== id || !flyer) return;
    const f = flyer;
    flyer = null;
    id = active = -1;
    if (!moved || cancelled) {
      void f.home(160);
      if (!cancelled) o.onTap?.();
      return;
    }
    const taken = o.onDrop({ x: e.clientX, y: e.clientY }, f);
    if (!taken) void f.home();
  };
  const up = (e: PointerEvent) => end(e, false);
  const cancel = (e: PointerEvent) => end(e, true);
  source.addEventListener('pointerdown', down);
  source.addEventListener('pointermove', move);
  source.addEventListener('pointerup', up);
  source.addEventListener('pointercancel', cancel);
  return () => {
    source.removeEventListener('pointerdown', down);
    source.removeEventListener('pointermove', move);
    source.removeEventListener('pointerup', up);
    source.removeEventListener('pointercancel', cancel);
    if (flyer) {
      flyer.drop();
      flyer = null;
    }
    if (id !== -1) active = -1;
    id = -1;
  };
}

/** Clear a stuck drag (reset()). */
export function releaseDrags(): void {
  active = -1;
}
