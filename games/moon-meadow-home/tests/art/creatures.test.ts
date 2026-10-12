import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Unicorn from '../../src/art/Unicorn.svelte';
import Egg from '../../src/art/Egg.svelte';
import Lumi from '../../src/art/Lumi.svelte';
import { setArtManifest, type ArtManifest } from '../../src/art/manifest.ts';
import { manifestFixture } from './fixture.ts';

const html = (c: unknown, props: Record<string, unknown>) => render(c as never, { props } as never).body;
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const empty = (): ArtManifest => ({ ...manifestFixture(), pictures: {}, unicorns: {}, lumi: null, patterns: null });
const baby = { breed: 'moon', stage: 'baby', colours: { body: '#ffe0ef', mane: '#4fc3ff', mane2: '#ffbf3f' }, height: 150 };

describe('Unicorn, Egg and Lumi', () => {
  afterEach(() => setArtManifest(empty(), '/g/'));

  it('draws every layer of the unicorn tinted with its colours', () => {
    setArtManifest(manifestFixture(), '/g/');
    const s = html(Unicorn, { ...baby, label: 'Pip' });
    expect(s).toContain('aria-label="Pip"');
    expect(count(s, /class="layer"/g)).toBe(5);
    expect(s).toContain('background-color:#ffe0ef');
    expect(s).toContain('background-color:#4fc3ff');
    expect(s).toContain('/g/art/unicorns/moon.baby.lg.body.webp');
    expect(s).toContain('pose-idle');
  });

  it('draws a breed without art as the Moon breed, and a bad colour as the default', () => {
    setArtManifest(manifestFixture(), '/g/');
    const s = html(Unicorn, { ...baby, breed: 'sparkle', colours: { body: 'red', mane: '#4fc3ff', mane2: null } });
    expect(s).toContain('unicorns/moon.baby.');
    expect(s).toContain('background-color:#e6dcff');
  });

  it('lite mode draws no blend or mask layers', () => {
    setArtManifest(manifestFixture(), '/g/');
    const s = html(Unicorn, { ...baby, lite: true });
    expect(s).toContain('lite');
    expect(s).not.toContain('class="layer"');
    expect(s).not.toContain('mix-blend');
    expect(s).not.toContain('background-blend-mode');
  });

  it('draws a simple unicorn in its colours when there is no unicorn art at all', () => {
    setArtManifest(empty(), '/g/');
    const s = html(Unicorn, { ...baby, label: 'Pip' });
    expect(s).toContain('<svg class="fallback"');
    expect(s).toContain('fill="#ffe0ef"');
    expect(s).toContain('aria-label="Pip"');
    expect(html(Unicorn, { ...baby, headOnly: true, height: 84 })).toContain('width:84px;height:84px');
  });

  it('crops the head for a stall door', () => {
    setArtManifest(manifestFixture(), '/g/');
    const s = html(Unicorn, { ...baby, headOnly: true, height: 85 });
    expect(s).toContain('overflow:hidden');
    expect(s).toContain('width:85px;height:85px');
  });

  it('skips an outfit whose picture is missing and draws one that exists', () => {
    setArtManifest(manifestFixture(), '/g/');
    const s = html(Unicorn, { ...baby, outfit: { head: 'outfit-crown-gold', neck: 'outfit-renamed' } });
    expect(count(s, /class="outfit"/g)).toBe(1);
    expect(s).toContain('outfit-crown-gold.webp');
  });

  it('draws an egg picture by breed or skin, and a drawn egg without art', () => {
    setArtManifest({ ...manifestFixture(), pictures: { 'egg-pebble': { src: 'items/egg-pebble.webp', w: 190, h: 240, kind: 'egg', pack: 'core', source: 'codex' } } }, '/g/');
    expect(html(Egg, { kind: 'pebble', size: 120 })).toContain('/g/art/items/egg-pebble.webp');
    const golden = html(Egg, { kind: 'pebble', skin: 'golden', size: 120, cracks: 2, wobble: true });
    expect(golden).toContain('fill="#f7d77c"');
    expect(count(golden, /<path d="M/g)).toBe(3);
    expect(golden).toContain('wobble');
  });

  it('draws Lumi from her art, or as a smiling moon before it exists', () => {
    setArtManifest(manifestFixture(), '/g/');
    const s = html(Lumi, { size: 300, talking: true });
    expect(s).toContain('/g/art/lumi/lumi.webp');
    expect(s).toContain('talking');
    setArtManifest(empty(), '/g/');
    const f = html(Lumi, { size: 200 });
    expect(f).toContain('aria-label="Queen Lumi"');
    expect(f).toContain('<svg');
  });
});
