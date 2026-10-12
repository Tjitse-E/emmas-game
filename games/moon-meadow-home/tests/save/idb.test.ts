import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openIdbBackend } from '../../src/save/idb.ts';
import { memoryBackend, SeqConflictError } from '../../src/save/backend.ts';
import type { Backend } from '../../src/save/backend.ts';
import { uuid4 } from '../../src/core/ids.ts';
import { fakeDevice, setting } from '../helpers/events.ts';

const backends: [string, () => Promise<Backend>][] = [
  ['idb', () => openIdbBackend(`test-${uuid4()}`)],
  ['memory', async () => memoryBackend()],
];

describe.each(backends)('%s backend', (_name, open) => {
  it('writes events and the device meta together, and refuses a stale sequence', async () => {
    const b = await open();
    const d = fakeDevice('aaaaaaaa');
    const evs = d.add([setting('x', 1), setting('x', 2)], 1000);
    await b.putLocal(evs.map(e => ({ id: e.id, e, s: 0 })), d.meta, 1);
    expect((await b.allEvents()).map(e => e.id).sort()).toEqual(['aaaaaaaa:1', 'aaaaaaaa:2']);
    expect(await b.getMeta('device')).toEqual(d.meta);
    const more = d.add([setting('x', 3)], 2000);
    await expect(b.putLocal(more.map(e => ({ id: e.id, e, s: 0 })), d.meta, 1)).rejects.toBeInstanceOf(SeqConflictError);
    expect(await b.allEvents()).toHaveLength(2);
    await b.putLocal(more.map(e => ({ id: e.id, e, s: 0 })), d.meta, 3);
    expect(await b.allEvents()).toHaveLength(3);
    b.close();
  });

  it('stores remote rows once and tracks their sync state', async () => {
    const b = await open();
    const d = fakeDevice('bbbbbbbb');
    const evs = d.add([setting('y', 1), setting('y', 2), setting('y', 3)], 1000);
    expect(await b.putRemote(evs.slice(0, 2).map(e => ({ id: e.id, e, s: 0 })))).toEqual(['bbbbbbbb:1', 'bbbbbbbb:2']);
    expect(await b.putRemote(evs.map(e => ({ id: e.id, e, s: 1 })))).toEqual(['bbbbbbbb:3']);
    expect(await b.countState(0)).toBe(2);
    await b.setState(['bbbbbbbb:1'], 1);
    expect((await b.rowsWithState(0, 10)).map(r => r.id)).toEqual(['bbbbbbbb:2']);
    await b.setState(['bbbbbbbb:2'], 2);
    expect(await b.countState(2)).toBe(1);
    await b.resetStates();
    expect(await b.countState(0)).toBe(3);
    b.close();
  });

  it('keeps quarantine and meta, and clears everything', async () => {
    const b = await open();
    await b.putQuarantine([{ id: 'q1', raw: { junk: 1 }, reason: 'bad id', at: 5 }]);
    await b.setMeta('export', { at: 9 });
    expect(await b.allQuarantine()).toEqual([{ id: 'q1', raw: { junk: 1 }, reason: 'bad id', at: 5 }]);
    expect(await b.getMeta('export')).toEqual({ at: 9 });
    await b.deleteQuarantine(['q1']);
    expect(await b.allQuarantine()).toEqual([]);
    await b.clear();
    expect(await b.getMeta('export')).toBeUndefined();
    b.close();
  });
});
