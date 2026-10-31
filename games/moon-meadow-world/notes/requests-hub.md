# Requests from the hub lane (2.4.0)

Changes this lane needs in files it does not own, the targets its histories miss, and seams with other lanes that the integrator should check at the merge. The lane compiles against the step 0 files as they are.

## Targets the histories miss (plan Task 3)

1. **Two history targets are skipped in `tests/hub-history.test.ts`.** The rules match 5.2 and 5.6 word for word (checked again against both sections); the misses come from the model's times, not a rule. Per plan Task 3 the two tests are `it.skip` with the target and the number reached, so the deploy gate (Task 28, check 9) lists them as failed checks and the deploy waits for Tjitse.

   - **Play B never reaches done early** (5.6: "Plays B and C never reach it"). Reached: done early at **26:43**. B's order is the design's (picnic, Corner, nest egg, wish, pond, bead tree, wish, ride, pond, shore egg, pond), but her shore egg ends at 26:43, after ride 2's cutoff at 26:00, so at that refill no learning place can start and done early begins. Bedtime still starts at 30:00, at the end of the last pond visit, so her play is the same apart from `early`.
   - **The pond-lover reaches bedtime before 30:00** (5.6: done early at about 26:30, bedtime at about 29:50). Reached: done early at **27:38**, and her last pond visit starts at 27:53, so the 30:00 cutoff ends it and bedtime starts at **30:00**.
   - Why: 5.7's table for play B leaves out about 1.2 minutes of its own model in the early rows. The picnic ends at 2.0 there, but the welcome (0.3) and the picnic (1.9) already make 2.2, before the walk; the nest egg, the bead tree and the two wishes are each 0.1 to 0.3 short too. With every walk and every 0.2 min gap counted (none before the first place, which follows the welcome at once), B's places end at 2.2, 3.9, 7.3, 8.2, 11.5, 13.6, 14.5, 19.9, 23.3, 26.7 and 30.0.
   - Play C passes (no done early, bedtime at 30:00: ride 1 ends at 29:53), and the pond-lover's, the skips-the-Corner and the slide-only counts all pass.
   - For Tjitse: B's bedtime is at 30:00 either way, and the pond-lover's last visit is cut at 30:00 instead of ending at 29:50. If he accepts the numbers reached, the two targets change and the tests are unskipped. Until he decides they stay skipped: a lane may not change a target or the model.

   **Changed** (the lead's decision, 31 October 2026, at the merge): the rules follow 5.2 and 5.6 and bedtime at 30:00 holds in both plays, so both tests are unskipped with the targets the rules reach. Play B: bedtime at 30:00, and done early only once every learning place is done or past its cutoff, beginning as a place ends. The pond-lover: done early between 26:00 and 28:00, bedtime at 30:00. Design 5.7 has a line under play B's table on the model's missing 1.2 minutes.

## Integrator-only files

2. **`tests/contracts-24.test.ts`, the test "keeps 2.3.3's parts in step 0".** It pins step 0's stub of `resolveStart` (`?at=hub` gives `free`, `?at=egg2` gives `egg2`, and so on), which plan Task 6 replaces with the hub's final rules. This lane may not edit the file, so the test fails in the lane's worktree (the only failing test). Replace it with the final aliases, which `tests/hub.test.ts` "maps the old part names to the hub" also checks:

   ```ts
   it('maps the address options to the hub: the old part names are aliases', () => {
     const at = (s: string) => resolveStart(parseOptions(s));
     expect(at('')).toBeNull();
     expect(at('?at=hub')).toEqual({ part: 'hub', place: null, step: null, done: [] });
     expect(at('?at=hub&place=egg&step=naming')).toEqual({ part: 'hub', place: 'egg', step: 'naming', done: [] });
     expect(at('?at=hub&place=shore&step=wish')).toEqual({ part: 'hub', place: 'shore', step: 'wish', done: [] });
     expect(at('?at=hub&place=pond')).toEqual({ part: 'hub', place: 'pond', step: null, done: [] });
     expect(at('?at=free&quest=corner')).toEqual({ part: 'hub', place: 'corner', step: null, done: ['egg', 'shore'] });
     expect(at('?at=hub&place=ride')).toEqual({ part: 'hub', place: 'ride', step: null, done: [] });
     expect(at('?at=egg2')).toEqual({ part: 'hub', place: 'shore', step: null, done: ['egg'] });
     expect(at('?at=bedtime')?.part).toBe('bedtime');
   });
   ```

   Why: the parts are now wardrobe, welcome, hub, bedtime and goodnight (5.1), so `free` and `egg2` are no part any more.

   **Done** at the hub merge.

3. **`src/test-hook.ts`, the `skip()` comment.** It says "End the current timed wait (free play's two minutes, the pond's 45 s)". Change it to:

   ```ts
   /** End the current timed wait (2.4.0: a pond visit; the hub's own wait goes on, so skip() never ends the hub). */
   ```

   Why: free play and the old pond part are gone; in the hub `skip()` ends a pond visit (the smoke flow uses it) and never the hub.

   **Done** at the hub merge.

## Seams with other lanes

4. **The step jumps `?step=naming|wish` into an egg place** (`eggStep` in `hub-part.ts`) still run 2.3.3's index-based `naming` and `wish` of `eggs-part.ts` on a snapped baby (with `snapBabies` and `HATCH_SPOT`), so they play the 2.3 wish kinds and `wish-<i+1>` lines. At the merge, when the babies lane ships a step entry such as `eggPlaceStep(g, spot, step)` (the review saw one), make `eggStep` call it in place of `naming(g, i)` and `wish(g, i)`, keeping its `snapBabies` call only if that entry does not snap the baby itself. Until then the babies lane must not delete `naming` and `wish`. `egg` is no longer imported by this lane (level.ts lost its 2.3 parts).

   **Not yet**: `eggPlaceStep` is on lane/babies, not on main. The integrator applies this at the babies merge.

5. **`quests.ts` keeps `playQuests`** (eggs-part.ts's 2.3.3 `wish` reads it through `secondWishKind`) and **`hideOffers`** (bedtime.ts); `hideOffers` now takes every hub bubble off the screen. `afternoon`, `canQuest`, `askQuest` and `placeAt` are gone; no file outside this lane imported them.

   **Done**: noted; nothing to change at the hub merge. `playQuests` can go with `secondWishKind` after the babies merge.

6. **What the hub expects from the babies lane:** `offerWish(g)` sets or returns the waiting herd baby (the hub writes `g.waiting` from its return and takes it out of the followers), and the hub calls it only between places; `withdrawWish(g, u)` lets it graze again (the hub clears `g.waiting`); `wishPlace(g, u)`'s release may clear `g.waiting` (the hub counts the wish from the baby that waited as it started; `tests/hub.test.ts` fakes exactly that); `canOfferWish(g)` is read at every refill as `HubCtx.wishBaby`. `eggPlace` may walk her itself; the hub also starts a walk to the egg when its bubble was tapped and no goal is set. `afterPlace` gets `{ n, fromMs, checkedMs }`; `h.pondMs` holds the visits' play time and a visit counts in `hub.done` only when she arrived. `bedtime.ts` may write `hub.bedtimeAt`; the hub writes it as it ends when bedtime has not.

   **Open**: checked at the babies merge.

7. **What the hub expects from the mount lane:** `ridePlace(g, n)` walks her to the paddock itself (the bubble tap only asks it), and `snapTrip(g, step)` runs from `snapTo` for `?at=hub&place=ride&step=...` before the hub starts the ride. The paddock tap asks the ride while its bubble shows (input.ts).

   **Open**: checked at the mount merge.

## For the long plays

8. **`long.flow.sh` lists the geometry and texture growth at each kind's first place** ("growth at a kind's first place", also in `budget.txt`). A second place of a kind that grows still fails. Growth at a place done once a play (the Corner, the picnic, the maths quest) is not failed, because a first load is allowed there; read the list after the 36-minute runs and treat growth there that is not a known first load (a gift she wears, a newborn's look, the mount lane's toy textures) as a leak.

   **Open**: read at the finish (Task 28), after the long plays.
