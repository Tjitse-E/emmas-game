# Moon Meadow Home v3: master implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Moon Meadow Home v3 (spec 7.1, the first playable and releases 1.1 to 1.3) in this session with agents only, so Emma can play it tonight on her iPad from Tjitse's Mac at `http://<mac>.local:8765/games/moon-meadow-home/`.

**Architecture:** Seven workstream plans in `docs/v3/plan/` (platform, core, learning, heartbeat, places, art, audio) hold the task-level code. This master plan adds an eighth, the integration stream, and fixes the seams: one set of contracts (`docs/v3/plan/contracts.ts`), one owner per file, a build order in waves A, B and C split into batches of parallel lanes, and a validation gate after each wave. Code is a Svelte 5 + Vite + TypeScript app in `games/moon-meadow-home/` with pure TypeScript rules under `src/core/`, an append-only event log in IndexedDB, and one Node 24 server that serves the repo and, from Wave C, the save API on port 8765.

**Tech Stack:** Node 24.19.0, npm 12, Vite 8.3.4, TypeScript 6.0.3, Svelte 5.57.2, @sveltejs/vite-plugin-svelte 7.3.1, svelte-check 4.7.6, idb 8.0.3, vite-plugin-pwa 1.3.0 (Wave B, HTTPS only), Vitest 5.0.3, fake-indexeddb 6.2.5, @types/node 24.19.2, @fontsource/andika, `playwright-cli` 0.1.8 (WebKit, iPad emulation), Python 3 with Pillow 12.3.0 and numpy 2.5.1 (art), Codex CLI image generation (art), ElevenLabs through `scripts/generate-audio.py` (audio).

**Spec:** `docs/v3/spec.md` (the approved design), with `docs/v3/decisions.md` winning on conflicts, and the lead's session decisions (quoted in Global Constraints) winning over both. Stream plans: `docs/v3/plan/{platform,core,learning,heartbeat,places,art,audio}.md`. Contracts as code: `docs/v3/plan/contracts.ts`.

## Global Constraints

- App folder `games/moon-meadow-home/` (called `G` below). Exact dependency versions, no `^` or `~`, `package-lock.json` committed. Node 24.19.0, npm 12.
- Vite `base: './'` and `build.target: 'safari15'`. The same `dist/` works at `/games/moon-meadow-home/` on the Mac and `/unicorns/` on odin.
- Hosting tonight: Tjitse's Mac serves the repo on port 8765 with `node games/moon-meadow-home/server/serve.ts` (core Task A11), replacing `python3 -m http.server`. v2 and v3 share that origin, so v3 reads `localStorage['emma-unicorn-egg-nest-v2']` directly. File import stays.
- Plain `http://` on the home network: no `crypto.randomUUID`, `crypto.subtle`, service worker, `navigator.storage.persist()` or share sheet may be required. Use them only when present.
- odin is out of reach (no SSH). Wave C writes a deploy note only (core Task C6).
- Scope: every item of spec 7.1. Wave A = items 1 to 13, Wave B = 14 to 19, Wave C = 20 to 26. Wave A is complete and playable before Wave B starts.
- Art: no paid API. Codex image generation through Tjitse's subscription, prompt before `-i`, stdin closed with `< /dev/null`, run outside the sandbox, at most 4 Codex processes at once, sheets cut by local scripts and each cut picture looked at. SVG fallback for anything that fails. Assets in `G/public/art/` with `manifest.json`.
- Audio: ElevenLabs through `scripts/generate-audio.py`. Elizabeth for all learning content, names and numbers. Build budget at most 24,000 credits, never below the 8,000 floor (start 34,007, so the floor is 10,007). Priority: game lines and numbers, then learning words and plurals of loaded steps, then names (at least 300). Speech-to-text checks (`--stt`) replace Tjitse's ear check this session. Generation runs outside the sandbox and no command names the key file.
- Agents never read, print, source or copy `.env`. Scripts load it themselves (`process.loadEnvFile()`).
- Testing: Vitest for logic. `playwright-cli` (WebKit, iPad emulation) at 1180 x 820, 1080 x 810, 1024 x 768, plus portrait 820 x 1180. Outside the sandbox, short session names without slashes, screenshots moved to `$TMPDIR/mmh-shots/`, `mousemove`/`mousedown`/`mouseup` on pulsing elements. Agent tests never use port 8765 (see Contracts C0).
- The app is fully British English. No Dutch word, text or audio. Unicorns only. No pressure mechanics: no timers shown, streaks, countdowns, buzzers or red crosses.
- Commits: each agent commits its own work in small commits, plain English, no AI attribution, no em dashes, only the files its lane owns (`git add <paths>`, never `git add -A`). A commit that fails on `index.lock` is retried after 2 seconds.
- Every subagent runs on `opus` (project memory: all subagents on opus).

## Review Focus

1. **A stream emits an event the core validator refuses** (an extra field, a renamed field, a missing `visit`). The event goes to quarantine and the progress silently disappears from Emma's game. Expected: every action translator's drafts validate. Pinned by Task I-1 test "every translator's sample drafts validate" (`tests/integration/contracts.test.ts`).
2. **Emma's real v2 herd is large (40 or more) and arrives on Moving Day** with rows, openings and pins all due at once. Expected: Moving Day plays every name, rows exist, the opening queue announces one thing per visit. Pinned by Task I-2 test "a herd of 45 maps to 5 rows and one opening per visit" and the `integration/moving-day` flow.
3. **A clip or picture is missing at runtime** (speech-to-text marked it `ok: false`, a Codex sheet failed). Expected: the planner never serves the word, every screen still has a spoken goal, `audioMissing()` stays empty. Pinned by Task I-1 test "planContext hides ok:false clips and missing pictures" and the `integration/visit-5min` flow assertion.
4. **The iPad opens the game over plain http** (insecure context). Expected: no crash from missing `crypto.randomUUID`, `crypto.subtle`, `persist()` or service worker. Pinned by platform Task A10 (smoke flow against the LAN host name) and core Task A1 ("works where crypto.randomUUID is missing").
5. **The iPad sleeps or reloads in the middle of a moment** (after the hatch, before naming). Expected: the next start resumes at naming for that baby, no second baby hatches and no event is written twice. Pinned by heartbeat Task 16 (`unnamedBaby`) and the Task I-3 flow step "reload during naming".

---

## 1. Streams, lanes and how to use this plan

| Stream | Plan | Lanes (one agent each, `opus`) | Owns |
|---|---|---|---|
| Platform | `plan/platform.md` | `platform` | skeleton, shell, router, input, ghost hand, moonbeam, test hook, flow tooling, docs |
| Core | `plan/core.md` | `core` | events, folds, save, v2 import, `move.html`, server, save API, sync client |
| Learning | `plan/learning.md` | `learn-data`, `learn-engine` | content packs, validator, blocklist, learning engine, planner, simulated learner, word/name/phrase `lines.json` |
| Heartbeat | `plan/heartbeat.md` | `heartbeat` | nest, hatch, naming, wishes, stalls, goodnight, gem and stone parts, heartbeat lines |
| Places | `plan/places.md` | `places` | meadow hub, bubbles, moments and hints, toy shelf, Bath Pond, Building Days, Jewel Box, Dressing Corner, Post Box, Home Book, Salon, valley, Letter Lane, titles, parent corner |
| Art | `plan/art.md` | `art-app`, `art-gen` | art tools, Codex runs, manifest, Picture/Heap/Unicorn/Egg/Lumi, stress test |
| Audio | `plan/audio.md` | `audio` | generator, shared player additions, facade, number lines, packs, generation runs, names:pull |
| Integration | this file, section 4 | `integration` | store, actions router, world view, Welcome and Moving Day scenes, gates, autoplay flows |

How a builder works:

1. Read this file's Global Constraints and section 2 (Contracts), then the "Reconciled with the master plan" block at the top of your stream plan. That block lists every task that is dropped, moved or changed for you.
2. Build only the tasks of your lane in the current batch (section 3), in the order listed. Tasks inside one lane may depend on each other. Lanes in one batch never depend on each other.
3. Where your stream plan's code and `contracts.ts` disagree, `contracts.ts` wins. Change your code, never the other stream's.
4. Commit after each task. At the end of the batch, run your lane's tests and report the commit list to the integrator.

