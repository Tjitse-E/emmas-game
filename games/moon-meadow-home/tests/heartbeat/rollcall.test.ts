import { describe, it, expect } from 'vitest';
import { logRollCall, nameEligible, pickRollCall, rollCallCount } from '../../src/core/heartbeat/rollcall.ts';
import { goodnightCountLines, skyState } from '../../src/core/heartbeat/sky.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import { makeRng } from '../../src/core/rng.ts';

const NAMES = ['Tam', 'Pip', 'Ken', 'Tim', 'tim', 'Sam', 'Dan', 'Meg', 'Pat', 'Nan', 'Ben', 'Lily'];
const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const names = (n: number) => new Map<string, string | null>(herd(n).map((b, i) => [b.id, NAMES[i] ?? null] as const));
const yes = () => true;

describe('rollCallCount', () => {
  it('asks one name on visit 1 or after 30 checked moments, else two or three', () => {
    expect(rollCallCount({ visitIndex: 1, checkedThisVisit: 0, due: 5 })).toBe(1);
    expect(rollCallCount({ visitIndex: 4, checkedThisVisit: 31, due: 5 })).toBe(1);
    expect(rollCallCount({ visitIndex: 4, checkedThisVisit: 10, due: 1 })).toBe(2);
    expect(rollCallCount({ visitIndex: 4, checkedThisVisit: 10, due: 3 })).toBe(3);
  });
});

describe('nameEligible', () => {
  it('needs a decodable name or an earlier first try', () => {
    expect(nameEligible(['T', 'a', 'm'], new Set(['t', 'a', 'm']), 0)).toBe(true);
    expect(nameEligible(['L', 'i', 'l', 'y'], new Set(['l', 'i']), 0)).toBe(false);
    expect(nameEligible(['L', 'i', 'l', 'y'], new Set(['l', 'i']), 1)).toBe(true);
  });
});

describe('pickRollCall', () => {
  it('asks nothing with fewer than three heads', () => {
    const r = pickRollCall({ layout: stableLayout(herd(2), 1), names: names(2), count: 2, eligible: yes, isDue: yes, door: null, rng: makeRng(1) });
    expect(r.picks).toEqual([]);
  });
  it('never asks a name that two babies on the page share', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = pickRollCall({ layout: stableLayout(herd(8), 1), names: names(8), count: 3, eligible: yes, isDue: () => false, door: null, rng: makeRng(seed) });
      expect(r.picks).toHaveLength(3);
      for (const p of r.picks) expect(['b4', 'b5']).not.toContain(p.baby);
    }
  });
  it('asks due names first', () => {
    const r = pickRollCall({ layout: stableLayout(herd(8), 1), names: names(8), count: 1, eligible: yes, isDue: (b) => b === 'b7', door: null, rng: makeRng(2) });
    expect(r.picks).toEqual([{ kind: 'name', baby: 'b7', name: 'Dan' }]);
  });
  it('starts with a spoken door when the maths queue serves M07', () => {
    const r = pickRollCall({ layout: stableLayout(herd(15), 2), names: names(12), count: 2, eligible: yes, isDue: () => false, door: 12, rng: makeRng(3) });
    expect(r.picks[0]).toEqual({ kind: 'door', baby: 'b12', number: 12 });
    expect(r.picks).toHaveLength(2);
  });
  it('ignores a spoken door for a baby in the camp', () => {
    const r = pickRollCall({ layout: stableLayout(herd(12), 1), names: names(12), count: 1, eligible: yes, isDue: () => false, door: 11, rng: makeRng(4) });
    expect(r.picks[0].kind).toBe('name');
  });
  it('skips babies who are not eligible or have no name', () => {
    const n = names(6); n.set('b6', null);
    const r = pickRollCall({ layout: stableLayout(herd(6), 1), names: n, count: 3, eligible: (b) => b !== 'b1', isDue: () => false, door: null, rng: makeRng(5) });
    for (const p of r.picks) expect(['b1', 'b6']).not.toContain(p.baby);
  });
  it('logs only while three or more candidates are left', () => {
    expect(logRollCall(3)).toBe(true);
    expect(logRollCall(2)).toBe(false);
  });
});

describe('sky', () => {
  it('turns every ten stars into a sky unicorn', () => {
    expect(skyState(41, ['Rose', null])).toEqual({ unicorns: 4, stars: 1, unnamed: [1, 2, 3] });
    expect(skyState(9, [])).toEqual({ unicorns: 0, stars: 9, unnamed: [] });
  });
  it('says counts up to sixty for sure, up to one hundred when Wave C made the clip, and sky counts to twelve', () => {
    expect(goodnightCountLines(41, 4)).toEqual({ required: ['num-herd-41', 'num-sky-4'], optional: [] });
    expect(goodnightCountLines(75, 7)).toEqual({ required: ['num-sky-7'], optional: ['num-herd-75'] });
    expect(goodnightCountLines(9, 0)).toEqual({ required: ['num-herd-9'], optional: [] });
    expect(goodnightCountLines(100, 10)).toEqual({ required: ['num-sky-10'], optional: ['num-herd-100'] });
    expect(goodnightCountLines(130, 13)).toEqual({ required: [], optional: [] });
  });
});
