// G/tests/learning/fold.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { foldLearner, applyLearnEvent, createLearner, createLearnerSlice } from '../../src/core/learning/fold.ts';
import {
  currentStep, pendingLearnFacts, stepStatus, sideSteps, openSchoolSteps, setCurrentOverride, pairsAllowed, spellingKnowledge,
} from '../../src/core/learning/status.ts';
import type { Learner, LearnEvent } from '../../src/core/learning/types.ts';
import type { Slice } from '../../src/core/fold/engine.ts';
import type { Content, Release } from '../../src/core/content/types.ts';
import { buildContent } from '../../src/core/content/build.ts';
import { miniContent, miniRaw } from '../fixtures/mini.ts';
import { T0, HOUR, DAY, resetSeq, visitStart, result, passed, placementDone, override, importV2 } from '../fixtures/events.ts';

const c = miniContent();
const PLACED_R21 = ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13'];
const PLACED_R13 = ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10'];
/** Placement has ended with R13 as her current step (year1 profile). */
const placedAt = (step: 'R13' | 'R21'): LearnEvent[] =>
  [visitStart(T0), placementDone(T0 + 1, 'r', step, step === 'R13' ? PLACED_R13 : PLACED_R21, ['R04D'])];
/** The mini fixture plus a step R12 that only release 1.2 loads, between R10 and R13 (R35). */
function contentWithR12(release: Release): Content {
  const raw = miniRaw(release);
  const reading = raw.ladders[0].steps;
  reading.splice(reading.findIndex(s => s.id === 'R13'), 0, {
    id: 'R12', title: 'R12', release: '1.2', levels: 3, moments: ['wish'], face: ['R12'],
    items: [{ id: 'r:t:the', kind: 'tricky', word: 'the' }],
  });
  return buildContent(raw);
}
const fresh = (tz = 120): LearnEvent[] => [
  override(T0 - 1, { type: 'learn.override', op: 'profile', profile: 'fresh' }),
  visitStart(T0, tz),
];
function climbAndPass(evs: LearnEvent[], start: number): LearnEvent[] {
  const items = ['r:g:s', 'r:g:a', 'r:g:t', 'r:g:p'];
  let t = start;
  for (let i = 0; i < 6; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: i < 3 ? 1 : 2 }));
  for (let i = 0; i < 8; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 3 }));
  evs.push(visitStart(t = start + DAY));
  for (let i = 0; i < 7; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 3 }));
  return evs;
}

beforeEach(() => resetSeq());

