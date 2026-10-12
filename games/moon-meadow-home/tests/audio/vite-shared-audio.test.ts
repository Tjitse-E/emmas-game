import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { phonicsFiles, sharedAudio } from '../../tools/vite-shared-audio.ts';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));

describe('sharedAudio plugin', () => {
  it('lists the letter sounds and index, never the takes', () => {
    const files = phonicsFiles(`${repo}shared/audio/phonics`);
    expect(files).toContain('index.json');
    expect(files).toContain('snd-s.mp3');
    expect(files).toContain('snd-oo-short.mp3');
    expect(files.some((f) => f.startsWith('takes'))).toBe(false);
  });
  it('aliases @emma/audio-player to shared/audio.js', () => {
    const plugin = sharedAudio(repo);
    const config = (plugin.config as (c: object) => { resolve: { alias: Record<string, string> } })({});
    const target = config.resolve.alias['@emma/audio-player'];
    expect(target.endsWith('shared/audio.js')).toBe(true);
    expect(existsSync(target)).toBe(true);
  });
});
