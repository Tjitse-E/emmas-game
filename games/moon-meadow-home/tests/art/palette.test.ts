import { describe, expect, it } from 'vitest';
import { BODY_COLOURS, DEFAULT_COLOURS, GOLDEN_BODY, MANE_COLOURS, NAMED_COLOURS, luminance, randomColours, resolveColours } from '../../src/art/palette.ts';
import { mulberry32 } from '../../src/art/heap.ts';

describe('palette', () => {
  it('randomColours follows the v2 rules', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const c = randomColours(rng);
      expect(BODY_COLOURS).toContain(c.body);
      expect(MANE_COLOURS).toContain(c.mane);
      expect(MANE_COLOURS).toContain(c.mane2);
      expect(c.mane2).not.toBe(c.mane);
    }
    expect(randomColours(mulberry32(7))).toEqual(randomColours(mulberry32(7)));
  });

  it('resolveColours replaces invalid colours', () => {
    expect(resolveColours({ body: 'red?', mane: '#FF7FBF', mane2: '' })).toEqual({ body: DEFAULT_COLOURS.body, mane: '#ff7fbf', mane2: DEFAULT_COLOURS.mane2 });
    expect(resolveColours(undefined)).toEqual(DEFAULT_COLOURS);
    expect(resolveColours(null)).toEqual(DEFAULT_COLOURS);
    expect(resolveColours({ body: 12 as unknown as string, mane: '#fff', mane2: '#12345g' })).toEqual(DEFAULT_COLOURS);
  });

  it('resolveColours lifts colours too dark for multiply', () => {
    const c = resolveColours({ body: '#000000', mane: '#101010', mane2: '#3fd69a' });
    expect(luminance(c.body)).toBeGreaterThanOrEqual(0.55);
    expect(luminance(c.mane)).toBeGreaterThanOrEqual(0.25);
    expect(c.mane2).toBe('#3fd69a');
    expect(resolveColours({ body: '#ffe0ef', mane: '#9d7bff', mane2: '#c46bff' })).toEqual({ body: '#ffe0ef', mane: '#9d7bff', mane2: '#c46bff' });
  });

  it('golden replaces the body colour only', () => {
    const c = resolveColours({ body: '#ffe0ef', mane: '#9d7bff', mane2: '#4fc3ff' }, { golden: true });
    expect(c).toEqual({ body: GOLDEN_BODY, mane: '#9d7bff', mane2: '#4fc3ff' });
  });

  it('palette colours are light enough', () => {
    for (const b of BODY_COLOURS) expect(luminance(b)).toBeGreaterThanOrEqual(0.55);
    for (const m of MANE_COLOURS) expect(luminance(m)).toBeGreaterThanOrEqual(0.25);
    expect(luminance(GOLDEN_BODY)).toBeGreaterThanOrEqual(0.55);
    expect(luminance('#ffffff')).toBeCloseTo(1, 3);
    expect(luminance('#000000')).toBeCloseTo(0, 3);
  });

  it('names the adjective colours', () => {
    expect(Object.keys(NAMED_COLOURS).sort()).toEqual(['black', 'blue', 'brown', 'gold', 'green', 'grey', 'orange', 'pink', 'purple', 'red', 'silver', 'white', 'yellow']);
  });
});
