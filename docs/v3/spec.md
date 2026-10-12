# Moon Meadow Home: design spec

Unicorn Egg Nest v3. Draft for Tjitse's review, 2026-10-12. An implementation plan follows after review.

This spec defines the whole game at design level, so later phases fit without a rewrite, and the first playable at buildable detail. Later buildings, the castle, money and time each get their own spec.

**Sources and precedence.** [decisions.md](decisions.md) wins on any conflict. Then this spec. Then [brainstorm.md](brainstorm.md) section 3 (the approved direction with its grafts), [concepts/home.md](concepts/home.md) and the [research](research/). This spec links to those files instead of repeating them. Step codes R01 to R54, S01 to S45 and M01 to M48 are the ladders in [research/curriculum.md](research/curriculum.md).

**Choices this spec makes where the inputs differ.**

| Topic | Inputs said | This spec |
|---|---|---|
| A name with no clip | brainstorm: lines skip the name, tag glows; queue for a nightly batch | decisions.md: accepted, Elizabeth says "What a great name! It's a tricky one for me to say." The name is logged. No nightly job, no clip server. Tjitse adds logged names on a later generator run (section 5.6). |
| Progress collection | home.md: Royal Sash. brainstorm: Jewel Box on the crown | Jewel Box on the crown (brainstorm) |
| Herd milestones and titles | home.md: Royal Nest Keeper at 50, Parade at 30. brainstorm 3.4: 75 and 40 | Royal Nest Keeper at 75, Parade Field at 40 (brainstorm) |
| Post Box | home.md: 3 stones. brainstorm: herd 15 | Herd 15 (brainstorm) |
| Save shape | engine.md: one JSON document | An append-only event log plus a cached snapshot, so two devices merge without loss (section 4.4) |
| Silent animals in mistakes | home.md: a frog, birds. brainstorm: unicorns, objects and weather | Unicorns, objects and weather only (brainstorm, and decisions.md "unicorns only") |
| Dutch a, e, u contrast | curriculum.md: in R11 and S06 | R04D and S03D, right after the vowels arrive (section 3.8) |
| Credits per year | home.md: 480,000 | 32,000 usable a month, 384,000 a year (brainstorm 4.5) |

## 1. Goal, audience and success criteria

### 1.1 Goal

Emma learns to read English and do basic maths by building a home for her unicorn herd. Every egg, name, wish, visitor and building carries a checked reading, spelling or maths moment. She keeps playing for months because the herd, the pins and the home are hers and keep growing.

Two things open places. Jewels from passed steps open buildings (section 2.4). Herd size opens stable rows and the early places. Herd openings reward play volume, not mastery, so she is never stuck. Every hatch still carries three checked moments, and each row Building Day uses her current steps. The report shows the share of openings that came from jewels.

### 1.2 Audience

Emma, 6, Dutch native, in Year 1 at NOVA, a private British-system English school in Cyprus (see [PERSONA.md](../../PERSONA.md) and [GOAL.md](../../GOAL.md)). Her homework workbook for the rest of the year is Phase 5 work ([curriculum.md](research/curriculum.md) section 1.1). She cannot read instructions. She plays on an older iPad Air (section 5.4), today in a Safari tab, touch only, whenever she wants, for 5 or 45 minutes. The app is fully British English: no Dutch words, text, audio or name pronunciation anywhere (decisions.md). Her verdicts so far: she loved hatching and naming (more than 10 babies in one go, and proud of it), loved collecting pins, wants more role play, was upset by refused names, and dropped games with unclear goals or easy content.

Tjitse is the second user: he reads the parent corner and the learning log, runs the generator and deploys to odin.

### 1.3 Success criteria

Measured over the first 6 play weeks from the event log (section 4.4), with `tools/report.ts` on a save export or the server copy. Each criterion's formula is a named function in `tools/report.ts`. Time in a place comes from `place.enter` and `place.leave` events. The parent corner shows the same numbers.

| # | Criterion | Measure | Target |
|---|---|---|---|
| E1 | She comes back by herself | Visits per week (Tjitse notes whether she asked) | 3 or more a week in weeks 1 to 4 |
| E2 | The egg pull survives | Eggs hatched per visit | Median 3 or more. At least one visit with 10 or more in weeks 1 and 2 |
| E3 | She uses the role play | Share of visit time outside the heartbeat (Salon, Post, Pond, Dressing Corner, Building Days, free play) | 25 percent or more from week 3 |
| E4 | Naming is free | `name.built` events refused for any reason other than "no vowel" or "blocked" | Zero |
| E5 | She feels that learning builds the home | Fresh jewels dragged to a plot in the visit they were announced | 2 of her first 3 jewels |
| C1 | Every goal is clear | Idle flags (two idles at one step with no touch between) | No step flagged in 3 or more visits |
| C2 | Help stays rare | Helped results per strand after placement | Below 15 percent |
| L1 | Challenge is right | First-try accuracy per strand, weekly | Between 70 and 90 percent. Below 60 or above 92 is flagged |
| L2 | She moves up | Steps passed per strand | At least 1 per strand per 3 play weeks |
| L3 | She keeps what she learned | Review accuracy on ladder items in box 2 or higher. Name reviews are reported separately | 80 percent or more |
| L4 | Dutch slips shrink | Share of errors tagged `dutch` on a contrast step's pairs, weeks 3 and 4 after the step is passed, against weeks 1 and 2 | Half or less |
| L5 | Spelling is not starved | Spelling share of checked ladder moments per visit (name reviews excluded) | 20 percent or more on average |
| V1 | Her own verdict | Tjitse asks after week 2 and week 6: "What do you like? What is boring?" | She names something besides eggs she likes, and nothing she must do is "boring" or "don't know what to do" |

## 2. Game design

### 2.1 Fantasy and cast

Queen Lumi lives in the moon and sends eggs down on moonbeams. She gives Emma a meadow at the foot of a hill: "This meadow is yours. Will you make it a home for my unicorns?" Emma warms eggs, names babies, gives each a stall and builds what they need. From about play month 3 she rebuilds the old castle on the hill, gate and ballroom first. The coronation in the throne room she built is likely in her second year. There is no villain. Nothing is ever lost, sick, sad or taken away. The home waits happily when she is away.

Unicorns only, with Queen Lumi (decisions.md). No Fluffles, no Princess Pippa, no other animals.

| Character | Voice ([VOICES.md](../../VOICES.md)) | Speaks |
|---|---|---|
| Narrator | Elizabeth | Every goal, hint, praise and feedback line, every letter sound, word, name and number. Every line with a number, a name or a learning word is hers, including mistake lines such as "Too hot! One too many." |
| Queen Lumi | Posh | Story lines only ("Hello, Emma!", "The builders are here!"). Her mouth moves on these lines. |
| Baby unicorns | Flicker | Giggles and tiny fixed words ("Yay!", "Not me!", "Hello!"). Never a learning word. |
| Visiting cousins, builders (all unicorns) | Flicker giggles and nickers | No words. Cousins hold printed cards, and the card is the clue. Builders point, and Elizabeth says their lines. |

### 2.2 Core loop: the heartbeat

About 3 minutes, repeatable without limit. Every pass touches all three ladders. It keeps the v2 "one more egg" loop ([v2 audit](research/v2-audit.md) section 2.1).

1. **Egg (maths).** The nest always holds an egg. Its kind follows her maths step (section 2.6). She warms it with number stones. When her current maths step has no egg kind (M03, M07, M08), the egg serves a review item from a passed egg step. Once the opening queue has introduced it (section 2.9), the nest sometimes offers a second egg (section 3.6).
2. **Hatch.** Wobble, cracks, burst, fanfare. A first try gives a one-in-three chance of a shiny baby, never promised and never mentioned when it does not happen. Only a miss or a `helped` result ends the chance. A repeated goal after an idle does not. A moonflower pops up in the meadow.
3. **Name (spelling).** Bells, the name garden or the gold bell (section 2.8).
4. **First wish (reading).** The newborn's speech bubble in print ("nap", later "a red hat", and "hat" or "hats" while plurals are open, section 3.10). She brings the item from the basket or takes the baby to the care station. Extra eggs keep this step, so a run of eggs still trains reading.
5. **Moving in (numbers).** "Bella!" Elizabeth: "Baby number nineteen." Door 19 glows and Bella trots in. This is never checked, because the next empty door would give the answer away. Then, inside her number range, Bella goes visiting: "Bella wants to visit door fourteen." Emma taps that door and the neighbour pokes its head out to say hello. The door is drawn at random from the built doors inside her range, never Bella's own. Once her range is secure (all items of its step in box 4), only every third newborn goes visiting.

| Maths step current or passed | Visiting range |
|---|---|
| M01 only | No visit |
| M02 | Doors 1 to 10 |
| M07 | Doors 1 to 20 |
| M27 | Doors 1 to 50 |
| M28 | Doors 1 to 100 |

Then a new egg appears and she chooses: another egg, a who's-waiting bubble, or free play.

**Who's-waiting bubbles.** Up to three picture bubbles float over places where someone waits: a baby with a wish, a cousin at the Salon, envelopes at the Post Box, a jewel over a plot, a hammer over a plot or row that is ready, a found thing that needs a label (section 3.6). They never expire, never multiply and never nag. When more than three wait, the planner shows the three that serve the strand she has practised least this visit. Bubbles are hidden until the visit that explains them (section 2.9).

**Measured risk.** v2 extra eggs skipped the wish. The first playable compares eggs per visit with v2 (criterion E2). If the pull drops, extra eggs after three in a row skip the first wish. This is a parent-corner switch, off by default.

### 2.3 Visits

Play whenever she wants. Every design works for a 5 minute and a 45 minute visit. A visit starts at the Play tap. It ends at goodnight, or when the app has been hidden or untouched for 30 minutes. The game saves after every act, so closing the iPad at any moment loses nothing. It never asks her to stay or to come back.

**A 5 minute visit** (play week 3, herd of 40, release 1.1 content, section 7):

| Time | What happens | Checked |
|---|---|---|
| 0:00 | Play button. The herd runs to the fence. Lumi: "Hello, Emma!" Elizabeth: "An egg is waiting." Bubbles over Pip and the Post Box. | |
| 0:15 | Blanket egg: "Seven cups are warm." She picks 4, the egg steams. Elizabeth: "Too hot! One too many." She picks 3. | M11 |
| 1:00 | Hatch. A Cosy foal. A moonflower. | |
| 1:10 | Name garden: Daisy. "Let's write Daisy. Listen: Daisy." She fills D and ai. The s and the y are gift gems. | S20 on her slots |
| 2:30 | Daisy's wish: "capes". The basket holds one cape, a heap of capes and a cake. She brings the heap. | R19 |
| 3:00 | "Daisy!" "Baby number forty-one." Door 41 glows and Daisy trots in. "Daisy wants to visit door seventeen." She taps door 17. | M07 |
| 3:20 | Pip's bubble: "bath". She drags Pip into the pond. Splash. | R10 review |
| 4:00 | She taps the moon. Roll call: the doors show heads only, a lantern shows "Tam", she taps Tam's door and Tam trots to bed. The sky shows four sky unicorns and one star. Elizabeth: "Forty-one unicorns!" | name review |

**A 45 minute visit** (play week 5, herd of 52, release 1.2 content, section 7). The month-3 version with the Tea Garden and the School is in [brainstorm.md](brainstorm.md) section 3.3.

| Time | What happens | Checked |
|---|---|---|
| 0:00 | Arrival. Bubbles: envelopes at the Post Box, Cousin Fen at the Salon, a jewel over the fountain plot. Her current steps are R32, S22 and M12. | |
| 0:30 | Heartbeat: small nest egg, hatch, bells "Lee", she spells L and ee, first wish "a leaf", stall 53, a visit to door 12. | M12, S22, R32, M07 |
| 4:00 | She drags the jewel (she passed S20 yesterday) from her Jewel Box to the plot. The stone lights with the "ay" gem and a fountain rises (section 2.4). | |
| 5:00 | Heartbeat: she picks the golden berry egg, a shiny baby, gold bell "Lunabel" (7 gems). Not on the list: the tag goes on and Elizabeth says "What a great name! It's a tricky one for me to say." First wish "a peach", stall 54, a visit to door 8. | M13, R32, M02 review |
| 9:00 | Post Box: three envelopes, five babies waiting with their tags hidden. She gives each envelope to the baby whose name it shows. Then Elizabeth: "Pip's sash needs ten pins." It has 6. She drops the 4 stone in the pin pot and four star pins fly on. | 3 name reviews, M10 review |
| 13:00 | Salon: Fen's card shows its first line, "green beads". She picks the green beads from four items and the line gets a tick. The second line is a bead row and she finishes the braid. Photo to the album. Then free styling of her own babies. | R32, M08 review |
| 24:00 | Heartbeat: two-stone egg, hatch, the name garden by first sound (she taps "m", three bells ring Mia, Max, Milly). She picks Max and fills M, a, x. First wish "dog", stall 55, a visit to door 20. | M10 review, S05 review, R03 review, M07 |
| 28:00 | Label bubble: Tam found some pins for the toy shelf. Elizabeth: "Let's write pins. Listen: pins." She adds the s gem to the pin label, the label goes on a jar and the pins drop in. | S10 review |
| 30:00 | Label bubble: Max found a bead. She spells "bead" for the next jar. | S22 |
| 31:00 | Dressing Corner: crowns and capes on her favourites. Free play. | |
| 38:00 | Two wishes, one after the other: Pip wants "a seal", then Tam wants "a bee". | R32 x2 |
| 41:00 | Goodnight. Roll call of two names, doors show heads only. Elizabeth: "Fifty-five unicorns! Five sky unicorns." Lumi: "Goodnight, Emma." | 2 name reviews |

About 8 maths, 4 spelling and 6 reading moments (spelling 22 percent) and 5 name reviews, with long stretches of free play. A long visit brings more review and more play. Promotion keeps the same pace (section 3.6).

### 2.4 Levels

Levels are places Emma sees. Two sources open them.

**Openings by learning.** One building plot is visible at a time, with a picture sign of what it will be. The rest of the valley is under moon mist.

