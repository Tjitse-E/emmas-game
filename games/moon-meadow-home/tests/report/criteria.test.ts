import { beforeEach, describe, expect, it } from 'vitest';
import {
  CONTRAST_STEPS, dutchShare, eggsPerVisit, firstTryAccuracy, freshJewelsDragged, helpedShare, idleFlags, jewelShare, playWeek,
  refusedNames, report, reviewAccuracy, roleplayShare, sortEvents, spellingShare, stepsPassed, visitsPerWeek,
} from '../../src/core/report/criteria.ts';
import type { GameEvent, Payloads } from '../../src/core/events.ts';
import type { ErrorTag, LearnStrand, Result } from '../../src/types/contracts.ts';
import { DAY, ev, hatched, resetSeq, T0 } from '../places/helpers.ts';

beforeEach(resetSeq);
const visit = (id: string, t: number, body: GameEvent[] = [], len = 600_000): GameEvent[] =>
  [ev('visit.start', { visit: id, tz: 120 }, t), ...body, ev('visit.end', { visit: id, reason: 'goodnight' }, t + len)];
const res = (strand: LearnStrand, step: string | null, result: Result, t: number, extra: Partial<Payloads['learn.result']> = {}) =>
  ev('learn.result', {
    visit: 'v', strand, step, carrier: 'x', items: [], result, ms: 1000, scaffold: 3, error: null, place: 'nest',
    moment: 'wish', slot: 'current', probe: false, baby: null, heart: false, ...extra,
  }, t);
const many = (n: number, f: (i: number) => GameEvent) => Array.from({ length: n }, (_, i) => f(i));
const at = (e: GameEvent, t: number): GameEvent => ({ ...e, t });

