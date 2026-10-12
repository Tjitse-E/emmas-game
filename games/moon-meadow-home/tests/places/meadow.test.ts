import { beforeEach, describe, expect, it } from 'vitest';
import { arrivalLines, arrivalPlan, bubbleSpot, liteFromFrames, meadowEdges } from '../../src/core/places/meadow.ts';
import { meadowBabies } from '../../src/core/heartbeat/meadow.ts';
import { ev, foldAll, hatched, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const ids = (events: Parameters<typeof foldAll>[0], release = '1.3') => meadowEdges({ places: foldAll(events), release }).map((e) => `${e.id}:${e.state}`);

describe('meadow edges', () => {
  it('shows the toy shelf and the stables to a new player', () => {
    expect(ids([])).toEqual(['toy-shelf:open', 'stables:open']);
  });

  it('shows the Bath Pond as a plot once announced and as a place once built', () => {
    const start = [ev('visit.start', { visit: 'v2', tz: 0 }), ev('opening.announced', { opening: 'bath-pond' })];
    expect(ids(start)).toContain('bath-pond:plot');
    expect(ids([...start, ev('building.done', { plot: 'bath-pond' })])).toContain('bath-pond:open');
    expect(ids([...start, ev('building.done', { plot: 'bath-pond' })])).not.toContain('bath-pond:plot');
  });

  it('sends a plot to its Building Day and an open place to its own scene', () => {
    const start = [ev('visit.start', { visit: 'v2', tz: 0 }), ev('opening.announced', { opening: 'bath-pond' })];
    const plot = meadowEdges({ places: foldAll(start), release: '1.0' }).find((e) => e.id === 'bath-pond');
    expect(plot).toMatchObject({ scene: 'building-day', params: { plot: 'bath-pond' } });
    const open = meadowEdges({ places: foldAll([...start, ev('building.done', { plot: 'bath-pond' })]), release: '1.0' }).find((e) => e.id === 'bath-pond');
    expect(open).toMatchObject({ scene: 'bath-pond', params: {} });
    expect(meadowEdges({ places: foldAll([]), release: '1.0' }).find((e) => e.id === 'stables')?.scene).toBe('stalls');
  });

  it('hides a place that is earned but not announced', () => {
    const hatch = Array.from({ length: 6 }, (_, i) => hatched(`b${i}`));
    expect(ids(hatch)).not.toContain('bath-pond:plot');
  });

  it('opens the Dressing Corner, Letter Lane and the map scroll on their announcements', () => {
    const out = ids([
      ev('visit.start', { visit: 'v1', tz: 0 }),
      ev('opening.announced', { opening: 'dressing' }), ev('opening.announced', { opening: 'letter-lane' }), ev('opening.announced', { opening: 'valley-map' }),
    ]);
    expect(out).toEqual(expect.arrayContaining(['dressing:open', 'letter-lane:open', 'map:open']));
  });

  it('shows the Post Box as a plot, then open', () => {
    const start = [ev('visit.start', { visit: 'v6', tz: 0 }), ev('opening.announced', { opening: 'post-box' })];
    expect(ids(start)).toContain('post-box:plot');
    expect(ids([...start, ev('building.done', { plot: 'post-box' })])).toContain('post-box:open');
  });

  it('shows the Salon gate once the Salon is built', () => {
    expect(ids([ev('building.done', { plot: 'salon' })])).toContain('salon:open');
  });

  it('hides places of a later release', () => {
    const out = ids([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'letter-lane' })], '1.1');
    expect(out).not.toContain('letter-lane:open');
  });

  it('gives every edge a target of at least 64 px inside the stage, and no two edges overlap', () => {
    const all = meadowEdges({
      places: foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ...['bath-pond', 'dressing', 'post-box', 'letter-lane', 'valley-map'].map((o) => ev('opening.announced', { opening: o })), ev('building.done', { plot: 'salon' })]),
      release: '1.3',
    });
    expect(all).toHaveLength(8);
    for (const e of all) {
      expect(e.w).toBeGreaterThanOrEqual(64); expect(e.h).toBeGreaterThanOrEqual(64);
      expect(e.x).toBeGreaterThanOrEqual(0); expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.x + e.w).toBeLessThanOrEqual(1180); expect(e.y + e.h).toBeLessThanOrEqual(820);
    }
    for (const a of all) for (const b of all) {
      if (a === b) continue;
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      expect(apart, `${a.id} and ${b.id}`).toBe(true);
    }
  });
});