1. When Emma passes a ladder step, a jewel goes into her Jewel Box on her crown: a letter jewel for a reading or spelling step, a number jewel for a maths step. The jewel shows what she learned (the gem "sh", the stones 7 and 3).
2. The next time she is in the meadow, the plot shows a moonbeam and Elizabeth says once: "You have a new jewel. Bring it here!" The ghost hand shows the drag the first time. She drags the jewel from the box to the plot. It becomes a glowing stone with the jewel's picture. The jewel stays in her box. If she does not drag it, a jewel bubble waits over the plot. Nothing is lost. There is always a plot that can take a jewel (decoration plots, below), so this line always has a target.
3. When all stones are lit, a hammer bubble appears. A tap starts the Building Day.
4. Steps marked `placed` (section 3.5) go into the Jewel Box silently when placement ends in their strand, marked as old jewels. They never light stones and are not draggable.

**Key steps.** Some plots need a skill because the building's activity uses it (the Market needs coins, M32). A key plot waits in the mist until its key step is reached. The plot order skips to the next plot without a key or with its key reached, so a slow strand never freezes the home.

**Decoration plots.** When no building plot can take a jewel (the next building is not released yet, or every remaining plot waits on a key), a small keyless decoration plot shows in the meadow or the stable yard: a fountain, a lantern arch, a flower bridge, a star bench. It takes one jewel and builds at once, with the herd cheering and no Building Day. The series is open-ended, with at least 12 in the content at every release. A building plot is shown only once its building has shipped, so a fully lit plot never waits. This is how a passed step always lights a stone somewhere.

**Building Days.** Three short parts, each under two minutes, then the ceremony. Each part uses its own strand at her current step plus one review item. When the step she just passed is in that strand, the part uses its items, so the build celebrates what she can do now.

| Part | What she does | Learning |
|---|---|---|
| Walls | Fill the wall outline with planks or bricks. "The wall needs ten planks. Six are up." | Maths at her step: bonds to 10, later teens, tens and ones |
| Trim | Continue a tile or bead pattern on the trim | Checked only when the maths queue serves an M08 item. Otherwise free colours |
| Sign | Elizabeth says the building's name. She spells it with gift gems for parts above her step | Spelling at her step, with a spoken target |
| Ribbon | She swipes the scissors through the ribbon | |
| Herd circle | The herd stands around a building egg. It hatches the first baby of the building's breed, and she names it | Naming (section 2.8) |
| Title | If a title is due, Lumi gives it and a ribbon appears on her crown | |

If she leaves halfway, finished parts stay finished and the plot waits. A mistake is funny: a wall too short leaves a gap, a builder on a ladder points at it, and Elizabeth says "Three bricks more, please!". Too tall: the top brick wobbles into the wheelbarrow and the builders giggle.

**Herd milestones.** Counted babies. They open stable rows, places, titles and sky unicorns.

| Herd | What happens |
|---|---|
| 5 | Bath Pond (a Building Day, and the first Building Day for every player, so it is the building tutorial) |
| Every 10 | A new stable row. Rows 2 to 5: a full Building Day with a herd circle (the circle hatches a baby of her current egg kind) and she names the row. From Row 6: a short build (planks to fill ten, then she names the row), no circle. Each full row adds a sky unicorn, which she names. A row is not an opening in the queue: when it is earned, a hammer bubble waits over the stable yard. Newborns with no door yet sleep in the Moonbeam Camp, a row of cosy tents next to the stables, and trot into their doors when the row is built. |
| 15 | Post Box (a Building Day) |
| 20 | Letter Lane |
| 40 | Parade Field, not before play month 2 |
| 75 | Royal Nest Keeper title and the herd banner |
| 100 | The Hundred Party: a flag on the hill and the whole herd parades in tens while Elizabeth counts the tens |
| 150 | Show Ring, not before play month 4 |
| 200, 300, 500 | A parade medal, a new float, a sky picture |

**Titles on her crown.** Nest Keeper (first visit), Stable Keeper (10 babies), Meadow Keeper (5 place buildings, rows do not count), Royal Nest Keeper (75 babies), Keeper of the Castle (Castle Gate built), Princess of the Moon Meadow (Throne Room built).

**The whole order of openings.** Forecast in play months at 1 to 1.5 hours a week. Her pace decides.

| Opening | Area | Opens | Role play | Learning inside | Spec |
|---|---|---|---|---|---|
| Meadow, nest, care stations, Stable Row 1, Home Book | Meadow | Start | Nest Keeper, carer | The heartbeat, care wishes | This spec |
| Stable rows | Stable Yard | Every 10 babies | Builder, names the row | Planks to fill ten, stall numbers | This spec |
| Bath Pond | Meadow | Herd 5 | Bathing | Care wishes | This spec |
| Lumi's Dressing Corner | Meadow (Lumi's gazebo) | Opening queue | Dress-up with crowns, capes and pins | Free play | This spec |
| Post Box | Stable Yard | Herd 15 | Post keeper, pins on sashes | Names on envelopes, fill a sash to ten, more and fewer | This spec |
| Letter Lane | Stable Yard | Herd 20 | Naming on purpose | First sounds, later letter names and order | This spec |
| Notes to Lumi | Post Box | With the Post Box | Writes to the Queen | Capital at the start, full stop or question mark, "and", tricky words (S08, S17, S18, S21, S23) | This spec |
| Asking bubbles and two-state wishes | Meadow | Opening queue, release 1.2 | Carer | Asking or telling (R33), un- (R37) | This spec |
| Sparkle Salon | Village Lane | 3 stones | Hairdresser for visiting cousins | Cards from one word to two sentences, bead patterns | This spec |
| Moonberry Kitchen | Village Lane | 3 stones | Chef | Recipe words and counts, missing part, jar labels | Release 2 |
| Tea Garden | Village Lane | 3 stones | Host, Lumi's tea party, hatch-day parties | Place cards with her babies' names, sharing, halves | Release 2 |
| Week Fence | Village Lane, at the Tea Garden | With the Tea Garden | Party planner | Days of the week, yesterday and tomorrow, the question word when (R35, S25) | Release 2 |
| Hide and Seek | Meadow | 3 stones, key R28 | Seeker | Question words: who finds a baby, what a thing, where a hiding place (R31) | Release 2 |
| Story Nook | Meadow | 3 stones, key R06 | Reads her babies to sleep | Phrases to full pages, read then act, stories told in the past (R40) | Release 3 |
| Parade Field | Meadow | Herd 40, not before month 2 | Parade master, Show Papa (no tasks, the whole herd parades for Papa while Elizabeth says each name with a clip and the count) | Counting the parade at her step | Release 3 |
| Growing Corner | Stable Yard | First young unicorn, not before month 2 | Nurse (nobody is ill) | Height, mass, how much a baby grew | Release 3 |
| Unicorn School | Village Lane | 4 stones, key R11 or S06 | Teacher who fixes a baby's slate | Contrast pairs, later choice spellings and "which sound?" | Release 4 |
| Castle Gate and Ballroom | Castle Hill | 4 stones | Princess, ball host | Invitations at her step, partners and the odd one out | Release 4 |
| Meadow Trails | Meadow edge | 4 stones, key M19 | Rider, explorer, wild eggs | Number line, signposts with three choices | Release 5 |
| Castle Wardrobe and Great Hall | Castle Hill | 5 stones each, no key | Royal dresser | Labels and signs at her step | Release 5 |
| Flying Meadow | Sky | 4 stones, key M26 | Flying teacher | Counting on, 2s, 5s and 10s to 100 | Release 5 |
| Show Ring | Meadow | Herd 150, not before month 4 | Rider, show host | Jumps in order, scores from M39 | Release 5 |
| Orchard Rows | Castle Hill | 5 stones, key M29 | Gardener | Arrays, 2, 5 and 10 tables | Release 6 |
| Friendship Garden | Meadow | Two grown best friends, not before month 5 | Plans a baby's colours | Colour chart arrays, halves | Release 6 |
| Market Stall | Village Lane | 4 stones, key M32 | Shopkeeper, Papa mode (Papa plays a silly customer, home.md section 4) | Coins, paying, change | Release 6 |
| Clock Tower | Village Lane | 4 stones, key M34 | Keeper of the clock | O'clock, half past | Release 6 |
| Castle Library | Castle Hill | 5 stones, key R49 | Librarian | Phase 5 words, short texts | Year 2 |
| Moon Tower | Castle Hill | 6 stones, key M45 | Stargazer | Fractions, time to 5 minutes | Year 2 |
| Throne Room | Castle Hill | 6 stones, key R52 | Coronation | The Queen's letters, inference | Year 2 |

Learning inside a herd-opened place follows her current steps. Content above her step is shown and said, never checked.

### 2.5 Role play places

**Rules for every place.**

1. Her own herd is free play. Styling, feeding, bathing and dressing her own babies is never checked. Items say their name when tapped in free play. While a checked wish or card is open, its basket items only make a sound effect until she has acted.
2. A visitor, wish, card or envelope brings the checked work. It arrives with a chime and stays pinned on screen while she works.
3. Three answer tools only: gems in slots for spelling, stones for numbers, print with sound dots for reading. New places bring new pictures, never new controls.
4. The task is always an act (fill the sash, seat the guest, give the item). Elizabeth says the goal, never a question to answer.
5. Every checked choice has at least three plausible options. While she finds a name or a number, name tags and door plaques are hidden (doors show heads, babies show their faces). They show again after the act.
6. A mistake is a funny event, once per item: the world reacts, the item goes back, the deciding word or number glows, then the hint ladder runs (section 3.3). Nothing a mistake produces is a reward. No buzzer, no red cross.
7. Every visit to a place has a visible end (the cousin leaves happy, the photo flies to the album). Then a meadow arrow glows and Elizabeth says "The meadow is this way." She can stay and play instead.
8. She brings her babies along: the three babies she touched last follow her to a place and appear in its photo. She can tie a "come along" ribbon on others in the meadow. (Release 1.2.)
9. Hatch-day parties (release 2) never pile up: at most one waits at a time.
10. Getting around. The meadow hub shows every open place of the Meadow and the Stable Yard as a picture at its edge, and a tap on it goes there. The valley map opens from a map scroll next to the crown, from the first Village Lane plot on. On the map, a tap on a building goes there. A tap on the moon starts goodnight. Each of these is shown once with the ghost hand and one spoken line (section 2.9).

**Places in the first playable and releases 1.1 to 1.3.** Later places are written out in [concepts/home.md](concepts/home.md) section 4 and get their own spec.

| Place | Free play | Checked work | A mistake |
|---|---|---|---|
| Nest | Watch, tap the egg | Egg kind at her maths step (section 2.6) | Too many: red dots bounce off, red cheeks, steam, "Too hot! Two too many." Too few: frost and a shiver, "Brr! Three cups are still cold." |
| Naming | Pick by bell, garden or gold bell | Spelling on her slots | The slider plays what she built: "That says p, i, t. Listen: Pip." The wrong gem pops out and its slot hums the sound it needs. A free name is never a mistake. |
| Care stations (hay rack, brush stand, hat box, nap cushion, swing, Bath Pond) and the wish basket | Brush, cuddle, treats, tricks, splash | A baby's printed wish: give the item from the basket, or take the baby to the station. The basket holds 3, 4 or 6 pictured items by scaffold level (section 3.3). Station wishes use six fixed words, so they serve review only and never count toward a pass. One-or-many wishes ("hat" or "hats") put one thing and a heap of the same thing in the basket (section 3.10) | Pip goes on the swing when the wish said "bath": he swings once, looks puzzled, hops off and giggles. "bath" glows with its sound dots. Plural mistakes are in section 3.10. |
| Stalls | Paint doors, flower boxes, lanterns | Visiting a door inside her range (section 2.2). Roll call at goodnight: a name on a lantern (name review), or, when the maths queue serves M07, a spoken door ("Door twelve, bedtime!") | Wrong door: a sleepy baby in a nightcap opens it, "Not me!", and Elizabeth says the number she tapped ("That is forty-two."), from M27 with the tens ("Four tens and two."). Wrong name at roll call: a baby pokes its head out, "Not me!" |
| Bath Pond | Splash, bubbles, slide | Bath wishes, with one or many ducks, boats, cups and shells | As the care stations |
| Post Box | Open envelopes, rearrange pins on a sash | Envelopes with written names (name review). The babies waiting are the recipients plus two more, so every envelope has at least three candidates. Fill a sash to ten: she drops one number stone in Lumi's pin pot and that many star pins fly on (bond to 10 at her step). A set pin goes to the baby with the fewest pins of three (M03 when served). Notes to Lumi (release 1.1): Elizabeth says the note first ("Let's write: Can we have a swing?"). She lays the word cards in order, picks the crowned first card and the end mark from three (full stop, question mark, exclamation mark), and spells one word with gems. The moonbeam takes the note up. A question brings Lumi's answer down (the swing arrives). A telling note gets a wave from the moon. A shouting note ("We love the pond!") makes the moon sparkle | The wrong baby sniffs the envelope, shakes its head with a giggle and pushes it back. Too many pins: the extras bounce back into the pot, "Too many! Two too many." Too few: the empty spots glow. A note with the wrong end mark: Elizabeth reads it back the way the mark says, the moon does that (a wave where she asked for a swing), and the end spot glows. A note without its crown letter flutters back down and the first card glows. |
| Sparkle Salon | Style any baby with brush, beads, bows, sparkle mist, mirror | A cousin's style card, one line at a time with a tick per line: one word at a grapheme step, a phrase with a tricky word (section 3.9), an adjective phrase from R27 ("a tiny pink bow"), two things joined by "and" from R28. A bead pattern line when the maths queue serves M08 | The cousin looks in the mirror at the wrong bow, tilts its head and giggles. The bow floats back. A wrong bead makes the braid spring loose with a boing and glows until swapped. |
| Dressing Corner | Crowns, capes, garlands, her babies' pins | None | None |
| Meadow, Year 1 wishes (release 1.2) | As the care stations | Asking bubbles: three babies speak in print. One tells ("I have a bow."), one shouts ("What a big bow!"), one asks ("Can I have a bow?"). She gives the bow to the one who asks (R33). Two-state wishes: things in the meadow are half done (a half-packed basket, a bow half tied, a gate on the latch), so both directions are possible, and the wish decides ("Unpack the basket.", "Untie the bow.") (R37) | The baby who was only telling or shouting holds up its own bow and giggles. A basket packed instead of unpacked wobbles and pops its lid. The question mark or the "un" glows. |
| Letter Lane | Tap an arch to hear its sound | None. Arches light by the first sounds of her babies' names. Grey arches wait: "Nobody starts with z-z-z yet!" | None |
| Toy shelf (label bubbles) | Take a thing out of a jar and play with it. A tap on a label plays Elizabeth reading it | A baby brings a found thing, or a heap of them. Elizabeth: "Let's write hat. Listen: hat." She spells the label, it goes on a jar and the thing drops in. Plural labels get an ending gem (section 3.10) | As naming. A wrong ending reads back funny (section 3.10) |

