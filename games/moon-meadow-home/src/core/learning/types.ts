// G/src/core/learning/types.ts
// Learner state and the learning events the fold reads. Shapes match contracts sections 1, 2 and 5.
import type { FluencyType, ItemId, LearnStrand, MomentKind, StepId, Strand } from '../content/types.ts';

export type Result = 'first' | 'miss' | 'helped';
export type ErrorTag = 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
export type Slot = 'current' | 'school' | 'side' | 'review' | 'mixed' | 'probe' | 'warmup' | 'golden' | 'name';
export type Box = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 6 is retired

export type EventBase = { id: string; t: number; type: string };
/** An event without the fields the store adds. Distributes over unions. */
export type Payload<E> = E extends unknown ? Omit<E, 'id' | 't'> : never;

export type VisitStartEvent = EventBase & { type: 'visit.start'; tz: number };
export type LearnResultEvent = EventBase & {
  type: 'learn.result';
  strand: LearnStrand;
  step: StepId | null;               // null for name reviews
  carrier: string;                   // carrierKey of the carrier shown
  items: { id: ItemId; r: Result }[];
  result: Result;
  ms: number | null;                 // decision time
  scaffold: 1 | 2 | 3;
  error: ErrorTag | null;
  place: string;
  moment: MomentKind;
  slot: Slot;
  probe: boolean;
};
export type StepPassedEvent = EventBase & { type: 'step.passed'; strand: Strand; step: StepId };
export type PlacementDoneEvent = EventBase & { type: 'placement.done'; strand: Strand; current: StepId; placed: StepId[]; side: StepId[] };
export type ProfileOverride = EventBase & { type: 'learn.override'; op: 'profile'; profile: string };
export type SetCurrentOverride = EventBase & { type: 'learn.override'; op: 'set-current'; strand: Strand; step: StepId; placed: StepId[]; side: StepId[] };
export type PlacedOverride = EventBase & { type: 'learn.override'; op: 'mark-placed' | 'unmark-placed'; strand: Strand; step: StepId };
export type SchoolOverride = EventBase & { type: 'learn.override'; op: 'school'; strand: Strand; step: StepId; on: boolean };
export type LearnOverrideEvent = ProfileOverride | SetCurrentOverride | PlacedOverride | SchoolOverride;
export type V2Seed = { strand: 'r' | 's'; item: ItemId; box: 0 | 1 };
export type ImportV2Event = EventBase & { type: 'import.v2'; hash: string; seeds: V2Seed[]; mathsV2Step?: number };
export type LearnEvent = VisitStartEvent | LearnResultEvent | StepPassedEvent | PlacementDoneEvent | LearnOverrideEvent | ImportV2Event;
export type LearnFact = Payload<StepPassedEvent> | Payload<PlacementDoneEvent> | Payload<SetCurrentOverride>;

export type ItemMemory = {
  box: Box;
  lastT: number;          // never decreases
  lastVisit: number;      // visit sequence number of the last result
  seen: number;           // results counted, probes included
  firsts: number;         // first tries outside probes and seeds
  seeded: boolean;        // set by a v2 seed
  placedInit: boolean;    // created in box 2 by placement
};
export type StepState = {
  level: 1 | 2 | 3;
  up: number;             // first tries in a row
  down: number;           // miss or helped in a row
  window: { r: Result; day: number }[];   // results at the top level, newest last, at most passWindow
  passed: boolean;
  passedT: number | null;
  placed: boolean;
  review: Result[];       // review results after the pass or placement
  reopened: boolean;
  closeRun: { r: Result; day: number }[];
  startT: number | null;  // first time served as current, school or side step
};
export type PlacementState = {
  done: boolean;
  lo: StepId;
  hi: StepId;
  floor: StepId;
  loVerified: boolean;
  hiFailed: boolean;
  openedDown: boolean;
  floorMissed: boolean;
  firstProbe: StepId | null;
  lastProbe: StepId | null;
  pending: { step: StepId; r: Result[] } | null;
  items: number;
  current: StepId | null; // set by placement.done or set-current
  /**
   * Steps a placement.done or set-current listed as placed or side, plus steps a parent marked or unmarked.
   * A loaded step below `current` that is not listed here counts as placed (R35): it was loaded by a later release.
   */
  listed: StepId[];
  /** A set-current override ended or moved this placement (a parent, a flow or the 1.0.1 maths lift). */
  overridden?: boolean;
};
export type VisitState = {
  seq: number;
  startT: number;
  tz: number;
  counts: Record<LearnStrand, number>;
  ladder: number;
  spell: number;
  golden: boolean;
  box0: Record<ItemId, number>;   // other results of the same strand since the item fell into box 0 this visit
  recent: string[];               // carrier keys, newest last
  /** Nest maths results of this visit, oldest first: their total and moment (docs/v3/next/plan.md 3.4). */
  eggs: { total: number; moment: MomentKind }[];
};
export type FluencyState = { median: number | null; computedAt: number; samples: number[] };
/** pair: the contrast pair of a Dutch-tagged error, when the result names it (a pair item or a twin carrier). */
export type RecentResult = { t: number; r: Result; err: ErrorTag | null; slot: Slot; pair?: string };
export type Learner = {
  v: 1;
  profile: string;
  lastT: number;
  items: Record<ItemId, ItemMemory>;
  steps: Record<StepId, StepState>;
  placement: Record<Strand, PlacementState>;
  side: Record<Strand, StepId[]>;
  school: Record<StepId, boolean>;   // parent overrides only
  visit: VisitState;
  newToday: Record<Strand, { day: number; ids: ItemId[] }>;
  fluency: Record<FluencyType, FluencyState>;
  imported: string[];
  recent: Record<LearnStrand, RecentResult[]>;   // at most 300 per strand
};
