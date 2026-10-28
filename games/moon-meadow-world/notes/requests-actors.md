# Requests from the actors lane (2.3.0)

For the integrator. The actors lane needs no change in an integrator-only file to compile or to pass its tests.

## 1. docs/v4/2.3.md section 15: the sleeves (a record of a call)

- File: `docs/v4/2.3.md`, section 15, the gown row of the shapes table.
- Change: "Roles: trim light, main base, deep deep, sash sash, bodice deep, sleeve light." becomes "Roles: trim light, main base, deep deep, sash sash, bodice deep, sleeves between base and light (`SLEEVE_MIX` 0.35 in src/actors/looks3d.ts)."
- Why: with "sleeve light" the pink party dress's sleeves turn almost white, the same as its lace, and the default look stops being 2.2's Princess Emma. 2.2's sleeves sat between the gown's main colour and its trim on every gown, and the mix keeps that while the palette's hex values still decide it.

## 2. docs/v4/2.3.md section 15: two small calls to record

- File: `docs/v4/2.3.md`, section 15, the shapes table.
- Change, style row: "plait (one plait down the back)" becomes "plait (one plait down the back, to the waist)".
  Why: a longer plait rests on the back of the skirt and slides off to one side as she moves.
- Change, shoes row, add: "A bow or a boot cuff is white and a star gold, or else the colour's sash or deep shade, whichever stands out on the shoe (contrast 1.4)."
  Why: the doc names the bow and the star but not their colour; a bow in the shoe's own colour does not show.

## For the merge

- `src/wardrobe-legacy.ts`: the actors (src/actors/*, tests/actors.test.ts, tests/princess-scenario.ts) no longer import it.
- The shade tuning of 22.3 step 3: `dev/actors.html?lineup=gowns` (and `small`, `hair`) at 1080 x 740. How to use it is in notes/actors.md, "Tuning the shades".
