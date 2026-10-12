import { describe, it, expect } from 'vitest';
import { WishCtrl, unitSoundKey } from '../../src/scenes/heartbeat/wish.ctrl.ts';
import { buildWish } from '../../src/core/heartbeat/wish.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Pick } from '../../src/core/planner/index.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BY_WORD, get } from './words.ts';
import { fakeDeps, served as servedOf } from './fakes.ts';

const reading = (step: string, carrier: Pick['carrier'], moment: Pick['moment'] = 'wish', extra: Partial<Pick> = {}): Served =>
  servedOf({ strand: 'r', step, moment, items: ['r:g:a'], carrier, ...extra });
const wish = (s: Served, twinBaby: string | null = 'b2') =>
  buildWish({ served: s, baby: 'b1', babyName: null, twinBaby, words: BY_WORD, bathPond: true, sounded: new Set(), rng: makeRng(4) })!;

describe('unitSoundKey', () => {
  it('maps endings and split digraphs to letter sounds', () => {
    expect(unitSoundKey('-s')).toBe('s');
    expect(unitSoundKey('-es')).toBe('iz');
    expect(unitSoundKey('sh')).toBe('sh');
  });
});

describe('WishCtrl', () => {
  it('takes the heap for a plural first time and reads it back after the act', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(reading('R19', { kind: 'plural', word: 'hat', form: 'many', count: 3 }, 'one-or-many')), f.deps, get);
    await c.begin();
    expect(f.said).toEqual(['g-wish']);
    expect(c.answerLabel()).toBe('item hats');
    expect(await c.give(c.answerKey()!)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.learn', baby: 'b1', payload: { place: 'wish', result: 'first', error: null, moment: 'one-or-many' } });
    expect(f.said).toEqual(['g-wish', 'word-hats', 'fb-more-than-one', 'foal-yay']);
  });
  it('makes one hat for hats funny once, then a second miss is plain', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(reading('R19', { kind: 'plural', word: 'hat', form: 'many', count: 3 }, 'one-or-many')), f.deps, get);
    await c.begin();
    const one = c.wrongKey('one-for-many')!;
    expect(one).toBe('hat');
    expect(await c.give(one)).toBe('miss');
    expect(c.lastFunny).toBe('one-for-many');
    expect(c.glow).toBe(true);
    expect(f.said).toEqual(expect.arrayContaining(['foal-silly', 'fb-letters']));
    expect(await c.give(one)).toBe('miss');
    expect(c.lastFunny).toBeNull();
    expect(await c.give('hat-heap')).toBe('ok');
    expect(f.actions[0].payload).toMatchObject({ result: 'helped', error: 'other' });
  });
  it('gives the heap for one hat as the many-for-one mistake', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(reading('R19', { kind: 'plural', word: 'hat', form: 'one', count: 1 }, 'one-or-many')), f.deps, get);
    await c.begin();
    expect(c.wrongKey('many-for-one')).toBe('hat-heap');
    expect(await c.give('hat-heap')).toBe('miss');
    expect(c.lastFunny).toBe('heap-for-one');
  });
  it('serves twin wishes one baby after the other', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(reading('R04D', { kind: 'twin', pair: 'a-e-u', words: ['pan', 'pen'] }, 'twin-wish')), f.deps, get);
    await c.begin();
    expect(await c.give('pan')).toBe('next');
    expect(c.part).toBe('second');
    expect(c.current.baby).toBe('b2');
    expect(await c.give('pen')).toBe('ok');
    expect(f.actions.map((a) => a.baby)).toEqual(['b1', 'b2']);
  });
  it('sends the baby to the right station and logs care with the result', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(reading('R10', { kind: 'word', word: 'swing' }, 'station-wish', { slot: 'review' })), f.deps, get);
    await c.begin();
    expect(await c.give('pan')).toBe('ignored');
    expect(await c.toStation('nap')).toBe('miss');
    expect(c.lastFunny).toBe('wrong-station');
    expect(await c.toStation('swing')).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.care', baby: 'b1', station: 'swing', learn: { payload: { result: 'miss', moment: 'station-wish', slot: 'review' } } });
    expect(f.said).toContain('word-swing');
    expect(f.said).toContain('foal-wee');
  });
  it('says the display word, then the carrier, after the act (R36)', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(reading('R05', { kind: 'word', word: 'hat' }, 'wish', { display: ['the'] })), f.deps, get);
    // 'hat' is a station in the fixture; take a plain thing instead.
    const c2 = new WishCtrl(wish(reading('R01', { kind: 'word', word: 'pan' }, 'wish', { display: ['the'] })), f.deps, get);
    expect(c.display).toEqual(['the']);
    await c2.begin();
    await c2.give(c2.answerKey()!);
    expect(f.said.slice(1, 3)).toEqual(['word-the', 'word-pan']);
    expect(f.actions[0].payload.items).toEqual([{ id: 'r:g:a', r: 'first' }]);
  });

  describe('hungry wishes (docs/v3/next/plan.md F3)', () => {
    it('says the name, the baby\'s hunger and the goal, then munches and logs at feed', async () => {
      const f = fakeDeps({ names: ['Pip'] });
      const c = new WishCtrl(wish(reading('R05', { kind: 'word', word: 'bun' })), f.deps, get, { intro: 'hungry', place: 'feed', name: 'Pip' });
      await c.begin();
      expect(f.said).toEqual(['name:pip!', 'foal-hungry', 'g-hungry']);
      expect(f.goal()).not.toBeNull();
      await f.goal()!.repeat();
      expect(f.said.at(-1)).toBe('g-hungry');
      expect(await c.give(c.answerKey()!)).toBe('ok');
      expect(f.said.slice(4)).toEqual(['sfx:munch', 'word-bun', 'foal-yum']);
      expect(f.actions[0]).toMatchObject({ type: 'hb.learn', baby: 'b1', payload: { place: 'feed', result: 'first' } });
    });
    it('skips the name when it has no clip', async () => {
      const f = fakeDeps();
      const c = new WishCtrl(wish(reading('R05', { kind: 'word', word: 'bun' })), f.deps, get, { intro: 'hungry', place: 'feed', name: 'Zog' });
      await c.begin();
      expect(f.said).toEqual(['foal-hungry', 'g-hungry']);
    });
    it('keeps both funny mistakes in a one-or-many hungry wish', async () => {
      const f = fakeDeps();
      const many = new WishCtrl(wish(reading('R19', { kind: 'plural', word: 'cup', form: 'many', count: 3 }, 'one-or-many')), f.deps, get, { intro: 'hungry', place: 'feed', name: null });
      await many.begin();
      expect(await many.give(many.wrongKey('one-for-many')!)).toBe('miss');
      expect(many.lastFunny).toBe('one-for-many');
      const one = new WishCtrl(wish(reading('R19', { kind: 'plural', word: 'cup', form: 'one', count: 1 }, 'one-or-many')), f.deps, get, { intro: 'hungry', place: 'feed', name: null });
      await one.begin();
      expect(await one.give(one.wrongKey('many-for-one')!)).toBe('miss');
      expect(one.lastFunny).toBe('heap-for-one');
      expect(await many.give(many.answerKey()!)).toBe('ok');
      expect(f.said.slice(-4)).toEqual(['sfx:munch', 'word-cups', 'fb-more-than-one', 'foal-yum']);
    });
    it('logs a manger wish at the manger', async () => {
      const f = fakeDeps();
      const c = new WishCtrl(wish(reading('R05', { kind: 'word', word: 'bun' })), f.deps, get, { intro: 'hungry', place: 'manger', name: null });
      await c.begin();
      await c.give(c.answerKey()!);
      expect(f.actions[0].payload.place).toBe('manger');
    });
  });
});
