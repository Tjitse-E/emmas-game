// The IndexedDB backend: one versioned database, "moon-meadow", opened with idb.
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { DeviceMeta } from '../core/factory.ts';
import { SeqConflictError } from './backend.ts';
import type { Backend, EventRow, QuarantineRow } from './backend.ts';

export const DB_NAME = 'moon-meadow';
export const DB_VERSION = 1;

interface MoonDb extends DBSchema {
  events: { key: string; value: EventRow; indexes: { s: number } };
  quarantine: { key: string; value: QuarantineRow };
  meta: { key: string; value: unknown };
}

export async function openIdbBackend(name: string = DB_NAME): Promise<Backend> {
  let db: IDBPDatabase<MoonDb> | null = null;
  db = await openDB<MoonDb>(name, DB_VERSION, {
    upgrade(up) {
      const events = up.createObjectStore('events', { keyPath: 'id' });
      events.createIndex('s', 's');
      up.createObjectStore('quarantine', { keyPath: 'id' });
      up.createObjectStore('meta');
    },
    blocking() { db?.close(); },
  });
  const d = db;
  return {
    kind: 'idb',
    async putLocal(rows, device, expected) {
      const tx = d.transaction(['events', 'meta'], 'readwrite');
      const stored = (await tx.objectStore('meta').get('device')) as DeviceMeta | undefined;
      if (stored && stored.nextSeq !== expected) {
        tx.done.catch(() => {});
        tx.abort();
        throw new SeqConflictError();
      }
      const store = tx.objectStore('events');
      await Promise.all([...rows.map(r => store.put(r)), tx.objectStore('meta').put(device, 'device'), tx.done]);
    },
    async putRemote(rows) {
      const tx = d.transaction('events', 'readwrite');
      const added: string[] = [];
      for (const r of rows) {
        if ((await tx.store.getKey(r.id)) === undefined) { await tx.store.add(r); added.push(r.id); }
      }
      await tx.done;
      return added;
    },
    async allEvents() { return (await d.getAll('events')).map(r => r.e); },
    async rowsWithState(s, limit) { return d.getAllFromIndex('events', 's', s, limit); },
    async setState(ids, s) {
      const tx = d.transaction('events', 'readwrite');
      for (const id of ids) {
        const r = await tx.store.get(id);
        if (r && r.s !== s) await tx.store.put({ ...r, s });
      }
      await tx.done;
    },
    async resetStates() {
      const tx = d.transaction('events', 'readwrite');
      let cursor = await tx.store.openCursor();
      while (cursor) {
        if (cursor.value.s !== 0) await cursor.update({ ...cursor.value, s: 0 });
        cursor = await cursor.continue();
      }
      await tx.done;
    },
    async countState(s) { return d.countFromIndex('events', 's', s); },
    async getMeta(k) { return (await d.get('meta', k)) as never; },
    async setMeta(k, v) { await d.put('meta', v, k); },
    async deleteMeta(k) { await d.delete('meta', k); },
    async putQuarantine(rows) {
      const tx = d.transaction('quarantine', 'readwrite');
      await Promise.all([...rows.map(r => tx.store.put(r)), tx.done]);
    },
    async allQuarantine() { return d.getAll('quarantine'); },
    async deleteQuarantine(ids) {
      const tx = d.transaction('quarantine', 'readwrite');
      await Promise.all([...ids.map(id => tx.store.delete(id)), tx.done]);
    },
    async clear() {
      const tx = d.transaction(['events', 'quarantine', 'meta'], 'readwrite');
      await Promise.all([tx.objectStore('events').clear(), tx.objectStore('quarantine').clear(), tx.objectStore('meta').clear(), tx.done]);
    },
    close() { d.close(); },
  };
}
