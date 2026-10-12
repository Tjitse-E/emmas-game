import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalJson, sha1Hex, sha256Hex } from '../../src/core/hash.ts';

const node = (alg: string, s: string | Uint8Array) => createHash(alg).update(s).digest('hex');

describe('hash', () => {
  it('matches node:crypto across block boundaries and unicode', () => {
    for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 1000, 100_000]) {
      const s = 'x'.repeat(n) + 'é🦄';
      expect(sha256Hex(s)).toBe(node('sha256', s));
      expect(sha1Hex(s)).toBe(node('sha1', s));
    }
  });

  it('hashes bytes', () => {
    const b = new Uint8Array(300).map((_, i) => (i * 7) & 255);
    expect(sha256Hex(b)).toBe(node('sha256', b));
    expect(sha1Hex(b)).toBe(node('sha1', b));
  });

  it('known vectors', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  it('canonical JSON sorts keys at every level and drops undefined fields', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: 2, c: undefined }] })).toBe('{"a":[1,{"d":2}],"b":1}');
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});
