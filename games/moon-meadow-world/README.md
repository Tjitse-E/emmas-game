# Moon Meadow World (v4 demo)

One playable level of v4 in 3D: "Emma's first day in Moon Meadow" ([docs/v4/demo.md](../../docs/v4/demo.md), with the 2.2.0 changes in [docs/v4/2.2.md](../../docs/v4/2.2.md)). After Play, Emma dresses Princess Emma: six picture tabs (hair, eyes and jewels, gown, crown, shoes, hair things), each with its rails of shapes and colours, next to a close-up of her in 3D, and the big pink play button when she is ready. Then Princess Emma walks the meadow, warms two eggs (adding under a blanket, then taking away, both across ten, with 4 or 5 stones of 3 to 9 that wake when Elizabeth has said both numbers), names the two babies with letter gems, reads three wishes (the first baby wants to dress up like her, a bath toy at the pond, a picnic treat for the second baby), plays at the pond with the slide, and in the afternoon may take two side quests: a royal picnic at Lumi's gazebo (two more wishes and a rose for her hair) and a hungry herd at the hay rack (a third sum, dragged as hay piles onto the rack). She puts 14 unicorns to bed by reading the door numbers (7 to 12 at the roll call, a teen door 11 to 14 at the visit). The end screen shows the whole herd in their own colours, with her two babies and their names on top. It takes about 14 to 16 minutes (up to 18 with both quests) and ends with a new ribbon colour and goodnight.

2.3.0's afternoon ([docs/v4/2.3.md](../../docs/v4/2.3.md) section 17): free play offers the royal picnic and one maths quest, the bead tree and the hay rack in turn (the one she did not finish comes again). Every finished quest gives a present: she picks one of two new things, wears it and keeps it. After her first quest a trunk bubble invites her to the Dressing Corner at the gazebo's step: her two babies dress up first (two phrase reads), she gets a hair present, then she dresses at the trunk and the mirror while a music box plays (30 to 60 s, inside free play's time). Free play lasts two minutes of free time, and up to two and a half while a picnic or maths bubble still waits; it stands still while Lumi or Elizabeth speaks. After her visit a tap on the trunk shows her treasure board. A saddle sign at the moon mist in the north-east says what opens next. Each play sends one `kind=play` line with its checked, dressing and free time.

Her look, the things she owns, her ribbon colours, hidden reading, phrase and pattern levels and the last play's words and sums are saved in the browser (`localStorage`, key `mmw.save2` since 2.3.0). 2.2's `mmw.save` is read only while `mmw.save2` is missing or broken, and is never written or removed. On the next play she taps Play, sees her saved look in the customiser and taps the play button once; Lumi's welcome is shorter. Each address (Emma's server, a test server, another host name) has its own save, and Safari may clear it after 7 days without a visit: she then starts fresh with the default look and the middle reading level.

The demo is throwaway. It shows Tjitse how v4 plays, whether Emma likes it, and how the iPad Air 2 copes with 14 code-built unicorns, the pond and the slide. Vite 8, TypeScript 6 and three.js 0.186.1, built for Safari 15. Speech is pre-generated ElevenLabs audio: v3's clips and pictures from `games/moon-meadow-home/`, and the demo's own 79 clips in `public/audio/v4demo/`.

## Play it on Emma's iPad

Build once after every change (the build is not in git), then open the address on the iPad:

```sh
cd games/moon-meadow-world && npm run build
```

http://<LocalHostName>.local:8765/games/moon-meadow-world/dist/

`scutil --get LocalHostName` gives the name. Emma's server (`games/moon-meadow-home/tools/go-live.sh`) serves the whole repo, so nothing else is needed. The demo takes v3's clips from Emma's promoted v3 build.

Listen to the new clips before Emma plays (in `public/audio/v4demo/`): the 12 lines of 2.2.0 the game uses (docs/v4/2.2.md section 6, among them `g4-ready`, `g4-dress-up`, `lumi4-picnic-done` and `word-heart`), and the demo's earlier `lumi4-another-egg`, `lumi4-ribbons` and `g4-snow-egg`.

Listen to the 16 effects, the day loop and the music box on `dev/sound.html` (vite dev), then approve them (notes/sound.md). Until then the game plays every made effect; `?sfx=approved` plays only the approved ones.

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
- `?at=free&quest=picnic` or `?at=free&quest=rack` starts that side quest as free play begins (rack also makes it this play's maths quest). 2.3.0 adds `quest=beads` (the bead tree, also this play's maths quest) and `quest=corner` (the Dressing Corner, without waiting for a first quest).
- `?pl=1`, `?pl=2` or `?pl=3` plays every bead tree pattern at that level and does not store it (2.3.0).
- `?box=<seconds>` makes the wardrobe's music box this long at the start mirror and the Dressing Corner (the flows use 5) (2.3.0).
- `?phrases=all` lets the Dressing Corner's phrase wish use tinted pictures only Claude has checked. Without it only the pictures Emma has checked play, and with too few the gate plays two dress-up word wishes (2.3.0).
- `check.html` (next to `index.html`, also in `dist/`) is Emma's picture check of the 30 phrase pictures on her own iPad: Tjitse taps a tick or a cross after she names each one. A tick counts as her check at once, without a rebuild; a cross keeps the pair out. The verdicts stay on that iPad (2.3.0).
- `?portrait=0` keeps her normal detail in the customiser's close-up (compare the frame rate with `?perf=1`).

Without `?pr=`, a slow iPad lowers the quality by itself: first the pixel ratio, then the herd's detail. The console says `[mmw] quality lowered`.

