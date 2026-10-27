// The content's random streams (src/content/rand.ts): one per moment, so a pick in one never shifts another.
import { describe, expect, it } from 'vitest';
import { hash, seeded, stream } from '../src/content/rand';

const take = (r: () => number, n = 5): number[] => Array.from({ length: n }, () => r());

describe('stream', () => {
  it('gives the same numbers for the same seed and label, and other numbers for another label', () => {
    expect(take(stream(5, 'egg2'))).toEqual(take(stream(5, 'egg2')));
    expect(take(stream(5, 'egg2'))).not.toEqual(take(stream(5, 'egg1')));
    expect(take(stream(5, 'egg2'))).not.toEqual(take(stream(6, 'egg2')));
    expect(take(stream(5, 'egg2'))).toEqual(take(seeded(5 ^ hash('egg2'))));
  });

  it('does not depend on what other streams drew', () => {
    const a = stream(1_761_550_000_000, 'wish1');
    take(stream(1_761_550_000_000, 'egg1'), 50);
    expect(take(a)).toEqual(take(stream(1_761_550_000_000, 'wish1')));
  });

  it('hashes labels to unsigned 32-bit numbers', () => {
    for (const label of ['', 'egg1', 'rack', 'picnic', 'naming1']) {
      const h = hash(label);
      expect(Number.isInteger(h) && h >= 0 && h < 2 ** 32).toBe(true);
    }
    expect(hash('egg1')).not.toBe(hash('egg2'));
  });
});
