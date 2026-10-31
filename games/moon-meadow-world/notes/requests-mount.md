# Requests from the mount lane (2.4.0)

For the integrator. The mount lane needs no change in an integrator-only file to compile or to pass its tests; these
are calls for the merge and for the other lanes' files, each with why.

## 1. The hub's snapTo: call snapTrip last (hub lane, `src/game/level.ts`)

- File: `src/game/level.ts`, `snapTo(g, start)` (Task 6).
- Change: when `start.place === 'ride'` and `start.step` is `sign2`, `egg`, `naming`, `wish` or `home`, call `snapTrip(g, start.step)` after she, the herd, the babies and the followers are placed, as its last step:

```ts
if (start.place === 'ride' && start.step) snapTrip(g, start.step);
```

- Why: `snapTrip` puts her on the mount (`princess.mount`), and `placePrincess` after it takes her off again. The ride place then carries the snapped trip on from its step. Until the hub lane merges, `ridePlace` snaps `?step=` itself once a run (only when no trip is snapped), so both orders work and nothing snaps twice.

**Done** (hub lane, confirmed at the mount merge): `snapTo` in `level.ts` calls `snapTrip(g, start.step)` after she, the herd, the babies and the followers are placed, right before the camera snaps.

## 2. The free part's `ridePlace` call goes with the hub (hub lane, `src/game/level.ts`)

- File: `src/game/level.ts`, the step 0 `free` part.
- Change: none from this lane. When the hub's `RUN.ride` calls `ridePlace(g, n)`, the step 0 block in `free` that awaits `ridePlace(g, 1)` goes with the old parts.
- Why: the ride resolves framed with its release and leaves `g.free` true; it never starts bedtime and never checks a cutoff itself (the hub asks it only before 26:00, and a ride asked in time runs home in full, Review Focus 1).

**Done** (hub lane, confirmed at the mount merge): the `free` part is gone from `level.ts`, and `RUN.ride` in `hub-part.ts` calls `ridePlace(g, n >= 2 ? 2 : 1)`. Nothing else calls `ridePlace`.

## 3. The signpost and the paths (trail lane, `src/world/trail.ts` and `src/layout.ts`)