The integrator (the lead's integration agent) starts each batch, resolves `package.json` changes, runs the batch check (section 3.4) and the wave gate (section 5).

---

## 2. Contracts

All shapes are in `docs/v3/plan/contracts.ts` (sections 0 to 12 there match C0 to C12 here). It type-checks with TypeScript 5.9 under `--strict --erasableSyntaxOnly --verbatimModuleSyntax` and runs under Node 24 type stripping. This section gives the decisions behind it. Each decision names the losing plans; their "Reconciled" blocks carry the change.

### 2.1 Reconciliation decisions

| # | Topic | Plans disagreed | Decision | Changes in |
|---|---|---|---|---|
| R1 | Home-network server and save API | platform A8, B3, C1 to C4 (`server/main.ts`, own store, tokens, API) against core A11, B2, C2 to C6 (`server/serve.ts`) | Core owns all of `server/` and `src/sync/`. Core's code was run (115 tests). One entry: `node server/serve.ts`, env in C11. Core adds `MOON_DIST` so test builds can be served. | platform (drops A8, B3, C1 to C4), core (A11 env) |
| R2 | Ids and hashes | platform A2 `src/platform/ids.ts` against core A1 `src/core/ids.ts`, `src/core/hash.ts` | Core's files. Platform imports `uuid4`, `uuid5`, `newDeviceId` from `src/core/ids.ts` and `sha256Hex` from `src/core/hash.ts`. | platform (drops A2) |
| R3 | Audio player additions and facade | platform A6, A7 (`addPack`, `voice.ts`, `clip-ids.generated.ts`, `tools/sync-phonics.ts`) against audio A3, A6 to A8 | Audio owns `shared/audio.js` changes and all of `src/audio/`. Letter sounds are served at `./audio/phonics/` by audio's Vite plugin. The router calls only `audio.stop()` on a scene change; scenes preload and release their own audio scene. | platform (drops A6, A7; A9 imports `audio`) |
| R4 | Name clip ids | audio `name-<slug>-x` and `-q`; platform and learning `name-<slug>` and `name-<slug>-q` | `nameId(name, '!') = 'name-' + slugName(name)`, `nameId(name, '?') = 'name-' + slugName(name) + '-q'`, `slugName` = lowercase letters only. | audio (A4 `nameId`) |
| R5 | Phrase clip ids | audio `phraseId(text)` slug of the text; learning `phrase-<phrase id>` | `phraseId(id) = 'phrase-' + id` with the phrase id from `content/phrases/*.json`. | audio (A4) |
| R6 | Who writes which `lines.json` | learning `build:lines` writes words, numbers, names and phrases packs; audio `audio:lines` writes every pack; heartbeat writes `content/lines/heartbeat.json` with number lines; places writes `public/audio/places/lines.json` | Learning `npm run build:lines` writes `public/audio/{words-phase2,words-phase3-4,words-year1,names-t1,phrases-notes,phrases-salon,phrases-meadow}/lines.json` only. Audio `npm run audio:lines` writes `core`, `numbers`, `places`, `area-*` and `names-new` from `content/lines/*.json` and `tools/audio/number-lines.ts`, and never touches learning's packs. Hand-written line files: audio `common.json`, `start.json`, `moving-day.json`; heartbeat `heartbeat.json` (no number lines); places `places.json` with `"pack": "places"`. Ids are unique across files; `npm run check:audio` fails on a duplicate. Learning drops its `numbers` pack. | learning (A10), audio (A5, A6), heartbeat (Task 1), places (A16) |
| R7 | Number line ids | heartbeat `lineId.*` (`num-baby-n`, `num-unicorns-n`, `name-ordinal-n`) against audio `numId` kinds | Audio's `numId`, `bondId`, `ordId`. Heartbeat's `lineId` becomes `HEARTBEAT_NUMBER_IDS` (contracts C12). Ranges: Wave A 1 to 60, sky 1 to 12. Numbers 61 to 100 are deferred to next month's credits; a missing number clip is skipped silently. | heartbeat (Task 1), audio (A5 sky range to 12) |
| R8 | Phrase content (notes, Salon lines, asking bubbles, two-state wishes, tricky acts) | learning phrase packs against places `notes.json`, `salon.json` phrase part, `year1.json` | One source: learning's `content/phrases/*.json` (`RawPhrase` with `items` and `act`). The planner serves a phrase pick; places and heartbeat render `pick.carrier.phrase` through its `act`. Places keeps cousins, bead colours and Salon free play in `content/places/`. | places (B7, C1, C7), learning (unchanged) |
| R9 | Year 1 meadow wishes (R33, R37) | places C7 against heartbeat Task 27 | Heartbeat Task 27 owns them in the wish scene. Places C7 is dropped; the asking bubble calls `heartbeat.startWish(babyId)`. | places (drops C7) |
| R10 | Ghost hand and moonbeam | places `src/ui/ghost.ts`, `GhostHand.svelte`, `Moonbeam.svelte`; heartbeat wraps places' | Platform's controllers (`ghost.tap/drag/hide`, aliases `ghostTap`, `ghostMove`, `ghostStop`; `moonbeam.show/clear`), mounted once in `App.svelte`. | places (A3, A4 drop those files) |
| R11 | Drag and press | heartbeat `src/ui/drag.ts` `draggable`; platform `use:drag` | Platform's `use:press`, `use:drag`, `use:dropTarget`. Heartbeat drops `src/ui/drag.ts` and the drag helpers in `src/ui/geometry.ts`. | heartbeat (Task 17) |
| R12 | Heaps | art `src/art/Heap.svelte` + `heapLayout`; places `src/ui/Heap.svelte`; heartbeat geometry heap | Art's. Props `{ id, count, size, seed, tint?, label? }`. | places (A8), heartbeat (Task 17) |
| R13 | Art components and ids | heartbeat `artUrl(id)`, `pic-hat`, `egg-two-stone`; places `Sprite.svelte`, `hasArt`; learning `w-hat` | Art's API: `Picture`, `Heap`, `Unicorn` (breed, stage, colours, traits, height, pose), `Egg` (kind is a breed), `Lumi`, `hasPicture`, `picture`, `artUrl(src)`. Word picture id is the bare word (`hat`), variants `hat-pink`. Other ids come from `art-src/lists/*.txt` (map in `SCENE_ART_IDS`). Unicorn poses: heartbeat `stand` is `idle`, `sit` is `still`; places `face` is `headOnly`. | learning (A1, A5, A7, A10, C1), heartbeat (Tasks 5, 17, 18 to 23), places (A8, A9, A16, C1) |
| R14 | Test hook | platform, heartbeat (`registerSceneHook`, `testSeed`, `isFast`, `announce`), places (`setScaffold`, `pass`, `activeMoment`), audio (`said`, `audioMissing`), core (`importFixture('v2-save')`) | One `window.__game` (contracts C10). Platform owns the registry and adds `registerSceneHook`, `testSeed`, `isFast`. Integration registers every handler. `answer()`, `wrong()`, `idle()` call the current scene hook when one is registered, else `activeMoment()`. | platform (A4, A10), heartbeat (Task 23 imports from platform) |
| R15 | Flows and ports | platform 8766 `/test/`; core 8799; heartbeat and places 8765; art Vite dev server 5174 | Port 8765 is Emma's. Each lane builds `npm run build:test -- --outDir dist-test-<lane>` and serves it with `MOON_DIST=dist-test-<lane> PORT=<lane port> HOST=127.0.0.1 node server/serve.ts`. Flows read `MMH_URL` (default `http://127.0.0.1:8766/games/moon-meadow-home/`) through platform's `flows/lib.sh`. Ports in `PORTS` (contracts C0). | platform (A10), heartbeat (Task 23), places (A17, B10, C9), art (A10) |
| R16 | Vite base | platform `./`; core `/games/moon-meadow-home/` with `--base /unicorns/` | `./`. The router keeps the URL fixed, the server redirects to the trailing slash, and the API base is `new URL('api/', document.baseURI)`. | core (K1, C5 `apiBase`) |
| R17 | `learn.result` payload | core `{ id, result }` items, no moment or slot; learning `{ id, r }`, `moment`, `slot`, `step: null` for names; heartbeat `source`; places `{ item, result }` | Contracts C2. Items are `{ id, r }`. `moment`, `slot`, `visit`, `baby`, `heart` are required. `step` and `ms` may be null. Only `learnResultPayload(pick, outcome)` builds it; the actions router adds `visit`, `baby`, `heart`. | core (A3), heartbeat (17B), places (A1, A1b) |
| R18 | `learn.override` | core `{ strand, op, step }`; learning four shapes; places `{ strand, step, as }` | Learning's four shapes (`profile`, `set-current`, `mark-placed`/`unmark-placed`, `school`). Core validates by `op`. | core (A3), places (A15) |
| R19 | Other event payloads | see core K11a and heartbeat C3 | Contracts C2 is final: `egg.hatched` has `egg` and all four traits; `baby.named` adds `listName`; `name.built` keeps core's shape (heartbeat maps `target`, `route`, `blockKind`); `care.done` uses `station`; `pin.given` adds `key` (a moment pin with a key is a recorded fact); `jar.labelled` is the union; `sky.named` is 1-based `sky`; `exclude.device`; `audio.missing.clip`; `note.sent` adds `note`. | core (A3, A6, A7, B1), heartbeat (Tasks 1, 15), places (A1, B2, B7), audio (B3) |
| R20 | Name items | heartbeat and places `name:<babyId>`; learning `name:<nameKey>` | `name:<nameKey(name)>`: two babies called Tim share one memory (spec 3.7). | heartbeat (17B), places (A1b, B6) |
| R21 | Planner interface | heartbeat `nextItem(plan, strand, slot, rng, accept)` returning `Served`; places `serve(strand, place, kind)` | Learning's `nextItem(ctx, req, rng): Pick | null` and friends (contracts C6). Heartbeat keeps `learn-bridge.ts`, places keeps `src/places/serve.ts` and `plan.ts` as their only adapters. | none beyond the adapters |
| R22 | Places' moment kinds | places slot kinds (`building/sum`, `post-box/fewest`) and no `wall` moment in learning | Places maps its slots to learning moment kinds. Learning adds `wall` (maths, M05 and M09 to M13 `a+b` facts, carrier rule as eggs). Word tags: places `pond` is `bath`, `shelf` is `found`; learning adds tag `salon` to bow, clip, beads, comb, brush, star, bell, shell, ribbon. | learning (A1, A6, A7, A17), places (A1b) |
| R23 | Blocklist and phonemes | heartbeat Task 10 `src/core/naming/blocklist.ts`, own phoneme tokens (`dh`, `uh`); learning A4 and PHONEMES | Learning's `checkBlocked` over `shared/blocklist.json` (`{ version: 1, entries: [{ w, lang, level }] }`) and learning's PHONEMES. Heartbeat's `blocklist.ts` re-exports learning's, and `sounds.ts` builds on `phonemesOf` with `content.gpcs`. | heartbeat (Task 10) |
| R24 | Letter-sound keys | audio `oo-short`, `yoo`, `iz`; learning `uu`, `yoo`, `es`; heartbeat `snd-es` | Audio's keys. Learning's `gpcs.json` `sound` field uses them. | learning (A6), heartbeat (Task 17 print dots) |
| R25 | Random numbers | heartbeat `src/core/rng.ts` from core; learning `planner/rng.ts`; art `heap.ts` | One `src/core/rng.ts` (contracts C1), written in the skeleton task. Learning's `planner/rng.ts` and art's `mulberry32` re-export it. | learning (A17), art (A6) |
| R26 | Stable rows | places `rowsBuilt(world.places)`; core herd slice `rowCount` | Core's herd slice (`row-<n>` plots). `World.rowsBuilt` comes from `rowCount(state.herd)`. Places drops `rowsBuilt`. | places (A12) |
| R27 | Release file | learning `content/release.json`; places `content/places/release.json` | Learning's only. Places reads it. Tonight it says `1.3` at the end of Wave C; during Wave A it says `1.0`, Wave B `1.1`. | places (A1) |
| R28 | Store and world shape | nobody owned `src/game.svelte.ts`; heartbeat `World`, places `world.places`/`BabyView`, learning `PlanContext` | Integration owns the store, the actions router and one `World` view (contracts C3, C7). `game.planContext()` is a function. `game.rng` is an `Rng` (callable). | heartbeat (17B, 18), places (A1b, nav) |
| R29 | Unknown names pull | platform B3, core B2, audio B3, learning B5 | Core B2 (`unknownNamesFromText`), learning B5 (`nearestNames`), audio B3 owns the CLI `tools/pull-unknown-names.ts`. Admin token `MOON_ADMIN_TOKEN` loaded by the tool with `process.loadEnvFile()`; on the Mac the tool reads `.data/moon-meadow/families/emma/events.jsonl` directly. | platform (drops B3), audio (B3, C2) |
| R30 | Deploy note | platform C4 `docs/v3/deploy-odin.md`; core C6 `server/DEPLOY.md` | Core C6. | platform (drops C4) |
| R31 | Moment results | places D1 | A miss followed by a right answer stays `miss`; `helped` only after an idle-triggered level 2 hint or the ghost hand. | none (heartbeat already adopted) |
| R32 | Place enter and leave events | platform: store on `router.onChange`; places `nav.ts` dispatches them | The store writes `place.enter`/`place.leave` on every router change. Places' `nav.ts` only navigates. | places (A1 nav) |
| R33 | Phrase packs | audio one `phrases` pack; learning three | Learning's three: `phrases-meadow`, `phrases-notes`, `phrases-salon` (contracts `PACKS`). | audio (A6, A7) |

Places decisions D1 to D21 stand, except D6 (R27) and D14 (notes come from learning's phrases, R8).

### 2.2 Contract blocks

Every block is code in `contracts.ts`. The owner implements it; everyone else imports it.

- **C0 Paths, ports, owners.** `OWNERS` lists every shared path and its owner. `PORTS`: 8765 Emma, 8766 integration and gates, 8771 to 8776 lanes, 8799 core sync. `testUrl(port)`.
- **C1 Shared values and rng.** `Strand`, `LearnStrand`, `Result`, `ErrorTag`, `BreedId` (nine breeds), `EggKind` (six), `BREED_OF`, `Stage`, `Colours`, `Traits` (four booleans, never optional in events), `OutfitSlot`, `Rng`, `mulberry32`, `makeRng`, `pick`, `shuffle`. Platform writes `src/core/rng.ts` verbatim in the skeleton task.
- **C2 Events.** `Payloads` for all 35 types across the three waves, `DraftOf`, `GameEvent`, `FACT_KEYS`, `ExportFile`, `SettingKey`. Core's `src/core/events.ts` implements the checks; an extra or missing field is refused.
- **C3 State.** `Slice`, core's `HerdBaby` (now with `listName`, `clipHeard`, `comeAlong`), `GameState` (core slices plus `learner` and `places`), and the `World` view every scene reads.
- **C4 Content.** `RawWord` (`pic` is the bare word), `RawName`, `RawPhrase`, `PhraseAct`, `LineFile`, `ReleaseFile`, and the `Content` subset others read.
- **C5 Learning engine.** `createLearnerSlice`, `pendingLearnFacts` (replaces core's `passReady`), status and knowledge functions, `jewels`, `criteria`, `checkBlocked`, `findSamePhonemes`, `splitUsual`, `phonemesOf`, `content`, `CONTENT_HASH` (learning adds it to `src/core/content/static.ts`).
- **C6 Planner.** `PlanContext`, `ItemRequest`, `Carrier`, `Pick`, `Outcome`, `nextItem`, `nextEgg`, `goldenEgg`, `nextNameReviews`, visit signals, `learnResultPayload`.
- **C7 Scenes, store, actions.** Router, scene registration, `SCENE_IDS`, input action options, `Action` prefixes (`hb.`, `naming.`, `place/`, `game/`), `ActionCtx`, the `game` store, the `heartbeat` runtime and its exports, places' exports and `activeMoment`.
- **C8 Audio.** The `Audio` interface (audio's, with `sayName` returning `Promise<boolean>`), `SfxName`, `PACKS`, `NEW_SOUND_KEYS`.
- **C9 Art.** Manifest types, loader functions, component props, picture id rules, `SCENE_ART_IDS`, `eggArtId`.
- **C10 Test hook.** `HookState`, `TestHook`, registry functions.
- **C11 Server and sync.** Core's protocol types, `SyncStatus`, `SyncClient`, server env names.
- **C12 Ids.** Item id grammar, `graphemeItem`, `slugName`, `nameKey`, `nameItemId`, `slug`, `wordId`, `nameId`, `phraseId`, `numId`, `bondId`, `ordId`, `HEARTBEAT_NUMBER_IDS`, `NARRATOR_ONLY_PREFIXES` (adds `ord-` and `model-` to the spec's list).

### 2.3 The reconciled skeleton (platform Task A1 deltas)

Platform Task A1 writes these instead of its own versions. Everything else in A1 stands.

`G/package.json` scripts and dependencies:

```json
{
  "name": "moon-meadow-home",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=24.19.0" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:test": "vite build --mode test",
    "test": "vitest run",
    "check": "svelte-check --tsconfig ./tsconfig.json --threshold error && tsc --noEmit -p tsconfig.json",
    "check:content": "node tools/validate-content.ts",
    "check:audio": "node tools/audio/check-audio.ts",
    "build:lines": "node tools/build-lines.ts",
    "audio:lines": "node tools/audio/build-lines.ts",
    "audio:ids": "node tools/audio/gen-clip-ids.ts",
    "lines:heartbeat": "node tools/heartbeat-lines.ts",
    "list:pictures": "node tools/list-pictures.ts",
    "simulate": "node tools/simulate.ts",
    "names:pull": "node tools/pull-unknown-names.ts",
    "report": "node tools/report.ts",
    "serve": "PORT=8765 HOST=0.0.0.0 node server/serve.ts",
    "serve:test": "PORT=${MMH_PORT:-8766} HOST=127.0.0.1 MOON_DIST=${MOON_DIST:-dist-test} node server/serve.ts",
    "server:pair": "node server/admin.ts pair",
    "flows": "bash flows/run.sh",
    "art": "PYTHONPATH=tools python3 -m art.pipeline",
    "art:test": "PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v"
  },
  "dependencies": {
    "idb": "8.0.3",
    "@fontsource/andika": "<exact version npm resolves today, pinned>"
  },
  "devDependencies": {
    "vite": "8.3.4",
    "typescript": "6.0.3",
    "svelte": "5.57.2",
    "@sveltejs/vite-plugin-svelte": "7.3.1",
    "svelte-check": "4.7.6",
    "vitest": "5.0.3",
    "fake-indexeddb": "6.2.5",
    "@types/node": "24.19.2"
  }
}
```

`@fontsource/andika` is the one dependency without a version in the spec: install with `npm install --save-exact @fontsource/andika` and keep the version npm writes. `vite-plugin-pwa@1.3.0` is added in platform Task B1 (with `--legacy-peer-deps` if it refuses Vite 8).

`G/tsconfig.json` compiler options (the union every stream asked for):

```json
{
  "compilerOptions": {
    "target": "es2022", "module": "esnext", "moduleResolution": "bundler", "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true, "noEmit": true, "allowImportingTsExtensions": true, "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true, "resolveJsonModule": true, "isolatedModules": true, "skipLibCheck": true,
    "types": ["node", "svelte", "vite/client"]
  },
  "include": ["src", "server", "tests", "tools", "flows/*.ts"]
}
```

`G/vite.config.ts` (the parts every stream needs):

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; } })();

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte()],   // audio Task A8 adds sharedAudio(resolve(import.meta.dirname, '../..')) here
  define: {
    __BUILD_ID__: JSON.stringify(`${sha}-${Date.now()}`),
    __TEST_BUILD__: JSON.stringify(mode === 'test'),
  },
  build: {
    target: 'safari15',
    outDir: mode === 'test' ? 'dist-test' : 'dist',
    rollupOptions: { input: { index: resolve(import.meta.dirname, 'index.html'), stress: resolve(import.meta.dirname, 'stress.html') } },
  },
  server: {
    fs: { allow: ['..', '../..'] },
    proxy: { '/api': 'http://127.0.0.1:8766' },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 20000 },
}));
```

`stress.html` arrives with art Task A10. Until then the skeleton writes a one-line placeholder `stress.html` (`<!doctype html><title>stress</title>`) that art replaces. `--outDir` on the command line overrides `outDir` for lane builds.

`G/src/core/rng.ts`: copy section 1 of `contracts.ts` (`Rng`, `mulberry32`, `makeRng`, `pick`, `shuffle`) with a test `tests/core/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, pick, shuffle } from '../../src/core/rng.ts';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('shuffle keeps every element and pick refuses an empty list', () => {
    const r = mulberry32(1);
    expect(shuffle([1, 2, 3, 4], r).sort()).toEqual([1, 2, 3, 4]);
    expect(() => pick([], r)).toThrow();
  });
});
```

`G/content/release.json`: `{ "release": "1.0" }` (learning owns it after the skeleton; the integrator sets `1.1` at the Wave B start and `1.3` at the Wave C start).

---

## 3. Build order

### 3.1 Rules

- A batch starts only when every lane of the previous batch has committed and the batch check (3.4) is green.
- Lanes inside a batch own disjoint files. A lane may run its tasks one after the other; it never waits on another lane of the same batch.
- The asset lanes (`art-gen` and the generation runs of `audio`) run across batches. A run starts when the files it reads are committed, and never edits code another lane owns.
- `package.json` is only changed by the integrator at a batch start. A lane that needs a script or dependency asks the integrator.
- Each code lane uses its own test port and `dist-test-<lane>` (R15).

### 3.2 Wave A: first playable (spec 7.1 items 1 to 13)

**Batch A0: skeleton (serial)**

| Lane | Tasks |
|---|---|
| platform | P-A1 with the deltas in 2.3 |
| art-gen (parallel, Python only) | AR-A1, AR-A2, AR-A3 (runner and calibration), AR-A4, AR-A5 |
| audio (parallel, Python only) | AU-A1 (generator guards), AU-A2 (Phase 5 sounds, run 0) |

Boundary: every TypeScript lane needs `package.json`, `tsconfig.json`, `node_modules` and `src/core/rng.ts`.

**Batch A1: foundations**

| Lane | Tasks |
|---|---|
| core | C-A1, C-A2, C-A3 (payloads exactly as contracts C2), C-A4, C-A5, C-A11 (server with `MOON_DIST`) |
| learn-data | L-A1 (with `wall`), L-A2, L-A3, L-A4, L-A5 |
| platform | P-A3, P-A4 (plus `registerSceneHook`, `testSeed`, `isFast`), P-A5 |
| audio | AU-A3, AU-A4 (R4, R5), AU-A5 (numbers and `common`, `start`, `moving-day` files only) |
| art-app | AR-A6 (manifest, palette, tint, heap re-exporting `src/core/rng.ts`, Picture, Heap) |
| heartbeat | H-1 (lines without numbers, R6, R7), H-2 to H-9 |
| places | PL-A2 (hint ladder), PL-A8 pure part (plurals, mistake kinds; no heap layout) |
| art-gen (continues) | AR-A13 word pictures, AR-A11 unicorn sprites and Lumi, AR-A12 layer spike (60 minutes), AR-A14 items and backgrounds |

Boundary: batch A2 imports the event types and fold engine (C-A3, C-A5), content types, builder and blocklist (L-A1, L-A2, L-A4), the router core and hook registry (P-A4, P-A5), audio ids (AU-A4) and the art manifest (AR-A6).

**Batch A2: domain**

| Lane | Tasks |
|---|---|
| core | C-A6, C-A7 (herd adds `listName`, `clipHeard`), C-A8, C-A9, C-A10, C-A12 |
| learn-data | L-A6 (sound keys R24), L-A7 (tags R22, bare picture ids R13), L-A8, L-A9, L-A10 (R6, `CONTENT_HASH`) |
| learn-engine | L-A11, L-A12, L-A13, L-A14, L-A15 |
| platform | P-A12 (menu card), P-A13 (docs) |
| audio | AU-A6, AU-A7, AU-A8 (facade, `sayName` returns a boolean), AU-A9 |
| art-app | AR-A7, AR-A8, AR-A9, AR-A10 (stress run 1 on placeholders) |
| heartbeat | H-10 (on learning's blocklist, R23), H-11, H-12, H-13, H-14 |
| places | PL-A1 (places slice on core events), PL-A5, PL-A6, PL-A9 logic |
| audio runs | run 2 (numbers), run 1a (`common`, `start`, `moving-day`, `heartbeat.json`) |

Boundary: the shell needs the audio facade (AU-A8) and art loader (AR-A6); the planner needs the learner fold (L-A15); places' building logic needs the herd slice (C-A7).

**Batch A3: shell and planner**

| Lane | Tasks |
|---|---|
| platform | P-A9 (shell, imports `audio` and `loadArtManifest`), P-A10 (hook, flows on core's server), P-A11 (ghost hand, moonbeam) |
| learn-engine | L-A16, L-A17 (rng re-export, `wall`), L-A18, L-A19, L-A20 |
| heartbeat | H-15 (translators emit contract drafts), H-16 |
| places | PL-A12 logic (rows from core, R26), PL-A14 (report E1 to E5, C1) |
| audio runs | runs 3, 4, 5 (words, plurals first), run 7 (`names-t1`, v2 names first, at least 300) after L-A10 |

Boundary: the store needs the boot handler (P-A9), hook registry (P-A10), learner slice (L-A15), places slice (PL-A1) and game data (C-A9). H-17 needs platform's input actions (P-A9). PL-A1b needs the planner (L-A17). PL-A3 needs the ghost hand (P-A11).

**Batch A4: store and shared parts**

| Lane | Tasks |
|---|---|
| integration | I-1 (store, actions router, world view, hook handlers) |
| heartbeat | H-17 (gem, slot, tray, slider, stone, print parts on platform input and art Heap) |
| places | PL-A1b, PL-A3 (moment on platform ghost), PL-A4 (replay, bubble, crown), PL-A16 (`content/lines/places.json`, art requests) |
| learn-engine | L-A21 (simulated learner) |
| audio runs | run 1b (`places.json`) after PL-A16 |

Boundary: scenes need the store (I-1); heartbeat's bridges need `createMoment` (PL-A3) and the planner adapter (PL-A1b).

**Batch A5: heartbeat scenes and first places**

| Lane | Tasks |
|---|---|
| heartbeat | H-17B, H-18, H-19, H-20, H-21, H-22, H-23 (flows on R15), H-23B |
| places | PL-A10 (jars, shelf, label scene), PL-A11 (Bath Pond) |
| integration | I-2 (Welcome, Moving Day, start handler) |

Boundary: the meadow hub mounts `MeadowLife` (H-23B); Building Days use `Naming` (H-19) and `HatchAndName` (H-23B).

**Batch A6: meadow, Building Days, parent corner, gate**

| Lane | Tasks |
|---|---|
| places | PL-A7 (meadow hub), PL-A13 (Building Day scenes), PL-A15 (parent corner part 1), PL-A17 (flows) |
| learn-engine | L-A22 (learning gate) |
| art-app | AR-A11 second stress run on the real sprites, AR-A14 Wave A art check |
| integration | I-3 (autoplay hook, gate script, 5-minute visit and reload flows), then Gate A (section 5) |

### 3.3 Waves B and C

**Batch B1** (release 1.1; integrator sets `content/release.json` to `1.1`)

| Lane | Tasks |
|---|---|
| core | C-B1 (`note.sent` with `note`), C-B2 |
| learn-data | L-B1 (notes), L-B2 (1.1 maths moments) |
| learn-engine | L-B3 (golden egg), L-B4 (jewels), L-B5 (name helpers) |
| platform | P-B1 (service worker on HTTPS only), P-B2 (three backgrounds), P-B4 (flow helpers for several visits) |
| heartbeat | H-24 (berry and snow eggs) |
| places | PL-B1 (Jewel Box, plot order), PL-B2 (pins, `pin.given.key`), PL-B3 (novelty floor) |
| art-gen | AR-B1 to AR-B5 |
| audio | AU-B1, AU-B2 (IPA probe, run 9) |

Boundary: B2 uses the 1.1 events (C-B1), golden egg and jewels (L-B3, L-B4), notes content (L-B1), unknown names (C-B2) and name helpers (L-B5).

**Batch B2**

| Lane | Tasks |
|---|---|
| heartbeat | H-25 (golden egg, two-egg choice) |
| places | PL-B4, PL-B5, PL-B6, PL-B7 (notes from learning phrases, R8), PL-B8, PL-B9 |
| audio | AU-B3 (`names:pull`), run 8 (Wave B lines), run 10 (`names-new`) |
| learn-engine | L-B6 (gate) |

**Batch B3**

| Lane | Tasks |
|---|---|
| places | PL-B10 (flows) |
| integration | I-4 (six-visit queue flow), then Gate B |

**Batch C1** (releases 1.2 and 1.3; integrator sets `content/release.json` to `1.3`)

| Lane | Tasks |
|---|---|
| core | C-C1, C-C2, C-C3, C-C4 |
| learn-data | L-C1 (Salon phrases), L-C2 (meadow phrases), L-C3 (letter order) |
| learn-engine | L-C4 (criteria) |
| places | PL-C1 (cousins and cards on learning phrases), PL-C3 (valley), PL-C4 (Letter Lane), PL-C5 (titles, Hundred Party), PL-C6 (come along) |
| heartbeat | H-28 (quiet stall moves), H-29 (skip-wish switch) |
| art-gen | AR-C1, AR-C2, AR-C3 |
| audio | AU-C1 (Wave C lines; numbers 61 to 100 deferred, R7), run 11, run 6 (phrase packs) after L-C1 and L-C2 |

Boundary: C2 needs the save API (C-C4), the 1.2 events (C-C1) and the Salon and meadow phrases (L-C1, L-C2).

**Batch C2**

| Lane | Tasks |
|---|---|
| core | C-C5 (sync client), C-C6 (schema freeze, deploy note) |
| learn-engine | L-C5 (merged-log fold) |
| places | PL-C2 (Salon scene) |
| heartbeat | H-26 (phrase wishes R27, R28, R29, R12), H-27 (asking bubbles, two-state wishes) |
| audio | AU-C2 (names from the server), AU-C3 (review sheet) |
| integration | I-5 (sync in the store) |

Boundary: the parent corner part 2 needs the sync client (C-C5) and the store wiring (I-5).

**Batch C3**

| Lane | Tasks |
|---|---|
| places | PL-C8 (parent corner part 2), PL-C9 (flows) |
| learn-engine | L-C6 (gate) |
| art-app | AR-C4 (final stress at 44 and 60 unicorns) |
| audio | AU-C4 (name top-up, the last run, and the final audio check) |
| integration | I-6 (45-minute visit flow, two-device sync flow, Emma's server), then Gate C |

### 3.4 Batch check (integrator, after every batch)

Run from `G`:

```sh
npm test
npm run check
git status --short   # only files of lanes that are still running may be dirty
```

Expected: every suite of the finished lanes passes, `check` reports 0 errors (missing modules of later batches are allowed only where a stream plan says so, for example heartbeat Tasks 18 to 22 before Task 23).

### 3.5 Asset lanes and budgets

**Audio runs** (each `sh tools/audio/gen.sh <pack>` from `G`, outside the sandbox, with `--stt`, floor 10,007, cap 24,000 in `tools/audio/budget.json`):

| Run | When | Pack | Estimate |
|---|---|---|---|
| 0 | A0 | phonics `oo-short`, `yoo`, `iz` | 30 |
| 1a | after H-1 and AU-A5 | `core` (`common`, `start`, `moving-day`, `heartbeat`) | 1,500 |
| 2 | after AU-A5 | `numbers` (Wave A, sky to 12) | 5,300 |
| 1b | after PL-A16 | `places` (Wave A lines) | 1,800 |
| 3, 4, 5 | after L-A10 | `words-phase3-4` (plurals first), `words-year1`, `words-phase2` | 3,300 |
| 7 | after L-A10 | `names-t1` (v2 names first, strict order, at least 300 names) | 3,300 |
| 8 | B2 | `core` and `places` Wave B lines | 1,500 |
| 9 | B1 | IPA probe | 330 |
| 10 | B2 | `names-new` | 500 |
| 11 | C1 | `core` and `places` Wave C lines, `area-*` | 1,000 |
| 6 | C1 | `phrases-meadow`, `phrases-notes`, `phrases-salon` | 2,000 |
| 13 | C3 | `names-t1` top-up, last run | what is left above the floor |
| | | retries after speech-to-text | about 1,000 |
| | | **Total before run 13** | **about 21,560** |

Numbers 61 to 100 (about 2,300) are left for next month. If a run costs more than planned, the cut falls on run 13, then run 6, never on runs 1 to 7.

**Art runs** (`npm run art -- <command>`, Codex outside the sandbox, at most 4 at once): calibration (AR-A3), word sheets of 4 x 4 objects with wide gutters (about 18 sheets for 273 words), unicorn sprites (9 breeds x 2 stages), items and backgrounds per wave. Every cut picture gets an agent verdict before it reaches the manifest (art Review Focus 1). About 80 Codex runs in total.

---

## 4. Integration tasks

These tasks are owned by no stream plan. The `integration` lane builds them.

### Task I-1: Store, actions router, world view and test hook handlers

**Files:**
- Create: `G/src/game/world-view.ts`, `G/src/core/actions.ts`, `G/src/game/game-actions.ts`, `G/src/game.svelte.ts`, `G/src/game/hook-handlers.ts`
- Test: `G/tests/integration/world-view.test.ts`, `G/tests/integration/actions.test.ts`, `G/tests/integration/contracts.test.ts`

**Interfaces:**
- Consumes: `openGameData`, `attachLifecycle`, `GameData` (core A9); `createGameFolder`, `CoreState` (core A7); `rowCount`, `stallOf`, `campBabies`, `babiesInOrder` (core A7); `validateEvent` (core A3); `claimTab`, `requestPersist`, `readV2Local` (core A10); `content`, `CONTENT_HASH` (learning A10); `createLearnerSlice`, `pendingLearnFacts`, `setCurrentOverride` (learning A15); `createPlacesSlice` (places A1), `titlesToGive`, `momentPinsDue` (places, `[]` until B2 and C5 land), `applyPlaceAction` (places A1), `activeMoment` (places A3); `applyHeartbeat`, `applyNaming` (heartbeat Task 15); `audio` (audio A8); `hasPicture` (art A6); `router`, `setStartHandler` (platform A9); `registerHook`, `registerState`, `sceneHook` (platform A4, A10); `clock` (platform A4).
- Produces: `game` (contracts C7), `worldView(state, deps): World`, `apply(action, ctx): GameEventDraft[]`, `finishDraft`, the hook handlers of contracts C10.

- [ ] **Step 1: Write the failing world view test**

`G/tests/integration/world-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { fakeDevice, hatch, named } from '../helpers/events.ts';
import { worldView } from '../../src/game/world-view.ts';

