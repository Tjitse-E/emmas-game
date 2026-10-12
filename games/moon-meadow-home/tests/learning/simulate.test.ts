// G/tests/learning/simulate.test.ts
// The simulated learner (learning Task A21): the ladders pass at a steady pace at 85 percent, not at 50 percent,
// Emma's plurals pass within four play weeks, and no strand gets stuck over 60 visits.
import { describe, it, expect } from 'vitest';
import { simulate, formatReport } from '../../tools/lib/sim.ts';
import { readContent } from '../../tools/lib/read-content.ts';

const c = readContent('1.0');
const WEEK = 7 * 86_400_000;
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const median = (xs: number[]) => { const a = sorted(xs); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const p90 = (xs: number[]) => sorted(xs)[Math.min(xs.length - 1, Math.floor(0.9 * xs.length))];
const base = { content: c, visitsPerWeek: [2, 3] as [number, number], momentsPerVisit: [15, 19] as [number, number] };
const EMMA = { r: 'R21', s: 'S12', m: 'M10' };

describe('simulated learner', () => {
  it('at 85 percent a step passes in 3 play weeks or less', { timeout: 180_000 }, () => {
    const weeks: number[] = [];
    for (const seed of [1, 2, 3]) {
      const r = simulate({ ...base, seed, accuracy: 0.85, weeks: 12, profile: 'fresh' });
      console.log(formatReport(r));
      weeks.push(...r.steps.flatMap(s => (s.weeks === null ? [] : [s.weeks])));
    }
    expect(weeks.length).toBeGreaterThan(10);
    expect(median(weeks)).toBeLessThanOrEqual(3);
    expect(p90(weeks)).toBeLessThanOrEqual(4);
  });

  it("from Emma's start the plurals pass within 4 play weeks", { timeout: 180_000 }, () => {
    for (const seed of [1, 2, 3]) {
      // The pacing measured before 1.0.1, without the maths lift (docs/v3/next/plan.md E6).
      const r = simulate({ ...base, seed, accuracy: 0.85, weeks: 6, profile: 'year1', trueLevel: EMMA, lift: false });
      console.log(formatReport(r));
      for (const step of ['R19', 'S10']) {
        const rec = r.steps.find(s => s.step === step);
        expect(rec?.passT ?? null, `${step}, seed ${seed}`).not.toBeNull();
        expect((rec!.passT! - r.startT) / WEEK).toBeLessThanOrEqual(4);
      }
      expect(r.oneRatio).not.toBeNull();
    }
  });

  // At 50 percent the scaffold walks between levels: two misses in a row (one chance in four) beat three
  // first tries in a row (one in eight), so it spends most moments at level 1 and averages about 1.5 over a run.
  // A window of the last 20 moments swings too much to pin, so the test pins the run mean and compares it
  // with the same child at 85 percent.
  it('at 50 percent no step passes and the scaffold stays low', { timeout: 180_000 }, () => {
    const r = simulate({ ...base, seed: 1, accuracy: 0.5, weeks: 8, profile: 'fresh' });
    const good = simulate({ ...base, seed: 1, accuracy: 0.85, weeks: 8, profile: 'fresh' });
    expect(r.steps.filter(s => s.passT !== null).map(s => s.step)).toEqual([]);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    for (const strand of ['r', 's', 'm'] as const) {
      expect(r.levelTrace[strand].length).toBeGreaterThan(20);
      expect(mean(r.levelTrace[strand]), strand).toBeLessThanOrEqual(1.6);
      expect(mean(r.levelTrace[strand]), strand).toBeLessThan(mean(good.levelTrace[strand]) - 0.4);
    }
  });

  it('over 60 visits no strand gets stuck while a place exists for its next step', { timeout: 300_000 }, () => {
    for (const profile of ['fresh', 'year1']) {
      const r = simulate({ ...base, seed: 4, accuracy: 0.85, weeks: 24, profile, trueLevel: EMMA });
      expect(r.visits).toBeGreaterThanOrEqual(55);
      expect(r.stuck, profile).toEqual([]);
    }
  });

  it('is deterministic for a seed', { timeout: 120_000 }, () => {
    const o = { ...base, seed: 7, accuracy: 0.85, weeks: 2, profile: 'year1', trueLevel: EMMA };
    expect(simulate(o)).toEqual(simulate(o));
  });

  it("with the maths lift, Emma's maths starts at M12A and moves on through the new steps", { timeout: 180_000 }, () => {
    const r = simulate({ ...base, seed: 1, accuracy: 0.85, weeks: 6, profile: 'year1', trueLevel: EMMA });
    const m = r.steps.filter((s) => s.strand === 'm' && s.startT !== null).map((s) => s.step);
    expect(m[0]).toBe('M12A');
    expect(m).not.toContain('M10');
    expect(r.steps.find((s) => s.step === 'M12A')?.passT ?? null).not.toBeNull();
  });
});
