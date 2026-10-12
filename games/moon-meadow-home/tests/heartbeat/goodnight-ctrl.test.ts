import { describe, it, expect } from 'vitest';
import { GoodnightCtrl, countText } from '../../src/scenes/heartbeat/goodnight.ctrl.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import type { RollCallPick } from '../../src/core/heartbeat/rollcall.ts';
import { fakeDeps, served } from './fakes.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const nameServed = (baby: string, name: string) =>
  served({ strand: 'name', step: null, slot: 'name', moment: 'roll-call', items: [`name:${name.toLowerCase()}`], carrier: { kind: 'name', babyId: baby, name }, scaffold: 3 });
const make = (n: number, picks: RollCallPick[], f = fakeDeps(), rows = 1, skyNames: (string | null)[] = []) =>
  ({ f, c: new GoodnightCtrl({ layout: stableLayout(herd(n), rows), page: 1, picks, doorServed: null, herdCount: n, skyNames, nameServed }, f.deps) });

describe('countText', () => {
  it('prints the count with its word', () => {
    expect(countText(41)).toBe('41 unicorns');
    expect(countText(1)).toBe('1 unicorn');
  });
});

describe('GoodnightCtrl', () => {
  it('prints the herd count on the controller', () => {
    expect(make(41, [], fakeDeps(), 5).c.countText).toBe('41 unicorns');
    expect(make(1, []).c.countText).toBe('1 unicorn');
  });
  it('puts named babies to bed and logs only while three heads are left', async () => {
    const { f, c } = make(3, [{ kind: 'name', baby: 'b1', name: 'Tam' }, { kind: 'name', baby: 'b2', name: 'Pip' }]);
    await c.beginPick();
    expect(f.said).toContain('g-rollcall');
    expect(await c.tapDoor(1)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.care', baby: 'b1', station: 'rollcall', learn: { payload: { strand: 'name', items: [{ id: 'name:tam', r: 'first' }], moment: 'roll-call' } } });
    expect(await c.tapDoor(3)).toBe('miss');
    expect(f.said).toContain('foal-notme');
    expect(await c.tapDoor(2)).toBe('ok');
    expect(f.actions[1]).toMatchObject({ baby: 'b2', learn: null });
    expect(c.stage).toBe('sky');
  });
  it('ignores empty doors and babies already in bed', async () => {
    const { c } = make(4, [{ kind: 'name', baby: 'b1', name: 'Tam' }, { kind: 'name', baby: 'b2', name: 'Pip' }]);
    await c.beginPick();
    expect(await c.tapDoor(9)).toBe('ignored');
    await c.tapDoor(1);
    expect(await c.tapDoor(1)).toBe('ignored');
  });
  it('speaks a door number for a door pick', async () => {
    const f = fakeDeps();
    const c = new GoodnightCtrl({ layout: stableLayout(herd(15), 2), page: 1, picks: [{ kind: 'door', baby: 'b12', number: 12 }],
      doorServed: null, herdCount: 15, skyNames: [], nameServed }, f.deps);
    await c.beginPick();
    expect(f.said).toEqual(['num-door-bed-12']);
    expect(c.answerDoor()).toBe(12);
  });
  it('counts the herd and names one sky unicorn', async () => {
    const { f, c } = make(41, [], fakeDeps(), 5, ['Rose']);
    expect(c.stage).toBe('sky');
    expect(await c.sky()).toBe(1);
    expect(f.said).toEqual(['num-herd-41', 'num-sky-4', 'g-sky-name']);
    c.skyNamed(1, { name: 'Star', gems: ['s', 't', 'ar'], listName: 'Star', clipKey: 'star', ordinal: 1, route: 'bell', unknown: false });
    expect(f.actions[0]).toEqual({ type: 'hb.sky-named', index: 1, name: 'Star' });
    expect(c.stage).toBe('bye');
    await c.bye();
    expect(f.said.at(-1)).toBe('lumi-goodnight-emma');
  });
  it('asks nothing of a herd of two (Review focus 1)', () => {
    expect(make(2, []).c.stage).toBe('sky');
  });
});
