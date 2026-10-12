// G/src/core/planner/index.ts
// Public exports of the session planner (contracts C6).
export type * from './types.ts';
export { mulberry32, shuffle, pick, makeRng } from './rng.ts';
export { carrierFor, carrierChoices, carrierKey } from './carriers.ts';
export { nextItem } from './select.ts';
export { visitStats, isTired, spellingShareLow, wantsLabelBubble, leastPractisedStrand, visitRange, shouldVisitDoor } from './visit.ts';
export type { VisitStats } from './visit.ts';
export { eggKindOf, eggMoments, nextEgg, nextRack } from './eggs.ts';
export type { EggOffer } from './eggs.ts';
export { nextNameReviews } from './names.ts';
export type { NameCandidate } from './names.ts';
export { learnResultPayload } from './result.ts';
export type { Outcome } from './result.ts';
