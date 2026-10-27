# Moon Meadow World (v4 demo)

One playable level of v4 in 3D: "Emma's first day in Moon Meadow" ([docs/v4/demo.md](../../docs/v4/demo.md), with the 2.2.0 changes in [docs/v4/2.2.md](../../docs/v4/2.2.md)). After Play, Emma dresses Princess Emma: five rows of pictures (hair colour, eyes, what she wears, hair style, hair things) next to a close-up of her in 3D, and the big pink play button when she is ready. Then Princess Emma walks the meadow, warms two eggs (adding under a blanket, then taking away, both across ten, with 4 or 5 stones of 3 to 9 that wake when Elizabeth has said both numbers), names the two babies with letter gems, reads three wishes (the first baby wants to dress up like her, a bath toy at the pond, a picnic treat for the second baby), plays at the pond with the slide, and in the afternoon may take two side quests: a royal picnic at Lumi's gazebo (two more wishes and a rose for her hair) and a hungry herd at the hay rack (a third sum, dragged as hay piles onto the rack). She puts 14 unicorns to bed by reading the door numbers (7 to 12 at the roll call, a teen door 11 to 14 at the visit). The end screen shows the whole herd in their own colours, with her two babies and their names on top. It takes about 14 to 16 minutes (up to 18 with both quests) and ends with a new ribbon colour and goodnight.

Her look, her ribbon colours, a hidden reading level and the last play's words and sums are saved in the browser (`localStorage`, key `mmw.save`). On the next play she taps Play, sees her saved look in the customiser and taps the play button once; Lumi's welcome is shorter. Each address (Emma's server, a test server, another host name) has its own save, and Safari may clear it after 7 days without a visit: she then starts fresh with the default look and the middle reading level.

The demo is throwaway. It shows Tjitse how v4 plays, whether Emma likes it, and how the iPad Air 2 copes with 14 code-built unicorns, the pond and the slide. Vite 8, TypeScript 6 and three.js 0.186.1, built for Safari 15. Speech is pre-generated ElevenLabs audio: v3's clips and pictures from `games/moon-meadow-home/`, and the demo's own 70 lines in `public/audio/v4demo/`.

## Play it on Emma's iPad

Build once after every change (the build is not in git), then open the address on the iPad:

```sh
cd games/moon-meadow-world && npm run build
```

http://<LocalHostName>.local:8765/games/moon-meadow-world/dist/

`scutil --get LocalHostName` gives the name. Emma's server (`games/moon-meadow-home/tools/go-live.sh`) serves the whole repo, so nothing else is needed. The demo takes v3's clips from Emma's promoted v3 build.

Listen to the new clips before Emma plays (in `public/audio/v4demo/`): the 13 lines of 2.2.0 (docs/v4/2.2.md section 6, among them `g4-ready`, `g4-dress-up`, `lumi4-picnic`, `lumi4-picnic-done` and `word-heart`), and the demo's earlier `lumi4-another-egg`, `lumi4-ribbons` and `g4-snow-egg`.

## Address options

- `?perf=1` shows frames per second, draw calls, triangles, geometries, textures, unicorn detail, the pixel ratio (`pr`) and the quality level (`q0` full, `q1` lower pixel ratio, `q2` cheaper herd too) in a small box at the top. Use it on the Air 2, with Low Power Mode off (it caps Safari at 30 frames per second).
- `?pr=<n>` caps the pixel ratio (default 1.5; `?pr=1` draws a quarter fewer pixels on the Air 2).
- `?aa=0` turns antialiasing off.
- `?at=<part>` starts at a part after the Play button, without the opening sweep: `wardrobe` (the customiser), `welcome`, `egg1`, `naming1`, `wish1`, `pond`, `egg2`, `naming2`, `wish2`, `free`, `bedtime`, `goodnight`. Any part after `wardrobe` skips the customiser and uses her saved look. Skipped babies get the first name of their bells.
- `?seed=<n>` plays the same level every time (same eggs, names, words and doors). Each moment has its own random stream, so `?at=egg2&seed=5` asks the same egg as a whole play with seed 5 (when the maths band is the same).
- `?fresh=1` keeps the save in memory only: every load is a first visit with the default look, and nothing Emma has saved is read or changed. The flows use it.
- `?rl=1`, `?rl=2` or `?rl=3` plays every wish at that reading level (4 items at level 1, 5 at levels 2 and 3), without the warm-up, and does not store the level.
- `?maths=a` or `?maths=b` fixes the maths band (4 stones and the narrower sums, or 5 stones and the wider ones).
- `?contrast=0` brings back v3's rule for a wrong wish item: the sounds of the word at once, instead of the wrong item's word with the letters that differ.
- `?at=free&quest=picnic` or `?at=free&quest=rack` starts that side quest as free play begins.
- `?portrait=0` keeps her normal detail in the customiser's close-up (compare the frame rate with `?perf=1`).

Without `?pr=`, a slow iPad lowers the quality by itself: first the pixel ratio, then the herd's detail. The console says `[mmw] quality lowered`.

If WebGL 2 does not start, a night picture with the home button shows instead, and the console says `[mmw] no WebGL 2`. The same picture shows when the game script has not started after 10 s (an old Safari, a file that did not load). A slow start on the Air 2 does not trigger it.

Every checked moment (2 eggs, 2 names, 3 wishes, 3 door numbers, and the 2 picnic guests and the hay rack when she takes the quests) is logged to the console as `[mmw result]` with first try, miss or helped, and `detail.tried` lists what she chose wrongly (stones, words, names, doors). A right answer after the focused hint is helped; a right item after only the light contrast is a miss. Each result also goes to the server's request log as `diag.txt?kind=result&…` (the file does not exist; Emma's server logs the request), with the reading level, the basket size, the word, what she tried and why it was in the basket, the maths band, the stones and the answer's place. Done in the customiser sends one `kind=look` line with the rows she touched, the time and her look. `window.__game` is the test hook (state, targets, answer, the open moment's spec, jump, perf, missing clips, setLook, save, clearSave).

