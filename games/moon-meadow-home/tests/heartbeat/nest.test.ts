import { describe, it, expect } from 'vitest';
import { NestCtrl, freeEgg } from '../../src/scenes/heartbeat/nest.ctrl.ts';
import { fakeDeps, served } from './fakes.ts';
import type { StoneSpec } from '../../src/core/maths/stones.ts';

/** Replaces the planned tray with a hand-built one (values in order). */
function tray(c: NestCtrl, values: number[]): StoneSpec[] {
  const stones = values.map((value, i): StoneSpec => ({ id: `stone-${i + 1}`, value, face: 'dots', layout: 'dice', tint: 0 }));
  (c as unknown as { stones: StoneSpec[] }).stones = stones;
  return stones;
}
const pair = (a: number, b: number, step = 'M12E') =>
  served({ step, moment: 'egg-two-stone', items: [`m:pair:${a}+${b}`], carrier: { kind: 'maths', task: { op: 'pair', a, b } } });

/** The hint ladder as src/ui/moment.ts runs it: the second miss starts the ghost answer and does not wait for it. */
function ladder(f: ReturnType<typeof fakeDeps>): void {
  const miss = f.deps.hints.miss;
  let n = 0;
  f.deps.hints.miss = async () => { await miss(); if (++n === 2) void f.goal()!.answer(); };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

const opts = { golden: false, speckled: false, firstEver: false };
const m09 = () => served({ step: 'M09', moment: 'egg-moon', items: ['m:miss:10-3'] });
const m10 = () => served({ step: 'M10', moment: 'egg-two-stone', items: ['m:pair:3+7'], carrier: { kind: 'maths', task: { op: 'pair', a: 3, b: 7 } } });

describe('NestCtrl', () => {
  it('hatches on a first try and logs the result with the hatch', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(m09(), f.deps, opts);
    await c.begin();
    expect(f.said).toEqual(['num-egg-10', 'num-warm-3', 'g-egg']);
    expect(await c.place(c.answerIds()[0])).toBe('solved');
    expect(f.actions).toHaveLength(1);
    const a = f.actions[0];
    expect(a).toMatchObject({ type: 'hb.hatched', baby: 'baby-1', egg: 'plain', kind: 'moon', breed: 'moon', source: 'nest' });
    expect(a.learn).toMatchObject({ baby: 'baby-1', payload: { strand: 'm', step: 'M09', result: 'first', error: null, place: 'nest', items: [{ id: 'm:miss:10-3', r: 'first' }] } });
    expect(a.learn.payload.ms).toBeGreaterThanOrEqual(0);
    expect(f.said.slice(-2)).toEqual(['fb-warm', 'num-bond-3-7']);
    expect(await c.place(c.stones[0].id)).toBe('ignored');
  });
  it('reacts to a wrong stone, then counts the answer as a miss', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(m09(), f.deps, opts);
    await c.begin();
    const big = c.stones.find((s) => s.value === 8)!;
    expect(await c.place(big.id)).toBe('miss');
    expect(f.said).toContain('fb-hot');
    expect(f.said).toContain('num-over-1');
    expect(c.view().mood).toBe('hot');
    expect(c.view().placed).toEqual([]);
    await c.place(c.answerIds()[0]);
    expect(f.actions[0].learn.payload).toMatchObject({ result: 'miss', error: 'off-by-one' });
  });
  it('waits for the second stone of a two-stone egg and rolls a wrong one back', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(m10(), f.deps, opts);
    await c.begin();
    const [a, b] = c.wrongPair()!;
    expect(c.stones.find((s) => s.id === a)!.value + c.stones.find((s) => s.id === b)!.value).not.toBe(10);
    const three = c.stones.find((s) => s.value === 3)!;
    expect(await c.place(three.id)).toBe('need-more');
    expect(f.said).toContain('g-one-more');
    const wrong = c.wrongId()!;
    expect(await c.place(wrong)).toBe('miss');
    expect(c.view().placed).toEqual([three.id]);
    expect(await c.place(c.answerIds()[0])).toBe('solved');
    expect(f.said).toContain('num-bond-3-7');
  });
  it('gives the ghost hand a stone that is not the answer on the very first egg', () => {
    const f = fakeDeps();
    const c = new NestCtrl(served({ step: 'M02', items: ['m:num:4'], carrier: { kind: 'maths', task: { op: 'numeral', n: 4 } } }), f.deps, { ...opts, firstEver: true });
    const w = c.wrongId()!;
    expect(c.stones.find((s) => s.id === w)!.value).not.toBe(4);
  });
  it('hatches a free egg without a learning result', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(freeEgg('two-stone'), f.deps, { ...opts, free: true });
    for (const id of c.answerIds()) await c.place(id);
    expect(f.actions[0]).toMatchObject({ type: 'hb.hatched', kind: 'two-stone', breed: 'pebble', learn: null });
  });
  it('makes the moves itself after the ghost hand (level 3) and counts them as helped', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(m09(), f.deps, opts);
    let ghosted: string[] = [];
    c.onghost = async (ids) => { ghosted = ids; };
    await c.begin();
    await c.place(c.stones.find((s) => s.value === 8)!.id);
    await c.place(c.stones.find((s) => s.value === 6)!.id);
    await f.goal()!.answer();
    expect(ghosted).toHaveLength(1);
    expect(f.actions[0].learn.payload.result).toBe('helped');
  });
  it('hatches a free two-stone egg of eight, not ten (N28)', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(freeEgg('two-stone'), f.deps, { ...opts, free: true });
    expect(c.task).toMatchObject({ step: 'M12A', cups: 8, target: 8, stonesNeeded: 2 });
    for (const id of c.answerIds()) await c.place(id);
    expect(f.actions[0]).toMatchObject({ type: 'hb.hatched', learn: null });
  });
  it('keeps the first stone after a miss while its partner is still on the tray', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(pair(7, 8), f.deps, opts);
    const s = tray(c, [7, 8, 6, 9, 7, 8]);
    await c.begin();
    expect(await c.place(s[0].id)).toBe('need-more');
    expect(await c.place(s[2].id)).toBe('miss');
    expect(c.view().placed).toEqual([s[0].id]);
    expect(c.answerIds()).toHaveLength(1);
    expect(c.stones.find((x) => x.id === c.answerIds()[0])!.value).toBe(8);
  });
  it('returns both stones after a miss when the first stone has no partner left', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(pair(7, 8), f.deps, opts);
    const s = tray(c, [7, 6, 9, 6, 9, 3]);
    await c.begin();
    await c.place(s[0].id);
    expect(await c.place(s[1].id)).toBe('miss');
    expect(c.view().placed).toEqual([]);
    expect(c.answerIds()).toHaveLength(2);
    for (const id of c.answerIds()) await c.place(id);
    expect(c.view().solved).toBe(true);
  });
  it('shows which stone warmed which cup', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(pair(5, 8), f.deps, opts);
    const s = tray(c, [5, 8, 6, 7, 6, 7]);
    expect(c.view().fill).toEqual(Array(13).fill(-1));
    await c.place(s[1].id);
    expect(c.view().fill).toEqual([...Array(8).fill(1), ...Array(5).fill(-1)]);
    await c.place(s[0].id);
    expect(c.view().fill).toEqual([...Array(8).fill(1), ...Array(5).fill(2)]);
    expect(c.view().solved).toBe(true);
    expect(f.said).toContain('num-bond-8-5');
  });
  it('leaves for the hatch once, after the success lines, when her own stone solves the egg', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(m09(), f.deps, opts);
    const left: string[][] = [];
    c.onsolved = async () => { left.push([...f.said]); };
    await c.begin();
    expect(await c.place(c.answerIds()[0])).toBe('solved');
    expect(left).toHaveLength(1);
    expect(left[0].slice(-2)).toEqual(['fb-warm', 'num-bond-3-7']);
    await c.place(c.stones[0].id);
    expect(left).toHaveLength(1);
  });
  it('leaves for the hatch when the ghost answer solves a two-stone egg after two misses', async () => {
    const f = fakeDeps();
    ladder(f);
    const c = new NestCtrl(pair(7, 8), f.deps, opts);
    const s = tray(c, [7, 8, 6, 9, 7, 8]);
    const left: string[][] = [];
    c.onsolved = async () => { left.push([...f.said]); };
    await c.begin();
    await c.place(s[0].id);
    expect(await c.place(s[2].id)).toBe('miss');   // 7 + 6
    expect(await c.place(s[3].id)).toBe('miss');   // 7 + 9: the ghost places the 8
    await settle();
    expect(c.view().solved).toBe(true);
    expect(left).toHaveLength(1);
    expect(left[0].slice(-2)).toEqual(['fb-warm', 'num-bond-7-8']);
    expect(f.actions.filter((a) => a.type === 'hb.hatched')).toHaveLength(1);
  });
  it('leaves for the hatch when the ghost answer solves a one-stone egg of cups after two misses', async () => {
    const f = fakeDeps();
    ladder(f);
    const c = new NestCtrl(m09(), f.deps, opts);
    const left: string[][] = [];
    c.onsolved = async () => { left.push([...f.said]); };
    await c.begin();
    const wrong = c.stones.filter((x) => x.value !== 7);
    expect(await c.place(wrong[0].id)).toBe('miss');
    expect(await c.place(wrong[1].id)).toBe('miss');
    await settle();
    expect(c.view().solved).toBe(true);
    expect(left).toHaveLength(1);
    expect(left[0].slice(-2)).toEqual(['fb-warm', 'num-bond-3-7']);
  });
  it('leaves for the hatch once when she drops the answer while the ghost hand moves', async () => {
    const f = fakeDeps();
    ladder(f);
    const c = new NestCtrl(m09(), f.deps, opts);
    let release = () => {};
    let moving = false;
    c.onghost = () => { moving = true; return new Promise((r) => { release = r; }); };
    let left = 0;
    c.onsolved = async () => { left++; };
    await c.begin();
    const wrong = c.stones.filter((x) => x.value !== 7);
    await c.place(wrong[0].id);
    await c.place(wrong[1].id);
    await settle();
    expect(moving).toBe(true);
    expect(await c.place(c.answerIds()[0])).toBe('solved');
    release();
    await settle();
    expect(left).toBe(1);
    expect(f.actions.filter((a) => a.type === 'hb.hatched')).toHaveLength(1);
  });
  it('says the two-nest and two-stone goals only when not yet heard this visit', async () => {
    const f = fakeDeps();
    await new NestCtrl(pair(6, 7), f.deps, opts).begin();
    expect(f.said).toEqual(['g-two-nests', 'num-egg-13', 'g-two-stones']);
    const g = fakeDeps();
    const c = new NestCtrl(pair(6, 7), g.deps, { ...opts, seen: { twoNests: true, twoStones: true } });
    await c.begin();
    expect(g.said).toEqual(['num-egg-13']);
    await c.repeatGoal();
    expect(g.said.slice(1)).toEqual(['g-two-nests', 'num-egg-13', 'g-two-stones']);
  });
});
