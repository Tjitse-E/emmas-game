# Requests from the patterns lane

Changes the patterns lane needs in files it does not own. The lane compiles and passes its tests without them. This file is not in the lane's owned list in 22.2; the integrator keeps it or folds it into `notes/patterns.md`.

## For Tjitse and the integrator (a call on the doc)

1. **The trays let colour alone, or shape alone, fill a whole string.** Section 6 says "colour alone never fills a gap", but the trays of 19.2 cannot deliver that. At level 1 the one cross bead (A's shape in B's colour) leaves A the only bead in its colour and B the only bead in its shape. At levels 2 and 3 an ABC tray has room for one cross bead only. Chance of filling all three gaps at first try (three first tries in a row move the pattern level up), over 20,000 strings per level:

   | Level | Colour only | Shape only | Beads on the string | Blind |
   |---|---|---|---|---|
   | 1 | 37.6% | 37.4% | 12.5% | 3.7% |
   | 2 | 21.9% | 21.9% | 10.3% | 1.6% |
   | 3 | 20.8% | 20.8% | 10.3% | 1.6% |

   Options, each a change to the 19.2 table:
   - **Level 1 with both cross beads** (a tray of 4, odds 1 in 4 per gap): colour only, shape only and beads on the string each 12.5%.
   - **ABC less often at levels 2 and 3**: without ABC, colour only and shape only drop to 12.5%, but beads on the string rises to 12.5% (ABC holds it at 3.7%). Each quarter of ABC adds about 9 points of colour only and takes off about 2 of beads on the string.

   The tests hold today's figures under ceilings (`tests/patterns.test.ts`, "lets a colour-only ... guesser"), so a better tray only needs its ceilings lowered. The planner change is a few lines in `trayOf` and `KINDS_AT`.

   **Declined for now** (integrator, patterns merge): this is a learning design call, and both options change the 19.2 table Tjitse approved. The planner keeps the table. 19.2 now records the problem, the figures and both options as open for Tjitse, and section 13 points to it. When Tjitse picks one, the planner, `TRAY_SIZE` and the ceilings change together.

   **Done** (Claude's call, final reading fixes): both options. Level 1 has both cross beads, and ABC is rare at levels 2 and 3. Colour only and shape only: 12.5% at level 1, 14.5% and 14.3% at levels 2 and 3. 19.2 and notes/patterns.md have the figures.

## For the integrator

2. **`src/contracts.ts`, `PatternDecoy`: add `'other'`.** Change `export type PatternDecoy = 'copy' | 'unit' | 'colour' | 'shape';` to `export type PatternDecoy = 'copy' | 'unit' | 'colour' | 'shape' | 'other';` and the comment to "... its colour or its shape only, or nothing it shares (an ABC cross bead)". Why: in ABC the one cross bead can share neither shape nor colour with a gap's bead, so it fits none of the four kinds. Today it has no entry in `decoys`, which the result line shows as a bare bead in `tried`. After the change, `decoysAt` in `src/content/patterns.ts` sets `'other'` there (one line) and the decoy test expects it.

   **Done** (integrator, patterns merge): contracts.ts adds `'other'` with the new comment, `decoysAt` sets it, the decoy test expects it, and 19.2 lists it as a decoy kind.
3. **`docs/v4/2.3.md` section 19.2, the tree frame.** Change "`frameAt` the tree (centre 0.4 m west, 6 m wide, the tree top at 28%)" to "`frameAt` between her, the baby and the tree (centre 1.2 m west and 0.6 m south of the tree, 8.5 m wide, the tree top at 30%)". Why: measured at 1080 x 740, the 6 m frame puts the baby's head at y 735 of 740 and her feet below the screen (the view shift is clamped at 0.35). The lane uses the new frame (`TREE_FRAME` in `src/game/beads.ts`, notes/patterns.md). It was measured before the tree is drawn: after the quests-world merge, measure it again with the tree (head, baby and tree top on screen and under the string, and `budget` at 1080 x 740, 1080 x 810 and 1024 x 690).

   **Done** (integrator, patterns merge): 19.2 has the new frame and says it is measured again after the quests-world merge. **Done** (integrator, quests-world merge): measured with the tree drawn at 1080 x 740, 1080 x 810 and 1024 x 690. Her head, the baby and the tree top are on screen and under the string; the moment draws 34 calls and 55,197 triangles at each size. `quest.flow.sh` now measures all three.
4. **`docs/v4/2.3.md` section 19.2, calls to record.**
   - No gap at place 0 (no bead on its left to go on from), and the three gaps never all take the same bead. Both are tested.
   - The contrast lights a repeat chosen at random among the nearest repeat for each place the match can take in it (`contrastFor`), not the repeat next to the gap: that one always starts with the answer, which then scored `miss` though she was shown it. The focused hint keeps the nearest repeat (`repeatFor`) with the gold pulse.
   - The panel says `g4-beads` once a play (`ctx.seen`, in place of the goal, as the egg panel says its intro). Replace "`g4-beads` once a play," in the moment's list with "the panel says `g4-beads` once a play,"; `game/beads.ts` and quests.ts say nothing before `layer.beads`.
   - The demo runs before the tray wakes, as the contract says: the intro, the ghost fills gap 1 while the tray sleeps, the goal, then the tray wakes with its chime.

   **Done** (integrator, patterns merge): 19.2 records all four, checked against `SPREAD_GAPS`, `playable`, `contrastFor`, `repeatFor` and the opening of ui/beads.ts.
5. **`docs/v4/2.3.md` section 23, Tjitse's iPad checks:** add the bead tree to the `?perf=1` check: the open gap's glow, the lit repeat and the finished necklace over the tree frame. The glows animate only opacity and transform, but the 34 draw calls measured so far do not cover the DOM.

   **Done** (integrator, patterns merge): section 23's frame rate check names the open gap's glow, the lit repeat and the finished necklace over the tree frame.

## For the quests-world lane (owner of the files named)

6. **`src/game/results.ts`, `resultFields`, the pattern branch:** add `demo: d.demo as Field` after `gap`, so the diag line of the ghost's first gap says `demo=1`. Why: section 19.2 says the demo gap logs `helped` with `demo: 1`; the game sets `detail.demo`, but the diag fields leave it out, so the Mac log shows the demo gap as a struggle.

   **Passed on** to quests-world (results.ts is its file). **Done** (integrator, quests-world merge): the pattern branch writes `demo`, tested in tests/results.test.ts.
7. **`flows/quest.flow.sh`, the bead tree:** the panel's names are `bead <shape>-<colour>` for the tray beads and `string` for the drop target; `state().moment` has `kind: 'beads'` and `gap` (0 to 2); `answer()` gives the right tray bead; `spec()` gives the string, gaps, tray and decoys by tray index. With `?fresh=1` the ghost fills gap 1 while the tray sleeps and the phase is `busy`; wait for `gap` 1 and the phase `open` (after the goal and the wake) before the first drag. A wrong bead: any `bead ` target that is not `answer()`.

   **Passed on** to quests-world (quest.flow.sh is its file). **Done** (integrator, quests-world merge): the names match; the flow waits for gap 1 and `open`, drags one wrong bead and expects beads1 to beads3, and fails when the moment does not open.
8. **Do not say `g4-beads`** in quests.ts before the bead tree's moment: the panel says it once a play. Saying it too makes her hear "A necklace for your baby!" twice.

   **Passed on** to quests-world. On main after this merge, quests.ts and game/beads.ts do not say `g4-beads`; quests-world keeps it that way. **Done:** still true after the quests-world merge.
9. **The bead tree's bubble** (`OFFER.beads` in quests.ts): section 17.2 asks for v3's bead picture tinted pink; step 0 shows it without a tint.

   **Passed on** to quests-world (quests.ts is its file). **Done** (quests-world lane): `OFFER.beads` has `tint: PALETTE.pink.pic`.

## Worktree setup (not code)

- In a worktree, `vite dev` answers 403 for the Andika font files: `node_modules` links to the main tree, outside the worktree's `server.fs.allow`. The built game is not affected.
- Inside the Claude Code sandbox `vite dev` does not see file changes; restart it after an edit.
