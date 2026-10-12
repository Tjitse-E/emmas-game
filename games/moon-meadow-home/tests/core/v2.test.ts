import { describe, expect, it } from 'vitest';
import { capitalise, isV2Save, mapV2, planV2Import, V2_NAMESPACE, v2Hash } from '../../src/core/save/v2.ts';
import type { V2Save } from '../../src/core/save/v2.ts';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { uuid5 } from '../../src/core/ids.ts';
import { factsSlice } from '../../src/core/world/facts.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';

const save = () => makeV2Save() as V2Save;

describe('v2 import mapping', () => {
  it('maps every baby with a capital name, gems, colours, traits and the founder star', () => {
    const d = mapV2(save(), testDeps);
    expect(d.babies).toHaveLength(14);
    expect(d.babies[0]).toMatchObject({
      v2id: 1, name: 'Sam', gems: ['s', 'a', 'm'], hearts: 0, stickers: ['pin', 'hat', 'pin'], night: 1,
      traits: { shiny: false, speckled: false, golden: false, founder: true },
    });
    expect(d.babies[5]).toMatchObject({ name: 'Tess', gems: ['t', 'e', 'ss'], traits: { golden: true } });
    expect(d.babies[13]).toMatchObject({ name: null, gems: [] });
    expect(d.babies[0].baby).toBe(uuid5('1|1|sam', V2_NAMESPACE));
  });

  it('gives the same ids and hash on every run, and a different hash when the save changes', () => {
    expect(mapV2(save(), testDeps)).toEqual(mapV2(save(), testDeps));
    const changed = save();
    changed.night = 6;
    expect(v2Hash(changed)).not.toBe(v2Hash(save()));
    expect(mapV2(changed, testDeps).babies.map(b => b.baby)).toEqual(mapV2(save(), testDeps).babies.map(b => b.baby));
  });

  it('maps the rest of the save', () => {
    const d = mapV2(save(), testDeps);
    expect(d.gifts).toEqual(['hat', 'cup']);
    expect(d.nights).toBe(5);
    expect(d.mathsV2Step).toBe(4);
    expect(d.nameWishes).toEqual([
      { name: 'Tamo', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o' },
      { name: 'Lunabel', gems: ['l', 'u', 'n', 'a', 'b', 'e', 'l'], phonemes: 'l u n a b e l' },
    ]);
    // the later first try on "hat" wins over the earlier miss; "ken" was helped, so box 0; maths seeds nothing
    expect(d.seeds).toEqual(expect.arrayContaining([
      { strand: 'r', item: 'r:g:h', box: 1 }, { strand: 'r', item: 'r:g:a', box: 1 }, { strand: 'r', item: 'r:g:t', box: 1 },
      { strand: 's', item: 's:g:k', box: 0 }, { strand: 's', item: 's:g:e', box: 0 }, { strand: 's', item: 's:g:n', box: 0 },
    ]));
    expect(d.seeds).toHaveLength(6);
  });

  it('makes a valid event', () => {
    const d = mapV2(save(), testDeps);
    const ev = { ...d, id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION };
    expect(validateEvent(ev).ok).toBe(true);
  });

  it('survives odd saves: missing fields, wrong types, uppercase and junk names', () => {
    const odd = {
      v: 2,
      herd: [
        { name: 'SAM' }, { id: 'x', name: 42, c: 'red', traits: null, hearts: -3, stickers: 'pin', night: 0 },
        'not a baby', { id: 7, name: 'bo b', hearts: 1e9, stickers: ['pin', 5, 'PIN'] }, { id: 7, name: 'bo b' },
      ],
      gifts: 'hat', lv: 3, log: { no: 1 }, nameWishes: [null, { name: '' }],
    } as unknown as V2Save;
    const d = mapV2(odd, testDeps);
    expect(d.babies).toHaveLength(4);
    expect(d.babies[0]).toMatchObject({ name: 'Sam', v2id: 1, night: 1, hearts: 0 });
    expect(d.babies[1]).toMatchObject({ name: null, v2id: 2, hearts: 0, stickers: [], colours: { body: '#ffe0ef' } });
    expect(d.babies[2]).toMatchObject({ name: null, hearts: 0, stickers: ['pin', 'pin'] });
    expect(new Set(d.babies.map(b => b.baby)).size).toBe(4);
    expect(d).toMatchObject({ gifts: [], mathsV2Step: 0, seeds: [], nameWishes: [], nights: 1 });
    const ev = { ...d, id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION };
    expect(validateEvent(ev).ok).toBe(true);
  });

  it('recognises v2 saves only', () => {
    expect(isV2Save(save())).toBe(true);
    expect(isV2Save({ v: 3, herd: [] })).toBe(false);
    expect(isV2Save({ v: 2 })).toBe(false);
    expect(capitalise('sam')).toBe('Sam');
  });

  it('plans: new, already imported, or empty', () => {
    const facts = factsSlice.init();
    const plan = planV2Import(save(), facts, testDeps);
    expect(plan).toMatchObject({ status: 'new', babies: 14 });
    if (plan.status !== 'new') throw new Error('expected new');
    facts['import.v2'][plan.draft.hash] = { id: 'abcdefgh:1', t: 1, payload: { ...plan.draft } };
    expect(planV2Import(save(), facts, testDeps)).toEqual({ status: 'already', hash: plan.draft.hash });
    expect(planV2Import({ v: 2, herd: [] }, facts, testDeps)).toEqual({ status: 'empty' });
  });
});
