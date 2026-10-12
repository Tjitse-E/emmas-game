// Name builds for the parent corner and the unknown names the generator should add.
import type { GameEvent, NameOutcome, NameRoute } from '../events.ts';
import type { Slice } from '../fold/engine.ts';
import { createFolder } from '../fold/engine.ts';
import { factsSlice, isWinningFact } from './facts.ts';
import type { FactsState } from './facts.ts';

export const NAME_LOG_CAP = 200;

export type NameBuildRec = {
  at: string; t: number; baby: string | null; gems: string[]; phonemes: string; route: NameRoute;
  outcome: NameOutcome; listName: string | null; strong: boolean;
};
export type UnknownName = {
  spelling: string; gems: string[]; phonemes: string; count: number; firstT: number; lastT: number; fromV2: boolean;
};
export type NamesState = {
  recent: NameBuildRec[];
  blocked: NameBuildRec[];
  unknown: Record<string, UnknownName>;
  totals: Record<NameOutcome, number>;
};

function pushCapped<T>(list: T[], item: T): void {
  list.push(item);
  if (list.length > NAME_LOG_CAP) list.shift();
}

function addUnknown(s: NamesState, gems: string[], phonemes: string, t: number, fromV2: boolean): void {
  const spelling = gems.join('');
  if (!spelling) return;
  const u = s.unknown[spelling];
  if (u) { u.count++; u.lastT = Math.max(u.lastT, t); u.fromV2 ||= fromV2; }
  else s.unknown[spelling] = { spelling, gems: [...gems], phonemes, count: 1, firstT: t, lastT: t, fromV2 };
}

export const namesSlice: Slice<'names', NamesState> = {
  name: 'names',
  version: '1',
  init: () => ({ recent: [], blocked: [], unknown: {}, totals: { 'no-vowel': 0, blocked: 0, list: 0, unknown: 0, chosen: 0 } }),
  apply(s, e, ctx) {
    if (e.type === 'name.built') {
      const rec: NameBuildRec = {
        at: e.id, t: e.t, baby: e.baby, gems: [...e.gems], phonemes: e.phonemes, route: e.route,
        outcome: e.outcome, listName: e.listName, strong: e.strong,
      };
      pushCapped(s.recent, rec);
      s.totals[e.outcome]++;
      if (e.outcome === 'blocked') pushCapped(s.blocked, rec);
      if (e.outcome === 'unknown') addUnknown(s, e.gems, e.phonemes, e.t, false);
    } else if (e.type === 'import.v2' && isWinningFact(ctx.get<FactsState>('facts'), e)) {
      for (const w of e.nameWishes) addUnknown(s, w.gems, w.phonemes, e.t, true);
    }
    return s;
  },
};

const unknownFolder = createFolder([factsSlice, namesSlice] as const);

/** Unknown names in a log, oldest first. Used by the save server and by names:pull. */
export function unknownNamesFrom(events: readonly GameEvent[]): UnknownName[] {
  const { state } = unknownFolder.full(events);
  return Object.values(state.names.unknown).sort((a, b) => a.firstT - b.firstT || a.spelling.localeCompare(b.spelling));
}
