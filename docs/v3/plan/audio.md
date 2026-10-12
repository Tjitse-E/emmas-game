# Moon Meadow Home v3: audio plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every spoken line of the v3 build exists as an Elizabeth, Lumi or foal clip, made in budget order, checked by speech-to-text, and played by the app through one typed facade over `shared/audio.js`.

**Architecture:** Lines are written once as data (`content/lines/*.json`, one file per scene) or derived by code from content (numbers, words, plurals, phrases, names). `tools/audio/build-lines.ts` turns them into audio packs (`public/audio/<pack>/lines.json`). `scripts/generate-audio.py` makes the clips with a build-wide credit floor, a ledger cap and speech-to-text with automatic regeneration. The app adds every pack to `shared/audio.js` (one new additive function, `addPack`), keeps a clip index from the manifests, and speaks through `src/audio/index.ts`, which enforces the v2 speech-order rules and skips dynamic clips that do not exist.

**Tech stack:** Python 3 standard library plus ffmpeg (generator), Node 24.19.0 type stripping for tools, TypeScript 6.0.3, Vitest 5.0.3, Vite 8.3.4, `shared/audio.js` (Web Audio), ElevenLabs `eleven_v4`, `eleven_multilingual_v2`, `eleven_v3`, `scribe_v2`.

**Sources:** `docs/v3/decisions.md` wins, then `docs/v3/spec.md` (2.5, 2.8, 3.10, 4.2, 4.7, 5.6, 6.3), `VOICES.md`, `shared/README.md`, the lead's build decisions for this session.

---

## Decisions this plan makes

| # | Topic | Decision |
|---|---|---|
| AD1 | Source of lines | Hand-written lines live in `games/moon-meadow-home/content/lines/<scene>.json`. Numbers, words, plurals, phrases and names are derived by code. Nobody edits a pack's `lines.json` by hand. |
| AD2 | Packs | `core`, `numbers`, `words-phase2`, `words-phase3-4`, `words-year1`, `phrases`, `names-t1`, `names-new`, `area-stable-yard`, `area-village-lane`, `places`. Folder: `games/moon-meadow-home/public/audio/<pack>/`. Letter sounds stay in `shared/audio/phonics/` and are copied into the build at `audio/phonics/`. |
| AD3 | Voices | Per `VOICES.md`: `narrator` (Elizabeth) for every goal, hint, feedback, number, name, word and phrase; `queen` (Lumi, Posh) for story lines only; `foal` (Flicker) for giggles and tiny fixed words. Ids starting `word-`, `name-`, `num-`, `sound-`, `phrase-` and `ord-` must be narrator, enforced by the build tool and by the generator. |
| AD4 | Ids | `g-` goal, `h-` hint, `fb-` feedback, `lumi-` queen, `foal-` foal, `word-<slug>`, `phrase-<slug>[-q|-x]`, `name-<slug>-x` ("Pip!") and `name-<slug>-q` ("Pip?"), `num-<n>` ("Seven."), `num-<kind>-<n>`, `num-bond-<a>-<b>`, `num-parcel-<n>-<plural>`, `ord-<n>` ("The Second!"). Ids never contain digits that are not numbers. |
| AD5 | No splicing | Clips join only at sentence boundaries. A name is always its own clip. "Let's write hat. Listen: hat." is played as `g-write-label` ("Let's write a label. Listen.") then `word-hat` ("Hat."). "Bella wants to visit door fourteen." is `name-bella-x` then `num-visit-14` ("Off to door fourteen!"). |
| AD6 | v2 reuse | Where a v2 line fits, the v3 line copies its text, speaker and seed exactly. Same request, same hash, so the clip comes from the raw cache in `.cache/tts/` for 0 credits (verified: all 246 v2 clips hash-match today). 40 core lines, 52 number lines and every v2 name's "!" clip are free. |
| AD7 | Speech-to-text replaces the ear check this session | `--stt` checks narrator and queen clips with `scribe_v2`. A sound-alike key accepts spelling variants (Lin/Lynn, Mitt/Mit, "A net"/Annette, "41"/"forty-one"). Words and phrases fail when the transcript is another word of the same pack (pan heard for pen, cape for cap). A failing clip is regenerated with a new seed up to 2 times. A learning clip (`word-`, `phrase-`, `name-`, `num-`, `ord-`) that still fails gets `"ok": false` in its manifest, and the app treats it as absent: the planner never serves that word, and a name falls back to the no-clip path. Game lines that still fail are kept and listed for Tjitse. |
| AD8 | Budget guard | `tools/audio/budget.json` holds `cap` 24,000 and `floor` = max(8,000, credits at start minus 24,000). Every run passes `--floor`, `--ledger tools/audio/ledger.jsonl` and `--cap`, so no run can pass the build budget, and speech-to-text costs (if any) are caught by the floor on the live counter. |
| AD9 | Numbers | Full-sentence number clips cover move-in and herd count 1 to 60 in Wave A and 61 to 100 in Wave C, door visits and roll-call doors 1 to 20 (her range until M27). Bare numbers (`num-0` to `num-60` in Wave A, to `num-100` in Wave C) cover the wrong-door line ("Not me!" then "Forty-two."), counting and the Hundred Party. A number above the generated range is skipped silently, so the line still works without it. |
| AD10 | Words | One neutral clip per word, the bare word with a full stop ("Hat."). The singular wish shows the bare word, so this one clip serves wishes, labels, readbacks and taps. A word entry with a plural puts both forms in `words-phase3-4`, because the plurals are the open school step R19. |
| AD11 | Name order | `names-t1` lists every v2 name first (Moving Day needs them, and their "!" clips are free), then the bank by rank. It is generated with `--strict-order`, so a budget cut always drops the lowest-ranked names and never leaves a name with only one clip. At least 300 names in Wave A. |
| AD12 | Phase 5 sounds | Gems play sounds by phoneme code. New codes: `oo-short` (book), `yoo` (cube, few), `iz` (the -es ending). Phase 5 graphemes get aliases to existing sounds (ay and a-e to ai, ea to ee, and so on), so `sound('ay')` also works. |
| AD13 | Hosting | Plain http on the Mac: no service worker, no cache API. Name manifests are fetched with `cache: 'no-cache'`, so a new `names-new` pack reaches the iPad on the next start without a rebuild. |

---

## Budget

Credits at the start of the session: 34,007. Cap for this build: 24,000. Floor: 10,007 (never below 8,000). Narrator and queen cost 1 credit per character, foal 2. Estimates come from the line texts in this plan, after the free v2 reuse.

| Run | Wave | Pack | Estimate | `--max-chars` | Notes |
|---|---|---|---|---|---|
| 0 | A | phonics `oo-short`, `yoo`, `iz` | 30 | 300 | `generate-phonics.py` |
| 1 | A | `core` (Wave A lines) | 1,450 | 2,000 | 93 lines, 40 free |
| 2 | A | `numbers` (Wave A) | 5,300 | 6,500 | 345 lines, 52 free |
| 3 | A | `words-phase3-4` (with every plural) | 1,500 | 2,000 | |
| 4 | A | `words-year1` | 1,000 | 1,500 | |
| 5 | A | `words-phase2` | 800 | 1,200 | |
| 6 | A | `phrases` | 2,000 | 2,000 | cut by step order |
| 7 | A | `names-t1` part 1 | 3,300 | 3,600 | v2 names ("!" free, "?" about 400) plus the bank to at least 300 names, strict order |
| 8 | B | `core`, `area-stable-yard`, `numbers`, new `phrases` (Wave B) | 2,100 | 2,800 | |
| 9 | B | IPA probe (`tools/audio/probe/`) | 330 | 500 | not shipped with the app |
| 10 | B | `names-new` | 500 | 500 | strict order |
| 11 | C | `core`, `area-stable-yard`, `area-village-lane`, new `phrases` (Wave C) | 1,050 | 1,500 | |
| 12 | C | `numbers` (61 to 100) | 2,300 | 2,500 | |
| 13 | C | `names-t1` top-up | what is left | what is left | strict order, last run |
| | | Retries after speech-to-text | 1,000 | inside each run | |
| | | **Total before run 13** | **about 22,650** | | |

If a run costs more than its estimate, the next runs keep their order and the cut falls on run 13, then on run 12 (the highest numbers first), never on runs 1 to 7. Run 13 gets about 1,350 credits, about 95 more names.

---

## File map

All paths are relative to the repo root. `G` is `games/moon-meadow-home`.

| Path | Responsibility |
|---|---|
| `scripts/generate-audio.py` | Modify. Credit floor, ledger and cap, strict order, `--credits`, `overrides.json`, sound-alike speech-to-text with retries, `ok` flag, narrator-only `phrase-` and `ord-`. Stays compatible with v2 files. |
| `scripts/tests/test_generate_audio.py` | Create. Unit tests for the generator helpers and the budget planner (no network). |
| `scripts/generate-phonics.py` | Modify. New sounds `oo-short`, `yoo`, `iz` and Phase 5 aliases. |
| `shared/audio.js` | Modify, additive only. `addPack(name, base, {fresh})`, `forget(ids)`, `onMissing(fn)`. v2 behaviour unchanged without packs. |
| `shared/README.md` | Modify. Documents the three additions and the v3 packs. |
| `shared/review.html` | Modify (Wave C). Lists the v3 packs for Tjitse's later ear check. |
| `G/content/lines/<scene>.json` | Create. Hand-written lines per scene: `{scene, pack?, lines: [{id, speaker, text, also?, note?, seed?, expect?}]}`. |
| `G/tools/audio/number-words.ts` | Create. `numberWord`, `ordinalWord`, `capitalise`. |
| `G/tools/audio/number-lines.ts` | Create. Every number and ordinal line, in budget order. |
| `G/tools/audio/lines-lib.ts` | Create. Pure builders: scene lines, words, phrases, names, pack mapping, validation. |
| `G/tools/audio/build-lines.ts` | Create. CLI: reads content, writes every `public/audio/<pack>/lines.json` and an empty `manifest.json` where none exists. |
| `G/tools/audio/clip-ids-lib.ts` | Create. `renderClipIds(files)`: the generated TypeScript text. |
| `G/tools/audio/gen-clip-ids.ts` | Create. CLI: writes `src/audio/clip-ids.ts`. |
| `G/tools/audio/check-audio.ts` | Create. `checkAudio(root)` and CLI `npm run check:audio`. |
| `G/tools/audio/gen.sh` | Create. Runs the generator for one pack (or a `lines.json` path) with the floor, ledger and cap from `budget.json`. |
| `G/tools/audio/budget.json` | Create. `{cap, floor, startCredits, measured}`. |
| `G/tools/audio/ledger.jsonl` | Written by the generator. One JSON line per run. Committed. |
| `G/tools/audio/pronounce.ts` | Create (Wave B). Phoneme codes to IPA, graphemes to respelling. |
| `G/tools/audio/ipa-probe.ts` | Create (Wave B). Writes the probe pack and decides the pronunciation mode. |
| `G/tools/audio/probe/` | Generated (Wave B). The IPA probe clips, never shipped. |
| `G/tools/audio/pronounce-mode.json` | Create (Wave B). The probe's verdict: `ipa` or `respell`. |
| `G/tools/pull-unknown-names.ts` | Create (Wave B, server source in Wave C). `npm run names:pull`. |
| `G/tools/names-lib.ts` | Create (Wave B). Pure helpers for the name pull. |
| `G/tools/vite-shared-audio.ts` | Create. Vite plugin: alias `@emma/audio-player` to `shared/audio.js`, serve and emit `audio/phonics/`. |
| `G/public/audio/<pack>/lines.json`, `manifest.json`, `overrides.json`, `*.mp3` | Generated. Committed. |
| `G/src/audio/ids.ts` | Create. Id builders shared by tools and app. |
| `G/src/audio/clip-index.ts` | Create. `ClipIndex`: which clips exist and are usable. |
| `G/src/audio/speech.ts` | Create. Speech-order rules (act, listen, replay). |
| `G/src/audio/facade.ts` | Create. `createAudio(player, packs, sceneClips)`. |
| `G/src/audio/packs.ts` | Create. `PACKS` in load order. |
| `G/src/audio/player.ts` | Create. Loads `shared/audio.js` and exports the typed `window.EmmaAudio`. |
| `G/src/audio/emma-audio.ts` | Create. Types for `window.EmmaAudio`. |
| `G/src/audio/shared-player.d.ts` | Create. `declare module '@emma/audio-player';` |
| `G/src/audio/clip-ids.ts` | Generated. `ClipId`, `SceneId`, `SCENES`, `SCENE_CLIPS`. Committed. |
| `G/src/audio/index.ts` | Create. The app's `audio` object and re-exports. |
| `G/tests/audio/*.test.ts` | Create. Vitest suites. |
| `G/tests/audio/fake-web-audio.ts` | Create. Fake `AudioContext` and `fetch` for the `shared/audio.js` tests. |
| `G/flows/audio-check.html` | Create. WebKit page that decodes every clip of every pack. |

---

## Contracts I need

The integrator reconciles these with the other plans. Each line says what I code against.

