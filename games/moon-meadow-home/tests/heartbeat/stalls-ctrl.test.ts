import { describe, it, expect } from 'vitest';
import { StallsCtrl } from '../../src/scenes/heartbeat/stalls.ctrl.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import { fakeDeps, served } from './fakes.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const door = (n: number) => served({ strand: 'm', step: n <= 10 ? 'M02' : 'M07', moment: 'door-visit', items: [`m:num:${n}`], carrier: { kind: 'door', n } });
const input = (n: number, rows: number, order: number, visit: number | null = null) => ({
  baby: { id: `b${order}`, order, name: 'Tam' }, layout: stableLayout(herd(n), rows), rowsBuilt: rows, visit: visit === null ? null : door(visit),
});

describe('StallsCtrl', () => {
  it('says the name and the baby number at its door', async () => {
    const f = fakeDeps({ names: ['Tam'] });
    const c = new StallsCtrl(input(19, 2, 19), f.deps);
    await c.moveIn();
    expect(c.door).toBe(true);
    expect(f.said).toEqual(['name:tam!', 'num-movein-19']);
  });
  it('sends a baby without a row to the tent and asks no visit (Review focus 2)', async () => {
    const f = fakeDeps({ names: ['Tam'] });
    const c = new StallsCtrl(input(11, 1, 11, 5), f.deps);
    await c.moveIn();
    expect(c.door).toBe(false);
    expect(c.target).toBeNull();
    expect(f.said).toContain('g-tent');
  });
  it('says a count only when its clip exists', async () => {
    const f = fakeDeps({ clips: (id) => id !== 'num-movein-71' });
    const c = new StallsCtrl(input(71, 8, 71), f.deps);
    await c.moveIn();
    expect(f.said).not.toContain('num-movein-71');
  });
  it('runs a door visit with a funny wrong door and logs the door result', async () => {
    const f = fakeDeps({ names: ['Tam'] });
    const c = new StallsCtrl(input(5, 1, 5, 3), f.deps);
    expect(c.target).toBe(3);
    await c.beginVisit();
    expect(f.said).toContain('num-visit-3');
    const wrong = c.wrongDoor()!;
    expect(await c.tapDoor(wrong)).toBe('miss');
    expect(f.said).toContain(`num-${wrong}`);
    expect(c.tapped?.who).toBe('sleepy');
    expect(await c.tapDoor(5)).toBe('ignored');
    expect(await c.tapDoor(3)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.learn', baby: 'b5', payload: { items: [{ id: 'm:num:3', r: 'miss' }], moment: 'door-visit', place: 'stalls' } });
  });
  it('asks no visit to an empty door or its own door (Review focus 1)', () => {
    expect(new StallsCtrl(input(2, 1, 2, 7), fakeDeps().deps).target).toBeNull();
    expect(new StallsCtrl(input(4, 1, 4, 4), fakeDeps().deps).target).toBeNull();
    expect(new StallsCtrl(input(1, 1, 1, null), fakeDeps().deps).target).toBeNull();
  });
});
