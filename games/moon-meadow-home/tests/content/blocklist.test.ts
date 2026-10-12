// G/tests/content/blocklist.test.ts
import { describe, it, expect } from 'vitest';
import { buildBlocklist, checkBlocked, phonemeKey, type RawBlocklist } from '../../src/core/content/blocklist.ts';
import { phonemesOf } from '../../src/core/content/gpc.ts';
import type { RawGpc } from '../../src/core/content/types.ts';

const g = (id: string, phonemes: string[], vowel = false, extra: Partial<RawGpc> = {}): RawGpc =>
  ({ id, text: id.split('.')[0], phonemes, vowel, sound: null, fluency: true, ...extra });
const T = Object.fromEntries([
  g('f', ['f']), g('ph', ['f']), g('u', ['u'], true), g('k', ['k']), g('c', ['k']), g('ck', ['k']),
  g('p', ['p']), g('oo', ['oo'], true), g('a', ['a'], true), g('s', ['s']), g('ss', ['s']), g('i', ['i'], true),
  g('d', ['d']), g('y.ee', ['ee'], true), g('ar', ['ar'], true), g('l', ['l']), g('tt', ['t']), g('t', ['t']),
  g('e', ['e'], true), g('sl', ['s', 'l']), g('r', ['r']), g('o', ['o'], true),
].map(x => [x.id, x]));

const RAW: RawBlocklist = {
  version: 1,
  entries: [
    { w: 'fuck', lang: 'en', level: 'strong' },
    { w: 'poo', lang: 'en', level: 'toilet' },
    { w: 'kut', lang: 'nl', level: 'strong' },
    { w: 'arse', lang: 'en', level: 'rude' },
    { w: 'slut', lang: 'en', level: 'strong' },
    { w: 'qqq', lang: 'en', level: 'rude' },
  ],
};
const list = buildBlocklist(RAW, T);
const ph = (gpcs: string[]) => phonemesOf(gpcs, T);

describe('checkBlocked', () => {
  it('catches a strong word however it is spelled', () => {
    expect(checkBlocked(ph(['f', 'u', 'k']), list)).toEqual({ level: 'strong', part: false });
    expect(checkBlocked(ph(['ph', 'u', 'ck']), list)).toEqual({ level: 'strong', part: false });
    expect(checkBlocked(ph(['f', 'f', 'u', 'u', 'k']), list)).toEqual({ level: 'strong', part: false });
  });
  it('catches a strong word inside a longer name', () => {
    expect(checkBlocked(ph(['f', 'u', 'k', 'i', 'd', 'y.ee']), list)).toEqual({ level: 'strong', part: true });
  });
  it('blocks toilet words only as a whole name', () => {
    expect(checkBlocked(ph(['p', 'oo']), list)).toEqual({ level: 'toilet', part: false });
    expect(checkBlocked(ph(['p', 'oo', 'l', 'a']), list)).toBeNull();
  });
  it('catches Dutch words she can build', () => {
    expect(checkBlocked(ph(['k', 'u', 't']), list)?.level).toBe('strong');
  });
  it('lets innocent names through', () => {
    expect(checkBlocked(ph(['c', 'a', 'ss', 'i', 'd', 'y.ee']), list)).toBeNull();          // Cassidy
    expect(checkBlocked(ph(['s', 'c', 'ar', 'l', 'e', 'tt']), list)).toBeNull();            // Scarlett
  });
  it('reports entries it cannot split', () => {
    expect(list.unsplit).toEqual(['qqq']);
  });
  it('phonemeKey joins with dots', () => expect(phonemeKey(['f', 'u', 'k'])).toBe('f.u.k'));
});
