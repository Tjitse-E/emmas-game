// Moon Meadow Home v3: the reconciled cross-stream contracts.
//
// This file is the single source for every name and shape that more than one workstream uses.
// docs/v3/plan.md section "Contracts" explains each block and names its owner. Where a stream
// plan (docs/v3/plan/<stream>.md) still shows another name or shape, this file wins.
//
// It is reference code: builders copy the block they own into the owner's file, and import the
// rest from the owner's module (the `owner:` line above each block). The skeleton task copies this whole file
// verbatim to G/src/types/contracts.ts, so lanes can `import type` a shape before its owner module exists (R41).
// It type-checks on its own with TypeScript 6.0.3:
//   tsc --noEmit --strict --erasableSyntaxOnly --verbatimModuleSyntax --target es2022 --module esnext --moduleResolution bundler \
//       --lib es2023,dom docs/v3/plan/contracts.ts
// Functions shown with a body are the exact implementation. `declare` lines are signatures only.

/* =====================================================================================
 * 0. Paths, ports and owners
 * ===================================================================================== */

/** All app paths are relative to games/moon-meadow-home/ (G). */
export const OWNERS = {
  'package.json, tsconfig.json, vite.config.ts, svelte.config.js, index.html, src/main.ts, src/App.svelte': 'platform (package.json changes, the vite.config.ts plugin lines and the main.ts store import: integrator, R60)',
  '.gitignore (repo root), .gitignore (G)': 'platform (the only lane that edits them, R60)',
  'src/core/keys.ts, src/types/contracts.ts, src/polyfills.ts, public/feature-check.js': 'platform (keys.ts and types/contracts.ts verbatim from this file, R40, R41, R50)',
  'src/platform/**, src/ui/ghost-hand.svelte.ts, src/ui/GhostHand.svelte, src/ui/moonbeam.svelte.ts, src/ui/Moonbeam.svelte, src/ui/targets.ts': 'platform',
  'src/test-hook.ts, flows/lib.sh, flows/run.sh': 'platform',
  'src/core/rng.ts': 'platform (written in the skeleton task, verbatim from section 1 below)',
  'flows/heartbeat/**': 'heartbeat',
  'flows/places/** (lib.sh and <name>.flow.sh only)': 'places',
  'src/core/hash.ts, src/core/ids.ts, src/core/hlc.ts, src/core/checks.ts, src/core/events.ts, src/core/migrate.ts, src/core/factory.ts, src/core/merge.ts': 'core',
  'src/core/fold/**, src/core/world/**, src/core/save/**, src/save/**, src/sync/**, server/**': 'core',
  'ideas/opus-5-5-unicorn-egg-nest-v2/move.html': 'core',
  'content/{release,gpcs,moments,pairs}.json, content/ladders/**, content/words/**, content/names/**, content/phrases/**, shared/blocklist.json': 'learning',
  'src/core/content/**, src/core/learning/**, src/core/planner/**, tools/validate-content.ts, tools/build-lines.ts, tools/list-pictures.ts, tools/simulate.ts, tools/lib/**': 'learning',
  'src/core/heartbeat/**, src/core/maths/**, src/core/phonics/**, src/core/naming/**, src/core/eggs/**, src/core/actions/heartbeat.ts, src/core/actions/naming.ts': 'heartbeat',
  'src/scenes/*.svelte (Nest, Hatch, Naming, Wish, Stalls, Goodnight, EggChoice), src/scenes/heartbeat/**, src/scenes/naming/**': 'heartbeat',
  'src/ui/Gem.svelte, src/ui/GemSlots.svelte, src/ui/GemTray.svelte, src/ui/SoundSlider.svelte, src/ui/Stone.svelte, src/ui/StoneTray.svelte, src/ui/PrintWithDots.svelte': 'heartbeat',
  'content/lines/heartbeat.json, tools/heartbeat-lines.ts': 'heartbeat',
  'src/core/places/**, src/core/report/**, src/scenes/places/**, src/places/**, src/parent/**, content/places/**, content/lines/places*.json, tools/report.ts': 'places',
  'src/ui/moment.ts, src/ui/moment-deps.ts, src/ui/ReplayButton.svelte, src/ui/Bubble.svelte, src/ui/MeadowArrow.svelte, src/ui/Crown.svelte, src/ui/JewelBox.svelte, src/ui/places-svg.ts': 'places',
  'src/art/**, src/stress/**, stress.html, tools/art/**, flows/art-stress.sh': 'art-app (code and tests, R61)',
  'art-src/**, public/art/** (manifest.json only through `pipeline manifest`)': 'art-gen (data, R61)',
  'src/audio/**, tools/audio/**, tools/pull-unknown-names.ts, tools/names-lib.ts, tools/vite-shared-audio.ts, content/lines/{common,start,moving-day}.json, public/audio/{core,numbers,places,names-new,area-*}/**': 'audio',
  'public/audio/{words-*,names-t1,phrases-*}/lines.json': 'learning (lines.json only; audio generates the mp3 and manifest)',
  'scripts/generate-audio.py, scripts/generate-phonics.py, shared/audio.js, shared/audio.d.ts, shared/review.html': 'audio',
  'src/game.svelte.ts, src/game/**, src/core/actions.ts, src/scenes/Welcome.svelte, src/scenes/MovingDay.svelte, src/scenes/Rest.svelte, flows/integration/**, flows/gate-*.txt, tools/gate.sh, tools/promote.sh, tools/go-live.sh': 'integration',
  'README.md section "Play tonight", ideas/opus-5-5-unicorn-egg-nest-v2/index.html (the v3 moon link only)': 'integration (Task I-3G, R47)',
  '.worktrees/** (lane worktrees, gitignored)': 'integrator creates and removes them (R42)',
} as const;

/** Ports. 8765 is Emma's live server and is never used by an agent test. */
export const PORTS = {
  emma: 8765,          // MOON_DIST=dist-emma node games/moon-meadow-home/server/serve.ts (Tjitse's Mac, home network, R47)
  integration: 8766,   // flows/run.sh default
  platform: 8771, heartbeat: 8772, places: 8773, art: 8774, audio: 8775, learning: 8776,
  coreSync: 8799,      // two-context sync flows and server tests
} as const;

/** URL of the app under test: http://127.0.0.1:<port>/games/moon-meadow-home/  (Vite base is './'). */
export function testUrl(port: number): string {
  return `http://127.0.0.1:${port}/games/moon-meadow-home/`;
}

/* =====================================================================================
 * 1. Shared value types and the random generator
 *    owner: platform writes src/core/rng.ts in the skeleton task; learning's
 *    src/core/planner/rng.ts and art's heap.ts re-export it.
 * ===================================================================================== */

