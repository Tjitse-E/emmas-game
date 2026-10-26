# Game lane: notes

The level script (`src/game/level.ts`), touch input (`input.ts`), the door moments (`doors.ts`), shared state and helpers (`game.ts`), `src/main.ts`, `src/test-hook.ts` and `index.html`.

## The level, part by part

| Part | What the script does |
|---|---|
| Start | The world is paused (`world.setPaused(true)`) behind the start screen; every shader program is compiled at boot (`renderer.compile`). The Play tap unpauses before the fade. The sweep takes 3.5 s. |
| Welcome | She may walk and call unicorns while Lumi talks. For the crown she stops, turns to the camera and the camera comes to 6 m; it lets go after the clap, before "An egg is waiting." |
| Eggs | The nest glow goes off as soon as she reaches the nest. She stands beside the egg at its depth and turns a three-quarter face to the camera (also in the hatch and the naming). |
| Pond | The tap line after 12 s without a slide, once more 20 s later, the egg comes at 45 s. After the first slide, 8 s more play, then the first baby's bath wish on the nearer of two shore spots (water behind them), result part `pond`. Its word is kept out of the second bath wish. |
| Wild egg | The camera frames the egg's landing spot, 9 m wide. |
| Free play | After 30 s without any touch: the slide, follow and basket lines in turn. A Lumi tap says the basket line. |
| Bedtime | The whole stable yard counts as the stable (`inStableYard`); a door or roof tap on the way walks her to her bedtime spot. Roll call (7 to 12, two doors), the herd goes in while both newborns move in, then the visit: a newborn visits a teen door (11 to 14). The next door is asked while the last unicorn walks in; a walk-in longer than 4 s pops the unicorn into its stall. |
| Goodnight | The yawn plays out, then "Fourteen unicorns!" while the camera tilts up to 12 degrees with the view shifted up, so the stars and the castle show over the roofs. The ribbons at 8.6 m and 24 degrees with both door rows behind her; the stars land just in front of her head; after the twirl she turns to the camera, hearts and a sparkle ring, a 2.2 s hold, then the heads duck and Lumi says goodnight. The end screen gets all 14 members (the two new ones first, `isNew`), and the world pauses once it covers it. |

## Rules in the code

- A tap never cuts speech: a unicorn's name or "Yum!" waits its turn (`sayAside`), one at a time; further taps only show the tag and the hop.
- `setTime(g, t, ms)` sets the time of day in the world and the colour wash in the 2D layer (`layer.sky`) together.
- Results: `detail.tried` collects every wrong choice (`hooks.log('tried', { what })` from the ui moments, the door number from the door moments). A right door after the row hint (level 2) is `helped`.
- A wrong door: the unicorn inside in a nightcap ("Not me!"); a unicorn of that door still in the yard trots to its door and shakes its head ("Not me!"); an empty stall swings open and her baby giggles ("Silly!"). During a door moment a tap on a waiting unicorn makes it hop and look at its own door.
- `world.onSlow(level => actors.setDetail(level))`; the `?perf=1` box shows the pixel ratio and the quality level.
- No WebGL 2, or `createWorld` throws: `window.__mmwFallback()` from `index.html` shows a night picture with the home button. The same script shows it after 10 s when the game script never started (`main.ts` sets `window.__mmwStarted` first thing), so a slow boot on the Air 2 is never covered.
- Baby close-ups (naming and wishes) pass her crown to `frameAt` as `keep`: when she stands further back than the baby (the food wish by the nest), the view moves down so her crown stays on screen.
- The test hook reports a 3D unicorn's tap area as its hit sphere on screen, but never under 64 px: `herd.pick` takes any tap within 32 px of its middle.

## For the ui lane

- `EggSpec.clips.afterGoal` (optional, new): the first warm egg has `['g-stone']` ("Drag one stone to the nest."). Play it once after the first goal when present.
- The warm egg's hint is now `['h-peek']` ("Let's peek under the blanket."), followed by the counting clips.
- Stones are 3 to 9. Warm eggs: have 6 to 9, need 11 to 15, answer 4 to 9. Snow eggs: have 11 to 15, need 7 to 9, answer 4 to 6.
