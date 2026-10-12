# Concept: The Moon Kingdom (a map of lands)

v3 concept for Unicorn Egg Nest, 2026-10-12. Structure: a kingdom map where each land is a level. Sources: the v2 verdict and Tjitse's answers of 2026-10-12, `docs/v3/research/` (v2-audit, engagement, curriculum, naming, engine) and the 59 ideas in `docs/v3/brainstorm/`. Step codes R01 to R45, S01 to S42 and M01 to M48 are the ladders in `research/curriculum.md`.

## Summary

Emma is the Nest Keeper of the Moon Kingdom. The kingdom has seven lands on a painted map. Moon Meadow is home, where the nest and the herd live. Six more lands lie behind moon mist. Each land matches one block of the three learning ladders and brings its own egg kinds, its own unicorn breed, two role play activities and its own pin set. Every ladder step she passes lights a lantern on the road to the next land and opens one new spot inside a land. When the road is lit, the herd gathers for a bridge ceremony and the mist rolls back.

The v2 core stays the centre of every visit: an egg is always waiting in the nest, she warms it with number stones, it hatches, she names the baby, spells the name, and the baby moves into its own numbered stall. The herd never shrinks and has no cap. Names are never refused.

A visit can be 5 minutes (one egg, one wish, goodnight) or 45 minutes (several eggs, a trip to a land with chosen babies, free play, a bedtime story). There is no daily pattern, no streak and no cost for being away.

The first playable build is Moon Meadow plus Crystal Lake, the full naming fix, the stable, the map, server saves and the import of her v2 herd.

## 1. The fantasy and Emma's role

**The story in one breath.** Long ago the Moon Kingdom fell asleep under moon mist. Only Moon Meadow stayed awake. Queen Lumi needs a Nest Keeper to warm the sleeping eggs and wake the kingdom, land by land. Every new thing Emma learns makes the moon a little brighter. The light runs along the road as lanterns, and when a road is fully lit the mist over the next land rolls away.

The mist is not sad or scary. Behind it, babies peek out and wave. Nothing in the kingdom suffers while she is away. It simply waits.

**Emma's role.** She starts as Nest Keeper of Moon Meadow (the crown badge from v2). Each land she opens gives her a new title ribbon on the crown: Lake Keeper, Woods Keeper, Cloud Rider, Market Keeper, Shore Keeper, and at the end Royal Nest Keeper of the Moon Kingdom. In each land she also plays a role: hairdresser, teacher, cook and tea party host, explorer, flying teacher, shopkeeper, show rider, and every night the parent who reads the bedtime story.

**Cast. Unicorns only.**

| Character | Voice | Speaks |
|---|---|---|
| Narrator | Elizabeth | Every instruction, hint, number, letter sound, word, sentence and name. The only voice for learning content. |
| Queen Lumi, silver unicorn with a small crown, bottom left of the screen | The Queen (Posh) | Greetings, story lines, celebrations. Never a learning word. Her horn casts the moonbeam spotlight. |
| Emma's babies | Flicker | Giggles and tiny fixed words: "Yay!", "Here!", "Not me!", "Again!" |
| Pinch, a cheeky pale blue wind foal who borrows shiny things to play hide and seek | Flicker, with its own seed | Giggles only |
| Visiting cousins, young unicorns from far kingdoms (customers, show riders, salon guests) | Flicker | Giggles and tiny fixed words |

No Fluffles, no Princess Pippa, no other animals. Mistake reactions use unicorns, objects and weather (a splash, a puff of wind, a hat sliding off). Grown unicorns from her own herd become the helpers in each land (section 4), so the kingdom fills with babies she named.

## 2. The core loop and session shapes

### 2.1 Three loops

| Loop | Length | What happens | Learning |
|---|---|---|---|
| Inner: egg | about 2 minutes | Warm the egg with number stones, hatch, name, spell, the baby trots to its numbered stall | 1 to 2 maths items, 1 spelling item, often 1 number item at the stall |
| Middle: outing | 5 to 10 minutes | Go to a land with 1 to 3 babies she picks, play one activity, the item or photo lands on the baby and in a book | 3 to 8 items of reading or maths, plus free play |
| Outer: kingdom | weeks | Passed ladder steps light lanterns and open spots. A lit road opens the next land with a ceremony. | The ladders themselves |

### 2.2 The egg, with the naming fix

The egg works as in v2: a frame of moon cups, a basket of number stones shown as dots or numerals (never in a ten-frame layout), hot cheeks and steam for too many, frost and a shiver for too few, then the big hatch. The egg kind depends on her maths step (section 3.4). From the second visit on, the nest offers two eggs: one at her step and a golden one a step harder that she can choose. A first try with no hint can hatch a shiny baby, as a surprise.

Naming follows `research/naming.md` completely. The line "I don't know that name" is removed from the game.

1. The baby holds three name bells (names at her spelling step), the name garden (picture groups: flowers, gems, sky, sweets) and the gold bell (free building).
2. Bell or garden: Elizabeth says the name first, then Emma spells it in sound slots. Graphemes above her step arrive as sparkly gift gems, already placed. Only her own slots are checked.
3. Gold bell: three slots to start, a plus button adds slots up to six, and the tray holds her full grapheme set plus every grapheme she has met.
4. She slides the star and hears her own letter sounds. Then the game checks, in this order:
   - No vowel: "Every name needs a pink gem!" and the pink gems glow. This is a phonics rule, not a refusal.
   - A rude or toilet word: the baby giggles and shakes its head, "That's a silly name! Try other gems." Strong words are greyed out in the tray before she can build them.
   - A name on the list: Elizabeth says it. "Rosie! What a lovely name!"
   - Close to a list name: a second bell rings the list name next to her own bell. She picks either. Her own spelling is always allowed.
   - Anything else: "A brand new name! I will teach it to the Queen." The tag goes on at once and the name joins the name queue.
5. A name already in the herd: "Another Tim! Tim the Second!"
6. Every build is logged, accepted or not, for the parent corner.

**Name audio.** About 1,000 names are generated before launch (UK, Dutch and Cypriot first names, fantasy and nature names, decodable names) and about 1,000 more in month 2. A new name is queued and travels to `odin.vendic.cloud` with the save. Tjitse runs the generator, which loads the key itself, makes "Name!" and "Name?" in Elizabeth's voice, runs the speech-to-text check and puts the clips on the review sheet. On her next visit Lumi says "The Queen learned a new name!" and the baby hears its name for the first time, jumps and gets a heart. The wait becomes a reward moment. If the wait bothers Emma, the on-demand server option (naming.md, option c) can follow later. That is decision D1.

### 2.3 Visits: no fixed pattern

