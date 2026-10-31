# Content: notes

## What is where

| Path | What it is |
|---|---|
| `src/content/index.ts` | The entry. Re-exports everything below. |
| `src/content/data.json` | Names and wish words checked against v3 and the picture check. Made by `node tools/build-content.ts`. Never edit it by hand. |
| `src/content/looks.ts` | The herd's looks (door order) and `babyLook()`. |
| `src/content/eggs.ts`, `naming.ts`, `wishes.ts`, `doors.ts`, `clips.ts`, `rand.ts` | One file per moment, the clip list and the seeded random. |
| `src/content/rack.ts` | The hay rack moment: `rackSpec()` and `allRackClipIds()`. |
| `src/content/phrases.ts` | The phrase wish of the Dressing Corner's gate (2.3.0): the strong rule, the planner per level, `gateKind()`, `phraseItem()`, the clip and sound lists. |
| `tools/build-content.ts` | Reads v3's banks, clips, letter sounds, pictures, twins (`content/pairs.json`), `UNICORN_FOODS` and `tools/picture-check.json`. Stops with a list of problems instead of writing bad data, and when a wish kind has fewer than 6 strong targets. |
| `tools/picture-check.json` | One entry per wish word: `ok` (target or decoy), `decoy` (decoy only) or `drop` (never used), with `by` and `why`. A word without an entry is left out. |
| `tools/phrase-check.json` | The tinted picture check (2.3.0): one entry per colour on a thing ("green sock"), `ok` or `drop`, `by` (`claude` or `emma`) and `why`. 30 entries; a pair without one is left out. |
| `tools/lines.ts` | The demo's own sentences and number patterns (`SENTENCES`, `lineFor(id)`), with no side effects, so tests can ask whether a clip that is not generated yet has a line. |
| `tools/build-lines.ts` | Writes `public/audio/v4demo/lines.json` from `allClipIds()` minus v3's ok clips. Run it when the clip list changes. |
| `tools/audio/gen.sh`, `budget.json`, `ledger.jsonl` | The demo's audio budget (cap 7,277 since 2026-10-28, floor 10,000). |
| `public/audio/v4demo/` | The demo's own clips, `manifest.json`, `overrides.json`. |
| `src/ui/contrast.ts` | `diffUnits()`: which printed units of two words differ (the miss contrast). Pure. |
| `dev/content.html` | A check page: the herd, newborns, eggs, name bells with their wrong gems, the picture-check contact sheets (every wish word with its picture, verdict and reason, tap to hear), the phrase contact sheet (30 tinted pictures with a yellow row to compare gold with, and a button that hides the words for Emma), sample baskets per kind and reading level (phrases too), doors, and a check of every clip, letter sound and picture through the real audio packs. |
| `tests/reading.test.ts` | Pools, the picture check, strong targets, the planner per kind and level, the guessers, the ladder's contrast step, the units diff and the naming gems; for the phrase wish its check entries and clip lines, the strong rule, the baskets per level, the guessers, the `?phrases=` rules over the file and the iPad's verdicts and the fallback, the two-word diff and the hint's sounds. |
| `tests/reading-level.test.ts` | The reading level fold and the phrase level beside it. |

## Wiring