1. **Skeleton (item 1).**
   - `G/package.json` has Vitest 5.0.3 and these scripts, added by me in Task A6 if the skeleton has not: `"audio:lines": "node tools/audio/build-lines.ts"`, `"audio:ids": "node tools/audio/gen-clip-ids.ts"`, `"check:audio": "node tools/audio/check-audio.ts"`, `"names:pull": "node tools/pull-unknown-names.ts"`.
   - `package.json` has `@types/node` 24.x as a dev dependency (the tools use `node:fs`), and `tsconfig.json` has `allowImportingTsExtensions: true`, `noEmit: true` and `types` including `node` for `tools/` and `tests/`. Relative imports use `.ts` extensions (Node type stripping, as core's `events.ts`). No enums.
   - `vitest.config.ts` (or the `test` block of `vite.config.ts`) includes `tests/**/*.test.ts` with the default `node` environment.
   - `vite.config.ts` adds `sharedAudio(resolve(import.meta.dirname, '../..'))` from `tools/vite-shared-audio.ts` to `plugins`. The plugin owns the `@emma/audio-player` alias and `server.fs.allow`.
   - The built app is served at `/games/moon-meadow-home/`, and Vite copies `public/audio/` into the build. The app inits audio with `import.meta.env.BASE_URL + 'audio/'`.
   - The Node server serves `.mp3` as `audio/mpeg` and `.json` as `application/json`, and also serves the whole repo statically (for `G/flows/audio-check.html` and `shared/review.html`).
2. **Content (item 4).**
   - Word bank: `G/content/words/*.json`, each `{ "words": WordEntry[] }` with `WordEntry = { word: string; step: string; graphemes: string[]; picture: string; plural?: { word: string; ending: 's' | 'es' | 'irregular' }; say?: string }`. `step` is the reading step code (`R01` to `R54`, `R04D`) or, for spelling-only words, the spelling code. Building signs (pond, post) are word entries.
   - Phrases Elizabeth reads after an act (tricky-word phrases, adjective phrases, R28 and R29 sentences, notes, asking sentences, two-state wishes, salon card lines): `G/content/phrases/*.json`, each `{ "phrases": PhraseEntry[] }` with `PhraseEntry = { text: string; step: string; place: string; marks?: Array<'.' | '?' | '!'> }`. `marks` asks for one clip per end mark (notes to Lumi). A phrase never contains a baby's name, because a herd name would need a clip per name and sentence. A wish that names its baby uses "me" ("Put the hat on me.").
   - Name bank: `G/content/names/t1.json`, `{ "names": NameEntry[] }` with `NameEntry = { name: string; graphemes: string[]; phonemes: string[]; group: string; tier: 1 | 2; rank?: number; picture?: string; say?: string; ipa?: string; seed?: number }`. Lower `rank` is generated first. `say` is a respelling, `ipa` an IPA string without slashes.
   - Phoneme codes in `graphemes`/`phonemes` and gems are keys of `shared/audio/phonics/index.json`: `s a t p i n m d g o c k ck e u r h b f ff l ll ss j v w x y z zz qu ch sh th ng nk ai ee igh oa oo oo-short ar or ur ow oi ear air er yoo iz`, plus the Phase 5 aliases of Task A2.
   - The name bank includes the cousins Dot and Bex with a rank below 300 (Fen is a v2 name), so the Salon can say their names.
   - Every file above may be missing when Task A10 first runs. `build-lines.ts` then writes empty packs, and the word, phrase and name runs repeat when content lands.
3. **Core (item 3, 5).**
   - The planner calls `audio.hasClip(wordId(word))` and `audio.hasName(name)` and never serves an item whose clip is absent (spec 4.7). `hasClip` is synchronous after `audio.init()` resolves.
   - The store subscribes `audio.onMissing(id => dispatch({ type: 'audio/missing', id }))` once and turns it into one `audio.missing {id}` event per id.
   - Event `name.built` carries `{ name: string; gems: Array<{ g: string; p: string }>; route: 'bell' | 'garden' | 'gold'; outcome: 'no-vowel' | 'blocked' | 'list' | 'unknown' | 'chosen'; t: number }` flat on the event. Export file: `{ format: 'moon-meadow-save', v: 1, exportedAt: string, events: Event[] }`.
   - Test hook: `window.__game.mute(on)` calls `audio.mute(on)`, `window.__game.fast(on)` calls `audio.setFast(on)`, and the hook adds `said(): readonly string[]` (returns `audio.said`) and `audioMissing(): readonly string[]` (returns `audio.missing`). Flows assert `audioMissing()` is empty.
4. **Scenes (items 6 to 13 and later).**
   - Scenes use only `src/audio/index.ts`, never `window.EmmaAudio`.
   - Boot calls `await audio.init({ base: import.meta.env.BASE_URL + 'audio/' })` before the Play button is shown. The Play button's `pointerdown` calls `audio.unlock()`.
   - A scene calls `audio.preloadScene(sceneId)` on enter and `audio.release(sceneId)` on leave. `SceneId` strings are the ones in `SCENES` (Task A7).
   - Emma's act calls `audio.act()` first. A tap that asks for a sound or word calls `audio.listen(id)` or `audio.listenSound(code)`. Goals, hints and feedback use `audio.speak(...ids)`. The replay button calls `audio.replay(...goalIds)`. The naming star slider calls `audio.setSliding(true/false)`.
   - Lumi's mouth: `audio.onTalk(id => lumiTalking = !!id && id.startsWith('lumi-'))`.
   - The line recipes below are the agreed sequences.
5. **Places plan (`docs/v3/plan/places.md`).** It assumes `say`, `sayAll`, `has`, `preloadScene(): Promise<void>` and a `places` pack with its own ids (`pl-more-than-one`, `pl-just-one`, `pl-look-in-jar`, `pl-mice`, `nm-too-many-1` to `nm-too-many-9`). This plan provides `say`, `sayAll` and `has` as aliases, adds `places` to `PACKS`, and builds it from `content/lines/places.json` with `"pack": "places"` written by that workstream (same file format as AD1). Where its lines repeat mine (`fb-more-than-one`, `fb-just-one`, `g-look-jar`, `phrase-one-mouse-lots-of-mice`, `num-over-<n>`), the identical text makes the second clip free from the raw cache. The integrator may still map them to my ids. `places` does not call `addPack` itself: `audio.init` adds every pack in `PACKS`.
6. **Save server (item 25, Wave C).** `GET /games/moon-meadow-home/api/admin/unknown-names` with header `Authorization: Bearer <admin token>` returns `{ names: Array<{ name: string; gems: Array<{ g: string; p: string }>; firstSeen: string; count: number }> }`. The admin token is in `G/server/data/admin-token` (gitignored, one line), written by the server on first start. My tool reads that file and never prints it.

---

## Contracts I provide

```ts
// G/src/audio/index.ts
export const audio: Audio<SpokenId, SceneId>;
export type SpokenId = ClipId | DynamicId;
export { wordId, phraseId, nameId, numId, bondId, parcelId, ordId, slug, isDynamic } from './ids.ts';
export type { ClipId, SceneId } from './clip-ids.ts';
export type { NameMark, DynamicId, NumKind } from './ids.ts';

export interface Audio<Id extends string, Scene extends string> {
  init(opts: { base: string }): Promise<void>;
  unlock(): Promise<void>;
  hasClip(id: string): boolean;
  has(id: string): boolean;                                   // alias of hasClip
  hasName(name: string): boolean;
  nameClip(name: string, mark: NameMark): NameClipId | null;  // '?' falls back to '!'
  say(id: Id | null | undefined): Promise<void>;
  speak(...ids: Array<Id | null | undefined>): Promise<void>;
  sayAll(ids: ReadonlyArray<Id | null | undefined>): Promise<void>; // alias of speak
  replay(...ids: Array<Id | null | undefined>): Promise<void>;
  sayName(name: string, mark: NameMark): Promise<void>;
  listen(id: Id | null | undefined): Promise<void>;
  listenSound(code: string): Promise<void>;
  sound(code: string): Promise<void>;
  hold(code: string): HoldHandle;
  sfx(name: SfxName): Promise<void>;
  act(): void;
  stop(): void;
  mute(on: boolean): void;
  setSliding(on: boolean): void;
  preload(ids: readonly string[]): Promise<string[]>;
  preloadScene(scene: Scene): Promise<string[]>;
  release(scene: Scene): void;
  preloadAll(): Promise<string[]>;
  refreshNames(): Promise<void>;
  onMissing(cb: (id: string) => void): () => void;
  onTalk(cb: (id: string | null) => void): () => void;
  setFast(on: boolean): void;
  readonly said: readonly string[];
  readonly speaking: boolean;
  readonly missing: readonly string[];
}
```

Behaviour that other workstreams rely on:

- `speak` drops `null` and drops a dynamic id (`word-`, `phrase-`, `name-`, `num-`, `ord-`) that is not in the clip index, silently. A static `ClipId` always goes to the player, which warns and records it as missing if its file is absent.
- `speak` waits while a `listen` or the naming slider is playing, and stops as soon as `act()` is called. `replay` also stops when she starts a `listen`.
- `sayName(name, '?')` uses the "?" clip, else the "!" clip, else says nothing.
- In fast mode nothing plays, every call resolves at once, and `said` records each id that would have played.

### Line recipes

| Moment | Call |
|---|---|
| Arrival, returning player | `speak('lumi-hello-back', 'g-egg-waiting')` |
| New player | `speak('lumi-hello', 'lumi-meadow-yours', 'lumi-crown')` |
| Moving Day | `speak('lumi-moving', 'g-here-they-come')`, each baby `sayName(name, '!')`, stalls 1 to 3 `speak(numId('n', k))`, then `speak(numId('tap-door', 4))`, at the end `speak('g-pins-came')` |
| Moon egg M01 / M02 / M09 | `speak('g-egg', 'g-moon-stars')` / `speak('g-egg', 'g-moon-count')` / `speak('g-moon-cups')`, hint 2 `speak('h-stars')` |
| Small nest M05, M12 | `speak('g-small-nest', numId('nest', cups), 'g-stone')` |
| Two-stone egg M10 | `speak('g-two-stones')`, after the first stone `speak('g-one-more')` |
| Blanket egg M11 | `speak('g-blanket', numId('warm', warm), 'g-stone')`, hint 2 `speak('h-peek')` |
| Too many / too few | `speak('fb-hot', numId('over', k))` / `speak('fb-brr', numId('cold', k))`, hint 2 `speak('h-count')` |
| Egg warm | `speak('fb-warm', bondId(a, b))` (the fact, for bond eggs) or `speak('fb-warm')` |
| Hatch | `speak('lumi-hatching')`, then `speak(shiny ? 'lumi-sparkly' : 'lumi-baby', 'foal-hello')` |
| Name bells | `speak('g-bells')`, after a bell is tapped `listen(nameClip(name, '?'))`, then `speak('g-bell-drag')`; tree hint `speak('g-tree')` |
| Name garden | `speak('g-garden')` or `speak('g-garden-sound')` |
| Spell a name | `speak('g-spell', nameClip(name, '!'), 'g-gems')`, all slots filled `speak('g-slide')`, success `speak(nameClip(name, '!'), 'fb-spelled')` |
| Readback after a wrong build | `speak('fb-says')`, then `sound(code)` for each built gem in turn, then `speak('g-now-listen', nameClip(name, '!'))` (or `wordId(word)` on a label) |
| Gift gem tap | `listen('g-gift-gem')` then `listenSound(code)` |
| Gold bell | `speak('g-gold')`, plus slot ghost hand `speak('g-plus-slot')`. No vowel `speak('fb-no-vowel')`. Blocked `speak('foal-giggle', 'fb-silly-name')`. List name `speak(nameClip(listName, '!'), 'fb-gold-yes')`. Unknown name `speak('fb-tricky')` |
| Duplicate name | `speak(nameClip(name, '!'), ordId(k))` |
| The moon told me a new name | `speak('lumi-moon-name', nameClip(name, '!'), 'foal-yay')` |
| First wish or basket wish | `speak('g-wish')` (station wish `speak('g-station')`), after the act `speak(wordId(word), schoolPlural ? (plural ? 'fb-more-than-one' : 'fb-just-one') : null, 'foal-yay')`, mistake `speak('foal-silly')` |
| Twin wish, second baby | `speak('g-twin')` |
| Item tap in free play | `listen(wordId(item))` |
| Move-in | `speak(nameClip(name, '!'), numId('movein', stall))`, no door yet `speak('g-camp')` |
| Door visit | `speak(nameClip(name, '!'), numId('visit', door))`, neighbour `speak('foal-hello')`, wrong door `speak('foal-notme', numId('n', tapped))` |
| Goodnight | `speak('lumi-bedtime')`, roll call by name `speak('g-roll-call')`, by door `speak(numId('door-bed', door))`, wrong `speak('foal-notme')`, sleepy `speak('foal-yawn')`, count `speak(numId('herd', herd), sky ? numId('sky', sky) : null, 'lumi-goodnight')`, new sky unicorn `speak('g-sky-name')` |
| Label bubble | `speak('foal-look', 'g-write-label', wordId(target))`, level 3 after the build `speak('g-look-jar')`, hint 2 `speak(numId('count', k))`, done `speak(wordId(label), plural ? 'fb-more-than-one' : 'fb-just-one')` |
| Mice jar | `listen(wordId('mice'))` then `speak('phrase-one-mouse-lots-of-mice')` |
| Meadow openings | bubbles `speak('g-bubbles')`, moon `speak('g-moon')`, pond `speak('g-pond-ready')`, new egg `speak('g-new-egg')`, way back `speak('g-meadow-way')` |
| Building Day | `speak('lumi-builders')`, walls `speak('g-wall-planks', numId('up', up))` (bricks `g-wall-bricks`), too short `speak(numId('more', k))`, too tall `speak('foal-giggle', 'fb-too-tall', numId('over', k))`, trim `speak('g-trim')` or `speak('g-trim-free')`, sign `speak('g-sign', wordId(sign))`, ribbon `speak('g-ribbon')`, herd circle `speak('g-circle')`, done `speak('lumi-built')`, row name `speak('g-row-name')` |
| Ghost hand, level 3 hint | `speak('g-look')` |
| Wave B and C moments | In Tasks B1 and C1 |

---

# Wave A: first playable

Wave A is done when Tasks A1 to A10 are committed, `npm run check:audio` reports no errors, and the WebKit audio check in Task A10 decodes every clip. Wave B starts after that.

### Task A1: Generator budget guards and speech-to-text with retries

**Files:**
- Modify: `scripts/generate-audio.py`
- Create: `scripts/tests/test_generate_audio.py`, `G/tools/audio/budget.json`, `G/tools/audio/gen.sh`

**Interfaces:**
- Consumes: `shared/cast.json` (unchanged), the raw cache `.cache/tts/`.
- Produces (Python, module-level, used by `generate-phonics.py` and the tests):
  - `num_to_words(n: int) -> str`, `norm_text(t: str) -> str` (digits up to 999 become words)
  - `phonetic_key(text: str) -> str`
  - `stt_judge(text: str, heard: str, expect=(), others=()) -> 'exact' | 'expect' | 'alike' | 'other-word' | 'miss'`, and `STT_PASS = ('exact', 'expect', 'alike')`
  - `judge_line(line: dict, heard: str, lines: list[dict]) -> str`
  - `budget_limit(before: int, floor: int, used: int, cap: int) -> int`, `retry_seed(base: int, attempt: int) -> int`, `read_ledger(path) -> int`, `apply_overrides(lines, overrides) -> list`
  - `LEARNING_PREFIXES`, `STT_SPEAKERS = ('narrator', 'queen')`, `NARRATOR_ONLY_PREFIXES` with `phrase-` and `ord-`
- CLI (new options): `--credits`, `--floor N`, `--ledger PATH`, `--cap N`, `--strict-order`, `--stt-retry N`. The positional `lines` becomes optional (only for `--credits`).
- Files per pack: `overrides.json` (`{"<id>": {"seed": 1011}}`, written by retries, committed), manifest clip entries gain `"ok": true|false` and `"stt": {"hash", "text", "match", "how"}`.
- Ledger line: `{"t": "2026-10-12T21:04:11", "lines": "games/moon-meadow-home/public/audio/core/lines.json", "made": 53, "chars": 1402, "credits": 1430, "credits_before": 33977, "stt_calls": 61}`.

- [ ] **Step 1: Write the failing tests**

`scripts/tests/test_generate_audio.py`:

```python
"""Unit tests for the pure helpers and the budget rules of scripts/generate-audio.py. No network, no key.

Run from the repo root: python3 -m unittest discover -s scripts/tests -v
"""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts' / 'generate-audio.py'
_spec = importlib.util.spec_from_file_location('generate_audio', SCRIPT)
ga = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ga)


class NumbersAndText(unittest.TestCase):
    def test_number_words(self):
        self.assertEqual(ga.num_to_words(7), 'seven')
        self.assertEqual(ga.num_to_words(41), 'forty-one')
        self.assertEqual(ga.num_to_words(100), 'one hundred')
        self.assertEqual(ga.num_to_words(105), 'one hundred and five')

    def test_norm_text_turns_digits_into_words(self):
        self.assertEqual(ga.norm_text('Door 12, bedtime!'), 'door twelve bedtime')
        self.assertEqual(ga.norm_text('41 unicorns'), 'forty one unicorns')
        self.assertEqual(ga.norm_text('[giggles] Hello!'), 'hello')


class SttJudge(unittest.TestCase):
    def test_sound_alike_transcripts_pass(self):
        cases = [('Lin!', 'Lynn'), ('Fin!', 'Finn'), ('Liss!', 'Lis'), ('Ren!', 'Wren'), ('Mit!', 'Mitt'),
                 ('Mam!', "Ma'am"), ('A net.', 'Annette'), ('Two too many.', 'Too, too many'),
                 ('Play time! Drag it.', 'Playtime. Drag it'), ('Brr!', 'Brrr.'), ('Ponn.', 'Pon'),
                 ('Sea.', 'See.'), ('Forty-one unicorns!', '41 unicorns.')]
        for text, heard in cases:
            self.assertIn(ga.stt_judge(text, heard), ga.STT_PASS, (text, heard))

    def test_different_words_fail(self):
        for text, heard in [('Pan.', 'Pen.'), ('Pon!', 'Pawn'), ('Bed.', 'Bet.'), ('Ship.', 'Sheep.'), ('Hat.', 'Hats.')]:
            self.assertEqual(ga.stt_judge(text, heard), 'miss', (text, heard))

    def test_another_word_of_the_pack_fails_even_when_it_sounds_alike(self):
        self.assertEqual(ga.stt_judge('Full.', 'Fool.', others=['Fool.']), 'other-word')
        self.assertEqual(ga.stt_judge('Cap.', 'Cape.', others=['Cape.']), 'other-word')
        self.assertEqual(ga.stt_judge('Cap.', 'Cap.', others=['Cape.']), 'exact')

    def test_expect_list(self):
        self.assertEqual(ga.stt_judge('/tɒt/!', 'Tot', expect=['Tot']), 'expect')

    def test_judge_line_uses_other_words_only_for_words_and_phrases(self):
        lines = [{'id': 'word-full', 'text': 'Full.'}, {'id': 'word-fool', 'text': 'Fool.'},
                 {'id': 'name-lin-x', 'text': 'Lin!'}, {'id': 'name-lynn-x', 'text': 'Lynn!'}]
        self.assertEqual(ga.judge_line(lines[0], 'Fool', lines), 'other-word')
        self.assertIn(ga.judge_line(lines[2], 'Lynn', lines), ga.STT_PASS)


class Budget(unittest.TestCase):
    def test_budget_limit(self):
        self.assertEqual(ga.budget_limit(34007, 10007, 0, 24000), 24000)
        self.assertEqual(ga.budget_limit(12000, 10007, 5000, 24000), 1993)
        self.assertEqual(ga.budget_limit(9000, 10007, 0, 24000), 0)
        self.assertEqual(ga.budget_limit(30000, 10007, 23500, 24000), 500)

    def test_retry_seed(self):
        self.assertEqual(ga.retry_seed(11, 1), 1011)
        self.assertEqual(ga.retry_seed(11, 2), 2011)

    def test_read_ledger(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'ledger.jsonl'
            self.assertEqual(ga.read_ledger(p), 0)
            p.write_text('{"credits": 120}\n{"credits": 30}\n')
            self.assertEqual(ga.read_ledger(p), 150)

    def test_apply_overrides(self):
        lines = [{'id': 'a', 'speaker': 'narrator', 'text': 'A.'}, {'id': 'b', 'speaker': 'narrator', 'text': 'B.', 'seed': 3}]
        out = ga.apply_overrides(lines, {'b': {'seed': 1003}})
        self.assertEqual(out[0], lines[0])
        self.assertEqual(out[1]['seed'], 1003)
        self.assertEqual(lines[1]['seed'], 3)

    def test_validate_refuses_phrase_and_ordinal_lines_by_another_voice(self):
        cast = ga.load_cast()
        errors, _ = ga.validate([{'id': 'phrase-a-hat', 'speaker': 'queen', 'text': 'A hat.'},
                                 {'id': 'ord-2', 'speaker': 'foal', 'text': 'The Second!'}], cast)
        self.assertEqual(len(errors), 2)


class DryRunBudget(unittest.TestCase):
    """The planner in main(): --cap with the ledger, and --strict-order. Dry runs call no API."""

    def run_dry(self, *extra):
        with tempfile.TemporaryDirectory() as d:
            tag = ''.join(chr(97 + int(c, 16)) for c in uuid.uuid4().hex[:6])  # unique letters: no cache hit, no digit
            lines = [{'id': 'g-a', 'speaker': 'narrator', 'text': f'Aaaa {tag}.'},             # 12 characters
                     {'id': 'g-b', 'speaker': 'narrator', 'text': f'Bbbbbbbbbbbbbbbbbbbb {tag}.'},  # 28
                     {'id': 'g-c', 'speaker': 'narrator', 'text': f'C {tag}.'}]               # 9
            (Path(d) / 'lines.json').write_text(json.dumps({'lines': lines}))
            ledger = Path(d) / 'ledger.jsonl'
            ledger.write_text('{"credits": 5}\n')
            r = subprocess.run([sys.executable, str(SCRIPT), str(Path(d) / 'lines.json'), '--dry-run',
                                '--ledger', str(ledger), '--cap', '27', *extra], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            return r.stdout

    def test_cap_skips_lines_that_do_not_fit(self):
        out = self.run_dry()
        self.assertIn(' g-a ', out)
        self.assertIn(' g-c ', out)
        self.assertIn('Not made this run (1): g-b', out)

    def test_strict_order_stops_at_the_first_line_that_does_not_fit(self):
        out = self.run_dry('--strict-order')
        self.assertIn(' g-a ', out)
        self.assertNotIn(' g-c ', out)
        self.assertIn('Not made this run (2): g-b, g-c', out)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the tests and see them fail**

Run from the repo root: `python3 -m unittest discover -s scripts/tests -v`
Expected: errors such as `AttributeError: module 'generate_audio' has no attribute 'stt_judge'`.

- [ ] **Step 3: Replace the helpers**

In `scripts/generate-audio.py`:

1. Replace the line `NARRATOR_ONLY_PREFIXES = ('word-', 'name-', 'num-', 'sound-')` with:

```python
NARRATOR_ONLY_PREFIXES = ('word-', 'name-', 'num-', 'sound-', 'phrase-', 'ord-')
LEARNING_PREFIXES = ('word-', 'name-', 'num-', 'phrase-', 'ord-')
STT_SPEAKERS = ('narrator', 'queen')
```

2. Replace everything from `NUMBERS = ['zero', ...` up to (not including) `def validate(lines, cast):` with:

```python
ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
        'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def num_to_words(n):
    """British number words for 0 to 999: 41 -> forty-one, 105 -> one hundred and five."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ('' if n % 10 == 0 else '-' + ONES[n % 10])
    rest = n % 100
    return ONES[n // 100] + ' hundred' + ('' if rest == 0 else ' and ' + num_to_words(rest))


def norm_text(t):
    t = TAG_RE.sub(' ', t).lower().replace('’', "'")
    t = re.sub(r'\b(\d{1,3})\b', lambda m: num_to_words(int(m.group(1))), t)
    t = re.sub(r"[^a-z0-9' ]+", ' ', t)
    return ' '.join(t.split())


HOMOPHONES = {'two': 'to', 'too': 'to', 'four': 'for', 'won': 'one', 'ate': 'eight'}
WORD_RULES = [  # applied in order to each word
    (r"'", ''), (r'^wr', 'r'), (r'^kn', 'n'), (r'^wh', 'w'), (r'ph', 'f'), (r'ck', 'k'), (r'q', 'k'),
    (r'c(?=[aoulrt]|$)', 'k'), (r'x', 'ks'), (r'gh', ''),
    (r'ee|ea|ey', 'e'), (r'ai|ay', 'a'), (r'oa|ow|oe', 'o'), (r'oo|ew|ue', 'u'), (r'(?<=.)y', 'i'),
    (r'(?<=..)e$', ''), (r'(.)\1+', r'\1'),
]


def phonetic_key(text):
    """A rough sound-alike key: Lin and Lynn, A net and Annette, Mitt and Mit give the same key."""
    out = []
    for w in norm_text(text).replace('-', ' ').split():
        w = HOMOPHONES.get(w, w)
        for pat, rep in WORD_RULES:
            w = re.sub(pat, rep, w)
        out.append(w)
    return re.sub(r'(.)\1+', r'\1', ''.join(out))


def stt_judge(text, heard, expect=(), others=()):
    """'exact', 'expect', 'alike', 'other-word' or 'miss'.

    others: texts of the other lines in the same lines.json. When the transcript is exactly another line
    (pan heard for pen, cape for cap), the clip says the wrong word, so it is a miss even if it sounds alike.
    """
    h = norm_text(heard)
    if h == norm_text(text):
        return 'exact'
    if any(h == norm_text(e) for e in expect):
        return 'expect'
    if any(h == norm_text(o) for o in others if norm_text(o) != norm_text(text)):
        return 'other-word'
    if phonetic_key(heard) and phonetic_key(heard) == phonetic_key(text):
        return 'alike'
    return 'miss'


STT_PASS = ('exact', 'expect', 'alike')


def budget_limit(before, floor, used, cap):
    """Credits this run may spend: never below the floor of credits left, never above the build cap."""
    return max(0, min(before - floor, cap - used))


def retry_seed(base, attempt):
    return base + 1000 * attempt


def read_ledger(path):
    """Credits spent by earlier runs, from a JSON-lines ledger. A missing file is zero."""
    if not path or not Path(path).exists():
        return 0
    return sum(int(json.loads(l).get('credits', 0)) for l in Path(path).read_text().splitlines() if l.strip())


def apply_overrides(lines, overrides):
    """overrides.json next to lines.json: {id: {seed}}. Written by --stt-retry, so lines.json can be rebuilt freely."""
    out = []
    for line in lines:
        o = overrides.get(line['id'])
        out.append(dict(line, **{k: v for k, v in o.items() if k in ('seed', 'text')}) if o else line)
    return out
```

- [ ] **Step 4: Replace `main()`**

Replace the whole `def main():` function (up to `if __name__ == '__main__':`) with:

```python
def judge_line(line, heard, lines):
    """Speech-to-text verdict for one line. Words and phrases also fail when the transcript is another word."""
    others = []
    if line['id'].startswith(('word-', 'phrase-')):
        others = [l['text'] for l in lines if l['id'] != line['id'] and l['id'].startswith(('word-', 'phrase-'))]
    return stt_judge(line['text'], heard, line.get('expect', ()), others)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('lines', nargs='?', help='path to a lines.json')
    ap.add_argument('--max-chars', type=int, default=None, help='hard limit on characters sent to the API this run')
    ap.add_argument('--dry-run', action='store_true', help='show what would be generated, call nothing')
    ap.add_argument('--only', default='', help='comma separated ids')
    ap.add_argument('--force', action='store_true', help='regenerate even when cached')
    ap.add_argument('--stt', action='store_true', help='check narrator and queen clips with speech-to-text (scribe_v2)')
    ap.add_argument('--stt-retry', type=int, default=0, help='regenerate a clip that fails speech-to-text up to N times')
    ap.add_argument('--credits', action='store_true', help='print the credits left this month and stop')
    ap.add_argument('--floor', type=int, default=MIN_CREDITS, help='never leave fewer credits than this (at least 8000)')
    ap.add_argument('--ledger', default=None, help='JSON-lines file of earlier runs; this run is appended')
    ap.add_argument('--cap', type=int, default=None, help='most credits all runs in the ledger may spend together')
    ap.add_argument('--strict-order', action='store_true', help='stop at the first line over budget (keeps priority order)')
    args = ap.parse_args()

    if args.credits:
        left, _ = credits_left()
        print(f'Credits left this month: {left}')
        return
    if not args.lines:
        ap.error('the lines.json path is required')

    lines_path = Path(args.lines).resolve()
    audio_dir = lines_path.parent
    rel = lines_path.relative_to(ROOT) if lines_path.is_relative_to(ROOT) else lines_path
    data = json.loads(lines_path.read_text())
    base_lines = data['lines']
    overrides_path = audio_dir / 'overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    lines = apply_overrides(base_lines, overrides)
    by_id = {l['id']: l for l in lines}
    cast = load_cast()
    errors, warnings = validate(lines, cast)
    for w in warnings:
        print('warning:', w)
    if errors:
        for e in errors:
            print('error:', e)
        raise SystemExit(f'{len(errors)} error(s) in {lines_path}. Nothing generated.')

    only = {s.strip() for s in args.only.split(',') if s.strip()}
    unknown = only - set(by_id)
    if unknown:
        raise SystemExit('Unknown ids in --only: ' + ', '.join(sorted(unknown)))

    manifest_path = audio_dir / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    clips = manifest.get('clips', {})
    floor = max(MIN_CREDITS, args.floor)
    used = read_ledger(args.ledger)
    cap = args.cap if args.cap is not None else 10 ** 9

    before = None
    if not args.dry_run:
        before, _ = credits_left()
        print(f'Credits left this month: {before} (floor {floor}, ledger {used} of cap {cap if args.cap else "none"})')
        if before < floor:
            raise SystemExit(f'Refusing to run: fewer than {floor} credits left ({before}).')
        allowed = budget_limit(before, floor, used, cap)
    else:
        allowed = cap - used if args.cap is not None else None

    sent = {'chars': 0, 'credits': 0, 'made': 0, 'failed': [], 'stt': 0}
    lock = threading.Lock()

    def save_manifest():
        manifest['clips'] = {l['id']: clips[l['id']] for l in lines if l['id'] in clips}
        manifest['updated'] = datetime.datetime.now().isoformat(timespec='seconds')
        tmp = manifest_path.with_suffix('.tmp')
        tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
        tmp.replace(manifest_path)

    def plan(targets, force):
        """Split lines into work items and lines over budget, in file order."""
        todo, skipped, over, chars_sum, credits_sum, hashes, stop = [], 0, [], 0, 0, set(), False
        for line in targets:
            req = request_for(line['speaker'], line['text'].strip(), cast, line.get('seed'))
            h = clip_hash(req)
            out = audio_dir / f'{line["id"]}.mp3'
            if not force and clips.get(line['id'], {}).get('hash') == h and out.exists():
                skipped += 1
                continue
            needs_api = (force or not (RAW_CACHE / f'{h}.mp3').exists()) and h not in hashes
            chars = len(req['text']) if needs_api else 0
            credits = chars * cast[line['speaker']].get('credits_per_char', 1)
            budget_left = None if allowed is None else allowed - sent['credits']
            too_many = needs_api and (
                (args.max_chars is not None and sent['chars'] + chars_sum + chars > args.max_chars)
                or (budget_left is not None and credits_sum + credits > budget_left))
            if stop or too_many:
                over.append(line['id'])
                stop = stop or args.strict_order
                continue
            if needs_api:
                hashes.add(h)
            chars_sum += chars
            credits_sum += credits
            todo.append((line, req, h, out, needs_api))
        return todo, skipped, over, chars_sum, credits_sum

    def make(todo, force):
        hash_locks = {h: threading.Lock() for _, _, h, _, _ in todo}

        def work(item):
            line, req, h, out, needs_api = item
            with hash_locks[h]:  # a shared text waits for the first call and then reads the cache
                raw, chars = tts_raw(req, force=force and needs_api)
            process_speech(raw, out)
            return line, req, h, out, chars

        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(work, item): item for item in todo}
            for fut in concurrent.futures.as_completed(futures):
                line = futures[fut][0]
                try:
                    line, req, h, out, chars = fut.result()
                except Exception as e:  # keep going, report at the end
                    sent['failed'].append(f'{line["id"]}: {e}')
                    print(f'  FAILED {line["id"]}: {e}', flush=True)
                    continue
                with lock:
                    sent['chars'] += chars
                    sent['credits'] += chars * cast[line['speaker']].get('credits_per_char', 1)
                    sent['made'] += 1
                    old_stt = clips.get(line['id'], {}).get('stt')
                    clips[line['id']] = {
                        'hash': h, 'speaker': line['speaker'], 'text': req['text'], 'file': out.name,
                        'model': req['model'], 'seed': req['seed'], 'duration_ms': duration_ms(out),
                        'generated': datetime.datetime.now().isoformat(timespec='seconds'), 'ok': True,
                    }
                    if old_stt and old_stt.get('hash') == h:
                        clips[line['id']]['stt'] = old_stt
                    save_manifest()
                    print(f'  made {line["id"]:<32} {chars:>4} chars  {line["speaker"]}', flush=True)

    def check(targets, force):
        """Speech-to-text on narrator and queen clips. Returns the ids that did not pass."""
        def one(line):
            c = clips.get(line['id'])
            if not c or not (audio_dir / c['file']).exists():
                return line, None
            if c.get('stt', {}).get('hash') == c['hash'] and not force:
                return line, c['stt']['text']
            sent['stt'] += 1
            return line, transcribe(audio_dir / c['file'])

        failed = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for line, heard in pool.map(one, [l for l in targets if l['speaker'] in STT_SPEAKERS]):
                if heard is None:
                    continue
                c = clips[line['id']]
                how = judge_line(line, heard, lines)
                c['stt'] = {'hash': c['hash'], 'text': heard, 'match': how in STT_PASS, 'how': how}
                c['ok'] = True
                if how not in STT_PASS:
                    failed.append(line['id'])
        save_manifest()
        return failed

    targets = [l for l in lines if not only or l['id'] in only]
    todo, skipped, over_budget, planned_chars, planned_credits = plan(targets, args.force)
    print(f'{rel}: {len(lines)} lines, {skipped} unchanged, {len(todo)} to make '
          f'({sum(1 for t in todo if t[4])} need the API: {planned_chars} characters, about {planned_credits} credits)')
    if over_budget:
        print(f'Budget reached. Not made this run ({len(over_budget)}): '
              + ', '.join(over_budget[:20]) + (' ...' if len(over_budget) > 20 else ''))
    if args.dry_run:
        for line, req, h, out, needs_api in todo:
            print(f'  {"API " if needs_api else "cache"} {line["id"]:<32} {line["speaker"]:<9} {req["text"]}')
        return

    make(todo, args.force)
    mismatches = []
    if args.stt:
        mismatches = check(targets, args.force)
        base_seed = {l['id']: l.get('seed', cast[l['speaker']]['seed']) for l in base_lines}
        for attempt in range(1, args.stt_retry + 1):
            if not mismatches:
                break
            for lid in mismatches:
                overrides[lid] = {'seed': retry_seed(base_seed[lid], attempt)}
            overrides_path.write_text(json.dumps(overrides, indent=1, sort_keys=True) + '\n')
            retry_lines = apply_overrides([by_id[i] for i in mismatches], overrides)
            for l in retry_lines:
                by_id[l['id']] = l
            lines[:] = [by_id[l['id']] for l in lines]
            todo, _, over, _, _ = plan(retry_lines, False)
            if over:
                print(f'Budget reached during retry {attempt}: {", ".join(over)}')
            print(f'Retry {attempt}: regenerating {len(todo)} clip(s) with new seeds')
            make(todo, False)
            mismatches = check(retry_lines, False)
        for lid in mismatches:
            if lid.startswith(LEARNING_PREFIXES):
                clips[lid]['ok'] = False
        save_manifest()

    save_manifest()
    current = {l['id'] for l in lines}
    orphans = sorted(p.name for p in audio_dir.glob('*.mp3') if p.stem not in current)
    if args.ledger:
        record = {'t': datetime.datetime.now().isoformat(timespec='seconds'), 'lines': str(rel), 'made': sent['made'],
                  'chars': sent['chars'], 'credits': sent['credits'], 'credits_before': before, 'stt_calls': sent['stt']}
        with open(args.ledger, 'a') as f:
            f.write(json.dumps(record) + '\n')

    print('\nSummary')
    print(f'  generated: {sent["made"]}, skipped (unchanged): {skipped}, failed: {len(sent["failed"])}, '
          f'not made (budget): {len(over_budget)}')
    print(f'  characters sent: {sent["chars"]} (about {sent["credits"]} credits), speech-to-text calls: {sent["stt"]}')
    if before is not None:
        print(f'  credits left before this run: {before} (the usage counter can lag a few minutes)')
    if orphans:
        print(f'  mp3 files with no line in lines.json ({len(orphans)}): {", ".join(orphans[:15])}')
    if args.stt:
        print(f'  speech-to-text failures after retries: {len(mismatches)}')
        for lid in mismatches:
            c = clips[lid]
            print(f'    {lid}: wanted {c["text"]!r}, heard {c["stt"]["text"]!r} ({"excluded" if c.get("ok") is False else "kept"})')
    if sent['failed']:
        for f in sent['failed']:
            print('  failed:', f)
        sys.exit(1)
```

Also update the module docstring's usage block to:

```
    python3 scripts/generate-audio.py <path>/lines.json [--max-chars N] [--dry-run] [--only id1,id2]
        [--force] [--stt] [--stt-retry N] [--floor N] [--ledger PATH] [--cap N] [--strict-order]
    python3 scripts/generate-audio.py --credits
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `python3 -m unittest discover -s scripts/tests -v`
Expected: `Ran 14 tests` and `OK`.

- [ ] **Step 6: Check v2 still works unchanged**

Run: `python3 scripts/generate-audio.py ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json --dry-run`
Expected: `246 lines, 246 unchanged, 0 to make`.

- [ ] **Step 7: Measure the credits and write the budget**

Run from the repo root, outside the sandbox (the script reads the key file itself and calls the API): `python3 scripts/generate-audio.py --credits`
Expected: `Credits left this month: <N>` (about 34,007).

Create `G/tools/audio/budget.json` with the measured number, `floor` = max(8000, N - 24000):

```json
{
 "cap": 24000,
 "startCredits": 34007,
 "floor": 10007,
 "measured": "2026-10-12",
 "note": "Build budget for the v3 session. Every generator run passes the floor, the ledger and the cap (tools/audio/gen.sh)."
}
```

Create `G/tools/audio/gen.sh`:

```sh
#!/bin/sh
# Make the clips of one v3 audio pack within the build budget.
# Usage, from the repo root and outside the sandbox: sh games/moon-meadow-home/tools/audio/gen.sh <pack or lines.json path> [options]
set -eu
pack="$1"
shift
dir="games/moon-meadow-home"
budget="$dir/tools/audio/budget.json"
floor=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['floor'])" "$budget")
cap=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['cap'])" "$budget")
case "$pack" in
  */*) lines="$pack" ;;                          # a path, such as the IPA probe in tools/audio/probe/
  *) lines="$dir/public/audio/$pack/lines.json" ;;
esac
exec python3 scripts/generate-audio.py "$lines" \
  --floor "$floor" --ledger "$dir/tools/audio/ledger.jsonl" --cap "$cap" "$@"
```

Run: `chmod +x games/moon-meadow-home/tools/audio/gen.sh`

- [ ] **Step 8: Commit**

```sh
git add scripts/generate-audio.py scripts/tests/test_generate_audio.py games/moon-meadow-home/tools/audio/budget.json games/moon-meadow-home/tools/audio/gen.sh
git commit -m "Add a build credit budget and sound-alike speech-to-text with retries to the audio generator"
```

**Acceptance:** 14 Python tests pass. The v2 dry run shows 246 unchanged. `budget.json` holds the measured start and the floor.


### Task A2: Phase 5 letter sounds and the -es ending

**Files:**
- Modify: `scripts/generate-phonics.py`, `shared/audio/phonics/index.json` and new `snd-*.mp3` (generated)
- Create: `scripts/tests/test_generate_phonics.py`

**Interfaces:**
- Consumes: `generate-audio.py` helpers (Task A1), the raw cache.
- Produces: phonics index keys `oo-short`, `yoo`, `iz` (new sounds) and aliases `ay`, `a-e` (ai), `ea`, `e-e`, `ey` (ee), `ie`, `i-e` (igh), `oe`, `o-e` (oa), `ue` (oo), `ir` (ur), `ou` (ow), `oy` (oi), `aw`, `au` (or), `wh` (w), `ph` (f), `u-e`, `ew` (yoo). Every alias also has its own file `snd-<alias>.mp3`. `EmmaAudio.sound(code)` and `audio.sound(code)` accept every key.

- [ ] **Step 1: Write the failing test**

`scripts/tests/test_generate_phonics.py`:

```python
"""The phonics table: new Phase 5 sounds and aliases. No network."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('generate_phonics', ROOT / 'scripts' / 'generate-phonics.py')
gp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gp)

ALIASES = {'ai': ['ay', 'a-e'], 'ee': ['ea', 'e-e', 'ey'], 'igh': ['ie', 'i-e'], 'oa': ['oe', 'o-e'], 'oo': ['ue'],
           'ur': ['ir'], 'ow': ['ou'], 'oi': ['oy'], 'or': ['aw', 'au'], 'w': ['wh'], 'f': ['ff', 'ph'],
           'yoo': ['u-e', 'ew']}


class PhonicsTable(unittest.TestCase):
    def test_new_sounds_exist_with_takes_and_expectations(self):
        for g in ('oo-short', 'yoo', 'iz'):
            spec = gp.SOUNDS[g]
            self.assertEqual(spec['kind'], 'vowel')
            self.assertGreaterEqual(len(spec['takes']), 2)
            self.assertTrue(spec['expect'])

    def test_phase5_aliases(self):
        for main, aliases in ALIASES.items():
            for a in aliases:
                self.assertIn(a, gp.SOUNDS[main].get('aliases', []), (main, a))

    def test_every_key_is_unique_and_file_safe(self):
        keys = list(gp.SOUNDS) + [a for s in gp.SOUNDS.values() for a in s.get('aliases', [])]
        self.assertEqual(len(keys), len(set(keys)))
        for k in keys:
            self.assertRegex(k, r'^[a-z]+(-[a-z]+)?$')


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run it and see it fail**

Run: `python3 -m unittest scripts/tests/test_generate_phonics.py -v`
Expected: `KeyError: 'oo-short'`.

- [ ] **Step 3: Extend `SOUNDS`**

In `scripts/generate-phonics.py`, change these entries of `SOUNDS` (keep their takes and other keys) and add the three new ones at the end of the dict:

```python
    'f': dict(takes=[T('respell', 'Fffff.')], sustain=True, aliases=['ff', 'ph']),
    'w': dict(takes=[T('sonorant', 'Wet.'), T('sonorant', 'Win.')], aliases=['wh']),
    'ai': dict(takes=[T('word', 'A.'), T('strip', 'Hay.')], kind='vowel', expect=['a', 'ay', 'eh', 'hey', 'eight'],
               aliases=['ay', 'a-e']),
    'ee': dict(takes=[T('word', 'Ee.')], kind='vowel', aliases=['ea', 'e-e', 'ey']),
    'igh': dict(takes=[T('word', 'Eye.')], kind='vowel', aliases=['ie', 'i-e']),
    'oa': dict(takes=[T('word', 'Oh.')], kind='vowel', aliases=['oe', 'o-e']),
    'oo': dict(takes=[T('word', 'Ooo.')], kind='vowel', aliases=['ue']),
    'or': dict(takes=[T('word', 'Or.')], kind='vowel', aliases=['aw', 'au']),
    'ur': dict(takes=[T('word', 'Err.'), T('strip', 'Fur.')], kind='vowel', expect=['er', 'err', 'ur', 'uh', 'her'],
               aliases=['ir']),
    'ow': dict(takes=[T('word', 'Ow!')], kind='vowel', aliases=['ou']),
    'oi': dict(takes=[T('word', 'Oi!')], kind='vowel', aliases=['oy']),
    # Phase 5 (v3). Short oo as in book, cut from a word that starts with it, before the k closes.
    'oo-short': dict(takes=[T('vowel', 'Ook.'), T('vowel', 'Oook.')], kind='vowel',
                     expect=['ook', 'uk', 'oo', 'u', 'uh', 'look', 'book']),
    # The long u of cube and few.
    'yoo': dict(takes=[T('word', 'You.'), T('word', 'Yoo.')], kind='vowel', expect=['you', 'yu', 'u', 'ew', 'yoo'],
                aliases=['u-e', 'ew']),
    # The -es ending of foxes, said with the slider and the readbacks (spec 3.10).
    'iz': dict(takes=[T('word', 'Iz.'), T('word', 'Izz.')], kind='vowel', expect=['is', 'iz', 'izz', 'es', 'his']),
```

Change the `note` string written to `index.json` to: `'Pure British phonics sounds, voice Elizabeth (eleven_v4). Made by scripts/generate-phonics.py. Keyed by sound code; aliases (other spellings of the same sound) use the file of their main sound.'`

- [ ] **Step 4: Run the test and see it pass**

Run: `python3 -m unittest discover -s scripts/tests -v`
Expected: 17 tests, `OK`.

- [ ] **Step 5: Make the three new sounds (run 0)**

From the repo root, outside the sandbox:

```sh
python3 scripts/generate-phonics.py --only oo-short,yoo,iz --dry-run
python3 scripts/generate-phonics.py --only oo-short,yoo,iz --max-chars 300
python3 scripts/generate-phonics.py --max-chars 0
```

The second command makes the carriers (about 30 characters) and checks the takes with speech-to-text. The third rebuilds the whole index from the raw cache and the stored transcripts (0 characters, same choices as before) and writes every alias file. Then add the spend to the ledger, with `N` the "characters sent" the second command printed:

```sh
echo '{"t": "'"$(date +%Y-%m-%dT%H:%M:%S)"'", "lines": "shared/audio/phonics", "made": 3, "chars": N, "credits": N, "credits_before": null, "stt_calls": 6}' >> games/moon-meadow-home/tools/audio/ledger.jsonl
```

If no take of `oo-short` has a transcript in its `expect` list, delete the `oo-short` entry from `index.json` and its files, and tell the content workstream that words with phoneme `oo-short` (book, look, foot, wood) stay out of reading items until a later run.

- [ ] **Step 6: Verify**

Run: `python3 -c "import json; d = json.load(open('shared/audio/phonics/index.json'))['sounds']; print([k for k in ('oo-short','yoo','iz','ay','a-e','ea','ie','i-e','o-e','ir','ou','oy','aw','au','wh','ph','u-e','ew','ue') if k not in d])"`
Expected: `[]` (or `['oo-short']` after the fallback above). `git diff --stat shared/audio/phonics/` shows no changed `snd-` file of an existing sound.

- [ ] **Step 7: Commit**

```sh
git add scripts/generate-phonics.py scripts/tests/test_generate_phonics.py shared/audio/phonics games/moon-meadow-home/tools/audio/ledger.jsonl
git commit -m "Add the Phase 5 letter sounds and the -es ending to the phonics library"
```

**Acceptance:** the three new sounds have a chosen take whose transcript is in its expect list, every alias resolves, existing letter sounds are byte-identical.

### Task A3: Packs in the shared player

**Files:**
- Modify: `shared/audio.js`, `shared/README.md`
- Create: `G/src/audio/emma-audio.ts`, `G/src/audio/clip-index.ts` (types only used here; the class is tested in Task A8), `G/tests/audio/fake-web-audio.ts`, `G/tests/audio/emma-audio.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces on `window.EmmaAudio`:
  - `addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<ClipManifest | null>`: adds or replaces a pack. Once any pack is added, clips resolve through the packs in add order (`base + clip.file`), and the single-folder v2 lookup is no longer used.
  - `forget(ids: readonly string[]): void`: drops decoded clips, so memory is freed when a scene leaves.
  - `onMissing(fn: (id: string) => void): () => void`: called once per new missing id. Returns an unsubscribe.
  - `has(id)` looks through the packs.
- Types: `EmmaAudioApi`, `HoldHandle`, `SfxName` in `emma-audio.ts`; `ClipEntry`, `ClipManifest` in `clip-index.ts`.

- [ ] **Step 1: Write the types**

`G/src/audio/emma-audio.ts`:

```ts
/** Types for window.EmmaAudio from shared/audio.js (a classic script, see shared/README.md). */
import type { ClipManifest } from './clip-index.ts';

export type SfxName = 'pop' | 'chime' | 'sparkle' | 'whoosh' | 'soft-no' | 'fanfare' | 'splash' | 'munch' | 'tick' | 'magic' | 'hatch';
export interface HoldHandle { stop(): void; done: Promise<void> }

export interface EmmaAudioApi {
  init(o?: { base?: string; phonics?: string }): EmmaAudioApi;
  unlock(): Promise<void>;
  preload(ids: readonly string[]): Promise<string[]>;
  preloadSounds(codes?: readonly string[]): Promise<string[]>;
  say(id: string, o?: { queue?: boolean }): Promise<void>;
  sayAll(ids: readonly string[]): Promise<void>;
  sound(code: string, o?: { overlap?: boolean }): Promise<void>;
  hold(code: string): HoldHandle;
  sfx(name: SfxName): Promise<void>;
  stop(): void;
  mute(on?: boolean): boolean;
  playUrl(url: string): Promise<void>;
  has(id: string): Promise<boolean>;
  phonicsIndex(): Promise<{ sounds: Record<string, { id: string; file: string; sustain?: boolean; same_as?: string }> }>;
  addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<ClipManifest | null>;
  forget(ids: readonly string[]): void;
  onMissing(fn: (id: string) => void): () => void;
  readonly missing: string[];
  readonly speaking: boolean;
  readonly muted: boolean;
  readonly context: AudioContext | null;
}
```

`G/src/audio/clip-index.ts` (the whole file; Task A8 tests the class):

```ts
export type ClipEntry = {
  hash: string; speaker: string; text: string; file: string; model?: string; seed?: number;
  duration_ms?: number | null; generated?: string; ok?: boolean;
  stt?: { hash: string; text: string; match: boolean; how?: string; tries?: number };
};
export type ClipManifest = { clips: Record<string, ClipEntry>; updated?: string };

/** Which clips exist and may be used. A clip with ok: false failed the speech-to-text check and counts as absent. */
export class ClipIndex {
  private packs = new Map<string, ClipManifest>();

  set(pack: string, manifest: ClipManifest | null): void {
    if (manifest && manifest.clips) this.packs.set(pack, manifest);
    else this.packs.delete(pack);
  }

  has(id: string): boolean {
    for (const m of this.packs.values()) {
      const c = m.clips[id];
      if (c) return c.ok !== false;
    }
    return false;
  }

  ids(prefix = ''): string[] {
    const out = new Set<string>();
    for (const m of this.packs.values()) for (const [id, c] of Object.entries(m.clips)) if (id.startsWith(prefix) && c.ok !== false) out.add(id);
    return [...out].sort();
  }
}
```

- [ ] **Step 2: Write the failing tests**

`G/tests/audio/fake-web-audio.ts`:

```ts
import { vi } from 'vitest';

type Buffer = { duration: number; getChannelData: () => Float32Array };
const param = () => ({ value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });

/** Just enough of AudioContext for shared/audio.js: decode succeeds, a source ends 1 ms after start. */
export class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  sampleRate = 44100;
  createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
  createBuffer(_channels: number, length: number, rate: number): Buffer {
    return { duration: length / rate, getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const source: { onended?: () => void; buffer?: unknown; loop?: boolean; connect(): void; start(): void; stop(): void } = {
      connect() {},
      start() { setTimeout(() => source.onended?.(), 1); },
      stop() {},
    };
    return source;
  }
  decodeAudioData(_data: ArrayBuffer, ok: (b: Buffer) => void): Promise<Buffer> {
    const b = { duration: 0.001, getChannelData: () => new Float32Array(10) };
    ok(b);
    return Promise.resolve(b);
  }
  resume() { return Promise.resolve(); }
}

export type FakeFetch = ((url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>)
  & { calls: string[]; inits: Array<RequestInit | undefined> };

/** fetch over a map of url to JSON (manifests) or any truthy value (an mp3). Unknown urls answer 404. */
export function fakeFetch(files: Record<string, unknown>): FakeFetch {
  const calls: string[] = [];
  const inits: Array<RequestInit | undefined> = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push(url);
    inits.push(init);
    const hit = url in files;
    return { ok: hit, json: async () => (hit ? files[url] : null), arrayBuffer: async () => new ArrayBuffer(hit ? 8 : 0) };
  }) as FakeFetch;
  fn.calls = calls;
  fn.inits = inits;
  return fn;
}