- Files: `src/world/trail.ts` (the signpost), `src/layout.ts` (`RIDE_PATHS`).
- Change: none needed to compile. The ride stops the mount 2.2 m before the end of `RIDE_PATHS.out[m]` (`FORK_STOP` in `src/game/ride.ts`), facing the fork, and gallops from there along the rest of `out` and then `roads[i]`. It stops 3 m before each slot's middle (`CLEARING_STOP`), where the kit stands, and puts the star egg 1.3 m ahead of the mount and 0.9 m to its left. The signpost's post should stand clear of the 3 m beds (a little north of the fork, between the roads), or the mount gallops through it; if the trail lane puts it elsewhere, the two numbers are the only ones to change.
- Why: the roads start at `RIDE.fork` (the trail lane's test), so a post at the fork itself stands on every road.

**Done** (trail lane, confirmed at the mount merge): `RIDE.post` is (23.0, -30.8), in the wedge between the north and the east roads, and the north road bends west round it. `RIDE.forkStop` is (21.5, -26.8), 2.2 m short of the fork, the same as `FORK_STOP`.

## 4. The ride's flow at merge (integrator, Task 26)

- File: `flows/ride.flow.sh` (this lane's).
- Change: none. After the mount merge run `MMW_RIDE_PART=all`: it then also checks the sign cards (`sign <word>` targets and the `sign` moment of the signs-star lane), that the slots show each open sign's words (`state().ride.slots` against `spec().cards`), one wrong card with its `tried` and a line spoken after it, sign 2, a budget at each clearing (`slot 1`, `slot 2`), the star egg's three sums, the naming on the trail, and the reload during sign 2 with the next play reaching the hub (`state().part === 'hub'`). Both parts check that she crosses the fence line twice, each time in the gate. The `all` part has never run in this lane: if it fails, check its new lines first. It needs the signs-star lane's `runSign` (a moment of kind `sign` with `phase` `open` and `answer` `sign <word>`), the babies lane's `newbornAt` (naming and wish), and the trail lane's `cameraClamp('ride')` (without it the follow camera stops at the meadow's clamp and she rides out of view, which the flow does not check).
- Why: in this lane the other lanes' stubs answer every sign at once, so only the paddock part can run.

**Done** (integrator, mount merge): `ride` ran in full (`all`) at 1080 x 810 and 1080 x 740 with smoke and bedtime, and passed. One fix in the flow: `state()` rounds her z to 2 decimals, so a frame that sat exactly on the fence line counted one crossing twice (3 for 2 at 1080 x 740). A crossing now counts when she changes side.

## 5. A jump while a snapped trip waits (hub lane)

- File: `src/game/level.ts`, `snapTo`.
- Change: none required. A trip snapped by `snapTrip` registers its cleanup when its `ridePlace` starts on the new run. Should a second jump come before the hub calls `ridePlace` (the same frame), the roads stay shown until the next ride ends; `snapTo` could call `g.world.trail.show(false)` near its top to rule that out.
- Why: `snapTrip` runs while the old run has stopped and before the new one exists, so it cannot defer on either.

**Done** (integrator, mount merge): `snapTo` calls `world.trail.show(false)` near its top, after `releaseFrame`. A snapped trip shows the roads again at its end.

## 6. `?step=wish` in a trip (babies lane, `src/game/eggs-part.ts`)

- File: `src/game/eggs-part.ts` (`newbornAt` runs the hatch, the naming and the wish as one call).
- Change: export the trail newborn's first wish on its own, for example:

```ts
/** A named newborn's first wish beside her (the last part of newbornAt), for a jump to its wish. */
export async function newbornWish(g: Game, baby: Baby): Promise<void>;
```

  Then in `src/game/ride.ts` (this lane's file): `snapTrip(g, 'wish')` calls `snapBabies(g, ['trail'], <egg spot>, true)`
  and `starEgg` runs `newbornWish(g, baby)` for that baby instead of `newbornAt`.
- Why: the design (8) says `step=wish` jumps into the baby's wish; today it starts at the naming (notes/ride.md). No
  flow uses it.

**Declined for tonight** (integrator, mount merge): it is a test address only, no flow uses it, and `step=naming` reaches the same wish one step earlier. Splitting `newbornAt` and adding a snapped trail baby to `snapTrip` is new untested code the night before the deploy. Left for 2.4.1; notes/ride.md keeps the gap.

## 7. The fork frame and the signpost (trail lane, `src/layout.ts`)

- File: `src/layout.ts` (`RIDE`).
- Change: none needed to compile. `ride.ts` reads `RIDE.forkFrame` (`{ center, width, pitch?, shiftY? }`, framed with
  `world.frame`) and `RIDE.post` (a ground point the mount faces) when the layout has them, and else uses step 0's
  frame between the mount and the fork. If the trail lane named or shaped them otherwise, change the `TRAIL_RIDE` cast
  near the top of `src/game/ride.ts` to match. The trail lane's proof had the mount at the fork; this lane's mount
  stands 2.2 m before it (`FORK_STOP`), facing the post. A slot still in view after 4 s is now dressed with a warning
  (`[mmw] slot ... still on screen`) instead of being left as it was; `MMW_RIDE_PART=all` fails on it.
- Why: the trail lane proved "no kit in view, cards clear of her head" only for its own pose.

**Done** (trail lane, confirmed at the mount merge): `RIDE.forkFrame` is `{ center, width, shiftY }` and `RIDE.post` a ground point, the shape the `TRAIL_RIDE` cast reads, so the cast needs no change. The trail lane's frame test (tests/world-trail.test.ts) holds the mount at `RIDE.forkStop`, the pose this lane uses.

## 8. The long play's texture count and the toys (hub lane, `flows/long.flow.sh`)

- Files: `flows/long.flow.sh`; for a fix in code, `src/actors/herd.ts` (this lane's).
- Change: none from this lane yet. The actors now draw everything they show later at start-up (notes/actors.md, "The
  start-up draw"), so a ride, a new gown shape, a new crown, a moonbeam or the star egg adds no geometry or texture.
  No call in `main.ts` is needed. Two things still add one: each new toy picture on a unicorn's head is a texture of
  its own (`toyTexture`, cached per picture), and the first toy draws the sprite's shared geometry once. A wish with a
  new picture after the first place therefore adds one texture. Either let `check_level` allow one more texture per
  new toy picture, or ask this lane to release a toy's texture when no unicorn shows it.
- Why: check 6 of the long play would fail on the first new toy otherwise.

**Done, in the flow** (integrator, mount merge): the herd counts its loaded toy pictures (`herd.stats.toys`, so `__game.perf().toys`), with a test in tests/actors.test.ts. `check_level` in `flows/long.flow.sh` leaves them out: textures minus the toy pictures, and geometries minus one once a toy has shown. The toy textures stay cached for the play, as before.