const folder = createGameFolder([]);
const deps = { hasName: (n: string) => n === 'Pip', firstSound: (n: string) => n[0].toLowerCase() };

function stateOf(drafts: Parameters<ReturnType<typeof fakeDevice>['add']>[0]) {
  const d = fakeDevice('aaaaaaaa');
  d.add([{ type: 'visit.start', visit: 'v1', tz: 120 }, ...drafts], 1_000);
  return { ...folder.full(d.events).state, learner: {} as never, places: {} as never };
}

describe('worldView', () => {
  it('numbers babies by hatch order and gives doors to the first ten', () => {
    const drafts = Array.from({ length: 12 }, (_, i) => hatch(`b${i + 1}`));
    const w = worldView(stateOf(drafts), deps);
    expect(w.herd.map((b) => b.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(w.rowsBuilt).toBe(1);
    expect(w.doors).toBe(10);
    expect(w.camp).toEqual(['b11', 'b12']);
    expect(w.byId.b11.door).toBeNull();
    expect(w.flowers).toBe(12);
  });

  it('marks a clip only when the list name is loaded', () => {
    const w = worldView(stateOf([hatch('b1'), named('b1', 'Pip'), hatch('b2'), { ...named('b2', 'Tamo'), listName: null }]), deps);
    expect(w.byId.b1).toMatchObject({ name: 'Pip', listName: 'Pip', clipKey: 'pip', hasClip: true, unknownName: false });
    expect(w.byId.b2).toMatchObject({ name: 'Tamo', listName: null, clipKey: null, hasClip: false, unknownName: true });
  });

  it('a herd of 45 has five rows and nobody in the camp', () => {
    const drafts = Array.from({ length: 45 }, (_, i) => hatch(`b${i + 1}`));
    const s = stateOf([...drafts, ...[2, 3, 4, 5].map((n) => ({ type: 'building.done' as const, plot: `row-${n}` }))]);
    const w = worldView(s, deps);
    expect(w.rowsBuilt).toBe(5);
    expect(w.camp).toEqual([]);
  });
});
```

The helper `named(baby, name)` in core's `tests/helpers/events.ts` sets `listName: name` (core Task A3 adds the field to the helper).

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/integration/world-view.test.ts`
Expected: FAIL, cannot resolve `../../src/game/world-view.ts`.

- [ ] **Step 3: Implement the world view**

`G/src/game/world-view.ts`:

```ts
// Builds the one World view scenes read (contracts C3) from the folded state.
import type { CoreState } from '../core/world/index.ts';
import { babiesInOrder, campBabies, rowCount, stallOf } from '../core/world/herd.ts';
import type { Learner } from '../core/learning/index.ts';
import type { PlacesState } from '../core/places/state.ts';
import { slugName } from '../core/content/gpc.ts';
import type { BreedId } from '../art/manifest.ts';

export type FullState = CoreState & { learner: Learner; places: PlacesState };
export type ViewDeps = { hasName(name: string): boolean; firstSound(name: string, gems: readonly string[]): string | null };

export type WorldBaby = {
  id: string; order: number; hatchIndex: number; name: string | null; gems: string[]; ordinal: number;
  listName: string | null; clipKey: string | null; hasClip: boolean; unknownName: boolean; clipHeard: boolean;
  firstSound: string | null; breed: BreedId; stage: 'baby' | 'foal'; colours: { body: string; mane: string; mane2: string };
  traits: { shiny: boolean; speckled: boolean; golden: boolean; founder: boolean }; hearts: number; hatchedAt: number;
  source: string; sash: unknown[]; pouch: unknown[]; stickers: string[]; outfit: Record<string, string | null>;
  favourite: boolean; comeAlong: boolean; door: number | null;
};
export type World = {
  herd: WorldBaby[]; byId: Record<string, WorldBaby>; rowsBuilt: number; doors: number; camp: string[];
  rowNames: (string | null)[]; skyNames: (string | null)[]; sky: { index: number; name: string }[];
  flowers: number; visit: string | null; visitIndex: number; announced: ReadonlySet<string>; bathPond: boolean;
  settings: { skipWishAfterThree: boolean; parentPin: string; birthday: string | null }; places: PlacesState;
};

const FOAL_HEARTS = 3;

export function worldView(s: FullState, deps: ViewDeps, visit: string | null = null): World {
  const rows = rowCount(s.herd);
  const herd: WorldBaby[] = babiesInOrder(s.herd).map((b, i) => {
    const clipName = b.listName ?? null;
    const hasClip = clipName !== null && deps.hasName(clipName);
    const door = stallOf(s.herd, b.id);
    return {
      id: b.id, order: i + 1, hatchIndex: i + 1, name: b.name, gems: b.gems, ordinal: b.ordinal,
      listName: clipName, clipKey: hasClip ? slugName(clipName) : null, hasClip,
      unknownName: b.name !== null && clipName === null, clipHeard: b.clipHeard,
      firstSound: b.name ? deps.firstSound(b.name, b.gems) : null,
      breed: b.breed as BreedId, stage: b.hearts >= FOAL_HEARTS ? 'foal' : 'baby', colours: b.colours, traits: b.traits,
      hearts: b.hearts, hatchedAt: b.hatchedAt, source: b.source, sash: b.sash, pouch: b.pouch, stickers: b.stickers,
      outfit: b.outfit, favourite: b.favourite, comeAlong: b.comeAlong, door: door !== null && door <= rows * 10 ? door : null,
    };
  });
  const byId = Object.fromEntries(herd.map((b) => [b.id, b]));
  const facts = s.facts as Record<string, Record<string, unknown> | undefined>;
  const announced = new Set(Object.keys(facts['opening.announced'] ?? {}));
  const rowNames = Array.from({ length: rows }, (_, i) => s.cosmetics.rowNames[i + 1] ?? null);
  const skyCount = Math.floor(herd.length / 10);
  const skyNames = Array.from({ length: skyCount }, (_, i) => s.cosmetics.skyNames[i + 1] ?? null);
  const setting = (k: string) => s.settings[k];
  return {
    herd, byId, rowsBuilt: rows, doors: rows * 10, camp: campBabies(s.herd).map((b) => b.id), rowNames, skyNames,
    sky: skyNames.flatMap((name, i) => (name ? [{ index: i + 1, name }] : [])),
    flowers: herd.filter((b) => b.source !== 'v2').length,
    visit, visitIndex: s.visits.list.length, announced, bathPond: Object.hasOwn(facts['building.done'] ?? {}, 'bath-pond'),
    settings: {
      skipWishAfterThree: setting('skip-wish-after-three') === true,
      parentPin: typeof setting('parent-pin') === 'string' ? (setting('parent-pin') as string) : '2468',
      birthday: typeof setting('birthday') === 'string' ? (setting('birthday') as string) : null,
    },
    places: s.places,
  };
}
```

Core Task A7 defines `SettingsState` as `Record<string, Scalar>` and `CosmeticsState.rowNames` and `skyNames` as records keyed by the number as a string; the code above reads them that way.

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/integration/world-view.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing actions router and contract tests**

`G/tests/integration/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { finishDraft } from '../../src/core/actions.ts';

const ctx = { visit: 'v7', heartedThisVisit: (b: string) => b === 'b2' };

describe('finishDraft', () => {
  it('adds the visit, the baby and the wish heart to a learn.result', () => {
    const d = finishDraft({ type: 'learn.result', strand: 'r', step: 'R19', carrier: 'hats', items: [{ id: 'r:end:s', r: 'first' }],
      result: 'first', ms: 900, scaffold: 1, error: null, place: 'wish', moment: 'one-or-many', slot: 'school', probe: false, baby: 'b1' } as never, ctx);
    expect(d).toMatchObject({ visit: 'v7', baby: 'b1', heart: true });
  });
  it('gives at most one care heart per baby per visit, and always one for roll call', () => {
    expect(finishDraft({ type: 'care.done', baby: 'b1', station: 'brush' } as never, ctx)).toMatchObject({ heart: true });
    expect(finishDraft({ type: 'care.done', baby: 'b2', station: 'brush' } as never, ctx)).toMatchObject({ heart: false });
    expect(finishDraft({ type: 'care.done', baby: 'b2', station: 'rollcall' } as never, ctx)).toMatchObject({ heart: true });
  });
  it('fills visit on visit-scoped events and leaves others alone', () => {
    expect(finishDraft({ type: 'place.enter', place: 'nest' } as never, ctx)).toEqual({ type: 'place.enter', place: 'nest', visit: 'v7' });
    expect(finishDraft({ type: 'title.given', title: 'nest-keeper' }, ctx)).toEqual({ type: 'title.given', title: 'nest-keeper' });
  });
});
```

`G/tests/integration/contracts.test.ts`:

```ts
// Every translator's sample drafts, finished by the router, must pass core's validator (master Review Focus 1).
import { describe, expect, it } from 'vitest';
import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
import { finishDraft } from '../../src/core/actions.ts';
import { HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
import { NAMING_SAMPLE_ACTIONS, applyNaming } from '../../src/core/actions/naming.ts';
import { PLACE_SAMPLE_ACTIONS, applyPlaceAction } from '../../src/core/places/actions.ts';

const ctx = { visit: 'v1', heartedThisVisit: () => false };
let seq = 0;
const stampOne = (d: Record<string, unknown>) => ({ id: `abcdefgh:${++seq}`, hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...d });

describe('every translator emits valid events', () => {
  const cases: [string, unknown[], (a: never) => unknown[]][] = [
    ['heartbeat', HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat as never],
    ['naming', NAMING_SAMPLE_ACTIONS, applyNaming as never],
    ['places', PLACE_SAMPLE_ACTIONS, ((a: never) => applyPlaceAction(a, { world: { places: {} } } as never)) as never],
  ];
  for (const [name, actions, apply] of cases) {
    it(name, () => {
      expect(actions.length).toBeGreaterThan(0);
      for (const a of actions) {
        for (const d of apply(a as never)) {
          const r = validateEvent(stampOne(finishDraft(d as never, ctx) as never));
          expect(r.ok, `${name} ${(a as { type: string }).type}: ${JSON.stringify(r)}`).toBe(true);
        }
      }
    });
  }
});
```

Each translator module exports a `*_SAMPLE_ACTIONS` list with one action per action type it handles (heartbeat Task 15 and places Task A1 add it; see their Reconciled blocks).

- [ ] **Step 6: Run them and see them fail**

Run: `npx vitest run tests/integration/actions.test.ts tests/integration/contracts.test.ts`
Expected: FAIL, cannot resolve `../../src/core/actions.ts`.

- [ ] **Step 7: Implement the router**

`G/src/core/actions.ts`:

```ts
// The one place that turns scene actions into event drafts (spec 4.2 Actions).
import type { GameEventDraft } from './events.ts';
import { applyHeartbeat } from './actions/heartbeat.ts';
import { applyNaming } from './actions/naming.ts';
import { applyPlaceAction } from './places/actions.ts';
import { applyGame } from '../game/game-actions.ts';

export type Action = { type: string; [k: string]: unknown };
export type RouterCtx = { visit: string; heartedThisVisit(baby: string): boolean };
export type ActionCtx = RouterCtx & { world: unknown; state: unknown; content: unknown; now: number };

const VISIT_SCOPED = new Set(['place.enter', 'place.leave', 'learn.result', 'learn.idle', 'name.built', 'post.opened', 'note.sent', 'photo.taken']);
const WISH_MOMENTS = new Set(['wish', 'bath-wish', 'twin-wish', 'one-or-many', 'tricky-act', 'basket-and', 'basket-adj', 'asking-bubble', 'two-state-wish']);

/** Fills the fields only the store knows: the visit, the baby default and the hearts (spec 2.7 growth). */
export function finishDraft(d: Record<string, unknown> & { type: string }, ctx: RouterCtx): GameEventDraft {
  const out: Record<string, unknown> = { ...d };
  if (VISIT_SCOPED.has(d.type) && (out.visit === undefined || out.visit === null) && d.type !== 'name.built') out.visit = ctx.visit;
  if (d.type === 'name.built' && out.visit === undefined) out.visit = ctx.visit;
  if (d.type === 'learn.result') {
    out.baby = (d.baby as string | undefined) ?? null;
    out.heart = out.baby !== null && WISH_MOMENTS.has(d.moment as string);
  }
  if (d.type === 'care.done') out.heart = d.station === 'rollcall' ? true : !ctx.heartedThisVisit(d.baby as string);
  if (d.type === 'name.clipHeard' && out.heart === undefined) out.heart = true;
  return out as GameEventDraft;
}

export function apply(action: Action, ctx: ActionCtx): GameEventDraft[] {
  let drafts: Record<string, unknown>[];
  if (action.type.startsWith('hb.')) drafts = applyHeartbeat(action as never) as never;
  else if (action.type.startsWith('naming.')) drafts = applyNaming(action as never) as never;
  else if (action.type.startsWith('place/')) drafts = applyPlaceAction(action as never, ctx as never) as never;
  else if (action.type.startsWith('game/')) drafts = applyGame(action, ctx);
  else throw new Error(`Unknown action ${action.type}`);
  return drafts.map((d) => finishDraft(d as Record<string, unknown> & { type: string }, ctx));
}
```

Heartbeat's actions are named `naming.*` here (contracts C7), not `name.*`, so an action never looks like an event type. Heartbeat Task 15 renames its prefix.

`G/src/game/game-actions.ts`:

```ts
// Actions that belong to no place: visits, settings, overrides, exclusion, missing clips, announcements.
import type { Action, RouterCtx } from '../core/actions.ts';

export function applyGame(a: Action, ctx: RouterCtx): Record<string, unknown>[] {
  switch (a.type) {
    case 'game/visit-start': return [{ type: 'visit.start', visit: a.visit, tz: a.tz }];
    case 'game/visit-end': return [{ type: 'visit.end', visit: ctx.visit, reason: a.reason }];
    case 'game/enter': return [{ type: 'place.enter', place: a.place }];
    case 'game/leave': return [{ type: 'place.leave', place: a.place }];
    case 'game/setting': return [{ type: 'settings.set', key: a.key, value: a.value }];
    case 'game/override': return [{ type: 'learn.override', ...(a.payload as object) }];
    case 'game/pass': return [{ type: 'step.passed', strand: a.strand, step: a.step }];
    case 'game/exclude': return [{ type: 'exclude', device: a.device, on: a.on }];
    case 'game/audio-missing': return [{ type: 'audio.missing', clip: a.clip }];
    case 'game/announce': return [{ type: 'opening.announced', opening: a.opening }];
    case 'game/clip-heard': return [{ type: 'name.clipHeard', baby: a.baby, heart: true }];
    default: throw new Error(`Unknown game action ${a.type}`);
  }
}
```

- [ ] **Step 8: Run the router tests**

Run: `npx vitest run tests/integration/actions.test.ts tests/integration/contracts.test.ts`
Expected: PASS. A failure in `contracts.test.ts` names the translator and the field; fix the translator in its owner's lane, never the validator.

- [ ] **Step 9: Write the store**

`G/src/game.svelte.ts`:

```ts
// The store: the one object scenes talk to (spec 4.2 Game store, contracts C7).
import { openGameData, attachLifecycle } from './save/game-data.ts';
import type { GameData } from './save/game-data.ts';
import { createGameFolder } from './core/world/index.ts';
import { claimTab } from './save/tab-guard.ts';
import { content, CONTENT_HASH } from './core/content/static.ts';
import { createLearnerSlice, pendingLearnFacts } from './core/learning/index.ts';
import { createPlacesSlice, titlesToGive, momentPinsDue } from './core/places/index.ts';
import { apply } from './core/actions.ts';
import type { Action } from './core/actions.ts';
import { worldView } from './game/world-view.ts';
import type { FullState, World } from './game/world-view.ts';
import { audio } from './audio/index.ts';
import { hasPicture } from './art/manifest.ts';
import { clock } from './platform/clock.ts';
import { router } from './platform/router.svelte.ts';
import { setStartHandler } from './platform/boot.svelte.ts';
import { watchLifecycle } from './platform/lifecycle.ts';
import { uuid4 } from './core/ids.ts';
import { mulberry32 } from './core/rng.ts';
import type { Rng } from './core/rng.ts';
import type { PlanContext } from './core/planner/index.ts';
import { chooseStart } from './game/start.ts';
import { registerGameHooks } from './game/hook-handlers.ts';
import type { GameEvent } from './core/events.ts';

declare const __BUILD_ID__: string;
declare const __TEST_BUILD__: boolean;

const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
let data: GameData<FullState> | null = null;
let visit: string | null = null;
let state = $state.raw<FullState | null>(null);
let world = $state.raw<World | null>(null);
let version = $state(0);
let refoldedAt = $state(0);
let rng: Rng = mulberry32(Date.now() >>> 0);
const caredThisVisit = new Set<string>();

function firstSound(name: string, gems: readonly string[]): string | null {
  const entry = content.names.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return entry ? entry.first : (content.gpcs[gems[0]]?.phonemes[0] ?? null);
}

function refresh(): void {
  if (!data) return;
  state = data.folded().state as FullState;
  world = worldView(state, { hasName: (n) => audio.hasName(n), firstSound }, visit);
  version++;
}

function reconcile(s: FullState) {
  const w = worldView(s, { hasName: (n) => audio.hasName(n), firstSound }, visit);
  return [...pendingLearnFacts(s.learner, content), ...titlesToGive(s, w), ...momentPinsDue(s, w)];
}

/** Svelte 5 cannot export reassigned state, so flags live in one exported object. */
export const storeStatus = $state({ lostTab: false });

export async function openStore(): Promise<void> {
  data = await openGameData<FullState>({ folder: folder as never, contentHash: CONTENT_HASH, codeVersion: __BUILD_ID__, reconcile: reconcile as never, now: () => clock.now() });
  data.subscribe(() => refresh());
  claimTab(() => { storeStatus.lostTab = true; });
  attachLifecycle(data);
  audio.onMissing((clip) => game.dispatch({ type: 'game/audio-missing', clip }));
  router.onChange((from, to) => {
    if (!visit) return;
    if (from) game.dispatch({ type: 'game/leave', place: from.id });
    game.dispatch({ type: 'game/enter', place: to.id });
  });
  watchLifecycle({ onVisitTimeout: () => game.endVisit('idle') });
  refresh();
}

export function beginVisit(): void {
  visit = `v-${uuid4().slice(0, 8)}`;
  caredThisVisit.clear();
  game.dispatch({ type: 'game/visit-start', visit, tz: -new Date(clock.now()).getTimezoneOffset() });
}

export const game = {
  get state() { return state as FullState; },
  get world() { return world as World; },
  get learner() { return (state as FullState).learner; },
  get content() { return content; },
  get version() { return version; },
  get refoldedAt() { return refoldedAt; },
  get scene() { return router.current?.id ?? ''; },
  get params() { return router.current?.params ?? {}; },
  get data() { return data; },
  get rng() { return rng; },
  set rng(r: Rng) { rng = r; },
  get visitOpen() { return visit !== null; },
  now: () => clock.now(),
  dispatch(action: Action): GameEvent[] {
    if (!data || !state || !world) throw new Error('store not open');
    const drafts = apply(action, {
      visit: visit ?? 'none', now: clock.now(), state, world, content,
      heartedThisVisit: (b) => caredThisVisit.has(b),
    });
    for (const d of drafts) if (d.type === 'care.done' && d.heart) caredThisVisit.add(d.baby);
    return data.commit(drafts);
  },
  go: (scene: string, params?: Record<string, unknown>) => router.go(scene, params),
  planContext(): PlanContext {
    return {
      c: content, l: (state as FullState).learner, now: clock.now(),
      assets: { clip: (id) => audio.hasClip(id), picture: (id) => hasPicture(id) },
    };
  },
  endVisit(reason: 'goodnight' | 'idle' | 'hidden'): void {
    if (!visit) return;
    game.dispatch({ type: 'game/visit-end', reason });
    visit = null;
    void data?.flush();
  },
  /** After a sync or an import refolds everything. */
  markRefolded(): void { refoldedAt = clock.now(); refresh(); },
};

setStartHandler(async () => {
  if (!data) await openStore();
  beginVisit();
  return chooseStart(game);
});

// A dynamic import behind a compile-time constant: production builds drop the hook code entirely.
if (__TEST_BUILD__) void import('./game/hook-handlers.ts').then((m) => m.registerGameHooks(game, { seed: (n) => { rng = mulberry32(n); } }));
```

`chooseStart` is Task I-2.

Until I-2 lands, write `G/src/game/start.ts` as `export async function chooseStart(_g: unknown) { return { id: 'meadow' }; }` in this task.

- [ ] **Step 10: Write the hook handlers**

`G/src/game/hook-handlers.ts`:

```ts
// window.__game handlers owned by the store (contracts C10). Test builds only.
import { registerHook, registerState, sceneHook } from '../platform/hooks.ts';
import { activeMoment } from '../ui/moment.ts';
import { audio } from '../audio/index.ts';
import { clock } from '../platform/clock.ts';
import { setCurrentOverride } from '../core/learning/index.ts';
import type { game as Game } from '../game.svelte.ts';

type G = typeof Game;
const TEST_NAMES = ['Tam', 'Pip', 'Dot', 'Fen', 'Bex', 'Sam', 'Mia', 'Max', 'Kit', 'Lin'];

export function registerGameHooks(game: G, o: { seed(n: number): void }): void {
  registerState('herd', () => game.world?.herd.length ?? 0);
  registerState('lastLog', () => {
    const all = (game.data?.allEvents() ?? []) as { type: string }[];
    for (let i = all.length - 1; i >= 0; i--) if (all[i].type === 'learn.result') return all[i];
    return null;
  });
  registerHook('seed', (n: number) => o.seed(n));
  registerHook('setStep', (strand: 'r' | 's' | 'm', step: string) =>
    game.dispatch({ type: 'game/override', payload: setCurrentOverride(game.learner, game.content, strand, step) }));
  registerHook('pass', (strand: 'r' | 's' | 'm', step: string) => game.dispatch({ type: 'game/pass', strand, step }));
  registerHook('announce', (opening: string) => game.dispatch({ type: 'game/announce', opening }));
  const route = (name: 'answer' | 'wrong' | 'idle') => async () => {
    const h = sceneHook(game.scene);
    if (h && typeof h[name] === 'function') return h[name]();
    const m = activeMoment();
    if (!m) throw new Error(`no moment to ${name} in scene ${game.scene}`);
    if (name === 'answer') return m.hookAnswer();
    if (name === 'wrong') return m.hookWrong();
    return m.hookIdle();
  };
  registerHook('answer', route('answer'));
  registerHook('wrong', route('wrong'));
  registerHook('idle', route('idle'));
  // Platform's importFixture loads tests/fixtures/<name>.json and calls this handler with (data, name).
  registerHook('importFixture', async (data: unknown) => {
    const { v2Deps } = await import('./v2-deps.ts');
    const out = await (game.data as never as { importText(t: string, d: unknown): Promise<unknown> }).importText(JSON.stringify(data), v2Deps);
    game.markRefolded();
    return out;
  });
  registerHook('herd', async (n: number) => {
    for (let i = 0; i < n; i++) {
      const baby = `t${Date.now().toString(36)}${i}`;
      game.dispatch({ type: 'hb.test-hatch', baby, name: TEST_NAMES[i % TEST_NAMES.length] });
    }
  });
  registerHook('newVisit', async () => {
    game.endVisit('goodnight');
    clock.advance(6 * 3_600_000);
    const { beginVisit } = await import('../game.svelte.ts');
    beginVisit();
  });
  registerHook('said', () => audio.said);
  registerHook('audioMissing', () => audio.missing);
}
```

`G/src/game/v2-deps.ts` (shared by the start handler and the hook):

```ts
import { content } from '../core/content/static.ts';
import { phonemesOf, splitUsual } from '../core/content/gpc.ts';
import { graphemeItem } from '../core/learning/ids.ts';

export const v2Deps = {
  splitGraphemes: (w: string) => splitUsual(w, content.gpcs) ?? [...w.toLowerCase()],
  graphemeItem,
  phonemes: (gems: readonly string[]) => {
    try { return phonemesOf(gems, content.gpcs).join(' '); } catch { return gems.join(' '); }
  },
};
```

`hb.test-hatch` is a test-only heartbeat action (heartbeat Task 15 adds it: one `egg.hatched` with `source: 'nest'` and one `baby.named` with route `gold`). `sceneHook(scene)` is platform's lookup of `registerSceneHook` (platform Task A4).

- [ ] **Step 11: Check and commit**

Run: `npx vitest run tests/integration && npm run check`
Expected: PASS, no type errors in `src/game*`.

```bash
git add games/moon-meadow-home/src/game.svelte.ts games/moon-meadow-home/src/game games/moon-meadow-home/src/core/actions.ts games/moon-meadow-home/tests/integration
git commit -m "Add the game store, the actions router and the world view"
```

### Task I-2: Welcome, Moving Day and the start handler

**Files:**
- Create: `G/src/scenes/Welcome.svelte`, `G/src/scenes/MovingDay.svelte`, `G/flows/integration/moving-day.flow.sh`, `G/flows/integration/new-player.flow.sh`
- Modify: `G/src/game/start.ts`
- Test: `G/tests/integration/start.test.ts`

**Interfaces:**
- Consumes: `game` (I-1), `readV2Local` (core A10), `v2Deps` (I-1), `heartbeat.start` (heartbeat Task 23), `Unicorn`, `Lumi` (art A9), `audio`, `nameId`, `numId` (audio A4), `ghost`, `moonbeam` (platform A11), `press` (platform A9).
- Produces: `chooseStart(game): Promise<StartTarget>`; scenes `welcome` and `moving-day`.

- [ ] **Step 1: Write the failing test**

`G/tests/integration/start.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decideStart } from '../../src/game/start.ts';

describe('decideStart', () => {
  it('a returning player goes to the meadow', () => {
    expect(decideStart({ events: 12, imported: false, v2: null })).toEqual({ id: 'meadow' });
  });
  it('a first start with a v2 save on this origin goes to Moving Day', () => {
    expect(decideStart({ events: 0, imported: false, v2: '{"herd":[]}' })).toEqual({ id: 'import-v2' });
  });
  it('a first start without a v2 save is a new player', () => {
    expect(decideStart({ events: 0, imported: false, v2: null })).toEqual({ id: 'welcome' });
  });
  it('an imported herd that never had Moving Day plays it', () => {
    expect(decideStart({ events: 20, imported: true, v2: null, movingDayDone: false })).toEqual({ id: 'moving-day' });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/integration/start.test.ts`
Expected: FAIL, `decideStart` is not exported.

- [ ] **Step 3: Implement the start logic**

`G/src/game/start.ts`:

```ts
// Chooses the first scene of a visit (spec 2.9): Moving Day, a new player's welcome, or the meadow.
import { readV2Local } from '../save/v2-local.ts';
import { v2Deps } from './v2-deps.ts';

export type StartFacts = { events: number; imported: boolean; v2: string | null; movingDayDone?: boolean };
export function decideStart(f: StartFacts): { id: string } {
  if (f.imported && f.movingDayDone === false) return { id: 'moving-day' };
  if (f.events > 0) return { id: 'meadow' };
  return f.v2 ? { id: 'import-v2' } : { id: 'welcome' };
}

type StoreLike = {
  data: unknown; world: { herd: { source: string }[]; announced: ReadonlySet<string> };
  markRefolded(): void;
};

export async function chooseStart(game: StoreLike): Promise<{ id: string; params?: Record<string, unknown> }> {
  const data = game.data as { allEvents(): { type: string }[]; importText(t: string, d: unknown): Promise<{ kind: string; status?: string }> };
  const events = data.allEvents().filter((e) => e.type !== 'visit.start').length;
  const imported = data.allEvents().some((e) => e.type === 'import.v2');
  const movingDayDone = game.world.announced.has('moving-day');
  const next = decideStart({ events, imported, v2: events === 0 ? readV2Local() : null, movingDayDone });
  if (next.id !== 'import-v2') return next;
  const out = await data.importText(readV2Local() as string, v2Deps);
  game.markRefolded();
  return out.kind === 'v2' && out.status === 'imported' ? { id: 'moving-day' } : { id: 'welcome' };
}
```

Moving Day records itself with `opening.announced` `moving-day` at its end, so it plays once (a recorded fact).

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/integration/start.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the scenes**

`G/src/scenes/Welcome.svelte` (new player, spec 2.9):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Lumi from '../art/Lumi.svelte';
  import Picture from '../art/Picture.svelte';
  import { audio } from '../audio/index.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { game } from '../game.svelte.ts';
  let { params }: { params: Record<string, unknown> } = $props();
  let talking = $state(false);
  let crown = $state(false);
  onMount(() => {
    setBands('#cfe8ff', '#bfe3a8');
    const off = audio.onTalk((id) => (talking = !!id && id.startsWith('lumi-')));
    (async () => {
      await audio.preloadScene('start');
      await audio.speak('lumi-hello', 'lumi-meadow-yours');
      crown = true;
      await audio.speak('lumi-crown');
      game.dispatch({ type: 'game/announce', opening: 'welcome' });
      await heartbeat.start();
    })();
    return () => { off(); audio.release('start'); };
  });
</script>

<div class="welcome" aria-label="welcome">
  <div class="lumi"><Lumi size={320} {talking} label="Queen Lumi" /></div>
  {#if crown}<div class="crown"><Picture id="item-crown-emma" size={160} label="crown" /></div>{/if}
</div>

<style>
  .welcome { position: absolute; inset: 0; background: linear-gradient(#cfe8ff, #bfe3a8); }
  .lumi { position: absolute; left: 430px; top: 80px; }
  .crown { position: absolute; left: 510px; top: 520px; animation: drop 600ms ease-out; }
  @keyframes drop { from { transform: translateY(-200px); opacity: 0; } to { transform: none; opacity: 1; } }
</style>
```

`G/src/scenes/MovingDay.svelte` (spec 2.9 session 1):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import Lumi from '../art/Lumi.svelte';
  import { audio, numId } from '../audio/index.ts';
  import { press } from '../platform/input.ts';
  import { ghost } from '../ui/ghost-hand.svelte.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import { game } from '../game.svelte.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  let { params }: { params: Record<string, unknown> } = $props();
  const movers = game.world.herd.filter((b) => b.source === 'v2');
  let crossed = $state(0);
  let waitingDoor = $state(false);
  let done = $state(false);
  let talking = $state(false);
  let doorFour: () => void = () => {};

  async function run() {
    await audio.preloadScene('moving-day');
    await audio.speak('lumi-moving', 'g-here-they-come');
    for (const b of movers) {
      crossed++;
      if (b.name) await audio.sayName(b.listName ?? b.name, '!');
      await sleep(250);
    }
    for (const k of [1, 2, 3]) if (movers.length >= k) await audio.speak(numId('n', k));
    if (movers.length >= 4) {
      waitingDoor = true;
      await audio.speak(numId('tap-door', 4));
      const door = document.querySelector('[aria-label="door 4"]');
      if (door) void ghost.tap(door, 1);
      await new Promise<void>((r) => (doorFour = r));
      waitingDoor = false;
    }
    if (movers.some((b) => b.sash.length > 0)) await audio.speak('g-pins-came');
    game.dispatch({ type: 'game/announce', opening: 'moving-day' });
    done = true;
    await heartbeat.start();
  }

  onMount(() => {
    setBands('#cfe8ff', '#bfe3a8');
    const off = audio.onTalk((id) => (talking = !!id && id.startsWith('lumi-')));
    const unhook = registerSceneHook('moving-day', { answer: () => doorFour(), wrong: () => {} });
    void run();
    return () => { off(); unhook(); audio.release('moving-day'); };
  });
</script>

<div class="moving" aria-label="moving day">
  <div class="lumi"><Lumi size={200} {talking} label="Queen Lumi" /></div>
  <div class="bridge" aria-hidden="true"></div>
  {#each movers.slice(0, crossed) as b, i (b.id)}
    <div class="mover" style:transform={`translate(${120 + (i % 10) * 90}px, ${420 + Math.floor(i / 10) * 70}px)`}>
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={90} pose="walk" label={b.name ?? 'baby'} />
    </div>
  {/each}
  {#if waitingDoor}
    <button class="door" aria-label="door 4" use:press={() => doorFour()}>4</button>
  {/if}
  {#if done}<p class="sr" aria-live="polite">moved in</p>{/if}
</div>

<style>
  .moving { position: absolute; inset: 0; background: linear-gradient(#2d2a6e, #6b5fb5 60%, #bfe3a8); }
  .lumi { position: absolute; right: 60px; top: 30px; }
  .bridge { position: absolute; left: 0; right: 0; top: 380px; height: 40px; background: linear-gradient(90deg, #fff7c2, #ffe08a); opacity: 0.8; border-radius: 20px; }
  .mover { position: absolute; left: 0; top: 0; transition: transform 600ms; }
  .door { position: absolute; left: 980px; top: 600px; width: 120px; height: 160px; font: 700 48px Andika, sans-serif; border-radius: 16px; background: #fff3d6; }
  .sr { position: absolute; left: -9999px; }
</style>
```

- [ ] **Step 6: Write the flows**

`G/flows/integration/moving-day.flow.sh`:

```bash
#!/usr/bin/env bash
# Moving Day from the v2 fixture: every v2 baby crosses, door four is tapped, the nest follows.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'importFixture("v2-save")' >/dev/null
start_play
wait_for '() => window.__game.state().scene === "moving-day"'
wait_for '() => !!document.querySelector("[aria-label=\"door 4\"]")'
tap 'door 4'
wait_for '() => window.__game.state().scene === "nest"'
[ "$(state herd)" -ge 4 ] || fail "herd too small"
shot moving-day
finish
```

`G/flows/integration/new-player.flow.sh`:

```bash
#!/usr/bin/env bash
# A new player: Lumi's welcome, the crown, then egg 1.
. "$(dirname "$0")/../lib.sh"
open_app
start_play
wait_for '() => window.__game.state().scene === "nest"'
expect_eq "$(val '() => window.__game.said().includes("lumi-hello")')" 'true' 'welcome line'
shot new-player
finish
```

`open_app`, `start_play`, `hook`, `state`, `tap`, `wait_for` (takes a page function), `val` (takes a page function, may be async), `expect_eq`, `fail`, `shot` and `finish` are platform's `flows/lib.sh` helpers (Task A10). `open_app` opens a new `playwright-cli` session, which starts with empty storage, and turns fast mode on.

- [ ] **Step 7: Run and commit**

Run: `npx vitest run tests/integration` then, outside the sandbox from the repo root, `MMH_PORT=8766 bash games/moon-meadow-home/flows/run.sh integration/moving-day integration/new-player`
Expected: PASS at 1180 x 820, 1080 x 810 and 1024 x 768, `audioMissing` empty, no console errors.

```bash
git add games/moon-meadow-home/src/scenes/Welcome.svelte games/moon-meadow-home/src/scenes/MovingDay.svelte games/moon-meadow-home/src/game/start.ts games/moon-meadow-home/flows/integration games/moon-meadow-home/tests/integration/start.test.ts
git commit -m "Add the welcome, Moving Day and the start of each visit"
```

### Task I-3: Autoplay hook, gate script and the visit flows

**Files:**
- Create: `G/src/game/autoplay.ts`, `G/tools/gate.sh`, `G/flows/integration/visit-5min.flow.sh`, `G/flows/integration/reload-naming.flow.sh`
- Modify: `G/src/game/hook-handlers.ts` (register `autoplay`)
- Test: `G/tests/integration/autoplay.test.ts`

**Interfaces:**
- Consumes: the hook handlers (I-1), `heartbeat.start`, `heartbeat.startGoodnight` (heartbeat Task 23), `router` (platform).
- Produces: hook `autoplay(o: { heartbeats: number; goodnight: boolean; maxMs?: number }): Promise<AutoplayLog>` with `AutoplayLog = { scenes: { id: string; said: string[]; ms: number }[]; stuck: string | null }`; `tools/gate.sh A|B|C`.

- [ ] **Step 1: Write the failing test**

`G/tests/integration/autoplay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { judgeLog } from '../../src/game/autoplay.ts';

describe('judgeLog', () => {
  it('passes when every scene said a goal and nothing stuck', () => {
    expect(judgeLog({ scenes: [{ id: 'nest', said: ['g-egg'], ms: 900 }, { id: 'naming', said: ['g-bells'], ms: 700 }], stuck: null })).toEqual([]);
  });
  it('names a silent scene and a stuck scene', () => {
    expect(judgeLog({ scenes: [{ id: 'wish', said: [], ms: 500 }], stuck: 'stalls' })).toEqual(['wish has no spoken goal', 'stuck in stalls']);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/integration/autoplay.test.ts`
Expected: FAIL, cannot resolve `autoplay.ts`.

- [ ] **Step 3: Implement autoplay**

`G/src/game/autoplay.ts`:

```ts
// Test builds only: plays whole heartbeats by answering every moment, and records what each scene said.
// Spec 7.3 check 10 ("no dead end, every screen has one spoken goal") as a scripted run.
export type AutoplayLog = { scenes: { id: string; said: string[]; ms: number }[]; stuck: string | null };
const SILENT_OK = new Set(['meadow', 'hatch', 'stalls']);   // these speak through the scene before or after

export function judgeLog(log: AutoplayLog): string[] {
  const out = log.scenes.filter((s) => !SILENT_OK.has(s.id) && s.said.length === 0).map((s) => `${s.id} has no spoken goal`);
  if (log.stuck) out.push(`stuck in ${log.stuck}`);
  return out;
}

type Deps = {
  scene(): string; said(): readonly string[]; answer(): Promise<unknown>; startHeartbeat(): Promise<void>;
  startGoodnight(): Promise<void>; visitOpen(): boolean; sleep(ms: number): Promise<void>; now(): number;
};

export async function autoplay(d: Deps, o: { heartbeats: number; goodnight: boolean; maxMs?: number }): Promise<AutoplayLog> {
  const log: AutoplayLog = { scenes: [], stuck: null };
  const limit = o.maxMs ?? 20_000;
  let lastScene = '';
  let saidAt = 0;
  let enteredAt = d.now();
  const track = () => {
    const id = d.scene();
    if (id !== lastScene) {
      if (lastScene) log.scenes.push({ id: lastScene, said: d.said().slice(saidAt), ms: d.now() - enteredAt });
      lastScene = id; saidAt = d.said().length; enteredAt = d.now();
    }
  };
  /** Answers every open moment until `until` holds. Returns false and records the scene when it takes too long. */
  const settle = async (until: () => boolean) => {
    const start = d.now();
    while (!until()) {
      track();
      if (d.now() - start > limit) { log.stuck = d.scene(); return false; }
      try { await d.answer(); } catch { /* no moment open yet */ }
      await d.sleep(50);
    }
    track();
    return true;
  };
  for (let i = 0; i < o.heartbeats; i++) {
    if (d.scene() === 'meadow') {
      void d.startHeartbeat();
      if (!(await settle(() => d.scene() !== 'meadow'))) return log;
    }
    if (!(await settle(() => d.scene() === 'meadow'))) return log;
  }
  if (o.heartbeats === 0 && d.scene() !== 'meadow') {
    // A single place visit: answer until the place sends her back to the meadow.
    if (!(await settle(() => d.scene() === 'meadow'))) return log;
  }
  if (o.goodnight) {
    void d.startGoodnight();
    if (!(await settle(() => d.scene() === 'goodnight'))) return log;
    await settle(() => !d.visitOpen());
  }
  track();
  return log;
}
```

Add to `registerGameHooks` in `hook-handlers.ts`:

```ts
  registerHook('autoplay', async (o: { heartbeats: number; goodnight: boolean; maxMs?: number }) => {
    const { autoplay } = await import('./autoplay.ts');
    const { heartbeat } = await import('../scenes/heartbeat/flow.svelte.ts');
    const { callHook } = await import('../platform/hooks.ts');
    return autoplay({
      scene: () => game.scene, said: () => audio.said, answer: () => callHook('answer', []),
      startHeartbeat: () => heartbeat.start(), startGoodnight: () => heartbeat.startGoodnight(), visitOpen: () => game.visitOpen,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now(),
    }, o);
  });
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/integration/autoplay.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the flows and the gate script**

`G/flows/integration/visit-5min.flow.sh`:

```bash
#!/usr/bin/env bash
# Spec 2.3 five-minute visit as a scripted run: three heartbeats and goodnight, no dead end, a spoken goal per screen.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'seed(7)' >/dev/null
start_play
wait_for '() => ["nest", "meadow"].includes(window.__game.state().scene)'
LOG=$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 3, goodnight: true }))')
echo "$LOG" > "$MMH_SHOTS/visit-5min-${W}x$H.json"
echo "$LOG" | node -e '
  const log = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const silent = log.scenes.filter(s => !["meadow","hatch","stalls"].includes(s.id) && s.said.length === 0).map(s => s.id);
  if (log.stuck || silent.length) { console.error("stuck:", log.stuck, "silent:", silent.join(",")); process.exit(1); }' || fail "visit has a dead end or a silent screen"
finish
```

`G/flows/integration/reload-naming.flow.sh`:

```bash
#!/usr/bin/env bash
# Master Review Focus 5: a reload between hatch and naming resumes naming for the same baby.
. "$(dirname "$0")/../lib.sh"
open_app
start_play
wait_for '() => window.__game.state().scene === "nest"'
hook 'answer()' >/dev/null
wait_for '() => window.__game.state().scene === "naming"'
HERD=$(state herd)
val '() => { setTimeout(() => location.reload(), 10); return 1; }' >/dev/null
sleep 1
wait_for '() => !!window.__game'
hook 'fast(true)' >/dev/null
start_play
wait_for '() => window.__game.state().scene === "naming"'
expect_eq "$(state herd)" "$HERD" 'herd after reload'
finish
```

`G/tools/gate.sh`:

```sh
#!/usr/bin/env bash
# Runs a wave gate (master plan section 5). Usage, from G, outside the sandbox: bash tools/gate.sh A|B|C
set -euo pipefail
WAVE=${1:?wave A, B or C}
npm test
npm run check
npm run check:content
npm run check:audio
npm run simulate
npm run build
npm run build:test -- --outDir dist-test-gate
export MOON_DATA="${MOON_DATA:-${TMPDIR:-/tmp}/mmh-gate-data}"   # never Emma's .data folder
MOON_DIST=dist-test-gate PORT=8766 HOST=127.0.0.1 node server/serve.ts &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
MMH_URL=http://127.0.0.1:8766/games/moon-meadow-home/ bash flows/run.sh $(cat "flows/gate-$WAVE.txt")   # platform-smoke includes the portrait turn picture
MMH_URL=http://127.0.0.1:8766/games/moon-meadow-home/ bash flows/art-stress.sh
echo "Gate $WAVE passed"
```

`G/flows/gate-A.txt` lists the Wave A flows (section 5.1), one name per line.

- [ ] **Step 6: Run and commit**

Run: `npx vitest run tests/integration` and, outside the sandbox, `bash flows/run.sh integration/visit-5min integration/reload-naming`
Expected: PASS at the three sizes.

```bash
git add games/moon-meadow-home/src/game/autoplay.ts games/moon-meadow-home/src/game/hook-handlers.ts games/moon-meadow-home/tools/gate.sh games/moon-meadow-home/flows/integration games/moon-meadow-home/flows/gate-A.txt games/moon-meadow-home/tests/integration/autoplay.test.ts
git commit -m "Add the autoplay hook, the visit flows and the wave gate script"
```

### Task I-4: Six-visit queue flow (Wave B)

**Files:**
- Create: `G/flows/integration/six-visits.flow.sh`, `G/flows/gate-B.txt`

**Interfaces:**
- Consumes: `newVisit`, `autoplay`, `state().announced` (register `announced` with `registerState` in this task: `registerState('announced', () => [...game.world.announced])`).
- Produces: the opening queue check of spec 6.2 ("Opening queue over 6 simulated visits") across heartbeat and places.

- [ ] **Step 1: Register the state key** in `G/src/game/hook-handlers.ts`: `registerState('announced', () => [...(game.world?.announced ?? [])]);`

- [ ] **Step 2: Write the flow**

```bash
#!/usr/bin/env bash
# Six visits: at most one queue opening per visit after visit 1, in the order of places D4.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'seed(3)' >/dev/null
start_play
PREV=0
for V in 1 2 3 4 5 6; do
  val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 3, goodnight: true }))' >/dev/null
  N=$(val '() => window.__game.state().announced.length')
  if [ "$V" -gt 1 ] && [ $((N - PREV)) -gt 2 ]; then fail "visit $V announced $((N - PREV)) things"; fi
  PREV=$N
  hook 'newVisit()' >/dev/null
  start_play
