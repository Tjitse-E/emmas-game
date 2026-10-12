// G/tests/planner/egg-totals.test.ts
// Egg totals (docs/v3/next/plan.md N7, N8): never the same total twice in a row, and easy review stays rare.
import { describe, it, expect } from 'vitest';
import { content } from '../../src/core/content/static.ts';
import type { Content, MathsTask } from '../../src/core/content/types.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { pendingLearnFacts, setCurrentOverride } from '../../src/core/learning/status.ts';
import type { EventBase, LearnEvent } from '../../src/core/learning/types.ts';
import {
  easyReview, lastEggTotal, learnResultPayload, mathsTotal, mulberry32, nextEgg, nextRack, tensThisVisit, visitEggSeen,
} from '../../src/core/planner/index.ts';
import type { Pick, PlanContext } from '../../src/core/planner/types.ts';
import { T0, DAY, HOUR, resetSeq, visitStart, override, result, stamp } from '../fixtures/events.ts';

const assets = { clip: () => true, picture: () => true };
const totalOf = (p: Pick): number | null => (p.carrier.kind === 'maths' ? mathsTotal(p.carrier.task) : null);

/** A year 1 learner whose maths was set to `step` (as the lift does), in a second visit. */
function start(step: string, c: Content = content): { evs: LearnEvent[]; t: number } {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0)];
  evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c, 'year1'), c, 'm', step)));
  evs.push(visitStart(T0 + DAY));
  return { evs, t: T0 + DAY + 60_000 };
}
const ctxOf = (evs: readonly EventBase[], now: number, c: Content = content): PlanContext =>
  ({ c, l: foldLearner(evs, c, 'year1'), now, assets });
const eggResult = (t: number, id: string, task: MathsTask, slot: 'current' | 'review' = 'current') =>
  stamp(t, learnResultPayload(
    { strand: 'm', step: 'M12A', slot, moment: 'egg-two-stone', items: [id], carrier: { kind: 'maths', task }, scaffold: 1, probe: false },
    { result: 'first', ms: 2000, place: 'nest' }));

describe('the visit eggs (3.4a)', () => {
  it('reads the total of every maths task', () => {
    expect(mathsTotal({ op: 'pair', a: 3, b: 5 })).toBe(8);
    expect(mathsTotal({ op: 'missing', whole: 13, part: 9 })).toBe(13);
    expect(mathsTotal({ op: 'numeral', n: 7 })).toBe(7);
    expect(mathsTotal({ op: 'subitise', n: 4 })).toBe(4);
    expect(mathsTotal({ op: 'add', a: 2, b: 3 })).toBeNull();
    expect(mathsTotal({ op: 'more', n: 3 })).toBeNull();
  });

  it('remembers the last egg total of the visit, past words, doors and the hay rack', () => {
    const { evs, t } = start('M12A');
    expect(lastEggTotal(ctxOf(evs, t).l)).toBeNull();
    evs.push(eggResult(t + 1, 'm:pair:3+5', { op: 'pair', a: 3, b: 5 }));
    for (let i = 0; i < 6; i++) evs.push(result(t + 2 + i, { strand: 'r', step: 'R21', items: ['r:g:a'], r: 'first', moment: 'wish', place: 'wish' }));
    evs.push(result(t + 10, { strand: 'm', step: 'M02', items: ['m:num:7'], r: 'first', moment: 'roll-call-door', place: 'goodnight', slot: 'review' }));
    evs.push(result(t + 11, { strand: 'm', step: 'M12', items: ['m:miss:9-4'], r: 'first', moment: 'hay-rack', place: 'manger', slot: 'review' }));
    const l = ctxOf(evs, t + 20).l;
    expect(lastEggTotal(l)).toBe(8);
    expect(l.visit.eggs).toEqual([{ total: 8, moment: 'egg-two-stone' }]);
    expect(visitEggSeen(l)).toEqual({ twoNests: false, twoStones: true });
    expect(tensThisVisit(l)).toBe(0);
    evs.push(visitStart(t + DAY));
    expect(lastEggTotal(ctxOf(evs, t + DAY + 1).l)).toBeNull();
  });

  it('knows a two-nest egg and a ten', () => {
    const { evs, t } = start('M12A');
    evs.push(result(t + 1, { strand: 'm', step: 'M12F', items: ['m:gap:13-9'], r: 'first', moment: 'egg-moon', place: 'nest' }));
    evs.push(result(t + 2, { strand: 'm', step: 'M10', items: ['m:pair:3+7'], r: 'first', moment: 'egg-two-stone', place: 'nest', slot: 'review' }));
    const l = ctxOf(evs, t + 3).l;
    expect(visitEggSeen(l)).toEqual({ twoNests: true, twoStones: true });
    expect(tensThisVisit(l)).toBe(1);
    expect(lastEggTotal(l)).toBe(10);
  });
});

