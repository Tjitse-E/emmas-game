// Recorded facts: one-time events with a natural key. The earliest in fold order wins and is never revoked.
// The keys match contracts FACT_KEYS. A pin.given is a fact only when its key is set (a moment pin).
import { payloadOf } from '../events.ts';
import type { EventOf, GameEvent, GameEventDraft, Payloads } from '../events.ts';
import type { Slice } from '../fold/engine.ts';

export const FACT_TYPES = [
  'step.passed', 'placement.done', 'jewel.placed', 'building.done', 'opening.announced', 'title.given', 'baby.named', 'import.v2',
  'pin.given', 'post.opened', 'novelty.given',
] as const;
export type FactType = (typeof FACT_TYPES)[number];
export type FactRec<K extends FactType> = { id: string; t: number; payload: Payloads[K] };
export type FactsState = { [K in FactType]: Record<string, FactRec<K>> };

export function factKey(d: GameEventDraft): string | null {
  switch (d.type) {
    case 'step.passed': return `${d.strand}:${d.step}`;
    case 'placement.done': return d.strand;
    case 'jewel.placed': return d.jewel;
    case 'building.done': return d.plot;
    case 'opening.announced': return d.opening;
    case 'title.given': return d.title;
    case 'baby.named': return d.baby;
    case 'import.v2': return d.hash;
    case 'pin.given': return d.key;
    case 'post.opened': return d.post;
    case 'novelty.given': return d.item;
    default: return null;
  }
}

function emptyFacts(): FactsState {
  return {
    'step.passed': {}, 'placement.done': {}, 'jewel.placed': {}, 'building.done': {}, 'opening.announced': {},
    'title.given': {}, 'baby.named': {}, 'import.v2': {}, 'pin.given': {}, 'post.opened': {}, 'novelty.given': {},
  };
}

export const factsSlice: Slice<'facts', FactsState> = {
  name: 'facts',
  version: '2',
  init: emptyFacts,
  apply(s, e) {
    const k = factKey(e);
    if (k === null) return s;
    const table = s[e.type as FactType] as Record<string, FactRec<FactType>>;
    if (!Object.hasOwn(table, k)) {
      table[k] = { id: e.id, t: e.t, payload: payloadOf(e as EventOf<FactType>) };
    }
    return s;
  },
};

export function hasFact(facts: FactsState, d: GameEventDraft): boolean {
  const k = factKey(d);
  return k !== null && Object.hasOwn(facts[d.type as FactType], k);
}

/** True for an event that is not a fact, or that is the winning (earliest) event for its key. */
export function isWinningFact(facts: FactsState, e: GameEvent): boolean {
  const k = factKey(e);
  if (k === null) return true;
  return facts[e.type as FactType][k]?.id === e.id;
}

/** The candidate facts that are not recorded yet, each key once. Non-fact drafts are dropped. */
export function missingFacts(facts: FactsState, candidates: readonly GameEventDraft[]): GameEventDraft[] {
  const taken = new Set<string>();
  return candidates.filter(c => {
    const k = factKey(c);
    if (k === null) return false;
    const tag = `${c.type}|${k}`;
    if (taken.has(tag) || hasFact(facts, c)) return false;
    taken.add(tag);
    return true;
  });
}
