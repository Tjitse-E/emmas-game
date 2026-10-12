import { describe, expect, it } from 'vitest';
import { colourForTint, patternLayerStyle, plainLayerStyle, tintLayerStyle } from '../../src/art/tint.ts';

describe('tint styles', () => {
  it('tints with multiply and masks with the same picture, prefixed and unprefixed', () => {
    const s = tintLayerStyle('/a/b.webp', '#ff0000');
    for (const part of ['background-image:url("/a/b.webp")', 'background-size:100% 100%', 'background-color:#ff0000',
      'background-blend-mode:multiply', '-webkit-mask-image:url("/a/b.webp")', 'mask-image:url("/a/b.webp")',
      '-webkit-mask-size:100% 100%', 'mask-size:100% 100%']) expect(s).toContain(part);
  });

  it('plain layers have no blend or mask', () => {
    const s = plainLayerStyle('/a/f.webp');
    expect(s).toContain('background-image:url("/a/f.webp")');
    expect(s).not.toContain('mask');
    expect(s).not.toContain('blend');
  });

  it('pattern layers mask a repeating pattern', () => {
    const s = patternLayerStyle('/a/body.webp', '/a/speckle.webp', 0.5);
    expect(s).toContain('background-repeat:repeat');
    expect(s).toContain('mask-image:url("/a/body.webp")');
    expect(s).toContain('opacity:0.5');
  });

  it('never lets a url or colour break out of the style', () => {
    const s = tintLayerStyle('/a/b"c.webp', 'red;position:fixed');
    expect(s).toContain('url("/a/b%22c.webp")');
    expect(s).not.toContain('position:fixed');
  });

  it('maps tints to colours', () => {
    const c = { body: '#111111', mane: '#222222', mane2: '#333333' };
    expect(colourForTint('body', c)).toBe('#111111');
    expect(colourForTint('mane2', c)).toBe('#333333');
    expect(colourForTint('none', c)).toBeNull();
  });
});
