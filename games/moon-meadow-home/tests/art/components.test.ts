import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Picture from '../../src/art/Picture.svelte';
import Heap from '../../src/art/Heap.svelte';
import { setArtManifest } from '../../src/art/manifest.ts';
import { manifestFixture } from './fixture.ts';

const html = (c: typeof Picture | typeof Heap, props: Record<string, unknown>) => render(c as never, { props } as never).body;
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('Picture and Heap', () => {
  beforeEach(() => setArtManifest(manifestFixture(), '/g/'));
  afterEach(() => setArtManifest({ ...manifestFixture(), pictures: {} }, '/g/'));

  it('draws a plain picture as an img with its long side at size', () => {
    const s = html(Picture, { id: 'item-nest', size: 320, label: 'nest' });
    expect(s).toContain('src="/g/art/items/item-nest.webp"');
    expect(s).toContain('alt="nest"');
    expect(s).toContain('width="320"');
    expect(s).toContain('height="210"');
  });

  it('draws a tintable picture as a tinted, masked layer', () => {
    const s = html(Picture, { id: 'hat', size: 100, tint: '#ff7fbf' });
    expect(s).toContain('role="img"');
    expect(s).toContain('aria-label="hat"');
    expect(s).toContain('background-color:#ff7fbf');
    expect(s).toContain('mask-image:url(&quot;/g/art/words/hat.webp&quot;)');
    expect(html(Picture, { id: 'hat', size: 100 })).toContain('background-color:#6c8fe0');
  });

  it('keeps a square, labelled space for a missing picture, and never throws', () => {
    const s = html(Picture, { id: 'kite', size: 80, label: 'kite' });
    expect(s).toContain('aria-label="kite"');
    expect(s).toContain('width:80px;height:80px');
    expect(s).not.toContain('<img');
    expect(html(Picture, { id: 'kite', size: 80, label: '' })).toContain('aria-hidden="true"');
  });

  it('draws count copies in a heap, for any count', () => {
    expect(count(html(Heap, { id: 'cup', count: 4, size: 200, seed: 3 }), /<img/g)).toBe(4);
    expect(count(html(Heap, { id: 'cup', count: 2, size: 200, seed: 3 }), /<img/g)).toBe(2);
    expect(count(html(Heap, { id: 'cup', count: 7, size: 200, seed: 3 }), /<img/g)).toBe(7);
    expect(count(html(Heap, { id: 'cup', count: 0, size: 200, seed: 3 }), /<img/g)).toBe(0);
    expect(html(Heap, { id: 'cup', count: 3, size: 200, seed: 3, label: 'three cups' })).toContain('aria-label="three cups"');
  });
});
