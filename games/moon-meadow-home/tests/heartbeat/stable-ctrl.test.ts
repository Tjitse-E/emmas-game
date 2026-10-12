import { describe, it, expect } from 'vitest';
import { StableCtrl, type StableInput } from '../../src/scenes/heartbeat/stable.ctrl.ts';
import { fakeDeps, served } from './fakes.ts';

const door = (n: number) => served({ strand: 'm', step: n <= 10 ? 'M02' : 'M07', moment: 'roll-call-door', items: [`m:num:${n}`], carrier: { kind: 'door', n } });
const babies = (n: number, from = 1) => Array.from({ length: n }, (_, i) => ({ baby: `b${from + i}`, door: from + i }));
const input = (n: number, pick: number | null, from = 1): StableInput => ({
  doorPick: pick === null ? null : { baby: `b${pick}`, number: pick }, doorServed: pick === null ? null : door(pick), babies: babies(n, from),
});

describe('StableCtrl', () => {
  it('speaks the door number and names the stall as the target', async () => {
    const f = fakeDeps();
    const c = new StableCtrl(input(15, 12, 11), f.deps);
    await c.beginDoor();
    expect(f.said).toEqual(['num-door-bed-12']);
    expect(c.answerStall()).toBe(12);
    expect(f.goal()!.target!()).toBe('stall 12');
    expect(c.tuckOpen()).toBe(false);
  });
  it('ignores tucks while the door pick is open', async () => {
    const f = fakeDeps();
    const c = new StableCtrl(input(5, 3), f.deps);
    await c.beginDoor();
    expect(await c.tuck('b1')).toBe('ignored');
    expect(f.actions).toEqual([]);
  });
  it('a right door writes the roll call, then tucks that baby in', async () => {
    const f = fakeDeps();
    const c = new StableCtrl(input(5, 3), f.deps);
    let doors = 0;
    c.ondoor = () => { doors++; };
    await c.beginDoor();
    expect(await c.tapStall(3)).toBe('ok');
    expect(f.actions).toHaveLength(2);
    expect(f.actions[0]).toMatchObject({ type: 'hb.care', baby: 'b3', station: 'rollcall',
      learn: { payload: { strand: 'm', step: 'M02', moment: 'roll-call-door', items: [{ id: 'm:num:3', r: 'first' }] } } });
    expect(f.actions[1]).toEqual({ type: 'hb.care', baby: 'b3', station: 'nap' });
    expect(f.said).toContain('foal-yawn');
    expect(c.closed).toBe(3);
    expect(c.tuckOpen()).toBe(true);
    expect(doors).toBe(1);
    expect(await c.tapStall(3)).toBe('ignored');
  });
  it('a wrong door is a miss with the door said', async () => {
    const f = fakeDeps();
    const c = new StableCtrl(input(5, 3), f.deps);
    await c.beginDoor();
    expect(await c.tapStall(4)).toBe('miss');
    expect(f.said).toEqual(['num-door-bed-3', 'foal-notme', 'num-4']);
    expect(c.poked).toBe(4);
    expect(await c.tapStall(9)).toBe('ignored');
    await c.tapStall(3);
    expect(f.actions[0].learn.payload).toMatchObject({ result: 'miss', error: 'other' });
  });
  it('does not log a door pick among fewer than three babies', async () => {
    const f = fakeDeps();
    const c = new StableCtrl(input(2, 2), f.deps);
    await c.beginDoor();
    await c.tapStall(2);
    expect(f.actions[0]).toMatchObject({ station: 'rollcall', learn: null });
  });
  it('tucks each baby in once; a second tap only yawns', async () => {
    const f = fakeDeps();
    const c = new StableCtrl(input(5, null), f.deps);
    expect(c.tuckOpen()).toBe(true);
    await c.beginDoor();
    expect(f.said).toEqual([]);
    expect(await c.tuck('b2')).toBe('ok');
    expect(await c.tuck('b2')).toBe('again');
    expect(await c.tuck('b4')).toBe('ok');
    expect(f.actions).toEqual([{ type: 'hb.care', baby: 'b2', station: 'nap' }, { type: 'hb.care', baby: 'b4', station: 'nap' }]);
    expect(f.said.filter((s) => s === 'foal-yawn')).toHaveLength(3);
  });
});
