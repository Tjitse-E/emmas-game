// The results log's server lines (src/game/results.ts): every diag.txt query stays under 400 characters and keeps
// the fields Tjitse reads first.
import { describe, expect, it } from 'vitest';
import { DIAG_MAX, type ResultLine, diagQuery, resultFields } from '../src/game/results';

const wish: ResultLine = {
  part: 'wish1', strand: 'r', outcome: 'miss', misses: 1, ms: 5234.6,
  detail: { kind: 'dress', word: 'cape', level: 1, size: 4, tried: ['cap'], decoys: { cap: 'frame', coat: 'onset', crown: 'onset' }, printTouched: false, quick: true },
};
const egg: ResultLine = {
  part: 'egg1', strand: 'm', outcome: 'helped', misses: 1, ms: 9000,
  detail: { kind: 'warm', need: 14, have: 6, answer: 8, band: 'a', stones: [4, 6, 7, 8], place: 3, decoys: { 4: 'first-nest', 6: 'heard', 7: 'slip' }, tried: ['6'] },
};

describe('diag lines', () => {
  it('writes a wish result with its level, basket and decoys', () => {
    const q = new URLSearchParams(diagQuery(resultFields(wish)));
    expect(Object.fromEntries(q)).toEqual({ kind: 'result', part: 'wish1', s: 'r', o: 'miss', ms: '5235', mi: '1', lv: '1', n: '4', w: 'cape', pt: '0', q: '1', tried: 'cap:frame' });
  });

  it('writes a maths result with the band, stones, place and decoys', () => {
    const q = Object.fromEntries(new URLSearchParams(diagQuery(resultFields(egg))));
    expect(q).toMatchObject({ kind: 'result', part: 'egg1', s: 'm', o: 'helped', band: 'a', st: '4,6,7,8', pl: '3', tried: '6:heard', dc: '4:first-nest,6:heard,7:slip' });
  });

  it('stays under 400 characters, cutting long lists first', () => {
    const tried = Array.from({ length: 80 }, (_, i) => `word${i}`);
    const long = diagQuery(resultFields({ ...wish, detail: { ...wish.detail, tried } }));
    expect(long.length).toBeLessThanOrEqual(DIAG_MAX);
    const q = new URLSearchParams(long);
    expect(q.get('part')).toBe('wish1');
    expect(q.get('tried')!.split(',').length).toBeGreaterThan(5);
    expect(q.get('tried')!.split(',').every((w) => /^word\d+$/.test(w))).toBe(true);
  });

  it('leaves out empty fields', () => {
    expect(diagQuery({ kind: 'look', rows: '', ms: 12, hair: 'candy', x: undefined, y: null })).toBe('kind=look&ms=12&hair=candy');
  });
});
