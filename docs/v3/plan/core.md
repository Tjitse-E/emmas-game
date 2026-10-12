# Moon Meadow Home: core data implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The save core of v3: events, hybrid clock, folds into world state, snapshot, IndexedDB store, export and import, merge, exclusion, v2 import (direct same-origin read and file import through `move.html`), the home-network server that serves the game, and the save API with pairing and sync.

**Architecture:** Every lasting act is an event in an append-only log. Pure TypeScript in `src/core/` stamps, validates, sorts (hybrid clock, device, sequence), merges (union by id) and folds the log through slices into state. `src/save/` keeps the log, a snapshot and a quarantine in IndexedDB and gives the game store one runtime (`openGameData`). One Node 24 script (`server/serve.ts`, no dependencies) serves the repo and the v3 build on the home network and, from release 1.3, the save API that `src/sync/client.ts` talks to.

**Tech Stack:** TypeScript 6.0.3 (erasable syntax only, so Node 24.19.0 runs the shared files directly), idb 8.0.3, Vitest 5.0.3 with fake-indexeddb 6.2.5, Node standard library on the server, plain HTML for `move.html`, `playwright-cli` WebKit for browser checks.

**Spec:** `docs/v3/spec.md` sections 2.9, 4.4 to 4.8, 5.3, 6.1, 7.1 items 3, 11, 13, 25 and 26. `docs/v3/decisions.md` wins on conflicts. Build decisions from the lead (hosting on the Mac at port 8765, waves A to C) override the spec where they differ.

All code in this plan was written and run before the plan was saved: 115 Vitest tests pass and `tsc --strict --noUnusedLocals` is clean on TypeScript 5.9 with the flags in Contract K1.

## Reconciled with the master plan (binding)

`docs/v3/plan.md` (sections 2 and 3) and `docs/v3/plan/contracts.ts` are binding for this plan. Where a task below still shows another name, shape, port or owner, the master plan and `contracts.ts` win, and the builder changes this plan's code, never another stream's. Decisions are numbered R1 to R33 in master section 2.1.

**Ownership.** Core owns all of `server/` and `src/sync/` (R1), including the static server that replaces `python3 -m http.server`, the save API, pairing, the admin command line and the deploy note. Platform's server tasks are dropped. Core's ids and hashes are the only ones (R2).

**Changed tasks.**
- K1: Vite `base` is `'./'` (R16). The dev proxy and `__BUILD_ID__` are in master section 2.3. The API base is `new URL('api/', document.baseURI).href`.
- K4: the store records `pendingLearnFacts(learner, content)` (learning), not `passReady`.
- K11a is settled by contracts C2 (R17 to R19).
- A3: `Payloads` and `PAYLOAD_CHECKS` follow contracts C2 exactly:
  - `learn.result`: `items: arr(obj({ id: key, r: result }), 20)`, `step: nullable(key)`, `ms: nullable(int(0, 3_600_000))`, plus `moment: key` and `slot: oneOf('current', 'school', 'side', 'review', 'mixed', 'probe', 'warmup', 'golden', 'name')`.
  - `learn.idle.step: nullable(key)`.
  - `learn.override`: one of four shapes, checked by `op`: `profile { profile }`, `set-current { strand, step, placed, side }`, `mark-placed` or `unmark-placed { strand, step }`, `school { strand, step, on }`. Write a custom check that picks the shape from `op`.
  - `egg.hatched.kind`: one of the six egg kinds or `'building'`; `breed`: one of the nine breed ids.
  - `baby.named` adds `listName: nullable(babyName)`.
  - `care.done.station`: one of `hay`, `brush`, `hat`, `nap`, `swing`, `bath`, `cuddle`, `treat`, `trick`, `splash`, `rollcall`.
  - `pin.given` adds `key: nullable(key)`.
  - `jar.labelled` adds `plural: bool`, `picture: key`, `baby: nullable(key)`.
  - `settings.set.key`: any key (contracts `SettingKey` lists the shared ones).
  - Test helpers: `named(baby, name)` adds `listName: name`; `pin(baby, id)` adds `key: null`; `care(baby)` keeps `station: 'brush'`. The sample table in the test gets the new fields.
