import { beforeEach, describe, expect, it } from 'vitest';
import { earned, isAnnounced, openingCtx, openingDefs, openingDue, reachedFromPlaces, type OpeningCtx } from '../../src/core/places/openings.ts';
import type { GameState } from '../../src/types/contracts.ts';
import { baby, ev, foldAll, imported, learner, resetSeq, visitStart, worldOf } from './helpers.ts';

beforeEach(resetSeq);

const ctx = (o: Partial<OpeningCtx> = {}): OpeningCtx => ({
  visitIndex: 2, herd: 0, announced: {}, announcedThisVisit: false, release: '1.3', mathsPlacementEnded: false,
  postBuilt: false, villageStoneLit: false, reachedR33: false, freshJewelWaiting: false, ...o,
});

describe('opening queue', () => {
  it('announces nothing from the queue in visit 1', () => {
    expect(openingDue(ctx({ visitIndex: 1, herd: 30 }))).toBeNull();
  });

  it('follows the order and skips what is not earned', () => {
    expect(openingDue(ctx({ herd: 3 }))).toBe('bubbles');
    expect(openingDue(ctx({ herd: 6 }))).toBe('bath-pond');
  });

  it('announces at most one thing per visit, even for a herd of 45 on Moving Day', () => {
    expect(openingDue(ctx({ herd: 45, announcedThisVisit: true }))).toBeNull();
  });

  it('brings the first fresh jewel ahead of the queue', () => {
    expect(openingDue(ctx({ herd: 6, freshJewelWaiting: true }))).toBe('jewels');
    expect(openingDue(ctx({ herd: 6, freshJewelWaiting: true, announced: { jewels: 'v2' } }))).toBe('bath-pond');
  });

  it('skips openings of a later release', () => {
    expect(openingDue(ctx({ herd: 30, release: '1.0', announced: { 'bath-pond': 'v2', bubbles: 'v3' } }))).toBeNull();
  });

  it('gives a herd of 25 one new thing per visit in the expected order', () => {
    const seen: string[] = [];
    let announced: Record<string, string> = {};
    for (let v = 2; v <= 9; v++) {
      const id = openingDue(ctx({ visitIndex: v, herd: 25, announced, mathsPlacementEnded: v >= 3, postBuilt: 'post-box' in announced }));
      if (id) { seen.push(id); announced = { ...announced, [id]: `v${v}` }; }
    }
    expect(seen).toEqual(['bath-pond', 'bubbles', 'two-egg', 'dressing', 'post-box', 'notes', 'letter-lane', 'come-along']);
  });

  it('knows each earned rule', () => {
    expect(earned('bath-pond', ctx({ herd: 4 }))).toBe(false);
    expect(earned('bath-pond', ctx({ herd: 5 }))).toBe(true);
    expect(earned('post-box', ctx({ herd: 15 }))).toBe(true);
    expect(earned('letter-lane', ctx({ herd: 19 }))).toBe(false);
    expect(earned('two-egg', ctx({ mathsPlacementEnded: true }))).toBe(true);
    expect(earned('notes', ctx({ postBuilt: true }))).toBe(true);
    expect(earned('valley-map', ctx({ villageStoneLit: true }))).toBe(true);
    expect(earned('asking-wishes', ctx({ reachedR33: true }))).toBe(true);
    expect(earned('come-along', ctx({ herd: 12, visitIndex: 5 }))).toBe(false);
    expect(earned('come-along', ctx({ herd: 12, visitIndex: 6 }))).toBe(true);
  });

  it('builds its context from the fold, ignoring rewards that may share a visit', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 0 }), ev('visit.end', { visit: 'v1', reason: 'goodnight' }),
      ev('visit.start', { visit: 'v2', tz: 0 }), ev('opening.announced', { opening: 'hundred-party' }),
    ]);
    const c = openingCtx(s, learner(), { postBuilt: false, villageStoneLit: false, freshJewelWaiting: false });
    expect(c.visitIndex).toBe(2);
    expect(c.announcedThisVisit).toBe(false);
    expect(isAnnounced(s, 'hundred-party')).toBe(true);
    expect(isAnnounced(s, 'bubbles')).toBe(false);
  });
});


describe('opening queue over the folded log', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `b${i + 1}`);

  it('a herd of 45 on Moving Day: nothing in visit 1, then one opening per visit', () => {
    const log = [visitStart('v1'), imported(ids(45))];
    const seen: string[] = [];
    expect(openingDue(openingCtx(foldAll(log), null, { release: '1.0' }))).toBeNull();
    for (let v = 2; v <= 7; v++) {
      log.push(visitStart(`v${v}`));
      const first = openingDue(openingCtx(foldAll(log), null, { release: '1.0' }));
      if (first) {
        log.push(ev('opening.announced', { opening: first }));
        seen.push(first);
      }
      expect(openingDue(openingCtx(foldAll(log), null, { release: '1.0' }))).toBeNull();
    }
    expect(seen).toEqual(['bath-pond', 'bubbles']);
  });

  it('answers in the contracts form over the store state and world view', () => {
    const places = foldAll([visitStart('v1'), visitStart('v2'), imported(ids(6))]);
    const herd = ids(6).map((id, i) => baby(id, `Baby${i}`, { order: i + 1 }));
    const world = worldOf(places, herd);
    expect(openingDue({ places } as unknown as GameState, world)).toBe('bath-pond');
    expect(isAnnounced(world, 'bath-pond')).toBe(false);
    const after = foldAll([visitStart('v1'), visitStart('v2'), imported(ids(6)), ev('opening.announced', { opening: 'bath-pond' })]);
    expect(isAnnounced(worldOf(after, herd), 'bath-pond')).toBe(true);
    expect(openingDue({ places: after } as unknown as GameState, worldOf(after, herd))).toBeNull();
  });

  it('reads maths placement and R33 from the places fold when no learner view is given', () => {
    const s = foldAll([
      visitStart('v1'), visitStart('v2'),
      ev('placement.done', { strand: 'm', current: 'M09', placed: [], side: [] }),
      ev('placement.done', { strand: 'r', current: 'R34', placed: [], side: [] }),
    ]);
    const c = openingCtx(s, { v: 1, profile: 'year1' });
    expect(c.mathsPlacementEnded).toBe(true);
    expect(c.reachedR33).toBe(true);
    expect(reachedFromPlaces(foldAll([ev('step.passed', { strand: 'r', step: 'R21' })]), 'R33')).toBe(false);
    expect(reachedFromPlaces(foldAll([ev('step.passed', { strand: 'r', step: 'R33' })]), 'R33')).toBe(true);
  });

  it('counts a built Post Box for the notes opening', () => {
    const s = foldAll([visitStart('v1'), ev('building.done', { plot: 'post-box' })]);
    expect(openingCtx(s, null).postBuilt).toBe(true);
  });

  it('keeps welcome, Moving Day and the moon hint out of the queue', () => {
    const queue = openingDefs.map((d) => d.id);
    for (const id of ['welcome', 'moving-day', 'moon-hint']) expect(queue).not.toContain(id);
    expect(queue[0]).toBe('bath-pond');
  });
});
