// Place value types (Task A1a). Value types only: no import of core's events. Task A1 adds the
// state, fold and action types on top of these. Shared shapes come from contracts (R41).
import type { ErrorTag, ItemResult, LearnStrand, OutfitSlot, Pick as PlanPick, Result, StepId, Strand, WorldBaby } from '../../types/contracts.ts';

export type { ErrorTag, ItemResult, Result, StepId, Strand };
export type { Rng } from '../rng.ts';

/** A learning strand or the name strand. Same as contracts `LearnStrand`. */
export type AnyStrand = LearnStrand;

/** The planner's choice for one checked place moment, as the place logic reads it. */
export type ServedItem = {
  strand: Strand; step: StepId; items: string[]; carrier: string; scaffold: 1 | 2 | 3; probe: boolean;
  kind: 'current' | 'review' | 'mixed' | 'school' | 'side';
  /** The planner's own item ids, logged in learn.result (Task A1b). Absent in unit tests. */
  log?: string[];
  /** Things in the jar or heap when the planner chose the count (plural carriers). */
  count?: number;
  /** The planner's pick, for `learnResultPayload` (R17). Absent in unit tests: nothing is logged then. */
  pick?: PlanPick;
  /** The place that asked, for the log. */
  place?: string;
};

/** One word as places draw and check it. `picture` is the bare word (R13). */
export type WordView = {
  id: string; word: string; graphemes: string[]; picture: string; rStep: StepId; sStep: StepId; tags: string[];
  plural?: { word: string; ending: 's' | 'es'; graphemes: string[] };
};

// ---- Task A1: views of other workstreams' data, in the shapes place logic reads.

/** A baby as places read it: integration's world view baby (contracts C3, R28). */
export type BabyView = WorldBaby;

/** The learner as place logic reads it. Task A1b builds it from learning's slice (`toLearnerView`). */
export type LearnerView = {
  current: Record<Strand, StepId | null>;
  passed: { step: StepId; strand: Strand; t: number; visit: string }[];
  placed: { step: StepId; strand: Strand }[];
  placementEnded: Record<Strand, boolean>;
  /** True when the step is passed, placed, current or below the current step in its ladder. */
  reached(step: StepId): boolean;
  scaffold(strand: Strand, step: StepId): 1 | 2 | 3;
  passedOrPlaced(step: StepId): boolean;
};

export type Mark = '.' | '?' | '!';
export type PlotId = string;
export type Outfit = Partial<Record<OutfitSlot, string | null>>;
