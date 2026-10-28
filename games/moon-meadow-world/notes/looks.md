# Looks: the catalogue and the save (2.3.0)

The looks lane of [docs/v4/2.3.md](../../../docs/v4/2.3.md) (sections 15, 16, 17.2 and 22.1). Files: `src/wardrobe.ts` (the palette, the shapes, the tabs and their rails, the default look, what she owns, the gift sets, the 2.2 migration, the crown outline, the words, the look line), `src/game/save.ts` (the save), `tests/wardrobe.test.ts` and `tests/save.test.ts`.

## The catalogue

- Ids, hex values and words are as section 15's tables. The ids are final. The hex values wait for the integrator's tuning after the actors lane (below).
- `COLOURS` is the palette in rail order, two rails of six, green in the first. Hair takes the six natural shades first, then the palette (`HAIR_COLOURS`, three rails).
- `wordOf(field, id)`: every palette colour says its name on every colour field, and the short ones print (pink, red, gold, green, blue, white, brown). The natural hair shades say nothing. Blue, green and brown eyes say their colour word; hazel, grey and violet say nothing. Shapes say section 15's words.
- `crownOutline(hair, crown)`: white, else the crown's deep shade, else dark gold, else dark purple, the first with a contrast of 1.8 against the hair base. The test checks all 18 × 12 pairs, so a shade change that breaks a pair fails at once.

## Rails that never move

- `fieldRows(field)` gives each field enough rows for all its options, in the tab's field order. `railsOf(tab, owned)` fills those rows with what she owns, in rails of six. A row the field does not fill stays empty.
- **Earned items go in the order she earned them** (lane decision). `ownedOptions` gives 'none' (for the jewels), then the start items in catalogue order, then her earned items in `owned` order. `Owned` keeps that order (contracts: "in the order she got them"), and `withItem` and `parseOwned` keep it. Catalogue order would move a cell she knows when the gifts come out of order (a heart crown, then a tiara, would push the heart one cell on), so the test walks all 24 orders of the gift sets and 200 random orders of the 21 items and checks that no cell changes its row or its place in the row.
- No rail for a field whose only option is 'none'. The jewel colour shows only once she owns an earring or a necklace.

## Looks and ownership

- `normaliseLook(raw, base, owned)`: each field takes the raw value, else the base's, else the default look's, and with `owned` an earned item she does not own is skipped at each step (also one in `base`). The default look holds only start items.
- `giftSetFor(quest, owned)`: the quest's own set while it has items left, then the set with the most items left (the first in `GIFT_SETS` order on a tie), then null. Tested to the end of every set, for every order of the quests and for each quest on its own, so a player who only ever does the picnic still collects all 21.
- `giftChoices(set, owned, rand)`: two different items she does not own, then the last one, then none.

## The save

- 2.3.0 writes `mmw.save2`. 2.2's `mmw.save` is read only when `mmw.save2` is missing or broken (not a JSON object), and nothing ever writes or removes it, so 2.2.0 still finds its own save. With both keys, `mmw.save2` wins.
- A v1 save (`v: 1`) comes over through `fromLegacy`: section 15's table for the gowns, candy hair as pink, the ribbon as the hair things' colour, the shoes pink slippers (lilac for the lilac gown, blue for the tutu), the start items owned, `seen.crown` after one play. Every 2.2 look maps to a different 2.3 look, so nothing she chose is lost.
- `phrases` starts at her word level when a save has none. `seen.beads` is false for a v1 save and a new one. `afternoon` is empty for both, so the first 2.3 play offers the bead tree.

## Shade tuning (integrator, after the actors lane)

Not tuned yet. Record each change here: the colour, the shade, the old and new hex, and why (seen in `dev/actors.html` at 1080 × 740). Run `npx vitest run tests/wardrobe.test.ts` after every change, for the crown outline pairs.