- A6: `factKey` returns `d.key` for a `pin.given` whose `key` is not null (a moment pin is a recorded fact); `FACT_TYPES` includes `pin.given` with that rule.
- A7: `Baby` adds `listName: string | null` (from `baby.named`), `clipHeard: boolean` (true after `name.clipHeard`) and `comeAlong: boolean` (false until Task C1). Rows stay here; places reads `rowCount` through the world view (R26).
- A11: `GAME_DIR` is `path.resolve(import.meta.dirname, '..', process.env.MOON_DIST ?? 'dist')`. Under the base path, a file not found in the build folder falls back to the game folder for paths that start with `art-src/` or `flows/` (read only, same dot-path and `node_modules` refusals), so the art contact page and `flows/audio-check.html` load from the lane server. Agent tests use `HOST=127.0.0.1` and a lane port, never 8765. Server tests use port 8799 or an ephemeral port.
- A10: `requestPersist` here is the only one; platform's `pwa.ts` reads its result.
- B1: `note.sent` adds `note: key` (the phrase id of the note in learning's `content/phrases/notes.json`).
- C5: `createSync({ port, apiBase: new URL('api/', document.baseURI).href })`; integration Task I-5 wires it into the store.
- C6: `server/DEPLOY.md` is the only deploy note.

**Batches.** A1: A1, A2, A3, A4, A5, A11. A2: A6, A7, A8, A9, A10, A12. B1: B1, B2. C1: C1, C2, C3, C4. C2: C5, C6. Lane port 8799.

## Conventions

- Paths without a leading folder are inside `games/moon-meadow-home/`. Paths that start with `ideas/`, `docs/` or `.gitignore` are from the repo root.
- `npm` and `npx` commands run in `games/moon-meadow-home/`. `git` commands run in the repo root.
- Tests live in `tests/` and import source with relative `.ts` paths.
- Every task ends with its own commit: plain English message, no AI attribution, only the files the task names.
- Files are written with the Write tool. A Bash command that contains the text `.env` is blocked by the repo's hook, even for a fake file in a test folder.

## Global Constraints

- Node 24.19.0 and npm 12. Versions pinned exactly in `package.json`: idb 8.0.3, vitest 5.0.3, fake-indexeddb 6.2.5, @types/node 24.19.2, typescript 6.0.3.
- `src/core/**`, `src/sync/protocol.ts` and `server/**` use only erasable TypeScript (no enums, no namespaces, no parameter properties), `import type` for types and `.ts` import paths, so `node server/serve.ts` runs them with type stripping. They import nothing from npm.
- No `crypto.randomUUID`, `crypto.subtle`, Web Locks or `navigator.share` as a requirement: the Mac serves plain http, an insecure context. Use them only when present.
- No service worker and no `persist()` are needed for the game to work. Use them when available.
- Event ids are `<device id>:<sequence>`. Device ids are 8 characters of `a-z2-7`. Babies get `uuid4()` ids, imported v2 babies `uuid5()` ids.
- Fold order is `hlc`, then device id, then sequence. A fold never creates events.
- Recorded facts (`step.passed`, `placement.done`, `jewel.placed`, `building.done`, `opening.announced`, `title.given`, `baby.named`, `import.v2`, and from Wave B `post.opened`, `novelty.given`): the earliest in fold order wins, never revoked.
- Nothing in a merge deletes a baby, a pin or a name.
- Import merges, never replaces. The same v2 save imported twice, on one or two devices, adds no baby.
- The server listens on port 8765, serves the v3 build under `/games/moon-meadow-home/` (`/unicorns/` on odin) and never serves dotfiles, dot folders or `node_modules`.
- Server limits: pairing codes 6 digits, single use, 15 minutes. 5 failed codes per IP per 15 minutes, then a 15 minute block. 60 API calls per minute per token. Bodies up to 2 MB. Push at most 1,000 events or 1 MB per call. Pull pages of 2,000. Tokens stored as SHA-256 hashes. 30 daily copies.
- Sync: at start, at visit end, after a Building Day, every 2 minutes while online. Backoff 30 s doubling to 30 minutes. A 401 stops sync until pairing again.
- Agents never SSH to odin. The odin part of this plan is files and a deploy note only.
- App text is British English. Code, comments, docs and commit messages are in plain English with no em dashes.

## Review Focus

1. Two Safari tabs on one iPad write with the same device id. Expected: the newest tab wins, the older one stops saving and nothing is overwritten. Tests: Task A9 "stops saving in a tab that another tab overtook", Task A10 tab guard.
2. Plain http on the home network has no `crypto.randomUUID`, `crypto.subtle`, `persist()` or share sheet. Expected: ids, hashes, export and import still work. Tests: Task A1 "works where crypto.randomUUID is missing", Task A10 persist and download tests.
3. Serving the whole repo on the home network could leak the ElevenLabs key file, `.git` or the save data. Expected: 404 for every dot path, encoded or not. Test: Task A11 "never serves dotfiles".
4. Emma's real v2 save may have missing fields, `null` names, odd stickers or a corrupt value. Expected: import never throws and every baby with data comes across. Tests: Task A6 "survives odd saves", Task A10 "v2 local read" with throwing storage.
5. A write fails (quota, private mode) or the iPad sleeps mid-write, and the server can crash mid-append. Expected: events stay in memory and are retried, pagehide flushes, and a broken last log line is cut off on restart. Tests: Task A9 "keeps events in memory while writing fails", Task C2 "cuts off a half-written last line".

## Contracts I need

These are assumptions about other workstreams. The integrator reconciles them before Wave A starts.

**K1. Skeleton (spec 7.1 item 1).**
- `package.json` has `"type": "module"`, scripts `"test": "vitest run"`, `"check"` (svelte-check plus `tsc --noEmit`), `"build": "vite build"`, `"serve": "node server/serve.ts"`, dependency `idb@8.0.3` and dev dependencies `vitest@5.0.3`, `fake-indexeddb@6.2.5`, `@types/node@24.19.2`, `typescript@6.0.3`. If a dependency is missing when a core task starts, the core builder runs `npm install --save-exact <pkg>@<version>` and commits `package.json` and `package-lock.json` alone in a separate commit.
- `tsconfig.json` compiler options include `"strict": true`, `"noEmit": true`, `"allowImportingTsExtensions": true`, `"verbatimModuleSyntax": true`, `"erasableSyntaxOnly": true`, `"moduleResolution": "bundler"`, `"lib": ["ES2023", "DOM"]`, `"types": ["node"]`, and `include` covers `src`, `server` and `tests`.
- `vite.config.ts`: `base: './'` (master plan R16; the same build serves `/games/moon-meadow-home/` and `/unicorns/`), `build.outDir: 'dist'`, `build.target: 'safari15'`, `server.proxy: { '/games/moon-meadow-home/api': 'http://127.0.0.1:8765' }`, and `define: { __BUILD_ID__: JSON.stringify(<git short sha>-<build time>) }`.
- Vitest config: `test.include: ['tests/**/*.test.ts']`, `test.environment: 'node'`, `test.testTimeout: 20000`.
- The skeleton writes no static server of its own. STACK.md "Testing" switches from `python3 -m http.server` to `node games/moon-meadow-home/server/serve.ts` (Task A11), with `PORT=8799 HOST=127.0.0.1` for agent tests, so tests never share an origin with Emma's port 8765.
- Every asset v3 loads (audio packs, letter sounds, art, fonts) is under the app's base path, copied into `public/`. No absolute paths into the repo such as `/shared/audio/`. Otherwise the odin build under `/unicorns/` breaks and the CSP header blocks nothing useful.
- The v3 `index.html` has no inline `<script>`. The server sends `script-src 'self'`.

**K2. Content packs (item 4).** `src/core/content.ts` exports `CONTENT_HASH: string`, a hash of the loaded content packs, used as `contentHash` for the snapshot key.

**K3. Phonics (items 4 and 7).** `src/core/phonics/` exports `splitGraphemes(word: string): string[]` (lowercase graphemes, split digraphs as `a-e`) and `phonemesOf(gems: readonly string[]): string`. Core never imports them; callers pass them in `V2ImportDeps`.

**K4. Learning engine (item 5).**
- Exports `graphemeItem(strand: 'r' | 's', grapheme: string): string`, the item id of a grapheme. Item ids match `/^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/`.
- Exports `createLearnerSlice(...): Slice<'learner', Learner>` (type `Slice` from `src/core/fold/engine.ts`). Its state is plain JSON. It reads `learn.result`, `learn.idle`, `learn.override`, `step.passed`, `visit.start` and `import.v2`. It applies `import.v2` seeds and `mathsV2Step` only when `isWinningFact(ctx.get<FactsState>('facts'), e)` is true. It uses `e.t` and the visit time zone for due dates and local days, never `hlc`.
- Exports `passReady(learner: Learner): { strand: Strand; step: string }[]`, which the store turns into `step.passed` drafts for `reconcile`.

**K5. World features (items 12, 14, 17, 18, 20, 22).** Plots, jewels, buildings, the opening queue, titles, the toy shelf and the Post Box are slices passed to `createGameFolder([...])`. They read one-time events from `state.facts`. Slice names never reuse `facts`, `visits`, `herd`, `names`, `cosmetics`, `settings` or `diag`. Stable row plots are named `row-<n>` (n from 2) in `building.done`; the herd slice counts rows from them. Titles export `titlesEarned(state): string[]` for `reconcile`.

**K6. Actions and the game store (`src/core/actions.ts`, `src/game.svelte.ts`).**
- Actions return `GameEventDraft[]`. Only `GameData.commit` stamps events.
- Actions decide hearts (one care heart per baby per visit, wish hearts, roll call) and record them in the `heart` field. `learn.result.baby` is set when the moment belongs to a baby.
- `visit.start` carries `tz: -new Date().getTimezoneOffset()`.
- The store opens `openGameData({ folder: createGameFolder([learnerSlice, ...featureSlices]), contentHash: CONTENT_HASH, codeVersion: __BUILD_ID__, reconcile })`, calls `claimTab(onLost)`, `attachLifecycle(data)` and `requestPersist()`, and shows a calm "playing in another tab" picture when `onLost` fires or `status().lostToOtherTab` is true.
- The folded state is changed in place. The store republishes on `subscribe` (for example by reassigning a `$state.raw` with the version number).
- The store creates the sync client in Wave C with `createSync({ port: data, apiBase: import.meta.env.BASE_URL + 'api/' })`, calls `start()` at start and `syncNow()` at visit end and after a Building Day.

**K7. Moving Day (item 11).** On start, when the log has no `egg.hatched` and no `import.v2`, the start scene calls `readV2Local()`. If it returns text, it calls `data.importText(text, deps)`. On `{ kind: 'v2', status: 'imported' }` it plays Moving Day with the babies whose `source` is `'v2'`, in `herd.order`. Babies imported with `name: null` get named in Moving Day with a normal `baby.named` event.

**K8. Parent corner (items 13 and 26).** Uses `exportFile()` with `saveExportFile()` and then `markExported()`, `importText()` with `readFileText()`, `backupState()`, `status()`, `exclude(device, on)`, `excludeLocalPlay()`, `reset()` followed by `location.reload()`, `requestPersist()` for the storage warning, the sync client's `pair`, `status` and `unpair`, and device ids from `state.visits.list[].dev`.

**K9. Test hook (item 1 and flows).** `window.__game.importFixture('v2')` imports `tests/fixtures/v2-save.json` (Task A12) through `importText`. `window.__game.syncNow()` calls the sync client.

**K10. names:pull (items 19 and 25).** The tool calls `unknownNamesFromText(text, deps)` (Task B2) for an exported save, or `GET <base>api/admin/unknown-names?family=emma` with `Authorization: Bearer <MOON_ADMIN_TOKEN>` (Task C4), or on the Mac reads `.data/moon-meadow/families/emma/events.jsonl` and calls `unknownNamesFrom`. The tool loads the token from the key file itself.

**K11a. Differences with the parallel plans, found while writing this plan.** `src/core/events.ts` is the one schema. Before Task A3 is built, the integrator settles each line below by editing that type's payload and check in A3 (one place), or by changing the other plan's builders:
- Learning plan: `placement.done { strand, current, placed[], side[] }` (fact, key `strand`) is already in this plan. Its `learn.override` has four shapes (`profile`, `set-current`, `mark-placed`/`unmark-placed`, `school`); this plan has `{ strand, op, step }`. Its `import.v2` asks for the raw v2 `log`; this plan maps the log to `seeds` and `mathsV2Step` with `graphemeItem` from K4. Its `LEARNER_FOLD_VERSION` goes in the learner slice's `version`, which is part of the snapshot key. Its `pendingLearnFacts(learner, content)` plugs into `openGameData({ reconcile })`.
- Places plan: `learn.result.items` is `{ item, result }[]` there and `{ id, result }[]` here, and this plan adds `visit`, `baby` and `heart`; `care.done { baby, care }` against `{ baby, station, heart }`; `pin.given { baby, pin, source, key? }` against `{ baby, pin, kind, set }`; `jar.labelled { jar, word, plural, count, picture, baby }` against `{ jar, word, gems, count }`; `learn.idle` and `place.enter` add `visit` here; `exclude { dev }` against `{ device }` (`dev` is a base field of every event, so the payload cannot reuse it); `note.sent { note, mark }` against `{ visit, words, mark, gift }`; `photo.taken { place, cousin, babies }` against `{ visit, place, photo, babies, cousin }`. The places plan's own `GameEvent` type should become an import of `GameEvent` and `DraftOf` from `src/core/events.ts`, its `MakeEvent` should return drafts (`(type, payload) => ({ type, ...payload })`) for `GameData.commit`, and `reducePlaces` becomes a slice: `{ name: 'places', version, init: initPlaces, apply: (s, e) => reducePlaces(s, e) }`.

**K11. New event types.** A workstream that needs an event type asks the integrator, who adds it the way Task B1 does: payload type, field checks, a sample in `tests/core/events.test.ts`, and a fold where state changes. Until Task C6 these additions stay in schema version 1.

## File map

| Path | Responsibility |
|---|---|
| `src/core/hash.ts` | Pure SHA-1, SHA-256, hex and canonical JSON |
| `src/core/ids.ts` | Device ids, uuid4 and uuid5 from `getRandomValues` |
| `src/core/hlc.ts` | Hybrid logical clock: format, parse, compare, tick, max |
| `src/core/checks.ts` | Dependency-free validator kit |
| `src/core/events.ts` | Event and payload types, field checks, validation, fold order, `payloadOf` |
| `src/core/migrate.ts` | Schema migrations and `checkEvent` (upgrade then validate) |
| `src/core/factory.ts` | Device meta, `stamp` drafts into events, `observe` remote clocks |
| `src/core/merge.ts` | Sort in fold order, union by id |
| `src/core/fold/engine.ts` | Slices, full and incremental folds, exclusion |
| `src/core/fold/snapshot.ts` | Snapshot key, snapshot, restore decision |
| `src/core/world/facts.ts` | Recorded facts slice, `isWinningFact`, `missingFacts` |
| `src/core/world/visits.ts` | Visits slice, local day |
| `src/core/world/herd.ts` | Herd slice: babies, names, ordinals, hearts, pins, stalls, camp, v2 babies |
| `src/core/world/names.ts` | Name builds slice and `unknownNamesFrom` |
| `src/core/world/cosmetics.ts` | Row and sky names, decorations, v2 gifts, Lumi gifts, album |
| `src/core/world/settings.ts` | Settings slice and diagnostics slice |
| `src/core/world/index.ts` | `CORE_SLICES`, `CoreState`, `createGameFolder` |
| `src/core/save/v2.ts` | v2 save detection, hash and mapping to `import.v2` |
| `src/core/save/export.ts` | Export file format and save-file parser |
| `src/core/save/unknown-names.ts` | Unknown names from a save file (Wave B) |
| `src/save/backend.ts` | Backend interface, rows, meta, memory backend |
| `src/save/idb.ts` | IndexedDB backend |
| `src/save/game-data.ts` | The runtime: commit, ingest, import, export, snapshot, retries, exclusion, lifecycle |
| `src/save/tab-guard.ts` | One saving tab per device |
| `src/save/persist.ts` | `persist()` when it exists |
| `src/save/v2-local.ts` | Same-origin read of the v2 save |
| `src/save/file.ts` | Share or download a save file, read a picked file |
| `src/sync/protocol.ts` | API types and limits shared by client and server |
| `src/sync/client.ts` | Pairing and background sync (Wave C) |
| `server/static.ts` | Safe static files with cache headers and CSP |
| `server/serve.ts` | The one Node server: static files and the save API |
| `server/README.md` | Running the server on the Mac for the iPad |
| `server/store.ts` | Per-family event logs on disk (Wave C) |
| `server/auth.ts` | Pairing codes, tokens, admin token, rate limits (Wave C) |
| `server/admin.ts` | Admin command line (Wave C) |
| `server/api.ts` | API routes: health, pair, sync, unknown names (Wave C) |
| `server/DEPLOY.md`, `server/deploy/moon-meadow.service`, `server/deploy/nginx-unicorns.conf` | odin deploy note, systemd unit, nginx snippet (Wave C) |
| `ideas/opus-5-5-unicorn-egg-nest-v2/move.html` | Moving Day page next to v2: shows the herd, downloads the save |
| `tests/helpers/events.ts`, `tests/helpers/rng.ts`, `tests/helpers/server.ts` | Test devices and drafts, seeded random, in-process server |
| `tests/fixtures/v2.ts`, `tests/fixtures/v2-save.json` | Synthetic v2 save and stand-in phonics deps |
| `tests/core/*.test.ts`, `tests/save/*.test.ts`, `tests/server/*.test.ts`, `tests/sync/*.test.ts` | Vitest suites |
| `.gitignore` | Adds `.data/` and `games/moon-meadow-home/tests/fixtures/local/` |

---

# Wave A: first playable (items 3, 11 and the save side of 13)

Wave A must be complete before Wave B starts. Tasks A1 to A5 are pure and can run one after the other in one session. A8 to A10 need A1 to A7. A11 needs nothing else and can start at once, because the other builders need the server for browser checks.

### Task A1: Pure hashes and ids

**Files:**
- Create: `src/core/hash.ts`, `src/core/ids.ts`
- Test: `tests/core/hash.test.ts`, `tests/core/ids.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `utf8(s: string): Uint8Array`, `toHex(bytes: Uint8Array): string`, `sha1Bytes(input: string | Uint8Array): Uint8Array`, `sha256Bytes(input: string | Uint8Array): Uint8Array`, `sha1Hex(input): string`, `sha256Hex(input): string`, `canonicalJson(value: unknown): string`; `DEVICE_ID_RE`, `UUID_RE`, `randomBytes(n: number): Uint8Array`, `newDeviceId(): string`, `uuid4(): string`, `uuid5(name: string, namespace: string): string`.

- [ ] **Step 1: Write the failing tests**

`tests/core/hash.test.ts`:

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalJson, sha1Hex, sha256Hex } from '../../src/core/hash.ts';

const node = (alg: string, s: string | Uint8Array) => createHash(alg).update(s).digest('hex');

describe('hash', () => {
  it('matches node:crypto across block boundaries and unicode', () => {
    for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 1000, 100_000]) {
      const s = 'x'.repeat(n) + 'é🦄';
      expect(sha256Hex(s)).toBe(node('sha256', s));
      expect(sha1Hex(s)).toBe(node('sha1', s));
    }
  });

  it('hashes bytes', () => {
    const b = new Uint8Array(300).map((_, i) => (i * 7) & 255);
    expect(sha256Hex(b)).toBe(node('sha256', b));
    expect(sha1Hex(b)).toBe(node('sha1', b));
  });

  it('known vectors', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  it('canonical JSON sorts keys at every level and drops undefined fields', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: 2, c: undefined }] })).toBe('{"a":[1,{"d":2}],"b":1}');
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});
```

`tests/core/ids.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ID_RE, newDeviceId, UUID_RE, uuid4, uuid5 } from '../../src/core/ids.ts';

describe('ids', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uuid5 matches the RFC example', () => {
    expect(uuid5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });

  it('uuid4 has version 4 and is unique', () => {
    const ids = new Set(Array.from({ length: 1000 }, uuid4));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(id).toMatch(UUID_RE);
      expect(id[14]).toBe('4');
    }
  });

  it('works where crypto.randomUUID is missing, as on plain http', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('insecure context'); });
    expect(uuid4()).toMatch(UUID_RE);
    expect(newDeviceId()).toMatch(DEVICE_ID_RE);
  });

  it('device ids are 8 base32 characters', () => {
    for (let i = 0; i < 100; i++) expect(newDeviceId()).toMatch(DEVICE_ID_RE);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/core/hash.test.ts tests/core/ids.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/hash.ts".

- [ ] **Step 3: Write the implementation**

`src/core/hash.ts`:

```ts
// Pure SHA-1 and SHA-256. crypto.subtle only exists in secure contexts, and the Mac serves
// the game over plain http on the home network, so the game cannot rely on it.

const encoder = new TextEncoder();

export function utf8(s: string): Uint8Array {
  return encoder.encode(s);
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function padMessage(bytes: Uint8Array): DataView {
  const total = Math.ceil((bytes.length + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  const bits = bytes.length * 8;
  view.setUint32(total - 8, Math.floor(bits / 0x100000000));
  view.setUint32(total - 4, bits >>> 0);
  return view;
}

function wordsToBytes(words: Uint32Array): Uint8Array {
  const out = new Uint8Array(words.length * 4);
  const view = new DataView(out.buffer);
  words.forEach((w, i) => view.setUint32(i * 4, w));
  return out;
}

const rotl = (x: number, n: number): number => ((x << n) | (x >>> (32 - n))) >>> 0;
const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0;

export function sha1Bytes(input: string | Uint8Array): Uint8Array {
  const view = padMessage(typeof input === 'string' ? utf8(input) : input);
  const h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const w = new Uint32Array(80);
  for (let off = 0; off < view.byteLength; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rotl(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = temp;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e;
  }
  return wordsToBytes(h);
}

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256Bytes(input: string | Uint8Array): Uint8Array {
  const view = padMessage(typeof input === 'string' ? utf8(input) : input);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let off = 0; off < view.byteLength; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return wordsToBytes(h);
}

export const sha1Hex = (input: string | Uint8Array): string => toHex(sha1Bytes(input));
export const sha256Hex = (input: string | Uint8Array): string => toHex(sha256Bytes(input));

/** JSON with object keys sorted at every level, so equal data always gives the same text and hash. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(v => (v === undefined ? 'null' : canonicalJson(v))).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}
```

`src/core/ids.ts`:

```ts
// Ids that work in insecure contexts: crypto.randomUUID needs https, crypto.getRandomValues does not.
import { sha1Bytes, toHex, utf8 } from './hash.ts';

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';
export const DEVICE_ID_RE = /^[a-z2-7]{8}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function newDeviceId(): string {
  let id = '';
  for (const b of randomBytes(8)) id += BASE32[b & 31];
  return id;
}

function formatUuid(b: Uint8Array): string {
  const h = toHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function uuid4(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return formatUuid(b);
}

export function uuid5(name: string, namespace: string): string {
  if (!UUID_RE.test(namespace)) throw new Error(`bad namespace uuid: ${namespace}`);
  const ns = new Uint8Array(namespace.replace(/-/g, '').match(/../g)!.map(x => parseInt(x, 16)));
  const nameBytes = utf8(name);
  const all = new Uint8Array(16 + nameBytes.length);
  all.set(ns);
  all.set(nameBytes, 16);
  const b = sha1Bytes(all).slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  return formatUuid(b);
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run tests/core/hash.test.ts tests/core/ids.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/hash.ts games/moon-meadow-home/src/core/ids.ts games/moon-meadow-home/tests/core/hash.test.ts games/moon-meadow-home/tests/core/ids.test.ts
git commit -m "Add pure SHA-1, SHA-256 and id helpers that work on plain http"
```

**Acceptance:** hashes equal `node:crypto` for every length tested, uuid5 equals the RFC example, and ids work with `crypto.randomUUID` broken.

### Task A2: Hybrid logical clock

**Files:**
- Create: `src/core/hlc.ts`
- Test: `tests/core/hlc.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Hlc = { wall: number; n: number }`, `HLC_RE`, `HLC_MAX_N`, `HLC_ZERO`, `formatHlc(h: Hlc): string` (`"1760000000000-0005"`), `parseHlc(s: string): Hlc | null`, `compareHlc(a: Hlc, b: Hlc): number`, `tick(last: Hlc, now: number): Hlc`, `maxHlc(last: Hlc, seen: Iterable<string>): Hlc`.

- [ ] **Step 1: Write the failing test**

`tests/core/hlc.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compareHlc, formatHlc, HLC_MAX_N, HLC_ZERO, maxHlc, parseHlc, tick } from '../../src/core/hlc.ts';

describe('hybrid logical clock', () => {
  it('formats to a fixed width that sorts like the clock', () => {
    const a = formatHlc({ wall: 1_760_000_000_000, n: 5 });
    const b = formatHlc({ wall: 1_760_000_000_000, n: 36 });
    const c = formatHlc({ wall: 1_760_000_000_001, n: 0 });
    expect(a).toBe('1760000000000-0005');
    expect([c, b, a].sort()).toEqual([a, b, c]);
    expect(parseHlc(b)).toEqual({ wall: 1_760_000_000_000, n: 36 });
    expect(parseHlc('nope')).toBeNull();
  });

  it('never goes back when the device clock jumps back', () => {
    let h = tick(HLC_ZERO, 5000);
    const seen = [h];
    for (const now of [4000, 4000, 9000, 1, 9000]) { h = tick(h, now); seen.push(h); }
    for (let i = 1; i < seen.length; i++) expect(compareHlc(seen[i], seen[i - 1])).toBeGreaterThan(0);
  });

  it('carries into the wall clock when the counter is full', () => {
    expect(tick({ wall: 10, n: HLC_MAX_N }, 10)).toEqual({ wall: 11, n: 0 });
  });

  it('maxHlc picks the highest valid clock', () => {
    const best = maxHlc(HLC_ZERO, ['0000000000005-0001', 'garbage', '0000000000009-0000']);
    expect(best).toEqual({ wall: 9, n: 0 });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/core/hlc.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/hlc.ts".

- [ ] **Step 3: Write the implementation**

`src/core/hlc.ts`:

```ts
// Hybrid logical clock. Encoded as "<13 digit ms>-<4 base36 counter>", so string order is clock order.
export type Hlc = { wall: number; n: number };

export const HLC_RE = /^\d{13}-[0-9a-z]{4}$/;
export const HLC_MAX_N = 36 ** 4 - 1;
export const HLC_ZERO: Hlc = { wall: 0, n: 0 };

export function formatHlc(h: Hlc): string {
  return String(h.wall).padStart(13, '0') + '-' + h.n.toString(36).padStart(4, '0');
}

export function parseHlc(s: string): Hlc | null {
  if (!HLC_RE.test(s)) return null;
  return { wall: Number(s.slice(0, 13)), n: parseInt(s.slice(14), 36) };
}

export function compareHlc(a: Hlc, b: Hlc): number {
  return a.wall !== b.wall ? a.wall - b.wall : a.n - b.n;
}

/** The next clock value for a local event: never below the last value, even when the device clock jumps back. */
export function tick(last: Hlc, now: number): Hlc {
  const wall = Math.max(last.wall, Math.floor(now));
  if (wall !== last.wall) return { wall, n: 0 };
  if (last.n >= HLC_MAX_N) return { wall: wall + 1, n: 0 };
  return { wall, n: last.n + 1 };
}

/** The highest of `last` and every parseable clock in `seen`. */
export function maxHlc(last: Hlc, seen: Iterable<string>): Hlc {
  let best = last;
  for (const s of seen) {
    const h = parseHlc(s);
    if (h && compareHlc(h, best) > 0) best = h;
  }
  return best;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run tests/core/hlc.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/hlc.ts games/moon-meadow-home/tests/core/hlc.test.ts
git commit -m "Add the hybrid logical clock for event order"
```

**Acceptance:** string order equals clock order, and the clock never goes back when the device clock does.

### Task A3: Event schema, validation, migrations and stamping

**Files:**
- Create: `src/core/checks.ts`, `src/core/events.ts`, `src/core/migrate.ts`, `src/core/factory.ts`, `tests/helpers/events.ts`
- Test: `tests/core/events.test.ts`

**Interfaces:**
- Consumes: `HLC_RE`, `formatHlc`, `parseHlc`, `tick`, `maxHlc`, `HLC_ZERO` (A2); `newDeviceId` (A1).
- Produces:
  - `checks.ts`: `type Check = (x: unknown) => string | null`, `isPlainObject`, `str(max)`, `text(max)`, `KEY_RE`, `key`, `GEM_RE`, `gem`, `num`, `int(min, max)`, `bool`, `oneOf(...values)`, `nullable(c)`, `arr(c, max)`, `obj(shape)`, `record(c, maxKeys)`, `scalar`.
  - `events.ts`: `SCHEMA_VERSION = 1`; types `Strand`, `LearnStrand`, `Result`, `ErrorTag`, `NameRoute`, `NameOutcome`, `EggLook`, `Colours`, `Traits`, `ItemResult`, `Scalar`, `V2Baby`, `Seed`, `NameWish`, `Payloads`, `EventType`, `EventBase`, `DraftOf<K>`, `EventOf<K>`, `GameEventDraft`, `GameEvent`, `Validation`; values `PAYLOAD_CHECKS`, `EVENT_TYPES`, `EVENT_ID_RE`; functions `checkBase(x: unknown): string | null`, `validateEvent(x: unknown): Validation`, `seqOf(e: { id: string }): number`, `compareEvents(a: EventBase, b: EventBase): number`, `payloadOf<K>(e: EventOf<K>): Payloads[K]`.
  - `migrate.ts`: `type Migration`, `MIGRATIONS`, `upgradeWith(x, migrations, target): unknown`, `upgradeEvent(x): unknown`, `checkEvent(x: unknown): Validation`.
  - `factory.ts`: `type DeviceMeta = { dev: string; nextSeq: number; hlc: string }`, `newDeviceMeta(hlc?: string): DeviceMeta`, `stamp(meta, drafts, now): { events: GameEvent[]; meta: DeviceMeta }`, `observe(meta, events: readonly { hlc: string }[]): DeviceMeta`.
  - `tests/helpers/events.ts`: `fakeDevice(dev): FakeDevice`, `COLOURS`, `PLAIN`, draft builders `hatch`, `named`, `pin`, `care`, `setting`.

The event shape is spec 4.4: `{ id, hlc, t, dev, v, type, ...payload }`. The payload of `exclude` is `device`, because `dev` is a base field. Every id-like field (`visit`, `baby`, `plot`, `step`, item ids) must match `KEY_RE`, which also keeps `__proto__` out of every keyed table in the folds.

- [ ] **Step 1: Write the test helpers**

`tests/helpers/events.ts`:

```ts
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
  type: 'baby.named', baby, name, gems: name.toLowerCase().split(''), route: 'bell',
});
export const pin = (baby: string, id: string): DraftOf<'pin.given'> => ({ type: 'pin.given', baby, pin: id, kind: 'star', set: null });
export const care = (baby: string, heart = true): DraftOf<'care.done'> => ({ type: 'care.done', baby, station: 'brush', heart });
export const setting = (key: string, value: string | number | boolean | null): DraftOf<'settings.set'> => ({ type: 'settings.set', key, value });
```

- [ ] **Step 2: Write the failing test**

`tests/core/events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compareEvents, EVENT_TYPES, payloadOf, SCHEMA_VERSION, seqOf, validateEvent } from '../../src/core/events.ts';
import type { GameEvent } from '../../src/core/events.ts';
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
        visit: 'v1', strand: 'm', step: 'M10', carrier: 'two-stone egg 7', items: [{ id: 'f:7+3', result: 'first' }],
        result: 'first', ms: 2300, scaffold: 2, error: null, place: 'nest', probe: false, baby: null, heart: false,
      },
      'learn.idle': { visit: 'v1', strand: 'r', step: 'R21', place: 'wish', level: 1 },
      'learn.override': { strand: 's', op: 'mark-placed', step: 'S10' },
      'step.passed': { strand: 'r', step: 'R19' },
      'placement.done': { strand: 'r', current: 'R21', placed: ['R01', 'R02'], side: ['R04D'] },
      'egg.hatched': { baby: 'b1', egg: 'golden', kind: 'moon', breed: 'moon', colours: COLOURS, traits: PLAIN, source: 'nest' },
      'baby.named': { baby: 'b1', name: 'Daisy', gems: ['d', 'ai', 's', 'y'], route: 'garden' },
      'name.built': {
        visit: 'v1', baby: 'b1', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m əʊ', route: 'gold', outcome: 'unknown', listName: null, strong: false,
      },
      'name.clipHeard': { baby: 'b1', heart: true },
      'care.done': { baby: 'b1', station: 'brush', heart: true },
      'pin.given': { baby: 'b1', pin: 'star-1', kind: 'star', set: null },
      'jewel.placed': { jewel: 'S20', plot: 'fountain' },
      'jar.labelled': { jar: 'jar-1', word: 'foxes', gems: ['f', 'o', 'x', 'es'], count: 3 },
      'building.part': { plot: 'bath-pond', part: 'walls' },
      'building.done': { plot: 'row-2' },
      'row.named': { row: 2, name: 'Rose Row' },
      'sky.named': { sky: 1, name: 'Star' },
      'opening.announced': { opening: 'bath-pond' },
      'title.given': { title: 'nest-keeper' },
      'outfit.saved': { baby: 'b1', outfit: { hat: 'crown-gold', cape: null } },
      'favourite.set': { baby: 'b1', on: true },
      'decor.placed': { decor: 'd1', item: 'lantern', area: 'meadow', x: 100, y: 200 },
      'settings.set': { key: 'extra-eggs-skip-wish', value: false },
      'audio.missing': { clip: 'word-hat' },
      'import.v2': { hash: 'ab12', babies: [], gifts: ['hat'], nights: 4, mathsV2Step: 2, seeds: [], nameWishes: [] },
      'exclude': { device: 'zzzzzzzz', on: true },
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
    expect(validateEvent({ ...base, type: 'jar.labelled', jar: 'j', word: 'hat', gems: ['H'], count: 1 })).toMatchObject({ ok: false });
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
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx vitest run tests/core/events.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/events.ts".

- [ ] **Step 4: Write the implementation**

`src/core/checks.ts`:

```ts
// A tiny validator kit with no dependencies, so the Node save server can use it too.
// A check returns null when the value is fine, or a short reason.
export type Check = (x: unknown) => string | null;

export function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export const str = (max: number): Check => x =>
  typeof x === 'string' && x.length <= max ? null : `text up to ${max}`;

export const text = (max: number): Check => x =>
  typeof x === 'string' && x.length > 0 && x.length <= max ? null : `non-empty text up to ${max}`;

/** Ids and keys: letters, digits and : . _ + - , not starting with a symbol, up to 64 characters. */
export const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/;
export const key: Check = x => (typeof x === 'string' && KEY_RE.test(x) ? null : 'key');

/** A grapheme gem: lowercase letters, with a hyphen for split digraphs (a-e). */
export const GEM_RE = /^[a-z][a-z-]{0,3}$/;
export const gem: Check = x => (typeof x === 'string' && GEM_RE.test(x) ? null : 'gem');

export const num: Check = x => (typeof x === 'number' && Number.isFinite(x) ? null : 'number');

export const int = (min: number, max: number): Check => x =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max ? null : `whole number ${min} to ${max}`;

export const bool: Check = x => (typeof x === 'boolean' ? null : 'true or false');

export const oneOf = (...values: readonly (string | number)[]): Check => x =>
  values.includes(x as string | number) ? null : `one of ${values.join(', ')}`;

export const nullable = (c: Check): Check => x => (x === null ? null : c(x));

export const arr = (c: Check, max: number): Check => x => {
  if (!Array.isArray(x) || x.length > max) return `list up to ${max}`;
  for (let i = 0; i < x.length; i++) {
    const err = c(x[i]);
    if (err) return `[${i}] ${err}`;
  }
  return null;
};

/** An object with exactly these fields. Extra fields are refused, so logs stay clean. */
export const obj = (shape: Record<string, Check>): Check => x => {
  if (!isPlainObject(x)) return 'object';
  for (const k of Object.keys(x)) if (!Object.hasOwn(shape, k)) return `unexpected field ${k}`;
  for (const k of Object.keys(shape)) {
    const err = shape[k](x[k]);
    if (err) return `${k}: ${err}`;
  }
  return null;
};

/** An object whose keys pass KEY_RE and whose values pass `c`. */
export const record = (c: Check, maxKeys: number): Check => x => {
  if (!isPlainObject(x)) return 'object';
  const keys = Object.keys(x);
  if (keys.length > maxKeys) return `up to ${maxKeys} fields`;
  for (const k of keys) {
    if (!KEY_RE.test(k)) return `bad field name ${k}`;
    const err = c(x[k]);
    if (err) return `${k}: ${err}`;
  }
  return null;
};

export const scalar: Check = x =>
  x === null || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)) || (typeof x === 'string' && x.length <= 500)
    ? null
    : 'text, number, true, false or null';
```

`src/core/events.ts`:

```ts
// Event types, payload shapes, validation and fold order. Imported by the game and by the Node save server,
// so it uses only erasable TypeScript (no enums) and `.ts` import paths.
import { arr, bool, gem, int, isPlainObject, key, nullable, num, obj, oneOf, record, scalar, str, text } from './checks.ts';
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
export type NameRoute = 'bell' | 'garden' | 'gold' | 'import';
export type NameOutcome = 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen';
export type EggLook = 'plain' | 'speckled' | 'golden' | 'building';
export type Colours = { body: string; mane: string; mane2: string };
export type Traits = { shiny: boolean; speckled: boolean; golden: boolean; founder: boolean };
export type ItemResult = { id: string; result: Result };
export type Scalar = string | number | boolean | null;
export type V2Baby = {
  baby: string; v2id: number; name: string | null; gems: string[]; colours: Colours; traits: Traits;
  hearts: number; stickers: string[]; night: number;
};
export type Seed = { strand: 'r' | 's'; item: string; box: 0 | 1 };
export type NameWish = { name: string; gems: string[]; phonemes: string };

export type Payloads = {
  'visit.start': { visit: string; tz: number };
  'visit.end': { visit: string; reason: 'goodnight' | 'idle' | 'hidden' };
  'place.enter': { visit: string; place: string };
  'place.leave': { visit: string; place: string };
  'learn.result': {
    visit: string; strand: LearnStrand; step: string; carrier: string; items: ItemResult[]; result: Result;
    ms: number; scaffold: 1 | 2 | 3; error: ErrorTag | null; place: string; probe: boolean;
    baby: string | null; heart: boolean;
  };
  'learn.idle': { visit: string; strand: LearnStrand; step: string; place: string; level: 1 | 2 };
  'learn.override': {
    strand: Strand; op: 'set-current' | 'mark-placed' | 'clear-placed' | 'school-on' | 'school-off' | 'end-placement'; step: string;
  };
  'step.passed': { strand: Strand; step: string };
  /** Placement ended in a strand. Freezes the placed and side steps, so later content cannot rewrite them on a refold. */
  'placement.done': { strand: Strand; current: string; placed: string[]; side: string[] };
  'egg.hatched': {
    baby: string; egg: EggLook; kind: string; breed: string; colours: Colours; traits: Traits; source: 'nest' | 'building' | 'row';
  };
  'baby.named': { baby: string; name: string; gems: string[]; route: NameRoute };
  'name.built': {
    visit: string | null; baby: string | null; gems: string[]; phonemes: string; route: NameRoute;
    outcome: NameOutcome; listName: string | null; strong: boolean;
  };
  'name.clipHeard': { baby: string; heart: boolean };
  'care.done': { baby: string; station: string; heart: boolean };
  'pin.given': { baby: string; pin: string; kind: 'star' | 'set' | 'moment'; set: string | null };
  'jewel.placed': { jewel: string; plot: string };
  'jar.labelled': { jar: string; word: string; gems: string[]; count: number };
  'building.part': { plot: string; part: 'walls' | 'trim' | 'sign' | 'ribbon' | 'circle' };
  'building.done': { plot: string };
  'row.named': { row: number; name: string };
  'sky.named': { sky: number; name: string };
  'opening.announced': { opening: string };
  'title.given': { title: string };
  'outfit.saved': { baby: string; outfit: Record<string, string | null> };
  'favourite.set': { baby: string; on: boolean };
  'decor.placed': { decor: string; item: string; area: string; x: number; y: number };
  'settings.set': { key: string; value: Scalar };
  'audio.missing': { clip: string };
  'import.v2': {
    hash: string; babies: V2Baby[]; gifts: string[]; nights: number; mathsV2Step: number; seeds: Seed[]; nameWishes: NameWish[];
  };
  'exclude': { device: string; on: boolean };
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

/** One check per payload field. The mapped type makes a missing field check a compile error. */
export const PAYLOAD_CHECKS: { [K in EventType]: { [F in keyof Payloads[K]]-?: Check } } = {
  'visit.start': { visit: key, tz: int(-840, 840) },
  'visit.end': { visit: key, reason: oneOf('goodnight', 'idle', 'hidden') },
  'place.enter': { visit: key, place: key },
  'place.leave': { visit: key, place: key },
  'learn.result': {
    visit: key, strand: learnStrand, step: key, carrier: text(200),
    items: arr(obj({ id: key, result }), 20), result, ms: int(0, 3_600_000), scaffold: oneOf(1, 2, 3),
    error: nullable(oneOf('vowel', 'dutch', 'reversal', 'off-by-one', 'one-hour-off', 'other')),
    place: key, probe: bool, baby: nullable(key), heart: bool,
  },
  'learn.idle': { visit: key, strand: learnStrand, step: key, place: key, level: oneOf(1, 2) },
  'learn.override': {
    strand, op: oneOf('set-current', 'mark-placed', 'clear-placed', 'school-on', 'school-off', 'end-placement'), step: key,
  },
  'step.passed': { strand, step: key },
  'placement.done': { strand, current: key, placed: arr(key, 200), side: arr(key, 50) },
  'egg.hatched': {
    baby: key, egg: oneOf('plain', 'speckled', 'golden', 'building'), kind: key, breed: key, colours, traits,
    source: oneOf('nest', 'building', 'row'),
  },
  'baby.named': { baby: key, name: babyName, gems, route },
  'name.built': {
    visit: nullable(key), baby: nullable(key), gems, phonemes: str(64), route,
    outcome: oneOf('no-vowel', 'blocked', 'list', 'unknown', 'chosen'), listName: nullable(babyName), strong: bool,
  },
  'name.clipHeard': { baby: key, heart: bool },
  'care.done': { baby: key, station: key, heart: bool },
  'pin.given': { baby: key, pin: key, kind: oneOf('star', 'set', 'moment'), set: nullable(key) },
  'jewel.placed': { jewel: key, plot: key },
  'jar.labelled': { jar: key, word: text(40), gems, count: int(1, 99) },
  'building.part': { plot: key, part: oneOf('walls', 'trim', 'sign', 'ribbon', 'circle') },
  'building.done': { plot: key },
  'row.named': { row: int(1, 1000), name: babyName },
  'sky.named': { sky: int(1, 1000), name: babyName },
  'opening.announced': { opening: key },
  'title.given': { title: key },
  'outfit.saved': { baby: key, outfit: record(nullable(key), 20) },
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
  const checks = PAYLOAD_CHECKS[type as EventType] as Record<string, Check>;
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
```

`src/core/migrate.ts`:

```ts
// Upgrades events written with an older schema version. Snapshots are never migrated, they are refolded.
import { checkBase, SCHEMA_VERSION, validateEvent } from './events.ts';
import type { Validation } from './events.ts';
import { isPlainObject } from './checks.ts';

export type Migration = (e: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] turns a version n event into a version n + 1 event. Each entry needs its own unit test. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export function upgradeWith(x: unknown, migrations: Readonly<Record<number, Migration>>, target: number): unknown {
  if (!isPlainObject(x) || checkBase(x) !== null) return x;
  let e: Record<string, unknown> = x;
  while ((e.v as number) < target) {
    const step = migrations[e.v as number];
    if (!step) return e;
    e = { ...step(e), v: (e.v as number) + 1 };
  }
  return e;
}

export function upgradeEvent(x: unknown): unknown {
  return upgradeWith(x, MIGRATIONS, SCHEMA_VERSION);
}

/** Upgrade, then validate. The one entry point for events that come from storage, a file or the network. */
export function checkEvent(x: unknown): Validation {
  return validateEvent(upgradeEvent(x));
}
```

`src/core/factory.ts`:

```ts
// Stamps drafts into events: device id, sequence and hybrid clock.
import { SCHEMA_VERSION } from './events.ts';
import type { GameEvent, GameEventDraft } from './events.ts';
import { formatHlc, HLC_ZERO, maxHlc, parseHlc, tick } from './hlc.ts';
import { newDeviceId } from './ids.ts';

export type DeviceMeta = { dev: string; nextSeq: number; hlc: string };

export function newDeviceMeta(hlc: string = formatHlc(HLC_ZERO)): DeviceMeta {
  return { dev: newDeviceId(), nextSeq: 1, hlc };
}

export function stamp(meta: DeviceMeta, drafts: readonly GameEventDraft[], now: number): { events: GameEvent[]; meta: DeviceMeta } {
  let h = parseHlc(meta.hlc) ?? HLC_ZERO;
  let seq = meta.nextSeq;
  const events: GameEvent[] = [];
  for (const d of drafts) {
    h = tick(h, now);
    events.push({ ...d, id: `${meta.dev}:${seq}`, hlc: formatHlc(h), t: now, dev: meta.dev, v: SCHEMA_VERSION } as GameEvent);
    seq++;
  }
  return { events, meta: { dev: meta.dev, nextSeq: seq, hlc: formatHlc(h) } };
}

/** Raises the device clock to the highest clock seen, so the next local event sorts after all of them. */
export function observe(meta: DeviceMeta, events: readonly { hlc: string }[]): DeviceMeta {
  const current = parseHlc(meta.hlc) ?? HLC_ZERO;
  const best = maxHlc(current, events.map(e => e.hlc));
  return best === current ? meta : { ...meta, hlc: formatHlc(best) };
}
```

- [ ] **Step 5: Run the test and the type check**

Run: `npx vitest run tests/core/events.test.ts && npx tsc --noEmit`
Expected: PASS, 9 tests. No type errors. A payload field without a check is a compile error through the mapped type on `PAYLOAD_CHECKS`.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/checks.ts games/moon-meadow-home/src/core/events.ts games/moon-meadow-home/src/core/migrate.ts games/moon-meadow-home/src/core/factory.ts games/moon-meadow-home/tests/helpers/events.ts games/moon-meadow-home/tests/core/events.test.ts
git commit -m "Add the event schema, validation, migrations and stamping"
```

**Acceptance:** all 30 first-playable event types (the 29 of spec 4.4 plus `placement.done` for the learning plan) validate, unknown types and extra fields are refused, newer schema versions are marked `newer`, and the fold order is clock, device, sequence.

### Task A4: Merge

**Files:**
- Create: `src/core/merge.ts`, `tests/helpers/rng.ts`
- Test: `tests/core/merge.test.ts`

**Interfaces:**
- Consumes: `compareEvents`, `GameEvent`, `EventBase` (A3); `canonicalJson` (A1); `observe`, `stamp` (A3).
- Produces: `sortEvents<E extends EventBase>(events: readonly E[]): E[]`, `merge(a: readonly GameEvent[], b: readonly GameEvent[]): GameEvent[]`; test helpers `mulberry32(seed): () => number`, `pick(rng, list)`.

- [ ] **Step 1: Write the seeded random helper**

`tests/helpers/rng.ts`:

```ts
// A seeded random generator, so property tests are repeatable.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}
```

- [ ] **Step 2: Write the failing test**

`tests/core/merge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { merge, sortEvents } from '../../src/core/merge.ts';
import { observe, stamp } from '../../src/core/factory.ts';
import { compareEvents } from '../../src/core/events.ts';
import type { GameEvent } from '../../src/core/events.ts';
import { fakeDevice, setting } from '../helpers/events.ts';
import { mulberry32 } from '../helpers/rng.ts';

/** Three devices write random events with clocks that jump around, and sometimes see each other. */
function randomLogs(seed: number): GameEvent[][] {
  const rng = mulberry32(seed);
  const devs = [fakeDevice('aaaaaaaa'), fakeDevice('bbbbbbbb'), fakeDevice('cccccccc')];
  let wall = 1_760_000_000_000;
  for (let i = 0; i < 60; i++) {
    const d = devs[Math.floor(rng() * 3)];
    wall += Math.floor(rng() * 5000) - 1500; // the clock sometimes jumps back
    d.add([setting(`k${i % 5}`, i)], wall);
    if (rng() < 0.2) { const other = devs[Math.floor(rng() * 3)]; d.meta = observe(d.meta, other.events); }
  }
  return devs.map(d => d.events);
}

describe('merge', () => {
  it('is commutative, associative and idempotent', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const [a, b, c] = randomLogs(seed);
      expect(merge(a, b)).toEqual(merge(b, a));
      expect(merge(merge(a, b), c)).toEqual(merge(a, merge(b, c)));
      expect(merge(a, a)).toEqual(sortEvents(a));
      expect(merge(merge(a, b), b)).toEqual(merge(a, b));
    }
  });

  it('keeps one copy per id and every event of every device', () => {
    const [a, b] = randomLogs(7);
    const m = merge(a, b);
    expect(new Set(m.map(e => e.id)).size).toBe(m.length);
    expect(m.length).toBe(a.length + b.length);
  });

  it('a device always sorts its own events in sequence order', () => {
    const d = fakeDevice('aaaaaaaa');
    for (const now of [5000, 4000, 3000, 9000, 100]) d.add([setting('x', now)], now);
    const sorted = sortEvents(d.events);
    expect(sorted.map(e => e.id)).toEqual(d.events.map(e => e.id));
  });

  it('an event sorts after every event its device had seen', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([setting('x', 1)], 9_000_000);
    b.meta = observe(b.meta, a.events);
    const [late] = b.add([setting('y', 2)], 1_000); // b's clock is far behind
    expect(compareEvents(late, a.events[0])).toBeGreaterThan(0);
  });

  it('a duplicate id with a different body resolves the same way from both sides', () => {
    const [ev] = stamp({ dev: 'aaaaaaaa', nextSeq: 1, hlc: '0000000000000-0000' }, [setting('x', 1)], 10).events;
    const twin = { ...ev, value: 2 } as GameEvent;
    expect(merge([ev], [twin])).toEqual(merge([twin], [ev]));
  });
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx vitest run tests/core/merge.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/merge.ts".

- [ ] **Step 4: Write the implementation**

`src/core/merge.ts`:

```ts
// The union of event sets by id, in fold order.
import { compareEvents } from './events.ts';
import type { EventBase, GameEvent } from './events.ts';
import { canonicalJson } from './hash.ts';

export function sortEvents<E extends EventBase>(events: readonly E[]): E[] {
  return [...events].sort(compareEvents);
}

/** Union by id. If one id carries two different bodies (never in normal play), the lower canonical JSON wins, so merge stays commutative. */
export function merge(a: readonly GameEvent[], b: readonly GameEvent[]): GameEvent[] {
  const byId = new Map<string, GameEvent>();
  for (const e of [...a, ...b]) {
    const prev = byId.get(e.id);
    if (!prev) byId.set(e.id, e);
    else if (prev !== e && canonicalJson(e) < canonicalJson(prev)) byId.set(e.id, e);
  }
  return sortEvents([...byId.values()]);
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run tests/core/merge.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/merge.ts games/moon-meadow-home/tests/helpers/rng.ts games/moon-meadow-home/tests/core/merge.test.ts
git commit -m "Add the event merge with property tests"
```

**Acceptance:** merge is commutative, associative and idempotent over 25 random three-device logs with clocks that jump back.

### Task A5: Fold engine and snapshot

**Files:**
- Create: `src/core/fold/engine.ts`, `src/core/fold/snapshot.ts`
- Test: `tests/core/fold.test.ts`

**Interfaces:**
- Consumes: `compareEvents`, `seqOf`, `SCHEMA_VERSION`, `GameEvent` (A3); `sortEvents`, `merge` (A4); `canonicalJson`, `sha256Hex` (A1); `isPlainObject` (A3).
- Produces:
  - `engine.ts`: `type FoldCtx = { get<T>(slice: string): T }`, `interface Slice<N extends string, S> { name; version; init(): S; apply(state: S, ev: GameEvent, ctx: FoldCtx): S }`, `AnySlice`, `StateOf<L>`, `FoldPosition = { hlc: string; dev: string; seq: number }`, `Folded<St> = { state; position; seen; count; excluded }`, `interface Folder<St> { slices; initial(); full(events); step(f, events): Folded<St> | null; catchUp(f, fresh, all): { folded; refolded } }`, `excludedDevices(sorted): string[]`, `createFolder<const L extends readonly AnySlice[]>(slices: L): Folder<StateOf<L>>`.
  - `snapshot.ts`: `type Snapshot = { key; position; seen; count; excluded; state; at }`, `RestoreMode = 'snapshot' | 'incremental' | 'full'`, `RestoreResult<St>`, `snapshotKey({ slices, contentHash, codeVersion }): string`, `toSnapshot(f, key, at): Snapshot`, `isSnapshot(x): x is Snapshot`, `restore(folder, snap: unknown, events, key): RestoreResult<St>`.

Rules the engine enforces: slices apply in list order and a slice sees earlier slices through `ctx` already updated for the current event; events of an excluded device are skipped but still counted in `seen`, `count` and `position`; `step` refuses (returns null, fold untouched) when any new event sorts at or before the position or is an `exclude`; `restore` folds on top of the snapshot only when the key matches, the snapshot covers exactly `count` stored events and every new event sorts after it.

- [ ] **Step 1: Write the failing test**

`tests/core/fold.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFolder } from '../../src/core/fold/engine.ts';
import type { Slice } from '../../src/core/fold/engine.ts';
import { isSnapshot, restore, snapshotKey, toSnapshot } from '../../src/core/fold/snapshot.ts';
import { merge } from '../../src/core/merge.ts';
import { observe } from '../../src/core/factory.ts';
import type { DraftOf } from '../../src/core/events.ts';
import { fakeDevice, setting } from '../helpers/events.ts';
import { mulberry32 } from '../helpers/rng.ts';

/** A toy slice that records the order it saw settings in, and a second one that reads the first through ctx. */
const trail: Slice<'trail', { ids: string[] }> = {
  name: 'trail', version: '1', init: () => ({ ids: [] }),
  apply(s, e) { if (e.type === 'settings.set') s.ids.push(e.id); return s; },
};
const seenCount: Slice<'count', { n: number }> = {
  name: 'count', version: '1', init: () => ({ n: 0 }),
  apply(s, e, ctx) { if (e.type === 'settings.set') s.n = ctx.get<{ ids: string[] }>('trail').ids.length; return s; },
};
const folder = createFolder([trail, seenCount] as const);
const exclude = (device: string, on = true): DraftOf<'exclude'> => ({ type: 'exclude', device, on });

describe('fold engine', () => {
  it('folds in fold order whatever the input order', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2), setting('x', 3)], 1000);
    const f = folder.full([...a.events].reverse());
    expect(f.state.trail.ids).toEqual(a.events.map(e => e.id));
    expect(f.state.count.n).toBe(3);
    expect(f.count).toBe(3);
    expect(f.seen).toEqual({ aaaaaaaa: 3 });
    expect(f.position).toEqual({ hlc: a.events[2].hlc, dev: 'aaaaaaaa', seq: 3 });
  });

  it('refuses two slices with one name', () => {
    expect(() => createFolder([trail, trail])).toThrow('two slices are called trail');
  });

  it('step folds events that sort after the position, and refuses others without changing the fold', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([setting('x', 1)], 1000);
    b.add([setting('y', 1)], 500);
    const f = folder.full(a.events);
    const before = JSON.stringify(f);
    expect(folder.step(f, b.events)).toBeNull();
    expect(JSON.stringify(f)).toBe(before);
    const later = a.add([setting('x', 2)], 2000);
    expect(folder.step(f, later)?.state.trail.ids).toEqual([a.events[0].id, a.events[1].id]);
  });

  it('leaves out the events of an excluded device, and an exclude always forces a refold', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    b.add([setting('fresh', 1)], 1000);
    a.add([setting('x', 1)], 1100);
    const f = folder.full([...a.events, ...b.events]);
    const ex = a.add([exclude('bbbbbbbb')], 1200);
    expect(folder.step(f, ex)).toBeNull();
    const g = folder.catchUp(f, ex, [...a.events, ...b.events]);
    expect(g.refolded).toBe(true);
    expect(g.folded.state.trail.ids).toEqual([a.events[0].id]);
    expect(g.folded.excluded).toEqual(['bbbbbbbb']);
    expect(g.folded.count).toBe(3);
    a.add([exclude('bbbbbbbb', false)], 1300);
    expect(folder.full([...a.events, ...b.events]).state.trail.ids).toEqual([b.events[0].id, a.events[0].id]);
  });

  it('an incremental fold of late, out-of-order events equals a full refold of the union', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry32(seed);
      const devs = [fakeDevice('aaaaaaaa'), fakeDevice('bbbbbbbb')];
      let wall = 1_000_000;
      for (let i = 0; i < 40; i++) {
        const d = devs[Math.floor(rng() * 2)];
        wall += Math.floor(rng() * 3000) - 1000;
        d.add([setting('k', i)], wall);
        if (rng() < 0.3) d.meta = observe(d.meta, devs[0].events.concat(devs[1].events));
      }
      const [a, b] = devs.map(d => d.events);
      const half = Math.floor(b.length / 2);
      let f = folder.full(a);
      let known = [...a];
      for (const chunk of [b.slice(half), b.slice(0, half)]) {
        known = merge(known, chunk);
        f = folder.catchUp(f, chunk, known).folded;
      }
      expect(f).toEqual(folder.full(merge(a, b)));
    }
  });
});

describe('snapshot', () => {
  const key = snapshotKey({ slices: folder.slices, contentHash: 'c1', codeVersion: 'b1' });

  it('the key changes with content, code and slice versions', () => {
    expect(snapshotKey({ slices: folder.slices, contentHash: 'c2', codeVersion: 'b1' })).not.toBe(key);
    expect(snapshotKey({ slices: folder.slices, contentHash: 'c1', codeVersion: 'b2' })).not.toBe(key);
    expect(snapshotKey({ slices: [{ ...trail, version: '2' }, seenCount], contentHash: 'c1', codeVersion: 'b1' })).not.toBe(key);
  });

  it('restores without folding when nothing is new, and steps on top when new events sort after', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2)], 1000);
    const snap = toSnapshot(folder.full(a.events), key, 5);
    expect(isSnapshot(snap)).toBe(true);
    expect(restore(folder, snap, a.events, key).mode).toBe('snapshot');
    a.add([setting('x', 3)], 2000);
    const r = restore(folder, snap, a.events, key);
    expect(r.mode).toBe('incremental');
    expect(r.folded).toEqual(folder.full(a.events));
  });

  it('refolds when the key differs, the snapshot is corrupt, counts differ or new events sort before', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([setting('x', 1)], 5000);
    const snap = toSnapshot(folder.full(a.events), key, 5);
    expect(restore(folder, snap, a.events, 'other').mode).toBe('full');
    expect(restore(folder, { junk: true }, a.events, key).mode).toBe('full');
    expect(restore(folder, null, a.events, key).mode).toBe('full');
    expect(restore(folder, snap, [], key).reason).toBe('snapshot does not match the stored events');
    b.add([setting('y', 1)], 1000);
    const r = restore(folder, snap, [...a.events, ...b.events], key);
    expect(r.mode).toBe('full');
    expect(r.folded).toEqual(folder.full([...a.events, ...b.events]));
  });

  it('a restored fold is a copy, so changing it never changes the snapshot', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1)], 1000);
    const snap = toSnapshot(folder.full(a.events), key, 5);
    const r = restore(folder, snap, a.events, key);
    r.folded.state.trail.ids.push('changed');
    expect((snap.state as { trail: { ids: string[] } }).trail.ids).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/core/fold.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/fold/engine.ts".

- [ ] **Step 3: Write the implementation**

`src/core/fold/engine.ts`:

```ts
// Folds the event log into state through slices. A fold never creates events.
import { compareEvents, seqOf } from '../events.ts';
import type { GameEvent } from '../events.ts';
import { sortEvents } from '../merge.ts';

/** Read access to the other slices while one event is applied. Slices earlier in the list already include this event. */
export type FoldCtx = { get<T>(slice: string): T };

/**
 * One part of the folded state. Rules: state is plain JSON data (no Map, Set, Date or class), apply may change
 * the state in place and returns it, apply ignores event types it does not know, and `version` changes whenever
 * the fold logic changes (it is part of the snapshot key).
 */
export interface Slice<N extends string, S> {
  readonly name: N;
  readonly version: string;
  init(): S;
  apply(state: S, ev: GameEvent, ctx: FoldCtx): S;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySlice = Slice<string, any>;
export type StateOf<L extends readonly AnySlice[]> = { [S in L[number] as S['name']]: ReturnType<S['init']> };

export type FoldPosition = { hlc: string; dev: string; seq: number };
export type Folded<St> = {
  state: St;
  /** The last folded event in fold order, or null for an empty log. */
  position: FoldPosition | null;
  /** Highest sequence folded per device, excluded devices included. */
  seen: Record<string, number>;
  /** Number of events folded, excluded devices included. */
  count: number;
  /** Device ids whose events are left out (exclude events). */
  excluded: string[];
};

export interface Folder<St> {
  readonly slices: readonly AnySlice[];
  initial(): Folded<St>;
  /** Folds the whole log from scratch. The input may be in any order. */
  full(events: readonly GameEvent[]): Folded<St>;
  /** Folds new events on top, changing `f` in place. Returns null, with `f` untouched, when a full refold is needed. */
  step(f: Folded<St>, events: readonly GameEvent[]): Folded<St> | null;
  /** step, or a full refold of `all` when step cannot be used. `all` must contain `fresh`. */
  catchUp(f: Folded<St>, fresh: readonly GameEvent[], all: readonly GameEvent[]): { folded: Folded<St>; refolded: boolean };
}

export function excludedDevices(sorted: readonly GameEvent[]): string[] {
  const on = new Map<string, boolean>();
  for (const e of sorted) if (e.type === 'exclude') on.set(e.device, e.on);
  return [...on].filter(([, v]) => v).map(([d]) => d).sort();
}

export function createFolder<const L extends readonly AnySlice[]>(slices: L): Folder<StateOf<L>> {
  const names = new Set<string>();
  for (const s of slices) {
    if (names.has(s.name)) throw new Error(`two slices are called ${s.name}`);
    names.add(s.name);
  }
  type St = StateOf<L>;

  function initial(): Folded<St> {
    const state: Record<string, unknown> = {};
    for (const s of slices) state[s.name] = s.init();
    return { state: state as St, position: null, seen: {}, count: 0, excluded: [] };
  }

  function track(f: Folded<St>, e: GameEvent): void {
    const seq = seqOf(e);
    f.position = { hlc: e.hlc, dev: e.dev, seq };
    if ((f.seen[e.dev] ?? 0) < seq) f.seen[e.dev] = seq;
    f.count++;
  }

  function applyOne(f: Folded<St>, e: GameEvent, excluded: ReadonlySet<string>): void {
    if (e.type === 'exclude' || !excluded.has(e.dev)) {
      const st = f.state as Record<string, unknown>;
      const ctx: FoldCtx = { get: <T>(name: string) => st[name] as T };
      for (const s of slices) st[s.name] = s.apply(st[s.name], e, ctx);
    }
    track(f, e);
  }

  function full(events: readonly GameEvent[]): Folded<St> {
    const sorted = sortEvents(events);
    const f = initial();
    f.excluded = excludedDevices(sorted);
    const ex = new Set(f.excluded);
    for (const e of sorted) applyOne(f, e, ex);
    return f;
  }

  function step(f: Folded<St>, events: readonly GameEvent[]): Folded<St> | null {
    const sorted = sortEvents(events);
    if (sorted.length === 0) return f;
    if (sorted.some(e => e.type === 'exclude')) return null;
    const pos = f.position;
    if (pos && compareEvents(sorted[0], { id: `${pos.dev}:${pos.seq}`, hlc: pos.hlc, dev: pos.dev, t: 0, v: 1 }) <= 0) return null;
    const ex = new Set(f.excluded);
    for (const e of sorted) applyOne(f, e, ex);
    return f;
  }

  function catchUp(f: Folded<St>, fresh: readonly GameEvent[], all: readonly GameEvent[]) {
    const stepped = step(f, fresh);
    return stepped ? { folded: stepped, refolded: false } : { folded: full(all), refolded: true };
  }

  return { slices, initial, full, step, catchUp };
}
```

`src/core/fold/snapshot.ts`:

```ts
// The cached fold: written at most every 10 seconds and at visit end, rebuilt whenever in doubt.
import { SCHEMA_VERSION, seqOf } from '../events.ts';
import type { GameEvent } from '../events.ts';
import { isPlainObject } from '../checks.ts';
import { canonicalJson, sha256Hex } from '../hash.ts';
import type { AnySlice, Folded, Folder, FoldPosition } from './engine.ts';

export type Snapshot = {
  key: string;
  position: FoldPosition | null;
  seen: Record<string, number>;
  count: number;
  excluded: string[];
  state: unknown;
  at: number;
};

export type RestoreMode = 'snapshot' | 'incremental' | 'full';
export type RestoreResult<St> = { folded: Folded<St>; mode: RestoreMode; reason: string };

/** Changes when the event schema, any slice version, the content packs or the app build change. */
export function snapshotKey(input: { slices: readonly AnySlice[]; contentHash: string; codeVersion: string }): string {
  return sha256Hex(canonicalJson({
    schema: SCHEMA_VERSION,
    slices: input.slices.map(s => [s.name, s.version]),
    content: input.contentHash,
    code: input.codeVersion,
  }));
}

export function toSnapshot<St>(f: Folded<St>, key: string, at: number): Snapshot {
  return {
    key, position: f.position ? { ...f.position } : null, seen: { ...f.seen }, count: f.count,
    excluded: [...f.excluded], state: structuredClone(f.state), at,
  };
}

export function isSnapshot(x: unknown): x is Snapshot {
  return isPlainObject(x) && typeof x.key === 'string' && isPlainObject(x.seen) && Number.isInteger(x.count)
    && Array.isArray(x.excluded) && isPlainObject(x.state) && (x.position === null || isPlainObject(x.position));
}

export function restore<St>(folder: Folder<St>, snap: unknown, events: readonly GameEvent[], key: string): RestoreResult<St> {
  const full = (reason: string): RestoreResult<St> => ({ folded: folder.full(events), mode: 'full', reason });
  if (!isSnapshot(snap)) return full('no usable snapshot');
  if (snap.key !== key) return full('fold version changed');
  const fresh: GameEvent[] = [];
  let covered = 0;
  for (const e of events) {
    if ((snap.seen[e.dev] ?? 0) >= seqOf(e)) covered++;
    else fresh.push(e);
  }
  if (covered !== snap.count) return full('snapshot does not match the stored events');
  const base: Folded<St> = {
    state: structuredClone(snap.state) as St, position: snap.position, seen: { ...snap.seen },
    count: snap.count, excluded: [...snap.excluded],
  };
  if (fresh.length === 0) return { folded: base, mode: 'snapshot', reason: 'up to date' };
  const stepped = folder.step(base, fresh);
  return stepped ? { folded: stepped, mode: 'incremental', reason: `${fresh.length} new events` } : full('new events sort before the snapshot');
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run tests/core/fold.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/fold games/moon-meadow-home/tests/core/fold.test.ts
git commit -m "Add the fold engine with exclusion, incremental folds and snapshots"
```

**Acceptance:** an incremental fold of late, out-of-order events equals a full refold of the union over 20 random logs, and a restored snapshot is a copy.

### Task A6: Recorded facts, the v2 mapping and the save file format

**Files:**
- Create: `src/core/world/facts.ts`, `src/core/save/v2.ts`, `src/core/save/export.ts`, `tests/fixtures/v2.ts`
- Modify: `.gitignore` (repo root)
- Test: `tests/core/v2.test.ts`, `tests/core/export.test.ts`

**Interfaces:**
- Consumes: `payloadOf`, `GameEvent`, `GameEventDraft`, `EventOf`, `Payloads`, `DraftOf`, `Colours`, `Traits`, `V2Baby`, `Seed`, `NameWish` (A3); `Slice` (A5); `isPlainObject` (A3); `canonicalJson`, `sha256Hex` (A1); `uuid5` (A1); `sortEvents` (A4).
- Produces:
  - `facts.ts`: `FACT_TYPES`, `type FactType`, `FactRec<K> = { id: string; t: number; payload: Payloads[K] }`, `FactsState`, `factKey(d: GameEventDraft): string | null`, `factsSlice: Slice<'facts', FactsState>`, `hasFact(facts, d): boolean`, `isWinningFact(facts, e: GameEvent): boolean`, `missingFacts(facts, candidates): GameEventDraft[]`.
  - `v2.ts`: `V2_SAVE_KEY = 'emma-unicorn-egg-nest-v2'`, `V2_NAMESPACE`, `type V2Save`, `type V2ImportDeps = { splitGraphemes(word: string): string[]; graphemeItem(strand: 'r' | 's', grapheme: string): string; phonemes(gems: readonly string[]): string }`, `type V2Plan`, `isV2Save(x): x is V2Save`, `v2Hash(save): string`, `capitalise(name): string`, `mapV2(save, deps): DraftOf<'import.v2'>`, `planV2Import(save, facts, deps): V2Plan`.
  - `export.ts`: `EXPORT_FORMAT = 'moon-meadow-save'`, `type ExportFile = { format; v: 1; exportedAt: number; events: GameEvent[] }`, `type ParsedSave = { kind: 'v3'; events: unknown[]; exportedAt: number } | { kind: 'v2'; save: V2Save } | { kind: 'invalid'; reason: string }`, `buildExport(events, now): ExportFile`, `exportFileName(now): string`, `parseSaveFile(text: string): ParsedSave`.
  - `tests/fixtures/v2.ts`: `makeV2Save(): Record<string, unknown>`, `testDeps: V2ImportDeps`.

The mapping follows spec 2.9 with these decisions. The v2 hash is SHA-256 of the canonical JSON of the parsed save, so whitespace in the file does not matter. The v2 maths log names no fact (`record('m', result, { egg, mode, step })` in the v2 code), so maths seeds nothing: only `lv.m.step` goes over, as `mathsV2Step`. Reading seeds come from `wish` words, spelling seeds from `name` entries; the last entry per item wins (first try box 1, else box 0). `nameWishes` travel inside the `import.v2` payload, so a second import of the same file adds no unknown names. Names keep only lowercase letters; anything else imports as `name: null`.

- [ ] **Step 1: Write the fixture**

`tests/fixtures/v2.ts`:

```ts
// A synthetic v2 save in the shape ideas/opus-5-5-unicorn-egg-nest-v2/index.html writes (freshSave, record, babyForNaming).
import type { V2ImportDeps } from '../../src/core/save/v2.ts';

const NAMES = ['sam', 'tam', 'pip', 'ben', 'fen', 'tess', 'kit', 'sam', 'dan', 'liss', 'rob', 'pod', 'mip', null] as const;

export function makeV2Save(): Record<string, unknown> {
  const herd = NAMES.map((name, i) => ({
    id: i + 1,
    name,
    c: { body: '#ffe0ef', mane: ['#ff7fbf', '#9d7bff', '#4fc3ff'][i % 3], mane2: '#ffbf3f' },
    traits: { shiny: i === 2, speckled: i === 4, golden: i === 5 },
    hearts: i % 7,
    stickers: i === 0 ? ['pin', 'hat', 'pin'] : i === 3 ? ['pan'] : [],
    night: 1 + Math.floor(i / 4),
    playNight: 0,
  }));
  return {
    v: 2, night: 5, crown: true, herd, jar: 3, jarGoal: 10, gifts: ['hat', 'cup'], seen: { firstEgg: 1 },
    lv: { r: { step: 3, streak: 1 }, s: { step: 2, streak: 0 }, m: { step: 4, streak: 2 } },
    log: [
      { strand: 'r', result: 'miss', wish: 'hat', night: 1, t: 1 },
      { strand: 'r', result: 'first', wish: 'hat', night: 2, t: 2 },
      { strand: 's', result: 'helped', name: 'ken', night: 2, t: 3 },
      { strand: 'm', result: 'first', egg: 'plain', mode: 'two', step: 4, night: 3, t: 4 },
      { strand: 'own', result: 'logged', name: 'tamo', night: 3, t: 5 },
    ],
    nextId: 15,
    nameWishes: [{ name: 'tamo', night: 3, t: 5 }, { name: 'lunabel', night: 4, t: 6 }, { name: 'tamo', night: 4, t: 7 }],
  };
}

const DIGRAPHS = ['ck', 'ss', 'll', 'ff', 'sh', 'ch', 'th', 'ng', 'ee', 'ai', 'oa'];

/** Stand-in for the phonics workstream: longest-match digraphs, else single letters. */
export const testDeps: V2ImportDeps = {
  splitGraphemes(word) {
    const out: string[] = [];
    for (let i = 0; i < word.length;) {
      const two = word.slice(i, i + 2);
      if (DIGRAPHS.includes(two)) { out.push(two); i += 2; } else { out.push(word[i]); i += 1; }
    }
    return out;
  },
  graphemeItem: (strand, g) => `${strand}:g:${g}`,
  phonemes: gems => gems.join(' '),
};
```

- [ ] **Step 2: Write the failing tests**

`tests/core/v2.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { capitalise, isV2Save, mapV2, planV2Import, V2_NAMESPACE, v2Hash } from '../../src/core/save/v2.ts';
import type { V2Save } from '../../src/core/save/v2.ts';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { uuid5 } from '../../src/core/ids.ts';
import { factsSlice } from '../../src/core/world/facts.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';

const save = () => makeV2Save() as V2Save;

describe('v2 import mapping', () => {
  it('maps every baby with a capital name, gems, colours, traits and the founder star', () => {
    const d = mapV2(save(), testDeps);
    expect(d.babies).toHaveLength(14);
    expect(d.babies[0]).toMatchObject({
      v2id: 1, name: 'Sam', gems: ['s', 'a', 'm'], hearts: 0, stickers: ['pin', 'hat', 'pin'], night: 1,
      traits: { shiny: false, speckled: false, golden: false, founder: true },
    });
    expect(d.babies[5]).toMatchObject({ name: 'Tess', gems: ['t', 'e', 'ss'], traits: { golden: true } });
    expect(d.babies[13]).toMatchObject({ name: null, gems: [] });
    expect(d.babies[0].baby).toBe(uuid5('1|1|sam', V2_NAMESPACE));
  });

  it('gives the same ids and hash on every run, and a different hash when the save changes', () => {
    expect(mapV2(save(), testDeps)).toEqual(mapV2(save(), testDeps));
    const changed = save();
    changed.night = 6;
    expect(v2Hash(changed)).not.toBe(v2Hash(save()));
    expect(mapV2(changed, testDeps).babies.map(b => b.baby)).toEqual(mapV2(save(), testDeps).babies.map(b => b.baby));
  });

  it('maps the rest of the save', () => {
    const d = mapV2(save(), testDeps);
    expect(d.gifts).toEqual(['hat', 'cup']);
    expect(d.nights).toBe(5);
    expect(d.mathsV2Step).toBe(4);
    expect(d.nameWishes).toEqual([
      { name: 'Tamo', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o' },
      { name: 'Lunabel', gems: ['l', 'u', 'n', 'a', 'b', 'e', 'l'], phonemes: 'l u n a b e l' },
    ]);
    // the later first try on "hat" wins over the earlier miss; "ken" was helped, so box 0; maths seeds nothing
    expect(d.seeds).toEqual(expect.arrayContaining([
      { strand: 'r', item: 'r:g:h', box: 1 }, { strand: 'r', item: 'r:g:a', box: 1 }, { strand: 'r', item: 'r:g:t', box: 1 },
      { strand: 's', item: 's:g:k', box: 0 }, { strand: 's', item: 's:g:e', box: 0 }, { strand: 's', item: 's:g:n', box: 0 },
    ]));
    expect(d.seeds).toHaveLength(6);
  });

  it('makes a valid event', () => {
    const d = mapV2(save(), testDeps);
    const ev = { ...d, id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION };
    expect(validateEvent(ev).ok).toBe(true);
  });

  it('survives odd saves: missing fields, wrong types, uppercase and junk names', () => {
    const odd = {
      v: 2,
      herd: [
        { name: 'SAM' }, { id: 'x', name: 42, c: 'red', traits: null, hearts: -3, stickers: 'pin', night: 0 },
        'not a baby', { id: 7, name: 'bo b', hearts: 1e9, stickers: ['pin', 5, 'PIN'] }, { id: 7, name: 'bo b' },
      ],
      gifts: 'hat', lv: 3, log: { no: 1 }, nameWishes: [null, { name: '' }],
    } as unknown as V2Save;
    const d = mapV2(odd, testDeps);
    expect(d.babies).toHaveLength(4);
    expect(d.babies[0]).toMatchObject({ name: 'Sam', v2id: 1, night: 1, hearts: 0 });
    expect(d.babies[1]).toMatchObject({ name: null, v2id: 2, hearts: 0, stickers: [], colours: { body: '#ffe0ef' } });
    expect(d.babies[2]).toMatchObject({ name: null, hearts: 0, stickers: ['pin', 'pin'] });
    expect(new Set(d.babies.map(b => b.baby)).size).toBe(4);
    expect(d).toMatchObject({ gifts: [], mathsV2Step: 0, seeds: [], nameWishes: [], nights: 1 });
    const ev = { ...d, id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION };
    expect(validateEvent(ev).ok).toBe(true);
  });

  it('recognises v2 saves only', () => {
    expect(isV2Save(save())).toBe(true);
    expect(isV2Save({ v: 3, herd: [] })).toBe(false);
    expect(isV2Save({ v: 2 })).toBe(false);
    expect(capitalise('sam')).toBe('Sam');
  });

  it('plans: new, already imported, or empty', () => {
    const facts = factsSlice.init();
    const plan = planV2Import(save(), facts, testDeps);
    expect(plan).toMatchObject({ status: 'new', babies: 14 });
    if (plan.status !== 'new') throw new Error('expected new');
    facts['import.v2'][plan.draft.hash] = { id: 'abcdefgh:1', t: 1, payload: { ...plan.draft } };
    expect(planV2Import(save(), facts, testDeps)).toEqual({ status: 'already', hash: plan.draft.hash });
    expect(planV2Import({ v: 2, herd: [] }, facts, testDeps)).toEqual({ status: 'empty' });
  });
});
```

`tests/core/export.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, parseSaveFile } from '../../src/core/save/export.ts';
import { fakeDevice, setting } from '../helpers/events.ts';
import { makeV2Save } from '../fixtures/v2.ts';

describe('save file', () => {
  it('exports events in fold order and reads them back', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('x', 1), setting('x', 2)], 1000);
    const file = buildExport([...a.events].reverse(), 1_760_000_000_000);
    expect(file).toMatchObject({ format: 'moon-meadow-save', v: 1, exportedAt: 1_760_000_000_000 });
    expect(file.events.map(e => e.id)).toEqual(['aaaaaaaa:1', 'aaaaaaaa:2']);
    expect(parseSaveFile(JSON.stringify(file))).toEqual({ kind: 'v3', events: file.events, exportedAt: 1_760_000_000_000 });
    expect(exportFileName(Date.UTC(2026, 11, 3, 18))).toBe('moon-meadow-2026-12-03.json');
  });

  it('recognises a raw v2 save as written by move.html, with or without a byte order mark', () => {
    const text = JSON.stringify(makeV2Save());
    expect(parseSaveFile(text)).toMatchObject({ kind: 'v2' });
    expect(parseSaveFile('﻿' + text)).toMatchObject({ kind: 'v2' });
  });

  it('explains files it cannot read', () => {
    expect(parseSaveFile('not json')).toEqual({ kind: 'invalid', reason: 'This file is not a save file.' });
    expect(parseSaveFile('{"format":"moon-meadow-save","v":2,"events":[]}')).toMatchObject({ kind: 'invalid' });
    expect(parseSaveFile('{"hello":1}')).toEqual({ kind: 'invalid', reason: 'This file is not a Moon Meadow or Unicorn Egg Nest save.' });
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run tests/core/v2.test.ts tests/core/export.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/save/v2.ts".

- [ ] **Step 4: Write the implementation**

`src/core/world/facts.ts`:

```ts
// Recorded facts: one-time events with a natural key. The earliest in fold order wins and is never revoked.
import { payloadOf } from '../events.ts';
import type { EventOf, GameEvent, GameEventDraft, Payloads } from '../events.ts';
import type { Slice } from '../fold/engine.ts';

export const FACT_TYPES = ['step.passed', 'placement.done', 'jewel.placed', 'building.done', 'opening.announced', 'title.given', 'baby.named', 'import.v2'] as const;
export type FactType = (typeof FACT_TYPES)[number];
export type FactRec<K extends FactType> = { id: string; t: number; payload: Payloads[K] };
export type FactsState = { [K in FactType]: Record<string, FactRec<K>> };

export function factKey(d: GameEventDraft): string | null {
  switch (d.type) {
    case 'step.passed': return `${d.strand}:${d.step}`;
    case 'placement.done': return d.strand;
    case 'jewel.placed': return d.jewel;
    case 'building.done': return d.plot;
    case 'opening.announced': return d.opening;
    case 'title.given': return d.title;
    case 'baby.named': return d.baby;
    case 'import.v2': return d.hash;
    default: return null;
  }
}

function emptyFacts(): FactsState {
  return {
    'step.passed': {}, 'placement.done': {}, 'jewel.placed': {}, 'building.done': {}, 'opening.announced': {},
    'title.given': {}, 'baby.named': {}, 'import.v2': {},
  };
}

export const factsSlice: Slice<'facts', FactsState> = {
  name: 'facts',
  version: '1',
  init: emptyFacts,
  apply(s, e) {
    const k = factKey(e);
    if (k === null) return s;
    const table = s[e.type as FactType] as Record<string, FactRec<FactType>>;
    if (!Object.hasOwn(table, k)) {
      table[k] = { id: e.id, t: e.t, payload: payloadOf(e as EventOf<FactType>) };
    }
    return s;
  },
};

export function hasFact(facts: FactsState, d: GameEventDraft): boolean {
  const k = factKey(d);
  return k !== null && Object.hasOwn(facts[d.type as FactType], k);
}

/** True for an event that is not a fact, or that is the winning (earliest) event for its key. */
export function isWinningFact(facts: FactsState, e: GameEvent): boolean {
  const k = factKey(e);
  if (k === null) return true;
  return facts[e.type as FactType][k]?.id === e.id;
}

/** The candidate facts that are not recorded yet, each key once. Non-fact drafts are dropped. */
export function missingFacts(facts: FactsState, candidates: readonly GameEventDraft[]): GameEventDraft[] {
  const taken = new Set<string>();
  return candidates.filter(c => {
    const k = factKey(c);
    if (k === null) return false;
    const tag = `${c.type}|${k}`;
    if (taken.has(tag) || hasFact(facts, c)) return false;
    taken.add(tag);
    return true;
  });
}
```

`src/core/save/v2.ts`:

```ts
// Unicorn Egg Nest v2 save: read it, hash it and map it to one import.v2 event (spec section 2.9).
import type { Colours, DraftOf, NameWish, Seed, Traits, V2Baby } from '../events.ts';
import { isPlainObject } from '../checks.ts';
import { canonicalJson, sha256Hex } from '../hash.ts';
import { uuid5 } from '../ids.ts';
import { hasFact } from '../world/facts.ts';
import type { FactsState } from '../world/facts.ts';

export const V2_SAVE_KEY = 'emma-unicorn-egg-nest-v2';
/** Namespace for v2 baby ids. Never change it: the same v2 baby must get the same id on every device. */
export const V2_NAMESPACE = '5b0e3c1a-7f2d-5c4e-9a8b-6d1f2e3a4b5c';

export type V2Save = { v: 2; herd: unknown[]; [field: string]: unknown };

/** What the import needs from the phonics and learning workstreams. Injected, so this file stays free of content. */
export type V2ImportDeps = {
  splitGraphemes(word: string): string[];
  graphemeItem(strand: 'r' | 's', grapheme: string): string;
  phonemes(gems: readonly string[]): string;
};

export type V2Plan =
  | { status: 'new'; draft: DraftOf<'import.v2'>; babies: number }
  | { status: 'already'; hash: string }
  | { status: 'empty' };

const LETTERS_RE = /^[a-z]{1,24}$/;
const COLOUR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOURS: Colours = { body: '#ffe0ef', mane: '#ff7fbf', mane2: '#9d7bff' };

export function isV2Save(x: unknown): x is V2Save {
  return isPlainObject(x) && x.v === 2 && Array.isArray(x.herd);
}

export function v2Hash(save: V2Save): string {
  return sha256Hex(canonicalJson(save));
}

export function capitalise(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const wholeNumber = (x: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max ? (x as number) : fallback;

const lowerWord = (x: unknown): string | null => {
  if (typeof x !== 'string') return null;
  const w = x.trim().toLowerCase();
  return LETTERS_RE.test(w) ? w : null;
};

function colours(c: unknown): Colours {
  if (!isPlainObject(c)) return { ...DEFAULT_COLOURS };
  const pickColour = (v: unknown, d: string) => (typeof v === 'string' && COLOUR_RE.test(v) ? v.toLowerCase() : d);
  return { body: pickColour(c.body, DEFAULT_COLOURS.body), mane: pickColour(c.mane, DEFAULT_COLOURS.mane), mane2: pickColour(c.mane2, DEFAULT_COLOURS.mane2) };
}

function traits(t: unknown): Traits {
  const o = isPlainObject(t) ? t : {};
  return { shiny: o.shiny === true, speckled: o.speckled === true, golden: o.golden === true, founder: true };
}

function gemsOf(word: string, deps: V2ImportDeps): string[] {
  return deps.splitGraphemes(word).filter(g => /^[a-z][a-z-]{0,3}$/.test(g)).slice(0, 12);
}

function mapBabies(herd: unknown[], deps: V2ImportDeps): V2Baby[] {
  const used = new Set<string>();
  const out: V2Baby[] = [];
  herd.slice(0, 500).forEach((raw, i) => {
    if (!isPlainObject(raw)) return;
    const v2id = wholeNumber(raw.id, 0, 1_000_000, i + 1);
    const night = wholeNumber(raw.night, 1, 100_000, 1);
    const lower = lowerWord(raw.name);
    let baby = uuid5(`${v2id}|${night}|${lower ?? ''}`, V2_NAMESPACE);
    if (used.has(baby)) baby = uuid5(`${v2id}|${night}|${lower ?? ''}|#${i}`, V2_NAMESPACE);
    used.add(baby);
    const stickers = Array.isArray(raw.stickers) ? raw.stickers.map(lowerWord).filter((s): s is string => s !== null).slice(0, 60) : [];
    out.push({
      baby, v2id, name: lower ? capitalise(lower) : null, gems: lower ? gemsOf(lower, deps) : [],
      colours: colours(raw.c), traits: traits(raw.traits), hearts: wholeNumber(raw.hearts, 0, 999, 0), stickers, night,
    });
  });
  return out;
}

/** Item memory seeds from the v2 log: the last result per item wins. Maths entries name no fact, so they seed nothing. */
function mapSeeds(log: unknown, deps: V2ImportDeps): Seed[] {
  if (!Array.isArray(log)) return [];
  const byItem = new Map<string, Seed>();
  for (const entry of log.slice(-400)) {
    if (!isPlainObject(entry)) continue;
    const strand = entry.strand === 'r' || entry.strand === 's' ? entry.strand : null;
    const word = strand === 'r' ? lowerWord(entry.wish) : strand === 's' ? lowerWord(entry.name) : null;
    if (!strand || !word) continue;
    const box: 0 | 1 = entry.result === 'first' ? 1 : 0;
    for (const g of gemsOf(word, deps)) {
      const item = deps.graphemeItem(strand, g);
      byItem.delete(`${strand}|${item}`);
      byItem.set(`${strand}|${item}`, { strand, item, box });
    }
  }
  return [...byItem.values()].slice(-400);
}

function mapNameWishes(x: unknown, deps: V2ImportDeps): NameWish[] {
  if (!Array.isArray(x)) return [];
  const out: NameWish[] = [];
  const seen = new Set<string>();
  for (const w of x) {
    const lower = isPlainObject(w) ? lowerWord(w.name) : null;
    if (!lower || seen.has(lower)) continue;
    seen.add(lower);
    const gems = gemsOf(lower, deps);
    out.push({ name: capitalise(lower), gems, phonemes: deps.phonemes(gems).slice(0, 64) });
  }
  return out.slice(0, 100);
}

export function mapV2(save: V2Save, deps: V2ImportDeps): DraftOf<'import.v2'> {
  const lv = isPlainObject(save.lv) && isPlainObject(save.lv.m) ? save.lv.m : {};
  return {
    type: 'import.v2',
    hash: v2Hash(save),
    babies: mapBabies(save.herd, deps),
    gifts: Array.isArray(save.gifts) ? save.gifts.map(lowerWord).filter((g): g is string => g !== null).slice(0, 100) : [],
    nights: wholeNumber(save.night, 1, 100_000, 1),
    mathsV2Step: wholeNumber(lv.step, 0, 5, 0),
    seeds: mapSeeds(save.log, deps),
    nameWishes: mapNameWishes(save.nameWishes, deps),
  };
}

export function planV2Import(save: V2Save, facts: FactsState, deps: V2ImportDeps): V2Plan {
  const draft = mapV2(save, deps);
  if (draft.babies.length === 0) return { status: 'empty' };
  if (hasFact(facts, draft)) return { status: 'already', hash: draft.hash };
  return { status: 'new', draft, babies: draft.babies.length };
}
```

`src/core/save/export.ts`:

```ts
// The save file: export format and the parser that also recognises a v2 save from move.html.
import { isPlainObject } from '../checks.ts';
import type { GameEvent } from '../events.ts';
import { sortEvents } from '../merge.ts';
import { isV2Save } from './v2.ts';
import type { V2Save } from './v2.ts';

export const EXPORT_FORMAT = 'moon-meadow-save';
export type ExportFile = { format: typeof EXPORT_FORMAT; v: 1; exportedAt: number; events: GameEvent[] };
export type ParsedSave =
  | { kind: 'v3'; events: unknown[]; exportedAt: number }
  | { kind: 'v2'; save: V2Save }
  | { kind: 'invalid'; reason: string };

export function buildExport(events: readonly GameEvent[], now: number): ExportFile {
  return { format: EXPORT_FORMAT, v: 1, exportedAt: now, events: sortEvents(events) };
}

export function exportFileName(now: number): string {
  return `moon-meadow-${new Date(now).toISOString().slice(0, 10)}.json`;
}

export function parseSaveFile(text: string): ParsedSave {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { kind: 'invalid', reason: 'This file is not a save file.' };
  }
  if (isPlainObject(data) && data.format === EXPORT_FORMAT) {
    if (data.v !== 1 || !Array.isArray(data.events)) return { kind: 'invalid', reason: 'This save file is from a newer version of the game.' };
    return { kind: 'v3', events: data.events, exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : 0 };
  }
  if (isV2Save(data)) return { kind: 'v2', save: data };
  return { kind: 'invalid', reason: 'This file is not a Moon Meadow or Unicorn Egg Nest save.' };
}
```

- [ ] **Step 5: Keep Emma's real v2 export out of git**

Append to the repo root `.gitignore`:

```
# Emma's real v2 export, used as a local test fixture only (spec 6.1)
games/moon-meadow-home/tests/fixtures/local/
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run tests/core/v2.test.ts tests/core/export.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 7: Commit**

