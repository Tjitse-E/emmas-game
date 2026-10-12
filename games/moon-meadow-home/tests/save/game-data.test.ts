import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openGameData } from '../../src/save/game-data.ts';
import type { GameDataOptions } from '../../src/save/game-data.ts';
import { memoryBackend } from '../../src/save/backend.ts';
import type { Backend } from '../../src/save/backend.ts';
import { openIdbBackend } from '../../src/save/idb.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import type { CoreState } from '../../src/core/world/index.ts';
import { uuid4 } from '../../src/core/ids.ts';
import type { GameEventDraft } from '../../src/core/events.ts';
import { fakeDevice, hatch, named, pin, setting } from '../helpers/events.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';

const folder = createGameFolder([]);

function setup(over: Partial<GameDataOptions<CoreState>> = {}) {
  let t = 1_760_000_000_000;
  const queued: (() => void)[] = [];
  const opts: GameDataOptions<CoreState> = {
    folder, contentHash: 'c1', codeVersion: 'b1', now: () => (t += 1000),
    schedule: fn => { queued.push(fn); }, ...over,
  };
  const runQueued = () => { const fns = queued.splice(0); fns.forEach(f => f()); };
  return { opts, runQueued, open: (backend: Backend) => openGameData({ ...opts, backend }) };
}

