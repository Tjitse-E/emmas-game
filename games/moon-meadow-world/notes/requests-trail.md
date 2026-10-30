# Requests from the trail lane (2.4.0, Tasks 17 to 20)

No integrator file needs a change for this lane: `src/test-hook.ts` (the `paddock` target, `occluded()`,
`state().trail.shown`) and every contract work as step 0 wrote them. Requests 1 and 2 are for the mount lane's
`src/game/ride.ts`, to apply at the mount merge (the mount lane merges after this one).

## 1. `src/game/ride.ts` (mount lane): stop at `RIDE.forkStop` and frame the fork with `RIDE.forkFrame`

For sign 1 and sign 2, the mount stops at `RIDE.forkStop` (21.5, -26.8): 2.2 m short of `RIDE.fork` on the way out,
and 2.2 m along `RIDE_PATHS.home` when it comes back from a clearing. This is the point the mount lane's `FORK_STOP`
already gives, so only the frame changes. Once it stops, the fork frame is:

```ts
void g.world.frame(RIDE.forkFrame.center, RIDE.forkFrame.width, { shiftY: RIDE.forkFrame.shiftY });
// RIDE.forkFrame = { center: (22.0, -29.25), width: 10, shiftY: 0.1 }
```

in place of the frame that puts `arm(1)` at 0.36 of the screen height. Why: that frame has the north slot on screen
(`slots()` gives `[false, true, false]` at 1080 x 810 and 1080 x 740), so `dressHidden` never dresses a clearing.
`RIDE.forkFrame` holds the mount and its rider at `forkStop`, the three cards and the road starts with no slot on
screen at both sizes (tests/world-trail.test.ts, 25 px or more to spare on every rule).

## 2. `src/game/ride.ts` (mount lane): the mount at home holds its spot while the other leaves or comes back

```ts
// From getting on until the ridden mount is back at its spot:
home.graze(RIDE.mounts[homeId], { radius: 0 });
home.lookAt(RIDE.stand);
```

Why: Hazel's way out passes 1.2 m from Bella's spot, between it and the trough, and the way home 1.3 m from it.
Grazing 0.6 m round its spot, Bella can stand in the riding mount's way. Held at its spot and turned to her stand, its
body clears the riding mount and Emma's side-saddle skirt by 0.08 m or more (tests/world-trail.test.ts). The paths
cannot move further from Bella's spot: the trough is on the other side.

## For the merge (no request, things to know)

1. **New in `src/layout.ts`, additive:** `RIDE.post` (the signpost, 23.0, -30.8), `RIDE.forkStop` (21.5, -26.8),
   `RIDE.forkFrame` (`{ center, width: 10, shiftY: 0.1 }`, see request 1) and `RIDE.rail.gapWidth` (1.6 m). The mount
   lane can face the mount towards `RIDE.post`.
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
   The back rail's two sections block walking too (`RAIL_BLOCK` in `src/world/route.ts`), so a ground tap on the gate
   or the trail ends in front of the rail or in its gap.
7. **When a slot counts as on screen** (`world.trail.slots()[i].onScreen`, which the ride's `dressHidden` reads): the
   kit's own bounds, a sphere of 2.19 m round a point 1.5 m above `KIT_AT[i]` (holding any of the 13 kinds: 1.6 m
   round, 3 m high), against the camera frustum. `KIT_AT` stands 2.5 m behind the west and east slots and 2.8 m behind
   the north one. The plan's "the slot's 4 m sphere" (Task 19) called the north slot on screen from the fork frame,
   where nothing of its kit shows.
8. **`world.trail.show(false)` bares the slots** (as `dress(null)`), so every ride starts with bare clearings even if
   it ended without `dress(null)`. `world.trail.gate()`: a new move resolves the one it replaces at once, as
   `world.frame` does.