export type Strand = 'r' | 's' | 'm';
export type LearnStrand = Strand | 'name';
export type Result = 'first' | 'miss' | 'helped';
export type ErrorTag = 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
export type StepId = string;   // 'R01', 'R04D', 'S10', 'M09'
export type ItemId = string;   // see section 12
export type GpcId = string;    // 'ai', 'ow.oa', 'a-e', 'y.ee'
export type Phoneme = string;  // one of PHONEMES (learning, src/core/content/gpc.ts)
export type Release = '1.0' | '1.0.1' | '1.1' | '1.2' | '1.3' | 'later';

/** Breed ids (art). Egg kinds (learning) bring the breed in BREED_OF (heartbeat). */
export type BreedId = 'moon' | 'nestling' | 'pebble' | 'cosy' | 'berry' | 'snow' | 'bubble' | 'post' | 'sparkle';
export type EggKind = 'moon' | 'small-nest' | 'two-stone' | 'blanket' | 'berry' | 'snow';
export const BREED_OF: Record<EggKind, BreedId> = {
  moon: 'moon', 'small-nest': 'nestling', 'two-stone': 'pebble', blanket: 'cosy', berry: 'berry', snow: 'snow',
};
export type Stage = 'baby' | 'foal';
export type Colours = { body: string; mane: string; mane2: string };   // '#rrggbb'
export type Traits = { shiny: boolean; speckled: boolean; golden: boolean; founder: boolean };
export type OutfitSlot = 'head' | 'neck' | 'back' | 'mane' | 'flank';

export type Rng = () => number; // [0, 1)
/** mulberry32, as v2. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const makeRng = mulberry32;
export function pick<T>(xs: readonly T[], rng: Rng): T {
  if (xs.length === 0) throw new Error('pick from an empty list');
  return xs[Math.floor(rng() * xs.length)];
}
export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* =====================================================================================
 * 2. Events
 *    owner: core, src/core/events.ts (validation with field checks; extra fields are refused).
 *    Every stream builds drafts of exactly these shapes. A stream that needs a new type asks
 *    the integrator, who adds it to events.ts (core contract K11).
 * ===================================================================================== */

export const SCHEMA_VERSION = 1;

export type NameRoute = 'bell' | 'garden' | 'gold' | 'import';
export type NameOutcome = 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen';
export type EggLook = 'plain' | 'speckled' | 'golden' | 'building';
/** One item of a checked moment. The field is `r`, not `result` (learning reads it). */
export type ItemResult = { id: ItemId; r: Result };
export type Scalar = string | number | boolean | null;
export type CareStation =
  | 'hay' | 'brush' | 'hat' | 'nap' | 'swing' | 'bath'            // care stations and the Bath Pond
  | 'cuddle' | 'treat' | 'trick' | 'splash' | 'rollcall';          // free care and roll call
export type Slot = 'current' | 'school' | 'side' | 'review' | 'mixed' | 'probe' | 'warmup' | 'golden' | 'name';
export type MomentKind =
  | 'wish' | 'bath-wish' | 'twin-wish' | 'one-or-many' | 'tricky-act' | 'basket-and' | 'basket-adj'
  | 'salon-card' | 'asking-bubble' | 'two-state-wish'
  | 'first-sound' | 'naming-bells' | 'naming-garden' | 'label' | 'label-plural' | 'sign' | 'note' | 'letter-order'
  | 'egg-moon' | 'egg-small-nest' | 'egg-two-stone' | 'egg-blanket' | 'egg-berry' | 'egg-snow'
  | 'door-visit' | 'roll-call-door' | 'trim' | 'beads' | 'post-pin' | 'post-sash' | 'parcel' | 'wall'
  | 'hay-rack'          // docs/v3/next/plan.md N21: the stable's maths moment (release 1.0.1)
  | 'roll-call' | 'envelope'
  | 'station-wish';   // R34: a care-station wish; review or mixed picks only, never in a pass window

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

export type Payloads = {
  // ---- first playable (Wave A)
  'visit.start': { visit: string; tz: number };   // tz = -new Date().getTimezoneOffset()
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
  'placement.done': { strand: Strand; current: StepId; placed: StepId[]; side: StepId[] };
  'egg.hatched': {
    baby: string; egg: EggLook; kind: EggKind | 'building'; breed: BreedId; colours: Colours; traits: Traits;
    source: 'nest' | 'building' | 'row';
  };
  /** listName: the name-bank name whose clip says this name ('Lily' for a baby called Lili); null when no list name matches. */
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
  // ---- release 1.1 (Wave B, core task B1)
  'post.opened': { visit: string; post: string };
  /** note: the phrase id of the note (learning content/phrases/notes.json). */
  'note.sent': { visit: string; note: string; words: string[]; mark: '.' | '?' | '!'; gift: string | null };
  'novelty.given': { item: string };
  // ---- release 1.2 (Wave C, core task C1)
  'photo.taken': { visit: string; place: string; photo: string; babies: string[]; cousin: string | null };
  'ribbon.set': { baby: string; on: boolean };
};

/** Setting keys used across streams. Values not set read as the default. */
export type SettingKey =
  | 'skip-wish-after-three'   // boolean, default false (heartbeat reads, parent corner writes)
  | 'parent-pin'              // string, default '2468'
  | 'birthday'                // string 'MM-DD' or null
  | 'muted'                   // boolean, default false
  | string;

export type EventType = keyof Payloads;
export type EventBase = { id: string; hlc: string; t: number; dev: string; v: number };
export type DraftOf<K extends EventType> = { type: K } & Payloads[K];
export type EventOf<K extends EventType> = EventBase & DraftOf<K>;
export type GameEventDraft = { [K in EventType]: DraftOf<K> }[EventType];
export type GameEvent = { [K in EventType]: EventOf<K> }[EventType];

/** Recorded facts: earliest in fold order wins, never revoked. Value: the natural key of a draft. */
export const FACT_KEYS: Partial<Record<EventType, (d: never) => string | null>> = {
  'step.passed': (d: DraftOf<'step.passed'>) => `${d.strand}:${d.step}`,
  'placement.done': (d: DraftOf<'placement.done'>) => d.strand,
  'jewel.placed': (d: DraftOf<'jewel.placed'>) => d.jewel,
  'building.done': (d: DraftOf<'building.done'>) => d.plot,
  'opening.announced': (d: DraftOf<'opening.announced'>) => d.opening,
  'title.given': (d: DraftOf<'title.given'>) => d.title,
  'baby.named': (d: DraftOf<'baby.named'>) => d.baby,
  'import.v2': (d: DraftOf<'import.v2'>) => d.hash,
  'pin.given': (d: DraftOf<'pin.given'>) => d.key,          // null key: not a fact
  'post.opened': (d: DraftOf<'post.opened'>) => d.post,
  'novelty.given': (d: DraftOf<'novelty.given'>) => d.item,
};

