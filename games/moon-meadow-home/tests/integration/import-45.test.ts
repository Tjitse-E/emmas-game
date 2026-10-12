// Master Review Focus 2: Emma's real v2 herd is large and arrives on Moving Day with rows, openings and pins due at once.
import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { createLearnerSlice } from '../../src/core/learning/index.ts';
import { createPlacesSlice, openingDue, openingCtx } from '../../src/core/places/index.ts';
import { mapV2 } from '../../src/core/save/v2.ts';
import { content } from '../../src/core/content/static.ts';
import { worldView } from '../../src/game/world-view.ts';
import { v2Deps } from '../../src/game/v2-deps.ts';
import { fakeDevice } from '../helpers/events.ts';
import { growV2Save } from './grow-v2.ts';

describe('an imported herd of 45', () => {
  const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
  const d = fakeDevice('aaaaaaaa');
  d.add([{ type: 'visit.start', visit: 'v1', tz: 120 }, mapV2(growV2Save(45) as never, v2Deps)] as never, 1_000);

  it('keeps every name', () => {
    const s = folder.full(d.events).state as never;
    const w = worldView(s, { hasName: () => true, firstSound: () => null }, 'v1');
    expect(w.herd.filter((b) => b.name !== null)).toHaveLength(45);
    expect(new Set(w.herd.map((b) => b.name)).size).toBe(45);
  });

  it('has 5 rows, an empty camp and a door for everyone', () => {
    const s = folder.full(d.events).state as never;
    const w = worldView(s, { hasName: () => true, firstSound: () => null }, 'v1');
    expect(w.herd).toHaveLength(45);
    expect(w.rowsBuilt).toBe(5);
    expect(w.camp).toEqual([]);
    expect(w.herd.every((b) => b.door !== null)).toBe(true);
  });

  it('announces at most one queue opening per visit over six visits', () => {
    const ctxExtra = { postBuilt: false, villageStoneLit: false, freshJewelWaiting: false, release: '1.0' } as const;
    const announcedIn: string[] = [];
    for (let v = 2; v <= 7; v++) {
      const t = 1_000 + v * 86_400_000;
      d.add([{ type: 'visit.start', visit: `v${v}`, tz: 120 }] as never, t);
      let s = folder.full(d.events).state as unknown as { places: never; learner: never };
      const due = openingDue(openingCtx(s.places, s.learner, ctxExtra));
      if (due) {
        d.add([{ type: 'opening.announced', opening: due }] as never, t + 1);
        announcedIn.push(due);
        s = folder.full(d.events).state as unknown as { places: never; learner: never };
        // A second opening in the same visit is never due.
        expect(openingDue(openingCtx(s.places, s.learner, ctxExtra))).toBeNull();
      }
    }
    // Each opening is announced once, and the large herd's earned places do come (Bath Pond at least).
    expect(new Set(announcedIn).size).toBe(announcedIn.length);
    expect(announcedIn.length).toBeGreaterThanOrEqual(1);
  });
});
