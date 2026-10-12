import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { builtPhonemes, firstSoundGem, gemSoundKey, hasVowel, soundKey, spellingToGems, usualSound } from '../../src/core/naming/sounds.ts';
import { blockedName, checkBlocked, compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { checkBlocked as learningCheckBlocked } from '../../src/core/content/blocklist.ts';
import { BLOCK_FILE } from './fixtures.ts';

describe('sounds', () => {
  it('splits spellings greedily into gems', () => {
    expect(spellingToGems('fuck')).toEqual(['f', 'u', 'ck']);
    expect(spellingToGems('Sophie')).toEqual(['s', 'o', 'ph', 'ie']);
    expect(spellingToGems('shell')).toEqual(['sh', 'e', 'll']);
  });
  it('knows usual sounds and refuses unknown gems', () => {
    expect(usualSound('x')).toEqual(['k', 's']);
    expect(usualSound('a-e')).toEqual(['ai']);
    expect(usualSound('K')).toEqual(['k']);
    expect(usualSound('zq')).toBeNull();
  });
  it('reads y, a final i and a magic e the way names are said', () => {
    expect(builtPhonemes(['S', 'k', 'y'])).toEqual(['s', 'k', 'igh']);
    expect(builtPhonemes(['L', 'y', 'n'])).toEqual(['l', 'i', 'n']);
    expect(builtPhonemes(['L', 'i', 'l', 'y'])).toEqual(['l', 'i', 'l', 'ee']);
    expect(builtPhonemes(['L', 'i', 'l', 'i'])).toEqual(['l', 'i', 'l', 'ee']);
    expect(builtPhonemes(['Y', 'a', 's', 'm', 'i', 'n'])).toEqual(['y', 'a', 's', 'm', 'i', 'n']);
    expect(builtPhonemes(['R', 'o', 's', 'e'])).toEqual(['r', 'oa', 's']);
    expect(builtPhonemes(['T', 'a', 'm'])).toEqual(['t', 'a', 'm']);
  });
  it('makes sound keys that ignore doubled letters, a final s or z, and n before k', () => {
    expect(soundKey(['l', 'i', 'l', 'ee'])).toBe(soundKey(builtPhonemes(['L', 'i', 'l', 'i'])));
    expect(soundKey(['r', 'oa', 'z'])).toBe(soundKey(builtPhonemes(['R', 'o', 's', 'e'])));
    expect(soundKey(['w', 'a', 'ng', 'k'])).toBe(soundKey(['w', 'a', 'n', 'k']));
    expect(soundKey(['b', 'e', 'l', 'l'])).toBe(soundKey(['b', 'e', 'l']));
  });
  it('counts y as a vowel only when there is no other', () => {
    expect(hasVowel(['t', 'm', 'n'])).toBe(false);
    expect(hasVowel(['S', 'k', 'y'])).toBe(true);
    expect(hasVowel(['p', 'i', 'p'])).toBe(true);
  });
  it('finds phonics clips for gems and a gem for each first sound', () => {
    expect(gemSoundKey('ay')).toBe('ai');
    expect(gemSoundKey('ck')).toBe('ck');
    expect(gemSoundKey('a-e')).toBe('ai');
    expect(firstSoundGem('k')).toBe('c');
    expect(firstSoundGem('sh')).toBe('sh');
  });
});

describe('blocklist', () => {
  const bl = compileBlocklist(BLOCK_FILE);
  it('re-exports learning\'s check (R23)', () => {
    expect(checkBlocked).toBe(learningCheckBlocked);
  });
  it('blocks by sound, whatever the spelling or case', () => {
    expect(blockedName(['f', 'u', 'k'], bl)).toBe('strong');
    expect(blockedName(['ph', 'u', 'k'], bl)).toBe('strong');
    expect(blockedName(['F', 'u', 'ck'], bl)).toBe('strong');
    expect(blockedName(['p', 'oo'], bl)).toBe('toilet');
    expect(blockedName(['k', 'u', 't'], bl)).toBe('rude');
    expect(blockedName(['f', 'a', 'n', 'i'], bl)).toBe('rude');
  });
  it('checks only strong words inside longer names', () => {
    expect(blockedName(['M', 'a', 'x', 'f', 'u', 'k'], bl)).toBe('strong');
    expect(blockedName(['P', 'oo', 'j', 'a'], bl)).toBeNull();
    expect(blockedName(['C', 'a', 'ss', 'i', 'd', 'y'], bl)).toBeNull();
    expect(blockedName(['S', 'c', 'ar', 'l', 'e', 'tt'], bl)).toBeNull();
    expect(blockedName(['P', 'o', 'm'], bl)).toBeNull();
  });
  const real = new URL('../../../../shared/blocklist.json', import.meta.url);
  it.skipIf(!existsSync(real))('lets real names through the shared list', () => {
    const shared = compileBlocklist(JSON.parse(readFileSync(real, 'utf8')));
    for (const name of [['C', 'a', 'ss', 'i', 'd', 'y'], ['S', 'c', 'ar', 'l', 'e', 'tt'], ['P', 'o', 'm'], ['L', 'i', 'l', 'y'], ['P', 'i', 'p']]) {
      expect(blockedName(name, shared)).toBeNull();
    }
    expect(blockedName(['f', 'u', 'k'], shared)).toBe('strong');
    expect(blockedName(['f', 'a', 'n', 'i'], shared)).toBe('rude');
  });
});
