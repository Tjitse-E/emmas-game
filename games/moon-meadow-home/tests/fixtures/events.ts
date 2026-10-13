// G/tests/fixtures/events.ts
// Event builders and time constants for learning and planner tests.
import type { ErrorTag, ImportV2Event, LearnOverrideEvent, LearnResultEvent, Payload, PlacementDoneEvent, Result, Slot, StepPassedEvent, V2Seed, VisitStartEvent } from '../../src/core/learning/types.ts';
import type { ItemId, LearnStrand, MomentKind, StepId, Strand } from '../../src/core/content/types.ts';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
/** 1 December 2026, 15:00 UTC, which is 17:00 in Cyprus (UTC+2). */
export const T0 = Date.UTC(2026, 11, 1, 15, 0, 0);
/** 9 October 2026, 14:00 UTC: Emma's first Wave A play, before 1.0.1 reached her (the maths lift's cut-off). */
export const WAVE_A_T0 = Date.UTC(2026, 9, 9, 14, 0, 0);

let seq = 0;
export function resetSeq(): void { seq = 0; }
function base<T extends string>(type: T, t: number): { id: string; t: number; type: T } {
  seq += 1;
  return { id: `dev1:${seq}`, t, type };
}

export const visitStart = (t: number, tz = 120): VisitStartEvent => ({ ...base('visit.start', t), tz });

export type ResultOpts = {
  strand: LearnStrand; step: StepId | null; items: ItemId[]; r: Result;
  slot?: Slot; scaffold?: 1 | 2 | 3; probe?: boolean; ms?: number | null; moment?: MomentKind;
  perItem?: Result[]; error?: ErrorTag | null; carrier?: string; place?: string;
};
export function result(t: number, o: ResultOpts): LearnResultEvent {
  return {
    ...base('learn.result', t),
    strand: o.strand, step: o.step, carrier: o.carrier ?? 'test',
    items: o.items.map((id, i) => ({ id, r: o.perItem?.[i] ?? o.r })),
    result: o.r, ms: o.ms === undefined ? 1500 : o.ms, scaffold: o.scaffold ?? 1, error: o.error ?? null,
    place: o.place ?? 'test', moment: o.moment ?? 'wish', slot: o.slot ?? (o.probe ? 'probe' : 'current'), probe: o.probe ?? false,
  };
}
export const passed = (t: number, strand: Strand, step: StepId): StepPassedEvent => ({ ...base('step.passed', t), strand, step });
export const placementDone = (t: number, strand: Strand, current: StepId, placed: StepId[], side: StepId[] = []): PlacementDoneEvent =>
  ({ ...base('placement.done', t), strand, current, placed, side });
export const override = (t: number, p: Payload<LearnOverrideEvent>): LearnOverrideEvent =>
  ({ ...base('learn.override', t), ...p }) as LearnOverrideEvent;
export const importV2 = (t: number, hash: string, seeds: V2Seed[]): ImportV2Event => ({ ...base('import.v2', t), hash, seeds });
/** Wraps a payload (a learn.result from learnResultPayload, or a pending fact) as a stored event. */
export const stamp = <P extends { type: string }>(t: number, p: P): P & { id: string; t: number } =>
  ({ ...p, ...base(p.type, t) });
