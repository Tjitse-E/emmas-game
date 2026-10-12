// The cached fold: written at most every 10 seconds and at visit end, rebuilt whenever in doubt.
import { SCHEMA_VERSION, seqOf } from '../events.ts';
import type { GameEvent } from '../events.ts';
import { isPlainObject } from '../checks.ts';
import { canonicalJson, sha256Hex } from '../hash.ts';
import type { AnySlice, Folded, Folder, FoldPosition } from './engine.ts';

export type Snapshot = {
  key: string;
  position: FoldPosition | null;
  seen: Record<string, number>;
  count: number;
  excluded: string[];
  state: unknown;
  at: number;
};

export type RestoreMode = 'snapshot' | 'incremental' | 'full';
export type RestoreResult<St> = { folded: Folded<St>; mode: RestoreMode; reason: string };

/** Changes when the event schema, any slice version, the content packs or the app build change. */
export function snapshotKey(input: { slices: readonly AnySlice[]; contentHash: string; codeVersion: string }): string {
  return sha256Hex(canonicalJson({
    schema: SCHEMA_VERSION,
    slices: input.slices.map(s => [s.name, s.version]),
    content: input.contentHash,
    code: input.codeVersion,
  }));
}

export function toSnapshot<St>(f: Folded<St>, key: string, at: number): Snapshot {
  return {
    key, position: f.position ? { ...f.position } : null, seen: { ...f.seen }, count: f.count,
    excluded: [...f.excluded], state: structuredClone(f.state), at,
  };
}

export function isSnapshot(x: unknown): x is Snapshot {
  return isPlainObject(x) && typeof x.key === 'string' && isPlainObject(x.seen) && Number.isInteger(x.count)
    && Array.isArray(x.excluded) && isPlainObject(x.state) && (x.position === null || isPlainObject(x.position));
}

export function restore<St>(folder: Folder<St>, snap: unknown, events: readonly GameEvent[], key: string): RestoreResult<St> {
  const full = (reason: string): RestoreResult<St> => ({ folded: folder.full(events), mode: 'full', reason });
  if (!isSnapshot(snap)) return full('no usable snapshot');
  if (snap.key !== key) return full('fold version changed');
  const fresh: GameEvent[] = [];
  let covered = 0;
  for (const e of events) {
    if ((snap.seen[e.dev] ?? 0) >= seqOf(e)) covered++;
    else fresh.push(e);
  }
  if (covered !== snap.count) return full('snapshot does not match the stored events');
  const base: Folded<St> = {
    state: structuredClone(snap.state) as St, position: snap.position, seen: { ...snap.seen },
    count: snap.count, excluded: [...snap.excluded],
  };
  if (fresh.length === 0) return { folded: base, mode: 'snapshot', reason: 'up to date' };
  const stepped = folder.step(base, fresh);
  return stepped ? { folded: stepped, mode: 'incremental', reason: `${fresh.length} new events` } : full('new events sort before the snapshot');
}
