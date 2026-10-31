# The ride: notes

The ride place is `src/game/ride.ts` (docs/v4/2.4.md sections 5.4 and 5.5, docs/v4/2.4-plan.md Task 24). The saddle
icons are `src/ui/saddle.ts` with their block in `src/ui/ui.css`. The mounts, side-saddle and riding a path are in
`src/actors/` (see notes/actors.md). Unit tests: `tests/ride.test.ts`; the flow: `flows/ride.flow.sh`.

## A trip, step by step (`g.ride.step`)

| Step | What happens |
|---|---|
| `paddock` | She walks to `RIDE.stand` (a long way ends with her there at once after 12 s). Both mounts stop grazing and turn to her. A saddle icon floats over each saddle; a tap on a mount counts as its icon. First ride ever: `lumi4-saddle`, `g4-saddle`, the ghost taps Bella's icon (a demonstration). Later rides: `g4-saddle`. No tap for 20 s: `g4-saddle` again; for 45 s: the ghost taps the nearer icon and she gets on. The ghost taps the middle of the icon (`saddleCentre`), which floats wholly above the saddle point. The riders who do not follow her (a newborn left grazing, or with no newborn and no follower the two herd babies nearest the paddock) come trotting by the paths. |
| (getting on) | The trip's two signs are planned (`planTrip` on the stream `sign-<trip>`; their sets and targets go into `g.signUse`). She walks beside the mount's left and hops up side-saddle; `nicker-1`; `seen.ride` is written; `world.trail.show(true)`; the other mount grazes again by its spot; up to two riders track 1.6 and 3.0 m behind on the mount's track (`rideFollowers`), the other followers graze. A rider more than 2.5 m from its place on the track (`JOIN_M`) walks there by the paths first, and one not there within 3 s (`JOIN_WAIT_MS`) is put there with a sparkle: the track runs outside the routes, so nobody crosses the meadow through trees or the stable to reach it; full detail for the mount and the riders (`setFocus`); `cameraClamp('ride')`, the follow target 1 m ahead of the mount; the gate opens (`stable-door`). |
| `out` | Along `RIDE_PATHS.out[mount]` at 4.2 m/s, stopping 2.2 m before the fork (`FORK_STOP`), `foal-wee` once near the gate. The mount faces `RIDE.post` (the fork until the trail lane adds the post) and the fork frame eases in: `RIDE.forkFrame` once the layout has it (the pose the trail lane's test proves keeps every slot out of view), else 8 m between the mount and the fork. |
| `sign1`, `sign2` | The slots are dressed with the sign's cards once none is on screen. A slot still in view after 4 s (`DRESS_WAIT_MS`) is dressed all the same, with a sparkle and a `[mmw] slot ... still on screen` warning, so a sign's slots always show its own words (the flow fails on any dressed slot in view). `layer.sign` with `cardAt` (the arms) and `road`: right, a nicker and a happy mount; wrong, two steps onto that road at 1 m/s, a shake and back. Result line `sign-<trip>`, strand `r`, detail `{ kind: 'sign', word, words, level, tried, trip, read }`. The mount takes the road of the card she tapped right (else the card with the target's word). |
| `clearing1` | Down the target's road to 3 m before its slot (`CLEARING_STOP`); the happy beat (5 s: emotes, hearts, `foal-yay`, `splash-1` at the pond, pool and beach). |
| `back` | The mount turns round on the spot (`turnRound`, 0.7 s): the riders step 1.1 m out to its free side, it passes them and they fall in behind in the opposite order. Back along the road to the fork and two steps back onto the fork stand; the fork frame again. |
| `clearing2`, `egg`, `naming` | Down sign 2's road; the trail egg in a moonbeam on her side of the mount, `lumi4-another-egg`, `runEggSums(g, 'trail')` with her on the mount, then `newbornAt(g, 'trail')` (the hatch, the naming and the wish, the babies lane's). The newborn stays at its hatch spot beside her. |
| `home` | `g4-ride-home` while the mount turns round as at `back`, the newborn last in line at 4.4 m; back along the road and `RIDE_PATHS.home` to her stand. The sign level folds (`foldSigns`) and is saved as it arrives, unless `?sign=` set it. |
| (getting off) | She hops down on the mount's left; `world.trail.show(false)`, the slots bared, the gate closes; the mount walks back to its spot (or a sparkle puts it there after 3 s) and grazes within 0.6 m; the riders stop tracking: the wild baby and her own babies follow her, the called herd babies graze at home; `cameraClamp('meadow')`. `g.clock.rideMs` counted her time on the mount in visible frames (a page in the background adds nothing). |

## Rules worth knowing

- Nothing of a trip stays when the run stops (a jump, a new play): the cleanup hides the roads and the kit, puts her at her stand and the mounts at their spots, and writes no sign level. `seen.ride` was written as she sat. The cleanup is registered once per ride and taken off again at getting off, so each ride leaves `run.deferred` level; the ride waits on frames with its own helper (`waitFor`), whose cleanup is also taken off when it settles.
- `snapTrip(g, step)` puts her on the mount (`?mount=`, Bella by default) at the fork (`sign2`, `egg`), at clearing 2 (`naming`, `wish`) or at the gate (`home`); the next `ridePlace` carries the trip on from there. Skipped signs fold nothing.
- **Gap: `?step=wish` in a trip starts at the naming**, so the hatch and the naming run before the wish. The design (8) wants it to start at the trail baby's wish, but `newbornAt` runs the hatch, the naming and the wish as one call and the babies lane has no entry for a named newborn's wish alone. Filed in `notes/requests-mount.md` (6). No flow uses `step=wish` in a trip; use `step=naming`.
- While riding, the world's taps go to `rideTap`: the mount or a rider hops and says its name, the trail egg wobbles, the ground does nothing. At the paddock a tap on a mount counts as its saddle icon.
- Effects (`nicker-1`, `stable-door`, `splash-1`) play through `audio.fx`, which never plays under Elizabeth and stays silent while a file is missing.

## Measured (ride flow, step 0 stubs of the other lanes)

| View | 1080 x 810 | 1080 x 740 |
|---|---|---|
| The paddock with both mounts, three followers and the icons | 29 calls, 44,559 triangles | 30 calls, 44,187 triangles |
| Galloping out | 29 calls, 45,755 triangles | 29 calls, 47,735 triangles |

The scene's geometry and texture counts stay at 58 and 8 through a whole trip (the actors' start-up draw, notes/actors.md).

Not yet measured: the fork, each clearing with its kit, the star egg and the naming on the trail. They need the trail and signs-star lanes; `MMW_RIDE_PART=all` checks them after the merges.
