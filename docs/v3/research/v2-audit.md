# Unicorn Egg Nest v2: audit

For the v3 plan, 2026-10-12. Sources: `ideas/opus-5-5-unicorn-egg-nest-v2/` (README.md, index.html, audio/lines.json, audio/manifest.json), `docs/v2/design-unicorn-egg-nest.md`, `docs/v2/plan.md`, `docs/v2/decisions.md` and `shared/`. Line numbers refer to `ideas/opus-5-5-unicorn-egg-nest-v2/index.html`.

## 1. Conclusion

Keep the core loop: warm an egg, hatch, name, spell and add the baby to a visible herd. That loop is short (about 2 minutes), self-chosen and generous, and Emma ran it more than ten times in a row. Every pass was one number bond item and one spelling item. Rebuild everything around it. The single-file demo has reached its limit, and its content is very small (14 wish words, 28 bell names, 25 own names, maths M2 to M4 only).

The refused names have one root cause. Every name must be spoken by a pre-generated Elizabeth clip, so the gold bell only accepts a closed list of 25 names. Of the 48 names its fixed tray can build, 23 are refused with "I don't know that name". v3 should accept every safe name she builds and generate the clip afterwards.

Reuse the audio player, the phonics library, the generator, the tray and pantry planners, the hint ladder, the speech-order rules and the save data. Do not reuse the file structure. Treat the art as placeholder art.

Emma's herd of more than 10 babies exists only in Safari `localStorage` on the iPad, under the origin of Tjitse's Mac. Back it up before anything changes. Section 6 explains how.

## 2. What Emma liked, matched to the code

### 2.1 Hatching more than 10 eggs

What made it possible:

- **"One more egg?" in play time** (`stepPlay`, lines 2042 to 2089). A small egg sits in a nest in the meadow. A tap runs `stepEgg({ extra: true })`, then `stepName()`, then play time again (lines 2084 to 2088). There is no limit per night and no limit per session. The new night, the wish and bedtime are not needed.
- **The only cap is the herd size.** The mini egg works only while `S.herd.length < 12` (line 2091). At 12 babies the tap does nothing and gives no feedback, but the line "Or tap the little egg for one more baby" still plays. If Emma kept going, she may have hit this wall.
- **Extra eggs are plain eggs at her current maths level** (lines 1255 and 1270). They skip the speckled or golden choice, the wish and the bedtime find. The extra loop is therefore maths (bonds to 10) plus spelling, and no reading for meaning.

What made it satisfying:

- **The egg reacts to every stone.** Each dot flies into a cup with a chime. Too many gives red dots, red cheeks and steam. Too few gives frost and a shiver. Lumi names the difference ("Two too many."). A miss is a small funny event in the world, not a red cross.
- **The hatch is a big event.** Wobble, three cracks, burst, shards, confetti and a fanfare (lines 1415 to 1437).
- **A surprise baby every time.** Random body and mane colours (8 body colours, 8 mane colours, a second mane colour), plus a chance of a shiny baby. Shiny needs a first-try egg with no hint (line 1312), so doing the maths well pays off in the collection.
- **She names it herself.** Three bells say names. She drags her favourite onto the baby. She owns the result.
- **The spelling ends in a reward she can see.** The first gem flips to a crowned capital, the name tag clicks on, hearts pop out and the baby says "Yay! Thank you!" (lines 1744 to 1760, `foal-yay`).
- **The baby joins a visible herd.** It hops to the fence and stays there (`prance`, lines 1796 to 1813). Nothing is ever wiped. The herd at the fence is a trophy shelf she sees every time she comes back.
- **The loop is short.** Egg about 40 s, naming about 60 to 90 s. Short enough to want one more.

What this means for v3: the "one more" loop is the engine. Ten extra eggs gave about ten maths items and ten spelling items, more practice than the timed night itself. v3 should keep the loop, vary it (different eggs, different tasks), and replace the hard cap of 12 with somewhere for babies to go.

### 2.2 The "pins" and the other collectables

There is no separate pin collectable. "pin" appears in three places in the code:

| Where | Code | When Emma sees it |
|---|---|---|
| Wish word | `WISH[1] = pan, map, tap, pin` (line 515) | A baby asks for "pin" in its wish cloud at reading level 1. On the right give, the pin sits on the baby's nose, a pin sticker flies to the crown badge and presses onto that baby's Nest Book page (lines 1908 to 1927, 1999 to 2005). |
| Queen's gift | `GIFTS[1] = map, pan, pin` (line 518) | A full star jar opens the chest with three labelled presents. The chosen gift stays in the meadow (`renderGifts`, line 1058). |
| Pantry picture | `ART.pin`, used by `planPantry` (lines 1823 to 1832) | A pin can be a distractor in any pantry. A wrong give balances it on the baby's nose with "Pin." and "Silly!" once per wish. |

