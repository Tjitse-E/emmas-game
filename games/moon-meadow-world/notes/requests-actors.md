# Requests from the actors lane (2.3.0)

For the integrator. The actors lane needs no change in an integrator-only file to compile or to pass its tests.

## 1. docs/v4/2.3.md section 15: the sleeves and the rainbow gown (a record of a call)

- **Done** (integrator, actors merge): the gown row says the sleeves sit between base and light (`SLEEVE_MIX` 0.35) and gives the rainbow gown's mapping. The default look must be 2.2's Princess Emma (section 15), and "sleeve light" broke that.

- File: `docs/v4/2.3.md`, section 15, the gown row of the shapes table.
- Change: "Roles: trim light, main base, deep deep, sash sash, bodice deep, sleeve light. Rainbow tiers as 2.2's rainbow dress." becomes "Roles: trim light, main base, deep deep, sash sash, bodice deep, sleeves between base and light (`SLEEVE_MIX` 0.35 in src/actors/looks3d.ts). Rainbow as 2.2's rainbow dress: main from band 1 to base, deep from band 3 to deep, the bodice band 0 mixed 35% towards light, the sleeves sash."
- Why: with "sleeve light" the pink party dress's sleeves turn almost white, the same as its lace, and the default look stops being 2.2's Princess Emma. 2.2's sleeves sat between the gown's main colour and its trim on every gown, and the mix keeps that while the palette's hex values still decide it. The rainbow gown follows 2.2's rainbow dress, so its bodice and sleeves do not follow the role list; the tuning in 22.3 should know which shade each part takes.

## 2. docs/v4/2.3.md section 15: two small calls to record

- **Done** (integrator, actors merge): the style row says the plait ends at the waist, and the shoes row gives the accent rule of `accentOf` (white, sash, deep, dark plum; a star tries gold first; contrast 1.4 against the small shade).

- File: `docs/v4/2.3.md`, section 15, the shapes table.
- Change, style row: "plait (one plait down the back)" becomes "plait (one plait down the back, to the waist)".
  Why: a longer plait rests on the back of the skirt and slides off to one side as she moves.
- Change, shoes row, add: "A bow or a boot cuff is white and a star gold, or else the colour's sash or deep shade, whichever stands out on the shoe (contrast 1.4)."
  Why: the doc names the bow and the star but not their colour; a bow in the shoe's own colour does not show.

## 3. docs/v4/2.3.md section 15: rainbow on the small parts (a record of a call)

- **Done** (integrator, actors merge): a "Rainbow on small parts" bullet after "The crown on her hair". The swatch half is wardrobe-ui's (swatches.ts): **passed on** in the merge report.

- File: `docs/v4/2.3.md`, section 15, after "The crown on her hair".
- Add: "**Rainbow on small parts.** The crown band, the shoes, the hair things and the jewels draw rainbow as its six bands, piece by piece (the band round the crown twice by angle, each petal, loop, rib, bead and star point its own band, the left shoe and ear from band 0 and the right from band 3), never as its `small` shade alone. The swatch for these fields shows the six bands too."
- Why: rainbow's `small` is `#ff9ccc`, a lighter pink. On its own she would tap the rainbow cell, hear "Rainbow." and see a pink crown or pink shoes. The wardrobe-ui swatch should show the bands for the crown, shoes, things and jewel colour rails, so the cell and her look match.

## For the merge

- `src/wardrobe-legacy.ts`: the actors (src/actors/*, tests/actors.test.ts, tests/princess-scenario.ts) no longer import it.
  - **Noted.** The ui files of wardrobe-ui and `src/test-hook.ts` still import it, so it stays until those lanes merge (22.3 step 4).
- The shade tuning of 22.3 step 3: `dev/actors.html?lineup=gowns` (and `small`, `hair`) at 1080 x 740. How to use it is in notes/actors.md, "Tuning the shades".
  - **Done** (integrator, actors merge): see notes/looks.md, "Shade tuning".
