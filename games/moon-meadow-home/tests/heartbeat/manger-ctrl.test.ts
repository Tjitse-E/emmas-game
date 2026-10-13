import { describe, it, expect } from 'vitest';
import { HOME_BAND_LEFT, MangerCtrl, WISH_BUBBLE_MIN_W, bubbleBox, chooseSpot } from '../../src/scenes/feed/manger.ctrl.ts';
import { buildWish } from '../../src/core/heartbeat/wish.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { MangerSpot } from '../../src/scenes/feed/types.ts';
import { BY_WORD, get } from './words.ts';
import { fakeDeps, served } from './fakes.ts';

const spots: MangerSpot[] = [
  { baby: 'b7', order: 7, x: 300, y: 600 },
  { baby: 'b3', order: 3, x: 520, y: 400 },
  { baby: 'b4', order: 4, x: 744, y: 400 },
];
const task = (baby: string) => buildWish({
  served: served({ strand: 'r', step: 'R05', moment: 'wish', items: ['r:g:b'], carrier: { kind: 'word', word: 'bun' } }),
  baby, babyName: null, twinBaby: null, words: BY_WORD, bathPond: false, sounded: new Set(), rng: makeRng(2),
})!;

describe('the manger wish (docs/v3/next/plan.md F5)', () => {
  it('picks the first top-row manger, else the first', () => {
    expect(chooseSpot(spots)?.order).toBe(3);
    expect(chooseSpot([spots[0]])?.order).toBe(7);
    expect(chooseSpot([])).toBeNull();
  });
  it('drops on that baby\'s manger, says Not me on another, and logs at the manger', async () => {
    const f = fakeDeps({ names: ['Pip'] });
    const c = new MangerCtrl(task('b3'), spots[1], f.deps, get, 'Pip');
    const h = c.hook();
    expect(h.drop()).toBe('manger 3');
    expect(h.target()).toBe('item bun');
    await c.begin();
    expect(f.said).toEqual(['name:pip!', 'foal-hungry', 'g-hungry']);
    expect(await c.give(c.wish.answerKey()!, 4)).toBe('not-me');
    expect(f.said.at(-1)).toBe('foal-notme');
    expect(f.actions).toHaveLength(0);
    expect(await h.answer()).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.learn', baby: 'b3', payload: { place: 'manger', result: 'first' } });
    expect(f.said.slice(-3)).toEqual(['sfx:munch', 'word-bun', 'foal-yum']);
    expect(h.drop()).toBeNull();
  });
  it('counts a wrong food on the right manger as a miss', async () => {
    const f = fakeDeps();
    const c = new MangerCtrl(task('b3'), spots[1], f.deps, get, null);
    await c.begin();
    expect(await c.hook().wrong()).toBe('miss');
    await c.hook().answer();
    expect(f.actions[0].payload.result).toBe('miss');
  });
});

// Review 2026-10-13: a 284 px bubble over door 5 ran under the Home button and hid the plural 's'.
describe('the manger wish bubble (R19 one or many)', () => {
  const door = (n: number) => ({ x: 40 + ((n - 1) % 5) * 224 + 56, y: (n <= 5 ? 140 : 480) + 270 });
  it('stays in the free top band, clear of the replay and Home buttons, for every top-row door and width', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      for (const w of [WISH_BUBBLE_MIN_W, 420, 520, 640]) {
        const b = bubbleBox(door(n), w, false);
        expect(b.top, `door ${n}`).toBe(10);
        expect(b.left, `door ${n} w ${w}`).toBeGreaterThanOrEqual(224);
        expect(b.left + w, `door ${n} w ${w}`).toBeLessThanOrEqual(HOME_BAND_LEFT);
        expect(b.tail).toBeGreaterThanOrEqual(28);
        expect(b.tail).toBeLessThanOrEqual(w - 28);
      }
    }
  });
  it('points the tail at the manger when the bubble can sit over it', () => {
    const b = bubbleBox(door(3), 300, false);
    expect(b.left + b.tail).toBe(door(3).x);
  });
  it('stays on stage over a bottom-row door, with the basket drawer at the top', () => {
    for (const n of [6, 8, 10]) {
      const b = bubbleBox(door(n), 520, true);
      expect(b.top).toBe(door(n).y - 330);
      expect(b.left).toBeGreaterThanOrEqual(16);
      expect(b.left + 520).toBeLessThanOrEqual(1180 - 16);
    }
  });
  it('never starts left of the band for a word wider than the band', () => {
    expect(bubbleBox(door(5), 2000, false).left).toBe(224);
  });
});