Reading starts at level 2 (`freshSave`, line 625), but one miss moves a strand down one sub-step (line 641). One missed wish or bedtime sign drops reading to level 1, where "pin" is one of only four wish words and one of three gifts. So Emma most likely spent time at reading level 1 and collected pin stickers on several babies' pages, and maybe a pin gift. Wish targets avoid stickers that baby already has (line 1818), but different babies can each get a pin.

The save on the iPad can confirm this. `S.log` keeps entries such as `{ strand: 'r', wish: 'pin' }` and `{ strand: 'gift', gift: 'pin' }`.

Full list of collectables in the demo:

| Collectable | How she gets it | Where it shows |
|---|---|---|
| Babies | Every hatch | Fence (up to 12), play time, Nest Book (one page each), goodnight (last 8) |
| Traits: shiny, speckled, golden | Shiny: first-try egg, no hint. Speckled or golden: egg choice from night 2 | Sparkles, specks or a gold mane on the baby. Egg icon and star in the book |
| Names | Bells or the gold bell, then spelling | Name tag with a crowned capital |
| Wish stickers | One right give per wish, one wish per night | The baby's book page (6 slots shown) |
| Hearts and growth | Wish +1, tucked in +1, play time +1 once per night | Baby (0 to 2), foal (3 to 5, longer legs), young unicorn (6+, glowing horn, gold frame in the book) |
| Tricks | One per growth stage: buck, spin, rainbow sneeze | Tap a baby in play time |
| Moon stars | One per first-try result, two for a first-try golden egg | Star jar, top right |
| Queen's gifts | Full jar (5 stars first, then 10) | Placed in the meadow. Only the last 5 are shown (line 1061) |
| Crown badge | First session | Top left. Opens the Nest Book |

### 2.3 The naming flow

1. The baby holds three coloured name bells and one gold bell (`renderBells`, line 1497). Each bell says one name from `BELL_NAMES` at her spelling level or lower, minus names already in the herd and the reserved cast names. No two bells in a set differ by one sound.
2. The name tree gives two more sets of bells (`shakeTree`, line 1519).
3. She drags a bell onto the baby. Elizabeth says the name and "Lovely!".
4. Spelling: one slot per sound, blue for consonants, pink for vowels. The tray holds 7 or 8 gems from `planTray` (line 1537): the target graphemes plus planned distractors. No second spelling of a target sound, no Dutch confusion pairs at levels 1 and 2, and no gem that turns the name into a blocked word.
5. She slides the star. The slider plays the sounds of what she built (`soundSlider`, line 1667). Stretchy sounds hold under her finger.
6. Right: a 2 s pause with a "?" bubble, the name, the capital flip, "You wrote your baby's name!". Wrong: "Hmm. Listen again.", the name again, wrong gems pop out and each slot hums the sound it needs. A second miss on one slot wiggles the right gem and counts as helped.
7. Gold bell (`startGold`, line 1584): three fixed slots (consonant, vowel, consonant) and a fixed tray of t m n p and a i o at every level. The build is accepted only if it is in `OWN_NAMES` and not already in the herd (line 1729).

### 2.4 Why real names get refused

The rule behind it: every name is spoken by Elizabeth from a clip made ahead of time (CLAUDE.md, VOICES.md). The game cannot say a name it has no clip for, so the demo only accepts names on a fixed list. Five things in the code turn that rule into refusals:

1. **The list is tiny.** `OWN_NAMES` is built from the gold tray (line 512): 4 x 3 x 4 = 48 builds where first and last letter differ, minus the filters below. 25 names remain: tam, tan, tim, tin, tip, tom, ton, man, mit, min, mip, mot, mon, nat, nam, nap, nim, nip, not, nom, nop, pat, pam, pit, pim. Only these 25 have a clip (`name-*` in lines.json, 56 name clips in total with the bell and cousin names).
2. **Same first and last letter is always refused** (`a !== c`, line 512). This refuses Nan, Mim, Pip, Pop, Mam, Mom, Tot, Nin, Non, Tat, Pap. Nan, Mim and Pip are real names, and Mim was a bell name in the design.
3. **Wish and pantry words are refused** (`NOT_NAMES`, line 510): pan, pin, map, mop, tap, top, pot, mat. "Mop" or "Pin" is a fine name for a unicorn.
4. **The blocklist** refuses pom (a Fluffle cast name), pon (the voice said "pawn") and nit.
5. **A name already in the herd is refused with the wrong line.** If she builds "Tam" a second time, Lumi says "I don't know that name. Try other gems!" (lines 1729 and 1737). She does know it. It is just taken.