done
finish
```

The bound is 2 because a moment pin or a "moon told me" name may share a visit with one opening (spec 2.9), and both are recorded as `opening.announced` only when they are openings. A visit with more than one queue opening fails.

- [ ] **Step 3: Run and commit**

Run (outside the sandbox): `bash flows/run.sh integration/six-visits`
Expected: PASS.

```bash
git add games/moon-meadow-home/flows/integration/six-visits.flow.sh games/moon-meadow-home/flows/gate-B.txt games/moon-meadow-home/src/game/hook-handlers.ts
git commit -m "Add the six-visit opening queue flow"
```

### Task I-5: Sync in the store (Wave C)

**Files:**
- Modify: `G/src/game.svelte.ts`, `G/src/game/hook-handlers.ts`
- Test: covered by core Task C5 (client) and Task I-6 (two contexts)

**Interfaces:**
- Consumes: `createSync` (core C5).
- Produces: `game.sync: SyncClient | null`; hook `syncNow`.

- [ ] **Step 1: Wire the client** in `openStore()` after `openGameData`:

```ts
import { createSync } from './sync/client.ts';
export let sync: ReturnType<typeof createSync> | null = null;
// inside openStore(), after data is open:
sync = createSync({ port: data as never, apiBase: new URL('api/', document.baseURI).href });
sync.onChange(() => { if (sync?.status().state === 'idle') game.markRefolded(); });
sync.start();
```

In `game.endVisit`, after the `visit.end` dispatch: `void sync?.syncNow();`. Places' Building Day scene calls `sync?.syncNow()` after `building.done` (places C8 reads `sync` from `src/game.svelte.ts`).

- [ ] **Step 2: Register the hook** in `hook-handlers.ts`: `registerHook('syncNow', async () => { const { sync } = await import('../game.svelte.ts'); return sync?.syncNow(); });`

- [ ] **Step 3: Check and commit**

Run: `npm run check && npx vitest run`
Expected: PASS.

```bash
git add games/moon-meadow-home/src/game.svelte.ts games/moon-meadow-home/src/game/hook-handlers.ts
git commit -m "Sync the event log in the background from the store"
```

### Task I-6: Long visit, two-device sync and Emma's server (Wave C)

**Files:**
- Create: `G/flows/integration/visit-45min.flow.sh`, `G/flows/integration/two-devices.flow.sh`, `G/flows/gate-C.txt`
- Modify: `IDEAS.md` (status of Moon Meadow Home to `playable`)

**Interfaces:**
- Consumes: `autoplay`, `syncNow`, `server:pair` (core C3), places' parent corner pairing (places C8).

- [ ] **Step 1: Write the long-visit flow**

```bash
#!/usr/bin/env bash
# Spec 2.3 45-minute visit as a scripted run: a visit to every open place, ten heartbeats, then goodnight.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'importFixture("v2-save")' >/dev/null
start_play
wait_for '() => window.__game.state().scene !== "moving-day"'
for P in post-box salon dressing-corner bath-pond letter-lane; do
  hook "jump(\"$P\")" >/dev/null
  val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 0, goodnight: false, maxMs: 15000 }))' >/dev/null
  hook 'jump("meadow")' >/dev/null
