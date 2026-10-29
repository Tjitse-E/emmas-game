# Ideas

Index of game ideas. Each idea has its own folder in `ideas/`:

```
ideas/<idea-slug>/
  README.md    How Emma learns English reading and maths from the game
  index.html   Playable mockup (iPad, touch)
```

Each `README.md` covers:

- **Pitch:** the game in one or two sentences.
- **Game loop:** what Emma does, what she wins.
- **Reading:** which reading skills the game trains and how.
- **Maths:** which maths skills the game trains and how.
- **Sound:** what is spoken, sound effects, music.
- **Progression:** how it gets harder as she improves.

## Status

| Idea | Folder | Reading | Maths | Status | Emma's verdict |
|------|--------|---------|-------|--------|----------------|
| gpt6: Pony Post | _not kept_ | CVC destination words | Count and adjust bridges to 5 | rejected | Not worked on further. |
| gpt6: Puffling Nursery | _not kept_ | Care words in context | Add and take away food to 4 | rejected | Not worked on further. |
| gpt6: Cloud Castle | _not kept_ | Colour words and top | Build and compare tower heights | rejected | Not worked on further. |
| gpt6: Lantern Lagoon | _not kept_ | CVC island labels | Combine one- and two-space moves | rejected | Not worked on further. |
| gpt6: Royal Picnic | _not kept_ | Ingredient words on tickets | Combine and adjust quantities | rejected | Not worked on further. |
| opus-5-5: Pippa's Word Wand | [opus-5-5-pippas-word-wand](ideas/opus-5-5-pippas-word-wand/) | Spell CVC words from sounds, blend them on the wand | None in the mockup (planned later) | chosen | Shared 2nd. Good idea, needs work. Unclear which word is wanted; say the word aloud. Loves the sticker book. |
| opus-5-5: Fluffle Nursery | [opus-5-5-fluffle-nursery](ideas/opus-5-5-fluffle-nursery/) | Read the baby's word wishes (blending) | Count out what it asks for | chosen | Shared 2nd. Likes caring for the fluffy animals and the challenges. Needs further work. |
| opus-5-5: Queen Emma's Letters | [opus-5-5-queen-emmas-letters](ideas/opus-5-5-queen-emmas-letters/) | Short sentences with tricky words, read to act | Counting and take away within 10 | rejected | Unclear what to do, she did not get it. |
| opus-5-5: Unicorn Egg Nest | [opus-5-5-unicorn-egg-nest](ideas/opus-5-5-unicorn-egg-nest/) | Name the foal, read the hide-and-seek signs | Number bonds to 10, dice patterns | chosen | 1st. Likes the role play, fantasy, naming and nursing. |
| opus-5-5: Moonbeam Stables | [opus-5-5-moonbeam-stables](ideas/opus-5-5-moonbeam-stables/) | Read pony names on the fence | Counting on ten-frames, same, adding on | rejected | Too easy, felt like no maths and no reading. |
| opus-5-5: Unicorn Egg Nest v2 | [opus-5-5-unicorn-egg-nest-v2](ideas/opus-5-5-unicorn-egg-nest-v2/) | Spell the baby's name from its spoken sounds, read wish words and name signs | Number bonds to 10 with moon cups and stones | mockup | |
| opus-5-5: Pippa's Word Wand v2 | [opus-5-5-pippas-word-wand-v2](ideas/opus-5-5-pippas-word-wand-v2/) | Spell the word a visitor says, read notes and a tea-party sentence | Counting on and bonds to 10 with number stones | mockup | |
| opus-5-5: Fluffle Nursery v2 | [opus-5-5-fluffle-nursery-v2](ideas/opus-5-5-fluffle-nursery-v2/) | Read the baby's written wishes, build its name | Exact plates to fill a ten-frame tummy, bath-jug bonds to 10 | mockup | |
| opus-5-5: Moon Meadow Home (v3) | [games/moon-meadow-home](games/moon-meadow-home/) | Spell the babies' names, read wishes (with plurals), label jars | Warm eggs with number stones (totals 7 to 15), door numbers, hay rack bundles | building (1.0.1 live: harder maths to 15, feeding, lantern walk to bed; waiting for her feedback) | |
| opus-5-5: Moon Meadow World (v4) | [games/moon-meadow-world](games/moon-meadow-world/) | Read the babies' wish words in baskets of 4 and 5 near words (dress-up, pond, picnic), colour phrases such as "the green sock" at the Dressing Corner, spell their names, door numerals | Three sums per egg (within 10, just past 10, across ten) with 4 or 5 number stones, bead patterns at the bead tree, the hay rack, door numbers | building (2.3.0: the Dressing Corner, a bigger wardrobe with colours, crowns, shoes and jewels, presents from every side quest, the bead tree; waiting for her play and her picture check, see [docs/v4/2.3.md](docs/v4/2.3.md)) | Demo: wants to dress Princess Emma herself, still guesses words sometimes. |

Status values: `idea`, `mockup`, `chosen`, `rejected`, `building`.

Games with status `building` live in `games/<slug>/` instead of `ideas/`.

Emma picks a v2 game from the picture menu at [index.html](index.html). The v2 plan, designs and build decisions are in [docs/v2/](docs/v2/).
