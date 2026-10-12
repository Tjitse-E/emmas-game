// G/tests/planner/eggs-names.test.ts
import { describe, it, expect } from 'vitest';
import { nextEgg, eggKindOf, eggMoments } from '../../src/core/planner/eggs.ts';
import { nextNameReviews, type NameCandidate } from '../../src/core/planner/names.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { result } from '../fixtures/events.ts';
import { setup, VISIT2 } from './setup.ts';

describe('eggs', () => {
  it('maps moments to egg kinds', () => {
    const { c } = setup({});
    expect(eggKindOf(c, 'egg-two-stone')).toBe('two-stone');
    expect(eggKindOf(c, 'wish')).toBeNull();
    expect(eggMoments(c)).toEqual(['egg-moon', 'egg-small-nest', 'egg-two-stone']);
  });
  it('offers the egg kind of the pick', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M10' }, { school: false }).ctx();
    const offer = nextEgg(x, () => 0);
    expect(offer).toMatchObject({ kind: 'two-stone', pick: { step: 'M10', slot: 'current' } });
  });
  it('offers a free egg when a tired visit has nothing in box 3', () => {
    const extra = Array.from({ length: 30 }, (_, i) =>
      result(VISIT2 + 100 + i, { strand: 'm', step: 'M01', items: ['m:sub:1'], r: 'miss', slot: 'review', scaffold: 1, moment: 'egg-moon' }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M10' }, { school: false }).ctx(extra);
    expect(nextEgg(x, mulberry32(1))).toEqual({ kind: 'two-stone', pick: null });
  });
  it('a free egg takes the kind of the highest done egg step when the current step lays none', () => {
    const extra = Array.from({ length: 30 }, (_, i) =>
      result(VISIT2 + 100 + i, { strand: 'm', step: 'M01', items: ['m:sub:1'], r: 'miss', slot: 'review', scaffold: 1, moment: 'egg-moon' }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M07' }, { school: false }).ctx(extra);
    expect(nextEgg(x, mulberry32(1))).toEqual({ kind: 'small-nest', pick: null });
  });
});

describe('name reviews', () => {
  const herd: NameCandidate[] = [
    { babyId: 'p1', name: 'Pip', gpcs: ['p', 'i', 'p'] },
    { babyId: 's1', name: 'Sam', gpcs: ['s', 'a', 'm'] },
    { babyId: 'b1', name: 'Ben', gpcs: ['b', 'e', 'n'] },
    { babyId: 'sh1', name: 'Shay', gpcs: ['sh', 'ay'] },
    { babyId: 'p2', name: 'Pip', gpcs: ['p', 'i', 'p'] },
  ];
  it('asks only names she can decode, without duplicates', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }).ctx();
    const picks = nextNameReviews(x, herd, 5, 'roll-call', mulberry32(1));
    expect(picks.map(p => (p.carrier as { name: string }).name).sort()).toEqual(['Ben', 'Pip', 'Sam']);
    expect(picks[0]).toMatchObject({ strand: 'name', step: null, slot: 'name', moment: 'roll-call', scaffold: 3 });
  });
  it('asks a name she read before even when it is not decodable', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }).ctx([
      result(VISIT2 + 1, { strand: 'name', step: null, items: ['name:shay'], r: 'first', slot: 'name', moment: 'roll-call' }),
    ]);
    expect(nextNameReviews(x, herd, 5, 'roll-call', mulberry32(1)).map(p => p.items[0])).toContain('name:shay');
  });
  it('asks due names first', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' });
    const x = s.ctx([result(VISIT2 + 1, { strand: 'name', step: null, items: ['name:ben'], r: 'miss', slot: 'name', moment: 'roll-call' })]);
    x.l.visit.box0['name:ben'] = 2;   // two other name results since the miss, so box 0 is due again
    expect(nextNameReviews(x, herd, 1, 'roll-call', mulberry32(1))[0].items).toEqual(['name:ben']);
  });
  it('never asks a name without its clip', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' });
    const x = s.ctx([], { clip: id => id !== 'name-ben', picture: () => true });
    expect(nextNameReviews(x, herd, 5, 'envelope', mulberry32(1)).map(p => p.items[0]).sort()).toEqual(['name:pip', 'name:sam']);
  });
});
