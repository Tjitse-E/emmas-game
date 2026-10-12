import { describe, it, expect } from 'vitest';
import { WalkCtrl, type WalkInput } from '../../src/scenes/heartbeat/walk.ctrl.ts';
import type { WalkPick } from '../../src/core/heartbeat/walk.ts';
import { fakeDeps, served } from './fakes.ts';

const nameServed = (baby: string, name: string) =>
  served({ strand: 'name', step: null, slot: 'name', moment: 'roll-call', items: [`name:${name.toLowerCase()}`], carrier: { kind: 'name', babyId: baby, name }, scaffold: 3 });
const input = (dusk: string[], picks: WalkPick[]): WalkInput => ({
  picks, heads: new Set(dusk), doorOf: (b) => Number(b.slice(1)), nameServed, dusk,
});
const P = (n: number, name: string): WalkPick => ({ baby: `b${n}`, name, door: n });

describe('WalkCtrl', () => {
  it('says the dusk and the walk goal, and names the right baby as the target', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2', 'b3', 'b4'], [P(2, 'Pip')]), f.deps);
    await c.begin();
    expect(f.said).toEqual(['g-dusk', 'g-lantern-walk']);
    expect(c.target()).toBe('walk baby 2');
    expect(c.wrongBaby()).toBe('b1');
  });
  it('logs the right baby while three heads are left and not with two', async () => {
    const f = fakeDeps();
    let done = 0;
    const c = new WalkCtrl(input(['b1', 'b2', 'b3'], [P(1, 'Tam'), P(2, 'Pip')]), f.deps);
    c.ondone = () => { done++; };
    await c.begin();
    expect(await c.lead('b1')).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.care', baby: 'b1', station: 'rollcall',
      learn: { payload: { strand: 'name', moment: 'roll-call', place: 'goodnight', items: [{ id: 'name:tam', r: 'first' }] } } });
    expect(f.said).toContain('lumi-night');
    expect(c.target()).toBe('walk baby 2');
    expect(await c.lead('b2')).toBe('ok');
    expect(f.actions[1]).toMatchObject({ type: 'hb.care', baby: 'b2', station: 'rollcall', learn: null });
    expect(c.done).toBe(true);
    expect(done).toBe(1);
    expect(await c.lead('b3')).toBe('ignored');
  });
  it('says Not me for a wrong baby and counts a miss', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2', 'b3', 'b4'], [P(3, 'Ken')]), f.deps);
    await c.begin();
    expect(await c.lead('b1')).toBe('miss');
    expect(f.said).toContain('foal-notme');
    expect(f.actions).toEqual([]);
    expect(c.refused).toBe('b1');
    await c.lead('b3');
    expect(f.actions[0].learn.payload).toMatchObject({ result: 'miss', error: 'other' });
  });
  it('explains the path once when the right baby is dropped short', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2', 'b3'], [P(2, 'Pip')]), f.deps);
    await c.begin();
    expect(await c.missedDrop('b1')).toBe(false);
    expect(await c.missedDrop('b2')).toBe(true);
    expect(await c.missedDrop('b2')).toBe(false);
    expect(f.said.filter((s) => s === 'h-path')).toHaveLength(1);
    expect(f.actions).toEqual([]);
  });
  it('nudges a tapped baby and explains the path on the second tap, without a log or a miss', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2', 'b3'], [P(2, 'Pip')]), f.deps);
    await c.begin();
    expect(await c.tapBaby('b1')).toBe('nudge');
    expect(c.nudged).toBe('b1');
    expect(f.said).not.toContain('h-path');
    await c.tapBaby('b3');
    expect(f.said).toContain('h-path');
    expect(f.actions).toEqual([]);
    await c.lead('b2');
    expect(f.actions[0].learn.payload.result).toBe('first');
  });
  it('leads every baby of a free walk with two babies, unlogged', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2'], []), f.deps);
    expect(c.free).toBe(true);
    await c.begin();
    expect(f.said).toEqual(['g-dusk', 'g-lead-free']);
    expect(c.target()).toBe('walk baby 1');
    expect(c.wrongBaby()).toBeNull();
    expect(await c.lead('b2')).toBe('ok');
    expect(await c.lead('b1')).toBe('ok');
    expect(c.done).toBe(true);
    expect(f.actions).toEqual([
      { type: 'hb.care', baby: 'b2', station: 'rollcall', learn: null },
      { type: 'hb.care', baby: 'b1', station: 'rollcall', learn: null },
    ]);
  });
  it('asks three leads of a free walk with more babies', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2', 'b3', 'b4', 'b5'], []), f.deps);
    await c.begin();
    for (const b of ['b5', 'b4', 'b3']) expect(await c.lead(b)).toBe('ok');
    expect(c.done).toBe(true);
    expect(c.led).toEqual(['b5', 'b4', 'b3']);
  });
  it('leads the right baby with the ghost hand at the last hint', async () => {
    const f = fakeDeps();
    const c = new WalkCtrl(input(['b1', 'b2', 'b3'], [P(3, 'Ken')]), f.deps);
    const ghosted: string[] = [];
    c.onghost = async (b) => { ghosted.push(b); };
    await c.begin();
    await f.goal()!.answer();
    expect(ghosted).toEqual(['b3']);
    expect(f.actions[0]).toMatchObject({ baby: 'b3', station: 'rollcall' });
  });
});
