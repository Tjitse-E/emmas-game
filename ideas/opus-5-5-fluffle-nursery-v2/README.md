# opus-5-5: Fluffle Nursery v2

## Pitch

Emma is Nurse Emma in a treehouse nursery. A cloud brings a basket with a baby Fluffle. She names it from letter sounds, reads its written wishes, feeds it an exact plate of berries and washes off mud with number bonds. Every night the baby grows. On the fourth morning it is grown, gets a crown and moves into the Fluffle Tree, and a new basket arrives.

## Game loop

One play day takes about 4 to 5 minutes. Every moment has one spoken goal, one picture and one glowing target. Everything else is dimmed.

1. **Arrival** (first day of a baby). A cloud drops a basket on the window sill. Three taps and the baby pops out and hops onto the rug.
2. **Pom shows how to name** (first baby only). Pom, the grown Fluffle from v1, swings down on a vine. The hand puts p, o, m on the name board and slides the star. Elizabeth says "Pom!".
3. **Naming.** Emma drags one gem from each tray into the glowing box: p m b z, then a i o u, then p n g m. Gems that would make a blocked name are greyed out. She slides the star to hear her name, then taps the heart. The name sign drops onto the cot. Later babies arrive with a free name already on the board, which she can change.
4. **Wish 1 (reading).** The baby points at its thought bubble. The Wish Cupboard stays locked until she has slid the star under the word. Then 6 silent items appear on the shelf. She carries one across the room to the baby.
5. **Feeding (maths).** The tummy rumbles. A tummy window shows a ten-frame with some spots full. She puts berries from a messy bowl on the plate and hands the plate over. The baby only eats an exact plate.
6. **Wish 2.** If wish 1 was right first time, this is a golden wish one level higher.
7. **Bath (maths).** The baby rolls in the garden and comes back with 3 mud splats. Emma drags it into the tub, fills the rinse jug to the star with two numbered soap bubbles (they float on the floor next to the jug) and pours the jug on the mud. Each splat needs a new full jug ("More mud! Fill the jug again."). After the last splat Elizabeth says "Pop the bubbles!" and she pops the leftover bubbles for a few seconds.
8. **Bedtime (reading at review level).** Dusk. The baby yawns and wishes for a cuddly toy. The toy basket opens after the slide. Then she drags the baby into its cot.
9. **Night.** The sticker book opens with today's stickers, then the Fluffle Tree page. The book stays open until Emma taps the glowing tick (or closes by itself after 12 s). A moon button appears in the window. One tap starts the next morning.
10. **Morning.** She taps the cot. The baby wakes up bigger. Day 4: it is grown, gets its fur pattern and a crown with one gem per golden heart, and flies to the Tree.

Five hearts fill per day, one per need. A first-try success makes the heart gold. Tickling the baby (tap it) works at any time.

## Reading

- **Letter sounds:** every letter in the bubble has a sound dot (a bar under a digraph). Tapping a dot plays the pure sound from the shared phonics library. The game never plays the whole word on a tap.
- **Blending:** the star slider plays the sounds one by one with a fixed gap. A sound never starts before the previous one has ended, and the star waits at the next letter until it may play. The slider never says the word. A quick swipe that passes the middle keeps going by itself and still plays every sound with its gap, so Emma does not have to hold the star at each letter.
- **Reading for meaning:** the shelf holds the target, up to 3 items that differ in one sound and fillers that share at most one sound. The one-sound items are picked per position: a final-sound item first, then a first-sound item, then a vowel item (cat, map, cup for "cap"). Fillers that start or end like the target come first, so for targets with few partners (duck, rat, sun) the first sound alone is still not enough. Items are silent. Pairs with an unclear picture never share a shelf (cap and hat, cup and mug). Up to L2 the Dutch-interference pairs from plan 2.4 stay off the shelf (pan and pen, log and lock).
- **Help ladder per wish:** wrong pick 1: the baby sniffs and shakes its head, the cupboard shuts, the shelf reshuffles, the letters pulse with their sounds and she must slide again. Wrong pick 2: the sounds play with 500 ms and then 150 ms gaps and the fillers disappear. Wrong pick 3: "It says... cup." and the right item glows. Elizabeth only says the word after Emma has acted.
- **Naming** is free blending of made-up words. It is not checked.
- **Levels:** L2 (g o c k ck e u r) to L5 (ch sh th ng nk), each with 4 sub-steps: (a) 500 ms gaps, (b) 300 ms gaps, (c) 8 items on the shelf, (d) no slider, tap every dot. The demo starts at L2 (a).