## Run it on the Mac

```sh
cd games/moon-meadow-world
npm run dev                  # http://localhost:5173/, v3's clips come from /v3/
npm test                     # unit tests of the four parts
npm run check                # TypeScript
bash flows/run.sh            # build, test server on port 8785, all flows, stop (outside the Claude Code sandbox)
```

`flows/run.sh` plays the whole level at 1080 x 810 (Emma's iPad) with a fresh save and real taps and drags (Done in the customiser at once; one wrong answer in egg 1, naming 1, the dress-up wish, the roll call and the visit), checks the results log with what she tried, the basket and stone counts, the save after goodnight, the frame budget, that nothing leaks over a minute, that no clip is missing and that the console has no errors. `dress.flow.sh` checks the customiser at every size: every swatch touchable, one pick per row, a slide released off the panel, a pointercancel mid-slide, the ribbon tap, the budget in the body and face frames, and the saved look after a reload. `quest.flow.sh` plays both side quests at 1080 x 810 and 1080 x 740. The smoke flow starts at the customiser and at seven parts with `?at=` at 1080 x 810, 1080 x 740 (Safari's bars), 1024 x 768, 1024 x 690 (the Air 2), 1180 x 820 and 1366 x 1024 and checks that every target, and every 3D unicorn near her, is on screen and at least 64 px. `MMW_FULL=all` plays the whole level at every size, `MMW_SIZES="1080x740"` runs only the sizes given, `MMW_NO_LEVEL=1`, `MMW_NO_DRESS=1`, `MMW_NO_QUEST=1` and `MMW_NO_SMOKE=1` leave a flow out, and `MMW_SKIP_BUILD=1` reuses `dist/`. Screenshots go to `$TMPDIR/mmw-shots`.

The four parts and their notes: the world (`src/world/`, [notes/world.md](notes/world.md)), the characters (`src/actors/`, [notes/actors.md](notes/actors.md)), the 2D layer (`src/ui/`, [notes/ui.md](notes/ui.md)) and the content (`src/content/`, [notes/content.md](notes/content.md)). The level script, touch input and followers are in `src/game/` ([notes/game.md](notes/game.md)); the test hook is `src/test-hook.ts`.

## Watch Emma play

Sit next to her and note. New in 2.2.0:

- Does she dress Princess Emma by herself? Does she use every row, and does she find the big pink play button when she is done? Does a palm resting on the right edge change her look by accident? The `kind=look` line in the server log shows the rows she touched and how long she took.
- Does she find the ribbon tap (a tap on the hair thing she wears)? It only does something once she owns a second colour (after the first goodnight).
- Does she read before she drags? Baskets now hold 4 or 5 look-alike pictures. After a wrong item, does she look at the word on it and the letters that light up, or wait for the sounds? `pt=1` (a sound dot touched first) and `q=1` (a pick within 1.5 s) in the result lines show it.
- Do the sleeping stones read as "wait"? The stones wake with a hop when Elizabeth has said both numbers.
- Does she find the bubbles in the afternoon, and take the picnic and the hay rack? Skipping them is fine.
- On the second play: is the short welcome enough, and does her saved look come back?

From the demo:

- Does she find her way? Does she tap the grass to walk, follow the sparkle beacon and the arrow at the screen edge, and get to the nest, the pond, the wild egg and the stable without your help?
- Is the maths hard but doable? Note the egg sums and the door numbers she gets first time, and where she needs the hint or the ghost hand. The console's `detail.tried` shows near misses (a stone one off, a neighbouring door).
- Are the words easy enough? Does she read the wish word herself, or wait for it to be spoken? Does she spell the names with the gems?
- Does she enjoy the slide? Does she drag the unicorns onto it, slide down herself, and keep playing at the pond?
- Does she find the stable at bedtime? A tap anywhere in the stable yard, on a door or on the stable building takes her there.
- Does she use the hints? A wrong stone lifts the blanket, and the focused hint counts the cups that are still cold. After two wrong names the ghost hand finishes the name with her.
- Does she leave by accident? The home button needs a 1 s press while a pink ring fills; a quick tap only wiggles it.
- Is it smooth on the Air 2? Open `?perf=1` once and note the frame rate in the meadow, at the pond and at the stable at night. If `q` goes to 1 or 2, the iPad lowered the quality by itself; try `?pr=1&aa=0` and compare.
