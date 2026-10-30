# Maths: notes

The eggs and the hay rack. 2.3.0 gives each egg three sums (docs/v4/2.3.md sections 12 and 19.1). The hay rack asks one sum (docs/v4/2.2.md section 4). Since 29 October 2026 every sum, answer and stone is 10 or less, as at her school.

## What is where

| Path | What it is |
|---|---|
| `src/content/eggs.ts` | The sums and their trays. `GRADES` (the grade table of 19.1), `gradeCombos`, `gradeTray`, `gradePlaces`, `eggSums` (an egg's three sums), and `RANGES`, `eggSpec`, `pickSum` and `freshCombos` (the hay rack's one sum, and the ui harness's). The stone rules, the clips and `allEggClipIds`. |
| `src/content/rack.ts` | The hay rack: `rackSpec` (a warm 2.2 sum with skin `hay` and v3's hay lines). |
| `src/game/maths.ts` | `eggAsk`, `planEggs` (an egg's three sums from its stream, each used for the play), `noteMaths` (the result line, and the band move for the hard sum and the rack only), `movesBand`. |
| `src/game/band.ts` | The band (A or B), `?maths=`, and the play's used totals and answers. |
| `src/game/eggs-part.ts` | The egg part: walk, frame, the three sums with the background held silent, the hatch with `egg-crack`. |
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
| snow | middle | 9 | 3 to 6 | 9 | 3 to 6 | 4 | 4 |
| snow | hard | 10 | 3 to 7 | 10 | 3 to 7 | A 4, B 5 | 5 |
| hay rack | one sum | A 7 to 9, B 8 to 10 | as total | A 3 to 6, B 3 to 7 | A 3 to 6, B 3 to 7 | A 4, B 5 | 9 or 12 |

- The hard sum is the bond to 10. The snow middle sum asks 9 - 6 again since 2.3.1: Tjitse accepted the take of `num-take-9-6` that speech-to-text heard as "takeaway" (docs/v4/2.3.md section 19.1).
- Stones are 2 to 9; the answer is 3 or more. A 2 is only a wrong stone (the slip of a 3, or a near guess). Without it an answer of 3 is always the smallest stone and the easy sums never reach the biggest place.
- In the easy sums, leaving out the 2 and taking the smallest stone wins about half the time. Tjitse accepts this for now and watches her first tries: the egg result lines' `gr` and `o` (section 19.1).

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

- The first sum's intro is the kind's intro on the first egg of a kind, then `g4-hearts` "Fill all three hearts, and the egg will hatch.". The ui says the hearts line before the play's first egg only (2.3.2, `eggOpening`). Sums 2 and 3 have no intro; "Drag one stone to the nest." comes only on the first warm egg's first sum.
- The stones wake when the goal's two numbers are said (2.3.2). The snow egg's "Drag the snow stone that cools the extra cups." (`clips.ask`) follows with the stones awake. The star egg's question is the end of its goal, so its stones wake after the question (2.4.0).
- After the first and the second sum: one line, the fact, while the heart lights (2.3.2). No effect and no praise. After the third: the praise, the fact, the heart with `heart-glow`, the hatch. `g4-heart` "A happy heart!" is said no more; build-lines.ts keeps its clip.
- Every clip of every reachable sum is v3's or the demo's. The sums within 10 added `num-egg-3`, `num-take-7-4`, `num-take-8-5` and `num-take-10-7` (29 October 2026), and 2.3.1 added `num-take-9-6`. The snow egg's goals and facts past ten stay in lines.json as a reserve (`PAST_TEN` in tools/build-lines.ts).

## Sounds

- `heart-glow`: the third heart lights (ui/egg.ts), before the panel leaves (2.3.2: not between sums). No fallback, so it is silent until its file is made.
- `egg-crack`: the hatch, ducked under Lumi's "It's hatching!", fallback the synthesised `hatch`.
- `hay-rustle`: the first hay bundle lands (ui/hay.ts); the praise or miss line after the pile awaits it.

## 2.4.0: the star egg (docs/v4/2.4.md section 5.5)

- A trail egg is a star egg: the moon has 7 or 8 stars (easy), 9 (middle) or 10 (hard), the egg at least 3, the difference 3 to 7. It is the snow egg's grade table with the moon's stars as `have` and the egg's as `need`, so its plan, its trays and its heard number (the egg's) are the snow egg's. 14 sums.
- Each sum asks "How many more has the moon?" or "How many fewer has the egg?" (`compare`), as the last line of its goal: the stones wake after it, so a stone grabbed on the wake chime never cuts the question (2.4-plan Task 16). `starCompares` draws one of the six orders that ask both, from the egg's stream, after the sums, so the star egg's questions never shift its sums and the warm and snow eggs draw exactly as before.
- The fact after the right stone is `num-take-<moon>-<egg>` ("Nine take away five is four!"). All 14 were made for the snow egg.
- The panel (`src/ui/stars.ts`): the moon's stars on a night sky under Lumi's crescent, the egg's beside v3's star egg (`items/egg-sparkle.webp`), scattered in three rows or more and a star apart (`geometry.ts starSpots`), never in rows or a ten-frame. A dropped stone or the focused hint ("Let's line up the stars.") lines them up for good, each egg star under a moon star with a link, and the moon's extra stars stand out; the stone's sparkles land on the extra stars one by one, spare sparkles bounce past the row, a short stone leaves the others shaking. The hint counts the extra stars. The stones are the snow stones in gold.

## 2.4.0: no sum twice in a play (docs/v4/2.4.md section 5.3)

- `MathsState.asked` (`game/band.ts`, filled by `useSum`): per kind and grade the answers asked, every sum asked ('need/have') and every take-away fact said by a snow or star egg. The hay rack's sum counts as a warm sum of its total's grade (7 or 8 easy, 9 middle, 10 hard). `eggAsk` passes it to every egg and to the hay rack.
- An egg leaves out, per grade, every sum whose answer its kind asked in that grade, and a snow or star egg every sum whose fact was said. The plan of that set is fitted again as the full plan is (`plannedFor` in `content/eggs.ts`), and cached per kind, band and left-out set. A grade whose refit misses (`fit.offs` over 1e-5) leaves out only the sums and facts asked, not their answers (only the easy grade has a difference: its answers 3 and 4 have two sums each). Answers in no triple of three different answers go too, so the fitting never meets a place nothing can fill.
- A refit that still misses ends with rounds of the guess caps (nearest five, the number heard, the hard sum's live ends) with each place kept within 6 points of its share (1/n for the hard sum, the full grade's share for easy and middle), but not the spread of its few sums. Where those cannot all hold, rounds of the guess caps alone follow, so the guesses come before the places. A fit that would run to zero stops at its last usable round.
- The hay rack leaves out every warm sum asked this play, also when every fact was asked (`freshCombos`).
- `prepareEggPlans(g)` (the hub at each refill) fits the plans of the eggs the shown bubbles can start. In the browser it starts 1.8 s later, after the bubbles have popped in, and fits one kind per idle task, each only while she stands and no place runs (else it looks again 0.7 s later), with what the play has asked at that time. A newer refill drops the older queue. Measured on a Mac: median 2 ms and p95 28 ms for the three kinds together, nothing for a cached plan; her iPad is slower. An egg whose plan was not fitted yet fits it as it opens, after the walk.

Measured over 10,000 eggs each (`tests/maths.test.ts`, both bands): a second star egg after a snow egg and a star egg, a star egg after a snow egg, a nest egg after the hay rack, a shore egg after one and after two star eggs, and the first star egg. Every simple guess stays under 35% with 4 stones and 30% with 5 (highest: lower middle 33.4% on the second star egg's easy sum, band B), the heard number under blind odds, the hard sum's live ends at most 32.6% (4 stones) and 29.6% (5).

**Open for Tjitse: the hard sum's places on a second egg.** 19.1 keeps each place of the hard sum within 7 points of even (1/n). That holds for the first egg of each kind, the nest egg after the hay rack, the shore egg after one star egg, and band A of a star egg after a snow egg and of a shore egg after two star eggs. It does not hold where two take-away eggs (or a snow egg in band B) leave the hard grade three or four sums: the second star egg after a snow egg and a star egg (band A: the lower middle place 32.5% against 25%; band B: the biggest place 10.8% against 20%), a star egg after a snow egg in band B (the biggest place 12.4%), a shore egg after two star eggs in band B (11.0%). The tests check 10 points of room there. The cause: a snow sum's fact takes a star sum away and the other way round (a snow 10 - 4 = 6 says "ten take away four", the star sum with 4 egg stars), so the design's "2 easy, 3 middle and 4 hard answers left" for a second star egg is too high. No simple guess gains from it (no place wins more than a guess may), so the learning cost is small.

**Open for Tjitse: the same two numbers in a snow sum and a star sum.** Design 5.3 leaves out the take-away facts said, not the sums with the same numbers. So a star sum can repeat a snow sum's two spoken numbers and answer: the snow egg's "needs four warm cups, nine cups are warm" (answer 5, fact `num-take-9-5`) and the star egg's "the moon has nine stars, the egg has four stars" (answer 5, fact `num-take-9-4`). Measured: in about 53% of plays with a shore egg and one ride, 89% with two rides. Leaving those sums out as well was tried and breaks the 19.1 guess rules: a shore egg after two star eggs then lets nearest five win 56.8% and the heard number 54.3% of its hard sums (limit 35% and 25%), and a second star egg's easy and middle sums reach 39 to 41%. Within 10 each take-away grade has only 4 or 5 sums, too few for three take-away eggs a play without repeats of this kind. The code keeps the design's rule; Tjitse decides (for example, at most one ride with a star egg after a shore egg, or the star egg's own sums).
