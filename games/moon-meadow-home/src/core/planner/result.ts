// G/src/core/planner/result.ts
// The only builder of learn.result payloads (contracts C6, R17). The actions router adds visit, baby and heart.
import type { ItemId } from '../content/types.ts';
import type { ErrorTag, LearnResultEvent, Payload, Result } from '../learning/types.ts';
import { carrierKey } from './carriers.ts';
import type { Pick } from './types.ts';

export type Outcome = {
  result: Result;
  ms: number | null;
  place: string;
  error?: ErrorTag | null;
  slots?: { id: ItemId; r: Result }[];   // spelling: one entry per own slot
};

/** Core accepts a whole number of milliseconds up to one hour; anything else is not a usable time. */
const MS_MAX = 3_600_000;
function msOf(ms: number | null): number | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
  return Math.min(Math.round(ms), MS_MAX);
}

export function learnResultPayload(pick: Pick, o: Outcome): Payload<LearnResultEvent> {
  const items = o.slots && o.slots.length > 0
    ? o.slots.map(s => ({ id: s.id, r: s.r }))
    : pick.items.map(id => ({ id, r: o.result }));
  return {
    type: 'learn.result',
    strand: pick.strand,
    step: pick.step,
    carrier: carrierKey(pick.carrier),
    items,
    result: o.result,
    ms: msOf(o.ms),
    scaffold: pick.scaffold,
    error: o.error ?? null,
    place: o.place,
    moment: pick.moment,
    slot: pick.slot,
    probe: pick.probe,
  };
}