## Maths

- **Feeding (Count strand):** F1 numeral with fading dots (3 to 6), F2 numeral only (5 to 10), F3 ten-frame tummy with 3, 4 or 6 spots full (demo start), F4 tummy covered, a sign shows how many it ate and the outline says 10. The tummy window has the baby's fur as its rim and a fur flap to the baby, so it does not look like a wish bubble. At F1 and F2 the tummy that shows while eating has exactly as many spots as the plate, so "The tummy is full" is true.
- Nobody counts while she places berries. A wrong plate shows the result on the body: ghost berries float into the tummy, empty spots blink for too few, extras spill over the edge for too many. The plate comes back with its berries. After 2 wrong plates the plate gets ten-frame slots. After 3 the empty spots pulse one by one.
- A right plate is eaten one berry at a time while Elizabeth counts on ("seven, eight, nine, ten").
- **Bath (Bonds strand):** B1 jug with 5 lines and dot patterns, B2 jug with 10 lines and ten-frame dots (demo start), B3 numerals only. Each bath has 3 right pairs that share no bubble plus 2 lonely bubbles.
- A right pour: the jug glows and Elizabeth says the sum ("Seven and three make ten!"). Too little: the empty lines blink, "Seven. We need ten." Too much: the water rises over the star line and spills over the rim. After 2 wrong pours the jug gets dots next to its lines. After 3, one bubble of a right pair glows.

## Sound

- All speech is pre-generated ElevenLabs audio played through `shared/audio.js` (Web Audio). There is no browser speech and no HTML audio. A missing clip is silent and logs `[audio] missing <id>`.
- `audio/lines.json` has 235 lines, 3146 characters in total (2762 for Elizabeth, 384 for Peanut). All 235 clips are generated (`audio/*.mp3`, `audio/manifest.json`).
- **Elizabeth (narrator)** speaks every goal and hint line, every word Emma reads (`word-*`), every name (`name-*`) and every number and bond sentence (`num-*`).
- **Peanut (fluffle)** is the voice of the babies and of Pom: babble, giggles, coos, yawns and snores with audio tags. Never real English words.
- **Letter sounds** come from `shared/audio/phonics/` (Elizabeth), not from this game's lines.
- Sound effects are synthesized by `EmmaAudio.sfx` (pop, chime, sparkle, whoosh, soft-no, fanfare, splash, munch, tick, magic, hatch).
- The replay button (top left) repeats the goal of the current moment and its "how" line (for example "Read the bubble. Tap the dots. Then slide the star."), because Emma cannot read. After 8 s (reading) or 15 s (maths) without action, the "how" line plays and the hand shows the gesture. After she has acted, the hint only comes back after 20 s without action, and never while berries are on the plate or water is in the jug. It never shows the answer.

## Progression

- Each strand (Blend, Count, Bonds) has its own staircase: 3 first tries in a row move one sub-step up, one miss moves one sub-step down. The golden wish and bedtime are not counted.
- After two misses in a row within a day, the next need is one sub-step easier without moving the staircase.
- The baby grows four stages: baby (folded ears), little (ears up), big (fluffy tail), grown (fur pattern and crown). Grown babies live in the Fluffle Tree with Pom. The next baby is a new colour.
- Stickers: shiny for a first-try wish, plain after one or two wrong picks, none after full help, gold for a first-try golden wish. Tapping a sticker says its word.

## Mockup