/** Export file (core src/core/save/export.ts). */
export type ExportFile = { format: 'moon-meadow-save'; v: 1; exportedAt: number; events: GameEvent[] };

/* =====================================================================================
 * 3. Folded state and the world view
 *    owner: core (slices engine, core slices), learning (learner slice), places (places slice),
 *    integration (World view in src/game/world-view.ts).
 * ===================================================================================== */

export type FoldCtx = { get<T>(slice: string): T };
export interface Slice<N extends string, S> {
  name: N;
  version: number | string;
  init(): S;
  apply(state: S, ev: GameEvent, ctx: FoldCtx): S;
}

/** Core's herd baby (src/core/world/herd.ts), with `listName` added for baby.named. */
export type PinRef = { pin: string; kind: 'star' | 'set' | 'moment' | 'sticker'; set: string | null; at: number };
export type HerdBaby = {
  id: string; name: string | null; gems: string[]; route: NameRoute | null; listName: string | null;
  ordinal: number; colours: Colours; traits: Traits; breed: BreedId; kind: string; egg: EggLook | 'v2';
  source: 'nest' | 'building' | 'row' | 'v2'; hatchedAt: number; v2Night: number | null; v2Hearts: number;
  hearts: number; sash: PinRef[]; pouch: PinRef[]; stickers: string[];
  outfit: Partial<Record<OutfitSlot, string | null>>; favourite: boolean; comeAlong: boolean; clipHeard: boolean;
};
export type HerdState = {
  babies: Record<string, HerdBaby>; order: string[]; rowsGranted: number; rowsBuilt: number; nameCounts: Record<string, number>;
};
/** The folded state the store holds: core slices plus the learner and places slices. Opaque here except herd. */
export type GameState = {
  facts: unknown; visits: { list: { visit: string; dev: string; start: number; tz: number; end: number | null }[] };
  herd: HerdState; names: unknown; cosmetics: { rowNames: Record<string, string>; skyNames: Record<string, string> };
  settings: Record<string, Scalar>; diag: { audioMissing: string[] };
  learner: Learner;
  places: PlacesState;
};

/** The one view scenes read (integration builds it after every fold). Union of what heartbeat and places need. */
export type WorldBaby = {
  id: string;
  order: number;                 // 1-based hatch order = baby number = stall number
  hatchIndex: number;            // same as order (places name)
  name: string | null;           // display spelling
  gems: string[];
  ordinal: number;               // 1, or 2 for "Tim the Second"; 0 while unnamed
  listName: string | null;       // name whose clip says this name
  clipKey: string | null;        // slugName(listName) when that clip is loaded, else null
  hasClip: boolean;              // clipKey !== null
  unknownName: boolean;          // named, and listName === null
  clipHeard: boolean;
  firstSound: Phoneme | null;    // first phoneme of the name (name bank, else first gem)
  breed: BreedId; stage: Stage; colours: Colours; traits: Traits;
  hearts: number; hatchedAt: number; source: HerdBaby['source'];
  sash: PinRef[]; pouch: PinRef[]; stickers: string[];
  outfit: Partial<Record<OutfitSlot, string | null>>; favourite: boolean; comeAlong: boolean;
  door: number | null;           // null while in the Moonbeam Camp
};
export type World = {
  herd: WorldBaby[];             // hatch order
  byId: Record<string, WorldBaby>;
  rowsBuilt: number;             // rowCount(state.herd); row 1 counts from the start
  doors: number;                 // rowsBuilt * 10
  camp: string[];                // baby ids without a door
  rowNames: (string | null)[];   // index 0 is row 1
  skyNames: (string | null)[];   // index 0 is sky unicorn 1
  sky: { index: number; name: string }[];
  flowers: number;               // egg.hatched count
  visit: string | null;          // current visit id
  visitIndex: number;            // 1 for the first visit
  announced: ReadonlySet<string>;
  bathPond: boolean;             // building.done 'bath-pond'
  settings: { skipWishAfterThree: boolean; parentPin: string; birthday: string | null };
  places: PlacesState;
};

/* =====================================================================================
 * 4. Content shapes
 *    owner: learning (content types in src/core/content/types.ts). Subset that others read.
 * ===================================================================================== */

