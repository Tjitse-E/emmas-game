# Looks: the catalogue and the save (2.3.0)

The looks lane of [docs/v4/2.3.md](../../../docs/v4/2.3.md) (sections 15, 16, 17.2 and 22.1). Files: `src/wardrobe.ts` (the palette, the shapes, the tabs and their rails, the default look, what she owns, the gift sets, the 2.2 migration, the crown outline, the words, the look line), `src/game/save.ts` (the save), `tests/wardrobe.test.ts` and `tests/save.test.ts`.

## The catalogue

- Ids, hex values and words are as section 15's tables. The ids are final. The hex values wait for the integrator's tuning after the actors lane (below).
- `COLOURS` is the palette in rail order, two rails of six, green in the first. Hair takes the six natural shades first, then the palette (`HAIR_COLOURS`, three rails).
- `wordOf(field, id)`: every palette colour says its name on every colour field, and the short ones print (pink, red, gold, green, blue, white, brown). The natural hair shades say nothing. Blue, green and brown eyes say their colour word; hazel, grey and violet say nothing. Shapes say section 15's words.
- `crownOutline(hair, crown)`: white, else the crown's deep shade, else dark gold, else dark purple, the first with a contrast of 1.8 against the hair base. The test checks all 18 × 12 pairs against 1.8 written in the test (and that `CROWN_CONTRAST` is 1.8), and that each outline is the first candidate in that order. A shade change that breaks a pair, or lowering the constant, fails at once.
- The band is not checked: a white crown has white gems on a white band on most hair. Raised with the integrator (requests-looks.md).

## Rails that never move

- `fieldRows(field)` gives each field enough rows for all its options, in the tab's field order. `railsOf(tab, owned)` fills those rows with what she owns, in rails of six. A row the field does not fill stays empty.
- **Earned items go in the order she earned them** (lane decision). `ownedOptions` gives 'none' (for the jewels), then the start items in catalogue order, then her earned items in `owned` order. `Owned` keeps that order (contracts: "in the order she got them"), and `withItem` and `parseOwned` keep it. Catalogue order would move a cell she knows when the gifts come out of order (a heart crown, then a tiara, would push the heart one cell on), so the test walks all 24 orders of the gift sets and 200 random orders of the 21 items and checks that no cell changes its row or its place in the row.
- No rail for a field whose only option is 'none'. The jewel colour shows only once she owns an earring or a necklace.

## Looks and ownership

- `normaliseLook(raw, base, owned)`: each field takes the raw value, else the base's, else the default look's, and with `owned` an earned item she does not own is skipped at each step (also one in `base`). The default look holds only start items.
- `giftSetFor(quest, owned)`: the quest's own set while it has items left, then the set with the most items left (the first in `GIFT_SETS` order on a tie, tested), then null. Tested to the end of every set, for every order of the quests and for each quest on its own, so a player who only ever does the picnic still collects all 21.
- `giftChoices(set, owned, rand)`: two different items she does not own, then the last one, then none.

## The save

- 2.3.0 writes `mmw.save2`. 2.2's `mmw.save` is read only when `mmw.save2` is missing or broken (not a JSON object), and nothing ever writes or removes it, so 2.2.0 still finds its own save. With both keys, `mmw.save2` wins. Data from `mmw.save2` is a 2.3 save unless it says `v: 1` (`parseSave(raw, true)`), so an entry without a `v` keeps her look and what she owns. Data without a `v` from `mmw.save` is 2.2's.
- A v1 save (`v: 1`) comes over through `fromLegacy`: section 15's table for the gowns, candy hair as pink, the ribbon as the hair things' colour, the shoes pink slippers (lilac for the lilac gown, blue for the tutu), the start items owned, `seen.crown` after one play (not with `plays: 0`). Every 2.2 look maps to a different 2.3 look, so nothing she chose is lost.
- `phrases` starts at her word level when a save has none. `seen.beads` is false for a v1 save and a new one. `afternoon` is empty for both, so the first 2.3 play offers the bead tree.

## Shade tuning (integrator, after the actors lane)

Tuned once at the actors merge (2026-10-29), against `dev/actors.html` at 1080 × 740: the `gowns` and `small` line-ups (party gown, every colour on the gown, crown, shoes, hair things and jewels) and the `hair` line-up under the gold, white and lilac crowns. Only hex values in `src/wardrobe.ts` changed. `tests/wardrobe.test.ts` (the 18 × 12 crown outline pairs) and `tests/actors.test.ts` pass after the change.

| Colour | Shade | Old | New | Why |
|---|---|---|---|---|
| gold | base | #ffe08a | #f6c86c | The gown's lower tier read as pale lemon yellow. Warmer and a little darker, it reads as pale gold next to orange's peach. |
| gold | deep | #ffc83a | #ecb238 | The bodice and upper tier read as plain yellow. Now a warm amber gold. It stays under 1.8 against white and rainbow hair (1.73 and 1.69), so a gold crown keeps its dark gold gems there instead of gems in its own colour. |
| gold (hair) | base | #ffc83a | #f2b233 | Gold hair read as bright yellow. It now takes the gold picture tint, so it reads as gold and stays apart from honey (beige) and sunny (pale blonde). |
| gold (hair) | light | #ffe28a | #fbd77e | Goes with the new base. |
| green | base | #b8ecc7 | #a4e3b2 | The gown's main tier read as mint. Now a clear pale green. Green hair (#5cc27a) already read as green. |
| silver | base | #dfe6fa | #e2e6f2 | The silver gown read as pale blue next to the blue gown. Less blue, it reads as silver grey. |
| silver | deep | #c3cff0 | #c6cddf | Same reason: the upper tier read as periwinkle. |

**Effect on the crown outline.** Only gold hair changes. All 12 crowns on gold hair now take white gems and a white rim (contrast 1.88) instead of dark gold, the crown's deep shade or dark purple. A white crown now has white gems on 14 hair colours instead of 13 (section 15 updated). Her default look (sunny hair, Lumi's gold crown) keeps its dark gold outline, and the gold `small` shade (#ffb62e, her crown) is unchanged.

**Looked at and left as they are.**

- The crown outline shows on every hair under the gold, white and lilac crowns. The white crown with white gems on dark and coloured hair shows as a white crown. On sunny, white, silver and rainbow hair the gems are dark gold. The lilac crown on sunny hair has dark gold gems, which show.
- Pink, red, orange, blue, lilac, purple, white, brown and rainbow read as their names on the gown, the crown, the shoes, the hair things and the jewels.
- Rainbow on the small parts (the six bands) is pale on sunny hair: the yellow band of a hair thing almost disappears, the pink, mint and blue bands show. The bands are the hair tubes' and 2.2's rainbow dress's too, so they stay. Worth a look on her iPad.
- Run `npx vitest run tests/wardrobe.test.ts tests/actors.test.ts` after any later shade change.
