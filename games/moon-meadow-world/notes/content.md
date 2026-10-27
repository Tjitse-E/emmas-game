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

## Maths (2.2.0, lane D)

This section replaces the egg lines under Wiring. Design: [docs/v4/2.2.md](../../../docs/v4/2.2.md) sections 4.1 to 4.3.

### What is where

| Path | What it is |
|---|---|
| `src/content/eggs.ts` | Bands and ranges (`RANGES`, `TRAY`), the stone table (`stoneCandidates`), every possible tray (`trayOptions`), the place plan (`placePlan`), `pickSum`, `eggSpec`, `freshCombos`, `totalOf`, `nextBand`, the clip lists. |
| `src/content/rack.ts` | `rackSpec(rand, o)` and `allRackClipIds()`. The rack is a warm sum with skin `hay`. |
| `src/ui/egg.ts` | The moment: stones, sleep and wake, ladder, speech. The cups are one skin. |
| `src/ui/skin.ts`, `src/ui/hay.ts` | The skin interface, and the hay rack skin with its own pictures (`HAY_PIC`) and the hay pile stones. |
| `src/ui/drag.ts` | `onBlocked()`: a touch while `enabled()` is false. Every window release path is unchanged. |
| `src/ui/ui.css` | The block marked "maths lane", inside the egg section. |
| `tests/maths.test.ts` | Section 8.1 for maths. The old range, floor and three-stone tests left `content.test.ts` for it. |

### Wiring (lane F)

- Per play: `const used = { totals: [], answers: [] }`. After each maths moment push `totalOf(spec)` (the number above ten) and `spec.answer`. `lastTotals` is the last play's totals from the save.
- Band: `'a'` at the start of a play. After each egg or rack result, `band = nextBand(band, result.outcome)` (first goes to B, helped to A, miss stays). Door moments do not move it. `?maths=a|b` fixes it.
- Egg 1: `eggSpec('warm', g.randFor('egg1'), { first: true, band, used, lastTotals })`. Egg 2: `eggSpec('snow', g.randFor('egg2'), { first: true, band, used, lastTotals })`. Rack: `rackSpec(g.randFor('rack'), { band, used, lastTotals })`. Without options a spec is band A with nothing excluded.
- Preload with `eggClipIds(spec)`; it works for the rack too.
- The rack runs through `layer.egg(rackSpec, hooks)`. `hooks.react` gets `'right'` when the bundles land, before "The hay rack is full!" (fill the 3D rack with `stable.hay(1)` and let the herd munch), `'munch'` on too many (a foal munches the bundles that tumble off) and `'look'` on too few. The egg's reactions are unchanged: `'warm'` after the praise, `'hot'`, `'cold'`.
- `hooks.log('egg', …)` now carries `skin`, `band`, `stones`, `place` (index of the answer, 0 is the smallest stone) and `decoys`. `egg-miss` carries `decoy`, the kind of the stone she tried. The spec has the same fields (`band`, `decoys`, `skin`) for the results line.
- The stones sleep while the intro and goal play. The snapshot phase is `busy` then, `open` once they are awake, so `wait_open` in `flows/lib.sh` already waits for the wake. A Lumi replay while they sleep does nothing. If the goal speech never ends, they wake after 20 s.
- Hay rack pictures: `items/item-hay-bundle.webp` and `items/item-straw-pile.webp` (v3). Every rack clip is an ok v3 clip; no new audio.

### Sums

| | Band A (4 stones) | Band B (5 stones) |
|---|---|---|
| Warm egg and hay rack | need 11 to 15, have 5 to 9, answer 4 to 8: 19 sums | need 11 to 15, have 3 to 9, answer 4 to 9: 26 sums |
| Snow egg | have 11 to 15, need 7 to 10, answer 3 to 6: 14 sums | have 11 to 16, need 7 to 10, answer 3 to 9: 21 sums |

Snow sums with need 10 (13 - 3, 14 - 4, 15 - 5, 16 - 6) end on ten instead of below it. They are in the design's counts, so they stay.

### How a tray is made

1. A fresh sum: no total or answer this play has used and none of the last play's totals. When nothing is left it lets go of the last play, then of used answers, then of everything.
2. The answer's place from that sum's row of the place plan. The plan (iterative proportional fitting, cached per kind and band) keeps every sum equally likely and makes every place the kind can show come up equally often.
3. A tray at that place, picked from every valid set of wrong stones: it always holds the heard number and one slip when they are valid. The nest mistakes weigh 5, slips 2, near ± 2 weighs 2, ± 3 weighs 1. Numbers 4 or more away fill in at weight 0.25 when a sum has too few mistakes or a place needs one more stone on a side. Trays where "the stone nearest five" is the answer weigh 0.05 of the rest.

Measured over 20,000 trays per kind and band (the test checks 10,000):

| | Places right | Best simple guess |
|---|---|---|
| Warm A | 25 / 25 / 24 / 25 % | 25 % |
| Snow A | 33 / 33 / 33 / 0 % | 34 % (smallest, middle or nearest five) |
| Warm B | 20 / 20 / 20 / 20 / 19 % | 21 % |
| Snow B | 20 / 20 / 20 / 20 / 19 % | 20 % |

A snow egg in band A can never show the answer as the biggest stone: the need she just heard (7 to 9) is always in the tray and bigger than every answer (3 to 6). The test checks evenness over the places a kind can reach.

### Clips

- `allEggClipIds()` and `allRackClipIds()` build specs of every sum in both bands with every wrong stone a tray can show, so they cannot drift from `eggSpec` and `rackSpec`. Miss distances go up to 6; `num-over`, `num-cold`, `num-still-warm` and `num-more` 1 to 6 all exist.
- The only missing clips are the six band B take-away facts (`num-take-14-7`, `15-7`, `15-8`, `16-7`, `16-8`, `16-9`). `lineFor()` gives their lines through the `num-take` pattern, so `build-lines.ts` picks them up after the merge.

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
