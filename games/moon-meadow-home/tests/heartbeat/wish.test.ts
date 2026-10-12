import { describe, it, expect } from 'vitest';
import { buildWish, printUnits, soundedGraphemes } from '../../src/core/heartbeat/wish.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BY_WORD } from './words.ts';

const served = (step: string, carrier: string, scaffold: 1 | 2 | 3 = 1, twin?: string): Served =>
  ({ strand: 'r', step, id: carrier, carrier, items: ['a'], scaffold, probe: false, source: 'current', twin });
const base = { baby: 'b1', babyName: 'Tam', twinBaby: 'b2', words: BY_WORD, bathPond: true, sounded: new Set(['p', 'a', 'n', 'h', 't']), rng: makeRng(1) };

describe('printUnits', () => {
  it('prints endings without the dash and split digraphs around the consonant', () => {
    expect(printUnits(['h', 'a', 't', '-s'], () => false).map((u) => u.text).join('')).toBe('hats');
    const cake = printUnits(['c', 'a-e', 'k'], () => false);
    expect(cake.map((u) => u.text)).toEqual(['c', 'a', 'k', 'e']);
    expect(cake[3].g).toBe('a-e');
  });
});

describe('soundedGraphemes', () => {
  it('collects graphemes of passed and placed steps only', () => {
    const s = soundedGraphemes([{ id: 'R01', items: ['s', 'a'] }, { id: 'R02', items: ['i'] }, { id: 'R19', items: ['-s', '-es'] }],
      (st) => (st === 'R01' ? 'placed' : st === 'R02' ? 'passed' : 'school'));
    expect([...s].sort()).toEqual(['a', 'i', 's']);
  });
});

describe('buildWish', () => {
  it('builds a basket wish sized by scaffold, with dots by level', () => {
    const w1 = buildWish({ ...base, served: served('R01', 'pan', 1) })!;
    expect(w1).toMatchObject({ kind: 'basket', print: 'pan', dotsMs: 500, plural: false, station: null });
    expect(w1.basket).toHaveLength(3);
    expect(buildWish({ ...base, served: served('R01', 'pan', 2) })!.basket).toHaveLength(4);
    const w3 = buildWish({ ...base, served: served('R01', 'pan', 3) })!;
    expect(w3.basket).toHaveLength(6);
    expect(w3.dotsMs).toBeNull();
  });
  it('keeps graphemes of steps not yet passed silent at level 3', () => {
    const w = buildWish({ ...base, served: served('R19', 'hats', 3) })!;
    expect(w.units.find((u) => u.g === '-s')!.silent).toBe(true);
    expect(w.units.find((u) => u.g === 'h')!.silent).toBe(false);
  });
  it('makes R19 wishes one-or-many baskets', () => {
    const w = buildWish({ ...base, served: served('R19', 'hats', 1) })!;
    expect(w).toMatchObject({ kind: 'basket', plural: true, print: 'hats' });
    expect(w.basket.some((i) => i.heap && i.word === 'hat')).toBe(true);
  });
  it('sends station words to the station, but not while plurals decide', () => {
    expect(buildWish({ ...base, served: served('R10', 'swing') })).toMatchObject({ kind: 'station', station: 'swing', basket: [] });
    expect(buildWish({ ...base, served: served('R19', 'hat', 1) })!.kind).toBe('basket');
  });
  it('skips a bath wish before the Bath Pond is built', () => {
    expect(buildWish({ ...base, bathPond: false, served: served('R10', 'bath') })).toBeNull();
  });
  it('builds a twin wish with both words in one basket', () => {
    const w = buildWish({ ...base, served: served('R04D', 'pan', 1, 'pen') })!;
    expect(w.kind).toBe('twin');
    expect(w.basket.map((i) => i.word)).toEqual(expect.arrayContaining(['pan', 'pen']));
    expect(w.next).toMatchObject({ baby: 'b2', word: { word: 'pen' } });
    expect(w.next!.served.carrier).toBe('pen');
  });
  it('serves the first twin word alone when there is no second baby', () => {
    const w = buildWish({ ...base, twinBaby: null, served: served('R04D', 'pan', 1, 'pen') })!;
    expect(w.kind).toBe('basket');
    expect(w.next).toBeNull();
  });
  it('never wishes a baby its own name, and refuses unknown words', () => {
    expect(buildWish({ ...base, babyName: 'Pan', served: served('R01', 'pan') })).toBeNull();
    expect(buildWish({ ...base, served: served('R01', 'zebra') })).toBeNull();
  });
});
