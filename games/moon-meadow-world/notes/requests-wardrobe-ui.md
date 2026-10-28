# Requests from the wardrobe-ui lane (2.3.0)

Changes this lane needs in files it does not own. The lane compiles and passes its tests without them.

## 1. flows/lib.sh (quests-world): check the tab tiles in the smoke flow

- **Passed on** to quests-world, which owns lib.sh and merges last. The smoke flow passes without it; `dress.flow.sh` checks the tab tiles.

- **Change:** in `wardrobe_targets()`, the filter `/^(row|rail|swatch) /` becomes `/^(tab|rail|swatch) /`.
- **Why:** the 2.3 panel has no `row <name>` targets any more; its tiles are `tab hair` to `tab sparkles` (docs/v4/2.3.md section 16, flow names). Without the change the smoke flow still checks every rail, swatch, Done and the preview, but not the six tab tiles. `dress.flow.sh` checks them itself.

## 2. src/wardrobe.ts (looks lane): the three eye colours that say their word

- **Done.** `wordOf('eyes', …)` already gave blue, green and brown their word on main (the looks merge). The integrator added `['eyes', 'eyes', 'green']` to the test cases at the wardrobe-ui merge.

- **Change:** `wordOf('eyes', id)` returns the colour word for blue, green and brown, for example `eyes: { blue: word('blue'), green: word('green'), brown: word('brown') }` in `SHAPE_WORDS`.
- **Why:** section 15 says "Eyes (6): 2.2's six. Blue, green and brown say their colour word." Today `wordOf('eyes', …)` returns nothing, because `eyes` is not a colour field and `SHAPE_WORDS` has no eyes entry. The panel calls `wordOf` for every pick, so it speaks and prints them as soon as `wordOf` returns them. The clips exist (`word-blue`, `word-green`, `word-brown` are lines in tools/lines.ts).
- **Then:** add `['eyes', 'eyes', 'green']` to the cases of "a pick with a word says it and plays no effect" in tests/wardrobe-ui.test.ts (wardrobe-ui), so an eye pick is checked to say its word and play no effect.

## 3. src/test-hook.ts (quests-world, or the integrator in 22.3 step 4): drop `legacy()`

- **Deferred** to 22.3 step 4, after the quests-world merge: test-hook.ts is quests-world's. It is now the only import of `wardrobe-legacy.ts` outside its own test.

- **Change:** remove the test hook's `legacy()` and its import of `wardrobe-legacy.ts`.
- **Why:** `dress.flow.sh` now reads 2.3 ids from `state().look` and no flow calls `legacy()`. It is the last import of `legacyOf` outside the actors and the looks tests.

## 4. README.md (quests-world): the wardrobe paragraph and the dress flow line

- **Passed on** to quests-world, which owns README.md. The integrator does not edit it.

- **Change:** the opening paragraph's "five rows of pictures (hair colour, eyes, what she wears, hair style, hair things)" and the `dress.flow.sh` sentence ("one pick per row, … the ribbon tap") describe 2.2. Suggested text for the flow: "`dress.flow.sh` checks the wardrobe at every size: every tab, rail and swatch touchable, a tab acting on pointerdown, one pick per field, a slide released off the panel, a pointercancel mid-slide, the budget in the body and face frames, Done before the music box ends, a finger held on a rail when the box ends (`?box=5`), and the saved look and the crown tab after a reload."
- **Why:** the ribbon tap is gone (the hair things have their own colour rails) and the panel has tabs. notes/ui.md has the 2.3 details.

## 5. The worktrees (integrator): the v3 test build for the flows

- **Done at the looks merge:** section 22.2 tells each lane to link the main tree's `dist-test-gate` into its own worktree. The integrator does not write into lane worktrees, and run.sh is quests-world's.

- **Change:** link `games/moon-meadow-home/dist-test-gate` into each lane worktree, as `node_modules` is linked, or let `run.sh` take the v3 build from the main tree.
- **Why:** `run.sh` serves v3's clips and pictures from `games/moon-meadow-home/dist-test-gate`, a gitignored build that exists only in the main tree. Without it every flow's `finish` fails on missing v3 clips (fb-lovely, lumi-hello, the letter sounds), and Lumi's picture is missing. For this lane's flow runs I linked the main tree's build read-only and removed the link afterwards.

## 6. src/contracts.ts (integrator): `Layer.gift` with no items

- **Done** (integrator, wardrobe-ui merge): the `Layer.gift` doc says `items` is never empty and an empty list rejects at once. Section 17.2 says the same. quests-world's `giveGift` already returns before the picker when there are no items.

- **Change:** add to the `Layer.gift` doc: "`items` is never empty; with no items it rejects at once."
- **Why:** 17.2 says there is no picker when every set is full. `runGift` now rejects an empty list, so a caller that forgets the rule fails in the flows instead of waiting forever with nothing on screen (the frame on and the herd aside).

## 7. src/contracts.ts (integrator): when `Layer.gift` tells the game of the pick

- **Declined, the contract stays as it is** (integrator, wardrobe-ui merge): `Layer.gift` keeps resolving once the sparkles have landed. A reload inside those 1.6 s is unlikely, and both options change a frozen contract while quests-world is built on it (its `giveGift` saves the item when the promise resolves, before the twirl). Section 17.2 and the contract doc now say the item is saved when `layer.gift` resolves.

- **Question:** `Layer.gift` resolves "once the sparkles have landed", about 1.6 s after the pointerdown, and the panel follows that. 17.2 says the item is saved in `owned` at the pick, but the game only hears of the pick when the promise resolves. A reload or a closed app in that 1.6 s loses the gift she chose.
- **Options:** an `onPick(item)` callback on `Layer.gift`, or resolve at the pick and let the sparkles finish by themselves (the quests-world lane then starts her twirl 1.6 s sooner). Either is a small change in gift.ts once the contract says which.
