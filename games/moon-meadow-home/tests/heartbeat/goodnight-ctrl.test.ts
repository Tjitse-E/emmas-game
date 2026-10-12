import { describe, it, expect } from 'vitest';
import { GoodnightCtrl, countText, type GoodnightInput } from '../../src/scenes/heartbeat/goodnight.ctrl.ts';
import type { WalkPick } from '../../src/core/heartbeat/walk.ts';
import { fakeDeps, served } from './fakes.ts';

const nameServed = (baby: string, name: string) =>
  served({ strand: 'name', step: null, slot: 'name', moment: 'roll-call', items: [`name:${name.toLowerCase()}`], carrier: { kind: 'name', babyId: baby, name }, scaffold: 3 });
const door = (n: number) => served({ strand: 'm', step: 'M02', moment: 'roll-call-door', items: [`m:num:${n}`], carrier: { kind: 'door', n } });
const ids = (n: number) => Array.from({ length: n }, (_, i) => `b${i + 1}`);

function make(o: { herd: number; picks?: WalkPick[]; doorPick?: number | null; mangers?: boolean; long?: boolean; skyNames?: (string | null)[]; stalls?: number }) {
  const f = fakeDeps();
  const dusk = ids(Math.min(10, o.herd));
  const stalls = o.stalls ?? Math.min(10, o.herd);
  const i: GoodnightInput = {
    herdCount: o.herd, skyNames: o.skyNames ?? [],
    walk: o.herd ? { picks: o.picks ?? [], heads: new Set(dusk), doorOf: (b) => Number(b.slice(1)), nameServed, dusk } : null,
    stable: {
      doorPick: o.doorPick ? { baby: `b${o.doorPick}`, number: o.doorPick } : null, doorServed: o.doorPick ? door(o.doorPick) : null,
      babies: ids(stalls).map((b) => ({ baby: b, door: Number(b.slice(1)) })),
    },
    mangers: o.mangers ?? true, long: o.long ?? false,
  };
  return { f, c: new GoodnightCtrl(i, f.deps) };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Plays a whole goodnight the way a child would, through the controllers. */
async function playThrough(c: GoodnightCtrl): Promise<void> {
  await c.start();
  for (let guard = 0; guard < 20 && c.stage === 'walk'; guard++) {
    const b = c.walk!.rightBaby();
    if (b) await c.walk!.lead(b);
    await tick();
  }
  for (let guard = 0; guard < 20 && c.stage === 'herd-in'; guard++) await tick();
  if (c.stage === 'manger') await c.mangerDone();
  if (c.stage === 'free') await c.moon();
  await tick();
  const n = c.stable.answerStall();
  if (n !== null) await c.stable.tapStall(n);
  await tick();
  expect(await c.window()).toBe('ok');
  const next = await c.sky();
  if (next !== null) c.skyNamed(next, { name: 'Star', gems: ['s', 't', 'ar'], listName: 'Star', clipKey: 'star', ordinal: 1, route: 'bell', unknown: false });
  await c.bye();
}

describe('countText', () => {
  it('prints the count with its word', () => {
    expect(countText(41)).toBe('41 unicorns');
    expect(countText(1)).toBe('1 unicorn');
  });
});

describe('GoodnightCtrl stages', () => {
  it('walks, herds in, feeds, beds and opens the sky on a short visit with picks and a door pick', async () => {
    const { f, c } = make({ herd: 6, picks: [{ baby: 'b2', name: 'Pip', door: 2 }], doorPick: 4 });
    await playThrough(c);
    expect(c.stages).toEqual(['walk', 'herd-in', 'manger', 'free', 'bed', 'sky', 'bye']);
    expect(f.said).toEqual(expect.arrayContaining(['g-dusk', 'g-lantern-walk', 'lumi-night', 'g-herd-in', 'g-moon', 'num-door-bed-4', 'g-tuck', 'g-window', 'num-herd-6', 'lumi-goodnight-emma']));
    expect(f.said.indexOf('num-door-bed-4')).toBeLessThan(f.said.indexOf('g-tuck'));
    expect(f.actions.map((a) => `${a.station ?? a.type}:${a.baby ?? ''}`)).toEqual(['rollcall:b2', 'rollcall:b4', 'nap:b4']);
  });
  it('still starts with the walk without picks (a free walk)', async () => {
    const { f, c } = make({ herd: 2 });
    await playThrough(c);
    expect(c.stages[0]).toBe('walk');
    expect(c.walk!.free).toBe(true);
    expect(f.said).toContain('g-lead-free');
    expect(f.said).not.toContain('g-herd-in');   // both babies were led in: nobody else comes
    expect(c.stages).toEqual(['walk', 'herd-in', 'manger', 'free', 'bed', 'sky', 'bye']);
  });
  it('skips the mangers on a long visit and says no g-tuck', async () => {
    const { f, c } = make({ herd: 6, picks: [{ baby: 'b1', name: 'Tam', door: 1 }], mangers: false, long: true });
    await playThrough(c);
    expect(c.stages).toEqual(['walk', 'herd-in', 'bed', 'sky', 'bye']);
    expect(f.said).not.toContain('g-tuck');
    expect(f.said).toContain('g-window');
  });
  it('skips the mangers without stalls on screen', async () => {
    const { c } = make({ herd: 3, stalls: 0, mangers: false });
    await playThrough(c);
    expect(c.stages).toEqual(['walk', 'herd-in', 'bed', 'sky', 'bye']);
  });
  it('goes to bed and the sky with a herd of 0', async () => {
    const { c } = make({ herd: 0, mangers: false });
    expect(c.walk).toBeNull();
    await playThrough(c);
    expect(c.stages).toEqual(['bed', 'sky', 'bye']);
  });
  it('names a sky unicorn when ten babies make one', async () => {
    const { f, c } = make({ herd: 12, skyNames: [] });
    await playThrough(c);
    expect(c.stages).toEqual(['walk', 'herd-in', 'manger', 'free', 'bed', 'sky', 'sky-name', 'bye']);
    expect(f.actions.at(-1)).toEqual({ type: 'hb.sky-named', index: 0, name: 'Star' });
  });
  it('ignores the moon and the window outside their stages', async () => {
    const { c } = make({ herd: 4, doorPick: 2 });
    await c.start();
    expect(await c.moon()).toBe('ignored');
    expect(await c.window()).toBe('ignored');
  });
  it('keeps the window closed while the door pick is open', async () => {
    const { c } = make({ herd: 4, doorPick: 2, mangers: false });
    await c.start();
    for (const b of ['b1', 'b2', 'b3']) await c.walk!.lead(b);
    for (let k = 0; k < 10 && c.stage !== 'bed'; k++) await tick();
    expect(c.stage).toBe('bed');
    expect(c.stable.doorOpen).toBe(true);
    expect(await c.window()).toBe('ignored');
    await c.stable.tapStall(2);
    await tick();
    expect(c.windowShown).toBe(true);
    expect(await c.window()).toBe('ok');
  });
  it('counts the herd and names one sky unicorn', async () => {
    const { f, c } = make({ herd: 41, skyNames: ['Rose'], mangers: false });
    expect(await c.sky()).toBe(1);
    expect(f.said).toEqual(['num-herd-41', 'num-sky-4', 'g-sky-name']);
  });
});