describe('game data', () => {
  it('commits, folds at once, saves, and restores from the snapshot after a restart', async () => {
    const name = `t-${uuid4()}`;
    const { open } = setup();
    const a = await open(await openIdbBackend(name));
    expect(a.status()).toMatchObject({ backend: 'idb', events: 0, restoreMode: 'full' });
    a.commit([hatch('b1'), named('b1', 'Pip')]);
    expect(a.folded().state.herd.babies.b1.name).toBe('Pip');
    await a.flush();
    a.backend.close();
    const b = await open(await openIdbBackend(name));
    expect(b.status().restoreMode).toBe('snapshot');
    expect(b.device()).toBe(a.device());
    expect(b.folded().state.herd.babies.b1.name).toBe('Pip');
    b.commit([pin('b1', 'p1')]);
    expect(b.allEvents().map(e => e.id)).toEqual([`${a.device()}:1`, `${a.device()}:2`, `${a.device()}:3`]);
    await b.flush();
    b.backend.close();
  });

  it('refolds when the content changes', async () => {
    const backend = memoryBackend();
    const a = await setup().open(backend);
    a.commit([hatch('b1')]);
    await a.flush();
    const b = await setup({ contentHash: 'c2' }).open(backend);
    expect(b.status().restoreMode).toBe('full');
    expect(b.folded().state.herd.order).toEqual(['b1']);
  });

  it('keeps events in memory while writing fails, retries, and loses nothing', async () => {
    const real = memoryBackend();
    let failures = 2;
    const flaky: Backend = { ...real, putLocal: async (...args) => { if (failures-- > 0) throw new Error('QuotaExceededError'); return real.putLocal(...args); } };
    const { open, runQueued } = setup();
    const d = await open(flaky);
    d.commit([hatch('b1')]);
    await d.flush();
    expect(d.status()).toMatchObject({ pendingWrites: 1, writeError: 'QuotaExceededError' });
    d.commit([hatch('b2')]);
    await d.flush();
    expect(d.status().pendingWrites).toBe(2);
    runQueued();
    await d.flush();
    expect(d.status()).toMatchObject({ pendingWrites: 0, writeError: null });
    expect((await real.allEvents()).length).toBe(2);
  });

  it('stops saving in a tab that another tab overtook', async () => {
    const name = `t-${uuid4()}`;
    const a = await setup().open(await openIdbBackend(name));
    const b = await setup().open(await openIdbBackend(name));
    a.commit([hatch('a1')]);
    await a.flush();
    b.commit([hatch('b1')]);
    await b.flush();
    expect(b.status().lostToOtherTab).toBe(true);
    expect(() => b.commit([hatch('b2')])).toThrow('another tab took over');
    expect(a.status().lostToOtherTab).toBe(false);
  });

  it('ingests remote events once, quarantines bad ones, and refolds', async () => {
    const d = await setup().open(memoryBackend());
    const other = fakeDevice('zzzzzzzz');
    const evs = other.add([hatch('z1'), named('z1', 'Zed')], 5);
    const r = await d.ingest([...evs, evs[0], { id: 'nope' }], { fromServer: true });
    expect(r).toMatchObject({ added: 2, duplicates: 1, quarantined: 1, refolded: false });
    expect(d.folded().state.herd.babies.z1.name).toBe('Zed');
    expect(d.status().quarantined).toBe(1);
    expect(await d.quarantine()).toEqual([{ id: 'nope', type: '?', reason: expect.any(String) }]);
    expect(await d.backend.countState(1)).toBe(2);
    const later = d.commit([setting('x', 1)]);
    expect(later[0].hlc > evs[1].hlc).toBe(true);
  });

  it('quarantines events that claim to be from this device but are unknown here', async () => {
    const d = await setup().open(memoryBackend());
    const me = fakeDevice(d.device());
    const evs = me.add([hatch('x')], 5);
    expect(await d.ingest(evs)).toMatchObject({ added: 0, quarantined: 1 });

    expect(await d.quarantine()).toEqual([
      { id: evs[0].id, type: 'egg.hatched', reason: 'an event from this device that this device does not have' },
    ]);
  });

  it('imports a v2 save once, and a v3 export into another device with the same herd', async () => {
    const a = await setup().open(memoryBackend());
    const text = JSON.stringify(makeV2Save());
    expect(await a.importText(text, testDeps)).toEqual({ kind: 'v2', status: 'imported', babies: 14 });
    expect(await a.importText(text, testDeps)).toEqual({ kind: 'v2', status: 'already', babies: 0 });
    expect(await a.importText('{}', testDeps)).toMatchObject({ kind: 'invalid' });
    const b = await setup().open(memoryBackend());
    const file = JSON.stringify(a.exportFile());
    expect(await b.importText(file, testDeps)).toEqual({ kind: 'v3', added: 1, duplicates: 0, quarantined: 0 });
    expect(await b.importText(file, testDeps)).toEqual({ kind: 'v3', added: 0, duplicates: 1, quarantined: 0 });
    expect(b.folded().state.herd).toEqual(a.folded().state.herd);
    expect(await b.importText(text, testDeps)).toEqual({ kind: 'v2', status: 'already', babies: 0 });
  });

  it('records earned facts once through reconcile', async () => {
    const reconcile = (s: CoreState): GameEventDraft[] => (s.herd.order.length >= 2 ? [{ type: 'title.given', title: 'stable-keeper' }] : []);
    const d = await setup({ reconcile }).open(memoryBackend());
    d.commit([hatch('b1')]);
    d.commit([hatch('b2')]);
    d.commit([hatch('b3')]);
    expect(d.allEvents().filter(e => e.type === 'title.given')).toHaveLength(1);
  });

  it('excludes a fresh start after an eviction and goes on as a new device', async () => {
    const d = await setup().open(memoryBackend());
    d.commit([hatch('fresh')]);
    const old = await d.excludeLocalPlay();
    expect(d.device()).not.toBe(old);
    d.commit([hatch('after')]);
    expect(d.folded().state.herd.order).toEqual(['after']);
    expect(d.folded().excluded).toEqual([old]);
    expect(() => d.exclude(d.device(), true)).toThrow('cannot exclude itself');
  });

  it('says when a backup is due', async () => {
    let t = 1_000_000_000_000;
    const d = await openGameData({ folder, contentHash: 'c', codeVersion: 'b', backend: memoryBackend(), now: () => t });
    expect((await d.backupState()).due).toBe(false);
    d.commit([hatch('b1')]);
    expect((await d.backupState()).due).toBe(true);
    await d.markExported();
    expect(await d.backupState()).toEqual({ lastExport: t, lastSync: null, due: false });
    t += 8 * 24 * 3600 * 1000;
    expect((await d.backupState()).due).toBe(true);
  });

  it('retries quarantined events that pass validation now', async () => {
    const backend = memoryBackend();
    const other = fakeDevice('zzzzzzzz');
    const [ev] = other.add([hatch('z1')], 5);
    await backend.putQuarantine([{ id: ev.id, raw: ev, reason: 'schema v2 is newer than v1', at: 1 }]);
    const d = await setup().open(backend);
    expect(d.folded().state.herd.order).toEqual(['z1']);
    expect(d.status().quarantined).toBe(0);
  });
});
