# Heartbeat and naming: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the heartbeat loop of Moon Meadow Home (egg, hatch, naming, first wish, move-in and door visit) and the stables and goodnight scenes (rows of ten, plaques, Moonbeam Camp, roll call, sky unicorns), so Emma can hatch, name, care for and put to bed her herd on her iPad.

**Architecture:** All rules live in pure TypeScript under `src/core/heartbeat/`, `src/core/maths/`, `src/core/phonics/` and `src/core/naming/`, unit tested with Vitest. Each scene has a small controller class (`*.ctrl.ts`, no DOM, tested with fakes) and a thin Svelte 5 component for layout and touch. Scenes never create events: they call `game.dispatch(action)`, and this workstream's action translators (`src/core/actions/heartbeat.ts`, `src/core/actions/naming.ts`) turn actions into event drafts.

**Tech stack:** Svelte 5, Vite 8.3.4, TypeScript 6.0.3, Vitest 5.0.3, `playwright-cli` (WebKit, iPad emulation), `shared/audio.js` through the typed facade in `src/audio/`.

**Spec:** `docs/v3/spec.md` sections 2.2, 2.5 (nest, naming, care stations, stalls rows), 2.6, 2.7 (herd, stalls, moonflowers), 2.8, 2.9 (new player start), 3.2, 3.3, 3.7, 3.8 (twin wishes), 3.10 (one-or-many wishes), 4.4 (event types), 7.1 items 6, 7, 8 and 16 (eggs), 24. `docs/v3/decisions.md` wins on conflicts. The lead's build decisions (the task brief) win over the spec.

All paths below are relative to `games/moon-meadow-home/` unless they start with `docs/`, `shared/` or `scripts/`. All commands run from `/Users/tjitse/sites/emmas-game/games/moon-meadow-home` unless stated.

## Reconciled with the master plan (binding)

`docs/v3/plan.md` (sections 2 and 3) and `docs/v3/plan/contracts.ts` are binding for this plan. Where a task below still shows another name, shape, port or owner, the master plan and `contracts.ts` win, and the builder changes this plan's code, never another stream's. Decisions are numbered R1 to R33 in master section 2.1.

**Changed tasks.**
- Task 1 (R6, R7): `lines.ts` keeps the fixed lines and drops every number line. `lineId` becomes `HEARTBEAT_NUMBER_IDS` (contracts C12) built on `numId`, `bondId` and `ordId` from `src/audio/ids.ts`. `tools/heartbeat-lines.ts` writes `content/lines/heartbeat.json` in the audio line-file format `{ "scene": "heartbeat", "lines": [...] }` without `tier`, and leaves out ids that `content/lines/common.json` defines (`foal-hello`, `foal-yay`, `foal-silly`, `foal-notme`, `foal-wee`, `foal-yum`, `foal-cuddle`, `foal-yawn`, `fb-lovely`, `fb-letters`, `h-sounds`, `g-listen`); the code keeps using those ids. There is no tier 2 and no `sayOptional`; a missing number clip is skipped by the facade. `Traits` are four required booleans and `BreedId` is the nine-breed union from contracts C1.
- Tasks 2 and 4: the egg kind of the small nest is `small-nest` (learning's `EggKind`), not `nest`; the place and the scene stay `nest`. Every `EGG_STEPS`, `BREED_OF` and test key that names the egg kind uses `small-nest`. Hatch colours come from art's `randomColours(rng)` and `GOLDEN_BODY` (`src/art/palette.ts`), so every colour stays light enough for the tinted layers (art Review Focus 3); `hatch.ts` keeps no palette of its own.
- Tasks 5, 6 and 20 (R13): picture ids are the bare word (`hat`), the same id for one thing and its heap.
- Task 10 (R23): `src/core/naming/blocklist.ts` re-exports `checkBlocked` and `buildBlocklist` from learning's `src/core/content/blocklist.ts` and reads `shared/blocklist.json` in learning's shape. `sounds.ts` turns gems into learning's phonemes with `phonemesOf(gems, content.gpcs)`. The test cases stay.
- Task 15 (R19): action types are `naming.spelled`, `naming.partial` and `naming.assign` (prefix `naming.`, so an action never looks like an event type). Drafts follow contracts C2: gems in events are lowercase; `egg.hatched` carries `egg` and all four traits; `baby.named` is `{ baby, name, gems, route, listName }` (ordinal, clip key and unknown are derived by the world view); `name.built` uses `baby` (null for a row or sky name), `phonemes` as one space-separated string, `route` `garden` for both garden routes, `listName`, and `strong: blockKind === 'strong'`; `care.done` is `{ baby, station }` (the router sets `heart`); `sky.named` is `{ sky: index + 1, name }`. Every `learn.result` draft is built by learning's `learnResultPayload` inside `learn-bridge.ts`. Export `HEARTBEAT_SAMPLE_ACTIONS` and `NAMING_SAMPLE_ACTIONS` (one sample per action type) for integration Task I-1, and the test-only action `hb.test-hatch { baby, name }` (one `egg.hatched` with source `nest` and one `baby.named` with route `gold`).
- Task 17 (R11, R12): drop `src/ui/drag.ts`; use platform's `use:press`, `use:drag` and `use:dropTarget`. `src/ui/geometry.ts` keeps the slider index, dice and scatter dots only. Heaps are art's `<Heap id count size seed />`. Print dots play `sound('iz')` for the `-es` ending.
- Task 17B (R20, R28): name items are `name:<nameKey(name)>`. The store gives `game.planContext()` (a function) and `game.rng` (an `Rng`). `hint-runner.ts` wraps places' `createMoment`; `guides.svelte.ts` wraps platform's `ghost` and `moonbeam`.
- Tasks 18 to 23: `Unicorn` takes `breed stage colours traits height pose` (pose `stand` is `idle`, `sit` is `still`; the head-only door view is `headOnly`). `<Egg kind={BREED_OF[eggKind]} skin size />`. `ArtImg.svelte` uses `hasPicture(id)` and `<Picture>` with ids from `SCENE_ART_IDS` (contracts C9) and keeps its SVG fallback. Stage helpers are platform's `clientToStage` and `elementRect`. Audio calls are the facade's (`speak`, `say`, `sayName`, `listen(id)`, `listenSound(code)`). The world is `game.world` (contracts C3): `rowsBuilt`, `camp`, `byId`, `announced`, `settings.skipWishAfterThree`.
- Task 23 (R14, R15): scene hooks use `registerSceneHook`, `testSeed` and `isFast` from `src/platform/hooks.ts`. Flows become `flows/heartbeat/heartbeat.flow.sh` and `flows/heartbeat/naming.flow.sh`, source `flows/lib.sh`, and run with `MMH_LANE=heartbeat MMH_PORT=8772 bash flows/run.sh heartbeat/heartbeat heartbeat/naming`. `run-heartbeat-all.sh` is not written.
- Task 23B: exports `currentEggBreed(state, learner, content)`, `ownSlots(graphemes, learner, content)`, `planTray(graphemes, step, scaffold, rng)`, `canReviewName(baby: WorldBaby, learner, content)` and `BREEDS` (from `hatch.ts`) as contracts C7.
- Tasks 26 and 27 move to batch C2 (they need learning's meadow phrases from Task C2). Task 27 owns asking bubbles and two-state wishes; places Task C7 is dropped (R9).

**Batches.** A1: 1, 2, 3, 5, 6, 7, 8, 9. A2: 4. A3: 10, 11, 12, 13, 14, 15, 16. A4: 17. A5: 17B, 18 to 23, 23B. B1: 24. B2: 25. C1: 28, 29. C2: 26, 27. Lane port 8772. Work in `.worktrees/heartbeat` (R42).

### Validation round 2 (binding)

Decisions R34 to R64 in master section 2.1. Where this block and a task below differ, this block wins.

- Batch moves (rule 3.1, no import from a lane of the same batch). Task 1 takes `numId`, `bondId`, `ordId` and `HEARTBEAT_NUMBER_IDS` from `src/core/keys.ts` (skeleton, R40), not from `src/audio/ids.ts`. Task 4 moves to batch A2 (art's `src/art/palette.ts` lands in A1). Tasks 10 to 14 move to batch A3 (they need `content.gpcs` from learning A10, batch A2), with 15 and 16 after them in the same lane.
- Task 14 (R40): `nameKey` in `check.ts` is a re-export of `src/core/keys.ts` (changed in place). Name items are `nameItemId(name)`.
- Task 15 (R19, contracts C2). The code below still shows the old drafts. Rewrite it to these shapes before anything else in the task, and replace every test assertion that pins an old field:
  - `hb.learn { payload, baby }` returns `[{ ...payload, baby }]`. `payload` is built by `learnResultPayload(pick, outcome)` in `learn-bridge.ts` (17B); the translator never builds a `learn.result` itself and never sees heartbeat's `Served` type.
  - `hb.hatched` returns `egg.hatched { baby, egg, kind, breed, colours, traits, source }` with `kind` a learning `EggKind` or `'building'` and all four traits.
  - `naming.spelled`, `naming.partial`, `naming.assign` return `baby.named { baby, name, gems, route, listName }` and `name.built { visit: null, baby, gems, phonemes, route, outcome, listName, strong }` (no `target`, `ordinal`, `clipKey`, `unknown`).
  - `hb.care` returns `care.done { baby, station }`; `hb.sky-named` returns `sky.named { sky: index + 1, name }`; `hb.row-named` returns `row.named { row, name }`; `hb.decor` returns `decor.placed { decor, item, area: 'stalls', x, y }` (R57); `hb.test-hatch` as before.
  - Export `HEARTBEAT_SAMPLE_ACTIONS` and `NAMING_SAMPLE_ACTIONS` with one sample per action type. The `hb.learn` sample carries a literal payload in the shape `learnResultPayload` returns (learning A19 lands in the same batch).
  - Write this lane test first, `tests/heartbeat/contract.test.ts`, and make it pass in this batch:

  ```ts
  // Every heartbeat and naming sample action yields drafts that core's validator accepts (contracts C2).
  import { describe, expect, it } from 'vitest';
  import { validateEvent, SCHEMA_VERSION } from '../../src/core/events.ts';
  import { HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
  import { NAMING_SAMPLE_ACTIONS, applyNaming } from '../../src/core/actions/naming.ts';

  const VISIT_SCOPED = ['place.enter', 'place.leave', 'learn.result', 'learn.idle', 'name.built'];
  /** The fields integration's finishDraft adds (master Task I-1). */
  const finish = (d: Record<string, unknown>) => ({
    ...d,
    ...(VISIT_SCOPED.includes(d.type as string) && d.visit === undefined ? { visit: 'v1' } : {}),
    ...(d.type === 'learn.result' ? { baby: d.baby ?? null, heart: false } : {}),
    ...(d.type === 'care.done' ? { heart: true } : {}),
  });
  let seq = 0;
  const stamp = (d: Record<string, unknown>) => ({ id: `abcdefgh:${++seq}`, hlc: '1760000000000-0000', t: 1, dev: 'abcdefgh', v: SCHEMA_VERSION, ...d });

  describe('heartbeat drafts match contracts C2', () => {
    const cases = [['hb', HEARTBEAT_SAMPLE_ACTIONS, applyHeartbeat], ['naming', NAMING_SAMPLE_ACTIONS, applyNaming]] as const;
    for (const [name, actions, apply] of cases) {
      it(name, () => {
        expect(actions.length).toBeGreaterThan(0);
        for (const a of actions) for (const d of apply(a as never)) {
          const r = validateEvent(stamp(finish(d as never)) as never);
          expect(r.ok, `${(a as { type: string }).type}: ${JSON.stringify(r)}`).toBe(true);
        }
      });
    }
  });
  ```
- Task 17 (R36): `PrintWithDots` takes `heart?: number[]` and `dots?: boolean` (default true). Heart-part graphemes get a soft heart glow and no sound dot, and a tap on them plays nothing. The pure helper `printParts(gpcs, heart)` returns `{ text, dot, heart }[]`; test it in `tests/heartbeat/print.test.ts`: for `the` (`gpcs ['th', 'e']`, `heart [1]`) the `e` part has `heart: true` and `dot: false`.
- Task 17B (R34, R36): a station wish requests `moments: ['station-wish']` (the `MOMENT_OF_PLACE` entry is changed in place); its result is logged as the pick's slot (`review` or `mixed`). When the pick has `display`, the wish scene prints those words before the carrier. Test in `tests/heartbeat/learn-bridge.test.ts`: a pick with `display: ['the']` produces a payload whose items equal the pick's items (no item for `the`).
- Task 20 (R36): after the act, Elizabeth says each display word's clip, then the carrier's clip (`speak(wordId('the'), carrierClip)`), two sentences. The wish scene hook takes `wrong(kind)` with `one-for-many` and `many-for-one` and makes that mistake. `target()` returns the aria-label of the right answer.
- Task 22: the goodnight count is printed with its word on a panel (`41 unicorns`, `1 unicorn`) through `PrintWithDots` with `dots={false}`, shown while Elizabeth reads it. `goodnight-ctrl.test.ts` asserts `ctrl.countText` for 41 and 1. `afterRollCall` runs once and ends with `game.endVisit('goodnight')`, which routes to the rest scene (R45; changed in place).
- Task 23 (R54): in visit 1, after the third hatch of the visit, and only when `moon-hint` is not announced, the ghost hand taps toward the moon button and Elizabeth says `g-moon`; then `game.dispatch({ type: 'game/announce', opening: 'moon-hint' })`. Pure rule `moonHintDue({ visitIndex, hatchesThisVisit, announced })` with a test (true only at visit 1, third hatch, not announced). The flows are `flows/heartbeat/heartbeat.flow.sh` and `naming.flow.sh` (changed in place). `heartbeat.flow.sh` also plays the first-wish basket at levels 1, 2 and 3 (`setStep("r", "R19")`, `setScaffold("r", "R19", n)`) with `wrong("one-for-many")` and `wrong("many-for-one")` at each level before the right answer (master 5.1 check 11). `heartbeat.start()` picks the first baby with `name === null`, so unnamed v2 babies are named one per heartbeat after Moving Day (R55).
- Task 23B (R57): stall-door free play: each door has a paint pot, a flower box and a lantern; a tap cycles that decoration and dispatches `hb.decor`. Never checked, never logged as learning. Art ids are `item-brush`, `item-treat`, `item-heart` (renamed in place from `tool-*`); add those three and the door decorations to `art-src/lists/requests.txt`.
- Tasks 24 and 25: create and extend `flows/heartbeat/eggs-b.flow.sh` (changed in place); each Files list reads `Create: flows/heartbeat/eggs-b.flow.sh` (24) and `Modify: flows/heartbeat/eggs-b.flow.sh` (25), not `flows/heartbeat.sh`.
- Tasks 26 and 27: create and extend `flows/heartbeat/year1.flow.sh` (phrase wishes, asking bubbles, two-state wishes); master Gate C runs `heartbeat/year1`.
- Task 29 (R39): the switch is the setting `skip-wish-after-three`, read through `game.world.settings.skipWishAfterThree`.
- Lines (R53): heartbeat adds its own Wave B and C lines to `content/lines/heartbeat.json` in Tasks 24 to 27; audio run 8 (B3) and run 11 (C3) generate them.

## Global constraints

- British English only in the app. No Dutch words, text or audio. The blocklist may hold Dutch words, which are never shown or played.
- Unicorns only, with Queen Lumi. No other animals, people or trademarked characters.
- No pressure mechanics: no timers shown, no streaks, no countdowns, no "come back", no buzzer, no red cross. Nothing a mistake produces is a reward.
- Elizabeth (`narrator`) speaks every goal, hint, feedback line, number, name and learning word. Lumi (`queen`) speaks story lines only. Babies (`foal`) only giggle and say fixed tiny words. Ids starting with `word-`, `name-`, `num-` or `sound-` are narrator only.
- Clips join only at sentence boundaries. A name is always its own clip ("Pip!"). No browser speech, ever.
- Touch targets at least 64 x 64 stage pixels. Pointer events only, no hover, no double tap, no keyboard. `touch-action: none` on the play area. Drag threshold 6 px.
- Fixed stage 1180 x 820, scaled to fit. Animate only `transform` and `opacity`. No animated filters or shadows.
- Every interactive element has an `aria-label` (`egg`, `stone 3`, `bell Ken`, `gem a`, `slot 2`, `door 19`, `item hats`, `station swing`, `lantern`).
- One goal per screen. Elizabeth says the goal once. Reading never says the deciding word before Emma acts. Spelling always says the target first.
- Every checked choice has at least three plausible options. Name tags and door plaques are hidden while Emma finds a name or a door.
- Imports inside `src/core/` use explicit `.ts` extensions (Node type stripping, spec 4.2).
- Commits: small, plain English messages, no AI attribution, only this workstream's files.

## Review focus

1. **A herd of one or two babies.** A new player has one baby after egg 1. Door visits and roll call must quietly do nothing when fewer than three candidates exist, never crash, never show a choice of one. Tests: Task 7 (`pickVisitDoor` returns null, `stableLayout` with one baby) and Task 8 (`pickRollCall` returns no picks with two heads).
2. **A baby without a door.** Baby 11 hatches while only Row 1 is built. It goes to the Moonbeam Camp, its line says "Baby number eleven." without a glowing door, and it is never a door visit target or a roll-call door. Tests: Task 7 (camp, no target) and Task 8.
3. **Leaving in the middle of naming.** The iPad closes after the hatch and before a name. The next heartbeat start must resume at naming for that baby, and the nest must not hatch a second baby on top. Test: Task 16 (`step` with `unnamedBaby`).
4. **No bell names left.** At a low spelling step, with a big herd and few names with clips, `bellsFor` can return fewer than three names. Naming must then still offer the garden and the gold bell, and never show an empty bell row. Tests: Task 12 (`bellsFor` with an exhausted bank) and Task 19 (`NamingCtrl` opens on the gold bell when there are no bells).
5. **A basket that cannot be filled.** A word whose step has few pictured neighbours cannot fill 3, 4 or 6 basket items. The wish must be skipped cleanly (the planner's `accept` filter refuses it), never shown with one or two items. Tests: Task 5 (`planBasket` returns null) and Task 6 (`buildWish` returns null).

---

## File map

### Pure logic (no DOM)

| Path | Responsibility |
|---|---|
| `src/core/heartbeat/types.ts` | Shared types of this workstream: `Strand`, `Result`, `ErrorTag`, `Scaffold`, `StepState`, `Colours`, `Traits`, `BreedId`, `StationId`, `CareKind`, `NameTarget`, `LearnResultDraft` |
| `src/core/heartbeat/numbers.ts` | `numberWord(n)`, `ordinalWord(n)`, `capitalise(s)` in British English |
| `src/core/heartbeat/lines.ts` | Every audio line this workstream needs, with id builders and tiers |
| `tools/heartbeat-lines.ts` | Writes `content/lines/heartbeat.json` from `lines.ts` |
| `content/lines/heartbeat.json` | Generated line list in the `scripts/generate-audio.py` format plus `tier` |
| `src/core/heartbeat/result.ts` | `momentResult(misses, hintLevel)` |
| `src/core/heartbeat/places.ts` | `HEARTBEAT_PLACES`: which steps the nest, wish, door and roll call can serve, per wave |
| `src/core/maths/eggs.ts` | Egg kinds per step, maths item parsing, `EggTask` building, stone judging, goal, miss, success and hint lines |
| `src/core/maths/stones.ts` | `planStones(task, rng)`: answer stones with faces and decoys |
| `src/core/heartbeat/hatch.ts` | Breeds per egg kind, colours, shiny, golden and speckled traits |
| `src/core/phonics/basket.ts` | Wish basket planners (plain, one-or-many, twin) and `judgeGive` |
| `src/core/heartbeat/wish.ts` | `buildWish`: turns a served reading item into a basket, station or twin wish |
| `src/core/heartbeat/stables.ts` | Rows of ten, doors, Moonbeam Camp, pages of 20 doors, visiting range, door visit pick |
| `src/core/heartbeat/rollcall.ts` | Roll call count, name eligibility, picks, logging rule |
| `src/core/heartbeat/sky.ts` | Sky unicorns and stars from the herd count, goodnight lines |
| `src/core/heartbeat/moonflowers.ts` | Stable moonflower patch layout, denser patches above 60 |
| `src/core/heartbeat/flow.ts` | The heartbeat state machine (`step`) |
| `src/core/naming/sounds.ts` | Grapheme to phoneme rules for built names, `soundKey`, `spellingToGems`, vowel gems, tray order |
| `src/core/naming/blocklist.ts` | Compiles `shared/blocklist.json`, checks by sound, whole and strong parts |
| `src/core/naming/gifts.ts` | `SpellCtx`, `makeSpellCtx`, `giftSlots`, `ownCount` |
| `src/core/naming/bells.ts` | Bell names, garden names, first sounds |
| `src/core/naming/tray.ts` | Gem trays for bell and garden names, the gold tray, contrast rules |
| `src/core/naming/check.ts` | Gold bell checks, slot judging, error tags, naming results, ordinals, slot limits, display names |
| `src/core/actions/heartbeat.ts` | `applyHeartbeat(action)`: heartbeat actions to event drafts |
| `src/core/actions/naming.ts` | `applyNaming(action)`: naming actions to event drafts |
| `src/core/heartbeat/meadow.ts` | Which babies stand in the meadow (at most 12), care tools and baby lines |
| `src/core/eggs/breed.ts`, `src/core/eggs/index.ts` | The breed of the current egg step, for PLACES' herd circle |
| `src/core/phonics/tray.ts` | `ownSlots` and `planTray` from plain graphemes, for PLACES' labels and signs |
| `src/core/naming/review.ts` | `canReviewName`, for PLACES' envelopes |

### Scenes, controllers and UI parts

| Path | Responsibility |
|---|---|
| `src/ui/geometry.ts` | Pure helpers: drag threshold, nearest drop target, slider index, heap layout, dice and scatter dots |
| `src/ui/drag.ts` | Svelte action `draggable` with pointer capture, 6 px threshold, snap to the nearest target |
| `src/ui/Gem.svelte` | One letter gem (pink vowel, blue consonant, pink and blue y, gift sparkle, crown capital) |
| `src/ui/GemSlots.svelte` | A row of 2 to 8 slots with plus slot, removable empty slots, hum and crown |
| `src/ui/GemTray.svelte` | Draggable gems in rows; tap plays the gem's sound |
| `src/ui/SoundSlider.svelte` | The star slider that plays each gem's sound as it passes |
| `src/ui/Stone.svelte` | A number stone (dice dots, scatter, numeral) |
| `src/ui/PrintWithDots.svelte` | A printed word with sound dots, slide to hear, silent units |
| `src/scenes/heartbeat/deps.ts` | `SceneDeps` and the live wiring to audio, hints, game and rng |
| `src/scenes/heartbeat/learn-bridge.ts` | The only file that calls LEARN: picks to served items, word and name views, result payloads, step states |
| `src/scenes/heartbeat/hint-runner.ts` | The heartbeat's hint interface on top of PLACES' `createMoment` |
| `src/scenes/heartbeat/guides.svelte.ts`, `src/scenes/heartbeat/HbGuides.svelte` | Ghost hand, moonbeam and replay for heartbeat scenes, on top of PLACES' parts |
| `src/scenes/heartbeat/MeadowLife.svelte` | The nest, up to 12 babies and care free play, mounted by PLACES' meadow |
| `src/scenes/heartbeat/HatchAndName.svelte` | A building egg hatches and is named (PLACES' herd circle) |
| `src/scenes/heartbeat/ArtImg.svelte` | Shows an art id from the manifest, or its SVG fallback |
| `src/scenes/heartbeat/Fallback.svelte` | SVG fallbacks for eggs, nest, blanket, bells, door, tent, lantern, basket, stations, moonflower, sky unicorn |
| `src/scenes/heartbeat/nest.ctrl.ts` | Egg moment: goal, stones, misses, hints, hatch action |
| `src/scenes/Nest.svelte` | Nest scene with egg, cups, stars or blanket, stone tray |
| `src/scenes/Hatch.svelte` | Wobble, cracks, burst, fanfare, shiny sparkle, moonflower pop |
| `src/scenes/heartbeat/naming.ctrl.ts` | Naming moment: bells, garden, gold bell, spelling, checks, assign |
| `src/scenes/Naming.svelte` | Naming scene with bells, name tree, garden, gold bell, slots, tray, tag |
| `src/scenes/naming/NameTag.svelte` | Name tag with crowned capital, ordinal crown and numeral, moon sparkle when no clip |
| `src/scenes/heartbeat/wish.ctrl.ts` | Wish moment: print, basket or station, funny misses, twin follow-up |
| `src/scenes/Wish.svelte` | Wish scene: baby with speech bubble, basket, care stations |
| `src/scenes/heartbeat/stalls.ctrl.ts` | Move-in line, camp, door visit moment |
| `src/scenes/Stalls.svelte` | Rows of ten as two rows of five doors, plaques, camp tents, page arrows |
| `src/scenes/heartbeat/goodnight.ctrl.ts` | Roll call moments, sky count, sky naming |
| `src/scenes/Goodnight.svelte` | Doors with heads, lantern, sky with stars and sky unicorns |
| `src/scenes/heartbeat/flow.svelte.ts` | Runtime heartbeat controller: `heartbeat.start()`, `startWish()`, `startGoodnight()`, hooks |
| `src/scenes/heartbeat/Moonflowers.svelte` | Renders the moonflower patches; the meadow places it |
| `src/scenes/heartbeat/moon-name.ts` | Finds babies whose invented name now has a clip, and plays "The moon told me a new name!" |
| `src/scenes/heartbeat/test-hooks.ts` | Registers `answer`, `wrong` and scene actions on the test hook, and `window.__hb` in test builds |
| `src/scenes/heartbeat/egg-choice.ctrl.ts` | Wave B: the two-egg choice |
| `src/scenes/heartbeat/phrase.ctrl.ts` | Wave B: runs a phrase wish one line at a time |
| `src/scenes/heartbeat/year1.ctrl.ts` | Wave C: runs asking bubbles and two-state wishes |
| `src/core/heartbeat/phrases.ts` | Wave B: phrase wishes (R27, R28, R29) and the tricky-word pairs of R12 |
| `src/core/heartbeat/year1.ts` | Wave C: asking bubbles (R33) and two-state wishes (R37) |
| `src/scenes/heartbeat/seen-stalls.ts` | Wave C: remembers each baby's last seen stall on this iPad, for quiet moves after a sync |
| `src/scenes/EggChoice.svelte` | Wave B: the speckled and golden egg choice |

### Content, tests and flows

| Path | Responsibility |
|---|---|
| `tests/heartbeat/*.test.ts` | Unit tests for heartbeat logic and controllers |
| `tests/naming/*.test.ts` | Unit tests for naming logic and the naming controller |
| `tests/heartbeat/fakes.ts` | Fake audio, hints, dispatch and rng for controller tests |
| `tests/naming/fixtures.ts` | A spelling ladder, a name bank and a blocklist fixture |
| `tests/heartbeat/words.ts` | A small word bank fixture |
| `flows/heartbeat.sh` | `playwright-cli` flow for three heartbeats, door visit and goodnight at one viewport |
| `flows/naming.sh` | `playwright-cli` flow for gold bell outcomes, slots, duplicates |
| `flows/run-heartbeat-all.sh` | Runs both flows at 1180x820, 1080x810, 1024x768 and the portrait check |

---

## Contracts I need

**Read this first.** `docs/v3/plan/learning.md` (LEARN) and `docs/v3/plan/places.md` (PLACES) were written next to this plan. Where they define an interface, theirs is binding and Task 17B adapts to it in four files owned here (`learn-bridge.ts`, `hint-runner.ts`, `guides.svelte.ts`, `HbGuides.svelte`). C10 and C13 below are kept only as the shapes the heartbeat controllers use internally. The reconciled points:

| Topic | LEARN or PLACES has | This plan does |
|---|---|---|
| Planner | `nextItem(ctx, req: ItemRequest, rng): Pick` with a `Carrier` union | `serve(slot, rng, accept, extra)` in `learn-bridge.ts` turns a `Pick` into `Served`; `accept` is emulated with `req.avoid` and up to six tries |
| Item ids | `r:g:ai`, `m:...`, `name:<babyId>` | Wish and maths moments log the pick's items; naming slots and door numbers map through `itemIdFor`; roll call logs `name:<babyId>` |
| `learn.result` payload | `items: { id, r }[]`, `step: null` for names, `moment`, `slot`, `error: null` | Drafts carry `moment` and `slot` from the pick; CORE's router applies `toLearnPayload` to every heartbeat draft |
| Words and names | `Content.words` (plural inside the word), `Content.names` (GPC ids) | `wordEntries(c)` and `nameEntries(c)` build the `WordEntry` and `NameEntry` views in `src/core/heartbeat/types.ts` |
| Miss or helped | places.md D1: a miss then a right answer stays `miss` | Adopted: `HintRunner.level` reports 2 only for an idle-triggered focused hint |
| Hint ladder, ghost hand, moonbeam, replay | `createMoment`, `ghostMove`, `<Moonbeam>`, `<GhostHand>`, `<ReplayButton>` (PLACES) | `hint-runner.ts` and `guides.svelte.ts` wrap them; `<HbGuides />` mounts them in each heartbeat scene |
| Heap | `src/ui/Heap.svelte` (PLACES) with `{ picture, count, seed, size }` | Not written here; the wish basket uses it |
| Egg offer | `nextEgg` may return no pick (a free egg), `goldenEgg` in release B | Free eggs hatch through `hb.egg.free` with no result; Wave B `eggOffer` uses `goldenEgg` |
| Name review picks | `nextNameReviews` | Goodnight asks it for eligible babies, then `pickRollCall` lays them out by page |
| Blocklist | `src/core/content/blocklist.ts` (LEARN) | Duplicate in `src/core/naming/blocklist.ts`; keep whichever passes Task 10's cases, the other re-exports it |
| Shared parts PLACES expects from here | `GemSlots` with `{ slots, tray, onslide, popWrong, hum }`, `PrintWithDots` with `{ text, dots, silent, hearts }`, `StoneTray`, `ownSlots`, `planTray`, `canReviewName`, `HatchAndName.svelte`, `MeadowLife.svelte`, `currentEggBreed` | Task 17 keeps its own props, because naming needs gift tails, removable slots and per-unit silence. PLACES adapts its call sites: `slots` to `SlotView[]`, `tray` to `GemTray gems`, `onslide` to `SoundSlider ondone`, `text` to `printUnits(gr)`. Task 23B provides `MeadowLife`, `HatchAndName`, `currentEggBreed`, `ownSlots`, `planTray` and `canReviewName` with the signatures listed there |

These are assumptions about other workstreams. The integrator reconciles them. Where a name differs, the other workstream's file wins and this plan's call sites are renamed. Owners are guesses: CORE (skeleton, events, store, save, audio facade, test hook), LEARN (learning engine and planner), CONTENT (ladders, words, names, blocklist, audio packs), ART, MEADOW (hub, bubbles, hints, ghost hand, moonbeam, label bubbles, plurals jars), BUILD (Building Days), MOVE (Moving Day and v2 import), PARENT, SYNC.

### C1. Project skeleton (CORE)

- `package.json` scripts: `test` = `vitest run`, `check` = `svelte-check --tsconfig ./tsconfig.json`, `build:test` = `vite build --mode test`, `lines:heartbeat` = `node tools/heartbeat-lines.ts` (this workstream adds this one line to `package.json`; if CORE prefers, CORE adds it).
- `tsconfig.json` has `"allowImportingTsExtensions": true`, `"noEmit": true`, `"strict": true`, and includes `src`, `tests`, `tools`.
- `vitest.config.ts` includes `tests/**/*.test.ts` with `environment: 'node'`.
- The Node server (`server/serve.ts`, CORE) serves the repo root on a lane port (8772 for this lane, never 8765) and maps `/games/moon-meadow-home/` to `games/moon-meadow-home/dist/`. Test builds (`npm run build:test`) include the test hook. Start it from the repo root: `MOON_DIST=dist-test-heartbeat PORT=8772 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts`.

### C2. Random numbers (CORE, `src/core/rng.ts`)

```ts
export type Rng = () => number;               // [0, 1)
export function makeRng(seed: number): Rng;    // mulberry32, as v2
export function pick<T>(a: readonly T[], rng: Rng): T;
export function shuffle<T>(a: readonly T[], rng: Rng): T[]; // returns a new array
```

### C3. Event drafts (CORE, `src/core/events.ts`)

CORE's `makeEvent` adds `id`, `hlc`, `t`, `dev`, `v`. This workstream produces drafts (`{ type, ...payload }`) with these payloads, which CORE must register and validate:

```ts
type LearnResultDraft = {
  type: 'learn.result';
  strand: 'r' | 's' | 'm' | 'name';
  step: string;                 // 'M10', 'R19', 'S12', 'name'
  carrier: string;              // 'hats', 'Daisy', 'egg:two-stone', 'door:14'
  items: { id: string; result: 'first' | 'miss' | 'helped' }[];
  result: 'first' | 'miss' | 'helped';
  ms: number;
  scaffold: 1 | 2 | 3;
  error?: 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
  place: 'nest' | 'wish' | 'twin-wish' | 'station' | 'naming' | 'door' | 'rollcall'; // a station logs moment 'station-wish': review only, never in a pass window (spec 2.5)
  probe: boolean;
  source: 'current' | 'review' | 'mixed' | 'school' | 'probe' | 'golden' | 'side';
  baby?: string;                // the baby the moment was for (hearts, wish stickers)
};
type EggHatchedDraft = { type: 'egg.hatched'; baby: string; kind: EggKind; breed: BreedId;
  colours: { body: string; mane: string; mane2: string };
  traits: { shiny?: true; speckled?: true; golden?: true }; source: 'nest' | 'building' };
type NameBuiltDraft = { type: 'name.built'; target: NameTarget; route: NameRoute; gems: string[];
  phonemes: string[]; outcome: 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen';
  listName?: string; blockKind?: 'strong' | 'rude' | 'toilet' };
type BabyNamedDraft = { type: 'baby.named'; baby: string; name: string; gems: string[];
  clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean };
type NameClipHeardDraft = { type: 'name.clipHeard'; baby: string };
type CareDoneDraft = { type: 'care.done'; baby: string; kind: CareKind };
type SkyNamedDraft = { type: 'sky.named'; index: number; name: string; gems: string[]; clipKey: string | null };
type NameTarget = { kind: 'baby'; baby: string } | { kind: 'row'; row: number } | { kind: 'sky'; index: number };
type NameRoute = 'bell' | 'garden-pic' | 'garden-sound' | 'gold';
type CareKind = 'brush' | 'cuddle' | 'treat' | 'trick' | 'splash' | 'station' | 'rollcall';
```

`baby.named` is a recorded fact keyed by `baby` (earliest wins). `sky.named` is cosmetic, latest wins per `index`.

### C4. Actions router (CORE, `src/core/actions.ts`)

`apply(action, world, learner)` sends actions whose `type` starts with `hb.` to `applyHeartbeat(action)` and those starting with `name.` to `applyNaming(action)`, both from this workstream, passes every `learn.result` draft through `toLearnPayload(draft, content)` (Task 17B), and wraps every draft with `makeEvent`. Both functions are pure and need no world or learner: every value they need travels in the action.

### C5. World (CORE, `src/core/world/types.ts`)

```ts
type Baby = {
  id: string;
  order: number;              // 1-based hatch order = baby number = stall number
  name: string | null;        // display spelling, null until named
  nameGems: string[];         // gems of the name, [] until named
  clipKey: string | null;     // name clip key ('lily' for a baby called Lili), null when no clip
  ordinal: number;            // 1, or 2 for "Tim the Second"
  unknownName: boolean;       // named with a name that had no clip
  clipHeard: boolean;         // a name.clipHeard event exists
  breed: BreedId; colours: Colours; traits: Traits;
  hearts: number; stage: 'baby' | 'foal' | 'young';
  hatchedAt: number;
};
type World = {
  herd: Baby[];               // sorted by order
  rowsBuilt: number;          // Row 1 counts as built from the start (spec 2.4)
  skyNames: (string | null)[];// index 0 is the first sky unicorn
  bathPond: boolean;          // the Bath Pond building is done
  flowers: number;            // count of egg.hatched events
  visitIndex: number;         // 1 for the first visit
  rowNames: (string | null)[];// index 0 is Row 1, from BUILD's row.named
  announced: Set<string>;     // openings announced (opening queue); Wave B reads 'two-egg'
  settings: { skipWishAfterThree: boolean }; // Wave C, from PARENT
};
```

Hearts rule the world fold applies: +1 per `learn.result` with `place` `wish`, `twin-wish` or `station` and a `baby`; +1 per `care.done` with kind `rollcall`; +1 per `name.clipHeard`; +1 at most once per baby per visit for every other `care.done` kind. 3 hearts make a foal. On `baby.named` the fold sets `name`, `nameGems`, `clipKey`, `ordinal` and `unknownName`. On `name.clipHeard` it sets `clipHeard` and sets `clipKey` to the lowercase name.

### C6. Game store (CORE, `src/game.svelte.ts`)

```ts
export const game: {
  readonly world: World; readonly learner: Learner; readonly plan: VisitPlan;
  readonly scene: SceneId; readonly params: Record<string, unknown>;
  dispatch(action: { type: string }): void;
  go(scene: SceneId, params?: Record<string, unknown>): void;
  endVisit(reason: 'goodnight' | 'idle' | 'hidden'): void;   // writes visit.end; the store routes to the rest scene
  readonly content: Content;           // LEARN's Content; the heartbeat reads it only through learn-bridge.ts
  readonly planContext: PlanContext;   // LEARN's C-STORE item 2
  readonly rng: Rng;                   // seeded in the test build
};
type SceneId = 'meadow' | 'nest' | 'hatch' | 'naming' | 'wish' | 'stalls' | 'goodnight' | 'egg-choice' | string;
```

### C7. Test hook (CORE, `src/test-hook.ts`)

```ts
export function registerSceneHook(scene: SceneId, hook: { answer(): unknown; wrong(): unknown; [k: string]: (...a: any[]) => unknown }): void;
export function testSeed(): number | null;   // the value set by __game.seed(n); null in production
export function isFast(): boolean;           // true after __game.fast(true); audio calls then resolve at once and scene pauses are zero
```

`window.__game.answer()` and `window.__game.wrong()` call the hook of the current scene and return its promise. `window.__game.scene` exposes the current scene's hook object. `window.__game.state()` returns at least `{ scene, herd: number, lastLog: LearnResultDraft | null }`, where `lastLog` is the latest `learn.result` event. `window.__game.jump(scene)`, `seed(n)`, `fast(on)`, `mute(on)`, `setStep(strand, step)` behave as spec 6.2, and `announce(id)` writes an `opening.announced` event (used by the Wave B flow). The start screen's Play button has `aria-label="play"` and portrait shows an element with `aria-label="turn the iPad"`.

### C8. Stage helpers (CORE, `src/ui/stage.ts`)

```ts
export function toStage(e: PointerEvent): { x: number; y: number };     // client to stage pixels
export function rectInStage(el: Element): { x: number; y: number; w: number; h: number };
```

### C9. Audio facade (CORE, `src/audio/index.ts`)

```ts
export interface AudioApi {
  say(id: string): Promise<void>;                 // required clip (ClipId at compile time)
  sayAll(ids: string[]): Promise<void>;           // in order, stops current speech first
  sayOptional(id: string): Promise<boolean>;      // tier 2 clip; false and silent when missing
  sayName(key: string, mark: '!' | '?'): Promise<boolean>; // false when no clip
  hasName(key: string): boolean;                  // clip in a loaded name manifest (and cached offline)
  sound(g: string): Promise<void>;                // pure letter sound from shared/audio/phonics
  hold(g: string): { stop(): void; done: Promise<void> };
  sfx(name: 'pop' | 'chime' | 'sparkle' | 'whoosh' | 'soft-no' | 'fanfare' | 'splash' | 'munch' | 'tick' | 'magic' | 'hatch'): Promise<void>;
  stop(): void;
  act(): void;                                    // Emma acted: stop stale instructions
  listen<T>(p: Promise<T>): Promise<T>;           // a sound she asked to hear: never cut off
}
export const audio: AudioApi;
```

The core pack is assembled from every `content/lines/*.json`. Ids are unique across files. Tier 1 ids are part of the generated `ClipId` union. Tier 2 ids are only played through `sayOptional`. Name clips use `sayName(key)` with keys in lowercase (`lily`).

### C10. Planner and learner (LEARN)

```ts
// src/core/planner/types.ts
export type Served = {
  strand: 'r' | 's' | 'm' | 'name';
  step: string; id: string;          // item id (grammar in C11)
  carrier: string;                    // word for reading, '' for maths
  items: string[];                    // item ids exercised (reading: graphemes of loaded steps)
  scaffold: 1 | 2 | 3; probe: boolean;
  source: 'current' | 'review' | 'mixed' | 'school' | 'probe' | 'golden' | 'side';
  twin?: string;                      // second word for twin steps R04D, R11, R20, R38
};
export type SlotId = 'egg' | 'wish' | 'naming' | 'rollcall-door';
// src/core/planner/index.ts
export function nextItem(plan: VisitPlan, strand: Served['strand'], slot: SlotId, rng: Rng, accept?: (s: Served) => boolean): Served | null;
export function nextEgg(plan: VisitPlan): { speckled: Served; golden: Served | null } | null; // Wave B
export function spellingBehind(plan: VisitPlan): boolean;   // spelling share below one in five
export function checkedThisVisit(plan: VisitPlan): number;
// src/core/learning/index.ts
export function stepStatus(l: Learner, strand: 'r' | 's' | 'm', step: string): 'current' | 'passed' | 'placed' | 'side' | 'school' | 'waiting' | 'locked';
export function currentStep(l: Learner, strand: 'r' | 's' | 'm'): string;
export function stepSecure(l: Learner, strand: 'r' | 's' | 'm', step: string): boolean;
export function nameStat(l: Learner, key: string): { box: number; due: boolean; firsts: number } | null;
```

`nextItem` must skip any candidate for which `accept` returns false and never return an item whose clip or picture is missing. The planner's place registry imports `HEARTBEAT_PLACES` from `src/core/heartbeat/places.ts` (this workstream) to know which steps `nest`, `wish`, `door` and `rollcall-door` serve.

### C11. Content (CONTENT)

- Ladders `content/ladders/{r,s,m}.json`: `{ "steps": LadderStep[] }` in ladder order, `LadderStep = { id: string; items: string[]; levels: 1 | 2 | 3; school: boolean; contrast: boolean; fluency: boolean }`.
- Item grammar. Spelling and reading grapheme items are lowercase grapheme strings (`"ai"`, `"a-e"`, `"ck"`). Endings are `"-s"` and `"-es"`. Tricky words are `"tw:the"`. The S11 item is `"capital"`. Maths: `sub:N` (M01), `num:N` (M02, M07), `A+B` (M04 with B = 1, M05, M09, M10, M11, M12, M13), `A-B` (M04 with B = 1, M14).
- Words: `Map<string, WordEntry>`:

```ts
type WordEntry = {
  word: string;                 // 'hats'
  gr: string[];                 // ['h','a','t','-s']; split digraphs as 'a-e'
  step: string;                 // reading step it serves
  picture: string;              // art id of the ONE picture ('hat'), also for plurals
  clip: string;                 // 'word-hats'
  one?: string;                 // plural words: the one word ('hat')
  plural?: string;              // one words with a plural ('hats')
  pair?: string;                // contrast partner ('pen' for 'pan')
  pairTag?: 'aeu' | 'final' | 'vw' | 'jy' | 'th' | 'ch' | 'r20' | 'split-e' | 'vowel';
  station?: 'hay' | 'brush' | 'hat' | 'nap' | 'swing' | 'bath';
  confuse?: string[];           // words whose pictures must never share a basket
  basket: boolean;              // can be a pictured basket item
};
```

- Names: `NameEntry[]`, tier 1 first:

```ts
type NameEntry = {
  name: string;                 // 'Lily'
  key: string;                  // 'lily', the clip key
  split: { g: string; ph: string[] }[];  // [{g:'L',ph:['l']},{g:'i',ph:['i']},{g:'l',ph:['l']},{g:'y',ph:['ee']}]
  ph: string[];                 // flat phonemes
  first: string;                // first phoneme ('sh' for Charlotte)
  pic: 'flowers' | 'gems' | 'sky' | 'sweets' | null;
  tier: 1 | 2;
};
```

- Phoneme tokens (names, blocklist rules, sounds): consonants `p b t d k g f v s z sh zh h m n ng l r w y ch j th dh`, vowels `a e i o u ai ee igh oa oo uu ar or ur ow oi ear air er uh yoo`.
- Blocklist `shared/blocklist.json`: `{ "v": 1, "words": [{ "w": "fuck", "kind": "strong" | "rude" | "toilet", "lang": "en" | "nl" }] }`. Strong words are also checked as parts of longer names. "ass" and "arse" are not `strong` (so Cassidy passes). "Pom" is not on the list (open decision 5: allowed).
- Ids reused from the v2 lines keep the exact v2 text, so the generator's cache makes them free.
- Wave B and C additions to `game.content`: `phrases: Map<string, PhraseEntry>` (Task 26 types; R12, R27, R28, R29 with one Elizabeth clip per line), `asks: Map<string, AskSet>` and `twoStates: Map<string, TwoStateSet>` (Task 27 types; R33 and R37, with clips). Each served carrier for these steps is the entry id.

### C12. Art (ART, `src/art/index.ts`)

```ts
export function artUrl(id: string): string | null;  // from public/art/manifest.json, null when missing
// src/art/Unicorn.svelte props: { baby: Baby; pose?: 'stand' | 'sit' | 'sleep' | 'hop'; size?: number; label?: string }
// src/art/UnicornHead.svelte props: { baby: Baby; size?: number; nightcap?: boolean }
```

Art ids this workstream asks for: `egg-moon`, `egg-nest`, `egg-two-stone`, `egg-blanket`, `egg-berry`, `egg-snow`, `egg-golden`, `egg-speckled`, `nest`, `blanket`, `bell`, `bell-gold`, `name-tree`, `garden-flowers`, `garden-gems`, `garden-sky`, `garden-sweets`, `basket`, `station-hay`, `station-brush`, `station-hat`, `station-nap`, `station-swing`, `station-bath`, `door`, `tent`, `lantern`, `moonflower`, `sky-unicorn`, `bg-nest`, `bg-wish`, `bg-stables`, `bg-sky`, `item-brush`, `item-treat`, `item-heart`, and the `picture` of every basket word. When `artUrl` returns null the scene draws its own SVG from `Fallback.svelte`. Word pictures always exist, because the planner never serves a word without a picture (C10).

### C13. Meadow parts (MEADOW)

```ts
// src/ui/hints.svelte.ts
export interface HintRunner {
  begin(goal: { idleMs: number; step?: string; repeat: () => Promise<void>; focused: () => Promise<void>; answer: () => Promise<void> }): void;
  touch(): void;                 // ends a running hint; the touch still works
  miss(): Promise<void>;         // one miss runs the focused hint, two misses run the ghost hand answer
  readonly level: 0 | 1 | 2 | 3; // help reached in this moment: 2 only after an idle-triggered focused hint, 3 after the ghost hand (places.md D1)
  end(): void;
}
export function createHintRunner(): HintRunner;
// src/ui/ghost.svelte.ts
export const ghost: { drag(from: Element, to: Element): Promise<void>; tap(el: Element): Promise<void>; hide(): void };
// src/ui/moonbeam.svelte.ts
export const moonbeam: { show(els: Element | Element[]): void; clear(): void };
// src/ui/goal.svelte.ts  (replay button and tap on Lumi)
export const goal: { set(repeat: () => Promise<void>): void; clear(): void };
```

The plurals work adds `snd-es` (the /ɪz/ ending) to `shared/audio/phonics/`, which wish dots play for the `-es` ending.

The meadow calls `heartbeat.start()` on a tap on the nest, `heartbeat.startWish(babyId)` on a wish bubble, `heartbeat.startGoodnight()` on the moon, `heartbeat.noteOtherActivity()` when Emma starts anything that is not the heartbeat, `heartbeat.left()` when she leaves a heartbeat scene by the meadow arrow, and `heartbeat.tapBaby(id)` when she taps a baby in the meadow (true means the "moon told me a new name" moment took over). It places `<Moonflowers count={world.flowers} />`. The label shelf registers `heartbeatHooks.onMovedIn.push(fn)` to drop a found thing while S10 is open.

### C14. Building Days (BUILD)

The herd circle dispatches its own `egg.hatched` (with `source: 'building'`) and then calls `heartbeat.nameBaby(babyId, onDone)`. Row naming renders `<Naming target={{ kind: 'row', row }} onnamed={...} />` and dispatches its own `row.named` from the callback.

### C15. Moving Day (MOVE)

Imported babies arrive as world babies with `order` 1..n, names and `clipKey`. Nothing in this workstream special-cases them.

### C16. Parent corner (PARENT)

Wave C: a setting `skipWishAfterThree: boolean` (default false) readable as `game.world.settings.skipWishAfterThree`.

### C17. Sync (SYNC)

Wave C: after a refold that came from a sync or import, `game` exposes `game.refoldedAt: number` (ms), which changes on every such refold.

---

## Wave A: first playable (release items 6, 7 and 8)

Wave A must be complete, with every test and flow green, before any Wave B task starts. Wave A is Tasks 1 to 23B.

Tasks 18 to 22 import `src/scenes/heartbeat/flow.svelte.ts` and `moon-name.ts`, which Task 23 creates. Until Task 23 lands, `npm run check` reports only those two missing modules; the unit tests never import them.

### Task 1: Shared types, numbers, lines, places and moment results

**Files:**
- Create: `src/core/heartbeat/types.ts`, `src/core/heartbeat/numbers.ts`, `src/core/heartbeat/lines.ts`, `src/core/heartbeat/places.ts`, `src/core/heartbeat/result.ts`, `tools/heartbeat-lines.ts`, `content/lines/heartbeat.json` (generated)
- Modify: `package.json` (add the script `"lines:heartbeat": "node tools/heartbeat-lines.ts"`)
- Test: `tests/heartbeat/lines.test.ts`, `tests/heartbeat/places.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
// types.ts
export type Strand = 'r' | 's' | 'm' | 'name';
export type Result = 'first' | 'miss' | 'helped';
export type ErrorTag = 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
export type Scaffold = 1 | 2 | 3;
export type StepState = 'current' | 'passed' | 'placed' | 'side' | 'school' | 'waiting' | 'locked';
export type Source = 'current' | 'review' | 'mixed' | 'school' | 'probe' | 'golden' | 'side';
export type PlaceId = 'nest' | 'wish' | 'twin-wish' | 'station' | 'naming' | 'door' | 'rollcall';
export type Colours = { body: string; mane: string; mane2: string };
export type Traits = { shiny?: true; speckled?: true; golden?: true; founder?: true };
export type BreedId = 'moon' | 'nestling' | 'pebble' | 'cosy' | 'berry' | 'snow';
export type StationId = 'hay' | 'brush' | 'hat' | 'nap' | 'swing' | 'bath';
export type CareKind = 'brush' | 'cuddle' | 'treat' | 'trick' | 'splash' | 'station' | 'rollcall';
export type NameTarget = { kind: 'baby'; baby: string } | { kind: 'row'; row: number } | { kind: 'sky'; index: number };
export type NameRoute = 'bell' | 'garden-pic' | 'garden-sound' | 'gold';
export type LearnResultDraft = { type: 'learn.result'; strand: Strand; step: string; carrier: string;
  items: { id: string; result: Result }[]; result: Result; ms: number; scaffold: Scaffold; error?: ErrorTag;
  place: PlaceId; probe: boolean; source: Source; baby?: string; moment?: string; slot?: string };
// Built from LEARN's Pick by src/scenes/heartbeat/learn-bridge.ts (Task 17B); moment and slot pass through to the event.
export type Served = { strand: Strand; step: string; id: string; carrier: string; items: string[]; scaffold: Scaffold;
  probe: boolean; source: Source; twin?: string; moment?: string; slot?: string };
// The heartbeat's own views of words and names (C11 shapes). learn-bridge.ts builds them from LEARN's Content.
export type WordEntry = { word: string; gr: string[]; step: string; picture: string; clip: string; one?: string; plural?: string;
  ending?: '-s' | '-es'; pair?: string; pairTag?: 'aeu' | 'final' | 'vw' | 'jy' | 'th' | 'ch' | 'r20' | 'split-e' | 'vowel';
  station?: StationId; confuse?: string[]; basket: boolean };
export type NameEntry = { name: string; key: string; split: { g: string; ph: string[] }[]; ph: string[]; first: string;
  pic: 'flowers' | 'gems' | 'sky' | 'sweets' | null; tier: 1 | 2 };
// numbers.ts
export function numberWord(n: number): string;      // 0..999, British ("one hundred and twenty")
export function ordinalWord(n: number): string;     // 1..20
export function capitalise(s: string): string;
// lines.ts
export type LineDef = { id: string; speaker: 'narrator' | 'queen' | 'foal'; text: string; tier: 1 | 2 };
export const TIER1_COUNT_MAX = 60; export const COUNT_MAX = 120;
export const lineId: { num(n): string; over(n): string; cold(n): string; more(n): string; warm(n): string;
  bond(a, b): string; baby(n): string; visit(n): string; thatIs(n): string; doorBed(n): string;
  unicorns(n): string; sky(n): string; ordinal(n): string };
export function heartbeatLines(): LineDef[];
// places.ts
export type Wave = 'A' | 'B' | 'C';
export type PlaceDecl = { id: 'nest' | 'wish' | 'naming' | 'door' | 'rollcall-door'; strand: 'r' | 's' | 'm'; steps: string[]; wave: Wave; school: boolean };
export const HEARTBEAT_PLACES: PlaceDecl[];
export let BUILT_WAVE: Wave;                         // 'A' now; Task 24 sets 'B', Task 27 sets 'C'
export function placesUpTo(wave: Wave): PlaceDecl[];
// result.ts
export function momentResult(misses: number, hintLevel: number): Result;
```

- [ ] **Step 1: Write the failing tests**

`tests/heartbeat/lines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { heartbeatLines, lineId } from '../../src/core/heartbeat/lines.ts';
import { numberWord, ordinalWord } from '../../src/core/heartbeat/numbers.ts';
import { momentResult } from '../../src/core/heartbeat/result.ts';

describe('numberWord', () => {
  it('says British numbers', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(14)).toBe('fourteen');
    expect(numberWord(40)).toBe('forty');
    expect(numberWord(41)).toBe('forty-one');
    expect(numberWord(100)).toBe('one hundred');
    expect(numberWord(120)).toBe('one hundred and twenty');
  });
  it('rejects numbers it cannot say', () => {
    expect(() => numberWord(-1)).toThrow();
    expect(() => numberWord(1.5)).toThrow();
    expect(() => numberWord(1000)).toThrow();
  });
  it('says ordinals', () => {
    expect(ordinalWord(2)).toBe('second');
    expect(ordinalWord(12)).toBe('twelfth');
    expect(ordinalWord(20)).toBe('twentieth');
  });
});

describe('heartbeatLines', () => {
  const lines = heartbeatLines();
  const byId = new Map(lines.map((l) => [l.id, l]));
  it('has unique kebab-case ids', () => {
    expect(byId.size).toBe(lines.length);
    for (const l of lines) expect(l.id).toMatch(/^[a-z0-9-]+$/);
  });
  it('has no digits in any text', () => {
    for (const l of lines) expect(l.text).not.toMatch(/[0-9]/);
  });
  it('gives narrator-only prefixes to Elizabeth', () => {
    for (const l of lines) if (/^(word|name|num|sound)-/.test(l.id)) expect(l.speaker).toBe('narrator');
  });
  it('keeps Lumi and the babies on story ids only', () => {
    for (const l of lines.filter((x) => x.speaker !== 'narrator')) expect(l.id).toMatch(/^(lumi|foal)-/);
  });
  it('writes the key lines exactly', () => {
    expect(byId.get(lineId.baby(19))?.text).toBe('Baby number nineteen.');
    expect(byId.get(lineId.unicorns(41))?.text).toBe('Forty-one unicorns!');
    expect(byId.get(lineId.unicorns(1))?.text).toBe('One unicorn!');
    expect(byId.get(lineId.sky(1))?.text).toBe('One sky unicorn.');
    expect(byId.get(lineId.sky(4))?.text).toBe('Four sky unicorns.');
    expect(byId.get(lineId.cold(1))?.text).toBe('One cup is still cold.');
    expect(byId.get(lineId.cold(3))?.text).toBe('Three cups are still cold.');
    expect(byId.get(lineId.over(2))?.text).toBe('Two too many.');
    expect(byId.get(lineId.bond(7, 3))?.text).toBe('Seven and three make ten!');
    expect(byId.get(lineId.warm(7))?.text).toBe('Seven cups are warm already.');
    expect(byId.get(lineId.visit(14))?.text).toBe("Let's visit door fourteen.");
    expect(byId.get(lineId.thatIs(14))?.text).toBe('That is fourteen.');
    expect(byId.get(lineId.doorBed(12))?.text).toBe('Door twelve, bedtime!');
    expect(byId.get(lineId.ordinal(2))?.text).toBe('The Second!');
    expect(byId.get('fb-tricky')?.text).toBe("What a great name! It's a tricky one for me to say.");
    expect(byId.get('lumi-moon-name')?.speaker).toBe('queen');
  });
  it('keeps counts above sixty in tier 2', () => {
    expect(byId.get(lineId.baby(60))?.tier).toBe(1);
    expect(byId.get(lineId.baby(61))?.tier).toBe(2);
    expect(byId.get(lineId.unicorns(120))?.tier).toBe(2);
    expect(byId.has(lineId.baby(121))).toBe(false);
  });
});

describe('momentResult', () => {
  it('is first only with no miss and no level 2 hint', () => {
    expect(momentResult(0, 0)).toBe('first');
    expect(momentResult(0, 1)).toBe('first');
    expect(momentResult(0, 2)).toBe('helped');
    expect(momentResult(1, 2)).toBe('helped'); // a miss, then an idle focused hint
    expect(momentResult(1, 1)).toBe('miss');
    expect(momentResult(2, 3)).toBe('helped');
  });
});
```

`tests/heartbeat/places.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HEARTBEAT_PLACES, placesUpTo } from '../../src/core/heartbeat/places.ts';

describe('HEARTBEAT_PLACES', () => {
  it('serves the wave A egg steps and not the wave B ones', () => {
    const nest = placesUpTo('A').filter((p) => p.id === 'nest').flatMap((p) => p.steps);
    expect(nest).toEqual(expect.arrayContaining(['M01', 'M02', 'M05', 'M09', 'M10', 'M11', 'M12']));
    expect(nest).not.toContain('M13');
  });
  it('lets the wish serve the plural school step and the twin steps', () => {
    const wish = placesUpTo('A').filter((p) => p.id === 'wish');
    expect(wish.every((p) => p.school)).toBe(true);
    expect(wish.flatMap((p) => p.steps)).toEqual(expect.arrayContaining(['R19', 'R04D', 'R11', 'R20', 'R38']));
  });
  it('never lets naming serve a school step', () => {
    const naming = HEARTBEAT_PLACES.filter((p) => p.id === 'naming');
    expect(naming.every((p) => !p.school)).toBe(true);
    expect(naming.flatMap((p) => p.steps)).not.toContain('S10');
  });
  it('lists every step once per place id', () => {
    for (const id of ['nest', 'wish', 'naming', 'door', 'rollcall-door']) {
      const steps = HEARTBEAT_PLACES.filter((p) => p.id === id).flatMap((p) => p.steps);
      expect(new Set(steps).size).toBe(steps.length);
    }
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/heartbeat/lines.test.ts tests/heartbeat/places.test.ts`
Expected: FAIL, cannot resolve `src/core/heartbeat/lines.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/types.ts`: exactly the `types.ts` block in Interfaces above.

`src/core/heartbeat/numbers.ts`:

```ts
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth',
  'nineteenth', 'twentieth'];

export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError(`numberWord: ${n}`);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  const rest = n % 100;
  return ONES[Math.floor(n / 100)] + ' hundred' + (rest ? ' and ' + numberWord(rest) : '');
}

export function ordinalWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new RangeError(`ordinalWord: ${n}`);
  return ORDINALS[n];
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

`src/core/heartbeat/result.ts`:

```ts
import type { Result } from './types.ts';

// Spec 3.3 as read in places.md D1: level 2 here means an idle-triggered focused hint; level 3 is the ghost hand.
// An answer after either is helped. A miss followed by a right answer stays a miss.
export function momentResult(misses: number, hintLevel: number): Result {
  if (hintLevel >= 2) return 'helped';
  return misses > 0 ? 'miss' : 'first';
}
```

`src/core/heartbeat/lines.ts` (texts marked v2 are copied exactly from `ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json`, so the generator cache makes them free):

```ts
import { capitalise, numberWord, ordinalWord } from './numbers.ts';

export type LineDef = { id: string; speaker: 'narrator' | 'queen' | 'foal'; text: string; tier: 1 | 2 };
export const TIER1_COUNT_MAX = 60;
export const COUNT_MAX = 120;

export const lineId = {
  num: (n: number) => `num-${n}`,
  over: (n: number) => `num-over-${n}`,
  cold: (n: number) => `num-cold-${n}`,
  more: (n: number) => `num-more-${n}`,
  warm: (n: number) => `num-warm-${n}`,
  bond: (a: number, b: number) => `num-bond-${a}-${b}`,
  baby: (n: number) => `num-baby-${n}`,
  visit: (n: number) => `num-visit-${n}`,
  thatIs: (n: number) => `num-that-is-${n}`,
  doorBed: (n: number) => `num-door-bed-${n}`,
  unicorns: (n: number) => `num-unicorns-${n}`,
  sky: (n: number) => `num-sky-${n}`,
  ordinal: (n: number) => `name-ordinal-${n}`,
};

const FIXED: LineDef[] = [
  // Nest (v2 unless noted)
  { id: 'g-egg', speaker: 'narrator', text: 'Make every cup warm, and the egg will hatch.', tier: 1 },
  { id: 'g-stone', speaker: 'narrator', text: 'Drag one stone to the nest.', tier: 1 },
  { id: 'g-two-stones', speaker: 'narrator', text: 'This egg needs two stones. Together they make every cup warm.', tier: 1 },
  { id: 'g-one-more', speaker: 'narrator', text: 'Now one more stone.', tier: 1 },
  { id: 'g-blanket', speaker: 'narrator', text: 'The blanket hides the cups.', tier: 1 },
  { id: 'g-stars', speaker: 'narrator', text: 'Look at the stars on the egg. Then drag the stone that matches.', tier: 1 }, // new
  { id: 'g-count-stars', speaker: 'narrator', text: 'Count the stars on the egg. Then drag the stone that matches.', tier: 1 }, // new
  { id: 'fb-warm', speaker: 'narrator', text: 'Every cup is warm!', tier: 1 },
  { id: 'fb-hot', speaker: 'narrator', text: 'Too hot!', tier: 1 },
  { id: 'fb-brr', speaker: 'narrator', text: 'Brr!', tier: 1 },
  { id: 'fb-too-many', speaker: 'narrator', text: 'Too many!', tier: 1 }, // new
  { id: 'fb-lovely', speaker: 'narrator', text: 'Lovely!', tier: 1 },
  { id: 'h-count', speaker: 'narrator', text: "Let's count the cold cups.", tier: 1 },
  { id: 'h-peek', speaker: 'narrator', text: "Let's peek under the blanket.", tier: 1 },
  { id: 'h-stars', speaker: 'narrator', text: "Let's count the stars.", tier: 1 }, // new
  // Hatch (v2)
  { id: 'lumi-hatching', speaker: 'queen', text: "It's hatching!", tier: 1 },
  { id: 'lumi-baby', speaker: 'queen', text: 'A baby unicorn! Hello, little one.', tier: 1 },
  { id: 'lumi-sparkly', speaker: 'queen', text: 'Ooh, a sparkly one!', tier: 1 },
  // Naming (v2 unless noted)
  { id: 'g-bells', speaker: 'narrator', text: 'Your baby needs a name! Tap a bell to hear a name.', tier: 1 },
  { id: 'g-bell-drag', speaker: 'narrator', text: 'Drag the name you like to your baby.', tier: 1 },
  { id: 'g-spell', speaker: 'narrator', text: "Let's write the name on the tag. Listen.", tier: 1 },
  { id: 'g-gems', speaker: 'narrator', text: 'Put the gems in the slots.', tier: 1 },
  { id: 'g-slide', speaker: 'narrator', text: 'Now slide the star, and listen.', tier: 1 },
  { id: 'fb-spelled', speaker: 'narrator', text: "You wrote your baby's name!", tier: 1 },
  { id: 'g-gold', speaker: 'narrator', text: 'Make any name you like!', tier: 1 },
  { id: 'fb-gold-yes', speaker: 'narrator', text: 'What a lovely name!', tier: 1 },
  { id: 'fb-tricky', speaker: 'narrator', text: "What a great name! It's a tricky one for me to say.", tier: 1 },
  { id: 'fb-no-vowel', speaker: 'narrator', text: 'Every name needs a pink gem!', tier: 1 }, // new
  { id: 'fb-silly', speaker: 'narrator', text: "That's a silly name! Try other gems.", tier: 1 }, // new
  { id: 'fb-that-says', speaker: 'narrator', text: 'That says.', tier: 1 }, // new, followed by her gem sounds
  { id: 'g-listen', speaker: 'narrator', text: 'Listen.', tier: 1 }, // new, followed by the name clip
  { id: 'g-garden', speaker: 'narrator', text: 'Tap a picture, and hear the names.', tier: 1 }, // new
  { id: 'g-first-sound', speaker: 'narrator', text: 'Tap a gem, and hear names that start with its sound.', tier: 1 }, // new
  { id: 'g-plus', speaker: 'narrator', text: 'Tap the plus to add a gem slot.', tier: 1 }, // new
  { id: 'g-sky-name', speaker: 'narrator', text: 'Ten stars make a sky unicorn! Give it a name.', tier: 1 }, // new
  { id: 'lumi-moon-name', speaker: 'queen', text: 'The moon told me a new name!', tier: 1 }, // new
  // Wish (v2 unless noted)
  { id: 'g-wish', speaker: 'narrator', text: 'Your baby has a wish!', tier: 1 }, // new
  { id: 'h-sounds', speaker: 'narrator', text: 'Listen to the sounds.', tier: 1 },
  { id: 'fb-letters', speaker: 'narrator', text: 'Look at the letters again.', tier: 1 },
  { id: 'fb-more-than-one', speaker: 'narrator', text: 'More than one.', tier: 1 }, // new, shared with plural labels
  { id: 'fb-just-one', speaker: 'narrator', text: 'Just one.', tier: 1 }, // new, shared with plural labels
  // Stalls and goodnight
  { id: 'g-tent', speaker: 'narrator', text: 'A cosy tent for now! Your new stable row is coming.', tier: 1 }, // new
  { id: 'g-rollcall', speaker: 'narrator', text: "Bedtime! Look at the lantern, and tap that baby's door.", tier: 1 }, // new
  { id: 'lumi-night', speaker: 'queen', text: 'Night night, little one.', tier: 1 },
  { id: 'lumi-goodnight-emma', speaker: 'queen', text: 'Goodnight, Emma.', tier: 1 }, // new
  // Babies (v2)
  { id: 'foal-hello', speaker: 'foal', text: '[giggles] Hello!', tier: 1 },
  { id: 'foal-yay', speaker: 'foal', text: '[excited] Yay! Thank you!', tier: 1 },
  { id: 'foal-silly', speaker: 'foal', text: '[giggles] Silly!', tier: 1 },
  { id: 'foal-notme', speaker: 'foal', text: '[giggles] Not me!', tier: 1 },
  { id: 'foal-wee', speaker: 'foal', text: 'Wheee!', tier: 1 },
  { id: 'foal-yum', speaker: 'foal', text: 'Mmm! Yummy!', tier: 1 },
  { id: 'foal-cuddle', speaker: 'foal', text: '[happy sigh] Aww.', tier: 1 },
  { id: 'foal-yawn', speaker: 'foal', text: '[yawns] Sleepy.', tier: 1 },
];

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

export function heartbeatLines(): LineDef[] {
  const lines: LineDef[] = [...FIXED];
  const W = (n: number) => capitalise(numberWord(n));
  const nar = (id: string, text: string, tier: 1 | 2 = 1) => lines.push({ id, speaker: 'narrator', text, tier });
  const countTier = (n: number): 1 | 2 => (n <= TIER1_COUNT_MAX ? 1 : 2);
  range(1, 20).forEach((n) => nar(lineId.num(n), `${W(n)}.`));
  range(1, 9).forEach((n) => nar(lineId.over(n), `${W(n)} too many.`));
  range(1, 9).forEach((n) => nar(lineId.cold(n), n === 1 ? 'One cup is still cold.' : `${W(n)} cups are still cold.`));
  range(1, 9).forEach((n) => nar(lineId.more(n), `${W(n)} more, please.`));
  range(1, 10).forEach((n) => nar(lineId.warm(n), n === 1 ? 'One cup is warm already.' : `${W(n)} cups are warm already.`));
  range(1, 9).forEach((a) => nar(lineId.bond(a, 10 - a), `${W(a)} and ${numberWord(10 - a)} make ten!`));
  range(1, COUNT_MAX).forEach((n) => nar(lineId.baby(n), `Baby number ${numberWord(n)}.`, countTier(n)));
  range(1, 20).forEach((n) => nar(lineId.visit(n), `Let's visit door ${numberWord(n)}.`));
  range(1, 20).forEach((n) => nar(lineId.thatIs(n), `That is ${numberWord(n)}.`));
  range(11, 20).forEach((n) => nar(lineId.doorBed(n), `Door ${numberWord(n)}, bedtime!`));
  range(1, COUNT_MAX).forEach((n) => nar(lineId.unicorns(n), n === 1 ? 'One unicorn!' : `${W(n)} unicorns!`, countTier(n)));
  range(1, 12).forEach((n) => nar(lineId.sky(n), n === 1 ? 'One sky unicorn.' : `${W(n)} sky unicorns.`));
  range(2, 20).forEach((n) => nar(lineId.ordinal(n), `The ${capitalise(ordinalWord(n))}!`));
  return lines;
}
```

`src/core/heartbeat/places.ts`:

```ts
export type Wave = 'A' | 'B' | 'C';
export type PlaceDecl = { id: 'nest' | 'wish' | 'naming' | 'door' | 'rollcall-door'; strand: 'r' | 's' | 'm'; steps: string[]; wave: Wave; school: boolean };

const WISH_A = ['R01', 'R02', 'R03', 'R04', 'R05', 'R07', 'R08', 'R09', 'R10', 'R13', 'R14', 'R15', 'R16', 'R17',
  'R18', 'R19', 'R21', 'R22', 'R23', 'R24', 'R26', 'R30', 'R32', 'R34', 'R36', 'R39', 'R41',
  'R04D', 'R11', 'R20', 'R38'];
const NAMING_A = ['S01', 'S02', 'S03', 'S04', 'S05', 'S07', 'S09', 'S11', 'S12', 'S13', 'S14', 'S20', 'S22',
  'S24', 'S26', 'S28', 'S29', 'S30'];

export const HEARTBEAT_PLACES: PlaceDecl[] = [
  { id: 'nest', strand: 'm', steps: ['M01', 'M02', 'M05', 'M09', 'M10', 'M11', 'M12'], wave: 'A', school: false },
  { id: 'nest', strand: 'm', steps: ['M04', 'M13', 'M14'], wave: 'B', school: false },
  { id: 'wish', strand: 'r', steps: WISH_A, wave: 'A', school: true },
  { id: 'wish', strand: 'r', steps: ['R12', 'R27', 'R28', 'R29'], wave: 'B', school: true },
  { id: 'wish', strand: 'r', steps: ['R33', 'R37'], wave: 'C', school: true },
  { id: 'naming', strand: 's', steps: NAMING_A, wave: 'A', school: false },
  { id: 'door', strand: 'm', steps: ['M02', 'M07'], wave: 'A', school: false },
  { id: 'rollcall-door', strand: 'm', steps: ['M07'], wave: 'A', school: false },
];

export let BUILT_WAVE: Wave = 'A';

const ORDER: Record<Wave, number> = { A: 0, B: 1, C: 2 };
export function placesUpTo(wave: Wave): PlaceDecl[] {
  return HEARTBEAT_PLACES.filter((p) => ORDER[p.wave] <= ORDER[wave]);
}
```

R06 and R25 are display-only tricky-word steps (spec 3.9) and are not listed. S03D, S06 and S10 are served by label bubbles (MEADOW), not by naming.

`tools/heartbeat-lines.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heartbeatLines } from '../src/core/heartbeat/lines.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'content/lines/heartbeat.json');
const lines = heartbeatLines();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ lines }, null, 2) + '\n');
const credits = (tier: 1 | 2) =>
  lines.filter((l) => l.tier === tier).reduce((n, l) => n + l.text.length * (l.speaker === 'foal' ? 2 : 1), 0);
console.log(`${lines.length} lines. Tier 1 about ${credits(1)} credits, tier 2 about ${credits(2)}, before cache hits.`);
```

- [ ] **Step 4: Run the tests and the generator**

Run: `npx vitest run tests/heartbeat/lines.test.ts tests/heartbeat/places.test.ts`
Expected: PASS.
Run: `npm run lines:heartbeat`
Expected: prints the line count and a tier 1 estimate between 5,000 and 8,000 credits (before cache hits on the v2 texts); `content/lines/heartbeat.json` exists.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/types.ts src/core/heartbeat/numbers.ts src/core/heartbeat/lines.ts src/core/heartbeat/places.ts src/core/heartbeat/result.ts tools/heartbeat-lines.ts content/lines/heartbeat.json package.json tests/heartbeat/lines.test.ts tests/heartbeat/places.test.ts
git commit -m "Add heartbeat types, number words, audio lines and place declarations"
```

**Acceptance:** tests pass; `content/lines/heartbeat.json` is valid input for `scripts/generate-audio.py --dry-run` (extra `tier` fields are ignored by the script).

---

### Task 2: Egg kinds and egg tasks

**Files:**
- Create: `src/core/maths/eggs.ts`
- Test: `tests/heartbeat/eggs.test.ts`

**Interfaces:**
- Consumes: `Served`, `Scaffold`, `ErrorTag` (Task 1); `lineId` (Task 1).
- Produces:

```ts
export type EggKind = 'moon' | 'small-nest' | 'two-stone' | 'blanket' | 'berry' | 'snow';
export type EggMode = 'stars-flash' | 'stars' | 'cups' | 'two-stone' | 'blanket' | 'berry-more-less' | 'berry-bowls' | 'snow';
export type MathsItem = { op: 'subitise'; n: number } | { op: 'numeral'; n: number } | { op: 'add'; a: number; b: number } | { op: 'take'; a: number; b: number };
export type EggTask = { kind: EggKind; mode: EggMode; step: string; itemId: string; scaffold: Scaffold;
  cups: number; warm: number; shown: number; bowls: [number, number] | null; moreLess: 1 | -1 | null;
  target: number; stonesNeeded: 1 | 2 };
export const EGG_STEPS: Record<string, EggKind>;
export function eggKindFor(step: string): EggKind | null;
export function parseMathsItem(id: string): MathsItem;
export function buildEggTask(served: Served): EggTask;            // throws on a step or item it cannot serve
export function maxStone(task: EggTask): number;
export function judgeStones(task: EggTask, values: number[]): { ok: boolean; diff: number; error?: ErrorTag };
export function goalLines(task: EggTask, firstEver: boolean): string[];
export function missLines(task: EggTask, diff: number): string[];
export function successLines(task: EggTask, values: number[]): string[];
export function focusedHintLines(task: EggTask, placed: number[]): string[];
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/eggs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildEggTask, eggKindFor, focusedHintLines, goalLines, judgeStones, missLines, parseMathsItem, successLines } from '../../src/core/maths/eggs.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';

const served = (step: string, id: string, scaffold: 1 | 2 | 3 = 1): Served =>
  ({ strand: 'm', step, id, carrier: '', items: [id], scaffold, probe: false, source: 'current' });

describe('parseMathsItem', () => {
  it('reads every item form', () => {
    expect(parseMathsItem('sub:4')).toEqual({ op: 'subitise', n: 4 });
    expect(parseMathsItem('num:14')).toEqual({ op: 'numeral', n: 14 });
    expect(parseMathsItem('3+7')).toEqual({ op: 'add', a: 3, b: 7 });
    expect(parseMathsItem('8-3')).toEqual({ op: 'take', a: 8, b: 3 });
    expect(() => parseMathsItem('seven')).toThrow();
  });
});

describe('buildEggTask', () => {
  it('maps steps to egg kinds', () => {
    expect(eggKindFor('M10')).toBe('two-stone');
    expect(eggKindFor('M03')).toBeNull();
  });
  it('builds a moon egg for M01 and M02', () => {
    expect(buildEggTask(served('M01', 'sub:4'))).toMatchObject({ kind: 'moon', mode: 'stars-flash', shown: 4, target: 4, stonesNeeded: 1 });
    expect(buildEggTask(served('M02', 'num:7'))).toMatchObject({ kind: 'moon', mode: 'stars', shown: 7, target: 7 });
  });
  it('builds cup eggs', () => {
    expect(buildEggTask(served('M09', '3+7'))).toMatchObject({ kind: 'moon', mode: 'cups', cups: 10, warm: 3, target: 7 });
    expect(buildEggTask(served('M05', '2+3'))).toMatchObject({ kind: 'small-nest', mode: 'cups', cups: 5, warm: 2, target: 3 });
    expect(buildEggTask(served('M12', '4+3'))).toMatchObject({ kind: 'small-nest', mode: 'cups', cups: 7, warm: 4, target: 3 });
    expect(buildEggTask(served('M11', '6+4'))).toMatchObject({ kind: 'blanket', mode: 'blanket', cups: 10, warm: 6, target: 4 });
  });
  it('builds a two-stone egg that needs a pair to ten', () => {
    expect(buildEggTask(served('M10', '3+7'))).toMatchObject({ kind: 'two-stone', mode: 'two-stone', cups: 10, warm: 0, target: 10, stonesNeeded: 2 });
  });
  it('refuses an item that does not fit the step', () => {
    expect(() => buildEggTask(served('M01', '3+7'))).toThrow();
    expect(() => buildEggTask(served('M03', 'num:3'))).toThrow();
  });
});

describe('judging and lines', () => {
  const cups = buildEggTask(served('M09', '3+7'));
  const two = buildEggTask(served('M10', '3+7'));
  const stars = buildEggTask(served('M02', 'num:4'));
  const blanket = buildEggTask(served('M11', '6+4'));
  it('judges single and paired stones', () => {
    expect(judgeStones(cups, [7])).toEqual({ ok: true, diff: 0 });
    expect(judgeStones(cups, [8])).toEqual({ ok: false, diff: 1, error: 'off-by-one' });
    expect(judgeStones(cups, [4])).toEqual({ ok: false, diff: -3, error: 'other' });
    expect(judgeStones(two, [4, 6])).toEqual({ ok: true, diff: 0 });
    expect(judgeStones(two, [3, 6])).toEqual({ ok: false, diff: -1, error: 'off-by-one' });
  });
  it('picks the mistake lines by mode and size', () => {
    expect(missLines(cups, 2)).toEqual(['fb-hot', 'num-over-2']);
    expect(missLines(cups, -3)).toEqual(['fb-brr', 'num-cold-3']);
    expect(missLines(stars, 1)).toEqual(['fb-too-many', 'num-over-1']);
    expect(missLines(stars, -2)).toEqual(['num-more-2']);
    expect(missLines(cups, 12)).toEqual(['fb-hot', 'num-over-9']);
  });
  it('says the goal once, with the blanket count', () => {
    expect(goalLines(blanket, false)).toEqual(['g-blanket', 'num-warm-6', 'g-egg']);
    expect(goalLines(cups, true)).toEqual(['g-egg', 'g-stone']);
    expect(goalLines(two, false)).toEqual(['g-two-stones']);
    expect(goalLines(stars, false)).toEqual(['g-count-stars']);
  });
  it('says the bond after a full ten', () => {
    expect(successLines(two, [4, 6])).toEqual(['fb-warm', 'num-bond-4-6']);
    expect(successLines(cups, [7])).toEqual(['fb-warm', 'num-bond-3-7']);
    expect(successLines(buildEggTask(served('M05', '2+3')), [3])).toEqual(['fb-warm']);
    expect(successLines(stars, [4])).toEqual(['fb-lovely', 'num-4']);
  });
  it('counts the cold cups or the stars in the focused hint', () => {
    expect(focusedHintLines(cups, [])).toEqual(['h-count', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7']);
    expect(focusedHintLines(two, [3])).toEqual(['h-count', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7']);
    expect(focusedHintLines(blanket, [])).toEqual(['h-peek', 'h-count', 'num-1', 'num-2', 'num-3', 'num-4']);
    expect(focusedHintLines(stars, [])).toEqual(['h-stars', 'num-1', 'num-2', 'num-3', 'num-4']);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/eggs.test.ts`
Expected: FAIL, cannot resolve `src/core/maths/eggs.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/maths/eggs.ts`:

```ts
import type { ErrorTag, Scaffold, Served } from '../heartbeat/types.ts';
import { lineId } from '../heartbeat/lines.ts';

export type EggKind = 'moon' | 'small-nest' | 'two-stone' | 'blanket' | 'berry' | 'snow';
export type EggMode = 'stars-flash' | 'stars' | 'cups' | 'two-stone' | 'blanket' | 'berry-more-less' | 'berry-bowls' | 'snow';
export type MathsItem =
  | { op: 'subitise'; n: number }
  | { op: 'numeral'; n: number }
  | { op: 'add'; a: number; b: number }
  | { op: 'take'; a: number; b: number };
export type EggTask = {
  kind: EggKind; mode: EggMode; step: string; itemId: string; scaffold: Scaffold;
  cups: number;                      // cups drawn in the nest, 0 when the egg has none
  warm: number;                      // cups already warm
  shown: number;                     // stars on the shell, or berries in the bowls
  bowls: [number, number] | null;
  moreLess: 1 | -1 | null;
  target: number;                    // the stone value that solves it; the pair sum for two-stone
  stonesNeeded: 1 | 2;
};

export const EGG_STEPS: Record<string, EggKind> = {
  M01: 'moon', M02: 'moon', M09: 'moon', M05: 'small-nest', M12: 'small-nest', M10: 'two-stone', M11: 'blanket',
  M04: 'berry', M13: 'berry', M14: 'snow',
};

export function eggKindFor(step: string): EggKind | null {
  return EGG_STEPS[step] ?? null;
}

export function parseMathsItem(id: string): MathsItem {
  let m = /^sub:(\d+)$/.exec(id);
  if (m) return { op: 'subitise', n: Number(m[1]) };
  m = /^num:(\d+)$/.exec(id);
  if (m) return { op: 'numeral', n: Number(m[1]) };
  m = /^(\d+)\+(\d+)$/.exec(id);
  if (m) return { op: 'add', a: Number(m[1]), b: Number(m[2]) };
  m = /^(\d+)-(\d+)$/.exec(id);
  if (m) return { op: 'take', a: Number(m[1]), b: Number(m[2]) };
  throw new Error(`Unknown maths item: ${id}`);
}

export function buildEggTask(served: Served): EggTask {
  const kind = eggKindFor(served.step);
  if (!kind) throw new Error(`No egg kind for ${served.step}`);
  const it = parseMathsItem(served.id);
  const base = { kind, step: served.step, itemId: served.id, scaffold: served.scaffold, cups: 0, warm: 0, shown: 0,
    bowls: null, moreLess: null, stonesNeeded: 1 as const };
  switch (served.step) {
    case 'M01': if (it.op === 'subitise') return { ...base, mode: 'stars-flash', shown: it.n, target: it.n }; break;
    case 'M02': if (it.op === 'numeral') return { ...base, mode: 'stars', shown: it.n, target: it.n }; break;
    case 'M09': if (it.op === 'add') return { ...base, mode: 'cups', cups: 10, warm: it.a, target: it.b }; break;
    case 'M05':
    case 'M12': if (it.op === 'add') return { ...base, mode: 'cups', cups: it.a + it.b, warm: it.a, target: it.b }; break;
    case 'M10': if (it.op === 'add') return { ...base, mode: 'two-stone', cups: 10, target: 10, stonesNeeded: 2 }; break;
    case 'M11': if (it.op === 'add') return { ...base, mode: 'blanket', cups: 10, warm: it.a, target: it.b }; break;
  }
  throw new Error(`Item ${served.id} does not fit ${served.step}`);
}

export function maxStone(task: EggTask): number {
  switch (task.mode) {
    case 'stars-flash': return 6;
    case 'stars': case 'berry-more-less': case 'berry-bowls': return 10;
    case 'snow': return Math.min(9, task.warm);
    default: return Math.min(9, task.cups);
  }
}

export function judgeStones(task: EggTask, values: number[]): { ok: boolean; diff: number; error?: ErrorTag } {
  const total = task.stonesNeeded === 2 ? values.reduce((a, b) => a + b, 0) : values[0];
  const diff = total - task.target;
  if (diff === 0) return { ok: true, diff };
  return { ok: false, diff, error: Math.abs(diff) === 1 ? 'off-by-one' : 'other' };
}

const CUP_MODES: EggMode[] = ['cups', 'two-stone', 'blanket'];

export function goalLines(task: EggTask, firstEver: boolean): string[] {
  switch (task.mode) {
    case 'stars-flash': return ['g-stars'];
    case 'stars': return ['g-count-stars'];
    case 'cups': return firstEver ? ['g-egg', 'g-stone'] : ['g-egg'];
    case 'two-stone': return ['g-two-stones'];
    case 'blanket': return ['g-blanket', lineId.warm(task.warm), 'g-egg'];
    default: throw new Error(`No goal lines for ${task.mode}`); // Wave B adds berry and snow
  }
}

export function missLines(task: EggTask, diff: number): string[] {
  const n = Math.min(9, Math.abs(diff));
  if (CUP_MODES.includes(task.mode)) return diff > 0 ? ['fb-hot', lineId.over(n)] : ['fb-brr', lineId.cold(n)];
  if (task.mode === 'snow') return diff > 0 ? ['fb-brr', lineId.over(n)] : ['fb-hot', lineId.more(n)];
  return diff > 0 ? ['fb-too-many', lineId.over(n)] : [lineId.more(n)];
}

export function successLines(task: EggTask, values: number[]): string[] {
  if (task.mode === 'two-stone') return ['fb-warm', lineId.bond(values[0], values[1])];
  if ((task.mode === 'cups' && task.cups === 10) || task.mode === 'blanket') return ['fb-warm', lineId.bond(task.warm, task.target)];
  if (task.mode === 'cups') return ['fb-warm'];
  return ['fb-lovely', lineId.num(task.target)];
}

function counting(n: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(lineId.num(i));
  return out;
}

export function focusedHintLines(task: EggTask, placed: number[]): string[] {
  const sum = placed.reduce((a, b) => a + b, 0);
  switch (task.mode) {
    case 'cups': return ['h-count', ...counting(task.cups - task.warm)];
    case 'two-stone': return ['h-count', ...counting(task.target - sum)];
    case 'blanket': return ['h-peek', 'h-count', ...counting(task.cups - task.warm)];
    case 'stars-flash':
    case 'stars': return ['h-stars', ...counting(task.shown)];
    default: throw new Error(`No hint lines for ${task.mode}`); // Wave B adds berry and snow
  }
}
```

`num-bond-a-b` exists only for pairs to ten (Task 1), which is why `successLines` says it only for ten-cup eggs.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/eggs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/maths/eggs.ts tests/heartbeat/eggs.test.ts
git commit -m "Add egg kinds and egg tasks for the moon, small nest, two-stone and blanket eggs"
```

**Acceptance:** every wave A egg step builds a task; every line id the functions return exists in `heartbeatLines()` (checked again in Task 18).

---

### Task 3: Answer stones

**Files:**
- Create: `src/core/maths/stones.ts`
- Test: `tests/heartbeat/stones.test.ts`

**Interfaces:**
- Consumes: `EggTask`, `parseMathsItem`, `maxStone` (Task 2); `Rng`, `shuffle`, `makeRng` (C2).
- Produces:

```ts
export type StoneFace = 'dots' | 'dots-numeral' | 'numeral';
export type StoneSpec = { id: string; value: number; face: StoneFace; layout: 'dice' | 'scatter'; tint: number };
export function stoneFace(task: EggTask): StoneFace;
export function planStones(task: EggTask, rng: Rng): StoneSpec[];
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/stones.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { planStones, stoneFace } from '../../src/core/maths/stones.ts';
import { buildEggTask } from '../../src/core/maths/eggs.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';

const task = (step: string, id: string, scaffold: 1 | 2 | 3 = 1) =>
  buildEggTask({ strand: 'm', step, id, carrier: '', items: [id], scaffold, probe: false, source: 'current' } as Served);

describe('stoneFace', () => {
  it('follows the maths scaffold, and subitising always shows dots', () => {
    expect(stoneFace(task('M09', '3+7', 1))).toBe('dots');
    expect(stoneFace(task('M09', '3+7', 2))).toBe('dots-numeral');
    expect(stoneFace(task('M09', '3+7', 3))).toBe('numeral');
    expect(stoneFace(task('M01', 'sub:3', 3))).toBe('dots');
  });
});

describe('planStones', () => {
  it('gives 3, 4 or 5 different stones with the answer among them', () => {
    for (const [sc, size] of [[1, 3], [2, 4], [3, 5]] as const) {
      for (let seed = 1; seed <= 50; seed++) {
        const t = task('M09', '3+7', sc);
        const s = planStones(t, makeRng(seed));
        expect(s).toHaveLength(size);
        expect(s.map((x) => x.value)).toContain(7);
        expect(new Set(s.map((x) => x.value)).size).toBe(size);
        for (const x of s) expect(x.value).toBeGreaterThanOrEqual(1);
        for (const x of s) expect(x.value).toBeLessThanOrEqual(9);
      }
    }
  });
  it('keeps small nest stones inside the nest size', () => {
    const s = planStones(task('M05', '2+3', 3), makeRng(3));
    expect(s.map((x) => x.value).sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('uses dice up to six and a scatter above', () => {
    const s = planStones(task('M02', 'num:9', 1), makeRng(4));
    for (const x of s) expect(x.layout).toBe(x.value <= 6 ? 'dice' : 'scatter');
  });
  it('gives two-stone eggs three pairs to ten, including the served pair', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = planStones(task('M10', '3+7'), makeRng(seed)).map((x) => x.value);
      expect(s).toHaveLength(6);
      expect(s).toContain(3);
      expect(s).toContain(7);
      const counts = new Map<number, number>();
      for (const v of s) counts.set(v, (counts.get(v) ?? 0) + 1);
      for (const v of s) expect(counts.get(10 - v)).toBeGreaterThanOrEqual(v === 5 ? 2 : 1);
    }
  });
  it('gives two fives when the served pair is five and five', () => {
    const s = planStones(task('M10', '5+5'), makeRng(9)).map((x) => x.value);
    expect(s.filter((v) => v === 5)).toHaveLength(2);
  });
  it('is deterministic for a seed', () => {
    expect(planStones(task('M09', '4+6', 2), makeRng(5))).toEqual(planStones(task('M09', '4+6', 2), makeRng(5)));
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/stones.test.ts`
Expected: FAIL, cannot resolve `src/core/maths/stones.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/maths/stones.ts`:

```ts
import { type Rng, shuffle } from '../rng.ts';
import { type EggTask, maxStone, parseMathsItem } from './eggs.ts';

export type StoneFace = 'dots' | 'dots-numeral' | 'numeral';
export type StoneSpec = { id: string; value: number; face: StoneFace; layout: 'dice' | 'scatter'; tint: number };

export function stoneFace(task: EggTask): StoneFace {
  if (task.mode === 'stars-flash') return 'dots';
  return task.scaffold === 1 ? 'dots' : task.scaffold === 2 ? 'dots-numeral' : 'numeral';
}

export function planStones(task: EggTask, rng: Rng): StoneSpec[] {
  const face = stoneFace(task);
  // Stones show dice dots or a loose scatter, never a ten-frame layout (spec 2.6).
  const make = (value: number, i: number): StoneSpec =>
    ({ id: `stone-${i}`, value, face, layout: value <= 6 ? 'dice' : 'scatter', tint: i % 7 });

  if (task.stonesNeeded === 2) {
    const it = parseMathsItem(task.itemId);
    if (it.op !== 'add') throw new Error(`Two-stone item must be a sum: ${task.itemId}`);
    const pairs: [number, number][] = [[it.a, it.b]];
    for (const p of shuffle<[number, number]>([[1, 9], [2, 8], [3, 7], [4, 6]], rng)) {
      if (pairs.length >= 3) break;
      if (!pairs.some((q) => q.includes(p[0]) || q.includes(p[1]))) pairs.push(p);
    }
    return shuffle(pairs.flat(), rng).map(make);
  }

  const max = maxStone(task);
  const size = task.scaffold === 1 ? 3 : task.scaffold === 2 ? 4 : 5;
  const opts: number[] = [task.target];
  const add = (v: number) => {
    if (opts.length < size && v >= 1 && v <= max && !opts.includes(v)) opts.push(v);
  };
  add(task.target + 1);
  add(task.target - 1);
  if (task.warm) add(task.warm);
  for (const d of [2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) add(task.target + d);
  return shuffle(opts, rng).map(make);
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/stones.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/maths/stones.ts tests/heartbeat/stones.test.ts
git commit -m "Add answer stone planning with dice and scatter faces"
```

**Acceptance:** tests pass; with the small nest of five, no stone is larger than the nest.

---

### Task 4: Hatching, breeds and traits

**Files:**
- Create: `src/core/heartbeat/hatch.ts`
- Test: `tests/heartbeat/hatch.test.ts`

**Interfaces:**
- Consumes: `EggKind` (Task 2), `Result`, `Colours`, `Traits`, `BreedId` (Task 1), `Rng`, `pick`, `makeRng` (C2).
- Produces:

```ts
export const BREED_OF: Record<EggKind, BreedId>;
export const BODY: string[]; export const MANE: string[]; export const GOLDEN_BODY: string;
export type HatchRoll = { breed: BreedId; colours: Colours; traits: Traits };
export function rollHatch(input: { kind: EggKind; result: Result; golden: boolean; speckled: boolean; rng: Rng }): HatchRoll;
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/hatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BODY, BREED_OF, GOLDEN_BODY, MANE, rollHatch } from '../../src/core/heartbeat/hatch.ts';
import { makeRng } from '../../src/core/rng.ts';

describe('rollHatch', () => {
  it('maps each egg kind to its breed', () => {
    expect(BREED_OF).toEqual({ moon: 'moon', 'small-nest': 'nestling', 'two-stone': 'pebble', blanket: 'cosy', berry: 'berry', snow: 'snow' });
  });
  it('uses the palettes and never repeats the mane colour', () => {
    const rng = makeRng(1);
    for (let i = 0; i < 200; i++) {
      const r = rollHatch({ kind: 'small-nest', result: 'miss', golden: false, speckled: false, rng });
      expect(BODY).toContain(r.colours.body);
      expect(MANE).toContain(r.colours.mane);
      expect(r.colours.mane2).not.toBe(r.colours.mane);
    }
  });
  it('gives a shiny baby about one in three first tries, never after a miss or help', () => {
    const rng = makeRng(2);
    let shiny = 0;
    for (let i = 0; i < 3000; i++) if (rollHatch({ kind: 'moon', result: 'first', golden: false, speckled: false, rng }).traits.shiny) shiny++;
    expect(shiny / 3000).toBeGreaterThan(0.29);
    expect(shiny / 3000).toBeLessThan(0.38);
    for (let i = 0; i < 300; i++) {
      expect(rollHatch({ kind: 'moon', result: 'miss', golden: false, speckled: false, rng }).traits.shiny).toBeUndefined();
      expect(rollHatch({ kind: 'moon', result: 'helped', golden: false, speckled: false, rng }).traits.shiny).toBeUndefined();
    }
  });
  it('gives golden and speckled coats from those eggs', () => {
    const g = rollHatch({ kind: 'blanket', result: 'miss', golden: true, speckled: false, rng: makeRng(3) });
    expect(g.colours.body).toBe(GOLDEN_BODY);
    expect(g.traits.golden).toBe(true);
    const s = rollHatch({ kind: 'blanket', result: 'miss', golden: false, speckled: true, rng: makeRng(3) });
    expect(s.traits.speckled).toBe(true);
    expect(s.traits.golden).toBeUndefined();
  });
  it('is deterministic for a seed', () => {
    const a = rollHatch({ kind: 'two-stone', result: 'first', golden: false, speckled: false, rng: makeRng(9) });
    const b = rollHatch({ kind: 'two-stone', result: 'first', golden: false, speckled: false, rng: makeRng(9) });
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/hatch.test.ts`
Expected: FAIL, cannot resolve `src/core/heartbeat/hatch.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/hatch.ts`:

```ts
import { type Rng, pick } from '../rng.ts';
import type { EggKind } from '../maths/eggs.ts';
import type { BreedId, Colours, Result, Traits } from './types.ts';

export const BREED_OF: Record<EggKind, BreedId> = {
  moon: 'moon', 'small-nest': 'nestling', 'two-stone': 'pebble', blanket: 'cosy', berry: 'berry', snow: 'snow',
};
// Pastel bodies and saturated manes, as v2 (art STYLE.md: pastel base colours).
export const BODY = ['#ffe0ef', '#e6dcff', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf', '#ffffff', '#f5d9ff'];
export const MANE = ['#ff7fbf', '#9d7bff', '#4fc3ff', '#ffbf3f', '#3fd69a', '#ff8f6b', '#c46bff', '#ff5f8f'];
export const GOLDEN_BODY = '#ffd86b';

export type HatchRoll = { breed: BreedId; colours: Colours; traits: Traits };

export function rollHatch(input: { kind: EggKind; result: Result; golden: boolean; speckled: boolean; rng: Rng }): HatchRoll {
  const { rng } = input;
  const body = input.golden ? GOLDEN_BODY : pick(BODY, rng);
  const mane = pick(MANE, rng);
  let mane2 = pick(MANE, rng);
  if (mane2 === mane) mane2 = MANE[(MANE.indexOf(mane) + 3) % MANE.length];
  const roll = rng(); // always drawn, so a seed gives the same colours for every result
  const traits: Traits = {};
  if (input.result === 'first' && roll < 1 / 3) traits.shiny = true;
  if (input.golden) traits.golden = true;
  if (input.speckled) traits.speckled = true;
  return { breed: BREED_OF[input.kind], colours: { body, mane, mane2 }, traits };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/hatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/hatch.ts tests/heartbeat/hatch.test.ts
git commit -m "Add hatch rolls with breeds, colours and the shiny chance"
```

**Acceptance:** tests pass. The shiny chance is never announced when it does not happen (enforced in Task 18, which only says `lumi-sparkly` when `traits.shiny`).

---

### Task 5: The wish basket

**Files:**
- Create: `src/core/phonics/basket.ts`, `tests/heartbeat/words.ts` (word fixture)
- Test: `tests/heartbeat/basket.test.ts`

**Interfaces:**
- Consumes: `WordEntry` (Task 1, the C11 shape); `Rng`, `shuffle` (C2); `ErrorTag`, `Scaffold` (Task 1).
- Produces:

```ts
export type BasketItem = { key: string; word: string; picture: string; heap: boolean };
export type Funny = 'one-for-many' | 'heap-for-one' | 'wrong-thing';
export type GiveVerdict = { ok: true } | { ok: false; error: ErrorTag; funny: Funny };
export function planBasket(input: { target: WordEntry; size: 3 | 4 | 6; pool: WordEntry[]; rng: Rng; must?: string[] }): BasketItem[] | null;
export function planPluralBasket(input: { target: WordEntry; scaffold: Scaffold; pool: WordEntry[]; get: (w: string) => WordEntry | undefined; rng: Rng }): BasketItem[] | null;
export function judgeGive(target: WordEntry, item: BasketItem, get: (w: string) => WordEntry | undefined): GiveVerdict;
```

- [ ] **Step 1: Write the word fixture and the failing test**

`tests/heartbeat/words.ts`:

```ts
import type { WordEntry } from '../../src/core/heartbeat/types.ts';

const w = (word: string, gr: string[], step: string, extra: Partial<WordEntry> = {}): WordEntry =>
  ({ word, gr, step, picture: `${extra.one ?? word}`, clip: `word-${word}`, basket: !extra.one, ...extra });

export const WORDS: WordEntry[] = [
  w('pan', ['p', 'a', 'n'], 'R01', { pair: 'pen', pairTag: 'aeu', confuse: ['pot'] }),
  w('pen', ['p', 'e', 'n'], 'R04', { pair: 'pan', pairTag: 'aeu' }),
  w('pin', ['p', 'i', 'n'], 'R02'),
  w('pot', ['p', 'o', 't'], 'R03', { confuse: ['pan'] }),
  w('map', ['m', 'a', 'p'], 'R02'),
  w('mop', ['m', 'o', 'p'], 'R03'),
  w('cap', ['c', 'a', 'p'], 'R03', { confuse: ['hat'] }),
  w('cup', ['c', 'u', 'p'], 'R04', { plural: 'cups' }),
  w('hat', ['h', 'a', 't'], 'R05', { plural: 'hats', confuse: ['cap'], station: 'hat' }),
  w('hats', ['h', 'a', 't', '-s'], 'R19', { one: 'hat' }),
  w('cups', ['c', 'u', 'p', '-s'], 'R19', { one: 'cup' }),
  w('bell', ['b', 'e', 'll'], 'R07', { plural: 'bells' }),
  w('bells', ['b', 'e', 'll', '-s'], 'R19', { one: 'bell' }),
  w('fox', ['f', 'o', 'x'], 'R08', { plural: 'foxes' }),
  w('foxes', ['f', 'o', 'x', '-es'], 'R19', { one: 'fox' }),
  w('bun', ['b', 'u', 'n'], 'R05'),
  w('bag', ['b', 'a', 'g'], 'R05'),
  w('nap', ['n', 'a', 'p'], 'R02', { station: 'nap', basket: false }),
  w('bath', ['b', 'a', 'th'], 'R10', { station: 'bath', basket: false }),
  w('swing', ['s', 'w', 'i', 'ng'], 'R10', { station: 'swing', basket: false }),
  w('cake', ['c', 'a-e', 'k'], 'R30'),
];
export const BY_WORD = new Map(WORDS.map((x) => [x.word, x]));
export const get = (x: string) => BY_WORD.get(x);
export const POOL = WORDS.filter((x) => x.basket && !x.one);
```

`tests/heartbeat/basket.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { judgeGive, planBasket, planPluralBasket } from '../../src/core/phonics/basket.ts';
import { makeRng } from '../../src/core/rng.ts';
import { BY_WORD, POOL, get } from './words.ts';

const W = (x: string) => BY_WORD.get(x)!;

describe('planBasket', () => {
  it('fills 3, 4 or 6 different single things with the target among them', () => {
    for (const size of [3, 4, 6] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const b = planBasket({ target: W('pan'), size, pool: POOL, rng: makeRng(seed) })!;
        expect(b).toHaveLength(size);
        expect(b.map((i) => i.word)).toContain('pan');
        expect(new Set(b.map((i) => i.word)).size).toBe(size);
        expect(b.every((i) => !i.heap)).toBe(true);
      }
    }
  });
  it('puts the vowel partner in when it exists', () => {
    const b = planBasket({ target: W('pan'), size: 3, pool: POOL, rng: makeRng(1) })!;
    expect(b.map((i) => i.word)).toContain('pen');
  });
  it('never puts confusable pictures together', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const words = planBasket({ target: W('hat'), size: 6, pool: POOL, rng: makeRng(seed) })!.map((i) => i.word);
      expect(words.includes('hat') && words.includes('cap')).toBe(false);
    }
  });
  it('returns null when the basket cannot be filled', () => {
    expect(planBasket({ target: W('pan'), size: 3, pool: [W('pan'), W('pen')], rng: makeRng(1) })).toBeNull();
  });
  it('keeps a required partner in the basket for twin wishes', () => {
    const b = planBasket({ target: W('pin'), size: 3, pool: POOL, rng: makeRng(2), must: ['pan'] })!;
    expect(b.map((i) => i.word)).toEqual(expect.arrayContaining(['pin', 'pan']));
  });
});

describe('planPluralBasket', () => {
  it('level 1 holds one thing, a heap of it and one other thing', () => {
    const b = planPluralBasket({ target: W('hats'), scaffold: 1, pool: POOL, get, rng: makeRng(1) })!;
    expect(b).toHaveLength(3);
    expect(b.filter((i) => i.word === 'hat').map((i) => i.heap).sort()).toEqual([false, true]);
    expect(b.filter((i) => i.word !== 'hat')).toHaveLength(1);
    expect(b.find((i) => i.word !== 'hat')!.heap).toBe(false);
  });
  it('level 2 holds one and a heap of two words, level 3 of three words', () => {
    const two = planPluralBasket({ target: W('hat'), scaffold: 2, pool: POOL, get, rng: makeRng(2) })!;
    expect(two).toHaveLength(4);
    expect(new Set(two.map((i) => i.word)).size).toBe(2);
    const three = planPluralBasket({ target: W('foxes'), scaffold: 3, pool: POOL, get, rng: makeRng(3) })!;
    expect(three).toHaveLength(6);
    expect(new Set(three.map((i) => i.word)).size).toBe(3);
    expect(three.filter((i) => i.heap)).toHaveLength(3);
  });
});

describe('judgeGive', () => {
  const one = (word: string) => ({ key: word, word, picture: `${word}`, heap: false });
  const heap = (word: string) => ({ key: `${word}-heap`, word, picture: `${word}`, heap: true });
  it('wants the heap for a plural and the one for a singular', () => {
    expect(judgeGive(W('hats'), heap('hat'), get)).toEqual({ ok: true });
    expect(judgeGive(W('hats'), one('hat'), get)).toEqual({ ok: false, error: 'other', funny: 'one-for-many' });
    expect(judgeGive(W('hat'), one('hat'), get)).toEqual({ ok: true });
    expect(judgeGive(W('hat'), heap('hat'), get)).toEqual({ ok: false, error: 'other', funny: 'heap-for-one' });
  });
  it('tags the Dutch vowel pair, other vowel slips and other mistakes', () => {
    expect(judgeGive(W('pan'), one('pen'), get)).toEqual({ ok: false, error: 'dutch', funny: 'wrong-thing' });
    expect(judgeGive(W('pan'), one('pin'), get)).toEqual({ ok: false, error: 'vowel', funny: 'wrong-thing' });
    expect(judgeGive(W('pan'), one('map'), get)).toEqual({ ok: false, error: 'other', funny: 'wrong-thing' });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/basket.test.ts`
Expected: FAIL, cannot resolve `src/core/phonics/basket.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/phonics/basket.ts`:

```ts
import { type Rng, shuffle } from '../rng.ts';
import type { WordEntry } from '../heartbeat/types.ts';
import type { ErrorTag, Scaffold } from '../heartbeat/types.ts';

export type BasketItem = { key: string; word: string; picture: string; heap: boolean };
export type Funny = 'one-for-many' | 'heap-for-one' | 'wrong-thing';
export type GiveVerdict = { ok: true } | { ok: false; error: ErrorTag; funny: Funny };

const DUTCH_TAGS = new Set(['aeu', 'final', 'vw', 'jy', 'th', 'ch', 'r20']);
const SHORT_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

const one = (w: WordEntry): BasketItem => ({ key: w.word, word: w.word, picture: w.picture, heap: false });
const heap = (w: WordEntry): BasketItem => ({ key: `${w.word}-heap`, word: w.word, picture: w.picture, heap: true });

function confusable(a: WordEntry, b: WordEntry): boolean {
  return (a.confuse ?? []).includes(b.word) || (b.confuse ?? []).includes(a.word);
}

export function planBasket(input: { target: WordEntry; size: 3 | 4 | 6; pool: WordEntry[]; rng: Rng; must?: string[] }): BasketItem[] | null {
  const { target, size, pool, rng } = input;
  const chosen: WordEntry[] = [target];
  const byWord = new Map(pool.map((w) => [w.word, w]));
  const okWith = (w: WordEntry) => w.basket && !w.one && !chosen.some((x) => x.word === w.word) && chosen.every((x) => !confusable(x, w));
  for (const m of input.must ?? []) {
    const w = byWord.get(m);
    if (!w || !okWith(w)) return null;
    chosen.push(w);
  }
  const addOne = (cands: WordEntry[]) => {
    for (const w of shuffle(cands, rng)) {
      if (chosen.length >= size) return;
      if (okWith(w)) { chosen.push(w); return; }
    }
  };
  // v2 pantry rules: the vowel partner, then a same-onset item, then a same-ending item, then any.
  if (target.pair) { const p = byWord.get(target.pair); if (p && okWith(p) && chosen.length < size) chosen.push(p); }
  addOne(pool.filter((w) => w.gr[0] === target.gr[0]));
  addOne(pool.filter((w) => w.gr[w.gr.length - 1] === target.gr[target.gr.length - 1]));
  for (const w of shuffle(pool, rng)) {
    if (chosen.length >= size) break;
    if (okWith(w)) chosen.push(w);
  }
  if (chosen.length < size) return null;
  return shuffle(chosen.map(one), rng);
}

export function planPluralBasket(input: { target: WordEntry; scaffold: Scaffold; pool: WordEntry[]; get: (w: string) => WordEntry | undefined; rng: Rng }): BasketItem[] | null {
  const stem = input.target.one ? input.get(input.target.one) : input.target;
  if (!stem) return null;
  const items: BasketItem[] = [one(stem), heap(stem)];
  const chosen: WordEntry[] = [stem];
  const need = input.scaffold === 3 ? 2 : 1;
  for (const w of shuffle(input.pool, input.rng)) {
    if (chosen.length - 1 >= need) break;
    if (!w.basket || w.one || chosen.some((c) => c.word === w.word || confusable(c, w))) continue;
    chosen.push(w);
    if (input.scaffold === 1) items.push(one(w));
    else items.push(one(w), heap(w));
  }
  if (chosen.length - 1 < need) return null;
  return shuffle(items, input.rng);
}

function vowelOnly(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!SHORT_VOWELS.has(a[i]) || !SHORT_VOWELS.has(b[i])) return false;
    diff++;
  }
  return diff === 1;
}

export function judgeGive(target: WordEntry, item: BasketItem, get: (w: string) => WordEntry | undefined): GiveVerdict {
  const stemWord = target.one ?? target.word;
  const wantsHeap = target.one !== undefined;
  if (item.word === stemWord) {
    if (item.heap === wantsHeap) return { ok: true };
    return { ok: false, error: 'other', funny: wantsHeap ? 'one-for-many' : 'heap-for-one' };
  }
  const stem = get(stemWord) ?? target;
  const picked = get(item.word);
  let error: ErrorTag = 'other';
  if (stem.pair === item.word) error = stem.pairTag && DUTCH_TAGS.has(stem.pairTag) ? 'dutch' : 'vowel';
  else if (picked && vowelOnly(stem.gr, picked.gr)) error = 'vowel';
  return { ok: false, error, funny: 'wrong-thing' };
}
```

A singular wish in R19 serves the bare word (`hat`), so `judgeGive` treats any heap of the stem as "heap for one". Outside R19 there are no heaps in the basket, so this branch never fires.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/basket.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/phonics/basket.ts tests/heartbeat/words.ts tests/heartbeat/basket.test.ts
git commit -m "Add wish baskets for single words, one-or-many wishes and twin wishes"
```

**Acceptance:** tests pass, including the null basket (Review focus 5).

---

### Task 6: Building a wish

**Files:**
- Create: `src/core/heartbeat/wish.ts`
- Test: `tests/heartbeat/wish.test.ts`

**Interfaces:**
- Consumes: `planBasket`, `planPluralBasket`, `BasketItem` (Task 5); `WordEntry` (C11); `Served`, `StationId`, `StepState` (Task 1); `Rng` (C2).
- Produces:

```ts
export const STATIONS: StationId[];                 // ['hay','brush','hat','nap','swing','bath']
export const TWIN_STEPS: Set<string>;               // R04D, R11, R20, R38
export type PrintUnit = { g: string; text: string; silent: boolean };
export type WishPart = { baby: string; served: Served; word: WordEntry; units: PrintUnit[] };
export type WishTask = { kind: 'basket' | 'station' | 'twin'; baby: string; served: Served; word: WordEntry;
  print: string; units: PrintUnit[]; dotsMs: 500 | 300 | null; basket: BasketItem[];
  station: StationId | null; plural: boolean; next: WishPart | null };
export function printUnits(gr: string[], silent: (g: string) => boolean): PrintUnit[];
export function soundedGraphemes(ladder: { id: string; items: string[] }[], status: (step: string) => StepState): Set<string>;
export function buildWish(input: { served: Served; baby: string; babyName: string | null; twinBaby: string | null;
  words: Map<string, WordEntry>; bathPond: boolean; sounded: Set<string>; rng: Rng }): WishTask | null;
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/wish.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildWish, printUnits, soundedGraphemes } from '../../src/core/heartbeat/wish.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BY_WORD } from './words.ts';

const served = (step: string, carrier: string, scaffold: 1 | 2 | 3 = 1, twin?: string): Served =>
  ({ strand: 'r', step, id: carrier, carrier, items: ['a'], scaffold, probe: false, source: 'current', twin });
const base = { baby: 'b1', babyName: 'Tam', twinBaby: 'b2', words: BY_WORD, bathPond: true, sounded: new Set(['p', 'a', 'n', 'h', 't']), rng: makeRng(1) };

describe('printUnits', () => {
  it('prints endings without the dash and split digraphs around the consonant', () => {
    expect(printUnits(['h', 'a', 't', '-s'], () => false).map((u) => u.text).join('')).toBe('hats');
    const cake = printUnits(['c', 'a-e', 'k'], () => false);
    expect(cake.map((u) => u.text)).toEqual(['c', 'a', 'k', 'e']);
    expect(cake[3].g).toBe('a-e');
  });
});

describe('soundedGraphemes', () => {
  it('collects graphemes of passed and placed steps only', () => {
    const s = soundedGraphemes([{ id: 'R01', items: ['s', 'a'] }, { id: 'R02', items: ['i'] }, { id: 'R19', items: ['-s', '-es'] }],
      (st) => (st === 'R01' ? 'placed' : st === 'R02' ? 'passed' : 'school'));
    expect([...s].sort()).toEqual(['a', 'i', 's']);
  });
});

describe('buildWish', () => {
  it('builds a basket wish sized by scaffold, with dots by level', () => {
    const w1 = buildWish({ ...base, served: served('R01', 'pan', 1) })!;
    expect(w1).toMatchObject({ kind: 'basket', print: 'pan', dotsMs: 500, plural: false, station: null });
    expect(w1.basket).toHaveLength(3);
    expect(buildWish({ ...base, served: served('R01', 'pan', 2) })!.basket).toHaveLength(4);
    const w3 = buildWish({ ...base, served: served('R01', 'pan', 3) })!;
    expect(w3.basket).toHaveLength(6);
    expect(w3.dotsMs).toBeNull();
  });
  it('keeps graphemes of steps not yet passed silent at level 3', () => {
    const w = buildWish({ ...base, served: served('R19', 'hats', 3) })!;
    expect(w.units.find((u) => u.g === '-s')!.silent).toBe(true);
    expect(w.units.find((u) => u.g === 'h')!.silent).toBe(false);
  });
  it('makes R19 wishes one-or-many baskets', () => {
    const w = buildWish({ ...base, served: served('R19', 'hats', 1) })!;
    expect(w).toMatchObject({ kind: 'basket', plural: true, print: 'hats' });
    expect(w.basket.some((i) => i.heap && i.word === 'hat')).toBe(true);
  });
  it('sends station words to the station, but not while plurals decide', () => {
    expect(buildWish({ ...base, served: served('R10', 'swing') })).toMatchObject({ kind: 'station', station: 'swing', basket: [] });
    expect(buildWish({ ...base, served: served('R19', 'hat', 1) })!.kind).toBe('basket');
  });
  it('skips a bath wish before the Bath Pond is built', () => {
    expect(buildWish({ ...base, bathPond: false, served: served('R10', 'bath') })).toBeNull();
  });
  it('builds a twin wish with both words in one basket', () => {
    const w = buildWish({ ...base, served: served('R04D', 'pan', 1, 'pen') })!;
    expect(w.kind).toBe('twin');
    expect(w.basket.map((i) => i.word)).toEqual(expect.arrayContaining(['pan', 'pen']));
    expect(w.next).toMatchObject({ baby: 'b2', word: { word: 'pen' } });
    expect(w.next!.served.carrier).toBe('pen');
  });
  it('serves the first twin word alone when there is no second baby', () => {
    const w = buildWish({ ...base, twinBaby: null, served: served('R04D', 'pan', 1, 'pen') })!;
    expect(w.kind).toBe('basket');
    expect(w.next).toBeNull();
  });
  it('never wishes a baby its own name, and refuses unknown words', () => {
    expect(buildWish({ ...base, babyName: 'Pan', served: served('R01', 'pan') })).toBeNull();
    expect(buildWish({ ...base, served: served('R01', 'zebra') })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/wish.test.ts`
Expected: FAIL, cannot resolve `src/core/heartbeat/wish.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/wish.ts`:

```ts
import type { Rng } from '../rng.ts';
import type { WordEntry } from './types.ts';
import { type BasketItem, planBasket, planPluralBasket } from '../phonics/basket.ts';
import type { Served, StationId, StepState } from './types.ts';

export const STATIONS: StationId[] = ['hay', 'brush', 'hat', 'nap', 'swing', 'bath'];
export const TWIN_STEPS = new Set(['R04D', 'R11', 'R20', 'R38']);

export type PrintUnit = { g: string; text: string; silent: boolean };
export type WishPart = { baby: string; served: Served; word: WordEntry; units: PrintUnit[] };
export type WishTask = {
  kind: 'basket' | 'station' | 'twin';
  baby: string; served: Served; word: WordEntry;
  print: string; units: PrintUnit[]; dotsMs: 500 | 300 | null;
  basket: BasketItem[]; station: StationId | null; plural: boolean;
  next: WishPart | null;
};

const SPLIT = /^[a-z]-e$/;

export function printUnits(gr: string[], silent: (g: string) => boolean): PrintUnit[] {
  const out: PrintUnit[] = [];
  let pendingE: string | null = null;
  for (const g of gr) {
    const text = g.startsWith('-') ? g.slice(1) : SPLIT.test(g) ? g[0] : g;
    out.push({ g, text, silent: silent(g) });
    if (pendingE) { out.push({ g: pendingE, text: 'e', silent: silent(pendingE) }); pendingE = null; }
    if (SPLIT.test(g)) pendingE = g;
  }
  if (pendingE) out.push({ g: pendingE, text: 'e', silent: silent(pendingE) });
  return out;
}

export function soundedGraphemes(ladder: { id: string; items: string[] }[], status: (step: string) => StepState): Set<string> {
  const s = new Set<string>();
  for (const st of ladder) {
    const k = status(st.id);
    if (k === 'passed' || k === 'placed') st.items.forEach((i) => s.add(i));
  }
  return s;
}

export function buildWish(input: {
  served: Served; baby: string; babyName: string | null; twinBaby: string | null;
  words: Map<string, WordEntry>; bathPond: boolean; sounded: Set<string>; rng: Rng;
}): WishTask | null {
  const { served } = input;
  const word = input.words.get(served.carrier);
  if (!word) return null;
  if (input.babyName && input.babyName.toLowerCase() === word.word) return null;
  const sc = served.scaffold;
  // Level 3: her slide plays only graphemes of passed steps; the rest are read from print (spec 3.3).
  const units = printUnits(word.gr, (g) => sc === 3 && !input.sounded.has(g));
  const base = {
    baby: input.baby, served, word, print: units.map((u) => u.text).join(''), units,
    dotsMs: (sc === 1 ? 500 : sc === 2 ? 300 : null) as 500 | 300 | null, next: null,
  };
  const plural = served.step === 'R19';
  if (word.station && !plural) {
    if (word.station === 'bath' && !input.bathPond) return null;
    return { ...base, kind: 'station', basket: [], station: word.station, plural: false };
  }
  const pool = [...input.words.values()].filter((w) => w.basket && !w.one);
  if (plural) {
    const basket = planPluralBasket({ target: word, scaffold: sc, pool, get: (w) => input.words.get(w), rng: input.rng });
    return basket ? { ...base, kind: 'basket', basket, station: null, plural: true } : null;
  }
  const size = sc === 1 ? 3 : sc === 2 ? 4 : 6;
  if (TWIN_STEPS.has(served.step) && served.twin) {
    const partner = input.words.get(served.twin);
    if (!partner) return null;
    const basket = planBasket({ target: word, size, pool, rng: input.rng, must: [partner.word] });
    if (!basket) return null;
    const next: WishPart | null = input.twinBaby
      ? { baby: input.twinBaby, word: partner, units: printUnits(partner.gr, (g) => sc === 3 && !input.sounded.has(g)),
          served: { ...served, id: partner.word, carrier: partner.word, twin: word.word } }
      : null;
    return { ...base, kind: next ? 'twin' : 'basket', basket, station: null, plural: false, next };
  }
  const basket = planBasket({ target: word, size, pool, rng: input.rng });
  return basket ? { ...base, kind: 'basket', basket, station: null, plural: false } : null;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/wish.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/wish.ts tests/heartbeat/wish.test.ts
git commit -m "Add wish building for basket, station, one-or-many and twin wishes"
```

**Acceptance:** tests pass. `buildWish` returning null is how the flow's `accept` filter (Task 23) skips items it cannot show (Review focus 5).

---

### Task 7: Stables, doors, camp and door visits

**Files:**
- Create: `src/core/heartbeat/stables.ts`
- Test: `tests/heartbeat/stables.test.ts`

**Interfaces:**
- Consumes: `StepState` (Task 1); `Rng`, `pick` (C2).
- Produces:

```ts
export const ROW_SIZE = 10; export const PAGE_ROWS = 2;
export type Door = { number: number; row: number; baby: string | null };
export type StableLayout = { rows: Door[][]; camp: string[] };
export function rowOf(n: number): number;
export function pageOf(n: number): number;                        // doors 1..20 page 1, 21..40 page 2
export function stableLayout(herd: { id: string; order: number }[], rowsBuilt: number): StableLayout;
export function pageDoors(layout: StableLayout, page: number): Door[];
export function pageCount(layout: StableLayout): number;
export function rowsEarned(herdCount: number): number;
export function hasDoor(order: number, rowsBuilt: number): boolean;
export function visitRange(status: (step: string) => StepState): 0 | 10 | 20 | 50 | 100;
export function rangeStep(range: number): 'M02' | 'M07' | 'M27' | 'M28' | null;
export function shouldVisit(input: { range: number; secure: boolean; babyOrder: number }): boolean;
export function pickVisitDoor(layout: StableLayout, range: number, own: number, rng: Rng): number | null;
export function doorItem(n: number): { step: 'M02' | 'M07'; id: string };
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/stables.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { doorItem, hasDoor, pageCount, pageDoors, pageOf, pickVisitDoor, rowsEarned, shouldVisit, stableLayout, visitRange } from '../../src/core/heartbeat/stables.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { StepState } from '../../src/core/heartbeat/types.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));

describe('stableLayout', () => {
  it('puts baby one behind door one', () => {
    const l = stableLayout(herd(1), 1);
    expect(l.rows).toHaveLength(1);
    expect(l.rows[0][0]).toEqual({ number: 1, row: 1, baby: 'b1' });
    expect(l.rows[0][9]).toEqual({ number: 10, row: 1, baby: null });
    expect(l.camp).toEqual([]);
  });
  it('sends babies without a built row to the Moonbeam Camp', () => {
    const l = stableLayout(herd(12), 1);
    expect(l.camp).toEqual(['b11', 'b12']);
    expect(hasDoor(11, 1)).toBe(false);
    expect(hasDoor(11, 2)).toBe(true);
  });
  it('follows hatch order, whatever the array order', () => {
    const l = stableLayout([{ id: 'x', order: 3 }, { id: 'y', order: 1 }], 1);
    expect(l.rows[0][0].baby).toBe('y');
    expect(l.rows[0][2].baby).toBe('x');
  });
  it('pages rows two at a time', () => {
    const l = stableLayout(herd(45), 5);
    expect(pageCount(l)).toBe(3);
    expect(pageDoors(l, 1).map((d) => d.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(pageDoors(l, 3).map((d) => d.number)).toEqual([41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
    expect(pageOf(14)).toBe(1);
    expect(pageOf(21)).toBe(2);
  });
  it('earns a row for every ten babies', () => {
    expect(rowsEarned(0)).toBe(1);
    expect(rowsEarned(10)).toBe(1);
    expect(rowsEarned(11)).toBe(2);
  });
});

describe('door visits', () => {
  it('opens the range by maths step', () => {
    const st = (cur: string) => (s: string): StepState => (s === cur ? 'current' : 'locked');
    expect(visitRange(st('M01'))).toBe(0);
    expect(visitRange((s) => (s === 'M02' ? 'placed' : 'locked'))).toBe(10);
    expect(visitRange(st('M07'))).toBe(20);
    expect(visitRange(st('M27'))).toBe(50);
    expect(visitRange(st('M28'))).toBe(100);
  });
  it('visits every time until the range is secure, then every third baby', () => {
    expect(shouldVisit({ range: 0, secure: false, babyOrder: 3 })).toBe(false);
    expect(shouldVisit({ range: 10, secure: false, babyOrder: 4 })).toBe(true);
    expect(shouldVisit({ range: 10, secure: true, babyOrder: 4 })).toBe(false);
    expect(shouldVisit({ range: 10, secure: true, babyOrder: 6 })).toBe(true);
  });
  it('picks an occupied door in range that is not her own', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const n = pickVisitDoor(stableLayout(herd(5), 1), 10, 5, makeRng(seed))!;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(4);
    }
  });
  it('gives no visit to a lone baby, and never a camp baby as target', () => {
    expect(pickVisitDoor(stableLayout(herd(1), 1), 10, 1, makeRng(1))).toBeNull();
    for (let seed = 1; seed <= 30; seed++) {
      const n = pickVisitDoor(stableLayout(herd(12), 1), 20, 12, makeRng(seed))!;
      expect(n).toBeLessThanOrEqual(10);
    }
  });
  it('logs doors under M02 or M07', () => {
    expect(doorItem(7)).toEqual({ step: 'M02', id: 'num:7' });
    expect(doorItem(14)).toEqual({ step: 'M07', id: 'num:14' });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/stables.test.ts`
Expected: FAIL, cannot resolve `src/core/heartbeat/stables.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/stables.ts`:

```ts
import { type Rng, pick } from '../rng.ts';
import type { StepState } from './types.ts';

export const ROW_SIZE = 10;
export const PAGE_ROWS = 2;

export type Door = { number: number; row: number; baby: string | null };
export type StableLayout = { rows: Door[][]; camp: string[] };

export function rowOf(n: number): number {
  return Math.ceil(n / ROW_SIZE);
}
export function pageOf(n: number): number {
  return Math.ceil(rowOf(n) / PAGE_ROWS);
}
export function hasDoor(order: number, rowsBuilt: number): boolean {
  return rowOf(order) <= rowsBuilt;
}

export function stableLayout(herd: { id: string; order: number }[], rowsBuilt: number): StableLayout {
  const rows: Door[][] = [];
  for (let r = 1; r <= rowsBuilt; r++) {
    rows.push(Array.from({ length: ROW_SIZE }, (_, i) => ({ number: (r - 1) * ROW_SIZE + i + 1, row: r, baby: null })));
  }
  const camp: string[] = [];
  for (const b of [...herd].sort((a, c) => a.order - c.order)) {
    if (hasDoor(b.order, rowsBuilt)) rows[rowOf(b.order) - 1][(b.order - 1) % ROW_SIZE].baby = b.id;
    else camp.push(b.id);
  }
  return { rows, camp };
}

export function pageCount(layout: StableLayout): number {
  return Math.max(1, Math.ceil(layout.rows.length / PAGE_ROWS));
}
export function pageDoors(layout: StableLayout, page: number): Door[] {
  return layout.rows.slice((page - 1) * PAGE_ROWS, page * PAGE_ROWS).flat();
}

export function rowsEarned(herdCount: number): number {
  return Math.max(1, Math.ceil(herdCount / ROW_SIZE));
}

export function visitRange(status: (step: string) => StepState): 0 | 10 | 20 | 50 | 100 {
  const ok = (s: string) => ['current', 'passed', 'placed'].includes(status(s));
  if (ok('M28')) return 100;
  if (ok('M27')) return 50;
  if (ok('M07')) return 20;
  if (ok('M02')) return 10;
  return 0;
}

export function rangeStep(range: number): 'M02' | 'M07' | 'M27' | 'M28' | null {
  return range === 10 ? 'M02' : range === 20 ? 'M07' : range === 50 ? 'M27' : range === 100 ? 'M28' : null;
}

export function shouldVisit(input: { range: number; secure: boolean; babyOrder: number }): boolean {
  if (input.range === 0) return false;
  return input.secure ? input.babyOrder % 3 === 0 : true;
}

export function pickVisitDoor(layout: StableLayout, range: number, own: number, rng: Rng): number | null {
  const doors = layout.rows.flat().filter((d) => d.baby !== null && d.number <= range && d.number !== own);
  return doors.length ? pick(doors, rng).number : null;
}

export function doorItem(n: number): { step: 'M02' | 'M07'; id: string } {
  return { step: n <= 10 ? 'M02' : 'M07', id: `num:${n}` };
}
```

The ten doors of a built row are always on screen, so a door visit always offers at least ten doors (spec 2.5 rule 5), even when only one neighbour lives there.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/stables.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/stables.ts tests/heartbeat/stables.test.ts
git commit -m "Add stable rows of ten, the Moonbeam Camp and door visit rules"
```

**Acceptance:** tests pass, including the lone baby and the camp baby (Review focus 1 and 2).

---

### Task 8: Roll call and the sky

**Files:**
- Create: `src/core/heartbeat/rollcall.ts`, `src/core/heartbeat/sky.ts`
- Test: `tests/heartbeat/rollcall.test.ts`

**Interfaces:**
- Consumes: `StableLayout`, `pageDoors`, `pageCount`, `pageOf` (Task 7); `lineId`, `TIER1_COUNT_MAX`, `COUNT_MAX` (Task 1); `Rng`, `shuffle` (C2).
- Produces:

```ts
// rollcall.ts
export type RollCallPick = { kind: 'name'; baby: string; name: string } | { kind: 'door'; baby: string; number: number };
export function rollCallCount(input: { visitIndex: number; checkedThisVisit: number; due: number }): 1 | 2 | 3;
export function nameEligible(gems: string[], readable: Set<string>, firsts: number): boolean;
export function pickRollCall(input: { layout: StableLayout; names: Map<string, string | null>; count: number;
  eligible: (baby: string) => boolean; isDue: (baby: string) => boolean; door: number | null; rng: Rng }): { page: number; picks: RollCallPick[] };
export function logRollCall(candidates: number): boolean;
// sky.ts
export type SkyState = { unicorns: number; stars: number; unnamed: number[] };
export function skyState(herdCount: number, skyNames: readonly (string | null)[]): SkyState;
export function goodnightCountLines(herdCount: number, unicorns: number): { required: string[]; optional: string[] };
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/rollcall.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { logRollCall, nameEligible, pickRollCall, rollCallCount } from '../../src/core/heartbeat/rollcall.ts';
import { goodnightCountLines, skyState } from '../../src/core/heartbeat/sky.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import { makeRng } from '../../src/core/rng.ts';

const NAMES = ['Tam', 'Pip', 'Ken', 'Tim', 'tim', 'Sam', 'Dan', 'Meg', 'Pat', 'Nan', 'Ben', 'Lily'];
const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const names = (n: number) => new Map(herd(n).map((b, i) => [b.id, NAMES[i] ?? null] as const));
const yes = () => true;

describe('rollCallCount', () => {
  it('asks one name on visit 1 or after 30 checked moments, else two or three', () => {
    expect(rollCallCount({ visitIndex: 1, checkedThisVisit: 0, due: 5 })).toBe(1);
    expect(rollCallCount({ visitIndex: 4, checkedThisVisit: 31, due: 5 })).toBe(1);
    expect(rollCallCount({ visitIndex: 4, checkedThisVisit: 10, due: 1 })).toBe(2);
    expect(rollCallCount({ visitIndex: 4, checkedThisVisit: 10, due: 3 })).toBe(3);
  });
});

describe('nameEligible', () => {
  it('needs a decodable name or an earlier first try', () => {
    expect(nameEligible(['T', 'a', 'm'], new Set(['t', 'a', 'm']), 0)).toBe(true);
    expect(nameEligible(['L', 'i', 'l', 'y'], new Set(['l', 'i']), 0)).toBe(false);
    expect(nameEligible(['L', 'i', 'l', 'y'], new Set(['l', 'i']), 1)).toBe(true);
  });
});

describe('pickRollCall', () => {
  it('asks nothing with fewer than three heads', () => {
    const r = pickRollCall({ layout: stableLayout(herd(2), 1), names: names(2), count: 2, eligible: yes, isDue: yes, door: null, rng: makeRng(1) });
    expect(r.picks).toEqual([]);
  });
  it('never asks a name that two babies on the page share', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = pickRollCall({ layout: stableLayout(herd(8), 1), names: names(8), count: 3, eligible: yes, isDue: () => false, door: null, rng: makeRng(seed) });
      expect(r.picks).toHaveLength(3);
      for (const p of r.picks) expect(['b4', 'b5']).not.toContain(p.baby);
    }
  });
  it('asks due names first', () => {
    const r = pickRollCall({ layout: stableLayout(herd(8), 1), names: names(8), count: 1, eligible: yes, isDue: (b) => b === 'b7', door: null, rng: makeRng(2) });
    expect(r.picks).toEqual([{ kind: 'name', baby: 'b7', name: 'Dan' }]);
  });
  it('starts with a spoken door when the maths queue serves M07', () => {
    const r = pickRollCall({ layout: stableLayout(herd(15), 2), names: names(12), count: 2, eligible: yes, isDue: () => false, door: 12, rng: makeRng(3) });
    expect(r.picks[0]).toEqual({ kind: 'door', baby: 'b12', number: 12 });
    expect(r.picks).toHaveLength(2);
  });
  it('ignores a spoken door for a baby in the camp', () => {
    const r = pickRollCall({ layout: stableLayout(herd(12), 1), names: names(12), count: 1, eligible: yes, isDue: () => false, door: 11, rng: makeRng(4) });
    expect(r.picks[0].kind).toBe('name');
  });
  it('skips babies who are not eligible or have no name', () => {
    const n = names(6); n.set('b6', null);
    const r = pickRollCall({ layout: stableLayout(herd(6), 1), names: n, count: 3, eligible: (b) => b !== 'b1', isDue: () => false, door: null, rng: makeRng(5) });
    for (const p of r.picks) expect(['b1', 'b6']).not.toContain(p.baby);
  });
  it('logs only while three or more candidates are left', () => {
    expect(logRollCall(3)).toBe(true);
    expect(logRollCall(2)).toBe(false);
  });
});

describe('sky', () => {
  it('turns every ten stars into a sky unicorn', () => {
    expect(skyState(41, ['Rose', null])).toEqual({ unicorns: 4, stars: 1, unnamed: [1, 2, 3] });
    expect(skyState(9, [])).toEqual({ unicorns: 0, stars: 9, unnamed: [] });
  });
  it('says counts up to sixty for sure and up to 120 when the clip exists', () => {
    expect(goodnightCountLines(41, 4)).toEqual({ required: ['num-unicorns-41', 'num-sky-4'], optional: [] });
    expect(goodnightCountLines(75, 7)).toEqual({ required: ['num-sky-7'], optional: ['num-unicorns-75'] });
    expect(goodnightCountLines(9, 0)).toEqual({ required: ['num-unicorns-9'], optional: [] });
    expect(goodnightCountLines(130, 13)).toEqual({ required: [], optional: [] });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/rollcall.test.ts`
Expected: FAIL, cannot resolve `src/core/heartbeat/rollcall.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/rollcall.ts`:

```ts
import { type Rng, shuffle } from '../rng.ts';
import { type Door, type StableLayout, pageCount, pageDoors, pageOf } from './stables.ts';

export type RollCallPick = { kind: 'name'; baby: string; name: string } | { kind: 'door'; baby: string; number: number };

export function rollCallCount(input: { visitIndex: number; checkedThisVisit: number; due: number }): 1 | 2 | 3 {
  if (input.visitIndex <= 1 || input.checkedThisVisit >= 30) return 1;
  return input.due >= 3 ? 3 : 2;
}

// Spec 3.7: only names decodable at her reading step, or read with a first try before.
export function nameEligible(gems: string[], readable: Set<string>, firsts: number): boolean {
  return firsts > 0 || (gems.length > 0 && gems.every((g) => readable.has(g.toLowerCase())));
}

export function logRollCall(candidates: number): boolean {
  return candidates >= 3;
}

export function pickRollCall(input: {
  layout: StableLayout; names: Map<string, string | null>; count: number;
  eligible: (baby: string) => boolean; isDue: (baby: string) => boolean; door: number | null; rng: Rng;
}): { page: number; picks: RollCallPick[] } {
  const heads = (p: number): Door[] => pageDoors(input.layout, p).filter((d) => d.baby !== null);
  const askable = (p: number): Door[] => {
    const hs = heads(p);
    const count = new Map<string, number>();
    for (const d of hs) { const n = input.names.get(d.baby!)?.toLowerCase(); if (n) count.set(n, (count.get(n) ?? 0) + 1); }
    return hs.filter((d) => {
      const n = input.names.get(d.baby!)?.toLowerCase();
      return !!n && count.get(n) === 1 && input.eligible(d.baby!);
    });
  };
  const picks: RollCallPick[] = [];
  let page = 1;
  if (input.door !== null) {
    const d = input.layout.rows.flat().find((x) => x.number === input.door && x.baby !== null);
    if (d && heads(pageOf(d.number)).length >= 3) {
      page = pageOf(d.number);
      picks.push({ kind: 'door', baby: d.baby!, number: d.number });
    }
  }
  if (!picks.length) {
    let best = -1;
    for (let p = 1; p <= pageCount(input.layout); p++) {
      if (heads(p).length < 3) continue;
      const a = askable(p);
      const score = a.filter((d) => input.isDue(d.baby!)).length * 10 + a.length;
      if (score > best) { best = score; page = p; }
    }
    if (best < 0) return { page: 1, picks: [] };
  }
  const options = askable(page).filter((d) => !picks.some((x) => x.baby === d.baby));
  const due = shuffle(options.filter((d) => input.isDue(d.baby!)), input.rng);
  const rest = shuffle(options.filter((d) => !input.isDue(d.baby!)), input.rng);
  for (const d of [...due, ...rest]) {
    if (picks.length >= input.count) break;
    picks.push({ kind: 'name', baby: d.baby!, name: input.names.get(d.baby!)! });
  }
  return { page, picks };
}
```

`src/core/heartbeat/sky.ts`:

```ts
import { COUNT_MAX, TIER1_COUNT_MAX, lineId } from './lines.ts';

export type SkyState = { unicorns: number; stars: number; unnamed: number[] };

export function skyState(herdCount: number, skyNames: readonly (string | null)[]): SkyState {
  const unicorns = Math.floor(herdCount / 10);
  const unnamed: number[] = [];
  for (let i = 0; i < unicorns; i++) if (!skyNames[i]) unnamed.push(i);
  return { unicorns, stars: herdCount % 10, unnamed };
}

export function goodnightCountLines(herdCount: number, unicorns: number): { required: string[]; optional: string[] } {
  const required: string[] = [];
  const optional: string[] = [];
  if (herdCount >= 1 && herdCount <= TIER1_COUNT_MAX) required.push(lineId.unicorns(herdCount));
  else if (herdCount > TIER1_COUNT_MAX && herdCount <= COUNT_MAX) optional.push(lineId.unicorns(herdCount));
  if (unicorns >= 1 && unicorns <= 12) required.push(lineId.sky(unicorns));
  return { required, optional };
}
```

Sky naming rule: at most one sky unicorn is named per goodnight, the oldest unnamed first (`unnamed[0]`). After Moving Day with 45 babies, four wait and get names on four goodnights. This keeps goodnight short.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/rollcall.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/rollcall.ts src/core/heartbeat/sky.ts tests/heartbeat/rollcall.test.ts
git commit -m "Add roll call picks and the goodnight sky count"
```

**Acceptance:** tests pass, including the two-head and camp cases (Review focus 1 and 2).

---

### Task 9: Moonflowers

**Files:**
- Create: `src/core/heartbeat/moonflowers.ts`
- Test: `tests/heartbeat/moonflowers.test.ts`

**Interfaces:**
- Consumes: `makeRng` (C2).
- Produces:

```ts
export const MAX_PATCHES = 60;
export type FlowerPatch = { x: number; y: number; density: 1 | 2 | 3; hue: number };
export function moonflowerLayout(count: number, seed: number): FlowerPatch[];
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/moonflowers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MAX_PATCHES, moonflowerLayout } from '../../src/core/heartbeat/moonflowers.ts';

describe('moonflowerLayout', () => {
  it('draws one patch per flower up to sixty', () => {
    expect(moonflowerLayout(0, 1)).toEqual([]);
    const l = moonflowerLayout(10, 1);
    expect(l).toHaveLength(10);
    expect(l.every((p) => p.density === 1)).toBe(true);
  });
  it('makes existing patches denser above sixty', () => {
    const l = moonflowerLayout(61, 1);
    expect(l).toHaveLength(MAX_PATCHES);
    expect(l[0].density).toBe(2);
    expect(l[1].density).toBe(1);
    expect(moonflowerLayout(400, 1).every((p) => p.density === 3)).toBe(true);
  });
  it('keeps earlier patches where they were when a flower is added', () => {
    const a = moonflowerLayout(30, 7);
    const b = moonflowerLayout(31, 7);
    expect(b.slice(0, 30).map((p) => [p.x, p.y])).toEqual(a.map((p) => [p.x, p.y]));
  });
  it('stays in the meadow band', () => {
    for (const p of moonflowerLayout(60, 3)) {
      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.x).toBeLessThanOrEqual(1140);
      expect(p.y).toBeGreaterThanOrEqual(600);
      expect(p.y).toBeLessThanOrEqual(790);
    }
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/moonflowers.test.ts`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/moonflowers.ts`:

```ts
import { makeRng } from '../rng.ts';

export const MAX_PATCHES = 60;
export type FlowerPatch = { x: number; y: number; density: 1 | 2 | 3; hue: number };

// Spec 2.7: one flower per hatch; above 60 new flowers join existing patches as denser sprites.
export function moonflowerLayout(count: number, seed: number): FlowerPatch[] {
  const rng = makeRng(seed);
  const patches = Math.min(count, MAX_PATCHES);
  const out: FlowerPatch[] = [];
  for (let i = 0; i < patches; i++) {
    const x = Math.round(40 + rng() * 1100);
    const y = Math.round(600 + rng() * 190);
    const hue = Math.floor(rng() * 6);
    const flowers = Math.floor(count / MAX_PATCHES) + (i < count % MAX_PATCHES ? 1 : 0);
    out.push({ x, y, density: Math.min(3, Math.max(1, flowers)) as 1 | 2 | 3, hue });
  }
  return out;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/moonflowers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/moonflowers.ts tests/heartbeat/moonflowers.test.ts
git commit -m "Add the moonflower layout with denser patches above sixty"
```

**Acceptance:** tests pass; the meadow never draws more than 60 flower sprites.

---

### Task 10: Name sounds and the blocklist

**Files:**
- Create: `src/core/naming/sounds.ts`, `src/core/naming/blocklist.ts`, `tests/naming/fixtures.ts`
- Test: `tests/naming/sounds.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks. The real `shared/blocklist.json` (C11) is read in one test.
- Produces:

```ts
// sounds.ts
export type Phoneme = string;
export const GEM_ORDER: readonly string[];          // fixed tray order, phonics order
export function usualSound(g: string): Phoneme[] | null;
export function isVowelGem(g: string): boolean;
export function isVowelPhoneme(p: Phoneme): boolean;
export function hasVowel(gems: string[]): boolean;  // y counts when there is no other vowel
export function spellingToGems(word: string): string[];
export function builtPhonemes(gems: string[]): Phoneme[];
export function soundKey(ph: Phoneme[]): string;
export function gemSoundKey(g: string): string | null;     // phonics clip key for a gem's usual sound
export function phonemeSoundKey(p: Phoneme): string | null; // phonics clip key for a phoneme
export function firstSoundGem(p: Phoneme): string | null;   // gem shown for a first sound
// blocklist.ts
export type BlockKind = 'strong' | 'rude' | 'toilet';
export type BlocklistFile = { v: 1; words: { w: string; kind: BlockKind; lang: 'en' | 'nl' }[] };
export type Blocklist = { whole: Map<string, BlockKind>; parts: { seq: string[]; kind: BlockKind }[] };
export function compileBlocklist(file: BlocklistFile): Blocklist;
export function checkBlocked(gems: string[], bl: Blocklist): BlockKind | null;
```

- [ ] **Step 1: Write the fixtures and the failing test**

`tests/naming/fixtures.ts`:

```ts
import type { NameEntry } from '../../src/core/heartbeat/types.ts';
import type { BlocklistFile } from '../../src/core/naming/blocklist.ts';
import { makeSpellCtx, type SpellCtx } from '../../src/core/naming/gifts.ts';

export const S_LADDER: { id: string; items: string[] }[] = [
  { id: 'S01', items: [] },
  { id: 'S02', items: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'] },
  { id: 'S03', items: ['g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r'] },
  { id: 'S03D', items: ['a', 'e', 'u'] },
  { id: 'S04', items: ['h', 'b', 'f', 'l', 'ff', 'll', 'ss'] },
  { id: 'S05', items: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu'] },
  { id: 'S06', items: ['d', 't', 'g', 'k', 'b', 'p'] },
  { id: 'S07', items: ['ch', 'sh', 'th', 'ng', 'nk'] },
  { id: 'S08', items: ['tw:the', 'tw:i'] },
  { id: 'S09', items: ['ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'er'] },
  { id: 'S10', items: ['-s', '-es'] },
  { id: 'S11', items: ['capital'] },
  { id: 'S12', items: [] }, { id: 'S13', items: [] }, { id: 'S14', items: [] }, { id: 'S15', items: [] },
  { id: 'S16', items: [] }, { id: 'S17', items: [] }, { id: 'S18', items: [] }, { id: 'S19', items: [] },
  { id: 'S20', items: ['ai', 'ay', 'a-e'] },
  { id: 'S21', items: [] },
  { id: 'S22', items: ['ee', 'ea'] },
  { id: 'S23', items: [] },
  { id: 'S24', items: ['igh', 'ie', 'i-e', 'y'] },
  { id: 'S25', items: [] },
  { id: 'S26', items: ['ur', 'ir', 'er'] },
  { id: 'S27', items: [] },
  { id: 'S28', items: ['a-e', 'i-e', 'o-e', 'u-e'] },
  { id: 'S29', items: ['oa', 'ow', 'o-e', 'oe'] },
  { id: 'S30', items: ['ew', 'ue', 'oo', 'u-e'] },
  { id: 'S31', items: ['oi', 'oy', 'ou', 'ow'] },
  { id: 'S32', items: ['or', 'aw', 'au', 'ore', 'e-e', 'y'] },
];

// current: the step served; passed: steps passed or placed.
export function ctxAt(current: string, passed: string[] = []): SpellCtx {
  return makeSpellCtx(S_LADDER, (s) => (s === current ? 'current' : passed.includes(s) ? 'passed' : 'locked'), current);
}

const e = (name: string, split: [string, string[]][], pic: NameEntry['pic'] = null): NameEntry => ({
  name, key: name.toLowerCase(), split: split.map(([g, ph]) => ({ g, ph })), ph: split.flatMap(([, ph]) => ph),
  first: split[0][1][0], pic, tier: 1,
});
export const BANK: NameEntry[] = [
  e('Ken', [['K', ['k']], ['e', ['e']], ['n', ['n']]]),
  e('Pip', [['P', ['p']], ['i', ['i']], ['p', ['p']]]),
  e('Tam', [['T', ['t']], ['a', ['a']], ['m', ['m']]]),
  e('Sam', [['S', ['s']], ['a', ['a']], ['m', ['m']]]),
  e('Meg', [['M', ['m']], ['e', ['e']], ['g', ['g']]]),
  e('Dan', [['D', ['d']], ['a', ['a']], ['n', ['n']]]),
  e('Max', [['M', ['m']], ['a', ['a']], ['x', ['k', 's']]]),
  e('Ted', [['T', ['t']], ['e', ['e']], ['d', ['d']]]),
  e('Bella', [['B', ['b']], ['e', ['e']], ['ll', ['l']], ['a', ['uh']]]),
  e('Lily', [['L', ['l']], ['i', ['i']], ['l', ['l']], ['y', ['ee']]], 'flowers'),
  e('Daisy', [['D', ['d']], ['ai', ['ai']], ['s', ['z']], ['y', ['ee']]], 'flowers'),
  e('Rose', [['R', ['r']], ['o-e', ['oa']], ['s', ['z']]], 'flowers'),
  e('Ruby', [['R', ['r']], ['u', ['oo']], ['b', ['b']], ['y', ['ee']]], 'gems'),
  e('Luna', [['L', ['l']], ['u', ['oo']], ['n', ['n']], ['a', ['uh']]], 'sky'),
  e('Sky', [['S', ['s']], ['k', ['k']], ['y', ['igh']]], 'sky'),
  e('Lee', [['L', ['l']], ['ee', ['ee']]]),
  e('Sophie', [['S', ['s']], ['o', ['oa']], ['ph', ['f']], ['ie', ['ee']]]),
  e('Charlotte', [['Ch', ['sh']], ['ar', ['ar']], ['l', ['l']], ['o', ['uh']], ['tt', ['t']], ['e', []]]),
  e('Cassie', [['C', ['k']], ['a', ['a']], ['ss', ['s']], ['ie', ['ee']]]),
];
export const NO_CLIP = new Set(['meg']);
export const hasClip = (k: string) => !NO_CLIP.has(k);

export const BLOCK_FILE: BlocklistFile = {
  v: 1,
  words: [
    { w: 'fuck', kind: 'strong', lang: 'en' }, { w: 'shit', kind: 'strong', lang: 'en' },
    { w: 'cunt', kind: 'strong', lang: 'en' }, { w: 'poo', kind: 'toilet', lang: 'en' },
    { w: 'wee', kind: 'toilet', lang: 'en' }, { w: 'bum', kind: 'rude', lang: 'en' },
    { w: 'piss', kind: 'rude', lang: 'en' }, { w: 'fanny', kind: 'rude', lang: 'en' },
    { w: 'ass', kind: 'rude', lang: 'en' }, { w: 'kut', kind: 'rude', lang: 'nl' }, { w: 'lul', kind: 'rude', lang: 'nl' },
  ],
};
```

`tests/naming/sounds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { builtPhonemes, firstSoundGem, gemSoundKey, hasVowel, soundKey, spellingToGems, usualSound } from '../../src/core/naming/sounds.ts';
import { checkBlocked, compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { BLOCK_FILE } from './fixtures.ts';

describe('sounds', () => {
  it('splits spellings greedily into gems', () => {
    expect(spellingToGems('fuck')).toEqual(['f', 'u', 'ck']);
    expect(spellingToGems('Sophie')).toEqual(['s', 'o', 'ph', 'ie']);
    expect(spellingToGems('shell')).toEqual(['sh', 'e', 'll']);
  });
  it('knows usual sounds and refuses unknown gems', () => {
    expect(usualSound('x')).toEqual(['k', 's']);
    expect(usualSound('a-e')).toEqual(['ai']);
    expect(usualSound('K')).toEqual(['k']);
    expect(usualSound('zq')).toBeNull();
  });
  it('reads y, a final i and a magic e the way names are said', () => {
    expect(builtPhonemes(['S', 'k', 'y'])).toEqual(['s', 'k', 'igh']);
    expect(builtPhonemes(['L', 'y', 'n'])).toEqual(['l', 'i', 'n']);
    expect(builtPhonemes(['L', 'i', 'l', 'y'])).toEqual(['l', 'i', 'l', 'ee']);
    expect(builtPhonemes(['L', 'i', 'l', 'i'])).toEqual(['l', 'i', 'l', 'ee']);
    expect(builtPhonemes(['Y', 'a', 's', 'm', 'i', 'n'])).toEqual(['y', 'a', 's', 'm', 'i', 'n']);
    expect(builtPhonemes(['R', 'o', 's', 'e'])).toEqual(['r', 'oa', 's']);
    expect(builtPhonemes(['T', 'a', 'm'])).toEqual(['t', 'a', 'm']);
  });
  it('makes sound keys that ignore doubled letters, a final s or z, and n before k', () => {
    expect(soundKey(['l', 'i', 'l', 'ee'])).toBe(soundKey(builtPhonemes(['L', 'i', 'l', 'i'])));
    expect(soundKey(['r', 'oa', 'z'])).toBe(soundKey(builtPhonemes(['R', 'o', 's', 'e'])));
    expect(soundKey(['w', 'a', 'ng', 'k'])).toBe(soundKey(['w', 'a', 'n', 'k']));
    expect(soundKey(['b', 'e', 'l', 'l'])).toBe(soundKey(['b', 'e', 'l']));
  });
  it('counts y as a vowel only when there is no other', () => {
    expect(hasVowel(['t', 'm', 'n'])).toBe(false);
    expect(hasVowel(['S', 'k', 'y'])).toBe(true);
    expect(hasVowel(['p', 'i', 'p'])).toBe(true);
  });
  it('finds phonics clips for gems and a gem for each first sound', () => {
    expect(gemSoundKey('ay')).toBe('ai');
    expect(gemSoundKey('ck')).toBe('ck');
    expect(gemSoundKey('a-e')).toBe('ai');
    expect(firstSoundGem('k')).toBe('c');
    expect(firstSoundGem('sh')).toBe('sh');
  });
});

describe('blocklist', () => {
  const bl = compileBlocklist(BLOCK_FILE);
  it('blocks by sound, whatever the spelling or case', () => {
    expect(checkBlocked(['f', 'u', 'k'], bl)).toBe('strong');
    expect(checkBlocked(['ph', 'u', 'k'], bl)).toBe('strong');
    expect(checkBlocked(['F', 'u', 'ck'], bl)).toBe('strong');
    expect(checkBlocked(['p', 'oo'], bl)).toBe('toilet');
    expect(checkBlocked(['k', 'u', 't'], bl)).toBe('rude');
    expect(checkBlocked(['f', 'a', 'n', 'i'], bl)).toBe('rude');
  });
  it('checks only strong words inside longer names', () => {
    expect(checkBlocked(['M', 'a', 'x', 'f', 'u', 'k'], bl)).toBe('strong');
    expect(checkBlocked(['P', 'oo', 'j', 'a'], bl)).toBeNull();
    expect(checkBlocked(['C', 'a', 'ss', 'i', 'd', 'y'], bl)).toBeNull();
    expect(checkBlocked(['S', 'c', 'ar', 'l', 'e', 'tt'], bl)).toBeNull();
    expect(checkBlocked(['P', 'o', 'm'], bl)).toBeNull();
  });
  const real = new URL('../../../../shared/blocklist.json', import.meta.url);
  it.skipIf(!existsSync(real))('lets real names through the shared list', () => {
    const shared = compileBlocklist(JSON.parse(readFileSync(real, 'utf8')));
    for (const name of [['C', 'a', 'ss', 'i', 'd', 'y'], ['S', 'c', 'ar', 'l', 'e', 'tt'], ['P', 'o', 'm'], ['L', 'i', 'l', 'y'], ['P', 'i', 'p']]) {
      expect(checkBlocked(name, shared)).toBeNull();
    }
    expect(checkBlocked(['f', 'u', 'k'], shared)).toBe('strong');
  });
});
```

The shared-list test is skipped only until CONTENT commits `shared/blocklist.json`. The integrator checks it runs (not skipped) before Wave A is called done.

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/naming/sounds.test.ts`
Expected: FAIL, cannot resolve `src/core/naming/sounds.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/naming/sounds.ts`:

```ts
export type Phoneme = string;

// Usual sound of every gem. Insertion order is the fixed tray order (phonics order).
const USUAL: Record<string, Phoneme[]> = {
  s: ['s'], a: ['a'], t: ['t'], p: ['p'], i: ['i'], n: ['n'], m: ['m'], d: ['d'],
  g: ['g'], o: ['o'], c: ['k'], k: ['k'], ck: ['k'], e: ['e'], u: ['u'], r: ['r'],
  h: ['h'], b: ['b'], f: ['f'], ff: ['f'], l: ['l'], ll: ['l'], ss: ['s'],
  j: ['j'], v: ['v'], w: ['w'], x: ['k', 's'], y: ['y'], z: ['z'], zz: ['z'], qu: ['k', 'w'],
  ch: ['ch'], sh: ['sh'], th: ['th'], ng: ['ng'], nk: ['ng', 'k'],
  ai: ['ai'], ee: ['ee'], igh: ['igh'], oa: ['oa'], oo: ['oo'], ar: ['ar'], or: ['or'], ur: ['ur'],
  ow: ['ow'], oi: ['oi'], ear: ['ear'], air: ['air'], er: ['er'],
  ay: ['ai'], 'a-e': ['ai'], ea: ['ee'], ie: ['igh'], 'i-e': ['igh'], ir: ['ur'], 'o-e': ['oa'], oe: ['oa'],
  ew: ['oo'], ue: ['oo'], 'u-e': ['yoo'], 'e-e': ['ee'], ey: ['ai'],
  ph: ['f'], wh: ['w'], ou: ['ow'], oy: ['oi'], aw: ['or'], au: ['or'], ore: ['or'], kn: ['n'], wr: ['r'],
  tch: ['ch'], dge: ['j'], bb: ['b'], dd: ['d'], gg: ['g'], mm: ['m'], nn: ['n'], pp: ['p'], rr: ['r'], tt: ['t'],
  q: ['k'],
};
export const GEM_ORDER: readonly string[] = Object.keys(USUAL);

const VOWEL_GEMS = new Set(['a', 'e', 'i', 'o', 'u', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi',
  'ear', 'air', 'er', 'ay', 'a-e', 'ea', 'ie', 'i-e', 'ir', 'o-e', 'oe', 'ew', 'ue', 'u-e', 'e-e', 'ey', 'ou', 'oy',
  'aw', 'au', 'ore']);
const VOWEL_PH = new Set(['a', 'e', 'i', 'o', 'u', 'ai', 'ee', 'igh', 'oa', 'oo', 'uu', 'ar', 'or', 'ur', 'ow', 'oi',
  'ear', 'air', 'er', 'uh', 'yoo']);
const PHONICS = new Set(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b',
  'f', 'ff', 'l', 'll', 'ss', 'j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'nk', 'ai', 'ee',
  'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'er']);
const MULTI = GEM_ORDER.filter((g) => g.length > 1 && !g.includes('-')).sort((a, b) => b.length - a.length);
const LONG: Record<string, Phoneme> = { a: 'ai', e: 'ee', i: 'igh', o: 'oa', u: 'yoo' };

export function usualSound(g: string): Phoneme[] | null {
  return USUAL[g.toLowerCase()] ?? null;
}
export function isVowelGem(g: string): boolean {
  return VOWEL_GEMS.has(g.toLowerCase());
}
export function isVowelPhoneme(p: Phoneme): boolean {
  return VOWEL_PH.has(p);
}
export function hasVowel(gems: string[]): boolean {
  return gems.some((g) => isVowelGem(g) || g.toLowerCase() === 'y');
}

export function spellingToGems(word: string): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  for (let i = 0; i < w.length;) {
    const m = MULTI.find((g) => w.startsWith(g, i));
    if (m) { out.push(m); i += m.length; } else { out.push(w[i]); i++; }
  }
  return out;
}

// How Elizabeth would read a name built from gems (spec 2.8 checks 3 and 4).
export function builtPhonemes(gems: string[]): Phoneme[] {
  const gs = gems.map((g) => g.toLowerCase());
  const n = gs.length;
  const out: Phoneme[][] = gs.map((g) => [...(USUAL[g] ?? [g])]);
  const otherVowel = gs.some((g) => VOWEL_GEMS.has(g));
  gs.forEach((g, i) => {
    if (g !== 'y') return;
    if (i === 0 && n > 1) out[i] = ['y'];
    else if (!otherVowel) out[i] = [i === n - 1 ? 'igh' : 'i'];
    else out[i] = [i === n - 1 ? 'ee' : 'i'];
  });
  const last = gs[n - 1];
  if (n >= 3 && (last === 'i' || last === 'ie' || last === 'ey') && !VOWEL_GEMS.has(gs[n - 2])) out[n - 1] = ['ee'];
  if (n >= 3 && last === 'e' && !VOWEL_GEMS.has(gs[n - 2]) && gs[n - 2] !== 'y' && LONG[gs[n - 3]]) {
    out[n - 3] = [LONG[gs[n - 3]]];
    out[n - 1] = [];
  }
  return out.flat();
}

export function soundKey(ph: Phoneme[]): string {
  const p = ph.filter((x) => x !== '');
  const out: string[] = [];
  p.forEach((x, i) => {
    let y = x;
    if (y === 'ng' && (p[i + 1] === 'k' || p[i + 1] === 'g')) y = 'n';
    if (i === p.length - 1 && y === 'z') y = 's';
    if (out.length && out[out.length - 1] === y && !VOWEL_PH.has(y)) return;
    out.push(y);
  });
  return out.join('.');
}

export function phonemeSoundKey(p: Phoneme): string | null {
  if (PHONICS.has(p)) return p;
  return p === 'dh' ? 'th' : p === 'uu' ? 'oo' : null;
}
export function gemSoundKey(g: string): string | null {
  const l = g.toLowerCase();
  if (PHONICS.has(l)) return l;
  const u = USUAL[l];
  return u && u.length === 1 ? phonemeSoundKey(u[0]) : null;
}
export function firstSoundGem(p: Phoneme): string | null {
  return GEM_ORDER.find((g) => !g.includes('-') && USUAL[g].length === 1 && USUAL[g][0] === p) ?? null;
}
```

`src/core/naming/blocklist.ts`:

```ts
import { builtPhonemes, soundKey, spellingToGems } from './sounds.ts';

export type BlockKind = 'strong' | 'rude' | 'toilet';
export type BlocklistFile = { v: 1; words: { w: string; kind: BlockKind; lang: 'en' | 'nl' }[] };
export type Blocklist = { whole: Map<string, BlockKind>; parts: { seq: string[]; kind: BlockKind }[] };

const keyOf = (gems: string[]) => soundKey(builtPhonemes(gems));

export function compileBlocklist(file: BlocklistFile): Blocklist {
  const whole = new Map<string, BlockKind>();
  const parts: { seq: string[]; kind: BlockKind }[] = [];
  for (const { w, kind } of file.words) {
    const key = keyOf(spellingToGems(w));
    if (!whole.has(key) || kind === 'strong') whole.set(key, kind);
    // Spec 2.8: inside longer names only the strong words are checked as parts.
    if (kind === 'strong') parts.push({ seq: key.split('.'), kind });
  }
  return { whole, parts };
}

function contains(hay: string[], needle: string[]): boolean {
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((x, j) => hay[i + j] === x)) return true;
  }
  return false;
}

export function checkBlocked(gems: string[], bl: Blocklist): BlockKind | null {
  const key = keyOf(gems);
  const whole = bl.whole.get(key);
  if (whole) return whole;
  const seq = key.split('.');
  for (const p of bl.parts) if (contains(seq, p.seq)) return p.kind;
  return null;
}
```

Note: Dutch words are compared by their English reading of the letters (`kut` as k, u, t), because the check is about what she can build with gems. They are never shown or played.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/naming/sounds.test.ts`
Expected: PASS (the shared-list test is skipped until `shared/blocklist.json` exists, then passes).

- [ ] **Step 5: Commit**

```bash
git add src/core/naming/sounds.ts src/core/naming/blocklist.ts tests/naming/fixtures.ts tests/naming/sounds.test.ts
git commit -m "Add name sounds and the blocklist checked by sound"
```

**Acceptance:** tests pass; Cassidy and Scarlett pass, `fuk` and `phuk` are caught.

---

### Task 11: Gift gems

**Files:**
- Create: `src/core/naming/gifts.ts`
- Test: `tests/naming/gifts.test.ts`

**Interfaces:**
- Consumes: `usualSound`, `Phoneme` (Task 10); `StepState` (Task 1).
- Produces:

```ts
export type SpellCtx = { step: string; rank: (step: string) => number; introStep: (g: string) => string | undefined;
  reached: (step: string) => boolean; passed: (step: string) => boolean };
export function makeSpellCtx(ladder: { id: string; items: string[] }[], status: (step: string) => StepState, current: string): SpellCtx;
export type GiftWhy = 'above-step' | 'not-usual' | 'choice' | 'final-voiced';
export type Slot = { index: number; g: string; ph: Phoneme[]; own: boolean; why: GiftWhy | null };
export const CHOICE_STEP: Record<string, string>;
export const ALT_SPELLING: Record<string, string>;
export function giftSlots(split: { g: string; ph: Phoneme[] }[], ctx: SpellCtx): Slot[];
export function ownCount(slots: Slot[]): number;
export function isFreeNaming(slots: Slot[]): boolean;
```

- [ ] **Step 1: Write the failing test**

`tests/naming/gifts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { giftSlots, isFreeNaming, ownCount } from '../../src/core/naming/gifts.ts';
import { BANK, ctxAt } from './fixtures.ts';

const N = (name: string) => BANK.find((b) => b.name === name)!.split;
const own = (name: string, ctx = ctxAt('S12', ['S02', 'S03', 'S04', 'S05', 'S07', 'S09', 'S11'])) =>
  giftSlots(N(name), ctx).map((s) => s.own);

describe('giftSlots', () => {
  it('Bella at S12: the final a is a gift because it is not its usual sound', () => {
    expect(own('Bella')).toEqual([true, true, true, false]);
  });
  it('Daisy at S12: D and ai are hers, the s and the y are gifts', () => {
    const s = giftSlots(N('Daisy'), ctxAt('S12'));
    expect(s.map((x) => x.own)).toEqual([true, true, false, false]);
    expect(s[2].why).toBe('not-usual');
    expect(s[3].why).toBe('choice');
  });
  it('Daisy at S20 keeps ai, because S20 teaches that choice', () => {
    expect(ownCount(giftSlots(N('Daisy'), ctxAt('S20')))).toBe(2);
  });
  it('Lee at S20: ee has another spelling and S22 is not reached, so it is free naming', () => {
    const s = giftSlots(N('Lee'), ctxAt('S20'));
    expect(s[1]).toMatchObject({ own: false, why: 'choice' });
    expect(isFreeNaming(s)).toBe(true);
  });
  it('Lily: the y is a gift until S32', () => {
    expect(own('Lily')).toEqual([true, true, true, false]);
    expect(giftSlots(N('Lily'), ctxAt('S32')).map((x) => x.own)).toEqual([true, true, true, true]);
  });
  it('Rose is free naming at S12 and has two own slots at S29', () => {
    const s12 = giftSlots(N('Rose'), ctxAt('S12'));
    expect(s12[1].why).toBe('above-step');
    expect(isFreeNaming(s12)).toBe(true);
    expect(ownCount(giftSlots(N('Rose'), ctxAt('S29')))).toBe(2);
  });
  it('Sophie is free naming at S12', () => {
    expect(ownCount(giftSlots(N('Sophie'), ctxAt('S12')))).toBe(1);
  });
  it('a final d is a gift until S06 is passed', () => {
    expect(giftSlots(N('Ted'), ctxAt('S12'))[2]).toMatchObject({ own: false, why: 'final-voiced' });
    expect(giftSlots(N('Ted'), ctxAt('S12', ['S06']))[2].own).toBe(true);
  });
  it('S01: only the first sound is hers', () => {
    expect(giftSlots(N('Tam'), ctxAt('S01')).map((x) => x.own)).toEqual([true, false, false]);
    expect(giftSlots(N('Bella'), ctxAt('S01')).map((x) => x.own)).toEqual([false, false, false, false]);
  });
  it('a silent letter is always a gift', () => {
    const s = giftSlots(N('Charlotte'), ctxAt('S12'));
    expect(s[5]).toMatchObject({ own: false, why: 'not-usual' });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/naming/gifts.test.ts`
Expected: FAIL, cannot resolve `src/core/naming/gifts.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/naming/gifts.ts`:

```ts
import type { StepState } from '../heartbeat/types.ts';
import { type Phoneme, usualSound } from './sounds.ts';

export type SpellCtx = {
  step: string;                                  // the spelling step that sets difficulty
  rank: (step: string) => number;                // ladder order
  introStep: (g: string) => string | undefined;  // first spelling step whose items include g
  reached: (step: string) => boolean;            // passed, placed or current
  passed: (step: string) => boolean;             // passed or placed
};

export function makeSpellCtx(ladder: { id: string; items: string[] }[], status: (step: string) => StepState, current: string): SpellCtx {
  const order = new Map(ladder.map((s, i) => [s.id, i] as const));
  const intro = new Map<string, string>();
  for (const s of ladder) {
    for (const it of s.items) {
      if (it.startsWith('tw:') || it.startsWith('-') || it === 'capital') continue;
      const g = it.toLowerCase();
      if (!intro.has(g)) intro.set(g, s.id);
    }
  }
  const passed = (s: string) => { const k = status(s); return k === 'passed' || k === 'placed'; };
  return {
    step: current,
    rank: (s) => order.get(s) ?? Number.POSITIVE_INFINITY,
    introStep: (g) => intro.get(g.toLowerCase()),
    passed,
    reached: (s) => passed(s) || status(s) === 'current',
  };
}

export type GiftWhy = 'above-step' | 'not-usual' | 'choice' | 'final-voiced';
export type Slot = { index: number; g: string; ph: Phoneme[]; own: boolean; why: GiftWhy | null };

// Sounds with more than one spelling, and the step that teaches the choice (curriculum.md 4.2).
export const CHOICE_STEP: Record<string, string> = {
  ai: 'S20', ee: 'S22', igh: 'S24', ur: 'S26', oa: 'S29', oo: 'S30', yoo: 'S30', oi: 'S31', ow: 'S31', or: 'S32',
};
// A grapheme with a sound that is not its usual one, taught at a later step ("grapheme:sound").
export const ALT_SPELLING: Record<string, string> = {
  'y:ee': 'S32', 'y:igh': 'S24', 'ow:oa': 'S29', 'ew:yoo': 'S30', 'u-e:oo': 'S30', 'er:ur': 'S26',
};
const FINAL_VOICED = new Set(['b', 'd', 'g', 'v', 'z']);

export function giftSlots(split: { g: string; ph: Phoneme[] }[], ctx: SpellCtx): Slot[] {
  const S20 = ctx.rank('S20');
  let lastSounding = -1;
  split.forEach((s, i) => { if (s.ph.length) lastSounding = i; });
  return split.map((s, index): Slot => {
    const g = s.g.toLowerCase();
    const gift = (why: GiftWhy): Slot => ({ index, g: s.g, ph: s.ph, own: false, why });
    const mine: Slot = { index, g: s.g, ph: s.ph, own: true, why: null };
    if (!s.ph.length) return gift('not-usual');
    if (ctx.step === 'S01') {
      // S01 is the first sound only: the first slot is hers when it is a Phase 2 sound, everything else is a gift.
      const u = usualSound(g);
      const intro = ctx.introStep(g);
      const ok = index === 0 && !!u && u.join('.') === s.ph.join('.') && !!intro && ctx.rank(intro) <= ctx.rank('S03');
      return ok ? mine : gift('above-step');
    }
    if (index === lastSounding && s.ph.length === 1 && FINAL_VOICED.has(s.ph[0]) && !ctx.passed('S06')) return gift('final-voiced');
    const alt = ALT_SPELLING[`${g}:${s.ph.join('')}`];
    if (alt) return ctx.reached(alt) ? mine : gift('choice');
    const usual = usualSound(g);
    if (!usual || usual.join('.') !== s.ph.join('.')) return gift('not-usual');
    const intro = ctx.introStep(g);
    if (!intro || ctx.rank(intro) > ctx.rank(ctx.step)) return gift('above-step');
    const choice = s.ph.length === 1 ? CHOICE_STEP[s.ph[0]] : undefined;
    if (choice && ctx.rank(ctx.step) >= S20 && !ctx.reached(choice)) return gift('choice');
    return mine;
  });
}

export function ownCount(slots: Slot[]): number {
  return slots.filter((s) => s.own).length;
}
export function isFreeNaming(slots: Slot[]): boolean {
  return ownCount(slots) < 2;
}
```

Decision recorded here: "The first slot is a crowned capital. Before S11 it is a gift" (spec 2.8) is read as "the capital form is the gift". The first slot's sound stays hers (S01 is the first sound of a bell name), and the gem flips to a crowned capital when placed. From S11 the tray holds both forms and picking the capital is the S11 item (Task 13 and Task 14).

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/naming/gifts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/naming/gifts.ts tests/naming/gifts.test.ts
git commit -m "Add gift gem rules by sound and spelling step"
```

**Acceptance:** the spec's examples (Bella, Daisy, Lily, Rose, Sophie at several steps) pass.

---

### Task 12: Name bells, the name garden and first sounds

**Files:**
- Create: `src/core/naming/bells.ts`
- Test: `tests/naming/bells.test.ts`

**Interfaces:**
- Consumes: `NameEntry` (C11); `SpellCtx`, `giftSlots`, `ownCount` (Task 11); `firstSoundGem`, `GEM_ORDER`, `Phoneme` (Task 10); `Rng`, `shuffle` (C2).
- Produces:

```ts
export const GARDEN_GROUPS: readonly ['flowers', 'gems', 'sky', 'sweets'];
export type GardenGroup = (typeof GARDEN_GROUPS)[number];
export function bellsFor(input: { bank: NameEntry[]; ctx: SpellCtx; herdNames: Set<string>; offered: Set<string>;
  hasClip: (key: string) => boolean; rng: Rng; prefer?: string | null; n?: number }): NameEntry[];
export function gardenNames(input: { bank: NameEntry[]; group: GardenGroup; hasClip: (key: string) => boolean; offered: Set<string>; rng: Rng; n?: number }): NameEntry[];
export function firstSounds(bank: NameEntry[], hasClip: (key: string) => boolean): Phoneme[];
export function namesByFirstSound(input: { bank: NameEntry[]; first: Phoneme; hasClip: (key: string) => boolean; offered: Set<string>; rng: Rng; n?: number }): NameEntry[];
```

- [ ] **Step 1: Write the failing test**

`tests/naming/bells.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bellsFor, firstSounds, gardenNames, namesByFirstSound } from '../../src/core/naming/bells.ts';
import { giftSlots } from '../../src/core/naming/gifts.ts';
import { makeRng } from '../../src/core/rng.ts';
import { BANK, ctxAt, hasClip } from './fixtures.ts';

const ctx = ctxAt('S03', ['S02']);

describe('bellsFor', () => {
  it('rings three names she can spell all of, with clips, not offered before', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const offered = new Set(['pip']);
      const bells = bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered, hasClip, rng: makeRng(seed) });
      expect(bells).toHaveLength(3);
      for (const b of bells) {
        expect(giftSlots(b.split, ctx).every((s) => s.own)).toBe(true);
        expect(b.key).not.toBe('pip');
        expect(b.key).not.toBe('meg');
      }
    }
  });
  it('prefers names with the preferred grapheme', () => {
    const bells = bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered: new Set(), hasClip, rng: makeRng(1), prefer: 'k', n: 1 });
    expect(bells[0].key).toBe('ken');
  });
  it('avoids herd names while others are left', () => {
    const bells = bellsFor({ bank: BANK, ctx, herdNames: new Set(['ken', 'tam']), offered: new Set(), hasClip, rng: makeRng(2), n: 2 });
    expect(bells).toHaveLength(2);
    for (const b of bells) expect(['ken', 'tam']).not.toContain(b.key);
  });
  it('rings three bells at S01, where only the first sound is hers', () => {
    const b = bellsFor({ bank: BANK, ctx: ctxAt('S01'), herdNames: new Set(), offered: new Set(), hasClip, rng: makeRng(5) });
    expect(b).toHaveLength(3);
    for (const e of b) expect(giftSlots(e.split, ctxAt('S01'))[0].own).toBe(true);
  });
  it('returns fewer bells, or none, when the bank runs out', () => {
    const offered = new Set(BANK.map((b) => b.key));
    expect(bellsFor({ bank: BANK, ctx, herdNames: new Set(), offered, hasClip, rng: makeRng(3) })).toEqual([]);
  });
});

describe('the name garden', () => {
  it('offers names from a picture group with clips', () => {
    const flowers = gardenNames({ bank: BANK, group: 'flowers', hasClip, offered: new Set(), rng: makeRng(1) });
    expect(flowers.map((b) => b.key).sort()).toEqual(['daisy', 'lily', 'rose']);
  });
  it('groups names by first sound, so Charlotte is under sh and Cassie under k', () => {
    const sounds = firstSounds(BANK, hasClip);
    expect(sounds).toContain('sh');
    expect(sounds).toContain('k');
    expect(sounds.indexOf('s')).toBeLessThan(sounds.indexOf('sh'));
    const k = namesByFirstSound({ bank: BANK, first: 'k', hasClip, offered: new Set(), rng: makeRng(2) });
    expect(k.map((b) => b.key).sort()).toEqual(['cassie', 'ken']);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/naming/bells.test.ts`
Expected: FAIL, cannot resolve `src/core/naming/bells.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/naming/bells.ts`:

```ts
import { type Rng, shuffle } from '../rng.ts';
import type { NameEntry } from '../heartbeat/types.ts';
import { type SpellCtx, giftSlots, ownCount } from './gifts.ts';
import { GEM_ORDER, type Phoneme, firstSoundGem } from './sounds.ts';

export const GARDEN_GROUPS = ['flowers', 'gems', 'sky', 'sweets'] as const;
export type GardenGroup = (typeof GARDEN_GROUPS)[number];

export function bellsFor(input: {
  bank: NameEntry[]; ctx: SpellCtx; herdNames: Set<string>; offered: Set<string>;
  hasClip: (key: string) => boolean; rng: Rng; prefer?: string | null; n?: number;
}): NameEntry[] {
  const n = input.n ?? 3;
  const scored = input.bank
    .filter((e) => input.hasClip(e.key) && !input.offered.has(e.key))
    .map((e) => {
      const slots = giftSlots(e.split, input.ctx);
      // At S01 she spells only the first sound, so a name with its first slot hers counts as fully hers.
      const all = slots.every((s) => s.own) || (input.ctx.step === 'S01' && slots[0]?.own === true);
      return { e, own: ownCount(slots), all };
    });
  const fresh = (x: { e: NameEntry }) => !input.herdNames.has(x.e.key);
  const preferred = (x: { e: NameEntry }) => x.e.split.some((s) => {
    const g = s.g.toLowerCase();
    return (input.prefer && g === input.prefer.toLowerCase()) || input.ctx.introStep(g) === input.ctx.step;
  });
  const tiers = [
    scored.filter((x) => x.all && fresh(x) && preferred(x)),
    scored.filter((x) => x.all && fresh(x)),
    scored.filter((x) => x.own >= 2 && fresh(x)),
    scored.filter((x) => x.own >= 2),
  ];
  const out: NameEntry[] = [];
  for (const tier of tiers) {
    for (const x of shuffle(tier, input.rng)) {
      if (out.length >= n) return out;
      if (!out.includes(x.e)) out.push(x.e);
    }
  }
  return out;
}

export function gardenNames(input: { bank: NameEntry[]; group: GardenGroup; hasClip: (key: string) => boolean; offered: Set<string>; rng: Rng; n?: number }): NameEntry[] {
  return shuffle(input.bank.filter((e) => e.pic === input.group && input.hasClip(e.key) && !input.offered.has(e.key)), input.rng)
    .slice(0, input.n ?? 3);
}

export function firstSounds(bank: NameEntry[], hasClip: (key: string) => boolean): Phoneme[] {
  const set = new Set(bank.filter((e) => hasClip(e.key)).map((e) => e.first));
  const pos = (p: Phoneme) => { const g = firstSoundGem(p); return g === null ? Number.POSITIVE_INFINITY : GEM_ORDER.indexOf(g); };
  return [...set].filter((p) => firstSoundGem(p) !== null).sort((a, b) => pos(a) - pos(b));
}

export function namesByFirstSound(input: { bank: NameEntry[]; first: Phoneme; hasClip: (key: string) => boolean; offered: Set<string>; rng: Rng; n?: number }): NameEntry[] {
  return shuffle(input.bank.filter((e) => e.first === input.first && input.hasClip(e.key) && !input.offered.has(e.key)), input.rng)
    .slice(0, input.n ?? 3);
}
```

`hasClip` is `audio.hasName`, which is false offline for names whose clips are not cached, so bells and the garden only offer names she can hear (spec 4.6).

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/naming/bells.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/naming/bells.ts tests/naming/bells.test.ts
git commit -m "Add name bells, the name garden and first-sound groups"
```

**Acceptance:** tests pass, including the empty bank (Review focus 4).

---

### Task 13: Gem trays

**Files:**
- Create: `src/core/naming/tray.ts`
- Test: `tests/naming/tray.test.ts`

**Interfaces:**
- Consumes: `Slot`, `SpellCtx` (Task 11); `GEM_ORDER`, `usualSound` (Task 10); `Scaffold` (Task 1); `Rng`, `shuffle` (C2).
- Produces:

```ts
export const AEU: Set<string>;
export const FINAL_PAIRS: [string, string][]; export const ANY_PAIRS: [string, string][]; export const TH_PAIRS: [string, string][];
export function inPairs(pairs: [string, string][], a: string, b: string): boolean;
export function contrastBlocked(target: string, gem: string, isFinal: boolean, ctx: SpellCtx): boolean;
export function capitalOf(g: string): string;
export function planNameTray(input: { slots: Slot[]; scaffold: Scaffold; ctx: SpellCtx; blocked: (gems: string[]) => boolean; rng: Rng }): string[];
export function goldTray(ctx: SpellCtx, herdGems: string[][]): string[];
export function trayCeiling(ctx: SpellCtx): number;
```

- [ ] **Step 1: Write the failing test**

`tests/naming/tray.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { goldTray, planNameTray } from '../../src/core/naming/tray.ts';
import { giftSlots } from '../../src/core/naming/gifts.ts';
import { checkBlocked, compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { makeRng } from '../../src/core/rng.ts';
import { BANK, BLOCK_FILE, ctxAt } from './fixtures.ts';

const bl = compileBlocklist(BLOCK_FILE);
const blocked = (gems: string[]) => checkBlocked(gems, bl) !== null;
const slotsOf = (name: string, ctx: ReturnType<typeof ctxAt>) => giftSlots(BANK.find((b) => b.name === name)!.split, ctx);

describe('planNameTray', () => {
  const ctx = ctxAt('S03', ['S02']);
  it('holds the name gems plus 2, 4 or up to 8 in all', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 1, ctx, blocked, rng: makeRng(seed) })).toHaveLength(5);
      expect(planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 2, ctx, blocked, rng: makeRng(seed) })).toHaveLength(7);
      expect(planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 3, ctx, blocked, rng: makeRng(seed) }).length).toBeGreaterThanOrEqual(7);
    }
  });
  it('never offers a second spelling of a sound in the name, or a Dutch pair before its contrast step', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const tray = planNameTray({ slots: slotsOf('Ken', ctx), scaffold: 3, ctx, blocked, rng: makeRng(seed) });
      expect(tray).toEqual(expect.arrayContaining(['k', 'e', 'n']));
      for (const g of ['c', 'ck', 'a', 'u']) expect(tray).not.toContain(g);
      for (const g of tray) expect(['h', 'b', 'f', 'l', 'j', 'v', 'w', 'x', 'y', 'z']).not.toContain(g);
    }
  });
  it('never offers b for a final p before S06', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = ctxAt('S12', ['S02', 'S03', 'S04']);
      expect(planNameTray({ slots: slotsOf('Pip', c), scaffold: 3, ctx: c, blocked, rng: makeRng(seed) })).not.toContain('b');
    }
  });
  it('never offers a gem that turns the name into a blocked word', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = ctxAt('S12', ['S02', 'S03', 'S04', 'S06']);
      const tray = planNameTray({ slots: slotsOf('Pip', c), scaffold: 3, ctx: c, blocked, rng: makeRng(seed) });
      expect(tray).not.toContain('s');
      expect(tray).not.toContain('ss');
    }
  });
  it('holds the capital and the small letter from S11', () => {
    const c = ctxAt('S12', ['S02', 'S03', 'S04', 'S11']);
    const tray = planNameTray({ slots: slotsOf('Ken', c), scaffold: 1, ctx: c, blocked, rng: makeRng(1) });
    expect(tray).toEqual(expect.arrayContaining(['K', 'k']));
  });
});

describe('a new player at S01', () => {
  it('still gets a tray with distractors and a full gold tray', () => {
    const c = ctxAt('S01');
    expect(planNameTray({ slots: slotsOf('Tam', c), scaffold: 1, ctx: c, blocked, rng: makeRng(1) })).toHaveLength(3);
    expect(goldTray(c, [])).toEqual(expect.arrayContaining(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']));
  });
});

describe('goldTray', () => {
  it('holds every gem at or below her step plus her herd graphemes, in a fixed order', () => {
    const tray = goldTray(ctxAt('S03', ['S02']), [['L', 'i', 'l', 'y'], ['R', 'o-e', 's']]);
    expect(tray.slice(0, 8)).toEqual(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']);
    expect(tray).toEqual(expect.arrayContaining(['ck', 'r', 'l', 'y']));
    expect(tray).not.toContain('o-e');
    expect(tray).not.toContain('h');
    expect(new Set(tray).size).toBe(tray.length);
    expect(tray.indexOf('l')).toBeLessThan(tray.indexOf('y'));
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/naming/tray.test.ts`
Expected: FAIL, cannot resolve `src/core/naming/tray.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/naming/tray.ts`:

```ts
import { type Rng, shuffle } from '../rng.ts';
import type { Scaffold } from '../heartbeat/types.ts';
import type { Slot, SpellCtx } from './gifts.ts';
import { GEM_ORDER, usualSound } from './sounds.ts';

export const AEU = new Set(['a', 'e', 'u']);
export const FINAL_PAIRS: [string, string][] = [['d', 't'], ['g', 'k'], ['g', 'c'], ['g', 'ck'], ['b', 'p']];
export const ANY_PAIRS: [string, string][] = [['v', 'w'], ['j', 'y']];
export const TH_PAIRS: [string, string][] = [['th', 'f'], ['th', 't'], ['th', 'd']];

const DISTRACT: Record<string, string[]> = {
  m: ['n'], n: ['m'], t: ['d'], d: ['t'], p: ['b'], b: ['p', 'd'], a: ['i', 'u'], i: ['a', 'e'], e: ['i'],
  o: ['a', 'i'], u: ['a', 'i'], s: ['z', 'f'], f: ['v', 's'], v: ['f'], k: ['g'], c: ['g'], g: ['k'], l: ['r'],
  r: ['l'], h: ['n'], j: ['g'], w: ['v'], sh: ['ch', 's'], ch: ['sh', 'j'], th: ['f'], ng: ['n'],
  ai: ['ee', 'igh'], ee: ['ai', 'igh'], igh: ['ai', 'ee'], oa: ['oo', 'ow'], oo: ['oa'], ar: ['or'], or: ['ar'],
  ur: ['er'], er: ['ur'],
};

export function inPairs(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// Spec 3.8 rule 1: before its contrast step is passed, a pair never appears as a distractor.
export function contrastBlocked(target: string, gem: string, isFinal: boolean, ctx: SpellCtx): boolean {
  const t = target.toLowerCase();
  const g = gem.toLowerCase();
  if (!ctx.passed('S03D') && AEU.has(t) && AEU.has(g)) return true;
  if (!ctx.passed('S06') && ((isFinal && inPairs(FINAL_PAIRS, t, g)) || inPairs(ANY_PAIRS, t, g))) return true;
  if (!ctx.reached('S07') && inPairs(TH_PAIRS, t, g)) return true;
  return false;
}

export function capitalOf(g: string): string {
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

export function planNameTray(input: { slots: Slot[]; scaffold: Scaffold; ctx: SpellCtx; blocked: (gems: string[]) => boolean; rng: Rng }): string[] {
  const { slots, ctx } = input;
  const own = slots.filter((s) => s.own);
  const targets = [...new Set(own.map((s) => s.g.toLowerCase()))];
  const tray: string[] = [...targets];
  if (ctx.reached('S11') && own.some((s) => s.index === 0)) tray.push(capitalOf(slots[0].g));
  const extra = input.scaffold === 1 ? 2 : input.scaffold === 2 ? 4 : Math.max(2, 8 - tray.length);
  let lastSounding = -1;
  slots.forEach((s, i) => { if (s.ph.length) lastSounding = i; });
  const nameSounds = new Set(slots.map((s) => s.ph.join('.')));
  const gems = slots.map((s) => s.g.toLowerCase());
  const traySounds = () => new Set(tray.map((t) => usualSound(t)?.join('.')));
  const ceiling = trayCeiling(ctx);
  const ok = (g: string): boolean => {
    if (g.includes('-') || tray.some((t) => t.toLowerCase() === g)) return false;
    const intro = ctx.introStep(g);
    if (!intro || ctx.rank(intro) > ceiling) return false;
    const u = usualSound(g);
    if (!u || nameSounds.has(u.join('.')) || traySounds().has(u.join('.'))) return false;
    for (const s of own) {
      if (contrastBlocked(s.g, g, s.index === lastSounding, ctx)) return false;
      const swapped = gems.slice();
      swapped[s.index] = g;
      if (input.blocked(swapped)) return false;
    }
    return true;
  };
  const preferred = shuffle(targets.flatMap((t) => DISTRACT[t] ?? []), input.rng);
  const others = shuffle(GEM_ORDER.filter((g) => !g.includes('-')), input.rng);
  let added = 0;
  for (const g of [...preferred, ...others]) {
    if (added >= extra) break;
    if (ok(g)) { tray.push(g); added++; }
  }
  return shuffle(tray, input.rng);
}

// Decision: below S03 the trays use the Phase 2 sets of S02 and S03 (v2 levels 1 and 2), so a new
// player at S01 still has at least three choices and a usable gold bell.
export function trayCeiling(ctx: SpellCtx): number {
  return Math.max(ctx.rank(ctx.step), ctx.rank('S03'));
}

export function goldTray(ctx: SpellCtx, herdGems: string[][]): string[] {
  const set = new Set<string>();
  const ceiling = trayCeiling(ctx);
  for (const g of GEM_ORDER) {
    if (g.includes('-')) continue;
    const intro = ctx.introStep(g);
    if (intro && ctx.rank(intro) <= ceiling) set.add(g);
  }
  for (const name of herdGems) {
    for (const g of name) {
      const l = g.toLowerCase();
      if (!l.includes('-') && usualSound(l)) set.add(l);
    }
  }
  return GEM_ORDER.filter((g) => set.has(g));
}
```

Split digraph gems stay out of the gold tray because a gold slot holds one gem. Names with a split digraph come through bells and the garden, where the split slot is drawn with its tail (Task 17).

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/naming/tray.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/naming/tray.ts tests/naming/tray.test.ts
git commit -m "Add gem trays with contrast and blocklist rules, and the gold tray"
```

**Acceptance:** tests pass.

---

### Task 14: Gold bell checks, slot judging, results and ordinals

**Files:**
- Create: `src/core/naming/check.ts`
- Test: `tests/naming/check.test.ts`

**Interfaces:**
- Consumes: `builtPhonemes`, `soundKey`, `hasVowel`, `isVowelGem` (Task 10); `checkBlocked`, `Blocklist`, `BlockKind` (Task 10); `Slot` (Task 11); `AEU`, `FINAL_PAIRS`, `ANY_PAIRS`, `TH_PAIRS`, `inPairs` (Task 13); `momentResult` (Task 1); `NameEntry` (C11).
- Produces:

```ts
export const START_SLOTS = 3; export const MIN_SLOTS = 2; export const MAX_SLOTS = 8;
export function canAddSlot(n: number): boolean;
export function canRemoveSlot(n: number): boolean;
export type GoldOutcome = { outcome: 'no-vowel' } | { outcome: 'blocked'; kind: BlockKind } | { outcome: 'list'; entry: NameEntry } | { outcome: 'unknown' };
export function indexBank(bank: NameEntry[]): Map<string, NameEntry>;
export function checkBuild(gems: string[], index: Map<string, NameEntry>, bl: Blocklist): GoldOutcome;
export function displayName(gems: string[]): string;
export function nameKey(name: string): string;
export function classifySpell(target: string, placed: string, isFinal: boolean): ErrorTag;
export type SlotJudge = { ok: boolean; capitalMiss: boolean; error: ErrorTag | null };
export function judgeSlot(slot: Slot, gem: string, capitalItem: boolean, isFinal: boolean): SlotJudge;
export type SlotOutcome = { slot: Slot; misses: number; ghost: boolean };
export function namingResults(input: { carrier: string; served: Served; slots: SlotOutcome[];
  capital: { misses: number; ghost: boolean } | null; hintLevel: number; ms: number; error: ErrorTag | null; baby?: string }): LearnResultDraft[];
export function ordinalFor(name: string, herd: { id: string; name: string | null }[], self: string | null): number;
export function ordinalLine(n: number): string | null;
```

- [ ] **Step 1: Write the failing test**

`tests/naming/check.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canAddSlot, canRemoveSlot, checkBuild, classifySpell, displayName, indexBank, judgeSlot, namingResults, ordinalFor, ordinalLine } from '../../src/core/naming/check.ts';
import { compileBlocklist } from '../../src/core/naming/blocklist.ts';
import { giftSlots } from '../../src/core/naming/gifts.ts';
import { goldTray } from '../../src/core/naming/tray.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BANK, BLOCK_FILE, ctxAt } from './fixtures.ts';

const bl = compileBlocklist(BLOCK_FILE);
const index = indexBank(BANK);

describe('checkBuild', () => {
  it('checks in spec order: vowel, blocked, list, unknown', () => {
    expect(checkBuild(['t', 'm', 'n'], index, bl)).toEqual({ outcome: 'no-vowel' });
    expect(checkBuild(['f', 'u', 'k'], index, bl)).toEqual({ outcome: 'blocked', kind: 'strong' });
    const lili = checkBuild(['L', 'i', 'l', 'i'], index, bl);
    expect(lili.outcome).toBe('list');
    expect(lili.outcome === 'list' && lili.entry.key).toBe('lily');
    expect(checkBuild(['S', 'k', 'y'], index, bl).outcome).toBe('list');
    expect(checkBuild(['T', 'a', 'm', 'o'], index, bl)).toEqual({ outcome: 'unknown' });
  });
  it('never refuses a random build for any reason but no vowel or blocked', () => {
    const tray = goldTray(ctxAt('S12', ['S02', 'S03', 'S04', 'S05', 'S07', 'S09']), []);
    const rng = makeRng(11);
    for (let i = 0; i < 200; i++) {
      const len = 2 + Math.floor(rng() * 7);
      const gems = Array.from({ length: len }, () => tray[Math.floor(rng() * tray.length)]);
      expect(['no-vowel', 'blocked', 'list', 'unknown']).toContain(checkBuild(gems, index, bl).outcome);
    }
  });
});

describe('slots and names', () => {
  it('allows 2 to 8 slots', () => {
    expect(canAddSlot(7)).toBe(true);
    expect(canAddSlot(8)).toBe(false);
    expect(canRemoveSlot(3)).toBe(true);
    expect(canRemoveSlot(2)).toBe(false);
  });
  it('shows her own spelling with a capital', () => {
    expect(displayName(['l', 'i', 'l', 'i'])).toBe('Lili');
    expect(displayName(['Sh', 'a', 'y'])).toBe('Shay');
  });
  it('makes a duplicate royal', () => {
    const herd = [{ id: 'a', name: 'Tim' }, { id: 'b', name: 'tim' }, { id: 'c', name: null }];
    expect(ordinalFor('Tim', herd, 'c')).toBe(3);
    expect(ordinalFor('Tim', herd, 'a')).toBe(2);
    expect(ordinalLine(2)).toBe('name-ordinal-2');
    expect(ordinalLine(1)).toBeNull();
    expect(ordinalLine(21)).toBeNull();
  });
});

describe('judging slots', () => {
  const ken = giftSlots(BANK.find((b) => b.name === 'Ken')!.split, ctxAt('S12', ['S02', 'S03', 'S11']));
  it('tags vowel, Dutch, reversal and other mistakes', () => {
    expect(classifySpell('i', 'o', false)).toBe('vowel');
    expect(classifySpell('a', 'e', false)).toBe('dutch');
    expect(classifySpell('b', 'd', false)).toBe('reversal');
    expect(classifySpell('d', 't', true)).toBe('dutch');
    expect(classifySpell('d', 't', false)).toBe('other');
    expect(classifySpell('m', 's', false)).toBe('other');
  });
  it('needs the capital in slot one from S11, without failing the sound', () => {
    expect(judgeSlot(ken[0], 'K', true, false)).toEqual({ ok: true, capitalMiss: false, error: null });
    expect(judgeSlot(ken[0], 'k', true, false)).toEqual({ ok: false, capitalMiss: true, error: null });
    expect(judgeSlot(ken[0], 'k', false, false)).toEqual({ ok: true, capitalMiss: false, error: null });
    expect(judgeSlot(ken[1], 'i', false, false)).toEqual({ ok: false, capitalMiss: false, error: 'vowel' });
  });
});

describe('namingResults', () => {
  const served: Served = { strand: 's', step: 'S12', id: 'k', carrier: '', items: [], scaffold: 2, probe: false, source: 'current' };
  const ken = giftSlots(BANK.find((b) => b.name === 'Ken')!.split, ctxAt('S12', ['S02', 'S03']));
  it('logs one result with an item per own slot', () => {
    const r = namingResults({ carrier: 'Ken', served, ms: 900, hintLevel: 2, error: 'vowel', capital: null, baby: 'b1',
      slots: [{ slot: ken[0], misses: 0, ghost: false }, { slot: ken[1], misses: 1, ghost: false }, { slot: ken[2], misses: 0, ghost: false }] });
    expect(r).toEqual([{ type: 'learn.result', strand: 's', step: 'S12', carrier: 'Ken', ms: 900, place: 'naming', probe: false,
      source: 'current', baby: 'b1', scaffold: 2, result: 'helped', error: 'vowel',
      items: [{ id: 'k', result: 'first' }, { id: 'e', result: 'miss' }, { id: 'n', result: 'first' }] }]);
  });
  it('adds the S11 capital item when it was asked', () => {
    const r = namingResults({ carrier: 'Ken', served, ms: 900, hintLevel: 0, error: null, capital: { misses: 0, ghost: false },
      slots: ken.map((slot) => ({ slot, misses: 0, ghost: false })) });
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ step: 'S11', items: [{ id: 'capital', result: 'first' }], result: 'first' });
  });
  it('logs the first sound alone at S01', () => {
    const tam = giftSlots(BANK.find((b) => b.name === 'Tam')!.split, ctxAt('S01'));
    const r = namingResults({ carrier: 'Tam', served: { ...served, step: 'S01' }, ms: 1, hintLevel: 0, error: null, capital: null,
      slots: tam.map((slot) => ({ slot, misses: 0, ghost: false })) });
    expect(r).toHaveLength(1);
    expect(r[0].items).toEqual([{ id: 't', result: 'first' }]);
  });
  it('logs nothing for free naming', () => {
    const lee = giftSlots(BANK.find((b) => b.name === 'Lee')!.split, ctxAt('S20'));
    expect(namingResults({ carrier: 'Lee', served, ms: 1, hintLevel: 0, error: null, capital: null,
      slots: lee.map((slot) => ({ slot, misses: 0, ghost: false })) })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/naming/check.test.ts`
Expected: FAIL, cannot resolve `src/core/naming/check.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/naming/check.ts`:

```ts
import type { NameEntry } from '../heartbeat/types.ts';
import type { ErrorTag, LearnResultDraft, Result, Served } from '../heartbeat/types.ts';
import { momentResult } from '../heartbeat/result.ts';
import { lineId } from '../heartbeat/lines.ts';
import { type BlockKind, type Blocklist, checkBlocked } from './blocklist.ts';
import type { Slot } from './gifts.ts';
import { builtPhonemes, hasVowel, isVowelGem, soundKey } from './sounds.ts';
import { AEU, ANY_PAIRS, FINAL_PAIRS, TH_PAIRS, inPairs } from './tray.ts';

export const START_SLOTS = 3;
export const MIN_SLOTS = 2;
export const MAX_SLOTS = 8;
export const canAddSlot = (n: number) => n < MAX_SLOTS;
export const canRemoveSlot = (n: number) => n > MIN_SLOTS;

export type GoldOutcome = { outcome: 'no-vowel' } | { outcome: 'blocked'; kind: BlockKind } | { outcome: 'list'; entry: NameEntry } | { outcome: 'unknown' };

export function indexBank(bank: NameEntry[]): Map<string, NameEntry> {
  const m = new Map<string, NameEntry>();
  for (const e of bank) { const k = soundKey(e.ph); if (!m.has(k)) m.set(k, e); }
  return m;
}

// Spec 2.8, gold bell checks in order. There is no near-match offer.
export function checkBuild(gems: string[], index: Map<string, NameEntry>, bl: Blocklist): GoldOutcome {
  if (!hasVowel(gems)) return { outcome: 'no-vowel' };
  const kind = checkBlocked(gems, bl);
  if (kind) return { outcome: 'blocked', kind };
  const entry = index.get(soundKey(builtPhonemes(gems)));
  return entry ? { outcome: 'list', entry } : { outcome: 'unknown' };
}

export function displayName(gems: string[]): string {
  const s = gems.map((g) => g.toLowerCase()).join('');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export { nameKey } from '../keys.ts';   // contracts C12, the one name key

export function classifySpell(target: string, placed: string, isFinal: boolean): ErrorTag {
  const t = target.toLowerCase();
  const p = placed.toLowerCase();
  if (isVowelGem(t) && isVowelGem(p)) return AEU.has(t) && AEU.has(p) ? 'dutch' : 'vowel';
  if (inPairs([['b', 'd'], ['p', 'q']], t, p)) return 'reversal';
  if ((isFinal && inPairs(FINAL_PAIRS, t, p)) || inPairs(ANY_PAIRS, t, p) || inPairs(TH_PAIRS, t, p)) return 'dutch';
  return 'other';
}

export type SlotJudge = { ok: boolean; capitalMiss: boolean; error: ErrorTag | null };

export function judgeSlot(slot: Slot, gem: string, capitalItem: boolean, isFinal: boolean): SlotJudge {
  if (gem.toLowerCase() !== slot.g.toLowerCase()) return { ok: false, capitalMiss: false, error: classifySpell(slot.g, gem, isFinal) };
  const first = gem.charAt(0);
  if (slot.index === 0 && capitalItem && first !== first.toUpperCase()) return { ok: false, capitalMiss: true, error: null };
  return { ok: true, capitalMiss: false, error: null };
}

export type SlotOutcome = { slot: Slot; misses: number; ghost: boolean };

export function namingResults(input: {
  carrier: string; served: Served; slots: SlotOutcome[]; capital: { misses: number; ghost: boolean } | null;
  hintLevel: number; ms: number; error: ErrorTag | null; baby?: string;
}): LearnResultDraft[] {
  const own = input.slots.filter((s) => s.slot.own);
  // Free naming, never checked (spec 2.8). At S01 the one first-sound slot is the checked item.
  if (own.length < (input.served.step === 'S01' ? 1 : 2)) return [];
  const itemResult = (s: { misses: number; ghost: boolean }): Result => (s.ghost ? 'helped' : s.misses > 0 ? 'miss' : 'first');
  const result = momentResult(own.reduce((n, s) => n + s.misses, 0), input.hintLevel);
  const common = {
    type: 'learn.result' as const, strand: 's' as const, carrier: input.carrier, ms: input.ms, place: 'naming' as const,
    probe: input.served.probe, source: input.served.source, ...(input.baby ? { baby: input.baby } : {}),
  };
  const out: LearnResultDraft[] = [{
    ...common, scaffold: input.served.scaffold, step: input.served.step, result,
    ...(input.error && result !== 'first' ? { error: input.error } : {}),
    items: own.map((s) => ({ id: s.slot.g.toLowerCase(), result: itemResult(s) })),
  }];
  if (input.capital) {
    const r = itemResult(input.capital);
    out.push({ ...common, scaffold: 1, step: 'S11', result: r, items: [{ id: 'capital', result: r }] });
  }
  return out;
}

export function ordinalFor(name: string, herd: { id: string; name: string | null }[], self: string | null): number {
  const k = nameKey(name);
  return 1 + herd.filter((b) => b.id !== self && b.name !== null && nameKey(b.name) === k).length;
}

export function ordinalLine(n: number): string | null {
  return n >= 2 && n <= 20 ? lineId.ordinal(n) : null;
}
```

The `toEqual` in the first `namingResults` test depends on key order only for readability; `toEqual` ignores key order.

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/naming/check.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/naming/check.ts tests/naming/check.test.ts
git commit -m "Add gold bell checks, slot judging, naming results and royal ordinals"
```

**Acceptance:** tests pass, including 200 random gold builds with no refusal other than no vowel and blocked (spec 7.3 check 7, unit level).

---

### Task 15: Action translators

**Files:**
- Create: `src/core/actions/heartbeat.ts`, `src/core/actions/naming.ts`
- Test: `tests/heartbeat/actions.test.ts`

**Interfaces:**
- Consumes: `EggTask`, `EggKind` (Task 2); `HatchRoll` (Task 4); `doorItem` (Task 7); `RollCallPick` (Task 8); `GoldOutcome` (Task 14); `builtPhonemes` (Task 10); types from Task 1.
- Produces:

```ts
// heartbeat.ts
export type EggHatchedDraft = { type: 'egg.hatched'; baby: string; kind: EggKind; breed: BreedId; colours: Colours; traits: Traits; source: 'nest' | 'building' };
export type CareDoneDraft = { type: 'care.done'; baby: string; kind: CareKind };
export type SkyNamedDraft = { type: 'sky.named'; index: number; name: string; gems: string[]; clipKey: string | null };
export type HbDraft = LearnResultDraft | EggHatchedDraft | CareDoneDraft | SkyNamedDraft;
export type HbAction =
  | { type: 'hb.egg.solved'; baby: string; egg: EggTask; served: Served; result: Result; ms: number; error: ErrorTag | null; roll: HatchRoll }
  | { type: 'hb.wish.done'; baby: string; served: Served; word: string; place: 'wish' | 'twin-wish'; result: Result; ms: number; error: ErrorTag | null }
  | { type: 'hb.station.done'; baby: string; served: Served; word: string; result: Result; ms: number; error: ErrorTag | null }
  | { type: 'hb.door.done'; baby: string; number: number; result: Result; ms: number; error: ErrorTag | null; source: Source }
  | { type: 'hb.rollcall.done'; baby: string; pick: RollCallPick; result: Result; ms: number; error: ErrorTag | null; logged: boolean; served: Served | null }
  | { type: 'hb.care'; baby: string; kind: CareKind }
  | { type: 'hb.sky.named'; index: number; name: string; gems: string[]; clipKey: string | null };
export function applyHeartbeat(a: HbAction): HbDraft[];
// naming.ts
export type NameBuiltDraft = { type: 'name.built'; target: NameTarget; route: NameRoute; gems: string[]; phonemes: string[];
  outcome: 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen'; listName?: string; blockKind?: BlockKind };
export type BabyNamedDraft = { type: 'baby.named'; baby: string; name: string; gems: string[]; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean };
export type NameClipHeardDraft = { type: 'name.clipHeard'; baby: string };
export type NamingDraft = LearnResultDraft | NameBuiltDraft | BabyNamedDraft | NameClipHeardDraft;
export type NamingAction =
  | { type: 'name.gold.slide'; target: NameTarget; gems: string[]; outcome: GoldOutcome }
  | { type: 'naming.spelled'; target: NameTarget; route: 'bell' | 'garden-pic' | 'garden-sound'; entryKey: string; phonemes: string[]; gems: string[]; results: LearnResultDraft[] }
  | { type: 'naming.partial'; results: LearnResultDraft[] }
  | { type: 'naming.assign'; baby: string; name: string; gems: string[]; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean }
  | { type: 'name.clipHeard'; baby: string };
export function applyNaming(a: NamingAction): NamingDraft[];
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/actions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
import { applyNaming } from '../../src/core/actions/naming.ts';
import { buildEggTask } from '../../src/core/maths/eggs.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BANK } from '../naming/fixtures.ts';

const m: Served = { strand: 'm', step: 'M10', id: '3+7', carrier: '', items: ['3+7'], scaffold: 2, probe: false, source: 'current' };
const r: Served = { strand: 'r', step: 'R19', id: 'hats', carrier: 'hats', items: ['h', 'a', 't', '-s'], scaffold: 1, probe: false, source: 'school' };
const roll = { breed: 'pebble' as const, colours: { body: '#fff', mane: '#f0f', mane2: '#0ff' }, traits: { shiny: true as const } };

describe('applyHeartbeat', () => {
  it('turns a solved egg into a maths result and a hatch', () => {
    const d = applyHeartbeat({ type: 'hb.egg.solved', baby: 'b1', egg: buildEggTask(m), served: m, result: 'first', ms: 1200, error: null, roll });
    expect(d).toEqual([
      { type: 'learn.result', strand: 'm', step: 'M10', carrier: 'egg:two-stone', items: [{ id: '3+7', result: 'first' }],
        result: 'first', ms: 1200, scaffold: 2, place: 'nest', probe: false, source: 'current', baby: 'b1' },
      { type: 'egg.hatched', baby: 'b1', kind: 'two-stone', breed: 'pebble', colours: roll.colours, traits: roll.traits, source: 'nest' },
    ]);
  });
  it('logs a wish with every item and the error', () => {
    const [d] = applyHeartbeat({ type: 'hb.wish.done', baby: 'b1', served: r, word: 'hats', place: 'wish', result: 'helped', ms: 3000, error: 'other' });
    expect(d).toMatchObject({ strand: 'r', step: 'R19', carrier: 'hats', result: 'helped', error: 'other', place: 'wish',
      items: [{ id: 'h', result: 'helped' }, { id: 'a', result: 'helped' }, { id: 't', result: 'helped' }, { id: '-s', result: 'helped' }] });
  });
  it('logs a station wish as a station moment and a care act', () => {
    const d = applyHeartbeat({ type: 'hb.station.done', baby: 'b1', served: { ...r, step: 'R10', carrier: 'swing' }, word: 'swing', result: 'first', ms: 900, error: null });
    expect(d[0]).toMatchObject({ place: 'station', carrier: 'swing' });
    expect(d[1]).toEqual({ type: 'care.done', baby: 'b1', kind: 'station' });
  });
  it('logs a door under M02 or M07', () => {
    const [d] = applyHeartbeat({ type: 'hb.door.done', baby: 'b2', number: 14, result: 'miss', ms: 2000, error: 'other', source: 'current' });
    expect(d).toMatchObject({ strand: 'm', step: 'M07', carrier: 'door:14', items: [{ id: 'num:14', result: 'miss' }], place: 'door' });
  });
  it('logs roll call names only when logged, and always gives the heart', () => {
    const pick = { kind: 'name' as const, baby: 'b3', name: 'Tam' };
    const yes = applyHeartbeat({ type: 'hb.rollcall.done', baby: 'b3', pick, result: 'first', ms: 800, error: null, logged: true, served: null });
    expect(yes[0]).toMatchObject({ strand: 'name', step: 'name', carrier: 'Tam', items: [{ id: 'name:b3', result: 'first' }], place: 'rollcall' });
    expect(yes[1]).toEqual({ type: 'care.done', baby: 'b3', kind: 'rollcall' });
    const no = applyHeartbeat({ type: 'hb.rollcall.done', baby: 'b3', pick, result: 'first', ms: 800, error: null, logged: false, served: null });
    expect(no).toEqual([{ type: 'care.done', baby: 'b3', kind: 'rollcall' }]);
  });
  it('passes care and sky names through', () => {
    expect(applyHeartbeat({ type: 'hb.care', baby: 'b1', kind: 'brush' })).toEqual([{ type: 'care.done', baby: 'b1', kind: 'brush' }]);
    expect(applyHeartbeat({ type: 'hb.sky.named', index: 0, name: 'Rose', gems: ['R', 'o-e', 's'], clipKey: 'rose' }))
      .toEqual([{ type: 'sky.named', index: 0, name: 'Rose', gems: ['R', 'o-e', 's'], clipKey: 'rose' }]);
  });
});

describe('applyNaming', () => {
  const target = { kind: 'baby' as const, baby: 'b1' };
  it('logs every gold bell slide with its outcome', () => {
    const lily = BANK.find((b) => b.key === 'lily')!;
    expect(applyNaming({ type: 'name.gold.slide', target, gems: ['L', 'i', 'l', 'i'], outcome: { outcome: 'list', entry: lily } }))
      .toEqual([{ type: 'name.built', target, route: 'gold', gems: ['L', 'i', 'l', 'i'], phonemes: ['l', 'i', 'l', 'ee'], outcome: 'list', listName: 'lily' }]);
    expect(applyNaming({ type: 'name.gold.slide', target, gems: ['f', 'u', 'k'], outcome: { outcome: 'blocked', kind: 'strong' } })[0])
      .toMatchObject({ outcome: 'blocked', blockKind: 'strong' });
  });
  it('logs a spelled bell name with its results', () => {
    const res = { type: 'learn.result' as const, strand: 's' as const, step: 'S03', carrier: 'Ken', items: [], result: 'first' as const, ms: 1, scaffold: 1 as const, place: 'naming' as const, probe: false, source: 'current' as const };
    const d = applyNaming({ type: 'naming.spelled', target, route: 'bell', entryKey: 'ken', phonemes: ['k', 'e', 'n'], gems: ['K', 'e', 'n'], results: [res] });
    expect(d).toEqual([res, { type: 'name.built', target, route: 'bell', gems: ['K', 'e', 'n'], phonemes: ['k', 'e', 'n'], outcome: 'chosen', listName: 'ken' }]);
  });
  it('names the baby and records a clip heard', () => {
    expect(applyNaming({ type: 'naming.assign', baby: 'b1', name: 'Tamo', gems: ['T', 'a', 'm', 'o'], clipKey: null, ordinal: 1, route: 'gold', unknown: true }))
      .toEqual([{ type: 'baby.named', baby: 'b1', name: 'Tamo', gems: ['T', 'a', 'm', 'o'], clipKey: null, ordinal: 1, route: 'gold', unknown: true }]);
    expect(applyNaming({ type: 'name.clipHeard', baby: 'b1' })).toEqual([{ type: 'name.clipHeard', baby: 'b1' }]);
    expect(applyNaming({ type: 'naming.partial', results: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/actions.test.ts`
Expected: FAIL, cannot resolve `src/core/actions/heartbeat.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/actions/heartbeat.ts`:

```ts
import type { BreedId, CareKind, Colours, ErrorTag, LearnResultDraft, Result, Served, Source, Traits } from '../heartbeat/types.ts';
import type { EggKind, EggTask } from '../maths/eggs.ts';
import type { HatchRoll } from '../heartbeat/hatch.ts';
import type { RollCallPick } from '../heartbeat/rollcall.ts';
import { doorItem } from '../heartbeat/stables.ts';

export type EggHatchedDraft = { type: 'egg.hatched'; baby: string; kind: EggKind; breed: BreedId; colours: Colours; traits: Traits; source: 'nest' | 'building' };
export type CareDoneDraft = { type: 'care.done'; baby: string; kind: CareKind };
export type SkyNamedDraft = { type: 'sky.named'; index: number; name: string; gems: string[]; clipKey: string | null };
export type HbDraft = LearnResultDraft | EggHatchedDraft | CareDoneDraft | SkyNamedDraft;

export type HbAction =
  | { type: 'hb.egg.solved'; baby: string; egg: EggTask; served: Served; result: Result; ms: number; error: ErrorTag | null; roll: HatchRoll }
  | { type: 'hb.wish.done'; baby: string; served: Served; word: string; place: 'wish' | 'twin-wish'; result: Result; ms: number; error: ErrorTag | null }
  | { type: 'hb.station.done'; baby: string; served: Served; word: string; result: Result; ms: number; error: ErrorTag | null }
  | { type: 'hb.door.done'; baby: string; number: number; result: Result; ms: number; error: ErrorTag | null; source: Source }
  | { type: 'hb.rollcall.done'; baby: string; pick: RollCallPick; result: Result; ms: number; error: ErrorTag | null; logged: boolean; served: Served | null }
  | { type: 'hb.care'; baby: string; kind: CareKind }
  | { type: 'hb.sky.named'; index: number; name: string; gems: string[]; clipKey: string | null };

type LrIn = Omit<LearnResultDraft, 'type' | 'error' | 'moment' | 'slot'> & { error: ErrorTag | null; via?: Served | null };
function lr(x: LrIn): LearnResultDraft {
  const { error, via, ...rest } = x;
  const pass = { ...(via?.moment ? { moment: via.moment } : {}), ...(via?.slot ? { slot: via.slot } : {}) };
  return error ? { type: 'learn.result', ...rest, ...pass, error } : { type: 'learn.result', ...rest, ...pass };
}
const all = (ids: string[], result: Result) => ids.map((id) => ({ id, result }));

export function applyHeartbeat(a: HbAction): HbDraft[] {
  switch (a.type) {
    case 'hb.egg.solved':
      return [
        lr({ strand: 'm', step: a.served.step, carrier: `egg:${a.egg.kind}`, items: all(a.served.items, a.result), result: a.result,
          ms: a.ms, scaffold: a.served.scaffold, error: a.error, place: 'nest', probe: a.served.probe, source: a.served.source, baby: a.baby, via: a.served }),
        { type: 'egg.hatched', baby: a.baby, kind: a.egg.kind, breed: a.roll.breed, colours: a.roll.colours, traits: a.roll.traits, source: 'nest' },
      ];
    case 'hb.wish.done':
      return [lr({ strand: 'r', step: a.served.step, carrier: a.word, items: all(a.served.items, a.result), result: a.result, ms: a.ms,
        scaffold: a.served.scaffold, error: a.error, place: a.place, probe: a.served.probe, source: a.served.source, baby: a.baby, via: a.served })];
    case 'hb.station.done':
      return [
        lr({ strand: 'r', step: a.served.step, carrier: a.word, items: all(a.served.items, a.result), result: a.result, ms: a.ms,
          scaffold: a.served.scaffold, error: a.error, place: 'station', probe: a.served.probe, source: a.served.source, baby: a.baby, via: a.served }),
        { type: 'care.done', baby: a.baby, kind: 'station' },
      ];
    case 'hb.door.done': {
      const d = doorItem(a.number);
      return [lr({ strand: 'm', step: d.step, carrier: `door:${a.number}`, items: all([d.id], a.result), result: a.result, ms: a.ms,
        scaffold: 3, error: a.error, place: 'door', probe: false, source: a.source, baby: a.baby })];
    }
    case 'hb.rollcall.done': {
      const out: HbDraft[] = [];
      if (a.logged && a.pick.kind === 'name') {
        out.push(lr({ strand: 'name', step: 'name', carrier: a.pick.name, items: all([`name:${a.baby}`], a.result),
          result: a.result, ms: a.ms, scaffold: 3, error: a.error, place: 'rollcall', probe: false, source: 'review', baby: a.baby }));
      }
      if (a.logged && a.pick.kind === 'door') {
        const d = doorItem(a.pick.number);
        out.push(lr({ strand: 'm', step: d.step, carrier: `door:${a.pick.number}`, items: all([d.id], a.result), result: a.result,
          ms: a.ms, scaffold: a.served?.scaffold ?? 3, error: a.error, place: 'rollcall', probe: a.served?.probe ?? false,
          source: a.served?.source ?? 'current', baby: a.baby, via: a.served }));
      }
      out.push({ type: 'care.done', baby: a.baby, kind: 'rollcall' });
      return out;
    }
    case 'hb.care':
      return [{ type: 'care.done', baby: a.baby, kind: a.kind }];
    case 'hb.sky.named':
      return [{ type: 'sky.named', index: a.index, name: a.name, gems: a.gems, clipKey: a.clipKey }];
  }
}
```

`src/core/actions/naming.ts`:

```ts
import type { LearnResultDraft, NameRoute, NameTarget } from '../heartbeat/types.ts';
import type { BlockKind } from '../naming/blocklist.ts';
import type { GoldOutcome } from '../naming/check.ts';
import { builtPhonemes } from '../naming/sounds.ts';

export type NameBuiltDraft = { type: 'name.built'; target: NameTarget; route: NameRoute; gems: string[]; phonemes: string[];
  outcome: 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen'; listName?: string; blockKind?: BlockKind };
export type BabyNamedDraft = { type: 'baby.named'; baby: string; name: string; gems: string[]; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean };
export type NameClipHeardDraft = { type: 'name.clipHeard'; baby: string };
export type NamingDraft = LearnResultDraft | NameBuiltDraft | BabyNamedDraft | NameClipHeardDraft;

export type NamingAction =
  | { type: 'name.gold.slide'; target: NameTarget; gems: string[]; outcome: GoldOutcome }
  | { type: 'naming.spelled'; target: NameTarget; route: 'bell' | 'garden-pic' | 'garden-sound'; entryKey: string; phonemes: string[]; gems: string[]; results: LearnResultDraft[] }
  | { type: 'naming.partial'; results: LearnResultDraft[] }
  | { type: 'naming.assign'; baby: string; name: string; gems: string[]; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean }
  | { type: 'name.clipHeard'; baby: string };

export function applyNaming(a: NamingAction): NamingDraft[] {
  switch (a.type) {
    case 'name.gold.slide': {
      const o = a.outcome;
      return [{
        type: 'name.built', target: a.target, route: 'gold', gems: a.gems, phonemes: builtPhonemes(a.gems), outcome: o.outcome,
        ...(o.outcome === 'list' ? { listName: o.entry.key } : {}),
        ...(o.outcome === 'blocked' ? { blockKind: o.kind } : {}),
      }];
    }
    case 'naming.spelled':
      return [...a.results, { type: 'name.built', target: a.target, route: a.route, gems: a.gems, phonemes: a.phonemes, outcome: 'chosen', listName: a.entryKey }];
    case 'naming.partial':
      return [...a.results];
    case 'naming.assign':
      return [{ type: 'baby.named', baby: a.baby, name: a.name, gems: a.gems, clipKey: a.clipKey, ordinal: a.ordinal, route: a.route, unknown: a.unknown }];
    case 'name.clipHeard':
      return [{ type: 'name.clipHeard', baby: a.baby }];
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/actions/heartbeat.ts src/core/actions/naming.ts tests/heartbeat/actions.test.ts
git commit -m "Add heartbeat and naming action translators"
```

**Acceptance:** tests pass. Hand CORE the draft types (C3) and the two entry points (C4).

---

### Task 16: The heartbeat state machine

**Files:**
- Create: `src/core/heartbeat/flow.ts`
- Test: `tests/heartbeat/flow.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
export type HbStage = 'egg-choice' | 'egg' | 'naming' | 'wish' | 'move-in' | 'door-visit' | 'done';
export type HbState = { stage: HbStage; baby: string | null; eggsInRow: number };
export type HbSignal =
  | { s: 'start'; unnamedBaby: string | null; offerChoice: boolean } | { s: 'egg-picked' } | { s: 'hatched'; baby: string }
  | { s: 'named' } | { s: 'wish-done' } | { s: 'moved-in'; visit: boolean } | { s: 'visit-done' } | { s: 'left' } | { s: 'other-activity' };
export type FlowOpts = { skipWishAfterThree: boolean };
export const IDLE: HbState;
export function step(st: HbState, sig: HbSignal, opts: FlowOpts): HbState;
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/flow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { IDLE, type HbSignal, type HbState, step } from '../../src/core/heartbeat/flow.ts';

const off = { skipWishAfterThree: false };
const run = (sigs: HbSignal[], opts = off, from: HbState = IDLE) => sigs.reduce((s, sig) => step(s, sig, opts), from);
const start: HbSignal = { s: 'start', unnamedBaby: null, offerChoice: false };

describe('heartbeat flow', () => {
  it('runs egg, naming, wish, move-in and a door visit', () => {
    expect(run([start]).stage).toBe('egg');
    expect(run([start, { s: 'hatched', baby: 'b1' }])).toEqual({ stage: 'naming', baby: 'b1', eggsInRow: 1 });
    expect(run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }]).stage).toBe('wish');
    expect(run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }, { s: 'wish-done' }]).stage).toBe('move-in');
    const visit = run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }, { s: 'wish-done' }, { s: 'moved-in', visit: true }]);
    expect(visit.stage).toBe('door-visit');
    expect(step(visit, { s: 'visit-done' }, off).stage).toBe('done');
    expect(run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }, { s: 'wish-done' }, { s: 'moved-in', visit: false }]).stage).toBe('done');
  });
  it('offers the egg choice first when asked', () => {
    const s = run([{ s: 'start', unnamedBaby: null, offerChoice: true }]);
    expect(s.stage).toBe('egg-choice');
    expect(step(s, { s: 'egg-picked' }, off).stage).toBe('egg');
  });
  it('resumes at naming for a baby left without a name, and hatches no second egg', () => {
    const left = run([start, { s: 'hatched', baby: 'b1' }, { s: 'left' }]);
    expect(left.stage).toBe('done');
    const again = step(left, { s: 'start', unnamedBaby: 'b1', offerChoice: false }, off);
    expect(again).toMatchObject({ stage: 'naming', baby: 'b1' });
    expect(step(again, { s: 'hatched', baby: 'b2' }, off)).toEqual(again);
  });
  it('ignores a start while a heartbeat runs', () => {
    const s = run([start, { s: 'hatched', baby: 'b1' }]);
    expect(step(s, start, off)).toEqual(s);
  });
  it('skips the first wish from the fourth egg in a row only when the switch is on', () => {
    const egg = (n: string): HbSignal[] => [start, { s: 'hatched', baby: n }, { s: 'named' }];
    const on = { skipWishAfterThree: true };
    const three = run([...egg('a'), { s: 'wish-done' }, { s: 'moved-in', visit: false }, ...egg('b'), { s: 'wish-done' },
      { s: 'moved-in', visit: false }, ...egg('c'), { s: 'wish-done' }, { s: 'moved-in', visit: false }], on);
    expect(three.eggsInRow).toBe(3);
    expect(run(egg('d'), on, three).stage).toBe('move-in');
    expect(run(egg('d'), off, three).stage).toBe('wish');
    expect(run([{ s: 'other-activity' }, ...egg('d')], on, three).stage).toBe('wish');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/flow.test.ts`
Expected: FAIL, cannot resolve `src/core/heartbeat/flow.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/heartbeat/flow.ts`:

```ts
export type HbStage = 'egg-choice' | 'egg' | 'naming' | 'wish' | 'move-in' | 'door-visit' | 'done';
export type HbState = { stage: HbStage; baby: string | null; eggsInRow: number };
export type HbSignal =
  | { s: 'start'; unnamedBaby: string | null; offerChoice: boolean }
  | { s: 'egg-picked' }
  | { s: 'hatched'; baby: string }
  | { s: 'named' }
  | { s: 'wish-done' }
  | { s: 'moved-in'; visit: boolean }
  | { s: 'visit-done' }
  | { s: 'left' }
  | { s: 'other-activity' };
export type FlowOpts = { skipWishAfterThree: boolean };

export const IDLE: HbState = { stage: 'done', baby: null, eggsInRow: 0 };

export function step(st: HbState, sig: HbSignal, opts: FlowOpts): HbState {
  switch (sig.s) {
    case 'start':
      if (st.stage !== 'done') return st;
      if (sig.unnamedBaby) return { ...st, stage: 'naming', baby: sig.unnamedBaby };
      return { ...st, stage: sig.offerChoice ? 'egg-choice' : 'egg', baby: null };
    case 'egg-picked':
      return st.stage === 'egg-choice' ? { ...st, stage: 'egg' } : st;
    case 'hatched':
      return st.stage === 'egg' ? { stage: 'naming', baby: sig.baby, eggsInRow: st.eggsInRow + 1 } : st;
    case 'named':
      if (st.stage !== 'naming') return st;
      // Spec 2.2 "Measured risk": a parent switch, off by default.
      return { ...st, stage: opts.skipWishAfterThree && st.eggsInRow > 3 ? 'move-in' : 'wish' };
    case 'wish-done':
      return st.stage === 'wish' ? { ...st, stage: 'move-in' } : st;
    case 'moved-in':
      return st.stage === 'move-in' ? { ...st, stage: sig.visit ? 'door-visit' : 'done' } : st;
    case 'visit-done':
      return st.stage === 'door-visit' ? { ...st, stage: 'done' } : st;
    case 'left':
      return { ...st, stage: 'done' };
    case 'other-activity':
      return { ...st, eggsInRow: 0 };
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/flow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/flow.ts tests/heartbeat/flow.test.ts
git commit -m "Add the heartbeat state machine with resume at naming"
```

**Acceptance:** tests pass, including resume at naming (Review focus 3).

---

### Task 17: Shared touch parts (drag, gems, slots, tray, slider, stones, print, heaps)

**Files:**
- Create: `src/ui/geometry.ts`, `src/ui/drag.ts`, `src/ui/Gem.svelte`, `src/ui/GemSlots.svelte`, `src/ui/GemTray.svelte`, `src/ui/SoundSlider.svelte`, `src/ui/Stone.svelte`, `src/ui/PrintWithDots.svelte` (`src/ui/Heap.svelte` belongs to places.md Task A8)
- Test: `tests/heartbeat/geometry.test.ts`

**Interfaces:**
- Consumes: `toStage`, `rectInStage` (C8); `isVowelGem` (Task 10); `StoneSpec` (Task 3); `PrintUnit` (Task 6); `makeRng` (C2); `artUrl` (C12).
- Produces:

```ts
// geometry.ts
export type Point = { x: number; y: number }; export type Rect = { x: number; y: number; w: number; h: number };
export const DRAG_THRESHOLD = 6;
export function passedThreshold(a: Point, b: Point): boolean;
export function nearestTarget(p: Point, targets: { id: string; rect: Rect }[], snap: number): string | null;
export function sliderIndex(x: number, centres: number[]): number;
export function heapCount(word: string): 3 | 4 | 5;
export function heapLayout(count: number, seed: number): { x: number; y: number; r: number }[]; // percent of the box, degrees
export function dicePoints(n: number): Point[];                  // percent of the stone, 1..6
export function scatterPoints(n: number, seed: number): Point[]; // percent of the stone, never a ten-frame grid
// drag.ts (Svelte action)
export type DropTarget = { id: string; el: Element };
export type DragOptions = { targets: () => DropTarget[]; snap?: number; disabled?: boolean; onstart?: () => void; ondrop: (target: string | null) => void; ontap?: () => void };
export function draggable(node: HTMLElement, opts: DragOptions): { update(o: DragOptions): void; destroy(): void };
```

Component props (Svelte 5, `$props()`):

| Component | Props |
|---|---|
| `Gem.svelte` | `{ g: string; gift?: boolean; crown?: boolean; glow?: boolean; size?: number }` |
| `GemSlots.svelte` | `{ slots: SlotView[]; editable?: boolean; slotEls?: HTMLElement[] (bindable); onplus?: () => void; onremove?: (i: number) => void; onslottap?: (i: number) => void }` with `SlotView = { gem: string \| null; gift: boolean; kind: 'vowel' \| 'consonant' \| 'any'; crown: boolean; hum: boolean; glow: boolean }` |
| `GemTray.svelte` | `{ gems: string[]; targets: () => DropTarget[]; ondrop: (gem: string, target: string \| null) => void; ontap: (gem: string) => void }` |
| `SoundSlider.svelte` | `{ count: number; onpass: (i: number) => void; ondone: () => void; width?: number }` |
| `Stone.svelte` | `{ spec: StoneSpec; size?: number }` |
| `PrintWithDots.svelte` | `{ units: PrintUnit[]; dotsMs: 500 \| 300 \| null; glow?: boolean; onsound: (g: string) => void }` |

- [ ] **Step 1: Write the failing test for the geometry helpers**

`tests/heartbeat/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dicePoints, heapCount, heapLayout, nearestTarget, passedThreshold, scatterPoints, sliderIndex } from '../../src/ui/geometry.ts';

describe('geometry', () => {
  it('starts a drag only after six stage pixels', () => {
    expect(passedThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
    expect(passedThreshold({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
  });
  it('snaps to the nearest target within the snap distance', () => {
    const t = [{ id: 'a', rect: { x: 0, y: 0, w: 100, h: 100 } }, { id: 'b', rect: { x: 300, y: 0, w: 100, h: 100 } }];
    expect(nearestTarget({ x: 50, y: 50 }, t, 48)).toBe('a');
    expect(nearestTarget({ x: 140, y: 50 }, t, 48)).toBe('a');
    expect(nearestTarget({ x: 270, y: 50 }, t, 48)).toBe('b');
    expect(nearestTarget({ x: 200, y: 50 }, t, 48)).toBeNull();
  });
  it('finds the slot under the slider star', () => {
    expect(sliderIndex(10, [0, 100, 200])).toBe(0);
    expect(sliderIndex(160, [0, 100, 200])).toBe(2);
  });
  it('draws heaps of three to five copies, the same for a word every time', () => {
    expect([3, 4, 5]).toContain(heapCount('hats'));
    expect(heapCount('hats')).toBe(heapCount('hats'));
    const h = heapLayout(5, 1);
    expect(h).toHaveLength(5);
    for (const p of h) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(100); }
    expect(new Set(h.map((p) => `${p.x},${p.y}`)).size).toBe(5);
    expect(heapLayout(5, 1)).toEqual(h);
  });
  it('lays dice dots for one to six and a loose scatter above', () => {
    expect(dicePoints(1)).toEqual([{ x: 50, y: 50 }]);
    expect(dicePoints(6)).toHaveLength(6);
    const s = scatterPoints(9, 9);
    expect(s).toHaveLength(9);
    const rows = new Set(s.map((p) => Math.round(p.y / 10)));
    expect(rows.size).toBeGreaterThan(2); // not two neat rows of five
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/geometry.test.ts`
Expected: FAIL, cannot resolve `src/ui/geometry.ts`.

- [ ] **Step 3: Write `geometry.ts` and `drag.ts`**

`src/ui/geometry.ts`:

```ts
import { makeRng } from '../core/rng.ts';

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export const DRAG_THRESHOLD = 6;

export function passedThreshold(a: Point, b: Point): boolean {
  return Math.hypot(b.x - a.x, b.y - a.y) >= DRAG_THRESHOLD;
}

export function nearestTarget(p: Point, targets: { id: string; rect: Rect }[], snap: number): string | null {
  let best: string | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const t of targets) {
    const dx = Math.max(t.rect.x - p.x, 0, p.x - (t.rect.x + t.rect.w));
    const dy = Math.max(t.rect.y - p.y, 0, p.y - (t.rect.y + t.rect.h));
    const d = Math.hypot(dx, dy);
    if (d <= snap && d < bestD) { bestD = d; best = t.id; }
  }
  return best;
}

export function sliderIndex(x: number, centres: number[]): number {
  let best = 0;
  centres.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(centres[best] - x)) best = i; });
  return best;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function heapCount(word: string): 3 | 4 | 5 {
  return (3 + (hash(word) % 3)) as 3 | 4 | 5;
}

// A loose pile: a wider bottom row and a smaller top row, each copy turned a little.
export function heapLayout(count: number, seed: number): { x: number; y: number; r: number }[] {
  const rng = makeRng(seed);
  const bottom = Math.ceil(count / 2) + (count > 3 ? 1 : 0);
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const row = i < bottom ? 0 : 1;
    const inRow = row === 0 ? bottom : count - bottom;
    const k = row === 0 ? i : i - bottom;
    const x = Math.round((100 / (inRow + 1)) * (k + 1) + (rng() - 0.5) * 8);
    const y = Math.round((row === 0 ? 66 : 38) + (rng() - 0.5) * 8);
    out.push({ x: Math.min(100, Math.max(0, x)), y, r: Math.round((rng() - 0.5) * 30) });
  }
  return out;
}

const DICE: Record<number, Point[]> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 28, y: 28 }, { x: 72, y: 72 }],
  3: [{ x: 26, y: 26 }, { x: 50, y: 50 }, { x: 74, y: 74 }],
  4: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
  5: [{ x: 26, y: 26 }, { x: 74, y: 26 }, { x: 50, y: 50 }, { x: 26, y: 74 }, { x: 74, y: 74 }],
  6: [{ x: 28, y: 22 }, { x: 72, y: 22 }, { x: 28, y: 50 }, { x: 72, y: 50 }, { x: 28, y: 78 }, { x: 72, y: 78 }],
};
export function dicePoints(n: number): Point[] {
  const d = DICE[n];
  if (!d) throw new RangeError(`dicePoints: ${n}`);
  return d;
}

// Rejection sampling inside a circle with a minimum gap; seeded per value so a stone always looks the same.
export function scatterPoints(n: number, seed: number): Point[] {
  const rng = makeRng(seed * 31 + n);
  const pts: Point[] = [];
  let guard = 0;
  while (pts.length < n && guard++ < 5000) {
    const p = { x: Math.round(18 + rng() * 64), y: Math.round(18 + rng() * 64) };
    if (Math.hypot(p.x - 50, p.y - 50) > 34) continue;
    if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 15)) pts.push(p);
  }
  return pts;
}
```

`src/ui/drag.ts`:

```ts
import { rectInStage, toStage } from './stage.ts';
import { nearestTarget, passedThreshold, type Point } from './geometry.ts';

export type DropTarget = { id: string; el: Element };
export type DragOptions = {
  targets: () => DropTarget[]; snap?: number; disabled?: boolean;
  onstart?: () => void; ondrop: (target: string | null) => void; ontap?: () => void;
};

export function draggable(node: HTMLElement, initial: DragOptions) {
  let opts = initial;
  let start: Point | null = null;
  let dragging = false;
  let pid = -1;
  const down = (e: PointerEvent) => {
    if (opts.disabled) return;
    pid = e.pointerId;
    node.setPointerCapture(pid);
    start = toStage(e);
    dragging = false;
  };
  const move = (e: PointerEvent) => {
    if (!start || e.pointerId !== pid) return;
    const p = toStage(e);
    if (!dragging && passedThreshold(start, p)) { dragging = true; node.classList.add('dragging'); opts.onstart?.(); }
    if (dragging) node.style.transform = `translate(${p.x - start.x}px, ${p.y - start.y}px) scale(1.08)`;
  };
  const up = (e: PointerEvent) => {
    if (!start || e.pointerId !== pid) return;
    const p = toStage(e);
    const was = dragging;
    start = null;
    dragging = false;
    node.classList.remove('dragging');
    node.style.transform = '';
    if (node.hasPointerCapture(pid)) node.releasePointerCapture(pid);
    if (!was) { opts.ontap?.(); return; }
    const rects = opts.targets().map((t) => ({ id: t.id, rect: rectInStage(t.el) }));
    opts.ondrop(nearestTarget(p, rects, opts.snap ?? 48));
  };
  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  return {
    update(o: DragOptions) { opts = o; },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    },
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the components**

Shared style rules for every component here: Andika font (CORE loads it), pastel fills with a darker warm outline of the same hue (`border: 4px solid` a darker shade), light from the top left (`radial-gradient` highlight at 30% 25%), no texture, only `transform` and `opacity` animated, every touchable element carries `data-touch` and an `aria-label`, and is at least 64 x 64 stage pixels.

`src/ui/Gem.svelte`:

```svelte
<script lang="ts">
  import { isVowelGem } from '../core/naming/sounds.ts';
  let { g, gift = false, crown = false, glow = false, size = 72 }: { g: string; gift?: boolean; crown?: boolean; glow?: boolean; size?: number } = $props();
  const kind = $derived(g.toLowerCase() === 'y' ? 'both' : isVowelGem(g) ? 'vowel' : 'consonant');
  const text = $derived(g.includes('-') ? g.replace('-', '_') : g);
</script>

<span class="gem {kind}" class:gift class:glow style:--size="{size}px">
  {#if crown}
    <svg class="crown" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" stroke="#c98a14" stroke-width="2" stroke-linejoin="round" /></svg>
  {/if}
  <span class="t">{text}</span>
</span>

<style>
  .gem { position: relative; display: inline-grid; place-items: center; width: var(--size); height: var(--size);
    border-radius: 22%; font: 700 calc(var(--size) * 0.5) / 1 'Andika', sans-serif; color: #3b2a4a; }
  .vowel { background: radial-gradient(circle at 30% 25%, #fff 0 12%, #ffc4e1 13% 100%); border: 4px solid #e0559c; }
  .consonant { background: radial-gradient(circle at 30% 25%, #fff 0 12%, #c8e4ff 13% 100%); border: 4px solid #4f93d6; }
  .both { background: linear-gradient(135deg, #ffc4e1 50%, #c8e4ff 50%); border: 4px solid #8a6ad8; }
  .gift { box-shadow: 0 0 0 4px #ffe68a; }
  .gift::after { content: ''; position: absolute; inset: -6px; border-radius: 26%; border: 3px dashed #ffd25e; animation: tw 1.6s ease-in-out infinite; }
  .glow { animation: pulse 0.9s ease-in-out infinite; }
  .crown { position: absolute; top: calc(var(--size) * -0.32); width: 60%; }
  @keyframes tw { 50% { opacity: 0.3; } }
  @keyframes pulse { 50% { transform: scale(1.08); } }
</style>
```

`src/ui/GemSlots.svelte`:

```svelte
<script lang="ts" module>
  export type SlotView = { gem: string | null; gift: boolean; kind: 'vowel' | 'consonant' | 'any'; crown: boolean; hum: boolean; glow: boolean };
</script>

<script lang="ts">
  import Gem from './Gem.svelte';
  let { slots, editable = false, slotEls = $bindable([]), onplus, onremove, onslottap }:
    { slots: SlotView[]; editable?: boolean; slotEls?: HTMLElement[]; onplus?: () => void; onremove?: (i: number) => void; onslottap?: (i: number) => void } = $props();
</script>

<div class="slots">
  {#each slots as s, i}
    <button class="slot {s.kind}" class:hum={s.hum} class:glow={s.glow} data-touch aria-label="slot {i + 1}"
      bind:this={slotEls[i]} onpointerup={() => onslottap?.(i)}>
      {#if s.gem}<Gem g={s.gem} gift={s.gift} crown={s.crown && i === 0} size={76} />{/if}
      {#if editable && !s.gem && slots.length > 2}
        <span class="drop-off" role="button" tabindex="-1" data-touch aria-label="remove slot {i + 1}"
          onpointerup={(e) => { e.stopPropagation(); onremove?.(i); }}>×</span>
      {/if}
    </button>
  {/each}
  {#if editable && slots.length < 8}
    <button class="slot plus" data-touch aria-label="add slot" onpointerup={() => onplus?.()}>+</button>
  {/if}
</div>

<style>
  .slots { display: flex; gap: 14px; justify-content: center; align-items: center; }
  .slot { width: 96px; height: 96px; border-radius: 24px; border: 4px dashed #b9a6d9; background: #fbf7ff; display: grid; place-items: center; position: relative; }
  .slot.vowel { border-color: #e0559c; } .slot.consonant { border-color: #4f93d6; }
  .slot.plus { font: 700 48px 'Andika', sans-serif; color: #8a6ad8; border-style: solid; }
  .slot.hum { animation: hum 0.25s linear 6; }
  .slot.glow { animation: pulse 0.9s ease-in-out infinite; }
  .drop-off { position: absolute; top: -18px; right: -18px; width: 64px; height: 64px; border-radius: 50%; background: #fff; border: 3px solid #b9a6d9; display: grid; place-items: center; font-size: 30px; color: #8a6ad8; }
  @keyframes hum { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
  @keyframes pulse { 50% { transform: scale(1.06); } }
</style>
```

Removing a slot: spec says "dragging an empty slot off removes it". The small round remove handle on an empty slot is that gesture's target; dragging it off the row (or tapping it) calls `onremove`. The ghost hand shows the plus slot once (Task 19).

`src/ui/GemTray.svelte`:

```svelte
<script lang="ts">
  import Gem from './Gem.svelte';
  import { draggable, type DropTarget } from './drag.ts';
  let { gems, targets, ondrop, ontap }: { gems: string[]; targets: () => DropTarget[]; ondrop: (gem: string, target: string | null) => void; ontap: (gem: string) => void } = $props();
</script>

<div class="tray">
  {#each gems as g, i (g + i)}
    <span class="cell" data-touch aria-label="gem {g}" use:draggable={{ targets, ondrop: (t) => ondrop(g, t), ontap: () => ontap(g) }}>
      <Gem {g} size={76} />
    </span>
  {/each}
</div>

<style>
  .tray { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-width: 1120px; margin: 0 auto; touch-action: none; }
  .cell { display: inline-block; touch-action: none; }
  :global(.cell.dragging) { z-index: 50; }
</style>
```

Gems stay in the tray when used (a gold name may use a letter twice, as in the v2 patch). The tray wraps into rows of up to 12 gems.

`src/ui/SoundSlider.svelte`:

```svelte
<script lang="ts">
  import { toStage } from './stage.ts';
  import { sliderIndex } from './geometry.ts';
  let { count, onpass, ondone, width = 110 }: { count: number; onpass: (i: number) => void; ondone: () => void; width?: number } = $props();
  let track: HTMLElement;
  let x = $state(0);
  let last = -1;
  let startX = 0;
  const centres = $derived(Array.from({ length: count }, (_, i) => (i + 0.5) * width));
  function down(e: PointerEvent) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); startX = toStage(e).x - x; last = -1; }
  function move(e: PointerEvent) {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    x = Math.max(0, Math.min(count * width, toStage(e).x - startX));
    const i = sliderIndex(x, centres);
    if (i !== last && Math.abs(centres[i] - x) < width / 2) { last = i; onpass(i); }
  }
  function up() { if (x >= count * width - width / 2) ondone(); x = 0; }
</script>

<div class="track" bind:this={track} style:width="{count * width + 40}px">
  <span class="star" data-touch aria-label="star" style:transform="translateX({x}px)" onpointerdown={down} onpointermove={move} onpointerup={up}>
    <svg viewBox="0 0 100 100"><path d="M50 6 L62 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L38 38 Z" fill="#ffd25e" stroke="#e0a520" stroke-width="5" stroke-linejoin="round" /></svg>
  </span>
</div>

<style>
  .track { position: relative; height: 72px; border-radius: 36px; background: #efe6ff; margin: 0 auto; touch-action: none; }
  .star { position: absolute; left: 0; top: -4px; width: 80px; height: 80px; touch-action: none; }
</style>
```

`src/ui/Stone.svelte`:

```svelte
<script lang="ts">
  import type { StoneSpec } from '../core/maths/stones.ts';
  import { dicePoints, scatterPoints } from './geometry.ts';
  let { spec, size = 108 }: { spec: StoneSpec; size?: number } = $props();
  const TINTS = ['#ffb340', '#ff8f6b', '#ff7fb0', '#ffd24a', '#ff9f45', '#f78bd0', '#ffc061'];
  const dots = $derived(spec.face === 'numeral' ? [] : spec.layout === 'dice' ? dicePoints(spec.value) : scatterPoints(spec.value, spec.value));
</script>

<span class="stone" style:--size="{size}px" style:--tint={TINTS[spec.tint]}>
  {#each dots as d}<i style:left="{d.x}%" style:top="{d.y}%"></i>{/each}
  {#if spec.face !== 'dots'}<b class:small={spec.face === 'dots-numeral'}>{spec.value}</b>{/if}
</span>

<style>
  .stone { position: relative; display: block; width: var(--size); height: var(--size); border-radius: 46% 54% 50% 50%;
    background: radial-gradient(circle at 30% 25%, #fff8 0 14%, var(--tint) 15% 100%); border: 4px solid #b9772a; }
  i { position: absolute; width: 14%; height: 14%; margin: -7% 0 0 -7%; border-radius: 50%; background: #5a3a1a; }
  b { position: absolute; inset: 0; display: grid; place-items: center; font: 700 calc(var(--size) * 0.5) 'Andika', sans-serif; color: #3b2a1a; }
  b.small { inset: auto 6% 4% auto; font-size: calc(var(--size) * 0.28); background: #fff; border-radius: 40%; padding: 0 6px; }
</style>
```

`src/ui/PrintWithDots.svelte`:

```svelte
<script lang="ts">
  import type { PrintUnit } from '../core/heartbeat/wish.ts';
  import { toStage } from './stage.ts';
  let { units, dotsMs, glow = false, onsound }: { units: PrintUnit[]; dotsMs: 500 | 300 | null; glow?: boolean; onsound: (g: string) => void } = $props();
  let els: HTMLElement[] = [];
  let lastPlayed = -1;
  // A split digraph's tail 'e' has no dot of its own; the vowel's dot plays the long sound.
  const isTail = (i: number) => i > 0 && units[i].text === 'e' && units[i].g.includes('-') && units.findIndex((u) => u.g === units[i].g) !== i;
  function play(i: number) { if (i === lastPlayed || isTail(i) || units[i].silent) return; lastPlayed = i; onsound(units[i].g); }
  function at(e: PointerEvent) {
    const p = toStage(e);
    els.forEach((el, i) => { const r = el.getBoundingClientRect(); const s = toStage({ clientX: r.left + r.width / 2, clientY: r.top } as PointerEvent); if (Math.abs(s.x - p.x) < r.width / 2) play(i); });
  }
</script>

<div class="print" class:glow data-touch aria-label="wish"
  onpointerdown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); lastPlayed = -1; at(e); }}
  onpointermove={(e) => { if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) at(e); }}>
  {#each units as u, i}
    <span class="unit" bind:this={els[i]}>
      <span class="txt">{u.text}</span>
      {#if dotsMs !== null && !isTail(i)}<span class="dot" class:silent={u.silent}></span>{/if}
    </span>
  {/each}
</div>

<style>
  .print { display: inline-flex; gap: 6px; padding: 14px 22px 26px; min-height: 96px; background: #fff; border-radius: 28px; border: 4px solid #c9b8ff; font: 700 64px/1 'Andika', sans-serif; color: #3b2a4a; touch-action: none; }
  .unit { display: inline-flex; flex-direction: column; align-items: center; }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: #8a6ad8; margin-top: 8px; }
  .dot.silent { opacity: 0.25; }
  .glow .unit:last-child .txt { animation: pulse 0.9s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: scale(1.12); } }
</style>
```

The wish scene passes `glow` when the deciding part must glow after a miss; for one-or-many wishes the deciding part is the end of the word, which is the last unit.

- [ ] **Step 6: Type check**

Run: `npm run check`
Expected: no errors in `src/ui/` (errors from other workstreams' missing files are reported to the integrator, not fixed here).

- [ ] **Step 7: Commit**

```bash
git add src/ui/geometry.ts src/ui/drag.ts src/ui/Gem.svelte src/ui/GemSlots.svelte src/ui/GemTray.svelte src/ui/SoundSlider.svelte src/ui/Stone.svelte src/ui/PrintWithDots.svelte tests/heartbeat/geometry.test.ts
git commit -m "Add touch parts: drag, gems, slots, tray, slider, stones, printed words and heaps"
```

**Acceptance:** geometry tests pass; `svelte-check` reports no errors in these files. Places (MEADOW) reuses `GemSlots`, `GemTray`, `SoundSlider`, `PrintWithDots` and `draggable` for label bubbles and jars; this workstream uses places' `Heap`.

---

---

### Task 17B: Bridges to the learning and places plans

`docs/v3/plan/learning.md` (LEARN) and `docs/v3/plan/places.md` (PLACES) were written next to this plan. Their real interfaces differ from C10 and C13. This task puts every call into those two workstreams behind four small files owned here, so the scenes in Tasks 18 to 23 never import LEARN or PLACES modules directly. If either plan changes a name, only these files change.

**Files:**
- Create: `src/scenes/heartbeat/learn-bridge.ts`, `src/scenes/heartbeat/hint-runner.ts`, `src/scenes/heartbeat/guides.svelte.ts`, `src/scenes/heartbeat/HbGuides.svelte`
- Modify: `src/core/actions/heartbeat.ts` (add `hb.egg.free`), `src/core/heartbeat/types.ts` (building breeds)
- Test: `tests/heartbeat/learn-bridge.test.ts`

**Interfaces:**
- Consumes (LEARN, `src/core/planner/index.ts` and `src/core/learning/index.ts`): `nextItem(ctx: PlanContext, req: ItemRequest, rng): Pick | null`, `carrierKey(c: Carrier): string`, `nextEgg(ctx, rng): { kind: EggKind; pick: Pick | null }`, `nextNameReviews(ctx, herd: NameCandidate[], n, 'roll-call', rng): Pick[]`, `visitStats(l): VisitStats`, `spellingShareLow(l, c): boolean`, `currentStep(l, c, strand): StepId | null`, `stepStatus(l, c, step): StepStatus`, `isSecure(l, c, step): boolean`, and the `Content`, `Pick`, `Carrier`, `MathsTask`, `ItemRequest`, `MomentKind` types. CORE exposes `game.planContext: PlanContext` (LEARN's C-STORE item 2).
- Consumes (PLACES): `createMoment(o: MomentOpts, d: MomentDeps): Moment` from `src/ui/moment.ts`, `defaultDeps()` from `src/ui/moment-deps.ts`, `ghostMove`, `ghostTap`, `ghostStop` from `src/ui/ghost.ts`, `<Moonbeam target area />`, `<GhostHand />`, `<ReplayButton onreplay />`.
- Produces:

```ts
// learn-bridge.ts
export type HbSlot = 'egg' | 'wish' | 'naming' | 'door' | 'rollcall-door';
export function mathsId(t: MathsTask): string;                       // to the C11 grammar Task 2 parses
export function sourceOf(slot: string): Source;
export function toToken(p: string, ipa?: boolean): string;           // IPA to the C11 phoneme token
export function wordEntries(c: Content): Map<string, WordEntry>;     // one entry per word, plus one per plural
export function nameEntries(c: Content): NameEntry[];                // C11 NameEntry with a per-grapheme split
export function servedFromPick(p: Pick, words: Map<string, WordEntry>): Served | null;
export function itemIdFor(c: Content, strand: Strand, id: string): string | null;
export function toLearnPayload(d: LearnResultDraft, c: Content): Record<string, unknown>;
export function serve(slot: HbSlot, rng: Rng, accept?: (s: Served) => boolean, extra?: Partial<ItemRequest>): Served | null;
export function serveEgg(rng: Rng): { served: Served | null; kind: EggKind };
export function stepStatusOf(strand: 'r' | 's' | 'm', step: string): StepState;
export function currentStepOf(strand: 'r' | 's' | 'm'): string;
export function secure(strand: 'r' | 's' | 'm', step: string): boolean;
export function spellingBehind(): boolean;
export function checkedCount(): number;
export function nameReviewIds(herd: { id: string; name: string | null; nameGems: string[] }[], n: number, rng: Rng): string[];
export function spellLadder(c: Content): { id: string; items: string[] }[];
export function readLadder(c: Content): { id: string; items: string[] }[];
export function usesIpa(c: Content): boolean;
// hint-runner.ts
export function createHintRunner(meta: { place: string; strand: Strand }): HintRunner;   // HintRunner as C13
// guides.svelte.ts
export const ghost: { drag(from: Element, to: Element): Promise<void>; tap(el: Element): Promise<void>; hide(): void };
export const moonbeam: { show(els: Element | Element[]): void; clear(): void; readonly rect: Rect | null };
export const goal: { set(repeat: () => Promise<void>): void; clear(): void; replay(): Promise<void> };
// HbGuides.svelte: no props; renders PLACES' Moonbeam, GhostHand and ReplayButton wired to the stores above
```

Decisions recorded here:
- Result semantics follow places.md D1 (a miss followed by a right answer is `miss`; `helped` needs an idle-triggered focused hint or the ghost hand). Task 1's `momentResult` and the fakes in Task 18 already use this.
- Name review items are `name:<babyId>` (LEARN). Roll call logs that id (Task 15).
- Maths and wish moments log `served.items`, which are LEARN item ids from the pick. Naming logs one item per own slot, mapped to LEARN ids by `itemIdFor`; slots whose grapheme has no item are left out.
- LEARN's `nextEgg` can return no pick: then the nest offers a free egg of that kind, which hatches without a `learn.result` (LEARN Decision 10). `hb.egg.free` produces only `egg.hatched`.
- Building breeds join `BreedId`: `'bubble' | 'post' | 'sparkle'`.
- `src/core/naming/blocklist.ts` duplicates LEARN's `src/core/content/blocklist.ts`. The integrator keeps LEARN's file as the single source if it passes the blocklist cases in Task 10, and turns this one into a re-export; otherwise this one stays and LEARN's validator imports it.

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/learn-bridge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { itemIdFor, mathsId, nameEntries, servedFromPick, sourceOf, toLearnPayload, toToken, wordEntries } from '../../src/scenes/heartbeat/learn-bridge.ts';

const c: any = {
  gpcs: {
    h: { id: 'h', text: 'h', phonemes: ['h'] }, a: { id: 'a', text: 'a', phonemes: ['æ'] }, t: { id: 't', text: 't', phonemes: ['t'] },
    l: { id: 'l', text: 'l', phonemes: ['l'] }, i: { id: 'i', text: 'i', phonemes: ['ɪ'] }, 'y-ee': { id: 'y-ee', text: 'y', phonemes: ['i'] },
    k: { id: 'k', text: 'k', phonemes: ['k'] },
  },
  words: {
    hat: { w: 'hat', gpcs: ['h', 'a', 't'], pic: 'hat', kind: 'thing', clip: 'word-hat', pluralClip: 'word-hats', plural: { w: 'hats', ending: 's' }, rStep: 'R05', rItems: ['r:g:h'], sItems: [] },
    nap: { w: 'nap', gpcs: [], pic: 'nap', kind: 'station', clip: 'word-nap', pluralClip: null, rStep: 'R02', rItems: [], sItems: [] },
  },
  names: [{ name: 'Lily', slug: 'lily', gpcs: ['l', 'i', 'l', 'y-ee'], phonemes: ['l', 'ɪ', 'l', 'i'], first: 'l', priority: 1, source: 'uk', pic: 'flowers' }],
  items: { 's:g:k': { id: 's:g:k', kind: 'grapheme', gpc: 'k', strand: 's', step: 'S03' }, 'm:num:14': { id: 'm:num:14', kind: 'numeral', task: { op: 'numeral', n: 14 }, strand: 'm', step: 'M07' },
    's:capital': { id: 's:capital', kind: 'capital', strand: 's', step: 'S11' } },
};

describe('learn bridge', () => {
  it('turns maths tasks into the item grammar the eggs read', () => {
    expect(mathsId({ op: 'subitise', n: 4 })).toBe('sub:4');
    expect(mathsId({ op: 'numeral', n: 7 })).toBe('num:7');
    expect(mathsId({ op: 'more', n: 6 })).toBe('6+1');
    expect(mathsId({ op: 'less', n: 6 })).toBe('6-1');
    expect(mathsId({ op: 'missing', whole: 10, part: 3 })).toBe('3+7');
    expect(mathsId({ op: 'pair', a: 3, b: 7 })).toBe('3+7');
    expect(mathsId({ op: 'add', a: 5, b: 3 })).toBe('5+3');
    expect(mathsId({ op: 'take', a: 8, b: 3 })).toBe('8-3');
  });
  it('maps slots to sources and IPA to tokens', () => {
    expect(sourceOf('warmup')).toBe('review');
    expect(sourceOf('golden')).toBe('golden');
    expect(toToken('æ')).toBe('a');
    expect(toToken('eɪ')).toBe('ai');
    expect(toToken('k')).toBe('k');
  });
  it('builds word entries with plural forms and stations', () => {
    const w = wordEntries(c);
    expect(w.get('hat')).toMatchObject({ gr: ['h', 'a', 't'], picture: 'hat', plural: 'hats', basket: true, step: 'R05' });
    expect(w.get('hats')).toMatchObject({ gr: ['h', 'a', 't', '-s'], one: 'hat', ending: '-s', picture: 'hat', clip: 'word-hats', basket: false });
    expect(w.get('nap')).toMatchObject({ station: 'nap', basket: false });
  });
  it('builds name entries with a split per grapheme', () => {
    expect(nameEntries(c)[0]).toMatchObject({ key: 'lily', split: [{ g: 'L', ph: ['l'] }, { g: 'i', ph: ['i'] }, { g: 'l', ph: ['l'] }, { g: 'y', ph: ['ee'] }], ph: ['l', 'i', 'l', 'ee'] });
  });
  it('turns picks into served items', () => {
    const w = wordEntries(c);
    const base = { strand: 'r', step: 'R19', slot: 'school', moment: 'one-or-many', items: ['r:end:s'], scaffold: 1, probe: false };
    expect(servedFromPick({ ...base, carrier: { kind: 'plural', word: 'hat', form: 'many', count: 3 } } as any, w))
      .toMatchObject({ step: 'R19', carrier: 'hats', items: ['r:end:s'], source: 'school', moment: 'one-or-many', slot: 'school' });
    expect(servedFromPick({ ...base, step: 'R04D', carrier: { kind: 'twin', pair: 'a-e', words: ['pan', 'pen'] } } as any, w))
      .toMatchObject({ carrier: 'pan', twin: 'pen' });
    expect(servedFromPick({ ...base, strand: 'm', step: 'M10', carrier: { kind: 'maths', task: { op: 'pair', a: 4, b: 6 } } } as any, w))
      .toMatchObject({ id: '4+6', carrier: '' });
    expect(servedFromPick({ ...base, strand: 's', step: 'S03', carrier: { kind: 'spell', focus: ['k'] } } as any, w)).toMatchObject({ id: 'k' });
  });
  it('maps logged ids to LEARN item ids', () => {
    expect(itemIdFor(c, 's', 'k')).toBe('s:g:k');
    expect(itemIdFor(c, 'm', 'num:14')).toBe('m:num:14');
    expect(itemIdFor(c, 's', 'capital')).toBe('s:capital');
    expect(itemIdFor(c, 'r', 'r:g:h')).toBe('r:g:h');
    expect(itemIdFor(c, 's', 'zz')).toBeNull();
    expect(itemIdFor(c, 'name', 'name:b3')).toBe('name:b3');
  });
  it('builds the learn.result payload LEARN expects', () => {
    const p = toLearnPayload({ type: 'learn.result', strand: 's', step: 'S03', carrier: 'Ken', items: [{ id: 'k', result: 'first' }, { id: 'zz', result: 'miss' }],
      result: 'miss', ms: 900, scaffold: 1, error: 'vowel', place: 'naming', probe: false, source: 'current', moment: 'naming-bells', slot: 'current' }, c);
    expect(p).toEqual({ type: 'learn.result', strand: 's', step: 'S03', carrier: 'Ken', items: [{ id: 's:g:k', r: 'first' }], result: 'miss', ms: 900,
      scaffold: 1, error: 'vowel', place: 'naming', moment: 'naming-bells', slot: 'current', probe: false });
    const n = toLearnPayload({ type: 'learn.result', strand: 'name', step: 'name', carrier: 'Tam', items: [{ id: 'name:b3', result: 'first' }],
      result: 'first', ms: 500, scaffold: 3, place: 'rollcall', probe: false, source: 'review' }, c);
    expect(n).toMatchObject({ step: null, moment: 'roll-call', slot: 'name', error: null, items: [{ id: 'name:b3', r: 'first' }] });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/learn-bridge.test.ts`
Expected: FAIL, cannot resolve `learn-bridge.ts`.

- [ ] **Step 3: Write `learn-bridge.ts`**

```ts
import { game } from '../../game.svelte.ts';
import { carrierKey, nextEgg, nextItem, nextNameReviews, spellingShareLow, visitStats } from '../../core/planner/index.ts';
import { currentStep, isSecure, stepStatus } from '../../core/learning/index.ts';
import type { Content } from '../../core/content/types.ts';
import type { ItemRequest, Pick } from '../../core/planner/types.ts';
import type { LearnResultDraft, NameEntry, Served, Source, StationId, StepState, Strand, WordEntry } from '../../core/heartbeat/types.ts';
import type { EggKind } from '../../core/maths/eggs.ts';
import type { Rng } from '../../core/rng.ts';
import { usualSound } from '../../core/naming/sounds.ts';

export type HbSlot = 'egg' | 'wish' | 'naming' | 'door' | 'rollcall-door';
type MathsTask = { op: string; [k: string]: unknown };

export function mathsId(t: MathsTask): string {
  const n = (k: string) => Number(t[k]);
  switch (t.op) {
    case 'subitise': return `sub:${n('n')}`;
    case 'numeral': return `num:${n('n')}`;
    case 'more': return `${n('n')}+1`;
    case 'less': return `${n('n')}-1`;
    case 'missing': return `${n('part')}+${n('whole') - n('part')}`;
    case 'pair': case 'add': return `${n('a')}+${n('b')}`;
    case 'take': return `${n('a')}-${n('b')}`;
    default: return String(t.op);
  }
}

const SOURCE: Record<string, Source> = { current: 'current', school: 'school', side: 'side', review: 'review', mixed: 'mixed', probe: 'probe', warmup: 'review', golden: 'golden', name: 'review' };
export function sourceOf(slot: string): Source { return SOURCE[slot] ?? 'review'; }

const IPA: Record<string, string> = {
  'æ': 'a', 'ɛ': 'e', 'ɪ': 'i', 'ɒ': 'o', 'ʌ': 'u', 'eɪ': 'ai', 'iː': 'ee', 'i': 'ee', 'aɪ': 'igh', 'əʊ': 'oa', 'uː': 'oo', 'ʊ': 'uu',
  'ɑː': 'ar', 'ɔː': 'or', 'ɜː': 'ur', 'aʊ': 'ow', 'ɔɪ': 'oi', 'ɪə': 'ear', 'eə': 'air', 'ə': 'uh', 'juː': 'yoo',
  'ʃ': 'sh', 'ʒ': 'zh', 'tʃ': 'ch', 'dʒ': 'j', 'θ': 'th', 'ð': 'dh', 'ŋ': 'ng', 'j': 'y', 'ɡ': 'g',
};
// LEARN may store phonemes as IPA or as the C11 tokens. The map applies only to IPA content.
export function usesIpa(c: Content): boolean {
  return Object.values(c.gpcs).some((g: any) => (g.phonemes as string[]).some((p) => /[æɪɒʌəʃʒŋθðɑɔɜʊː]/.test(p)));
}
export function toToken(p: string, ipa = true): string { return ipa ? IPA[p] ?? p : p; }

export function wordEntries(c: Content): Map<string, WordEntry> {
  const out = new Map<string, WordEntry>();
  for (const w of Object.values(c.words) as any[]) {
    const gr = (w.gpcs as string[]).map((id) => c.gpcs[id]?.text ?? id);
    const station = w.kind === 'station' ? (w.w as StationId) : undefined;
    out.set(w.w, { word: w.w, gr, step: w.rStep ?? '', picture: w.pic ?? '', clip: w.clip, basket: w.kind === 'thing' && !!w.pic,
      ...(w.plural ? { plural: w.plural.w } : {}), ...(station ? { station } : {}) });
    if (w.plural && w.pluralClip) {
      out.set(w.plural.w, { word: w.plural.w, gr: [...gr, `-${w.plural.ending}`], step: 'R19', picture: w.pic ?? '', clip: w.pluralClip,
        one: w.w, ending: `-${w.plural.ending}` as '-s' | '-es', basket: false });
    }
  }
  return out;
}

export function nameEntries(c: Content): NameEntry[] {
  const ipa = usesIpa(c);
  return (c.names as any[]).map((n) => {
    const split = (n.gpcs as string[]).map((id, i) => {
      const g = c.gpcs[id];
      const text = g?.text ?? id;
      return { g: i === 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text, ph: (g?.phonemes ?? []).map((p: string) => toToken(p, ipa)) };
    });
    return { name: n.name, key: n.slug, split, ph: split.flatMap((s) => s.ph), first: toToken(n.first, ipa), pic: n.pic ?? null, tier: 1 as const };
  });
}

export function servedFromPick(p: Pick, words: Map<string, WordEntry>): Served | null {
  const c = p.carrier as any;
  const base = { strand: p.strand as Strand, step: p.step ?? 'name', items: p.items, scaffold: p.scaffold, probe: p.probe,
    source: sourceOf(p.slot), moment: p.moment, slot: p.slot };
  switch (c.kind) {
    case 'word': return { ...base, id: c.word, carrier: c.word };
    case 'plural': { const w = c.form === 'many' ? words.get(c.word)?.plural ?? c.word : c.word; return { ...base, id: w, carrier: w }; }
    case 'twin': return { ...base, id: c.words[0], carrier: c.words[0], twin: c.words[1] };
    case 'maths': return { ...base, id: mathsId(c.task), carrier: '' };
    case 'door': return { ...base, id: `num:${c.n}`, carrier: '' };
    case 'spell': return { ...base, id: c.focus[0] ?? '', carrier: '' };
    case 'first-sound': return { ...base, id: c.gpc, carrier: '' };
    case 'phrase': return { ...base, id: c.phrase, carrier: c.phrase };
    default: return null;
  }
}

export function itemIdFor(c: Content, strand: Strand, id: string): string | null {
  if ((c.items as any)[id] || id.startsWith('name:')) return id;
  const items = Object.values(c.items) as any[];
  const num = /^num:(\d+)$/.exec(id);
  if (num) return items.find((it) => it.task?.op === 'numeral' && it.task.n === Number(num[1]))?.id ?? null;
  if (/^(r|s|m):/.test(id)) return id; // already a LEARN id from a pick
  if (id === 'capital') return items.find((it) => it.kind === 'capital' && it.strand === strand)?.id ?? null;
  const usual = usualSound(id)?.join('+');
  const cands = items.filter((it) => it.kind === 'grapheme' && it.strand === strand && c.gpcs[it.gpc]?.text === id);
  const ipa = usesIpa(c);
  return (cands.find((it) => (c.gpcs[it.gpc].phonemes as string[]).map((p) => toToken(p, ipa)).join('+') === usual) ?? cands[0])?.id ?? null;
}

const MOMENT_OF_PLACE: Record<string, string> = { nest: 'egg-moon', wish: 'wish', 'twin-wish': 'twin-wish', station: 'station-wish', naming: 'naming-bells', door: 'door-visit', rollcall: 'roll-call' };

export function toLearnPayload(d: LearnResultDraft, c: Content): Record<string, unknown> {
  const items = d.items.map((i) => ({ id: itemIdFor(c, d.strand, i.id), r: i.result })).filter((i): i is { id: string; r: typeof d.result } => i.id !== null);
  return {
    type: 'learn.result', strand: d.strand, step: d.strand === 'name' ? null : d.step, carrier: d.carrier, items, result: d.result,
    ms: d.ms, scaffold: d.scaffold, error: d.error ?? null, place: d.place,
    moment: d.moment ?? (d.strand === 'name' ? 'roll-call' : d.place === 'rollcall' ? 'roll-call-door' : MOMENT_OF_PLACE[d.place]),
    slot: d.slot ?? (d.strand === 'name' ? 'name' : d.source === 'side' ? 'side' : d.source), probe: d.probe,
  };
}

const EGG_MOMENTS = ['egg-moon', 'egg-small-nest', 'egg-two-stone', 'egg-blanket', 'egg-berry', 'egg-snow'];
const REQUESTS: Record<HbSlot, ItemRequest> = {
  egg: { strand: 'm', moments: EGG_MOMENTS, place: 'nest' } as ItemRequest,
  wish: { strand: 'r', moments: ['wish', 'one-or-many', 'twin-wish', 'tricky-act', 'basket-and', 'basket-adj', 'asking-bubble', 'two-state-wish'], place: 'meadow' } as ItemRequest,
  naming: { strand: 's', moments: ['naming-bells', 'naming-garden', 'first-sound'], place: 'naming' } as ItemRequest,
  door: { strand: 'm', moments: ['door-visit'], place: 'stalls' } as ItemRequest,
  'rollcall-door': { strand: 'm', moments: ['roll-call-door'], place: 'goodnight' } as ItemRequest,
};

export function serve(slot: HbSlot, rng: Rng, accept: (s: Served) => boolean = () => true, extra: Partial<ItemRequest> = {}): Served | null {
  const words = wordEntries(game.content as Content);
  const avoid: string[] = [];
  for (let i = 0; i < 6; i++) {
    const p = nextItem(game.planContext, { ...REQUESTS[slot], ...extra, avoid } as ItemRequest, rng);
    if (!p) return null;
    const s = servedFromPick(p, words);
    if (s && accept(s)) return s;
    avoid.push(carrierKey(p.carrier));
  }
  return null;
}

export function serveEgg(rng: Rng): { served: Served | null; kind: EggKind } {
  const offer = nextEgg(game.planContext, rng) as { kind: EggKind; pick: Pick | null };
  return { kind: offer.kind, served: offer.pick ? servedFromPick(offer.pick, new Map()) : null };
}

const STATE: Record<string, StepState> = { passed: 'passed', placed: 'placed', side: 'side', school: 'school', current: 'current', waiting: 'waiting', display: 'locked', ahead: 'locked' };
export function stepStatusOf(_strand: 'r' | 's' | 'm', step: string): StepState {
  const c = game.content as Content;
  return c.steps[step] ? STATE[stepStatus(game.learner, c, step)] ?? 'locked' : 'locked';
}
export function currentStepOf(strand: 'r' | 's' | 'm'): string {
  return currentStep(game.learner, game.content as Content, strand) ?? (strand === 'r' ? 'R01' : strand === 's' ? 'S01' : 'M01');
}
export function secure(_strand: 'r' | 's' | 'm', step: string): boolean {
  return isSecure(game.learner, game.content as Content, step);
}
export function spellingBehind(): boolean {
  return spellingShareLow(game.learner, game.content as Content);
}
export function checkedCount(): number {
  return visitStats(game.learner).total;
}
// LEARN's nextNameReviews applies spec 3.7 (decodable or read before, due first, one of each name per round).
export function nameReviewIds(herd: { id: string; name: string | null; nameGems: string[] }[], n: number, rng: Rng): string[] {
  const c = game.content as Content;
  const gpcOf = (g: string) => Object.values(c.gpcs).find((x: any) => x.text === g.toLowerCase()) as { id: string } | undefined;
  const cands = herd.filter((b) => b.name).map((b) => ({ babyId: b.id, name: b.name!, gpcs: b.nameGems.map((g) => gpcOf(g)?.id).filter((x): x is string => !!x) }));
  return nextNameReviews(game.planContext, cands, n, 'roll-call', rng).map((p: Pick) => (p.carrier as { babyId: string }).babyId);
}
```

The ladders the naming context needs (`makeSpellCtx`) come from `Object.values(c.steps).filter((s) => s.strand === 's')` with `items` mapped to their `gpc` texts; `Naming.svelte` builds them with `spellLadder(c)`:

```ts
export function spellLadder(c: Content): { id: string; items: string[] }[] {
  return (c.order.s as string[]).map((id) => ({ id, items: ((c.steps[id].items as any[]) ?? []).map((it) => (it.gpc ? c.gpcs[it.gpc]?.text ?? it.gpc : it.kind === 'capital' ? 'capital' : '')).filter(Boolean) }));
}
export function readLadder(c: Content): { id: string; items: string[] }[] {
  return (c.order.r as string[]).map((id) => ({ id, items: ((c.steps[id].items as any[]) ?? []).map((it) => (it.gpc ? c.gpcs[it.gpc]?.text ?? it.gpc : it.ending ? `-${it.ending}` : '')).filter(Boolean) }));
}
```

Add both to `learn-bridge.ts`. CORE's action router (C4) applies `toLearnPayload(draft, game.content)` to every `learn.result` draft from `applyHeartbeat` and `applyNaming` before `makeEvent`.

- [ ] **Step 4: Write `hint-runner.ts`, `guides.svelte.ts` and `HbGuides.svelte`**

`src/scenes/heartbeat/hint-runner.ts`:

```ts
import { createMoment, type Moment } from '../../ui/moment.ts';
import { defaultDeps } from '../../ui/moment-deps.ts';
import type { Strand } from '../../core/heartbeat/types.ts';

export interface HintRunner {
  begin(goal: { idleMs: number; step?: string; repeat: () => Promise<void>; focused: () => Promise<void>; answer: () => Promise<void> }): void;
  touch(): void;
  miss(): Promise<void>;
  readonly level: 0 | 1 | 2 | 3;
  end(): void;
}

// PLACES' moment runs the hint ladder and the idle flag; this keeps the heartbeat controllers' simpler interface.
export function createHintRunner(meta: { place: string; strand: Strand }): HintRunner {
  let m: Moment | null = null;
  let ghosted = false;
  return {
    begin(g) {
      m?.dispose();
      ghosted = false;
      let calls = 0;
      const deps = defaultDeps();
      m = createMoment({
        strand: meta.strand as any, step: (g.step ?? '') as any, place: meta.place as any, goal: [],
        focused: () => g.focused(),
        ghost: async () => { ghosted = true; await g.answer(); },
        hookAnswer: () => {}, hookWrong: () => {},
      }, { ...deps, say: async () => { if (calls++ > 0) await g.repeat(); } }); // the controller says the goal itself
      void m.start();
    },
    touch() { m?.touch(); },
    async miss() { m?.miss(); },
    get level() {
      const s = m?.state;
      if (!s) return 0;
      if (ghosted || s.level === 3) return 3;
      if (s.idleHint) return 2;
      return Math.min(s.level, 1) as 0 | 1;
    },
    end() { m?.dispose(); },
  };
}
```

`src/scenes/heartbeat/guides.svelte.ts`:

```ts
import { ghostMove, ghostStop, ghostTap } from '../../ui/ghost.ts';
import { rectInStage } from '../../ui/stage.ts';

type Rect = { x: number; y: number; w: number; h: number };
const centre = (el: Element) => { const r = rectInStage(el); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };

export const ghost = {
  drag: (from: Element, to: Element) => ghostMove(centre(from), centre(to), { ms: 1400 }),
  tap: (el: Element) => ghostTap(centre(el), 2),
  hide: () => ghostStop(),
};

let beam = $state<Rect | null>(null);
export const moonbeam = {
  get rect(): Rect | null { return beam; },
  show(els: Element | Element[]) {
    const list = (Array.isArray(els) ? els : [els]).filter(Boolean).map(rectInStage);
    if (!list.length) { beam = null; return; }
    const x = Math.min(...list.map((r) => r.x)), y = Math.min(...list.map((r) => r.y));
    beam = { x, y, w: Math.max(...list.map((r) => r.x + r.w)) - x, h: Math.max(...list.map((r) => r.y + r.h)) - y };
  },
  clear() { beam = null; },
};

let repeatFn: (() => Promise<void>) | null = null;
export const goal = {
  set(fn: () => Promise<void>) { repeatFn = fn; },
  clear() { repeatFn = null; },
  async replay() { if (repeatFn) await repeatFn(); },
};
```

`src/scenes/heartbeat/HbGuides.svelte`:

```svelte
<script lang="ts">
  import Moonbeam from '../../ui/Moonbeam.svelte';
  import GhostHand from '../../ui/GhostHand.svelte';
  import ReplayButton from '../../ui/ReplayButton.svelte';
  import { goal, moonbeam } from './guides.svelte.ts';
</script>

<Moonbeam target={moonbeam.rect} area={true} />
<GhostHand />
<ReplayButton onreplay={() => goal.replay()} />
```

Every heartbeat scene (Nest, Naming, Wish, Stalls, Goodnight) renders `<HbGuides />` as the first child of its `<section>` and imports `ghost`, `moonbeam` and `goal` from `./heartbeat/guides.svelte.ts`.

- [ ] **Step 5: Add the free egg and the building breeds**

In `src/core/heartbeat/types.ts`: `export type BreedId = 'moon' | 'nestling' | 'pebble' | 'cosy' | 'berry' | 'snow' | 'bubble' | 'post' | 'sparkle';`.

In `src/core/actions/heartbeat.ts`: change `EggHatchedDraft.kind` to `EggKind | null`, add `| { type: 'hb.egg.free'; baby: string; kind: EggKind; roll: HatchRoll }` to `HbAction`, and add the case:

```ts
    case 'hb.egg.free':
      return [{ type: 'egg.hatched', baby: a.baby, kind: a.kind, breed: a.roll.breed, colours: a.roll.colours, traits: a.roll.traits, source: 'nest' }];
```

with this test added to `tests/heartbeat/actions.test.ts`:

```ts
  it('hatches a free egg without a learning result', () => {
    const d = applyHeartbeat({ type: 'hb.egg.free', baby: 'b2', kind: 'moon', roll: { ...roll, breed: 'moon' } });
    expect(d).toEqual([{ type: 'egg.hatched', baby: 'b2', kind: 'moon', breed: 'moon', colours: roll.colours, traits: roll.traits, source: 'nest' }]);
  });
```

Task 18's `NestCtrl` takes `free?: boolean` and dispatches `hb.egg.free` for a free egg; `Nest.svelte` gets its egg from `serveEgg`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/heartbeat`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/learn-bridge.ts src/scenes/heartbeat/hint-runner.ts src/scenes/heartbeat/guides.svelte.ts src/scenes/heartbeat/HbGuides.svelte src/core/actions/heartbeat.ts src/core/heartbeat/types.ts tests/heartbeat/learn-bridge.test.ts tests/heartbeat/actions.test.ts
git commit -m "Bridge the heartbeat to the learning planner and the places hint ladder"
```

**Acceptance:** bridge tests pass; no heartbeat scene imports `src/core/planner/`, `src/core/learning/`, `src/ui/moment.ts` or `src/ui/ghost.ts` directly (check: `grep -rn "core/planner\|core/learning\|ui/moment\|ui/ghost.ts" src/scenes/*.svelte` prints nothing).

---

### Task 18: Scene deps, the Nest and the Hatch

**Files:**
- Create: `src/scenes/heartbeat/deps.ts`, `src/scenes/heartbeat/nest.ctrl.ts`, `src/scenes/heartbeat/ArtImg.svelte`, `src/scenes/heartbeat/Fallback.svelte`, `src/scenes/Nest.svelte`, `src/scenes/Hatch.svelte`, `tests/heartbeat/fakes.ts`
- Test: `tests/heartbeat/nest.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 4, 15, 17, 17B; `audio` (C9); `createHintRunner`, `ghost`, `moonbeam`, `goal`, `serveEgg` (Task 17B); `game` (C6); `artUrl`, `Unicorn` (C12); `testSeed`, `isFast` (C7, see the note in this task).
- Produces:

```ts
// deps.ts
export type SceneDeps = { audio: AudioApi; hints: HintRunner; dispatch: (a: { type: string }) => void;
  now: () => number; rng: Rng; uuid: () => string; pause: (ms: number) => Promise<void> };
export function liveDeps(meta: { place: string; strand: 'r' | 's' | 'm' | 'name' }): SceneDeps;
export const FALLBACK_EGG: Served;    // used only if the planner returns null for the nest
// nest.ctrl.ts
export type NestView = { placed: string[]; warmNow: number; mood: 'hot' | 'cold' | null; diff: number; solved: boolean };
export class NestCtrl {
  readonly task: EggTask; readonly stones: StoneSpec[]; babyId: string | null; onchange: () => void;
  constructor(served: Served, d: SceneDeps, opts: { golden: boolean; speckled: boolean; firstEver: boolean; free?: boolean });
  begin(): Promise<void>; repeatGoal(): Promise<void>; touch(): void;
  place(stoneId: string): Promise<'solved' | 'miss' | 'need-more' | 'ignored'>;
  answerIds(): string[]; wrongId(): string | null; view(): NestView;
}
```

C7 needs two more test-hook exports, added here to the contract: `testSeed(): number | null` (the value set by `__game.seed(n)`, null in production) and `isFast(): boolean` (true after `__game.fast(true)`; in fast mode `audio` calls resolve at once). `deps.ts` imports both from `src/test-hook.ts`.

- [ ] **Step 1: Write the fakes and the failing test**

`tests/heartbeat/fakes.ts`:

```ts
import type { SceneDeps } from '../../src/scenes/heartbeat/deps.ts';
import { makeRng } from '../../src/core/rng.ts';

export function fakeDeps(opts: { names?: string[]; seed?: number } = {}) {
  const said: string[] = [];
  const actions: any[] = [];
  const names = new Set(opts.names ?? []);
  let level: 0 | 1 | 2 | 3 = 0;
  let misses = 0;
  let clock = 1000;
  let n = 0;
  const deps: SceneDeps = {
    audio: {
      say: async (id) => { said.push(id); },
      sayAll: async (ids) => { said.push(...ids); },
      sayOptional: async (id) => { said.push(`?${id}`); return true; },
      sayName: async (k, m) => { if (!names.has(k)) return false; said.push(`name:${k}${m}`); return true; },
      hasName: (k) => names.has(k),
      sound: async (g) => { said.push(`snd:${g}`); },
      hold: (g) => { said.push(`hold:${g}`); return { stop() {}, done: Promise.resolve() }; },
      sfx: async (x) => { said.push(`sfx:${x}`); },
      stop() {}, act() {}, listen: (p) => p,
    },
    hints: {
      begin() { level = 0; misses = 0; },
      touch() {},
      async miss() { misses++; if (misses >= 2) level = 3; }, // a miss runs the focused hint but is not help (places.md D1)
      get level() { return level; },
      end() {},
    },
    dispatch: (a) => { actions.push(a); },
    now: () => (clock += 250),
    rng: makeRng(opts.seed ?? 1),
    uuid: () => `baby-${++n}`,
    pause: async () => {},
  };
  return { deps, said, actions, idle: (l: 1 | 2) => { if (l > level) level = l; } };
}
```

`tests/heartbeat/nest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NestCtrl } from '../../src/scenes/heartbeat/nest.ctrl.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { fakeDeps } from './fakes.ts';

const served = (step: string, id: string): Served => ({ strand: 'm', step, id, carrier: '', items: [id], scaffold: 1, probe: false, source: 'current' });
const opts = { golden: false, speckled: false, firstEver: false };

describe('NestCtrl', () => {
  it('hatches on a first try and logs it', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(served('M09', '3+7'), f.deps, opts);
    await c.begin();
    expect(f.said).toEqual(['g-egg']);
    expect(await c.place(c.answerIds()[0])).toBe('solved');
    expect(f.actions).toHaveLength(1);
    expect(f.actions[0]).toMatchObject({ type: 'hb.egg.solved', baby: 'baby-1', result: 'first', error: null, served: { step: 'M09' } });
    expect(f.actions[0].ms).toBeGreaterThanOrEqual(0);
    expect(f.said.slice(-2)).toEqual(['fb-warm', 'num-bond-3-7']);
    expect(await c.place(c.answerIds()[0] ?? 'stone-0')).toBe('ignored');
  });
  it('reacts to a wrong stone, then counts the answer as a miss', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(served('M09', '3+7'), f.deps, opts);
    await c.begin();
    const big = c.stones.find((s) => s.value === 8)!;
    expect(await c.place(big.id)).toBe('miss');
    expect(f.said).toContain('fb-hot');
    expect(f.said).toContain('num-over-1');
    expect(c.view().mood).toBe('hot');
    await c.place(c.answerIds()[0]);
    expect(f.actions[0]).toMatchObject({ result: 'miss', error: 'off-by-one' });
  });
  it('waits for the second stone of a two-stone egg and rolls a wrong one back', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(served('M10', '3+7'), f.deps, opts);
    await c.begin();
    const three = c.stones.find((s) => s.value === 3)!;
    expect(await c.place(three.id)).toBe('need-more');
    expect(f.said).toContain('g-one-more');
    const wrong = c.stones.find((s) => s.value !== 7 && s.id !== three.id)!;
    expect(await c.place(wrong.id)).toBe('miss');
    expect(c.view().placed).toEqual([three.id]);
    expect(await c.place(c.answerIds()[0])).toBe('solved');
    expect(f.said).toContain('num-bond-3-7');
  });
  it('gives the ghost hand a stone that is not the answer on the very first egg', () => {
    const f = fakeDeps();
    const c = new NestCtrl(served('M02', 'num:4'), f.deps, { ...opts, firstEver: true });
    const w = c.wrongId()!;
    expect(c.stones.find((s) => s.id === w)!.value).not.toBe(4);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/nest.test.ts`
Expected: FAIL, cannot resolve `src/scenes/heartbeat/nest.ctrl.ts`.

- [ ] **Step 3: Write `deps.ts` and `nest.ctrl.ts`**

`src/scenes/heartbeat/deps.ts`:

```ts
import { audio, type AudioApi } from '../../audio/index.ts';
import { createHintRunner, type HintRunner } from './hint-runner.ts';
import { game } from '../../game.svelte.ts';
import { makeRng, type Rng } from '../../core/rng.ts';
import type { Served } from '../../core/heartbeat/types.ts';
import { isFast, testSeed } from '../../test-hook.ts';

export type SceneDeps = {
  audio: AudioApi; hints: HintRunner; dispatch: (a: { type: string }) => void;
  now: () => number; rng: Rng; uuid: () => string; pause: (ms: number) => Promise<void>;
};

export function liveDeps(meta: { place: string; strand: 'r' | 's' | 'm' | 'name' }): SceneDeps {
  return {
    audio,
    hints: createHintRunner(meta),
    dispatch: (a) => game.dispatch(a),
    now: () => Date.now(),
    rng: makeRng(testSeed() ?? Date.now() % 2147483647),
    uuid: () => crypto.randomUUID(),
    pause: (ms) => new Promise((r) => setTimeout(r, isFast() ? 0 : ms)),
  };
}

// The planner always serves the nest (C10). This guard only keeps the nest playable if it ever does not.
export const FALLBACK_EGG: Served = { strand: 'm', step: 'M02', id: 'num:3', carrier: '', items: ['num:3'], scaffold: 1, probe: false, source: 'review' };
```

`src/scenes/heartbeat/nest.ctrl.ts`:

```ts
import type { ErrorTag, Served } from '../../core/heartbeat/types.ts';
import { type EggTask, buildEggTask, focusedHintLines, goalLines, judgeStones, missLines, successLines } from '../../core/maths/eggs.ts';
import { type StoneSpec, planStones } from '../../core/maths/stones.ts';
import { rollHatch } from '../../core/heartbeat/hatch.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import type { SceneDeps } from './deps.ts';

export type NestView = { placed: string[]; warmNow: number; mood: 'hot' | 'cold' | null; diff: number; solved: boolean };

export class NestCtrl {
  readonly task: EggTask;
  readonly stones: StoneSpec[];
  babyId: string | null = null;
  onchange: () => void = () => {};
  private placed: StoneSpec[] = [];
  private misses = 0;
  private solved = false;
  private mood: 'hot' | 'cold' | null = null;
  private diff = 0;
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(readonly served: Served, private d: SceneDeps, readonly opts: { golden: boolean; speckled: boolean; firstEver: boolean; free?: boolean }) {
    this.task = buildEggTask(served);
    this.stones = planStones(this.task, d.rng);
  }

  async begin(): Promise<void> {
    await this.d.audio.sayAll(goalLines(this.task, this.opts.firstEver));
    this.startedAt = this.d.now();
    this.d.hints.begin({
      idleMs: 15000,
      repeat: () => this.repeatGoal(),
      focused: () => this.d.audio.sayAll(focusedHintLines(this.task, this.placed.map((s) => s.value))),
      answer: async () => { for (const id of this.answerIds()) await this.place(id, true); },
    });
  }

  repeatGoal(): Promise<void> {
    return this.d.audio.sayAll(goalLines(this.task, false));
  }

  touch(): void {
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
  }

  answerIds(): string[] {
    const free = this.stones.filter((s) => !this.placed.includes(s));
    if (this.task.stonesNeeded === 2) {
      if (this.placed.length === 1) { const p = free.find((s) => s.value === 10 - this.placed[0].value); return p ? [p.id] : []; }
      const a = free[0];
      const b = free.find((s) => s !== a && s.value === 10 - a.value);
      return b ? [a.id, b.id] : [];
    }
    const s = free.find((x) => x.value === this.task.target);
    return s ? [s.id] : [];
  }

  wrongId(): string | null {
    const right = new Set(this.answerIds());
    return this.stones.find((s) => !right.has(s.id) && !this.placed.includes(s))?.id ?? null;
  }

  view(): NestView {
    return { placed: this.placed.map((s) => s.id), warmNow: this.task.warm + this.placed.reduce((n, s) => n + s.value, 0),
      mood: this.mood, diff: this.diff, solved: this.solved };
  }

  async place(stoneId: string, ghost = false): Promise<'solved' | 'miss' | 'need-more' | 'ignored'> {
    if (this.solved) return 'ignored';
    const s = this.stones.find((x) => x.id === stoneId);
    if (!s || this.placed.includes(s)) return 'ignored';
    if (!ghost) this.touch();
    this.d.audio.act();
    this.mood = null;
    this.placed.push(s);
    this.onchange();
    if (this.task.stonesNeeded === 2 && this.placed.length === 1) {
      await this.d.audio.say('g-one-more');
      return 'need-more';
    }
    const values = this.placed.map((x) => x.value);
    const v = judgeStones(this.task, values);
    if (!v.ok) {
      this.misses++;
      this.lastError = v.error ?? 'other';
      this.mood = v.diff > 0 ? 'hot' : 'cold';
      this.diff = v.diff;
      this.placed = this.task.stonesNeeded === 2 ? this.placed.slice(0, 1) : [];
      this.onchange();
      await this.d.audio.sayAll(missLines(this.task, v.diff));
      await this.d.hints.miss();
      return 'miss';
    }
    this.solved = true;
    this.d.hints.end();
    const result = momentResult(this.misses, this.d.hints.level);
    const roll = rollHatch({ kind: this.task.kind, result, golden: this.opts.golden, speckled: this.opts.speckled, rng: this.d.rng });
    this.babyId = this.d.uuid();
    if (this.opts.free) this.d.dispatch({ type: 'hb.egg.free', baby: this.babyId, kind: this.task.kind, roll }); // LEARN Decision 10: no result
    else this.d.dispatch({
      type: 'hb.egg.solved', baby: this.babyId, egg: this.task, served: this.served, result, roll,
      ms: Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt), error: result === 'first' ? null : this.lastError,
    });
    this.onchange();
    await this.d.audio.sayAll(successLines(this.task, values));
    return 'solved';
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/nest.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `ArtImg`, `Fallback`, `Nest` and `Hatch`**

`src/scenes/heartbeat/ArtImg.svelte`:

```svelte
<script lang="ts">
  import { artUrl } from '../../art/index.ts';
  import Fallback from './Fallback.svelte';
  let { id, size = 120, tint = '' }: { id: string; size?: number; tint?: string } = $props();
  const url = $derived(artUrl(id));
</script>

{#if url}<img src={url} alt="" draggable="false" style:width="{size}px" style:height="{size}px" />{:else}<Fallback {id} {size} {tint} />{/if}

<style>img { object-fit: contain; pointer-events: none; display: block; }</style>
```

`src/scenes/heartbeat/Fallback.svelte` draws simple SVGs in the locked style (soft fills, warm outline, highlight top left). One branch per id prefix:

```svelte
<script lang="ts">
  let { id, size = 120, tint = '' }: { id: string; size?: number; tint?: string } = $props();
  const EGG: Record<string, string> = { 'egg-moon': '#e6dcff', 'egg-nest': '#ffe0ef', 'egg-two-stone': '#d6f1ff', 'egg-blanket': '#fff3c4',
    'egg-berry': '#ffd0e8', 'egg-snow': '#eef8ff', 'egg-golden': '#ffd86b', 'egg-speckled': '#f5ecd9' };
  const kind = $derived(id.startsWith('egg-') ? 'egg' : id.startsWith('station-') ? 'station' : id);
</script>

<svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
  <defs><radialGradient id="hl" cx="30%" cy="25%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".85" /><stop offset=".35" stop-color="#fff" stop-opacity="0" /></radialGradient></defs>
  {#if kind === 'egg'}
    <path d="M100 10 C160 10 190 100 190 140 C190 180 150 196 100 196 C50 196 10 180 10 140 C10 100 40 10 100 10 Z" fill={tint || EGG[id] || '#e6dcff'} stroke="#9a7bc4" stroke-width="6" />
    {#if id === 'egg-speckled'}{#each [[70, 70], [130, 90], [90, 140], [140, 150], [60, 120]] as [x, y]}<circle cx={x} cy={y} r="7" fill="#c9a77a" />{/each}{/if}
    <path d="M100 10 C160 10 190 100 190 140 C190 180 150 196 100 196 C50 196 10 180 10 140 C10 100 40 10 100 10 Z" fill="url(#hl)" />
  {:else if kind === 'small-nest'}
    <ellipse cx="100" cy="140" rx="92" ry="44" fill="#d9a066" stroke="#a46a33" stroke-width="6" />
  {:else if kind === 'blanket'}
    <path d="M10 90 Q100 50 190 90 L190 170 Q100 196 10 170 Z" fill="#ffc4e1" stroke="#e0559c" stroke-width="6" />
  {:else if kind === 'bell' || kind === 'bell-gold'}
    <path d="M100 14 C140 30 152 66 152 104 L152 140 L170 162 L30 162 L48 140 L48 104 C48 66 60 30 100 14 Z" fill={kind === 'bell-gold' ? '#ffd25e' : tint || '#ffd0e8'} stroke={kind === 'bell-gold' ? '#c98a14' : '#e0559c'} stroke-width="6" />
    <circle cx="100" cy="176" r="14" fill="#ffd25e" stroke="#c98a14" stroke-width="5" />
  {:else if kind === 'door'}
    <rect x="30" y="20" width="140" height="170" rx="60" fill="#c98f5a" stroke="#8a5a2e" stroke-width="6" />
  {:else if kind === 'tent'}
    <path d="M100 20 L190 180 L10 180 Z" fill="#c8e4ff" stroke="#4f93d6" stroke-width="6" /><path d="M100 80 L130 180 L70 180 Z" fill="#7aa7d6" />
  {:else if kind === 'lantern'}
    <rect x="60" y="40" width="80" height="120" rx="24" fill="#ffe68a" stroke="#c98a14" stroke-width="6" /><circle cx="100" cy="100" r="26" fill="#fff6c8" />
  {:else if kind === 'basket'}
    <path d="M20 90 L180 90 L160 180 L40 180 Z" fill="#e8b878" stroke="#a46a33" stroke-width="6" /><path d="M40 90 Q100 10 160 90" fill="none" stroke="#a46a33" stroke-width="8" />
  {:else if kind === 'station'}
    <rect x="20" y="30" width="160" height="150" rx="36" fill="#dcffe8" stroke="#3fae7a" stroke-width="6" />
  {:else if kind === 'moonflower'}
    {#each [0, 72, 144, 216, 288] as a}<ellipse cx="100" cy="60" rx="22" ry="40" fill="#f5d9ff" stroke="#c46bff" stroke-width="4" transform="rotate({a} 100 100)" />{/each}<circle cx="100" cy="100" r="18" fill="#ffd25e" />
  {:else if kind === 'sky-unicorn'}
    {#each [[60, 120], [90, 80], [130, 70], [150, 110], [110, 140], [70, 160], [140, 160], [120, 40], [80, 50], [100, 110]] as [x, y]}<circle cx={x} cy={y} r="8" fill="#fff6c8" />{/each}
  {:else}
    <circle cx="100" cy="100" r="80" fill="#efe6ff" stroke="#9a7bc4" stroke-width="6" />
  {/if}
</svg>
```

`src/scenes/Nest.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { serveEgg } from './heartbeat/learn-bridge.ts';
  import type { Served } from '../core/heartbeat/types.ts';
  import { NestCtrl } from './heartbeat/nest.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import { FALLBACK_EGG, liveDeps } from './heartbeat/deps.ts';
  import { exposeCtrl } from './heartbeat/test-hooks.ts';
  import { draggable } from '../ui/drag.ts';
  import { ghost } from './heartbeat/guides.svelte.ts';
  import { moonbeam } from './heartbeat/guides.svelte.ts';
  import { goal } from './heartbeat/guides.svelte.ts';
  import Stone from '../ui/Stone.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';

  const deps = liveDeps({ place: 'nest', strand: 'm' });
  const p = game.params as { served?: Served; golden?: boolean; speckled?: boolean };
  const offer = p.served ? null : serveEgg(deps.rng);
  const served = p.served ?? offer?.served ?? FALLBACK_EGG;
  const ctrl = new NestCtrl(served, deps, { golden: !!p.golden, speckled: !!p.speckled, firstEver: game.world.flowers === 0, free: !p.served && !offer?.served });
  let tick = $state(0);
  ctrl.onchange = () => tick++;
  const view = $derived.by(() => { tick; return ctrl.view(); });
  const t = ctrl.task;
  const eggArt = p.golden ? 'egg-golden' : p.speckled ? 'egg-speckled' : `egg-${t.kind}`;
  let nestEl: HTMLElement;
  const stoneEls: Record<string, HTMLElement> = {};
  let flash = $state(t.mode === 'stars-flash');
  const targets = () => [{ id: 'nest', el: nestEl }];

  function showStars() { if (t.mode !== 'stars-flash') return; flash = true; setTimeout(() => (flash = false), 2000); }
  async function drop(id: string, target: string | null) {
    if (target !== 'nest') return;
    const r = await ctrl.place(id);
    if (r === 'solved') { moonbeam.clear(); goal.clear(); await deps.pause(700); game.go('hatch', { baby: ctrl.babyId, egg: eggArt }); }
  }
  onMount(async () => {
    exposeCtrl('nest', { ctrl, drop });
    goal.set(() => ctrl.repeatGoal());
    showStars();
    moonbeam.show(Object.values(stoneEls));
    await ctrl.begin();
    if (ctrl.opts.firstEver) { const w = ctrl.wrongId(); if (w) await ghost.drag(stoneEls[w], nestEl); }
  });
  onDestroy(() => { goal.clear(); moonbeam.clear(); });
</script>

<section class="nest-scene" aria-label="nest scene">
  <HbGuides />
  <div class="bg"><ArtImg id="bg-nest" size={1180} /></div>
  <button class="egg" class:hot={view.mood === 'hot'} class:cold={view.mood === 'cold'} class:wobble={view.solved}
    data-touch aria-label="egg" bind:this={nestEl} onpointerup={() => { ctrl.touch(); showStars(); }}>
    <ArtImg id={eggArt} size={300} />
    {#if t.mode === 'stars' || (t.mode === 'stars-flash' && flash)}
      <span class="stars">{#each Array(t.shown) as _, i}<i style:--i={i}>★</i>{/each}</span>
    {/if}
  </button>
  {#if t.cups > 0}
    <div class="cups" class:blanket={t.mode === 'blanket' && !view.solved} style:--n={t.cups}>
      {#each Array(t.cups) as _, i}<span class="cup" class:warm={i < view.warmNow}></span>{/each}
      {#if t.mode === 'blanket' && !view.solved}<span class="cover"><ArtImg id="blanket" size={360} /></span>{/if}
    </div>
  {/if}
  {#if view.mood === 'hot'}<span class="steam" aria-hidden="true"></span>{/if}
  {#if view.mood === 'cold'}<span class="frost" aria-hidden="true"></span>{/if}
  <div class="stones">
    {#each ctrl.stones as s (s.id)}
      {#if !view.placed.includes(s.id)}
        <span class="slot" data-touch aria-label="stone {s.value}" bind:this={stoneEls[s.id]}
          use:draggable={{ targets, ondrop: (tg) => drop(s.id, tg) }}><Stone spec={s} /></span>
      {/if}
    {/each}
  </div>
</section>

<style>
  .nest-scene { position: absolute; inset: 0; touch-action: none; }
  .bg { position: absolute; inset: 0; }
  .egg { position: absolute; left: 230px; top: 110px; width: 320px; height: 320px; background: none; border: 0; }
  .egg.hot { animation: shake 0.4s 2; } .egg.cold { animation: shiver 0.15s 6; } .egg.wobble { animation: wob 0.5s 3; }
  .stars { position: absolute; inset: 70px 60px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-content: center; font-size: 40px; color: #ffd25e; }
  .cups { position: absolute; left: 160px; top: 470px; display: grid; grid-template-columns: repeat(5, 84px); gap: 14px; }
  .cup { width: 84px; height: 64px; border-radius: 0 0 40px 40px; background: #d6e4f2; border: 4px solid #8aa4c4; }
  .cup.warm { background: #ffc061; border-color: #c9772a; }
  .cover { position: absolute; inset: -30px; }
  .steam, .frost { position: absolute; left: 260px; top: 60px; width: 260px; height: 120px; pointer-events: none; border-radius: 60px; animation: fade 1.6s forwards; }
  .steam { background: radial-gradient(#fff8, #fff0); } .frost { background: radial-gradient(#dff4ff, #dff4ff00); }
  .stones { position: absolute; right: 60px; top: 120px; display: grid; grid-template-columns: repeat(2, 120px); gap: 22px; }
  @keyframes shake { 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
  @keyframes shiver { 50% { transform: translateX(4px); } }
  @keyframes wob { 50% { transform: rotate(6deg) scale(1.03); } }
  @keyframes fade { to { opacity: 0; transform: translateY(-40px); } }
</style>
```

`src/scenes/Hatch.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { audio } from '../audio/index.ts';
  import Unicorn from '../art/Unicorn.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import { liveDeps } from './heartbeat/deps.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';

  const deps = liveDeps({ place: 'hatch', strand: 'm' });
  const { baby: babyId, egg = 'egg-moon' } = game.params as { baby: string; egg?: string };
  const baby = $derived(game.world.herd.find((b) => b.id === babyId));
  let phase = $state<'wobble' | 'crack' | 'burst' | 'hello'>('wobble');
  onMount(async () => {
    await audio.say('lumi-hatching');
    await deps.pause(900); phase = 'crack'; void audio.sfx('hatch');
    await deps.pause(900); phase = 'burst'; await audio.sfx('fanfare');
    phase = 'hello';
    await audio.say('lumi-baby');
    if (baby?.traits.shiny) { void audio.sfx('sparkle'); await audio.say('lumi-sparkly'); }
    await audio.say('foal-hello');
    await deps.pause(600);
    heartbeat.hatched(babyId);
  });
</script>

<section class="hatch" aria-label="hatch scene">
  <div class="bg"><ArtImg id="bg-nest" size={1180} /></div>
  {#if phase !== 'hello'}
    <span class="egg {phase}"><ArtImg id={egg} size={300} /></span>
  {:else if baby}
    <span class="baby" class:shiny={!!baby.traits.shiny}><Unicorn {baby} pose="hop" size={340} label="new baby" /></span>
    <span class="flower"><ArtImg id="moonflower" size={90} /></span>
  {/if}
</section>

<style>
  .hatch { position: absolute; inset: 0; }
  .bg { position: absolute; inset: 0; }
  .egg { position: absolute; left: 440px; top: 220px; }
  .egg.wobble { animation: wob 0.45s infinite; } .egg.crack { animation: wob 0.25s infinite; } .egg.burst { animation: pop 0.4s forwards; }
  .baby { position: absolute; left: 420px; top: 180px; animation: rise 0.6s ease-out; }
  .shiny::after { content: ''; position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(#fff6, #fff0 70%); animation: tw 1.2s infinite; }
  .flower { position: absolute; left: 820px; top: 600px; animation: rise 0.8s ease-out; }
  @keyframes wob { 50% { transform: rotate(5deg); } }
  @keyframes pop { to { transform: scale(1.4); opacity: 0; } }
  @keyframes rise { from { transform: translateY(40px) scale(0.6); opacity: 0; } }
  @keyframes tw { 50% { opacity: 0.4; } }
</style>
```

- [ ] **Step 6: Type check and test**

Run: `npx vitest run tests/heartbeat && npm run check`
Expected: tests PASS; no type errors in this task's files.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/deps.ts src/scenes/heartbeat/nest.ctrl.ts src/scenes/heartbeat/ArtImg.svelte src/scenes/heartbeat/Fallback.svelte src/scenes/Nest.svelte src/scenes/Hatch.svelte tests/heartbeat/fakes.ts tests/heartbeat/nest.test.ts
git commit -m "Add the nest scene with number stones and the hatch scene"
```

**Acceptance:** controller tests pass; the nest renders each wave A egg kind (checked in the Task 23 flow); a wrong stone shows steam or frost and the mistake line; `lumi-sparkly` plays only for a shiny baby.

---

### Task 19: The naming scene

**Files:**
- Create: `src/scenes/heartbeat/naming.ctrl.ts`, `src/scenes/Naming.svelte`, `src/scenes/naming/NameTag.svelte`
- Test: `tests/naming/naming-ctrl.test.ts`

**Interfaces:**
- Consumes: Tasks 10 to 15, 17, 17B, 18; `game` (C6); `serve`, `currentStepOf`, `stepStatusOf`, `spellingBehind`, `nameEntries`, `spellLadder` (Task 17B); `shared/blocklist.json`.
- Produces:

```ts
export type NamingMode = 'pick' | 'spell' | 'gold' | 'done';
export type SlotState = { slot: Slot; gem: string | null; misses: number; ghost: boolean; hum: boolean };
export type Named = { name: string; gems: string[]; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean };
export type NamingInput = { target: NameTarget; served: Served; ctx: SpellCtx; bank: NameEntry[]; index: Map<string, NameEntry>;
  blocklist: Blocklist; herd: { id: string; name: string | null; nameGems: string[] }[]; spellingBehind: boolean };
export class NamingCtrl {
  mode: NamingMode; bells: NameEntry[]; route: NameRoute; chosen: NameEntry | null; slots: SlotState[]; tray: string[];
  capital: { misses: number; ghost: boolean } | null; gold: (string | null)[]; readonly goldGems: string[]; goldFront: boolean;
  named: Named | null; onchange: () => void; readonly showBells: boolean;
  constructor(i: NamingInput, d: SceneDeps);
  begin(): Promise<void>; shake(): void; garden(g: GardenGroup): void; firstSound(p: Phoneme): void;
  ring(key: string): Promise<void>; choose(key: string): Promise<void>;
  dropGem(slot: number, gem: string, ghost?: boolean): boolean; clearSlot(slot: number): void;
  slide(): Promise<'incomplete' | 'wrong' | 'right'>; answerMoves(): { slot: number; gem: string }[];
  switchToGold(): Promise<void>; openGold(keep?: (string | null)[]): void;
  goldDrop(slot: number, gem: string): void; goldClear(slot: number): void; addSlot(): boolean; removeSlot(slot: number): boolean;
  goldSlide(): Promise<'incomplete' | 'no-vowel' | 'blocked' | 'list' | 'unknown'>;
}
// Naming.svelte props: { target?: NameTarget; onnamed?: (n: Named) => void }  (defaults from game.params)
// NameTag.svelte props: { name: string; ordinal?: number; sparkle?: boolean; hidden?: boolean }
```

- [ ] **Step 1: Write the failing test**

`tests/naming/naming-ctrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NamingCtrl, type NamingInput } from '../../src/scenes/heartbeat/naming.ctrl.ts';
import { indexBank } from '../../src/core/naming/check.ts';
import { compileBlocklist } from '../../src/core/naming/blocklist.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { fakeDeps } from '../heartbeat/fakes.ts';
import { BANK, BLOCK_FILE, ctxAt } from './fixtures.ts';

const ALL = BANK.map((b) => b.key);
const served: Served = { strand: 's', step: 'S03', id: 'k', carrier: '', items: ['k'], scaffold: 1, probe: false, source: 'current' };
const input = (over: Partial<NamingInput> = {}): NamingInput => ({
  target: { kind: 'baby', baby: 'b9' }, served, ctx: ctxAt('S03', ['S02']), bank: BANK, index: indexBank(BANK),
  blocklist: compileBlocklist(BLOCK_FILE), herd: [{ id: 'b9', name: null, nameGems: [] }], spellingBehind: false, ...over,
});
const spellAll = (c: NamingCtrl) => { for (const m of c.answerMoves()) c.dropGem(m.slot, m.gem); };

describe('NamingCtrl', () => {
  it('opens on the gold bell when no bell names are left', async () => {
    const f = fakeDeps({ names: [] });
    const c = new NamingCtrl(input(), f.deps);
    expect(c.showBells).toBe(false);
    await c.begin();
    expect(c.mode).toBe('gold');
    expect(f.said[0]).toBe('g-gold');
  });
  it('spells a bell name right first time, then names the baby', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    await c.begin();
    await c.choose('ken');
    expect(c.tray).toEqual(expect.arrayContaining(['k', 'e', 'n']));
    spellAll(c);
    expect(await c.slide()).toBe('right');
    const spelled = f.actions.find((a) => a.type === 'naming.spelled');
    expect(spelled.results[0]).toMatchObject({ step: 'S03', result: 'first' });
    expect(f.actions.find((a) => a.type === 'naming.assign')).toMatchObject({ baby: 'b9', name: 'Ken', clipKey: 'ken', ordinal: 1, route: 'bell', unknown: false });
    expect(f.said).toEqual(expect.arrayContaining(['g-spell', 'name:ken!', 'fb-spelled', 'foal-yay']));
    expect(c.mode).toBe('done');
  });
  it('reads back a wrong gem, pops it out and counts the name as a miss', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    await c.begin();
    await c.choose('ken');
    c.dropGem(0, 'k'); c.dropGem(1, 'i'); c.dropGem(2, 'n');
    expect(await c.slide()).toBe('wrong');
    expect(c.slots[1]).toMatchObject({ gem: null, hum: true, misses: 1 });
    expect(f.said).toEqual(expect.arrayContaining(['fb-that-says', 'g-listen']));
    c.dropGem(1, 'e');
    expect(await c.slide()).toBe('right');
    const r = f.actions.find((a) => a.type === 'naming.spelled').results[0];
    expect(r.result).toBe('miss');
    expect(r.items).toEqual([{ id: 'k', result: 'first' }, { id: 'e', result: 'miss' }, { id: 'n', result: 'first' }]);
  });
  it('asks for the capital from S11 and logs it as its own item', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ ctx: ctxAt('S12', ['S02', 'S03', 'S11']), served: { ...served, step: 'S12' } }), f.deps);
    await c.begin();
    await c.choose(c.bells[0].key);
    const first = c.slots[0].slot.g.toLowerCase();
    spellAll(c);
    c.dropGem(0, first);
    expect(await c.slide()).toBe('wrong');
    spellAll(c);
    expect(await c.slide()).toBe('right');
    const res = f.actions.find((a) => a.type === 'naming.spelled').results;
    expect(res[1]).toMatchObject({ step: 'S11', items: [{ id: 'capital', result: 'miss' }] });
  });
  it('runs the gold bell checks', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    c.openGold(['t', 'm', 'n']);
    expect(await c.goldSlide()).toBe('no-vowel');
    expect(f.said).toContain('fb-no-vowel');
    c.openGold(['f', 'u', 'k']);
    expect(await c.goldSlide()).toBe('blocked');
    expect(c.gold.every((g) => g === null)).toBe(true);
    expect(f.said).toContain('fb-silly');
    expect(f.actions.some((a) => a.type === 'naming.assign')).toBe(false);
    c.openGold(['L', 'i', 'l', 'i']);
    expect(await c.goldSlide()).toBe('list');
    expect(f.actions.find((a) => a.type === 'naming.assign')).toMatchObject({ name: 'Lili', clipKey: 'lily', unknown: false, route: 'gold' });
    expect(f.said).toEqual(expect.arrayContaining(['name:lily!', 'fb-gold-yes']));
  });
  it('accepts an unknown name with the kind line, and makes a duplicate royal', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ herd: [{ id: 'b1', name: 'Tamobel', nameGems: [] }, { id: 'b9', name: null, nameGems: [] }] }), f.deps);
    c.openGold(['T', 'a', 'm', 'o', 'b', 'e', 'l']);
    expect(await c.goldSlide()).toBe('unknown');
    expect(f.said).toContain('fb-tricky');
    expect(f.actions.find((a) => a.type === 'naming.assign')).toMatchObject({ name: 'Tamobel', clipKey: null, unknown: true, ordinal: 2 });
    expect(f.said).toContain('name-ordinal-2');
  });
  it('adds slots up to eight and removes empty ones down to two', () => {
    const c = new NamingCtrl(input(), fakeDeps({ names: ALL }).deps);
    c.openGold();
    for (let i = 0; i < 5; i++) expect(c.addSlot()).toBe(true);
    expect(c.addSlot()).toBe(false);
    expect(c.gold).toHaveLength(8);
    c.goldDrop(0, 't');
    expect(c.removeSlot(0)).toBe(false);
    for (let i = 0; i < 6; i++) expect(c.removeSlot(1)).toBe(true);
    expect(c.removeSlot(1)).toBe(false);
    expect(c.gold).toHaveLength(2);
  });
  it('keeps her gems and logs filled slots when she switches to the gold bell', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input(), f.deps);
    await c.begin();
    await c.choose('ken');
    c.dropGem(0, 'k'); c.dropGem(1, 'e');
    await c.switchToGold();
    expect(c.mode).toBe('gold');
    expect(c.gold).toEqual(['k', 'e', null]);
    expect(f.actions.find((a) => a.type === 'naming.partial').results[0].items).toEqual([{ id: 'k', result: 'first' }, { id: 'e', result: 'first' }]);
  });
  it('logs no spelling result for a free-naming garden name', async () => {
    const f = fakeDeps({ names: ALL });
    const c = new NamingCtrl(input({ ctx: ctxAt('S12', ['S02', 'S03', 'S04']), served: { ...served, step: 'S12' } }), f.deps);
    c.garden('flowers');
    await c.choose('rose');
    spellAll(c);
    expect(await c.slide()).toBe('right');
    expect(f.actions.find((a) => a.type === 'naming.spelled').results).toEqual([]);
    expect(f.actions.find((a) => a.type === 'naming.assign')).toMatchObject({ name: 'Rose', route: 'garden-pic' });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/naming/naming-ctrl.test.ts`
Expected: FAIL, cannot resolve `src/scenes/heartbeat/naming.ctrl.ts`.

- [ ] **Step 3: Write the controller**

`src/scenes/heartbeat/naming.ctrl.ts`:

```ts
import type { NameEntry } from '../../core/heartbeat/types.ts';
import type { ErrorTag, NameRoute, NameTarget, Served } from '../../core/heartbeat/types.ts';
import { type GardenGroup, bellsFor, gardenNames, namesByFirstSound } from '../../core/naming/bells.ts';
import { type Blocklist, checkBlocked } from '../../core/naming/blocklist.ts';
import { MAX_SLOTS, MIN_SLOTS, START_SLOTS, canAddSlot, canRemoveSlot, checkBuild, displayName, judgeSlot, namingResults, ordinalFor, ordinalLine } from '../../core/naming/check.ts';
import { type Slot, type SpellCtx, giftSlots, ownCount } from '../../core/naming/gifts.ts';
import { type Phoneme, gemSoundKey, phonemeSoundKey } from '../../core/naming/sounds.ts';
import { capitalOf, goldTray, planNameTray } from '../../core/naming/tray.ts';
import type { SceneDeps } from './deps.ts';

export type NamingMode = 'pick' | 'spell' | 'gold' | 'done';
export type SlotState = { slot: Slot; gem: string | null; misses: number; ghost: boolean; hum: boolean };
export type Named = { name: string; gems: string[]; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean };
export type NamingInput = {
  target: NameTarget; served: Served; ctx: SpellCtx; bank: NameEntry[]; index: Map<string, NameEntry>;
  blocklist: Blocklist; herd: { id: string; name: string | null; nameGems: string[] }[]; spellingBehind: boolean;
};

const GRAPHEME = /^[a-z]+(-e)?$/;

export class NamingCtrl {
  mode: NamingMode = 'pick';
  bells: NameEntry[] = [];
  route: NameRoute = 'bell';
  chosen: NameEntry | null = null;
  slots: SlotState[] = [];
  tray: string[] = [];
  capital: { misses: number; ghost: boolean } | null = null;
  gold: (string | null)[] = Array(START_SLOTS).fill(null);
  readonly goldGems: string[];
  goldFront: boolean;
  named: Named | null = null;
  onchange: () => void = () => {};
  private readonly offered = new Set<string>();
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(private i: NamingInput, private d: SceneDeps) {
    this.goldFront = !i.spellingBehind; // spec 3.6: bells and garden in front when spelling falls behind
    this.goldGems = goldTray(i.ctx, i.herd.map((b) => b.nameGems));
    this.shake();
  }

  get showBells(): boolean { return this.bells.length > 0; }
  private changed() { this.onchange(); }
  private touch() { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }
  private ms() { return Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt); }
  private herdKeys() { return new Set(this.i.herd.filter((b) => b.name).map((b) => b.name!.toLowerCase())); }
  private hasClip = (k: string) => this.d.audio.hasName(k);
  private babyId() { return this.i.target.kind === 'baby' ? this.i.target.baby : undefined; }
  private remember(list: NameEntry[]) { list.forEach((b) => this.offered.add(b.key)); }

  shake(): void {
    const prefer = GRAPHEME.test(this.i.served.id) ? this.i.served.id : null;
    this.bells = bellsFor({ bank: this.i.bank, ctx: this.i.ctx, herdNames: this.herdKeys(), offered: this.offered, hasClip: this.hasClip, rng: this.d.rng, prefer });
    this.remember(this.bells); this.route = 'bell'; this.changed();
  }
  garden(group: GardenGroup): void {
    this.bells = gardenNames({ bank: this.i.bank, group, hasClip: this.hasClip, offered: this.offered, rng: this.d.rng });
    this.remember(this.bells); this.route = 'garden-pic'; this.changed();
  }
  firstSound(p: Phoneme): void {
    this.bells = namesByFirstSound({ bank: this.i.bank, first: p, hasClip: this.hasClip, offered: this.offered, rng: this.d.rng });
    this.remember(this.bells); this.route = 'garden-sound'; this.changed();
  }

  async begin(): Promise<void> {
    if (!this.showBells) { this.openGold(); await this.d.audio.say('g-gold'); }
    else await this.d.audio.say('g-bells');
    this.startedAt = this.d.now();
    this.d.hints.begin({ idleMs: 15000, repeat: () => this.d.audio.say(this.mode === 'gold' ? 'g-gold' : 'g-bells'), focused: async () => {}, answer: async () => {} });
  }

  async ring(key: string): Promise<void> {
    this.touch();
    await this.d.audio.listen(this.d.audio.sayName(key, '?'));
  }

  async choose(key: string): Promise<void> {
    const e = this.bells.find((b) => b.key === key);
    if (!e || this.mode === 'done') return;
    this.touch();
    this.d.audio.act();
    this.chosen = e;
    const slots = giftSlots(e.split, this.i.ctx);
    this.capital = this.i.ctx.reached('S11') && slots[0]?.own ? { misses: 0, ghost: false } : null;
    this.slots = slots.map((slot) => ({ slot, gem: slot.own ? null : slot.g, misses: 0, ghost: false, hum: false }));
    this.tray = planNameTray({ slots, scaffold: this.i.served.scaffold, ctx: this.i.ctx, blocked: (g) => checkBlocked(g, this.i.blocklist) !== null, rng: this.d.rng });
    this.mode = 'spell';
    this.lastError = null;
    this.changed();
    if (ownCount(slots) === 0) { await this.finishSpelled(); return; }
    await this.d.audio.say('g-spell');
    await this.d.audio.sayName(e.key, '!');
    this.startedAt = this.d.now();
    this.firstTouch = null;
    this.d.hints.begin({
      idleMs: 15000,
      repeat: async () => { await this.d.audio.say('g-spell'); await this.d.audio.sayName(e.key, '!'); },
      focused: () => this.slowSounds(),
      answer: async () => { for (const m of this.answerMoves()) this.dropGem(m.slot, m.gem, true); },
    });
  }

  private async slowSounds(): Promise<void> {
    await this.d.audio.say('h-sounds');
    for (const s of this.slots) {
      const k = s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(s.slot.g);
      if (k) { await this.d.audio.sound(k); await this.d.pause(500); }
    }
  }

  dropGem(slot: number, gem: string, ghost = false): boolean {
    const s = this.slots[slot];
    if (!s || !s.slot.own || this.mode !== 'spell') return false;
    if (!ghost) this.touch();
    s.gem = gem;
    s.hum = false;
    if (ghost) { s.ghost = true; if (slot === 0 && this.capital) this.capital.ghost = true; }
    this.changed();
    return true;
  }
  clearSlot(slot: number): void {
    const s = this.slots[slot];
    if (s?.slot.own && this.mode === 'spell') { s.gem = null; this.changed(); }
  }

  answerMoves(): { slot: number; gem: string }[] {
    return this.slots
      .filter((s) => s.slot.own)
      .map((s) => ({ slot: s.slot.index, gem: s.slot.index === 0 && this.capital ? capitalOf(s.slot.g) : s.slot.g.toLowerCase() }))
      .filter((m) => this.slots[m.slot].gem !== m.gem);
  }

  private async playSlots(): Promise<void> {
    for (const s of this.slots) {
      const g = s.gem ?? s.slot.g;
      const k = !s.slot.own && s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(g);
      if (k) await this.d.audio.sound(k);
    }
  }

  async slide(): Promise<'incomplete' | 'wrong' | 'right'> {
    if (this.mode !== 'spell' || !this.chosen) return 'incomplete';
    this.touch();
    this.d.audio.act();
    if (this.slots.some((s) => s.slot.own && s.gem === null)) { await this.d.audio.say('g-gems'); return 'incomplete'; }
    await this.playSlots();
    let last = -1;
    this.slots.forEach((s, idx) => { if (s.slot.ph.length) last = idx; });
    let wrong = false;
    for (const s of this.slots) {
      if (!s.slot.own) continue;
      const j = judgeSlot(s.slot, s.gem!, this.capital !== null, s.slot.index === last);
      if (j.ok) continue;
      wrong = true;
      if (j.capitalMiss) this.capital!.misses++;
      else { s.misses++; this.lastError = j.error; }
      s.gem = null;
      s.hum = true;
    }
    this.changed();
    if (!wrong) { await this.finishSpelled(); return 'right'; }
    // Spec 2.5: "That says p, i, t. Listen: Pip." Then the slot hums the sound it needs.
    await this.d.audio.say('fb-that-says');
    await this.playSlots();
    await this.d.audio.say('g-listen');
    await this.d.audio.sayName(this.chosen.key, '!');
    for (const s of this.slots) if (s.hum) { const k = s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(s.slot.g); if (k) await this.d.audio.sound(k); }
    await this.d.hints.miss();
    return 'wrong';
  }

  private async finishSpelled(): Promise<void> {
    const e = this.chosen!;
    const gems = this.slots.map((s) => s.gem ?? s.slot.g);
    const results = namingResults({
      carrier: e.name, served: this.i.served, slots: this.slots.map((s) => ({ slot: s.slot, misses: s.misses, ghost: s.ghost })),
      capital: this.capital, hintLevel: this.d.hints.level, ms: this.ms(), error: this.lastError, baby: this.babyId(),
    });
    this.d.dispatch({ type: 'naming.spelled', target: this.i.target, route: this.route === 'gold' ? 'bell' : this.route, entryKey: e.key, phonemes: e.ph, gems, results });
    this.d.hints.end();
    await this.d.audio.say('fb-spelled');
    await this.assign(e.name, gems, e.key, this.route, false);
  }

  openGold(keep?: (string | null)[]): void {
    this.mode = 'gold';
    const k = (keep ?? []).slice(0, MAX_SLOTS);
    this.gold = k.length >= MIN_SLOTS ? k : [...k, ...Array(START_SLOTS - k.length).fill(null)];
    this.changed();
  }

  async switchToGold(): Promise<void> {
    if (this.mode !== 'spell') { this.openGold(); return; }
    const filled = this.slots.filter((s) => s.slot.own && s.gem !== null);
    if (filled.length >= 2) {
      let last = -1;
      this.slots.forEach((s, idx) => { if (s.slot.ph.length) last = idx; });
      const outcomes = filled.map((s) => {
        const j = judgeSlot(s.slot, s.gem!, false, s.slot.index === last);
        return { slot: s.slot, misses: s.misses + (j.ok ? 0 : 1), ghost: s.ghost };
      });
      const results = namingResults({ carrier: this.chosen!.name, served: this.i.served, slots: outcomes, capital: null,
        hintLevel: this.d.hints.level, ms: this.ms(), error: this.lastError, baby: this.babyId() });
      this.d.dispatch({ type: 'naming.partial', results });
    }
    this.d.hints.end();
    this.openGold(this.slots.map((s) => s.gem));
  }

  goldDrop(slot: number, gem: string): void {
    if (this.mode !== 'gold' || slot < 0 || slot >= this.gold.length) return;
    this.touch(); this.gold[slot] = gem; this.changed();
  }
  goldClear(slot: number): void {
    if (this.mode === 'gold' && slot >= 0 && slot < this.gold.length) { this.gold[slot] = null; this.changed(); }
  }
  addSlot(): boolean {
    if (this.mode !== 'gold' || !canAddSlot(this.gold.length)) return false;
    this.gold.push(null); this.changed(); return true;
  }
  removeSlot(slot: number): boolean {
    if (this.mode !== 'gold' || !canRemoveSlot(this.gold.length) || this.gold[slot] !== null) return false;
    this.gold.splice(slot, 1); this.changed(); return true;
  }

  async goldSlide(): Promise<'incomplete' | 'no-vowel' | 'blocked' | 'list' | 'unknown'> {
    if (this.mode !== 'gold') return 'incomplete';
    this.touch();
    this.d.audio.act();
    const gems = this.gold.filter((g): g is string => g !== null);
    if (gems.length < MIN_SLOTS) { await this.d.audio.say('g-gems'); return 'incomplete'; }
    for (const g of gems) { const k = gemSoundKey(g); if (k) await this.d.audio.sound(k); }
    const outcome = checkBuild(gems, this.i.index, this.i.blocklist);
    this.d.dispatch({ type: 'name.gold.slide', target: this.i.target, gems, outcome });
    switch (outcome.outcome) {
      case 'no-vowel':
        await this.d.audio.say('fb-no-vowel');
        return 'no-vowel';
      case 'blocked':
        this.gold = this.gold.map(() => null);
        this.changed();
        await this.d.audio.say('foal-silly');
        await this.d.audio.say('fb-silly');
        return 'blocked';
      case 'list':
        if (this.d.audio.hasName(outcome.entry.key)) { await this.d.audio.sayName(outcome.entry.key, '!'); await this.d.audio.say('fb-gold-yes'); }
        else await this.d.audio.say('fb-tricky');
        await this.assign(displayName(gems), gems, outcome.entry.key, 'gold', false);
        return 'list';
      case 'unknown':
        await this.d.audio.say('fb-tricky');
        await this.assign(displayName(gems), gems, null, 'gold', true);
        return 'unknown';
    }
  }

  private async assign(name: string, gems: string[], clipKey: string | null, route: NameRoute, unknown: boolean): Promise<void> {
    const self = this.babyId() ?? null;
    const ordinal = self ? ordinalFor(name, this.i.herd, self) : 1;
    this.named = { name, gems, clipKey, ordinal, route, unknown };
    if (self) this.d.dispatch({ type: 'naming.assign', baby: self, name, gems, clipKey, ordinal, route, unknown });
    this.mode = 'done';
    this.changed();
    if (route !== 'gold' && clipKey) await this.d.audio.sayName(clipKey, '!');
    const ol = ordinalLine(ordinal);
    if (ol) await this.d.audio.say(ol);
    if (self) await this.d.audio.say('foal-yay');
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/naming/naming-ctrl.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `NameTag.svelte` and `Naming.svelte`**

`src/scenes/naming/NameTag.svelte`:

```svelte
<script lang="ts">
  let { name, ordinal = 1, sparkle = false, hidden = false }: { name: string; ordinal?: number; sparkle?: boolean; hidden?: boolean } = $props();
</script>

{#if !hidden}
  <span class="tag" class:sparkle aria-label="name tag">
    <span class="cap"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" stroke="#c98a14" stroke-width="2" /></svg>{name.charAt(0)}</span>{name.slice(1)}
    {#if ordinal > 1}<span class="ord"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" /></svg>{ordinal}</span>{/if}
  </span>
{/if}

<style>
  .tag { display: inline-flex; align-items: flex-end; gap: 2px; padding: 8px 20px; background: #fff; border: 4px solid #c9b8ff; border-radius: 22px; font: 700 44px/1 'Andika', sans-serif; color: #3b2a4a; position: relative; }
  .cap { position: relative; } .cap svg { position: absolute; top: -18px; left: 0; width: 100%; }
  .ord { margin-left: 10px; font-size: 26px; position: relative; } .ord svg { position: absolute; top: -12px; left: -2px; width: 26px; }
  .sparkle::after { content: ''; position: absolute; inset: -8px; border-radius: 26px; border: 3px dashed #c9b8ff; animation: tw 1.6s infinite; }
  @keyframes tw { 50% { opacity: 0.3; } }
</style>
```

`src/scenes/Naming.svelte` (layout: baby top left, picks or slots on the right, tray along the bottom; the gold bell is either in the pick row or, when `goldFront` is false, behind a small "more" sparkle one tap further):

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { currentStepOf, nameEntries, serve, spellLadder, spellingBehind, stepStatusOf } from './heartbeat/learn-bridge.ts';
  import blockFile from '../../../../shared/blocklist.json';
  import { makeSpellCtx } from '../core/naming/gifts.ts';
  import { indexBank } from '../core/naming/check.ts';
  import { compileBlocklist, type BlocklistFile } from '../core/naming/blocklist.ts';
  import { GARDEN_GROUPS, firstSounds } from '../core/naming/bells.ts';
  import { firstSoundGem, gemSoundKey } from '../core/naming/sounds.ts';
  import type { NameTarget, Served } from '../core/heartbeat/types.ts';
  import { NamingCtrl, type Named } from './heartbeat/naming.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import { liveDeps } from './heartbeat/deps.ts';
  import { exposeCtrl } from './heartbeat/test-hooks.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { draggable } from '../ui/drag.ts';
  import { ghost } from './heartbeat/guides.svelte.ts';
  import { goal } from './heartbeat/guides.svelte.ts';
  import GemSlots, { type SlotView } from '../ui/GemSlots.svelte';
  import GemTray from '../ui/GemTray.svelte';
  import SoundSlider from '../ui/SoundSlider.svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import NameTag from './naming/NameTag.svelte';

  let { target, onnamed }: { target?: NameTarget; onnamed?: (n: Named) => void } = $props();
  const params = game.params as { target?: NameTarget; then?: 'heartbeat' | (() => void) };
  const tgt: NameTarget = target ?? params.target!;
  const deps = liveDeps({ place: 'naming', strand: 's' });
  const step = currentStepOf('s');
  const served: Served = serve('naming', deps.rng) ??
    { strand: 's', step, id: '', carrier: '', items: [], scaffold: 1, probe: false, source: 'current' };
  const ctx = makeSpellCtx(spellLadder(game.content), (s) => stepStatusOf('s', s), served.step);
  const bank = nameEntries(game.content);
  const ctrl = new NamingCtrl({
    target: tgt, served, ctx, bank, index: indexBank(bank),
    blocklist: compileBlocklist(blockFile as BlocklistFile),
    herd: game.world.herd.map((b) => ({ id: b.id, name: b.name, nameGems: b.nameGems })),
    spellingBehind: spellingBehind(),
  }, deps);
  let tick = $state(0);
  ctrl.onchange = () => tick++;
  const v = $derived.by(() => { tick; return { mode: ctrl.mode, bells: ctrl.bells, slots: ctrl.slots, tray: ctrl.tray, gold: ctrl.gold, named: ctrl.named }; });
  const baby = $derived(tgt.kind === 'baby' ? game.world.herd.find((b) => b.id === tgt.baby) : undefined);
  let babyEl: HTMLElement;
  let slotEls: HTMLElement[] = $state([]);
  let showMore = $state(false);
  let showSounds = $state(false);
  const sounds = firstSounds(bank, (k) => deps.audio.hasName(k));
  const firstGold = !game.world.herd.some((b) => b.name !== null);

  const spellViews = $derived(v.slots.map((s): SlotView => ({ gem: s.gem, gift: !s.slot.own, kind: s.slot.ph.some((p) => /^(a|e|i|o|u|ai|ee|igh|oa|oo|ar|or|ur|ow|oi|ear|air|er|uh|yoo)$/.test(p)) ? 'vowel' : 'consonant',
    crown: true, hum: s.hum, glow: false })));
  const goldViews = $derived(v.gold.map((g): SlotView => ({ gem: g, gift: false, kind: 'any', crown: true, hum: false, glow: false })));
  const slotTargets = () => slotEls.map((el, i) => ({ id: String(i), el })).filter((t) => t.el);

  function done(n: Named) {
    onnamed?.(n);
    if (params.then === 'heartbeat') heartbeat.named();
    else if (typeof params.then === 'function') params.then();
  }
  $effect(() => { if (v.mode === 'done' && v.named) { const n = v.named; setTimeout(() => done(n), 1200); } });

  onMount(async () => {
    exposeCtrl('naming', ctrl);
    goal.set(() => deps.audio.say(ctrl.mode === 'gold' ? 'g-gold' : 'g-bells'));
    await ctrl.begin();
    const plus = document.querySelector('[aria-label="add slot"]');
    if (ctrl.mode === 'gold' && firstGold && plus) { await ghost.tap(plus); await deps.audio.say('g-plus'); } // the ghost hand shows the plus slot once
  });
  onDestroy(() => goal.clear());
</script>

<section class="naming" aria-label="naming scene">
  <HbGuides />
  <div class="bg"><ArtImg id="bg-nest" size={1180} /></div>
  <div class="baby" bind:this={babyEl}>
    {#if baby}<Unicorn {baby} pose="sit" size={260} label="baby" />{:else}<ArtImg id="sky-unicorn" size={240} />{/if}
    {#if v.named}<span class="tag-on"><NameTag name={v.named.name} ordinal={v.named.ordinal} sparkle={v.named.clipKey === null} /></span>{/if}
  </div>

  {#if v.mode === 'pick'}
    <div class="bells">
      {#each v.bells as b, i (b.key)}
        <span class="bell" data-touch aria-label="bell {b.name}"
          use:draggable={{ targets: () => [{ id: 'baby', el: babyEl }], ondrop: (t) => { if (t === 'baby') ctrl.choose(b.key); }, ontap: () => ctrl.ring(b.key) }}>
          <ArtImg id="bell" size={130} tint={['#ffd0e8', '#d7ecff', '#e6dcff'][i % 3]} />
        </span>
      {/each}
      <button class="tree" data-touch aria-label="name tree" onpointerup={() => ctrl.shake()}><ArtImg id="name-tree" size={150} /></button>
    </div>
    <div class="garden">
      {#each GARDEN_GROUPS as g}
        <button class="pic" data-touch aria-label="garden {g}" onpointerup={() => { ctrl.garden(g); deps.audio.say('g-garden'); }}><ArtImg id="garden-{g}" size={88} /></button>
      {/each}
      <button class="pic" data-touch aria-label="first sounds" onpointerup={() => { showSounds = !showSounds; if (showSounds) deps.audio.say('g-first-sound'); }}>a</button>
      {#if ctrl.goldFront || showMore}
        <button class="gold" data-touch aria-label="gold bell" onpointerup={() => { ctrl.openGold(); deps.audio.say('g-gold'); }}><ArtImg id="bell-gold" size={120} /></button>
      {:else}
        <button class="more" data-touch aria-label="more" onpointerup={() => (showMore = true)}>✦</button>
      {/if}
    </div>
    {#if showSounds}
      <div class="sounds">
        {#each sounds as p}
          {@const g = firstSoundGem(p)}
          {#if g}<button class="sound" data-touch aria-label="first sound {g}" onpointerup={() => { const k = gemSoundKey(g); if (k) deps.audio.sound(k); ctrl.firstSound(p); showSounds = false; }}>{g}</button>{/if}
        {/each}
      </div>
    {/if}
  {:else if v.mode === 'spell'}
    <div class="slots-row"><GemSlots slots={spellViews} bind:slotEls onslottap={(i) => ctrl.clearSlot(i)} />
      <button class="gold small" data-touch aria-label="gold bell" onpointerup={() => ctrl.switchToGold()}><ArtImg id="bell-gold" size={80} /></button>
    </div>
    <div class="slider"><SoundSlider count={v.slots.length} onpass={(i) => { const s = v.slots[i]; const k = gemSoundKey(s.gem ?? s.slot.g); if (k) deps.audio.sound(k); }} ondone={() => ctrl.slide()} /></div>
    <div class="tray"><GemTray gems={v.tray} targets={slotTargets} ondrop={(g, t) => { if (t !== null) ctrl.dropGem(Number(t), g); }} ontap={(g) => { const k = gemSoundKey(g); if (k) deps.audio.sound(k); }} /></div>
  {:else if v.mode === 'gold'}
    <div class="slots-row"><GemSlots slots={goldViews} editable bind:slotEls onplus={() => ctrl.addSlot()} onremove={(i) => ctrl.removeSlot(i)} onslottap={(i) => ctrl.goldClear(i)} /></div>
    <div class="slider"><SoundSlider count={v.gold.length} onpass={(i) => { const g = v.gold[i]; if (g) { const k = gemSoundKey(g); if (k) deps.audio.sound(k); } }} ondone={() => ctrl.goldSlide()} /></div>
    <div class="tray"><GemTray gems={ctrl.goldGems} targets={slotTargets} ondrop={(g, t) => { if (t !== null) ctrl.goldDrop(Number(t), g); }} ontap={(g) => { const k = gemSoundKey(g); if (k) deps.audio.sound(k); }} /></div>
  {/if}
</section>

<style>
  .naming { position: absolute; inset: 0; touch-action: none; }
  .bg { position: absolute; inset: 0; }
  .baby { position: absolute; left: 60px; top: 90px; width: 300px; height: 330px; }
  .tag-on { position: absolute; left: 20px; top: 300px; animation: clip 0.5s ease-out; }
  .bells { position: absolute; left: 420px; top: 90px; display: flex; gap: 40px; align-items: flex-end; }
  .bell, .tree { touch-action: none; background: none; border: 0; }
  .garden { position: absolute; left: 420px; top: 320px; display: flex; gap: 18px; align-items: center; }
  .pic, .more, .sound { width: 96px; height: 96px; border-radius: 28px; background: #fff; border: 4px solid #c9b8ff; font: 700 44px 'Andika', sans-serif; color: #3b2a4a; }
  .gold { background: none; border: 0; } .gold.small { margin-left: 24px; }
  .sounds { position: absolute; left: 420px; top: 440px; display: flex; flex-wrap: wrap; gap: 12px; width: 720px; }
  .slots-row { position: absolute; left: 380px; top: 130px; width: 760px; display: flex; justify-content: center; align-items: center; }
  .slider { position: absolute; left: 380px; top: 270px; width: 760px; }
  .tray { position: absolute; left: 30px; right: 30px; bottom: 30px; }
  @keyframes clip { from { transform: translateY(-40px) scale(0.7); opacity: 0; } }
</style>
```

- [ ] **Step 6: Type check and test**

Run: `npx vitest run tests/naming && npm run check`
Expected: PASS; no type errors in this task's files.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/naming.ctrl.ts src/scenes/Naming.svelte src/scenes/naming/NameTag.svelte tests/naming/naming-ctrl.test.ts
git commit -m "Add the naming scene with bells, the name garden and the gold bell"
```

**Acceptance:** controller tests pass; in the browser (Task 23 flow) bells ring with `?` clips, a bell dragged to the baby opens the slots, the gold bell builds 2 to 8 gems, a blocked build shakes out with a giggle, and an unknown name gets its tag with a moon sparkle.

---

### Task 20: The wish scene

**Files:**
- Create: `src/scenes/heartbeat/wish.ctrl.ts`, `src/scenes/Wish.svelte`
- Test: `tests/heartbeat/wish-ctrl.test.ts`

**Interfaces:**
- Consumes: Tasks 5, 6, 15, 17, 17B, 18; `game` (C6); `serve`, `stepStatusOf`, `wordEntries`, `readLadder` (Task 17B); places' `Heap`.
- Produces:

```ts
export type WishOutcome = 'ok' | 'next' | 'miss' | 'ignored';
export type WishFunny = Funny | 'wrong-station';
export function unitSoundKey(g: string): string | null;     // '-s' -> 's', '-es' -> 'es', 'a-e' -> 'ai'
export class WishCtrl {
  readonly task: WishTask; part: 'first' | 'second'; lastFunny: WishFunny | null; glow: boolean; done: boolean; onchange: () => void;
  constructor(task: WishTask, d: SceneDeps, get: (w: string) => WordEntry | undefined);
  readonly current: WishPart; readonly units: PrintUnit[];
  begin(): Promise<void>; give(key: string): Promise<WishOutcome>; toStation(st: StationId): Promise<WishOutcome>;
  answerKey(): string | null; wrongKey(): string | null;
}
```

`unitSoundKey('-es')` returns `es`. The phonics library gains `snd-es` (the /ɪz/ ending) from the plurals work (spec 3.10, MEADOW). Until it exists `audio.sound('es')` reports a missing clip, which the content validator catches.

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/wish-ctrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WishCtrl, unitSoundKey } from '../../src/scenes/heartbeat/wish.ctrl.ts';
import { buildWish } from '../../src/core/heartbeat/wish.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BY_WORD, get } from './words.ts';
import { fakeDeps } from './fakes.ts';

const served = (step: string, carrier: string, twin?: string): Served =>
  ({ strand: 'r', step, id: carrier, carrier, items: ['a'], scaffold: 1, probe: false, source: 'current', twin });
const wish = (s: Served, twinBaby: string | null = 'b2') =>
  buildWish({ served: s, baby: 'b1', babyName: null, twinBaby, words: BY_WORD, bathPond: true, sounded: new Set(), rng: makeRng(4) })!;

describe('unitSoundKey', () => {
  it('maps endings and split digraphs to phonics clips', () => {
    expect(unitSoundKey('-s')).toBe('s');
    expect(unitSoundKey('-es')).toBe('es');
    expect(unitSoundKey('a-e')).toBe('ai');
    expect(unitSoundKey('sh')).toBe('sh');
  });
});

describe('WishCtrl', () => {
  it('takes the heap for a plural first time and reads it back', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(served('R19', 'hats')), f.deps, get);
    await c.begin();
    expect(await c.give(c.answerKey()!)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.wish.done', baby: 'b1', word: 'hats', place: 'wish', result: 'first', error: null });
    expect(f.said).toEqual(expect.arrayContaining(['word-hats', 'fb-more-than-one']));
  });
  it('makes one hat for hats funny once, then counts the heap as helped', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(served('R19', 'hats')), f.deps, get);
    await c.begin();
    expect(await c.give('hat')).toBe('miss');
    expect(c.lastFunny).toBe('one-for-many');
    expect(c.glow).toBe(true);
    expect(f.said).toEqual(expect.arrayContaining(['foal-silly', 'fb-letters']));
    expect(await c.give('hat')).toBe('miss');
    expect(c.lastFunny).toBeNull();
    expect(await c.give('hat-heap')).toBe('ok');
    expect(f.actions[0]).toMatchObject({ result: 'helped', error: 'other' });
  });
  it('serves twin wishes one after the other', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(served('R04D', 'pan', 'pen')), f.deps, get);
    await c.begin();
    expect(await c.give('pan')).toBe('next');
    expect(c.part).toBe('second');
    expect(c.current.baby).toBe('b2');
    expect(await c.give('pen')).toBe('ok');
    expect(f.actions.map((a) => [a.baby, a.word, a.place])).toEqual([['b1', 'pan', 'twin-wish'], ['b2', 'pen', 'twin-wish']]);
  });
  it('sends the baby to the right station', async () => {
    const f = fakeDeps();
    const c = new WishCtrl(wish(served('R10', 'swing')), f.deps, get);
    await c.begin();
    expect(await c.give('pan')).toBe('ignored');
    expect(await c.toStation('nap')).toBe('miss');
    expect(c.lastFunny).toBe('wrong-station');
    expect(await c.toStation('swing')).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.station.done', word: 'swing', result: 'miss' });
    expect(f.said).toContain('foal-wee');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/wish-ctrl.test.ts`
Expected: FAIL, cannot resolve `src/scenes/heartbeat/wish.ctrl.ts`.

- [ ] **Step 3: Write the controller**

`src/scenes/heartbeat/wish.ctrl.ts`:

```ts
import type { WordEntry } from '../../core/heartbeat/types.ts';
import type { ErrorTag, StationId } from '../../core/heartbeat/types.ts';
import type { PrintUnit, WishPart, WishTask } from '../../core/heartbeat/wish.ts';
import { type Funny, judgeGive } from '../../core/phonics/basket.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { gemSoundKey } from '../../core/naming/sounds.ts';
import type { SceneDeps } from './deps.ts';

export type WishOutcome = 'ok' | 'next' | 'miss' | 'ignored';
export type WishFunny = Funny | 'wrong-station';

export function unitSoundKey(g: string): string | null {
  if (g === '-s') return 's';
  if (g === '-es') return 'es';
  return gemSoundKey(g);
}

export class WishCtrl {
  part: 'first' | 'second' = 'first';
  lastFunny: WishFunny | null = null;
  glow = false;
  done = false;
  onchange: () => void = () => {};
  private misses = 0;
  private lastError: ErrorTag | null = null;
  private funnyShown = new Set<string>();
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(readonly task: WishTask, private d: SceneDeps, private get: (w: string) => WordEntry | undefined) {}

  get current(): WishPart {
    return this.part === 'first' ? { baby: this.task.baby, served: this.task.served, word: this.task.word, units: this.task.units } : this.task.next!;
  }
  get units(): PrintUnit[] { return this.current.units; }

  async begin(): Promise<void> {
    await this.d.audio.say('g-wish');
    this.startedAt = this.d.now();
    this.firstTouch = null;
    this.misses = 0;
    this.lastError = null;
    this.d.hints.begin({ idleMs: 10000, repeat: () => this.d.audio.say('g-wish'), focused: () => this.slowSounds(), answer: async () => {} });
  }

  private async slowSounds(): Promise<void> {
    await this.d.audio.say('h-sounds');
    const seen = new Set<string>();
    for (const u of this.units) {
      if (u.silent || seen.has(u.g)) continue;
      seen.add(u.g);
      const k = unitSoundKey(u.g);
      if (k) { await this.d.audio.sound(k); await this.d.pause(this.task.dotsMs ?? 500); }
    }
  }

  private touch() { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }

  answerKey(): string | null {
    if (this.task.kind === 'station') return this.task.station;
    return this.task.basket.find((i) => judgeGive(this.current.word, i, this.get).ok)?.key ?? null;
  }
  wrongKey(): string | null {
    if (this.task.kind === 'station') return ['hay', 'brush', 'hat', 'nap', 'swing', 'bath'].find((s) => s !== this.task.station) ?? null;
    return this.task.basket.find((i) => !judgeGive(this.current.word, i, this.get).ok)?.key ?? null;
  }

  async give(key: string): Promise<WishOutcome> {
    if (this.done || this.task.kind === 'station') return 'ignored';
    const item = this.task.basket.find((i) => i.key === key);
    if (!item) return 'ignored';
    this.touch();
    this.d.audio.act();
    const v = judgeGive(this.current.word, item, this.get);
    if (!v.ok) return this.miss(v.funny, key, v.error);
    return this.success();
  }

  async toStation(st: StationId): Promise<WishOutcome> {
    if (this.done || this.task.kind !== 'station') return 'ignored';
    this.touch();
    this.d.audio.act();
    if (st !== this.task.station) return this.miss('wrong-station', st, 'other');
    return this.success();
  }

  private async miss(funny: WishFunny, key: string, error: ErrorTag): Promise<WishOutcome> {
    this.misses++;
    this.lastError = error;
    this.lastFunny = this.funnyShown.has(key) ? null : funny; // a funny event once per item (spec 2.5 rule 6)
    this.funnyShown.add(key);
    this.glow = true;
    this.onchange();
    if (this.lastFunny) await this.d.audio.say('foal-silly');
    await this.d.audio.say('fb-letters');
    await this.d.hints.miss();
    return 'miss';
  }

  private async success(): Promise<WishOutcome> {
    const cur = this.current;
    const result = momentResult(this.misses, this.d.hints.level);
    const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
    const error = result === 'first' ? null : this.lastError;
    if (this.task.kind === 'station') {
      this.d.dispatch({ type: 'hb.station.done', baby: cur.baby, served: cur.served, word: cur.word.word, result, ms, error });
    } else {
      this.d.dispatch({ type: 'hb.wish.done', baby: cur.baby, served: cur.served, word: cur.word.word,
        place: this.task.kind === 'twin' ? 'twin-wish' : 'wish', result, ms, error });
    }
    this.d.hints.end();
    this.glow = false;
    this.lastFunny = null;
    this.onchange();
    await this.d.audio.say(cur.word.clip);                       // reading: the word is said only after she acts
    if (this.task.plural) await this.d.audio.say(cur.word.one ? 'fb-more-than-one' : 'fb-just-one');
    await this.d.audio.say(this.task.kind === 'station' ? (this.task.station === 'swing' ? 'foal-wee' : 'foal-cuddle') : 'foal-yay');
    if (this.task.kind === 'twin' && this.part === 'first') {
      this.part = 'second';
      this.funnyShown.clear();
      this.onchange();
      await this.begin();
      return 'next';
    }
    this.done = true;
    this.onchange();
    return 'ok';
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/wish-ctrl.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `Wish.svelte`**

Layout: the wishing baby on the left with its speech bubble (`PrintWithDots`); the basket on the right with 3, 4 or 6 pictured items (heaps through `Heap`); the six care stations in a row along the bottom (the Bath Pond station only once the pond is built). Basket items are dragged to the baby. In a station wish the baby itself is dragged to a station. A miss adds a funny class on the baby for 1.6 s and the deciding part of the word glows.

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { readLadder, serve, stepStatusOf, wordEntries } from './heartbeat/learn-bridge.ts';
  import { STATIONS, buildWish, soundedGraphemes } from '../core/heartbeat/wish.ts';
  import type { Served } from '../core/heartbeat/types.ts';
  import type { Rng } from '../core/rng.ts';
  import { WishCtrl, unitSoundKey } from './heartbeat/wish.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import { liveDeps } from './heartbeat/deps.ts';
  import { exposeCtrl } from './heartbeat/test-hooks.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { draggable } from '../ui/drag.ts';
  import { ghost } from './heartbeat/guides.svelte.ts';
  import { moonbeam } from './heartbeat/guides.svelte.ts';
  import { goal } from './heartbeat/guides.svelte.ts';
  import PrintWithDots from '../ui/PrintWithDots.svelte';
  import Heap from '../ui/Heap.svelte'; // places.md Task A8: { picture, count, seed, size }
  import { heapCount } from '../ui/geometry.ts';
  import Unicorn from '../art/Unicorn.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';

  const params = game.params as { baby: string; then?: 'heartbeat' | 'meadow' };
  const deps = liveDeps({ place: 'wish', strand: 'r' });
  const words = wordEntries(game.content);
  const herd = game.world.herd;
  const baby = herd.find((b) => b.id === params.baby)!;
  const other = herd.filter((b) => b.id !== baby.id && b.name !== null);
  const twinBaby = other.length ? other[Math.floor(deps.rng() * other.length)].id : null;
  const sounded = soundedGraphemes(readLadder(game.content), (s) => stepStatusOf('r', s));
  const make = (s: Served, rng: Rng) => buildWish({ served: s, baby: baby.id, babyName: baby.name, twinBaby, words, bathPond: game.world.bathPond, sounded, rng });
  const served = serve('wish', deps.rng, (s) => make(s, deps.rng) !== null, { firstWish: params.then === 'heartbeat' });
  const task = served ? make(served, deps.rng) : null;
  const ctrl = task ? new WishCtrl(task, deps, (w) => words.get(w)) : null;
  let tick = $state(0);
  if (ctrl) ctrl.onchange = () => tick++;
  const v = $derived.by(() => { tick; return ctrl ? { part: ctrl.part, funny: ctrl.lastFunny, glow: ctrl.glow, done: ctrl.done, units: ctrl.units, babyId: ctrl.current.baby } : null; });
  const who = $derived(herd.find((b) => b.id === v?.babyId) ?? baby);
  let babyEl: HTMLElement;
  let printEl: HTMLElement;
  const stationEls: Record<string, HTMLElement> = {};
  let funnyClass = $state('');
  $effect(() => { if (v?.funny) { funnyClass = `funny-${v.funny}`; setTimeout(() => (funnyClass = ''), 1600); } });
  const stations = STATIONS.filter((s) => s !== 'bath' || game.world.bathPond);

  function finish() {
    if (params.then === 'heartbeat') heartbeat.wishDone();
    else game.go('meadow');
  }
  onMount(async () => {
    if (!ctrl) { finish(); return; }  // nothing servable: skip the wish quietly (Review focus 5)
    exposeCtrl('wish', ctrl);
    goal.set(() => deps.audio.say('g-wish'));
    moonbeam.show(printEl);
    await ctrl.begin();
    if (herd.length <= 1 && printEl) await ghost.drag(printEl.firstElementChild ?? printEl, printEl.lastElementChild ?? printEl);
  });
  $effect(() => { if (v?.done) setTimeout(finish, 900); });
  onDestroy(() => { goal.clear(); moonbeam.clear(); });
</script>

{#if ctrl && v}
  <section class="wish" aria-label="wish scene">
    <HbGuides />
    <div class="bg"><ArtImg id="bg-wish" size={1180} /></div>
    <div class="baby {funnyClass}" bind:this={babyEl} data-touch aria-label="wishing baby"
      use:draggable={{ disabled: ctrl.task.kind !== 'station', targets: () => stations.map((s) => ({ id: s, el: stationEls[s] })), ondrop: (t) => { if (t) ctrl.toStation(t as any); } }}>
      <Unicorn baby={who} pose="stand" size={280} />
    </div>
    <div class="bubble" bind:this={printEl}>
      {#key v.part}
        <PrintWithDots units={v.units} dotsMs={ctrl.task.dotsMs} glow={v.glow} onsound={(g) => { const k = unitSoundKey(g); if (k) deps.audio.listen(deps.audio.sound(k)); }} />
      {/key}
    </div>
    {#if ctrl.task.kind !== 'station'}
      <div class="basket basket-{ctrl.task.basket.length}">
        {#each ctrl.task.basket as it (it.key)}
          <span class="item" data-touch aria-label="item {it.heap ? words.get(it.word)?.plural ?? it.word : it.word}"
            use:draggable={{ targets: () => [{ id: 'baby', el: babyEl }], ondrop: (t) => { if (t === 'baby') ctrl.give(it.key); }, ontap: () => deps.audio.sfx('pop') }}>
            {#if it.heap}<Heap picture={it.picture} count={heapCount(it.word)} seed={it.word.length} size={150} />{:else}<ArtImg id={it.picture} size={140} />{/if}
          </span>
        {/each}
      </div>
    {/if}
    <div class="stations">
      {#each stations as s}
        <span class="station" bind:this={stationEls[s]} data-touch aria-label="station {s}"><ArtImg id="station-{s}" size={120} /></span>
      {/each}
    </div>
  </section>
{/if}

<style>
  .wish { position: absolute; inset: 0; touch-action: none; }
  .bg { position: absolute; inset: 0; }
  .baby { position: absolute; left: 80px; top: 230px; width: 300px; height: 300px; touch-action: none; }
  .bubble { position: absolute; left: 60px; top: 50px; }
  .basket { position: absolute; left: 520px; top: 70px; width: 620px; display: grid; grid-template-columns: repeat(3, 180px); gap: 20px; justify-content: center; }
  .basket-4 { grid-template-columns: repeat(2, 180px); }
  .item { display: grid; place-items: center; width: 180px; height: 180px; background: #fffaf0; border: 4px solid #e8b878; border-radius: 32px; touch-action: none; }
  .stations { position: absolute; left: 40px; right: 40px; bottom: 24px; display: flex; justify-content: space-between; }
  .station { width: 140px; height: 140px; display: grid; place-items: center; }
  .funny-one-for-many { animation: pat 0.4s 4; }
  .funny-heap-for-one { animation: topple 1.2s ease-in-out; }
  .funny-wrong-thing { animation: tilt 0.5s 2; }
  .funny-wrong-station { animation: swing 0.8s 2; }
  @keyframes pat { 50% { transform: translateY(-10px) rotate(-6deg); } }
  @keyframes topple { 60% { transform: rotate(-14deg); } }
  @keyframes tilt { 50% { transform: rotate(10deg); } }
  @keyframes swing { 50% { transform: translateX(30px) rotate(8deg); } }
</style>
```

- [ ] **Step 6: Type check and test**

Run: `npx vitest run tests/heartbeat && npm run check`
Expected: PASS; no type errors in this task's files.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/wish.ctrl.ts src/scenes/Wish.svelte tests/heartbeat/wish-ctrl.test.ts
git commit -m "Add the wish scene with basket, care stations, one-or-many and twin wishes"
```

**Acceptance:** tests pass; the word is never spoken before Emma acts; the basket shows 3, 4 or 6 items by level; a heap is drawn by code from the one picture.

---

### Task 21: Move-in, door visits and the stables

**Files:**
- Create: `src/scenes/heartbeat/stalls.ctrl.ts`, `src/scenes/Stalls.svelte`
- Test: `tests/heartbeat/stalls-ctrl.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 7, 15, 17B, 18; `game` (C6); `stepStatusOf`, `secure` (Task 17B); `UnicornHead` (C12).
- Produces:

```ts
export type StallsInput = { baby: { id: string; order: number; clipKey: string | null }; layout: StableLayout; rowsBuilt: number; range: number; secure: boolean; source: Source };
export class StallsCtrl {
  readonly door: boolean; readonly target: number | null; tapped: { number: number; who: 'neighbour' | 'sleepy' | 'empty' } | null; done: boolean; onchange: () => void;
  constructor(i: StallsInput, d: SceneDeps);
  moveIn(): Promise<void>; beginVisit(): Promise<void>; tapDoor(n: number): Promise<'ok' | 'miss' | 'ignored'>; wrongDoor(): number | null;
}
// Stalls.svelte params: { baby?: string; mode: 'move-in' | 'view' | 'moon-name' }
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/stalls-ctrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { StallsCtrl } from '../../src/scenes/heartbeat/stalls.ctrl.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import { fakeDeps } from './fakes.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const input = (n: number, rows: number, order: number, range = 10, secure = false) => ({
  baby: { id: `b${order}`, order, clipKey: 'tam' }, layout: stableLayout(herd(n), rows), rowsBuilt: rows, range, secure, source: 'current' as const,
});

describe('StallsCtrl', () => {
  it('says the name and the baby number at its door', async () => {
    const f = fakeDeps({ names: ['tam'] });
    const c = new StallsCtrl(input(19, 2, 19, 20), f.deps);
    await c.moveIn();
    expect(c.door).toBe(true);
    expect(f.said).toEqual(['name:tam!', 'num-baby-19']);
  });
  it('sends a baby without a row to the tent and asks no visit', async () => {
    const f = fakeDeps({ names: ['tam'] });
    const c = new StallsCtrl(input(11, 1, 11, 20), f.deps);
    await c.moveIn();
    expect(c.door).toBe(false);
    expect(c.target).toBeNull();
    expect(f.said).toContain('g-tent');
  });
  it('plays counts above sixty only when the clip exists', async () => {
    const f = fakeDeps();
    const c = new StallsCtrl(input(71, 8, 71, 0), f.deps);
    await c.moveIn();
    expect(f.said).toContain('?num-baby-71');
  });
  it('runs a door visit with a funny wrong door', async () => {
    const f = fakeDeps({ names: ['tam'] });
    const c = new StallsCtrl(input(5, 1, 5, 10), f.deps);
    expect(c.target).not.toBeNull();
    await c.beginVisit();
    expect(f.said).toContain(`num-visit-${c.target}`);
    const wrong = c.wrongDoor()!;
    expect(await c.tapDoor(wrong)).toBe('miss');
    expect(f.said).toContain(`num-that-is-${wrong}`);
    expect(c.tapped?.who).toBe(wrong <= 5 ? 'sleepy' : 'empty');
    expect(await c.tapDoor(c.target!)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.door.done', baby: 'b5', number: c.target, result: 'miss' });
  });
  it('asks no visit outside the range or between every third baby once secure', () => {
    expect(new StallsCtrl(input(5, 1, 5, 0), fakeDeps().deps).target).toBeNull();
    expect(new StallsCtrl(input(4, 1, 4, 10, true), fakeDeps().deps).target).toBeNull();
    expect(new StallsCtrl(input(6, 1, 6, 10, true), fakeDeps().deps).target).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/stalls-ctrl.test.ts`
Expected: FAIL, cannot resolve the controller.

- [ ] **Step 3: Write the controller**

`src/scenes/heartbeat/stalls.ctrl.ts`:

```ts
import type { ErrorTag, Source } from '../../core/heartbeat/types.ts';
import { type StableLayout, hasDoor, pickVisitDoor, shouldVisit } from '../../core/heartbeat/stables.ts';
import { TIER1_COUNT_MAX, lineId } from '../../core/heartbeat/lines.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import type { SceneDeps } from './deps.ts';

export type StallsInput = {
  baby: { id: string; order: number; clipKey: string | null };
  layout: StableLayout; rowsBuilt: number; range: number; secure: boolean; source: Source;
};

export class StallsCtrl {
  readonly door: boolean;
  readonly target: number | null;
  tapped: { number: number; who: 'neighbour' | 'sleepy' | 'empty' } | null = null;
  done = false;
  onchange: () => void = () => {};
  private occupants = new Map<number, string>();
  private misses = 0;
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(private i: StallsInput, private d: SceneDeps) {
    for (const dr of i.layout.rows.flat()) if (dr.baby) this.occupants.set(dr.number, dr.baby);
    this.door = hasDoor(i.baby.order, i.rowsBuilt);
    this.target = this.door && shouldVisit({ range: i.range, secure: i.secure, babyOrder: i.baby.order })
      ? pickVisitDoor(i.layout, i.range, i.baby.order, d.rng) : null;
  }

  private async sayCount(id: string, n: number): Promise<void> {
    if (n <= TIER1_COUNT_MAX) await this.d.audio.say(id); else await this.d.audio.sayOptional(id);
  }

  async moveIn(): Promise<void> {
    if (this.i.baby.clipKey) await this.d.audio.sayName(this.i.baby.clipKey, '!');
    await this.sayCount(lineId.baby(this.i.baby.order), this.i.baby.order);
    if (!this.door) await this.d.audio.say('g-tent');
  }

  async beginVisit(): Promise<void> {
    const t = this.target;
    if (t === null) return;
    if (this.i.baby.clipKey) await this.d.audio.sayName(this.i.baby.clipKey, '!');
    await this.d.audio.say(lineId.visit(t));
    this.startedAt = this.d.now();
    this.d.hints.begin({ idleMs: 15000, repeat: () => this.d.audio.say(lineId.visit(t)), focused: () => this.d.audio.say(lineId.visit(t)), answer: async () => {} });
  }

  wrongDoor(): number | null {
    if (this.target === null) return null;
    const occupied = [...this.occupants.keys()].filter((n) => n !== this.target && n !== this.i.baby.order);
    return occupied[0] ?? (this.target === 1 ? 2 : 1);
  }

  async tapDoor(n: number): Promise<'ok' | 'miss' | 'ignored'> {
    const t = this.target;
    if (t === null || this.done) return 'ignored';
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
    this.d.audio.act();
    if (n === t) {
      const result = momentResult(this.misses, this.d.hints.level);
      this.d.dispatch({ type: 'hb.door.done', baby: this.i.baby.id, number: n, result, source: this.i.source,
        ms: Math.max(0, this.firstTouch - this.startedAt), error: result === 'first' ? null : this.lastError });
      this.d.hints.end();
      this.tapped = { number: n, who: 'neighbour' };
      this.done = true;
      this.onchange();
      await this.d.audio.say('foal-hello');
      return 'ok';
    }
    this.misses++;
    const rev = n >= 10 && t >= 10 && String(n).split('').reverse().join('') === String(t);
    this.lastError = rev ? 'reversal' : Math.abs(n - t) === 1 ? 'off-by-one' : 'other';
    this.tapped = { number: n, who: this.occupants.has(n) ? 'sleepy' : 'empty' };
    this.onchange();
    if (this.occupants.has(n)) await this.d.audio.say('foal-notme');
    if (n <= 20) await this.d.audio.say(lineId.thatIs(n)); else await this.d.audio.sayOptional(lineId.thatIs(n));
    await this.d.hints.miss();
    return 'miss';
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/stalls-ctrl.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `Stalls.svelte`**

A page shows two rows. Each row is two lines of five doors (a real ten-frame), with the row's sign above it (`world.rowNames[row - 1]` when BUILD has named it, else "Row 1") and a plaque under each door with the baby's name tag and the door number. While a door is the answer (door visit), plaques show numbers only and doors show heads, never names. The Moonbeam Camp is a strip of tents at the bottom with the camp babies' heads. Page arrows (96 px) appear when there are more than two rows.

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { secure, stepStatusOf } from './heartbeat/learn-bridge.ts';
  import { pageCount, pageDoors, pageOf, rangeStep, stableLayout, visitRange } from '../core/heartbeat/stables.ts';
  import { StallsCtrl } from './heartbeat/stalls.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import { liveDeps } from './heartbeat/deps.ts';
  import { exposeCtrl } from './heartbeat/test-hooks.ts';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { moonName } from './heartbeat/moon-name.ts';
  import { moonbeam } from './heartbeat/guides.svelte.ts';
  import { goal } from './heartbeat/guides.svelte.ts';
  import UnicornHead from '../art/UnicornHead.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import NameTag from './naming/NameTag.svelte';

  const params = game.params as { baby?: string; mode: 'move-in' | 'view' | 'moon-name' };
  const deps = liveDeps({ place: 'stalls', strand: 'm' });
  const world = game.world;
  const layout = stableLayout(world.herd, world.rowsBuilt);
  const byId = new Map(world.herd.map((b) => [b.id, b]));
  const baby = params.baby ? byId.get(params.baby) : undefined;
  const status = (s: string) => stepStatusOf('m', s);
  const range = visitRange(status);
  const rs = rangeStep(range);
  const ctrl = baby && params.mode === 'move-in'
    ? new StallsCtrl({ baby: { id: baby.id, order: baby.order, clipKey: baby.clipKey }, layout, rowsBuilt: world.rowsBuilt, range,
        secure: rs ? secure('m', rs) : false, source: rs && status(rs) === 'current' ? 'current' : 'review' }, deps)
    : null;
  let page = $state(baby ? pageOf(baby.order) : 1);
  let visiting = $state(false);
  let tick = $state(0);
  if (ctrl) ctrl.onchange = () => tick++;
  const tapped = $derived.by(() => { tick; return ctrl?.tapped ?? null; });
  const doors = $derived(pageDoors(layout, page));
  const doorEls: Record<number, HTMLElement> = {};

  onMount(async () => {
    if (params.mode === 'moon-name' && baby) { await moonName(baby, deps); game.go('meadow'); return; }
    if (!ctrl || !baby) return;
    exposeCtrl('stalls', ctrl);
    await ctrl.moveIn();
    heartbeat.movedIn(baby.id, ctrl.target !== null);
    if (ctrl.target === null) return;
    page = pageOf(ctrl.target);
    visiting = true;
    goal.set(() => ctrl.beginVisit());
    moonbeam.show(Object.values(doorEls));
    await ctrl.beginVisit();
  });
  $effect(() => { tick; if (ctrl?.done) { moonbeam.clear(); setTimeout(() => heartbeat.visitDone(), 1200); } });
  onDestroy(() => { goal.clear(); moonbeam.clear(); });
</script>

<section class="stalls" aria-label="stables scene">
  <HbGuides />
  <div class="bg"><ArtImg id="bg-stables" size={1180} /></div>
  <div class="rows">
    {#each [0, 1] as k}
      {@const row = doors.slice(k * 10, k * 10 + 10)}
      {#if row.length}
        <div class="row">
          <div class="sign">{world.rowNames?.[row[0].row - 1] ?? `Row ${row[0].row}`}</div>
          <div class="frame">
            {#each row as d (d.number)}
              {@const who = d.baby ? byId.get(d.baby) : undefined}
              <button class="door" class:glow={baby?.order === d.number && !visiting} data-touch aria-label="door {d.number}"
                bind:this={doorEls[d.number]} onpointerup={() => ctrl?.tapDoor(d.number)}>
                <ArtImg id="door" size={92} />
                {#if who && (visiting || d.baby !== baby?.id)}<span class="head" class:sleepy={tapped?.number === d.number && tapped.who === 'sleepy'}><UnicornHead baby={who} size={64} nightcap={tapped?.number === d.number && tapped.who === 'sleepy'} /></span>{/if}
                <span class="plaque"><b>{d.number}</b>{#if who?.name && !visiting}<NameTag name={who.name} ordinal={who.ordinal} sparkle={!who.clipKey} />{/if}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
  {#if pageCount(layout) > 1}
    <button class="arrow left" data-touch aria-label="previous row" disabled={page === 1} onpointerup={() => (page = Math.max(1, page - 1))}>‹</button>
    <button class="arrow right" data-touch aria-label="next row" disabled={page === pageCount(layout)} onpointerup={() => (page = Math.min(pageCount(layout), page + 1))}>›</button>
  {/if}
  <div class="camp" aria-label="moonbeam camp">
    {#each layout.camp as id}{@const b = byId.get(id)}{#if b}<span class="tent"><ArtImg id="tent" size={96} /><span class="head"><UnicornHead baby={b} size={48} /></span></span>{/if}{/each}
  </div>
</section>

<style>
  .stalls { position: absolute; inset: 0; }
  .bg { position: absolute; inset: 0; }
  .rows { position: absolute; left: 70px; right: 70px; top: 50px; display: flex; gap: 40px; justify-content: center; }
  .sign { font: 700 30px 'Andika', sans-serif; text-align: center; color: #5a3a1a; margin-bottom: 8px; }
  .frame { display: grid; grid-template-columns: repeat(5, 96px); gap: 10px 8px; }
  .door { position: relative; width: 96px; height: 200px; background: none; border: 0; display: flex; flex-direction: column; align-items: center; }
  .door.glow { animation: pulse 0.9s ease-in-out infinite; }
  .head { position: absolute; top: 22px; }
  .plaque { display: flex; flex-direction: column; align-items: center; transform: scale(0.55); transform-origin: top center; font: 700 44px 'Andika', sans-serif; }
  .arrow { position: absolute; top: 300px; width: 96px; height: 96px; border-radius: 50%; background: #fff; border: 4px solid #c9b8ff; font: 700 56px 'Andika', sans-serif; }
  .arrow.left { left: 10px; } .arrow.right { right: 10px; }
  .camp { position: absolute; left: 40px; right: 40px; bottom: 20px; display: flex; gap: 12px; }
  .tent { position: relative; } .tent .head { left: 24px; top: 40px; }
  @keyframes pulse { 50% { transform: scale(1.05); } }
</style>
```

`moonName` lives in `src/scenes/heartbeat/moon-name.ts` (Task 23).

- [ ] **Step 6: Type check and test**

Run: `npx vitest run tests/heartbeat && npm run check`
Expected: PASS (the `moon-name.ts` import resolves after Task 23; until then `svelte-check` reports only that missing module).

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/stalls.ctrl.ts src/scenes/Stalls.svelte tests/heartbeat/stalls-ctrl.test.ts
git commit -m "Add move-in, door visits, plaques and the Moonbeam Camp"
```

**Acceptance:** tests pass; the door of the newborn glows on move-in; a camp baby sleeps in a tent with `g-tent`; during a door visit doors show heads and numbers, never names.

---

### Task 22: Goodnight, roll call and sky unicorns

**Files:**
- Create: `src/scenes/heartbeat/goodnight.ctrl.ts`, `src/scenes/Goodnight.svelte`
- Test: `tests/heartbeat/goodnight-ctrl.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 7, 8, 15, 17B, 18, 19; `game` (C6); `serve`, `nameReviewIds`, `checkedCount` (Task 17B).
- Produces:

```ts
export function readableGraphemes(ladder: { id: string; items: string[] }[], status: (step: string) => StepState): Set<string>;
export type GoodnightInput = { layout: StableLayout; page: number; picks: RollCallPick[]; doorServed: Served | null; herdCount: number; skyNames: (string | null)[] };
export class GoodnightCtrl {
  stage: 'rollcall' | 'sky' | 'sky-name' | 'bye'; index: number; poked: number | null; onchange: () => void;
  constructor(i: GoodnightInput, d: SceneDeps);
  readonly pick: RollCallPick | null; readonly heads: Set<string>;
  beginPick(): Promise<void>; tapDoor(n: number): Promise<'ok' | 'miss' | 'ignored'>; answerDoor(): number | null; wrongDoor(): number | null;
  sky(): Promise<number | null>; skyNamed(index: number, n: Named): void; bye(): Promise<void>;
}
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/goodnight-ctrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GoodnightCtrl, readableGraphemes } from '../../src/scenes/heartbeat/goodnight.ctrl.ts';
import { stableLayout } from '../../src/core/heartbeat/stables.ts';
import type { RollCallPick } from '../../src/core/heartbeat/rollcall.ts';
import { fakeDeps } from './fakes.ts';

const herd = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, order: i + 1 }));
const make = (n: number, picks: RollCallPick[], f = fakeDeps()) =>
  ({ f, c: new GoodnightCtrl({ layout: stableLayout(herd(n), 1), page: 1, picks, doorServed: null, herdCount: n, skyNames: [] }, f.deps) });

describe('readableGraphemes', () => {
  it('includes passed, placed and current reading steps', () => {
    const s = readableGraphemes([{ id: 'R01', items: ['s', 'a'] }, { id: 'R02', items: ['i'] }, { id: 'R03', items: ['g'] }],
      (st) => (st === 'R01' ? 'placed' : st === 'R02' ? 'current' : 'locked'));
    expect([...s].sort()).toEqual(['a', 'i', 's']);
  });
});

describe('GoodnightCtrl', () => {
  it('puts named babies to bed and logs while three candidates are left', async () => {
    const { f, c } = make(3, [{ kind: 'name', baby: 'b1', name: 'Tam' }, { kind: 'name', baby: 'b2', name: 'Pip' }]);
    await c.beginPick();
    expect(f.said).toContain('g-rollcall');
    expect(await c.tapDoor(1)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.rollcall.done', baby: 'b1', logged: true, result: 'first' });
    expect(await c.tapDoor(3)).toBe('miss');
    expect(f.said).toContain('foal-notme');
    expect(await c.tapDoor(2)).toBe('ok');
    expect(f.actions[1]).toMatchObject({ baby: 'b2', logged: false, result: 'miss' });
    expect(c.stage).toBe('sky');
  });
  it('ignores empty doors and babies already in bed', async () => {
    const { c } = make(4, [{ kind: 'name', baby: 'b1', name: 'Tam' }, { kind: 'name', baby: 'b2', name: 'Pip' }]);
    await c.beginPick();
    expect(await c.tapDoor(9)).toBe('ignored');
    await c.tapDoor(1);
    expect(await c.tapDoor(1)).toBe('ignored');
  });
  it('speaks a door number for a door pick', async () => {
    const f = fakeDeps();
    const c = new GoodnightCtrl({ layout: stableLayout(herd(15), 2), page: 1, picks: [{ kind: 'door', baby: 'b12', number: 12 }],
      doorServed: null, herdCount: 15, skyNames: [] }, f.deps);
    await c.beginPick();
    expect(f.said).toEqual(['num-door-bed-12']);
    expect(c.answerDoor()).toBe(12);
  });
  it('counts the herd and names one sky unicorn', async () => {
    const f = fakeDeps();
    const c = new GoodnightCtrl({ layout: stableLayout(herd(41), 5), page: 1, picks: [], doorServed: null, herdCount: 41, skyNames: ['Rose'] }, f.deps);
    expect(c.stage).toBe('sky');
    expect(await c.sky()).toBe(1);
    expect(f.said).toEqual(['num-unicorns-41', 'num-sky-4', 'g-sky-name']);
    c.skyNamed(1, { name: 'Star', gems: ['s', 't', 'ar'], clipKey: 'star', ordinal: 1, route: 'bell', unknown: false });
    expect(f.actions[0]).toEqual({ type: 'hb.sky.named', index: 1, name: 'Star', gems: ['s', 't', 'ar'], clipKey: 'star' });
    expect(c.stage).toBe('bye');
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/goodnight-ctrl.test.ts`
Expected: FAIL, cannot resolve the controller.

- [ ] **Step 3: Write the controller**

`src/scenes/heartbeat/goodnight.ctrl.ts`:

```ts
import type { Served, StepState } from '../../core/heartbeat/types.ts';
import { type StableLayout, pageDoors } from '../../core/heartbeat/stables.ts';
import { type RollCallPick, logRollCall } from '../../core/heartbeat/rollcall.ts';
import { goodnightCountLines, skyState } from '../../core/heartbeat/sky.ts';
import { lineId } from '../../core/heartbeat/lines.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import type { Named } from './naming.ctrl.ts';
import type { SceneDeps } from './deps.ts';

export function readableGraphemes(ladder: { id: string; items: string[] }[], status: (step: string) => StepState): Set<string> {
  const s = new Set<string>();
  for (const st of ladder) { const k = status(st.id); if (k === 'passed' || k === 'placed' || k === 'current') st.items.forEach((i) => s.add(i)); }
  return s;
}

export type GoodnightInput = { layout: StableLayout; page: number; picks: RollCallPick[]; doorServed: Served | null; herdCount: number; skyNames: (string | null)[] };

export class GoodnightCtrl {
  stage: 'rollcall' | 'sky' | 'sky-name' | 'bye';
  index = 0;
  poked: number | null = null;
  onchange: () => void = () => {};
  readonly heads: Set<string>;
  private misses = 0;
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(private i: GoodnightInput, private d: SceneDeps) {
    this.heads = new Set(pageDoors(i.layout, i.page).filter((x) => x.baby).map((x) => x.baby!));
    this.stage = i.picks.length ? 'rollcall' : 'sky';
  }

  get pick(): RollCallPick | null { return this.i.picks[this.index] ?? null; }

  private doorOf(baby: string): number | null {
    return pageDoors(this.i.layout, this.i.page).find((x) => x.baby === baby)?.number ?? null;
  }
  answerDoor(): number | null { const p = this.pick; return p ? this.doorOf(p.baby) : null; }
  wrongDoor(): number | null {
    const p = this.pick;
    const other = [...this.heads].find((b) => b !== p?.baby);
    return other ? this.doorOf(other) : null;
  }

  async beginPick(): Promise<void> {
    const p = this.pick;
    if (!p) return;
    if (p.kind === 'name' && this.index === 0) await this.d.audio.say('g-rollcall');
    if (p.kind === 'door') await this.d.audio.say(lineId.doorBed(p.number));
    this.misses = 0;
    this.firstTouch = null;
    this.startedAt = this.d.now();
    const repeat = () => (p.kind === 'door' ? this.d.audio.say(lineId.doorBed(p.number)) : this.d.audio.say('g-rollcall'));
    this.d.hints.begin({ idleMs: 10000, repeat, focused: repeat, answer: async () => {} });
    this.onchange();
  }

  async tapDoor(n: number): Promise<'ok' | 'miss' | 'ignored'> {
    const p = this.pick;
    if (!p || this.stage !== 'rollcall') return 'ignored';
    const door = pageDoors(this.i.layout, this.i.page).find((x) => x.number === n);
    if (!door?.baby || !this.heads.has(door.baby)) return 'ignored';
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
    this.d.audio.act();
    if (door.baby === p.baby) {
      const logged = logRollCall(this.heads.size);
      const result = momentResult(this.misses, this.d.hints.level);
      this.d.dispatch({ type: 'hb.rollcall.done', baby: p.baby, pick: p, result, logged, served: p.kind === 'door' ? this.i.doorServed : null,
        ms: Math.max(0, this.firstTouch - this.startedAt), error: result === 'first' ? null : 'other' });
      this.d.hints.end();
      this.heads.delete(p.baby);
      this.poked = null;
      this.index++;
      if (!this.pick) this.stage = 'sky';
      this.onchange();
      await this.d.audio.say('lumi-night');
      if (this.pick) await this.beginPick();
      return 'ok';
    }
    this.misses++;
    this.poked = n;
    this.onchange();
    await this.d.audio.say('foal-notme');
    if (p.kind === 'door' && n <= 20) await this.d.audio.say(lineId.thatIs(n));
    await this.d.hints.miss();
    return 'miss';
  }

  async sky(): Promise<number | null> {
    const st = skyState(this.i.herdCount, this.i.skyNames);
    const lines = goodnightCountLines(this.i.herdCount, st.unicorns);
    for (const id of lines.required) await this.d.audio.say(id);
    for (const id of lines.optional) await this.d.audio.sayOptional(id);
    const next = st.unnamed[0] ?? null;
    this.stage = next === null ? 'bye' : 'sky-name';
    this.onchange();
    if (next !== null) await this.d.audio.say('g-sky-name');
    return next;
  }

  skyNamed(index: number, n: Named): void {
    this.d.dispatch({ type: 'hb.sky.named', index, name: n.name, gems: n.gems, clipKey: n.clipKey });
    this.stage = 'bye';
    this.onchange();
  }

  async bye(): Promise<void> {
    await this.d.audio.say('lumi-goodnight-emma');
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/goodnight-ctrl.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `Goodnight.svelte`**

The sky fills the top 360 px: one star per baby, and each full ten drawn as a sky unicorn (`sky-unicorn` art) with its name under it. The bottom shows one stable page with heads at the doors and the lantern holding the printed name (with its crowned capital and ordinal) of the current pick. After roll call, the count lines play, a new sky unicorn gets named with the `Naming` component (target `{ kind: 'sky', index }`), Lumi says goodnight, and the scene calls `game.endVisit('goodnight')` (C6), which routes to the rest scene.

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { game } from '../game.svelte.ts';
  import { checkedCount, nameReviewIds, serve } from './heartbeat/learn-bridge.ts';
  import { stableLayout, pageDoors } from '../core/heartbeat/stables.ts';
  import { pickRollCall, rollCallCount } from '../core/heartbeat/rollcall.ts';
  import { parseMathsItem } from '../core/maths/eggs.ts';
  import { skyState } from '../core/heartbeat/sky.ts';
  import { GoodnightCtrl } from './heartbeat/goodnight.ctrl.ts';
  import HbGuides from './heartbeat/HbGuides.svelte';
  import { liveDeps } from './heartbeat/deps.ts';
  import { exposeCtrl } from './heartbeat/test-hooks.ts';
  import { goal } from './heartbeat/guides.svelte.ts';
  import UnicornHead from '../art/UnicornHead.svelte';
  import ArtImg from './heartbeat/ArtImg.svelte';
  import NameTag from './naming/NameTag.svelte';
  import Naming from './Naming.svelte';

  const deps = liveDeps({ place: 'goodnight', strand: 'name' });
  const w = game.world;
  const byId = new Map(w.herd.map((b) => [b.id, b]));
  const layout = stableLayout(w.herd, w.rowsBuilt);
  const review = new Set(nameReviewIds(w.herd, 6, deps.rng)); // LEARN applies the spec 3.7 eligibility and due order
  const doorServed = serve('rollcall-door', deps.rng, (s) => s.step === 'M07', { doors: { built: w.rowsBuilt * 10, own: null } } as any);
  const doorNo = doorServed ? (parseMathsItem(doorServed.id) as { n: number }).n : null;
  const count = rollCallCount({ visitIndex: w.visitIndex, checkedThisVisit: checkedCount(), due: review.size });
  const { page, picks } = pickRollCall({
    layout, names: new Map(w.herd.map((b) => [b.id, b.name])), count, door: doorNo, rng: deps.rng,
    isDue: (id) => review.has(id), eligible: (id) => review.has(id),
  });
  const ctrl = new GoodnightCtrl({ layout, page, picks, doorServed: picks[0]?.kind === 'door' ? doorServed : null, herdCount: w.herd.length, skyNames: w.skyNames }, deps);
  let tick = $state(0);
  ctrl.onchange = () => tick++;
  const v = $derived.by(() => { tick; return { stage: ctrl.stage, pick: ctrl.pick, heads: new Set(ctrl.heads), poked: ctrl.poked }; });
  const sky = skyState(w.herd.length, w.skyNames);
  let naming = $state<number | null>(null);

  let afterStarted = false;   // the $effect below reruns on every tick: run the end once
  async function afterRollCall() {
    if (afterStarted) return;
    afterStarted = true;
    const next = await ctrl.sky();
    if (next !== null) { naming = next; return; }
    await ctrl.bye();
    game.endVisit('goodnight');
  }
  $effect(() => { if (v.stage === 'sky') void afterRollCall(); });
  onMount(async () => {
    exposeCtrl('goodnight', ctrl);
    goal.set(() => ctrl.beginPick());
    if (ctrl.stage === 'rollcall') await ctrl.beginPick();
  });
  onDestroy(() => goal.clear());
</script>

<section class="night" aria-label="goodnight scene">
  <HbGuides />
  <div class="bg"><ArtImg id="bg-sky" size={1180} /></div>
  <div class="sky">
    {#each Array(sky.unicorns) as _, i}
      <span class="sky-unicorn"><ArtImg id="sky-unicorn" size={110} />{#if w.skyNames[i]}<em>{w.skyNames[i]}</em>{/if}</span>
    {/each}
    {#each Array(sky.stars) as _, i}<span class="star" style:--i={i}>✦</span>{/each}
  </div>
  {#if v.stage === 'rollcall' && v.pick}
    <div class="lantern" aria-label="lantern">
      <ArtImg id="lantern" size={120} />
      {#if v.pick.kind === 'name'}{@const b = byId.get(v.pick.baby)}<NameTag name={v.pick.name} ordinal={b?.ordinal ?? 1} />{/if}
    </div>
  {/if}
  <div class="doors">
    {#each pageDoors(layout, page) as d (d.number)}
      {@const b = d.baby ? byId.get(d.baby) : undefined}
      <button class="door" data-touch aria-label="door {d.number}" onpointerup={() => ctrl.tapDoor(d.number)}>
        <ArtImg id="door" size={84} />
        {#if b && v.heads.has(b.id)}<span class="head" class:poke={v.poked === d.number}><UnicornHead baby={b} size={56} /></span>{/if}
        <b>{d.number}</b>
      </button>
    {/each}
  </div>
  {#if naming !== null}
    <div class="sky-naming"><Naming target={{ kind: 'sky', index: naming }} onnamed={async (n) => { ctrl.skyNamed(naming!, n); naming = null; await ctrl.bye(); game.endVisit('goodnight'); }} /></div>
  {/if}
</section>

<style>
  .night { position: absolute; inset: 0; background: #1d1b4a; }
  .bg { position: absolute; inset: 0; }
  .sky { position: absolute; left: 40px; right: 40px; top: 20px; height: 340px; display: flex; flex-wrap: wrap; gap: 18px; align-content: flex-start; }
  .sky-unicorn { display: flex; flex-direction: column; align-items: center; color: #fff6c8; font: 700 22px 'Andika', sans-serif; }
  .star { color: #fff6c8; font-size: 34px; animation: tw 2s calc(var(--i) * 0.2s) infinite; }
  .lantern { position: absolute; left: 470px; top: 360px; display: flex; align-items: center; gap: 12px; }
  .doors { position: absolute; left: 60px; right: 60px; bottom: 30px; display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; }
  .door { position: relative; height: 150px; background: none; border: 0; color: #fff; font: 700 26px 'Andika', sans-serif; display: flex; flex-direction: column; align-items: center; }
  .head { position: absolute; top: 16px; } .head.poke { animation: poke 0.6s 2; }
  .sky-naming { position: absolute; inset: 0; background: #1d1b4aee; }
  @keyframes tw { 50% { opacity: 0.4; } }
  @keyframes poke { 50% { transform: translateY(-14px); } }
</style>
```

During roll call plaques are not drawn at all (spec 2.5 rule 5); only door numbers show, which roll call by name does not need and roll call by number does.

- [ ] **Step 6: Type check and test**

Run: `npx vitest run tests/heartbeat && npm run check`
Expected: PASS; no type errors in this task's files.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/goodnight.ctrl.ts src/scenes/Goodnight.svelte tests/heartbeat/goodnight-ctrl.test.ts
git commit -m "Add goodnight with roll call, the herd count and sky unicorns"
```

**Acceptance:** tests pass; roll call never shows a name tag at a door; a new sky unicorn is named at most once per goodnight; Lumi says "Goodnight, Emma." and the visit ends.

---

### Task 23: The heartbeat runtime, the moon's new names, test hooks and browser flows

**Files:**
- Create: `src/scenes/heartbeat/flow.svelte.ts`, `src/scenes/heartbeat/moon-name.ts`, `src/scenes/heartbeat/test-hooks.ts`, `src/scenes/heartbeat/Moonflowers.svelte`, `flows/heartbeat/heartbeat.flow.sh`, `flows/heartbeat/naming.flow.sh`
- Test: `tests/heartbeat/moon-name.test.ts`, `tests/heartbeat/line-coverage.test.ts`

**Interfaces:**
- Consumes: everything above; `game` (C6); `registerSceneHook` (C7).
- Produces:

```ts
// flow.svelte.ts
export const heartbeatHooks: { onMovedIn: ((baby: string) => void)[] };
export const heartbeat: {
  readonly state: HbState;
  start(): void; eggPicked(): void; hatched(baby: string): void; named(): void; wishDone(): void;
  movedIn(baby: string, visit: boolean): void; visitDone(): void; left(): void; noteOtherActivity(): void;
  startWish(baby: string): void; startGoodnight(): void; nameBaby(baby: string, onDone: () => void): void; tapBaby(baby: string): boolean;
};
// moon-name.ts
export function pendingMoonNames(herd: { id: string; name: string | null; unknownName: boolean; clipHeard: boolean }[], hasName: (k: string) => boolean): string[];
export function moonName(baby: { id: string; name: string | null }, d: SceneDeps): Promise<void>;
// test-hooks.ts
export function exposeCtrl(scene: string, ctrl: unknown): void;
// Moonflowers.svelte props: { count: number; seed?: number }
```

- [ ] **Step 1: Write the failing tests**

`tests/heartbeat/moon-name.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { moonName, pendingMoonNames } from '../../src/scenes/heartbeat/moon-name.ts';
import { fakeDeps } from './fakes.ts';

describe('the moon told me a new name', () => {
  const herd = [
    { id: 'a', name: 'Tamo', unknownName: true, clipHeard: false },
    { id: 'b', name: 'Zib', unknownName: true, clipHeard: false },
    { id: 'c', name: 'Lili', unknownName: true, clipHeard: true },
    { id: 'd', name: 'Ken', unknownName: false, clipHeard: false },
  ];
  it('finds invented names whose clip has arrived and was not heard yet', () => {
    expect(pendingMoonNames(herd, (k) => ['tamo', 'lili', 'ken'].includes(k))).toEqual(['a']);
  });
  it('plays Lumi, then the name, then records it', async () => {
    const f = fakeDeps({ names: ['tamo'] });
    await moonName(herd[0], f.deps);
    expect(f.said).toEqual(['lumi-moon-name', 'name:tamo!', 'foal-yay']);
    expect(f.actions).toEqual([{ type: 'name.clipHeard', baby: 'a' }]);
  });
});
```

`tests/heartbeat/line-coverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { heartbeatLines } from '../../src/core/heartbeat/lines.ts';

const root = new URL('../../src/', import.meta.url);
const files = [
  ...readdirSync(new URL('scenes/heartbeat/', root)).filter((f) => f.endsWith('.ts')).map((f) => new URL(`scenes/heartbeat/${f}`, root)),
  new URL('core/maths/eggs.ts', root),
  ...['Nest', 'Hatch', 'Naming', 'Wish', 'Stalls', 'Goodnight'].map((s) => new URL(`scenes/${s}.svelte`, root)),
];

describe('line coverage', () => {
  it('uses only line ids that heartbeatLines defines', () => {
    const ids = new Set(heartbeatLines().map((l) => l.id));
    const missing: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/'((?:g|fb|h|lumi|foal)-[a-z0-9-]+)'/g)) if (!ids.has(m[1])) missing.push(`${m[1]} in ${f.pathname.split('/src/')[1]}`);
    }
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/heartbeat/moon-name.test.ts tests/heartbeat/line-coverage.test.ts`
Expected: FAIL, cannot resolve `moon-name.ts`.

- [ ] **Step 3: Write `moon-name.ts`, `flow.svelte.ts`, `test-hooks.ts` and `Moonflowers.svelte`**

`src/scenes/heartbeat/moon-name.ts`:

```ts
import { nameKey } from '../../core/naming/check.ts';
import type { SceneDeps } from './deps.ts';

export function pendingMoonNames(herd: { id: string; name: string | null; unknownName: boolean; clipHeard: boolean }[], hasName: (k: string) => boolean): string[] {
  return herd.filter((b) => b.name && b.unknownName && !b.clipHeard && hasName(nameKey(b.name))).map((b) => b.id);
}

// Spec 2.8: Lumi: "The moon told me a new name!", Elizabeth says it for the first time, the baby jumps and gets a heart.
export async function moonName(baby: { id: string; name: string | null }, d: SceneDeps): Promise<void> {
  if (!baby.name) return;
  await d.audio.say('lumi-moon-name');
  await d.audio.sayName(nameKey(baby.name), '!');
  d.dispatch({ type: 'name.clipHeard', baby: baby.id });
  await d.audio.say('foal-yay');
}
```

C5 addition: on `name.clipHeard` the world fold sets that baby's `clipKey` to its lowercase name, sets `clipHeard`, and gives one heart.

`src/scenes/heartbeat/flow.svelte.ts`:

```ts
import { game } from '../../game.svelte.ts';
import { audio } from '../../audio/index.ts';
import { IDLE, type HbSignal, type HbState, step } from '../../core/heartbeat/flow.ts';
import { pendingMoonNames } from './moon-name.ts';

export const heartbeatHooks = { onMovedIn: [] as ((baby: string) => void)[] };

let state: HbState = IDLE;
let moonVisit = -1; // the visit in which the "moon told me" moment last played

function opts() {
  return { skipWishAfterThree: false }; // Task 29 reads the parent setting
}

function route(): void {
  switch (state.stage) {
    case 'egg-choice': game.go('egg-choice'); break;
    case 'egg': game.go('nest'); break;
    case 'naming': game.go('naming', { target: { kind: 'baby', baby: state.baby }, then: 'heartbeat' }); break;
    case 'wish': game.go('wish', { baby: state.baby, then: 'heartbeat' }); break;
    case 'move-in': game.go('stalls', { baby: state.baby, mode: 'move-in' }); break;
    case 'door-visit': break; // the stables scene runs the visit itself
    case 'done': {
      const pending = moonVisit === game.world.visitIndex ? [] : pendingMoonNames(game.world.herd, (k) => audio.hasName(k));
      if (pending.length) { moonVisit = game.world.visitIndex; game.go('stalls', { baby: pending[0], mode: 'moon-name' }); }
      else game.go('meadow');
    }
  }
}

function send(sig: HbSignal): void {
  state = step(state, sig, opts());
  route();
}

export const heartbeat = {
  get state(): HbState { return state; },
  start(): void {
    const unnamed = game.world.herd.find((b) => b.name === null);
    send({ s: 'start', unnamedBaby: unnamed?.id ?? null, offerChoice: false }); // Task 25 sets offerChoice
  },
  eggPicked(): void { send({ s: 'egg-picked' }); },
  hatched(baby: string): void { send({ s: 'hatched', baby }); },
  named(): void { send({ s: 'named' }); },
  wishDone(): void { send({ s: 'wish-done' }); },
  movedIn(baby: string, visit: boolean): void {
    for (const f of heartbeatHooks.onMovedIn) f(baby);
    send({ s: 'moved-in', visit });
  },
  visitDone(): void { send({ s: 'visit-done' }); },
  left(): void { state = step(state, { s: 'left' }, opts()); },
  noteOtherActivity(): void { state = step(state, { s: 'other-activity' }, opts()); },
  startWish(baby: string): void { game.go('wish', { baby, then: 'meadow' }); },
  startGoodnight(): void { game.go('goodnight'); },
  nameBaby(baby: string, onDone: () => void): void { game.go('naming', { target: { kind: 'baby', baby }, then: onDone }); },
  tapBaby(baby: string): boolean {
    if (!pendingMoonNames(game.world.herd, (k) => audio.hasName(k)).includes(baby)) return false;
    moonVisit = game.world.visitIndex;
    game.go('stalls', { baby, mode: 'moon-name' });
    return true;
  },
};
```

C13 additions: the meadow calls `heartbeat.left()` when Emma leaves a heartbeat scene by the meadow arrow, and `heartbeat.tapBaby(id)` when she taps a baby in the meadow (true means the moment took over).

`src/scenes/heartbeat/test-hooks.ts` (active only in test builds):

```ts
import { registerSceneHook } from '../../test-hook.ts';
import type { NestCtrl } from './nest.ctrl.ts';
import type { NamingCtrl } from './naming.ctrl.ts';
import type { WishCtrl } from './wish.ctrl.ts';
import type { StallsCtrl } from './stalls.ctrl.ts';
import type { GoodnightCtrl } from './goodnight.ctrl.ts';
import { heartbeat } from './flow.svelte.ts';

const active: Record<string, any> = {};
const errors: string[] = [];
let installed = false;

function install(): void {
  if (installed || import.meta.env.MODE !== 'test') return;
  installed = true;
  const orig = console.error.bind(console);
  console.error = (...a: unknown[]) => { errors.push(a.map(String).join(' ')); orig(...a); };
  window.addEventListener('error', (e) => errors.push(String(e.message)));
  (window as any).__hb = {
    start: () => heartbeat.start(), goodnight: () => heartbeat.startGoodnight(), state: () => heartbeat.state,
    errors: () => errors.slice(), lastNamed: () => (active.naming as NamingCtrl | undefined)?.named ?? null,
  };
  registerSceneHook('nest', {
    answer: async () => { const n = active.nest as { ctrl: NestCtrl; drop: (id: string, t: string) => Promise<void> }; for (const id of n.ctrl.answerIds()) await n.drop(id, 'nest'); return 'ok'; },
    wrong: async () => { const n = active.nest as { ctrl: NestCtrl }; const w = n.ctrl.wrongId(); return w ? n.ctrl.place(w) : 'none'; },
  });
  registerSceneHook('naming', {
    answer: async () => {
      const c = active.naming as NamingCtrl;
      if (c.mode === 'gold') { c.openGold(['T', 'a', 'm']); return c.goldSlide(); }
      if (c.mode === 'pick') await c.choose(c.bells[0].key);
      for (const m of c.answerMoves()) c.dropGem(m.slot, m.gem);
      return c.mode === 'done' ? 'right' : c.slide();
    },
    wrong: async () => {
      const c = active.naming as NamingCtrl;
      if (c.mode === 'pick') await c.choose(c.bells[0].key);
      for (const s of c.slots) if (s.slot.own) c.dropGem(s.slot.index, c.tray.find((g) => g.toLowerCase() !== s.slot.g.toLowerCase()) ?? 'z');
      return c.slide();
    },
    gold: async (gems: string[]) => { const c = active.naming as NamingCtrl; c.openGold(gems); return c.goldSlide(); },
    addSlot: () => (active.naming as NamingCtrl).addSlot(),
    removeSlot: (i: number) => (active.naming as NamingCtrl).removeSlot(i),
    mode: () => (active.naming as NamingCtrl).mode,
  });
  registerSceneHook('wish', {
    answer: async () => { const c = active.wish as WishCtrl; const k = c.answerKey(); if (!k) return 'none'; const r = c.task.kind === 'station' ? await c.toStation(k as any) : await c.give(k); if (r === 'next') { const k2 = c.answerKey(); if (k2) await c.give(k2); } return r; },
    wrong: async () => { const c = active.wish as WishCtrl; const k = c.wrongKey(); if (!k) return 'none'; return c.task.kind === 'station' ? c.toStation(k as any) : c.give(k); },
  });
  registerSceneHook('stalls', {
    answer: async () => { const c = active.stalls as StallsCtrl | undefined; return c && c.target !== null ? c.tapDoor(c.target) : 'no-visit'; },
    wrong: async () => { const c = active.stalls as StallsCtrl | undefined; const w = c?.wrongDoor(); return c && w ? c.tapDoor(w) : 'no-visit'; },
  });
  registerSceneHook('goodnight', {
    answer: async () => { const c = active.goodnight as GoodnightCtrl; const d = c.answerDoor(); return d ? c.tapDoor(d) : c.stage; },
    wrong: async () => { const c = active.goodnight as GoodnightCtrl; const d = c.wrongDoor(); return d ? c.tapDoor(d) : 'none'; },
    remaining: () => { const c = active.goodnight as GoodnightCtrl; return c.stage === 'rollcall' ? 'picks' : c.stage; },
  });
}

export function exposeCtrl(scene: string, ctrl: unknown): void {
  install();
  active[scene] = ctrl;
}
```

`src/scenes/heartbeat/Moonflowers.svelte`:

```svelte
<script lang="ts">
  import { moonflowerLayout } from '../../core/heartbeat/moonflowers.ts';
  import ArtImg from './ArtImg.svelte';
  let { count, seed = 42 }: { count: number; seed?: number } = $props();
  const patches = $derived(moonflowerLayout(count, seed));
  const HUES = ['#f5d9ff', '#ffe0ef', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf'];
</script>

<div class="flowers" aria-hidden="true">
  {#each patches as p, i (i)}
    <span class="patch d{p.density}" style:left="{p.x}px" style:top="{p.y}px" style:--tint={HUES[p.hue]}>
      {#each Array(p.density) as _, k}<span class="f" style:transform="translate({k * 16 - 16}px, {k % 2 ? -10 : 0}px)"><ArtImg id="moonflower" size={44} tint={HUES[p.hue]} /></span>{/each}
    </span>
  {/each}
</div>

<style>
  .flowers { position: absolute; inset: 0; pointer-events: none; }
  .patch { position: absolute; transform: translate(-50%, -50%); }
  .f { position: absolute; }
</style>
```

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run tests/heartbeat tests/naming`
Expected: PASS, including line coverage.

- [ ] **Step 5: Write the browser flows**

`flows/heartbeat.sh`:

```sh
#!/bin/sh
# Heartbeat flow at one viewport. Run outside the sandbox, from the repo root, after
#   (cd games/moon-meadow-home && npm run build:test)
#   MOON_DIST=dist-test-heartbeat PORT=8772 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts &
# Usage: sh games/moon-meadow-home/flows/heartbeat.sh 1180 820
set -eu
W=$1; H=$2; S="hb$W"
URL="${MMH_URL:-http://127.0.0.1:8772/games/moon-meadow-home/}"
SHOTS="${TMPDIR:-/tmp}/mmh-flows"; mkdir -p "$SHOTS"
pw() { playwright-cli -s="$S" "$@"; }
ev() { pw eval "$1"; }
fail() { echo "FAIL [$W x $H]: $1"; pw screenshot --filename="$SHOTS/fail-hb-$W.png" >/dev/null 2>&1 || true; pw close >/dev/null 2>&1 || true; exit 1; }
expect() { out=$(ev "$1"); echo "$out" | grep -q -- "$2" || fail "$1 gave: $out (wanted $2)"; }
wait_scene() {
  ev "() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { const s = window.__game.state().scene; if (s === '$1') { clearInterval(t); ok('at $1'); } else if (Date.now() - t0 > 10000) { clearInterval(t); no(new Error('stuck at ' + s)); } }, 50); })" >/dev/null || fail "scene $1 never came"
}
tap() {
  xy=$(ev "() => { const e = document.querySelector('[aria-label=\"$1\"]'); if (!e) return 'XY none'; const r = e.getBoundingClientRect(); return 'XY ' + Math.round(r.x + r.width / 2) + ' ' + Math.round(r.y + r.height / 2); }" | grep -o 'XY [0-9]* [0-9]*' | tail -1 | cut -d' ' -f2-)
  [ -n "$xy" ] || fail "no element $1"
  pw mousemove $xy >/dev/null; pw mousedown >/dev/null; pw mouseup >/dev/null
}
small_targets() { expect "() => 'small:' + [...document.querySelectorAll('[data-touch]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 54 || r.height < 54); }).map((e) => e.getAttribute('aria-label')).join(',') + ':end'" "small::end"; }

pw delete-data >/dev/null 2>&1 || true
pw open "$URL" >/dev/null
pw resize "$W" "$H" >/dev/null
ev "() => { window.__game.seed(7); window.__game.fast(true); window.__game.mute(true); return 'ready'; }" >/dev/null
tap play

beat() { # $1 maths step, $2 egg mistake yes/no, $3 wish mistake yes/no
  ev "() => { window.__game.setStep('m', '$1'); window.__hb.start(); return 'ok'; }" >/dev/null
  wait_scene nest
  small_targets
  pw screenshot --filename="$SHOTS/nest-$1-$W.png" >/dev/null
  if [ "$2" = yes ]; then ev "() => window.__game.wrong()" >/dev/null; fi
  ev "() => window.__game.answer()" >/dev/null
  expect "() => 'log ' + window.__game.state().lastLog?.strand + ' ' + window.__game.state().lastLog?.step" "log m $1"
  wait_scene naming
  small_targets
  ev "() => window.__game.answer()" >/dev/null
  wait_scene wish
  small_targets
  if [ "$3" = yes ]; then ev "() => window.__game.wrong()" >/dev/null; fi
  ev "() => window.__game.answer()" >/dev/null
  expect "() => 'log ' + window.__game.state().lastLog?.strand" "log r"
  wait_scene stalls
  ev "() => window.__game.answer()" >/dev/null
  wait_scene meadow
}

beat M01 no no
beat M02 no yes
beat M05 no no
beat M09 yes no
beat M10 yes no
beat M11 no no
beat M12 no yes
expect "() => 'herd ' + window.__game.state().herd" "herd 7"

ev "() => { window.__hb.goodnight(); return 'ok'; }" >/dev/null
wait_scene goodnight
pw screenshot --filename="$SHOTS/goodnight-$W.png" >/dev/null
for i in 1 2 3; do
  st=$(ev "() => window.__game.scene.remaining()")
  echo "$st" | grep -q picks || break
  ev "() => window.__game.answer()" >/dev/null
done

expect "() => 'missing ' + window.EmmaAudio.missing.length" "missing 0"
expect "() => 'errors ' + window.__hb.errors().length" "errors 0"
pw close >/dev/null
echo "heartbeat flow passed at $W x $H"
```

`flows/naming.sh`:

```sh
#!/bin/sh
# Naming flow at one viewport (same setup as heartbeat.sh).
set -eu
W=$1; H=$2; S="nm$W"
URL="${MMH_URL:-http://127.0.0.1:8772/games/moon-meadow-home/}"
SHOTS="${TMPDIR:-/tmp}/mmh-flows"; mkdir -p "$SHOTS"
pw() { playwright-cli -s="$S" "$@"; }
ev() { pw eval "$1"; }
fail() { echo "FAIL [$W x $H]: $1"; pw screenshot --filename="$SHOTS/fail-nm-$W.png" >/dev/null 2>&1 || true; pw close >/dev/null 2>&1 || true; exit 1; }
expect() { out=$(ev "$1"); echo "$out" | grep -q -- "$2" || fail "$1 gave: $out (wanted $2)"; }
wait_scene() {
  ev "() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { const s = window.__game.state().scene; if (s === '$1') { clearInterval(t); ok('at $1'); } else if (Date.now() - t0 > 10000) { clearInterval(t); no(new Error('stuck at ' + s)); } }, 50); })" >/dev/null || fail "scene $1 never came"
}
to_naming() {
  ev "() => { window.__game.setStep('m', 'M09'); window.__hb.start(); return 'ok'; }" >/dev/null
  wait_scene nest
  ev "() => window.__game.answer()" >/dev/null
  wait_scene naming
}
finish_beat() {
  wait_scene wish; ev "() => window.__game.answer()" >/dev/null
  wait_scene stalls; ev "() => window.__game.answer()" >/dev/null
  wait_scene meadow
}

pw delete-data >/dev/null 2>&1 || true
pw open "$URL" >/dev/null
pw resize "$W" "$H" >/dev/null
ev "() => { window.__game.seed(11); window.__game.fast(true); window.__game.mute(true); return 'ready'; }" >/dev/null
xy=$(ev "() => { const r = document.querySelector('[aria-label=\"play\"]').getBoundingClientRect(); return 'XY ' + Math.round(r.x + r.width / 2) + ' ' + Math.round(r.y + r.height / 2); }" | grep -o 'XY [0-9]* [0-9]*' | tail -1 | cut -d' ' -f2-)
pw mousemove $xy >/dev/null; pw mousedown >/dev/null; pw mouseup >/dev/null

to_naming
expect "() => window.__game.scene.gold(['t','m','n'])" "no-vowel"
expect "() => window.__game.scene.gold(['f','u','k'])" "blocked"
expect "() => 'add ' + [1,2,3,4,5].map(() => window.__game.scene.addSlot()).join(',')" "add true,true,true,true,true"
expect "() => 'add6 ' + window.__game.scene.addSlot()" "add6 false"
expect "() => 'slot8 ' + !!document.querySelector('[aria-label=\"slot 8\"]') + ' plus ' + !!document.querySelector('[aria-label=\"add slot\"]')" "slot8 true plus false"
expect "() => 'rm ' + window.__game.scene.removeSlot(7)" "rm true"
pw screenshot --filename="$SHOTS/gold-$W.png" >/dev/null
expect "() => window.__game.scene.gold(['T','a','m','o','b','e','l'])" "unknown"
expect "() => JSON.stringify(window.__hb.lastNamed())" '"name":"Tamobel"'
finish_beat

to_naming
expect "() => window.__game.scene.gold(['T','a','m','o','b','e','l'])" "unknown"
expect "() => 'ordinal ' + window.__hb.lastNamed().ordinal" "ordinal 2"
finish_beat

to_naming
expect "() => window.__game.scene.gold(['L','i','l','i'])" "list"
expect "() => JSON.stringify(window.__hb.lastNamed())" '"clipKey":"lily"'
finish_beat

to_naming
ev "() => window.__game.wrong()" >/dev/null
expect "() => 'mode ' + window.__game.scene.mode()" "mode spell"
ev "() => window.__game.answer()" >/dev/null
expect "() => 'log ' + window.__game.state().lastLog?.strand + ' ' + window.__game.state().lastLog?.result" "log s miss"
finish_beat

expect "() => 'missing ' + window.EmmaAudio.missing.length" "missing 0"
expect "() => 'errors ' + window.__hb.errors().length" "errors 0"
pw close >/dev/null
echo "naming flow passed at $W x $H"
```

`flows/run-heartbeat-all.sh`:

```sh
#!/bin/sh
# Runs the heartbeat and naming flows at every iPad size, then the portrait check. Outside the sandbox.
set -eu
D=$(dirname "$0")
for vp in "1180 820" "1080 810" "1024 768"; do
  sh "$D/heartbeat.sh" $vp
  sh "$D/naming.sh" $vp
done
S=hbp
playwright-cli -s=$S delete-data >/dev/null 2>&1 || true
playwright-cli -s=$S open "${MMH_URL:-http://127.0.0.1:8772/games/moon-meadow-home/}" >/dev/null
playwright-cli -s=$S resize 820 1180 >/dev/null
out=$(playwright-cli -s=$S eval "() => 'turn ' + !!document.querySelector('[aria-label=\"turn the iPad\"]')")
playwright-cli -s=$S screenshot --filename="${TMPDIR:-/tmp}/mmh-flows/portrait.png" >/dev/null
playwright-cli -s=$S close >/dev/null
echo "$out" | grep -q 'turn true' || { echo 'FAIL: portrait shows no turn picture'; exit 1; }
echo 'All heartbeat flows passed.'
```

- [ ] **Step 6: Build and run the flows (outside the sandbox)**

```bash
cd /Users/tjitse/sites/emmas-game/games/moon-meadow-home && npm run build:test
cd /Users/tjitse/sites/emmas-game && MOON_DIST=dist-test-heartbeat PORT=8772 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts &
sh games/moon-meadow-home/flows/run-heartbeat-all.sh
```

Expected: `All heartbeat flows passed.` Screenshots land in `$TMPDIR/mmh-flows/`, outside the repo. Look at the nest, gold bell and goodnight screenshots at 1024 x 768: nothing cut off, no overlap between tray and slots.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/heartbeat/flow.svelte.ts src/scenes/heartbeat/moon-name.ts src/scenes/heartbeat/test-hooks.ts src/scenes/heartbeat/Moonflowers.svelte flows/heartbeat/heartbeat.flow.sh flows/heartbeat/naming.flow.sh tests/heartbeat/moon-name.test.ts tests/heartbeat/line-coverage.test.ts
git commit -m "Wire the heartbeat flow, the moon's new names, test hooks and browser flows"
```

**Acceptance:** all Vitest suites in `tests/heartbeat` and `tests/naming` pass; `npm run check` has no errors in this workstream's files; `run-heartbeat-all.sh` passes at 1180 x 820, 1080 x 810 and 1024 x 768 with no missing clips and no console errors; portrait shows the turn picture; every egg kind of wave A was played; gold-bell no vowel, blocked, unknown (7 gems), list (Lili), duplicate, adding and removing slots all behave as spec 2.8.

---

### Task 23B: Meadow life, care free play and the parts PLACES uses

The meadow hub is PLACES' scene, but it mounts the heartbeat's living layer: the nest, up to 12 babies and care free play (spec 2.5 "Care stations ... Brush, cuddle, treats, tricks, splash", spec 2.7 "at most 12 on screen"). PLACES also calls a few heartbeat helpers. This task provides them with the signatures below; the reconciliation table in Contracts lists where they differ from places.md's guesses.

**Files:**
- Create: `src/core/heartbeat/meadow.ts`, `src/core/eggs/breed.ts`, `src/core/eggs/index.ts`, `src/core/phonics/tray.ts`, `src/core/naming/review.ts`, `src/scenes/heartbeat/MeadowLife.svelte`, `src/scenes/heartbeat/HatchAndName.svelte`
- Modify: `src/core/heartbeat/hatch.ts` (`rollBuildingHatch`), `src/core/actions/heartbeat.ts` (`hb.building.hatched`)
- Test: `tests/heartbeat/meadow.test.ts`

**Interfaces:**
- Consumes: Tasks 4, 7, 8, 11, 13, 15, 17, 19, 23; LEARN's `content` from `src/core/content/static.ts` and `currentStep(l, c, strand)`; art ids `item-brush`, `item-treat`, `item-heart` (C12 addition; the fallback draws a round badge).
- Produces:

```ts
// meadow.ts
export const MEADOW_MAX = 12;
export type CareTool = 'brush' | 'treat' | 'heart';
export const CARE_OF_TOOL: Record<CareTool, CareKind>;
export const FOAL_LINE: Record<CareKind, string>;
export function meadowBabies<T extends { id: string; order: number; favourite?: boolean }>(herd: T[], max?: number): T[];
// eggs/breed.ts and eggs/index.ts
export function breedForStep(step: string | null): BreedId;
export function currentEggBreed(world: unknown, learner: unknown): BreedId;
// phonics/tray.ts
export function ownSlots(graphemes: string[], ctx: SpellCtx): boolean[];
export function planTray(graphemes: string[], ctx: SpellCtx, scaffold: Scaffold, rng: Rng, blocked?: (gems: string[]) => boolean): string[];
// naming/review.ts
export function canReviewName(baby: { nameGems: string[] }, readable: Set<string>, firsts: number): boolean;
// hatch.ts
export function rollBuildingHatch(breed: BreedId, rng: Rng): HatchRoll;
// actions: { type: 'hb.building.hatched'; baby: string; roll: HatchRoll; plot: string } -> egg.hatched with kind null and source 'building'
// MeadowLife.svelte props: { onbabytouch?: (id: string) => void; ribbonMode?: boolean; ribbons?: Record<string, boolean>; ontieribbon?: (id: string) => void }
// HatchAndName.svelte props: { breed: BreedId; source?: 'building'; plot: string; ondone: (babyId: string) => void }
```

PLACES' row naming uses `<Naming target={{ kind: 'row', row }} onnamed={(n) => ...} />` from `src/scenes/Naming.svelte` (Task 19) and reads `n.name`; places.md's `{ purpose, onnamed(name) }` guess maps to that.

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/meadow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CARE_OF_TOOL, FOAL_LINE, MEADOW_MAX, meadowBabies } from '../../src/core/heartbeat/meadow.ts';
import { breedForStep } from '../../src/core/eggs/breed.ts';
import { ownSlots, planTray } from '../../src/core/phonics/tray.ts';
import { canReviewName } from '../../src/core/naming/review.ts';
import { rollBuildingHatch } from '../../src/core/heartbeat/hatch.ts';
import { applyHeartbeat } from '../../src/core/actions/heartbeat.ts';
import { heartbeatLines } from '../../src/core/heartbeat/lines.ts';
import { makeRng } from '../../src/core/rng.ts';
import { ctxAt } from '../naming/fixtures.ts';

describe('meadow life', () => {
  it('shows favourites first, then the newest, at most twelve', () => {
    const herd = Array.from({ length: 20 }, (_, i) => ({ id: `b${i + 1}`, order: i + 1, favourite: i === 2 }));
    const m = meadowBabies(herd);
    expect(m).toHaveLength(MEADOW_MAX);
    expect(m[0].id).toBe('b3');
    expect(m[1].id).toBe('b20');
  });
  it('maps care tools to care kinds and every kind to a baby line', () => {
    expect(CARE_OF_TOOL).toEqual({ brush: 'brush', treat: 'treat', heart: 'cuddle' });
    const ids = new Set(heartbeatLines().map((l) => l.id));
    for (const id of Object.values(FOAL_LINE)) expect(ids.has(id)).toBe(true);
  });
});

describe('parts for places', () => {
  it('gives the breed of the current egg step', () => {
    expect(breedForStep('M10')).toBe('pebble');
    expect(breedForStep('M03')).toBe('moon');
    expect(breedForStep(null)).toBe('moon');
  });
  it('marks own slots and plans a tray from plain graphemes', () => {
    const ctx = ctxAt('S12', ['S02', 'S03', 'S04']);
    expect(ownSlots(['f', 'o', 'x'], ctx)).toEqual([true, true, true]);
    expect(ownSlots(['b', 'ee'], ctxAt('S03', ['S02']))).toEqual([false, false]);
    const tray = planTray(['h', 'a', 't'], ctx, 1, makeRng(1));
    expect(tray).toEqual(expect.arrayContaining(['h', 'a', 't']));
    expect(tray).toHaveLength(5);
  });
  it('allows name review for decodable names or names read before', () => {
    expect(canReviewName({ nameGems: ['T', 'a', 'm'] }, new Set(['t', 'a', 'm']), 0)).toBe(true);
    expect(canReviewName({ nameGems: ['L', 'i', 'l', 'y'] }, new Set(['l', 'i']), 0)).toBe(false);
  });
  it('hatches a building baby of the building breed without a learning result', () => {
    const roll = rollBuildingHatch('bubble', makeRng(2));
    expect(roll.breed).toBe('bubble');
    expect(roll.traits.shiny).toBeUndefined();
    expect(applyHeartbeat({ type: 'hb.building.hatched', baby: 'b9', roll, plot: 'bath-pond' }))
      .toEqual([{ type: 'egg.hatched', baby: 'b9', kind: null, breed: 'bubble', colours: roll.colours, traits: roll.traits, source: 'building' }]);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/meadow.test.ts`
Expected: FAIL, cannot resolve `meadow.ts`.

- [ ] **Step 3: Write the logic**

`src/core/heartbeat/meadow.ts`:

```ts
import type { CareKind } from './types.ts';

export const MEADOW_MAX = 12; // spec 2.7 and 5.2: the meadow animates at most 12 babies
export type CareTool = 'brush' | 'treat' | 'heart';
export const CARE_OF_TOOL: Record<CareTool, CareKind> = { brush: 'brush', treat: 'treat', heart: 'cuddle' };
export const FOAL_LINE: Record<CareKind, string> = {
  brush: 'foal-cuddle', treat: 'foal-yum', cuddle: 'foal-cuddle', trick: 'foal-wee', splash: 'foal-wee', station: 'foal-wee', rollcall: 'foal-yawn',
};

export function meadowBabies<T extends { id: string; order: number; favourite?: boolean }>(herd: T[], max = MEADOW_MAX): T[] {
  const newest = (a: T, b: T) => b.order - a.order;
  return [...herd.filter((b) => b.favourite).sort(newest), ...herd.filter((b) => !b.favourite).sort(newest)].slice(0, max);
}
```

`src/core/eggs/breed.ts`:

```ts
import { eggKindFor } from '../maths/eggs.ts';
import { BREED_OF } from '../heartbeat/hatch.ts';
import type { BreedId } from '../heartbeat/types.ts';

export function breedForStep(step: string | null): BreedId {
  const k = step ? eggKindFor(step) : null;
  return k ? BREED_OF[k] : 'moon';
}
```

`src/core/eggs/index.ts`:

```ts
import { content } from '../content/static.ts';
import { currentStep } from '../learning/index.ts';
import type { BreedId } from '../heartbeat/types.ts';
import { breedForStep } from './breed.ts';

export { breedForStep };
// The herd circle of a row Building Day hatches a baby of her current egg kind (spec 2.4).
export function currentEggBreed(_world: unknown, learner: unknown): BreedId {
  return breedForStep(currentStep(learner as never, content, 'm'));
}
```

`src/core/phonics/tray.ts`:

```ts
import type { Rng } from '../rng.ts';
import type { Scaffold } from '../heartbeat/types.ts';
import { giftSlots, type SpellCtx } from '../naming/gifts.ts';
import { usualSound } from '../naming/sounds.ts';
import { planNameTray } from '../naming/tray.ts';

const split = (graphemes: string[]) => graphemes.map((g) => ({ g, ph: usualSound(g) ?? [] }));

export function ownSlots(graphemes: string[], ctx: SpellCtx): boolean[] {
  return giftSlots(split(graphemes), ctx).map((s) => s.own);
}

export function planTray(graphemes: string[], ctx: SpellCtx, scaffold: Scaffold, rng: Rng, blocked: (gems: string[]) => boolean = () => false): string[] {
  return planNameTray({ slots: giftSlots(split(graphemes), ctx), scaffold, ctx, blocked, rng });
}
```

`src/core/naming/review.ts`:

```ts
import { nameEligible } from '../heartbeat/rollcall.ts';

export function canReviewName(baby: { nameGems: string[] }, readable: Set<string>, firsts: number): boolean {
  return nameEligible(baby.nameGems, readable, firsts);
}
```

Add to `hatch.ts`:

```ts
// Building eggs bring one breed each (spec 2.6). A building baby is not a checked hatch, so it is never shiny.
export function rollBuildingHatch(breed: BreedId, rng: Rng): HatchRoll {
  const r = rollHatch({ kind: 'moon', result: 'miss', golden: false, speckled: false, rng });
  return { ...r, breed };
}
```

Add to `HbAction` in `src/core/actions/heartbeat.ts` `| { type: 'hb.building.hatched'; baby: string; roll: HatchRoll; plot: string }` and the case:

```ts
    case 'hb.building.hatched':
      return [{ type: 'egg.hatched', baby: a.baby, kind: null, breed: a.roll.breed, colours: a.roll.colours, traits: a.roll.traits, source: 'building' }];
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/heartbeat/meadow.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `MeadowLife.svelte` and `HatchAndName.svelte`**

`src/scenes/heartbeat/MeadowLife.svelte`:

```svelte
<script lang="ts">
  import { game } from '../../game.svelte.ts';
  import { audio } from '../../audio/index.ts';
  import { CARE_OF_TOOL, FOAL_LINE, meadowBabies, type CareTool } from '../../core/heartbeat/meadow.ts';
  import { heartbeat } from './flow.svelte.ts';
  import { draggable } from '../../ui/drag.ts';
  import Unicorn from '../../art/Unicorn.svelte';
  import ArtImg from './ArtImg.svelte';
  import Moonflowers from './Moonflowers.svelte';

  let { onbabytouch, ribbonMode = false, ribbons = {}, ontieribbon }:
    { onbabytouch?: (id: string) => void; ribbonMode?: boolean; ribbons?: Record<string, boolean>; ontieribbon?: (id: string) => void } = $props();
  const SPOTS: [number, number][] = [[300, 420], [700, 410], [880, 400], [420, 600], [640, 600], [1010, 470], [180, 400], [290, 240], [480, 240], [690, 240], [880, 230], [1010, 240]];
  const TOOLS: CareTool[] = ['brush', 'treat', 'heart'];
  const babies = $derived(meadowBabies(game.world.herd));
  const babyEls: Record<string, HTMLElement> = {};
  let trick = $state<string | null>(null);
  const targets = () => babies.map((b) => ({ id: b.id, el: babyEls[b.id] })).filter((t) => t.el);

  function tapBaby(id: string) {
    if (ribbonMode) { ontieribbon?.(id); return; }
    if (heartbeat.tapBaby(id)) return; // the moon's new name takes over
    trick = id;
    setTimeout(() => (trick = null), 900);
    game.dispatch({ type: 'hb.care', baby: id, kind: 'trick' });
    void audio.say(FOAL_LINE.trick);
    onbabytouch?.(id);
  }
  function care(tool: CareTool, id: string | null) {
    if (!id) return;
    const kind = CARE_OF_TOOL[tool];
    game.dispatch({ type: 'hb.care', baby: id, kind }); // the world fold caps care hearts at one per baby per visit
    void audio.say(FOAL_LINE[kind]);
  }
</script>

<div class="life">
  <Moonflowers count={game.world.flowers} />
  <button class="nest" data-touch aria-label="nest" onpointerup={() => { heartbeat.noteOtherActivity(); heartbeat.start(); }}>
    <ArtImg id="nest" size={180} /><span class="egg"><ArtImg id="egg-moon" size={110} /></span>
  </button>
  {#each babies as b, i (b.id)}
    <button class="baby" class:trick={trick === b.id} data-touch aria-label="baby {b.name ?? 'new'}" bind:this={babyEls[b.id]}
      style:left="{SPOTS[i][0]}px" style:top="{SPOTS[i][1]}px" onpointerup={() => tapBaby(b.id)}>
      <Unicorn baby={b} pose="stand" size={130} />
      {#if ribbons[b.id]}<span class="ribbon" aria-hidden="true"></span>{/if}
    </button>
  {/each}
  <div class="tools">
    {#each TOOLS as t}
      <span class="tool" data-touch aria-label="tool {t}" use:draggable={{ targets, ondrop: (id) => care(t, id) }}><ArtImg id="tool-{t}" size={88} /></span>
    {/each}
  </div>
</div>

<style>
  .life { position: absolute; inset: 0; touch-action: none; }
  .nest { position: absolute; left: 470px; top: 520px; width: 200px; height: 170px; background: none; border: 0; }
  .nest .egg { position: absolute; left: 45px; top: -30px; animation: glow 2s ease-in-out infinite; }
  .baby { position: absolute; width: 140px; height: 150px; background: none; border: 0; transform: translate(-50%, -50%); }
  .baby.trick { animation: hop 0.45s 2; }
  .ribbon { position: absolute; right: 10px; top: 20px; width: 28px; height: 28px; border-radius: 50%; background: #ff7fbf; border: 3px solid #e0559c; }
  .tools { position: absolute; left: 24px; bottom: 24px; display: flex; gap: 16px; }
  .tool { width: 96px; height: 96px; display: grid; place-items: center; background: #fff; border: 4px solid #c9b8ff; border-radius: 28px; touch-action: none; }
  @keyframes hop { 50% { transform: translate(-50%, -62%) rotate(-8deg); } }
  @keyframes glow { 50% { transform: scale(1.06); } }
</style>
```

`src/scenes/heartbeat/HatchAndName.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from '../../game.svelte.ts';
  import { audio } from '../../audio/index.ts';
  import { rollBuildingHatch } from '../../core/heartbeat/hatch.ts';
  import type { BreedId } from '../../core/heartbeat/types.ts';
  import { liveDeps } from './deps.ts';
  import Naming from '../Naming.svelte';
  import ArtImg from './ArtImg.svelte';

  let { breed, source = 'building', plot, ondone }: { breed: BreedId; source?: 'building'; plot: string; ondone: (babyId: string) => void } = $props();
  const deps = liveDeps({ place: 'building', strand: 's' });
  const babyId = deps.uuid();
  let phase = $state<'hatch' | 'name'>('hatch');
  onMount(async () => {
    game.dispatch({ type: 'hb.building.hatched', baby: babyId, roll: rollBuildingHatch(breed, deps.rng), plot });
    await audio.say('lumi-hatching');
    await audio.sfx('hatch');
    await audio.sfx('fanfare');
    await audio.say('lumi-baby');
    phase = 'name';
  });
</script>

{#if phase === 'hatch'}
  <div class="circle" aria-label="herd circle"><span class="egg"><ArtImg id="egg-moon" size={220} /></span></div>
{:else}
  <Naming target={{ kind: 'baby', baby: babyId }} onnamed={() => ondone(babyId)} />
{/if}

<style>
  .circle { position: absolute; inset: 0; display: grid; place-items: center; }
  .egg { animation: wob 0.45s infinite; }
  @keyframes wob { 50% { transform: rotate(5deg); } }
</style>
```

`source` is accepted for PLACES' call site and is always `'building'`.

- [ ] **Step 6: Type check and test**

Run: `npx vitest run tests/heartbeat && npm run check`
Expected: PASS; no type errors in this task's files.

- [ ] **Step 7: Commit**

```bash
git add src/core/heartbeat/meadow.ts src/core/eggs/breed.ts src/core/eggs/index.ts src/core/phonics/tray.ts src/core/naming/review.ts src/core/heartbeat/hatch.ts src/core/actions/heartbeat.ts src/scenes/heartbeat/MeadowLife.svelte src/scenes/heartbeat/HatchAndName.svelte tests/heartbeat/meadow.test.ts
git commit -m "Add meadow life with care free play, and the hatch, tray and review helpers places uses"
```

**Acceptance:** tests pass; in the meadow (PLACES' scene with `MeadowLife` mounted) a tap on the nest starts the heartbeat, a tap on a baby plays a trick, dragging the brush, a treat or the heart onto a baby gives a care act, and never more than 12 babies are drawn.

---

## Wave B: release 1.1 (item 16: golden, berry and snow eggs) plus phrase wishes

Start only when Wave A's acceptance holds. Wave B also loads the wish steps R12, R27, R28 and R29 (spec 3.9), because the wish is this workstream's place.

### Task 24: Berry and snow eggs

**Files:**
- Modify: `src/core/maths/eggs.ts` (`buildEggTask`, `goalLines`, `focusedHintLines`), `src/core/heartbeat/lines.ts` (seven new fixed lines), `src/core/heartbeat/places.ts` (`BUILT_WAVE = 'B'`), `src/scenes/heartbeat/nest.ctrl.ts` (`view().warmNow` for snow), `src/scenes/Nest.svelte` (bowls and the snow nest), `content/lines/heartbeat.json` (regenerated)
- Test: `tests/heartbeat/eggs-b.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3, 18.
- Produces: `buildEggTask` serves M04 (`A+1`, `A-1`), M13 (`A+B`) and M14 (`A-B`). New line ids: `g-berry-bowl`, `fb-one-more-berry`, `fb-one-less-berry`, `g-berry-bowls`, `g-snow`, `h-berries`, `h-snow`. LEARN's registry reads `placesUpTo(BUILT_WAVE)`, so the nest starts serving M04, M13 and M14 when this task lands.

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/eggs-b.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildEggTask, focusedHintLines, goalLines, missLines, successLines } from '../../src/core/maths/eggs.ts';
import { planStones } from '../../src/core/maths/stones.ts';
import { heartbeatLines } from '../../src/core/heartbeat/lines.ts';
import { NestCtrl } from '../../src/scenes/heartbeat/nest.ctrl.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { fakeDeps } from './fakes.ts';

const served = (step: string, id: string, scaffold: 1 | 2 | 3 = 1): Served =>
  ({ strand: 'm', step, id, carrier: '', items: [id], scaffold, probe: false, source: 'current' });

describe('berry eggs', () => {
  it('wants one more or one less berry (M04)', () => {
    expect(buildEggTask(served('M04', '6+1'))).toMatchObject({ kind: 'berry', mode: 'berry-more-less', shown: 6, moreLess: 1, target: 7 });
    expect(buildEggTask(served('M04', '6-1'))).toMatchObject({ moreLess: -1, target: 5 });
    expect(goalLines(buildEggTask(served('M04', '6-1')), false)).toEqual(['g-berry-bowl', 'fb-one-less-berry']);
    expect(() => buildEggTask(served('M04', '6+2'))).toThrow();
  });
  it('tips two bowls in and counts on (M13)', () => {
    const t = buildEggTask(served('M13', '5+3'));
    expect(t).toMatchObject({ mode: 'berry-bowls', bowls: [5, 3], shown: 8, target: 8 });
    expect(goalLines(t, false)).toEqual(['g-berry-bowls']);
    expect(focusedHintLines(t, [])).toEqual(['h-berries', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5']);
    expect(successLines(t, [8])).toEqual(['fb-lovely', 'num-8']);
    expect(missLines(t, -1)).toEqual(['num-more-1']);
  });
});

describe('snow eggs (M14)', () => {
  const t = buildEggTask(served('M14', '8-3', 3));
  it('keeps a nest of five with eight warm cups and wants the snow stone three', () => {
    expect(t).toMatchObject({ kind: 'snow', mode: 'snow', cups: 5, warm: 8, target: 3 });
    expect(goalLines(t, false)).toEqual(['num-warm-8', 'g-snow']);
    expect(missLines(t, 2)).toEqual(['fb-brr', 'num-over-2']);
    expect(missLines(t, -1)).toEqual(['fb-hot', 'num-more-1']);
  });
  it('never offers a snow stone bigger than the warm cups', () => {
    for (let seed = 1; seed <= 20; seed++) for (const s of planStones(t, makeRng(seed))) expect(s.value).toBeLessThanOrEqual(8);
  });
  it('cools the cups in the nest view', async () => {
    const f = fakeDeps();
    const c = new NestCtrl(served('M14', '8-3'), f.deps, { golden: false, speckled: false, firstEver: false });
    expect(c.view().warmNow).toBe(8);
    await c.begin();
    await c.place(c.answerIds()[0]);
    expect(c.view().warmNow).toBe(5);
  });
});

describe('new lines', () => {
  it('exist', () => {
    const ids = new Set(heartbeatLines().map((l) => l.id));
    for (const id of ['g-berry-bowl', 'fb-one-more-berry', 'fb-one-less-berry', 'g-berry-bowls', 'g-snow', 'h-berries', 'h-snow']) expect(ids.has(id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/eggs-b.test.ts`
Expected: FAIL with "No egg kind" or "does not fit" errors.

- [ ] **Step 3: Implement**

In `buildEggTask` add these cases before the final `throw`:

```ts
    case 'M04':
      if ((it.op === 'add' || it.op === 'take') && it.b === 1) {
        const ml: 1 | -1 = it.op === 'add' ? 1 : -1;
        return { ...base, mode: 'berry-more-less', shown: it.a, moreLess: ml, target: it.a + ml };
      }
      break;
    case 'M13': if (it.op === 'add') return { ...base, mode: 'berry-bowls', bowls: [it.a, it.b], shown: it.a + it.b, target: it.a + it.b }; break;
    case 'M14': if (it.op === 'take' && it.b < it.a) return { ...base, mode: 'snow', cups: it.a - it.b, warm: it.a, target: it.b }; break;
```

In `goalLines` replace the `default` branch with:

```ts
    case 'berry-more-less': return ['g-berry-bowl', task.moreLess === 1 ? 'fb-one-more-berry' : 'fb-one-less-berry'];
    case 'berry-bowls': return ['g-berry-bowls'];
    case 'snow': return [lineId.warm(task.warm), 'g-snow'];
```

In `focusedHintLines` replace the `default` branch with:

```ts
    case 'berry-more-less': return ['h-berries', ...counting(task.shown)];
    case 'berry-bowls': return ['h-berries', ...counting(Math.max(...(task.bowls ?? [0])))]; // count the bigger bowl, then she counts on
    case 'snow': return ['h-snow', ...counting(task.cups)];
```

Add to `FIXED` in `lines.ts`:

```ts
  { id: 'g-berry-bowl', speaker: 'narrator', text: 'Look at the berries in the bowl.', tier: 1 },
  { id: 'fb-one-more-berry', speaker: 'narrator', text: 'The egg wants one more berry!', tier: 1 },
  { id: 'fb-one-less-berry', speaker: 'narrator', text: 'The egg wants one less berry!', tier: 1 },
  { id: 'g-berry-bowls', speaker: 'narrator', text: 'The bowls tip into the egg. Drag the stone that shows how many berries.', tier: 1 },
  { id: 'g-snow', speaker: 'narrator', text: 'Too warm! Drag the snow stone that cools the extra cups.', tier: 1 },
  { id: 'h-berries', speaker: 'narrator', text: "Let's count the berries.", tier: 1 },
  { id: 'h-snow', speaker: 'narrator', text: "Let's count the cups in the nest.", tier: 1 },
```

In `places.ts` set `export let BUILT_WAVE: Wave = 'B';`.

In `NestCtrl.view()` replace the `warmNow` expression with:

```ts
const sum = this.placed.reduce((n, s) => n + s.value, 0);
// ...
warmNow: this.task.mode === 'snow' ? this.task.warm - sum : this.task.warm + sum,
```

In `Nest.svelte` add, after the cups block:

```svelte
  {#if t.mode === 'berry-more-less' || t.mode === 'berry-bowls'}
    <div class="bowls" class:tipped={view.solved}>
      {#each t.bowls ?? [t.shown] as n, k}
        <span class="bowl" aria-label="bowl {k + 1}">{#each Array(n) as _, j}<i class="berry" style:--j={j}></i>{/each}</span>
      {/each}
    </div>
  {/if}
  {#if t.mode === 'snow' && view.warmNow > t.cups}
    <span class="extra-steam" aria-label="extra warm cups"></span>
  {/if}
```

with styles: `.bowls { position: absolute; left: 160px; top: 470px; display: flex; gap: 40px; }`, `.bowl { width: 220px; height: 110px; border-radius: 0 0 110px 110px; background: #fff3e0; border: 4px solid #d6a93f; display: flex; flex-wrap: wrap; gap: 6px; padding: 14px; }`, `.berry { width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 30% 25%, #fff8 0 15%, #e0447a 16%); }`, `.tipped { transform: translateY(-120px) rotate(-30deg); opacity: 0; transition: transform 0.8s, opacity 0.8s; }`, `.extra-steam { position: absolute; left: 700px; top: 470px; width: 140px; height: 110px; border-radius: 60px; background: radial-gradient(#fff, #fff0); animation: puff 1.4s ease-in-out infinite; }`, `@keyframes puff { 50% { transform: scale(1.1); opacity: 0.7; } }`. In snow mode the cups grid shows `t.cups` cups, all warm while `warmNow >= t.cups`; the extra warm cups stay hidden in the steam, so Emma works from the spoken count ("Eight cups are warm already.") and the nest size.

- [ ] **Step 4: Regenerate lines and run the tests**

Run: `npm run lines:heartbeat && npx vitest run tests/heartbeat`
Expected: PASS, including line coverage.

- [ ] **Step 5: Flow check (outside the sandbox)**

Add `beat M04 no no`, `beat M13 yes no` and `beat M14 no no` to a new `flows/heartbeat/eggs-b.flow.sh` (a copy of the egg part of `heartbeat.flow.sh`) after `beat M12 no yes`, with `herd 10`. Then `MMH_LANE=heartbeat MMH_PORT=8772 bash flows/run.sh heartbeat/eggs-b`.
Expected: all flows pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/maths/eggs.ts src/core/heartbeat/lines.ts src/core/heartbeat/places.ts src/scenes/heartbeat/nest.ctrl.ts src/scenes/Nest.svelte content/lines/heartbeat.json flows/heartbeat/eggs-b.flow.sh tests/heartbeat/eggs-b.test.ts
git commit -m "Add berry and snow eggs"
```

**Acceptance:** tests and flows pass; berry eggs hatch Berry foals and snow eggs Snow foals (`BREED_OF`, Task 4).

---

### Task 25: The golden egg and the two-egg choice

**Files:**
- Create: `src/scenes/heartbeat/egg-choice.ctrl.ts`, `src/scenes/EggChoice.svelte`
- Modify: `src/scenes/heartbeat/learn-bridge.ts` (`eggOffer`), `src/scenes/heartbeat/flow.svelte.ts` (offer the choice, carry the pick to the nest), `src/scenes/Hatch.svelte` (golden and speckled lines), `src/core/heartbeat/lines.ts`, `content/lines/heartbeat.json`, `src/scenes/heartbeat/test-hooks.ts` (an `egg-choice` hook)
- Test: `tests/heartbeat/egg-choice.test.ts`

**Interfaces:**
- Consumes: LEARN's `goldenEgg(ctx, rng): Pick | null` (release B) and `serveEgg` through `learn-bridge.ts`; `world.announced` (C5; PLACES exposes it as `isAnnounced(world.places, id)`, which the integrator wires into `game.world.announced`); Task 16 (`egg-choice` stage).
- Produces:

```ts
export type EggOffer = { speckled: Served; golden: Served | null };
export type EggPick = { served: Served; golden: boolean; speckled: boolean };
export function offerChoice(announced: Set<string>, offer: EggOffer | null): boolean;
export function plainEgg(announced: Set<string>, offer: EggOffer | null): EggPick | null; // the speckled egg alone once the choice is known
export class EggChoiceCtrl { constructor(offer: EggOffer, d: SceneDeps); begin(): Promise<void>; pick(kind: 'speckled' | 'golden'): EggPick }
// flow: heartbeat.eggPicked(pick: EggPick): void   (replaces the Wave A signature)
```

New lines: `lumi-two-eggs` (queen, v2 text "Two eggs tonight! A speckled egg, or a golden egg?"), `g-pick-egg` (v2 text "Tap an egg. The golden egg is tricky!"), `fb-golden` ("A golden baby!"), `fb-speckled` ("A speckled baby!").

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/egg-choice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EggChoiceCtrl, offerChoice, plainEgg } from '../../src/scenes/heartbeat/egg-choice.ctrl.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { fakeDeps } from './fakes.ts';

const sp: Served = { strand: 'm', step: 'M10', id: '4+6', carrier: '', items: ['4+6'], scaffold: 3, probe: false, source: 'current' };
const gd: Served = { ...sp, step: 'M11', id: '6+4', source: 'golden' };

describe('the two-egg choice', () => {
  it('is offered only once announced and when a golden egg is planned', () => {
    expect(offerChoice(new Set(['two-egg']), { speckled: sp, golden: gd })).toBe(true);
    expect(offerChoice(new Set(), { speckled: sp, golden: gd })).toBe(false);
    expect(offerChoice(new Set(['two-egg']), { speckled: sp, golden: null })).toBe(false);
  });
  it('shows only the speckled egg when the golden egg is not planned', () => {
    expect(plainEgg(new Set(['two-egg']), { speckled: sp, golden: null })).toEqual({ served: sp, golden: false, speckled: true });
    expect(plainEgg(new Set(), { speckled: sp, golden: null })).toBeNull();
  });
  it('hands the nest the chosen egg', async () => {
    const f = fakeDeps();
    const c = new EggChoiceCtrl({ speckled: sp, golden: gd }, f.deps);
    await c.begin();
    expect(f.said).toEqual(['lumi-two-eggs', 'g-pick-egg']);
    expect(c.pick('golden')).toEqual({ served: gd, golden: true, speckled: false });
    expect(c.pick('speckled')).toEqual({ served: sp, golden: false, speckled: true });
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/egg-choice.test.ts`
Expected: FAIL, cannot resolve the controller.

- [ ] **Step 3: Implement**

`src/scenes/heartbeat/egg-choice.ctrl.ts`:

```ts
import type { Served } from '../../core/heartbeat/types.ts';
import type { SceneDeps } from './deps.ts';

export type EggOffer = { speckled: Served; golden: Served | null };
export type EggPick = { served: Served; golden: boolean; speckled: boolean };

export function offerChoice(announced: Set<string>, offer: EggOffer | null): boolean {
  return !!offer?.golden && announced.has('two-egg');
}
export function plainEgg(announced: Set<string>, offer: EggOffer | null): EggPick | null {
  return offer && announced.has('two-egg') && !offer.golden ? { served: offer.speckled, golden: false, speckled: true } : null;
}

export class EggChoiceCtrl {
  constructor(private offer: EggOffer, private d: SceneDeps) {}
  async begin(): Promise<void> {
    await this.d.audio.say('lumi-two-eggs');
    await this.d.audio.say('g-pick-egg');
  }
  pick(kind: 'speckled' | 'golden'): EggPick {
    if (kind === 'golden' && this.offer.golden) return { served: this.offer.golden, golden: true, speckled: false };
    return { served: this.offer.speckled, golden: false, speckled: true };
  }
}
```

Add to `learn-bridge.ts`:

```ts
import { goldenEgg } from '../../core/planner/index.ts';
import type { EggOffer } from './egg-choice.ctrl.ts';

export function eggOffer(rng: Rng): EggOffer | null {
  const speckled = serveEgg(rng).served;
  if (!speckled) return null;
  const g = goldenEgg(game.planContext, rng) as Pick | null;
  return { speckled, golden: g ? servedFromPick(g, new Map()) : null };
}
```

In `flow.svelte.ts`: add `import { eggOffer } from './learn-bridge.ts';` and `import { type EggOffer, type EggPick, offerChoice, plainEgg } from './egg-choice.ctrl.ts';`, a module variable `let offer: EggOffer | null = null; let pick: EggPick | null = null;`, and change:

```ts
  start(): void {
    const unnamed = game.world.herd.find((b) => b.name === null);
    offer = unnamed ? null : eggOffer(game.rng);
    pick = plainEgg(game.world.announced, offer);
    send({ s: 'start', unnamedBaby: unnamed?.id ?? null, offerChoice: offerChoice(game.world.announced, offer) });
  },
  get offer(): EggOffer | null { return offer; },
  eggPicked(p: EggPick): void { pick = p; send({ s: 'egg-picked' }); },
```

and in `route()`: `case 'egg': game.go('nest', pick ? { served: pick.served, golden: pick.golden, speckled: pick.speckled } : {}); pick = null; break;`.

`src/scenes/EggChoice.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { heartbeat } from './heartbeat/flow.svelte.ts';
  import { EggChoiceCtrl } from './heartbeat/egg-choice.ctrl.ts';
  import { liveDeps } from './heartbeat/deps.ts';
  import { exposeCtrl } from './heartbeat/test-hooks.ts';
  import ArtImg from './heartbeat/ArtImg.svelte';
  const ctrl = new EggChoiceCtrl(heartbeat.offer!, liveDeps({ place: 'nest', strand: 'm' }));
  onMount(async () => { exposeCtrl('egg-choice', ctrl); await ctrl.begin(); });
</script>

<section class="choice" aria-label="egg choice">
  <div class="bg"><ArtImg id="bg-nest" size={1180} /></div>
  <button class="egg left" data-touch aria-label="speckled egg" onpointerup={() => heartbeat.eggPicked(ctrl.pick('speckled'))}><ArtImg id="egg-speckled" size={280} /></button>
  <button class="egg right" data-touch aria-label="golden egg" onpointerup={() => heartbeat.eggPicked(ctrl.pick('golden'))}><ArtImg id="egg-golden" size={280} /></button>
</section>

<style>
  .choice { position: absolute; inset: 0; }
  .bg { position: absolute; inset: 0; }
  .egg { position: absolute; top: 240px; background: none; border: 0; }
  .left { left: 220px; } .right { left: 680px; animation: glint 2s ease-in-out infinite; }
  @keyframes glint { 50% { transform: scale(1.04); } }
</style>
```

In `test-hooks.ts` register `egg-choice`: `answer: () => heartbeat.eggPicked((active['egg-choice'] as EggChoiceCtrl).pick('golden'))`, `wrong: () => heartbeat.eggPicked((active['egg-choice'] as EggChoiceCtrl).pick('speckled'))`.

In `Hatch.svelte`, after `lumi-baby`: `if (baby?.traits.golden) await audio.say('fb-golden'); else if (baby?.traits.speckled) await audio.say('fb-speckled');`.

Add the four lines to `FIXED` in `lines.ts` with the texts above (`lumi-two-eggs` as `queen`, the others as `narrator`), and regenerate.

- [ ] **Step 4: Run the tests**

Run: `npm run lines:heartbeat && npx vitest run tests/heartbeat`
Expected: PASS.

- [ ] **Step 5: Flow check (outside the sandbox)**

Add to `flows/heartbeat/eggs-b.flow.sh`, before goodnight:

```sh
ev "() => { window.__game.announce('two-egg'); window.__hb.start(); return 'ok'; }" >/dev/null
st=$(ev "() => 'scene ' + window.__game.state().scene")
if echo "$st" | grep -q 'egg-choice'; then
  ev "() => window.__game.answer()" >/dev/null
  wait_scene nest
  ev "() => window.__game.answer()" >/dev/null
  wait_scene naming; ev "() => window.__game.answer()" >/dev/null
  wait_scene wish; ev "() => window.__game.answer()" >/dev/null
  wait_scene stalls; ev "() => window.__game.answer()" >/dev/null
  wait_scene meadow
fi
```

`__game.announce(id)` is a CORE test-hook helper (C7) that writes an `opening.announced` event. The choice shows only when the planner also offers a golden egg, so the flow accepts both paths.
Expected: flows pass.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/heartbeat/egg-choice.ctrl.ts src/scenes/EggChoice.svelte src/scenes/heartbeat/learn-bridge.ts src/scenes/heartbeat/flow.svelte.ts src/scenes/Hatch.svelte src/scenes/heartbeat/test-hooks.ts src/core/heartbeat/lines.ts content/lines/heartbeat.json flows/heartbeat/eggs-b.flow.sh tests/heartbeat/egg-choice.test.ts
git commit -m "Add the golden egg and the two-egg choice"
```

**Acceptance:** the choice appears only after the opening queue announced it and only when the planner offers a golden egg; otherwise the speckled egg comes alone; neither coat is presented as the better prize.

---

### Task 26: Phrase wishes (R27, R28, R29) and the tricky-word pairs (R12)

**Files:**
- Create: `src/core/heartbeat/phrases.ts`, `src/scenes/heartbeat/phrase.ctrl.ts`
- Modify: `src/scenes/Wish.svelte` (phrase mode), `src/scenes/heartbeat/test-hooks.ts` (R12, R27 to R29 are already declared as wave B in `places.ts`)
- Test: `tests/heartbeat/phrases.test.ts`

**Interfaces:**
- Consumes: `game.content.phrases: Map<string, PhraseEntry>` (C11 addition, CONTENT); art ids `mask-<word>` for colourable items (C12 addition, ART; when missing, the item shows a coloured ring badge); `planBasket` (Task 5).
- Produces:

```ts
export type Colour = 'red' | 'pink' | 'blue' | 'green' | 'yellow' | 'purple';
export type PhraseAct =
  | { kind: 'give'; word: string; colour?: Colour; size?: 'big' | 'tiny' }
  | { kind: 'station'; station: StationId; how?: 'push' | 'pull' }
  | { kind: 'put'; word: string; where: 'on' | 'in' };
export type PhraseLine = { text: string; acts: PhraseAct[]; clip: string };
export type PhraseEntry = { id: string; step: 'R12' | 'R27' | 'R28' | 'R29'; lines: PhraseLine[]; tricky: string[] };
export type PhraseItem = { key: string; word: string; picture: string; heap: false; colour?: Colour; size?: 'big' | 'tiny' };
export type PhraseWish = { kind: 'phrase'; baby: string; served: Served; phrase: PhraseEntry; basket: PhraseItem[] };
export type ActInput = { kind: 'give'; item: PhraseItem } | { kind: 'station'; station: StationId; how?: 'push' | 'pull' } | { kind: 'put'; item: PhraseItem; where: 'on' | 'in' };
export const PHRASE_STEPS: Set<string>;
export function buildPhraseWish(input: { served: Served; baby: string; phrases: Map<string, PhraseEntry>; words: Map<string, WordEntry>; rng: Rng }): PhraseWish | null;
export function matchAct(act: PhraseAct, input: ActInput): boolean;
export function openActs(line: PhraseLine, done: boolean[]): PhraseAct[];
```

Decisions: phrases are the baby's own speech, so "Put the hat on me." replaces "Put the hat on Pip." and no phrase needs a spliced name. "his hat" and "her hat" are left out, because babies have no gender in the world model. "go" and "no" on the meadow gate belong to the meadow (MEADOW). Two things joined by "and" may be given in any order. A card with two lines shows one line at a time with a tick (spec 2.11 rule 1). One `learn.result` is logged per phrase, with `carrier` the phrase id.

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/phrases.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPhraseWish, matchAct, openActs, type PhraseEntry } from '../../src/core/heartbeat/phrases.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { BY_WORD } from './words.ts';

const P: PhraseEntry[] = [
  { id: 'tiny-pink-hat', step: 'R27', tricky: [], lines: [{ text: 'a tiny pink hat', clip: 'word-tiny-pink-hat', acts: [{ kind: 'give', word: 'hat', colour: 'pink', size: 'tiny' }] }] },
  { id: 'hat-and-bun', step: 'R28', tricky: ['and'], lines: [{ text: 'a hat and a bun', clip: 'word-hat-and-bun', acts: [{ kind: 'give', word: 'hat' }, { kind: 'give', word: 'bun' }] }] },
  { id: 'hat-in-box', step: 'R12', tricky: ['put', 'the', 'in'], lines: [{ text: 'Put the hat in the box.', clip: 'word-hat-in-box', acts: [{ kind: 'put', word: 'hat', where: 'in' }] }] },
  { id: 'push-swing', step: 'R12', tricky: ['push', 'the'], lines: [{ text: 'push the swing', clip: 'word-push-swing', acts: [{ kind: 'station', station: 'swing', how: 'push' }] }] },
];
const phrases = new Map(P.map((p) => [p.id, p]));
const served = (step: string, carrier: string, scaffold: 1 | 2 | 3 = 2): Served =>
  ({ strand: 'r', step, id: carrier, carrier, items: ['tw:and'], scaffold, probe: false, source: 'current' });

describe('phrase wishes', () => {
  it('puts the exact thing and near misses in the basket', () => {
    const w = buildPhraseWish({ served: served('R27', 'tiny-pink-hat'), baby: 'b1', phrases, words: BY_WORD, rng: makeRng(1) })!;
    const hats = w.basket.filter((i) => i.word === 'hat');
    expect(hats.some((i) => i.colour === 'pink' && i.size === 'tiny')).toBe(true);
    expect(hats.some((i) => i.colour !== 'pink')).toBe(true);
    expect(hats.some((i) => i.colour === 'pink' && i.size !== 'tiny')).toBe(true);
    expect(w.basket.some((i) => i.word !== 'hat' && i.colour === 'pink')).toBe(true);
    expect(w.basket.length).toBeGreaterThanOrEqual(4);
  });
  it('matches gives by word, colour and size', () => {
    const act = P[0].lines[0].acts[0];
    const item = (colour: any, size: any) => ({ key: 'k', word: 'hat', picture: 'hat', heap: false as const, colour, size });
    expect(matchAct(act, { kind: 'give', item: item('pink', 'tiny') })).toBe(true);
    expect(matchAct(act, { kind: 'give', item: item('blue', 'tiny') })).toBe(false);
    expect(matchAct(act, { kind: 'give', item: item('pink', 'big') })).toBe(false);
  });
  it('lets "and" be done in any order', () => {
    const line = P[1].lines[0];
    expect(openActs(line, [false, true])).toEqual([line.acts[0]]);
    expect(openActs(line, [true, true])).toEqual([]);
  });
  it('tells in from on, and push from pull', () => {
    const hat = { key: 'hat', word: 'hat', picture: 'hat', heap: false as const };
    expect(matchAct(P[2].lines[0].acts[0], { kind: 'put', item: hat, where: 'in' })).toBe(true);
    expect(matchAct(P[2].lines[0].acts[0], { kind: 'put', item: hat, where: 'on' })).toBe(false);
    expect(matchAct(P[3].lines[0].acts[0], { kind: 'station', station: 'swing', how: 'pull' })).toBe(false);
    expect(matchAct(P[3].lines[0].acts[0], { kind: 'station', station: 'swing', how: 'push' })).toBe(true);
  });
  it('refuses unknown phrases', () => {
    expect(buildPhraseWish({ served: served('R27', 'nope'), baby: 'b1', phrases, words: BY_WORD, rng: makeRng(1) })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/phrases.test.ts`
Expected: FAIL, cannot resolve `phrases.ts`.

- [ ] **Step 3: Implement `phrases.ts`**

```ts
import { type Rng, shuffle } from '../rng.ts';
import type { WordEntry } from './types.ts';
import type { Served, StationId } from './types.ts';

export type Colour = 'red' | 'pink' | 'blue' | 'green' | 'yellow' | 'purple';
export type PhraseAct =
  | { kind: 'give'; word: string; colour?: Colour; size?: 'big' | 'tiny' }
  | { kind: 'station'; station: StationId; how?: 'push' | 'pull' }
  | { kind: 'put'; word: string; where: 'on' | 'in' };
export type PhraseLine = { text: string; acts: PhraseAct[]; clip: string };
export type PhraseEntry = { id: string; step: 'R12' | 'R27' | 'R28' | 'R29'; lines: PhraseLine[]; tricky: string[] };
export type PhraseItem = { key: string; word: string; picture: string; heap: false; colour?: Colour; size?: 'big' | 'tiny' };
export type PhraseWish = { kind: 'phrase'; baby: string; served: Served; phrase: PhraseEntry; basket: PhraseItem[] };
export type ActInput =
  | { kind: 'give'; item: PhraseItem }
  | { kind: 'station'; station: StationId; how?: 'push' | 'pull' }
  | { kind: 'put'; item: PhraseItem; where: 'on' | 'in' };

export const PHRASE_STEPS = new Set(['R12', 'R27', 'R28', 'R29']);
const COLOURS: Colour[] = ['red', 'pink', 'blue', 'green', 'yellow', 'purple'];

const itemKey = (word: string, colour?: Colour, size?: string) => [word, colour ?? '', size ?? ''].join(':');

export function buildPhraseWish(input: { served: Served; baby: string; phrases: Map<string, PhraseEntry>; words: Map<string, WordEntry>; rng: Rng }): PhraseWish | null {
  const phrase = input.phrases.get(input.served.carrier);
  if (!phrase) return null;
  const items = new Map<string, PhraseItem>();
  const add = (word: string, colour?: Colour, size?: 'big' | 'tiny') => {
    const w = input.words.get(word);
    if (!w) return false;
    items.set(itemKey(word, colour, size), { key: itemKey(word, colour, size), word, picture: w.picture, heap: false, colour, size });
    return true;
  };
  const used = new Set<string>();
  for (const line of phrase.lines) {
    for (const act of line.acts) {
      if (act.kind === 'station') continue;
      const colour = act.kind === 'give' ? act.colour : undefined;
      const size = act.kind === 'give' ? act.size : undefined;
      if (!add(act.word, colour, size)) return null;
      used.add(act.word);
      if (colour) add(act.word, shuffle(COLOURS.filter((c) => c !== colour), input.rng)[0], size); // same thing, other colour
      if (size) add(act.word, colour, size === 'tiny' ? 'big' : 'tiny');                              // same thing, other size
      const other = shuffle([...input.words.values()].filter((w) => w.basket && !w.one && !used.has(w.word)), input.rng)[0];
      if (other) { add(other.word, colour, size); used.add(other.word); }                             // other thing, same look
    }
  }
  const pool = shuffle([...input.words.values()].filter((w) => w.basket && !w.one && !used.has(w.word)), input.rng);
  const min = input.served.scaffold === 3 ? 6 : 4;
  for (const w of pool) { if (items.size >= min) break; add(w.word); }
  return { kind: 'phrase', baby: input.baby, served: input.served, phrase, basket: shuffle([...items.values()], input.rng) };
}

export function matchAct(act: PhraseAct, input: ActInput): boolean {
  if (act.kind === 'station') return input.kind === 'station' && input.station === act.station && (act.how === undefined || input.how === act.how);
  if (act.kind === 'put') return input.kind === 'put' && input.item.word === act.word && input.where === act.where;
  return input.kind === 'give' && input.item.word === act.word && input.item.colour === act.colour && input.item.size === act.size;
}

export function openActs(line: PhraseLine, done: boolean[]): PhraseAct[] {
  return line.acts.filter((_, i) => !done[i]);
}
```

`src/scenes/heartbeat/phrase.ctrl.ts` (one phrase, one line at a time; Elizabeth reads a line only after it is done):

```ts
import { type ActInput, type PhraseWish, matchAct } from '../../core/heartbeat/phrases.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import type { SceneDeps } from './deps.ts';

export class PhraseCtrl {
  line = 0;
  done: boolean[];
  misses = 0;
  finished = false;
  onchange: () => void = () => {};
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(readonly wish: PhraseWish, private d: SceneDeps) {
    this.done = wish.phrase.lines[0].acts.map(() => false);
  }

  async begin(): Promise<void> {
    await this.d.audio.say('g-wish');
    this.startedAt = this.d.now();
    this.d.hints.begin({ idleMs: 10000, repeat: () => this.d.audio.say('g-wish'), focused: () => this.d.audio.say('h-sounds'), answer: async () => {} });
  }

  async act(input: ActInput): Promise<'ok' | 'line' | 'miss' | 'ignored'> {
    if (this.finished) return 'ignored';
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
    this.d.audio.act();
    const line = this.wish.phrase.lines[this.line];
    const i = line.acts.findIndex((a, k) => !this.done[k] && matchAct(a, input));
    if (i < 0) {
      this.misses++;
      this.onchange();
      await this.d.audio.say('foal-silly');
      await this.d.audio.say('fb-letters');
      await this.d.hints.miss();
      return 'miss';
    }
    this.done[i] = true;
    this.onchange();
    if (this.done.some((x) => !x)) return 'ok';
    await this.d.audio.say(line.clip);
    if (this.line + 1 < this.wish.phrase.lines.length) {
      this.line++;
      this.done = this.wish.phrase.lines[this.line].acts.map(() => false);
      this.onchange();
      return 'line';
    }
    const result = momentResult(this.misses, this.d.hints.level);
    this.d.dispatch({ type: 'hb.wish.done', baby: this.wish.baby, served: this.wish.served, word: this.wish.phrase.id, place: 'wish',
      result, ms: Math.max(0, this.firstTouch - this.startedAt), error: result === 'first' ? null : 'other' });
    this.d.hints.end();
    this.finished = true;
    this.onchange();
    await this.d.audio.say('foal-yay');
    return 'ok';
  }
}
```

Add to `tests/heartbeat/phrases.test.ts`:

```ts
import { PhraseCtrl } from '../../src/scenes/heartbeat/phrase.ctrl.ts';
import { fakeDeps } from './fakes.ts';

describe('PhraseCtrl', () => {
  it('takes "and" in any order, reads the line once and logs one result', async () => {
    const f = fakeDeps();
    const w = buildPhraseWish({ served: served('R28', 'hat-and-bun'), baby: 'b1', phrases, words: BY_WORD, rng: makeRng(2) })!;
    const c = new PhraseCtrl(w, f.deps);
    await c.begin();
    const item = (word: string) => w.basket.find((i) => i.word === word && !i.colour && !i.size)!;
    expect(await c.act({ kind: 'give', item: item('bun') })).toBe('ok');
    expect(f.actions).toHaveLength(0);
    expect(await c.act({ kind: 'give', item: item('hat') })).toBe('ok');
    expect(f.actions).toEqual([expect.objectContaining({ type: 'hb.wish.done', word: 'hat-and-bun', result: 'first' })]);
    expect(f.said.filter((x) => x === 'word-hat-and-bun')).toHaveLength(1);
  });
  it('counts a wrong colour as a miss', async () => {
    const f = fakeDeps();
    const w = buildPhraseWish({ served: served('R27', 'tiny-pink-hat'), baby: 'b1', phrases, words: BY_WORD, rng: makeRng(3) })!;
    const c = new PhraseCtrl(w, f.deps);
    await c.begin();
    const wrong = w.basket.find((i) => i.word === 'hat' && i.colour !== 'pink')!;
    expect(await c.act({ kind: 'give', item: wrong })).toBe('miss');
    const right = w.basket.find((i) => i.word === 'hat' && i.colour === 'pink' && i.size === 'tiny')!;
    expect(await c.act({ kind: 'give', item: right })).toBe('ok');
    expect(f.actions[0]).toMatchObject({ result: 'miss', error: 'other' });
  });
});
```

In `Wish.svelte`, when `served.step` is in `PHRASE_STEPS`, build with `buildPhraseWish` instead of `buildWish` (both in the `accept` filter), show the current line in a card with a tick box per line, render items with their colour (CSS `background-color` behind `mask-<word>` art, or a coloured ring when that art is missing) and size (`scale(0.65)` for tiny, `scale(1.15)` for big), make the hat box station a drop target for `put ... in`, and give the swing two 96 px handles labelled `push` and `pull`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/heartbeat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/phrases.ts src/scenes/heartbeat/phrase.ctrl.ts src/scenes/Wish.svelte src/scenes/heartbeat/test-hooks.ts tests/heartbeat/phrases.test.ts
git commit -m "Add phrase wishes with colours, sizes, and, push or pull, and in or on"
```

**Acceptance:** tests pass; a phrase is read aloud only after Emma acts; tricky words in phrases glow (the `tricky` list) and are never the deciding part except in R12 pairs.

---

## Wave C: releases 1.2 and 1.3 (items 24 and 25 as they touch this workstream)

### Task 27: Asking bubbles (R33) and two-state wishes (R37)

**Files:**
- Create: `src/core/heartbeat/year1.ts`, `src/scenes/heartbeat/year1.ctrl.ts`
- Modify: `src/scenes/Wish.svelte` (asking and two-state modes), `src/core/heartbeat/places.ts` (`BUILT_WAVE = 'C'`), `src/scenes/heartbeat/test-hooks.ts`. The goal line stays `g-wish`; no new lines are needed beyond CONTENT's sentence clips.
- Test: `tests/heartbeat/year1.test.ts`

**Interfaces:**
- Consumes: `game.content.asks: Map<string, AskSet>` and `game.content.twoStates: Map<string, TwoStateSet>` (C11 additions, CONTENT).
- Produces:

```ts
export type AskSet = { id: string; step: 'R33'; word: string; tell: string; shout: string; ask: string; clips: { tell: string; shout: string; ask: string } };
export type Speaker = { baby: string; mode: 'tell' | 'shout' | 'ask'; text: string; clip: string };
export type AskingWish = { kind: 'asking'; served: Served; set: AskSet; speakers: Speaker[] };
export type TwoStateSet = { id: string; step: 'R37'; object: 'basket' | 'bow' | 'gate' | 'box'; un: boolean; text: string; clip: string };
export type TwoStateWish = { kind: 'two-state'; served: Served; set: TwoStateSet; baby: string };
export function buildAsking(input: { served: Served; asks: Map<string, AskSet>; babies: string[]; rng: Rng }): AskingWish | null;
export function judgeAsking(w: AskingWish, baby: string): { ok: true } | { ok: false; mode: 'tell' | 'shout' };
export function buildTwoState(input: { served: Served; sets: Map<string, TwoStateSet>; baby: string }): TwoStateWish | null;
export function judgeTwoState(w: TwoStateWish, dir: 'do' | 'undo'): boolean;
```

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/year1.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAsking, buildTwoState, judgeAsking, judgeTwoState, type AskSet, type TwoStateSet } from '../../src/core/heartbeat/year1.ts';
import { makeRng } from '../../src/core/rng.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';

const bow: AskSet = { id: 'bow', step: 'R33', word: 'bow', tell: 'I have a bow.', shout: 'What a big bow!', ask: 'Can I have a bow?',
  clips: { tell: 'word-i-have-a-bow', shout: 'word-what-a-big-bow', ask: 'word-can-i-have-a-bow' } };
const unpack: TwoStateSet = { id: 'unpack', step: 'R37', object: 'basket', un: true, text: 'Unpack the basket.', clip: 'word-unpack-the-basket' };
const s = (step: string, carrier: string): Served => ({ strand: 'r', step, id: carrier, carrier, items: ['?'], scaffold: 1, probe: false, source: 'current' });

describe('asking bubbles', () => {
  it('gives three babies one telling, one shouting and one asking line', () => {
    const w = buildAsking({ served: s('R33', 'bow'), asks: new Map([['bow', bow]]), babies: ['a', 'b', 'c', 'd'], rng: makeRng(1) })!;
    expect(w.speakers.map((x) => x.mode).sort()).toEqual(['ask', 'shout', 'tell']);
    expect(new Set(w.speakers.map((x) => x.baby)).size).toBe(3);
    const asker = w.speakers.find((x) => x.mode === 'ask')!;
    expect(judgeAsking(w, asker.baby)).toEqual({ ok: true });
    const teller = w.speakers.find((x) => x.mode === 'tell')!;
    expect(judgeAsking(w, teller.baby)).toEqual({ ok: false, mode: 'tell' });
  });
  it('needs three babies', () => {
    expect(buildAsking({ served: s('R33', 'bow'), asks: new Map([['bow', bow]]), babies: ['a', 'b'], rng: makeRng(1) })).toBeNull();
  });
});

describe('two-state wishes', () => {
  it('lets the un decide the direction', () => {
    const w = buildTwoState({ served: s('R37', 'unpack'), sets: new Map([['unpack', unpack]]), baby: 'a' })!;
    expect(judgeTwoState(w, 'undo')).toBe(true);
    expect(judgeTwoState(w, 'do')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/year1.test.ts`
Expected: FAIL, cannot resolve `year1.ts`.

- [ ] **Step 3: Implement `year1.ts`**

```ts
import { type Rng, shuffle } from '../rng.ts';
import type { Served } from './types.ts';

export type AskSet = { id: string; step: 'R33'; word: string; tell: string; shout: string; ask: string; clips: { tell: string; shout: string; ask: string } };
export type Speaker = { baby: string; mode: 'tell' | 'shout' | 'ask'; text: string; clip: string };
export type AskingWish = { kind: 'asking'; served: Served; set: AskSet; speakers: Speaker[] };
export type TwoStateSet = { id: string; step: 'R37'; object: 'basket' | 'bow' | 'gate' | 'box'; un: boolean; text: string; clip: string };
export type TwoStateWish = { kind: 'two-state'; served: Served; set: TwoStateSet; baby: string };

export function buildAsking(input: { served: Served; asks: Map<string, AskSet>; babies: string[]; rng: Rng }): AskingWish | null {
  const set = input.asks.get(input.served.carrier);
  if (!set || input.babies.length < 3) return null;
  const who = shuffle(input.babies, input.rng).slice(0, 3);
  const modes = shuffle(['tell', 'shout', 'ask'] as const, input.rng);
  const speakers = who.map((baby, i) => ({ baby, mode: modes[i], text: set[modes[i]], clip: set.clips[modes[i]] }));
  return { kind: 'asking', served: input.served, set, speakers };
}

export function judgeAsking(w: AskingWish, baby: string): { ok: true } | { ok: false; mode: 'tell' | 'shout' } {
  const sp = w.speakers.find((x) => x.baby === baby);
  if (sp?.mode === 'ask') return { ok: true };
  return { ok: false, mode: sp?.mode === 'shout' ? 'shout' : 'tell' };
}

export function buildTwoState(input: { served: Served; sets: Map<string, TwoStateSet>; baby: string }): TwoStateWish | null {
  const set = input.sets.get(input.served.carrier);
  return set ? { kind: 'two-state', served: input.served, set, baby: input.baby } : null;
}

export function judgeTwoState(w: TwoStateWish, dir: 'do' | 'undo'): boolean {
  return w.set.un ? dir === 'undo' : dir === 'do';
}
```

`src/scenes/heartbeat/year1.ctrl.ts`:

```ts
import { type AskingWish, type TwoStateWish, judgeAsking, judgeTwoState } from '../../core/heartbeat/year1.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import type { SceneDeps } from './deps.ts';

export class Year1Ctrl {
  misses = 0;
  done = false;
  lastFunny: 'tell' | 'shout' | 'wrong-way' | null = null;
  onchange: () => void = () => {};
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(readonly wish: AskingWish | TwoStateWish, private d: SceneDeps) {}

  async begin(): Promise<void> {
    await this.d.audio.say('g-wish');
    this.startedAt = this.d.now();
    this.d.hints.begin({ idleMs: 10000, repeat: () => this.d.audio.say('g-wish'), focused: () => this.d.audio.say('fb-letters'), answer: async () => {} });
  }

  private touch(): void {
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
    this.d.audio.act();
  }

  async give(baby: string): Promise<'ok' | 'miss' | 'ignored'> {
    if (this.done || this.wish.kind !== 'asking') return 'ignored';
    this.touch();
    const v = judgeAsking(this.wish, baby);
    if (!v.ok) return this.miss(v.mode);
    return this.success(baby, this.wish.set.clips.ask, this.wish.set.id);
  }

  async turn(dir: 'do' | 'undo'): Promise<'ok' | 'miss' | 'ignored'> {
    if (this.done || this.wish.kind !== 'two-state') return 'ignored';
    this.touch();
    if (!judgeTwoState(this.wish, dir)) return this.miss('wrong-way');
    return this.success(this.wish.baby, this.wish.set.clip, this.wish.set.id);
  }

  private async miss(kind: 'tell' | 'shout' | 'wrong-way'): Promise<'miss'> {
    this.misses++;
    this.lastFunny = kind; // the teller holds up its own bow and giggles; a packed basket wobbles and pops its lid
    this.onchange();
    if (kind === 'wrong-way') await this.d.audio.sfx('pop'); else await this.d.audio.say('foal-silly');
    await this.d.audio.say('fb-letters');
    await this.d.hints.miss();
    return 'miss';
  }

  private async success(baby: string, clip: string, word: string): Promise<'ok'> {
    const result = momentResult(this.misses, this.d.hints.level);
    this.d.dispatch({ type: 'hb.wish.done', baby, served: this.wish.served, word, place: 'wish', result,
      ms: Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt), error: result === 'first' ? null : 'other' });
    this.d.hints.end();
    this.done = true;
    this.lastFunny = null;
    this.onchange();
    await this.d.audio.say(clip); // the sentence is read only after she acts
    await this.d.audio.say('foal-yay');
    return 'ok';
  }
}
```

Add to `tests/heartbeat/year1.test.ts`:

```ts
import { Year1Ctrl } from '../../src/scenes/heartbeat/year1.ctrl.ts';
import { fakeDeps } from './fakes.ts';

describe('Year1Ctrl', () => {
  it('logs a miss after giving the bow to the teller first', async () => {
    const f = fakeDeps();
    const w = buildAsking({ served: s('R33', 'bow'), asks: new Map([['bow', bow]]), babies: ['a', 'b', 'c'], rng: makeRng(2) })!;
    const c = new Year1Ctrl(w, f.deps);
    await c.begin();
    expect(await c.give(w.speakers.find((x) => x.mode === 'tell')!.baby)).toBe('miss');
    expect(c.lastFunny).toBe('tell');
    expect(await c.give(w.speakers.find((x) => x.mode === 'ask')!.baby)).toBe('ok');
    expect(f.actions[0]).toMatchObject({ type: 'hb.wish.done', word: 'bow', result: 'miss' });
    expect(f.said).toContain('word-can-i-have-a-bow');
  });
});
```

In `Wish.svelte`: when `served.step === 'R33'`, show three babies, each with a speech bubble of printed text (`PrintWithDots` with the sentence split by words, dots off), and the bow in the middle to drag to a baby. When `served.step === 'R37'`, show the half-done object with two 96 px handles labelled `do` and `undo` (pictures: an arrow into the object and an arrow out of it).

Set `BUILT_WAVE = 'C'` in `places.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/heartbeat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/year1.ts src/scenes/heartbeat/year1.ctrl.ts src/scenes/Wish.svelte src/core/heartbeat/places.ts src/scenes/heartbeat/test-hooks.ts tests/heartbeat/year1.test.ts
git commit -m "Add asking bubbles and two-state wishes"
```

**Acceptance:** tests pass; asking needs three babies, so it is never served with fewer (the `accept` filter refuses it).

---

### Task 28: Quiet stall moves after a sync

**Files:**
- Create: `src/scenes/heartbeat/seen-stalls.ts`
- Modify: `src/core/heartbeat/stables.ts` (add `stallMoves`), `src/scenes/Stalls.svelte`, `src/scenes/Goodnight.svelte`
- Test: `tests/heartbeat/stall-moves.test.ts`

**Interfaces:**
- Consumes: `game.refoldedAt` (C17).
- Produces:

```ts
// stables.ts
export function stallMoves(prev: Record<string, number>, herd: { id: string; order: number }[]): { baby: string; from: number; to: number }[];
// seen-stalls.ts
export function loadSeen(storage?: Pick<Storage, 'getItem'> | null): Record<string, number>;
export function saveSeen(map: Record<string, number>, storage?: Pick<Storage, 'setItem'> | null): void;
```

Spec 4.5: after a merge a baby may move. It trots to its new stall quietly, and the move-in task is not asked again. Move-in is never asked as a task, so this task only makes the move visible and silent. The seen map is a per-iPad convenience in `localStorage`, wrapped in try/catch, and the game works without it.

- [ ] **Step 1: Write the failing test**

`tests/heartbeat/stall-moves.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stallMoves } from '../../src/core/heartbeat/stables.ts';
import { loadSeen, saveSeen } from '../../src/scenes/heartbeat/seen-stalls.ts';

describe('stallMoves', () => {
  it('lists babies whose stall number changed, and ignores new babies', () => {
    expect(stallMoves({ a: 1, b: 2 }, [{ id: 'a', order: 1 }, { id: 'c', order: 2 }, { id: 'b', order: 3 }])).toEqual([{ baby: 'b', from: 2, to: 3 }]);
    expect(stallMoves({}, [{ id: 'a', order: 1 }])).toEqual([]);
  });
});

describe('seen stalls storage', () => {
  it('round-trips through storage and survives a broken or missing one', () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    saveSeen({ a: 3 }, st);
    expect(loadSeen(st)).toEqual({ a: 3 });
    expect(loadSeen({ getItem: () => { throw new Error('blocked'); } })).toEqual({});
    expect(loadSeen({ getItem: () => 'not json' })).toEqual({});
    expect(loadSeen(null)).toEqual({});
    expect(() => saveSeen({ a: 1 }, { setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run tests/heartbeat/stall-moves.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `stables.ts`:

```ts
export function stallMoves(prev: Record<string, number>, herd: { id: string; order: number }[]): { baby: string; from: number; to: number }[] {
  return herd.filter((b) => prev[b.id] !== undefined && prev[b.id] !== b.order).map((b) => ({ baby: b.id, from: prev[b.id], to: b.order }));
}
```

`src/scenes/heartbeat/seen-stalls.ts`:

```ts
const KEY = 'mmh-stalls-seen';

function local(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function loadSeen(storage: Pick<Storage, 'getItem'> | null = local()): Record<string, number> {
  try {
    const raw = storage?.getItem(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function saveSeen(map: Record<string, number>, storage: Pick<Storage, 'setItem'> | null = local()): void {
  try { storage?.setItem(KEY, JSON.stringify(map)); } catch { /* per-iPad convenience only */ }
}
```

In `Stalls.svelte` and `Goodnight.svelte`: on mount, and in an `$effect` that reads `game.refoldedAt`, compute `stallMoves(loadSeen(), world.herd)`; give each moved baby's new door the class `trot-in` (a 0.8 s hop from the side, transform only) with no audio; then `saveSeen(Object.fromEntries(world.herd.map((b) => [b.id, b.order])))`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/heartbeat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/stables.ts src/scenes/heartbeat/seen-stalls.ts src/scenes/Stalls.svelte src/scenes/Goodnight.svelte tests/heartbeat/stall-moves.test.ts
git commit -m "Let babies trot quietly to a new stall after a sync"
```

**Acceptance:** tests pass; after SYNC's two-device test (spec 7.3 check 8) a moved baby hops into its new door without any line.

---

### Task 29: The parent switch for skipping the first wish

**Files:**
- Modify: `src/core/heartbeat/flow.ts` (add `flowOpts`), `src/scenes/heartbeat/flow.svelte.ts` (`opts()` reads the setting)
- Test: `tests/heartbeat/flow.test.ts` (one more case)

**Interfaces:**
- Consumes: `game.world.settings.skipWishAfterThree` (C5, C16).
- Produces: `export function flowOpts(settings?: { skipWishAfterThree?: boolean }): FlowOpts;`

- [ ] **Step 1: Add the failing test** to `tests/heartbeat/flow.test.ts`:

```ts
import { flowOpts } from '../../src/core/heartbeat/flow.ts';

describe('flowOpts', () => {
  it('is off unless the parent switched it on', () => {
    expect(flowOpts(undefined)).toEqual({ skipWishAfterThree: false });
    expect(flowOpts({})).toEqual({ skipWishAfterThree: false });
    expect(flowOpts({ skipWishAfterThree: true })).toEqual({ skipWishAfterThree: true });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/heartbeat/flow.test.ts`
Expected: FAIL, `flowOpts` is not exported.

- [ ] **Step 3: Implement**

In `flow.ts`:

```ts
export function flowOpts(settings?: { skipWishAfterThree?: boolean }): FlowOpts {
  return { skipWishAfterThree: settings?.skipWishAfterThree === true };
}
```

In `flow.svelte.ts` replace `opts()` with `function opts() { return flowOpts(game.world.settings); }` and import `flowOpts`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/heartbeat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/heartbeat/flow.ts src/scenes/heartbeat/flow.svelte.ts tests/heartbeat/flow.test.ts
git commit -m "Read the parent switch for skipping the first wish after three eggs"
```

**Acceptance:** with the switch off (default) every egg gets its first wish; with it on, the fourth egg in a row and later go straight to move-in until Emma does something else.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| 2.2 egg by maths step, review egg when the step has no egg kind | 2, 18 (the planner serves a review item for slot `egg`, C10) |
| 2.2 hatch, shiny one in three on a first try, moonflower | 4, 9, 18, 23 |
| 2.2 naming routes, first wish with basket and care stations, one-or-many wishes, extra eggs keep the wish | 5, 6, 19, 20 |
| 2.2 move-in line, door glow, door visits by range, every third baby once secure | 7, 21 |
| 2.2 measured risk switch | 16, 29 |
| 2.5 care free play (brush, treats, cuddles, tricks), 2.7 at most 12 babies in the meadow | 23B |
| 2.4 herd circle baby of the building breed, named | 23B |
| 2.5 nest, naming, care station, stalls and roll-call mistakes | 2, 14, 19, 20, 21, 22 |
| 2.6 egg kinds and breeds (moon, nest, two-stone, blanket; berry, snow; golden, speckled) | 2, 4, 24, 25 |
| 2.7 stalls in rows of ten, plaques, named rows shown, one star per baby, sky unicorns | 7, 8, 21, 22 |
| 2.8 bells, name tree, garden by picture and first sound, gold bell 2 to 8 slots, gift gems, capitals from S11, check order, list match by sound, unknown names with the kind line, no-clip sparkle, the moon's new names, duplicates up to the Twentieth, blocklist by sound with strong parts, logging | 10 to 15, 19, 23 |
| 2.9 new player: ghost hand on a non-answer stone, three bells, ghost hand under the word, door 1 | 18, 19, 20, 21 |
| 3.2 to 3.3 learn.result fields, scaffold sizes, hint ladder results | 1, 15, 17 to 22 |
| 3.7 name review rules | 8, 22 |
| 3.8 twin wishes, contrast distractors, `dutch` tags | 5, 6, 13, 14, 20 |
| 3.9 phrase wishes and R12 pairs | 26 |
| 3.10 one-or-many wishes, heaps drawn by code, funny plural mistakes | 5, 6, 17, 20 |
| 7.1 items 6, 7, 8, 16 (eggs), 24 | Waves A, B, C |
| 7.3 checks 3 (flows at three sizes, portrait), 7 (200 random gold builds) | 14, 23 |

Not in this workstream: the planner and placement (LEARN), the label bubbles and jars (MEADOW, which reuses Task 17's parts), Building Days and row naming (BUILD, which reuses `Naming.svelte`), Moving Day (MOVE), the parent corner (PARENT), the save server and sync (SYNC), audio generation runs (CONTENT), art generation (ART). This workstream needs about 6,000 to 7,000 tier 1 credits for `content/lines/heartbeat.json` before cache hits, and about 2,600 more for tier 2 counts above sixty.
