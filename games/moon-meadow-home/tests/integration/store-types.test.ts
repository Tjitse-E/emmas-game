// Compile-time check: the store's precise types fit the contracts (C3, C6, C7) other lanes code against.
// npm run check type-checks this file; the test itself only makes Vitest load it.
import { describe, expect, it } from 'vitest';
import type { Content, GameState, Learner, PlanContext, World } from '../../src/types/contracts.ts';
import type { FullState } from '../../src/game/world-view.ts';
import type { content } from '../../src/core/content/static.ts';
import type { game } from '../../src/game.svelte.ts';

type Fits<A extends B, B> = A;
export type StateFits = Fits<FullState, GameState>;
export type LearnerFits = Fits<FullState['learner'], Learner>;
export type ContentFits = Fits<typeof content, Content>;
export type CtxFits = Fits<ReturnType<typeof game.planContext>, PlanContext>;
export type WorldFits = Fits<typeof game.world, World>;
export type DispatchFits = Fits<Parameters<typeof game.dispatch>[0], { type: string }>;

describe('store types', () => {
  it('compile against the contracts', () => { expect(true).toBe(true); });
});
