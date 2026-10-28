# Requests from the looks lane

## Integrator-only files

No code change. `src/contracts.ts`, `src/content/clips.ts`, `tools/lines.ts` and the other integrator files stay as they are; the colour word clips (`word-pink` and the rest) already have their lines. Two requests for `docs/v4/2.3.md`:

- **Record the earn order (section 15, "Shapes", or section 16, "Owned only").** The doc says "earned items come last in every rail". The lane goes one step further: earned items come in the order she earned them, not in catalogue order. Catalogue order moves a cell she knows when the gifts come out of order (a heart crown, then a tiara, pushes the heart one cell on). Suggested line: "Earned items come last, in the order she earned them (`Owned` keeps that order), so a new one never moves a cell she knows." Without it, a later lane may sort `ownedOptions` by catalogue order to match the doc and bring the moving cell back.
  - **Done (integrator, at the merge).** Section 15 "Shapes" now says it, with the heart and tiara example.
- **Decide on the crown band before shade tuning (section 15, "The crown on her hair").** `crownOutline` checks the hair base only, as the doc says. Against the band (the crown colour's `small` shade) 40 of the 216 pairs are under 1.3: a white crown has white gems on a white band on 13 of the 18 hair colours (contrast 1.00), and a lilac crown on sunny hair is 1.07. On her default sunny hair no crown gets white gems; most get dark gold. One option: skip a candidate under about 1.3 against the band, and test both contrasts. The lane changes nothing until the doc says so.
  - **Done (integrator, at the merge): no band rule.** The outline's job is to set the crown off from her hair, and gems in the crown's own colour read as a one-colour crown. Section 15 now says the band is not checked, names the white crown and the lilac crown on sunny hair (dark gold gems), and asks the shade tuning after actors (22.3) to look at those crowns in the renders. `crownOutline` and its tests stay as they are.

## For other owners (pass on when you merge)

- `README.md` (quests-world): the save paragraph still names the key `mmw.save`. Since 2.3.0 it is `mmw.save2`; `mmw.save` is 2.2's, read only when `mmw.save2` is missing or broken, and never written or removed.
  - **Passed on** to quests-world in the merge report. The integrator does not edit README.md.
- wardrobe-ui and quests-world: `railsOf` and `ownedOptions` now show earned items in the order she earned them, after the start items, not in catalogue order (notes/looks.md). A test that builds `owned` with `withItem` in catalogue order sees no difference.
  - **Passed on** in the merge report, and now in section 15 of the doc.
- wardrobe-ui: `wordOf('eyes', id)` now gives the colour word for blue, green and brown eyes (section 15). The other eye colours give nothing.
  - **Passed on** in the merge report. This is what section 15 already says.

## Flows in this worktree (setup, not code)

- Port 8791 is held by a `python3 -m http.server` from another project (pid 55621, since 22 October). The lane ran its flows on 8799 with `MMW_SESSION=mmw-looks` (22.5 allows any free 87xx).
  - **Passed on** in the merge report. The integrator does not stop another project's server.
- The worktree has no `games/moon-meadow-home/dist-test-gate/` (v3's test build, gitignored), so serve.ts finds none of v3's clips. Smoke and dress at 1080 × 740 passed every step and then failed only in `finish`, on "missing clips without a line" (the v3 clips). Each lane worktree needs that build, or a link to the main tree's, before its flows can pass.
  - **Done (integrator, at the merge).** Section 22.2 now says each worktree links the main tree's `dist-test-gate`. The main tree has the build, so main's flows are not affected.
