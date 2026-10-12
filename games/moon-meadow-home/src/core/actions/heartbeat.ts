// Heartbeat actions to event drafts (contracts C2, C7). Pure: no visit, no hearts; the actions router adds them.
// A learn.result is never built here: scenes pass learning's learnResultPayload(pick, outcome) through (R17, R19).
import type { BreedId, CareStation, Colours, DraftOf, EggKind, EggLook, Payloads, Traits } from '../../types/contracts.ts';
import { slugName } from '../keys.ts';
import { BODY, MANE } from '../heartbeat/hatch.ts';
import { spellingToGems } from '../naming/sounds.ts';

/** What learnResultPayload(pick, outcome) returns. */
export type LearnPayload = Omit<Payloads['learn.result'], 'visit' | 'baby' | 'heart'> & { type: 'learn.result' };
/** A learning result to log with an action, for the baby it belongs to (null for none). */
export type LearnLog = { payload: LearnPayload; baby: string | null };
export type LearnDraft = LearnPayload & { baby: string | null };

export type HbAction =
  | { type: 'hb.learn'; payload: LearnPayload; baby: string | null }
  /** A hatch, with the egg's result when the egg was checked (a free egg has none). */
  | {
    type: 'hb.hatched'; baby: string; egg: EggLook; kind: EggKind | 'building'; breed: BreedId; colours: Colours; traits: Traits;
    source: 'nest' | 'building' | 'row'; learn?: LearnLog | null;
  }
  /** A care act, with the station wish's or roll call's result when there was one. */
  | { type: 'hb.care'; baby: string; station: CareStation; learn?: LearnLog | null }
  /** index is 0-based; the event's sky is 1-based. */
  | { type: 'hb.sky-named'; index: number; name: string }
  | { type: 'hb.row-named'; row: number; name: string }
  /** Stall-door free play (R57): paint pot, flower box or lantern. Never checked. */
  | { type: 'hb.decor'; decor: string; item: string; x: number; y: number }
  /** Test builds only: a hatched and named baby without playing the moments. */
  | { type: 'hb.test-hatch'; baby: string; name: string; listName?: string | null };

export type HbDraft =
  | LearnDraft | DraftOf<'egg.hatched'> | Omit<DraftOf<'care.done'>, 'heart'> | DraftOf<'sky.named'> | DraftOf<'row.named'>
  | DraftOf<'decor.placed'> | DraftOf<'baby.named'>;

const learnDraft = (l: LearnLog | null | undefined): LearnDraft[] => (l ? [{ ...l.payload, baby: l.baby }] : []);
const colours = (c: Colours): Colours => ({ body: c.body, mane: c.mane, mane2: c.mane2 });
const traits = (t: Partial<Traits>): Traits => ({ shiny: !!t.shiny, speckled: !!t.speckled, golden: !!t.golden, founder: !!t.founder });

/** Test hatches get stable, varied colours from art's palette. */
function testColours(baby: string): Colours {
  let h = 0;
  for (const ch of baby) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { body: BODY[h % BODY.length], mane: MANE[h % MANE.length], mane2: MANE[(h + 3) % MANE.length] };
}

export function applyHeartbeat(a: HbAction): HbDraft[] {
  switch (a.type) {
    case 'hb.learn':
      return learnDraft(a);
    case 'hb.hatched':
      return [
        ...learnDraft(a.learn),
        { type: 'egg.hatched', baby: a.baby, egg: a.egg, kind: a.kind, breed: a.breed, colours: colours(a.colours), traits: traits(a.traits), source: a.source },
      ];
    case 'hb.care':
      return [...learnDraft(a.learn), { type: 'care.done', baby: a.baby, station: a.station }];
    case 'hb.sky-named':
      return [{ type: 'sky.named', sky: a.index + 1, name: a.name }];
    case 'hb.row-named':
      return [{ type: 'row.named', row: a.row, name: a.name }];
    case 'hb.decor':
      return [{ type: 'decor.placed', decor: a.decor, item: a.item, area: 'stalls', x: a.x, y: a.y }];
    case 'hb.test-hatch':
      return [
        { type: 'egg.hatched', baby: a.baby, egg: 'plain', kind: 'small-nest', breed: 'nestling', colours: testColours(a.baby), traits: traits({}), source: 'nest' },
        { type: 'baby.named', baby: a.baby, name: a.name, gems: spellingToGems(slugName(a.name)).slice(0, 12), route: 'gold', listName: a.listName === undefined ? a.name : a.listName },
      ];
    default:
      throw new Error(`Unknown heartbeat action ${(a as { type: string }).type}`);
  }
}

const SAMPLE_LEARN: LearnPayload = {
  type: 'learn.result', strand: 'r', step: 'R19', carrier: 'hats', items: [{ id: 'r:g:a', r: 'first' }, { id: 'r:end:s', r: 'first' }],
  result: 'first', ms: 1200, scaffold: 1, error: null, place: 'wish', moment: 'wish', slot: 'current', probe: false,
};

/** One sample per heartbeat action type, for the integration contract test (master Task I-1). */
export const HEARTBEAT_SAMPLE_ACTIONS: HbAction[] = [
  { type: 'hb.learn', payload: SAMPLE_LEARN, baby: 'b1' },
  {
    type: 'hb.hatched', baby: 'b2', egg: 'plain', kind: 'two-stone', breed: 'pebble',
    colours: { body: '#ffe0ef', mane: '#ff7fbf', mane2: '#9d7bff' }, traits: { shiny: true, speckled: false, golden: false, founder: false },
    source: 'nest',
    learn: {
      baby: 'b2',
      payload: { type: 'learn.result', strand: 'm', step: 'M10', carrier: 'egg:two-stone', items: [{ id: 'm:pair:3-7', r: 'miss' }],
        result: 'miss', ms: 4000, scaffold: 2, error: 'off-by-one', place: 'nest', moment: 'egg-two-stone', slot: 'current', probe: false },
    },
  },
  {
    type: 'hb.care', baby: 'b1', station: 'swing',
    learn: {
      baby: 'b1',
      payload: { type: 'learn.result', strand: 'r', step: 'R10', carrier: 'swing', items: [{ id: 'r:g:ng', r: 'first' }],
        result: 'first', ms: 900, scaffold: 3, error: null, place: 'wish', moment: 'station-wish', slot: 'review', probe: false },
    },
  },
  { type: 'hb.sky-named', index: 0, name: 'Rose' },
  { type: 'hb.row-named', row: 2, name: 'Pip' },
  { type: 'hb.decor', decor: 'paint-pot', item: 'door-3', x: 412, y: 300 },
  { type: 'hb.test-hatch', baby: 'b9', name: 'Pip' },
];