If WebGL 2 does not start, a night picture with the home button shows instead, and the console says `[mmw] no WebGL 2`. The same picture shows when the game script has not started after 10 s (an old Safari, a file that did not load). A slow start on the Air 2 does not trigger it.

Every checked moment (2 eggs, 2 names, 3 wishes, 3 door numbers, and the 2 picnic guests and the hay rack when she takes the quests) is logged to the console as `[mmw result]` with first try, miss or helped, and `detail.tried` lists what she chose wrongly (stones, words, names, doors). A right answer after the focused hint is helped; a right item after only the light contrast is a miss. Each result also goes to the server's request log as `diag.txt?kind=result&…` (the file does not exist; Emma's server logs the request), with the reading level, the basket size, the word, what she tried and why it was in the basket, the maths band, the stones and the answer's place, and whether she picked within 1.5 s (`q=1`). Done in the customiser sends one `kind=look` line with the rows she touched, the time and her look. `window.__game` is the test hook (state, targets, answer, the open moment's spec, jump, perf, missing clips, setLook, setOwned, placeAt, save, clearSave).

## Run it on the Mac

```sh
cd games/moon-meadow-world
npm run dev                  # http://localhost:5173/, v3's clips come from /v3/
npm test                     # unit tests of the four parts
npm run check                # TypeScript
bash flows/run.sh            # build, test server on port 8785, all flows, stop (outside the Claude Code sandbox)
```

`flows/run.sh` plays the whole level at 1080 x 810 (Emma's iPad) with a fresh save and real taps and drags (Done in the customiser at once; one wrong answer in egg 1, naming 1, the dress-up wish, the roll call and the visit), checks the results log with what she tried, the basket and stone counts, the save after goodnight, the frame budget, that nothing leaks over a minute, that no clip is missing and that the console has no errors. `dress.flow.sh` checks the wardrobe at every size: every tab, rail and swatch touchable, a tab acting on pointerdown, one pick per field, a slide released off the panel, a pointercancel mid-slide, the budget in the body and face frames, Done before the music box ends, a finger held on a rail when the box ends (`?box=5`), and the saved look and the crown tab after a reload. `quest.flow.sh` plays the afternoon at 1080 x 810 and 1080 x 740: the bubbles, the budget in the follow view at the Dressing Corner, the bead tree and the saddle sign, the Corner (two gate reads with one wrong, the hair present saved and worn, the trunk lid and its board, the budget in its wardrobe at 1080 x 810, 1080 x 740 and 1024 x 690, a trunk tap after the visit), the gate before Emma's picture check, the bead tree and its jewel present, the picnic and the hay rack with their presents, and the maths quest's rotation over three loads on a real save. In a lane worktree `run.sh` serves the main checkout's v3 test build, read only, as worktrees have no build of v3. The smoke flow starts at the customiser and at seven parts with `?at=` at 1080 x 810, 1080 x 740 (Safari's bars), 1024 x 768, 1024 x 690 (the Air 2), 1180 x 820 and 1366 x 1024 and checks that every target, and every 3D unicorn near her, is on screen and at least 64 px. At the pond it first leaves two world touches without a release on the canvas, as her iPad can, and the walk that follows must still work. `MMW_FULL=all` plays the whole level at every size, `MMW_SIZES="1080x740"` runs only the sizes given, `MMW_NO_LEVEL=1`, `MMW_NO_DRESS=1`, `MMW_NO_QUEST=1` and `MMW_NO_SMOKE=1` leave a flow out, and `MMW_SKIP_BUILD=1` reuses `dist/`. `MMW_PORT` and `MMW_SESSION` give a run its own port and browser (never 8765). A missing clip whose line waits for `gen.sh` passes and is listed, unless `MMW_STRICT_CLIPS=1`. Screenshots go to `$TMPDIR/mmw-shots`.

The four parts and their notes: the world (`src/world/`, [notes/world.md](notes/world.md)), the characters (`src/actors/`, [notes/actors.md](notes/actors.md)), the 2D layer (`src/ui/`, [notes/ui.md](notes/ui.md)) and the content (`src/content/`, [notes/content.md](notes/content.md)). The level script, touch input and followers are in `src/game/` ([notes/game.md](notes/game.md)); the test hook is `src/test-hook.ts`.

## Watch Emma play

Before she plays, Tjitse checks the touch release fixes on her real iPad, as emulation does not show the failure: the name star, the sound dots, the home button, the play-again moon and the world itself (walk, carry a unicorn, tap a door). Each must still respond after a finger lifts somewhere else.

Sit next to her and note. New in 2.3.0:

- Does she find the trunk bubble after her first quest, and read the two phrases at the Corner ("the green sock")? Is the music box long enough?
- Does she pick a present at once, and does she notice she keeps wearing it? Does she tap the trunk later to see her board?
- Does the bead tree keep her attention, and does she tap the saddle sign?
- After three plays the `kind=play` lines (`min`, `ck`, `dr`) show the play's length and whether dressing pushes out learning.

New in 2.2.0:

- The customiser: does she dress Princess Emma by herself, use every row and find the big pink play button? Does a palm on the right edge change her look by accident? The `kind=look` line shows the rows she touched and how long she took. The ribbon tap (on the hair thing she wears) only does something once she owns a second colour.
- The baskets of 4 and 5: does she read before she drags, or pick at once (`q=1`)? After a wrong item, does she look at its word and the gold letters (the contrast), or wait for the sounds (`pt=1` when she touches a sound dot first)?
- The sleeping stones: do they read as "wait"? They wake with a hop when Elizabeth has said both numbers. A first stone touch within 1.5 s of the wake shows as `q=1`.
- The quests: does she find the bubbles in the afternoon, and take the picnic and the hay rack? Skipping them is fine.
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
