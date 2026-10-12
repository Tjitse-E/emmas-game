import { pastThreshold } from './geometry.ts';

export type DragPhase = 'idle' | 'pressed' | 'dragging';
export type MoveResult = { kind: 'none' } | { kind: 'move'; dx: number; dy: number; first: boolean };
export type UpResult = { kind: 'none' } | { kind: 'tap' } | { kind: 'drop'; dx: number; dy: number };
export type CancelResult = { kind: 'none' } | { kind: 'cancel' };

/**
 * One press on one element. Coordinates are stage units. Only the first pointer counts:
 * a second finger is ignored, and a pointercancel (rotation, system gesture) ends the press.
 */
export class DragTracker {
  phase: DragPhase = 'idle';
  #id = -1;
  #sx = 0;
  #sy = 0;
  #threshold: number;

  constructor(threshold = 6) {
    this.#threshold = threshold;
  }

  down(id: number, x: number, y: number): void {
    if (this.phase !== 'idle') return;
    this.phase = 'pressed';
    this.#id = id;
    this.#sx = x;
    this.#sy = y;
  }

  move(id: number, x: number, y: number): MoveResult {
    if (this.phase === 'idle' || id !== this.#id) return { kind: 'none' };
    const dx = x - this.#sx;
    const dy = y - this.#sy;
    if (this.phase === 'pressed') {
      if (!pastThreshold(dx, dy, this.#threshold)) return { kind: 'none' };
      this.phase = 'dragging';
      return { kind: 'move', dx, dy, first: true };
    }
    return { kind: 'move', dx, dy, first: false };
  }

  up(id: number, x: number, y: number): UpResult {
    if (this.phase === 'idle' || id !== this.#id) return { kind: 'none' };
    const was = this.phase;
    this.phase = 'idle';
    this.#id = -1;
    return was === 'dragging' ? { kind: 'drop', dx: x - this.#sx, dy: y - this.#sy } : { kind: 'tap' };
  }

  cancel(id: number): CancelResult {
    if (this.phase === 'idle' || id !== this.#id) return { kind: 'none' };
    this.phase = 'idle';
    this.#id = -1;
    return { kind: 'cancel' };
  }
}
