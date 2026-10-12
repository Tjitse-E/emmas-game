// Event types, payload shapes, validation and fold order. Imported by the game and by the Node save server,
// so it uses only erasable TypeScript (no enums) and `.ts` import paths.
// The shapes are contracts C2 (docs/v3/plan/contracts.ts) exactly; tests/core/events.test.ts checks that at compile time.
import { arr, bool, gem, int, isPlainObject, key, nullable, num, obj, oneOf, scalar, str, text } from './checks.ts';
import type { Check } from './checks.ts';
import { HLC_RE } from './hlc.ts';

/**
 * Schema version of new events. Version 1 stays open for added event types until the save server first
 * runs with Emma's family (plan task C6). After that every change adds a version and a migration.
 */
export const SCHEMA_VERSION = 1;

export type Strand = 'r' | 's' | 'm';
export type LearnStrand = Strand | 'name';
export type Result = 'first' | 'miss' | 'helped';
export type ErrorTag = 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
export type StepId = string;
export type ItemId = string;
export type BreedId = 'moon' | 'nestling' | 'pebble' | 'cosy' | 'berry' | 'snow' | 'bubble' | 'post' | 'sparkle';
export type EggKind = 'moon' | 'small-nest' | 'two-stone' | 'blanket' | 'berry' | 'snow';
export type Colours = { body: string; mane: string; mane2: string };
export type Traits = { shiny: boolean; speckled: boolean; golden: boolean; founder: boolean };
export type OutfitSlot = 'head' | 'neck' | 'back' | 'mane' | 'flank';

export type NameRoute = 'bell' | 'garden' | 'gold' | 'import';
export type NameOutcome = 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen';
export type EggLook = 'plain' | 'speckled' | 'golden' | 'building';
/** One item of a checked moment. The field is `r`, not `result` (learning reads it). */
export type ItemResult = { id: ItemId; r: Result };
export type Scalar = string | number | boolean | null;
export type CareStation =
  | 'hay' | 'brush' | 'hat' | 'nap' | 'swing' | 'bath'
  | 'cuddle' | 'treat' | 'trick' | 'splash' | 'rollcall';
export type Slot = 'current' | 'school' | 'side' | 'review' | 'mixed' | 'probe' | 'warmup' | 'golden' | 'name';
export type MomentKind =
  | 'wish' | 'bath-wish' | 'twin-wish' | 'one-or-many' | 'tricky-act' | 'basket-and' | 'basket-adj'
  | 'salon-card' | 'asking-bubble' | 'two-state-wish'
  | 'first-sound' | 'naming-bells' | 'naming-garden' | 'label' | 'label-plural' | 'sign' | 'note' | 'letter-order'
  | 'egg-moon' | 'egg-small-nest' | 'egg-two-stone' | 'egg-blanket' | 'egg-berry' | 'egg-snow'
  | 'door-visit' | 'roll-call-door' | 'trim' | 'beads' | 'post-pin' | 'post-sash' | 'parcel' | 'wall'
  | 'roll-call' | 'envelope'
  | 'station-wish';

export type V2Baby = {
  baby: string; v2id: number; name: string | null; gems: string[]; colours: Colours; traits: Traits;
  hearts: number; stickers: string[]; night: number;
};
export type Seed = { strand: 'r' | 's'; item: ItemId; box: 0 | 1 };
export type NameWish = { name: string; gems: string[]; phonemes: string };

export type LearnOverridePayload =
  | { op: 'profile'; profile: string }
  | { op: 'set-current'; strand: Strand; step: StepId; placed: StepId[]; side: StepId[] }
  | { op: 'mark-placed' | 'unmark-placed'; strand: Strand; step: StepId }
  | { op: 'school'; strand: Strand; step: StepId; on: boolean };

/** Setting keys used across streams. Values not set read as the default. */
export type SettingKey = 'skip-wish-after-three' | 'parent-pin' | 'birthday' | 'muted' | string;

