// The game's data runtime: stamps, folds, saves, snapshots, imports and exports events.
// The game store (src/game.svelte.ts) wraps this; scenes never call it directly.
import { seqOf } from '../core/events.ts';
import type { GameEvent, GameEventDraft } from '../core/events.ts';
import { newDeviceMeta, observe, stamp } from '../core/factory.ts';
import type { DeviceMeta } from '../core/factory.ts';
import type { Folded, Folder } from '../core/fold/engine.ts';
import { restore, snapshotKey, toSnapshot } from '../core/fold/snapshot.ts';
import type { RestoreMode } from '../core/fold/snapshot.ts';
import { checkEvent } from '../core/migrate.ts';
import { buildExport, parseSaveFile } from '../core/save/export.ts';
import type { ExportFile } from '../core/save/export.ts';
import { planV2Import } from '../core/save/v2.ts';
import type { V2ImportDeps } from '../core/save/v2.ts';
import { missingFacts } from '../core/world/facts.ts';
import type { FactsState } from '../core/world/facts.ts';
import { memoryBackend, SeqConflictError } from './backend.ts';
import type { Backend, QuarantineRow } from './backend.ts';
import { openIdbBackend } from './idb.ts';

export const BACKUP_DUE_MS = 7 * 24 * 60 * 60 * 1000;

export type GameDataOptions<St extends { facts: FactsState }> = {
  folder: Folder<St>;
  contentHash: string;
  codeVersion: string;
  backend?: Backend;
  now?: () => number;
  /**
   * Facts the folded state has earned (passed steps, titles). Missing ones are recorded once, after each fold.
   * A learn.override draft (the maths lift) is committed as it is, once per round; the folded state must stop returning it.
   */
  reconcile?: (state: St) => GameEventDraft[];
  schedule?: (fn: () => void, ms: number) => void;
  snapshotEveryMs?: number;
  retryEveryMs?: number;
};
export type IngestResult = { added: number; duplicates: number; quarantined: number; refolded: boolean };
export type ImportOutcome =
  | { kind: 'v3'; added: number; duplicates: number; quarantined: number }
  | { kind: 'v2'; status: 'imported' | 'already' | 'empty'; babies: number }
  | { kind: 'invalid'; reason: string };
export type SaveStatus = {
  backend: 'idb' | 'memory';
  device: string;
  events: number;
  pendingWrites: number;
  writeError: string | null;
  lostToOtherTab: boolean;
  quarantined: number;
  restoreMode: RestoreMode;
};
export type BackupState = { lastExport: number | null; lastSync: number | null; due: boolean };

export interface GameData<St> {
  readonly backend: Backend;
  device(): string;
  folded(): Folded<St>;
  /** Goes up by one after every change to the folded state. */
  version(): number;
  allEvents(): readonly GameEvent[];
  subscribe(fn: (f: Folded<St>, version: number) => void): () => void;
  /** Stamps drafts, folds them at once and saves them in the background. Throws after another tab took over. */
  commit(drafts: readonly GameEventDraft[]): GameEvent[];
  /** Adds events from a file or the server: validated, deduplicated, stored, folded. Bad ones go to quarantine. */
  ingest(raw: readonly unknown[], opts?: { fromServer: boolean }): Promise<IngestResult>;
  importText(text: string, deps: V2ImportDeps): Promise<ImportOutcome>;
  exportFile(): ExportFile;
  markExported(): Promise<void>;
  backupState(): Promise<BackupState>;
  exclude(device: string, on: boolean): GameEvent[];
  /** Leaves out every event this device made so far and goes on with a new device id. Returns the old id. */
  excludeLocalPlay(): Promise<string>;
  retryQuarantine(): Promise<number>;
  /** The quarantined rows, for the parent corner: event id, its type (or '?' when it has none) and why it was refused. */
  quarantine(): Promise<{ id: string; type: string; reason: string }[]>;
  flush(): Promise<void>;
  status(): SaveStatus;
  /** Clears everything stored on this device. The caller reloads the page afterwards. */
  reset(): Promise<void>;
}

export async function openDefaultBackend(): Promise<Backend> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no IndexedDB');
    return await openIdbBackend();
  } catch {
    return memoryBackend();
  }
}

