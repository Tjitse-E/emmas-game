# Moon Meadow Home: Learning Workstream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the learning half of v3: the content packs (ladders, words, tier 1 names, blocklist, generator lines), the content validator, the learning engine, the session planner and the simulated learner, each with Vitest suites, so every scene can ask "what should Emma do next?" and every result moves her through the ladders exactly as spec section 3 says.

**Architecture:** Content is plain JSON in `games/moon-meadow-home/content/` (plus `shared/blocklist.json`), turned into an indexed `Content` object by one pure builder. The learning engine is a pure fold over events (`learn.result`, `visit.start`, `step.passed`, `placement.done`, `learn.override`, `import.v2`) into a JSON-serialisable `Learner`. The planner is a set of pure functions over `Content` and `Learner` that return `Pick`s. Facts the fold discovers (a step is ready to pass, placement has ended) are returned by `pendingLearnFacts()` and recorded as events by the store, so a merge or a content change can never take them back. Node tools (validator, line builder, picture list, simulator) import the same TypeScript files through Node 24 type stripping.

**Tech Stack:** TypeScript 6.0.3 (erasable syntax only), Vitest 5.0.3, Node.js 24.19.0 with native type stripping for tools, JSON content. No runtime dependencies.

**Spec:** `docs/v3/spec.md` (section 3, section 4.2 units "Content packs", "Content validator", "Learning engine", "Session planner", section 6.1). `docs/v3/decisions.md` wins on conflicts, then the build decisions in this plan's "Decisions taken here".

All paths below are relative to the repo root `/Users/tjitse/sites/emmas-game`. `G` means `games/moon-meadow-home`. Every command is run from `G` unless it says otherwise:

```sh
cd /Users/tjitse/sites/emmas-game/games/moon-meadow-home
```

## Global Constraints

- Node.js 24.19.0, npm 12. TypeScript 6.0.3, Vitest 5.0.3, exact versions, lock file committed (spec 5.1). This workstream adds no dependencies.
- Core code in `G/src/core/` is pure TypeScript: no DOM, no `window`, no `Date.now()` inside core functions (time comes in as `now` or event `t`), no `Math.random()` (randomness comes in as `rng`).
- Erasable syntax only (`erasableSyntaxOnly`): no `enum`, no `namespace`, no parameter properties. Relative imports carry the `.ts` extension, so Node 24 can run tools that import core files.
- `Learner` is plain JSON (records and arrays only, no `Map`, `Set` or class instances), because the save workstream stores it in the snapshot.
- The app is fully British English. No Dutch word, text, clip id or name pronunciation in any content pack or line. The blocklist is the only file that holds Dutch words, and it is never shown or played (decisions.md).
- Unicorns only. Other animals appear only as toys (toy fox, toy mouse, rocking horse, rubber duck, toy bee, teddy). Nothing sad, sick, hurt, lost or scary.
- Elizabeth (`narrator`) speaks every learning word, name, number and sound. Ids starting with `word-`, `name-`, `num-`, `sound-`, `phrase-` and `model-` use `narrator`. No digits in line text. Line ids match `^[a-z0-9]+(-[a-z0-9]+)*$`.
- No pressure mechanics: no timers shown, no streaks, nothing taken away. Speed only matters inside the fluency rule (spec 3.4) and is never shown.
- Commit messages are plain English, imperative, no AI attribution, no em dashes. Each task commits only the files it owns.
- Docs and comments: plain direct English, no em dashes.

## Decisions taken here

The lead said: decide, do not ask. These choices fill gaps or resolve conflicts in the spec. Each is stated once so the integrator can find it.