```bash
git add .gitignore games/moon-meadow-home/src/core/world/facts.ts games/moon-meadow-home/src/core/save games/moon-meadow-home/tests/fixtures/v2.ts games/moon-meadow-home/tests/core/v2.test.ts games/moon-meadow-home/tests/core/export.test.ts
git commit -m "Add recorded facts, the v2 save mapping and the save file format"
```

**Acceptance:** the fixture maps to 14 babies with stable ids, the same save plans as `already` after import, and odd saves never throw.

### Task A7: World slices

**Files:**
- Create: `src/core/world/visits.ts`, `src/core/world/herd.ts`, `src/core/world/names.ts`, `src/core/world/cosmetics.ts`, `src/core/world/settings.ts`, `src/core/world/index.ts`
- Test: `tests/core/world.test.ts`

**Interfaces:**
- Consumes: `Slice`, `createFolder`, `AnySlice`, `Folder`, `StateOf` (A5); `factsSlice`, `isWinningFact`, `FactsState` (A6); event types (A3); `mapV2` (A6, tests only).
- Produces:
  - `visits.ts`: `VisitRec = { visit; dev; start; tz; end; reason }`, `VisitsState = { list: VisitRec[]; index: Record<string, number> }`, `visitsSlice`, `localDay(t, tz): string`, `visitCount(s)`, `lastVisit(s)`, `daysPlayed(s)`.
  - `herd.ts`: `SASH_SIZE = 10`, `ROW_SIZE = 10`, `PinRef = { pin; kind: 'star' | 'set' | 'moment' | 'sticker'; set; at }`, `Baby` (fields in the code), `HerdState = { babies; order; rowsGranted; rowsBuilt; nameCounts }`, `herdSlice`, `herdSize(h)`, `rowCount(h)`, `doorCount(h)`, `stallOf(h, baby): number | null`, `babyAtDoor(h, door): Baby | null`, `campBabies(h): Baby[]`, `babiesInOrder(h): Baby[]`.
  - `names.ts`: `NAME_LOG_CAP = 200`, `NameBuildRec`, `UnknownName = { spelling; gems; phonemes; count; firstT; lastT; fromV2 }`, `NamesState`, `namesSlice`, `unknownNamesFrom(events: readonly GameEvent[]): UnknownName[]`.
  - `cosmetics.ts`: `DecorRec`, `CosmeticsState = { rowNames; skyNames; decor; v2Gifts }`, `cosmeticsSlice`.
  - `settings.ts`: `SettingsState`, `DiagState = { audioMissing: string[] }`, `settingsSlice`, `diagSlice`, `setting<T>(s, key, fallback): T`.
  - `index.ts`: `CORE_SLICES`, `CoreState`, `createGameFolder<const X extends readonly AnySlice[]>(extra: X): Folder<CoreState & StateOf<X>>`.

Rules in these slices (spec 2.7, 2.8, 4.5): stall n holds the n-th baby in hatch order (fold order of `egg.hatched`, imported babies in v2 order at their import); babies past `rowCount * 10` sleep in the Moonbeam Camp; rows are `max(1, rows the import needed, highest row-<n> built)`; the first `baby.named` per baby wins and a second baby with the same name (case-insensitive) gets ordinal 2; hearts count only where an event says `heart: true`; a sash holds 10 pins and the rest go to the pouch; outfits, favourites, row and sky names, decorations and settings: the latest in fold order wins; a later import of a newer v2 export adds new babies, raises v2 hearts and adds pins for new `pin` stickers, without doubling anyone.

- [ ] **Step 1: Write the failing test**