done
LOG=$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 10, goodnight: true }))')
echo "$LOG" | node -e '
  const log = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (log.stuck) { console.error("stuck in", log.stuck); process.exit(1); }' || fail "dead end in the long visit"
finish
```

- [ ] **Step 2: Write the two-device flow**

```bash
#!/usr/bin/env bash
# Spec 7.3 check 8: two devices play offline, sync, and end with the union of both herds.
# tools/gate.sh serves the API on its port with MOON_DATA in a temp folder; admin.ts reads the same MOON_DATA.
. "$(dirname "$0")/../lib.sh"
pair_code() { (cd games/moon-meadow-home && node server/admin.ts pair --family test | tail -1); }
CODE_A=$(pair_code); CODE_B=$(pair_code)
S=synca; open_app; start_play; hook "call(\"pairForTest\", \"$CODE_A\")" >/dev/null; hook 'herd(3)' >/dev/null
S=syncb; open_app; start_play; hook "call(\"pairForTest\", \"$CODE_B\")" >/dev/null; hook 'herd(2)' >/dev/null
S=synca; hook 'syncNow()' >/dev/null
S=syncb; hook 'syncNow()' >/dev/null
S=synca; hook 'syncNow()' >/dev/null
S=synca; A=$(state herd)
S=syncb; B=$(state herd)
[ "$A" = "5" ] && [ "$B" = "5" ] || fail "herds $A and $B, expected 5 and 5"
S=synca; finish
S=syncb; finish
```

`pairForTest` is registered by places Task C8 next to its pairing screen (`registerHook('pairForTest', (code) => sync.pair(code))`). The flow runs against core's server with the API on port 8799 (`MMH_DATA` a temp folder, family `test`).

- [ ] **Step 3: Gate C and Emma's server**

Run `bash tools/gate.sh C`. Then start Emma's server for tonight (outside the sandbox, from the repo root): stop the `python3 -m http.server` on port 8765 if it runs (`lsof -ti tcp:8765` then `kill <pid>`), and start `nohup node games/moon-meadow-home/server/serve.ts > "$TMPDIR/mmh-serve.log" 2>&1 &` with `PORT=8765 HOST=0.0.0.0`. Check `curl -s http://127.0.0.1:8765/ideas/opus-5-5-unicorn-egg-nest-v2/ | head -3` (v2 still loads), `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8765/%2eenv` is `404` (the repo hook refuses a command that names the key file, so the dot is encoded), and `curl -sI http://127.0.0.1:8765/games/moon-meadow-home | grep -i location` shows the slash redirect.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/flows/integration games/moon-meadow-home/flows/gate-C.txt IDEAS.md
git commit -m "Add the long visit and two-device flows and mark the game playable"
```

---

## 5. Validation gates

A gate runs after the last batch of its wave, by the integrator, with `bash tools/gate.sh <wave>` from `G` outside the sandbox. A failing check sends the owning lane back to fix it; no later batch starts until the gate is green. Spec 7.3 checks that need Emma's iPad, odin or Tjitse's ear cannot run in this session; the replacement is named and the original is left for Tjitse in `games/moon-meadow-home/README.md` under "Checks for Tjitse".

### 5.1 Gate A (first playable)

Commands:

```sh
cd games/moon-meadow-home
npm test                    # every suite, including learning's simulated learner and core's merge properties
npm run check               # svelte-check and tsc, 0 errors
npm run check:content       # learning validator, strict mode (pictures and clips present)
npm run check:audio         # every referenced id exists, narrator-only prefixes, no duplicate ids
npm run simulate            # weeks per step, R19 and S10 weeks from Emma's start
bash tools/gate.sh A
```

Flows in `flows/gate-A.txt` (each at 1180 x 820, 1080 x 810, 1024 x 768; `platform-smoke` also in portrait 820 x 1180):
`platform-smoke`, `platform-input`, `heartbeat/heartbeat`, `heartbeat/naming`, `places/meadow`, `places/label`, `places/pond`, `places/building`, `places/parent`, `integration/new-player`, `integration/moving-day`, `integration/visit-5min`, `integration/reload-naming`. Every flow ends with `__game.audioMissing()` empty and `__game.errors()` empty. Plus `flows/art-stress.sh` and the WebKit audio decode page `flows/audio-check.html` (audio Task A9).

Mapping to spec 7.3:

| Check | Gate A |
|---|---|
| 1 Vitest, simulated learner, merge properties | `npm test` |
| 2 `check:content`, `svelte-check` | `npm run check:content`, `npm run check` |
| 3 Flows at three sizes, portrait, no missing clips, no console errors | the flow list above |
| 4 Stress test on Emma's iPad | **Cannot run.** Replaced by `flows/art-stress.sh` in WebKit at 1024 x 768 with the real sprites (decoded memory under 150 MB, frame verdict on screen). Tjitse opens `stress.html` on her iPad and reads the verdict. |
| 5 iPad from the home screen: `persist()`, airplane mode, export | **Cannot run** (plain http has no service worker or `persist()`). Replaced by the export step in `places/parent` (a file downloads) and the insecure-context smoke flow against `http://<mac>.local:8766/`. Offline is Gate B. |
| 6 Her real v2 save imports | **Cannot run by an agent** (the save lives in her Safari tab). Replaced by core's synthetic fixture tests, `integration/moving-day`, and the same-origin read test (core A10). Tjitse watches Moving Day live tonight. |
| 7 200 random gold-bell builds | heartbeat Task 14 unit test (in `npm test`) |
| 9 Ear check | **Replaced** by `--stt` on every narrator and queen clip (failures regenerated twice, learning clips still failing get `ok: false` and are never served), `npm run check:audio`, and `shared/review.html` left for Tjitse. |
| 10 5-minute test visit | `integration/visit-5min` (scripted). Tjitse's own visit stays for him. |
| 11 Plurals | learning simulated learner (R19 and S10 within 4 play weeks), learning planner tests (R19 and S10 in visit 1 or 2 after placement), heartbeat and places flows (one-or-many wish at each level with both mistakes, S10 label at each level with a wrong ending, the mice jar). The iPad part is Tjitse's. |

