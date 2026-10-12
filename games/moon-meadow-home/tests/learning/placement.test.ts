// G/tests/learning/placement.test.ts
import { describe, it, expect } from 'vitest';
import { searchList, initPlacement, recordProbe, nextProbe, placementEnd } from '../../src/core/learning/placement.ts';
import type { Result } from '../../src/core/learning/types.ts';
import { miniContent } from '../fixtures/mini.ts';

const c = miniContent();
const year1 = c.budget.profiles.year1;
const school = (id: string) => year1.school.includes(id);
function probe(p: ReturnType<typeof initPlacement>, step: string, ...rs: Result[]) {
  for (const r of rs) recordProbe(p, step, r, c, 'r', school);
}

describe('placement', () => {
  it('searches loaded steps that are not contrast, school or display steps', () => {
    expect(searchList(c, 'r', school)).toEqual(['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13', 'R21']);
    expect(searchList(c, 'm', () => false)).toEqual(['M01', 'M02', 'M05', 'M07', 'M09', 'M10']);
  });

  it('starts Emma with lo R13 and a first probe at R21', () => {
    const p = initPlacement(c, 'r', year1, school);
    expect(p).toMatchObject({ done: false, lo: 'R13', hi: 'R21', floor: 'R01', loVerified: false });
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R21');
    expect(placementEnd(p, c, 'r', 1, school)).toBeNull();
  });

  it('asks for a second item at the same step', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'first');
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R21');
  });

  it('two first tries at the top end placement there', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'first', 'first');
    expect(placementEnd(p, c, 'r', 1, school)).toBe('R21');
  });

  it('a miss at R21 probes the lower bound R13, and two first tries there end at R13', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'first', 'miss');
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R13');
    probe(p, 'R13', 'first', 'first');
    expect(placementEnd(p, c, 'r', 1, school)).toBe('R13');
  });

  it('a miss at the lower bound opens down to R01, jumping at most two steps in visit 1', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'miss', 'miss');
    probe(p, 'R13', 'miss', 'first');
    expect(p).toMatchObject({ lo: 'R01', hi: 'R13', hiFailed: true, openedDown: true, loVerified: false });
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R08');
    expect(nextProbe(p, c, 'r', 2, school)).toBe('R04');
  });

  it('a miss at R01 ends placement at R01', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'miss', 'miss');
    probe(p, 'R13', 'miss', 'miss');
    probe(p, 'R04', 'miss', 'miss');
    expect(nextProbe(p, c, 'r', 2, school)).toBe('R02');
    probe(p, 'R02', 'miss', 'miss');
    expect(nextProbe(p, c, 'r', 2, school)).toBe('R01');
    probe(p, 'R01', 'miss', 'miss');
    expect(placementEnd(p, c, 'r', 2, school)).toBe('R01');
  });

  it('ends after 10 probe items, at lo', () => {
    const p = initPlacement(c, 'r', year1, school);
    p.items = 10;
    expect(placementEnd(p, c, 'r', 2, school)).toBe('R13');
  });

  it('ends at the start of the fifth visit, at lo', () => {
    const p = initPlacement(c, 'r', year1, school);
    expect(placementEnd(p, c, 'r', 4, school)).toBeNull();
    expect(placementEnd(p, c, 'r', 5, school)).toBe('R13');
  });

  it('a profile without a probe is done at once', () => {
    const p = initPlacement(c, 'r', c.budget.profiles.fresh, () => false);
    expect(p.done).toBe(true);
    expect(nextProbe(p, c, 'r', 1, () => false)).toBeNull();
  });

  it('a first try at a step below a verified lo changes nothing', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'miss', 'miss');
    probe(p, 'R13', 'first', 'first');
    probe(p, 'R05', 'miss', 'miss');
    expect(p).toMatchObject({ lo: 'R13', loVerified: true, floorMissed: false });
  });
});
