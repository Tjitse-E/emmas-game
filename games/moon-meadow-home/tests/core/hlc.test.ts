import { describe, expect, it } from 'vitest';
import { compareHlc, formatHlc, HLC_MAX_N, HLC_ZERO, maxHlc, parseHlc, tick } from '../../src/core/hlc.ts';

describe('hybrid logical clock', () => {
  it('formats to a fixed width that sorts like the clock', () => {
    const a = formatHlc({ wall: 1_760_000_000_000, n: 5 });
    const b = formatHlc({ wall: 1_760_000_000_000, n: 36 });
    const c = formatHlc({ wall: 1_760_000_000_001, n: 0 });
    expect(a).toBe('1760000000000-0005');
    expect([c, b, a].sort()).toEqual([a, b, c]);
    expect(parseHlc(b)).toEqual({ wall: 1_760_000_000_000, n: 36 });
    expect(parseHlc('nope')).toBeNull();
  });

  it('never goes back when the device clock jumps back', () => {
    let h = tick(HLC_ZERO, 5000);
    const seen = [h];
    for (const now of [4000, 4000, 9000, 1, 9000]) { h = tick(h, now); seen.push(h); }
    for (let i = 1; i < seen.length; i++) expect(compareHlc(seen[i], seen[i - 1])).toBeGreaterThan(0);
  });

  it('carries into the wall clock when the counter is full', () => {
    expect(tick({ wall: 10, n: HLC_MAX_N }, 10)).toEqual({ wall: 11, n: 0 });
  });

  it('maxHlc picks the highest valid clock', () => {
    const best = maxHlc(HLC_ZERO, ['0000000000005-0001', 'garbage', '0000000000009-0000']);
    expect(best).toEqual({ wall: 9, n: 0 });
  });
});
