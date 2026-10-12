// Storage behind the game data: IndexedDB in the browser, memory when IndexedDB is not there.
import type { GameEvent } from '../core/events.ts';
import type { DeviceMeta } from '../core/factory.ts';
import type { Snapshot } from '../core/fold/snapshot.ts';

/** s: 0 = not on the server yet, 1 = on the server, 2 = the server refused it. */
export type SyncState = 0 | 1 | 2;
export type EventRow = { id: string; e: GameEvent; s: SyncState };
export type QuarantineRow = { id: string; raw: unknown; reason: string; at: number };
export type SyncMeta = { cursor: number; lastSuccess: number | null; lastError: string | null };
export type PairingMeta = { token: string; family: string; pairedAt: number };
export type MetaValues = {
  device: DeviceMeta;
  snapshot: Snapshot;
  sync: SyncMeta;
  pairing: PairingMeta;
  export: { at: number };
};
export type MetaKey = keyof MetaValues;

export class SeqConflictError extends Error {
  constructor() {
    super('Another tab wrote events for this device.');
    this.name = 'SeqConflictError';
  }
}

export interface Backend {
  readonly kind: 'idb' | 'memory';
  /** Writes rows and the device meta in one transaction. Throws SeqConflictError when the stored nextSeq is not `expectedNextSeq`. */
  putLocal(rows: readonly EventRow[], device: DeviceMeta, expectedNextSeq: number): Promise<void>;
  /** Stores rows whose id is new. Returns the ids that were new. */
  putRemote(rows: readonly EventRow[]): Promise<string[]>;
  allEvents(): Promise<GameEvent[]>;
  rowsWithState(s: SyncState, limit: number): Promise<EventRow[]>;
  setState(ids: readonly string[], s: SyncState): Promise<void>;
  /** Marks every stored event as not on the server, for a new pairing. */
  resetStates(): Promise<void>;
  countState(s: SyncState): Promise<number>;
  getMeta<K extends MetaKey>(k: K): Promise<MetaValues[K] | undefined>;
  setMeta<K extends MetaKey>(k: K, v: MetaValues[K]): Promise<void>;
  deleteMeta(k: MetaKey): Promise<void>;
  putQuarantine(rows: readonly QuarantineRow[]): Promise<void>;
  allQuarantine(): Promise<QuarantineRow[]>;
  deleteQuarantine(ids: readonly string[]): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

export function memoryBackend(): Backend {
  const events = new Map<string, EventRow>();
  const meta = new Map<string, unknown>();
  const quarantine = new Map<string, QuarantineRow>();
  const copy = <T>(x: T): T => structuredClone(x);
  return {
    kind: 'memory',
    async putLocal(rows, device, expected) {
      const stored = meta.get('device') as DeviceMeta | undefined;
      if (stored && stored.nextSeq !== expected) throw new SeqConflictError();
      for (const r of rows) events.set(r.id, copy(r));
      meta.set('device', copy(device));
    },
    async putRemote(rows) {
      const added: string[] = [];
      for (const r of rows) if (!events.has(r.id)) { events.set(r.id, copy(r)); added.push(r.id); }
      return added;
    },
    async allEvents() { return [...events.values()].map(r => copy(r.e)); },
    async rowsWithState(s, limit) { return [...events.values()].filter(r => r.s === s).slice(0, limit).map(copy); },
    async setState(ids, s) { for (const id of ids) { const r = events.get(id); if (r) r.s = s; } },
    async resetStates() { for (const r of events.values()) r.s = 0; },
    async countState(s) { return [...events.values()].filter(r => r.s === s).length; },
    async getMeta(k) { return meta.has(k) ? copy(meta.get(k)) as never : undefined; },
    async setMeta(k, v) { meta.set(k, copy(v)); },
    async deleteMeta(k) { meta.delete(k); },
    async putQuarantine(rows) { for (const r of rows) quarantine.set(r.id, copy(r)); },
    async allQuarantine() { return [...quarantine.values()].map(copy); },
    async deleteQuarantine(ids) { for (const id of ids) quarantine.delete(id); },
    async clear() { events.clear(); meta.clear(); quarantine.clear(); },
    close() {},
  };
}
