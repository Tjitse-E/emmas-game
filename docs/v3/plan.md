# Moon Meadow Home v3: master implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Moon Meadow Home v3 (spec 7.1, the first playable and releases 1.1 to 1.3) in this session with agents only, so Emma can play it tonight on her iPad from Tjitse's Mac at `http://<mac>.local:8765/games/moon-meadow-home/`.

**Architecture:** Seven workstream plans in `docs/v3/plan/` (platform, core, learning, heartbeat, places, art, audio) hold the task-level code. This master plan adds an eighth, the integration stream, and fixes the seams: one set of contracts (`docs/v3/plan/contracts.ts`), one owner per file, a build order in waves A, B and C split into batches of parallel lanes, and a validation gate after each wave. Code is a Svelte 5 + Vite + TypeScript app in `games/moon-meadow-home/` with pure TypeScript rules under `src/core/`, an append-only event log in IndexedDB, and one Node 24 server that serves the repo and, from Wave C, the save API on port 8765. Emma's server goes live straight after Gate A (Task I-3G) and serves a promoted copy of the build (`dist-emma`) that only changes when a gate passes.

**Tech Stack:** Node 24.19.0, npm 12, Vite 8.3.4, TypeScript 6.0.3, Svelte 5.57.2, @sveltejs/vite-plugin-svelte 7.3.1, svelte-check 4.7.6, idb 8.0.3, vite-plugin-pwa 1.3.0 (Wave B, HTTPS only), Vitest 5.0.3, fake-indexeddb 6.2.5, @types/node 24.19.2, @fontsource/andika, `playwright-cli` 0.1.8 (WebKit, iPad emulation), Python 3 with Pillow 12.3.0 and numpy 2.5.1 (art), Codex CLI image generation (art), ElevenLabs through `scripts/generate-audio.py` (audio).

**Spec:** `docs/v3/spec.md` (the approved design), with `docs/v3/decisions.md` winning on conflicts, and the lead's session decisions (quoted in Global Constraints) winning over both. Stream plans: `docs/v3/plan/{platform,core,learning,heartbeat,places,art,audio}.md`. Contracts as code: `docs/v3/plan/contracts.ts`.

## Global Constraints

- App folder `games/moon-meadow-home/` (called `G` below). Exact dependency versions, no `^` or `~`, `package-lock.json` committed. Node 24.19.0, npm 12.
- Vite `base: './'` and `build.target: 'safari15'`. The same `dist/` works at `/games/moon-meadow-home/` on the Mac and `/unicorns/` on odin. Vite lowers syntax only, so `src/polyfills.ts` adds `Object.hasOwn`, `Array.prototype.at` and `structuredClone` for Safari 15.0 to 15.3, and a classic `public/feature-check.js` shows a picture and a big link back to v2 on anything older (R50).
- Hosting tonight: Tjitse's Mac serves the repo on port 8765 with `node games/moon-meadow-home/server/serve.ts` (core Task A11), replacing `python3 -m http.server`. v2 and v3 share that origin, so v3 reads `localStorage['emma-unicorn-egg-nest-v2']` directly. File import stays.
- Plain `http://` on the home network: no `crypto.randomUUID`, `crypto.subtle`, service worker, `navigator.storage.persist()` or share sheet may be required. Use them only when present.
- odin is out of reach (no SSH). Wave C writes a deploy note only (core Task C6).
- Scope: every item of spec 7.1. Wave A = items 1 to 13, Wave B = 14 to 19, Wave C = 20 to 26. Wave A is complete and playable before Wave B starts.
- Art: no paid API. Codex image generation through Tjitse's subscription, prompt before `-i`, stdin closed with `< /dev/null`, run outside the sandbox, at most 4 Codex processes at once, sheets cut by local scripts and each cut picture looked at. SVG fallback for anything that fails. Assets in `G/public/art/` with `manifest.json`.
- Audio: ElevenLabs through `scripts/generate-audio.py`. Elizabeth for all learning content, names and numbers. Build budget at most 24,000 credits, never below the 8,000 floor (start 34,007, so the floor is 10,007). Priority: game lines and numbers, then learning words and plurals of loaded steps, then names (at least 300). Speech-to-text checks (`--stt`) replace Tjitse's ear check this session. Generation runs outside the sandbox and no command names the key file.
- Agents never read, print, source or copy `.env`. Scripts load it themselves (`process.loadEnvFile()`).
- npm cannot write `~/.npm/_cacache` inside the sandbox. `npm install`, `npm ci` and `npx` installs run outside the sandbox, or inside it with `--cache "$TMPDIR/npm-cache"` and `registry.npmjs.org` in `allowed_domains` (R43).
- Each code lane works in its own git worktree `.worktrees/<lane>` with `node_modules` linked to the main tree; the integrator merges the lane branches at the batch end (R42). Asset lanes work in the main tree.
- Testing: Vitest for logic. `playwright-cli` (WebKit, iPad emulation) at 1180 x 820, 1080 x 810, 1024 x 768, plus portrait 820 x 1180. Outside the sandbox, short session names without slashes, screenshots moved to `$TMPDIR/mmh-shots/`, `mousemove`/`mousedown`/`mouseup` on pulsing elements. Agent tests never use port 8765 (see Contracts C0).
- The app is fully British English. No Dutch word, text or audio. Unicorns only. No pressure mechanics: no timers shown, streaks, countdowns, buzzers or red crosses.
- Commits: each agent commits its own work in small commits, plain English, no AI attribution, no em dashes, only the files its lane owns (`git add <paths>`, never `git add -A`). A commit that fails on `index.lock` is retried after 2 seconds.
- Every subagent runs on `opus` (project memory: all subagents on opus).
- Emma first: tasks marked `*` in section 3.2 are the "Emma tonight" slice (Play, Welcome or Moving Day, nest, hatch, naming, wish, stalls, meadow, goodnight). Each lane runs its `*` tasks first in a batch. At 18:00 Mac time the integrator ships whatever passes the play-critical flows (section 5.1), even if other Gate A checks are still red (R48).

## Review Focus

1. **A stream emits an event the core validator refuses** (an extra field, a renamed field, a missing `visit`). The event goes to quarantine and the progress silently disappears from Emma's game. Expected: every action translator's drafts validate. Pinned by Task I-1 test "every translator's sample drafts validate" (`tests/integration/contracts.test.ts`).
2. **Emma's real v2 herd is large (40 or more) and arrives on Moving Day** with rows, openings and pins all due at once. Expected: Moving Day plays every name, rows exist, the opening queue announces one thing per visit. Pinned by Task I-2 test "an imported herd of 45 has 5 rows, an empty camp and one opening per visit" (`tests/integration/import-45.test.ts`) and the `integration/moving-day` flow.
3. **A clip or picture is missing at runtime** (speech-to-text marked it `ok: false`, a Codex sheet failed). Expected: the planner never serves the word, every screen still has a spoken goal, `audioMissing()` stays empty. Pinned by Task I-1 test "planContext hides ok:false clips and missing pictures" (`tests/integration/plan-context.test.ts`), the `integration/no-art-manifest` flow (I-3b) and the `integration/visit-5min` flow assertion.
4. **The iPad opens the game over plain http** (insecure context). Expected: no crash from missing `crypto.randomUUID`, `crypto.subtle`, `persist()` or service worker. Pinned by platform Task A10 (smoke flow against the LAN host name) and core Task A1 ("works where crypto.randomUUID is missing").
5. **The iPad sleeps or reloads in the middle of a moment** (after the hatch, before naming). Expected: the next start resumes at naming for that baby, no second baby hatches and no event is written twice. Pinned by heartbeat Task 16 (`unnamedBaby`) and the Task I-3b flow `integration/reload-naming`.

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
| Integration | this file, section 4 | `integration` | store, actions router, world view, Welcome, Moving Day and rest scenes, gates, autoplay flows, promote and go-live |

How a builder works:

1. Read this file's Global Constraints and section 2 (Contracts), then the "Reconciled with the master plan" and "Validation round 2" blocks at the top of your stream plan. They list every task that is dropped, moved, split or changed for you; where they differ, the validation block wins.
2. Build only the tasks of your lane in the current batch (section 3), in the order listed. Tasks inside one lane may depend on each other. Lanes in one batch never depend on each other.
3. Where your stream plan's code and `contracts.ts` disagree, `contracts.ts` wins. Change your code, never the other stream's.
4. Commit after each task. At the end of the batch, run your lane's tests and report the commit list to the integrator.

