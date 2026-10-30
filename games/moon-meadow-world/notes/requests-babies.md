# Requests from the babies lane to the integrator

The lane compiles and passes against the current integrator files. None of these blocks the merge.

## 1. `src/game/eggs-part.ts` and `src/game/level.ts`: delete 2.3.3's index-based `egg`, `naming` and `wish`

Once the hub has merged and `grep -rn "\b\(egg\|naming\|wish\)(g" src tests` shows no caller left, delete from `eggs-part.ts`:

```ts
export async function egg(g: Game, i: 0 | 1): Promise<void> { ... }
export async function naming(g: Game, i: number): Promise<void> { ... }
export async function wish(g: Game, i: number): Promise<void> { ... }
```

and the imports only they use (`secondWishKind`, `playQuests`, `walkTo`). `naming` is now one line over the shared `nameBaby`.

Why: level.ts's 2.3 parts (`egg1`, `naming1`, `wish1`, `egg2`, `naming2`, `wish2`) call them until the hub replaces the parts; the hub's places use `eggPlace`, `runEggSums` and `newbornAt` (plan Task 8, the no-delete rule).

## 2. `src/game/moments.ts` and `tests/world-quests.test.ts`: delete `secondWishKind`

After the hub merge, when only 2.3.3's `wish` (request 1) and the test at tests/world-quests.test.ts:344 still use it, delete

```ts
export function secondWishKind(offered: readonly string[]): 'bath' | 'picnic' { ... }
```

with that test and request 1's `wish`.

Why: a baby's wish now takes the kind the play has read least (`wishKindFor`, design 5.3); `secondWishKind` goes.
