// G/tests/planner/carriers.test.ts
import { describe, it, expect } from 'vitest';
import { carrierFor, carrierKey } from '../../src/core/planner/carriers.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import type { ItemRequest } from '../../src/core/planner/types.ts';
import { setup } from './setup.ts';

const R: ItemRequest = { strand: 'r', moments: ['wish', 'twin-wish', 'one-or-many'], place: 'meadow' };
const S: ItemRequest = { strand: 's', moments: ['label', 'label-plural', 'naming-bells'], place: 'shelf' };
const M: ItemRequest = { strand: 'm', moments: ['wall'], place: 'building' };

describe('carrierFor', () => {
  const { ctx } = setup({ r: 'R21', s: 'S12', m: 'M10' });
  const x = ctx();

  it('a wish uses a pictured word she can read and logs the served step items', () => {
    const ch = carrierFor(x, 'R21', 'r:cl:-st', 'wish', 1, mulberry32(1), R)!;
    expect(ch.carrier).toEqual({ kind: 'word', word: 'nest' });
    expect(ch.items).toEqual(['r:cl:-st']);
  });

  it('one-or-many shows one thing for no ending and a heap for an ending', () => {
    const one = carrierFor(x, 'R19', 'r:end:none', 'one-or-many', 1, mulberry32(3), R)!;
    expect(one.carrier).toMatchObject({ kind: 'plural', form: 'one', count: 1 });
    expect(one.items).toEqual(['r:end:none']);
    const many = carrierFor(x, 'R19', 'r:end:es', 'one-or-many', 1, mulberry32(3), R)!;
    expect(many.carrier).toMatchObject({ kind: 'plural', form: 'many' });
    expect(['fox', 'box', 'dish']).toContain((many.carrier as { word: string }).word);
    expect((many.carrier as { count: number }).count).toBeGreaterThanOrEqual(3);
  });

  it('one-or-many only uses stems she can read', () => {
    const y = setup({ r: 'R01', s: 'S02', m: 'M01' }).ctx();
    expect(carrierFor(y, 'R19', 'r:end:s', 'one-or-many', 1, mulberry32(1), R)).toBeNull();
  });

  it('a twin wish serves both words of the pair', () => {
    const ch = carrierFor(x, 'R04D', 'r:pair:a-e-u', 'twin-wish', 3, mulberry32(4), R)!;
    expect(ch.carrier.kind).toBe('twin');
    expect(ch.pair).toBe('a-e-u');
    expect(['pan|pen', 'pen|pan', 'hat|hut', 'hut|hat', 'cap|cup', 'cup|cap', 'net|nut', 'nut|net']).toContain(carrierKey(ch.carrier));
  });

  it('a label uses a pictured word with the item', () => {
    const ch = carrierFor(x, 'S04', 's:g:h', 'label', 1, mulberry32(5), S)!;
    expect(['hat', 'hut', 'hand']).toContain((ch.carrier as { word: string }).word);
    expect(ch.items).toEqual(['s:g:h']);
  });

  it('a plural label at level 3 holds one thing in about one jar in four', () => {
    const rng = mulberry32(6);
    let ones = 0;
    for (let i = 0; i < 400; i++) {
      const ch = carrierFor(x, 'S10', 's:end:s', 'label-plural', 3, rng, S)!;
      const p = ch.carrier as { form: string; count: number };
      if (p.count === 1) { ones++; expect(p.form).toBe('one'); }
      else expect(p.count).toBeGreaterThanOrEqual(2);
    }
    expect(ones / 400).toBeGreaterThan(0.15);
    expect(ones / 400).toBeLessThan(0.35);
  });

  it('naming moments hand naming the focus GPCs', () => {
    expect(carrierFor(x, 'S04', 's:g:h', 'naming-bells', 1, mulberry32(7), S)!.carrier).toEqual({ kind: 'spell', focus: ['h'] });
    expect(carrierFor(x, 'S12', 's:cl:-st', 'naming-bells', 1, mulberry32(7), S)!.carrier).toEqual({ kind: 'spell', focus: ['s', 't'] });
  });

  it('a wall moment carries a maths task like an egg (R22)', () => {
    expect(carrierFor(x, 'M09', 'm:miss:10-7', 'wall', 3, mulberry32(8), M)!.carrier)
      .toEqual({ kind: 'maths', task: { op: 'missing', whole: 10, part: 7 } });
  });

  it('a station wish uses a station word, never a thing word (R34)', () => {
    const ch = carrierFor(x, 'R05', 'r:g:b', 'station-wish', 3, mulberry32(9), { strand: 'r', moments: ['station-wish'], place: 'stalls' })!;
    expect(ch.carrier).toEqual({ kind: 'word', word: 'brush' });
    expect(ch.items).toEqual(['r:g:b']);
    expect(carrierFor(x, 'R05', 'r:g:h', 'station-wish', 3, mulberry32(9), { strand: 'r', moments: ['station-wish'], place: 'stalls' })).toBeNull();
  });

  it('carrier keys are stable', () => {
    expect(carrierKey({ kind: 'maths', task: { op: 'missing', whole: 10, part: 7 } })).toBe('m:missing:10,7');
    expect(carrierKey({ kind: 'plural', word: 'fox', form: 'many', count: 3 })).toBe('fox:many');
    expect(carrierKey({ kind: 'door', n: 12 })).toBe('door:12');
  });
});