export function installBrowserFakes(files: Record<string, unknown>): FakeFetch {
  const f = fakeFetch(files);
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', { addEventListener() {}, visibilityState: 'visible' });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('fetch', f);
  return f;
}
```

`G/tests/audio/emma-audio.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowserFakes } from './fake-web-audio.ts';
import type { EmmaAudioApi } from '../../src/audio/emma-audio.ts';

async function loadPlayer(files: Record<string, unknown>) {
  vi.resetModules();
  const fetch = installBrowserFakes(files);
  // @ts-ignore shared/audio.js is a classic script without types
  await import('../../../../shared/audio.js');
  return { A: (globalThis as unknown as { EmmaAudio: EmmaAudioApi }).EmmaAudio, fetch };
}

const clip = (file: string) => ({ hash: 'h', speaker: 'narrator', text: 't', file });

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('shared/audio.js packs', () => {
  const files = {
    'a/core/manifest.json': { clips: { 'g-hello': clip('g-hello.mp3') } },
    'a/names/manifest.json': { clips: { 'name-pip-x': clip('name-pip-x.mp3'), 'g-hello': clip('other.mp3') } },
    'a/core/g-hello.mp3': 1,
    'a/names/name-pip-x.mp3': 1,
  };

  it('finds a clip in the first pack that lists it', async () => {
    const { A, fetch } = await loadPlayer(files);
    A.init({ base: 'a/core/' });
    A.addPack('core', 'a/core/');
    A.addPack('names', 'a/names/');
    await A.say('g-hello');
    await A.say('name-pip-x');
    expect(fetch.calls).toContain('a/core/g-hello.mp3');
    expect(fetch.calls).toContain('a/names/name-pip-x.mp3');
    expect(fetch.calls).not.toContain('a/names/other.mp3');
    expect(A.missing).toEqual([]);
  });

  it('reports a missing id once, to missing and to onMissing', async () => {
    const { A } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    const seen: string[] = [];
    const off = A.onMissing((id) => seen.push(id));
    await A.say('word-nope');
    await A.say('word-nope');
    expect(seen).toEqual(['word-nope']);
    expect(A.missing).toEqual(['word-nope']);
    off();
    await A.say('word-other');
    expect(seen).toEqual(['word-nope']);
  });

  it('has() looks in every pack', async () => {
    const { A } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    A.addPack('names', 'a/names/');
    expect(await A.has('name-pip-x')).toBe(true);
    expect(await A.has('word-nope')).toBe(false);
  });

  it('forget() drops the decoded clip, so the next preload fetches it again', async () => {
    const { A, fetch } = await loadPlayer(files);
    A.addPack('core', 'a/core/');
    await A.preload(['g-hello']);
    await A.preload(['g-hello']);
    expect(fetch.calls.filter((u) => u === 'a/core/g-hello.mp3')).toHaveLength(1);
    A.forget(['g-hello']);
    await A.preload(['g-hello']);
    expect(fetch.calls.filter((u) => u === 'a/core/g-hello.mp3')).toHaveLength(2);
  });

  it('addPack with fresh asks the server to revalidate the manifest, and a second addPack replaces the pack', async () => {
    const { A, fetch } = await loadPlayer(files);
    const m = await A.addPack('names', 'a/names/', { fresh: true });
    expect(m?.clips['name-pip-x'].file).toBe('name-pip-x.mp3');
    expect(fetch.inits[fetch.calls.indexOf('a/names/manifest.json')]).toEqual({ cache: 'no-cache' });
    await A.addPack('names', 'a/names/', { fresh: true });
    expect(fetch.calls.filter((u) => u === 'a/names/manifest.json')).toHaveLength(2);
  });

  it('keeps the v2 behaviour without packs: one folder and its manifest', async () => {
    const { A, fetch } = await loadPlayer({
      'g/audio/manifest.json': { clips: { 'word-hat': clip('word-hat.mp3') } },
      'g/audio/word-hat.mp3': 1,
    });
    A.init({ base: 'g/audio/' });
    await A.say('word-hat');
    await A.say('word-cat');
    expect(fetch.calls).toContain('g/audio/word-hat.mp3');
    expect(fetch.calls).not.toContain('g/audio/word-cat.mp3');
    expect(A.missing).toEqual(['word-cat']);
  });
});
```

- [ ] **Step 3: Run them and see them fail**

Run from `games/moon-meadow-home`: `npx vitest run tests/audio/emma-audio.test.ts`
Expected: 5 failures with `A.addPack is not a function` (the v2 test passes).

- [ ] **Step 4: Add the packs to `shared/audio.js`**

1. After `var missing = [];` add:

```js
  var missingListeners = []; // onMissing() callbacks, called once per new missing id
  var packs = [];            // addPack(): [{name, base, manifest: Promise}], searched in order
  var clipUrls = {};         // id -> url it was loaded from, for forget()
```

2. Replace the body of `warnMissing` with:

```js
    console.warn('[audio] missing ' + id);
    if (missing.indexOf(id) >= 0) return;
    missing.push(id);
    missingListeners.slice().forEach(function (fn) {
      try { fn(id); } catch (e) { /* a listener error must not break playback */ }
    });
```

3. Replace `function loadClip(id) { ... }` with:

```js
  function fetchManifest(url, fresh) {
    return fetch(url, fresh ? { cache: 'no-cache' } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // With packs: the first pack whose manifest lists the id. Without packs: the v2 behaviour (one folder).
  function clipSource(id) {
    if (!packs.length) {
      return gameManifest().then(function (m) { return m && m.clips && !m.clips[id] ? null : clipUrl(id); });
    }
    var list = packs.slice();
    return Promise.all(list.map(function (p) { return p.manifest; })).then(function (ms) {
      for (var i = 0; i < list.length; i++) {
        var c = ms[i] && ms[i].clips && ms[i].clips[id];
        if (c) return list[i].base + (c.file || id + '.mp3');
      }
      return null;
    });
  }

  function loadClip(id) {
    return clipSource(id).then(function (url) {
      if (!url) return null;
      clipUrls[id] = url;
      return load(url);
    });
  }
```

4. In the public object, replace `has: function (id) { ... },` with:

```js
    has: function (id) {
      return clipSource(id).then(function (url) { return !!url; });
    },

    // Additions for v3 (Moon Meadow Home). v2 never calls them, so its behaviour is unchanged.
    addPack: function (name, base, o) {
      var entry = { name: name, base: base, manifest: fetchManifest(base + 'manifest.json', !!(o && o.fresh)) };
      for (var i = 0; i < packs.length; i++) {
        if (packs[i].name === name) { packs[i] = entry; return entry.manifest; }
      }
      packs.push(entry);
      return entry.manifest;
    },
    forget: function (ids) {
      (ids || []).forEach(function (id) {
        var url = clipUrls[id] || clipUrl(id);
        delete buffers[url];
        delete clipUrls[id];
      });
    },
    onMissing: function (fn) {
      missingListeners.push(fn);
      return function () { removeFrom(missingListeners, fn); };
    },
```

5. Add to the header comment: `EmmaAudio.addPack(name, base, {fresh}), EmmaAudio.forget(ids), EmmaAudio.onMissing(fn)   (v3 additions)`.

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run tests/audio/emma-audio.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Check v2 in the browser**

Serve the repo (`python3 -m http.server 8766 --bind 127.0.0.1` from the repo root, in the background) and, outside the sandbox:

```sh
playwright-cli -s=v2audio open http://127.0.0.1:8766/shared/test.html
playwright-cli -s=v2audio snapshot
playwright-cli -s=v2audio eval "() => window.EmmaAudio.missing"
playwright-cli -s=v2audio close
```

Expected: the page loads with no console error and `missing` lists only the test page's deliberate missing clip after its buttons are used.

- [ ] **Step 7: Document**

In `shared/README.md`, add to the "Additions beyond the shared contract" paragraph: "`addPack(name, base, {fresh})` (v3: several clip folders, each with its own `manifest.json`, searched in the order added; `fresh` revalidates the manifest), `forget(ids)` (drop decoded clips) and `onMissing(fn)` (called once per new missing id). Without `addPack` the player behaves as before." Add one row to the table: `| ../games/moon-meadow-home/public/audio/<pack>/ | v3 audio packs, made from content/lines and the content banks by tools/audio/build-lines.ts |`.

- [ ] **Step 8: Commit**

```sh
git add shared/audio.js shared/README.md games/moon-meadow-home/src/audio/emma-audio.ts games/moon-meadow-home/src/audio/clip-index.ts games/moon-meadow-home/tests/audio/fake-web-audio.ts games/moon-meadow-home/tests/audio/emma-audio.test.ts
git commit -m "Let the shared audio player read clips from several packs"
```

**Acceptance:** 6 tests pass, v2 test page unchanged.

### Task A4: Clip ids and number words

**Files:**
- Create: `G/src/audio/ids.ts`, `G/tools/audio/number-words.ts`, `G/tests/audio/ids.test.ts`

**Interfaces:**
- Produces: `slug`, `wordId`, `phraseId`, `nameId`, `numId`, `bondId`, `parcelId`, `ordId`, `isDynamic`, `DYNAMIC_PREFIXES`, types `NameMark`, `NumKind`, `WordId`, `PhraseId`, `NameClipId`, `NumId`, `OrdId`, `DynamicId`; `numberWord(n)`, `ordinalWord(n)`, `capitalise(s)`.

- [ ] **Step 1: Write the failing test**

`G/tests/audio/ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bondId, isDynamic, nameId, numId, ordId, parcelId, phraseId, slug, wordId } from '../../src/audio/ids.ts';
import { capitalise, numberWord, ordinalWord } from '../../tools/audio/number-words.ts';

describe('number words', () => {
  it('says numbers the British way', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(13)).toBe('thirteen');
    expect(numberWord(40)).toBe('forty');
    expect(numberWord(41)).toBe('forty-one');
    expect(numberWord(100)).toBe('one hundred');
    expect(numberWord(105)).toBe('one hundred and five');
    expect(numberWord(150)).toBe('one hundred and fifty');
  });
  it('refuses numbers it cannot say', () => {
    expect(() => numberWord(-1)).toThrow(RangeError);
    expect(() => numberWord(1000)).toThrow(RangeError);
    expect(() => numberWord(2.5)).toThrow(RangeError);
  });
  it('has ordinals to twenty', () => {
    expect(ordinalWord(2)).toBe('second');
    expect(ordinalWord(12)).toBe('twelfth');
    expect(ordinalWord(20)).toBe('twentieth');
    expect(() => ordinalWord(21)).toThrow(RangeError);
  });
  it('capitalises', () => {
    expect(capitalise('forty-one')).toBe('Forty-one');
  });
});