describe('nextEgg (N7)', () => {
  it('never asks the last total again at M12A', () => {
    // The first new item in content order is 2 and 5 (total 7), so the plain planner would ask 7 again.
    const { evs, t } = start('M12A');
    evs.push(eggResult(t + 1, 'm:pair:3+4', { op: 'pair', a: 3, b: 4 }));
    const x = ctxOf(evs, t + 2);
    for (let seed = 1; seed <= 50; seed++) {
      const o = nextEgg(x, mulberry32(seed));
      expect(o.pick, `seed ${seed}`).not.toBeNull();
      expect(totalOf(o.pick!), `seed ${seed}`).not.toBe(7);
    }
  });

  it('keeps an M10 learner on her current step after a total of 10', () => {
    const { evs, t } = start('M10');
    evs.push(result(t + 1, { strand: 'm', step: 'M10', items: ['m:pair:3+7'], r: 'first', moment: 'egg-two-stone', place: 'nest' }));
    const o = nextEgg(ctxOf(evs, t + 2), () => 0);
    expect(o.pick).toMatchObject({ step: 'M10', slot: 'current' });
    expect(totalOf(o.pick!)).toBe(10);
  });

  it('still serves a placement probe at M10 after a total of 10', () => {
    resetSeq();
    const evs: LearnEvent[] = [visitStart(T0)];
    evs.push(result(T0 + 1, { strand: 'm', step: 'M10', items: ['m:pair:3+7'], r: 'first', probe: true, moment: 'egg-two-stone', place: 'nest' }));
    const x = ctxOf(evs, T0 + 2);
    expect(x.l.placement.m.done).toBe(false);
    expect(lastEggTotal(x.l)).toBe(10);
    for (let seed = 1; seed <= 10; seed++) {
      const o = nextEgg(x, mulberry32(seed));
      expect(o.pick).toMatchObject({ step: 'M10', probe: true });
    }
  });

  it('serves the only servable item even when it repeats the last total', () => {
    const c = structuredClone(content) as Content;
    c.steps.M12A.items = c.steps.M12A.items.filter((it) => it.id === 'm:pair:3+5');
    const { evs, t } = start('M12A', c);
    evs.push(eggResult(t + 1, 'm:pair:3+5', { op: 'pair', a: 3, b: 5 }));
    const o = nextEgg(ctxOf(evs, t + 2, c), () => 0);
    expect(o.pick).toMatchObject({ step: 'M12A', slot: 'current', items: ['m:pair:3+5'] });
  });
});

/** Plays `n` eggs (or hay racks) from M12A: each result folds back, with a new day after three new items. */
function play(seed: number, n: number, kind: 'egg' | 'rack', eggsPerVisit = 6): { visits: number[][]; picks: Pick[][] } {
  const { evs } = start('M12A');
  let t = T0 + DAY + 60_000;
  const rng = mulberry32(seed);
  const visits: number[][] = [[]];
  const picks: Pick[][] = [[]];
  let newToday = 0;
  const seen = new Set<string>();
  const newVisit = (next: number) => { t = next; evs.push(visitStart(t)); visits.push([]); picks.push([]); };
  for (let i = 0; i < n; i++) {
    const x = ctxOf(evs, t);
    const p = kind === 'egg' ? nextEgg(x, rng).pick : nextRack(x, rng);
    if (!p) throw new Error(`no pick at ${i}`);
    visits[visits.length - 1].push(totalOf(p)!);
    picks[picks.length - 1].push(p);
    for (const id of p.items) if (!seen.has(id) && !x.l.items[id]?.placedInit && (x.l.items[id]?.seen ?? 0) === 0) { seen.add(id); newToday++; }
    seen.add(p.items[0]);
    t += 60_000;
    const r = rng() < 0.75 ? 'first' : 'miss';
    evs.push(stamp(t, learnResultPayload(p, { result: r, ms: 3000, place: kind === 'egg' ? 'nest' : 'manger' })));
    for (const f of pendingLearnFacts(foldLearner(evs, content, 'year1'), content)) evs.push(stamp(t + 1, f) as LearnEvent);
    if (newToday >= 3) { newToday = 0; newVisit(Math.ceil((t + 1) / DAY) * DAY + 15 * HOUR); }
    else if (visits[visits.length - 1].length >= eggsPerVisit) newVisit(t + 3 * HOUR);
  }
  return { visits: visits.filter((v) => v.length > 0), picks };
}

