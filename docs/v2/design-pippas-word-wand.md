# Pippa's Word Wand v2: design

## Core fantasy and role

Emma is Princess Pippa's wand apprentice. Pippa's tree house in Whisperwood has a round Wishing Window. Creatures knock and show what they need. Emma makes it with her own wand. She puts letter gems on the wand, slides her finger along it, and the word turns into the real thing. She gives it to the creature, the creature is happy, and the thing goes into her sticker book. Pippa always calls her "Princess Emma".

She has her own pet. On the first day a baby **Bobbin** climbs out of Pippa's sock basket. It is round and fluffy and looks like Bobo, in a colour Emma picks. "Bobbin" is a working name, so check the trademark register before the full game. Emma names the Bobbin with her wand. Every session it has one need, and she makes the thing it needs. At the end of the session she puts it to bed. It grows as she makes more words. It never gets sick or sad when she does not play.

Her wand grows with her reading. Each harder level arrives as a visible upgrade: a new gem type, a fourth socket or a number stone. Harder means a better wand, so she wants the challenge.

**Cast** (all our own):
- **Pippa**: the mentor. She shows each new skill once before Emma tries it.
- **The Bobbin**: Emma's pet.
- **Visitors in the demo**: Mrs Duck and her ducklings, Grandpa Goat, and Sizzle the baby dragon.
- **Visitors in the full game only**: Olly the owl (the daily parcel) and Hettie the hen.
- **Dot**: a unicorn foal who brings the Golden Scrolls.
- **The Queen**: comes to the tea party with her three pets.

Visitors only make animal sounds. Elizabeth speaks every line, so Emma always hears one clear voice.

### How every feedback point is answered

| Feedback | v2 answer |
|---|---|
| The speech was really bad (browser TTS) | Every line is pre-generated with ElevenLabs Elizabeth. The TTS fallback is removed. If a clip is missing, the game shows a parent screen that lists the missing clips. It never falls back to the browser voice. |
| The letter sounds were really bad | Phonemes are built and signed off in an audio spike before any game work. Each sound is checked against the school programme's pronunciation video and, if possible, by Emma's teacher. A native British speaker records the fallback sounds. The game refuses any sound that has not been approved. The blend is one continuous sound under her finger, not queued "luh-aw-guh" clips. |
| It was unclear which word they wanted | Every wish says the word: "...What do they need? A hat. Hat." The speaker button and the bubble repeat it. Each wish accepts exactly one word. No picture in the same scene could also be named with another word in that scene. |
| Emma loves the sticker book and collecting | About 150 stickers in the full game and 34 in the demo. Every finished word gives a sticker, a first try gives a shiny one, and there are rare unicorn stickers. Locked slots show the word in grey, so collecting means reading. |
| Queen Emma's Letters was unclear | Pippa shows each new task once before Emma's turn: a whole wish, sound by sound, and the first number stone. Every moment then opens with one spoken goal line and one clear picture. The speaker button repeats the goal of the current moment. The game never says the abstract "make a word". |
| Moonbeam Stables was too easy and felt like no maths and no reading | Racks hold 6 to 8 gems with close distractors. Hints never give the answer, and spoken counting is only a hint after a miss. The maths starts at "two more are coming" and number bonds, with part of the amount hidden. Only first tries count. |
| The reading and maths must be felt | A wrong build makes the wrong thing (a bug appears instead of a bun). A wrong pick on Sizzle's note spills his water. A wrong number leaves a duckling without a hat. The result is visible in the world. |
| She loves role play, fantasy, naming, caring and collecting | Role play: she is an apprentice who serves visitors and is thanked by name. Fantasy: a magic wand, a unicorn foal and a baby dragon. Naming: she names the Bobbin. Caring: the Bobbin's need, cold ducklings, a hungry goat, a thirsty dragon. Collecting: see above. |

## The round (step by step, about 4 minutes)

A session has at most 2 rounds. Round 1 has Mrs Duck as its maths visitor and round 2 has Grandpa Goat. Every round has the Bobbin's warm-up, one maths visitor, Sizzle's note and the Queen's tea party.

A queue of visitor portraits at the top replaces the v1 map strip, and each visitor she serves gets a green tick. A large speaker button sits top right. Lines in quotes are Elizabeth. `{name}` stands for the Bobbin's name, and each line with the name is pre-generated as a whole sentence. "Bop" is used as the example.

