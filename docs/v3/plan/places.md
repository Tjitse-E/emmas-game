# Moon Meadow Home: meadow and places implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every place around the heartbeat of Moon Meadow Home v3: the meadow hub, bubbles, toy shelf with plural labels, hint ladder and replay, Bath Pond, Building Days, Jewel Box and plots, Dressing Corner, opening queue and novelty floor, Post Box with pins and notes, Home Book, Sparkle Salon, Letter Lane, valley map, titles, babies who come along, Year 1 meadow wishes and the parent corner.

**Architecture:** Pure TypeScript in `src/core/places/` holds every rule (folds, planners, checks) and is unit tested with Vitest. Svelte 5 scenes in `src/scenes/places/` and `src/parent/` only render and turn touches into `PlaceAction`s. One reducer, `reducePlaces`, folds place events into `world.places`. The core workstream composes it into `foldWorld` and routes `place/*` actions to `applyPlaceAction`.

**Tech stack:** Svelte 5.57.2, Vite 8.3.4, TypeScript 6.0.3, Vitest 5.0.3, svelte-check 4.7.6, `shared/audio.js` through the core audio facade, `playwright-cli` (WebKit, iPad emulation).

**Spec:** `docs/v3/spec.md` sections 2.3 to 2.7, 2.9, 2.11, 3.3, 3.10 and items 9 to 26 of section 7.1. `docs/v3/decisions.md` wins on conflicts. The lead's build decisions (the session brief) win over both.

All paths below are relative to `games/moon-meadow-home/` unless they start with `docs/`, `shared/` or `scripts/`. Commands run from `games/moon-meadow-home/` unless stated. Commits run from the repo root.

## Reconciled with the master plan (binding)

`docs/v3/plan.md` (sections 2 and 3) and `docs/v3/plan/contracts.ts` are binding for this plan. Where a task below still shows another name, shape, port or owner, the master plan and `contracts.ts` win, and the builder changes this plan's code, never another stream's. Decisions are numbered R1 to R33 in master section 2.1.

**Dropped files and tasks.**
- `src/ui/ghost.ts`, `src/ui/GhostHand.svelte`, `src/ui/Moonbeam.svelte` (A3, A4): platform's controllers and components (R10).
- `src/ui/Heap.svelte` and the heap layout in `plurals.ts` (A8): art's `Heap` and `heapLayout` (R12).
- `rowsBuilt` (A12): rows come from core's herd slice through `game.world.rowsBuilt` (R26). Row plots are `row-<n>`.
- `content/places/release.json`: learning's `content/release.json` is the only release file (R27).
- `content/places/notes.json` (B7), the card lines in `content/places/salon.json` (C1) and `content/places/year1.json`: learning's `content/phrases/*.json` (R8). Task C7 is dropped; heartbeat Task 27 owns asking bubbles and two-state wishes (R9).
- `src/core/learning/view.ts` is not expected from core; `src/places/serve.ts` builds `toLearnerView` itself.

**Changed tasks.**
- A1 (R17 to R19, R32): `GameEvent` and `DraftOf` come from `src/core/events.ts`. `src/core/places/index.ts` exports `createPlacesSlice()` (`{ name: 'places', version: 1, init: initPlaces, apply: (s, e) => reducePlaces(s, e) }`), and `titlesToGive` and `momentPinsDue`, which return `[]` until Tasks C5 and B2 replace them. `applyPlaceAction(action, ctx: ActionCtx)` returns drafts without `visit` (the router fills it); there is no `make`. Payloads are contracts C2: `care.done { baby, station }`, `pin.given { baby, pin, kind, set, key }`, `jar.labelled { jar, word, gems, count, plural, picture, baby }`, `learn.override` in learning's four shapes, `note.sent { note, words, mark, gift }`. `place.enter` and `place.leave` are written by the store on every router change; `nav.ts` only navigates. Every `learn.result` is built with learning's `learnResultPayload(pick, outcome)`; `logItems` returns `{ id, r }`. Export `PLACE_SAMPLE_ACTIONS` (one sample per action type) for integration Task I-1.
- A1b (R21, R22): slot kinds map to learning moment kinds: `toy-shelf/label` to `label` or `label-plural`, `bath-pond/pond-word` to `one-or-many` with tags `['bath']`, `building/sum` to `wall`, `building/pattern` to `trim`, `post-box/sum` to `post-sash`, `post-box/fewest` to `post-pin`, `post-box/missing` to `parcel`, `post-box/note` to `note`, `salon/salon-word` to `salon-card`, `salon/pattern` to `beads`, `letter-lane/letters` to `letter-order`. Word tags: `pond` is `bath`, `shelf` is `found`, `salon` is `salon`. Name items are `name:<nameKey(name)>` (R20).
- A2 to A4: the moment controller drives platform's `ghostMove`, `ghostTap`, `ghostStop` and `moonbeam`.
- A7: the meadow mounts heartbeat's `MeadowLife`; an asking bubble calls `heartbeat.startWish(babyId)`.
- A8 to A11, A16, C1 (R13): picture ids are the bare word (`fox`, `mouse`, `hat`); other ids come from the art lists (`bg-building-yard`, `building-bath-pond`, `building-post-box`, `building-salon`, `item-toy-shelf`). An id that is not in the art lists is drawn from `places-svg.ts` and added to `art-src/lists/requests.txt`.
- A15: the parent corner uses core's `GameData` through `game.data` (`exportFile`, `saveExportFile`, `markExported`, `importText`, `readFileText`, `exclude`, `excludeLocalPlay`, `reset`), learning's `setCurrentOverride` through `game.dispatch({ type: 'game/override', payload })`, and settings through `game.dispatch({ type: 'game/setting', key, value })` with the keys in contracts `SettingKey`.
- A16 (R6): lines live in `content/lines/places.json` as `{ "scene": "places", "pack": "places", "lines": [...] }`. Use `fb-more-than-one` and `fb-just-one` (heartbeat) and `num-over-<n>` (audio numbers) instead of `pl-more-than-one`, `pl-just-one` and `nm-too-many-<n>`; word clips are `word-<word>`.
- A17, B10, C9 (R15): flows are `flows/places/<name>.flow.sh`; they source `flows/lib.sh` and then `flows/places/lib.sh` (place helpers only, `BASE` defaults to `MMH_URL`). Run with `MMH_LANE=places MMH_PORT=8773 bash flows/run.sh places/<name> ...`. Never port 8765.
- B2: moment pins carry `key` (`first-bath`, `tenth-baby`, `first-building`, `moving-day`), which makes each a recorded fact.
- B7 (R8): a note is a learning phrase with `act.kind === 'note'`: `cards`, `mark` (`stop` is `.`, `q` is `?`, `bang` is `!`), `spell` (the card index she spells) and `answer` (the gift). `note.sent.note` is the phrase id.
- C1 (R8): each card line is a learning pick with moment `salon-card`; cousins (Dot, Fen, Bex) and bead colours stay in `content/places/`.
- C8: pairing uses the sync client `sync` exported by `src/game.svelte.ts` (integration Task I-5): `sync.pair(code)`, `sync.status()`, `sync.unpair()`. Register the test hook `pairForTest(code)`.
- Decisions D6 and D14 are replaced by R27 and R8. The others stand.

**Batches.** A1: A2, A8 (pure part). A2: A1, A5, A6, A9 (logic). A3: A12 (logic), A14. A4: A1b, A3, A4, A16. A5: A10, A11. A6: A7, A13, A15, A17. B1: B1, B2, B3. B2: B4, B5, B6, B7, B8, B9. B3: B10. C1: C1, C3, C4, C5, C6. C2: C2. C3: C8, C9. Lane port 8773.

## Global Constraints

- The app is fully British English. No Dutch word, text, audio or help anywhere. Unicorns only (Queen Lumi, babies, cousins and builders are unicorns).
- No pressure mechanics: no streaks, timers shown to Emma, countdowns, "come back tomorrow", crying, begging, sick, sad or lost babies, currency or chance boxes. Nothing is ever taken away.
- Emma cannot read instructions: every goal is spoken by Elizabeth and shown with a picture, the moonbeam or the ghost hand. Goals are acts, never questions.
- Elizabeth (`narrator`) speaks every goal, hint, number, name and learning word. Lumi (`queen`) speaks story lines only. Babies (`foal`) speak giggles and tiny fixed words. Ids starting `word-`, `name-`, `num-`, `sound-` are narrator only. Numbers in line text are words, never digits.
- Every checked choice has at least three plausible options. Name tags and door plaques are hidden while she finds a name.
- One goal per screen. One new thing announced per visit (visit 1 exempt).
- Touch targets at least 64 x 64 px on the 1180 x 820 stage. Pointer events only. No hover, no double tap, no keyboard for Emma. Every interactive element has an `aria-label`.
- Animate only `transform` and `opacity`. No animated filters, shadows or SVG filters.
- Plain http on the home network tonight: no service worker and no `persist()` may be assumed. Use them when present.
- Free play is never checked and never logged except as a lasting change (outfit, ribbon, photo, decoration).
- Commits: small, plain English messages, no AI attribution, only files this plan owns.

## Review Focus

1. **A herd far larger than the spec examples (Emma's v2 herd may be 40 or more on Moving Day).** Openings, rows and posts must not pile up: one opening per visit, one post per visit, rows built one at a time. Pinned by the "herd of 45 on Moving Day" tests in Task A6 and Task A12.
2. **A place visited with nothing to serve** (the planner has no item for its slot, or every word lacks a clip or picture). The place must fall back to free play with a visible end, never an empty goal. Pinned by the `null` item tests in Task A9 (label), Task A11 (pond), Task A12 (walls) and Task B6 (sash and parcel).
3. **Leaving halfway** (the app hidden, the moon tapped, the iPad closed mid Building Day or mid label). Finished parts stay finished and nothing is logged twice. Pinned by the partial build tests in Task A12 and the duplicate event tests in Task A1.
4. **Merged logs from two devices** (Wave C sync) with the same plot built, the same opening announced or the same moment pin given twice. Earliest wins for one-time facts, latest wins for cosmetics. Pinned by the duplicate tests in Task A1 and Task B2.
5. **Names that have no clip, duplicate names and very short herds** in envelopes, Letter Lane and Home Book. The game must still offer three candidates or not log the result. Pinned by the post planning tests in Task B6 and the Letter Lane tests in Task C4.

---

## Decisions this plan makes

The spec leaves these open or says two things. The integrator can overrule any of them in one place.

| # | Topic | Decision |
|---|---|---|
| D1 | `miss` against `helped` | `helped` means the answer came after an idle-triggered level 2 hint or after the level 3 ghost hand. A miss followed by a right answer stays `miss`. Otherwise criterion C2 (helped below 15 percent) would equal the error rate by construction. Both count as a miss for mastery. |
| D2 | Label bubble before bubbles are explained | The toy shelf label bubble may show before visit 3, alone, while a spelling school step (S10) is open. It uses gems in slots, a tool she already knows, so it is not a new thing. This keeps acceptance check 11 (S10 in visit 1 or 2). |
| D3 | Bubble order | A jewel bubble and a hammer bubble take the first places (at most one each), then the least practised strand, ties in the order s, r, m. After 30 checked moments, free-play bubbles go first. |
| D4 | Opening queue | A fixed priority list: `bath-pond`, `bubbles`, `two-egg`, `dressing`, `post-box`, `notes`, `letter-lane`, `valley-map`, `asking-wishes`, `come-along`. Each is skipped while not earned or not released. `jewels` (the first fresh jewel) jumps the queue. Visit 1 announces nothing from the queue. |
| D5 | Village Lane plot in the meadow | The next jewel plot shows at the meadow edge as a gate with its picture sign and stones, so the jewel drag always happens in the meadow. The valley map opening is earned when a Village Lane plot has its first lit stone. |
| D6 | Release gate | `content/places/release.json` holds `{"release":"1.3"}`. Every plot, opening, pin set and novelty item has a `release`. Tonight everything up to 1.3 is on. |
| D7 | Wall maths | The wall part serves an `a+b` fact from the planner (slot kind `sum`). The wall needs `a+b` planks with `a` up. Without a served item the wall is a free build of ten that is not logged. |
| D8 | Row naming | A row is named with the heartbeat naming component in `purpose: 'row'`. The tag reads "<Name> Row". Row sign word is "stalls". |
| D9 | Sign spelling | The sign is a checked spelling moment only when the sign word has at least two own slots (the naming rule). It logs under her current spelling step. |
| D10 | Label check timing | Labels are checked when she slides the star, as in naming. At S10 level 3 the jar tips in once the stem slots are full. |
| D11 | S10 item for a jar of one | A jar of one logs the word's own ending item (`-s` or `-es`), because she chose not to add it. |
| D12 | Envelopes | Recipients are babies whose names can be reviewed, at most one per name, fewest pins first. Candidates are the recipients still waiting plus two other babies with different names. When fewer than three candidates exist, the act runs but is not logged. |
| D13 | Sash fill | The baby whose sash count equals the fact's first part gets the task. If none has it, the baby with no pins first receives that many pins as a gift from Lumi (not checked), then the task runs. |
| D14 | Notes | Fourteen fixed notes cover every S08 and S17 item as a word she spells (never the crowned first card). The note is picked by the served item. One `learn.result` per note with an item per exercised part. Item ids: `card-order` (S18), `capital-start` and `mark-.` (S21), `mark-?`, `mark-!` and `and` (S23), and the tricky words themselves (S08, S17). |
| D15 | Letter Lane | Arches are the 26 letters in alphabet order (two rows of 13). An arch lights when a baby's name tag starts with its letter. From S19 two checked acts exist: hang a small-letter flag on its capital arch, and put a missing arch back in the gap. |
| D16 | Salon colours and sizes | Bows, clips and stars on style cards are drawn as SVG by code with a colour and size, so every adjective phrase has a picture. |
| D17 | Moment pins | First bath (the bathed baby), tenth baby (the tenth hatched), first Building Day (the first baby hatched in a herd circle, else the newest baby), Moving Day (the first founder). They are derived and emitted once, like titles. |
| D18 | Parent PIN | Hold the small parent button (top right, 48 px visible, 64 px hit area) for 3 s, then a keypad of number words in a shuffled order. Default PIN `2468`, changeable in Settings. |
| D19 | "Let's write hat. Listen: hat." | Played as four clips at sentence boundaries: "Let's write!", the word, "Listen!", the word. |
| D20 | Report L3 | Review accuracy uses results on items of steps that were already passed when the result was made, because `learn.result` carries no box. |
| D21 | Novelty "something new" | A visit counts as new when it has an `opening.announced`, `building.done`, `step.passed`, `title.given` or `name.clipHeard` event. |

## File map

Every file below is owned by this workstream. No other workstream edits them. Files owned by others that this plan needs are in "Contracts I need".

### Pure logic (`src/core/places/`)

| Path | Responsibility |
|---|---|
| `src/core/places/types.ts` | Shared types and the minimal views of other workstreams' data (`GameEvent`, `ServedItem`, `BabyView`, `LearnerView`, `WordView`). |
| `src/core/places/state.ts` | `PlacesState` shape and `initPlaces()`. |
| `src/core/places/fold.ts` | `reducePlaces(state, event)`: folds every place event into `PlacesState`. |
| `src/core/places/content.ts` | Typed access to `content/places/*.json` and `released(release)`. |
| `src/core/places/actions.ts` | `PlaceAction` union and `applyPlaceAction()`, the only place that turns place acts into events. |
| `src/core/places/hints.ts` | Hint ladder state machine for one checked moment. |
| `src/core/places/bubbles.ts` | Who's-waiting bubble candidates and the pick of at most three. |
| `src/core/places/meadow.ts` | Which places show at the meadow edge, and their spots. |
| `src/core/places/openings.ts` | Opening queue: earned rules, order, one per visit. |
| `src/core/places/novelty.ts` | Novelty floor: when it is due and which reserve item comes. |
| `src/core/places/plurals.ts` | Ending sounds, heap layout, one-or-many planning and mistake kinds. |
| `src/core/places/labels.ts` | Toy shelf label task: plan, check, items. |
| `src/core/places/jars.ts` | Shelf view of labelled jars and the mice jar. |
| `src/core/places/pond.ts` | Bath wish planning at the Bath Pond. |
| `src/core/places/building.ts` | Rows, parts, wall, trim and sign tasks, plots ready to build. |
| `src/core/places/jewels.ts` | Jewel Box, jewel faces, the plot that takes the next jewel, lit stones. |
| `src/core/places/dressing.ts` | Wardrobe items and outfit changes. |
| `src/core/places/pins.ts` | Sashes, pouches, pin sets, set rewards, moment pins. |
| `src/core/places/post.ts` | Post waiting, envelopes, sash fill, fewest pins, parcels. |
| `src/core/places/notes.ts` | Notes to Lumi: pick, cards, marks, outcome, items. |
| `src/core/places/homebook.ts` | Home Book tabs, pages and baby page. |
| `src/core/places/salon.ts` | Cousins, style cards, bead patterns. |
| `src/core/places/valley.ts` | Valley map view and mist. |
| `src/core/places/letterLane.ts` | Arches and the S19 tasks. |
| `src/core/places/titles.ts` | Titles earned, titles to give, herd banner and Hundred Party. |
| `src/core/places/companions.ts` | Babies who come along to a place. |
| `src/core/places/year1.ts` | Asking bubbles (R33) and two-state wishes (R37). |
| `src/core/report/criteria.ts` | Report formulas for criteria E1 to L5, one named function each. |
| `tools/report.ts` | CLI: `node tools/report.ts <save.json>` prints the report. |

### UI parts (`src/ui/`)

| Path | Responsibility |
|---|---|
| `src/ui/moment.ts` | Moment controller: runs the hint ladder with timers, audio and effects, and registers the active moment for the test hook. |
| `src/ui/moment-deps.ts` | Default timers, clock, audio and dispatch for the moment controller. |
| `src/ui/ghost.ts` | Ghost hand store: `ghostMove`, `ghostTap`, `ghostStop`. |
| `src/ui/GhostHand.svelte` | Renders the ghost hand from `ghost.ts`. |
| `src/ui/Moonbeam.svelte` | The moonbeam over a target rectangle or a whole area. |
| `src/ui/ReplayButton.svelte` | The replay button next to the crown. |
| `src/ui/Bubble.svelte` | One who's-waiting picture bubble. |
| `src/ui/Heap.svelte` | A heap drawn by code from one picture. |
| `src/ui/MeadowArrow.svelte` | The glowing arrow home after a place's visible end. |
| `src/ui/Crown.svelte` | Emma's crown: opens the Home Book, holds the Jewel Box and title ribbons. |
| `src/ui/JewelBox.svelte` | The jewels on the crown and the jewel drag. |
| `src/ui/places-svg.ts` | Inline SVG for shapes drawn by code: jars, labels, bubbles, jewels, stones, plot signs, arches, sashes, envelopes, note cards, mist, ribbons, salon bows, clips and stars, wardrobe fallbacks. |

### Scenes (`src/scenes/places/`)

| Path | Responsibility |
|---|---|
| `src/scenes/places/Meadow.svelte` | The meadow hub: edges, bubbles, shelf, plots, crown, replay, moon, map scroll. |
| `src/scenes/places/PlotMarker.svelte` | A plot on the meadow: sign, stones, hammer. |
| `src/scenes/places/ToyShelf.svelte` | The shelf with jars, the mice jar and free play with jar things. |
| `src/scenes/places/LabelBubble.svelte` | The label spelling act. |
| `src/scenes/places/BathPond.svelte` | Bath Pond free play and bath wishes. |
| `src/scenes/places/BuildingDay.svelte` | Runs the parts of a Building Day in order. |
| `src/scenes/places/building/Walls.svelte` | Walls part (maths). |
| `src/scenes/places/building/Trim.svelte` | Trim part (pattern or free colours). |
| `src/scenes/places/building/Sign.svelte` | Sign part (spelling). |
| `src/scenes/places/building/Ribbon.svelte` | Ribbon cut. |
| `src/scenes/places/building/Circle.svelte` | Herd circle around the building egg. |
| `src/scenes/places/building/RowName.svelte` | Names the row. |
| `src/scenes/places/DressingCorner.svelte` | Lumi's Dressing Corner. |
| `src/scenes/places/PostBox.svelte` | Runs a Post Box visit. |
| `src/scenes/places/post/Envelopes.svelte` | Envelopes to babies. |
| `src/scenes/places/post/SashFill.svelte` | Fill a sash to ten from the pin pot. |
| `src/scenes/places/post/Fewest.svelte` | Set pin to the baby with the fewest pins. |
| `src/scenes/places/post/Parcel.svelte` | Plural parcel missing part. |
| `src/scenes/places/post/NoteDesk.svelte` | Notes to Lumi. |
| `src/scenes/places/HomeBook.svelte` | Home Book frame and tabs. |
| `src/scenes/places/book/HerdTab.svelte` | Herd pages of ten. |
| `src/scenes/places/book/BabyPage.svelte` | One baby's page. |
| `src/scenes/places/book/PinsTab.svelte` | Pin sets with silhouettes. |
| `src/scenes/places/book/BreedsTab.svelte` | Breeds with silhouettes. |
| `src/scenes/places/book/AlbumTab.svelte` | Photos. |
| `src/scenes/places/book/HomeTab.svelte` | Buildings with their opening day. |
| `src/scenes/places/book/SkyTab.svelte` | Sky unicorns. |
| `src/scenes/places/Salon.svelte` | Sparkle Salon: cousin card, then free styling, then photo. |
| `src/scenes/places/salon/StyleCard.svelte` | One card line at a time. |
| `src/scenes/places/salon/FreeStyle.svelte` | Free styling of her own babies. |
| `src/scenes/places/Valley.svelte` | The valley map. |
| `src/scenes/places/LetterLane.svelte` | Letter Lane. |
| `src/scenes/places/HundredParty.svelte` | The Hundred Party parade. |
| `src/scenes/places/MeadowWishes.svelte` | Asking bubbles and two-state wishes. |

### Parent corner (`src/parent/`)

| Path | Responsibility |
|---|---|
| `src/parent/parent.ts` | Pure helpers: PIN check, keypad order, name log, override options, device list, idle flags, missing clips. |
| `src/parent/ParentCorner.svelte` | Frame and sections, works in portrait and landscape. |
| `src/parent/PinGate.svelte` | Hold button and keypad. |
| `src/parent/Report.svelte` | Criteria table. |
| `src/parent/Names.svelte` | Tried and unknown names. |
| `src/parent/Overrides.svelte` | Step overrides and school flags. |
| `src/parent/Backup.svelte` | Export, import, exclude, reset. |
| `src/parent/Missing.svelte` | Missing clips. |
| `src/parent/IdleFlags.svelte` | Idle flags. |
| `src/parent/Settings.svelte` | PIN, birthday, skip-wish switch. |
| `src/parent/Pairing.svelte` | Pairing and sync status. |

### Glue (`src/places/`)

| Path | Responsibility |
|---|---|
| `src/places/scenes.ts` | `placeScenes`: scene id to component, spread into the router. |
| `src/places/serve.ts` | Pure adapter from the learning workstream's planner picks to `ServedItem`, and back to its item ids for logging. |
| `src/places/plan.ts` | `serve`, `canServeSlot`, `visitPlan`, `spellStepNow`, `wordViews`: the store-bound wrappers place scenes call. |
| `src/places/nav.ts` | `enterPlace`, `leavePlace`, `toMeadow` helpers that dispatch place events and switch scene. |
| `src/places/session.ts` | In-memory, per visit: last touched babies, explained-once flags for the ghost hand. Not saved. |
| `src/places/hook.ts` | `placesHook()`: the `window.__game.places` test API. |

### Content, audio, tests, flows

| Path | Responsibility |
|---|---|
| `content/places/release.json` | The current release. |
| `content/places/plots.json` | Building and place plots, rows, signs, map positions. |
| `content/places/decorations.json` | The 12 decoration plots. |
| `content/places/openings.json` | Opening queue order with lines. |
| `content/places/novelty.json` | Novelty reserve (8 items). |
| `content/places/pin-sets.json` | Pin sets and moment pins. |
| `content/places/dressing.json` | Crowns, capes, garlands. |
| `content/places/notes.json` | The 13 notes to Lumi. |
| `content/places/cousins.json` | Dot, Fen and Bex. |
| `content/places/salon.json` | Salon words, phrases, "and" pairs, bead colours. |
| `content/places/year1.json` | Asking sets and two-state objects. |
| `content/places/jewels.json` | Jewel faces for steps whose first item is not a grapheme, and number jewel stones. |
| `content/places/letters.json` | The 26 letters with sound and name clip. |
| `public/audio/places/lines.json` | Every line this workstream needs (generated by the audio workstream). |
| `tests/places/*.test.ts`, `tests/places/helpers.ts`, `tests/report/criteria.test.ts` | Vitest suites. |
| `flows/places/lib.sh` and `flows/places/*.sh` | playwright-cli flows. |
| `docs/v3/plan/places.md` | This plan. |

## Contracts I need

These are assumptions about other workstreams. Each is the exact shape this plan codes against. Where a real interface differs, the integrator changes the adapter named in the right column, not the place code.

### From core (events, folds, store, learning, planner, save)

| What | Exact shape I assume | If it differs |
|---|---|---|
| Event | `type Event = { id: string; hlc: string; t: number; dev: string; v: number; type: string; [k: string]: unknown }`, payload fields flat on the event. `src/core/places/types.ts` declares `GameEvent` with this shape. | Edit `GameEvent` in `types.ts`. |
| Event types registry | Core's schema accepts these place payloads: `place.enter {place}`, `place.leave {place}`, `learn.result` (spec 3.2 fields: `strand, step, carrier, items: {item, result}[], result, ms, scaffold, error, place, probe`), `learn.idle {strand, step, place}`, `learn.override {strand, step, as}`, `care.done {baby, care}`, `pin.given {baby, pin, source, key?}`, `jewel.placed {jewel, plot}`, `jar.labelled {jar, word, plural, count, picture, baby}`, `building.part {plot, part}`, `building.done {plot}`, `row.named {row, name}`, `opening.announced {opening}`, `title.given {title}`, `outfit.saved {baby, outfit}`, `settings.set {key, value}`, `exclude {device}` (named `device` because `dev` is already the envelope field of every event), and three new types: `note.sent {note, mark}`, `photo.taken {place, cousin, babies}`, `ribbon.set {baby, on}`. | Core adds the three new types to its registry. |
| Events I read but do not make | `visit.start {visit, tz}`, `visit.end {visit}`, `egg.hatched {baby, breed, kind, source}` with `source: 'nest' \| 'building'`, `import.v2 {hash, babies: string[], nights: number}` (baby ids in hatch order), `step.passed {strand, step}`, `name.built {gems, phonemes, route, outcome, name}`, `name.clipHeard {baby}`, `sky.named {index, name}`, `audio.missing {clip}` (named `clip` because `id` is the envelope's event id), `baby.named {baby, name}`. | Adjust the matching `case` in `fold.ts`. |
| World composition | `World` has `places: PlacesState`. `foldWorld` calls `reducePlaces(world.places, e)` for every event in fold order, after the `exclude` filter. The snapshot stores `world.places` as plain JSON. | Core composes it. |
| Actions | Core's `apply(action, world, learner)` delegates every action whose `type` starts with `place/` to `applyPlaceAction(action, { world, learner, make })`, where `make(type: string, payload: Record<string, unknown>): Event` creates one event with id, hlc, t, dev and v. | Core's `apply`. |
| Store | `import { game } from '../../game.svelte'` gives `game.world: World`, `game.learner: Learner`, `game.content: Content`, `game.planContext(): PlanContext`, `game.scene: string`, `game.params: Record<string, unknown>`, `game.dispatch(action): void`, `game.go(scene: string, params?: Record<string, unknown>): void`, `game.now(): number`, `game.rng(): number`. After each fold the store calls `titlesToGive(...)` and `momentPinsDue(...)` from this plan and dispatches the missing `title.given` and `pin.given` once (spec 4.4, recorded facts). | Wrap in `src/places/nav.ts`. |
| Herd view | `world.herd: Baby[]` in hatch order, where every `Baby` has at least the fields of `BabyView`: `{ id, name, ordinal, breed, stage, hatchIndex, hatchedAt, hasClip, firstSound, colours: {body, mane, mane2}, traits?, stickers? }`. `world.sky: { index: number; name: string }[]` holds the named sky unicorns (heartbeat folds `sky.named`). `ordinal` is 1 for a first Tim, 2 for Tim the Second. `firstSound` is the first-sound group from the name bank, or from the first gem for an unknown name. | Map in `src/places/nav.ts` `herdView()`. |
| Learner view | `toLearnerView(learner): LearnerView` with `{ current: Record<'r'\|'s'\|'m', StepId \| null>, passed: {step, strand, t, visit}[], placed: {step, strand}[], placementEnded: Record<'r'\|'s'\|'m', boolean>, reached(step): boolean, scaffold(strand, step): 1\|2\|3, passedOrPlaced(step): boolean }`. `reached(step)` is true when the step is passed, placed, current or below the current step in its ladder. | Core exports it from `src/core/learning/view.ts`. |
| Planner | The learning workstream's planner as written in `docs/v3/plan/learning.md`: `nextItem(ctx: PlanContext, req: ItemRequest, rng): Pick \| null`, `nextNameReviews(ctx, herd, n, 'envelope', rng): Pick[]`, `visitStats(l): VisitStats`, `spellingShareLow(l, c)`, `wantsLabelBubble(l, c)`, `isTired(l, c)`, `currentStep(l, c, strand)`, `learnResultPayload(pick, outcome)`. Place code never calls them directly: it calls `serve(strand, place, kind): ServedItem \| null`, `canServeSlot(place, kind): boolean`, `visitPlan()` and `spellStepNow()` from `src/places/plan.ts`, which go through the adapter in Task A1b. The store exposes `game.planContext(): PlanContext` and `game.content` for it. `ServedItem = { strand, step, items: string[], carrier: string, scaffold: 1\|2\|3, probe: boolean, kind, log?, count? }`, where `items` are this plan's canonical item names and `log` the planner's own item ids. Maths carriers are `"a+b"` (a shown, b to place), `fewest`, or a pattern `AB`, `ABB`, `ABC`, `AAB`. Word carriers are word ids. | Task A1b adapter. |
| Slot kinds I declare | `toy-shelf/label` (s: any spelling step with a pictured word, plus S03D, S06, S10), `bath-pond/pond-word` (r: R19 only, words tagged `pond`), `building/sum` (m: `a+b` facts of M05, M09 to M13), `building/pattern` (m: M08), `post-box/sum` (m), `post-box/fewest` (m: M03), `post-box/missing` (m: `a+b` with `a+b` up to 10), `post-box/note` (s: S08, S17, S18, S21, S23), `salon/salon-word` (r: words tagged `salon`, R19, R27, R28), `salon/pattern` (m: M08), `letter-lane/letters` (s: S19), `meadow-wishes/asking` (r: R33), `meadow-wishes/two-state` (r: R37). The ladder files list these place ids under each step's `places`. | Content and planner workstreams. |
| Current spelling step | `currentStep(l, c, 's')` from the learning workstream, wrapped as `spellStepNow(): StepId \| null` in `src/places/plan.ts` (used to log sign spelling). | Task A1b. |
| Save | `exportFile(): Promise<Blob>`, `importFile(file: File): Promise<{ added: number; v2: boolean }>`, `resetDevice(): Promise<void>`, `deviceId(): string`, `allEvents(): Event[]` (including excluded devices), `storageStatus(): { persisted: boolean \| null; standalone: boolean; writeFailing: boolean; lastExport: number \| null }` from `src/core/save/index.ts`. | Wrap in `src/parent/Backup.svelte`. |
| Sync (Wave C) | `pair(code: string): Promise<'ok' \| 'bad-code' \| 'blocked' \| 'offline'>`, `syncNow(): Promise<void>`, `status(): { paired: boolean; lastSuccess: number \| null; lastError: string \| null; needsPairing: boolean }` from `src/sync/index.ts`. | Wrap in `src/parent/Pairing.svelte`. |
| Test hook base | `window.__game` with `state()`, `jump(scene)`, `seed(n)`, `fast(on)`, `mute(on)`, `setNow(ms)`, `setStep(strand, step)`, `answer()`, `wrong()`, `idle()`, `play()` (taps Play), `herd(n)` (hatches and names n babies through real events), `newVisit()` (ends the visit and starts the next one 6 hours later), `importFixture(name)`, `setScaffold(strand, step, level)` (sets a step's scaffold level for flows), `pass(strand, step)` (records a real `step.passed` for flows), `errors(): string[]` (console errors and uncaught errors captured in the test build). The test build sets `window.EmmaAudio` (from `shared/audio.js`) so flows can read `EmmaAudio.missing`. Core's `answer()`, `wrong()` and `idle()` call `activeMoment()?.hookAnswer()` and friends from `src/ui/moment.ts` when a place moment is active. Core's `test-hook.ts` sets `window.__game.places = placesHook()`. | Core's `src/test-hook.ts`. |
| Router | The scene router spreads `placeScenes` from `src/places/scenes.ts` into its map. | Skeleton's router. |
| Vitest | `vitest.config.ts` includes `tests/**/*.test.ts`. Pure tests need no DOM. | Skeleton. |
| npm scripts | `npm test` (vitest run), `npm run check` (svelte-check), `npm run check:content`, `npm run build:test` (vite build --mode test). Core's Node server serves the lane test build at `http://127.0.0.1:8773/games/moon-meadow-home/` (master plan R15). | Skeleton. |
| TS imports | `.ts` extensions in relative imports (Node type stripping, as core's `events.ts`). No enums. `allowImportingTsExtensions` on. | Skeleton tsconfig. |
| Visit time zone | `visit.start.tz` is the offset in minutes east of UTC (`-new Date().getTimezoneOffset()`), so Cyprus in winter is `120`. | Core events. |
| Ladder item ids | R19 and S10 items are `-s`, `-es` and (R19 only) `none`. S18: `card-order`. S21: `capital-start`, `mark-.`. S23: `mark-?`, `mark-!`, `and`. S08 and S17: the tricky words as written (`I` with a capital). S19: `pair-<letter>` and `order-<letter>`. R33: `mark-?`, `mark-.`, `mark-!`. R37: `un` and `base`. M08 carriers: `AB`, `ABB`, `ABC`, `AAB`. M03 carrier: `fewest`. | Content workstream ladder files. |
| Settings read by others | The heartbeat reads `world.places.settings.skipWishAfterThree` (spec 2.2, off by default). | Heartbeat. |
| Local save server | `node server/admin.ts pair --family test` prints a six-digit pairing code (used by the Wave C parent flow). | Sync workstream. |

### From heartbeat (nest, hatch, naming, wishes, stalls, goodnight, Moving Day)

| What | Exact shape I assume |
|---|---|
| Meadow life layer | `src/scenes/heartbeat/MeadowLife.svelte` with props `{ onbabytouch?: (id: string) => void; ribbonMode?: boolean; ribbons?: Record<string, boolean>; ontieribbon?: (id: string) => void }`. It renders the nest spot, care stations and up to 12 babies, and handles care free play. `Meadow.svelte` mounts it as its middle layer. |
| Hatch and name | `src/scenes/heartbeat/HatchAndName.svelte` with props `{ breed: string; source: 'building'; plot: string; ondone: (babyId: string) => void }`. It dispatches its own `egg.hatched` and `baby.named`. |
| Naming for a row | `src/scenes/heartbeat/Naming.svelte` with props `{ purpose: 'baby' \| 'row'; onnamed: (name: string) => void }`. |
| Current egg breed | `currentEggBreed(world, learner): string` from `src/core/eggs/index.ts`. |
| Gem tools | `src/ui/GemSlots.svelte` props `{ slots: { g: string; own: boolean; ending?: boolean; crowned?: boolean }[]; tray: { g: string; ending?: boolean }[]; onslide: (built: (string \| null)[]) => void; onplace?: (slot: number, g: string) => void; popWrong?: number[]; hum?: number \| null }`. Gems with `ending: true` render as crescent gems that click onto a crescent dock after the last slot. Gift slots are prefilled and locked. The slider plays the built graphemes with `sound()`. |
| Stones | `src/ui/StoneTray.svelte` props `{ values: number[]; scaffold: 1 \| 2 \| 3; ondrop: (value: number, target: string) => void; targets: string[] }`. |
| Print with dots | `src/ui/PrintWithDots.svelte` props `{ text: string; dots: 500 \| 300 \| null; silent?: string[]; hearts?: number[] }` (`hearts`: token indexes of tricky words drawn with a glowing heart). |
| Unicorn | `src/art/Unicorn.svelte` props `{ baby: BabyView; pose: 'stand' \| 'sit' \| 'hop' \| 'sleep'; size: number; outfit?: Outfit; face?: boolean }`. `face: true` draws the head only (for bubbles and hidden-tag candidates). |
| Gift slots | `ownSlots(graphemes: string[], learner: Learner): boolean[]` from `src/core/naming/gifts.ts`. |
| Stem trays | `planTray(graphemes: string[], step: StepId, scaffold: 1 \| 2 \| 3, rng): string[]` from `src/core/phonics/tray.ts` (target gems plus distractors). |
| Name review allowed | `canReviewName(baby: BabyView, learner: Learner): boolean` from `src/core/naming/review.ts`. |
| Wish scene | `game.go('wish', { baby: string, source: 'bubble' })` runs a reading wish for that baby and returns to the meadow. |
| Stall rows | Heartbeat's stalls read `rowsBuilt(world.places)` from `src/core/places/building.ts` to know which doors exist and who sleeps in the Moonbeam Camp. |
| Openings | Heartbeat calls `openingDue(...)`, `isAnnounced(world.places, 'two-egg')` and dispatches `{type: 'place/announce', opening: 'two-egg'}` when it shows the two-egg choice. |
| Plural lines | Heartbeat's one-or-many wishes reuse `planOneOrMany`, `oneOrManyMistake` and the clips `pl-more-than-one`, `pl-just-one` from this plan. |
| Novelty unlocks | Heartbeat reads `world.places.unlocked` (Task B3): `stall-lanterns` and `stall-flowerboxes` decorate the stall doors, `egg-skin-snowflake` and `egg-skin-blossom` are extra speckled egg skins the nest may offer. |

### From content, art and audio

| What | Exact shape I assume |
|---|---|
| Words | `words(): WordView[]` from `src/core/content.ts`, each `{ id, word, graphemes, picture, rStep, sStep, tags, plural? }`. Tags used here: `pond` (duck, boat, cup, shell), `salon` (bow, clip, beads, comb, brush, star, bell, shell, ribbon), `shelf` (any single object a baby can find). Plural entries carry `plural: { word, ending, graphemes }`. |
| Steps | `ladder(strand): StepView[]` with `{ id, strand, items: string[], places: string[], levels: 1 \| 2 \| 3, school?: boolean, contrast?: boolean }`. |
| Breeds | `breeds(): { id: string; egg: string \| null; building: string \| null; picture: string }[]`. |
| Art | `src/art/Sprite.svelte` props `{ id: string; w: number; h?: number; alt?: string }`, and `hasArt(id: string): boolean` from `src/art/manifest.ts`, reading `public/art/manifest.json`. A missing id renders nothing, so every scene checks `hasArt` and falls back to `places-svg.ts`. Art ids I request are listed per wave in Tasks A16, B10 and C9. |
| Audio | `src/audio/index.ts`: `say(id): Promise<void>`, `sayAll(ids): Promise<void>`, `sayName(name, mark: '!' \| '?'): Promise<void>`, `hasName(name): boolean`, `sound(g): Promise<void>`, `sfx(name): Promise<void>`, `stop(): void`, `act(): void`, `preloadScene(id): Promise<void>`, `release(id): void`, `has(id): boolean`. The `places` pack in `public/audio/places/` is added with `addPack('places', 'audio/places/')`. Word clips are `word-<word>`, number clips `num-<n>` with digits in the id ("num-7" says "Seven."). |

### What this plan gives other workstreams

| Export | Signature | Used by |
|---|---|---|
| `reducePlaces`, `initPlaces` | `(s: PlacesState, e: GameEvent) => PlacesState` (mutates and returns `s`), `() => PlacesState` | Core `foldWorld` |
| `applyPlaceAction` | `(a: PlaceAction, ctx: { world: { places: PlacesState }; make: MakeEvent }) => GameEvent[]` | Core `apply` |
| `rowsBuilt` | `(s: PlacesState) => number` | Heartbeat stalls |
| `openingDue`, `isAnnounced` | see Task A6 | Heartbeat (two-egg) |
| `titlesToGive`, `momentPinsDue` | see Tasks C5 and B2 | Core store |
| `planOneOrMany`, `oneOrManyMistake` | see Task A8 | Heartbeat wishes |
| `createMoment`, `activeMoment` | see Task A3 | Heartbeat scenes, core test hook |
| `ghostMove`, `ghostTap`, `ghostStop`, `Moonbeam`, `ReplayButton`, `Bubble`, `Heap`, `Crown` | see Tasks A3, A4, A8 | Heartbeat scenes |
| Clips `pl-more-than-one`, `pl-just-one`, `pl-look-in-jar`, `pl-mice`, `nm-too-many-1` to `nm-too-many-9` | `public/audio/places/lines.json` | Heartbeat |
| `report` | `(events: GameEvent[], now: number) => Report` | `tools/report.ts`, parent corner |


### Reconciliation with `docs/v3/plan/learning.md`

The learning plan was written at the same time. Where it covers the same ground, these are the differences and the proposed outcome. Task A1b is the only code that knows the learning plan's shapes, so each change below stays in one file.

| Topic | learning.md | This plan | Proposal for the integrator |
|---|---|---|---|
| Asking for an item | `nextItem(ctx, req)` with moment kinds; `Pick` with structured carriers | `serve(strand, place, kind)` returning `ServedItem` | The adapter in Task A1b maps one to the other. Place code is unchanged. |
| Item ids | `r:g:ai`, `s:end:es`, `m:miss:10-7` | Canonical names inside place logic (`ai`, `-es`, `mark-?`, `card-order`) | The adapter maps the learning ids to canonical names on the way in and `logItems` logs the learning ids on the way out. |
| Notes, salon phrases, asking bubbles, two-state wishes | Phrase packs `phrases-notes`, `phrases-salon`, `phrases-meadow` with clips `phrase-<id>` | `notes.json`, `salon.json`, `year1.json`, clips in the `places` pack | Keep one set. Proposal: this plan's content and clips (final text, about 1,700 credits); the learning plan keeps phrase packs for `tricky-act`, `basket-and` and `basket-adj`, and its phrase items stay the logged items. |
| Walls | No wall moment kind | Walls request `post-sash` and `parcel` moments | The learning plan adds a `wall` moment, or accepts this reuse. |
| Jewels | `jewels(l, c)` with `face: string[]` | `jewelBox` with `jewels.json` | Use the learning plan's `jewels()` for which jewels exist and are fresh; `jewelFace` uses `face[0]` as the label when present and `jewels.json` only adds the sound or clip. |
| Report | `criteria(events, c)` for C2 and L1 to L5 (with item boxes for L3), `learnerReport()` | `src/core/report/criteria.ts` for E1 to L5 | E1 to E5 and C1 from this plan; C2 and L1 to L5 from the learning plan's `criteria()` once it exists, merged in `report()`. `tools/report.ts` stays in this plan. |
| Word tags | `bath`, `food`, `clothes`, `toy`, `care`, `found` | `pond`, `salon`, `shelf` | `pond` is `bath`; `shelf` is `found` or `toy`; `salon` is a new tag on bow, clip, beads, comb, brush, star, bell, shell and ribbon. `wordViews()` in `plan.ts` maps them. |
| Releases | `'1.0'` to `'1.3'` and `'later'` | Numbers, `"2"` and up for later plots | Compatible: `released('later')` is false because `Number('later')` is not a number. |
| Words | `RawWord { w, gpcs, pic, kind, tags }` | `WordView { id, word, graphemes, picture, tags, plural }` | `wordViews()` maps them: `id` and `word` are `w`, `graphemes` are the GPC texts, `picture` is `pic`. |
| Envelope names | `nextNameReviews(ctx, herd, n, 'envelope', rng): Pick[]` | `planPost` takes `canReviewName(baby)` | `canReviewName` is true for the babies `nextNameReviews` returns for a large `n`; `planPost` keeps the fewest-pins order and the distinct-name rule. The envelope result is logged with the pick's `name:<babyId>` item. |

---

# Wave A: first playable (items 9, 10, 12 and 13)

Wave A is done when Tasks A1, A1b and A2 to A17 pass and the Wave A flows in Task A17 pass at all four viewports. Wave B starts after that.

### Task A1: Place types, state, fold and actions

**Files:**
- Create: `src/core/places/types.ts`, `src/core/places/state.ts`, `src/core/places/fold.ts`, `src/core/places/actions.ts`, `src/core/places/content.ts`, `content/places/release.json`
- Test: `tests/places/helpers.ts`, `tests/places/fold.test.ts`, `tests/places/actions.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks. Core's event shape as in "Contracts I need".
- Produces: every type below, `initPlaces()`, `currentVisit(s)`, `reducePlaces(s, e)`, `applyPlaceAction(a, ctx)`, `released(release)`, `CURRENT_RELEASE`, and the test helpers `ev`, `foldAll`, `rng`, `baby`, `learner`, `word`, `served`.

- [ ] **Step 1: Write the types**

`src/core/places/types.ts`:

```ts
export type GameEvent = { id: string; hlc: string; t: number; dev: string; v: number; type: string; [k: string]: unknown };
export type Strand = 'r' | 's' | 'm';
export type AnyStrand = Strand | 'name';
export type StepId = string;
export type PlotId = string;
export type OpeningId = string;
export type ClipId = string;
export type Rng = () => number;
export type Result = 'first' | 'miss' | 'helped';
export type ErrorTag = 'vowel' | 'dutch' | 'reversal' | 'off-by-one' | 'one-hour-off' | 'other';
export type ItemResult = { item: string; result: Result };
export type Mark = '.' | '?' | '!';
export type PinSource = 'pot' | 'post' | 'moment' | 'import' | 'gift';
export type PlaceId =
  | 'meadow' | 'toy-shelf' | 'bath-pond' | 'building-day' | 'dressing' | 'post-box' | 'home-book'
  | 'salon' | 'letter-lane' | 'valley' | 'hundred-party' | 'meadow-wishes' | 'parent';

export type LearnResultPayload = {
  strand: AnyStrand; step: StepId; carrier: string; items: ItemResult[]; result: Result;
  ms: number; scaffold: 1 | 2 | 3; error: ErrorTag | null; place: PlaceId; probe: boolean;
};

export type ServedItem = {
  strand: Strand; step: StepId; items: string[]; carrier: string; scaffold: 1 | 2 | 3; probe: boolean;
  kind: 'current' | 'review' | 'mixed' | 'school' | 'side';
  /** The planner's own item ids, logged in learn.result (Task A1b). Absent in unit tests. */
  log?: string[];
  /** Things in the jar or heap when the planner chose the count (plural carriers). */
  count?: number;
};

export type WordView = {
  id: string; word: string; graphemes: string[]; picture: string; rStep: StepId; sStep: StepId; tags: string[];
  plural?: { word: string; ending: 's' | 'es'; graphemes: string[] };
};

export type BabyView = {
  id: string; name: string; ordinal: number; breed: string; stage: 'baby' | 'foal' | 'young';
  hatchIndex: number; hatchedAt: number; hasClip: boolean; firstSound: string | null;
  colours: { body: string; mane: string; mane2: string };
  traits?: { shiny: boolean; speckled: boolean; golden: boolean; founder: boolean };
  stickers?: string[];
};

export type StepView = { id: StepId; strand: Strand; items: string[]; places: string[]; levels: 1 | 2 | 3; school?: boolean; contrast?: boolean };

export type LearnerView = {
  current: Record<Strand, StepId | null>;
  passed: { step: StepId; strand: Strand; t: number; visit: string }[];
  placed: { step: StepId; strand: Strand }[];
  placementEnded: Record<Strand, boolean>;
  reached(step: StepId): boolean;
  scaffold(strand: Strand, step: StepId): 1 | 2 | 3;
  passedOrPlaced(step: StepId): boolean;
};

export type Outfit = { crown?: string; cape?: string; garland?: string; bow?: string; beads?: string; mist?: boolean; sash?: boolean };
```

- [ ] **Step 2: Write the test helpers**

`tests/places/helpers.ts`:

```ts
import type { BabyView, GameEvent, LearnerView, ServedItem, StepId, WordView } from '../../src/core/places/types.ts';
import { initPlaces, type PlacesState } from '../../src/core/places/state.ts';
import { reducePlaces } from '../../src/core/places/fold.ts';

let seq = 0;
export const T0 = Date.UTC(2026, 11, 1, 16, 0, 0);
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export function resetSeq(): void { seq = 0; }

export function ev(type: string, payload: Record<string, unknown> = {}, t?: number): GameEvent {
  seq += 1;
  return { id: `test:${seq}`, hlc: String(seq).padStart(12, '0'), t: t ?? T0 + seq * 1000, dev: 'test', v: 1, type, ...payload };
}

export function foldAll(events: GameEvent[]): PlacesState {
  const s = initPlaces();
  for (const e of events) reducePlaces(s, e);
  return s;
}

export function rng(seed = 1): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function baby(id: string, name: string, extra: Partial<BabyView> = {}): BabyView {
  return {
    id, name, ordinal: 1, breed: 'moon', stage: 'baby', hatchIndex: 0, hatchedAt: T0, hasClip: true,
    firstSound: name[0].toLowerCase(), colours: { body: '#fde', mane: '#cdf', mane2: '#fff' }, ...extra,
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

export function word(id: string, graphemes: string[], extra: Partial<WordView> = {}): WordView {
  return { id, word: id, graphemes, picture: `${id}`, rStep: 'R05', sStep: 'S04', tags: [], ...extra };
}

export function served(strand: 'r' | 's' | 'm', step: StepId, carrier: string, items: string[], extra: Partial<ServedItem> = {}): ServedItem {
  return { strand, step, carrier, items, scaffold: 1, probe: false, kind: 'current', ...extra };
}
```

- [ ] **Step 3: Write the failing fold tests**

`tests/places/fold.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { currentVisit, initPlaces } from '../../src/core/places/state.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);

describe('place fold', () => {
  it('starts empty', () => {
    const s = initPlaces();
    expect(s.herd).toBe(0);
    expect(s.visits).toEqual([]);
    expect(currentVisit(s)).toBeNull();
  });

  it('counts the herd from hatches and the v2 import, once per baby', () => {
    const s = foldAll([
      ev('import.v2', { hash: 'h', babies: ['a', 'b', 'c'], nights: 12 }),
      ev('import.v2', { hash: 'h', babies: ['a', 'b', 'c'], nights: 12 }),
      ev('egg.hatched', { baby: 'd', breed: 'moon', kind: 'moon', source: 'nest' }),
      ev('egg.hatched', { baby: 'd', breed: 'moon', kind: 'moon', source: 'nest' }),
      ev('egg.hatched', { baby: 'e', breed: 'bubble', kind: 'building', source: 'building' }),
    ]);
    expect(s.herd).toBe(5);
    expect(s.hatchOrder).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(s.circleBabies).toEqual(['e']);
    expect(s.nights).toBe(12);
  });

  it('counts nest hatches per visit, not circle hatches', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 0 }),
      ev('egg.hatched', { baby: 'a', breed: 'moon', kind: 'moon', source: 'nest' }),
      ev('egg.hatched', { baby: 'b', breed: 'bubble', kind: 'building', source: 'building' }),
    ]);
    expect(s.visits[0].hatches).toBe(1);
  });

  it('grants the rows an imported herd needs', () => {
    const ids = Array.from({ length: 23 }, (_, i) => `b${i}`);
    expect(foldAll([ev('import.v2', { hash: 'h', babies: ids, nights: 3 })]).importRows).toBe(3);
  });

  it('numbers visits and marks a visit with something new', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 120 }), ev('visit.end', { visit: 'v1' }),
      ev('visit.start', { visit: 'v2', tz: 120 }), ev('opening.announced', { opening: 'bath-pond' }),
    ]);
    expect(s.visits.map((v) => [v.id, v.index, v.newThing])).toEqual([['v1', 1, false], ['v2', 2, true]]);
    expect(s.announced).toEqual({ 'bath-pond': 'v2' });
    expect(currentVisit(s)?.announced).toEqual(['bath-pond']);
  });

  it('counts a passed step, a title and a heard name clip as new', () => {
    for (const e of [['step.passed', { strand: 's', step: 'S20' }], ['title.given', { title: 'stable-keeper' }], ['name.clipHeard', { baby: 'a' }]] as const) {
      const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev(e[0], e[1])]);
      expect(s.visits[0].newThing).toBe(true);
    }
  });

  it('keeps the earliest building.done, opening and jewel', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 0 }),
      ev('building.done', { plot: 'bath-pond' }, 1000), ev('building.done', { plot: 'bath-pond' }, 5000),
      ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'S20', plot: 'decor-fountain' }),
      ev('opening.announced', { opening: 'bubbles' }), ev('visit.start', { visit: 'v2', tz: 0 }), ev('opening.announced', { opening: 'bubbles' }),
    ]);
    expect(s.buildings['bath-pond'].doneT).toBe(1000);
    expect(s.jewels).toEqual({ S20: 'salon' });
    expect(s.announced).toEqual({ bubbles: 'v1' });
    expect(s.visits[1].newThing).toBe(false);
  });

  it('keeps finished parts when a Building Day stops halfway, without duplicates', () => {
    const s = foldAll([
      ev('building.part', { plot: 'row-2', part: 'walls' }), ev('building.part', { plot: 'row-2', part: 'walls' }),
      ev('building.part', { plot: 'row-2', part: 'trim' }),
    ]);
    expect(s.buildings['row-2']).toEqual({ parts: ['walls', 'trim'], done: false, doneT: null });
  });

  it('takes the latest row name, outfit and ribbon', () => {
    const s = foldAll([
      ev('row.named', { row: 2, name: 'Rose' }), ev('row.named', { row: 2, name: 'Lily' }),
      ev('outfit.saved', { baby: 'a', outfit: { crown: 'gold-crown' } }), ev('outfit.saved', { baby: 'a', outfit: { cape: 'pink-cape' } }),
      ev('ribbon.set', { baby: 'a', on: true }), ev('ribbon.set', { baby: 'a', on: false }),
    ]);
    expect(s.rowNames).toEqual({ 2: 'Lily' });
    expect(s.outfits.a).toEqual({ cape: 'pink-cape' });
    expect(s.ribbons.a).toBe(false);
  });

  it('gives every pot pin and drops a keyed pin given twice', () => {
    const s = foldAll([
      ev('pin.given', { baby: 'a', pin: 'star', source: 'pot' }), ev('pin.given', { baby: 'a', pin: 'star', source: 'pot' }),
      ev('pin.given', { baby: 'a', pin: 'moment-first-bath', source: 'moment', key: 'moment:first-bath' }),
      ev('pin.given', { baby: 'b', pin: 'moment-first-bath', source: 'moment', key: 'moment:first-bath' }),
    ]);
    expect(s.pins.a.map((p) => p.pin)).toEqual(['star', 'star', 'moment-first-bath']);
    expect(s.pins.b).toBeUndefined();
  });

  it('marks the post, notes, gifts and cousins of a visit', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 0 }),
      ev('pin.given', { baby: 'a', pin: 'rose', source: 'post', key: 'post:v1:0' }),
      ev('note.sent', { note: 'swing', mark: '?', gift: 'gift-swing' }), ev('note.sent', { note: 'swing', mark: '?', gift: 'gift-swing' }),
      ev('photo.taken', { place: 'salon', cousin: 'dot', babies: ['a'] }),
    ]);
    expect(s.visits[0]).toMatchObject({ post: true, notes: 2, cousins: ['dot'] });
    expect(s.gifts).toEqual(['gift-swing']);
    expect(s.photos).toHaveLength(1);
  });

  it('unlocks a novelty item when it is announced', () => {
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'novelty:pinset-shells' })]);
    expect(s.unlocked).toEqual(['pinset-shells']);
  });

  it('remembers the first bath only and folds settings', () => {
    const s = foldAll([
      ev('care.done', { baby: 'a', care: 'bath' }), ev('care.done', { baby: 'b', care: 'bath' }),
      ev('care.done', { baby: 'c', care: 'brush' }), ev('settings.set', { key: 'parentPin', value: '1357' }),
    ]);
    expect(s.firstBath).toBe('a');
    expect(s.settings.parentPin).toBe('1357');
  });

  it('ignores events it does not know', () => {
    const s = foldAll([ev('learn.result', { strand: 'r' }), ev('something.else', {})]);
    expect(s).toEqual(initPlaces());
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npx vitest run tests/places/fold.test.ts`
Expected: FAIL, cannot resolve `../../src/core/places/state.ts`.

- [ ] **Step 5: Write state and fold**

`src/core/places/state.ts`:

```ts
import type { Mark, Outfit, PinSource } from './types.ts';

export type VisitRec = { id: string; index: number; start: number; tz: number; newThing: boolean; announced: string[]; post: boolean; cousins: string[]; notes: number; hatches: number };
export type Jar = { jar: string; word: string; plural: boolean; count: number; picture: string; baby: string | null; t: number };
export type BuildingRec = { parts: string[]; done: boolean; doneT: number | null };
export type PinOnBaby = { pin: string; source: PinSource; t: number };
export type Photo = { place: string; cousin: string | null; babies: string[]; t: number };

export type PlacesState = {
  herd: number;
  hatchOrder: string[];
  circleBabies: string[];
  importRows: number;
  nights: number;
  visits: VisitRec[];
  jars: Jar[];
  buildings: Record<string, BuildingRec>;
  rowNames: Record<string, string>;
  jewels: Record<string, string>;
  announced: Record<string, string>;
  titles: string[];
  pins: Record<string, PinOnBaby[]>;
  pinKeys: Record<string, true>;
  outfits: Record<string, Outfit>;
  notes: { note: string; mark: Mark; visit: string; t: number }[];
  gifts: string[];
  photos: Photo[];
  ribbons: Record<string, boolean>;
  unlocked: string[];
  firstBath: string | null;
  settings: Record<string, unknown>;
};

export function initPlaces(): PlacesState {
  return {
    herd: 0, hatchOrder: [], circleBabies: [], importRows: 0, nights: 0, visits: [], jars: [], buildings: {},
    rowNames: {}, jewels: {}, announced: {}, titles: [], pins: {}, pinKeys: {}, outfits: {}, notes: [], gifts: [],
    photos: [], ribbons: {}, unlocked: [], firstBath: null, settings: {},
  };
}

export function currentVisit(s: PlacesState): VisitRec | null {
  return s.visits.length ? s.visits[s.visits.length - 1] : null;
}
```

`src/core/places/fold.ts`:

```ts
import type { GameEvent, Mark, Outfit, PinSource } from './types.ts';
import { currentVisit, type BuildingRec, type PlacesState } from './state.ts';

function building(s: PlacesState, plot: string): BuildingRec {
  return (s.buildings[plot] ??= { parts: [], done: false, doneT: null });
}

function addBaby(s: PlacesState, id: string): boolean {
  if (s.hatchOrder.includes(id)) return false;
  s.hatchOrder.push(id);
  s.herd = s.hatchOrder.length;
  return true;
}

export function reducePlaces(s: PlacesState, e: GameEvent): PlacesState {
  const v = currentVisit(s);
  const markNew = () => { if (v) v.newThing = true; };
  switch (e.type) {
    case 'visit.start':
      s.visits.push({ id: String(e.visit), index: s.visits.length + 1, start: e.t, tz: Number(e.tz ?? 0), newThing: false, announced: [], post: false, cousins: [], notes: 0, hatches: 0 });
      break;
    case 'egg.hatched':
      if (!addBaby(s, String(e.baby))) break;
      if (e.source === 'building') s.circleBabies.push(String(e.baby));
      else if (v) v.hatches += 1;
      break;
    case 'import.v2': {
      const ids = (e.babies as string[] | undefined) ?? [];
      for (const id of ids) addBaby(s, id);
      s.importRows = Math.max(s.importRows, Math.ceil(ids.length / 10));
      s.nights = Math.max(s.nights, Number(e.nights ?? 0));
      break;
    }
    case 'jar.labelled':
      s.jars.push({ jar: String(e.jar), word: String(e.word), plural: Boolean(e.plural), count: Number(e.count), picture: String(e.picture), baby: (e.baby as string | null) ?? null, t: e.t });
      break;
    case 'building.part': {
      const b = building(s, String(e.plot));
      const part = String(e.part);
      if (!b.done && !b.parts.includes(part)) b.parts.push(part);
      break;
    }
    case 'building.done': {
      const b = building(s, String(e.plot));
      if (!b.done) { b.done = true; b.doneT = e.t; markNew(); }
      break;
    }
    case 'row.named':
      s.rowNames[String(e.row)] = String(e.name);
      break;
    case 'jewel.placed':
      if (!(String(e.jewel) in s.jewels)) s.jewels[String(e.jewel)] = String(e.plot);
      break;
    case 'opening.announced': {
      const id = String(e.opening);
      if (id in s.announced) break;
      s.announced[id] = v?.id ?? '';
      if (v) v.announced.push(id);
      markNew();
      if (id.startsWith('novelty:')) s.unlocked.push(id.slice('novelty:'.length));
      break;
    }
    case 'title.given':
      if (!s.titles.includes(String(e.title))) { s.titles.push(String(e.title)); markNew(); }
      break;
    case 'step.passed':
    case 'name.clipHeard':
      markNew();
      break;
    case 'pin.given': {
      const key = e.key as string | undefined;
      if (key) { if (s.pinKeys[key]) break; s.pinKeys[key] = true; }
      (s.pins[String(e.baby)] ??= []).push({ pin: String(e.pin), source: e.source as PinSource, t: e.t });
      if (e.source === 'post' && v) v.post = true;
      break;
    }
    case 'outfit.saved':
      s.outfits[String(e.baby)] = e.outfit as Outfit;
      break;
    case 'note.sent': {
      s.notes.push({ note: String(e.note), mark: e.mark as Mark, visit: v?.id ?? '', t: e.t });
      const gift = e.gift as string | null | undefined;
      if (gift && !s.gifts.includes(gift)) s.gifts.push(gift);
      if (v) v.notes += 1;
      break;
    }
    case 'photo.taken': {
      const cousin = (e.cousin as string | null) ?? null;
      s.photos.push({ place: String(e.place), cousin, babies: (e.babies as string[]) ?? [], t: e.t });
      if (cousin && v) v.cousins.push(cousin);
      break;
    }
    case 'ribbon.set':
      s.ribbons[String(e.baby)] = Boolean(e.on);
      break;
    case 'care.done':
      if (e.care === 'bath' && !s.firstBath) s.firstBath = String(e.baby);
      break;
    case 'settings.set':
      s.settings[String(e.key)] = e.value;
      break;
  }
  return s;
}
```

- [ ] **Step 6: Run the fold tests to see them pass**

Run: `npx vitest run tests/places/fold.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 7: Write the failing action tests**

`tests/places/actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { applyPlaceAction } from '../../src/core/places/actions.ts';
import { initPlaces } from '../../src/core/places/state.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const make = (type: string, payload: Record<string, unknown>) => ev(type, payload);
const ctx = (places = initPlaces()) => ({ world: { places }, make });

describe('place actions', () => {
  it('turns a pin pot drop into one pin per star', () => {
    const out = applyPlaceAction({ type: 'place/pot', baby: 'a', count: 4 }, ctx());
    expect(out.map((e) => [e.type, e.pin, e.source])).toEqual(Array(4).fill(['pin.given', 'star', 'pot']));
  });

  it('does not build a plot twice or announce an opening twice', () => {
    const places = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev('building.done', { plot: 'bath-pond' }), ev('opening.announced', { opening: 'bubbles' })]);
    expect(applyPlaceAction({ type: 'place/built', plot: 'bath-pond' }, ctx(places))).toEqual([]);
    expect(applyPlaceAction({ type: 'place/announce', opening: 'bubbles' }, ctx(places))).toEqual([]);
  });

  it('builds a decoration plot at once when its jewel is placed', () => {
    const out = applyPlaceAction({ type: 'place/jewel', jewel: 'S20', plot: 'decor-fountain', decoration: true }, ctx());
    expect(out.map((e) => e.type)).toEqual(['jewel.placed', 'building.done']);
  });

  it('places a jewel on a building plot without building it', () => {
    const out = applyPlaceAction({ type: 'place/jewel', jewel: 'S20', plot: 'salon', decoration: false }, ctx());
    expect(out.map((e) => e.type)).toEqual(['jewel.placed']);
  });

  it('logs a checked moment as learn.result with every field', () => {
    const result = { strand: 's' as const, step: 'S10', carrier: 'fox', items: [{ item: '-es', result: 'first' as const }], result: 'first' as const, ms: 2100, scaffold: 1 as const, error: null, place: 'toy-shelf' as const, probe: false };
    const [e] = applyPlaceAction({ type: 'place/result', result }, ctx());
    expect(e).toMatchObject({ type: 'learn.result', ...result });
  });

  it('sends a note with its gift', () => {
    const [e] = applyPlaceAction({ type: 'place/note', note: 'swing', mark: '?', gift: 'gift-swing' }, ctx());
    expect(e).toMatchObject({ type: 'note.sent', note: 'swing', mark: '?', gift: 'gift-swing' });
  });

  it('maps every other action to one event of its type', () => {
    const cases: [Parameters<typeof applyPlaceAction>[0], string][] = [
      [{ type: 'place/enter', place: 'bath-pond' }, 'place.enter'],
      [{ type: 'place/leave', place: 'bath-pond' }, 'place.leave'],
      [{ type: 'place/idle', strand: 'r', step: 'R19', place: 'bath-pond' }, 'learn.idle'],
      [{ type: 'place/jar', jar: 'j1', word: 'foxes', plural: true, count: 3, picture: 'fox', baby: 'a' }, 'jar.labelled'],
      [{ type: 'place/care', baby: 'a', care: 'bath' }, 'care.done'],
      [{ type: 'place/part', plot: 'row-2', part: 'walls' }, 'building.part'],
      [{ type: 'place/row-name', row: 2, name: 'Rose' }, 'row.named'],
      [{ type: 'place/outfit', baby: 'a', outfit: { crown: 'gold-crown' } }, 'outfit.saved'],
      [{ type: 'place/pin', baby: 'a', pin: 'rose', source: 'post', key: 'post:v1:0' }, 'pin.given'],
      [{ type: 'place/photo', place: 'salon', cousin: 'dot', babies: ['a'] }, 'photo.taken'],
      [{ type: 'place/ribbon', baby: 'a', on: true }, 'ribbon.set'],
      [{ type: 'place/setting', key: 'parentPin', value: '1357' }, 'settings.set'],
      [{ type: 'place/override', strand: 's', step: 'S10', as: 'placed' }, 'learn.override'],
      [{ type: 'place/exclude', device: 'abcd1234' }, 'exclude'],
      [{ type: 'place/title', title: 'nest-keeper' }, 'title.given'],
    ];
    for (const [a, type] of cases) {
      const out = applyPlaceAction(a, ctx());
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(type);
    }
  });
});
```

- [ ] **Step 8: Run it to see it fail**

Run: `npx vitest run tests/places/actions.test.ts`
Expected: FAIL, cannot resolve `actions.ts`.

- [ ] **Step 9: Write actions, content and the release file**

`src/core/places/actions.ts`:

```ts
import type { GameEvent, LearnResultPayload, Mark, Outfit, PinSource, PlaceId, PlotId, StepId, Strand } from './types.ts';
import type { PlacesState } from './state.ts';

export type PlaceAction =
  | { type: 'place/enter'; place: PlaceId }
  | { type: 'place/leave'; place: PlaceId }
  | { type: 'place/result'; result: LearnResultPayload }
  | { type: 'place/idle'; strand: Strand | 'name'; step: StepId; place: PlaceId }
  | { type: 'place/jar'; jar: string; word: string; plural: boolean; count: number; picture: string; baby: string | null }
  | { type: 'place/care'; baby: string; care: 'bath' }
  | { type: 'place/part'; plot: PlotId; part: string }
  | { type: 'place/built'; plot: PlotId }
  | { type: 'place/row-name'; row: number; name: string }
  | { type: 'place/announce'; opening: string }
  | { type: 'place/jewel'; jewel: StepId; plot: PlotId; decoration: boolean }
  | { type: 'place/outfit'; baby: string; outfit: Outfit }
  | { type: 'place/pin'; baby: string; pin: string; source: PinSource; key?: string }
  | { type: 'place/pot'; baby: string; count: number }
  | { type: 'place/note'; note: string; mark: Mark; gift: string | null }
  | { type: 'place/photo'; place: PlaceId; cousin: string | null; babies: string[] }
  | { type: 'place/ribbon'; baby: string; on: boolean }
  | { type: 'place/setting'; key: string; value: unknown }
  | { type: 'place/override'; strand: Strand; step: StepId; as: 'placed' | 'current' | 'school-on' | 'school-off' }
  | { type: 'place/exclude'; device: string }
  | { type: 'place/title'; title: string };

export type MakeEvent = (type: string, payload: Record<string, unknown>) => GameEvent;

export function applyPlaceAction(a: PlaceAction, ctx: { world: { places: PlacesState }; make: MakeEvent }): GameEvent[] {
  const { make } = ctx;
  const s = ctx.world.places;
  switch (a.type) {
    case 'place/enter': return [make('place.enter', { place: a.place })];
    case 'place/leave': return [make('place.leave', { place: a.place })];
    case 'place/result': return [make('learn.result', { ...a.result })];
    case 'place/idle': return [make('learn.idle', { strand: a.strand, step: a.step, place: a.place })];
    case 'place/jar': return [make('jar.labelled', { jar: a.jar, word: a.word, plural: a.plural, count: a.count, picture: a.picture, baby: a.baby })];
    case 'place/care': return [make('care.done', { baby: a.baby, care: a.care })];
    case 'place/part': return s.buildings[a.plot]?.parts.includes(a.part) ? [] : [make('building.part', { plot: a.plot, part: a.part })];
    case 'place/built': return s.buildings[a.plot]?.done ? [] : [make('building.done', { plot: a.plot })];
    case 'place/row-name': return [make('row.named', { row: a.row, name: a.name })];
    case 'place/announce': return a.opening in s.announced ? [] : [make('opening.announced', { opening: a.opening })];
    case 'place/jewel': {
      if (a.jewel in s.jewels) return [];
      const out = [make('jewel.placed', { jewel: a.jewel, plot: a.plot })];
      if (a.decoration && !s.buildings[a.plot]?.done) out.push(make('building.done', { plot: a.plot }));
      return out;
    }
    case 'place/outfit': return [make('outfit.saved', { baby: a.baby, outfit: a.outfit })];
    case 'place/pin': return [make('pin.given', { baby: a.baby, pin: a.pin, source: a.source, ...(a.key ? { key: a.key } : {}) })];
    case 'place/pot': return Array.from({ length: a.count }, () => make('pin.given', { baby: a.baby, pin: 'star', source: 'pot' }));
    case 'place/note': return [make('note.sent', { note: a.note, mark: a.mark, gift: a.gift })];
    case 'place/photo': return [make('photo.taken', { place: a.place, cousin: a.cousin, babies: a.babies })];
    case 'place/ribbon': return [make('ribbon.set', { baby: a.baby, on: a.on })];
    case 'place/setting': return [make('settings.set', { key: a.key, value: a.value })];
    case 'place/override': return [make('learn.override', { strand: a.strand, step: a.step, as: a.as })];
    case 'place/exclude': return [make('exclude', { device: a.device })];
    case 'place/title': return s.titles.includes(a.title) ? [] : [make('title.given', { title: a.title })];
  }
}
```

`content/places/release.json`:

```json
{ "release": "1.3" }
```

`src/core/places/content.ts` (later tasks add one export per content file they create):

```ts
import releaseJson from '../../../content/places/release.json' with { type: 'json' };

export const CURRENT_RELEASE: string = releaseJson.release;

/** Releases are "1.0", "1.1", "1.2", "1.3", "2", "3" and so on. */
export function released(release: string, current: string = CURRENT_RELEASE): boolean {
  return Number(release) <= Number(current);
}
```

Add to `tests/places/fold.test.ts`, at the end of the file:

```ts
import { released } from '../../src/core/places/content.ts';
describe('release gate', () => {
  it('opens everything up to the current release', () => {
    expect(released('1.0', '1.3')).toBe(true);
    expect(released('1.3', '1.3')).toBe(true);
    expect(released('2', '1.3')).toBe(false);
    expect(released('1.2', '1.1')).toBe(false);
  });
});
```

- [ ] **Step 10: Run the tests**

Run: `npx vitest run tests/places/`
Expected: PASS, all tests in `fold.test.ts` and `actions.test.ts`.

- [ ] **Step 11: Type check**

Run: `npx tsc --noEmit -p .`
Expected: no errors in `src/core/places/`.

- [ ] **Step 12: Commit**

```bash
git add games/moon-meadow-home/src/core/places/types.ts games/moon-meadow-home/src/core/places/state.ts games/moon-meadow-home/src/core/places/fold.ts games/moon-meadow-home/src/core/places/actions.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/release.json games/moon-meadow-home/tests/places/helpers.ts games/moon-meadow-home/tests/places/fold.test.ts games/moon-meadow-home/tests/places/actions.test.ts
git commit -m "Add place state, fold and actions for the meadow places"
```

**Acceptance:** all place events fold into `PlacesState` with earliest-wins and latest-wins rules, duplicates add nothing, and every `PlaceAction` maps to its events.

### Task A1b: Planner adapter

Do this right after Task A1. It is the only code that knows the learning workstream's planner shapes (see "Reconciliation").

**Files:**
- Create: `src/places/serve.ts`, `src/places/plan.ts`
- Test: `tests/places/serve.test.ts`

**Interfaces:**
- Consumes: `ServedItem`, `ItemResult`, `Result`, `Rng`, `Strand`, `WordView` (A1); from the learning workstream `nextItem`, `visitStats`, `isTired`, `wantsLabelBubble`, `currentStep`, the `Pick` and `Content` types; `game.planContext()`, `game.content`, `game.learner`, `game.rng`.
- Produces:
  - `type PlannerMaths`, `type PlannerCarrier`, `type PlannerPick`, `type PlannerItem` (structural copies of the learning plan's `MathsTask`, `Carrier`, `Pick` and `RawItem`)
  - `SLOT_REQUESTS: Record<string, { strand: Strand; moments: string[]; tags?: string[] }>`
  - `requestFor(place: string, kind: string): { strand: Strand; moments: string[]; place: string; tags?: string[] } | null`
  - `mathsCarrier(t: PlannerMaths): string | null`
  - `canonicalItem(it: PlannerItem | undefined, gpcText: (id: string) => string): string | null`
  - `toServed(p: PlannerPick | null, deps: { item(id: string): PlannerItem | undefined; gpcText(id: string): string; plural(word: string): 's' | 'es' | null; rng: Rng }): ServedItem | null`
  - `logItems(served: ServedItem, mine: ItemResult[], result: Result, toId: (text: string) => string | null): ItemResult[]`
  - `src/places/plan.ts`: `serve(strand: Strand, place: string, kind: string): ServedItem | null`, `canServeSlot(place: string, kind: string): boolean`, `visitPlan(): { practised: Record<Strand, number>; moments: number; labelForced: boolean }`, `spellStepNow(): string | null`, `wordViews(): WordView[]`, `logFor(served: ServedItem, mine: ItemResult[], result: Result): ItemResult[]`

Every scene in this plan passes its item results through `logFor(task.served, items, result)` before it dispatches `place/result`. Where a task below writes `items: ...` in a `place/result`, read `items: logFor(served, ..., result)`.

- [ ] **Step 1: Write the failing test**

`tests/places/serve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canonicalItem, logItems, mathsCarrier, requestFor, toServed, type PlannerItem, type PlannerPick } from '../../src/places/serve.ts';
import { served } from './helpers.ts';

const items: Record<string, PlannerItem> = {
  'r:g:ai': { id: 'r:g:ai', kind: 'grapheme', gpc: 'ai' },
  'r:end:s': { id: 'r:end:s', kind: 'ending', ending: 's' },
  'r:end:none': { id: 'r:end:none', kind: 'ending', ending: 'none' },
  's:end:es': { id: 's:end:es', kind: 'ending', ending: 'es' },
  's:mark:q': { id: 's:mark:q', kind: 'mark', pattern: 'q' },
  's:t:was': { id: 's:t:was', kind: 'tricky', word: 'was' },
  'r:pre:un': { id: 'r:pre:un', kind: 'prefix', affix: 'un' },
  'm:pair:6-4': { id: 'm:pair:6-4', kind: 'bond' },
};
const deps = (r = 0.9) => ({ item: (id: string) => items[id], gpcText: (id: string) => id, plural: (w: string) => (w === 'fox' ? 'es' as const : 's' as const), rng: () => r });
const pick = (o: Partial<PlannerPick>): PlannerPick => ({ strand: 'r', step: 'R13', slot: 'current', moment: 'wish', items: ['r:g:ai'], carrier: { kind: 'word', word: 'rain' }, scaffold: 1, probe: false, ...o });

describe('planner adapter', () => {
  it('asks for the moments each place can host', () => {
    expect(requestFor('bath-pond', 'pond-word')).toEqual({ strand: 'r', moments: ['one-or-many', 'bath-wish'], place: 'bath-pond', tags: ['bath'] });
    expect(requestFor('toy-shelf', 'label')).toEqual({ strand: 's', moments: ['label', 'label-plural'], place: 'toy-shelf' });
    expect(requestFor('nowhere', 'x')).toBeNull();
  });

  it('turns maths tasks into the carriers place code reads', () => {
    expect(mathsCarrier({ op: 'pair', a: 6, b: 4 })).toBe('6+4');
    expect(mathsCarrier({ op: 'missing', whole: 7, part: 4 })).toBe('4+3');
    expect(mathsCarrier({ op: 'add', a: 5, b: 3 })).toBe('5+3');
    expect(mathsCarrier({ op: 'compare', want: 'fewest' })).toBe('fewest');
    expect(mathsCarrier({ op: 'pattern', unit: 'ABB' })).toBe('ABB');
    expect(mathsCarrier({ op: 'take', a: 9, b: 5 })).toBeNull();
  });

  it('names items the way place code expects', () => {
    const g = (id: string) => id;
    expect(canonicalItem(items['r:g:ai'], g)).toBe('ai');
    expect(canonicalItem(items['s:end:es'], g)).toBe('-es');
    expect(canonicalItem(items['r:end:none'], g)).toBe('none');
    expect(canonicalItem(items['s:mark:q'], g)).toBe('mark-?');
    expect(canonicalItem(items['s:t:was'], g)).toBe('was');
    expect(canonicalItem(items['r:pre:un'], g)).toBe('un');
    expect(canonicalItem(undefined, g)).toBeNull();
  });

  it('serves a word, keeping the planner ids for the log', () => {
    expect(toServed(pick({}), deps())).toEqual({ strand: 'r', step: 'R13', items: ['ai'], carrier: 'rain', scaffold: 1, probe: false, kind: 'current', log: ['r:g:ai'] });
  });

  it('serves one or many with the right ending and count', () => {
    const many = toServed(pick({ step: 'R19', slot: 'school', items: ['r:end:s'], carrier: { kind: 'plural', word: 'fox', form: 'many', count: 4 } }), deps())!;
    expect(many).toMatchObject({ items: ['-es'], carrier: 'fox', count: 4, kind: 'school' });
    const one = toServed(pick({ step: 'R19', items: ['r:end:none'], carrier: { kind: 'plural', word: 'duck', form: 'one', count: 1 } }), deps())!;
    expect(one.items).toEqual(['none']);
    const jarOfOne = toServed(pick({ strand: 's', step: 'S10', items: ['s:end:es'], carrier: { kind: 'plural', word: 'fox', form: 'one', count: 1 } }), deps())!;
    expect(jarOfOne).toMatchObject({ items: ['-es'], count: 1 });
  });

  it('serves maths with the fact as the item', () => {
    const m = toServed(pick({ strand: 'm', step: 'M10', items: ['m:pair:6-4'], carrier: { kind: 'maths', task: { op: 'pair', a: 6, b: 4 } } }), deps())!;
    expect(m).toMatchObject({ carrier: '6+4', items: ['6+4'], log: ['m:pair:6-4'] });
  });

  it('asks for both directions of an R37 wish', () => {
    const p = pick({ step: 'R37', items: ['r:pre:un'], carrier: { kind: 'phrase', phrase: 'unpack-basket' } });
    expect(toServed(p, deps(0.9))!.items).toEqual(['un']);
    expect(toServed(p, deps(0.1))!.items).toEqual(['base']);
  });

  it('serves nothing for names, missing picks or carriers places cannot show', () => {
    expect(toServed(null, deps())).toBeNull();
    expect(toServed(pick({ strand: 'name' }), deps())).toBeNull();
    expect(toServed(pick({ carrier: { kind: 'door', n: 4 } }), deps())).toBeNull();
    expect(toServed(pick({ strand: 'm', step: 'M14', carrier: { kind: 'maths', task: { op: 'take', a: 9, b: 5 } } }), deps())).toBeNull();
  });

  it('logs own slots under their planner ids and the rest with the moment result', () => {
    const s = { ...served('s', 'S10', 'fox', ['-es']), log: ['s:end:es'] };
    const toId = (text: string) => (text === 'f' ? 's:g:f' : text === 'o' ? 's:g:o' : null);
    expect(logItems(s, [{ item: 'f', result: 'first' }, { item: 'o', result: 'miss' }, { item: '-es', result: 'first' }], 'miss', toId)).toEqual([
      { item: 's:g:f', result: 'first' }, { item: 's:g:o', result: 'miss' }, { item: 's:end:es', result: 'miss' },
    ]);
    expect(logItems(served('s', 'S10', 'fox', ['-es']), [{ item: '-es', result: 'first' }], 'first', toId)).toEqual([{ item: '-es', result: 'first' }]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/serve.test.ts`
Expected: FAIL, cannot resolve `src/places/serve.ts`.

- [ ] **Step 3: Write `serve.ts`**

```ts
import type { ItemResult, Result, Rng, ServedItem, Strand } from '../core/places/types.ts';

export type PlannerMaths =
  | { op: 'subitise'; n: number } | { op: 'numeral'; n: number } | { op: 'compare'; want: 'fewest' | 'most' }
  | { op: 'more'; n: number } | { op: 'less'; n: number } | { op: 'missing'; whole: number; part: number }
  | { op: 'pair'; a: number; b: number } | { op: 'add'; a: number; b: number } | { op: 'take'; a: number; b: number }
  | { op: 'pattern'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB' };
export type PlannerCarrier =
  | { kind: 'word'; word: string } | { kind: 'plural'; word: string; form: 'one' | 'many'; count: number }
  | { kind: 'twin'; pair: string; words: [string, string] } | { kind: 'spell'; focus: string[] } | { kind: 'first-sound'; gpc: string }
  | { kind: 'maths'; task: PlannerMaths } | { kind: 'door'; n: number } | { kind: 'phrase'; phrase: string }
  | { kind: 'letters'; letters: string[] } | { kind: 'name'; babyId: string; name: string };
export type PlannerPick = {
  strand: Strand | 'name'; step: string | null; slot: string; moment: string; items: string[];
  carrier: PlannerCarrier; scaffold: 1 | 2 | 3; probe: boolean;
};
export type PlannerItem = { id: string; kind: string; gpc?: string; ending?: 's' | 'es' | 'none'; affix?: string; pattern?: string; word?: string };

export const SLOT_REQUESTS: Record<string, { strand: Strand; moments: string[]; tags?: string[] }> = {
  'toy-shelf/label': { strand: 's', moments: ['label', 'label-plural'] },
  'bath-pond/pond-word': { strand: 'r', moments: ['one-or-many', 'bath-wish'], tags: ['bath'] },
  'building/sum': { strand: 'm', moments: ['post-sash', 'parcel'] },
  'building/pattern': { strand: 'm', moments: ['trim'] },
  'post-box/sum': { strand: 'm', moments: ['post-sash'] },
  'post-box/fewest': { strand: 'm', moments: ['post-pin'] },
  'post-box/missing': { strand: 'm', moments: ['parcel'] },
  'post-box/note': { strand: 's', moments: ['note'] },
  'salon/salon-word': { strand: 'r', moments: ['salon-card', 'one-or-many'] },
  'salon/pattern': { strand: 'm', moments: ['beads'] },
  'letter-lane/letters': { strand: 's', moments: ['letter-order'] },
  'meadow-wishes/asking': { strand: 'r', moments: ['asking-bubble'] },
  'meadow-wishes/two-state': { strand: 'r', moments: ['two-state-wish'] },
  'meadow/wish': { strand: 'r', moments: ['wish', 'one-or-many', 'twin-wish'] },
};

export function requestFor(place: string, kind: string): { strand: Strand; moments: string[]; place: string; tags?: string[] } | null {
  const r = SLOT_REQUESTS[`${place}/${kind}`];
  return r ? { strand: r.strand, moments: r.moments, place, ...(r.tags ? { tags: r.tags } : {}) } : null;
}

export function mathsCarrier(t: PlannerMaths): string | null {
  switch (t.op) {
    case 'pair': case 'add': return `${t.a}+${t.b}`;
    case 'missing': return `${t.part}+${t.whole - t.part}`;
    case 'compare': return t.want === 'fewest' ? 'fewest' : null;
    case 'pattern': return t.unit;
    default: return null;
  }
}

const MARKS: Record<string, string> = { stop: '.', '.': '.', q: '?', '?': '?', bang: '!', '!': '!' };

export function canonicalItem(it: PlannerItem | undefined, gpcText: (id: string) => string): string | null {
  if (!it) return null;
  switch (it.kind) {
    case 'grapheme': return it.gpc ? gpcText(it.gpc) : null;
    case 'ending': return it.ending === 'none' ? 'none' : it.ending ? `-${it.ending}` : null;
    case 'mark': return it.pattern && MARKS[it.pattern] ? `mark-${MARKS[it.pattern]}` : null;
    case 'capital': return 'capital-start';
    case 'and': return 'and';
    case 'sentence': return 'card-order';
    case 'tricky': return it.word ?? null;
    case 'prefix': return it.affix === 'un' ? 'un' : null;
    case 'letter': return it.pattern ?? null;
    case 'adjective': return 'adjective';
    default: return it.id;
  }
}

const KIND: Record<string, ServedItem['kind']> = { current: 'current', school: 'school', side: 'side', review: 'review', mixed: 'mixed', probe: 'current', warmup: 'current', golden: 'current' };

export function toServed(p: PlannerPick | null, deps: { item(id: string): PlannerItem | undefined; gpcText(id: string): string; plural(word: string): 's' | 'es' | null; rng: Rng }): ServedItem | null {
  if (!p || p.strand === 'name' || !p.step) return null;
  const c = p.carrier;
  let items = p.items.map((id) => canonicalItem(deps.item(id), deps.gpcText) ?? id);
  let carrier: string | null = null;
  let count: number | undefined;
  switch (c.kind) {
    case 'word': carrier = c.word; break;
    case 'plural': {
      carrier = c.word;
      count = c.count;
      const ending = deps.plural(c.word);
      if (c.form === 'many' && ending) items = [`-${ending}`];
      else items = p.step === 'S10' && ending ? [`-${ending}`] : ['none'];
      break;
    }
    case 'maths': carrier = mathsCarrier(c.task); if (carrier) items = [carrier]; break;
    case 'phrase': carrier = c.phrase; break;
    case 'letters': carrier = c.letters.join(''); break;
    case 'spell': carrier = c.focus.join('+'); break;
    default: carrier = null;
  }
  if (carrier === null) return null;
  if (p.step === 'R37' && items[0] === 'un' && deps.rng() < 0.5) items = ['base'];
  return {
    strand: p.strand, step: p.step, items, carrier, scaffold: p.scaffold, probe: p.probe, kind: KIND[p.slot] ?? 'current', log: p.items,
    ...(count !== undefined ? { count } : {}),
  };
}

export function logItems(served: ServedItem, mine: ItemResult[], result: Result, toId: (text: string) => string | null): ItemResult[] {
  if (!served.log) return mine;
  const out = new Map<string, Result>();
  for (const m of mine) { const id = toId(m.item); if (id) out.set(id, m.result); }
  for (const id of served.log) if (!out.has(id)) out.set(id, result);
  return [...out].map(([item, r]) => ({ item, result: r }));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/serve.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write `plan.ts`**

```ts
import { game } from '../game.svelte.ts';
import { nextItem } from '../core/planner/index.ts';
import { currentStep, isTired, visitStats, wantsLabelBubble } from '../core/learning/index.ts';
import type { ItemRequest } from '../core/planner/types.ts';
import type { ItemResult, Result, ServedItem, Strand, WordView } from '../core/places/types.ts';
import { logItems, requestFor, toServed, type PlannerItem } from './serve.ts';

const TAGS: Record<string, string> = { bath: 'pond', found: 'shelf', toy: 'shelf', salon: 'salon' };
const deps = () => ({
  item: (id: string) => game.content.items[id] as PlannerItem | undefined,
  gpcText: (id: string) => game.content.gpcs[id]?.text ?? id,
  plural: (w: string) => (game.content.words[w]?.plural?.ending ?? null) as 's' | 'es' | null,
  rng: game.rng,
});

export function serve(strand: Strand, place: string, kind: string): ServedItem | null {
  const req = requestFor(place, kind);
  if (!req || req.strand !== strand) return null;
  return toServed(nextItem(game.planContext(), req as unknown as ItemRequest, game.rng), deps());
}

export function canServeSlot(place: string, kind: string): boolean {
  const req = requestFor(place, kind);
  if (!req) return false;
  let a = 12345;
  const peek = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  return nextItem(game.planContext(), req as unknown as ItemRequest, peek) !== null;
}

export function visitPlan(): { practised: Record<Strand, number>; moments: number; labelForced: boolean } {
  const v = visitStats(game.learner);
  return { practised: { r: v.r, s: v.s, m: v.m }, moments: isTired(game.learner, game.content) ? 30 : v.total, labelForced: wantsLabelBubble(game.learner, game.content) };
}

export const spellStepNow = (): string | null => currentStep(game.learner, game.content, 's');

export function wordViews(): WordView[] {
  return Object.values(game.content.words).map((w) => ({
    id: w.w, word: w.w, graphemes: w.gpcs.map((g: string) => game.content.gpcs[g]?.text ?? g), picture: w.pic ?? '',
    rStep: w.rStep ?? '', sStep: w.sStep ?? '', tags: (w.tags ?? []).map((t: string) => TAGS[t] ?? t),
    ...(w.plural ? { plural: { word: w.plural.w, ending: w.plural.ending, graphemes: w.plural.gpcs.map((g: string) => game.content.gpcs[g]?.text ?? g) } } : {}),
  }));
}

export function logFor(served: ServedItem, mine: ItemResult[], result: Result): ItemResult[] {
  const strand = served.strand;
  const toId = (text: string) => Object.values(game.content.items).find((it) => it.strand === strand && it.kind === 'grapheme' && game.content.gpcs[it.gpc]?.text === text)?.id ?? null;
  return logItems(served, mine, result, toId);
}
```

The field names in `plan.ts` that touch `game.content` (`items`, `gpcs`, `words`, `w.plural.w`, `w.rStep`) follow the learning plan's `Content` type; the integrator adjusts them there if that type differs. Where place scenes say `words()`, they call `wordViews()`.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/places/serve.ts games/moon-meadow-home/src/places/plan.ts games/moon-meadow-home/tests/places/serve.test.ts
git commit -m "Add the planner adapter between the places and the learning planner"
```

**Acceptance:** places ask for items by place and kind, get canonical items they can plan with, and log the planner's own item ids.

### Task A2: Hint ladder

**Files:**
- Create: `src/core/places/hints.ts`
- Test: `tests/places/hints.test.ts`

**Interfaces:**
- Consumes: `AnyStrand`, `Result` from `types.ts`.
- Produces:
  - `type HintLevel = 0 | 1 | 2 | 3`
  - `type MomentState = { strand: AnyStrand; level: HintLevel; misses: number; idles: number; touchedSinceIdle: boolean; idleFlagged: boolean; idleHint: boolean; openedAt: number; done: boolean }`
  - `type HintEffect = { kind: 'repeat-goal' } | { kind: 'focused' } | { kind: 'ghost-answer' } | { kind: 'idle-flag' }`
  - `idleDelay(strand: AnyStrand): number`
  - `openMoment(strand: AnyStrand, now: number): MomentState`
  - `onIdle(s: MomentState): [MomentState, HintEffect[]]`
  - `onTouch(s: MomentState): MomentState`
  - `onMiss(s: MomentState): [MomentState, HintEffect[]]`
  - `onAnswer(s: MomentState, chosenTouchAt: number): { state: MomentState; result: Result; ms: number }`

- [ ] **Step 1: Write the failing test**

`tests/places/hints.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { idleDelay, onAnswer, onIdle, onMiss, onTouch, openMoment } from '../../src/core/places/hints.ts';

describe('hint ladder', () => {
  it('waits 10 s on reading and 15 s elsewhere', () => {
    expect(idleDelay('r')).toBe(10_000);
    expect(idleDelay('s')).toBe(15_000);
    expect(idleDelay('m')).toBe(15_000);
    expect(idleDelay('name')).toBe(15_000);
  });

  it('repeats the goal on the first idle and gives the focused hint with an idle flag on the second', () => {
    let s = openMoment('m', 0);
    let fx;
    [s, fx] = onIdle(s);
    expect(s.level).toBe(1);
    expect(fx).toEqual([{ kind: 'repeat-goal' }]);
    [s, fx] = onIdle(s);
    expect(s.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }, { kind: 'idle-flag' }]);
  });

  it('never goes past level 2 on idle and flags only once', () => {
    let s = openMoment('s', 0);
    [s] = onIdle(s);
    [s] = onIdle(s);
    const [s3, fx] = onIdle(s);
    expect(s3.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }]);
  });

  it('does not flag idles with a touch between them', () => {
    let s = openMoment('r', 0);
    [s] = onIdle(s);
    s = onTouch(s);
    const [s2, fx] = onIdle(s);
    expect(s2.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }]);
  });

  it('gives the focused hint after one miss and the ghost hand after two', () => {
    let s = openMoment('m', 0);
    let fx;
    [s, fx] = onMiss(s);
    expect(s.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }]);
    [s, fx] = onMiss(s);
    expect(s.level).toBe(3);
    expect(fx).toEqual([{ kind: 'ghost-answer' }]);
  });

  it('does nothing on idle once the ghost hand has shown the answer', () => {
    let s = openMoment('m', 0);
    [s] = onMiss(s);
    [s] = onMiss(s);
    const [s2, fx] = onIdle(s);
    expect(s2.level).toBe(3);
    expect(fx).toEqual([]);
  });

  it('returns first on a clean answer, with the decision time', () => {
    const s = openMoment('r', 1_000);
    expect(onAnswer(s, 4_500)).toMatchObject({ result: 'first', ms: 3_500 });
  });

  it('returns miss after a miss without the ghost hand (decision D1)', () => {
    let s = openMoment('r', 0);
    [s] = onMiss(s);
    expect(onAnswer(s, 9_000).result).toBe('miss');
  });

  it('returns helped after an idle-triggered level 2 hint', () => {
    let s = openMoment('r', 0);
    [s] = onIdle(s);
    [s] = onIdle(s);
    expect(onAnswer(s, 30_000).result).toBe('helped');
  });

  it('returns first after only a level 1 goal repeat', () => {
    let s = openMoment('m', 0);
    [s] = onIdle(s);
    expect(onAnswer(s, 20_000).result).toBe('first');
  });

  it('returns helped after the ghost hand', () => {
    let s = openMoment('m', 0);
    [s] = onMiss(s);
    [s] = onMiss(s);
    expect(onAnswer(s, 9_000).result).toBe('helped');
  });

  it('closes the moment so later events change nothing', () => {
    const s = onAnswer(openMoment('m', 0), 2_000).state;
    expect(s.done).toBe(true);
    expect(onIdle(s)).toEqual([s, []]);
    expect(onMiss(s)).toEqual([s, []]);
  });

  it('never returns a negative decision time', () => {
    expect(onAnswer(openMoment('m', 5_000), 4_000).ms).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/hints.test.ts`
Expected: FAIL, cannot resolve `hints.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/places/hints.ts`:

```ts
import type { AnyStrand, Result } from './types.ts';

export type HintLevel = 0 | 1 | 2 | 3;
export type MomentState = {
  strand: AnyStrand; level: HintLevel; misses: number; idles: number; touchedSinceIdle: boolean;
  idleFlagged: boolean; idleHint: boolean; openedAt: number; done: boolean;
};
export type HintEffect = { kind: 'repeat-goal' } | { kind: 'focused' } | { kind: 'ghost-answer' } | { kind: 'idle-flag' };

export function idleDelay(strand: AnyStrand): number {
  return strand === 'r' ? 10_000 : 15_000;
}

export function openMoment(strand: AnyStrand, now: number): MomentState {
  return { strand, level: 0, misses: 0, idles: 0, touchedSinceIdle: true, idleFlagged: false, idleHint: false, openedAt: now, done: false };
}

export function onIdle(s: MomentState): [MomentState, HintEffect[]] {
  if (s.done || s.level === 3) return [s, []];
  const second = s.idles >= 1 && !s.touchedSinceIdle;
  const next: MomentState = { ...s, idles: s.idles + 1, touchedSinceIdle: false };
  if (s.level === 0) return [{ ...next, level: 1 }, [{ kind: 'repeat-goal' }]];
  const fx: HintEffect[] = [{ kind: 'focused' }];
  if (second && !s.idleFlagged) { fx.push({ kind: 'idle-flag' }); next.idleFlagged = true; }
  return [{ ...next, level: 2, idleHint: s.misses === 0 ? true : s.idleHint }, fx];
}

export function onTouch(s: MomentState): MomentState {
  return s.done ? s : { ...s, touchedSinceIdle: true };
}

export function onMiss(s: MomentState): [MomentState, HintEffect[]] {
  if (s.done) return [s, []];
  const misses = s.misses + 1;
  if (misses >= 2) return [{ ...s, misses, level: 3, touchedSinceIdle: true }, [{ kind: 'ghost-answer' }]];
  return [{ ...s, misses, level: 2, touchedSinceIdle: true }, [{ kind: 'focused' }]];
}

export function onAnswer(s: MomentState, chosenTouchAt: number): { state: MomentState; result: Result; ms: number } {
  const ms = Math.max(0, chosenTouchAt - s.openedAt);
  let result: Result = 'first';
  if (s.level === 3 || s.idleHint) result = 'helped';
  else if (s.misses > 0) result = 'miss';
  return { state: { ...s, done: true }, result, ms };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/hints.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/places/hints.ts games/moon-meadow-home/tests/places/hints.test.ts
git commit -m "Add the hint ladder for checked moments"
```

**Acceptance:** idle repeats the goal, then gives the focused hint and one idle flag, never past level 2; one miss gives the focused hint, two the ghost hand; results follow decision D1.

### Task A3: Moment controller and ghost hand store

**Files:**
- Create: `src/ui/moment.ts`, `src/ui/moment-deps.ts`, `src/ui/ghost.ts`
- Test: `tests/places/moment.test.ts`

**Interfaces:**
- Consumes: `openMoment`, `onIdle`, `onTouch`, `onMiss`, `onAnswer`, `idleDelay`, `MomentState`, `HintEffect` (Task A2); `PlaceAction` (Task A1).
- Produces:
  - `type MomentDeps = { now(): number; setTimer(fn: () => void, ms: number): () => void; say(ids: string[]): Promise<void>; act(): void; dispatch(a: PlaceAction): void }`
  - `type MomentOpts = { strand: AnyStrand; step: StepId; place: PlaceId; goal: string[]; focused(): Promise<void> | void; ghost(): Promise<void> | void; hookAnswer(): void; hookWrong(): void }`
  - `type Moment = { readonly state: MomentState; start(): Promise<void>; touch(): void; miss(): void; answer(chosenTouchAt?: number): { result: Result; ms: number }; replay(): Promise<void>; dispose(): void; hookAnswer(): void; hookWrong(): void; hookIdle(): void }`
  - `createMoment(o: MomentOpts, d: MomentDeps): Moment`
  - `activeMoment(): Moment | null`
  - `defaultDeps(dispatch?: (a: PlaceAction) => void): MomentDeps` in `src/ui/moment-deps.ts` (wires `game.now`, `setTimeout`, the audio facade `sayAll` and `act`)
  - `src/ui/ghost.ts`: `type GhostPath = { from: { x: number; y: number }; to: { x: number; y: number }; carry?: string; ms: number; half: boolean; taps: number }`, a Svelte-compatible store `ghost` (`subscribe`), `ghostMove(from, to, opts?: { carry?: string; ms?: number; half?: boolean }): Promise<void>`, `ghostTap(at, taps?: number): Promise<void>`, `ghostStop(): void`.

- [ ] **Step 1: Write the failing test**

`tests/places/moment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { activeMoment, createMoment, type MomentDeps } from '../../src/ui/moment.ts';
import type { PlaceAction } from '../../src/core/places/actions.ts';

function harness() {
  let t = 0;
  const timers: { at: number; fn: () => void; dead: boolean }[] = [];
  const log: string[] = [];
  const actions: PlaceAction[] = [];
  const deps: MomentDeps = {
    now: () => t,
    setTimer: (fn, ms) => { const x = { at: t + ms, fn, dead: false }; timers.push(x); return () => { x.dead = true; }; },
    say: async (ids) => { log.push(`say:${ids.join(',')}`); },
    act: () => log.push('act'),
    dispatch: (a) => actions.push(a),
  };
  const advance = (ms: number) => {
    t += ms;
    for (const x of [...timers].sort((a, b) => a.at - b.at)) if (!x.dead && x.at <= t) { x.dead = true; x.fn(); }
  };
  return { deps, log, actions, advance, time: () => t };
}

const opts = (log: string[]) => ({
  strand: 'r' as const, step: 'R19', place: 'bath-pond' as const, goal: ['pd-wish-goal'],
  focused: () => { log.push('focused'); }, ghost: () => { log.push('ghost'); },
  hookAnswer: () => log.push('hook-answer'), hookWrong: () => log.push('hook-wrong'),
});

describe('moment controller', () => {
  it('says the goal on start and becomes the active moment', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    expect(h.log).toEqual(['say:pd-wish-goal']);
    expect(activeMoment()).toBe(m);
  });

  it('repeats the goal after 10 s idle on reading and flags the second idle', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    h.advance(10_000);
    h.advance(10_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'say:pd-wish-goal', 'focused']);
    expect(h.actions).toEqual([{ type: 'place/idle', strand: 'r', step: 'R19', place: 'bath-pond' }]);
  });

  it('restarts the idle timer on a touch and stops running speech', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    h.advance(9_000);
    m.touch();
    h.advance(9_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'act']);
  });

  it('runs the focused hint on a miss and the ghost on a second miss', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    m.miss();
    m.miss();
    expect(h.log).toEqual(['say:pd-wish-goal', 'act', 'focused', 'act', 'ghost']);
  });

  it('answers with the result and stops being active', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    h.advance(3_000);
    expect(m.answer()).toEqual({ result: 'first', ms: 3_000 });
    expect(activeMoment()).toBeNull();
    h.advance(60_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'act']);
  });

  it('replays the goal without changing the result', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    await m.replay();
    expect(m.answer().result).toBe('first');
  });

  it('lets the test hook answer, miss and idle like a touch', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    m.hookIdle();
    m.hookWrong();
    m.hookAnswer();
    expect(h.log).toEqual(['say:pd-wish-goal', 'say:pd-wish-goal', 'act', 'hook-wrong', 'act', 'hook-answer']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/moment.test.ts`
Expected: FAIL, cannot resolve `src/ui/moment.ts`.

- [ ] **Step 3: Write the controller**

`src/ui/moment.ts`:

```ts
import { idleDelay, onAnswer, onIdle, onMiss, onTouch, openMoment, type HintEffect, type MomentState } from '../core/places/hints.ts';
import type { AnyStrand, PlaceId, Result, StepId } from '../core/places/types.ts';
import type { PlaceAction } from '../core/places/actions.ts';

export type MomentDeps = {
  now(): number;
  setTimer(fn: () => void, ms: number): () => void;
  say(ids: string[]): Promise<void>;
  act(): void;
  dispatch(a: PlaceAction): void;
};
export type MomentOpts = {
  strand: AnyStrand; step: StepId; place: PlaceId; goal: string[];
  focused(): Promise<void> | void; ghost(): Promise<void> | void;
  hookAnswer(): void; hookWrong(): void;
};
export type Moment = {
  readonly state: MomentState;
  start(): Promise<void>; touch(): void; miss(): void;
  answer(chosenTouchAt?: number): { result: Result; ms: number };
  replay(): Promise<void>; dispose(): void;
  hookAnswer(): void; hookWrong(): void; hookIdle(): void;
};

let active: Moment | null = null;
export function activeMoment(): Moment | null { return active; }

export function createMoment(o: MomentOpts, d: MomentDeps): Moment {
  let state = openMoment(o.strand, d.now());
  let cancel: (() => void) | null = null;
  let firstChosenTouch: number | null = null;

  const run = (fx: HintEffect[]) => {
    for (const f of fx) {
      if (f.kind === 'repeat-goal') void d.say(o.goal);
      if (f.kind === 'focused') void o.focused();
      if (f.kind === 'ghost-answer') void o.ghost();
      if (f.kind === 'idle-flag') d.dispatch({ type: 'place/idle', strand: o.strand, step: o.step, place: o.place });
    }
  };
  const arm = () => {
    cancel?.();
    if (state.done) return;
    cancel = d.setTimer(() => { idle(); }, idleDelay(o.strand));
  };
  const idle = () => {
    let fx: HintEffect[];
    [state, fx] = onIdle(state);
    run(fx);
    arm();
  };

  const m: Moment = {
    get state() { return state; },
    async start() {
      active = m;
      state = openMoment(o.strand, d.now());
      arm();
      await d.say(o.goal);
    },
    touch() {
      if (state.done) return;
      d.act();
      state = onTouch(state);
      firstChosenTouch ??= d.now();
      arm();
    },
    miss() {
      if (state.done) return;
      d.act();
      let fx: HintEffect[];
      [state, fx] = onMiss(state);
      firstChosenTouch = null;
      run(fx);
      arm();
    },
    answer(chosenTouchAt?: number) {
      d.act();
      const out = onAnswer(state, chosenTouchAt ?? firstChosenTouch ?? d.now());
      state = out.state;
      m.dispose();
      return { result: out.result, ms: out.ms };
    },
    async replay() {
      state = onTouch(state);
      arm();
      await d.say(o.goal);
    },
    dispose() {
      cancel?.();
      cancel = null;
      if (active === m) active = null;
    },
    hookAnswer() { d.act(); o.hookAnswer(); },
    hookWrong() { d.act(); o.hookWrong(); },
    hookIdle() { cancel?.(); idle(); },
  };
  return m;
}
```

Then `src/ui/moment-deps.ts`, a separate file so the pure test never loads the store or the audio player:

```ts
import { game } from '../game.svelte.ts';
import type { MomentDeps } from './moment.ts';
import type { PlaceAction } from '../core/places/actions.ts';
import { act, sayAll } from '../audio/index.ts';

export function defaultDeps(dispatch: (a: PlaceAction) => void = (a) => game.dispatch(a)): MomentDeps {
  return {
    now: () => game.now(),
    setTimer: (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); },
    say: (ids) => sayAll(ids),
    act: () => act(),
    dispatch,
  };
}
```

Note on the `touch` log in the test "restarts the idle timer": the controller calls `d.act()` on each touch, so the log has one `act`.

- [ ] **Step 4: Write the ghost hand store**

`src/ui/ghost.ts`:

```ts
export type Point = { x: number; y: number };
export type GhostPath = { from: Point; to: Point; carry?: string; ms: number; half: boolean; taps: number; token: number };

type Sub = (p: GhostPath | null) => void;
const subs = new Set<Sub>();
let current: GhostPath | null = null;
let token = 0;
let resolveCurrent: (() => void) | null = null;

function set(p: GhostPath | null) { current = p; for (const s of subs) s(p); }

export const ghost = {
  subscribe(fn: Sub) { subs.add(fn); fn(current); return () => subs.delete(fn); },
};

/** The hand travels from a to b (half: goes halfway and back). A touch anywhere calls ghostStop. */
export function ghostMove(from: Point, to: Point, opts: { carry?: string; ms?: number; half?: boolean } = {}): Promise<void> {
  ghostStop();
  token += 1;
  const ms = opts.ms ?? 1400;
  set({ from, to, carry: opts.carry, ms, half: opts.half ?? false, taps: 0, token });
  return new Promise((resolve) => {
    resolveCurrent = resolve;
    const mine = token;
    setTimeout(() => { if (mine === token) ghostStop(); }, ms + 200);
  });
}

export function ghostTap(at: Point, taps = 2): Promise<void> {
  ghostStop();
  token += 1;
  const ms = 500 * taps;
  set({ from: at, to: at, ms, half: false, taps, token });
  return new Promise((resolve) => {
    resolveCurrent = resolve;
    const mine = token;
    setTimeout(() => { if (mine === token) ghostStop(); }, ms + 200);
  });
}

export function ghostStop(): void {
  token += 1;
  set(null);
  resolveCurrent?.();
  resolveCurrent = null;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/moment.test.ts tests/places/hints.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/ui/moment.ts games/moon-meadow-home/src/ui/moment-deps.ts games/moon-meadow-home/src/ui/ghost.ts games/moon-meadow-home/tests/places/moment.test.ts
git commit -m "Add the moment controller and ghost hand store"
```

**Acceptance:** a scene can open a checked moment, get idle repeats, hints, the ghost hand and an idle flag on time, answer it with a result and decision time, and the test hook can drive it.

### Task A4: Moonbeam, ghost hand, replay, bubble and crown components

**Files:**
- Create: `src/ui/Moonbeam.svelte`, `src/ui/GhostHand.svelte`, `src/ui/ReplayButton.svelte`, `src/ui/Bubble.svelte`, `src/ui/Crown.svelte`, `src/ui/places-svg.ts`
- Test: `tests/places/places-svg.test.ts`

**Interfaces:**
- Consumes: `ghost`, `ghostStop` (Task A3); `activeMoment` (Task A3); audio facade `say`.
- Produces:
  - `<Moonbeam target={{x,y,w,h} | null} area={false} />`: a soft column of light from the top of the stage onto the target. With `area` true it widens to the whole rectangle. Animates opacity only. `pointer-events: none`.
  - `<GhostHand />`: mounted once by `Meadow.svelte` and by every place scene. Reads the `ghost` store, moves a hand image with a CSS transform transition over `ms`, optional carried picture (HTML string from `places-svg.ts`). `pointer-events: none`. A `pointerdown` listener on `window` (capture phase) calls `ghostStop()` and lets the event continue.
  - `<ReplayButton onreplay={() => void} />`: 80 x 80 px at stage (128, 24), `aria-label="replay"`. On `pointerdown` it calls `activeMoment()?.replay()` when a moment is active, else `onreplay()`.
  - `<Bubble kind={BubbleKind} x={number} y={number} picture={string} babyFace={BabyView | null} ontap={() => void} />`: a 120 x 120 px round picture bubble with a slow float (transform), `aria-label="bubble {kind}"`. Never shows text.
  - `<Crown jewels={number} ribbons={string[]} ontap={() => void} />`: 88 x 88 px at stage (24, 24), `aria-label="crown"`. Shows a small gem count dot when `jewels > 0` (Task B2 fills it) and one coloured ribbon per title (Task C5).
  - `places-svg.ts`: `svg(name: SvgName, opts?: { colour?: string; size?: 'tiny' | 'big'; label?: string }): string` returning a self-contained SVG string, with `type SvgName = 'jar' | 'jar-label' | 'shelf' | 'bubble' | 'jewel-letter' | 'jewel-number' | 'stone' | 'plot-sign' | 'hammer' | 'arch' | 'flag' | 'sash' | 'envelope' | 'note-card' | 'mist' | 'ribbon' | 'bow' | 'clip' | 'star' | 'crown' | 'cape' | 'garland' | 'pin-pot' | 'parcel' | 'plank' | 'wheelbarrow' | 'scissors' | 'map-scroll' | 'moon' | 'gate' | 'parent' | 'decor' | 'pin' | 'gift' | 'basket' | 'bag' | 'place'`. Scenes use `decor`, `pin`, `gift` and `place` (a small house) as the fallback for any missing decoration, pin, gift or place picture, coloured from a hash of the id. Fills come from the style: pastel base, warm darker outline, soft top-left highlight, no text except `label` on jars, jewels, arches and flags (Andika).

- [ ] **Step 1: Write the failing test**

`tests/places/places-svg.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { svg, SVG_NAMES } from '../../src/ui/places-svg.ts';

describe('places svg', () => {
  it('draws every name as a standalone svg with a viewBox and no script', () => {
    for (const name of SVG_NAMES) {
      const s = svg(name);
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).toContain('viewBox=');
      expect(s).not.toContain('<script');
      expect(s).not.toMatch(/filter=|<filter/);
    }
  });

  it('colours and sizes bows, clips and stars', () => {
    expect(svg('bow', { colour: '#e84a8a' })).toContain('#e84a8a');
    expect(svg('bow', { size: 'tiny' })).not.toBe(svg('bow', { size: 'big' }));
  });

  it('writes a label as text and escapes it', () => {
    expect(svg('jar-label', { label: 'foxes' })).toContain('>foxes<');
    expect(svg('jar-label', { label: '<b>' })).toContain('&lt;b&gt;');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/places-svg.test.ts`
Expected: FAIL, cannot resolve `places-svg.ts`.

- [ ] **Step 3: Write `places-svg.ts`**

Export `SVG_NAMES` as a readonly array of the names above and `svg()`. Each shape is a small hand-written SVG in a 0 to 100 viewBox, with two fills (base and a lighter top-left highlight) and a `stroke` one shade darker than the base, `stroke-width` 3, round joins. Text uses `font-family="Andika, sans-serif"`. Escape `label` with a five-character replace (`&`, `<`, `>`, `"`, `'`). Size: `tiny` scales the shape group by 0.6 around its centre, `big` by 1.0. Default colours: jar glass `#e8f4ff` with `#9cc3e6` outline, label `#fff8e8` with `#d9b98a`, bubble `#ffffff` at 0.85 opacity with `#c9d8ff`, jewel letter `#f7b6d2`, jewel number `#b6dcf7`, stone `#fff1c9`, mist `#eef0ff` at 0.9 opacity.

- [ ] **Step 4: Write the five components**

Each component uses Svelte 5 runes (`let { ... } = $props()`), absolute positioning in stage pixels, `touch-action: none`, and `onpointerdown` (never `onclick`). `GhostHand.svelte` subscribes with `$effect(() => ghost.subscribe((p) => (path = p)))` and drives `transform: translate(...)` with `transition: transform {ms}ms ease-in-out`; for `half` it moves to the midpoint, then back. For `taps` it scales to 0.85 and back `taps` times.

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run tests/places/places-svg.test.ts && npm run check`
Expected: PASS and 0 svelte-check errors in `src/ui/`.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/ui/Moonbeam.svelte games/moon-meadow-home/src/ui/GhostHand.svelte games/moon-meadow-home/src/ui/ReplayButton.svelte games/moon-meadow-home/src/ui/Bubble.svelte games/moon-meadow-home/src/ui/Crown.svelte games/moon-meadow-home/src/ui/places-svg.ts games/moon-meadow-home/tests/places/places-svg.test.ts
git commit -m "Add moonbeam, ghost hand, replay, bubble, crown and code-drawn shapes"
```

**Acceptance:** the components type check, the SVG shapes have no filters or scripts, and replay calls the active moment's replay.

### Task A5: Who's-waiting bubbles

**Files:**
- Create: `src/core/places/bubbles.ts`
- Test: `tests/places/bubbles.test.ts`

**Interfaces:**
- Consumes: `Strand`, `BabyView`, `Rng` (Task A1).
- Produces:
  - `type BubbleKind = 'wish' | 'cousin' | 'post' | 'jewel' | 'hammer' | 'label' | 'asking' | 'two-state' | 'play'`
  - `type BubbleCandidate = { kind: BubbleKind; place: string; strand: Strand | null; key: string; baby?: string; plot?: string }`
  - `type PickInput = { candidates: BubbleCandidate[]; practised: Record<Strand, number>; explained: boolean; afterThirty: boolean; labelForced: boolean }`
  - `pickBubbles(i: PickInput): BubbleCandidate[]` (at most 3)
  - `type CandidateCtx = { herd: BabyView[]; canServe: (place: string, kind: string) => boolean; postWaiting: boolean; cousinWaiting: string | null; jewelPlot: string | null; readyPlots: string[]; freePlay: string[]; rng: Rng }`
  - `bubbleCandidates(c: CandidateCtx): BubbleCandidate[]`
  - `bubblePlace(b: BubbleCandidate): { scene: string; params: Record<string, unknown> }`

- [ ] **Step 1: Write the failing test**

`tests/places/bubbles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bubbleCandidates, bubblePlace, pickBubbles, type BubbleCandidate } from '../../src/core/places/bubbles.ts';
import { baby, rng } from './helpers.ts';

const c = (kind: BubbleCandidate['kind'], place: string, strand: BubbleCandidate['strand']): BubbleCandidate => ({ kind, place, strand, key: `${kind}:${place}` });
const base = { practised: { r: 0, s: 0, m: 0 }, explained: true, afterThirty: false, labelForced: false };

describe('pickBubbles', () => {
  it('shows only the label bubble before the bubbles are explained (decision D2)', () => {
    const out = pickBubbles({ ...base, explained: false, candidates: [c('wish', 'meadow', 'r'), c('label', 'toy-shelf', 's'), c('hammer', 'row-2', null)] });
    expect(out.map((b) => b.kind)).toEqual(['label']);
  });

  it('shows at most three', () => {
    const out = pickBubbles({ ...base, candidates: [c('wish', 'meadow', 'r'), c('label', 'toy-shelf', 's'), c('post', 'post-box', 'm'), c('cousin', 'salon', 'r')] });
    expect(out).toHaveLength(3);
  });

  it('serves the least practised strand first, ties in the order s, r, m', () => {
    const cands = [c('wish', 'meadow', 'r'), c('post', 'post-box', 'm'), c('label', 'toy-shelf', 's'), c('cousin', 'salon', 'r')];
    expect(pickBubbles({ ...base, practised: { r: 5, s: 1, m: 3 }, candidates: cands }).map((b) => b.kind)).toEqual(['label', 'post', 'wish']);
    expect(pickBubbles({ ...base, candidates: cands }).map((b) => b.kind)).toEqual(['label', 'wish', 'cousin']);
  });

  it('never shows two bubbles over one place', () => {
    const out = pickBubbles({ ...base, candidates: [c('asking', 'meadow-wishes', 'r'), c('two-state', 'meadow-wishes', 'r'), c('label', 'toy-shelf', 's')] });
    expect(out.filter((b) => b.place === 'meadow-wishes')).toHaveLength(1);
  });

  it('puts one jewel and one hammer bubble first (decision D3)', () => {
    const out = pickBubbles({
      ...base,
      candidates: [c('wish', 'meadow', 'r'), c('label', 'toy-shelf', 's'), c('post', 'post-box', 'm'), c('jewel', 'salon', null), c('hammer', 'row-2', null), c('hammer', 'bath-pond', null)],
    });
    expect(out.map((b) => b.kind)).toEqual(['jewel', 'hammer', 'label']);
  });

  it('keeps the label bubble on screen while it is forced', () => {
    const out = pickBubbles({ ...base, labelForced: true, practised: { r: 0, s: 9, m: 0 }, candidates: [c('wish', 'meadow', 'r'), c('post', 'post-box', 'm'), c('cousin', 'salon', 'r'), c('label', 'toy-shelf', 's')] });
    expect(out.map((b) => b.kind)).toContain('label');
    expect(out).toHaveLength(3);
  });

  it('offers free play first after thirty moments', () => {
    const out = pickBubbles({ ...base, afterThirty: true, candidates: [c('wish', 'meadow', 'r'), c('play', 'dressing', null), c('label', 'toy-shelf', 's')] });
    expect(out[0].kind).toBe('play');
  });

  it('puts free play last before thirty moments', () => {
    const out = pickBubbles({ ...base, candidates: [c('play', 'dressing', null), c('wish', 'meadow', 'r')] });
    expect(out.map((b) => b.kind)).toEqual(['wish', 'play']);
  });

  it('returns nothing when nobody waits', () => {
    expect(pickBubbles({ ...base, candidates: [] })).toEqual([]);
  });
});

describe('bubbleCandidates', () => {
  const herd = [baby('a', 'Pip'), baby('b', 'Tam'), baby('c', 'Dot')];
  it('builds one candidate per waiting thing, and one hammer for the first ready plot', () => {
    const out = bubbleCandidates({
      herd, canServe: (place) => place === 'meadow' || place === 'toy-shelf', postWaiting: true, cousinWaiting: 'dot',
      jewelPlot: 'salon', readyPlots: ['bath-pond', 'row-2'], freePlay: ['dressing'], rng: rng(1),
    });
    expect(out.map((b) => b.kind).sort()).toEqual(['cousin', 'hammer', 'jewel', 'label', 'play', 'post', 'wish']);
    expect(out.find((b) => b.kind === 'hammer')?.plot).toBe('bath-pond');
    expect(herd.map((h) => h.id)).toContain(out.find((b) => b.kind === 'wish')?.baby);
  });

  it('offers nothing that needs a baby without a baby', () => {
    const out = bubbleCandidates({ herd: [], canServe: () => true, postWaiting: false, cousinWaiting: null, jewelPlot: null, readyPlots: [], freePlay: [], rng: rng(1) });
    expect(out.map((b) => b.kind)).toEqual([]);
  });

  it('maps a bubble to its scene', () => {
    expect(bubblePlace({ kind: 'wish', place: 'meadow', strand: 'r', key: 'w', baby: 'a' })).toEqual({ scene: 'wish', params: { baby: 'a', source: 'bubble' } });
    expect(bubblePlace({ kind: 'hammer', place: 'stable-yard', strand: null, key: 'h', plot: 'row-2' })).toEqual({ scene: 'building-day', params: { plot: 'row-2' } });
    expect(bubblePlace({ kind: 'label', place: 'toy-shelf', strand: 's', key: 'l', baby: 'a' })).toEqual({ scene: 'toy-shelf', params: { label: true, baby: 'a' } });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/bubbles.test.ts`
Expected: FAIL, cannot resolve `bubbles.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/places/bubbles.ts`:

```ts
import type { BabyView, Rng, Strand } from './types.ts';

export type BubbleKind = 'wish' | 'cousin' | 'post' | 'jewel' | 'hammer' | 'label' | 'asking' | 'two-state' | 'play';
export type BubbleCandidate = { kind: BubbleKind; place: string; strand: Strand | null; key: string; baby?: string; plot?: string };
export type PickInput = { candidates: BubbleCandidate[]; practised: Record<Strand, number>; explained: boolean; afterThirty: boolean; labelForced: boolean };
export type CandidateCtx = {
  herd: BabyView[]; canServe: (place: string, kind: string) => boolean; postWaiting: boolean; cousinWaiting: string | null;
  jewelPlot: string | null; readyPlots: string[]; freePlay: string[]; rng: Rng;
};

const TIE: Record<Strand, number> = { s: 0, r: 1, m: 2 };

export function pickBubbles(i: PickInput): BubbleCandidate[] {
  if (!i.explained) return i.candidates.filter((b) => b.kind === 'label').slice(0, 1);
  const front: BubbleCandidate[] = [];
  const jewel = i.candidates.find((b) => b.kind === 'jewel');
  const hammer = i.candidates.find((b) => b.kind === 'hammer');
  if (jewel) front.push(jewel);
  if (hammer) front.push(hammer);
  const label = i.labelForced ? i.candidates.find((b) => b.kind === 'label') : undefined;
  if (label) front.push(label);
  const rest = i.candidates.filter((b) => b.kind !== 'jewel' && b.kind !== 'hammer' && b !== label);
  const strandRank = (b: BubbleCandidate) => (b.strand ? i.practised[b.strand] * 10 + TIE[b.strand] : Number.POSITIVE_INFINITY);
  const playFirst = (b: BubbleCandidate) => (i.afterThirty && b.strand === null ? -1 : strandRank(b));
  const sorted = [...rest].sort((a, b) => playFirst(a) - playFirst(b));
  const out: BubbleCandidate[] = [];
  const places = new Set<string>();
  for (const b of [...front, ...sorted]) {
    if (out.length === 3) break;
    if (places.has(b.place)) continue;
    places.add(b.place);
    out.push(b);
  }
  return out;
}

function newest(herd: BabyView[], rng: Rng): BabyView | null {
  if (!herd.length) return null;
  const pool = herd.slice(-12);
  return pool[Math.floor(rng() * pool.length)];
}

export function bubbleCandidates(c: CandidateCtx): BubbleCandidate[] {
  const out: BubbleCandidate[] = [];
  const wishBaby = newest(c.herd, c.rng);
  if (wishBaby && c.canServe('meadow', 'wish')) out.push({ kind: 'wish', place: 'meadow', strand: 'r', key: `wish:${wishBaby.id}`, baby: wishBaby.id });
  const finder = newest(c.herd, c.rng);
  if (finder && c.canServe('toy-shelf', 'label')) out.push({ kind: 'label', place: 'toy-shelf', strand: 's', key: `label:${finder.id}`, baby: finder.id });
  if (c.postWaiting) out.push({ kind: 'post', place: 'post-box', strand: 'm', key: 'post' });
  if (c.cousinWaiting) out.push({ kind: 'cousin', place: 'salon', strand: 'r', key: `cousin:${c.cousinWaiting}` });
  if (c.jewelPlot) out.push({ kind: 'jewel', place: c.jewelPlot, strand: null, key: `jewel:${c.jewelPlot}`, plot: c.jewelPlot });
  if (c.readyPlots.length) {
    const plot = c.readyPlots[0];
    out.push({ kind: 'hammer', place: plot.startsWith('row-') ? 'stable-yard' : plot, strand: null, key: `hammer:${plot}`, plot });
  }
  if (c.herd.length >= 3 && c.canServe('meadow-wishes', 'asking')) out.push({ kind: 'asking', place: 'meadow-wishes', strand: 'r', key: 'asking' });
  if (c.herd.length >= 1 && c.canServe('meadow-wishes', 'two-state')) out.push({ kind: 'two-state', place: 'meadow-wishes', strand: 'r', key: 'two-state' });
  for (const p of c.freePlay) out.push({ kind: 'play', place: p, strand: null, key: `play:${p}` });
  return out;
}

export function bubblePlace(b: BubbleCandidate): { scene: string; params: Record<string, unknown> } {
  switch (b.kind) {
    case 'wish': return { scene: 'wish', params: { baby: b.baby, source: 'bubble' } };
    case 'label': return { scene: 'toy-shelf', params: { label: true, baby: b.baby } };
    case 'post': return { scene: 'post-box', params: {} };
    case 'cousin': return { scene: 'salon', params: { cousin: true } };
    case 'jewel': return { scene: 'meadow', params: { jewel: b.plot } };
    case 'hammer': return { scene: 'building-day', params: { plot: b.plot } };
    case 'asking': return { scene: 'meadow-wishes', params: { kind: 'asking' } };
    case 'two-state': return { scene: 'meadow-wishes', params: { kind: 'two-state' } };
    case 'play': return { scene: b.place, params: {} };
  }
}
```

The `bubbleCandidates` test with `canServe` only true for meadow and toy-shelf yields no asking or two-state candidates, so the sorted kinds are the seven in the test.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/bubbles.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/places/bubbles.ts games/moon-meadow-home/tests/places/bubbles.test.ts
git commit -m "Add who's-waiting bubble planning"
```

**Acceptance:** never more than three bubbles, never two over one place, the least practised strand first, jewel and hammer first, the forced label kept, and only the label bubble before bubbles are explained.

### Task A6: Opening queue

**Files:**
- Create: `src/core/places/openings.ts`, `content/places/openings.json`
- Modify: `src/core/places/content.ts` (add `openingDefs`)
- Test: `tests/places/openings.test.ts`

**Interfaces:**
- Consumes: `PlacesState`, `currentVisit` (Task A1); `LearnerView`; `released`.
- Produces:
  - `type OpeningDef = { id: string; release: string; where: 'meadow' | 'nest'; lines: string[]; ghost: string | null }`
  - `type OpeningCtx = { visitIndex: number; herd: number; announced: Record<string, string>; announcedThisVisit: boolean; release: string; mathsPlacementEnded: boolean; postBuilt: boolean; villageStoneLit: boolean; reachedR33: boolean; freshJewelWaiting: boolean }`
  - `earned(id: string, c: OpeningCtx): boolean`
  - `openingDue(c: OpeningCtx, defs?: OpeningDef[]): string | null`
  - `isAnnounced(s: PlacesState, id: string): boolean`
  - `openingCtx(s: PlacesState, l: LearnerView, extra: { postBuilt: boolean; villageStoneLit: boolean; freshJewelWaiting: boolean; release?: string }): OpeningCtx`
  - `REWARD_OPENINGS: ReadonlySet<string>` (`hundred-party`, `herd-banner`): these may share a visit.
  - `JEWELS_OPENING: OpeningDef` (`id: 'jewels'`)

- [ ] **Step 1: Write the content file**

`content/places/openings.json`:

```json
{
  "jewels": { "id": "jewels", "release": "1.1", "where": "meadow", "lines": ["jw-new-jewel"], "ghost": "jewel" },
  "order": [
    { "id": "bath-pond", "release": "1.0", "where": "meadow", "lines": ["mw-pond-ready"], "ghost": "bath-pond" },
    { "id": "bubbles", "release": "1.0", "where": "meadow", "lines": ["mw-bubbles-explain"], "ghost": "bubble" },
    { "id": "two-egg", "release": "1.1", "where": "nest", "lines": [], "ghost": null },
    { "id": "dressing", "release": "1.1", "where": "meadow", "lines": ["lumi-dressing-open"], "ghost": "dressing" },
    { "id": "post-box", "release": "1.1", "where": "meadow", "lines": ["mw-post-ready"], "ghost": "post-box" },
    { "id": "notes", "release": "1.1", "where": "meadow", "lines": ["mw-notes-open"], "ghost": "post-box" },
    { "id": "letter-lane", "release": "1.2", "where": "meadow", "lines": ["mw-letter-lane-open"], "ghost": "letter-lane" },
    { "id": "valley-map", "release": "1.2", "where": "meadow", "lines": ["vm-this-is-valley"], "ghost": "map" },
    { "id": "asking-wishes", "release": "1.2", "where": "meadow", "lines": ["y1-open"], "ghost": "meadow-wishes" },
    { "id": "come-along", "release": "1.2", "where": "meadow", "lines": ["ca-ribbon"], "ghost": "ribbon" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import openingsJson from '../../../content/places/openings.json' with { type: 'json' };
import type { OpeningDef } from './openings.ts';
export const openingDefs: OpeningDef[] = openingsJson.order as OpeningDef[];
export const jewelsOpening: OpeningDef = openingsJson.jewels as OpeningDef;
```

- [ ] **Step 2: Write the failing test**

`tests/places/openings.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { earned, isAnnounced, openingCtx, openingDue, type OpeningCtx } from '../../src/core/places/openings.ts';
import { ev, foldAll, learner, resetSeq } from './helpers.ts';

beforeEach(resetSeq);

const ctx = (o: Partial<OpeningCtx> = {}): OpeningCtx => ({
  visitIndex: 2, herd: 0, announced: {}, announcedThisVisit: false, release: '1.3', mathsPlacementEnded: false,
  postBuilt: false, villageStoneLit: false, reachedR33: false, freshJewelWaiting: false, ...o,
});

describe('opening queue', () => {
  it('announces nothing from the queue in visit 1', () => {
    expect(openingDue(ctx({ visitIndex: 1, herd: 30 }))).toBeNull();
  });

  it('follows the order and skips what is not earned', () => {
    expect(openingDue(ctx({ herd: 3 }))).toBe('bubbles');
    expect(openingDue(ctx({ herd: 6 }))).toBe('bath-pond');
  });

  it('announces at most one thing per visit, even for a herd of 45 on Moving Day', () => {
    expect(openingDue(ctx({ herd: 45, announcedThisVisit: true }))).toBeNull();
  });

  it('brings the first fresh jewel ahead of the queue', () => {
    expect(openingDue(ctx({ herd: 6, freshJewelWaiting: true }))).toBe('jewels');
    expect(openingDue(ctx({ herd: 6, freshJewelWaiting: true, announced: { jewels: 'v2' } }))).toBe('bath-pond');
  });

  it('skips openings of a later release', () => {
    expect(openingDue(ctx({ herd: 30, release: '1.0', announced: { 'bath-pond': 'v2', bubbles: 'v3' } }))).toBeNull();
  });

  it('gives a herd of 25 one new thing per visit in the expected order', () => {
    const seen: string[] = [];
    let announced: Record<string, string> = {};
    for (let v = 2; v <= 9; v++) {
      const id = openingDue(ctx({ visitIndex: v, herd: 25, announced, mathsPlacementEnded: v >= 3, postBuilt: 'post-box' in announced }));
      if (id) { seen.push(id); announced = { ...announced, [id]: `v${v}` }; }
    }
    expect(seen).toEqual(['bath-pond', 'bubbles', 'two-egg', 'dressing', 'post-box', 'notes', 'letter-lane', 'come-along']);
  });

  it('knows each earned rule', () => {
    expect(earned('bath-pond', ctx({ herd: 4 }))).toBe(false);
    expect(earned('bath-pond', ctx({ herd: 5 }))).toBe(true);
    expect(earned('post-box', ctx({ herd: 15 }))).toBe(true);
    expect(earned('letter-lane', ctx({ herd: 19 }))).toBe(false);
    expect(earned('two-egg', ctx({ mathsPlacementEnded: true }))).toBe(true);
    expect(earned('notes', ctx({ postBuilt: true }))).toBe(true);
    expect(earned('valley-map', ctx({ villageStoneLit: true }))).toBe(true);
    expect(earned('asking-wishes', ctx({ reachedR33: true }))).toBe(true);
    expect(earned('come-along', ctx({ herd: 12, visitIndex: 5 }))).toBe(false);
    expect(earned('come-along', ctx({ herd: 12, visitIndex: 6 }))).toBe(true);
  });

  it('builds its context from the fold, ignoring rewards that may share a visit', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 0 }), ev('visit.end', { visit: 'v1' }),
      ev('visit.start', { visit: 'v2', tz: 0 }), ev('opening.announced', { opening: 'hundred-party' }),
    ]);
    const c = openingCtx(s, learner(), { postBuilt: false, villageStoneLit: false, freshJewelWaiting: false });
    expect(c.visitIndex).toBe(2);
    expect(c.announcedThisVisit).toBe(false);
    expect(isAnnounced(s, 'hundred-party')).toBe(true);
    expect(isAnnounced(s, 'bubbles')).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/openings.test.ts`
Expected: FAIL, cannot resolve `openings.ts`.

- [ ] **Step 4: Write the implementation**

`src/core/places/openings.ts`:

```ts
import type { LearnerView } from './types.ts';
import { currentVisit, type PlacesState } from './state.ts';
import { CURRENT_RELEASE, jewelsOpening, openingDefs, released } from './content.ts';

export type OpeningDef = { id: string; release: string; where: 'meadow' | 'nest'; lines: string[]; ghost: string | null };
export type OpeningCtx = {
  visitIndex: number; herd: number; announced: Record<string, string>; announcedThisVisit: boolean; release: string;
  mathsPlacementEnded: boolean; postBuilt: boolean; villageStoneLit: boolean; reachedR33: boolean; freshJewelWaiting: boolean;
};

export const REWARD_OPENINGS: ReadonlySet<string> = new Set(['hundred-party', 'herd-banner']);

export function earned(id: string, c: OpeningCtx): boolean {
  switch (id) {
    case 'bath-pond': return c.herd >= 5;
    case 'bubbles': return c.visitIndex >= 2;
    case 'two-egg': return c.mathsPlacementEnded;
    case 'dressing': return true;
    case 'post-box': return c.herd >= 15;
    case 'notes': return c.postBuilt;
    case 'letter-lane': return c.herd >= 20;
    case 'valley-map': return c.villageStoneLit;
    case 'asking-wishes': return c.reachedR33;
    case 'come-along': return c.herd >= 12 && c.visitIndex >= 6;
    default: return false;
  }
}

export function openingDue(c: OpeningCtx, defs: OpeningDef[] = openingDefs): string | null {
  if (c.visitIndex <= 1 || c.announcedThisVisit) return null;
  if (c.freshJewelWaiting && !('jewels' in c.announced) && released(jewelsOpening.release, c.release)) return 'jewels';
  for (const d of defs) {
    if (d.id in c.announced) continue;
    if (!released(d.release, c.release)) continue;
    if (earned(d.id, c)) return d.id;
  }
  return null;
}

export function isAnnounced(s: PlacesState, id: string): boolean {
  return id in s.announced;
}

export function openingCtx(s: PlacesState, l: LearnerView, extra: { postBuilt: boolean; villageStoneLit: boolean; freshJewelWaiting: boolean; release?: string }): OpeningCtx {
  const v = currentVisit(s);
  return {
    visitIndex: v?.index ?? 0,
    herd: s.herd,
    announced: s.announced,
    announcedThisVisit: (v?.announced ?? []).some((id) => !REWARD_OPENINGS.has(id)),
    release: extra.release ?? CURRENT_RELEASE,
    mathsPlacementEnded: l.placementEnded.m,
    postBuilt: extra.postBuilt,
    villageStoneLit: extra.villageStoneLit,
    reachedR33: l.reached('R33'),
    freshJewelWaiting: extra.freshJewelWaiting,
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/openings.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/openings.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/openings.json games/moon-meadow-home/tests/places/openings.test.ts
git commit -m "Add the opening queue"
```

**Acceptance:** one opening per visit in the table order, visit 1 exempt, the first fresh jewel first, unreleased and unearned openings skipped.

### Task A7: Meadow hub

**Files:**
- Create: `src/core/places/meadow.ts`, `src/scenes/places/Meadow.svelte`, `src/ui/MeadowArrow.svelte`, `src/places/scenes.ts`, `src/places/nav.ts`, `src/places/session.ts`, `src/places/hook.ts`
- Test: `tests/places/meadow.test.ts`

**Interfaces:**
- Consumes: `PlacesState`, `currentVisit` (A1); `pickBubbles`, `bubbleCandidates`, `bubblePlace` (A5); `openingDue`, `openingCtx`, `openingDefs` (A6); `Moonbeam`, `GhostHand`, `ReplayButton`, `Bubble`, `Crown`, `ghostTap`, `ghostMove` (A3, A4); heartbeat `MeadowLife.svelte`; store `game`; `canServeSlot`, `visitPlan` (A1b); audio `sayAll`.
- Produces:
  - `type EdgeId = 'toy-shelf' | 'stables' | 'bath-pond' | 'dressing' | 'post-box' | 'letter-lane' | 'salon' | 'map'`
  - `type Edge = { id: EdgeId; scene: string; params: Record<string, unknown>; x: number; y: number; w: number; h: number; state: 'open' | 'plot' }`
  - `meadowEdges(c: { places: PlacesState; release: string }): Edge[]`
  - `edgeSpot(id: EdgeId): { x: number; y: number; w: number; h: number }`
  - `src/places/nav.ts`: `enterPlace(place: PlaceId, scene?: string, params?: Record<string, unknown>): void` (dispatches `place/leave` for the current place and `place/enter` for the new one, then `game.go`), `toMeadow(): void`, `herdView(): BabyView[]`, `learnerView(): LearnerView`, `currentPlace(): PlaceId | null`
  - `src/places/session.ts`: `noteTouch(babyId: string): void`, `recentTouches(): string[]` (last three, newest first), `once(key: string): boolean` (true the first time per visit), `resetSession(visitId: string): void`
  - `src/places/scenes.ts`: `export const placeScenes: Record<string, Component>` with `meadow`, `toy-shelf`, `bath-pond`, `building-day`, `dressing`, `post-box`, `home-book`, `salon`, `letter-lane`, `valley`, `hundred-party`, `meadow-wishes`, `parent` (later tasks add their entries)
  - `src/places/hook.ts`: `placesHook(): PlacesHook` with, from this task, `bubbles(): { kind: string; place: string }[]`, `tapBubble(kind: string): void`, `edges(): string[]`, `goPlace(id: string): void`, `opening(): string | null`
  - `<MeadowArrow />`: after a place's visible end, a glowing arrow at the scene edge pointing home, `aria-label="meadow"`; on mount it says `mw-meadow-this-way` once per place visit; a tap calls `toMeadow()`.

- [ ] **Step 1: Write the failing test**

`tests/places/meadow.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { meadowEdges } from '../../src/core/places/meadow.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const ids = (events: Parameters<typeof foldAll>[0], release = '1.3') => meadowEdges({ places: foldAll(events), release }).map((e) => `${e.id}:${e.state}`);

describe('meadow edges', () => {
  it('shows the toy shelf and the stables to a new player', () => {
    expect(ids([])).toEqual(['toy-shelf:open', 'stables:open']);
  });

  it('shows the Bath Pond as a plot once announced and as a place once built', () => {
    const start = [ev('visit.start', { visit: 'v2', tz: 0 }), ev('opening.announced', { opening: 'bath-pond' })];
    expect(ids(start)).toContain('bath-pond:plot');
    expect(ids([...start, ev('building.done', { plot: 'bath-pond' })])).toContain('bath-pond:open');
  });

  it('hides a place that is earned but not announced', () => {
    const hatch = Array.from({ length: 6 }, (_, i) => ev('egg.hatched', { baby: `b${i}`, breed: 'moon', kind: 'moon', source: 'nest' }));
    expect(ids(hatch)).not.toContain('bath-pond:plot');
  });

  it('opens the Dressing Corner, Letter Lane and the map scroll on their announcements', () => {
    const out = ids([
      ev('visit.start', { visit: 'v1', tz: 0 }),
      ev('opening.announced', { opening: 'dressing' }), ev('opening.announced', { opening: 'letter-lane' }), ev('opening.announced', { opening: 'valley-map' }),
    ]);
    expect(out).toEqual(expect.arrayContaining(['dressing:open', 'letter-lane:open', 'map:open']));
  });

  it('shows the Post Box as a plot, then open', () => {
    const start = [ev('visit.start', { visit: 'v6', tz: 0 }), ev('opening.announced', { opening: 'post-box' })];
    expect(ids(start)).toContain('post-box:plot');
    expect(ids([...start, ev('building.done', { plot: 'post-box' })])).toContain('post-box:open');
  });

  it('shows the Salon gate once the Salon is built', () => {
    expect(ids([ev('building.done', { plot: 'salon' })])).toContain('salon:open');
  });

  it('hides places of a later release', () => {
    const out = ids([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'letter-lane' })], '1.1');
    expect(out).not.toContain('letter-lane:open');
  });

  it('gives every edge a target of at least 64 px', () => {
    const all = meadowEdges({
      places: foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ...['bath-pond', 'dressing', 'post-box', 'letter-lane', 'valley-map'].map((o) => ev('opening.announced', { opening: o })), ev('building.done', { plot: 'salon' })]),
      release: '1.3',
    });
    for (const e of all) { expect(e.w).toBeGreaterThanOrEqual(64); expect(e.h).toBeGreaterThanOrEqual(64); }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/meadow.test.ts`
Expected: FAIL, cannot resolve `meadow.ts`.

- [ ] **Step 3: Write `meadow.ts`**

```ts
import type { PlacesState } from './state.ts';
import { released } from './content.ts';

export type EdgeId = 'toy-shelf' | 'stables' | 'bath-pond' | 'dressing' | 'post-box' | 'letter-lane' | 'salon' | 'map';
export type Edge = { id: EdgeId; scene: string; params: Record<string, unknown>; x: number; y: number; w: number; h: number; state: 'open' | 'plot' };

const SPOTS: Record<EdgeId, { x: number; y: number; w: number; h: number }> = {
  'toy-shelf': { x: 24, y: 330, w: 170, h: 240 },
  stables: { x: 1010, y: 300, w: 150, h: 200 },
  'bath-pond': { x: 40, y: 630, w: 230, h: 170 },
  dressing: { x: 470, y: 120, w: 180, h: 150 },
  'post-box': { x: 1000, y: 600, w: 160, h: 180 },
  'letter-lane': { x: 1010, y: 130, w: 150, h: 150 },
  salon: { x: 700, y: 60, w: 170, h: 150 },
  map: { x: 224, y: 24, w: 80, h: 80 },
};
const RELEASE: Record<EdgeId, string> = { 'toy-shelf': '1.0', stables: '1.0', 'bath-pond': '1.0', dressing: '1.1', 'post-box': '1.1', 'letter-lane': '1.2', salon: '1.2', map: '1.2' };

export function edgeSpot(id: EdgeId) { return SPOTS[id]; }

export function meadowEdges(c: { places: PlacesState; release: string }): Edge[] {
  const s = c.places;
  const out: Edge[] = [];
  const add = (id: EdgeId, scene: string, state: 'open' | 'plot', params: Record<string, unknown> = {}) => {
    if (released(RELEASE[id], c.release)) out.push({ id, scene, params, state, ...SPOTS[id] });
  };
  const built = (plot: string) => Boolean(s.buildings[plot]?.done);
  const announced = (id: string) => id in s.announced;
  add('toy-shelf', 'toy-shelf', 'open');
  add('stables', 'stalls', 'open');
  if (built('bath-pond')) add('bath-pond', 'bath-pond', 'open');
  else if (announced('bath-pond')) add('bath-pond', 'building-day', 'plot', { plot: 'bath-pond' });
  if (announced('dressing')) add('dressing', 'dressing', 'open');
  if (built('post-box')) add('post-box', 'post-box', 'open');
  else if (announced('post-box')) add('post-box', 'building-day', 'plot', { plot: 'post-box' });
  if (announced('letter-lane')) add('letter-lane', 'letter-lane', 'open');
  if (built('salon')) add('salon', 'salon', 'open');
  if (announced('valley-map')) add('map', 'valley', 'open');
  return out;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/meadow.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the glue files**

`src/places/session.ts`:

```ts
let visitId = '';
let touches: string[] = [];
let seen = new Set<string>();

export function resetSession(id: string): void {
  if (id === visitId) return;
  visitId = id; touches = []; seen = new Set();
}
export function noteTouch(babyId: string): void {
  touches = [babyId, ...touches.filter((t) => t !== babyId)].slice(0, 3);
}
export function recentTouches(): string[] { return [...touches]; }
export function once(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
```

`src/places/nav.ts`:

```ts
import { game } from '../game.svelte.ts';
import type { BabyView, LearnerView, PlaceId } from '../core/places/types.ts';
import { toLearnerView } from '../core/learning/view.ts';

let here: PlaceId | null = null;

export function currentPlace(): PlaceId | null { return here; }

export function enterPlace(place: PlaceId, scene: string = place, params: Record<string, unknown> = {}): void {
  if (here && here !== place) game.dispatch({ type: 'place/leave', place: here });
  if (here !== place) game.dispatch({ type: 'place/enter', place });
  here = place;
  game.go(scene, params);
}

export function toMeadow(): void { enterPlace('meadow', 'meadow'); }

export function herdView(): BabyView[] { return game.world.herd as BabyView[]; }

export function learnerView(): LearnerView { return toLearnerView(game.learner); }
```

`src/places/scenes.ts` starts with:

```ts
import type { Component } from 'svelte';
import Meadow from '../scenes/places/Meadow.svelte';

export const placeScenes: Record<string, Component<any>> = {
  meadow: Meadow,
};
```

Later tasks add one line per scene to this object.

- [ ] **Step 6: Write `Meadow.svelte`**

Layers, back to front, on the 1180 x 820 stage:

1. Background: `<Sprite id="bg-meadow" w={1180} h={820} />` when `hasArt('bg-meadow')`, else a CSS gradient (`#cfeec3` grass, `#bfe3ff` sky band at the top 180 px).
2. Edges from `meadowEdges({ places: game.world.places, release: CURRENT_RELEASE })`, each a button with `aria-label={edge.id}` and the picture `place-<id>` (or `places-svg` `plot-sign` for `state: 'plot'`, with a hammer when the plot is in `readyPlots`). `onpointerdown` calls `enterPlace(...)` with the edge's scene and params; plots enter `building-day`.
3. `<MeadowLife onbabytouch={noteTouch} />` from heartbeat.
4. Bubbles: compute once on mount and after each return to the meadow:
   ```ts
   const plan = visitPlan();
   const candidates = bubbleCandidates({
     herd: herdView(), canServe: canServeSlot, postWaiting: postWaitingNow(),
     cousinWaiting: cousinWaitingNow(), jewelPlot: jewelPlotNow(), readyPlots: readyPlotsNow(), freePlay: freePlayNow(), rng: game.rng,
   });
   bubbles = pickBubbles({
     candidates, practised: plan.practised, explained: isAnnounced(game.world.places, 'bubbles'),
     afterThirty: plan.moments >= 30, labelForced: plan.labelForced,
   });
   ```
   In this task `postWaitingNow`, `cousinWaitingNow` and `jewelPlotNow` return `false`, `null` and `null`; `freePlayNow` returns the open free-play edges (`bath-pond`, `dressing`, `salon`) as place ids; `readyPlotsNow` returns `[]`. Tasks A12, B2, B8 and C2 replace them with the real selectors. Each bubble sits above its place's edge spot (`edgeSpot`), a wish bubble over the herd at (560, 360). A tap dispatches nothing itself; it calls `enterPlace` with `bubblePlace(b)`.
5. Crown, replay and moon: `<Crown ontap={() => enterPlace('home-book')} />`, `<ReplayButton onreplay={replayArrival} />`, the moon at (1000, 30, 120 x 120) with `aria-label="moon"` calling `game.go('goodnight')`.
6. Parent button: `<PinGate />` slot at the top right (Task A15 provides it; in this task render nothing).
7. `<Moonbeam target={beam} />` and `<GhostHand />` on top.

Arrival: on mount, call `resetSession(currentVisit(places)?.id ?? '')`. If the current visit has `hatches >= 1`, compute `openingDue(openingCtx(...))`. If the result has `where: 'meadow'`, play its `lines` with `sayAll`, point the moonbeam and `ghostTap` at its `ghost` target (an edge spot, the first bubble, the map scroll or the jewel box), then dispatch `{ type: 'place/announce', opening: id }`. `replayArrival` repeats the last opening line, or says nothing.

Accessibility labels: `toy-shelf`, `stables`, `bath-pond`, `dressing`, `post-box`, `letter-lane`, `salon`, `map`, `moon`, `crown`, `replay`, `bubble <kind>`.

- [ ] **Step 7: Write the first hook functions**

`src/places/hook.ts`:

```ts
import { game } from '../game.svelte.ts';
import { meadowEdges } from '../core/places/meadow.ts';
import { CURRENT_RELEASE } from '../core/places/content.ts';
import { enterPlace } from './nav.ts';
import type { PlaceId } from '../core/places/types.ts';

export type PlacesHook = Record<string, unknown> & {
  bubbles(): { kind: string; place: string }[];
  tapBubble(kind: string): void;
  edges(): string[];
  goPlace(id: string): void;
  opening(): string | null;
};

let meadowApi: { bubbles(): { kind: string; place: string }[]; tapBubble(kind: string): void; opening(): string | null } | null = null;
export function registerMeadow(api: typeof meadowApi): void { meadowApi = api; }

export function placesHook(): PlacesHook {
  return {
    bubbles: () => meadowApi?.bubbles() ?? [],
    tapBubble: (kind) => meadowApi?.tapBubble(kind),
    edges: () => meadowEdges({ places: game.world.places, release: CURRENT_RELEASE }).map((e) => `${e.id}:${e.state}`),
    goPlace: (id) => enterPlace(id as PlaceId),
    opening: () => meadowApi?.opening() ?? null,
  };
}
```

`Meadow.svelte` calls `registerMeadow({...})` on mount and `registerMeadow(null)` on destroy. Later tasks add their own `register<Place>` function and hook keys in this file in the same way.

- [ ] **Step 8: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add games/moon-meadow-home/src/core/places/meadow.ts games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/ui/MeadowArrow.svelte games/moon-meadow-home/src/places/ games/moon-meadow-home/tests/places/meadow.test.ts
git commit -m "Add the meadow hub with edges, bubbles and opening announcements"
```

**Acceptance:** the meadow shows open places at its edges, plots for announced buildings, at most three bubbles, the crown, replay and moon, and announces one due opening after the first hatch of a visit.

### Task A8: Plurals and heaps

**Files:**
- Create: `src/core/places/plurals.ts`, `src/ui/Heap.svelte`
- Test: `tests/places/plurals.test.ts`

**Interfaces:**
- Consumes: `WordView`, `Rng` (A1).
- Produces:
  - `endingSound(stem: string, ending: 's' | 'es'): 's' | 'z' | 'iz'`
  - `pluralWord(w: WordView): string`
  - `heapCount(seed: number): 3 | 4 | 5`
  - `type HeapSpot = { x: number; y: number; rot: number; z: number }` (x and y in 0 to 1 of the heap box)
  - `heapLayout(count: number, seed: number): HeapSpot[]`
  - `type OneOrManyOption = { id: string; word: string; picture: string; many: boolean; count: number }`
  - `type OneOrManyTask = { target: WordView; plural: boolean; shown: string; options: OneOrManyOption[]; answer: string; dots: 500 | 300 | null; items: string[]; silentEnding: boolean }`
  - `planOneOrMany(target: WordView, plural: boolean, scaffold: 1 | 2 | 3, pool: WordView[], rng: Rng): OneOrManyTask | null`
  - `type OneOrManyMistake = 'one-for-many' | 'many-for-one' | 'other'`
  - `oneOrManyMistake(task: OneOrManyTask, given: OneOrManyOption): OneOrManyMistake | null`
  - `afterLines(task: OneOrManyTask): string[]` (`['word-<shown>', 'pl-more-than-one' | 'pl-just-one']`)
  - `<Heap picture={string} count={number} seed={number} size={number} />`

- [ ] **Step 1: Write the failing test**

`tests/places/plurals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { afterLines, endingSound, heapCount, heapLayout, oneOrManyMistake, planOneOrMany, pluralWord } from '../../src/core/places/plurals.ts';
import { rng, word } from './helpers.ts';

const p = (id: string, graphemes: string[], plural: string, ending: 's' | 'es') => word(id, graphemes, { plural: { word: plural, ending, graphemes: [...graphemes, ending] } });
const hat = p('hat', ['h', 'a', 't'], 'hats', 's');
const duck = p('duck', ['d', 'u', 'ck'], 'ducks', 's');
const boat = p('boat', ['b', 'oa', 't'], 'boats', 's');
const cup = p('cup', ['c', 'u', 'p'], 'cups', 's');
const shell = p('shell', ['sh', 'e', 'll'], 'shells', 's');

describe('ending sounds', () => {
  it.each([
    ['hat', 's', 's'], ['cup', 's', 's'], ['cake', 's', 's'], ['kite', 's', 's'], ['bike', 's', 's'], ['plank', 's', 's'], ['brick', 's', 's'], ['carrot', 's', 's'],
    ['key', 's', 'z'], ['bell', 's', 'z'], ['bead', 's', 'z'], ['apple', 's', 'z'], ['castle', 's', 'z'], ['ring', 's', 'z'], ['chair', 's', 'z'], ['bow', 's', 'z'],
    ['horse', 's', 'iz'], ['fox', 'es', 'iz'], ['dress', 'es', 'iz'], ['brush', 'es', 'iz'], ['peach', 'es', 'iz'],
  ] as const)('%s + %s sounds /%s/', (stem, ending, sound) => {
    expect(endingSound(stem, ending)).toBe(sound);
  });
});

describe('heaps', () => {
  it('has three to five things', () => {
    for (let seed = 0; seed < 30; seed++) expect([3, 4, 5]).toContain(heapCount(seed));
  });
  it('lays out every copy inside its box, the same way for the same seed', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const a = heapLayout(n, 7);
      expect(a).toHaveLength(n);
      expect(heapLayout(n, 7)).toEqual(a);
      for (const s of a) {
        expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThanOrEqual(1);
        expect(s.y).toBeGreaterThanOrEqual(0); expect(s.y).toBeLessThanOrEqual(1);
        expect(Math.abs(s.rot)).toBeLessThanOrEqual(25);
      }
    }
  });
});

describe('one or many', () => {
  const pool = [hat, duck, boat, cup, shell];

  it.each([[1, 3, 500], [2, 4, 300], [3, 6, null]] as const)('scaffold %i shows %i things with dots %s', (level, n, dots) => {
    const t = planOneOrMany(duck, true, level, pool, rng(level))!;
    expect(t.options).toHaveLength(n);
    expect(t.dots).toBe(dots);
    expect(t.options.filter((o) => o.id === t.answer)).toHaveLength(1);
    expect(t.options.some((o) => o.word === 'duck' && o.many)).toBe(true);
    expect(t.options.some((o) => o.word === 'duck' && !o.many)).toBe(true);
    expect(new Set(t.options.map((o) => o.id)).size).toBe(n);
  });

  it('shows the plural word for many and the bare word for one', () => {
    const many = planOneOrMany(duck, true, 1, pool, rng(1))!;
    const one = planOneOrMany(duck, false, 1, pool, rng(1))!;
    expect(many.shown).toBe('ducks');
    expect(many.items).toEqual(['-s']);
    expect(one.shown).toBe('duck');
    expect(one.items).toEqual(['none']);
    expect(many.options.find((o) => o.id === many.answer)?.many).toBe(true);
    expect(one.options.find((o) => o.id === one.answer)?.many).toBe(false);
  });

  it('keeps the ending silent at scaffold 3', () => {
    expect(planOneOrMany(duck, true, 3, pool, rng(1))!.silentEnding).toBe(true);
    expect(planOneOrMany(duck, true, 2, pool, rng(1))!.silentEnding).toBe(false);
  });

  it('returns null when it cannot offer three things', () => {
    expect(planOneOrMany(duck, true, 1, [duck], rng(1))).toBeNull();
    expect(planOneOrMany(word('sun', ['s', 'u', 'n']), true, 1, pool, rng(1))).toBeNull();
  });

  it('names the mistake', () => {
    const t = planOneOrMany(duck, true, 2, pool, rng(4))!;
    const one = t.options.find((o) => o.word === 'duck' && !o.many)!;
    const other = t.options.find((o) => o.word !== 'duck')!;
    expect(oneOrManyMistake(t, one)).toBe('one-for-many');
    expect(oneOrManyMistake(t, other)).toBe('other');
    expect(oneOrManyMistake(t, t.options.find((o) => o.id === t.answer)!)).toBeNull();
    const single = planOneOrMany(duck, false, 2, pool, rng(4))!;
    expect(oneOrManyMistake(single, single.options.find((o) => o.word === 'duck' && o.many)!)).toBe('many-for-one');
  });

  it('reads the word after the act with more than one or just one', () => {
    expect(afterLines(planOneOrMany(duck, true, 1, pool, rng(1))!)).toEqual(['word-ducks', 'pl-more-than-one']);
    expect(afterLines(planOneOrMany(duck, false, 1, pool, rng(1))!)).toEqual(['word-duck', 'pl-just-one']);
  });

  it('knows the plural of a word', () => {
    expect(pluralWord(duck)).toBe('ducks');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/plurals.test.ts`
Expected: FAIL, cannot resolve `plurals.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/places/plurals.ts`:

```ts
import type { Rng, WordView } from './types.ts';

export function endingSound(stem: string, ending: 's' | 'es'): 's' | 'z' | 'iz' {
  if (ending === 'es') return 'iz';
  if (/(se|ce|ge|ze)$/.test(stem)) return 'iz';
  const core = /[^aeiou]e$/.test(stem) ? stem.slice(0, -1) : stem;
  if (/(p|t|k|ck|f|ff|ph)$/.test(core)) return 's';
  return 'z';
}

export function pluralWord(w: WordView): string {
  return w.plural?.word ?? `${w.word}s`;
}

function seeded(seed: number): Rng {
  let a = (seed * 2654435761) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function heapCount(seed: number): 3 | 4 | 5 {
  return (3 + (Math.abs(Math.floor(seed)) % 3)) as 3 | 4 | 5;
}

export type HeapSpot = { x: number; y: number; rot: number; z: number };

export function heapLayout(count: number, seed: number): HeapSpot[] {
  const r = seeded(seed);
  const bottom = Math.min(count, 3);
  const spots: HeapSpot[] = [];
  for (let i = 0; i < count; i++) {
    const row = i < bottom ? 0 : 1;
    const inRow = row === 0 ? bottom : count - bottom;
    const idx = row === 0 ? i : i - bottom;
    const x = inRow === 1 ? 0.5 : 0.2 + (0.6 * idx) / (inRow - 1);
    const y = row === 0 ? 0.72 : 0.42;
    spots.push({
      x: Math.min(1, Math.max(0, x + (r() - 0.5) * 0.08)),
      y: Math.min(1, Math.max(0, y + (r() - 0.5) * 0.06)),
      rot: Math.round((r() - 0.5) * 40),
      z: row * 10 + idx,
    });
  }
  return spots;
}

export type OneOrManyOption = { id: string; word: string; picture: string; many: boolean; count: number };
export type OneOrManyTask = {
  target: WordView; plural: boolean; shown: string; options: OneOrManyOption[]; answer: string;
  dots: 500 | 300 | null; items: string[]; silentEnding: boolean;
};

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

const one = (w: WordView): OneOrManyOption => ({ id: `${w.id}:1`, word: w.word, picture: w.picture, many: false, count: 1 });
const many = (w: WordView, rng: Rng): OneOrManyOption => ({ id: `${w.id}:n`, word: w.word, picture: w.picture, many: true, count: heapCount(Math.floor(rng() * 1000)) });

export function planOneOrMany(target: WordView, plural: boolean, scaffold: 1 | 2 | 3, pool: WordView[], rng: Rng): OneOrManyTask | null {
  if (!target.plural) return null;
  const others = shuffle(pool.filter((w) => w.id !== target.id && w.picture !== target.picture && w.plural), rng);
  const need = scaffold === 1 ? 1 : scaffold === 2 ? 1 : 2;
  if (others.length < need) return null;
  const options: OneOrManyOption[] = [one(target), many(target, rng)];
  if (scaffold === 1) options.push(rng() < 0.5 ? one(others[0]) : many(others[0], rng));
  else for (const w of others.slice(0, need)) options.push(one(w), many(w, rng));
  return {
    target, plural,
    shown: plural ? target.plural.word : target.word,
    options: shuffle(options, rng),
    answer: plural ? `${target.id}:n` : `${target.id}:1`,
    dots: scaffold === 1 ? 500 : scaffold === 2 ? 300 : null,
    items: plural ? [`-${target.plural.ending}`] : ['none'],
    silentEnding: scaffold === 3,
  };
}

export type OneOrManyMistake = 'one-for-many' | 'many-for-one' | 'other';

export function oneOrManyMistake(task: OneOrManyTask, given: OneOrManyOption): OneOrManyMistake | null {
  if (given.id === task.answer) return null;
  if (given.word !== task.target.word) return 'other';
  return task.plural ? 'one-for-many' : 'many-for-one';
}

export function afterLines(task: OneOrManyTask): string[] {
  return [`word-${task.shown}`, task.plural ? 'pl-more-than-one' : 'pl-just-one'];
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/plurals.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `Heap.svelte`**

Props `{ picture: string; count: number; seed: number; size: number }`. A `size x size` box; for each `heapLayout(count, seed)` spot, an absolutely placed `<Sprite id={picture} w={size * 0.5} />` centred at `(x * size, y * size)`, rotated by `rot` degrees, `z-index: z`. `aria-hidden="true"` (the parent option carries the label).

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/plurals.ts games/moon-meadow-home/src/ui/Heap.svelte games/moon-meadow-home/tests/places/plurals.test.ts
git commit -m "Add plural endings, code-drawn heaps and one-or-many planning"
```

**Acceptance:** ending sounds match the British plural rule for the first-playable words, heaps are three to five copies inside their box, and one-or-many tasks have 3, 4 or 6 options with exactly one answer.

### Task A9: Toy shelf labels

**Files:**
- Create: `src/core/places/labels.ts`
- Test: `tests/places/labels.test.ts`

**Interfaces:**
- Consumes: `ServedItem`, `WordView`, `ItemResult`, `Result`, `Rng` (A1); `endingSound`, `heapCount` (A8).
- Produces:
  - `type TrayGem = { g: string; ending: boolean }`
  - `type LabelSlot = { g: string; own: boolean }`
  - `type LabelTask = { served: ServedItem; word: WordView; level: 1 | 2 | 3; s10: boolean; plural: boolean; target: string; wordEnding: 's' | 'es' | null; count: number; slots: LabelSlot[]; endingDock: boolean; tray: TrayGem[]; slip: 'ss' | 'z' | null; prompt: string[]; jarAfterStem: boolean }`
  - `type LabelInput = { served: ServedItem | null; word: WordView | null; own: boolean[]; s06Passed: boolean; stemTray: string[]; rng: Rng }`
  - `planLabel(i: LabelInput): LabelTask | null`
  - `type LabelMistake = 'stem' | 'hiss' | 'iz' | 'dresss' | 'buzz' | 'hop-out' | 'rattle'`
  - `type LabelCheck = { ok: boolean; wrongSlots: number[]; mistake: LabelMistake | null }`
  - `checkLabel(task: LabelTask, built: (string | null)[], ending: string | null): LabelCheck`
  - `labelItems(task: LabelTask, checks: LabelCheck[], result: Result): ItemResult[]`
  - `labelAfterLines(task: LabelTask): string[]`
  - `labelModel(task: LabelTask): string[]` (`['lb-listen', 'word-<target>']`)

- [ ] **Step 1: Write the failing test**

`tests/places/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkLabel, labelAfterLines, labelItems, labelModel, planLabel, type LabelInput } from '../../src/core/places/labels.ts';
import { rng, served, word } from './helpers.ts';

const p = (id: string, graphemes: string[], plural: string, ending: 's' | 'es') => word(id, graphemes, { plural: { word: plural, ending, graphemes: [...graphemes, ending] } });
const fox = p('fox', ['f', 'o', 'x'], 'foxes', 'es');
const key = p('key', ['k', 'ey'], 'keys', 's');
const dress = p('dress', ['d', 'r', 'e', 'ss'], 'dresses', 'es');
const brush = p('brush', ['b', 'r', 'u', 'sh'], 'brushes', 'es');
const hat = p('hat', ['h', 'a', 't'], 'hats', 's');
const bed = word('bed', ['b', 'e', 'd']);

const s10 = (w: typeof fox, level: 1 | 2 | 3, extra: Partial<LabelInput> = {}): LabelInput => ({
  served: served('s', 'S10', w.id, [`-${w.plural!.ending}`], { scaffold: level, kind: 'school' }),
  word: w, own: w.graphemes.map(() => true), s06Passed: false, stemTray: [...w.graphemes, 'v', 'a'], rng: rng(3), ...extra,
});

describe('planLabel', () => {
  it('level 1: the stem is a gift and the tray holds s, es and the slip gem', () => {
    const t = planLabel(s10(fox, 1))!;
    expect(t.slots.every((sl) => !sl.own)).toBe(true);
    expect(t.tray.map((g) => g.g).sort()).toEqual(['es', 's', 'ss']);
    expect(t.tray.every((g) => g.ending)).toBe(true);
    expect(t.endingDock).toBe(true);
    expect(t.plural).toBe(true);
    expect(t.target).toBe('foxes');
    expect([3, 4, 5]).toContain(t.count);
    expect(t.prompt).toEqual(['lb-lets-write', 'word-foxes', 'lb-listen', 'word-foxes']);
  });

  it('uses z as the slip gem on a /z/ ending once S06 is passed', () => {
    expect(planLabel(s10(key, 1, { s06Passed: true }))!.slip).toBe('z');
    expect(planLabel(s10(key, 1, { s06Passed: false }))!.slip).toBe('ss');
    expect(planLabel(s10(hat, 1, { s06Passed: true }))!.slip).toBe('ss');
  });

  it('level 2: her own stem slots plus the stem tray and the three ending gems', () => {
    const t = planLabel(s10(fox, 2, { own: [true, true, false] }))!;
    expect(t.slots.map((sl) => sl.own)).toEqual([true, true, false]);
    expect(t.tray.filter((g) => g.ending).map((g) => g.g).sort()).toEqual(['es', 's', 'ss']);
    expect(t.tray.filter((g) => !g.ending).map((g) => g.g).sort()).toEqual(['a', 'f', 'o', 'v', 'x']);
  });

  it('level 3: says the one word, then the jar decides; about one jar in four holds one thing', () => {
    let ones = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const t = planLabel(s10(brush, 3, { rng: rng(seed) }))!;
      expect(t.count).toBeGreaterThanOrEqual(1);
      expect(t.count).toBeLessThanOrEqual(5);
      expect(t.plural).toBe(t.count > 1);
      expect(t.target).toBe(t.count > 1 ? 'brushes' : 'brush');
      expect(t.prompt).toEqual(['lb-lets-write', 'word-brush', 'lb-listen', 'word-brush']);
      expect(t.jarAfterStem).toBe(true);
      if (t.count === 1) ones++;
    }
    expect(ones / 400).toBeGreaterThan(0.18);
    expect(ones / 400).toBeLessThan(0.32);
  });

  it('plans a plain spelling label without an ending dock', () => {
    const t = planLabel({ served: served('s', 'S03D', 'bed', ['e']), word: bed, own: [true, true, true], s06Passed: false, stemTray: ['b', 'e', 'd', 'a', 'u'], rng: rng(1) })!;
    expect(t.endingDock).toBe(false);
    expect(t.s10).toBe(false);
    expect(t.count).toBe(1);
    expect(t.tray.map((g) => g.g).sort()).toEqual(['a', 'b', 'd', 'e', 'u']);
  });

  it('returns null with nothing to serve or a plural step on a word without a plural', () => {
    expect(planLabel({ ...s10(fox, 1), served: null })).toBeNull();
    expect(planLabel({ ...s10(fox, 1), word: null })).toBeNull();
    expect(planLabel({ ...s10(fox, 1), word: bed })).toBeNull();
  });
});

describe('checkLabel', () => {
  const at = (w: typeof fox, level: 1 | 2 | 3, seed = 3) => planLabel(s10(w, level, { rng: rng(seed) }))!;
  const stem = (w: typeof fox) => w.graphemes;

  it('accepts the right ending', () => {
    expect(checkLabel(at(fox, 1), stem(fox), 'es')).toEqual({ ok: true, wrongSlots: [], mistake: null });
  });
  it('foxs hisses', () => {
    expect(checkLabel(at(fox, 1), stem(fox), 's')).toMatchObject({ ok: false, mistake: 'hiss', wrongSlots: [3] });
  });
  it('keyes reads back as key-iz', () => {
    expect(checkLabel(at(key, 1), stem(key), 'es').mistake).toBe('iz');
  });
  it('dress plus s, or the ss slip gem, is dresss', () => {
    expect(checkLabel(at(dress, 1), stem(dress), 's').mistake).toBe('dresss');
    expect(checkLabel(at(fox, 1), stem(fox), 'ss').mistake).toBe('dresss');
  });
  it('a z ending buzzes', () => {
    expect(checkLabel(at(key, 1), stem(key), 'z').mistake).toBe('buzz');
  });
  it('no ending on a jar of many: they hop out', () => {
    expect(checkLabel(at(fox, 1), stem(fox), null).mistake).toBe('hop-out');
  });
  it('level 3: an ending on a jar of one rattles, no ending is right', () => {
    let seed = 1;
    let t = at(brush, 3, seed);
    while (t.count !== 1) t = at(brush, 3, ++seed);
    expect(checkLabel(t, stem(brush), 'es').mistake).toBe('rattle');
    expect(checkLabel(t, stem(brush), null).ok).toBe(true);
  });
  it('a wrong own stem gem is a stem mistake on that slot', () => {
    const t = planLabel(s10(fox, 2))!;
    expect(checkLabel(t, ['f', 'a', 'x'], 'es')).toEqual({ ok: false, wrongSlots: [1], mistake: 'stem' });
  });
  it('ignores gift slots, which are prefilled', () => {
    const t = planLabel(s10(fox, 2, { own: [false, true, true] }))!;
    expect(checkLabel(t, [null, 'o', 'x'], 'es').ok).toBe(true);
  });
});

describe('label results and lines', () => {
  it('logs each own slot and the ending item (decision D11)', () => {
    const t = planLabel(s10(fox, 2))!;
    const checks = [checkLabel(t, ['f', 'a', 'x'], 'es'), checkLabel(t, ['f', 'o', 'x'], 'es')];
    expect(labelItems(t, checks, 'miss')).toEqual([
      { item: 'f', result: 'first' }, { item: 'o', result: 'miss' }, { item: 'x', result: 'first' }, { item: '-es', result: 'first' },
    ]);
  });
  it('marks every item helped after the ghost hand', () => {
    const t = planLabel(s10(fox, 2))!;
    expect(labelItems(t, [], 'helped').every((i) => i.result === 'helped')).toBe(true);
  });
  it('marks the ending missed after an ending mistake', () => {
    const t = planLabel(s10(fox, 1))!;
    expect(labelItems(t, [checkLabel(t, stem(fox), 's')], 'miss')).toEqual([{ item: '-es', result: 'miss' }]);
  });
  it('reads the label after the act', () => {
    const t = planLabel(s10(fox, 1))!;
    expect(labelAfterLines(t)).toEqual(['word-foxes', 'pl-more-than-one']);
    expect(labelModel(t)).toEqual(['lb-listen', 'word-foxes']);
    const plain = planLabel({ served: served('s', 'S03D', 'bed', ['e']), word: bed, own: [true, true, true], s06Passed: false, stemTray: ['b', 'e', 'd'], rng: rng(1) })!;
    expect(labelAfterLines(plain)).toEqual(['word-bed']);
  });
});

function stem(w: { graphemes: string[] }) { return w.graphemes; }
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/labels.test.ts`
Expected: FAIL, cannot resolve `labels.ts`.

- [ ] **Step 3: Write the implementation**

`src/core/places/labels.ts`:

```ts
import type { ItemResult, Result, Rng, ServedItem, WordView } from './types.ts';
import { endingSound, heapCount } from './plurals.ts';

export type TrayGem = { g: string; ending: boolean };
export type LabelSlot = { g: string; own: boolean };
export type LabelTask = {
  served: ServedItem; word: WordView; level: 1 | 2 | 3; s10: boolean; plural: boolean; target: string;
  wordEnding: 's' | 'es' | null; count: number; slots: LabelSlot[]; endingDock: boolean; tray: TrayGem[];
  slip: 'ss' | 'z' | null; prompt: string[]; jarAfterStem: boolean;
};
export type LabelInput = { served: ServedItem | null; word: WordView | null; own: boolean[]; s06Passed: boolean; stemTray: string[]; rng: Rng };
export type LabelMistake = 'stem' | 'hiss' | 'iz' | 'dresss' | 'buzz' | 'hop-out' | 'rattle';
export type LabelCheck = { ok: boolean; wrongSlots: number[]; mistake: LabelMistake | null };

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const say = (w: string) => ['lb-lets-write', `word-${w}`, 'lb-listen', `word-${w}`];

export function planLabel(i: LabelInput): LabelTask | null {
  const { served, word, rng } = i;
  if (!served || !word) return null;
  const level = served.scaffold;
  const s10 = served.step === 'S10';
  const stemGems = (): TrayGem[] => i.stemTray.map((g) => ({ g, ending: false }));
  if (!s10) {
    return {
      served, word, level, s10: false, plural: false, target: word.word, wordEnding: null, count: 1,
      slots: word.graphemes.map((g, k) => ({ g, own: i.own[k] ?? false })), endingDock: false,
      tray: shuffle(stemGems(), rng), slip: null, prompt: say(word.word), jarAfterStem: false,
    };
  }
  if (!word.plural) return null;
  const wordEnding = word.plural.ending;
  const slip = i.s06Passed && endingSound(word.word, wordEnding) === 'z' ? 'z' : 'ss';
  const endings: TrayGem[] = ['s', 'es', slip].map((g) => ({ g, ending: true }));
  if (level === 3) {
    const count = served.count ?? (rng() < 0.25 ? 1 : 2 + Math.floor(rng() * 4));
    const plural = count > 1;
    return {
      served, word, level, s10, plural, target: plural ? word.plural.word : word.word, wordEnding, count,
      slots: word.graphemes.map((g, k) => ({ g, own: i.own[k] ?? false })), endingDock: true,
      tray: shuffle([...stemGems(), ...endings], rng), slip, prompt: say(word.word), jarAfterStem: true,
    };
  }
  return {
    served, word, level, s10, plural: true, target: word.plural.word, wordEnding, count: heapCount(Math.floor(rng() * 1000)),
    slots: word.graphemes.map((g, k) => ({ g, own: level === 2 ? i.own[k] ?? false : false })), endingDock: true,
    tray: shuffle(level === 2 ? [...stemGems(), ...endings] : endings, rng), slip, prompt: say(word.plural.word), jarAfterStem: false,
  };
}

export function checkLabel(task: LabelTask, built: (string | null)[], ending: string | null): LabelCheck {
  const wrongSlots = task.slots.flatMap((sl, k) => (sl.own && built[k] !== sl.g ? [k] : []));
  if (wrongSlots.length) return { ok: false, wrongSlots, mistake: 'stem' };
  const expected = task.plural ? task.wordEnding : null;
  if (ending === expected) return { ok: true, wrongSlots: [], mistake: null };
  const dock = [task.slots.length];
  if (ending === null) return { ok: false, wrongSlots: dock, mistake: 'hop-out' };
  if (expected === null) return { ok: false, wrongSlots: dock, mistake: 'rattle' };
  if (ending === 'ss') return { ok: false, wrongSlots: dock, mistake: 'dresss' };
  if (ending === 'z') return { ok: false, wrongSlots: dock, mistake: 'buzz' };
  if (expected === 'es' && ending === 's') return { ok: false, wrongSlots: dock, mistake: /s$/.test(task.word.word) ? 'dresss' : 'hiss' };
  return { ok: false, wrongSlots: dock, mistake: 'iz' };
}

export function labelItems(task: LabelTask, checks: LabelCheck[], result: Result): ItemResult[] {
  const missed = (k: number) => checks.some((c) => c.wrongSlots.includes(k));
  const r = (k: number): Result => (result === 'helped' ? 'helped' : missed(k) ? 'miss' : 'first');
  const out: ItemResult[] = task.slots.flatMap((sl, k) => (sl.own ? [{ item: sl.g, result: r(k) }] : []));
  if (task.s10 && task.wordEnding) out.push({ item: `-${task.wordEnding}`, result: r(task.slots.length) });
  return out;
}

export function labelAfterLines(task: LabelTask): string[] {
  return task.s10 ? [`word-${task.target}`, task.plural ? 'pl-more-than-one' : 'pl-just-one'] : [`word-${task.target}`];
}

export function labelModel(task: LabelTask): string[] {
  return ['lb-listen', `word-${task.target}`];
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/places/labels.ts games/moon-meadow-home/tests/places/labels.test.ts
git commit -m "Add toy shelf label planning and checks for plural endings"
```

**Acceptance:** S10 labels at three levels with the right tray and slip gem, the jar count deciding at level 3, every funny mistake named, and items logged per own slot plus the ending.

### Task A10: Jars, the toy shelf and the label scene

**Files:**
- Create: `src/core/places/jars.ts`, `src/scenes/places/ToyShelf.svelte`, `src/scenes/places/LabelBubble.svelte`
- Modify: `src/places/scenes.ts` (add `'toy-shelf': ToyShelf`), `src/places/hook.ts` (add `label`)
- Test: `tests/places/jars.test.ts`

**Interfaces:**
- Consumes: `PlacesState` (A1); `planLabel`, `checkLabel`, `labelItems`, `labelAfterLines`, `labelModel` (A9); `createMoment`, `defaultDeps` (A3); `Heap` (A8); `MeadowArrow`, `enterPlace`, `toMeadow`, `learnerView`, `herdView` (A7); heartbeat `GemSlots`, `ownSlots`, `planTray`; planner `serve('s', 'toy-shelf', 'label')`; content `words()`; audio `sayAll`, `sound`, `sfx`.
- Produces:
  - `type ShelfJar = { jar: string; word: string; plural: boolean; count: number; picture: string; golden: boolean; clip: string }`
  - `MICE_JAR: ShelfJar` (`{ jar: 'mice', word: 'mice', plural: true, count: 4, picture: 'mouse', golden: true, clip: 'pl-mice' }`)
  - `shelfJars(s: PlacesState): ShelfJar[]` (mice first, then labelled jars oldest first)
  - `shelfPages(jars: ShelfJar[], perPage?: number): ShelfJar[][]` (default 8 per page)
  - `newJarId(s: PlacesState, visitId: string): string` (`jar:<visit>:<n>`)
  - Hook `label`: `{ task(): { target: string; level: number; count: number; plural: boolean; own: boolean[]; tray: string[] } | null; build(gems: string[], ending: string | null): void; slide(): void; last(): { result: string; items: { item: string; result: string }[] } | null }`

- [ ] **Step 1: Write the failing test**

`tests/places/jars.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MICE_JAR, newJarId, shelfJars, shelfPages } from '../../src/core/places/jars.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);

describe('toy shelf', () => {
  it('always has the golden mice jar first', () => {
    expect(shelfJars(foldAll([]))).toEqual([MICE_JAR]);
    expect(MICE_JAR.golden).toBe(true);
    expect(MICE_JAR.clip).toBe('pl-mice');
  });

  it('adds one jar per label, oldest first, each reading its own word', () => {
    const s = foldAll([
      ev('jar.labelled', { jar: 'j1', word: 'foxes', plural: true, count: 3, picture: 'fox', baby: 'a' }),
      ev('jar.labelled', { jar: 'j2', word: 'bed', plural: false, count: 1, picture: 'bed', baby: 'b' }),
    ]);
    expect(shelfJars(s).map((j) => [j.word, j.clip, j.golden])).toEqual([['mice', 'pl-mice', true], ['foxes', 'word-foxes', false], ['bed', 'word-bed', false]]);
  });

  it('pages the shelf by eight jars', () => {
    const s = foldAll(Array.from({ length: 10 }, (_, i) => ev('jar.labelled', { jar: `j${i}`, word: 'hats', plural: true, count: 3, picture: 'hat', baby: null })));
    const pages = shelfPages(shelfJars(s));
    expect(pages.map((p) => p.length)).toEqual([8, 3]);
  });

  it('makes a new jar id per visit and count', () => {
    const s = foldAll([ev('visit.start', { visit: 'v3', tz: 0 }), ev('jar.labelled', { jar: 'jar:v3:0', word: 'hats', plural: true, count: 3, picture: 'hat', baby: null })]);
    expect(newJarId(s, 'v3')).toBe('jar:v3:1');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/jars.test.ts`
Expected: FAIL, cannot resolve `jars.ts`.

- [ ] **Step 3: Write `jars.ts`**

```ts
import type { PlacesState } from './state.ts';

export type ShelfJar = { jar: string; word: string; plural: boolean; count: number; picture: string; golden: boolean; clip: string };

export const MICE_JAR: ShelfJar = { jar: 'mice', word: 'mice', plural: true, count: 4, picture: 'mouse', golden: true, clip: 'pl-mice' };

export function shelfJars(s: PlacesState): ShelfJar[] {
  return [MICE_JAR, ...s.jars.map((j) => ({ jar: j.jar, word: j.word, plural: j.plural, count: j.count, picture: j.picture, golden: false, clip: `word-${j.word}` }))];
}

export function shelfPages(jars: ShelfJar[], perPage = 8): ShelfJar[][] {
  const pages: ShelfJar[][] = [];
  for (let i = 0; i < jars.length; i += perPage) pages.push(jars.slice(i, i + perPage));
  return pages;
}

export function newJarId(s: PlacesState, visitId: string): string {
  const n = s.jars.filter((j) => j.jar.startsWith(`jar:${visitId}:`)).length;
  return `jar:${visitId}:${n}`;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/jars.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write `ToyShelf.svelte`**

Free play on a wooden shelf (`Sprite 'shelf'` or `svg('shelf')`) with two rows of four jars per page and two page arrows (80 px, `aria-label="shelf next"` and `"shelf back"`) when there is more than one page.
- A jar shows its things inside (`Heap` with `count` copies, or one picture for `count: 1`) and its label (`svg('jar-label', { label: word })`, gold for the mice jar). `aria-label="jar <word>"`.
- A tap on a label plays `say(jar.clip)`. A tap on a jar lifts one thing out to the play area in front of the shelf, where she can drag it; a tap on the thing puts it back (no event).
- On enter: `enterPlace('toy-shelf')` was called by the caller. When `game.params.label` is true, mount `<LabelBubble baby={game.params.baby} />` over the shelf; when it ends or no label task exists, show `<MeadowArrow />`.
- First visit only (`once('shelf-intro')`): `say('lb-shelf')`.

- [ ] **Step 6: Write `LabelBubble.svelte`**

Flow, one goal per screen:
1. Get the item: `const item = serve('s', 'toy-shelf', 'label')`. Look up its word: `const w = words().find((x) => x.id === item?.carrier) ?? null`. Build `task = planLabel({ served: item, word: w, own: w ? ownSlots(w.graphemes, game.learner) : [], s06Passed: learnerView().passedOrPlaced('S06'), stemTray: w ? planTray(w.graphemes, item!.step, item!.scaffold, game.rng) : [], rng: game.rng })`. If `task` is null, render nothing and let the shelf show the meadow arrow.
2. The finder baby walks in (`<Unicorn baby face={false} pose="hop" />`) carrying the thing: a `Heap` when `task.count > 1` at levels 1 and 2, one picture otherwise. At level 3 the baby carries a closed bag (`svg('parcel')`); the count stays hidden until the stem is built. Elizabeth says `lb-found` the first time per visit, then the moment starts with `goal: task.prompt`.
3. `<GemSlots slots={task.slots.map(...)} tray={task.tray} onslide={slide} />` with `ending: true` gems and a crescent dock when `task.endingDock`. Gift slots are prefilled.
4. Level 3: when every own stem slot holds a gem, the baby tips the bag into a new empty jar, the things drop in one by one (`sfx('pop')` each), then `say('pl-look-in-jar')`.
5. `slide(built)` calls `checkLabel(task, built, endingGem)`:
   - ok: `const { result, ms } = moment.answer()`; dispatch `{ type: 'place/result', result: { strand: 's', step: task.served.step, carrier: task.target, items: labelItems(task, checks, result), result, ms, scaffold: task.level, error: null, place: 'toy-shelf', probe: task.served.probe } }` and `{ type: 'place/jar', jar: newJarId(places, visitId), word: task.target, plural: task.plural, count: task.count, picture: task.word.picture, baby }`; the label flies onto the jar, the things drop in, `sayAll(labelAfterLines(task))`, then `say('lb-on-the-jar')`, then `<MeadowArrow />`.
   - mistake: `moment.miss()`; the slider plays what she built (GemSlots does this); then the funny reaction for `mistake` (CSS keyframes on transform and opacity only):
     - `hiss`: the last gem shakes, steam puffs (`opacity` puffs) from the jar, the things cover their ears; `sfx('soft-no')` is not used; `sfx('whoosh')`.
     - `iz`: the label wobbles, `sfx('chime')` twice.
     - `dresss`: a long hiss (`sfx('whoosh')` twice), the things flap.
     - `buzz`: the z gem buzzes side to side, `sfx('magic')`.
     - `hop-out`: the jar keeps one thing; the others hop out onto the shelf, `say('lb-label-says-one')`; they hop back in when the ending gem is placed.
     - `rattle`: the jar rattles, the lonely thing shrugs.
     - `stem`: the wrong gem pops out (`popWrong={check.wrongSlots}`) and its slot hums its sound (`hum` prop).
     Then `sayAll(labelModel(task))`. The wrong gem pops out (the dock for ending mistakes) and the dock or slot hums.
6. Hints: `focused` plays the needed sound of the first wrong or empty own slot with `sound(g)` while the moonbeam sits on it; at level 3 after the jar is full it counts the jar (`num-1` to `num-<count>`, one clip per thing, the ghost finger touching each). `ghost` drags the right gem to the first unfilled slot with `ghostMove`.
7. Hook `label`: `task()` returns the plain fields; `build(gems, ending)` fills the own slots in order and the dock; `slide()` calls `slide` with the built gems; `last()` returns the result and items of the current task, and `null` until that task is answered (a new task clears it).

- [ ] **Step 7: Type check, build and register**

Add `'toy-shelf': ToyShelf` to `placeScenes`, then run `npm run check && npm run build:test`.
Expected: 0 errors, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add games/moon-meadow-home/src/core/places/jars.ts games/moon-meadow-home/src/scenes/places/ToyShelf.svelte games/moon-meadow-home/src/scenes/places/LabelBubble.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/jars.test.ts
git commit -m "Add the toy shelf with labelled jars, the mice jar and the label act"
```

**Acceptance:** a label bubble opens a spelling act at the toy shelf; S10 labels run at three levels with their funny readbacks; a right label adds a jar; the mice jar reads "Mice. One mouse, lots of mice."; with no item the shelf is free play with a meadow arrow.

### Task A11: Bath Pond

**Files:**
- Create: `src/core/places/pond.ts`, `src/scenes/places/BathPond.svelte`
- Modify: `src/places/scenes.ts` (add `'bath-pond': BathPond`), `src/places/hook.ts` (add `pond`)
- Test: `tests/places/pond.test.ts`

**Interfaces:**
- Consumes: `planOneOrMany`, `oneOrManyMistake`, `afterLines`, `OneOrManyTask` (A8); `ServedItem`, `WordView` (A1); `createMoment` (A3); heartbeat `PrintWithDots`, `Unicorn`; planner `serve('r', 'bath-pond', 'pond-word')`.
- Produces:
  - `pondPool(words: WordView[]): WordView[]` (tag `pond` and a plural form)
  - `planBathWish(item: ServedItem | null, words: WordView[], rng: Rng): OneOrManyTask | null`
  - Hook `pond`: `{ wish(): { shown: string; options: { id: string; many: boolean; word: string }[]; answer: string } | null; give(optionId: string): void; splash(babyId?: string): void }`

- [ ] **Step 1: Write the failing test**

`tests/places/pond.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planBathWish, pondPool } from '../../src/core/places/pond.ts';
import { rng, served, word } from './helpers.ts';

const p = (id: string, g: string[], tags = ['pond']) => word(id, g, { tags, plural: { word: `${id}s`, ending: 's', graphemes: [...g, 's'] } });
const words = [p('duck', ['d', 'u', 'ck']), p('boat', ['b', 'oa', 't']), p('cup', ['c', 'u', 'p']), p('shell', ['sh', 'e', 'll']), p('hat', ['h', 'a', 't'], ['shelf'])];

describe('bath wishes', () => {
  it('only uses pond things', () => {
    expect(pondPool(words).map((w) => w.id)).toEqual(['duck', 'boat', 'cup', 'shell']);
  });

  it('plans one or many from the served R19 item', () => {
    const many = planBathWish(served('r', 'R19', 'duck', ['-s'], { kind: 'school' }), words, rng(1))!;
    expect(many.shown).toBe('ducks');
    expect(many.plural).toBe(true);
    expect(many.options.every((o) => ['duck', 'boat', 'cup', 'shell'].includes(o.word))).toBe(true);
    const one = planBathWish(served('r', 'R19', 'cup', ['none'], { kind: 'school', scaffold: 3 }), words, rng(2))!;
    expect(one.shown).toBe('cup');
    expect(one.options).toHaveLength(6);
  });

  it('returns null with no item, a word that is not a pond thing, or another step', () => {
    expect(planBathWish(null, words, rng(1))).toBeNull();
    expect(planBathWish(served('r', 'R19', 'hat', ['-s']), words, rng(1))).toBeNull();
    expect(planBathWish(served('r', 'R21', 'duck', ['ck']), words, rng(1))).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/pond.test.ts`
Expected: FAIL, cannot resolve `pond.ts`.

- [ ] **Step 3: Write `pond.ts`**

```ts
import type { Rng, ServedItem, WordView } from './types.ts';
import { planOneOrMany, type OneOrManyTask } from './plurals.ts';

export function pondPool(words: WordView[]): WordView[] {
  return words.filter((w) => w.tags.includes('pond') && w.plural);
}

export function planBathWish(item: ServedItem | null, words: WordView[], rng: Rng): OneOrManyTask | null {
  if (!item || item.step !== 'R19') return null;
  const pool = pondPool(words);
  const target = pool.find((w) => w.id === item.carrier);
  if (!target) return null;
  const plural = item.items.some((i) => i === '-s' || i === '-es');
  return planOneOrMany(target, plural, item.scaffold, pool, rng);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/pond.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write `BathPond.svelte`**

- Background `bg-bath-pond` (fallback: a blue oval pond on grass). On first enter per visit, `say('pd-welcome')`.
- Free play: up to six babies from `herdView()` (the three last touched from `recentTouches()` first, then the newest) stand on the bank. Drag a baby into the water: it bobs, `sfx('splash')`, `say('foal-splash')`, soap bubbles float up (opacity and transform). The first bath of each baby per visit dispatches `{ type: 'place/care', baby, care: 'bath' }`. A slide at the right edge (`aria-label="slide"`) slides a baby in. The first time, the ghost hand drags a baby into the water with `say('pd-play')`.
- Bath wish: `const task = planBathWish(serve('r', 'bath-pond', 'pond-word'), words(), game.rng)`. When a task exists, the wish baby stands at the front with a speech bubble: `<PrintWithDots text={task.shown} dots={task.dots} silent={task.silentEnding ? [task.target.plural!.ending] : []} />`. The options float on the water, each `aria-label="float <word> one"` or `"float <word> many"`, a heap drawn with `Heap`. Goal `pd-wish-goal`. Before she acts, a tap on a floating thing only plays `sfx('pop')` (rule 1 of spec 2.5).
- Give (drag a float onto the baby): `oneOrManyMistake(task, option)`:
  - `null`: `moment.answer()`, dispatch `place/result` with `strand: 'r'`, `step: 'R19'`, `carrier: task.shown`, `items: task.items.map((item) => ({ item, result }))`, `scaffold`, `place: 'bath-pond'`; the baby plays with the thing, `sayAll(afterLines(task))`, `say('foal-hooray')`, then `<MeadowArrow />`.
  - `one-for-many`: the baby puts the one duck on its head, then pats its ears, tail and hooves looking for the others, `say('foal-giggle')`; the float drifts back; the word's ending glows (PrintWithDots `glow` on the last grapheme); `moment.miss()`.
  - `many-for-one`: the baby stacks the heap on its head, the tower wobbles and topples, giggle; the float drifts back; the plain end of the word glows; `moment.miss()`.
  - `other`: the baby looks puzzled, giggles and pushes the thing back; the whole word glows; `moment.miss()`.
- Hints: `focused` plays the word's sounds slowly with 500 ms gaps (the dots) and glows the ending; `ghost` drags the right float to the baby.
- No task: free play only, with `<MeadowArrow />` after the first splash.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/places/pond.ts games/moon-meadow-home/src/scenes/places/BathPond.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/pond.test.ts
git commit -m "Add the Bath Pond with splash play and one-or-many bath wishes"
```

**Acceptance:** babies splash in the pond and get one bath per visit; an R19 bath wish shows one or many ducks, boats, cups or shells at three scaffold levels with both funny mistakes; without an item the pond is free play.

### Task A12: Building logic and plots

**Files:**
- Create: `src/core/places/building.ts`, `content/places/plots.json`
- Modify: `src/core/places/content.ts` (add `plotDefs`, `rowDef`)
- Test: `tests/places/building.test.ts`

**Interfaces:**
- Consumes: `PlacesState` (A1); `ServedItem`, `Rng` (A1); `released`.
- Produces:
  - `type SignDef = { word: string; graphemes: string[]; clip: string; gifts?: number[] }`
  - `type PlotDef = { id: string; area: 'meadow' | 'stable-yard' | 'village-lane' | 'castle-hill' | 'sky'; kind: 'herd' | 'place' | 'jewel'; herd?: number; stones?: number; key?: string; release: string; breed?: string; sign?: SignDef; picture: string; map: [number, number]; opening?: string; lumi?: string }`
  - `type PartId = 'walls' | 'trim' | 'sign' | 'ribbon' | 'circle' | 'row-name'`
  - `rowPlotId(row: number): string`, `rowOfPlot(plot: string): number | null`
  - `rowsEarned(herd: number): number`, `rowsBuilt(s: PlacesState): number`, `nextRow(s: PlacesState): number | null`
  - `partsFor(plot: string): PartId[]`, `nextPart(plot: string, done: string[]): PartId | null`
  - `litStones(s: PlacesState, plot: string): string[]`
  - `readyPlots(c: { s: PlacesState; release: string; plots?: PlotDef[] }): string[]`
  - `type WallTask = { total: number; up: number; answer: number; served: ServedItem | null }`
  - `wallTask(item: ServedItem | null, rng: Rng): WallTask`, `wallOutcome(t: WallTask, dropped: number): { kind: 'done' | 'gap' | 'wobble'; diff: number }`, `wallStones(t: WallTask, rng: Rng): number[]`
  - `type TrimTask = { checked: false; colours: string[] } | { checked: true; shown: string[]; answer: string; options: string[]; served: ServedItem }`
  - `trimTask(item: ServedItem | null, rng: Rng): TrimTask`
  - `signFor(plot: string): SignDef`, `signTask(sign: SignDef, own: boolean[]): { sign: SignDef; own: boolean[]; checked: boolean }`
  - `wallLines(t: WallTask): string[]` (`['bd-needs-<total>', 'bd-up-<up>']`), `wallMistakeLines(o: { kind: 'gap' | 'wobble'; diff: number }): string[]` (`['bd-more-<diff>']` or `['nm-too-many-<diff>']`)

- [ ] **Step 1: Write the content file**

`content/places/plots.json`:

```json
{
  "plots": [
    { "id": "bath-pond", "area": "meadow", "kind": "herd", "herd": 5, "release": "1.0", "breed": "bubble", "picture": "place-bath-pond", "map": [250, 600], "opening": "bath-pond", "lumi": "lumi-pond-open",
      "sign": { "word": "pond", "graphemes": ["p", "o", "n", "d"], "clip": "word-sign-pond" } },
    { "id": "post-box", "area": "stable-yard", "kind": "herd", "herd": 15, "release": "1.1", "breed": "post", "picture": "place-post-box", "map": [640, 610], "opening": "post-box", "lumi": "lumi-post-open",
      "sign": { "word": "post", "graphemes": ["p", "o", "s", "t"], "clip": "word-sign-post", "gifts": [1] } },
    { "id": "letter-lane", "area": "stable-yard", "kind": "place", "herd": 20, "release": "1.2", "picture": "place-letter-lane", "map": [780, 520], "opening": "letter-lane" },
    { "id": "dressing", "area": "meadow", "kind": "place", "release": "1.1", "picture": "place-dressing", "map": [400, 470], "opening": "dressing" },
    { "id": "salon", "area": "village-lane", "kind": "jewel", "stones": 3, "release": "1.2", "breed": "sparkle", "picture": "place-salon", "map": [880, 330], "lumi": "lumi-salon-open",
      "sign": { "word": "salon", "graphemes": ["s", "a", "l", "o", "n"], "clip": "word-sign-salon" } },
    { "id": "kitchen", "area": "village-lane", "kind": "jewel", "stones": 3, "release": "2", "picture": "place-kitchen", "map": [1000, 260] },
    { "id": "tea-garden", "area": "village-lane", "kind": "jewel", "stones": 3, "release": "2", "picture": "place-tea-garden", "map": [1060, 400] },
    { "id": "hide-seek", "area": "meadow", "kind": "jewel", "stones": 3, "key": "R28", "release": "2", "picture": "place-hide-seek", "map": [160, 420] },
    { "id": "story-nook", "area": "meadow", "kind": "jewel", "stones": 3, "key": "R06", "release": "3", "picture": "place-story-nook", "map": [120, 560] },
    { "id": "castle-gate", "area": "castle-hill", "kind": "jewel", "stones": 4, "release": "4", "picture": "place-castle-gate", "map": [600, 140] }
  ],
  "rows": {
    "fullUntil": 5,
    "lumi": "lumi-row-open",
    "sign": { "word": "stalls", "graphemes": ["s", "t", "a", "ll", "s"], "clip": "word-sign-stalls" }
  }
}
```

Add to `src/core/places/content.ts`:

```ts
import plotsJson from '../../../content/places/plots.json' with { type: 'json' };
import type { PlotDef, SignDef } from './building.ts';
export const plotDefs: PlotDef[] = plotsJson.plots as PlotDef[];
export const rowDef: { fullUntil: number; lumi: string; sign: SignDef } = plotsJson.rows;
```

- [ ] **Step 2: Write the failing test**

`tests/places/building.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  litStones, nextPart, nextRow, partsFor, readyPlots, rowOfPlot, rowPlotId, rowsBuilt, rowsEarned, signFor, signTask,
  trimTask, wallLines, wallMistakeLines, wallOutcome, wallStones, wallTask,
} from '../../src/core/places/building.ts';
import { ev, foldAll, resetSeq, rng, served } from './helpers.ts';

beforeEach(resetSeq);
const hatch = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ev('egg.hatched', { baby: `b${from + i}`, breed: 'moon', kind: 'moon', source: 'nest' }));
const visit = (id: string) => ev('visit.start', { visit: id, tz: 0 });

describe('rows', () => {
  it('earns a new row at every ten babies', () => {
    expect([0, 9, 10, 19, 20, 45, 50].map(rowsEarned)).toEqual([1, 1, 2, 2, 3, 5, 6]);
  });

  it('names row plots', () => {
    expect(rowPlotId(3)).toBe('row-3');
    expect(rowOfPlot('row-12')).toBe(12);
    expect(rowOfPlot('salon')).toBeNull();
  });

  it('counts rows built in order', () => {
    expect(rowsBuilt(foldAll([]))).toBe(1);
    expect(rowsBuilt(foldAll([ev('building.done', { plot: 'row-2' }), ev('building.done', { plot: 'row-4' })]))).toBe(2);
  });

  it('a herd of 45 on Moving Day has its five rows and nothing to build until 50', () => {
    const ids = Array.from({ length: 45 }, (_, i) => `v${i}`);
    const s = foldAll([ev('import.v2', { hash: 'h', babies: ids, nights: 30 })]);
    expect(rowsBuilt(s)).toBe(5);
    expect(nextRow(s)).toBeNull();
    const s50 = foldAll([ev('import.v2', { hash: 'h', babies: ids, nights: 30 }), ...hatch(5, 100)]);
    expect(nextRow(s50)).toBe(6);
    expect(partsFor('row-6')).toEqual(['walls', 'row-name']);
  });

  it('offers one row at a time', () => {
    const s = foldAll(hatch(25));
    expect(nextRow(s)).toBe(2);
    expect(readyPlots({ s, release: '1.3' }).filter((p) => p.startsWith('row-'))).toEqual(['row-2']);
  });
});

describe('parts', () => {
  it('gives buildings and rows 2 to 5 a full day and later rows a short build', () => {
    expect(partsFor('bath-pond')).toEqual(['walls', 'trim', 'sign', 'ribbon', 'circle']);
    expect(partsFor('row-5')).toEqual(['walls', 'trim', 'sign', 'ribbon', 'circle', 'row-name']);
    expect(partsFor('row-6')).toEqual(['walls', 'row-name']);
  });

  it('carries on where she left off', () => {
    expect(nextPart('bath-pond', [])).toBe('walls');
    expect(nextPart('bath-pond', ['walls', 'trim'])).toBe('sign');
    expect(nextPart('bath-pond', ['walls', 'trim', 'sign', 'ribbon', 'circle'])).toBeNull();
  });
});

describe('ready plots', () => {
  it('needs the Bath Pond earned and announced, and not built', () => {
    expect(readyPlots({ s: foldAll(hatch(5)), release: '1.3' })).not.toContain('bath-pond');
    const announced = foldAll([visit('v2'), ...hatch(5), ev('opening.announced', { opening: 'bath-pond' })]);
    expect(readyPlots({ s: announced, release: '1.3' })).toContain('bath-pond');
    const built = foldAll([visit('v2'), ...hatch(5), ev('opening.announced', { opening: 'bath-pond' }), ev('building.done', { plot: 'bath-pond' })]);
    expect(readyPlots({ s: built, release: '1.3' })).not.toContain('bath-pond');
  });

  it('readies a jewel plot when every stone is lit', () => {
    const two = foldAll([ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'R30', plot: 'salon' })]);
    expect(litStones(two, 'salon')).toEqual(['S20', 'R30']);
    expect(readyPlots({ s: two, release: '1.3' })).not.toContain('salon');
    const three = foldAll([ev('jewel.placed', { jewel: 'S20', plot: 'salon' }), ev('jewel.placed', { jewel: 'R30', plot: 'salon' }), ev('jewel.placed', { jewel: 'M10', plot: 'salon' })]);
    expect(readyPlots({ s: three, release: '1.3' })).toContain('salon');
  });

  it('skips plots of a later release', () => {
    const s = foldAll([visit('v6'), ...hatch(15), ev('opening.announced', { opening: 'post-box' })]);
    expect(readyPlots({ s, release: '1.0' })).not.toContain('post-box');
    expect(readyPlots({ s, release: '1.1' })).toContain('post-box');
  });
});

describe('walls (decision D7)', () => {
  it('uses the served fact', () => {
    const it10 = served('m', 'M10', '6+4', ['6+4']);
    expect(wallTask(it10, rng(1))).toEqual({ total: 10, up: 6, answer: 4, served: it10 });
    expect(wallTask(served('m', 'M12', '4+3', ['4+3']), rng(1))).toMatchObject({ total: 7, up: 4, answer: 3 });
  });

  it('builds a free wall of ten without an item or with a fact it cannot show', () => {
    for (const item of [null, served('m', 'M08', 'AB', ['AB']), served('m', 'M14', '9-5', ['9-5'])]) {
      const t = wallTask(item, rng(2));
      expect(t.total).toBe(10);
      expect(t.up + t.answer).toBe(10);
      expect(t.served).toBeNull();
    }
  });

  it('judges the stone', () => {
    const t = { total: 10, up: 6, answer: 4, served: null };
    expect(wallOutcome(t, 4)).toEqual({ kind: 'done', diff: 0 });
    expect(wallOutcome(t, 1)).toEqual({ kind: 'gap', diff: 3 });
    expect(wallOutcome(t, 6)).toEqual({ kind: 'wobble', diff: 2 });
    expect(wallMistakeLines({ kind: 'gap', diff: 3 })).toEqual(['bd-more-3']);
    expect(wallMistakeLines({ kind: 'wobble', diff: 2 })).toEqual(['nm-too-many-2']);
    expect(wallLines(t)).toEqual(['bd-needs-10', 'bd-up-6']);
  });

  it('offers at least three different stones from 1 to 9, the answer among them', () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const answer of [1, 4, 9]) {
        const st = wallStones({ total: 10, up: 10 - answer, answer, served: null }, rng(seed));
        expect(st).toContain(answer);
        expect(new Set(st).size).toBe(st.length);
        expect(st.length).toBeGreaterThanOrEqual(3);
        for (const v of st) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(9); }
      }
    }
  });
});

describe('trim', () => {
  it.each([['AB', 5, 1], ['ABB', 7, 1], ['ABC', 7, 1], ['AAB', 7, 0]] as const)('continues %s', (pattern, len, answerIndex) => {
    const t = trimTask(served('m', 'M08', pattern, [pattern]), rng(5));
    if (!t.checked) throw new Error('expected a checked trim');
    expect(t.shown).toHaveLength(len);
    const unit = [...new Set(t.shown)];
    expect(t.answer).toBe(unit[answerIndex]);
    expect(t.options).toHaveLength(3);
    expect(new Set(t.options).size).toBe(3);
    expect(t.options).toContain(t.answer);
  });

  it('is free colours without an M08 item', () => {
    const t = trimTask(null, rng(1));
    expect(t.checked).toBe(false);
  });
});

describe('sign (decision D9)', () => {
  it('is checked with two or more own slots and keeps gifts as gifts', () => {
    expect(signTask(signFor('bath-pond'), [true, true, true, true]).checked).toBe(true);
    expect(signTask(signFor('bath-pond'), [false, false, true, false]).checked).toBe(false);
    expect(signTask(signFor('post-box'), [true, true, true, true]).own).toEqual([true, false, true, true]);
    expect(signFor('row-3').word).toBe('stalls');
  });
});
```

Note on the `AAB` case: the unit is `[A, B]` from `new Set(shown)`, and the next bead after `A A B A A B A` is `A`, so `answerIndex` is 0.

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/building.test.ts`
Expected: FAIL, cannot resolve `building.ts`.

- [ ] **Step 4: Write the implementation**

`src/core/places/building.ts`:

```ts
import type { Rng, ServedItem } from './types.ts';
import type { PlacesState } from './state.ts';
import { plotDefs, released, rowDef } from './content.ts';

export type SignDef = { word: string; graphemes: string[]; clip: string; gifts?: number[] };
export type PlotDef = {
  id: string; area: 'meadow' | 'stable-yard' | 'village-lane' | 'castle-hill' | 'sky'; kind: 'herd' | 'place' | 'jewel';
  herd?: number; stones?: number; key?: string; release: string; breed?: string; sign?: SignDef; picture: string;
  map: [number, number]; opening?: string; lumi?: string;
};
export type PartId = 'walls' | 'trim' | 'sign' | 'ribbon' | 'circle' | 'row-name';

export const rowPlotId = (row: number): string => `row-${row}`;
export function rowOfPlot(plot: string): number | null {
  const m = /^row-(\d+)$/.exec(plot);
  return m ? Number(m[1]) : null;
}
export const rowsEarned = (herd: number): number => 1 + Math.floor(herd / 10);

export function rowsBuilt(s: PlacesState): number {
  let k = 1;
  while (s.buildings[rowPlotId(k + 1)]?.done) k++;
  return Math.max(k, s.importRows);
}

export function nextRow(s: PlacesState): number | null {
  const k = rowsBuilt(s) + 1;
  return k <= rowsEarned(s.herd) ? k : null;
}

export function partsFor(plot: string): PartId[] {
  const row = rowOfPlot(plot);
  if (row === null) return ['walls', 'trim', 'sign', 'ribbon', 'circle'];
  return row <= rowDef.fullUntil ? ['walls', 'trim', 'sign', 'ribbon', 'circle', 'row-name'] : ['walls', 'row-name'];
}

export function nextPart(plot: string, done: string[]): PartId | null {
  return partsFor(plot).find((p) => !done.includes(p)) ?? null;
}

export function litStones(s: PlacesState, plot: string): string[] {
  return Object.entries(s.jewels).filter(([, p]) => p === plot).map(([step]) => step);
}

export function readyPlots(c: { s: PlacesState; release: string; plots?: PlotDef[] }): string[] {
  const { s } = c;
  const out: string[] = [];
  for (const p of c.plots ?? plotDefs) {
    if (!released(p.release, c.release) || s.buildings[p.id]?.done) continue;
    if (p.kind === 'herd' && s.herd >= (p.herd ?? 0) && p.opening && p.opening in s.announced) out.push(p.id);
  }
  const row = nextRow(s);
  if (row !== null) out.push(rowPlotId(row));
  for (const p of c.plots ?? plotDefs) {
    if (p.kind !== 'jewel' || !released(p.release, c.release) || s.buildings[p.id]?.done) continue;
    if (litStones(s, p.id).length >= (p.stones ?? 0)) out.push(p.id);
  }
  return out;
}

export type WallTask = { total: number; up: number; answer: number; served: ServedItem | null };

export function wallTask(item: ServedItem | null, rng: Rng): WallTask {
  const m = item ? /^(\d+)\+(\d+)$/.exec(item.carrier) : null;
  if (item && m) {
    const a = Number(m[1]); const b = Number(m[2]);
    if (b >= 1 && a + b <= 10 && a + b >= 2) return { total: a + b, up: a, answer: b, served: item };
  }
  const up = 1 + Math.floor(rng() * 9);
  return { total: 10, up, answer: 10 - up, served: null };
}

export function wallOutcome(t: WallTask, dropped: number): { kind: 'done' | 'gap' | 'wobble'; diff: number } {
  if (dropped === t.answer) return { kind: 'done', diff: 0 };
  return dropped < t.answer ? { kind: 'gap', diff: t.answer - dropped } : { kind: 'wobble', diff: dropped - t.answer };
}

export function wallStones(t: WallTask, rng: Rng): number[] {
  const set = new Set<number>([t.answer]);
  for (const v of [t.answer + 1, t.answer - 1, t.up, t.answer + 2, t.answer - 2]) if (v >= 1 && v <= 9) set.add(v);
  const out = [...set].slice(0, 4);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export const wallLines = (t: WallTask): string[] => [`bd-needs-${t.total}`, `bd-up-${t.up}`];
export const wallMistakeLines = (o: { kind: 'gap' | 'wobble'; diff: number }): string[] => (o.kind === 'gap' ? [`bd-more-${o.diff}`] : [`nm-too-many-${o.diff}`]);

export type TrimTask = { checked: false; colours: string[] } | { checked: true; shown: string[]; answer: string; options: string[]; served: ServedItem };
export const BEAD_COLOURS = ['pink', 'blue', 'gold', 'green', 'purple'];

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function trimTask(item: ServedItem | null, rng: Rng): TrimTask {
  const pattern = item?.carrier ?? '';
  if (!item || !/^[ABC]{2,3}$/.test(pattern)) return { checked: false, colours: [...BEAD_COLOURS] };
  const letters = [...new Set(pattern.split(''))];
  const pick = shuffle(BEAD_COLOURS, rng);
  const colourOf: Record<string, string> = Object.fromEntries(letters.map((l, i) => [l, pick[i]]));
  const len = pattern.length * 2 + 1;
  const seq = Array.from({ length: len + 1 }, (_, i) => colourOf[pattern[i % pattern.length]]);
  const shown = seq.slice(0, len);
  const answer = seq[len];
  const others = pick.filter((c) => c !== answer);
  const distractors = [...new Set([...shown.filter((c) => c !== answer), ...others])].slice(0, 2);
  return { checked: true, shown, answer, options: shuffle([answer, ...distractors], rng), served: item };
}

export function signFor(plot: string): SignDef {
  if (rowOfPlot(plot) !== null) return rowDef.sign;
  const def = plotDefs.find((p) => p.id === plot);
  if (!def?.sign) throw new Error(`no sign for ${plot}`);
  return def.sign;
}

export function signTask(sign: SignDef, own: boolean[]): { sign: SignDef; own: boolean[]; checked: boolean } {
  const fixed = sign.graphemes.map((_, i) => Boolean(own[i]) && !(sign.gifts ?? []).includes(i));
  return { sign, own: fixed, checked: fixed.filter(Boolean).length >= 2 };
}
```

Check the trim test against the code: for `AB`, `len` is 5, shown is `A B A B A`, the next is `B` (index 1 of the unit). For `ABB`, `len` is 7: `A B B A B B A`, next `B`. For `ABC`: `A B C A B C A`, next `B`. For `AAB`: `A A B A A B A`, next `A`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/building.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/building.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/plots.json games/moon-meadow-home/tests/places/building.test.ts
git commit -m "Add stable rows, Building Day parts and wall, trim and sign tasks"
```

**Acceptance:** rows earned every ten babies and offered one at a time, imported rows counted, parts resume where she left off, plots ready only when earned, announced, released and lit, and wall, trim and sign tasks follow decisions D7 and D9.

### Task A13: Building Day scenes

**Files:**
- Create: `src/scenes/places/BuildingDay.svelte`, `src/scenes/places/building/Walls.svelte`, `src/scenes/places/building/Trim.svelte`, `src/scenes/places/building/Sign.svelte`, `src/scenes/places/building/Ribbon.svelte`, `src/scenes/places/building/Circle.svelte`, `src/scenes/places/building/RowName.svelte`
- Modify: `src/scenes/places/Meadow.svelte` (`readyPlotsNow` returns `readyPlots({ s: game.world.places, release: CURRENT_RELEASE })`), `src/places/scenes.ts` (add `'building-day': BuildingDay`), `src/places/hook.ts` (add `building`)

**Interfaces:**
- Consumes: everything in Task A12; `createMoment`, `defaultDeps`, `ghostMove` (A3); `MeadowArrow`, `enterPlace`, `toMeadow` (A7); heartbeat `StoneTray`, `GemSlots`, `HatchAndName`, `Naming`, `ownSlots`, `planTray`, `currentEggBreed`; `serve('m', 'building', 'sum' | 'pattern')` and `spellStepNow()` (Task A1b); content `plotDefs`, `rowDef`.
- Produces:
  - `<BuildingDay />` reading `game.params.plot`.
  - Hook `building`: `{ start(plot: string): void; state(): { plot: string; part: string | null; done: string[]; wall: { total: number; up: number; answer: number } | null }; drop(n: number): void; trim(colour: string): void; sign(gems: string[]): void; cut(): void; auto(): Promise<void> }`. `start(plot)` calls `enterPlace('building-day', 'building-day', { plot })`. `auto()` answers every remaining part through the active moment's `hookAnswer`, finishes the circle and the row name through `__game.answer()`, and resolves when the scene returns to the meadow.

- [ ] **Step 1: Write `BuildingDay.svelte`**

```svelte
<script lang="ts">
  import { game } from '../../game.svelte.ts';
  import { nextPart, partsFor, rowOfPlot } from '../../core/places/building.ts';
  import { plotDefs, rowDef } from '../../core/places/content.ts';
  import { say } from '../../audio/index.ts';
  import { once } from '../../places/session.ts';
  import Walls from './building/Walls.svelte';
  import Trim from './building/Trim.svelte';
  import Sign from './building/Sign.svelte';
  import Ribbon from './building/Ribbon.svelte';
  import Circle from './building/Circle.svelte';
  import RowName from './building/RowName.svelte';
  import MeadowArrow from '../../ui/MeadowArrow.svelte';
  import GhostHand from '../../ui/GhostHand.svelte';

  const plot = String(game.params.plot);
  const row = rowOfPlot(plot);
  const def = plotDefs.find((p) => p.id === plot) ?? null;
  const done = $derived(game.world.places.buildings[plot]?.parts ?? []);
  const built = $derived(Boolean(game.world.places.buildings[plot]?.done));
  const part = $derived(built ? null : nextPart(plot, done));

  $effect(() => { if (once(`builders:${plot}`)) void say('lumi-builders'); });

  function finishPart(p: string) {
    game.dispatch({ type: 'place/part', plot, part: p });
    if (nextPart(plot, [...done, p]) === null) {
      game.dispatch({ type: 'place/built', plot });
      void say(row === null ? def?.lumi ?? 'lumi-row-open' : rowDef.lumi);
    }
  }
</script>

<div class="yard" aria-label="building {plot}">
  {#if part === 'walls'}<Walls {plot} short={partsFor(plot).length === 2} ondone={() => finishPart('walls')} />
  {:else if part === 'trim'}<Trim {plot} ondone={() => finishPart('trim')} />
  {:else if part === 'sign'}<Sign {plot} ondone={() => finishPart('sign')} />
  {:else if part === 'ribbon'}<Ribbon {plot} ondone={() => finishPart('ribbon')} />
  {:else if part === 'circle'}<Circle {plot} breed={def?.breed ?? null} ondone={() => finishPart('circle')} />
  {:else if part === 'row-name'}<RowName row={row ?? 0} ondone={() => finishPart('row-name')} />
  {:else}<MeadowArrow />{/if}
  <GhostHand />
</div>
```

Background: `bg-building-yard`. Two builder unicorns (`Unicorn` with a code-drawn hard hat from `places-svg` `hammer` colours) stand at the sides; a builder on a ladder points at gaps.

- [ ] **Step 2: Write `Walls.svelte`**

- `const item = serve('m', 'building', 'sum')`; `const task = wallTask(item, game.rng)`; `const stones = wallStones(task, game.rng)`.
- The wall outline has `task.total` plank spots (two rows when the total is above five), `task.up` planks already up. `aria-label="wall"`.
- If `short` is true, the first line is `bd-short`; else `bd-walls`. Goal: `wallLines(task)`.
- `<StoneTray values={stones} scaffold={game.learner ... scaffold of item.step, 3 when free} targets={['wall']} ondrop={drop} />`.
- `drop(value)`: `const o = wallOutcome(task, value)`.
  - `done`: planks fly up, `say('bd-wall-up')`; when `task.served`, `moment.answer()` and dispatch `place/result` with `strand: 'm'`, `step: task.served.step`, `carrier: task.served.carrier`, `items: [{ item: task.served.carrier, result }]`, `place: 'building-day'`, `scaffold: task.served.scaffold`, `error: null`. Then `ondone()`.
  - `gap`: the planks fly up and leave `o.diff` spots empty that glow; the builder on the ladder points; `sayAll(wallMistakeLines(o))`; the planks slide back down after 1.5 s; `moment.miss()`; `error: 'off-by-one'` is recorded on the final result when `o.diff === 1`.
  - `wobble`: the top `o.diff` planks wobble and fall into the wheelbarrow, the builders giggle (`say('foal-giggle')`), `sayAll(wallMistakeLines(o))`, the planks go back; `moment.miss()`.
- Free wall (`task.served === null`): same play, no moment, no `place/result`.
- `focused`: Elizabeth counts the empty spots with `num-1` to `num-<answer>` while the ghost finger taps each spot. `ghost`: drags the right stone to the wall.

- [ ] **Step 3: Write `Trim.svelte`**

- `const item = serve('m', 'building', 'pattern')`; `const task = trimTask(item, game.rng)`.
- Checked: the trim shows `task.shown` beads (`svg('stone', { colour })`) and one empty bead spot; three bead options (`aria-label="bead <colour>"`). Goal `bd-trim`. A right bead: `moment.answer()`, `place/result` with `strand: 'm'`, `step: 'M08'`, `items: [{ item: task.served.carrier, result }]`. A wrong bead: the braid springs loose with a boing (`sfx('pop')`), the bead glows until swapped, `moment.miss()`.
- Free: `bd-trim-free`; she taps colours onto five trim spots; when all five are filled, `ondone()`. Not logged.

- [ ] **Step 4: Write `Sign.svelte`**

- `const sign = signFor(plot)`; `const t = signTask(sign, ownSlots(sign.graphemes, game.learner))`.
- `say('bd-sign')`, then the spelling prompt `['lb-lets-write', sign.clip, 'lb-listen', sign.clip]` (decision D19).
- `<GemSlots slots={sign.graphemes.map((g, i) => ({ g, own: t.own[i], crowned: false }))} tray={planTray(...).map(g => ({ g }))} onslide={slide} />` (tray from `planTray(sign.graphemes.filter((_, i) => t.own[i]), spellStepNow() ?? 'S02', 3, game.rng)`).
- When `t.checked`, a checked moment: a wrong own gem pops out and its slot hums (`moment.miss()`); a right build `moment.answer()` and `place/result` with `strand: 's'`, `step: spellStepNow()`, `carrier: sign.word`, items one per own slot (first unless that slot was wrong once), `place: 'building-day'`.
- When not checked, every gem is a gift and flies in by itself, one per 400 ms, with its sound.
- The sign rises over the plot, `say(sign.clip)`, then `ondone()`.

- [ ] **Step 5: Write `Ribbon.svelte`, `Circle.svelte` and `RowName.svelte`**

- `Ribbon`: a ribbon across the doorway and scissors (`svg('scissors')`, 96 px, `aria-label="scissors"`). `say('bd-ribbon')`. A swipe through the ribbon (pointer moves more than 120 px across it while down) cuts it: confetti (transform and opacity), `sfx('fanfare')`, `say('foal-hooray')`, then `ondone()`. The first time, the ghost hand shows the swipe.
- `Circle`: up to 12 babies (`herdView().slice(-12)`) stand in a ring around a building egg. `say('bd-circle')`. Mount `<HatchAndName breed={breed ?? currentEggBreed(game.world, game.learner)} source="building" {plot} ondone={() => ondone()} />`.
- `RowName`: `say('bd-row-name')`, then `<Naming purpose="row" onnamed={(name) => { game.dispatch({ type: 'place/row-name', row, name }); ondone(); }} />`. The row's sign then shows "<Name> Row".

- [ ] **Step 6: Wire the meadow and the hook**

In `Meadow.svelte`, `readyPlotsNow()` returns `readyPlots({ s: game.world.places, release: CURRENT_RELEASE })`. Before bubbles are explained, a ready Bath Pond still shows as a plot edge with a hammer, so the visit 2 announcement can point at it.

- [ ] **Step 7: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add games/moon-meadow-home/src/scenes/places/BuildingDay.svelte games/moon-meadow-home/src/scenes/places/building/ games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts
git commit -m "Add Building Days with walls, trim, sign, ribbon, herd circle and row naming"
```

**Acceptance:** the Bath Pond and every row can be built; each part is its own goal; leaving halfway keeps finished parts; a wall too short leaves a glowing gap and "Three planks more, please!", too tall wobbles into the wheelbarrow; the circle hatches a baby of the building's breed and she names it; a row gets her name.

### Task A14: Report formulas and the report tool

**Files:**
- Create: `src/core/report/criteria.ts`, `tools/report.ts`
- Test: `tests/report/criteria.test.ts`

**Interfaces:**
- Consumes: `GameEvent`, `Strand` (A1). Event fields of `learn.result`, `learn.idle`, `step.passed`, `egg.hatched`, `place.enter`, `place.leave`, `name.built`, `jewel.placed`, `exclude`, `visit.start`, `visit.end`.
- Produces (one named function per criterion, spec 1.3):
  - `type VisitSlice = { id: string; start: number; end: number; events: GameEvent[] }`
  - `applyExclude(ev: GameEvent[]): GameEvent[]`, `visitSlices(ev): VisitSlice[]`, `playWeek(first: number, t: number): number`, `median(xs: number[]): number`
  - E1 `visitsPerWeek(ev): Record<number, number>`
  - E2 `eggsPerVisit(ev): { perVisit: number[]; median: number; max: number }`
  - E3 `roleplayShare(ev): Record<number, number>`
  - E4 `refusedNames(ev): number`
  - E5 `freshJewelsDragged(ev): boolean[]`
  - C1 `idleFlags(ev): { step: string; visits: number; flagged: boolean }[]`
  - C2 `helpedShare(ev): Record<Strand, number | null>`
  - L1 `firstTryAccuracy(ev): Record<Strand, Record<number, { n: number; rate: number; flag: 'low' | 'high' | null }>>`
  - L2 `stepsPassed(ev): Record<Strand, number>`
  - L3 `reviewAccuracy(ev): { ladder: number | null; names: number | null }`
  - L4 `dutchShare(ev): { step: string; early: number | null; late: number | null; halved: boolean | null }[]`
  - L5 `spellingShare(ev): { perVisit: (number | null)[]; mean: number | null }`
  - `type Report = { E1: ...; E2: ...; E3: ...; E4: number; E5: boolean[]; C1: ...; C2: ...; L1: ...; L2: ...; L3: ...; L4: ...; L5: ... }` (each key holds its function's return type) and `report(ev: GameEvent[], now: number): Report`
  - `sortEvents(ev: GameEvent[]): GameEvent[]` (hlc, then dev, then the sequence after the colon in the id)

- [ ] **Step 1: Write the failing test**

`tests/report/criteria.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  dutchShare, eggsPerVisit, firstTryAccuracy, freshJewelsDragged, helpedShare, idleFlags, playWeek, refusedNames,
  report, reviewAccuracy, roleplayShare, sortEvents, spellingShare, stepsPassed, visitsPerWeek,
} from '../../src/core/report/criteria.ts';
import type { GameEvent } from '../../src/core/places/types.ts';
import { DAY, ev, resetSeq, T0 } from '../places/helpers.ts';

beforeEach(resetSeq);
const visit = (id: string, t: number, body: GameEvent[] = [], len = 600_000): GameEvent[] => [ev('visit.start', { visit: id, tz: 120 }, t), ...body, ev('visit.end', { visit: id }, t + len)];
const res = (strand: string, step: string, result: string, t: number, extra: Record<string, unknown> = {}) =>
  ev('learn.result', { strand, step, result, carrier: 'x', items: [], ms: 1000, scaffold: 3, error: null, place: 'nest', probe: false, ...extra }, t);
const many = (n: number, f: (i: number) => GameEvent) => Array.from({ length: n }, (_, i) => f(i));

describe('report criteria', () => {
  it('play weeks start at the first visit', () => {
    expect(playWeek(T0, T0)).toBe(1);
    expect(playWeek(T0, T0 + 6 * DAY)).toBe(1);
    expect(playWeek(T0, T0 + 7 * DAY)).toBe(2);
  });

  it('E1 counts visits per play week', () => {
    expect(visitsPerWeek([...visit('a', T0), ...visit('b', T0 + DAY), ...visit('c', T0 + 8 * DAY)])).toEqual({ 1: 2, 2: 1 });
  });

  it('E2 takes the median eggs per visit without building eggs', () => {
    const h = (src: string) => ev('egg.hatched', { baby: `b${Math.random()}`, source: src }, T0 + 1000);
    const out = eggsPerVisit([
      ...visit('a', T0, [h('nest'), h('nest'), h('nest'), h('building')]),
      ...visit('b', T0 + DAY, many(10, () => h('nest'))),
      ...visit('c', T0 + 2 * DAY, [h('nest')]),
    ]);
    expect(out).toEqual({ perVisit: [3, 10, 1], median: 3, max: 10 });
  });

  it('E3 is the share of visit time outside the heartbeat places', () => {
    const out = roleplayShare(visit('a', T0, [ev('place.enter', { place: 'nest' }, T0), ev('place.enter', { place: 'bath-pond' }, T0 + 240_000)]));
    expect(out[1]).toBeCloseTo(0.6, 5);
  });

  it('E4 counts name builds refused for another reason than no vowel or blocked', () => {
    const nb = (outcome: string) => ev('name.built', { outcome, name: 'x' });
    expect(refusedNames(['no-vowel', 'blocked', 'list', 'unknown', 'chosen'].map(nb))).toBe(0);
    expect(refusedNames([nb('list'), nb('refused')])).toBe(1);
  });

  it('E5 checks whether each of her first three fresh jewels was dragged in that visit or the next', () => {
    const out = freshJewelsDragged([
      ...visit('a', T0, [ev('step.passed', { strand: 's', step: 'S20' }, T0 + 1), ev('jewel.placed', { jewel: 'S20', plot: 'salon' }, T0 + 2)]),
      ...visit('b', T0 + DAY, [ev('step.passed', { strand: 'r', step: 'R30' }, T0 + DAY + 1)]),
      ...visit('c', T0 + 2 * DAY),
      ...visit('d', T0 + 3 * DAY, [ev('jewel.placed', { jewel: 'R30', plot: 'salon' }, T0 + 3 * DAY + 1)]),
      ...visit('e', T0 + 4 * DAY, [ev('step.passed', { strand: 'm', step: 'M10' }, T0 + 4 * DAY + 1), ev('jewel.placed', { jewel: 'M10', plot: 'salon' }, T0 + 4 * DAY + 2)]),
    ]);
    expect(out).toEqual([true, false, true]);
  });

  it('C1 flags a step idle in three or more visits', () => {
    const idle = (step: string, t: number) => ev('learn.idle', { strand: 's', step, place: 'nest' }, t);
    const out = idleFlags([
      ...visit('a', T0, [idle('S12', T0 + 1), idle('R21', T0 + 2)]),
      ...visit('b', T0 + DAY, [idle('S12', T0 + DAY + 1), idle('R21', T0 + DAY + 2)]),
      ...visit('c', T0 + 2 * DAY, [idle('S12', T0 + 2 * DAY + 1)]),
    ]);
    expect(out).toEqual([{ step: 'S12', visits: 3, flagged: true }, { step: 'R21', visits: 2, flagged: false }]);
  });

  it('C2 is the helped share per strand without probes', () => {
    const out = helpedShare([res('r', 'R21', 'helped', T0), res('r', 'R21', 'first', T0), res('r', 'R21', 'helped', T0, { probe: true }), res('s', 'S12', 'first', T0)]);
    expect(out).toEqual({ r: 0.5, s: 0, m: null });
  });

  it('L1 flags first-try accuracy below 60 or above 92 percent per week', () => {
    const evs = [
      ...visit('a', T0),
      ...many(10, (i) => res('r', 'R21', i < 5 ? 'first' : 'miss', T0 + i)),
      ...many(10, (i) => res('s', 'S12', 'first', T0 + i)),
      ...many(10, (i) => res('m', 'M10', i < 8 ? 'first' : 'miss', T0 + i)),
    ];
    const out = firstTryAccuracy(evs);
    expect(out.r[1]).toEqual({ n: 10, rate: 0.5, flag: 'low' });
    expect(out.s[1]).toEqual({ n: 10, rate: 1, flag: 'high' });
    expect(out.m[1]).toEqual({ n: 10, rate: 0.8, flag: null });
  });

  it('L2 counts passed steps per strand once', () => {
    expect(stepsPassed([ev('step.passed', { strand: 's', step: 'S10' }), ev('step.passed', { strand: 's', step: 'S10' }), ev('step.passed', { strand: 'r', step: 'R19' })])).toEqual({ r: 1, s: 1, m: 0 });
  });

  it('L3 counts results on steps passed before them, and names apart (decision D20)', () => {
    const out = reviewAccuracy([
      res('s', 'S20', 'miss', T0),
      ev('step.passed', { strand: 's', step: 'S20' }, T0 + 1),
      res('s', 'S20', 'first', T0 + 2), res('s', 'S20', 'first', T0 + 3), res('s', 'S20', 'first', T0 + 4), res('s', 'S20', 'miss', T0 + 5),
      res('name', 'name', 'first', T0 + 6), res('name', 'name', 'miss', T0 + 7),
    ]);
    expect(out).toEqual({ ladder: 0.75, names: 0.5 });
  });

  it('L4 compares Dutch-tagged errors in weeks 3 and 4 after a contrast step with weeks 1 and 2', () => {
    const err = (t: number, dutch: boolean) => res('s', 'S06', 'miss', t, { error: dutch ? 'dutch' : 'other' });
    const out = dutchShare([
      ev('step.passed', { strand: 's', step: 'S06' }, T0),
      err(T0 + DAY, true), err(T0 + DAY, true), err(T0 + DAY, false), err(T0 + DAY, false),
      err(T0 + 15 * DAY, true), err(T0 + 15 * DAY, false), err(T0 + 15 * DAY, false), err(T0 + 15 * DAY, false),
    ]);
    expect(out).toEqual([{ step: 'S06', early: 0.5, late: 0.25, halved: true }]);
  });

  it('L5 is the spelling share of ladder moments per visit with five or more moments', () => {
    const out = spellingShare([
      ...visit('a', T0, [res('r', 'R21', 'first', T0 + 1), res('r', 'R21', 'first', T0 + 2), res('m', 'M10', 'first', T0 + 3), res('m', 'M10', 'first', T0 + 4), res('s', 'S12', 'first', T0 + 5), res('name', 'name', 'first', T0 + 6)]),
      ...visit('b', T0 + DAY, [res('r', 'R21', 'first', T0 + DAY + 1), res('s', 'S12', 'first', T0 + DAY + 2)]),
    ]);
    expect(out).toEqual({ perVisit: [0.2, null], mean: 0.2 });
  });

  it('leaves out excluded devices and sorts by clock', () => {
    const a = { ...res('r', 'R21', 'helped', T0), dev: 'bad', id: 'bad:1', hlc: '000000000005' };
    const b = { ...res('r', 'R21', 'first', T0), dev: 'good', id: 'good:1', hlc: '000000000004' };
    const x = ev('exclude', { device: 'bad' });
    expect(report([a, b, x], T0).C2.r).toBe(0);
    expect(sortEvents([a, b]).map((e) => e.dev)).toEqual(['good', 'bad']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/report/criteria.test.ts`
Expected: FAIL, cannot resolve `criteria.ts`.

- [ ] **Step 3: Write `criteria.ts`**

```ts
import type { GameEvent, Strand } from '../places/types.ts';

const WEEK = 7 * 24 * 3_600_000;
const STRANDS: Strand[] = ['r', 's', 'm'];
export const HEARTBEAT_PLACES: ReadonlySet<string> = new Set(['nest', 'hatch', 'naming', 'wish', 'move-in']);
export const CONTRAST_STEPS: ReadonlySet<string> = new Set(['R04D', 'R11', 'R20', 'S03D', 'S06', 'M20']);
export const NAME_OUTCOMES: ReadonlySet<string> = new Set(['no-vowel', 'blocked', 'list', 'unknown', 'chosen']);

type Res = GameEvent & { strand: string; step: string; result: string; probe?: boolean; error?: string | null };
export type VisitSlice = { id: string; start: number; end: number; events: GameEvent[] };

const seqOf = (id: string) => Number(id.split(':').pop() ?? 0);
export function sortEvents(ev: GameEvent[]): GameEvent[] {
  return [...ev].sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : a.dev < b.dev ? -1 : a.dev > b.dev ? 1 : seqOf(a.id) - seqOf(b.id)));
}

export function applyExclude(ev: GameEvent[]): GameEvent[] {
  const out = new Set(ev.filter((e) => e.type === 'exclude').map((e) => String(e.device)));
  return ev.filter((e) => !out.has(e.dev));
}

export function visitSlices(ev: GameEvent[]): VisitSlice[] {
  const out: VisitSlice[] = [];
  let cur: VisitSlice | null = null;
  for (const e of ev) {
    if (e.type === 'visit.start') { cur = { id: String(e.visit), start: e.t, end: e.t, events: [] }; out.push(cur); continue; }
    if (!cur) continue;
    cur.events.push(e);
    cur.end = Math.max(cur.end, e.t);
    if (e.type === 'visit.end') cur = null;
  }
  return out;
}

export const playWeek = (first: number, t: number): number => 1 + Math.floor((t - first) / WEEK);
const firstStart = (ev: GameEvent[]) => ev.find((e) => e.type === 'visit.start')?.t ?? ev[0]?.t ?? 0;
const results = (ev: GameEvent[]) => ev.filter((e) => e.type === 'learn.result') as Res[];

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function visitsPerWeek(ev: GameEvent[]): Record<number, number> {
  const f = firstStart(ev);
  const out: Record<number, number> = {};
  for (const v of visitSlices(ev)) { const w = playWeek(f, v.start); out[w] = (out[w] ?? 0) + 1; }
  return out;
}

export function eggsPerVisit(ev: GameEvent[]): { perVisit: number[]; median: number; max: number } {
  const perVisit = visitSlices(ev).map((v) => v.events.filter((e) => e.type === 'egg.hatched' && e.source !== 'building').length);
  return { perVisit, median: median(perVisit), max: perVisit.length ? Math.max(...perVisit) : 0 };
}

function heartbeatTime(v: VisitSlice): number {
  let total = 0;
  let since: number | null = null;
  for (const e of v.events) {
    if (e.type === 'place.enter') {
      if (since !== null) { total += e.t - since; since = null; }
      if (HEARTBEAT_PLACES.has(String(e.place))) since = e.t;
    } else if (e.type === 'place.leave' && since !== null && HEARTBEAT_PLACES.has(String(e.place))) {
      total += e.t - since; since = null;
    }
  }
  if (since !== null) total += v.end - since;
  return total;
}

export function roleplayShare(ev: GameEvent[]): Record<number, number> {
  const f = firstStart(ev);
  const acc: Record<number, [number, number]> = {};
  for (const v of visitSlices(ev)) {
    const w = playWeek(f, v.start);
    const len = v.end - v.start;
    const [o, l] = acc[w] ?? [0, 0];
    acc[w] = [o + len - heartbeatTime(v), l + len];
  }
  return Object.fromEntries(Object.entries(acc).map(([w, [o, l]]) => [w, l ? o / l : 0]));
}

export function refusedNames(ev: GameEvent[]): number {
  return ev.filter((e) => e.type === 'name.built' && !NAME_OUTCOMES.has(String(e.outcome))).length;
}

export function freshJewelsDragged(ev: GameEvent[]): boolean[] {
  const slices = visitSlices(ev);
  const out: boolean[] = [];
  slices.forEach((v, i) => {
    for (const e of v.events) {
      if (e.type !== 'step.passed' || out.length >= 3) continue;
      const window = [...v.events, ...(slices[i + 1]?.events ?? [])];
      out.push(window.some((x) => x.type === 'jewel.placed' && x.jewel === e.step));
    }
  });
  return out;
}

export function idleFlags(ev: GameEvent[]): { step: string; visits: number; flagged: boolean }[] {
  const by = new Map<string, Set<string>>();
  for (const v of visitSlices(ev)) for (const e of v.events) {
    if (e.type !== 'learn.idle') continue;
    const k = String(e.step);
    if (!by.has(k)) by.set(k, new Set());
    by.get(k)!.add(v.id);
  }
  return [...by].map(([step, set]) => ({ step, visits: set.size, flagged: set.size >= 3 })).sort((a, b) => b.visits - a.visits);
}

export function helpedShare(ev: GameEvent[]): Record<Strand, number | null> {
  const out = {} as Record<Strand, number | null>;
  for (const s of STRANDS) {
    const rs = results(ev).filter((r) => r.strand === s && !r.probe);
    out[s] = rs.length ? rs.filter((r) => r.result === 'helped').length / rs.length : null;
  }
  return out;
}

export function firstTryAccuracy(ev: GameEvent[]): Record<Strand, Record<number, { n: number; rate: number; flag: 'low' | 'high' | null }>> {
  const f = firstStart(ev);
  const out = { r: {}, s: {}, m: {} } as Record<Strand, Record<number, { n: number; rate: number; flag: 'low' | 'high' | null }>>;
  const firsts: Record<string, number> = {};
  for (const r of results(ev)) {
    if (r.probe || !STRANDS.includes(r.strand as Strand)) continue;
    const w = playWeek(f, r.t);
    const cell = (out[r.strand as Strand][w] ??= { n: 0, rate: 0, flag: null });
    cell.n += 1;
    const key = `${r.strand}:${w}`;
    firsts[key] = (firsts[key] ?? 0) + (r.result === 'first' ? 1 : 0);
    cell.rate = firsts[key] / cell.n;
    cell.flag = cell.rate < 0.6 ? 'low' : cell.rate > 0.92 ? 'high' : null;
  }
  return out;
}

export function stepsPassed(ev: GameEvent[]): Record<Strand, number> {
  const seen = new Set<string>();
  const out: Record<Strand, number> = { r: 0, s: 0, m: 0 };
  for (const e of ev) {
    if (e.type !== 'step.passed' || seen.has(String(e.step))) continue;
    seen.add(String(e.step));
    out[e.strand as Strand] += 1;
  }
  return out;
}

export function reviewAccuracy(ev: GameEvent[]): { ladder: number | null; names: number | null } {
  const passedAt = new Map<string, number>();
  let n = 0; let f = 0; let nn = 0; let nf = 0;
  for (const e of ev) {
    if (e.type === 'step.passed' && !passedAt.has(String(e.step))) passedAt.set(String(e.step), e.t);
    if (e.type !== 'learn.result') continue;
    const r = e as Res;
    if (r.probe) continue;
    if (r.strand === 'name') { nn += 1; nf += r.result === 'first' ? 1 : 0; continue; }
    const p = passedAt.get(r.step);
    if (p !== undefined && p < r.t) { n += 1; f += r.result === 'first' ? 1 : 0; }
  }
  return { ladder: n ? f / n : null, names: nn ? nf / nn : null };
}

export function dutchShare(ev: GameEvent[]): { step: string; early: number | null; late: number | null; halved: boolean | null }[] {
  const out: { step: string; early: number | null; late: number | null; halved: boolean | null }[] = [];
  for (const p of ev.filter((e) => e.type === 'step.passed' && CONTRAST_STEPS.has(String(e.step)))) {
    const errs = results(ev).filter((r) => r.step === p.step && r.result !== 'first');
    const share = (from: number, to: number) => {
      const w = errs.filter((r) => r.t >= p.t + from * WEEK && r.t < p.t + to * WEEK);
      return w.length ? w.filter((r) => r.error === 'dutch').length / w.length : null;
    };
    const early = share(0, 2);
    const late = share(2, 4);
    out.push({ step: String(p.step), early, late, halved: early === null || late === null ? null : late <= early / 2 });
  }
  return out;
}

export function spellingShare(ev: GameEvent[]): { perVisit: (number | null)[]; mean: number | null } {
  const perVisit = visitSlices(ev).map((v) => {
    const rs = (v.events.filter((e) => e.type === 'learn.result') as Res[]).filter((r) => STRANDS.includes(r.strand as Strand));
    return rs.length >= 5 ? rs.filter((r) => r.strand === 's').length / rs.length : null;
  });
  const ok = perVisit.filter((x): x is number => x !== null);
  return { perVisit, mean: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null };
}

export type Report = {
  E1: Record<number, number>; E2: ReturnType<typeof eggsPerVisit>; E3: Record<number, number>; E4: number; E5: boolean[];
  C1: ReturnType<typeof idleFlags>; C2: Record<Strand, number | null>; L1: ReturnType<typeof firstTryAccuracy>;
  L2: Record<Strand, number>; L3: ReturnType<typeof reviewAccuracy>; L4: ReturnType<typeof dutchShare>; L5: ReturnType<typeof spellingShare>;
  generatedAt: number;
};

export function report(all: GameEvent[], now: number): Report {
  const ev = applyExclude(sortEvents(all));
  return {
    E1: visitsPerWeek(ev), E2: eggsPerVisit(ev), E3: roleplayShare(ev), E4: refusedNames(ev), E5: freshJewelsDragged(ev),
    C1: idleFlags(ev), C2: helpedShare(ev), L1: firstTryAccuracy(ev), L2: stepsPassed(ev), L3: reviewAccuracy(ev),
    L4: dutchShare(ev), L5: spellingShare(ev), generatedAt: now,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/report/criteria.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Write `tools/report.ts`**

```ts
import { readFileSync } from 'node:fs';
import { report } from '../src/core/report/criteria.ts';
import type { GameEvent } from '../src/core/places/types.ts';

const file = process.argv[2];
if (!file) { console.error('Usage: node tools/report.ts <save-export.json>'); process.exit(2); }
const data = JSON.parse(readFileSync(file, 'utf8')) as { format?: string; events?: GameEvent[] };
if (data.format !== 'moon-meadow-save' || !Array.isArray(data.events)) { console.error('Not a moon-meadow-save export.'); process.exit(1); }
console.log(JSON.stringify(report(data.events, Date.now()), null, 2));
```

- [ ] **Step 6: Run the tool on a fixture**

Run: `printf '{"format":"moon-meadow-save","v":1,"exportedAt":0,"events":[]}' > "$TMPDIR/empty-save.json" && node tools/report.ts "$TMPDIR/empty-save.json"`
Expected: JSON with `"E4": 0` and empty objects. Node 24 runs the `.ts` file with type stripping.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/report/criteria.ts games/moon-meadow-home/tools/report.ts games/moon-meadow-home/tests/report/criteria.test.ts
git commit -m "Add the report formulas for the success criteria and the report tool"
```

**Acceptance:** each criterion E1 to L5 has a named, tested function; excluded devices are left out; `node tools/report.ts <export>` prints the report.

### Task A15: Parent corner, first part

**Files:**
- Create: `src/parent/parent.ts`, `src/parent/ParentCorner.svelte`, `src/parent/PinGate.svelte`, `src/parent/Report.svelte`, `src/parent/Names.svelte`, `src/parent/Overrides.svelte`, `src/parent/Backup.svelte`
- Modify: `src/scenes/places/Meadow.svelte` (mount `<PinGate />`), `src/places/scenes.ts` (add `parent: ParentCorner`), `src/places/hook.ts` (add `parent`)
- Test: `tests/places/parent.test.ts`

**Interfaces:**
- Consumes: `report` (A14); `GameEvent`, `StepView`, `LearnerView` (A1); save `exportFile`, `importFile`, `resetDevice`, `deviceId`, `allEvents`, `storageStatus`; content `ladder(strand)`; `game`.
- Produces:
  - `DEFAULT_PIN = '2468'`, `NUMBER_WORDS: string[]` (`zero` to `nine`)
  - `pinOf(settings: Record<string, unknown>): string`, `checkPin(entered: string, settings: Record<string, unknown>): boolean`
  - `keypadOrder(rng: Rng): number[]`
  - `type NameRow = { name: string; count: number; first: number; last: number; route: string }`
  - `nameLog(ev: GameEvent[]): { unknown: NameRow[]; list: NameRow[]; blocked: NameRow[]; strong: NameRow[]; noVowel: number }`
  - `deviceList(ev: GameEvent[]): { dev: string; events: number; visits: number; first: number; last: number; excluded: boolean }[]`
  - `overrideRows(steps: StepView[], l: LearnerView): { strand: Strand; current: StepId | null; steps: { id: StepId; passed: boolean; school: boolean }[] }[]`
  - `exportReminder(lastExport: number | null, lastSync: number | null, now: number): boolean` (true when both are older than 7 days or missing)
  - `<PinGate />`: a 48 px visible, 64 px hit-area button at the top right, `aria-label="parent"`. Holding it for 3 s opens a keypad of number words in `keypadOrder` order (`aria-label="key <word>"`). Four digits; right opens the `parent` scene, wrong clears with a shake.
  - Hook `parent`: `{ open(pin: string): boolean; report(): Report; exportJson(): Promise<string>; importJson(text: string): Promise<number>; devices(): ReturnType<typeof deviceList> }`

- [ ] **Step 1: Write the failing test**

`tests/places/parent.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { checkPin, DEFAULT_PIN, deviceList, exportReminder, keypadOrder, nameLog, overrideRows, pinOf } from '../../src/parent/parent.ts';
import { DAY, ev, learner, resetSeq, rng, T0 } from './helpers.ts';
import type { StepView } from '../../src/core/places/types.ts';

beforeEach(resetSeq);

describe('parent corner helpers', () => {
  it('uses 2468 until a PIN is set (decision D18)', () => {
    expect(DEFAULT_PIN).toBe('2468');
    expect(pinOf({})).toBe('2468');
    expect(pinOf({ parentPin: '1357' })).toBe('1357');
    expect(checkPin('2468', {})).toBe(true);
    expect(checkPin('2469', {})).toBe(false);
  });

  it('shuffles all ten digits on the keypad', () => {
    expect([...keypadOrder(rng(4))].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('groups name builds by outcome and lists strong words', () => {
    const nb = (name: string, outcome: string, t: number, strong = false) => ev('name.built', { name, outcome, route: 'gold', gems: [], phonemes: [], strong }, t);
    const out = nameLog([nb('Tamo', 'unknown', 1), nb('Tamo', 'unknown', 5), nb('Lili', 'list', 2), nb('Fuk', 'blocked', 3, true), nb('Bm', 'no-vowel', 4)]);
    expect(out.unknown).toEqual([{ name: 'Tamo', count: 2, first: 1, last: 5, route: 'gold' }]);
    expect(out.list.map((r) => r.name)).toEqual(['Lili']);
    expect(out.blocked.map((r) => r.name)).toEqual(['Fuk']);
    expect(out.strong.map((r) => r.name)).toEqual(['Fuk']);
    expect(out.noVowel).toBe(1);
  });

  it('lists devices with their visits and whether they are excluded', () => {
    const a = { ...ev('visit.start', { visit: 'v1', tz: 0 }, 10), dev: 'aaaa1111' };
    const b = { ...ev('egg.hatched', { baby: 'x' }, 20), dev: 'aaaa1111' };
    const c = { ...ev('visit.start', { visit: 'v2', tz: 0 }, 30), dev: 'bbbb2222' };
    const x = { ...ev('exclude', { device: 'bbbb2222' }, 40), dev: 'aaaa1111' };
    expect(deviceList([a, b, c, x])).toEqual([
      { dev: 'aaaa1111', events: 3, visits: 1, first: 10, last: 40, excluded: false },
      { dev: 'bbbb2222', events: 1, visits: 1, first: 30, last: 30, excluded: true },
    ]);
  });

  it('builds override rows per strand with school steps marked', () => {
    const steps: StepView[] = [
      { id: 'R19', strand: 'r', items: ['-s'], places: ['bath-pond'], levels: 3, school: true },
      { id: 'R21', strand: 'r', items: ['nd'], places: ['wish'], levels: 3 },
      { id: 'S10', strand: 's', items: ['-s'], places: ['toy-shelf'], levels: 3, school: true },
    ];
    const rows = overrideRows(steps, learner({ current: { r: 'R21', s: 'S12', m: 'M10' }, passed: [{ step: 'S10', strand: 's', t: 1, visit: 'v1' }] }));
    expect(rows.find((r) => r.strand === 'r')).toEqual({ strand: 'r', current: 'R21', steps: [{ id: 'R19', passed: false, school: true }, { id: 'R21', passed: false, school: false }] });
    expect(rows.find((r) => r.strand === 's')?.steps).toEqual([{ id: 'S10', passed: true, school: true }]);
  });

  it('reminds about a backup older than seven days', () => {
    expect(exportReminder(null, null, T0)).toBe(true);
    expect(exportReminder(T0 - 8 * DAY, null, T0)).toBe(true);
    expect(exportReminder(T0 - 2 * DAY, null, T0)).toBe(false);
    expect(exportReminder(null, T0 - DAY, T0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/parent.test.ts`
Expected: FAIL, cannot resolve `parent.ts`.

- [ ] **Step 3: Write `parent.ts`**

```ts
import type { GameEvent, LearnerView, Rng, StepId, StepView, Strand } from '../core/places/types.ts';

export const DEFAULT_PIN = '2468';
export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export const pinOf = (settings: Record<string, unknown>): string => (typeof settings.parentPin === 'string' && /^\d{4}$/.test(settings.parentPin) ? settings.parentPin : DEFAULT_PIN);
export const checkPin = (entered: string, settings: Record<string, unknown>): boolean => entered === pinOf(settings);

export function keypadOrder(rng: Rng): number[] {
  const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export type NameRow = { name: string; count: number; first: number; last: number; route: string };

export function nameLog(ev: GameEvent[]): { unknown: NameRow[]; list: NameRow[]; blocked: NameRow[]; strong: NameRow[]; noVowel: number } {
  const groups: Record<string, Map<string, NameRow>> = { unknown: new Map(), list: new Map(), blocked: new Map(), strong: new Map() };
  let noVowel = 0;
  const add = (g: string, e: GameEvent) => {
    const name = String(e.name);
    const row = groups[g].get(name);
    if (row) { row.count += 1; row.last = e.t; } else groups[g].set(name, { name, count: 1, first: e.t, last: e.t, route: String(e.route ?? '') });
  };
  for (const e of ev) {
    if (e.type !== 'name.built') continue;
    if (e.outcome === 'no-vowel') { noVowel += 1; continue; }
    if (e.outcome === 'unknown') add('unknown', e);
    if (e.outcome === 'list' || e.outcome === 'chosen') add('list', e);
    if (e.outcome === 'blocked') { add('blocked', e); if (e.strong) add('strong', e); }
  }
  const rows = (g: string) => [...groups[g].values()];
  return { unknown: rows('unknown'), list: rows('list'), blocked: rows('blocked'), strong: rows('strong'), noVowel };
}

export function deviceList(ev: GameEvent[]): { dev: string; events: number; visits: number; first: number; last: number; excluded: boolean }[] {
  const excluded = new Set(ev.filter((e) => e.type === 'exclude').map((e) => String(e.device)));
  const by = new Map<string, { dev: string; events: number; visits: number; first: number; last: number; excluded: boolean }>();
  for (const e of ev) {
    const row = by.get(e.dev) ?? { dev: e.dev, events: 0, visits: 0, first: e.t, last: e.t, excluded: excluded.has(e.dev) };
    row.events += 1;
    if (e.type === 'visit.start') row.visits += 1;
    row.first = Math.min(row.first, e.t);
    row.last = Math.max(row.last, e.t);
    by.set(e.dev, row);
  }
  return [...by.values()].sort((a, b) => a.first - b.first);
}

export function overrideRows(steps: StepView[], l: LearnerView): { strand: Strand; current: StepId | null; steps: { id: StepId; passed: boolean; school: boolean }[] }[] {
  return (['r', 's', 'm'] as Strand[]).map((strand) => ({
    strand,
    current: l.current[strand],
    steps: steps.filter((s) => s.strand === strand).map((s) => ({ id: s.id, passed: l.passedOrPlaced(s.id), school: Boolean(s.school) })),
  })).filter((r) => r.steps.length > 0);
}

export function exportReminder(lastExport: number | null, lastSync: number | null, now: number): boolean {
  const newest = Math.max(lastExport ?? 0, lastSync ?? 0);
  return now - newest > 7 * 24 * 3_600_000;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/parent.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the components**

The parent corner is for Tjitse. It uses plain English text in Andika at 18 px, works in portrait (820 x 1180) and landscape, scrolls vertically, and has a close button (`aria-label="close parent corner"`) that returns to the meadow.

- `PinGate.svelte`: `pointerdown` starts a 3 s timer, `pointerup` or `pointerleave` cancels it. A thin ring fills during the hold (transform scale on an SVG circle). Then a keypad overlay with ten 72 px keys labelled by `NUMBER_WORDS[d]` in `keypadOrder(game.rng)` order, four dots for entered digits, and a cancel key. Right PIN: `enterPlace('parent')`.
- `ParentCorner.svelte`: sections in this order: warnings, Report, Names, Overrides, Backup. Wave C adds Missing clips, Idle flags, Settings and Pairing.
- Warnings, from `storageStatus()`: "Storage is not saving. Export now." when `writeFailing`; "Add to Home Screen, or the herd can be lost." when not `standalone` or `persisted === false` (on plain http, say instead "This copy runs over the home network without offline storage protection. Export often."); the export reminder from `exportReminder(...)`.
- `Report.svelte`: a table with one row per criterion: id, the measure in words from spec 1.3, the value from `report(allEvents(), game.now())`, the target, and a red or green dot. Week values show the last four play weeks.
- `Names.svelte`: three lists from `nameLog(allEvents())`: "Names she invented (no clip yet)", "Names from the list", "Blocked builds", with counts, plus the strong-word count. A "Copy unknown names" button writes the unknown names, one per line, to the clipboard (`navigator.clipboard.writeText` when available, else a selectable text box).
- `Overrides.svelte`: per strand, the current step and a list of loaded steps. Each step row has two buttons: "Make current" (`place/override` with `as: 'current'`) and "Mark placed" (`as: 'placed'`), with a confirm step. School steps show a "school" tag.
- `Backup.svelte`: "Export" calls `exportFile()` then shares it with `navigator.share({ files })` when `navigator.canShare?.({ files })` is true, else downloads it as `moon-meadow-<date>.json`. "Import" is a file input (`accept=".json,application/json"`) that calls `importFile(file)` and shows "Added <n> events" (or "v2 herd imported"). The device list from `deviceList(allEvents())` shows each device id, events, visits and dates, with an "Exclude" button (`place/exclude`, confirm first) for every device except this one (`deviceId()`). "Reset this iPad" needs a 3 s hold and then calls `resetDevice()`.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/parent/ games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/parent.test.ts
git commit -m "Add the parent corner with PIN, report, names, overrides and backup"
```

**Acceptance:** a 3 s hold and the PIN open the parent corner; it shows the report, tried and unknown names, step overrides, export, import, device exclusion and reset, in portrait and landscape.

### Task A16: Place lines and art list

All place lines for the three waves go in one file now, so the audio workstream can generate them in one budgeted run. The text is final.

**Files:**
- Create: `public/audio/places/lines.json`
- Test: `tests/places/lines.test.ts`

**Interfaces:**
- Consumes: the line ids referenced in Tasks A6 to A15 and in Waves B and C.
- Produces: `public/audio/places/lines.json` with the `places` pack lines.

- [ ] **Step 1: Write the lines file**

`public/audio/places/lines.json`:

```json
{
  "lines": [
    {"id": "mw-bubbles-explain", "speaker": "narrator", "text": "When you see a bubble, someone is waiting for you."},
    {"id": "mw-meadow-this-way", "speaker": "narrator", "text": "The meadow is this way."},
    {"id": "mw-pond-ready", "speaker": "narrator", "text": "The pond is ready to build!"},
    {"id": "mw-post-ready", "speaker": "narrator", "text": "The post box is ready to build!"},
    {"id": "mw-notes-open", "speaker": "narrator", "text": "Now you can write notes to Lumi!"},
    {"id": "mw-letter-lane-open", "speaker": "narrator", "text": "Letter Lane is open!"},
    {"id": "lumi-dressing-open", "speaker": "queen", "text": "Come and try my Dressing Corner!"},

    {"id": "lb-found", "speaker": "narrator", "text": "Look! Someone found something for the toy shelf."},
    {"id": "lb-lets-write", "speaker": "narrator", "text": "Let's write!"},
    {"id": "lb-listen", "speaker": "narrator", "text": "Listen!"},
    {"id": "lb-on-the-jar", "speaker": "narrator", "text": "On the jar it goes!"},
    {"id": "lb-label-says-one", "speaker": "narrator", "text": "The label only says one."},
    {"id": "lb-shelf", "speaker": "narrator", "text": "Tap a jar to play. Tap a label to hear it."},
    {"id": "pl-more-than-one", "speaker": "narrator", "text": "More than one."},
    {"id": "pl-just-one", "speaker": "narrator", "text": "Just one."},
    {"id": "pl-look-in-jar", "speaker": "narrator", "text": "Look in the jar!"},
    {"id": "pl-mice", "speaker": "narrator", "text": "Mice. One mouse, lots of mice."},

    {"id": "pd-welcome", "speaker": "narrator", "text": "Splash time at the Bath Pond!"},
    {"id": "pd-wish-goal", "speaker": "narrator", "text": "A bath wish! Bring it to the baby."},
    {"id": "pd-play", "speaker": "narrator", "text": "Drag a baby into the water."},
    {"id": "foal-splash", "speaker": "foal", "text": "[giggles] Splash!", "seed": 21},
    {"id": "foal-hooray", "speaker": "foal", "text": "[excited] Hooray!", "seed": 22},
    {"id": "foal-not-me", "speaker": "foal", "text": "[giggles] Not me!", "seed": 23},
    {"id": "foal-pretty", "speaker": "foal", "text": "[happy] Pretty!", "seed": 24},
    {"id": "foal-giggle", "speaker": "foal", "text": "[giggles]", "seed": 25},

    {"id": "lumi-builders", "speaker": "queen", "text": "The builders are here!"},
    {"id": "lumi-pond-open", "speaker": "queen", "text": "The Bath Pond is open!"},
    {"id": "lumi-post-open", "speaker": "queen", "text": "The Post Box is open!"},
    {"id": "lumi-salon-open", "speaker": "queen", "text": "The Sparkle Salon is open!"},
    {"id": "lumi-row-open", "speaker": "queen", "text": "A new row for my unicorns!"},
    {"id": "bd-walls", "speaker": "narrator", "text": "First the wall."},
    {"id": "bd-short", "speaker": "narrator", "text": "Fill the row with planks."},
    {"id": "bd-needs-2", "speaker": "narrator", "text": "The wall needs two planks."},
    {"id": "bd-needs-3", "speaker": "narrator", "text": "The wall needs three planks."},
    {"id": "bd-needs-4", "speaker": "narrator", "text": "The wall needs four planks."},
    {"id": "bd-needs-5", "speaker": "narrator", "text": "The wall needs five planks."},
    {"id": "bd-needs-6", "speaker": "narrator", "text": "The wall needs six planks."},
    {"id": "bd-needs-7", "speaker": "narrator", "text": "The wall needs seven planks."},
    {"id": "bd-needs-8", "speaker": "narrator", "text": "The wall needs eight planks."},
    {"id": "bd-needs-9", "speaker": "narrator", "text": "The wall needs nine planks."},
    {"id": "bd-needs-10", "speaker": "narrator", "text": "The wall needs ten planks."},
    {"id": "bd-up-1", "speaker": "narrator", "text": "One is up."},
    {"id": "bd-up-2", "speaker": "narrator", "text": "Two are up."},
    {"id": "bd-up-3", "speaker": "narrator", "text": "Three are up."},
    {"id": "bd-up-4", "speaker": "narrator", "text": "Four are up."},
    {"id": "bd-up-5", "speaker": "narrator", "text": "Five are up."},
    {"id": "bd-up-6", "speaker": "narrator", "text": "Six are up."},
    {"id": "bd-up-7", "speaker": "narrator", "text": "Seven are up."},
    {"id": "bd-up-8", "speaker": "narrator", "text": "Eight are up."},
    {"id": "bd-up-9", "speaker": "narrator", "text": "Nine are up."},
    {"id": "bd-more-1", "speaker": "narrator", "text": "One plank more, please!"},
    {"id": "bd-more-2", "speaker": "narrator", "text": "Two planks more, please!"},
    {"id": "bd-more-3", "speaker": "narrator", "text": "Three planks more, please!"},
    {"id": "bd-more-4", "speaker": "narrator", "text": "Four planks more, please!"},
    {"id": "bd-more-5", "speaker": "narrator", "text": "Five planks more, please!"},
    {"id": "bd-more-6", "speaker": "narrator", "text": "Six planks more, please!"},
    {"id": "bd-more-7", "speaker": "narrator", "text": "Seven planks more, please!"},
    {"id": "bd-more-8", "speaker": "narrator", "text": "Eight planks more, please!"},
    {"id": "bd-more-9", "speaker": "narrator", "text": "Nine planks more, please!"},
    {"id": "nm-too-many-1", "speaker": "narrator", "text": "One too many."},
    {"id": "nm-too-many-2", "speaker": "narrator", "text": "Two too many."},
    {"id": "nm-too-many-3", "speaker": "narrator", "text": "Three too many."},
    {"id": "nm-too-many-4", "speaker": "narrator", "text": "Four too many."},
    {"id": "nm-too-many-5", "speaker": "narrator", "text": "Five too many."},
    {"id": "nm-too-many-6", "speaker": "narrator", "text": "Six too many."},
    {"id": "nm-too-many-7", "speaker": "narrator", "text": "Seven too many."},
    {"id": "nm-too-many-8", "speaker": "narrator", "text": "Eight too many."},
    {"id": "nm-too-many-9", "speaker": "narrator", "text": "Nine too many."},
    {"id": "bd-wall-up", "speaker": "narrator", "text": "The wall is up!"},
    {"id": "bd-trim", "speaker": "narrator", "text": "Finish the pattern on the trim."},
    {"id": "bd-trim-free", "speaker": "narrator", "text": "Pick colours for the trim."},
    {"id": "bd-sign", "speaker": "narrator", "text": "Now the sign."},
    {"id": "bd-ribbon", "speaker": "narrator", "text": "Cut the ribbon!"},
    {"id": "bd-circle", "speaker": "narrator", "text": "Everyone is here. Look at the egg!"},
    {"id": "bd-row-name", "speaker": "narrator", "text": "Pick a name for the new row."},
    {"id": "word-sign-pond", "speaker": "narrator", "text": "Pond."},
    {"id": "word-sign-post", "speaker": "narrator", "text": "Post."},
    {"id": "word-sign-salon", "speaker": "narrator", "text": "Salon."},
    {"id": "word-sign-stalls", "speaker": "narrator", "text": "Stalls."},

    {"id": "jw-new-jewel", "speaker": "narrator", "text": "You have a new jewel. Bring it here!"},
    {"id": "jw-stone-lit", "speaker": "narrator", "text": "The stone is shining!"},
    {"id": "jw-all-lit", "speaker": "narrator", "text": "All the stones are shining. Time to build!"},
    {"id": "jw-decor-built", "speaker": "narrator", "text": "Look what grew!"},
    {"id": "jw-fact-m01", "speaker": "narrator", "text": "One and two make three."},
    {"id": "jw-fact-m02", "speaker": "narrator", "text": "Four and four make eight."},
    {"id": "jw-fact-m03", "speaker": "narrator", "text": "Two and five make seven."},
    {"id": "jw-fact-m04", "speaker": "narrator", "text": "Five and one make six."},
    {"id": "jw-fact-m05", "speaker": "narrator", "text": "Two and three make five."},
    {"id": "jw-fact-m07", "speaker": "narrator", "text": "Ten and five make fifteen."},
    {"id": "jw-fact-m08", "speaker": "narrator", "text": "Three and three make six."},
    {"id": "jw-fact-m09", "speaker": "narrator", "text": "Six and four make ten."},
    {"id": "jw-fact-m10", "speaker": "narrator", "text": "Seven and three make ten."},
    {"id": "jw-fact-m11", "speaker": "narrator", "text": "Eight and two make ten."},
    {"id": "jw-fact-m12", "speaker": "narrator", "text": "Four and three make seven."},
    {"id": "jw-fact-m13", "speaker": "narrator", "text": "Five and four make nine."},
    {"id": "jw-fact-m14", "speaker": "narrator", "text": "Nine take away five is four."},

    {"id": "nv-pins", "speaker": "narrator", "text": "New pins have come to the post!"},
    {"id": "nv-stall-lanterns", "speaker": "narrator", "text": "New lanterns for the stalls!"},
    {"id": "nv-flowerboxes", "speaker": "narrator", "text": "New flower boxes for the stalls!"},
    {"id": "nv-egg-skin", "speaker": "narrator", "text": "A new egg pattern!"},
    {"id": "nv-cousin", "speaker": "narrator", "text": "A new cousin is coming to visit!"},
    {"id": "nv-bubbles", "speaker": "narrator", "text": "Look! A bubble machine in the meadow!"},

    {"id": "dc-welcome", "speaker": "queen", "text": "Welcome to my Dressing Corner!"},
    {"id": "dc-try", "speaker": "narrator", "text": "Try on crowns and capes!"},
    {"id": "dc-saved", "speaker": "narrator", "text": "What a lovely outfit!"},

    {"id": "pb-arrive", "speaker": "narrator", "text": "Post has come!"},
    {"id": "pb-envelope-goal", "speaker": "narrator", "text": "Give the envelope to its baby."},
    {"id": "pb-sash-need", "speaker": "narrator", "text": "This sash needs ten pins."},
    {"id": "pb-has-0", "speaker": "narrator", "text": "It has none."},
    {"id": "pb-has-1", "speaker": "narrator", "text": "It has one."},
    {"id": "pb-has-2", "speaker": "narrator", "text": "It has two."},
    {"id": "pb-has-3", "speaker": "narrator", "text": "It has three."},
    {"id": "pb-has-4", "speaker": "narrator", "text": "It has four."},
    {"id": "pb-has-5", "speaker": "narrator", "text": "It has five."},
    {"id": "pb-has-6", "speaker": "narrator", "text": "It has six."},
    {"id": "pb-has-7", "speaker": "narrator", "text": "It has seven."},
    {"id": "pb-has-8", "speaker": "narrator", "text": "It has eight."},
    {"id": "pb-has-9", "speaker": "narrator", "text": "It has nine."},
    {"id": "pb-pins-fly", "speaker": "narrator", "text": "The pins fly on!"},
    {"id": "pb-few", "speaker": "narrator", "text": "Some spots are still empty."},
    {"id": "pb-fewest-goal", "speaker": "narrator", "text": "This pin goes to the baby with the fewest pins."},
    {"id": "pb-parcel-goal", "speaker": "narrator", "text": "Fill the parcel. The label says how many."},
    {"id": "pb-parcel-done", "speaker": "narrator", "text": "The parcel is full!"},
    {"id": "pb-set-full", "speaker": "narrator", "text": "A full set! Look what happened!"},
    {"id": "pb-pouch", "speaker": "narrator", "text": "This pin goes in the pin pouch."},
    {"id": "pb-lumi-gift", "speaker": "queen", "text": "Here are some pins from me!"},

    {"id": "nt-lets-write", "speaker": "narrator", "text": "Let's write a note to Lumi."},
    {"id": "nt-cards-goal", "speaker": "narrator", "text": "Put the cards in order."},
    {"id": "nt-mark-goal", "speaker": "narrator", "text": "Now pick the end mark."},
    {"id": "nt-spell-goal", "speaker": "narrator", "text": "Now write this word."},
    {"id": "nt-up", "speaker": "narrator", "text": "Up it goes to Lumi!"},
    {"id": "nt-crown", "speaker": "narrator", "text": "Oh! The first word needs its crown letter."},
    {"id": "nt-swing-ask", "speaker": "narrator", "text": "Can we have a swing?"},
    {"id": "nt-swing-tell", "speaker": "narrator", "text": "Can we have a swing."},
    {"id": "nt-swing-shout", "speaker": "narrator", "text": "Can we have a swing!"},
    {"id": "nt-kite-ask", "speaker": "narrator", "text": "Can you send me a kite?"},
    {"id": "nt-kite-tell", "speaker": "narrator", "text": "Can you send me a kite."},
    {"id": "nt-kite-shout", "speaker": "narrator", "text": "Can you send me a kite!"},
    {"id": "nt-pond-go-ask", "speaker": "narrator", "text": "Can I go to the pond?"},
    {"id": "nt-pond-go-tell", "speaker": "narrator", "text": "Can I go to the pond."},
    {"id": "nt-pond-go-shout", "speaker": "narrator", "text": "Can I go to the pond!"},
    {"id": "nt-moon-ask", "speaker": "narrator", "text": "We love the moon?"},
    {"id": "nt-moon-tell", "speaker": "narrator", "text": "We love the moon."},
    {"id": "nt-moon-shout", "speaker": "narrator", "text": "We love the moon!"},
    {"id": "nt-stars-ask", "speaker": "narrator", "text": "He and she like the stars?"},
    {"id": "nt-stars-tell", "speaker": "narrator", "text": "He and she like the stars."},
    {"id": "nt-stars-shout", "speaker": "narrator", "text": "He and she like the stars!"},
    {"id": "nt-he-pond-ask", "speaker": "narrator", "text": "Can he come to the pond?"},
    {"id": "nt-he-pond-tell", "speaker": "narrator", "text": "Can he come to the pond."},
    {"id": "nt-he-pond-shout", "speaker": "narrator", "text": "Can he come to the pond!"},
    {"id": "nt-hello-ask", "speaker": "narrator", "text": "They said hello to the moon?"},
    {"id": "nt-hello-tell", "speaker": "narrator", "text": "They said hello to the moon."},
    {"id": "nt-hello-shout", "speaker": "narrator", "text": "They said hello to the moon!"},
    {"id": "nt-cake-ask", "speaker": "narrator", "text": "Can they have some cake?"},
    {"id": "nt-cake-tell", "speaker": "narrator", "text": "Can they have some cake."},
    {"id": "nt-cake-shout", "speaker": "narrator", "text": "Can they have some cake!"},
    {"id": "nt-come-ask", "speaker": "narrator", "text": "Come and see my babies?"},
    {"id": "nt-come-tell", "speaker": "narrator", "text": "Come and see my babies."},
    {"id": "nt-come-shout", "speaker": "narrator", "text": "Come and see my babies!"},
    {"id": "nt-was-pond-ask", "speaker": "narrator", "text": "I was at the pond?"},
    {"id": "nt-was-pond-tell", "speaker": "narrator", "text": "I was at the pond."},
    {"id": "nt-was-pond-shout", "speaker": "narrator", "text": "I was at the pond!"},
    {"id": "nt-like-one-ask", "speaker": "narrator", "text": "I like this one?"},
    {"id": "nt-like-one-tell", "speaker": "narrator", "text": "I like this one."},
    {"id": "nt-like-one-shout", "speaker": "narrator", "text": "I like this one!"},
    {"id": "nt-no-cake-ask", "speaker": "narrator", "text": "We have no cake?"},
    {"id": "nt-no-cake-tell", "speaker": "narrator", "text": "We have no cake."},
    {"id": "nt-no-cake-shout", "speaker": "narrator", "text": "We have no cake!"},
    {"id": "nt-bell-ask", "speaker": "narrator", "text": "Can we have a bell?"},
    {"id": "nt-bell-tell", "speaker": "narrator", "text": "Can we have a bell."},
    {"id": "nt-bell-shout", "speaker": "narrator", "text": "Can we have a bell!"},
    {"id": "nt-fun-day-ask", "speaker": "narrator", "text": "It will be a fun day?"},
    {"id": "nt-fun-day-tell", "speaker": "narrator", "text": "It will be a fun day."},
    {"id": "nt-fun-day-shout", "speaker": "narrator", "text": "It will be a fun day!"},
    {"id": "lumi-gift-swing", "speaker": "queen", "text": "Here is your swing!"},
    {"id": "lumi-gift-kite", "speaker": "queen", "text": "Here is your kite!"},
    {"id": "lumi-gift-boat", "speaker": "queen", "text": "Here is your boat!"},
    {"id": "lumi-gift-cake", "speaker": "queen", "text": "Here is your cake!"},
    {"id": "lumi-gift-bell", "speaker": "queen", "text": "Here is your bell!"},
    {"id": "lumi-wave", "speaker": "queen", "text": "Hello down there!"},
    {"id": "lumi-sparkle", "speaker": "queen", "text": "Thank you, Emma!"},

    {"id": "hb-open", "speaker": "narrator", "text": "Your Home Book!"},
    {"id": "hb-spell-own", "speaker": "narrator", "text": "You can spell this name on your own now!"},

    {"id": "sl-welcome", "speaker": "narrator", "text": "Welcome to the Sparkle Salon!"},
    {"id": "sl-card", "speaker": "narrator", "text": "A style card! Do the first line."},
    {"id": "sl-next", "speaker": "narrator", "text": "Now the next line."},
    {"id": "sl-beads", "speaker": "narrator", "text": "Finish the bead row."},
    {"id": "sl-photo", "speaker": "narrator", "text": "Smile! A photo for the album."},
    {"id": "sl-free", "speaker": "narrator", "text": "Now style your own babies!"},
    {"id": "name-cousin-dot", "speaker": "narrator", "text": "Dot!"},
    {"id": "name-cousin-fen", "speaker": "narrator", "text": "Fen!"},
    {"id": "name-cousin-bex", "speaker": "narrator", "text": "Bex!"},
    {"id": "sl-ph-big-red-bow", "speaker": "narrator", "text": "A big red bow."},
    {"id": "sl-ph-tiny-red-bow", "speaker": "narrator", "text": "A tiny red bow."},
    {"id": "sl-ph-big-pink-bow", "speaker": "narrator", "text": "A big pink bow."},
    {"id": "sl-ph-tiny-pink-bow", "speaker": "narrator", "text": "A tiny pink bow."},
    {"id": "sl-ph-big-blue-bow", "speaker": "narrator", "text": "A big blue bow."},
    {"id": "sl-ph-tiny-blue-bow", "speaker": "narrator", "text": "A tiny blue bow."},
    {"id": "sl-ph-big-green-clip", "speaker": "narrator", "text": "A big green clip."},
    {"id": "sl-ph-tiny-green-clip", "speaker": "narrator", "text": "A tiny green clip."},
    {"id": "sl-ph-big-pink-clip", "speaker": "narrator", "text": "A big pink clip."},
    {"id": "sl-ph-tiny-pink-clip", "speaker": "narrator", "text": "A tiny pink clip."},
    {"id": "sl-ph-big-red-star", "speaker": "narrator", "text": "A big red star."},
    {"id": "sl-ph-tiny-red-star", "speaker": "narrator", "text": "A tiny red star."},
    {"id": "sl-ph-big-blue-star", "speaker": "narrator", "text": "A big blue star."},
    {"id": "sl-ph-tiny-blue-star", "speaker": "narrator", "text": "A tiny blue star."},
    {"id": "sl-ph-big-green-star", "speaker": "narrator", "text": "A big green star."},
    {"id": "sl-ph-tiny-green-star", "speaker": "narrator", "text": "A tiny green star."},
    {"id": "sl-and-bow-clip", "speaker": "narrator", "text": "A bow and a clip."},
    {"id": "sl-and-star-bow", "speaker": "narrator", "text": "A star and a bow."},
    {"id": "sl-and-clip-star", "speaker": "narrator", "text": "A clip and a star."},
    {"id": "sl-and-bow-bell", "speaker": "narrator", "text": "A bow and a bell."},
    {"id": "sl-and-comb-bow", "speaker": "narrator", "text": "A comb and a bow."},
    {"id": "sl-and-star-shell", "speaker": "narrator", "text": "A star and a shell."},

    {"id": "ll-welcome", "speaker": "narrator", "text": "Welcome to Letter Lane!"},
    {"id": "ll-nobody", "speaker": "narrator", "text": "Nobody's name starts with that sound yet!"},
    {"id": "ll-flag-goal", "speaker": "narrator", "text": "Hang the flag on its arch."},
    {"id": "ll-gap-goal", "speaker": "narrator", "text": "One arch is missing. Put it back."},
    {"id": "word-letter-a", "speaker": "narrator", "text": "Ay."},
    {"id": "word-letter-b", "speaker": "narrator", "text": "Bee."},
    {"id": "word-letter-c", "speaker": "narrator", "text": "See."},
    {"id": "word-letter-d", "speaker": "narrator", "text": "Dee."},
    {"id": "word-letter-e", "speaker": "narrator", "text": "Ee."},
    {"id": "word-letter-f", "speaker": "narrator", "text": "Ef."},
    {"id": "word-letter-g", "speaker": "narrator", "text": "Jee."},
    {"id": "word-letter-h", "speaker": "narrator", "text": "Aitch."},
    {"id": "word-letter-i", "speaker": "narrator", "text": "Eye."},
    {"id": "word-letter-j", "speaker": "narrator", "text": "Jay."},
    {"id": "word-letter-k", "speaker": "narrator", "text": "Kay."},
    {"id": "word-letter-l", "speaker": "narrator", "text": "El."},
    {"id": "word-letter-m", "speaker": "narrator", "text": "Em."},
    {"id": "word-letter-n", "speaker": "narrator", "text": "En."},
    {"id": "word-letter-o", "speaker": "narrator", "text": "Oh."},
    {"id": "word-letter-p", "speaker": "narrator", "text": "Pee."},
    {"id": "word-letter-q", "speaker": "narrator", "text": "Cue."},
    {"id": "word-letter-r", "speaker": "narrator", "text": "Ar."},
    {"id": "word-letter-s", "speaker": "narrator", "text": "Ess."},
    {"id": "word-letter-t", "speaker": "narrator", "text": "Tee."},
    {"id": "word-letter-u", "speaker": "narrator", "text": "You."},
    {"id": "word-letter-v", "speaker": "narrator", "text": "Vee."},
    {"id": "word-letter-w", "speaker": "narrator", "text": "Double you."},
    {"id": "word-letter-x", "speaker": "narrator", "text": "Ex."},
    {"id": "word-letter-y", "speaker": "narrator", "text": "Why."},
    {"id": "word-letter-z", "speaker": "narrator", "text": "Zed."},

    {"id": "vm-this-is-valley", "speaker": "narrator", "text": "This is your valley."},
    {"id": "lumi-title-nest-keeper", "speaker": "queen", "text": "You are my Nest Keeper!"},
    {"id": "lumi-title-stable-keeper", "speaker": "queen", "text": "You are my Stable Keeper!"},
    {"id": "lumi-title-meadow-keeper", "speaker": "queen", "text": "You are my Meadow Keeper!"},
    {"id": "lumi-title-royal-nest-keeper", "speaker": "queen", "text": "You are my Royal Nest Keeper!"},
    {"id": "lumi-title-keeper-of-the-castle", "speaker": "queen", "text": "You are Keeper of the Castle!"},
    {"id": "lumi-title-princess", "speaker": "queen", "text": "You are Princess of the Moon Meadow!"},
    {"id": "ti-banner", "speaker": "narrator", "text": "A banner for your herd!"},
    {"id": "hp-party", "speaker": "narrator", "text": "One hundred unicorns! Party time!"},
    {"id": "hp-tens", "speaker": "narrator", "text": "Let's count the tens."},
    {"id": "ca-ribbon", "speaker": "narrator", "text": "Tie a ribbon, and that baby comes along!"},

    {"id": "y1-open", "speaker": "narrator", "text": "Some babies are asking for things!"},
    {"id": "y1-asking-goal", "speaker": "narrator", "text": "Give it to the baby who asks."},
    {"id": "y1-two-goal", "speaker": "narrator", "text": "Do what the wish says."},
    {"id": "y1-bow-tell", "speaker": "narrator", "text": "I have a bow."},
    {"id": "y1-bow-shout", "speaker": "narrator", "text": "What a big bow!"},
    {"id": "y1-bow-ask", "speaker": "narrator", "text": "Can I have a bow?"},
    {"id": "y1-hat-tell", "speaker": "narrator", "text": "I have a hat."},
    {"id": "y1-hat-shout", "speaker": "narrator", "text": "What a big hat!"},
    {"id": "y1-hat-ask", "speaker": "narrator", "text": "Can I have a hat?"},
    {"id": "y1-cake-tell", "speaker": "narrator", "text": "I have a cake."},
    {"id": "y1-cake-shout", "speaker": "narrator", "text": "What a big cake!"},
    {"id": "y1-cake-ask", "speaker": "narrator", "text": "Can I have a cake?"},
    {"id": "y1-kite-tell", "speaker": "narrator", "text": "I have a kite."},
    {"id": "y1-kite-shout", "speaker": "narrator", "text": "What a big kite!"},
    {"id": "y1-kite-ask", "speaker": "narrator", "text": "Can I have a kite?"},
    {"id": "y1-bell-tell", "speaker": "narrator", "text": "I have a bell."},
    {"id": "y1-bell-shout", "speaker": "narrator", "text": "What a big bell!"},
    {"id": "y1-bell-ask", "speaker": "narrator", "text": "Can I have a bell?"},
    {"id": "y1-cape-tell", "speaker": "narrator", "text": "I have a cape."},
    {"id": "y1-cape-shout", "speaker": "narrator", "text": "What a big cape!"},
    {"id": "y1-cape-ask", "speaker": "narrator", "text": "Can I have a cape?"},
    {"id": "y1-pack-basket", "speaker": "narrator", "text": "Pack the basket."},
    {"id": "y1-unpack-basket", "speaker": "narrator", "text": "Unpack the basket."},
    {"id": "y1-tie-bow", "speaker": "narrator", "text": "Tie the bow."},
    {"id": "y1-untie-bow", "speaker": "narrator", "text": "Untie the bow."},
    {"id": "y1-lock-gate", "speaker": "narrator", "text": "Lock the gate."},
    {"id": "y1-unlock-gate", "speaker": "narrator", "text": "Unlock the gate."},
    {"id": "y1-zip-bag", "speaker": "narrator", "text": "Zip the bag."},
    {"id": "y1-unzip-bag", "speaker": "narrator", "text": "Unzip the bag."},
    {"id": "y1-do-cape", "speaker": "narrator", "text": "Do up the cape."},
    {"id": "y1-undo-cape", "speaker": "narrator", "text": "Undo the cape."}
  ]
}
```

Notes for the audio workstream: generation order by priority is the game lines of Wave A first (ids up to `word-sign-stalls`), then the rest. Run from the repo root, outside the sandbox: `python3 scripts/generate-audio.py games/moon-meadow-home/public/audio/places/lines.json --dry-run` for the exact cost, then with `--max-chars <budget> --stt`. The whole file is 286 lines and about 5,600 credits, with the foal lines counted double.

- [ ] **Step 2: Write the line test**

`tests/places/lines.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const lines = (JSON.parse(readFileSync('public/audio/places/lines.json', 'utf8')) as { lines: { id: string; speaker: string; text: string }[] }).lines;
const ids = new Set(lines.map((l) => l.id));

function sources(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|svelte|json)$/.test(p) ? [p] : [];
  });
}

describe('place lines', () => {
  it('has unique kebab-case ids', () => {
    expect(ids.size).toBe(lines.length);
    for (const l of lines) expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('uses Elizabeth for every word, name, number and sound line', () => {
    for (const l of lines) if (/^(word|name|num|sound)-/.test(l.id)) expect(l.speaker).toBe('narrator');
  });

  it('writes numbers as words', () => {
    for (const l of lines) expect(l.text).not.toMatch(/\d/);
  });

  it('keeps Lumi to story lines and babies to tiny words', () => {
    for (const l of lines.filter((x) => x.speaker === 'foal')) expect(l.text.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(2);
    for (const l of lines.filter((x) => x.speaker === 'queen')) expect(l.id.startsWith('lumi-') || l.id === 'dc-welcome' || l.id === 'pb-lumi-gift').toBe(true);
  });

  it('has a line for every place line id the code and content use', () => {
    const used = new Set<string>();
    const prefixes = /['"`]((?:mw|lb|pl|pd|bd|nm|jw|nv|dc|pb|nt|hb|sl|ll|vm|ti|hp|ca|y1|lumi|foal)-[a-z0-9-]+|word-sign-[a-z]+|word-letter-[a-z]|name-cousin-[a-z]+)['"`]/g;
    const mine = ['moment.ts', 'ghost.ts', 'Moonbeam.svelte', 'GhostHand.svelte', 'ReplayButton.svelte', 'Bubble.svelte', 'Heap.svelte', 'Crown.svelte', 'JewelBox.svelte', 'MeadowArrow.svelte', 'places-svg.ts'].map((f) => `src/ui/${f}`).filter((f) => existsSync(f));
    for (const f of [...sources('src/core/places'), ...sources('src/scenes/places'), ...sources('src/places'), ...mine, ...sources('content/places')]) {
      for (const m of readFileSync(f, 'utf8').matchAll(prefixes)) used.add(m[1]);
    }
    const dynamic = /-$|-\$\{/;
    const missing = [...used].filter((id) => !dynamic.test(id) && !ids.has(id));
    expect(missing).toEqual([]);
  });
});
```

Template ids built at run time (`bd-needs-${n}`, `pb-has-${n}`, `nt-${id}-${kind}`, `jw-fact-${step}`) are covered by the explicit lists in the file and by the tests of the functions that build them.

- [ ] **Step 3: Run the test**

Run: `npx vitest run tests/places/lines.test.ts`
Expected: PASS.

- [ ] **Step 4: Hand the art list to the art workstream**

The scenes fall back to `places-svg.ts` for every id below that has no art in `public/art/manifest.json`. Priority follows the waves.

| Wave | Art ids (cut out on white unless a background) |
|---|---|
| A | backgrounds `bg-meadow`, `bg-bath-pond`, `bg-building-yard`; places `place-bath-pond`, `place-post-box`, `place-dressing`, `place-letter-lane`, `place-salon`; `shelf`, `plank`, `wheelbarrow`, `builder-hat`; word picture `mouse` (toy mouse) |
| B | backgrounds `bg-post-box`, `bg-dressing`; decorations `decor-fountain`, `decor-lantern-arch`, `decor-flower-bridge`, `decor-star-bench`, `decor-wishing-well`, `decor-rose-arbour`, `decor-moon-swing`, `decor-flower-cart`, `decor-crystal-rock`, `decor-kite-pole`, `decor-bubble-fountain`, `decor-heart-hedge`; wardrobe `dress-gold-crown`, `dress-silver-crown`, `dress-flower-crown`, `dress-star-crown`, `dress-pink-cape`, `dress-blue-cape`, `dress-purple-cape`, `dress-gold-cape`, `dress-daisy-garland`, `dress-rose-garland`, `dress-star-garland`; pins `pin-star` and the 30 set pins and 4 moment pins named in `pin-sets.json`; gifts `gift-swing`, `gift-kite`, `gift-boat`, `gift-cake`, `gift-bell`; rewards `reward-salon-flower-arch`, `reward-stable-star-lanterns`, `reward-meadow-moon-lamps`, `reward-crown-gem-trim`, `reward-pond-shell-path`, `reward-meadow-heart-garland`; novelty `nv-bubble-machine`, `nv-stall-lanterns`, `nv-flowerboxes`; `pin-pot`, `post-box-open`, `book-frame`, `place-row` |
| C | backgrounds `bg-salon`, `bg-valley`, `bg-letter-lane`; `herd-banner`, `party-flag`, salon tools `salon-brush`, `salon-mist`, `salon-mirror`, `salon-beads`; half-done objects `ts-basket`, `ts-bow`, `ts-gate`, `ts-bag`, `ts-cape` |

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/public/audio/places/lines.json games/moon-meadow-home/tests/places/lines.test.ts
git commit -m "Add every spoken line for the meadow places"
```

**Acceptance:** one lines file with every place line, unique ids, numbers as words, Elizabeth on every learning line, and a test that fails when code uses a line id that is not in the file.

### Task A17: Wave A flows and acceptance

**Files:**
- Create: `flows/places/lib.sh`, `flows/places/meadow.sh`, `flows/places/label.sh`, `flows/places/pond.sh`, `flows/places/building.sh`, `flows/places/parent.sh`, `flows/places/run.sh`

**Interfaces:**
- Consumes: the hook from Tasks A7, A10, A11, A13, A15 and core's hook (`seed`, `fast`, `mute`, `play`, `herd`, `newVisit`, `setStep`, `answer`, `wrong`, `idle`, `jump`, `errors`, `setScaffold`). This task adds two hook needs to "Contracts I need": `__game.setScaffold(strand, step, level)` and `__game.errors(): string[]` (console errors and uncaught errors captured in the test build).
- Produces: shell flows that exit non-zero on the first failure.

- [ ] **Step 1: Write the flow helpers**

`flows/places/lib.sh`:

```sh
#!/bin/sh
# Helpers for the place flows. Run from the repo root, outside the sandbox.
set -eu
BASE="${BASE:-${MMH_URL:-http://127.0.0.1:8773/games/moon-meadow-home/}}"
SHOTS="${TMPDIR:-/tmp}/flows"
mkdir -p "$SHOTS"

flow_open() { # session width height
  playwright-cli -s="$1" open "$BASE" >/dev/null
  playwright-cli -s="$1" resize "$2" "$3" >/dev/null
  flow_eval "$1" "() => { __game.seed(7); __game.fast(true); __game.mute(true); return true; }" >/dev/null
}

flow_eval() { # session js-function
  playwright-cli -s="$1" eval "$2"
}

flow_expect() { # session js-function-returning-boolean label
  out=$(playwright-cli -s="$1" eval "$2")
  case "$out" in
    *true*) echo "ok: $3" ;;
    *) echo "FAIL: $3 -> $out"; exit 1 ;;
  esac
}

flow_tap() { # session aria-label: mouse events, so pulsing elements work
  xy=$(playwright-cli -s="$1" eval "() => { const el = document.querySelector('[aria-label=\"$2\"]'); if (!el) return 'none'; const r = el.getBoundingClientRect(); return Math.round(r.x + r.width / 2) + ' ' + Math.round(r.y + r.height / 2); }" | grep -Eo '[0-9]+ [0-9]+' | head -1)
  if [ -z "$xy" ]; then echo "FAIL: no element labelled $2"; exit 1; fi
  set -- "$1" $xy
  playwright-cli -s="$1" mousemove "$2" "$3" >/dev/null
  playwright-cli -s="$1" mousedown >/dev/null
  playwright-cli -s="$1" mouseup >/dev/null
}

flow_wait() { # session js-function-returning-boolean label (polls up to 10 s)
  i=0
  while [ $i -lt 20 ]; do
    out=$(playwright-cli -s="$1" eval "$2")
    case "$out" in *true*) echo "ok: $3"; return 0 ;; esac
    i=$((i + 1))
    perl -e 'select(undef, undef, undef, 0.5)'
  done
  echo "FAIL: timed out waiting for $3"; exit 1
}

flow_shot() { # session name
  playwright-cli -s="$1" screenshot --filename="$SHOTS/$2.png" >/dev/null
  for f in page-*.png; do [ -e "$f" ] && mv "$f" "$SHOTS/"; done
  return 0
}

flow_clean() { # session: no missing clips, no errors
  flow_expect "$1" "() => window.EmmaAudio.missing.length === 0" "no missing clips"
  flow_expect "$1" "() => __game.errors().length === 0" "no console errors"
}

flow_close() { playwright-cli -s="$1" close >/dev/null || true; }
```

`perl -e 'select(...)'` sleeps half a second without the shell `sleep`, which is blocked in the agent shell.

- [ ] **Step 2: Write the Wave A flows**

`flows/places/meadow.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pm$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(6); __game.newVisit(); __game.play(); __game.herd(1); __game.jump('meadow'); return true; }"
flow_wait "$S" "() => __game.state().places.announced['bath-pond'] !== undefined" "visit 2 announces the Bath Pond"
flow_expect "$S" "() => __game.places.edges().includes('bath-pond:plot')" "pond plot at the meadow edge"
flow_expect "$S" "() => __game.places.opening() === null" "only one opening this visit"
flow_eval "$S" "() => { __game.newVisit(); __game.play(); __game.herd(1); __game.jump('meadow'); return true; }"
flow_wait "$S" "() => __game.state().places.announced['bubbles'] !== undefined" "visit 3 explains the bubbles"
flow_expect "$S" "() => __game.places.bubbles().length >= 1 && __game.places.bubbles().length <= 3" "one to three bubbles"
flow_shot "$S" "meadow-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/label.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pl$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(3); __game.setStep('s', 'S10'); return true; }"
for L in 1 2 3; do
  flow_eval "$S" "() => { __game.setScaffold('s', 'S10', $L); __game.places.goPlace('meadow'); return true; }"
  flow_wait "$S" "() => __game.places.bubbles().some((b) => b.kind === 'label')" "label bubble waits at level $L"
  flow_eval "$S" "() => { __game.places.tapBubble('label'); return true; }"
  flow_wait "$S" "() => __game.places.label.task() !== null" "label task at level $L"
  flow_eval "$S" "() => { const t = __game.places.label.task(); const wrong = t.plural ? null : (t.target.endsWith('s') ? 's' : 'es'); __game.places.label.build(t.own.map(() => ''), wrong); __game.places.label.slide(); return true; }"
  flow_expect "$S" "() => __game.places.label.last() === null" "a wrong ending is not a result yet"
  flow_eval "$S" "() => { __game.answer(); return true; }"
  flow_wait "$S" "() => __game.places.label.last() !== null" "label logged at level $L"
  flow_shot "$S" "label-L$L-$1x$2"
done
flow_eval "$S" "() => { __game.places.goPlace('toy-shelf'); return true; }"
flow_tap "$S" "jar mice"
flow_clean "$S"
flow_close "$S"
```

The wrong build in this flow uses empty own slots, which `checkLabel` reports as a `stem` mistake at levels 2 and 3 and an ending mistake at level 1; either way the moment records a miss, and `__game.answer()` then finishes it through the active moment.

`flows/places/pond.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pp$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(6); __game.newVisit(); __game.play(); __game.herd(1); return true; }"
flow_eval "$S" "async () => { __game.places.goPlace('meadow'); await new Promise((r) => setTimeout(r, 500)); __game.places.building.start('bath-pond'); await __game.places.building.auto(); return true; }"
flow_expect "$S" "() => __game.state().places.buildings['bath-pond']?.done === true" "Bath Pond built"
flow_eval "$S" "() => { __game.setStep('r', 'R19'); return true; }"
for L in 1 2 3; do
  flow_eval "$S" "() => { __game.setScaffold('r', 'R19', $L); __game.places.goPlace('bath-pond'); return true; }"
  flow_wait "$S" "() => __game.places.pond.wish() !== null" "bath wish at level $L"
  flow_expect "$S" "() => __game.places.pond.wish().options.length === [0, 3, 4, 6][$L]" "options at level $L"
  flow_eval "$S" "() => { const w = __game.places.pond.wish(); const wrong = w.options.find((o) => o.word === w.options.find((x) => x.id === w.answer).word && o.id !== w.answer); __game.places.pond.give(wrong.id); return true; }"
  flow_eval "$S" "() => { const w = __game.places.pond.wish(); __game.places.pond.give(w.answer); return true; }"
  flow_shot "$S" "pond-L$L-$1x$2"
done
flow_clean "$S"
flow_close "$S"
```

`flows/places/building.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pb$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(6); __game.newVisit(); __game.play(); __game.herd(1); __game.places.goPlace('meadow'); return true; }"
flow_wait "$S" "() => __game.state().places.announced['bath-pond'] !== undefined" "pond announced"
flow_eval "$S" "() => { __game.places.building.start('bath-pond'); return true; }"
flow_wait "$S" "() => __game.places.building.state().part === 'walls'" "walls first"
flow_eval "$S" "() => { const w = __game.places.building.state().wall; __game.places.building.drop(Math.max(1, w.answer - 1)); return true; }"
flow_shot "$S" "wall-gap-$1x$2"
flow_eval "$S" "() => { __game.places.building.drop(__game.places.building.state().wall.answer); return true; }"
flow_wait "$S" "() => __game.places.building.state().part === 'trim'" "trim after walls"
flow_eval "$S" "() => { __game.places.goPlace('meadow'); return true; }"
flow_expect "$S" "() => __game.state().places.buildings['bath-pond'].parts.includes('walls')" "walls kept after leaving"
flow_eval "$S" "async () => { __game.places.building.start('bath-pond'); await __game.places.building.auto(); return true; }"
flow_expect "$S" "() => __game.state().places.buildings['bath-pond'].done" "pond built"
flow_eval "$S" "() => { __game.newVisit(); __game.play(); __game.herd(4); __game.places.goPlace('meadow'); return true; }"
flow_wait "$S" "() => __game.places.bubbles().some((b) => b.kind === 'hammer')" "row 2 hammer bubble"
flow_eval "$S" "async () => { __game.places.tapBubble('hammer'); await __game.places.building.auto(); return true; }"
flow_expect "$S" "() => __game.state().places.buildings['row-2'].done && Object.keys(__game.state().places.rowNames).includes('2')" "row 2 built and named"
flow_clean "$S"
flow_close "$S"
```

The row comes in visit 3, because the hammer bubble needs the bubbles opening, which visit 3 announces. The herd is then 12 (six, one, the pond's circle baby and four), so row 2 is earned.

`flows/places/parent.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pc$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(2); return true; }"
flow_expect "$S" "() => __game.places.parent.open('1111') === false" "wrong PIN stays shut"
flow_expect "$S" "() => __game.places.parent.open('2468') === true" "PIN opens the parent corner"
flow_expect "$S" "() => typeof __game.places.parent.report().E4 === 'number'" "report renders"
flow_expect "$S" "async () => JSON.parse(await __game.places.parent.exportJson()).format === 'moon-meadow-save'" "export works"
flow_expect "$S" "async () => (await __game.places.parent.importJson(await __game.places.parent.exportJson())) === 0" "re-import adds nothing"
flow_shot "$S" "parent-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/run.sh`:

```sh
#!/bin/sh
# Usage: sh games/moon-meadow-home/flows/places/run.sh meadow label pond building parent
set -eu
DIR="$(dirname "$0")"
for flow in "$@"; do
  for size in "1180 820" "1080 810" "1024 768"; do
    sh "$DIR/$flow.sh" $size
  done
done
sh "$DIR/parent.sh" 820 1180
```

- [ ] **Step 3: Run the Wave A checks**

From `games/moon-meadow-home/`: `npm test && npm run check && npm run check:content && npm run build:test`
Expected: all pass.

With core's server serving `dist-test-places` on port 8773, from the repo root and outside the sandbox: `sh games/moon-meadow-home/flows/places/run.sh meadow label pond building parent`
Expected: every line `ok:`; screenshots in `$TMPDIR/flows/`. Look at each screenshot: one goal per screen, no clipped buttons at 1024 x 768, the turn picture in portrait for play scenes.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/flows/places/
git commit -m "Add the Wave A place flows"
```

**Acceptance (Wave A done):** all place unit tests pass; the five flows pass at 1180 x 820, 1080 x 810 and 1024 x 768, and the parent corner works at 820 x 1180; no missing clips and no console errors.

---

# Wave B: release 1.1 (items 14, 15, 17 and 18)

Starts after Wave A is complete and playable. Item 16 (golden, berry and snow eggs) and item 19 (`names:pull`) belong to the heartbeat and naming workstreams.

### Task B1: Jewel Box and plot order

**Files:**
- Create: `src/core/places/jewels.ts`, `content/places/jewels.json`, `content/places/decorations.json`
- Modify: `src/core/places/content.ts` (add `jewelOverrides`, `numberStones`, `decorationDefs`)
- Test: `tests/places/jewels.test.ts`

**Interfaces:**
- Consumes: `PlacesState` (A1); `StepView`, `LearnerView` (A1); `PlotDef`, `litStones` (A12); `released`.
- Produces:
  - `type JewelFace = { label: string; sound: string | null; clip: string | null; stones: [number, number] | null }`
  - `type Jewel = { step: StepId; strand: Strand; kind: 'letter' | 'number'; fresh: boolean; t: number; placedOn: string | null; face: JewelFace }`
  - `jewelFace(step: StepView): JewelFace`
  - `jewelBox(l: Pick<LearnerView, 'passed' | 'placed'>, s: PlacesState, steps: StepView[]): Jewel[]`
  - `waitingJewels(box: Jewel[]): Jewel[]`
  - `type DecorDef = { id: string; area: 'meadow' | 'stable-yard'; picture: string; pos: [number, number]; release: string }`
  - `type JewelPlot = { plot: string; kind: 'building' | 'decoration'; stones: number; lit: string[]; area: string }`
  - `jewelPlot(c: { s: PlacesState; release: string; reached: (step: StepId) => boolean; plots?: PlotDef[]; decorations?: DecorDef[] }): JewelPlot | null`
  - `villageStoneLit(s: PlacesState, plots?: PlotDef[]): boolean`

- [ ] **Step 1: Write the content files**

`content/places/jewels.json`:

```json
{
  "letter": {
    "R04D": { "label": "e", "sound": "e" }, "R06": { "label": "the", "clip": "word-the" }, "R11": { "label": "d t", "sound": "d" },
    "R12": { "label": "push", "clip": "word-push" }, "R17": { "label": "was", "clip": "word-was" }, "R18": { "label": "ing", "sound": "ng" },
    "R19": { "label": "s es", "sound": "s" }, "R20": { "label": "ee", "sound": "ee" }, "R21": { "label": "nest", "clip": "word-nest" },
    "R22": { "label": "frog", "clip": "word-frog" }, "R23": { "label": "twist", "clip": "word-twist" }, "R24": { "label": "ed", "sound": "d" },
    "R25": { "label": "said", "clip": "word-said" }, "R26": { "label": "rain", "clip": "word-rain" }, "R27": { "label": "big", "clip": "word-big" },
    "R28": { "label": "and", "clip": "word-and" }, "R29": { "label": "." }, "R30": { "label": "ay", "sound": "ai" },
    "R32": { "label": "ea", "sound": "ee" }, "R33": { "label": "?" }, "R34": { "label": "igh", "sound": "igh" },
    "R36": { "label": "ir", "sound": "ur" }, "R37": { "label": "un" }, "R38": { "label": "a-e", "sound": "ai" },
    "R39": { "label": "oa", "sound": "oa" }, "R41": { "label": "ew", "sound": "oo" },
    "S01": { "label": "s", "sound": "s" }, "S03D": { "label": "e", "sound": "e" }, "S06": { "label": "d t", "sound": "d" },
    "S08": { "label": "the", "clip": "word-the" }, "S10": { "label": "es", "sound": "s" }, "S11": { "label": "A", "sound": "a" },
    "S16": { "label": "ing", "sound": "ng" }, "S17": { "label": "was", "clip": "word-was" }, "S18": { "label": "we", "clip": "word-we" },
    "S19": { "label": "Aa", "clip": "word-letter-a" }, "S20": { "label": "ay", "sound": "ai" }, "S21": { "label": "." },
    "S22": { "label": "ea", "sound": "ee" }, "S23": { "label": "?" }, "S24": { "label": "igh", "sound": "igh" },
    "S26": { "label": "ir", "sound": "ur" }, "S27": { "label": "un" }, "S28": { "label": "a-e", "sound": "ai" },
    "S29": { "label": "oa", "sound": "oa" }, "S30": { "label": "ew", "sound": "oo" }
  },
  "number": {
    "M01": [1, 2], "M02": [4, 4], "M03": [2, 5], "M04": [5, 1], "M05": [2, 3], "M07": [10, 5], "M08": [3, 3],
    "M09": [6, 4], "M10": [7, 3], "M11": [8, 2], "M12": [4, 3], "M13": [5, 4], "M14": [9, 5]
  }
}
```

`content/places/decorations.json`:

```json
{
  "decorations": [
    { "id": "decor-fountain", "area": "meadow", "picture": "decor-fountain", "pos": [880, 560], "release": "1.1" },
    { "id": "decor-lantern-arch", "area": "stable-yard", "picture": "decor-lantern-arch", "pos": [330, 240], "release": "1.1" },
    { "id": "decor-flower-bridge", "area": "meadow", "picture": "decor-flower-bridge", "pos": [600, 740], "release": "1.1" },
    { "id": "decor-star-bench", "area": "meadow", "picture": "decor-star-bench", "pos": [760, 720], "release": "1.1" },
    { "id": "decor-wishing-well", "area": "meadow", "picture": "decor-wishing-well", "pos": [240, 520], "release": "1.1" },
    { "id": "decor-rose-arbour", "area": "meadow", "picture": "decor-rose-arbour", "pos": [700, 300], "release": "1.1" },
    { "id": "decor-moon-swing", "area": "meadow", "picture": "decor-moon-swing", "pos": [930, 420], "release": "1.1" },
    { "id": "decor-flower-cart", "area": "meadow", "picture": "decor-flower-cart", "pos": [420, 700], "release": "1.1" },
    { "id": "decor-crystal-rock", "area": "meadow", "picture": "decor-crystal-rock", "pos": [520, 300], "release": "1.1" },
    { "id": "decor-kite-pole", "area": "meadow", "picture": "decor-kite-pole", "pos": [820, 180], "release": "1.1" },
    { "id": "decor-bubble-fountain", "area": "meadow", "picture": "decor-bubble-fountain", "pos": [380, 560], "release": "1.1" },
    { "id": "decor-heart-hedge", "area": "stable-yard", "picture": "decor-heart-hedge", "pos": [650, 620], "release": "1.1" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import jewelsJson from '../../../content/places/jewels.json' with { type: 'json' };
import decorJson from '../../../content/places/decorations.json' with { type: 'json' };
import type { DecorDef, JewelFace } from './jewels.ts';
export const jewelOverrides: Record<string, Partial<JewelFace>> = jewelsJson.letter;
export const numberStones = jewelsJson.number as unknown as Record<string, [number, number]>;
export const decorationDefs: DecorDef[] = decorJson.decorations as DecorDef[];
```

- [ ] **Step 2: Write the failing test**

`tests/places/jewels.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { jewelBox, jewelFace, jewelPlot, villageStoneLit, waitingJewels } from '../../src/core/places/jewels.ts';
import type { PlotDef } from '../../src/core/places/building.ts';
import type { StepView } from '../../src/core/places/types.ts';
import { decorationDefs } from '../../src/core/places/content.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const step = (id: string, items: string[]): StepView => ({ id, strand: id[0].toLowerCase() as 'r' | 's' | 'm', items, places: [], levels: 3 });
const steps = [step('R13', ['ai', 'ee', 'igh']), step('R19', ['-s', '-es', 'none']), step('S09', ['ai', 'ee']), step('S20', ['ai', 'ay', 'a-e']), step('M10', ['7+3']), step('M99', ['1+1'])];
const none = () => false;

describe('jewel faces', () => {
  it('shows the first grapheme of a letter step and plays its sound', () => {
    expect(jewelFace(steps[0])).toEqual({ label: 'ai', sound: 'ai', clip: null, stones: null });
  });
  it('uses the override for steps whose items are not graphemes', () => {
    expect(jewelFace(steps[1])).toEqual({ label: 's es', sound: 's', clip: null, stones: null });
    expect(jewelFace(steps[3])).toEqual({ label: 'ay', sound: 'ai', clip: null, stones: null });
  });
  it('shows two stones and says the fact for a number step', () => {
    expect(jewelFace(steps[4])).toEqual({ label: '7 and 3', sound: null, clip: 'jw-fact-m10', stones: [7, 3] });
    expect(jewelFace(steps[5])).toEqual({ label: 'M99', sound: null, clip: null, stones: null });
  });
  it('has stones for every first-playable maths step', () => {
    for (const id of ['M01', 'M02', 'M03', 'M04', 'M05', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14']) expect(jewelFace(step(id, [])).stones).not.toBeNull();
  });
});

describe('jewel box', () => {
  it('holds old jewels for placed steps and fresh jewels for passed steps', () => {
    const s = foldAll([ev('jewel.placed', { jewel: 'S20', plot: 'salon' })]);
    const box = jewelBox({ placed: [{ step: 'S09', strand: 's' }], passed: [{ step: 'S20', strand: 's', t: 5, visit: 'v2' }, { step: 'M10', strand: 'm', t: 9, visit: 'v3' }] }, s, steps);
    expect(box.map((j) => [j.step, j.kind, j.fresh, j.placedOn])).toEqual([['S09', 'letter', false, null], ['S20', 'letter', true, 'salon'], ['M10', 'number', true, null]]);
    expect(waitingJewels(box).map((j) => j.step)).toEqual(['M10']);
  });
});

describe('the plot that takes the next jewel', () => {
  it('is the Salon first once it is released', () => {
    expect(jewelPlot({ s: foldAll([]), release: '1.3', reached: none })).toEqual({ plot: 'salon', kind: 'building', stones: 3, lit: [], area: 'village-lane' });
  });
  it('is a decoration plot while no building plot is released', () => {
    expect(jewelPlot({ s: foldAll([]), release: '1.1', reached: none })).toMatchObject({ plot: 'decor-fountain', kind: 'decoration', stones: 1 });
  });
  it('moves to a decoration while the Salon waits for its Building Day, and after it is built', () => {
    const lit = foldAll(['S20', 'R30', 'M10'].map((j) => ev('jewel.placed', { jewel: j, plot: 'salon' })));
    expect(jewelPlot({ s: lit, release: '1.3', reached: none })?.plot).toBe('decor-fountain');
    const built = foldAll([...['S20', 'R30', 'M10'].map((j) => ev('jewel.placed', { jewel: j, plot: 'salon' })), ev('building.done', { plot: 'salon' }), ev('building.done', { plot: 'decor-fountain' })]);
    expect(jewelPlot({ s: built, release: '1.3', reached: none })?.plot).toBe('decor-lantern-arch');
  });
  it('skips a key plot until its key step is reached', () => {
    const plots: PlotDef[] = [
      { id: 'keyed', area: 'meadow', kind: 'jewel', stones: 1, key: 'R28', release: '1.0', picture: 'p', map: [0, 0] },
      { id: 'open', area: 'meadow', kind: 'jewel', stones: 1, release: '1.0', picture: 'p', map: [0, 0] },
    ];
    expect(jewelPlot({ s: foldAll([]), release: '1.3', reached: none, plots })?.plot).toBe('open');
    expect(jewelPlot({ s: foldAll([]), release: '1.3', reached: (st) => st === 'R28', plots })?.plot).toBe('keyed');
  });
  it('has at least twelve decoration plots, and returns null when every plot is used', () => {
    expect(decorationDefs.length).toBeGreaterThanOrEqual(12);
    expect(jewelPlot({ s: foldAll([]), release: '1.3', reached: none, plots: [], decorations: [] })).toBeNull();
  });
  it('knows when a Village Lane plot has its first lit stone', () => {
    expect(villageStoneLit(foldAll([]))).toBe(false);
    expect(villageStoneLit(foldAll([ev('jewel.placed', { jewel: 'S20', plot: 'salon' })]))).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/jewels.test.ts`
Expected: FAIL, cannot resolve `jewels.ts`.

- [ ] **Step 4: Write `jewels.ts`**

```ts
import type { LearnerView, StepId, StepView, Strand } from './types.ts';
import type { PlacesState } from './state.ts';
import type { PlotDef } from './building.ts';
import { litStones } from './building.ts';
import { decorationDefs, jewelOverrides, numberStones, plotDefs, released } from './content.ts';

export type JewelFace = { label: string; sound: string | null; clip: string | null; stones: [number, number] | null };
export type Jewel = { step: StepId; strand: Strand; kind: 'letter' | 'number'; fresh: boolean; t: number; placedOn: string | null; face: JewelFace };
export type DecorDef = { id: string; area: 'meadow' | 'stable-yard'; picture: string; pos: [number, number]; release: string };
export type JewelPlot = { plot: string; kind: 'building' | 'decoration'; stones: number; lit: string[]; area: string };

const GRAPHEME = /^[a-z]+(-[a-z])?$/;

export function jewelFace(step: StepView): JewelFace {
  if (step.strand === 'm') {
    const st = numberStones[step.id];
    return st ? { label: `${st[0]} and ${st[1]}`, sound: null, clip: `jw-fact-${step.id.toLowerCase()}`, stones: st } : { label: step.id, sound: null, clip: null, stones: null };
  }
  const first = step.items[0] ?? step.id;
  const base: JewelFace = { label: first, sound: GRAPHEME.test(first) ? first : null, clip: null, stones: null };
  const o = jewelOverrides[step.id];
  return o ? { ...base, sound: null, ...o } : base;
}

export function jewelBox(l: Pick<LearnerView, 'passed' | 'placed'>, s: PlacesState, steps: StepView[]): Jewel[] {
  const byId = new Map(steps.map((st) => [st.id, st]));
  const view = (id: StepId, strand: Strand): StepView => byId.get(id) ?? { id, strand, items: [], places: [], levels: 1 };
  const kind = (strand: Strand) => (strand === 'm' ? 'number' : 'letter') as 'letter' | 'number';
  const old = l.placed.map((p) => ({ step: p.step, strand: p.strand, kind: kind(p.strand), fresh: false, t: 0, placedOn: null, face: jewelFace(view(p.step, p.strand)) }));
  const fresh = [...l.passed].sort((a, b) => a.t - b.t).map((p) => ({ step: p.step, strand: p.strand, kind: kind(p.strand), fresh: true, t: p.t, placedOn: s.jewels[p.step] ?? null, face: jewelFace(view(p.step, p.strand)) }));
  return [...old, ...fresh];
}

export function waitingJewels(box: Jewel[]): Jewel[] {
  return box.filter((j) => j.fresh && !j.placedOn);
}

export function jewelPlot(c: { s: PlacesState; release: string; reached: (step: StepId) => boolean; plots?: PlotDef[]; decorations?: DecorDef[] }): JewelPlot | null {
  const { s } = c;
  for (const p of c.plots ?? plotDefs) {
    if (p.kind !== 'jewel' || !released(p.release, c.release) || s.buildings[p.id]?.done) continue;
    if (p.key && !c.reached(p.key)) continue;
    const lit = litStones(s, p.id);
    if (lit.length < (p.stones ?? 0)) return { plot: p.id, kind: 'building', stones: p.stones ?? 0, lit, area: p.area };
  }
  for (const d of c.decorations ?? decorationDefs) {
    if (!released(d.release, c.release) || s.buildings[d.id]?.done) continue;
    return { plot: d.id, kind: 'decoration', stones: 1, lit: litStones(s, d.id), area: d.area };
  }
  return null;
}

export function villageStoneLit(s: PlacesState, plots: PlotDef[] = plotDefs): boolean {
  const village = new Set(plots.filter((p) => p.area === 'village-lane').map((p) => p.id));
  return Object.values(s.jewels).some((plot) => village.has(plot));
}
```

`jewelFace` for an overridden step sets `sound: null` before spreading the override, so an override without `sound` (for example `{ label: 'the', clip: 'word-the' }`) plays the clip only.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/jewels.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/jewels.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/jewels.json games/moon-meadow-home/content/places/decorations.json games/moon-meadow-home/tests/places/jewels.test.ts
git commit -m "Add the Jewel Box, jewel faces and the plot order with decoration plots"
```

**Acceptance:** a passed step gives a fresh jewel with a face that plays its sound or fact, a placed step an old jewel; there is always a plot for a fresh jewel while decorations remain, and key and unreleased plots are skipped.

### Task B2: Pins, sashes and pin sets

**Files:**
- Create: `src/core/places/pins.ts`, `content/places/pin-sets.json`
- Modify: `src/core/places/content.ts` (add `pinSetDefs`, `momentPinDefs`)
- Test: `tests/places/pins.test.ts`

**Interfaces:**
- Consumes: `PlacesState`, `PinOnBaby` (A1); `released`.
- Produces:
  - `type PinSetDef = { id: string; release: string; pins: string[]; reward: string; novelty?: string }`
  - `type MomentPinDef = { id: string; pin: string }`
  - `sashOf(s: PlacesState, baby: string): { sash: PinOnBaby[]; pouch: PinOnBaby[] }` (first ten in fold order on the sash, two rows of five)
  - `sashCount(s: PlacesState, baby: string): number`
  - `setsAvailable(s: PlacesState, release: string, sets?: PinSetDef[]): PinSetDef[]`
  - `setProgress(s: PlacesState, release: string, sets?: PinSetDef[]): { set: string; have: string[]; missing: string[]; full: boolean; reward: string }[]`
  - `fullSetRewards(s: PlacesState, release: string, sets?: PinSetDef[]): string[]`
  - `nextSetPins(s: PlacesState, n: number, release: string, sets?: PinSetDef[]): string[]` (missing pins in set order; `pin-star` when every set is full)
  - `type MomentPin = { key: string; pin: string; baby: string }`
  - `momentPinsDue(s: PlacesState): MomentPin[]` (decision D17; the store emits each once as `pin.given` with `source: 'moment'` and the key)

- [ ] **Step 1: Write the content file**

`content/places/pin-sets.json`:

```json
{
  "sets": [
    { "id": "flowers", "release": "1.1", "pins": ["pin-rose", "pin-daisy", "pin-tulip", "pin-bluebell", "pin-sunflower"], "reward": "reward-salon-flower-arch" },
    { "id": "stars", "release": "1.1", "pins": ["pin-gold-star", "pin-silver-star", "pin-shooting-star", "pin-twin-stars", "pin-star-heart"], "reward": "reward-stable-star-lanterns" },
    { "id": "moons", "release": "1.1", "pins": ["pin-crescent", "pin-full-moon", "pin-moon-smile", "pin-moon-cloud", "pin-moon-crown"], "reward": "reward-meadow-moon-lamps" },
    { "id": "gems", "release": "1.1", "pins": ["pin-ruby", "pin-sapphire", "pin-emerald", "pin-pearl", "pin-amethyst"], "reward": "reward-crown-gem-trim" },
    { "id": "shells", "release": "1.1", "novelty": "pinset-shells", "pins": ["pin-scallop", "pin-conch", "pin-spiral-shell", "pin-pearl-shell", "pin-star-shell"], "reward": "reward-pond-shell-path" },
    { "id": "hearts", "release": "1.1", "novelty": "pinset-hearts", "pins": ["pin-pink-heart", "pin-gold-heart", "pin-heart-wings", "pin-heart-star", "pin-rainbow-heart"], "reward": "reward-meadow-heart-garland" }
  ],
  "moments": [
    { "id": "moment:first-bath", "pin": "pin-duck" },
    { "id": "moment:tenth-baby", "pin": "pin-ten" },
    { "id": "moment:first-building", "pin": "pin-hammer" },
    { "id": "moment:moving-day", "pin": "pin-bridge" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import pinsJson from '../../../content/places/pin-sets.json' with { type: 'json' };
import type { MomentPinDef, PinSetDef } from './pins.ts';
export const pinSetDefs: PinSetDef[] = pinsJson.sets as PinSetDef[];
export const momentPinDefs: MomentPinDef[] = pinsJson.moments;
```

- [ ] **Step 2: Write the failing test**

`tests/places/pins.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { fullSetRewards, momentPinsDue, nextSetPins, sashCount, sashOf, setProgress, setsAvailable } from '../../src/core/places/pins.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const pot = (baby: string, n: number) => Array.from({ length: n }, () => ev('pin.given', { baby, pin: 'star', source: 'pot' }));
const give = (baby: string, pin: string) => ev('pin.given', { baby, pin, source: 'post' });

describe('sashes', () => {
  it('wears ten pins and keeps the rest in the pouch', () => {
    const s = foldAll([...pot('a', 9), give('a', 'pin-rose'), give('a', 'pin-daisy')]);
    expect(sashOf(s, 'a').sash).toHaveLength(10);
    expect(sashOf(s, 'a').pouch.map((p) => p.pin)).toEqual(['pin-daisy']);
    expect(sashCount(s, 'a')).toBe(10);
    expect(sashCount(s, 'nobody')).toBe(0);
  });

  it('never loses a pin when two devices both filled a sash', () => {
    const s = foldAll([...pot('a', 10), ...pot('a', 4)]);
    expect(sashOf(s, 'a').sash.length + sashOf(s, 'a').pouch.length).toBe(14);
  });
});

describe('pin sets', () => {
  it('offers the novelty sets only once unlocked', () => {
    expect(setsAvailable(foldAll([]), '1.3').map((x) => x.id)).toEqual(['flowers', 'stars', 'moons', 'gems']);
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'novelty:pinset-shells' })]);
    expect(setsAvailable(s, '1.3').map((x) => x.id)).toContain('shells');
  });

  it('counts a set full when every pin was given to any baby', () => {
    const flowers = ['pin-rose', 'pin-daisy', 'pin-tulip', 'pin-bluebell', 'pin-sunflower'];
    const s = foldAll(flowers.map((p, i) => give(`b${i}`, p)));
    expect(setProgress(s, '1.3')[0]).toEqual({ set: 'flowers', have: flowers, missing: [], full: true, reward: 'reward-salon-flower-arch' });
    expect(fullSetRewards(s, '1.3')).toEqual(['reward-salon-flower-arch']);
  });

  it('sends the missing pins in set order, then plain stars', () => {
    expect(nextSetPins(foldAll([give('a', 'pin-rose')]), 3, '1.3')).toEqual(['pin-daisy', 'pin-tulip', 'pin-bluebell']);
    const all = ['flowers', 'stars', 'moons', 'gems'].flatMap((id) => setProgress(foldAll([]), '1.3').find((x) => x.set === id)!.missing);
    expect(nextSetPins(foldAll(all.map((p) => give('a', p))), 2, '1.3')).toEqual(['pin-star', 'pin-star']);
  });
});

describe('moment pins (decision D17)', () => {
  const hatch = (n: number) => Array.from({ length: n }, (_, i) => ev('egg.hatched', { baby: `b${i}`, source: 'nest' }));
  it('gives first bath, tenth baby, first Building Day and Moving Day pins once', () => {
    const s = foldAll([
      ev('import.v2', { hash: 'h', babies: ['f1', 'f2'], nights: 3 }),
      ...hatch(8),
      ev('care.done', { baby: 'b3', care: 'bath' }),
      ev('egg.hatched', { baby: 'c1', source: 'building' }),
      ev('building.done', { plot: 'bath-pond' }),
    ]);
    expect(momentPinsDue(s)).toEqual([
      { key: 'moment:first-bath', pin: 'pin-duck', baby: 'b3' },
      { key: 'moment:tenth-baby', pin: 'pin-ten', baby: 'b7' },
      { key: 'moment:first-building', pin: 'pin-hammer', baby: 'c1' },
      { key: 'moment:moving-day', pin: 'pin-bridge', baby: 'f1' },
    ]);
  });

  it('gives nothing twice and nothing early', () => {
    expect(momentPinsDue(foldAll(hatch(3)))).toEqual([]);
    const s = foldAll([ev('care.done', { baby: 'a', care: 'bath' }), ev('pin.given', { baby: 'a', pin: 'pin-duck', source: 'moment', key: 'moment:first-bath' })]);
    expect(momentPinsDue(s)).toEqual([]);
  });

  it('gives the first Building Day pin to the newest baby when no circle hatched', () => {
    const s = foldAll([...hatch(3), ev('building.done', { plot: 'row-6' })]);
    expect(momentPinsDue(s)).toEqual([{ key: 'moment:first-building', pin: 'pin-hammer', baby: 'b2' }]);
  });

  it('does not count a decoration plot as a Building Day', () => {
    expect(momentPinsDue(foldAll([...hatch(2), ev('building.done', { plot: 'decor-fountain' })]))).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/pins.test.ts`
Expected: FAIL, cannot resolve `pins.ts`.

- [ ] **Step 4: Write `pins.ts`**

```ts
import type { PinOnBaby, PlacesState } from './state.ts';
import { momentPinDefs, pinSetDefs, released } from './content.ts';

export type PinSetDef = { id: string; release: string; pins: string[]; reward: string; novelty?: string };
export type MomentPinDef = { id: string; pin: string };
export type MomentPin = { key: string; pin: string; baby: string };

export function sashOf(s: PlacesState, baby: string): { sash: PinOnBaby[]; pouch: PinOnBaby[] } {
  const all = s.pins[baby] ?? [];
  return { sash: all.slice(0, 10), pouch: all.slice(10) };
}

export const sashCount = (s: PlacesState, baby: string): number => Math.min(10, (s.pins[baby] ?? []).length);

export function setsAvailable(s: PlacesState, release: string, sets: PinSetDef[] = pinSetDefs): PinSetDef[] {
  return sets.filter((x) => released(x.release, release) && (!x.novelty || s.unlocked.includes(x.novelty)));
}

function given(s: PlacesState): Set<string> {
  return new Set(Object.values(s.pins).flatMap((list) => list.map((p) => p.pin)));
}

export function setProgress(s: PlacesState, release: string, sets: PinSetDef[] = pinSetDefs) {
  const have = given(s);
  return setsAvailable(s, release, sets).map((x) => ({
    set: x.id, have: x.pins.filter((p) => have.has(p)), missing: x.pins.filter((p) => !have.has(p)),
    full: x.pins.every((p) => have.has(p)), reward: x.reward,
  }));
}

export function fullSetRewards(s: PlacesState, release: string, sets: PinSetDef[] = pinSetDefs): string[] {
  return setProgress(s, release, sets).filter((x) => x.full).map((x) => x.reward);
}

export function nextSetPins(s: PlacesState, n: number, release: string, sets: PinSetDef[] = pinSetDefs): string[] {
  const missing = setProgress(s, release, sets).flatMap((x) => x.missing);
  return Array.from({ length: n }, (_, i) => missing[i] ?? 'pin-star');
}

export function momentPinsDue(s: PlacesState): MomentPin[] {
  const pin = (id: string) => momentPinDefs.find((m) => m.id === id)!.pin;
  const out: MomentPin[] = [];
  const add = (key: string, baby: string | undefined | null) => { if (baby && !s.pinKeys[key]) out.push({ key, pin: pin(key), baby }); };
  add('moment:first-bath', s.firstBath);
  add('moment:tenth-baby', s.hatchOrder[9]);
  const building = Object.entries(s.buildings).some(([plot, b]) => b.done && !plot.startsWith('decor-'));
  if (building) add('moment:first-building', s.circleBabies[0] ?? s.hatchOrder[s.hatchOrder.length - 1]);
  if (s.importRows > 0) add('moment:moving-day', s.hatchOrder[0]);
  return out;
}
```

In the first moment test the tenth baby is `b7`: the herd order is `f1`, `f2`, then `b0` to `b7`, so the tenth is `b7`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/pins.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/pins.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/pin-sets.json games/moon-meadow-home/tests/places/pins.test.ts
git commit -m "Add sashes of ten, pin pouches, pin sets with rewards and moment pins"
```

**Acceptance:** a sash wears ten pins and the rest go to the pouch, no pin is lost after a merge, sets fill across the herd and show their reward, moment pins are due once.

### Task B3: Novelty floor

**Files:**
- Create: `src/core/places/novelty.ts`, `content/places/novelty.json`
- Modify: `src/core/places/content.ts` (add `noveltyDefs`)
- Test: `tests/places/novelty.test.ts`

**Interfaces:**
- Consumes: `VisitRec`, `PlacesState` (A1); `released`.
- Produces:
  - `type NoveltyDef = { id: string; kind: 'pin-set' | 'stall-decor' | 'egg-skin' | 'cousin' | 'meadow-toy'; release: string; line: string; requires?: string }`
  - `noveltyDue(visits: VisitRec[]): boolean`
  - `nextNovelty(s: PlacesState, release: string, defs?: NoveltyDef[]): NoveltyDef | null`

- [ ] **Step 1: Write the content file**

`content/places/novelty.json`:

```json
{
  "reserve": [
    { "id": "stall-lanterns", "kind": "stall-decor", "release": "1.1", "line": "nv-stall-lanterns" },
    { "id": "pinset-shells", "kind": "pin-set", "release": "1.1", "line": "nv-pins", "requires": "post-box" },
    { "id": "egg-skin-snowflake", "kind": "egg-skin", "release": "1.1", "line": "nv-egg-skin" },
    { "id": "cousin-bex", "kind": "cousin", "release": "1.2", "line": "nv-cousin", "requires": "salon" },
    { "id": "bubble-machine", "kind": "meadow-toy", "release": "1.1", "line": "nv-bubbles" },
    { "id": "stall-flowerboxes", "kind": "stall-decor", "release": "1.1", "line": "nv-flowerboxes" },
    { "id": "pinset-hearts", "kind": "pin-set", "release": "1.1", "line": "nv-pins", "requires": "post-box" },
    { "id": "egg-skin-blossom", "kind": "egg-skin", "release": "1.1", "line": "nv-egg-skin" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import noveltyJson from '../../../content/places/novelty.json' with { type: 'json' };
import type { NoveltyDef } from './novelty.ts';
export const noveltyDefs: NoveltyDef[] = noveltyJson.reserve as NoveltyDef[];
```

- [ ] **Step 2: Write the failing test**

`tests/places/novelty.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { nextNovelty, noveltyDue } from '../../src/core/places/novelty.ts';
import { noveltyDefs } from '../../src/core/places/content.ts';
import type { VisitRec } from '../../src/core/places/state.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const v = (index: number, newThing: boolean): VisitRec => ({ id: `v${index}`, index, start: 0, tz: 0, newThing, announced: [], post: false, cousins: [], notes: 0, hatches: 0 });

describe('novelty floor', () => {
  it('is due after five visits with nothing new, in a visit with nothing new yet', () => {
    expect(noveltyDue([1, 2, 3, 4, 5].map((i) => v(i, false)).concat(v(6, false)))).toBe(true);
    expect(noveltyDue([1, 2, 3, 4, 5].map((i) => v(i, i === 3)).concat(v(6, false)))).toBe(false);
    expect(noveltyDue([1, 2, 3, 4, 5].map((i) => v(i, false)).concat(v(6, true)))).toBe(false);
    expect(noveltyDue([1, 2, 3, 4].map((i) => v(i, false)).concat(v(5, false)))).toBe(false);
  });

  it('holds at least eight reserve items', () => {
    expect(noveltyDefs.length).toBeGreaterThanOrEqual(8);
  });

  it('brings the next unused item whose place exists', () => {
    expect(nextNovelty(foldAll([]), '1.3')?.id).toBe('stall-lanterns');
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'novelty:stall-lanterns' })]);
    expect(nextNovelty(s, '1.3')?.id).toBe('egg-skin-snowflake');
    const post = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'novelty:stall-lanterns' }), ev('building.done', { plot: 'post-box' })]);
    expect(nextNovelty(post, '1.3')?.id).toBe('pinset-shells');
  });

  it('returns null when the reserve is used up', () => {
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ...noveltyDefs.map((d) => ev('opening.announced', { opening: `novelty:${d.id}` }))]);
    expect(nextNovelty(s, '1.3')).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/novelty.test.ts`
Expected: FAIL, cannot resolve `novelty.ts`.

- [ ] **Step 4: Write `novelty.ts`**

```ts
import type { PlacesState, VisitRec } from './state.ts';
import { noveltyDefs, released } from './content.ts';

export type NoveltyDef = { id: string; kind: 'pin-set' | 'stall-decor' | 'egg-skin' | 'cousin' | 'meadow-toy'; release: string; line: string; requires?: string };

export function noveltyDue(visits: VisitRec[]): boolean {
  if (visits.length < 6) return false;
  const current = visits[visits.length - 1];
  const before = visits.slice(-6, -1);
  return !current.newThing && before.every((v) => !v.newThing);
}

export function nextNovelty(s: PlacesState, release: string, defs: NoveltyDef[] = noveltyDefs): NoveltyDef | null {
  return defs.find((d) => !s.unlocked.includes(d.id) && released(d.release, release) && (!d.requires || Boolean(s.buildings[d.requires]?.done))) ?? null;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/novelty.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/novelty.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/novelty.json games/moon-meadow-home/tests/places/novelty.test.ts
git commit -m "Add the novelty floor with a reserve of eight surprises"
```

**Acceptance:** after five visits with nothing new, the next visit brings one reserve item whose place exists; the reserve holds eight items.

### Task B4: Jewels, plots, decorations and surprises in the meadow

**Files:**
- Create: `src/ui/JewelBox.svelte`, `src/scenes/places/PlotMarker.svelte`
- Modify: `src/core/places/meadow.ts` (add `meadowDecor`, `GIFT_SPOTS`, `EXTRA_SPOTS`), `src/scenes/places/Meadow.svelte`, `src/ui/Crown.svelte`, `src/places/hook.ts` (add `jewels`, `openings`)
- Test: `tests/places/meadow.test.ts` (extend)

**Interfaces:**
- Consumes: `jewelBox`, `waitingJewels`, `jewelPlot`, `villageStoneLit`, `JewelPlot` (B1); `fullSetRewards` (B2); `noveltyDue`, `nextNovelty` (B3); `openingDue`, `openingCtx` (A6); `readyPlots`, `litStones` (A12); content `ladder(strand)`, `decorationDefs`; audio `sound`, `say`.
- Produces:
  - `meadowDecor(c: { s: PlacesState; decorations: DecorDef[]; rewards: string[] }): { id: string; picture: string; x: number; y: number }[]`
  - `GIFT_SPOTS: Record<string, [number, number]>`, `EXTRA_SPOTS: Record<string, [number, number]>`
  - `<JewelBox jewels={Jewel[]} open={boolean} ondragjewel={(step: string, x: number, y: number) => void} />`: a small chest beside the crown (`aria-label="jewel box"`); a tap opens a tray of jewels (each `aria-label="jewel <step>"`); a tap on a letter jewel plays `sound(face.sound)` or `say(face.clip)`; a tap on a number jewel shows its two stones and plays `face.clip`; fresh unplaced jewels glow and can be dragged.
  - `<PlotMarker plot={JewelPlot} x y ready={boolean} picture={string} />`: the plot's picture sign, its stones (lit stones show the jewel face) and a hammer when ready; `aria-label="plot <id>"`.
  - Hook `jewels`: `{ box(): { step: string; fresh: boolean; placedOn: string | null }[]; plot(): JewelPlot | null; drag(step: string): void }`; hook `openings`: `{ due(): string | null; announced(): string[]; novelty(): string | null; force(id: string): void }` (`force` exists in the test build only and dispatches `place/announce`)

- [ ] **Step 1: Write the failing test**

Append to `tests/places/meadow.test.ts`:

```ts
import { meadowDecor } from '../../src/core/places/meadow.ts';
import { decorationDefs } from '../../src/core/places/content.ts';

describe('meadow decorations', () => {
  it('shows built decorations, Lumi gifts, unlocked toys and meadow rewards', () => {
    const s = foldAll([
      ev('building.done', { plot: 'decor-fountain' }),
      ev('note.sent', { note: 'swing', mark: '?', gift: 'gift-swing' }),
      ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'novelty:bubble-machine' }),
    ]);
    const out = meadowDecor({ s, decorations: decorationDefs, rewards: ['reward-meadow-moon-lamps', 'reward-crown-gem-trim'] });
    expect(out.map((d) => d.id)).toEqual(['decor-fountain', 'gift-swing', 'bubble-machine', 'reward-meadow-moon-lamps']);
    for (const d of out) { expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x).toBeLessThanOrEqual(1180); expect(d.y).toBeLessThanOrEqual(820); }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/meadow.test.ts`
Expected: FAIL, `meadowDecor` is not exported.

- [ ] **Step 3: Add `meadowDecor` to `meadow.ts`**

```ts
import type { DecorDef } from './jewels.ts';

export const GIFT_SPOTS: Record<string, [number, number]> = {
  'gift-swing': [820, 470], 'gift-kite': [600, 200], 'gift-boat': [150, 700], 'gift-cake': [700, 640], 'gift-bell': [880, 240],
};
export const EXTRA_SPOTS: Record<string, [number, number]> = {
  'bubble-machine': [330, 300], 'reward-meadow-moon-lamps': [560, 560], 'reward-stable-star-lanterns': [980, 280],
  'reward-meadow-heart-garland': [420, 260], 'reward-pond-shell-path': [200, 600],
};

export function meadowDecor(c: { s: PlacesState; decorations: DecorDef[]; rewards: string[] }): { id: string; picture: string; x: number; y: number }[] {
  const out: { id: string; picture: string; x: number; y: number }[] = [];
  for (const d of c.decorations) if (c.s.buildings[d.id]?.done) out.push({ id: d.id, picture: d.picture, x: d.pos[0], y: d.pos[1] });
  for (const g of c.s.gifts) if (GIFT_SPOTS[g]) out.push({ id: g, picture: g, x: GIFT_SPOTS[g][0], y: GIFT_SPOTS[g][1] });
  for (const u of c.s.unlocked) if (EXTRA_SPOTS[u]) out.push({ id: u, picture: `nv-${u}`, x: EXTRA_SPOTS[u][0], y: EXTRA_SPOTS[u][1] });
  for (const r of c.rewards) if (EXTRA_SPOTS[r]) out.push({ id: r, picture: r, x: EXTRA_SPOTS[r][0], y: EXTRA_SPOTS[r][1] });
  return out;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/meadow.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the meadow**

In `Meadow.svelte`:
- Render `meadowDecor({ s, decorations: decorationDefs, rewards: fullSetRewards(s, CURRENT_RELEASE) })` as `pointer-events: none` sprites behind the herd layer, except `bubble-machine`, which on a tap blows twenty soap bubbles (transform and opacity) for 4 s.
- `const box = jewelBox(learnerView(), s, [...ladder('r'), ...ladder('s'), ...ladder('m')])`, `const waiting = waitingJewels(box)`, `const plot = jewelPlot({ s, release: CURRENT_RELEASE, reached: learnerView().reached })`.
- Show a `PlotMarker` for `plot` when `waiting.length > 0` or `plot.lit.length > 0`: decoration plots at their `pos`, building plots at the Village Lane gate (`edgeSpot('salon')`). A building plot whose stones are all lit shows the hammer and enters `building-day` on a tap; the Salon Building Day uses the parts of Task A13.
- `jewelPlotNow()` returns `plot?.plot ?? null` when `waiting.length > 0` (the jewel bubble). `postWaitingNow()` stays `false` until Task B8.
- Arrival order, after the first hatch of the visit, one new thing at most:
  1. `const id = openingDue(openingCtx(s, learnerView(), { postBuilt: Boolean(s.buildings['post-box']?.done), villageStoneLit: villageStoneLit(s), freshJewelWaiting: waiting.length > 0 }))`.
  2. If `id === 'jewels'` or (`waiting.length > 0` and `once('jewel:' + waiting[0].step)`): open the jewel box, glow the jewel, moonbeam on the plot marker, `say('jw-new-jewel')`; the first time ever (`id === 'jewels'`) also `ghostMove` from the jewel to the plot; dispatch `place/announce` with `jewels` when `id === 'jewels'`.
  3. Else, if `id` is a meadow opening, announce it as in Task A7.
  4. Else, if `noveltyDue(s.visits)` and `nextNovelty(s, CURRENT_RELEASE)` returns an item: `say(item.line)`, show the thing with a sparkle at its spot (stall lanterns at the stables edge, the egg skin at the nest, the pin set at the Post Box, the cousin at the Salon gate, the bubble machine at its spot), then dispatch `{ type: 'place/announce', opening: 'novelty:' + item.id }`.
- Jewel drag: dropping a fresh jewel within 80 px of the plot marker dispatches `{ type: 'place/jewel', jewel: step, plot: plot.plot, decoration: plot.kind === 'decoration' }`. Then `say('jw-stone-lit')`; for a decoration the plot grows into its decoration with the herd cheering (`say('foal-hooray')`, `say('jw-decor-built')`); when a building plot's last stone lights, `say('jw-all-lit')` and the hammer appears. A drop elsewhere floats the jewel back to the box. Old jewels cannot be dragged.

In `Crown.svelte`, the jewel count dot shows `box.length`; the gem trim reward (`reward-crown-gem-trim`) adds a gem band to the crown once full.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/ui/JewelBox.svelte games/moon-meadow-home/src/ui/Crown.svelte games/moon-meadow-home/src/scenes/places/PlotMarker.svelte games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/core/places/meadow.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/meadow.test.ts
git commit -m "Show jewels, plots, decorations and novelty surprises in the meadow"
```

**Acceptance:** a fresh jewel glows in the Jewel Box, the plot shows a moonbeam with "You have a new jewel. Bring it here!", the drag lights a stone, a decoration grows at once, a full building plot shows the hammer, and after five quiet visits a reserve surprise arrives.

### Task B5: Lumi's Dressing Corner

**Files:**
- Create: `src/core/places/dressing.ts`, `content/places/dressing.json`, `src/scenes/places/DressingCorner.svelte`
- Modify: `src/core/places/content.ts` (add `wardrobeDefs`), `src/places/scenes.ts` (add `dressing: DressingCorner`), `src/places/hook.ts` (add `dressing`)
- Test: `tests/places/dressing.test.ts`

**Interfaces:**
- Consumes: `Outfit`, `PlacesState` (A1); `sashOf` (B2); `recentTouches`, `once` (A7); heartbeat `Unicorn` with `outfit`.
- Produces:
  - `type WardrobeItem = { id: string; slot: 'crown' | 'cape' | 'garland'; picture: string; colour: string; release: string }`
  - `wardrobe(release: string, items?: WardrobeItem[]): WardrobeItem[]`
  - `wearItem(outfit: Outfit, item: WardrobeItem): Outfit` (puts it on; the same item again takes it off)
  - `outfitOf(s: PlacesState, baby: string): Outfit`
  - `dressingBabies(herd: BabyView[], recent: string[], s: PlacesState): BabyView[]` (up to six: recent first, then babies with a saved outfit, then the newest)
  - Hook `dressing`: `{ babies(): string[]; put(baby: string, item: string): void; leave(): void }`

- [ ] **Step 1: Write the content file**

`content/places/dressing.json`:

```json
{
  "items": [
    { "id": "gold-crown", "slot": "crown", "picture": "dress-gold-crown", "colour": "#f2c94c", "release": "1.1" },
    { "id": "silver-crown", "slot": "crown", "picture": "dress-silver-crown", "colour": "#d8dde6", "release": "1.1" },
    { "id": "flower-crown", "slot": "crown", "picture": "dress-flower-crown", "colour": "#f7a8c4", "release": "1.1" },
    { "id": "star-crown", "slot": "crown", "picture": "dress-star-crown", "colour": "#ffd86b", "release": "1.1" },
    { "id": "pink-cape", "slot": "cape", "picture": "dress-pink-cape", "colour": "#f5a3c7", "release": "1.1" },
    { "id": "blue-cape", "slot": "cape", "picture": "dress-blue-cape", "colour": "#9cc8f2", "release": "1.1" },
    { "id": "purple-cape", "slot": "cape", "picture": "dress-purple-cape", "colour": "#c3a6ef", "release": "1.1" },
    { "id": "gold-cape", "slot": "cape", "picture": "dress-gold-cape", "colour": "#f2d27a", "release": "1.1" },
    { "id": "daisy-garland", "slot": "garland", "picture": "dress-daisy-garland", "colour": "#fff7d6", "release": "1.1" },
    { "id": "rose-garland", "slot": "garland", "picture": "dress-rose-garland", "colour": "#f4a6b4", "release": "1.1" },
    { "id": "star-garland", "slot": "garland", "picture": "dress-star-garland", "colour": "#ffe08a", "release": "1.1" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import dressingJson from '../../../content/places/dressing.json' with { type: 'json' };
import type { WardrobeItem } from './dressing.ts';
export const wardrobeDefs: WardrobeItem[] = dressingJson.items as WardrobeItem[];
```

- [ ] **Step 2: Write the failing test**

`tests/places/dressing.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { dressingBabies, outfitOf, wardrobe, wearItem } from '../../src/core/places/dressing.ts';
import { baby, ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const item = (id: string) => wardrobe('1.3').find((w) => w.id === id)!;

describe('Dressing Corner', () => {
  it('has crowns, capes and garlands', () => {
    const slots = new Set(wardrobe('1.3').map((w) => w.slot));
    expect([...slots].sort()).toEqual(['cape', 'crown', 'garland']);
    expect(wardrobe('1.0')).toEqual([]);
  });

  it('wears one item per slot and takes it off on a second tap', () => {
    let o = wearItem({}, item('gold-crown'));
    o = wearItem(o, item('pink-cape'));
    o = wearItem(o, item('star-crown'));
    expect(o).toEqual({ crown: 'star-crown', cape: 'pink-cape' });
    expect(wearItem(o, item('pink-cape'))).toEqual({ crown: 'star-crown' });
  });

  it('reads the saved outfit', () => {
    const s = foldAll([ev('outfit.saved', { baby: 'a', outfit: { crown: 'gold-crown' } })]);
    expect(outfitOf(s, 'a')).toEqual({ crown: 'gold-crown' });
    expect(outfitOf(s, 'b')).toEqual({});
  });

  it('brings recent babies first, then dressed ones, then the newest, six at most', () => {
    const herd = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => baby(id, id.toUpperCase()));
    const s = foldAll([ev('outfit.saved', { baby: 'b', outfit: { cape: 'blue-cape' } })]);
    expect(dressingBabies(herd, ['d', 'a'], s).map((x) => x.id)).toEqual(['d', 'a', 'b', 'h', 'g', 'f']);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/dressing.test.ts`
Expected: FAIL, cannot resolve `dressing.ts`.

- [ ] **Step 4: Write `dressing.ts`**

```ts
import type { BabyView, Outfit } from './types.ts';
import type { PlacesState } from './state.ts';
import { released, wardrobeDefs } from './content.ts';

export type WardrobeItem = { id: string; slot: 'crown' | 'cape' | 'garland'; picture: string; colour: string; release: string };

export const wardrobe = (release: string, items: WardrobeItem[] = wardrobeDefs): WardrobeItem[] => items.filter((w) => released(w.release, release));

export function wearItem(outfit: Outfit, item: WardrobeItem): Outfit {
  const next: Outfit = { ...outfit };
  if (next[item.slot] === item.id) delete next[item.slot];
  else next[item.slot] = item.id;
  return next;
}

export const outfitOf = (s: PlacesState, baby: string): Outfit => s.outfits[baby] ?? {};

export function dressingBabies(herd: BabyView[], recent: string[], s: PlacesState): BabyView[] {
  const byId = new Map(herd.map((b) => [b.id, b]));
  const order = [...recent, ...Object.keys(s.outfits), ...[...herd].reverse().map((b) => b.id)];
  const seen = new Set<string>();
  const out: BabyView[] = [];
  for (const id of order) {
    const b = byId.get(id);
    if (!b || seen.has(id)) continue;
    seen.add(id);
    out.push(b);
    if (out.length === 6) break;
  }
  return out;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/dressing.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write `DressingCorner.svelte`**

- Lumi's gazebo (`bg-dressing`, fallback a lilac gazebo drawn with CSS). On enter: `say('dc-welcome')` the first time per visit, then `say('dc-try')` the first time ever (`once`).
- Six babies from `dressingBabies(herdView(), recentTouches(), s)` stand on a little stage, each `aria-label="baby <name>"`. A rail at the bottom holds the wardrobe items (`aria-label="wear <id>"`, 96 px), drawn with `Sprite` or `svg('crown' | 'cape' | 'garland', { colour })`.
- Drag an item onto a baby: `wearItem` on a local copy of its outfit; the baby turns and giggles (`say('foal-pretty')` at most once per baby per visit). A baby with pins wears its sash (`outfit.sash = true`) and shows its first ten pins in two rows of five.
- A mirror (`aria-label="mirror"`): dragging a baby to it plays a twirl.
- Each changed outfit is saved when she leaves the corner or after 3 s without a touch on that baby: `{ type: 'place/outfit', baby, outfit }` (latest wins in the fold).
- Visible end: after two saved outfits, `say('dc-saved')` and `<MeadowArrow />`. No checked work, no mistakes.

- [ ] **Step 7: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add games/moon-meadow-home/src/core/places/dressing.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/dressing.json games/moon-meadow-home/src/scenes/places/DressingCorner.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/dressing.test.ts
git commit -m "Add Lumi's Dressing Corner with crowns, capes, garlands and sashes"
```

**Acceptance:** the Dressing Corner opens through the queue, babies wear one item per slot, outfits are saved and shown everywhere the baby appears, and the visit has a visible end.

### Task B6: Post, envelopes, sashes to ten, fewest pins and parcels

**Files:**
- Create: `src/core/places/post.ts`
- Test: `tests/places/post.test.ts`

**Interfaces:**
- Consumes: `PlacesState`, `currentVisit` (A1); `BabyView`, `ServedItem`, `WordView`, `Rng` (A1); `nextSetPins`, `sashCount` (B2).
- Produces:
  - `postWaiting(s: PlacesState): boolean`
  - `type Envelope = { baby: string; pin: string; key: string }`
  - `type PostPlan = { envelopes: Envelope[]; candidates: string[]; extras: string[] }`
  - `planPost(c: { s: PlacesState; herd: BabyView[]; canReview: (b: BabyView) => boolean; release: string; rng: Rng }): PostPlan | null`
  - `envelopeCandidates(plan: PostPlan, delivered: string[]): { ids: string[]; logged: boolean }`
  - `type SashTask = { baby: string; has: number; gift: number; answer: number; served: ServedItem }`
  - `planSashFill(c: { s: PlacesState; herd: BabyView[]; item: ServedItem | null; rng: Rng }): SashTask | null`
  - `fillOutcome(answer: number, dropped: number): { kind: 'done' | 'few' | 'many'; diff: number }`
  - `sashLines(t: SashTask): string[]` (`['pb-sash-need', 'pb-has-<has>']`)
  - `type FewestTask = { babies: string[]; counts: number[]; answer: string; pin: string; served: ServedItem }`
  - `planFewest(c: { s: PlacesState; herd: BabyView[]; item: ServedItem | null; pin: string; rng: Rng }): FewestTask | null`
  - `type ParcelTask = { word: WordView; total: number; inside: number; answer: number; label: string; served: ServedItem }`
  - `planParcel(c: { item: ServedItem | null; words: WordView[]; rng: Rng }): ParcelTask | null`
  - `parcelReadback(t: ParcelTask): string[]` (`['num-<total>', 'word-<plural>']`)

- [ ] **Step 1: Write the failing test**

`tests/places/post.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { envelopeCandidates, fillOutcome, parcelReadback, planFewest, planParcel, planPost, planSashFill, postWaiting, sashLines } from '../../src/core/places/post.ts';
import { baby, ev, foldAll, resetSeq, rng, served, word } from './helpers.ts';

beforeEach(resetSeq);
const pot = (b: string, n: number) => Array.from({ length: n }, () => ev('pin.given', { baby: b, pin: 'star', source: 'pot' }));
const herd = ['Pip', 'Tam', 'Dot', 'Ken', 'Max', 'Lily'].map((n, i) => baby(`b${i}`, n, { hatchIndex: i }));

describe('post', () => {
  it('waits once per visit after the Post Box is built', () => {
    expect(postWaiting(foldAll([ev('visit.start', { visit: 'v1', tz: 0 })]))).toBe(false);
    const built = [ev('building.done', { plot: 'post-box' }), ev('visit.start', { visit: 'v2', tz: 0 })];
    expect(postWaiting(foldAll(built))).toBe(true);
    expect(postWaiting(foldAll([...built, ev('pin.given', { baby: 'b0', pin: 'pin-rose', source: 'post', key: 'post:v2:0' })]))).toBe(false);
    expect(postWaiting(foldAll([...built, ev('pin.given', { baby: 'b0', pin: 'pin-rose', source: 'post', key: 'post:v2:0' }), ev('visit.start', { visit: 'v3', tz: 0 })]))).toBe(true);
  });

  it('sends two or three envelopes to babies with different names, fewest pins first', () => {
    const s = foldAll([ev('visit.start', { visit: 'v4', tz: 0 }), ...pot('b0', 5), ...pot('b1', 3)]);
    for (let seed = 1; seed < 20; seed++) {
      const p = planPost({ s, herd, canReview: () => true, release: '1.3', rng: rng(seed) })!;
      expect([2, 3]).toContain(p.envelopes.length);
      expect(p.envelopes.map((e) => e.baby)).not.toContain('b0');
      expect(p.envelopes.map((e) => e.key)).toEqual(p.envelopes.map((_, i) => `post:v4:${i}`));
      expect(p.envelopes[0].pin).toBe('pin-rose');
      expect(p.candidates).toHaveLength(p.envelopes.length + 2);
      const names = p.candidates.map((id) => herd.find((h) => h.id === id)!.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('never puts two babies with the same name in one round', () => {
    const twins = [baby('t1', 'Tim'), baby('t2', 'Tim', { ordinal: 2 }), baby('a', 'Ava'), baby('b', 'Bo'), baby('c', 'Cy')];
    const p = planPost({ s: foldAll([ev('visit.start', { visit: 'v1', tz: 0 })]), herd: twins, canReview: () => true, release: '1.3', rng: rng(3) })!;
    const names = p.candidates.map((id) => twins.find((h) => h.id === id)!.name);
    expect(names.filter((n) => n === 'Tim').length).toBeLessThanOrEqual(1);
  });

  it('only sends to babies whose names she can read, and needs one', () => {
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 })]);
    expect(planPost({ s, herd, canReview: () => false, release: '1.3', rng: rng(1) })).toBeNull();
    const p = planPost({ s, herd, canReview: (b) => b.name === 'Dot', release: '1.3', rng: rng(1) })!;
    expect(p.envelopes.map((e) => e.baby)).toEqual(['b2']);
  });

  it('logs an envelope only while three or more babies wait', () => {
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 })]);
    const small = planPost({ s, herd: herd.slice(0, 2), canReview: () => true, release: '1.3', rng: rng(1) })!;
    expect(envelopeCandidates(small, []).logged).toBe(false);
    const p = planPost({ s, herd, canReview: () => true, release: '1.3', rng: rng(2) })!;
    const first = envelopeCandidates(p, []);
    expect(first.logged).toBe(true);
    const last = envelopeCandidates(p, p.envelopes.slice(0, -1).map((e) => e.baby));
    expect(last.ids).toHaveLength(3);
    expect(last.logged).toBe(true);
  });
});

describe('sash to ten (decision D13)', () => {
  it('picks the baby whose sash shows the first part', () => {
    const s = foldAll([...pot('b1', 6), ...pot('b2', 4)]);
    expect(planSashFill({ s, herd, item: served('m', 'M10', '6+4', ['6+4']), rng: rng(1) })).toMatchObject({ baby: 'b1', has: 6, gift: 0, answer: 4 });
  });
  it('lets Lumi top up the closest baby first when nobody has the first part', () => {
    const s = foldAll([...pot('b1', 2), ...pot('b2', 4)]);
    const t = planSashFill({ s, herd: herd.slice(1, 3), item: served('m', 'M10', '6+4', ['6+4']), rng: rng(1) })!;
    expect(t).toMatchObject({ baby: 'b2', has: 6, gift: 2, answer: 4 });
    expect(sashLines(t)).toEqual(['pb-sash-need', 'pb-has-6']);
  });
  it('has no task without a bond to ten, or when every sash is past it', () => {
    expect(planSashFill({ s: foldAll([]), herd, item: null, rng: rng(1) })).toBeNull();
    expect(planSashFill({ s: foldAll([]), herd, item: served('m', 'M12', '4+3', ['4+3']), rng: rng(1) })).toBeNull();
    const full = foldAll(herd.flatMap((h) => pot(h.id, 8)));
    expect(planSashFill({ s: full, herd, item: served('m', 'M10', '6+4', ['6+4']), rng: rng(1) })).toBeNull();
  });
  it('judges the stone', () => {
    expect(fillOutcome(4, 4)).toEqual({ kind: 'done', diff: 0 });
    expect(fillOutcome(4, 2)).toEqual({ kind: 'few', diff: 2 });
    expect(fillOutcome(4, 6)).toEqual({ kind: 'many', diff: 2 });
  });
});

describe('fewest pins', () => {
  it('shows three babies with different counts and wants the fewest', () => {
    const s = foldAll([...pot('b0', 0), ...pot('b1', 2), ...pot('b2', 5), ...pot('b3', 5)]);
    const t = planFewest({ s, herd: herd.slice(0, 4), item: served('m', 'M03', 'fewest', ['fewest']), pin: 'pin-tulip', rng: rng(2) })!;
    expect(t.babies).toHaveLength(3);
    expect(new Set(t.counts).size).toBe(3);
    expect(t.answer).toBe('b0');
  });
  it('has no task with fewer than three different counts or another step', () => {
    const s = foldAll([...pot('b1', 2)]);
    expect(planFewest({ s, herd: herd.slice(0, 2), item: served('m', 'M03', 'fewest', ['fewest']), pin: 'p', rng: rng(1) })).toBeNull();
    expect(planFewest({ s, herd, item: served('m', 'M10', '6+4', ['6+4']), pin: 'p', rng: rng(1) })).toBeNull();
  });
});

describe('plural parcels', () => {
  const brush = word('brush', ['b', 'r', 'u', 'sh'], { tags: ['shelf'], plural: { word: 'brushes', ending: 'es', graphemes: ['b', 'r', 'u', 'sh', 'es'] } });
  it('labels the parcel with the total and fills the missing part', () => {
    const t = planParcel({ item: served('m', 'M12', '4+3', ['4+3']), words: [brush], rng: rng(1) })!;
    expect(t).toMatchObject({ total: 7, inside: 4, answer: 3, label: '7 brushes' });
    expect(parcelReadback(t)).toEqual(['num-7', 'word-brushes']);
  });
  it('has no parcel without an item, past ten, or without a shelf word', () => {
    expect(planParcel({ item: null, words: [brush], rng: rng(1) })).toBeNull();
    expect(planParcel({ item: served('m', 'M21', '9+5', ['9+5']), words: [brush], rng: rng(1) })).toBeNull();
    expect(planParcel({ item: served('m', 'M12', '4+3', ['4+3']), words: [], rng: rng(1) })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/post.test.ts`
Expected: FAIL, cannot resolve `post.ts`.

- [ ] **Step 3: Write `post.ts`**

```ts
import type { BabyView, Rng, ServedItem, WordView } from './types.ts';
import { currentVisit, type PlacesState } from './state.ts';
import { nextSetPins, sashCount } from './pins.ts';

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const fact = (item: ServedItem | null) => {
  const m = item ? /^(\d+)\+(\d+)$/.exec(item.carrier) : null;
  return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
};

export function postWaiting(s: PlacesState): boolean {
  const v = currentVisit(s);
  return Boolean(s.buildings['post-box']?.done) && v !== null && !v.post;
}

export type Envelope = { baby: string; pin: string; key: string };
export type PostPlan = { envelopes: Envelope[]; candidates: string[]; extras: string[] };

export function planPost(c: { s: PlacesState; herd: BabyView[]; canReview: (b: BabyView) => boolean; release: string; rng: Rng }): PostPlan | null {
  const v = currentVisit(c.s);
  if (!v) return null;
  const n = c.rng() < 0.5 ? 2 : 3;
  const sorted = c.herd.filter(c.canReview).sort((a, b) => sashCount(c.s, a.id) - sashCount(c.s, b.id) || a.hatchIndex - b.hatchIndex);
  const used = new Set<string>();
  const recipients: BabyView[] = [];
  for (const b of sorted) {
    if (recipients.length === n) break;
    if (used.has(b.name)) continue;
    used.add(b.name);
    recipients.push(b);
  }
  if (!recipients.length) return null;
  const extras: BabyView[] = [];
  for (const b of shuffle(c.herd, c.rng)) {
    if (extras.length === 2) break;
    if (used.has(b.name)) continue;
    used.add(b.name);
    extras.push(b);
  }
  const pins = nextSetPins(c.s, recipients.length, c.release);
  return {
    envelopes: recipients.map((b, i) => ({ baby: b.id, pin: pins[i], key: `post:${v.id}:${i}` })),
    candidates: shuffle([...recipients, ...extras].map((b) => b.id), c.rng),
    extras: extras.map((b) => b.id),
  };
}

export function envelopeCandidates(plan: PostPlan, delivered: string[]): { ids: string[]; logged: boolean } {
  const ids = plan.candidates.filter((id) => !delivered.includes(id));
  return { ids, logged: ids.length >= 3 };
}

export type SashTask = { baby: string; has: number; gift: number; answer: number; served: ServedItem };

export function planSashFill(c: { s: PlacesState; herd: BabyView[]; item: ServedItem | null; rng: Rng }): SashTask | null {
  const f = fact(c.item);
  if (!c.item || !f || f.a + f.b !== 10 || f.b < 1) return null;
  const counts = c.herd.map((h) => ({ id: h.id, n: sashCount(c.s, h.id) }));
  const exact = counts.filter((x) => x.n === f.a);
  if (exact.length) return { baby: exact[Math.floor(c.rng() * exact.length)].id, has: f.a, gift: 0, answer: f.b, served: c.item };
  const below = counts.filter((x) => x.n < f.a);
  if (!below.length) return null;
  const max = Math.max(...below.map((x) => x.n));
  const top = below.filter((x) => x.n === max);
  const pick = top[Math.floor(c.rng() * top.length)];
  return { baby: pick.id, has: f.a, gift: f.a - pick.n, answer: f.b, served: c.item };
}

export function fillOutcome(answer: number, dropped: number): { kind: 'done' | 'few' | 'many'; diff: number } {
  if (dropped === answer) return { kind: 'done', diff: 0 };
  return dropped < answer ? { kind: 'few', diff: answer - dropped } : { kind: 'many', diff: dropped - answer };
}

export const sashLines = (t: SashTask): string[] => ['pb-sash-need', `pb-has-${t.has}`];

export type FewestTask = { babies: string[]; counts: number[]; answer: string; pin: string; served: ServedItem };

export function planFewest(c: { s: PlacesState; herd: BabyView[]; item: ServedItem | null; pin: string; rng: Rng }): FewestTask | null {
  if (!c.item || c.item.step !== 'M03') return null;
  const byCount = new Map<number, string[]>();
  for (const h of c.herd) {
    const n = sashCount(c.s, h.id);
    byCount.set(n, [...(byCount.get(n) ?? []), h.id]);
  }
  if (byCount.size < 3) return null;
  const counts = shuffle([...byCount.keys()], c.rng).slice(0, 3);
  const babies = counts.map((n) => { const ids = byCount.get(n)!; return ids[Math.floor(c.rng() * ids.length)]; });
  const min = Math.min(...counts);
  return { babies, counts, answer: babies[counts.indexOf(min)], pin: c.pin, served: c.item };
}

export type ParcelTask = { word: WordView; total: number; inside: number; answer: number; label: string; served: ServedItem };

export function planParcel(c: { item: ServedItem | null; words: WordView[]; rng: Rng }): ParcelTask | null {
  const f = fact(c.item);
  if (!c.item || !f || f.a < 1 || f.b < 1 || f.a + f.b > 10) return null;
  const pool = c.words.filter((w) => w.plural && w.tags.includes('shelf'));
  if (!pool.length) return null;
  const w = pool[Math.floor(c.rng() * pool.length)];
  return { word: w, total: f.a + f.b, inside: f.a, answer: f.b, label: `${f.a + f.b} ${w.plural!.word}`, served: c.item };
}

export const parcelReadback = (t: ParcelTask): string[] => [`num-${t.total}`, `word-${t.word.plural!.word}`];
```

In the fewest test, `b0` gets no pins (`pot('b0', 0)` adds nothing), so its count is 0 and it is the answer whatever three counts are drawn, because 0, 2 and 5 are the only three counts.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/post.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/core/places/post.ts games/moon-meadow-home/tests/places/post.test.ts
git commit -m "Add post planning: envelopes, sashes to ten, fewest pins and plural parcels"
```

**Acceptance:** one post per visit with two or three envelopes to readable, distinct names and three or more candidates, a sash task at her bond to ten, a fewest-pins task for M03, and parcels labelled with a number and a plural.

### Task B7: Notes to Lumi

**Files:**
- Create: `src/core/places/notes.ts`, `content/places/notes.json`
- Modify: `src/core/places/content.ts` (add `noteDefs`)
- Test: `tests/places/notes.test.ts`

**Interfaces:**
- Consumes: `Mark`, `ItemResult`, `Result`, `ServedItem`, `Rng` (A1).
- Produces:
  - `type NoteDef = { id: string; cards: string[]; mark: Mark; gift: string | null; spell: string[] }`
  - `MARK_KIND: Record<Mark, 'ask' | 'tell' | 'shout'>`
  - `type NoteCard = { id: string; text: string; crowned: boolean; blank: boolean }`
  - `type NoteTask = { note: NoteDef; spellWord: string; spellIndex: number; cards: NoteCard[]; order: string[]; marks: Mark[]; served: ServedItem; say: string[] }`
  - `pickNote(item: ServedItem, notes: NoteDef[], rng: Rng): { note: NoteDef; spellWord: string } | null`
  - `planNote(item: ServedItem | null, notes: NoteDef[], rng: Rng): NoteTask | null`
  - `checkCard(task: NoteTask, slot: number, cardId: string): 'ok' | 'wrong' | 'no-crown'`
  - `markReading(task: NoteTask, mark: Mark): { ok: boolean; clip: string }`
  - `noteItems(task: NoteTask, errors: { order: number; crown: number; mark: number; spell: number }, result: Result): ItemResult[]`
  - `noteOutcome(note: NoteDef): { lumi: string; gift: string | null }`

- [ ] **Step 1: Write the content file**

`content/places/notes.json`:

```json
{
  "notes": [
    { "id": "swing", "cards": ["Can", "we", "have", "a", "swing"], "mark": "?", "gift": "gift-swing", "spell": ["we", "have", "a"] },
    { "id": "kite", "cards": ["Can", "you", "send", "me", "a", "kite"], "mark": "?", "gift": "gift-kite", "spell": ["you", "me", "a"] },
    { "id": "pond-go", "cards": ["Can", "I", "go", "to", "the", "pond"], "mark": "?", "gift": "gift-boat", "spell": ["I", "go", "to", "the"] },
    { "id": "moon", "cards": ["We", "love", "the", "moon"], "mark": ".", "gift": null, "spell": ["the"] },
    { "id": "stars", "cards": ["He", "and", "she", "like", "the", "stars"], "mark": "!", "gift": null, "spell": ["she", "like", "the"] },
    { "id": "he-pond", "cards": ["Can", "he", "come", "to", "the", "pond"], "mark": "?", "gift": "gift-boat", "spell": ["he", "come", "to", "the"] },
    { "id": "hello", "cards": ["They", "said", "hello", "to", "the", "moon"], "mark": ".", "gift": null, "spell": ["said", "to", "the"] },
    { "id": "cake", "cards": ["Can", "they", "have", "some", "cake"], "mark": "?", "gift": "gift-cake", "spell": ["they", "have", "some"] },
    { "id": "come", "cards": ["Come", "and", "see", "my", "babies"], "mark": "!", "gift": null, "spell": ["and"] },
    { "id": "was-pond", "cards": ["I", "was", "at", "the", "pond"], "mark": ".", "gift": null, "spell": ["was", "at", "the"] },
    { "id": "like-one", "cards": ["I", "like", "this", "one"], "mark": "!", "gift": null, "spell": ["like", "one"] },
    { "id": "no-cake", "cards": ["We", "have", "no", "cake"], "mark": ".", "gift": null, "spell": ["have", "no"] },
    { "id": "bell", "cards": ["Can", "we", "have", "a", "bell"], "mark": "?", "gift": "gift-bell", "spell": ["we", "have", "a"] },
    { "id": "fun-day", "cards": ["It", "will", "be", "a", "fun", "day"], "mark": "!", "gift": null, "spell": ["be", "a"] }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import notesJson from '../../../content/places/notes.json' with { type: 'json' };
import type { NoteDef } from './notes.ts';
export const noteDefs: NoteDef[] = notesJson.notes as NoteDef[];
```

- [ ] **Step 2: Write the failing test**

`tests/places/notes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkCard, markReading, noteItems, noteOutcome, pickNote, planNote } from '../../src/core/places/notes.ts';
import { noteDefs } from '../../src/core/places/content.ts';
import { rng, served } from './helpers.ts';

const S08 = ['the', 'I', 'to', 'no', 'go', 'he', 'she', 'we', 'me', 'be', 'a', 'at'];
const S17 = ['was', 'you', 'they', 'said', 'have', 'like', 'come', 'some', 'one'];

describe('notes to Lumi', () => {
  it('has a note to spell every S08 and S17 word, never as the crowned first card (decision D14)', () => {
    for (const w of [...S08, ...S17]) {
      const p = pickNote(served('s', S08.includes(w) ? 'S08' : 'S17', w, [w]), noteDefs, rng(1));
      expect(p, w).not.toBeNull();
      expect(p!.spellWord).toBe(w);
      expect(p!.note.cards.slice(1).map((c) => c.toLowerCase())).toContain(w.toLowerCase());
    }
  });

  it('picks a note by its end mark or by "and"', () => {
    expect(pickNote(served('s', 'S23', 'mark-?', ['mark-?']), noteDefs, rng(1))!.note.mark).toBe('?');
    expect(pickNote(served('s', 'S23', 'mark-!', ['mark-!']), noteDefs, rng(1))!.note.mark).toBe('!');
    expect(pickNote(served('s', 'S21', 'mark-.', ['capital-start', 'mark-.']), noteDefs, rng(1))!.note.mark).toBe('.');
    expect(pickNote(served('s', 'S23', 'and', ['and']), noteDefs, rng(1))!.note.cards).toContain('and');
    expect(pickNote(served('s', 'S12', 'nest', ['st']), noteDefs, rng(1))).toBeNull();
  });

  it('lays out the cards with a blank card for the spelled word and a small first-word decoy', () => {
    const t = planNote(served('s', 'S08', 'we', ['we']), noteDefs.filter((n) => n.id === 'swing'), rng(2))!;
    expect(t.order).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
    expect(t.cards.find((c) => c.id === 'c0')).toEqual({ id: 'c0', text: 'Can', crowned: true, blank: false });
    expect(t.cards.find((c) => c.id === 'c0s')).toEqual({ id: 'c0s', text: 'can', crowned: false, blank: false });
    expect(t.cards.find((c) => c.id === 'c1')!.blank).toBe(true);
    expect(t.spellIndex).toBe(1);
    expect([...t.marks].sort()).toEqual(['!', '.', '?']);
    expect(t.say).toEqual(['nt-lets-write', 'nt-swing-ask']);
  });

  it('checks each card: right, wrong, or a small first word', () => {
    const t = planNote(served('s', 'S18', 'card-order', ['card-order']), noteDefs.filter((n) => n.id === 'swing'), rng(2))!;
    expect(checkCard(t, 0, 'c0')).toBe('ok');
    expect(checkCard(t, 0, 'c0s')).toBe('no-crown');
    expect(checkCard(t, 1, 'c3')).toBe('wrong');
  });

  it('reads a note back the way its mark says', () => {
    const t = planNote(served('s', 'S23', 'mark-?', ['mark-?']), noteDefs.filter((n) => n.id === 'swing'), rng(2))!;
    expect(markReading(t, '?')).toEqual({ ok: true, clip: 'nt-swing-ask' });
    expect(markReading(t, '.')).toEqual({ ok: false, clip: 'nt-swing-tell' });
    expect(markReading(t, '!')).toEqual({ ok: false, clip: 'nt-swing-shout' });
  });

  it('logs one item per part of the note', () => {
    const t = planNote(served('s', 'S08', 'she', ['she']), noteDefs.filter((n) => n.id === 'stars'), rng(1))!;
    expect(noteItems(t, { order: 0, crown: 1, mark: 0, spell: 0 }, 'miss')).toEqual([
      { item: 'card-order', result: 'first' }, { item: 'capital-start', result: 'miss' }, { item: 'mark-!', result: 'first' },
      { item: 'and', result: 'first' }, { item: 'she', result: 'first' },
    ]);
    expect(noteItems(t, { order: 0, crown: 0, mark: 0, spell: 0 }, 'helped').every((i) => i.result === 'helped')).toBe(true);
  });

  it('brings a gift for a question, a wave for a telling note and a sparkle for a shout', () => {
    expect(noteOutcome(noteDefs.find((n) => n.id === 'swing')!)).toEqual({ lumi: 'lumi-gift-swing', gift: 'gift-swing' });
    expect(noteOutcome(noteDefs.find((n) => n.id === 'moon')!)).toEqual({ lumi: 'lumi-wave', gift: null });
    expect(noteOutcome(noteDefs.find((n) => n.id === 'stars')!)).toEqual({ lumi: 'lumi-sparkle', gift: null });
  });

  it('has no note without an item', () => {
    expect(planNote(null, noteDefs, rng(1))).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/notes.test.ts`
Expected: FAIL, cannot resolve `notes.ts`.

- [ ] **Step 4: Write `notes.ts`**

```ts
import type { ItemResult, Mark, Result, Rng, ServedItem } from './types.ts';

export type NoteDef = { id: string; cards: string[]; mark: Mark; gift: string | null; spell: string[] };
export const MARK_KIND: Record<Mark, 'ask' | 'tell' | 'shout'> = { '?': 'ask', '.': 'tell', '!': 'shout' };
export type NoteCard = { id: string; text: string; crowned: boolean; blank: boolean };
export type NoteTask = { note: NoteDef; spellWord: string; spellIndex: number; cards: NoteCard[]; order: string[]; marks: Mark[]; served: ServedItem; say: string[] };

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const pick = <T>(a: T[], rng: Rng): T => a[Math.floor(rng() * a.length)];

export function pickNote(item: ServedItem, notes: NoteDef[], rng: Rng): { note: NoteDef; spellWord: string } | null {
  const first = item.items[0] ?? item.carrier;
  let fit: NoteDef[] = [];
  let spellWord: string | null = null;
  if (item.step === 'S08' || item.step === 'S17') { fit = notes.filter((n) => n.spell.includes(first)); spellWord = first; }
  else if (item.step === 'S21') fit = notes.filter((n) => n.mark === '.');
  else if (item.step === 'S23') {
    if (first === 'and') fit = notes.filter((n) => n.cards.includes('and'));
    else fit = notes.filter((n) => `mark-${n.mark}` === first);
  } else if (item.step === 'S18') fit = notes;
  if (!fit.length) return null;
  const note = pick(fit, rng);
  return { note, spellWord: spellWord ?? pick(note.spell, rng) };
}

export function planNote(item: ServedItem | null, notes: NoteDef[], rng: Rng): NoteTask | null {
  if (!item) return null;
  const p = pickNote(item, notes, rng);
  if (!p) return null;
  const { note, spellWord } = p;
  const spellIndex = note.cards.findIndex((c, i) => i > 0 && c === spellWord);
  const cards: NoteCard[] = note.cards.map((text, i) => ({ id: `c${i}`, text, crowned: i === 0, blank: i === spellIndex }));
  const decoy: NoteCard = { id: 'c0s', text: note.cards[0].toLowerCase(), crowned: false, blank: false };
  return {
    note, spellWord, spellIndex, cards: shuffle([...cards, decoy], rng), order: cards.map((c) => c.id),
    marks: shuffle(['.', '?', '!'] as Mark[], rng), served: item, say: ['nt-lets-write', `nt-${note.id}-${MARK_KIND[note.mark]}`],
  };
}

export function checkCard(task: NoteTask, slot: number, cardId: string): 'ok' | 'wrong' | 'no-crown' {
  if (slot === 0 && cardId === 'c0s') return 'no-crown';
  return task.order[slot] === cardId ? 'ok' : 'wrong';
}

export function markReading(task: NoteTask, mark: Mark): { ok: boolean; clip: string } {
  return { ok: mark === task.note.mark, clip: `nt-${task.note.id}-${MARK_KIND[mark]}` };
}

export function noteItems(task: NoteTask, errors: { order: number; crown: number; mark: number; spell: number }, result: Result): ItemResult[] {
  const r = (n: number): Result => (result === 'helped' ? 'helped' : n > 0 ? 'miss' : 'first');
  const out: ItemResult[] = [
    { item: 'card-order', result: r(errors.order) },
    { item: 'capital-start', result: r(errors.crown) },
    { item: `mark-${task.note.mark}`, result: r(errors.mark) },
  ];
  if (task.note.cards.includes('and')) out.push({ item: 'and', result: r(errors.order) });
  out.push({ item: task.spellWord, result: r(errors.spell) });
  return out;
}

export function noteOutcome(note: NoteDef): { lumi: string; gift: string | null } {
  if (note.gift) return { lumi: `lumi-${note.gift}`, gift: note.gift };
  return { lumi: note.mark === '.' ? 'lumi-wave' : 'lumi-sparkle', gift: null };
}
```

`spellWord` keeps its case: `I` is spelled as the capital I gem, which is how it is written in the note.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/notes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/notes.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/notes.json games/moon-meadow-home/tests/places/notes.test.ts
git commit -m "Add notes to Lumi with word cards, crown letters, end marks and spelled words"
```

**Acceptance:** fourteen notes cover every S08 and S17 word; a note is picked by the served item; cards, the crowned first card, the end mark and one spelled word each log an item; a question brings a gift, a telling note a wave, a shout a sparkle.

### Task B8: Post Box scene

**Files:**
- Create: `src/scenes/places/PostBox.svelte`, `src/scenes/places/post/Envelopes.svelte`, `src/scenes/places/post/SashFill.svelte`, `src/scenes/places/post/Fewest.svelte`, `src/scenes/places/post/Parcel.svelte`, `src/scenes/places/post/NoteDesk.svelte`
- Modify: `src/scenes/places/Meadow.svelte` (`postWaitingNow` returns `postWaiting(s)`), `src/places/scenes.ts` (add `'post-box': PostBox`), `src/places/hook.ts` (add `post`, `notes`)

**Interfaces:**
- Consumes: Task B6 and B7 exports; `sashOf`, `setProgress` (B2); `createMoment` (A3); heartbeat `StoneTray`, `GemSlots`, `PrintWithDots`, `Unicorn`, `canReviewName`, `ownSlots`, `planTray`; `serve`, `canServeSlot`, `wordViews`, `logFor` (A1b).
- Produces:
  - Hook `post`: `{ state(): { phase: 'envelopes' | 'fewest' | 'sash' | 'parcel' | 'free'; envelope: { baby: string; pin: string } | null; candidates: string[]; sash: { baby: string; has: number; answer: number } | null; parcel: { total: number; inside: number; answer: number } | null; fewest: { babies: string[]; answer: string } | null }; give(baby: string): void; drop(n: number): void; pick(baby: string): void }`
  - Hook `notes`: `{ task(): { id: string; order: string[]; cards: { id: string; text: string }[]; mark: string; spellWord: string } | null; open(): void; place(slot: number, cardId: string): void; mark(m: '.' | '?' | '!'): void; spell(gems: string[]): void }`

- [ ] **Step 1: Write `PostBox.svelte`**

Background `bg-post-box` (fallback: a red post box with a slot, a desk and Lumi's pin pot on a shelf). On enter, the phases run in this order, one goal per screen:

1. `envelopes` when `postWaiting(s)`: `say('pb-arrive')`, then `<Envelopes plan={planPost({ s, herd: herdView(), canReview: (b) => canReviewName(b, game.learner), release: CURRENT_RELEASE, rng: game.rng })} />`.
2. One maths act, picked in this order: `fewest` when `canServeSlot('post-box', 'fewest')` and `planFewest` returns a task (the pin is `nextSetPins(s, 1, release)[0]`); else, on even visit indexes, `sash` when `planSashFill` returns a task; else `parcel` when `planParcel` returns a task; else `sash` again; else nothing.
3. `free`: free play. Each baby with pins stands with its sash (two rows of five); she can drag pins to other spots on the same sash (not logged). The note desk glows when `canServeSlot('post-box', 'note')`; a tap opens `<NoteDesk />`. After a full set, `say('pb-set-full')` and the reward shows. Then `<MeadowArrow />`.

The first time the `notes` opening has been announced and she enters, the ghost hand taps the desk.

- [ ] **Step 2: Write `Envelopes.svelte`**

- One envelope at a time on the desk, printed with the baby's name (`PrintWithDots` with the name, no dots: names are reviewed from print). The candidates (`envelopeCandidates(plan, delivered).ids`) stand in a row with faces only (tags hidden), each `aria-label="baby <index>"` (index, never the name). Goal `pb-envelope-goal`.
- Drag the envelope to a baby:
  - Right: the baby opens it, the pin flies onto its sash, `sayName(name, '!')` when `hasName(name)`, then `say('foal-hooray')`. Dispatch `{ type: 'place/pin', baby, pin, source: 'post', key }`. If the sash already has ten pins, `say('pb-pouch')` and the pin goes into the pouch. When `logged`, `moment.answer()` and `place/result` with `strand: 'name'`, `step: 'name'`, `carrier: name`, `items: [{ item: babyId, result }]`, `place: 'post-box'`.
  - Wrong: the baby sniffs the envelope, shakes its head with a giggle (`say('foal-not-me')`) and pushes it back; `moment.miss()`.
- Focused hint: the envelope's name sounds out its first grapheme (`sound`) while the moonbeam covers all candidates. Ghost: carries the envelope to the right baby.
- Tags show again after each delivery.

- [ ] **Step 3: Write `SashFill.svelte`, `Fewest.svelte` and `Parcel.svelte`**

- `SashFill`: if `task.gift > 0`, first `say('pb-lumi-gift')` and dispatch `{ type: 'place/pot', baby, count: task.gift }` (not a checked moment), pins fly from the moon onto the sash. Then the moment with goal `sashLines(task)`. The pin pot (`aria-label="pin pot"`) takes one stone from `<StoneTray values={wallStones({ total: 10, up: task.has, answer: task.answer, served: null }, game.rng)} ... />` (reuse of `wallStones` from Task A12). `fillOutcome(task.answer, value)`: `done` dispatches `place/pot` with `count: value`, `say('pb-pins-fly')`, `place/result` with `strand: 'm'`, `step: task.served.step`, `items: [{ item: task.served.carrier, result }]`; `many`: the extras bounce back into the pot, `sayAll(['nm-too-many-' + diff])`, `moment.miss()`; `few`: the pins fly on and the empty spots glow, `say('pb-few')`, the pins fly back, `moment.miss()`. Focused: Elizabeth counts the empty spots (`num-1` and on). Ghost: drags the right stone into the pot.
- `Fewest`: three babies with their sashes showing (`task.counts`), a set pin on the desk. Goal `pb-fewest-goal`. Right baby: `place/pin` with `source: 'post'` and key `fewest:<visit>`, `place/result` (`strand: 'm'`, `step: 'M03'`). Wrong: the baby shows its sash, shakes its head, giggles; `moment.miss()`.
- `Parcel`: a parcel with a label (`svg('parcel')` plus the text `task.label` in Andika) and `task.inside` things visible in it (`Heap`-style row). Goal `pb-parcel-goal`. A stone from `wallStones({ total: task.total, up: task.inside, answer: task.answer, served: null }, rng)` dropped on the parcel: `fillOutcome`; done: the things drop in, the lid closes, `sayAll(parcelReadback(task))` after the act, `say('pb-parcel-done')`, `place/result` (`strand: 'm'`, `step: task.served.step`, `items: [{ item: task.served.carrier, result }]`); few and many as the sash. The label's plural is never checked.

- [ ] **Step 4: Write `NoteDesk.svelte`**

`const task = planNote(serve('s', 'post-box', 'note'), noteDefs, game.rng)`. With no task, the desk is free play: she can lay the cards of a random note and send it, not logged.

Three steps on one note card, each a goal:
1. Cards: `sayAll(task.say)`, then `say('nt-cards-goal')`. Empty spots in a row; the shuffled cards below (`aria-label="card <text>"`, the blank card `aria-label="card blank"`). Drop a card on the next spot: `checkCard`. `ok` locks it. `wrong` pops the card back, `moment.miss()` is not called (cards and marks share one moment); `errors.order += 1`. `no-crown` flutters the small card back down and the first spot glows, `say('nt-crown')`, `errors.crown += 1`.
2. End mark: `say('nt-mark-goal')`, three mark gems `.`, `?`, `!` (`aria-label="mark full stop"`, `"mark question"`, `"mark exclamation"`). `markReading(task, m)`: Elizabeth reads the note back with `clip`; wrong: the moon does what the mark says (a wave or a sparkle where she asked), the end spot glows, `errors.mark += 1`; right: the mark locks.
3. Spell: `say('nt-spell-goal')` then `['lb-lets-write', 'word-' + spellWord.toLowerCase(), 'lb-listen', 'word-' + spellWord.toLowerCase()]`; `<GemSlots>` in the blank card with the word's graphemes from `words()` (or one gem per letter when the word is not in the word bank), all slots own; a wrong gem pops out (`errors.spell += 1`).
4. Send: the moonbeam takes the note up (`say('nt-up')`). One `moment.answer()` covers the whole note: dispatch `place/result` with `strand: 's'`, `step: task.served.step`, `carrier: task.note.id`, `items: noteItems(task, errors, result)`, `place: 'post-box'`, and `{ type: 'place/note', note: task.note.id, mark: task.note.mark, gift: noteOutcome(task.note).gift }`. Then `say(noteOutcome(task.note).lumi)` and, for a question, the gift floats down to the meadow.

The moment's `miss()` is called once on the first error of any kind, so the result follows decision D1. Focused hint: Elizabeth says the note again. Ghost: shows the next right card, mark or gem.

- [ ] **Step 5: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/scenes/places/PostBox.svelte games/moon-meadow-home/src/scenes/places/post/ games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts
git commit -m "Add the Post Box with envelopes, sashes, parcels, fewest pins and notes to Lumi"
```

**Acceptance:** after herd 15 and its Building Day, a post bubble brings envelopes she delivers by name, then one maths act at her step, then free play with sashes and the note desk; notes go up to Lumi and come back as a gift, a wave or a sparkle.

### Task B9: Home Book

**Files:**
- Create: `src/core/places/homebook.ts`, `src/scenes/places/HomeBook.svelte`, `src/scenes/places/book/HerdTab.svelte`, `src/scenes/places/book/BabyPage.svelte`, `src/scenes/places/book/PinsTab.svelte`, `src/scenes/places/book/BreedsTab.svelte`, `src/scenes/places/book/AlbumTab.svelte`, `src/scenes/places/book/HomeTab.svelte`, `src/scenes/places/book/SkyTab.svelte`
- Modify: `src/places/scenes.ts` (add `'home-book': HomeBook`), `src/places/hook.ts` (add `book`)
- Test: `tests/places/homebook.test.ts`

**Interfaces:**
- Consumes: `PlacesState`, `Photo` (A1); `BabyView`, `Outfit` (A1); `sashOf`, `setProgress` (B2); `PlotDef` (A12); `DecorDef` (B1); `rowOfPlot` (A12); content `breeds()`; `world.sky`; heartbeat `ownSlots`; `learnerView().passedOrPlaced('S19')`.
- Produces:
  - `type TabId = 'herd' | 'pins' | 'breeds' | 'album' | 'home' | 'sky'`
  - `bookTabs(c: { herd: BabyView[]; s: PlacesState; sky: { index: number; name: string }[] }): TabId[]`
  - `herdPages(herd: BabyView[], alpha: boolean): BabyView[][]`
  - `babyPage(c: { baby: BabyView; s: PlacesState; spellOwn: boolean }): { id: string; name: string; ordinal: number; stage: string; traits: BabyView['traits']; stickers: string[]; sash: string[]; pouch: string[]; photos: Photo[]; outfit: Outfit; spellOwn: boolean }`
  - `breedPages(breeds: { id: string; egg: string | null; building: string | null; picture: string }[], herd: BabyView[]): { id: string; seen: boolean; source: string | null; picture: string }[]`
  - `homeEntries(s: PlacesState, plots: PlotDef[], decorations: DecorDef[]): { plot: string; picture: string; doneT: number; name: string | null }[]`
  - `daysTogether(s: PlacesState): number` (`tz` on `visit.start` is minutes east of UTC)
  - Hook `book`: `{ open(): void; tabs(): string[]; tab(id: string): void; page(babyId: string): object; close(): void }`

- [ ] **Step 1: Write the failing test**

`tests/places/homebook.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { babyPage, bookTabs, breedPages, daysTogether, herdPages, homeEntries } from '../../src/core/places/homebook.ts';
import { decorationDefs, plotDefs } from '../../src/core/places/content.ts';
import { baby, DAY, ev, foldAll, resetSeq, T0 } from './helpers.ts';

beforeEach(resetSeq);
const herd = Array.from({ length: 23 }, (_, i) => baby(`b${i}`, ['Pip', 'Ava', 'Tam'][i % 3], { hatchIndex: i, ordinal: Math.floor(i / 3) + 1 }));

describe('Home Book', () => {
  it('shows a tab only once it has content, in a fixed order', () => {
    expect(bookTabs({ herd: [], s: foldAll([]), sky: [] })).toEqual([]);
    const s = foldAll([
      ev('pin.given', { baby: 'b0', pin: 'star', source: 'pot' }), ev('photo.taken', { place: 'salon', cousin: 'dot', babies: ['b0'] }),
      ev('building.done', { plot: 'bath-pond' }),
    ]);
    expect(bookTabs({ herd, s, sky: [{ index: 1, name: 'Star' }] })).toEqual(['herd', 'pins', 'breeds', 'album', 'home', 'sky']);
    expect(bookTabs({ herd, s: foldAll([]), sky: [] })).toEqual(['herd', 'breeds']);
  });

  it('pages the herd by ten in hatch order, or by name once S19 is passed', () => {
    expect(herdPages(herd, false).map((p) => p.length)).toEqual([10, 10, 3]);
    expect(herdPages(herd, false)[0][0].id).toBe('b0');
    const alpha = herdPages(herd, true).flat();
    expect(alpha[0].name).toBe('Ava');
    expect(alpha[0].ordinal).toBe(1);
    expect(alpha[alpha.length - 1].name).toBe('Tam');
  });

  it('builds a baby page with sash, pouch, photos and outfit', () => {
    const s = foldAll([
      ...Array.from({ length: 11 }, () => ev('pin.given', { baby: 'b0', pin: 'star', source: 'pot' })),
      ev('photo.taken', { place: 'salon', cousin: 'dot', babies: ['b0', 'b1'] }), ev('photo.taken', { place: 'salon', cousin: 'fen', babies: ['b2'] }),
      ev('outfit.saved', { baby: 'b0', outfit: { crown: 'gold-crown' } }),
    ]);
    const p = babyPage({ baby: herd[0], s, spellOwn: true });
    expect(p.sash).toHaveLength(10);
    expect(p.pouch).toEqual(['star']);
    expect(p.photos).toHaveLength(1);
    expect(p.outfit).toEqual({ crown: 'gold-crown' });
    expect(p.spellOwn).toBe(true);
  });

  it('shows breeds she has not hatched as silhouettes with where they come from', () => {
    const breeds = [{ id: 'moon', egg: 'moon', building: null, picture: 'breed-moon' }, { id: 'bubble', egg: null, building: 'bath-pond', picture: 'breed-bubble' }];
    expect(breedPages(breeds, [baby('a', 'Pip', { breed: 'moon' })])).toEqual([
      { id: 'moon', seen: true, source: 'moon', picture: 'breed-moon' },
      { id: 'bubble', seen: false, source: 'bath-pond', picture: 'breed-bubble' },
    ]);
  });

  it('lists every building with its opening day, rows with their names', () => {
    const s = foldAll([ev('building.done', { plot: 'bath-pond' }, 100), ev('row.named', { row: 2, name: 'Rose' }), ev('building.done', { plot: 'row-2' }, 200), ev('building.done', { plot: 'decor-fountain' }, 300)]);
    expect(homeEntries(s, plotDefs, decorationDefs)).toEqual([
      { plot: 'bath-pond', picture: 'place-bath-pond', doneT: 100, name: null },
      { plot: 'row-2', picture: 'place-row', doneT: 200, name: 'Rose' },
      { plot: 'decor-fountain', picture: 'decor-fountain', doneT: 300, name: null },
    ]);
  });

  it('counts days together from v2 nights and local play days', () => {
    const s = foldAll([
      ev('import.v2', { hash: 'h', babies: ['a'], nights: 12 }),
      ev('visit.start', { visit: 'v1', tz: 120 }, T0), ev('visit.start', { visit: 'v2', tz: 120 }, T0 + 3_600_000),
      ev('visit.start', { visit: 'v3', tz: 120 }, T0 + DAY),
    ]);
    expect(daysTogether(s)).toBe(14);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/homebook.test.ts`
Expected: FAIL, cannot resolve `homebook.ts`.

- [ ] **Step 3: Write `homebook.ts`**

```ts
import type { BabyView, Outfit } from './types.ts';
import type { Photo, PlacesState } from './state.ts';
import type { PlotDef } from './building.ts';
import type { DecorDef } from './jewels.ts';
import { rowOfPlot } from './building.ts';
import { sashOf } from './pins.ts';

export type TabId = 'herd' | 'pins' | 'breeds' | 'album' | 'home' | 'sky';

export function bookTabs(c: { herd: BabyView[]; s: PlacesState; sky: { index: number; name: string }[] }): TabId[] {
  const out: TabId[] = [];
  if (c.herd.length) out.push('herd');
  if (Object.values(c.s.pins).some((l) => l.length)) out.push('pins');
  if (c.herd.length) out.push('breeds');
  if (c.s.photos.length) out.push('album');
  if (Object.values(c.s.buildings).some((b) => b.done)) out.push('home');
  if (c.sky.length) out.push('sky');
  return out;
}

export function herdPages(herd: BabyView[], alpha: boolean): BabyView[][] {
  const list = alpha ? [...herd].sort((a, b) => a.name.localeCompare(b.name, 'en-GB') || a.ordinal - b.ordinal) : [...herd].sort((a, b) => a.hatchIndex - b.hatchIndex);
  const pages: BabyView[][] = [];
  for (let i = 0; i < list.length; i += 10) pages.push(list.slice(i, i + 10));
  return pages;
}

export function babyPage(c: { baby: BabyView; s: PlacesState; spellOwn: boolean }) {
  const { sash, pouch } = sashOf(c.s, c.baby.id);
  return {
    id: c.baby.id, name: c.baby.name, ordinal: c.baby.ordinal, stage: c.baby.stage, traits: c.baby.traits, stickers: c.baby.stickers ?? [],
    sash: sash.map((p) => p.pin), pouch: pouch.map((p) => p.pin), photos: c.s.photos.filter((p: Photo) => p.babies.includes(c.baby.id)),
    outfit: (c.s.outfits[c.baby.id] ?? {}) as Outfit, spellOwn: c.spellOwn,
  };
}

export function breedPages(breeds: { id: string; egg: string | null; building: string | null; picture: string }[], herd: BabyView[]) {
  const seen = new Set(herd.map((b) => b.breed));
  return breeds.map((b) => ({ id: b.id, seen: seen.has(b.id), source: b.egg ?? b.building, picture: b.picture }));
}

export function homeEntries(s: PlacesState, plots: PlotDef[], decorations: DecorDef[]) {
  return Object.entries(s.buildings)
    .filter(([, b]) => b.done)
    .sort(([, a], [, b]) => (a.doneT ?? 0) - (b.doneT ?? 0))
    .map(([plot, b]) => {
      const row = rowOfPlot(plot);
      const picture = row !== null ? 'place-row' : plots.find((p) => p.id === plot)?.picture ?? decorations.find((d) => d.id === plot)?.picture ?? plot;
      return { plot, picture, doneT: b.doneT ?? 0, name: row !== null ? s.rowNames[String(row)] ?? null : null };
    });
}

export function daysTogether(s: PlacesState): number {
  const days = new Set(s.visits.map((v) => Math.floor((v.start + v.tz * 60_000) / 86_400_000)));
  return s.nights + days.size;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/homebook.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the Home Book scenes**

- `HomeBook.svelte`: a book (`book-frame`, fallback a cream two-page spread with a moon on the cover). Opened from the crown. First open per visit: `say('hb-open')`. The cover shows the herd count and the days together as numbers (no audio). Picture tabs down the right edge from `bookTabs(...)` (icons: a baby head, a pin, a breed silhouette, a camera, a house, a star), `aria-label="tab <id>"`. A close button (`aria-label="close book"`) calls `toMeadow()`.
- `HerdTab`: one page of ten as a ten-frame (two rows of five) with portraits (`Unicorn face`), name tags under them, page arrows. Order from `herdPages(herd, learnerView().passedOrPlaced('S19'))`. A tap opens `BabyPage`.
- `BabyPage`: big portrait in its outfit, name tag with gems (crowned first gem, the ordinal crown and number for a second Tim), trait badges, the sash (two rows of five pins) and the pin pouch, stickers, photos. A tap on the name plays `sayName(name, '!')` when `hasName(name)`. When `spellOwn` (`ownSlots(graphemes, game.learner).every(Boolean)` for a list name that once needed gifts), a small star by the tag and `say('hb-spell-own')` the first time. A "call out" button (`aria-label="call out"`) dispatches nothing and brings the baby to the meadow front for this visit (session only).
- `PinsTab`: one page per available set (`setProgress`), five spots with the pin or its silhouette, the reward picture when full; then a page of moment pins.
- `BreedsTab`: a grid from `breedPages(breeds(), herd)`: seen breeds in colour, unseen as grey silhouettes with a small picture of their egg or building.
- `AlbumTab`: the photos, newest first, each showing the place, the cousin and the babies in it.
- `HomeTab`: `homeEntries(...)` as picture cards with the date (`toLocaleDateString('en-GB')`).
- `SkyTab`: the sky unicorns from `world.sky` with their names.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/places/homebook.ts games/moon-meadow-home/src/scenes/places/HomeBook.svelte games/moon-meadow-home/src/scenes/places/book/ games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/homebook.test.ts
git commit -m "Add the Home Book with herd, baby pages, pins, breeds, album, home and sky"
```

**Acceptance:** the Home Book opens from the crown, shows only tabs with content, pages the herd by ten (by name from S19), and every baby page shows its sash, pouch, photos and outfit.

### Task B10: Wave B flows

**Files:**
- Create: `flows/places/jewel.sh`, `flows/places/queue.sh`, `flows/places/dressing.sh`, `flows/places/post.sh`, `flows/places/notes.sh`, `flows/places/book.sh`

**Interfaces:**
- Consumes: hooks from Tasks B4, B5, B8, B9; core hook `pass(strand, step)` (emits a real `step.passed` in the test build; added to "Contracts I need"); hook `openings.force(id)` (test build only: dispatches `place/announce`).
- Produces: flows that exit non-zero on failure.

- [ ] **Step 1: Write the flows**

`flows/places/jewel.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pj$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(3); __game.newVisit(); __game.play(); __game.herd(1); __game.pass('s', 'S20'); __game.places.goPlace('meadow'); return true; }"
flow_wait "$S" "() => __game.places.jewels.plot() !== null" "a plot takes the jewel"
flow_expect "$S" "() => __game.places.jewels.box().some((j) => j.step === 'S20' && j.fresh && !j.placedOn)" "fresh jewel waits"
flow_shot "$S" "jewel-waiting-$1x$2"
flow_eval "$S" "() => { __game.places.jewels.drag('S20'); return true; }"
flow_expect "$S" "() => __game.state().places.jewels.S20 === 'salon'" "jewel lit a Salon stone"
flow_eval "$S" "() => { __game.pass('r', 'R30'); __game.pass('m', 'M10'); __game.places.jewels.drag('R30'); __game.places.jewels.drag('M10'); return true; }"
flow_wait "$S" "() => __game.places.edges().length > 0 && __game.state().places.jewels.M10 === 'salon'" "three stones lit"
flow_eval "$S" "async () => { __game.places.building.start('salon'); await __game.places.building.auto(); return true; }"
flow_expect "$S" "() => __game.state().places.buildings.salon.done" "Salon built"
flow_eval "$S" "() => { __game.pass('s', 'S22'); __game.places.jewels.drag('S22'); return true; }"
flow_expect "$S" "() => __game.state().places.buildings['decor-fountain']?.done === true" "decoration built at once"
flow_clean "$S"
flow_close "$S"
```

`flows/places/queue.sh` (the spec's "opening queue over 6 simulated visits"):

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pq$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(25); return true; }"
for v in 2 3 4 5 6 7; do
  flow_eval "$S" "async () => { __game.newVisit(); __game.play(); __game.herd(1); __game.places.goPlace('meadow'); await new Promise((r) => setTimeout(r, 300)); return true; }"
done
flow_expect "$S" "() => JSON.stringify(__game.places.openings.announced().filter((id) => ['bath-pond','bubbles','two-egg','dressing','post-box','notes'].includes(id))) === JSON.stringify(['bath-pond','bubbles','two-egg','dressing','post-box'])" "one opening per visit in order"
flow_clean "$S"
flow_close "$S"
```

`two-egg` is announced by the heartbeat at the nest; if the heartbeat has not shown the two-egg choice in visit 4 of the flow, `dressing` waits a visit and the expectation fails. In that case the flow is right and the heartbeat must call `openingDue` on its first egg of the visit.

`flows/places/dressing.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pd$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(4); __game.places.openings.force('dressing'); __game.places.goPlace('dressing'); return true; }"
flow_wait "$S" "() => __game.places.dressing.babies().length > 0" "babies on the stage"
flow_eval "$S" "() => { const [a, b] = __game.places.dressing.babies(); __game.places.dressing.put(a, 'gold-crown'); __game.places.dressing.put(a, 'pink-cape'); __game.places.dressing.put(b, 'rose-garland'); __game.places.dressing.leave(); return true; }"
flow_expect "$S" "() => Object.keys(__game.state().places.outfits).length === 2" "two outfits saved"
flow_shot "$S" "dressing-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/post.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pp2$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "async () => { __game.play(); __game.herd(15); __game.places.openings.force('post-box'); __game.places.building.start('post-box'); await __game.places.building.auto(); __game.newVisit(); __game.play(); __game.herd(1); __game.places.goPlace('post-box'); return true; }"
flow_wait "$S" "() => __game.places.post.state().phase === 'envelopes'" "post has come"
flow_eval "$S" "() => { const st = __game.places.post.state(); const wrong = st.candidates.find((c) => c !== st.envelope.baby); __game.places.post.give(wrong); __game.places.post.give(st.envelope.baby); return true; }"
flow_eval "$S" "() => { let st = __game.places.post.state(); while (st.phase === 'envelopes') { __game.places.post.give(st.envelope.baby); st = __game.places.post.state(); } return true; }"
flow_expect "$S" "() => ['fewest','sash','parcel','free'].includes(__game.places.post.state().phase)" "maths act after the envelopes"
flow_eval "$S" "() => { const st = __game.places.post.state(); if (st.sash) __game.places.post.drop(st.sash.answer); if (st.parcel) __game.places.post.drop(st.parcel.answer); if (st.fewest) __game.places.post.pick(st.fewest.answer); return true; }"
flow_wait "$S" "() => __game.places.post.state().phase === 'free'" "free play at the end"
flow_shot "$S" "post-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/notes.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pn$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "async () => { __game.play(); __game.herd(15); __game.places.openings.force('post-box'); __game.places.building.start('post-box'); await __game.places.building.auto(); __game.setStep('s', 'S23'); __game.places.goPlace('post-box'); __game.places.notes.open(); return true; }"
flow_wait "$S" "() => __game.places.notes.task() !== null" "note task"
flow_eval "$S" "() => { const t = __game.places.notes.task(); __game.places.notes.place(0, 'c0s'); t.order.forEach((id, i) => __game.places.notes.place(i, id)); const wrong = ['.', '?', '!'].find((m) => m !== t.mark); __game.places.notes.mark(wrong); __game.places.notes.mark(t.mark); __game.places.notes.spell([...t.spellWord]); return true; }"
flow_wait "$S" "() => __game.state().places.notes.length === 1" "note sent to Lumi"
flow_shot "$S" "notes-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`notes.spell(gems)` maps the letters onto the word's graphemes when they join (for example `s`, `h`, `e` onto `sh`, `e`).

`flows/places/book.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pk$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(12); __game.places.book.open(); return true; }"
flow_expect "$S" "() => JSON.stringify(__game.places.book.tabs()) === JSON.stringify(['herd', 'breeds'])" "tabs with content only"
flow_eval "$S" "() => { __game.places.book.tab('herd'); return true; }"
flow_shot "$S" "book-herd-$1x$2"
flow_expect "$S" "() => __game.places.book.page(__game.state().herd[0].id).sash.length === 0" "baby page"
flow_clean "$S"
flow_close "$S"
```

- [ ] **Step 2: Run the Wave B checks**

From `games/moon-meadow-home/`: `npm test && npm run check && npm run check:content && npm run build:test`
Expected: all pass.

From the repo root, outside the sandbox: `sh games/moon-meadow-home/flows/places/run.sh meadow label pond building parent jewel queue dressing post notes book`
Expected: every line `ok:`. Look at the screenshots in `$TMPDIR/flows/`.

- [ ] **Step 3: Commit**

```bash
git add games/moon-meadow-home/flows/places/
git commit -m "Add the Wave B place flows"
```

**Acceptance (Wave B done):** jewels light plots and decorations, the queue brings one thing per visit, the Dressing Corner, Post Box with notes and the Home Book work at all three landscape sizes with no missing clips and no console errors, and the Wave A flows still pass.

---

# Wave C: releases 1.2 and 1.3 (items 20 to 24 and 26)

Starts after Wave B passes. Item 25 (save server, pairing and sync) belongs to the sync workstream; Task C8 builds its parent corner screens on the sync client's interface.

### Task C1: Sparkle Salon cards and cousins

**Files:**
- Create: `src/core/places/salon.ts`, `content/places/cousins.json`, `content/places/salon.json`
- Modify: `src/core/places/content.ts` (add `cousinDefs`, `salonDefs`)
- Test: `tests/places/salon.test.ts`

**Interfaces:**
- Consumes: `planOneOrMany` (A8); `trimTask` (A12); `PlacesState`, `currentVisit` (A1); `ServedItem`, `WordView`, `Rng` (A1); `released`.
- Produces:
  - `type CousinDef = { id: string; name: string; clip: string; colours: { body: string; mane: string; mane2: string }; release: string; novelty?: string }`
  - `cousinsAvailable(s: PlacesState, release: string): CousinDef[]`
  - `cousinWaiting(s: PlacesState, release: string): CousinDef | null` (the Salon is built and no cousin photo this visit; the cousin rotates by visit index)
  - `type SalonOption = { id: string; thing: string; colour: string | null; size: 'big' | 'tiny'; many: boolean; picture: string }`
  - `type CardLine = { kind: 'word' | 'plural' | 'adjective' | 'and' | 'beads'; text: string; clip: string | null; options: SalonOption[]; answer: string[]; dots: 500 | 300 | null; served: ServedItem; beads?: { shown: string[]; answer: string; options: string[] } }`
  - `type StyleCard = { cousin: CousinDef; lines: CardLine[] }`
  - `planCard(c: { cousin: CousinDef; reading: ServedItem[]; pattern: ServedItem | null; words: WordView[]; rng: Rng }): StyleCard | null`
  - `checkLine(line: CardLine, given: string[]): { ok: boolean; wrong: string | null; complete: boolean }`

- [ ] **Step 1: Write the content files**

`content/places/cousins.json`:

```json
{
  "cousins": [
    { "id": "dot", "name": "Dot", "clip": "name-cousin-dot", "colours": { "body": "#f9d3e3", "mane": "#9cc8f2", "mane2": "#ffffff" }, "release": "1.2" },
    { "id": "fen", "name": "Fen", "clip": "name-cousin-fen", "colours": { "body": "#cdeedd", "mane": "#c3a6ef", "mane2": "#ffffff" }, "release": "1.2" },
    { "id": "bex", "name": "Bex", "clip": "name-cousin-bex", "colours": { "body": "#fff1c9", "mane": "#f5a3c7", "mane2": "#ffffff" }, "release": "1.2", "novelty": "cousin-bex" }
  ]
}
```

`content/places/salon.json`:

```json
{
  "colours": { "red": "#e8505b", "pink": "#f28ab2", "blue": "#6aa9e9", "green": "#6cc58a" },
  "adjective": [
    { "id": "big-red-bow", "size": "big", "colour": "red", "thing": "bow" },
    { "id": "tiny-red-bow", "size": "tiny", "colour": "red", "thing": "bow" },
    { "id": "big-pink-bow", "size": "big", "colour": "pink", "thing": "bow" },
    { "id": "tiny-pink-bow", "size": "tiny", "colour": "pink", "thing": "bow" },
    { "id": "big-blue-bow", "size": "big", "colour": "blue", "thing": "bow" },
    { "id": "tiny-blue-bow", "size": "tiny", "colour": "blue", "thing": "bow" },
    { "id": "big-green-clip", "size": "big", "colour": "green", "thing": "clip" },
    { "id": "tiny-green-clip", "size": "tiny", "colour": "green", "thing": "clip" },
    { "id": "big-pink-clip", "size": "big", "colour": "pink", "thing": "clip" },
    { "id": "tiny-pink-clip", "size": "tiny", "colour": "pink", "thing": "clip" },
    { "id": "big-red-star", "size": "big", "colour": "red", "thing": "star" },
    { "id": "tiny-red-star", "size": "tiny", "colour": "red", "thing": "star" },
    { "id": "big-blue-star", "size": "big", "colour": "blue", "thing": "star" },
    { "id": "tiny-blue-star", "size": "tiny", "colour": "blue", "thing": "star" },
    { "id": "big-green-star", "size": "big", "colour": "green", "thing": "star" },
    { "id": "tiny-green-star", "size": "tiny", "colour": "green", "thing": "star" }
  ],
  "and": [
    { "id": "bow-clip", "things": ["bow", "clip"] },
    { "id": "star-bow", "things": ["star", "bow"] },
    { "id": "clip-star", "things": ["clip", "star"] },
    { "id": "bow-bell", "things": ["bow", "bell"] },
    { "id": "comb-bow", "things": ["comb", "bow"] },
    { "id": "star-shell", "things": ["star", "shell"] }
  ],
  "things": ["bow", "clip", "star", "bell", "comb", "shell"]
}
```

The adjective line text is `a <size> <colour> <thing>` and its clip `sl-ph-<id>`; the "and" line text is `a <thing> and a <thing>` and its clip `sl-and-<id>`. Bows, clips and stars are drawn by `places-svg.ts` with colour and size (decision D16); bells, combs and shells use their word pictures.

Add to `src/core/places/content.ts`:

```ts
import cousinsJson from '../../../content/places/cousins.json' with { type: 'json' };
import salonJson from '../../../content/places/salon.json' with { type: 'json' };
import type { CousinDef } from './salon.ts';
export const cousinDefs: CousinDef[] = cousinsJson.cousins;
export const salonDefs = salonJson as unknown as {
  colours: Record<string, string>;
  adjective: { id: string; size: 'big' | 'tiny'; colour: string; thing: string }[];
  and: { id: string; things: [string, string] }[];
  things: string[];
};
```

- [ ] **Step 2: Write the failing test**

`tests/places/salon.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { checkLine, cousinsAvailable, cousinWaiting, planCard } from '../../src/core/places/salon.ts';
import { cousinDefs, salonDefs } from '../../src/core/places/content.ts';
import { ev, foldAll, resetSeq, rng, served, word } from './helpers.ts';

beforeEach(resetSeq);
const sw = (id: string, g: string[]) => word(id, g, { tags: ['salon'], plural: { word: `${id}s`, ending: 's', graphemes: [...g, 's'] } });
const words = [sw('bow', ['b', 'ow']), sw('clip', ['c', 'l', 'i', 'p']), sw('bell', ['b', 'e', 'll']), sw('comb', ['c', 'o', 'mb']), sw('shell', ['sh', 'e', 'll']), sw('star', ['s', 't', 'ar']), word('dog', ['d', 'o', 'g'])];
const dot = cousinDefs[0];

describe('cousins', () => {
  it('has Dot and Fen, and Bex after the novelty', () => {
    expect(cousinsAvailable(foldAll([]), '1.3').map((c) => c.name)).toEqual(['Dot', 'Fen']);
    const s = foldAll([ev('visit.start', { visit: 'v1', tz: 0 }), ev('opening.announced', { opening: 'novelty:cousin-bex' })]);
    expect(cousinsAvailable(s, '1.3').map((c) => c.name)).toEqual(['Dot', 'Fen', 'Bex']);
  });
  it('waits at the Salon once per visit after it is built', () => {
    expect(cousinWaiting(foldAll([ev('visit.start', { visit: 'v1', tz: 0 })]), '1.3')).toBeNull();
    const s = foldAll([ev('building.done', { plot: 'salon' }), ev('visit.start', { visit: 'v1', tz: 0 })]);
    expect(cousinWaiting(s, '1.3')?.id).toBe('fen');
    const after = foldAll([ev('building.done', { plot: 'salon' }), ev('visit.start', { visit: 'v1', tz: 0 }), ev('photo.taken', { place: 'salon', cousin: 'fen', babies: [] })]);
    expect(cousinWaiting(after, '1.3')).toBeNull();
  });
});

describe('style cards', () => {
  it('makes a word line from a salon word with three or more pictured choices', () => {
    const card = planCard({ cousin: dot, reading: [served('r', 'R10', 'shell', ['sh'])], pattern: null, words, rng: rng(1) })!;
    const line = card.lines[0];
    expect(line.kind).toBe('word');
    expect(line.text).toBe('shell');
    expect(line.options.length).toBeGreaterThanOrEqual(3);
    expect(line.answer).toHaveLength(1);
    expect(line.options.map((o) => o.id)).toContain(line.answer[0]);
    expect(line.clip).toBe('word-shell');
  });

  it('makes an adjective line whose wrong choices differ in exactly one way', () => {
    const line = planCard({ cousin: dot, reading: [served('r', 'R27', 'adjective', ['adjective'])], pattern: null, words, rng: rng(2) })!.lines[0];
    expect(line.kind).toBe('adjective');
    expect(line.text).toMatch(/^a (big|tiny) (red|pink|blue|green) (bow|clip|star)$/);
    expect(line.clip).toMatch(/^sl-ph-/);
    const target = line.options.find((o) => o.id === line.answer[0])!;
    for (const o of line.options.filter((x) => x.id !== target.id)) {
      const diffs = [o.size !== target.size, o.colour !== target.colour, o.thing !== target.thing].filter(Boolean).length;
      expect(diffs).toBe(1);
    }
  });

  it('makes an "and" line that needs both things', () => {
    const line = planCard({ cousin: dot, reading: [served('r', 'R28', 'and', ['and'])], pattern: null, words, rng: rng(3) })!.lines[0];
    expect(line.kind).toBe('and');
    expect(line.answer).toHaveLength(2);
    expect(line.options.length).toBeGreaterThanOrEqual(4);
    const [a, b] = line.answer;
    expect(checkLine(line, [a])).toEqual({ ok: true, wrong: null, complete: false });
    expect(checkLine(line, [a, b])).toEqual({ ok: true, wrong: null, complete: true });
    const other = line.options.find((o) => !line.answer.includes(o.id))!.id;
    expect(checkLine(line, [a, other])).toEqual({ ok: false, wrong: other, complete: false });
  });

  it('makes a plural line with one or many', () => {
    const line = planCard({ cousin: dot, reading: [served('r', 'R19', 'bow', ['-s'], { kind: 'review' })], pattern: null, words, rng: rng(4) })!.lines[0];
    expect(line.kind).toBe('plural');
    expect(line.text).toBe('bows');
    expect(line.options.find((o) => o.id === line.answer[0])?.many).toBe(true);
  });

  it('adds a bead line for an M08 pattern', () => {
    const card = planCard({ cousin: dot, reading: [], pattern: served('m', 'M08', 'ABB', ['ABB']), words, rng: rng(5) })!;
    expect(card.lines.map((l) => l.kind)).toEqual(['beads']);
    expect(card.lines[0].beads!.options).toHaveLength(3);
  });

  it('skips a reading item with no salon picture and returns null with nothing to show', () => {
    expect(planCard({ cousin: dot, reading: [served('r', 'R03', 'dog', ['g'])], pattern: null, words, rng: rng(1) })).toBeNull();
  });

  it('shows at most two reading lines and one bead line, one at a time', () => {
    const card = planCard({ cousin: dot, reading: [served('r', 'R27', 'a', ['a']), served('r', 'R10', 'shell', ['sh']), served('r', 'R28', 'and', ['and'])], pattern: served('m', 'M08', 'AB', ['AB']), words, rng: rng(6) })!;
    expect(card.lines.map((l) => l.kind)).toEqual(['adjective', 'word', 'beads']);
  });

  it('uses the content lists', () => {
    expect(salonDefs.adjective).toHaveLength(16);
    expect(salonDefs.and).toHaveLength(6);
  });
});
```

`cousinWaiting` in the second test returns `fen`: the visit index is 1, and the cousin is `available[index % available.length]`, with Dot at 0 and Fen at 1.

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/salon.test.ts`
Expected: FAIL, cannot resolve `salon.ts`.

- [ ] **Step 4: Write `salon.ts`**

```ts
import type { Rng, ServedItem, WordView } from './types.ts';
import { currentVisit, type PlacesState } from './state.ts';
import { cousinDefs, released, salonDefs } from './content.ts';
import { planOneOrMany } from './plurals.ts';
import { trimTask } from './building.ts';

export type CousinDef = { id: string; name: string; clip: string; colours: { body: string; mane: string; mane2: string }; release: string; novelty?: string };
export type SalonOption = { id: string; thing: string; colour: string | null; size: 'big' | 'tiny'; many: boolean; picture: string };
export type CardLine = {
  kind: 'word' | 'plural' | 'adjective' | 'and' | 'beads'; text: string; clip: string | null; options: SalonOption[]; answer: string[];
  dots: 500 | 300 | null; served: ServedItem; beads?: { shown: string[]; answer: string; options: string[] };
};
export type StyleCard = { cousin: CousinDef; lines: CardLine[] };

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const pick = <T>(a: T[], rng: Rng): T => a[Math.floor(rng() * a.length)];
const dotsOf = (sc: 1 | 2 | 3) => (sc === 1 ? 500 : sc === 2 ? 300 : null) as 500 | 300 | null;
const extraCount = (sc: 1 | 2 | 3) => (sc === 1 ? 0 : sc === 2 ? 1 : 3);
const plain = (thing: string, picture = `${thing}`): SalonOption => ({ id: `${thing}:1`, thing, colour: null, size: 'big', many: false, picture });

export function cousinsAvailable(s: PlacesState, release: string): CousinDef[] {
  return cousinDefs.filter((c) => released(c.release, release) && (!c.novelty || s.unlocked.includes(c.novelty)));
}

export function cousinWaiting(s: PlacesState, release: string): CousinDef | null {
  const v = currentVisit(s);
  if (!v || !s.buildings.salon?.done || v.cousins.length) return null;
  const list = cousinsAvailable(s, release);
  return list.length ? list[v.index % list.length] : null;
}

function wordLine(item: ServedItem, words: WordView[], rng: Rng): CardLine | null {
  const pool = words.filter((w) => w.tags.includes('salon'));
  const target = pool.find((w) => w.id === item.carrier);
  if (!target) return null;
  const others = shuffle(pool.filter((w) => w.id !== target.id), rng).slice(0, 2 + extraCount(item.scaffold));
  if (others.length < 2) return null;
  const options = shuffle([target, ...others].map((w) => plain(w.word, w.picture)), rng);
  return { kind: 'word', text: target.word, clip: `word-${target.word}`, options, answer: [`${target.word}:1`], dots: dotsOf(item.scaffold), served: item };
}

function pluralLine(item: ServedItem, words: WordView[], rng: Rng): CardLine | null {
  const pool = words.filter((w) => w.tags.includes('salon') && w.plural);
  const target = pool.find((w) => w.id === item.carrier);
  if (!target) return null;
  const plural = item.items.some((i) => i === '-s' || i === '-es');
  const t = planOneOrMany(target, plural, item.scaffold, pool, rng);
  if (!t) return null;
  return {
    kind: 'plural', text: t.shown, clip: `word-${t.shown}`, dots: t.dots, served: item, answer: [t.answer],
    options: t.options.map((o) => ({ id: o.id, thing: o.word, colour: null, size: 'big', many: o.many, picture: o.picture })),
  };
}

function adjectiveLine(item: ServedItem, rng: Rng): CardLine {
  const p = pick(salonDefs.adjective, rng);
  const opt = (size: 'big' | 'tiny', colour: string, thing: string): SalonOption => ({ id: `${size}-${colour}-${thing}`, thing, colour, size, many: false, picture: thing });
  const target = opt(p.size, p.colour, p.thing);
  const otherColour = pick(Object.keys(salonDefs.colours).filter((c) => c !== p.colour), rng);
  const otherSize = p.size === 'big' ? 'tiny' : 'big';
  const otherThing = pick(['bow', 'clip', 'star'].filter((t) => t !== p.thing), rng);
  const pool = [opt(p.size, otherColour, p.thing), opt(otherSize, p.colour, p.thing), opt(p.size, p.colour, otherThing)];
  const distractors = pool.slice(0, 2 + Math.min(1, extraCount(item.scaffold)));
  return {
    kind: 'adjective', text: `a ${p.size} ${p.colour} ${p.thing}`, clip: `sl-ph-${p.id}`, options: shuffle([target, ...distractors], rng),
    answer: [target.id], dots: dotsOf(item.scaffold), served: item,
  };
}

function andLine(item: ServedItem, rng: Rng): CardLine {
  const p = pick(salonDefs.and, rng);
  const others = shuffle(salonDefs.things.filter((t) => !p.things.includes(t)), rng).slice(0, 2 + extraCount(item.scaffold));
  return {
    kind: 'and', text: `a ${p.things[0]} and a ${p.things[1]}`, clip: `sl-and-${p.id}`,
    options: shuffle([...p.things, ...others].map((t) => plain(t)), rng), answer: p.things.map((t) => `${t}:1`), dots: dotsOf(item.scaffold), served: item,
  };
}

export function planCard(c: { cousin: CousinDef; reading: ServedItem[]; pattern: ServedItem | null; words: WordView[]; rng: Rng }): StyleCard | null {
  const lines: CardLine[] = [];
  for (const item of c.reading) {
    if (lines.length === 2) break;
    const line = item.step === 'R27' ? adjectiveLine(item, c.rng) : item.step === 'R28' ? andLine(item, c.rng) : item.step === 'R19' ? pluralLine(item, c.words, c.rng) : wordLine(item, c.words, c.rng);
    if (line) lines.push(line);
  }
  const trim = trimTask(c.pattern, c.rng);
  if (trim.checked) {
    lines.push({ kind: 'beads', text: '', clip: null, options: [], answer: [trim.answer], dots: null, served: trim.served, beads: { shown: trim.shown, answer: trim.answer, options: trim.options } });
  }
  return lines.length ? { cousin: c.cousin, lines } : null;
}

export function checkLine(line: CardLine, given: string[]): { ok: boolean; wrong: string | null; complete: boolean } {
  const wrong = given.find((g) => !line.answer.includes(g)) ?? null;
  if (wrong) return { ok: false, wrong, complete: false };
  return { ok: true, wrong: null, complete: line.answer.every((a) => given.includes(a)) };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/salon.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/core/places/salon.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/cousins.json games/moon-meadow-home/content/places/salon.json games/moon-meadow-home/tests/places/salon.test.ts
git commit -m "Add Sparkle Salon style cards and visiting cousins"
```

**Acceptance:** a cousin waits once per visit after the Salon is built; style cards have one to three lines (a word, a plural, an adjective phrase, two things joined by "and", a bead row) with three or more choices each.

### Task C2: Sparkle Salon scene

**Files:**
- Create: `src/scenes/places/Salon.svelte`, `src/scenes/places/salon/StyleCard.svelte`, `src/scenes/places/salon/FreeStyle.svelte`
- Modify: `src/scenes/places/Meadow.svelte` (`cousinWaitingNow` returns `cousinWaiting(s, CURRENT_RELEASE)?.id ?? null`), `src/places/scenes.ts` (add `salon: Salon`), `src/places/hook.ts` (add `salon`)

**Interfaces:**
- Consumes: Task C1 exports; `companions` (Task C6, until then `recentTouches()`); `createMoment` (A3); `fullSetRewards` (B2); heartbeat `PrintWithDots`, `Unicorn`; planner `nextItem` with `salon/salon-word` (called twice) and `salon/pattern`.
- Produces: Hook `salon`: `{ card(): { cousin: string; line: number; lines: { kind: string; text: string; answer: string[]; options: string[] }[] } | null; give(optionId: string): void; bead(colour: string): void; photo(): void; style(baby: string, tool: 'brush' | 'beads' | 'bow' | 'mist'): void }`

- [ ] **Step 1: Write the scene**

`Salon.svelte`, background `bg-salon` (fallback: a pink room with a mirror, a chair and a tool shelf); with `reward-salon-flower-arch` in `fullSetRewards`, a flower arch frames the door.
1. On enter: `say('sl-welcome')` the first time per visit.
2. If `cousinWaiting(s, release)` and `planCard({ cousin, reading: [serve('r', 'salon', 'salon-word'), serve('r', 'salon', 'salon-word')].filter(Boolean), pattern: serve('m', 'salon', 'pattern'), words: words(), rng })` returns a card: the cousin walks in (`Unicorn` with the cousin colours), `say(cousin.clip)`, then `<StyleCard card />`.
3. After the card, or with no card: `<FreeStyle />` with `say('sl-free')`.
4. Photo: a camera button (`aria-label="photo"`) after the card, or after two styles in free play: flash (opacity), `say('sl-photo')`, dispatch `{ type: 'place/photo', place: 'salon', cousin: cousin?.id ?? null, babies: companionsNow() }`, the photo flies to the crown (the album), then `<MeadowArrow />`.

- [ ] **Step 2: Write `StyleCard.svelte`**

The card shows one line at a time with an empty tick box (rule 1 of spec 2.11). A line starts a moment (`strand` `r` for reading lines, `m` for beads) with goal `sl-card` for the first line and `sl-next` after, or `sl-beads` for a bead line.
- Reading lines: `<PrintWithDots text={line.text} dots={line.dots} hearts={...} />`. The options lie on the tool shelf (bows, clips and stars as `svg('bow' | 'clip' | 'star', { colour, size })`, others as word pictures, heaps for `many`), `aria-label="tool <id>"`. Before she acts a tap only plays `sfx('pop')`. She drags an option to the cousin's mane. `checkLine(line, given)`:
  - wrong: the cousin looks in the mirror at the wrong thing, tilts its head and giggles (`say('foal-giggle')`); the thing floats back; the deciding word glows (the colour, the size, the thing, the ending or "and"); `moment.miss()`.
  - ok and not complete (the first thing of an "and" line): it stays in the mane.
  - complete: `moment.answer()`, the tick appears, `say(line.clip)` reads the line after the act, `place/result` with `strand: 'r'`, `step: line.served.step`, `carrier: line.text`, `items: line.served.items.map((item) => ({ item, result }))`, `place: 'salon'`.
- Bead lines: a braid with `beads.shown` and one empty bead spot; three beads (`aria-label="bead <colour>"`). Wrong: the braid springs loose with a boing (`sfx('pop')`) and the wrong bead glows until swapped; `moment.miss()`. Right: tick, `place/result` with `strand: 'm'`, `step: 'M08'`.
- Focused hint: the line's sounds play slowly (`dots: 500`) with the moonbeam over the whole shelf. Ghost: carries the right thing to the mane.

- [ ] **Step 3: Write `FreeStyle.svelte`**

Up to six babies (`companionsNow()` first, then the newest), one in the chair at a time (`aria-label="chair"`). Tools: brush (strokes play `sfx('sparkle')` and smooth the mane), beads (three colours), bows (four colours), sparkle mist (a puff of opacity sparkles), mirror (the baby admires itself, `say('foal-pretty')` once per baby). Leaving the chair saves `{ type: 'place/outfit', baby, outfit: { ...outfitOf(s, baby), bow, beads, mist } }` when it changed. Free play: nothing is checked, items say their name when tapped (`say('word-<thing>')` when `has()`).

- [ ] **Step 4: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/scenes/places/Salon.svelte games/moon-meadow-home/src/scenes/places/salon/ games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts
git commit -m "Add the Sparkle Salon with cousin style cards, free styling and photos"
```

**Acceptance:** after its Building Day the Salon opens; a cousin bubble brings a style card read one line at a time with funny mistakes; free styling saves the look; the photo goes to the album and the visit ends with the meadow arrow.

### Task C3: Valley map with mist

**Files:**
- Create: `src/core/places/valley.ts`, `src/scenes/places/Valley.svelte`
- Modify: `src/places/scenes.ts` (add `valley: Valley`), `src/places/hook.ts` (add `valley`)
- Test: `tests/places/valley.test.ts`

**Interfaces:**
- Consumes: `PlacesState` (A1); `PlotDef`, `plotDefs` (A12); `jewelPlot` (B1); `released`.
- Produces:
  - `type MapIcon = { id: string; area: string; x: number; y: number; state: 'home' | 'open' | 'next'; scene: string; params: Record<string, unknown> }`
  - `AREAS: readonly ['meadow', 'stable-yard', 'village-lane', 'castle-hill', 'sky']`
  - `valleyView(c: { s: PlacesState; release: string; reached: (step: string) => boolean; plots?: PlotDef[] }): { icons: MapIcon[]; mist: string[] }`
  - Hook `valley`: `{ icons(): string[]; mist(): string[]; tap(id: string): void }`

- [ ] **Step 1: Write the failing test**

`tests/places/valley.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { AREAS, valleyView } from '../../src/core/places/valley.ts';
import { plotDefs } from '../../src/core/places/content.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const none = () => false;
const ids = (s: ReturnType<typeof foldAll>) => valleyView({ s, release: '1.3', reached: none }).icons.map((i) => `${i.id}:${i.state}`);

describe('valley map', () => {
  it('always shows the meadow and the stables, and the next plot under its sign', () => {
    expect(ids(foldAll([]))).toEqual(['meadow:home', 'stables:home', 'salon:next']);
  });

  it('opens the places she has', () => {
    const s = foldAll([
      ev('visit.start', { visit: 'v1', tz: 0 }), ev('building.done', { plot: 'bath-pond' }), ev('opening.announced', { opening: 'dressing' }),
      ev('opening.announced', { opening: 'letter-lane' }), ev('building.done', { plot: 'post-box' }),
    ]);
    expect(ids(s)).toEqual(['meadow:home', 'stables:home', 'bath-pond:open', 'post-box:open', 'letter-lane:open', 'dressing:open', 'salon:next']);
  });

  it('keeps mist over areas with nothing open, never over the next plot', () => {
    expect(valleyView({ s: foldAll([]), release: '1.3', reached: none }).mist).toEqual(['castle-hill', 'sky']);
    const built = foldAll([...['S20', 'R30', 'M10'].map((j) => ev('jewel.placed', { jewel: j, plot: 'salon' })), ev('building.done', { plot: 'salon' })]);
    expect(ids(built)).toContain('salon:open');
  });

  it('has at most eight buildings per area', () => {
    for (const a of AREAS) expect(plotDefs.filter((p) => p.area === a).length).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/valley.test.ts`
Expected: FAIL, cannot resolve `valley.ts`.

- [ ] **Step 3: Write `valley.ts`**

```ts
import type { PlacesState } from './state.ts';
import type { PlotDef } from './building.ts';
import { plotDefs, released } from './content.ts';
import { jewelPlot } from './jewels.ts';

export const AREAS = ['meadow', 'stable-yard', 'village-lane', 'castle-hill', 'sky'] as const;
export type MapIcon = { id: string; area: string; x: number; y: number; state: 'home' | 'open' | 'next'; scene: string; params: Record<string, unknown> };

export function valleyView(c: { s: PlacesState; release: string; reached: (step: string) => boolean; plots?: PlotDef[] }): { icons: MapIcon[]; mist: string[] } {
  const plots = c.plots ?? plotDefs;
  const icons: MapIcon[] = [
    { id: 'meadow', area: 'meadow', x: 300, y: 640, state: 'home', scene: 'meadow', params: {} },
    { id: 'stables', area: 'stable-yard', x: 560, y: 560, state: 'home', scene: 'stalls', params: {} },
  ];
  for (const p of plots) {
    if (!released(p.release, c.release)) continue;
    const open = p.kind === 'place' ? Boolean(p.opening && p.opening in c.s.announced) : Boolean(c.s.buildings[p.id]?.done);
    if (open) icons.push({ id: p.id, area: p.area, x: p.map[0], y: p.map[1], state: 'open', scene: p.id, params: {} });
  }
  const next = jewelPlot({ s: c.s, release: c.release, reached: c.reached, plots, decorations: [] });
  if (next) {
    const p = plots.find((x) => x.id === next.plot)!;
    icons.push({ id: p.id, area: p.area, x: p.map[0], y: p.map[1], state: 'next', scene: 'meadow', params: { jewel: p.id } });
  }
  const clear = new Set(icons.map((i) => i.area));
  return { icons, mist: AREAS.filter((a) => !clear.has(a)) };
}
```

Order check for the second test: `plotDefs` lists `bath-pond`, `post-box`, `letter-lane`, `dressing`, then `salon`, so the open icons come in that order, followed by the next plot.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/valley.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write `Valley.svelte`**

A painted map (`bg-valley`, fallback: five soft areas in CSS gradients with a path between them). Icons from `valleyView` use their place pictures at 96 px with `aria-label="map <id>"`; `next` shows the picture sign with a gentle glow; areas in `mist` are covered by `svg('mist')` layers that drift slowly (transform). A tap on an open icon calls `enterPlace` with its scene; a tap on the next plot returns to the meadow, where the jewel guidance runs. The moon (`aria-label="moon"`) starts goodnight. The first time (`once('valley')` and the opening `valley-map` just announced), `say('vm-this-is-valley')`. A close arrow returns to the meadow. Mounted from the map scroll edge (Task A7).

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/places/valley.ts games/moon-meadow-home/src/scenes/places/Valley.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/valley.test.ts
git commit -m "Add the valley map with open places, the next plot and mist"
```

**Acceptance:** the map scroll opens a valley with the meadow, stables, every open place and the next plot; areas with nothing open stay in mist; a tap goes to the place.

### Task C4: Letter Lane

**Files:**
- Create: `src/core/places/letterLane.ts`, `content/places/letters.json`, `src/scenes/places/LetterLane.svelte`
- Modify: `src/core/places/content.ts` (add `letterDefs`), `src/places/scenes.ts` (add `'letter-lane': LetterLane`), `src/places/hook.ts` (add `lane`)
- Test: `tests/places/letterLane.test.ts`

**Interfaces:**
- Consumes: `BabyView`, `ServedItem`, `Rng` (A1); `createMoment` (A3); planner `serve('s', 'letter-lane', 'letters')`.
- Produces:
  - `type LetterDef = { letter: string; sound: string; name: string }`
  - `type Arch = { letter: string; sound: string; lit: boolean; babies: string[] }`
  - `arches(herd: BabyView[], letters?: LetterDef[]): Arch[]`
  - `type FlagTask = { kind: 'flag'; letter: string; options: string[]; served: ServedItem }`
  - `type GapTask = { kind: 'gap'; shown: (string | null)[]; answer: string; options: string[]; served: ServedItem }`
  - `planLetterTask(item: ServedItem | null, rng: Rng): FlagTask | GapTask | null`
  - Hook `lane`: `{ arches(): { letter: string; lit: boolean }[]; tapArch(letter: string): void; task(): { kind: string; letter?: string; answer?: string; options: string[] } | null; answer(letter: string): void }`

- [ ] **Step 1: Write the content file**

`content/places/letters.json` (sound is the phonics library grapheme played on a tap; name is the letter-name clip):

```json
{
  "letters": [
    { "letter": "a", "sound": "a", "name": "word-letter-a" }, { "letter": "b", "sound": "b", "name": "word-letter-b" },
    { "letter": "c", "sound": "c", "name": "word-letter-c" }, { "letter": "d", "sound": "d", "name": "word-letter-d" },
    { "letter": "e", "sound": "e", "name": "word-letter-e" }, { "letter": "f", "sound": "f", "name": "word-letter-f" },
    { "letter": "g", "sound": "g", "name": "word-letter-g" }, { "letter": "h", "sound": "h", "name": "word-letter-h" },
    { "letter": "i", "sound": "i", "name": "word-letter-i" }, { "letter": "j", "sound": "j", "name": "word-letter-j" },
    { "letter": "k", "sound": "k", "name": "word-letter-k" }, { "letter": "l", "sound": "l", "name": "word-letter-l" },
    { "letter": "m", "sound": "m", "name": "word-letter-m" }, { "letter": "n", "sound": "n", "name": "word-letter-n" },
    { "letter": "o", "sound": "o", "name": "word-letter-o" }, { "letter": "p", "sound": "p", "name": "word-letter-p" },
    { "letter": "q", "sound": "qu", "name": "word-letter-q" }, { "letter": "r", "sound": "r", "name": "word-letter-r" },
    { "letter": "s", "sound": "s", "name": "word-letter-s" }, { "letter": "t", "sound": "t", "name": "word-letter-t" },
    { "letter": "u", "sound": "u", "name": "word-letter-u" }, { "letter": "v", "sound": "v", "name": "word-letter-v" },
    { "letter": "w", "sound": "w", "name": "word-letter-w" }, { "letter": "x", "sound": "x", "name": "word-letter-x" },
    { "letter": "y", "sound": "y", "name": "word-letter-y" }, { "letter": "z", "sound": "z", "name": "word-letter-z" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import lettersJson from '../../../content/places/letters.json' with { type: 'json' };
import type { LetterDef } from './letterLane.ts';
export const letterDefs: LetterDef[] = lettersJson.letters;
```

- [ ] **Step 2: Write the failing test**

`tests/places/letterLane.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { arches, planLetterTask } from '../../src/core/places/letterLane.ts';
import { baby, rng, served } from './helpers.ts';

describe('Letter Lane (decision D15)', () => {
  it('has 26 arches in alphabet order, lit by the first letters of her babies', () => {
    const a = arches([baby('a', 'Pip'), baby('b', 'Charlotte'), baby('c', 'pom'), baby('d', 'Ava')]);
    expect(a.map((x) => x.letter).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(a.filter((x) => x.lit).map((x) => x.letter)).toEqual(['a', 'c', 'p']);
    expect(a.find((x) => x.letter === 'p')!.babies).toEqual(['a', 'c']);
    expect(a.find((x) => x.letter === 'z')).toMatchObject({ lit: false, babies: [] });
  });

  it('works for a herd of none', () => {
    expect(arches([]).every((x) => !x.lit)).toBe(true);
  });

  it('plans a flag for a pair item with three capital arches, mirror letters first', () => {
    const t = planLetterTask(served('s', 'S19', 'pair-b', ['pair-b']), rng(1));
    if (!t || t.kind !== 'flag') throw new Error('expected a flag task');
    expect(t.letter).toBe('b');
    expect(t.options).toHaveLength(3);
    expect(t.options).toContain('B');
    expect(t.options.some((o) => o === 'D' || o === 'P')).toBe(true);
  });

  it('plans a gap for an order item with the missing letter among three', () => {
    const t = planLetterTask(served('s', 'S19', 'order-n', ['order-n']), rng(2));
    if (!t || t.kind !== 'gap') throw new Error('expected a gap task');
    expect(t.answer).toBe('n');
    expect(t.shown.filter((x) => x === null)).toHaveLength(1);
    expect(t.shown.join('')).toBe(['k', 'l', 'm', 'o', 'p'].filter((l) => t.shown.includes(l)).join(''));
    expect(t.options).toHaveLength(3);
    expect(t.options).toContain('n');
    expect(new Set(t.options).size).toBe(3);
  });

  it('keeps the gap inside the alphabet at the ends', () => {
    for (const l of ['a', 'z']) {
      const t = planLetterTask(served('s', 'S19', `order-${l}`, [`order-${l}`]), rng(3));
      if (!t || t.kind !== 'gap') throw new Error('expected a gap task');
      expect(t.shown).toHaveLength(5);
      expect(t.shown.every((x) => x === null || /^[a-z]$/.test(x))).toBe(true);
    }
  });

  it('has no task without an S19 item', () => {
    expect(planLetterTask(null, rng(1))).toBeNull();
    expect(planLetterTask(served('s', 'S20', 'ay', ['ay']), rng(1))).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/letterLane.test.ts`
Expected: FAIL, cannot resolve `letterLane.ts`.

- [ ] **Step 4: Write `letterLane.ts`**

```ts
import type { BabyView, Rng, ServedItem } from './types.ts';
import { letterDefs } from './content.ts';

export type LetterDef = { letter: string; sound: string; name: string };
export type Arch = { letter: string; sound: string; lit: boolean; babies: string[] };
export type FlagTask = { kind: 'flag'; letter: string; options: string[]; served: ServedItem };
export type GapTask = { kind: 'gap'; shown: (string | null)[]; answer: string; options: string[]; served: ServedItem };

const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
const MIRROR: Record<string, string[]> = { b: ['d', 'p'], d: ['b', 'q'], p: ['q', 'b'], q: ['p', 'd'], m: ['w', 'n'], w: ['m', 'v'], n: ['u', 'm'], u: ['n', 'v'] };

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function arches(herd: BabyView[], letters: LetterDef[] = letterDefs): Arch[] {
  return letters.map((l) => {
    const babies = herd.filter((b) => b.name.toLowerCase().startsWith(l.letter)).map((b) => b.id);
    return { letter: l.letter, sound: l.sound, lit: babies.length > 0, babies };
  });
}

function others(letter: string, n: number, rng: Rng): string[] {
  const near = MIRROR[letter] ?? [];
  const rest = shuffle(ABC.filter((x) => x !== letter && !near.includes(x)), rng);
  return [...near, ...rest].slice(0, n);
}

export function planLetterTask(item: ServedItem | null, rng: Rng): FlagTask | GapTask | null {
  if (!item || item.step !== 'S19') return null;
  const id = item.items[0] ?? item.carrier;
  const m = /^(pair|order)-([a-z])$/.exec(id);
  const kind = m ? m[1] : rng() < 0.5 ? 'pair' : 'order';
  const letter = m ? m[2] : ABC[Math.floor(rng() * 26)];
  if (kind === 'pair') {
    return { kind: 'flag', letter, options: shuffle([letter, ...others(letter, 2, rng)].map((x) => x.toUpperCase()), rng), served: item };
  }
  const i = ABC.indexOf(letter);
  const start = Math.min(Math.max(0, i - 2), 21);
  const run = ABC.slice(start, start + 5);
  const shown = run.map((x) => (x === letter ? null : x));
  const near = [ABC[i - 1], ABC[i + 1]].filter((x): x is string => Boolean(x));
  const pool = shuffle([...near.filter((x) => !run.includes(x)), ...ABC.filter((x) => x !== letter && !run.includes(x))], rng);
  const distractors = [...new Set(pool)].slice(0, 2);
  return { kind: 'gap', shown, answer: letter, options: shuffle([letter, ...distractors], rng), served: item };
}
```

The gap's distractors come from outside the shown run, so a letter that is already on the lane is never offered again.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/letterLane.test.ts`
Expected: PASS.

- [ ] **Step 6: Write `LetterLane.svelte`**

- Background `bg-letter-lane` (fallback: a cobbled lane). Two rows of 13 arches (`svg('arch', { label: letter })`, 80 px wide), `aria-label="arch <letter>"`. Lit arches glow and show the heads of the babies whose names start with that letter (at most three heads, `Unicorn face`), grey arches are dim. First enter per visit: `say('ll-welcome')`.
- Tap a lit arch: `sound(arch.sound)`, then, from S19 loaded, `say(letter.name)`. Tap a head: `sayName(name, '!')` when `hasName`. Tap a grey arch: `sound(arch.sound)`, then `say('ll-nobody')`.
- Checked act, when `planLetterTask(serve('s', 'letter-lane', 'letters'), rng)` returns a task (from release 1.2 with S19 loaded), shown after the first arch tap:
  - Flag: a small-letter flag blows in (`svg('flag', { label: letter })`). Goal `ll-flag-goal`. The three arches in `options` glow (the moonbeam covers all three). She drags the flag to an arch: right hangs it and plays the letter name; wrong: the flag flaps back, the right letter's shape glows on the flag; `moment.miss()`.
  - Gap: the five arches of `shown` stand apart with one empty space; three loose arch stones with `options` lie below. Goal `ll-gap-goal`. Right fills the gap and plays the letter name; wrong: the stone wobbles and rolls back; `moment.miss()`.
  - Result: `place/result` with `strand: 's'`, `step: 'S19'`, `carrier: task.kind === 'flag' ? task.letter : task.answer`, `items: task.served.items.map((item) => ({ item, result }))`, `place: 'letter-lane'`.
- Visible end: after the act, or after five arch taps in free play, `<MeadowArrow />`.

- [ ] **Step 7: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add games/moon-meadow-home/src/core/places/letterLane.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/letters.json games/moon-meadow-home/src/scenes/places/LetterLane.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/letterLane.test.ts
git commit -m "Add Letter Lane with arches lit by her babies and the S19 letter acts"
```

**Acceptance:** at herd 20 Letter Lane opens with 26 arches lit by her babies' first letters; grey arches say nobody starts with that sound yet; from S19 a flag or a gap act checks letter pairs and order.

### Task C5: Titles, herd banner and the Hundred Party

**Files:**
- Create: `src/core/places/titles.ts`, `src/scenes/places/HundredParty.svelte`
- Modify: `src/ui/Crown.svelte` (title ribbons), `src/scenes/places/Meadow.svelte` (title moments, banner, party), `src/scenes/places/BuildingDay.svelte` (title at the ceremony), `src/places/scenes.ts` (add `'hundred-party': HundredParty`), `src/places/hook.ts` (add `titles`)
- Test: `tests/places/titles.test.ts`

**Interfaces:**
- Consumes: `PlacesState` (A1); `rowOfPlot` (A12).
- Produces:
  - `type TitleId = 'nest-keeper' | 'stable-keeper' | 'meadow-keeper' | 'royal-nest-keeper' | 'keeper-of-the-castle' | 'princess-of-the-moon-meadow'`
  - `TITLE_LINES: Record<TitleId, string>`, `TITLE_COLOURS: Record<TitleId, string>`
  - `placeBuildings(s: PlacesState): number`
  - `earnedTitles(s: PlacesState): TitleId[]`
  - `titlesToGive(s: PlacesState): TitleId[]` (for the core store, which dispatches `place/title` for each; spec 4.4)
  - `herdRewardsDue(s: PlacesState): ('herd-banner' | 'hundred-party')[]`
  - `paradeTens(herd: number): number[]`
  - Hook `titles`: `{ given(): string[]; party(): void }`

- [ ] **Step 1: Write the failing test**

`tests/places/titles.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { earnedTitles, herdRewardsDue, paradeTens, placeBuildings, TITLE_LINES, titlesToGive } from '../../src/core/places/titles.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);
const hatch = (n: number) => Array.from({ length: n }, (_, i) => ev('egg.hatched', { baby: `b${i}`, source: 'nest' }));
const visit = ev.bind(null, 'visit.start');

describe('titles', () => {
  it('earns Nest Keeper on the first visit and Stable Keeper at ten babies', () => {
    expect(earnedTitles(foldAll([]))).toEqual([]);
    expect(earnedTitles(foldAll([visit({ visit: 'v1', tz: 0 })]))).toEqual(['nest-keeper']);
    expect(earnedTitles(foldAll([visit({ visit: 'v1', tz: 0 }), ...hatch(10)]))).toEqual(['nest-keeper', 'stable-keeper']);
  });

  it('counts place buildings for Meadow Keeper, not rows or decorations', () => {
    const s = foldAll(['bath-pond', 'post-box', 'salon', 'row-2', 'row-3', 'decor-fountain'].map((plot) => ev('building.done', { plot })));
    expect(placeBuildings(s)).toBe(3);
    const five = foldAll(['bath-pond', 'post-box', 'salon', 'kitchen', 'tea-garden'].map((plot) => ev('building.done', { plot })));
    expect(earnedTitles(five)).toContain('meadow-keeper');
  });

  it('earns Royal Nest Keeper at 75, and the castle titles from their buildings', () => {
    expect(earnedTitles(foldAll(hatch(75)))).toContain('royal-nest-keeper');
    expect(earnedTitles(foldAll([ev('building.done', { plot: 'castle-gate' })]))).toContain('keeper-of-the-castle');
    expect(earnedTitles(foldAll([ev('building.done', { plot: 'throne-room' })]))).toContain('princess-of-the-moon-meadow');
  });

  it('gives each title once', () => {
    const s = foldAll([visit({ visit: 'v1', tz: 0 }), ...hatch(10), ev('title.given', { title: 'nest-keeper' })]);
    expect(titlesToGive(s)).toEqual(['stable-keeper']);
  });

  it('has a Lumi line for every title', () => {
    for (const id of ['nest-keeper', 'stable-keeper', 'meadow-keeper', 'royal-nest-keeper', 'keeper-of-the-castle', 'princess-of-the-moon-meadow'] as const) expect(TITLE_LINES[id]).toMatch(/^lumi-title-/);
  });
});

describe('herd milestones', () => {
  it('brings the banner at 75 and the Hundred Party at 100, once each', () => {
    expect(herdRewardsDue(foldAll(hatch(74)))).toEqual([]);
    expect(herdRewardsDue(foldAll(hatch(75)))).toEqual(['herd-banner']);
    expect(herdRewardsDue(foldAll(hatch(100)))).toEqual(['herd-banner', 'hundred-party']);
    const done = foldAll([visit({ visit: 'v1', tz: 0 }), ...hatch(100), ev('opening.announced', { opening: 'herd-banner' }), ev('opening.announced', { opening: 'hundred-party' })]);
    expect(herdRewardsDue(done)).toEqual([]);
  });

  it('parades in tens', () => {
    expect(paradeTens(104)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(paradeTens(9)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/titles.test.ts`
Expected: FAIL, cannot resolve `titles.ts`.

- [ ] **Step 3: Write `titles.ts`**

```ts
import type { PlacesState } from './state.ts';
import { rowOfPlot } from './building.ts';

export type TitleId = 'nest-keeper' | 'stable-keeper' | 'meadow-keeper' | 'royal-nest-keeper' | 'keeper-of-the-castle' | 'princess-of-the-moon-meadow';

export const TITLE_LINES: Record<TitleId, string> = {
  'nest-keeper': 'lumi-title-nest-keeper', 'stable-keeper': 'lumi-title-stable-keeper', 'meadow-keeper': 'lumi-title-meadow-keeper',
  'royal-nest-keeper': 'lumi-title-royal-nest-keeper', 'keeper-of-the-castle': 'lumi-title-keeper-of-the-castle', 'princess-of-the-moon-meadow': 'lumi-title-princess',
};
export const TITLE_COLOURS: Record<TitleId, string> = {
  'nest-keeper': '#f7b6d2', 'stable-keeper': '#b6dcf7', 'meadow-keeper': '#bfe8b0', 'royal-nest-keeper': '#f2c94c',
  'keeper-of-the-castle': '#c3a6ef', 'princess-of-the-moon-meadow': '#ffffff',
};
const ORDER: TitleId[] = ['nest-keeper', 'stable-keeper', 'meadow-keeper', 'royal-nest-keeper', 'keeper-of-the-castle', 'princess-of-the-moon-meadow'];

export function placeBuildings(s: PlacesState): number {
  return Object.entries(s.buildings).filter(([plot, b]) => b.done && rowOfPlot(plot) === null && !plot.startsWith('decor-')).length;
}

export function earnedTitles(s: PlacesState): TitleId[] {
  const done = (p: string) => Boolean(s.buildings[p]?.done);
  const has: Record<TitleId, boolean> = {
    'nest-keeper': s.visits.length >= 1,
    'stable-keeper': s.herd >= 10,
    'meadow-keeper': placeBuildings(s) >= 5,
    'royal-nest-keeper': s.herd >= 75,
    'keeper-of-the-castle': done('castle-gate'),
    'princess-of-the-moon-meadow': done('throne-room'),
  };
  return ORDER.filter((t) => has[t]);
}

export function titlesToGive(s: PlacesState): TitleId[] {
  return earnedTitles(s).filter((t) => !s.titles.includes(t));
}

export function herdRewardsDue(s: PlacesState): ('herd-banner' | 'hundred-party')[] {
  const out: ('herd-banner' | 'hundred-party')[] = [];
  if (s.herd >= 75 && !('herd-banner' in s.announced)) out.push('herd-banner');
  if (s.herd >= 100 && !('hundred-party' in s.announced)) out.push('hundred-party');
  return out;
}

export function paradeTens(herd: number): number[] {
  return Array.from({ length: Math.floor(herd / 10) }, (_, i) => (i + 1) * 10);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/titles.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the title moments and the party**

- `Crown.svelte`: one ribbon per given title, in `TITLE_COLOURS`, hanging from the crown (`aria-hidden`).
- `BuildingDay.svelte`: after `place/built`, if a title was given in the same fold (a `title.given` this visit that has not been shown, tracked with `once('title:' + id)`), Lumi gives it: `say(TITLE_LINES[id])`, a ribbon flies onto the crown.
- `Meadow.svelte` arrival, after the opening or novelty step of Task B4: show each title given this visit but not yet shown (`once`), the same way. Then, for `herdRewardsDue(s)`: `herd-banner` raises a banner over the stables (`herd-banner` art, fallback `svg('ribbon')`), `say('ti-banner')`, dispatch `place/announce` with `herd-banner`; `hundred-party` shows a flag on the hill and a party bubble that enters `hundred-party`. Both are rewards and may share a visit with an opening (`REWARD_OPENINGS`, Task A6).
- `HundredParty.svelte`: a flag on the hill, `say('hp-party')`, then `say('hp-tens')`; the herd crosses the screen in groups of ten (static heads in rows of ten, transform only), and for each group Elizabeth says `num-<tens>` from `paradeTens(herd)`. Confetti, `sfx('fanfare')`, dispatch `place/announce` with `hundred-party`, then `<MeadowArrow />`.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/places/titles.ts games/moon-meadow-home/src/scenes/places/HundredParty.svelte games/moon-meadow-home/src/ui/Crown.svelte games/moon-meadow-home/src/scenes/places/Meadow.svelte games/moon-meadow-home/src/scenes/places/BuildingDay.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/titles.test.ts
git commit -m "Add titles on the crown, the herd banner at 75 and the Hundred Party"
```

**Acceptance:** titles are earned at the spec's thresholds, given once by Lumi with a crown ribbon, the banner comes at 75 and the Hundred Party at 100 with the herd counted in tens.

### Task C6: Babies come along

**Files:**
- Create: `src/core/places/companions.ts`
- Modify: `src/scenes/places/Meadow.svelte` (ribbon spool and ribbon mode), `src/scenes/places/BathPond.svelte`, `src/scenes/places/DressingCorner.svelte`, `src/scenes/places/Salon.svelte`, `src/scenes/places/LetterLane.svelte`, `src/scenes/places/PostBox.svelte` (show companions), `src/places/hook.ts` (add `ribbon`)
- Test: `tests/places/companions.test.ts`

**Interfaces:**
- Consumes: `recentTouches`, `noteTouch` (A7); `PlacesState` (A1); `BabyView`.
- Produces:
  - `companions(recent: string[], ribbons: Record<string, boolean>, herd: BabyView[], max?: number): string[]` (the three last touched, then ribboned babies in hatch order, at most six)
  - Hook `ribbon`: `{ tie(baby: string): void; untie(baby: string): void; companions(): string[] }`

- [ ] **Step 1: Write the failing test**

`tests/places/companions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { companions } from '../../src/core/places/companions.ts';
import { baby } from './helpers.ts';

const herd = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => baby(id, id.toUpperCase(), { hatchIndex: i }));

describe('babies come along', () => {
  it('brings the three she touched last', () => {
    expect(companions(['c', 'a', 'f', 'b'], {}, herd)).toEqual(['c', 'a', 'f']);
  });
  it('adds ribboned babies in hatch order, without doubles, six at most', () => {
    expect(companions(['c'], { a: true, c: true, h: true, d: false }, herd)).toEqual(['c', 'a', 'h']);
    const all = Object.fromEntries(herd.map((h) => [h.id, true]));
    expect(companions(['h', 'g', 'f'], all, herd)).toEqual(['h', 'g', 'f', 'a', 'b', 'c']);
  });
  it('skips babies that are not in the herd', () => {
    expect(companions(['zz'], { yy: true }, herd)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/companions.test.ts`
Expected: FAIL, cannot resolve `companions.ts`.

- [ ] **Step 3: Write `companions.ts`**

```ts
import type { BabyView } from './types.ts';

export function companions(recent: string[], ribbons: Record<string, boolean>, herd: BabyView[], max = 6): string[] {
  const inHerd = new Set(herd.map((b) => b.id));
  const ribboned = [...herd].sort((a, b) => a.hatchIndex - b.hatchIndex).filter((b) => ribbons[b.id]).map((b) => b.id);
  const out: string[] = [];
  for (const id of [...recent.slice(0, 3), ...ribboned]) {
    if (out.length === max) break;
    if (inHerd.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/companions.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire it**

- `Meadow.svelte`: once `come-along` is announced, a ribbon spool sits by the crown (`aria-label="ribbon"`). A tap turns on ribbon mode for 20 s: `MeadowLife` gets `ribbonMode`, and a tap on a baby calls `ontieribbon(id)`, which dispatches `{ type: 'place/ribbon', baby: id, on: !ribbons[id] }`. Ribboned babies wear a small pink ribbon. The announcement plays `ca-ribbon` with the ghost hand tying a ribbon on one baby.
- `companionsNow()` in each place scene returns `companions(recentTouches(), game.world.places.ribbons, herdView())`; those babies walk in after Emma and stand at the side (Bath Pond bank, Dressing Corner stage first, Salon waiting bench, Letter Lane, Post Box). Before `come-along` is announced, places still bring the three last touched (spec 2.5 rule 8 is release 1.2, the ribbon is its new thing).
- Photos (`place/photo`) list `companionsNow()` in `babies`.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/core/places/companions.ts games/moon-meadow-home/src/scenes/places/ games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/companions.test.ts
git commit -m "Let babies come along to places with a come-along ribbon"
```

**Acceptance:** the three babies she touched last follow her into a place and appear in its photo; a come-along ribbon brings others, up to six.

### Task C7: Year 1 meadow wishes

**Files:**
- Create: `src/core/places/year1.ts`, `content/places/year1.json`, `src/scenes/places/MeadowWishes.svelte`
- Modify: `src/core/places/content.ts` (add `year1Defs`), `src/places/scenes.ts` (add `'meadow-wishes': MeadowWishes`), `src/places/hook.ts` (add `y1`)
- Test: `tests/places/year1.test.ts`

**Interfaces:**
- Consumes: `BabyView`, `ServedItem`, `Rng`, `ItemResult`, `Result` (A1); `createMoment` (A3); heartbeat `PrintWithDots`; planner `nextItem` with `meadow-wishes/asking` and `meadow-wishes/two-state`.
- Produces:
  - `type AskingLine = { baby: string; kind: 'tell' | 'shout' | 'ask'; text: string; clip: string }`
  - `type AskingTask = { thing: string; picture: string; lines: AskingLine[]; answer: string; served: ServedItem }`
  - `planAsking(c: { item: ServedItem | null; herd: BabyView[]; rng: Rng }): AskingTask | null`
  - `askingItems(task: AskingTask, result: Result): ItemResult[]`
  - `type TwoStateDef = { id: string; picture: string; do: { text: string; clip: string; to: string }; undo: { text: string; clip: string; to: string }; reaction: string }`
  - `type TwoStateTask = { object: TwoStateDef; text: string; clip: string; un: boolean; target: string; served: ServedItem }`
  - `planTwoState(c: { item: ServedItem | null; rng: Rng }): TwoStateTask | null`
  - `twoStateCheck(task: TwoStateTask, direction: 'do' | 'undo'): { ok: boolean; reaction: string | null }`
  - Hook `y1`: `{ task(): { kind: 'asking' | 'two-state'; answer: string } | null; give(baby: string): void; act(direction: 'do' | 'undo'): void }`

- [ ] **Step 1: Write the content file**

`content/places/year1.json`:

```json
{
  "asking": [
    { "thing": "bow", "picture": "bow" }, { "thing": "hat", "picture": "hat" }, { "thing": "cake", "picture": "cake" },
    { "thing": "kite", "picture": "kite" }, { "thing": "bell", "picture": "bell" }, { "thing": "cape", "picture": "cape" }
  ],
  "twoState": [
    { "id": "basket", "picture": "ts-basket", "do": { "text": "Pack the basket.", "clip": "y1-pack-basket", "to": "packed" }, "undo": { "text": "Unpack the basket.", "clip": "y1-unpack-basket", "to": "unpacked" }, "reaction": "lid-pops" },
    { "id": "bow", "picture": "ts-bow", "do": { "text": "Tie the bow.", "clip": "y1-tie-bow", "to": "tied" }, "undo": { "text": "Untie the bow.", "clip": "y1-untie-bow", "to": "untied" }, "reaction": "bow-boings" },
    { "id": "gate", "picture": "ts-gate", "do": { "text": "Lock the gate.", "clip": "y1-lock-gate", "to": "locked" }, "undo": { "text": "Unlock the gate.", "clip": "y1-unlock-gate", "to": "unlocked" }, "reaction": "gate-rattles" },
    { "id": "bag", "picture": "ts-bag", "do": { "text": "Zip the bag.", "clip": "y1-zip-bag", "to": "zipped" }, "undo": { "text": "Unzip the bag.", "clip": "y1-unzip-bag", "to": "unzipped" }, "reaction": "bag-bulges" },
    { "id": "cape", "picture": "ts-cape", "do": { "text": "Do up the cape.", "clip": "y1-do-cape", "to": "done-up" }, "undo": { "text": "Undo the cape.", "clip": "y1-undo-cape", "to": "undone" }, "reaction": "cape-flaps" }
  ]
}
```

Add to `src/core/places/content.ts`:

```ts
import year1Json from '../../../content/places/year1.json' with { type: 'json' };
import type { TwoStateDef } from './year1.ts';
export const year1Defs = year1Json as { asking: { thing: string; picture: string }[]; twoState: TwoStateDef[] };
```

The art list gains `ts-basket`, `ts-bow`, `ts-gate`, `ts-bag`, `ts-cape` (each in a half-done state); `places-svg.ts` draws fallbacks for all five.

- [ ] **Step 2: Write the failing test**

`tests/places/year1.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { askingItems, planAsking, planTwoState, twoStateCheck } from '../../src/core/places/year1.ts';
import { baby, rng, served } from './helpers.ts';

const herd = [baby('a', 'Pip'), baby('b', 'Tam'), baby('c', 'Dot'), baby('d', 'Ken')];

describe('asking bubbles (R33)', () => {
  it('has three babies: one tells, one shouts, one asks; she gives to the asker', () => {
    const t = planAsking({ item: served('r', 'R33', 'mark-?', ['mark-?', 'mark-.', 'mark-!']), herd, rng: rng(1) })!;
    expect(t.lines.map((l) => l.kind).sort()).toEqual(['ask', 'shout', 'tell']);
    expect(new Set(t.lines.map((l) => l.baby)).size).toBe(3);
    const ask = t.lines.find((l) => l.kind === 'ask')!;
    expect(t.answer).toBe(ask.baby);
    expect(ask.text).toBe(`Can I have a ${t.thing}?`);
    expect(ask.clip).toBe(`y1-${t.thing}-ask`);
    expect(t.lines.find((l) => l.kind === 'tell')!.text).toBe(`I have a ${t.thing}.`);
    expect(t.lines.find((l) => l.kind === 'shout')!.text).toBe(`What a big ${t.thing}!`);
  });

  it('needs R33 and three babies', () => {
    expect(planAsking({ item: null, herd, rng: rng(1) })).toBeNull();
    expect(planAsking({ item: served('r', 'R32', 'seal', ['ea']), herd, rng: rng(1) })).toBeNull();
    expect(planAsking({ item: served('r', 'R33', 'mark-?', ['mark-?']), herd: herd.slice(0, 2), rng: rng(1) })).toBeNull();
  });

  it('logs the served items with the result', () => {
    const t = planAsking({ item: served('r', 'R33', 'mark-?', ['mark-?', 'mark-.', 'mark-!']), herd, rng: rng(1) })!;
    expect(askingItems(t, 'miss')).toEqual([{ item: 'mark-?', result: 'miss' }, { item: 'mark-.', result: 'miss' }, { item: 'mark-!', result: 'miss' }]);
  });
});

describe('two-state wishes (R37)', () => {
  it('asks to undo for an un item and to do for a base item', () => {
    const un = planTwoState({ item: served('r', 'R37', 'un', ['un']), rng: rng(2) })!;
    expect(un.un).toBe(true);
    expect(un.text.split(' ')[0]).toMatch(/^Un|^Undo/);
    expect(twoStateCheck(un, 'undo')).toEqual({ ok: true, reaction: null });
    expect(twoStateCheck(un, 'do')).toEqual({ ok: false, reaction: un.object.reaction });
    const base = planTwoState({ item: served('r', 'R37', 'base', ['base']), rng: rng(2) })!;
    expect(base.un).toBe(false);
    expect(twoStateCheck(base, 'do').ok).toBe(true);
  });

  it('needs R37', () => {
    expect(planTwoState({ item: null, rng: rng(1) })).toBeNull();
    expect(planTwoState({ item: served('r', 'R33', 'mark-?', ['mark-?']), rng: rng(1) })).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/places/year1.test.ts`
Expected: FAIL, cannot resolve `year1.ts`.

- [ ] **Step 4: Write `year1.ts`**

```ts
import type { BabyView, ItemResult, Result, Rng, ServedItem } from './types.ts';
import { year1Defs } from './content.ts';

export type AskingLine = { baby: string; kind: 'tell' | 'shout' | 'ask'; text: string; clip: string };
export type AskingTask = { thing: string; picture: string; lines: AskingLine[]; answer: string; served: ServedItem };
export type TwoStateDef = { id: string; picture: string; do: { text: string; clip: string; to: string }; undo: { text: string; clip: string; to: string }; reaction: string };
export type TwoStateTask = { object: TwoStateDef; text: string; clip: string; un: boolean; target: string; served: ServedItem };

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function planAsking(c: { item: ServedItem | null; herd: BabyView[]; rng: Rng }): AskingTask | null {
  if (!c.item || c.item.step !== 'R33') return null;
  const names = new Set<string>();
  const three: BabyView[] = [];
  for (const b of shuffle(c.herd, c.rng)) {
    if (three.length === 3) break;
    if (names.has(b.name)) continue;
    names.add(b.name);
    three.push(b);
  }
  if (three.length < 3) return null;
  const pickThing = year1Defs.asking[Math.floor(c.rng() * year1Defs.asking.length)];
  const t = pickThing.thing;
  const kinds = shuffle(['tell', 'shout', 'ask'] as const, c.rng);
  const text = { tell: `I have a ${t}.`, shout: `What a big ${t}!`, ask: `Can I have a ${t}?` };
  const lines = three.map((b, i) => ({ baby: b.id, kind: kinds[i], text: text[kinds[i]], clip: `y1-${t}-${kinds[i]}` }));
  return { thing: t, picture: pickThing.picture, lines, answer: lines.find((l) => l.kind === 'ask')!.baby, served: c.item };
}

export function askingItems(task: AskingTask, result: Result): ItemResult[] {
  return task.served.items.map((item) => ({ item, result }));
}

export function planTwoState(c: { item: ServedItem | null; rng: Rng }): TwoStateTask | null {
  if (!c.item || c.item.step !== 'R37') return null;
  const object = year1Defs.twoState[Math.floor(c.rng() * year1Defs.twoState.length)];
  const un = (c.item.items[0] ?? c.item.carrier) === 'un';
  const side = un ? object.undo : object.do;
  return { object, text: side.text, clip: side.clip, un, target: side.to, served: c.item };
}

export function twoStateCheck(task: TwoStateTask, direction: 'do' | 'undo'): { ok: boolean; reaction: string | null } {
  const ok = (direction === 'undo') === task.un;
  return { ok, reaction: ok ? null : task.object.reaction };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/places/year1.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Write `MeadowWishes.svelte`**

`game.params.kind` is `asking` or `two-state`. The first time the `asking-wishes` opening is announced, the meadow plays `y1-open`.
- Asking: three babies stand side by side, each with a printed speech bubble (`<PrintWithDots text={line.text} dots={...} />`, no audio before she acts), `aria-label="baby <index>"`. The thing (one picture) sits in a basket. Goal `y1-asking-goal`. She gives the thing to a baby: right: the asker hugs it, then Elizabeth reads all three lines in order (`sayAll(task.lines.map((l) => l.clip))`), `place/result` with `strand: 'r'`, `step: 'R33'`, `carrier: task.thing`, `items: askingItems(task, result)`, `place: 'meadow-wishes'`. Wrong: that baby holds up its own thing and giggles (`say('foal-giggle')`), the thing goes back, the question mark in the asker's bubble glows; `moment.miss()`.
- Two-state: the half-done object in the middle (a half-packed basket, a half-tied bow, a gate on the latch, a half-zipped bag, a half-done-up cape) with the printed wish (`PrintWithDots`). Goal `y1-two-goal`. Two drag handles do the act one way or the other (`aria-label="do"` and `aria-label="undo"`; for the basket, dragging things in or out). `twoStateCheck`: right finishes the act, `say(task.clip)` after the act, `place/result` with `step: 'R37'`, `items: task.served.items.map((item) => ({ item, result }))`; wrong plays the object's reaction (the basket wobbles and pops its lid, the bow boings, the gate rattles, the bag bulges, the cape flaps), the `Un` or the first word glows; `moment.miss()`.
- Then `<MeadowArrow />`.

- [ ] **Step 7: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add games/moon-meadow-home/src/core/places/year1.ts games/moon-meadow-home/src/core/places/content.ts games/moon-meadow-home/content/places/year1.json games/moon-meadow-home/src/scenes/places/MeadowWishes.svelte games/moon-meadow-home/src/places/scenes.ts games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/year1.test.ts
git commit -m "Add Year 1 meadow wishes: asking bubbles and two-state wishes"
```

**Acceptance:** an asking bubble shows three babies telling, shouting and asking, and she gives the thing to the one who asks; a two-state wish shows a half-done thing and the "un" decides the direction; both have funny mistakes and log R33 and R37.

### Task C8: Parent corner, second part

**Files:**
- Create: `src/parent/Missing.svelte`, `src/parent/IdleFlags.svelte`, `src/parent/Settings.svelte`, `src/parent/Pairing.svelte`
- Modify: `src/parent/parent.ts` (add `missingClips`, `settingsView`, `SETTING_KEYS`), `src/parent/ParentCorner.svelte` (four new sections), `src/places/hook.ts` (extend `parent`)
- Test: `tests/places/parent.test.ts` (extend)

**Interfaces:**
- Consumes: `idleFlags` (A14); sync `pair`, `syncNow`, `status`; save `storageStatus`.
- Produces:
  - `missingClips(ev: GameEvent[]): { id: string; count: number; last: number }[]`
  - `SETTING_KEYS = ['parentPin', 'birthday', 'skipWishAfterThree'] as const`
  - `settingsView(settings: Record<string, unknown>): { parentPin: string; birthday: string | null; skipWishAfterThree: boolean }`
  - Hook `parent` gains `{ setting(key: string, value: unknown): void; pair(code: string): Promise<string>; missing(): string[] }`

- [ ] **Step 1: Write the failing test**

Append to `tests/places/parent.test.ts`:

```ts
import { missingClips, settingsView } from '../../src/parent/parent.ts';

describe('parent corner, second part', () => {
  it('lists each missing clip once with its count, newest first', () => {
    const out = missingClips([ev('audio.missing', { clip: 'word-fox' }, 10), ev('audio.missing', { clip: 'word-fox' }, 30), ev('audio.missing', { clip: 'name-tamo' }, 20)]);
    expect(out).toEqual([{ id: 'word-fox', count: 2, last: 30 }, { id: 'name-tamo', count: 1, last: 20 }]);
  });

  it('reads settings with safe defaults', () => {
    expect(settingsView({})).toEqual({ parentPin: '2468', birthday: null, skipWishAfterThree: false });
    expect(settingsView({ parentPin: '1357', birthday: '2020-05-14', skipWishAfterThree: true })).toEqual({ parentPin: '1357', birthday: '2020-05-14', skipWishAfterThree: true });
    expect(settingsView({ parentPin: 'abc', birthday: 'soon' })).toEqual({ parentPin: '2468', birthday: null, skipWishAfterThree: false });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/places/parent.test.ts`
Expected: FAIL, `missingClips` is not exported.

- [ ] **Step 3: Add to `parent.ts`**

```ts
export function missingClips(ev: GameEvent[]): { id: string; count: number; last: number }[] {
  const by = new Map<string, { id: string; count: number; last: number }>();
  for (const e of ev) {
    if (e.type !== 'audio.missing') continue;
    const id = String(e.clip);
    const row = by.get(id) ?? { id, count: 0, last: 0 };
    row.count += 1;
    row.last = Math.max(row.last, e.t);
    by.set(id, row);
  }
  return [...by.values()].sort((a, b) => b.last - a.last);
}

export const SETTING_KEYS = ['parentPin', 'birthday', 'skipWishAfterThree'] as const;

export function settingsView(settings: Record<string, unknown>): { parentPin: string; birthday: string | null; skipWishAfterThree: boolean } {
  const birthday = typeof settings.birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(settings.birthday) ? settings.birthday : null;
  return { parentPin: pinOf(settings), birthday, skipWishAfterThree: settings.skipWishAfterThree === true };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/places/parent.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the four sections**

- `Missing.svelte`: the table from `missingClips(allEvents())` with a "Copy ids" button, and a note that each id goes into the next generator run.
- `IdleFlags.svelte`: the table from `idleFlags(allEvents())`; flagged rows (three or more visits) first, in red.
- `Settings.svelte`: change PIN (four digits, twice, then `place/setting` with `parentPin`); Emma's birthday (a date input, `place/setting` with `birthday`, used by the calendar sets in a later release); "Extra eggs after three in a row skip the first wish" switch (`skipWishAfterThree`, off by default, spec 2.2; the heartbeat reads `world.places.settings.skipWishAfterThree`).
- `Pairing.svelte`: `status()` shows paired or not, the last successful sync time and the last error. A six-digit code field and "Pair this iPad" call `pair(code)` and show the answer in plain words ("Paired", "That code did not work", "Too many tries, wait 15 minutes", "No connection"). "Sync now" calls `syncNow()`. When `status().needsPairing`, a warning at the top of the parent corner says "Pair this iPad again."
- `ParentCorner.svelte`: order becomes warnings, Report, Names, Missing clips, Idle flags, Overrides, Settings, Backup, Pairing.

- [ ] **Step 6: Type check and build**

Run: `npm run check && npm run build:test`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/parent/ games/moon-meadow-home/src/places/hook.ts games/moon-meadow-home/tests/places/parent.test.ts
git commit -m "Add missing clips, idle flags, settings and pairing to the parent corner"
```

**Acceptance:** the parent corner lists missing clips and idle flags, changes the PIN, birthday and skip-wish switch, and pairs the iPad and syncs through the sync client.

### Task C9: Wave C flows and final acceptance

**Files:**
- Create: `flows/places/salon.sh`, `flows/places/valley.sh`, `flows/places/lane.sh`, `flows/places/titles.sh`, `flows/places/along.sh`, `flows/places/y1.sh`
- Modify: `flows/places/parent.sh` (pairing against the local server)

**Interfaces:**
- Consumes: hooks from Tasks C2 to C8; core's server with the save API on the lane port 8773 and a temp `MOON_DATA`; the sync workstream's `node server/admin.ts pair --family test` that prints a code.
- Produces: flows that exit non-zero on failure.

- [ ] **Step 1: Write the flows**

`flows/places/salon.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="ps$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "async () => { __game.play(); __game.herd(6); __game.pass('s', 'S20'); __game.pass('r', 'R30'); __game.pass('m', 'M10'); ['S20', 'R30', 'M10'].forEach((j) => __game.places.jewels.drag(j)); __game.places.building.start('salon'); await __game.places.building.auto(); __game.newVisit(); __game.play(); __game.herd(1); __game.setStep('r', 'R27'); __game.places.goPlace('meadow'); return true; }"
flow_wait "$S" "() => __game.places.bubbles().some((b) => b.kind === 'cousin') || __game.state().places.announced.bubbles === undefined" "cousin waits"
flow_eval "$S" "() => { __game.places.goPlace('salon'); return true; }"
flow_wait "$S" "() => __game.places.salon.card() !== null" "style card"
flow_eval "$S" "() => { const c = __game.places.salon.card(); const line = c.lines[c.line]; const wrong = line.options.find((o) => !line.answer.includes(o)); __game.places.salon.give(wrong); line.answer.forEach((a) => __game.places.salon.give(a)); return true; }"
flow_eval "$S" "() => { let c = __game.places.salon.card(); while (c && c.line < c.lines.length) { const line = c.lines[c.line]; if (line.kind === 'beads') __game.places.salon.bead(line.answer[0]); else line.answer.forEach((a) => __game.places.salon.give(a)); c = __game.places.salon.card(); } __game.places.salon.photo(); return true; }"
flow_expect "$S" "() => __game.state().places.photos.length === 1" "photo in the album"
flow_shot "$S" "salon-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/valley.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pv$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(6); __game.pass('s', 'S20'); __game.places.jewels.drag('S20'); __game.places.openings.force('valley-map'); __game.places.goPlace('meadow'); return true; }"
flow_expect "$S" "() => __game.places.edges().includes('map:open')" "map scroll in the meadow"
flow_eval "$S" "() => { __game.places.goPlace('valley'); return true; }"
flow_expect "$S" "() => __game.places.valley.icons().includes('salon:next')" "Salon plot on the map"
flow_expect "$S" "() => __game.places.valley.mist().includes('castle-hill')" "mist over Castle Hill"
flow_shot "$S" "valley-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/lane.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pl2$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(20); __game.places.openings.force('letter-lane'); __game.setStep('s', 'S19'); __game.places.goPlace('letter-lane'); return true; }"
flow_expect "$S" "() => __game.places.lane.arches().length === 26" "26 arches"
flow_eval "$S" "() => { const grey = __game.places.lane.arches().find((a) => !a.lit); __game.places.lane.tapArch(grey.letter); return true; }"
flow_wait "$S" "() => __game.places.lane.task() !== null" "letter act"
flow_eval "$S" "() => { const t = __game.places.lane.task(); const right = t.kind === 'flag' ? t.letter.toUpperCase() : t.answer; const wrong = t.options.find((o) => o !== right); __game.places.lane.answer(wrong); __game.places.lane.answer(right); return true; }"
flow_shot "$S" "lane-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/titles.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pt$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(100); __game.places.goPlace('meadow'); return true; }"
flow_wait "$S" "() => ['nest-keeper', 'stable-keeper', 'royal-nest-keeper'].every((t) => __game.places.titles.given().includes(t))" "titles given"
flow_eval "$S" "() => { __game.places.titles.party(); return true; }"
flow_wait "$S" "() => __game.state().places.announced['hundred-party'] !== undefined" "Hundred Party held"
flow_shot "$S" "party-$1x$2"
flow_clean "$S"
flow_close "$S"
```

`flows/places/along.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="pa$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(8); __game.places.openings.force('come-along'); const ids = __game.state().herd.map((b) => b.id); __game.places.ribbon.tie(ids[0]); __game.places.ribbon.tie(ids[1]); return true; }"
flow_expect "$S" "() => __game.places.ribbon.companions().length >= 2" "ribboned babies come along"
flow_clean "$S"
flow_close "$S"
```

`flows/places/y1.sh`:

```sh
#!/bin/sh
. "$(dirname "$0")/lib.sh"
S="py$1x$2"
flow_open "$S" "$1" "$2"
flow_eval "$S" "() => { __game.play(); __game.herd(6); __game.setStep('r', 'R33'); __game.places.goPlace('meadow-wishes'); return true; }"
flow_wait "$S" "() => __game.places.y1.task()?.kind === 'asking'" "asking bubbles"
flow_eval "$S" "() => { const t = __game.places.y1.task(); const wrong = __game.state().herd.map((b) => b.id).find((id) => id !== t.answer); __game.places.y1.give(wrong); __game.places.y1.give(t.answer); return true; }"
flow_eval "$S" "() => { __game.setStep('r', 'R37'); __game.places.goPlace('meadow'); __game.jump('meadow-wishes'); return true; }"
flow_wait "$S" "() => __game.places.y1.task()?.kind === 'two-state'" "two-state wish"
flow_eval "$S" "() => { const t = __game.places.y1.task(); __game.places.y1.act(t.answer === 'undo' ? 'do' : 'undo'); __game.places.y1.act(t.answer); return true; }"
flow_shot "$S" "y1-$1x$2"
flow_clean "$S"
flow_close "$S"
```

For the second act, `MeadowWishes.svelte` reads `game.params.kind`; the hook's `task()` returns `{ kind: 'two-state', answer: 'do' | 'undo' }` with the direction that is right.

Extend `flows/places/parent.sh` before `flow_clean`:

```sh
CODE=$(node games/moon-meadow-home/server/admin.ts pair --family test | grep -Eo '[0-9]{6}' | head -1)
flow_expect "$S" "async () => (await __game.places.parent.pair('$CODE')) === 'ok'" "pairs with the local server"
```

- [ ] **Step 2: Run everything**

From `games/moon-meadow-home/`: `npm test && npm run check && npm run check:content && npm run build:test`
Expected: all pass.

From the repo root, outside the sandbox, with the server running: `sh games/moon-meadow-home/flows/places/run.sh meadow label pond building parent jewel queue dressing post notes book salon valley lane titles along y1`
Expected: every line `ok:` at 1180 x 820, 1080 x 810 and 1024 x 768, and the parent corner at 820 x 1180. Look at every screenshot in `$TMPDIR/flows/`: one goal per screen, nothing clipped at 1024 x 768, no text where Emma must read an instruction.

- [ ] **Step 3: Commit**

```bash
git add games/moon-meadow-home/flows/places/
git commit -m "Add the Wave C place flows"
```

**Acceptance (Wave C done):** every place in spec 2.3 to 2.7, 2.9 and 2.11 from items 9 to 26 (minus the core, heartbeat and server items) works; all place unit tests pass; all place flows pass at the three landscape sizes and the parent corner in portrait; no missing clips and no console errors.

---

## Spec coverage

| Spec item | Tasks |
|---|---|
| 9 Meadow hub, bubbles, label bubbles and toy shelf, moonbeam, ghost hand, replay, hint ladder | A2, A3, A4, A5, A7, A9, A10 |
| 10 Plurals (places part): Bath Pond one or many, plural jar labels at three levels, funny readbacks, code-drawn heaps, mice jar, plural lines | A8, A9, A10, A11, A16 |
| 12 Building Days for the Bath Pond and rows, herd circle | A12, A13 |
| 13 Parent corner, first part | A14, A15 |
| 14 Jewel Box, decoration plots | B1, B4 |
| 15 Lumi's Dressing Corner | B5 |
| 17 Opening queue and novelty floor | A6, B3, B4 |
| 18 Post Box, pins, sashes, pin sets, notes to Lumi, plural parcels, Home Book | B2, B6, B7, B8, B9 |
| 20 Sparkle Salon, cousins, Salon plot, valley map with mist | C1, C2, C3 (Salon plot in A12 and B1) |
| 21 Letter Lane | C4 |
| 22 Titles, Royal Nest Keeper at 75, Hundred Party | C5 |
| 23 Babies come along | C6 |
| 24 Year 1 meadow wishes | C7 |
| 26 Parent corner, rest | C8 |
| 1.3 success criteria formulas (`tools/report.ts`) | A14 |
| 2.11 clarity rules | A2 to A5, every scene task (one goal per screen, replay, ghost hand once) |
