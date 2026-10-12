import { beforeEach, describe, expect, it } from 'vitest';
import { currentVisit, initPlaces } from '../../src/core/places/state.ts';
import { createPlacesSlice } from '../../src/core/places/index.ts';
import { released } from '../../src/core/places/content.ts';
import { ev, foldAll, hatched, imported, resetSeq, visitEnd, visitStart } from './helpers.ts';

beforeEach(resetSeq);

describe('place fold', () => {
  it('starts empty', () => {
    const s = initPlaces();
    expect(s.herd).toBe(0);
    expect(s.visits).toEqual([]);
    expect(currentVisit(s)).toBeNull();
  });

  it('counts the herd from hatches and the v2 import, once per baby', () => {
    const s = foldAll([
      imported(['a', 'b', 'c'], 12), imported(['a', 'b', 'c'], 12),
      hatched('d'), hatched('d'), hatched('e', 'building'), hatched('f', 'row'),
    ]);
    expect(s.herd).toBe(6);
    expect(s.hatchOrder).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(s.circleBabies).toEqual(['e', 'f']);
    expect(s.nights).toBe(12);
  });

  it('counts nest hatches per visit, not circle hatches', () => {
    const s = foldAll([visitStart('v1'), hatched('a'), hatched('b', 'building')]);
    expect(s.visits[0].hatches).toBe(1);
  });

  it('grants the rows an imported herd needs', () => {
    const ids = Array.from({ length: 23 }, (_, i) => `b${i}`);
    expect(foldAll([imported(ids)]).importRows).toBe(3);
  });

  it('numbers visits and marks a visit with something new', () => {
    const s = foldAll([visitStart('v1'), visitEnd('v1'), visitStart('v2'), ev('opening.announced', { opening: 'bath-pond' })]);
    expect(s.visits.map((v) => [v.id, v.index, v.newThing])).toEqual([['v1', 1, false], ['v2', 2, true]]);
    expect(s.announced).toEqual({ 'bath-pond': 'v2' });
    expect(currentVisit(s)?.announced).toEqual(['bath-pond']);
  });

  it('counts a passed step, a title and a heard name clip as new', () => {
    const news = [ev('step.passed', { strand: 's', step: 'S20' }), ev('title.given', { title: 'stable-keeper' }), ev('name.clipHeard', { baby: 'a', heart: true })];
    for (const e of news) {
      const s = foldAll([visitStart('v1'), e]);
      expect(s.visits[0].newThing).toBe(true);
    }
  });

  it('keeps the earliest building.done, opening and jewel', () => {
    const s = foldAll([
      visitStart('v1'),
      ev('building.done', { plot: 'bath-pond' }, 1000), ev('building.done', { plot: 'bath-pond' }, 5000),
      ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'S20', plot: 'decor-fountain' }),
      ev('opening.announced', { opening: 'bubbles' }), visitStart('v2'), ev('opening.announced', { opening: 'bubbles' }),
    ]);
    expect(s.buildings['bath-pond'].doneT).toBe(1000);
    expect(s.jewels).toEqual({ S20: 'salon' });
    expect(s.announced).toEqual({ bubbles: 'v1' });
    expect(s.visits[1].newThing).toBe(false);
  });

  it('keeps finished parts when a Building Day stops halfway, without duplicates', () => {
    const s = foldAll([
      ev('building.part', { plot: 'row-2', part: 'walls' }), ev('building.part', { plot: 'row-2', part: 'walls' }),
      ev('building.part', { plot: 'row-2', part: 'trim' }),
    ]);
    expect(s.buildings['row-2']).toEqual({ parts: ['walls', 'trim'], done: false, doneT: null });
  });

  it('takes the latest row name, outfit and ribbon', () => {
    const s = foldAll([
      ev('row.named', { row: 2, name: 'Rose' }), ev('row.named', { row: 2, name: 'Lily' }),
      ev('outfit.saved', { baby: 'a', outfit: { head: 'gold-crown' } }), ev('outfit.saved', { baby: 'a', outfit: { back: 'pink-cape' } }),
      ev('ribbon.set', { baby: 'a', on: true }), ev('ribbon.set', { baby: 'a', on: false }),
    ]);
    expect(s.rowNames).toEqual({ 2: 'Lily' });
    expect(s.outfits.a).toEqual({ back: 'pink-cape' });
    expect(s.ribbons.a).toBe(false);
  });

  it('records the key of a moment pin, and ignores pins without a key', () => {
    const s = foldAll([
      ev('pin.given', { baby: 'a', pin: 'star', kind: 'star', set: null, key: null }),
      ev('pin.given', { baby: 'a', pin: 'moment-first-bath', kind: 'moment', set: null, key: 'first-bath' }),
    ]);
    expect(s.pinKeys).toEqual({ 'first-bath': true });
  });

  it('marks the post, notes, gifts and cousins of a visit', () => {
    const s = foldAll([
      visitStart('v1'),
      ev('post.opened', { visit: 'v1', post: 'post-1' }), ev('post.opened', { visit: 'v1', post: 'post-1' }),
      ev('note.sent', { visit: 'v1', note: 'swing', words: ['swing'], mark: '?', gift: 'gift-swing' }),
      ev('note.sent', { visit: 'v1', note: 'swing', words: ['swing'], mark: '?', gift: 'gift-swing' }),
      ev('photo.taken', { visit: 'v1', place: 'salon', photo: 'p1', cousin: 'dot', babies: ['a'] }),
    ]);
    expect(s.visits[0]).toMatchObject({ post: true, notes: 2, cousins: ['dot'] });
    expect(s.posts).toEqual(['post-1']);
    expect(s.gifts).toEqual(['gift-swing']);
    expect(s.photos).toHaveLength(1);
  });

  it('unlocks a novelty item when it is announced or given', () => {
    const s = foldAll([visitStart('v1'), ev('opening.announced', { opening: 'novelty:pinset-shells' }), ev('novelty.given', { item: 'egg-skin-snowflake' })]);
    expect(s.unlocked).toEqual(['pinset-shells', 'egg-skin-snowflake']);
  });

  it('remembers the first bath only and folds settings', () => {
    const s = foldAll([
      ev('care.done', { baby: 'a', station: 'bath', heart: true }), ev('care.done', { baby: 'b', station: 'bath', heart: true }),
      ev('care.done', { baby: 'c', station: 'brush', heart: true }), ev('settings.set', { key: 'parent-pin', value: '1357' }),
    ]);
    expect(s.firstBath).toBe('a');
    expect(s.settings['parent-pin']).toBe('1357');
  });

  it('keeps what places need to know of placement and passed steps', () => {
    const s = foldAll([
      ev('placement.done', { strand: 'r', current: 'R13', placed: ['R01', 'R02'], side: [] }),
      ev('placement.done', { strand: 'r', current: 'R05', placed: [], side: [] }),
      ev('step.passed', { strand: 'r', step: 'R13' }),
    ]);
    expect(s.learn).toEqual({ passed: ['R13'], placementEnded: { r: true, s: false, m: false }, placementCurrent: { r: 'R13' }, placed: ['R01', 'R02'] });
  });

  it('ignores events it does not know', () => {
    const s = foldAll([ev('sky.named', { sky: 1, name: 'Star' }), ev('favourite.set', { baby: 'a', on: true })]);
    expect(s).toEqual(initPlaces());
  });

  it('is a core fold slice called places', () => {
    const slice = createPlacesSlice();
    expect(slice.name).toBe('places');
    const s = slice.apply(slice.init(), hatched('a'), { get: () => undefined as never });
    expect(s.herd).toBe(1);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('release gate', () => {
  it('opens everything up to the current release', () => {
    expect(released('1.0', '1.3')).toBe(true);
    expect(released('1.3', '1.3')).toBe(true);
    expect(released('later', '1.3')).toBe(false);
    expect(released('1.2', '1.1')).toBe(false);
  });

  it('orders the patch release 1.0.1 by the release list, not as a number', () => {
    expect(released('1.0', '1.0.1')).toBe(true);
    expect(released('1.1', '1.0.1')).toBe(false);
    expect(released('1.0.1', '1.0.1')).toBe(true);
    expect(released('later', '1.3')).toBe(false);
  });
});
