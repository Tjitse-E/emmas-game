# Moon Meadow World (v4 demo)

One playable level of v4 in 3D: "Emma's first day in Moon Meadow" ([docs/v4/demo.md](../../docs/v4/demo.md)). Princess Emma walks the meadow, warms two eggs (adding under a blanket, then taking away, both across ten, with stones of 3 to 9), names the two babies with letter gems, reads three wishes (food, a bath toy at the pond for the first baby, a bath toy for the second), plays at the pond with the slide, and puts 14 unicorns to bed by reading the door numbers (7 to 12 at the roll call, a teen door 11 to 14 at the visit). The end screen shows the whole herd in their own colours, with her two babies and their names on top. It takes 12 to 15 minutes and ends with new ribbons and goodnight. Nothing is saved: every start is the same first day.

The demo is throwaway. It shows Tjitse how v4 plays, whether Emma likes it, and how the iPad Air 2 copes with 14 code-built unicorns, the pond and the slide. Vite 8, TypeScript 6 and three.js 0.186.1, built for Safari 15. Speech is pre-generated ElevenLabs audio: v3's clips and pictures from `games/moon-meadow-home/`, and the demo's own 70 lines in `public/audio/v4demo/`.

## Play it on Emma's iPad

Build once after every change (the build is not in git), then open the address on the iPad:

```sh
cd games/moon-meadow-world && npm run build
```

http://<LocalHostName>.local:8765/games/moon-meadow-world/dist/

`scutil --get LocalHostName` gives the name. Emma's server (`games/moon-meadow-home/tools/go-live.sh`) serves the whole repo, so nothing else is needed. The demo takes v3's clips from Emma's promoted v3 build.

Listen to these three new clips before Emma plays (in `public/audio/v4demo/`):

- `lumi4-another-egg.mp3`: "Oh! Another egg!"
- `lumi4-ribbons.mp3`: "You did so well today, Emma! Here are new ribbons for your hair."
- `g4-snow-egg.mp3`: "A snow egg! It hatches when it is just right."

## Address options

- `?perf=1` shows frames per second, draw calls, triangles, geometries, textures, unicorn detail, the pixel ratio (`pr`) and the quality level (`q0` full, `q1` lower pixel ratio, `q2` cheaper herd too) in a small box at the top. Use it on the Air 2, with Low Power Mode off (it caps Safari at 30 frames per second).
- `?pr=<n>` caps the pixel ratio (default 1.5; `?pr=1` draws a quarter fewer pixels on the Air 2).
- `?aa=0` turns antialiasing off.
- `?at=<part>` starts at a part after the Play button: `welcome`, `egg1`, `naming1`, `wish1`, `pond`, `egg2`, `naming2`, `wish2`, `free`, `bedtime`, `goodnight`. Skipped babies get the first name of their bells.
- `?seed=<n>` plays the same level every time (same eggs, names, words and doors).

Without `?pr=`, a slow iPad lowers the quality by itself: first the pixel ratio, then the herd's detail. The console says `[mmw] quality lowered`.

If WebGL 2 does not start, a night picture with the home button shows instead, and the console says `[mmw] no WebGL 2`. The same picture shows when the game script has not started after 10 s (an old Safari, a file that did not load). A slow start on the Air 2 does not trigger it.

Every checked moment (2 eggs, 2 names, 3 wishes, 3 door numbers) is logged to the console as `[mmw result]` with first try, miss or helped, and `detail.tried` lists what she chose wrongly (stones, words, names, doors). A right answer after the focused hint is helped. `window.__game` is the test hook (state, targets, answer, jump, perf, missing clips).

## Run it on the Mac

```sh
cd games/moon-meadow-world
npm run dev                  # http://localhost:5173/, v3's clips come from /v3/
npm test                     # unit tests of the four parts
npm run check                # TypeScript
bash flows/run.sh            # build, test server on port 8785, all flows, stop (outside the Claude Code sandbox)
```

`flows/run.sh` plays the whole level at 1024 x 768 (the iPad Air 2) with real taps and drags (one wrong answer in egg 1, naming 1, the food wish, the roll call and the visit), checks the results log with what she tried, the frame budget, that nothing leaks over a minute, that no clip is missing and that the console has no errors. Then it starts at six parts with `?at=` at 1024 x 768, 1024 x 690 (the Air 2 with Safari's bars), 1180 x 820 and 1366 x 1024 and checks that every target, and every 3D unicorn near her, is on screen and at least 64 px. `MMW_FULL=all` plays the whole level at all four sizes, `MMW_SIZES="1024x690"` runs only the sizes given, and `MMW_SKIP_BUILD=1` reuses `dist/`. Screenshots go to `$TMPDIR/mmw-shots`.

The four parts and their notes: the world (`src/world/`, [notes/world.md](notes/world.md)), the characters (`src/actors/`, [notes/actors.md](notes/actors.md)), the 2D layer (`src/ui/`, [notes/ui.md](notes/ui.md)) and the content (`src/content/`, [notes/content.md](notes/content.md)). The level script, touch input and followers are in `src/game/` ([notes/game.md](notes/game.md)); the test hook is `src/test-hook.ts`.

## Watch Emma play

Sit next to her and note:

- Does she find her way? Does she tap the grass to walk, follow the sparkle beacon and the arrow at the screen edge, and get to the nest, the pond, the wild egg and the stable without your help?
- Is the maths hard but doable? Note the egg sums and the door numbers she gets first time, and where she needs the hint or the ghost hand. The console's `detail.tried` shows near misses (a stone one off, a neighbouring door).
- Are the words easy enough? Does she read the wish word herself, or wait for it to be spoken? Does she spell the names with the gems?
- Does she enjoy the slide? Does she drag the unicorns onto it, slide down herself, and keep playing at the pond?
- Does she find the stable at bedtime? A tap anywhere in the stable yard, on a door or on the stable building takes her there.
- Does she use the hints? A wrong stone lifts the blanket, and the focused hint counts the cups that are still cold. After two wrong names the ghost hand finishes the name with her.
- Does she leave by accident? The home button needs a 1 s press while a pink ring fills; a quick tap only wiggles it.
- Is it smooth on the Air 2? Open `?perf=1` once and note the frame rate in the meadow, at the pond and at the stable at night. If `q` goes to 1 or 2, the iPad lowered the quality by itself; try `?pr=1&aa=0` and compare.
