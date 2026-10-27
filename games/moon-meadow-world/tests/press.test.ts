// press() (src/ui/press.ts) ends exactly once on every path, also when the release never reaches the element (the
// iPad freeze). Small fake event targets stand in for the element and the window; dispatching on the window and then
// on the element is the order a real release reaches them (the window listens in the capture phase).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { press, type PressEnd } from '../src/ui/press';

type Fn = (e: PointerEvent) => void;

class FakeTarget {
  private readonly listeners: { type: string; fn: Fn; capture: boolean }[] = [];
  addEventListener(type: string, fn: Fn, capture: boolean | { capture?: boolean } = false): void {
    this.listeners.push({ type, fn, capture: typeof capture === 'boolean' ? capture : !!capture.capture });
  }
  removeEventListener(type: string, fn: Fn, capture: boolean | { capture?: boolean } = false): void {
    const c = typeof capture === 'boolean' ? capture : !!capture.capture;
    const i = this.listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === c);
    if (i >= 0) this.listeners.splice(i, 1);
  }
  get count(): number {
    return this.listeners.length;
  }
  fire(type: string, pointerId = 1, x = 0): PointerEvent {
    const e = { type, pointerId, clientX: x, clientY: 0, preventDefault() {}, stopPropagation() {} } as unknown as PointerEvent;
    for (const l of this.listeners.filter((l) => l.type === type)) l.fn(e);
    return e;
  }
}

class FakeElement extends FakeTarget {
  captured = new Set<number>();
  setPointerCapture(id: number): void {
    this.captured.add(id);
  }
  releasePointerCapture(id: number): void {
    if (!this.captured.delete(id)) throw new Error('NotFoundError');
  }
}

let win: FakeTarget;
beforeEach(() => {
  win = new FakeTarget();
  vi.stubGlobal('window', win);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(o: { refuse?: boolean } = {}) {
  const el = new FakeElement();
  const ends: PressEnd[] = [];
  const moves: number[] = [];
  let downs = 0;
  const dispose = press(el as unknown as HTMLElement, {
    down: () => {
      downs++;
      return o.refuse ? false : undefined;
    },
    move: (e) => moves.push(e.clientX),
    end: (_e, how) => ends.push(how),
  });
  /** A touch on the element: the window sees it first (capture phase), then the element. */
  const touch = (id = 1) => {
    win.fire('pointerdown', id);
    el.fire('pointerdown', id);
  };
  return { el, ends, moves, downs: () => downs, dispose, touch };
}

describe('press', () => {
  it('captures the pointer on down and ends once on a normal release', () => {
    const p = setup();
    p.touch();
    expect(p.el.captured.has(1)).toBe(true);
    win.fire('pointerup');
    p.el.fire('pointerup');
    p.el.fire('lostpointercapture');
    expect(p.ends).toEqual(['up']);
  });

  it('ends on the window pointerup when the element never gets one', () => {
    const p = setup();
    p.touch();
    win.fire('pointerup');
    expect(p.ends).toEqual(['up']);
  });

  it('ends on the element pointerup alone', () => {
    const p = setup();
    p.touch();
    p.el.fire('pointerup');
    expect(p.ends).toEqual(['up']);
  });

  it('ends on pointercancel, on the window or on the element, once', () => {
    const a = setup();
    a.touch();
    win.fire('pointercancel');
    a.el.fire('pointercancel');
    expect(a.ends).toEqual(['cancel']);
    const b = setup();
    b.touch();
    b.el.fire('pointercancel');
    expect(b.ends).toEqual(['cancel']);
  });

  it('ends on lostpointercapture with no release at all', () => {
    const p = setup();
    p.touch();
    p.el.fire('lostpointercapture');
    win.fire('pointerup');
    expect(p.ends).toEqual(['lost']);
  });

  it('ends a stale press on a new pointerdown elsewhere and lets go of the capture', () => {
    const p = setup();
    p.touch(1);
    win.fire('pointerdown', 2);
    expect(p.ends).toEqual(['other']);
    expect(p.el.captured.has(1)).toBe(false);
    win.fire('pointerup', 1);
    expect(p.ends).toEqual(['other']);
  });

  it('a new touch on the same element ends the stale press, then starts the next one', () => {
    const p = setup();
    p.touch(1);
    p.touch(1);
    expect(p.ends).toEqual(['other']);
    expect(p.downs()).toBe(2);
    win.fire('pointerup', 1);
    expect(p.ends).toEqual(['other', 'up']);
  });

  it('ignores other fingers and moves after the end', () => {
    const p = setup();
    p.touch(1);
    p.el.fire('pointermove', 1, 10);
    p.el.fire('pointermove', 2, 99);
    win.fire('pointerup', 2);
    p.el.fire('lostpointercapture', 2);
    expect(p.ends).toEqual([]);
    win.fire('pointerup', 1);
    p.el.fire('pointermove', 1, 20);
    expect(p.moves).toEqual([10]);
    expect(p.ends).toEqual(['up']);
  });

  it('gives no end for a refused down, and nothing without a down', () => {
    const p = setup({ refuse: true });
    win.fire('pointerup');
    p.touch();
    expect(p.el.captured.size).toBe(0);
    win.fire('pointerup');
    win.fire('pointerdown', 2);
    expect(p.ends).toEqual([]);
  });

  it('removes every listener, on the element and on the window', () => {
    const p = setup();
    expect(p.el.count).toBe(5);
    expect(win.count).toBe(3);
    p.touch();
    p.dispose();
    expect(p.el.count).toBe(0);
    expect(win.count).toBe(0);
    expect(p.el.captured.size).toBe(0);
    win.fire('pointerup');
    expect(p.ends).toEqual([]);
  });
});
