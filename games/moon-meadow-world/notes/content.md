# Content: notes

## What is where

| Path | What it is |
|---|---|
| `src/content/index.ts` | The entry. Re-exports everything below. |
| `src/content/data.json` | Names and wish words checked against v3 and the picture check. Made by `node tools/build-content.ts`. Never edit it by hand. |
| `src/content/looks.ts` | The herd's looks (door order) and `babyLook()`. |
| `src/content/eggs.ts`, `naming.ts`, `wishes.ts`, `doors.ts`, `clips.ts`, `rand.ts` | One file per moment, the clip list and the seeded random. |
| `src/content/rack.ts` | The hay rack moment: `rackSpec()` and `allRackClipIds()`. |
| `tools/build-content.ts` | Reads v3's banks, clips, letter sounds, pictures, twins (`content/pairs.json`), `UNICORN_FOODS` and `tools/picture-check.json`. Stops with a list of problems instead of writing bad data, and when a wish kind has fewer than 6 strong targets. |
| `tools/picture-check.json` | One entry per wish word: `ok` (target or decoy), `decoy` (decoy only) or `drop` (never used), with `by` and `why`. A word without an entry is left out. |
| `tools/lines.ts` | The demo's own sentences and number patterns (`SENTENCES`, `lineFor(id)`), with no side effects, so tests can ask whether a clip that is not generated yet has a line. |
| `tools/build-lines.ts` | Writes `public/audio/v4demo/lines.json` from `allClipIds()` minus v3's ok clips. Run it when the clip list changes. |
| `tools/audio/gen.sh`, `budget.json`, `ledger.jsonl` | The demo's audio budget (cap 4,000, floor 10,000). |
| `public/audio/v4demo/` | The demo's own clips, `manifest.json`, `overrides.json`. |
| `src/ui/contrast.ts` | `diffUnits()`: which printed units of two words differ (the miss contrast). Pure. |
| `dev/content.html` | A check page: the herd, newborns, eggs, name bells with their wrong gems, the picture-check contact sheets (every wish word with its picture, verdict and reason, tap to hear), sample baskets per kind and reading level, doors, and a check of every clip, letter sound and picture through the real audio packs. |
| `tests/reading.test.ts` | Pools, the picture check, strong targets, the planner per kind and level, the guessers, the ladder's contrast step, the units diff and the naming gems. |

## Wiring

