// G/tests/planner/result.test.ts
import { describe, it, expect } from 'vitest';
import { learnResultPayload } from '../../src/core/planner/result.ts';
import * as planner from '../../src/core/planner/index.ts';
import type { Pick } from '../../src/core/planner/types.ts';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { nextItem, nextNameReviews } from '../../src/core/planner/index.ts';
import { setup } from './setup.ts';

const wish: Pick = { strand: 'r', step: 'R21', slot: 'current', moment: 'wish', items: ['r:cl:-st'], carrier: { kind: 'word', word: 'nest' }, scaffold: 2, probe: false };

describe('learnResultPayload', () => {
  it('turns a wish pick and its outcome into a learn.result payload', () => {
    expect(learnResultPayload(wish, { result: 'miss', ms: 2100, place: 'meadow', error: 'other' })).toEqual({
      type: 'learn.result', strand: 'r', step: 'R21', carrier: 'nest', items: [{ id: 'r:cl:-st', r: 'miss' }],
      result: 'miss', ms: 2100, scaffold: 2, error: 'other', place: 'meadow', moment: 'wish', slot: 'current', probe: false,
    });
  });
  it('uses one result per own slot for spelling', () => {
    const spell: Pick = { strand: 's', step: 'S04', slot: 'current', moment: 'naming-bells', items: ['s:g:h'], carrier: { kind: 'spell', focus: ['h'] }, scaffold: 1, probe: false };
    const p = learnResultPayload(spell, { result: 'miss', ms: 3000, place: 'nest', slots: [{ id: 's:g:h', r: 'first' }, { id: 's:g:e', r: 'miss' }] });
    expect(p.items).toEqual([{ id: 's:g:h', r: 'first' }, { id: 's:g:e', r: 'miss' }]);
    expect(p.error).toBeNull();
  });
  it('logs the same items with or without a display word (R36)', () => {
    const shown = learnResultPayload({ ...wish, display: ['the'] }, { result: 'first', ms: 900, place: 'meadow' });
    const plain = learnResultPayload(wish, { result: 'first', ms: 900, place: 'meadow' });
    expect(shown).toEqual(plain);
    expect(Object.keys(shown)).not.toContain('display');
  });
  it('keeps a name review step null and an empty slots list falls back to the pick items', () => {
    const name: Pick = { strand: 'name', step: null, slot: 'name', moment: 'roll-call', items: ['name:pip'], carrier: { kind: 'name', babyId: 'b1', name: 'Pip' }, scaffold: 3, probe: false };
    expect(learnResultPayload(name, { result: 'first', ms: null, place: 'stalls', slots: [] }))
      .toMatchObject({ strand: 'name', step: null, carrier: 'b1', items: [{ id: 'name:pip', r: 'first' }], ms: null });
  });
});

describe('planner index', () => {
  it('exports the public planner API', () => {
    for (const k of ['nextItem', 'carrierFor', 'carrierKey', 'nextEgg', 'eggKindOf', 'eggMoments', 'nextNameReviews', 'visitStats', 'isTired',
      'spellingShareLow', 'wantsLabelBubble', 'leastPractisedStrand', 'visitRange', 'shouldVisitDoor', 'learnResultPayload', 'mulberry32', 'shuffle']) {
      expect(typeof (planner as Record<string, unknown>)[k]).toBe('function');
    }
  });
});

describe('payloads the core validator accepts (master Review Focus 1)', () => {
  const base = { id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1_760_000_000_000, dev: 'abcdefgh', v: SCHEMA_VERSION };
  const router = { visit: 'v1', baby: null, heart: false };
  it('every kind of pick becomes a valid learn.result once the router adds visit, baby and heart', () => {
    const x = setup({ r: 'R21', s: 'S12', m: 'M10' }).ctx();
    const rng = planner.mulberry32(21);
    const reqs = [
      { strand: 'r' as const, moments: ['wish', 'twin-wish', 'one-or-many'] as const, place: 'meadow' },
      { strand: 's' as const, moments: ['label', 'label-plural', 'naming-bells'] as const, place: 'shelf' },
      { strand: 'm' as const, moments: ['egg-moon', 'egg-two-stone', 'wall', 'door-visit'] as const, place: 'nest', doors: { built: 12, own: 3 } },
    ];
    const picks = [];
    for (const r of reqs) for (let i = 0; i < 30; i++) {
      const p = nextItem(x, { ...r, moments: [...r.moments] }, rng);
      if (p) picks.push(p);
    }
    picks.push(...nextNameReviews(x, [{ babyId: 'b1', name: 'Pip', gpcs: ['p', 'i', 'p'] }], 1, 'roll-call', rng));
    expect(picks.length).toBeGreaterThan(80);
    for (const p of picks) {
      for (const o of [
        { result: 'first' as const, ms: 1234.5, place: 'meadow' },
        { result: 'miss' as const, ms: -5, place: 'meadow', error: 'dutch' as const },
        { result: 'helped' as const, ms: 9_999_999, place: 'meadow' },
      ]) {
        const r = validateEvent({ ...base, ...learnResultPayload(p, o), ...router });
        expect(r.ok, JSON.stringify(p) + JSON.stringify(r)).toBe(true);
      }
    }
  });
});