In total 23 of 48 possible builds are refused, plus duplicates. Two more limits make it worse:

- **The gold tray never grows.** It is the same 7 gems at every level, and there is no s, so even "Sam" cannot be built. Names longer or shorter than three sounds are impossible, so no Bella, Luna, Daisy or Emma.
- **The bell pool runs dry as the herd grows (plausible, not confirmed).** `bellPool()` removes names already in the herd (line 1446). At spelling level 1 there are 12 bell names. Own names such as tam, tan, tim, nim, pim, pam and mip overlap with that list. After ten or more babies, only one or two bells may be left, which pushes Emma to the gold bell, where half her builds are refused. This matches the order of events in the feedback, but the save cannot prove it.

Refused builds are not logged. The design asked for this ("log them and add the safe ones", design risk 5), but only accepted own names are recorded (`record('own', 'logged')`, line 1731). We do not know which names she tried.

**Fix direction for v3**

- Accept every build that is decodable at her level and not on the blocklist. Never refuse a safe name.
- If no clip exists yet, the baby still gets the name and the tag. The slider sounds it out with the approved letter sounds, and Lumi says "What a lovely name!" without saying the name. The name goes into a queue. The next run of `scripts/generate-audio.py` makes the clip, so from then on the name is spoken. This keeps the "generate ahead of time" rule.
- Pre-generate a large name bank: real children's and pet names (Bella, Luna, Daisy, Coco) plus every safe CVC and CVCC build from her graphemes. A name clip costs about 5 characters, so 3,000 names cost about 15,000 credits.
- Let the number of slots vary (2 to 6) and give the gold tray her full level set.
- Block words only where they clash. "Pin" as a name is fine, unless tonight's wish is a pin.
- Duplicates get their own line: "Tam is already in your family!"
- Log every build, accepted or not, and show the names in the parent corner.

## 3. Reusable for a full game

| Part | Where | Verdict | Notes |
|---|---|---|---|
| Audio player | `shared/audio.js` (595 lines) | Reuse as is | Web Audio only, iOS unlock, silent-switch handling, preload per id list, `say` with queue and cancel, `sound`, `hold` with a loop window for stretchy sounds, synthesized `sfx`, missing clip gives silence plus a warning. Independent of any engine. Keep it even if a game engine does the rendering, because engine audio has no phoneme hold. |
| Phonics library | `shared/audio/phonics/` (49 sounds, 1 MB, takes 568 KB) | Reuse | Covers Phase 2 and 3: s to er. The method per sound is recorded in `index.json`. Ear-checked by Tjitse. |
| Clip generator and cast | `scripts/generate-audio.py`, `scripts/generate-phonics.py`, `shared/cast.json` | Reuse, extend | Hash cache, `--max-chars` budget, credit floor, speech-to-text check, narrator-only rule for `word-`, `name-`, `num-` and `sound-` ids. Needs name packs in the thousands, per-scene line files and a queue file for new names. |
| Listening sheet | `shared/review.html` | Reuse | Needed for review at a larger scale. |
| Phonics helpers | `gr`, `sounds`, `oneSoundApart`, `levelGraphemes`, `SAME_SOUND`, `DISTRACT`, `DUTCH_VOWEL` (lines 494 to 531) | Extract into a module | Pure functions. Easy to unit test. |
| Tray planner | `planTray` (lines 1537 to 1569) | Extract | Planned distractors, no second spelling of a sound, no Dutch pairs at levels 1 and 2, no blocked-word swap, no b with d before level 3. |
| Pantry planner | `planPantry` (lines 1823 to 1832) | Extract | Vowel-only pair, same onset, same ending, no confusable pictures together. |
| Cousin names | `cousinsFor` (lines 2130 to 2142) | Extract | One sound apart, fits her level, falls back to two sounds apart. |
| Staircase | `record` (lines 637 to 646) | Keep the idea, replace the rule | Three strands (maths, spelling, reading), six sub-steps each (two per level: dots, then numerals). 3 first tries up, 1 miss or helped down. Simple and transparent, but one miss is a harsh drop and the ladders stop at L3 and M4. v3 needs the planned rolling window, per-item memory (graphemes, words, bonds) and many more levels. |
| Hint ladder | `setTask`, `focusedHint`, `answerHint`, `afterMiss`, the idle loop, `stopHint` (lines 997 to 1054) | Reuse the design, port the code | Idle 15 s (10 s on reading) repeats the goal. A second idle or one miss gives a focused hint. Two misses show the answer and count as helped. Idle never goes past the focused hint. A touch always ends a hint, and the touch still works. This answered the v1 "unclear" failure. |
| Speech order rules | `act`, `listen`, `userBusy`, `sayAllRaw` (lines 596 to 616) | Reuse | An instruction never cuts off a sound Emma asked for. An action stops stale instructions. |
| Spotlight and ghost hand | `setSpot`, `ghostMove`, `ghostTap` (lines 878 to 952) | Reuse the idea | Lumi's horn beam plus a gold ring shows where to touch. The ghost hand shows a gesture once, on an object that is not the answer. |
| Egg maths model | `planStones`, `resolveEgg`, `eggFocus` (lines 1220 to 1406) | Reuse, extend | Missing piece, two stones make ten, blanket. Hot and cold feedback with the size of the error. Stones never in ten-frame layout. Extend with M1 and M5 to M8 from the design. |
| Save data | `freshSave` (line 624) | Keep the shape, add migration | See below. |
| Test hook | `window.__game` (lines 2363 to 2427) | Keep the idea | `jump(step)`, `seed(n)`, `fast()`, `answer()`, actions per touch, `state`, console `[timer]` and `[log]`. It made automated playwright checks possible. In v3 it should drive a real test suite, not only manual checks. |
| Stage and touch rules | `fit`, letterbox, locks, turn picture, `shared/home.js` | Reuse | Fixed 1180 x 820 stage, pointer events only. |

