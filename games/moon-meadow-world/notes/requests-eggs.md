# Requests from the eggs lane to the integrator

The lane compiles and passes against the current integrator files. None of these blocks the merge.

## 1. `src/content/index.ts`: export the three sums

Add to the eggs export line:

```ts
export { eggSpec, eggSums, eggClipIds, eggCombos, gradeCombos, nextBand, totalOf, SUM_GRADES, type Band, type MathsUsed, type MathsPick } from './eggs.ts';
```

Why: `eggSums` is the 2.3 egg planner. Until it is exported, `src/game/maths.ts`, the eggs block of `src/ui/dev.ts` and the eggs block of `tests/content.test.ts` import it from `content/eggs.ts` directly. After the export they can use the barrel; that is a cleanup only.

**Done** (integrator, eggs merge): index.ts exports `eggSums`, `gradeCombos` and `SUM_GRADES` as written. The direct imports may stay; the eggs lane decides.

## 2. `docs/v4/2.3.md` section 19.1: how "fresh across the play" works

Under **Fresh sums**, change "across the play `freshCombos` as in 2.2" to:

> Across the play, a sum whose total the other egg asked gives way to one with the same place and answer, the same heard number as the answer or not and the same take-away from 10 or not, while there is one (`freshCell`, notes/maths.md). An answer may repeat one from the other egg. The eggs do not leave out the last play's totals; the plan's spread bound keeps a sum from coming back. The hay rack keeps 2.2's `freshCombos`.

Why: the three sums of an egg are drawn together from a fitted plan, so the guess rules hold for every grade and every place in the egg (section 19.1, the learning review's blocker). 2.2's rule moved a sum to any fresh sum with the same answer, which pushed the snow egg onto the totals the warm egg cannot ask: 65% of its easy sums started from 10, and in 30% the answer was the number she had just heard (the adversarial review of this lane). Leaving the last play's totals out as well pushed snow hard B onto 16 - 10, twice its even share.

**Done** (integrator, eggs merge): 19.1 Fresh sums now says this, with "a sum whose total was asked earlier in the play" in place of "the other egg", because `freshCell` checks every total in `used.totals` (the hay rack's too).

## 3. `docs/v4/2.3.md` section 19.1: the heart line is said by the game

The doc has egg.ts say `g4-heart` after `await audio.fx('heart-glow')`. The ui gets every clip through its spec and `EggSpec.clips` has no field for it, so ui/egg.ts lights the heart, calls `react('heart')`, awaits `heart-glow` and then resolves; game/eggs-part.ts then says `CLIPS.heart`. The order and the timing are the same. Either note this in 19.1, or add `heart?: string[]` to `EggSpec.clips` in `src/contracts.ts` if the line should move into the ui.

**Done** (integrator, eggs merge): noted in 19.1 The hearts. No contract field: the order and timing are the same, and contracts.ts stays frozen.

## 4. `docs/v4/2.3.md` section 19.1: three more guess rules

Under **Guess rules**, add:

> "The number she just heard" (the warm cups, the snow egg's need) wins at most blind odds (25% with 4 stones, 20% with 5), per kind, grade, band and sum position. At most 40% of the snow egg's easy sums take away from 10. No sum comes up more than 1.5 times its even share of its grade.

Why: `tests/maths.test.ts` checks these since the review. Without them the plan gave 10 - 5 = 5 and 8 - 4 = 4 (the answer is the need she heard) to 30% of snow easy sums, and 10 - 4 to 22%.

**Done** (integrator, eggs merge): the three rules are in 19.1 Guess rules as written. Checked against tests/maths.test.ts (1 / stones, 0.4, 1.5 even shares).

## Not a request, for the merge

- `flows/smoke.flow.sh` (quests-world) fails at "band B stones": `?at=egg2&maths=b` opens the egg's easy sum, which has 4 stones in every band. Its check must answer the easy sum (and the middle one when it comes second) and then expect 5 stones on the hard sum. The eggs merge comes before patterns and quests-world, and 22.3 runs the smoke flow after every merge, so the integrator applies this patch at the eggs merge and quests-world rebases onto it. A scratchpad copy with only that change passed at 1080 x 740:

  **Applied** (integrator, eggs merge): `flows/smoke.flow.sh` has this loop. It is a quests-world file; quests-world keeps it when it rebases. The smoke flow passes at 1080 x 740.

  ```sh
  check_targets "$(moment_targets)"
  for k in 1 2 3; do
    [ "$(val "() => window.__game.spec().grade")" = hard ] && break
    expect_eq "$(val "() => JSON.parse('$(stones_of)').length")" 4 'easy and middle stones'
    drag "$(hook 'answer()')" cups
    wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'egg' && m.round && m.round.index === $k && m.phase === 'open'; }" 40
  done
  check_targets "$(moment_targets)"
  expect_eq "$(val "() => JSON.parse('$(stones_of)').length")" 5 'band B stones'
  ```

- `flows/level.flow.sh` (this lane) still expects the free-play bubbles `["picnic","rack"]`. After quests-world's rotation the first play offers the bead tree, so that line becomes `["beads","picnic"]` when quests-world merges.

  **Done** (integrator, quests-world merge): the level flow expects `["beads","picnic"]` and passes at 1080 x 740.

- In a worktree, `games/moon-meadow-home/dist-test-gate` (v3's test build, not in git) is missing, so the flow server answers 404 for every v3 clip and `no_missing_clips` fails. I built it in the worktree (`npm run build:test -- --outDir dist-test-gate` in games/moon-meadow-home, gitignored) to run the level flow and removed it afterwards. `run.sh` belongs to quests-world; it could build it when it is missing.

  **Done** (quests-world lane): `run.sh` serves the main checkout's v3 test build, read only, when the worktree has none.
