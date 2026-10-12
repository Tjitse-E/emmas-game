// Folds the event log into state through slices. A fold never creates events.
import { compareEvents, seqOf } from '../events.ts';
import type { GameEvent } from '../events.ts';
import { sortEvents } from '../merge.ts';

/** Read access to the other slices while one event is applied. Slices earlier in the list already include this event. */
export type FoldCtx = { get<T>(slice: string): T };

/**
 * One part of the folded state. Rules: state is plain JSON data (no Map, Set, Date or class), apply may change
 * the state in place and returns it, apply ignores event types it does not know, and `version` changes whenever
 * the fold logic changes (it is part of the snapshot key).
 */
export interface Slice<N extends string, S> {
  readonly name: N;
  /** A number or a string (contracts C3); only its text matters, in the snapshot key. */
  readonly version: number | string;
  init(): S;
  apply(state: S, ev: GameEvent, ctx: FoldCtx): S;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySlice = Slice<string, any>;
export type StateOf<L extends readonly AnySlice[]> = { [S in L[number] as S['name']]: ReturnType<S['init']> };

export type FoldPosition = { hlc: string; dev: string; seq: number };
export type Folded<St> = {
  state: St;
  /** The last folded event in fold order, or null for an empty log. */
  position: FoldPosition | null;
  /** Highest sequence folded per device, excluded devices included. */
  seen: Record<string, number>;
  /** Number of events folded, excluded devices included. */
  count: number;
  /** Device ids whose events are left out (exclude events). */
  excluded: string[];
};

export interface Folder<St> {
  readonly slices: readonly AnySlice[];
  initial(): Folded<St>;
  /** Folds the whole log from scratch. The input may be in any order. */
  full(events: readonly GameEvent[]): Folded<St>;
  /** Folds new events on top, changing `f` in place. Returns null, with `f` untouched, when a full refold is needed. */
  step(f: Folded<St>, events: readonly GameEvent[]): Folded<St> | null;
  /** step, or a full refold of `all` when step cannot be used. `all` must contain `fresh`. */
  catchUp(f: Folded<St>, fresh: readonly GameEvent[], all: readonly GameEvent[]): { folded: Folded<St>; refolded: boolean };
}

export function excludedDevices(sorted: readonly GameEvent[]): string[] {
  const on = new Map<string, boolean>();
  for (const e of sorted) if (e.type === 'exclude') on.set(e.device, e.on);
  return [...on].filter(([, v]) => v).map(([d]) => d).sort();
}

export function createFolder<const L extends readonly AnySlice[]>(slices: L): Folder<StateOf<L>> {
  const names = new Set<string>();
  for (const s of slices) {
    if (names.has(s.name)) throw new Error(`two slices are called ${s.name}`);
    names.add(s.name);
  }
  type St = StateOf<L>;

  function initial(): Folded<St> {
    const state: Record<string, unknown> = {};
    for (const s of slices) state[s.name] = s.init();
    return { state: state as St, position: null, seen: {}, count: 0, excluded: [] };
  }

  function track(f: Folded<St>, e: GameEvent): void {
    const seq = seqOf(e);
    f.position = { hlc: e.hlc, dev: e.dev, seq };
    if ((f.seen[e.dev] ?? 0) < seq) f.seen[e.dev] = seq;
    f.count++;
  }

  function applyOne(f: Folded<St>, e: GameEvent, excluded: ReadonlySet<string>): void {
    if (e.type === 'exclude' || !excluded.has(e.dev)) {
      const st = f.state as Record<string, unknown>;
      const ctx: FoldCtx = { get: <T>(name: string) => st[name] as T };
      for (const s of slices) st[s.name] = s.apply(st[s.name], e, ctx);
    }
    track(f, e);
  }

  function full(events: readonly GameEvent[]): Folded<St> {
    const sorted = sortEvents(events);
    const f = initial();
    f.excluded = excludedDevices(sorted);
    const ex = new Set(f.excluded);
    for (const e of sorted) applyOne(f, e, ex);
    return f;
  }

  function step(f: Folded<St>, events: readonly GameEvent[]): Folded<St> | null {
    const sorted = sortEvents(events);
    if (sorted.length === 0) return f;
    if (sorted.some(e => e.type === 'exclude')) return null;
    const pos = f.position;
    if (pos && compareEvents(sorted[0], { id: `${pos.dev}:${pos.seq}`, hlc: pos.hlc, dev: pos.dev, t: 0, v: 1 }) <= 0) return null;
    const ex = new Set(f.excluded);
    for (const e of sorted) applyOne(f, e, ex);
    return f;
  }

  function catchUp(f: Folded<St>, fresh: readonly GameEvent[], all: readonly GameEvent[]) {
    const stepped = step(f, fresh);
    return stepped ? { folded: stepped, refolded: false } : { folded: full(all), refolded: true };
  }

  return { slices, initial, full, step, catchUp };
}
