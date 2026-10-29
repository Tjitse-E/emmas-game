# Patterns: notes

The bead tree's pattern moment (docs/v4/2.3.md sections 6 and 19.2). Three files and a harness:

- `src/content/patterns.ts`: the planner (`patternSpec(rand, level)`), the repeats the hints light (`repeatFor` for the focused hint, `contrastFor` for the contrast), the decoy kinds (`decoysAt`), and the small rules for the game: `beadsVisit` (level, demo, store), `demoGap`, `DEMO_RESULT`, `levelOutcomes` (the gap results that move the level) and `saveVisit` (the save after a visit).
- `src/ui/beads.ts` and `beads.css`: the panel (`layer.beads`).
- `src/game/beads.ts`: the quest (`beadsQuest`), run from quests.ts's table.
- `dev/beads.html` with `src/ui/beads-dev.ts`: the panel alone over a flat stand-in for the tree frame. `?level=1|2|3&seed=<n>&demo=1` starts a moment after the Play tap.
- `tests/patterns.test.ts`: the rules, checked from each string itself over 4,000 seeds per level.
- `notes/requests-patterns.md`: what this lane asks of the integrator and of quests-world.

## The planner

| Level | Kinds | Gaps | Tray |
|---|---|---|---|
| 1 | AAB, ABB, starting anywhere in the unit | 6, 7, 8 | A, B and both cross beads (1 in 4) |
| 2 | AAB, ABB, AABB, and ABC about 1 string in 19 (`KIND_WEIGHTS`), starting anywhere in the unit | 6, 7, 8 | the units, then cross beads up to 4 (1 in 4) |
| 3 | the same | three of 1 to 8, never side by side | as level 2 |

