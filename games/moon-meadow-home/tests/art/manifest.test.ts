import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { artUrl, background, hasPicture, picture, pictureIds, setArtManifest, unicornEntry } from '../../src/art/manifest.ts';
import { manifestFixture } from './fixture.ts';

describe('art manifest', () => {
  beforeEach(() => setArtManifest(manifestFixture(), '/games/moon-meadow-home'));

  it('joins urls under the base', () => {
    expect(artUrl('words/hat.webp')).toBe('/games/moon-meadow-home/art/words/hat.webp');
  });

  it('answers picture questions', () => {
    expect(hasPicture('hat')).toBe(true);
    expect(hasPicture('kite')).toBe(false);
    expect(hasPicture('toString')).toBe(false);
    expect(picture('hat')?.tint?.default).toBe('#6c8fe0');
    expect(picture('constructor')).toBeUndefined();
    expect(pictureIds('word')).toEqual(['cup', 'hat']);
    expect(background('bg-meadow')?.dominant).toBe('#9fd38a');
  });

  it('unicornEntry falls back to moon', () => {
    expect(unicornEntry('pebble', 'baby').breed).toBe('pebble');
    expect(unicornEntry('sparkle', 'foal').breed).toBe('moon');
    expect(unicornEntry('sparkle', 'foal').stage).toBe('foal');
    const m = manifestFixture();
    delete m.unicorns['moon.foal'];
    setArtManifest(m, '/');
    expect(unicornEntry('pebble', 'foal').stage).toBe('baby');
  });

  it('throws when moon.baby is missing too', () => {
    const m = manifestFixture();
    m.unicorns = {};
    setArtManifest(m, '/');
    expect(() => unicornEntry('moon', 'baby')).toThrow(/no unicorn art/);
  });
});

describe('loading the art manifest never fails (R49)', () => {
  // Each test gets a fresh module, so "before loading" really means nothing was loaded.
  const fresh = async () => {
    vi.resetModules();
    return import('../../src/art/manifest.ts');
  };
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.unstubAllGlobals(); warn.mockRestore(); });

  const respond = (status: number, body: string) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status })));

  it('answers false and undefined before anything is loaded', async () => {
    const m = await fresh();
    expect(m.hasPicture('hat')).toBe(false);
    expect(m.picture('hat')).toBeUndefined();
    expect(m.background('bg-meadow')).toBeUndefined();
    expect(m.pictureIds()).toEqual([]);
    expect(m.artManifest().pictures).toEqual({});
    expect(m.artUrl('words/hat.webp')).toBe('./art/words/hat.webp');
  });

  it('a 404 manifest resolves to an empty manifest and warns once', async () => {
    const m = await fresh();
    respond(404, 'not found');
    const got = await m.loadArtManifest('/g/');
    expect(got.pictures).toEqual({});
    expect(got.unicorns).toEqual({});
    expect(got.lumi).toBeNull();
    expect(m.hasPicture('hat')).toBe(false);
    expect(m.artUrl('a.webp')).toBe('/g/art/a.webp');
    await m.loadArtManifest('/g/');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('unreadable json, a wrong version and a network error all resolve to empty', async () => {
    const m = await fresh();
    respond(200, '{ not json');
    expect((await m.loadArtManifest('/g/')).pictures).toEqual({});
    respond(200, JSON.stringify({ ...manifestFixture(), v: 2 }));
    expect((await m.loadArtManifest('/g/')).pictures).toEqual({});
    respond(200, 'null');
    expect((await m.loadArtManifest('/g/')).pictures).toEqual({});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Load failed'); }));
    expect((await m.loadArtManifest('/g/')).pictures).toEqual({});
    vi.stubGlobal('fetch', undefined);
    expect((await m.loadArtManifest('/g/')).pictures).toEqual({});
  });

  it('a good manifest loads, and missing sections become empty', async () => {
    const m = await fresh();
    const { unicorns: _u, patterns: _p, ...partial } = manifestFixture();
    respond(200, JSON.stringify(partial));
    const got = await m.loadArtManifest('/games/moon-meadow-home');
    expect(m.hasPicture('hat')).toBe(true);
    expect(got.unicorns).toEqual({});
    expect(got.patterns).toBeNull();
    expect(m.artUrl('words/hat.webp')).toBe('/games/moon-meadow-home/art/words/hat.webp');
    expect(warn).not.toHaveBeenCalled();
  });

  it('a manifest that never arrives resolves to empty after the time limit', async () => {
    const m = await fresh();
    vi.useFakeTimers();
    try {
      vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
      const p = m.loadArtManifest('/g/');
      await vi.advanceTimersByTimeAsync(10001);
      expect((await p).pictures).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks for art/manifest.json under the base without the cache', async () => {
    const m = await fresh();
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(manifestFixture()), { status: 200 }));
    vi.stubGlobal('fetch', f);
    await m.loadArtManifest('./');
    expect(f.mock.calls[0][0]).toBe('./art/manifest.json');
    expect(f.mock.calls[0][1]).toEqual({ cache: 'no-cache' });
  });
});
