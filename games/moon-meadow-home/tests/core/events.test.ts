import { describe, expect, it } from 'vitest';
import { compareEvents, EVENT_TYPES, payloadOf, SCHEMA_VERSION, seqOf, validateEvent } from '../../src/core/events.ts';
import type { GameEvent, Payloads } from '../../src/core/events.ts';
import type { Payloads as ContractPayloads } from '../../src/types/contracts.ts';
import { checkEvent, upgradeWith } from '../../src/core/migrate.ts';
import { stamp } from '../../src/core/factory.ts';
import { COLOURS, hatch, PLAIN } from '../helpers/events.ts';

const base = { id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1_760_000_000_000, dev: 'abcdefgh', v: SCHEMA_VERSION };

describe('event validation', () => {
  it('accepts a good event of every first-playable type', () => {
    const samples: Record<string, Record<string, unknown>> = {
      'visit.start': { visit: 'v1', tz: 180 },
      'visit.end': { visit: 'v1', reason: 'goodnight' },
      'place.enter': { visit: 'v1', place: 'nest' },
      'place.leave': { visit: 'v1', place: 'nest' },
      'learn.result': {
        visit: 'v1', strand: 'm', step: 'M10', carrier: 'two-stone egg 7', items: [{ id: 'm:pair:3-7', r: 'first' }],
        result: 'first', ms: 2300, scaffold: 2, error: null, place: 'nest', moment: 'egg-two-stone', slot: 'current',
        probe: false, baby: null, heart: false,
      },
      'learn.idle': { visit: 'v1', strand: 'r', step: 'R21', place: 'wish', level: 1 },
      'learn.override': { strand: 's', op: 'mark-placed', step: 'S10' },
      'step.passed': { strand: 'r', step: 'R19' },
      'placement.done': { strand: 'r', current: 'R21', placed: ['R01', 'R02'], side: ['R04D'] },
      'egg.hatched': { baby: 'b1', egg: 'golden', kind: 'moon', breed: 'moon', colours: COLOURS, traits: PLAIN, source: 'nest' },
      'baby.named': { baby: 'b1', name: 'Daisy', gems: ['d', 'ai', 's', 'y'], route: 'garden', listName: 'Daisy' },
      'name.built': {
        visit: 'v1', baby: 'b1', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m əʊ', route: 'gold', outcome: 'unknown', listName: null, strong: false,
      },
      'name.clipHeard': { baby: 'b1', heart: true },
      'care.done': { baby: 'b1', station: 'brush', heart: true },
      'pin.given': { baby: 'b1', pin: 'star-1', kind: 'star', set: null, key: null },
      'jewel.placed': { jewel: 'S20', plot: 'fountain' },
      'jar.labelled': { jar: 'jar-1', word: 'foxes', gems: ['f', 'o', 'x', 'es'], count: 3, plural: true, picture: 'fox', baby: null },
      'building.part': { plot: 'bath-pond', part: 'walls' },
      'building.done': { plot: 'row-2' },
      'row.named': { row: 2, name: 'Rose Row' },
      'sky.named': { sky: 1, name: 'Star' },
      'opening.announced': { opening: 'bath-pond' },
      'title.given': { title: 'nest-keeper' },
      'outfit.saved': { baby: 'b1', outfit: { head: 'crown-gold', back: null } },
      'favourite.set': { baby: 'b1', on: true },
      'decor.placed': { decor: 'd1', item: 'lantern', area: 'meadow', x: 100, y: 200 },
      'settings.set': { key: 'skip-wish-after-three', value: false },
      'audio.missing': { clip: 'word-hat' },
      'import.v2': { hash: 'ab12', babies: [], gifts: ['hat'], nights: 4, mathsV2Step: 2, seeds: [], nameWishes: [] },
      'exclude': { device: 'zzzzzzzz', on: true },
      'post.opened': { visit: 'v1', post: 'post-3' },
      'note.sent': { visit: 'v1', note: 'note-swing', words: ['Can', 'we', 'have', 'a', 'swing'], mark: '?', gift: 'swing' },
      'novelty.given': { item: 'pin-set-shells' },
      'photo.taken': { visit: 'v1', place: 'salon', photo: 'p1', babies: ['b1'], cousin: 'dot' },
      'ribbon.set': { baby: 'b1', on: true },
    };
    expect(Object.keys(samples).sort()).toEqual([...EVENT_TYPES].sort());
    for (const [type, payload] of Object.entries(samples)) {
      const r = validateEvent({ ...base, type, ...payload });
      expect(r, type).toEqual({ ok: true, event: { ...base, type, ...payload } });
    }
  });

  it('refuses bad base fields', () => {
    const good = { ...base, type: 'favourite.set', baby: 'b1', on: true };
    expect(validateEvent({ ...good, id: 'ABCDEFGH:1' })).toMatchObject({ ok: false, reason: 'bad id' });
    expect(validateEvent({ ...good, dev: 'zzzzzzzz' })).toMatchObject({ ok: false, reason: 'dev does not match id' });
    expect(validateEvent({ ...good, hlc: '12-0' })).toMatchObject({ ok: false, reason: 'bad hlc' });
    expect(validateEvent({ ...good, id: 'abcdefgh:0' })).toMatchObject({ ok: false, reason: 'bad id' });
    expect(validateEvent(null)).toMatchObject({ ok: false, reason: 'not an object' });
  });

  it('refuses unknown types, prototype names, extra fields and bad payloads', () => {
    expect(validateEvent({ ...base, type: 'egg.stolen' })).toMatchObject({ ok: false, newer: false, reason: 'unknown type egg.stolen' });
    expect(validateEvent({ ...base, type: 'constructor' })).toMatchObject({ ok: false, reason: 'unknown type constructor' });
    expect(validateEvent({ ...base, type: 'favourite.set', baby: 'b1', on: true, extra: 1 })).toMatchObject({ ok: false, reason: 'favourite.set: unexpected field extra' });
    expect(validateEvent({ ...base, type: 'favourite.set', baby: '__proto__', on: true })).toMatchObject({ ok: false, reason: 'favourite.set.baby: key' });
    expect(validateEvent({
      ...base, type: 'jar.labelled', jar: 'j', word: 'hat', gems: ['H'], count: 1, plural: false, picture: 'hat', baby: null,
    })).toMatchObject({ ok: false, reason: 'jar.labelled.gems: [0] gem' });
  });

  it('marks events with a newer schema as newer, not invalid', () => {
    expect(validateEvent({ ...base, v: SCHEMA_VERSION + 1, type: 'brand.new' })).toEqual({
      ok: false, newer: true, reason: `schema v${SCHEMA_VERSION + 1} is newer than v${SCHEMA_VERSION}`,
    });
  });

  it('orders by clock, then device, then sequence', () => {
    const e = (id: string, hlc: string) => ({ ...base, id, dev: id.split(':')[0], hlc });
    const list = [e('bbbbbbbb:2', 'x2'), e('aaaaaaaa:10', 'x2'), e('aaaaaaaa:9', 'x2'), e('cccccccc:1', 'x1')];
    expect([...list].sort(compareEvents).map(x => x.id)).toEqual(['cccccccc:1', 'aaaaaaaa:9', 'aaaaaaaa:10', 'bbbbbbbb:2']);
    expect(seqOf({ id: 'aaaaaaaa:10' })).toBe(10);
  });

  it('payloadOf strips the base fields', () => {
    const [ev] = stamp({ dev: 'abcdefgh', nextSeq: 1, hlc: '0000000000000-0000' }, [hatch('b1')], 1000).events;
    expect(payloadOf(ev as Extract<GameEvent, { type: 'egg.hatched' }>)).toEqual({
      baby: 'b1', egg: 'plain', kind: 'moon', breed: 'moon', colours: COLOURS, traits: PLAIN, source: 'nest',
    });
  });
});

