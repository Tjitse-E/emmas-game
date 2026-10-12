// G/src/core/learning/index.ts
// Public exports of the learning engine (contracts C5). errors.ts (A16), report.ts (A20), jewels.ts (B4)
// and criteria.ts (C4) are added here when they land.
export type * from './types.ts';
export * from './ids.ts';
export * from './time.ts';
export { nextBox, newMemory, updateMemory, isDue, dueAt } from './leitner.ts';
export { emptyFluency, isFast, recordFirstTry } from './fluency.ts';
export { moveScaffold } from './scaffold.ts';
export { newStepState, pushWindow, readyToPass, recordReview } from './mastery.ts';
export { searchList, initPlacement, recordProbe, nextProbe, placementEnd } from './placement.ts';
export type { IsSchool } from './placement.ts';
export * from './status.ts';
export { LEARNER_FOLD_VERSION, createLearner, applyLearnEvent, foldLearner, createLearnerSlice } from './fold.ts';