- One seed per play. Each moment draws from its own stream: `stream(seed, 'wish-1')` and so on (`g.randFor()`; 2.4.0 names them by place and count, notes/game.md).
- Start: `herd()` gives 12 `HerdMember`s in doors 1 to 12.
- Eggs, hatch and doors: see `eggs.ts`, `looks.ts` and `doors.ts`, and Maths below for the eggs.
- Naming 1: `namingSpec(rand, [], 3)`. Naming 2: `namingSpec(rand, [firstName], 4)`. The count can also be `{ decoys: 4 }`; the default is 3. After the moment, `newborn(choice, look, 13)` (and 14) makes the `HerdMember`.
- Wishes: `wishSpec(kind, rand, exclude, { level, contrast })`.
  - `kind`: `'dress'`, `'bath'` (pond toys) or `'picnic'` (both picnic guests too). 2.3 gave wish 1 at the nest dress, the pond wish bath and wish 2 bath or picnic; since 2.4.0 a baby's wish takes the kind the play has read least (`wishKindFor`, notes/babies.md), so the first baby still wants to dress up like her. `'food'` still works: the picnic pool with only foods as targets and v3's hungry lines.
  - `exclude`: words that cannot be the target (the last play's targets, `save.last.words`, plus the targets used earlier in this play). It can also go inside the options as `{ exclude }`. When every target is excluded, the wish still comes from the whole list.
  - `level`: the hidden reading level, 1 to 3 (default 2). Level 1 gives 4 items and asks only tier 1 and 2 words. Levels 2 and 3 give 5 items. Level 3 asks only words with a twin or a frame word; with none left it plays as level 2 and `spec.level` says 2. The warm-up (the first wish of a play one level lower) is the caller's: pass the lower level.
  - `avoid` (2.3.2): the words of the play's earlier wish of this kind (wish 2 passes the pond wish's target and basket). None of them is the target or in the basket while others are left, and the target is one whose basket still meets 3.1 without them. Level 3 without such a target, and level 1 with every level 1 target avoided, play as level 2. Without `avoid` the draws are as before.
  - `contrast: false` (`?contrast=0`) leaves out `clips.again`, and the ui then keeps v3's rule (one miss gives the focused hint at once).