The integrator (the lead's integration agent) starts each batch (worktrees, `package.json`, `vite.config.ts` plugin lines), merges the lane branches at its end, runs the batch check (section 3.4), the wave gates (section 5), `tools/promote.sh` and go-live.

---

## 2. Contracts

All shapes are in `docs/v3/plan/contracts.ts` (sections 0 to 12 there match C0 to C12 here). It type-checks with TypeScript 6.0.3 under `--strict --erasableSyntaxOnly --verbatimModuleSyntax` and runs under Node 24 type stripping. This section gives the decisions behind it. Each decision names the losing plans; their "Reconciled" blocks carry the change.

### 2.1 Reconciliation decisions

| # | Topic | Plans disagreed | Decision | Changes in |
|---|---|---|---|---|
| R1 | Home-network server and save API | platform A8, B3, C1 to C4 (`server/main.ts`, own store, tokens, API) against core A11, B2, C2 to C6 (`server/serve.ts`) | Core owns all of `server/` and `src/sync/`. Core's code was run (115 tests). One entry: `node server/serve.ts`, env in C11. Core adds `MOON_DIST` so test builds can be served. | platform (drops A8, B3, C1 to C4), core (A11 env) |
| R2 | Ids and hashes | platform A2 `src/platform/ids.ts` against core A1 `src/core/ids.ts`, `src/core/hash.ts` | Core's files. Platform imports `uuid4`, `uuid5`, `newDeviceId` from `src/core/ids.ts` and `sha256Hex` from `src/core/hash.ts`. | platform (drops A2) |
| R3 | Audio player additions and facade | platform A6, A7 (`addPack`, `voice.ts`, `clip-ids.generated.ts`, `tools/sync-phonics.ts`) against audio A3, A6 to A8 | Audio owns `shared/audio.js` changes and all of `src/audio/`. Letter sounds are served at `./audio/phonics/` by audio's Vite plugin. The router calls only `audio.stop()` on a scene change; scenes preload and release their own audio scene. | platform (drops A6, A7; A9 imports `audio`) |
| R4 | Name clip ids | audio `name-<slug>-x` and `-q`; platform and learning `name-<slug>` and `name-<slug>-q` | `nameId(name, '!') = 'name-' + slugName(name)`, `nameId(name, '?') = 'name-' + slugName(name) + '-q'`, `slugName` = lowercase letters only. | audio (A4 `nameId`) |
| R5 | Phrase clip ids | audio `phraseId(text)` slug of the text; learning `phrase-<phrase id>` | `phraseId(id) = 'phrase-' + id` with the phrase id from `content/phrases/*.json`. | audio (A4) |
| R6 | Who writes which `lines.json` | learning `build:lines` writes words, numbers, names and phrases packs; audio `audio:lines` writes every pack; heartbeat writes `content/lines/heartbeat.json` with number lines; places writes `public/audio/places/lines.json` | Learning `npm run build:lines` writes `public/audio/{words-phase2,words-phase3-4,words-year1,names-t1,phrases-notes,phrases-salon,phrases-meadow}/lines.json` only. Audio `npm run audio:lines` writes `core`, `numbers`, `places`, `area-*` and `names-new` from `content/lines/*.json` and `tools/audio/number-lines.ts`, and never touches learning's packs. Hand-written line files: audio `common.json`, `start.json`, `moving-day.json`; heartbeat `heartbeat.json` (no number lines); places `places.json` with `"pack": "places"`. Ids are unique across files; `npm run check:audio` fails on a duplicate. Learning drops its `numbers` pack. | learning (A10), audio (A5, A6), heartbeat (Task 1), places (A16) |
| R7 | Number line ids | heartbeat `lineId.*` (`num-baby-n`, `num-unicorns-n`, `name-ordinal-n`) against audio `numId` kinds | Audio's `numId`, `bondId`, `ordId`. Heartbeat's `lineId` becomes `HEARTBEAT_NUMBER_IDS` (contracts C12). Ranges: Wave A 1 to 60, sky 1 to 12. Run 12 (Wave C) adds `num-61` to `num-100`, `num-movein-61` to `-100` and `num-herd-61` to `-100` (R37). A number above the generated range is skipped, and the facade records it in `audio.missing` so a flow sees the gap. | heartbeat (Task 1), audio (A5 sky range to 12, C1) |
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
| R21 | Planner interface | heartbeat `nextItem(plan, strand, slot, rng, accept)` returning `Served`; places `serve(strand, place, kind)` | Learning's `nextItem(ctx, req, rng)` (a `Pick` or `null`) and friends (contracts C6). Heartbeat keeps `learn-bridge.ts`, places keeps `src/places/serve.ts` and `plan.ts` as their only adapters. | none beyond the adapters |
| R22 | Places' moment kinds | places slot kinds (`building/sum`, `post-box/fewest`) and no `wall` moment in learning | Places maps its slots to learning moment kinds. Learning adds `wall` (maths, M05 and M09 to M13 `a+b` facts, carrier rule as eggs). Word tags: places `pond` is `bath`, `shelf` is `found`; learning adds tag `salon` to bow, clip, beads, comb, brush, star, bell, shell, ribbon. | learning (A1, A6, A7, A17), places (A1b) |
| R23 | Blocklist and phonemes | heartbeat Task 10 `src/core/naming/blocklist.ts`, own phoneme tokens (`dh`, `uh`); learning A4 and PHONEMES | Learning's `checkBlocked` over `shared/blocklist.json` (`{ version: 1, entries: [{ w, lang, level }] }`) and learning's PHONEMES. Heartbeat's `blocklist.ts` re-exports learning's, and `sounds.ts` builds on `phonemesOf` with `content.gpcs`. | heartbeat (Task 10) |
| R24 | Letter-sound keys | audio `oo-short`, `yoo`, `iz`; learning `uu`, `yoo`, `es`; heartbeat `snd-es` | Audio's keys. Learning's `gpcs.json` `sound` field uses them. | learning (A6), heartbeat (Task 17 print dots) |
| R25 | Random numbers | heartbeat `src/core/rng.ts` from core; learning `planner/rng.ts`; art `heap.ts` | One `src/core/rng.ts` (contracts C1), written in the skeleton task. Learning's `planner/rng.ts` and art's `mulberry32` re-export it. | learning (A17), art (A6) |
| R26 | Stable rows | places `rowsBuilt(world.places)`; core herd slice `rowCount` | Core's herd slice (`row-<n>` plots). `World.rowsBuilt` comes from `rowCount(state.herd)`. Places drops `rowsBuilt`. | places (A12) |
| R27 | Release file | learning `content/release.json`; places `content/places/release.json` | Learning's only. Places reads it. Tonight it says `1.3` at the end of Wave C; during Wave A it says `1.0`, Wave B `1.1`. | places (A1) |
| R28 | Store and world shape | nobody owned `src/game.svelte.ts`; heartbeat `World`, places `world.places`/`BabyView`, learning `PlanContext` | Integration owns the store, the actions router and one `World` view (contracts C3, C7). `game.planContext()` is a function. `game.rng` is an `Rng` (callable). | heartbeat (17B, 18), places (A1b, nav) |
| R29 | Unknown names pull | platform B3, core B2, audio B3, learning B5 | Core B2 (`unknownNamesFromText`), learning B5 (`nearestNames`), audio B3 owns the CLI `tools/pull-unknown-names.ts`. Admin token `MOON_ADMIN_TOKEN` loaded by the tool with `process.loadEnvFile()`; on the Mac the tool reads `.data/moon-meadow/families/emma/events.jsonl` directly. | platform (drops B3), audio (B3, C2) |
| R30 | Deploy note | platform C4 `docs/v3/deploy-odin.md`; core C6 `server/DEPLOY.md` | Core C6. | platform (drops C4) |
| R31 | Moment results | places D1 against spec 3.3 | A miss followed by a right answer stays `miss`; `helped` only after an idle-triggered level 2 hint or the ghost hand. This is a deviation from spec 3.3, recorded in 2.4 as L1. Both count as a miss for mastery, so passes do not change; only criterion C2 reads it. | none (heartbeat already adopted) |
| R32 | Place enter and leave events | platform: store on `router.onChange`; places `nav.ts` dispatches them | The store writes `place.enter`/`place.leave` on every router change. Places' `nav.ts` only navigates. | places (A1 nav) |
| R33 | Phrase packs | audio one `phrases` pack; learning three | Learning's three: `phrases-meadow`, `phrases-notes`, `phrases-salon` (contracts `PACKS`). | audio (A6, A7) |
| R34 | Station wishes | heartbeat logs a station wish as `wish` with a normal slot; learning never mentions stations | New moment kind `station-wish` (contracts C2). The planner serves it only as a `review` or `mixed` pick of a passed or placed step, from the six station words. The learner fold updates the item boxes and never calls `pushWindow`, `moveScaffold` or `recordReview` for it. Test: ten first-try station results never pass or move a step. | learning (A1, A6, A15, A17), heartbeat (17B) |
| R35 | Steps loaded after placement | learning decision 12 freezes the placed list; R12 would become her current step in 1.2 | Fold rule: a loaded step that is missing from a finished `placement.done` list and sits below that placement's `current` in the same strand counts as `placed` (contrast, school and display steps excepted). Derived at fold, no event. Test: placement at 1.0 ends on R13; content at 1.3 loads R12; `stepStatus(R12)` is `placed` and `currentStep` stays R13. | learning (A15, C6) |
| R36 | Display tricky words | spec 3.9 heart parts; no task | `RawWord.heart` lists the indexes of the heart-part graphemes (contracts C4). `Pick.display` carries display words shown with the carrier (`the` before a wish word from R06 on). `PrintWithDots` draws heart parts with a soft heart glow and no sound dots. After the act Elizabeth reads the display word clip, then the carrier word clip (two sentences, AD5). Display words never become items. Salon cards and notes render the heart parts of their phrase words. | learning (A7, A17, C1), heartbeat (17, 20), places (B7, C1) |
| R37 | Numbers 61 to 100 | R7 deferred them; spec item 22 (Royal Nest Keeper at 75, Hundred Party) needs them | Run 12 in Wave C generates `num-61` to `num-100`, `num-movein-61` to `-100` and `num-herd-61` to `-100` (about 2,300 credits), taken from run 13's share. If the budget runs short, run 12 is cut from the top (100 down) and Gate C lists the missing ids as an allowed gap for Tjitse. | audio (C1), places (C5, C9) |
| R38 | Building Day items | places A12, A13 serve one item per part; D9 logs the sign under her current spelling step | Each part serves its strand's current item and one review item. When a step of that strand passed in this visit, the part uses that step's items. The sign logs each slot under the step of its own grapheme as `review` (passed or placed step) or `mixed`, never `current`; a slot whose step is neither passed nor placed is given, not checked. | places (A12, A13) |
| R39 | Setting keys | places `parentPin`, `skipWishAfterThree`, birthday `YYYY-MM-DD` | Contracts `SettingKey` strings everywhere: `parent-pin`, `skip-wish-after-three`, `birthday` as `MM-DD`. The world view maps them to `world.settings`. | places (A1, A15, C8) |
| R40 | One name key | four copies of `nameKey`/`slugName` that differ on accents and hyphens | `G/src/core/keys.ts` is contracts section 12 verbatim, written by platform in the skeleton task. Learning `gpc.ts` and `ids.ts`, heartbeat `check.ts` and audio `ids.ts` re-export it. One test `tests/core/keys.test.ts` checks `Zoë` is `zoe` and `Lily-Rose` is `lilyrose` for both the item id and the clip id. | platform (A1), learning (A1, A11), heartbeat (14), audio (A4) |
| R41 | Shared types before their owner exists | places imports `ActionCtx` from I-1's file (batch A4) in batch A2 | `G/src/types/contracts.ts` is a verbatim copy of `docs/v3/plan/contracts.ts`, written by platform in the skeleton task and changed only by the integrator. Import types (`import type`) from it when the owner module lands in the same or a later batch: `ActionCtx`, `Action`, `World`, `WorldBaby`, `GameState`, `Pick`, `Outcome`. Runtime values always come from the owner module. Integration's `world-view.ts` imports `World` and `WorldBaby` from it instead of declaring them. | all code lanes |
| R42 | Lane isolation | lanes share one tree; one lane's half-written file breaks another's build, `check` and flows | Each code lane works in `.worktrees/<lane>` on branch `lane/<lane>` (created by the integrator from `main` at the batch start, `node_modules` a symlink to the main tree's). Lanes commit on their branch. At the batch end the integrator merges every lane branch into `main` (files are disjoint, so merges are clean), runs the batch check in the main tree and removes the worktrees. Asset lanes (`art-gen`, audio runs) work and commit in the main tree. If a worktree cannot be made, the lane runs only `npx vitest run <its own test paths>` during the batch and runs its build, `check` and flows after the merge. | all code lanes |
| R43 | npm in the sandbox | not stated | `npm install`, `npm ci` and `npx` installs run outside the sandbox, or with `--cache "$TMPDIR/npm-cache"` and `registry.npmjs.org` in `allowed_domains`. | platform (A1), integrator |
| R44 | Store readiness | the store opened only when Play was tapped; hooks before Play threw | `src/game.svelte.ts` starts opening the store at module load (`ready()`, memoised). The start handler and every store-dependent hook handler `await ready()` first. | integration (I-1) |
| R45 | End of a visit | heartbeat expected `endVisit()` to show the start screen; nothing did; a 30-minute timeout left `visit` null | `game.endVisit(reason)` writes `visit.end` and resets the router to the `rest` scene (integration `src/scenes/Rest.svelte`): a night meadow with one big moon button. A tap unlocks audio, opens a new visit and routes through `chooseStart`. Goodnight, the idle timeout and a long hide all end there. | integration (I-1), heartbeat (22) |
| R46 | First start rule | I-2 checked v2 only while the log was empty | Core K7: try `readV2Local()` on every start while the log has no `import.v2` and no `egg.hatched` that did not come from v2. Only `egg.hatched`, `import.v2` and `learn.result` count as play. A reload during the welcome replays the welcome. | integration (I-2) |
| R47 | Emma's server | started only in I-6 at the end of Wave C, from `dist/`, which every gate rebuilt | Task I-3G goes live straight after Gate A: `tools/promote.sh` builds and copies into `dist-emma` (older hashed files kept, so an open tab keeps working), `tools/go-live.sh` stops python on 8765 and starts `MOON_DIST=dist-emma PORT=8765 HOST=0.0.0.0 caffeinate -i node server/serve.ts`, and checks from the LAN address and the `.local` name. Gates B and C promote only after they pass; `gate.sh` builds only `dist-test-gate`. The server prints both addresses and logs each request's User-Agent. v2 gets a small moon link to `../../games/moon-meadow-home/`, so v3 opens on the same origin as her v2 save. | integration (I-3G, I-6), core (A11) |
| R48 | Gate A scope | all-or-nothing gate with checks Emma does not need tonight | Gate A has blocking checks (play-critical) and warnings (section 5.1). Warnings go to their owning lane in batch B1 and block Gate B. At 18:00 Mac time the integrator promotes the newest build that passes the blocking checks. | integration, all lanes |
| R49 | Art manifest failure | `loadArtManifest` throws; boot hangs; `hasPicture` throws | `loadArtManifest` catches, logs, and uses an empty manifest, so every picture takes its SVG fallback. `hasPicture` returns false while nothing is loaded. Flow `integration/no-art-manifest` serves no manifest and still reaches the nest with a spoken goal. | art (A6), integration (I-3b) |
| R50 | Older Safari | target `safari15` with `at`, `hasOwn`, `structuredClone` in runtime code | `src/polyfills.ts` (first import of `main.ts`) and `public/feature-check.js` (a classic script before the module script; it checks `CSS.supports('aspect-ratio: 1')`, `indexedDB` and `Promise`, and shows a picture plus a big link to v2 when one is missing or when the app has not booted after 10 seconds). | platform (A9) |
| R51 | Missing goal clip | a moment whose goal clip is missing was silent | `createMoment` checks `audio.hasClip(goal)` at start. Without it the moment opens at the focused-hint level: moonbeam on the target and one ghost-hand demo straight away. Runs 1a and 1b (goal lines) come before the word and name runs, and their clips are checked before go-live. | places (A3), audio (runs) |
| R52 | Missing clips in fast mode | `sayOne` returned before the player looked the id up | In fast mode a static id with no file is still recorded in `audio.missing` and sent to `onMissing`. `speak`, `say` and `sayAll` take `SpeakId`, the generated `ClipId` union or a `DynamicClipId` (contracts C8), so tsc catches an unknown static id. `judgeLog` counts a scene's goal only when its id has a clip. | audio (A7, A8), integration (I-3a) |
| R53 | Wave B and C lines | audio B1 and C1 still wrote place lines | Places adds its Wave B and C lines to `content/lines/places.json` (and `places-stable-yard.json`, `places-village-lane.json` for the `area-*` packs) in PL-B4 to B9 and PL-C1 to C6. Heartbeat adds its own to `heartbeat.json`. Audio B1 and C1 write number lines only. Run 8 runs in B3 and run 11 in C3, after the lines are committed. `content/lines/core.json` is not used. | audio (B1, C1), places, heartbeat |
| R54 | Meadow arrival and the moon | returning arrival and the visit-1 moon hint had lines but no owner | Places A7: on the first meadow arrival of a visit after visit 1, the herd runs to the fence, `lumi-hello-back`, then `g-egg-waiting`, the moonbeam on the nest, and the hint ladder (idle repeat, then a ghost tap on the nest). Once per visit. An opening that is due speaks first. Heartbeat Task 23: in visit 1, after the third hatch, the ghost hand points at the moon and Elizabeth says `g-moon`, once ever (recorded as `opening.announced` `moon-hint`). The meadow leaves `SILENT_OK`. | places (A7), heartbeat (23), integration (I-3a, I-3b) |
| R55 | Moving Day robustness | one ghost tap, no idle repeat; every v2 baby drawn at once; unnamed v2 babies never named | Moving Day shows at most 12 movers at a time (each walks across, says its name, then fades into a counted stall picture). Door 4 runs through `createMoment` (idle repeat of `num-tap-door-4`, then the ghost hand), after `await tick()`. A name without a clip plays heartbeat's kind no-clip line. Unnamed v2 babies are named after Moving Day, one per heartbeat: `heartbeat.start()` already picks the first baby with `name === null` (Task 23), so each start names one before a new egg. This replaces core K7's "named during Moving Day". | integration (I-2) |
| R56 | Parent corner coverage | Dutch pairs, ceiling, quarantine list, jewel share, per-strand steps and choosing a start had no task | PL-A15 adds a Learning section from learning's `learnerReport` (current, level, placing, placement, ceiling, secure, side, school, reopened, the week's Dutch-tagged count per pair), the quarantine count and list from `game.data`, the jewel share from `report.ts`, a profile switch (`fresh` or `year1`) in Overrides, and "import v2 from this browser again". The restore path is reachable before a fresh start: Welcome and Moving Day mount `<PinGate />`, and Welcome holds the first egg while the parent corner is open. | places (A15, C8), integration (I-2) |
| R57 | Favourites and decorations | no action produced `favourite.set` or `decor.placed`; v2 gifts never shown | Places B9 adds a favourite heart on the baby page (`place/favourite` to `favourite.set`); the meadow shows favourites first among its 12. Heartbeat 23B adds stall-door free play (paint, flower box, lantern) as `hb.decor` to `decor.placed` with area `stalls`. Places A7 draws the v2 gifts in `cosmetics` as meadow decorations. Each action gets a sample action. | places (A7, B9), heartbeat (23B) |
| R58 | Decoration plots | 12 in total; `jewelPlot` returns null after that | Decorations repeat in rounds: after the 12 are used, the same 12 plots come back in new colours (`<id>-r2`, `-r3`). `jewelPlot` never returns null. Test: 30 jewels in a row all get a plot. | places (B1) |
| R59 | `setScaffold` hook | no handler, no learner operation for it | `PlanContext.testScaffold?: Partial<Record<StepId, 1 \| 2 \| 3>>` (contracts C6). The planner uses it instead of the learned level when set. Only the test hook sets it (I-1 keeps the map and passes it in `planContext()` in test builds). | learning (A17), integration (I-1) |
| R60 | Shared config files | `.gitignore` had no owner; audio and platform edited `vite.config.ts` and `package.json` | Platform owns both `.gitignore` files with the full list (`dist-test*/`, `dist-emma*/`, `.data/`, `.worktrees/`, the local fixture folder). The integrator adds the `sharedAudio` plugin line to `vite.config.ts` at the A2 start, installs `vite-plugin-pwa` at the B1 start, and switches `main.ts` from the eager glob to a static `./game.svelte.ts` import in I-1. AU-A6, AU-A8 and P-B1 do not edit `package.json` or `vite.config.ts`. | platform, audio, core |
| R61 | Art lanes | both art lanes edited `tools/art/pipeline.py` and `public/art/manifest.json` | `art-app` owns all code and tests (`tools/art/**`, `src/art/**`, `src/stress/**`). `art-gen` owns the data (`art-src/**`, `public/art/**`) and is the only lane that runs `pipeline manifest`. AR-A11 and AR-A14 are split into named parts (art block). | art |
| R62 | Word pictures | art drew 273 ids from its own list; learning needs about 450 to 500 | `art-gen` seeds from `words.txt` in batch A1 and, once learning's `content/pictures-needed.json` is committed (batch A2), draws every missing id from it (AR-A13b, batches A3 and A4). Gate A reports `ASSET_PIC` as a warning; the planner hides words without a picture; L-A22 blocks only when a loaded step has fewer than 3 servable carriers (6 for R19 and S10). | art (A13b), learning (A5, A22) |
| R63 | Older iPad performance | stress run on desktop WebKit only | `Unicorn` gets a `lite` mode (no blend or mask layers, a pre-tinted flat sprite). The app switches to it when the median frame time over the first 3 seconds of the meadow is above 24 ms, and keeps the choice in `localStorage` (wrapped in try/catch). | art (A9), places (A7) |
| R64 | Decoded clips | dynamic clips stayed decoded forever | The facade keeps at most 60 decoded dynamic clips (least recently used goes first); `release(scene)` also forgets the dynamic clips that scene played. | audio (A8) |

Places decisions D1 to D21 stand, except D6 (R27), D9 (R38) and D14 (notes come from learning's phrases, R8).

R34 to R64 come from the second validation round (2026-10-12). Every stream plan has a "Validation round 2 (binding)" block under its Reconciled block.

### 2.4 Deviations from the spec (lead decisions)

`docs/v3/decisions.md` is not part of this plan commit. This table is the record of where the build knowingly differs from the spec; the lead may copy it into `decisions.md`.

| # | Spec | Build | Why |
|---|---|---|---|
| L1 | 3.3: an answer after a level 2 hint is `helped`, and one miss raises the level | A miss then a right answer stays `miss`; `helped` only after an idle-triggered level 2 hint or the ghost hand (R31, places D1) | Otherwise criterion C2 equals the error rate. Mastery counts both as a miss, so passes are the same. `report.ts` uses this rule for C2. |
| L2 | 3.5: a new player starts at R01, S01, M01 or a parent-set start | Default profile `year1` (learning decision 7); the parent corner switches to `fresh` (R56) | This build is for Emma, who starts Year 1. |
| L3 | 3.9: R12, R24, R27 to R29 in the first playable | They load with 1.2 (learning decision 12); R35 keeps her placement when they load | Their carriers are phrase wishes and Salon cards, built in Wave C. |
| L4 | Core K7: unnamed v2 babies are named during Moving Day | Named one per heartbeat after Moving Day (R55) | A long naming chain on her first v3 screen is too much at once. |
| L5 | 2.9 numbers to 100 | Generated in Wave C run 12 (R37); cut from the top if credits run short | Budget order: game lines, words, names. |

### 2.2 Contract blocks

Every block is code in `contracts.ts`. The owner implements it; everyone else imports it.

- **C0 Paths, ports, owners.** `OWNERS` lists every shared path and its owner, including both `.gitignore` files (platform), `src/core/keys.ts` and `src/types/contracts.ts` (platform, skeleton task), `tools/promote.sh`, `tools/go-live.sh`, `src/scenes/Rest.svelte` and the v2 link (integration). `PORTS`: 8765 Emma, 8766 integration and gates, 8771 to 8776 lanes, 8799 core sync. `testUrl(port)`.
- **C1 Shared values and rng.** `Strand`, `LearnStrand`, `Result`, `ErrorTag`, `BreedId` (nine breeds), `EggKind` (six), `BREED_OF`, `Stage`, `Colours`, `Traits` (four booleans, never optional in events), `OutfitSlot`, `Rng`, `mulberry32`, `makeRng`, `pick`, `shuffle`. Platform writes `src/core/rng.ts` verbatim in the skeleton task.
- **C2 Events.** `MomentKind` includes `station-wish` (R34). `Payloads` for all 35 types across the three waves, `DraftOf`, `GameEvent`, `FACT_KEYS`, `ExportFile`, `SettingKey`. Core's `src/core/events.ts` implements the checks; an extra or missing field is refused.
- **C3 State.** `Slice`, core's `HerdBaby` (now with `listName`, `clipHeard`, `comeAlong`), `GameState` (core slices plus `learner` and `places`), and the `World` view every scene reads.
- **C4 Content.** `RawWord` (`pic` is the bare word, `heart` marks heart-part graphemes, R36), `RawName`, `RawPhrase`, `PhraseAct`, `LineFile`, `ReleaseFile`, and the `Content` subset others read.
- **C5 Learning engine.** `createLearnerSlice`, `pendingLearnFacts` (replaces core's `passReady`), status and knowledge functions, `jewels`, `criteria`, `checkBlocked`, `findSamePhonemes`, `splitUsual`, `phonemesOf`, `content`, `CONTENT_HASH` (learning adds it to `src/core/content/static.ts`).
- **C6 Planner.** `PlanContext` (with the test-only `testScaffold`, R59), `ItemRequest`, `Carrier`, `Pick` (with `display`, R36), `Outcome`, `nextItem`, `nextEgg`, `goldenEgg`, `nextNameReviews`, visit signals, `learnResultPayload`.
- **C7 Scenes, store, actions.** Router, scene registration, `SCENE_IDS` (with `rest`, R45), input action options, `Action` prefixes (`hb.`, `naming.`, `place/`, `game/`), `ActionCtx`, the `game` store (with `ready()` and `endVisit` routing to `rest`, R44, R45), the `heartbeat` runtime and its exports, places' exports, `activeMoment` and `Moment.target()`.
- **C8 Audio.** The `Audio` interface (audio's, with `sayName` returning `Promise<boolean>`, and `speak`/`say`/`sayAll` typed `ClipId | DynamicClipId`, R52), `SfxName`, `PACKS`, `NEW_SOUND_KEYS`.
- **C9 Art.** Manifest types, loader functions, component props, picture id rules, `SCENE_ART_IDS`, `eggArtId`.
- **C10 Test hook.** `HookState`, `TestHook`, registry functions. `said()` and `audioMissing()` are synchronous methods on `window.__game` that read `audio.said` and `audio.missing`; `pass`, `setScaffold`, `announce`, `target` and `pairForTest` are `callHook` forwards whose handlers the store registers.
- **C11 Server and sync.** Core's protocol types, `SyncStatus`, `SyncClient`, server env names.
- **C12 Ids.** Owner file `src/core/keys.ts` (R40), copied verbatim. Item id grammar, `graphemeItem`, `slugName`, `nameKey`, `nameItemId`, `slug`, `wordId`, `nameId`, `phraseId`, `numId`, `bondId`, `ordId`, `HEARTBEAT_NUMBER_IDS`, `NARRATOR_ONLY_PREFIXES` (adds `ord-` and `model-` to the spec's list).

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
    "serve:test": "PORT=${MMH_PORT:-8766} HOST=127.0.0.1 MOON_DIST=${MOON_DIST:-dist-test} MOON_DATA=${MOON_DATA:-$TMPDIR/mmh-test-data} node server/serve.ts",
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
  plugins: [svelte()],   // the integrator adds sharedAudio(resolve(import.meta.dirname, '../..')) here at the A2 start (R60)
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

`G/src/core/keys.ts`: section 12 of `contracts.ts` verbatim (R40), with `tests/core/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { nameId, nameItemId, slugName } from '../../src/core/keys.ts';

describe('one name key for items and clips', () => {
  it('drops accents and hyphens the same way for both', () => {
    expect(slugName('Zoë')).toBe('zoe');
    expect(nameItemId('Zoë')).toBe('name:zoe');
    expect(nameId('Zoë', '!')).toBe('name-zoe');
    expect(nameItemId('Lily-Rose')).toBe('name:lilyrose');
    expect(nameId('Lily-Rose', '?')).toBe('name-lilyrose-q');
  });
});
```

`G/src/types/contracts.ts`: `docs/v3/plan/contracts.ts` copied verbatim (R41). Only `import type` from it. The integrator copies it again when `contracts.ts` changes.

Both `.gitignore` files as platform Task A1 shows them (R60): the game folder ignores `node_modules/`, `dist/`, `dist-test*/`, `dist-emma*/`, `.data/`, `public/phonics/`; the repo root adds `games/*/dist-test*/`, `games/*/dist-emma*/`, `.worktrees/` and `games/moon-meadow-home/tests/fixtures/local/`.

Install (R43), outside the sandbox from `G`: `npm install --save-exact <the versions above>`. Inside the sandbox it fails with EPERM on `~/.npm/_cacache`.

---

## 3. Build order

### 3.1 Rules

- A batch starts only when every lane of the previous batch has committed, the integrator has merged the lane branches into `main`, and the batch check (3.4) is green.
- Lanes inside a batch own disjoint files and never import a file another lane writes in the same batch. A lane runs its tasks one after the other, `*` tasks first; it never waits on another lane of the same batch. Tasks inside one lane may depend on each other.
- Worktrees (R42). At the batch start the integrator runs, for each code lane, from the repo root:

  ```sh
  git worktree add -B lane/<lane> .worktrees/<lane> main
  ln -s "$PWD/games/moon-meadow-home/node_modules" .worktrees/<lane>/games/moon-meadow-home/node_modules
  ```

  The lane agent works and commits only inside `.worktrees/<lane>/`. At the batch end the integrator runs `git merge --no-ff lane/<lane>` for each lane in the main tree, then `git worktree remove .worktrees/<lane>`. A merge conflict means two lanes touched one file: the integrator stops and gives the file to its owner (contracts C0).
- The asset lanes (`art-gen` and the generation runs of `audio`) work in the main tree across batches. A run starts when the files it reads are merged into `main`, and never edits code another lane owns.
- `package.json`, `vite.config.ts` plugin lines and the `main.ts` import switch are changed only by the integrator (R60). A lane that needs a script or dependency asks the integrator. npm runs outside the sandbox (R43).
- Each code lane uses its own test port and `dist-test-<lane>` (R15). Flows that need scenes from another lane of the same batch run after the merge.
- Types that another lane of the same or a later batch owns come from `src/types/contracts.ts` (R41).

### 3.2 Wave A: first playable (spec 7.1 items 1 to 13)

`*` marks the "Emma tonight" slice (Global Constraints). Task ids: `P-` platform, `C-` core, `L-` learning, `H-` heartbeat, `PL-` places, `AR-` art, `AU-` audio, `I-` this file.

**Batch A0: skeleton**

| Lane | Tasks (stream file) |
|---|---|
| platform | P-A1* with the deltas in 2.3: `keys.ts`, `types/contracts.ts`, both `.gitignore` files (platform.md) |
| art-gen (parallel, Python only) | AR-A1*, AR-A2* (with the four `ui-*` lines, `item-moon`, the care items and the `test_lists.py` counts), AR-A3* (runner and calibration), AR-A4*, AR-A5* (art.md) |
| audio (parallel, Python only) | AU-A1*, AU-A2* (run 0, which also measures the speech-to-text cost per check into `tools/audio/budget.json`) (audio.md) |

Boundary: every TypeScript lane needs `package.json`, `tsconfig.json`, `node_modules`, `src/core/rng.ts`, `src/core/keys.ts` and `src/types/contracts.ts`. The integrator runs `npm install` outside the sandbox and makes the worktrees.

**Batch A1: foundations**

| Lane | Tasks (stream file) |
|---|---|
| core | C-A1*, C-A2*, C-A3* (payloads exactly as contracts C2), C-A4*, C-A5*, C-A11* (server with `MOON_DIST`, both addresses, User-Agent log) (core.md) |
| learn-data | L-A1*, L-A2*, L-A3*, L-A4*, L-A5* (learning.md) |
| platform | P-A3*, P-A4*, P-A5* (platform.md) |
| audio | AU-A3*, AU-A4* (ids re-export `keys.ts`), AU-A5* (number lines and `common`, `start`, `moving-day` files only) (audio.md) |
| art-app | AR-A6* (manifest loader that never throws, palette, tint, heap, Picture, Heap) (art.md) |
| heartbeat | H-1* (lines without numbers, ids from `keys.ts`), H-2*, H-3*, H-5*, H-6*, H-7*, H-8*, H-9* (heartbeat.md) |
| places | PL-A1a* (`types.ts` value types only), PL-A2* (hint ladder), PL-A8* pure part (places.md) |
| art-gen (main tree, rolling) | AR-A13* seed word sheets from `words.txt`, AR-A14a* Wave A items and backgrounds (art.md) |

Boundary: batch A2 imports the event types, validator and fold engine (C-A3, C-A5), content types, builder and blocklist (L-A1, L-A2, L-A4), the router core and hook registry (P-A4, P-A5), audio ids (AU-A4), the art manifest and palette (AR-A6), places' value types (PL-A1a).

**Batch A2: domain** (integrator first adds the `sharedAudio` line to `vite.config.ts`)

| Lane | Tasks (stream file) |
|---|---|
| core | C-A6*, C-A7* (herd adds `listName`, `clipHeard`, `comeAlong`), C-A8*, C-A9*, C-A10*, C-A12* (core.md) |
| learn-data | L-A6* (sound keys R24, `station-wish`), L-A7* (tags R22, bare picture ids R13, heart marks R36), L-A8*, L-A9* (adds Dot, Fen, Bex to the bank), L-A10* (R6, `CONTENT_HASH`, `pictures-needed.json`) (learning.md) |
| learn-engine | L-A11*, L-A12*, L-A13*, L-A14*, L-A15* (station-wish and release-upgrade fold rules) (learning.md) |
| platform | P-A9a* (`src/polyfills.ts`, `public/feature-check.js`) (platform.md) |
| audio | AU-A6*, AU-A7* (typed `ClipId`), AU-A8* (facade: `sayName` boolean, fast-mode missing, LRU 60), AU-A9* (audio.md) |
| art-app | AR-A7*, AR-A8*, AR-A9* (with `lite` mode), AR-A10 (stress run 1 on placeholders) (art.md) |
| heartbeat | H-4* (hatch colours from art's palette) (heartbeat.md) |
| places | PL-A1* (state, fold, translator on contract shapes, `scenes.ts`, `hook.ts`, in-lane contract test), PL-A5*, PL-A6*, PL-A9 logic (places.md) |
| audio runs | run 1a* (`common`, `start`, `moving-day`, `heartbeat.json`), run 2* (Wave A numbers) |

Boundary: the shell needs the audio facade (AU-A8) and art loader (AR-A6); the planner needs the learner fold (L-A15); heartbeat's naming needs `content.gpcs` (L-A10); building logic needs the herd slice (C-A7); the sprite runs need AR-A7 and AR-A8.

**Batch A3: shell, planner and naming**

| Lane | Tasks (stream file) |
|---|---|
| platform | P-A9* (shell, Play gate, imports `audio`, `loadArtManifest`, `polyfills`), P-A10* (hook with sync `said`/`audioMissing`, flows on core's server, probe fixed), P-A11* (ghost hand, moonbeam) (platform.md) |
| learn-engine | L-A16*, L-A17* (rng re-export, `wall`, `station-wish`, `display`, `testScaffold`), L-A18*, L-A19*, L-A20 (learning.md) |
| heartbeat | H-10*, H-11*, H-12*, H-13*, H-14* (`nameKey` from `keys.ts`), H-15* (translators on contract shapes, in-lane contract test), H-16* (heartbeat.md) |
| places | PL-A12 logic (rows from core, R26; review item and sign rule, R38), PL-A14 (report, jewel share) (places.md) |
| art-app | AR-A11a* (`lumi` command and `plan-sheets --source <list>` in `pipeline.py`) (art.md) |
| art-gen (main tree) | AR-A13b* word top-up from `pictures-needed.json`, AR-A11b* breed sprites, AR-A12 layer spike (60 minutes) (art.md) |
| audio runs | runs 3*, 4*, 5* (words, plurals first), run 7* (`names-t1`, v2 names first, at least 300) |

Boundary: the store needs the boot handler (P-A9), hook registry (P-A10), learner slice (L-A15), places slice (PL-A1), heartbeat translators (H-15) and game data (C-A9). H-17 needs platform's input actions (P-A9). PL-A1b needs the planner and `learnResultPayload` (L-A17, L-A19). PL-A3 needs the ghost hand (P-A11).

**Batch A4: store and shared parts**

| Lane | Tasks (stream file) |
|---|---|
| integration | I-1* (store, actions router, world view, hook handlers without the `activeMoment` fallback, `main.ts` switch, `Rest.svelte`) (plan.md) |
| heartbeat | H-17* (gem, slot, tray, slider, stone, print parts with heart-part style) (heartbeat.md) |
| places | PL-A1b* (planner adapter, `learnResultPayload` wiring), PL-A3* (moment controller, missing-goal rule, `target()`), PL-A4*, PL-A16* (`places.json`, art requests) (places.md) |
| learn-engine | L-A21 (simulated learner) (learning.md) |
| platform | P-A12 (menu card) (platform.md) |
| art-gen (main tree) | AR-A11b* Lumi (after AR-A11a is merged) (art.md) |
| audio runs | run 1b* (`places.json`) after PL-A16 is merged |

Boundary: scenes need the store (I-1); heartbeat's bridges need `createMoment` (PL-A3) and the planner adapter (PL-A1b).

**Batch A5: heartbeat scenes, first places, parent corner**

| Lane | Tasks (stream file) |
|---|---|
| heartbeat | H-17B* (station-wish, display words), H-18*, H-19*, H-20*, H-21*, H-22* (printed goodnight count, `endVisit('goodnight')`), H-23* (flows, moon hint), H-23B* (stall-door decoration) (heartbeat.md) |
| places | PL-A15* (parent corner part 1 with `PinGate` export, Learning section, restore), PL-A10 (jars, shelf, label scene), PL-A11 (Bath Pond) (places.md) |
| integration | I-3a* (`autoplay.ts`, `judgeLog`, `gate.sh`, `promote.sh`, `go-live.sh`) (plan.md) |

Boundary: the meadow hub mounts `MeadowLife` (H-23B) and `PinGate` (PL-A15); Welcome and Moving Day need `heartbeat.start` (H-23) and `PinGate` (PL-A15); Building Days use `Naming` (H-19) and `HatchAndName` (H-23B).

**Batch A6: meadow, Welcome, Moving Day, Building Days**

| Lane | Tasks (stream file) |
|---|---|
| places | PL-A7* (meadow hub: arrival goal, favourites, v2 gifts, `PinGate`, `lite` switch), PL-A13 (Building Day scenes), PL-A17 (flows) (places.md) |
| integration | I-2* (Welcome, Moving Day, start rule, import-of-45 test) (plan.md) |
| learn-engine | L-A22 (learning gate) (learning.md) |
| art-app | AR-A11c (second stress run on the real sprites), AR-A14b (Wave A art check) (art.md) |
| platform | P-A13 (docs) (platform.md) |

**Batch A7: gate and go-live** (integration only, main tree)

| Lane | Tasks (stream file) |
|---|---|
| integration | I-3b* (flows: `visit-5min`, `reload-naming`, `returning`, `rest`, `no-art-manifest`, `placement`; contract test over all translators; `activeMoment` fallback), then Gate A (5.1), then I-3G* (go-live for Emma) (plan.md) |

### 3.3 Waves B and C

**Batch B1** (release 1.1; integrator sets `content/release.json` to `1.1` and installs `vite-plugin-pwa@1.3.0`)

| Lane | Tasks (stream file) |
|---|---|
| every lane | first, the Gate A warnings it owns (section 5.1) |
| core | C-B1 (`note.sent` with `note`), C-B2 (core.md) |
| learn-data | L-B1 (notes, heart marks on phrase words), L-B2 (1.1 maths moments) (learning.md) |
| learn-engine | L-B3 (golden egg), L-B4 (jewels), L-B5 (name helpers) (learning.md) |
| platform | P-B1 (service worker on HTTPS only, no `package.json` edit), P-B2 (three backgrounds), P-B4 (flow helpers for several visits) (platform.md) |
| heartbeat | H-24 (berry and snow eggs, creates `flows/heartbeat/eggs-b.flow.sh`) (heartbeat.md) |
| places | PL-B1 (Jewel Box, plot order, repeating decorations), PL-B2 (pins, `pin.given.key`), PL-B3 (novelty floor) (places.md) |
| art-gen | AR-B1 to AR-B4, AR-B5 (Wave B requests only; words were topped up in Wave A) (art.md) |
| audio | AU-B1 (Wave B number lines only), AU-B2 (IPA probe, run 9) (audio.md) |

Boundary: B2 uses the 1.1 events (C-B1), golden egg and jewels (L-B3, L-B4), notes content (L-B1), unknown names (C-B2) and name helpers (L-B5).

**Batch B2**

| Lane | Tasks (stream file) |
|---|---|
| heartbeat | H-25 (golden egg, two-egg choice, extends `eggs-b.flow.sh`) (heartbeat.md) |
| places | PL-B4, PL-B5, PL-B6, PL-B7 (notes from learning phrases, R8), PL-B8, PL-B9 (favourite heart); each adds its lines to `places.json` (R53) (places.md) |
| audio | AU-B3 (`names:pull`), run 10 (`names-new`) (audio.md) |
| learn-engine | L-B6 (gate) (learning.md) |

**Batch B3**

| Lane | Tasks (stream file) |
|---|---|
| places | PL-B10 (flows) (places.md) |
| audio runs | run 8 (Wave B lines from `heartbeat.json` and `places*.json`) |
| integration | I-4 (six-visit queue flow), then Gate B, then `tools/promote.sh` (plan.md) |

**Batch C1** (releases 1.2 and 1.3; integrator sets `content/release.json` to `1.3`)

| Lane | Tasks (stream file) |
|---|---|
| core | C-C1, C-C2, C-C3, C-C4 (core.md) |
| learn-data | L-C1 (Salon phrases), L-C2 (meadow phrases), L-C3 (letter order) (learning.md) |
| learn-engine | L-C4 (criteria) (learning.md) |
| places | PL-C3 (valley), PL-C4 (Letter Lane), PL-C5 (titles, Hundred Party), PL-C6 (come along) (places.md) |
| heartbeat | H-28 (quiet stall moves), H-29 (skip-wish switch) (heartbeat.md) |
| art-gen | AR-C1, AR-C2, AR-C3 (art.md) |
| audio | AU-C1 (number lines 61 to 100 only), run 12 (numbers 61 to 100), run 6 (phrase packs) after L-C1 and L-C2 are merged (audio.md) |

Boundary: C2 needs the save API (C-C4), the 1.2 events (C-C1) and the Salon and meadow phrases (L-C1, L-C2).

**Batch C2**

| Lane | Tasks (stream file) |
|---|---|
| core | C-C5 (sync client), C-C6 (schema freeze, deploy note) (core.md) |
| learn-engine | L-C5 (merged-log fold) (learning.md) |
| places | PL-C1 (cousins and cards on learning phrases), PL-C2 (Salon scene) (places.md) |
| heartbeat | H-26 (phrase wishes R27, R28, R29, R12), H-27 (asking bubbles, two-state wishes); both create or extend `flows/heartbeat/year1.flow.sh` (heartbeat.md) |
| audio | AU-C2 (names from the server), AU-C3 (review sheet) (audio.md) |
| integration | I-5 (sync in the store) (plan.md) |

Boundary: the parent corner part 2 needs the sync client (C-C5) and the store wiring (I-5).

**Batch C3**

| Lane | Tasks (stream file) |
|---|---|
| places | PL-C8 (parent corner part 2, contract setting keys), PL-C9 (flows) (places.md) |
| learn-engine | L-C6 (gate) (learning.md) |
| art-app | AR-C4 (final stress at 44 and 60 unicorns) (art.md) |
| audio | run 11 (Wave C lines), then AU-C4 (name top-up, run 13, final audio check) (audio.md) |
| integration | I-6 (45-minute visit, two devices, eviction, `pairForTest`), then Gate C, then `tools/promote.sh` (plan.md) |

### 3.4 Batch check (integrator, after every batch, in the main tree after the merge)

Run from `G`:

```sh
npm test
npm run check
git status --short   # only files of the asset lanes may be dirty
git worktree list    # only the main tree is left
```

Expected: every suite passes, `check` reports 0 errors (missing modules of later batches are allowed only where a stream plan says so, for example heartbeat Tasks 18 to 22 before Task 23).

### 3.5 Asset lanes and budgets

**Audio runs** (each `sh tools/audio/gen.sh <pack>` from `G`, outside the sandbox, with `--stt`, floor 10,007, cap 24,000 in `tools/audio/budget.json`). Order is the lead's priority: goal and game lines, then numbers the Wave A scenes speak, then words and plurals of loaded steps, then names. Run 0 records the speech-to-text cost of one check in `budget.json`; every later estimate adds it.

| Run | When | Pack | Estimate |
|---|---|---|---|
| 0 | A0 | phonics `oo-short`, `yoo`, `iz`; speech-to-text cost probe | 30 |
| 1a | A2, after H-1 and AU-A5 | `core` (`common`, `start`, `moving-day`, `heartbeat`) | 1,500 |
| 2 | A2, after AU-A5 | `numbers` (Wave A, sky to 12) | 5,300 |
| 3, 4, 5 | A3, after L-A10 | `words-phase3-4` (plurals first), `words-year1`, `words-phase2` | 3,300 |
| 7 | A3, after L-A10 | `names-t1` (v2 names first, strict order, at least 300 names) | 3,300 |
| 1b | A4, after PL-A16 | `places` (Wave A lines) | 1,800 |
| 9 | B1 | IPA probe | 330 |
| 10 | B2 | `names-new` | 500 |
| 8 | B3 | Wave B lines (`heartbeat`, `places`, `area-stable-yard`) | 1,500 |
| 12 | C1 | `numbers` 61 to 100 (`num-`, `num-movein-`, `num-herd-`), R37 | 2,300 |
| 6 | C1, after L-C1 and L-C2 | `phrases-meadow`, `phrases-notes`, `phrases-salon` | 2,000 |
| 11 | C3 | Wave C lines (`heartbeat`, `places`, `area-*`) | 1,000 |
| 13 | C3 | `names-t1` top-up, last run | what is left above the floor |
| | | retries after speech-to-text | about 1,000 |
| | | **Total before run 13** | **about 23,860** |

Run 1b depends on PL-A16 (batch A4) and holds goal lines, so go-live checks its clips (R51). If a run costs more than planned, the cut falls on run 13, then run 12 from the top (100 down, listed for Tjitse at Gate C), then run 6, never on runs 0 to 7.

**Art runs** (`npm run art -- <command>`, Codex outside the sandbox, at most 4 at once, `art-gen` only): calibration (AR-A3), seed word sheets of 4 x 4 objects with wide gutters (about 18 sheets for the 273 seed words), the top-up from learning's `pictures-needed.json` (about 13 more sheets for about 200 words, R62), unicorn sprites (9 breeds x 2 stages), items and backgrounds per wave. Emma-first order: unicorn sprites and Lumi, nest, egg and bell items, the R19 and S10 plural words, then the rest. Every cut picture gets an agent verdict before it reaches the manifest (art Review Focus 1). About 95 Codex runs in total. When the subscription's usage limit stops a run, `art-gen` waits at most 60 minutes per stop; after that the remaining items and backgrounds take their SVG fallbacks and the words stay hidden by the planner.

---

## 4. Integration tasks

These tasks are owned by no stream plan. The `integration` lane builds them.

### Task I-1: Store, actions router, world view and test hook handlers

**Files:**
- Create: `G/src/game/world-view.ts`, `G/src/core/actions.ts`, `G/src/game/game-actions.ts`, `G/src/game.svelte.ts`, `G/src/game/hook-handlers.ts`, `G/src/scenes/Rest.svelte`, `G/tests/integration/ctx.ts`
- Modify: `G/src/main.ts` (one line: the static store import, R60)
- Test: `G/tests/integration/world-view.test.ts`, `G/tests/integration/actions.test.ts`, `G/tests/integration/contracts.test.ts`, `G/tests/integration/plan-context.test.ts`

**Interfaces:**
- Consumes: `openGameData`, `attachLifecycle`, `GameData` (core A9); `createGameFolder`, `CoreState` (core A7); `rowCount`, `stallOf`, `campBabies`, `babiesInOrder` (core A7); `validateEvent` (core A3); `claimTab`, `requestPersist`, `readV2Local` (core A10); `content`, `CONTENT_HASH` (learning A10); `createLearnerSlice`, `pendingLearnFacts`, `setCurrentOverride` (learning A15); `createPlacesSlice` (places A1), `titlesToGive`, `momentPinsDue` (places, `[]` until B2 and C5 land), `applyPlaceAction`, `PLACE_SAMPLE_ACTIONS` (places A1); `applyHeartbeat`, `applyNaming` and their sample actions (heartbeat Task 15, batch A3); `nextItem`, `foldLearner` (learning A15, A17); types from `src/types/contracts.ts` (R41); `audio` (audio A8); `hasPicture` (art A6); `router`, `setStartHandler` (platform A9); `registerHook`, `registerState`, `sceneHook` (platform A4, A10); `clock` (platform A4).
- Produces: `game` (contracts C7), `ready()`, `beginVisit()`, `wakeVisit()`, `worldView(state, deps): World`, `apply(action, ctx): GameEventDraft[]`, `finishDraft`, `GAME_SAMPLE_ACTIONS`, the `rest` scene, the hook handlers of contracts C10 (the `activeMoment` fallback of `answer`, `wrong`, `idle` comes in I-3b, because `src/ui/moment.ts` lands in the same batch).

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

  it('parent-corner settings with the contract keys reach world.settings (R39)', () => {
    const s = stateOf([
      { type: 'settings.set', key: 'skip-wish-after-three', value: true },
      { type: 'settings.set', key: 'parent-pin', value: '1357' },
      { type: 'settings.set', key: 'birthday', value: '05-14' },
    ]);
    expect(worldView(s, deps).settings).toEqual({ skipWishAfterThree: true, parentPin: '1357', birthday: '05-14' });
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
import { slugName } from '../core/keys.ts';
import type { BreedId, World, WorldBaby } from '../types/contracts.ts';

export type { World, WorldBaby };
export type FullState = CoreState & { learner: Learner; places: PlacesState };
export type ViewDeps = { hasName(name: string): boolean; firstSound(name: string, gems: readonly string[]): string | null };

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
Expected: PASS, 4 tests.

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
  it('the parent corner writes the contract setting keys (R39)', async () => {
    const { applyPlaceAction } = await import('../../src/core/places/actions.ts');
    const { fullCtx } = await import('./ctx.ts');
    expect(applyPlaceAction({ type: 'place/setting', key: 'skip-wish-after-three', value: true } as never, fullCtx()))
      .toEqual([{ type: 'settings.set', key: 'skip-wish-after-three', value: true }]);
  });
});
```

`G/tests/integration/ctx.ts` (a real `ActionCtx`, so a translator that reads `ctx.state`, `ctx.content`, `ctx.now` or `world.byId` is tested against real data):

```ts
import { createGameFolder } from '../../src/core/world/index.ts';
import { createLearnerSlice } from '../../src/core/learning/index.ts';
import { createPlacesSlice } from '../../src/core/places/index.ts';
import { content } from '../../src/core/content/static.ts';
import { worldView } from '../../src/game/world-view.ts';
import { fakeDevice, hatch, named } from '../helpers/events.ts';
import type { ActionCtx } from '../../src/types/contracts.ts';

/** A folded log with two named babies, its world view and the real content. */
export function fullCtx(): ActionCtx {
  const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
  const d = fakeDevice('aaaaaaaa');
  d.add([{ type: 'visit.start', visit: 'v1', tz: 120 }, hatch('b1'), named('b1', 'Pip'), hatch('b2'), named('b2', 'Tam')], 1_000);
  const state = folder.full(d.events).state as never;
  const world = worldView(state, { hasName: () => true, firstSound: (n) => n[0].toLowerCase() }, 'v1');
  return { visit: 'v1', now: 2_000, state, world, content, heartedThisVisit: () => false } as never;
}
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
import { GAME_SAMPLE_ACTIONS, applyGame } from '../../src/game/game-actions.ts';
import { fullCtx } from './ctx.ts';

let seq = 0;
const stampOne = (d: Record<string, unknown>) => ({ id: `abcdefgh:${++seq}`, hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...d });

describe('every translator emits valid events', () => {
  const ctx = fullCtx();
  const cases: [string, unknown[], (a: never) => unknown[]][] = [
    ['heartbeat', HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat as never],
    ['naming', NAMING_SAMPLE_ACTIONS, applyNaming as never],
    ['places', PLACE_SAMPLE_ACTIONS, ((a: never) => applyPlaceAction(a, ctx)) as never],
    ['game', GAME_SAMPLE_ACTIONS, ((a: never) => applyGame(a, ctx)) as never],
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

Each translator module exports a `*_SAMPLE_ACTIONS` list with one action per action type it handles (heartbeat Task 15 and places Task A1 add it, and each runs the same check inside its own lane first; see their validation blocks). The sample lists must include `place/idle` with `level`, `place/favourite`, `place/learn`, `hb.decor` and `hb.learn`; the two learn samples carry a literal payload in the shape `learnResultPayload` returns (contracts C6), because H-15 and L-A19 share batch A3.

`G/tests/integration/plan-context.test.ts` (master Review Focus 3):

```ts
import { describe, expect, it } from 'vitest';
import { nextItem } from '../../src/core/planner/index.ts';
import { foldLearner } from '../../src/core/learning/index.ts';
import { content } from '../../src/core/content/static.ts';
import { mulberry32 } from '../../src/core/rng.ts';
import type { PlanContext, Pick } from '../../src/types/contracts.ts';

const learner = foldLearner([], content);
const wordOf = (p: Pick | null) => (p && (p.carrier.kind === 'word' || p.carrier.kind === 'plural') ? p.carrier.word : null);
const ctxWith = (noClip: Set<string>, noPic: Set<string>): PlanContext => ({
  c: content, l: learner, now: 1_760_000_000_000,
  assets: { clip: (id) => !noClip.has(id), picture: (id) => !noPic.has(id) },
});
const req = { strand: 'r' as const, moments: ['wish' as const], place: 'wish' };

describe('planContext hides ok:false clips and missing pictures', () => {
  it('never serves a word whose clip is ok:false or whose picture is missing', () => {
    const served = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const w = wordOf(nextItem(ctxWith(new Set(), new Set()), req, mulberry32(seed)));
      if (w) served.add(w);
    }
    const [a, b] = [...served];
    expect(a && b, 'the planner serves at least two wish words').toBeTruthy();
    const noClip = new Set([content.words[a].clip]);
    const noPic = new Set([content.words[b].pic as string]);
    for (let seed = 1; seed <= 200; seed++) {
      const w = wordOf(nextItem(ctxWith(noClip, noPic), req, mulberry32(seed)));
      expect(w).not.toBe(a);
      expect(w).not.toBe(b);
    }
  });
  it('hasPicture is false, not an error, for an id the manifest lacks (R49)', async () => {
    const { hasPicture } = await import('../../src/art/manifest.ts');
    expect(hasPicture('no-such-picture')).toBe(false);
  });
});
```

The store builds `assets` from `audio.hasClip` (false for an `ok: false` clip, audio A8) and `hasPicture` (art A6), so these two tests cover the runtime path.

- [ ] **Step 6: Run them and see them fail**

Run: `npx vitest run tests/integration/actions.test.ts tests/integration/contracts.test.ts tests/integration/plan-context.test.ts`
Expected: FAIL, cannot resolve `../../src/core/actions.ts` (the plan-context test may already pass; it pins learning's behaviour).

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

/** One sample per action type, for the contract test. */
export const GAME_SAMPLE_ACTIONS: Action[] = [
  { type: 'game/visit-start', visit: 'v2', tz: 120 }, { type: 'game/visit-end', reason: 'goodnight' },
  { type: 'game/enter', place: 'nest' }, { type: 'game/leave', place: 'nest' },
  { type: 'game/setting', key: 'skip-wish-after-three', value: true },
  { type: 'game/override', payload: { op: 'profile', profile: 'fresh' } },
  { type: 'game/pass', strand: 'r', step: 'R13' }, { type: 'game/exclude', device: 'bbbbbbbb', on: true },
  { type: 'game/audio-missing', clip: 'word-hat' }, { type: 'game/announce', opening: 'bath-pond' },
  { type: 'game/clip-heard', baby: 'b1' },
];

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

Run: `npx vitest run tests/integration/actions.test.ts tests/integration/contracts.test.ts tests/integration/plan-context.test.ts`
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
import type { PlanContext, StepId } from './types/contracts.ts';
import { audio } from './audio/index.ts';
import { hasPicture } from './art/manifest.ts';
import { clock } from './platform/clock.ts';
import { router } from './platform/router.svelte.ts';
import { setStartHandler } from './platform/boot.svelte.ts';
import { watchLifecycle } from './platform/lifecycle.ts';
import { uuid4 } from './core/ids.ts';
import { mulberry32 } from './core/rng.ts';
import type { Rng } from './core/rng.ts';
import { chooseStart } from './game/start.ts';
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
let testScaffold: Partial<Record<StepId, 1 | 2 | 3>> | undefined;   // R59, test builds only
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

async function openStore(): Promise<void> {
  data = await openGameData<FullState>({ folder: folder as never, contentHash: CONTENT_HASH, codeVersion: __BUILD_ID__, reconcile: reconcile as never, now: () => clock.now() });
  data.subscribe(() => refresh());
  claimTab(() => { storeStatus.lostTab = true; });
  attachLifecycle(data);
  audio.onMissing((clip) => { if (visit) game.dispatch({ type: 'game/audio-missing', clip }); });
  router.onChange((from, to) => {
    if (!visit) return;
    if (from) game.dispatch({ type: 'game/leave', place: from.id });
    game.dispatch({ type: 'game/enter', place: to.id });
  });
  watchLifecycle({ onVisitTimeout: () => game.endVisit('idle') });
  refresh();
}

let opening: Promise<void> | null = null;
/** R44: opening starts at module load; the start handler and every store hook await it. */
export function ready(): Promise<void> {
  return (opening ??= openStore());
}

export function beginVisit(): void {
  visit = `v-${uuid4().slice(0, 8)}`;
  caredThisVisit.clear();
  game.dispatch({ type: 'game/visit-start', visit, tz: -new Date(clock.now()).getTimezoneOffset() });
}

/** R45: the rest scene's moon (and the newVisit hook) start the next visit without a reload. */
export async function wakeVisit(): Promise<void> {
  void audio.unlock();   // first, inside the tap's call stack: iOS unlocks audio only during the gesture
  await ready();
  if (!visit) beginVisit();
  const next = await chooseStart(game);
  await router.reset(next.id, next.params);
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
  ready,
  now: () => clock.now(),
  dispatch(action: Action): GameEvent[] {
    if (!data || !state || !world) throw new Error('store not open: await ready() first');
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
      ...(__TEST_BUILD__ && testScaffold ? { testScaffold } : {}),
    };
  },
  /** R45: writes visit.end and rests on the night meadow; the moon there starts the next visit. */
  endVisit(reason: 'goodnight' | 'idle' | 'hidden'): void {
    if (!visit) return;
    game.dispatch({ type: 'game/visit-end', reason });
    visit = null;
    void data?.flush();
    void router.reset('rest');
  },
  /** After a sync or an import refolds everything. */
  markRefolded(): void { refoldedAt = clock.now(); refresh(); },
};

setStartHandler(async () => {
  await ready();
  beginVisit();
  return chooseStart(game);
});

void ready();

// Test builds only. A dynamic import behind a compile-time constant: production builds drop the hook code entirely.
if (__TEST_BUILD__) {
  void import('./game/hook-handlers.ts').then((m) => m.registerGameHooks(game, {
    seed: (n) => { rng = mulberry32(n); },
    ready,
    wake: wakeVisit,
    setScaffold: (step, level) => { testScaffold = { ...testScaffold, [step]: level }; },
  }));
}
```

There is no static import of `hook-handlers.ts`: the hook code, the fixtures path and the learning override stay out of the production build.

`chooseStart` is Task I-2.

Until I-2 lands (batch A6), write `G/src/game/start.ts` as `export async function chooseStart(_g: unknown) { return { id: 'nest' }; }` in this task, so heartbeat's flows in batch A5 start at the nest.

- [ ] **Step 10: Write the hook handlers**

`G/src/game/hook-handlers.ts`:

```ts
// window.__game handlers owned by the store (contracts C10). Test builds only.
// said() and audioMissing() are platform's synchronous methods (P-A10); they are not registered here.
import { registerHook, registerState, sceneHook } from '../platform/hooks.ts';
import { clock } from '../platform/clock.ts';
import { isPlacing, setCurrentOverride } from '../core/learning/index.ts';
import type { game as Game } from '../game.svelte.ts';

type G = typeof Game;
type Opts = {
  seed(n: number): void; ready(): Promise<void>; wake(): Promise<void>;
  setScaffold(step: string, level: 1 | 2 | 3): void;
};
const TEST_NAMES = ['Tam', 'Pip', 'Dot', 'Fen', 'Bex', 'Sam', 'Mia', 'Max', 'Kit', 'Lin'];

export function registerGameHooks(game: G, o: Opts): void {
  /** R44: every handler that touches the store waits for it, so flows may call hooks before Play. */
  const after = <A extends unknown[]>(fn: (...a: A) => unknown) => async (...a: A) => { await o.ready(); return fn(...a); };
  registerState('herd', () => game.world?.herd.length ?? 0);
  registerState('lastLog', () => {
    const all = (game.data?.allEvents() ?? []) as { type: string }[];
    for (let i = all.length - 1; i >= 0; i--) if (all[i].type === 'learn.result') return all[i];
    return null;
  });
  registerState('placement', () => (game.world ? { r: isPlacing(game.learner, 'r'), s: isPlacing(game.learner, 's'), m: isPlacing(game.learner, 'm') } : null));
  registerHook('seed', (n: number) => o.seed(n));
  registerHook('setStep', after((strand: 'r' | 's' | 'm', step: string) =>
    game.dispatch({ type: 'game/override', payload: setCurrentOverride(game.learner, game.content, strand, step) })));
  registerHook('setScaffold', (_strand: 'r' | 's' | 'm', step: string, level: 1 | 2 | 3) => o.setScaffold(step, level));
  registerHook('pass', after((strand: 'r' | 's' | 'm', step: string) => game.dispatch({ type: 'game/pass', strand, step })));
  registerHook('announce', after((opening: string) => game.dispatch({ type: 'game/announce', opening })));
  const route = (name: 'answer' | 'wrong' | 'idle' | 'target') => async (...args: unknown[]) => {
    await o.ready();
    const h = sceneHook(game.scene);
    if (h && typeof h[name] === 'function') return h[name](...args);
    throw new Error(`no scene hook ${name} in scene ${game.scene}`);   // I-3b adds the activeMoment() fallback
  };
  registerHook('answer', route('answer'));
  registerHook('wrong', route('wrong'));     // wrong(kind?): 'one-for-many', 'many-for-one', 'count-low', 'count-high', 'ending', ...
  registerHook('idle', route('idle'));
  registerHook('target', route('target'));   // aria-label of the right answer, for real taps in flows
  // Platform's importFixture loads tests/fixtures/<name>.json and calls this handler with (data, name).
  registerHook('importFixture', after(async (data: unknown) => {
    const { v2Deps } = await import('./v2-deps.ts');
    const out = await (game.data as never as { importText(t: string, d: unknown): Promise<unknown> }).importText(JSON.stringify(data), v2Deps);
    game.markRefolded();
    return out;
  }));
  registerHook('herd', after(async (n: number) => {
    for (let i = 0; i < n; i++) {
      const baby = `t${Date.now().toString(36)}${i}`;
      game.dispatch({ type: 'hb.test-hatch', baby, name: TEST_NAMES[i % TEST_NAMES.length] });
    }
  }));
  /** visit.end, clock +6 h, then the next visit starts as the rest scene's moon would start it. */
  registerHook('newVisit', after(async () => {
    game.endVisit('goodnight');
    clock.advance(6 * 3_600_000);
    await o.wake();
  }));
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

`G/src/scenes/Rest.svelte` (R45, scene id `rest`, added to `SCENE_IDS`):

```svelte
<script lang="ts">
  // The end of every visit (goodnight, idle, hidden): a night meadow with one moon. A tap starts the next visit.
  import { onMount } from 'svelte';
  import Picture from '../art/Picture.svelte';
  import { press } from '../platform/input.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { wakeVisit } from '../game.svelte.ts';
  let { params }: { params: Record<string, unknown> } = $props();
  let busy = false;
  async function wake() {
    if (busy) return;
    busy = true;
    await wakeVisit();
  }
  onMount(() => {
    setBands('#1d1b4f', '#2d3a6e');
    return registerSceneHook('rest', { answer: () => wake(), wrong: () => {}, target: () => 'moon' });
  });
</script>

<div class="rest" aria-label="night meadow">
  <button class="moon" aria-label="moon" use:press={() => void wake()}><Picture id="item-moon" size={240} label="moon" /></button>
</div>

<style>
  .rest { position: absolute; inset: 0; background: linear-gradient(#1d1b4f, #2d3a6e 70%, #3d5a4e); }
  .moon { position: absolute; left: 470px; top: 220px; width: 240px; height: 240px; border: 0; background: none; animation: glow 2.4s ease-in-out infinite; }
  @keyframes glow { 50% { transform: scale(1.06); } }
</style>
```

`item-moon` goes into `art-src/lists/requests.txt` (`item-moon | ui | a big friendly crescent moon, pale yellow`); until art draws it, `Picture` shows its fallback. The rest scene has no spoken goal on purpose (it is bedtime); autoplay lists it in `SILENT_OK`.

- [ ] **Step 11: Switch `main.ts` to the store** (R60, the integrator owns this one line)

In `G/src/main.ts`, replace the eager glob that loads `./game.svelte.ts` with a static `import './game.svelte.ts';` right after `import './polyfills.ts';`.

- [ ] **Step 12: Check and commit**

Run: `npx vitest run tests/integration && npm run check`
Expected: PASS, no type errors in `src/game*`.

```bash
git add games/moon-meadow-home/src/game.svelte.ts games/moon-meadow-home/src/game games/moon-meadow-home/src/core/actions.ts games/moon-meadow-home/src/scenes/Rest.svelte games/moon-meadow-home/src/main.ts games/moon-meadow-home/tests/integration
git commit -m "Add the game store, the actions router and the world view"
```

### Task I-2: Welcome, Moving Day and the start rule (batch A6)

**Files:**
- Create: `G/src/scenes/Welcome.svelte`, `G/src/scenes/MovingDay.svelte`, `G/flows/integration/moving-day.flow.sh`, `G/flows/integration/new-player.flow.sh`, `G/tests/integration/grow-v2.ts`
- Modify: `G/src/game/start.ts`
- Test: `G/tests/integration/start.test.ts`, `G/tests/integration/import-45.test.ts`

**Interfaces:**
- Consumes: `game`, `ready`, `wakeVisit` (I-1), `readV2Local`, `mapV2`, `makeV2Save`, `fakeDevice` (core A6, A10, test helpers), `v2Deps` (I-1), `heartbeat.start` (heartbeat Task 23), `createMoment` (places A3), `openingDue`, `openingCtx` (places A6), `PinGate` (places A15), `Unicorn`, `Lumi` (art A9), `audio`, `numId` (audio A4), `ghost`, `moonbeam` (platform A11), `press` (platform A9).
- Produces: `decideStart(facts)`, `chooseStart(game): Promise<StartTarget>`; scenes `welcome` and `moving-day`.

- [ ] **Step 1: Write the failing tests**

`G/tests/integration/start.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decideStart, startFacts } from '../../src/game/start.ts';

const ev = (type: string, extra: Record<string, unknown> = {}) => ({ type, ...extra });

describe('decideStart (core K7, R46)', () => {
  it('a player who has hatched or learned goes to the meadow', () => {
    expect(decideStart({ played: true, imported: false, v2: null, movingDayDone: false })).toEqual({ id: 'meadow' });
  });
  it('a start with a v2 save on this origin and no play goes to the import', () => {
    expect(decideStart({ played: false, imported: false, v2: '{"herd":[]}', movingDayDone: false })).toEqual({ id: 'import-v2' });
  });
  it('a start without a v2 save and without play is a new player, also after a reload during the welcome', () => {
    expect(decideStart({ played: false, imported: false, v2: null, movingDayDone: false })).toEqual({ id: 'welcome' });
  });
  it('an imported herd that never had Moving Day plays it', () => {
    expect(decideStart({ played: true, imported: true, v2: null, movingDayDone: false })).toEqual({ id: 'moving-day' });
  });
});

describe('startFacts', () => {
  it('only egg.hatched, import.v2 and learn.result count as play', () => {
    const f = startFacts([ev('visit.start'), ev('place.enter'), ev('audio.missing'), ev('opening.announced', { opening: 'welcome' }), ev('visit.end')]);
    expect(f).toEqual({ played: false, imported: false, nonV2Hatch: false });
  });
  it('a v2 import is play but not a non-v2 hatch, so a later v2 read is still skipped only by import.v2', () => {
    expect(startFacts([ev('import.v2'), ev('egg.hatched', { source: 'nest' })])).toEqual({ played: true, imported: true, nonV2Hatch: true });
  });
});
```

`G/tests/integration/import-45.test.ts` (master Review Focus 2):

```ts
import { describe, expect, it } from 'vitest';
import { createGameFolder } from '../../src/core/world/index.ts';
import { createLearnerSlice } from '../../src/core/learning/index.ts';
import { createPlacesSlice, openingDue, openingCtx } from '../../src/core/places/index.ts';
import { mapV2 } from '../../src/core/save/v2.ts';
import { content } from '../../src/core/content/static.ts';
import { worldView } from '../../src/game/world-view.ts';
import { v2Deps } from '../../src/game/v2-deps.ts';
import { fakeDevice } from '../helpers/events.ts';
import { growV2Save } from './grow-v2.ts';

describe('an imported herd of 45', () => {
  const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
  const d = fakeDevice('aaaaaaaa');
  d.add([{ type: 'visit.start', visit: 'v1', tz: 120 }, mapV2(growV2Save(45) as never, v2Deps)], 1_000);

  it('has 5 rows, an empty camp and a door for everyone', () => {
    const s = folder.full(d.events).state as never;
    const w = worldView(s, { hasName: () => true, firstSound: () => null }, 'v1');
    expect(w.herd).toHaveLength(45);
    expect(w.rowsBuilt).toBe(5);
    expect(w.camp).toEqual([]);
    expect(w.herd.every((b) => b.door !== null)).toBe(true);
  });

  it('announces at most one queue opening per visit over six visits', () => {
    for (let v = 2; v <= 7; v++) {
      d.add([{ type: 'visit.start', visit: `v${v}`, tz: 120 }], 1_000 + v * 86_400_000);
      const s = folder.full(d.events).state as { places: never; learner: never };
      const due = openingDue(openingCtx(s.places, s.learner, { postBuilt: false, villageStoneLit: false, freshJewelWaiting: false, release: '1.0' }));
      if (due) d.add([{ type: 'opening.announced', opening: due }], 1_000 + v * 86_400_000 + 1);
      const announced = d.events.filter((e) => e.type === 'opening.announced' && (e as { opening: string }).opening === due);
      expect(announced.length).toBeLessThanOrEqual(1);
    }
  });
});
```

`G/tests/integration/grow-v2.ts` clones the first baby of core's `makeV2Save()` fixture `n` times with fresh ids and names `Baby1` to `Baby45`, keeping every other field of the fixture's baby shape. `openingCtx` takes places' `LearnerView`; pass `toLearnerView` from `src/places/serve.ts` when the raw learner does not fit.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/integration/start.test.ts tests/integration/import-45.test.ts`
Expected: FAIL, `decideStart` and `startFacts` are not exported (the import test may already pass on core's and places' logic; it pins them).

- [ ] **Step 3: Implement the start rule**

`G/src/game/start.ts`:

```ts
// Chooses the first scene of a visit (spec 2.9, core K7, R46): Moving Day, a new player's welcome, or the meadow.
import { readV2Local } from '../save/v2-local.ts';
import { v2Deps } from './v2-deps.ts';

type Ev = { type: string; source?: string };
export type StartFacts = { played: boolean; imported: boolean; v2: string | null; movingDayDone: boolean };

/** Only a hatch, an import or a learning result is play. place.enter, announcements and missing clips are not. */
export function startFacts(events: readonly Ev[]): { played: boolean; imported: boolean; nonV2Hatch: boolean } {
  const imported = events.some((e) => e.type === 'import.v2');
  const nonV2Hatch = events.some((e) => e.type === 'egg.hatched' && e.source !== 'v2');
  const played = imported || nonV2Hatch || events.some((e) => e.type === 'learn.result');
  return { played, imported, nonV2Hatch };
}

export function decideStart(f: StartFacts): { id: string } {
  if (f.imported && !f.movingDayDone) return { id: 'moving-day' };
  if (!f.imported && f.v2) return { id: 'import-v2' };
  return f.played ? { id: 'meadow' } : { id: 'welcome' };
}

type StoreLike = { data: unknown; world: { announced: ReadonlySet<string> }; markRefolded(): void };

export async function chooseStart(game: StoreLike): Promise<{ id: string; params?: Record<string, unknown> }> {
  const data = game.data as { allEvents(): Ev[]; importText(t: string, d: unknown): Promise<{ kind: string; status?: string }> };
  const f = startFacts(data.allEvents());
  // K7: try her v2 save on every start while there is no import and no hatch that did not come from v2.
  const v2 = !f.imported && !f.nonV2Hatch ? readV2Local() : null;
  const next = decideStart({ played: f.played, imported: f.imported, v2, movingDayDone: game.world.announced.has('moving-day') });
  if (next.id !== 'import-v2') return next;
  const out = await data.importText(v2 as string, v2Deps);
  game.markRefolded();
  return out.kind === 'v2' && out.status === 'imported' ? { id: 'moving-day' } : { id: f.played ? 'meadow' : 'welcome' };
}
```

Moving Day records itself with `opening.announced` `moving-day` at its end, so it plays once (a recorded fact). A failed import falls back to the welcome or the meadow, and the parent corner's "import v2 from this browser again" (places A15) retries it.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run tests/integration/start.test.ts tests/integration/import-45.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the scenes**

`G/src/scenes/Welcome.svelte` (new player, spec 2.9; restore before a fresh start, spec 4.7, R56):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Lumi from '../art/Lumi.svelte';
  import Picture from '../art/Picture.svelte';
  import PinGate from '../parent/PinGate.svelte';
  import { audio } from '../audio/index.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { game } from '../game.svelte.ts';
  let { params }: { params: Record<string, unknown> } = $props();
  let talking = $state(false);
  let crown = $state(false);
  let parentOpen = $state(false);
  /** The first egg waits while the parent corner is open, so a restore can come before visit 1 is played. */
  const parentClosed = () => new Promise<void>((r) => { const t = setInterval(() => { if (!parentOpen) { clearInterval(t); r(); } }, 200); });
  onMount(() => {
    setBands('#cfe8ff', '#bfe3a8');
    const off = audio.onTalk((id) => (talking = !!id && id.startsWith('lumi-')));
    (async () => {
      await audio.preloadScene('start');
      await audio.speak('lumi-hello', 'lumi-meadow-yours');
      crown = true;
      await audio.speak('lumi-crown');
      await parentClosed();
      if (game.scene !== 'welcome') return;          // a restore moved her on
      game.dispatch({ type: 'game/announce', opening: 'welcome' });
      await heartbeat.start();
    })();
    return () => { off(); audio.release('start'); };
  });
</script>

<div class="welcome" aria-label="welcome">
  <PinGate onopen={() => (parentOpen = true)} onclose={() => (parentOpen = false)} />
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

`PinGate` takes optional `onopen` and `onclose` callbacks (places A15). After a restore in the parent corner, places calls `wakeVisit()`, which runs `chooseStart` on the restored log and leaves the welcome.

`G/src/scenes/MovingDay.svelte` (spec 2.9 session 1, R55):

```svelte
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import Lumi from '../art/Lumi.svelte';
  import PinGate from '../parent/PinGate.svelte';
  import { audio, numId } from '../audio/index.ts';
  import { press } from '../platform/input.ts';
  import { setBands } from '../platform/stage.svelte.ts';
  import { sleep } from '../platform/timing.ts';
  import { createMoment } from '../ui/moment.ts';
  import { game } from '../game.svelte.ts';
  import { registerSceneHook } from '../platform/hooks.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  let { params }: { params: Record<string, unknown> } = $props();
  const MAX_ON_STAGE = 12;                       // an older iPad draws at most 12 walking sprites at once
  const movers = game.world.herd.filter((b) => b.source === 'v2');
  let onStage = $state<typeof movers>([]);
  let housed = $state(0);                        // shown as a counted stall picture
  let waitingDoor = $state(false);
  let done = $state(false);
  let talking = $state(false);
  let doorFour: () => void = () => {};

  async function cross(b: (typeof movers)[number]) {
    onStage = [...onStage, b].slice(-MAX_ON_STAGE);
    if (b.name) {
      const played = await audio.sayName(b.listName ?? b.name, '!');
      if (!played) await audio.speak('fb-lovely');          // heartbeat's kind line for a name without a clip
    }
    await sleep(250);
    onStage = onStage.filter((x) => x.id !== b.id);
    housed++;
  }

  async function run() {
    await audio.preloadScene('moving-day');
    await audio.speak('lumi-moving', 'g-here-they-come');
    for (const b of movers) await cross(b);
    for (const k of [1, 2, 3]) if (movers.length >= k) await audio.speak(numId('n', k));
    if (movers.length >= 4) {
      waitingDoor = true;
      await tick();                                       // the door exists before the moment looks for it
      const door = document.querySelector('[aria-label="door 4"]') as HTMLElement;
      const m = createMoment({ goal: [numId('tap-door', 4)], target: () => door, place: 'moving-day' });
      await m.start();                                    // idle repeat of the goal, then the ghost hand (places A3)
      await new Promise<void>((r) => (doorFour = () => { m.answer(); r(); }));
      m.dispose();
      waitingDoor = false;
    }
    if (movers.some((b) => b.sash.length > 0)) await audio.speak('g-pins-came');
    game.dispatch({ type: 'game/announce', opening: 'moving-day' });
    done = true;
    await heartbeat.start();                              // names the first unnamed v2 baby, one per heartbeat (R55)
  }

  onMount(() => {
    setBands('#cfe8ff', '#bfe3a8');
    const off = audio.onTalk((id) => (talking = !!id && id.startsWith('lumi-')));
    const unhook = registerSceneHook('moving-day', { answer: () => doorFour(), wrong: () => {}, target: () => (waitingDoor ? 'door 4' : null) });
    void run();
    return () => { off(); unhook(); audio.release('moving-day'); };
  });
</script>

<div class="moving" aria-label="moving day">
  <PinGate />
  <div class="lumi"><Lumi size={200} {talking} label="Queen Lumi" /></div>
  <div class="bridge" aria-hidden="true"></div>
  {#each onStage as b, i (b.id)}
    <div class="mover" style:transform={`translate(${120 + i * 80}px, 420px)`}>
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={90} pose="walk" label={b.name ?? 'baby'} />
    </div>
  {/each}
  <div class="stalls" aria-label={`${housed} moved in`}>{housed}</div>
  {#if waitingDoor}
    <button class="door" aria-label="door 4" use:press={() => doorFour()}>4</button>
  {/if}
  {#if done}<p class="sr" aria-live="polite">moved in</p>{/if}
</div>

<style>
  .moving { position: absolute; inset: 0; background: linear-gradient(#2d2a6e, #6b5fb5 60%, #bfe3a8); }
  .lumi { position: absolute; right: 60px; top: 30px; }
  .bridge { position: absolute; left: 0; right: 0; top: 380px; height: 40px; background: linear-gradient(90deg, #fff7c2, #ffe08a); opacity: 0.8; border-radius: 20px; }
  .mover { position: absolute; left: 0; top: 0; transition: transform 600ms, opacity 400ms; }
  .stalls { position: absolute; left: 40px; top: 640px; width: 140px; height: 120px; border-radius: 16px; background: #fff3d6; font: 700 48px Andika, sans-serif; display: grid; place-items: center; }
  .door { position: absolute; left: 980px; top: 600px; width: 120px; height: 160px; font: 700 48px Andika, sans-serif; border-radius: 16px; background: #fff3d6; }
  .sr { position: absolute; left: -9999px; }
</style>
```

`createMoment`'s option names follow places A3; adapt the call to that signature, keeping the behaviour (spoken goal, idle repeat, ghost hand on the target, `answer()` on the tap). The stall counter shows a picture with the number; it is not read aloud.

- [ ] **Step 6: Write the flows**

`G/flows/integration/moving-day.flow.sh`:

```bash
#!/usr/bin/env bash
# Moving Day from the v2 fixture: every v2 baby crosses, door four is tapped for real, the nest follows.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'importFixture("v2-save")' >/dev/null      # the store opens at module load (R44), so this works before Play
start_play
wait_for '() => window.__game.state().scene === "moving-day"'
wait_for '() => !!document.querySelector("[aria-label=\"door 4\"]")'
tap 'door 4'
wait_for '() => ["nest", "naming"].includes(window.__game.state().scene)'
[ "$(state herd)" -ge 4 ] || fail "herd too small"
expect_eq "$(val '() => window.__game.said().includes("num-tap-door-4")')" 'true' 'door goal spoken'
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
expect_eq "$(val '() => !!document.querySelector("[aria-label=\"parent\"]")')" 'false' 'parent button only on the welcome'
shot new-player
finish
```

`open_app`, `start_play`, `hook`, `state`, `tap` (mousemove, mousedown, mouseup on an `aria-label`), `wait_for` (takes a page function), `val` (takes a page function, may be async), `expect_eq`, `fail`, `shot` and `finish` are platform's `flows/lib.sh` helpers (Task A10). `open_app` opens a new `playwright-cli` session, which starts with empty storage, and turns fast mode on.

- [ ] **Step 7: Run and commit**

Run: `npx vitest run tests/integration`, then outside the sandbox from the repo root of the worktree: `MMH_LANE=integration MMH_PORT=8766 bash games/moon-meadow-home/flows/run.sh integration/moving-day integration/new-player`
Expected: PASS at 1180 x 820, 1080 x 810 and 1024 x 768, `audioMissing` empty, no console errors.

```bash
git add games/moon-meadow-home/src/scenes/Welcome.svelte games/moon-meadow-home/src/scenes/MovingDay.svelte games/moon-meadow-home/src/game/start.ts games/moon-meadow-home/flows/integration games/moon-meadow-home/tests/integration
git commit -m "Add the welcome, Moving Day and the start of each visit"
```

### Task I-3a: Autoplay logic, gate, promote and go-live scripts (batch A5)

**Files:**
- Create: `G/src/game/autoplay.ts`, `G/tools/gate.sh`, `G/tools/promote.sh`, `G/tools/go-live.sh`
- Test: `G/tests/integration/autoplay.test.ts`

**Interfaces:**
- Consumes: nothing from lanes of this batch. `autoplay` takes its dependencies as arguments; I-3b wires them.
- Produces: `autoplay(deps, o): Promise<AutoplayLog>`, `judgeLog(log, hasClip)`, `SILENT_OK`; `tools/gate.sh A|B|C`, `tools/promote.sh`, `tools/go-live.sh`.

- [ ] **Step 1: Write the failing test**

`G/tests/integration/autoplay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { judgeLog } from '../../src/game/autoplay.ts';

const all = () => true;

describe('judgeLog', () => {
  it('passes when every scene said a goal and nothing stuck', () => {
    expect(judgeLog({ scenes: [{ id: 'nest', said: ['g-egg'], ms: 900 }, { id: 'naming', said: ['g-bells'], ms: 700 }], stuck: null }, all)).toEqual([]);
  });
  it('names a silent scene and a stuck scene', () => {
    expect(judgeLog({ scenes: [{ id: 'wish', said: [], ms: 500 }], stuck: 'stalls' }, all)).toEqual(['wish has no spoken goal', 'stuck in stalls']);
  });
  it('counts a goal only when its clip exists (R52), and the meadow needs a goal too (R54)', () => {
    const log = { scenes: [{ id: 'nest', said: ['g-egg'], ms: 900 }, { id: 'meadow', said: [], ms: 400 }], stuck: null };
    expect(judgeLog(log, (id) => id !== 'g-egg')).toEqual(['nest has no spoken goal', 'meadow has no spoken goal']);
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
/** Scenes that speak through the scene before or after them. The meadow is not here: it has an arrival goal (R54). */
export const SILENT_OK = new Set(['hatch', 'stalls', 'rest']);

export function judgeLog(log: AutoplayLog, hasClip: (id: string) => boolean): string[] {
  const out = log.scenes
    .filter((s) => !SILENT_OK.has(s.id) && !s.said.some((id) => hasClip(id)))
    .map((s) => `${s.id} has no spoken goal`);
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
  if (lastScene) log.scenes.push({ id: lastScene, said: d.said().slice(saidAt), ms: d.now() - enteredAt });
  return log;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/integration/autoplay.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the gate, promote and go-live scripts**

`G/tools/gate.sh` (the gate owns its server; `run.sh` sees it up and reuses it):

```sh
#!/usr/bin/env bash
# Runs a wave gate (master plan section 5). Usage, from G, outside the sandbox: bash tools/gate.sh A|B|C
# Blocking checks stop the script. Warnings go to $TMPDIR/mmh-gate-<wave>-warnings.txt for the owning lanes.
set -euo pipefail
WAVE=${1:?wave A, B or C}
WARN="${TMPDIR:-/tmp}/mmh-gate-$WAVE-warnings.txt"; : > "$WARN"
warn() { echo "WARNING: $*" | tee -a "$WARN"; }
npm test
npm run check
npm run check:audio
npm run check:content -- --assets=warn          # ASSET_PIC and ASSET_CLIP are warnings in every gate (R62)
if [ "$WAVE" = A ]; then npm run simulate || warn "simulate pacing"; else npm run simulate; fi
npm run build:test -- --outDir dist-test-gate   # never dist/ or dist-emma/: Emma's build changes only through promote.sh
export MOON_DATA="${TMPDIR:-/tmp}/mmh-gate-data"; rm -rf "$MOON_DATA"   # never Emma's .data folder
MOON_DIST=dist-test-gate PORT=8766 HOST=127.0.0.1 node server/serve.ts > "${TMPDIR:-/tmp}/mmh-gate-serve.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
export MMH_PORT=8766 MMH_LANE=gate MMH_NO_BUILD=1 MMH_URL=http://127.0.0.1:8766/games/moon-meadow-home/
curl -fsS -o /dev/null --retry 30 --retry-delay 1 --retry-connrefused "$MMH_URL"
bash flows/run.sh $(grep -v '^#' "flows/gate-$WAVE.txt")
if [ -s "flows/gate-$WAVE-warn.txt" ]; then
  bash flows/run.sh $(grep -v '^#' "flows/gate-$WAVE-warn.txt") || warn "warning flows failed (names above)"
fi
bash flows/art-stress.sh || warn "art stress verdict"
echo "Gate $WAVE passed its blocking checks. Warnings: $(wc -l < "$WARN" | tr -d ' ') (in $WARN)"
```

`G/tools/promote.sh` (R47):

```sh
#!/usr/bin/env bash
# Builds the production app and promotes it to dist-emma. Older hashed files stay, so a tab that is open keeps working.
# Run only after a gate passed its blocking checks. From G: bash tools/promote.sh
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist-emma-next
npm run build -- --outDir dist-emma-next
mkdir -p dist-emma
rsync -a dist-emma-next/ dist-emma/   # no --delete
rm -rf dist-emma-next
echo "promoted $(git rev-parse --short HEAD) to dist-emma"
```

`G/tools/go-live.sh` (R47; run outside the sandbox from the repo root; also the restart command after a reboot):

```sh
#!/usr/bin/env bash
# Starts Emma's server on port 8765 for the home network and checks it from the LAN address and the .local name.
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"; cd "$REPO"
G=games/moon-meadow-home
[ -f "$G/dist-emma/index.html" ] || { echo "no dist-emma: run bash $G/tools/promote.sh first"; exit 1; }
for pid in $(lsof -ti tcp:8765 || true); do kill "$pid"; done   # python http.server or an older node
sleep 1
mkdir -p "$G/.data"
( MOON_DIST=dist-emma PORT=8765 HOST=0.0.0.0 nohup caffeinate -i node "$G/server/serve.ts" >> "$G/.data/serve.log" 2>&1 & )
sleep 2
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
LOCAL="$(scutil --get LocalHostName).local"
code() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
for base in "http://$IP:8765" "http://$LOCAL:8765"; do
  [ "$(code "$base/games/moon-meadow-home/")" = 200 ] || { echo "v3 is not served at $base"; exit 1; }
  [ "$(code "$base/ideas/opus-5-5-unicorn-egg-nest-v2/")" = 200 ] || { echo "v2 is not served at $base"; exit 1; }
  [ "$(code "$base/%2eenv")" = 404 ] || { echo "a dot file is served at $base"; exit 1; }
done
curl -sI "http://$IP:8765/games/moon-meadow-home" | grep -qi '^location:' || { echo "no trailing-slash redirect"; exit 1; }
lsof -nP -iTCP:8765 -sTCP:LISTEN | grep -q node || { echo "port 8765 is not node"; exit 1; }
echo "Emma plays at http://$LOCAL:8765/games/moon-meadow-home/ (or http://$IP:8765/games/moon-meadow-home/)"
```

`caffeinate -i` keeps the Mac from idle sleep while the server runs. The log is `G/.data/serve.log` (gitignored); core A11 writes the start line with both addresses and one line per request with the User-Agent, so the first iPad request shows its iOS version.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/game/autoplay.ts games/moon-meadow-home/tools/gate.sh games/moon-meadow-home/tools/promote.sh games/moon-meadow-home/tools/go-live.sh games/moon-meadow-home/tests/integration/autoplay.test.ts
git commit -m "Add the autoplay logic and the gate, promote and go-live scripts"
```

### Task I-3b: Hooks on the scenes, the Wave A flows and Gate A (batch A7)

**Files:**
- Create: `G/flows/integration/visit-5min.flow.sh`, `G/flows/integration/reload-naming.flow.sh`, `G/flows/integration/returning.flow.sh`, `G/flows/integration/rest.flow.sh`, `G/flows/integration/no-art-manifest.flow.sh`, `G/flows/integration/placement.flow.sh`, `G/flows/gate-A.txt`, `G/flows/gate-A-warn.txt`
- Modify: `G/src/game/hook-handlers.ts` (register `autoplay`; `activeMoment()` fallback for `answer`, `wrong`, `idle`, `target`)

**Interfaces:**
- Consumes: `autoplay`, `judgeLog` (I-3a), `heartbeat.start`, `heartbeat.startGoodnight` (heartbeat Task 23), `activeMoment` and `Moment.target()` (places A3), `audio.hasClip`.
- Produces: hook `autoplay(o: { heartbeats: number; goodnight: boolean; maxMs?: number }): Promise<AutoplayLog & { problems: string[] }>`.

- [ ] **Step 1: Finish the hook handlers**

In `registerGameHooks`, replace the `throw` in `route` with the moment fallback, and register `autoplay`:

```ts
    const { activeMoment } = await import('../ui/moment.ts');
    const m = activeMoment();
    if (!m) throw new Error(`no moment to ${name} in scene ${game.scene}`);
    if (name === 'answer') return m.hookAnswer();
    if (name === 'wrong') return m.hookWrong(...(args as [string?]));
    if (name === 'target') return m.target();
    return m.hookIdle();
```

```ts
  registerHook('autoplay', after(async (o: { heartbeats: number; goodnight: boolean; maxMs?: number }) => {
    const { autoplay, judgeLog } = await import('./autoplay.ts');
    const { heartbeat } = await import('../scenes/heartbeat/flow.svelte.ts');
    const { callHook } = await import('../platform/hooks.ts');
    const { audio } = await import('../audio/index.ts');
    const log = await autoplay({
      scene: () => game.scene, said: () => audio.said, answer: () => callHook('answer', []),
      startHeartbeat: () => heartbeat.start(), startGoodnight: () => heartbeat.startGoodnight(), visitOpen: () => game.visitOpen,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now(),
    }, o);
    return { ...log, problems: judgeLog(log, (id) => audio.hasClip(id)) };
  }));
```

- [ ] **Step 2: Write the flows**

`G/flows/integration/visit-5min.flow.sh`:

```bash
#!/usr/bin/env bash
# Spec 2.3 five-minute visit: the first heartbeat by real taps on each moment's target, two more by autoplay,
# goodnight, the rest scene's moon, one more heartbeat and goodnight again, all without a reload.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'seed(7)' >/dev/null
start_play
wait_for '() => ["nest", "meadow"].includes(window.__game.state().scene)'
# Heartbeat 1 by touch: tap the aria-label the scene names as the right answer, until the meadow is back.
for i in $(seq 1 40); do
  [ "$(val '() => window.__game.state().scene')" = '"meadow"' ] && break
  T=$(val 'async () => { try { return await window.__game.call("target") } catch { return null } }')
  if [ "$T" != 'null' ] && [ -n "$T" ]; then tap "$(echo "$T" | tr -d '"')"; fi
  sleep 0.3
done
check() {
  echo "$1" > "$MMH_SHOTS/visit-5min-$2-${W}x$H.json"
  echo "$1" | node -e '
    const log = JSON.parse(require("fs").readFileSync(0, "utf8"));
    if (log.problems.length) { console.error(log.problems.join("; ")); process.exit(1); }' || fail "visit has a dead end or a silent screen ($2)"
}
check "$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 2, goodnight: true }))')" first
wait_for '() => window.__game.state().scene === "rest"'
tap 'moon'
wait_for '() => window.__game.state().scene !== "rest"'
check "$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 1, goodnight: true }))')" second
expect_eq "$(val '() => window.__game.state().scene')" '"rest"' 'second goodnight rests again'
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

`G/flows/integration/returning.flow.sh` (R54):

```bash
#!/usr/bin/env bash
# A returning visit: the herd runs to the fence, Lumi says hello, Elizabeth says an egg is waiting, the nest is lit.
. "$(dirname "$0")/../lib.sh"
open_app
start_play
val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 1, goodnight: true }))' >/dev/null
hook 'newVisit()' >/dev/null
wait_for '() => window.__game.state().scene === "meadow"'
wait_for '() => window.__game.said().includes("g-egg-waiting")'
expect_eq "$(val '() => window.__game.said().includes("lumi-hello-back")')" 'true' 'Lumi greets her'
expect_eq "$(val '() => !!window.__game.state().moonbeam')" 'true' 'moonbeam on the nest'
finish
```

`G/flows/integration/rest.flow.sh` (R45):

```bash
#!/usr/bin/env bash
# Thirty-one idle minutes end the visit; the moon on the rest scene starts a new one with its own visit.start.
. "$(dirname "$0")/../lib.sh"
open_app
start_play
wait_for '() => window.__game.state().scene === "nest"'
V1=$(state visits)
hook "setNow($(val '() => window.__game.state().now') + 31 * 60000)" >/dev/null
wait_for '() => window.__game.state().scene === "rest"'
tap 'moon'
wait_for '() => window.__game.state().scene !== "rest"'
V2=$(state visits)
[ "$V2" -gt "$V1" ] || fail "no new visit.start after the rest scene"
finish
```

`visits` is a state key this task registers in Step 1: `registerState('visits', () => (game.data?.allEvents() ?? []).filter((e) => e.type === 'visit.start').length)`.

`G/flows/integration/no-art-manifest.flow.sh` (R49):

```bash
#!/usr/bin/env bash
# No art manifest: the game still boots, every picture takes its fallback, and the nest has a spoken goal.
. "$(dirname "$0")/../lib.sh"
MMH_URL="${MMH_URL}?art=missing.json" open_app    # test builds read the manifest file name from ?art= (platform A9)
start_play
wait_for '() => window.__game.state().scene === "nest"'
wait_for '() => window.__game.said().some((id) => id.startsWith("g-"))'
finish
```

`G/flows/integration/placement.flow.sh` (spec 6.2 "Placement until it ends"):

```bash
#!/usr/bin/env bash
# Placement runs across visits until it ends in every strand (at the latest at the start of visit 5).
. "$(dirname "$0")/../lib.sh"
open_app
start_play
for V in 1 2 3 4 5; do
  [ "$(val '() => Object.values(window.__game.state().placement).some(Boolean)')" = 'false' ] && break
  val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 3, goodnight: true }))' >/dev/null
  hook 'newVisit()' >/dev/null
done
expect_eq "$(val '() => Object.values(window.__game.state().placement).some(Boolean)')" 'false' 'placement ended in every strand'
finish
```

`G/flows/gate-A.txt` (blocking, play-critical):

```
platform-smoke
platform-input
heartbeat/heartbeat
heartbeat/naming
places/meadow
integration/new-player
integration/moving-day
integration/visit-5min
integration/reload-naming
integration/returning
integration/rest
integration/no-art-manifest
```

`G/flows/gate-A-warn.txt` (warnings at Gate A, blocking from Gate B):

```
places/label
places/pond
places/building
places/parent
integration/placement
```

- [ ] **Step 3: Run Gate A**

Run (outside the sandbox, from `G` in the main tree after the A6 merge): `bash tools/gate.sh A`
Expected: "Gate A passed its blocking checks". Hand every line of the warnings file to its owning lane for batch B1. A failing blocking check goes back to the owning lane; the integrator repeats this step. At 18:00 Mac time, if a blocking flow still fails, the integrator promotes the newest commit on which every blocking flow passes and notes the failing check in the README under "Checks for Tjitse".

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/src/game/hook-handlers.ts games/moon-meadow-home/flows/integration games/moon-meadow-home/flows/gate-A.txt games/moon-meadow-home/flows/gate-A-warn.txt
git commit -m "Add the Wave A visit flows and the gate lists"
```

### Task I-3G: Go live for Emma (batch A7, after Gate A)

**Files:**
- Modify: `G/README.md` (section "Play tonight" only), `ideas/opus-5-5-unicorn-egg-nest-v2/index.html` (one moon link, R47)

**Interfaces:**
- Consumes: `tools/promote.sh`, `tools/go-live.sh` (I-3a), core's server (A11).
- Produces: Emma's server on port 8765, serving `dist-emma` on the home network.

- [ ] **Step 1: Link v2 to v3 on the same origin**

In `ideas/opus-5-5-unicorn-egg-nest-v2/index.html`, add one small button at the top right: an inline SVG crescent moon in a 64 x 64 px circle, `aria-label="Moon Meadow Home"`, linking to `../../games/moon-meadow-home/`. No text, no other change to v2. Opening v3 through this link keeps the origin of her v2 save, so v3 reads it directly (R46).

- [ ] **Step 2: Promote and start (outside the sandbox)**

Run from the repo root: `bash games/moon-meadow-home/tools/promote.sh && bash games/moon-meadow-home/tools/go-live.sh`
Expected: the last line names the `.local` and IP addresses; every check passed (v3 200 from the LAN address and the `.local` name, v2 200, dot file 404, slash redirect, node listening on 8765).

- [ ] **Step 3: Write the README section**

Add to `G/README.md`:

```markdown
## Play tonight

- iPad: open http://<LocalHostName>.local:8765/ideas/opus-5-5-unicorn-egg-nest-v2/ and tap the moon at the top right. That opens Moon Meadow Home on the same address as her v2 save, so her herd moves in.
- If the `.local` name does not open, use http://<LAN IP>:8765/ with the same path.
- Restart after a reboot or a sleep: `bash games/moon-meadow-home/tools/go-live.sh` from the repo root.
- Log with each request's iPad version: `games/moon-meadow-home/.data/serve.log`.
- Fallback: if her herd does not move in (another address, or storage cleared), use `ideas/opus-5-5-unicorn-egg-nest-v2/move.html` and the parent corner's file import.
```

Fill in the two addresses that `go-live.sh` printed.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/README.md ideas/opus-5-5-unicorn-egg-nest-v2/index.html
git commit -m "Serve Moon Meadow Home to the iPad and link it from v2"
```

### Task I-4: Six-visit queue flow (Wave B)

**Files:**
- Create: `G/flows/integration/six-visits.flow.sh`, `G/flows/gate-B.txt`
- Modify: `G/src/game/hook-handlers.ts` (state keys `announced` and `queueOpenings`)

**Interfaces:**
- Consumes: `newVisit`, `autoplay`, places' queue ids (`openingDefs` in `src/core/places/openings.ts`, places A6).
- Produces: the opening queue check of spec 6.2 ("Opening queue over 6 simulated visits") across heartbeat and places.

- [ ] **Step 1: Register the state keys** in `G/src/game/hook-handlers.ts`:

```ts
  registerState('announced', () => [...(game.world?.announced ?? [])]);
  registerState('queueOpenings', () => openingDefs.map((d) => d.id));   // import { openingDefs } from '../core/places/openings.ts'
```

- [ ] **Step 2: Write the flow**

```bash
#!/usr/bin/env bash
# Six visits: at most one queue opening per visit after visit 1 (spec 2.9, 2.11 rule 8).
# Only ids in places' opening queue count; welcome, moving-day, moon-hint, rewards and novelties do not.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'seed(3)' >/dev/null
start_play
COUNT='() => { const s = window.__game.state(); const q = new Set(s.queueOpenings); return s.announced.filter((id) => q.has(id)).length; }'
PREV=$(val "$COUNT")
for V in 1 2 3 4 5 6; do
  val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 3, goodnight: true }))' >/dev/null
  N=$(val "$COUNT")
  if [ "$V" -gt 1 ] && [ $((N - PREV)) -gt 1 ]; then fail "visit $V announced $((N - PREV)) queue openings"; fi
  PREV=$N
  hook 'newVisit()' >/dev/null      # ends the visit, moves the clock 6 hours and starts the next visit (no Play tap)
done
finish
```

- [ ] **Step 3: Write `G/flows/gate-B.txt`**

Every line of `gate-A.txt` and `gate-A-warn.txt`, then `heartbeat/eggs-b`, `places/jewel`, `places/dressing`, `places/post`, `places/notes`, `places/book`, `places/queue`, `platform-offline`, `platform-visits`, `integration/six-visits`. There is no `gate-B-warn.txt`.

- [ ] **Step 4: Run and commit**

Run (outside the sandbox): `MMH_LANE=integration MMH_PORT=8766 bash flows/run.sh integration/six-visits`
Expected: PASS.

```bash
git add games/moon-meadow-home/flows/integration/six-visits.flow.sh games/moon-meadow-home/flows/gate-B.txt games/moon-meadow-home/src/game/hook-handlers.ts
git commit -m "Add the six-visit opening queue flow"
```

Then run `bash tools/gate.sh B` and, when it passes, `bash tools/promote.sh` (Emma's server picks up the new `dist-emma` on her next load).

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

### Task I-6: Long visit, two devices, eviction, and Gate C (Wave C)

**Files:**
- Create: `G/flows/integration/visit-45min.flow.sh`, `G/flows/integration/two-devices.flow.sh`, `G/flows/integration/eviction.flow.sh`, `G/flows/gate-C.txt`
- Modify: `G/src/game/hook-handlers.ts` (`pairForTest`), `IDEAS.md` (status of Moon Meadow Home to `playable`)

**Interfaces:**
- Consumes: `autoplay`, `syncNow` (I-5), `sync` (I-5), `server:pair` (core C3), the parent corner's import and pairing (places A15, C8).
- Produces: hook `pairForTest(code)`.

- [ ] **Step 1: Register `pairForTest`** in `hook-handlers.ts` (this task owns it, so no lane of batch C3 waits on another):

```ts
  registerHook('pairForTest', after(async (code: string) => { const { sync } = await import('../game.svelte.ts'); return sync?.pair(code); }));
```

- [ ] **Step 2: Write the long-visit flow**

```bash
#!/usr/bin/env bash
# Spec 2.3 45-minute visit as a scripted run: a visit to every open place, ten heartbeats, then goodnight.
# Every screen needs one spoken goal with a clip (7.3 check 10), not only "no dead end".
. "$(dirname "$0")/../lib.sh"
open_app
hook 'importFixture("v2-save")' >/dev/null
start_play
wait_for '() => window.__game.state().scene !== "moving-day"'
judge() {
  echo "$1" | node -e '
    const log = JSON.parse(require("fs").readFileSync(0, "utf8"));
    if (log.problems.length) { console.error(log.problems.join("; ")); process.exit(1); }' || fail "$2"
}
for P in post-box salon dressing-corner bath-pond letter-lane; do
  hook "jump(\"$P\")" >/dev/null
  judge "$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 0, goodnight: false, maxMs: 15000 }))')" "dead end or silent screen in $P"
  hook 'jump("meadow")' >/dev/null
done
judge "$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 10, goodnight: true }))')" "dead end or silent screen in the long visit"
finish
```

- [ ] **Step 3: Write the two-device flow**

```bash
#!/usr/bin/env bash
# Spec 7.3 check 8: two devices play offline, sync, and end with the union of both herds.
# run.sh (or gate.sh) exports MOON_DATA, the data folder of the server it uses; admin.ts must write to the same folder.
. "$(dirname "$0")/../lib.sh"
: "${MOON_DATA:?run through flows/run.sh, which exports MOON_DATA}"
pair_code() { (cd "$MMH_GAME_DIR" && MOON_DATA="$MOON_DATA" node server/admin.ts pair --family test | tail -1); }
CODE_A=$(pair_code); CODE_B=$(pair_code)
S=synca; open_app; start_play; hook "pairForTest(\"$CODE_A\")" >/dev/null; hook 'herd(3)' >/dev/null
S=syncb; open_app; start_play; hook "pairForTest(\"$CODE_B\")" >/dev/null; hook 'herd(2)' >/dev/null
S=synca; hook 'syncNow()' >/dev/null
S=syncb; hook 'syncNow()' >/dev/null
S=synca; hook 'syncNow()' >/dev/null
S=synca; A=$(state herd)
S=syncb; B=$(state herd)
[ "$A" = "5" ] && [ "$B" = "5" ] || fail "herds $A and $B, expected 5 and 5"
S=synca; finish
S=syncb; finish
```

The flow runs against the server of `run.sh` or `gate.sh` (port 8766 at the gate), whose `MOON_DATA` is a temp folder; `lib.sh` exports `MMH_GAME_DIR` (the game folder) and passes `MOON_DATA` through (platform A10). Never Emma's `.data`.

- [ ] **Step 4: Write the eviction flow** (spec 6.2 eviction, spec 4.7 "Storage evicted")

```bash
#!/usr/bin/env bash
# Play, export, lose storage, see the welcome, restore from the parent button on the welcome before egg 1,
# and check the herd is back and the fresh start left no hatch.
. "$(dirname "$0")/../lib.sh"
open_app
start_play
hook 'herd(4)' >/dev/null
FILE=$(val 'async () => window.__game.call("parentExport")')          # places A15 hook: the export text
val 'async () => { await new Promise((r) => { const q = indexedDB.deleteDatabase("moon-meadow"); q.onsuccess = q.onerror = q.onblocked = () => r(1); }); localStorage.clear(); location.reload(); return 1; }' >/dev/null
sleep 1
wait_for '() => !!window.__game'
hook 'fast(true)' >/dev/null
start_play
wait_for '() => window.__game.state().scene === "welcome"'
hold 'parent' 3200                                                    # lib.sh: mousedown, wait, mouseup
hook "call(\"parentUnlock\")" >/dev/null                              # places A15 test hook: enters the PIN
hook "call(\"parentImport\", $FILE)" >/dev/null                       # places A15 test hook: the import path of Backup
wait_for '() => window.__game.state().scene !== "welcome"'
[ "$(state herd)" -ge 4 ] || fail "herd not restored"
expect_eq "$(val '() => window.__game.call("hatchedSinceRestore")')" '0' 'the fresh start hatched nothing'
finish
```

`parentExport`, `parentUnlock`, `parentImport` and `hatchedSinceRestore` are places A15 test hooks (places validation block). A Gate C variant restores by pairing instead of a file once places C8 lands; the file path stays the Gate A and B check through `places/parent`.

- [ ] **Step 5: Write `G/flows/gate-C.txt`**

Every line of `gate-B.txt`, then `places/salon`, `places/valley`, `places/lane`, `places/titles`, `places/along`, `heartbeat/year1`, `integration/visit-45min`, `integration/two-devices`, `integration/eviction`.

- [ ] **Step 6: Gate C and Emma's server**

Run `bash tools/gate.sh C` from `G` outside the sandbox. If run 12 was cut, `places/titles` may find `num-*` ids above the generated range in `audioMissing()`; that flow then compares the missing list with `tools/audio/numbers-gap.json` (audio C1 writes it) and passes when they match, and the README lists the gap under "Checks for Tjitse". When the gate passes: `bash tools/promote.sh`. Emma's server keeps running (I-3G); restart it only if it is down, with `bash games/moon-meadow-home/tools/go-live.sh` from the repo root.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/flows/integration games/moon-meadow-home/flows/gate-C.txt games/moon-meadow-home/src/game/hook-handlers.ts IDEAS.md
git commit -m "Add the long visit, two-device and eviction flows and mark the game playable"
```

---

## 5. Validation gates

A gate runs after the last batch of its wave, by the integrator, with `bash tools/gate.sh <wave>` from `G` in the main tree, outside the sandbox. A failing blocking check sends the owning lane back to fix it; no later batch starts until the blocking checks are green. Warnings go to their owning lanes as the first task of the next wave's first batch. Spec 7.3 checks that need Emma's iPad, odin or Tjitse's ear cannot run in this session; the replacement is named and the original is left for Tjitse in `games/moon-meadow-home/README.md` under "Checks for Tjitse". Emma's build changes only through `tools/promote.sh` after a gate passed (R47).

### 5.1 Gate A (first playable)

Commands (`tools/gate.sh A` runs them in this order):

```sh
npm test                               # blocking: every suite, including the simulated learner tests, core's merge properties, learning's servable-carrier minimums
npm run check                          # blocking: svelte-check and tsc, 0 errors
npm run check:audio                    # blocking: ids exist, narrator-only prefixes, no duplicate ids
npm run check:content -- --assets=warn # blocking for content errors; ASSET_PIC and ASSET_CLIP are warnings (R62)
npm run simulate                       # warning at Gate A: weeks per step, R19 and S10 weeks from Emma's start
```

Blocking flows in `flows/gate-A.txt` (each at 1180 x 820, 1080 x 810, 1024 x 768; `platform-smoke` also in portrait 820 x 1180): `platform-smoke`, `platform-input`, `heartbeat/heartbeat`, `heartbeat/naming`, `places/meadow`, `integration/new-player`, `integration/moving-day`, `integration/visit-5min`, `integration/reload-naming`, `integration/returning`, `integration/rest`, `integration/no-art-manifest`. Every flow ends with `__game.audioMissing()` empty and `__game.errors()` empty.

Warnings at Gate A (`flows/gate-A-warn.txt` and the script's `warn` lines): `places/label`, `places/pond`, `places/building`, `places/parent`, `integration/placement`, `npm run simulate`, `flows/art-stress.sh` (the frame verdict), the WebKit audio decode page `flows/audio-check.html` (audio Task A9), and the `ASSET_*` list.

Go-live: when the blocking checks pass, Task I-3G promotes the build and starts Emma's server. At 18:00 Mac time the integrator promotes the newest commit on which every blocking flow passes, even if a later fix is still running, and writes the failing check into the README.

Mapping to spec 7.3:

| Check | Gate A |
|---|---|
| 1 Vitest, simulated learner, merge properties | `npm test` |
| 2 `check:content`, `svelte-check` | `npm run check:content -- --assets=warn`, `npm run check`; learning's L-A22 test blocks when a loaded step has fewer than 3 servable carriers (6 for R19 and S10) |
| 3 Flows at three sizes, portrait, no missing clips, no console errors | the blocking flow list |
| 4 Stress test on Emma's iPad | **Cannot run.** Replaced by `flows/art-stress.sh` in WebKit at 1024 x 768 with the real sprites (decoded memory under 150 MB, frame verdict on screen), a warning here. Tjitse opens `stress.html` on her iPad and reads the verdict. The app falls back to `lite` unicorns when frames are slow (R63). |
| 5 iPad from the home screen: `persist()`, airplane mode, export | **Cannot run** (plain http has no service worker or `persist()`). Replaced by the export and import steps in `places/parent` (warning here, blocking from Gate B) and the insecure-context smoke flow against `http://<mac>.local:8766/`. Offline is Gate B. |
| 6 Her real v2 save imports | **Cannot run by an agent** (the save lives in her Safari tab). Replaced by core's synthetic fixture tests, the import-of-45 test (I-2), `integration/moving-day`, and the same-origin read test (core A10). v2 links to v3 on the same origin (I-3G). Tjitse watches Moving Day live tonight. |
| 7 200 random gold-bell builds | heartbeat Task 14 unit test (in `npm test`) |
| 9 Ear check | **Replaced** by `--stt` on every narrator and queen clip (failures regenerated twice, learning clips still failing get `ok: false` and are never served), `npm run check:audio`, and `shared/review.html` left for Tjitse. |
| 10 5-minute test visit | `integration/visit-5min` (real taps for the first heartbeat, autoplay for the rest, two goodnights without a reload). Tjitse's own visit stays for him. |
| 11 Plurals | learning simulated learner (R19 and S10 within 4 play weeks), learning planner tests (R19 and S10 in visit 1 or 2 after placement), `heartbeat/heartbeat` (the first-wish basket at levels 1 to 3 with both mistakes, one for many and many for one), `places/pond` (both mistakes at each level and the two level-3 count mistakes), `places/label` (S10 wrong ending, the bare word on a full jar, the ending on a jar of one, the mice jar). The iPad part is Tjitse's. |

### 5.2 Gate B (release 1.1)

Same commands, `content/release.json` at `1.1`, `npm run simulate` blocking. Flows in `flows/gate-B.txt`: everything in `gate-A.txt` and `gate-A-warn.txt`, plus `heartbeat/eggs-b` (berry, snow, golden, two-egg), `places/jewel`, `places/dressing`, `places/post`, `places/notes`, `places/book`, `places/queue`, `platform-offline` (service worker on `127.0.0.1`, offline reload), `platform-visits` (clock across visits), `integration/six-visits`. Plus `npm run names:pull -- --file tests/fixtures/v2-save.json --dry-run` lists the fixture's unknown names with their nearest list names. When it passes: `bash tools/promote.sh`.

| Check | Gate B |
|---|---|
| 1 to 3, 7, 9, 10, 11 | as Gate A, with the Gate A warnings now blocking (except the art frame verdict and the `ASSET_*` list) |
| 5 Offline | `platform-offline` on `127.0.0.1` (a secure context). The real iPad over plain http has no service worker; it plays online at home. |

### 5.3 Gate C (releases 1.2 and 1.3)

Same commands, `content/release.json` at `1.3`. Flows in `flows/gate-C.txt`: everything in Gate B plus `places/salon`, `places/valley`, `places/lane`, `places/titles`, `places/along`, `heartbeat/year1` (asking bubbles, two-state wishes, phrase wishes), `integration/visit-45min`, `integration/two-devices`, `integration/eviction`. Core's server tests (pairing, tokens, rate limits, dedupe, the 20,000-event chunked push, cursor paging, daily copies, the test family) are in `npm test`. If audio run 12 was cut, the missing `num-*` ids above the generated range are the one allowed gap (`tools/audio/numbers-gap.json`), listed in the README for Tjitse. When it passes: `bash tools/promote.sh`.

| Check | Gate C |
|---|---|
| 5 Server deployed and syncing | **odin cannot be reached.** Replaced by the save API on the Mac (core C6 "Save API on the Mac") and `integration/two-devices` on the gate's server. The deploy note `server/DEPLOY.md` is for Tjitse. |
| 8 Two devices offline then synced | `integration/two-devices` and learning Task C5 (merged-log fold) |
| 10 45-minute visit | `integration/visit-45min` (scripted, with the spoken-goal check on every screen) |
| Eviction (spec 6.2) | `integration/eviction`: restore from the welcome before egg 1, the fresh start leaves no hatch |

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

Second validation round (R34 to R64). Each stream plan now also has a "Validation round 2 (binding)" block under its Reconciled block, with its new batch line. In-place edits made with it: platform `run.sh` probes the app page and both `.gitignore` files list `dist-test*/`, `dist-emma*/`, `.worktrees/`; core `PinRef.at` is `e.t`, the `Baby` literals carry `listName` and `comeAlong`, and A6 no longer edits `.gitignore`; learning commits name its seven packs and `nameKey` re-exports `keys.ts`; heartbeat uses `station-wish`, `endVisit('goodnight')`, a once-only `afterRollCall`, `item-brush`/`item-treat`/`item-heart`, `flows/heartbeat/*.flow.sh` and re-exports `nameKey`; places uses the contract setting keys and `MM-DD` birthdays, `place/idle` with `level`, `flows/places/*.flow.sh`, no `run.sh` or `y1.sh`, and cousin clips from the name bank; art draws `pin` as a badge pin; audio re-exports `slugName`, records missing static clips in fast mode, and generates numbers 61 to 100 in run 12.

| Stream | Round 2 changes |
|---|---|
| platform | `keys.ts`, `types/contracts.ts`, both `.gitignore` files in A1; new A9a (polyfills, feature check); A9 boots with `allSettled`; A10 sync `said`/`audioMissing`, forwards, `hold`, `MMH_GAME_DIR`, fixed probe; A12 to A4, A13 to A6; B1 without `package.json`. |
| core | No `.gitignore` edits; `PinRef.at` and `Baby` fields fixed; `GameData.quarantine()`; A11 prints both addresses and logs User-Agents; K7 start rule and unnamed babies per R46, R55. |
| learning | `station-wish` (R34), release-upgrade fold rule (R35), heart marks and `display` (R36), one name key (R40), `testScaffold` (R59), `--assets=warn` and servable-carrier gate (R62), Dot, Fen, Bex in the bank, `dutchPairs` in the report, explicit pack paths in commits. |
| heartbeat | Task 4 to A2, Tasks 10 to 14 to A3; Task 15 rewritten to contract shapes with an in-lane contract test; heart-part print; station wishes; display words read after the act; printed goodnight count; moon hint; stall-door decorations; flows `heartbeat`, `naming`, `eggs-b`, `year1`; basket mistakes at three levels. |
| places | New A1a; A1 in A2 with `scenes.ts` and `hook.ts` and an in-lane contract test; A15 to A5 with the learning, quarantine, jewel-share, profile and restore parts; arrival goal, favourites, v2 gifts and lite unicorns in A7; Building Day review items and sign rule; repeating decorations; favourite heart; C1 to C2; contract setting keys; plural mistakes in the pond and label flows. |
| art | Code and data owners split (R61); A11 and A14 split into named parts; new A13b word top-up from learning's list; manifest loader never throws; `lite` unicorns; 60-minute cap on usage-limit waits. |
| audio | Run order and run 12 (R37); speech-to-text cost measured at run 0; ids re-exported from `keys.ts`; no `package.json` or `vite.config.ts` edits; typed `SpeakId`; fast-mode missing clips; LRU of 60 dynamic clips; B1 and C1 number lines only; goal-line clips checked by `check:audio`. |


---

## 7. Self-review

Re-run after the second validation round (2026-10-12).

**Spec coverage (7.1 items to tasks).**

| Item | Tasks |
|---|---|
| 1 Skeleton, deploy, PWA, persist, docs | P-A1, P-A9a, P-A9, P-A12, P-A13, P-B1, C-C6 (deploy note), C-A11, I-3a, I-3G (go-live) |
| 2 Stress test | AR-A10, AR-A11c, AR-C4; `lite` unicorns AR-A9, PL-A7 |
| 3 Core events, store, merge | C-A1 to C-A10, I-1 |
| 4 Content packs and validator | L-A1 to L-A10, AR-A13, AR-A13b, AU runs 1a to 7 |
| 5 Learning engine, planner, simulated learner | L-A11 to L-A22 |
| 6 Heartbeat | H-1 to H-9, H-15 to H-23, H-23B, I-1 (rest scene) |
| 7 Naming | H-10 to H-14, H-19 |
| 8 Stables, roll call, goodnight sky | H-7, H-8, H-21, H-22 |
| 9 Meadow hub, bubbles, label bubbles, moonbeam, ghost hand, replay, hints | P-A11, PL-A2 to PL-A7, PL-A9, PL-A10, H-23 (moon hint) |
| 10 Plurals | L-A6, L-A7, L-A17, H-5, H-6, H-20, PL-A8 to PL-A11, AR-A13, AR-A13b |
| 11 move.html, v2 import, Moving Day | C-A6, C-A10, C-A12, I-2, I-3G (v2 link) |
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
| 22 Titles, Royal Nest Keeper, Hundred Party | PL-C5, AU-C1 and run 12 (numbers to 100) |
| 23 Come along | PL-C6, C-C1 |
| 24 Year 1 meadow wishes | L-C2, H-26, H-27 |
| 25 Save server, pairing, sync, test family, names:pull from the server | C-C2 to C-C6, AU-C2, I-5, I-6 |
| 26 Parent corner rest | PL-C8 |

No item is without a task. Spec parts that the validation round found without an owner now have one: station wishes (R34), display tricky words (R36), Building Day review items (R38), the returning arrival and the moon hint (R54), favourites and stall-door decorations (R57), the parent corner's learning views and restore (R56), the eviction flow (I-6), placement until it ends (I-3b). Deliberate differences from the spec are in 2.4 (L1 to L5).

**Batch dependency check (rule 3.1).** For each cross-lane import, the producer's batch is earlier than the consumer's:

| Consumer (batch) | Needs | Producer (batch) |
|---|---|---|
| H-1 (A1) | `numId`, `bondId`, `ordId` | `src/core/keys.ts`, P-A1 (A0) |
| H-4 (A2) | `randomColours`, `GOLDEN_BODY` | AR-A6 (A1) |
| H-10 to H-14 (A3) | `content.gpcs` | L-A10 (A2) |
| H-15 (A3) | `validateEvent` for its lane test | C-A3 (A1) |
| PL-A2, PL-A8 (A1) | place value types | PL-A1a (A1, same lane, earlier task) |
| PL-A1 (A2) | events, fold, `ActionCtx` type | C-A3, C-A5 (A1), `src/types/contracts.ts` (A0) |
| PL-A1b (A4) | `nextItem`, `learnResultPayload` | L-A17, L-A19 (A3) |
| PL-A3 (A4) | ghost hand, moonbeam | P-A11 (A3) |
| P-A9 (A3) | audio facade, art loader, polyfills | AU-A8 (A2), AR-A6 (A1), P-A9a (A2) |
| P-A12 (A4) | the built shell | P-A9 (A3) |
| I-1 (A4) | boot, hooks, learner and places slices, translators, game data | P-A9, P-A10 (A3), L-A15 (A2), PL-A1 (A2), H-15 (A3), C-A9 (A2) |
| H-17 (A4) | input actions, Heap | P-A9 (A3), AR-A6 (A1) |
| H-17B to H-23B (A5) | store, `createMoment`, planner adapter | I-1, PL-A3, PL-A1b (A4) |
| PL-A15 (A5) | report, learner report, store | PL-A14 (A3), L-A20 (A3), I-1 (A4) |
| I-3a (A5) | nothing from A5 lanes | |
| PL-A7 (A6) | `MeadowLife`, `PinGate` | H-23B, PL-A15 (A5) |
| I-2 (A6) | `heartbeat.start`, `createMoment`, `PinGate` | H-23 (A5), PL-A3 (A4), PL-A15 (A5) |
| P-A13 (A6) | describes Wave A | docs only |
| I-3b (A7) | every Wave A scene, `activeMoment` | A6 and earlier |
| AR-A11b sprites (A3), Lumi (A4) | `pipeline sprite`, `derive`, `lumi` | AR-A8 (A2), AR-A11a (A3) |
| AR-A12 (A3) | `regions.classify` | AR-A7 (A2) |
| AR-A13b (A3) | `pictures-needed.json` | L-A10 (A2) |
| PL-C1 (C2) | Salon phrases | L-C1 (C1) |
| H-26, H-27 (C2) | meadow phrases | L-C2 (C1) |
| I-6 (C3) | sync client, store wiring | C-C5, I-5 (C2); `pairForTest` is I-6's own |
| run 8 (B3), run 11 (C3) | Wave B and C lines | PL-B4 to B9, H-24, H-25 (B1, B2); PL-C1 to C6, H-26 to H-29 (C1, C2) |

**Placeholder scan.** No "TBD" or "later" steps. Values pinned at run time on purpose: the `@fontsource/andika` version, the two addresses `go-live.sh` prints (written into the README in I-3G), and `sttPerCheck` (run 0). Three places tell the builder to adapt to a signature another task defines (I-2's `createMoment` options and `growV2Save` clone, learning's fold test helpers); the behaviour and assertions are fixed.

**Type consistency.** `contracts.ts` type-checks with TypeScript 6.0.3 under `--strict --erasableSyntaxOnly --verbatimModuleSyntax` and runs under Node 24 type stripping (checked on 2026-10-12 after this round). The names in sections 2 and 4 match it: `game.ready()`, `game.planContext()` with `testScaffold`, `game.rng` an `Rng`, `endVisit` routing to `rest`, `Moment.target()`, `learn.result.items` as `{ id, r }`, `station-wish` in `MomentKind`, `RawWord.heart`, `Pick.display`, `SpeakId`, setting keys `parent-pin`, `skip-wish-after-three`, `birthday` (`MM-DD`), name clips `name-<slugName>` and `name-<slugName>-q` from one `src/core/keys.ts`, heartbeat action prefix `naming.`, egg pictures `egg-<breed>`, care items `item-brush`, `item-treat`, `item-heart`.

**Review Focus.** Each line at the top has a pinned test: (1) I-1 `contracts.test.ts` over all four translators with a real `ActionCtx`, plus the heartbeat and places lane contract tests; (2) I-2 `import-45.test.ts` and the `integration/moving-day` flow; (3) I-1 `plan-context.test.ts`, the `integration/no-art-manifest` flow and `visit-5min`'s spoken-goal check with clips; (4) platform A9a polyfill test, platform A10 insecure-context smoke flow, core A1; (5) heartbeat Task 16 and `integration/reload-naming`.

**Emma tonight.** The `*` tasks of 3.2 form a path from Play to goodnight that no non-`*` task blocks: Building Days, the label scene, Bath Pond, the report, the simulated learner, the stress runs, the layer spike and the menu card are off it. Go-live (I-3G) needs only the Gate A blocking checks, and the 18:00 rule ships the newest build that passes the play-critical flows.