describe('clip ids', () => {
  it('slugs any text', () => {
    expect(slug('Zoë')).toBe('zoe');
    expect(slug('Mary-Kate')).toBe('mary-kate');
    expect(slug("Let's go!")).toBe('lets-go');
    expect(slug('post box')).toBe('post-box');
  });
  it('builds word, phrase and name ids', () => {
    expect(wordId('hats')).toBe('word-hats');
    expect(wordId('post box')).toBe('word-post-box');
    expect(phraseId('Can we have a swing?')).toBe('phrase-can-we-have-a-swing-q');
    expect(phraseId('We love the pond!')).toBe('phrase-we-love-the-pond-x');
    expect(phraseId('a tiny pink bow')).toBe('phrase-a-tiny-pink-bow');
    expect(phraseId('Can we have a swing.')).toBe('phrase-can-we-have-a-swing');
    expect(nameId('Lily', '!')).toBe('name-lily-x');
    expect(nameId('Lily', '?')).toBe('name-lily-q');
  });
  it('builds number ids', () => {
    expect(numId('n', 7)).toBe('num-7');
    expect(numId('movein', 19)).toBe('num-movein-19');
    expect(numId('door-bed', 12)).toBe('num-door-bed-12');
    expect(bondId(7, 3)).toBe('num-bond-7-3');
    expect(parcelId(7, 'brushes')).toBe('num-parcel-7-brushes');
    expect(ordId(2)).toBe('ord-2');
  });
  it('knows which ids are dynamic', () => {
    for (const id of ['word-hat', 'phrase-a-hat', 'name-pip-x', 'num-7', 'ord-2']) expect(isDynamic(id)).toBe(true);
    for (const id of ['g-egg', 'fb-hot', 'lumi-hello', 'foal-yay', 'h-count']) expect(isDynamic(id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/ids.test.ts`
Expected: `Failed to load url ../../src/audio/ids.ts`.

- [ ] **Step 3: Implement**

`G/src/audio/ids.ts`:

```ts
export type NameMark = '!' | '?';
export type NumKind = 'n' | 'movein' | 'visit' | 'door-bed' | 'herd' | 'sky' | 'over' | 'cold' | 'warm' | 'nest'
  | 'up' | 'more' | 'count' | 'tap-door' | 'need' | 'sash-has';
export type WordId = `word-${string}`;
export type PhraseId = `phrase-${string}`;
export type NameClipId = `name-${string}`;
export type NumId = `num-${string}`;
export type OrdId = `ord-${number}`;
export type DynamicId = WordId | PhraseId | NameClipId | NumId | OrdId;

export const DYNAMIC_PREFIXES = ['word-', 'phrase-', 'name-', 'num-', 'ord-'] as const;

/** Lowercase kebab-case from any text: "Zoë" -> "zoe", "post box" -> "post-box", "Can I?" -> "can-i". */
export function slug(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function wordId(word: string): WordId {
  return `word-${slug(word)}`;
}

/** The end mark is part of the id, because "Can we have a swing?" and "Can we have a swing." are two clips. */
export function phraseId(text: string): PhraseId {
  const t = text.trim();
  const mark = t.endsWith('?') ? '-q' : t.endsWith('!') ? '-x' : '';
  return `phrase-${slug(t)}${mark}`;
}

export function nameId(name: string, mark: NameMark): NameClipId {
  return `name-${slug(name)}-${mark === '!' ? 'x' : 'q'}`;
}

export function numId(kind: NumKind, n: number): NumId {
  return kind === 'n' ? `num-${n}` : `num-${kind}-${n}`;
}

export function bondId(a: number, b: number): NumId {
  return `num-bond-${a}-${b}`;
}

export function parcelId(n: number, plural: string): NumId {
  return `num-parcel-${n}-${slug(plural)}`;
}

export function ordId(n: number): OrdId {
  return `ord-${n}`;
}

export function isDynamic(id: string): boolean {
  return DYNAMIC_PREFIXES.some((p) => id.startsWith(p));
}
```

`G/tools/audio/number-words.ts`:

```ts
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth',
  'nineteenth', 'twentieth'];

/** British English number words for 0 to 999: 41 is "forty-one", 105 is "one hundred and five". */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError(`numberWord: ${n} is outside 0 to 999`);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 === 0 ? '' : '-' + ONES[n % 10]);
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest === 0 ? '' : ' and ' + numberWord(rest)}`;
}

/** Ordinal words 1 to 20: 2 is "second". */
export function ordinalWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new RangeError(`ordinalWord: ${n} is outside 1 to 20`);
  return ORDINALS[n];
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/audio/ids.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```sh
git add games/moon-meadow-home/src/audio/ids.ts games/moon-meadow-home/tools/audio/number-words.ts games/moon-meadow-home/tests/audio/ids.test.ts
git commit -m "Add audio clip ids and British number words"
```

### Task A5: Number lines and the Wave A line catalogue

**Files:**
- Create: `G/tools/audio/number-lines.ts`, `G/tests/audio/number-lines.test.ts`, and the scene files `G/content/lines/common.json`, `start.json`, `moving-day.json`, `meadow.json`, `nest.json`, `hatch.json`, `naming.json`, `wish.json`, `stalls.json`, `goodnight.json`, `building-day.json`

**Interfaces:**
- Consumes: `numberWord`, `ordinalWord`, `capitalise`, `numId`, `bondId`, `ordId` (Task A4).
- Produces: `numberLines(): PackLine[]` and `type PackLine = { id: string; speaker: 'narrator' | 'queen' | 'foal'; text: string; note?: string; seed?: number; expect?: string[] }` (re-exported by `lines-lib.ts` in Task A6). Scene file format `{ "scene": SceneId, "pack"?: PackName, "lines": [{ "id", "speaker", "text", "also"?: SceneId[], "note"?, "seed"?, "expect"? }] }`.

- [ ] **Step 1: Write the failing test**

`G/tests/audio/number-lines.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { numberLines } from '../../tools/audio/number-lines.ts';

const lines = numberLines();
const text = (id: string) => lines.find((l) => l.id === id)?.text;

describe('number lines', () => {
  it('has unique ids, narrator only, and no digits in the text', () => {
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    expect(lines.every((l) => l.speaker === 'narrator')).toBe(true);
    expect(lines.filter((l) => /\d/.test(l.text))).toEqual([]);
  });
  it('says the heartbeat numbers as full sentences', () => {
    expect(text('num-movein-41')).toBe('Baby number forty-one.');
    expect(text('num-visit-14')).toBe('Off to door fourteen!');
    expect(text('num-door-bed-12')).toBe('Door twelve, bedtime!');
    expect(text('num-herd-1')).toBe('One unicorn!');
    expect(text('num-herd-41')).toBe('Forty-one unicorns!');
    expect(text('num-sky-5')).toBe('Five sky unicorns!');
    expect(text('num-42')).toBe('Forty-two.');
    expect(text('num-count-3')).toBe('One, two, three.');
    expect(text('num-bond-4-2')).toBe('Four and two make six!');
    expect(text('num-tap-door-4')).toBe('Tap door four.');
    expect(text('ord-2')).toBe('The Second!');
  });
  it('covers the Wave A ranges', () => {
    expect(text('num-0')).toBeDefined();
    expect(text('num-60')).toBeDefined();
    expect(text('num-movein-60')).toBeDefined();
    expect(text('num-herd-60')).toBeDefined();
    expect(text('num-visit-20')).toBeDefined();
    expect(text('num-door-bed-20')).toBeDefined();
    expect(text('ord-20')).toBeDefined();
    expect(lines.filter((l) => l.id.startsWith('num-bond-'))).toHaveLength(39);
  });
  it('copies the v2 texts exactly, so those clips come from the raw cache', () => {
    const v2 = JSON.parse(readFileSync(new URL('../../../../ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json', import.meta.url), 'utf8')).lines as Array<{ id: string; text: string }>;
    for (const id of ['num-1', 'num-10', 'num-bond-7-3', 'num-over-2', 'num-cold-3', 'num-warm-7']) {
      expect(text(id)).toBe(v2.find((l) => l.id === id)?.text);
    }
  });
});

```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/number-lines.test.ts`
Expected: `Failed to load url ../../tools/audio/number-lines.ts`.

- [ ] **Step 3: Implement**

`G/tools/audio/number-lines.ts`:

```ts
import { capitalise, numberWord, ordinalWord } from './number-words.ts';
import { bondId, numId, ordId, parcelId } from '../../src/audio/ids.ts';

export type PackLine = { id: string; speaker: 'narrator' | 'queen' | 'foal'; text: string; note?: string; seed?: number; expect?: string[] };

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const N = (id: string, text: string): PackLine => ({ id, speaker: 'narrator', text });
const W = (n: number): string => numberWord(n);
const C = (n: number): string => capitalise(numberWord(n));

/** Every number line of the build, in budget order (most used first). */
export function numberLines(): PackLine[] {
  const out: PackLine[] = [];
  // Wave A
  for (const n of range(0, 60)) out.push(N(numId('n', n), `${C(n)}.`));
  for (const n of range(1, 60)) out.push(N(numId('movein', n), `Baby number ${W(n)}.`));
  for (const n of range(1, 60)) out.push(N(numId('herd', n), n === 1 ? 'One unicorn!' : `${C(n)} unicorns!`));
  for (const n of range(1, 20)) out.push(N(numId('visit', n), `Off to door ${W(n)}!`));
  for (const n of range(1, 20)) out.push(N(numId('door-bed', n), `Door ${W(n)}, bedtime!`));
  for (const n of range(1, 9)) out.push(N(numId('over', n), `${C(n)} too many.`));
  for (const n of range(1, 9)) out.push(N(numId('cold', n), n === 1 ? 'One cup is still cold.' : `${C(n)} cups are still cold.`));
  for (const n of range(1, 9)) out.push(N(numId('warm', n), n === 1 ? 'One cup is warm already.' : `${C(n)} cups are warm already.`));
  for (const n of range(5, 9)) out.push(N(numId('nest', n), `This nest has ${W(n)} cups.`));
  for (const s of range(5, 10)) for (const a of range(1, s - 1)) out.push(N(bondId(a, s - a), `${C(a)} and ${W(s - a)} make ${W(s)}!`));
  for (const n of range(1, 9)) out.push(N(numId('up', n), n === 1 ? 'One is up.' : `${C(n)} are up.`));
  for (const n of range(1, 9)) out.push(N(numId('more', n), `${C(n)} more, please!`));
  for (const n of range(1, 5)) out.push(N(numId('count', n), range(1, n).map((k) => (k === 1 ? 'One' : W(k))).join(', ') + '.'));
  out.push(N(numId('tap-door', 4), 'Tap door four.'));
  for (const n of range(1, 10)) out.push(N(numId('sky', n), n === 1 ? 'One sky unicorn!' : `${C(n)} sky unicorns!`));
  for (const n of range(2, 20)) out.push(N(ordId(n), `The ${capitalise(ordinalWord(n))}!`));
  return out;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/audio/number-lines.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Write the Wave A scene files**

One file per block, exactly as below. Lines whose text equals a v2 line (for example `g-egg`, `fb-hot`, `lumi-crown`, `foal-yay`) are deliberate: their clips come from the raw cache for free. Every goal is an act, never a question. No line says a name or a number inside a sentence.

`G/content/lines/common.json`:

```json
{"scene": "common", "lines": [
  {"id": "g-meadow-way", "speaker": "narrator", "text": "The meadow is this way."},
  {"id": "g-look", "speaker": "narrator", "text": "Look, like this."},
  {"id": "g-listen", "speaker": "narrator", "text": "Listen."},
  {"id": "g-now-listen", "speaker": "narrator", "text": "Now listen."},
  {"id": "fb-says", "speaker": "narrator", "text": "This is what it says."},
  {"id": "fb-lovely", "speaker": "narrator", "text": "Lovely!"},
  {"id": "fb-well-done", "speaker": "narrator", "text": "Well done!"},
  {"id": "fb-yes", "speaker": "narrator", "text": "Yes!"},
  {"id": "fb-letters", "speaker": "narrator", "text": "Look at the letters again."},
  {"id": "fb-listen", "speaker": "narrator", "text": "Hmm. Listen again."},
  {"id": "h-sounds", "speaker": "narrator", "text": "Listen to the sounds."},
  {"id": "foal-hello", "speaker": "foal", "text": "[giggles] Hello!"},
  {"id": "foal-yay", "speaker": "foal", "text": "[excited] Yay! Thank you!"},
  {"id": "foal-silly", "speaker": "foal", "text": "[giggles] Silly!"},
  {"id": "foal-notme", "speaker": "foal", "text": "[giggles] Not me!"},
  {"id": "foal-wee", "speaker": "foal", "text": "Wheee!"},
  {"id": "foal-yum", "speaker": "foal", "text": "Mmm! Yummy!"},
  {"id": "foal-cuddle", "speaker": "foal", "text": "[happy sigh] Aww."},
  {"id": "foal-yawn", "speaker": "foal", "text": "[yawns] Sleepy."},
  {"id": "foal-giggle", "speaker": "foal", "text": "[giggles] Hee hee!"},
  {"id": "foal-look", "speaker": "foal", "text": "[giggles] Look!"}
]}
```

`G/content/lines/start.json`:

```json
{"scene": "start", "lines": [
  {"id": "lumi-hello", "speaker": "queen", "text": "Hello, Emma! I'm Queen Lumi."},
  {"id": "lumi-hello-back", "speaker": "queen", "text": "Hello, Emma!"},
  {"id": "lumi-meadow-yours", "speaker": "queen", "text": "This meadow is yours. Will you make it a home for my unicorns?"},
  {"id": "lumi-crown", "speaker": "queen", "text": "Here is your crown. You are my Nest Keeper now!"},
  {"id": "g-egg-waiting", "speaker": "narrator", "text": "An egg is waiting."}
]}
```

`G/content/lines/moving-day.json`:

```json
{"scene": "moving-day", "lines": [
  {"id": "lumi-moving", "speaker": "queen", "text": "Emma! Your unicorns are moving to a bigger home."},
  {"id": "g-here-they-come", "speaker": "narrator", "text": "Here they come!"},
  {"id": "g-pins-came", "speaker": "narrator", "text": "All your pins came too!"}
]}
```

`G/content/lines/meadow.json`:

```json
{"scene": "meadow", "lines": [
  {"id": "g-bubbles", "speaker": "narrator", "text": "When you see a bubble, someone is waiting for you."},
  {"id": "g-moon", "speaker": "narrator", "text": "Tap the moon when it's bedtime."},
  {"id": "g-pond-ready", "speaker": "narrator", "text": "The pond is ready to build!"},
  {"id": "g-new-egg", "speaker": "narrator", "text": "A new egg is here!"},
  {"id": "g-write-label", "speaker": "narrator", "text": "Let's write a label. Listen."},
  {"id": "g-look-jar", "speaker": "narrator", "text": "Look in the jar!"},
  {"id": "fb-more-than-one", "speaker": "narrator", "text": "More than one."},
  {"id": "fb-just-one", "speaker": "narrator", "text": "Just one."},
  {"id": "g-camp", "speaker": "narrator", "text": "No door yet. The tent is cosy too!"},
  {"id": "phrase-one-mouse-lots-of-mice", "speaker": "narrator", "text": "One mouse, lots of mice."}
]}
```

`G/content/lines/nest.json`:

```json
{"scene": "nest", "lines": [
  {"id": "g-egg", "speaker": "narrator", "text": "Make every cup warm, and the egg will hatch."},
  {"id": "g-stone", "speaker": "narrator", "text": "Drag one stone to the nest."},
  {"id": "g-two-stones", "speaker": "narrator", "text": "This egg needs two stones. Together they make every cup warm."},
  {"id": "g-one-more", "speaker": "narrator", "text": "Now one more stone."},
  {"id": "g-blanket", "speaker": "narrator", "text": "The blanket hides the cups."},
  {"id": "g-moon-stars", "speaker": "narrator", "text": "Look at the stars. Find the stone with that many dots."},
  {"id": "g-moon-count", "speaker": "narrator", "text": "Count the stars. Find the stone with that number."},
  {"id": "g-moon-cups", "speaker": "narrator", "text": "Some moon cups are warm. Find the stone that makes ten."},
  {"id": "g-small-nest", "speaker": "narrator", "text": "Fill the little nest."},
  {"id": "fb-warm", "speaker": "narrator", "text": "Every cup is warm!"},
  {"id": "fb-hot", "speaker": "narrator", "text": "Too hot!"},
  {"id": "fb-brr", "speaker": "narrator", "text": "Brr!"},
  {"id": "h-count", "speaker": "narrator", "text": "Let's count the cold cups."},
  {"id": "h-peek", "speaker": "narrator", "text": "Let's peek under the blanket."},
  {"id": "h-stars", "speaker": "narrator", "text": "Let's count the stars."}
]}
```

`G/content/lines/hatch.json`:

```json
{"scene": "hatch", "lines": [
  {"id": "lumi-hatching", "speaker": "queen", "text": "It's hatching!"},
  {"id": "lumi-baby", "speaker": "queen", "text": "A baby unicorn! Hello, little one."},
  {"id": "lumi-sparkly", "speaker": "queen", "text": "Ooh, a sparkly one!"}
]}
```

`G/content/lines/naming.json`:

```json
{"scene": "naming", "lines": [
  {"id": "g-bells", "speaker": "narrator", "text": "Your baby needs a name! Tap a bell to hear a name."},
  {"id": "g-bell-drag", "speaker": "narrator", "text": "Drag the name you like to your baby."},
  {"id": "g-tree", "speaker": "narrator", "text": "Shake the tree for new names."},
  {"id": "g-garden", "speaker": "narrator", "text": "Tap a picture to hear names."},
  {"id": "g-garden-sound", "speaker": "narrator", "text": "Tap a gem to hear names with that sound."},
  {"id": "g-spell", "speaker": "narrator", "text": "Let's write the name on the tag. Listen."},
  {"id": "g-gems", "speaker": "narrator", "text": "Put the gems in the slots."},
  {"id": "g-slide", "speaker": "narrator", "text": "Now slide the star, and listen."},
  {"id": "g-gold", "speaker": "narrator", "text": "Make any name you like!"},
  {"id": "g-plus-slot", "speaker": "narrator", "text": "Tap the plus for one more gem."},
  {"id": "g-gift-gem", "speaker": "narrator", "text": "Listen to this gem."},
  {"id": "fb-spelled", "speaker": "narrator", "text": "You wrote your baby's name!"},
  {"id": "fb-no-vowel", "speaker": "narrator", "text": "Every name needs a pink gem!"},
  {"id": "fb-silly-name", "speaker": "narrator", "text": "That's a silly name! Try other gems."},
  {"id": "fb-gold-yes", "speaker": "narrator", "text": "What a lovely name!"},
  {"id": "fb-tricky", "speaker": "narrator", "text": "What a great name! It's a tricky one for me to say."},
  {"id": "lumi-moon-name", "speaker": "queen", "text": "The moon told me a new name!"}
]}
```

`G/content/lines/wish.json`:

```json
{"scene": "wish", "lines": [
  {"id": "g-wish", "speaker": "narrator", "text": "Look at the letters. Give the baby what it wants.", "also": ["bath-pond"]},
  {"id": "g-give", "speaker": "narrator", "text": "Drag it to the baby.", "also": ["bath-pond"]},
  {"id": "g-station", "speaker": "narrator", "text": "Look at the letters. Take the baby to the right place.", "also": ["bath-pond"]},
  {"id": "g-twin", "speaker": "narrator", "text": "Now it's this baby's turn.", "also": ["bath-pond"]}
]}
```

`G/content/lines/stalls.json`:

```json
{"scene": "stalls", "lines": [
  {"id": "g-roll-call", "speaker": "narrator", "text": "Read the lantern. Tap that baby's door.", "also": ["goodnight"]}
]}
```

`G/content/lines/goodnight.json`:

```json
{"scene": "goodnight", "lines": [
  {"id": "lumi-bedtime", "speaker": "queen", "text": "The moon is high. Bedtime, babies!"},
  {"id": "g-sky-name", "speaker": "narrator", "text": "Ten stars make a sky unicorn. Give it a name!"},
  {"id": "lumi-goodnight", "speaker": "queen", "text": "Goodnight, Emma."}
]}
```

`G/content/lines/building-day.json`:

```json
{"scene": "building-day", "lines": [
  {"id": "lumi-builders", "speaker": "queen", "text": "The builders are here!"},
  {"id": "g-wall-planks", "speaker": "narrator", "text": "The wall needs ten planks."},
  {"id": "g-wall-bricks", "speaker": "narrator", "text": "The wall needs ten bricks."},
  {"id": "fb-too-tall", "speaker": "narrator", "text": "Too tall!"},
  {"id": "g-trim", "speaker": "narrator", "text": "Finish the pattern."},
  {"id": "g-trim-free", "speaker": "narrator", "text": "Pick your colours!"},
  {"id": "g-sign", "speaker": "narrator", "text": "Let's write the sign. Listen."},
  {"id": "g-ribbon", "speaker": "narrator", "text": "Cut the ribbon!"},
  {"id": "g-circle", "speaker": "narrator", "text": "Everyone is here. Watch the egg!"},
  {"id": "g-row-name", "speaker": "narrator", "text": "Give this row a name!"},
  {"id": "lumi-built", "speaker": "queen", "text": "Hooray! Thank you, Emma!"}
]}
```

- [ ] **Step 6: Commit**

```sh
git add games/moon-meadow-home/tools/audio/number-lines.ts games/moon-meadow-home/tests/audio/number-lines.test.ts games/moon-meadow-home/content/lines
git commit -m "Add the number lines and the Wave A spoken lines"
```

**Acceptance:** 4 tests pass. The catalogue is validated in Task A6.

### Task A6: Build the audio packs

**Files:**
- Create: `G/tools/audio/lines-lib.ts`, `G/tools/audio/build-lines.ts`, `G/tests/audio/lines-lib.test.ts`
- Modify: `G/package.json` (scripts only, if the skeleton has not added them)
- Generated: `G/public/audio/<pack>/lines.json`, empty `G/public/audio/<pack>/manifest.json`

**Interfaces:**
- Consumes: `numberLines` (Task A5), the id builders (Task A4), content files per "Contracts I need" item 2, `ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json`.
- Produces: `PACKS_BUILT`, `BASE_SCENES`, `NARRATOR_ONLY`, types `Speaker`, `PackLine`, `PackName`, `CatalogueLine`, `SceneFile`, `WordEntry`, `PhraseEntry`, `NameEntry`, `NewName`, `V2Line`; functions `packForScene(scene): PackName`, `catalogueLines(files): Map<PackName, PackLine[]>`, `wordPack(step): PackName`, `wordLines(words): Map<PackName, PackLine[]>`, `phraseLines(phrases): PackLine[]`, `nameLines(bank, v2): PackLine[]`, `newNameLines(names): PackLine[]`, `validatePack(lines): string[]`, `crossPackDuplicates(packs): string[]`. CLI `npm run audio:lines`.

- [ ] **Step 1: Write the failing test**

`G/tests/audio/lines-lib.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  catalogueLines, crossPackDuplicates, nameLines, newNameLines, packForScene, phraseLines, validatePack, wordLines, wordPack,
  type NameEntry, type PackLine, type SceneFile, type V2Line,
} from '../../tools/audio/lines-lib.ts';

const dir = new URL('../../content/lines/', import.meta.url);
const sceneFiles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as SceneFile);
const v2 = JSON.parse(readFileSync(new URL('../../../../ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json', import.meta.url), 'utf8')).lines as V2Line[];

describe('the line catalogue in content/lines', () => {
  it('is valid in every pack, with no id in two packs', () => {
    const packs = catalogueLines(sceneFiles);
    for (const [pack, lines] of packs) expect(validatePack(lines), pack).toEqual([]);
    expect(crossPackDuplicates(packs)).toEqual([]);
  });
  it('gives Lumi story lines only and the foals tiny words', () => {
    const all = sceneFiles.flatMap((f) => f.lines);
    for (const l of all) {
      if (l.id.startsWith('lumi-')) expect(l.speaker, l.id).toBe('queen');
      if (l.id.startsWith('foal-')) expect(l.speaker, l.id).toBe('foal');
      if (/^(g|h|fb)-/.test(l.id)) expect(l.speaker, l.id).toBe('narrator');
      expect(/\bDutch\b/i.test(l.text), l.id).toBe(false);
    }
  });
});

describe('pack mapping', () => {
  it('puts area scenes in their area pack', () => {
    expect(packForScene('nest')).toBe('core');
    expect(packForScene('post-box')).toBe('area-stable-yard');
    expect(packForScene('salon')).toBe('area-village-lane');
    const packs = catalogueLines([{ scene: 'toy-shelf', pack: 'places', lines: [{ id: 'pl-x', speaker: 'narrator', text: 'X.' }] }]);
    expect([...packs.keys()]).toEqual(['places']);
  });
  it('maps steps to word packs', () => {
    expect(wordPack('R05')).toBe('words-phase2');
    expect(wordPack('R04D')).toBe('words-phase2');
    expect(wordPack('R19')).toBe('words-phase3-4');
    expect(wordPack('R30')).toBe('words-year1');
    expect(wordPack('S10')).toBe('words-phase3-4');
    expect(wordPack('S20')).toBe('words-year1');
    expect(() => wordPack('X1')).toThrow();
  });
});

describe('word lines', () => {
  it('makes one bare clip per word and both forms of a plural in words-phase3-4', () => {
    const packs = wordLines([
      { word: 'cat', step: 'R03', graphemes: ['c', 'a', 't'], picture: 'cat' },
      { word: 'hat', step: 'R05', graphemes: ['h', 'a', 't'], picture: 'hat', plural: { word: 'hats', ending: 's' } },
      { word: 'cake', step: 'R30', graphemes: ['c', 'a-e', 'k'], picture: 'cake' },
    ]);
    expect(packs.get('words-phase2')).toEqual([{ id: 'word-cat', speaker: 'narrator', text: 'Cat.' }]);
    expect(packs.get('words-phase3-4')).toEqual([
      { id: 'word-hat', speaker: 'narrator', text: 'Hat.' },
      { id: 'word-hats', speaker: 'narrator', text: 'Hats.' },
    ]);
    expect(packs.get('words-year1')?.[0].text).toBe('Cake.');
  });
  it('refuses one id with two texts', () => {
    expect(() => wordLines([
      { word: 'bow', step: 'R16', graphemes: ['b', 'ow'], picture: 'bow' },
      { word: 'bow', step: 'R39', graphemes: ['b', 'ow'], picture: 'bow', say: 'Bow, for hair.' },
    ])).toThrow(/two texts/);
  });
});

describe('phrase lines', () => {
  it('capitalises, adds a full stop, and makes one clip per mark when asked', () => {
    const lines = phraseLines([
      { text: 'Can we have a swing?', step: 'S23', place: 'post-box', marks: ['.', '?', '!'] },
      { text: 'a tiny pink bow', step: 'R27', place: 'salon' },
    ]);
    expect(lines).toEqual([
      { id: 'phrase-a-tiny-pink-bow', speaker: 'narrator', text: 'A tiny pink bow.' },
      { id: 'phrase-can-we-have-a-swing', speaker: 'narrator', text: 'Can we have a swing.' },
      { id: 'phrase-can-we-have-a-swing-q', speaker: 'narrator', text: 'Can we have a swing?' },
      { id: 'phrase-can-we-have-a-swing-x', speaker: 'narrator', text: 'Can we have a swing!' },
    ]);
  });
});

describe('name lines', () => {
  const bank: NameEntry[] = [
    { name: 'Lily', graphemes: ['L', 'i', 'l', 'y'], phonemes: ['l', 'i', 'l', 'ee'], group: 'l', tier: 1, rank: 2 },
    { name: 'Sam', graphemes: ['S', 'a', 'm'], phonemes: ['s', 'a', 'm'], group: 's', tier: 1, rank: 1 },
    { name: 'Tamo', graphemes: ['T', 'a', 'm', 'o'], phonemes: ['t', 'a', 'm', 'o'], group: 't', tier: 1, ipa: 'tæmɒ' },
  ];
  const lines = nameLines(bank, v2);
  it('puts every v2 name first, with its v2 text and seed for the "!" clip', () => {
    const v2Names = v2.filter((l) => l.id.startsWith('name-'));
    expect(lines.slice(0, v2Names.length * 2).every((l) => l.note === 'v2 name')).toBe(true);
    const nop = v2.find((l) => l.id === 'name-nop')!;
    expect(lines.find((l) => l.id === 'name-nop-x')).toMatchObject({ text: nop.text, seed: nop.seed });
    expect(lines.find((l) => l.id === 'name-nop-q')?.text).toBe('Nopp?');
  });
  it('then the bank by rank, two clips per name, a v2 name only once', () => {
    const rest = lines.filter((l) => l.note !== 'v2 name');
    expect(rest.map((l) => l.id)).toEqual(['name-lily-x', 'name-lily-q', 'name-tamo-x', 'name-tamo-q']);
    expect(rest[2].text).toBe('/tæmɒ/!');
    expect(rest[0].expect).toEqual(['Lily']);
    expect(lines.filter((l) => l.id === 'name-sam-x')).toHaveLength(1);
  });
  it('makes clips for invented names from their pronunciation', () => {
    expect(newNameLines([{ name: 'Zibbo', graphemes: [], phonemes: [], firstSeen: '', count: 1, nearest: 'Zoe', distance: 3, mode: 'respell', text: 'Zibbo' }]))
      .toEqual([
        { id: 'name-zibbo-x', speaker: 'narrator', text: 'Zibbo!', expect: ['Zibbo'], note: 'invented, nearest Zoe' },
        { id: 'name-zibbo-q', speaker: 'narrator', text: 'Zibbo?', expect: ['Zibbo'], note: 'invented, nearest Zoe' },
      ]);
  });
});

describe('validatePack', () => {
  it('finds every rule break', () => {
    const bad: PackLine[] = [
      { id: 'word-hat', speaker: 'queen', text: 'Hat.' },
      { id: 'g-two', speaker: 'narrator', text: 'Tap 2 eggs.' },
      { id: 'g-two', speaker: 'narrator', text: 'Again.' },
      { id: 'g-tag', speaker: 'narrator', text: '[giggles] Hi.' },
      { id: 'G_bad', speaker: 'narrator', text: 'Bad id.' },
      { id: 'g-dash', speaker: 'narrator', text: 'A \u2014 B.' },
    ];
    expect(validatePack(bad)).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/lines-lib.test.ts`
Expected: `Failed to load url ../../tools/audio/lines-lib.ts`.

- [ ] **Step 3: Implement the library**

`G/tools/audio/lines-lib.ts`:

```ts
import { capitalise } from './number-words.ts';
import { nameId, phraseId, slug, wordId } from '../../src/audio/ids.ts';

export type Speaker = 'narrator' | 'queen' | 'foal';
export type PackLine = { id: string; speaker: Speaker; text: string; note?: string; seed?: number; expect?: string[] };
export type PackName = 'core' | 'numbers' | 'words-phase2' | 'words-phase3-4' | 'words-year1' | 'phrases'
  | 'names-t1' | 'names-new' | 'area-stable-yard' | 'area-village-lane' | 'places';
export const PACKS_BUILT: readonly PackName[] = ['core', 'numbers', 'words-phase2', 'words-phase3-4', 'words-year1',
  'phrases', 'names-t1', 'names-new', 'area-stable-yard', 'area-village-lane', 'places'];
/** Scenes known before any line exists. Scene files may add more. */
export const BASE_SCENES = ['common', 'start', 'moving-day', 'meadow', 'nest', 'hatch', 'naming', 'wish', 'bath-pond',
  'stalls', 'goodnight', 'building-day', 'dressing-corner', 'post-box', 'home-book', 'salon', 'valley', 'letter-lane',
  'meadow-slate'] as const;
export const NARRATOR_ONLY = ['word-', 'name-', 'num-', 'sound-', 'phrase-', 'ord-'];

export type CatalogueLine = { id: string; speaker: Speaker; text: string; also?: string[]; note?: string; seed?: number; expect?: string[] };
export type SceneFile = { scene: string; pack?: PackName; lines: CatalogueLine[] };
export type WordEntry = { word: string; step: string; graphemes: string[]; picture: string; plural?: { word: string; ending: 's' | 'es' | 'irregular' }; say?: string };
export type PhraseEntry = { text: string; step: string; place: string; marks?: Array<'.' | '?' | '!'> };
export type NameEntry = { name: string; graphemes: string[]; phonemes: string[]; group: string; tier: 1 | 2; rank?: number; picture?: string; say?: string; ipa?: string; seed?: number };
export type NewName = { name: string; graphemes: string[]; phonemes: string[]; firstSeen: string; count: number; nearest: string | null; distance: number | null; mode: 'ipa' | 'respell'; text: string };
export type V2Line = { id: string; speaker: string; text: string; seed?: number; note?: string };

const AREA: Readonly<Record<string, PackName>> = {
  'post-box': 'area-stable-yard', 'letter-lane': 'area-stable-yard', salon: 'area-village-lane', valley: 'area-village-lane',
};

export function packForScene(scene: string): PackName {
  return AREA[scene] ?? 'core';
}

export function catalogueLines(files: readonly SceneFile[]): Map<PackName, PackLine[]> {
  const out = new Map<PackName, PackLine[]>();
  for (const f of files) {
    const pack = f.pack ?? packForScene(f.scene);
    const list = out.get(pack) ?? [];
    for (const l of f.lines) {
      const p: PackLine = { id: l.id, speaker: l.speaker, text: l.text };
      if (l.note) p.note = l.note;
      if (l.seed !== undefined) p.seed = l.seed;
      if (l.expect) p.expect = l.expect;
      list.push(p);
    }
    out.set(pack, list);
  }
  return out;
}

const STEP = /^([RS])(\d+)(D?)$/;

/** R01 to R12 and S01 to S08 are Phase 2, R13 to R29 and S09 to S18 Phase 3 and 4, the rest Year 1. */
export function wordPack(step: string): PackName {
  const m = STEP.exec(step);
  if (!m) throw new Error(`wordPack: bad step ${step}`);
  const n = Number(m[2]);
  const [p2, p4] = m[1] === 'R' ? [12, 29] : [8, 18];
  return n <= p2 ? 'words-phase2' : n <= p4 ? 'words-phase3-4' : 'words-year1';
}

function stepOrder(step: string): number {
  const m = STEP.exec(step);
  if (!m) throw new Error(`stepOrder: bad step ${step}`);
  return (m[1] === 'R' ? 0 : 1000) + Number(m[2]) * 2 + (m[3] ? 1 : 0);
}

/** One neutral clip per word ("Hat."). A word with a plural puts both forms in words-phase3-4 (R19 is open now). */
export function wordLines(words: readonly WordEntry[]): Map<PackName, PackLine[]> {
  const out = new Map<PackName, PackLine[]>();
  const seen = new Map<string, string>();
  for (const w of [...words].sort((a, b) => stepOrder(a.step) - stepOrder(b.step))) {
    const pack = w.plural ? 'words-phase3-4' : wordPack(w.step);
    const list = out.get(pack) ?? [];
    const forms: Array<[string, string]> = [[w.word, w.say ?? `${capitalise(w.word)}.`]];
    if (w.plural) forms.push([w.plural.word, `${capitalise(w.plural.word)}.`]);
    for (const [word, text] of forms) {
      const id = wordId(word);
      const prev = seen.get(id);
      if (prev !== undefined) {
        if (prev !== text) throw new Error(`wordLines: ${id} has two texts, "${prev}" and "${text}"`);
        continue;
      }
      seen.set(id, text);
      list.push({ id, speaker: 'narrator', text });
    }
    out.set(pack, list);
  }
  return out;
}

/** Phrases in step order. The clip text starts with a capital and ends with a mark. marks gives one clip per end mark. */
export function phraseLines(phrases: readonly PhraseEntry[]): PackLine[] {
  const out: PackLine[] = [];
  const seen = new Set<string>();
  for (const p of [...phrases].sort((a, b) => stepOrder(a.step) - stepOrder(b.step))) {
    const base = p.text.trim().replace(/[.?!]+$/, '');
    const variants = p.marks ? p.marks.map((m) => base + m) : [p.text.trim()];
    for (const v of variants) {
      const id = phraseId(v);
      if (seen.has(id)) continue;
      seen.add(id);
      const spoken = capitalise(/[.?!]$/.test(v) ? v : `${v}.`);
      out.push({ id, speaker: 'narrator', text: spoken });
    }
  }
  return out;
}

function namePair(name: string, called: string, asked: string, seed?: number, note?: string): PackLine[] {
  const x: PackLine = { id: nameId(name, '!'), speaker: 'narrator', text: called, expect: [name] };
  const q: PackLine = { id: nameId(name, '?'), speaker: 'narrator', text: asked, expect: [name] };
  if (seed !== undefined) { x.seed = seed; q.seed = seed; }
  if (note) { x.note = note; q.note = note; }
  return [x, q];
}

/**
 * "Pip!" then "Pip?" for every name, in budget order: every v2 name first (Moving Day needs them), then the bank
 * by rank. A v2 name keeps its v2 text and seed for "!", so that clip comes from the raw cache for free.
 */
export function nameLines(bank: readonly NameEntry[], v2: readonly V2Line[]): PackLine[] {
  const out: PackLine[] = [];
  const done = new Set<string>();
  const push = (name: string, lines: PackLine[]): void => {
    const key = slug(name);
    if (!key || done.has(key)) return;
    done.add(key);
    out.push(...lines);
  };
  for (const l of v2) {
    if (!l.id.startsWith('name-') || l.speaker !== 'narrator') continue;
    const name = capitalise(l.id.slice('name-'.length));
    const base = l.text.replace(/[!?.]+$/, '');
    push(name, namePair(name, l.text, `${base}?`, l.seed, 'v2 name'));
  }
  const ranked = bank.map((e, i) => ({ e, r: e.rank ?? 100000 + i })).sort((a, b) => a.r - b.r);
  for (const { e } of ranked) {
    const base = e.ipa ? `/${e.ipa}/` : e.say ?? e.name;
    push(e.name, namePair(e.name, `${base}!`, `${base}?`, e.seed));
  }
  return out;
}

/** Names Emma invented, from content/names/new.json (written by names:pull), oldest first. */
export function newNameLines(names: readonly NewName[]): PackLine[] {
  return names.flatMap((n) => namePair(n.name, `${n.text}!`, `${n.text}?`, undefined, `invented, nearest ${n.nearest ?? 'none'}`));
}

/** The errors that would make the generator refuse a pack, found earlier so the build fails first. */
export function validatePack(lines: readonly PackLine[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const l of lines) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.id)) errors.push(`${l.id}: id must be lowercase kebab-case`);
    if (ids.has(l.id)) errors.push(`${l.id}: duplicate id`);
    ids.add(l.id);
    if (NARRATOR_ONLY.some((p) => l.id.startsWith(p)) && l.speaker !== 'narrator') errors.push(`${l.id}: must be spoken by the narrator`);
    const plain = l.text.replace(/\[[^\]]*\]/g, '');
    if (/\d/.test(plain)) errors.push(`${l.id}: write numbers as words`);
    if (l.speaker !== 'foal' && plain !== l.text) errors.push(`${l.id}: audio tags are only for foal lines`);
    if (!l.text.trim()) errors.push(`${l.id}: empty text`);
    if (l.text.includes('\u2014')) errors.push(`${l.id}: no em dashes`);
  }
  return errors;
}

/** Ids used in more than one pack. The player would only ever find the first. */
export function crossPackDuplicates(packs: ReadonlyMap<string, readonly PackLine[]>): string[] {
  const where = new Map<string, string>();
  const dups: string[] = [];
  for (const [pack, lines] of packs) for (const l of lines) {
    const prev = where.get(l.id);
    if (prev && prev !== pack) dups.push(`${l.id}: in ${prev} and ${pack}`);
    where.set(l.id, pack);
  }
  return dups;
}
```

Then change the first lines of `G/tools/audio/number-lines.ts` to import the shared type instead of declaring it:

```ts
import { capitalise, numberWord, ordinalWord } from './number-words.ts';
import { bondId, numId, ordId, parcelId } from '../../src/audio/ids.ts';
import type { PackLine } from './lines-lib.ts';
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/audio/lines-lib.test.ts tests/audio/number-lines.test.ts`
Expected: 15 passed.

- [ ] **Step 5: Write the CLI**

`G/tools/audio/build-lines.ts`:

```ts
/**
 * Writes public/audio/<pack>/lines.json for every pack, from content/lines (hand-written lines), the number lines,
 * the word bank, the phrases, the name bank, Emma's invented names and the v2 name clips.
 * Run: npm run audio:lines (from games/moon-meadow-home). No network, no key.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { numberLines } from './number-lines.ts';
import {
  PACKS_BUILT, catalogueLines, crossPackDuplicates, nameLines, newNameLines, phraseLines, validatePack, wordLines,
  type NameEntry, type NewName, type PackLine, type PackName, type PhraseEntry, type SceneFile, type V2Line, type WordEntry,
} from './lines-lib.ts';

const G = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = resolve(G, '../..');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const jsonFiles = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f)) : [];
const optional = <T>(path: string, fallback: T): T => (existsSync(path) ? readJson<T>(path) : fallback);

const scenes = jsonFiles(join(G, 'content/lines')).map((p) => readJson<SceneFile>(p));
const words = jsonFiles(join(G, 'content/words')).flatMap((p) => readJson<{ words: WordEntry[] }>(p).words);
const phrases = jsonFiles(join(G, 'content/phrases')).flatMap((p) => readJson<{ phrases: PhraseEntry[] }>(p).phrases);
const bank = optional<{ names: NameEntry[] }>(join(G, 'content/names/t1.json'), { names: [] }).names;
const invented = optional<{ names: NewName[] }>(join(G, 'content/names/new.json'), { names: [] }).names;
const v2 = readJson<{ lines: V2Line[] }>(join(REPO, 'ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json')).lines;

const packs = new Map<PackName, PackLine[]>(PACKS_BUILT.map((p) => [p, []]));
const add = (pack: PackName, lines: readonly PackLine[]): void => { packs.get(pack)!.push(...lines); };
for (const [pack, lines] of catalogueLines(scenes)) add(pack, lines);
add('numbers', numberLines());
for (const [pack, lines] of wordLines(words)) add(pack, lines);
add('phrases', phraseLines(phrases));
add('names-t1', nameLines(bank, v2));
add('names-new', newNameLines(invented));

let errors = crossPackDuplicates(packs);
for (const [pack, lines] of packs) errors = errors.concat(validatePack(lines).map((e) => `${pack}: ${e}`));
if (errors.length) {
  for (const e of errors) console.error('error:', e);
  process.exit(1);
}
for (const [pack, lines] of packs) {
  const dir = join(G, 'public/audio', pack);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'lines.json'), JSON.stringify({ pack, lines }, null, 1) + '\n');
  if (!existsSync(join(dir, 'manifest.json'))) writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ clips: {} }, null, 1) + '\n');
  const chars = lines.reduce((n, l) => n + l.text.length, 0);
  console.log(`${pack.padEnd(18)} ${String(lines.length).padStart(5)} lines ${String(chars).padStart(6)} characters`);
}
if (!words.length) console.log('note: no word bank yet (content/words/*.json), word packs are empty');
if (!bank.length) console.log('note: no name bank yet (content/names/t1.json), names-t1 has the v2 names only');
```

Add to `G/package.json` `scripts` (keep the skeleton's entries):

```json
"audio:lines": "node tools/audio/build-lines.ts",
"audio:ids": "node tools/audio/gen-clip-ids.ts",
"check:audio": "node tools/audio/check-audio.ts",
"names:pull": "node tools/pull-unknown-names.ts"
```

- [ ] **Step 6: Run it**

Run from `games/moon-meadow-home`: `npm run audio:lines`
Expected: a row per pack. With no content banks yet: `core 93 lines`, `numbers 345 lines`, `names-t1 188 lines` (the 94 v2 names), the word, phrase and area packs at 0, and the two notes about missing banks. Exit code 0.

- [ ] **Step 7: Commit**

```sh
git add games/moon-meadow-home/tools/audio/lines-lib.ts games/moon-meadow-home/tools/audio/build-lines.ts games/moon-meadow-home/tools/audio/number-lines.ts games/moon-meadow-home/tests/audio/lines-lib.test.ts games/moon-meadow-home/package.json games/moon-meadow-home/public/audio
git commit -m "Build the v3 audio packs from the line catalogue and the content banks"
```

**Acceptance:** 15 tests pass, every pack folder has `lines.json` and `manifest.json`, the build fails (exit 1) on a narrator-only id spoken by another voice, a digit, a tag outside foal lines, an em dash, or an id in two packs.

### Task A7: Typed clip ids

**Files:**
- Create: `G/tools/audio/clip-ids-lib.ts`, `G/tools/audio/gen-clip-ids.ts`, `G/tests/audio/clip-ids.test.ts`
- Generated and committed: `G/src/audio/clip-ids.ts`

**Interfaces:**
- Consumes: `SceneFile`, `BASE_SCENES` (Task A6).
- Produces: `renderClipIds(files: readonly SceneFile[]): string`; in `src/audio/clip-ids.ts`: `SCENES` (tuple), `SceneId`, `ClipId` (union of every hand-written id), `SCENE_CLIPS: Readonly<Record<SceneId, readonly ClipId[]>>`. A scene file with a new scene name adds that scene. A typo in a static id is a compile error in any scene.

- [ ] **Step 1: Write the failing test**

`G/tests/audio/clip-ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderClipIds } from '../../tools/audio/clip-ids-lib.ts';

describe('renderClipIds', () => {
  const out = renderClipIds([
    { scene: 'nest', lines: [{ id: 'g-egg', speaker: 'narrator', text: 'Egg.' }, { id: 'fb-hot', speaker: 'narrator', text: 'Hot!', also: ['bath-pond'] }] },
    { scene: 'toy-shelf', pack: 'places', lines: [{ id: 'pl-jar', speaker: 'narrator', text: 'Jar.' }] },
  ]);
  it('lists the ids as a sorted union', () => {
    expect(out).toContain("export type ClipId =\n  | 'fb-hot'\n  | 'g-egg'\n  | 'pl-jar';");
  });
  it('keeps every base scene, adds new scenes, and maps lines to scenes with also', () => {
    expect(out).toContain("'common': [],");
    expect(out).toContain("'nest': ['g-egg', 'fb-hot'],");
    expect(out).toContain("'bath-pond': ['fb-hot'],");
    expect(out).toContain("'toy-shelf': ['pl-jar'],");
    expect(out).toMatch(/export const SCENES = \['common', .*'toy-shelf'\] as const;/);
  });
  it('is never an empty union', () => {
    expect(renderClipIds([])).toContain('export type ClipId = never;');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/clip-ids.test.ts`
Expected: `Failed to load url ../../tools/audio/clip-ids-lib.ts`.

- [ ] **Step 3: Implement**

`G/tools/audio/clip-ids-lib.ts`:

```ts
import { BASE_SCENES, type SceneFile } from './lines-lib.ts';

const q = (s: string): string => `'${s}'`;

/** The text of src/audio/clip-ids.ts: SCENES, SceneId, ClipId and SCENE_CLIPS, from the scene files. */
export function renderClipIds(files: readonly SceneFile[]): string {
  const scenes: string[] = [...BASE_SCENES];
  for (const f of files) for (const s of [f.scene, ...f.lines.flatMap((l) => l.also ?? [])]) if (!scenes.includes(s)) scenes.push(s);
  const byScene = new Map<string, string[]>(scenes.map((s) => [s, []]));
  const ids = new Set<string>();
  for (const f of files) for (const l of f.lines) {
    ids.add(l.id);
    for (const s of [f.scene, ...(l.also ?? [])]) byScene.get(s)!.push(l.id);
  }
  const sorted = [...ids].sort();
  const lines = [
    '// Generated by tools/audio/gen-clip-ids.ts from content/lines/*.json. Do not edit by hand: run npm run audio:ids.',
    `export const SCENES = [${scenes.map(q).join(', ')}] as const;`,
    'export type SceneId = (typeof SCENES)[number];',
    sorted.length ? `export type ClipId =\n${sorted.map((id) => `  | ${q(id)}`).join('\n')};` : 'export type ClipId = never;',
    'export const SCENE_CLIPS: Readonly<Record<SceneId, readonly ClipId[]>> = {',
    ...scenes.map((s) => `  ${q(s)}: [${byScene.get(s)!.map(q).join(', ')}],`),
    '};',
    '',
  ];
  return lines.join('\n');
}
```

`G/tools/audio/gen-clip-ids.ts`:

```ts
/** Writes src/audio/clip-ids.ts from content/lines/*.json. Run: npm run audio:ids (from games/moon-meadow-home). */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderClipIds } from './clip-ids-lib.ts';
import type { SceneFile } from './lines-lib.ts';

const G = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(G, 'content/lines');
const files = existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as SceneFile)
  : [];