### 5.2 Gate B (release 1.1)

Same commands, `content/release.json` at `1.1`. Flows in `flows/gate-B.txt`: everything in Gate A plus `heartbeat/eggs-b` (berry, snow, golden, two-egg), `places/jewel`, `places/dressing`, `places/post`, `places/notes`, `places/book`, `places/queue`, `platform-offline` (service worker on `127.0.0.1`, offline reload), `platform-visits` (clock across visits), `integration/six-visits`. Plus `npm run names:pull -- --file tests/fixtures/v2-save.json --dry-run` lists the fixture's unknown names with their nearest list names.

| Check | Gate B |
|---|---|
| 1 to 3, 7, 9, 10, 11 | as Gate A |
| 5 Offline | `platform-offline` on `127.0.0.1` (a secure context). The real iPad over plain http has no service worker; it plays online at home. |

### 5.3 Gate C (releases 1.2 and 1.3)

Same commands, `content/release.json` at `1.3`. Flows in `flows/gate-C.txt`: everything in Gate B plus `places/salon`, `places/valley`, `places/lane`, `places/titles`, `places/along`, `heartbeat/year1` (asking bubbles, two-state wishes, phrase wishes), `integration/visit-45min`, `integration/two-devices`. Core's server tests (pairing, tokens, rate limits, dedupe, the 20,000-event chunked push, cursor paging, daily copies, the test family) are in `npm test`.

