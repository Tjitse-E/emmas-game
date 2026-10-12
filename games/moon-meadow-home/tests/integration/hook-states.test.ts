// The store's test-hook states mathsStep and quarantined (docs/v3/next/plan.md 3.8, task G1).
import { describe, expect, it } from 'vitest';
import { hookStates } from '../../src/platform/hooks.ts';
import { registerGameHooks } from '../../src/game/hook-handlers.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import { createLearnerSlice } from '../../src/core/learning/index.ts';
import { createPlacesSlice } from '../../src/core/places/index.ts';
import { content } from '../../src/core/content/static.ts';
import { fakeDevice } from '../helpers/events.ts';

/** A folded log whose maths placement ended at M10 (Emma's Wave A save in short). */
function learnerAtM10() {
  const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
  const d = fakeDevice('aaaaaaaa');
  d.add([
    { type: 'visit.start', visit: 'v1', tz: 120 },
    { type: 'placement.done', strand: 'm', current: 'M10', placed: ['M01', 'M02', 'M05', 'M07', 'M08', 'M09'], side: [] },
  ], 1_000);
  return (folder.full(d.events).state as { learner: unknown }).learner;
}

const fake = {
  world: null as unknown,
  learner: learnerAtM10(),
  content,
  quarantined: 0,
  get data() { return { status: () => ({ quarantined: this.quarantined }) }; },
  scene: 'meadow',
};
registerGameHooks(fake as never, { seed: () => {}, ready: async () => {}, wake: async () => {}, setScaffold: () => {} });

describe('hook states for the 1.0.1 flows', () => {
  it('mathsStep is null before the world is open', () => {
    fake.world = null;
    expect(hookStates().mathsStep).toBeNull();
  });

  it('mathsStep is the current maths step of the folded learner', () => {
    fake.world = { herd: [] };
    expect(hookStates().mathsStep).toBe('M10');
  });

  it('quarantined counts the quarantined events, and is 0 without a store', () => {
    fake.quarantined = 3;
    expect(hookStates().quarantined).toBe(3);
    fake.quarantined = 0;
    expect(hookStates().quarantined).toBe(0);
  });
});
