import { describe, it, expect } from 'vitest';
import { DragTracker } from '../../src/platform/drag-tracker.ts';

describe('DragTracker', () => {
  it('a small wobble is still a tap', () => {
    const t = new DragTracker(6);
    t.down(1, 100, 100);
    expect(t.move(1, 103, 104)).toEqual({ kind: 'none' });
    expect(t.up(1, 103, 104)).toEqual({ kind: 'tap' });
    expect(t.phase).toBe('idle');
  });
  it('a move past the threshold is a drag and ends in a drop', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    expect(t.move(1, 10, 0)).toEqual({ kind: 'move', dx: 10, dy: 0, first: true });
    expect(t.move(1, 20, 5)).toEqual({ kind: 'move', dx: 20, dy: 5, first: false });
    expect(t.move(1, 2, 1)).toEqual({ kind: 'move', dx: 2, dy: 1, first: false });
    expect(t.up(1, 2, 1)).toEqual({ kind: 'drop', dx: 2, dy: 1 });
    expect(t.phase).toBe('idle');
  });
  it('ignores a second finger', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    t.down(2, 50, 50);
    expect(t.move(2, 90, 90)).toEqual({ kind: 'none' });
    expect(t.up(2, 90, 90)).toEqual({ kind: 'none' });
    expect(t.phase).toBe('pressed');
  });
  it('a cancel (rotation, system gesture) ends the drag', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    t.move(1, 30, 0);
    expect(t.cancel(2)).toEqual({ kind: 'none' });
    expect(t.cancel(1)).toEqual({ kind: 'cancel' });
    expect(t.phase).toBe('idle');
    expect(t.up(1, 30, 0)).toEqual({ kind: 'none' });
  });
  it('a new press works after a cancel', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    t.cancel(1);
    t.down(3, 10, 10);
    expect(t.up(3, 10, 10)).toEqual({ kind: 'tap' });
  });
});