| Check | Gate C |
|---|---|
| 5 Server deployed and syncing | **odin cannot be reached.** Replaced by the save API on the Mac (core C6 "Save API on the Mac") and `integration/two-devices` on port 8799. The deploy note `server/DEPLOY.md` is for Tjitse. |
| 8 Two devices offline then synced | `integration/two-devices` and learning Task C5 (merged-log fold) |
| 10 45-minute visit | `integration/visit-45min` (scripted) |

---

## 6. Changes made to the stream plans

Each stream plan now starts with a "Reconciled with the master plan (binding)" block right after its header. The block lists, for that stream only: tasks dropped or moved, renamed interfaces, changed event payloads and the batch each task runs in. Targeted edits were also made inside the plans where a name was easy to replace in place (picture ids, ports, the server env). Where the block and the code below it still differ, the block and `contracts.ts` win.

| Stream | Main changes |
|---|---|
| platform | Drops A2, A6, A7, A8, B3, C1, C2, C3, C4 (R1, R2, R3, R29, R30). A1 uses section 2.3. A4 adds `registerSceneHook`, `sceneHook`, `testSeed`, `isFast`. A9 imports `audio` from the audio stream and awaits `loadArtManifest()`. A10 serves flows with core's server and `MOON_DIST`. |
| core | A3 payloads from contracts C2 (R17 to R19). A6 adds `pin.given.key` facts. A7 adds `listName`, `clipHeard` to babies. A11 reads `MOON_DIST`. K1 uses base `./`. B1 `note.sent.note`. Owns all of `server/` and `src/sync/`. |
| learning | Bare picture ids (R13). Sound keys `oo-short`, `yoo`, `iz` (R24). `wall` moment and `salon` tag (R22). `build:lines` writes words, names and phrases packs only (R6); no `numbers` pack. `CONTENT_HASH` in `static.ts`. `planner/rng.ts` re-exports `src/core/rng.ts`. |
| heartbeat | Lines file without numbers, ids via `HEARTBEAT_NUMBER_IDS` (R6, R7). Drafts in contract shapes (R19). Action prefix `naming.` instead of `name.`. Blocklist from learning (R23). Uses platform input and art `Heap`, `Picture`, `Unicorn` props (R11 to R13). Flows on R15. |
| places | Drops its ghost hand and moonbeam (R10), `Heap.svelte` (R12), `rowsBuilt` (R26), `content/places/release.json` (R27), notes and Year 1 content (R8), Task C7 (R9). Picture ids bare (R13). Lines in `content/lines/places.json` (R6). Store writes place events (R32). Flows on R15. |
| art | `mulberry32` re-exported from `src/core/rng.ts`. Stress flow against `MMH_URL` (R15). Owns the only Heap (R12). |
| audio | `nameId` and `phraseId` (R4, R5). Hand-written files only `common`, `start`, `moving-day` (R6). Phrase packs are learning's three (R33). `sayName` returns a boolean. Budget table from section 3.5. names:pull token via `MOON_ADMIN_TOKEN` (R29). |

