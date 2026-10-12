// G/tests/content/real-blocklist.test.ts
import { describe, it, expect } from 'vitest';
import { readContent, readRawBlocklist } from '../../tools/lib/read-content.ts';
import { buildBlocklist, checkBlocked } from '../../src/core/content/blocklist.ts';
import { phonemesOf, splitUsual } from '../../src/core/content/gpc.ts';

describe('shared blocklist', () => {
  const c = readContent('1.0');
  const list = buildBlocklist(readRawBlocklist(), c.gpcs);
  const check = (letters: string) => checkBlocked(phonemesOf(splitUsual(letters, c.gpcs)!, c.gpcs), list);

  it('splits every entry', () => expect(list.unsplit).toEqual([]));

  it('blocks strong words by sound, in English and Dutch', () => {
    for (const w of ['fuk', 'fuck', 'phuk', 'shit', 'kut', 'lul', 'pik']) expect(check(w)?.level, w).toBe('strong');
  });

  it('blocks toilet words with a giggle', () => {
    for (const w of ['poo', 'wee', 'poep']) expect(check(w)?.level, w).toBe('toilet');
  });

  it('blocks names that are rude in the other language', () => {
    expect(check('fanny')).not.toBeNull();
    expect(check('kak')?.level).toBe('toilet');
    expect(check('cack')?.level).toBe('toilet');
  });

  it('lets ordinary names through', () => {
    for (const w of ['cassidy', 'scarlett', 'pom', 'pip', 'sam', 'tess', 'dot', 'fen', 'bella', 'nan', 'bex']) expect(check(w), w).toBeNull();
  });
});