writeFileSync(join(G, 'src/audio/clip-ids.ts'), renderClipIds(files));
console.log(`src/audio/clip-ids.ts: ${files.reduce((n, f) => n + f.lines.length, 0)} clip ids in ${files.length} scene files`);
```

- [ ] **Step 4: Run the test and generate the file**

Run: `npx vitest run tests/audio/clip-ids.test.ts`, then `npm run audio:ids`
Expected: 3 passed, then `src/audio/clip-ids.ts: 93 clip ids in 11 scene files`.

- [ ] **Step 5: Commit**

```sh
git add games/moon-meadow-home/tools/audio/clip-ids-lib.ts games/moon-meadow-home/tools/audio/gen-clip-ids.ts games/moon-meadow-home/tests/audio/clip-ids.test.ts games/moon-meadow-home/src/audio/clip-ids.ts
git commit -m "Generate typed clip ids and scene clip lists"
```

Every later task that edits `content/lines/` runs `npm run audio:ids` and commits the regenerated file with it.

### Task A8: The audio facade and the Vite plugin

**Files:**
- Create: `G/src/audio/speech.ts`, `G/src/audio/facade.ts`, `G/src/audio/packs.ts`, `G/src/audio/player.ts`, `G/src/audio/shared-player.d.ts`, `G/src/audio/index.ts`, `G/tools/vite-shared-audio.ts`
- Test: `G/tests/audio/clip-index.test.ts`, `G/tests/audio/speech.test.ts`, `G/tests/audio/facade.test.ts`, `G/tests/audio/vite-shared-audio.test.ts`

**Interfaces:**
- Consumes: `ClipIndex` (Task A3), ids (Task A4), `SCENE_CLIPS`, `ClipId`, `SceneId` (Task A7), `window.EmmaAudio` with packs (Task A3).
- Produces: `createSpeech(player, sleep?): Speech`, `createAudio<Id, Scene>(player, packs, sceneClips): Audio<Id, Scene>`, `PACKS`, `audio` (see "Contracts I provide"), `sharedAudio(repoRoot): Plugin`, `phonicsFiles(dir): string[]`.

- [ ] **Step 1: Write the failing tests**

`G/tests/audio/clip-index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ClipIndex, type ClipEntry } from '../../src/audio/clip-index.ts';

const clip = (ok?: boolean): ClipEntry => ({ hash: 'h', speaker: 'narrator', text: 't', file: 'f.mp3', ...(ok === undefined ? {} : { ok }) });

describe('ClipIndex', () => {
  it('knows clips across packs and treats ok: false as absent', () => {
    const ix = new ClipIndex();
    ix.set('core', { clips: { 'g-egg': clip() } });
    ix.set('names-t1', { clips: { 'name-pip-x': clip(true), 'name-lin-x': clip(false) } });
    ix.set('names-new', null);
    expect(ix.has('g-egg')).toBe(true);
    expect(ix.has('name-pip-x')).toBe(true);
    expect(ix.has('name-lin-x')).toBe(false);
    expect(ix.has('word-hat')).toBe(false);
    expect(ix.ids('name-')).toEqual(['name-pip-x']);
  });
  it('replaces a pack when it is set again', () => {
    const ix = new ClipIndex();
    ix.set('names-new', { clips: {} });
    expect(ix.has('name-zibbo-x')).toBe(false);
    ix.set('names-new', { clips: { 'name-zibbo-x': clip() } });
    expect(ix.has('name-zibbo-x')).toBe(true);
  });
});
```

`G/tests/audio/speech.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSpeech, type SpeechPlayer } from '../../src/audio/speech.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

function fakePlayer() {
  const calls: string[] = [];
  const pending = new Map<string, ReturnType<typeof deferred>>();
  const start = (key: string) => { calls.push(key); const d = deferred(); pending.set(key, d); return d.promise; };
  const player: SpeechPlayer = { say: (id) => start(`say:${id}`), sound: (c) => start(`sound:${c}`), stop: () => { calls.push('stop'); } };
  const end = (key: string) => pending.get(key)!.resolve();
  return { player, calls, end };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const fastSleep = () => tick();

describe('speech order', () => {
  it('plays ids in order and skips empty entries', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const done = s.speak(['a', null, 'b']);
    await tick();
    expect(calls).toEqual(['say:a']);
    end('say:a');
    await tick(); await tick();
    expect(calls).toEqual(['say:a', 'say:b']);
    end('say:b');
    await done;
  });

  it('act() stops the rest of a sequence', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const done = s.speak(['a', 'b']);
    await tick();
    s.act();
    end('say:a');
    await done;
    expect(calls).toEqual(['say:a', 'stop']);
  });

  it('never cuts off a sound she asked for: the instruction waits for it', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const heard = s.listenSound('s');
    const done = s.speak(['g-gems']);
    await tick(); await tick();
    expect(calls).toEqual(['stop', 'sound:s']);
    expect(s.userBusy).toBe(true);
    end('sound:s');
    await heard;
    await tick(); await tick();
    expect(calls).toEqual(['stop', 'sound:s', 'say:g-gems']);
    end('say:g-gems');
    await done;
  });

  it('a replay stops when she starts listening during it', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const done = s.speak(['g1', 'g2'], { replay: true });
    await tick();
    const heard = s.listen('word-hat');
    end('say:g1');
    await tick(); await tick();
    end('say:word-hat');
    await heard;
    await done;
    expect(calls).toEqual(['say:g1', 'stop', 'say:word-hat']);
  });

  it('waits while the naming slider plays', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    s.setSliding(true);
    const done = s.speak(['fb-spelled']);
    await tick(); await tick();
    expect(calls).toEqual([]);
    s.setSliding(false);
    await tick(); await tick();
    expect(calls).toEqual(['say:fb-spelled']);
    end('say:fb-spelled');
    await done;
  });
});
```

`G/tests/audio/facade.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createAudio, type PlayerLike } from '../../src/audio/facade.ts';
import type { ClipEntry, ClipManifest } from '../../src/audio/clip-index.ts';

const clip = (ok = true): ClipEntry => ({ hash: 'h', speaker: 'narrator', text: 't', file: 'f.mp3', ok });
const MANIFESTS: Record<string, ClipManifest> = {
  core: { clips: { 'g-egg': clip(), 'g-stone': clip() } },
  numbers: { clips: { 'num-movein-19': clip() } },
  'names-t1': { clips: { 'name-pip-x': clip(), 'name-lily-x': clip(false) } },
};

function fakePlayer(manifests: Record<string, ClipManifest | null> = MANIFESTS) {
  const calls: string[] = [];
  const player: PlayerLike = {
    init: (o) => { calls.push(`init:${o?.base}:${o?.phonics}`); return player as never; },
    unlock: async () => {},
    addPack: async (name, base, o) => { calls.push(`pack:${name}:${base}:${o?.fresh ? 'fresh' : 'cached'}`); return manifests[name] ?? null; },
    preload: async (ids) => { calls.push(`preload:${ids.join(',')}`); return []; },
    forget: (ids) => { calls.push(`forget:${ids.join(',')}`); },
    say: async (id) => { calls.push(`say:${id}`); },
    sound: async (c) => { calls.push(`sound:${c}`); },
    hold: () => ({ stop() {}, done: Promise.resolve() }),
    sfx: async () => {},
    stop: () => { calls.push('stop'); },
    mute: () => true,
    onMissing: () => () => {},
    missing: [],
    speaking: false,
  };
  return { player, calls };
}

const PACKS = [{ name: 'core' }, { name: 'numbers' }, { name: 'names-t1', fresh: true }];
const SCENES = { common: ['g-egg'], nest: ['g-egg', 'g-stone'], hatch: ['g-stone'] };

async function ready() {
  const f = fakePlayer();
  const audio = createAudio(f.player, PACKS, SCENES);
  await audio.init({ base: '/g/audio/' });
  return { audio, calls: f.calls };
}