describe('learner fold', () => {
  it('a first try moves a new item to box 1 and counts it for the visit and the day', () => {
    const l = foldLearner([...fresh(), result(T0 + 1000, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' })], c);
    expect(l.items['r:g:s']).toMatchObject({ box: 1, firsts: 1 });
    expect(l.visit.counts.r).toBe(1);
    expect(l.visit.ladder).toBe(1);
    expect(l.newToday.r.ids).toEqual(['r:g:s']);
  });

  it('a fresh player has no placement and starts at R01, S01 and M01', () => {
    const l = foldLearner(fresh(), c);
    expect(l.placement.r.done).toBe(true);
    expect([currentStep(l, c, 'r'), currentStep(l, c, 's'), currentStep(l, c, 'm')]).toEqual(['R01', 'S01', 'M01']);
    expect(openSchoolSteps(l, c, 'r')).toEqual([]);
  });

  it('climbs the scaffold and reports R01 ready after 12 of 15 at the top over two days', () => {
    const evs = climbAndPass(fresh(), T0);
    const l = foldLearner(evs, c);
    expect(l.steps.R01.level).toBe(3);
    expect(pendingLearnFacts(l, c)).toContainEqual({ type: 'step.passed', strand: 'r', step: 'R01' });
    const l2 = foldLearner([...evs, passed(T0 + DAY + HOUR, 'r', 'R01')], c);
    expect(stepStatus(l2, c, 'R01')).toBe('passed');
    expect(currentStep(l2, c, 'r')).toBe('R02');
    expect(pendingLearnFacts(l2, c).some(f => f.type === 'step.passed')).toBe(false);
  });

  it('an item with no carrier in this build does not block the pass', () => {
    expect(c.items['r:g:s'].carriers).toBe(0);
    const evs = fresh();
    let t = T0;
    const items = ['r:g:a', 'r:g:t', 'r:g:p'];
    for (let i = 0; i < 6; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 3]], r: 'first', scaffold: 1 }));
    for (let i = 0; i < 8; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 3]], r: 'first', scaffold: 3 }));
    evs.push(visitStart(t = T0 + DAY));
    for (let i = 0; i < 7; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 3]], r: 'first', scaffold: 3 }));
    expect(pendingLearnFacts(foldLearner(evs, c), c)).toContainEqual({ type: 'step.passed', strand: 'r', step: 'R01' });
  });

  it('is not ready when every top-level result is on one day', () => {
    const evs = fresh();
    let t = T0;
    const items = ['r:g:s', 'r:g:a', 'r:g:t', 'r:g:p'];
    for (let i = 0; i < 6; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 1 }));
    for (let i = 0; i < 15; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 3 }));
    expect(pendingLearnFacts(foldLearner(evs, c), c)).toEqual([]);
  });

  it('step.passed is never revoked and duplicates are harmless', () => {
    const evs = [...fresh(), passed(T0 + 1, 'r', 'R01'), passed(T0 + 2, 'r', 'R01')];
    for (let i = 0; i < 10; i++) evs.push(result(T0 + 10 + i, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'miss', slot: 'review', scaffold: 3 }));
    const l = foldLearner(evs, c);
    expect(stepStatus(l, c, 'R01')).toBe('passed');
    expect(l.steps.R01.passedT).toBe(T0 + 1);
    expect(l.steps.R01.reopened).toBe(true);
  });

  it('probe results set boxes, never count toward a pass, and end placement at R21', () => {
    const l = foldLearner([
      visitStart(T0),
      result(T0 + 1000, { strand: 'r', step: 'R21', items: ['r:cl:-st'], r: 'first', probe: true, scaffold: 3 }),
      result(T0 + 2000, { strand: 'r', step: 'R21', items: ['r:cl:-nd'], r: 'first', probe: true, scaffold: 3 }),
    ], c);
    expect(l.items['r:cl:-st']).toMatchObject({ box: 1, firsts: 0 });
    expect(l.steps.R21?.window ?? []).toEqual([]);
    expect(l.newToday.r.ids).toEqual([]);
    expect(pendingLearnFacts(l, c)).toContainEqual({ type: 'placement.done', strand: 'r', current: 'R21', placed: PLACED_R21, side: ['R04D'] });
  });

  it('placement.done places lower steps in box 2, makes contrast steps side steps and opens the school step', () => {
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', PLACED_R21, ['R04D']),
      placementDone(T0 + 2, 'r', 'R13', ['R01'], []),
    ], c);
    expect(stepStatus(l, c, 'R13')).toBe('placed');
    expect(l.items['r:g:ai']).toMatchObject({ box: 2, placedInit: true, seen: 0 });
    expect(sideSteps(l, c, 'r')).toEqual(['R04D']);
    expect(currentStep(l, c, 'r')).toBe('R21');
    expect(openSchoolSteps(l, c, 'r')).toEqual(['R19']);
    expect(stepStatus(l, c, 'R19')).toBe('school');
    expect(stepStatus(l, c, 'R30')).toBe('waiting');
    expect(stepStatus(l, c, 'R06')).toBe('display');
  });

  it('v2 seeds start missed items in box 0 and first tries in box 1, and win over the placement seed', () => {
    const l = foldLearner([
      visitStart(T0),
      importV2(T0 + 1, 'h1', [
        { strand: 'r', item: 'r:g:p', box: 0 }, { strand: 'r', item: 'r:g:a', box: 0 }, { strand: 'r', item: 'r:g:n', box: 0 },
        { strand: 'r', item: 'r:g:d', box: 1 }, { strand: 'r', item: 'r:g:o', box: 1 }, { strand: 'r', item: 'r:g:g', box: 1 },
        { strand: 's', item: 's:g:m', box: 1 },
        { strand: 'r', item: 'r:g:zz9', box: 1 },
      ]),
      placementDone(T0 + 2, 'r', 'R21', PLACED_R21, ['R04D']),
    ], c);
    expect(l.items['r:g:p']).toMatchObject({ box: 0, seeded: true, firsts: 0 });
    expect(l.items['r:g:d']).toMatchObject({ box: 1, seeded: true });
    expect(l.items['r:g:t'].box).toBe(2);
    expect(l.items['s:g:m']).toMatchObject({ box: 1, seeded: true });
    expect(l.items['r:g:zz9']).toBeUndefined();
  });

  it('the same v2 import twice adds nothing, and a later import still seeds placed items', () => {
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', PLACED_R21, ['R04D']),
      importV2(T0 + 2, 'h1', [{ strand: 'r', item: 'r:g:p', box: 0 }]),
      importV2(T0 + 3, 'h1', [{ strand: 'r', item: 'r:g:p', box: 1 }]),
    ], c);
    expect(l.items['r:g:p']).toMatchObject({ box: 0, seeded: true });
    expect(l.imported).toEqual(['h1']);
  });

  it('set-current replaces the placement and unplaces steps it no longer lists', () => {
    const evs = fresh();
    const o1 = setCurrentOverride(foldLearner(evs, c), c, 'r', 'R13');
    expect(o1).toEqual({ type: 'learn.override', op: 'set-current', strand: 'r', step: 'R13', placed: ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10'], side: ['R04D'] });
    evs.push(override(T0 + 1, o1));
    expect(currentStep(foldLearner(evs, c), c, 'r')).toBe('R13');
    evs.push(override(T0 + 2, setCurrentOverride(foldLearner(evs, c), c, 'r', 'R05')));
    const l = foldLearner(evs, c);
    expect(currentStep(l, c, 'r')).toBe('R05');
    expect(stepStatus(l, c, 'R08')).toBe('ahead');
  });

  it('turning the school flag off makes R19 a normal step', () => {
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', PLACED_R21, ['R04D']),
      override(T0 + 2, { type: 'learn.override', op: 'school', strand: 'r', step: 'R19', on: false }),
    ], c);
    expect(openSchoolSteps(l, c, 'r')).toEqual([]);
    expect(currentStep(l, c, 'r')).toBe('R19');
  });

  it('a new visit resets the visit counts and the box 0 counters', () => {
    const evs = [...fresh(),
      result(T0 + 1000, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'miss' }),
      result(T0 + 2000, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'first' })];
    expect(foldLearner(evs, c).visit.box0['r:g:s']).toBe(1);
    const l = foldLearner([...evs, visitStart(T0 + HOUR)], c);
    expect(l.visit.seq).toBe(2);
    expect(l.visit.counts.r).toBe(0);
    expect(l.visit.box0).toEqual({});
  });

  it('applying events one by one equals a full fold, and the learner survives a JSON round trip', () => {
    const evs = climbAndPass(fresh(), T0);
    const inc = createLearner(c);
    for (const e of evs) applyLearnEvent(inc, e, c);
    const full = foldLearner(evs, c);
    expect(inc).toEqual(full);
    expect(JSON.parse(JSON.stringify(full))).toEqual(full);
    const slice: Slice<'learner', Learner> = createLearnerSlice(c);   // fits the core slice engine
    expect(evs.reduce((s, e) => slice.apply(s, e as never, { get: () => undefined as never }), slice.init())).toEqual(full);
  });

  it('a golden result counts toward the window but never moves the scaffold', () => {
    const evs = fresh();
    for (let i = 0; i < 3; i++) evs.push(result(T0 + i + 1, { strand: 'm', step: 'M01', items: [`m:sub:${i + 1}`], r: 'first', slot: 'golden', scaffold: 1, moment: 'egg-moon' }));
    const l = foldLearner(evs, c);
    expect(l.steps.M01.level).toBe(1);
    expect(l.steps.M01.up).toBe(0);
    expect(l.steps.M01.window).toHaveLength(3);
    expect(l.visit.golden).toBe(true);
  });

  it('name reviews update the name item and the visit total, not the ladders', () => {
    const l = foldLearner([...fresh(), result(T0 + 1, { strand: 'name', step: null, items: ['name:ben'], r: 'first', slot: 'name', moment: 'roll-call' })], c);
    expect(l.items['name:ben'].box).toBe(1);
    expect(l.visit.counts.name).toBe(1);
    expect(l.visit.ladder).toBe(0);
  });

  it('unknown items and steps are skipped without throwing', () => {
    const l = foldLearner([...fresh(), result(T0 + 1, { strand: 'r', step: 'R99', items: ['r:g:zz9', 'r:g:s'], r: 'first' })], c);
    expect(l.items['r:g:zz9']).toBeUndefined();
    expect(l.items['r:g:s'].box).toBe(1);
  });

  it('a result with an earlier clock time never moves lastT backwards', () => {
    const l = foldLearner([...fresh(),
      result(T0 + HOUR, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' }),
      result(T0, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' })], c);
    expect(l.items['r:g:s']).toMatchObject({ lastT: T0 + HOUR, box: 2 });
  });

  it('new items per day follow the local day of the visit time zone', () => {
    const late = () => [
      result(T0 + 6.5 * HOUR, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' }),   // 23:30 in Cyprus
      result(T0 + 7.5 * HOUR, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'first' }),   // 00:30 in Cyprus
    ];
    expect(foldLearner([...fresh(120), ...late()], c).newToday.r.ids).toEqual(['r:g:a']);
    resetSeq();
    expect(foldLearner([...fresh(0), ...late()], c).newToday.r.ids).toEqual(['r:g:s', 'r:g:a']);
  });

  it('pairs unlock as distractors only when their contrast step is passed', () => {
    expect(pairsAllowed(foldLearner(fresh(), c), c, 'r')).toEqual([]);
    const l = foldLearner([...fresh(), passed(T0 + 1, 'r', 'R04D')], c);
    expect(pairsAllowed(l, c, 'r')).toEqual(['a-e-u']);
    expect(pairsAllowed(l, c, 's')).toEqual([]);
  });

  it('spelling knowledge lists her own GPCs', () => {
    const k = spellingKnowledge(foldLearner([...fresh(), passed(T0 + 1, 's', 'S01')], c), c);
    expect(k.current).toBe('S02');
    expect(k.own).toEqual(expect.arrayContaining(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']));
    expect(k.own).not.toContain('g');
    expect(k.finalVoicedOk).toBe(false);
  });
  it('ten first-try station wishes never pass or move a step (R34)', () => {
    const base = foldLearner(placedAt('R13'), c);
    const before = { level: base.steps.R13?.level, window: base.steps.R13?.window.length ?? 0 };
    const l = foldLearner([...placedAt('R13'), ...Array.from({ length: 10 }, (_, i) =>
      result(T0 + (i + 1) * DAY, { strand: 'r', step: 'R13', moment: 'station-wish', slot: 'review', items: ['r:g:ai'], r: 'first', scaffold: 3 }))], c);
    expect(l.steps.R13?.level).toBe(before.level);
    expect(l.steps.R13?.window.length ?? 0).toBe(before.window);
    expect(pendingLearnFacts(l, c).filter((f) => f.type === 'step.passed')).toEqual([]);
    expect(l.items['r:g:ai'].box).toBeGreaterThan(1);
  });

  it('a station wish logged with a current slot still never scaffolds, starts or reopens a step (R34)', () => {
    const evs: LearnEvent[] = [...placedAt('R13')];
    for (let i = 0; i < 20; i++) {
      evs.push(result(T0 + (i + 1) * HOUR * 6, { strand: 'r', step: 'R13', moment: 'station-wish', slot: 'current', items: ['r:g:ai'], r: 'first', scaffold: 3 }));
      evs.push(result(T0 + (i + 1) * HOUR * 6 + 1, { strand: 'r', step: 'R10', moment: 'station-wish', slot: 'review', items: ['r:g:sh'], r: 'miss', scaffold: 3 }));
    }
    const l = foldLearner(evs, c);
    expect(l.steps.R13).toBeUndefined();
    expect(l.steps.R10.reopened).toBe(false);
    expect(l.steps.R10.review).toEqual([]);
    expect(l.items['r:g:sh'].box).toBe(1);                 // placed in box 2, misses move it to 1
    expect(l.visit.counts.r).toBe(40);
  });

  it('a step loaded by a later release below her placement counts as placed (R35)', () => {
    expect(contentWithR12('1.0').steps.R12.loaded).toBe(false);
    const c13 = contentWithR12('1.3');
    expect(c13.steps.R12.loaded).toBe(true);
    const events = placedAt('R13');                          // R12 was not loaded when placement ended
    const l = foldLearner(events, c13);
    expect(stepStatus(l, c13, 'R12')).toBe('placed');
    expect(currentStep(l, c13, 'r')).toBe('R13');
    expect(l.items['r:t:the']).toMatchObject({ box: 2, placedInit: true });
    // A learner folded with the old content still reads R12 as placed with the new content.
    const stale = foldLearner(events, contentWithR12('1.0'));
    expect(stepStatus(stale, c13, 'R12')).toBe('placed');
    expect(currentStep(stale, c13, 'r')).toBe('R13');
    // School, contrast and steps above her current step are never placed this way.
    expect(stepStatus(l, c13, 'R19')).toBe('school');
    expect(stepStatus(l, c13, 'R04D')).toBe('side');
  });

  it('a parent can unmark a step that a later release placed (R35)', () => {
    const c13 = contentWithR12('1.3');
    const l = foldLearner([...placedAt('R13'), override(T0 + 2, { type: 'learn.override', op: 'unmark-placed', strand: 'r', step: 'R12' })], c13);
    expect(stepStatus(l, c13, 'R12')).toBe('current');
    expect(currentStep(l, c13, 'r')).toBe('R12');
  });

  it('a second placement.done for the same strand is ignored (earliest wins)', () => {
    const l = foldLearner([...placedAt('R21'), placementDone(T0 + 5, 'r', 'R05', ['R01', 'R02', 'R03', 'R04'], [])], c);
    expect(l.placement.r.current).toBe('R21');
    expect(currentStep(l, c, 'r')).toBe('R21');
    expect(stepStatus(l, c, 'R13')).toBe('placed');
  });
});
