# Game: notes

The level script (`src/game/level.ts`), the customiser part (`wardrobe-part.ts`), the side quests (`quests.ts`), what the moments share (`moments.ts`), touch input (`input.ts`), the door moments (`doors.ts`), shared state and helpers (`game.ts`), the save (`save.ts`), the reading level (`reading.ts`), the maths band (`band.ts`), the random streams (`streams.ts`), the address options (`options.ts`), the customiser's camera (`portrait.ts`), the results log (`results.ts`), `src/main.ts`, `src/test-hook.ts` and `index.html`.

## The level, part by part

| Part | What the script does |
|---|---|
| Start | The world is paused (`world.setPaused(true)`) behind the start screen; every shader program is compiled at boot (`renderer.compile`), the toy sprite's too: a herd unicorn holds a toy meanwhile. Her saved look is applied at boot. The Play tap unpauses before the fade and counts a play in the save. The customiser's clips are preloaded first. The sweep takes 3.5 s. |
| Wardrobe | 2.2.0's customiser (`wardrobe-part.ts`). `g.free` is false, Lumi hidden, crown off, `hold(true)` and `portrait(true)` (not with `?portrait=0`). The two herd unicorns grazing near START (homes (-12, 7) and (-7, 9)) graze behind the camera at (-14, 12) and (-4, 12) until Done. The camera eases into the body portrait (900 ms) while the layer's panel slides in. Done: the look is saved with `seen.wardrobe`, a `kind=look` diag line goes out, she curtsies while the layer says "Lovely!", then `releaseFrame()`, `hold(false)`, `portrait(false)` and the herd walks home. |
| Welcome | First play: as before. From the second play (`save.plays >= 2`): "Hello, Emma!", the crown at once with a sparkle, then "An egg is waiting." |
| Eggs | Each egg from its own stream (`egg1`, `egg2`) in the current maths band, leaving out this play's sums and, while it can, the last play's totals. The nest glow goes off as soon as she reaches the nest. She stands beside the egg at its depth and turns a three-quarter face to the camera (also in the hatch and the naming). |
| Wishes | Wish 1 (nest) is the dress-up wish: "Your baby wants to dress up like you!" first, the picture worn on the baby's head for 20 s, "Pretty!". The pond wish is the bath wish. Wish 2 (wild egg) is the picnic wish, with no line first ("I'm hungry!" before a food only would give the answer away); "Yum!" after a food, "Yay!" after a dish or a mug, which stays at the baby's feet for 8 s (the bath toy stays for the swim). The play's first wish is the warm-up, one reading level lower. |
| Pond | The tap line after 12 s without a slide, once more 20 s later, the egg comes at 45 s. After the first slide, 8 s more play, then the first baby's bath wish on the nearer of two shore spots (water behind them), result part `pond`. |
| Wild egg | The camera frames the egg's landing spot, 9 m wide. |
| Free play | The afternoon (`quests.ts`): see below. |
| Bedtime | The bubbles hide. The whole stable yard counts as the stable (`inStableYard`); a door or roof tap on the way walks her to her bedtime spot. Roll call (7 to 12, two doors), the herd goes in while both newborns move in, then the visit: a newborn visits a teen door (11 to 14). The next door is asked while the last unicorn walks in; a walk-in longer than 4 s pops the unicorn into its stall. |
| Goodnight | The yawn plays out, then "Fourteen unicorns!" while the camera tilts up to the stars. The ribbons: the gift is `nextRibbon(look, owned)` on whatever hair thing she wears (`setLook({ ribbon })`), saved at once with the new colour in `ribbons`. At the end screen the save gets `last` (this play's wish and picnic targets and maths totals). The end screen gets all 14 members, and the world pauses once it covers it. |

## The customiser (`wardrobe-part.ts`, `portrait.ts`)

- `layer.wardrobe(o)` gets the saved look, the owned ribbons (`['pink', ...save.ribbons]`), `firstTime: !seen.wardrobe` and the clips `ready`, `lookTap`, `readyPlay`, `lovely` from `CLIPS`.
- `onLook(look, row)`: `princess.setLook(look)` at once (the layer delays gown and style by 150 ms itself).
- `onPicked(look, row)`: the row's reaction (`toss`, `blink`, `twirl`, `show`, `tilt`), a sparkle at `princess.point()` of the changed part in its new colour, and a save 300 ms later (a quick second pick saves once).
- `onFocus(row)`, and also `onLook` and `onPicked` for their row: eyes and hair things bring the face frame, the other rows the body frame (500 ms moves). After eyes, hair things and styles, the camera and her 25 degree side turn (hair things and styles, so a side clip or a ponytail shows) go back 2.5 s after the last touch there; `onFocus(null)` starts that wait again. Otherwise she faces the camera.
- `onTurn(dxPx, ended)`: `dxPx` is the finger's horizontal move since the last call (as the ui lane sends it). 1 degree per 2 px, at most 170 degrees from facing the camera, through `princess.turnBy(delta)` with a positive angle for a finger moving right; on the end she faces the camera again (`face()` eases back).
- `onPreviewTap()`: `wave`.
- `portraitFrame(her, row, screen)` is pure and unit tested. `screen.panelLeft` comes from `panelLeftOf(w, h)`, the panel's left edge from the ui's `wardrobeLayout`. A window resize frames again at once.

## The afternoon (`quests.ts`)

- Free play starts with the bubbles: `layer.offer('picnic', …)` over the rug (y 1.3) with v3's `words/picnic.webp`, and `layer.offer('rack', …)` over the rack (y 2.3) with `items/item-hay-bundle.webp`. While a place is off screen its bubble waits at the screen edge in its direction (the layer does this), so both bubbles always show. "When you see a bubble, someone is waiting for you." plays once per play, awaited before the basket line, so no basket or food line can cut it. Only the turn line in portrait can, so `quests.explained` is set only when it played to its end (`audio.sayWhole`); a cut one is said again once she is back in landscape and the turn line is over, unless a bubble was tapped meanwhile.
- Then as before: the basket line and the food basket (a bubble tapped during the explanation skips the line; the basket shows after the quest). If the hay rack can still be done, the three grazing herd unicorns nearest the rack walk to its eat spots; the one picked by `randFor('rack-herd')` hops and says "I'm hungry!" as an aside when it arrives.
- A quest starts on a bubble tap, a tap on its place (`WorldPick` `picnic` or `rack` in `input.ts`) or when she walks within 2.5 m of its place (`PLACES.picnic`, `PLACES.rack`). `?quest=` asks it at once.
- Free play's two minutes count only time without a quest. No quest starts after 3 minutes (the bubbles hide then); a running quest finishes. Both quests need two named babies. `skip()` ends the free-play wait.
- Quiet prompts every 30 s without a touch: slide, follow, basket, bubbles (the bubbles line only while a bubble shows).
- The picnic: her babies stop following, her other followers wait west of the rug (`PICNIC.aside`, clear of the cushions and the close-up), the herd grazing by the gazebo walks behind the camera (`herdAside(g, true, { walk: true })`). She walks to `PICNIC.stand` (at once after 12 s), the babies to the seats (placed there after 4 s, facing the camera). The frame centres the rug 0.6 m east, 5.5 m wide, head tops at 45%. `lumi4-picnic`, then a wish per guest from the stream `picnic` with intro and goal `g4-give` (no warm-up; results `picnic1`, `picnic2`, strand `r`). The reward: `lumi4-picnic-done`, stars on her head, `princess.extra('rose')`, a twirl and hearts. The rose stays until the end of the play (`snapTo` takes it off).
- The hay rack: she walks to her spot 2.2 m west of the rack (at `HAY_RACK.stand` she stood between the camera and the rack, behind the hay panel) and turns half to the camera; the sum from the stream `rack` in the current band. Frame: 0.3 m west of the rack centre (clear of the stone tray), 6 m wide, the rack's top (y 1.5) at 28% of the height. `react('munch')` (too many; `'hot'` too) makes a helper munch, `'look'` (too few; `'cold'` too) makes the helpers look, `'right'` (or `'warm'`) fills the rack (`stable.hay(1, 1200)`) and every helper and both babies munch with hearts. 3 s later the helpers graze at home again. Result `rack`, strand `m`; it moves the maths band.

## Reading level, maths band, streams and the save

- `reading.ts`: a first play starts at level 2; three `first` in a row move up, two `miss` or `helped` in a row move down; the history clears after each step. The play's first wish is a level lower. `?rl=` forces a level for every reading moment and the fold is then not stored.
- Every reading result (three wishes, two picnic guests) folds into `save.reading` and is written at once.
- `band.ts`: the first maths moment of a play is band A; `first` moves to B, `helped` to A, a miss and the doors leave it. `?maths=` fixes it. The total of a sum is `need` for a warm egg and the hay rack and `have` for a snow egg; every planned sum goes into `g.maths.used`.
- `streams.ts`: `g.randFor(label)` is `stream(seed, label)`, cached for the play (asking again continues it); a jump resets every stream. Labels: `egg1`, `egg2`, `rack`, `rack-herd`, `hatch1`, `hatch2`, `naming1`, `naming2`, `wish1`, `pond`, `wish2`, `picnic`, `rollcall`, `visit`. A jump's skipped babies use `hatch1`/`hatch2` and `naming1`/`naming2`, so they match a full play.
- `save.ts`: `createSave(() => localStorage, fresh)`; `parseSave` is pure and tolerant (junk, an empty store, a newer `v`, unknown ids, storage that throws); every access is in try/catch. Writes: on Play (`plays + 1`), 300 ms after a released pick, on Done, after each reading result, at the goodnight gift, at the end screen (`last`). Pink is always owned and never listed in `ribbons`.

## Results and the server log

- `Results.add` logs `[mmw result]` and sends `diag.txt?kind=result&…` (at most 400 characters, `diagQuery`). Wishes: `part`, `o`, `ms`, `mi`, `lv` (level), `n` (basket size), `w`, `pt` (print touched), `q` (quick), `tried` as `word:decoy`. Maths: `band`, `k`, `need`, `have`, `a`, `st` (stones), `pl` (the answer's place, from 0), `q`, `tried` as `stone:decoy`, `dc` (every decoy). `pt` and `q` are read from any `hooks.log` event whose data has `printTouched` or `quick` booleans.
- Done in the customiser sends `kind=look` with `rows` (the rows she picked in), `ms` and the six look fields.
- Those requests 404 on every server (that is the point: the request line is the record). `flows/lib.sh` `finish()` ignores their 404 console lines; any other `diag.txt` line (a failed picture or clip) still fails a flow.

## Test hook additions (`window.__game`)

- `state()` adds `look`, `wardrobe` (the layer's `snapshot().wardrobe`, or null), `readingLevel`, `mathsBand` and `quests` (`offered`, `done`, `running`, `helpers`, `rose`, `hay`, `freeMs`). Part `wardrobe` comes first.
- `spec()`: the open moment as the game planned it. Eggs and the rack: the spec without clips (`stones`, `decoys`, `band`, `skin`). Wishes: `kind`, `level`, `target`, `basket`, `decoys`. Naming: `bells`, and once chosen `{ name, gems, distractors }` with the gems in slot order.
- `setLook(partial)` (applies and saves), `setRibbons(list)` (the earned colours; the customiser reads them when it opens, so `jump('wardrobe')` after it), `save()` (reads the store again), `clearSave()`.
- 3D targets `rack` and `picnic`.

## Rules in the code

- A tap never cuts speech: a unicorn's name or "Yum!" waits its turn (`sayAside`), one at a time; further taps only show the tag and the hop.
- `setTime(g, t, ms)` sets the time of day in the world and the colour wash in the 2D layer (`layer.sky`) together.
- Results: `detail.tried` collects every wrong choice (`hooks.log('tried', { what })` from the ui moments, the door number from the door moments). A right door after the row hint (level 2) is `helped`.
- A wrong door: the unicorn inside in a nightcap ("Not me!"); a unicorn of that door still in the yard trots to its door and shakes its head ("Not me!"); an empty stall swings open and her baby giggles ("Silly!"). During a door moment a tap on a waiting unicorn makes it hop and look at its own door.
- `world.onSlow(level => actors.setDetail(level))`; the `?perf=1` box shows the pixel ratio and the quality level.
- No WebGL 2, or `createWorld` throws: `window.__mmwFallback()` from `index.html` shows a night picture with the home button. The same script shows it after 10 s when the game script never started (`main.ts` sets `window.__mmwStarted` first thing).
- Baby close-ups (naming and wishes) pass her crown to `frameAt` as `keep`, so her crown stays on screen.
- A picture shown by a baby (`showToy` in `moments.ts`) is taken away after its time only if no other picture replaced it meanwhile. A greyscale picture shows in its tint (`WishItem.tint`).
- World touches (`input.ts`) run on `press()`: a release only the window hears still taps; a cancel, a lost capture or the next touch ends the touch without a tap, and a carried unicorn lands where the finger last was. One lost release never blocks later world taps.
- During a side quest a Lumi tap replays an open moment's goal; between the quest's moments she stays quiet (the basket is hidden).
