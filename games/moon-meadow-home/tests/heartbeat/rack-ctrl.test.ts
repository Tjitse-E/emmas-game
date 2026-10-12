import { describe, it, expect } from 'vitest';
import { RackCtrl } from '../../src/scenes/feed/rack.ctrl.ts';
import { fakeDeps, served } from './fakes.ts';

const rack = (whole: number, part: number) =>
  served({ step: 'M12F', moment: 'hay-rack', items: [`m:gap:${whole}-${part}`], carrier: { kind: 'maths', task: { op: 'missing', whole, part } } });

describe('RackCtrl (docs/v3/next/plan.md F5)', () => {
  it('says the goal, judges a pile that is too big, then fills the rack', async () => {
    const f = fakeDeps();
    const c = new RackCtrl(rack(13, 9), f.deps);
    expect(c.task).toMatchObject({ cups: 13, warm: 9, target: 4 });
    expect(c.choices.some((x) => x.value === 4)).toBe(true);
    expect(c.choices.every((x) => x.value >= 1 && x.value <= 9)).toBe(true);
    await c.begin();
    expect(f.said).toEqual(['num-rack-13', 'num-in-9', 'g-hay-rack']);
    const six = c.choices.find((x) => x.value === 6) ?? null;
    const wrong = six ?? c.choices.find((x) => x.value > 4)!;
    expect(await c.place(wrong.id)).toBe('miss');
    expect(f.said.slice(3)).toEqual(['fb-too-many', `num-over-${wrong.value - 4}`]);
    expect(f.actions).toHaveLength(0);
    expect(c.view().filled).toBeNull();
    expect(c.hook().target()).toBe('hay 4');
    expect(c.hook().drop()).toBe('hay rack');
    expect(await c.place(c.answerId()!)).toBe('solved');
    expect(f.said.slice(-2)).toEqual(['fb-rack-full', 'num-bond-9-4']);
    expect(f.actions).toHaveLength(1);
    expect(f.actions[0]).toMatchObject({ type: 'hb.learn', baby: null, payload: { strand: 'm', moment: 'hay-rack', place: 'manger', result: 'miss', items: [{ id: 'm:gap:13-9', r: 'miss' }] } });
    expect(c.hook().target()).toBeNull();
    expect(await c.place(c.answerId()!)).toBe('ignored');
  });
  it('says how many more when the pile is too small, and logs a first answer as first', async () => {
    const f = fakeDeps();
    const c = new RackCtrl(rack(15, 9), f.deps);
    await c.begin();
    const small = c.choices.find((x) => x.value < 6)!;
    expect(await c.place(small.id)).toBe('miss');
    expect(f.said.at(-1)).toBe(`num-more-${6 - small.value}`);
    const g = fakeDeps();
    const d = new RackCtrl(rack(15, 9), g.deps);
    await d.begin();
    await d.hook().answer();
    expect(g.actions[0].payload).toMatchObject({ result: 'first', error: null });
  });
  it('refuses a pick that is not a hay-rack task', () => {
    expect(() => new RackCtrl(served({ items: ['m:pair:3+7'], carrier: { kind: 'maths', task: { op: 'pair', a: 3, b: 7 } } }), fakeDeps().deps)).toThrow();
  });
});
