# Maths: notes

The eggs and the hay rack. 2.3.0 gives each egg three sums (docs/v4/2.3.md sections 12 and 19.1). The hay rack keeps 2.2's one sum (docs/v4/2.2.md section 4).

## What is where

| Path | What it is |
|---|---|
| `src/content/eggs.ts` | The sums and their trays. `GRADES` (the grade table of 19.1), `gradeCombos`, `gradeTray`, `gradePlaces`, `eggSums` (an egg's three sums), and 2.2's `RANGES`, `eggSpec` and `pickSum` (the hay rack's one sum, and the ui harness). The stone rules, the clips and `allEggClipIds`. |
| `src/content/rack.ts` | The hay rack: `rackSpec` (a warm 2.2 sum with skin `hay` and v3's hay lines). |
| `src/game/maths.ts` | `eggAsk`, `planEggs` (an egg's three sums from its stream, each used for the play), `noteMaths` (the result line, and the band move for the hard sum and the rack only), `movesBand`. |
| `src/game/band.ts` | The band (A or B), `?maths=`, and the play's used totals and answers. |
| `src/game/eggs-part.ts` | The egg part: walk, frame, the three sums with the background held silent, "A happy heart!", the hatch with `egg-crack`. |
| `src/ui/egg.ts` | The egg panel: the cups, the stones, the ladder, the hearts, and the panel kept between sums. |
| `src/ui/hay.ts` | The hay rack's skin, with `hay-rustle` as the bundles land. |
| `tests/maths.test.ts` | The grade table, the egg, the trays and the guess rules, the band, the clips. |

## Three sums per egg

| Kind | Grade | Total | Need | Have | Answer | Stones | Sums |
|---|---|---|---|---|---|---|---|
| warm | easy | 7 to 9 | 7 to 9 | 3 to 6 | 3 to 6 | 4 | 9 |
| warm | middle | 11 or 12 | 11 or 12 | 6 to 9 | 3 to 6 | 4 | 7 |
| warm | hard | 13 to 15 | 13 to 15 | A 5 to 9, B 3 to 9 | A 4 to 8, B 4 to 9 | A 4, B 5 | 12 or 15 |
| snow | easy | 7 to 10 | 4 to 7 | 7 to 10 | 3 to 6 | 4 | 10 |
| snow | middle | 11 or 12 | 5 to 9 | 11 or 12 | 3 to 6 | 4 | 8 |
| snow | hard | 13 and more | 7 to 10 | A 13 to 15, B 13 to 16 | A 3 to 6, B 3 to 9 | A 4, B 5 | 9 or 16 |

- Easy comes first; middle and hard follow in an order drawn from the egg's stream (`round.index` 0, 1, 2).
- The hard sum takes the band at the egg's start, so all three are planned when the egg opens. Easy and middle have no `band`.
- Only the hard sum and the hay rack move the band (`movesBand`). `?maths=a|b` fixes it.
- A jump to `egg2` plans egg 1's sums first (without asking them), so `?at=egg2&seed=5` asks what a whole play with seed 5 asks, when the band is the same.

## The egg plan (Claude's call)

The three sums of one egg never share an answer, and easy, middle and snow hard A all draw answers from 3 to 6. Planned one by one, the later sums lose places: after an easy 3, the middle sum has fewer ways to be the smallest stone. A first version planned each sum on its own and broke the bounds (snow hard A: "nearest five" 42%, "lower middle" 37%).

So `eggSums` draws a whole egg from a plan. A cell is one place and one answer of a grade (the sums that can show that answer there). A plan is one cell per grade with three different answers. Each kind and band has a few hundred plans, fitted once by iterative proportional fitting:

- each grade's places to `gradePlaces`: even over the places it can reach, and half a share for a place only one sum can reach (the warm easy answer is the biggest stone only as 9 = 3 + 6 on 3, 4, 5, 6);
- "the stone nearest five" at most 29% with 4 stones and 24% with 5 (`PLAN_FIVE_CAP`);
- no one sum above 22% of its grade (`PLAN_SUM_CAP`), so 12 = 6 + 6 does not come back play after play.

Then each cell picks one of its sums, fresh as 2.2's `freshCombos` says, and the tray as 2.2 does. Within a cell every sum has the same answer, so across the play only the totals can be kept fresh (this play's, then the last play's). An answer may repeat one from the other egg. The bounds hold for every grade and every place in the egg, whatever came before.

Measured over 10,000 plays per band (`tests/maths.test.ts` checks it): places at most 33.9% (snow hard A has three places), "nearest five" at most 29.8% with 4 stones and 21.2% with 5, every sum of every grade comes up, no sum above 26% of its grade.

## Clips

- The first sum's intro is the kind's intro on the first egg of a kind, then `g4-hearts` "Fill all three hearts, and the egg will hatch.". Sums 2 and 3 have no intro; "Drag one stone to the nest." comes only on the first warm egg's first sum.
- After the first and the second sum: the heart lights, `heart-glow` plays (awaited, at most 1 s), and the game says `g4-heart` "A happy heart!".
- The 19 new number lines of 19.1 and `g4-hearts` wait for the one `gen.sh` run. Every other clip of every reachable sum is v3's or the demo's.

## Sounds

- `heart-glow`: a heart lights (ui/egg.ts); every heart, the third too, before the panel leaves. No fallback, so it is silent until its file is made.
- `egg-crack`: the hatch, ducked under Lumi's "It's hatching!", fallback the synthesised `hatch`.
- `hay-rustle`: the first hay bundle lands (ui/hay.ts); the praise or miss line after the pile awaits it.
