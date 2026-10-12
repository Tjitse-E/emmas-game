// Touch input for every scene (contracts C7): use:press, use:drag and use:dropTarget.
// Heartbeat and places use these and never their own drag code (R11).
import type { Action } from 'svelte/action';
import { DragTracker } from './drag-tracker.ts';
import { nearestTarget, type Point, type Rect } from './geometry.ts';
import { clientToStage, elementRect } from './stage.svelte.ts';
import { anim } from './timing.ts';

export type PressOptions = { onPress: (e: PointerEvent) => void; disabled?: boolean };
export type PressParam = PressOptions | ((e: PointerEvent) => void);

const normPress = (p: PressParam | undefined): PressOptions =>
  typeof p === 'function' ? { onPress: p } : p ?? { onPress: () => {} };

/** A tap: fires on pointer up inside the element (16 px slop), never on hover or click. Adds .press-down while held. */
export const press: Action<HTMLElement, PressParam> = (node, param) => {
  let opts = normPress(param);
  let down = -1;
  const release = (): void => {
    down = -1;
    node.classList.remove('press-down');
  };
  const onDown = (e: PointerEvent): void => {
    if (opts.disabled || down !== -1) return;
    e.preventDefault();
    down = e.pointerId;
    node.classList.add('press-down');
    try { node.setPointerCapture(e.pointerId); } catch { /* element gone */ }
  };
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== down) return;
    release();
    const r = node.getBoundingClientRect();
    const inside = e.clientX >= r.left - 16 && e.clientX <= r.right + 16 && e.clientY >= r.top - 16 && e.clientY <= r.bottom + 16;
    if (inside && !opts.disabled) opts.onPress(e);
  };
  const onCancel = (e: PointerEvent): void => {
    if (e.pointerId === down) release();
  };
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onCancel);
  return {
    update(p) {
      opts = normPress(p);
      if (opts.disabled && down !== -1) release();
    },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
    },
  };
};

type TargetEntry = { el: HTMLElement; accepts?: (data: unknown) => boolean };
const targets = new Map<string, TargetEntry>();

export type DropTargetOptions = { id: string; accepts?: (data: unknown) => boolean };

/** A place a dragged item can land. Ids are unique per scene; the newest node with an id wins. */
export const dropTarget: Action<HTMLElement, DropTargetOptions> = (node, param) => {
  let id = param.id;
  targets.set(id, { el: node, accepts: param.accepts });
  return {
    update(p) {
      if (targets.get(id)?.el === node) targets.delete(id);
      id = p.id;
      targets.set(id, { el: node, accepts: p.accepts });
    },
    destroy() { if (targets.get(id)?.el === node) targets.delete(id); },
  };
};

export type DropInfo<T> = { targetId: string | null; data: T; point: Point | null };

export type DragOptions<T> = {
  data: T;
  onDrop: (info: DropInfo<T>) => void;
  onTap?: () => void;
  onStart?: () => void;
  onMove?: (p: Point, overId: string | null) => void;
  threshold?: number;
  snap?: number;
  disabled?: boolean;
};

function findTarget(p: Point, data: unknown, snap: number, self: HTMLElement): string | null {
  const list: { id: string; rect: Rect }[] = [];
  for (const [id, t] of targets) {
    if (t.el === self || !t.el.isConnected) continue;
    if (t.accepts && !t.accepts(data)) continue;
    list.push({ id, rect: elementRect(t.el) });
  }
  return nearestTarget(p, list, snap);
}

/**
 * Drag with a 6 px threshold. The node follows the finger with `translate` (stage units).
 * On a target the translate is cleared at once and the scene moves the item in its own state.
 * With no target the node glides back in 250 ms, then onDrop runs with targetId null.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const drag: Action<HTMLElement, DragOptions<any>> = (node, param) => {
  let o = param;
  let tracker = new DragTracker(o.threshold ?? 6);
  const pt = (e: PointerEvent): Point => clientToStage(e.clientX, e.clientY);

  async function finish(targetId: string | null, p: Point | null): Promise<void> {
    node.classList.remove('dragging');
    if (targetId) {
      node.style.translate = '';
      o.onDrop({ targetId, data: o.data, point: p });
      return;
    }
    const from = node.style.translate || '0px 0px';
    await anim(node, [{ translate: from }, { translate: '0px 0px' }], { duration: 250, easing: 'ease-out' });
    node.style.translate = '';
    o.onDrop({ targetId: null, data: o.data, point: p });
  }

  const onDown = (e: PointerEvent): void => {
    if (o.disabled) return;
    e.preventDefault();
    const p = pt(e);
    tracker.down(e.pointerId, p.x, p.y);
    try { node.setPointerCapture(e.pointerId); } catch { /* element gone */ }
  };
  const onMove = (e: PointerEvent): void => {
    const p = pt(e);
    const r = tracker.move(e.pointerId, p.x, p.y);
    if (r.kind !== 'move') return;
    if (r.first) { node.classList.add('dragging'); o.onStart?.(); }
    node.style.translate = `${r.dx}px ${r.dy}px`;
    o.onMove?.(p, findTarget(p, o.data, o.snap ?? 48, node));
  };
  const onUp = (e: PointerEvent): void => {
    const p = pt(e);
    const r = tracker.up(e.pointerId, p.x, p.y);
    if (r.kind === 'tap') o.onTap?.();
    else if (r.kind === 'drop') void finish(findTarget(p, o.data, o.snap ?? 48, node), p);
  };
  const onCancel = (e: PointerEvent): void => {
    if (tracker.cancel(e.pointerId).kind !== 'cancel') return;
    if (node.classList.contains('dragging')) void finish(null, null);   // a drag was under way: glide back
  };

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onCancel);
  return {
    update(p) {
      if ((p.threshold ?? 6) !== (o.threshold ?? 6) && tracker.phase === 'idle') tracker = new DragTracker(p.threshold ?? 6);
      o = p;
    },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
    },
  };
};
