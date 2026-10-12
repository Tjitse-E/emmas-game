import { describe, it, expect } from 'vitest';
import { giftSlots, isFreeNaming, ownCount } from '../../src/core/naming/gifts.ts';
import { BANK, ctxAt } from './fixtures.ts';

const N = (name: string) => BANK.find((b) => b.name === name)!.split;
const own = (name: string, ctx = ctxAt('S12', ['S02', 'S03', 'S04', 'S05', 'S07', 'S09', 'S11'])) =>
  giftSlots(N(name), ctx).map((s) => s.own);

describe('giftSlots', () => {
  it('Bella at S12: the final a is a gift because it is not its usual sound', () => {
    expect(own('Bella')).toEqual([true, true, true, false]);
  });
  it('Daisy at S12: D and ai are hers, the s and the y are gifts', () => {
    const s = giftSlots(N('Daisy'), ctxAt('S12'));
    expect(s.map((x) => x.own)).toEqual([true, true, false, false]);
    expect(s[2].why).toBe('not-usual');
    expect(s[3].why).toBe('choice');
  });
  it('Daisy at S20 keeps ai, because S20 teaches that choice', () => {
    expect(ownCount(giftSlots(N('Daisy'), ctxAt('S20')))).toBe(2);
  });
  it('Lee at S20: ee has another spelling and S22 is not reached, so it is free naming', () => {
    const s = giftSlots(N('Lee'), ctxAt('S20'));
    expect(s[1]).toMatchObject({ own: false, why: 'choice' });
    expect(isFreeNaming(s)).toBe(true);
  });
  it('Lily: the y is a gift until S32', () => {
    expect(own('Lily')).toEqual([true, true, true, false]);
    expect(giftSlots(N('Lily'), ctxAt('S32')).map((x) => x.own)).toEqual([true, true, true, true]);
  });
  it('Rose is free naming at S12 and has two own slots at S29', () => {
    const s12 = giftSlots(N('Rose'), ctxAt('S12'));
    expect(s12[1].why).toBe('above-step');
    expect(isFreeNaming(s12)).toBe(true);
    expect(ownCount(giftSlots(N('Rose'), ctxAt('S29')))).toBe(2);
  });
  it('Sophie is free naming at S12', () => {
    expect(ownCount(giftSlots(N('Sophie'), ctxAt('S12')))).toBe(1);
  });
  it('a final d is a gift until S06 is passed', () => {
    expect(giftSlots(N('Ted'), ctxAt('S12'))[2]).toMatchObject({ own: false, why: 'final-voiced' });
    expect(giftSlots(N('Ted'), ctxAt('S12', ['S06']))[2].own).toBe(true);
  });
  it('S01: only the first sound is hers', () => {
    expect(giftSlots(N('Tam'), ctxAt('S01')).map((x) => x.own)).toEqual([true, false, false]);
    expect(giftSlots(N('Bella'), ctxAt('S01')).map((x) => x.own)).toEqual([false, false, false, false]);
  });
  it('a silent letter is always a gift', () => {
    const s = giftSlots(N('Charlotte'), ctxAt('S12'));
    expect(s[5]).toMatchObject({ own: false, why: 'not-usual' });
  });
});
