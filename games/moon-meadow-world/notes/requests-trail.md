# Requests from the trail lane (2.4.0, Tasks 17 to 20)

No integrator file needs a change for this lane: `src/test-hook.ts` (the `paddock` target, `occluded()`,
`state().trail.shown`) and every contract work as step 0 wrote them.

## For the merge (no request, things to know)

1. **New in `src/layout.ts`, additive:** `RIDE.post` (the signpost, 23.0, -30.8), `RIDE.forkFrame` (an 8 m fork frame
   that holds the mount at the fork, the three cards and the road starts at both of her sizes, with no kit in view) and
   `RIDE.rail.gapWidth` (1.6 m). The mount lane can face the mount towards `RIDE.post` and frame the fork with
   `world.frame(RIDE.forkFrame.center, RIDE.forkFrame.width)`.
2. **Gone from `src/layout.ts`:** `MIST.center`, `MIST.rx`, `MIST.rz` (the moon mist went; `MIST.sign`, `signRadius`
   and `signStand` stay). Gone from `src/world/sky.ts`: `meadowMist`. Nothing outside the world lane read them.
3. **`RIDE_PATHS` changed** (the plan's Task 18 bends). Hazel's way out passes between Bella's spot and the trough, the
   way home passes west of Bella's spot, the north road bends west round the signpost. All end where the next starts.
4. **`WorldPick` `paddock`:** a tap on the paddock's sand now picks `{ kind: 'paddock' }`. At step 0 `input.ts` has no
   case for it, so until the hub lane's Task 4 a tap there does nothing (the hub lane merges first).
5. **New file outside the lane's row:** `tests/fixtures/walk-2.3.3.json`, the 2.3.3 walk grid that Task 17's test
   names.
6. **The trail is ridden, never walked:** `isWalkable` is false north of the stables' back line (z -16.7), so the
   followers on the trail move along the mount's track by placement (the mount lane's `trackBehind`), not by `route`.
