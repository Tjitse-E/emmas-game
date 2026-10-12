// A real ActionCtx: a folded log with two named babies, its world view and the real content,
// so a translator that reads ctx.state, ctx.content, ctx.now or world.byId is tested against real data.
import { createGameFolder } from '../../src/core/world/index.ts';
import { createLearnerSlice } from '../../src/core/learning/index.ts';
import { createPlacesSlice } from '../../src/core/places/index.ts';
import { content } from '../../src/core/content/static.ts';
import { worldView } from '../../src/game/world-view.ts';
import { fakeDevice, hatch, named } from '../helpers/events.ts';
import type { ActionCtx } from '../../src/types/contracts.ts';

export function fullCtx(): ActionCtx {
  const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
  const d = fakeDevice('aaaaaaaa');
  d.add([{ type: 'visit.start', visit: 'v1', tz: 120 }, hatch('b1'), named('b1', 'Pip'), hatch('b2'), named('b2', 'Tam')], 1_000);
  const state = folder.full(d.events).state as never;
  const world = worldView(state, { hasName: () => true, firstSound: (n) => n[0].toLowerCase() }, 'v1');
  return { visit: 'v1', now: 2_000, state, world, content, heartedThisVisit: () => false } as never;
}