- **An egg is always waiting.** Every visit opens at home with the herd running to the fence and an egg in the nest. There is no "come back tomorrow" and no expiry.
- **Leaving is always fine.** The game saves after every moment. A half-warm egg keeps its warm cups. The sleepy moon button (top right) starts a short goodnight at any time, but she can also just close the iPad.
- **Choices after each hatch.** Three big picture doors: another egg, a land on the map (with a picture of what is waiting there), or the sleepy moon. The sleepy moon is always one of the three. The game never asks her to stay.
- **Learning budget per visit.** At most 2 or 3 new items per strand enter in one visit (curriculum 5.3). After about 20 checked items in one strand, that strand only draws review items and items from passed steps. Eggs and outings keep working, so a 45 minute visit does not turn into a drill and fatigue does not push the ladders down.
- **Checked work and free play alternate.** After two checked activities in a row, the doors put a free play place first (salon, wardrobe, photo, riding in the meadow).

### 2.4 A 5 minute visit

| Time | What she sees and does | Learning |
|---|---|---|
| 0:00 | Taps the big egg button. The herd runs to the fence. Lumi: "Welcome back, Nest Keeper!" Elizabeth: "Twenty-three unicorns!" | Herd count heard as a number |
| 0:15 | The moonbeam lights the nest. A crystal egg waits. "This egg is cold. Make every cup warm." She drags a stone, the dots fly into the cups. | Maths: bond to 10, 1 or 2 items |
| 1:00 | Wobble, three cracks, confetti. A crystal foal with a mint mane. | |
| 1:15 | Name bells, the garden, the gold bell. She picks the Lily bell. Elizabeth: "Lily." She fills l, i, l. The y is a gift gem. She slides the star. The crown capital flips. | Spelling: her slots only |
| 2:30 | Lily trots to the stable yard. "Lily is unicorn number twenty-four. Which stall is hers?" Stall 24 is next to the last full door. | Maths: numeral and counting on |
| 2:50 | An older baby, Tam, hops over with a speech bubble showing print: "bath". She drags Tam to the bath tub. Bubbles, a heart. Elizabeth: "Tam says: bath!" | Reading: one word, read then act |
| 3:30 | Three doors: another egg, Crystal Lake (a picture of a pin peeking from a reed bed), the sleepy moon. She taps the moon. | Choice |
| 3:45 | Goodnight. One storybook page: "Lily is in the moss bed." She drags Lily to the moss bed. The babies yawn and sleep one by one. Above the meadow two constellations and four stars: "Two tens and four. Twenty-four unicorns." | Reading: one sentence, read then act. Maths: tens and ones |
| 4:45 | "Goodnight, Emma." The screen dims. Saved. | |

About 6 to 8 checked items: 3 maths, 1 spelling, 2 reading.

### 2.5 A 45 minute visit

| Time | What she sees and does | Learning |
|---|---|---|
| 0 to 5 | Arrival, crystal egg, hatch, name, stall (as above) | 2 maths, 1 spelling, 1 maths |
| 5 to 9 | Another egg. She picks the golden twin egg. The mirror pond copies her stone to the second half. Two babies! She names them Pip and Kip: one gem swapped. | Maths: doubles. Spelling: phoneme swap |
| 9 to 11 | The Pin Post drops two envelopes with names on them. She reads "Pip" and "Tam" and delivers. Pip pins a star pin on its sash. "Pip has seven pins. Three more fill the sash." | Reading: names. Maths: bond to 10 |
| 11 to 12 | Map. She taps Rainbow Woods (a recipe card is waiting). Three babies hop forward at the gate and she taps two to take along. | Choice |
| 12 to 20 | Moonberry Kitchen. Recipe card: "4 figs. 2 nuts." She counts into the bowl, stirs, the oven puffs. Tea party: she seats babies by their place cards and shares 12 berries over 3 plates. The table tips when the plates are uneven. Party photo. | Reading: recipe words, names. Maths: counting, sharing |
| 20 to 25 | Trail ride with her two babies. Stepping stones numbered to 20, "Hop 6!", a fork with two signs, "pond" and "cliff". The goal picture shows a pond. A wild moss egg sits in the reeds. | Maths: counting on. Reading: signposts |
| 25 to 28 | She warms the moss egg on the spot. A rare moss foal. Names it. | Maths, spelling |
| 28 to 33 | Free play in the Sparkle Salon at home. She braids beads into Lily's mane, clips the new star pin, snaps a photo. Nothing is checked. | None |
| 33 to 37 | Unicorn School. Two babies at the slate. Elizabeth says "bed". The baby built b, e, t. The slate plays back "b, e, t". She swaps the t for a d. Gold star stamp. | Spelling: Dutch final d and t, as a teacher |
| 37 to 40 | A lantern lights on the road to Cloud Castle and a new spot opens in Rainbow Woods: the Measuring Tree. Lumi: "Something new in Rainbow Woods!" A new pin set appears in the book with silhouettes. | Progress, shown |
| 40 to 45 | Sleepy moon. The bedtime book has three pages starring her babies, one sentence each, read then act. The herd sleeps. The sky counts the herd. | Reading: sentences |

About 25 to 30 checked items spread over the three strands, with free play in between.

## 3. What levels are

### 3.1 Lands, spots, lanterns and bridges