The two first-playable cousins are Dot and Fen. Their names are decodable at R05 and have Elizabeth clips.

### 2.6 Egg kinds and breeds

| Egg kind | Steps | What she does | Breed |
|---|---|---|---|
| Moon egg | M01, M02, M09 | M01: 1 to 5 stars glow on the shell for 2 s, and a tap on the egg makes them glow again with no penalty. She places the stone with that many dots. M02: up to 10 stars stay, she places the numeral stone. M09: ten moon cups, some warm, she places the stone that makes ten | Moon foal |
| Small nest egg | M05, M12 | A nest of 5 cups, later 6 to 9, filled with one stone | Nestling foal |
| Two-stone egg | M10 | Two stones that make ten | Pebble foal |
| Blanket egg | M11 | The cups are hidden. "Seven cups are warm." One stone makes ten | Cosy foal |
| Berry egg | M04, M13 | M04: the egg wants one more or one less berry than the bowl shows. M13: two bowls tip in, she places the stone that shows how many now, counting on from the bigger bowl | Berry foal |
| Snow egg | M14 | The egg is too warm. She places the snow stone that cools the extra cups | Snow foal |
| Twin, teen, star, bundle, coin eggs | M06, M23, M24 / M18, M21, M22 / M26 / M27, M28 / M33 | See [concepts/home.md](concepts/home.md) section 4.1 | Twins, Sun, Star, Crystal, Gold foals (later releases) |

Stones show dice dots or a loose scatter, never a ten-frame layout. The golden egg (section 3.6) hatches its kind's breed with a golden coat, and the speckled egg a speckled coat, so neither is the better prize. Building eggs bring one breed each: Bubble foal (Bath Pond), Post foal (Post Box), Sparkle foal (Salon), and one per later building. Stable rows bring no new breed.

### 2.7 Collecting