- One seed per play. Each moment draws from its own stream: `stream(seed, 'wish1')` and so on (`g.randFor()`).
- Start: `herd()` gives 12 `HerdMember`s in doors 1 to 12.
- Eggs, hatch and doors: see `eggs.ts`, `looks.ts` and `doors.ts`, and Maths below for the eggs.
- Naming 1: `namingSpec(rand, [], 3)`. Naming 2: `namingSpec(rand, [firstName], 4)`. The count can also be `{ decoys: 4 }`; the default is 3. After the moment, `newborn(choice, look, 13)` (and 14) makes the `HerdMember`.
- Wishes: `wishSpec(kind, rand, exclude, { level, contrast })`.
  - `kind`: `'dress'` (wish 1 at the nest), `'bath'` (the pond wish), `'picnic'` (wish 2 and both picnic guests). `'food'` still works: the picnic pool with only foods as targets and v3's hungry lines.
  - `exclude`: words that cannot be the target (the last play's targets, `save.last.words`, plus the targets used earlier in this play). It can also go inside the options as `{ exclude }`. When every target is excluded, the wish still comes from the whole list.
  - `level`: the hidden reading level, 1 to 3 (default 2). Level 1 gives 4 items and asks only tier 1 and 2 words. Levels 2 and 3 give 5 items. Level 3 asks only words with a twin or a frame word; with none left it plays as level 2 and `spec.level` says 2. The warm-up (the first wish of a play one level lower) is the caller's: pass the lower level.
  - `contrast: false` (`?contrast=0`) leaves out `clips.again`, and the ui then keeps v3's rule (one miss gives the focused hint at once).
- Each `WishItem` has `tier`, `tint` (a greyscale picture only) and `react`: `wear` (every dress-up word), `munch` (picnic foods), `play` (pond toys, picnic dishes). `spec.decoys` gives why each wrong item is in the basket: `twin`, `frame`, `onset`, `rhyme`, `ending`, `length` or `other`.
- Before a dress-up wish the level says `CLIPS.dressUp` ("Your baby wants to dress up like you!"). Before a picnic wish it says nothing, also before the royal picnic's first guest: `CLIPS.hungry` or Lumi's "Who is hungry?" before a food only would give the answer away. After the wish: `foal-pretty` for `wear`, `foal-yum` for `munch`, `foal-yay` for `play`.
- Free play: `foods()` (plum, corn, cake, peach; react `munch`).
- Every other line: `CLIPS` (see `src/content/clips.ts`). `wayTo(place)` gives the "this way" line for a `Place` (none for the gazebo, the rack and the picnic).
- Preloading: `allClipIds()` lists every clip the level can use. Preload `CLIPS` and the herd names at start, and each moment's own clips just before it with `eggClipIds(spec)`, `namingClipIds(spec)`, `wishClipIds(spec)` and `doorClipIds(specs)`. `wishClipIds` includes every basket word, so the contrast's word clip and `fb-letters` are ready. `allGraphemes()` lists the letter sounds for `audio.preloadSounds()`, including the capitals' sounds.

## Wish words (2.2.md 3.2) and the picture check

Claude looked at every candidate picture as a 6-year-old Dutch girl learning English would, and recorded it in `tools/picture-check.json` with `"by": "claude"`. Emma and Tjitse confirm it with the contact sheets in `dev/content.html`. To change a word, edit its entry and run `node tools/build-content.ts`.

v3 draws some word pictures greyscale and colours them at runtime (cape, coat, dress, hat, sock, bead, cup, mug). `build-content.ts` copies their `tint.default` from v3's `public/art/manifest.json` into `words[].tint`, and `WishItem.tint` carries it.

Eight design targets became decoys only:

| Word | Why |
|---|---|
| crown | "Dress up like you" with her own crown on screen points at it without reading. |
| curl | The picture is a pink ribbon curl, not hair. |
| pail | A metal bucket; children say bucket. |
| float | A swimming kickboard; a child says board. |
| reed | A bulrush; a child says plant. |
| treat | A bowl of biscuits and sweets: not one thing to point at. |
| cream | A pot of face cream, not food, and a baby would munch it. |
| pot | A flower pot; a reader may look for a cooking pot, and a Dutch "pot" is a jar. |

Three words are dropped, because the miss contrast prints and says a decoy's word and these pair a picture with an American meaning: vest (a sleeveless jumper; a British vest is an undershirt), braid (a British child says plait) and dock (a small jetty; a British dock is a harbour basin). Robe stays a target on purpose: its picture is a dressing gown, which British shops also sell as a robe, and without it dress would have 10 targets and 4 at level 3.

New look-alike groups from the picture check, next to the design's: rose and clip (pink flowers), lime and grape (green fruit balls), toast and loaf (bread), mint and treat (sweets), shark with fish and whale (blue plush sea toys). A word can be in more than one group; two words clash when one group holds both (`WordData.alike`).

What the build gives (all strong, all `ok`):

| Kind | Pictures | Targets | Level 1 | Level 3 |
|---|---|---|---|---|
| dress | 24 | ring bell shell cape cloak robe belt rose boot sock coat | ring bell shell cloak belt boot sock coat | cape robe belt rose boot |
| bath | 26 | ship shell frog seal sail soap raft pool plug shark sand rock | all but seal | ship shell seal sail soap pool |
| picnic | 32 | plum corn cake peach pie toast leek milk mint tart lime mug plate mat pan | plum corn toast leek milk mint tart mug mat pan | pie toast mint tart plate mat |

## The basket planner (`planBasket` in `wishes.ts`)

- Level 1 (4 items): one word with the same first letter, one rhyme with another first letter (or else one with the same last letter), one any.
- Levels 2 and 3 (5 items), in order: the twin, a frame word, the same first letter until 3 share it, a rhyme with another first letter, the same last letter while fewer than 2 share it, the same letter count while fewer than 2 match, then any.
- Never two look-alikes or one picture twice, only the kind's own pool, never one of the 11 bad words. The basket is shuffled.
- A pick that would take away the only word a later step needs is avoided (peach: plate would block dish, the only other word ending in h). So every 5-item basket has 3 words with the first letter, 2 with the last letter and 2 of the same length.
- Over 10,000 baskets per kind at levels 2 and 3: a first-letter guesser is right 31% to 33% of the time, a last-letter guesser 40% to 48%, and word length never decides (tests/reading.test.ts holds them to 40% and 55%). At level 1 a first-letter guesser is right about 48%.

## The naming gems (2.2.md 3.1)

- Naming 1 has 3 wrong gems: a near capital for the crowned slot, a near vowel and a near consonant. Naming 2 has 4: the capital, both near vowels and a near consonant. With a 4-letter name the tray holds 8 gems (960 design px).
- Capital pairs: P→B, B→D, D→B, M→N, N→M, T→D, K→G, G→K, C→G, F→V, V→F, J→Y. `SAME_SOUND` still blocks the name's own sound families, and a capital whose sound is in the name is never used: Bud gets P instead of D.

## The ui side (reading, in `src/ui/`)

- `wish.ts`: 4 or 5 items; the root has the classes `kind-<kind>` and `n4` or `n5` (`kind-picnic` draws the gingham hamper). A miss with `clips.again`: shake and giggle, the item flies home with a tag of its own word, Elizabeth says that word, the differing letters glow gold in the tag and the bubble, then `fb-letters`. No sounds of the wish word until the next idle. A `wear` item flies onto the baby's head. The `wish` log has `level`, `n`, `printTouched` (the word or a dot touched before any item) and `quick` (the first item touched within 1.5 s of input opening, with no print touch); `wish-miss` has `decoy`.
- The contrast tag is not a touch target. Flows find it as `layer.snapshot().moment.tags` (a list of words; an extra field on the wish snapshot) or as `.contrast-tag[data-word]` in the DOM.
- `ladder.ts`: `new HintRunner('reading', hooks, { missStep: 'contrast', items })`. The first miss runs `hooks.contrast` (level 1, not hinted), the next idle the focused hint, a second miss the ghost. A right answer after only the contrast is `miss`. `idleDelay('reading', n)` is 10 s up to 4 items and 14 s with 5. Without options the ladder is v3's, as before.
- `parts.ts`: `printEl` and `starSlider` run on `press()`, so a lost release (window pointerup or pointercancel, lost capture, the next touch) always ends them. A star slid to the end checks the build however the slide ended. `print.glowUnits(indexes)` lights units; `print.destroy()` and `slider.destroy()` remove the window listeners (the moments call them when they end).
- `naming.ts`: the slider is destroyed with the moment; the first-time gem demo drags a small-letter gem, never the wrong capital.
- `ui.css`: in the naming section the gem tray gap is 16; in the wish section the contrast tag, the gold diff glow and the picnic hamper.

## Maths (2.2.0)

Design: [docs/v4/2.2.md](../../../docs/v4/2.2.md) sections 4.1 to 4.3.

### What is where

| Path | What it is |
|---|---|
| `src/content/eggs.ts` | Bands and ranges (`RANGES`, `TRAY`), the stone table (`stoneCandidates`), every possible tray (`trayOptions`), the place plan (`placePlan`), `pickSum`, `eggSpec`, `freshCombos`, `totalOf`, `nextBand`, the clip lists. |
| `src/content/rack.ts` | `rackSpec(rand, o)` and `allRackClipIds()`. The rack is a warm sum with skin `hay`. |
| `src/ui/egg.ts` | The moment: stones, sleep and wake, ladder, speech. The cups are one skin. |
| `src/ui/skin.ts`, `src/ui/hay.ts` | The skin interface, and the hay rack skin with its own pictures (`HAY_PIC`) and the hay pile stones. |
| `src/ui/drag.ts` | `onBlocked()`: a touch while `enabled()` is false. Every window release path is unchanged. |
| `src/ui/ui.css` | The block marked "maths lane", inside the egg section. |
| `tests/maths.test.ts` | Section 8.1 for maths. The old range, floor and three-stone tests left `content.test.ts` for it. |

### Wiring

- Per play: `const used = { totals: [], answers: [] }`. After each maths moment push `totalOf(spec)` (the number above ten) and `spec.answer`. `lastTotals` is the last play's totals from the save.
- Band: `'a'` at the start of a play. After each egg or rack result, `band = nextBand(band, result.outcome)` (first goes to B, helped to A, miss stays). Door moments do not move it. `?maths=a|b` fixes it.
- Egg 1: `eggSpec('warm', g.randFor('egg1'), { first: true, band, used, lastTotals })`. Egg 2: `eggSpec('snow', g.randFor('egg2'), { first: true, band, used, lastTotals })`. Rack: `rackSpec(g.randFor('rack'), { band, used, lastTotals })`. Without options a spec is band A with nothing excluded.
- Preload with `eggClipIds(spec)`; it works for the rack too.
- The rack runs through `layer.egg(rackSpec, hooks)`. `hooks.react` gets `'right'` when the bundles land, before "The hay rack is full!" (fill the 3D rack with `stable.hay(1)` and let the herd munch), `'munch'` on too many (a foal munches the bundles that tumble off) and `'look'` on too few. The egg's reactions are unchanged: `'warm'` after the praise, `'hot'`, `'cold'`.
- `hooks.log('egg', …)` now carries `skin`, `band`, `stones`, `place` (index of the answer, 0 is the smallest stone), `decoys` and `quick` (the first stone touched within 1.5 s of the wake, `QUICK_MS` in `ui/moment.ts`). `egg-miss` carries `decoy`, the kind of the stone she tried. The spec has the same fields (`band`, `decoys`, `skin`) for the results line.
- The stones sleep while the intro and goal play. The snapshot phase is `busy` then, `open` once they are awake, so `wait_open` in `flows/lib.sh` already waits for the wake. A Lumi replay while they sleep does nothing. If the goal speech never ends, they wake after 20 s.
- Hay rack pictures: `items/item-hay-bundle.webp` and `items/item-straw-pile.webp` (v3). Every rack clip is an ok v3 clip; no new audio.

### Sums

| | Band A (4 stones) | Band B (5 stones) |
|---|---|---|
| Warm egg and hay rack | need 11 to 15, have 5 to 9, answer 4 to 8: 19 sums | need 11 to 15, have 3 to 9, answer 4 to 9: 26 sums |
| Snow egg | have 11 to 15, need 7 to 10, answer 3 to 6: 14 sums | have 11 to 16, need 7 to 10, answer 3 to 9: 21 sums |

Snow sums with need 10 (13 - 3, 14 - 4, 15 - 5, 16 - 6) end on ten instead of below it. They are in the design's counts, so they stay.

### How a tray is made

1. A fresh sum: no total or answer this play has used and none of the last play's totals. When nothing is left it lets go of the last play, then of used answers, then of everything.
2. The answer's place from that sum's row of the place plan. The plan (iterative proportional fitting, cached per kind and band) keeps every sum equally likely and makes every place the kind can show come up equally often.
3. A tray at that place, picked from every valid set of wrong stones: it always holds the heard number and one slip when they are valid. The nest mistakes weigh 5, slips 2, near ± 2 weighs 2, ± 3 weighs 1. Numbers 4 or more away fill in at weight 0.25 when a sum has too few mistakes or a place needs one more stone on a side. Trays where "the stone nearest five" is the answer weigh 0.05 of the rest.

Measured over 20,000 trays per kind and band (the test checks 10,000):

| | Places right | Best simple guess |
|---|---|---|
| Warm A | 25 / 25 / 24 / 25 % | 25 % |
| Snow A | 33 / 33 / 33 / 0 % | 34 % (smallest, middle or nearest five) |
| Warm B | 20 / 20 / 20 / 20 / 19 % | 21 % |
| Snow B | 20 / 20 / 20 / 20 / 19 % | 20 % |

A snow egg in band A can never show the answer as the biggest stone: the need she just heard (7 to 9) is always in the tray and bigger than every answer (3 to 6). The test checks evenness over the places a kind can reach.

### Clips

- `allEggClipIds()` and `allRackClipIds()` build specs of every sum in both bands with every wrong stone a tray can show, so they cannot drift from `eggSpec` and `rackSpec`. Miss distances go up to 6; `num-over`, `num-cold`, `num-still-warm` and `num-more` 1 to 6 all exist.
- Every clip exists. The six band B take-away facts (`num-take-14-7`, `15-7`, `15-8`, `16-7`, `16-8`, `16-9`) were generated in 2.2.0 from the `num-take` pattern of `lineFor()`.

## Deviations from the brief

- Warm egg facts reuse v3's `num-bond-<have>-<answer>` ("Eight and five make thirteen!"), the same text and ids v3's eggs use. A warm egg's `have` is now 3 to 9, so the demo's "ten and some more" clips are not used; `num-add-10-3` to `num-add-10-5` are still in `public/audio/v4demo/`, outside its manifest. So is `lumi4-picnic` ("A royal picnic! Who is hungry?"): nothing is said before the first picnic guest, as before every picnic wish.
- New line `g4-snow-egg` is the snow egg's intro; `h4-doors` is the focused door hint.
- 2.2.0 reading: the eight decoy-only targets and the three dropped words above, and the five extra look-alike groups.
- A frame word is any other word with the same first and last letter (robe and rose count). This matches the design's level 3 lists; "another vowel" alone would drop robe and rose.
- Strong also asks that the two words with the same first letter can share one basket (not one look-alike group).
- The planner's look-ahead (above) is new; the design's order is kept.
- `'food'` stays as a kind for the old callers.
- The reading level fold lives in `src/game/reading.ts` and is tested in `tests/reading-level.test.ts`, not in `tests/reading.test.ts`.

## Rough edges

1. `src/assets.ts` reads `location` when it is imported, so node code that imports `wordPic` (the tests, `tools/build-lines.ts`) has to stub `location` first. Computing `V3` on first use would remove that.
2. `src/audio/index.ts` uses a relative own-pack path (`audio/v4demo/`). A page under `dev/` needs `<base href="../">` (as `dev/content.html` has).
3. Optional: `MomentSnapshot` in `src/ui/moment.ts` could type the wish's `tags?: string[]`.

## Audio

- `fb-letters` and every pool word's clip are ok v3 clips. The 13 new lines of 2.2.0 are generated and 12 are used; the demo's pack has 79 clips, and `dev/content.html` reports none missing.
- The clips of sail, pail, reed, pie, leek and mat passed speech-to-text only as homophones (Sale, Pale, Read, Pi, Leak, Matt). Tjitse listens to them once.
- Booked so far: 2,276.90 credits in `tools/audio/ledger.jsonl` against the cap of 4,000.