export async function openGameData<St extends { facts: FactsState }>(opts: GameDataOptions<St>): Promise<GameData<St>> {
  const now = opts.now ?? Date.now;
  const schedule = opts.schedule ?? ((fn: () => void, ms: number) => { setTimeout(fn, ms); });
  const snapshotEveryMs = opts.snapshotEveryMs ?? 10_000;
  const retryEveryMs = opts.retryEveryMs ?? 10_000;
  const backend = opts.backend ?? (await openDefaultBackend());
  const key = snapshotKey({ slices: opts.folder.slices, contentHash: opts.contentHash, codeVersion: opts.codeVersion });

  let device: DeviceMeta = (await backend.getMeta('device')) ?? newDeviceMeta();
  const all: GameEvent[] = await backend.allEvents();
  const ids = new Set(all.map(e => e.id));
  device = observe(device, all);
  const ownMax = all.reduce((m, e) => (e.dev === device.dev ? Math.max(m, seqOf(e)) : m), 0);
  if (ownMax >= device.nextSeq) device = { ...device, nextSeq: ownMax + 1 };
  await backend.setMeta('device', device);

  let snap: unknown = null;
  try { snap = await backend.getMeta('snapshot'); } catch { snap = null; }
  const restored = restore(opts.folder, snap, all, key);
  let folded = restored.folded;
  let version = 0;
  let pending: GameEvent[] = [];
  let writing: Promise<void> | null = null;
  let writeError: string | null = null;
  let lost = false;
  // changes counts fold changes; savedChange is the count the stored snapshot reflects
  let changes = restored.mode === 'snapshot' ? 0 : 1;
  let savedChange = 0;
  let lastSnapshotAt = 0;
  let snapshotQueued = false;
  let quarantined = (await backend.allQuarantine()).length;
  const listeners = new Set<(f: Folded<St>, v: number) => void>();

  function emit(): void {
    version++;
    for (const fn of listeners) fn(folded, version);
  }

  function stampAndFold(drafts: readonly GameEventDraft[]): GameEvent[] {
    const r = stamp(device, drafts, now());
    device = r.meta;
    for (const e of r.events) { all.push(e); ids.add(e.id); }
    pending.push(...r.events);
    folded = opts.folder.catchUp(folded, r.events, all).folded;
    changes++;
    return r.events;
  }

  function reconcile(): GameEvent[] {
    const out: GameEvent[] = [];
    if (!opts.reconcile) return out;
    for (let round = 0; round < 3; round++) {
      const cands = opts.reconcile(folded.state);
      // Facts are recorded once by key. The maths lift (learn.override, docs/v3/next/plan.md N9) is the only non-fact
      // draft a reconcile returns; folding it sets placement.overridden, so the next round no longer returns it.
      const seen = new Set<string>();
      const overrides = cands.filter((c) => {
        if (c.type !== 'learn.override') return false;
        const k = JSON.stringify([c.op, 'strand' in c ? c.strand : null, 'step' in c ? c.step : null]);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const extra = [...missingFacts(folded.state.facts, cands), ...overrides];
      if (extra.length === 0) break;
      out.push(...stampAndFold(extra));
    }
    return out;
  }

  async function writePending(): Promise<void> {
    while (pending.length > 0 && !lost) {
      const batch = pending.slice();
      const last = batch[batch.length - 1];
      const meta: DeviceMeta = { dev: last.dev, nextSeq: seqOf(last) + 1, hlc: last.hlc };
      try {
        await backend.putLocal(batch.map(e => ({ id: e.id, e, s: 0 as const })), meta, seqOf(batch[0]));
        pending = pending.slice(batch.length);
        writeError = null;
      } catch (err) {
        if (err instanceof SeqConflictError) { lost = true; emit(); return; }
        writeError = err instanceof Error ? err.message : String(err);
        schedule(() => { void requestWrite(); }, retryEveryMs);
        emit();
        return;
      }
    }
    await maybeSnapshot(false);
  }

  function requestWrite(): Promise<void> {
    writing ??= writePending().finally(() => { writing = null; });
    return writing;
  }

  async function maybeSnapshot(force: boolean): Promise<void> {
    if (changes === savedChange || pending.length > 0 || lost) return;
    const wait = lastSnapshotAt + snapshotEveryMs - now();
    if (!force && wait > 0) {
      if (!snapshotQueued) {
        snapshotQueued = true;
        schedule(() => { snapshotQueued = false; void maybeSnapshot(false); }, wait);
      }
      return;
    }
    const at = changes;
    try {
      await backend.setMeta('snapshot', toSnapshot(folded, key, now()));
      lastSnapshotAt = now();
      savedChange = at;
    } catch {
      // a snapshot is only a cache: the next start refolds from the events
    }
  }

  function commit(drafts: readonly GameEventDraft[]): GameEvent[] {
    if (lost) throw new Error('This tab no longer saves, because another tab took over.');
    if (drafts.length === 0) return [];
    const out = stampAndFold(drafts);
    out.push(...reconcile());
    emit();
    void requestWrite();
    return out;
  }

  async function ingest(raw: readonly unknown[], o: { fromServer: boolean } = { fromServer: false }): Promise<IngestResult> {
    const at = now();
    const valid: GameEvent[] = [];
    const bad: QuarantineRow[] = [];
    const batch = new Set<string>();
    let duplicates = 0;
    raw.forEach((x, i) => {
      const r = checkEvent(x);
      const rawId = typeof (x as { id?: unknown })?.id === 'string' ? ((x as { id: string }).id).slice(0, 80) : `bad-${at}-${i}`;
      if (!r.ok) { bad.push({ id: rawId, raw: x, reason: r.reason, at }); return; }
      const e = r.event;
      if (ids.has(e.id) || batch.has(e.id)) { duplicates++; return; }
      if (e.dev === device.dev) { bad.push({ id: rawId, raw: x, reason: 'an event from this device that this device does not have', at }); return; }
      batch.add(e.id);
      valid.push(e);
    });
    if (bad.length > 0) { await backend.putQuarantine(bad); quarantined += bad.length; }
    const added = new Set(valid.length > 0 ? await backend.putRemote(valid.map(e => ({ id: e.id, e, s: o.fromServer ? 1 as const : 0 as const }))) : []);
    const fresh = valid.filter(e => added.has(e.id) && !ids.has(e.id));
    duplicates += valid.length - fresh.length;
    let refolded = false;
    if (fresh.length > 0) {
      for (const e of fresh) { all.push(e); ids.add(e.id); }
      device = observe(device, fresh);
      const r = opts.folder.catchUp(folded, fresh, all);
      folded = r.folded;
      refolded = r.refolded;
      changes++;
      if (!lost) reconcile();
      emit();
      void requestWrite();
    }
    return { added: fresh.length, duplicates, quarantined: bad.length, refolded };
  }

  async function flush(): Promise<void> {
    await requestWrite();
    await maybeSnapshot(true);
  }

  const data: GameData<St> = {
    backend,
    device: () => device.dev,
    folded: () => folded,
    version: () => version,
    allEvents: () => all,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    commit,
    ingest,
    async importText(text, deps) {
      const p = parseSaveFile(text);
      if (p.kind === 'invalid') return p;
      if (p.kind === 'v3') {
        const r = await ingest(p.events);
        return { kind: 'v3', added: r.added, duplicates: r.duplicates, quarantined: r.quarantined };
      }
      const plan = planV2Import(p.save, folded.state.facts, deps);
      if (plan.status !== 'new') return { kind: 'v2', status: plan.status, babies: 0 };
      commit([plan.draft]);
      await flush();
      return { kind: 'v2', status: 'imported', babies: plan.babies };
    },
    exportFile: () => buildExport(all, now()),
    async markExported() { await backend.setMeta('export', { at: now() }); },
    async backupState() {
      const lastExport = (await backend.getMeta('export'))?.at ?? null;
      const lastSync = (await backend.getMeta('sync'))?.lastSuccess ?? null;
      const latest = Math.max(lastExport ?? 0, lastSync ?? 0);
      return { lastExport, lastSync, due: all.length > 0 && now() - latest > BACKUP_DUE_MS };
    },
    exclude(dev, on) {
      if (dev === device.dev) throw new Error('This device cannot exclude itself. Use excludeLocalPlay.');
      return commit([{ type: 'exclude', device: dev, on }]);
    },
    async excludeLocalPlay() {
      await flush();
      if (pending.length > 0) throw new Error('Saving failed, so the device id cannot change now.');
      const old = device.dev;
      const fresh = newDeviceMeta(device.hlc);
      await backend.setMeta('device', fresh);
      device = fresh;
      commit([{ type: 'exclude', device: old, on: true }]);
      await flush();
      return old;
    },
    async retryQuarantine() {
      const rows = await backend.allQuarantine();
      const fixed = rows.filter(r => checkEvent(r.raw).ok);
      if (fixed.length === 0) return 0;
      await backend.deleteQuarantine(fixed.map(r => r.id));
      quarantined -= fixed.length;
      const r = await ingest(fixed.map(x => x.raw));
      return r.added;
    },
    async quarantine() {
      const rows = await backend.allQuarantine();
      return rows.map(r => {
        const type = (r.raw as { type?: unknown } | null)?.type;
        return { id: r.id, type: typeof type === 'string' ? type.slice(0, 40) : '?', reason: r.reason };
      });
    },
    flush,
    status: () => ({
      backend: backend.kind, device: device.dev, events: all.length, pendingWrites: pending.length, writeError,
      lostToOtherTab: lost, quarantined, restoreMode: restored.mode,
    }),
    async reset() {
      lost = true;
      await backend.clear();
      backend.close();
    },
  };
  await data.retryQuarantine();
  void maybeSnapshot(true);
  return data;
}

/** Saves when Safari hides or leaves the page, so closing the iPad loses nothing that was written in memory. */
export function attachLifecycle(data: { flush(): Promise<void> }, win: Window = window): () => void {
  const onHide = () => { void data.flush(); };
  const onVisibility = () => { if (win.document.visibilityState === 'hidden') void data.flush(); };
  win.addEventListener('pagehide', onHide);
  win.document.addEventListener('visibilitychange', onVisibility);
  return () => {
    win.removeEventListener('pagehide', onHide);
    win.document.removeEventListener('visibilitychange', onVisibility);
  };
}
