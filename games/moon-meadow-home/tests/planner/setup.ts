// G/tests/planner/setup.ts
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import type { Content, StepId, Strand } from '../../src/core/content/types.ts';
import type { AssetIndex, PlanContext } from '../../src/core/planner/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

export const allAssets: AssetIndex = { clip: () => true, picture: () => true };
export const VISIT2 = T0 + 3 * DAY;

/** A learner placed at the given steps, now in a second visit three days later. */
export function setup(steps: Partial<Record<Strand, StepId>>, opts: { school?: boolean; content?: Content } = {}) {
  resetSeq();
  const c = opts.content ?? miniContent();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (const [strand, step] of Object.entries(steps) as [Strand, StepId][]) {
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, strand, step)));
  }
  if (opts.school === false) {
    evs.push(override(T0 + 2, { type: 'learn.override', op: 'school', strand: 'r', step: 'R19', on: false }));
    evs.push(override(T0 + 2, { type: 'learn.override', op: 'school', strand: 's', step: 'S10', on: false }));
  }
  evs.push(visitStart(VISIT2));
  const now = VISIT2 + 60_000;
  const ctx = (extra: LearnEvent[] = [], assets: AssetIndex = allAssets): PlanContext =>
    ({ c, l: foldLearner([...evs, ...extra], c), now, assets });
  return { c, evs, now, ctx };
}