`tests/core/world.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { factKey, isWinningFact, missingFacts } from '../../src/core/world/facts.ts';
import { babyAtDoor, campBabies, rowCount, stallOf } from '../../src/core/world/herd.ts';
import { daysPlayed, localDay } from '../../src/core/world/visits.ts';
import { setting as readSetting } from '../../src/core/world/settings.ts';
import { unknownNamesFrom } from '../../src/core/world/names.ts';
import { mapV2 } from '../../src/core/save/v2.ts';
import type { V2Save } from '../../src/core/save/v2.ts';
import type { DraftOf, GameEventDraft } from '../../src/core/events.ts';
import { care, fakeDevice, hatch, named, pin, setting } from '../helpers/events.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';

const folder = createGameFolder([]);
const built = (gems: string[], outcome: DraftOf<'name.built'>['outcome']): DraftOf<'name.built'> => ({
  type: 'name.built', visit: 'v1', baby: null, gems, phonemes: gems.join(' '), route: 'gold', outcome, listName: null, strong: false,
});
const done = (plot: string): DraftOf<'building.done'> => ({ type: 'building.done', plot });

describe('facts', () => {
  it('keys each fact type and keeps the earliest in fold order', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    b.add([{ type: 'title.given', title: 'nest-keeper' }], 1000);
    a.add([{ type: 'title.given', title: 'nest-keeper' }], 2000);
    const f = folder.full([...a.events, ...b.events]);
    expect(f.state.facts['title.given']['nest-keeper'].id).toBe('bbbbbbbb:1');
    expect(isWinningFact(f.state.facts, b.events[0])).toBe(true);
    expect(isWinningFact(f.state.facts, a.events[0])).toBe(false);
    expect(factKey({ type: 'step.passed', strand: 'r', step: 'R19' })).toBe('r:R19');
    expect(factKey({ type: 'placement.done', strand: 's', current: 'S12', placed: [], side: [] })).toBe('s');
    expect(factKey(setting('x', 1))).toBeNull();
  });

  it('missingFacts returns each unrecorded fact once and drops non-facts', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([{ type: 'step.passed', strand: 's', step: 'S10' }], 1000);
    const facts = folder.full(a.events).state.facts;
    const candidates: GameEventDraft[] = [
      { type: 'step.passed', strand: 's', step: 'S10' }, { type: 'step.passed', strand: 'r', step: 'R19' },
      { type: 'step.passed', strand: 'r', step: 'R19' }, setting('x', 1),
    ];
    expect(missingFacts(facts, candidates)).toEqual([{ type: 'step.passed', strand: 'r', step: 'R19' }]);
  });
});

describe('herd', () => {
  it('hatches babies into stalls in hatch order and sends the eleventh to the Moonbeam Camp', () => {
    const a = fakeDevice('aaaaaaaa');
    for (let i = 1; i <= 11; i++) a.add([hatch(`b${i}`)], 1000 + i);
    const h = folder.full(a.events).state.herd;
    expect(rowCount(h)).toBe(1);
    expect(stallOf(h, 'b1')).toBe(1);
    expect(stallOf(h, 'b10')).toBe(10);
    expect(stallOf(h, 'b11')).toBeNull();
    expect(campBabies(h).map(b => b.id)).toEqual(['b11']);
    a.add([done('row-2')], 2000);
    const h2 = folder.full(a.events).state.herd;
    expect(stallOf(h2, 'b11')).toBe(11);
    expect(babyAtDoor(h2, 11)?.id).toBe('b11');
    expect(babyAtDoor(h2, 12)).toBeNull();
  });

  it('names once, counts duplicate names as royal ordinals, ignores a second naming', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([hatch('b1'), hatch('b2'), named('b1', 'Tim'), named('b2', 'tim'), named('b1', 'Max')], 1000);
    const h = folder.full(a.events).state.herd;
    expect(h.babies.b1).toMatchObject({ name: 'Tim', ordinal: 1, route: 'bell' });
    expect(h.babies.b2).toMatchObject({ name: 'tim', ordinal: 2 });
  });

  it('counts hearts only where the event says so, and pins fill the sash of ten before the pouch', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([hatch('b1'), care('b1'), care('b1', false), { type: 'name.clipHeard', baby: 'b1', heart: true }], 1000);
    for (let i = 1; i <= 12; i++) a.add([pin('b1', `star-${i}`)], 2000 + i);
    const b = folder.full(a.events).state.herd.babies.b1;
    expect(b.hearts).toBe(2);
    expect(b.clipHeard).toBe(true);
    expect(b.sash).toHaveLength(10);
    expect(b.pouch.map(p => p.pin)).toEqual(['star-11', 'star-12']);
  });

  it('cosmetic fields: the latest in fold order wins', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([hatch('b1')], 1000);
    b.add([{ type: 'outfit.saved', baby: 'b1', outfit: { hat: 'crown' } }], 3000);
    a.add([{ type: 'outfit.saved', baby: 'b1', outfit: { hat: 'bow' } }, { type: 'row.named', row: 1, name: 'Rose Row' }], 2000);
    const f = folder.full([...a.events, ...b.events]);
    expect(f.state.herd.babies.b1.outfit).toEqual({ hat: 'crown' });
    expect(f.state.cosmetics.rowNames).toEqual({ 1: 'Rose Row' });
  });

  it('imports the v2 herd once, with the rows it needs, star pins for pin stickers and gifts', () => {
    const a = fakeDevice('aaaaaaaa');
    const draft = mapV2(makeV2Save() as V2Save, testDeps);
    a.add([draft], 1000);
    a.add([draft], 2000); // the same file again
    const f = folder.full(a.events);
    const h = f.state.herd;
    expect(h.order).toHaveLength(14);
    expect(rowCount(h)).toBe(2);
    expect(stallOf(h, h.order[13])).toBe(14);
    const sam = h.babies[h.order[0]];
    expect(sam).toMatchObject({ name: 'Sam', ordinal: 1, source: 'v2', breed: 'moon', route: 'import' });
    expect(sam.sash.map(p => p.kind)).toEqual(['sticker', 'sticker']);
    expect(h.babies[h.order[7]]).toMatchObject({ name: 'Sam', ordinal: 2 });
    expect(f.state.cosmetics.v2Gifts).toEqual(['hat', 'cup']);
  });

  it('a newer v2 export adds new babies and hearts without doubling anyone', () => {
    const a = fakeDevice('aaaaaaaa');
    const first = makeV2Save();
    a.add([mapV2(first as V2Save, testDeps)], 1000);
    const later = makeV2Save();
    const herd = later.herd as Record<string, unknown>[];
    herd[1].hearts = 5;
    herd[0].stickers = ['pin', 'hat', 'pin', 'pin'];
    herd.push({ id: 15, name: 'zed', c: {}, traits: {}, hearts: 0, stickers: [], night: 6 });
    a.add([mapV2(later as V2Save, testDeps)], 2000);
    const h = folder.full(a.events).state.herd;
    expect(h.order).toHaveLength(15);
    expect(h.babies[h.order[1]].hearts).toBe(5);
    expect(h.babies[h.order[0]].sash).toHaveLength(3);
  });
});

describe('names, visits, settings, diagnostics', () => {
  it('collects unknown names with counts, from builds and from the v2 wishes', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([built(['t', 'a', 'm', 'o'], 'unknown'), built(['f', 'u', 'k'], 'blocked'), built(['t', 'a', 'm', 'o'], 'unknown')], 1000);
    a.add([mapV2(makeV2Save() as V2Save, testDeps)], 2000);
    const s = folder.full(a.events).state.names;
    expect(s.totals).toMatchObject({ unknown: 2, blocked: 1 });
    expect(s.blocked).toHaveLength(1);
    expect(s.unknown.tamo).toMatchObject({ count: 3, firstT: 1000, lastT: 2000, fromV2: true });
    expect(unknownNamesFrom(a.events).map(u => u.spelling)).toEqual(['tamo', 'lunabel']);
  });

  it('visits keep their local day for day counts', () => {
    const a = fakeDevice('aaaaaaaa');
    const day = Date.UTC(2026, 11, 3, 22, 30); // 22:30 UTC is 00:30 the next day in Cyprus (UTC+2)
    a.add([{ type: 'visit.start', visit: 'v1', tz: 120 }], day);
    a.add([{ type: 'visit.end', visit: 'v1', reason: 'goodnight' }], day + 60_000);
    a.add([{ type: 'visit.start', visit: 'v2', tz: 120 }], day + 3_600_000);
    const s = folder.full(a.events).state.visits;
    expect(s.list[0]).toMatchObject({ visit: 'v1', end: day + 60_000, reason: 'goodnight', dev: 'aaaaaaaa' });
    expect(localDay(day, 120)).toBe('2026-12-04');
    expect(daysPlayed(s)).toBe(1);
  });

  it('settings: latest wins; diagnostics list each missing clip once', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([setting('pin', 1234), setting('pin', 4321), { type: 'audio.missing', clip: 'word-hat' }, { type: 'audio.missing', clip: 'word-hat' }], 1000);
    const st = folder.full(a.events).state;
    expect(readSetting(st.settings, 'pin', 0)).toBe(4321);
    expect(readSetting(st.settings, 'missing', 'x')).toBe('x');
    expect(st.diag.audioMissing).toEqual(['word-hat']);
  });
});

describe('merging two devices that played offline', () => {
  it('keeps every baby, pin and name, and folds the same whatever order the logs arrive in', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([hatch('a1'), named('a1', 'Pip'), pin('a1', 'p1')], 1000);
    b.add([hatch('b1'), named('b1', 'Pip'), pin('b1', 'p2'), { type: 'building.done', plot: 'bath-pond' }], 1500);
    a.add([{ type: 'building.done', plot: 'bath-pond' }], 2000);
    const ab = folder.full([...a.events, ...b.events]);
    const ba = folder.full([...b.events, ...a.events]);
    expect(ab).toEqual(ba);
    const h = ab.state.herd;
    expect(h.order).toEqual(['a1', 'b1']);
    expect(h.babies.a1).toMatchObject({ name: 'Pip', ordinal: 1, sash: [expect.objectContaining({ pin: 'p1' })] });
    expect(h.babies.b1).toMatchObject({ name: 'Pip', ordinal: 2, sash: [expect.objectContaining({ pin: 'p2' })] });
    expect(ab.state.facts['building.done']['bath-pond'].id).toBe('bbbbbbbb:4');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/core/world.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/world/index.ts".

- [ ] **Step 3: Write the implementation**

`src/core/world/visits.ts`:

```ts
// Visits: start, end and time zone, for day boundaries, the 4 hour rule and "days together".
import type { Slice } from '../fold/engine.ts';

export type VisitRec = { visit: string; dev: string; start: number; tz: number; end: number | null; reason: string | null };
export type VisitsState = { list: VisitRec[]; index: Record<string, number> };

export const visitsSlice: Slice<'visits', VisitsState> = {
  name: 'visits',
  version: '1',
  init: () => ({ list: [], index: {} }),
  apply(s, e) {
    if (e.type === 'visit.start' && !Object.hasOwn(s.index, e.visit)) {
      s.index[e.visit] = s.list.length;
      s.list.push({ visit: e.visit, dev: e.dev, start: e.t, tz: e.tz, end: null, reason: null });
    } else if (e.type === 'visit.end' && Object.hasOwn(s.index, e.visit)) {
      const rec = s.list[s.index[e.visit]];
      if (rec.end === null) { rec.end = e.t; rec.reason = e.reason; }
    }
    return s;
  },
};

/** The local calendar day of a moment, as YYYY-MM-DD, using a time zone offset in minutes east of UTC. */
export function localDay(t: number, tz: number): string {
  return new Date(t + tz * 60_000).toISOString().slice(0, 10);
}

export const visitCount = (s: VisitsState): number => s.list.length;
export const lastVisit = (s: VisitsState): VisitRec | null => s.list[s.list.length - 1] ?? null;
export function daysPlayed(s: VisitsState): number {
  return new Set(s.list.map(v => localDay(v.start, v.tz))).size;
}
```

`src/core/world/herd.ts`:

```ts
// The herd: babies, names, hearts, pins, stalls and the Moonbeam Camp.
import type { Colours, EggLook, GameEvent, NameRoute, Traits } from '../events.ts';
import type { Slice } from '../fold/engine.ts';
import { isWinningFact } from './facts.ts';
import type { FactsState } from './facts.ts';

export const SASH_SIZE = 10;
export const ROW_SIZE = 10;

export type PinRef = { pin: string; kind: 'star' | 'set' | 'moment' | 'sticker'; set: string | null; at: string };
export type Baby = {
  id: string;
  name: string | null;
  gems: string[];
  route: NameRoute | null;
  /** 1 for the first baby with this name, 2 for "the Second", and so on. 0 while unnamed. */
  ordinal: number;
  colours: Colours;
  traits: Traits;
  breed: string;
  kind: string;
  egg: EggLook | 'v2';
  source: 'nest' | 'building' | 'row' | 'v2';
  hatchedAt: number;
  v2Night: number | null;
  /** Hearts brought from v2. hearts = v2Hearts + hearts earned in v3. */
  v2Hearts: number;
  hearts: number;
  sash: PinRef[];
  pouch: PinRef[];
  stickers: string[];
  outfit: Record<string, string | null>;
  favourite: boolean;
  clipHeard: boolean;
};
export type HerdState = {
  babies: Record<string, Baby>;
  /** Baby ids in hatch order. Stall n holds order[n - 1]. */
  order: string[];
  rowsGranted: number;
  rowsBuilt: number;
  nameCounts: Record<string, number>;
};

const ROW_PLOT_RE = /^row-(\d+)$/;

function giveName(s: HerdState, b: Baby, name: string, gems: string[], route: NameRoute): void {
  const k = name.toLowerCase();
  s.nameCounts[k] = (s.nameCounts[k] ?? 0) + 1;
  b.name = name; b.gems = gems; b.route = route; b.ordinal = s.nameCounts[k];
}

function addPin(b: Baby, pin: PinRef): void {
  (b.sash.length < SASH_SIZE ? b.sash : b.pouch).push(pin);
}

function heart(s: HerdState, baby: string | null, on: boolean): void {
  if (on && baby && Object.hasOwn(s.babies, baby)) s.babies[baby].hearts++;
}

function applyImport(s: HerdState, e: Extract<GameEvent, { type: 'import.v2' }>): void {
  for (const v of e.babies) {
    const existing = Object.hasOwn(s.babies, v.baby) ? s.babies[v.baby] : null;
    if (existing) {
      const extra = Math.max(0, v.hearts - existing.v2Hearts);
      existing.v2Hearts += extra; existing.hearts += extra;
      const before = existing.stickers.filter(x => x === 'pin').length;
      if (v.stickers.length > existing.stickers.length) existing.stickers = [...v.stickers];
      const after = existing.stickers.filter(x => x === 'pin').length;
      for (let i = before; i < after; i++) addPin(existing, { pin: `v2-pin-${i + 1}`, kind: 'sticker', set: null, at: e.id });
      continue;
    }
    const b: Baby = {
      id: v.baby, name: null, gems: [], route: null, ordinal: 0, colours: { ...v.colours }, traits: { ...v.traits },
      breed: 'moon', kind: 'moon', egg: 'v2', source: 'v2', hatchedAt: e.t, v2Night: v.night,
      v2Hearts: v.hearts, hearts: v.hearts, sash: [], pouch: [], stickers: [...v.stickers], outfit: {}, favourite: false, clipHeard: false,
    };
    if (v.name) giveName(s, b, v.name, v.gems, 'import');
    let pins = 0;
    for (const st of v.stickers) if (st === 'pin') addPin(b, { pin: `v2-pin-${++pins}`, kind: 'sticker', set: null, at: e.id });
    s.babies[b.id] = b;
    s.order.push(b.id);
  }
  s.rowsGranted = Math.max(s.rowsGranted, Math.ceil(s.order.length / ROW_SIZE));
}

export const herdSlice: Slice<'herd', HerdState> = {
  name: 'herd',
  version: '1',
  init: () => ({ babies: {}, order: [], rowsGranted: 0, rowsBuilt: 0, nameCounts: {} }),
  apply(s, e, ctx) {
    const facts = ctx.get<FactsState>('facts');
    switch (e.type) {
      case 'egg.hatched':
        if (!Object.hasOwn(s.babies, e.baby)) {
          s.babies[e.baby] = {
            id: e.baby, name: null, gems: [], route: null, ordinal: 0, colours: { ...e.colours }, traits: { ...e.traits },
            breed: e.breed, kind: e.kind, egg: e.egg, source: e.source, hatchedAt: e.t, v2Night: null,
            v2Hearts: 0, hearts: 0, sash: [], pouch: [], stickers: [], outfit: {}, favourite: false, clipHeard: false,
          };
          s.order.push(e.baby);
        }
        break;
      case 'baby.named':
        if (isWinningFact(facts, e) && Object.hasOwn(s.babies, e.baby) && s.babies[e.baby].name === null) {
          giveName(s, s.babies[e.baby], e.name, e.gems, e.route);
        }
        break;
      case 'import.v2':
        if (isWinningFact(facts, e)) applyImport(s, e);
        break;
      case 'learn.result': heart(s, e.baby, e.heart); break;
      case 'care.done': heart(s, e.baby, e.heart); break;
      case 'name.clipHeard':
        if (Object.hasOwn(s.babies, e.baby)) { s.babies[e.baby].clipHeard = true; heart(s, e.baby, e.heart); }
        break;
      case 'pin.given':
        if (Object.hasOwn(s.babies, e.baby)) addPin(s.babies[e.baby], { pin: e.pin, kind: e.kind, set: e.set, at: e.id });
        break;
      case 'outfit.saved':
        if (Object.hasOwn(s.babies, e.baby)) s.babies[e.baby].outfit = { ...e.outfit };
        break;
      case 'favourite.set':
        if (Object.hasOwn(s.babies, e.baby)) s.babies[e.baby].favourite = e.on;
        break;
      case 'building.done': {
        const m = ROW_PLOT_RE.exec(e.plot);
        if (m) s.rowsBuilt = Math.max(s.rowsBuilt, Number(m[1]));
        break;
      }
      default:
        break;
    }
    return s;
  },
};

export const herdSize = (h: HerdState): number => h.order.length;
export const rowCount = (h: HerdState): number => Math.max(1, h.rowsGranted, h.rowsBuilt);
export const doorCount = (h: HerdState): number => rowCount(h) * ROW_SIZE;

/** The stall door (1-based) of a baby, or null when it sleeps in the Moonbeam Camp or is unknown. */
export function stallOf(h: HerdState, baby: string): number | null {
  const i = h.order.indexOf(baby);
  return i >= 0 && i < doorCount(h) ? i + 1 : null;
}

export function babyAtDoor(h: HerdState, door: number): Baby | null {
  if (!Number.isInteger(door) || door < 1 || door > doorCount(h)) return null;
  const id = h.order[door - 1];
  return id ? h.babies[id] : null;
}

export function campBabies(h: HerdState): Baby[] {
  return h.order.slice(doorCount(h)).map(id => h.babies[id]);
}

export function babiesInOrder(h: HerdState): Baby[] {
  return h.order.map(id => h.babies[id]);
}
```

`src/core/world/names.ts`:

```ts
// Name builds for the parent corner and the unknown names the generator should add.
import type { GameEvent, NameOutcome, NameRoute } from '../events.ts';
import type { Slice } from '../fold/engine.ts';
import { createFolder } from '../fold/engine.ts';
import { factsSlice, isWinningFact } from './facts.ts';
import type { FactsState } from './facts.ts';

export const NAME_LOG_CAP = 200;

export type NameBuildRec = {
  at: string; t: number; baby: string | null; gems: string[]; phonemes: string; route: NameRoute;
  outcome: NameOutcome; listName: string | null; strong: boolean;
};
export type UnknownName = {
  spelling: string; gems: string[]; phonemes: string; count: number; firstT: number; lastT: number; fromV2: boolean;
};
export type NamesState = {
  recent: NameBuildRec[];
  blocked: NameBuildRec[];
  unknown: Record<string, UnknownName>;
  totals: Record<NameOutcome, number>;
};

function pushCapped<T>(list: T[], item: T): void {
  list.push(item);
  if (list.length > NAME_LOG_CAP) list.shift();
}

function addUnknown(s: NamesState, gems: string[], phonemes: string, t: number, fromV2: boolean): void {
  const spelling = gems.join('');
  if (!spelling) return;
  const u = s.unknown[spelling];
  if (u) { u.count++; u.lastT = Math.max(u.lastT, t); u.fromV2 ||= fromV2; }
  else s.unknown[spelling] = { spelling, gems: [...gems], phonemes, count: 1, firstT: t, lastT: t, fromV2 };
}

export const namesSlice: Slice<'names', NamesState> = {
  name: 'names',
  version: '1',
  init: () => ({ recent: [], blocked: [], unknown: {}, totals: { 'no-vowel': 0, blocked: 0, list: 0, unknown: 0, chosen: 0 } }),
  apply(s, e, ctx) {
    if (e.type === 'name.built') {
      const rec: NameBuildRec = {
        at: e.id, t: e.t, baby: e.baby, gems: [...e.gems], phonemes: e.phonemes, route: e.route,
        outcome: e.outcome, listName: e.listName, strong: e.strong,
      };
      pushCapped(s.recent, rec);
      s.totals[e.outcome]++;
      if (e.outcome === 'blocked') pushCapped(s.blocked, rec);
      if (e.outcome === 'unknown') addUnknown(s, e.gems, e.phonemes, e.t, false);
    } else if (e.type === 'import.v2' && isWinningFact(ctx.get<FactsState>('facts'), e)) {
      for (const w of e.nameWishes) addUnknown(s, w.gems, w.phonemes, e.t, true);
    }
    return s;
  },
};

const unknownFolder = createFolder([factsSlice, namesSlice] as const);

/** Unknown names in a log, oldest first. Used by the save server and by names:pull. */
export function unknownNamesFrom(events: readonly GameEvent[]): UnknownName[] {
  const { state } = unknownFolder.full(events);
  return Object.values(state.names.unknown).sort((a, b) => a.firstT - b.firstT || a.spelling.localeCompare(b.spelling));
}
```

`src/core/world/cosmetics.ts`:

```ts
// Cosmetic home state. The latest event in fold order wins per field.
import type { Slice } from '../fold/engine.ts';
import { isWinningFact } from './facts.ts';
import type { FactsState } from './facts.ts';

export type DecorRec = { item: string; area: string; x: number; y: number };
export type CosmeticsState = {
  rowNames: Record<string, string>;
  skyNames: Record<string, string>;
  decor: Record<string, DecorRec>;
  /** Gifts from the v2 jar, shown as decorations in the meadow. */
  v2Gifts: string[];
};

export const cosmeticsSlice: Slice<'cosmetics', CosmeticsState> = {
  name: 'cosmetics',
  version: '1',
  init: () => ({ rowNames: {}, skyNames: {}, decor: {}, v2Gifts: [] }),
  apply(s, e, ctx) {
    switch (e.type) {
      case 'row.named': s.rowNames[String(e.row)] = e.name; break;
      case 'sky.named': s.skyNames[String(e.sky)] = e.name; break;
      case 'decor.placed': s.decor[e.decor] = { item: e.item, area: e.area, x: e.x, y: e.y }; break;
      case 'import.v2':
        if (isWinningFact(ctx.get<FactsState>('facts'), e) && e.gifts.length > s.v2Gifts.length) s.v2Gifts = [...e.gifts];
        break;
      default: break;
    }
    return s;
  },
};
```

`src/core/world/settings.ts`:

```ts
// Parent settings (latest wins per key) and diagnostics for the parent corner.
import type { Scalar } from '../events.ts';
import type { Slice } from '../fold/engine.ts';

export type SettingsState = Record<string, Scalar>;
export type DiagState = { audioMissing: string[] };

export const settingsSlice: Slice<'settings', SettingsState> = {
  name: 'settings',
  version: '1',
  init: () => ({}),
  apply(s, e) {
    if (e.type === 'settings.set') s[e.key] = e.value;
    return s;
  },
};

export const diagSlice: Slice<'diag', DiagState> = {
  name: 'diag',
  version: '1',
  init: () => ({ audioMissing: [] }),
  apply(s, e) {
    if (e.type === 'audio.missing' && !s.audioMissing.includes(e.clip)) s.audioMissing.push(e.clip);
    return s;
  },
};

export function setting<T extends Scalar>(s: SettingsState, key: string, fallback: T): T {
  return (Object.hasOwn(s, key) ? s[key] : fallback) as T;
}
```

`src/core/world/index.ts`:

```ts
// The core slices, in fold order. Facts come first, because other slices ask whether an event won its key.
import { createFolder } from '../fold/engine.ts';
import type { AnySlice, Folder, StateOf } from '../fold/engine.ts';
import { cosmeticsSlice } from './cosmetics.ts';
import { factsSlice } from './facts.ts';
import { herdSlice } from './herd.ts';
import { namesSlice } from './names.ts';
import { diagSlice, settingsSlice } from './settings.ts';
import { visitsSlice } from './visits.ts';

export const CORE_SLICES = [factsSlice, visitsSlice, herdSlice, namesSlice, cosmeticsSlice, settingsSlice, diagSlice] as const;
export type CoreState = StateOf<typeof CORE_SLICES>;

/** The game's folder: the core slices, then the slices of other workstreams (learner, plots, openings, ...). */
export function createGameFolder<const X extends readonly AnySlice[]>(extra: X): Folder<CoreState & StateOf<X>> {
  return createFolder([...CORE_SLICES, ...extra]) as unknown as Folder<CoreState & StateOf<X>>;
}
```

- [ ] **Step 4: Run all core tests and the type check**

Run: `npx vitest run tests/core && npx tsc --noEmit`
Expected: PASS, 57 tests in 9 files. No type errors.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/world games/moon-meadow-home/tests/core/world.test.ts
git commit -m "Add the world slices: herd, stalls, pins, names, visits, cosmetics and settings"
```

**Acceptance:** two devices that played offline fold to the same state in either order, with every baby, pin and name kept; the v2 import gives 14 babies, 2 rows, star pins for pin stickers and the gifts.

### Task A8: Storage backends

**Files:**
- Create: `src/save/backend.ts`, `src/save/idb.ts`
- Test: `tests/save/idb.test.ts`

**Interfaces:**
- Consumes: `GameEvent` (A3), `DeviceMeta` (A3), `Snapshot` (A5), `idb@8.0.3`.
- Produces: `SyncState = 0 | 1 | 2`, `EventRow = { id: string; e: GameEvent; s: SyncState }`, `QuarantineRow = { id; raw; reason; at }`, `SyncMeta = { cursor: number; lastSuccess: number | null; lastError: string | null }`, `PairingMeta = { token: string; family: string; pairedAt: number }`, `MetaValues`, `MetaKey`, `class SeqConflictError`, `interface Backend` (methods in the code), `memoryBackend(): Backend`; `DB_NAME = 'moon-meadow'`, `DB_VERSION = 1`, `openIdbBackend(name?: string): Promise<Backend>`.

The IndexedDB layout is spec 4.4: one database `moon-meadow` with stores `events` (key: event id, index `s` for sync state), `quarantine` and `meta` (`device`, `snapshot`, `sync`, `pairing`, `export`). `putLocal` writes the events and the device meta in one transaction and refuses when the stored `nextSeq` moved, which catches a second tab.

- [ ] **Step 1: Check the dependencies**

Run: `npm ls idb fake-indexeddb`
Expected: `idb@8.0.3` and `fake-indexeddb@6.2.5`. If either is missing: `npm install --save-exact idb@8.0.3 && npm install --save-exact -D fake-indexeddb@6.2.5`, then `git add games/moon-meadow-home/package.json games/moon-meadow-home/package-lock.json && git commit -m "Add idb and fake-indexeddb"`.

- [ ] **Step 2: Write the failing test**

`tests/save/idb.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openIdbBackend } from '../../src/save/idb.ts';
import { memoryBackend, SeqConflictError } from '../../src/save/backend.ts';
import type { Backend } from '../../src/save/backend.ts';
import { uuid4 } from '../../src/core/ids.ts';
import { fakeDevice, setting } from '../helpers/events.ts';

const backends: [string, () => Promise<Backend>][] = [
  ['idb', () => openIdbBackend(`test-${uuid4()}`)],
  ['memory', async () => memoryBackend()],
];

describe.each(backends)('%s backend', (_name, open) => {
  it('writes events and the device meta together, and refuses a stale sequence', async () => {
    const b = await open();
    const d = fakeDevice('aaaaaaaa');
    const evs = d.add([setting('x', 1), setting('x', 2)], 1000);
    await b.putLocal(evs.map(e => ({ id: e.id, e, s: 0 })), d.meta, 1);
    expect((await b.allEvents()).map(e => e.id).sort()).toEqual(['aaaaaaaa:1', 'aaaaaaaa:2']);
    expect(await b.getMeta('device')).toEqual(d.meta);
    const more = d.add([setting('x', 3)], 2000);
    await expect(b.putLocal(more.map(e => ({ id: e.id, e, s: 0 })), d.meta, 1)).rejects.toBeInstanceOf(SeqConflictError);
    expect(await b.allEvents()).toHaveLength(2);
    await b.putLocal(more.map(e => ({ id: e.id, e, s: 0 })), d.meta, 3);
    expect(await b.allEvents()).toHaveLength(3);
    b.close();
  });

  it('stores remote rows once and tracks their sync state', async () => {
    const b = await open();
    const d = fakeDevice('bbbbbbbb');
    const evs = d.add([setting('y', 1), setting('y', 2), setting('y', 3)], 1000);
    expect(await b.putRemote(evs.slice(0, 2).map(e => ({ id: e.id, e, s: 0 })))).toEqual(['bbbbbbbb:1', 'bbbbbbbb:2']);
    expect(await b.putRemote(evs.map(e => ({ id: e.id, e, s: 1 })))).toEqual(['bbbbbbbb:3']);
    expect(await b.countState(0)).toBe(2);
    await b.setState(['bbbbbbbb:1'], 1);
    expect((await b.rowsWithState(0, 10)).map(r => r.id)).toEqual(['bbbbbbbb:2']);
    await b.setState(['bbbbbbbb:2'], 2);
    expect(await b.countState(2)).toBe(1);
    await b.resetStates();
    expect(await b.countState(0)).toBe(3);
    b.close();
  });

  it('keeps quarantine and meta, and clears everything', async () => {
    const b = await open();
    await b.putQuarantine([{ id: 'q1', raw: { junk: 1 }, reason: 'bad id', at: 5 }]);
    await b.setMeta('export', { at: 9 });
    expect(await b.allQuarantine()).toEqual([{ id: 'q1', raw: { junk: 1 }, reason: 'bad id', at: 5 }]);
    expect(await b.getMeta('export')).toEqual({ at: 9 });
    await b.deleteQuarantine(['q1']);
    expect(await b.allQuarantine()).toEqual([]);
    await b.clear();
    expect(await b.getMeta('export')).toBeUndefined();
    b.close();
  });
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx vitest run tests/save/idb.test.ts`
Expected: FAIL, "Failed to load url ../../src/save/idb.ts".

- [ ] **Step 4: Write the implementation**

`src/save/backend.ts`:

```ts
// Storage behind the game data: IndexedDB in the browser, memory when IndexedDB is not there.
import type { GameEvent } from '../core/events.ts';
import type { DeviceMeta } from '../core/factory.ts';
import type { Snapshot } from '../core/fold/snapshot.ts';

/** s: 0 = not on the server yet, 1 = on the server, 2 = the server refused it. */
export type SyncState = 0 | 1 | 2;
export type EventRow = { id: string; e: GameEvent; s: SyncState };
export type QuarantineRow = { id: string; raw: unknown; reason: string; at: number };
export type SyncMeta = { cursor: number; lastSuccess: number | null; lastError: string | null };
export type PairingMeta = { token: string; family: string; pairedAt: number };
export type MetaValues = {
  device: DeviceMeta;
  snapshot: Snapshot;
  sync: SyncMeta;
  pairing: PairingMeta;
  export: { at: number };
};
export type MetaKey = keyof MetaValues;

export class SeqConflictError extends Error {
  constructor() {
    super('Another tab wrote events for this device.');
    this.name = 'SeqConflictError';
  }
}

export interface Backend {
  readonly kind: 'idb' | 'memory';
  /** Writes rows and the device meta in one transaction. Throws SeqConflictError when the stored nextSeq is not `expectedNextSeq`. */
  putLocal(rows: readonly EventRow[], device: DeviceMeta, expectedNextSeq: number): Promise<void>;
  /** Stores rows whose id is new. Returns the ids that were new. */
  putRemote(rows: readonly EventRow[]): Promise<string[]>;
  allEvents(): Promise<GameEvent[]>;
  rowsWithState(s: SyncState, limit: number): Promise<EventRow[]>;
  setState(ids: readonly string[], s: SyncState): Promise<void>;
  /** Marks every stored event as not on the server, for a new pairing. */
  resetStates(): Promise<void>;
  countState(s: SyncState): Promise<number>;
  getMeta<K extends MetaKey>(k: K): Promise<MetaValues[K] | undefined>;
  setMeta<K extends MetaKey>(k: K, v: MetaValues[K]): Promise<void>;
  deleteMeta(k: MetaKey): Promise<void>;
  putQuarantine(rows: readonly QuarantineRow[]): Promise<void>;
  allQuarantine(): Promise<QuarantineRow[]>;
  deleteQuarantine(ids: readonly string[]): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

export function memoryBackend(): Backend {
  const events = new Map<string, EventRow>();
  const meta = new Map<string, unknown>();
  const quarantine = new Map<string, QuarantineRow>();
  const copy = <T>(x: T): T => structuredClone(x);
  return {
    kind: 'memory',
    async putLocal(rows, device, expected) {
      const stored = meta.get('device') as DeviceMeta | undefined;
      if (stored && stored.nextSeq !== expected) throw new SeqConflictError();
      for (const r of rows) events.set(r.id, copy(r));
      meta.set('device', copy(device));
    },
    async putRemote(rows) {
      const added: string[] = [];
      for (const r of rows) if (!events.has(r.id)) { events.set(r.id, copy(r)); added.push(r.id); }
      return added;
    },
    async allEvents() { return [...events.values()].map(r => copy(r.e)); },
    async rowsWithState(s, limit) { return [...events.values()].filter(r => r.s === s).slice(0, limit).map(copy); },
    async setState(ids, s) { for (const id of ids) { const r = events.get(id); if (r) r.s = s; } },
    async resetStates() { for (const r of events.values()) r.s = 0; },
    async countState(s) { return [...events.values()].filter(r => r.s === s).length; },
    async getMeta(k) { return meta.has(k) ? copy(meta.get(k)) as never : undefined; },
    async setMeta(k, v) { meta.set(k, copy(v)); },
    async deleteMeta(k) { meta.delete(k); },
    async putQuarantine(rows) { for (const r of rows) quarantine.set(r.id, copy(r)); },
    async allQuarantine() { return [...quarantine.values()].map(copy); },
    async deleteQuarantine(ids) { for (const id of ids) quarantine.delete(id); },
    async clear() { events.clear(); meta.clear(); quarantine.clear(); },
    close() {},
  };
}
```

`src/save/idb.ts`:

