import { beforeEach, describe, expect, it } from 'vitest';
import { applyPlaceAction, type PlaceAction } from '../../src/core/places/actions.ts';
import { ev, foldAll, laneCtx, resetSeq, visitStart } from './helpers.ts';

beforeEach(resetSeq);

describe('place actions', () => {
  it('turns a pin pot drop into one star pin per star', () => {
    const out = applyPlaceAction({ type: 'place/pot', baby: 'b1', count: 4 }, laneCtx());
    expect(out).toEqual(Array(4).fill({ type: 'pin.given', baby: 'b1', pin: 'star', kind: 'star', set: null, key: null }));
  });

  it('does not build a plot twice, announce twice, place a jewel twice or give a moment pin twice', () => {
    const places = foldAll([
      visitStart('v1'), ev('building.done', { plot: 'bath-pond' }), ev('opening.announced', { opening: 'bubbles' }),
      ev('jewel.placed', { jewel: 'S20', plot: 'salon' }),
      ev('pin.given', { baby: 'b1', pin: 'pin-first-bath', kind: 'moment', set: null, key: 'first-bath' }),
      ev('post.opened', { visit: 'v1', post: 'post-1' }),
    ]);
    const ctx = laneCtx(places);
    expect(applyPlaceAction({ type: 'place/built', plot: 'bath-pond' }, ctx)).toEqual([]);
    expect(applyPlaceAction({ type: 'place/announce', opening: 'bubbles' }, ctx)).toEqual([]);
    expect(applyPlaceAction({ type: 'place/jewel', jewel: 'S20', plot: 'decor-fountain', decoration: true }, ctx)).toEqual([]);
    expect(applyPlaceAction({ type: 'place/pin', baby: 'b2', pin: 'pin-first-bath', kind: 'moment', set: null, key: 'first-bath' }, ctx)).toEqual([]);
    expect(applyPlaceAction({ type: 'place/post', post: 'post-1' }, ctx)).toEqual([]);
  });

  it('does not log a finished part again, nor a part of a finished building', () => {
    const places = foldAll([ev('building.part', { plot: 'row-2', part: 'walls' }), ev('building.done', { plot: 'row-3' })]);
    expect(applyPlaceAction({ type: 'place/part', plot: 'row-2', part: 'walls' }, laneCtx(places))).toEqual([]);
    expect(applyPlaceAction({ type: 'place/part', plot: 'row-3', part: 'trim' }, laneCtx(places))).toEqual([]);
    expect(applyPlaceAction({ type: 'place/part', plot: 'row-2', part: 'trim' }, laneCtx(places))).toHaveLength(1);
  });

  it('builds a decoration plot at once when its jewel is placed, a building plot later', () => {
    expect(applyPlaceAction({ type: 'place/jewel', jewel: 'S20', plot: 'decor-fountain', decoration: true }, laneCtx()).map((e) => e.type)).toEqual(['jewel.placed', 'building.done']);
    expect(applyPlaceAction({ type: 'place/jewel', jewel: 'S20', plot: 'salon', decoration: false }, laneCtx()).map((e) => e.type)).toEqual(['jewel.placed']);
  });

  it('logs a place learning result as the payload plus the baby, with no visit', () => {
    const payload = {
      type: 'learn.result' as const, strand: 's' as const, step: 'S10', carrier: 'foxes', items: [{ id: 's:end:es', r: 'first' as const }],
      result: 'first' as const, ms: 2100, scaffold: 1 as const, error: null, place: 'toy-shelf', moment: 'label-plural' as const, slot: 'school' as const, probe: false,
    };
    expect(applyPlaceAction({ type: 'place/learn', payload, baby: 'b1' }, laneCtx())).toEqual([{ ...payload, baby: 'b1' }]);
  });

  it('maps every other action to one event of its type', () => {
    const cases: [PlaceAction, string][] = [
      [{ type: 'place/idle', strand: 'r', step: 'R19', place: 'bath-pond', level: 2 }, 'learn.idle'],
      [{ type: 'place/jar', jar: 'j1', word: 'foxes', gems: ['f', 'o', 'x', 'es'], plural: true, count: 3, picture: 'fox', baby: 'b1' }, 'jar.labelled'],
      [{ type: 'place/care', baby: 'b1', station: 'bath' }, 'care.done'],
      [{ type: 'place/row-name', row: 2, name: 'Rose' }, 'row.named'],
      [{ type: 'place/outfit', baby: 'b1', outfit: { head: 'outfit-gold-crown' } }, 'outfit.saved'],
      [{ type: 'place/note', note: 'swing', words: ['swing'], mark: '?', gift: null }, 'note.sent'],
      [{ type: 'place/photo', place: 'salon', photo: 'p1', cousin: 'dot', babies: ['b1'] }, 'photo.taken'],
      [{ type: 'place/ribbon', baby: 'b1', on: true }, 'ribbon.set'],
      [{ type: 'place/favourite', baby: 'b1', on: true }, 'favourite.set'],
      [{ type: 'place/setting', key: 'parent-pin', value: '1357' }, 'settings.set'],
      [{ type: 'place/novelty', item: 'pinset-shells' }, 'novelty.given'],
    ];
    for (const [a, type] of cases) {
      const out = applyPlaceAction(a, laneCtx());
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(type);
    }
  });
});
