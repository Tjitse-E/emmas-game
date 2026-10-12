// G/tests/learning/ids-time.test.ts
import { describe, it, expect } from 'vitest';
import { itemStrand, graphemeItem, nameKey, nameItemId, isNameItem } from '../../src/core/learning/ids.ts';
import { localDay, HOUR_MS, DAY_MS } from '../../src/core/learning/time.ts';
import { T0 } from '../fixtures/events.ts';

describe('item ids', () => {
  it('reads the strand from the prefix', () => {
    expect(itemStrand('r:g:ai')).toBe('r');
    expect(itemStrand('s:end:es')).toBe('s');
    expect(itemStrand('m:miss:10-7')).toBe('m');
    expect(itemStrand('name:abc')).toBe('name');
    expect(itemStrand('x:y')).toBeNull();
  });
  it('builds name item ids', () => {
    expect(nameKey('Lily-Rose')).toBe('lilyrose');
    expect(nameKey('Zoë')).toBe('zoe');
    expect(nameItemId('Tim')).toBe('name:tim');
    expect(isNameItem('name:tim')).toBe(true);
    expect(isNameItem('r:g:a')).toBe(false);
  });
  it('builds grapheme item ids for the v2 import', () => {
    expect(graphemeItem('r', 'ck')).toBe('r:g:ck');
    expect(graphemeItem('s', 'a-e')).toBe('s:g:a-e');
  });
});

describe('localDay', () => {
  it('splits days at local midnight', () => {
    expect(DAY_MS).toBe(24 * HOUR_MS);
    expect(localDay(T0 + 6 * HOUR_MS, 120)).toBe(localDay(T0, 120));        // 23:00 local
    expect(localDay(T0 + 8 * HOUR_MS, 120)).toBe(localDay(T0, 120) + 1);    // 01:00 local next day
    expect(localDay(T0 + 8 * HOUR_MS, 0)).toBe(localDay(T0, 0));            // 23:00 UTC
  });
});