Units are drawn from four shapes and five colours (`BEAD_COLOURS`, drawn in the palette's `small` shade) and differ in both. The tray is shuffled; the answer of each gap lands on each tray place evenly (tested within 5 points).

Every string passes these checks, each tested from the string, the gaps and the tray:

- copying the bead left of the gap is wrong at least once;
- swapping between the last two beads (the bead two places back) is wrong at least once;
- a tray bead with the right colour and the wrong shape exists at some gap, and one with the right shape and the wrong colour;
- the three gaps never all take the same bead, so repeating her last right bead is wrong at least once (Claude's call);
- at every gap one full repeat of the pattern (3 or 4 places in a row) shows no open gap, so the hints have something to light (Claude's call; it decides which level 3 gap sets an AABB string can have).

No gap is at place 0, because there is no bead on its left to go on from (Claude's call; the doc allows 0).

How often a guesser fills a whole string at first try (the exact chance, over 20,000 strings per level; three first tries in a row move the level up). The tests hold these under ceilings of 0.13, 0.15 and 0.15 (colour and shape), 0.13 (on the string) and 0.02 (blind):

| Level | Colour only | Shape only | Beads on the string | Blind |
|---|---|---|---|---|
| 1 | 0.125 | 0.125 | 0.125 | 0.016 |
| 2 | 0.145 | 0.145 | 0.120 | 0.016 |
| 3 | 0.143 | 0.143 | 0.120 | 0.016 |

Claude's call on 19.2's open point (the trays let colour alone fill a whole string, 38% at level 1 and 21 to 22% at levels 2 and 3 before). With two units the tray holds both cross beads, at level 1 too, so every gap has two beads in its colour and two in its shape: 1 in 8 for a whole string. An ABC tray has room for one cross bead only (about 50% colour only), so ABC is drawn with weight 1 against 6 for each other kind; the planner turns down more ABC strings than others, so about 5% of strings at levels 2 and 3 are ABC. Fewer ABC strings raise beads on the string from 0.103 to 0.120.

Copying the bead on the left: a level 1 string may start anywhere in its unit, so each end gap is the one where copying works 1 time in 3. On her first visit the ghost fills gap 1, and copying wins her first own gap 33% of the time (50% when every level 1 string started with its unit) and never both of her gaps. 0% would need the planner to know about the demo (`game/beads.ts` passing `visit.demo` to `patternSpec`). At levels 2 and 3 copying wins a gap 28 to 37% of the time.

Decoy kinds per gap, by tray index: `copy` (the bead left of the gap), `unit` (another unit), `colour` (right colour only), `shape` (right shape only). In ABC a cross bead can share nothing with a gap's bead; it then has no kind, because `PatternDecoy` has no `other` (requests-patterns.md). The game logs the decoys by bead (`"star-pink": "colour"`), so `tried` in the diag line reads `star-pink:colour`.

## The panel

- The string hangs across the top middle: a box of 852 x 200 design px starting 8 left of the screen centre, places 96 apart, beads 84, the middle 76 lower than the ends. At 1180 x 820 it runs from 156 (Lumi ends at 150) to 1008. The tray of beads of 120 sits on the right, bottom 30, as the stones; the string's right end ends at 104 from the top, above it. Checked at 1080 x 740, 1080 x 810, 1024 x 690, 1024 x 768, 1180 x 820 and 1366 x 1024: no overlap with Lumi, the home button or the tray, tray beads 101 to 139 CSS px.
- Drop anywhere on the string (its box plus 30 design px). A drop elsewhere sends the bead home without a miss. Drags go through `drag.ts`, which also ends a drag from window and on lostpointercapture.
- The tray sleeps while Elizabeth says the intro (once a play, `ctx.seen`; it ends with the goal) or the goal, then wakes with a chime. The panel owns `g4-beads`, as the egg panel owns its intro, so the quest says nothing before the moment.
- Hint ladder per gap: `HintRunner('maths', ..., { missStep: 'contrast' })`. Idle repeats the goal, then the focused hint. The contrast lights a repeat bead by bead under "Look at the pattern again." The focused hint says "Let's look at the pattern.", then lights a repeat with a tick per bead after her line and pulses the matching place gold. The focused hint's repeat is the one nearest the gap, on its left when it can be (`repeatFor`), so its first bead is the answer; that is fine there, because the gold pulse shows the answer anyway and the result is `helped`. The contrast's repeat (`contrastFor`) is picked at random among the nearest repeat for each place the match can take in it, because after the contrast a right bead is only `miss`. Measured over 4,000 strings per level, the bead at any place in the contrast's order is the answer 44 to 56% of the time (it was 100% at levels 1 and 2 with the nearest repeat), near the 1 in 2 of picking either unit.
- Right bead: `bead-clink` (through `audio.fx` with the synth `pop` as fallback until the file exists), a sparkle burst, the next gap glows. Wrong bead: it wobbles at the gap and slides home, no sound, no spin, `react('look')`, so a miss is never more fun than a right bead.
- Glows: the open gap's breathing glow, the lit repeat, the gold pulse and the finished necklace sit on `::before` and `::after` layers behind each place and animate only opacity and transform, so nothing repaints each frame over the 3D view. The beads' own drop shadow is on their SVG and never animates.
- After the third gap the string sparkles, `react('happy')`, the line waits for the clink (`fx` resolves within 1 s), then "What a pretty necklace!" with at least 1.8 s on screen.
- Demo (`{ demo: true }`): after the intro the ghost carries the right bead into gap 1 while the tray still sleeps (the contract: "before the tray wakes"), so a touch then only wiggles a bead. Its result is `DEMO_RESULT` (`helped`, `ms` 0). Then the goal again, with the tray asleep; then the tray wakes with its chime and gap 2 is hers.
- `hooks.log`: `tried` with the bead key for every wrong bead, `beads-miss`, and `beads` (with `quick` and `demo`) before `hooks.gap(i, r)`.
- Snapshot: kind `beads`, `gap` (0 to 2), `answer` is `bead <shape>-<colour>`; targets are the tray beads `bead <shape>-<colour>` and `string`.

## The quest

1. Her first baby leaves the followers; every other follower (the second baby too) parks at `BEAD_TREE.aside`; the herd steps aside (`herdAsideAt`).
2. She walks to `BEAD_TREE.stand`, the baby to `BEAD_TREE.baby` (placed after 4 s), she faces half towards the tree.
3. The frame (Claude's call, measured): 8.5 m across, centred 1.2 m west and 0.6 m south of the tree, the tree top at 30%. The doc's 6 m frame at the tree put the baby's head on the bottom edge (y 735 of 740) and her feet off screen. In the new frame at 1080 x 740 her head is at y 384, the baby's head at 563 and the tree top at 222, under the string. It was measured before quests-world draws the tree, so it must be measured again with the tree (request 2).
4. `checked(g, layer.beads(...))`; one result line per gap (`beads1` to `beads3`, strand m, kind pattern, with `pattern`, `level`, `gap`, `tray`, `decoys`, `tried`, `quick`, and `demo: 1` on the demo gap).
5. The save (`saveVisit`, tested on a real default save): `seen.beads`, and unless `?pl=` the gap results folded into `save.patterns` with `foldReading` (up after 3 first tries in a row, down after 2 struggles), the demo gap left out. Nothing else in the save changes, and the maths band never moves.
6. The baby hops with hearts and says "Pretty!" (`foal-pretty`). The quest resolves still framed; the release lets the frame, the baby, the followers and the herd go.

## Checked in the browser

- `dev/beads.html` at all six sizes and the three levels: layout, the demo, a miss with the contrast, the focused hint, two misses and the ghost, a drop off the string, a release only the window hears.
- The game at `?at=free&quest=beads&fresh=1&seed=5`, 1080 x 740: the demo, one wrong bead, three result lines, the level fold without the demo gap, `seen.beads`, back to free play. The bead tree itself is drawn by the quests-world lane; until then the frame shows grass where it stands.
- After the review, `dev/beads.html` at 1080 x 740: the demo keeps the tray asleep while the ghost fills gap 1 and through the goal after it, and a touch then logs no miss; the phase turns `open` at gap 1 only when the tray wakes. Four misses at the same gap of one ABC string lit repeats with the match first, second (twice) and third. The halos, the gold ring and the finished necklace show; the only running animations are opacity and transform ones.
- Budget in the tree frame (built game, 1080 x 740, 1080 x 810 and 1024 x 690, before the tree is drawn): 34 draw calls and 54,267 triangles. The panel is DOM only.
