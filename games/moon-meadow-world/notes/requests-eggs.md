# Requests from the eggs lane to the integrator

The lane compiles and passes against the current integrator files. None of these blocks the merge.

## 1. `src/content/index.ts`: export the three sums

Add to the eggs export line:

```ts
export { eggSpec, eggSums, eggClipIds, eggCombos, gradeCombos, nextBand, totalOf, SUM_GRADES, type Band, type MathsUsed, type MathsPick } from './eggs.ts';
```

Why: `eggSums` is the 2.3 egg planner. Until it is exported, `src/game/maths.ts`, the eggs block of `src/ui/dev.ts` and the eggs block of `tests/content.test.ts` import it from `content/eggs.ts` directly. After the export they can use the barrel; that is a cleanup only.

## 2. `docs/v4/2.3.md` section 19.1: how "fresh across the play" works

Under **Fresh sums**, change "across the play `freshCombos` as in 2.2" to:

> Across the play the totals stay fresh as in 2.2 (this play's, then the last play's). The answers are planned per egg (`eggSums`, notes/maths.md), so an answer may repeat one from the other egg.

Why: the three sums of an egg are drawn together from a fitted plan, so the guess rules hold for every grade and every place in the egg (section 19.1, the learning review's blocker). Keeping the other egg's answers out as well would tilt that plan again (a first version broke the bounds, 42% for "nearest five").

## 3. `docs/v4/2.3.md` section 19.1: the heart line is said by the game

The doc has egg.ts say `g4-heart` after `await audio.fx('heart-glow')`. The ui gets every clip through its spec and `EggSpec.clips` has no field for it, so ui/egg.ts lights the heart, calls `react('heart')`, awaits `heart-glow` and then resolves; game/eggs-part.ts then says `CLIPS.heart`. The order and the timing are the same. Either note this in 19.1, or add `heart?: string[]` to `EggSpec.clips` in `src/contracts.ts` if the line should move into the ui.

## Not a request, for the merge

- `flows/smoke.flow.sh` (quests-world) fails at "band B stones": `?at=egg2&maths=b` opens the egg's easy sum, which has 4 stones in every band. Its check must answer the easy sum (and the middle one when it comes second) and then expect 5 stones on the hard sum. A scratchpad copy with only that change passed at 1080 x 740:

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
- In a worktree, `games/moon-meadow-home/dist-test-gate` (v3's test build, not in git) is missing, so the flow server answers 404 for every v3 clip and `no_missing_clips` fails. I built it in the worktree (`npm run build:test -- --outDir dist-test-gate` in games/moon-meadow-home, gitignored) to run the level flow and removed it afterwards. `run.sh` belongs to quests-world; it could build it when it is missing.
