// The results log's server lines (src/game/results.ts): every diag.txt query stays under 400 characters and keeps
// the fields Tjitse reads first.
import { describe, expect, it } from 'vitest';
import { DIAG_MAX, type PlayLine, type ResultLine, diagQuery, playFields, resultFields } from '../src/game/results';
import { GIFT_SETS } from '../src/wardrobe';

const wish: ResultLine = {
  part: 'wish1', strand: 'r', outcome: 'miss', misses: 1, ms: 5234.6,
  detail: { kind: 'dress', word: 'cape', level: 1, size: 4, tried: ['cap'], decoys: { cap: 'frame', coat: 'onset', crown: 'onset' }, printTouched: false, quick: true },
};
const egg: ResultLine = {
  part: 'egg1', strand: 'm', outcome: 'helped', misses: 1, ms: 9000,
  detail: { kind: 'warm', need: 14, have: 6, answer: 8, band: 'a', stones: [4, 6, 7, 8], place: 3, decoys: { 4: 'first-nest', 6: 'heard', 7: 'slip' }, tried: ['6'], quick: true },
};

describe('diag lines', () => {
  it('writes a wish result with its level, basket and decoys', () => {
    const q = new URLSearchParams(diagQuery(resultFields(wish)));
    expect(Object.fromEntries(q)).toEqual({ kind: 'result', part: 'wish1', s: 'r', o: 'miss', ms: '5235', mi: '1', lv: '1', n: '4', w: 'cape', pt: '0', q: '1', tried: 'cap:frame' });
  });

  it('writes a maths result with the band, stones, place, decoys and a quick pick', () => {
    const q = Object.fromEntries(new URLSearchParams(diagQuery(resultFields(egg))));
    expect(q).toMatchObject({ kind: 'result', part: 'egg1', s: 'm', o: 'helped', band: 'a', st: '4,6,7,8', pl: '3', q: '1', tried: '6:heard', dc: '4:first-nest,6:heard,7:slip' });
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

describe('the kind=play line (2.3 section 17.5)', () => {
  const play: PlayLine = {
    v: '2.3.0', plays: 3, playMs: 21.4 * 60_000, checkedMs: 571_000, mirrorMs: 45_000, cornerDressMs: 60_000, cornerMs: 74_000,
    freeMs: 148_000, gate: { kind: 'phrase', first: 1 }, quests: ['picnic', 'beads', 'corner'],
    gifts: [{ field: 'crown', id: 'tiara' }, { field: 'earrings', id: 'drops' }, { field: 'style', id: 'lowbun' }],
    reading: 2, phrases: 1, band: 'b', patterns: 2,
  };

  it('writes the checked, dressing, mirror, Corner dressing, Corner visit and free time, the gate, the quests, the gifts and the levels', () => {
    const q = Object.fromEntries(new URLSearchParams(diagQuery(playFields(play))));
    expect(q).toEqual({
      kind: 'play', v: '2.3.0', pl: '3', min: '21.4', ck: '571', dr: '105', mi: '45', co: '60', cv: '74', fr: '148', gk: 'phrase', gt: '1',
      q: 'picnic,beads,corner', rl: '2', ph: '1', mb: 'b', pt: '2', gf: 'crown:tiara,earrings:drops,style:lowbun',
    });
  });

  it('stays under 400 characters, even with every gift of every set on one play', () => {
    const all = Object.values(GIFT_SETS).flatMap((s) => s.items);
    const busiest = { ...play, plays: 9999, playMs: 99 * 60_000, gate: { kind: 'word' as const, first: 2 }, quests: ['picnic', 'rack', 'beads', 'corner'], gifts: all };
    const line = diagQuery(playFields(busiest));
    expect(line.length).toBeLessThan(400);
    // The fields Tjitse reads first always arrive.
    const q = new URLSearchParams(line);
    for (const k of ['v', 'pl', 'min', 'ck', 'dr', 'gk', 'gt', 'q', 'rl', 'ph', 'mb', 'pt']) expect(q.has(k), k).toBe(true);
  });

  it('leaves the gate out when she did not visit the Corner', () => {
    const q = new URLSearchParams(diagQuery(playFields({ ...play, gate: null, cornerMs: 0, cornerDressMs: 0 })));
    expect(q.has('gk')).toBe(false);
    expect(q.has('gt')).toBe(false);
    expect(q.get('co')).toBe('0');
    expect(q.get('cv')).toBe('0');
  });

  it('counts only the music box as the Corner dressing, so dressing is the mirror plus the Corner', () => {
    const q = new URLSearchParams(diagQuery(playFields(play)));
    expect(Number(q.get('dr'))).toBe(Number(q.get('mi')) + Number(q.get('co')));
    expect(Number(q.get('cv'))).toBeGreaterThan(Number(q.get('co')));
  });
});
