# Requests from the quests-world lane (2.3.0)

Changes this lane needs in files it does not own, and seams with other lanes that the integrator should check at the merge. The lane compiles and its tests pass against the step-0 files as they are.

## Integrator-only files

1. **`src/contracts.ts`, `World.pick` comment.** The comment lists the pick priority as "door, slide, nest, rack, picnic, gazebo, pond, ground". Change it to "door, slide, nest, rack, picnic, corner, beads, sign, gazebo, pond, ground". Why: `world/pick.ts` now picks the Dressing Corner, the bead tree and the saddle sign before the gazebo (the trunk and the mirror stand on the gazebo's step). Comment only; no type changes.

   **Done** (integrator, quests-world merge): the comment lists door, slide, nest, rack, picnic, corner, beads, sign, gazebo, pond, ground.

2. **`src/contracts.ts`, `Layer.board`.** No change needed, but note: `corner.ts trunkTap` keeps the 3D lid open for 3.5 s even when `board()` resolves early (the step-0 stub resolves at once), so the board and the lid stay in step whatever the panel does.

   **Done, no change** (integrator): noted; the quest flow's trunk tap checks the lid and the board together.

3. **`CHANGELOG.md`.** The `kind=play` line's `v` is the build's version (`__MMW_VERSION__`, the newest CHANGELOG entry without its v). It reads 2.3.0 once the 2.3.0 entry is written (22.3 step 8); until then it says 2.2.0.

   **Done** (22.3 step 8): the 2.3.0 entry is written, so the start screen and the `kind=play` line's `v` say 2.3.0.

4. **`src/test-hook.ts` `legacy()` and its import of `wardrobe-legacy.ts`.** Kept on purpose: `flows/dress.flow.sh` (wardrobe-ui) still reads it. Section 22.3 step 4 gives its removal to the integrator: delete `legacy()` and the `legacyOf` import in `src/test-hook.ts` together with `wardrobe-legacy.ts`. This lane has no other import of it.

   **Done** (integrator, 22.3 step 4): `legacy()` and its import are gone, and `src/wardrobe-legacy.ts` and `tests/wardrobe-legacy.test.ts` are deleted. Nothing imported them any more; `dress.flow.sh` reads 2.3 ids.

## Seams with other lanes

5. **The gate's kind (reading).** `corner.ts gateWish` asks `planWish(g, 'phrase', part, { wish: false })` first. When that gives a phrase, the read is a phrase. When it gives a `dress` spec, or throws (an Emma-only filter with no pairs makes step 0's `pick()` throw), the gate calls `planWish(g, 'dress', part, { wish: false })` itself for both reads, logs `gk=word` and plays "Your baby wants to dress up like you!" first (2.3 section 18). Tested in `tests/world-quests.test.ts` for both planner answers. So the Corner opens whichever way the reading lane builds the fallback. If the reading lane exports a predicate instead (for example `phraseGateReady()` from `src/content/index.ts`, the integrator's file), switch `gateWish` to it at the merge and keep the try as a guard.

   **Done another way** (integrator): the reading lane's `planWish(g, 'phrase', ...)` already gives the dress-up word wish with `g4-dress-up` at the start of its intro (17.4). With the lane's `gateWish` she heard the line twice on the first read, and read 2 had none. `gateWish` now always calls `planWish(g, 'phrase', ...)` and says nothing of its own. Only when the planner throws does it plan the dress-up word wish itself, with the same intro. `gk` starts from `gateKind(g)`. The test now uses the real planner with `gateKind` 'word' and checks one `g4-dress-up` at the start of each read's intro.

6. **`giftSwatchUrl` (wardrobe-ui, `src/ui/swatches.ts`).** The step-0 picture has no `xmlns` on its `<svg>`, so as a data URL in an `<img>` it shows a broken picture: the trunk bubble after a gift shows the browser's "?" icon. The trunk bubble and every `badge` use `giftSwatchUrl`. The wardrobe-ui lane's `svg()` for gift pictures needs `xmlns="http://www.w3.org/2000/svg"` (the inline swatches do not).

   **Done** (wardrobe-ui lane): `giftSwatchUrl` adds `xmlns` before it makes the data URL.

7. **The bead tree's flow names (patterns).** `flows/quest.flow.sh` plays the bead moment when it opens (`moment.kind === 'beads'`, `moment.gap`, `answer()`), drags tray targets named `bead …` onto the first target named `string…`, and expects results `beads1:m:helped:0`, `beads2:m:missed:1`, `beads3:m:first:0` (the ghost fills gap 1 on a first visit). With the step-0 stub it says so and checks only the jewel gift. Adjust the names in that block if the patterns lane names its targets otherwise.

   **Done** (integrator): the names match (`bead <shape>-<colour>`, `string`). The block now fails when the bead moment does not open, and the flow taps the gift card (`pick_gift`) after every quest, as the real picker waits for her. The rotation step plays the three gaps (`answer_beads`). The bead tree is also measured at 1080 x 810 and 1024 x 690 (patterns request 3).

8. **The music box's end (wardrobe-ui).** The quest flow waits for the 5 s music box to end the Corner when `snapshot().wardrobe.box` exists; with the 2.2 panel (no `box`) it taps Done. No change needed once the wardrobe-ui lane is merged.

   **Done** (integrator): the panel has its music box. The flow runs the Corner with `?box=20`, checks `skip()` as soon as the wardrobe opens and measures the three sizes inside it; with 5 s the box ended during the resizes and `skip()` then ended free play. The box ends the Corner.

9. **The sticker line (looks, `src/game/save.ts`).** Section 17.2 says Lumi says `lumi4-sticker` "the first time the quest's own set is full, before the picker". Knowing "the first time" on a later play needs a saved list of stickers, which the save does not have. Built instead: Lumi says it right after the pick that fills the set the gift came from (items left before the pick, none after: `fillsSet` in `quest-kit.ts`). That is once per set, also for a set a quest pays from after its own is full, and never again on later gifts (tested). If the doc's timing is wanted, add `seen.stickers: GiftSet[]` to `save.ts` and this lane moves the line in `giveGift`.

   **Done another way** (integrator): kept as built. Section 17.2 now says the line comes after the twirl of the pick that takes a set's last item (`fillsSet`), once per set, with no save field.

## Changes in this lane that other lanes may notice

10. **`PICNIC.hamper` moved from (-12.7, 4.4) to (-12.7, 5.3), and `PICNIC.seats` from z 4.1 to 4.25** (`src/layout.ts`): the Corner's close-up camera stands over the rug, and at 2.2's spots the hamper's handle and the east cushion's back edge and pompoms stood in the bottom of the wardrobe picture. The rug's two back tassels are gone too: the north-east one showed as a gold blob under the panel. `tests/world-places.test.ts` now projects every raised part of the picnic into the Corner's body frame at 1080 x 740, 1080 x 810 and 1024 x 690 and allows it only behind the panel (with `portraitFrame`, `panelLeftOf` and `wardrobeLayout().panel`, the wardrobe-ui lane's). If that lane changes those functions or the panel's place, keep this test on the new ones. The picnic pick box follows the hamper; her picnic spot stays outside it.

   **Done, noted** (integrator). The wardrobe-ui functions the test uses are as merged; the test passes on main.

11. **`flows/run.sh`** serves the main checkout's `games/moon-meadow-home/dist-test-gate` (read only, an absolute `MOON_DIST`) when the checkout has no v3 test build, as lane worktrees have none. Before this, every flow in a worktree failed on v3's missing clips.

   **Done, noted** (integrator).

12. **`QUEST_CUTOFF_MS` is now 90 s of free time without dressing** (was 180 s of wall time) and lives in `src/game/quest-kit.ts` with `FREE_PLAY_MS`; `quests.ts` re-exports both.

   **Done, noted** (integrator): this is section 17.3.

13. **The walk-near trigger fires when she comes to a quest's place**, not while she still stands where the last quest left her, and the nearest place wins (the Corner's spot is 1.9 m from the picnic rug).

   **Done, noted** (integrator).

14. **`flows/level.flow.sh` (eggs) expects the 2.2 bubbles.** Its free-play step checks `quests.offered` sorted against `["picnic","rack"]`. In 2.3 a first play (a fresh save) offers the picnic and the bead tree (17.2 rotation), so that line must become `["beads","picnic"]`. This lane cannot edit the file; the eggs lane or the integrator changes the expected value.

   **Done** (integrator): the level flow expects `["beads","picnic"]` and passes at 1080 x 740.

15. **Gate reads and the word level (reading, `src/game/moments.ts`).** The gate's reads go through `runWish`, which calls `noteReading` and folds `save.reading`, and `planWish` takes the word level. Sections 14.4 and 18 say gate reads move only the phrase level (`save.phrases`) and never the word level. This lane does not own `moments.ts`. After the reading merge, check that a gate read plans at `save.phrases` and that a gate miss moves `save.phrases` and leaves `save.reading` as it was (a test in `tests/world-quests.test.ts` or the reading lane's tests). If the reading lane put the phrase path somewhere other than `runWish` and `planWish`, `corner.ts gate()` must call it.

   **Done** (integrator): the reading lane's `noteReading(g, outcome, spec.kind)` folds a phrase read into `save.phrases` only. A new test in `tests/world-quests.test.ts` runs the Corner with `?phrases=all`: both reads plan at `save.phrases` (2), two misses move it to 1 and `save.reading` stays at 3. A dress-up word read before Emma's check is a word read planned at the word level, and it moves the word level, as the reading lane built it.

