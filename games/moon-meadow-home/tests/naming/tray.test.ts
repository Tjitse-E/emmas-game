import { describe, it, expect } from 'vitest';
import { goldTray, planNameTray } from '../../src/core/naming/tray.ts';
import { giftSlots } from '../../src/core/naming/gifts.ts';
import { blockedName, compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { makeRng } from '../../src/core/rng.ts';
import { BANK, BLOCK_FILE, ctxAt } from './fixtures.ts';

const bl = compileBlocklist(BLOCK_FILE);
const blocked = (gems: string[]) => blockedName(gems, bl) !== null;
const slotsOf = (name: string, ctx: ReturnType<typeof ctxAt>) => giftSlots(BANK.find((b) => b.name === name)!.split, ctx);

describe('planNameTray', () => {
  const ctx = ctxAt('S03', ['S02']);
  it('holds the name gems plus 2, 4 or up to 8 in all', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 1, ctx, blocked, rng: makeRng(seed) })).toHaveLength(5);
      expect(planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 2, ctx, blocked, rng: makeRng(seed) })).toHaveLength(7);
      expect(planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 3, ctx, blocked, rng: makeRng(seed) }).length).toBeGreaterThanOrEqual(7);
    }
  });
  it('never offers a second spelling of a sound in the name, or a Dutch pair before its contrast step', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const tray = planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 3, ctx, blocked, rng: makeRng(seed) });
      expect(tray).toEqual(expect.arrayContaining(['k', 'e', 'n']));
      for (const g of ['c', 'ck', 'a', 'u']) expect(tray).not.toContain(g);
      for (const g of tray) expect(['h', 'b', 'f', 'l', 'j', 'v', 'w', 'x', 'y', 'z']).not.toContain(g);
    }
  });
  it('never offers b for a final p before S06', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = ctxAt('S12', ['S02', 'S03', 'S04']);
      expect(planNameTray({ slots: slotsOf('Pip', c), scaffold: 3, ctx: c, blocked, rng: makeRng(seed) })).not.toContain('b');
    }
  });
  it('never offers a gem that turns the name into a blocked word', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = ctxAt('S12', ['S02', 'S03', 'S04', 'S06']);
      const tray = planNameTray({ slots: slotsOf('Pip', c), scaffold: 3, ctx: c, blocked, rng: makeRng(seed) });
      expect(tray).not.toContain('s');
      expect(tray).not.toContain('ss');
    }
  });
  it('holds the capital and the small letter from S11', () => {
    const c = ctxAt('S12', ['S02', 'S03', 'S04', 'S11']);
    const tray = planNameTray({ slots: slotsOf('Ken', c), scaffold: 1, ctx: c, blocked, rng: makeRng(1) });
    expect(tray).toEqual(expect.arrayContaining(['K', 'k']));
  });
});

describe('a new player at S01', () => {
  it('still gets a tray with distractors and a full gold tray', () => {
    const c = ctxAt('S01');
    expect(planNameTray({ slots: slotsOf('Tam', c), scaffold: 1, ctx: c, blocked, rng: makeRng(1) })).toHaveLength(3);
    expect(goldTray(c, [])).toEqual(expect.arrayContaining(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']));
  });
});

describe('goldTray', () => {
  it('holds every gem at or below her step plus her herd graphemes, in a fixed order', () => {
    const tray = goldTray(ctxAt('S03', ['S02']), [['L', 'i', 'l', 'y'], ['R', 'o-e', 's']]);
    expect(tray.slice(0, 8)).toEqual(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']);
    expect(tray).toEqual(expect.arrayContaining(['ck', 'r', 'l', 'y']));
    expect(tray).not.toContain('o-e');
    expect(tray).not.toContain('h');
    expect(new Set(tray).size).toBe(tray.length);
    expect(tray.indexOf('l')).toBeLessThan(tray.indexOf('y'));
  });
});