export type RawGpc = { id: GpcId; text: string; phonemes: Phoneme[]; vowel: boolean; sound: string | null; fluency: boolean; split?: boolean };
export type WordKind = 'thing' | 'station' | 'adjective' | 'other';
/** Word tags used across streams: bath (Bath Pond), found (toy shelf), toy, food, clothes, care, salon. */
export type WordTag = 'bath' | 'found' | 'toy' | 'food' | 'clothes' | 'care' | 'salon';
export type RawWord = {
  w: string; gpcs: GpcId[];
  pic: string | null;            // the bare word ('hat'), or null when never pictured. See section 9.
  kind: WordKind; prompt?: string; tags?: WordTag[]; syllables?: number; compound?: boolean;
  affix?: 'ing' | 'ed' | 'est' | 'er' | 'un';
  plural?: { w: string; ending: 's' | 'es' }; irregular?: { w: string };
  /** R36: indexes into `gpcs` of the heart-part graphemes of a tricky word ('the': [1], 'said': [1]). Shown with a heart glow, never sounded out. */
  heart?: number[];
};
export type RawName = {
  name: string; gpcs: GpcId[]; source: 'uk' | 'cyprus' | 'fantasy' | 'nature' | 'decodable' | 'v2';
  priority: 1 | 2 | 3; pic?: 'flowers' | 'gems' | 'sky' | 'sweets'; respell?: string;
};
export type PhraseAct =
  | { kind: 'give'; target: string[]; options: string[] }
  | { kind: 'choose-speaker'; speakers: { text: string; mark: 'stop' | 'q' | 'bang' }[]; answer: number }
  | { kind: 'toggle'; thing: string; to: 'on' | 'off' }
  | { kind: 'push-pull'; to: 'push' | 'pull' }
  | { kind: 'his-her'; to: 'he' | 'she'; thing: string }
  | { kind: 'gate'; to: 'go' | 'no' }
  | { kind: 'put'; thing: string; where: 'on' | 'in' }
  | { kind: 'note'; cards: string[]; mark: 'stop' | 'q' | 'bang'; spell: number; answer: string | null }
  | { kind: 'beads'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB'; colours: string[] };
/** Phrases are the one source for notes, Salon card lines, asking bubbles, two-state wishes and tricky acts. */
export type RawPhrase = { id: string; moment: MomentKind; text: string; items: ItemId[]; words: string[]; act: PhraseAct; clip: boolean };
export type PhrasePackName = 'phrases-notes' | 'phrases-salon' | 'phrases-meadow';

/** Hand-written line files (audio format). One file per owner. Ids unique across all files. */
export type LineFile = {
  scene: AudioSceneId;           // preload unit: 'common' | 'start' | 'moving-day' | 'heartbeat' | 'places' | ...
  pack?: string;                 // default 'core'; places.json uses 'places'
  lines: { id: string; speaker: 'narrator' | 'queen' | 'foal'; text: string; also?: string[]; note?: string; seed?: number; expect?: string[] }[];
};
export type AudioSceneId = string;

/** The release this build loads: content/release.json (learning) is the only release file. */
export type ReleaseFile = { release: Release };

/** The built Content (learning). Subset. */
export type Content = {
  release: Release;
  gpcs: Record<GpcId, RawGpc>;
  steps: Record<StepId, { id: StepId; strand: Strand; index: number; loaded: boolean; top: 1 | 2 | 3; levels: 1 | 2 | 3; moments: MomentKind[]; school?: boolean; contrast?: boolean; display?: boolean; face: string[] }>;
  order: Record<Strand, StepId[]>;
  loaded: Record<Strand, StepId[]>;
  items: Record<ItemId, { id: ItemId; strand: Strand; step: StepId; kind: string; gpc?: GpcId; ending?: 's' | 'es' | 'none'; word?: string; carriers: number | null }>;
  words: Record<string, RawWord & { clip: string; pluralClip: string | null; rItems: ItemId[]; sItems: ItemId[]; rStep: StepId | null; sStep: StepId | null }>;
  names: (RawName & { slug: string; phonemes: Phoneme[]; first: Phoneme })[];
  phrases: Record<string, RawPhrase & { pack: PhrasePackName; clipId: string | null; loaded: boolean }>;
};

/* =====================================================================================
 * 5. Learning engine API (owner: learning, src/core/learning/index.ts)
 * ===================================================================================== */

export type Learner = { v: 1; profile: string; lastT: number; [k: string]: unknown };   // full shape in learning Task A11
export type StepStatus = 'passed' | 'placed' | 'display' | 'waiting' | 'side' | 'school' | 'current' | 'ahead';
export type SpellingKnowledge = { own: GpcId[]; current: StepId | null; currentIndex: number; pairs: string[]; finalVoicedOk: boolean; capitals: boolean; level: 1 | 2 | 3 };
export type ReadingKnowledge = { gpcs: GpcId[]; items: ItemId[]; pairs: string[]; current: StepId | null; level: 1 | 2 | 3 };
export type LearnFact = DraftOf<'step.passed'> | DraftOf<'placement.done'> | DraftOf<'learn.override'>;
export type Jewel = { step: StepId; strand: Strand; face: string[]; fresh: boolean; t: number };

export declare const LEARNER_FOLD_VERSION: number;
export declare function createLearnerSlice(c: Content): Slice<'learner', Learner>;
export declare function foldLearner(events: readonly GameEvent[], c: Content, profile?: string): Learner;
export declare function pendingLearnFacts(l: Learner, c: Content): LearnFact[];
export declare function currentStep(l: Learner, c: Content, strand: Strand): StepId | null;
export declare function stepStatus(l: Learner, c: Content, step: StepId): StepStatus;
export declare function isPlacing(l: Learner, strand: Strand): boolean;
export declare function spellingKnowledge(l: Learner, c: Content): SpellingKnowledge;
export declare function readingKnowledge(l: Learner, c: Content): ReadingKnowledge;
export declare function pairsAllowed(l: Learner, c: Content, strand: Strand): string[];
export declare function setCurrentOverride(l: Learner, c: Content, strand: Strand, step: StepId): Extract<LearnOverridePayload, { op: 'set-current' }>;
export declare function tagError(/* see learning Task A16 */ ...args: unknown[]): ErrorTag | null;
export declare function jewels(l: Learner, c: Content): Jewel[];                                        // Wave B
export declare function criteria(events: readonly GameEvent[], c: Content): Record<string, unknown>;    // Wave C (C2, L1 to L5)
/** Blocklist (learning src/core/content/blocklist.ts) over shared/blocklist.json { version: 1, entries: { w, lang, level }[] }. */
export type BlockLevel = 'strong' | 'rude' | 'toilet' | 'slur';
export declare function checkBlocked(phonemes: readonly Phoneme[], list: unknown): { level: BlockLevel; part: boolean } | null;
export declare function findSamePhonemes(phonemes: readonly Phoneme[], c: Content): string | null;
/** GPC helpers (learning src/core/content/gpc.ts). Core's v2 import uses them as V2ImportDeps. */
export declare function splitUsual(word: string, table: Record<GpcId, RawGpc>): GpcId[] | null;
export declare function phonemesOf(gpcs: readonly GpcId[], table: Record<GpcId, RawGpc>): Phoneme[];
/** App content loader (learning src/core/content/static.ts). CONTENT_HASH feeds the snapshot key. */
export declare const content: Content;
export declare const CONTENT_HASH: string;

/* =====================================================================================
 * 6. Planner API (owner: learning, src/core/planner/index.ts)
 * ===================================================================================== */

export type AssetIndex = { clip(id: string): boolean; picture(id: string): boolean };
export type PlanContext = {
  c: Content; l: Learner; now: number; assets: AssetIndex;
  /** R59: test builds only (the setScaffold hook). The planner uses it instead of the learned level. */
  testScaffold?: Partial<Record<StepId, 1 | 2 | 3>>;
};
export type ItemRequest = {
  strand: Strand; moments: MomentKind[]; place: string; firstWish?: boolean; tags?: WordTag[];
  doors?: { built: number; own: number | null }; avoid?: string[]; accept?: (p: Pick) => boolean;
};
export type MathsTask =
  | { op: 'subitise'; n: number } | { op: 'numeral'; n: number } | { op: 'compare'; want: 'fewest' | 'most' }
  | { op: 'more'; n: number } | { op: 'less'; n: number } | { op: 'missing'; whole: number; part: number }
  | { op: 'pair'; a: number; b: number }   // a + b is the total (2 to 18), a <= b
  | { op: 'add'; a: number; b: number } | { op: 'take'; a: number; b: number }
  | { op: 'pattern'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB' };
export type Carrier =
  | { kind: 'word'; word: string }
  | { kind: 'plural'; word: string; form: 'one' | 'many'; count: number }
  | { kind: 'twin'; pair: string; words: [string, string] }
  | { kind: 'spell'; focus: GpcId[] }
  | { kind: 'first-sound'; gpc: GpcId }
  | { kind: 'maths'; task: MathsTask }
  | { kind: 'door'; n: number }
  | { kind: 'phrase'; phrase: string }
  | { kind: 'letters'; letters: string[] }
  | { kind: 'name'; babyId: string; name: string };
export type Pick = {
  strand: LearnStrand; step: StepId | null; slot: Slot; moment: MomentKind;
  items: ItemId[]; carrier: Carrier; scaffold: 1 | 2 | 3; probe: boolean; pair?: string;
  /** R36: display-only tricky words printed with the carrier ('the' before a wish word). Never items, never logged. */
  display?: string[];
};
export type Outcome = { result: Result; ms: number | null; place: string; error?: ErrorTag | null; slots?: ItemResult[] };
export type EggOffer = { kind: EggKind; pick: Pick | null };   // pick null: a free egg, hatches unchecked
export type NameCandidate = { babyId: string; name: string; gpcs: GpcId[] };
export type VisitStats = { r: number; s: number; m: number; name: number; ladder: number; spell: number; total: number };

export declare function nextItem(ctx: PlanContext, req: ItemRequest, rng: Rng): Pick | null;
export declare function nextEgg(ctx: PlanContext, rng: Rng): EggOffer;
export declare function goldenEgg(ctx: PlanContext, rng: Rng): EggOffer | null;               // Wave B
export declare function nextNameReviews(ctx: PlanContext, herd: NameCandidate[], n: number, moment: 'roll-call' | 'envelope', rng: Rng): Pick[];
export declare function visitStats(l: Learner): VisitStats;
export declare function isTired(l: Learner, c: Content): boolean;
export declare function spellingShareLow(l: Learner, c: Content): boolean;
export declare function wantsLabelBubble(l: Learner, c: Content): boolean;
export declare function leastPractisedStrand(l: Learner): Strand;
export declare function visitRange(l: Learner, c: Content): [number, number] | null;
export declare function shouldVisitDoor(l: Learner, c: Content, herdCount: number): boolean;
export declare function carrierKey(c: Carrier): string;
/** The only builder of learn.result payloads. The actions router adds visit, baby and heart. */
export declare function learnResultPayload(pick: Pick, o: Outcome): Omit<Payloads['learn.result'], 'visit' | 'baby' | 'heart'> & { type: 'learn.result' };

/* =====================================================================================
 * 7. Scenes, the store and actions
 *    owners: platform (router, registry, boot, input), integration (store, actions router),
 *    heartbeat (heartbeat runtime), places (places runtime).
 * ===================================================================================== */

export type SceneEntry = { id: string; params: Record<string, unknown> };
/** A scene is a Svelte 5 component with props { params: Record<string, unknown> }. */
export type SceneProps = { params: Record<string, unknown> };
export declare const router: {
  go(id: string, params?: Record<string, unknown>): Promise<void>;
  replace(id: string, params?: Record<string, unknown>): Promise<void>;
  reset(id: string, params?: Record<string, unknown>): Promise<void>;
  back(): Promise<boolean>;
  onChange(fn: (from: SceneEntry | null, to: SceneEntry) => void): () => void;
  readonly current: SceneEntry | null;
};
/** Registration (platform src/platform/registry.ts): registerScenes, or a src/<folder>/scenes.ts map, or src/scenes/<Pascal>.svelte. */
export declare function registerScenes(map: Record<string, unknown>): void;
export type StartTarget = { id: string; params?: Record<string, unknown> };
export declare function setStartHandler(fn: () => StartTarget | Promise<StartTarget>): void;

/** Scene ids. Top-level files in src/scenes/ get kebab ids; places registers its map in src/places/scenes.ts. */
export const SCENE_IDS = [
  'welcome', 'moving-day',                                              // integration
  'nest', 'hatch', 'naming', 'wish', 'stalls', 'goodnight', 'egg-choice', // heartbeat
  'meadow', 'toy-shelf', 'label', 'bath-pond', 'building-day', 'dressing-corner', 'post-box', 'home-book',
  'salon', 'valley', 'letter-lane', 'hundred-party',                    // places
  'parent',                                                             // places (src/parent/ParentCorner.svelte)
  'rest',                                                               // integration: end of every visit, the moon starts the next (R45)
  'platform-demo',                                                      // platform, test builds only
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** Input actions (platform src/platform/input.ts). Heartbeat and places use these, never their own drag code. */
export type PressOpts = ((e: PointerEvent) => void) | { onPress: (e: PointerEvent) => void; disabled?: boolean };
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type DragOpts<T> = {
  data: T; onDrop: (info: { targetId: string | null; data: T; point: Point | null }) => void;
  onTap?: () => void; onStart?: () => void; onMove?: (p: Point) => void; threshold?: number; snap?: number; disabled?: boolean;
};
export type DropTargetOpts = { id: string; accepts?: (data: unknown) => boolean };
export declare function clientToStage(clientX: number, clientY: number): Point;
export declare function elementRect(el: Element): Rect;
export declare function setBands(top: string, bottom?: string): void;

/** Actions: scenes call game.dispatch(action). Prefix decides the translator. */
export type Action =
  | { type: `hb.${string}`; [k: string]: unknown }      // heartbeat: applyHeartbeat (src/core/actions/heartbeat.ts)
  | { type: `naming.${string}`; [k: string]: unknown }  // heartbeat: applyNaming (src/core/actions/naming.ts)
  | { type: `place/${string}`; [k: string]: unknown }   // places: applyPlaceAction (src/core/places/actions.ts)
  | { type: `game/${string}`; [k: string]: unknown };   // integration: visit, settings, overrides, exclude, audio missing
/** Context the actions router gives every translator. Translators are pure and return drafts. */
export type ActionCtx = {
  visit: string; now: number; state: GameState; world: World; content: Content;
  heartedThisVisit(baby: string): boolean;   // care hearts: at most one per baby per visit
};

/** The store (integration, src/game.svelte.ts). The one object scenes talk to. */
export declare const game: {
  readonly state: GameState;
  readonly world: World;
  readonly learner: Learner;
  readonly content: Content;
  readonly version: number;              // bumps on every fold (reactive)
  readonly refoldedAt: number;           // changes on every refold after a sync or import
  readonly scene: string;
  readonly params: Record<string, unknown>;
  dispatch(action: Action): GameEvent[];
  go(scene: string, params?: Record<string, unknown>): Promise<void>;
  planContext(): PlanContext;
  rng: Rng;                              // seeded in test builds (__game.seed)
  readonly visitOpen: boolean;           // false after visit.end until the rest scene's moon starts the next visit
  ready(): Promise<void>;                // R44: the store opens at module load; await before dispatch
  now(): number;                         // platform clock
  endVisit(reason: 'goodnight' | 'idle' | 'hidden'): void;   // writes visit.end, then router.reset('rest') (R45)
  markRefolded(): void;                  // after a sync or import
  readonly data: unknown;                // core GameData (parent corner backup, sync)
};
/** Translators. Each returns drafts without `visit`; the router (integration src/core/actions.ts) fills it. */
export type UnvisitedDraft = { type: EventType; [k: string]: unknown };
export declare function applyHeartbeat(a: Action): UnvisitedDraft[];
export declare function applyNaming(a: Action): UnvisitedDraft[];
export declare function applyPlaceAction(a: Action, ctx: ActionCtx): UnvisitedDraft[];
/** One sample action per action type, for the integration contract test (master plan Task I-1). */
export declare const HEARTBEAT_SAMPLE_ACTIONS: Action[];
export declare const NAMING_SAMPLE_ACTIONS: Action[];
export declare const PLACE_SAMPLE_ACTIONS: Action[];

/** Heartbeat runtime (heartbeat src/scenes/heartbeat/flow.svelte.ts). */
export declare const heartbeat: {
  start(): Promise<void>;
  startWish(babyId: string): Promise<void>;
  startGoodnight(): Promise<void>;
  nameBaby(babyId: string, onDone: () => void): Promise<void>;
  tapBaby(babyId: string): Promise<boolean>;
  noteOtherActivity(): void;
  left(): void;
};
export declare const heartbeatHooks: { onMovedIn: ((babyId: string) => void)[] };
/** Heartbeat exports places uses. */
export declare function currentEggBreed(state: GameState, l: Learner, c: Content): BreedId;
export declare function ownSlots(graphemes: readonly GpcId[], l: Learner, c: Content): boolean[];
export declare function planTray(graphemes: readonly GpcId[], step: StepId, scaffold: 1 | 2 | 3, rng: Rng): GpcId[];
export declare function canReviewName(baby: WorldBaby, l: Learner, c: Content): boolean;
export type BreedInfo = { id: BreedId; egg: EggKind | null; building: string | null };
export declare const BREEDS: readonly BreedInfo[];   // heartbeat src/core/heartbeat/hatch.ts

/** Places exports others use. */
export type PlacesState = { [k: string]: unknown };   // full shape in places Task A1
export declare function createPlacesSlice(): Slice<'places', PlacesState>;
export declare function titlesToGive(state: GameState, world: World): DraftOf<'title.given'>[];
export declare function momentPinsDue(state: GameState, world: World): DraftOf<'pin.given'>[];
export declare function openingDue(state: GameState, world: World): string | null;
export declare function isAnnounced(world: World, opening: string): boolean;
/** Moment controller (places src/ui/moment.ts). Heartbeat's hint runner wraps it. */
export type Moment = {
  start(): Promise<void>; touch(): void; miss(): void; answer(chosenTouchAt?: number): { result: Result; ms: number };
  replay(): Promise<void>; dispose(): void; hookAnswer(): void; hookWrong(kind?: string): void; hookIdle(): void;
  /** aria-label of the right answer, so a flow can tap it for real. */
  target(): string | null;
};
export declare function activeMoment(): Moment | null;

/* =====================================================================================
 * 8. Audio API (owner: audio, src/audio/index.ts). Scenes never touch window.EmmaAudio.
 * ===================================================================================== */

export type NameMark = '!' | '?';
export type SfxName = 'pop' | 'chime' | 'sparkle' | 'whoosh' | 'soft-no' | 'fanfare' | 'splash' | 'munch' | 'tick' | 'magic' | 'hatch';
export type HoldHandle = { stop(): void; done: Promise<void> };
/** R52: static clip ids are the generated union (audio src/audio/clip-ids.generated.ts); dynamic ones carry a known prefix. */
export type ClipId = string;   // narrowed to the generated union in the app
export type DynamicClipId = `word-${string}` | `name-${string}` | `num-${string}` | `phrase-${string}` | `ord-${string}` | `sound-${string}`;
export type SpeakId = ClipId | DynamicClipId;
export interface Audio {
  init(opts: { base: string }): Promise<void>;       // main.ts: base = import.meta.env.BASE_URL + 'audio/'
  unlock(): Promise<void>;                            // Play button pointerdown
  hasClip(id: string): boolean;                       // synchronous after init; false for ok:false clips
  has(id: string): boolean;                           // alias of hasClip
  hasName(name: string): boolean;                     // hasClip(nameId(name, '!'))
  nameClip(name: string, mark: NameMark): string | null;   // '?' falls back to '!'
  say(id: SpeakId | null | undefined): Promise<void>;
  speak(...ids: Array<SpeakId | null | undefined>): Promise<void>;   // a missing dynamic id is skipped but recorded in `missing`
  sayAll(ids: ReadonlyArray<SpeakId | null | undefined>): Promise<void>;
  replay(...ids: Array<string | null | undefined>): Promise<void>;
  sayName(name: string, mark: NameMark): Promise<boolean>;            // false and silent when no clip
  listen(id: string | null | undefined): Promise<void>;               // a clip Emma asked for: never cut off
  listenSound(code: string): Promise<void>;                           // a letter sound Emma asked for
  sound(code: string): Promise<void>;                                 // a letter sound the game plays
  hold(code: string): HoldHandle;
  sfx(name: SfxName): Promise<void>;
  act(): void; stop(): void; mute(on: boolean): void; setSliding(on: boolean): void;
  preload(ids: readonly string[]): Promise<string[]>;
  preloadScene(scene: AudioSceneId): Promise<string[]>;
  release(scene: AudioSceneId): void;
  refreshNames(): Promise<void>;
  onMissing(cb: (id: string) => void): () => void;
  onTalk(cb: (id: string | null) => void): () => void;   // Lumi's mouth: id starts with 'lumi-'
  setFast(on: boolean): void;
  readonly said: readonly string[];
  readonly speaking: boolean;
  readonly missing: readonly string[];   // also filled in fast mode (R52)
}
export declare const audio: Audio;

/** Audio packs in load order (audio src/audio/packs.ts). */
export const PACKS = [
  'core', 'numbers', 'words-phase2', 'words-phase3-4', 'words-year1',
  'phrases-meadow', 'phrases-notes', 'phrases-salon', 'places', 'area-stable-yard', 'area-village-lane',
  'names-t1', 'names-new',
] as const;
/** Letter-sound keys added for v3 in shared/audio/phonics/index.json. learning gpcs.json uses them in `sound`. */
export const NEW_SOUND_KEYS = ['oo-short', 'yoo', 'iz'] as const;

/* =====================================================================================
 * 9. Art (owner: art, src/art/manifest.ts and components)
 * ===================================================================================== */

export type ArtPack = 'core' | 'words' | 'meadow' | 'stables' | 'building' | 'bath' | 'post' | 'dressing' | 'home' | 'salon' | 'valley' | 'letters';
export type PictureKind = 'word' | 'item' | 'station' | 'prop' | 'outfit' | 'pin' | 'decor' | 'ui' | 'egg' | 'building';
export interface PictureEntry {
  src: string; w: number; h: number; kind: PictureKind; pack: ArtPack; source: 'codex' | 'svg' | 'derived';
  tint?: { default: string }; slot?: OutfitSlot; attach?: [number, number]; sil?: string;
}
export interface BackgroundEntry { src: string; w: number; h: number; pack: ArtPack; dominant: string; source: 'codex' | 'svg' }
export interface ArtManifest {
  v: 1; built: string; rigMode: 'sprite' | 'layers';
  pictures: Record<string, PictureEntry>; backgrounds: Record<string, BackgroundEntry>;
  unicorns: Record<string, unknown>; lumi: unknown | null; patterns: { speckle: string } | null;
}
export declare function loadArtManifest(base?: string, file?: string): Promise<ArtManifest>;   // main.ts awaits before Play; never rejects (R49)
export declare function hasPicture(id: string): boolean;   // false while no manifest is loaded
export declare function picture(id: string): PictureEntry | undefined;
export declare function background(id: string): BackgroundEntry | undefined;
export declare function artUrl(src: string): string;    // takes an entry's src, not an id
/** Component props. Unicorn takes the baby's parts, not a baby object. */
export type PictureProps = { id: string; size: number; tint?: string; label?: string; silhouette?: boolean };
export type HeapProps = { id: string; count: number; size: number; seed: number; tint?: string; label?: string };
export type UnicornPose = 'idle' | 'walk' | 'hop' | 'happy' | 'sleep' | 'still' | 'drag';
export type UnicornProps = {
  breed: BreedId; stage: Stage; colours: Colours; traits?: Partial<Traits>; height: number; pose?: UnicornPose;
  facing?: 'left' | 'right'; outfit?: Partial<Record<OutfitSlot, string>>; headOnly?: boolean; seed?: number; label?: string;
  lite?: boolean; // R63: a pre-tinted flat picture, no blend or mask layers. places (A7) decides when.
};
export type EggProps = { kind: BreedId; skin?: 'golden' | 'speckled' | null; cracks?: 0 | 1 | 2 | 3; wobble?: boolean; size: number; label?: string };
export type LumiProps = { size: number; talking?: boolean; label?: string };

/**
 * Picture ids. Word pictures: the bare singular word ('hat'), variants '<word>-<variant>' ('hat-pink',
 * 'blanket-fluffy'). Everything else has a kind prefix from the art lists: item-, station-, prop-, outfit-,
 * pin-, decor-, ui-, egg-, building-, bg- (backgrounds), lumi-. art-src/lists/*.txt is the id source.
 * A scene that needs an id not in the lists draws its SVG fallback and adds a line to
 * art-src/lists/requests.txt ('id | step-or-kind | description').
 */
export const SCENE_ART_IDS = {
  nest: 'item-nest', moonCup: 'item-moon-cup', blanket: 'item-blanket-cover', nameBell: 'item-name-bell',
  goldBell: 'item-gold-bell', nameTree: 'item-name-tree', nameTag: 'item-name-tag', basket: 'item-wish-basket',
  stationHay: 'station-hay-rack', stationBrush: 'station-brush-stand', stationHat: 'station-hat-box',
  stationNap: 'station-nap-cushion', stationSwing: 'station-swing', stationBath: 'building-bath-pond',
  door: 'item-stall-door', doorOpen: 'item-stall-door-open', tent: 'item-camp-tent', tentOpen: 'item-camp-tent-open',
  lantern: 'item-lantern', lanternLit: 'item-lantern-lit', plaque: 'item-plaque', moonflower: 'decor-moonflower',
  shelf: 'item-toy-shelf', jar: 'item-jar', jarLabel: 'item-jar-label', miceJar: 'item-mice-jar', crown: 'item-crown-emma',
  bgMeadow: 'bg-meadow', bgNest: 'bg-nest', bgStables: 'bg-stable-yard', bgSky: 'bg-sky', bgBuilding: 'bg-building-yard',
  bgPond: 'bg-bath-pond', bgPost: 'bg-post-box', bgDressing: 'bg-dressing-corner', bgSalon: 'bg-salon',
  bgValley: 'bg-valley-map', bgLetters: 'bg-letter-lane',
  careBrush: 'item-brush', careTreat: 'item-treat', careHeart: 'item-heart', moon: 'item-moon',   // heartbeat 23B, rest scene
} as const;
export function eggArtId(kind: EggKind, skin: 'golden' | 'speckled' | null): string {
  return skin ? `egg-${skin}` : `egg-${BREED_OF[kind]}`;
}

/* =====================================================================================
 * 10. Test hook (owner: platform, src/test-hook.ts and src/platform/hooks.ts).
 *     window.__game exists in non-production builds (vite build --mode test).
 * ===================================================================================== */

export type HookState = {
  scene: string; params: Record<string, unknown>; speed: number; muted: boolean; now: number; secure: boolean;
  ghost: boolean; moonbeam: Rect | null; missingClips: string[];
  herd: number;                       // integration: world.herd.length
  lastLog: Payloads['learn.result'] | null;   // integration: latest learn.result
  [key: string]: unknown;             // registerState extras
};
export interface TestHook {
  state(): HookState;
  play(): Promise<void>;                                   // taps Play
  jump(scene: string, params?: Record<string, unknown>): Promise<void>;
  fast(on: boolean): void;                                 // timing speed 0 and audio.setFast(on)
  mute(on: boolean): void;
  setNow(ms: number | null): void;                         // survives a reload in the same tab
  seed(n: number): Promise<unknown>;                       // game.rng becomes mulberry32(n)
  setStep(strand: Strand, step: StepId): Promise<unknown>; // a learn.override set-current
  setScaffold(strand: Strand, step: StepId, level: 1 | 2 | 3): Promise<unknown>;
  pass(strand: Strand, step: StepId): Promise<unknown>;    // a real step.passed
  answer(): Promise<unknown>;                              // scene hook first, else activeMoment()
  wrong(kind?: string): Promise<unknown>;                  // kind: 'one-for-many', 'many-for-one', 'count-low', 'count-high', 'ending', 'bare-word'
  idle(): Promise<unknown>;
  target(): Promise<string | null>;                        // aria-label of the right answer, for real taps
  pairForTest(code: string): Promise<unknown>;             // Wave C, registered by integration I-6
  importFixture(name: string): Promise<unknown>;           // tests/fixtures/<name>.json, e.g. 'v2-save'
  herd(n: number): Promise<unknown>;                       // hatches and names n babies through real events
  newVisit(): Promise<unknown>;                            // visit.end, clock +6 h, visit.start
  announce(opening: string): Promise<unknown>;             // an opening.announced event
  syncNow(): Promise<unknown>;                             // Wave C
  said(): readonly string[];                               // synchronous, reads audio.said (platform A10)
  audioMissing(): readonly string[];                       // synchronous, reads audio.missing; flows assert it is empty
  errors(): string[];                                      // console errors, window errors, CSP violations
  call(name: string, ...args: unknown[]): Promise<unknown>;
  places?: unknown;                                        // registerHookExtension('places', placesHook())
}
export declare function registerHook(name: string, fn: (...args: any[]) => unknown): () => void;
export declare function registerState(key: string, fn: () => unknown): () => void;
export declare function registerHookExtension(key: string, value: object): void;
/** Added to platform hooks.ts for heartbeat: the current scene's answer and wrong. */
export declare function registerSceneHook(scene: string, hook: { answer(): unknown; wrong(): unknown; [k: string]: (...a: any[]) => unknown }): () => void;
export declare function testSeed(): number | null;
export declare function isFast(): boolean;

/* =====================================================================================
 * 11. Server and sync (owner: core). Protocol types in src/sync/protocol.ts are binding.
 *     Base: new URL('api/', document.baseURI). Data: <repo>/.data/moon-meadow (MOON_DATA).
 * ===================================================================================== */

export type PairRequest = { code: string; dev: string; label: string };
export type PairResponse = { token: string; family: string };
export type SyncRequest = { dev: string; after: number; events: unknown[] };
export type SyncResponse = { accepted: number; duplicates: number; rejected: { id: string; reason: string }[]; events: unknown[]; cursor: number; more: boolean };
export type UnknownNamesResponse = {
  family: string;
  names: { spelling: string; gems: string[]; phonemes: string; count: number; firstT: number; lastT: number; fromV2: boolean }[];
};
export type SyncStatus = { state: 'unpaired' | 'idle' | 'syncing' | 'offline' | 'error' | 'unauthorised'; family: string | null; lastSuccess: number | null; lastError: string | null; nextTry: number | null; unsent: number; rejected: number };
export interface SyncClient { pair(code: string): Promise<unknown>; syncNow(): Promise<void>; status(): SyncStatus; start(): void; stop(): void; unpair(): Promise<void>; onChange(fn: () => void): () => void }
/** Server env: PORT (8765), HOST (0.0.0.0 for Emma, 127.0.0.1 for tests), MOON_DIST (dist-emma for Emma, dist-test-<lane> for tests),
 *  MOON_BASE ('/games/moon-meadow-home/'), MOON_DATA, MOON_CSP ('off' to disable), TRUST_PROXY.
 *  names:pull reads MOON_ADMIN_TOKEN, which tools/pull-unknown-names.ts loads with process.loadEnvFile(). */
export const SERVER_ENV = ['PORT', 'HOST', 'MOON_DIST', 'MOON_BASE', 'MOON_DATA', 'MOON_CSP', 'TRUST_PROXY'] as const;

/* =====================================================================================
 * 12. Ids: items, clips and names. The builders below are exact.
 *     owner: platform writes this section verbatim to src/core/keys.ts in the skeleton task (R40). Learning gpc.ts
 *     and ids.ts, heartbeat check.ts and audio ids.ts re-export from it; nobody keeps a copy.
 * ===================================================================================== */

/**
 * Item ids (learning): strand prefix, kind, value. Every id matches KEY_RE (core checks.ts).
 *   reading and spelling graphemes 'r:g:ai', 's:g:a-e'; endings 'r:end:s', 'r:end:es', 'r:end:none', 's:end:es';
 *   pairs 'r:pair:a-e-u'; clusters 'r:cl:-st'; tricky words 'r:t:push', 's:t:said'; marks 's:mark:q';
 *   maths 'm:pair:3-7', 'm:miss:10-7', 'm:num:14'; names 'name:<nameKey>' (keyed by name, not by baby).
 * Places and heartbeat keep their own short names inside their logic ('-es', 'ai', 'mark-?') and map
 * to these ids only in their adapters (places src/places/serve.ts, heartbeat src/scenes/heartbeat/learn-bridge.ts).
 */
export const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/;
export function graphemeItem(strand: 'r' | 's', gpc: GpcId): ItemId {
  return `${strand}:g:${gpc}`;
}
/** Name key: lowercase ASCII letters only ('Zoë' is 'zoe', 'Lily-Rose' is 'lilyrose'). Used for name items and name clip ids. */
export function slugName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}
export const nameKey = slugName;
export function nameItemId(name: string): ItemId {
  return `name:${nameKey(name)}`;
}

/** Kebab slug for words and other clip ids (audio src/audio/ids.ts). */
export function slug(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function wordId(word: string): string {
  return `word-${slug(word)}`;
}
/** "Pip!" is name-pip, "Pip?" is name-pip-q. */
export function nameId(name: string, mark: NameMark): string {
  return mark === '!' ? `name-${slugName(name)}` : `name-${slugName(name)}-q`;
}
/** A phrase clip is named after the phrase id in content/phrases/*.json. */
export function phraseId(phraseIdInContent: string): string {
  return `phrase-${phraseIdInContent}`;
}
export type NumKind = 'n' | 'movein' | 'visit' | 'door-bed' | 'herd' | 'sky' | 'over' | 'cold' | 'warm' | 'nest'
  | 'up' | 'more' | 'count' | 'tap-door' | 'need' | 'sash-has' | 'egg' | 'rack' | 'in';
export function numId(kind: NumKind, n: number): string {
  return kind === 'n' ? `num-${n}` : `num-${kind}-${n}`;
}
export function bondId(a: number, b: number): string {
  return `num-bond-${a}-${b}`;
}
export function ordId(n: number): string {
  return `ord-${n}`;
}
/** Heartbeat's line ids map onto the audio number lines. */
export const HEARTBEAT_NUMBER_IDS = {
  num: (n: number) => numId('n', n), over: (n: number) => numId('over', n), cold: (n: number) => numId('cold', n),
  more: (n: number) => numId('more', n), warm: (n: number) => numId('warm', n), bond: bondId,
  baby: (n: number) => numId('movein', n), visit: (n: number) => numId('visit', n), thatIs: (n: number) => numId('n', n),
  doorBed: (n: number) => numId('door-bed', n), unicorns: (n: number) => numId('herd', n), sky: (n: number) => numId('sky', n),
  ordinal: ordId,
} as const;
/** Ids that only Elizabeth (narrator) may speak. Build tool and generator refuse other speakers. */
export const NARRATOR_ONLY_PREFIXES = ['word-', 'name-', 'num-', 'sound-', 'phrase-', 'ord-', 'model-'] as const;
