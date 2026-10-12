import { describe, it, expect } from 'vitest';
import { duskBabies, freeLeads, LONG_VISIT_MS, mangerDue, pickWalk, stableRowOf, walkRow } from '../../src/core/heartbeat/walk.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import { makeRng } from '../../src/core/rng.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const NAMES = ['Tam', 'Pip', 'Ken', 'Tim', 'tim', 'Sam', 'Dan', 'Meg', 'Pat', 'Nan'];
/** Names repeat every ten babies, so every row has the same ten names. */
const names = (n: number) => new Map<string, string | null>(herd(n).map((b, i) => [b.id, NAMES[i % 10]] as const));
const yes = () => true;
const no = () => false;

describe('walkRow', () => {
  it('prefers the row with more due names', () => {
    const layout = stableLayout(herd(25), 3);
    const due = new Set(['b12', 'b13', 'b1']);
    expect(walkRow({ layout, names: names(25), eligible: yes, isDue: (b) => due.has(b) })).toBe(2);
  });
  it('gives a tie to the lower row', () => {
    expect(walkRow({ layout: stableLayout(herd(25), 3), names: names(25), eligible: yes, isDue: no })).toBe(1);
  });
  it('returns null below three heads in every row', () => {
    expect(walkRow({ layout: stableLayout(herd(2), 1), names: names(2), eligible: yes, isDue: yes })).toBeNull();
    expect(walkRow({ layout: stableLayout(herd(12), 2), names: names(12), eligible: (b) => b === 'b11', isDue: yes })).toBeNull();
  });
  it('returns null when no name in a row can be asked', () => {
    expect(walkRow({ layout: stableLayout(herd(6), 1), names: names(6), eligible: no, isDue: yes })).toBeNull();
  });
  it('skips a row whose only askable names are shared', () => {
    const n = names(5);
    expect(walkRow({ layout: stableLayout(herd(5), 1), names: n, eligible: (b) => b === 'b4' || b === 'b5', isDue: yes })).toBeNull();
  });
});

describe('pickWalk', () => {
  it('never returns two babies with the same name, never more than count, due first', () => {
    const layout = stableLayout(herd(10), 1);
    for (let seed = 1; seed <= 40; seed++) {
      for (const count of [1, 2, 3] as const) {
        const picks = pickWalk({ layout, row: 1, names: names(10), count, eligible: yes, isDue: (b) => b === 'b7', rng: makeRng(seed) });
        expect(picks.length).toBe(count);
        expect(new Set(picks.map((p) => p.name.toLowerCase())).size).toBe(picks.length);
        for (const p of picks) expect(['b4', 'b5']).not.toContain(p.baby);
        expect(picks[0]).toEqual({ baby: 'b7', name: 'Dan', door: 7 });
      }
    }
  });
  it('takes only babies of the row', () => {
    const picks = pickWalk({ layout: stableLayout(herd(20), 2), row: 2, names: names(20), count: 3, eligible: yes, isDue: no, rng: makeRng(3) });
    for (const p of picks) expect(p.door).toBeGreaterThan(10);
  });
  it('returns fewer when fewer can be asked', () => {
    const picks = pickWalk({ layout: stableLayout(herd(6), 1), row: 1, names: names(6), count: 3, eligible: (b) => b === 'b2', isDue: no, rng: makeRng(1) });
    expect(picks).toEqual([{ baby: 'b2', name: 'Pip', door: 2 }]);
  });
});

describe('duskBabies', () => {
  it('is the ten babies of the walk row', () => {
    const h = herd(35);
    expect(duskBabies(stableLayout(h, 4), 2, h)).toEqual(Array.from({ length: 10 }, (_, i) => `b${11 + i}`));
  });
  it('is the whole small herd without a row', () => {
    const h = herd(2);
    expect(duskBabies(stableLayout(h, 1), null, h).sort()).toEqual(['b1', 'b2']);
  });
  it('is the newest ten without a row, favourites first', () => {
    const h = herd(14).map((b) => ({ ...b, favourite: b.id === 'b1' }));
    const d = duskBabies(stableLayout(h, 1), null, h);
    expect(d).toHaveLength(10);
    expect(d[0]).toBe('b1');
    expect(d[1]).toBe('b14');
  });
});

describe('stableRowOf', () => {
  it('is the walk row, else the row of the newest baby with a door, else 1', () => {
    expect(stableRowOf(stableLayout(herd(25), 3), 2, herd(25))).toBe(2);
    expect(stableRowOf(stableLayout(herd(25), 3), null, herd(25))).toBe(3);
    expect(stableRowOf(stableLayout(herd(15), 1), null, herd(15))).toBe(1);
    expect(stableRowOf(stableLayout([], 1), null, [])).toBe(1);
  });
});

describe('freeLeads', () => {
  it('asks three leads at most', () => {
    expect(freeLeads(2)).toBe(2);
    expect(freeLeads(8)).toBe(3);
    expect(freeLeads(0)).toBe(0);
  });
});

describe('mangerDue', () => {
  it('is false on a long visit and follows the test flag', () => {
    expect(mangerDue({ checked: 30, visitMs: 60_000, forcedLong: null })).toBe(false);
    expect(mangerDue({ checked: 5, visitMs: LONG_VISIT_MS, forcedLong: null })).toBe(false);
    expect(mangerDue({ checked: 10, visitMs: 8 * 60_000, forcedLong: null })).toBe(true);
    expect(mangerDue({ checked: 10, visitMs: 8 * 60_000, forcedLong: true })).toBe(false);
    expect(mangerDue({ checked: 40, visitMs: 30 * 60_000, forcedLong: false })).toBe(true);
  });
});