export type Payloads = {
  // ---- first playable (Wave A)
  'visit.start': { visit: string; tz: number };
  'visit.end': { visit: string; reason: 'goodnight' | 'idle' | 'hidden' };
  'place.enter': { visit: string; place: string };
  'place.leave': { visit: string; place: string };
  'learn.result': {
    visit: string; strand: LearnStrand; step: StepId | null; carrier: string; items: ItemResult[]; result: Result;
    ms: number | null; scaffold: 1 | 2 | 3; error: ErrorTag | null; place: string; moment: MomentKind; slot: Slot;
    probe: boolean; baby: string | null; heart: boolean;
  };
  'learn.idle': { visit: string; strand: LearnStrand; step: StepId | null; place: string; level: 1 | 2 };
  'learn.override': LearnOverridePayload;
  'step.passed': { strand: Strand; step: StepId };
  /** Placement ended in a strand. Freezes the placed and side steps, so later content cannot rewrite them on a refold. */
  'placement.done': { strand: Strand; current: StepId; placed: StepId[]; side: StepId[] };
  'egg.hatched': {
    baby: string; egg: EggLook; kind: EggKind | 'building'; breed: BreedId; colours: Colours; traits: Traits;
    source: 'nest' | 'building' | 'row';
  };
  /** listName: the name-bank name whose clip says this name; null when no list name matches. */
  'baby.named': { baby: string; name: string; gems: string[]; route: NameRoute; listName: string | null };
  'name.built': {
    visit: string | null; baby: string | null; gems: string[]; phonemes: string; route: NameRoute;
    outcome: NameOutcome; listName: string | null; strong: boolean;
  };
  'name.clipHeard': { baby: string; heart: boolean };
  'care.done': { baby: string; station: CareStation; heart: boolean };
  /** key: set for moment pins ('first-bath', 'tenth-baby', 'first-building', 'moving-day'); a pin with a key is a recorded fact. */
  'pin.given': { baby: string; pin: string; kind: 'star' | 'set' | 'moment'; set: string | null; key: string | null };
  'jewel.placed': { jewel: StepId; plot: string };
  'jar.labelled': { jar: string; word: string; gems: string[]; count: number; plural: boolean; picture: string; baby: string | null };
  'building.part': { plot: string; part: 'walls' | 'trim' | 'sign' | 'ribbon' | 'circle' };
  /** Stable rows use plots 'row-2', 'row-3', ... (row 1 exists from the start). */
  'building.done': { plot: string };
  'row.named': { row: number; name: string };
  /** sky is 1-based: the first sky unicorn is 1. */
  'sky.named': { sky: number; name: string };
  'opening.announced': { opening: string };
  'title.given': { title: string };
  'outfit.saved': { baby: string; outfit: Partial<Record<OutfitSlot, string | null>> };
  'favourite.set': { baby: string; on: boolean };
  'decor.placed': { decor: string; item: string; area: string; x: number; y: number };
  'settings.set': { key: SettingKey; value: Scalar };
  'audio.missing': { clip: string };
  'import.v2': {
    hash: string; babies: V2Baby[]; gifts: string[]; nights: number; mathsV2Step: number; seeds: Seed[]; nameWishes: NameWish[];
  };
  'exclude': { device: string; on: boolean };
  // ---- release 1.1 (Wave B)
  'post.opened': { visit: string; post: string };
  /** note: the phrase id of the note (learning content/phrases/notes.json). */
  'note.sent': { visit: string; note: string; words: string[]; mark: '.' | '?' | '!'; gift: string | null };
  'novelty.given': { item: string };
  // ---- release 1.2 (Wave C)
  'photo.taken': { visit: string; place: string; photo: string; babies: string[]; cousin: string | null };
  'ribbon.set': { baby: string; on: boolean };
};

export type EventType = keyof Payloads;
export type EventBase = { id: string; hlc: string; t: number; dev: string; v: number };
export type DraftOf<K extends EventType> = { type: K } & Payloads[K];
export type EventOf<K extends EventType> = EventBase & DraftOf<K>;
export type GameEventDraft = { [K in EventType]: DraftOf<K> }[EventType];
export type GameEvent = { [K in EventType]: EventOf<K> }[EventType];

const colours = obj({ body: text(16), mane: text(16), mane2: text(16) });
const traits = obj({ shiny: bool, speckled: bool, golden: bool, founder: bool });
const gems = arr(gem, 12);
const strand = oneOf('r', 's', 'm');
const learnStrand = oneOf('r', 's', 'm', 'name');
const result = oneOf('first', 'miss', 'helped');
const route = oneOf('bell', 'garden', 'gold', 'import');
const babyName = text(24);
const steps = (max: number) => arr(key, max);
const OUTFIT_SLOTS: readonly OutfitSlot[] = ['head', 'neck', 'back', 'mane', 'flank'];
const EGG_KINDS: readonly (EggKind | 'building')[] = ['moon', 'small-nest', 'two-stone', 'blanket', 'berry', 'snow', 'building'];
const BREEDS: readonly BreedId[] = ['moon', 'nestling', 'pebble', 'cosy', 'berry', 'snow', 'bubble', 'post', 'sparkle'];
const STATIONS: readonly CareStation[] = ['hay', 'brush', 'hat', 'nap', 'swing', 'bath', 'cuddle', 'treat', 'trick', 'splash', 'rollcall'];
const SLOTS: readonly Slot[] = ['current', 'school', 'side', 'review', 'mixed', 'probe', 'warmup', 'golden', 'name'];