**Save format (v2):**

```
{ v: 2, night, crown, lastNightDone, nextId,
  herd: [{ id, name, c: { body, mane, mane2 }, traits: { shiny, speckled, golden },
           hearts, stickers: [word], night, playNight }],
  jar, jarGoal, gifts: [word], seen: { firstEgg, stoneDrag, bellDrag, gemDrag, slide, wishSlide, care },
  lv: { r: { step, streak }, s: { step, streak }, m: { step, streak } },
  log: [{ strand, result, night, t, ...detail }] (last 300) }
```

It is small and readable. Every baby has what v3 needs to redraw it. Weak points: `load()` accepts only `v === 2` (line 629), so a new version starts empty unless it migrates. There is no export, import or server copy. The log is cut at 300 entries. Item-level data (which bonds and which graphemes she misses) is only in the log text, not in a model.

## 4. Demo-only or weak

**Structure**

- One 161 KB file of 2,430 lines: about 27 KB CSS, 25 KB art strings, 12 KB data, 83 KB game logic and 9 KB test hook, all inline.
- Global mutable state (`S`, `G`, `E`, `N`, `W`, `B`) shared by every step. `G.busy`, `G.phase` and `G.task` are each touched 30 to 40 times.
- The night is a fixed promise chain (`runNight`, line 1130) with cancellation tokens (`FLOW`, `guard`, `until`, `fire`). It works, but adding a branch, a scene or a level means editing that chain.
- Every position is a hard-coded pixel on the 1180 x 820 stage.
- Scenes are DOM overlays on one meadow. There is no scene system, so there is no second place to go.
- No unit tests. The rules for trays, pantries and cousins are pure logic and should have them.

**Content**

| Content | Demo | Design target |
|---|---|---|
| Reading levels | L1 to L3 | L1 to L8 (plan 2.4) |
| Wish words | 14 (4, 6, 4 per level) | About 70 in the design tables |
| Gift labels | 3 per level, always the same 3, so she can learn them by heart | Many |
| Bell names | 28 | 45 for R1 to R3 |
| Own names | 25 | About 200 |
| Item pictures | 30 | One picture per word bank entry |
| Maths levels | M2, M3, M4 (bonds to 10) | M1 to M8, then teens, adding and taking away to 20 |
| Phrases, sentences, tricky words | None | From L8 |
| Music | None | Night loop, hatch sting, play loop, lullaby |

**Art**

- All art is inline SVG made from circles, ellipses and paths. One parametric `unicornSVG` draws every baby and Queen Lumi. Growth only lengthens the legs. The herd looks alike apart from colour.
- Item pictures are 100 x 100 icons. The design asked for a picture check with Emma (does she know peg, cot, hut), which was cut.
- Sparkles, hearts, snow and moons are Unicode characters (✦ ★ ♥ ❄ ☾), so they depend on the iPad font.
- Animation is CSS keyframes and Web Animations on whole elements: bob, hop, wobble, buck, spin. There are no rigged body parts, so poses, dress-up and accessories cannot be layered on.
- Fine for a demo that tests mechanics. Not good enough for a game she should love for months. The parametric idea (colours plus traits plus stage) is worth keeping in better art.

