// Builders for test logs: a fake device that stamps drafts like the game does.
import { stamp } from '../../src/core/factory.ts';
import type { DeviceMeta } from '../../src/core/factory.ts';
import type { Colours, DraftOf, GameEvent, GameEventDraft, Traits } from '../../src/core/events.ts';

export type FakeDevice = { meta: DeviceMeta; events: GameEvent[]; add(drafts: GameEventDraft[], now: number): GameEvent[] };

export function fakeDevice(dev: string): FakeDevice {
  const d: FakeDevice = {
    meta: { dev, nextSeq: 1, hlc: '0000000000000-0000' },
    events: [],
    add(drafts, now) {
      const r = stamp(d.meta, drafts, now);
      d.meta = r.meta;
      d.events.push(...r.events);
      return r.events;
    },
  };
  return d;
}

export const COLOURS: Colours = { body: '#ffe0ef', mane: '#ff7fbf', mane2: '#9d7bff' };
export const PLAIN: Traits = { shiny: false, speckled: false, golden: false, founder: false };

export const hatch = (baby: string): DraftOf<'egg.hatched'> => ({
  type: 'egg.hatched', baby, egg: 'plain', kind: 'moon', breed: 'moon', colours: COLOURS, traits: PLAIN, source: 'nest',
});
export const named = (baby: string, name: string): DraftOf<'baby.named'> => ({
  type: 'baby.named', baby, name, gems: name.toLowerCase().split(''), route: 'bell', listName: name,
});
export const pin = (baby: string, id: string): DraftOf<'pin.given'> => ({ type: 'pin.given', baby, pin: id, kind: 'star', set: null, key: null });
export const care = (baby: string, heart = true): DraftOf<'care.done'> => ({ type: 'care.done', baby, station: 'brush', heart });
export const setting = (key: string, value: string | number | boolean | null): DraftOf<'settings.set'> => ({ type: 'settings.set', key, value });
