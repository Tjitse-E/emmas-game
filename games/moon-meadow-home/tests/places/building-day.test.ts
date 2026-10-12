import { describe, expect, it } from 'vitest';
import {
  BEAD_HEX, afterPart, isCut, plankRows, signSteps, signSlotResults, trimMoments, wallMoments,
} from '../../src/core/places/building-day.ts';
import { signFor } from '../../src/core/places/building.ts';
import { rng, served } from './helpers.ts';

describe('Building Day scene rules (Task A13)', () => {
  it('logs each part once and builds the plot after its last part', () => {
    expect(afterPart('bath-pond', 'walls', [])).toEqual({ actions: [{ type: 'place/part', plot: 'bath-pond', part: 'walls' }], built: false });
    expect(afterPart('bath-pond', 'circle', ['walls', 'trim', 'sign', 'ribbon'])).toEqual({
      actions: [{ type: 'place/part', plot: 'bath-pond', part: 'circle' }, { type: 'place/built', plot: 'bath-pond' }], built: true,
    });
    // A row's name part is logged by row.named, never as building.part.
    expect(afterPart('row-7', 'row-name', ['walls'])).toEqual({ actions: [{ type: 'place/built', plot: 'row-7' }], built: true });
    expect(afterPart('row-7', 'walls', [])).toEqual({ actions: [{ type: 'place/part', plot: 'row-7', part: 'walls' }], built: false });
  });

  it('plays the current and the review wall, and a free wall of ten when nothing is served', () => {
    const two = wallMoments([served('m', 'M05', '3+2', ['3+2']), served('m', 'M04', '4+1', ['4+1'], { kind: 'review' })], rng(1));
    expect(two.map((t) => [t.total, t.up, t.answer, t.served?.kind])).toEqual([[5, 3, 2, 'current'], [5, 4, 1, 'review']]);
    const same = wallMoments([served('m', 'M05', '3+2', ['3+2']), served('m', 'M05', '3+2', ['3+2'])], rng(1));
    expect(same).toHaveLength(1);
    const free = wallMoments([null, null], rng(1));
    expect(free).toHaveLength(1);
    expect(free[0].served).toBeNull();
    expect(free[0].total).toBe(10);
  });

  it('plays checked trims for patterns and one free trim otherwise', () => {
    const t = trimMoments([served('m', 'M08', 'AB', ['AB']), null], rng(2));
    expect(t).toHaveLength(1);
    expect(t[0].checked).toBe(true);
    const free = trimMoments([null, served('m', 'M10', '6+4', ['6+4'])], rng(2));
    expect(free.map((x) => x.checked)).toEqual([false]);
    for (const c of ['pink', 'blue', 'gold', 'green', 'purple']) expect(BEAD_HEX[c]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('lays planks in one row up to five and in two rows above five', () => {
    expect(plankRows(4)).toEqual([4]);
    expect(plankRows(5)).toEqual([5]);
    expect(plankRows(7)).toEqual([4, 3]);
    expect(plankRows(10)).toEqual([5, 5]);
  });

  it('cuts the ribbon on a swipe of more than 120 px', () => {
    expect(isCut(0, 0, 100, 10)).toBe(false);
    expect(isCut(0, 0, 130, 0)).toBe(true);
    expect(isCut(300, 0, 200, 0)).toBe(false);
    expect(isCut(300, 40, 170, 20)).toBe(true);
  });

  it('finds the spelling step of each sign grapheme from content', () => {
    const c = {
      words: { pond: { gpcs: ['p', 'o', 'n', 'd'] } },
      gpcs: { p: { id: 'p', text: 'p' }, o: { id: 'o', text: 'o' }, n: { id: 'n', text: 'n' }, d: { id: 'd', text: 'd' }, ll: { id: 'll', text: 'll' }, s: { id: 's', text: 's' } },
      items: { 's:g:p': { step: 'S02' }, 's:g:o': { step: 'S03' }, 's:g:n': { step: 'S02' }, 's:g:ll': { step: 'S07' }, 's:g:s': { step: 'S01' } },
    };
    expect(signSteps(signFor('bath-pond'), c)).toEqual(['S02', 'S03', 'S02', null]);
    expect(signSteps(signFor('row-2'), c)).toEqual(['S01', null, null, 'S07', 'S01']);
  });

  it('gives each own slot first or miss, helped for a helped build, and null for gifts', () => {
    expect(signSlotResults([true, false, true], new Set([2]), 'first')).toEqual(['first', null, 'miss']);
    expect(signSlotResults([true, true], new Set(), 'helped')).toEqual(['helped', 'helped']);
  });
});

describe('Building Day glue (Task A13)', () => {
  it('registers the scene and the building test hook', async () => {
    const { placeScenes } = await import('../../src/places/scenes.ts');
    const { placesHook } = await import('../../src/places/hook.ts');
    expect(Object.keys(placeScenes)).toContain('building-day');
    expect(Object.keys(placesHook().building ?? {})).toEqual(expect.arrayContaining(['start', 'state', 'drop', 'trim', 'sign', 'cut', 'auto']));
  });
});
