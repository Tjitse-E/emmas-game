import { describe, expect, it } from 'vitest';
import type { AnyStrand, ItemResult, Result, Rng, ServedItem, Strand, WordView } from '../../src/core/places/types.ts';
import type { ItemResult as ContractItemResult, LearnStrand, Rng as ContractRng } from '../../src/types/contracts.ts';
import { rng, served, word } from './helpers.ts';

// Compile-time checks (tsc --noEmit runs over tests): the place value types are the contract shapes.
const sameItem: ContractItemResult = { id: 'r:end:s', r: 'first' } satisfies ItemResult;
const sameStrand: LearnStrand = 'name' satisfies AnyStrand;
const sameRng: ContractRng = rng(1) satisfies Rng;

describe('place value types', () => {
  it('builds words and served items in the shapes the place logic reads', () => {
    const w: WordView = word('fox', ['f', 'o', 'x'], { plural: { word: 'foxes', ending: 'es', graphemes: ['f', 'o', 'x', 'es'] } });
    const s: ServedItem = served('s', 'S10', 'fox', ['-es']);
    const strand: Strand = s.strand;
    const result: Result = sameItem.r;
    expect(w.plural?.word).toBe('foxes');
    expect([strand, s.kind, s.scaffold, result, sameStrand]).toEqual(['s', 'current', 1, 'first', 'name']);
  });

  it('gives a seeded generator that repeats', () => {
    const a = rng(3), b = rng(3);
    expect([a(), a()]).toEqual([b(), b()]);
    expect(sameRng()).toBeGreaterThanOrEqual(0);
  });
});
