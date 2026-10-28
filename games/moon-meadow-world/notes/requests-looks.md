# Requests from the looks lane

## Integrator-only files

None. The lane needs no change in `src/contracts.ts`, `src/content/clips.ts`, `tools/lines.ts` or the other integrator files. The colour word clips (`word-pink` and the rest) already have their lines.

## For other owners (pass on when you merge)

- `README.md` (quests-world): the save paragraph still names the key `mmw.save`. Since 2.3.0 it is `mmw.save2`; `mmw.save` is 2.2's, read once when `mmw.save2` is missing and never written.
- wardrobe-ui and quests-world: `railsOf` and `ownedOptions` now show earned items in the order she earned them, after the start items, not in catalogue order (notes/looks.md). A test that builds `owned` with `withItem` in catalogue order sees no difference.
- wardrobe-ui: `wordOf('eyes', id)` now gives the colour word for blue, green and brown eyes (section 15). The other eye colours give nothing.