describe('contracts C2 payloads', () => {
  const ok = (type: string, payload: Record<string, unknown>) => validateEvent({ ...base, type, ...payload }).ok;

  it('accepts the four learn.override shapes and refuses mixed ones', () => {
    expect(ok('learn.override', { op: 'profile', profile: 'year1' })).toBe(true);
    expect(ok('learn.override', { op: 'set-current', strand: 'r', step: 'R13', placed: ['R01'], side: [] })).toBe(true);
    expect(ok('learn.override', { op: 'unmark-placed', strand: 'm', step: 'M04' })).toBe(true);
    expect(ok('learn.override', { op: 'school', strand: 's', step: 'S03', on: true })).toBe(true);
    expect(validateEvent({ ...base, type: 'learn.override', op: 'profile', profile: 'fresh', strand: 'r' }))
      .toMatchObject({ ok: false, reason: 'learn.override: unexpected field strand' });
    expect(ok('learn.override', { op: 'school', strand: 's', step: 'S03' })).toBe(false);
    expect(ok('learn.override', { op: 'end-placement', strand: 's', step: 'S03' })).toBe(false);
    expect(ok('learn.override', { op: '__proto__' })).toBe(false);
  });

  it('accepts a name result with no step and no time, and a station wish', () => {
    const r = {
      visit: 'v1', strand: 'name', step: null, carrier: 'Daisy', items: [{ id: 'name:daisy', r: 'miss' }], result: 'miss',
      ms: null, scaffold: 1, error: null, place: 'meadow', moment: 'naming-bells', slot: 'name', probe: false, baby: 'b1', heart: false,
    };
    expect(ok('learn.result', r)).toBe(true);
    expect(ok('learn.result', { ...r, strand: 'r', step: 'R05', moment: 'station-wish', slot: 'review' })).toBe(true);
    expect(ok('learn.result', { ...r, slot: 'later' })).toBe(false);
    expect(ok('learn.result', { ...r, items: [{ id: 'name:daisy', result: 'miss' }] })).toBe(false);
    expect(ok('learn.idle', { visit: 'v1', strand: 'name', step: null, place: 'meadow', level: 2 })).toBe(true);
  });

  it('checks egg kinds, breeds, stations and outfit slots', () => {
    const egg = { baby: 'b1', egg: 'plain', kind: 'two-stone', breed: 'pebble', colours: COLOURS, traits: PLAIN, source: 'nest' };
    expect(ok('egg.hatched', egg)).toBe(true);
    expect(ok('egg.hatched', { ...egg, kind: 'building', egg: 'building', source: 'building' })).toBe(true);
    expect(ok('egg.hatched', { ...egg, kind: 'dragon' })).toBe(false);
    expect(ok('egg.hatched', { ...egg, breed: 'horse' })).toBe(false);
    expect(ok('egg.hatched', { ...egg, traits: { shiny: false } })).toBe(false);
    expect(ok('care.done', { baby: 'b1', station: 'rollcall', heart: false })).toBe(true);
    expect(ok('care.done', { baby: 'b1', station: 'polish', heart: false })).toBe(false);
    expect(ok('outfit.saved', { baby: 'b1', outfit: { mane: 'bow-pink', flank: null } })).toBe(true);
    expect(ok('outfit.saved', { baby: 'b1', outfit: { hat: 'crown' } })).toBe(false);
    expect(ok('outfit.saved', { baby: 'b1', outfit: { head: '__bad' } })).toBe(false);
  });

  it('accepts a moment pin with a key, and the sky number from 1', () => {
    expect(ok('pin.given', { baby: 'b1', pin: 'pin-moving-day', kind: 'moment', set: null, key: 'moving-day' })).toBe(true);
    expect(ok('pin.given', { baby: 'b1', pin: 'pin-moving-day', kind: 'moment', set: null })).toBe(false);
    expect(ok('sky.named', { sky: 0, name: 'Star' })).toBe(false);
    expect(ok('note.sent', { visit: 'v1', note: 'n1', words: ['We'], mark: ',', gift: null })).toBe(false);
  });
});