```ts
// The IndexedDB backend: one versioned database, "moon-meadow", opened with idb.
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { DeviceMeta } from '../core/factory.ts';
import { SeqConflictError } from './backend.ts';
import type { Backend, EventRow, QuarantineRow } from './backend.ts';

export const DB_NAME = 'moon-meadow';
export const DB_VERSION = 1;

interface MoonDb extends DBSchema {
  events: { key: string; value: EventRow; indexes: { s: number } };
  quarantine: { key: string; value: QuarantineRow };
  meta: { key: string; value: unknown };
}

export async function openIdbBackend(name: string = DB_NAME): Promise<Backend> {
  let db: IDBPDatabase<MoonDb> | null = null;
  db = await openDB<MoonDb>(name, DB_VERSION, {
    upgrade(up) {
      const events = up.createObjectStore('events', { keyPath: 'id' });
      events.createIndex('s', 's');
      up.createObjectStore('quarantine', { keyPath: 'id' });
      up.createObjectStore('meta');
    },
    blocking() { db?.close(); },
  });
  const d = db;
  return {
    kind: 'idb',
    async putLocal(rows, device, expected) {
      const tx = d.transaction(['events', 'meta'], 'readwrite');
      const stored = (await tx.objectStore('meta').get('device')) as DeviceMeta | undefined;
      if (stored && stored.nextSeq !== expected) {
        tx.done.catch(() => {});
        tx.abort();
        throw new SeqConflictError();
      }
      const store = tx.objectStore('events');
      await Promise.all([...rows.map(r => store.put(r)), tx.objectStore('meta').put(device, 'device'), tx.done]);
    },
    async putRemote(rows) {
      const tx = d.transaction('events', 'readwrite');
      const added: string[] = [];
      for (const r of rows) {
        if ((await tx.store.getKey(r.id)) === undefined) { await tx.store.add(r); added.push(r.id); }
      }
      await tx.done;
      return added;
    },
    async allEvents() { return (await d.getAll('events')).map(r => r.e); },
    async rowsWithState(s, limit) { return d.getAllFromIndex('events', 's', s, limit); },
    async setState(ids, s) {
      const tx = d.transaction('events', 'readwrite');
      for (const id of ids) {
        const r = await tx.store.get(id);
        if (r && r.s !== s) await tx.store.put({ ...r, s });
      }
      await tx.done;
    },
    async resetStates() {
      const tx = d.transaction('events', 'readwrite');
      let cursor = await tx.store.openCursor();
      while (cursor) {
        if (cursor.value.s !== 0) await cursor.update({ ...cursor.value, s: 0 });
        cursor = await cursor.continue();
      }
      await tx.done;
    },
    async countState(s) { return d.countFromIndex('events', 's', s); },
    async getMeta(k) { return (await d.get('meta', k)) as never; },
    async setMeta(k, v) { await d.put('meta', v, k); },
    async deleteMeta(k) { await d.delete('meta', k); },
    async putQuarantine(rows) {
      const tx = d.transaction('quarantine', 'readwrite');
      await Promise.all([...rows.map(r => tx.store.put(r)), tx.done]);
    },
    async allQuarantine() { return d.getAll('quarantine'); },
    async deleteQuarantine(ids) {
      const tx = d.transaction('quarantine', 'readwrite');
      await Promise.all([...ids.map(id => tx.store.delete(id)), tx.done]);
    },
    async clear() {
      const tx = d.transaction(['events', 'quarantine', 'meta'], 'readwrite');
      await Promise.all([tx.objectStore('events').clear(), tx.objectStore('quarantine').clear(), tx.objectStore('meta').clear(), tx.done]);
    },
    close() { d.close(); },
  };
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run tests/save/idb.test.ts`
Expected: PASS, 6 tests (3 per backend).

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/save/backend.ts games/moon-meadow-home/src/save/idb.ts games/moon-meadow-home/tests/save/idb.test.ts
git commit -m "Add the IndexedDB and memory storage backends"
```

**Acceptance:** both backends pass the same suite, and a stale sequence write changes nothing.

### Task A9: The game data runtime

**Files:**
- Create: `src/save/game-data.ts`
- Test: `tests/save/game-data.test.ts`

**Interfaces:**
- Consumes: everything from A3 to A8: `stamp`, `observe`, `newDeviceMeta`, `seqOf`, `checkEvent`, `restore`, `snapshotKey`, `toSnapshot`, `buildExport`, `parseSaveFile`, `planV2Import`, `missingFacts`, `memoryBackend`, `SeqConflictError`, `openIdbBackend`.
- Produces:
  - `BACKUP_DUE_MS = 7 days`
  - `type GameDataOptions<St extends { facts: FactsState }> = { folder: Folder<St>; contentHash: string; codeVersion: string; backend?: Backend; now?: () => number; reconcile?: (state: St) => GameEventDraft[]; schedule?: (fn: () => void, ms: number) => void; snapshotEveryMs?: number; retryEveryMs?: number }`
  - `type IngestResult = { added: number; duplicates: number; quarantined: number; refolded: boolean }`
  - `type ImportOutcome = { kind: 'v3'; added; duplicates; quarantined } | { kind: 'v2'; status: 'imported' | 'already' | 'empty'; babies: number } | { kind: 'invalid'; reason: string }`
  - `type SaveStatus = { backend: 'idb' | 'memory'; device: string; events: number; pendingWrites: number; writeError: string | null; lostToOtherTab: boolean; quarantined: number; restoreMode: RestoreMode }`
  - `type BackupState = { lastExport: number | null; lastSync: number | null; due: boolean }`
  - `interface GameData<St>` with `backend`, `device()`, `folded()`, `version()`, `allEvents()`, `subscribe(fn)`, `commit(drafts): GameEvent[]`, `ingest(raw, opts?): Promise<IngestResult>`, `importText(text, deps): Promise<ImportOutcome>`, `exportFile(): ExportFile`, `markExported()`, `backupState()`, `exclude(device, on): GameEvent[]`, `excludeLocalPlay(): Promise<string>`, `retryQuarantine(): Promise<number>`, `flush()`, `status(): SaveStatus`, `reset()`
  - `openDefaultBackend(): Promise<Backend>`, `openGameData<St>(opts): Promise<GameData<St>>`, `attachLifecycle(data: { flush(): Promise<void> }, win?: Window): () => void`

Behaviour: `commit` stamps, folds at once (the screen never waits for storage), records missing facts through `reconcile` (at most 3 rounds), and saves in the background; a failed write keeps the events in memory and retries every 10 s; a `SeqConflictError` marks the tab lost and later commits throw. The snapshot is written at most every 10 s and on `flush`, only when all events are stored; a write that started before a newer change never marks the newer change as saved. `ingest` validates, quarantines bad events, drops duplicates, quarantines unknown events that claim this device's id (they would collide with future sequences), stores the rest and folds. `excludeLocalPlay` saves, switches to a new device id and excludes the old one, which is the restore path after an eviction (spec 4.7). On open, quarantined events are tried again.

- [ ] **Step 1: Write the failing test**

`tests/save/game-data.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openGameData } from '../../src/save/game-data.ts';
import type { GameDataOptions } from '../../src/save/game-data.ts';
import { memoryBackend } from '../../src/save/backend.ts';
import type { Backend } from '../../src/save/backend.ts';
import { openIdbBackend } from '../../src/save/idb.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import type { CoreState } from '../../src/core/world/index.ts';
import { uuid4 } from '../../src/core/ids.ts';
import type { GameEventDraft } from '../../src/core/events.ts';
import { fakeDevice, hatch, named, pin, setting } from '../helpers/events.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';

const folder = createGameFolder([]);

function setup(over: Partial<GameDataOptions<CoreState>> = {}) {
  let t = 1_760_000_000_000;
  const queued: (() => void)[] = [];
  const opts: GameDataOptions<CoreState> = {
    folder, contentHash: 'c1', codeVersion: 'b1', now: () => (t += 1000),
    schedule: fn => { queued.push(fn); }, ...over,
  };
  const runQueued = () => { const fns = queued.splice(0); fns.forEach(f => f()); };
  return { opts, runQueued, open: (backend: Backend) => openGameData({ ...opts, backend }) };
}