/** An outfit: any of the five slots, each a key or null. Other fields are refused. */
const outfit: Check = x => {
  if (!isPlainObject(x)) return 'object';
  for (const k of Object.keys(x)) {
    if (!(OUTFIT_SLOTS as readonly string[]).includes(k)) return `unexpected slot ${k}`;
    const err = nullable(key)(x[k]);
    if (err) return `${k}: ${err}`;
  }
  return null;
};

/** learn.override has four shapes. The shape is picked by `op`. */
const OVERRIDE_SHAPES: Record<string, Record<string, Check>> = {
  'profile': { op: oneOf('profile'), profile: key },
  'set-current': { op: oneOf('set-current'), strand, step: key, placed: steps(200), side: steps(50) },
  'mark-placed': { op: oneOf('mark-placed'), strand, step: key },
  'unmark-placed': { op: oneOf('unmark-placed'), strand, step: key },
  'school': { op: oneOf('school'), strand, step: key, on: bool },
};
const learnOverride: Check = x => {
  if (!isPlainObject(x)) return 'object';
  const op = x.op;
  if (typeof op !== 'string' || !Object.hasOwn(OVERRIDE_SHAPES, op)) return `op: one of ${Object.keys(OVERRIDE_SHAPES).join(', ')}`;
  return obj(OVERRIDE_SHAPES[op])(x);
};

/** Field checks: one check per payload field. The mapped type makes a missing field check a compile error. */
type FieldChecks<P> = { [F in keyof P]-?: Check };
/** learn.override is a union of shapes, so it has one check over the whole payload instead of field checks. */
type PayloadChecks = { [K in Exclude<EventType, 'learn.override'>]: FieldChecks<Payloads[K]> } & { 'learn.override': Check };

export const PAYLOAD_CHECKS: PayloadChecks = {
  'visit.start': { visit: key, tz: int(-840, 840) },
  'visit.end': { visit: key, reason: oneOf('goodnight', 'idle', 'hidden') },
  'place.enter': { visit: key, place: key },
  'place.leave': { visit: key, place: key },
  'learn.result': {
    visit: key, strand: learnStrand, step: nullable(key), carrier: text(200),
    items: arr(obj({ id: key, r: result }), 20), result, ms: nullable(int(0, 3_600_000)), scaffold: oneOf(1, 2, 3),
    error: nullable(oneOf('vowel', 'dutch', 'reversal', 'off-by-one', 'one-hour-off', 'other')),
    place: key, moment: key, slot: oneOf(...SLOTS), probe: bool, baby: nullable(key), heart: bool,
  },
  'learn.idle': { visit: key, strand: learnStrand, step: nullable(key), place: key, level: oneOf(1, 2) },
  'learn.override': learnOverride,
  'step.passed': { strand, step: key },
  'placement.done': { strand, current: key, placed: steps(200), side: steps(50) },
  'egg.hatched': {
    baby: key, egg: oneOf('plain', 'speckled', 'golden', 'building'), kind: oneOf(...EGG_KINDS), breed: oneOf(...BREEDS),
    colours, traits, source: oneOf('nest', 'building', 'row'),
  },
  'baby.named': { baby: key, name: babyName, gems, route, listName: nullable(babyName) },
  'name.built': {
    visit: nullable(key), baby: nullable(key), gems, phonemes: str(64), route,
    outcome: oneOf('no-vowel', 'blocked', 'list', 'unknown', 'chosen'), listName: nullable(babyName), strong: bool,
  },
  'name.clipHeard': { baby: key, heart: bool },
  'care.done': { baby: key, station: oneOf(...STATIONS), heart: bool },
  'pin.given': { baby: key, pin: key, kind: oneOf('star', 'set', 'moment'), set: nullable(key), key: nullable(key) },
  'jewel.placed': { jewel: key, plot: key },
  'jar.labelled': {
    jar: key, word: text(40), gems, count: int(1, 99), plural: bool, picture: key, baby: nullable(key),
  },
  'building.part': { plot: key, part: oneOf('walls', 'trim', 'sign', 'ribbon', 'circle') },
  'building.done': { plot: key },
  'row.named': { row: int(1, 1000), name: babyName },
  'sky.named': { sky: int(1, 1000), name: babyName },
  'opening.announced': { opening: key },
  'title.given': { title: key },
  'outfit.saved': { baby: key, outfit },
  'favourite.set': { baby: key, on: bool },
  'decor.placed': { decor: key, item: key, area: key, x: num, y: num },
  'settings.set': { key, value: scalar },
  'audio.missing': { clip: key },
  'import.v2': {
    hash: key,
    babies: arr(obj({
      baby: key, v2id: int(0, 1_000_000), name: nullable(babyName), gems, colours, traits,
      hearts: int(0, 999), stickers: arr(text(24), 60), night: int(1, 100_000),
    }), 500),
    gifts: arr(text(24), 100), nights: int(1, 100_000), mathsV2Step: int(0, 5),
    seeds: arr(obj({ strand: oneOf('r', 's'), item: key, box: oneOf(0, 1) }), 400),
    nameWishes: arr(obj({ name: babyName, gems, phonemes: str(64) }), 100),
  },
  'exclude': { device: key, on: bool },
  'post.opened': { visit: key, post: key },
  'note.sent': { visit: key, note: key, words: arr(text(24), 12), mark: oneOf('.', '?', '!'), gift: nullable(key) },
  'novelty.given': { item: key },
  'photo.taken': { visit: key, place: key, photo: key, babies: arr(key, 12), cousin: nullable(key) },
  'ribbon.set': { baby: key, on: bool },
};

