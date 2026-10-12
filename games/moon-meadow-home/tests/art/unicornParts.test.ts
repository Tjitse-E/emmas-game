import { describe, expect, it } from 'vitest';
import { ANIM_PERIOD, anchorCss, animDelay, chooseRendition, headCrop, layoutUnicorn, outfitPlacement } from '../../src/art/unicornParts.ts';
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
