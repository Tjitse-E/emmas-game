import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ANIM_PERIOD, anchorCss, animDelay, chooseRendition, FALLBACK_MOUTH, headCrop, layoutUnicorn, MUNCH_SIZE, mouthCss, outfitPlacement } from '../../src/art/unicornParts.ts';
import type { ArtManifest } from '../../src/art/manifest.ts';
import { manifestFixture, unicornFixture } from './fixture.ts';

const e = unicornFixture();

describe('unicorn layout', () => {
  it('chooses sm for meadow sizes', () => {
    expect(chooseRendition(e, 75, 2)).toBe('sm');      // 150 device px, sm is 150 px tall
    expect(chooseRendition(e, 82, 2)).toBe('sm');      // within 110 percent
    expect(chooseRendition(e, 90, 2)).toBe('lg');
    expect(chooseRendition(e, 150, 1)).toBe('sm');
  });

  it('scales parts and keeps layers relative to their part', () => {
    const l = layoutUnicorn(e, 150, 2);
    expect(l.k).toBe(0.5);
    expect(l.width).toBe(200);
    expect(l.height).toBe(150);
    const tail = l.parts[0];
    expect([tail.left, tail.top, tail.width, tail.height]).toEqual([0, 50, 60, 60]);
    expect([tail.originX, tail.originY]).toEqual([55, 30]);
    const body = l.parts[1];
    expect(body.layers[0]).toMatchObject({ left: 0, top: 20, width: 160, height: 130, tint: 'body' });
    expect(body.layers[1]).toMatchObject({ left: 50, top: 5, tint: 'mane' });
    expect(l.parts[2].hidden).toBe(true);
    expect(l.rendition).toBe('lg');
    expect(body.layers[0].src).toContain('.lg.');
    expect(layoutUnicorn(e, 75, 2).parts[1].layers[0].src).toContain('.sm.');
  });

  it('places anchors', () => {
    expect(anchorCss(e, 'flank', 150)).toEqual({ x: 90, y: 100 });
  });

  it('places an outfit so its attach point lands on the anchor', () => {
    const m = manifestFixture();
    const crown = m.pictures['outfit-crown-gold'];
    const b = outfitPlacement(e, crown, 'head', 150)!;
    expect(b.width).toBeCloseTo(200 * 0.34, 5);
    const k = b.width / crown.w;
    expect(b.left + crown.attach![0] * k).toBeCloseTo(150, 5);   // head anchor x 300 * 0.5
    expect(b.top + crown.attach![1] * k).toBeCloseTo(10, 5);     // head anchor y 20 * 0.5
  });

  it('outfitPlacement returns null for a missing picture', () => {
    expect(outfitPlacement(e, undefined, 'head', 150)).toBeNull();
  });

  it('crops the head as a square', () => {
    // head box side 170 frame px shown at 85 CSS px: k = 0.5, so the whole unicorn is 200 x 150, shifted left by 230 * 0.5
    expect(headCrop(e, 85)).toEqual({ left: -115, top: 0, width: 200, height: 150, size: 85 });
  });

  it('desyncs animations within one period', () => {
    for (let s = 0; s < 50; s++) {
      const d = animDelay(s, 'tail');
      expect(d).toBeLessThanOrEqual(0);
      expect(d).toBeGreaterThan(-ANIM_PERIOD.tail);
    }
    expect(animDelay(3, 'blink')).toBe(animDelay(3, 'blink'));
    expect(animDelay(3, 'none')).toBe(0);
  });
});

describe('the mouth (food while a baby munches)', () => {
  const real = JSON.parse(readFileSync(new URL('../../public/art/manifest.json', import.meta.url), 'utf8')) as ArtManifest;
  const entries = Object.entries(real.unicorns);

  it('has every breed and stage of the real art', () => {
    expect(entries.length).toBeGreaterThanOrEqual(18);
  });

  // The muzzle tip and the chin, measured on each sprite (the frontmost and lowest edge of the head, 2026-10-13),
  // lie 97 to 129 frame px in front of the eye and 84 to 104 below it. The food sits on the mouth, in front of
  // the muzzle, and never covers the eye (the bug: a melon on the eye).
  it.each(entries)('%s: the food is at the mouth, clear of the eye', (_key, u) => {
    const h = 130;
    const k = h / u.h;
    const m = mouthCss(u, h);
    const eye = anchorCss(u, 'eye', h);
    const half = (MUNCH_SIZE * h) / 2;
    expect(m.x - eye.x).toBeGreaterThan(97 * k);              // in front of the muzzle's middle
    expect(m.y - eye.y).toBeGreaterThan(60 * k);              // down at the mouth line
    expect(m.y - eye.y).toBeLessThan(104 * k);                // above the chin
    expect(m.x - half).toBeGreaterThan(eye.x + 25 * k);       // the food's left edge is clear of the eye
    expect(m.y + half).toBeLessThan(u.h * k);                 // and it stays on the picture
  });

  it('scales with the drawn height', () => {
    const u = unicornFixture();
    const a = mouthCss(u, 150);
    const b = mouthCss(u, 300);
    expect(b.x).toBeCloseTo(a.x * 2, 5);
    expect(b.y).toBeCloseTo(a.y * 2, 5);
  });

  it('has a mouth for the drawn fallback unicorn, in front of its muzzle', () => {
    expect(FALLBACK_MOUTH[0]).toBeGreaterThan(334);
    expect(FALLBACK_MOUTH[1]).toBeGreaterThan(110);
  });
});
