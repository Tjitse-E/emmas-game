// G/src/core/planner/rng.ts
// R25: one random generator for the whole app. The planner re-exports it.
export { mulberry32, shuffle, pick, makeRng } from '../rng.ts';
export type { Rng } from '../rng.ts';
