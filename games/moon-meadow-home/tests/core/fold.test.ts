import { describe, expect, it } from 'vitest';
import { createFolder } from '../../src/core/fold/engine.ts';
import type { Slice } from '../../src/core/fold/engine.ts';
import { isSnapshot, restore, snapshotKey, toSnapshot } from '../../src/core/fold/snapshot.ts';
import { merge } from '../../src/core/merge.ts';
import { observe } from '../../src/core/factory.ts';
import type { DraftOf } from '../../src/core/events.ts';
import type { Slice as ContractSlice } from '../../src/types/contracts.ts';
import { fakeDevice, setting } from '../helpers/events.ts';
import { mulberry32 } from '../helpers/rng.ts';

/** A toy slice that records the order it saw settings in, and a second one that reads the first through ctx. */
const trail: Slice<'trail', { ids: string[] }> = {
  name: 'trail', version: '1', init: () => ({ ids: [] }),
  apply(s, e) { if (e.type === 'settings.set') s.ids.push(e.id); return s; },
};
const seenCount: Slice<'count', { n: number }> = {
  name: 'count', version: '1', init: () => ({ n: 0 }),
  apply(s, e, ctx) { if (e.type === 'settings.set') s.n = ctx.get<{ ids: string[] }>('trail').ids.length; return s; },
};
const folder = createFolder([trail, seenCount] as const);
const exclude = (device: string, on = true): DraftOf<'exclude'> => ({ type: 'exclude', device, on });

describe('fold engine', () => {
  it('folds in fold order whatever the input order', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2), setting('x', 3)], 1000);
    const f = folder.full([...a.events].reverse());
    expect(f.state.trail.ids).toEqual(a.events.map(e => e.id));
    expect(f.state.count.n).toBe(3);
    expect(f.count).toBe(3);
    expect(f.seen).toEqual({ aaaaaaaa: 3 });
    expect(f.position).toEqual({ hlc: a.events[2].hlc, dev: 'aaaaaaaa', seq: 3 });
  });

  it('takes a contracts slice with a number version', () => {
    const places: ContractSlice<'places', { n: number }> = { name: 'places', version: 1, init: () => ({ n: 0 }), apply: s => { s.n++; return s; } };
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2)], 1000);
    const f2 = createFolder([trail, places] as const);
    expect(f2.full(a.events).state.places.n).toBe(2);
    expect(snapshotKey({ slices: f2.slices, contentHash: 'c', codeVersion: 'b' }))
      .not.toBe(snapshotKey({ slices: [trail, { ...places, version: 2 }], contentHash: 'c', codeVersion: 'b' }));
  });

  it('refuses two slices with one name', () => {
    expect(() => createFolder([trail, trail])).toThrow('two slices are called trail');
  });

  it('step folds events that sort after the position, and refuses others without changing the fold', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([setting('x', 1)], 1000);
    b.add([setting('y', 1)], 500);
    const f = folder.full(a.events);
    const before = JSON.stringify(f);
    expect(folder.step(f, b.events)).toBeNull();
    expect(JSON.stringify(f)).toBe(before);
    const later = a.add([setting('x', 2)], 2000);
    expect(folder.step(f, later)?.state.trail.ids).toEqual([a.events[0].id, a.events[1].id]);
  });

  it('leaves out the events of an excluded device, and an exclude always forces a refold', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    b.add([setting('fresh', 1)], 1000);
    a.add([setting('x', 1)], 1100);
    const f = folder.full([...a.events, ...b.events]);
    const ex = a.add([exclude('bbbbbbbb')], 1200);
    expect(folder.step(f, ex)).toBeNull();
    const g = folder.catchUp(f, ex, [...a.events, ...b.events]);
    expect(g.refolded).toBe(true);
    expect(g.folded.state.trail.ids).toEqual([a.events[0].id]);
    expect(g.folded.excluded).toEqual(['bbbbbbbb']);
    expect(g.folded.count).toBe(3);
    a.add([exclude('bbbbbbbb', false)], 1300);
    expect(folder.full([...a.events, ...b.events]).state.trail.ids).toEqual([b.events[0].id, a.events[0].id]);
  });

  it('an incremental fold of late, out-of-order events equals a full refold of the union', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry32(seed);
      const devs = [fakeDevice('aaaaaaaa'), fakeDevice('bbbbbbbb')];
      let wall = 1_000_000;
      for (let i = 0; i < 40; i++) {
        const d = devs[Math.floor(rng() * 2)];
        wall += Math.floor(rng() * 3000) - 1000;
        d.add([setting('k', i)], wall);
        if (rng() < 0.3) d.meta = observe(d.meta, devs[0].events.concat(devs[1].events));
      }
      const [a, b] = devs.map(d => d.events);
      const half = Math.floor(b.length / 2);
      let f = folder.full(a);
      let known = [...a];
      for (const chunk of [b.slice(half), b.slice(0, half)]) {
        known = merge(known, chunk);
        f = folder.catchUp(f, chunk, known).folded;
      }
      expect(f).toEqual(folder.full(merge(a, b)));
    }
  });
});

describe('snapshot', () => {
  const key = snapshotKey({ slices: folder.slices, contentHash: 'c1', codeVersion: 'b1' });

  it('the key changes with content, code and slice versions', () => {
    expect(snapshotKey({ slices: folder.slices, contentHash: 'c2', codeVersion: 'b1' })).not.toBe(key);
    expect(snapshotKey({ slices: folder.slices, contentHash: 'c1', codeVersion: 'b2' })).not.toBe(key);
    expect(snapshotKey({ slices: [{ ...trail, version: '2' }, seenCount], contentHash: 'c1', codeVersion: 'b1' })).not.toBe(key);
  });

  it('restores without folding when nothing is new, and steps on top when new events sort after', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2)], 1000);
    const snap = toSnapshot(folder.full(a.events), key, 5);
    expect(isSnapshot(snap)).toBe(true);
    expect(restore(folder, snap, a.events, key).mode).toBe('snapshot');
    a.add([setting('x', 3)], 2000);
    const r = restore(folder, snap, a.events, key);
    expect(r.mode).toBe('incremental');
    expect(r.folded).toEqual(folder.full(a.events));
  });

  it('refolds when the key differs, the snapshot is corrupt, counts differ or new events sort before', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([setting('x', 1)], 5000);
    const snap = toSnapshot(folder.full(a.events), key, 5);
    expect(restore(folder, snap, a.events, 'other').mode).toBe('full');
    expect(restore(folder, { junk: true }, a.events, key).mode).toBe('full');
    expect(restore(folder, null, a.events, key).mode).toBe('full');
    expect(restore(folder, snap, [], key).reason).toBe('snapshot does not match the stored events');
    b.add([setting('y', 1)], 1000);
    const r = restore(folder, snap, [...a.events, ...b.events], key);
    expect(r.mode).toBe('full');
    expect(r.folded).toEqual(folder.full([...a.events, ...b.events]));
  });

  it('a restored fold is a copy, so changing it never changes the snapshot', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1)], 1000);
    const snap = toSnapshot(folder.full(a.events), key, 5);
    const r = restore(folder, snap, a.events, key);
    r.folded.state.trail.ids.push('changed');
    expect((snap.state as { trail: { ids: string[] } }).trail.ids).toHaveLength(1);
  });
});
