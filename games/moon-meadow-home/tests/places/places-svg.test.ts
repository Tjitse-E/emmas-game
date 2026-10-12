import { describe, expect, it } from 'vitest';
import { colourFor, fallbackFor, svg, SVG_NAMES } from '../../src/ui/places-svg.ts';

describe('places svg', () => {
  it('draws every name as a standalone svg with a viewBox and no script or filter', () => {
    for (const name of SVG_NAMES) {
      const s = svg(name);
      expect(s.startsWith('<svg'), name).toBe(true);
      expect(s).toContain('viewBox=');
      expect(s).not.toContain('<script');
      expect(s).not.toMatch(/filter=|<filter/);
      expect(s).not.toContain('<text');
    }
  });

  it('colours and sizes bows, clips and stars', () => {
    for (const name of ['bow', 'clip', 'star'] as const) {
      expect(svg(name, { colour: '#e84a8a' })).toContain('#e84a8a');
      expect(svg(name, { size: 'tiny' })).not.toBe(svg(name, { size: 'big' }));
    }
  });

  it('writes a label as text and escapes it', () => {
    expect(svg('jar-label', { label: 'foxes' })).toContain('>foxes<');
    expect(svg('jar-label', { label: '<b>' })).toContain('&lt;b&gt;');
    expect(svg('jar-label', { label: '<b>' })).not.toContain('<b>');
  });

  it('ignores a colour that is not a plain hex colour', () => {
    expect(svg('bow', { colour: 'red" onload="x' })).not.toContain('onload');
  });

  it('gives each missing picture a steady colour and a shape by its kind', () => {
    expect(colourFor('decor-fountain')).toBe(colourFor('decor-fountain'));
    expect(fallbackFor('decor-fountain')).toContain(colourFor('decor-fountain'));
    expect(fallbackFor('pin-star')).toBe(svg('pin', { colour: colourFor('pin-star') }));
    expect(fallbackFor('gift-kite')).toBe(svg('gift', { colour: colourFor('gift-kite') }));
    expect(fallbackFor('place-salon')).toBe(svg('place', { colour: colourFor('place-salon') }));
  });
});
