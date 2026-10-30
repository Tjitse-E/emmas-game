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

## 2. The free part's `ridePlace` call goes with the hub (hub lane, `src/game/level.ts`)

- File: `src/game/level.ts`, the step 0 `free` part.
- Change: none from this lane. When the hub's `RUN.ride` calls `ridePlace(g, n)`, the step 0 block in `free` that awaits `ridePlace(g, 1)` goes with the old parts.
- Why: the ride resolves framed with its release and leaves `g.free` true; it never starts bedtime and never checks a cutoff itself (the hub asks it only before 26:00, and a ride asked in time runs home in full, Review Focus 1).

## 3. The signpost and the paths (trail lane, `src/world/trail.ts` and `src/layout.ts`)

- Files: `src/world/trail.ts` (the signpost), `src/layout.ts` (`RIDE_PATHS`).
- Change: none needed to compile. The ride stops the mount 2.2 m before the end of `RIDE_PATHS.out[m]` (`FORK_STOP` in `src/game/ride.ts`), facing the fork, and gallops from there along the rest of `out` and then `roads[i]`. It stops 3 m before each slot's middle (`CLEARING_STOP`), where the kit stands, and puts the star egg 1.3 m ahead of the mount and 0.9 m to its left. The signpost's post should stand clear of the 3 m beds (a little north of the fork, between the roads), or the mount gallops through it; if the trail lane puts it elsewhere, the two numbers are the only ones to change.
- Why: the roads start at `RIDE.fork` (the trail lane's test), so a post at the fork itself stands on every road.

## 4. The ride's flow at merge (integrator, Task 26)

- File: `flows/ride.flow.sh` (this lane's).
- Change: none. After the mount merge run `MMW_RIDE_PART=all`: it then also checks the sign cards (`sign <word>` targets and the `sign` moment of the signs-star lane), one wrong card with its `tried`, sign 2, each clearing, the star egg's three sums, the naming on the trail and the reload during sign 2. It needs the signs-star lane's `runSign` (a moment of kind `sign` with `phase` `open` and `answer` `sign <word>`), the babies lane's `newbornAt` (naming and wish), and the trail lane's `cameraClamp('ride')` (without it the follow camera stops at the meadow's clamp and she rides out of view, which the flow does not check).
- Why: in this lane the other lanes' stubs answer every sign at once, so only the paddock part can run.

## 5. A jump while a snapped trip waits (hub lane)

- File: `src/game/level.ts`, `snapTo`.
- Change: none required. A trip snapped by `snapTrip` registers its cleanup when its `ridePlace` starts on the new run. Should a second jump come before the hub calls `ridePlace` (the same frame), the roads stay shown until the next ride ends; `snapTo` could call `g.world.trail.show(false)` near its top to rule that out.
- Why: `snapTrip` runs while the old run has stopped and before the new one exists, so it cannot defer on either.
