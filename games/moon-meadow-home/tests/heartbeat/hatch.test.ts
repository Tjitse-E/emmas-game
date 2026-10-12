import { describe, it, expect } from 'vitest';
import { BODY, BREED_OF, GOLDEN_BODY, MANE, rollHatch } from '../../src/core/heartbeat/hatch.ts';
import { BODY_COLOURS, GOLDEN_BODY as ART_GOLDEN, MANE_COLOURS, MIN_BODY_LUMINANCE, MIN_MANE_LUMINANCE, luminance, resolveColours } from '../../src/art/palette.ts';
import { makeRng } from '../../src/core/rng.ts';

describe('rollHatch', () => {
  it('maps each egg kind to its breed', () => {
    expect(BREED_OF).toEqual({ moon: 'moon', 'small-nest': 'nestling', 'two-stone': 'pebble', blanket: 'cosy', berry: 'berry', snow: 'snow' });
  });
  it("takes its colours from art's palette and keeps none of its own", () => {
    expect(BODY).toBe(BODY_COLOURS);
    expect(MANE).toBe(MANE_COLOURS);
    expect(GOLDEN_BODY).toBe(ART_GOLDEN);
  });
  it('uses the palettes, never repeats the mane colour and stays light enough to tint', () => {
    const rng = makeRng(1);
    for (let i = 0; i < 200; i++) {
      const r = rollHatch({ kind: 'small-nest', result: 'miss', golden: false, speckled: false, rng });
      expect(BODY).toContain(r.colours.body);
      expect(MANE).toContain(r.colours.mane);
      expect(MANE).toContain(r.colours.mane2);
      expect(r.colours.mane2).not.toBe(r.colours.mane);
      expect(luminance(r.colours.body)).toBeGreaterThanOrEqual(MIN_BODY_LUMINANCE);
      expect(luminance(r.colours.mane)).toBeGreaterThanOrEqual(MIN_MANE_LUMINANCE);
      expect(luminance(r.colours.mane2)).toBeGreaterThanOrEqual(MIN_MANE_LUMINANCE);
      expect(resolveColours(r.colours, r.traits)).toEqual(r.colours);
    }
  });
  it('gives a shiny baby about one in three first tries, never after a miss or help', () => {
    const rng = makeRng(2);
    let shiny = 0;
    for (let i = 0; i < 3000; i++) if (rollHatch({ kind: 'moon', result: 'first', golden: false, speckled: false, rng }).traits.shiny) shiny++;
    expect(shiny / 3000).toBeGreaterThan(0.29);
    expect(shiny / 3000).toBeLessThan(0.38);
    for (let i = 0; i < 300; i++) {
      expect(rollHatch({ kind: 'moon', result: 'miss', golden: false, speckled: false, rng }).traits.shiny).toBe(false);
      expect(rollHatch({ kind: 'moon', result: 'helped', golden: false, speckled: false, rng }).traits.shiny).toBe(false);
    }
  });
  it('always carries all four traits, with founder false for a hatch', () => {
    const r = rollHatch({ kind: 'berry', result: 'first', golden: false, speckled: false, rng: makeRng(4) });
    expect(Object.keys(r.traits).sort()).toEqual(['founder', 'golden', 'shiny', 'speckled']);
    expect(r.traits.founder).toBe(false);
  });
  it('gives golden and speckled coats from those eggs', () => {
    const g = rollHatch({ kind: 'blanket', result: 'miss', golden: true, speckled: false, rng: makeRng(3) });
    expect(g.colours.body).toBe(GOLDEN_BODY);
    expect(g.traits.golden).toBe(true);
    expect(resolveColours(g.colours, g.traits)).toEqual(g.colours);
    const s = rollHatch({ kind: 'blanket', result: 'miss', golden: false, speckled: true, rng: makeRng(3) });
    expect(s.traits.speckled).toBe(true);
    expect(s.traits.golden).toBe(false);
  });
  it('is deterministic for a seed, and golden changes only the body', () => {
    const a = rollHatch({ kind: 'two-stone', result: 'first', golden: false, speckled: false, rng: makeRng(9) });
    const b = rollHatch({ kind: 'two-stone', result: 'first', golden: false, speckled: false, rng: makeRng(9) });
    expect(a).toEqual(b);
    const g = rollHatch({ kind: 'two-stone', result: 'first', golden: true, speckled: false, rng: makeRng(9) });
    expect(g.colours.mane).toBe(a.colours.mane);
    expect(g.colours.mane2).toBe(a.colours.mane2);
    expect(g.traits.shiny).toBe(a.traits.shiny);
  });
});
