# Content lane: notes for the integrator

## What is where

| Path | What it is |
|---|---|
| `src/content/index.ts` | The entry. Re-exports everything below. |
| `src/content/data.json` | Names and words checked against v3. Made by `node tools/build-content.ts`. Never edit it by hand. |
| `src/content/looks.ts` | The herd's looks (door order) and `babyLook()`. |
| `src/content/eggs.ts`, `naming.ts`, `wishes.ts`, `doors.ts`, `clips.ts`, `rand.ts` | One file per moment, the clip list and the seeded random. |
| `tools/build-content.ts` | Reads v3's banks, clips, letter sounds, pictures and `UNICORN_FOODS`. Stops with a list of problems instead of writing bad data. |
| `tools/build-lines.ts` | Writes `public/audio/v4demo/lines.json` from `allClipIds()` minus v3's ok clips, so a clip the content uses cannot be missing. |
| `tools/audio/gen.sh`, `budget.json`, `ledger.jsonl` | The demo's audio budget (cap 4,000, floor 10,000). |
| `public/audio/v4demo/` | 70 clips, `manifest.json`, `overrides.json` (the retry seed of one clip). |
| `dev/content.html` | A check page: the herd and newborns as flat pictures, sample eggs, bells, baskets and doors (tap to hear), and a check of every clip, letter sound and picture through the real audio packs. |

## Wiring

- One `rand` per play: `const rand = seeded(Date.now())`, or a fixed seed for the flows.
- Start: `herd()` gives 12 `HerdMember`s in doors 1 to 12.
- Egg 1: `eggSpec('warm', rand, { first: true })`. Egg 2: `eggSpec('snow', rand, { first: true })`.
- Hatch: `babyLook('warm', rand)`, then `babyLook('snow', rand, [firstBabyLook])` so the two newborns differ.
- Naming: `namingSpec(rand, [])`, then `namingSpec(rand, [firstName])`. After the moment, `newborn(choice, look, 13)` (and 14) makes the `HerdMember`.
- Wishes: `wishSpec('food', rand)`, `wishSpec('bath', rand)`. Free play: `foods()`.
- Bedtime: `rollCall(doorsOfUnicornsStillOutside, rand, 2)` (doors 7 to 12), `moveIn(baby1)`, `moveIn(baby2)`, then `doorVisit(visitor, occupiedDoors, rand, rollCallDoors)` (a teen door 11 to 14, not the visitor's own; the roll call's doors are avoided while another is left). Pass the doors whose unicorn is still outside to `rollCall`, or it may call a door whose unicorn is already in bed.
- Eggs (after the review): stones 3 to 9, never 1 or 2. Warm: have 6 to 9, need 11 to 15, answer 4 to 9, hint `h-peek` (the cold cups are under a blanket), and the first warm egg has `afterGoal: ['g-stone']`. Snow: have 11 to 15, need 7 to 9, answer 4 to 6. Both always cross ten.
- Every other line: `CLIPS` (see `src/content/clips.ts`). `wayTo(place)` gives the "this way" line for a `Place` (none for the gazebo). `CLIPS.herdCount(14)` is "Fourteen unicorns!".
- Preloading: `allClipIds()` lists all 227 clips (about 370 s of audio, about 70 MB once decoded). Do not preload all of it on the iPad Air 2. Preload `CLIPS` and the herd names at start, and each moment's own clips just before it with `eggClipIds(spec)`, `namingClipIds(spec)`, `wishClipIds(spec)` and `doorClipIds(specs)`. `allGraphemes()` lists the 34 letter sounds for `audio.preloadSounds()`.

## Deviations from the brief

- Warm egg facts reuse v3's `num-bond-<have>-<answer>` ("Eight and five make thirteen!"), the same text and ids v3's eggs use. Only "ten and some more" is new (`num-add-10-3` to `num-add-10-5`); since the review no egg asks it (have is at most 9), but the clips stay in the pack. This saved about 750 credits.
- `num-still-warm-3` to `-6` are made but no near-miss stone reaches them (a wrong stone is 1 or 2 away). They keep `tooSmall(k)` safe up to 6.
- New line `g4-snow-egg` ("A snow egg! It hatches when it is just right.") is the snow egg's intro.
- New line `h4-doors` ("Look at the numbers on the doors.") is the focused door hint, said while the row glows.
- Extras, all optional: `babyLook(kind, rand, avoid?)`, `newborn()`, `NEWBORN_DOORS`, `eggCombos()`, the `*ClipIds` helpers, `allGraphemes()`, `wayTo()`, and `hint` on the objects `doorVisit` and `rollCall` return (type `DoorAsk`).
- `CLIPS` also has `look` (g-look), `hungry` (foal-hungry), `tray` (g-tray), `yawn`, `yes`, `wellDone`, `lovely`, `cuddle` and `foalLook`. All are v3 clips.

## Requested contract changes

1. `DoorSpec`: add `hint?: string[]` (the focused hint clip). `doorVisit` and `rollCall` already return it.
2. `src/assets.ts` reads `location` when it is imported, so node code that imports `wordPic` (the tests, `tools/build-lines.ts`) has to stub `location` first. Computing `V3` on first use would remove that.
3. `src/audio/index.ts` uses a relative own-pack path (`audio/v4demo/`). A page under `dev/` needs `<base href="../">` (as `dev/content.html` has), or the v4demo pack is not found. Using `import.meta.env.BASE_URL` would fix it for every page.
4. Optional: the very first egg has no spoken "drag a stone" line. v3 says `g-stone` ("Drag one stone to the nest.") on the first egg ever. If the ghost hand is not enough, add `g-stone` after the first warm goal.

## Audio

- 70 new clips plus `menu-moon-meadow-world`: all passed speech-to-text exactly. `num-take-13-6` failed on its first take and passed on the automatic retry with seed 1011. The script does not keep the first transcript.
- Booked 1,861.48 credits in `tools/audio/ledger.jsonl` (1,843.14 for the pack, 18.34 for the menu line) against the cap of 4,000. The account counter went from 31,035 to 30,230.