describe('audio facade', () => {
  it('adds every pack under the base, names fresh', async () => {
    const { calls } = await ready();
    expect(calls).toEqual([
      'init:/g/audio/core/:/g/audio/phonics/',
      'pack:core:/g/audio/core/:cached',
      'pack:numbers:/g/audio/numbers/:cached',
      'pack:names-t1:/g/audio/names-t1/:fresh',
    ]);
  });

  it('drops dynamic ids without a usable clip and keeps static ids', async () => {
    const { audio, calls } = await ready();
    await audio.speak(audio.nameClip('Bella', '!'), 'num-movein-19', 'num-movein-99', 'g-egg', 'g-missing');
    expect(calls.filter((c) => c.startsWith('say:'))).toEqual(['say:num-movein-19', 'say:g-egg', 'say:g-missing']);
  });

  it('finds names, falls back from "?" to "!", and treats an excluded clip as no clip', async () => {
    const { audio, calls } = await ready();
    expect(audio.hasName('Pip')).toBe(true);
    expect(audio.hasName('Lily')).toBe(false);
    expect(audio.nameClip('Pip', '?')).toBe('name-pip-x');
    await audio.sayName('Lily', '!');
    await audio.sayName('Pip', '?');
    expect(calls.filter((c) => c.startsWith('say:'))).toEqual(['say:name-pip-x']);
  });

  it('has sayAll and has as aliases', async () => {
    const { audio, calls } = await ready();
    expect(audio.has('g-egg')).toBe(true);
    await audio.sayAll(['g-egg', null, 'g-stone']);
    expect(calls.filter((c) => c.startsWith('say:'))).toEqual(['say:g-egg', 'say:g-stone']);
  });

  it('in fast mode plays nothing and records what it would have said', async () => {
    const { audio, calls } = await ready();
    audio.setFast(true);
    await audio.speak('g-egg', 'num-movein-19');
    expect(calls.some((c) => c.startsWith('say:'))).toBe(false);
    expect(audio.said).toEqual(['g-egg', 'num-movein-19']);
  });

  it('tells listeners who is talking', async () => {
    const { audio } = await ready();
    const seen: Array<string | null> = [];
    const off = audio.onTalk((id) => seen.push(id));
    await audio.speak('g-egg');
    off();
    await audio.speak('g-stone');
    expect(seen).toEqual(['g-egg', null]);
  });

  it('preloads a scene and releases only clips no loaded scene still needs', async () => {
    const { audio, calls } = await ready();
    await audio.preloadScene('nest');
    await audio.preloadScene('hatch');
    audio.release('nest');
    expect(calls).toContain('preload:g-egg,g-stone');
    expect(calls).toContain('forget:');
    audio.release('hatch');
    expect(calls.at(-1)).toBe('forget:g-stone');
  });

  it('refreshNames fetches the fresh packs again', async () => {
    const { audio, calls } = await ready();
    await audio.refreshNames();
    expect(calls.filter((c) => c.startsWith('pack:names-t1'))).toHaveLength(2);
  });
});
```

`G/tests/audio/vite-shared-audio.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { phonicsFiles, sharedAudio } from '../../tools/vite-shared-audio.ts';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));

