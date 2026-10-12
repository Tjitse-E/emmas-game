// Place value types (Task A1a). Value types only: no import of core's events. Task A1 adds the
// state, fold and action types on top of these. Shared shapes come from contracts (R41).
import type { ErrorTag, ItemResult, LearnStrand, Result, StepId, Strand } from '../../types/contracts.ts';

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
};

/** One word as places draw and check it. `picture` is the bare word (R13). */
export type WordView = {
  id: string; word: string; graphemes: string[]; picture: string; rStep: StepId; sStep: StepId; tags: string[];
  plural?: { word: string; ending: 's' | 'es'; graphemes: string[] };
};
