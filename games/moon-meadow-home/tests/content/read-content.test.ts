// G/tests/content/read-content.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_ROOT, REPO_ROOT, readCodeClipIds, readManifests, readPhonicsKeys, readPictureIds, readRawBlocklist } from '../../tools/lib/read-content.ts';

describe('read-content', () => {
  it('finds the game and repo roots', () => {
    expect(existsSync(join(GAME_ROOT, 'package.json'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'shared', 'audio', 'phonics', 'index.json'))).toBe(true);
  });
  it('reads the letter-sound keys, including the audio stream keys (R24)', () => {
    expect(readPhonicsKeys()).toEqual(expect.arrayContaining(['s', 'ai', 'iz', 'yoo', 'oo-short']));
  });
  it('never throws on missing asset files', () => {
    expect(Array.isArray(readPictureIds())).toBe(true);
    expect(typeof readManifests()).toBe('object');
    expect(readRawBlocklist().version).toBe(1);
    expect(readCodeClipIds().every(id => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toBe(true);
  });
});