describe('migrations', () => {
  it('runs each step up to the target version', () => {
    const v1 = { ...base, v: 1, type: 'old.thing', a: 1 };
    const up = upgradeWith(v1, { 1: e => ({ ...e, b: 2 }), 2: e => ({ ...e, c: 3 }) }, 3);
    expect(up).toEqual({ ...v1, v: 3, b: 2, c: 3 });
  });

  it('stops when a step is missing and leaves bad input alone', () => {
    expect(upgradeWith({ ...base, v: 1 }, {}, 2)).toEqual({ ...base, v: 1 });
    expect(upgradeWith('junk', { 1: e => e }, 2)).toBe('junk');
  });

  it('checkEvent validates a current event', () => {
    expect(checkEvent({ ...base, type: 'favourite.set', baby: 'b1', on: false }).ok).toBe(true);
  });
});

// Compile-time check (npm run check): the payloads here are contracts C2 exactly, in both directions.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Each = { [K in keyof ContractPayloads]: Same<ContractPayloads[K], Payloads[K]> }[keyof ContractPayloads];
type PayloadsMatch = false extends Each ? false : true;
const payloadsMatch: PayloadsMatch = true;
const sameTypes: Same<keyof ContractPayloads, keyof Payloads> = true;
void payloadsMatch;
void sameTypes;
