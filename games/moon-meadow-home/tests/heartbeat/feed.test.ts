import { describe, it, expect } from 'vitest';
import { content } from '../../src/core/content/static.ts';
import { wordEntries } from '../../src/scenes/heartbeat/learn-bridge.ts';
import {
  LOOK_ALIKE, UNICORN_FOODS, foodPool, hungryDue, isUnicornFood, mangerPlan, mangerWants, rackGoalLines, rackHintLines,
  rackMissLines, rackSlots, rackSuccessLines, rackTask, trayFoods, withoutLookAlikes,
} from '../../src/core/heartbeat/feed.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Pick } from '../../src/core/planner/index.ts';

const words = wordEntries(content);
const twoOfAGroup = (list: string[]): boolean => LOOK_ALIKE.some((g) => list.filter((w) => g.includes(w)).length > 1);

describe('unicorn foods', () => {
  it('knows the allow-list', () => {
    expect(isUnicornFood('peach')).toBe(true);
    expect(isUnicornFood('burger')).toBe(false);
    expect(UNICORN_FOODS).toContain('treat');
  });
  it('keeps non-foods, plurals and look-alike word clashes out of the pool', () => {
    const pool = foodPool(words.values()).map((w) => w.word);
    for (const bad of ['tin', 'egg', 'burger', 'banquet', 'nutmeg', 'pepper', 'chip', 'snack', 'pod', 'peapod', 'peaches']) expect(pool).not.toContain(bad);
    expect(pool).toContain('peach');
    expect(pool.length).toBeGreaterThanOrEqual(20);
  });
  it('never leaves two words of one look-alike group, and keeps the target', () => {
    const pool = foodPool(words.values());
    for (let s = 1; s <= 200; s++) {
      const out = withoutLookAlikes(pool, 'cupcake', makeRng(s)).map((w) => w.word);
      expect(out).toContain('cupcake');
      expect(twoOfAGroup(out)).toBe(false);
      for (const g of ['cake', 'muffin', 'bun', 'pie']) expect(out).not.toContain(g);
    }
  });
});

describe('hungryDue', () => {
  it('follows the test flag', () => {
    expect(hungryDue({ rng: makeRng(1), forced: true, lastWasHungry: true })).toBe(true);
    expect(hungryDue({ rng: makeRng(1), forced: false, lastWasHungry: false })).toBe(false);
  });
  it('is never hungry twice in a row and about one in three', () => {
    const rng = makeRng(7);
    let last = false;
    let n = 0;
    for (let i = 0; i < 300; i++) {
      const h = hungryDue({ rng, forced: null, lastWasHungry: last });
      if (h && last) throw new Error('twice in a row');
      if (h) n++;
      last = h;
    }
    expect(n / 300).toBeGreaterThan(0.2);
    expect(n / 300).toBeLessThan(0.45);
  });
});

describe('trayFoods', () => {
  it('gives three distinct pictured foods, readable ones first, one per look-alike group', () => {
    const readable = new Set(['apple', 'carrot', 'melon', 'plum']);
    for (let s = 1; s <= 200; s++) {
      const t = trayFoods(words.values(), (w) => readable.has(w.word), makeRng(s));
      expect(t).toHaveLength(3);
      expect(new Set(t).size).toBe(3);
      expect(twoOfAGroup(t)).toBe(false);
      for (const w of t) {
        expect(isUnicornFood(w)).toBe(true);
        expect(words.get(w)!.picture).not.toBe('');
        expect(readable.has(w)).toBe(true);
      }
    }
  });
  it('fills up with other foods when fewer are readable', () => {
    const t = trayFoods(words.values(), (w) => w.word === 'peach', makeRng(3));
    expect(t).toContain('peach');
    expect(t).toHaveLength(3);
  });
});

describe('mangerWants and mangerPlan', () => {
  it('gives every door a tray food, neighbours different', () => {
    const tray = ['apple', 'carrot', 'peach'];
    const w = mangerWants([1, 2, 3, 4, 5], tray, makeRng(2));
    expect(Object.keys(w).map(Number)).toEqual([1, 2, 3, 4, 5]);
    for (const d of [1, 2, 3, 4, 5]) expect(tray).toContain(w[d]);
    for (const d of [1, 2, 3, 4]) expect(w[d]).not.toBe(w[d + 1]);
    expect(mangerWants([1], [], makeRng(1))).toEqual({});
  });
  it('plans tonight\'s checked moment', () => {
    expect(mangerPlan({ rng: makeRng(1), forced: null, wish: false, rack: false })).toBe('none');
    expect(mangerPlan({ rng: makeRng(1), forced: null, wish: true, rack: false })).toBe('wish');
    expect(mangerPlan({ rng: makeRng(1), forced: 'rack', wish: true, rack: true })).toBe('rack');
    expect(mangerPlan({ rng: makeRng(1), forced: 'wish', wish: true, rack: true })).toBe('wish');
    const rng = makeRng(5);
    let racks = 0;
    for (let i = 0; i < 400; i++) if (mangerPlan({ rng, forced: null, wish: true, rack: true }) === 'rack') racks++;
    expect(racks / 400).toBeGreaterThan(0.3);
    expect(racks / 400).toBeLessThan(0.5);
  });
});

describe('the hay rack', () => {
  const pick = (whole: number, part: number): Pick => ({
    strand: 'm', step: 'M12F', slot: 'current', moment: 'hay-rack', items: [`m:gap:${whole}-${part}`],
    carrier: { kind: 'maths', task: { op: 'missing', whole, part } }, scaffold: 2, probe: false,
  });
  it('builds a cups task from the pick', () => {
    expect(rackTask(pick(15, 9))).toMatchObject({ mode: 'cups', cups: 15, warm: 9, target: 6, stonesNeeded: 1, step: 'M12F', itemId: 'm:gap:15-9', scaffold: 2 });
    expect(rackTask(pick(5, 2))).toBeNull();
    expect(rackTask({ ...pick(10, 3), carrier: { kind: 'maths', task: { op: 'pair', a: 3, b: 7 } } })).toBeNull();
  });
  it('says the goal, the misses, the success and the hint', () => {
    const t = rackTask(pick(15, 9))!;
    expect(rackGoalLines(t)).toEqual(['num-rack-15', 'num-in-9', 'g-hay-rack']);
    expect(rackMissLines(2)).toEqual(['fb-too-many', 'num-over-2']);
    expect(rackMissLines(-3)).toEqual(['num-more-3']);
    expect(rackSuccessLines(t)).toEqual(['fb-rack-full', 'num-bond-9-6']);
    expect(rackHintLines(t)).toEqual(['h-count-gaps', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6']);
  });
  it('lays the slots out in frames of ten and shows the crossing', () => {
    const t = rackTask(pick(13, 9))!;
    const empty = rackSlots(t, null);
    expect(empty.frames.map((f) => f.length)).toEqual([10, 3]);
    expect(empty.frames[0].filter((x) => x === 0)).toHaveLength(9);
    const right = rackSlots(t, 4);
    expect(right.frames[0]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(right.frames[1]).toEqual([1, 1, 1]);
    expect(right.spill).toBe(0);
    expect(rackSlots(t, 6).spill).toBe(2);
    expect(rackSlots(rackTask(pick(8, 3))!, 2).frames).toEqual([[0, 0, 0, 1, 1, -1, -1, -1]]);
  });
});
