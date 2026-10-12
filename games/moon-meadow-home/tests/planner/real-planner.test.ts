// G/tests/planner/real-planner.test.ts
// A smoke run of the planner on the real content: a year1 learner plays wishes, labels, eggs, doors and naming
// for six visits with every asset present. Nothing throws, placement ends, and every pick logs at least one item.
import { describe, it, expect } from 'vitest';
import { content } from '../../src/core/content/static.ts';
import { foldLearner, applyLearnEvent } from '../../src/core/learning/fold.ts';
import { pendingLearnFacts, isPlacing, currentStep } from '../../src/core/learning/status.ts';
import type { EventBase } from '../../src/core/learning/types.ts';
import { nextItem, nextEgg, learnResultPayload, mulberry32 } from '../../src/core/planner/index.ts';
import type { ItemRequest, PlanContext } from '../../src/core/planner/types.ts';
import { T0, DAY } from '../fixtures/events.ts';

const REQS: ItemRequest[] = [
  { strand: 'r', moments: ['wish', 'twin-wish', 'one-or-many', 'station-wish'], place: 'meadow' },
  { strand: 'r', moments: ['bath-wish'], place: 'bath', tags: ['bath'] },
  { strand: 's', moments: ['label', 'label-plural', 'first-sound'], place: 'shelf' },
  { strand: 's', moments: ['naming-bells', 'naming-garden'], place: 'nest' },
  { strand: 'm', moments: ['door-visit', 'wall', 'trim'], place: 'stalls', doors: { built: 14, own: 14 } },
];

describe('the planner on the real content', () => {
  it('plays six visits without throwing and ends placement in every strand', () => {
    const c = content;
    const rng = mulberry32(2026);
    const events: EventBase[] = [];
    let n = 0;
    const add = (t: number, draft: Record<string, unknown>) => { events.push({ id: `dev1:${++n}`, t, ...draft } as EventBase); };
    let l = foldLearner([], c);
    const kinds = new Set<string>();
    for (let visit = 0; visit < 6; visit++) {
      let t = T0 + visit * DAY;
      add(t, { type: 'visit.start', tz: 60 });
      l = foldLearner(events, c);
      for (let i = 0; i < 40; i++) {
        t += 30_000;
        const ctx: PlanContext = { c, l, now: t, assets: { clip: () => true, picture: () => true } };
        const egg = i % 5 === 0;
        const p = egg ? nextEgg(ctx, rng).pick : nextItem(ctx, REQS[i % REQS.length], rng);
        if (!p) continue;
        expect(p.items.length).toBeGreaterThan(0);
        kinds.add(p.carrier.kind);
        const r = rng() < 0.8 ? 'first' : 'miss';
        add(t, { ...learnResultPayload(p, { result: r, ms: 1500, place: 'test' }) });
        applyLearnEvent(l, events[events.length - 1], c);
        for (const f of pendingLearnFacts(l, c)) {
          add(t, { ...f });
          applyLearnEvent(l, events[events.length - 1], c);
        }
      }
    }
    for (const s of ['r', 's', 'm'] as const) {
      expect(isPlacing(l, s), s).toBe(false);
      expect(currentStep(l, c, s), s).not.toBeNull();
    }
    expect([...kinds].sort()).toEqual(expect.arrayContaining(['door', 'maths', 'spell', 'word']));
  });
});