describe('bubble spots', () => {
  it('floats a bubble beside its place, toward the middle, and keeps it on the stage', () => {
    for (const place of ['toy-shelf', 'stables', 'bath-pond', 'post-box', 'salon', 'meadow', 'meadow-wishes', 'stable-yard', 'somewhere']) {
      const p = bubbleSpot(place);
      expect(p.x - 60).toBeGreaterThanOrEqual(0);
      expect(p.x + 60).toBeLessThanOrEqual(1180);
      expect(p.y - 60).toBeGreaterThanOrEqual(104);
      expect(p.y + 60).toBeLessThanOrEqual(820);
    }
    expect(bubbleSpot('toy-shelf')).toEqual({ x: 99, y: 252 });
    expect(bubbleSpot('bath-pond')).toEqual({ x: 870, y: 656 });
    expect(bubbleSpot('stables')).toEqual({ x: 1030, y: 495 });
  });
});

describe('arrival (R54)', () => {
  it('greets a returning player once: Lumi says hello, then the egg is waiting', () => {
    expect(arrivalLines({ visitIndex: 2, arrivedThisVisit: false, openingDue: null })).toEqual(['lumi-hello-back', 'g-egg-waiting']);
    expect(arrivalPlan({ visitIndex: 2, arrivedThisVisit: false, openingDue: null })).toMatchObject({ greet: true, eggGoal: true });
    expect(arrivalPlan({ visitIndex: 2, arrivedThisVisit: true, openingDue: null })).toMatchObject({ greet: false, lines: ['g-egg-waiting'] });
  });

  it('lets a due opening speak first', () => {
    expect(arrivalLines({ visitIndex: 2, arrivedThisVisit: false, openingDue: 'bath-pond' })).toEqual(['mw-pond-ready', 'lumi-hello-back', 'g-egg-waiting']);
    expect(arrivalPlan({ visitIndex: 3, arrivedThisVisit: true, openingDue: 'bubbles' })).toMatchObject({ opening: 'bubbles', lines: [], eggGoal: false });
  });

  it('never speaks a nest opening in the meadow', () => {
    expect(arrivalPlan({ visitIndex: 4, arrivedThisVisit: true, openingDue: 'two-egg' })).toMatchObject({ opening: null, lines: ['g-egg-waiting'] });
  });

  it('does not greet in visit 1 and leaves the goal to the moon hint when it is due', () => {
    expect(arrivalLines({ visitIndex: 1, arrivedThisVisit: false, openingDue: null })).toEqual(['g-egg-waiting']);
    expect(arrivalLines({ visitIndex: 1, arrivedThisVisit: true, openingDue: null, moonHint: true })).toEqual([]);
  });
});

describe('lite unicorns (R63)', () => {
  it('switches on when the median frame is above 24 ms', () => {
    expect(liteFromFrames(Array.from({ length: 60 }, () => 16.7))).toBe(false);
    expect(liteFromFrames([...Array.from({ length: 40 }, () => 33), ...Array.from({ length: 10 }, () => 200)])).toBe(true);
    expect(liteFromFrames([...Array.from({ length: 50 }, () => 17), 400, 500, 600])).toBe(false);
    expect(liteFromFrames([40, 40])).toBe(false);
  });
});

describe('meadow babies (R57)', () => {
  it('stands favourites first among the twelve, even an old favourite in a herd of 45', () => {
    const herd = Array.from({ length: 45 }, (_, i) => ({ id: `b${i}`, order: i, favourite: i === 0 || i === 3 }));
    const shown = meadowBabies(herd).map((b) => b.id);
    expect(shown).toHaveLength(12);
    expect(shown.slice(0, 2)).toEqual(['b3', 'b0']);
    expect(shown[2]).toBe('b44');
  });
});