- **A level is a land.** Seven lands on the map. Each land owns one block of each ladder (table in 3.2).
- **A land has 8 to 12 spots.** Each spot belongs to one ladder step of that land's block. When she passes that step, the spot opens: a new egg kind, a new activity card type, a new item set or a new place to play. Something new opens about every 3 to 7 visits.
- **The road to the next land has lanterns.** Every passed step in any strand lights one lantern. The road is lit, and the bridge opens, when she has passed 70 percent of the current land's block counted over all three ladders together. A slow strand cannot hold her back for long, and a fast strand pulls her forward.
- **The bridge ceremony** (from the Moon Egg Nights idea). The whole herd stands in a circle around a big land egg with three rings. Each ring is one short familiar task (warm a ring with stones, spell a name on a ring, read a sign to find the ring's key), drawn from the steps she just passed plus one older review. Nothing fails. A missed ring flickers, a baby from her herd trots up and the hint ladder runs. Filled rings stay filled if she leaves. The egg hatches the first baby of the new breed, the mist rolls back, the Queen speaks, and Emma's crown gets the land's title ribbon.
- **Every opened land stays open.** She can go back to any land at any time. The content inside always uses her own current step per strand.
- **Hidden scaffold levels.** Inside a step the scaffold still moves (dots, then dots and numerals, then numerals; frame visible, then hidden; slider gaps). She never sees this. Two misses in a row lower the scaffold, never the ladder (curriculum 5.1).

### 3.2 The lands and the ladders

| # | Land | Reading | Spelling | Maths | Steps | Egg kinds | Breed | Activities | Pin set |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Moon Meadow (home) | R01 to R12, Phase 2 | S01 to S08 | M01 to M08, Reception | 28 | Moon egg, two-nest egg (more and fewer), pattern egg | Moon foals (the v2 babies) | Care Round, Sparkle Salon, Pin Post, Unicorn School, Stable Row, Bedtime Book | Moon pins |
| 2 | Crystal Lake | R13 to R20, Phase 3 | S09 to S11 | M09 to M17, within 10 | 20 | Crystal egg (bonds to 10), ice egg (take away), pebble egg (shapes) | Crystal foals, glassy horns | Pinch's Hide and Seek, Echo Cave (school for Dutch vowels) | Shell and pearl pins |
| 3 | Rainbow Woods | R21 to R29, Phase 4 and meaning | S12 to S18 | M18 to M25, within 20 | 24 | Rainbow egg (twenty-frame, make ten), twin egg (doubles, halves), acorn egg (number line) | Rainbow foals, striped manes; twins | Moonberry Kitchen and Tea Party, Trail Rides, Measuring Tree | Leaf and berry pins |
| 4 | Cloud Castle | R30 to R35, Phase 5 first half | S19 to S24 | M26 to M31, to 100, groups, halves and quarters | 18 | Cloud egg (tens and ones), star egg (count in 2s, 5s, 10s), quarter egg | Cloud foals with little wings | Flying Lessons, Royal Ball and Wardrobe | Star and crown pins |
| 5 | Sunrise Market | R36 to R39, Phase 5 second half | S25 to S30 | M32 to M35, money, time, direction | 14 | Coin egg (make an amount), clock egg (hatches at the hour she sets) | Sun foals, golden manes | Market Stall, Clock Tower | Coin and bell pins |
| 6 | Starfall Shore | R40 to R42, short texts | S31 to S36 | M36 to M43, to 100, 2, 5 and 10 tables | 17 | Shell egg (two-digit add and take away), sea star egg (groups of 2, 5, 10) | Sea foals, shell horns | Rosette Show and Grand Parade, Lighthouse letters | Sea pins |
| 7 | Moon Tower | R43 to R45, inference and fluent pages | S37 to S42 | M44 to M48, change, fractions, time, measures, charts | 14 | Pearl egg (fractions of amounts), great moon egg (finale) | Moon-gold foals | Royal Library, Tower Clock, Herd Charts | Moon-gold pins |

Total 135 steps. Each land's words come from its block: Crystal Lake signs and clues are full of Phase 3 words (boat, moon, reeds, rain, star, fork, coin), Rainbow Woods has blends (nest, frog, cliff, twist), Cloud Castle has Phase 5 spellings (cloud, crown, play, flew, cake).

### 3.3 Example: the spots of Crystal Lake

| Spot | Opens when she passes | What it brings |
|---|---|---|
| Crystal Nest | arrival | Crystal egg, bonds to 10 with the frame visible (M09) |
| Lily Pads | M10, M11 | Two-stone eggs, then the blanket egg with the frame hidden |
| Reed Beds | R13 | Pinch's Hide and Seek, clues with ai, ee, igh words |
| Pearl Pool | R14 | Pearl pin set, clues with oa and oo words |
| Small Nests | M12 | Bonds to 6, 7, 8 and 9 |
| Ice Shelf | M14 | Ice egg: too warm, take stones away |
| Boat Dock | R15, M15 | Boat names with ar, or, ur; "how many more seats?" |
| Echo Cave | R20 | The echo says words the Dutch way, Emma's class fixes them |
| Pebble Shore | M17 | Pebble egg: stones are shapes |
| Shell Beach | M16, R17 | Fact family eggs; Phase 3 tricky words on shell labels |

### 3.4 When the strands move at different speeds

Emma is a Dutch speaker learning English. Her reading may sit one or two terms behind her maths. The map handles this in three ways.

- **The land sets the place, her step sets the content.** In Rainbow Woods the recipe cards use her own reading step, even if her reading is still in the Crystal Lake block. The pictures carry the meaning, the words at her step decide which or how many.
- **Stray eggs.** The egg kind follows her maths step. If her maths is ahead of the land she is in, the nest sometimes holds a stray egg that floated over the mist from the land that owns her step. Lumi: "A cloud egg! It came over the mist." It hatches that land's breed early. This is a preview that pulls her forward. If her maths is behind, the new land still has eggs at her step, drawn in that land's look.
- **Spots in the mist.** A passed step that belongs to a land still in mist lights a spot inside the mist. She sees the glow from the map. When the land opens, those spots are already open, so she arrives in a land that already has things waiting for her.

### 3.5 Months and the map

Ladder pace is about 3 passed steps a week across the three strands at 4 to 6 visits a week (curriculum 5.5).

| Land | Steps | Weeks from a Phase 2 start | If the probe places Emma at about R13, S05, M10 |
|---|---|---|---|
| Moon Meadow | 28 | 1 to 9 | Opens fully in week 1 (placement) |
| Crystal Lake | 20 | 10 to 16 | Weeks 1 to 7 |
| Rainbow Woods | 24 | 17 to 24 | Weeks 8 to 16 (month 3 and 4) |
| Cloud Castle | 18 | 25 to 32 | Weeks 17 to 24 (month 5 and 6) |
| Sunrise Market | 14 | 33 to 38 | Weeks 25 to 31 (month 7) |
| Starfall Shore | 17 | 39 to 45 | Weeks 32 to 38 (month 8 and 9) |
| Moon Tower | 14 | 46 to 51 | Weeks 39 to 45 (month 10) |

From a Phase 2 start the map takes about 12 months. From Emma's likely start it takes 9 to 10 months. Phase 5 reading steps are heavy, so Cloud Castle and Sunrise Market may run longer. The novelty floor (section 6) covers slow stretches.

When the map is complete the kingdom stays open, with seasons, families, shows and the full herd. A second map (the far side of the moon) is a later decision, not part of this concept.

## 4. Role play activities

Three rules hold for every activity (from the role play brainstorm):

1. **Her own herd is free play. A card, a bubble, a visitor or an egg brings the challenge.** When she styles, feeds or dresses her own babies with no card, nothing is checked and nothing is wrong. A checked moment always starts with a card or bubble that arrives with a chime and a gold seal.
2. **Three answer tools only.** The gem tray and slots for spelling, the stone basket for numbers, and print with sound dots for reading. New places bring new pictures, never a new way to answer.
3. **A mistake is a short, funny event in the world, then the v2 hint ladder.** Nothing a wrong act produces is a reward, so random tapping never pays. A right act always gives the bigger reward (the item, the hatch, the photo).

For reading, the deciding word is never spoken before she acts. Tapping a word plays its pure letter sounds. After the act Elizabeth reads the whole text while it lights up. For spelling, Elizabeth always says the target word first.

### 4.1 The Nest (every land)

- **Role:** Nest Keeper.
- **Learning:** maths ladder through egg kinds (moon cups to 10, ice egg take away, twenty-frame make ten, twin doubles, cloud egg ten-sticks and ones, coin egg, clock egg, shell egg two-digit sums, sea star groups). Spelling through naming.
- **Mistake in the fiction:** too many: red dots bounce off, steam, red cheeks, "Too hot! Two too many." Too few: frost, a shiver, "Brr! Three cups are still cold." A twin egg one off hatches one twin while the other shell shivers. On the cloud egg, 42 for 24 makes the egg wobble under a heap of rows: "That is four tens. We need two tens." (logged as a Dutch reversal).

### 4.2 Care Round (Moon Meadow, grows in every land)

From Baby Talk. A baby hops over with a speech bubble in print. The meadow has care stations: bath tub, pond, swing, hay rack, brush stand, hat box, nap cushion. Each land adds one station (the lake raft, the woods swing, the cloud slide).

- **Role:** carer.
- **Reading:** one word (R01 to R12), then phrases (R27 "a red bow"), then one and two sentences with tricky words (R28, R29 "I am hot. Can I go in the pond?"). Older babies bring older words back for spaced review. Some wishes remember the baby's own history ("I want my red bow."), from the memory pearls idea.
- **Maths:** some wishes carry a number ("I want 3 apples.", later "I had 6. I ate 2.").
- **Mistake:** she puts the baby on the swing when it asked for the bath. It swings once, looks puzzled, hops off and giggles. "bath" glows with its sound dots. After one miss the baby waits until she slides along the word.

### 4.3 Sparkle Salon and the Pin Post (Moon Meadow)

The salon is a mirror, a stool, bead jars, a ribbon rack and the pin box. Free styling of her own babies is a toy. A visiting cousin brings a style card for checked work. The Pin Post drops two or three envelopes addressed to babies by name. Pins go on a sash of ten (two rows of five).

- **Role:** hairdresser and post keeper.
- **Reading:** envelope names (her own herd's names, which are pseudo-words, the screening check skill R38), style cards with one word, then colour and size phrases (R27), then two short lines with a tick box each (R28, R29).
- **Maths:** bead patterns AB, ABB, ABC, growing patterns (M08); "make both braids the same" (doubles, M23); sash bonds ("seven pins, how many more fill the sash?"); later strings of ten beads (M27).
- **Mistake:** the cousin sees a green bow in the mirror, tilts its head and giggles. The bow floats back to the rack. A wrong envelope: the baby sniffs it, shakes its head and pushes it back.

### 4.4 Unicorn School (Moon Meadow, with the Echo Cave at Crystal Lake)

Opens when she passes R11 or S06, or when she reaches Crystal Lake. A schoolroom in a tree. Emma is the teacher with a bell, a star pointer, a gold star stamp and a magic eraser. Babies try a task on their slates and sometimes get it wrong.

- **Role:** teacher. She calls the register (taps name cards, the baby says "Here!").
- **Learning:** the home of the Dutch steps. Elizabeth says "bed", the baby built b, e, t, the slate plays "b, e, t", Emma swaps the t for d (S06, R11). In the Echo Cave the echo reads "moon" with the Dutch oo and the class fixes it (R20). "Which sound?" pairs (R36: cow and snow). Maths: the baby skips a star when counting, writes 42 for "twenty-four" (M20), or makes 8 and 5 into 12. About a third of the slates are right, so she must really check.
- **Mistake:** if she stamps a wrong slate, the baby proudly shows it to Lumi, the slate plays back, the baby says "Oops!" and they fix it together. If she changes a right slate, the slate plays her version and the baby tilts its head. The baby was the one learning, so the mistake is never hers.
- **Collecting:** a report card with chalk stars on each baby's page, a graduation cap per land.

### 4.5 Pinch's Hide and Seek (Crystal Lake, later every land)

From the Magpie's Treasure Trail, recast as a unicorn. Pinch, a giggly wind foal, swoops in and borrows a pin, a bell or a bow from one of her babies. Mist rolls in. Pinch leaves a clue note. The scene has six hiding places of one kind (a boat, a pot, a shell, a log, a hat, a tub).

- **Role:** finder and detective.
- **Reading:** the first time, she sees Pinch drop the pin in the boat, then the mist, then the note "boat". Then object words at her step, position phrases (R27 "under the big log"), then two clues with negation (R29 "It is not in the boat. It is in the tub.").
- **Maths:** later "the second shell", "go 3 steps to the rock" (M35, M19).
- **Mistake:** she lifts the wrong pot. A splash of lake water jumps out, her companion gets wet and shakes its mane, and Pinch giggles in the reeds. The deciding word glows with its sound dots.
- **Collecting:** the found item goes back on the baby and onto its book page. Each land has a pin set to complete this way.

### 4.6 Moonberry Kitchen and Tea Party (Rainbow Woods)

From the Kitchen, the Moonberry Picnic and the Moon Café. Two screens: cook first, then the party.

- **Role:** cook and host.
- **Reading:** recipe words (jam, bun, figs, nuts), place cards with her babies' names, later recipe steps as sentences (R28 "Mix the jam and the buns.") and sequence words.
- **Maths:** count out to 20 (M07), missing part ("7 berries, 3 are in"), sharing over plates (M06, M30), doubling a recipe (M23), cutting a cake in halves and quarters (M24, M31), cupcake trays of 2 rows of 5 (M29).
- **Mistake:** extra berries roll off the bowl and hang above it, so she sees how many too many. Too few: a flat, tiny cake, and the baby asks "More?". Uneven plates: the table tips like a see-saw and the cups slide. Wrong seat: the baby hops on, looks at the card, "Not me!", hops off.
- **Collecting:** a recipe book with a sticker per dish, tea set pieces, a party photo.

### 4.7 Trail Rides (Rainbow Woods first, then a trail in every later land)

From Egg Trails and Trail Rides. Once babies reach the foal stage she can take one to three on a ride. A side-scrolling trail with numbered stepping stones, forks with signposts and a goal picture in a bubble. At the end: a wild egg of a kind only trails give, or a missing pin.

- **Reading:** signposts (pond, cliff, den), later "The bridge is shut. Go by the hill." (R28, R29).
- **Maths:** the trail is a number line: "Hop 6!", count on and back within 20 (M19), jumps of 10 and 5 on longer trails (M26, M38). Left and right at forks (M35).
- **Mistake:** the unicorn hops to the stone she picked and lands in a puddle with a big splash, giggles, and Lumi counts back to the start of the jump.

### 4.8 Measuring Tree (Rainbow Woods)

From Growing Day. Nobody is ill. Babies come because they are growing. She stacks heart blocks next to a baby, reads its height on the growth post, weighs it on a balance with apples, picks a blanket that fits.

- **Maths:** compare length, height and mass (M25), difference ("Pip was 4 hearts, now 6", M15), later centimetres and scales (M47).
- **Mistake:** a blanket too short leaves the tail sticking out and the baby wiggles. Too long: it trips and rolls over giggling.
- **Collecting:** a growth chart per baby. Growth stages (baby, foal, young unicorn, grown) are celebrated here like a small hatch.

### 4.9 Flying Lessons (Cloud Castle)

Cloud foals and grown babies have little wings. A path of numbered clouds. A star treat floats over one cloud. Emma gives the baby a wing card with the number of hops.

- **Role:** flying teacher. On later lessons the baby guesses first ("Four hops?") and Emma agrees or corrects it.
- **Maths:** count on and back (M19), skip counting in 2s, 5s and 10s to 100 (M26, M28, M38).
- **Mistake:** too far: a loop-the-loop, a dizzy landing two clouds past the star. Too short: a puff of cloud, "Nearly!"
- **Collecting:** wing badges per baby.

### 4.10 Royal Ball and Wardrobe (Cloud Castle)

A sealed invitation arrives with the Queen's seal and a ballroom picture. "Pip and Tam, come to the ball. Wear a blue cape." She chooses the invited babies at the gate, dresses them and they dance. Free dressing without an invitation is a toy.

- **Reading:** names, colour and clothing words, Phase 5 words (crown, cloud, play), tricky words (come, wear, one), later negation.
- **Maths:** partners and the odd one out (M06, M41), dance steps left, right, quarter and half turns (M35), line dances as patterns.
- **Mistake:** no baby is turned away. A baby in the wrong colour dances anyway but does not glow, and the invitation pinned to the mirror lights up at "blue cape".
- **Collecting:** wardrobe sets with silhouettes, one ball pin per ball, a ball photo of the herd.

### 4.11 Market Stall and Clock Tower (Sunrise Market)

Market: visiting cousins queue with shopping notes. Price tags, a till, a purse. Coins stay in the till. There is nothing to buy with them anywhere else.

- **Reading:** shopping notes from single words to "3 red apples" and "Can I have a cup, please?" (R36 to R39).
- **Maths:** coins and their value with dots at first (M32), paying an amount (M33), later adding two prices and change (M44). Euro or pound is a setting.
- **Mistake:** the cousin tries the wrong item on its head ("A bun on my head?"). Too many coins hop back into the purse.

Clock Tower: the day's plan hangs as a picture strip (bath, supper, ball, bed) with a clock under each picture. She turns the moon hand to start the next event.

- **Maths:** o'clock and half past (M34), days of the week. "Half past" is always shown with the hour hand between the numbers, and one-hour-off errors are logged as Dutch slips.
- **Mistake:** at seven instead of six, the babies arrive at the bath in ball gowns.
- **Rule:** the clock gates at most one or two moments per visit, never the whole visit.

### 4.12 Rosette Show and Grand Parade (Starfall Shore)

A show ring on the beach. She leads a grown unicorn around numbered jumps, then rides a short test from a test card. Everyone who finishes gets a clear-round rosette. There is no ranking. The Grand Parade marches her herd past the Queen in rows.

- **Reading:** test cards ("Trot to the tree. Jump the log."), the herald's scroll with the parade order, ordinals.
- **Maths:** jumps in 2s, 5s and 10s, rows of 2, 5 and 10 with the leftovers riding the float (M41 to M43), adding three judges' scores (M39), a pictogram banner of the herd by coat colour (M48, in Moon Tower).
- **Mistake:** the unicorn trots to the wrong jump, sniffs its flowers, sneezes and trots back to the line. An uneven row bumps and giggles.
- **Show Papa mode:** from home at any time, the whole herd parades with no tasks while Lumi says every name and Elizabeth ends with the count. "Fifty-two unicorns!"

### 4.13 Bedtime Book (home, every goodnight; the Royal Library in Moon Tower)

From the Bedtime Storybook and the Story Shelf. A picture book starring her own babies. Each page has a sentence and a picture that is not finished. She makes it happen.

- **Reading:** two or three words per page (R06), one sentence (R28), two sentences (R29), 3 to 5 sentences (R41), sequencing 3 or 4 panels (R42), inference acted out (R43: "Pip is sad. She lost her bell." She gives Pip the bell), a full page of 40 to 80 words (R45). Rereading old books has no checks and builds fluency.
- **Mistake:** Pip lands in the bin instead of the boat, the babies on the moss bed roll with laughter, the page rewinds and "boat" glows.
- **Collecting:** a book shelf with gaps for the books still to come.

## 5. Collecting

**The herd.** Every baby she hatches stays forever with its name, breed, coat, traits, growth stage, pins and items.

- **Stable Row** at home, from the Ten-Stall Stable and Stables of Ten ideas. Rows of ten numbered stalls with her name plaques. Every new baby finds its own stall number, so the stable is place value she cares about. When a row is full, a flag goes on its roof and a new row is built. No cap.
- **The herd count** is shown big and said often: on arrival, at goodnight and in the parade.
- **Herd in the Sky** at goodnight: every baby has a named star, and every ten stars join into a unicorn constellation. "Three tens and four. Thirty-four unicorns!" She names each constellation herself.

**Breeds, eggs and traits.**

- **Breed Book:** seven breeds with eight coat palettes each, 56 squares with silhouettes for the ones not hatched yet.
- **Egg Book:** about 20 egg kinds (land eggs, seasonal eggs, wild trail eggs), with silhouettes.
- **Traits:** shiny (surprise for a first try with no hint), speckled, golden (the harder egg she chose), twins.
- **Colour Families** (month 6): two grown best friends share an egg that shows a stripe of each colour. She can plan the baby she wants and fill chart squares on purpose. The baby's name bells offer names one sound away from a parent (Pip's baby: Pop, Pim, Tip).

**Pins and items.**

- **Pin sets:** one set of ten per land, on a sash of ten per baby. Pins arrive by the Pin Post, from Pinch's Hide and Seek and from trail rides. A full sash turns gold.
- **Letter pins:** one per grapheme she has secured on the ladder. Tapping it plays Elizabeth's pure sound. The letter pin board is her own phonics progress as a picture she understands.
- **Moment pins:** first twins, tenth baby, first grown unicorn, first name spelled with no gift gems.
- **Wardrobe items:** bows, crowns, capes, saddles, beads, by land, in drawers with silhouettes. Each baby keeps its outfit.

**Books she can look through.**

- **Nest Book:** an overview grid in pages of ten (so 34 babies is three full pages and four), then one page per baby: portrait, name with the crowned capital, breed and egg, traits, pins, report card, growth chart, photos.
- **Photo Album:** photos from the salon, parties, balls and shows. From month 6 she can add a caption from word tiles ("Pip is in the tub.", S18).
- **Recipe Book, Story Shelf, Rosette Wall, Postcard of each land.**

**Milestones she is proud of.**

| Milestone | What happens |
|---|---|
| Herd of 10, 25, 50, 100 | The Queen's bells ring, a flag or tower on the stable, a constellation lights, Show Papa mode suggests itself once |
| A new land | Bridge ceremony, title ribbon on the crown, first baby of the new breed |
| First grown unicorn | A growing ceremony at the Measuring Tree. Grown unicorns choose a job from three picture cards (baker's helper, flying guide, salon helper, ferry at the lake, market helper) and appear there |
| A name she can now spell alone | "You can spell Lily on your own now!" and a moment pin |
| A full pin sash or pin set | The sash turns gold, the babies hold a small parade |

**What is not collected.** No currency, no coins that carry over, no star jar, no chance boxes. Rare things come from her own choice (the golden egg, a trail) or a first-try surprise.

## 6. Novelty drip

**Novelty floor.** Lands open on learning, so a slow stretch could mean nothing new for weeks. The game keeps a floor: if 5 visits pass with nothing new, the next visit brings one item from a reserve that does not depend on the ladders (a seasonal egg, a cousin visitor with a new style card, a new salon bead colour, a new bedtime book, a hatch day party). Seasons follow the real calendar in Cyprus. Nothing expires. A missed season waits in a memory trunk and comes back the next year.

| When | New things (for a start at about R13, S05, M10 in mid October) |
|---|---|
| Week 1 | Her v2 herd arrives. The map. Moon Meadow opens fully through placement. Stable Row with its first full row and flag. Care Round, Pin Post. |
| Week 2 | Crystal Lake opens with its first bridge ceremony. Crystal egg and crystal foals. Pinch steals the first pin. The first "The Queen learned a new name!" moment. Unicorn School opens. |
| Weeks 3 to 6 | Lake spots open one by one: Pearl Pool, Ice Shelf (a reversed egg), Boat Dock, Echo Cave. Pearl pin set. First babies reach the foal stage. Autumn leaf egg at home. |
| Month 2 (November and December) | Rainbow Woods comes near: lanterns on the road, a stray rainbow egg over the mist. Winter at home: snowy meadow, snow egg, snowflake pins, building a snow unicorn by counting snowballs. Hatch day parties for babies that are a month old (bake a cake, count the candles). Herd of 25. |
| Month 3 and 4 | Rainbow Woods: twin eggs, Kitchen and Tea Party, Trail Rides with wild eggs, Measuring Tree. First grown unicorns pick jobs. Herd of 50 and the first Grand Parade. |
| Month 5 and 6 (March, April) | Cloud Castle: cloud foals with wings, Flying Lessons, the Royal Ball and Wardrobe, star eggs. Colour Families start with grown best friends. Spring Blossom egg and flower pins. Photo captions in the album. Letter pin board is well filled. |
| Month 7 to 10 | Sunrise Market (stall, clock tower, coin and clock eggs), Starfall Shore in the Cyprus summer (shows, parades, shell eggs, sea foals), then Moon Tower and the finale: the great moon egg, the whole herd in the sky, and the title Royal Nest Keeper of the Moon Kingdom. |

## 7. The first three sessions

### 7.1 A new player

**Session 1, about 8 minutes, all familiar from v2.** Big egg button. Lumi: "Hello! I'm Queen Lumi. My eggs need a Nest Keeper." The crown badge. One egg, hatch, naming with the three bells and the gold bell shown once by the ghost hand, the first stall in Stable Row, one wish from the new baby, goodnight with one page. The hidden placement probe starts: each egg, name and wish is a probe item. No map yet.

**Session 2, about 10 minutes.** The herd at the fence. Two eggs to choose from. After the hatch Lumi unrolls the map on a table: "This is the Moon Kingdom. We live here, in Moon Meadow. The mist is sleeping on the other lands." Moon Meadow is lit. Crystal Lake shows behind mist with a baby waving. The rest of the kingdom shows as faint shapes in the clouds, not tappable. The Salon or the Pin Post is her first outing. The probe continues.

**Session 3.** The probe settles (8 to 10 items per strand, start one step below the result, full scaffold, Tjitse can override). Lanterns light along the road for every step below her start. If she is already past 70 percent of the Moon Meadow block, the first bridge ceremony runs and she enters Crystal Lake with one baby she picks: a crystal egg, then Pinch takes a pin and the first hide and seek uses a picture clue with the ghost hand. If not, the first Moon Meadow spot opens instead.

**Placement tour.** If the probe passes more than one land, those lands open one per visit, never all at once, so every opening keeps its ceremony. Their eggs stay available as review eggs.

### 7.2 Importing Emma's v2 herd

1. **Back up first.** Before any v3 work goes live, Tjitse copies the v2 save from the iPad (v2 audit, section 6). To make this one tap, v3 adds a small `export.html` next to the v2 demo, served from the same Mac address and port, so it can read the same `localStorage` key (`emma-unicorn-egg-nest-v2`). It shows the herd and a button that saves the JSON file and sends it to the import endpoint on odin. Tjitse does this, not Emma.
2. **Mapping.**

| v2 field | v3 |
|---|---|
| Each baby: id, name, body, mane, mane2 | A moon foal with the same name and colours. Its name clip already exists. |
| traits: shiny, speckled, golden | Same traits |
| hearts 0 to 2, 3 to 5, 6 or more | Growth stage baby, foal, young unicorn |
| stickers, including pin | Wish stickers on its book page. Each pin sticker becomes a moon pin on its sash. |
| gifts | Items placed in Moon Meadow |
| night of hatch | Its hatch day, so hatch day parties work |
| lv and log | A starting guess for the placement probe (v2 L1 to L3 and M2 to M4 map to v3 steps, curriculum section 6) |

3. **The arrival.** Session 1 for Emma replaces the new-player intro. Lumi: "Your unicorns have come to the Moon Kingdom!" The babies cross a moonbeam bridge one by one while Elizabeth says each name. They move into Stable Row: the first row fills, its flag goes up, and the second row starts. "One ten and three. Thirteen unicorns!" The cap of 12 is gone, and the little egg in the nest works again. Her oldest babies (young unicorns) are her first companions for outings.

## 8. Clarity

Queen Emma's Letters failed because the goal was unclear. Every moment in this concept has one goal, spoken and shown.

- **One goal per screen.** Lumi's moonbeam lights the target area with a gold outline. The goal is always a picture: cold cups, empty gem slots, a speech bubble with a baby pointing at it, a goal picture above a trail, a ghost outline of the missing item.
- **Spoken by Elizabeth, replayable.** Tapping Lumi or the speaker repeats the instruction. It never gives the answer. Instructions never say "read". They say "Look at the letters."
- **Checked work has a sign.** A card, bubble or invitation arrives with a chime and a gold seal. Free play has no card, so she can tell "the game wants something" from "I am playing".
- **The goal is visible before the reading.** She sees that a baby wants something or that a pin is gone. The words only decide which, where or how many.
- **First time, the ghost hand.** Every new gesture is shown once on an object that is not the answer.
- **The v2 hint ladder.** Idle 15 seconds (10 on reading): the goal again. One miss or a second idle: a focused hint. Two misses: the answer is shown and logged as helped. Idle never reveals the answer.
- **The map is never a menu of twenty.** After each hatch she sees three picture doors, one of which is the sleepy moon. On the map only open lands and the next misty land are tappable. A land with something waiting shows a picture bubble (an egg, a card, a pin), at most three at once. Tapping a land: Elizabeth says its name and the camera flies there. Tapping the misty land: Lumi says "The mist is getting thinner! Four more lanterns."
- **One way home.** The nest button sits in the same corner on every screen. The crown badge always opens the Nest Book.
- **Busy scenes are trimmed.** Only 3 to 6 babies are on screen for any task. The next free stall glows at low maths steps. Roll calls and parades are capped at ten per group.
- **Words for warmth only on eggs.** Cups are "warm" or "still cold". Every new egg kind gets its own first-time demo and looks clearly different (the ice egg is blue and frosty because its goal is reversed).

## 9. Risks and the first playable build

### 9.1 Biggest risks

| Risk | What we do |
|---|---|
| **The map turns the game into menus**, and the goal of a moment gets lost | Three doors, one goal per screen, pictures on every door, Lumi names what is waiting. Test the map with Emma before building more lands. If she ignores it, lands become places that come to her (the egg and the activity arrive at home) and the map is only a picture of progress. |
| **Lands open too slowly** when reading stalls, and the world feels frozen | Lanterns count every strand. The novelty floor. Stray eggs. Spots open every 3 to 7 visits. Bridge rule at 70 percent, which Tjitse can tune. |
| **Too much content and art for one person and agents** (7 lands, 7 breeds, 4 growth stages, layered items, 13 activities) | Build land by land. The first playable has two lands. Every land reuses the three answer tools and the scene kit. Each activity is demoed with Emma first and cut if she ignores it. |
| **Many unicorns on screen are slow on the iPad** (engine research, main risk) | The rig stress test in week one: 24 idling babies on the meadow. If it fails, the meadow and stable render with PixiJS inside the Svelte app. |
| **Saves on two devices conflict or a baby gets lost** | One JSON document per family on odin, plus IndexedDB on the iPad. Merge by union: babies, items and pins are never deleted by a merge, logs are appended, item memory keeps the latest review per item. Export and import in the parent corner. Play from the home-screen icon only. |
| **Name audio cost and ear-check load** (1,000 names in month 1) | The speech-to-text check catches most bad clips. Tjitse spot checks a sample of the list on the review sheet and listens to every queued name before it goes live. |
| **Mistake reactions are so funny that she makes mistakes on purpose** (Moonbeam's "too easy" in reverse) | Reactions last 2 to 3 seconds and never give an item. The right answer always gives the bigger event. Watch the logs for repeated wrong taps. |
| **45 minute visits become a drill** | The per-visit learning budget, alternating free play, and the sleepy moon on every door screen. |

### 9.2 What v3 first playable contains

Stack as in `research/engine.md`: Svelte 5, Vite, TypeScript, DOM rendering, `shared/audio.js` as a typed module, IndexedDB, PWA on odin over HTTPS.

**In:**

- The rig stress test and the art style sheet (one breed rig with colour layers, growth stages baby and foal).
- Home, Moon Meadow: the nest with moon egg variants for M01 to M12, Stable Row with numbered stalls and row flags, the herd count, Care Round with four stations, the Pin Post and a moon pin sash, one Bedtime Book of 6 pages, Herd in the Sky.
- Naming with every fix from section 2.2: bells, name garden, gold bell with 2 to 6 slots, gift gems, near match, duplicates, the name queue, the "Queen learned a new name" moment, the blocklist. Tier 1 name bank.
- The map: Moon Meadow, Crystal Lake, Rainbow Woods in mist. Lanterns, spots, one bridge ceremony.
- Crystal Lake: crystal egg, ice egg, Pinch's Hide and Seek, 6 spots.
- Progression engine in `src/core/`: ladders R01 to R20, S01 to S11, M01 to M17 with content, scaffold staircase, Leitner item memory, step mastery, placement probe, the per-visit budget. Unit tests for planners and progression.
- Saves: IndexedDB, sync to odin, merge by union, v2 import (with `export.html` on the v2 side), export and import files.
- Parent corner: steps per strand with passed and secure, first-try accuracy, Dutch-pair errors, every built name, the name queue, overrides.
- The test hook and `playwright-cli` checks at 1180 x 820.

**Not yet:** Unicorn School, Sparkle Salon, Rainbow Woods and every later land, twins, growth past foal, jobs, wardrobe, seasons, Colour Families, Show Papa mode. School and Salon come in the second build, because they carry the Dutch steps and the pins she loved.

**Success test with Emma:** she chooses to go to Crystal Lake on her own, she finishes a hide and seek without help on the goal, no name she builds is refused, and her v2 babies are all there with their names.

## 10. Content and audio volume

Assumptions: Elizabeth and the Queen cost 1 credit per character, Flicker costs 2. The plan has 39,945 credits a month and the generator stops at 8,000 left, so about 32,000 are usable per month. The v2 lines average about 16 characters, so 20 characters per instruction line is used here. Numbers include about 15 percent regeneration after the speech-to-text check.

### 10.1 By content type, whole map

| Content | Count | Characters each | Credits |
|---|---|---|---|
| Elizabeth instruction and hint lines (7 lands, home, naming, map, ceremonies) | about 2,000 | 20 | 40,000 |
| Queen Lumi lines | about 350 | 35 | 12,000 |
| Baby and cousin giggles and tiny words (Flicker) | about 200 | 10 | 4,000 |
| Numbers 0 to 100, plus "tens and ones" forms | about 200 clips | 12 | 2,400 |
| Learning words (Phase 2 to Year 2 banks, tricky words, labels) | about 1,400 | 7 | 10,000 |
| Phrases and sentences (wishes, clues, recipes, invitations, notes, test cards) | about 2,000 | 28 | 56,000 |
| Story pages and letters (R41 to R45) | about 60 | 250 | 15,000 |
| Names, two clips each | about 2,000 names | 16 per name | 32,000 |
| New names from the queue | about 40 a month | 16 | 7,700 a year |
| Phonics sounds | 49 exist, about 6 new for Phase 5 | | small, ear-checked by Tjitse |
| Regeneration buffer | | | about 25,000 |
| **Total** | **about 10,000 clips** | | **about 205,000 over 10 to 12 months** |

That is about 40 percent of a year's credits. The rest covers sound effects and music (cost to be measured on the first batch, budget about 3,000 per land), seasonal sets, ear-check regenerations and a second map later. Storage is about 10,000 short mp3 files, roughly 100 to 150 MB, cached per land.

### 10.2 By month

| Month | Main content | Credits |
|---|---|---|
| 1 (first playable) | Home and Crystal Lake lines (about 450), Lumi (60), words R01 to R20 (350), numbers, wishes, clues and bedtime pages (150), names tier 1 part A (600 names) | about 32,000, the full usable month. Part of the names can move to month 2. |
| 2 | Names tier 1 part B (400), Rainbow Woods lines, recipes, signposts and sentences R27 to R29 (300), winter set, School and Salon lines, name queue | about 27,000 |
| 3 to 6 | One new land every 6 to 8 weeks (about 250 lines, 200 phrases and sentences, 150 words each), names tier 2 in slices of 250, seasonal sets, name queue | about 18,000 to 22,000 each |
| 7 to 12 | Market, Shore and Tower, the story pages and letters, seasonal sets, name queue | about 15,000 to 20,000 each |

### 10.3 Art, for scale

7 land maps and backgrounds with 8 to 12 spots each, 7 breed variants on one rig with 8 coat palettes and 4 growth stages, about 20 egg kinds, about 80 pins, about 100 wardrobe items layered on the rig, and about 600 small word pictures (one per picturable word, checked with Emma that she knows them).

## 11. Brainstorm ideas used and dropped

**Used as the spine**

- World 1, Lands of the Moon Kingdom: the map, land blocks, spots per step, mist instead of locks.
- World 6, Moon Egg Nights: the bridge ceremony with rings.
- World 8, Seasons and Festivals: the novelty floor and the memory trunk.
- Collecting 4 and Maths 1, Egg Kinds and Eggs of Many Lands: an egg kind per maths step, a breed per land.
- Collecting 1, World 2, Maths 4, Reading 6, Role play 6 (Ten-Stall Stable, Stables of Ten, Royal Stables, Stable Village, Stable Homes): merged into Stable Row.
- Wildcards 9, Herd in the Sky (with World 10, Star Sky, reduced to the herd constellations).

**Used as activities**

- Reading 1, Baby Talk, with Wildcards 6, memory pearls: Care Round.
- Role play 1 and Maths 6, Sparkle Salon and Mane Salon, with Collecting 2, Pin Post.
- Role play 3, Reading 7, Wildcards 1, World 7 (Unicorn School and Moon School): Unicorn School, plus jobs for grown unicorns.
- Reading 3, Magpie's Treasure Trail: Pinch's Hide and Seek, recast as a unicorn.
- Role play 2, Maths 3, Reading 4 (Kitchen, Picnic, Moon Café): Moonberry Kitchen and Tea Party.
- Role play 9 and World 5 (Trail Rides, Egg Trails).
- Role play 4 and Maths 9 (Growing Day): the Measuring Tree.
- Maths 5, Flying Lessons. Maths 2, Twin Eggs.
- Role play 5, Reading 5, Collecting 5 (Wardrobe and Royal Ball).
- Role play 8, Maths 7, Reading 9 (Market Day, Moon Market), with cousins as customers.
- Maths 8, Moon Clock: the Clock Tower.
- Role play 7, Collecting 6, Maths 10 (Rosette Show, Grand Parade).
- Reading 2 and Collecting 9 (Bedtime Storybook, Story Shelf).
- Collecting 3 and Reading 8 (Photo Album, Snapshot captions), light.
- Collecting 7, Colour Families, from month 6.
- Role play 10, Hatch Days and Best Friends: hatch day parties and the friendships behind Colour Families.

**Dropped**

- World 3, Quest Board: high clarity risk, overlaps the lands.
- World 4, Grumble Cloud: a story over months stalls when a ladder step waits.
- World 9, Sun-to-Moon Day: a fixed daily frame conflicts with "whenever she wants". The clock survives as an activity.
- Collecting 8, Little Museum: overlaps pins and hide and seek.
- Collecting 10, Alphabet Arches: replaced by letter pins, which show the same progress.
- Wildcards 2, Queen's Paper Letters, 3, Papa's Market Day, and 10, Post to Oma: they need Tjitse each time. Papa's customer mode is a possible later extra.
- Wildcards 4, Moon Gazette: overlaps the album.
- Wildcards 5, Bedtime Story Shell: microphone and privacy decision (naming D5). Possible later.
- Wildcards 7, Visitors Pippa and Fluffles: unicorns only.
- Wildcards 8, Emma's Moon Castle: the map is already the long goal, and the art cost is high.

**Invented here:** the lantern road and the 70 percent bridge rule, stray eggs from misty lands, spots inside the mist, the placement tour, the per-visit learning budget, the novelty floor, the three doors with the sleepy moon always present, Pinch the wind foal, grown unicorns as land helpers, letter and moment pins, the v2 `export.html` and the herd's arrival ceremony.

## 12. Decisions for Tjitse

1. The bridge rule: 70 percent of a land's block over all strands. Higher makes lands rarer and more earned.
2. Name audio: the queue that Tjitse generates (recommended), or the on-demand server on odin later (naming D1). Dutch name pronunciation (naming D2).
3. Which phonics programme the school uses, Emma's school year, and pounds or euros (curriculum questions).
4. Whether toilet words are blocked with a giggle or allowed (naming D7).
5. Who deploys the odin endpoint for saves and the name queue. Agents do not SSH to odin.
