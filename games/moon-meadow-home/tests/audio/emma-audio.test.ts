import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowserFakes } from './fake-web-audio.ts';
import type { EmmaAudioApi } from '../../src/audio/emma-audio.ts';

async function loadPlayer(files: Record<string, unknown>) {
  vi.resetModules();
  const fetch = installBrowserFakes(files);
  // @ts-ignore shared/audio.js is a classic script without types
  await import('../../../../shared/audio.js');
  return { A: (globalThis as unknown as { EmmaAudio: EmmaAudioApi }).EmmaAudio, fetch };
}

const clip = (file: string) => ({ hash: 'h', speaker: 'narrator', text: 't', file });

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('shared/audio.js packs', () => {
  const files = {
    'a/core/manifest.json': { clips: { 'g-hello': clip('g-hello.mp3') } },
    'a/names/manifest.json': { clips: { 'name-pip': clip('name-pip.mp3'), 'g-hello': clip('other.mp3') } },
    'a/core/g-hello.mp3': 1,
    'a/names/name-pip.mp3': 1,
  };

  it('finds a clip in the first pack that lists it', async () => {
    const { A, fetch } = await loadPlayer(files);
    A.init({ base: 'a/core/' });
    A.addPack('core', 'a/core/');
    A.addPack('names', 'a/names/');
    await A.say('g-hello');
    await A.say('name-pip');
    expect(fetch.calls).toContain('a/core/g-hello.mp3');
    expect(fetch.calls).toContain('a/names/name-pip.mp3');
    expect(fetch.calls).not.toContain('a/names/other.mp3');
    expect(A.missing).toEqual([]);
  });

  it('reports a missing id once, to missing and to onMissing', async () => {
    const { A } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    const seen: string[] = [];
    const off = A.onMissing((id) => seen.push(id));
    await A.say('word-nope');
    await A.say('word-nope');
    expect(seen).toEqual(['word-nope']);
    expect(A.missing).toEqual(['word-nope']);
    off();
    await A.say('word-other');
    expect(seen).toEqual(['word-nope']);
  });

  it('reportMissing records an id without playing it, once', async () => {
    const { A, fetch } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    const seen: string[] = [];
    A.onMissing((id) => seen.push(id));
    A.reportMissing('g-not-made');
    A.reportMissing('g-not-made');
    expect(seen).toEqual(['g-not-made']);
    expect(A.missing).toEqual(['g-not-made']);
    expect(fetch.calls.some((u) => u.includes('g-not-made'))).toBe(false);
  });

  it('has() looks in every pack', async () => {
    const { A } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    A.addPack('names', 'a/names/');
    expect(await A.has('name-pip')).toBe(true);
    expect(await A.has('word-nope')).toBe(false);
  });

  it('forget() drops the decoded clip, so the next preload fetches it again', async () => {
    const { A, fetch } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    await A.preload(['g-hello']);
    await A.preload(['g-hello']);
    expect(fetch.calls.filter((u) => u === 'a/core/g-hello.mp3')).toHaveLength(1);
    A.forget(['g-hello']);
    await A.preload(['g-hello']);
    expect(fetch.calls.filter((u) => u === 'a/core/g-hello.mp3')).toHaveLength(2);
  });

  it('addPack with fresh asks the server to revalidate the manifest, and a second addPack replaces the pack', async () => {
    const { A, fetch } = await loadPlayer(files);
    const m = await A.addPack('names', 'a/names/', { fresh: true });
    expect(m?.clips['name-pip'].file).toBe('name-pip.mp3');
    expect(fetch.inits[fetch.calls.indexOf('a/names/manifest.json')]).toEqual({ cache: 'no-cache' });
    await A.addPack('names', 'a/names/', { fresh: true });
    expect(fetch.calls.filter((u) => u === 'a/names/manifest.json')).toHaveLength(2);
  });

  it('keeps the v2 behaviour without packs: one folder and its manifest', async () => {
    const { A, fetch } = await loadPlayer({
      'g/audio/manifest.json': { clips: { 'word-hat': clip('word-hat.mp3') } },
      'g/audio/word-hat.mp3': 1,
    });
    A.init({ base: 'g/audio/' });
    await A.say('word-hat');
    await A.say('word-cat');
    expect(fetch.calls).toContain('g/audio/word-hat.mp3');
    expect(fetch.calls).not.toContain('g/audio/word-cat.mp3');
    expect(A.missing).toEqual(['word-cat']);
    expect(await A.has('word-hat')).toBe(true);
    expect(await A.has('word-cat')).toBe(false);
  });

  it('v2 has() without a manifest stays false, as before', async () => {
    const { A } = await loadPlayer({});
    A.init({ base: 'g/audio/' });
    expect(await A.has('word-hat')).toBe(false);
  });
});
