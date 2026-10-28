# Patterns: notes

The bead tree's pattern moment (docs/v4/2.3.md sections 6 and 19.2). Three files and a harness:

- `src/content/patterns.ts`: the planner (`patternSpec(rand, level)`), the hint's repeat (`repeatFor`), the decoy kinds (`decoysAt`), and two small rules for the game: `beadsVisit` (level, demo, store) and `levelOutcomes` (the gap results that move the level).
- `src/ui/beads.ts` and `beads.css`: the panel (`layer.beads`).
- `src/game/beads.ts`: the quest (`beadsQuest`), run from quests.ts's table.
- `dev/beads.html` with `src/ui/beads-dev.ts`: the panel alone over a flat stand-in for the tree frame. `?level=1|2|3&seed=<n>&demo=1` starts a moment after the Play tap.
- `tests/patterns.test.ts`: the rules, checked from each string itself over 4,000 seeds per level.

## The planner

| Level | Kinds | Gaps | Tray |
|---|---|---|---|
| 1 | AAB, ABB, starting with the unit | 6, 7, 8 | A, B and A's shape in B's colour (1 in 3) |
| 2 | AAB, ABB, ABC, AABB, starting anywhere in the unit | 6, 7, 8 | the units, then cross beads up to 4 (1 in 4) |
| 3 | the same | three of 1 to 8, never side by side | as level 2 |

Units are drawn from four shapes and five colours (`BEAD_COLOURS`, drawn in the palette's `small` shade) and differ in both. The tray is shuffled; the answer of each gap lands on each tray place evenly (tested within 5 points).

Every string passes these checks, each tested from the string, the gaps and the tray:

- copying the bead left of the gap is wrong at least once;
- swapping between the last two beads (the bead two places back) is wrong at least once;
- a tray bead with the right colour and the wrong shape exists at some gap, and one with the right shape and the wrong colour;
- the three gaps never all take the same bead, so repeating her last right bead is wrong at least once (Claude's call);
- at every gap one full repeat of the pattern (3 or 4 places in a row) shows no open gap, so the hints have something to light (Claude's call; it decides which level 3 gap sets an AABB string can have).

No gap is at place 0, because there is no bead on its left to go on from (Claude's call; the doc allows 0).

Decoy kinds per gap, by tray index: `copy` (the bead left of the gap), `unit` (another unit), `colour` (right colour only), `shape` (right shape only). In ABC a cross bead can share nothing with a gap's bead; it then has no kind, because `PatternDecoy` has no `other` (requests-patterns.md). The game logs the decoys by bead (`"star-pink": "colour"`), so `tried` in the diag line reads `star-pink:colour`.

## The panel

- The string hangs across the top middle: a box of 852 x 200 design px starting 8 left of the screen centre, places 96 apart, beads 84, the middle 76 lower than the ends. At 1180 x 820 it runs from 156 (Lumi ends at 150) to 1008. The tray of beads of 120 sits on the right, bottom 30, as the stones; the string's right end ends at 104 from the top, above it. Checked at 1080 x 740, 1080 x 810, 1024 x 690, 1024 x 768, 1180 x 820 and 1366 x 1024: no overlap with Lumi, the home button or the tray, tray beads 101 to 139 CSS px.
- Drop anywhere on the string (its box plus 30 design px). A drop elsewhere sends the bead home without a miss. Drags go through `drag.ts`, which also ends a drag from window and on lostpointercapture.
- The tray sleeps while Elizabeth says the intro (once a play, `ctx.seen`; it ends with the goal) or the goal, then wakes with a chime.
- Hint ladder per gap: `HintRunner('maths', ..., { missStep: 'contrast' })`. Idle repeats the goal, then the focused hint. The contrast lights the repeat bead by bead under "Look at the pattern again." The focused hint says "Let's look at the pattern.", then lights it with a tick per bead after her line and pulses the matching place gold. The repeat is the one nearest the gap, on its left when it can be, so the matching place is then the first lit bead.
- Right bead: `bead-clink` (through `audio.fx`, no fallback, so silent until the file exists), a sparkle burst, the next gap glows. Wrong bead: it wobbles at the gap and rolls home, no sound, `react('look')`.
- After the third gap the string sparkles, `react('happy')`, the line waits for the clink (`fx` resolves within 1 s), then "What a pretty necklace!" with at least 1.8 s on screen.
- Demo (`{ demo: true }`): after the goal the ghost carries the right bead into gap 1, its result is `helped` with `ms` 0, then the goal hands gap 2 to her.
- `hooks.log`: `tried` with the bead key for every wrong bead, `beads-miss`, and `beads` (with `quick` and `demo`) before `hooks.gap(i, r)`.
- Snapshot: kind `beads`, `gap` (0 to 2), `answer` is `bead <shape>-<colour>`; targets are the tray beads `bead <shape>-<colour>` and `string`.

## The quest

1. Her first baby leaves the followers; every other follower (the second baby too) parks at `BEAD_TREE.aside`; the herd steps aside (`herdAsideAt`).
2. She walks to `BEAD_TREE.stand`, the baby to `BEAD_TREE.baby` (placed after 4 s), she faces half towards the tree.
3. The frame (Claude's call, measured): 8.5 m across, centred 1.2 m west and 0.6 m south of the tree, the tree top at 30%. The doc's 6 m frame at the tree put the baby's head on the bottom edge (y 735 of 740) and her feet off screen. In the new frame at 1080 x 740 her head is at y 384, the baby's head at 563 and the tree top at 222, under the string.
4. `checked(g, layer.beads(...))`; one result line per gap (`beads1` to `beads3`, strand m, kind pattern, with `pattern`, `level`, `gap`, `tray`, `decoys`, `tried`, `quick`, and `demo: 1` on the demo gap).
5. The save: `seen.beads`, and unless `?pl=` the gap results folded into `save.patterns` with `foldReading` (up after 3 first tries in a row, down after 2 struggles), the demo gap left out. It never touches the maths band.
6. The baby hops with hearts and says "Pretty!" (`foal-pretty`). The quest resolves still framed; the release lets the frame, the baby, the followers and the herd go.

## Checked in the browser

- `dev/beads.html` at all six sizes and the three levels: layout, the demo, a miss with the contrast, the focused hint, two misses and the ghost, a drop off the string, a release only the window hears.
- The game at `?at=free&quest=beads&fresh=1&seed=5`, 1080 x 740: the demo, one wrong bead, three result lines, the level fold without the demo gap, `seen.beads`, back to free play. The bead tree itself is drawn by the quests-world lane; until then the frame shows grass where it stands.