describe('egg totals after the lift (N7, N8)', () => {
  it('never repeats a total in a row, never goes below 6 and asks 10 at most once a visit', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { visits } = play(seed, 30, 'egg');
      for (const v of visits) {
        for (let i = 1; i < v.length; i++) expect(v[i], `seed ${seed} visit ${v}`).not.toBe(v[i - 1]);
        for (const x of v) expect(x, `seed ${seed} visit ${v}`).toBeGreaterThanOrEqual(6);
        expect(v.filter((x) => x === 10).length, `seed ${seed} visit ${v}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('asks 10 at most once in the first six eggs of a fresh M12A day', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { visits } = play(seed, 6, 'egg', 6);
      expect(visits.flat().filter((x) => x === 10).length, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps easy review off the hay rack', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { picks } = play(seed, 20, 'rack');
      for (const v of picks) {
        let tens = 0;
        for (const p of v) {
          expect(content.steps[p.step!].index, `seed ${seed} ${p.items[0]}`).toBeGreaterThanOrEqual(content.steps.M09.index);
          if (p.carrier.kind !== 'maths') throw new Error('not maths');
          const t = p.carrier.task;
          if (t.op === 'missing') {
            expect(t.part, p.items[0]).toBeGreaterThan(1);
            expect(t.whole - t.part, p.items[0]).toBeGreaterThan(1);
          }
          if (totalOf(p) === 10) tens++;
        }
        expect(tens).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('easyReview (N8)', () => {
  const { evs, t } = start('M12A');
  const l = ctxOf(evs, t).l;
  const pick = (step: string, slot: Pick['slot'], task: MathsTask): Pick =>
    ({ strand: 'm', step, slot, moment: 'egg-moon', items: ['x'], carrier: { kind: 'maths', task }, scaffold: 1, probe: false });

  it('rejects review below M09 and one-steps, never the current step', () => {
    expect(easyReview(l, content, pick('M05', 'review', { op: 'missing', whole: 5, part: 2 }))).toBe(true);
    expect(easyReview(l, content, pick('M02', 'mixed', { op: 'numeral', n: 7 }))).toBe(true);
    expect(easyReview(l, content, pick('M12', 'review', { op: 'missing', whole: 7, part: 1 }))).toBe(true);
    expect(easyReview(l, content, pick('M12', 'review', { op: 'missing', whole: 7, part: 6 }))).toBe(true);
    expect(easyReview(l, content, pick('M10', 'mixed', { op: 'pair', a: 1, b: 9 }))).toBe(true);
    expect(easyReview(l, content, pick('M12', 'review', { op: 'missing', whole: 7, part: 3 }))).toBe(false);
    expect(easyReview(l, content, pick('M10', 'review', { op: 'pair', a: 3, b: 7 }))).toBe(false);
    expect(easyReview(l, content, pick('M12A', 'current', { op: 'pair', a: 3, b: 5 }))).toBe(false);
  });

  it('allows one 10 a visit', () => {
    const e2 = [...evs, result(t + 1, { strand: 'm', step: 'M10', items: ['m:pair:3+7'], r: 'first', moment: 'egg-two-stone', place: 'nest', slot: 'review' })];
    const l2 = ctxOf(e2, t + 2).l;
    expect(easyReview(l2, content, pick('M09', 'review', { op: 'missing', whole: 10, part: 3 }))).toBe(true);
    expect(easyReview(l2, content, pick('M12', 'review', { op: 'missing', whole: 8, part: 3 }))).toBe(false);
  });

  it('does nothing before M12A', () => {
    const s = start('M10');
    const l10 = ctxOf(s.evs, s.t).l;
    expect(easyReview(l10, content, pick('M05', 'review', { op: 'missing', whole: 5, part: 2 }))).toBe(false);
  });
});