16. **The Corner wardrobe's budget with the real 2.3 look (actors, after their merge).** The numbers in `notes/world.md` (33 to 34 calls, 66,000 to 68,400 triangles) were measured with the legacy actors, which draw 2.2's parts: no toe tips, jewels or flower crown. Section 17.1 says the busiest 2.3 look at the step was never measured. Add to the post-actors checklist: run `quest.flow.sh` at 1080 x 740 (it also resizes to 1080 x 810 and 1024 x 690 in the wardrobe) and read `budget the Corner wardrobe` at all three sizes against 80 calls and 100,000 triangles.

   **Done** (integrator): with the real 2.3 actors and the busiest look the Corner wardrobe draws 34 to 35 calls and 65,729 to 67,705 triangles at 1080 x 740, 1080 x 810 and 1024 x 690. notes/world.md has the numbers.

17. **`docs/v4/2.3.md` section 17.5, `co` and `cv`.** `co` is now the Corner's dressing time (its music box, `clock.dressMs.corner`), so `dr` is `mi` + `co` and none of it overlaps `ck`. The whole Corner visit (the walk, the gate, the gift and the wardrobe) has its own key, `cv`. Add `cv` to the doc's list of `kind=play` fields. The busiest line stays under 400 characters (tested).

   **Done** (integrator): 17.5 lists `dr` as `mi` + `co`, `co` as the Corner's dressing, and `cv`.