describe('report criteria (spec 1.3)', () => {
  it('play weeks start at the first visit', () => {
    expect(playWeek(T0, T0)).toBe(1);
    expect(playWeek(T0, T0 + 6 * DAY)).toBe(1);
    expect(playWeek(T0, T0 + 7 * DAY)).toBe(2);
  });

  it('E1 counts visits per play week', () => {
    expect(visitsPerWeek([...visit('a', T0), ...visit('b', T0 + DAY), ...visit('c', T0 + 8 * DAY)])).toEqual({ 1: 2, 2: 1 });
  });

  it('E2 takes the median eggs per visit without building or row eggs', () => {
    let n = 0;
    const h = (src: 'nest' | 'building' | 'row') => at(hatched(`b${n++}`, src), T0 + 1000);
    const out = eggsPerVisit([
      ...visit('a', T0, [h('nest'), h('nest'), h('nest'), h('building'), h('row')]),
      ...visit('b', T0 + DAY, many(10, () => h('nest'))),
      ...visit('c', T0 + 2 * DAY, [h('nest')]),
    ]);
    expect(out).toEqual({ perVisit: [3, 10, 1], median: 3, max: 10 });
  });

  it('E3 is the share of visit time outside the heartbeat places', () => {
    const out = roleplayShare(visit('a', T0, [
      ev('place.enter', { visit: 'a', place: 'nest' }, T0),
      ev('place.leave', { visit: 'a', place: 'nest' }, T0 + 240_000),
      ev('place.enter', { visit: 'a', place: 'bath-pond' }, T0 + 240_000),
    ]));
    expect(out[1]).toBeCloseTo(0.6, 5);
  });

  it('E3 leaves the parent corner out of the visit time', () => {
    const out = roleplayShare(visit('a', T0, [
      ev('place.enter', { visit: 'a', place: 'nest' }, T0),
      ev('place.enter', { visit: 'a', place: 'parent' }, T0 + 200_000),
      ev('place.enter', { visit: 'a', place: 'meadow' }, T0 + 400_000),
    ]));
    expect(out[1]).toBeCloseTo(0.5, 5);
  });

  it('E4 counts name builds refused for another reason than no vowel or blocked', () => {
    const nb = (outcome: string) => ev('name.built', {
      visit: 'a', baby: null, gems: [], phonemes: '', route: 'bell', outcome: outcome as Payloads['name.built']['outcome'], listName: null, strong: false,
    });
    expect(refusedNames(['no-vowel', 'blocked', 'list', 'unknown', 'chosen'].map(nb))).toBe(0);
    expect(refusedNames([nb('list'), nb('refused')])).toBe(1);
  });

  it('E5 checks whether each of her first three fresh jewels was dragged in that visit or the next', () => {
    const out = freshJewelsDragged([
      ...visit('a', T0, [ev('step.passed', { strand: 's', step: 'S20' }, T0 + 1), ev('jewel.placed', { jewel: 'S20', plot: 'salon' }, T0 + 2)]),
      ...visit('b', T0 + DAY, [ev('step.passed', { strand: 'r', step: 'R30' }, T0 + DAY + 1)]),
      ...visit('c', T0 + 2 * DAY),
      ...visit('d', T0 + 3 * DAY, [ev('jewel.placed', { jewel: 'R30', plot: 'salon' }, T0 + 3 * DAY + 1)]),
      ...visit('e', T0 + 4 * DAY, [ev('step.passed', { strand: 'm', step: 'M10' }, T0 + 4 * DAY + 1), ev('jewel.placed', { jewel: 'M10', plot: 'salon' }, T0 + 4 * DAY + 2)]),
    ]);
    expect(out).toEqual([true, false, true]);
  });

  it('C1 flags a step with a second idle in three or more visits', () => {
    const idle = (step: string, t: number, level: 1 | 2 = 2) => ev('learn.idle', { visit: 'x', strand: 's', step, place: 'nest', level }, t);
    const out = idleFlags([
      ...visit('a', T0, [idle('S12', T0 + 1), idle('R21', T0 + 2), idle('M10', T0 + 3, 1)]),
      ...visit('b', T0 + DAY, [idle('S12', T0 + DAY + 1), idle('R21', T0 + DAY + 2), idle('M10', T0 + DAY + 3, 1)]),
      ...visit('c', T0 + 2 * DAY, [idle('S12', T0 + 2 * DAY + 1), idle('M10', T0 + 2 * DAY + 3, 1)]),
    ]);
    expect(out).toEqual([{ step: 'S12', visits: 3, flagged: true }, { step: 'R21', visits: 2, flagged: false }]);
  });

  it('C2 is the helped share per strand without probes, after placement ends in that strand', () => {
    const out = helpedShare([
      res('m', 'M05', 'helped', T0),
      ev('placement.done', { strand: 'm', current: 'M06', placed: [], side: [] }, T0 + 1),
      res('m', 'M06', 'first', T0 + 2),
      res('r', 'R21', 'helped', T0), res('r', 'R21', 'first', T0), res('r', 'R21', 'helped', T0, { probe: true }),
    ]);
    expect(out).toEqual({ r: 0.5, s: null, m: 0 });
  });

  it('L1 flags first-try accuracy below 60 or above 92 percent per week, from five results', () => {
    const evs = [
      ...visit('a', T0),
      ...many(10, (i) => res('r', 'R21', i < 5 ? 'first' : 'miss', T0 + i)),
      ...many(10, (i) => res('s', 'S12', 'first', T0 + i)),
      ...many(10, (i) => res('m', 'M10', i < 8 ? 'first' : 'miss', T0 + i)),
      ...many(3, (i) => res('m', 'M10', 'miss', T0 + 7 * DAY + i)),
    ];
    const out = firstTryAccuracy(evs);
    expect(out.r[1]).toEqual({ n: 10, rate: 0.5, flag: 'low' });
    expect(out.s[1]).toEqual({ n: 10, rate: 1, flag: 'high' });
    expect(out.m[1]).toEqual({ n: 10, rate: 0.8, flag: null });
    expect(out.m[2]).toEqual({ n: 3, rate: 0, flag: null });
  });

  it('L2 counts passed steps per strand once', () => {
    expect(stepsPassed([ev('step.passed', { strand: 's', step: 'S10' }), ev('step.passed', { strand: 's', step: 'S10' }), ev('step.passed', { strand: 'r', step: 'R19' })])).toEqual({ r: 1, s: 1, m: 0 });
  });

  it('L3 counts results on steps passed before them, and names apart (decision D20)', () => {
    const out = reviewAccuracy([
      res('s', 'S20', 'miss', T0),
      ev('step.passed', { strand: 's', step: 'S20' }, T0 + 1),
      res('s', 'S20', 'first', T0 + 2), res('s', 'S20', 'first', T0 + 3), res('s', 'S20', 'first', T0 + 4), res('s', 'S20', 'miss', T0 + 5),
      res('name', null, 'first', T0 + 6, { slot: 'name' }), res('name', null, 'miss', T0 + 7, { slot: 'name' }),
    ]);
    expect(out).toEqual({ ladder: 0.75, names: 0.5 });
  });

  it('L4 compares Dutch-tagged errors in weeks 3 and 4 after a contrast step with weeks 1 and 2', () => {
    expect([...CONTRAST_STEPS].sort()).toEqual(['R04D', 'R11', 'R20', 'S03D', 'S06']);
    const err = (t: number, error: ErrorTag) => res('s', 'S06', 'miss', t, { error });
    const out = dutchShare([
      ev('step.passed', { strand: 's', step: 'S06' }, T0),
      err(T0 + DAY, 'dutch'), err(T0 + DAY, 'dutch'), err(T0 + DAY, 'other'), err(T0 + DAY, 'other'),
      err(T0 + 15 * DAY, 'dutch'), err(T0 + 15 * DAY, 'other'), err(T0 + 15 * DAY, 'other'), err(T0 + 15 * DAY, 'other'),
      ev('step.passed', { strand: 's', step: 'S07' }, T0),
    ]);
    expect(out).toEqual([{ step: 'S06', early: 0.5, late: 0.25, halved: true }]);
  });

  it('L5 is the spelling share of ladder moments per visit with five or more moments', () => {
    const out = spellingShare([
      ...visit('a', T0, [res('r', 'R21', 'first', T0 + 1), res('r', 'R21', 'first', T0 + 2), res('m', 'M10', 'first', T0 + 3), res('m', 'M10', 'first', T0 + 4), res('s', 'S12', 'first', T0 + 5), res('name', null, 'first', T0 + 6)]),
      ...visit('b', T0 + DAY, [res('r', 'R21', 'first', T0 + DAY + 1), res('s', 'S12', 'first', T0 + DAY + 2)]),
    ]);
    expect(out).toEqual({ perVisit: [0.2, null], mean: 0.2 });
  });

  it('jewel share: the share of openings that came from jewels (spec 1.1)', () => {
    const out = jewelShare([
      ev('building.done', { plot: 'bath-pond' }),
      ev('building.done', { plot: 'row-2' }),
      ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'R30', plot: 'salon' }), ev('jewel.placed', { jewel: 'M10', plot: 'salon' }),
      ev('building.done', { plot: 'salon' }),
      ev('building.done', { plot: 'salon' }),
      ev('opening.announced', { opening: 'letter-lane' }),
      ev('opening.announced', { opening: 'dressing' }),
    ]);
    expect(out).toEqual({ jewel: 1, herd: 3, share: 0.25 });
    expect(jewelShare([])).toEqual({ jewel: 0, herd: 0, share: null });
  });

  it('leaves out excluded devices and sorts by clock', () => {
    const a = { ...res('r', 'R21', 'helped', T0), dev: 'bad', id: 'bad:1', hlc: '0000000000005-0000' } as GameEvent;
    const b = { ...res('r', 'R21', 'first', T0), dev: 'good', id: 'good:1', hlc: '0000000000004-0000' } as GameEvent;
    const x = ev('exclude', { device: 'bad', on: true });
    expect(report([a, b, x], T0).C2.r).toBe(0);
    const back = ev('exclude', { device: 'bad', on: false });
    expect(report([a, b, x, back], T0).C2.r).toBe(0.5);
    expect(sortEvents([a, b]).map((e) => e.dev)).toEqual(['good', 'bad']);
  });

  it('reports an empty log without failing', () => {
    const r = report([], T0);
    expect(r.E4).toBe(0);
    expect(r.E2).toEqual({ perVisit: [], median: 0, max: 0 });
    expect(r.J.share).toBeNull();
  });
});
