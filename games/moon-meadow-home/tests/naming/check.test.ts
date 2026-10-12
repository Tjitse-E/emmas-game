import { describe, it, expect } from 'vitest';
import { canAddSlot, canRemoveSlot, checkBuild, classifySpell, displayName, indexBank, judgeSlot, nameKey, namingResults, ordinalFor, ordinalLine } from '../../src/core/naming/check.ts';
import { nameKey as contractNameKey } from '../../src/core/keys.ts';
import { compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { giftSlots } from '../../src/core/naming/gifts.ts';
import { goldTray } from '../../src/core/naming/tray.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BANK, BLOCK_FILE, ctxAt } from './fixtures.ts';

const bl = compileBlocklist(BLOCK_FILE);
const index = indexBank(BANK);

describe('checkBuild', () => {
  it('checks in spec order: vowel, blocked, list, unknown', () => {
    expect(checkBuild(['t', 'm', 'n'], index, bl)).toEqual({ outcome: 'no-vowel' });
    expect(checkBuild(['f', 'u', 'k'], index, bl)).toEqual({ outcome: 'blocked', kind: 'strong' });
    const lili = checkBuild(['L', 'i', 'l', 'i'], index, bl);
    expect(lili.outcome).toBe('list');
    expect(lili.outcome === 'list' && lili.entry.key).toBe('lily');
    expect(checkBuild(['S', 'k', 'y'], index, bl).outcome).toBe('list');
    expect(checkBuild(['T', 'a', 'm', 'o'], index, bl)).toEqual({ outcome: 'unknown' });
  });
  it('never refuses a random build for any reason but no vowel or blocked', () => {
    const tray = goldTray(ctxAt('S12', ['S02', 'S03', 'S04', 'S05', 'S07', 'S09']), []);
    const rng = makeRng(11);
    for (let i = 0; i < 200; i++) {
      const len = 2 + Math.floor(rng() * 7);
      const gems = Array.from({ length: len }, () => tray[Math.floor(rng() * tray.length)]);
      expect(['no-vowel', 'blocked', 'list', 'unknown']).toContain(checkBuild(gems, index, bl).outcome);
    }
  });
});

describe('slots and names', () => {
  it('allows 2 to 8 slots', () => {
    expect(canAddSlot(7)).toBe(true);
    expect(canAddSlot(8)).toBe(false);
    expect(canRemoveSlot(3)).toBe(true);
    expect(canRemoveSlot(2)).toBe(false);
  });
  it('shows her own spelling with a capital', () => {
    expect(displayName(['l', 'i', 'l', 'i'])).toBe('Lili');
    expect(displayName(['Sh', 'a', 'y'])).toBe('Shay');
    expect(displayName(['R', 'o-e', 's'])).toBe('Rose');
  });
  it('uses the one name key from keys.ts (R40)', () => {
    expect(nameKey).toBe(contractNameKey);
    expect(nameKey('Zoë')).toBe('zoe');
  });
  it('makes a duplicate royal', () => {
    const herd = [{ id: 'a', name: 'Tim' }, { id: 'b', name: 'tim' }, { id: 'c', name: null }];
    expect(ordinalFor('Tim', herd, 'c')).toBe(3);
    expect(ordinalFor('Tim', herd, 'a')).toBe(2);
    expect(ordinalLine(2)).toBe('ord-2');
    expect(ordinalLine(1)).toBeNull();
    expect(ordinalLine(21)).toBeNull();
  });
});

describe('judging slots', () => {
  const ken = giftSlots(BANK.find((b) => b.name === 'Ken')!.split, ctxAt('S12', ['S02', 'S03', 'S11']));
  it('tags vowel, Dutch, reversal and other mistakes', () => {
    expect(classifySpell('i', 'o', false)).toBe('vowel');
    expect(classifySpell('a', 'e', false)).toBe('dutch');
    expect(classifySpell('b', 'd', false)).toBe('reversal');
    expect(classifySpell('d', 't', true)).toBe('dutch');
    expect(classifySpell('d', 't', false)).toBe('other');
    expect(classifySpell('m', 's', false)).toBe('other');
  });
  it('needs the capital in slot one from S11, without failing the sound', () => {
    expect(judgeSlot(ken[0], 'K', true, false)).toEqual({ ok: true, capitalMiss: false, error: null });
    expect(judgeSlot(ken[0], 'k', true, false)).toEqual({ ok: false, capitalMiss: true, error: null });
    expect(judgeSlot(ken[0], 'k', false, false)).toEqual({ ok: true, capitalMiss: false, error: null });
    expect(judgeSlot(ken[1], 'i', false, false)).toEqual({ ok: false, capitalMiss: false, error: 'vowel' });
  });
});

describe('namingResults', () => {
  const served: Served = { strand: 's', step: 'S12', id: 'k', carrier: '', items: [], scaffold: 2, probe: false, source: 'current' };
  const ken = giftSlots(BANK.find((b) => b.name === 'Ken')!.split, ctxAt('S12', ['S02', 'S03']));
  it('logs one result with an item per own slot', () => {
    const r = namingResults({ carrier: 'Ken', served, ms: 900, hintLevel: 2, error: 'vowel', capital: null, baby: 'b1',
      slots: [{ slot: ken[0], misses: 0, ghost: false }, { slot: ken[1], misses: 1, ghost: false }, { slot: ken[2], misses: 0, ghost: false }] });
    expect(r).toEqual([{ type: 'learn.result', strand: 's', step: 'S12', carrier: 'Ken', ms: 900, place: 'naming', probe: false,
      source: 'current', baby: 'b1', scaffold: 2, result: 'helped', error: 'vowel',
      items: [{ id: 'k', result: 'first' }, { id: 'e', result: 'miss' }, { id: 'n', result: 'first' }] }]);
  });
  it('adds the S11 capital item when it was asked', () => {
    const r = namingResults({ carrier: 'Ken', served, ms: 900, hintLevel: 0, error: null, capital: { misses: 0, ghost: false },
      slots: ken.map((slot) => ({ slot, misses: 0, ghost: false })) });
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ step: 'S11', items: [{ id: 'capital', result: 'first' }], result: 'first' });
  });
  it('logs the first sound alone at S01', () => {
    const tam = giftSlots(BANK.find((b) => b.name === 'Tam')!.split, ctxAt('S01'));
    const r = namingResults({ carrier: 'Tam', served: { ...served, step: 'S01' }, ms: 1, hintLevel: 0, error: null, capital: null,
      slots: tam.map((slot) => ({ slot, misses: 0, ghost: false })) });
    expect(r).toHaveLength(1);
    expect(r[0].items).toEqual([{ id: 't', result: 'first' }]);
  });
  it('logs nothing for free naming', () => {
    const lee = giftSlots(BANK.find((b) => b.name === 'Lee')!.split, ctxAt('S20'));
    expect(namingResults({ carrier: 'Lee', served, ms: 1, hintLevel: 0, error: null, capital: null,
      slots: lee.map((slot) => ({ slot, misses: 0, ghost: false })) })).toEqual([]);
  });
});