1. **Grapheme-phoneme correspondences (GPCs) are the unit.** A GPC id is the grapheme, plus `.<phoneme>` when it is not the grapheme's usual sound: `ow` (cow), `ow.oa` (snow), `y.ee` (funny), `er.ur` (her). Split digraphs are `a-e`, `i-e`, `o-e`, `u-e`, `e-e`. Words and names store their GPC list, so the gift-gem rule "a slot is hers only if its grapheme makes its usual sound" (spec 2.8) is a lookup.
2. **Reading items logged per moment are the served step's items in the carrier, not every grapheme in the word.** Spec 3.2 says "the word's graphemes from loaded steps". A miss on "rain" cannot be pinned on the r, so logging all graphemes would demote early items on noise. The planner logs the items of the served step that the carrier contains.
3. **Review results for the reopen rule are moments whose served `step` is that passed step** (review and mixed picks), not every incidental grapheme.
4. **New event type `placement.done`** `{strand, current, placed, side}`, a recorded fact with natural key `strand` (earliest wins). It freezes the placed and side lists at the moment placement ended, so a later release that loads new steps (R27 to R29 in 1.2) does not rewrite history on refold. The parent override `set-current` carries the same lists.
5. **Placement ends** when the bisection converges, after 10 probe items, at the start of the 5th visit, or when she misses at the floor. Her current step is always `lo` (spec 3.5). The search list holds loaded steps that are not contrast, school or display steps.
6. **Probe items** update item boxes but are not counted as new items for the 3-per-day cap, and never count toward a pass.
7. **Default start profile is `year1`** (Emma's school-year start, R13/R21, S09/S12, M01/M10, school steps R19 and S10). `fresh` (R01, S01, M01, no probe, no school flags) is selected with a `learn.override` `profile` event from the parent corner. This build is for Emma, so `year1` is the default in `budget.json`.
8. **Item ids** are strings with a strand prefix: `r:g:ai`, `s:g:ai`, `r:end:es`, `r:pair:a-e-u`, `r:cl:-st`, `m:miss:10-7`, `name:<key>`. Reading and spelling memories are separate items. Every id matches `/^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/` (the core plan's event schema). A name item is keyed by the name (`slugName`, so two babies called Tim share one memory, spec 3.7 "Each name has a Leitner box").
9. **One-or-many split.** R19 has three items (`r:end:s`, `r:end:es`, `r:end:none`) served least recently seen first, so about one wish in three is singular. Spec 3.10 says "about half". The planner keeps the simple rotation, and the simulated learner prints the ratio. If Tjitse wants half, `budget.json` `oneShare` raises it (Task A17 implements the knob, default `0.34`).
10. **Tired eggs.** After 30 checked moments the nest serves only items in box 3 or higher (spec 3.6). When none qualifies, `nextEgg` returns the egg kind with `pick: null`: a free egg that hatches without a check. The nest always holds an egg.
11. **Words carry no declared step.** The reading and spelling step of a word is computed from its items (the highest step among them). This removes a whole class of authoring errors.
12. **R24 (-ing, -ed, -est), R12 (checked tricky words) and R27 to R29 load with release 1.2**, because their only sensible carriers are Salon card lines and the Year 1 meadow acts. In the first playable they are `waiting`, which the spec allows (3.6, "A step with no place is waiting").
13. **Pictures:** every word picture id is `w-<word>`. A heap for a plural is drawn by code from the one picture (spec 3.10).
14. **Packs this workstream writes `lines.json` for:** `words-phase2`, `words-phase3-4`, `words-year1`, `numbers`, `names-t1`, and from 1.1 `phrases-notes`, from 1.2 `phrases-salon` and `phrases-meadow`. The audio workstream generates the mp3 files and manifests.

## Review Focus

The five inputs the spec implies but no feature test exercises, most likely first. Each has a pinned test in the task named.

1. **Two devices and replays deliver duplicate or late recorded facts** (`step.passed` twice, `placement.done` from both iPads, the same `import.v2` twice). Expected: the first wins, nothing is revoked, nothing is counted twice. Tests in Task A15 ("step.passed is never revoked and duplicates are harmless", and the duplicate `placement.done` and `import.v2` cases) and Task C5.
2. **The iPad clock jumps back,** so a `learn.result` has a smaller `t` than the item's last result. Expected: no negative intervals, the item is not stuck as due forever, `lastT` never decreases. Tests in Task A12 ("lastT never goes backwards when the clock jumps back") and Task A15 ("a result with an earlier clock time never moves lastT backwards").
3. **Content changes between versions:** an event names an item, word or step that no longer exists. Expected: the fold skips the unknown id and keeps going, never throws. Test in Task A15 ("unknown items and steps are skipped without throwing").
4. **Nothing is servable** (assets missing, ceiling reached, every item capped). Expected: the planner returns `null`, never throws, never serves an item without its clip and picture. Test in Task A17 ("returns null when nothing is servable").
5. **A visit crosses local midnight or the time zone changes.** Expected: the 3-new-items cap resets on the local day of each result, using the time zone of the visit it belongs to. Test in Task A15 ("new items per day follow the local day of the visit time zone").

## Contracts I need

These are assumptions about other workstreams. The integrator reconciles them before Wave A ends.

**C-SKEL (project skeleton, spec 7.1 item 1):**

1. `G/package.json` exists with `"type": "module"`, devDependencies `typescript@6.0.3` and `vitest@5.0.3`, and these scripts (this workstream relies on them and does not edit `package.json` itself):
   ```json
   {
     "test": "vitest run",
     "check:content": "node tools/validate-content.ts",
     "build:lines": "node tools/build-lines.ts",
     "list:pictures": "node tools/list-pictures.ts",
     "simulate": "node tools/simulate.ts"
   }
   ```
2. `G/tsconfig.json` has `"strict": true`, `"erasableSyntaxOnly": true`, `"allowImportingTsExtensions": true`, `"noEmit": true`, `"resolveJsonModule": true`, `"verbatimModuleSyntax": true`, `"moduleResolution": "bundler"`, `"module": "esnext"`, `"target": "es2022"`, and includes `src`, `tools`, `tests`.
3. `G/vitest.config.ts` includes `tests/**/*.test.ts` and runs in the `node` environment.
4. `G/vite.config.ts` allows `server.fs.allow: ['..', '../..']`, because `src/core/content/static.ts` imports `../../../../../shared/blocklist.json` from the repo root.

If the skeleton is not merged when Task A1 starts, the implementer stops and reports this to the lead. This workstream never creates `package.json`, `tsconfig.json` or the Vitest config.

**C-EVENTS (core events, merge and save, spec 7.1 item 3):**

1. Every event has at least `{ id: string; t: number; type: string }` plus the spec 4.4 fields. This workstream's types extend `EventBase = { id: string; t: number; type: string }` structurally, so the core `Event` type only has to be assignable.
2. The event schema accepts these payloads exactly (fields flat on the event, as spec 4.4 says):
   - `visit.start`: `{ tz: number }`, the local offset in minutes east of UTC (`-new Date().getTimezoneOffset()`).
   - `learn.result`: `LearnResultEvent` from Task A11.
   - `step.passed`: `{ strand: 'r' | 's' | 'm'; step: string }`, recorded fact, natural key `strand + step`.
   - `placement.done` (new type, Decision 4): `{ strand: 'r' | 's' | 'm'; current: string; placed: string[]; side: string[] }`, recorded fact, natural key `strand`.
   - `learn.override`: the four shapes in Task A11 (`profile`, `set-current`, `mark-placed`/`unmark-placed`, `school`).
   - `import.v2`: `{ hash: string; seeds: { strand: 'r' | 's'; item: string; box: 0 | 1 }[]; mathsV2Step?: number }` plus whatever herd fields the save workstream needs. The save workstream maps the v2 `log` into `seeds` with `graphemeItem()` (Task A11): reading seeds from `wish` words, spelling seeds from `name` entries, the last entry per item wins, a first try gives box 1, anything else box 0. The learning fold ignores `mathsV2Step`, because Emma's maths probe starts at M10 anyway (spec 3.5).
   - `learn.result` must carry `moment` and `slot`, and `step` is `null` for name reviews. The core plan (`docs/v3/plan/core.md`, K1 payloads) lists `learn.result` without `moment` and `slot`, with `step: string`, and with extra `visit`, `baby` and `heart` fields; the integrator adds `moment` and `slot` to its schema and either allows `step: null` or this workstream reads `''` as null. The extra core fields are harmless here.
   - The core plan's `learn.override` ops (`set-current`, `mark-placed`, `clear-placed`, `school-on`, `school-off`, `end-placement`, each `{ strand, op, step }`) differ from the four shapes in Task A11. This workstream needs `placed` and `side` on `set-current` (Decision 4) and a `profile` op; the integrator takes the Task A11 shapes into the core schema.
   - The core plan wraps folds as slices. Task A15 provides `createLearnerSlice(c)` for that, and `pendingLearnFacts` replaces the core plan's `passReady`, because it also returns `placement.done`.
3. Events reach `applyLearnEvent` in fold order (hybrid clock, device, sequence), with events of excluded devices already removed. After an `exclude`, a sync or an import, the store refolds with `foldLearner`.
4. The snapshot stores the `Learner` as JSON and includes `LEARNER_FOLD_VERSION` (Task A15) in its version hash, next to the content hash.

**C-STORE (game store `src/game.svelte.ts`):**

1. After every fold step the store calls `pendingLearnFacts(learner, content)` and appends each returned fact once as an event (`step.passed` or `placement.done`), then folds it.
2. The store exposes `learner`, `content`, `now()` and an `rng` (a seeded `Rng` in the test build), and passes `PlanContext` to scenes.
3. When a scene finishes a checked moment, Actions build the event with `learnResultPayload(pick, outcome)` (Task A19) and append it. Nothing else creates `learn.result`.
4. The parent corner writes `learn.override` events built with `setCurrentOverride()` (Task A15) or the literal shapes in Task A11.

**C-AUDIO (audio facade and generation):**

1. A synchronous `hasClip(id: string): boolean` that is true only when the clip is in a loaded manifest (and cached when offline). The store adapts it into `AssetIndex.clip`.
2. Packs registered with `addPack(name, base)`: `words-phase2`, `words-phase3-4`, `words-year1`, `numbers`, `names-t1`, and later `phrases-notes`, `phrases-salon`, `phrases-meadow`. Their `lines.json` files are written by this workstream (Tasks A10, B1, C1, C2). The audio workstream runs the generator on them in this order: core lines, then the words packs and `numbers`, then `names-t1` in file order (sorted by priority) until the name budget is spent.
3. New letter-sound keys in `shared/audio/phonics/index.json`: `es` (the /ɪz/ ending), `yoo` (/juː/ as in new), `uu` (short oo as in book). The validator lists any other missing key under `GPC_SOUND`.
4. `say(id)` call sites use string literals, so the validator can scan for unknown ids.

**C-ART (art pipeline):**

1. `G/public/art/manifest.json` has the shape `{ "pictures": { "<id>": { "file": string, "w": number, "h": number } } }`.
2. A synchronous `hasPicture(id: string): boolean`, adapted into `AssetIndex.picture`.
3. The art workstream draws the ids listed in `G/content/pictures-needed.json` (Task A10), in its priority order. Every word picture shows one single object on white.

**C-NAMING (naming and task planners, spec 7.1 items 6 and 7):**

1. Bells and the name garden take a `Pick` whose carrier is `{ kind: 'spell'; focus: GpcId[] }` and choose a name from `content.names` that contains the focus GPCs and is spellable with `spellingKnowledge()`.
2. Gift gems use `SpellingKnowledge.own` (Task A15). Contrast distractors use `pairsAllowed()`. The gold bell's blocked check uses `checkBlocked()` (Task A4), and its "same phonemes as a list name" check uses `findSamePhonemes()` (Task A3).
3. A spelling moment reports one result per own slot. Actions pass them in `outcome.slots`, so `learn.result.items` holds each own slot's item with its own result.
4. The S10 tray holds `s`, `es` and one slip gem: `ss` while `spellingKnowledge().finalVoicedOk` is false, then `z` on endings that sound /z/ (spec 3.10). Basket and tray distractors never use a pair outside `pairsAllowed()` (spec 3.8 rule 1).

**C-WORLD (scenes and world fold):**

1. Each place asks `nextItem(ctx, request, rng)` with the moment kinds it can host (`ItemRequest.moments`), and shows the returned carrier. Bath Pond requests pass `tags: ['bath']`.
2. Bubbles use `wantsLabelBubble`, `spellingShareLow`, `isTired` and `leastPractisedStrand` (Task A18). The nest uses `nextEgg` and, from 1.1, `goldenEgg`. Door visits use `visitRange` and `shouldVisitDoor`. Roll call and envelopes use `nextNameReviews`. The Jewel Box uses `jewels()` (Task B4).
3. The world passes the number of built doors and the newborn's own door in `ItemRequest.doors`.
4. Scenes run the hint ladder (spec 3.3) and report `helped` after a level 2 hint or the ghost hand, `miss` after a wrong first answer, and `first` otherwise; replays never change the result. They fill `ms` from the moment an answer is possible to the first touch of the chosen object, and `error` with `tagError()` (Task A16). Only the parts of a phrase or note whose items are in `pick.items` are checked; the rest are shown done.

**C-PARENT (parent corner and `tools/report.ts`):** the report screen reads `learnerReport()` (Task A20). `tools/report.ts` and the parent corner rest read `criteria()` (Task C4).

## Contracts I provide (summary)

| Module | Exports |
|---|---|
| `src/core/content/types.ts` | All content types, `RELEASES`, `releaseAtMost` |
| `src/core/content/gpc.ts` | `PHONEMES`, `spell`, `phonemesOf`, `splitUsual`, `baseText`, `isUsual`, `slugName`, `soundKey`, `collapseRuns` |
| `src/core/content/build.ts` | `buildContent(raw): Content` |
| `src/core/content/names.ts` | `findSamePhonemes`, `phonemeDistance`, `nearestNames` (B) |
| `src/core/content/blocklist.ts` | `buildBlocklist`, `checkBlocked`, `phonemeKey` |
| `src/core/content/static.ts` | `content`, `blocklist` for the app |
| `src/core/learning/index.ts` | `foldLearner`, `applyLearnEvent`, `createLearner`, `LEARNER_FOLD_VERSION`, `pendingLearnFacts`, `setCurrentOverride`, `currentStep`, `stepStatus`, `openSchoolSteps`, `sideSteps`, `isPlacing`, `isSchool`, `pairsAllowed`, `readingKnowledge`, `spellingKnowledge`, `tagError`, `learnerReport`, `isSecure`, `jewels` (B), `criteria` (C), all learning types |
| `src/core/planner/index.ts` | `nextItem`, `carrierFor`, `carrierKey`, `nextEgg`, `goldenEgg` (B), `eggKindOf`, `nextNameReviews`, `visitStats`, `isTired`, `spellingShareLow`, `wantsLabelBubble`, `leastPractisedStrand`, `visitRange`, `shouldVisitDoor`, `learnResultPayload`, `mulberry32`, planner types |
| `tools/` | `npm run check:content`, `npm run build:lines`, `npm run list:pictures`, `npm run simulate` |

## File map

| Path | One responsibility |
|---|---|
| `G/content/release.json` | The release this build loads (`1.0`, `1.1`, `1.2`) |
| `G/content/gpcs.json` | Every grapheme-phoneme correspondence: gem text, phonemes, vowel colour, letter-sound key, fluency |
| `G/content/moments.json` | Every moment kind: strand, release, which assets it needs, egg kind |
| `G/content/pairs.json` | Contrast pairs for a Dutch-speaking learner and their twin words, with the British model lines |
| `G/content/ladders/reading.json` | Reading ladder R01 to R54 with items, levels, moments, flags and jewel faces |
| `G/content/ladders/spelling.json` | Spelling ladder S01 to S45, same shape |
| `G/content/ladders/maths.json` | Maths ladder M01 to M48, same shape, items carry maths tasks |
| `G/content/ladders/budget.json` | Every planner and mastery constant, the start profiles and door ranges |
| `G/content/words/phase2.json` | Words for Phase 2 steps (pack `words-phase2`) |
| `G/content/words/phase3-4.json` | Words for Phase 3 and 4 steps (pack `words-phase3-4`) |
| `G/content/words/year1.json` | Workbook Phase 5 words and every plural (pack `words-year1`) |
| `G/content/names/tier1.json` | About 1,000 tier 1 names with GPC splits and priorities |
| `G/content/phrases/notes.json` | Notes to Lumi (release 1.1) |
| `G/content/phrases/salon.json` | Salon card lines (release 1.2) |
| `G/content/phrases/meadow.json` | Asking bubbles, two-state wishes and tricky-word acts (release 1.2) |
| `G/content/pictures-needed.json` | Generated list of picture ids and subjects for the art workstream |
| `shared/blocklist.json` | Rude words in English and Dutch, checked by sound |
| `G/src/core/content/types.ts` | Raw JSON types, the built `Content` type, `Budget`, release helpers |
| `G/src/core/content/gpc.ts` | GPC helpers: spelling, phonemes, greedy split, slugs |
| `G/src/core/content/build.ts` | Turns raw JSON into indexed `Content`, computes word items and steps |
| `G/src/core/content/names.ts` | Name bank lookups by phonemes |
| `G/src/core/content/blocklist.ts` | Blocklist build and the by-sound check |
| `G/src/core/content/static.ts` | The app's content loader through Vite JSON imports |
| `G/src/core/learning/types.ts` | Learner state, learning events, results, slots |
| `G/src/core/learning/ids.ts` | Item id helpers |
| `G/src/core/learning/time.ts` | Local day from time and offset |
| `G/src/core/learning/leitner.ts` | Box transitions and due rules |
| `G/src/core/learning/fluency.ts` | Fluency medians and the fast rule |
| `G/src/core/learning/scaffold.ts` | Scaffold level moves |
| `G/src/core/learning/mastery.ts` | Pass window, pass check, reopen and close |
| `G/src/core/learning/placement.ts` | The hidden probe: search list, bisection, end rule |
| `G/src/core/learning/status.ts` | Step status, current step, side and school steps, knowledge, pending facts, overrides |
| `G/src/core/learning/fold.ts` | `createLearner`, `applyLearnEvent`, `foldLearner` |
| `G/src/core/learning/errors.ts` | Error tagging (`dutch`, `vowel`, `reversal`, `off-by-one`) |
| `G/src/core/learning/report.ts` | The parent corner's per-strand report |
| `G/src/core/learning/jewels.ts` | Jewels from passed and placed steps (1.1) |
| `G/src/core/learning/criteria.ts` | Success criteria C2 and L1 to L5 from the event log (1.2) |
| `G/src/core/learning/index.ts` | Public exports of the learning engine |
| `G/src/core/planner/types.ts` | `PlanContext`, `ItemRequest`, `Pick`, `Carrier`, `AssetIndex`, `Rng` |
| `G/src/core/planner/rng.ts` | Seeded random (`mulberry32`) |
| `G/src/core/planner/carriers.ts` | The carrier for one item at one moment kind |
| `G/src/core/planner/select.ts` | `nextItem`: probe, slot mix, caps, school share, fallbacks |
| `G/src/core/planner/visit.ts` | Visit signals: counts, tired, spelling share, label bubble, door range |
| `G/src/core/planner/eggs.ts` | Egg kind per moment, `nextEgg`, `goldenEgg` |
| `G/src/core/planner/names.ts` | Name review picks for roll call and envelopes |
| `G/src/core/planner/result.ts` | `learnResultPayload`: a pick plus an outcome becomes a `learn.result` payload |
| `G/src/core/planner/index.ts` | Public exports of the planner |
| `G/tools/lib/read-content.ts` | Node file reader for content, blocklist, lines, manifests, picture ids, code clip ids |
| `G/tools/lib/validate.ts` | Pure content validation returning findings |
| `G/tools/validate-content.ts` | CLI for `npm run check:content` |
| `G/tools/lib/lines.ts` | Line entries for word, number, name and phrase packs |
| `G/tools/build-lines.ts` | CLI that writes the packs' `lines.json` |
| `G/tools/list-pictures.ts` | CLI that writes `content/pictures-needed.json` |
| `G/tools/propose-splits.ts` | Authoring helper: draft GPC splits for a plain list of names or words |
| `G/tools/lib/sim.ts` | The simulated learner |
| `G/tools/simulate.ts` | CLI that prints the simulated learner report |
| `G/public/audio/<pack>/lines.json` | Generator input for the packs in Decision 14 (written by `build:lines`) |
| `G/tests/fixtures/mini.ts` | A small synthetic content pack for unit tests |
| `G/tests/fixtures/events.ts` | Event builders and time constants for tests |
| `G/tests/content/*.test.ts` | GPC, build, blocklist, names, validator, lines and real-content tests |
| `G/tests/learning/*.test.ts` | Leitner, fluency, scaffold, mastery, placement, fold, status, errors, report, jewels, criteria, merge, simulation tests |
| `G/tests/planner/*.test.ts` | Selection, carriers, visit signals, eggs, names, result payload tests |

---

# Wave A: first playable (spec 7.1 items 4 and 5)

Wave A must be complete before Wave B starts. Tasks A1 to A5 are code with tests. A6 to A10 are content data, each gated by the validator. A11 to A21 are the engine and planner. A22 is the gate.

Order and parallelism. Data track: A1, then A2, then A3, A4 and A5 in parallel, then A6, then A7, A8 and A9 in parallel, then A10. Engine track: A11 to A15 in order, then A16 and A17 in parallel, then A18, A19 and A20 in parallel. The engine track only needs A1 and A2, so it runs next to the data track. A21 needs both tracks, and A22 comes last.

### Task A1: Content types and GPC helpers

**Files:**
- Create: `G/src/core/content/types.ts`
- Create: `G/src/core/content/gpc.ts`
- Test: `G/tests/content/gpc.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every type below, `RELEASES`, `MOMENT_KINDS`, `releaseAtMost(r, build)`, and from `gpc.ts`: `PHONEMES`, `spell(gpcs, table)`, `phonemesOf(gpcs, table)`, `splitUsual(word, table)`, `baseText(id)`, `isUsual(id)`, `slugName(name)`, `soundKey(id, table)`, `collapseRuns(phonemes)`.

- [ ] **Step 1: Write `types.ts` in full** (types only plus three constants; no test needed for types alone)

```ts
// G/src/core/content/types.ts
export type Strand = 'r' | 's' | 'm';
export type LearnStrand = Strand | 'name';
export type StepId = string;      // "R01", "R04D", "S10", "M09"
export type GpcId = string;       // "ai", "ow.oa", "a-e", "y.ee"
export type Phoneme = string;     // one of PHONEMES in gpc.ts
export type ItemId = string;      // "r:g:ai", "s:end:es", "m:miss:10-7", "name:<key>"

export type Release = '1.0' | '1.1' | '1.2' | '1.3' | 'later';
export const RELEASES: readonly Release[] = ['1.0', '1.1', '1.2', '1.3', 'later'];
/** True when something marked `r` is part of a build of release `build`. 'later' is never part of a build. */
export function releaseAtMost(r: Release, build: Release): boolean {
  return r !== 'later' && RELEASES.indexOf(r) <= RELEASES.indexOf(build);
}

export type FluencyType = 'grapheme' | 'tricky' | 'bond' | 'fact' | 'table';
export type ItemKind =
  | 'grapheme' | 'tricky' | 'ending' | 'pair' | 'cluster' | 'pattern' | 'suffix' | 'prefix'
  | 'mark' | 'capital' | 'and' | 'sentence' | 'adjective' | 'letter' | 'first-sound'
  | 'subitise' | 'numeral' | 'compare' | 'bond' | 'fact' | 'm-pattern';

export type MomentKind =
  | 'wish' | 'bath-wish' | 'twin-wish' | 'one-or-many' | 'tricky-act' | 'basket-and' | 'basket-adj'
  | 'salon-card' | 'asking-bubble' | 'two-state-wish'
  | 'first-sound' | 'naming-bells' | 'naming-garden' | 'label' | 'label-plural' | 'sign' | 'note' | 'letter-order'
  | 'egg-moon' | 'egg-small-nest' | 'egg-two-stone' | 'egg-blanket' | 'egg-berry' | 'egg-snow'
  | 'door-visit' | 'roll-call-door' | 'trim' | 'beads' | 'post-pin' | 'post-sash' | 'parcel'
  | 'roll-call' | 'envelope';
export const MOMENT_KINDS: readonly MomentKind[] = [
  'wish', 'bath-wish', 'twin-wish', 'one-or-many', 'tricky-act', 'basket-and', 'basket-adj',
  'salon-card', 'asking-bubble', 'two-state-wish',
  'first-sound', 'naming-bells', 'naming-garden', 'label', 'label-plural', 'sign', 'note', 'letter-order',
  'egg-moon', 'egg-small-nest', 'egg-two-stone', 'egg-blanket', 'egg-berry', 'egg-snow',
  'door-visit', 'roll-call-door', 'trim', 'beads', 'post-pin', 'post-sash', 'parcel',
  'roll-call', 'envelope',
];
export type EggKind = 'moon' | 'small-nest' | 'two-stone' | 'blanket' | 'berry' | 'snow';

export type MathsTask =
  | { op: 'subitise'; n: number }
  | { op: 'numeral'; n: number }
  | { op: 'compare'; want: 'fewest' | 'most' }
  | { op: 'more'; n: number }                       // one more than n
  | { op: 'less'; n: number }                       // one less than n
  | { op: 'missing'; whole: number; part: number }  // part is shown, she places whole - part
  | { op: 'pair'; a: number; b: number }            // a + b = 10, a <= b
  | { op: 'add'; a: number; b: number }             // a >= b, she counts on from a
  | { op: 'take'; a: number; b: number }            // a - b
  | { op: 'pattern'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB' };

export type RawGpc = {
  id: GpcId;
  text: string;          // letters on the gem; a split digraph is "a-e"
  phonemes: Phoneme[];
  vowel: boolean;        // pink gem
  sound: string | null;  // key in shared/audio/phonics/index.json "sounds", or null
  fluency: boolean;      // Phase 2 and 3 graphemes are fluency items
  split?: boolean;       // split digraph a-e, i-e, o-e, u-e, e-e
};

export type RawItem = {
  id: ItemId;
  kind: ItemKind;
  fluency?: FluencyType;
  gpc?: GpcId;                       // grapheme and first-sound items
  pair?: string;                     // pair items: id in pairs.json
  cluster?: string;                  // "-st", "fr-"
  ending?: 's' | 'es' | 'none';      // ending items
  affix?: 'ing' | 'ed' | 'est' | 'er' | 'un';
  pattern?: string;                  // pattern, mark, capital, sentence, adjective and letter items
  word?: string;                     // tricky items
  task?: MathsTask;                  // maths items
};

export type RawStep = {
  id: StepId;
  title: string;
  release: Release;                  // the earliest release of its moments, or 'later'
  levels: 1 | 2 | 3;                 // scaffold levels it declares; top = levels
  moments: MomentKind[];
  face: string[];                    // what its jewel shows: gem texts, marks or numbers
  school?: boolean;
  contrast?: boolean;
  display?: boolean;                 // shown, never checked; never the current step
  items: RawItem[];
};
export type RawLadder = { strand: Strand; steps: RawStep[] };

export type WordKind = 'thing' | 'station' | 'adjective' | 'other';
export type WordPackName = 'words-phase2' | 'words-phase3-4' | 'words-year1';
export type RawWord = {
  w: string;                         // lowercase, as printed
  gpcs: GpcId[];
  pic: string | null;                // "w-<w>" or null when the word is never pictured
  kind: WordKind;
  prompt?: string;                   // subject for the art prompt, "a toy fox"
  tags?: string[];                   // "bath", "food", "clothes", "toy", "care", "found"
  syllables?: number;                // default 1
  compound?: boolean;
  affix?: 'ing' | 'ed' | 'est' | 'er' | 'un';
  plural?: { w: string; ending: 's' | 'es' };
  irregular?: { w: string };         // mouse -> mice, read only
};
export type RawWordPack = { pack: WordPackName; words: RawWord[] };

export type NameSource = 'uk' | 'cyprus' | 'fantasy' | 'nature' | 'decodable' | 'v2';
export type RawName = {
  name: string;                      // "Bella", capital first
  gpcs: GpcId[];
  source: NameSource;
  priority: 1 | 2 | 3;               // 1 is generated first
  pic?: 'flowers' | 'gems' | 'sky' | 'sweets';
  respell?: string;                  // what the generator sends instead of the name, when Elizabeth mispronounces it
};
export type RawNameBank = { tier: 1; names: RawName[] };

export type PairKind = 'vowel' | 'voicing' | 'consonant' | 'letter-value' | 'magic-e' | 'number';
export type RawPair = {
  id: string;
  gpcs: GpcId[];
  position: 'any' | 'initial' | 'final';
  kind: PairKind;
  unlock: Partial<Record<Strand, StepId>>;   // the step whose pass allows the pair as a distractor
};
export type RawTwin = { pair: string; a: string; b: string; model?: { a: string; b: string } };
export type RawPairs = { pairs: RawPair[]; twins: RawTwin[] };

export type RawMoment = { id: MomentKind; strand: LearnStrand; release: Release; needs: ('pic' | 'clip')[]; egg?: EggKind };
export type RawMoments = { moments: RawMoment[] };

export type PhraseAct =
  | { kind: 'give'; target: string[]; options: string[] }   // picture ids
  | { kind: 'choose-speaker'; speakers: { text: string; mark: 'stop' | 'q' | 'bang' }[]; answer: number }
  | { kind: 'toggle'; thing: string; to: 'on' | 'off' }
  | { kind: 'push-pull'; to: 'push' | 'pull' }
  | { kind: 'his-her'; to: 'he' | 'she'; thing: string }
  | { kind: 'gate'; to: 'go' | 'no' }
  | { kind: 'put'; thing: string; where: 'on' | 'in' }
  | { kind: 'note'; cards: string[]; mark: 'stop' | 'q' | 'bang'; spell: number; answer: string | null }
  | { kind: 'beads'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB'; colours: string[] };
export type PhrasePackName = 'phrases-notes' | 'phrases-salon' | 'phrases-meadow';
export type RawPhrase = {
  id: string;                        // kebab-case, unique across packs
  moment: MomentKind;
  text: string;                      // British English, as printed
  items: ItemId[];
  words: string[];                   // word ids whose pictures the act needs
  act: PhraseAct;
  clip: boolean;                     // Elizabeth reads it: line "phrase-<id>"
};
export type RawPhrasePack = { pack: PhrasePackName; phrases: RawPhrase[] };

export type ProfileStart = { lo: StepId; probe: StepId | null; floor: StepId };
export type Profile = { r: ProfileStart; s: ProfileStart; m: ProfileStart; school: StepId[] };
export type Budget = {
  share: { current: number; review: number; mixed: number };
  oneShare: number;
  newPerStrandPerDay: number;
  strandVisitCap: number;
  visitCap: number;
  tiredEggMinBox: number;
  spellShareMin: number;
  spellShareAfter: number;
  box0Gap: number;
  box1MinHours: number;
  boxDays: [number, number, number, number];
  retiredDays: number;
  fluencyWindow: number;
  fluencyCeilingMs: number;
  fluencyRecomputeDays: number;
  fluencyMinSamples: number;
  scaffoldUp: number;
  scaffoldDown: number;
  passWindow: number;
  passFirst: number;
  passDays: number;
  reopenWindow: number;
  reopenMinFirst: number;
  closeWindow: number;
  closeFirst: number;
  reopenWeight: number;
  placement: { maxItems: number; maxVisits: number; itemsPerProbe: number; visit1MaxJump: number };
  defaultProfile: string;
  profiles: Record<string, Profile>;
  doorRanges: { step: StepId; max: number }[];
  visitSecureEvery: number;
  recentCarriers: number;
};

export type RawContent = {
  release: Release;
  gpcs: RawGpc[];
  ladders: RawLadder[];
  words: RawWordPack[];
  names: RawNameBank;
  pairs: RawPairs;
  moments: RawMoments;
  budget: Budget;
  phrases: RawPhrasePack[];
};

export type Step = RawStep & { strand: Strand; index: number; loaded: boolean; top: 1 | 2 | 3 };
/** carriers: for reading items, how many carriers this build has that can serve the item at its own step
 *  (null for spelling, maths and name items, which are always servable). An item with 0 never blocks a pass. */
export type Item = RawItem & { strand: Strand; step: StepId; carriers: number | null };
export type Word = RawWord & {
  pack: WordPackName;
  clip: string;                      // "word-<w>"
  pluralClip: string | null;         // "word-<plural>"
  rItems: ItemId[];
  sItems: ItemId[];
  rStep: StepId | null;              // highest reading step among rItems; null when a GPC has no reading item
  sStep: StepId | null;
};
export type NameEntry = RawName & { slug: string; phonemes: Phoneme[]; first: Phoneme };
export type Moment = RawMoment & { loaded: boolean };
export type Phrase = RawPhrase & { pack: PhrasePackName; clipId: string | null; loaded: boolean };
export type Content = {
  release: Release;
  budget: Budget;
  gpcs: Record<GpcId, RawGpc>;
  steps: Record<StepId, Step>;
  order: Record<Strand, StepId[]>;   // every step in ladder order
  loaded: Record<Strand, StepId[]>;  // steps with loaded === true, in order
  items: Record<ItemId, Item>;
  words: Record<string, Word>;
  wordsByItem: Record<ItemId, string[]>;
  names: NameEntry[];
  pairs: Record<string, RawPair>;
  twins: Record<string, RawTwin[]>;
  moments: Record<string, Moment>;
  phrases: Record<string, Phrase>;
  phrasesByItem: Record<ItemId, string[]>;
};
```

- [ ] **Step 2: Write the failing GPC test**

```ts
// G/tests/content/gpc.test.ts
import { describe, it, expect } from 'vitest';
import { spell, phonemesOf, splitUsual, baseText, isUsual, slugName, soundKey, collapseRuns, PHONEMES } from '../../src/core/content/gpc.ts';
import type { RawGpc } from '../../src/core/content/types.ts';

const rows: RawGpc[] = [
  { id: 'c', text: 'c', phonemes: ['k'], vowel: false, sound: 'c', fluency: true },
  { id: 'k', text: 'k', phonemes: ['k'], vowel: false, sound: 'k', fluency: true },
  { id: 'ck', text: 'ck', phonemes: ['k'], vowel: false, sound: 'ck', fluency: true },
  { id: 'a', text: 'a', phonemes: ['a'], vowel: true, sound: 'a', fluency: true },
  { id: 'a-e', text: 'a-e', phonemes: ['ai'], vowel: true, sound: 'ai', fluency: false, split: true },
  { id: 'e', text: 'e', phonemes: ['e'], vowel: true, sound: 'e', fluency: true },
  { id: 'p', text: 'p', phonemes: ['p'], vowel: false, sound: 'p', fluency: true },
  { id: 'ph', text: 'ph', phonemes: ['f'], vowel: false, sound: 'f', fluency: false },
  { id: 'f', text: 'f', phonemes: ['f'], vowel: false, sound: 'f', fluency: true },
  { id: 'u', text: 'u', phonemes: ['u'], vowel: true, sound: 'u', fluency: true },
  { id: 'x', text: 'x', phonemes: ['k', 's'], vowel: false, sound: 'x', fluency: true },
  { id: 'o', text: 'o', phonemes: ['o'], vowel: true, sound: 'o', fluency: true },
  { id: 'ow', text: 'ow', phonemes: ['ow'], vowel: true, sound: 'ow', fluency: true },
  { id: 'ow.oa', text: 'ow', phonemes: ['oa'], vowel: true, sound: 'oa', fluency: false },
  { id: 'n', text: 'n', phonemes: ['n'], vowel: false, sound: 'n', fluency: true },
  { id: 's', text: 's', phonemes: ['s'], vowel: false, sound: 's', fluency: true },
  { id: 'l', text: 'l', phonemes: ['l'], vowel: false, sound: 'l', fluency: true },
  { id: 'i', text: 'i', phonemes: ['i'], vowel: true, sound: 'i', fluency: true },
  { id: 'y.ee', text: 'y', phonemes: ['ee'], vowel: true, sound: 'ee', fluency: false },
  { id: 'igh', text: 'igh', phonemes: ['igh'], vowel: true, sound: 'igh', fluency: true },
  { id: 'g', text: 'g', phonemes: ['g'], vowel: false, sound: 'g', fluency: true },
  { id: 'h', text: 'h', phonemes: ['h'], vowel: false, sound: 'h', fluency: true },
  { id: 't', text: 't', phonemes: ['t'], vowel: false, sound: 't', fluency: true },
];
const T = Object.fromEntries(rows.map(g => [g.id, g]));

describe('spell', () => {
  it('joins gem texts', () => expect(spell(['f', 'o', 'x'], T)).toBe('fox'));
  it('puts the e of a split digraph after the next GPC', () => expect(spell(['c', 'a-e', 'k'], T)).toBe('cake'));
  it('uses the base text of an alternative', () => {
    expect(spell(['s', 'n', 'ow.oa'], T)).toBe('snow');
    expect(spell(['l', 'i', 'l', 'y.ee'], T)).toBe('lily');
  });
  it('throws on an unknown GPC and on a split digraph at the end', () => {
    expect(() => spell(['q'], T)).toThrow(/Unknown GPC q/);
    expect(() => spell(['c', 'a-e'], T)).toThrow(/needs a GPC after it/);
  });
});

describe('phonemesOf', () => {
  it('expands x into two phonemes', () => expect(phonemesOf(['f', 'o', 'x'], T)).toEqual(['f', 'o', 'k', 's']));
  it('reads alternatives by their own phoneme', () => expect(phonemesOf(['s', 'n', 'ow.oa'], T)).toEqual(['s', 'n', 'oa']));
});

describe('splitUsual', () => {
  it('splits greedily over usual GPCs, longest first', () => {
    expect(splitUsual('fuck', T)).toEqual(['f', 'u', 'ck']);
    expect(splitUsual('phuk', T)).toEqual(['ph', 'u', 'k']);
    expect(splitUsual('night', T)).toEqual(['n', 'igh', 't']);
    expect(splitUsual('Fox', T)).toEqual(['f', 'o', 'x']);
  });
  it('never uses alternatives or split digraphs', () => expect(splitUsual('snow', T)).toEqual(['s', 'n', 'ow']));
  it('returns null when a letter has no GPC', () => expect(splitUsual('qq', T)).toBeNull());
});

describe('small helpers', () => {
  it('baseText and isUsual', () => {
    expect(baseText('ow.oa')).toBe('ow');
    expect(isUsual('ow.oa')).toBe(false);
    expect(isUsual('ow')).toBe(true);
  });
  it('slugName keeps lowercase letters only', () => {
    expect(slugName('Lily-Rose')).toBe('lilyrose');
    expect(slugName("O'Neil")).toBe('oneil');
  });
  it('soundKey reads the phonics key', () => {
    expect(soundKey('ow.oa', T)).toBe('oa');
    expect(soundKey('zz', T)).toBeNull();
  });
  it('collapseRuns merges repeated phonemes', () => expect(collapseRuns(['f', 'f', 'u', 'u', 'k'])).toEqual(['f', 'u', 'k']));
  it('the phoneme inventory has the schwa and no duplicates', () => {
    expect(PHONEMES).toContain('@');
    expect(new Set(PHONEMES).size).toBe(PHONEMES.length);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run tests/content/gpc.test.ts`
Expected: FAIL, cannot resolve `../../src/core/content/gpc.ts`.

- [ ] **Step 4: Implement `gpc.ts`**

```ts
// G/src/core/content/gpc.ts
import type { GpcId, Phoneme, RawGpc } from './types.ts';

export const PHONEMES: readonly Phoneme[] = [
  'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'th', 's', 'z', 'sh', 'zh', 'ch', 'j', 'h', 'm', 'n', 'ng', 'l', 'r', 'w', 'y',
  'a', 'e', 'i', 'o', 'u', 'uu', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', '@',
];

type Table = Record<GpcId, RawGpc>;

function get(id: GpcId, table: Table): RawGpc {
  const g = table[id];
  if (!g) throw new Error(`Unknown GPC ${id}`);
  return g;
}

export function spell(gpcs: readonly GpcId[], table: Table): string {
  let out = '';
  let pendingE = false;
  gpcs.forEach((id, i) => {
    const g = get(id, table);
    if (g.split) {
      if (i === gpcs.length - 1) throw new Error(`Split digraph ${id} needs a GPC after it`);
      out += g.text[0];
      pendingE = true;
      return;
    }
    out += g.text;
    if (pendingE) { out += 'e'; pendingE = false; }
  });
  return out;
}

export function phonemesOf(gpcs: readonly GpcId[], table: Table): Phoneme[] {
  return gpcs.flatMap(id => get(id, table).phonemes);
}

export function splitUsual(word: string, table: Table): GpcId[] | null {
  const usual = new Set(Object.values(table).filter(g => isUsual(g.id) && !g.split && g.id === g.text).map(g => g.id));
  const s = word.toLowerCase();
  const out: GpcId[] = [];
  let i = 0;
  while (i < s.length) {
    let hit: string | null = null;
    for (let len = 4; len >= 1 && !hit; len--) {
      const part = s.slice(i, i + len);
      if (part.length === len && usual.has(part)) hit = part;
    }
    if (!hit) return null;
    out.push(hit);
    i += hit.length;
  }
  return out;
}

export const baseText = (id: GpcId): string => id.split('.')[0];
export const isUsual = (id: GpcId): boolean => !id.includes('.');
export const slugName = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');
export const soundKey = (id: GpcId, table: Table): string | null => table[id]?.sound ?? null;
export const collapseRuns = (p: readonly Phoneme[]): Phoneme[] => p.filter((x, i) => i === 0 || x !== p[i - 1]);
```

- [ ] **Step 5: Run the test and see it pass**

Run: `npx vitest run tests/content/gpc.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/content/types.ts games/moon-meadow-home/src/core/content/gpc.ts games/moon-meadow-home/tests/content/gpc.test.ts
git commit -m "Add content types and grapheme helpers for v3"
```

### Task A2: Content builder and the mini fixture

**Files:**
- Create: `G/src/core/content/build.ts`
- Create: `G/tests/fixtures/mini.ts`
- Test: `G/tests/content/build.test.ts`

**Interfaces:**
- Consumes: Task A1 types and `spell`, `phonemesOf`, `baseText`, `slugName`.
- Produces: `buildContent(raw: RawContent): Content`, `stepIndex(c: Content, step: StepId): number`, and the fixture exports `MINI_GPCS`, `MINI_BUDGET`, `miniRaw(release?: Release): RawContent`, `miniContent(release?: Release): Content`. Every later unit test uses the fixture.

- [ ] **Step 1: Write the fixture** (it is test data, written before the test that uses it)

```ts
// G/tests/fixtures/mini.ts
import { buildContent } from '../../src/core/content/build.ts';
import type {
  Budget, Content, MomentKind, RawContent, RawGpc, RawItem, RawMoment, RawStep, RawWord, Release, LearnStrand, EggKind,
} from '../../src/core/content/types.ts';

const g = (id: string, phonemes: string[], vowel = false, extra: Partial<RawGpc> = {}): RawGpc =>
  ({ id, text: id.split('.')[0], phonemes, vowel, sound: id.split('.')[0], fluency: true, ...extra });

export const MINI_GPCS: RawGpc[] = [
  g('s', ['s']), g('a', ['a'], true), g('t', ['t']), g('p', ['p']),
  g('i', ['i'], true), g('n', ['n']), g('m', ['m']), g('d', ['d']),
  g('g', ['g']), g('o', ['o'], true), g('c', ['k']), g('k', ['k']), g('ck', ['k']),
  g('e', ['e'], true), g('u', ['u'], true), g('r', ['r']),
  g('h', ['h']), g('b', ['b']), g('f', ['f']), g('l', ['l']),
  g('x', ['k', 's']), g('sh', ['sh']),
  g('ai', ['ai'], true), g('ee', ['ee'], true),
  g('ay', ['ai'], true, { sound: 'ai', fluency: false }),
];

const gi = (strand: 'r' | 's', ids: string[]): RawItem[] =>
  ids.map(x => ({ id: `${strand}:g:${x}`, kind: 'grapheme', fluency: 'grapheme', gpc: x }));
const step = (id: string, items: RawItem[], moments: MomentKind[], extra: Partial<RawStep> = {}): RawStep =>
  ({ id, title: id, release: '1.0', levels: 3, moments, face: [id], items, ...extra });
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const READING: RawStep[] = [
  step('R01', gi('r', ['s', 'a', 't', 'p']), ['wish', 'bath-wish']),
  step('R02', gi('r', ['i', 'n', 'm', 'd']), ['wish', 'bath-wish']),
  step('R03', gi('r', ['g', 'o', 'c', 'k', 'ck']), ['wish', 'bath-wish']),
  step('R04', gi('r', ['e', 'u', 'r']), ['wish', 'bath-wish']),
  step('R04D', [{ id: 'r:pair:a-e-u', kind: 'pair', pair: 'a-e-u' }], ['twin-wish'], { contrast: true }),
  step('R05', gi('r', ['h', 'b', 'f', 'l']), ['wish', 'bath-wish']),
  step('R06', [], ['wish'], { display: true }),
  step('R08', gi('r', ['x']), ['wish', 'bath-wish']),
  step('R10', gi('r', ['sh']), ['wish', 'bath-wish']),
  step('R13', gi('r', ['ai', 'ee']), ['wish', 'bath-wish']),
  step('R19', [
    { id: 'r:end:s', kind: 'ending', ending: 's' },
    { id: 'r:end:es', kind: 'ending', ending: 'es' },
    { id: 'r:end:none', kind: 'ending', ending: 'none' },
  ], ['one-or-many'], { school: true }),
  step('R21', [
    { id: 'r:cl:-st', kind: 'cluster', cluster: '-st' },
    { id: 'r:cl:-nd', kind: 'cluster', cluster: '-nd' },
  ], ['wish', 'bath-wish']),
  step('R30', [{ id: 'r:g:ay', kind: 'grapheme', gpc: 'ay' }], ['salon-card'], { release: '1.2' }),
];

const SPELLING: RawStep[] = [
  step('S01', ['s', 'm', 't'].map(x => ({ id: `s:fs:${x}`, kind: 'first-sound' as const, gpc: x })), ['first-sound']),
  step('S02', gi('s', ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']), ['naming-bells', 'label']),
  step('S03', gi('s', ['g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r']), ['naming-bells', 'label']),
  step('S03D', [{ id: 's:pair:a-e-u', kind: 'pair', pair: 'a-e-u' }], ['label'], { contrast: true }),
  step('S04', gi('s', ['h', 'b', 'f', 'l']), ['naming-bells', 'label']),
  step('S09', gi('s', ['ai', 'ee']), ['naming-bells', 'label']),
  step('S10', [
    { id: 's:end:s', kind: 'ending', ending: 's' },
    { id: 's:end:es', kind: 'ending', ending: 'es' },
  ], ['label-plural'], { school: true }),
  step('S12', [
    { id: 's:cl:-st', kind: 'cluster', cluster: '-st' },
    { id: 's:cl:-nd', kind: 'cluster', cluster: '-nd' },
  ], ['naming-bells', 'label']),
];

const MATHS: RawStep[] = [
  step('M01', range(1, 3).map(n => ({ id: `m:sub:${n}`, kind: 'subitise' as const, task: { op: 'subitise' as const, n } })), ['egg-moon'], { levels: 1 }),
  step('M02', range(1, 10).map(n => ({ id: `m:num:${n}`, kind: 'numeral' as const, task: { op: 'numeral' as const, n } })), ['egg-moon', 'door-visit']),
  step('M03', [{ id: 'm:cmp:fewest', kind: 'compare', task: { op: 'compare', want: 'fewest' } }], ['post-pin'], { release: '1.1', levels: 1 }),
  step('M05', range(1, 4).map(p => ({ id: `m:miss:5-${p}`, kind: 'bond' as const, fluency: 'bond' as const, task: { op: 'missing' as const, whole: 5, part: p } })), ['egg-small-nest']),
  step('M07', range(11, 20).map(n => ({ id: `m:num:${n}`, kind: 'numeral' as const, task: { op: 'numeral' as const, n } })), ['door-visit']),
  step('M09', range(1, 9).map(p => ({ id: `m:miss:10-${p}`, kind: 'bond' as const, fluency: 'bond' as const, task: { op: 'missing' as const, whole: 10, part: p } })), ['egg-moon']),
  step('M10', range(1, 5).map(a => ({ id: `m:pair:${a}+${10 - a}`, kind: 'bond' as const, fluency: 'bond' as const, task: { op: 'pair' as const, a, b: 10 - a } })), ['egg-two-stone']),
];

const w = (word: string, gpcs: string[], extra: Partial<RawWord> = {}): RawWord =>
  ({ w: word, gpcs, pic: `w-${word}`, kind: 'thing', ...extra });
const WORDS: RawWord[] = [
  w('tap', ['t', 'a', 'p']), w('pat', ['p', 'a', 't']), w('sat', ['s', 'a', 't'], { kind: 'other', pic: null }),
  w('pin', ['p', 'i', 'n'], { plural: { w: 'pins', ending: 's' } }), w('map', ['m', 'a', 'p']), w('pan', ['p', 'a', 'n']),
  w('dip', ['d', 'i', 'p'], { kind: 'other', pic: null }),
  w('dog', ['d', 'o', 'g'], { prompt: 'a toy dog' }), w('cot', ['c', 'o', 't']), w('sock', ['s', 'o', 'ck']),
  w('pen', ['p', 'e', 'n']), w('net', ['n', 'e', 't']), w('nut', ['n', 'u', 't']),
  w('cup', ['c', 'u', 'p'], { plural: { w: 'cups', ending: 's' }, tags: ['bath'] }), w('cap', ['c', 'a', 'p']),
  w('red', ['r', 'e', 'd'], { kind: 'adjective', pic: null }),
  w('hat', ['h', 'a', 't'], { plural: { w: 'hats', ending: 's' } }), w('hut', ['h', 'u', 't']),
  w('bun', ['b', 'u', 'n'], { plural: { w: 'buns', ending: 's' } }), w('bed', ['b', 'e', 'd']), w('log', ['l', 'o', 'g']),
  w('fox', ['f', 'o', 'x'], { plural: { w: 'foxes', ending: 'es' }, prompt: 'a toy fox' }),
  w('box', ['b', 'o', 'x'], { plural: { w: 'boxes', ending: 'es' } }),
  w('ship', ['sh', 'i', 'p'], { tags: ['bath'] }), w('dish', ['d', 'i', 'sh'], { plural: { w: 'dishes', ending: 'es' } }),
  w('rain', ['r', 'ai', 'n']), w('bee', ['b', 'ee'], { prompt: 'a toy bee' }),
  w('nest', ['n', 'e', 's', 't']), w('hand', ['h', 'a', 'n', 'd']),
  w('tray', ['t', 'r', 'ay']),
];

export const MINI_BUDGET: Budget = {
  share: { current: 0.5, review: 0.3, mixed: 0.2 },
  oneShare: 0.34,
  newPerStrandPerDay: 3,
  strandVisitCap: 15,
  visitCap: 30,
  tiredEggMinBox: 3,
  spellShareMin: 0.2,
  spellShareAfter: 5,
  box0Gap: 2,
  box1MinHours: 4,
  boxDays: [2, 4, 8, 16],
  retiredDays: 42,
  fluencyWindow: 50,
  fluencyCeilingMs: 3000,
  fluencyRecomputeDays: 7,
  fluencyMinSamples: 10,
  scaffoldUp: 3,
  scaffoldDown: 2,
  passWindow: 15,
  passFirst: 12,
  passDays: 2,
  reopenWindow: 10,
  reopenMinFirst: 7,
  closeWindow: 10,
  closeFirst: 8,
  reopenWeight: 2,
  placement: { maxItems: 10, maxVisits: 4, itemsPerProbe: 2, visit1MaxJump: 2 },
  defaultProfile: 'year1',
  profiles: {
    year1: {
      r: { lo: 'R13', probe: 'R21', floor: 'R01' },
      s: { lo: 'S09', probe: 'S12', floor: 'S01' },
      m: { lo: 'M01', probe: 'M10', floor: 'M01' },
      school: ['R19', 'S10'],
    },
    fresh: {
      r: { lo: 'R01', probe: null, floor: 'R01' },
      s: { lo: 'S01', probe: null, floor: 'S01' },
      m: { lo: 'M01', probe: null, floor: 'M01' },
      school: [],
    },
  },
  doorRanges: [{ step: 'M02', max: 10 }, { step: 'M07', max: 20 }, { step: 'M27', max: 50 }, { step: 'M28', max: 100 }],
  visitSecureEvery: 3,
  recentCarriers: 6,
};

const mo = (id: MomentKind, strand: LearnStrand, release: Release = '1.0', needs: ('pic' | 'clip')[] = [], egg?: EggKind): RawMoment =>
  (egg ? { id, strand, release, needs, egg } : { id, strand, release, needs });

export function miniRaw(release: Release = '1.0'): RawContent {
  return {
    release,
    gpcs: MINI_GPCS,
    ladders: [{ strand: 'r', steps: READING }, { strand: 's', steps: SPELLING }, { strand: 'm', steps: MATHS }],
    words: [{ pack: 'words-phase2', words: WORDS }],
    names: {
      tier: 1,
      names: [
        { name: 'Pip', gpcs: ['p', 'i', 'p'], source: 'decodable', priority: 1 },
        { name: 'Sam', gpcs: ['s', 'a', 'm'], source: 'v2', priority: 1 },
        { name: 'Ben', gpcs: ['b', 'e', 'n'], source: 'decodable', priority: 1 },
        { name: 'Shay', gpcs: ['sh', 'ay'], source: 'uk', priority: 2 },
      ],
    },
    pairs: {
      pairs: [{ id: 'a-e-u', gpcs: ['a', 'e', 'u'], position: 'any', kind: 'vowel', unlock: { r: 'R04D', s: 'S03D' } }],
      twins: [
        { pair: 'a-e-u', a: 'pan', b: 'pen', model: { a: 'Pan has an a in the middle.', b: 'Pen has an e in the middle.' } },
        { pair: 'a-e-u', a: 'hat', b: 'hut' },
        { pair: 'a-e-u', a: 'cap', b: 'cup' },
        { pair: 'a-e-u', a: 'net', b: 'nut' },
      ],
    },
    moments: {
      moments: [
        mo('wish', 'r', '1.0', ['pic', 'clip']), mo('bath-wish', 'r', '1.0', ['pic', 'clip']),
        mo('twin-wish', 'r', '1.0', ['pic', 'clip']), mo('one-or-many', 'r', '1.0', ['pic', 'clip']),
        mo('salon-card', 'r', '1.2', ['pic']),
        mo('first-sound', 's'), mo('naming-bells', 's'), mo('naming-garden', 's'),
        mo('label', 's', '1.0', ['pic', 'clip']), mo('label-plural', 's', '1.0', ['pic', 'clip']), mo('sign', 's'),
        mo('egg-moon', 'm', '1.0', [], 'moon'), mo('egg-small-nest', 'm', '1.0', [], 'small-nest'),
        mo('egg-two-stone', 'm', '1.0', [], 'two-stone'), mo('door-visit', 'm'), mo('post-pin', 'm', '1.1'),
        mo('roll-call', 'name'),
      ],
    },
    budget: MINI_BUDGET,
    phrases: [],
  };
}

export const miniContent = (release: Release = '1.0'): Content => buildContent(miniRaw(release));
```

- [ ] **Step 2: Write the failing builder test**

```ts
// G/tests/content/build.test.ts
import { describe, it, expect } from 'vitest';
import { buildContent, stepIndex } from '../../src/core/content/build.ts';
import { spell } from '../../src/core/content/gpc.ts';
import { miniContent, miniRaw } from '../fixtures/mini.ts';

describe('buildContent', () => {
  const c = miniContent();

  it('indexes steps, order and loaded steps per strand', () => {
    expect(c.order.r[0]).toBe('R01');
    expect(c.steps.R04D.strand).toBe('r');
    expect(c.steps.R04D.top).toBe(3);
    expect(stepIndex(c, 'R13')).toBeGreaterThan(stepIndex(c, 'R10'));
    expect(c.loaded.r).not.toContain('R30');
    expect(c.loaded.m).not.toContain('M03');
  });

  it('loads a step when its release and one of its moments are in the build', () => {
    expect(c.steps.R30.loaded).toBe(false);
    expect(miniContent('1.2').steps.R30.loaded).toBe(true);
    expect(miniContent('1.1').steps.M03.loaded).toBe(true);
    expect(c.moments['salon-card'].loaded).toBe(false);
    expect(c.moments['wish'].loaded).toBe(true);
  });

  it('indexes items with their step and strand', () => {
    expect(c.items['r:g:ai']).toMatchObject({ step: 'R13', strand: 'r', kind: 'grapheme' });
    expect(c.items['m:pair:3+7'].task).toEqual({ op: 'pair', a: 3, b: 7 });
  });

  it('computes reading and spelling items and steps of a word', () => {
    expect(c.words.nest.rItems).toEqual(expect.arrayContaining(['r:g:n', 'r:g:e', 'r:g:s', 'r:g:t', 'r:cl:-st']));
    expect(c.words.nest.rStep).toBe('R21');
    expect(c.words.nest.sStep).toBe('S12');
    expect(c.words.fox.rStep).toBe('R08');
    expect(c.words.fox.sStep).toBe('S04');
    expect(c.words.sock.rStep).toBe('R03');
    expect(c.words.ship.rStep).toBe('R10');
    expect(c.words.tray.rStep).toBe('R30');
  });

  it('a word with a GPC that has no reading item is not readable', () => {
    const raw = miniRaw();
    raw.gpcs = [...raw.gpcs, { id: 'y.ee', text: 'y', phonemes: ['ee'], vowel: true, sound: 'ee', fluency: false }];
    raw.words[0].words.push({ w: 'puppy', gpcs: ['p', 'u', 'p', 'p', 'y.ee'], pic: 'w-puppy', kind: 'thing', syllables: 2 });
    const c2 = buildContent(raw);
    expect(c2.words.puppy.rStep).toBeNull();
    expect(c2.words.puppy.sStep).toBe('S03');
  });

  it('only adds cluster items that exist in the ladder', () => {
    expect(c.words.tray.rItems).not.toContain('r:cl:tr-');
  });

  it('names clips after the word and its plural', () => {
    expect(c.words.hat.clip).toBe('word-hat');
    expect(c.words.hat.pluralClip).toBe('word-hats');
    expect(c.words.fox.pluralClip).toBe('word-foxes');
    expect(c.words.tap.pluralClip).toBeNull();
    expect(c.words.hat.pack).toBe('words-phase2');
  });

  it('counts the carriers that can serve each reading item at its own step', () => {
    expect(c.items['r:g:s'].carriers).toBe(0);
    expect(c.items['r:g:t'].carriers).toBe(2);
    expect(c.items['r:pair:a-e-u'].carriers).toBe(3);
    expect(c.items['r:end:es'].carriers).toBe(3);
    expect(c.items['r:end:none'].carriers).toBe(7);
    expect(c.items['s:g:h'].carriers).toBeNull();
    expect(c.items['m:sub:1'].carriers).toBeNull();
  });

  it('indexes words by item', () => {
    expect(c.wordsByItem['r:g:sh']).toEqual(expect.arrayContaining(['ship', 'dish']));
  });

  it('builds name entries with slug, phonemes and first sound', () => {
    const pip = c.names.find(n => n.name === 'Pip')!;
    expect(pip).toMatchObject({ slug: 'pip', phonemes: ['p', 'i', 'p'], first: 'p' });
    expect(c.names.find(n => n.name === 'Shay')!.first).toBe('sh');
  });

  it('groups twins by pair', () => {
    expect(c.twins['a-e-u']).toHaveLength(4);
  });

  it('every mini word spells itself', () => {
    for (const word of Object.values(c.words)) expect(spell(word.gpcs, c.gpcs)).toBe(word.w);
  });

  it('throws on a duplicate item id', () => {
    const raw = miniRaw();
    raw.ladders[0].steps[1].items.push({ id: 'r:g:s', kind: 'grapheme', gpc: 's' });
    expect(() => buildContent(raw)).toThrow(/Duplicate item r:g:s/);
  });

  it('throws on a duplicate step id and a duplicate word', () => {
    const a = miniRaw();
    a.ladders[0].steps.push({ ...a.ladders[0].steps[0] });
    expect(() => buildContent(a)).toThrow(/Duplicate step R01/);
    const b = miniRaw();
    b.words[0].words.push({ w: 'hat', gpcs: ['h', 'a', 't'], pic: 'w-hat', kind: 'thing' });
    expect(() => buildContent(b)).toThrow(/Duplicate word hat/);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run tests/content/build.test.ts`
Expected: FAIL, cannot resolve `build.ts`.

- [ ] **Step 4: Implement `build.ts`**

Rules, in this order:

1. `gpcs`: a record by id. A duplicate id throws `Duplicate GPC <id>`.
2. `moments`: a record by id with `loaded = releaseAtMost(m.release, raw.release)`.
3. For each ladder, for each step: throw `Duplicate step <id>` on a repeat; `index` is its position in its own ladder; `top = levels`; `loaded = releaseAtMost(step.release, raw.release) && step.moments.some(m => moments[m]?.loaded)`. Each item gets `strand` and `step`; a repeat throws `Duplicate item <id>`. `order[strand]` lists every step, `loaded[strand]` the loaded ones.
4. Words: for each pack, for each word, throw `Duplicate word <w>` on a repeat. `clip = 'word-' + w`, `pluralClip = plural ? 'word-' + plural.w : null`. Compute `rItems` with `wordItems(word, 'r')` and `sItems` with `wordItems(word, 's')` (below). `rStep` is the step of the item in `rItems` with the highest step index. It is `null` when `rItems` is empty, and also when any GPC of the word has no reading grapheme item `r:g:<gpc>` in the ladders: such a word (key, castle, mouse) is not readable on any ladder of this build and is never served in reading. `sStep` is the highest step in `sItems`, or `null` when empty; spelling GPCs without an item are gift gems, so they do not block it. Push the word into `wordsByItem[id]` for every id in both lists.
5. Names: `slug = slugName(name)`, `phonemes = phonemesOf(gpcs)`, `first = phonemes[0]`.
6. Pairs by id; twins grouped by `pair`.
7. Phrases: for each pack, `clipId = clip ? 'phrase-' + id : null`, `loaded = moments[phrase.moment]?.loaded ?? false`, `phrasesByItem[item]` lists phrase ids. A duplicate phrase id throws `Duplicate phrase <id>`.
8. `carriers` on every item, computed last. Reading grapheme, cluster and pattern items: the number of pictured thing words with the item in `rItems` and `rStep === item.step`. Reading pair items: the number of twins of that pair whose two words are pictured thing words with an `rStep` at or below the item's step. Reading ending items: the number of pictured thing words with a plural ending in `s` (for `r:end:s`), in `es` (for `r:end:es`), or with any plural (for `r:end:none`). Other reading items: the number of phrases listing the item. Spelling, maths and name items: `null`.

`wordItems` adds an id only when that item exists in the built item index:

```ts
function wordItems(word: RawWord, p: 'r' | 's', items: Record<ItemId, Item>, table: Record<GpcId, RawGpc>): ItemId[] {
  const out: ItemId[] = [];
  const add = (id: ItemId) => { if (items[id] && !out.includes(id)) out.push(id); };
  const gs = word.gpcs;
  for (const g of gs) add(`${p}:g:${g}`);
  const cons = (g: GpcId) => !table[g].vowel;
  let lead = 0;
  while (lead < gs.length && cons(gs[lead])) lead++;
  let trail = 0;
  while (trail < gs.length - lead && cons(gs[gs.length - 1 - trail])) trail++;
  if (lead >= 2) add(`${p}:cl:${gs.slice(0, lead).map(baseText).join('')}-`);
  if (trail >= 2) add(`${p}:cl:-${gs.slice(gs.length - trail).map(baseText).join('')}`);
  if (lead >= 2 && trail >= 2) add(`${p}:pat:ccvcc`);
  const digraphs = gs.filter(g => baseText(g).length >= 2 && !table[g].split).length;
  if (digraphs >= 2) add(`${p}:pat:two-digraphs`);
  if (gs.some((g, i) => i > 0 && g === gs[i - 1] && cons(g))) add(`${p}:pat:double`);
  if (word.compound) add(`${p}:pat:compound`);
  if ((word.syllables ?? 1) >= 2 && !word.compound) add(`${p}:pat:two-syllable`);
  if ((lead >= 2 || trail >= 2) && gs.some(g => table[g].vowel && baseText(g).length >= 2)) add(`${p}:pat:long-cluster`);
  if (word.affix) add(`${p}:${word.affix === 'un' ? 'pre' : 'sfx'}:${word.affix}`);
  return out;
}
```

Also export `stepIndex(c, step) = c.steps[step]?.index ?? -1`.

- [ ] **Step 5: Run the test and see it pass**

Run: `npx vitest run tests/content/build.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/content/build.ts games/moon-meadow-home/tests/fixtures/mini.ts games/moon-meadow-home/tests/content/build.test.ts
git commit -m "Build indexed content from the raw packs, with a small test fixture"
```

### Task A3: Name bank lookups

**Files:**
- Create: `G/src/core/content/names.ts`
- Test: `G/tests/content/names.test.ts`

**Interfaces:**
- Consumes: `Content`, `NameEntry`, `Phoneme` (A1, A2).
- Produces: `findSamePhonemes(phonemes: readonly Phoneme[], c: Content): NameEntry | null`. Naming uses it for gold bell check 3 ("Same phonemes as a list name", spec 2.8). The match is exact on the phoneme sequence, so "Lili" (l i l ee) finds "Lily".

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/content/names.test.ts
import { describe, it, expect } from 'vitest';
import { findSamePhonemes } from '../../src/core/content/names.ts';
import { phonemesOf } from '../../src/core/content/gpc.ts';
import { miniContent } from '../fixtures/mini.ts';

describe('findSamePhonemes', () => {
  const c = miniContent();
  it('finds a list name with the same sounds', () => {
    expect(findSamePhonemes(phonemesOf(['p', 'i', 'p'], c.gpcs), c)?.name).toBe('Pip');
  });
  it('matches by sound, not by spelling', () => {
    expect(findSamePhonemes(phonemesOf(['sh', 'ai'], c.gpcs), c)?.name).toBe('Shay');
  });
  it('returns null for a new name', () => {
    expect(findSamePhonemes(phonemesOf(['p', 'a', 'p'], c.gpcs), c)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/names.test.ts`
Expected: FAIL, cannot resolve `names.ts`.

- [ ] **Step 3: Implement**

```ts
// G/src/core/content/names.ts
import type { Content, NameEntry, Phoneme } from './types.ts';

export function findSamePhonemes(phonemes: readonly Phoneme[], c: Content): NameEntry | null {
  const key = phonemes.join('.');
  return c.names.find(n => n.phonemes.join('.') === key) ?? null;
}
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npx vitest run tests/content/names.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/content/names.ts games/moon-meadow-home/tests/content/names.test.ts
git commit -m "Find list names by their sounds"
```

### Task A4: Blocklist check by sound

**Files:**
- Create: `G/src/core/content/blocklist.ts`
- Test: `G/tests/content/blocklist.test.ts`

**Interfaces:**
- Consumes: `splitUsual`, `phonemesOf`, `collapseRuns` (A1).
- Produces:
  ```ts
  export type BlockLevel = 'strong' | 'rude' | 'toilet' | 'slur';
  export type RawBlocklist = { version: 1; entries: { w: string; lang: 'en' | 'nl'; level: BlockLevel }[] };
  export type Blocklist = { whole: Record<string, BlockLevel>; parts: { key: Phoneme[]; level: BlockLevel }[]; unsplit: string[] };
  export type BlockHit = { level: BlockLevel; part: boolean };
  export function buildBlocklist(raw: RawBlocklist, table: Record<GpcId, RawGpc>): Blocklist;
  export function checkBlocked(phonemes: readonly Phoneme[], list: Blocklist): BlockHit | null;
  export function phonemeKey(p: readonly Phoneme[]): string;
  ```
  Rules (spec 2.8 Blocklist, naming.md section 5): every entry is split with `splitUsual`, turned into phonemes and collapsed (`collapseRuns`). An entry that does not split goes into `unsplit` (the validator reports it). The whole name, collapsed, is checked against every entry. Inside a longer name only `strong` and `slur` entries of 3 or more phonemes are checked as contiguous parts. A whole hit wins over a part hit.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/content/blocklist.test.ts
import { describe, it, expect } from 'vitest';
import { buildBlocklist, checkBlocked, phonemeKey, type RawBlocklist } from '../../src/core/content/blocklist.ts';
import { phonemesOf } from '../../src/core/content/gpc.ts';
import type { RawGpc } from '../../src/core/content/types.ts';

const g = (id: string, phonemes: string[], vowel = false, extra: Partial<RawGpc> = {}): RawGpc =>
  ({ id, text: id.split('.')[0], phonemes, vowel, sound: null, fluency: true, ...extra });
const T = Object.fromEntries([
  g('f', ['f']), g('ph', ['f']), g('u', ['u'], true), g('k', ['k']), g('c', ['k']), g('ck', ['k']),
  g('p', ['p']), g('oo', ['oo'], true), g('a', ['a'], true), g('s', ['s']), g('ss', ['s']), g('i', ['i'], true),
  g('d', ['d']), g('y.ee', ['ee'], true), g('ar', ['ar'], true), g('l', ['l']), g('tt', ['t']), g('t', ['t']),
  g('e', ['e'], true), g('sl', ['s', 'l']), g('r', ['r']), g('o', ['o'], true),
].map(x => [x.id, x]));

const RAW: RawBlocklist = {
  version: 1,
  entries: [
    { w: 'fuck', lang: 'en', level: 'strong' },
    { w: 'poo', lang: 'en', level: 'toilet' },
    { w: 'kut', lang: 'nl', level: 'strong' },
    { w: 'arse', lang: 'en', level: 'rude' },
    { w: 'slut', lang: 'en', level: 'strong' },
    { w: 'qqq', lang: 'en', level: 'rude' },
  ],
};
const list = buildBlocklist(RAW, T);
const ph = (gpcs: string[]) => phonemesOf(gpcs, T);

describe('checkBlocked', () => {
  it('catches a strong word however it is spelled', () => {
    expect(checkBlocked(ph(['f', 'u', 'k']), list)).toEqual({ level: 'strong', part: false });
    expect(checkBlocked(ph(['ph', 'u', 'ck']), list)).toEqual({ level: 'strong', part: false });
    expect(checkBlocked(ph(['f', 'f', 'u', 'u', 'k']), list)).toEqual({ level: 'strong', part: false });
  });
  it('catches a strong word inside a longer name', () => {
    expect(checkBlocked(ph(['f', 'u', 'k', 'i', 'd', 'y.ee']), list)).toEqual({ level: 'strong', part: true });
  });
  it('blocks toilet words only as a whole name', () => {
    expect(checkBlocked(ph(['p', 'oo']), list)).toEqual({ level: 'toilet', part: false });
    expect(checkBlocked(ph(['p', 'oo', 'l', 'a']), list)).toBeNull();
  });
  it('catches Dutch words she can build', () => {
    expect(checkBlocked(ph(['k', 'u', 't']), list)?.level).toBe('strong');
  });
  it('lets innocent names through', () => {
    expect(checkBlocked(ph(['c', 'a', 'ss', 'i', 'd', 'y.ee']), list)).toBeNull();          // Cassidy
    expect(checkBlocked(ph(['s', 'c', 'ar', 'l', 'e', 'tt']), list)).toBeNull();            // Scarlett
  });
  it('reports entries it cannot split', () => {
    expect(list.unsplit).toEqual(['qqq']);
  });
  it('phonemeKey joins with dots', () => expect(phonemeKey(['f', 'u', 'k'])).toBe('f.u.k'));
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/blocklist.test.ts`
Expected: FAIL, cannot resolve `blocklist.ts`.

- [ ] **Step 3: Implement**

```ts
// G/src/core/content/blocklist.ts
import { collapseRuns, phonemesOf, splitUsual } from './gpc.ts';
import type { GpcId, Phoneme, RawGpc } from './types.ts';

export type BlockLevel = 'strong' | 'rude' | 'toilet' | 'slur';
export type RawBlocklist = { version: 1; entries: { w: string; lang: 'en' | 'nl'; level: BlockLevel }[] };
export type Blocklist = { whole: Record<string, BlockLevel>; parts: { key: Phoneme[]; level: BlockLevel }[]; unsplit: string[] };
export type BlockHit = { level: BlockLevel; part: boolean };

export const phonemeKey = (p: readonly Phoneme[]): string => p.join('.');

export function buildBlocklist(raw: RawBlocklist, table: Record<GpcId, RawGpc>): Blocklist {
  const out: Blocklist = { whole: {}, parts: [], unsplit: [] };
  for (const e of raw.entries) {
    const gpcs = splitUsual(e.w, table);
    if (!gpcs) { out.unsplit.push(e.w); continue; }
    const key = collapseRuns(phonemesOf(gpcs, table));
    out.whole[phonemeKey(key)] ??= e.level;
    if ((e.level === 'strong' || e.level === 'slur') && key.length >= 3) out.parts.push({ key, level: e.level });
  }
  return out;
}

export function checkBlocked(phonemes: readonly Phoneme[], list: Blocklist): BlockHit | null {
  const p = collapseRuns(phonemes);
  const whole = list.whole[phonemeKey(p)];
  if (whole) return { level: whole, part: false };
  for (const { key, level } of list.parts) {
    for (let i = 0; i + key.length <= p.length; i++) {
      if (key.every((k, j) => p[i + j] === k)) return { level, part: true };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npx vitest run tests/content/blocklist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/content/blocklist.ts games/moon-meadow-home/tests/content/blocklist.test.ts
git commit -m "Check names against the blocklist by sound"
```

### Task A5: Node reader and the content validator

**Files:**
- Create: `G/tools/lib/read-content.ts`
- Create: `G/tools/lib/validate.ts`
- Create: `G/tools/validate-content.ts`
- Create: `G/tests/content/real.ts` (helper for the real-content gate tests in A6 to A10)
- Test: `G/tests/content/validate.test.ts`

**Interfaces:**
- Consumes: A1 to A4.
- Produces:
  ```ts
  // tools/lib/validate.ts
  export type LineEntry = { id: string; speaker: string; text: string; note?: string; seed?: number };
  export type Finding = { level: 'error' | 'warn'; code: string; msg: string };
  export type Thresholds = {
    wordsPerReadingStep: number; carriersPerItem: number; twinsPerPair: number;
    pluralS: number; pluralEs: number; namesMin: number; namesTarget: number; namesPriority1: number;
    requireV2Names: boolean;
  };
  export const DEFAULT_THRESHOLDS: Thresholds;   // 6, 2, 1, 20, 8, 300, 1000, 300, true
  export type ValidateInput = {
    raw: RawContent; blocklist: RawBlocklist; phonics: string[];
    lines: { pack: string; lines: LineEntry[] }[];
    manifests: Record<string, string[]> | null;   // null in --data-only mode
    pictures: string[] | null;                    // null in --data-only mode
    codeIds: string[];
  };
  export const V2_NAMES: readonly string[];
  export const EXCLUDED_WORDS: readonly string[];
  export const DUTCH_WORDS: readonly string[];
  export function validate(input: ValidateInput, t?: Partial<Thresholds>): Finding[];

  // tools/lib/read-content.ts
  export const GAME_ROOT: string;
  export const REPO_ROOT: string;
  export function readRawContent(release?: Release): RawContent;
  export function readContent(release?: Release): Content;
  export function readRawBlocklist(): RawBlocklist;
  export function readPhonicsKeys(): string[];
  export function readLinePacks(): { pack: string; lines: LineEntry[] }[];
  export function readManifests(): Record<string, string[]>;
  export function readPictureIds(): string[];
  export function readCodeClipIds(): string[];
  export function readValidateInput(opts: { dataOnly: boolean; release?: Release }): ValidateInput;

  // tests/content/real.ts
  export function realErrors(prefixes: string[], opts?: { dataOnly?: boolean; release?: Release; thresholds?: Partial<Thresholds> }): Finding[];
  ```
- CLI: `npm run check:content -- [--data-only] [--release 1.1] [--only CODE_,CODE_]` prints one line per finding (`ERROR <code> <msg>` or `WARN <code> <msg>`) and a count line, and exits with code 1 when any error is printed.

**Reader rules.** `GAME_ROOT = fileURLToPath(new URL('../..', import.meta.url))`, `REPO_ROOT` is two levels above it. `readRawContent` reads `content/release.json`, `content/gpcs.json`, `content/ladders/{reading,spelling,maths,budget}.json`, `content/moments.json`, `content/pairs.json`, `content/words/{phase2,phase3-4,year1}.json`, `content/names/tier1.json` and every `content/phrases/*.json`. A missing words, names or phrases file reads as an empty pack, so the data tasks can land one at a time. `release` overrides `release.json`. `readPhonicsKeys` returns the keys of `sounds` in `shared/audio/phonics/index.json`. `readLinePacks` reads every `public/audio/*/lines.json` (pack = folder name). `readManifests` maps each pack folder to the keys of `clips` in its `manifest.json` (missing file gives `[]`). `readPictureIds` returns the keys of `pictures` in `public/art/manifest.json` (missing gives `[]`). `readCodeClipIds` scans `src/**/*.ts` and `src/**/*.svelte` for `say('<id>')` and `say("<id>")` literals.

**Validator checks.** Each check emits findings with the code shown. The validator first calls `buildContent(raw)` inside `try`; a throw becomes one `BUILD` error and the checks that need `Content` are skipped.

| Code | Level | Rule |
|---|---|---|
| `BUILD` | error | `buildContent` threw |
| `GPC_PHONEME` | error | a GPC phoneme is not in `PHONEMES` |
| `GPC_ID` | error | a GPC id is not `<letters>` or `<letters>-e` or `<letters>.<phoneme>` with that phoneme in `PHONEMES` |
| `GPC_SOUND` | error | a GPC used by a grapheme or first-sound item of a loaded step has `sound` null or not in `phonics` |
| `MOMENT_UNKNOWN` | error | a step lists a moment not in `moments.json` |
| `STEP_MOMENT_STRAND` | error | a step lists a moment of another strand |
| `STEP_RELEASE` | error | a step's `release` is not the earliest release of its moments (steps with release `later` must have no loaded moment) |
| `STEP_EMPTY` | error | a loaded, non-display step has no items |
| `STEP_FACE` | error | a loaded step has an empty `face` |
| `ITEM_PREFIX` | error | an item id does not start with its strand (`r:`, `s:`, `m:`) |
| `ITEM_ID` | error | an item id does not match `/^[A-Za-z0-9][A-Za-z0-9:._+-]{0,63}$/` |
| `ITEM_GPC` | error | a grapheme or first-sound item names an unknown GPC, or a grapheme item id is not `<strand>:g:<gpc>` |
| `ITEM_TASK` | error | a maths item has no `task`, or a non-maths item has one |
| `ITEM_PAIR` | error | a pair item names an unknown pair |
| `PAIR_UNLOCK` | error | a pair's unlock step does not exist |
| `PAIR_NO_TWIN` | error | a reading pair item of a loaded step served by `twin-wish` has fewer than `twinsPerPair` twins whose both words exist with a picture and have an `rStep` at or below the pair item's step (so a player who meets the step as her current step can read both words) |
| `TWIN_WORD` | error | a twin names a word that is not in a words pack |
| `WORD_GPC` | error | a word uses an unknown GPC |
| `WORD_SPELL` | error | `spell(gpcs) !== w` |
| `WORD_PIC` | error | `pic` is not null and not `'w-' + w` |
| `WORD_PLURAL` | error | a plural is not `w + 'es'` after a final s, x, ch, sh, ss or zz, or `w + 's'` otherwise |
| `WORD_DUP` | error | a plural equals another word or plural (clip ids would collide) |
| `WORD_CLUSTER` | error | a thing word whose `rStep` is loaded has a leading or trailing run of 2 or more consonant GPCs whose cluster item (`r:cl:...`) does not exist |
| `WORD_EXCLUDED` | error | a word, plural or irregular form is in `EXCLUDED_WORDS` |
| `WORD_STEP` | warn | a thing word has no reading items |
| `COVER_WORDS` | warn | a loaded reading step whose moments include `wish` and whose items are grapheme, cluster or pattern items has fewer than `wordsPerReadingStep` thing words with a picture whose `rStep` is that step |
| `COVER_ITEM` | warn | an item of such a step has fewer than `carriersPerItem` pictured thing words carrying it whose `rStep` is that same step (a carrier that needs later graphemes could never serve the step); a spelling grapheme or cluster item of a loaded step with `naming-bells` or `label` has fewer than `carriersPerItem` carriers among pictured thing words and names whose GPCs contain it |
| `COVER_STEP` | error | a loaded, non-display reading step whose items all have `carriers === 0`, so no moment could ever serve it |
| `COVER_PLURALS` | error | fewer than `pluralS` plurals ending in s, or fewer than `pluralEs` ending in es, when R19 is loaded |
| `NAME_GPC`, `NAME_SPELL` | error | unknown GPC; `spell(gpcs) !== name.toLowerCase()` |
| `NAME_DUP` | error | two names share a slug |
| `NAME_VOWEL` | error | a name has no vowel GPC |
| `NAME_BLOCKED` | error | `checkBlocked(phonemes)` is not null |
| `NAME_COUNT` | error below `namesMin`, warn below `namesTarget` | number of tier 1 names |
| `NAME_PRIORITY` | error | fewer than `namesPriority1` names with priority 1 |
| `NAME_V2` | error | when `requireV2Names` is true: a name in `V2_NAMES` has no tier 1 entry with that slug |
| `BLOCK_SPLIT` | error | a blocklist entry does not split into usual GPCs |
| `DUTCH_TEXT` | error | a word, plural, name, phrase text or line text contains a token in `DUTCH_WORDS`, or the letters `ij` |
| `LINE_ID` | error | a line id does not match `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `LINE_DUP` | error | a line id appears in two packs or twice in one |
| `LINE_SPEAKER` | error | an id starting with `word-`, `name-`, `num-`, `sound-`, `phrase-` or `model-` is not `narrator` |
| `LINE_DIGIT` | error | line text contains a digit |
| `LINE_MISSING_WORD` | error | when a words pack's `lines.json` exists: a pictured word or its plural of that pack whose `rStep` or `sStep` is loaded has no `word-` line in it |
| `LINE_MISSING_NAME` | error | when `names-t1/lines.json` exists: a name without both `name-<slug>` and `name-<slug>-q` |
| `LINE_UNKNOWN_CODE_ID` | error | a `codeIds` entry is in no pack's lines (only checked when at least one pack exists) |
| `ASSET_CLIP` | error, strict only | a word (or its plural) whose `rStep` or `sStep` is loaded has no clip in its pack's manifest |
| `ASSET_PIC` | error, strict only | such a word's picture is not in `pictures` |
| `BUDGET_KEYS` | error | a `Budget` key is missing, a share does not sum to 1 within 0.001, or a profile names an unknown step |

Constants (copy exactly):

```ts
export const V2_NAMES = [
  'sam','tam','pam','tim','nim','sid','dan','tad','sim','pim','mip','tan','san','sap','sis','sip','sas','tas','tat','tip','tin','tid',
  'pat','pap','pad','pit','pip','pid','nas','nat','nap','nan','nam','nin','nid','nis','mas','mat','man','mam','mit','min','mim','mid',
  'das','dat','dap','dit','dip','din','tom','pod','ted','kip','ken','ron','kit','cam','tig','ben','fen','lin','tess','rob','fin','liss',
  'tod','rod','ned','kim','kin','ked','ren','rib',
] as const;
export const EXCLUDED_WORDS = [
  'hurt','rescue','cruel','argue','unhappy','unkind','unfriendly','unwell','unlucky','unsafe','unfair','sad','hungry','scary','slimy',
  'shocked','stormy','explode','bulldoze','fight','crime','soldier','witch','alien','gecko','fat',
  'dogs','doctors','turtles','ballerinas','mountains','clowns','pirates','tigers','lions','tractors','buses','churches','witches','watches','matches',
] as const;
export const DUTCH_WORDS = [
  'de','het','een','ik','jij','je','niet','nee','goed','mooi','zo','dag','hoi','doei','lief','kusje','eend','paard','huis','meisje',
  'jongen','prinses','koningin','eenhoorn','ei','eieren','bloem','boom','en','van','met','voor','maar','ook','nog','wel','heel',
  'lekker','slapen','eten','drinken','spelen','kijk','luister','klaar','knap','prima','gezellig','alsjeblieft','dank','bedankt',
  'welterusten','slaap','ster','maan','zon','fijn','leuk','tot','ziens','waar','wat','wie','hoe','waarom',
] as const;
```

`DUTCH_WORDS` leaves out words that are English too (is, in, bed, pen, hand, ring, water, school, half). Tokens are lowercased runs of letters.

- [ ] **Step 1: Write the failing validator test**

```ts
// G/tests/content/validate.test.ts
import { describe, it, expect } from 'vitest';
import { validate, type Finding, type ValidateInput, type Thresholds } from '../../tools/lib/validate.ts';
import { miniRaw, MINI_GPCS } from '../fixtures/mini.ts';
import type { RawContent } from '../../src/core/content/types.ts';

const LOW: Thresholds = { wordsPerReadingStep: 0, carriersPerItem: 0, twinsPerPair: 1, pluralS: 0, pluralEs: 0, namesMin: 0, namesTarget: 0, namesPriority1: 0, requireV2Names: false };
const PHONICS = [...new Set(MINI_GPCS.map(g => g.sound!))];

function input(mut?: (raw: RawContent) => void, extra: Partial<ValidateInput> = {}): ValidateInput {
  const raw = structuredClone(miniRaw());
  mut?.(raw);
  return {
    raw,
    blocklist: { version: 1, entries: [{ w: 'fuk', lang: 'en', level: 'strong' }] },
    phonics: PHONICS,
    lines: [],
    manifests: null,
    pictures: null,
    codeIds: [],
    ...extra,
  };
}
const errors = (f: Finding[]) => f.filter(x => x.level === 'error').map(x => x.code);

describe('validate', () => {
  it('passes the clean mini content in data-only mode', () => {
    expect(errors(validate(input(), LOW))).toEqual([]);
  });

  it('reports a build failure instead of throwing', () => {
    const f = validate(input(raw => raw.ladders[0].steps[1].items.push({ id: 'r:g:s', kind: 'grapheme', gpc: 's' })), LOW);
    expect(errors(f)).toEqual(['BUILD']);
  });

  it('catches a word whose GPCs do not spell it', () => {
    expect(errors(validate(input(raw => raw.words[0].words.push({ w: 'cat', gpcs: ['c', 'a', 'p'], pic: 'w-cat', kind: 'thing' })), LOW)))
      .toContain('WORD_SPELL');
  });

  it('catches excluded words and plurals', () => {
    const f = validate(input(raw => { raw.words[0].words.find(w => w.w === 'dog')!.plural = { w: 'dogs', ending: 's' }; }), LOW);
    expect(errors(f)).toContain('WORD_EXCLUDED');
  });

  it('catches a wrong plural ending', () => {
    const f = validate(input(raw => { raw.words[0].words.find(w => w.w === 'fox')!.plural = { w: 'foxs', ending: 's' }; }), LOW);
    expect(errors(f)).toContain('WORD_PLURAL');
  });

  it('catches a cluster that has no item', () => {
    const f = validate(input(raw => raw.words[0].words.push({ w: 'help', gpcs: ['h', 'e', 'l', 'p'], pic: 'w-help', kind: 'thing' })), LOW);
    expect(errors(f)).toContain('WORD_CLUSTER');
  });

  it('catches a blocked name', () => {
    const f = validate(input(raw => raw.names.names.push({ name: 'Fuk', gpcs: ['f', 'u', 'k'], source: 'uk', priority: 3 })), LOW);
    expect(errors(f)).toContain('NAME_BLOCKED');
  });

  it('checks speakers, digits and Dutch in lines', () => {
    const f = validate(input(undefined, {
      lines: [{ pack: 'words-phase2', lines: [
        { id: 'word-hat', speaker: 'foal', text: 'Hat.' },
        { id: 'g-count', speaker: 'narrator', text: 'Count 3 cups.' },
        { id: 'g-good', speaker: 'narrator', text: 'Goed zo!' },
      ] }],
    }), LOW);
    expect(errors(f)).toEqual(expect.arrayContaining(['LINE_SPEAKER', 'LINE_DIGIT', 'DUTCH_TEXT', 'LINE_MISSING_WORD']));
  });

  it('catches an unknown phoneme and a missing letter sound', () => {
    expect(errors(validate(input(raw => { raw.gpcs.push({ id: 'qq', text: 'qq', phonemes: ['xx'], vowel: false, sound: null, fluency: false }); }), LOW)))
      .toContain('GPC_PHONEME');
    expect(errors(validate({ ...input(), phonics: PHONICS.filter(k => k !== 'sh') }, LOW))).toContain('GPC_SOUND');
  });

  it('needs a twin for every reading pair item', () => {
    expect(errors(validate(input(raw => { raw.pairs.twins = []; }), LOW))).toContain('PAIR_NO_TWIN');
  });

  it('needs a task on every maths item', () => {
    expect(errors(validate(input(raw => { delete raw.ladders[2].steps[0].items[0].task; }), LOW))).toContain('ITEM_TASK');
  });

  it('checks clips and pictures in strict mode', () => {
    const f = validate(input(undefined, { manifests: { 'words-phase2': [] }, pictures: [] }), LOW);
    expect(errors(f)).toEqual(expect.arrayContaining(['ASSET_CLIP', 'ASSET_PIC']));
  });

  it('flags a clip id used in code that no pack defines', () => {
    const f = validate(input(undefined, {
      lines: [{ pack: 'numbers', lines: [{ id: 'num-one', speaker: 'narrator', text: 'One.' }] }],
      codeIds: ['g-missing'],
    }), LOW);
    expect(errors(f)).toContain('LINE_UNKNOWN_CODE_ID');
  });

  it('applies coverage thresholds', () => {
    const f = validate(input(), { ...LOW, wordsPerReadingStep: 3 });
    expect(f.some(x => x.code === 'COVER_WORDS' && x.msg.includes('R13'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/validate.test.ts`
Expected: FAIL, cannot resolve `tools/lib/validate.ts`.

- [ ] **Step 3: Implement `validate.ts`** with one small function per row of the table, each returning `Finding[]`, and `validate` concatenating them. Message format: `<subject>: <what is wrong>`, for example `R13: 2 pictured words, needs 3`.

- [ ] **Step 4: Implement `read-content.ts` and `validate-content.ts`**

The CLI parses `process.argv`: `--data-only`, `--release <r>`, `--only <comma list>`. It calls `readValidateInput`, then `validate(input)`, filters by `--only` prefixes, prints, and sets `process.exitCode = 1` on any error. Then write the test helper:

```ts
// G/tests/content/real.ts
import { readValidateInput } from '../../tools/lib/read-content.ts';
import { validate, type Finding, type Thresholds } from '../../tools/lib/validate.ts';
import type { Release } from '../../src/core/content/types.ts';

export function realErrors(prefixes: string[], opts: { dataOnly?: boolean; release?: Release; thresholds?: Partial<Thresholds> } = {}): Finding[] {
  const input = readValidateInput({ dataOnly: opts.dataOnly ?? true, release: opts.release });
  return validate(input, opts.thresholds).filter(f => f.level === 'error' && prefixes.some(p => f.code.startsWith(p)));
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run tests/content/validate.test.ts`
Expected: PASS.

Run: `npm run check:content -- --data-only --only BUILD`
Expected: before A6 lands it prints a `BUILD` error about missing content files or reads empty packs and prints `0 errors`. Either is fine at this point; it proves the CLI runs under Node type stripping.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/tools/lib/read-content.ts games/moon-meadow-home/tools/lib/validate.ts games/moon-meadow-home/tools/validate-content.ts games/moon-meadow-home/tests/content/real.ts games/moon-meadow-home/tests/content/validate.test.ts
git commit -m "Add the content validator and npm run check:content"
```

### Task A6: Core content data (GPCs, moments, pairs, budget, ladders)

**Files:**
- Create: `G/content/release.json`, `G/content/gpcs.json`, `G/content/moments.json`, `G/content/pairs.json`
- Create: `G/content/ladders/reading.json`, `G/content/ladders/spelling.json`, `G/content/ladders/maths.json`, `G/content/ladders/budget.json`
- Create: `G/content/words/phase2.json`, `G/content/words/phase3-4.json`, `G/content/words/year1.json` as empty packs (`{"pack": "<name>", "words": []}`), `G/content/names/tier1.json` as `{"tier": 1, "names": []}`. A7 and A9 fill them.
- Test: `G/tests/content/real-ladders.test.ts`

**Interfaces:**
- Consumes: the types in A1, the reader and validator in A5.
- Produces: the real ladders every other task reads. Step ids, item ids and moment kinds below are the contract with scenes and with A7 to A9.

**Data, exactly.**

`release.json`: `{ "release": "1.0" }`.

`budget.json`: the same values as `MINI_BUDGET` in `tests/fixtures/mini.ts` (Task A2), with these real profiles:

```json
"profiles": {
  "year1": { "r": { "lo": "R13", "probe": "R21", "floor": "R01" }, "s": { "lo": "S09", "probe": "S12", "floor": "S01" }, "m": { "lo": "M01", "probe": "M10", "floor": "M01" }, "school": ["R19", "S10"] },
  "fresh": { "r": { "lo": "R01", "probe": null, "floor": "R01" }, "s": { "lo": "S01", "probe": null, "floor": "S01" }, "m": { "lo": "M01", "probe": null, "floor": "M01" }, "school": [] }
}
```

`gpcs.json`: `{ "gpcs": [ ... ] }`, one row per GPC. Columns: id, phonemes, vowel, sound key, fluency. `text` is the id without its dot suffix, and `split: true` for ids ending in `-e`.

| Group | Rows |
|---|---|
| Phase 2, fluency true, sound = id | `s`[s] `a`[a] v, `t` `p` `i`[i] v, `n` `m` `d` `g` `o`[o] v, `c`[k] `k`[k] `ck`[k] `e`[e] v, `u`[u] v, `r` `h` `b` `f` `ff`[f] `l` `ll`[l] `ss`[s] `j` `v` `w` `x`[k,s] `y`[y] `z` `zz`[z] `qu`[k,w] `ch` `sh` `th` `ng` `nk`[ng,k] |
| Phase 3, fluency true | `ai` `ee` `igh` `oa` `oo` (all vowel, sound = id), `oo.uu`[uu] vowel sound `uu`, `ar` `or` `ur` `ow` `oi` `ear` `air` (vowel, sound = id), `er`[@] vowel sound `er` |
| Middle s as /z/, fluency false | `s.z`[z] sound `z` |
| Phase 5, fluency false, all vowels | `ay`[ai] sound ai; `a-e`[ai] split sound ai; `ea`[ee] sound ee; `ie`[igh] sound igh; `i-e`[igh] split sound igh; `y.igh`[igh] sound igh; `ir`[ur] sound ur; `er.ur`[ur] sound ur; `o-e`[oa] split sound oa; `ow.oa`[oa] sound oa; `oe`[oa] sound oa; `ew`[y,oo] sound yoo; `ew.oo`[oo] sound oo; `ue`[oo] sound oo; `ue.yoo`[y,oo] sound yoo; `u-e`[y,oo] split sound yoo; `e-e`[ee] split sound ee; `y.ee`[ee] sound ee; `ie.ee`[ee] sound ee; `ea.e`[e] sound e; `ou`[ow] sound ow; `oy`[oi] sound oi; `aw`[or] sound or |
| Consonant alternatives, fluency false, not vowels | `ph`[f] sound f; `wh`[w] sound w; `c.s`[s] sound s; `g.j`[j] sound j; `ch.k`[k] sound k; `ch.sh`[sh] sound sh; `se`[s] sound s (horse); `le`[@,l] sound null (castle, apple) |
| Other vowel alternatives, fluency false | `u.uu`[uu] sound uu (bush, push); `a.@`[@] sound null; `o.oa`[oa] sound oa; `e.ee`[ee] sound ee; `i.igh`[igh] sound igh; `u.yoo`[y,oo] sound yoo; `a.ai`[ai] sound ai; `y.i`[i] sound i; `ey.ee`[ee] sound ee; `ey.ai`[ai] sound ai |

Task A9 may add rows for names (for example `tch`, `dge`, `kn`); every new row follows the same id rule and gets a sound key that exists, or null.

Spelling rules for words and names: a double letter across two syllables is two GPCs (`r a b b i t`, `a p p le`), while `ff`, `ll`, `ss` and `zz` are one GPC. In words, an s that sounds /z/ is written with `s` (`r o-e s` for rose, `h i s`); `s.z` is for names only (`r o.oa s.z ie.ee` for Rosie). Silent letters belong to the GPC they sit in (`se` in horse).

`moments.json`: `{ "moments": [ ... ] }` with these rows (id, strand, release, needs, egg):

| Release | Rows |
|---|---|
| 1.0 | `wish` r [pic, clip]; `bath-wish` r [pic, clip]; `twin-wish` r [pic, clip]; `one-or-many` r [pic, clip]; `first-sound` s []; `naming-bells` s []; `naming-garden` s []; `label` s [pic, clip]; `label-plural` s [pic, clip]; `sign` s []; `egg-moon` m [] moon; `egg-small-nest` m [] small-nest; `egg-two-stone` m [] two-stone; `egg-blanket` m [] blanket; `door-visit` m []; `roll-call-door` m []; `trim` m []; `roll-call` name [] |
| 1.1 | `note` s [clip]; `egg-berry` m [] berry; `egg-snow` m [] snow; `post-pin` m []; `post-sash` m []; `parcel` m []; `envelope` name [] |
| 1.2 | `tricky-act` r [pic]; `basket-and` r [pic, clip]; `basket-adj` r [pic]; `salon-card` r [pic]; `asking-bubble` r [clip]; `two-state-wish` r [pic]; `letter-order` s []; `beads` m [] |

`pairs.json`:

```json
{
  "pairs": [
    { "id": "a-e-u", "gpcs": ["a", "e", "u"], "position": "any", "kind": "vowel", "unlock": { "r": "R04D", "s": "S03D" } },
    { "id": "final-d-t", "gpcs": ["d", "t"], "position": "final", "kind": "voicing", "unlock": { "r": "R11", "s": "S06" } },
    { "id": "final-g-k", "gpcs": ["g", "ck", "k"], "position": "final", "kind": "voicing", "unlock": { "r": "R11", "s": "S06" } },
    { "id": "final-b-p", "gpcs": ["b", "p"], "position": "final", "kind": "voicing", "unlock": { "r": "R11", "s": "S06" } },
    { "id": "v-w", "gpcs": ["v", "w"], "position": "initial", "kind": "consonant", "unlock": { "r": "R11", "s": "S06" } },
    { "id": "j-y", "gpcs": ["j", "y"], "position": "initial", "kind": "letter-value", "unlock": { "r": "R11", "s": "S06" } },
    { "id": "th", "gpcs": ["th", "t", "f", "d"], "position": "any", "kind": "consonant", "unlock": { "r": "R11", "s": "S07" } },
    { "id": "ch-h", "gpcs": ["ch", "h"], "position": "initial", "kind": "letter-value", "unlock": { "r": "R20" } },
    { "id": "ee", "gpcs": ["ee", "ay", "ai"], "position": "any", "kind": "letter-value", "unlock": { "r": "R20" } },
    { "id": "oo", "gpcs": ["oo", "oa", "o-e"], "position": "any", "kind": "letter-value", "unlock": { "r": "R20" } },
    { "id": "ai", "gpcs": ["ai", "i-e", "igh"], "position": "any", "kind": "letter-value", "unlock": { "r": "R20" } },
    { "id": "u", "gpcs": ["u", "o"], "position": "any", "kind": "letter-value", "unlock": { "r": "R20" } },
    { "id": "i-ee", "gpcs": ["i", "ee", "ea"], "position": "any", "kind": "vowel", "unlock": { "r": "R20" } },
    { "id": "ie", "gpcs": ["ie", "ea"], "position": "any", "kind": "letter-value", "unlock": { "r": "R34" } },
    { "id": "magic-e", "gpcs": ["a", "a-e", "i", "i-e", "o", "o-e", "u", "u-e"], "position": "any", "kind": "magic-e", "unlock": { "r": "R38" } }
  ],
  "twins": [
    { "pair": "a-e-u", "a": "pan", "b": "pen", "model": { "a": "Pan has an a in the middle.", "b": "Pen has an e in the middle." } },
    { "pair": "a-e-u", "a": "hat", "b": "hut", "model": { "a": "Hat has an a in the middle.", "b": "Hut has a u in the middle." } },
    { "pair": "a-e-u", "a": "cap", "b": "cup", "model": { "a": "Cap has an a in the middle.", "b": "Cup has a u in the middle." } },
    { "pair": "a-e-u", "a": "net", "b": "nut", "model": { "a": "Net has an e in the middle.", "b": "Nut has a u in the middle." } },
    { "pair": "final-d-t", "a": "pod", "b": "pot", "model": { "a": "Pod has a d at the end.", "b": "Pot has a t at the end." } },
    { "pair": "final-d-t", "a": "card", "b": "cart", "model": { "a": "Card has a d at the end.", "b": "Cart has a t at the end." } },
    { "pair": "final-g-k", "a": "log", "b": "lock", "model": { "a": "Log has a g at the end.", "b": "Lock has a k sound at the end." } },
    { "pair": "final-g-k", "a": "rag", "b": "rack", "model": { "a": "Rag has a g at the end.", "b": "Rack has a k sound at the end." } },
    { "pair": "j-y", "a": "jam", "b": "yam", "model": { "a": "Jam starts with a j.", "b": "Yam starts with a y." } },
    { "pair": "th", "a": "bath", "b": "bat", "model": { "a": "Bath has th at the end.", "b": "Bat has a t at the end." } },
    { "pair": "th", "a": "three", "b": "tree", "model": { "a": "Three starts with th.", "b": "Tree starts with t." } },
    { "pair": "ch-h", "a": "chair", "b": "hair", "model": { "a": "Chair starts with ch.", "b": "Hair starts with h." } },
    { "pair": "ee", "a": "peel", "b": "pail" },
    { "pair": "ee", "a": "seal", "b": "sail" },
    { "pair": "ee", "a": "bee", "b": "bay" },
    { "pair": "oo", "a": "boot", "b": "boat" },
    { "pair": "oo", "a": "pool", "b": "pole" },
    { "pair": "ai", "a": "tail", "b": "tile" },
    { "pair": "u", "a": "duck", "b": "dock" },
    { "pair": "i-ee", "a": "ship", "b": "sheep" },
    { "pair": "i-ee", "a": "hill", "b": "heel" },
    { "pair": "i-ee", "a": "bin", "b": "bean" },
    { "pair": "ie", "a": "pie", "b": "pea" },
    { "pair": "ie", "a": "tie", "b": "tea" },
    { "pair": "magic-e", "a": "cap", "b": "cape" },
    { "pair": "magic-e", "a": "tap", "b": "tape" },
    { "pair": "magic-e", "a": "kit", "b": "kite" },
    { "pair": "magic-e", "a": "can", "b": "cane" }
  ]
}
```

Every twin word must be a pictured thing word. Task A7 drops or replaces a twin whose word cannot be pictured honestly, so that `TWIN_WORD` and `PAIR_NO_TWIN` pass. The pair `ai` has no reading item (no twin is readable at R20), so it only governs distractors.

**Ladders.** Each file is `{ "strand": "<r|s|m>", "steps": [ ... ] }` in the order below. Item shorthand expands as follows (`p` is the strand letter):

- `g: a b` → `{ "id": "p:g:a", "kind": "grapheme", "gpc": "a", "fluency": "grapheme" }`, with `fluency` only when the GPC row has `fluency: true`.
- `fs: s` → `{ "id": "s:fs:s", "kind": "first-sound", "gpc": "s" }`.
- `pair: x` → `{ "id": "p:pair:x", "kind": "pair", "pair": "x" }`.
- `cl: -st` → `{ "id": "p:cl:-st", "kind": "cluster", "cluster": "-st" }`.
- `pat: x` → `{ "id": "p:pat:x", "kind": "pattern", "pattern": "x" }`.
- `end: s` → `{ "id": "p:end:s", "kind": "ending", "ending": "s" }`.
- `sfx: ing` → `{ "id": "p:sfx:ing", "kind": "suffix", "affix": "ing" }`; `pre: un` → `{ "id": "p:pre:un", "kind": "prefix", "affix": "un" }`.
- `t: push` → `{ "id": "p:t:push", "kind": "tricky", "word": "push", "fluency": "tricky" }`; the word I is `p:t:i`.
- `mark: q` → `{ "id": "p:mark:q", "kind": "mark", "pattern": "q" }` (q, stop, bang); `cap: name` → `{ "id": "s:cap:name", "kind": "capital", "pattern": "name" }`; `and` → `{ "id": "p:and", "kind": "and" }`; `sent: act` → `{ "id": "p:sent:act", "kind": "sentence", "pattern": "act" }`; `adj: colour` → `{ "id": "r:adj:colour", "kind": "adjective", "pattern": "colour" }`; `abc: first` → `{ "id": "s:abc:first", "kind": "letter", "pattern": "first" }`.

Default levels are 3. Steps marked `later` have `"release": "later"`, `"levels": 1`, `"moments": []`, `"face": []`, `"items": []` and the curriculum title, so ids exist for every step in curriculum.md section 4.

Reading (`W` = `["wish", "bath-wish"]`):

| Step | Release | Moments | Items | Flags | Face |
|---|---|---|---|---|---|
| R01 | 1.0 | W | g: s a t p | | s a t p |
| R02 | 1.0 | W | g: i n m d | | i n m d |
| R03 | 1.0 | W | g: g o c k | | g o c k |
| R04 | 1.0 | W | g: ck e u r | | ck e u r |
| R04D | 1.0 | twin-wish | pair: a-e-u | contrast | a e u |
| R05 | 1.0 | W | g: h b f l | | h b f l |
| R06 | 1.0 | wish | none | display | the |
| R07 | 1.0 | W | g: ff ll ss | | ff ll ss |
| R08 | 1.0 | W | g: j v w x | | j v w x |
| R09 | 1.0 | W | g: y z zz qu | | y z qu |
| R10 | 1.0 | W | g: ch sh th ng nk | | ch sh th |
| R11 | 1.0 | twin-wish | pair: final-d-t final-g-k j-y th | contrast | d t |
| R12 | 1.2 | tricky-act | t: push pull his her go no | | push pull |
| R13 | 1.0 | W | g: ai ee igh | | ai ee igh |
| R14 | 1.0 | W | g: oa oo oo.uu | | oa oo |
| R15 | 1.0 | W | g: ar or ur | | ar or ur |
| R16 | 1.0 | W | g: ow oi ear | | ow oi ear |
| R17 | 1.0 | W | g: air er | | air er |
| R18 | 1.0 | W | pat: two-digraphs double compound | | sh ee |
| R19 | 1.0 | one-or-many | end: s es none | school | s es |
| R20 | 1.0 | twin-wish | pair: ee oo u i-ee ch-h | contrast | ee oo |
| R21 | 1.0 | W | cl: -st -nd -mp -nt -lk -sk -ft -lt -nch | | s t |
| R22 | 1.0 | W | cl: fr- cr- st- tr- sl- bl- gr- sp- dr- pl- br- gl- | | f r |
| R23 | 1.0 | W | cl: str- scr- spr-; pat: ccvcc | | s t r |
| R24 | 1.2 | salon-card | sfx: ing ed est | | i n g |
| R25 | 1.0 | wish | none | display | said |
| R26 | 1.0 | W | pat: long-cluster | | ai |
| R27 | 1.2 | basket-adj, salon-card | adj: colour size feel | | big |
| R28 | 1.2 | basket-and, salon-card | and; sent: act | | and |
| R29 | 1.2 | salon-card | sent: two | | . |
| R30 | 1.0 | W | g: ay a-e | | ai ay a-e |
| R31 | later | | | | |
| R32 | 1.0 | W | g: ea | | ee ea |
| R33 | 1.2 | asking-bubble | mark: q stop bang | | ? . ! |
| R34 | 1.0 | wish, bath-wish, twin-wish | g: ie i-e y.igh; pair: ie | | igh ie |
| R35 | later | | | | |
| R36 | 1.0 | W | g: ir er.ur | | ur ir er |
| R37 | 1.2 | two-state-wish | pre: un | | un |
| R38 | 1.0 | wish, twin-wish | pair: magic-e; g: u-e | | a-e |
| R39 | 1.0 | W | g: o-e ow.oa oe | | oa |
| R40 | later | | | | |
| R41 | 1.0 | W | g: ew ew.oo ue | | ew ue |
| R42 to R54 | later | | | | |

Spelling (`N` = `["naming-bells", "naming-garden", "label", "sign"]`):

| Step | Release | Moments | Items | Flags | Face |
|---|---|---|---|---|---|
| S01 | 1.0 | first-sound | fs: s a t p i n m d | | s |
| S02 | 1.0 | N | g: s a t p i n m d | | s a t |
| S03 | 1.0 | N | g: g o c k ck e u r | | g o ck |
| S03D | 1.0 | label | pair: a-e-u | contrast | a e u |
| S04 | 1.0 | N | g: h b f l ff ll ss | | ff ll ss |
| S05 | 1.0 | N | g: j v w x y z zz qu | | j v w |
| S06 | 1.0 | label | pair: final-d-t final-g-k final-b-p v-w j-y | contrast | d t |
| S07 | 1.0 | N | g: ch sh th ng nk; pair: th | | ch sh th |
| S08 | 1.1 | note | t: the i to no go he she we me be a at | | the |
| S09 | 1.0 | N | g: ai ee igh oa oo ar or ur | | ai ee oa |
| S10 | 1.0 | label-plural | end: s es | school | s es |
| S11 | 1.0 | naming-bells, naming-garden | cap: name | | A |
| S12 | 1.0 | N | cl: -st -nd -mp -nt -lk -sk -ft -lt -nch | | s t |
| S13 | 1.0 | N | cl: fr- cr- st- tr- sl- bl- gr- sp- dr- pl- br- gl- | | f r |
| S14 | 1.0 | N | cl: str- scr- spr- | | s t r |
| S15 | 1.0 | sign, label | pat: compound | | sun set |
| S16 | 1.0 | sign, label | sfx: ing ed er est | | ing |
| S17 | 1.1 | note | t: was you they said have like come some one | | was |
| S18 | 1.1 | note | sent: order | | . |
| S19 | 1.2 | letter-order | abc: first pair | | A a |
| S20 | 1.0 | N | g: ay a-e | | ay a-e |
| S21 | 1.1 | note | cap: start; mark: stop | | A . |
| S22 | 1.0 | N | g: ea | | ea |
| S23 | 1.1 | note | mark: q bang; and | | ? ! |
| S24 | 1.0 | N | g: ie i-e y.igh | | ie i-e |
| S25 | later | | | | |
| S26 | 1.0 | N | g: ir er.ur | | ir er |
| S27 | 1.0 | sign, label | pre: un | | un |
| S28 | 1.0 | N | g: u-e o-e | | u-e o-e |
| S29 | 1.0 | N | g: ow.oa oe | | ow oe |
| S30 | 1.0 | N | g: ew ue | | ew ue |
| S31 to S45 | later | | | | |

Maths. Item ids and tasks:

| Step | Release | Levels | Moments | Items | Face |
|---|---|---|---|---|---|
| M01 | 1.0 | 1 | egg-moon | `m:sub:n` subitise n, n = 1 to 5 | 3 |
| M02 | 1.0 | 3 | egg-moon, door-visit, roll-call-door | `m:num:n` numeral n, n = 1 to 10 | 7 |
| M03 | 1.1 | 1 | post-pin | `m:cmp:fewest` compare fewest | 2 3 |
| M04 | 1.1 | 3 | egg-berry | `m:more:n` more n for n = 0 to 9; `m:less:n` less n for n = 1 to 10; fluency fact | 6 7 |
| M05 | 1.0 | 3 | egg-small-nest, parcel | `m:miss:w-p` missing whole w part p, w = 2 to 5, p = 1 to w-1; fluency bond | 2 3 |
| M06 | later | | | | |
| M07 | 1.0 | 3 | door-visit, roll-call-door | `m:num:n`, n = 11 to 20 | 14 |
| M08 | 1.0 | 1 | trim, beads | `m:pat:AB`, `m:pat:ABB`, `m:pat:ABC`, `m:pat:AAB` with task pattern | AB |
| M09 | 1.0 | 3 | egg-moon, post-sash, parcel | `m:miss:10-p`, p = 1 to 9; fluency bond | 7 3 |
| M10 | 1.0 | 3 | egg-two-stone, post-sash | `m:pair:a+b`, a = 1 to 5, b = 10 - a; fluency bond | 4 6 |
| M11 | 1.0 | 3 | egg-blanket, post-sash, parcel | `m:hid:10-p` task missing whole 10 part p, p = 1 to 9; fluency bond | 8 2 |
| M12 | 1.0 | 3 | egg-small-nest, parcel | `m:miss:w-p`, w = 6 to 9, p = 1 to w-1; fluency bond | 5 3 |
| M13 | 1.1 | 3 | egg-berry | `m:add:a+b`, b = 1 to 3, a = b to 10-b; fluency fact | 6 2 |
| M14 | 1.1 | 3 | egg-snow | `m:take:a-b`, b = 1 to 3, a = b+1 to 10; fluency fact | 9 3 |
| M15 to M48 | later | | | | |

A step's `release` is the earliest release among its moments, so M05 (egg-small-nest 1.0, parcel 1.1) is `1.0`, M08 is `1.0`, R27 is `1.2`. Generate the long maths item lists with a throwaway Node one-liner and commit only the JSON.

- [ ] **Step 1: Write the failing gate test**

```ts
// G/tests/content/real-ladders.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { realErrors } from './real.ts';

describe('real ladders', () => {
  const c = readContent('1.0');

  it('has every curriculum step plus the two new contrast steps', () => {
    expect(c.order.r).toHaveLength(55);
    expect(c.order.s).toHaveLength(46);
    expect(c.order.m).toHaveLength(48);
    expect(c.order.r.indexOf('R04D')).toBe(c.order.r.indexOf('R04') + 1);
    expect(c.order.s.indexOf('S03D')).toBe(c.order.s.indexOf('S03') + 1);
  });

  it('flags school and contrast steps', () => {
    expect(c.steps.R19.school && c.steps.S10.school).toBe(true);
    for (const s of ['R04D', 'R11', 'R20', 'S03D', 'S06']) expect(c.steps[s].contrast).toBe(true);
    expect(c.steps.R06.display && c.steps.R25.display).toBe(true);
  });

  it('loads steps by release', () => {
    expect(c.steps.R30.loaded).toBe(true);
    expect(c.steps.R24.loaded).toBe(false);
    expect(c.steps.M03.loaded).toBe(false);
    expect(readContent('1.1').steps.M03.loaded).toBe(true);
    expect(readContent('1.2').steps.R27.loaded).toBe(true);
    expect(c.steps.R31.loaded).toBe(false);
  });

  it('starts Emma at R13 and R21, S09 and S12, M01 and M10', () => {
    expect(c.budget.profiles.year1.r).toEqual({ lo: 'R13', probe: 'R21', floor: 'R01' });
    expect(c.budget.defaultProfile).toBe('year1');
  });

  it('has the maths items the eggs need', () => {
    expect(c.steps.M09.items).toHaveLength(9);
    expect(c.steps.M12.items).toHaveLength(26);
    expect(c.items['m:pair:3+7'].task).toEqual({ op: 'pair', a: 3, b: 7 });
  });

  it('passes the validator for GPCs, steps, items, moments and the budget', () => {
    expect(realErrors(['BUILD', 'GPC_PHONEME', 'GPC_ID', 'MOMENT_', 'STEP_', 'ITEM_', 'PAIR_UNLOCK', 'BUDGET_'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/real-ladders.test.ts`
Expected: FAIL, content files missing.

- [ ] **Step 3: Write the JSON files** exactly as above.

- [ ] **Step 4: Run the test and the validator**

Run: `npx vitest run tests/content/real-ladders.test.ts`
Expected: PASS.

Run: `npm run check:content -- --data-only --only GPC_SOUND`
Expected: errors only for the keys `uu` (used by `oo.uu` in R14) and `yoo` (used by `ew` in R41). The audio workstream adds them (contract C-AUDIO 3), so they are not this task's failure. The ending sound `es` is not a GPC and does not show here.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/content games/moon-meadow-home/tests/content/real-ladders.test.ts
git commit -m "Add the v3 reading, spelling and maths ladders with GPCs, moments and contrast pairs"
```

### Task A7: Word packs

**Files:**
- Modify: `G/content/words/phase2.json`, `G/content/words/phase3-4.json`, `G/content/words/year1.json`
- Modify: `G/content/pairs.json` (only to drop or swap twins whose words cannot be pictured)
- Create: `G/tools/propose-splits.ts`
- Test: `G/tests/content/real-words.test.ts`

**Interfaces:**
- Consumes: A6 ladders and GPCs, A5 validator.
- Produces: about 500 words. Every planner carrier for reading wishes, labels, twins and plurals comes from here. The art and audio workstreams read these files through Task A10's outputs.

**Authoring rules.**

1. Pack by the step that serves the word: `rStep` R01 to R12 goes in `phase2.json`, R13 to R29 in `phase3-4.json`, R30 and above in `year1.json`. A word that is not readable in this build (`rStep` null, for example key, castle, horse, apple, mouse) goes in `year1.json`. Every plural lives with its one word.
2. `kind: "thing"` only for a single object a baby can want and Emma can recognise in a picture. Give `prompt` whenever the plain word is not the picture ("a toy fox", "a rubber duck", "a wooden plank", "a playing card"). Animals appear only as toys, and the prompt says so. No food that is sad or messy, nothing sharp, no vehicles, no people.
3. `tags`: `bath` for things that go in the Bath Pond (duck, boat, cup, shell, sponge, soap, bucket), `found` for things a baby can find and bring to the toy shelf (pins, beads, shells, hats, buns, keys), `food`, `clothes`, `toy`, `care`.
4. Split every word into GPCs from `gpcs.json`, following the spelling rules at the end of the GPC table in Task A6. Use the alternative id where the letters do not make their usual sound (`snow` is `s n ow.oa`). Run `node tools/propose-splits.ts words` with one word per line on standard input; it prints draft JSON rows using `splitUsual` and marks words it could not split. Fix alternatives by hand.
5. Set `syllables` for two-syllable words and `compound: true` for compounds (sunhat, hatbox, teapot, starfish as a toy, pinwheel). Set `affix` only for words whose suffix or prefix is the point (`painting` has `affix: "ing"`).
6. Every word whose leading or trailing consonant run is 2 or more must use a cluster listed in R21 to R23 (`WORD_CLUSTER`). Leave out words like "help" and "milk" if their cluster is not listed, or add the cluster to the step in `reading.json` and `spelling.json` together.
7. Never use a word in `EXCLUDED_WORDS`, a Dutch word, or a word that clashes with the world (curriculum.md 4.4 "left out").
8. The plurals from spec 3.10 are all present: -s: hats, pins, cups, mugs, rings, bells, ducks, boats, shells, bows, beads, capes, cakes, kites, bikes, chairs, keys, carrots, apples, pancakes, planks, bricks, castles, horses; -es: foxes, boxes, dresses, glasses, brushes, bushes, peaches, benches, branches, sashes; and `mouse` with `"irregular": { "w": "mice" }`. A stem that needs graphemes from unloaded steps (keys, castles, horses, apples) still goes in; the planner only serves it once she can read it.
9. Twin words: every word named in `pairs.json` twins is a pictured thing word. Where a twin word cannot be pictured honestly (`not`), drop that twin from `pairs.json` or swap in another pair from the same contrast. Keep at least one twin per pair item served by `twin-wish`.

**Targets per step.** The validator warns below 6 pictured thing words per grapheme, cluster or pattern step with `wish` and below 2 carriers per item at its own step, and fails when a loaded reading step has no servable item at all. An item with no carrier never blocks a pass (R01's s has none: no picturable thing is spelled with s, a, t and p alone), so treat the warnings as a to-do list and clear as many as honest words allow.

| Steps | Example words to start from |
|---|---|
| R01 to R05 | tap, map, pan, pin, tin, mat, net, pen, peg, nut, cup, cap, mug, rug, sock, duck (rubber duck), cot, pot, pod, log, lock, rag, rack, dog (toy), bed, bun, hat, hut, bib, tub, bag, bat (cricket bat) |
| R07 to R10 | doll, bell, dress, jam, yam, web, fox (toy), box, zip, quilt, chip, ship, fish (toy), ring, king (toy), wing, sink, bath |
| R13 to R17 | rain, tail, nail, chain, sail, pail, bee (toy), peel, heel, light, night, boat, coat, soap, moon, spoon, boot, book, hook, foot, star, fork, horn, cow (toy), crown, coin, ear, hair, chair, letter, hammer |
| R18 | sunhat, hatbox, rabbit (toy), puppet, button, muffin, bonnet, chicken (toy), shell, sheep (toy), cheek |
| R19 plurals | the list in rule 8 |
| R21 to R23, R26 | nest, vest, chest, tent, lamp, stamp, desk, belt, gift, bench, frog (toy), crab (toy), drum, plum, brush, flag, glass, plank, brick, strap, string, scrub brush, spoon, paint, toast, sunset, carpet, basket, picnic |
| R30, R32, R34 | tray, crayon, spade, cake, cape, gate, tape, cane, pea, leaf, beads, peach, tea, seal (toy), pie, tie, kite, bike, slide |
| R36, R38, R39, R41 | shirt, skirt, bird (toy), cube, flute, tube, rose, globe, cone, rope, snow, bow, bowl, toe, jewel, stew, glue, statue |
| Spelling S12 to S16 and S27 | the same cluster words, plus painting, jumper, unlock |

Leave out: vehicles (van, car, cab, bus, train, tractor), real animals that are not toys, sad or scary things, and any word whose cluster is not listed in R21 to R23.

- [ ] **Step 1: Write the failing gate test**

```ts
// G/tests/content/real-words.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { realErrors } from './real.ts';

const PLURALS_S = ['hats','pins','cups','mugs','rings','bells','ducks','boats','shells','bows','beads','capes','cakes','kites','bikes','chairs','keys','carrots','apples','pancakes','planks','bricks','castles','horses'];
const PLURALS_ES = ['foxes','boxes','dresses','glasses','brushes','bushes','peaches','benches','branches','sashes'];

describe('real words', () => {
  const c = readContent('1.0');
  const words = Object.values(c.words);

  it('has about 500 words', () => {
    expect(words.length).toBeGreaterThanOrEqual(450);
  });

  it('has every plural from the spec with its ending', () => {
    const plurals = new Map(words.filter(w => w.plural).map(w => [w.plural!.w, w.plural!.ending]));
    for (const p of PLURALS_S) expect(plurals.get(p), p).toBe('s');
    for (const p of PLURALS_ES) expect(plurals.get(p), p).toBe('es');
    expect(c.words.mouse?.irregular?.w).toBe('mice');
  });

  it('puts each word in the pack of its reading step', () => {
    for (const w of words) {
      if (!w.rStep) { expect(w.pack, w.w).toBe('words-year1'); continue; }
      const i = c.order.r.indexOf(w.rStep);
      const want = i <= c.order.r.indexOf('R12') ? 'words-phase2' : i <= c.order.r.indexOf('R29') ? 'words-phase3-4' : 'words-year1';
      expect(w.pack, w.w).toBe(want);
    }
  });

  it('passes the validator for words, twins, coverage and Dutch', () => {
    expect(realErrors(['WORD_', 'TWIN_', 'PAIR_', 'COVER_STEP', 'COVER_PLURALS', 'DUTCH_'])).toEqual([]);
  });

  it('leaves at most one reading item per loaded step without a carrier', () => {
    const c10 = readContent('1.0');
    for (const id of c10.loaded.r) {
      const step = c10.steps[id];
      if (step.display) continue;
      expect(step.items.filter(i => c10.items[i.id].carriers === 0).length, id).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/real-words.test.ts`
Expected: FAIL on the word count.

- [ ] **Step 3: Write `tools/propose-splits.ts`**

It reads standard input, one entry per line, and a mode argument `words` or `names`. For each entry it prints a JSON row: words as `{"w": "...", "gpcs": [...], "pic": "w-...", "kind": "thing"}`, names as `{"name": "...", "gpcs": [...], "source": "uk", "priority": 3}`, using `splitUsual` on the lowercase text against `content/gpcs.json`. An entry that does not split prints `{"unsplit": "<entry>"}`. Nothing is written to disk.

- [ ] **Step 4: Author the three packs** following the rules, then run:

Run: `npx vitest run tests/content/real-words.test.ts`
Expected: PASS.

Run: `npm run check:content -- --data-only --only WORD_,TWIN_,PAIR_,COVER_`
Expected: `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/content/words games/moon-meadow-home/content/pairs.json games/moon-meadow-home/tools/propose-splits.ts games/moon-meadow-home/tests/content/real-words.test.ts
git commit -m "Add the v3 word packs with plurals and twin words"
```

### Task A8: Blocklist data

**Files:**
- Create: `shared/blocklist.json`
- Test: `G/tests/content/real-blocklist.test.ts`

**Interfaces:**
- Consumes: A4 `buildBlocklist`, `checkBlocked`; A6 `gpcs.json`.
- Produces: the one shared blocklist (spec 2.8) read by the game (`static.ts`, Task A10), the validator and the generator.

**Content.** `{ "version": 1, "note": "...", "entries": [ { "w", "lang", "level" } ] }`. Levels: `toilet` (poo, wee, fart, bum, poop, and Dutch poep, plas, kak), `rude` (bottom words and mild insults: arse, bum is toilet, willy, fanny, nob, tit, tits, boob, git, sod, twit, and Dutch tiet, kont, reet, scheet, piemel, drol, stront, sukkel, debiel), `strong` (fuck, shit, piss, cock, dick, cunt, twat, wank, slag, slut, crap, bitch, bastard, and Dutch kut, lul, pik, pis, hoer, slet, klote, kanker, tering, tyfus), `slur` (the common English and Dutch slurs from naming.md section 5, including nip, fag, mongool, flikker). Spell each entry the way she could build it with gems; add a second spelling where the sound has two common spellings (fuk, phuck are not needed because the check is by sound, but `kak` and `cack` are both added because c and k differ only in spelling). "Pom" is not blocked (spec open decision 5). Write the note field in plain English: "Checked by sound. Never shown or played. Dutch entries exist only because she can build them with letters."

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/content/real-blocklist.test.ts
import { describe, it, expect } from 'vitest';
import { readContent, readRawBlocklist } from '../../tools/lib/read-content.ts';
import { buildBlocklist, checkBlocked } from '../../src/core/content/blocklist.ts';
import { phonemesOf, splitUsual } from '../../src/core/content/gpc.ts';

describe('shared blocklist', () => {
  const c = readContent('1.0');
  const list = buildBlocklist(readRawBlocklist(), c.gpcs);
  const check = (letters: string) => checkBlocked(phonemesOf(splitUsual(letters, c.gpcs)!, c.gpcs), list);

  it('splits every entry', () => expect(list.unsplit).toEqual([]));

  it('blocks strong words by sound, in English and Dutch', () => {
    for (const w of ['fuk', 'fuck', 'phuk', 'shit', 'kut', 'lul', 'pik']) expect(check(w)?.level, w).toBe('strong');
  });

  it('blocks toilet words with a giggle', () => {
    for (const w of ['poo', 'wee', 'poep']) expect(check(w)?.level, w).toBe('toilet');
  });

  it('blocks names that are rude in the other language', () => {
    expect(check('fanny')).not.toBeNull();
  });

  it('lets ordinary names through', () => {
    for (const w of ['cassidy', 'scarlett', 'pom', 'pip', 'sam', 'tess', 'dot', 'fen', 'bella', 'nan']) expect(check(w), w).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/real-blocklist.test.ts`
Expected: FAIL, `shared/blocklist.json` missing.

- [ ] **Step 3: Write `shared/blocklist.json`.** If a name in the "ordinary" list is caught as a part, remove that entry from the part check by lowering its level to `rude`, never by weakening `checkBlocked`.

- [ ] **Step 4: Run the test and the validator**

Run: `npx vitest run tests/content/real-blocklist.test.ts && npm run check:content -- --data-only --only BLOCK_`
Expected: PASS, `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add shared/blocklist.json games/moon-meadow-home/tests/content/real-blocklist.test.ts
git commit -m "Add the shared blocklist, checked by sound"
```

### Task A9: Tier 1 names

**Files:**
- Modify: `G/content/names/tier1.json`
- Modify: `G/content/gpcs.json` (only to add name GPC rows, following the A6 id rule)
- Test: `G/tests/content/real-names.test.ts`

**Interfaces:**
- Consumes: A6 GPCs, A8 blocklist, A5 validator, A7 `tools/propose-splits.ts`.
- Produces: `content.names`, used by naming (bells, garden, gold bell match) and by the `names-t1` line pack (A10).

**Authoring rules.**

1. About 1,000 names (at least 1,000 is the target, 300 the floor), simple and common: UK top names for girls and boys, common names at British schools in Cyprus (Greek-Cypriot and international names said the British English way, for example Eleni, Andreas, Sofia, Nikos), fantasy and nature names (Willow, Luna, Star, Clover, Sky, Juniper), and decodable names for R01 to R05 (Tam, Pip, Ben, Fen).
2. Every name from `V2_NAMES` (capitalised: Sam, Tam, ...), `source: "v2"`, priority 1. Spec 2.9: every v2 name gets clips in the first name batch.
3. Priority 1: v2 names, decodable names (all GPCs in R01 to R18 and the usual sound), and the 150 most common UK names. Priority 2: the next 400 by commonness. Priority 3: the rest. The line pack lists names in priority order, so a smaller audio budget cuts priority 3 first.
4. No family or friends' names (decisions.md), no Dutch names or Dutch spellings, no trademarked character names (Elsa, Moana, Ariel, Peppa and similar are out), no names that hit the blocklist (Fanny, Dick, Willy, Randy are out).
5. `pic` for names that fit a picture group: flowers (Lily, Rose, Daisy, Poppy, Iris, Violet), gems (Ruby, Pearl, Jade, Amber, Opal), sky (Luna, Star, Sky, Aurora, Stella), sweets (Candy, Honey, Sugar, Coco).
6. Split each name into GPCs as Elizabeth says it in British English: Bella is `b e ll a.@`, Lily is `l i l y.ee`, Sophie is `s o ph ie.ee`, Charlotte is `ch.sh ar l o t t`. Add GPC rows when a name needs one (`tch` [ch] sound ch, `kn` [n] sound n). `respell` only when Elizabeth needs help, for example `"respell": "Nee-koss"` for Nikos if speech-to-text shows a wrong reading.
7. The first-sound group is the first phoneme, so Charlotte is grouped under sh (spec 2.8).

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/content/real-names.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { V2_NAMES } from '../../tools/lib/validate.ts';
import { realErrors } from './real.ts';

describe('tier 1 names', () => {
  const c = readContent('1.0');

  it('has about 1,000 names with at least 300 at priority 1', () => {
    expect(c.names.length).toBeGreaterThanOrEqual(1000);
    expect(c.names.filter(n => n.priority === 1).length).toBeGreaterThanOrEqual(300);
  });

  it('includes every v2 name', () => {
    const slugs = new Set(c.names.map(n => n.slug));
    for (const n of V2_NAMES) expect(slugs.has(n), n).toBe(true);
  });

  it('groups Charlotte under sh', () => {
    expect(c.names.find(n => n.slug === 'charlotte')?.first).toBe('sh');
  });

  it('passes the validator for names, Dutch and spelling coverage', () => {
    expect(realErrors(['NAME_', 'DUTCH_', 'GPC_ID', 'GPC_PHONEME', 'COVER_STEP'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/real-names.test.ts`
Expected: FAIL on the name count.

- [ ] **Step 3: Author the names.** Draft with `node tools/propose-splits.ts names < list.txt` (keep `list.txt` in `$TMPDIR`, not in the repo), then correct alternatives by hand.

- [ ] **Step 4: Run the test and the validator**

Run: `npx vitest run tests/content/real-names.test.ts && npm run check:content -- --data-only --only NAME_,DUTCH_`
Expected: PASS, `0 errors`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/content/names/tier1.json games/moon-meadow-home/content/gpcs.json games/moon-meadow-home/tests/content/real-names.test.ts
git commit -m "Add about 1,000 tier 1 names with sound splits"
```

### Task A10: Line packs, numbers, picture list and the app loader

**Files:**
- Create: `G/tools/lib/lines.ts`
- Create: `G/tools/build-lines.ts`
- Create: `G/tools/list-pictures.ts`
- Create: `G/src/core/content/static.ts`
- Create (generated, committed): `G/public/audio/words-phase2/lines.json`, `G/public/audio/words-phase3-4/lines.json`, `G/public/audio/words-year1/lines.json`, `G/public/audio/numbers/lines.json`, `G/public/audio/names-t1/lines.json`, `G/content/pictures-needed.json`
- Test: `G/tests/content/lines.test.ts`, `G/tests/content/real-content.test.ts`

**Interfaces:**
- Consumes: A1 to A9.
- Produces:
  ```ts
  // tools/lib/lines.ts
  export function numberWord(n: number): string;                       // 0 to 100, British English
  export function numberLines(): LineEntry[];                           // num-0 .. num-100
  export function wordLines(c: Content): Record<WordPackName, LineEntry[]>;
  export function nameLines(c: Content, limit?: number): LineEntry[];
  export function phraseLines(c: Content): Partial<Record<PhrasePackName, LineEntry[]>>;
  export type PictureNeed = { id: string; subject: string; priority: 1 | 2 | 3; words: string[] };
  export function picturesNeeded(c: Content): PictureNeed[];
  // src/core/content/static.ts (app only, never imported by Node tools)
  export const content: Content;
  export const blocklist: Blocklist;
  ```
- Line rules: only pictured words (`pic` not null) get lines. `word-<w>` with text `Hat.` (first letter capital, full stop); `word-<plural>` with `Hats.`; for each twin with a model, `model-<word>` with the model text, in the pack of that word; numbers `num-<n>` with `Forty-two.`; names in priority order then file order, two lines each: `name-<slug>` with `<Name>!` and `name-<slug>-q` with `<Name>?`, using `respell` instead of the name when present. Speaker is always `narrator`. `note` holds the GPCs joined by spaces for the listening sheet.
- Picture rules: one entry per pictured word, `id = word.pic`, `subject = word.prompt ?? 'a ' + word.w`, `words` lists the word and its plural. Priority 1: stems of plurals, twin words, and words whose `rStep` is R13 to R30 or `sStep` is S09 to S20 (Emma's probe range). Priority 2: other words with a loaded `rStep` or `sStep`. Priority 3: the rest. Sorted by priority, then word.

- [ ] **Step 1: Write the failing line test**

```ts
// G/tests/content/lines.test.ts
import { describe, it, expect } from 'vitest';
import { numberWord, numberLines, wordLines, nameLines, picturesNeeded } from '../../tools/lib/lines.ts';
import { miniContent } from '../fixtures/mini.ts';

describe('numberWord', () => {
  it.each([[0, 'zero'], [7, 'seven'], [13, 'thirteen'], [20, 'twenty'], [42, 'forty-two'], [70, 'seventy'], [99, 'ninety-nine'], [100, 'one hundred']])(
    '%i is %s', (n, w) => expect(numberWord(n)).toBe(w));
  it('throws outside 0 to 100', () => expect(() => numberWord(101)).toThrow());
});

describe('line packs', () => {
  const c = miniContent();

  it('has 101 number lines spoken by the narrator', () => {
    const lines = numberLines();
    expect(lines).toHaveLength(101);
    expect(lines[42]).toEqual({ id: 'num-42', speaker: 'narrator', text: 'Forty-two.' });
  });

  it('makes a word line, a plural line and model lines', () => {
    const pack = wordLines(c)['words-phase2'];
    expect(pack).toContainEqual(expect.objectContaining({ id: 'word-hat', speaker: 'narrator', text: 'Hat.' }));
    expect(pack).toContainEqual(expect.objectContaining({ id: 'word-foxes', text: 'Foxes.' }));
    expect(pack).toContainEqual(expect.objectContaining({ id: 'model-pen', text: 'Pen has an e in the middle.' }));
    expect(pack.every(l => !/\d/.test(l.text))).toBe(true);
  });

  it('orders names by priority and makes two lines each', () => {
    const lines = nameLines(c);
    expect(lines.slice(0, 2)).toEqual([
      expect.objectContaining({ id: 'name-pip', text: 'Pip!' }),
      expect.objectContaining({ id: 'name-pip-q', text: 'Pip?' }),
    ]);
    expect(lines.at(-1)!.id).toBe('name-shay-q');
    expect(nameLines(c, 2).map(l => l.id)).toEqual(['name-pip', 'name-pip-q', 'name-sam', 'name-sam-q']);
  });

  it('lists pictures with plural stems first', () => {
    const p = picturesNeeded(c);
    expect(p[0].priority).toBe(1);
    expect(p.find(x => x.id === 'w-fox')).toMatchObject({ subject: 'a toy fox', priority: 1, words: ['fox', 'foxes'] });
    expect(p.some(x => x.id === 'w-sat')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/content/lines.test.ts`
Expected: FAIL, cannot resolve `tools/lib/lines.ts`.

- [ ] **Step 3: Implement `lines.ts`, `build-lines.ts`, `list-pictures.ts` and `static.ts`**

`build-lines.ts` takes `--names-limit <n>` (default: all), reads content with `readContent()`, and writes `{ "lines": [...] }` (two-space JSON and a trailing newline) to each pack folder in `public/audio/`, creating folders as needed. It never touches mp3 files or `manifest.json`. `list-pictures.ts` writes `content/pictures-needed.json` as `{ "pictures": PictureNeed[] }`.

`static.ts`:

```ts
// G/src/core/content/static.ts  (Vite only: JSON imports without attributes)
import { buildContent } from './build.ts';
import { buildBlocklist, type RawBlocklist, type Blocklist } from './blocklist.ts';
import type { Content, RawContent, RawPhrasePack } from './types.ts';
import release from '../../../content/release.json';
import gpcs from '../../../content/gpcs.json';
import reading from '../../../content/ladders/reading.json';
import spelling from '../../../content/ladders/spelling.json';
import maths from '../../../content/ladders/maths.json';
import budget from '../../../content/ladders/budget.json';
import moments from '../../../content/moments.json';
import pairs from '../../../content/pairs.json';
import phase2 from '../../../content/words/phase2.json';
import phase34 from '../../../content/words/phase3-4.json';
import year1 from '../../../content/words/year1.json';
import names from '../../../content/names/tier1.json';
import rawBlocklist from '../../../../../shared/blocklist.json';

const phraseFiles = import.meta.glob<RawPhrasePack>('../../../content/phrases/*.json', { eager: true, import: 'default' });

const raw = {
  release: release.release, gpcs: gpcs.gpcs, ladders: [reading, spelling, maths], words: [phase2, phase34, year1],
  names, pairs, moments, budget, phrases: Object.values(phraseFiles),
} as unknown as RawContent;

export const content: Content = buildContent(raw);
export const blocklist: Blocklist = buildBlocklist(rawBlocklist as RawBlocklist, content.gpcs);
```

- [ ] **Step 4: Write the full real-content gate test**

```ts
// G/tests/content/real-content.test.ts
import { describe, it, expect } from 'vitest';
import { realErrors } from './real.ts';

describe('all real content, data only', () => {
  it('has no validator errors at release 1.0', () => {
    expect(realErrors([''], { release: '1.0' })).toEqual([]);
  });
});
```

The prefix `''` matches every code.

- [ ] **Step 5: Generate the packs and run everything**

Run: `npm run build:lines && npm run list:pictures`
Expected: the five `lines.json` files and `content/pictures-needed.json` are written. The command prints the number of lines per pack and the character total per pack.

Run: `npx vitest run tests/content`
Expected: PASS, including `real-content.test.ts`.

Run: `npm run check:content -- --data-only`
Expected: `0 errors`. Warnings for `NAME_COUNT` are fine only if the count is between 300 and 1,000.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/tools/lib/lines.ts games/moon-meadow-home/tools/build-lines.ts games/moon-meadow-home/tools/list-pictures.ts games/moon-meadow-home/src/core/content/static.ts games/moon-meadow-home/public/audio/*/lines.json games/moon-meadow-home/content/pictures-needed.json games/moon-meadow-home/tests/content/lines.test.ts games/moon-meadow-home/tests/content/real-content.test.ts
git commit -m "Generate word, number and name line packs and the picture list"
```

Hand-off: tell the audio workstream the per-pack character totals printed in Step 5, and tell the art workstream that `content/pictures-needed.json` is ready.

### Task A11: Learning types, item ids and local days

**Files:**
- Create: `G/src/core/learning/types.ts`
- Create: `G/src/core/learning/ids.ts`
- Create: `G/src/core/learning/time.ts`
- Create: `G/tests/fixtures/events.ts`
- Test: `G/tests/learning/ids-time.test.ts`

**Interfaces:**
- Consumes: A1 types.
- Produces: the event payloads in contract C-EVENTS, the `Learner` shape, `itemStrand`, `graphemeItem`, `nameKey`, `nameItemId`, `isNameItem`, `HOUR_MS`, `DAY_MS`, `localDay`, and the test event builders used by every later learning and planner test.

- [ ] **Step 1: Write `types.ts`**

```ts
// G/src/core/learning/types.ts
import type { FluencyType, ItemId, LearnStrand, MomentKind, StepId, Strand } from '../content/types.ts';

export type Result = 'first' | 'miss' | 'helped';
export type ErrorTag = 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
export type Slot = 'current' | 'school' | 'side' | 'review' | 'mixed' | 'probe' | 'warmup' | 'golden' | 'name';
export type Box = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 6 is retired

export type EventBase = { id: string; t: number; type: string };
/** An event without the fields the store adds. Distributes over unions. */
export type Payload<E> = E extends unknown ? Omit<E, 'id' | 't'> : never;

export type VisitStartEvent = EventBase & { type: 'visit.start'; tz: number };
export type LearnResultEvent = EventBase & {
  type: 'learn.result';
  strand: LearnStrand;
  step: StepId | null;               // null for name reviews
  carrier: string;                   // carrierKey of the carrier shown
  items: { id: ItemId; r: Result }[];
  result: Result;
  ms: number | null;                 // decision time
  scaffold: 1 | 2 | 3;
  error: ErrorTag | null;
  place: string;
  moment: MomentKind;
  slot: Slot;
  probe: boolean;
};
export type StepPassedEvent = EventBase & { type: 'step.passed'; strand: Strand; step: StepId };
export type PlacementDoneEvent = EventBase & { type: 'placement.done'; strand: Strand; current: StepId; placed: StepId[]; side: StepId[] };
export type ProfileOverride = EventBase & { type: 'learn.override'; op: 'profile'; profile: string };
export type SetCurrentOverride = EventBase & { type: 'learn.override'; op: 'set-current'; strand: Strand; step: StepId; placed: StepId[]; side: StepId[] };
export type PlacedOverride = EventBase & { type: 'learn.override'; op: 'mark-placed' | 'unmark-placed'; strand: Strand; step: StepId };
export type SchoolOverride = EventBase & { type: 'learn.override'; op: 'school'; strand: Strand; step: StepId; on: boolean };
export type LearnOverrideEvent = ProfileOverride | SetCurrentOverride | PlacedOverride | SchoolOverride;
export type V2Seed = { strand: 'r' | 's'; item: ItemId; box: 0 | 1 };
export type ImportV2Event = EventBase & { type: 'import.v2'; hash: string; seeds: V2Seed[]; mathsV2Step?: number };
export type LearnEvent = VisitStartEvent | LearnResultEvent | StepPassedEvent | PlacementDoneEvent | LearnOverrideEvent | ImportV2Event;
export type LearnFact = Payload<StepPassedEvent> | Payload<PlacementDoneEvent>;

export type ItemMemory = {
  box: Box;
  lastT: number;          // never decreases
  lastVisit: number;      // visit sequence number of the last result
  seen: number;           // results counted, probes included
  firsts: number;         // first tries outside probes and seeds
  seeded: boolean;        // set by a v2 seed
  placedInit: boolean;    // created in box 2 by placement
};
export type StepState = {
  level: 1 | 2 | 3;
  up: number;             // first tries in a row
  down: number;           // miss or helped in a row
  window: { r: Result; day: number }[];   // results at the top level, newest last, at most passWindow
  passed: boolean;
  passedT: number | null;
  placed: boolean;
  review: Result[];       // review results after the pass or placement
  reopened: boolean;
  closeRun: { r: Result; day: number }[];
  startT: number | null;  // first time served as current, school or side step
};
export type PlacementState = {
  done: boolean;
  lo: StepId;
  hi: StepId;
  floor: StepId;
  loVerified: boolean;
  hiFailed: boolean;
  openedDown: boolean;
  floorMissed: boolean;
  firstProbe: StepId | null;
  lastProbe: StepId | null;
  pending: { step: StepId; r: Result[] } | null;
  items: number;
  current: StepId | null; // set by placement.done or set-current
};
export type VisitState = {
  seq: number;
  startT: number;
  tz: number;
  counts: Record<LearnStrand, number>;
  ladder: number;
  spell: number;
  golden: boolean;
  box0: Record<ItemId, number>;   // other results of the same strand since the item fell into box 0 this visit
  recent: string[];               // carrier keys, newest last
};
export type FluencyState = { median: number | null; computedAt: number; samples: number[] };
export type RecentResult = { t: number; r: Result; err: ErrorTag | null; slot: Slot };
export type Learner = {
  v: 1;
  profile: string;
  lastT: number;
  items: Record<ItemId, ItemMemory>;
  steps: Record<StepId, StepState>;
  placement: Record<Strand, PlacementState>;
  side: Record<Strand, StepId[]>;
  school: Record<StepId, boolean>;   // parent overrides only
  visit: VisitState;
  newToday: Record<Strand, { day: number; ids: ItemId[] }>;
  fluency: Record<FluencyType, FluencyState>;
  imported: string[];
  recent: Record<LearnStrand, RecentResult[]>;   // at most 300 per strand
};
```

- [ ] **Step 2: Write the test event builders**

```ts
// G/tests/fixtures/events.ts
import type { ErrorTag, ImportV2Event, LearnOverrideEvent, LearnResultEvent, Payload, PlacementDoneEvent, Result, Slot, StepPassedEvent, V2Seed, VisitStartEvent } from '../../src/core/learning/types.ts';
import type { ItemId, LearnStrand, MomentKind, StepId, Strand } from '../../src/core/content/types.ts';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
/** 1 December 2026, 15:00 UTC, which is 17:00 in Cyprus (UTC+2). */
export const T0 = Date.UTC(2026, 11, 1, 15, 0, 0);

let seq = 0;
export function resetSeq(): void { seq = 0; }
function base<T extends string>(type: T, t: number): { id: string; t: number; type: T } {
  seq += 1;
  return { id: `dev1:${seq}`, t, type };
}

export const visitStart = (t: number, tz = 120): VisitStartEvent => ({ ...base('visit.start', t), tz });

export type ResultOpts = {
  strand: LearnStrand; step: StepId | null; items: ItemId[]; r: Result;
  slot?: Slot; scaffold?: 1 | 2 | 3; probe?: boolean; ms?: number | null; moment?: MomentKind;
  perItem?: Result[]; error?: ErrorTag | null; carrier?: string;
};
export function result(t: number, o: ResultOpts): LearnResultEvent {
  return {
    ...base('learn.result', t),
    strand: o.strand, step: o.step, carrier: o.carrier ?? 'test',
    items: o.items.map((id, i) => ({ id, r: o.perItem?.[i] ?? o.r })),
    result: o.r, ms: o.ms === undefined ? 1500 : o.ms, scaffold: o.scaffold ?? 1, error: o.error ?? null,
    place: 'test', moment: o.moment ?? 'wish', slot: o.slot ?? (o.probe ? 'probe' : 'current'), probe: o.probe ?? false,
  };
}
export const passed = (t: number, strand: Strand, step: StepId): StepPassedEvent => ({ ...base('step.passed', t), strand, step });
export const placementDone = (t: number, strand: Strand, current: StepId, placed: StepId[], side: StepId[] = []): PlacementDoneEvent =>
  ({ ...base('placement.done', t), strand, current, placed, side });
export const override = (t: number, p: Payload<LearnOverrideEvent>): LearnOverrideEvent =>
  ({ ...base('learn.override', t), ...p }) as LearnOverrideEvent;
export const importV2 = (t: number, hash: string, seeds: V2Seed[]): ImportV2Event => ({ ...base('import.v2', t), hash, seeds });
```

- [ ] **Step 3: Write the failing test**

```ts
// G/tests/learning/ids-time.test.ts
import { describe, it, expect } from 'vitest';
import { itemStrand, graphemeItem, nameKey, nameItemId, isNameItem } from '../../src/core/learning/ids.ts';
import { localDay, HOUR_MS, DAY_MS } from '../../src/core/learning/time.ts';
import { T0 } from '../fixtures/events.ts';

describe('item ids', () => {
  it('reads the strand from the prefix', () => {
    expect(itemStrand('r:g:ai')).toBe('r');
    expect(itemStrand('s:end:es')).toBe('s');
    expect(itemStrand('m:miss:10-7')).toBe('m');
    expect(itemStrand('name:abc')).toBe('name');
    expect(itemStrand('x:y')).toBeNull();
  });
  it('builds name item ids', () => {
    expect(nameKey('Lily-Rose')).toBe('lilyrose');
    expect(nameItemId('Tim')).toBe('name:tim');
    expect(isNameItem('name:tim')).toBe(true);
    expect(isNameItem('r:g:a')).toBe(false);
  });
  it('builds grapheme item ids for the v2 import', () => {
    expect(graphemeItem('r', 'ck')).toBe('r:g:ck');
    expect(graphemeItem('s', 'a-e')).toBe('s:g:a-e');
  });
});

describe('localDay', () => {
  it('splits days at local midnight', () => {
    expect(DAY_MS).toBe(24 * HOUR_MS);
    expect(localDay(T0 + 6 * HOUR_MS, 120)).toBe(localDay(T0, 120));        // 23:00 local
    expect(localDay(T0 + 8 * HOUR_MS, 120)).toBe(localDay(T0, 120) + 1);    // 01:00 local next day
    expect(localDay(T0 + 8 * HOUR_MS, 0)).toBe(localDay(T0, 0));            // 23:00 UTC
  });
});
```

- [ ] **Step 4: Run it and see it fail**

Run: `npx vitest run tests/learning/ids-time.test.ts`
Expected: FAIL, cannot resolve `ids.ts`.

- [ ] **Step 5: Implement**

```ts
// G/src/core/learning/ids.ts
import type { GpcId, ItemId, LearnStrand } from '../content/types.ts';
export function itemStrand(id: ItemId): LearnStrand | null {
  if (id.startsWith('name:')) return 'name';
  if (id[1] === ':' && (id[0] === 'r' || id[0] === 's' || id[0] === 'm')) return id[0];
  return null;
}
export const nameKey = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');
export const nameItemId = (name: string): ItemId => `name:${nameKey(name)}`;
export const isNameItem = (id: ItemId): boolean => id.startsWith('name:');
export const graphemeItem = (strand: 'r' | 's', gpc: GpcId): ItemId => `${strand}:g:${gpc}`;
```

```ts
// G/src/core/learning/time.ts
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
/** Local calendar day number for a time and an offset in minutes east of UTC. */
export const localDay = (t: number, tzMinutes: number): number => Math.floor((t + tzMinutes * 60_000) / DAY_MS);
```

- [ ] **Step 6: Run the test and see it pass**

Run: `npx vitest run tests/learning/ids-time.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/types.ts games/moon-meadow-home/src/core/learning/ids.ts games/moon-meadow-home/src/core/learning/time.ts games/moon-meadow-home/tests/fixtures/events.ts games/moon-meadow-home/tests/learning/ids-time.test.ts
git commit -m "Add learning event and learner types, item ids and local days"
```

### Task A12: Leitner boxes and fluency

**Files:**
- Create: `G/src/core/learning/leitner.ts`
- Create: `G/src/core/learning/fluency.ts`
- Test: `G/tests/learning/leitner.test.ts`, `G/tests/learning/fluency.test.ts`

**Interfaces:**
- Consumes: A11 types, `Budget`.
- Produces:
  ```ts
  export function nextBox(box: Box, r: Result, fast: boolean, fluency: boolean): Box;
  export function newMemory(): ItemMemory;          // box 0, lastT 0, lastVisit 0, seen 0, firsts 0, both flags false
  export function updateMemory(m: ItemMemory, r: Result, t: number, visitSeq: number, fast: boolean, fluency: boolean, countFirst: boolean): void;
  export function isDue(id: ItemId, m: ItemMemory, now: number, v: VisitState, b: Budget): boolean;
  export function dueAt(m: ItemMemory, b: Budget): number;
  export function emptyFluency(): FluencyState;     // { median: null, computedAt: 0, samples: [] }
  export function isFast(f: FluencyState, ms: number | null, b: Budget): boolean;
  export function recordFirstTry(f: FluencyState, ms: number, t: number, b: Budget): void;
  ```
- Rules (spec 3.4, curriculum 5.3): first try moves up one box (4 to 5 and 5 to retired need `fast` for fluency items); miss or helped: 0 stays 0, 1 stays 1, 2 and 3 go to 1, 4 goes to 2, 5 and retired go to 3. Due: box 0 when the visit is later than its last result, or after `box0Gap` other results of its strand in this visit; box 1 at a later visit that starts at least `box1MinHours` after its last result; boxes 2 to 5 after `boxDays`; retired after `retiredDays`. `updateMemory` sets `lastT = max(lastT, t)`, so a clock that jumps back never moves it backwards. `dueAt` is `lastT` for boxes 0 and 1, otherwise `lastT` plus the box's days. Fast means `ms < min(median, fluencyCeilingMs)`, with only the ceiling while there is no median. The median is first computed when `fluencyMinSamples` samples exist and then recomputed when a sample arrives at least `fluencyRecomputeDays` after the last computation. Samples keep the newest `fluencyWindow`. The fast check for a result uses the median before that result's sample is added.

- [ ] **Step 1: Write the failing tests**

```ts
// G/tests/learning/leitner.test.ts
import { describe, it, expect } from 'vitest';
import { nextBox, isDue, dueAt, newMemory, updateMemory } from '../../src/core/learning/leitner.ts';
import type { Box, ItemMemory, Result, VisitState } from '../../src/core/learning/types.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';
import { T0, HOUR, DAY } from '../fixtures/events.ts';

const visit = (seq: number, startT: number, box0: Record<string, number> = {}): VisitState =>
  ({ seq, startT, tz: 120, counts: { r: 0, s: 0, m: 0, name: 0 }, ladder: 0, spell: 0, golden: false, box0, recent: [] });
const mem = (box: Box, lastT: number, lastVisit: number): ItemMemory =>
  ({ box, lastT, lastVisit, seen: 1, firsts: 0, seeded: false, placedInit: false });
const ID = 'r:g:a';

describe('nextBox', () => {
  it.each([
    [0, 'first', 1], [1, 'first', 2], [2, 'first', 3], [3, 'first', 4], [4, 'first', 5], [5, 'first', 6], [6, 'first', 6],
    [0, 'miss', 0], [1, 'miss', 1], [2, 'miss', 1], [3, 'miss', 1], [4, 'miss', 2], [5, 'miss', 3], [6, 'miss', 3],
    [2, 'helped', 1], [4, 'helped', 2],
  ])('box %i with %s goes to %i for a non-fluency item', (box, r, want) => {
    expect(nextBox(box as Box, r as Result, false, false)).toBe(want);
  });
  it('a fluency item needs a fast first try to leave box 4 and box 5', () => {
    expect(nextBox(4, 'first', false, true)).toBe(4);
    expect(nextBox(4, 'first', true, true)).toBe(5);
    expect(nextBox(5, 'first', false, true)).toBe(5);
    expect(nextBox(5, 'first', true, true)).toBe(6);
    expect(nextBox(3, 'first', false, true)).toBe(4);
  });
});

describe('isDue', () => {
  it('box 0 comes back after 2 other results of its strand in the same visit', () => {
    expect(isDue(ID, mem(0, T0, 1), T0, visit(1, T0, { [ID]: 1 }), b)).toBe(false);
    expect(isDue(ID, mem(0, T0, 1), T0, visit(1, T0, { [ID]: 2 }), b)).toBe(true);
  });
  it('box 0 from an earlier visit is due at once', () => {
    expect(isDue(ID, mem(0, T0, 1), T0 + HOUR, visit(2, T0 + HOUR), b)).toBe(true);
  });
  it('box 1 waits for a later visit that starts at least 4 hours later', () => {
    expect(isDue(ID, mem(1, T0, 1), T0 + HOUR, visit(2, T0 + HOUR), b)).toBe(false);
    expect(isDue(ID, mem(1, T0, 1), T0 + 5 * HOUR, visit(2, T0 + 5 * HOUR), b)).toBe(true);
    expect(isDue(ID, mem(1, T0, 1), T0 + 5 * HOUR, visit(1, T0), b)).toBe(false);
  });
  it.each([[2, 2], [3, 4], [4, 8], [5, 16], [6, 42]])('box %i is due after %i days', (box, days) => {
    expect(isDue(ID, mem(box as Box, T0, 1), T0 + days * DAY - 1, visit(5, T0 + days * DAY - 1), b)).toBe(false);
    expect(isDue(ID, mem(box as Box, T0, 1), T0 + days * DAY, visit(5, T0 + days * DAY), b)).toBe(true);
    expect(dueAt(mem(box as Box, T0, 1), b)).toBe(T0 + days * DAY);
  });
});

describe('updateMemory', () => {
  it('counts results and first tries', () => {
    const m = newMemory();
    updateMemory(m, 'first', T0, 1, false, false, true);
    expect(m).toMatchObject({ box: 1, lastT: T0, lastVisit: 1, seen: 1, firsts: 1 });
    updateMemory(m, 'first', T0 + 1, 1, false, false, false);
    expect(m).toMatchObject({ box: 2, seen: 2, firsts: 1 });
  });
  it('lastT never goes backwards when the clock jumps back', () => {
    const m = newMemory();
    updateMemory(m, 'first', T0 + HOUR, 1, false, false, true);
    updateMemory(m, 'first', T0, 1, false, false, true);
    expect(m.lastT).toBe(T0 + HOUR);
    expect(m.box).toBe(2);
  });
});
```

```ts
// G/tests/learning/fluency.test.ts
import { describe, it, expect } from 'vitest';
import { emptyFluency, isFast, recordFirstTry } from '../../src/core/learning/fluency.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';
import { T0, HOUR, DAY } from '../fixtures/events.ts';

describe('fluency', () => {
  it('uses the 3 second ceiling before there is a median', () => {
    const f = emptyFluency();
    expect(isFast(f, 2900, b)).toBe(true);
    expect(isFast(f, 3100, b)).toBe(false);
    expect(isFast(f, null, b)).toBe(false);
  });
  it('computes the median after 10 first tries and recomputes it once a week', () => {
    const f = emptyFluency();
    for (let i = 0; i < 10; i++) recordFirstTry(f, 1000 + i * 100, T0 + i, b);
    expect(f.median).toBe(1450);
    expect(isFast(f, 1400, b)).toBe(true);
    expect(isFast(f, 1500, b)).toBe(false);
    for (let i = 0; i < 10; i++) recordFirstTry(f, 500, T0 + HOUR, b);
    expect(f.median).toBe(1450);
    recordFirstTry(f, 500, T0 + 7 * DAY + 10, b);
    expect(f.median).toBe(500);
  });
  it('keeps only the newest 50 samples', () => {
    const f = emptyFluency();
    for (let i = 0; i < 60; i++) recordFirstTry(f, 1000, T0 + i, b);
    expect(f.samples).toHaveLength(50);
  });
  it('the median never goes above the ceiling', () => {
    const f = emptyFluency();
    for (let i = 0; i < 10; i++) recordFirstTry(f, 5000, T0 + i, b);
    expect(isFast(f, 3500, b)).toBe(false);
    expect(isFast(f, 2900, b)).toBe(true);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/learning/leitner.test.ts tests/learning/fluency.test.ts`
Expected: FAIL, cannot resolve the modules.

- [ ] **Step 3: Implement both modules** by the rules above. `isDue` for box 1 is `m.lastVisit < v.seq && v.startT >= m.lastT + b.box1MinHours * HOUR_MS`. The median of an even count is the mean of the middle two.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run tests/learning/leitner.test.ts tests/learning/fluency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/leitner.ts games/moon-meadow-home/src/core/learning/fluency.ts games/moon-meadow-home/tests/learning/leitner.test.ts games/moon-meadow-home/tests/learning/fluency.test.ts
git commit -m "Add Leitner boxes and the fluency speed rule"
```

### Task A13: Scaffold levels and step mastery

**Files:**
- Create: `G/src/core/learning/scaffold.ts`
- Create: `G/src/core/learning/mastery.ts`
- Test: `G/tests/learning/scaffold.test.ts`, `G/tests/learning/mastery.test.ts`

**Interfaces:**
- Consumes: A11 types, `Budget`.
- Produces:
  ```ts
  export function moveScaffold(s: { level: 1 | 2 | 3; up: number; down: number }, r: Result, top: 1 | 2 | 3, b: Budget): void;
  export function newStepState(): StepState;   // level 1, empty runs and windows, all flags false, times null
  export function pushWindow(s: StepState, r: Result, day: number, b: Budget): void;
  export function readyToPass(s: StepState, stepItems: ItemId[], mem: Record<ItemId, ItemMemory>, top: 1 | 2 | 3, b: Budget): boolean;
  export function recordReview(s: StepState, r: Result, day: number, b: Budget): void;
  ```
- `stepItems` is the step's servable items (`carriers !== 0`); the fold passes that list, so an item no carrier can serve in this build never blocks a pass.
- Rules (spec 3.3, 3.4): `scaffoldUp` first tries in a row move up one level (never above `top`) and reset the run; `scaffoldDown` miss-or-helped in a row move down one level (never below 1). `pushWindow` keeps the newest `passWindow` entries. `readyToPass` is true when the step is not passed, `level === top`, the window holds at least `passFirst` first tries, those window entries cover at least `passDays` distinct days, and every item has `firsts > 0`. `recordReview`: while not reopened, keep the last `reopenWindow` results and reopen when that window is full with fewer than `reopenMinFirst` first tries; while reopened, keep the last `closeWindow` results with days and close when that window is full with at least `closeFirst` first tries over at least 2 days.

- [ ] **Step 1: Write the failing tests**

```ts
// G/tests/learning/scaffold.test.ts
import { describe, it, expect } from 'vitest';
import { moveScaffold } from '../../src/core/learning/scaffold.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';

const s = (level: 1 | 2 | 3 = 1) => ({ level, up: 0, down: 0 });

describe('moveScaffold', () => {
  it('three first tries in a row move up one level', () => {
    const x = s();
    moveScaffold(x, 'first', 3, b); moveScaffold(x, 'first', 3, b);
    expect(x.level).toBe(1);
    moveScaffold(x, 'first', 3, b);
    expect(x).toEqual({ level: 2, up: 0, down: 0 });
  });
  it('a miss breaks the run', () => {
    const x = s();
    for (const r of ['first', 'first', 'miss', 'first'] as const) moveScaffold(x, r, 3, b);
    expect(x.level).toBe(1);
  });
  it('two misses or helped in a row move down one level', () => {
    const x = s(3);
    moveScaffold(x, 'miss', 3, b);
    expect(x.level).toBe(3);
    moveScaffold(x, 'helped', 3, b);
    expect(x.level).toBe(2);
  });
  it('one miss between first tries never moves down', () => {
    const x = s(3);
    for (const r of ['miss', 'first', 'miss', 'first'] as const) moveScaffold(x, r, 3, b);
    expect(x.level).toBe(3);
  });
  it('stays inside 1 and the top level', () => {
    const x = s();
    for (let i = 0; i < 9; i++) moveScaffold(x, 'first', 2, b);
    expect(x.level).toBe(2);
    const y = s();
    for (let i = 0; i < 4; i++) moveScaffold(y, 'miss', 3, b);
    expect(y.level).toBe(1);
    const z = s();
    for (let i = 0; i < 6; i++) moveScaffold(z, 'first', 1, b);
    expect(z.level).toBe(1);
  });
});
```

```ts
// G/tests/learning/mastery.test.ts
import { describe, it, expect } from 'vitest';
import { newStepState, pushWindow, readyToPass, recordReview } from '../../src/core/learning/mastery.ts';
import type { ItemMemory, Result } from '../../src/core/learning/types.ts';
import { MINI_BUDGET as b } from '../fixtures/mini.ts';

const ITEMS = ['r:g:s', 'r:g:a'];
const tried = (firsts = 1): Record<string, ItemMemory> => Object.fromEntries(ITEMS.map(id =>
  [id, { box: 1, lastT: 0, lastVisit: 1, seen: 1, firsts, seeded: false, placedInit: false }]));
function stepWith(results: [Result, number][], level: 1 | 2 | 3 = 3) {
  const s = newStepState();
  s.level = level;
  for (const [r, day] of results) pushWindow(s, r, day, b);
  return s;
}
const run = (r: Result, n: number, day: number): [Result, number][] => Array.from({ length: n }, () => [r, day]);

describe('readyToPass', () => {
  it('passes with 12 of 15 first tries at the top over two days and every item tried', () => {
    expect(readyToPass(stepWith([...run('first', 12, 100), ...run('miss', 3, 101)]), ITEMS, tried(), 3, b)).toBe(true);
  });
  it('needs two days', () => {
    expect(readyToPass(stepWith([...run('first', 12, 100), ...run('miss', 3, 100)]), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('needs 12 first tries', () => {
    expect(readyToPass(stepWith([...run('first', 11, 100), ...run('miss', 4, 101)]), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('needs the scaffold at the top level', () => {
    expect(readyToPass(stepWith([...run('first', 12, 100), ...run('first', 3, 101)], 2), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('needs a first try on every item', () => {
    const mem = tried();
    mem['r:g:a'].firsts = 0;
    expect(readyToPass(stepWith([...run('first', 8, 100), ...run('first', 7, 101)]), ITEMS, mem, 3, b)).toBe(false);
  });
  it('only looks at the last 15', () => {
    expect(readyToPass(stepWith([...run('first', 15, 100), ...run('miss', 4, 101)]), ITEMS, tried(), 3, b)).toBe(false);
  });
  it('is false once passed', () => {
    const s = stepWith([...run('first', 12, 100), ...run('first', 3, 101)]);
    s.passed = true;
    expect(readyToPass(s, ITEMS, tried(), 3, b)).toBe(false);
  });
});

describe('recordReview', () => {
  it('reopens after 10 review results with fewer than 7 first tries', () => {
    const s = newStepState();
    s.passed = true;
    for (const r of [...run('first', 6, 1), ...run('miss', 3, 1)]) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(false);
    recordReview(s, 'miss', 1, b);
    expect(s.reopened).toBe(true);
  });
  it('stays open on a good run of 10 review results', () => {
    const s = newStepState();
    for (const r of [...run('first', 7, 1), ...run('miss', 3, 1)]) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(false);
  });
  it('closes after 8 of the next 10 are first tries over two days', () => {
    const s = newStepState();
    s.reopened = true;
    for (const r of [...run('first', 8, 1), ...run('miss', 2, 1)]) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(true);
    for (const r of run('first', 2, 2)) recordReview(s, r[0], r[1], b);
    expect(s.reopened).toBe(false);
  });
});
```

The last test works because the close window slides: after the two first tries on day 2 the last 10 are 6 first tries and 2 misses from day 1 plus 2 first tries from day 2, which is 8 first tries over two days.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/learning/scaffold.test.ts tests/learning/mastery.test.ts`
Expected: FAIL, cannot resolve the modules.

- [ ] **Step 3: Implement both modules** by the rules above.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run tests/learning/scaffold.test.ts tests/learning/mastery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/scaffold.ts games/moon-meadow-home/src/core/learning/mastery.ts games/moon-meadow-home/tests/learning/scaffold.test.ts games/moon-meadow-home/tests/learning/mastery.test.ts
git commit -m "Add scaffold moves, the step pass rule and reopening"
```

### Task A14: Placement

**Files:**
- Create: `G/src/core/learning/placement.ts`
- Test: `G/tests/learning/placement.test.ts`

**Interfaces:**
- Consumes: A2 `Content`, A11 types, `Profile`, `Budget`.
- Produces:
  ```ts
  export type IsSchool = (step: StepId) => boolean;
  export function searchList(c: Content, strand: Strand, isSchool: IsSchool): StepId[];
  export function initPlacement(c: Content, strand: Strand, profile: Profile, isSchool: IsSchool): PlacementState;
  export function recordProbe(p: PlacementState, step: StepId, r: Result, c: Content, strand: Strand, isSchool: IsSchool): void;
  export function nextProbe(p: PlacementState, c: Content, strand: Strand, visitSeq: number, isSchool: IsSchool): StepId | null;
  export function placementEnd(p: PlacementState, c: Content, strand: Strand, visitSeq: number, isSchool: IsSchool): StepId | null;
  ```
  `placementEnd` returns the current step to record when placement should end now, or `null`. It never mutates.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/placement.test.ts
import { describe, it, expect } from 'vitest';
import { searchList, initPlacement, recordProbe, nextProbe, placementEnd } from '../../src/core/learning/placement.ts';
import type { Result } from '../../src/core/learning/types.ts';
import { miniContent } from '../fixtures/mini.ts';

const c = miniContent();
const year1 = c.budget.profiles.year1;
const school = (id: string) => year1.school.includes(id);
function probe(p: ReturnType<typeof initPlacement>, step: string, ...rs: Result[]) {
  for (const r of rs) recordProbe(p, step, r, c, 'r', school);
}

describe('placement', () => {
  it('searches loaded steps that are not contrast, school or display steps', () => {
    expect(searchList(c, 'r', school)).toEqual(['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13', 'R21']);
    expect(searchList(c, 'm', () => false)).toEqual(['M01', 'M02', 'M05', 'M07', 'M09', 'M10']);
  });

  it('starts Emma with lo R13 and a first probe at R21', () => {
    const p = initPlacement(c, 'r', year1, school);
    expect(p).toMatchObject({ done: false, lo: 'R13', hi: 'R21', floor: 'R01', loVerified: false });
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R21');
    expect(placementEnd(p, c, 'r', 1, school)).toBeNull();
  });

  it('asks for a second item at the same step', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'first');
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R21');
  });

  it('two first tries at the top end placement there', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'first', 'first');
    expect(placementEnd(p, c, 'r', 1, school)).toBe('R21');
  });

  it('a miss at R21 probes the lower bound R13, and two first tries there end at R13', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'first', 'miss');
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R13');
    probe(p, 'R13', 'first', 'first');
    expect(placementEnd(p, c, 'r', 1, school)).toBe('R13');
  });

  it('a miss at the lower bound opens down to R01, jumping at most two steps in visit 1', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'miss', 'miss');
    probe(p, 'R13', 'miss', 'first');
    expect(p).toMatchObject({ lo: 'R01', hi: 'R13', hiFailed: true, openedDown: true, loVerified: false });
    expect(nextProbe(p, c, 'r', 1, school)).toBe('R08');
    expect(nextProbe(p, c, 'r', 2, school)).toBe('R04');
  });

  it('a miss at R01 ends placement at R01', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'miss', 'miss');
    probe(p, 'R13', 'miss', 'miss');
    probe(p, 'R04', 'miss', 'miss');
    expect(nextProbe(p, c, 'r', 2, school)).toBe('R02');
    probe(p, 'R02', 'miss', 'miss');
    expect(nextProbe(p, c, 'r', 2, school)).toBe('R01');
    probe(p, 'R01', 'miss', 'miss');
    expect(placementEnd(p, c, 'r', 2, school)).toBe('R01');
  });

  it('ends after 10 probe items, at lo', () => {
    const p = initPlacement(c, 'r', year1, school);
    p.items = 10;
    expect(placementEnd(p, c, 'r', 2, school)).toBe('R13');
  });

  it('ends at the start of the fifth visit, at lo', () => {
    const p = initPlacement(c, 'r', year1, school);
    expect(placementEnd(p, c, 'r', 4, school)).toBeNull();
    expect(placementEnd(p, c, 'r', 5, school)).toBe('R13');
  });

  it('a profile without a probe is done at once', () => {
    const p = initPlacement(c, 'r', c.budget.profiles.fresh, () => false);
    expect(p.done).toBe(true);
    expect(nextProbe(p, c, 'r', 1, () => false)).toBeNull();
  });

  it('a first try at a step below a verified lo changes nothing', () => {
    const p = initPlacement(c, 'r', year1, school);
    probe(p, 'R21', 'miss', 'miss');
    probe(p, 'R13', 'first', 'first');
    probe(p, 'R05', 'miss', 'miss');
    expect(p).toMatchObject({ lo: 'R13', loVerified: true, floorMissed: false });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/learning/placement.test.ts`
Expected: FAIL, cannot resolve `placement.ts`.

- [ ] **Step 3: Implement**

```ts
// G/src/core/learning/placement.ts
import type { Content, Profile, StepId, Strand } from '../content/types.ts';
import type { PlacementState, Result } from './types.ts';

export type IsSchool = (step: StepId) => boolean;

export function searchList(c: Content, strand: Strand, isSchool: IsSchool): StepId[] {
  return c.loaded[strand].filter(id => {
    const s = c.steps[id];
    return !s.contrast && !s.display && !isSchool(id);
  });
}

function nearest(c: Content, list: StepId[], id: StepId): StepId {
  if (list.includes(id)) return id;
  const want = c.steps[id]?.index ?? 0;
  return list.find(x => c.steps[x].index >= want) ?? list[list.length - 1];
}

export function initPlacement(c: Content, strand: Strand, profile: Profile, isSchool: IsSchool): PlacementState {
  const start = profile[strand];
  const L = searchList(c, strand, isSchool);
  const p: PlacementState = {
    done: false, lo: L.length ? nearest(c, L, start.lo) : start.lo, hi: L[L.length - 1] ?? start.lo,
    floor: L.length ? nearest(c, L, start.floor) : start.floor,
    loVerified: false, hiFailed: false, openedDown: false, floorMissed: false,
    firstProbe: start.probe && L.length ? nearest(c, L, start.probe) : null,
    lastProbe: null, pending: null, items: 0, current: null,
  };
  if (!p.firstProbe) p.done = true;
  return p;
}

export function recordProbe(p: PlacementState, step: StepId, r: Result, c: Content, strand: Strand, isSchool: IsSchool): void {
  if (p.done) return;
  p.items += 1;
  p.lastProbe = step;
  if (!p.pending || p.pending.step !== step) p.pending = { step, r: [] };
  p.pending.r.push(r);
  if (p.pending.r.length < c.budget.placement.itemsPerProbe) return;
  const ok = p.pending.r.every(x => x === 'first');
  p.pending = null;
  const L = searchList(c, strand, isSchool);
  const i = L.indexOf(step), lo = L.indexOf(p.lo), hi = L.indexOf(p.hi);
  if (i < 0) return;
  if (ok) {
    if (i >= lo) { p.lo = step; p.loVerified = true; }
    return;
  }
  if (i <= lo) {
    if (p.loVerified) return;
    const floor = L.indexOf(p.floor);
    if (!p.openedDown && floor >= 0 && floor < lo) {
      p.openedDown = true; p.hi = p.lo; p.hiFailed = true; p.lo = p.floor; p.loVerified = false;
    } else {
      p.floorMissed = true; p.hi = step; p.hiFailed = true;
    }
    return;
  }
  if (i <= hi) { p.hi = step; p.hiFailed = true; }
}

export function nextProbe(p: PlacementState, c: Content, strand: Strand, visitSeq: number, isSchool: IsSchool): StepId | null {
  if (p.done || p.floorMissed) return null;
  if (p.pending) return p.pending.step;
  if (!p.lastProbe) return p.firstProbe;
  const L = searchList(c, strand, isSchool);
  const lo = L.indexOf(p.lo), hi = L.indexOf(p.hi);
  const top = p.hiFailed ? hi - 1 : hi;
  if (top < lo) return null;
  if (top === lo) return p.loVerified ? null : L[lo];
  let target = p.loVerified ? lo + Math.ceil((top - lo) / 2) : lo + Math.floor((top - lo) / 2);
  if (visitSeq <= 1) {
    const last = L.indexOf(p.lastProbe);
    const j = c.budget.placement.visit1MaxJump;
    target = Math.min(Math.max(target, last - j), last + j);
    target = Math.min(Math.max(target, p.loVerified ? lo + 1 : lo), top);
  }
  return L[target];
}

export function placementEnd(p: PlacementState, c: Content, strand: Strand, visitSeq: number, isSchool: IsSchool): StepId | null {
  if (p.done) return null;
  if (p.floorMissed) return p.lo;
  if (p.items >= c.budget.placement.maxItems) return p.lo;
  if (visitSeq > c.budget.placement.maxVisits) return p.lo;
  if (nextProbe(p, c, strand, visitSeq, isSchool) === null) return p.lo;
  return null;
}
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npx vitest run tests/learning/placement.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/placement.ts games/moon-meadow-home/tests/learning/placement.test.ts
git commit -m "Add the hidden placement probe"
```

### Task A15: Step status, the learner fold and pending facts

**Files:**
- Create: `G/src/core/learning/status.ts`
- Create: `G/src/core/learning/fold.ts`
- Create: `G/src/core/learning/index.ts`
- Test: `G/tests/learning/fold.test.ts`

**Interfaces:**
- Consumes: A2, A11 to A14.
- Produces:
  ```ts
  // status.ts
  export type StepStatus = 'passed' | 'placed' | 'display' | 'waiting' | 'side' | 'school' | 'current' | 'ahead';
  export type ReadingKnowledge = { gpcs: GpcId[]; items: ItemId[]; pairs: string[]; current: StepId | null; level: 1 | 2 | 3 };
  export type SpellingKnowledge = { own: GpcId[]; current: StepId | null; currentIndex: number; pairs: string[]; finalVoicedOk: boolean; capitals: boolean; level: 1 | 2 | 3 };
  export function profileOf(l: Learner, c: Content): Profile;
  export function isSchool(l: Learner, c: Content, step: StepId): boolean;
  export function isPlacing(l: Learner, strand: Strand): boolean;
  export function currentStep(l: Learner, c: Content, strand: Strand): StepId | null;
  export function openSchoolSteps(l: Learner, c: Content, strand: Strand): StepId[];
  export function sideSteps(l: Learner, c: Content, strand: Strand): StepId[];
  export function stepStatus(l: Learner, c: Content, step: StepId): StepStatus;
  export function knownSteps(l: Learner, c: Content, strand: Strand, served: StepId | null, assumeBelow: boolean): Record<StepId, true>;
  export function pairsAllowed(l: Learner, c: Content, strand: Strand): string[];
  export function readingKnowledge(l: Learner, c: Content): ReadingKnowledge;
  export function spellingKnowledge(l: Learner, c: Content): SpellingKnowledge;
  export function placementLists(l: Learner, c: Content, strand: Strand, current: StepId): { placed: StepId[]; side: StepId[] };
  export function setCurrentOverride(l: Learner, c: Content, strand: Strand, step: StepId): Payload<SetCurrentOverride>;
  export function pendingLearnFacts(l: Learner, c: Content): LearnFact[];
  // fold.ts
  export const LEARNER_FOLD_VERSION = 1;
  export function createLearner(c: Content, profile?: string): Learner;
  export function applyLearnEvent(l: Learner, e: EventBase, c: Content): void;
  export function foldLearner(events: readonly EventBase[], c: Content, profile?: string): Learner;
  export function createLearnerSlice(c: Content): { name: 'learner'; version: number; init(): Learner; apply(s: Learner, e: EventBase): Learner };
  ```
  `createLearnerSlice` adapts the fold to the core plan's slice engine: `init` is `createLearner(c)`, `apply` calls `applyLearnEvent` on `s` and returns `s`, `version` is `LEARNER_FOLD_VERSION`.
  `index.ts` re-exports everything public from `types.ts`, `ids.ts`, `time.ts`, `status.ts`, `fold.ts`, `errors.ts` (A16) and `report.ts` (A20), and later `jewels.ts` and `criteria.ts`.

**Status rules.**

- `profileOf`: `c.budget.profiles[l.profile]`, falling back to `c.budget.profiles[c.budget.defaultProfile]`.
- `isSchool(step)`: the parent override `l.school[step]` when set, otherwise `c.steps[step].school && profileOf(l, c).school.includes(step)`.
- `currentStep`: `null` while placing. Otherwise the first step of `c.loaded[strand]` that is not display, passed, placed, in `l.side[strand]`, or school. `null` means the ceiling.
- `openSchoolSteps`: `[]` while placing; otherwise loaded steps that are school and neither passed nor placed.
- `sideSteps`: `l.side[strand]` filtered to loaded steps that are not passed.
- `stepStatus` checks in this order: passed, placed, display, waiting (`!loaded`), side (in `l.side`, not passed), school, current, ahead. An unknown step id is `waiting`.
- `knownSteps(strand, served, assumeBelow)`: passed and placed steps, the current step, open school steps, `served`, and with `assumeBelow` every step of the strand whose index is at or below `served`.
- `pairsAllowed`: pair ids whose `unlock[strand]` step is passed.
- `readingKnowledge.gpcs` and `items`: GPCs and ids of reading grapheme items in passed, placed and current steps; `level` is the current step's scaffold level (3 at the ceiling).
- `spellingKnowledge.own`: GPCs of spelling grapheme items in passed, placed and current steps and open side and school steps; `finalVoicedOk` is S06 passed; `capitals` is S11 passed or current.
- `placementLists(current)`: the loaded steps of the strand below `current` that are not passed: contrast steps go to `side`; display and school steps are left out; the rest go to `placed`.
- `pendingLearnFacts`: for each strand still placing, `placementEnd(...)` with `l.visit.seq`; when it returns a step, a `placement.done` fact with `placementLists`. Then, for every step that has a state, is not passed and is `readyToPass` with its servable items (`carriers !== 0`) and `top`, a `step.passed` fact. Facts are returned in strand order r, s, m, then ladder order.

**Fold rules** (`applyLearnEvent`). `l.lastT = max(l.lastT, e.t)` for every event. Unknown event types are ignored.

- `visit.start`: `visit = { seq: seq + 1, startT: t, tz, counts all 0, ladder 0, spell 0, golden false, box0 {}, recent [] }`.
- `learn.result`:
  1. For each `{id, r}` in `items`: skip ids that are neither in `c.items` nor name items. `fluency` is the item's fluency type. Compute `fast` once per fluency type with `isFast(l.fluency[type], e.ms, b)` before any sample is added. `wasNew = !mem || (mem.seen === 0 && !mem.seeded && !mem.placedInit)`. `updateMemory(mem, r, e.t, l.visit.seq, fast, !!fluency, !e.probe)`. When `wasNew`, not a probe, and the strand is r, s or m: add the id to `newToday[strand]` for `localDay(e.t, l.visit.tz)` (a new day resets the list). Box 0 counter: if the new box is 0, set `visit.box0[id] = 0`, else delete it.
  2. For every other id in `visit.box0` with the same strand, add 1.
  3. For each fluency type with at least one `first` item in this result and `e.ms !== null`, `recordFirstTry` once.
  4. Visit counts: `counts[strand] += 1`; for r, s and m `ladder += 1`; for s `spell += 1`; push the carrier to `visit.recent` (keep `recentCarriers`); push `{t, r: result, err: error, slot}` to `l.recent[strand]` (keep 300).
  5. Step part, only when `c.steps[e.step]` exists with the same strand. A probe calls `recordProbe` on that strand's placement when it is not done, and stops. Slots `current`, `school` and `side`: `startT ??= t`, `moveScaffold`, and `pushWindow` when `e.scaffold === top`. Slot `golden`: `pushWindow` when `e.scaffold === top`, no scaffold move, `visit.golden = true`. Slots `review` and `mixed` on a passed or placed step: `recordReview`. Slot `warmup`: nothing.
- `step.passed`: if not passed yet, `passed = true`, `passedT = t`. Never undone.
- `placement.done`: ignored when that strand's placement is already done. Otherwise `done = true`, `current = e.current`, every step in `e.placed` gets `placed = true` and each of its items without memory gets `{ box: 2, lastT: t, lastVisit: visit.seq, seen: 0, firsts: 0, seeded: false, placedInit: true }`, and `l.side[strand]` becomes the union with `e.side`.
- `learn.override`:
  - `profile`: set `l.profile`; for each strand whose placement has `items === 0` and `current === null`, rebuild it with `initPlacement` from the new profile.
  - `set-current`: like `placement.done` (placement done, current set, items seeded), and also every step of that strand that is placed but not in `e.placed` gets `placed = false`; `l.side[strand] = e.side`.
  - `mark-placed` / `unmark-placed`: set `placed` on that step (marking also seeds its items as above).
  - `school`: `l.school[step] = on`.
- `import.v2`: ignored when `l.imported` has the hash; otherwise push it. For each seed in order whose item exists in `c.items`: when there is no memory, or the memory has `seen === 0` (placement or an earlier seed), set it to `{ box: seed.box, lastT: e.t, lastVisit: 0, seen: 0, firsts: 0, seeded: true, placedInit: false }`. A later seed for the same item wins. Unknown items are skipped. Seeds never touch `firsts`, windows or scaffolds.

`createLearner(c, profile = c.budget.defaultProfile)` builds empty records, `newToday` with `day: -1`, an `emptyFluency()` per type, and one `initPlacement` per strand. Step states are created on first use with `newStepState()`.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/fold.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { foldLearner, applyLearnEvent, createLearner, createLearnerSlice } from '../../src/core/learning/fold.ts';
import {
  currentStep, pendingLearnFacts, stepStatus, sideSteps, openSchoolSteps, setCurrentOverride, pairsAllowed, spellingKnowledge,
} from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, HOUR, DAY, resetSeq, visitStart, result, passed, placementDone, override, importV2 } from '../fixtures/events.ts';

const c = miniContent();
const PLACED_R21 = ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13'];
const fresh = (tz = 120): LearnEvent[] => [
  override(T0 - 1, { type: 'learn.override', op: 'profile', profile: 'fresh' }),
  visitStart(T0, tz),
];
function climbAndPass(evs: LearnEvent[], start: number): LearnEvent[] {
  const items = ['r:g:s', 'r:g:a', 'r:g:t', 'r:g:p'];
  let t = start;
  for (let i = 0; i < 6; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: i < 3 ? 1 : 2 }));
  for (let i = 0; i < 8; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 3 }));
  evs.push(visitStart(t = start + DAY));
  for (let i = 0; i < 7; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 3 }));
  return evs;
}

beforeEach(() => resetSeq());

describe('learner fold', () => {
  it('a first try moves a new item to box 1 and counts it for the visit and the day', () => {
    const l = foldLearner([...fresh(), result(T0 + 1000, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' })], c);
    expect(l.items['r:g:s']).toMatchObject({ box: 1, firsts: 1 });
    expect(l.visit.counts.r).toBe(1);
    expect(l.visit.ladder).toBe(1);
    expect(l.newToday.r.ids).toEqual(['r:g:s']);
  });

  it('a fresh player has no placement and starts at R01, S01 and M01', () => {
    const l = foldLearner(fresh(), c);
    expect(l.placement.r.done).toBe(true);
    expect([currentStep(l, c, 'r'), currentStep(l, c, 's'), currentStep(l, c, 'm')]).toEqual(['R01', 'S01', 'M01']);
    expect(openSchoolSteps(l, c, 'r')).toEqual([]);
  });

  it('climbs the scaffold and reports R01 ready after 12 of 15 at the top over two days', () => {
    const evs = climbAndPass(fresh(), T0);
    const l = foldLearner(evs, c);
    expect(l.steps.R01.level).toBe(3);
    expect(pendingLearnFacts(l, c)).toContainEqual({ type: 'step.passed', strand: 'r', step: 'R01' });
    const l2 = foldLearner([...evs, passed(T0 + DAY + HOUR, 'r', 'R01')], c);
    expect(stepStatus(l2, c, 'R01')).toBe('passed');
    expect(currentStep(l2, c, 'r')).toBe('R02');
    expect(pendingLearnFacts(l2, c).some(f => f.type === 'step.passed')).toBe(false);
  });

  it('an item with no carrier in this build does not block the pass', () => {
    expect(c.items['r:g:s'].carriers).toBe(0);
    const evs = fresh();
    let t = T0;
    const items = ['r:g:a', 'r:g:t', 'r:g:p'];
    for (let i = 0; i < 6; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 3]], r: 'first', scaffold: 1 }));
    for (let i = 0; i < 8; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 3]], r: 'first', scaffold: 3 }));
    evs.push(visitStart(t = T0 + DAY));
    for (let i = 0; i < 7; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 3]], r: 'first', scaffold: 3 }));
    expect(pendingLearnFacts(foldLearner(evs, c), c)).toContainEqual({ type: 'step.passed', strand: 'r', step: 'R01' });
  });

  it('is not ready when every top-level result is on one day', () => {
    const evs = fresh();
    let t = T0;
    const items = ['r:g:s', 'r:g:a', 'r:g:t', 'r:g:p'];
    for (let i = 0; i < 6; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 1 }));
    for (let i = 0; i < 15; i++) evs.push(result(t += 60_000, { strand: 'r', step: 'R01', items: [items[i % 4]], r: 'first', scaffold: 3 }));
    expect(pendingLearnFacts(foldLearner(evs, c), c)).toEqual([]);
  });

  it('step.passed is never revoked and duplicates are harmless', () => {
    const evs = [...fresh(), passed(T0 + 1, 'r', 'R01'), passed(T0 + 2, 'r', 'R01')];
    for (let i = 0; i < 10; i++) evs.push(result(T0 + 10 + i, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'miss', slot: 'review', scaffold: 3 }));
    const l = foldLearner(evs, c);
    expect(stepStatus(l, c, 'R01')).toBe('passed');
    expect(l.steps.R01.passedT).toBe(T0 + 1);
    expect(l.steps.R01.reopened).toBe(true);
  });

  it('probe results set boxes, never count toward a pass, and end placement at R21', () => {
    const l = foldLearner([
      visitStart(T0),
      result(T0 + 1000, { strand: 'r', step: 'R21', items: ['r:cl:-st'], r: 'first', probe: true, scaffold: 3 }),
      result(T0 + 2000, { strand: 'r', step: 'R21', items: ['r:cl:-nd'], r: 'first', probe: true, scaffold: 3 }),
    ], c);
    expect(l.items['r:cl:-st']).toMatchObject({ box: 1, firsts: 0 });
    expect(l.steps.R21?.window ?? []).toEqual([]);
    expect(l.newToday.r.ids).toEqual([]);
    expect(pendingLearnFacts(l, c)).toContainEqual({ type: 'placement.done', strand: 'r', current: 'R21', placed: PLACED_R21, side: ['R04D'] });
  });

  it('placement.done places lower steps in box 2, makes contrast steps side steps and opens the school step', () => {
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', PLACED_R21, ['R04D']),
      placementDone(T0 + 2, 'r', 'R13', ['R01'], []),
    ], c);
    expect(stepStatus(l, c, 'R13')).toBe('placed');
    expect(l.items['r:g:ai']).toMatchObject({ box: 2, placedInit: true, seen: 0 });
    expect(sideSteps(l, c, 'r')).toEqual(['R04D']);
    expect(currentStep(l, c, 'r')).toBe('R21');
    expect(openSchoolSteps(l, c, 'r')).toEqual(['R19']);
    expect(stepStatus(l, c, 'R19')).toBe('school');
    expect(stepStatus(l, c, 'R30')).toBe('waiting');
    expect(stepStatus(l, c, 'R06')).toBe('display');
  });

  it('v2 seeds start missed items in box 0 and first tries in box 1, and win over the placement seed', () => {
    const l = foldLearner([
      visitStart(T0),
      importV2(T0 + 1, 'h1', [
        { strand: 'r', item: 'r:g:p', box: 0 }, { strand: 'r', item: 'r:g:a', box: 0 }, { strand: 'r', item: 'r:g:n', box: 0 },
        { strand: 'r', item: 'r:g:d', box: 1 }, { strand: 'r', item: 'r:g:o', box: 1 }, { strand: 'r', item: 'r:g:g', box: 1 },
        { strand: 's', item: 's:g:m', box: 1 },
        { strand: 'r', item: 'r:g:zz9', box: 1 },
      ]),
      placementDone(T0 + 2, 'r', 'R21', PLACED_R21, ['R04D']),
    ], c);
    expect(l.items['r:g:p']).toMatchObject({ box: 0, seeded: true, firsts: 0 });
    expect(l.items['r:g:d']).toMatchObject({ box: 1, seeded: true });
    expect(l.items['r:g:t'].box).toBe(2);
    expect(l.items['s:g:m']).toMatchObject({ box: 1, seeded: true });
    expect(l.items['r:g:zz9']).toBeUndefined();
  });

  it('the same v2 import twice adds nothing, and a later import still seeds placed items', () => {
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', PLACED_R21, ['R04D']),
      importV2(T0 + 2, 'h1', [{ strand: 'r', item: 'r:g:p', box: 0 }]),
      importV2(T0 + 3, 'h1', [{ strand: 'r', item: 'r:g:p', box: 1 }]),
    ], c);
    expect(l.items['r:g:p']).toMatchObject({ box: 0, seeded: true });
    expect(l.imported).toEqual(['h1']);
  });

  it('set-current replaces the placement and unplaces steps it no longer lists', () => {
    const evs = fresh();
    const o1 = setCurrentOverride(foldLearner(evs, c), c, 'r', 'R13');
    expect(o1).toEqual({ type: 'learn.override', op: 'set-current', strand: 'r', step: 'R13', placed: ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10'], side: ['R04D'] });
    evs.push(override(T0 + 1, o1));
    expect(currentStep(foldLearner(evs, c), c, 'r')).toBe('R13');
    evs.push(override(T0 + 2, setCurrentOverride(foldLearner(evs, c), c, 'r', 'R05')));
    const l = foldLearner(evs, c);
    expect(currentStep(l, c, 'r')).toBe('R05');
    expect(stepStatus(l, c, 'R08')).toBe('ahead');
  });

  it('turning the school flag off makes R19 a normal step', () => {
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', PLACED_R21, ['R04D']),
      override(T0 + 2, { type: 'learn.override', op: 'school', strand: 'r', step: 'R19', on: false }),
    ], c);
    expect(openSchoolSteps(l, c, 'r')).toEqual([]);
    expect(currentStep(l, c, 'r')).toBe('R19');
  });

  it('a new visit resets the visit counts and the box 0 counters', () => {
    const evs = [...fresh(),
      result(T0 + 1000, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'miss' }),
      result(T0 + 2000, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'first' })];
    expect(foldLearner(evs, c).visit.box0['r:g:s']).toBe(1);
    const l = foldLearner([...evs, visitStart(T0 + HOUR)], c);
    expect(l.visit.seq).toBe(2);
    expect(l.visit.counts.r).toBe(0);
    expect(l.visit.box0).toEqual({});
  });

  it('applying events one by one equals a full fold, and the learner survives a JSON round trip', () => {
    const evs = climbAndPass(fresh(), T0);
    const inc = createLearner(c);
    for (const e of evs) applyLearnEvent(inc, e, c);
    const full = foldLearner(evs, c);
    expect(inc).toEqual(full);
    expect(JSON.parse(JSON.stringify(full))).toEqual(full);
    const slice = createLearnerSlice(c);
    expect(evs.reduce((s, e) => slice.apply(s, e), slice.init())).toEqual(full);
  });

  it('a golden result counts toward the window but never moves the scaffold', () => {
    const evs = fresh();
    for (let i = 0; i < 3; i++) evs.push(result(T0 + i + 1, { strand: 'm', step: 'M01', items: [`m:sub:${i + 1}`], r: 'first', slot: 'golden', scaffold: 1, moment: 'egg-moon' }));
    const l = foldLearner(evs, c);
    expect(l.steps.M01.level).toBe(1);
    expect(l.steps.M01.up).toBe(0);
    expect(l.steps.M01.window).toHaveLength(3);
    expect(l.visit.golden).toBe(true);
  });

  it('name reviews update the name item and the visit total, not the ladders', () => {
    const l = foldLearner([...fresh(), result(T0 + 1, { strand: 'name', step: null, items: ['name:ben'], r: 'first', slot: 'name', moment: 'roll-call' })], c);
    expect(l.items['name:ben'].box).toBe(1);
    expect(l.visit.counts.name).toBe(1);
    expect(l.visit.ladder).toBe(0);
  });

  it('unknown items and steps are skipped without throwing', () => {
    const l = foldLearner([...fresh(), result(T0 + 1, { strand: 'r', step: 'R99', items: ['r:g:zz9', 'r:g:s'], r: 'first' })], c);
    expect(l.items['r:g:zz9']).toBeUndefined();
    expect(l.items['r:g:s'].box).toBe(1);
  });

  it('a result with an earlier clock time never moves lastT backwards', () => {
    const l = foldLearner([...fresh(),
      result(T0 + HOUR, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' }),
      result(T0, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' })], c);
    expect(l.items['r:g:s']).toMatchObject({ lastT: T0 + HOUR, box: 2 });
  });

  it('new items per day follow the local day of the visit time zone', () => {
    const late = () => [
      result(T0 + 6.5 * HOUR, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' }),   // 23:30 in Cyprus
      result(T0 + 7.5 * HOUR, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'first' }),   // 00:30 in Cyprus
    ];
    expect(foldLearner([...fresh(120), ...late()], c).newToday.r.ids).toEqual(['r:g:a']);
    resetSeq();
    expect(foldLearner([...fresh(0), ...late()], c).newToday.r.ids).toEqual(['r:g:s', 'r:g:a']);
  });

  it('pairs unlock as distractors only when their contrast step is passed', () => {
    expect(pairsAllowed(foldLearner(fresh(), c), c, 'r')).toEqual([]);
    const l = foldLearner([...fresh(), passed(T0 + 1, 'r', 'R04D')], c);
    expect(pairsAllowed(l, c, 'r')).toEqual(['a-e-u']);
    expect(pairsAllowed(l, c, 's')).toEqual([]);
  });

  it('spelling knowledge lists her own GPCs', () => {
    const k = spellingKnowledge(foldLearner([...fresh(), passed(T0 + 1, 's', 'S01')], c), c);
    expect(k.current).toBe('S02');
    expect(k.own).toEqual(expect.arrayContaining(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']));
    expect(k.own).not.toContain('g');
    expect(k.finalVoicedOk).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/learning/fold.test.ts`
Expected: FAIL, cannot resolve `fold.ts`.

- [ ] **Step 3: Implement `status.ts`, `fold.ts` and `index.ts`** by the rules above. Keep `applyLearnEvent` a `switch` on `e.type` that casts to the matching event type and calls one small function per type (`onVisitStart`, `onResult`, `onPassed`, `onPlacementDone`, `onOverride`, `onImport`).

- [ ] **Step 4: Run all learning tests**

Run: `npx vitest run tests/learning`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/status.ts games/moon-meadow-home/src/core/learning/fold.ts games/moon-meadow-home/src/core/learning/index.ts games/moon-meadow-home/tests/learning/fold.test.ts
git commit -m "Fold learning events into learner state with placement, passes and v2 seeds"
```

### Task A16: Error tagging

**Files:**
- Create: `G/src/core/learning/errors.ts`
- Test: `G/tests/learning/errors.test.ts`

**Interfaces:**
- Consumes: `Content` (A2).
- Produces:
  ```ts
  export type ErrorInput =
    | { strand: 'r'; target: string; chosen: string }                                       // word ids
    | { strand: 's'; target: GpcId; chosen: GpcId; position: 'initial' | 'middle' | 'final' }
    | { strand: 'm'; target: number; chosen: number };
  export function tagError(c: Content, x: ErrorInput): ErrorTag | null;
  ```
- Rules (spec 3.8): `null` when chosen equals target. Reading: `dutch` when a twin of a non-`magic-e` pair joins the two words, or when the words have the same number of GPCs, differ in exactly one position, and both GPCs there are in one non-`magic-e` pair whose position matches (`any`, or `initial` at index 0, or `final` at the last index); otherwise `vowel` when both differing GPCs are vowels; otherwise `other`. Spelling: `dutch` when both GPCs are in one non-`magic-e` pair with a matching position, `vowel` when both are vowels, otherwise `other`. Maths: `reversal` when both are two-digit numbers with swapped digits, `off-by-one` when they differ by 1, otherwise `other`. Scenes call this when a checked moment ends in a miss and put the tag in `outcome.error`.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/errors.test.ts
import { describe, it, expect } from 'vitest';
import { tagError } from '../../src/core/learning/errors.ts';
import { miniContent } from '../fixtures/mini.ts';

const c = miniContent();

describe('tagError', () => {
  it('returns null for the right answer', () => {
    expect(tagError(c, { strand: 'r', target: 'pan', chosen: 'pan' })).toBeNull();
    expect(tagError(c, { strand: 'm', target: 5, chosen: 5 })).toBeNull();
  });
  it('tags twin words and one-vowel swaps inside a pair as dutch', () => {
    expect(tagError(c, { strand: 'r', target: 'pan', chosen: 'pen' })).toBe('dutch');
    expect(tagError(c, { strand: 'r', target: 'cot', chosen: 'cut' })).toBe('other');
    expect(tagError(c, { strand: 'r', target: 'hat', chosen: 'hut' })).toBe('dutch');
  });
  it('tags other vowel swaps as vowel and anything else as other', () => {
    expect(tagError(c, { strand: 'r', target: 'pin', chosen: 'pan' })).toBe('vowel');
    expect(tagError(c, { strand: 'r', target: 'cap', chosen: 'map' })).toBe('other');
    expect(tagError(c, { strand: 'r', target: 'hat', chosen: 'fox' })).toBe('other');
  });
  it('tags spelling slots', () => {
    expect(tagError(c, { strand: 's', target: 'e', chosen: 'a', position: 'middle' })).toBe('dutch');
    expect(tagError(c, { strand: 's', target: 'i', chosen: 'a', position: 'middle' })).toBe('vowel');
    expect(tagError(c, { strand: 's', target: 'd', chosen: 't', position: 'final' })).toBe('other');
  });
  it('tags maths answers', () => {
    expect(tagError(c, { strand: 'm', target: 24, chosen: 42 })).toBe('reversal');
    expect(tagError(c, { strand: 'm', target: 7, chosen: 8 })).toBe('off-by-one');
    expect(tagError(c, { strand: 'm', target: 3, chosen: 9 })).toBe('other');
  });
});
```

`cot` and `cut` (`cut` is not in the mini words) fall back to `other` because the chosen word is unknown.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/learning/errors.test.ts`
Expected: FAIL, cannot resolve `errors.ts`.

- [ ] **Step 3: Implement** by the rules above.

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/learning/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/errors.ts games/moon-meadow-home/tests/learning/errors.test.ts
git commit -m "Tag mistakes as Dutch pairs, vowels, reversals or off by one"
```

### Task A17: The planner: carriers and `nextItem`

**Files:**
- Create: `G/src/core/planner/types.ts`
- Create: `G/src/core/planner/rng.ts`
- Create: `G/src/core/planner/carriers.ts`
- Create: `G/src/core/planner/select.ts`
- Test: `G/tests/planner/setup.ts` (shared helper), `G/tests/planner/carriers.test.ts`, `G/tests/planner/select.test.ts`

**Interfaces:**
- Consumes: A1, A2, A11 to A15.
- Produces:
  ```ts
  // types.ts
  export type Rng = () => number;
  export type AssetIndex = { clip(id: string): boolean; picture(id: string): boolean };
  export type PlanContext = { c: Content; l: Learner; now: number; assets: AssetIndex };
  export type ItemRequest = {
    strand: Strand;
    moments: MomentKind[];             // what this place can host
    place: string;                     // for the log
    firstWish?: boolean;               // the newborn's first wish
    tags?: string[];                   // word tags the place needs, for example ['bath']
    doors?: { built: number; own: number | null };
    avoid?: string[];                  // carrier keys not to repeat
    accept?: (p: Pick) => boolean;     // the place can veto a candidate pick (for example a door that is hidden)
  };
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
  };
  export type CarrierChoice = { carrier: Carrier; items: ItemId[]; pair?: string };
  // rng.ts
  export function mulberry32(seed: number): Rng;
  export function shuffle<T>(xs: readonly T[], rng: Rng): T[];
  // carriers.ts
  export function carrierKey(c: Carrier): string;
  export function carrierFor(ctx: PlanContext, step: StepId, item: ItemId, moment: MomentKind, scaffold: 1 | 2 | 3, rng: Rng, req: ItemRequest, assumeBelow?: boolean): CarrierChoice | null;
  // select.ts
  export function nextItem(ctx: PlanContext, req: ItemRequest, rng: Rng): Pick | null;
  ```

**Carrier rules** (`carrierFor`). A word is usable when `kind === 'thing'`, its picture and clip pass the moment's `needs` through `assets`, and (for reading) `rStep !== null` and every step of its `rItems` is in `knownSteps(l, c, 'r', step, assumeBelow)`. When `req.tags` is set, the word must share a tag. `bath-wish` always needs the tag `bath`. Among usable candidates, those whose key is in `l.visit.recent` or `req.avoid` go last; pick with `rng` among the rest.

| Moment | Item kinds | Carrier and logged items |
|---|---|---|
| `wish`, `bath-wish` | grapheme, cluster, pattern | `word` from `wordsByItem[item]`; items are the word's `rItems` whose step is `step` |
| `one-or-many` | ending | `none`: a usable word with a plural, `plural` form `one`, count 1, stem clip needed. `s` or `es`: a word whose plural has that ending, form `many`, count `3 + floor(rng() * 3)`, plural clip needed. Items `[item]` |
| `twin-wish` | pair | a twin of that pair with both words usable; `twin` with the words in random order; items `[item]`; `pair` set |
| `label` | grapheme, cluster, pattern, suffix, prefix, pair | `word` from `wordsByItem[item]` (spelling) with picture and clip; no readability rule (other slots are gift gems). A pair item takes words that contain one of the pair's GPCs at the pair's position, and sets `pair`. Prefer the word with the fewest spelling items outside `spellingKnowledge().own`. Items `[item]` |
| `label-plural` | ending | a word whose plural has that ending, plural clip and picture needed. Scaffold 3: `count = rng() < 0.25 ? 1 : 2 + floor(rng() * 4)` and form `one` when the count is 1; scaffold 1 and 2: count 3, form `many`. Items `[item]` |
| `naming-bells`, `naming-garden`, `sign` | grapheme, cluster, capital (naming); also suffix, prefix, compound (sign) | `spell` with `focus`: `[gpc]` for a grapheme, `splitUsual` of the cluster letters, `[]` for a capital, `splitUsual` of the affix. Items `[item]` |
| `first-sound` | first-sound | `first-sound` with the GPC. Items `[item]` |
| egg moments, `post-sash`, `parcel`, `trim`, `beads`, `post-pin` | maths | `maths` with the item's task. Items `[item]` |
| `door-visit`, `roll-call-door` | numeral | `door` with `n`, only when `req.doors` is set, `n <= doors.built`, `n !== doors.own`, and `n` is inside `visitRange` (Task A18). Items `[item]` |
| phrase moments (`note`, `tricky-act`, `basket-and`, `basket-adj`, `salon-card` for non-word items, `asking-bubble`, `two-state-wish`) | any | a loaded phrase from `phrasesByItem[item]` whose `moment` matches, whose words all have pictures, whose act picture ids (`target`, `options`, `thing`, with any `@big` or `@tiny` suffix removed) all pass `assets.picture`, and whose clip exists when the moment needs a clip. Items are the phrase's items that belong to `step` or to a passed or placed step |

Anything else returns `null`.

`carrierKey`: `word` → the word; `plural` → `<word>:<form>`; `twin` → `<a>|<b>`; `spell` → `spell:<focus joined by +>`; `first-sound` → `fs:<gpc>`; `maths` → `m:<op>:<the task's other field values in declaration order, joined by ,>`; `door` → `door:<n>`; `phrase` → the phrase id; `letters` → the letters joined; `name` → the baby id.

**Selection rules** (`nextItem`), from spec 3.5 and 3.6:

1. Keep only `req.moments` that are loaded and of `req.strand`. None left: `null`.
2. Placing strand: take `nextProbe`. Serve it with slot `probe`, scaffold = top, `probe: true`, `assumeBelow`. If no moment can serve it, walk the search list downward from the probe and serve the first step that a moment can serve with slot `warmup`, scaffold = top, `probe: false`, `assumeBelow`. Otherwise `null`. The new-item cap does not apply while placing.
3. Otherwise: `tired = visit total >= visitCap`; `eggOnly` = every moment is an egg; `capped = counts[strand] >= strandVisitCap`; `minBox = tired && eggOnly ? tiredEggMinBox : capped ? 1 : 0`; `reviewOnly = tired && (eggOnly || firstWish)`.
4. Slot order: review-only gives `review, mixed`. Otherwise draw one number: below `share.current` → `current, review, mixed`; below `current + review` → `review, current, mixed`; else `mixed, current, review`. Try each slot until one returns a pick.
5. `current`: first the open school steps the moments can serve (slot `school`), then the current step (slot `current`). Scaffold is the step's level. Item order: items with box at least `minBox`; new items (no memory, or `seen 0` and not seeded or placed) only while today's `newToday` list is shorter than `newPerStrandPerDay` or already holds them; box 0 items that are due first; then least recently seen (`lastT`, missing first), then ladder order. For a step whose items include `r:end:none`: with probability `oneShare` move it to the front, otherwise to the back.
6. `review`: items of this strand whose step is passed or placed (not current, not school, not side), with box at least `minBox` and `isDue`, sorted by `dueAt`. Items of reopened steps (box at least `minBox`) are also candidates: when there are any, they go first with probability `reopenWeight / (reopenWeight + 1)`, otherwise after the due items. Slot `review`, scaffold = top. Try at most 40 candidates.
7. `mixed`: steps that are passed or placed, plus open side steps, that a moment can serve, in random order. For each, items in random order with box at least `minBox` (side steps also obey the new-item cap). Slot `side` for side steps (scaffold = its level), otherwise `mixed` (scaffold = top).
8. For every candidate item, try the step's servable moments in random order with `carrierFor`. The first carrier whose pick `req.accept` does not reject wins. The pick's `items` and `pair` come from the carrier choice.

- [ ] **Step 1: Write the shared test setup**

```ts
// G/tests/planner/setup.ts
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import type { StepId, Strand } from '../../src/core/content/types.ts';
import type { AssetIndex, PlanContext } from '../../src/core/planner/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

export const allAssets: AssetIndex = { clip: () => true, picture: () => true };
export const VISIT2 = T0 + 3 * DAY;

/** A learner placed at the given steps, now in a second visit three days later. */
export function setup(steps: Partial<Record<Strand, StepId>>, opts: { school?: boolean } = {}) {
  resetSeq();
  const c = miniContent();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (const [strand, step] of Object.entries(steps) as [Strand, StepId][]) {
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, strand, step)));
  }
  if (opts.school === false) {
    evs.push(override(T0 + 2, { type: 'learn.override', op: 'school', strand: 'r', step: 'R19', on: false }));
    evs.push(override(T0 + 2, { type: 'learn.override', op: 'school', strand: 's', step: 'S10', on: false }));
  }
  evs.push(visitStart(VISIT2));
  const now = VISIT2 + 60_000;
  const ctx = (extra: LearnEvent[] = [], assets: AssetIndex = allAssets): PlanContext =>
    ({ c, l: foldLearner([...evs, ...extra], c), now, assets });
  return { c, evs, now, ctx };
}
```

- [ ] **Step 2: Write the failing carrier test**

```ts
// G/tests/planner/carriers.test.ts
import { describe, it, expect } from 'vitest';
import { carrierFor, carrierKey } from '../../src/core/planner/carriers.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import type { ItemRequest } from '../../src/core/planner/types.ts';
import { setup } from './setup.ts';

const R: ItemRequest = { strand: 'r', moments: ['wish', 'twin-wish', 'one-or-many'], place: 'meadow' };
const S: ItemRequest = { strand: 's', moments: ['label', 'label-plural', 'naming-bells'], place: 'shelf' };

describe('carrierFor', () => {
  const { ctx } = setup({ r: 'R21', s: 'S12', m: 'M10' });
  const x = ctx();

  it('a wish uses a pictured word she can read and logs the served step items', () => {
    const ch = carrierFor(x, 'R21', 'r:cl:-st', 'wish', 1, mulberry32(1), R)!;
    expect(ch.carrier).toEqual({ kind: 'word', word: 'nest' });
    expect(ch.items).toEqual(['r:cl:-st']);
  });

  it('one-or-many shows one thing for no ending and a heap for an ending', () => {
    const one = carrierFor(x, 'R19', 'r:end:none', 'one-or-many', 1, mulberry32(3), R)!;
    expect(one.carrier).toMatchObject({ kind: 'plural', form: 'one', count: 1 });
    expect(one.items).toEqual(['r:end:none']);
    const many = carrierFor(x, 'R19', 'r:end:es', 'one-or-many', 1, mulberry32(3), R)!;
    expect(many.carrier).toMatchObject({ kind: 'plural', form: 'many' });
    expect(['fox', 'box', 'dish']).toContain((many.carrier as { word: string }).word);
    expect((many.carrier as { count: number }).count).toBeGreaterThanOrEqual(3);
  });

  it('one-or-many only uses stems she can read', () => {
    const y = setup({ r: 'R01', s: 'S02', m: 'M01' }).ctx();
    expect(carrierFor(y, 'R19', 'r:end:s', 'one-or-many', 1, mulberry32(1), R)).toBeNull();
  });

  it('a twin wish serves both words of the pair', () => {
    const ch = carrierFor(x, 'R04D', 'r:pair:a-e-u', 'twin-wish', 3, mulberry32(4), R)!;
    expect(ch.carrier.kind).toBe('twin');
    expect(ch.pair).toBe('a-e-u');
    expect(['pan|pen', 'pen|pan', 'hat|hut', 'hut|hat', 'cap|cup', 'cup|cap', 'net|nut', 'nut|net']).toContain(carrierKey(ch.carrier));
  });

  it('a label uses a pictured word with the item', () => {
    const ch = carrierFor(x, 'S04', 's:g:h', 'label', 1, mulberry32(5), S)!;
    expect(['hat', 'hut', 'hand']).toContain((ch.carrier as { word: string }).word);
    expect(ch.items).toEqual(['s:g:h']);
  });

  it('a plural label at level 3 holds one thing in about one jar in four', () => {
    const rng = mulberry32(6);
    let ones = 0;
    for (let i = 0; i < 400; i++) {
      const ch = carrierFor(x, 'S10', 's:end:s', 'label-plural', 3, rng, S)!;
      const p = ch.carrier as { form: string; count: number };
      if (p.count === 1) { ones++; expect(p.form).toBe('one'); }
      else expect(p.count).toBeGreaterThanOrEqual(2);
    }
    expect(ones / 400).toBeGreaterThan(0.15);
    expect(ones / 400).toBeLessThan(0.35);
  });

  it('naming moments hand naming the focus GPCs', () => {
    expect(carrierFor(x, 'S04', 's:g:h', 'naming-bells', 1, mulberry32(7), S)!.carrier).toEqual({ kind: 'spell', focus: ['h'] });
    expect(carrierFor(x, 'S12', 's:cl:-st', 'naming-bells', 1, mulberry32(7), S)!.carrier).toEqual({ kind: 'spell', focus: ['s', 't'] });
  });

  it('carrier keys are stable', () => {
    expect(carrierKey({ kind: 'maths', task: { op: 'missing', whole: 10, part: 7 } })).toBe('m:missing:10,7');
    expect(carrierKey({ kind: 'plural', word: 'fox', form: 'many', count: 3 })).toBe('fox:many');
    expect(carrierKey({ kind: 'door', n: 12 })).toBe('door:12');
  });
});
```

- [ ] **Step 3: Write the failing selection test**

```ts
// G/tests/planner/select.test.ts
import { describe, it, expect } from 'vitest';
import { nextItem } from '../../src/core/planner/select.ts';
import { carrierKey } from '../../src/core/planner/carriers.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import type { PlanContext, ItemRequest } from '../../src/core/planner/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, resetSeq, visitStart, result } from '../fixtures/events.ts';
import { setup, allAssets, VISIT2 } from './setup.ts';

const WISH: ItemRequest = { strand: 'r', moments: ['wish', 'twin-wish', 'one-or-many'], place: 'meadow' };
const EGG: ItemRequest = { strand: 'm', moments: ['egg-moon', 'egg-small-nest', 'egg-two-stone'], place: 'nest' };

describe('nextItem', () => {
  it('mixes about 50 percent current, 30 percent review and 20 percent mixed over 1,000 picks', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx();
    const rng = mulberry32(1);
    const n = { current: 0, review: 0, mixed: 0 };
    for (let i = 0; i < 1000; i++) {
      const p = nextItem(x, WISH, rng)!;
      n[(p.slot === 'side' ? 'mixed' : p.slot) as keyof typeof n]++;
    }
    expect(n.current / 1000).toBeGreaterThan(0.45);
    expect(n.current / 1000).toBeLessThan(0.55);
    expect(n.review / 1000).toBeGreaterThan(0.25);
    expect(n.review / 1000).toBeLessThan(0.35);
    expect(n.mixed / 1000).toBeGreaterThan(0.15);
    expect(n.mixed / 1000).toBeLessThan(0.25);
  });

  it('serves the current step least recently seen first and caps new items at 3 a day', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx([
      result(VISIT2 + 100, { strand: 'r', step: 'R05', items: ['r:g:h'], r: 'first' }),
      result(VISIT2 + 200, { strand: 'r', step: 'R05', items: ['r:g:b'], r: 'first' }),
      result(VISIT2 + 300, { strand: 'r', step: 'R05', items: ['r:g:f'], r: 'first' }),
    ]);
    const p = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, () => 0)!;
    expect(p.slot).toBe('current');
    expect(p.items).toEqual(['r:g:h']);
    const rng = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      const q = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, rng)!;
      if (q.slot === 'current') expect(q.items).not.toContain('r:g:l');
    }
  });

  it('an open school step takes the current share where the place can serve it', () => {
    const x = setup({ r: 'R21', s: 'S12', m: 'M10' }).ctx();
    expect(nextItem(x, { strand: 'r', moments: ['wish', 'one-or-many'], place: 'meadow' }, () => 0))
      .toMatchObject({ step: 'R19', slot: 'school', moment: 'one-or-many', scaffold: 1, items: ['r:end:none'] });
    expect(nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, () => 0))
      .toMatchObject({ step: 'R21', slot: 'current' });
  });

  it('after 15 checked moments in a strand only items in box 1 or higher are served', () => {
    const extra = Array.from({ length: 15 }, (_, i) =>
      result(VISIT2 + 100 + i, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first', slot: 'review', scaffold: 3 }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx(extra);
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish', 'twin-wish'], place: 'meadow' }, rng);
      if (p) for (const id of p.items) expect(x.l.items[id]?.box ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it('after 30 checked moments eggs serve box 3 or higher only and first wishes serve review only', () => {
    const extra = Array.from({ length: 30 }, (_, i) => i % 2
      ? result(VISIT2 + 100 + i, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first', slot: 'review', scaffold: 3 })
      : result(VISIT2 + 100 + i, { strand: 'm', step: 'M01', items: ['m:sub:1'], r: 'miss', slot: 'review', scaffold: 1, moment: 'egg-moon' }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx(extra);
    expect(nextItem(x, EGG, mulberry32(4))).toBeNull();
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow', firstWish: true }, rng);
      if (p) expect(['review', 'mixed']).toContain(p.slot);
    }
  });

  it('never serves a word whose picture is missing', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx([], { clip: () => true, picture: id => id !== 'w-hat' });
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish', 'twin-wish'], place: 'meadow' }, rng);
      if (p) expect(carrierKey(p.carrier).split(/[|:]/)).not.toContain('hat');
    }
  });

  it('returns null when nothing is servable', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }).ctx([], { clip: () => false, picture: () => false });
    expect(nextItem(x, WISH, mulberry32(7))).toBeNull();
    expect(nextItem(x, { strand: 'r', moments: ['salon-card'], place: 'salon' }, mulberry32(7))).toBeNull();
  });

  it('during placement serves the probe step at the top scaffold, or a warm-up below it', () => {
    resetSeq();
    const c = miniContent();
    const x: PlanContext = { c, l: foldLearner([visitStart(T0)], c), now: T0 + 1000, assets: allAssets };
    expect(nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, mulberry32(1)))
      .toMatchObject({ step: 'R21', slot: 'probe', probe: true, scaffold: 3 });
    expect(nextItem(x, { strand: 'r', moments: ['twin-wish'], place: 'meadow' }, mulberry32(1))).toBeNull();
    expect(nextItem(x, EGG, mulberry32(1))).toMatchObject({ step: 'M10', probe: true });
    expect(nextItem(x, { strand: 'm', moments: ['egg-moon'], place: 'nest' }, mulberry32(1)))
      .toMatchObject({ step: 'M09', slot: 'warmup', probe: false });
  });

  it('door visits stay inside the built doors and never pick her own door', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M07' }, { school: false }).ctx();
    const rng = mulberry32(8);
    for (let i = 0; i < 100; i++) {
      const p = nextItem(x, { strand: 'm', moments: ['door-visit'], place: 'stalls', doors: { built: 12, own: 12 } }, rng)!;
      expect(p.carrier.kind).toBe('door');
      const n = (p.carrier as { n: number }).n;
      expect(n).toBeLessThanOrEqual(12);
      expect(n).not.toBe(12);
    }
  });

  it('the egg serves a passed egg step when the current maths step has no egg kind', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M07' }, { school: false }).ctx();
    const rng = mulberry32(9);
    for (let i = 0; i < 50; i++) {
      const p = nextItem(x, EGG, rng)!;
      expect(['M01', 'M02', 'M05']).toContain(p.step);
      expect(['review', 'mixed']).toContain(p.slot);
    }
  });
});
```

- [ ] **Step 4: Run them and see them fail**

Run: `npx vitest run tests/planner`
Expected: FAIL, cannot resolve the planner modules.

- [ ] **Step 5: Implement `types.ts`, `rng.ts`, `carriers.ts` and `select.ts`** by the rules above. `mulberry32` is the v2 function:

```ts
// G/src/core/planner/rng.ts
import type { Rng } from './types.ts';
export function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

`carriers.ts` imports `visitRange` from `visit.ts` (Task A18). Write a minimal `visit.ts` with only `visitRange` in this task if A18 is not merged yet; A18 then adds the rest of that file.

- [ ] **Step 6: Run them and see them pass**

Run: `npx vitest run tests/planner`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/planner games/moon-meadow-home/tests/planner
git commit -m "Add the session planner: carriers, the 50/30/20 mix, caps, school share and placement probes"
```

### Task A18: Visit signals, eggs and name reviews

**Files:**
- Create or complete: `G/src/core/planner/visit.ts`
- Create: `G/src/core/planner/eggs.ts`
- Create: `G/src/core/planner/names.ts`
- Test: `G/tests/planner/visit.test.ts`, `G/tests/planner/eggs-names.test.ts`

**Interfaces:**
- Consumes: A15 status, A17 `nextItem`.
- Produces:
  ```ts
  // visit.ts
  export type VisitStats = { r: number; s: number; m: number; name: number; ladder: number; spell: number; total: number };
  export function visitStats(l: Learner): VisitStats;
  export function isTired(l: Learner, c: Content): boolean;                 // total >= visitCap
  export function spellingShareLow(l: Learner, c: Content): boolean;        // ladder >= spellShareAfter and spell / ladder < spellShareMin
  export function wantsLabelBubble(l: Learner, c: Content): boolean;        // spellingShareLow or an open spelling school step
  export function leastPractisedStrand(l: Learner): Strand;                 // fewest moments this visit, ties in the order s, r, m
  export function visitRange(l: Learner, c: Content): [number, number] | null;
  export function shouldVisitDoor(l: Learner, c: Content, herdCount: number): boolean;
  // eggs.ts
  export type EggOffer = { kind: EggKind; pick: Pick | null };
  export function eggKindOf(c: Content, m: MomentKind): EggKind | null;
  export function eggMoments(c: Content): MomentKind[];                     // loaded moments with an egg kind
  export function nextEgg(ctx: PlanContext, rng: Rng): EggOffer;
  // names.ts
  export type NameCandidate = { babyId: string; name: string; gpcs: GpcId[] };
  export function nextNameReviews(ctx: PlanContext, herd: NameCandidate[], n: number, moment: 'roll-call' | 'envelope', rng: Rng): Pick[];
  ```
- `visitRange`: walk `budget.doorRanges` from the end; the first entry whose step is the current maths step, passed or placed gives `[1, max]`; none gives `null` (M01 only, spec 2.2).
- `shouldVisitDoor`: `false` without a range; `true` while any item of the range's step is below box 4; once all are in box 4 or higher, only when `herdCount % visitSecureEvery === 0`.
- `nextEgg`: `nextItem` with the loaded egg moments. A pick gives the kind of its moment. No pick gives the kind of the first egg moment of the current maths step (or the first loaded egg moment of the highest passed step with one, or `moon`) and `pick: null`: a free egg (Decision 10).
- `nextNameReviews` (spec 3.7): a candidate is eligible when every GPC has a reading item whose step is passed, placed or current, or when its item `nameItemId(name)` has at least one first try. Drop later babies with a name already in the round (case-insensitive). Order: due items first (`isDue`, by `dueAt`), then never-asked names, then least recently asked. Return up to `n` picks: `{ strand: 'name', step: null, slot: 'name', moment, items: [nameItemId(name)], carrier: { kind: 'name', babyId, name }, scaffold: 3, probe: false }`.

- [ ] **Step 1: Write the failing tests**

```ts
// G/tests/planner/visit.test.ts
import { describe, it, expect } from 'vitest';
import { visitStats, spellingShareLow, wantsLabelBubble, leastPractisedStrand, visitRange, shouldVisitDoor, isTired } from '../../src/core/planner/visit.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, resetSeq, visitStart, override, result } from '../fixtures/events.ts';
import { setup, VISIT2 } from './setup.ts';

const c = miniContent();
const r = (t: number, strand: 'r' | 's' | 'm') =>
  result(t, { strand, step: strand === 'r' ? 'R01' : strand === 's' ? 'S01' : 'M01', items: [], r: 'first' });
function fresh(...strands: ('r' | 's' | 'm')[]): LearnEvent[] {
  resetSeq();
  return [override(T0 - 1, { type: 'learn.override', op: 'profile', profile: 'fresh' }), visitStart(T0), ...strands.map((s, i) => r(T0 + i + 1, s))];
}

describe('visit signals', () => {
  it('counts the visit', () => {
    expect(visitStats(foldLearner(fresh('r', 's', 'm', 'r'), c))).toEqual({ r: 2, s: 1, m: 1, name: 0, ladder: 4, spell: 1, total: 4 });
    expect(isTired(foldLearner(fresh('r'), c), c)).toBe(false);
  });
  it('flags a low spelling share only after five ladder moments', () => {
    expect(spellingShareLow(foldLearner(fresh('r', 'm', 'r', 'm'), c), c)).toBe(false);
    expect(spellingShareLow(foldLearner(fresh('r', 'm', 'r', 'm', 'r'), c), c)).toBe(true);
    expect(spellingShareLow(foldLearner(fresh('r', 'm', 's', 'm', 'r'), c), c)).toBe(false);
  });
  it('wants a label bubble while the spelling school step is open', () => {
    expect(wantsLabelBubble(setup({ r: 'R21', s: 'S12', m: 'M10' }).ctx().l, c)).toBe(true);
    expect(wantsLabelBubble(setup({ r: 'R21', s: 'S12', m: 'M10' }, { school: false }).ctx().l, c)).toBe(false);
  });
  it('names the strand practised least, spelling first on a tie', () => {
    expect(leastPractisedStrand(foldLearner(fresh('r', 'r', 's', 'm'), c))).toBe('s');
    expect(leastPractisedStrand(foldLearner(fresh('r', 's'), c))).toBe('m');
    expect(leastPractisedStrand(foldLearner(fresh(), c))).toBe('s');
  });
  it('opens door visits from M02', () => {
    expect(visitRange(foldLearner(fresh(), c), c)).toBeNull();
    expect(visitRange(setup({ m: 'M02' }).ctx().l, c)).toEqual([1, 10]);
    expect(visitRange(setup({ m: 'M07' }).ctx().l, c)).toEqual([1, 20]);
  });
  it('sends every third newborn visiting once the range is secure', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false });
    expect(shouldVisitDoor(s.ctx().l, c, 10)).toBe(true);
    const lift = Array.from({ length: 10 }, (_, i) => i + 1).flatMap(n => [
      result(VISIT2 + n * 10, { strand: 'm', step: 'M02', items: [`m:num:${n}`], r: 'first', slot: 'review', scaffold: 3 }),
      result(VISIT2 + n * 10 + 5, { strand: 'm', step: 'M02', items: [`m:num:${n}`], r: 'first', slot: 'review', scaffold: 3 }),
    ]);
    const l = s.ctx(lift).l;
    expect(shouldVisitDoor(l, c, 9)).toBe(true);
    expect(shouldVisitDoor(l, c, 10)).toBe(false);
  });
});
```

```ts
// G/tests/planner/eggs-names.test.ts
import { describe, it, expect } from 'vitest';
import { nextEgg, eggKindOf, eggMoments } from '../../src/core/planner/eggs.ts';
import { nextNameReviews, type NameCandidate } from '../../src/core/planner/names.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { result } from '../fixtures/events.ts';
import { setup, VISIT2 } from './setup.ts';

describe('eggs', () => {
  it('maps moments to egg kinds', () => {
    const { c } = setup({});
    expect(eggKindOf(c, 'egg-two-stone')).toBe('two-stone');
    expect(eggKindOf(c, 'wish')).toBeNull();
    expect(eggMoments(c)).toEqual(['egg-moon', 'egg-small-nest', 'egg-two-stone']);
  });
  it('offers the egg kind of the pick', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M10' }, { school: false }).ctx();
    const offer = nextEgg(x, () => 0);
    expect(offer).toMatchObject({ kind: 'two-stone', pick: { step: 'M10', slot: 'current' } });
  });
  it('offers a free egg when a tired visit has nothing in box 3', () => {
    const extra = Array.from({ length: 30 }, (_, i) =>
      result(VISIT2 + 100 + i, { strand: 'm', step: 'M01', items: ['m:sub:1'], r: 'miss', slot: 'review', scaffold: 1, moment: 'egg-moon' }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M10' }, { school: false }).ctx(extra);
    expect(nextEgg(x, mulberry32(1))).toEqual({ kind: 'two-stone', pick: null });
  });
});

describe('name reviews', () => {
  const herd: NameCandidate[] = [
    { babyId: 'p1', name: 'Pip', gpcs: ['p', 'i', 'p'] },
    { babyId: 's1', name: 'Sam', gpcs: ['s', 'a', 'm'] },
    { babyId: 'b1', name: 'Ben', gpcs: ['b', 'e', 'n'] },
    { babyId: 'sh1', name: 'Shay', gpcs: ['sh', 'ay'] },
    { babyId: 'p2', name: 'Pip', gpcs: ['p', 'i', 'p'] },
  ];
  it('asks only names she can decode, without duplicates', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }).ctx();
    const picks = nextNameReviews(x, herd, 5, 'roll-call', mulberry32(1));
    expect(picks.map(p => (p.carrier as { name: string }).name).sort()).toEqual(['Ben', 'Pip', 'Sam']);
    expect(picks[0]).toMatchObject({ strand: 'name', step: null, slot: 'name', moment: 'roll-call', scaffold: 3 });
  });
  it('asks a name she read before even when it is not decodable', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }).ctx([
      result(VISIT2 + 1, { strand: 'name', step: null, items: ['name:shay'], r: 'first', slot: 'name', moment: 'roll-call' }),
    ]);
    expect(nextNameReviews(x, herd, 5, 'roll-call', mulberry32(1)).map(p => p.items[0])).toContain('name:shay');
  });
  it('asks due names first', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' });
    const x = s.ctx([result(VISIT2 + 1, { strand: 'name', step: null, items: ['name:ben'], r: 'miss', slot: 'name', moment: 'roll-call' })]);
    x.l.visit.box0['name:ben'] = 2;   // two other name results since the miss, so box 0 is due again
    expect(nextNameReviews(x, herd, 1, 'roll-call', mulberry32(1))[0].items).toEqual(['name:ben']);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/planner/visit.test.ts tests/planner/eggs-names.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** by the rules above.

- [ ] **Step 4: Run all planner tests**

Run: `npx vitest run tests/planner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/planner/visit.ts games/moon-meadow-home/src/core/planner/eggs.ts games/moon-meadow-home/src/core/planner/names.ts games/moon-meadow-home/tests/planner/visit.test.ts games/moon-meadow-home/tests/planner/eggs-names.test.ts
git commit -m "Add visit signals, the nest egg offer and name review picks"
```

### Task A19: The result payload

**Files:**
- Create: `G/src/core/planner/result.ts`
- Create: `G/src/core/planner/index.ts`
- Test: `G/tests/planner/result.test.ts`

**Interfaces:**
- Consumes: A17 `Pick`, `carrierKey`; A11 event types.
- Produces:
  ```ts
  export type Outcome = {
    result: Result;
    ms: number | null;
    place: string;
    error?: ErrorTag | null;
    slots?: { id: ItemId; r: Result }[];   // spelling: one entry per own slot
  };
  export function learnResultPayload(pick: Pick, o: Outcome): Payload<LearnResultEvent>;
  ```
  `items` is `o.slots` when given and not empty, otherwise every pick item with `o.result`. `carrier` is `carrierKey(pick.carrier)`. `index.ts` re-exports the public planner API.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/planner/result.test.ts
import { describe, it, expect } from 'vitest';
import { learnResultPayload } from '../../src/core/planner/result.ts';
import type { Pick } from '../../src/core/planner/types.ts';

const wish: Pick = { strand: 'r', step: 'R21', slot: 'current', moment: 'wish', items: ['r:cl:-st'], carrier: { kind: 'word', word: 'nest' }, scaffold: 2, probe: false };

describe('learnResultPayload', () => {
  it('turns a wish pick and its outcome into a learn.result payload', () => {
    expect(learnResultPayload(wish, { result: 'miss', ms: 2100, place: 'meadow', error: 'other' })).toEqual({
      type: 'learn.result', strand: 'r', step: 'R21', carrier: 'nest', items: [{ id: 'r:cl:-st', r: 'miss' }],
      result: 'miss', ms: 2100, scaffold: 2, error: 'other', place: 'meadow', moment: 'wish', slot: 'current', probe: false,
    });
  });
  it('uses one result per own slot for spelling', () => {
    const spell: Pick = { strand: 's', step: 'S04', slot: 'current', moment: 'naming-bells', items: ['s:g:h'], carrier: { kind: 'spell', focus: ['h'] }, scaffold: 1, probe: false };
    const p = learnResultPayload(spell, { result: 'miss', ms: 3000, place: 'nest', slots: [{ id: 's:g:h', r: 'first' }, { id: 's:g:e', r: 'miss' }] });
    expect(p.items).toEqual([{ id: 's:g:h', r: 'first' }, { id: 's:g:e', r: 'miss' }]);
    expect(p.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/planner/result.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `result.ts` and `index.ts`.

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/planner/result.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/planner/result.ts games/moon-meadow-home/src/core/planner/index.ts games/moon-meadow-home/tests/planner/result.test.ts
git commit -m "Build learn.result payloads from a pick and its outcome"
```

### Task A20: The learner report for the parent corner

**Files:**
- Create: `G/src/core/learning/report.ts`
- Modify: `G/src/core/learning/index.ts` (export it)
- Test: `G/tests/learning/report.test.ts`

**Interfaces:**
- Consumes: A15.
- Produces:
  ```ts
  export type StrandReport = {
    strand: Strand;
    placing: boolean;
    placement: { lo: StepId; hi: StepId; items: number } | null;   // null when not placing
    current: StepId | null;
    level: 1 | 2 | 3 | null;
    ceiling: boolean;                    // not placing and current is null
    passed: StepId[]; placed: StepId[]; secure: StepId[]; side: StepId[]; school: StepId[]; reopened: StepId[]; waiting: StepId[];
    week: { moments: number; firstTry: number | null; helped: number | null; dutch: number };
  };
  export function isSecure(l: Learner, c: Content, step: StepId): boolean;   // passed or placed, and every item in box 4 or higher
  export function learnerReport(l: Learner, c: Content, now: number): StrandReport[];   // r, s, m
  ```
  `waiting` lists steps whose status is `waiting` and whose release is not `later`. `week` reads `l.recent[strand]` entries with `t >= now - 7 days` and `slot !== 'probe'`: `firstTry` and `helped` are shares (null when there are none), `dutch` is a count.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/report.test.ts
import { describe, it, expect } from 'vitest';
import { learnerReport, isSecure } from '../../src/core/learning/report.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, DAY, resetSeq, visitStart, override, result, passed } from '../fixtures/events.ts';

describe('learnerReport', () => {
  const c = miniContent();
  it('reports each strand', () => {
    resetSeq();
    const l = foldLearner([
      override(T0 - 1, { type: 'learn.override', op: 'profile', profile: 'fresh' }),
      visitStart(T0),
      result(T0 + 1, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first' }),
      result(T0 + 2, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'helped' }),
      result(T0 + 3, { strand: 'r', step: 'R01', items: ['r:g:t'], r: 'miss', error: 'dutch' }),
      result(T0 + 4, { strand: 'r', step: 'R01', items: ['r:g:p'], r: 'first' }),
      passed(T0 + 5, 's', 'S01'),
    ], c);
    const [r, s] = learnerReport(l, c, T0 + DAY);
    expect(r).toMatchObject({ strand: 'r', placing: false, current: 'R01', level: 1, ceiling: false, waiting: ['R30'] });
    expect(r.week).toEqual({ moments: 4, firstTry: 0.5, helped: 0.25, dutch: 1 });
    expect(s.passed).toEqual(['S01']);
    expect(isSecure(l, c, 'S01')).toBe(false);
  });
  it('shows the probe while placing', () => {
    resetSeq();
    const [r] = learnerReport(foldLearner([visitStart(T0)], c), c, T0);
    expect(r).toMatchObject({ placing: true, placement: { lo: 'R13', hi: 'R21', items: 0 }, current: null, level: null });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/learning/report.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `report.ts` and export it from `index.ts`.

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/learning/report.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/report.ts games/moon-meadow-home/src/core/learning/index.ts games/moon-meadow-home/tests/learning/report.test.ts
git commit -m "Report each strand's steps, placement and weekly accuracy for the parent corner"
```

### Task A21: The simulated learner

**Files:**
- Create: `G/tools/lib/sim.ts`
- Create: `G/tools/simulate.ts`
- Test: `G/tests/learning/simulate.test.ts`

**Interfaces:**
- Consumes: everything in A1 to A20, and the real content from A6 to A10.
- Produces:
  ```ts
  export type SimOptions = {
    content: Content;
    seed: number;
    accuracy: number;                          // chance of a first try on a normal moment
    weeks: number;
    visitsPerWeek: [number, number];           // inclusive range, drawn per week
    momentsPerVisit: [number, number];         // checked ladder moments per visit, inclusive range
    profile: string;                           // 'year1' or 'fresh'
    trueLevel?: Partial<Record<Strand, StepId>>;   // probe answers: at or below this step use `accuracy`, above it 0.2
  };
  export type SimStepRecord = { strand: Strand; step: StepId; school: boolean; startT: number | null; passT: number | null; weeks: number | null };
  export type SimReport = {
    startT: number; visits: number; events: number;
    steps: SimStepRecord[];                    // every step that was served as current, school or side, or passed
    passedCount: Record<Strand, number>;
    finalCurrent: Record<Strand, StepId | null>;
    levelTrace: Record<Strand, number[]>;      // scaffold of each current or school moment, in order
    servedPerVisit: Record<Strand, number[]>;  // current, school and side moments per visit
    stuck: Strand[];                           // strands with 5 visits in a row of 0 served moments while they had something to learn
    nullPicks: number;
    oneRatio: number | null;                   // share of R19 picks that showed one thing
  };
  export function simulate(o: SimOptions): SimReport;
  export function formatReport(r: SimReport): string;
  ```
- CLI: `npm run simulate -- [--seed 1] [--accuracy 0.85] [--weeks 12] [--profile year1] [--release 1.0]` prints `formatReport`, a table of step, start week, pass week and weeks taken per strand, plus the summary lines.

**Simulation rules.**

1. Start at `Date.UTC(2026, 11, 1, 15, 0, 0)`, offset 120. Two seeded generators: `mulberry32(seed)` for the planner and `mulberry32(seed + 1000)` for the schedule and the answers.
2. Each week draws its visit count from `visitsPerWeek` and that many distinct weekdays; each visit starts at 15:00 UTC on its day and emits `visit.start` with `tz: 120`.
3. Each visit draws its moment count from `momentsPerVisit` and cycles the strands m, s, r. When `spellingShareLow` is true, the next moment is spelling regardless of the cycle. The request asks for every loaded moment of that strand (for maths with `doors: { built: herd, own: herd }`). The herd starts at 30 and grows by one after every maths moment.
4. Answer: probe moments use `accuracy` when the probed step is at or below `trueLevel` for the strand (by ladder index), otherwise 0.2. Other moments use `accuracy`. A miss is `miss` or `helped` with equal chance. `ms` is `900 + 2100 * rng()` for a first try and `null` otherwise.
5. The result goes through `learnResultPayload` into `applyLearnEvent`, then every `pendingLearnFacts` fact is applied at the same time. A `step.passed` fact sets that step's `passT`.
6. Each visit ends with two name reviews from `nextNameReviews` over the first 20 names of `content.names`, answered the same way.
7. A `null` pick counts in `nullPicks` when the strand has a current, school or side step.
8. `weeks = (passT - startT) / 7 days` when both are known.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/simulate.test.ts
import { describe, it, expect } from 'vitest';
import { simulate, formatReport } from '../../tools/lib/sim.ts';
import { readContent } from '../../tools/lib/read-content.ts';

const c = readContent('1.0');
const WEEK = 7 * 86_400_000;
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const median = (xs: number[]) => { const a = sorted(xs); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const p90 = (xs: number[]) => sorted(xs)[Math.min(xs.length - 1, Math.floor(0.9 * xs.length))];
const base = { content: c, visitsPerWeek: [2, 3] as [number, number], momentsPerVisit: [15, 19] as [number, number] };
const EMMA = { r: 'R21', s: 'S12', m: 'M10' };

describe('simulated learner', () => {
  it('at 85 percent a step passes in 3 play weeks or less', { timeout: 180_000 }, () => {
    const weeks: number[] = [];
    for (const seed of [1, 2, 3]) {
      const r = simulate({ ...base, seed, accuracy: 0.85, weeks: 12, profile: 'fresh' });
      console.log(formatReport(r));
      weeks.push(...r.steps.flatMap(s => (s.weeks === null ? [] : [s.weeks])));
    }
    expect(weeks.length).toBeGreaterThan(10);
    expect(median(weeks)).toBeLessThanOrEqual(3);
    expect(p90(weeks)).toBeLessThanOrEqual(4);
  });

  it("from Emma's start the plurals pass within 4 play weeks", { timeout: 180_000 }, () => {
    for (const seed of [1, 2, 3]) {
      const r = simulate({ ...base, seed, accuracy: 0.85, weeks: 6, profile: 'year1', trueLevel: EMMA });
      console.log(formatReport(r));
      for (const step of ['R19', 'S10']) {
        const rec = r.steps.find(s => s.step === step);
        expect(rec?.passT ?? null, `${step}, seed ${seed}`).not.toBeNull();
        expect((rec!.passT! - r.startT) / WEEK).toBeLessThanOrEqual(4);
      }
      expect(r.oneRatio).not.toBeNull();
    }
  });

  it('at 50 percent no step passes and the scaffold stays low', { timeout: 180_000 }, () => {
    const r = simulate({ ...base, seed: 1, accuracy: 0.5, weeks: 8, profile: 'fresh' });
    expect(r.steps.filter(s => s.passT !== null).map(s => s.step)).toEqual([]);
    for (const strand of ['r', 's', 'm'] as const) {
      const last = r.levelTrace[strand].slice(-20);
      expect(last.length).toBeGreaterThan(0);
      expect(last.reduce((a, b) => a + b, 0) / last.length).toBeLessThanOrEqual(1.5);
    }
  });

  it('over 60 visits no strand gets stuck while a place exists for its next step', { timeout: 300_000 }, () => {
    for (const profile of ['fresh', 'year1']) {
      const r = simulate({ ...base, seed: 4, accuracy: 0.85, weeks: 24, profile, trueLevel: EMMA });
      expect(r.visits).toBeGreaterThanOrEqual(55);
      expect(r.stuck, profile).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/learning/simulate.test.ts`
Expected: FAIL, cannot resolve `tools/lib/sim.ts`.

- [ ] **Step 3: Implement `sim.ts` and `simulate.ts`** by the rules above.

- [ ] **Step 4: Run it**

Run: `npx vitest run tests/learning/simulate.test.ts`
Expected: PASS, with one report table per run in the output.

If the first test fails on the median, the pace is too slow (spec 3.6 "Pace"). Raise `share.current` in `content/ladders/budget.json` by 0.05 and lower `share.review` by 0.05, rerun, and repeat up to `current: 0.65`. Never loosen the pass rule. Do not change `MINI_BUDGET`, which the unit tests pin at 50/30/20. Put the final shares and the printed weeks per step in the commit message body. If the median is still above 3 at 0.65, stop and report the table to the lead.

If the plural test fails, check first that R19 and S10 are served (their `servedPerVisit` share), then the same share rule.

- [ ] **Step 5: Run the CLI once for the record**

Run: `npm run simulate -- --seed 1 --profile year1 --weeks 12`
Expected: a table per strand. Copy the reading table into the commit message body.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/tools/lib/sim.ts games/moon-meadow-home/tools/simulate.ts games/moon-meadow-home/tests/learning/simulate.test.ts games/moon-meadow-home/content/ladders/budget.json
git commit -m "Add the simulated learner and check the pace of the ladders"
```

### Task A22: Wave A gate

**Files:** none new. This task only runs checks and reports.

- [ ] **Step 1: Run every test**

Run: `npx vitest run`
Expected: PASS for `tests/content`, `tests/learning`, `tests/planner`.

- [ ] **Step 2: Run the validator in data mode and in strict mode**

Run: `npm run check:content -- --data-only`
Expected: `0 errors`.

Run: `npm run check:content`
Expected: `0 errors` once the audio and art workstreams have delivered the Wave A clips and pictures. Until then, the only errors allowed are `ASSET_CLIP` and `ASSET_PIC`. Send their list to the audio and art workstreams, grouped by pack and by picture priority. The planner skips anything missing, so the game stays playable, but Emma should not start on a release with missing priority 1 pictures.

- [ ] **Step 3: Check the type contract with the store**

Run: `npx tsc --noEmit -p .`
Expected: no errors in `src/core/content`, `src/core/learning`, `src/core/planner` or `tools`.

- [ ] **Step 4: Report to the lead**

Send: test counts, the simulated weeks per step table, the final budget shares, the per-pack line character totals from Task A10, the list of missing assets, and the names of the contracts in "Contracts I need" that are not yet met.

---

# Wave B: release 1.1 (spec 7.1 items 14 to 19)

Starts only after Wave A is complete and playable. Order: B1, then B2, then B3, B4 and B5 in parallel, then B6.

### Task B1: Notes to Lumi

**Files:**
- Create: `G/content/phrases/notes.json`
- Modify: `G/tools/lib/validate.ts` (phrase checks)
- Modify: `G/tools/lib/lines.ts` and `G/tools/build-lines.ts` (phrase packs)
- Test: `G/tests/content/validate-phrases.test.ts`, `G/tests/planner/notes.test.ts`

**Interfaces:**
- Consumes: `RawPhrase`, `PhraseAct` `note` (A1), `carrierFor` phrase rule (A17), `phraseLines` (A10).
- Produces: about 36 notes for S08, S17, S18, S21 and S23 (spec 2.5 Post Box row, curriculum S08 to S23), the line pack `phrases-notes`, and these validator rows:

| Code | Level | Rule |
|---|---|---|
| `PHRASE_ITEM` | error | a phrase lists an unknown item |
| `PHRASE_MOMENT` | error | a phrase's moment is unknown or of another strand than its items |
| `PHRASE_WORD` | error | a phrase names a word that is not a pictured thing word |
| `PHRASE_NOTE` | error | a note's cards do not join (with single spaces and the end mark) into its `text`, its `spell` index is outside the cards, or its first card does not start with a capital |
| `COVER_PHRASES` | error | an item of a loaded step whose only moments are phrase moments has fewer than 2 loaded phrases |

**Content rules.** Each note: `id` `note-<short-kebab>`, `moment: "note"`, `text` exactly as printed ("Can we have a swing?"), `act: { kind: "note", cards, mark, spell, answer }` with `cards` the word cards in order (the first card keeps its capital), `mark` the end mark, `spell` the index of the card she spells with gems, and `answer` the pictured word id that comes down from the moon for a question (null for a telling or shouting note). `items` lists, in this order: the spelled card's tricky item if it is one (`s:t:<word>` from S08 or S17), `s:sent:order`, `s:cap:start`, `s:mark:<stop|q|bang>`, and `s:and` when a card is "and". `words` lists `answer` when set. `clip: true`. Every S08 and S17 tricky word is the spelled card in at least two notes. Every note's words are ones Emma's world allows (no sad, no other animals). No digits.

The scene contract: only the parts whose items are in `pick.items` are checked; the rest are shown already done (C-WORLD). The planner's phrase rule already drops items of steps above her current step.

- [ ] **Step 1: Write the failing validator test**

```ts
// G/tests/content/validate-phrases.test.ts
import { describe, it, expect } from 'vitest';
import { validate, type ValidateInput, type Thresholds } from '../../tools/lib/validate.ts';
import { miniRaw, MINI_GPCS } from '../fixtures/mini.ts';
import type { RawContent, RawPhrase } from '../../src/core/content/types.ts';

const LOW: Thresholds = { wordsPerReadingStep: 0, carriersPerItem: 0, twinsPerPair: 1, pluralS: 0, pluralEs: 0, namesMin: 0, namesTarget: 0, namesPriority1: 0, requireV2Names: false };
const note = (extra: Partial<RawPhrase> = {}): RawPhrase => ({
  id: 'note-swing', moment: 'note', text: 'Can we have a cup?', items: ['s:g:p'], words: ['cup'], clip: true,
  act: { kind: 'note', cards: ['Can', 'we', 'have', 'a', 'cup'], mark: 'q', spell: 4, answer: 'cup' }, ...extra,
});
function input(phrases: RawPhrase[]): ValidateInput {
  const raw: RawContent = structuredClone(miniRaw('1.1'));
  raw.moments.moments.push({ id: 'note', strand: 's', release: '1.1', needs: ['clip'] });
  raw.phrases = [{ pack: 'phrases-notes', phrases }];
  return { raw, blocklist: { version: 1, entries: [] }, phonics: [...new Set(MINI_GPCS.map(g => g.sound!))], lines: [], manifests: null, pictures: null, codeIds: [] };
}
const errors = (i: ValidateInput) => validate(i, LOW).filter(f => f.level === 'error').map(f => f.code);

describe('phrase checks', () => {
  it('accepts a well-formed note', () => expect(errors(input([note()]))).toEqual([]));
  it('rejects an unknown item', () => expect(errors(input([note({ items: ['s:t:nope'] })]))).toContain('PHRASE_ITEM'));
  it('rejects a word that is not pictured', () => expect(errors(input([note({ words: ['sat'] })]))).toContain('PHRASE_WORD'));
  it('rejects cards that do not make the text', () => {
    expect(errors(input([note({ text: 'Can we have a hat?' })]))).toContain('PHRASE_NOTE');
    expect(errors(input([note({ act: { kind: 'note', cards: ['can', 'we', 'have', 'a', 'cup'], mark: 'q', spell: 4, answer: 'cup' }, text: 'can we have a cup?' })]))).toContain('PHRASE_NOTE');
  });
  it('rejects Dutch in a phrase', () => expect(errors(input([note({ text: 'Goed zo!', act: { kind: 'note', cards: ['Goed', 'zo'], mark: 'bang', spell: 0, answer: null }, words: [] })]))).toContain('DUTCH_TEXT'));
});
```

- [ ] **Step 2: Write the failing planner test** (real content, 1.1)

```ts
// G/tests/planner/notes.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import { nextItem } from '../../src/core/planner/select.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

describe('notes to Lumi', () => {
  it('serves a note whose spelled card is a tricky word of S08 when S08 is current', () => {
    resetSeq();
    const c = readContent('1.1');
    const evs: LearnEvent[] = [visitStart(T0)];
    for (const [strand, step] of [['r', 'R21'], ['s', 'S08'], ['m', 'M10']] as const) evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, strand, step)));
    evs.push(visitStart(T0 + 3 * DAY));
    const ctx = { c, l: foldLearner(evs, c), now: T0 + 3 * DAY + 1000, assets: { clip: () => true, picture: () => true } };
    const rng = mulberry32(1);
    let notes = 0;
    for (let i = 0; i < 100; i++) {
      const p = nextItem(ctx, { strand: 's', moments: ['note'], place: 'post' }, rng);
      if (!p) continue;
      notes++;
      expect(p.carrier.kind).toBe('phrase');
      if (p.slot === 'current') {
        expect(p.step).toBe('S08');
        expect(p.items.some(id => id.startsWith('s:t:'))).toBe(true);
        expect(p.items).not.toContain('s:mark:q');   // S23 is above her step, so the mark is shown, not checked
      }
    }
    expect(notes).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 3: Run both and see them fail**

Run: `npx vitest run tests/content/validate-phrases.test.ts tests/planner/notes.test.ts`
Expected: FAIL (no phrase checks yet, no notes file).

- [ ] **Step 4: Implement the phrase checks, write `notes.json`, add `phrases-notes` to `build:lines`**

- [ ] **Step 5: Run the tests and the validator at 1.1**

Run: `npx vitest run tests/content tests/planner && npm run check:content -- --data-only --release 1.1 --only PHRASE_,COVER_PHRASES,DUTCH_,LINE_`
Expected: PASS, `0 errors`.

Run: `npm run build:lines`
Expected: `public/audio/phrases-notes/lines.json` written with one `phrase-note-...` line per note.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/content/phrases/notes.json games/moon-meadow-home/tools/lib/validate.ts games/moon-meadow-home/tools/lib/lines.ts games/moon-meadow-home/tools/build-lines.ts games/moon-meadow-home/public/audio/phrases-notes/lines.json games/moon-meadow-home/tests/content/validate-phrases.test.ts games/moon-meadow-home/tests/planner/notes.test.ts
git commit -m "Add notes to Queen Lumi for the tricky word, capital and end mark steps"
```

### Task B2: Release 1.1 maths moments

**Files:**
- Test: `G/tests/planner/maths-1-1.test.ts`
- Modify (only if a test fails): `G/src/core/planner/carriers.ts`

**Interfaces:**
- Consumes: real ladders at 1.1 (A6), `nextEgg` (A18), `nextItem` (A17).
- Produces: proof that berry eggs (M04, M13), snow eggs (M14), the Post Box pin (M03), the sash (M09 to M11) and parcels (M05, M09, M11, M12) are served with the right tasks.

- [ ] **Step 1: Write the test**

```ts
// G/tests/planner/maths-1-1.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import { nextItem } from '../../src/core/planner/select.ts';
import { nextEgg } from '../../src/core/planner/eggs.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import type { PlanContext } from '../../src/core/planner/types.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

const c = readContent('1.1');
function at(m: string): PlanContext {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (const [strand, step] of [['r', 'R21'], ['s', 'S12'], ['m', m]] as const) evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, strand, step)));
  evs.push(visitStart(T0 + 3 * DAY));
  return { c, l: foldLearner(evs, c), now: T0 + 3 * DAY + 1000, assets: { clip: () => true, picture: () => true } };
}

describe('release 1.1 maths', () => {
  it.each([['M04', 'berry', ['more', 'less']], ['M13', 'berry', ['add']], ['M14', 'snow', ['take']]])(
    '%s brings %s eggs', (step, kind, ops) => {
      const offer = nextEgg(at(step), () => 0);
      expect(offer.kind).toBe(kind);
      expect(offer.pick?.step).toBe(step);
      expect(ops).toContain((offer.pick!.carrier as { task: { op: string } }).task.op);
    });
  it('the Post Box pin serves M03 as a compare task', () => {
    const p = nextItem(at('M04'), { strand: 'm', moments: ['post-pin'], place: 'post' }, mulberry32(1))!;
    expect(p.step).toBe('M03');
    expect(p.carrier).toEqual({ kind: 'maths', task: { op: 'compare', want: 'fewest' } });
  });
  it('a parcel always serves a missing-part task', () => {
    const x = at('M12');
    const rng = mulberry32(2);
    for (let i = 0; i < 50; i++) {
      const p = nextItem(x, { strand: 'm', moments: ['parcel'], place: 'post' }, rng)!;
      expect((p.carrier as { task: { op: string } }).task.op).toBe('missing');
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/planner/maths-1-1.test.ts`
Expected: PASS without code changes, because the ladder lists the moments per step. If it fails, fix `carriers.ts` (not the test) and rerun.

- [ ] **Step 3: Commit**

```bash
git add games/moon-meadow-home/tests/planner/maths-1-1.test.ts games/moon-meadow-home/src/core/planner/carriers.ts
git commit -m "Check berry, snow, pin and parcel maths moments for release 1.1"
```

### Task B3: The golden egg

**Files:**
- Modify: `G/src/core/planner/eggs.ts`
- Test: `G/tests/planner/golden.test.ts`

**Interfaces:**
- Consumes: A15 status, A17 `carrierFor`, A18 `nextEgg`.
- Produces: `goldenEgg(ctx: PlanContext, introduced: boolean, rng: Rng): EggOffer | null`.
- Rules (spec 3.6 "Golden egg"): `null` unless `introduced`, `!l.visit.golden`, maths is not placing, there is a current maths step, and its scaffold level equals its top. Then find the next loaded maths step after the current one whose moments include an egg moment and that is neither passed nor placed. If found: when today's new maths items already reach `newPerStrandPerDay`, return `null` (the nest shows only the speckled egg); otherwise serve the first new item of that step (no memory) through its egg moment, slot `golden`, scaffold = that step's level. If there is no such step (top loaded step), serve a current-step item at the top scaffold, slot `golden`. The fold already counts a golden result toward the window and never moves the scaffold (Task A15).

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/planner/golden.test.ts
import { describe, it, expect } from 'vitest';
import { goldenEgg } from '../../src/core/planner/eggs.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { result } from '../fixtures/events.ts';
import { setup, VISIT2 } from './setup.ts';

const top = (step: string, n: number) => Array.from({ length: n }, (_, i) =>
  result(VISIT2 + 10 + i, { strand: 'm', step, items: [`m:miss:5-${(i % 2) + 1}`], r: 'first', scaffold: 3, moment: 'egg-small-nest' }));

describe('goldenEgg', () => {
  it('is offered only once introduced and only with the maths scaffold at the top', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' });
    expect(goldenEgg(s.ctx(top('M05', 6)), false, mulberry32(1))).toBeNull();
    expect(goldenEgg(s.ctx(top('M05', 3)), true, mulberry32(1))).toBeNull();
    const g = goldenEgg(s.ctx(top('M05', 6)), true, mulberry32(1))!;
    expect(g.pick).toMatchObject({ step: 'M09', slot: 'golden' });
    expect(g.kind).toBe('moon');
  });
  it('is offered at most once a visit', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' });
    const golden = result(VISIT2 + 100, { strand: 'm', step: 'M09', items: ['m:miss:10-3'], r: 'first', slot: 'golden', scaffold: 1, moment: 'egg-moon' });
    expect(goldenEgg(s.ctx([...top('M05', 6), golden]), true, mulberry32(1))).toBeNull();
  });
  it('is not offered when today already has 3 new maths items', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M05' });
    const news = ['m:miss:5-3', 'm:miss:5-4', 'm:miss:10-1'].map((id, i) =>
      result(VISIT2 + 200 + i, { strand: 'm', step: 'M05', items: [id], r: 'first', scaffold: 3, moment: 'egg-small-nest' }));
    expect(goldenEgg(s.ctx([...top('M05', 6), ...news]), true, mulberry32(1))).toBeNull();
  });
  it('serves the current step at the top scaffold on the top loaded step', () => {
    const s = setup({ r: 'R05', s: 'S04', m: 'M10' });
    const lift = Array.from({ length: 6 }, (_, i) =>
      result(VISIT2 + 10 + i, { strand: 'm', step: 'M10', items: [`m:pair:${(i % 5) + 1}+${9 - (i % 5)}`], r: 'first', scaffold: 3, moment: 'egg-two-stone' }));
    const g = goldenEgg(s.ctx(lift), true, mulberry32(1))!;
    expect(g.pick).toMatchObject({ step: 'M10', slot: 'golden', scaffold: 3 });
  });
});
```

In the mini fixture, `top('M05', 6)` gives six first tries on two M05 items, which lifts M05 from level 1 to level 3 and uses two of today's three new maths items. The cap test adds three more new items, so the cap is reached. The next egg step after M05 in the mini fixture is M09 (M07 has no egg), so the golden egg is a moon egg.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/planner/golden.test.ts`
Expected: FAIL, `goldenEgg` is not exported.

- [ ] **Step 3: Implement `goldenEgg`** by the rules above.

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/planner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/planner/eggs.ts games/moon-meadow-home/tests/planner/golden.test.ts
git commit -m "Offer the golden egg with a new item from the next egg step"
```

### Task B4: Jewels

**Files:**
- Create: `G/src/core/learning/jewels.ts`
- Modify: `G/src/core/learning/index.ts`
- Test: `G/tests/learning/jewels.test.ts`

**Interfaces:**
- Consumes: A15 fold and status.
- Produces:
  ```ts
  export type Jewel = { strand: Strand; step: StepId; kind: 'letter' | 'number'; fresh: boolean; face: string[]; t: number | null };
  export function jewels(l: Learner, c: Content): Jewel[];
  ```
- Rules (spec 2.4, 2.7): one jewel per passed or placed step that is not a display step. `kind` is `number` for maths, `letter` otherwise. `fresh` is true for passed steps that were not placed (old jewels from placement are never draggable and never light stones). `face` is the step's `face`. `t` is `passedT` (null for old jewels). Order: fresh jewels by `t`, then old jewels in ladder order r, s, m. A school step's pass gives a fresh jewel.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/jewels.test.ts
import { describe, it, expect } from 'vitest';
import { jewels } from '../../src/core/learning/jewels.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, resetSeq, visitStart, placementDone, passed } from '../fixtures/events.ts';

describe('jewels', () => {
  const c = miniContent();
  it('gives fresh jewels for passes and old jewels for placed steps', () => {
    resetSeq();
    const l = foldLearner([
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13'], ['R04D']),
      passed(T0 + 50, 'r', 'R19'),
      passed(T0 + 20, 'm', 'M01'),
    ], c);
    const js = jewels(l, c);
    expect(js.slice(0, 2).map(j => [j.step, j.fresh, j.kind])).toEqual([['M01', true, 'number'], ['R19', true, 'letter']]);
    expect(js.filter(j => !j.fresh).map(j => j.step)).toEqual(['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13']);
    expect(js.find(j => j.step === 'R19')!.face).toEqual(['R19']);
    expect(js.some(j => j.step === 'R04D')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/learning/jewels.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `jewels.ts` and export it.

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/learning/jewels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/jewels.ts games/moon-meadow-home/src/core/learning/index.ts games/moon-meadow-home/tests/learning/jewels.test.ts
git commit -m "Derive fresh and old jewels from passed and placed steps"
```

### Task B5: Name helpers for the unknown-name pull

**Files:**
- Modify: `G/src/core/content/names.ts`
- Test: `G/tests/content/names.test.ts` (add cases)

**Interfaces:**
- Consumes: A3.
- Produces (for `tools/pull-unknown-names.ts`, owned by the asset pipeline, spec 5.6):
  ```ts
  export function phonemeDistance(a: readonly Phoneme[], b: readonly Phoneme[]): number;   // Levenshtein over phonemes
  export function nearestNames(phonemes: readonly Phoneme[], c: Content, k: number): { name: NameEntry; distance: number }[];
  export function phonemesForGems(gems: readonly GpcId[], c: Content): Phoneme[] | null;   // null when a gem is not a GPC
  ```
  `nearestNames` sorts by distance, then by priority, then by name, and returns the first `k`.

- [ ] **Step 1: Add the failing tests**

```ts
// append to G/tests/content/names.test.ts
import { phonemeDistance, nearestNames, phonemesForGems } from '../../src/core/content/names.ts';

describe('unknown-name helpers', () => {
  const c = miniContent();
  it('measures distance in sounds', () => {
    expect(phonemeDistance(['p', 'i', 'p'], ['p', 'i', 'p'])).toBe(0);
    expect(phonemeDistance(['p', 'i', 'p'], ['p', 'a', 'p'])).toBe(1);
    expect(phonemeDistance(['s', 'a', 'm'], ['s', 'a', 'm', 'i'])).toBe(1);
  });
  it('lists the nearest list names first', () => {
    const near = nearestNames(['p', 'a', 'p'], c, 2);
    expect(near[0]).toMatchObject({ name: expect.objectContaining({ name: 'Pip' }), distance: 1 });
    expect(near).toHaveLength(2);
  });
  it('turns built gems into sounds', () => {
    expect(phonemesForGems(['f', 'o', 'x'], c)).toEqual(['f', 'o', 'k', 's']);
    expect(phonemesForGems(['zz9'], c)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/content/names.test.ts`
Expected: FAIL on the new imports.

- [ ] **Step 3: Implement**, then **Step 4: run** `npx vitest run tests/content/names.test.ts` and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/content/names.ts games/moon-meadow-home/tests/content/names.test.ts
git commit -m "Add sound distance helpers for the unknown-name pull"
```

### Task B6: Release 1.1 gate

**Files:**
- Modify: `G/content/release.json` to `{ "release": "1.1" }`
- Regenerate: `G/public/audio/*/lines.json`, `G/content/pictures-needed.json`

- [ ] **Step 1: Bump the release and regenerate**

Run: `npm run build:lines && npm run list:pictures`

- [ ] **Step 2: Run everything at 1.1**

Run: `npx vitest run && npm run check:content -- --data-only && npm run simulate -- --release 1.1 --profile year1 --weeks 12 --seed 1`
Expected: tests PASS, `0 errors`, a report with no stuck strand. Note that S08 to S23 load now: a learner placed above S08 meets S08 as her current spelling step when it loads (spec 3.6, waiting steps). The report shows this; it is expected.

- [ ] **Step 3: Strict check**

Run: `npm run check:content`
Expected: `0 errors`, or only `ASSET_*` errors, which go to the audio and art workstreams as in A22.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/content/release.json games/moon-meadow-home/public/audio/*/lines.json games/moon-meadow-home/content/pictures-needed.json
git commit -m "Load release 1.1 learning content"
```

---

# Wave C: releases 1.2 and 1.3 (spec 7.1 items 20 to 26)

Starts after Wave B. Order: C1, then C2, then C3, then C4 and C5 in parallel, then C6. Release 1.3 (save server, sync, parent corner rest) adds no learning content; C4 and C5 are the learning engine's part of it.

### Task C1: Salon cards

**Files:**
- Create: `G/content/phrases/salon.json`
- Modify: `G/content/ladders/reading.json` (add `salon-card` to the moments of R01 to R05, R07 to R10, R13 to R18, R19, R21 to R23, R26, R30, R32, R34, R36, R39, R41; a step's `release` stays the earliest of its moments)
- Modify: `G/src/core/planner/carriers.ts` (`salon-card` routing)
- Modify: `G/tools/lib/validate.ts` (`PHRASE_PIC`, `PHRASE_ACT` for `give`), `G/tools/lib/lines.ts` (`phrases-salon` pack, phrase pictures in `picturesNeeded`)
- Test: `G/tests/planner/salon.test.ts`, `G/tests/content/real-phrases.test.ts`

**Interfaces:**
- Consumes: A17 carrier rules, B1 phrase checks.
- Produces:
  - `salon-card` routing in `carrierFor`: grapheme, cluster and pattern items use the `wish` word rule (no tag needed); ending items use the `one-or-many` rule; every other kind uses the phrase rule.
  - Phrase picture ids: `w-<word>` of a pictured word, or a variant `w-<word>-<variant>` (`w-bow-pink`, `w-bow-spotted`), each optionally followed by `@big` or `@tiny`, which the scene draws by scaling. `picturesNeeded` adds every variant id with subject `a <variant> <word>` at priority 2.
  - Validator rows: `PHRASE_PIC` (strict: a phrase picture's base id is not in the art manifest; data-only: a variant whose word is not a pictured word), `PHRASE_ACT` (`give`: `target` is not inside `options`, or `options` has fewer than 3 entries, spec 2.5 rule 5).
- Content (spec 2.5 Salon row, 3.9): at least 2 phrases per item of R24 (`r:sfx:ing`, `r:sfx:ed`, `r:sfx:est`), R27 (`r:adj:colour`, `r:adj:size`, `r:adj:feel`), R28 (`r:and`, `r:sent:act`) and R29 (`r:sent:two`), and about 10 lines that review R19 with a colour ("pink bows", "pink bow"). Lines read as card lines: "a tiny pink bow", "green beads", "the longest ribbon", "a spotted bow", "a bow and a clip", "Put the bow on Fen.", "Fen is sleepy. Give her the soft blanket." Every phrase lists the items it exercises, including the grapheme items of its words where they decide the choice. `clip: true` on every line, so Elizabeth reads it after the act. Cousin names on cards are Dot and Fen only (spec 2.5).

- [ ] **Step 1: Write the failing planner test**

```ts
// G/tests/planner/salon.test.ts
import { describe, it, expect } from 'vitest';
import { buildContent } from '../../src/core/content/build.ts';
import { carrierFor } from '../../src/core/planner/carriers.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import type { AssetIndex, ItemRequest, PlanContext } from '../../src/core/planner/types.ts';
import { miniRaw } from '../fixtures/mini.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

function salonContent() {
  const raw = miniRaw('1.2');
  const reading = raw.ladders[0].steps;
  for (const st of reading) if (st.moments.includes('wish') || st.id === 'R19') st.moments = [...st.moments, 'salon-card'];
  reading.splice(reading.findIndex(st => st.id === 'R30'), 0, {
    id: 'R27', title: 'R27', release: '1.2', levels: 3, moments: ['salon-card'], face: ['big'],
    items: [{ id: 'r:adj:colour', kind: 'adjective', pattern: 'colour' }],
  });
  raw.phrases = [{ pack: 'phrases-salon', phrases: [
    { id: 'salon-pink-hat', moment: 'salon-card', text: 'a pink hat', items: ['r:adj:colour', 'r:g:h'], words: ['hat'], clip: true,
      act: { kind: 'give', target: ['w-hat-pink'], options: ['w-hat-pink', 'w-hat-blue', 'w-hat-green'] } },
    { id: 'salon-red-cup', moment: 'salon-card', text: 'a red cup', items: ['r:adj:colour'], words: ['cup'], clip: true,
      act: { kind: 'give', target: ['w-cup-red'], options: ['w-cup-red', 'w-cup-blue', 'w-cup-pink'] } },
  ] }];
  return buildContent(raw);
}
function ctxAt(step: string, assets: AssetIndex = { clip: () => true, picture: () => true }): PlanContext {
  resetSeq();
  const c = salonContent();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (const [strand, s] of [['r', step], ['s', 'S12'], ['m', 'M10']] as const) evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, strand, s)));
  evs.push(visitStart(T0 + 3 * DAY));
  return { c, l: foldLearner(evs, c), now: T0 + 3 * DAY + 1000, assets };
}
const REQ: ItemRequest = { strand: 'r', moments: ['salon-card'], place: 'salon' };

describe('salon cards', () => {
  it('serve an adjective item with a phrase and log its checked items', () => {
    const ch = carrierFor(ctxAt('R27'), 'R27', 'r:adj:colour', 'salon-card', 1, mulberry32(1), REQ)!;
    expect(ch.carrier.kind).toBe('phrase');
    expect(ch.items).toContain('r:adj:colour');
  });
  it('serve a grapheme or cluster item with a word, as a wish does', () => {
    expect(carrierFor(ctxAt('R27'), 'R21', 'r:cl:-st', 'salon-card', 3, mulberry32(1), REQ)!.carrier).toEqual({ kind: 'word', word: 'nest' });
  });
  it('serve a plural review with one thing or a heap', () => {
    expect(carrierFor(ctxAt('R27'), 'R19', 'r:end:es', 'salon-card', 3, mulberry32(1), REQ)!.carrier).toMatchObject({ kind: 'plural', form: 'many' });
  });
  it('skip a phrase whose picture is missing', () => {
    const x = ctxAt('R27', { clip: () => true, picture: id => id !== 'w-hat-pink' });
    for (let i = 0; i < 20; i++) {
      expect(carrierFor(x, 'R27', 'r:adj:colour', 'salon-card', 1, mulberry32(i), REQ)!.carrier).toEqual({ kind: 'phrase', phrase: 'salon-red-cup' });
    }
  });
});
```

- [ ] **Step 2: Write the failing real-content gate**

```ts
// G/tests/content/real-phrases.test.ts
import { describe, it, expect } from 'vitest';
import { realErrors } from './real.ts';

describe('real phrases at release 1.2', () => {
  it('pass the phrase, coverage and Dutch checks', () => {
    expect(realErrors(['PHRASE_', 'COVER_', 'DUTCH_', 'LINE_'], { release: '1.2' })).toEqual([]);
  });
});
```

- [ ] **Step 3: Run both and see them fail**

Run: `npx vitest run tests/planner/salon.test.ts tests/content/real-phrases.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the routing, the validator rows and the line and picture additions; write `salon.json`; add `salon-card` to the reading steps listed above; run `npm run build:lines && npm run list:pictures`.**

- [ ] **Step 5: Run the tests**

Run: `npx vitest run`
Expected: PASS. (`real-phrases.test.ts` also needs C2's meadow phrases for R12, R33 and R37 at 1.2; until C2 lands, run it with `--only` on the salon steps and expect C2 to make it fully green.)

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/content/phrases/salon.json games/moon-meadow-home/content/ladders/reading.json games/moon-meadow-home/src/core/planner/carriers.ts games/moon-meadow-home/tools/lib/validate.ts games/moon-meadow-home/tools/lib/lines.ts games/moon-meadow-home/public/audio games/moon-meadow-home/content/pictures-needed.json games/moon-meadow-home/tests/planner/salon.test.ts games/moon-meadow-home/tests/content/real-phrases.test.ts
git commit -m "Add Sparkle Salon card lines for adjectives, and, sentences and suffixes"
```

### Task C2: Year 1 meadow wishes and checked tricky words

**Files:**
- Create: `G/content/phrases/meadow.json`
- Modify: `G/tools/lib/validate.ts` (`PHRASE_ACT` for the other act kinds), `G/tools/lib/lines.ts` (`phrases-meadow` pack)
- Test: `G/tests/content/validate-meadow.test.ts`, `G/tests/planner/meadow.test.ts`

**Interfaces:**
- Consumes: A17 phrase rule, B1 and C1 phrase checks.
- Produces: phrases for `asking-bubble` (R33: `r:mark:q`, `r:mark:stop`, `r:mark:bang`), `two-state-wish` (R37: `r:pre:un`), `tricky-act` (R12: `r:t:push`, `r:t:pull`, `r:t:his`, `r:t:her`, `r:t:go`, `r:t:no`), `basket-and` (R28: `r:and`) and `basket-adj` (R27, sizes only, drawn with `@big` and `@tiny`), at least 2 phrases per item, and these `PHRASE_ACT` rules:
  - `choose-speaker`: exactly 3 speakers, each with a different mark, and `answer` is the index of the speaker whose mark is `q` (spec 2.5 Year 1 meadow row).
  - `toggle`: `thing` is a pictured word; the phrase text starts with "Un" when `to` is `off` and the item list has `r:pre:un` (spec: "Unpack the basket.", "Untie the bow.").
  - `push-pull`, `his-her`, `gate`, `put`: the deciding word (`push`/`pull`, `his`/`her`, `go`/`no`, `on`/`in`) appears in the text, and the phrase lists the matching `r:t:` item for push, pull, his, her, go and no.
- Content: asking bubbles as three lines of print ("Can I have a bow?", "I have a bow.", "What a big bow!"); two-state wishes for pack and unpack, tie and untie, lock and unlock, zip and unzip, do and undo; tricky acts "Push the swing.", "Pull the swing.", "Put the hat on.", "Put the hat in.", "Give his hat to him." is not used (gendered pronouns need a he baby and a she baby: "His hat is red." and "Her hat is red." with `his-her`), "Go!" and "No!" signs on the meadow gate. All texts are British English, no digits.

- [ ] **Step 1: Write the failing validator test**

```ts
// G/tests/content/validate-meadow.test.ts
import { describe, it, expect } from 'vitest';
import { validate, type ValidateInput, type Thresholds } from '../../tools/lib/validate.ts';
import { miniRaw, MINI_GPCS } from '../fixtures/mini.ts';
import type { RawContent, RawPhrase } from '../../src/core/content/types.ts';

const LOW: Thresholds = { wordsPerReadingStep: 0, carriersPerItem: 0, twinsPerPair: 1, pluralS: 0, pluralEs: 0, namesMin: 0, namesTarget: 0, namesPriority1: 0, requireV2Names: false };
function input(phrase: RawPhrase): ValidateInput {
  const raw: RawContent = structuredClone(miniRaw('1.2'));
  raw.moments.moments.push({ id: 'asking-bubble', strand: 'r', release: '1.2', needs: ['clip'] });
  raw.ladders[0].steps.push({ id: 'R33', title: 'R33', release: '1.2', levels: 3, moments: ['asking-bubble'], face: ['?'],
    items: [{ id: 'r:mark:q', kind: 'mark', pattern: 'q' }, { id: 'r:mark:stop', kind: 'mark', pattern: 'stop' }, { id: 'r:mark:bang', kind: 'mark', pattern: 'bang' }] });
  raw.phrases = [{ pack: 'phrases-meadow', phrases: [phrase] }];
  return { raw, blocklist: { version: 1, entries: [] }, phonics: [...new Set(MINI_GPCS.map(g => g.sound!))], lines: [], manifests: null, pictures: null, codeIds: [] };
}
const ask = (answer: number, marks: ('q' | 'stop' | 'bang')[]): RawPhrase => ({
  id: 'ask-hat', moment: 'asking-bubble', text: 'Can I have a hat?', items: ['r:mark:q', 'r:mark:stop', 'r:mark:bang'], words: ['hat'], clip: true,
  act: { kind: 'choose-speaker', answer, speakers: [
    { text: 'Can I have a hat?', mark: marks[0] }, { text: 'I have a hat.', mark: marks[1] }, { text: 'What a big hat!', mark: marks[2] }] },
});
const codes = (i: ValidateInput) => validate(i, LOW).filter(f => f.level === 'error').map(f => f.code);

describe('meadow phrase acts', () => {
  it('accepts three speakers where the answer asks', () => expect(codes(input(ask(0, ['q', 'stop', 'bang'])))).not.toContain('PHRASE_ACT'));
  it('rejects an answer that does not ask', () => expect(codes(input(ask(1, ['q', 'stop', 'bang'])))).toContain('PHRASE_ACT'));
  it('rejects two speakers with the same mark', () => expect(codes(input(ask(0, ['q', 'q', 'bang'])))).toContain('PHRASE_ACT'));
});
```

The R33 items here have only one phrase, so `COVER_PHRASES` also fires; the assertions only look at `PHRASE_ACT`.

- [ ] **Step 2: Write the failing planner test** (real content at 1.2)

```ts
// G/tests/planner/meadow.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { setCurrentOverride } from '../../src/core/learning/status.ts';
import { nextItem } from '../../src/core/planner/select.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { T0, DAY, resetSeq, visitStart, override } from '../fixtures/events.ts';

const c = readContent('1.2');
function at(r: string) {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (const [strand, step] of [['r', r], ['s', 'S12'], ['m', 'M10']] as const) evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, c), c, strand, step)));
  evs.push(visitStart(T0 + 3 * DAY));
  return { c, l: foldLearner(evs, c), now: T0 + 3 * DAY + 1000, assets: { clip: () => true, picture: () => true } };
}

describe('year 1 meadow wishes', () => {
  it.each([['R33', 'asking-bubble', 'choose-speaker'], ['R37', 'two-state-wish', 'toggle'], ['R12', 'tricky-act', null]] as const)(
    '%s is served by %s phrases', (step, moment, act) => {
      const x = at(step);
      const p = nextItem(x, { strand: 'r', moments: [moment], place: 'meadow' }, () => 0)!;
      expect(p).toMatchObject({ step, slot: 'current', moment });
      expect(p.carrier.kind).toBe('phrase');
      const phrase = c.phrases[(p.carrier as { phrase: string }).phrase];
      if (act) expect(phrase.act.kind).toBe(act);
    });
  it('at most one phrase repeats in ten picks', () => {
    const x = at('R33');
    const rng = mulberry32(3);
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['asking-bubble'], place: 'meadow', avoid: [...seen] }, rng);
      if (p) seen.add((p.carrier as { phrase: string }).phrase);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 3: Run both and see them fail**

Run: `npx vitest run tests/content/validate-meadow.test.ts tests/planner/meadow.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the `PHRASE_ACT` rules, write `meadow.json` (at least 6 asking bubbles so the repeat test holds), add `phrases-meadow` to `build:lines`, run `npm run build:lines`.**

- [ ] **Step 5: Run everything**

Run: `npx vitest run && npm run check:content -- --data-only --release 1.2`
Expected: PASS, `0 errors`, including `real-phrases.test.ts` from C1.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/content/phrases/meadow.json games/moon-meadow-home/tools/lib/validate.ts games/moon-meadow-home/tools/lib/lines.ts games/moon-meadow-home/tools/build-lines.ts games/moon-meadow-home/public/audio/phrases-meadow/lines.json games/moon-meadow-home/tests/content/validate-meadow.test.ts games/moon-meadow-home/tests/planner/meadow.test.ts
git commit -m "Add asking bubbles, two-state wishes and checked tricky-word acts"
```

### Task C3: Letter order (S19)

**Files:**
- Modify: `G/src/core/planner/carriers.ts` (`letter-order`)
- Test: `G/tests/planner/letters.test.ts`

**Interfaces:**
- Produces: `letter-order` routing. `s:abc:first` gives `{ kind: 'letters', letters }` with 3 distinct letters from `abcdefghijklmnoprstuvwy` in random order (the scene files three name tags or arches by these first letters). `s:abc:pair` gives 3 distinct letters where the first is the target (match the capital to its small letter) and the other two are distractors. Items `[item]`.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/planner/letters.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { carrierFor } from '../../src/core/planner/carriers.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { createLearner } from '../../src/core/learning/fold.ts';

describe('letter order', () => {
  const c = readContent('1.2');
  const x = { c, l: createLearner(c, 'fresh'), now: 0, assets: { clip: () => true, picture: () => true } };
  it.each(['s:abc:first', 's:abc:pair'])('%s gives three different letters', item => {
    const rng = mulberry32(1);
    for (let i = 0; i < 50; i++) {
      const ch = carrierFor(x, 'S19', item, 'letter-order', 1, rng, { strand: 's', moments: ['letter-order'], place: 'lane' })!;
      const letters = (ch.carrier as { letters: string[] }).letters;
      expect(letters).toHaveLength(3);
      expect(new Set(letters).size).toBe(3);
      for (const l of letters) expect('abcdefghijklmnoprstuvwy').toContain(l);
      expect(ch.items).toEqual([item]);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail.** Run: `npx vitest run tests/planner/letters.test.ts`. Expected: FAIL (null carrier).

- [ ] **Step 3: Implement**, then **Step 4: run** the same command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/planner/carriers.ts games/moon-meadow-home/tests/planner/letters.test.ts
git commit -m "Serve letter order items for Letter Lane and the Home Book"
```

### Task C4: Success criteria from the event log

**Files:**
- Create: `G/src/core/learning/criteria.ts`
- Modify: `G/src/core/learning/index.ts`
- Test: `G/tests/learning/criteria.test.ts`

**Interfaces:**
- Consumes: A15 fold (it replays the log itself).
- Produces (for the parent corner and `tools/report.ts`, spec 1.3):
  ```ts
  export type Criteria = {
    weeks: number;                                   // play weeks from the first visit.start to the last event
    c2: Record<Strand, number | null>;               // helped share of non-probe ladder results after placement ended in that strand
    l1: { week: number; strand: Strand; moments: number; firstTry: number; flag: 'low' | 'high' | null }[];
    l2: Record<Strand, { passed: number; perThreeWeeks: number }>;
    l3: { ladder: number | null; names: number | null };   // first-try share of review results on items in box 2 or higher
    l4: { step: StepId; early: number | null; late: number | null; ok: boolean | null }[];
    l5: { visits: number; meanSpellShare: number | null };
  };
  export function criteria(events: readonly EventBase[], c: Content): Criteria;
  ```
- Definitions: a play week is `floor((t - first visit.start t) / 7 days) + 1`. C2: per strand, `helped / all` over `learn.result` events that are not probes and come after that strand's `placement.done` or `set-current` (or from the start for a profile without placement). L1: per strand and week, first-try share of non-probe results; `flag` is `low` below 0.6 and `high` above 0.92, only when the week has at least 5 results. L2: `step.passed` count per strand; `perThreeWeeks = passed / weeks * 3`. L3 (spec: "Review accuracy on ladder items in box 2 or higher"): replay with `applyLearnEvent`; before applying each `learn.result` whose slot is `review`, `mixed` or `name`, every item of it whose memory box is 2 or higher counts once, and is a first try when its `r` is `first`; name items go to `names`, the rest to `ladder`. L4: for each passed contrast step with pass time T, `early` is dutch-tagged results divided by all results of that strand in [T, T + 14 days), `late` the same in [T + 14 days, T + 28 days); `ok` is `late <= early / 2` when both exist and `early > 0`, else `null`. L5: per visit with at least one ladder result, spelling results divided by ladder results; `meanSpellShare` is their mean.

- [ ] **Step 1: Write the failing test**

```ts
// G/tests/learning/criteria.test.ts
import { describe, it, expect } from 'vitest';
import { criteria } from '../../src/core/learning/criteria.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, DAY, resetSeq, visitStart, placementDone, result, passed } from '../fixtures/events.ts';

describe('criteria', () => {
  it('computes C2 and L1 to L5 from a small log', () => {
    resetSeq();
    const c = miniContent();
    const cur = (t: number, r: 'first' | 'miss' | 'helped', error: 'dutch' | null = null) =>
      result(t, { strand: 'r', step: 'R21', items: ['r:cl:-st'], r, scaffold: 1, error });
    const events = [
      visitStart(T0),
      placementDone(T0 + 1, 'r', 'R21', ['R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R13'], ['R04D']),
      cur(T0 + 10, 'first'), cur(T0 + 11, 'first'), cur(T0 + 12, 'first'), cur(T0 + 13, 'helped'), cur(T0 + 14, 'miss'),
      result(T0 + 20, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first', slot: 'review', scaffold: 3 }),
      result(T0 + 21, { strand: 'r', step: 'R01', items: ['r:g:a'], r: 'miss', slot: 'review', scaffold: 3 }),
      result(T0 + 30, { strand: 's', step: 'S12', items: ['s:cl:-st'], r: 'first', probe: true, scaffold: 3, moment: 'naming-bells' }),
      visitStart(T0 + 8 * DAY),
      cur(T0 + 8 * DAY + 5, 'first'),
      passed(T0 + 8 * DAY + 10, 'r', 'R04D'),
      cur(T0 + 8 * DAY + 20, 'miss', 'dutch'),
    ];
    const k = criteria(events, c);
    expect(k.weeks).toBe(2);
    expect(k.c2.r).toBeCloseTo(1 / 9);
    expect(k.c2.s).toBeNull();
    const w1 = k.l1.find(x => x.week === 1 && x.strand === 'r')!;
    expect(w1.moments).toBe(7);
    expect(w1.firstTry).toBeCloseTo(4 / 7);
    expect(w1.flag).toBe('low');
    expect(k.l1.find(x => x.week === 2 && x.strand === 'r')).toMatchObject({ moments: 2, firstTry: 0.5, flag: null });
    expect(k.l2.r).toEqual({ passed: 1, perThreeWeeks: 1.5 });
    expect(k.l3).toEqual({ ladder: 0.5, names: null });
    expect(k.l4).toEqual([{ step: 'R04D', early: 1, late: null, ok: null }]);
    expect(k.l5.visits).toBe(2);
    expect(k.l5.meanSpellShare).toBeCloseTo((1 / 8 + 0) / 2);
  });
});
```

- [ ] **Step 2: Run it and see it fail.** Run: `npx vitest run tests/learning/criteria.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `criteria.ts` by the definitions and export it.

- [ ] **Step 4: Run it and see it pass.** Run: `npx vitest run tests/learning/criteria.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/learning/criteria.ts games/moon-meadow-home/src/core/learning/index.ts games/moon-meadow-home/tests/learning/criteria.test.ts
git commit -m "Compute the success criteria from the event log for the parent corner"
```

### Task C5: The fold under merged logs from two devices

**Files:**
- Test: `G/tests/learning/merge.test.ts`
- Modify (only if a test fails): `G/src/core/learning/fold.ts`, `G/src/core/learning/status.ts`

**Interfaces:**
- Consumes: A15. Release 1.3 adds the save server and sync (spec 4.5); the core merge is a union by id and the fold order is the core's job (C-EVENTS). This task proves the learning fold gives one answer for any merged log and never takes back a recorded fact.

- [ ] **Step 1: Write the test**

```ts
// G/tests/learning/merge.test.ts
import { describe, it, expect } from 'vitest';
import { foldLearner, applyLearnEvent } from '../../src/core/learning/fold.ts';
import { stepStatus, currentStep } from '../../src/core/learning/status.ts';
import type { LearnEvent } from '../../src/core/learning/types.ts';
import { mulberry32, shuffle } from '../../src/core/planner/rng.ts';
import { miniContent } from '../fixtures/mini.ts';
import { T0, DAY, HOUR, resetSeq, visitStart, result, passed, placementDone } from '../fixtures/events.ts';

const c = miniContent();
const tag = (dev: string, evs: LearnEvent[]): LearnEvent[] => evs.map(e => ({ ...e, id: `${dev}:${e.id}` }));
const unionById = (a: LearnEvent[], b: LearnEvent[]) => [...new Map([...a, ...b].map(e => [e.id, e])).values()];
const foldOrder = (evs: LearnEvent[]) => [...evs].sort((x, y) => x.t - y.t || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

function deviceA(): LearnEvent[] {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0)];
  for (let i = 0; i < 20; i++) evs.push(result(T0 + 1000 * (i + 1), { strand: 'r', step: 'R01', items: ['r:g:t'], r: 'first', scaffold: 3 }));
  evs.push(passed(T0 + DAY, 'r', 'R01'));
  return tag('A', evs);
}
function deviceB(): LearnEvent[] {
  resetSeq();
  const evs: LearnEvent[] = [visitStart(T0 + HOUR)];
  for (let i = 0; i < 10; i++) evs.push(result(T0 + HOUR + 1000 * (i + 1), { strand: 'm', step: 'M01', items: ['m:sub:2'], r: i % 3 ? 'first' : 'miss', scaffold: 1, moment: 'egg-moon' }));
  evs.push(passed(T0 + 2 * DAY, 'r', 'R01'));
  evs.push(placementDone(T0 + 2 * DAY + 1, 's', 'S04', ['S01', 'S02', 'S03'], ['S03D']));
  return tag('B', evs);
}

describe('fold under merged logs', () => {
  it('gives the same learner for any arrival order once events are in fold order', () => {
    const merged = foldOrder(unionById(deviceA(), deviceB()));
    const once = foldLearner(merged, c);
    const rng = mulberry32(7);
    for (let i = 0; i < 20; i++) {
      const arrived = shuffle([...deviceA(), ...deviceB(), ...deviceB()], rng);
      expect(foldLearner(foldOrder(unionById(arrived, [])), c)).toEqual(once);
    }
  });

  it('keeps the earliest pass and never revokes it', () => {
    const l = foldLearner(foldOrder(unionById(deviceA(), deviceB())), c);
    expect(stepStatus(l, c, 'R01')).toBe('passed');
    expect(l.steps.R01.passedT).toBe(T0 + DAY);
  });

  it('takes the first placement.done of a strand and ignores a later one from another device', () => {
    resetSeq();
    const late = tag('C', [placementDone(T0 + 3 * DAY, 's', 'S02', ['S01'], [])]);
    const l = foldLearner(foldOrder(unionById(unionById(deviceA(), deviceB()), late)), c);
    expect(l.placement.s.current).toBe('S04');
    expect(currentStep(l, c, 's')).toBe('S04');
  });

  it('a snapshot round trip in the middle of the log continues to the same learner', () => {
    const merged = foldOrder(unionById(deviceA(), deviceB()));
    const half = Math.floor(merged.length / 2);
    const snap = JSON.parse(JSON.stringify(foldLearner(merged.slice(0, half), c)));
    for (const e of merged.slice(half)) applyLearnEvent(snap, e, c);
    expect(snap).toEqual(foldLearner(merged, c));
  });
});
```

`foldOrder` here sorts by time and id as a stand-in for the core's hybrid clock order; the property it checks (same input order gives the same learner, recorded facts are first-wins) holds for any total order the core uses.

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/learning/merge.test.ts`
Expected: PASS. A failure means the fold depends on something other than event order (for example a `Set` or object key order); fix the fold, not the test.

- [ ] **Step 3: Commit**

```bash
git add games/moon-meadow-home/tests/learning/merge.test.ts games/moon-meadow-home/src/core/learning
git commit -m "Prove the learner fold is stable under merged logs from two devices"
```

### Task C6: Release 1.2 gate and the 1.3 check

**Files:**
- Modify: `G/content/release.json` to `{ "release": "1.2" }`
- Regenerate: `G/public/audio/*/lines.json`, `G/content/pictures-needed.json`

- [ ] **Step 1: Bump and regenerate.** Run: `npm run build:lines && npm run list:pictures`.

- [ ] **Step 2: Run everything at 1.2**

Run: `npx vitest run && npm run check:content -- --data-only && npm run simulate -- --release 1.2 --profile year1 --weeks 12 --seed 1`
Expected: tests PASS, `0 errors`, no stuck strand. R12, R24 and R27 to R29 load now; a learner placed above them meets the lowest of them as her current reading step (spec 3.6). The report shows this and it is expected.

- [ ] **Step 3: Strict check.** Run: `npm run check:content`. Expected: `0 errors`, or `ASSET_*` and `PHRASE_PIC` errors handed to the audio and art workstreams.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/content/release.json games/moon-meadow-home/public/audio/*/lines.json games/moon-meadow-home/content/pictures-needed.json
git commit -m "Load release 1.2 learning content"
```

- [ ] **Step 5: Release 1.3.** When the save server and sync land (spec 7.1 item 25), set `release.json` to `1.3`, run Step 2 again (no learning content changes, so the output must match 1.2), rerun `tests/learning/merge.test.ts`, and commit with the message "Load release 1.3". Report to the lead that the learning engine needs nothing else for 1.3.