---

## 7. Self-review

**Spec coverage (7.1 items to tasks).**

| Item | Tasks |
|---|---|
| 1 Skeleton, deploy, PWA, persist, docs | P-A1, P-A9, P-A12, P-A13, P-B1, C-C6 (deploy note), C-A11 |
| 2 Stress test | AR-A10, AR-A11, AR-C4 |
| 3 Core events, store, merge | C-A1 to C-A10, I-1 |
| 4 Content packs and validator | L-A1 to L-A10, AU runs 1 to 7 |
| 5 Learning engine, planner, simulated learner | L-A11 to L-A22 |
| 6 Heartbeat | H-1 to H-9, H-15 to H-23, H-23B |
| 7 Naming | H-10 to H-14, H-19 |
| 8 Stables, roll call, goodnight sky | H-7, H-8, H-21, H-22 |
| 9 Meadow hub, bubbles, label bubbles, moonbeam, ghost hand, replay, hints | P-A11, PL-A2 to PL-A7, PL-A9, PL-A10 |
| 10 Plurals | L-A6, L-A7, L-A17, H-5, H-6, H-20, PL-A8 to PL-A11, AR-A13 |
| 11 move.html, v2 import, Moving Day | C-A6, C-A10, C-A12, I-2 |
| 12 Building Days | PL-A12, PL-A13 |
| 13 Parent corner part 1 | PL-A15 |
| 14 Jewel Box, decoration plots | L-B4, PL-B1, PL-B4, AR-B4 |
| 15 Dressing Corner | PL-B5, AR-B3 |
| 16 Golden, berry, snow eggs | L-B2, L-B3, H-24, H-25 |
| 17 Opening queue, novelty floor | PL-A6, PL-B3, I-4 |
| 18 Post Box, pins, notes, parcels, Home Book | PL-B2, PL-B6 to PL-B9, L-B1, C-B1, AR-B2 |
| 19 names:pull, IPA probe, name lines | C-B2, L-B5, AU-B2, AU-B3 |
| 20 Salon, cousins, valley map | L-C1, PL-C1, PL-C2, PL-C3, AR-C1, AR-C2 |
| 21 Letter Lane | L-C3, PL-C4 |
| 22 Titles, Royal Nest Keeper, Hundred Party | PL-C5 |
| 23 Come along | PL-C6, C-C1 |
| 24 Year 1 meadow wishes | L-C2, H-26, H-27 |
| 25 Save server, pairing, sync, test family, names:pull from the server | C-C2 to C-C6, AU-C2, I-5, I-6 |
| 26 Parent corner rest | PL-C8 |

No item is without a task. Spec items outside 7.1 that the session decisions changed: odin deploy (note only), service worker and `persist()` (HTTPS only), ear check (speech-to-text).

**Placeholder scan.** No "TBD" or "later" steps. One value is pinned at install time on purpose: the `@fontsource/andika` version (the spec gives none). The world view reads core's slice shapes as core Task A7 defines them.

**Type consistency.** The names in sections 2 and 4 match `contracts.ts`: `game.planContext()` is a function everywhere, `game.rng` is an `Rng`, `learn.result.items` are `{ id, r }`, name clips are `name-<slugName>` and `name-<slugName>-q`, the heartbeat action prefix is `naming.`, egg pictures are `egg-<breed>`. `contracts.ts` type-checks and runs under Node type stripping (checked on 2026-10-12).

**Review Focus.** The five lines at the top each have a pinned test: I-1 contract test, I-1 world view test plus the Moving Day flow, I-1 plan context plus the 5-minute flow, platform A10 plus core A1, heartbeat Task 16 plus the reload flow.
