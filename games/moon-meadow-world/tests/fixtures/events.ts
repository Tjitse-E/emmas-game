// Small fake event targets for touch tests in node: they stand in for an element, the window and the document. A
// fired event carries a pointer id and a point; listeners run in the order they were added.
type Fn = (e: PointerEvent) => void;

export class FakeTarget {
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
  fire(type: string, pointerId = 1, x = 0, y = 0): PointerEvent {
    const e = { type, pointerId, clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} } as unknown as PointerEvent;
    for (const l of this.listeners.filter((l) => l.type === type)) l.fn(e);
    return e;
  }
}

export class FakeElement extends FakeTarget {
  captured = new Set<number>();
  setPointerCapture(id: number): void {
    this.captured.add(id);
  }
  releasePointerCapture(id: number): void {
    if (!this.captured.delete(id)) throw new Error('NotFoundError');
  }
}