**0. Start screen (5 s).** A big Play button with the sleeping Bobbin on it (Pippa's face on the first play) and the sticker book button with its badge. The tap unlocks audio and decodes the clips for the first scene. From the second session the Bobbin wakes up: "Bop missed you!"

**1. First session only: the wand, the Bobbin and Pippa's turn (about 115 s).**
- Pippa: "Hello, Emma! I am Princess Pippa. This magic wand is for you, Princess Emma." A wand floats into her hand slot.
- The sock basket wiggles. "Oh! Something is in my sock basket!" A Bobbin pops out and squeaks. "A baby Bobbin! What colour is it? Tap one." She chooses from three swatches (mint, pink, lilac).
- "It needs a name. Let's make a name with your wand!" This is the **naming wheel**. Socket 1 holds b, f or t. Socket 2 holds i or o. Socket 3 is always p. A tap on socket 1 or 2 swaps in the next gem and plays its pure sound. "Tap a gem to change it." The rainbow track lights up. "Now slide your finger along the wand." The slide blends the name and then says it ("Bop!").
- Two buttons appear: a heart and a round arrow. "Do you like the name Bop? Tap the heart, or the round arrow." Heart: "Hello, Bop!" The Bobbin bounces. Round arrow: back to the wheel.
- The wheel can make exactly 6 names: **Bip, Bop, Fip, Fop, Tip, Top**. All 6 have been checked against English and Dutch rude-word lists and against the cast names. Pip was rejected because it is too close to Pippa, and Mop because it is a thing word. Endings in k, s, l or t and the vowel u were rejected because they make Dutch rude words (pik, pis, lul, kut). Every name clip goes through the same sign-off as the phonemes.
- **Pippa's turn.** "Watch me first. I need a mat. Mat." The wand shows three empty sockets. "What is the first sound? /m/. Here it is!" The m gem flies into socket 1 and plays /m/. The same happens for /a/ and /t/, one socket at a time. "Now I slide." Her ghost finger slides and the wand blends "mmat", then "Mat!". A mat appears. "Now it is your turn, Princess Emma." Pippa's word is always a word that is not used in the rest of the round, so it gives nothing away.

**2. The Bobbin's need: warm-up (about 30 s, an easy review word, always winnable).**
- A bubble with a picture appears over the Bobbin. "Bop is hungry. What does Bop want? A bun. Bun."
- The need words are hungry (bun, nut), cold (hat, rug) and thirsty (cup, mug). The scheduler never picks a word whose picture could be confused with another word in the same round.
- Gems pop into the rack. First session only: a hand drags a **blank white ghost gem** to a socket. "Put the gems on the wand." The hand never shows a letter.
- When the wand is full, a chime plays. The first time in each session Elizabeth says "Now slide your finger along the wand."
- Right: "A bun! Yum yum." The Bobbin eats it and does a happy spin. A sticker flies to the book.

**3. Maths visitor: a wish, then a number (about 75 s).**

*Round 1, Mrs Duck (M3 by default).*
- Knock. "Knock knock! Who is it?" The window opens. Ducklings are scattered on the grass. Each wish word has its own need line:
  - cold: hat or rug ("They are cold. What do they need? A hat. Hat.")
  - hungry: bun ("They are hungry...")
  - thirsty: cup ("They are thirsty...")
- She builds the word and slides. "A hat!" Mrs Duck puts the hat on, so the hat she made is not part of the count.
- First session only, the first number stone is shown by Pippa: "Bop wants a hat too. Watch me. I put one on my wand." The stone 1 snaps into the round number socket at the star tip. She slides, and one hat flies onto the Bobbin. "One hat for Bop! Now you."
- The number socket opens and stones 1 to 10 slide in on a tray. At M3 a hedge rustles and shows a numeral sign: "Two more ducklings are coming! Every duckling needs a hat. How many hats? Put a number on your wand." The newcomers stay hidden. From M2 on, Elizabeth does not say the number when a stone snaps in, so Emma has to read the numeral.
- She slides. The hats fly onto the ducklings one by one, then the newcomers waddle out and take the rest.
- Too few: "Oh no! A duckling has no hat." That duckling shivers and waves.
- Too many: "Oops! Too many hats." The spare hat lands on the Bobbin and it giggles.
- The mismatch stays on screen while she picks a new stone. When she slides again, the scene first goes back to how it started: the hats fly back into the wand and the newcomers go back behind the hedge. The right answer never changes between tries.
- Right: "Every duckling has a hat! Thank you, Princess Emma!" The portrait in the queue gets a tick.

*Round 2, Grandpa Goat (M4 by default).*
- Bleat. "It is Grandpa Goat. He is hungry. What does he need? A nut. Nut." (or bun)
- She builds the word and slides. "A nut!" Grandpa eats it, so it is not part of the count.
- "Grandpa is making a party tray. Look at the number on his bag. The tray has ten holes. How many more nuts to fill it?" The bag shows a numeral from 3 to 8 and its nuts are hidden inside. Next to it is an empty ten-frame tray (two rows of five holes). The stones go from 0 to 10.
- She slides. The bag pours its nuts into the tray, then the wand adds hers.
- Too few: an empty hole sparkles. "There is an empty hole."
- Too many: a nut rolls off and the Bobbin catches it. "Oops! Too many nuts."
- Before every retry the nuts go back into the bag and the wand.
- Right: "The tray is full! Thank you, Princess Emma!"

**3b. Golden Scroll (about 40 s, a bonus).** It is offered at most once per session, never in the first session, and only after both wishes in the round were right on the first slide.
- Dot the unicorn foal trots up with a glowing scroll. "Look! Dot has a Golden Scroll. It is very tricky. Do you want to try? Tap the scroll, or wave bye bye." Two buttons appear: the scroll and a waving hand.
- Scroll: a wish one sub-step above her current level, using only graphemes she has already unlocked. That means 8 gems, no red vowels and the closest distractors ("Dot wants a bed. Bed."). Right gives a rare unicorn sticker.
- Waving hand: "Bye bye, Dot! See you soon."

**4. Sizzle's note: reading a written word (about 45 s).**
- A little puff of smoke at the window. Sizzle the baby dragon is there with a note in his claws. "It is Sizzle the baby dragon. Sizzle wants something. It is on his note."
- Three things slide onto the shelf and Elizabeth names them: "On the shelf: a cup, a cap and a pup." This makes sure she knows the name of each picture. Reading the note is still the only way to know which one he wants.
- The note unrolls with **cup** in big letters and a dot under each sound (UK sound buttons). "Slide under the note, then give Sizzle the right thing." First time only, a ghost hand slides under the word without sound.
- A tap on a dot plays that pure sound. A slide under the word plays the sounds running together under her finger. The whole word is never spoken before she chooses.
- The note word is always a word she has already met as a spoken wish, in this session or an earlier one.
- Right: "A cup! Yes, the note says cup." Sizzle drinks and lets out a happy puff of smoke.
- Wrong: Sizzle tries to use the thing, and it visibly fails. He pours water into the cap and it spills. "Oh no. That is a cap. Read the note again." The wrong thing is swapped for a new distractor, and all three positions are reshuffled.
- After two wrong picks, the slide plays by itself, followed by "The note says cup." The cup glows and she gives it to him. The item counts as a miss and she gets a plain sticker.

**5. The Queen's tea party (about 55 s).**
- Fanfare. "The Queen is having a tea party!" The table holds one of each thing Emma made today. The Queen's three pets sit on cushions: "The Queen's pets: a pig, a dog and a cat."
- "The Queen sent you a note. Do what it says!" The note reads: **Put the hat on the pig.** "Put" and "the" carry a small purple heart, which marks a tricky word.
  - Each decodable word has sound buttons and its own slide track. The same engine as on Sizzle's note blends it under her finger. A whole decodable word is never spoken before she acts.
  - Tapping a heart word speaks it whole until she has met it 5 times. After that it only glows.
- Right: "Yes! The pig has a hat!" The pig wiggles.
- Wrong animal: the hat lands on the other animal, who giggles. "Hee hee! That is the dog. Read the note again." The hat goes back.
- Wrong thing: the pig sniffs the bun and pushes it away. "Hee hee! The pig does not want that. Read the note again."
- After two misses, each word blends by itself in turn, and the right thing and the right animal glow. She does the action, and the note counts as a miss.
- Read-back: "Look at all the things you made today!" Each thing bounces as it is named ("A bun! A hat! A cup!").
- The Queen bows. "Thank you, Princess Emma!" Confetti falls and a crown flies into the book.

**6. Stickers and bedtime (about 20 s).**
- The book opens and the new stickers wobble. "Look! New stickers for your book!" The page's progress dots fill.
- At a growth threshold: "Look! Bop is growing!"
- After round 1: "Do you want to make more magic? Tap the wand. Or tap the moon for bedtime." The wand button starts round 2 and the moon button goes to bedtime.
- After round 2, or after the moon button: the Bobbin yawns. "Bop is sleepy. Night night, Bop." It curls up on the book cover. "Come back tomorrow for more magic!" The cap of 2 rounds is saved with the date, so reloading the page does not reset it.

**Timings (smooth run).**

| Part | Time |
|---|---|
| Start and greeting | 8 s |
| Bobbin warm-up | 30 s |
| Maths visitor | 75 s |
| Sizzle's note | 45 s |
| Party | 55 s |
| Stickers and end | 20 s |
| **Round** | **about 4 minutes** |
| With Golden Scroll | about 4.5 minutes |
| First round (adds wand, Bobbin, naming, Pippa's turn and the number demo) | about 6 minutes |
| Usual session (2 rounds) | about 8 to 9 minutes |
| First session (2 rounds) | about 10 minutes |

With the full hint ladders a round can take about 7 minutes. If testing shows rounds are too long, drop the Golden Scroll first, then shorten the read-back.

**What the speaker button says** (always the goal of the current moment):

| Moment | Speaker or bubble tap |
|---|---|
| Start screen | "Tap Play to make magic!" |
| Colour pick | "What colour is it? Tap one." |
| Naming wheel | "Tap a gem to change it. Then slide your finger along the wand." |
| Name choice | "Do you like the name Bop? Tap the heart, or the round arrow." |
| Building a wish | The dictation clip: "A hat. Hat." |
| Wand full | "Now slide your finger along the wand." |
| Mrs Duck's number | "Two more ducklings are coming! Every duckling needs a hat. How many hats? Put a number on your wand." |
| Grandpa's tray | "Look at the number on his bag. The tray has ten holes. How many more nuts to fill it?" |
| Golden Scroll offer | "Do you want to try? Tap the scroll, or wave bye bye." |
| Sizzle's note | "On the shelf: a cup, a cap and a pup. Slide under the note, then give Sizzle the right thing." |
| Queen's note | "Read the note. Slide under a word to hear its sounds." |
| Sticker book | "Look! New stickers for your book!" |
| More magic? | "Do you want to make more magic? Tap the wand. Or tap the moon for bedtime." |

## Reading

### Skills

| Skill | Moment | Direction |
|---|---|---|
| Segmenting a spoken word and choosing its graphemes (encoding) | Bobbin need, visitor wishes, Golden Scroll | Hear the word, find the gem for each sound, in order |
| Pure letter sounds | Tapping gems and sound buttons, gems snapping in | Pure sounds, never "buh" or "luh" |
| Blending at her own speed | Sliding along the wand and under written words | Her finger drives the sound |
| Decoding a written word with meaning | Sizzle's note, the Queen's note, grey words in the book | See the word, sound it out, blend it, find the thing |
| Digraphs are one sound | Two-letter gems take one socket. A bar under a digraph | sh, ch, ee and ck fill one socket |
| Tricky words | The Queen's note (heart words) | Read on sight. From level R3 they decide the action |

### Word ladder

Only use picturable nouns that a 6-year-old who is learning English as an additional language knows, or can learn from one clear picture. The socket count always equals the number of sounds. The default programme is **Little Wandle**, the most common DfE-validated scheme. Before building beyond the demo, ask Emma's school which programme it uses and match its grapheme order, pronunciations and tricky-word list.

| Level | New graphemes | Thing words |
|---|---|---|
| S1 | s a t p i n m d | pan, pin, map, mat |
| S2 | g o c k e u r h b f l | cat, dog, pig, hen, bun, mug, cup, bed, bag, hat, log, sun, bus, fan, rug, net, pot, nut, leg, cap, pup, hut, bug, pen |
| S3 | ck ff ll ss (one gem each). Wand upgrade, and Pippa shows the first ck word (sock) | duck, rock, lock, bell, doll |
| S4 | j v w x y z qu, sh ch th ng (wand upgrade: two-letter gems) | jam, jug, van, web, wig, box, fox, six, zip, ship, fish, dish, shell, chick, chip, moth, ring, king, wing |
| S5 | ai ee igh oa oo ar or ow oi ear air (vowel-team gems) | rain, tail, bee, sheep, feet, light, boat, coat, goat, moon, book, car, star, fork, cow, owl, coin, ear, chair |
| S6 | adjacent consonants (wand upgrade: fourth socket) | frog, crab, drum, flag, plum, tent, nest, milk, belt, hand, lamp, pond |

Cut for good: bat (two meanings), cog, cot, lot, nab, jab, nub, lag, ban, tag and got. Tin and tap come only in the full game, after a spoken introduction.

**Pictures that can be confused** never appear in the same scene, rack result, shelf, table or round. The pairs are hat/cap, cup/mug, dog/pup, mat/rug, pin/pen and pot/pan.

**Same-sound spellings.** c, k and ck all make /k/. l and ll make /l/, s and ss make /s/, and f and ff make /f/. Until a planned "spelling choice" sub-step after S3 (full game only), a rack never holds two spellings of the same sound. A cat rack has c and no k, and a duck rack has ck and no c or k. If she still builds a same-sound spelling, the sound is accepted. The odd gem wiggles, the right gem replaces it, and Elizabeth says "Right sound! This word uses this letter." This is not a miss, and she keeps the chance of a shiny sticker.

**Tricky words** follow Little Wandle until the school confirms:
- Phase 2: is, I, the, put, pull, full, as, and, has, his, her, go, no, to, into, she, push, he, of, we, me, be.
- Phase 3: was, you, they, my, by, all, are, sure, pure.
- Phase 4: said, so, have, like, some, come, love, do, were, here, little, says, there, when, what, one, out, today.

**Sentence ladder (the Queen's note)**

| Level | Shape | Example |
|---|---|---|
| R1 | "Put the {thing} on the {animal}." Pick from 3 things and 3 animals | Put the hat on the pig. |
| R2 | Adds in, on and under | Put the bun in the box. |
| R3 | Pronouns or numbers decide the action | The cat is cold. Give her a hat. |
| R4 | Phase 4 tricky words | Put one little bun on the dog. |

**Sizzle's shelf ladder** (three things that each differ from the note word by one sound, named aloud as they arrive):

| Level | Where the things differ | Examples |
|---|---|---|
| B1 | Any one position | cup, cap, pup. bun, bug, sun |
| B2 | Vowel only (two vowel partners plus one other) | net, nut, pen. hat, hut, mat |
| B3 | Vowel only. The slide no longer plays sounds, but a tapped dot still plays one sound | leg, log, bag |

### How it is checked

- **Wishes**: after the slide, the grapheme sequence must match the target socket by socket, with a digraph gem counted as one. A same-sound spelling is handled as described above. A pass means right on the first slide, with no hint beyond repeating the word. Each attempt is logged per grapheme and position, for example "vowel wrong, e for a".
- **Sizzle's note**: the thing she gives must be the one written on the note, on the first pick. The log also records whether she slid under the word or tapped dots first. A pick with neither counts as a guess.
- **Queen's note**: the final placement must match the note: the thing, the animal and, from R2, the relation word.

**What happens after a wrong slide in a wish:**
- The blend engine has already played what she built, so she has heard her own word.
- A **real word from the picture dictionary** (for example "bug" for "bun"): the bug pops out, buzzes and puffs away. "A bug! That is not it. Listen again. A bun. Bun." There is no sticker yet and the shiny is lost. The contrast is the lesson.
- A **non-word**: a pink fizzle, no spoken nonsense word, and "Hmm. Listen again. A bun. Bun."

**Hint ladder for a wish** (one step per wrong slide). No hint lights a gem until the final two-choice. Hints may stretch the word, but they never split it into separate sounds in order.
1. **Repeat** (free; the speaker, a bubble tap or 10 s idle): the dictation clip again. It does not count against her.
2. **First wrong slide**: the blend engine plays the target stretched and continuous. "Listen. Bbuunnn. Bun."
3. **Second wrong slide**: gems in the right socket turn gold and lock, and the others hop back to the rack. "Some gems are right! Listen. Bun."
4. **Third wrong slide**: the first open socket pulses and its pure sound plays. "Listen for this sound. /u/." No gem glows. She must match the sound to a letter.
5. **Fourth wrong slide**: only two gems stay in the rack for that socket. "Is it this one, or this one?" Each gem plays its sound when tapped.
6. **Any socket still open** gets the same two-choice in turn until the word is complete. She slides, the thing appears, and she earns a **plain sticker**. The word counts as a miss and comes back as a later warm-up.

Each word is done within about 90 seconds. After the first session, idle help is the word again (after 10 s), then the blank ghost-gem hand (after another 15 s).

### Why it cannot be guessed

- The word is spoken, so there is no picture riddle. The only question is which letters.
- Racks have 6 gems at S1 and S2 (2 or 3 of them vowels), rising to 8. Distractors only use graphemes she has been taught, and they are chosen to sound close. At S1 the pairs are m/n and p/t. S2 adds b/d, b/p, e/i and g/c. u/o, a/e and final d/t stay out of S1 and S2 (see Dutch-speaker care).
- **The real odds.** At S1 and S2 the red vowels are a scaffold, so a random build that respects the colours hits about 1 time in 18 to 24. From S3 all gems share one palette: 1 in 120 with 6 gems and 1 in 336 with 8. Random building therefore can finish a word at S1 and S2. It does not pay: only first tries move her level up and earn shiny stickers, and every wrong build makes a visible wrong result.
- Targets, racks, shelf items and the Queen's note are drawn fresh every play. Remembering last time's answers does not help. No word repeats within a session.
- `shuffledGems` keeps the target out of reading order in the rack.
- On Sizzle's shelf, a wrong pick is swapped for a new distractor and all three positions are reshuffled, so each pick is a 1 in 3 chance. On the Queen's note, random picks pass about 1 time in 9.

## Maths

### Skills

| Level | Skill | Scene | Stones |
|---|---|---|---|
| M1 | Count to 5, numerals 1 to 5, one-to-one | 4 ducklings in a row. Elizabeth says the stone's number when it snaps in | 1 to 5, with dots and numeral |
| M2 | Count to 10, numerals only | 7 ducklings scattered, not in a row. No spoken number | 1 to 10 |
| M3 | One more and two more | Scattered ducklings, and 1 or 2 more hidden behind the hedge with a numeral sign | 1 to 10 |
| M4 | Number bonds to 10 | Grandpa's bag shows a numeral, and his tray is an empty ten-frame | 0 to 10 |
| M5 | Adding and taking away within 10, part hidden | A box with **7** on the lid. "The cats take 3 buns. How many are left in the box?" | 0 to 10 |
| M6 | Within 20, doubles and halves | "Each pony needs 2 ribbons." 4 ponies. Teen numbers from a ten-stick stone plus a ones stone (wand upgrade) | Ten-stick plus 0 to 9 |

The demo starts Mrs Duck at M3 and Grandpa Goat at M4. M2 is the quiet down-step. The full game sets each visitor's maths at Emma's maths level.

### How it is checked

- The stone in the star socket must match exactly. The wand makes that many things, and each goes to one place (a duckling, a hole).
- The thing she made in the wish goes to the visitor, so the count always starts clean.
- A wrong number leaves a visible mismatch: a cold duckling, a spare hat on the Bobbin, an empty hole. The spoken line names the kind of mismatch ("A duckling has no hat", "Too many hats") but never the number.
- Before every retry the scene goes back to its starting state. A pass means right on the first slide with no hint.

### Why it cannot be guessed

- The tray always holds 10 or more stones, never three answer buttons.
- Amounts are random each round. From M2 the objects are scattered, so she cannot read the number from the shape of a row.
- From M3 part of the amount is hidden and shown only as a numeral. At M4 the bag's nuts are hidden and the tray is empty, so she must work out the difference to ten.
- From M2 the stone's number is not spoken, so she cannot try stones until she hears the right number.
- **Maths hints** come only after a miss, and none of them lights a stone:
  1. Repeat the question (free, at any time).
  2. After the first miss: tap-to-count. Each object she taps gets a dot. At M1 and M2 Elizabeth says the running number. From M3 it shows the dot only.
  3. After the second miss: the hidden part is shown. The newcomers step out from the hedge, the bag pours its nuts into the tray, or the lid lifts.
  4. After the third miss: two stones stay on the tray. "Is it this one, or this one?" The item then finishes as a miss.

## Difficulty and adaptation

- **Four strands**, each with its own ladder and 2 or 3 sub-steps per level (more gems, closer distractors, scaffolds removed):
  - Segmenting: S1 to S6
  - Blending (Sizzle's note): B1 to B3, repeated at each grapheme level
  - Sentences (Queen's note): R1 to R4
  - Maths: M1 to M6
- **Window.** A rolling window of the last **4 items per strand** is saved across sessions. 4 out of 4 moves her up one sub-step, 3 keeps her where she is, and 2 or fewer moves her down one sub-step without announcement. One round gives 2 segmenting items and 1 item for each other strand, so segmenting can move within one session and the other strands over two sessions. A new level arrives as a wand upgrade: "Your wand is stronger! Look, a new gem!" When a new gem type arrives, Pippa shows it once on her own word.
- **Mix per round**: the warm-up is an easy review word, the visitor's wish is at her current level, and the Golden Scroll is one sub-step above. Every round starts with a win.
- **Review.** In the demo, a missed word goes on a missed list and comes back as a later warm-up. The full game uses Leitner boxes per word and per grapheme, picks graphemes she keeps getting wrong more often, and retires a word after three first tries in a row.
- **Placement.** In the first session, two first-try passes in a row skip a sub-step, until the first miss. The default start is S2, B1, R1 and M3, because she is in Year 1. Tjitse can set the levels after asking the school.
- **Dutch-speaker care.** Some contrasts are hard for a Dutch speaker. They stay out of S1 and S2 as distractors and come back later as a planned "tricky pairs" sub-step, logged separately. They do not block a level-up on their own:
  - a/e (bad, bed) and u/o (cut, cot)
  - final voicing (bed, bet and dog, dock)
  - v/w and v/f
  - j read as Dutch "y"
  - th
- **Parent corner**: a **two-finger** hold of 3 seconds on the crown counter. It shows each strand's level, the graphemes and words she keeps missing, and a manual level setter. "Reset save" sits behind an adult check: type the answer to "7 × 8" on a number pad. It uses large numbers and icons.

## Collection and rewards (and meta-progression across sessions)

**Sticker book** (purple, two pages per spread):
- **Pages** are themed by meaning and by sound: Kitchen, Animals, Clothes, Toys, Garden, the "ck" page, the "sh" page, the "ee" page, Royal. About 150 stickers in the full game and 34 in the demo.
- **Earning**: a sticker comes only from a word she made or read on purpose (a wish, Sizzle's note, a Golden Scroll, and in the full game the owl parcel). Accidental real words give nothing. Every word she finishes gives a plain sticker, even after hints.
- **Shiny stickers**: a wish right on the first slide, or a note right on the first pick, gets a gold frame and a sparkle ("First try! A shiny sticker!"). A plain slot can later become shiny, so the same word is worth making again carefully. A page completed in shiny turns its frame gold.
- **Rare stickers**: unicorn stickers from Golden Scrolls. In the full game also stickers from Olly's daily parcel.
- **Locked slots**: a silhouette with its word printed in grey under sound buttons. A slide under the word blends its pure sounds but never says the whole word. This turns the book into a reading invitation. A slot above her level shows a sleeping silhouette with a little moon. A tap says "Later!".
- **Page complete** (full game): the Queen visits for a short party with a read-back. Each sticker on the page bounces as it is read. The reward is something for the world: a Bobbin outfit, a window decoration or a new visitor.

**The Bobbin**:
- **Growth by words made**, not by time. In the demo it grows from baby to small at 10 words. In the full game it is small at 30, big at 80, and big with little wings at 150. Each stage has a short celebration and a new squeak.
- **Wardrobe** (full game): things she makes for it (hat, sock, bell, later a crown) go into its wardrobe, and she can dress it on the start screen.
- **Greeting**: it greets her every session ("Bop missed you!"). It never decays.

**Wand power** is the visible ladder:
- **Double-letter gems** at S3.
- **Two-letter gems** at S4.
- **Vowel-team gems** at S5.
- **A fourth socket** at S6.
- **The ten-stick stone** at M6.

**Crowns**: one per finished round, on a shelf in the book. In the full game every 5 crowns bring a new visitor.

**Daily hooks without pressure (full game)**:
- **Owl parcel**: Olly brings a parcel once a day with a written label. She slides under the label and picks the matching thing to open it.
- **New visitors**: about every second day.
- **Calendar**: a stamp for each day she plays. No streaks.
- **Session cap**: bedtime after round 2.

**Saving**:
- **Demo**: `localStorage` key `pww2-save`, with every access wrapped in try/catch. It holds the Bobbin's name, colour and word count, the book with shiny flags, crowns, levels, the 4-item windows, the missed list, the met-words list and today's round count with the date.
- **Full game**: installed as a Home Screen web app, because Safari can clear site storage, plus a small server-side save on odin keyed by a device id with no personal data.

## What is kept from v1 and what is cut

| Kept | Changed | Cut |
|---|---|---|
| Gem drag system (pointer capture, `toStage`, tolerant snap, swap, tap to hear, tap to return), 104 px gems | Socket count follows the number of sounds. Digraph gems fill one socket. Number stones grow to 72 px | Picture-only goals and "Make a word with the magic gems" |
| Octagonal gem look with shine | Red vowels are a scaffold at S1 and S2 only | Browser TTS fallback |
| Slide-to-blend gesture, rainbow track, sockets lighting in order, wiggle on tap | The sound follows her finger as one continuous blend | Queued, slowed phoneme clips with gaps between them |
| `shuffledGems` rule | Distractors come from taught graphemes only, never a same-sound spelling | Fixed river, gate and cave scenes with fixed answers |
| Gold plaque and the word-becomes-a-thing payoff | A wrong real word makes its thing briefly, then it fizzles | Two answers for one need (bun or jam) |
| Speaker button | It always repeats the current goal, including the word | "That is a word, but..." lines and spoken nonsense words ("Gol?") |
| Idle hand demo | It drags a blank ghost gem only. Pippa shows the method on her own word | The hand dragging the correct gem, the `demoDrag` wrong-socket bug, and "Listen to the sounds" lighting the answer gems |
| Party read-back with bouncing items, crown fly-in | It now follows the Queen's note | Fun detours counting as misses. `G.misses` is replaced by first-try tracking per strand |
| Sticker book with silhouettes and the save | Grey word under each silhouette, shiny and rare stickers, themed pages | 10-sticker book. Unknown or two-meaning words (bat, cog, cot, lot, nab, jab, nub, lag, ban, tag, got) |
| Map strip | It becomes the visitor queue | The walking journey |
| Pippa, Bobo, goat, Queen, cat | Bobo's look becomes Emma's named Bobbin. The goat becomes Grandpa Goat | The bat and cave scene. Hettie in the demo |
| `say`, `sayQ`, `stopVoice`, the id-based line table | Played through Web Audio buffers decoded per scene | The unused `.wordhint` class |
| `window.__game` test hooks | Adds `setLevel(strand, level)`, `upgradeWand(level)`, `forceItem(id)`, `state.hints`, `state.windows` and `resetSave` | |

## Audio needs

All speech is ElevenLabs Elizabeth, generated ahead of time with one fixed voice-settings profile:
- A script (`scripts/pww2-generate-audio.py`) reads `audio/lines.json` and writes `ideas/<v2-slug>/audio/<id>.mp3`. It loads `.env` itself and never prints or embeds the key. It can reuse the voice lookup from `scripts/gpt6-generate-audio.py`.
- Lines are whole sentences. Words are never stitched into the middle of a sentence. A wish is a lead-in line that ends on a question ("They are cold. What do they need?") followed by a per-word dictation clip ("A hat. Hat."), the way a teacher dictates a spelling word. Pure phoneme clips may follow a full sentence, as in Pippa's turn.

**Fixed lines (about 90)**:
- **First session**: hello, wand gift, sock basket, "What colour is it? Tap one.", "It needs a name...", "Tap a gem to change it.", Pippa's turn on "mat" ("Watch me first...", "What is the first sound?", "Here it is!", "Next sound?", "Last sound?", "Now I slide.", "Now it is your turn, Princess Emma."), and the number demo per maths thing.
- **Wand**: "Put the gems on the wand.", "Now slide your finger along the wand.", "Slide all the way to the star.", "Right sound! This word uses this letter."
- **Visitors**: "Knock knock! Who is it?", Mrs Duck's intro with one need line each for cold, hungry and thirsty, and Grandpa's intro and tray line.
- **Help**: "Listen again.", "Listen.", "Some gems are right! Listen.", "Listen for this sound.", "Is it this one, or this one?", "That is not it.", "Hmm."
- **Maths**: "Put a number on your wand.", "One more duckling is coming!", "Two more ducklings are coming!", "Every duckling needs a {thing}. How many {things}?" and "Oh no! A duckling has no {thing}." and "Oops! Too many {things}." for each of the 4 Mrs Duck things, "There is an empty hole.", "Oops! Too many nuts." and buns, "The tray is full!", "Every duckling has a {thing}!".
- **Sizzle**: intro, "Slide under the note, then give Sizzle the right thing.", "Read the note again.", and about 12 shelf-naming lines, one per shelf set.
- **Golden Scroll**: offer, "Bye bye, Dot! See you soon."
- **Party**: "The Queen is having a tea party!", "The Queen's pets: a pig, a dog and a cat.", "The Queen sent you a note. Do what it says!", "Hee hee! That is the {animal}." and "Hee hee! The {animal} does not want that." per animal, "Look at all the things you made today!", "Thank you, Princess Emma!".
- **Rewards and flow**: "Look! New stickers for your book!", "First try! A shiny sticker!", "Your wand is stronger! Look, a new gem!", "Later!", "Do you want to make more magic? Tap the wand. Or tap the moon for bedtime.", "Come back tomorrow for more magic!", "Tap Play to make magic!".

**Per word (34 in the demo, about 150 in the full game)**:
- the dictation clip ("A hat. Hat.")
- the word alone ("Hat.")
- an exclamation ("A hat!")
- Sizzle's note words get "Yes, the note says cup." and "Oh no. That is a cap."
- party things get "Yes! The pig has a hat!" for each of the 3 animals

The slow word clip is dropped, because hint step 2 now uses the blend engine.

**Names**: 6 name clips and "Do you like the name {name}?" for each, which are loaded for the naming wheel. Each name also has 9 whole lines ("Hello, Bop!", "Bop is hungry.", "Bop is cold.", "Bop is thirsty.", "Bop wants one too.", "Bop is sleepy. Night night, Bop.", "Bop missed you!", "Look! Bop is growing!", "One {thing} for Bop!"). Only the chosen name's lines are loaded. Name clips play straight after her blend, so they go through the same sign-off as the phonemes.

**Numbers and tricky words**: zero to ten in the demo (to twenty in the full game). Numbers are only spoken at M1, in tap-to-count hints and in Pippa's number demo. The demo heart words are put and the.

**Letter sounds** (19 in the demo: s a t p i n m d g o c/k e u r h b f l; ck ff ll ss reuse; about 44 in the full game). The pronunciation target is the school programme (Little Wandle by default).
- Each sound has a **tap** clip of 150 to 400 ms.
- **Stretchy** consonants (s m n f l r) also have a **hold** clip with a loopable steady middle of 80 to 120 ms.
- **Bouncy** sounds (stops and, by default, short vowels) are never looped. If her finger rests longer than 600 ms, the sound plays once more ("a-a"). A held short vowel ships only if it passes the ear test for that vowel.
- **Route A (automatic)**: every sound is cut from Elizabeth carrier words using ElevenLabs forced alignment and a manual trim.
  - Stop sounds come from the start of "tap", "bun" or "dog", cut just before the vowel.
  - Vowels come from vowel-initial words (apple, egg, it, on, up). /a/ is the apple vowel, not "ah". /o/ is the on vowel, not "aw".
  - Stretchy consonants are cut from carrier words, not from typed "ssss" or "mmmm".
- **Route B (speech to speech)**: a native British English speaker (a hired voice actor or a British teacher, not Tjitse) records each pure sound following the programme's pronunciation guide. ElevenLabs Voice Changer turns it into Elizabeth.
- **Route C**: if Voice Changer adds a vowel or artifacts to a sound, the speaker's own recording is used, matched in loudness. A correct sound in a second voice is better than a wrong sound in Elizabeth's voice.
- **Sign-off page** `audio/check.html`: one row per sound with routes A, B and C, a picture word, the programme's pronunciation video for that sound as a reference (linked, never shipped), and "good" or "redo". It also has one row per demo word and per name to test the blend. If possible, Emma's teacher listens to it, otherwise Tjitse compares each sound with the reference video. Approvals are saved to `audio/review.json`. The game build refuses any sound that has not been approved.

**Blend engine (Web Audio)**:
- When her finger enters socket zone *i*, phoneme *i* starts. A stretchy sound loops its steady segment while her finger stays in the zone. A bouncy sound plays once into the next sound. A 30 to 60 ms crossfade joins the sounds.
- A slow finger gives "sssuuunnn" and a fast finger gives "sun". If she lifts her finger part way, the sound stops and "Slide all the way to the star." plays.
- After the star: a 300 ms pause, then the whole-word clip, but only for dictionary words. Non-words get the fizzle.
- The same engine drives the slide under Sizzle's note, under each word of the Queen's note, under grey sticker words, and the stretched word in hint step 2.
- If the looped blend fails the ear test: for target words, scrub a time-stretched whole-word clip by its segment boundaries. Non-words then get separate pure sounds.

**Effects and music** (ElevenLabs sound effects and music, with Web Audio placeholders until they are generated):
- **Wand and gems**: gem snap, wand-full chime, slide shimmer loop, thing-appears whoosh, pink fizzle, bug buzz.
- **Visitors**: knock, window creak, quack, bleat, unicorn whinny, little dragon puff, water spill.
- **Bobbin**: squeak, munch, yawn, giggle.
- **Maths**: number stone clunk, hats flying, nut rolling, bag pour, hole sparkle, hedge rustle.
- **Notes**: note unroll, shelf slide.
- **Rewards**: Golden Scroll shimmer, wand upgrade fanfare, party fanfare, confetti, sticker fly-in, shiny sparkle, page turn.
- **Music**: a soft tree house loop that ducks under speech, and a lullaby for bedtime.

In total the demo has about 400 short clips. They are decoded per scene (about 60 at a time), not all at Play, to keep memory and start-up time low on older iPads.

## Risks

- **Phoneme and blend quality.** This was v1's biggest failure. The audio spike is its own deliverable and comes first: 19 sounds, the 6 names and the blend engine on 5 words (sun, mop, bun, hat, pig), with the sign-off page, tested on a real iPad, before any art. Ship nothing that is not approved by ear against the programme reference. A wrong sound is worse than no sound.
- **Finding a native speaker for Route B.** If no voice actor or teacher is available, only sounds that pass Route A can ship. A word with an unapproved sound stays out of the pool.
- **iPad audio latency.** Finger and sound can drift on Safari. Decode each scene's buffers before the scene starts and schedule ahead of the finger. Test on the device, not only in WebKit emulation.
- **Mismatch with school.** A different grapheme order, other sound names or other tricky words would confuse her. Ask the school which programme it uses before building levels beyond the demo.
- **Dutch first-language interference.** Final voicing, a/e, u/o, v/w and j are real errors, not careless ones. Bring them in late, track them separately, and do not let them block a level-up on their own.
- **Unknown vocabulary.** A word she cannot name makes the check unfair. The rules that protect against this: one clear picture per word, confusable pictures never in the same scene, shelf and pets named aloud, and note words only after she has met them as a spoken wish. The parent corner shows words she never gets right, which may be vocabulary gaps.
- **A high first-try bar can feel hard.** Fast-climb placement, the easy warm-up, plain stickers for every finished word and quiet down-steps protect her mood. Watch her first sessions. If she gets upset, make the down-step 1 out of 4 instead of 2.
- **Sizzle's note or the Queen's note feels like a quiz.** Every wrong pick has a funny result in the world. If it still feels like a quiz, run Sizzle's note every second round.
- **Round length.** Time a real round on the iPad. Drop the Golden Scroll first, then shorten the read-back.
- **Overlap with Unicorn Egg Nest and Fluffle Nursery.** All three now have naming and caring. Here the Bobbin stays secondary: one need per session and no stat bars. It is not a unicorn foal and not a Fluffle. Decide later whether one creature should travel between games.
- **Trademark on the pet name.** "Puffkin" was dropped because Puffkins was a 1990s plush toy line. Check "Bobbin" on the register before the full game.
- **Art volume.** About 150 things plus visitors in the full game. The demo needs 34 things, 5 creatures, the Queen's 3 pets and the Bobbin in one simple inline-SVG style. A picture that could mean two words breaks the check.
- **Lost save.** Losing the Bobbin and the book would hurt a child who loves collecting. In the full game use the Home Screen install and the server save. The adult check on reset protects the demo save from Emma herself.
- **Portrait play.** Scaled to portrait, the gems and stones would fall below 64 px. The game locks to landscape and shows a "turn the iPad" picture in portrait.

## Demo scope

The audio spike is built first, as its own deliverable in `ideas/<v2-slug>/audio/`: the generation script, 19 phonemes, 6 names, the blend engine test on 5 words, `check.html` and `review.json`. The game demo starts only after the spike's sounds are signed off.

The demo is a single self-contained `ideas/<v2-slug>/index.html` (inline SVG and JS, Andika font from Google Fonts) with `README.md` and the `audio/` folder. It plays at 1180 x 820 landscape, scaled to fit. Gems are 104 px and stones 72 px, so they stay above 64 px at 1080 x 810. In portrait it shows a "turn the iPad" picture. It is tested with `playwright-cli` at 1180 x 820 and 1080 x 810 for play, and at 820 x 1180 for the turn screen.

**The demo contains:**
1. **Start screen**: Play button and sticker book button with badge. The tap unlocks audio and decodes the first scene. If clips are missing, a parent screen lists them. There is no TTS.
2. **First-session flow**: wand gift, sock basket, Bobbin colour pick (3 swatches), the naming wheel (b/f/t, i/o, p: Bip, Bop, Fip, Fop, Tip, Top) with heart or round arrow, Pippa's turn on "mat", and Pippa's first number stone.
3. **Bobbin warm-up**: one easy review word. The blank ghost-gem hand appears in the first session only.
4. **Round 1, Mrs Duck**: wish (hat, rug, bun or cup, each with its own need line), then the M3 count with stones 1 to 10, 3 to 7 scattered ducklings and 1 or 2 hidden newcomers. It includes the too-few and too-many outcomes and the reset before each retry.
5. **Round 2, Grandpa Goat**: wish (nut or bun), then the M4 bag-and-tray with a numeral from 3 to 8 on the bag and stones 0 to 10.
6. **Sizzle's note** every round: a B1 word she has met, sound buttons, slide under the word, a named three-thing shelf, a visible result for each wrong pick, swap and reshuffle, and the ending after two misses.
7. **Golden Scroll with Dot**: an S2 word one sub-step up (8 gems, no red vowels), offered at most once per session after two first-try wishes in a round, never in the first session, and declinable.
8. **The Queen's tea party**: an R1 note ("Put the {thing} on the {animal}." with heart words put and the, pets pig, dog and cat). It includes slide-to-blend under each decodable word, wrong-thing and wrong-animal results, the ending after two misses, the read-back and the crown.
9. **Book and bedtime**: new stickers wobble, plain and shiny frames, locked slots with grey words and slide-for-sounds, the wand-or-moon choice after round 1, and bedtime after round 2 with "Come back tomorrow".
10. **Word pool**: 34 words from S1 to S3, each with its own SVG, drawn fresh each round with no repeats within a session and no confusable pairs in one round. Racks have 6 gems with 2 or 3 vowels, close distractors from taught graphemes only, no same-sound spellings, and red vowels at S1 and S2. The same-sound response is built in as a safety net.
11. **Full wish hint ladder** (6 steps, ending in a finished word and a plain sticker), the note hints and endings, and maths hints 1 to 4. No hint lights an answer before the final two-choice.
12. **First-try tracking** per strand with the saved 4-item window and level moves. A wand upgrade animation, with Pippa showing "sock", fires on reaching S3.
13. **Parent corner** (two-finger hold on the crown for 3 s): levels per strand, missed graphemes and words, the level setter, and reset save behind "7 × 8".
14. **Save in `localStorage`** (`pww2-save`), with the contents listed under Saving. No Leitner boxes.
15. **Blend engine** with loops for stretchy sounds, a bounce for bouncy sounds, crossfades and the slide-to-the-star rule.
16. **`window.__game` hooks**: `spell`, `skipTo`, `fast`, `setLevel(strand, level)`, `upgradeWand(level)`, `forceItem(id)`, `state` (including `hints` and `windows`) and `resetSave`.

**Audio shipped with the demo**: about 90 fixed lines, 34 words × 3 clips plus the note and party word lines, 6 names with their lines, numbers 0 to 10, 2 heart words, 19 signed-off phonemes (tap, plus hold for stretchy sounds), and the effects listed above. About 400 clips in total.

**Full game only (not in the demo)**:
- S4 to S6 and their wand upgrades, the spelling-choice sub-step, B2 and B3, R2 to R4, and M1, M2, M5 and M6 as starting levels.
- About 150 stickers and all themed pages.
- Page-complete Queen visits and their rewards, the Bobbin wardrobe and growth stages past "small".
- Olly's daily parcel, Hettie and other new visitors over time, and the calendar stamps.
- Leitner spaced repetition across days.
- The Home Screen install and the server-side save on odin.

## Rejected critique

- **Critique 9, alternating Sizzle's note with Grandpa Goat: partly rejected.** I alternate the two maths visitors (Mrs Duck in round 1, Grandpa Goat in round 2) and keep Sizzle's note in every round. The note is the only item that checks blending of a written word. Dropping it every second round would halve that data, and with a 4-item window the blending strand would almost never move. The round still has the shape the critique asked for: the Bobbin, one visitor, one reading task and the party, at about 4 minutes. The session cap of 2 rounds is accepted.
- **Critique 18, "too big for one HTML file": partly rejected.** The repo rules ask for one `index.html` per idea, so the demo stays one file plus an `audio/` folder. The scope is cut as suggested: the audio spike comes first as its own deliverable, 6 names, only the chosen name's lines are loaded, clips are decoded per scene, there are no Leitner boxes, and the growth threshold is 10 words. The parent corner stays, because Tjitse needs the level setter after talking to the school.
- **Critique 19, "rename to Fluffin": the rename is accepted, but not that name.** "Fluffin" is too close to the Fluffles in Fluffle Nursery, which adds to the overlap risk. The pet is now a "Bobbin", and that name still needs a register check.