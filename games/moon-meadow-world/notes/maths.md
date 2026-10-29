# Maths: notes

The eggs and the hay rack. 2.3.0 gives each egg three sums (docs/v4/2.3.md sections 12 and 19.1). The hay rack asks one sum (docs/v4/2.2.md section 4). Since 29 October 2026 every sum, answer and stone is 10 or less, as at her school.

## What is where

| Path | What it is |
|---|---|
| `src/content/eggs.ts` | The sums and their trays. `GRADES` (the grade table of 19.1), `gradeCombos`, `gradeTray`, `gradePlaces`, `eggSums` (an egg's three sums), and `RANGES`, `eggSpec`, `pickSum` and `freshCombos` (the hay rack's one sum, and the ui harness's). The stone rules, the clips and `allEggClipIds`. |
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
| warm | easy | 7 or 8 | 7 or 8 | 3 to 5 | 3 to 5 | 4 | 5 |
| warm | middle | 9 | 9 | 3 to 6 | 3 to 6 | 4 | 4 |
| warm | hard | 10 | 10 | 3 to 7 | 3 to 7 | A 4, B 5 | 5 |
| snow | easy | 7 or 8 | 3 to 5 | 7 or 8 | 3 to 5 | 4 | 5 |
| snow | middle | 9 | 4 to 6 | 9 | 3 to 5 | 4 | 3 |
| snow | hard | 10 | 3 to 7 | 10 | 3 to 7 | A 4, B 5 | 5 |
| hay rack | one sum | A 7 to 9, B 8 to 10 | as total | A 3 to 6, B 3 to 7 | A 3 to 6, B 3 to 7 | A 4, B 5 | 9 or 12 |

- The hard sum is the bond to 10. The snow middle sum leaves out 9 - 6 until `num-take-9-6` passes speech-to-text (docs/v4/2.3.md section 19.1).
- Stones are 2 to 9; the answer is 3 or more. A 2 is only a wrong stone (the slip of a 3, or a near guess). Without it an answer of 3 is always the smallest stone and the easy sums never reach the biggest place.

- Easy comes first; middle and hard follow in an order drawn from the egg's stream (`round.index` 0, 1, 2).
- The hard sum takes the band at the egg's start, so all three are planned when the egg opens. Easy and middle have no `band`.
- Only the hard sum and the hay rack move the band (`movesBand`). `?maths=a|b` fixes it.
- A jump to `egg2` plans egg 1's sums first (without asking them), so `?at=egg2&seed=5` asks what a whole play with seed 5 asks, when the band is the same.

## The egg plan (Claude's call)

The three sums of one egg never share an answer, and easy, middle and snow hard A all draw answers from 3 to 6. Planned one by one, the later sums lose places: after an easy 3, the middle sum has fewer ways to be the smallest stone. A first version planned each sum on its own and broke the bounds (snow hard A: "nearest five" 42%, "lower middle" 37%).

So `eggSums` draws a whole egg from a plan. A cell is one sum of a grade with its answer at one place of the tray. A plan is one cell per grade with three different answers; its weight is the product of the cells' factors. The factors are fitted once per kind and band by iterative proportional fitting. A grade's share of a cell is its factor times the weight of the other two grades' different answers, so the fitting takes about 5 ms per kind and band on a Mac. `game/maths.ts` fits all four when the page is first idle, so it never runs on the walk to an egg. The bounds:

- each grade's places to `gradePlaces`: even over the places it can reach, and a third or two thirds of a share for a place only one or two sums can reach (the easy answer is the biggest stone only as 8 = 3 + 5 or 8 - 5 on 2, 3, 4, 5), and never above 30% with 4 stones or 25% with 5 (only the snow middle grade, with its three sums, needs that cap);
- "the stone nearest five" at most 29% with 4 stones and 24% with 5;
- the number she heard (the warm cups, the snow egg's need) is the answer at most 21% with 4 stones and 15% with 5, under blind odds, so dragging the number Elizabeth just said never beats a blind guess (8 - 4 = 4, 8 = 4 + 4, 10 = 5 + 5);
- no sum above 1.4 even shares of its grade.

The answer 5 always wins "nearest five" and comes in one sum per grade, so the five cap and the spread cap meet there.

**Fresh sums.** Within 10 there are 4 totals (7 to 10) for 7 maths moments, so totals repeat. Both eggs ask 9 and 10, one adding and one taking away. The snow egg's easy sum gives way to one just like it with the other easy total: the same place and answer, the same heard number as the answer or not (`freshCell`). So freshness never changes a guess rule. 33% of snow easy sums still share the warm egg's easy total. The last play's totals are not left out (every play asks 9 and 10); the spread bound keeps a sum from coming back. The hay rack never asks a fact the play asked, a total with its answer in either direction (`freshCombos`: `used.totals[i]` and `used.answers[i]` are one sum).

Measured over 10,000 plays per band, one after another (`tests/maths.test.ts` checks it): every simple rule at most 30.3% with 4 stones and 22.1% with 5 per grade (30.6% and 22.4% per sum position), the heard number at most 20.8% with 4 stones and 14.8% with 5, every sum of every grade comes up, none above 1.45 even shares, and the hay rack in whole plays at most 28% (nearest five) with no fact repeated. The plans fit in 39 to 74 rounds.

## Clips

- The first sum's intro is the kind's intro on the first egg of a kind, then `g4-hearts` "Fill all three hearts, and the egg will hatch.". Sums 2 and 3 have no intro; "Drag one stone to the nest." comes only on the first warm egg's first sum.
- After the first and the second sum: the heart lights, `heart-glow` plays (awaited, at most 1 s), and the game says `g4-heart` "A happy heart!".
- Every clip of every reachable sum is v3's or the demo's. The sums within 10 added `num-egg-3`, `num-take-7-4`, `num-take-8-5` and `num-take-10-7` (29 October 2026). The snow egg's goals and facts past ten stay in lines.json as a reserve (`PAST_TEN` in tools/build-lines.ts).

## Sounds

- `heart-glow`: a heart lights (ui/egg.ts); every heart, the third too, before the panel leaves. No fallback, so it is silent until its file is made.
- `egg-crack`: the hatch, ducked under Lumi's "It's hatching!", fallback the synthesised `hatch`.
- `hay-rustle`: the first hay bundle lands (ui/hay.ts); the praise or miss line after the pile awaits it.