export const EVENT_TYPES = Object.keys(PAYLOAD_CHECKS) as EventType[];
export const EVENT_ID_RE = /^([a-z2-7]{8}):([1-9]\d{0,9})$/;
const BASE_FIELDS = new Set(['id', 'hlc', 't', 'dev', 'v', 'type']);

export type Validation =
  | { ok: true; event: GameEvent }
  | { ok: false; newer: boolean; reason: string };

/** Checks the fields every event has, whatever its schema version. */
export function checkBase(x: unknown): string | null {
  if (!isPlainObject(x)) return 'not an object';
  const m = typeof x.id === 'string' ? EVENT_ID_RE.exec(x.id) : null;
  if (!m) return 'bad id';
  if (x.dev !== m[1]) return 'dev does not match id';
  if (typeof x.hlc !== 'string' || !HLC_RE.test(x.hlc)) return 'bad hlc';
  if (typeof x.t !== 'number' || !Number.isFinite(x.t)) return 'bad t';
  if (!Number.isInteger(x.v) || (x.v as number) < 1) return 'bad v';
  if (typeof x.type !== 'string' || x.type.length === 0 || x.type.length > 40) return 'bad type';
  return null;
}

/** Validates an event at the current schema version. Older events go through upgradeEvent (migrate.ts) first. */
export function validateEvent(x: unknown): Validation {
  const baseError = checkBase(x);
  if (baseError) return { ok: false, newer: false, reason: baseError };
  const e = x as Record<string, unknown>;
  const v = e.v as number;
  if (v > SCHEMA_VERSION) return { ok: false, newer: true, reason: `schema v${v} is newer than v${SCHEMA_VERSION}` };
  if (v < SCHEMA_VERSION) return { ok: false, newer: false, reason: `schema v${v} needs an upgrade` };
  const type = e.type as string;
  if (!Object.hasOwn(PAYLOAD_CHECKS, type)) return { ok: false, newer: false, reason: `unknown type ${type}` };
  const checks = PAYLOAD_CHECKS[type as EventType] as Record<string, Check> | Check;
  if (typeof checks === 'function') {
    const payload: Record<string, unknown> = {};
    for (const k of Object.keys(e)) if (!BASE_FIELDS.has(k)) payload[k] = e[k];
    const err = checks(payload);
    return err ? { ok: false, newer: false, reason: `${type}: ${err}` } : { ok: true, event: e as GameEvent };
  }
  for (const k of Object.keys(e)) {
    if (!BASE_FIELDS.has(k) && !Object.hasOwn(checks, k)) return { ok: false, newer: false, reason: `${type}: unexpected field ${k}` };
  }
  for (const k of Object.keys(checks)) {
    const err = checks[k](e[k]);
    if (err) return { ok: false, newer: false, reason: `${type}.${k}: ${err}` };
  }
  return { ok: true, event: e as GameEvent };
}

export function seqOf(e: { id: string }): number {
  return Number(e.id.slice(e.id.lastIndexOf(':') + 1));
}

/** Fold order: hybrid clock, then device id, then sequence. */
export function compareEvents(a: EventBase, b: EventBase): number {
  if (a.hlc !== b.hlc) return a.hlc < b.hlc ? -1 : 1;
  if (a.dev !== b.dev) return a.dev < b.dev ? -1 : 1;
  return seqOf(a) - seqOf(b);
}

/** The payload of an event: everything except the base fields and the type. */
export function payloadOf<K extends EventType>(e: EventOf<K>): Payloads[K] {
  const { id: _id, hlc: _hlc, t: _t, dev: _dev, v: _v, type: _type, ...payload } = e;
  return payload as unknown as Payloads[K];
}
