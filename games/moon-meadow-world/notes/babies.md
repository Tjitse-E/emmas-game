# Babies, wishes, bedtime and the record (2.4.0)

The babies lane of 2.4.0 (docs/v4/2.4.md sections 5.3, 5.6, 5.8 and 7; docs/v4/2.4-plan.md Tasks 8 to 11). Tests:
`tests/babies.test.ts`, the 2.4 blocks of `tests/save.test.ts` and `tests/results.test.ts`, and the doors, wishes and
names blocks of `tests/content.test.ts`. Flow: `flows/bedtime.flow.sh`.

## Babies in any order (eggs-part.ts)

- `g.babies` is in hatch order, up to four a play. Door = 13 + index (`NEWBORN_DOORS` 13 to 16).
- `eggPlace(g, 'nest' | 'shore')` is the hub's egg place. It puts the home egg at its spot if it is not there, walks
  her to it (on the first play, when the welcome has set the nest goal, she walks there herself as in 2.3), parks the
  followers, frames the egg, asks the three sums (`runEggSums`), then the hatch, the naming and the newborn's first wish.
  It resolves framed on the wish. Its release lets the frame go, brings the parked followers back and makes the newborn
  follow (slot 0 when no other baby follows; with three followers a herd follower goes back to graze first).
- `eggPlaceStep(g, 'nest' | 'shore', 'naming' | 'wish')` is the hub's `?step=naming|wish` jump: the spot's snapped
  baby, its naming for `naming`, then its first wish of the 2.4 kind rule, with `eggPlace`'s release. With no baby of
  that spot it runs the whole egg place.
- `runEggSums(g, spot)` plans with `firstOfKind`: a kind's intro plays only on its first egg of the play. The caller
  frames. The 2.3 "plan egg 1 first" shortcut for `?at=egg2` is gone.
- `newbornAt(g, spot)` is the hatch, the naming and the first wish, and resolves with the camera back on her. The ride
  calls it on the trail. There the baby stays at its hatch spot and turns to her. She keeps her pose on the mount
  (`mountedOn`). Nothing in it makes the baby follow: the ride takes it along.
- Looks: `babyLook(KIND_AT[spot], ...)`. Warm eggs give the warm breeds, snow eggs snow, star eggs moon. Each look
  avoids every earlier baby's look this play.
- Names: `namingRules(g)` leaves out every name given this play. The first naming has 3 wrong gems, every later one 4.
- Streams and result parts: `egg-nest`, `egg-shore`, `egg-trail-<k>`, `hatch-<n>`, `naming-<n>`, `wish-<n>`.

## Guests and wishes (guests.ts, moments.ts)

- `guests(g, at, n)`: her babies newest first (design 5.3; the integrator chose it at the merge, requests-babies.md,
  request 4), then the babies among her followers in slot order, then the grazing herd babies nearest the place.
  Foals that follow her stay followers, because the places are made for babies. The guests follow again in that order.
- `wishKindFor(read, last, picnicNear)` (pure): the kind read least, a tie going dress, bath, picnic. Never the kind of
  the last word read, and never picnic while the picnic's bubble shows or right after the picnic. `nextWishKind(g)`
  counts the reads from the result lines. The play's first baby still wants to dress up like her.
- Every dress-up, pond and picnic wish leaves out the play's earlier basket words of its kind. This now includes the
  picnic, so the picnic's second guest never sees the first guest's words.
- The words come before the level, as 2.3.2 chose for the second pond wish (tests/reading-level.test.ts): when the
  words left cannot make a level 3 basket (a level 3 reader's third dress-up wish, a fourth picnic read), the read
  plays and logs as level 2. Level 3 is the top, so such a first try only keeps her at 3 a little longer, as the
  warm-up does (requests-babies.md, request 6).
- `offerWish(g)`: the grazing herd baby nearest her stops (`goTo` its own spot), looks at her and waits
  (`g.waiting`). It is never a foal, a follower, a hay rack helper or one parked for a place. One waits at a time.
  `withdrawWish` sends it back to graze. It does nothing while its wish place runs.
- `wishPlace(g, u)`: she walks to its left, followers step aside, then the wish of `nextWishKind`, with the dress-up
  line before a dress-up wish. "Your baby has a wish!" is said once, in the wish's intro. It resolves framed. The
  release lets the frame go, clears `g.waiting`, sends the baby to graze at its home and brings the followers back.
- A herd wish logs as `wish-herd-<k>` (k counts herd wishes this play). The newborns' wishes keep `wish-<n>` by baby,
  so the two never share a stream or a part.

## Bedtime (bedtime.ts, content/doors.ts)

- `bedtimeDoors(n, outside, rand, newborns)` (pure, one stream `rollcall`): with no baby 3 roll call doors and no
  visit; with one or more 2 doors and a visit to an occupied door from 11 to 12 + n that is not the visitor's own.
- `bedtime` writes `g.hub.bedtimeAt`. With no baby it says `g4-way-stable` in place of `g4-to-stable`. Babies that
  follow her keep following, the others walk to the yard as the herd does (`toTheYard`). Every named baby moves in at
  13 to 12 + n. `goodnight` says `num-herd-<12 + n>` and the end screen shows 12 + n (`bedtimeLines`).
- `flows/bedtime.flow.sh`: `MMW_BEDTIME_PART=doors` runs `?at=bedtime&babies=0, 2, 4` (the lane's part);
  `all` adds the clock (`?bed=90`, a running picnic finishing first), which needs the hub.

## The record (report.ts, results.ts, save.ts)

- `afterPlace(g, p, { n, fromMs, checkedMs })`: `checkedMs` is the place's own checked time, not the clock at its
  start. It sends `kind=hub` (`p` the letter e s w p b k r o c, `min` play-clock minutes now, `t` the place's seconds
  from `fromMs`, `ck` its checked seconds). It writes `last = mergeLast(g.start.last, today)` and `afternoon` with the
  gift quests in `g.hub.done` and `p`.
- `mergeLast`: the start copy plus this play's words and totals, newest last, the last 16 of each. A word read again
  keeps only its newest place. Goodnight writes `last` the same way.
- `playOf` adds `nr ns nm r1 s1 m1` from the result lines, `sq` from `g.hub.done`, `pv` and `po` from the pond visits,
  `ri`, `bt`, `bb` and `sg`. Its `q` is the gift quests from 2.3's `quests.done` and the hub's done places.
- `resultFields` has a sign branch: `k=sign`, `lv`, `w`, `ws`, `tp`, `sn` (the sign of the trip) and `tried`.