- **The herd.** Every baby is an individual: name, colours (body, mane, second mane), traits (shiny, speckled, golden, founder's star), breed, growth stage, hatch date, stall, pins, outfit, favourite ribbon, and later a best friend and a job. The count is big and said often. Favourites and the newest babies stand in the meadow, at most 12 on screen. The rest look out of their stall doors. Any baby can be called out from its stall or its book page.
- **Growth.** Hearts from wishes, care (at most one heart per baby per visit) and roll call. 3 hearts make a foal, 6 a young unicorn, later a grown unicorn with a job. Nobody ever loses hearts. The first playable shows baby and foal stages. Hearts keep counting, and the young unicorn stage appears with the Growing Corner (release 3).
- **Stalls in rows of ten.** Two rows of five doors, a real ten-frame. Each door has a plaque with the baby's name and number. Stall numbers follow hatch order. Rows are named by Emma ("Rose Row"). At goodnight one star per baby fills the sky, and every ten stars join into a sky unicorn she names.
- **Breed Book.** A Home Book tab with one page per breed. Breeds she has not hatched show as silhouettes with the egg or building that brings them. Breeds differ in coat pattern, markings, mane style and horn colour on the one rig.
- **Pins.** A pin always belongs to a baby. Each baby wears a sash of ten (two rows of five). Set pins arrive in envelopes at the Post Box (2 or 3 envelopes per post, at most one post per visit, as a bubble) and as moment pins for firsts (first bath, tenth baby, first Building Day, Moving Day). Sets have pages with silhouettes. A full set changes the world: a full flower set puts a flower arch on the Salon, a full star set hangs star lanterns along the stable lane. Plain star pins for filling a sash come from Lumi's pin pot, which never runs out. Pins are never taken. A set pin that arrives for a full sash goes into that baby's pin pouch on its book page.
- **Jewel Box.** Emma's own collection on her crown: letter jewels and number jewels for passed steps. A tap on a letter jewel plays its pure sound. A tap on a number jewel shows its stones and Elizabeth says the fact ("Seven and three make ten.").
- **Home Book.** Opened from the crown, as the v2 Nest Book. Picture tabs, no words needed: Herd (pages of ten in a ten-frame grid, one page per baby with portrait, gem name tag, traits, pins, stickers, photos), Pins, Breeds, Album (Salon photos), Home (each building with its opening day), Sky (sky unicorns with their names). Tabs appear silently when they first have content. Later releases add Recipes and Books.
- **Moonflowers.** One per hatch. Above 60 flowers, new ones join existing patches as denser sprites, so the meadow stays light to render.

### 2.8 Naming

Naming follows [research/naming.md](research/naming.md) with the changes in decisions.md: no Dutch name bank or Dutch pronunciation, and no family or friends' names.

**Three ways to pick.**

| Route | Example | Spelling | Logged as |
|---|---|---|---|
| Name bells: three bells at her spelling step. A shake of the name tree beside them gives three new bells | Ken | She spells all of it | Spelling, checked |
| Name garden by picture (flowers, gems, sky, sweets) or by first sound (tap a gem, three bells ring names with that first sound, grouped by sound: Charlotte under sh) | Lily | Her slots only. The rest are gift gems | Spelling, checked on her slots |
| Gold bell: any name. Every gem at or below her spelling step, plus the graphemes in her babies' names, in a fixed tray order | Tamo | She builds it | Free naming, never a miss |

**Slots.** The gold bell frame starts with 3 slots. A plus slot at the end adds one, up to 8, and dragging an empty slot off removes it, down to 2. The ghost hand shows the plus slot once. The gold bell also sits next to the slots of a bell or garden name. A tap on it turns the build into a free build with her gems kept. Slots she has already filled stay logged as they were, and the rest are not checked.

**Gift gems follow sounds.** A slot is hers only if its grapheme makes its usual sound and that sound is at or below her spelling step. From S20, a slot whose sound has more than one spelling is hers only when the step that teaches that choice is passed or current (the y in Lily stays a gift until S32). No final b, d, g, v or z slot is hers before S06 is passed. A name with fewer than two own slots counts as free naming. The first slot is a crowned capital. Before S11 it is a gift. From S11 the tray holds the capital and the small letter for it, and choosing the capital is the S11 item. A tap on a gift gem plays its sound ("This one says ee here."). When a list name no longer needs gifts, the baby's page says "You can spell Lily on your own now!"

**Gold bell checks, in order, when she slides the star.**

1. No vowel gem: "Every name needs a pink gem!" The pink gems glow. The y gem is pink and blue, and counts as a vowel when no other vowel is in the name, so Sky and Lyn pass. This teaches a phonics rule and is not logged as a refusal.
2. Blocked by sound (see Blocklist below): the baby giggles and shakes its head. Elizabeth: "That's a silly name! Try other gems." Nothing is logged as wrong.
3. Same phonemes as a list name: Elizabeth says the name with the list clip ("Lily!" then "What a lovely name!"). The tag keeps her spelling (Lili).
4. Otherwise, a new name: the tag goes on at once. Elizabeth: "What a great name! It's a tricky one for me to say." The build is logged as unknown.

There is no near-match offer. A second bell next to hers would read as "you spelled it wrong". `names:pull` shows Tjitse the nearest list name for each unknown build instead (section 5.6).

Her own sounds play under the star as she slides, as in v2. The sounds are never spliced into a spoken name.

**Names with no clip.** The baby is a full member of the herd. It walks in at roll call and appears in envelopes and plaques, because print can show any name. Lines that would say the name skip it ("Baby number forty-one."). The tag has a soft moon sparkle until the clip exists. When a later generator run adds the clip, the moment plays after the first hatch of the next visit, or earlier when she taps that baby: Lumi: "The moon told me a new name!", Elizabeth says the name for the first time, the baby jumps and gets a heart. A baby without a clip is not chosen for spoken-name moments (Show Papa, invitations, story books) until its clip exists.

**Names in spoken lines.** Clips join only at sentence boundaries. A name is always its own sentence: "Pip!" then "Into the boat you go." Each name has two clips: "Pip!" and "Pip?". Sentences around names come from finite lists.

**Duplicates are royal.** A second Tim is "Tim the Second": the tag shows Tim with a small crown and the numeral 2, and Elizabeth says "Tim!" then "The Second!". Ordinal clips exist up to "The Twentieth". Roll call never asks for two babies with the same name in one round.

**The big name list.** Tier 1 has about 1,000 simple common names: UK top names, common names at British schools in Cyprus, fantasy and nature names, and decodable names at R01 to R05. There are no family or friends' names (Tjitse has none to add). Tier 2 adds about 1,000 by build month 6. Each entry has a grapheme split, a phoneme string, a first-sound group and a picture tag where one fits. Elizabeth says every name the British English way, including a name she builds that comes from another language. Every name passes the blocklist. No trademarked character names.

**Blocklist.** One shared file, `shared/blocklist.json`, used by the game, the content validator and the generator. It is checked by sound: built gems become phonemes first (c, k and ck become k, ph and ff become f, x becomes ks), so "fuk" and "phuk" are caught. The whole name is checked against the full list. Inside longer names only the strong words are checked as parts, so Cassidy and Scarlett pass. English and Dutch lists as in [naming.md](research/naming.md) section 5. The Dutch list only catches rude words she could build with letters. It is never shown or played. The bell and tray planners never offer a gem that turns a target into a blocked word. Strong words get the same calm response as toilet words and are logged for the parent corner.

**Logging.** Every build is a `name.built` event with its gems, phonemes, route and outcome (no vowel, blocked, list, unknown, chosen). The parent corner lists them. Unknown names go to the generator as described in section 5.6.

**Gone from v2:** "I don't know that name", the same-first-and-last-letter rule, wish words as forbidden names, the 3-slot limit and the fixed 7-gem tray. "Pom" is allowed or blocked per open decision 5.

### 2.9 First sessions, placement and the v2 herd

**Before session 1.** Emma plays v2 in a Safari tab, served from Tjitse's Mac. The Mac address and port stay unchanged until Moving Day ([v2 audit](research/v2-audit.md) section 6). Moving Day happens while she still plays v2, because Safari deletes a site's storage after 7 days of Safari use without a visit to that site. There is no separate backup step (decisions.md). The v2 patch keeps the save format, so this import works for patched saves too.

**Getting the save out.** Emma opens v2 in a Safari tab, so `move.html` is opened in a Safari tab too, at the same address and port. A home-screen icon would have its own, empty storage. `move.html` sits next to the v2 demo on that origin (same scheme, host and port), reads the save, shows her babies as a check and downloads the JSON as a file. The Mac serves plain http, where the share sheet (Web Share API) does not exist, so the download is the path. The v3 parent corner imports that file. If the origin changed, Tjitse copies the value with Safari Web Inspector into a file and imports it the same way.

**Mapping.**

| v2 field | v3 |
|---|---|
| `herd[].name`, `c`, `traits` | Kept, with the first letter made a capital (v2 stores "sam"). Each baby gets a fixed id (a UUIDv5 of its v2 id, hatch night and name), the Moon foal breed and the founder's star. Every v2 name gets "Name!" and "Name?" clips in the first name batch. |
| `herd[].hearts` | Hearts kept. Growth stage from the v2 thresholds, capped at foal |
| `herd[].stickers` | Stickers on the baby's page. A "pin" sticker also becomes a star pin on that baby's sash |
| `herd[].night`, `playNight` | Hatch order and hatch date (the import date when missing) |
| `gifts` | Decorations in the meadow |
| `jar`, `jarGoal`, `seen`, `crown` | Not used |
| `lv` | Maths placement start: v2 M3 near M10 ([curriculum.md](research/curriculum.md) section 6). Reading and spelling start from her school year instead (section 3.5), because v2's R2 is below her Phase 5 homework |
| `log` | Seeds item memory: missed items start in box 0, first tries in box 1. These seeds never count toward a step pass, and they win over the placement seed (section 3.5) for the items they cover |
| `nameWishes` (patched saves) | `name.built` events with outcome unknown, so `names:pull` sends them with the first name batch |
| `night` | "Days together" on the Home Book cover |

The `import.v2` event carries a hash of the v2 save as its key. A second import of the same file, on this or another device, adds nothing.

**Session 1: Moving Day.** Lumi: "Emma! Your unicorns are moving to a bigger home." A moonbeam bridge appears and her babies cross one by one while Elizabeth says each name. They wear the founder's star. The rows her herd needs are already built. The first three walk into stalls 1, 2 and 3 with "One, two, three". She taps door four and the fourth baby trots in (not checked). The rest walk in by themselves. "All your pins came too!" Then the first v3 egg, and the gold bell accepts whatever safe name she builds. Tjitse watches this moment. The places she has already earned (Bath Pond, Post Box if her herd is 15 or more, Letter Lane if 20 or more) wait in the queue.

**The opening queue.** Earned openings wait in a queue and appear one per visit, in the order they were earned. Each visit announces at most one new thing. Visit 1 is exempt, since everything in it is new. Rewards that need no explanation (a "moon told me" name, a moment pin) may share a visit. Her first fresh jewel comes ahead of the queue: its plot appears in the visit it arrives, the jewel line is that visit's new thing, and the queue moves on one visit. The table shows Emma's expected order. An opening that is not earned or not released yet is skipped, and the next one takes its visit.

| Visit | New thing |
|---|---|
| 1 | Moving Day (for a new player, Lumi's welcome and the crown). After the third hatch the ghost hand shows the moon. Elizabeth: "When it's bedtime, tap the moon." |
| 2 | Bath Pond Building Day, the building tutorial. The ghost hand shows the pond at the meadow edge. Elizabeth: "The pond is ready to build!" |
| 3 | Who's-waiting bubbles, explained once: "When you see a bubble, someone is waiting for you." Row Building Days she has earned now wait as hammer bubbles |
| 4 | The two-egg choice, once maths placement has ended |
| 5 | Dressing Corner |
| 6 and on | Post Box and the pins, Letter Lane, the valley map (with the first Village Lane plot: "This is your valley."), one per visit as releases bring them |

**A new player** without a v2 save gets the same start without Moving Day: Lumi's welcome, the crown, egg 1 with the ghost hand on a stone that is not the answer, naming with three bells, a first wish with the ghost hand sliding under the word once, door 1.

**Placement** runs hidden inside eggs, names and wishes from visit 1 until it ends in each strand (section 3.5).

### 2.10 Novelty over 12 months

"Week" and "month" are play weeks and play months from her first v3 visit (expected early December 2026, section 7). Novelty follows releases. Each building costs about 2 build weeks (its own spec, a demo with Emma, backgrounds, items, content and audio), so a release of three buildings is about 6 build weeks. The months below are the earliest dates. The novelty floor covers the gaps.

| Release | Earliest | New, at most one per visit |
|---|---|---|
| First playable | Week 1 | Moving Day, Bath Pond, bubbles, the first row Building Day, the first "The moon told me a new name!" |
| 1.1 to 1.3 | Weeks 2 to 6 | The two-egg choice, Dressing Corner, the first jewel and decoration plot, Post Box, the pins and notes to Lumi, berry and snow eggs, asking bubbles and two-state wishes, Letter Lane, the valley map, Sparkle Salon and its cousins |
| 2 | Month 2 | Kitchen, Tea Garden and Lumi's tea party, the Week Fence, Hide and Seek |
| 3 | Month 3 | Story Nook, Parade Field, Growing Corner, Royal Nest Keeper, the Hundred Party |
| 4 | Months 4 to 5 | Unicorn School, Castle Gate and the first ball |
| 5 | Months 5 to 7 | Meadow Trails and wild eggs, Castle Wardrobe and Great Hall, grown unicorns with jobs, Show Ring, Flying Meadow if M26 is reached |
| 6 | Months 8 to 10 | Orchard Rows, Friendship Garden, Market and Papa mode, Clock Tower |
| Later | Months 10 to 12 | Whatever keys she reaches, more castle rooms, a second round of seasons |
| Year 2 | | Castle Library, Moon Tower, Throne Room and the coronation |

Calendar sets follow the real calendar in Cyprus, whatever the play month: Snow Night in December, the Blossom Ball in spring, a Cyprus summer set, Emma's birthday party (date set in the parent corner). A missed set waits in a memory trunk in the Home Book and returns next year.

**Novelty floor.** If 5 visits pass with nothing new, the next visit brings one item from a reserve that does not depend on the ladders: a cousin with a new card, a pin set, a stall decoration set, a seasonal egg skin. The reserve holds at least 8 items at every release.

### 2.11 Clarity rules

Queen Emma's Letters failed on clarity alone. These rules are hard.

1. One goal per screen, always a picture: cold cups, empty gem slots, a wish bubble, a gap in a wall. A card with several lines shows one line at a time, each with a tick box. Two wishes are served one after the other, never side by side.
2. Lumi's moonbeam shows where to touch. On choice steps it covers the whole area, never the answer.
3. Elizabeth says the goal once, short. The replay button (top left, next to the crown) and a tap on Lumi repeat the goal and never the answer. A replay never counts against her.
4. Reading never says the deciding word before she acts. Elizabeth reads the text after she acts.
5. Spelling always says the target first ("Let's write Daisy. Listen: Daisy.").
6. The ghost hand shows each new gesture once, on an object that is not the answer.
7. No recap talk before she can act. The egg comes first.
8. One new thing is announced per visit, visit 1 excepted (section 2.9).
9. The home has two zoom levels: the meadow hub, and the valley map (a painted map with building icons on fixed plots, five areas: Meadow, Stable Yard, Village Lane, Castle Hill and Sky, at most eight buildings per area, mist over everything not open except the next plot). Decoration plots are not buildings. Never a menu of twenty.
10. Watch, do not assume: two idles at the same step with no touch between is an idle flag in the parent corner.

**What the game never does.** No streaks, daily login gifts, countdowns or "come back tomorrow". No crying or begging characters. No sick, sad, hungry or lost babies. No currency to spend, no purchases, no ads, no chance boxes. Rewards are surprises in the world, never announced as payment ([engagement.md](research/engagement.md) principles 7 and 16).

## 3. Learning design

### 3.1 The three ladders

Reading R01 to R54, spelling S01 to S45 and maths M01 to M48 are defined in [research/curriculum.md](research/curriculum.md) section 4, with the contrast steps moved as in section 3.8. Phase 2 to 4 follow Little Wandle order. Year 1 follows Emma's NOVA homework workbook: its grapheme groups (ai ay a-e, ee ea, long i, ur er ir, split digraphs, o-e oa ow oe, ew ue, with ch sh ng nk ff ll ss ck revisited), its tricky words and its sentence work (plurals, capitals, full stops and question marks, "and", -ing -ed -er, un-, adjectives, days of the week, question words), in page order. The Phase 5 graphemes the workbook does not cover follow it in Little Wandle order. Maths follows White Rose. Each step in `content/ladders/*.json` lists its items, its scaffold levels (one to three), the places that can serve it, whether it is a fluency step, and whether it is a school step (section 3.5). The workbook does not show the order homework is set, so the Year 1 order is data in those files and Tjitse can change it.

The game takes the workbook's targets, never its tasks: no worksheet layouts, tick boxes or sorting tables. Handwriting, drawing and open writing stay out of scope. The workbook's own caveats apply (curriculum.md section 1.1): the game uses "sang", not "sung", and does not teach that every sentence needs a noun. Workbook words that clash with the world (hurt, unhappy, rescue and others, curriculum.md section 4.4) are left out.

### 3.2 Items and checked moments

**Items** are what a step teaches. Only items have memory and count toward a pass:

- Reading and spelling: graphemes (s, ck, ee), and tricky words where they decide an act (section 3.9). The Year 1 sentence steps have their own items: the plural endings -s and -es (and, in reading, no ending for one thing, section 3.10), end marks (full stop, question mark, exclamation mark), the capital at a sentence start, question words, day names, the prefix un-, the endings -er and -ed, and "and".
- Maths: facts ("7+3", "10-4") and numerals (door numbers 1 to 20, as items of M02 and M07).
- Names: each baby's name, for name review only (section 3.7).

Words, phrases, names to spell and Building Day signs are **carriers**. A checked moment shows one carrier and records one `learn.result` event:

| Field | Meaning |
|---|---|
| `strand` | `r`, `s`, `m` or `name` |
| `step`, `carrier` | The step served, and the word, name, sign or task shown |
| `items` | The items it exercises, each with its own result. Reading: the word's graphemes from loaded steps, with the moment's result. Spelling: each own slot as its grapheme, with that slot's result. Maths: the fact or numeral |
| `result` | The moment's result: `first` (right on the first try), `miss`, or `helped` |
| `ms` | Decision time: from the moment an answer is possible to her first touch of the chosen object |
| `scaffold` | Scaffold level used |
| `error` | Error type: `vowel`, `dutch`, `reversal`, `off-by-one`, `one-hour-off`, `other` |
| `place`, `probe` | Where it happened, and whether it was a placement item |

Free play, free naming, replays, taps on letters for their sounds and the shown move-in door are never checked moments.

### 3.3 Help levels

Help has two layers.

**Scaffold levels inside a step** (they change what she sees):

| Strand | Level 1 (most help) | Level 2 | Level 3 |
|---|---|---|---|
| Reading | Sound dots with 500 ms gaps, 3 options | 300 ms gaps, 4 options | No dots. Her slide under the word plays only graphemes of passed steps. The current step's graphemes stay silent and are read from print. 6 options |
| Spelling | Target gems plus 2 distractors | Plus 4 distractors | The full planned tray of 7 or 8 gems |
| Maths | Dots on stones | Dots and numerals | Numerals only |

A step declares one to three levels. "Top level" is the highest level it declares. Review and mixed items show at their step's top level. Scaffold moves count checked moments of the step: three first tries in a row move it up, two moments in a row with `miss` or `helped` move it down. The scaffold never moves the ladder.

**The hint ladder inside one checked moment** (ported from v2):

| Level | Trigger | What happens |
|---|---|---|
| 0 | Start | The goal is spoken and shown |
| 1 | 15 s idle (10 s on reading) | The goal is repeated |
| 2 | One miss, or a second idle | A focused hint: Elizabeth counts the cold cups, the blanket lifts, the letters sound slowly |
| 3 | Two misses | The ghost hand shows the answer. Result `helped` |

Idle never goes past level 2. A touch always ends a hint, and the touch still works. An answer after a level 2 hint is `helped`, because the hint gives part of the answer. A helped answer still hatches the egg, seats the guest or finishes the build. It counts as a miss for mastery.

### 3.4 Item memory and mastery

As [curriculum.md](research/curriculum.md) sections 5.3 and 5.4, with these exact parameters:

- Leitner boxes 0 to 5 and retired. Box 0 comes back after 2 to 4 other items of the same strand in the same visit, or first at the next visit. Box 1 comes back at the next visit that starts at least 4 hours later. Boxes 2 to 5 after 2, 4, 8 and 16 days. Retired items get a spot check every 6 weeks. Due dates govern review picks only (section 3.6).
- Fluency items (tricky words, Phase 2 and 3 graphemes, bonds within 10, doubles, facts to 20, the 2, 5 and 10 tables) reach box 5 only with a decision time below her median for that item type, with a 3 s ceiling. The types are grapheme, tricky word, bond, fact and table. The median is over her last 50 first tries of the type, recomputed once a week. A slow first try keeps the item in its box. No timer is ever shown.
- A step is **passed** when its scaffold is at the top level, at least 12 of its last 15 checked moments at the top level were first tries, those 15 spread over at least two local calendar days, and every item of the step has had at least one first try. Probe results and v2 seeds never count. A local day uses the time zone offset stored on `visit.start`.
- A pass is recorded once as a `step.passed` event and is never revoked (section 4.4).
- A passed step is **secure** when all its items reach box 4.
- **Reopen.** Review results are results on items of passed steps, from due reviews or mixed picks. If a passed step's last 10 review results have fewer than 7 first tries, the step reopens. Its items join the review share at double weight until 8 of its next 10 results are first tries over two days. Then it closes, with no new jewel. The current step does not change. In the world this is a returning visitor or a label bubble, never "you forgot".
- Name items use the same boxes but never count toward a step pass.

### 3.5 Placement

A hidden probe per strand runs inside eggs, names and wishes from visit 1 until it ends in that strand. It searches the ordered list of loaded steps (unloaded steps such as R31 and R35 are not in the list) between two bounds, lo and hi.

- For Emma it starts from her school year: Year 1 with Phase 5 homework (decisions.md). Reading searches from R13 (Phase 3) with its first probe at R21 (Phase 4). Spelling searches from S09 with its first probe at S12. Maths searches from M01 with its first probe at M10, her v2 level. hi is the top loaded step. If she misses at the lowest bound, lo opens down to R01 or S01. A new player starts at R01, S01 and M01, or at a start the parent sets.
- At each probe step it gives two items at the top scaffold level. Both first tries: lo becomes this step and the next probe is halfway to hi. Any miss: hi becomes this step and the next probe is halfway to lo. In visit 1 a jump is at most two steps, so Moving Day stays easy.
- It ends when lo and hi are neighbours, after 10 items, or after 4 visits. That moment is the end of placement for the strand. Her current step becomes lo at scaffold level 1 (the lowest searched step if she missed there).
- Steps below her current step are marked `placed`, except contrast steps and school steps (below). They count as passed for mixing and keys, give old jewels (section 2.4) and never light stones. Their items start in box 2, except items the v2 log seeded, which keep the v2 seed.
- Contrast steps (R04D, R11, R20, S03D, S06, M20) are never marked `placed`. Those below her current step become side steps: their twin wishes and label bubbles take part of the mixed share (section 3.6) until each passes. A side step is never the current step, so the contrasts do not hold back her Phase 5 work.
- Probe results set item boxes but never count toward a pass.
- **School steps.** A step flagged `school` in its ladder file is a topic Emma is learning at school right now. Today these are R19 and S10, the plurals (decisions.md, "Plurals now"). A school step is left out of the probe's search list and is never marked `placed` or made a side step. From the end of placement in its strand it is served at scaffold level 1 next to the current step, as section 3.6 says, until it passes by the normal rule (section 3.4). Its pass gives a fresh jewel. The flag works the same for a step above her current step, so a later school topic can also come early. Tjitse sets or clears the flag in the ladder file, or marks the step placed in the parent corner when school has moved on. The flags belong to Emma's school-year start. A new player who starts at R01 and S01 gets them only when the parent sets a start.
- Tjitse can override any strand in the parent corner.

### 3.6 Item selection per visit

**The current step** of a strand is its lowest step that is neither passed, placed, a side step nor a school step, and has a loaded place that can serve it. A step with no place is `waiting`: it is not passed, does not unlock its contrast pairs, and becomes the current step as soon as a place for it loads. Work on a later step is kept when that happens.

One item queue per strand feeds every place. Each place declares which strands and item kinds it can show (a wish needs a word with a picture, an egg needs a maths item its kind supports). The planner picks:

- About 50 percent from the current step, 30 percent due reviews (oldest first), 20 percent mixed items from passed steps and open side steps. If no review is due, the current step fills the gap. Current-step items are served least recently seen first, whatever their due date, and their boxes still update.
- **An open school step** takes the current-step share in every place that can serve it. Places that cannot (naming, twin wishes, Building Day signs) keep serving the current step. Everything that sets difficulty (bell names, gift gems, tray and basket distractors, the probe bounds) still follows the current step. In reading this means her current step waits while the plurals are open, about three play weeks. Review and mixed picks go on as normal.
- At most 3 new items per strand per local day. A step starts at scaffold level 1.
- After 15 checked moments in one strand in a visit, that strand serves only items in box 1 or higher.
- After 30 checked moments in a visit (name reviews included), bubbles offer free-play places first, eggs serve only items in box 3 or higher, and first wishes serve review only.
- **Spelling share.** Spelling moments (bell and garden names, Building Day signs, label bubbles) are at least one in five of the ladder moments in a visit. Name reviews count on neither side. When the share drops below that after five moments, the next bubble is a label bubble and the next hatch opens with the bells and the garden in front, the gold bell one tap further.
- **Label bubbles.** A baby brings a found thing (a pin, a hat, a bun) to the toy shelf in the meadow. Elizabeth: "Let's write hat. Listen: hat." She spells it, the label goes on a jar and the thing drops in. The labelled jars stay on the shelf. Label bubbles are the spelling filler and the place for S03D, S06 and S10. While a spelling school step is open, one label bubble always waits at the toy shelf: the newborn drops a found thing, or a heap of them, there as it moves in. It is one bubble, never more, and it never nags.
- **Golden egg.** Once the opening queue has introduced it, the nest offers a second, golden egg at most once per visit, and only when her maths scaffold is at its top level. It serves a new item from the next step that has an egg kind and counts as one of the day's new items. When the new-item cap is reached, the nest shows only the speckled egg. At the top loaded step it serves a current-step item at the top scaffold. Its result counts toward that step's pass window but never moves a scaffold.
- The engine never shows an item whose clip or picture is missing, or, offline, not cached (section 4.7).

**Pace.** A heartbeat takes about 3 minutes and holds one checked moment per strand plus a door visit. At 1 to 1.5 hours a week with a quarter in free play, that is about 15 checked moments per strand per week, half of them on the current step. A step needs about 6 moments to climb the scaffold and 15 at the top level, so about 2 to 3 play weeks per step and about one jewel a week across the three strands. That just meets L2 and the openings in section 2.4. The simulated learner (section 6.1) runs at this volume and reports weeks per step. If it shows more than 3 weeks, the current-step share goes up before the pass rule is loosened. The simulated learner also reports weeks to pass R19 and S10 from Emma's start (section 7.3).

These numbers are a design guess with no research behind them. They are constants in `content/ladders/budget.json` and are checked against criteria L1, L2, E3 and L5.

### 3.7 Name review

Reading her own babies' names (roll call, envelopes, later place cards and invitations) is its own item type. Tags and plaques are hidden while she finds the name, and at least three babies are candidates (section 2.5, rule 5). Only names that are decodable at her reading step, or that she has read with a first try before, are asked. The last name of a round is not logged when fewer than three candidates are left. Each name has a Leitner box. Results are logged under `name`, count toward the visit total of 30, and never toward a step pass, the 15 per strand, the spelling share or L3. Roll call asks 1 to 3 names per goodnight.

### 3.8 Contrast steps for a Dutch-speaking learner

The risks are in [curriculum.md](research/curriculum.md) section 3. Everything Emma sees and hears in these steps is English (decisions.md): English words, English pictures and Elizabeth's British English clips. No Dutch word, sound or explanation reaches the screen or the speaker. This spec moves the a, e, u contrast forward, because these vowels arrive at R01 and R04 and hit CVC spelling from the first week. Each pair unlocks at one step per strand:

| Pair | Reading | Spelling |
|---|---|---|
| a, e, u | R04D, new, right after R04 | S03D, new, right after S03 |
| Final d/t, g/k, b/p, and final v and z in spelling | R11 | S06 |
| v/w, j/y | R11 | S06 |
| th against f, t and d | R11 | S07, which teaches th with the pair from the start |
| ch read as a throat sound | R11 | |
| ee, oo, ai and u read the English way | R20 | |
| ie, oe, ui, au | Inside the Year 1 steps that bring them: ie in R34, oe in R39, ui in R44, au in R46. Each starts with twin wishes for its pair | |
| 13/30, 14/40, teen order | M20 | |

1. Before its contrast step is passed, a pair never appears as a distractor or a trap in that strand. Before then, Dutch slips can show only in gold bell builds, which are logged and never checked.
2. Errors on pairs are tagged `dutch` and shown as "Dutch pairs" in the parent corner.
3. Elizabeth always gives the British model after the act ("Bed. Bed has a d at the end.").
4. Number words are always standard English ("fourteen", "forty-two"). Feedback adds the tens from M18 for teens and from M27 for larger numbers ("Fourteen. One ten and four."). A reversal (42 for 24) is tagged `reversal`, and the feedback names the tens: "That is four tens. We need two tens."

R04D, R11 and R20 are served by twin wishes: two babies, served one after the other, want the two words of a pair ("pan", then "pen"). For R20 each pair is two English words with pictures, where reading the letters with their Dutch values would give the other word ("boot" and "boat", "bee" and "bay"). S03D and S06 are served by label bubbles with the partner gem in the tray ("bed" with d and t). The Unicorn School (release 4) adds the slate where a baby's try is fixed, and M20.

### 3.9 Steps in the first playable

The probe starts her at R21, S12 and M10 (section 3.5). R19 and S10, the plurals, are school steps: she meets them as soon as placement ends in each strand (section 3.10). The first playable loads Phase 2 to 4, so the probe can go down when she misses, and the workbook's Phase 5 grapheme steps, so it can reach her homework. Each loaded step has a place that serves it. Steps whose place ships in release 1.1 or 1.2 (S08, S17, S18, S21 and S23 with notes to Lumi, S19 with Letter Lane, R33 and R37 with the Year 1 meadow wishes) load with that release.

| Steps | Place |
|---|---|
| R01 to R26 | First wishes, basket wishes, Salon cards (release 1.2) |
| R04D, R11, R20 | Twin wishes |
| R19 (school step) | First wishes, basket wishes and Bath Pond wishes where one or many decides ("hat" or "hats"), section 3.10 |
| R06, R12, R17, R25 tricky words | Phrases on wishes and cards (below) |
| R27, R28, R29 | Basket wishes and Salon cards with adjective phrases ("a tiny pink bow"), two things joined by "and", and one or two sentences to act on ("Put the hat on Pip.") |
| R30, R32, R34, R36, R39, R41 | First wishes, basket wishes, Salon cards, with workbook words that fit the world (curriculum.md section 4.4) |
| R38 | Twin wishes with the e pairs ("cap", then "cape") |
| R33, R37 | Asking bubbles and two-state wishes, from release 1.2 |
| S01 | Naming by first sound, the first gem of a bell name |
| S02 to S07, S03D, S09, S12 to S16 | Naming, Building Day signs, label bubbles |
| S10 (school step) | Label bubbles: the ending gem on a jar label, by ear and then by the count in the jar, section 3.10 |
| S11 | The capital first gem of a name (section 2.8) |
| S08, S17, S18, S21, S23 | Notes to Lumi at the Post Box, from release 1.1 |
| S19 | Letter Lane and the Home Book name order, from release 1.2 |
| S20, S22, S24, S26, S28, S29, S30 | Naming, signs, label bubbles |
| S27 | Label bubbles and signs with the "un" gem ("unlock" on the gate) |
| M01, M02, M09 | Moon egg |
| M02, M07 | Door visits and roll call by door number |
| M03 | Post Box: a set pin goes to the baby with the fewest pins |
| M04, M13 | Berry egg |
| M05, M12 | Small nest egg |
| M08 | Salon beads, Building Day trim |
| M10 | Two-stone egg, Post Box sash |
| M11 | Blanket egg |
| M14 | Snow egg |

**Tricky words.** A tricky word is a pass item only where it changes the act: "push the swing" or "pull the swing", "put the hat on" or "put the hat in", "his hat" or "her hat" with a he baby and a she baby, "go" or "no" on the meadow gate. The others (the, I, is, of, as, and, has, was, you, they, my, by, all, are, sure, pure and the rest) appear in phrases on wishes and cards with the heart part glowing, as in Little Wandle, and Elizabeth reads them after the act. They are shown, never checked, until the Story Nook (release 3) checks them in sentences. R06 has no checkable item, so it is display-only and never blocks the ladder.

**Not loaded** until their place exists: R31 (Hide and Seek, release 2), R35 and S25 (Week Fence, release 2), R40 (Story Nook, release 3, and job badges for grown unicorns, release 5), M06 (Tea Garden), M15 and all later maths steps. R42 to R48 and S31 to S33 load with the word batches of build months 3 to 6, and Year 2 steps after that. When a strand has passed every loaded step, it serves review only and the parent corner shows "ceiling reached" for that strand.

### 3.10 Plurals, a live school topic

Emma is learning plurals at school now (workbook pages 15 to 17, 43, 44 and 59; decisions.md "Plurals now"). R19 (reading) and S10 (spelling) are school steps (section 3.5), so she meets them in the first playable as soon as placement ends in each strand, usually in visit 1 or 2. They keep the scaffold, memory and pass rules of sections 3.3 and 3.4. There are no sorting tables, no ticking the right spelling and no printed misspellings to choose from. She reads a plural to act, and she builds one with gems.

**The rule she meets.** More than one thing gets an ending. Most words add s (hats, keys, horses). Words that end in s, x, ch or sh add es (dresses, foxes, peaches, brushes). Elizabeth never explains the rule. The world shows it, and after each act Elizabeth reads the word with "More than one." or "Just one."

**Where it lives.**

| Moment | Place | What she does | Checked |
|---|---|---|---|
| First wish and basket wishes | Meadow, care stations | The wish reads "hat" or "hats". The basket holds one hat, a heap of hats and other things. She gives the one or the heap | R19 |
| Bath wishes | Bath Pond | "duck" or "ducks", "boat" or "boats" | R19 |
| Label bubbles | Toy shelf | A baby brings a found thing or a heap of them. She puts the ending gem on the jar label | S10 |
| Goodnight count | Sky | The count is printed with its word ("41 unicorns") and Elizabeth reads it | Shown only |
| The mice jar | Toy shelf | A jar of toy mice has a ready-made golden label, "mice". A tap plays "Mice. One mouse, lots of mice." Irregular plurals are read only: never in a wish, a tray or a check | Shown only |
| Parcels (release 1.1) | Post Box | A parcel label says "7 brushes". Four are in. She drops the stone that fills it (a missing part at her maths step). Elizabeth reads the label after | Maths only |
| Style cards (release 1.2) | Sparkle Salon | Card lines such as "pink bows" or "pink bow", with R27 | R19 review |

**Reading: one or many decides the act (R19).** Items: the endings -s and -es, and no ending for one thing.

- About half the wishes are plural and half singular, so she must look at the end of the word. A plural wish never shows a number or "some", and a singular wish shows the bare word ("hat", not "a hat"). The ending alone decides.
- Stems are words she can already read: graphemes from passed, placed or current steps.
- Basket by scaffold level: level 1 has one thing, a heap of it and one other thing, with 500 ms sound dots. Level 2 has the one and the heap of two words, with 300 ms dots. Level 3 has the one and the heap of three words, no dots, and her slide stays silent on the ending, so she reads s or es from print.
- One hat for "hats": Pip puts it on, then pats his ears, his tail and his hooves, looking for where the other hats go, and giggles. A heap for "hat": Pip stacks the whole heap on his head, the tower wobbles and topples, and he giggles. The item floats back and the end of the word glows (the s or es, or the plain end of "hat").

**Spelling: build the ending (S10).** Items: the endings -s and -es. Ending gems are crescent-shaped and click on at the end of a label, so they read as an add-on. The tray always holds s, es and one slip gem that catches a real mistake: ss (the workbook's "dresss") until S06 is passed, then z on endings that sound /z/ (keys, bells), as section 3.8 allows.

| Level | Elizabeth says | Emma does | Tray |
|---|---|---|---|
| 1. Hear it | "Let's write foxes. Listen: foxes." | "fox" is already on the label in gift gems. She picks the ending gem | s, es and the slip gem |
| 2. Hear and build | The same | She builds the stem slots that are hers (gift rules, section 2.8) and the ending | Plus 4 distractors |
| 3. Count it | "Let's write brush. Listen: brush." Once the word is built: "Look in the jar!" | She builds the word. The baby tips the found things into the jar, one to five. The label must say how many are inside: an ending for more than one, none for one. One jar in four holds one thing | The full planned tray |

Level 3 is where counting meets grammar: a count above one forces the plural, a count of one forbids it. The count is not a maths check.

A wrong ending reads back funny inside the fiction. The slider plays what she built, as in naming, then the model. The wrong gem pops out and its slot hums the sound it needs.

- "foxs": the last s hisses like a kettle, steam puffs from the jar and the toy foxes cover their ears and giggle. "That says f, o, x, s. Listen: foxes."
- "keyes" or "cupes": the slider says "key-iz" or "cup-iz", the keys jingle or the cups clink, and the label wobbles.
- "dresss": a long hiss, and the dresses flap.
- No ending on a jar of three brushes: the jar keeps one brush and the other two hop out onto the shelf, because the label only says one. They hop back in once the ending is on.
- An ending on a jar of one: the jar rattles, looking for more, and the lonely brush shrugs.

The level 2 hint at level 3 is Elizabeth counting the jar ("One, two, three."). The rest of the hint ladder is as section 3.3.

**The ideas, judged.**

| Idea | Verdict |
|---|---|
| Wish card "pins" or "pin", bring one or a handful | Kept as the core reading move, for every wish word with a picture. The ending alone decides |
| "Two foxes" as visitors | Changed. The world is unicorns only, so foxes are toys on the shelf. "two" is not decodable yet and would give the plural away |
| Post Box parcels labelled "3 brushes" | Moved to release 1.1 as a maths moment. The number already says many, so the ending decides nothing and is not a plural check |
| Counting the herd ("five foals") | Shown only, at goodnight. The number decides, and "unicorns" is above her reading step |
| The egg asking for "hats" | Out. The nest has one goal, the maths, and a word on it would be a second goal on one screen |
| Ending gems on labels, funny readback | Kept as the core spelling move, with the count deciding at level 3 |

**Words.** The first playable has about 35 plurals from the workbook and the world. Each comes with its one word.

| Ending | Words |
|---|---|
| -s | hats, pins, cups, mugs, rings, bells, ducks, boats, shells, bows, beads, capes, cakes, kites, bikes, chairs, keys, carrots, apples, pancakes, planks, bricks, castles (toy castles), horses (rocking horses) |
| -es | foxes (toy foxes), boxes, dresses, glasses, brushes, bushes, peaches, benches, branches, sashes |
| Read only | mouse and mice (toy mice) |

A stem above her step is a gift in spelling and is not served in reading until she can decode it (keys, castles, horses, bushes and apples need later graphemes). Workbook plurals that clash with the world stay out: dogs, doctors, turtles, ballerinas, mountains, clowns, pirates, tigers, lions, tractors, buses, churches, witches, watches and matches (other animals, people, vehicles and fire).

**Pictures and audio.** A heap picture is drawn by code from the one picture: three to five copies in a loose pile, so plurals add no heap art. New one pictures: about 10 (toy fox, toy mouse, rocking horse, toy castle, bench, branch, bush, sash, plank, brick). Elizabeth clips: every plural word, the one word where it is new, the es ending sound (/ɪz/) with the letter sounds, and four lines ("More than one.", "Just one.", "Look in the jar!", "One mouse, lots of mice."). Readbacks use the gem sounds that already exist. About 1,000 credits, in the build month 1 batch (section 5.6).

## 4. Architecture

### 4.1 Shape

The game lives in `games/moon-meadow-home/` with its own `package.json`. IDEAS.md gets a row with status `building`. The v2 demo stays in `ideas/` untouched except for `move.html`.

```
games/moon-meadow-home/
  src/core/       pure TypeScript, no DOM: events, world, learning, planner, naming, phonics, save, merge
  src/scenes/     one Svelte component per place
  src/ui/         shared interaction parts: GemSlots, StoneTray, PrintWithDots, Moonbeam, GhostHand, Bubble
  src/art/        the unicorn rig component and sprite helpers
  src/audio/      typed facade over shared/audio.js, generated clip ids
  src/sync/       sync client and pairing
  src/parent/     parent corner
  src/test-hook.ts
  content/        ladders, words, names, places, eggs, pins, budget (JSON)
  public/audio/   one folder per audio pack: lines.json, mp3 files, manifest.json
  public/art/     WebP atlases and backgrounds per area
  server/         save service for odin
  tools/          content validator, name pull, report, contact sheet
  tests/          Vitest
  flows/          playwright-cli flow scripts
```

### 4.2 Units

Each unit has one purpose. Core units are pure functions over data and are unit tested without a browser.

| Unit | What it does | Interface | Depends on |
|---|---|---|---|
| Content packs (`content/`, `src/core/content.ts`) | Holds all game data as JSON: ladders and steps, word bank (word, graphemes, phonemes, picture id, step, contrast-pair tags, plural form and ending), name bank, places and plots, egg kinds and breeds, pin sets, budget constants. Area data is split per area and loaded on demand | `loadPack(area): Promise<Pack>`, typed records | Nothing |
| Content validator (`tools/validate-content.ts`) | Fails the build when data is inconsistent: a word without picture or clip, a step without enough items or distractors, a name that hits the blocklist, a line id used in code but missing from a manifest, a narrator-only id with another speaker | `npm run check:content` | Content packs, audio manifests, blocklist |
| Events (`src/core/events.ts`) | Event types, schema validation, ids and the hybrid logical clock. Written for Node type stripping (`.ts` import extensions, no enums), so the server imports the same file | `makeEvent(type, payload)`, `validate(event)`, `compare(a, b)` | Nothing |
| Actions (`src/core/actions.ts`) | Turns one scene action into its events, the only place that creates events | `apply(action, world, learner): Event[]` | Events, world, learning engine |
| World model (`src/core/world/`) | Folds events into the home: herd, stalls, pins, jewels, plots, buildings, titles, opening queue, settings | `foldWorld(events): World` | Events, content |
| Learning engine (`src/core/learning/`) | Folds results into learner state: Leitner boxes, scaffold levels, step status (current, passed, secure, reopened), placement | `foldLearner(events): Learner`, `stepStatus(l, strand)`, `scaffold(l, strand, step)` | Events, ladders |
| Session planner (`src/core/planner/`) | Plans the visit: next item per strand and place, budget, bubbles, egg offer, the opening to announce, novelty floor | `planVisit(world, learner, now)`, `nextItem(plan, strand, slot, rng)`, `bubbles(plan)`, `nextEgg(plan)`, `nextOpening(world, visits)` | World, learning engine, content |
| Task planners (`src/core/phonics/`, `src/core/maths/`) | Pure helpers ported from v2: gem tray, wish basket (pantry), stones, cousin names, sound splits, distractor rules | `planTray(target, step, rng)`, `planBasket(word, step, rng)`, `planStones(task, scaffold, rng)` | Content |
| Naming (`src/core/naming/`) | Bells, garden, gift gems, gold bell checks, blocklist by sound, ordinals | `bellsFor(step: SpellStep, herd: Name[], rng): Bell[]`, `giftSlots(name, step)`, `checkBuild(gems: Gem[], bank: NameBank): Outcome` | Phonics, name bank, blocklist |
| Game store (`src/game.svelte.ts`) | The one place scenes talk to. Passes a scene action to Actions, appends the events, refolds, emits recorded facts the fold has found (section 4.4), and exposes reactive state | `dispatch(action)`, `$state` world, learner, visit plan | Core, save |
| Scenes (`src/scenes/`) | Presentation and touch only. Start, Meadow, Valley, Nest, Hatch, Naming, Wish, Stalls, Goodnight, Building Day, Bath Pond, Post Box, Salon, Dressing Corner, Letter Lane, Meadow Slate, Home Book, Moving Day | Svelte components reading the store and calling `dispatch` | Store, UI parts, art, audio |
| Art (`src/art/`) | The unicorn rig: layers, pivots, mask colours, anchors for accessories and wings, code tweens (breathe, blink, tail, hop, sleep). Static head sprites for stall doors | `<Unicorn baby stage pose />` | Rig JSON, atlases |
| Audio (`src/audio/`) | Typed facade over `shared/audio.js`. Generated `ClipId` union for static packs, so a missing static clip is a compile error. Runtime lookup for name clips. Speech-order rules from v2 (an instruction never cuts off a sound she asked for, an act stops stale instructions). Per-scene preload and release | `say(id)`, `sayName(name, '!' or '?')`, `hasName(name)`, `sound(g)`, `hold(g)`, `sfx(n)`, `stop()`, `preloadScene(id)`, `release(id)`, `act()`, `listen()` | `shared/audio.js` |
| Save (`src/core/save/`, `src/save-idb.ts`) | Stores events, the snapshot and quarantined events in IndexedDB, calls `persist()`, migrates, exports and imports | `append(events)`, `loadAll()`, `writeSnapshot()`, `exportFile()`, `importFile(file)` | idb, events, merge |
| Merge (`src/core/merge.ts`) | The union of two event sets by id. Conflict rules live in the folds (section 4.5). Used by sync and import | `merge(a, b): Event[]` | Events |
| Sync client (`src/sync/`) | Pairs the device and exchanges events with odin in the background | `pair(code)`, `syncNow()`, `status()` | Save, merge, server API |
| Save server (`server/`) | Stores each family's event log on odin, issues device tokens, lists unknown names for the generator | HTTP API (section 4.5) | Node.js, disk |
| Parent corner (`src/parent/`) | Report, names, overrides, settings, export, import, pairing, reset | Scene behind a PIN | Store, save, sync |
| Asset pipeline (`tools/`, `scripts/`) | Art checks and contact sheet, name lines from the name bank, unknown-name pull, audio generation | CLI commands (section 5) | Content, `scripts/generate-audio.py` |
| Test hook (`src/test-hook.ts`) | `window.__game` in the test build (`vite build --mode test`), which the flows serve | Section 6.2 | Store |

### 4.3 Data flow

```
touch -> Scene -> dispatch(action) -> core creates events -> Save.append (IndexedDB)
                                           |
                                           v
                     foldWorld + foldLearner (incremental) -> store state -> Scenes re-render
                                           |
                                           v
                     Session planner reads state -> next item, bubbles, egg, opening
Save -> Sync client (background) <-> odin save server -> other device
```

A fold runs incrementally on each new event. A full refold from the log runs at start when the snapshot is missing or old, and after a sync or import brings events from elsewhere.

### 4.4 Save format and the event log

**Why an event log.** Two devices can play offline. With an append-only log a merge is the union of both logs, and the herd, the pins and the learning state are rebuilt from it.

**Event shape.**

```ts
type Event = {
  id: string;      // "<device id>:<sequence>", unique per device
  hlc: string;     // hybrid logical clock: max(device clock, highest hlc seen), plus a counter
  t: number;       // ms since epoch, device clock, for display only
  dev: string;     // device id, 8 random base32 characters, made when the store is empty
  v: number;       // event schema version
  type: string;    // see below
  // payload fields per type
};
```

**Fold order.** Every fold sorts the log by `hlc`, then device id, then sequence. A device's events keep their own order, and an event always sorts after every event its device had seen, also when an iPad clock jumps back.

Babies get `crypto.randomUUID()` ids, except imported v2 babies (section 2.9).

**Event types in the first playable.** `visit.start` (with the time zone offset), `visit.end`, `place.enter`, `place.leave`, `learn.result`, `learn.idle`, `learn.override`, `step.passed`, `egg.hatched`, `baby.named`, `name.built`, `name.clipHeard`, `care.done` (one per finished care act), `pin.given`, `jewel.placed`, `jar.labelled`, `building.part`, `building.done`, `row.named`, `sky.named`, `opening.announced`, `title.given`, `outfit.saved`, `favourite.set`, `decor.placed`, `settings.set`, `audio.missing`, `import.v2`, `exclude`. Free-play touches that change nothing lasting are not logged.

**Recorded and derived state.**

| Kind | What | Rule |
|---|---|---|
| Recorded facts | `step.passed` (strand and step), `jewel.placed` (jewel), `building.done` (plot), `opening.announced` (opening), `title.given` (title), `baby.named` (baby), `import.v2` (save hash) | Deduplicated by the natural key in brackets. The earliest by fold order wins. Never revoked by a later fold |
| Derived state | Item boxes, scaffolds, current steps, pass readiness, reopened steps, herd count, stall numbers, milestones and titles earned, jewels in the box (one per passed or placed step), sash contents | Computed by the folds. A fold never emits events |

After a fold, the store compares derived pass readiness and earned titles with the recorded facts and emits each missing `step.passed` or `title.given` once. A merge or a content change can therefore never take back a jewel or a title.

**Excluding play.** An `exclude` event, made only in the parent corner, names a device id. The folds leave out that device's events. It is used after an eviction (section 4.7). Tjitse's test and demo devices pair to a separate test family on the server, so their events never reach Emma's log.

**IndexedDB layout.** One versioned database, `moon-meadow`, opened with `idb`. Stores: `events` (key: event id), `quarantine` (events that failed validation), and `meta` with `device` (id and next sequence), `snapshot`, `sync` (server cursor, last success time) and `pairing` (device token). Each act writes its events and the new next sequence in one transaction, so a sequence is never reused after a crash.

**Snapshot.** It holds the folded world and learner, the position of the last folded event in fold order, the highest sequence folded per device, and a version hash of the fold code, the event schema and the content packs. It is rewritten at most every 10 seconds and at visit end. On start, new events that all sort after the snapshot position are folded on top. If any sorts before it, or the hash differs, or the snapshot is missing or unreadable, all events are refolded. A year of play is about 20,000 events and 3 MB, which folds in well under a second.

**Migrations.** Event schema versions only grow. Each new version has a migration function from the previous one and a unit test. Snapshots are never migrated, they are rebuilt.

### 4.5 Sync with odin

**API** (same origin, under the game's base path `https://odin.vendic.cloud/unicorns/`):

| Method and path | Auth | Purpose |
|---|---|---|
| `POST api/pair` `{code}` | Pairing code | Returns a device token. Codes are 6 digits, single use, valid 15 minutes, made by Tjitse with `node server/admin.ts pair` on odin |
| `POST api/sync` `{dev, after, events[]}` | Device token | Appends events the server does not have (deduplicated by id), returns the ids it rejected with a reason, events with a server sequence above `after`, the new cursor and `more` when there are over 2,000. The client pushes at most 1,000 events or 1 MB per call and moves on only after a chunk is acknowledged |
| `GET api/admin/unknown-names` | Admin token | Unknown names with gems, phonemes, first seen and count, for the generator |
| `GET api/health` | None | Liveness |

**When it syncs.** At start, at visit end, after a Building Day, and every 2 minutes while online and playing. It never blocks play and never shows Emma anything.

**Conflicts.** The merge is a union by event id, then the fold applies these rules:

| Case | Rule |
|---|---|
| Learning results | All count. Boxes, scaffolds and current steps are recomputed from the merged log. Passed steps stay passed (section 4.4) |
| One-time events with a natural key (`building.done` per plot, `jewel.placed` per jewel, `opening.announced` per opening, `title.given` per title, `baby.named` per baby) | The earliest in fold order wins. Later duplicates are ignored |
| Cosmetic state (outfit, favourite, decorations, row and sky names after renaming) | The latest in fold order wins per field |
| Pins | All pins stay. If a sash ends up with more than 10, the extra pins go to that baby's pin pouch |
| Stall numbers | Derived from hatch order. After a merge a baby may move. It trots to its new stall quietly, and the move-in task is not asked again |
| Herd milestones and titles | Earned from the merged herd. Announcements and titles are recorded facts, deduplicated by their key |

Nothing in a merge deletes a baby, a pin or a name.

**Versions.** The server is always deployed before the app. It rejects events one by one, never a whole batch. It stores events with a higher schema version than it knows without validating them, so a newer device is never refused. A device that receives an event it cannot validate keeps it in quarantine and tries it again after every app update.

**Server storage.** One directory per family: `events.jsonl` (append-only, fsync after each write), a daily copy at the first write of each day, the last 30 daily copies kept. Device tokens are stored as SHA-256 hashes.

### 4.6 Offline, export and import

- The game runs fully offline for every opened area (section 5.3). Sync waits and retries.
- Name clips for every baby in her herd are cached in the background at start, so roll call works offline. Bells and the name garden offer only names whose clips are cached. Uncached names stay open through the gold bell.
- The service worker precaches every word pack of the loaded steps. Offline, the planner checks the cache, not the manifest.
- **Export** in the parent corner: one JSON file (`{format: "moon-meadow-save", v: 1, exportedAt, events: [...]}`) through the share sheet (Web Share API with files), with a download as fallback. The parent corner reminds Tjitse once a week if the last sync or export is older than 7 days.
- **Import** merges, never replaces. Importing an old backup can never delete anything. The same path imports the v2 file from `move.html`.
- **Reset this iPad** (hold to confirm) clears local data and the pairing. The server copy stays.

### 4.7 Error handling

| Failure | What Emma sees | What happens underneath |
|---|---|---|
| Static clip missing at build | Nothing, the build fails | Generated `ClipId` types and the content validator |
| Clip fails to load at runtime | The moonbeam and ghost hand still show the goal. No pause longer than 300 ms | An `audio.missing` event once per id, listed in the parent corner |
| Learning-word clip or picture missing | Never shown | The planner skips items whose clip or picture is not in the manifest, or not in the cache when offline |
| Name clip missing or offline | The name is skipped in lines, as for a new name | No error. For a name that had no clip, the "moon told me" moment plays once its clip exists and is reachable |
| Offline | Normal play | Sync retries with backoff (30 s, doubling to 30 minutes) |
| Sync fails (server down, 5xx) | Normal play | Same retry. Parent corner shows the last success time |
| Device token rejected (401) | Normal play | Sync stops. Parent corner asks Tjitse to pair again |
| Storage write fails (quota, private mode) | Normal play | Events stay in memory and are retried every 10 s. Parent corner warning |
| Storage evicted | The new-player start screen. It always has a small parent restore button (hold 3 s) | Tjitse pairs again or imports an export. The server or the file restores everything. If she played the fresh start before the restore, the parent corner offers to exclude that device id (section 4.4), so a second visit 1 and its probe stay out of her log |
| Snapshot corrupt | Nothing visible | Refold from events |
| An event fails validation | Nothing visible | The event is kept in the quarantine store, left out of the fold, listed in the parent corner and tried again after each app update |
| New app version available | Nothing during play | The service worker activates the new version at the next start, never during a visit |
| Not installed to the home screen, or `persist()` refused | Normal play | Parent corner warning: "Add to Home Screen, or the herd can be lost" |

### 4.8 Security and privacy of the server

- HTTPS only, through odin's web server as a reverse proxy. The service listens on `127.0.0.1` only.
- Every API call except pairing and health needs a device token: 256 random bits, stored as a hash, revocable per device with `node server/admin.ts revoke`.
- The admin token for the name pull is separate and lives in Tjitse's repo env file, read only by `tools/pull-unknown-names.ts`.
- Pairing: 5 failed codes per IP per 15 minutes, then a 15 minute block. API calls: 60 per minute per token. Request bodies up to 2 MB. Every event is validated against the schema. An unknown type at a known schema version is rejected, alone. Events with a newer schema version are stored unvalidated (section 4.5).
- Same origin only, no CORS. A content security policy limits scripts, media and connections to the game's own origin.
- Stored data: the event log only (babies, their names, name builds including blocked attempts, learning results, settings). No account, email, IP log in the app, analytics or third-party scripts. Request bodies are never logged.
- There are no family or friends' names in the name bank (decisions.md), so every name pack is a public static file and the server serves no clips.
- The ElevenLabs key never goes to odin. Nothing on the server generates audio.
- `node server/admin.ts delete-family` removes all data and copies on request.
- Agents write the server, the systemd unit, the web server snippet and a deploy note. Tjitse deploys. Agents never SSH to odin.

Access details and retention are open decision 1.

## 5. Tech

### 5.1 Stack

Pinned exact versions from [research/engine.md](research/engine.md), with the lock file committed.

| Part | Choice | Version |
|---|---|---|
| Build | Vite | 8.3.4 |
| Language | TypeScript | 6.0.3 |
| UI | Svelte 5 with `@sveltejs/vite-plugin-svelte` | 5.57.2 and 7.3.1 |
| Type check | svelte-check | 4.7.6 |
| Save storage | idb (one versioned database, section 4.4) | 8.0.3 |
| Offline | vite-plugin-pwa | 1.3.0 |
| Canvas fallback, meadow only, if the test fails | PixiJS | 8.22.0 |
| Unit tests | Vitest | 5.0.3 |
| Browser tests | `playwright-cli` WebKit with `.playwright/cli.config.json` | 0.1.8 as installed |
| Font | Andika, self-hosted woff2 | OFL |
| Audio | `shared/audio.js` | Own code |
| Server | Node.js 24 LTS, TypeScript run by Node's type stripping, standard library only | 24.19.0 on the Mac and on odin |

`shared/audio.js` stays the one player for all games. v3 imports it unchanged plus one additive function, `addPack(name, base)`, so ids resolve across several pack folders, each with its own manifest. v2 behaviour stays the same when no pack is added. A `.d.ts` file types it.

### 5.2 Rendering, layout and touch

- DOM rendering. Layered WebP art at 2x. Animate only `transform` and `opacity`. No animated filters, shadows or SVG filters. At most three full backgrounds decoded at once.
- A fixed 1180 x 820 stage scaled to fit, with bands in the scene colour (as v2). Landscape only. Portrait shows the turn-the-iPad picture. The parent corner works in both.
- Pointer events with `setPointerCapture`, `touch-action: none` on the play area, a drag threshold of 6 px, snap when an item is near its target. Targets at least 64 x 64 px. No hover, no double tap, no keyboard for Emma. Page zoom, text selection and pull-to-refresh are disabled during play.
- Every interactive element has an `aria-label` (`egg`, `stone 3`, `door 19`), so `playwright-cli snapshot` refs are readable.
- The meadow animates at most 12 babies. Stall doors show static heads. The sky is stars.

### 5.3 PWA and hosting on odin

- Static files at `https://odin.vendic.cloud/unicorns/` (the Vite `base` setting). HTTPS is needed for the service worker and `persist()`.
- `index.html` and `sw.js` with `no-cache`. Hashed assets, `.webp`, `.mp3` and `.woff2` with long cache headers.
- The service worker precaches the app shell, the font, the core audio pack, the meadow area and the word packs of the loaded steps. Each area's art and audio pack are cached when the area opens. Name clips use their own cache route, cache-first.
- v3 is installed to the home screen on her iPad. A home-screen app has its own storage, separate from Safari tabs, and Safari's 7-day deletion of site storage in practice does not reach it. v3 also runs in a Safari tab. The parent corner then shows the warning in section 4.7.
- `navigator.storage.persist()` on every start.
- Deploy: `vite build`, then Tjitse rsyncs `dist/` and the audio packs to odin. Name manifests are fetched network-first at start, so name clips can be deployed alone with their manifest, without a rebuild.

### 5.4 The meadow performance test and the PixiJS fallback

Build week 1, before any other scene ([engine.md](research/engine.md), "Main risk"). It runs on placeholder art with the real layer count (about 12 layers per baby) and the real CSS mask colouring, and runs again in build week 3 with the real rig.

1. Build one rigged baby with that layer and mask setup.
2. A stress page as in production: the meadow background, 24 babies idling (breathe, blink, tail) with masked colour layers, 4 walking, 1 being dragged, 60 moonflowers and three bubbles.
3. Run it on Emma's iPad, in a Safari tab and from the home screen, with Web Inspector timelines.
4. Pass: a steady 60 fps, short drops to 45 at worst, memory inside the budget below, and no page reload after 10 minutes. Fail: the meadow scene renders with PixiJS 8.22.0 inside its Svelte component. Every other scene stays DOM. The rig JSON and tweens are written so both renderers can read them.

**Emma's iPad.** Probably an older iPad Air. The exact model is not known, so the test and its budgets are sized for the weakest model that can run v3, the iPad Air 2. They then hold on any later Air.

| Model | Year | Chip | Memory | Screen in points | Last iPadOS |
|---|---|---|---|---|---|
| iPad Air (1st generation) | 2013 | A7 | 1 GB | 1024 x 768 | iOS 12 |
| iPad Air 2 | 2014 | A8X | 2 GB | 1024 x 768 | iPadOS 15 |
| iPad Air (3rd generation) | 2019 | A12 Bionic | 3 GB | 1112 x 834 | iPadOS 18 or later |
| iPad Air (4th generation) | 2020 | A14 Bionic | 4 GB | 1180 x 820 | iPadOS 18 or later |

- The first iPad Air cannot run v3. Its Safari 12 has no Pointer Events, which every scene uses. If that is her iPad, she needs a newer one before the first playable.
- Vite builds for `safari15`, so the Air 2 on its last iPadOS runs the game. The iPad must be updated to its last iPadOS. The features the game uses (unprefixed CSS masks, `crypto.randomUUID`, IndexedDB, the service worker) are all in Safari 15.4.
- Memory is the tightest limit. The Air 2 shares 2 GB with iPadOS, and Safari reloads a page that uses too much. Budget for the meadow: decoded images under 150 MB and the whole page under 300 MB in the Web Inspector memory timeline. One 2360 x 1640 background decodes to about 15 MB, so the three-background limit (section 5.2) is about 46 MB. These budgets are a starting estimate that the test confirms or lowers.
- The A8X GPU handles transform and opacity animation well. Many masked layers cost fill rate, which is why the test uses the real layer count.
- The Air 2 shows the 1180 x 820 stage at about 85 percent in a Safari tab, so a 64 px target stays above 54 points.

Tjitse reads the model in Settings, General, About when the test runs. If it is an Air 3 or later and the test passes with margin, the budgets may grow.

### 5.5 Art direction and pipeline

**Direction.** A clean, smooth picture-book look with no paint or brush texture (Tjitse, 2026-10-12): clean shapes, smooth soft shading, a warm outline in a darker shade of the fill, light from the top left. Babies have big heads, big eyes with two highlights, short legs and round bodies, and read clearly at 120 px tall. Pastel base colours with saturated accents only for things to tap or collect. Night scenes in deep blue and violet with warm lamp light. Words sit in Andika on plain light panels. No look-alikes of trademarked characters.

**Pipeline.** No extra spending (decisions.md). Pictures come from the image generation tool in Tjitse's Codex subscription (`codex exec`, GPT image), driven by a script. Agents do the rest. The style is locked (step 1). A test on 2026-10-12 gave a 1312 x 1199 foal on white in about a minute, for about 31,000 subscription tokens. Cut-outs use free local tools on the Mac (the macOS subject mask or an open-source background remover), never a paid API. Batches stay small and spread out, because the subscription has usage limits per time window. A week 1 spike cuts one generated baby into rig layers, including the hidden parts that must be painted in (far legs, the body under the mane). If that fails, or if the subscription limits block the volume, the layers, items and word pictures are drawn as SVG in the locked style. The paid options in [research/image-models.md](research/image-models.md) are not used.

1. The style is locked: [art/style-reference.png](art/style-reference.png), described in [art/STYLE.md](art/STYLE.md) (Tjitse, 2026-10-12). Every generation attaches it.
2. Generate the baby in fixed poses from the reference. Cut the standing pose into layers: body, head, eyes open and closed, mane, tail, four legs, horn, cheeks, and a wing layer that stays hidden until a later release. Colourable layers are greyscale and coloured with CSS masks. Pivots and named anchors go into `rig.json` for each growth stage as its art is made.
3. Animate with code tweens on the rig. No Rive or Spine.
4. Items, pins and word pictures in the same style, cut out, one atlas per area. A picture check with Emma for each word batch (does she know what it shows?). Each word picture shows one single object, so code can stack copies into a heap for plurals (section 3.10).
5. One background per place at 2360 x 1640. The valley is a simple painted map with building icons.
6. Every batch: a contact sheet page at real size on the iPad viewport for Tjitse, and a script that checks size, transparency and file weight.

**First-playable volume.** About 500 word pictures (Phase 2 to 4 and the workbook's Phase 5 groups, from curriculum.md section 4.4), about 10 more one pictures for the plurals, whose heaps are drawn by code (section 3.10), 9 breeds on 2 growth stages, the items for care stations, the Salon, the Dressing Corner and 4 pin sets, 9 backgrounds (meadow, valley map, stable yard, Bath Pond, Post Box, Salon, Dressing Corner, Building Day yard, goodnight sky). Year 1 total: about 1,500 word pictures, about 35 breeds, about 25 backgrounds.

### 5.6 Audio generation, name updates and credits

**Packs.** Each pack is a folder in `public/audio/` with `lines.json`, the mp3 files and `manifest.json`, made by `scripts/generate-audio.py` as today ([shared/README.md](../../shared/README.md)). Packs: `core` (instructions, feedback, numbers, Lumi, foal lines), `words-phase2`, `words-phase3-4`, `words-year1`, one pack per area, `names-t1`, `names-t2`, `names-new`. Letter sounds come from `shared/audio/phonics/`. Clips are committed as in v2. The raw cache stays gitignored.

**Generator changes.**

- A name line can carry `ipa`. The generator then sends the IPA inline in slashes on `eleven_v4` with "!" or "?". The v2 audio research tested this only for single sounds, where it failed ("Slash S slash"). Before relying on it, a probe runs 20 invented names (Tamo, Lili and others) with inline IPA against plain respelling, with `--stt` and Tjitse's ear check. If IPA fails, names use respelling. Every IPA clip needs Tjitse's ear check.
- `tools/build-name-lines.ts` turns the name bank into `lines.json` for the name packs ("Bella!" and "Bella?").

**Adding the names she invented.** There is no nightly job and no clip server (decisions.md). When Tjitse runs a content batch, he first runs `npm run names:pull`. It fetches the unknown names from odin (or reads an exported save), builds the pronunciation from her gems, shows the nearest list name next to each so Tjitse can tell a misspelled list name from a new one, and adds them to `names-new/lines.json`. Then the normal flow: `--dry-run`, generate with `--max-chars`, `--stt`, ear check on `shared/review.html`, deploy the pack and its manifest to odin. The game fetches name manifests at start, so the next visit after the deploy plays "The moon told me a new name!". How often Tjitse runs it is open decision 6.

**Review.** Until the speech-to-text error rate is measured, Tjitse ear-checks every learning word, every invented or IPA name and the first two batches of list names. Letter sounds keep a full ear check against the school's videos. Open decision 2 covers what changes later.

**Credits.** The Starter plan gives about 40,000 credits a month. The generator stops at 8,000 left, so about 32,000 are usable. Elizabeth and Posh cost 1 credit per character, Flicker 2. Plan with about 30 characters per instruction line and one neutral clip per learning word. A reserve of 2,000 a month covers her invented names (about 120 names at about 16 credits each). At 10 to 20 hatches a week most names will be list names.

| Build month | Main content | Batch | Name reserve | Total |
|---|---|---|---|---|
| 1 (Phase 0) | About 150 lines for the heartbeat and naming, numbers and stall lines, words for Phase 2 to 4 (R01 to R29), the plural words, the es sound and the plural lines (section 3.10, about 1,000), tier 1 names part 1 (400) | about 25,000 | 2,000 | about 27,000 |
| 2 (Phase 1) | Moving Day, Building Day, Post, Salon and Dressing Corner lines, the workbook's Phase 5 words, adjective and "and" phrases, note cards, tier 1 names part 2 (600) | about 28,000 | 2,000 | about 30,000 |
| 3 to 6, each | One or two buildings a month, Phase 4 and 5 words, sentences for cards and wishes, books, tier 2 names (250 a month) | about 28,000 | 2,000 | about 30,000 |
| 7 to 12, each | Phase 5 and Year 2 words, short texts, money and time lines, seasons | about 26,000 | 2,000 | about 28,000 |
| Year | About 12,000 clips, about 150 MB, cached per area | | | about 345,000 of 384,000 usable |

Sound effects and music are not in the table. Chimes stay synthesized in `shared/audio.js`. The cost of ElevenLabs effects and music is measured before any is budgeted. If credits run short, open decision 4 applies.

## 6. Testing

### 6.1 Unit tests (Vitest)

| Area | What is tested |
|---|---|
| Leitner boxes | Every transition in the box table, the 4-hour visit rule, box 0 carried to the next visit, the fluency median and speed rule, helped as miss |
| Scaffold | 3 first tries up, 2 moments with miss or helped down, steps with one to three levels, helped after a level 2 hint |
| Step mastery | 12 of 15 at the top level over two days, every item one first try, probe and seed results excluded, `step.passed` emitted once and never revoked, reopen and close, name items excluded |
| Placement | Binary search over loaded steps with gaps, Emma's start (lo R13 and S09, first probe R21 and S12), lo opening to R01 or S01 after a miss at the bound, at most two steps per jump in visit 1, ends within 10 items or 4 visits, contrast steps never placed, school steps left out of the search and never placed, v2 seeds win over box 2 |
| Planner | Current step as the lowest open step with a place, waiting steps, an open school step taking the current-step share only in places that can serve it while difficulty follows the current step, the waiting label bubble while S10 is open, 50/30/20 mix over 1,000 simulated picks (within 5 points), at most 3 new items per strand per day, the 15 and 30 caps, the one-in-five spelling rule, golden egg limits, no item without clip or picture |
| Contrast rules | No pair distractor before its contrast step in each strand, th arriving with its pair in S07, `dutch` tagging, side steps never the current step, no Dutch text or clip id anywhere in the content packs |
| Simulated learner | At 2 to 3 visits a week of 15 to 19 checked moments, a bot answering at 85 percent passes a step in 3 play weeks or less, and the test prints weeks per step. At 50 percent no step passes and the scaffold drops. Over 60 simulated visits no strand gets stuck while a place exists for its next step |
| Naming | Gift gems by sound (Bella, Daisy, Lily, Rose, Sophie at several steps), gold bell order of checks, same-phoneme list match (Lili), y as the only vowel (Sky, Lyn), ordinals, blocklist by sound with English and Dutch cases, Cassidy and Scarlett pass |
| Task planners | Ported v2 cases for tray, basket, stones and cousins |
| World fold | Stall numbers from hatch order, the Moonbeam Camp, milestones, titles, opening queue order, one new thing per visit, jewel and plot rules, decoration plots when no building plot can take a jewel, key plots skipped, `exclude` |
| Merge | Union is commutative, associative and idempotent on random logs. Fold order by hybrid clock with a clock that jumps back. An incremental fold with late and out-of-order events equals a full refold of the sorted union. Earliest-wins and latest-wins rules. No baby, pin or name lost |
| Save | v2 import mapping on a synthetic v2 fixture, and on her real v2 export from `move.html` once it exists (kept local, gitignored). The same import twice, and on two devices that then sync, adds no baby. Events and sequence in one transaction. Snapshot hash change forces a refold |
| Server | Pairing, token checks, rate limits, dedupe, per-event rejection, newer schema versions stored, chunked push of a 20,000-event fixture, cursor paging, daily copies, the test family |

### 6.2 Browser flows (playwright-cli)

The repo config runs WebKit with iPad emulation at 1180 x 820, device scale 2, touch. Each flow runs at 1180 x 820, 1080 x 810 and 1024 x 768 (iPad Air 2). A portrait run at 820 x 1180 checks the turn picture and the parent corner. The test build serves `dist/` on `127.0.0.1` over HTTP, which counts as a secure context for the service worker. `playwright-cli` runs outside the sandbox with short session names without slashes. Screenshots move to `$TMPDIR`. On pulsing buttons, flows use `mousemove`, `mousedown` and `mouseup` instead of `click`.

**Test hook** `window.__game` (non-production builds only): `state()`, `jump(scene)`, `seed(n)`, `fast(on)`, `mute(on)`, `setNow(ms)` (moves the clock for multi-day tests), `setStep(strand, step)`, `answer()`, `wrong()`, `idle()`, `importFixture(name)`, `syncNow()`. Hook actions behave like a touch: they end a running hint first. Console lines `[timer]` per step and `[log]` per checked moment, as v2.

**Flows.** New player start. Moving Day from the fixture (count, names, pins). Three heartbeats with every egg kind. Gold bell: a list name, a same-phoneme spelling, an unknown name of 7 gems with the kind line, adding and removing slots, a blocked word, no vowel, a duplicate. Building Day for the Bath Pond and a row. Jewel drag to a plot and to a decoration plot. Door visit and roll call. Label bubble. Plurals: a one-or-many basket wish at each scaffold level with both mistakes, an S10 label at each level with a wrong ending, a bare word on a full jar and an ending on a jar of one, and the mice label. Post Box envelopes and sash fill. Salon card and free styling. Dressing Corner. Home Book tabs. Goodnight with roll call. Opening queue over 6 simulated visits. Placement until it ends. Parent corner: PIN, report, export, import, override. Offline visit (`context.setOffline`). Sync between two browser contexts against a local server. Eviction: clear IndexedDB, play a fresh start, restore by pairing and exclude the fresh start.

Every flow ends with `EmmaAudio.missing` empty and no console errors.

### 6.3 Audio checks

- The content validator: every referenced id exists, narrator-only prefixes (`word-`, `name-`, `num-`, `sound-`) use Elizabeth, no digits in line text, every learning word has a clip and a picture.
- `--stt` on every narrator clip. Mismatches go on top of the review list.
- Tjitse's ear check on `shared/review.html` per section 5.6.
- A listen-through of every first-playable line in game order before Emma plays.

### 6.4 Play tests with Emma

| When | What | Watch for |
|---|---|---|
| Before build week 1 | Style candidates: she picks her favourite baby and background | Which she points at first |
| Build week 3 | A paper or clickable demo of the jewel drag to a plot | Does she understand that a jewel from her box lights a stone? |
| First playable, visits 1 to 3 | Tjitse watches: Moving Day, the first gold-bell name, the first Building Day | Delight, any refusal, any moment she looks at him for help |
| Weeks 2 and 6 | The report (criteria in 1.3) and her verdict (V1) | Which places she visits, idle flags, accuracy bands |

Each new activity in later releases is demoed with Emma before its content is built, and cut if she ignores it.

## 7. First playable

Target: Emma plays a small first playable in about build week 7 (early December 2026), so the main bets are tested early. Releases 1.1 to 1.3 follow every two weeks, with her feedback between them. Sizes are rough: S is up to 3 build days, M about a week, L about two weeks. Art and audio run in parallel with code.

### 7.1 Contents by release

| # | Item | Size |
|---|---|---|
| | **First playable, about build week 7** | |
| 1 | Project skeleton in `games/moon-meadow-home/`, static deploy to odin over HTTPS, PWA install, `persist()`. CLAUDE.md, STACK.md and IDEAS.md updated for the `games/` folder and the odin service | S |
| 2 | Meadow stress test on placeholder layers in week 1, again with the rigged baby in week 3 (decides DOM or PixiJS for the meadow) | M |
| 3 | Core: events, hybrid clock, IndexedDB store, folds, snapshot, export and import, merge | M |
| 4 | Content packs and validator: loaded steps (section 3.9), about 500 words with pictures and clips, tier 1 names (1,000), `shared/blocklist.json`, core lines | L |
| 5 | Learning engine and session planner (section 3), unit tests and the simulated learner | L |
| 6 | The heartbeat: moon, small nest, two-stone and blanket eggs, hatch, shiny, moonflowers, first wish with basket and care stations, twin wishes, move-in and door visits | L |
| 7 | Naming complete (section 2.8) | M |
| 8 | Stables: rows of ten, plaques, Moonbeam Camp, roll call, goodnight sky with sky unicorns she names | M |
| 9 | Meadow hub, who's-waiting bubbles, label bubbles and the toy shelf, moonbeam, ghost hand, replay, hint ladder | M |
| 10 | Plurals now (section 3.10): the school-step flag, one-or-many wishes in the basket and the Bath Pond, plural jar labels with crescent ending gems at three levels and their funny readbacks, code-drawn heaps, the mice jar, plural words and clips | M |
| 11 | `move.html`, v2 import and Moving Day | S |
| 12 | Building Days for the Bath Pond and the rows, with the herd circle | M |
| 13 | Parent corner, first part: PIN, report, tried and unknown names, overrides, export, import, exclude, reset | S |
| | **Release 1.1, about build week 9** (her first jewel is due around play week 2) | |
| 14 | Jewel Box, decoration plots | S |
| 15 | Lumi's Dressing Corner | S |
| 16 | Golden egg, berry and snow eggs | S |
| 17 | Opening queue and novelty floor | S |
| 18 | Post Box, pins, sashes of ten, pin sets with silhouettes, notes to Lumi, plural parcels (section 3.10), Home Book (herd, baby page, pins, breeds, album, home, sky) | M |
| 19 | `npm run names:pull` from an exported save, the IPA probe and name lines | S |
| | **Release 1.2, about build week 11** | |
| 20 | Sparkle Salon with free styling and Cousins Dot and Fen, the Salon plot, the valley map with mist | M |
| 21 | Letter Lane | S |
| 22 | Titles on the crown, Royal Nest Keeper at 75, the Hundred Party at 100 | S |
| 23 | Babies come along to places | S |
| 24 | Year 1 meadow wishes: asking bubbles and two-state wishes | S |
| | **Release 1.3, about build week 13** | |
| 25 | Save server on odin, pairing, sync, the test family, `names:pull` from odin | M |
| 26 | Parent corner, rest: missing clips, idle flags, settings, pairing | S |

Until release 1.3, export through the parent corner is the backup (open decision 10).

### 7.2 Out of the first releases

Kitchen, Tea Garden, the Week Fence and Hide and Seek (release 2, about 4 build weeks after release 1.3), Story Nook, Parade Field, Growing Corner and the young unicorn stage, Unicorn School and its slate, castle rooms, Meadow Trails, Flying Meadow, Show Ring, Orchard, Friendship Garden, Market and money, Clock Tower and time, Library, Moon Tower, Throne Room. Twin, teen, star, bundle and coin eggs. Seasons and the memory trunk. Jobs and best friends. Show Papa. Soft bedtime (unless open decision 8 says on). Sound effects and music beyond the synthesized set. A clip server.

### 7.3 Acceptance checks

Each release goes to Emma when these hold for the parts it contains:

1. All Vitest suites pass, including the simulated learner and the merge properties.
2. `npm run check:content` and `svelte-check` pass with no errors.
3. Every flow in 6.2 passes at 1180 x 820, 1080 x 810 and 1024 x 768, with no missing clips and no console errors. Portrait shows the turn picture.
4. The meadow stress test passed on Emma's iPad within the memory budget (section 5.4), or the PixiJS meadow passed the same test.
5. On Emma's iPad, installed from the home screen: `persist()` granted, a full visit in airplane mode works, and export works. From release 1.3, the server is deployed and the events sync after reconnecting.
6. Her real v2 save, exported with `move.html` from her Safari tab, imports with the same number of babies, the same names and colours, and a star pin for every "pin" sticker.
7. A scripted run of 200 random gold-bell builds of 2 to 8 gems gives no refusal other than "no vowel" and "blocked".
8. From release 1.3: two devices played offline and then synced end with the union of both herds and no lost pin or name.
9. Tjitse has ear-checked every learning word, every IPA name, the first two batches of list names and every first-playable line in game order.
10. A 5 minute and a 45 minute test visit by Tjitse on the release's content (section 2.3 from release 1.2), on a test-family device, have no dead end, and every screen has one spoken goal.
11. Plurals: with Emma's start (section 3.5), R19 and S10 moments appear as soon as placement ends in each strand, in visit 1 or 2. The simulated learner at 85 percent passes both within 4 play weeks. Every plural word has its one picture, its heap and both clips. Tjitse plays a one-or-many wish at each level and an S10 label at each level, with a wrong ending, on Emma's iPad.

## 8. Open decisions for Tjitse

Decided in decisions.md and not repeated here: the direction, unicorns only, play rhythm, saves on iPad and odin, the engine, the v2 patch, naming without a clip server, British English only, and the answers of 2026-10-12: Year 1 at NOVA with the workbook as the Year 1 order, an older iPad Air, no family names, no v2 save backup, and v2 in a Safari tab. These remain.

| # | Decision | Recommended answer |
|---|---|---|
| 1 | Server access and retention | Pairing codes and device tokens as in section 4.8. Store only the event log. Keep 30 daily copies on odin. Delete everything on request |
| 2 | Which clips go live without your ear check? | None at first. Once the speech-to-text error rate is measured, list names may go live on a match with a 1 in 10 sample. Learning words, IPA names and letter sounds keep a full ear check |
| 3 | Codex images or SVG? | Codex image generation in your subscription, with SVG as the fallback. No paid image API. See section 5.5 |
| 4 | What if credits run short? | Stay on Starter. Cut batch content first (sentence variants, tier 2 names). Upgrade only if total use passes 32,000 credits in two months running |
| 5 | Is "Pom" allowed as a name? | Allow it. There are no Fluffles in v3 |
| 6 | How often do you run the name update? | With every content batch, and at least every two weeks while she invents names. About 10 minutes plus the ear check |
| 7 | Are toilet words blocked? | Blocked with a giggle, never logged as wrong |
| 8 | Soft bedtime in the parent corner? | Off by default. Build it in release 2 only if you want it |
| 9 | Pounds or euros for the Market? | Follow the school. If it does not say, euros. Needed only for the Market spec, around play month 6 |
| 10 | Can Emma play the first weeks without the server? | Yes. Export in the parent corner is the backup until release 1.3 (about build week 13), when the server and sync ship. decisions.md keeps the server. Only its timing moves |

**Facts needed before build week 1:** none.

**Facts that help but do not hold up the build:** the iPad model from Settings, General, About (the stress test is sized for an iPad Air 2 either way. Only a first-generation iPad Air would need replacing before the first playable, section 5.4), and whether homework follows the workbook's page order (curriculum.md section 7).