- Each `WishItem` has `tier`, `tint` (a greyscale picture only) and `react`: `wear` (every dress-up word), `munch` (picnic foods), `play` (pond toys, picnic dishes). `spec.decoys` gives why each wrong item is in the basket: `twin`, `frame`, `onset`, `rhyme`, `ending`, `length` or `other`.
- Before a dress-up wish the level says `CLIPS.dressUp` ("Your baby wants to dress up like you!"). Before a picnic wish it says nothing, also before the royal picnic's first guest: `CLIPS.hungry` or Lumi's "Who is hungry?" before a food only would give the answer away. After the wish: `foal-pretty` for `wear`, `foal-yum` for `munch`, `foal-yay` for `play`.
- The food basket in the hub (free play's until 2.3): `foods()` (plum, corn, cake, peach; react `munch`).
- Every other line: `CLIPS` (see `src/content/clips.ts`). `wayTo(place)` gives the "this way" line for a `Place` (none for the gazebo, the rack and the picnic).
- The phrase wish (2.3.0): `planWish(g, 'phrase', 'gate1', { wish: false })` in `game/moments.ts`. See "Phrases" below.
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
- `ladder.ts`: `new HintRunner('reading', hooks, { missStep: 'contrast', items })`. The first miss runs `hooks.contrast` (level 1, not hinted), the next idle the focused hint, a second miss the ghost. A right answer after only the contrast is `miss`. `idleDelay('reading', n)` is 10 s up to 4 items and 14 s with 5. The wish's first idle step, the reminder, waits `remindDelay(kind)` instead (2.3.2, `firstIdleMs`): 20 s for a word, 25 s for a phrase, from when the basket can be touched and again from each touch. Without options the ladder is v3's, as before.
- `parts.ts`: `printEl` and `starSlider` run on `press()`, so a lost release (window pointerup or pointercancel, lost capture, the next touch) always ends them. A star slid to the end checks the build however the slide ended. `print.glowUnits(indexes)` lights units; `print.destroy()` and `slider.destroy()` remove the window listeners (the moments call them when they end).
- `naming.ts`: the slider is destroyed with the moment; the first-time gem demo drags a small-letter gem, never the wrong capital.
- `ui.css`: in the naming section the gem tray gap is 16; in the wish section the contrast tag, the gold diff glow and the picnic hamper.

## Phrases (2.3.0, docs/v4/2.3.md sections 6 and 18)

### Content

- `build-content.ts` checks the six colours (green, gold, blue, brown as targets; red, pink as decoys only), the five things (bag, bead, bow, sock, shirt) and "the" against v3: one syllable, at most five letters, letter sounds, an ok clip for the things and `word-the`, a greyscale picture with a tint for the things, a picture tint in `PALETTE` for the colours, and a line in `tools/lines.ts` for all 30 phrase clips. Gold and brown are not in v3's packs; their graphemes are in the script (`o.oa`: the o of gold says oa). Bow is v3's `ow.oa`. data.json gets `phraseThe`, `phraseColours`, `phraseThings` (with `sounds` where the sound differs from the print) and `phrasePairs` (every ok pair and who checked it).
- The build prints the strong count for every ok pair (what the game plays on a device without crosses) and for Emma's pairs only (`?phrases=emma`), and warns when the first is below 6. Now: 30 ok pairs, all by Claude; 20 strong in the game, 0 with `?phrases=emma`.
- Picture tints come from `PALETTE[colour].pic` at runtime, so the integrator's shade tuning reaches the pictures. If a `pic` value changes, Emma's check of that colour should be done again.

### The strong rule (`strongPhrases`)

A phrase is strong when its colour is a target colour with a sibling, its thing has a partner, it passed the check, it has a level 1 grid and a level 2 grid whose four items are all strong themselves, and red or pink passed the check on both of that level 2 grid's things. The script removes phrases until every one left keeps its grids (the largest such set), so every grid item of every basket can be the wish. Strong phrases come in grids of 2 colours by 2 things, so a count between 1 and 7 cannot happen: the gate needs at least 8 in practice.

### Baskets (`phraseSpec`)

| Level | Basket | Both first letters | Colour word only | Thing word only |
|---|---|---|---|---|
| 1 | {colour, a target colour of another letter} x {thing, partner}: 4 | 50% | 50% | 50% |
| 2 | {colour, sibling} x {thing, partner} + red or pink on one of the two things at random: 5 | 25% | 50% | 42% |
| 3 | the level 2 grid + a third b-thing in one of the two colours: 5 (sock and shirt play and log 2) | 22% | 45% | 47% |

Measured over 10,000 baskets per level with `?phrases=all`; the tests hold them to 55% (level 1) and 40% (levels 2 and 3) for both first letters, and 55% for one word only. The thing shown most often gives nothing away: red or pink goes on the wish's thing half the time. A guesser that reads the colour and takes the most common thing gets 50% at every level, one that reads both first letters and counts 25% at levels 2 and 3, and one that reads nothing, leaves out red and pink and counts 25%; the tests hold these to the same bounds (30% for the last). With red or pink always on the wish's thing these were 100%, 50% and 50% at level 2. Decoy kinds for the log: level 1's other-colour items `other` and the partner thing `onset`; levels 2 and 3 grid items `onset`, red or pink `other`, the third thing `onset`.

### The game (`game/moments.ts`, `game/reading.ts`)

- `planWish(g, 'phrase', label, { wish: false })` plans at the phrase level (`save.phrases`; `?rl=` forces it), with the rule of `?phrases=` from the options (`phraseRule`). While `gateKind(g)` is `'word'` it plans a 2.2 dress-up word wish at the word level instead. Its intro is "Your baby wants to dress up like you!" (what the level says before the nest's dress-up wish), then the usual "Your baby has a wish!" and the goal. The caller runs either one the same way, so the Corner says nothing of its own before it. `tests/reading-level.test.ts` checks both cases and the levels they move on a fake game.
- `noteReading(g, outcome, kind)` (the kind has no default) folds a phrase result into `save.phrases` and every word result into `save.reading` (`foldReadingFor`). The gate's word wishes move the word level.
- `wishExtraClipIds(spec)` adds `theClip()` (`word-the`, from data.json) for a phrase; `runWish` preloads it while the camera frames, a cache hit when the caller preloaded it. `ui/wish.ts` keeps its own `THE_CLIP`, because the 2D layer reads no content; a test holds the two equal. `build-content.ts` warns by `MIN_PHRASES` from phrases.ts.

### The ui side

- `parts.ts` `phrasePrintEl(parts)`: "the green sock" on one line at the word print size, a word gap, every word in the print ink. "the" has no dots; a touch on it says `word-the`, once per touch. The colour and the thing play their letter sounds (`sounds` where given).
- `wish.ts`: the miss tag has two lines, the colour over the thing (Andika 30, no "the"); the picture shrinks above it. The contrast lights per word what differs (`diffPhrase` in `contrast.ts`): the colour against the wish's colour, the thing against its thing; "the" never lights. The differing letters keep the print ink and glow lilac, the print's own mark colour (the digraph bar), in the bubble and the tag: the word print's amber and gold glow could point her at the gold or brown picture. Elizabeth says the wrong item's phrase, then `fb-letters`. The focused hint: `h-sounds`, the colour's sounds, 400 ms more than the usual gap, the thing's sounds. After a right pick: `fb-yes` and the phrase.
- `geometry.ts` `phraseUnits(parts)`: the printed units per word, each saying its sound. Checked by `tests/ui.test.ts`, which also checks that ui.css gives the print and the tag no colour of their own and the phrase glow no amber or gold. `tests/reading.test.ts` renders every phrase print on a small fake page and checks that no element gets an inline style or a class that names a colour.
- `dev/ui.html` has `wish phrase 1`, `2` and `3`.

### Which pairs play (`?phrases=`, `checkedPairs` in `phrase-device.ts`)

| Rule | Pairs | Fresh device |
|---|---|---|
| default (no `?phrases=`) | every ok pair of `tools/phrase-check.json`, Claude's checks too, minus each pair crossed on `check.html` on this device | 20 strong: phrase wishes |
| `?phrases=emma` | 2.3.0's rule: pairs with `"by": "emma"` or a tick on this device, minus the crosses | 0 strong: word wishes |
| `?phrases=all` | every ok pair; the device's verdicts do not count (flows, dev) | 20 strong |

So the Corner reads phrases from her first play, behind two phrase reads (decision 1). A cross turns a pair off at once, with no rebuild. With fewer than 6 strong phrases the gate plays two dress-up word wishes.

### Emma's picture check

On her iPad: open `check.html` next to the game (`dist/check.html` on Emma's server), ask her what each picture is, and tap the tick or the cross. A cross turns the pair off at once on that iPad and address (`mmw.phrasecheck1`), with no rebuild; a tick records her check (it counts for `?phrases=emma`). The page says how many phrases are on now. To keep a verdict in the code as well, use the file:

1. Open `dev/content.html` and scroll to "Phrase pictures". "Hide the words" hides every word (cards, badges, rows, column heads and tooltips) and makes taps silent, so she names each picture without reading or hearing it. Ask what each one is and what colour it is; gold against yellow above all (the dashed yellow row is only there to compare).
2. For each pair she names right, set `"by": "emma"` in `tools/phrase-check.json`; for one she does not know, `"verdict": "drop"` (keep `by` as who decided).
3. Run `node tools/build-content.ts` and check the strong counts. At 6 or more (`MIN_PHRASES`) the gate plays phrases; for `?phrases=emma` that needs her pairs.

### Claude's calls

- The strong rule asks for both grids and the decoy, and removes until stable (above). A looser rule would let a grid item be a phrase that is never the wish.
- A tap on "the" says the word whole; v3 marks it a tricky word (`heart`), and saying it gives nothing away.
- The gate's word wishes say "Your baby wants to dress up like you!" first in their intro and move the word level, as every word read does.
- Level 2's red or pink goes on either grid thing at random, and a phrase is strong only when both things have it. On the wish's thing every time, the thing shown three times was always the wish's thing.
- Level 3's third thing takes either grid colour at random, so the colour that shows three times never points at the wish.
- Gold is a deep mustard as a flat tint. It is `ok` by Claude with that note, and it plays from her first play; a cross on her check turns it off.

## Maths (2.2.0)

Design: [docs/v4/2.2.md](../../../docs/v4/2.2.md) sections 4.1 to 4.3. Since 29 October 2026 every sum stays within 10 ([docs/v4/2.3.md](../../../docs/v4/2.3.md) section 19.1, and notes/maths.md); the figures below are the one-sum moment's after that change.

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
| Hay rack (warm) | need 7 to 9, have 3 to 6, answer 3 to 6: 9 sums | need 8 to 10, have 3 to 7, answer 3 to 7: 12 sums |
| Snow (the ui harness only) | have 7 to 9, need 3 to 6, answer 3 to 5: 8 sums | have 10, need 3 to 7, answer 3 to 7: 5 sums |

The eggs ask three graded sums each (`eggSums`, notes/maths.md). 2.2.0's ranges went to 15 and 16.

### How a tray is made

1. A fresh sum: none with the total and the answer of a sum this play asked (either way round). When nothing is left, every sum is. The last play's totals are not used: every play asks 9 and 10.
2. The answer's place from that sum's row of the place plan. The plan (iterative proportional fitting, cached per kind and band) keeps every sum equally likely and makes every place the kind can show come up equally often.
3. A tray at that place, picked from every valid set of wrong stones of 2 to 9: it always holds the heard number and one slip when they are valid. The nest mistakes weigh 8 (5 in 2.2.0), slips 2, near ± 2 weighs 2, ± 3 weighs 1. Numbers 4 or more away fill in at weight 0.25 when a sum has too few mistakes or a place needs one more stone on a side. Trays where "the stone nearest five" is the answer weigh 0.05 of the rest.

Measured over 10,000 trays per kind and band, as the test checks:

| | Places right | Best simple guess |
|---|---|---|
| Warm A | 25 / 25 / 24 / 26 % | 26 % (nearest five) |
| Snow A | 26 / 26 / 24 / 25 % | 31 % (nearest five) |
| Warm B | 20 / 21 / 20 / 19 / 21 % | 27 % (nearest five) |
| Snow B | 20 / 20 / 21 / 19 / 20 % | 23 % (nearest five) |

Within 10 every kind and band reaches every place. The test checks evenness over the places a kind can reach.

### Clips

- `allEggClipIds()` and `allRackClipIds()` build specs of every sum in both bands with every wrong stone a tray can show, so they cannot drift from `eggSpec` and `rackSpec`. Within 10 a stone is at most 6 too many and 5 too few; `num-over`, `num-cold`, `num-still-warm` and `num-more` 1 to 6 all exist.
- Every clip exists. The six band B take-away facts (`num-take-14-7`, `15-7`, `15-8`, `16-7`, `16-8`, `16-9`) were generated in 2.2.0 from the `num-take` pattern of `lineFor()`. Since the sums stay within 10 they are a reserve in lines.json (`PAST_TEN` in tools/build-lines.ts).

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

0. 2.3.0: the dev server in a lane worktree cannot serve the Andika font, because `node_modules` is a link to the main tree outside `server.fs.allow` (403). Dev pages then show a fallback font; the build is not affected.

1. `src/assets.ts` reads `location` when it is imported, so node code that imports `wordPic` (the tests, `tools/build-lines.ts`) has to stub `location` first. Computing `V3` on first use would remove that.
2. `src/audio/index.ts` uses a relative own-pack path (`audio/v4demo/`). A page under `dev/` needs `<base href="../">` (as `dev/content.html` has).
3. Optional: `MomentSnapshot` in `src/ui/moment.ts` could type the wish's `tags?: string[]`.

## Audio

- `fb-letters` and every pool word's clip are ok v3 clips. The 13 new lines of 2.2.0 are generated and 12 are used; the demo's pack has 79 clips, and `dev/content.html` reports none missing.
- The clips of sail, pail, reed, pie, leek and mat passed speech-to-text only as homophones (Sale, Pale, Read, Pi, Leak, Matt). Tjitse listens to them once.
- 2.3.0 added 72 lines (docs/v4/2.3.md section 21), all passing speech-to-text after two retakes. The sums within 10 added four more (section 19.1), and 2.3.1 added num-take-9-6 after Tjitse accepted its take, so the pack had 156 clips. num-take-9-6 came from the raw cache without a speech-to-text check.
- 2.4.0 added 51 lines (docs/v4/2.4.md section 6) in one run on 30 October 2026: 1,462 characters and 51 speech-to-text checks, all passed on the first take, 1,479.34 credits (`budget.json` runs `v2.4.0`). The pack has 207 clips. The 13 sign words use v3's clips, and num-take-9-6 still has no speech-to-text record.
- Booked so far: 6,788.78 credits in `tools/audio/ledger.jsonl` (speech and sound effects, `ledgerAfter2.4.0`) against the cap of 7,277: 488.22 left.

## Sign words (2.4.0, docs/v4/2.4.md section 5.5)

- 13 place words in four first-sound groups (`SIGN_LIST` in `tools/build-content.ts`): s sand, stump, swing, stone; sh shed, ship, shell; b barn, bench, beach; p pond, pool, pines. Each comes from v3's word packs (tier by pack) and is checked as a wish word is. Pines is in v3 only as pine's plural: it takes pine's picture, its own clip `word-pines` (words-year1) and the graphemes p, i-e, n, s.z, so `gpcs` print p, i-e, n, s and `sounds` say p, i-e, n, z.
- Each needs its own picture check entry `sign:<word>` in `tools/picture-check.json` ('ok' or 'drop'): sand, ship, shell and pool are wish words too, and the two never drop each other. Claude's 13 entries are in; Emma's check is on `check.html` (the "Sign words" section: pictures and words, no buttons, no sound). A crossed word becomes `drop`, then `node tools/build-content.ts`: it leaves `DATA.signWords`, the trip planner and `allSignClipIds()`, and a group left with two words plays at levels 1 and 2 only.
- `DATA.signWords` is `SignItem[]` with the picture as a URL (data.ts maps the name with `wordPic`).

## The trip planner (`planTrip` in `content/signs.ts`)

- Levels (5.5): level 1 one s or sh word, one b and one p word (24 sets with the tier 1 and 2 words); level 2 a pair of one group and an odd word with another first letter (40 sets; an s pair never takes an sh word, nor the other way, as both start with s); level 3 one group, a pair sharing its first two letters and an odd word (st, be, po: 4 sets; sh never). Levels 1 and 2 use tier 1 and 2 words while a trip fits.
- The target is any of the three cards, evenly, so the odd word is the target one time in three. Measured over 10,000 seeds at sign 1 and sign 2: a first-letter reader wins level 1 always and level 2 two in three, a first-two-letters reader level 3 two in three, a first-sound reader level 3 one in three, a pair-tapper at most one in three.
- A trip takes two sets that share no word: both fresh this play if any pair is, and on trip 1 a pair that leaves two fresh sets for trip 2 (so two level 3 trips take one s set each and use all four). No target twice a play while a card of the set is fresh. A level with no two such sets plays one level lower (a level 3 trip with a word crossed plays and logs at 2). The cards' arm order is shuffled per sign.
- `SignUse.sets` holds `setKey(words)`: the words sorted and joined with commas. The ride (mount lane) adds each trip's two sets and targets to `g.signUse`.
- Clips: intro `g4-signs` on sign 1, goal `g4-go-<mount>-<word>`, right the word and `fb-yes`, hint `h-sounds` (the ui plays the letter sounds, `hintSounds`), again `fb-letters`.

## The signpost moment (`ui/sign.ts`)

- Three print cards (Andika, the print ink, no picture, 83 CSS px high at 1080 x 740) on the arms' ends (`hooks.cardAt`), laid out by `geometry.ts signCardBoxes`: 100 CSS px off the left, right and bottom edges where a palm rests, below Lumi and the home button, off the food basket (it sits above the moments layer; a card in that corner moves up), never touching. Each acts on pointerdown and refuses the press, so a palm on the screen never answers and never blocks a card.
- They wake when the goal ends. Right: the card glows, the word and "Yes!", then `hooks.road(i, true)`. Wrong: `hooks.road(i, false)` while Elizabeth says the tapped word, its letters that differ from the goal word glow, then "Look at the letters again." while the mount steps back; the cards wake after both, and the letters glow until then. A second miss: the ghost taps once the mount is back. A Lumi tap says the goal again only while the cards take taps (not before they first wake, not while a card plays out, not once answered). The ladder runs on its own 20 s timer: the goal again, then "Listen to the sounds." with the goal word's letter sounds (pines ends in z), then the ghost taps the right card (helped); two misses bring the ghost too. `layer.idleNow()` past the focused hint is the ghost.