describe('game data', () => {
  it('commits, folds at once, saves, and restores from the snapshot after a restart', async () => {
    const name = `t-${uuid4()}`;
    const { open } = setup();
    const a = await open(await openIdbBackend(name));
    expect(a.status()).toMatchObject({ backend: 'idb', events: 0, restoreMode: 'full' });
    a.commit([hatch('b1'), named('b1', 'Pip')]);
    expect(a.folded().state.herd.babies.b1.name).toBe('Pip');
    await a.flush();
    a.backend.close();
    const b = await open(await openIdbBackend(name));
    expect(b.status().restoreMode).toBe('snapshot');
    expect(b.device()).toBe(a.device());
    expect(b.folded().state.herd.babies.b1.name).toBe('Pip');
    b.commit([pin('b1', 'p1')]);
    expect(b.allEvents().map(e => e.id)).toEqual([`${a.device()}:1`, `${a.device()}:2`, `${a.device()}:3`]);
    await b.flush();
    b.backend.close();
  });

  it('refolds when the content changes', async () => {
    const backend = memoryBackend();
    const a = await setup().open(backend);
    a.commit([hatch('b1')]);
    await a.flush();
    const b = await setup({ contentHash: 'c2' }).open(backend);
    expect(b.status().restoreMode).toBe('full');
    expect(b.folded().state.herd.order).toEqual(['b1']);
  });

  it('keeps events in memory while writing fails, retries, and loses nothing', async () => {
    const real = memoryBackend();
    let failures = 2;
    const flaky: Backend = { ...real, putLocal: async (...args) => { if (failures-- > 0) throw new Error('QuotaExceededError'); return real.putLocal(...args); } };
    const { open, runQueued } = setup();
    const d = await open(flaky);
    d.commit([hatch('b1')]);
    await d.flush();
    expect(d.status()).toMatchObject({ pendingWrites: 1, writeError: 'QuotaExceededError' });
    d.commit([hatch('b2')]);
    await d.flush();
    expect(d.status().pendingWrites).toBe(2);
    runQueued();
    await d.flush();
    expect(d.status()).toMatchObject({ pendingWrites: 0, writeError: null });
    expect((await real.allEvents()).length).toBe(2);
  });

  it('stops saving in a tab that another tab overtook', async () => {
    const name = `t-${uuid4()}`;
    const a = await setup().open(await openIdbBackend(name));
    const b = await setup().open(await openIdbBackend(name));
    a.commit([hatch('a1')]);
    await a.flush();
    b.commit([hatch('b1')]);
    await b.flush();
    expect(b.status().lostToOtherTab).toBe(true);
    expect(() => b.commit([hatch('b2')])).toThrow('another tab took over');
    expect(a.status().lostToOtherTab).toBe(false);
  });

  it('ingests remote events once, quarantines bad ones, and refolds', async () => {
    const d = await setup().open(memoryBackend());
    const other = fakeDevice('zzzzzzzz');
    const evs = other.add([hatch('z1'), named('z1', 'Zed')], 5);
    const r = await d.ingest([...evs, evs[0], { id: 'nope' }], { fromServer: true });
    expect(r).toMatchObject({ added: 2, duplicates: 1, quarantined: 1, refolded: false });
    expect(d.folded().state.herd.babies.z1.name).toBe('Zed');
    expect(d.status().quarantined).toBe(1);
    expect(await d.backend.countState(1)).toBe(2);
    const later = d.commit([setting('x', 1)]);
    expect(later[0].hlc > evs[1].hlc).toBe(true);
  });

  it('quarantines events that claim to be from this device but are unknown here', async () => {
    const d = await setup().open(memoryBackend());
    const me = fakeDevice(d.device());
    const evs = me.add([hatch('x')], 5);
    expect(await d.ingest(evs)).toMatchObject({ added: 0, quarantined: 1 });
  });

  it('imports a v2 save once, and a v3 export into another device with the same herd', async () => {
    const a = await setup().open(memoryBackend());
    const text = JSON.stringify(makeV2Save());
    expect(await a.importText(text, testDeps)).toEqual({ kind: 'v2', status: 'imported', babies: 14 });
    expect(await a.importText(text, testDeps)).toEqual({ kind: 'v2', status: 'already', babies: 0 });
    expect(await a.importText('{}', testDeps)).toMatchObject({ kind: 'invalid' });
    const b = await setup().open(memoryBackend());
    const file = JSON.stringify(a.exportFile());
    expect(await b.importText(file, testDeps)).toEqual({ kind: 'v3', added: 1, duplicates: 0, quarantined: 0 });
    expect(await b.importText(file, testDeps)).toEqual({ kind: 'v3', added: 0, duplicates: 1, quarantined: 0 });
    expect(b.folded().state.herd).toEqual(a.folded().state.herd);
    expect(await b.importText(text, testDeps)).toEqual({ kind: 'v2', status: 'already', babies: 0 });
  });

  it('records earned facts once through reconcile', async () => {
    const reconcile = (s: CoreState): GameEventDraft[] => (s.herd.order.length >= 2 ? [{ type: 'title.given', title: 'stable-keeper' }] : []);
    const d = await setup({ reconcile }).open(memoryBackend());
    d.commit([hatch('b1')]);
    d.commit([hatch('b2')]);
    d.commit([hatch('b3')]);
    expect(d.allEvents().filter(e => e.type === 'title.given')).toHaveLength(1);
  });

  it('excludes a fresh start after an eviction and goes on as a new device', async () => {
    const d = await setup().open(memoryBackend());
    d.commit([hatch('fresh')]);
    const old = await d.excludeLocalPlay();
    expect(d.device()).not.toBe(old);
    d.commit([hatch('after')]);
    expect(d.folded().state.herd.order).toEqual(['after']);
    expect(d.folded().excluded).toEqual([old]);
    expect(() => d.exclude(d.device(), true)).toThrow('cannot exclude itself');
  });

  it('says when a backup is due', async () => {
    let t = 1_000_000_000_000;
    const d = await openGameData({ folder, contentHash: 'c', codeVersion: 'b', backend: memoryBackend(), now: () => t });
    expect((await d.backupState()).due).toBe(false);
    d.commit([hatch('b1')]);
    expect((await d.backupState()).due).toBe(true);
    await d.markExported();
    expect(await d.backupState()).toEqual({ lastExport: t, lastSync: null, due: false });
    t += 8 * 24 * 3600 * 1000;
    expect((await d.backupState()).due).toBe(true);
  });

  it('retries quarantined events that pass validation now', async () => {
    const backend = memoryBackend();
    const other = fakeDevice('zzzzzzzz');
    const [ev] = other.add([hatch('z1')], 5);
    await backend.putQuarantine([{ id: ev.id, raw: ev, reason: 'schema v2 is newer than v1', at: 1 }]);
    const d = await setup().open(backend);
    expect(d.folded().state.herd.order).toEqual(['z1']);
    expect(d.status().quarantined).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/save/game-data.test.ts`
Expected: FAIL, "Failed to load url ../../src/save/game-data.ts".

- [ ] **Step 3: Write the implementation**

`src/save/game-data.ts`:

```ts
// The game's data runtime: stamps, folds, saves, snapshots, imports and exports events.
// The game store (src/game.svelte.ts) wraps this; scenes never call it directly.
import { seqOf } from '../core/events.ts';
import type { GameEvent, GameEventDraft } from '../core/events.ts';
import { newDeviceMeta, observe, stamp } from '../core/factory.ts';
import type { DeviceMeta } from '../core/factory.ts';
import type { Folded, Folder } from '../core/fold/engine.ts';
import { restore, snapshotKey, toSnapshot } from '../core/fold/snapshot.ts';
import type { RestoreMode } from '../core/fold/snapshot.ts';
import { checkEvent } from '../core/migrate.ts';
import { buildExport, parseSaveFile } from '../core/save/export.ts';
import type { ExportFile } from '../core/save/export.ts';
import { planV2Import } from '../core/save/v2.ts';
import type { V2ImportDeps } from '../core/save/v2.ts';
import { missingFacts } from '../core/world/facts.ts';
import type { FactsState } from '../core/world/facts.ts';
import { memoryBackend, SeqConflictError } from './backend.ts';
import type { Backend, QuarantineRow } from './backend.ts';
import { openIdbBackend } from './idb.ts';

export const BACKUP_DUE_MS = 7 * 24 * 60 * 60 * 1000;

export type GameDataOptions<St extends { facts: FactsState }> = {
  folder: Folder<St>;
  contentHash: string;
  codeVersion: string;
  backend?: Backend;
  now?: () => number;
  /** Facts the folded state has earned (passed steps, titles). Missing ones are recorded once, after each fold. */
  reconcile?: (state: St) => GameEventDraft[];
  schedule?: (fn: () => void, ms: number) => void;
  snapshotEveryMs?: number;
  retryEveryMs?: number;
};
export type IngestResult = { added: number; duplicates: number; quarantined: number; refolded: boolean };
export type ImportOutcome =
  | { kind: 'v3'; added: number; duplicates: number; quarantined: number }
  | { kind: 'v2'; status: 'imported' | 'already' | 'empty'; babies: number }
  | { kind: 'invalid'; reason: string };
export type SaveStatus = {
  backend: 'idb' | 'memory';
  device: string;
  events: number;
  pendingWrites: number;
  writeError: string | null;
  lostToOtherTab: boolean;
  quarantined: number;
  restoreMode: RestoreMode;
};
export type BackupState = { lastExport: number | null; lastSync: number | null; due: boolean };

export interface GameData<St> {
  readonly backend: Backend;
  device(): string;
  folded(): Folded<St>;
  /** Goes up by one after every change to the folded state. */
  version(): number;
  allEvents(): readonly GameEvent[];
  subscribe(fn: (f: Folded<St>, version: number) => void): () => void;
  /** Stamps drafts, folds them at once and saves them in the background. Throws after another tab took over. */
  commit(drafts: readonly GameEventDraft[]): GameEvent[];
  /** Adds events from a file or the server: validated, deduplicated, stored, folded. Bad ones go to quarantine. */
  ingest(raw: readonly unknown[], opts?: { fromServer: boolean }): Promise<IngestResult>;
  importText(text: string, deps: V2ImportDeps): Promise<ImportOutcome>;
  exportFile(): ExportFile;
  markExported(): Promise<void>;
  backupState(): Promise<BackupState>;
  exclude(device: string, on: boolean): GameEvent[];
  /** Leaves out every event this device made so far and goes on with a new device id. Returns the old id. */
  excludeLocalPlay(): Promise<string>;
  retryQuarantine(): Promise<number>;
  flush(): Promise<void>;
  status(): SaveStatus;
  /** Clears everything stored on this device. The caller reloads the page afterwards. */
  reset(): Promise<void>;
}

export async function openDefaultBackend(): Promise<Backend> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no IndexedDB');
    return await openIdbBackend();
  } catch {
    return memoryBackend();
  }
}

export async function openGameData<St extends { facts: FactsState }>(opts: GameDataOptions<St>): Promise<GameData<St>> {
  const now = opts.now ?? Date.now;
  const schedule = opts.schedule ?? ((fn: () => void, ms: number) => { setTimeout(fn, ms); });
  const snapshotEveryMs = opts.snapshotEveryMs ?? 10_000;
  const retryEveryMs = opts.retryEveryMs ?? 10_000;
  const backend = opts.backend ?? (await openDefaultBackend());
  const key = snapshotKey({ slices: opts.folder.slices, contentHash: opts.contentHash, codeVersion: opts.codeVersion });

  let device: DeviceMeta = (await backend.getMeta('device')) ?? newDeviceMeta();
  const all: GameEvent[] = await backend.allEvents();
  const ids = new Set(all.map(e => e.id));
  device = observe(device, all);
  const ownMax = all.reduce((m, e) => (e.dev === device.dev ? Math.max(m, seqOf(e)) : m), 0);
  if (ownMax >= device.nextSeq) device = { ...device, nextSeq: ownMax + 1 };
  await backend.setMeta('device', device);

  let snap: unknown = null;
  try { snap = await backend.getMeta('snapshot'); } catch { snap = null; }
  const restored = restore(opts.folder, snap, all, key);
  let folded = restored.folded;
  let version = 0;
  let pending: GameEvent[] = [];
  let writing: Promise<void> | null = null;
  let writeError: string | null = null;
  let lost = false;
  // changes counts fold changes; savedChange is the count the stored snapshot reflects
  let changes = restored.mode === 'snapshot' ? 0 : 1;
  let savedChange = 0;
  let lastSnapshotAt = 0;
  let snapshotQueued = false;
  let quarantined = (await backend.allQuarantine()).length;
  const listeners = new Set<(f: Folded<St>, v: number) => void>();

  function emit(): void {
    version++;
    for (const fn of listeners) fn(folded, version);
  }

  function stampAndFold(drafts: readonly GameEventDraft[]): GameEvent[] {
    const r = stamp(device, drafts, now());
    device = r.meta;
    for (const e of r.events) { all.push(e); ids.add(e.id); }
    pending.push(...r.events);
    folded = opts.folder.catchUp(folded, r.events, all).folded;
    changes++;
    return r.events;
  }

  function reconcile(): GameEvent[] {
    const out: GameEvent[] = [];
    if (!opts.reconcile) return out;
    for (let round = 0; round < 3; round++) {
      const extra = missingFacts(folded.state.facts, opts.reconcile(folded.state));
      if (extra.length === 0) break;
      out.push(...stampAndFold(extra));
    }
    return out;
  }

  async function writePending(): Promise<void> {
    while (pending.length > 0 && !lost) {
      const batch = pending.slice();
      const last = batch[batch.length - 1];
      const meta: DeviceMeta = { dev: last.dev, nextSeq: seqOf(last) + 1, hlc: last.hlc };
      try {
        await backend.putLocal(batch.map(e => ({ id: e.id, e, s: 0 as const })), meta, seqOf(batch[0]));
        pending = pending.slice(batch.length);
        writeError = null;
      } catch (err) {
        if (err instanceof SeqConflictError) { lost = true; emit(); return; }
        writeError = err instanceof Error ? err.message : String(err);
        schedule(() => { void requestWrite(); }, retryEveryMs);
        emit();
        return;
      }
    }
    await maybeSnapshot(false);
  }

  function requestWrite(): Promise<void> {
    writing ??= writePending().finally(() => { writing = null; });
    return writing;
  }

  async function maybeSnapshot(force: boolean): Promise<void> {
    if (changes === savedChange || pending.length > 0 || lost) return;
    const wait = lastSnapshotAt + snapshotEveryMs - now();
    if (!force && wait > 0) {
      if (!snapshotQueued) {
        snapshotQueued = true;
        schedule(() => { snapshotQueued = false; void maybeSnapshot(false); }, wait);
      }
      return;
    }
    const at = changes;
    try {
      await backend.setMeta('snapshot', toSnapshot(folded, key, now()));
      lastSnapshotAt = now();
      savedChange = at;
    } catch {
      // a snapshot is only a cache: the next start refolds from the events
    }
  }

  function commit(drafts: readonly GameEventDraft[]): GameEvent[] {
    if (lost) throw new Error('This tab no longer saves, because another tab took over.');
    if (drafts.length === 0) return [];
    const out = stampAndFold(drafts);
    out.push(...reconcile());
    emit();
    void requestWrite();
    return out;
  }

  async function ingest(raw: readonly unknown[], o: { fromServer: boolean } = { fromServer: false }): Promise<IngestResult> {
    const at = now();
    const valid: GameEvent[] = [];
    const bad: QuarantineRow[] = [];
    const batch = new Set<string>();
    let duplicates = 0;
    raw.forEach((x, i) => {
      const r = checkEvent(x);
      const rawId = typeof (x as { id?: unknown })?.id === 'string' ? ((x as { id: string }).id).slice(0, 80) : `bad-${at}-${i}`;
      if (!r.ok) { bad.push({ id: rawId, raw: x, reason: r.reason, at }); return; }
      const e = r.event;
      if (ids.has(e.id) || batch.has(e.id)) { duplicates++; return; }
      if (e.dev === device.dev) { bad.push({ id: rawId, raw: x, reason: 'an event from this device that this device does not have', at }); return; }
      batch.add(e.id);
      valid.push(e);
    });
    if (bad.length > 0) { await backend.putQuarantine(bad); quarantined += bad.length; }
    const added = new Set(valid.length > 0 ? await backend.putRemote(valid.map(e => ({ id: e.id, e, s: o.fromServer ? 1 as const : 0 as const }))) : []);
    const fresh = valid.filter(e => added.has(e.id) && !ids.has(e.id));
    duplicates += valid.length - fresh.length;
    let refolded = false;
    if (fresh.length > 0) {
      for (const e of fresh) { all.push(e); ids.add(e.id); }
      device = observe(device, fresh);
      const r = opts.folder.catchUp(folded, fresh, all);
      folded = r.folded;
      refolded = r.refolded;
      changes++;
      if (!lost) reconcile();
      emit();
      void requestWrite();
    }
    return { added: fresh.length, duplicates, quarantined: bad.length, refolded };
  }

  async function flush(): Promise<void> {
    await requestWrite();
    await maybeSnapshot(true);
  }

  const data: GameData<St> = {
    backend,
    device: () => device.dev,
    folded: () => folded,
    version: () => version,
    allEvents: () => all,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    commit,
    ingest,
    async importText(text, deps) {
      const p = parseSaveFile(text);
      if (p.kind === 'invalid') return p;
      if (p.kind === 'v3') {
        const r = await ingest(p.events);
        return { kind: 'v3', added: r.added, duplicates: r.duplicates, quarantined: r.quarantined };
      }
      const plan = planV2Import(p.save, folded.state.facts, deps);
      if (plan.status !== 'new') return { kind: 'v2', status: plan.status, babies: 0 };
      commit([plan.draft]);
      await flush();
      return { kind: 'v2', status: 'imported', babies: plan.babies };
    },
    exportFile: () => buildExport(all, now()),
    async markExported() { await backend.setMeta('export', { at: now() }); },
    async backupState() {
      const lastExport = (await backend.getMeta('export'))?.at ?? null;
      const lastSync = (await backend.getMeta('sync'))?.lastSuccess ?? null;
      const latest = Math.max(lastExport ?? 0, lastSync ?? 0);
      return { lastExport, lastSync, due: all.length > 0 && now() - latest > BACKUP_DUE_MS };
    },
    exclude(dev, on) {
      if (dev === device.dev) throw new Error('This device cannot exclude itself. Use excludeLocalPlay.');
      return commit([{ type: 'exclude', device: dev, on }]);
    },
    async excludeLocalPlay() {
      await flush();
      if (pending.length > 0) throw new Error('Saving failed, so the device id cannot change now.');
      const old = device.dev;
      const fresh = newDeviceMeta(device.hlc);
      await backend.setMeta('device', fresh);
      device = fresh;
      commit([{ type: 'exclude', device: old, on: true }]);
      await flush();
      return old;
    },
    async retryQuarantine() {
      const rows = await backend.allQuarantine();
      const fixed = rows.filter(r => checkEvent(r.raw).ok);
      if (fixed.length === 0) return 0;
      await backend.deleteQuarantine(fixed.map(r => r.id));
      quarantined -= fixed.length;
      const r = await ingest(fixed.map(x => x.raw));
      return r.added;
    },
    flush,
    status: () => ({
      backend: backend.kind, device: device.dev, events: all.length, pendingWrites: pending.length, writeError,
      lostToOtherTab: lost, quarantined, restoreMode: restored.mode,
    }),
    async reset() {
      lost = true;
      await backend.clear();
      backend.close();
    },
  };
  await data.retryQuarantine();
  void maybeSnapshot(true);
  return data;
}

/** Saves when Safari hides or leaves the page, so closing the iPad loses nothing that was written in memory. */
export function attachLifecycle(data: { flush(): Promise<void> }, win: Window = window): () => void {
  const onHide = () => { void data.flush(); };
  const onVisibility = () => { if (win.document.visibilityState === 'hidden') void data.flush(); };
  win.addEventListener('pagehide', onHide);
  win.document.addEventListener('visibilitychange', onVisibility);
  return () => {
    win.removeEventListener('pagehide', onHide);
    win.document.removeEventListener('visibilitychange', onVisibility);
  };
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run tests/save/game-data.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/save/game-data.ts games/moon-meadow-home/tests/save/game-data.test.ts
git commit -m "Add the game data runtime: commit, ingest, import, export and snapshots"
```

**Acceptance:** a restart restores from the snapshot, failed writes lose nothing, a second tab stops saving, and a v3 export imported on another device gives the same herd.

### Task A10: Browser helpers

**Files:**
- Create: `src/save/tab-guard.ts`, `src/save/persist.ts`, `src/save/v2-local.ts`, `src/save/file.ts`
- Test: `tests/save/browser-helpers.test.ts`

**Interfaces:**
- Consumes: `uuid4` (A1), `V2_SAVE_KEY` (A6), `exportFileName`, `ExportFile` (A6).
- Produces: `TAB_CHANNEL`, `type TabGuard = { tab: string; close(): void }`, `claimTab(onLost: () => void, channelName?: string): TabGuard`; `type PersistState = 'granted' | 'denied' | 'unavailable'`, `requestPersist(nav?): Promise<PersistState>`; `readV2Local(storage?): string | null`; `saveExportFile(file: ExportFile, nav?, doc?): Promise<'shared' | 'downloaded' | 'cancelled'>`, `readFileText(file: Blob): Promise<string>`.

- [ ] **Step 1: Write the failing test**

`tests/save/browser-helpers.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { claimTab } from '../../src/save/tab-guard.ts';
import { requestPersist } from '../../src/save/persist.ts';
import { readV2Local } from '../../src/save/v2-local.ts';
import { saveExportFile } from '../../src/save/file.ts';
import { buildExport } from '../../src/core/save/export.ts';

const tick = () => new Promise(r => setTimeout(r, 30));

describe('tab guard', () => {
  it('tells the older tab it lost when a newer tab claims', async () => {
    const lostA = vi.fn();
    const lostB = vi.fn();
    const a = claimTab(lostA, 'test-tabs');
    await tick();
    const b = claimTab(lostB, 'test-tabs');
    await tick();
    expect(lostA).toHaveBeenCalledTimes(1);
    expect(lostB).not.toHaveBeenCalled();
    a.close();
    b.close();
  });
});

describe('persist', () => {
  it('is unavailable without navigator.storage.persist, as on plain http', async () => {
    expect(await requestPersist({})).toBe('unavailable');
    expect(await requestPersist(undefined)).toBe('unavailable');
    expect(await requestPersist({ storage: { persist: async () => true } })).toBe('granted');
    expect(await requestPersist({ storage: { persist: async () => false } })).toBe('denied');
    expect(await requestPersist({ storage: { persist: async () => { throw new Error('x'); } } })).toBe('unavailable');
  });
});

describe('v2 local read', () => {
  it('reads the v2 key, and returns null for empty, missing or throwing storage', () => {
    expect(readV2Local({ getItem: k => (k === 'emma-unicorn-egg-nest-v2' ? '{"v":2}' : null) })).toBe('{"v":2}');
    expect(readV2Local({ getItem: () => '  ' })).toBeNull();
    expect(readV2Local(null)).toBeNull();
    expect(readV2Local({ getItem: () => { throw new Error('SecurityError'); } })).toBeNull();
  });
});

describe('save file download', () => {
  it('downloads when the share sheet is missing', async () => {
    const click = vi.fn();
    const el = { href: '', download: '', click, remove: vi.fn() };
    const doc = { createElement: () => el, body: { appendChild: vi.fn() } } as unknown as Document;
    const r = await saveExportFile(buildExport([], Date.UTC(2026, 11, 3)), {}, doc);
    expect(r).toBe('downloaded');
    expect(el.download).toBe('moon-meadow-2026-12-03.json');
    expect(click).toHaveBeenCalled();
  });

  it('shares when the share sheet takes files, and reports a cancel', async () => {
    const share = vi.fn(async () => {});
    expect(await saveExportFile(buildExport([], 0), { canShare: () => true, share })).toBe('shared');
    const cancel = vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); });
    expect(await saveExportFile(buildExport([], 0), { canShare: () => true, share: cancel })).toBe('cancelled');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/save/browser-helpers.test.ts`
Expected: FAIL, "Failed to load url ../../src/save/tab-guard.ts".

- [ ] **Step 3: Write the implementation**

`src/save/tab-guard.ts`:

```ts
// One playing tab per device id. The newest tab wins; older tabs are told to stop saving.
import { uuid4 } from '../core/ids.ts';

export const TAB_CHANNEL = 'moon-meadow-tabs';
export type TabGuard = { readonly tab: string; close(): void };

export function claimTab(onLost: () => void, channelName: string = TAB_CHANNEL): TabGuard {
  const tab = uuid4();
  if (typeof BroadcastChannel === 'undefined') return { tab, close() {} };
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (m: MessageEvent) => {
    const d = m.data as { type?: string; tab?: string } | null;
    if (d?.type === 'claim' && d.tab !== tab) onLost();
  };
  channel.postMessage({ type: 'claim', tab });
  return { tab, close: () => channel.close() };
}
```

`src/save/persist.ts`:

```ts
// Persistent storage. Only exists in secure contexts, so on the Mac's plain http it is 'unavailable'.
export type PersistState = 'granted' | 'denied' | 'unavailable';

export async function requestPersist(nav: { storage?: { persist?: () => Promise<boolean> } } | undefined = globalThis.navigator): Promise<PersistState> {
  try {
    if (!nav?.storage?.persist) return 'unavailable';
    return (await nav.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
```

`src/save/v2-local.ts`:

```ts
// Reads Emma's v2 save straight from localStorage. Works because v3 is served from the same origin as v2.
import { V2_SAVE_KEY } from '../core/save/v2.ts';

export function readV2Local(storage?: Pick<Storage, 'getItem'> | null): string | null {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    const text = s?.getItem(V2_SAVE_KEY) ?? null;
    return text && text.trim() ? text : null;
  } catch {
    return null;
  }
}
```

`src/save/file.ts`:

```ts
// Save files in the browser: the share sheet where it exists (https), a download otherwise (the Mac's http).
import { exportFileName } from '../core/save/export.ts';
import type { ExportFile } from '../core/save/export.ts';

type ShareNav = { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title: string }) => Promise<void> };

export async function saveExportFile(file: ExportFile, nav: ShareNav = globalThis.navigator as ShareNav, doc?: Document): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = exportFileName(file.exportedAt);
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  if (typeof File !== 'undefined' && nav?.canShare && nav.share) {
    const f = new File([blob], name, { type: 'application/json' });
    if (nav.canShare({ files: [f] })) {
      try {
        await nav.share({ files: [f], title: 'Moon Meadow save' });
        return 'shared';
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return 'cancelled';
      }
    }
  }
  const d = doc ?? document;
  const url = URL.createObjectURL(blob);
  const a = d.createElement('a');
  a.href = url;
  a.download = name;
  d.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function readFileText(file: Blob): Promise<string> {
  return file.text();
}
```

- [ ] **Step 4: Run all tests and the type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, 79 tests in 12 files (83 in 13 when Task A11 is already in). No type errors.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/save/tab-guard.ts games/moon-meadow-home/src/save/persist.ts games/moon-meadow-home/src/save/v2-local.ts games/moon-meadow-home/src/save/file.ts games/moon-meadow-home/tests/save/browser-helpers.test.ts
git commit -m "Add the tab guard, persist, v2 local read and save file helpers"
```

**Acceptance:** the newest tab wins, everything degrades cleanly on plain http, and a throwing `localStorage` gives `null`.

### Task A11: The home-network server

**Files:**
- Create: `server/static.ts`, `server/serve.ts`, `server/README.md`
- Modify: `.gitignore` (repo root)
- Test: `tests/server/static.test.ts`

**Interfaces:**
- Consumes: Node standard library only.
- Produces: `static.ts`: `type Mount = { prefix: string; dir: string; csp: boolean }`, `type StaticOptions`, `type Resolved`, `CSP`, `resolvePath(pathname, o): Resolved`, `serveStatic(req, res, pathname, o): void`. `serve.ts`: `type ApiHandler = (req, res, subpath: string) => Promise<void>`, `type ServerOptions = { root; base; gameDir; csp; api? }`, `REPO_ROOT`, `GAME_DIR`, `DEFAULT_BASE = '/games/moon-meadow-home/'`, `createServer(o: ServerOptions): http.Server`. Command: `node games/moon-meadow-home/server/serve.ts` (env `PORT`, `HOST`, `MOON_BASE`, `MOON_CSP`).

This server replaces `python3 -m http.server` for tonight's play: same port 8765, so v2's origin and Emma's v2 save stay where they are, and v3 at `/games/moon-meadow-home/` shares that origin. The path `/games/moon-meadow-home/` maps to `games/moon-meadow-home/dist/`, so source files behind it are never served. Python's server served every file in the repo, the key file included; this one refuses every dot path.

- [ ] **Step 1: Write the failing test**

`tests/server/static.test.ts`:

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../../server/serve.ts';
import { CSP } from '../../server/static.ts';

let dir: string;
let base: string;
let close: () => void;

function write(rel: string, body: string) {
  const f = path.join(dir, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moon-static-'));
  write('index.html', 'menu');
  write('.env', 'FAKE_KEY=secret');
  write('.git/config', 'git');
  write('.data/moon-meadow/families/emma/events.jsonl', '{}');
  write('ideas/v2/index.html', 'v2 game');
  write('shared/audio/phonics/snd-s.mp3', 'mp3');
  write('games/moon-meadow-home/src/core/events.ts', 'source');
  write('games/moon-meadow-home/dist/index.html', 'v3 game');
  write('games/moon-meadow-home/dist/assets/index-abc123.js', 'js');
  write('games/moon-meadow-home/node_modules/x/index.js', 'dep');
  const server = createServer({ root: dir, base: '/games/moon-meadow-home/', gameDir: path.join(dir, 'games/moon-meadow-home/dist'), csp: true });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

const get = (p: string, init?: RequestInit) => fetch(base + p, { redirect: 'manual', ...init });

describe('static server', () => {
  it('serves the repo and the v3 build under its base path', async () => {
    expect(await (await get('/')).text()).toBe('menu');
    expect(await (await get('/ideas/v2/')).text()).toBe('v2 game');
    const v3 = await get('/games/moon-meadow-home/');
    expect(await v3.text()).toBe('v3 game');
    expect(v3.headers.get('content-security-policy')).toBe(CSP);
    expect(v3.headers.get('cache-control')).toBe('no-cache');
    const asset = await get('/games/moon-meadow-home/assets/index-abc123.js');
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect((await get('/shared/audio/phonics/snd-s.mp3')).headers.get('content-type')).toBe('audio/mpeg');
  });

  it('never serves dotfiles, source behind the mount, node_modules or paths outside the root', async () => {
    for (const p of ['/.env', '/%2Eenv', '/.git/config', '/.data/moon-meadow/families/emma/events.jsonl',
      '/games/moon-meadow-home/src/core/events.ts', '/games/moon-meadow-home/node_modules/x/index.js',
      '/ideas/../.env', '/%2e%2e/etc/passwd', '/ideas/%00', '/games/moon-meadow-home/..%2f.env', '/bad%zz']) {
      const r = await get(p);
      expect(r.status, p).toBe(404);
      expect(await r.text()).not.toContain('secret');
    }
  });

  it('redirects folders to a trailing slash, answers 304 and refuses writes', async () => {
    expect((await get('/games/moon-meadow-home')).headers.get('location')).toBe('/games/moon-meadow-home/');
    expect((await get('/ideas/v2')).headers.get('location')).toBe('/ideas/v2/');
    const first = await get('/');
    const again = await get('/', { headers: { 'If-Modified-Since': first.headers.get('last-modified')! } });
    expect(again.status).toBe(304);
    expect((await get('/', { method: 'POST' })).status).toBe(405);
  });

  it('answers 404 on the API path when no save API is mounted', async () => {
    expect((await get('/games/moon-meadow-home/api/health')).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/server/static.test.ts`
Expected: FAIL, "Failed to load url ../../server/serve.ts".

- [ ] **Step 3: Write the implementation**

`server/static.ts`:

```ts
// Static files for the home network: the repo (v2 demos, shared audio) and the v3 build under its base path.
// Never serves dotfiles (.env, .git, .data) or node_modules.
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type Mount = { prefix: string; dir: string; csp: boolean };
export type StaticOptions = { root: string; mounts: Mount[] };
export type Resolved =
  | { kind: 'file'; file: string; mount: Mount | null }
  | { kind: 'redirect'; location: string }
  | { kind: 'missing' };

export const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "media-src 'self' blob:", "connect-src 'self'", "font-src 'self'", "worker-src 'self'", "manifest-src 'self'",
  "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
].join('; ');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const MISSING: Resolved = { kind: 'missing' };

function inside(base: string, target: string): boolean {
  return target === base || target.startsWith(base + path.sep);
}

export function resolvePath(pathname: string, o: StaticOptions): Resolved {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return MISSING; }
  if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('\\')) return MISSING;
  if (decoded.split('/').some(s => s.startsWith('.') || s === 'node_modules')) return MISSING;
  const mount = [...o.mounts].sort((a, b) => b.prefix.length - a.prefix.length).find(m => (decoded + '/').startsWith(m.prefix)) ?? null;
  if (mount && decoded + '/' === mount.prefix) return { kind: 'redirect', location: mount.prefix };
  const base = path.resolve(mount ? mount.dir : o.root);
  const rest = mount ? decoded.slice(mount.prefix.length) : decoded.slice(1);
  let target = path.resolve(base, rest);
  if (!inside(base, target)) return MISSING;
  let st: fs.Stats;
  try { st = fs.statSync(target); } catch { return MISSING; }
  if (st.isDirectory()) {
    if (!decoded.endsWith('/')) return { kind: 'redirect', location: pathname + '/' };
    target = path.join(target, 'index.html');
    try { st = fs.statSync(target); } catch { return MISSING; }
  }
  if (!st.isFile()) return MISSING;
  try {
    if (!inside(fs.realpathSync(base), fs.realpathSync(target))) return MISSING;
  } catch { return MISSING; }
  return { kind: 'file', file: target, mount };
}

export function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string, o: StaticOptions): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const r = resolvePath(pathname, o);
  if (r.kind === 'redirect') { res.writeHead(301, { Location: r.location }).end(); return; }
  if (r.kind === 'missing') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); return; }
  const st = fs.statSync(r.file);
  const ext = path.extname(r.file).toLowerCase();
  const headers: Record<string, string> = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Last-Modified': st.mtime.toUTCString(),
    'Cache-Control': r.mount && pathname.startsWith(r.mount.prefix + 'assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  if (r.mount?.csp && ext === '.html') headers['Content-Security-Policy'] = CSP;
  const since = req.headers['if-modified-since'];
  if (since && Math.floor(st.mtimeMs / 1000) <= Math.floor(Date.parse(since) / 1000)) {
    res.writeHead(304, headers).end();
    return;
  }
  headers['Content-Length'] = String(st.size);
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(r.file).pipe(res);
}
```

`server/serve.ts`:

```ts
// One Node server for the home network: the repo as static files, the v3 build under its base path,
// and (from release 1.3) the save API. Run from the repo root: node games/moon-meadow-home/server/serve.ts
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { serveStatic } from './static.ts';

export type ApiHandler = (req: http.IncomingMessage, res: http.ServerResponse, subpath: string) => Promise<void>;
export type ServerOptions = { root: string; base: string; gameDir: string; csp: boolean; api?: ApiHandler };

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
export const GAME_DIR = path.resolve(import.meta.dirname, '..', process.env.MOON_DIST ?? 'dist');
export const DEFAULT_BASE = '/games/moon-meadow-home/';

export function createServer(o: ServerOptions): http.Server {
  const apiPrefix = o.base + 'api/';
  return http.createServer((req, res) => {
    let pathname: string;
    try { pathname = new URL(req.url ?? '/', 'http://local').pathname; } catch { res.writeHead(400).end(); return; }
    if (pathname.startsWith(apiPrefix)) {
      if (!o.api) { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"no save API on this server"}'); return; }
      o.api(req, res, pathname.slice(apiPrefix.length)).catch(err => {
        console.error('[api]', err);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"server error"}');
      });
      return;
    }
    serveStatic(req, res, pathname, { root: o.root, mounts: [{ prefix: o.base, dir: o.gameDir, csp: o.csp }] });
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8765);
  const host = process.env.HOST ?? '0.0.0.0';
  const base = process.env.MOON_BASE ?? DEFAULT_BASE;
  const server = createServer({ root: REPO_ROOT, base, gameDir: GAME_DIR, csp: process.env.MOON_CSP !== 'off' });
  server.listen(port, host, () => {
    console.log(`Serving ${REPO_ROOT} on http://${host}:${port}/`);
    console.log(`On the iPad: http://${os.hostname().replace(/\.local$/, '')}.local:${port}${base}`);
  });
}
```

- [ ] **Step 4: Write the README**

`server/README.md`:

````markdown
# Moon Meadow server

One Node script serves the whole repo on the home network, the v3 build under `/games/moon-meadow-home/`, and (from release 1.3) the save API. It replaces `python3 -m http.server`. No dependencies: Node 24 runs the TypeScript directly.

## Play on the iPad tonight

1. Build the game: `cd games/moon-meadow-home && npm run build`.
2. Stop any `python3 -m http.server 8765` that still runs. Both want port 8765.
3. From the repo root: `node games/moon-meadow-home/server/serve.ts`. It listens on all interfaces, port 8765, and prints the iPad address.
4. On the iPad, in the same Safari as always:
   - v2: `http://<mac>.local:8765/ideas/opus-5-5-unicorn-egg-nest-v2/`
   - v3: `http://<mac>.local:8765/games/moon-meadow-home/`
   - Moving Day file: `http://<mac>.local:8765/ideas/opus-5-5-unicorn-egg-nest-v2/move.html`
5. Allow incoming connections for `node` when macOS asks.

Keep the address and the port the same. v2 and v3 share this origin, so v3 reads Emma's v2 save directly, and Safari keeps one storage for both.

## What plain http means

- No service worker, no `navigator.storage.persist()`, no share sheet, no `crypto.randomUUID`, no `crypto.subtle`. The game works without them: ids and hashes are pure code, export is a download.
- IndexedDB and localStorage work. Safari deletes a site's storage after 7 days of Safari use without a visit. Playing v2 or v3 counts as a visit for both.
- Until a device is paired with the save API, export in the parent corner is the backup.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8765` | Port |
| `HOST` | `0.0.0.0` | Interface. Use `127.0.0.1` for tests and behind odin's proxy |
| `MOON_BASE` | `/games/moon-meadow-home/` | Base path of the v3 build and the API (`/unicorns/` on odin) |
| `MOON_CSP` | on | `off` drops the Content-Security-Policy header, only to debug a blocked script |
| `MOON_DATA` | `<repo>/.data/moon-meadow` | Save server data (release 1.3) |
| `TRUST_PROXY` | off | `1` behind odin's reverse proxy |

The server never serves dotfiles or dot folders (the key file, `.git`, `.data`) or `node_modules`, and under the base path it serves only the `dist/` build, not the source.
````

- [ ] **Step 5: Keep server data out of git**

Append to the repo root `.gitignore`:

```
# save server data on the Mac (release 1.3)
.data/
```

- [ ] **Step 6: Run the test, then the real server**

Run: `npx vitest run tests/server/static.test.ts`
Expected: PASS, 4 tests.

Then, from the repo root (run outside the sandbox if binding the port is refused):

```bash
PORT=8799 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts
```

In a second shell: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8799/ideas/opus-5-5-unicorn-egg-nest-v2/` prints `200`, and `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8799/.git/HEAD` prints `404`. Stop the server with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add .gitignore games/moon-meadow-home/server/static.ts games/moon-meadow-home/server/serve.ts games/moon-meadow-home/server/README.md games/moon-meadow-home/tests/server/static.test.ts
git commit -m "Add the home-network server for v2 and v3 on one origin"
```

**Acceptance:** the repo, v2 and the v3 build are served, every dot path and the source behind the mount answer 404, and the v3 HTML carries the CSP.

### Task A12: move.html and the v2 fixture file

**Files:**
- Create: `ideas/opus-5-5-unicorn-egg-nest-v2/move.html`, `tests/fixtures/v2-save.json`
- Modify: `ideas/opus-5-5-unicorn-egg-nest-v2/README.md` (one line about `move.html`)

**Interfaces:**
- Consumes: the v2 save key `emma-unicorn-egg-nest-v2` (A6), the server (A11), `makeV2Save` (A6).
- Produces: `move.html` at the v2 address, which shows the herd and downloads the raw saved text as `emma-unicorn-v2-<date>.json`; `window.moveText(): string | null` for checks; `tests/fixtures/v2-save.json` for the test hook (K9) and flows.

`move.html` downloads the exact text from `localStorage`, unchanged, so the hash on import equals the hash of a direct same-origin read. It is for Tjitse, so it has short English text. The v2 demo itself is not changed (spec 4.1).

- [ ] **Step 1: Write the fixture file**

Run from `games/moon-meadow-home/`:

```bash
node -e "import('./tests/fixtures/v2.ts').then(m => require('node:fs').writeFileSync('tests/fixtures/v2-save.json', JSON.stringify(m.makeV2Save(), null, 2) + '\n'))"
```

Expected: `tests/fixtures/v2-save.json` with 14 babies.

- [ ] **Step 2: Write move.html**

`ideas/opus-5-5-unicorn-egg-nest-v2/move.html`:

```html
<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moving Day</title>
<style>
  :root { --bg: #fff8fc; --ink: #4a2c55; --soft: #8a6a94; --card: #ffffff; --line: #f0d8ea; --go: #ff5fae; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 18px/1.4 -apple-system, system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  p { color: var(--soft); margin: 0 0 16px; }
  #count { font-size: 22px; font-weight: 700; color: var(--ink); }
  ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  li { background: var(--card); border: 2px solid var(--line); border-radius: 14px; padding: 8px 10px; display: flex; gap: 8px; align-items: center; }
  .dot { width: 28px; height: 28px; border-radius: 50%; border: 6px solid; flex: none; }
  .hearts { color: var(--soft); font-size: 14px; }
  button { min-height: 64px; min-width: 64px; padding: 0 28px; border: 0; border-radius: 32px; background: var(--go); color: #fff; font-size: 22px; font-weight: 700; }
  button:disabled { opacity: .4; }
</style>
</head>
<body>
<main>
  <h1>Moving Day</h1>
  <p>This page saves the Unicorn Egg Nest herd from this Safari tab as a file. Open the file in the Moon Meadow parent corner, under Import.</p>
  <div id="count">Looking for the herd...</div>
  <ul id="herd"></ul>
  <button id="save" type="button" disabled>Download the save</button>
</main>
<script>
  // Keep in step with V2_SAVE_KEY in games/moon-meadow-home/src/core/save/v2.ts.
  const SAVE_KEY = 'emma-unicorn-egg-nest-v2';
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
  /** For playwright checks: the exact text the download holds. */
  window.moveText = () => raw;
  const count = document.getElementById('count');
  const list = document.getElementById('herd');
  const button = document.getElementById('save');
  let save = null;
  try { save = raw ? JSON.parse(raw) : null; } catch (e) { save = null; }
  if (!raw) {
    count.textContent = 'There is no Unicorn Egg Nest save on this address. Open this page at the same address and port as the game.';
  } else if (!save || save.v !== 2 || !Array.isArray(save.herd)) {
    count.textContent = 'The save is there, but it is not a Unicorn Egg Nest v2 save. The file can still be downloaded.';
    button.disabled = false;
  } else {
    const n = save.herd.length;
    count.textContent = n === 1 ? '1 baby' : n + ' babies';
    for (const b of save.herd) {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'dot';
      const c = b && typeof b.c === 'object' && b.c ? b.c : {};
      dot.style.background = typeof c.body === 'string' ? c.body : '#ffe0ef';
      dot.style.borderColor = typeof c.mane === 'string' ? c.mane : '#ff7fbf';
      const name = document.createElement('span');
      const text = b && typeof b.name === 'string' && b.name ? b.name : '(no name yet)';
      name.textContent = text.charAt(0).toUpperCase() + text.slice(1);
      const hearts = document.createElement('span');
      hearts.className = 'hearts';
      hearts.textContent = Number.isInteger(b && b.hearts) && b.hearts > 0 ? b.hearts + ' hearts' : '';
      li.append(dot, name, hearts);
      list.append(li);
    }
    button.disabled = false;
  }
  button.addEventListener('click', () => {
    if (!raw) return;
    const day = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emma-unicorn-v2-' + day + '.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
</script>
</body>
</html>
```

Add to `ideas/opus-5-5-unicorn-egg-nest-v2/README.md`, at the end:

```markdown
## Moving Day

`move.html` next to the game shows the herd saved in this Safari tab and downloads it as a file for the Moon Meadow parent corner. Open it at the same address and port as the game.
```

- [ ] **Step 3: Check it in WebKit at iPad size**

Run outside the sandbox, from the repo root. Port 8799 keeps the test origin apart from Emma's 8765.

```bash
PORT=8799 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts   # in the background (run_in_background)
playwright-cli -s=move open http://127.0.0.1:8799/ideas/opus-5-5-unicorn-egg-nest-v2/move.html
playwright-cli -s=move snapshot
```

Expected: the text "There is no Unicorn Egg Nest save on this address." and a disabled button.

```bash
playwright-cli -s=move localstorage-set emma-unicorn-egg-nest-v2 "$(cat games/moon-meadow-home/tests/fixtures/v2-save.json)"
playwright-cli -s=move reload
playwright-cli -s=move snapshot
playwright-cli -s=move eval "window.moveText() === localStorage.getItem('emma-unicorn-egg-nest-v2')"
playwright-cli -s=move screenshot
playwright-cli -s=move resize 820 1180
playwright-cli -s=move screenshot
playwright-cli -s=move resize 1024 768
playwright-cli -s=move screenshot
playwright-cli -s=move console
playwright-cli -s=move close
lsof -ti tcp:8799 | xargs kill
```

`playwright-cli` prints the path of each screenshot. Move every screenshot file to `$TMPDIR`, so none ends up in the repo.

Expected: the snapshot shows "14 babies", "Sam" twice, "(no name yet)" once and an enabled "Download the save" button; `eval` prints `true`; the console has no errors; the screenshots (look at each) show no horizontal scroll at 820, 1024 and 1180 wide.

- [ ] **Step 4: Commit**

```bash
git add ideas/opus-5-5-unicorn-egg-nest-v2/move.html ideas/opus-5-5-unicorn-egg-nest-v2/README.md games/moon-meadow-home/tests/fixtures/v2-save.json
git commit -m "Add the Moving Day page that saves the v2 herd as a file"
```

**Acceptance:** `move.html` lists the herd from the same origin and downloads the saved text byte for byte; the fixture JSON exists for the test hook.

### Wave A done

Run: `npx vitest run && npx tsc --noEmit`
Expected: 13 files, 83 tests, no type errors. The game store (K6), Moving Day (K7) and the parent corner (K8) can now build on `openGameData`.

---

# Wave B: release 1.1 (items 14 to 19)

Core work in release 1.1 is small: the event types the Post Box, notes to Lumi and the novelty floor need, and unknown names from a save file for `names:pull`. Everything else in 1.1 is feature slices (K5) on top of Wave A.

### Task B1: Event types for release 1.1

**Files:**
- Modify: `src/core/events.ts`, `src/core/world/facts.ts`, `src/core/world/cosmetics.ts`, `tests/core/events.test.ts`
- Test: `tests/core/release-1-1.test.ts`

**Interfaces:**
- Consumes: A3, A6, A7.
- Produces: event types `post.opened { visit: string; post: string }` (a fact, key `post`, so one post is opened once across devices), `note.sent { visit: string; words: string[]; mark: '.' | '?' | '!'; gift: string | null }`, `novelty.given { item: string }` (a fact, key `item`); `CosmeticsState.lumiGifts: string[]` (each gift from Lumi once). Facts slice version `'2'`, cosmetics slice version `'2'`, so old snapshots refold.

Post Box envelopes and sash fills are `learn.result` and `pin.given` events that already exist. A parcel is a maths `learn.result`. The golden, berry and snow eggs are `egg.hatched` with `egg: 'golden'` and their `kind`. The Dressing Corner uses `outfit.saved`. The opening queue uses `opening.announced`. Jewels use `jewel.placed`, decoration plots `building.done`.

- [ ] **Step 1: Write the failing test**

`tests/core/release-1-1.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { fakeDevice } from '../helpers/events.ts';

const folder = createGameFolder([]);
const base = { id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION };

describe('release 1.1 events', () => {
  it('validates post, note and novelty events', () => {
    expect(validateEvent({ ...base, type: 'post.opened', visit: 'v1', post: 'post-3' }).ok).toBe(true);
    expect(validateEvent({ ...base, type: 'note.sent', visit: 'v1', words: ['Can', 'we', 'have', 'a', 'swing'], mark: '?', gift: 'swing' }).ok).toBe(true);
    expect(validateEvent({ ...base, type: 'note.sent', visit: 'v1', words: ['We'], mark: ',', gift: null }).ok).toBe(false);
    expect(validateEvent({ ...base, type: 'novelty.given', item: 'pin-set-shells' }).ok).toBe(true);
  });

  it('records a post and a novelty item once, and keeps each Lumi gift once', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    b.add([{ type: 'post.opened', visit: 'v9', post: 'post-1' }, { type: 'novelty.given', item: 'cousin-pip' }], 1000);
    a.add([{ type: 'post.opened', visit: 'v1', post: 'post-1' }, { type: 'novelty.given', item: 'cousin-pip' }], 2000);
    a.add([
      { type: 'note.sent', visit: 'v1', words: ['Can', 'we', 'have', 'a', 'swing'], mark: '?', gift: 'swing' },
      { type: 'note.sent', visit: 'v2', words: ['Can', 'we', 'have', 'a', 'swing'], mark: '?', gift: 'swing' },
    ], 3000);
    const s = folder.full([...a.events, ...b.events]).state;
    expect(s.facts['post.opened']['post-1'].id).toBe('bbbbbbbb:1');
    expect(s.facts['novelty.given']['cousin-pip'].id).toBe('bbbbbbbb:2');
    expect(s.cosmetics.lumiGifts).toEqual(['swing']);
  });
});
```

In `tests/core/events.test.ts`, add three samples at the end of the `samples` object, after the `'exclude'` line:

```ts
      'post.opened': { visit: 'v1', post: 'post-1' },
      'note.sent': { visit: 'v1', words: ['We', 'love', 'the', 'pond'], mark: '!', gift: null },
      'novelty.given': { item: 'pin-set-shells' },
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/core/release-1-1.test.ts tests/core/events.test.ts`
Expected: FAIL, "unknown type post.opened" and the sample list no longer equals `EVENT_TYPES`.

- [ ] **Step 3: Add the payload types**

In `src/core/events.ts`, in `type Payloads`, after `'exclude': { device: string; on: boolean };`:

```ts
  'post.opened': { visit: string; post: string };
  'note.sent': { visit: string; words: string[]; mark: '.' | '?' | '!'; gift: string | null };
  'novelty.given': { item: string };
```

In `PAYLOAD_CHECKS`, after `'exclude': { device: key, on: bool },`:

```ts
  'post.opened': { visit: key, post: key },
  'note.sent': { visit: key, words: arr(text(24), 12), mark: oneOf('.', '?', '!'), gift: nullable(key) },
  'novelty.given': { item: key },
```

- [ ] **Step 4: Record the two new facts**

In `src/core/world/facts.ts`, replace the `FACT_TYPES` line with:

```ts
export const FACT_TYPES = [
  'step.passed', 'placement.done', 'jewel.placed', 'building.done', 'opening.announced', 'title.given', 'baby.named', 'import.v2',
  'post.opened', 'novelty.given',
] as const;
```

In `factKey`, before `default: return null;`:

```ts
    case 'post.opened': return d.post;
    case 'novelty.given': return d.item;
```

In `emptyFacts`, replace `'title.given': {}, 'baby.named': {}, 'import.v2': {},` with:

```ts
    'title.given': {}, 'baby.named': {}, 'import.v2': {}, 'post.opened': {}, 'novelty.given': {},
```

Change the slice version: `version: '1',` becomes `version: '2',` in `factsSlice`.

- [ ] **Step 5: Keep Lumi's gifts**

In `src/core/world/cosmetics.ts`, add the field to `CosmeticsState` after `v2Gifts: string[];`:

```ts
  /** Things Queen Lumi sent down in answer to a note, each once. */
  lumiGifts: string[];
```

Set `version: '2'`, change `init` to `() => ({ rowNames: {}, skyNames: {}, decor: {}, v2Gifts: [], lumiGifts: [] })`, and add this case before `case 'import.v2':`:

```ts
      case 'note.sent':
        if (e.gift && !s.lumiGifts.includes(e.gift)) s.lumiGifts.push(e.gift);
        break;
```

- [ ] **Step 6: Run all tests and the type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, including 2 new tests. No type errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/events.ts games/moon-meadow-home/src/core/world/facts.ts games/moon-meadow-home/src/core/world/cosmetics.ts games/moon-meadow-home/tests/core/events.test.ts games/moon-meadow-home/tests/core/release-1-1.test.ts
git commit -m "Add the post, note and novelty events for release 1.1"
```

**Acceptance:** a post and a novelty item count once across devices, and each Lumi gift is kept once.

### Task B2: Unknown names from a save file

**Files:**
- Create: `src/core/save/unknown-names.ts`
- Test: `tests/core/unknown-names.test.ts`

**Interfaces:**
- Consumes: `parseSaveFile` (A6), `checkEvent` (A3), `mapV2`, `V2ImportDeps` (A6), `stamp`, `newDeviceMeta` (A3), `unknownNamesFrom`, `UnknownName` (A7).
- Produces: `type UnknownNamesResult = { source: 'v3' | 'v2'; names: UnknownName[] } | { source: 'invalid'; reason: string }`, `unknownNamesFromText(text: string, deps: Pick<V2ImportDeps, 'splitGraphemes' | 'phonemes'>): UnknownNamesResult`. Node can import it directly, for `tools/pull-unknown-names.ts` (K10).

- [ ] **Step 1: Write the failing test**

`tests/core/unknown-names.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { unknownNamesFromText } from '../../src/core/save/unknown-names.ts';
import { buildExport } from '../../src/core/save/export.ts';
import { fakeDevice } from '../helpers/events.ts';
import { makeV2Save, testDeps } from '../fixtures/v2.ts';

describe('unknown names from a save file', () => {
  it('reads a v3 export', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([{ type: 'name.built', visit: null, baby: null, gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o', route: 'gold', outcome: 'unknown', listName: null, strong: false }], 1000);
    const r = unknownNamesFromText(JSON.stringify(buildExport(a.events, 5)), testDeps);
    expect(r).toMatchObject({ source: 'v3', names: [{ spelling: 'tamo', count: 1 }] });
  });

  it('reads the name wishes of a v2 save', () => {
    const r = unknownNamesFromText(JSON.stringify(makeV2Save()), testDeps);
    expect(r.source).toBe('v2');
    if (r.source !== 'v2') throw new Error('expected v2');
    expect(r.names.map(n => n.spelling)).toEqual(['lunabel', 'tamo']);
  });

  it('explains a file it cannot read', () => {
    expect(unknownNamesFromText('nope', testDeps)).toEqual({ source: 'invalid', reason: 'This file is not a save file.' });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/core/unknown-names.test.ts`
Expected: FAIL, "Failed to load url ../../src/core/save/unknown-names.ts".

- [ ] **Step 3: Write the implementation**

`src/core/save/unknown-names.ts`:

```ts
// Unknown names from a save file, for `npm run names:pull` when there is no server copy.
// Node type-strip safe, so tools/ can import it.
import type { GameEvent } from '../events.ts';
import { newDeviceMeta, stamp } from '../factory.ts';
import { checkEvent } from '../migrate.ts';
import { unknownNamesFrom } from '../world/names.ts';
import type { UnknownName } from '../world/names.ts';
import { parseSaveFile } from './export.ts';
import { mapV2 } from './v2.ts';
import type { V2ImportDeps } from './v2.ts';

export type UnknownNamesResult = { source: 'v3' | 'v2'; names: UnknownName[] } | { source: 'invalid'; reason: string };

export function unknownNamesFromText(text: string, deps: Pick<V2ImportDeps, 'splitGraphemes' | 'phonemes'>): UnknownNamesResult {
  const p = parseSaveFile(text);
  if (p.kind === 'invalid') return { source: 'invalid', reason: p.reason };
  if (p.kind === 'v3') {
    const events: GameEvent[] = [];
    for (const x of p.events) {
      const r = checkEvent(x);
      if (r.ok) events.push(r.event);
    }
    return { source: 'v3', names: unknownNamesFrom(events) };
  }
  const draft = mapV2(p.save, { ...deps, graphemeItem: (strand, g) => `${strand}:${g}` });
  const { events } = stamp(newDeviceMeta(), [draft], 0);
  return { source: 'v2', names: unknownNamesFrom(events) };
}
```

- [ ] **Step 4: Run the test and check Node can load it**

Run: `npx vitest run tests/core/unknown-names.test.ts`
Expected: PASS, 3 tests.

Run: `node -e "import('./src/core/save/unknown-names.ts').then(m => console.log(typeof m.unknownNamesFromText))"`
Expected: `function`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/save/unknown-names.ts games/moon-meadow-home/tests/core/unknown-names.test.ts
git commit -m "Read unknown names from an exported save for names:pull"
```

**Acceptance:** a v3 export and a v2 save both give their unknown names, and Node runs the module without a build.

---

# Wave C: releases 1.2 and 1.3 (items 20 to 26)

Release 1.2 needs two event types. Release 1.3 is the save server, pairing, sync and the deploy note. C2 to C4 are server-side and can run in parallel with C1. C5 needs C4.

### Task C1: Event types for release 1.2

**Files:**
- Modify: `src/core/events.ts`, `src/core/world/herd.ts`, `src/core/world/cosmetics.ts`, `tests/core/events.test.ts`
- Test: `tests/core/release-1-2.test.ts`

**Interfaces:**
- Consumes: A3, A7, B1.
- Produces: `photo.taken { visit: string; place: string; photo: string; babies: string[]; cousin: string | null }` (Salon photos for the album, item 20) and `ribbon.set { baby: string; on: boolean }` (the come-along ribbon, item 23); `Baby.comeAlong: boolean`; `CosmeticsState.album: AlbumPhoto[]` with `type AlbumPhoto = { photo: string; place: string; babies: string[]; cousin: string | null; t: number }`. Herd slice version `'2'`, cosmetics slice version `'3'`.

Letter Lane, titles, the Hundred Party and the Year 1 meadow wishes use events that exist (`learn.result`, `title.given`, `opening.announced`).

- [ ] **Step 1: Write the failing test**

`tests/core/release-1-2.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { fakeDevice, hatch } from '../helpers/events.ts';

const folder = createGameFolder([]);
const base = { id: 'abcdefgh:1', hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION };

describe('release 1.2 events', () => {
  it('validates photo and ribbon events', () => {
    expect(validateEvent({ ...base, type: 'photo.taken', visit: 'v1', place: 'salon', photo: 'p1', babies: ['b1'], cousin: 'dot' }).ok).toBe(true);
    expect(validateEvent({ ...base, type: 'ribbon.set', baby: 'b1', on: 'yes' }).ok).toBe(false);
  });

  it('keeps every photo for the album and the latest come-along ribbon per baby', () => {
    const a = fakeDevice('aaaaaaaa');
    a.add([
      hatch('b1'),
      { type: 'ribbon.set', baby: 'b1', on: true },
      { type: 'photo.taken', visit: 'v1', place: 'salon', photo: 'p1', babies: ['b1'], cousin: 'dot' },
      { type: 'photo.taken', visit: 'v1', place: 'salon', photo: 'p2', babies: [], cousin: null },
      { type: 'ribbon.set', baby: 'b1', on: false },
    ], 1000);
    const s = folder.full(a.events).state;
    expect(s.cosmetics.album.map(p => p.photo)).toEqual(['p1', 'p2']);
    expect(s.herd.babies.b1.comeAlong).toBe(false);
  });
});
```

In `tests/core/events.test.ts`, add two samples after the `'novelty.given'` sample:

```ts
      'photo.taken': { visit: 'v1', place: 'salon', photo: 'p1', babies: ['b1'], cousin: 'fen' },
      'ribbon.set': { baby: 'b1', on: true },
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/core/release-1-2.test.ts tests/core/events.test.ts`
Expected: FAIL, "unknown type photo.taken".

- [ ] **Step 3: Add the payload types**

In `src/core/events.ts`, in `type Payloads`, after `'novelty.given': { item: string };`:

```ts
  'photo.taken': { visit: string; place: string; photo: string; babies: string[]; cousin: string | null };
  'ribbon.set': { baby: string; on: boolean };
```

In `PAYLOAD_CHECKS`, after `'novelty.given': { item: key },`:

```ts
  'photo.taken': { visit: key, place: key, photo: key, babies: arr(key, 12), cousin: nullable(key) },
  'ribbon.set': { baby: key, on: bool },
```

- [ ] **Step 4: Fold the ribbon and the album**

In `src/core/world/herd.ts`, add to `type Baby` after `clipHeard: boolean;`:

```ts
  /** A "come along" ribbon: the baby follows Emma to places. */
  comeAlong: boolean;
```

Add `comeAlong: false,` after `clipHeard: false,` in both baby literals (in `applyImport` and in the `egg.hatched` case). Add this case after the `favourite.set` case:

```ts
      case 'ribbon.set':
        if (Object.hasOwn(s.babies, e.baby)) s.babies[e.baby].comeAlong = e.on;
        break;
```

Set `version: '2'` in `herdSlice`.

In `src/core/world/cosmetics.ts`, add after `lumiGifts: string[];` in `CosmeticsState`:

```ts
  /** Salon and place photos for the Home Book album, oldest first. */
  album: AlbumPhoto[];
```

Add below the `CosmeticsState` type:

```ts
export type AlbumPhoto = { photo: string; place: string; babies: string[]; cousin: string | null; t: number };
```

Set `version: '3'`, change `init` to `() => ({ rowNames: {}, skyNames: {}, decor: {}, v2Gifts: [], lumiGifts: [], album: [] })`, and add this case before `case 'import.v2':`:

```ts
      case 'photo.taken':
        s.album.push({ photo: e.photo, place: e.place, babies: [...e.babies], cousin: e.cousin, t: e.t });
        break;
```

- [ ] **Step 5: Run all tests and the type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, including 2 new tests. No type errors.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/events.ts games/moon-meadow-home/src/core/world/herd.ts games/moon-meadow-home/src/core/world/cosmetics.ts games/moon-meadow-home/tests/core/events.test.ts games/moon-meadow-home/tests/core/release-1-2.test.ts
git commit -m "Add the photo and come-along events for release 1.2"
```

**Acceptance:** every photo stays in the album, and the latest ribbon per baby wins.

### Task C2: Server event store

**Files:**
- Create: `src/sync/protocol.ts`, `server/store.ts`
- Test: `tests/server/store.test.ts`

**Interfaces:**
- Consumes: `EventBase` (A3).
- Produces:
  - `protocol.ts`: `PUSH_MAX_EVENTS = 1000`, `PUSH_MAX_BYTES = 1_000_000`, `PULL_MAX_EVENTS = 2000`, `BODY_MAX_BYTES = 2 MiB`, `PAIR_CODE_RE`, `FAMILY_RE`, types `PairRequest = { code; dev; label }`, `PairResponse = { token; family }`, `SyncRequest = { dev; after; events }`, `Rejection = { id; reason }`, `SyncResponse = { accepted; duplicates; rejected; events; cursor; more }`, `UnknownNamesResponse`, `ApiError`.
  - `store.ts`: `DEFAULT_DATA` (`<repo>/.data/moon-meadow`), `DAILY_COPIES = 30`, `type StoredEvent`, `type Page = { events; cursor; more }`, `interface ServerStore { has; append; since; size; all; close }`, `openServerStore(dataDir: string, clock?: () => number): ServerStore`.

Server sequence n is the n-th event stored for the family. A cursor past the end (a server restored from an older copy) starts again from 0; the client drops duplicates.

- [ ] **Step 1: Write the failing test**

`tests/server/store.test.ts`:

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openServerStore } from '../../server/store.ts';
import type { StoredEvent } from '../../server/store.ts';
import { fakeDevice, setting } from '../helpers/events.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'moon-server-'));
const events = (n: number, dev = 'aaaaaaaa') => fakeDevice(dev).add(Array.from({ length: n }, (_, i) => setting('k', i)), 1000) as unknown as StoredEvent[];

describe('server store', () => {
  it('appends, pages by server sequence and survives a restart', () => {
    const dir = tmp();
    const s = openServerStore(dir);
    const evs = events(5);
    s.append('emma', evs.slice(0, 3));
    s.append('emma', evs.slice(3));
    expect(s.has('emma', 'aaaaaaaa:4')).toBe(true);
    expect(s.since('emma', 0, 2)).toEqual({ events: evs.slice(0, 2), cursor: 2, more: true });
    expect(s.since('emma', 4, 10)).toEqual({ events: evs.slice(4), cursor: 5, more: false });
    expect(s.since('emma', 99, 10).cursor).toBe(5); // a cursor beyond the end starts again
    s.close();
    const again = openServerStore(dir);
    expect(again.size('emma')).toBe(5);
    expect(again.size('test')).toBe(0);
    again.close();
  });

  it('cuts off a half-written last line and keeps going', () => {
    const dir = tmp();
    const s = openServerStore(dir);
    s.append('emma', events(2));
    s.close();
    const file = path.join(dir, 'families/emma/events.jsonl');
    fs.appendFileSync(file, '{"id":"aaaaaaaa:3","hl');
    const again = openServerStore(dir);
    expect(again.size('emma')).toBe(2);
    again.append('emma', events(3).slice(2));
    again.close();
    expect(openServerStore(dir).size('emma')).toBe(3);
  });

  it('makes one daily copy per day and keeps the last 30', () => {
    const dir = tmp();
    let t = Date.UTC(2026, 0, 1, 12);
    const s = openServerStore(dir, () => t);
    for (let day = 0; day < 33; day++) {
      s.append('emma', events(1, 'bbbbbbbb').map(e => ({ ...e, id: `bbbbbbbb:${day + 1}` })));
      s.append('emma', events(1, 'cccccccc').map(e => ({ ...e, id: `cccccccc:${day + 1}` })));
      t += 24 * 3600 * 1000;
    }
    const copies = fs.readdirSync(path.join(dir, 'families/emma/daily')).sort();
    expect(copies).toHaveLength(30);
    expect(copies[29]).toBe('2026-02-02.jsonl');
    s.close();
  });

  it('refuses family names that could leave the data folder', () => {
    const s = openServerStore(tmp());
    expect(() => s.size('../etc')).toThrow('bad family name');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/server/store.test.ts`
Expected: FAIL, "Failed to load url ../../server/store.ts".

- [ ] **Step 3: Write the implementation**

`src/sync/protocol.ts`:

```ts
// The save API contract, shared by the sync client and the Node save server.
export const PUSH_MAX_EVENTS = 1000;
export const PUSH_MAX_BYTES = 1_000_000;
export const PULL_MAX_EVENTS = 2000;
export const BODY_MAX_BYTES = 2 * 1024 * 1024;
export const PAIR_CODE_RE = /^\d{6}$/;
export const FAMILY_RE = /^[a-z][a-z0-9-]{0,31}$/;

export type PairRequest = { code: string; dev: string; label: string };
export type PairResponse = { token: string; family: string };
export type SyncRequest = { dev: string; after: number; events: unknown[] };
export type Rejection = { id: string; reason: string };
export type SyncResponse = {
  accepted: number;
  duplicates: number;
  rejected: Rejection[];
  /** Events with a server sequence above `after`, without the ones this request pushed. */
  events: unknown[];
  cursor: number;
  more: boolean;
};
export type UnknownNamesResponse = {
  family: string;
  names: { spelling: string; gems: string[]; phonemes: string; count: number; firstT: number; lastT: number; fromV2: boolean }[];
};
export type ApiError = { error: string };
```

`server/store.ts`:

```ts
// One append-only event log per family: <data>/families/<family>/events.jsonl, fsync after each write,
// a daily copy at the first write of each day, the last 30 copies kept.
import fs from 'node:fs';
import path from 'node:path';
import type { EventBase } from '../src/core/events.ts';
import { FAMILY_RE } from '../src/sync/protocol.ts';

/** Default data folder: <repo>/.data/moon-meadow. A dot folder, so the static server never serves it. */
export const DEFAULT_DATA = path.resolve(import.meta.dirname, '../../..', '.data', 'moon-meadow');
export const DAILY_COPIES = 30;
export type StoredEvent = EventBase & { type: string } & Record<string, unknown>;
export type Page = { events: StoredEvent[]; cursor: number; more: boolean };

export interface ServerStore {
  has(family: string, id: string): boolean;
  /** Appends events in order. Server sequences start at 1 and follow the line order. */
  append(family: string, events: readonly StoredEvent[]): void;
  /** Events with a server sequence above `after`, at most `limit`. An `after` beyond the end starts again from 0. */
  since(family: string, after: number, limit: number): Page;
  size(family: string): number;
  all(family: string): StoredEvent[];
  close(): void;
}

type FamilyLog = { events: StoredEvent[]; ids: Set<string>; fd: number | null; copiedDay: string | null };

export function openServerStore(dataDir: string, clock: () => number = Date.now): ServerStore {
  const logs = new Map<string, FamilyLog>();

  function familyDir(family: string): string {
    if (!FAMILY_RE.test(family)) throw new Error(`bad family name: ${family}`);
    return path.join(dataDir, 'families', family);
  }

  function load(family: string): FamilyLog {
    const existing = logs.get(family);
    if (existing) return existing;
    const dir = familyDir(family);
    const file = path.join(dir, 'events.jsonl');
    const log: FamilyLog = { events: [], ids: new Set(), fd: null, copiedDay: null };
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split('\n');
      let goodLength = 0;
      let offset = 0;
      for (const line of lines) {
        const lineLength = Buffer.byteLength(line, 'utf8') + 1;
        if (line.trim()) {
          try {
            const e = JSON.parse(line) as StoredEvent;
            log.events.push(e);
            log.ids.add(e.id);
            goodLength = offset + lineLength;
          } catch {
            console.error(`[store] ${family}: skipped a broken line at byte ${offset}`);
          }
        }
        offset += lineLength;
      }
      // a crash mid-write can leave a last line without its newline: cut it off when broken, end it when good
      if (text.length > 0 && !text.endsWith('\n')) {
        if (goodLength > Buffer.byteLength(text, 'utf8')) fs.appendFileSync(file, '\n');
        else fs.truncateSync(file, goodLength);
      }
    }
    logs.set(family, log);
    return log;
  }

  function dailyCopy(family: string, log: FamilyLog): void {
    const day = new Date(clock()).toISOString().slice(0, 10);
    if (log.copiedDay === day) return;
    const dir = familyDir(family);
    const daily = path.join(dir, 'daily');
    const file = path.join(dir, 'events.jsonl');
    fs.mkdirSync(daily, { recursive: true });
    const target = path.join(daily, `${day}.jsonl`);
    if (fs.existsSync(file) && !fs.existsSync(target)) fs.copyFileSync(file, target);
    const copies = fs.readdirSync(daily).filter(f => f.endsWith('.jsonl')).sort();
    for (const old of copies.slice(0, Math.max(0, copies.length - DAILY_COPIES))) fs.unlinkSync(path.join(daily, old));
    log.copiedDay = day;
  }

  return {
    has: (family, id) => load(family).ids.has(id),
    append(family, events) {
      if (events.length === 0) return;
      const log = load(family);
      dailyCopy(family, log);
      if (log.fd === null) {
        fs.mkdirSync(familyDir(family), { recursive: true });
        log.fd = fs.openSync(path.join(familyDir(family), 'events.jsonl'), 'a', 0o600);
      }
      fs.writeSync(log.fd, events.map(e => JSON.stringify(e) + '\n').join(''));
      fs.fsyncSync(log.fd);
      for (const e of events) { log.events.push(e); log.ids.add(e.id); }
    },
    since(family, after, limit) {
      const log = load(family);
      const from = after > log.events.length ? 0 : Math.max(0, after);
      const events = log.events.slice(from, from + limit);
      const cursor = from + events.length;
      return { events, cursor, more: cursor < log.events.length };
    },
    size: family => load(family).events.length,
    all: family => [...load(family).events],
    close() {
      for (const log of logs.values()) if (log.fd !== null) fs.closeSync(log.fd);
      logs.clear();
    },
  };
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run tests/server/store.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/sync/protocol.ts games/moon-meadow-home/server/store.ts games/moon-meadow-home/tests/server/store.test.ts
git commit -m "Add the save server's per-family event log with daily copies"
```

**Acceptance:** logs survive a restart and a half-written line, and 30 daily copies are kept.

### Task C3: Pairing, tokens, rate limits and the admin command line

**Files:**
- Create: `server/auth.ts`, `server/admin.ts`
- Test: `tests/server/auth.test.ts`

**Interfaces:**
- Consumes: `FAMILY_RE` (C2), `DEFAULT_DATA`, `openServerStore` (C2, tests).
- Produces:
  - `auth.ts`: `CODE_TTL_MS`, `DeviceRec = { hash; family; dev; label; created; revoked }`, `CodeRec = { code; family; expires; used }`, `sha256(s): string`, `newToken(): string`, `interface Auth { createCode(family): CodeRec; redeem(code, dev, label): { token; family } | null; device(token): DeviceRec | null; revoke(dev): number; devices(): DeviceRec[]; createAdminToken(): string; isAdmin(token): boolean }`, `openAuth(dataDir, clock?): Auth`, `type Limiter = { allow(key): boolean; fail(key): void; blocked(key): boolean }`, `createLimiter({ max, windowMs, blockMs }, clock?): Limiter`.
  - `admin.ts`: `runAdmin(argv: string[], out?, clock?): number`; commands `pair --family <name>`, `devices`, `revoke <device id>`, `admin-token --env-file <path>`, `delete-family <family> --yes`, each with `--data <dir>`.

Tokens are 256 random bits in base64url and are stored only as SHA-256 hashes. The files are read on every call, so the command line and a running server always agree. `admin-token` writes the new token into the file it is given and never prints it.

- [ ] **Step 1: Write the failing test**

`tests/server/auth.test.ts`:

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLimiter, openAuth, sha256 } from '../../server/auth.ts';
import { runAdmin } from '../../server/admin.ts';
import { openServerStore } from '../../server/store.ts';
import type { StoredEvent } from '../../server/store.ts';
import { fakeDevice, setting } from '../helpers/events.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'moon-auth-'));
const events = (n: number, dev = 'aaaaaaaa') => fakeDevice(dev).add(Array.from({ length: n }, (_, i) => setting('k', i)), 1000) as unknown as StoredEvent[];

describe('auth', () => {
  it('pairs once per code, stores only the token hash, and revokes', () => {
    const dir = tmp();
    let t = 1000;
    const a = openAuth(dir, () => t);
    const code = a.createCode('test').code;
    expect(code).toMatch(/^\d{6}$/);
    const r = a.redeem(code, 'aaaaaaaa', 'iPad');
    expect(r?.family).toBe('test');
    expect(a.redeem(code, 'aaaaaaaa', 'iPad')).toBeNull();
    expect(fs.readFileSync(path.join(dir, 'devices.json'), 'utf8')).not.toContain(r!.token);
    expect(fs.readFileSync(path.join(dir, 'devices.json'), 'utf8')).toContain(sha256(r!.token));
    expect(a.device(r!.token)?.dev).toBe('aaaaaaaa');
    expect(a.revoke('aaaaaaaa')).toBe(1);
    expect(a.device(r!.token)).toBeNull();
    const late = a.createCode('emma').code;
    t += 15 * 60 * 1000 + 1;
    expect(a.redeem(late, 'bbbbbbbb', 'iPad')).toBeNull();
  });

  it('admin tokens work by hash', () => {
    const a = openAuth(tmp());
    const token = a.createAdminToken();
    expect(a.isAdmin(token)).toBe(true);
    expect(a.isAdmin('guess')).toBe(false);
  });

  it('limits pairing failures and calls', () => {
    let t = 0;
    const pairing = createLimiter({ max: 5, windowMs: 900_000, blockMs: 900_000 }, () => t);
    for (let i = 0; i < 4; i++) pairing.fail('1.2.3.4');
    expect(pairing.blocked('1.2.3.4')).toBe(false);
    pairing.fail('1.2.3.4');
    expect(pairing.blocked('1.2.3.4')).toBe(true);
    t += 900_001;
    expect(pairing.blocked('1.2.3.4')).toBe(false);
    const calls = createLimiter({ max: 60, windowMs: 60_000, blockMs: 0 }, () => t);
    for (let i = 0; i < 60; i++) expect(calls.allow('tok')).toBe(true);
    expect(calls.allow('tok')).toBe(false);
    t += 60_001;
    expect(calls.allow('tok')).toBe(true);
  });
});

describe('admin command line', () => {
  it('makes a pairing code, lists devices, writes an admin token without printing it, deletes a family', () => {
    const dir = tmp();
    const lines: string[] = [];
    const out = (l: string) => lines.push(l);
    expect(runAdmin(['pair', '--family', 'test', '--data', dir], out)).toBe(0);
    expect(lines[0]).toMatch(/^Pairing code for family "test": \d{6}$/);
    const envFile = path.join(dir, 'admin-env');
    expect(runAdmin(['admin-token', '--env-file', envFile, '--data', dir], out)).toBe(0);
    const written = fs.readFileSync(envFile, 'utf8').trim().split('=')[1];
    expect(lines.join('\n')).not.toContain(written);
    expect(openAuth(dir).isAdmin(written)).toBe(true);
    const s = openServerStore(dir);
    s.append('test', events(1));
    s.close();
    expect(runAdmin(['delete-family', 'test', '--data', dir], out)).toBe(1);
    expect(runAdmin(['delete-family', 'test', '--yes', '--data', dir], out)).toBe(0);
    expect(fs.existsSync(path.join(dir, 'families/test'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/server/auth.test.ts`
Expected: FAIL, "Failed to load url ../../server/auth.ts".

- [ ] **Step 3: Write the implementation**

`server/auth.ts`:

```ts
// Pairing codes, device tokens, the admin token and rate limits. Tokens are stored only as SHA-256 hashes.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { FAMILY_RE } from '../src/sync/protocol.ts';

export const CODE_TTL_MS = 15 * 60 * 1000;
export type DeviceRec = { hash: string; family: string; dev: string; label: string; created: number; revoked: number | null };
export type CodeRec = { code: string; family: string; expires: number; used: number | null };

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
export const newToken = (): string => randomBytes(32).toString('base64url');

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export interface Auth {
  createCode(family: string): CodeRec;
  /** Uses a code once. Returns a new device token, or null when the code is unknown, used or expired. */
  redeem(code: string, dev: string, label: string): { token: string; family: string } | null;
  device(token: string): DeviceRec | null;
  revoke(dev: string): number;
  devices(): DeviceRec[];
  createAdminToken(): string;
  isAdmin(token: string): boolean;
}

/** Files are read on every call, so the admin command line and the running server always agree. */
export function openAuth(dataDir: string, clock: () => number = Date.now): Auth {
  const devicesFile = path.join(dataDir, 'devices.json');
  const codesFile = path.join(dataDir, 'codes.json');
  const adminFile = path.join(dataDir, 'admin.json');
  const liveCodes = () => readJson<CodeRec[]>(codesFile, []).filter(c => c.used === null && c.expires > clock());
  return {
    createCode(family) {
      if (!FAMILY_RE.test(family)) throw new Error(`bad family name: ${family}`);
      const live = liveCodes();
      let code: string;
      do { code = String(randomInt(0, 1_000_000)).padStart(6, '0'); } while (live.some(c => c.code === code));
      const rec: CodeRec = { code, family, expires: clock() + CODE_TTL_MS, used: null };
      writeJson(codesFile, [...live, rec]);
      return rec;
    },
    redeem(code, dev, label) {
      const codes = readJson<CodeRec[]>(codesFile, []);
      const rec = codes.find(c => c.code === code && c.used === null && c.expires > clock());
      if (!rec) return null;
      rec.used = clock();
      writeJson(codesFile, codes.filter(c => c.used === null ? c.expires > clock() : c === rec));
      const token = newToken();
      const devices = readJson<DeviceRec[]>(devicesFile, []);
      devices.push({ hash: sha256(token), family: rec.family, dev, label, created: clock(), revoked: null });
      writeJson(devicesFile, devices);
      return { token, family: rec.family };
    },
    device(token) {
      const hash = sha256(token);
      return readJson<DeviceRec[]>(devicesFile, []).find(d => d.hash === hash && d.revoked === null) ?? null;
    },
    revoke(dev) {
      const devices = readJson<DeviceRec[]>(devicesFile, []);
      let n = 0;
      for (const d of devices) if (d.dev === dev && d.revoked === null) { d.revoked = clock(); n++; }
      writeJson(devicesFile, devices);
      return n;
    },
    devices: () => readJson<DeviceRec[]>(devicesFile, []),
    createAdminToken() {
      const token = newToken();
      writeJson(adminFile, [...readJson<string[]>(adminFile, []), sha256(token)]);
      return token;
    },
    isAdmin: token => readJson<string[]>(adminFile, []).includes(sha256(token)),
  };
}

export type Limiter = { allow(key: string): boolean; fail(key: string): void; blocked(key: string): boolean };

/** At most `max` hits per window per key. For pairing, `fail` counts failures and blocks the key for `blockMs`. */
export function createLimiter(o: { max: number; windowMs: number; blockMs: number }, clock: () => number = Date.now): Limiter {
  const hits = new Map<string, number[]>();
  const blockedUntil = new Map<string, number>();
  const recent = (key: string) => (hits.get(key) ?? []).filter(t => t > clock() - o.windowMs);
  return {
    allow(key) {
      const list = recent(key);
      if (list.length >= o.max) { hits.set(key, list); return false; }
      list.push(clock());
      hits.set(key, list);
      return true;
    },
    fail(key) {
      const list = recent(key);
      list.push(clock());
      hits.set(key, list);
      if (list.length >= o.max) blockedUntil.set(key, clock() + o.blockMs);
    },
    blocked: key => (blockedUntil.get(key) ?? 0) > clock(),
  };
}
```

`server/admin.ts`:

```ts
// Admin commands for the save server. Run from the repo root:
//   node games/moon-meadow-home/server/admin.ts pair --family emma
//   node games/moon-meadow-home/server/admin.ts devices
//   node games/moon-meadow-home/server/admin.ts revoke <device id>
//   node games/moon-meadow-home/server/admin.ts admin-token --env-file <path>
//   node games/moon-meadow-home/server/admin.ts delete-family <family> --yes   (stop the server first)
// --data <dir> picks the data folder (default: MOON_DATA, else <repo>/.data/moon-meadow).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { FAMILY_RE } from '../src/sync/protocol.ts';
import { openAuth } from './auth.ts';
import { DEFAULT_DATA } from './store.ts';

export function runAdmin(argv: string[], out: (line: string) => void = console.log, clock: () => number = Date.now): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { family: { type: 'string' }, data: { type: 'string' }, 'env-file': { type: 'string' }, yes: { type: 'boolean' } },
  });
  const dataDir = values.data ?? process.env.MOON_DATA ?? DEFAULT_DATA;
  const auth = openAuth(dataDir, clock);
  const [command, arg] = positionals;
  switch (command) {
    case 'pair': {
      const family = values.family ?? 'emma';
      const rec = auth.createCode(family);
      out(`Pairing code for family "${family}": ${rec.code}`);
      out(`Valid until ${new Date(rec.expires).toLocaleTimeString('en-GB')}. Type it in the parent corner, under Pairing.`);
      return 0;
    }
    case 'devices':
      for (const d of auth.devices()) {
        out(`${d.dev}  ${d.family}  ${d.label || '-'}  paired ${new Date(d.created).toISOString().slice(0, 10)}${d.revoked ? '  revoked' : ''}`);
      }
      return 0;
    case 'revoke': {
      if (!arg) { out('Usage: revoke <device id>'); return 1; }
      out(`Revoked ${auth.revoke(arg)} token(s) of device ${arg}.`);
      return 0;
    }
    case 'admin-token': {
      const envFile = values['env-file'];
      if (!envFile) { out('Usage: admin-token --env-file <path>. The token is written to that file and never printed.'); return 1; }
      const token = auth.createAdminToken();
      fs.appendFileSync(envFile, `\nMOON_ADMIN_TOKEN=${token}\n`, { mode: 0o600 });
      out(`Wrote MOON_ADMIN_TOKEN to ${envFile}.`);
      return 0;
    }
    case 'delete-family': {
      if (!arg || !FAMILY_RE.test(arg) || !values.yes) { out('Usage: delete-family <family> --yes (stop the server first)'); return 1; }
      fs.rmSync(path.join(dataDir, 'families', arg), { recursive: true, force: true });
      let n = 0;
      for (const d of auth.devices()) if (d.family === arg) n += auth.revoke(d.dev);
      out(`Deleted all events and daily copies of family "${arg}" and revoked ${n} device token(s).`);
      return 0;
    }
    default:
      out('Commands: pair --family <name>, devices, revoke <device id>, admin-token --env-file <path>, delete-family <family> --yes');
      return command ? 1 : 0;
  }
}

if (import.meta.main) process.exitCode = runAdmin(process.argv.slice(2));
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run tests/server/auth.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/server/auth.ts games/moon-meadow-home/server/admin.ts games/moon-meadow-home/tests/server/auth.test.ts
git commit -m "Add pairing codes, device tokens, rate limits and the admin commands"
```

**Acceptance:** a code pairs once within 15 minutes, only token hashes are stored, and the admin token never reaches the terminal.

### Task C4: The save API

**Files:**
- Create: `server/api.ts`, `tests/helpers/server.ts`
- Modify: `server/serve.ts`
- Test: `tests/server/api.test.ts`

**Interfaces:**
- Consumes: `checkBase`, `SCHEMA_VERSION`, `GameEvent` (A3), `DEVICE_ID_RE` (A1), `checkEvent` (A3), `unknownNamesFrom` (A7), protocol (C2), `createLimiter`, `Auth`, `Limiter` (C3), `ServerStore`, `StoredEvent` (C2), `createServer` (A11).
- Produces: `type ApiDeps = { store; auth; clock?; trustProxy?; pairLimiter?; callLimiter? }`, `createApi(deps): (req, res, subpath) => Promise<void>` with routes `GET health`, `POST pair`, `POST sync`, `GET admin/unknown-names?family=`; `startTestServer(over?): Promise<TestServer>` for tests; `serve.ts` now mounts the API at `<base>api/` with env `MOON_DATA` and `TRUST_PROXY`.

Sync rules (spec 4.5 and 4.8): events with a known id count as duplicates, not rejections; a bad base field or an unknown type at a known schema version is rejected alone; an event with a newer schema version is stored without checking its payload; the pull leaves out the events this request pushed. The test family is a normal family that Tjitse's devices pair to with `--family test`.

- [ ] **Step 1: Write the test server helper**

`tests/helpers/server.ts`:

```ts
// Starts the real server in-process on a free port with a temporary data folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServer } from '../../server/serve.ts';
import { createApi } from '../../server/api.ts';
import type { ApiDeps } from '../../server/api.ts';
import { openServerStore } from '../../server/store.ts';
import { openAuth } from '../../server/auth.ts';
import type { Auth } from '../../server/auth.ts';
import type { ServerStore } from '../../server/store.ts';

export type TestServer = { url: string; apiBase: string; dataDir: string; auth: Auth; store: ServerStore; close(): Promise<void> };

export async function startTestServer(over: Partial<ApiDeps> = {}): Promise<TestServer> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moon-api-'));
  const store = openServerStore(dataDir);
  const auth = openAuth(dataDir);
  const api = createApi({ store, auth, ...over });
  const server = createServer({ root: dataDir, base: '/games/moon-meadow-home/', gameDir: path.join(dataDir, 'dist'), csp: true, api });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url, apiBase: `${url}/games/moon-meadow-home/api/`, dataDir, auth, store,
    close: () => new Promise<void>(r => { server.close(() => r()); store.close(); }),
  };
}
```

- [ ] **Step 2: Write the failing test**

`tests/server/api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/server.ts';
import type { TestServer } from '../helpers/server.ts';
import { SCHEMA_VERSION } from '../../src/core/events.ts';
import type { SyncResponse } from '../../src/sync/protocol.ts';
import { fakeDevice, hatch, setting } from '../helpers/events.ts';
import { createLimiter } from '../../server/auth.ts';

let srv: TestServer;
beforeEach(async () => { srv = await startTestServer(); });
afterEach(async () => { await srv.close(); });

const post = (path: string, body: unknown, token?: string) => fetch(srv.apiBase + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

async function paired(family = 'emma', dev = 'aaaaaaaa'): Promise<string> {
  const code = srv.auth.createCode(family).code;
  const r = await post('pair', { code, dev, label: 'test' });
  return ((await r.json()) as { token: string }).token;
}

describe('save API', () => {
  it('answers health without a token', async () => {
    expect(await (await fetch(srv.apiBase + 'health')).json()).toEqual({ ok: true, schema: SCHEMA_VERSION });
  });

  it('pairs with a code once and refuses bad codes', async () => {
    const code = srv.auth.createCode('emma').code;
    const r = await post('pair', { code, dev: 'aaaaaaaa', label: 'iPad' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ family: 'emma', token: expect.any(String) });
    expect((await post('pair', { code, dev: 'aaaaaaaa', label: 'iPad' })).status).toBe(403);
    expect((await post('pair', { code: '12', dev: 'aaaaaaaa' })).status).toBe(400);
    expect((await post('pair', 'not json')).status).toBe(400);
  });

  it('blocks pairing after 5 failures', async () => {
    for (let i = 0; i < 5; i++) await post('pair', { code: '000000', dev: 'aaaaaaaa' });
    const code = srv.auth.createCode('emma').code;
    expect((await post('pair', { code, dev: 'aaaaaaaa' })).status).toBe(429);
  });

  it('needs a valid token to sync', async () => {
    expect((await post('sync', { dev: 'aaaaaaaa', after: 0, events: [] })).status).toBe(401);
    expect((await post('sync', { dev: 'aaaaaaaa', after: 0, events: [] }, 'wrong')).status).toBe(401);
  });

  it('stores new events once, rejects bad ones one by one, keeps newer schema versions, and returns the rest', async () => {
    const token = await paired();
    const a = fakeDevice('aaaaaaaa');
    const evs = a.add([hatch('b1'), setting('x', 1)], 1000);
    const bad = { ...evs[1], id: 'aaaaaaaa:3', type: 'egg.stolen' };
    const newer = { ...evs[1], id: 'aaaaaaaa:4', v: SCHEMA_VERSION + 1, type: 'future.thing', extra: [1] };
    const r = await post('sync', { dev: 'aaaaaaaa', after: 0, events: [...evs, bad, newer, { junk: true }] }, token);
    const body = (await r.json()) as SyncResponse;
    expect(body).toMatchObject({ accepted: 3, duplicates: 0, events: [], cursor: 3, more: false });
    expect(body.rejected).toEqual([{ id: 'aaaaaaaa:3', reason: 'unknown type egg.stolen' }, { id: '?', reason: 'bad id' }]);
    const again = (await (await post('sync', { dev: 'aaaaaaaa', after: 3, events: evs }, token)).json()) as SyncResponse;
    expect(again).toMatchObject({ accepted: 0, duplicates: 2, cursor: 3 });
    const other = await paired('emma', 'bbbbbbbb');
    const pulled = (await (await post('sync', { dev: 'bbbbbbbb', after: 0, events: [] }, other)).json()) as SyncResponse;
    expect(pulled.events).toHaveLength(3);
    expect(pulled.events[2]).toEqual(newer);
  });

  it('keeps the test family apart from Emma', async () => {
    const emma = await paired('emma', 'aaaaaaaa');
    const test = await paired('test', 'bbbbbbbb');
    await post('sync', { dev: 'aaaaaaaa', after: 0, events: fakeDevice('aaaaaaaa').add([setting('x', 1)], 1) }, emma);
    const r = (await (await post('sync', { dev: 'bbbbbbbb', after: 0, events: [] }, test)).json()) as SyncResponse;
    expect(r.events).toEqual([]);
    expect(srv.store.size('emma')).toBe(1);
    expect(srv.store.size('test')).toBe(0);
  });

  it('pages pulls of more than 2,000 events', async () => {
    const token = await paired();
    const a = fakeDevice('aaaaaaaa');
    for (let i = 0; i < 3; i++) await post('sync', { dev: 'aaaaaaaa', after: 0, events: a.add(Array.from({ length: 1000 }, (_, k) => setting('k', k)), 1000 + i) }, token);
    const other = await paired('emma', 'bbbbbbbb');
    const first = (await (await post('sync', { dev: 'bbbbbbbb', after: 0, events: [] }, other)).json()) as SyncResponse;
    expect(first).toMatchObject({ cursor: 2000, more: true });
    const second = (await (await post('sync', { dev: 'bbbbbbbb', after: 2000, events: [] }, other)).json()) as SyncResponse;
    expect(second).toMatchObject({ cursor: 3000, more: false });
    expect(second.events).toHaveLength(1000);
  });

  it('refuses bodies over 2 MB and more than 1,000 events', async () => {
    const token = await paired();
    expect((await post('sync', { dev: 'aaaaaaaa', after: 0, events: [], pad: 'x'.repeat(2_200_000) }, token)).status).toBe(413);
    expect((await post('sync', { dev: 'aaaaaaaa', after: 0, events: new Array(1001).fill(0) }, token)).status).toBe(400);
  });

  it('lists unknown names for the admin token only', async () => {
    const token = await paired();
    const a = fakeDevice('aaaaaaaa');
    const evs = a.add([{ type: 'name.built', visit: null, baby: null, gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o', route: 'gold', outcome: 'unknown', listName: null, strong: false }], 1000);
    await post('sync', { dev: 'aaaaaaaa', after: 0, events: evs }, token);
    expect((await fetch(srv.apiBase + 'admin/unknown-names', { headers: { Authorization: `Bearer ${token}` } })).status).toBe(401);
    const admin = srv.auth.createAdminToken();
    const r = await fetch(srv.apiBase + 'admin/unknown-names?family=emma', { headers: { Authorization: `Bearer ${admin}` } });
    expect(await r.json()).toEqual({ family: 'emma', names: [{ spelling: 'tamo', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o', count: 1, firstT: 1000, lastT: 1000, fromV2: false }] });
  });
});

describe('call limit', () => {
  it('answers 429 after 60 calls a minute per token', async () => {
    const limited = await startTestServer({ callLimiter: createLimiter({ max: 2, windowMs: 60_000, blockMs: 0 }) });
    const code = limited.auth.createCode('emma').code;
    const pairRes = await fetch(limited.apiBase + 'pair', { method: 'POST', body: JSON.stringify({ code, dev: 'aaaaaaaa' }) });
    const { token } = (await pairRes.json()) as { token: string };
    const call = () => fetch(limited.apiBase + 'sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ dev: 'aaaaaaaa', after: 0, events: [] }) });
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(429);
    await limited.close();
  });
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx vitest run tests/server/api.test.ts`
Expected: FAIL, "Failed to load url ../../server/api.ts".

- [ ] **Step 4: Write the API**

`server/api.ts`:

```ts
// The save API: pair, sync, unknown names for the generator, health. Same origin only, no CORS.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { checkBase, SCHEMA_VERSION } from '../src/core/events.ts';
import type { GameEvent } from '../src/core/events.ts';
import { DEVICE_ID_RE } from '../src/core/ids.ts';
import { checkEvent } from '../src/core/migrate.ts';
import { unknownNamesFrom } from '../src/core/world/names.ts';
import { BODY_MAX_BYTES, FAMILY_RE, PAIR_CODE_RE, PULL_MAX_EVENTS, PUSH_MAX_EVENTS } from '../src/sync/protocol.ts';
import type { Rejection, SyncResponse, UnknownNamesResponse } from '../src/sync/protocol.ts';
import { createLimiter } from './auth.ts';
import type { Auth, Limiter } from './auth.ts';
import type { ServerStore, StoredEvent } from './store.ts';

export type ApiDeps = {
  store: ServerStore;
  auth: Auth;
  clock?: () => number;
  /** Use the first X-Forwarded-For address as the client address. Only behind odin's reverse proxy. */
  trustProxy?: boolean;
  pairLimiter?: Limiter;
  callLimiter?: Limiter;
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(text);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > BODY_MAX_BYTES) throw new HttpError(413, 'request too large');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > BODY_MAX_BYTES) throw new HttpError(413, 'request too large');
    chunks.push(chunk as Buffer);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'body is not JSON'); }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new HttpError(400, 'body is not an object');
  return body as Record<string, unknown>;
}

function bearer(req: IncomingMessage): string | null {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

export function createApi(deps: ApiDeps): (req: IncomingMessage, res: ServerResponse, subpath: string) => Promise<void> {
  const clock = deps.clock ?? Date.now;
  const pairLimiter = deps.pairLimiter ?? createLimiter({ max: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 }, clock);
  const callLimiter = deps.callLimiter ?? createLimiter({ max: 60, windowMs: 60_000, blockMs: 0 }, clock);

  function clientIp(req: IncomingMessage): string {
    const fwd = req.headers['x-forwarded-for'];
    if (deps.trustProxy && typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
    return req.socket.remoteAddress ?? 'unknown';
  }

  async function pair(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ip = clientIp(req);
    if (pairLimiter.blocked(ip)) throw new HttpError(429, 'too many tries, wait 15 minutes');
    const body = await readJson(req);
    const code = body.code, dev = body.dev, label = typeof body.label === 'string' ? body.label.slice(0, 40) : '';
    if (typeof code !== 'string' || !PAIR_CODE_RE.test(code) || typeof dev !== 'string' || !DEVICE_ID_RE.test(dev)) {
      pairLimiter.fail(ip);
      throw new HttpError(400, 'bad pairing request');
    }
    const r = deps.auth.redeem(code, dev, label);
    if (!r) { pairLimiter.fail(ip); throw new HttpError(403, 'unknown or expired code'); }
    send(res, 200, r);
  }

  async function sync(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const token = bearer(req);
    const device = token ? deps.auth.device(token) : null;
    if (!token || !device) throw new HttpError(401, 'pair this device again');
    if (!callLimiter.allow(device.hash)) throw new HttpError(429, 'too many calls');
    const body = await readJson(req);
    const after = body.after;
    if (!Number.isInteger(after) || (after as number) < 0) throw new HttpError(400, 'bad cursor');
    if (!Array.isArray(body.events) || body.events.length > PUSH_MAX_EVENTS) throw new HttpError(400, `send at most ${PUSH_MAX_EVENTS} events`);
    const fam = device.family;
    const rejected: Rejection[] = [];
    const toStore: StoredEvent[] = [];
    const pushed = new Set<string>();
    let duplicates = 0;
    for (const x of body.events as unknown[]) {
      const rawId = typeof (x as { id?: unknown })?.id === 'string' ? (x as { id: string }).id.slice(0, 80) : '?';
      const baseError = checkBase(x);
      if (baseError) { rejected.push({ id: rawId, reason: baseError }); continue; }
      const e = x as StoredEvent;
      if (pushed.has(e.id) || deps.store.has(fam, e.id)) { duplicates++; pushed.add(e.id); continue; }
      const r = checkEvent(e);
      if (!r.ok && !r.newer) { rejected.push({ id: e.id, reason: r.reason }); continue; }
      toStore.push(r.ok ? (r.event as StoredEvent) : e);
      pushed.add(e.id);
    }
    deps.store.append(fam, toStore);
    const page = deps.store.since(fam, after as number, PULL_MAX_EVENTS);
    const out: SyncResponse = {
      accepted: toStore.length, duplicates, rejected,
      events: page.events.filter(e => !pushed.has(e.id)), cursor: page.cursor, more: page.more,
    };
    send(res, 200, out);
  }

  function unknownNames(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): void {
    const token = bearer(req);
    if (!token || !deps.auth.isAdmin(token)) throw new HttpError(401, 'admin token needed');
    const family = query.get('family') ?? 'emma';
    if (!FAMILY_RE.test(family)) throw new HttpError(400, 'bad family');
    const events = deps.store.all(family).filter(e => e.v <= SCHEMA_VERSION && checkEvent(e).ok) as unknown as GameEvent[];
    const out: UnknownNamesResponse = { family, names: unknownNamesFrom(events) };
    send(res, 200, out);
  }

  return async (req, res, subpath) => {
    const url = new URL(req.url ?? '/', 'http://local');
    try {
      if (subpath === 'health' && req.method === 'GET') return send(res, 200, { ok: true, schema: SCHEMA_VERSION });
      if (subpath === 'pair' && req.method === 'POST') return await pair(req, res);
      if (subpath === 'sync' && req.method === 'POST') return await sync(req, res);
      if (subpath === 'admin/unknown-names' && req.method === 'GET') return unknownNames(req, res, url.searchParams);
      throw new HttpError(404, 'no such API call');
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      throw err;
    }
  };
}
```

- [ ] **Step 5: Mount the API in the server**

`server/serve.ts` becomes:

```ts
// One Node server for the home network: the repo as static files, the v3 build under its base path,
// and (from release 1.3) the save API. Run from the repo root: node games/moon-meadow-home/server/serve.ts
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { serveStatic } from './static.ts';
import { createApi } from './api.ts';
import { openAuth } from './auth.ts';
import { DEFAULT_DATA, openServerStore } from './store.ts';

export type ApiHandler = (req: http.IncomingMessage, res: http.ServerResponse, subpath: string) => Promise<void>;
export type ServerOptions = { root: string; base: string; gameDir: string; csp: boolean; api?: ApiHandler };

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
export const GAME_DIR = path.resolve(import.meta.dirname, '..', process.env.MOON_DIST ?? 'dist');
export const DEFAULT_BASE = '/games/moon-meadow-home/';

export function createServer(o: ServerOptions): http.Server {
  const apiPrefix = o.base + 'api/';
  return http.createServer((req, res) => {
    let pathname: string;
    try { pathname = new URL(req.url ?? '/', 'http://local').pathname; } catch { res.writeHead(400).end(); return; }
    if (pathname.startsWith(apiPrefix)) {
      if (!o.api) { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"no save API on this server"}'); return; }
      o.api(req, res, pathname.slice(apiPrefix.length)).catch(err => {
        console.error('[api]', err);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"server error"}');
      });
      return;
    }
    serveStatic(req, res, pathname, { root: o.root, mounts: [{ prefix: o.base, dir: o.gameDir, csp: o.csp }] });
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8765);
  const host = process.env.HOST ?? '0.0.0.0';
  const base = process.env.MOON_BASE ?? DEFAULT_BASE;
  const dataDir = process.env.MOON_DATA ?? DEFAULT_DATA;
  const store = openServerStore(dataDir);
  const api = createApi({ store, auth: openAuth(dataDir), trustProxy: process.env.TRUST_PROXY === '1' });
  const server = createServer({ root: REPO_ROOT, base, gameDir: GAME_DIR, csp: process.env.MOON_CSP !== 'off', api });
  const stop = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  server.listen(port, host, () => {
    console.log(`Serving ${REPO_ROOT} on http://${host}:${port}/`);
    console.log(`On the iPad: http://${os.hostname().replace(/\.local$/, '')}.local:${port}${base}`);
    console.log(`Save API at ${base}api/, data in ${dataDir}`);
  });
}
```

- [ ] **Step 6: Run the server tests and a real run**

Run: `npx vitest run tests/server`
Expected: PASS, 22 tests in 4 files.

Then, from the repo root (outside the sandbox if binding the port is refused):

```bash
PORT=8799 HOST=127.0.0.1 MOON_DATA="$TMPDIR/moon-data" node games/moon-meadow-home/server/serve.ts   # in the background
curl -s http://127.0.0.1:8799/games/moon-meadow-home/api/health
node games/moon-meadow-home/server/admin.ts pair --family test --data "$TMPDIR/moon-data"
lsof -ti tcp:8799 | xargs kill
```

Expected: `{"ok":true,"schema":1}` and a line `Pairing code for family "test": <6 digits>`.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/server/api.ts games/moon-meadow-home/server/serve.ts games/moon-meadow-home/tests/helpers/server.ts games/moon-meadow-home/tests/server/api.test.ts
git commit -m "Add the save API: pairing, sync and unknown names"
```

**Acceptance:** pairing, per-event rejection, newer schema versions, paging over 2,000, the test family, limits and the admin-only name list all work through real HTTP.

### Task C5: The sync client

**Files:**
- Create: `src/sync/client.ts`
- Test: `tests/sync/sync.test.ts`

**Interfaces:**
- Consumes: `utf8` (A1), `Backend`, `EventRow` (A8), `IngestResult`, `GameData` (A9), protocol (C2), `startTestServer` (C4).
- Produces: `SYNC_EVERY_MS = 120000`, `BACKOFF_START_MS = 30000`, `BACKOFF_MAX_MS = 1800000`, `type SyncState = 'unpaired' | 'idle' | 'syncing' | 'offline' | 'error' | 'unauthorised'`, `type SyncStatus = { state; family; lastSuccess; lastError; nextTry; unsent; rejected }`, `type PairResult`, `type SyncPort = { backend: Backend; device(): string; ingest(raw, opts): Promise<IngestResult> }` (a `GameData` fits it), `type SyncOptions = { port; apiBase; label?; fetch?; now?; schedule?; isOnline? }`, `interface SyncClient { pair(code); syncNow(); status(); start(); stop(); unpair(); onChange(fn) }`, `takeChunk(rows, maxBytes?): EventRow[]`, `createSync(o: SyncOptions): SyncClient`.

One sync run pushes unsent events in chunks (at most 1,000 events or 1 MB), marks accepted ones as on the server and rejected ones as refused, ingests what the server returns, stores the cursor after every call, and repeats until nothing is unsent and the server says no `more`. Only one run at a time. Pairing stores the token, resets the cursor and marks every stored event unsent, so a new family gets the whole log. A 401 stops sync until the next pairing.

- [ ] **Step 1: Write the failing test**

`tests/sync/sync.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSync, takeChunk } from '../../src/sync/client.ts';
import type { SyncClient } from '../../src/sync/client.ts';
import { openGameData } from '../../src/save/game-data.ts';
import type { GameData } from '../../src/save/game-data.ts';
import { memoryBackend } from '../../src/save/backend.ts';
import type { EventRow } from '../../src/save/backend.ts';
import { openIdbBackend } from '../../src/save/idb.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import type { CoreState } from '../../src/core/world/index.ts';
import { uuid4 } from '../../src/core/ids.ts';
import { fakeDevice, hatch, named, pin, setting } from '../helpers/events.ts';
import { startTestServer } from '../helpers/server.ts';
import type { TestServer } from '../helpers/server.ts';

const folder = createGameFolder([]);
let srv: TestServer;
beforeEach(async () => { srv = await startTestServer(); });
afterEach(async () => { await srv.close(); });

async function device(over: { idb?: boolean } = {}): Promise<{ data: GameData<CoreState>; sync: SyncClient; timers: (() => void)[] }> {
  const backend = over.idb ? await openIdbBackend(`sync-${uuid4()}`) : memoryBackend();
  const data = await openGameData({ folder, contentHash: 'c', codeVersion: 'b', backend });
  const timers: (() => void)[] = [];
  const sync = createSync({
    port: data, apiBase: srv.apiBase, label: 'test',
    schedule: fn => { timers.push(fn); return () => {}; },
  });
  return { data, sync, timers };
}

describe('takeChunk', () => {
  it('stops at the byte limit but always takes one row', () => {
    const rows = fakeDevice('aaaaaaaa').add([setting('a', 'x'.repeat(100)), setting('b', 1)], 1).map(e => ({ id: e.id, e, s: 0 }) as EventRow);
    expect(takeChunk(rows, 50)).toHaveLength(1);
    expect(takeChunk(rows, 10_000)).toHaveLength(2);
  });
});

describe('sync client', () => {
  it('is unpaired until a code is used, and refuses a bad code', async () => {
    const { sync } = await device();
    expect((await sync.syncNow()).state).toBe('unpaired');
    expect(await sync.pair('12')).toEqual({ ok: false, reason: 'invalid' });
    expect(await sync.pair('000000')).toEqual({ ok: false, reason: 'invalid' });
    const code = srv.auth.createCode('test').code;
    expect(await sync.pair(code.slice(0, 3) + ' ' + code.slice(3))).toEqual({ ok: true, family: 'test' });
  });

  it('two devices that played offline end with the union of both herds, and no lost pin or name', async () => {
    const a = await device({ idb: true });
    const b = await device();
    a.data.commit([hatch('a1'), named('a1', 'Pip'), pin('a1', 'p1')]);
    b.data.commit([hatch('b1'), named('b1', 'Daisy'), pin('b1', 'p2'), pin('a9', 'lost-if-a9-missing')]);
    await a.data.flush();
    await b.data.flush();
    expect(await a.sync.pair(srv.auth.createCode('emma').code)).toMatchObject({ ok: true });
    expect(await b.sync.pair(srv.auth.createCode('emma').code)).toMatchObject({ ok: true });
    await a.sync.syncNow();
    await b.sync.syncNow();
    await a.sync.syncNow();
    const ha = a.data.folded().state.herd;
    const hb = b.data.folded().state.herd;
    expect(ha).toEqual(hb);
    expect(Object.values(ha.babies).map(x => [x.name, x.sash.map(p => p.pin)]).sort()).toEqual([['Daisy', ['p2']], ['Pip', ['p1']]]);
    expect(a.sync.status()).toMatchObject({ state: 'idle', unsent: 0, family: 'emma' });
    expect(srv.store.size('emma')).toBe(7);
  });

  it('pushes 20,000 events in chunks and the other device pulls them in pages', async () => {
    const a = await device();
    const b = await device();
    for (let i = 0; i < 20; i++) a.data.commit(Array.from({ length: 1000 }, (_, k) => setting(`k${k % 10}`, i * 1000 + k)));
    await a.data.flush();
    await a.sync.pair(srv.auth.createCode('emma').code);
    await a.sync.syncNow();
    expect(srv.store.size('emma')).toBe(20_000);
    await b.sync.pair(srv.auth.createCode('emma').code);
    await b.sync.syncNow();
    expect(b.data.allEvents()).toHaveLength(20_000);
    expect(b.data.folded().state.settings).toEqual(a.data.folded().state.settings);
  }, 60_000);

  it('backs off when the server is down and recovers', async () => {
    const { data, sync, timers } = await device();
    await sync.pair(srv.auth.createCode('emma').code);
    sync.start();
    await sync.syncNow();
    await srv.close();
    data.commit([setting('x', 1)]);
    const s = await sync.syncNow();
    expect(s.state).toBe('offline');
    expect(s.unsent).toBe(1);
    expect(s.nextTry).not.toBeNull();
    expect(timers.length).toBeGreaterThan(0);
    srv = await startTestServer();
    sync.stop();
  });

  it('stops after the server forgets the device, until it is paired again', async () => {
    const { sync } = await device();
    await sync.pair(srv.auth.createCode('emma').code);
    await sync.syncNow();
    for (const d of srv.auth.devices()) srv.auth.revoke(d.dev);
    expect((await sync.syncNow()).state).toBe('unauthorised');
    expect(await sync.pair(srv.auth.createCode('emma').code)).toMatchObject({ ok: true });
    expect((await sync.syncNow()).state).toBe('idle');
  });

  it('a restored device after an eviction gets everything back and can leave its fresh start out', async () => {
    const old = await device();
    old.data.commit([hatch('h1'), named('h1', 'Rose')]);
    await old.sync.pair(srv.auth.createCode('emma').code);
    await old.sync.syncNow();
    const fresh = await device();
    fresh.data.commit([hatch('oops')]);
    await fresh.data.flush();
    await fresh.sync.pair(srv.auth.createCode('emma').code);
    await fresh.sync.syncNow();
    await fresh.data.excludeLocalPlay();
    await fresh.sync.syncNow();
    expect(fresh.data.folded().state.herd.order).toEqual(['h1']);
    await old.sync.syncNow();
    expect(old.data.folded().state.herd.order).toEqual(['h1']);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/sync/sync.test.ts`
Expected: FAIL, "Failed to load url ../../src/sync/client.ts".

- [ ] **Step 3: Write the implementation**

`src/sync/client.ts`:

```ts
// The sync client: pairs the device and exchanges events with the save server in the background.
// It never blocks play and never shows Emma anything.
import { utf8 } from '../core/hash.ts';
import type { Backend, EventRow } from '../save/backend.ts';
import type { IngestResult } from '../save/game-data.ts';
import { PAIR_CODE_RE, PUSH_MAX_BYTES, PUSH_MAX_EVENTS } from './protocol.ts';
import type { PairResponse, SyncResponse } from './protocol.ts';

export const SYNC_EVERY_MS = 2 * 60_000;
export const BACKOFF_START_MS = 30_000;
export const BACKOFF_MAX_MS = 30 * 60_000;

export type SyncState = 'unpaired' | 'idle' | 'syncing' | 'offline' | 'error' | 'unauthorised';
export type SyncStatus = {
  state: SyncState;
  family: string | null;
  lastSuccess: number | null;
  lastError: string | null;
  nextTry: number | null;
  unsent: number;
  rejected: number;
};
export type PairResult = { ok: true; family: string } | { ok: false; reason: 'invalid' | 'blocked' | 'offline' | 'error' };

/** What the client needs from the game data (src/save/game-data.ts). */
export type SyncPort = {
  backend: Backend;
  device(): string;
  ingest(raw: readonly unknown[], opts: { fromServer: boolean }): Promise<IngestResult>;
};
export type SyncOptions = {
  port: SyncPort;
  /** The API folder, ending in a slash, for example `${import.meta.env.BASE_URL}api/`. */
  apiBase: string;
  label?: string;
  fetch?: typeof fetch;
  now?: () => number;
  /** Runs fn after ms; returns a cancel function. */
  schedule?: (fn: () => void, ms: number) => () => void;
  isOnline?: () => boolean;
};
export interface SyncClient {
  pair(code: string): Promise<PairResult>;
  syncNow(): Promise<SyncStatus>;
  status(): SyncStatus;
  /** Syncs now and then every 2 minutes, or after the backoff when the last try failed. */
  start(): void;
  stop(): void;
  unpair(): Promise<void>;
  onChange(fn: (s: SyncStatus) => void): () => void;
}

/** Rows up to the byte limit, always at least one. */
export function takeChunk(rows: readonly EventRow[], maxBytes: number = PUSH_MAX_BYTES): EventRow[] {
  const out: EventRow[] = [];
  let bytes = 0;
  for (const r of rows) {
    const size = utf8(JSON.stringify(r.e)).length + 1;
    if (out.length > 0 && bytes + size > maxBytes) break;
    out.push(r);
    bytes += size;
  }
  return out;
}

export function createSync(o: SyncOptions): SyncClient {
  const doFetch = o.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const now = o.now ?? Date.now;
  const schedule = o.schedule ?? ((fn: () => void, ms: number) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); });
  const isOnline = o.isOnline ?? (() => globalThis.navigator?.onLine !== false);
  const backend = o.port.backend;
  let status: SyncStatus = { state: 'unpaired', family: null, lastSuccess: null, lastError: null, nextTry: null, unsent: 0, rejected: 0 };
  let running: Promise<SyncStatus> | null = null;
  let backoff = 0;
  let cancelTimer: (() => void) | null = null;
  let started = false;
  const listeners = new Set<(s: SyncStatus) => void>();

  function set(patch: Partial<SyncStatus>): void {
    status = { ...status, ...patch };
    for (const fn of listeners) fn(status);
  }

  function plan(ms: number): void {
    cancelTimer?.();
    cancelTimer = null;
    if (!started) { set({ nextTry: null }); return; }
    set({ nextTry: now() + ms });
    cancelTimer = schedule(() => { void syncNow(); }, ms);
  }

  async function post<T>(path: string, body: unknown, token?: string): Promise<{ status: number; body: T | null }> {
    const res = await doFetch(o.apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    let parsed: T | null = null;
    try { parsed = (await res.json()) as T; } catch { parsed = null; }
    return { status: res.status, body: parsed };
  }

  async function counts(): Promise<Pick<SyncStatus, 'unsent' | 'rejected'>> {
    return { unsent: await backend.countState(0), rejected: await backend.countState(2) };
  }

  async function run(): Promise<SyncStatus> {
    const pairing = await backend.getMeta('pairing');
    if (!pairing) { set({ state: 'unpaired', family: null, ...(await counts()) }); return status; }
    if (status.state === 'unauthorised') return status;
    if (!isOnline()) { set({ state: 'offline' }); plan(SYNC_EVERY_MS); return status; }
    set({ state: 'syncing', family: pairing.family });
    const meta = (await backend.getMeta('sync')) ?? { cursor: 0, lastSuccess: null, lastError: null };
    try {
      for (let round = 0; round < 500; round++) {
        const rows = await backend.rowsWithState(0, PUSH_MAX_EVENTS);
        const chunk = takeChunk(rows);
        const r = await post<SyncResponse>('sync', { dev: o.port.device(), after: meta.cursor, events: chunk.map(x => x.e) }, pairing.token);
        if (r.status === 401) {
          set({ state: 'unauthorised', lastError: 'The server no longer knows this device. Pair again.', nextTry: null });
          cancelTimer?.();
          return status;
        }
        if (r.status !== 200 || !r.body) throw new Error(`server answered ${r.status}`);
        const refused = new Set(r.body.rejected.map(x => x.id));
        await backend.setState(chunk.filter(x => !refused.has(x.id)).map(x => x.id), 1);
        await backend.setState(chunk.filter(x => refused.has(x.id)).map(x => x.id), 2);
        if (r.body.events.length > 0) await o.port.ingest(r.body.events, { fromServer: true });
        meta.cursor = r.body.cursor;
        await backend.setMeta('sync', meta);
        if (!r.body.more && chunk.length === rows.length && rows.length < PUSH_MAX_EVENTS) break;
      }
      meta.lastSuccess = now();
      meta.lastError = null;
      await backend.setMeta('sync', meta);
      backoff = 0;
      set({ state: 'idle', lastSuccess: meta.lastSuccess, lastError: null, ...(await counts()) });
      plan(SYNC_EVERY_MS);
    } catch (err) {
      const offline = err instanceof TypeError || !isOnline();
      backoff = backoff ? Math.min(backoff * 2, BACKOFF_MAX_MS) : BACKOFF_START_MS;
      meta.lastError = err instanceof Error ? err.message : String(err);
      await backend.setMeta('sync', meta);
      set({ state: offline ? 'offline' : 'error', lastError: meta.lastError, ...(await counts()) });
      plan(backoff);
    }
    return status;
  }

  function syncNow(): Promise<SyncStatus> {
    running ??= run().finally(() => { running = null; });
    return running;
  }

  return {
    async pair(code) {
      const clean = code.replace(/\s/g, '');
      if (!PAIR_CODE_RE.test(clean)) return { ok: false, reason: 'invalid' };
      let r: { status: number; body: PairResponse | null };
      try {
        r = await post<PairResponse>('pair', { code: clean, dev: o.port.device(), label: o.label ?? 'iPad' });
      } catch {
        return { ok: false, reason: 'offline' };
      }
      if (r.status === 429) return { ok: false, reason: 'blocked' };
      if (r.status === 403 || r.status === 400) return { ok: false, reason: 'invalid' };
      if (r.status !== 200 || !r.body) return { ok: false, reason: 'error' };
      await backend.setMeta('pairing', { token: r.body.token, family: r.body.family, pairedAt: now() });
      await backend.setMeta('sync', { cursor: 0, lastSuccess: null, lastError: null });
      await backend.resetStates();
      backoff = 0;
      set({ state: 'idle', family: r.body.family, lastError: null });
      void syncNow();
      return { ok: true, family: r.body.family };
    },
    syncNow,
    status: () => status,
    start() {
      started = true;
      void syncNow();
    },
    stop() {
      started = false;
      cancelTimer?.();
      cancelTimer = null;
    },
    async unpair() {
      await backend.deleteMeta('pairing');
      await backend.deleteMeta('sync');
      set({ state: 'unpaired', family: null, lastSuccess: null, nextTry: null });
    },
    onChange(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}
```

- [ ] **Step 4: Run all tests and the type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, 115 tests in 20 files. No type errors.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/sync/client.ts games/moon-meadow-home/tests/sync/sync.test.ts
git commit -m "Add the sync client with pairing, chunked push, paged pull and backoff"
```

**Acceptance:** two devices that played offline end with the union of both herds and no lost pin or name (spec 7.3 check 8), 20,000 events go up in chunks and come down in pages, and a restored device can leave its fresh start out.

### Task C6: Run the save server on the Mac, freeze schema v1, write the odin deploy note

**Files:**
- Create: `server/DEPLOY.md`, `server/deploy/moon-meadow.service`, `server/deploy/nginx-unicorns.conf`
- Modify: `src/core/events.ts` (the comment above `SCHEMA_VERSION`), `server/README.md` (save API section)

**Interfaces:**
- Consumes: C2 to C5.
- Produces: the deploy note and its two config files; the schema rule that every later change adds a version and a migration.

- [ ] **Step 1: Freeze schema version 1**

In `src/core/events.ts`, replace the comment above `SCHEMA_VERSION` with:

```ts
/**
 * Schema version of new events. Version 1 is frozen since release 1.3, when the save server started to keep
 * Emma's events. Any change to an event type now adds a version, a migration in migrate.ts and its unit test.
 */
```

- [ ] **Step 2: Write the deploy files**

`server/DEPLOY.md`:

````markdown
# Deploying to odin

Tjitse deploys. Agents never SSH to odin. Everything below runs on Tjitse's Mac or on odin by Tjitse.

## What runs where

- nginx on odin terminates HTTPS for `odin.vendic.cloud` and proxies `/unicorns/` to the Node server on `127.0.0.1:8765`.
- The Node server (`games/moon-meadow-home/server/serve.ts`, Node 24.19.0) serves the build in `dist/` under `/unicorns/` and the save API under `/unicorns/api/`.
- Data lives in `/var/lib/moon-meadow`: one folder per family with `events.jsonl` and 30 daily copies, plus `devices.json`, `codes.json` and `admin.json` (token hashes only).

## Build on the Mac

```sh
cd games/moon-meadow-home
npm ci
npm test
npx vite build --base /unicorns/
```

## Copy to odin (first time and every release)

The server imports the shared event code from `src/core/` and `src/sync/protocol.ts`, so those go along with `server/` and `dist/`.

```sh
rsync -av --delete --relative \
  games/moon-meadow-home/./dist \
  games/moon-meadow-home/./server \
  games/moon-meadow-home/./src/core \
  games/moon-meadow-home/./src/sync/protocol.ts \
  odin.vendic.cloud:/opt/moon-meadow/games/moon-meadow-home/
```

Deploy the server before the app. The server stores events with a newer schema version without checking them, so an older server never refuses a newer device.

## First-time setup on odin

```sh
sudo useradd --system --home /var/lib/moon-meadow --shell /usr/sbin/nologin moon
sudo install -d -o moon -g moon -m 700 /var/lib/moon-meadow
sudo cp /opt/moon-meadow/games/moon-meadow-home/server/deploy/moon-meadow.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now moon-meadow
```

Add `server/deploy/nginx-unicorns.conf` inside the `server { }` block of `odin.vendic.cloud`, then `sudo nginx -t && sudo systemctl reload nginx`.

Check: `curl https://odin.vendic.cloud/unicorns/api/health` answers `{"ok":true,"schema":1}`.

## Pairing a device

```sh
sudo -u moon MOON_DATA=/var/lib/moon-meadow node /opt/moon-meadow/games/moon-meadow-home/server/admin.ts pair --family emma
```

Type the 6-digit code in the parent corner, under Pairing, within 15 minutes. Use `--family test` for Tjitse's test and demo devices, so their play never reaches Emma's log.

Other commands: `devices`, `revoke <device id>`, `delete-family <family> --yes` (stop the service first).

## The admin token for names:pull

```sh
sudo -u moon MOON_DATA=/var/lib/moon-meadow node /opt/moon-meadow/games/moon-meadow-home/server/admin.ts admin-token --env-file /tmp/moon-admin-token
```

Copy the `MOON_ADMIN_TOKEN=...` line from that file into the repo's key file on the Mac by hand, then delete `/tmp/moon-admin-token`. The command writes the token to the file and never prints it.

## Backups and removal

- Daily copies: `/var/lib/moon-meadow/families/<family>/daily/`, the last 30 days.
- Everything of a family, on request: stop the service, run `delete-family <family> --yes`, start the service.
````

`server/deploy/moon-meadow.service`:

```ini
[Unit]
Description=Moon Meadow game and save server
After=network.target

[Service]
Type=simple
User=moon
Group=moon
WorkingDirectory=/opt/moon-meadow
Environment=PORT=8765
Environment=HOST=127.0.0.1
Environment=MOON_BASE=/unicorns/
Environment=MOON_DATA=/var/lib/moon-meadow
Environment=TRUST_PROXY=1
ExecStart=/usr/bin/node /opt/moon-meadow/games/moon-meadow-home/server/serve.ts
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/moon-meadow

[Install]
WantedBy=multi-user.target
```

`server/deploy/nginx-unicorns.conf`:

```nginx
# Inside the server { } block for odin.vendic.cloud (HTTPS). The Node server sets cache headers and the CSP.
location = /unicorns {
    return 301 /unicorns/;
}

location /unicorns/ {
    proxy_pass http://127.0.0.1:8765;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # overwrite, never append, so a client cannot choose its own address for the pairing limit
    proxy_set_header X-Forwarded-For $remote_addr;
    client_max_body_size 2m;
    access_log off;
}
```

- [ ] **Step 3: Add the save API to the README**

Append to `server/README.md`:

```markdown
## Save API on the Mac (release 1.3)

The same server answers the save API under `/games/moon-meadow-home/api/`. Data goes to `.data/moon-meadow/` in the repo (ignored by git, never served).

- Pair Emma's iPad: `node games/moon-meadow-home/server/admin.ts pair --family emma`, then type the code in the parent corner, under Pairing.
- Pair a test or demo device: `node games/moon-meadow-home/server/admin.ts pair --family test`.
- List and revoke devices: `devices`, `revoke <device id>`.
- odin: see `DEPLOY.md`.
```

- [ ] **Step 4: Check the whole save path end to end**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, 115 tests in 20 files.

Then the two-context browser check of spec 6.2 ("Sync between two browser contexts against a local server"), once the parent corner's Pairing screen exists (K8). From the repo root, outside the sandbox:

```bash
npm --prefix games/moon-meadow-home run build
PORT=8799 HOST=127.0.0.1 MOON_DATA="$TMPDIR/moon-data" node games/moon-meadow-home/server/serve.ts   # in the background
node games/moon-meadow-home/server/admin.ts pair --family test --data "$TMPDIR/moon-data"
node games/moon-meadow-home/server/admin.ts pair --family test --data "$TMPDIR/moon-data"
playwright-cli -s=synca open http://127.0.0.1:8799/games/moon-meadow-home/
playwright-cli -s=syncb open http://127.0.0.1:8799/games/moon-meadow-home/
```

Pair each session with one code through the parent corner, hatch and name one baby in each, call `playwright-cli -s=synca eval "window.__game.syncNow()"`, then `-s=syncb`, then `-s=synca` again, and read `window.__game.state()` in both.
Expected: both sessions list both babies with their names; the console of both has no errors. Close both sessions, stop the server with `lsof -ti tcp:8799 | xargs kill`, and move screenshots to `$TMPDIR`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/events.ts games/moon-meadow-home/server/DEPLOY.md games/moon-meadow-home/server/deploy games/moon-meadow-home/server/README.md
git commit -m "Freeze event schema v1 and add the odin deploy note for the save server"
```

**Acceptance:** the save API runs on the Mac next to the game, two browser contexts sync to the union, and Tjitse has a complete deploy note for odin.

---

## Spec coverage

| Spec | Task |
|---|---|
| 4.4 event shape, hybrid clock, fold order | A2, A3, A4 |
| 4.4 event types in the first playable | A3 (29 types plus `placement.done`), B1, C1 |
| 4.4 recorded facts and derived state, `missingFacts` emitted once | A6, A9 (`reconcile`) |
| 4.4 excluding play | A5, A9 (`exclude`, `excludeLocalPlay`) |
| 4.4 IndexedDB layout, one transaction per act | A8 |
| 4.4 snapshot every 10 s and at visit end, refold on doubt | A5, A9 |
| 4.4 migrations | A3 (`upgradeWith`), C6 (freeze) |
| 4.5 API, conflicts, versions, server storage | A7 (conflict rules in folds), C2, C3, C4, C5 |
| 4.6 offline, export, import merges, reset | A6, A9, A10 |
| 4.7 errors: write failure, eviction, quarantine, corrupt snapshot, 401, backoff | A5, A9, C5 |
| 4.8 security: tokens hashed, limits, body size, no CORS, CSP, delete-family | A11, C3, C4 |
| 2.9 v2 mapping, `move.html`, same-origin read, import twice adds nothing | A6, A7, A10, A12, A9 |
| 5.3 hosting and deploy | A11 (Mac tonight), C6 (odin note) |
| 6.1 Merge and Save unit tests, Server unit tests | A4, A5, A7, A9, C2 to C5 |
| 7.3 checks 6 and 8 | A6, A7 (fixture), C5, C6 |