`index.html` plays the full loop in one sitting: day 1 of a baby (arrival, Pom's demo, naming, five needs, night), then days 2 and 3 after one tap on the moon, then the grown day 4 and the next baby. Built for a fixed 1180 x 820 stage that scales with letterboxing. In portrait a "turn the iPad" picture shows. Tested with playwright-cli at 1180 x 820, 1080 x 810 and 820 x 1180.

Progress is saved in `localStorage` under `emmas-game.fluffle-nursery-v2.save.v1`. Reloading resumes at the next morning, or at wish 1 when day 1 was interrupted after naming.

Test hook `window.__game`:

- `state`: step, phase, day, baby, hearts, levels, the current wish, feed or bath, missing audio ids.
- `steps`, `goto(step)` and one helper per step: `arrival()`, `pomdemo()`, `naming()`, `wish1()`, `feed()`, `wish2()`, `bath()`, `bedtime()`, `night()`, `morning()`, `grown()`.
- `answer()` does the next right action of the current step. `wrong()` does a wrong pick, plate or pour.
- `setLevel('blend' | 'count' | 'bonds', n)`, `setDay(n)`, `fast(true)` (skips waits and audio), `mute(true)`, `play()`, `save()`, `load()`, `reset()` (clears the save and reloads), `log`.

Placeholders and cuts for the demo:

- Audio was checked with speech-to-text only, nobody has listened yet. Speech-to-text hears Elizabeth's short u in made-up names as an o ("Mup" as "Mop", "Bup" as "Bop") and short o as "aw" ("Pon" as "Pawn"). Real words with the same vowels pass, so this is most likely the American transcriber hearing a British vowel. Listen to `name-mup`, `name-bup` and `name-pon` first.
- Zun and Zum were removed from the names: in every take Elizabeth said "Zoom" and "Hello, Zinn". Bon was removed as well: it came out as "Bone" and, respelled as "Bonn", as French "Bonne". 25 names are left.
- Some lines carry a `seed` (a better take) or a respelled text: `word-sun` is "Sun!" ("Sun." came out as "Sunday") and `name-zan` is "Zann!" ("Zan" was heard as "Zen").
- Cut: parent corner, picture check, calendar lock, session limit, room gifts, lifting and bouncing the baby between needs, the Fluffle echo of the word (Fluffles never say real words), name neighbour checker, Leitner boxes, server save.
- Word art is simple inline SVG drawn for this demo. The nut is a hazelnut (it was an acorn) and the mop stands in a bucket (it looked like a broom). Some pictures may still be unclear to Emma (fin, zip, wig, chip, and rat, which looks like a mouse). Watch which ones she does not know.
- The Fluffle kinds differ only in colour. All Fluffles share one body shape.

## Changes from v1

- **"The speech and letter sounds were really bad."** Every line is now a pre-generated ElevenLabs clip and letter sounds come from the shared pure-phonics library. Browser speech and its fake phonemes are gone.
- **"Loves caring for the fluffy animals."** One baby is raised over four days: fed, bathed, given a cuddly toy and put to bed. It visibly grows every night and joins a growing Fluffle Tree family. Tickling works at any time.
- **"Likes the challenges."** The challenges now need real reading and maths. The cupboard stays locked until she has slid the star, the shelf has one-sound-different items, the baby only eats an exact plate and the mud only washes off with a jug filled exactly to the star. A staircase keeps each strand near 80% first-try success.
- **Naming (Emma's favourite in Unicorn Egg Nest)** is part of every new baby: she builds its name from sounds.
- **Collecting (she loves the sticker book in Word Wand)**: wishes give shiny, plain or golden stickers, and grown babies fill the Fluffle Tree.
- **Lessons from the dropped games.** Every moment has one spoken goal, one picture and one glowing target, and the replay button repeats it (Queen Emma's Letters was unclear). Nothing is counted or read aloud before she commits, and wrong answers show in the world as ghost berries, a spilling jug or a head shake (Moonbeam Stables was too easy).
- **Babble is never a real word.** Four Fluffle lines held real English words ("bee", "loo", "boo", "baa"). They were rewritten and regenerated, so the written word stays the only clue to a wish.
- **v1 bugs fixed:** the slide is now required before the cupboard opens, the tummy rub only appears for food, the voice no longer counts while she places berries, and the baby never eats part of a plate.
