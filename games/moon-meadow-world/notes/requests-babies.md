# Requests from the babies lane to the integrator

The lane compiles and passes against the current integrator files. None of these blocks the merge.

## 1. `src/game/hub-part.ts`: jump into an egg place's step with `eggPlaceStep`

The hub lane's `?step=naming|wish` jump (`eggStep` in hub-part.ts, as the review read it) calls 2.3.3's `naming(g, i)`
and `wish(g, i)`. The old `wish` still picks its kind by 2.3's rule (dress first, then `secondWishKind`), so
`?at=hub&place=shore&step=wish` plays a kind the 2.4 rule would not give. Call instead:

```ts
import { eggPlaceStep } from './eggs-part';
// spot 'nest' for place=egg, 'shore' for place=shore; step 'naming' or 'wish'. Returns the egg place's release.
const release = await eggPlaceStep(g, spot, step);
```

It finds the spot's snapped baby (named for `wish`), runs its naming for `naming`, then its first wish of the 2.4 kind
rule (`nextWishKind`) as `eggPlace` does, and resolves framed with `eggPlace`'s release. With no baby of that spot it runs
the whole egg place. Tested in tests/babies.test.ts ("jumps into an egg place at its naming or its wish").

## 2. `src/game/eggs-part.ts` and `src/game/level.ts`: delete 2.3.3's index-based `egg`, `naming` and `wish`

After request 1, and once the hub has replaced level.ts's 2.3 parts (`egg1`, `naming1`, `wish1`, `egg2`, `naming2`,
`wish2`), `grep -rn "\b\(egg\|naming\|wish\)(g" src tests` shows no caller. Then delete from `eggs-part.ts`:

```ts
export async function egg(g: Game, i: 0 | 1): Promise<void> { ... }
export async function naming(g: Game, i: number): Promise<void> { ... }
export async function wish(g: Game, i: number): Promise<void> { ... }
```

and the imports only they use (`secondWishKind`, `playQuests`, `walkTo`).

## 3. `src/game/moments.ts` and `tests/world-quests.test.ts`: delete `secondWishKind`

With request 2, when only the test at tests/world-quests.test.ts:344 still uses it, delete
`export function secondWishKind(offered: readonly string[]): 'bath' | 'picnic'` and that test. A baby's wish takes the
kind the play has read least (`wishKindFor`, design 5.3).

## 4. Guests: hatch order or newest first (your call)

Design 5.3 and the plan's Task 9 test title say the picnic, the bead tree and the Corner gate take "her newest named
babies". Step 0's contract test pins hatch order (tests/contracts-24.test.ts:166-169: with babies 13 and 14,
`guests(g, at, 1)` is baby 13), so `guests` keeps hatch order. The review says the mount lane's ride takes the newest
first. With 4 babies, babies 13 and 14 then always go to the places and the two trail babies never do. Either:

- newest first: change the contract test to `['baby-14', 'baby-13']` and `['baby-14']`, and in `src/game/guests.ts`
  `for (const b of g.babies) take(b.unicorn);` becomes `for (const b of [...g.babies].reverse()) take(b.unicorn);`
  (tests/babies.test.ts "takes her babies in hatch order" needs only its title changed, as it has one baby); or
- hatch order: change design 5.3 to "her babies in hatch order".

## 5. Herd wishes log as `wish-herd-<k>` (please confirm)

Plan Task 9 Step 3 says a herd baby's wish has the result line `wish-<n>`. The lane logs it as `wish-herd-<k>` (k counts
herd wishes this play), because `wish-<n>` is the newborns' stream and part by baby: a herd wish and a later newborn
would share a stream and a result part. Please confirm, change the plan's Task 9 text to match, and tell the hub lane
before `long.flow.sh` counts wish lines.

## 6. For Tjitse, not blocking: the words or the level for a level 3 reader's later reads

Every dress-up, pond and picnic read leaves out the play's earlier words of its kind (design 5.3). With 2.4's more
reads a play, a level 3 reader's third dress-up wish plays as level 2 (the review found this in 300 of 300 seeds, and
for the second dress-up wish in 47), and so does a fourth picnic read. Its line logs `level: 2`, and its result
still folds into her reading level; level 3 is the top, so it can only delay a drop, as the warm-up does. The lane
keeps 2.3.2's order (words first), which tests/reading-level.test.ts:200-212 pins. To keep the level first instead, `planWish` would plan again leaving
out only the play's earlier targets when the level drops, and that test would change.

## 7. For Tjitse, not blocking: a spoken stone line for a star egg that is the play's first maths moment

`first` is per egg kind (design 5.3). The warm egg says "Drag one stone to the nest." and the snow egg "Drag the snow
stone that cools the extra cups."; the star egg asks "How many more has the moon?" with no spoken drag line. A star egg
can be the play's first maths moment only from play 2 (the ride is in the opening set from play 2), after play 1's egg
sums, and the ghost drag of a wrong stone shows on the play's first maths moment of any kind (ui/egg.ts, `egg-demo`). If
a spoken line is still wanted, it needs a new Elizabeth clip in run B and the star egg's `afterGoal` (signs-star's
eggs.ts); "Drag one stone to the nest." does not fit a panel without a nest.
