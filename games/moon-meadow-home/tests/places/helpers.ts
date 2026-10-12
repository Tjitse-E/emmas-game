// Test helpers for the place logic: value builders (Task A1a) and event, fold and context builders (Task A1).
import { mulberry32 } from '../../src/core/rng.ts';
import type { EventType, GameEvent, Payloads } from '../../src/core/events.ts';
import type { BabyView, LearnerView, Rng, ServedItem, StepId, WordView } from '../../src/core/places/types.ts';
import { initPlaces, type PlacesState } from '../../src/core/places/state.ts';
import { reducePlaces } from '../../src/core/places/fold.ts';
import type { ActionCtx, Colours, Content, GameState, Traits, World } from '../../src/types/contracts.ts';
import { miniContent } from '../fixtures/mini.ts';

export function rng(seed = 1): Rng {
  return mulberry32(seed);
}

export function word(id: string, graphemes: string[], extra: Partial<WordView> = {}): WordView {
  return { id, word: id, graphemes, picture: id, rStep: 'R05', sStep: 'S04', tags: [], ...extra };
}

export function served(strand: 'r' | 's' | 'm', step: StepId, carrier: string, items: string[], extra: Partial<ServedItem> = {}): ServedItem {
  return { strand, step, carrier, items, scaffold: 1, probe: false, kind: 'current', ...extra };
}

// ---- events and folds

let seq = 0;
export const T0 = Date.UTC(2026, 11, 1, 16, 0, 0);
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const COLOURS: Colours = { body: '#ffe0ef', mane: '#ff7fbf', mane2: '#9d7bff' };
export const PLAIN: Traits = { shiny: false, speckled: false, golden: false, founder: false };

export function resetSeq(): void { seq = 0; }

/** One stamped event in the contract shape. `t` defaults to T0 plus a second per event. */
export function ev<K extends EventType>(type: K, payload: Payloads[K], t?: number): GameEvent {
  seq += 1;
  return { id: `testtest:${seq}`, hlc: `${String(T0 + seq * 1000)}-0000`, t: t ?? T0 + seq * 1000, dev: 'testtest', v: 1, type, ...payload } as GameEvent;
}

export const hatched = (baby: string, source: Payloads['egg.hatched']['source'] = 'nest') =>
  ev('egg.hatched', { baby, egg: source === 'nest' ? 'plain' : 'building', kind: source === 'nest' ? 'moon' : 'building', breed: source === 'nest' ? 'moon' : 'bubble', colours: COLOURS, traits: PLAIN, source });

export const v2Baby = (baby: string, night = 1): Payloads['import.v2']['babies'][number] =>
  ({ baby, v2id: Number(baby.replace(/\D/g, '') || 1), name: null, gems: [], colours: COLOURS, traits: PLAIN, hearts: 0, stickers: [], night });

export const imported = (ids: string[], nights = 3) =>
  ev('import.v2', { hash: 'h', babies: ids.map((id) => v2Baby(id)), gifts: [], nights, mathsV2Step: 0, seeds: [], nameWishes: [] });

export const visitStart = (visit: string, t?: number) => ev('visit.start', { visit, tz: 0 }, t);
export const visitEnd = (visit: string) => ev('visit.end', { visit, reason: 'goodnight' });

export function foldAll(events: GameEvent[]): PlacesState {
  const s = initPlaces();
  for (const e of events) reducePlaces(s, e);
  return s;
}

// ---- views

export function baby(id: string, name: string, extra: Partial<BabyView> = {}): BabyView {
  return {
    id, order: 1, hatchIndex: 1, name, gems: name.toLowerCase().split(''), ordinal: 1, listName: name, clipKey: name.toLowerCase(),
    hasClip: true, unknownName: false, clipHeard: false, firstSound: name[0].toLowerCase(), breed: 'moon', stage: 'baby',
    colours: COLOURS, traits: PLAIN, hearts: 0, hatchedAt: T0, source: 'nest', sash: [], pouch: [], stickers: [], outfit: {},
    favourite: false, comeAlong: false, door: 1, ...extra,
  };
}

export function learner(o: Partial<LearnerView> & { reachedSteps?: StepId[]; levels?: Record<string, 1 | 2 | 3> } = {}): LearnerView {
  const reachedSteps = new Set(o.reachedSteps ?? []);
  const passed = o.passed ?? [];
  const placed = o.placed ?? [];
  return {
    current: o.current ?? { r: 'R21', s: 'S12', m: 'M10' },
    passed, placed,
    placementEnded: o.placementEnded ?? { r: true, s: true, m: true },
    reached: (step) => reachedSteps.has(step) || passed.some((p) => p.step === step) || placed.some((p) => p.step === step),
    scaffold: (_strand, step) => o.levels?.[step] ?? 1,
    passedOrPlaced: (step) => passed.some((p) => p.step === step) || placed.some((p) => p.step === step),
  };
}

/** A minimal world view over a places state and a herd. */
export function worldOf(places: PlacesState, herd: BabyView[] = [], extra: Partial<World> = {}): World {
  const visits = places.visits;
  return {
    herd, byId: Object.fromEntries(herd.map((b) => [b.id, b])), rowsBuilt: 1, doors: 10, camp: [], rowNames: [null], skyNames: [], sky: [],
    flowers: herd.length, visit: visits.at(-1)?.id ?? null, visitIndex: visits.at(-1)?.index ?? 0,
    announced: new Set(Object.keys(places.announced)), bathPond: places.buildings['bath-pond']?.done ?? false,
    settings: { skipWishAfterThree: false, parentPin: '2468', birthday: null }, places, ...extra,
  };
}

/** The hand-built ActionCtx of the lane contract test: an empty places state, babies b1 and b2, the mini content. */
export function laneCtx(places: PlacesState = initPlaces()): ActionCtx {
  const herd = [baby('b1', 'Pip', { order: 1, hatchIndex: 1 }), baby('b2', 'Tam', { order: 2, hatchIndex: 2 })];
  const state = { places } as unknown as GameState;
  return { visit: 'v1', now: 2000, state, world: worldOf(places, herd), content: miniContent() as unknown as Content, heartedThisVisit: () => false };
}