describe('sharedAudio plugin', () => {
  it('lists the letter sounds and index, never the takes', () => {
    const files = phonicsFiles(`${repo}shared/audio/phonics`);
    expect(files).toContain('index.json');
    expect(files).toContain('snd-s.mp3');
    expect(files.some((f) => f.startsWith('takes'))).toBe(false);
  });
  it('aliases @emma/audio-player to shared/audio.js', () => {
    const plugin = sharedAudio(repo);
    const config = (plugin.config as (c: object) => { resolve: { alias: Record<string, string> } })({});
    const target = config.resolve.alias['@emma/audio-player'];
    expect(target.endsWith('shared/audio.js')).toBe(true);
    expect(existsSync(target)).toBe(true);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/audio/clip-index.test.ts tests/audio/speech.test.ts tests/audio/facade.test.ts tests/audio/vite-shared-audio.test.ts`
Expected: `clip-index` passes (the class exists since Task A3), the other three files fail to load their modules.

- [ ] **Step 3: Implement the speech rules**

`G/src/audio/speech.ts`:

```ts
/**
 * Speech order rules, ported from v2 (ideas/opus-5-5-unicorn-egg-nest-v2/index.html, act/listen/sayAllRaw).
 * - act(): Emma did something that has its own answer. Running and queued instructions stop, so a stale
 *   instruction never talks over the answer.
 * - listen(): Emma asked to hear something (a bell, a basket item, a gem). It is never cut off: a running
 *   instruction sequence waits for it and then goes on. A replay of the goal stops instead.
 */
export interface SpeechPlayer {
  say(id: string): Promise<void>;
  sound(code: string): Promise<void>;
  stop(): void;
}

export interface Speech {
  speak(ids: ReadonlyArray<string | null | undefined>, opts?: { replay?: boolean }): Promise<void>;
  listen(id: string): Promise<void>;
  listenSound(code: string): Promise<void>;
  act(): void;
  setSliding(on: boolean): void;
  readonly userBusy: boolean;
}

export function createSpeech(player: SpeechPlayer, sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Speech {
  let actN = 0;
  let listenN = 0;
  let userTalk = 0;
  let sliding = false;
  const busy = (): boolean => userTalk > 0 || sliding;
  const track = (p: Promise<void>): Promise<void> => {
    listenN++;
    userTalk++;
    return p.catch(() => undefined).then(() => { userTalk--; });
  };
  return {
    async speak(ids, opts = {}) {
      const a = actN;
      const l = listenN;
      const stale = (): boolean => actN !== a || (!!opts.replay && listenN !== l);
      for (const id of ids) {
        if (!id) continue;
        while (busy() && !stale()) await sleep(80);
        if (stale()) return;
        await player.say(id).catch(() => undefined);
      }
    },
    listen(id) { player.stop(); return track(player.say(id)); },
    listenSound(code) { player.stop(); return track(player.sound(code)); },
    act() { actN++; player.stop(); },
    setSliding(on) { sliding = on; },
    get userBusy() { return busy(); },
  };
}
```

- [ ] **Step 4: Implement the facade**

`G/src/audio/facade.ts`:

```ts
import { ClipIndex } from './clip-index.ts';
import { createSpeech } from './speech.ts';
import { isDynamic, nameId, type NameClipId, type NameMark } from './ids.ts';
import type { EmmaAudioApi, HoldHandle, SfxName } from './emma-audio.ts';

export type PlayerLike = Pick<EmmaAudioApi, 'init' | 'unlock' | 'addPack' | 'preload' | 'forget' | 'say' | 'sound'
  | 'hold' | 'sfx' | 'stop' | 'mute' | 'onMissing' | 'missing' | 'speaking'>;
export type PackSpec = { readonly name: string; readonly fresh?: boolean };

export interface Audio<Id extends string = string, Scene extends string = string> {
  init(opts: { base: string }): Promise<void>;
  unlock(): Promise<void>;
  hasClip(id: string): boolean;
  has(id: string): boolean;
  hasName(name: string): boolean;
  nameClip(name: string, mark: NameMark): NameClipId | null;
  say(id: Id | null | undefined): Promise<void>;
  speak(...ids: Array<Id | null | undefined>): Promise<void>;
  sayAll(ids: ReadonlyArray<Id | null | undefined>): Promise<void>;
  replay(...ids: Array<Id | null | undefined>): Promise<void>;
  sayName(name: string, mark: NameMark): Promise<void>;
  listen(id: Id | null | undefined): Promise<void>;
  listenSound(code: string): Promise<void>;
  sound(code: string): Promise<void>;
  hold(code: string): HoldHandle;
  sfx(name: SfxName): Promise<void>;
  act(): void;
  stop(): void;
  mute(on: boolean): void;
  setSliding(on: boolean): void;
  preload(ids: readonly string[]): Promise<string[]>;
  preloadScene(scene: Scene): Promise<string[]>;
  release(scene: Scene): void;
  preloadAll(): Promise<string[]>;
  refreshNames(): Promise<void>;
  onMissing(cb: (id: string) => void): () => void;
  onTalk(cb: (id: string | null) => void): () => void;
  setFast(on: boolean): void;
  readonly said: readonly string[];
  readonly speaking: boolean;
  readonly missing: readonly string[];
}

export function createAudio<Id extends string = string, Scene extends string = string>(
  player: PlayerLike,
  packs: readonly PackSpec[],
  sceneClips: Readonly<Record<Scene, readonly string[]>>,
): Audio<Id, Scene> {
  const index = new ClipIndex();
  const said: string[] = [];
  const talkers = new Set<(id: string | null) => void>();
  const loaded = new Set<Scene>();
  const clipsOf = (scene: string): readonly string[] => (sceneClips as Record<string, readonly string[]>)[scene] ?? [];
  let base = '';
  let fast = false;

  const talk = (id: string | null): void => { for (const cb of talkers) cb(id); };
  const playable = (id: string): boolean => !isDynamic(id) || index.has(id);
  const clean = (ids: ReadonlyArray<string | null | undefined>): string[] => ids.filter((id): id is string => !!id && playable(id));
  const sayOne = async (id: string): Promise<void> => {
    said.push(id);
    if (fast) return;
    talk(id);
    try { await player.say(id); } finally { talk(null); }
  };
  const speech = createSpeech({
    say: sayOne,
    sound: (code) => (fast ? Promise.resolve() : player.sound(code)),
    stop: () => player.stop(),
  });
  const nameClip = (name: string, mark: NameMark): NameClipId | null => {
    const want = nameId(name, mark);
    if (index.has(want)) return want;
    const called = nameId(name, '!');
    return index.has(called) ? called : null;
  };

  return {
    async init(opts) {
      base = opts.base;
      player.init({ base: `${base}core/`, phonics: `${base}phonics/` });
      const manifests = await Promise.all(packs.map((p) => player.addPack(p.name, `${base}${p.name}/`, { fresh: !!p.fresh })));
      packs.forEach((p, i) => index.set(p.name, manifests[i]));
    },
    unlock: () => player.unlock(),
    hasClip: (id) => index.has(id),
    has: (id) => index.has(id),
    hasName: (name) => nameClip(name, '!') !== null,
    nameClip,
    say: (id) => speech.speak(clean([id])),
    speak: (...ids) => speech.speak(clean(ids)),
    sayAll: (ids) => speech.speak(clean(ids)),
    replay: (...ids) => speech.speak(clean(ids), { replay: true }),
    sayName: (name, mark) => speech.speak(clean([nameClip(name, mark)])),
    listen: (id) => (id && playable(id) ? speech.listen(id) : Promise.resolve()),
    listenSound: (code) => speech.listenSound(code),
    sound: (code) => (fast ? Promise.resolve() : player.sound(code)),
    hold: (code) => player.hold(code),
    sfx: (name) => (fast ? Promise.resolve() : player.sfx(name)),
    act: () => speech.act(),
    stop: () => player.stop(),
    mute: (on) => { player.mute(on); },
    setSliding: (on) => speech.setSliding(on),
    preload: (ids) => player.preload(clean(ids)),
    preloadScene(scene) {
      loaded.add(scene);
      return player.preload(clean(clipsOf(scene)));
    },
    release(scene) {
      loaded.delete(scene);
      const keep = new Set<string>([...clipsOf('common'), ...[...loaded].flatMap((s) => clipsOf(s))]);
      player.forget(clipsOf(scene).filter((id) => !keep.has(id)));
    },
    preloadAll: () => player.preload(index.ids()),
    async refreshNames() {
      for (const p of packs) if (p.fresh) index.set(p.name, await player.addPack(p.name, `${base}${p.name}/`, { fresh: true }));
    },
    onMissing: (cb) => player.onMissing(cb),
    onTalk(cb) {
      talkers.add(cb);
      return () => { talkers.delete(cb); };
    },
    setFast(on) { fast = on; },
    get said() { return said; },
    get speaking() { return player.speaking; },
    get missing() { return player.missing; },
  };
}
```

- [ ] **Step 5: Wire it to the real player**

`G/src/audio/shared-player.d.ts`:

```ts
// shared/audio.js is a classic script that sets window.EmmaAudio. The Vite plugin aliases it (tools/vite-shared-audio.ts).
declare module '@emma/audio-player';
```

`G/src/audio/player.ts`:

```ts
import '@emma/audio-player';
import type { EmmaAudioApi } from './emma-audio.ts';

/** The one shared player (shared/audio.js), typed. */
export const player: EmmaAudioApi = (window as unknown as { EmmaAudio: EmmaAudioApi }).EmmaAudio;
```

`G/src/audio/packs.ts`:

```ts
import type { PackSpec } from './facade.ts';

/** Every audio pack in public/audio/, in lookup order. Name packs are fetched fresh, so new names arrive without a rebuild. */
export const PACKS: readonly PackSpec[] = [
  { name: 'core' },
  { name: 'numbers' },
  { name: 'words-phase2' },
  { name: 'words-phase3-4' },
  { name: 'words-year1' },
  { name: 'phrases' },
  { name: 'area-stable-yard' },
  { name: 'area-village-lane' },
  { name: 'places' },
  { name: 'names-t1', fresh: true },
  { name: 'names-new', fresh: true },
];
```

`G/src/audio/index.ts`:

```ts
/** The app's audio. Scenes import from here only. See docs/v3/plan/audio.md for the line recipes. */
import { createAudio, type Audio } from './facade.ts';
import { player } from './player.ts';
import { PACKS } from './packs.ts';
import { SCENE_CLIPS, type ClipId, type SceneId } from './clip-ids.ts';
import type { DynamicId } from './ids.ts';

export type SpokenId = ClipId | DynamicId;
export const audio: Audio<SpokenId, SceneId> = createAudio<SpokenId, SceneId>(player, PACKS, SCENE_CLIPS);

export { bondId, isDynamic, nameId, numId, ordId, parcelId, phraseId, slug, wordId } from './ids.ts';
export type { DynamicId, NameMark, NumKind } from './ids.ts';
export type { ClipId, SceneId } from './clip-ids.ts';
export { SCENES } from './clip-ids.ts';
```

- [ ] **Step 6: Implement the Vite plugin**

`G/tools/vite-shared-audio.ts`:

```ts
/**
 * Vite plugin for the shared audio player and letter sounds.
 * - '@emma/audio-player' resolves to <repo>/shared/audio.js, which is bundled as a side-effect import.
 * - <base>audio/phonics/ serves shared/audio/phonics/ in dev, and the build emits the same files (not takes/).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

export function phonicsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f === 'index.json' || /^snd-[a-z0-9-]+\.mp3$/.test(f)).sort();
}

export function sharedAudio(repoRoot: string): Plugin {
  const shared = resolve(repoRoot, 'shared');
  const phonics = join(shared, 'audio', 'phonics');
  let base = '/';
  return {
    name: 'emma-shared-audio',
    config(config) {
      const root = resolve(config.root ?? process.cwd());
      return {
        resolve: { alias: { '@emma/audio-player': join(shared, 'audio.js') } },
        server: { fs: { allow: [root, shared] } },
      };
    },
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefix = `${base}audio/phonics/`;
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith(prefix)) return next();
        const file = url.slice(prefix.length);
        if (!phonicsFiles(phonics).includes(file)) return next();
        res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : 'audio/mpeg');
        res.end(readFileSync(join(phonics, file)));
      });
    },
    generateBundle() {
      for (const f of phonicsFiles(phonics)) {
        this.emitFile({ type: 'asset', fileName: `audio/phonics/${f}`, source: readFileSync(join(phonics, f)) });
      }
    },
  };
}
```

The skeleton's `vite.config.ts` adds it (contract 1): `plugins: [svelte(), sharedAudio(resolve(import.meta.dirname, '../..'))]`.

- [ ] **Step 7: Run the tests and the type check**

Run: `npx vitest run tests/audio` then `npx tsc --noEmit -p .` (or `npm run check` once the skeleton has svelte-check)
Expected: every audio test passes (9 files now), no type errors. A deliberate `audio.speak('g-not-a-line')` in any `.ts` file is a type error.

- [ ] **Step 8: Check the build**

Run: `npx vite build`
Expected: `dist/audio/phonics/index.json` and `dist/audio/phonics/snd-s.mp3` exist, `dist/audio/<pack>/` exists for every pack, and `grep -c EmmaAudio dist/assets/*.js` finds the player in the bundle.

- [ ] **Step 9: Commit**

```sh
git add games/moon-meadow-home/src/audio games/moon-meadow-home/tools/vite-shared-audio.ts games/moon-meadow-home/tests/audio
git commit -m "Add the typed audio facade with the v2 speech-order rules"
```

### Task A9: Audio checks

**Files:**
- Create: `G/tools/audio/check-audio.ts`, `G/tests/audio/check-audio.test.ts`, `G/flows/audio-check.html`

**Interfaces:**
- Produces: `checkAudio(audioRoot: string): AudioIssue[]`, `STATIC_PACKS`, `type AudioIssue = { pack; id; severity: 'error' | 'warn'; kind: 'no-clip' | 'no-file' | 'stale' | 'stt' | 'excluded' | 'unchecked'; detail }`. CLI `npm run check:audio` (exit 1 on any error). The content validator (`npm run check:content`, content workstream) may import `checkAudio` and fail on its errors. `flows/audio-check.html` sets `window.__audioCheck = { packs, clips, missing, soundsMissing }` after `run()`.

Rules: in `core`, `area-*` and `places` every line needs a clip (error); in the other packs a missing clip is a warning (the budget may stop them). A clip whose text differs from its line is stale (error in static packs). A learning clip with no speech-to-text result is an error; one with `ok: false` is a warning (the app treats it as absent). A game line whose transcript did not match is a warning for Tjitse.

- [ ] **Step 1: Write the failing test**

`G/tests/audio/check-audio.test.ts`:

```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAudio } from '../../tools/audio/check-audio.ts';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'audio-check-'));
  const pack = (name: string, lines: unknown[], clips: Record<string, unknown> | null, files: string[]) => {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, 'lines.json'), JSON.stringify({ lines }));
    if (clips) writeFileSync(join(root, name, 'manifest.json'), JSON.stringify({ clips }));
    for (const f of files) writeFileSync(join(root, name, f), 'x');
  };
  const stt = (text: string, match = true) => ({ hash: 'h', text, match, how: match ? 'exact' : 'miss' });
  pack('core', [
    { id: 'g-a', speaker: 'narrator', text: 'A.' },
    { id: 'g-b', speaker: 'narrator', text: 'B.' },
    { id: 'g-c', speaker: 'narrator', text: 'C new.' },
    { id: 'foal-d', speaker: 'foal', text: 'Yay!' },
  ], {
    'g-a': { file: 'g-a.mp3', text: 'A.', stt: stt('A.') },
    'g-c': { file: 'g-c.mp3', text: 'C old.', stt: stt('C old.') },
    'foal-d': { file: 'foal-d.mp3', text: 'Yay!' },
  }, ['g-a.mp3', 'g-c.mp3', 'foal-d.mp3']);
  pack('names-t1', [
    { id: 'name-pip-x', speaker: 'narrator', text: 'Pip!' },
    { id: 'name-lin-x', speaker: 'narrator', text: 'Lin!' },
    { id: 'name-sam-x', speaker: 'narrator', text: 'Sam!' },
    { id: 'name-zed-x', speaker: 'narrator', text: 'Zed!' },
  ], {
    'name-pip-x': { file: 'name-pip-x.mp3', text: 'Pip!', stt: stt('Pip') },
    'name-lin-x': { file: 'name-lin-x.mp3', text: 'Lin!', ok: false, stt: stt('Lean', false) },
    'name-sam-x': { file: 'name-sam-x.mp3', text: 'Sam!' },
  }, ['name-pip-x.mp3', 'name-lin-x.mp3', 'name-sam-x.mp3']);
  pack('empty', [], null, []);
  return root;
}

describe('checkAudio', () => {
  it('reports missing, stale, unchecked and excluded clips with the right severity', () => {
    const issues = checkAudio(fixture()).map((i) => [i.pack, i.id, i.severity, i.kind]);
    expect(issues).toEqual([
      ['core', 'g-b', 'error', 'no-clip'],
      ['core', 'g-c', 'error', 'stale'],
      ['names-t1', 'name-lin-x', 'warn', 'excluded'],
      ['names-t1', 'name-sam-x', 'error', 'unchecked'],
      ['names-t1', 'name-zed-x', 'warn', 'no-clip'],
    ]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/check-audio.test.ts`
Expected: `Failed to load url ../../tools/audio/check-audio.ts`.

- [ ] **Step 3: Implement**

`G/tools/audio/check-audio.ts`:

```ts
/**
 * Checks every audio pack: each line has a clip and a file, the clip says the current text, and learning clips
 * passed speech-to-text. Run: npm run check:audio (from games/moon-meadow-home). Exit code 1 on any error.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type AudioIssue = {
  pack: string; id: string; severity: 'error' | 'warn';
  kind: 'no-clip' | 'no-file' | 'stale' | 'stt' | 'excluded' | 'unchecked'; detail: string;
};
type Line = { id: string; speaker: string; text: string };
type Clip = { file: string; text: string; ok?: boolean; stt?: { text: string; match: boolean; how?: string } };

/** Packs whose every line must have a clip before a release. The others may stop at the budget. */
export const STATIC_PACKS: ReadonlySet<string> = new Set(['core', 'area-stable-yard', 'area-village-lane', 'places']);
const LEARNING = ['word-', 'phrase-', 'name-', 'num-', 'ord-'];

export function checkAudio(audioRoot: string): AudioIssue[] {
  const issues: AudioIssue[] = [];
  for (const pack of readdirSync(audioRoot).sort()) {
    const linesPath = join(audioRoot, pack, 'lines.json');
    if (!existsSync(linesPath)) continue;
    const lines = (JSON.parse(readFileSync(linesPath, 'utf8')) as { lines: Line[] }).lines;
    const manifestPath = join(audioRoot, pack, 'manifest.json');
    const clips: Record<string, Clip> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).clips ?? {} : {};
    const must = STATIC_PACKS.has(pack);
    for (const l of lines) {
      const add = (severity: AudioIssue['severity'], kind: AudioIssue['kind'], detail: string): void => {
        issues.push({ pack, id: l.id, severity, kind, detail });
      };
      const c = clips[l.id];
      if (!c) { add(must ? 'error' : 'warn', 'no-clip', l.text); continue; }
      if (!existsSync(join(audioRoot, pack, c.file))) { add('error', 'no-file', c.file); continue; }
      if (c.text !== l.text) add(must ? 'error' : 'warn', 'stale', `clip says "${c.text}", line says "${l.text}"`);
      if (c.ok === false) add('warn', 'excluded', `speech-to-text heard "${c.stt?.text ?? ''}"`);
      else if (l.speaker !== 'foal' && !c.stt) add(LEARNING.some((p) => l.id.startsWith(p)) ? 'error' : 'warn', 'unchecked', 'no speech-to-text result');
      else if (c.stt && !c.stt.match) add('warn', 'stt', `heard "${c.stt.text}"`);
    }
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'public/audio');
  const issues = checkAudio(root);
  for (const i of issues) console.log(`${i.severity.padEnd(5)} ${i.pack.padEnd(18)} ${i.kind.padEnd(9)} ${i.id}: ${i.detail}`);
  const errors = issues.filter((i) => i.severity === 'error').length;
  console.log(`${issues.length} issue(s), ${errors} error(s)`);
  process.exit(errors ? 1 : 0);
}
```

`G/flows/audio-check.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audio check</title>
<style>
  body { font: 18px/1.4 system-ui, sans-serif; margin: 16px; background: #fff; color: #222; }
  button { font-size: 28px; padding: 20px 32px; }
</style>
</head>
<body>
<button id="go" aria-label="check every clip">Check every clip</button>
<pre id="out"></pre>
<script src="../../../shared/audio.js"></script>
<script>
// Decodes every clip of every v3 pack and every letter sound in this browser engine.
// Serve the repo root over http, open this page, then call run() (playwright-cli eval) or tap the button.
var PACKS = ['core', 'numbers', 'words-phase2', 'words-phase3-4', 'words-year1', 'phrases', 'area-stable-yard',
  'area-village-lane', 'places', 'names-t1', 'names-new'];
var BASE = '../public/audio/';

function run() {
  EmmaAudio.init({ base: BASE + 'core/', phonics: '../../../shared/audio/phonics/' });
  return EmmaAudio.unlock().then(function () {
    return Promise.all(PACKS.map(function (p) { return EmmaAudio.addPack(p, BASE + p + '/'); }));
  }).then(function (manifests) {
    var ids = [];
    manifests.forEach(function (m) { if (m && m.clips) ids = ids.concat(Object.keys(m.clips)); });
    var missing = [];
    var chunks = [];
    for (var i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
    return chunks.reduce(function (p, chunk) {
      return p.then(function () {
        return EmmaAudio.preload(chunk).then(function (miss) {
          missing = missing.concat(miss);
          EmmaAudio.forget(chunk); // keep memory flat on a long list
        });
      });
    }, Promise.resolve()).then(function () {
      return EmmaAudio.preloadSounds();
    }).then(function (soundsMissing) {
      window.__audioCheck = { packs: PACKS.length, clips: ids.length, missing: missing, soundsMissing: soundsMissing };
      document.getElementById('out').textContent = JSON.stringify(window.__audioCheck, null, 1);
      return window.__audioCheck;
    });
  });
}
document.getElementById('go').addEventListener('pointerdown', function () { run(); });
</script>
</body>
</html>
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/audio/check-audio.test.ts`, then `npm run check:audio`
Expected: 1 passed. The CLI lists every core line as `no-clip` and exits 1, because nothing is generated yet. That is the starting point for Task A10.

- [ ] **Step 5: Commit**

```sh
git add games/moon-meadow-home/tools/audio/check-audio.ts games/moon-meadow-home/tests/audio/check-audio.test.ts games/moon-meadow-home/flows/audio-check.html
git commit -m "Add the audio pack check and the WebKit decode check page"
```

### Task A10: Generate the Wave A audio

**Files:**
- Generated and committed: `G/public/audio/*/` (`lines.json`, `manifest.json`, `overrides.json`, `*.mp3`), `G/tools/audio/ledger.jsonl`, `G/src/audio/clip-ids.ts`
- Modify only if a line fails speech-to-text twice: its text in `G/content/lines/*.json`

**Interfaces:**
- Consumes: Tasks A1 to A9, and the content banks when present (word bank, phrases, name bank, contract 2). Run Steps 1, 4, 5 and 7 to 9 again when a bank lands later in the session.
- Produces: every Wave A clip, the clip index the planner reads, at least 300 names with both clips.

All generation commands run from the repo root, outside the sandbox. They never mention the key file: the generator reads it itself.

- [ ] **Step 1: Build the packs and the ids**

Run from `games/moon-meadow-home`: `npm run audio:lines && npm run audio:ids`

- [ ] **Step 2: Dry runs**

```sh
for p in core numbers words-phase3-4 words-year1 words-phase2 phrases names-t1; do
  sh games/moon-meadow-home/tools/audio/gen.sh $p --dry-run | head -2
done
```

Expected: `core` about 53 lines need the API and about 1,400 credits, `numbers` about 293 lines and 5,300 credits, `names-t1` 94 API lines (the "?" clips of the v2 names, about 400 credits) before the bank, the rest by the banks.

- [ ] **Step 3: Runs 1 and 2, game lines and numbers**

```sh
sh games/moon-meadow-home/tools/audio/gen.sh core --max-chars 2000 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh numbers --max-chars 6500 --stt --stt-retry 2
```

Read each summary. For a game line still failing after the retries with how `miss` (not a spelling variant), reword its text in `content/lines/<scene>.json` (shorter, no rare word), run `npm run audio:lines && npm run audio:ids`, and regenerate only that id: `sh games/moon-meadow-home/tools/audio/gen.sh core --only <id> --stt --stt-retry 1`. One reword round at most; after that the line stays and is listed by `check:audio`.

- [ ] **Step 4: Runs 3 to 6, words and phrases**

```sh
sh games/moon-meadow-home/tools/audio/gen.sh words-phase3-4 --max-chars 2000 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh words-year1 --max-chars 1500 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh words-phase2 --max-chars 1200 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh phrases --max-chars 2000 --stt --stt-retry 2
```

A word still failing gets `"ok": false` and the planner will not serve it. If more than 5 percent of a word pack ends up excluded, stop and look at the transcripts before going on: a systematic fault (for example every final-d word heard as t) needs a text change in the word bank (`say`), not more seeds.

- [ ] **Step 5: Run 7, names part 1**

```sh
sh games/moon-meadow-home/tools/audio/gen.sh names-t1 --max-chars 3600 --strict-order --stt --stt-retry 2
python3 -c "import json; c = json.load(open('games/moon-meadow-home/public/audio/names-t1/manifest.json'))['clips']; print(sum(1 for k, v in c.items() if k.endswith('-x') and v.get('ok') is not False), 'names with a usable clip')"
```

Expected: at least 300 names. If fewer (because the bank is not there yet), rerun this step when it lands.

- [ ] **Step 6: Budget check**

```sh
python3 -c "import json; print(sum(json.loads(l)['credits'] for l in open('games/moon-meadow-home/tools/audio/ledger.jsonl') if l.strip()), 'credits spent of 24000')"
python3 scripts/generate-audio.py --credits
```

Expected: about 16,500 or less spent, and credits left above the floor in `budget.json`. If the ledger is more than 1,000 above the plan's estimate for runs 0 to 7, take the difference off run 12 (Wave C numbers) in its `--max-chars`.

- [ ] **Step 7: Check every pack**

Run from `games/moon-meadow-home`: `npm run check:audio`
Expected: exit 0 (no errors). Warnings list excluded learning clips and game lines with a mismatched transcript.

- [ ] **Step 8: Decode every clip in WebKit**

From the repo root (background): `python3 -m http.server 8766 --bind 127.0.0.1`. Then, outside the sandbox:

```sh
playwright-cli -s=audiocheck open http://127.0.0.1:8766/games/moon-meadow-home/flows/audio-check.html
playwright-cli -s=audiocheck eval "() => run()"
playwright-cli -s=audiocheck close
```

Expected: `missing: []` and `soundsMissing: []`, `clips` equal to the number of clips in all manifests.

- [ ] **Step 9: Commit**

```sh
git add games/moon-meadow-home/public/audio games/moon-meadow-home/tools/audio/ledger.jsonl games/moon-meadow-home/src/audio/clip-ids.ts games/moon-meadow-home/content/lines
git commit -m "Generate the Wave A clips: game lines, numbers, words, phrases and the first names"
```

**Acceptance (Wave A audio done):** `check:audio` exits 0; the WebKit check decodes every clip; at least 300 names; the ledger total is within the plan; credits left are above the floor; every learning clip has a speech-to-text verdict.

---

# Wave B: release 1.1

Starts when Wave A is complete and playable. Done when Tasks B1 to B3 are committed and `npm run check:audio` exits 0.

### Task B1: Wave B lines and numbers

**Files:**
- Modify: `G/content/lines/meadow.json`, `G/content/lines/nest.json`, `G/tools/audio/number-lines.ts`, `G/tests/audio/number-lines.test.ts`
- Create: `G/content/lines/dressing-corner.json`, `G/content/lines/post-box.json`, `G/content/lines/home-book.json`
- Generated: `G/src/audio/clip-ids.ts`, `G/public/audio/core/`, `G/public/audio/area-stable-yard/`, `G/public/audio/numbers/`

**Interfaces:**
- Consumes: Tasks A4 to A10.
- Produces: the clip ids below and number ids `num-need-<1..9>`, `num-sash-has-<0..9>`, `num-parcel-<3..9>-<brushes|bows|cups|shells>`. The notes, asking and parcel phrases come from content (contract 2): each note is a `PhraseEntry` with `marks: ['.', '?', '!']`.

**Line recipes for Wave B:**

| Moment | Call |
|---|---|
| Golden egg choice | `speak('g-two-eggs')` |
| Berry egg M04 / M13 | `speak(more ? 'g-berry-more' : 'g-berry-less', 'g-berry-stone')` / `speak('g-berry-bowls')` |
| Berry feedback | too many `speak('fb-berries-many', numId('over', k))`, too few `speak('fb-berries-few', numId('need', k))` |
| Snow egg M14 | `speak('g-snow')`, feedback as the nest (`fb-hot`, `fb-brr`) |
| Jewels | new jewel `speak('g-new-jewel')`, letter jewel tap `listenSound(code)`, number jewel tap `listen(bondId(a, b))` or `listen(numId('n', k))`, all stones lit `speak('g-hammer')`, decoration built `speak('fb-hooray', 'foal-yay')` |
| Openings | `speak('g-postbox-ready')`, `speak('lumi-dressing')`, novelty pin set `speak('lumi-new-pins')` |
| Post | `speak('g-post')`, each envelope `speak('g-envelope')`, wrong baby `speak('foal-silly')`, right baby `speak(nameClip(name, '!'), 'foal-yay')` |
| Sash | `speak(nameClip(baby, '!'), 'g-sash', numId('sash-has', pins), 'g-pin-pot')`, too many `speak('fb-too-many', numId('over', k))`, too few `speak(numId('need', k))`, full `speak(bondId(pins, added))` |
| Set pin M03 | `speak('g-fewest')` |
| Note to Lumi | `speak('g-note', phraseId(note))`, then `g-note-cards`, `g-note-crown`, `g-note-end`, the spelled word `speak('g-note-word', wordId(word))`, sent `speak('g-note-up')`, answer by mark `'lumi-note-yes'` (?), `'lumi-note-wave'` (.), `'lumi-note-sparkle'` (!), wrong mark read back `speak(phraseId(base + herMark))` |
| Parcel | `speak('g-parcel')`, after the act `speak(parcelId(n, plural))` |
| Home Book | `speak(nameClip(name, '!'), 'fb-spell-alone')` |

- [ ] **Step 1: Write the failing test**

Append to `G/tests/audio/number-lines.test.ts`:

```ts
describe('Wave B number lines', () => {
  it('has the Post Box families', () => {
    expect(text('num-need-2')).toBe('We need two more.');
    expect(text('num-sash-has-0')).toBe('It has no pins yet.');
    expect(text('num-sash-has-1')).toBe('It has one pin.');
    expect(text('num-sash-has-6')).toBe('It has six pins.');
    expect(text('num-parcel-7-brushes')).toBe('Seven brushes.');
    expect(lines.filter((l) => l.id.startsWith('num-parcel-'))).toHaveLength(28);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/number-lines.test.ts`
Expected: 1 failure, `expected undefined to be 'We need two more.'`.

- [ ] **Step 3: Add the families**

In `numberLines()`, before `return out;`:

```ts
  // Wave B
  for (const n of range(1, 9)) out.push(N(numId('need', n), `We need ${W(n)} more.`));
  for (const n of range(0, 9)) out.push(N(numId('sash-has', n), n === 0 ? 'It has no pins yet.' : n === 1 ? 'It has one pin.' : `It has ${W(n)} pins.`));
  for (const plural of ['brushes', 'bows', 'cups', 'shells']) for (const n of range(3, 9)) out.push(N(parcelId(n, plural), `${C(n)} ${plural}.`));
```

- [ ] **Step 4: Add the Wave B lines**

Append these entries to the `lines` array of `G/content/lines/meadow.json`:

```json
{"id": "g-new-jewel", "speaker": "narrator", "text": "You have a new jewel. Bring it here!"},
{"id": "g-hammer", "speaker": "narrator", "text": "Everything is ready. Tap the hammer!"},
{"id": "fb-hooray", "speaker": "narrator", "text": "Hooray!"},
{"id": "g-postbox-ready", "speaker": "narrator", "text": "The Post Box is ready to build!"},
{"id": "lumi-new-pins", "speaker": "queen", "text": "A new pin set for your babies!"}
```

Append to `G/content/lines/nest.json`:

```json
{"id": "g-two-eggs", "speaker": "narrator", "text": "Two eggs! Tap the one you like."},
{"id": "g-berry-more", "speaker": "narrator", "text": "The egg wants one more berry."},
{"id": "g-berry-less", "speaker": "narrator", "text": "The egg wants one less berry."},
{"id": "g-berry-stone", "speaker": "narrator", "text": "Find the stone with that many berries."},
{"id": "g-berry-bowls", "speaker": "narrator", "text": "Both bowls tip in. Find the stone for all the berries."},
{"id": "g-snow", "speaker": "narrator", "text": "This egg is too warm. Find the snow stone that cools it."},
{"id": "fb-berries-many", "speaker": "narrator", "text": "Too many berries!"},
{"id": "fb-berries-few", "speaker": "narrator", "text": "Not enough berries!"}
```

Create `G/content/lines/dressing-corner.json` with `{"scene": "dressing-corner", "lines": [ ... ]}` holding:

```json
{"id": "lumi-dressing", "speaker": "queen", "text": "My dressing corner is open. Dress up your babies!"}
```

Create `G/content/lines/post-box.json` with `{"scene": "post-box", "lines": [ ... ]}` holding:

```json
{"id": "g-post", "speaker": "narrator", "text": "The post is here! Give each letter to the right baby."},
{"id": "g-envelope", "speaker": "narrator", "text": "Read the name. Give the letter to that baby."},
{"id": "g-sash", "speaker": "narrator", "text": "This sash needs ten pins."},
{"id": "g-pin-pot", "speaker": "narrator", "text": "Drop a stone in the pin pot."},
{"id": "fb-too-many", "speaker": "narrator", "text": "Too many!"},
{"id": "g-fewest", "speaker": "narrator", "text": "This pin goes to the baby with the fewest pins."},
{"id": "g-note", "speaker": "narrator", "text": "Let's write a note to Queen Lumi."},
{"id": "g-note-cards", "speaker": "narrator", "text": "Put the cards in order."},
{"id": "g-note-crown", "speaker": "narrator", "text": "Start with the crown letter."},
{"id": "g-note-end", "speaker": "narrator", "text": "Pick the mark for the end."},
{"id": "g-note-word", "speaker": "narrator", "text": "Now write this word. Listen."},
{"id": "g-note-up", "speaker": "narrator", "text": "Up it goes to the moon!"},
{"id": "lumi-note-yes", "speaker": "queen", "text": "Yes, Emma! Here it comes!"},
{"id": "lumi-note-wave", "speaker": "queen", "text": "Thank you for your note!"},
{"id": "lumi-note-sparkle", "speaker": "queen", "text": "Ooh! What a happy note!"},
{"id": "g-parcel", "speaker": "narrator", "text": "Fill the parcel."}
```

Create `G/content/lines/home-book.json` with `{"scene": "home-book", "lines": [ ... ]}` holding:

```json
{"id": "fb-spell-alone", "speaker": "narrator", "text": "You can spell this name on your own now!", "also": ["naming"]}
```

- [ ] **Step 5: Run the tests and rebuild**

Run from `games/moon-meadow-home`: `npx vitest run tests/audio` then `npm run audio:lines && npm run audio:ids`
Expected: all audio tests pass (the catalogue test validates the new files), `core 108 lines`, `area-stable-yard 16 lines`, `numbers 392 lines`, and `src/audio/clip-ids.ts: 124 clip ids in 14 scene files`.

- [ ] **Step 6: Run 8**

From the repo root, outside the sandbox:

```sh
sh games/moon-meadow-home/tools/audio/gen.sh core --max-chars 800 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh area-stable-yard --max-chars 700 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh numbers --max-chars 800 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh phrases --max-chars 500 --stt --stt-retry 2
```

The phrases run makes the note, asking and parcel phrases content added for release 1.1, if any are new.

- [ ] **Step 7: Check and commit**

Run: `npm run check:audio` (exit 0), then:

```sh
git add games/moon-meadow-home/content/lines games/moon-meadow-home/tools/audio/number-lines.ts games/moon-meadow-home/tests/audio/number-lines.test.ts games/moon-meadow-home/src/audio/clip-ids.ts games/moon-meadow-home/public/audio games/moon-meadow-home/tools/audio/ledger.jsonl
git commit -m "Add the release 1.1 lines: jewels, berry and snow eggs, Dressing Corner, Post Box and notes"
```

**Acceptance:** `check:audio` exits 0, every Wave B recipe id exists in a manifest.

### Task B2: Pronunciation from gems and the IPA probe

**Files:**
- Create: `G/tools/audio/pronounce.ts`, `G/tools/audio/ipa-probe.ts`, `G/tests/audio/pronounce.test.ts`, `G/tests/audio/ipa-probe.test.ts`
- Generated: `G/tools/audio/probe/lines.json`, `manifest.json`, `*.mp3`, `G/tools/audio/pronounce-mode.json`

**Interfaces:**
- Consumes: `slug` (Task A4), `PackLine` (Task A6), the generator (Task A1).
- Produces: `IPA` table, `phonemesToIpa(codes: readonly string[]): string`, `graphemesToRespelling(graphemes: readonly string[]): string`, `PROBE_NAMES`, `probeLines(): PackLine[]`, `decide(clips): ProbeVerdict` with `ProbeVerdict = { mode: 'ipa' | 'respell'; ipaPass: number; sayPass: number; total: number }`, and `pronounce-mode.json` = `{ mode, ipaPass, sayPass, total, decided }`, read by `names:pull`.

Speech-to-text replaces Tjitse's ear check this session (lead decision). The probe compares inline IPA with plain spelling on the same 20 invented names. IPA wins when at least 15 of 20 pass and it is no more than 2 behind the spelling. The probe pack lives in `tools/audio/probe/`, so it never ships with the app.

- [ ] **Step 1: Write the failing tests**

`G/tests/audio/pronounce.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { graphemesToRespelling, phonemesToIpa } from '../../tools/audio/pronounce.ts';

describe('pronunciation from gems', () => {
  it('turns phoneme codes into IPA', () => {
    expect(phonemesToIpa(['t', 'a', 'm', 'o'])).toBe('tæmɒ');
    expect(phonemesToIpa(['l', 'i', 'l', 'ee'])).toBe('lɪliː');
    expect(phonemesToIpa(['sh', 'oa', 'n'])).toBe('ʃəʊn');
    expect(phonemesToIpa(['b', 'e', 'ck', 's'])).toBe('beks');
    expect(() => phonemesToIpa(['?'])).toThrow(/unknown phoneme/);
  });
  it('turns graphemes into the spelling Elizabeth reads', () => {
    expect(graphemesToRespelling(['T', 'a', 'm', 'o'])).toBe('Tamo');
    expect(graphemesToRespelling(['c', 'a-e', 'k'])).toBe('Cake');
    expect(graphemesToRespelling(['r', 'o-e', 's'])).toBe('Rose');
  });
});
```

`G/tests/audio/ipa-probe.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PROBE_NAMES, decide, probeLines } from '../../tools/audio/ipa-probe.ts';
import { validatePack } from '../../tools/audio/lines-lib.ts';

describe('IPA probe', () => {
  it('has 20 names, each as IPA and as spelling, all valid narrator lines', () => {
    const lines = probeLines();
    expect(PROBE_NAMES).toHaveLength(20);
    expect(lines).toHaveLength(40);
    expect(validatePack(lines)).toEqual([]);
    expect(lines[0]).toEqual({ id: 'name-probe-tamo-ipa', speaker: 'narrator', text: '/tæmɒ/!', expect: ['Tamo'] });
    expect(lines[1]).toEqual({ id: 'name-probe-tamo-say', speaker: 'narrator', text: 'Tamo!', expect: ['Tamo'] });
  });
  it('picks IPA only when it passes often enough', () => {
    const clips = (ipa: number, say: number) => Object.fromEntries(PROBE_NAMES.flatMap(({ name }, i) => [
      [`name-probe-${name.toLowerCase()}-ipa`, { stt: { match: i < ipa } }],
      [`name-probe-${name.toLowerCase()}-say`, { stt: { match: i < say } }],
    ]));
    expect(decide(clips(16, 17))).toEqual({ mode: 'ipa', ipaPass: 16, sayPass: 17, total: 20 });
    expect(decide(clips(14, 10)).mode).toBe('respell');
    expect(decide(clips(15, 18)).mode).toBe('respell');
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/audio/pronounce.test.ts tests/audio/ipa-probe.test.ts`
Expected: both files fail to load their modules.

- [ ] **Step 3: Implement**

`G/tools/audio/pronounce.ts`:

```ts
/** Phoneme codes (the phonics library keys of each sound) to IPA, for name clips built from Emma's gems. */
export const IPA: Readonly<Record<string, string>> = {
  s: 's', a: 'æ', t: 't', p: 'p', i: 'ɪ', n: 'n', m: 'm', d: 'd', g: 'ɡ', o: 'ɒ', k: 'k', e: 'e', u: 'ʌ', r: 'r',
  h: 'h', b: 'b', f: 'f', l: 'l', j: 'dʒ', v: 'v', w: 'w', x: 'ks', y: 'j', z: 'z', qu: 'kw', ch: 'tʃ', sh: 'ʃ',
  th: 'θ', ng: 'ŋ', nk: 'ŋk', ai: 'eɪ', ee: 'iː', igh: 'aɪ', oa: 'əʊ', oo: 'uː', 'oo-short': 'ʊ', ar: 'ɑː',
  or: 'ɔː', ur: 'ɜː', ow: 'aʊ', oi: 'ɔɪ', ear: 'ɪə', air: 'eə', er: 'ə', yoo: 'juː', iz: 'ɪz',
  // Spellings that share a sound with a code above (v2 gems were letters).
  c: 'k', ck: 'k', ff: 'f', ll: 'l', ss: 's', zz: 'z',
};

export function phonemesToIpa(codes: readonly string[]): string {
  return codes.map((c) => {
    const v = IPA[c];
    if (v === undefined) throw new Error(`phonemesToIpa: unknown phoneme code ${c}`);
    return v;
  }).join('');
}

/** The spelling Elizabeth reads, from gems: split digraphs put their e after the next grapheme ("c a-e k" is "Cake"). */
export function graphemesToRespelling(graphemes: readonly string[]): string {
  let out = '';
  let pendingE = false;
  for (const g of graphemes) {
    const split = /^([aeiou])-e$/.exec(g);
    if (split) { out += split[1]; pendingE = true; continue; }
    out += g;
    if (pendingE) { out += 'e'; pendingE = false; }
  }
  if (pendingE) out += 'e';
  return out.charAt(0).toUpperCase() + out.slice(1).toLowerCase();
}
```

`G/tools/audio/ipa-probe.ts`:

```ts
/**
 * The IPA probe (spec 5.6): 20 invented names, each as inline IPA and as plain spelling, checked by speech-to-text.
 *   node tools/audio/ipa-probe.ts write    writes tools/audio/probe/lines.json (not shipped with the app)
 *   node tools/audio/ipa-probe.ts decide   reads the probe manifest, writes tools/audio/pronounce-mode.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { slug } from '../../src/audio/ids.ts';
import { phonemesToIpa } from './pronounce.ts';
import type { PackLine } from './lines-lib.ts';

export const PROBE_NAMES: ReadonlyArray<{ name: string; phonemes: string[] }> = [
  { name: 'Tamo', phonemes: ['t', 'a', 'm', 'o'] }, { name: 'Lili', phonemes: ['l', 'i', 'l', 'i'] },
  { name: 'Nimbo', phonemes: ['n', 'i', 'm', 'b', 'o'] }, { name: 'Zuli', phonemes: ['z', 'u', 'l', 'i'] },
  { name: 'Kessa', phonemes: ['k', 'e', 's', 'a'] }, { name: 'Rufo', phonemes: ['r', 'u', 'f', 'o'] },
  { name: 'Jopi', phonemes: ['j', 'o', 'p', 'i'] }, { name: 'Vemma', phonemes: ['v', 'e', 'm', 'a'] },
  { name: 'Dabbi', phonemes: ['d', 'a', 'b', 'i'] }, { name: 'Sonni', phonemes: ['s', 'o', 'n', 'i'] },
  { name: 'Fipsa', phonemes: ['f', 'i', 'p', 's', 'a'] }, { name: 'Mimmo', phonemes: ['m', 'i', 'm', 'o'] },
  { name: 'Tuzzi', phonemes: ['t', 'u', 'z', 'i'] }, { name: 'Belko', phonemes: ['b', 'e', 'l', 'k', 'o'] },
  { name: 'Wenda', phonemes: ['w', 'e', 'n', 'd', 'a'] }, { name: 'Yosi', phonemes: ['y', 'o', 's', 'i'] },
  { name: 'Hanno', phonemes: ['h', 'a', 'n', 'o'] }, { name: 'Lupsa', phonemes: ['l', 'u', 'p', 's', 'a'] },
  { name: 'Gemmi', phonemes: ['g', 'e', 'm', 'i'] }, { name: 'Shoba', phonemes: ['sh', 'o', 'b', 'a'] },
];

export function probeLines(): PackLine[] {
  return PROBE_NAMES.flatMap(({ name, phonemes }) => [
    { id: `name-probe-${slug(name)}-ipa`, speaker: 'narrator' as const, text: `/${phonemesToIpa(phonemes)}/!`, expect: [name] },
    { id: `name-probe-${slug(name)}-say`, speaker: 'narrator' as const, text: `${name}!`, expect: [name] },
  ]);
}

export type ProbeVerdict = { mode: 'ipa' | 'respell'; ipaPass: number; sayPass: number; total: number };

/** IPA wins when at least 15 of 20 pass speech-to-text and it is no more than 2 behind the plain spelling. */
export function decide(clips: Record<string, { stt?: { match: boolean } }>): ProbeVerdict {
  const pass = (suffix: string): number => PROBE_NAMES.filter(({ name }) => clips[`name-probe-${slug(name)}-${suffix}`]?.stt?.match).length;
  const ipaPass = pass('ipa');
  const sayPass = pass('say');
  return { mode: ipaPass >= 15 && ipaPass >= sayPass - 2 ? 'ipa' : 'respell', ipaPass, sayPass, total: PROBE_NAMES.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const G = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const dir = join(G, 'tools/audio/probe');
  if (process.argv[2] === 'write') {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lines.json'), JSON.stringify({ pack: 'probe', lines: probeLines() }, null, 1) + '\n');
    console.log(`tools/audio/probe/lines.json: ${probeLines().length} lines`);
  } else if (process.argv[2] === 'decide') {
    const verdict = decide(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).clips);
    writeFileSync(join(G, 'tools/audio/pronounce-mode.json'), JSON.stringify({ ...verdict, decided: new Date().toISOString().slice(0, 10) }, null, 1) + '\n');
    console.log(verdict);
  } else {
    console.error('usage: node tools/audio/ipa-probe.ts write|decide');
    process.exit(2);
  }
}
```

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run tests/audio/pronounce.test.ts tests/audio/ipa-probe.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Run 9, the probe**

```sh
cd games/moon-meadow-home && node tools/audio/ipa-probe.ts write && cd ../..
sh games/moon-meadow-home/tools/audio/gen.sh games/moon-meadow-home/tools/audio/probe/lines.json --max-chars 500 --stt
cd games/moon-meadow-home && node tools/audio/ipa-probe.ts decide && cd ../..
```

`gen.sh` takes a path as well as a pack name (Task A1). No retries here: the probe measures first takes. Expected: about 330 characters, and a verdict such as `{ mode: 'respell', ipaPass: 9, sayPass: 18, total: 20 }`.

- [ ] **Step 6: Commit**

```sh
git add games/moon-meadow-home/tools/audio/pronounce.ts games/moon-meadow-home/tools/audio/ipa-probe.ts games/moon-meadow-home/tests/audio/pronounce.test.ts games/moon-meadow-home/tests/audio/ipa-probe.test.ts games/moon-meadow-home/tools/audio/probe games/moon-meadow-home/tools/audio/pronounce-mode.json games/moon-meadow-home/tools/audio/ledger.jsonl
git commit -m "Add name pronunciation from gems and decide IPA or spelling with a speech-to-text probe"
```

**Acceptance:** 4 tests pass, `pronounce-mode.json` records the verdict and both pass counts.

### Task B3: Names Emma invented (`npm run names:pull`)

**Files:**
- Create: `G/tools/names-lib.ts`, `G/tools/pull-unknown-names.ts`, `G/tests/audio/names.test.ts`
- Generated: `G/content/names/new.json`, `G/public/audio/names-new/`

**Interfaces:**
- Consumes: `phonemesToIpa`, `graphemesToRespelling`, `pronounce-mode.json` (Task B2), `NewName`, `NameEntry`, `V2Line` (Task A6), the `name.built` event and export shapes (contract 3), the v2 save shape `{ v: 2, herd: [{ name }], nameWishes: [{ name, t }] }` from `move.html`.
- Produces: `buildsFromEvents(events): Build[]`, `buildsFromV2Save(save): Build[]`, `lettersToGems(name): Gem[]`, `editDistance(a, b): number`, `toNewNames(builds, bank, known, mode): NewName[]`, `mergeNewNames(existing, incoming): NewName[]`, `fetchBuilds(base, token, fetchFn?): Promise<Build[]>` (used in Wave C), with `Gem = { g: string; p: string }` and `Build = { name: string; gems: Gem[]; firstSeen: string; count: number }`. CLI `npm run names:pull -- --file <path>` or `-- --server <base url>`. `build-lines.ts` already turns `content/names/new.json` into `names-new` (Task A6).

- [ ] **Step 1: Write the failing test**

`G/tests/audio/names.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildsFromEvents, buildsFromV2Save, editDistance, fetchBuilds, lettersToGems, mergeNewNames, toNewNames } from '../../tools/names-lib.ts';

const gems = (s: string) => s.split(' ').map((x) => ({ g: x, p: x }));
const events = [
  { type: 'name.built', t: Date.UTC(2026, 9, 13), name: 'Tamo', gems: gems('t a m o'), route: 'gold', outcome: 'unknown' },
  { type: 'name.built', t: Date.UTC(2026, 9, 12), name: 'tamo', gems: gems('t a m o'), route: 'gold', outcome: 'unknown' },
  { type: 'name.built', t: Date.UTC(2026, 9, 12), name: 'Pip', gems: gems('p i p'), route: 'gold', outcome: 'list' },
  { type: 'name.built', t: Date.UTC(2026, 9, 14), name: 'Zed', gems: gems('z e d'), route: 'gold', outcome: 'unknown' },
  { type: 'baby.named', t: 1, baby: 'b1', name: 'Tamo' },
];

describe('names pull', () => {
  it('collects unknown builds once per name, oldest first', () => {
    expect(buildsFromEvents(events).map((b) => [b.name, b.count, b.firstSeen])).toEqual([
      ['Tamo', 2, '2026-10-12T00:00:00.000Z'],
      ['Zed', 1, '2026-10-14T00:00:00.000Z'],
    ]);
  });
  it('skips known names, finds the nearest list name and builds the clip text', () => {
    const out = toNewNames(buildsFromEvents(events), [{ name: 'Tam', phonemes: ['t', 'a', 'm'] }], new Set(['zed']), 'ipa');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'Tamo', nearest: 'Tam', distance: 1, mode: 'ipa', text: '/tæmɒ/', count: 2 });
    expect(toNewNames(buildsFromEvents(events), [], new Set(), 'respell')[0].text).toBe('Tamo');
  });
  it('merges a second pull without doubling counts or changing a made clip text', () => {
    const [tamo] = toNewNames(buildsFromEvents(events), [], new Set(['zed']), 'ipa');
    const merged = mergeNewNames([{ ...tamo, count: 1, text: '/old/' }], [{ ...tamo, count: 3 }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(3);
    expect(merged[0].text).toBe('/old/');
  });
  it('measures distance in phonemes', () => {
    expect(editDistance(['l', 'i', 'l', 'ee'], ['l', 'i', 'l', 'i'])).toBe(1);
    expect(editDistance([], ['a', 'b'])).toBe(2);
  });
});

describe('v2 saves and the server', () => {
  it('reads names from a v2 save, keeping consonant digraphs as one gem', () => {
    expect(lettersToGems('Jesh').map((x) => x.g)).toEqual(['j', 'e', 'sh']);
    const b = buildsFromV2Save({ v: 2, herd: [{ name: 'sam' }, { name: 'tamo' }], nameWishes: [{ name: 'tamo', t: Date.UTC(2026, 9, 12) }, { name: 'bex', t: 5 }] });
    expect(b.map((x) => [x.name, x.count])).toEqual([['Sam', 1], ['Tamo', 2], ['Bex', 1]]);
    expect(toNewNames(b, [], new Set(['sam']), 'ipa').map((n) => n.text)).toEqual(['/tæmɒ/', '/beks/']);
  });
  it('fetches unknown names from the server with the admin token', async () => {
    const seen: Array<[string, RequestInit | undefined]> = [];
    const fake = (async (url: URL | RequestInfo, init?: RequestInit) => {
      seen.push([String(url), init]);
      return new Response(JSON.stringify({ names: [{ name: 'Zibbo', gems: gems('z i b o'), firstSeen: '2026-10-20T08:00:00.000Z', count: 2 }] }));
    }) as typeof fetch;
    const b = await fetchBuilds('http://127.0.0.1:8765/games/moon-meadow-home/', 'secret', fake);
    expect(seen[0][0]).toBe('http://127.0.0.1:8765/games/moon-meadow-home/api/admin/unknown-names');
    expect(seen[0][1]?.headers).toEqual({ Authorization: 'Bearer secret' });
    expect(b[0].name).toBe('Zibbo');
  });
  it('fails clearly when the server refuses', async () => {
    const fake = (async () => new Response('no', { status: 401 })) as typeof fetch;
    await expect(fetchBuilds('http://127.0.0.1:8765/x/', 'bad', fake)).rejects.toThrow(/401/);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/names.test.ts`
Expected: `Failed to load url ../../tools/names-lib.ts`.

- [ ] **Step 3: Implement**

`G/tools/names-lib.ts`:

```ts
import { graphemesToRespelling, phonemesToIpa } from './audio/pronounce.ts';
import type { NewName } from './audio/lines-lib.ts';

export type Gem = { g: string; p: string };
export type Build = { name: string; gems: Gem[]; firstSeen: string; count: number };
export type PronounceMode = 'ipa' | 'respell';
type LogEvent = { type: string; [k: string]: unknown };

/** Unknown gold-bell names from an event log, one entry per name (case-insensitive), oldest first. */
export function buildsFromEvents(events: readonly LogEvent[]): Build[] {
  const by = new Map<string, Build>();
  for (const e of events) {
    if (e.type !== 'name.built' || e.outcome !== 'unknown') continue;
    const name = String(e.name);
    const seen = new Date(Number(e.t)).toISOString();
    const prev = by.get(name.toLowerCase());
    if (prev) {
      prev.count++;
      if (seen < prev.firstSeen) prev.firstSeen = seen;
      continue;
    }
    by.set(name.toLowerCase(), { name, gems: e.gems as Gem[], firstSeen: seen, count: 1 });
  }
  return [...by.values()].sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
}

export function editDistance(a: readonly string[], b: readonly string[]): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Builds to name-pack entries: pronunciation from her gems, and the nearest list name for Tjitse to compare. */
export function toNewNames(builds: readonly Build[], bank: ReadonlyArray<{ name: string; phonemes: string[] }>,
  known: ReadonlySet<string>, mode: PronounceMode): NewName[] {
  const out: NewName[] = [];
  for (const b of builds) {
    if (known.has(b.name.toLowerCase())) continue;
    const graphemes = b.gems.map((x) => x.g);
    const phonemes = b.gems.map((x) => x.p);
    let nearest: string | null = null;
    let distance: number | null = null;
    for (const e of bank) {
      const dd = editDistance(phonemes, e.phonemes);
      if (distance === null || dd < distance) { distance = dd; nearest = e.name; }
    }
    const text = mode === 'ipa' ? `/${phonemesToIpa(phonemes)}/` : graphemesToRespelling(graphemes);
    out.push({ name: b.name, graphemes, phonemes, firstSeen: b.firstSeen, count: b.count, nearest, distance, mode, text });
  }
  return out;
}

/** Adds new names to the file's list. A name already there keeps its text; its count and first date are updated. */
export function mergeNewNames(existing: readonly NewName[], incoming: readonly NewName[]): NewName[] {
  const by = new Map(existing.map((n) => [n.name.toLowerCase(), { ...n }]));
  for (const n of incoming) {
    const prev = by.get(n.name.toLowerCase());
    if (!prev) { by.set(n.name.toLowerCase(), { ...n }); continue; }
    prev.count = Math.max(prev.count, n.count);
    if (n.firstSeen < prev.firstSeen) prev.firstSeen = n.firstSeen;
  }
  return [...by.values()].sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
}

const DIGRAPHS = ['sh', 'ch', 'th', 'ng', 'nk', 'ck', 'ff', 'll', 'ss', 'zz', 'qu'];

/** Letters to gems, keeping consonant digraphs together ("Jesh" is j, e, sh). Used for v2 names, whose gems were letters. */
export function lettersToGems(name: string): Gem[] {
  const s = name.toLowerCase().replace(/[^a-z]/g, '');
  const out: Gem[] = [];
  for (let i = 0; i < s.length;) {
    const two = s.slice(i, i + 2);
    const g = DIGRAPHS.includes(two) ? two : s[i];
    out.push({ g, p: g });
    i += g.length;
  }
  return out;
}

type V2Save = { v: 2; herd?: Array<{ name?: string }>; nameWishes?: Array<{ name?: string; t?: number }> };

/** Names in a v2 save (from move.html): her herd and the names she made after the v2 patch. */
export function buildsFromV2Save(save: V2Save): Build[] {
  const by = new Map<string, Build>();
  const add = (raw: string | undefined, t: number): void => {
    if (!raw) return;
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    const prev = by.get(name.toLowerCase());
    if (prev) { prev.count++; return; }
    by.set(name.toLowerCase(), { name, gems: lettersToGems(raw), firstSeen: new Date(t).toISOString(), count: 1 });
  };
  for (const b of save.herd ?? []) add(b.name, 0);
  for (const w of save.nameWishes ?? []) add(w.name, w.t ?? 0);
  return [...by.values()];
}

/** The unknown names the save server has collected (Wave C). The token is sent, never printed. */
export async function fetchBuilds(base: string, token: string, fetchFn: typeof fetch = fetch): Promise<Build[]> {
  const res = await fetchFn(new URL('api/admin/unknown-names', base), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`The server answered ${res.status} for the unknown names`);
  return ((await res.json()) as { names: Build[] }).names;
}
```

`G/tools/pull-unknown-names.ts`:

```ts
/**
 * Adds the names Emma invented to content/names/new.json, so the next generator run makes their clips.
 *   npm run names:pull -- --file <v3 save export or v2 save from move.html>
 *   npm run names:pull -- --server http://127.0.0.1:8765/games/moon-meadow-home/ [--token-file server/data/admin-token]
 * Then: npm run audio:lines, and sh games/moon-meadow-home/tools/audio/gen.sh names-new ... from the repo root.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildsFromEvents, buildsFromV2Save, fetchBuilds, mergeNewNames, toNewNames, type Build, type PronounceMode } from './names-lib.ts';
import type { NameEntry, NewName, V2Line } from './audio/lines-lib.ts';

const G = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(G, '../..');
const { values } = parseArgs({ options: { file: { type: 'string' }, server: { type: 'string' }, 'token-file': { type: 'string' } } });
const readJson = <T>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback);

async function builds(): Promise<Build[]> {
  if (values.file) {
    const save = readJson<{ format?: string; events?: Array<{ type: string }>; v?: number }>(resolve(values.file), {});
    if (save.format === 'moon-meadow-save' && Array.isArray(save.events)) return buildsFromEvents(save.events);
    if (save.v === 2) return buildsFromV2Save(save as Parameters<typeof buildsFromV2Save>[0]);
    throw new Error(`${values.file} is neither a Moon Meadow export nor a v2 save`);
  }
  if (values.server) {
    const token = readFileSync(resolve(G, values['token-file'] ?? 'server/data/admin-token'), 'utf8').trim();
    return fetchBuilds(values.server, token);
  }
  throw new Error('Pass --file <export or v2 save .json> or --server <base url>');
}

const bank = readJson<{ names: NameEntry[] }>(join(G, 'content/names/t1.json'), { names: [] }).names;
const v2 = readJson<{ lines: V2Line[] }>(join(REPO, 'ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json'), { lines: [] }).lines;
const known = new Set([...bank.map((n) => n.name.toLowerCase()), ...v2.filter((l) => l.id.startsWith('name-')).map((l) => l.id.slice(5))]);
const mode = readJson<{ mode?: PronounceMode }>(join(G, 'tools/audio/pronounce-mode.json'), {}).mode ?? 'respell';
const newPath = join(G, 'content/names/new.json');
const existing = readJson<{ names: NewName[] }>(newPath, { names: [] }).names;

const incoming = toNewNames(await builds(), bank, known, mode);
const merged = mergeNewNames(existing, incoming);
writeFileSync(newPath, JSON.stringify({ names: merged }, null, 1) + '\n');
console.log(`${incoming.length} unknown name(s), ${merged.length - existing.length} new, pronunciation by ${mode}`);
for (const n of incoming) {
  console.log(`  ${n.name.padEnd(12)} gems ${n.graphemes.join(' ').padEnd(16)} nearest ${String(n.nearest).padEnd(10)} (${n.distance})  clip "${n.text}!"`);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run tests/audio/names.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Try it on a fixture**

```sh
cd games/moon-meadow-home
printf '{"v":2,"herd":[{"name":"sam"},{"name":"tamo"}],"nameWishes":[{"name":"tamo","t":1760000000000}]}' > "$TMPDIR/v2save.json"
npm run names:pull -- --file "$TMPDIR/v2save.json"
git checkout -- content/names/new.json 2>/dev/null || rm content/names/new.json
```

Expected: `1 unknown name(s), 1 new` and a row for Tamo with its clip text. The fixture result is not committed.

- [ ] **Step 6: Run 10 with her real names, when a file exists**

If Tjitse's v2 save from `move.html` or a v3 export is on the Mac (he puts it in `$TMPDIR` or names its path; it is never committed):

```sh
cd games/moon-meadow-home && npm run names:pull -- --file <path> && npm run audio:lines && cd ../..
sh games/moon-meadow-home/tools/audio/gen.sh names-new --max-chars 500 --strict-order --stt --stt-retry 2
```

Expected: each of her invented names gets "!" and "?" clips, or `ok: false` when speech-to-text keeps failing (the app then uses the kind no-clip line). Without a file, this step is skipped and repeats in Task C2 through the server.

- [ ] **Step 7: Commit**

```sh
git add games/moon-meadow-home/tools/names-lib.ts games/moon-meadow-home/tools/pull-unknown-names.ts games/moon-meadow-home/tests/audio/names.test.ts
git commit -m "Add names:pull, which turns the names Emma invented into clip lines"
```

If Step 6 ran, commit its output separately: `git add games/moon-meadow-home/content/names/new.json games/moon-meadow-home/public/audio/names-new games/moon-meadow-home/tools/audio/ledger.jsonl && git commit -m "Make clips for the names Emma invented in v2"`.

**Acceptance:** 7 tests pass; the fixture run lists Tamo with its nearest list name; a second pull of the same file adds nothing.

# Wave C: releases 1.2 and 1.3

Starts when Wave B is complete. Done when Tasks C1 to C4 are committed, `npm run check:audio` exits 0 and the WebKit check decodes every clip.

### Task C1: Wave C lines and the numbers to one hundred

**Files:**
- Modify: `G/content/lines/meadow.json`, `G/tools/audio/number-lines.ts`, `G/tests/audio/number-lines.test.ts`
- Create: `G/content/lines/salon.json`, `G/content/lines/valley.json`, `G/content/lines/letter-lane.json`, `G/content/lines/meadow-slate.json`
- Generated: `G/src/audio/clip-ids.ts`, `G/public/audio/core/`, `G/public/audio/area-stable-yard/`, `G/public/audio/area-village-lane/`, `G/public/audio/numbers/`, `G/public/audio/phrases/`

**Interfaces:**
- Consumes: Tasks A4 to A10, B1.
- Produces: the clip ids below, `num-61` to `num-100`, `num-movein-61` to `-100`, `num-herd-61` to `-100`. Door visits stay at 1 to 20 (her range until M27). Cousin names Dot and Fen come from `names-t1` (contract: the name bank lists Dot with a rank below 300; Fen is a v2 name). Salon card lines, asking sentences and two-state wishes come from content phrases (contract 2).

**Line recipes for Wave C:**

| Moment | Call |
|---|---|
| Cousin at the Salon | `speak(nameClip(cousin, '!'), 'g-cousin', 'g-card')`, each card line after the act `speak(phraseId(line))`, beads `speak('g-beads')`, photo `speak('g-photo')`, cousin leaves `speak('foal-bye')`, free styling `speak('g-style-free')` |
| Valley map | `speak('g-valley')`, then `speak('g-map')` |
| Letter Lane | `speak('g-lane')`, grey arch `listenSound(code)` then `speak('g-nobody-yet')` |
| Titles | `speak('lumi-title-stable')`, `speak('lumi-title-meadow')`, at 75 `speak(numId('herd', 75), 'lumi-title-royal')` |
| Hundred Party | `speak('g-hundred', ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => numId('n', n)))` |
| Come along | `speak('g-come-along')` |
| Asking bubbles (R33) | `speak('g-asking')`, after the act `speak(phraseId(asks), phraseId(tells), phraseId(shouts))` |
| Two-state wish (R37) | `speak('g-two-state')`, after the act `speak(phraseId(wish))` |

- [ ] **Step 1: Write the failing test**

Append to `G/tests/audio/number-lines.test.ts`:

```ts
describe('Wave C number lines', () => {
  it('covers a herd of one hundred', () => {
    expect(text('num-100')).toBe('One hundred.');
    expect(text('num-movein-100')).toBe('Baby number one hundred.');
    expect(text('num-herd-75')).toBe('Seventy-five unicorns!');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/audio/number-lines.test.ts`
Expected: 1 failure, `expected undefined to be 'One hundred.'`.

- [ ] **Step 3: Add the families**

In `numberLines()`, before `return out;` (after the Wave B families):

```ts
  // Wave C: the herd grows past sixty
  for (const n of range(61, 100)) out.push(N(numId('n', n), `${C(n)}.`));
  for (const n of range(61, 100)) out.push(N(numId('movein', n), `Baby number ${W(n)}.`));
  for (const n of range(61, 100)) out.push(N(numId('herd', n), `${C(n)} unicorns!`));
```

- [ ] **Step 4: Add the Wave C lines**

Append to the `lines` array of `G/content/lines/meadow.json`:

```json
{"id": "lumi-title-stable", "speaker": "queen", "text": "You are my Stable Keeper now!"},
{"id": "lumi-title-meadow", "speaker": "queen", "text": "You are my Meadow Keeper now!"},
{"id": "lumi-title-royal", "speaker": "queen", "text": "You are my Royal Nest Keeper now!"},
{"id": "g-hundred", "speaker": "narrator", "text": "A hundred unicorns! Let's count the tens."},
{"id": "g-come-along", "speaker": "narrator", "text": "Tie a ribbon, and this baby comes along."}
```

Create `G/content/lines/salon.json` (`"scene": "salon"`) with:

```json
{"id": "g-cousin", "speaker": "narrator", "text": "A cousin has come to the salon!"},
{"id": "g-card", "speaker": "narrator", "text": "Read the card. Find what it says."},
{"id": "g-beads", "speaker": "narrator", "text": "Finish the bead pattern."},
{"id": "g-photo", "speaker": "narrator", "text": "Smile! Into the album."},
{"id": "g-style-free", "speaker": "narrator", "text": "Now style your own babies!"},
{"id": "foal-bye", "speaker": "foal", "text": "[giggles] Bye bye!"}
```

Create `G/content/lines/valley.json` (`"scene": "valley"`) with:

```json
{"id": "g-valley", "speaker": "narrator", "text": "This is your valley."},
{"id": "g-map", "speaker": "narrator", "text": "Tap a building to go there."}
```

Create `G/content/lines/letter-lane.json` (`"scene": "letter-lane"`) with:

```json
{"id": "g-lane", "speaker": "narrator", "text": "Tap an arch to hear its sound."},
{"id": "g-nobody-yet", "speaker": "narrator", "text": "Nobody starts with this sound yet!"}
```

Create `G/content/lines/meadow-slate.json` (`"scene": "meadow-slate"`) with:

```json
{"id": "g-asking", "speaker": "narrator", "text": "Read the bubbles. Give it to the baby who asks."},
{"id": "g-two-state", "speaker": "narrator", "text": "Read the wish. Then do it!"}
```

- [ ] **Step 5: Run the tests and rebuild**

Run: `npx vitest run tests/audio` then `npm run audio:lines && npm run audio:ids`
Expected: all pass; `core 115 lines`, `area-stable-yard 18 lines`, `area-village-lane 8 lines`, `numbers 512 lines`; `141 clip ids in 18 scene files`.

- [ ] **Step 6: Runs 11 and 12**

```sh
sh games/moon-meadow-home/tools/audio/gen.sh core --max-chars 400 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh area-stable-yard --max-chars 200 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh area-village-lane --max-chars 400 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh phrases --max-chars 500 --stt --stt-retry 2
sh games/moon-meadow-home/tools/audio/gen.sh numbers --max-chars 2500 --stt --stt-retry 2
```

The numbers run makes the bare numbers first, then the move-in and herd lines. If the ledger leaves less than 3,800 credits before this run, lower `--max-chars` so at least 1,300 credits stay for the name top-up in Task C4.

- [ ] **Step 7: Check and commit**

Run: `npm run check:audio` (exit 0), then:

```sh
git add games/moon-meadow-home/content/lines games/moon-meadow-home/tools/audio/number-lines.ts games/moon-meadow-home/tests/audio/number-lines.test.ts games/moon-meadow-home/src/audio/clip-ids.ts games/moon-meadow-home/public/audio games/moon-meadow-home/tools/audio/ledger.jsonl
git commit -m "Add the release 1.2 lines and the numbers to one hundred"
```

### Task C2: Names from the save server

**Files:**
- Generated: `G/content/names/new.json`, `G/public/audio/names-new/`

**Interfaces:**
- Consumes: `fetchBuilds` and the CLI (Task B3), the local save server and its admin token file (contract 6).
- Produces: clips for every unknown name the server holds.

- [ ] **Step 1: Pull from the local server**

With the save server running on the Mac (server workstream), from `games/moon-meadow-home`:

```sh
npm run names:pull -- --server http://127.0.0.1:8765/games/moon-meadow-home/
```

Expected: a row per unknown name with its nearest list name, or `0 unknown name(s)`. A 401 means the token file is wrong: the server workstream regenerates it. Never print the token.

- [ ] **Step 2: Generate and check**

```sh
npm run audio:lines && cd ../..
sh games/moon-meadow-home/tools/audio/gen.sh names-new --max-chars 500 --strict-order --stt --stt-retry 2
cd games/moon-meadow-home && npm run check:audio
```

- [ ] **Step 3: See the moment in the app**

On the test build, reload the app: `audio.init` fetches the name manifests fresh, so a baby whose name just got a clip plays `lumi-moon-name` after the first hatch (the naming workstream owns that moment; the recipe is in Wave A). Check with `playwright-cli` (session `names`) that `window.__game.said()` contains `lumi-moon-name` and the new `name-<slug>-x` after one heartbeat with `window.__game.fast(true)`.

- [ ] **Step 4: Commit**

```sh
git add games/moon-meadow-home/content/names/new.json games/moon-meadow-home/public/audio/names-new games/moon-meadow-home/tools/audio/ledger.jsonl
git commit -m "Make clips for the names Emma invented, pulled from the save server"
```

### Task C3: v3 packs on the listening sheet

**Files:**
- Modify: `shared/review.html`

**Interfaces:**
- Consumes: the pack folders.
- Produces: one section per v3 pack on `shared/review.html`, for Tjitse's later ear check (spec 6.3), with the speech-to-text transcript and `excluded` for `ok: false`.

- [ ] **Step 1: Add the packs**

In `shared/review.html`:

1. Below `function clipBase(dir) ...`, replace it with:

```js
  // The picture menu keeps its clips in menu-audio/. v2 games keep theirs in ideas/<dir>/audio/. v3 packs are "v3:<pack>".
  var V3_PACKS = ['core', 'numbers', 'words-phase3-4', 'words-year1', 'words-phase2', 'phrases', 'area-stable-yard',
    'area-village-lane', 'places', 'names-t1', 'names-new'];
  function clipBase(dir) {
    if (dir === 'menu') return '../menu-audio/';
    if (dir.indexOf('v3:') === 0) return '../games/moon-meadow-home/public/audio/' + dir.slice(3) + '/';
    return '../ideas/' + dir + '/audio/';
  }
```

2. In `findGames()`, change `return ['menu'].concat(found.sort());` to `return ['menu'].concat(found.sort(), V3_PACKS.map(function (p) { return 'v3:' + p; }));`.

3. In `gameSection`, where a row shows the speech-to-text result, add `if (c && c.ok === false) info.appendChild(el('div', 'flag', 'excluded: speech-to-text kept failing'));` next to the existing "lines.json changed" flag, and change the section id to `sec.id = dir.replace(':', '-');` (an id with a colon breaks the anchor links).

4. In the `add(...)` call for games, use the label `g.dir.indexOf('v3:') === 0 ? 'v3 ' + g.dir.slice(3) : g.dir.replace(/^opus-5-5-/, '')` and the anchor `g.dir.replace(':', '-')`.

- [ ] **Step 2: Check it in WebKit**

Serve the repo root (`python3 -m http.server 8766 --bind 127.0.0.1`), then outside the sandbox:

```sh
playwright-cli -s=review open http://127.0.0.1:8766/shared/review.html
playwright-cli -s=review eval "() => [...document.querySelectorAll('section')].map((s) => s.id)"
playwright-cli -s=review screenshot
playwright-cli -s=review close
```

Expected: the v2 sections as before plus `v3-core`, `v3-numbers` and the other packs. Move the screenshot to `$TMPDIR`.

- [ ] **Step 3: Commit**

```sh
git add shared/review.html
git commit -m "List the v3 audio packs on the listening sheet"
```

### Task C4: Name top-up and the final audio check

**Files:**
- Generated: `G/public/audio/names-t1/`, `G/tools/audio/ledger.jsonl`

**Interfaces:**
- Consumes: everything above.
- Produces: the most names the remaining budget allows, and the final evidence that the build stayed inside it.

- [ ] **Step 1: Measure what is left**

```sh
python3 scripts/generate-audio.py --credits
python3 -c "import json; print(sum(json.loads(l)['credits'] for l in open('games/moon-meadow-home/tools/audio/ledger.jsonl') if l.strip()), 'credits spent of 24000')"
```

`gen.sh` refuses anything past the floor and the cap, so run 13 can use a generous `--max-chars`.

- [ ] **Step 2: Run 13, the top-up**

```sh
sh games/moon-meadow-home/tools/audio/gen.sh names-t1 --max-chars 20000 --strict-order --stt --stt-retry 1
```

Expected: the run stops at the budget with `Budget reached`, and the names made are the next ones by rank, each with both clips.

- [ ] **Step 3: Final checks**

```sh
cd games/moon-meadow-home && npx vitest run tests/audio && npm run check:audio && cd ../..
python3 -m unittest discover -s scripts/tests -v
python3 scripts/generate-audio.py --credits
```

Expected: all tests pass, `check:audio` exits 0, credits left at or above the floor in `budget.json` (never below 8,000). Then the WebKit decode check of Task A10 Step 8 again: `missing: []`.

- [ ] **Step 4: Commit**

```sh
git add games/moon-meadow-home/public/audio/names-t1 games/moon-meadow-home/tools/audio/ledger.jsonl
git commit -m "Top up the name clips to the end of the audio budget"
```

**Acceptance (audio workstream done):** every line in this plan has a clip or a recorded reason (`ok: false`, budget); every flow ends with `audioMissing()` empty; the ledger total is at most 24,000 and the live credit count is at or above the floor; at least 300 names, every v2 name included.
