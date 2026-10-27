// A press that always ends, for touchable things that are not dragged (the wardrobe rails, buttons, the name star,
// the sound dots, the home hold). On Emma's iPad a touch release does not always reach the touched element: it lost
// the capture, or the finger lifted over another layer. A press that waits for that release never ends, and the game
// froze that way. So a press also ends on the window's release (capture phase, before anything can stop it), on a
// lost capture and on the next touch anywhere. drag.ts ends its drags the same way; press() has no shared lock.

/** How a press ended. 'up' is a release (on the element or anywhere else); the others mean the release went missing. */
export type PressEnd = 'up' | 'cancel' | 'lost' | 'other';

export interface PressOpts {
  /** The finger went down on the element. Return false to ignore this touch: no capture and no end. */
  down(e: PointerEvent): boolean | void;
  /** The finger moved. The element holds the capture, so this follows the finger anywhere on screen. */
  move?(e: PointerEvent): void;
  /**
   * The press ended, exactly once for every down that was not refused: 'up' on a release, 'cancel' on a
   * pointercancel, 'lost' when the capture went first, 'other' on a new pointerdown anywhere (then `e` is that new
   * touch, not this finger).
   */
  end(e: PointerEvent, how: PressEnd): void;
}

/** Make `el` pressable. Returns a function that removes the listeners; a press still open then gets no end. */
export function press(el: HTMLElement, o: PressOpts): () => void {
  let id: number | null = null;

  const finish = (e: PointerEvent, how: PressEnd) => {
    if (id === null) return;
    const was = id;
    id = null;
    // A new touch elsewhere: this finger may still be down, so it lets go of the element.
    if (how === 'other') release(was);
    o.end(e, how);
  };
  const release = (pointerId: number) => {
    try {
      el.releasePointerCapture(pointerId);
    } catch {
      /* not captured, or the element left the page */
    }
  };

  const down = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (o.down(e) === false) return;
    id = e.pointerId;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* the element left the page; the window still ends the press */
    }
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId === id) o.move?.(e);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId === id) finish(e, 'up');
  };
  const cancel = (e: PointerEvent) => {
    if (e.pointerId === id) finish(e, 'cancel');
  };
  const lost = (e: PointerEvent) => {
    if (e.pointerId === id) finish(e, 'lost');
  };
  // Runs in the capture phase, before the element's own pointerdown starts the next press.
  const other = (e: PointerEvent) => finish(e, 'other');

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('lostpointercapture', lost);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('pointerdown', other, true);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('lostpointercapture', lost);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', cancel, true);
    window.removeEventListener('pointerdown', other, true);
    if (id !== null) release(id);
    id = null;
  };
}
