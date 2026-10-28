# Requests from the patterns lane

Changes the patterns lane needs in files it does not own. The lane compiles and passes its tests without them.

## For the integrator

1. **`src/contracts.ts`, `PatternDecoy`: add `'other'`.** Change `export type PatternDecoy = 'copy' | 'unit' | 'colour' | 'shape';` to `export type PatternDecoy = 'copy' | 'unit' | 'colour' | 'shape' | 'other';` and the comment to "... its colour or its shape only, or nothing it shares (an ABC cross bead)". Why: in ABC the one cross bead can share neither shape nor colour with a gap's bead, so it fits none of the four kinds. Today it has no entry in `decoys`, which the result line shows as a bare bead in `tried`. After the change, `decoysAt` in `src/content/patterns.ts` sets `'other'` there (one line) and the decoy test expects it.
2. **`docs/v4/2.3.md` section 19.2, the tree frame.** Change "`frameAt` the tree (centre 0.4 m west, 6 m wide, the tree top at 28%)" to "`frameAt` between her, the baby and the tree (centre 1.2 m west and 0.6 m south of the tree, 8.5 m wide, the tree top at 30%)". Why: measured at 1080 x 740, the 6 m frame puts the baby's head at y 735 of 740 and her feet below the screen (the view shift is clamped at 0.35). The lane uses the new frame (`TREE_FRAME` in `src/game/beads.ts`, notes/patterns.md).
3. **`docs/v4/2.3.md` section 19.2, two calls to record.** No gap at place 0 (no bead on its left to go on from), and the three gaps never all take the same bead. Both are tested in `tests/patterns.test.ts`.

## For the quests-world lane (owner of the files named)

4. **`src/game/results.ts`, `resultFields`, the pattern branch:** add `demo: d.demo as Field` after `gap`, so the diag line of the ghost's first gap says `demo=1`. Why: section 19.2 says the demo gap logs `helped` with `demo: 1`; the game sets `detail.demo`, but the diag fields leave it out.
5. **`flows/quest.flow.sh`, the bead tree:** the panel's names are `bead <shape>-<colour>` for the tray beads and `string` for the drop target; `state().moment` has `kind: 'beads'` and `gap` (0 to 2); `answer()` gives the right tray bead; `spec()` gives the string, gaps, tray and decoys by tray index. With `?fresh=1` the ghost fills gap 1 before the tray opens for gap 2 (`gap` turns 1 and the phase `open`). A wrong bead: any `bead ` target that is not `answer()`.
6. **The bead tree's bubble** (`OFFER.beads` in quests.ts): section 17.2 asks for v3's bead picture tinted pink; step 0 shows it without a tint.

## Worktree setup (not code)

- In a worktree, `vite dev` answers 403 for the Andika font files: `node_modules` links to the main tree, outside the worktree's `server.fs.allow`. The built game is not affected.
- Inside the Claude Code sandbox `vite dev` does not see file changes; restart it after an edit.