**Loading and storage**

- Every clip and every letter sound is fetched and decoded on the first tap (201 clips, 4 MB, `preloadAll`, line 1100), with a 5 s cap. A full game with thousands of name clips must load per scene.
- Saves exist only in `localStorage` for the origin the iPad opened (Tjitse's Mac on the home network). If the Mac's address or port changes, the herd seems gone. Safari can also delete storage after 7 days without a visit when the page is not on the Home Screen.

**Behaviour gaps found in the code**

- The mini egg stops at 12 babies without feedback, and the line about it keeps playing (line 2091).
- The duplicate own name gets "I don't know that name" (line 1737).
- Refused own names are not logged.
- Extra eggs are always plain, so the extra loop never gives a speckled or golden baby.
- Play time tools (brush, treats, cuddle) all do the same thing: sparkles, a giggle and at most one heart per baby per night. There is no learning in play time and no difference between the tools.
- The meadow shows only the last 5 gifts and the goodnight scene only the last 8 babies.
- The Nest Book pages one baby at a time with back and next. With 50 babies that is slow. There is no overview page.
- The parent corner was cut. Tjitse cannot see levels, accuracy or tried names without a laptop and the console.
- The bell pool can drop below three bells as the herd grows (section 2.4).

## 5. What the demo has no room for

- **Levels and a world.** There is one meadow, one night order and a night counter. No map, no places to unlock, no chapters, no goal beyond the next egg. The ladders stop at L3 and M4. After that nothing new happens.
- **A herd that keeps growing.** 12 fence spots, 12 play spots and a hard cap. The design's Castle Fields, the parade and the Royal Nest Keeper title were not built.
- **More role play.** Emma likes to role play. The demo has three care tools that do the same thing and three tricks. There is no feeding, bathing, grooming detail, dressing up, riding, decorating, stables, shows or visits. There is no story with other characters besides Lumi and the babies.
- **Learning inside role play.** In the demo the learning sits in fixed steps (egg, spelling, wish, signs). Play time has none. v3 can put reading and maths inside the role play: a feeding order she reads, berries she counts, a dress-up shop with price tags, a recipe for a treat.
- **New task types.** No phrases, sentences or tricky words. No counting on, taking away, teens, doubles or halves, although the design specifies them (berry wishes, snow stones, twin eggs, the twenty-frame).
- **A longer arc.** No calendar, no daily surprise, no long-term goals such as filling a Kinds page with every egg type.
- **Parent tools.** No parent corner, no export, no server save.

## 6. Recommendations for v3

1. **Back up the herd now.** Open the game on the iPad with Safari Web Inspector connected (Mac Safari, Develop menu) and copy the value of `localStorage['emma-unicorn-egg-nest-v2']` into a file. Keep the Mac address and port the same until v3 can import it. v3 must import this save, so her babies, names and stickers carry over.
2. **Keep the hatch and name loop as the core.** Make "one more egg" central and vary it: egg types, different maths per egg, rare finds.
3. **Fix naming first.** Accept every safe build, queue missing clips for the generator, grow the name bank, allow 2 to 6 slots, use her full grapheme set, and give duplicates their own line.
4. **Replace the cap of 12 with places.** Babies grow up and move to new areas (stables, Castle Fields, a lake). Each area brings new role play and new learning content. This also gives the levels Tjitse asked for.
5. **Move the learning into the role play.** Each care action can carry one small reading or maths task, using the same hint ladder and "no answer before action" rules.
6. **Restructure the code.** Separate modules for audio, phonics rules, planners, progression, save and scenes. Unit tests for the planners. Keep `window.__game` for playwright checks. This is needed whatever engine is chosen.
7. **Commission or generate better art** with the parametric idea kept: base unicorn plus colours, traits, growth stage and accessory layers.
8. **Build the parent corner**: levels, accuracy per skill, tried names, export and import, reset.

## 7. Open questions

- Which names did Emma try that were refused? Ask her, because the save does not record them.
- Did she reach 12 babies and find the egg stopped working?
- Are the "pins" the pin wish stickers in the Nest Book, the pin gift in the meadow, or both? The save log can show it.
- Did she enjoy the wish and the bedtime signs, or skip through them to get back to eggs? The extra loop skips both, and her verdict does not mention them.
