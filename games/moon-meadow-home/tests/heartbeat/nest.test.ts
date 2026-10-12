import { describe, it, expect } from 'vitest';
import { NestCtrl, freeEgg } from '../../src/scenes/heartbeat/nest.ctrl.ts';
import { fakeDeps, served } from './fakes.ts';

const opts = { golden: false, speckled: false, firstEver: false };
const m09 = () => served({ step: 'M09', moment: 'egg-moon', items: ['m:miss:10-3'] });
const m10 = () => served({ step: 'M10', moment: 'egg-two-stone', items: ['m:pair:3+7'], carrier: { kind: 'maths', task: { op: 'pair', a: 3, b: 7 } } });

describe('NestCtrl', () => {
  it('hatches on a first try and logs the result with the hatch', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(m09(), f.deps, opts);
    await c.begin();
    expect(f.said).toEqual(['g-egg']);
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
});
