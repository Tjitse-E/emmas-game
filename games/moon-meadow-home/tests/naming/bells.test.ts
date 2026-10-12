import { describe, it, expect } from 'vitest';
import { bellsFor, firstSounds, gardenNames, namesByFirstSound } from '../../src/core/naming/bells.ts';
import { giftSlots } from '../../src/core/naming/gifts.ts';
import { makeRng } from '../../src/core/rng.ts';
import { BANK, ctxAt, hasClip } from './fixtures.ts';

const ctx = ctxAt('S03', ['S02']);

describe('bellsFor', () => {
  it('rings three names she can spell all of, with clips, not offered before', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const offered = new Set(['pip']);
      const bells = bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered, hasClip, rng: makeRng(seed) });
      expect(bells).toHaveLength(3);
      for (const b of bells) {
        expect(giftSlots(b.split, ctx).every((s) => s.own)).toBe(true);
        expect(b.key).not.toBe('pip');
        expect(b.key).not.toBe('meg');
      }
    }
  });
  it('prefers names with the preferred grapheme', () => {
    const bells = bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered: new Set(), hasClip, rng: makeRng(1), prefer: 'k', n: 1 });
    expect(bells[0].key).toBe('ken');
  });
  it('avoids herd names while others are left', () => {
    const bells = bellsFor({ bank: BANK, ctx, herdNames: new Set(['ken', 'tam']), offered: new Set(), hasClip, rng: makeRng(2), n: 2 });
    expect(bells).toHaveLength(2);
    for (const b of bells) expect(['ken', 'tam']).not.toContain(b.key);
  });
  it('rings three bells at S01, where only the first sound is hers', () => {
    const b = bellsFor({ bank: BANK, ctx: ctxAt('S01'), herdNames: new Set(), offered: new Set(), hasClip, rng: makeRng(5) });
    expect(b).toHaveLength(3);
    for (const e of b) expect(giftSlots(e.split, ctxAt('S01'))[0].own).toBe(true);
  });
  it('returns fewer bells, or none, when the bank runs out', () => {
    const offered = new Set(BANK.map((b) => b.key));
    expect(bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered, hasClip, rng: makeRng(3) })).toEqual([]);
    const two = new Set(BANK.map((b) => b.key).filter((k) => k !== 'ken' && k !== 'tam'));
    expect(bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered: two, hasClip, rng: makeRng(3) })).toHaveLength(2);
  });
});

describe('the name garden', () => {
  it('offers names from a picture group with clips', () => {
    const flowers = gardenNames({ bank: BANK, group: 'flowers', hasClip, offered: new Set(), rng: makeRng(1) });
    expect(flowers.map((b) => b.key).sort()).toEqual(['daisy', 'lily', 'rose']);
  });
  it('groups names by first sound, so Charlotte is under sh and Cassie under k', () => {
    const sounds = firstSounds(BANK, hasClip);
    expect(sounds).toContain('sh');
    expect(sounds).toContain('k');
    expect(sounds.indexOf('s')).toBeLessThan(sounds.indexOf('sh'));
    const k = namesByFirstSound({ bank: BANK, first: 'k', hasClip, offered: new Set(), rng: makeRng(2) });
    expect(k.map((b) => b.key).sort()).toEqual(['cassie', 'ken']);
  });
});
