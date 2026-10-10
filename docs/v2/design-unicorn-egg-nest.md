# Unicorn Egg Nest v2: lead design

## Core fantasy and role

Emma is the **Nest Keeper of the Moon Meadow**. The Unicorn Queen sends eggs down on moonbeams. Emma warms each egg until it hatches, names and spells the baby, cares for it, tucks it into bed, and keeps every baby in her Nest Book. The herd stays and grows from one night to the next. Role play, fantasy, naming, nursing and collecting were what she loved, so they are the spine of the game. Reading and maths are how each of them works. Free care and free play also stay, outside the checked steps.

- **Guide on screen: Queen Lumi**, a silver unicorn with a small crown, voiced by Elizabeth. She stands bottom left and her mouth moves when she talks. Her horn casts a **moonbeam spotlight** on the area Emma should touch next, and that area has a pulsing gold outline. On a step with one target (the crown badge, the slider, a slot) the spotlight covers that target. On a choice step it covers the whole basket, pantry or row of bushes, never a single item. Tapping Lumi repeats the current instruction. The owl and Lady Moon were not chosen: Emma likes queens and unicorns, and a unicorn queen is both.
- **Emma's role is visible.** In the first session Lumi gives her a Nest Keeper crown badge (top left). The badge opens the Nest Book.
- **One goal per screen, always a picture.** Eggs: cold cups that must all turn warm. Naming: empty gem slots and a name bell. Wishes: a wish cloud with a picture of Pip pointing at it, and a pantry. Bedtime: bushes with signs and an empty moss bed.
- **No punishment.** Babies never get sick, sad or lost. If Emma skips days, the babies run to the fence when she comes back.
- **Words for the goal.** The game uses warmth only: cups are "warm" or "still cold", and the egg can be "too hot". There are no light words ("lit", "light up", "glows"). Reading steps never say "read". They say "Look at the letters."

| Feedback point | Where v2 answers it |
|---|---|
| The speech was bad (browser TTS) | All speech is pre-generated Elizabeth audio, played through Web Audio. `speechSynthesis` is removed. A missing clip plays silence and logs a warning. |
| The letter sounds were bad | A 1-hour spike on the 8 riskiest sounds comes before any game work. Pure sounds are recorded by a native British speaker. Speech-to-Speech converts them to Elizabeth only where it keeps the sound intact. Stops that it damages use the human recording directly. Every clip is checked by ear before it ships. See Audio needs. |
| Role play, fantasy | Queen Lumi, the crown badge, eggs sent by the Queen, the Royal Nest Keeper milestone. |
| Naming | Emma picks a name from name bells, or makes her own name with the gold bell. She builds it with gems. The name gets a crowned capital on its tag. |
| Nursing | Uncapped play time with the herd every night (brushing, cuddles, treats, tricks), wishes, tucking in at bedtime, hearts and growth across sessions. |
| Collecting (from the Pippa feedback) | Nest Book sticker pages, wish stickers, shiny babies, speckled and golden babies, the star jar, Queen's gifts. Nothing is wiped. |
| "Say the word, let Emma focus on the letters" (Pippa) | Naming works exactly like this: Lumi says the chosen name, and Emma slides in the letters. |
| Unclear goals (Queen Emma's Letters) | One spotlighted area per step, Lumi on screen, warmth words only, no "read". The speaker button replays the instruction. |
| Too easy, no real maths or reading (Moonbeam) | No counting aloud, stones that cannot be matched by shape, no blending done for her, a vowel-only distractor on every pantry, a reshuffle after every miss, first-try rewards, and adaptation that moves her up on first-try results only. |

## The round

One night lasts about 4.5 minutes of timed play. Play time (step 7) is extra and has no limit. All lines are Elizabeth as Queen Lumi unless marked. *(First time)* lines play only the first time that step appears. No line uses "she" or "he" for a baby.

**Night 1 and later nights**
- Night 1: one plain egg, the new baby's wish, one bedtime find.
- Night 2 onward: one egg chosen from two (speckled or golden), a wish from an older baby, two bedtime finds.
- Every night: play time with an optional "One more egg?".

**Shared rules for every step**
- The spotlight and gold outline show the target area. The speaker button and a tap on Lumi replay the instruction only. They never show the answer.
- The ghost hand shows a gesture once, the first time that gesture appears, and only on an object that is not the answer.
- Idle time is 15 s. It resets on any tap of a sound dot, gem, letter, picture or slider.
- Hint ladder:
  - 15 s idle: the goal is repeated.
  - 1 miss, or a second idle: a focused hint.
  - 2 misses: the ghost hand shows the answer, and the result counts as "helped".
  - Idle never goes past the focused hint. Only real attempts unlock the answer.

**0. Start (5 s).** A big egg with a play triangle. The tap unlocks audio, decodes the letter sounds into Web Audio buffers and starts the night music.

**1. Arrival (15 to 30 s)**
- First session:
  - "Hello, Emma! I'm Queen Lumi."
  - "My unicorn eggs need a Nest Keeper. Will you help me?"
  - The crown badge pulses and Emma taps it. "Here is your crown. You are my Nest Keeper now!"
- Later sessions: the herd runs to the fence, each baby at its growth stage with its name tag.
  - "Welcome back, Nest Keeper! Your unicorns missed you."

**2. The egg (about 40 s on night 1, about 50 s with the choice).** A 2 x 5 frame of ten moon cups sits under the nest. The moon has already warmed some cups (warm gold, with a small flame). The basket holds 4 stones. Each stone shows its number as dice dots or a loose scatter, never in a ten-frame layout, so she cannot match the shape of the cold cups.
- Night 1: a plain egg slides down a moonbeam. "Here comes an egg. Ooh, it's cold!"
- Night 2 onward: two eggs float down. "Two eggs tonight! A speckled egg, or a golden egg? The golden egg is tricky!" She taps one. The speckled egg is at her current level and hatches a speckled baby, which only speckled eggs give. The golden egg is one level higher, hatches a golden-maned baby and puts two stars in the jar.
- "Make every cup warm, and the egg will hatch." The cold cups pulse once.
- "Pick one stone."
- *(First time)* The ghost hand lifts a wrong stone, carries it halfway and puts it back. This shows dragging only.
- When a stone lands, its dots fly into the cold cups one by one in the stone's colour, each with a rising chime. **Nothing is counted aloud.**
- Exactly full: "Every cup is warm!" Then the bond in visual order (warm cups first): "Four and six make ten!"
- Too many: the extra dots bounce off and hang red above the frame, so she can see how many. The egg gets red cheeks and steam. "Too hot! Two too many." Then "Try a smaller stone." The stone rolls back.
- Too few: the cold cups stay dark and frost creeps over the egg, which shivers. "Brr! Three cups are still cold." Then "Try a bigger stone." The stone rolls back.
- Hints:
  - Focused hint: "Let's count the cold cups." The ghost finger touches each cold cup while Lumi counts. Emma still picks the stone.
  - After 2 misses: the ghost hand moves the right stone.
- **Two-stone eggs (M3).** Six stones in three pairs that make ten, so every first pick has a partner in the basket. "This egg needs two stones. Together they make every cup warm." After the first stone: "Now one more stone." The other stones make 9 or 11 with the first. On a wrong second stone, only that stone rolls back.
- **Blanket eggs (M4).** A blanket covers the frame. "The blanket hides the cups. Seven cups are warm already. Which stone makes ten?" Focused hint: "Let's peek under the blanket." The blanket lifts and the step continues as a missing-piece egg.

**3. Hatch (10 s)**
- The egg wobbles, three cracks appear, then the burst, shards and fanfare.
- "It's hatching!" Then "A baby unicorn! Hello, little one."
- If the egg hatched first try with no hint, the baby is **shiny**: a sparkle mane and a star in the book. Lumi only says "Ooh, a sparkly one!" She never mentions that a baby is not shiny.

**4. Name and spell the baby (about 60 to 90 s)**
- The baby holds up three name bells and one gold bell. Each name bell has a little unicorn face and no text. The gold bell has a crown.
- "Your baby needs a name. Tap a bell to hear a name."
- Each bell rings and says one name: "Pip." / "Sam." / "Dan." The names come from her current level or lower, and no two bells in a set differ by just one sound.
- A small name tree can be shaken twice for three new bells: "More names!"
- Emma drags her favourite bell onto the baby.
  - "Pip! Lovely."
  - "Let's write Pip on the name tag. Listen: Pip."
- **Phoneme frame.** Slots appear, one per sound:
  - Blue slots for consonants, pink slots for vowels.
  - Twin-outline slots for two-letter graphemes and for one letter with two sounds (ss, ll, ff, ck, and later x and qu).
- The tray holds 7 or 8 gems: the target graphemes plus planned distractors. A gem fits any slot of its colour. Tapping a gem plays its sound and shows a small picture card ("p" with a pan).
- The tray never holds a second spelling of a sound in the target. A name with k has no c or ck in its tray, and a name with c has no k or ck. The tray also never holds a distractor that would turn the name into a blocked word.
- Wrong colour: the slot shakes. "Pink gems go in the pink slot."
- When the slots are full: "Now slide the star, and listen."
  - The slider plays the sounds of **what she built**. Stretchy consonants (s m n f l r, later v z sh th ng nk) hold while her finger stays on them ("mmm-e-g").
  - Stops and short vowels play once, short.
- Correct: the baby looks up with a "?" bubble, then there is a 2-second pause so Emma can say it first. "Pip! That says Pip!" The baby leaps and hearts pop out. The first gem gets a little crown and flips to a capital, and the tag clicks on reading "Pip".
- Wrong: "Hmm. That says p, i, t." (her own gems, played as sounds and never blended). Then "Listen: Pip." The wrong gem pops out back to the tray, and its slot hums the sound it needs.
- Hints:
  - Tapping the baby repeats the name at any time.
  - After a miss, the name plays as one human stretched take ("p-i-p", "sss-a-mmm").
  - After 2 misses on one slot, the right gem wiggles.
- **Gold bell: make your own name.** "Make any name you like!" Three empty slots (blue, pink, blue) and a tray of her level's gems. She builds and slides the star. If the result is on the approved name list, Lumi says it: "Tam! What a lovely name!" and the tag clicks on. If it is not on the list: "I don't know that name. Try other gems!" She can change gems or go back to the bells. This is never checked or logged as a miss.
- "Off you go to the meadow, Pip!" Pip prances in. The progress egg at the top turns into a baby.

**5. A wish (about 40 s)**
- Night 1: the new baby has the wish. Later nights: an older baby trots over with the wish, so the herd stays part of the night.
- A wish cloud pops up over Pip. It shows one printed word with sound dots under it and **no picture**. The pantry below is a small scene with 8 to 12 items on shelves and hooks.
- Line by word type:
  - Food (from R2): "Pip is hungry! Look at the letters. What does Pip want?" Pip rubs its tummy.
  - Other items: "Pip wants something! Look at the letters. What does Pip want?" Pip points at the cloud.
- *(First time)* The ghost hand slides under the word, so she learns that the letters talk.
- Tapping a letter plays its sound. Sliding along the dots plays the sounds in order. **The word itself is never said before she gives an item.**
- Tapping a pantry item says its name ("A pin."). Emma is learning English, so she can check she knows every item. She still has to look at the letters to know which item Pip wants.
- Right item: Emma drags it to Pip. Pip uses it (cooks moon pancakes in the pan, wears the pin in its mane), and a sticker of it flies to Pip's page. "A pan! Lovely!"
- Wrong item, first miss: something funny happens in the world. Pip balances the pin on its nose and giggles. "A pin? Hee hee!" The cloud stays. "Look at the letters again."
- Wrong item, later misses: Pip shakes its head with a jingle and the item goes back. The funny reaction plays once per wish, so a wrong give is not a game in itself.
- After every miss the items tumble to new places in the pantry.
- Hints:
  - Focused hint: the sounds play slowly ("p... a... n"). She still has to blend.
  - After 2 misses: the human stretched take ("p-a-nnn"), then the ghost hand points at the pan.
- **Free care (about 10 s).** "Pip loves a cuddle." Emma can brush the mane (sparkles) or tap for a cuddle (hearts). Then Lumi moves on. Longer care happens in play time.

**6. Reward (about 30 s)**
- A shooting star crosses the sky. "A new baby! Your family is growing."
- The Nest Book opens and the new page gets its sticker, with a peel and press sound.
- The star jar fills with tonight's stars, one per first-try success. "You got three moon stars tonight!"
- **Jar full** (5 stars for the first jar, 10 after that): "The jar is full! A present from me."
  - The Queen's chest shows 3 gifts, each with a word label at her current reading level (R1: map, mat, pin; R2: rug, cot, net; R3: bell, hat, doll). "Look at the letters. Pick a present!"
  - She gets exactly what she picked, and Lumi names it ("A bell! Lovely."). A misread is heard as a mismatch, but it is never marked wrong.

**7. Play time (no limit, not timed)**
- "Play time! Tap the moon when it's bedtime."
- The whole herd is in the meadow. Emma can brush, cuddle, give treats from a treat bag, and tap a baby to make it do its trick.
- Each baby gets at most one heart per night from play time, so growth still comes from the night's tasks.
- A small egg sits in the nest: "One more egg?". It runs steps 2 to 4 and adds to the herd. **Nothing is ever wiped.**
- If she does not touch anything for 60 s, Lumi says once: "The moon is getting sleepy. Tap the moon for bedtime."

**8. Bedtime hide and seek and goodnight (about 30 s on night 1, 45 s later)**
- The moon rises and a moss bed appears on the right.
- "The moon is high. Bedtime, babies!" The babies run behind 4 bushes.
- "Oh! They are hiding. Look at the letters on the signs."
- Each bush has a name sign with sound dots, written the way the tag is: crowned capital, then lowercase ("Pip"). Tapping the crowned letter plays the same sound as its lowercase gem. Behind the bushes are Emma's babies plus visiting cousins. Cousin names come from a hand-curated list at her current level, differ from the target by one sound, and are never wish words (Pip with Pim, Tip and Sip). The babies are fully hidden, so no mane colour shows.
- "Where is Pip?" is one natural clip per name.
- Wrong bush: that baby peeks out. "Tip! Not me!" Then every baby swaps bushes with a rustle. "They moved! Where is Pip?" The target is never the last sign left.
- Right bush: "Hello, Pip!" Emma drags Pip to the bed. Pip curls up and gets a heart. "Night night, Pip."
- Night 2 onward: then one older baby.
- Goodnight: a first-try bedtime star drops into the jar. "Well done, Nest Keeper. Night night. See you tomorrow!"

**Timing.** Night 1: 5 + 30 + 40 + 10 + 90 + 40 + 30 + 30 s is about 4.6 minutes, at a 6-year-old's real pace for naming. Night 2 onward: 5 + 15 + 50 + 10 + 60 + 40 + 30 + 45 s is about 4.3 minutes. Play time and the extra egg come on top and are her choice. The demo has a debug timer per step that logs real times. If a timed night passes 5 minutes, the next night skips the wish from the older baby first.

## Reading

**Skills**
- Grapheme to pure phoneme, Phase 2 to 3 (every gem tap, every slider, every sound dot).
- **Segmenting to spell:** naming. The game says the word and Emma finds the letters.
- **Blending to read:** wish clouds and bedtime signs. She sees print, hears only separate sounds, and joins them herself.
- **Reading for meaning:** the word decides what she gives.
- **Capital letters for names:** every tag and sign shows the crowned capital, linked to the lowercase gem she placed.
- Later (full game): two-word phrases, tricky words, sentences that need understanding.

**Grapheme ladder** (Letters and Sounds order). Before building, ask the teacher which SSP programme Emma's school uses and swap in its order.

| Level | Graphemes |
|---|---|
| R1 | s a t p i n m d |
| R2 | + g o c k ck e u r |
| R3 | + h b f ff l ll ss |
| R4 | + j v w x y z zz qu ch sh th ng nk |
| R5 | + ai ee igh oa oo ar or ur ow oi ear air er |
| R6 | CVCC and CCVC words from R1 to R5 |

**Wish words.** Wish targets use only graphemes taught at or below the level. Pantry distractor pictures do not need to be decodable, because she reads only the cloud. All items are pictureable and clearly different at 72 px. No synonyms share a pantry (cup/mug, hat/cap, rug/mat).

| Level | Wish targets |
|---|---|
| R1 | pan, pin, tin, map, tap, mat, ant |
| R2 | cat, dog, pig, cot, sock, duck, hen, net, pen, nut, cup, rug, sun, pot, mop, top |
| R3 | bun, tub, hat, bib, bell, doll, fan, fig, lid, log, bag, bus, bug |
| R4 | jam, jug, van, web, box, fox, zip, ship, dish, chick, ring, king |
| R5 | rain, bee, moon, boat, coat, star, jar, fork, horn, cow, coin, chair |
| R6 | plum, nest, milk, drum, lamp, tent, crab, frog, flag |

**Baby names** (curated, checked by ear and read once by Tjitse; nothing is generated at runtime)
- R1: sam, tam, pam, pat, tim, nim, mim, pip, sid, dan, tad, sim, pim, mip, tan
- R2: dot, tom, pod, gus, meg, ted, kip, ken, ron, rem, dom, kit, cam, tig, peg
- R3: ben, fen, lin, tess, nell, rob, liss, bill, hal, fin, bess, biff, raff, hob, lil
- R4 and up: fizz, jet, rex, ash, chip, wing, and later plum, frost, twig, fluff
- Bells draw from every level at or below the current one, so the pool grows with her. At R1 there are 15 names, enough for three bell sets per night with no set differing by one sound.
- Rules:
  - No name is also a wish word at or below the current level (this drops bun, fig and bell).
  - No name in the herd is a duplicate. Names of unicorns in Castle Fields stay reserved.
  - No name contains both b and d.
- **Own-name list:** about 200 safe CVC names and words that can be built from R1 and R2 gems, for the gold bell. Same blocklist and review.
- **Blocklist:** tit, zit, nit, bum, nob, poo, pom, fat, mad, bad, sad, dad, mum, kid, kill, sex, dick, cock, fuck, piss, cum, fag, git, sod, gob, puss, suck, shit.
- **Automated check (in the build script):** for every name, cousin and own-name entry, list every one-sound neighbour. Any blocked neighbour is flagged for Tjitse, and the tray planner then never offers the gem that makes it. Names whose neighbour is too close to remove this way are dropped (rick, for dick).

**Letter case:** lowercase gems, wish words and labels. Names get a crowned capital on tags and signs, made by Emma's own first gem flipping on success. Full capitals come later as a separate step ("crown letters").

**How each moment is checked**

| Moment | Direction | Check | First-try measure | Log |
|---|---|---|---|---|
| Naming | Spoken name to letters | Every slot must hold the target grapheme. It is checked by reading back what she built. | All slots right on the first read-back | Spelling |
| Wish | Print to meaning | Only the matching item is accepted | Right item on the first give | Reading |
| Bedtime | Print to the spoken name | Only the matching sign | Right sign first | Reading |
| Queen's gift | Print to choice | Not checked. She gets what she picked. | Logged only | None |
| Own name | Free building | Accepted if on the approved list | Logged only | None |

**Why guessing does not pay**
- **Naming:** 7 or 8 gems for a 3-sound name gives roughly 1 chance in 60 of a random correct spelling. Distractors are planned:
  - m/n, t/d, a/i at R1; then b/p, e/i and a/u
  - Dutch-interference pairs: f/v, w/v, j/y and final d/t
  - b and d in the same tray only from R3.
  - Never a second spelling of a target sound (c, k, ck).
- **Pantry** (8 to 12 items). Every pantry holds at least one picture that differs from the target only in the vowel (pan with pin, tap with top, map with mop, cat with cot, cup with cap, bag with bug, hat with hut). It also holds one item that shares the onset and one that shares the ending. First letter plus last letter never works on its own. At R1 only pan, pin, tap and map have such a pair, so R1 wishes favour those four.
- The a/e contrast (pan, pen) is held back until R3. From R3 every pantry includes one a/e pair, logged separately, because Dutch speakers merge /æ/ and /ɛ/.
- **Reshuffle** after every miss (pantry and bushes), so she cannot work through the options in a fixed order.
- **No answer before action:** the slider plays sounds only and never the blended word. The wish word is spoken only after she gives an item.
- **Cousins with close names** at bedtime, so the first letter or memory of the name is not enough.
- **First try is what counts.** Only first-try results move her up. Guessed or helped results still move the game on, so she is never stuck.

## Maths

**Skills:** subitising 1 to 6, counting on, more and fewer, number bonds to 10, missing addend, bonds within 10 (7, 8, 9), taking away, teens on a twenty-frame, doubles and halves.

**Egg ladder** (each step first with dot stones, then dots plus a numeral, then numerals only). Stone dots are dice patterns or loose scatters, never ten-frame layouts.

| Level | Task | Example | Options |
|---|---|---|---|
| M1 | Match the egg's numeral | Badge 6, pick the 6-dot stone | 4 stones: target, ±1, one far off |
| M2 | Missing piece, frame visible | 4 cups warm, pick 6 | 6, 5, 7, and 4 (the shown number, a common mistake) |
| M3 | Two stones make 10 | 6 stones | Three pairs that make 10. Non-partners make 9 or 11. |
| M4 | Missing piece under a blanket | "Seven cups are warm already" | Target, ±1, the shown number |
| M5 | Small nests of 7, 8 or 9 cups | 8 cups, 3 warm, pick 5 | Same rule |
| M6 | Snow stones (taking away) | 9 warm, needs 6, pick snow 3 | Target, ±1, and 6 |
| M7 | Golden twenty-frame | Has 10, needs 13. Later 8 + ? = 13. | Target, ±1, ±10 |
| M8 | Twin eggs (doubles, halves) | Each twin needs 4, so share 8 | Target, ±1, 4 |

**Berry wishes (full game, later nights).** An older baby wants berries. "Meg is hungry." "Seven moonberries, please!" The cloud shows the numeral only from M2 (dots only at M1). Emma taps berries into a bowl, which fills in rows of five with a tick sound and no voice. She drags the bowl to Meg to commit. Meg counts aloud while eating, as feedback after the commit:
- Exact: "Five, six, seven! Just right."
- Too many: "Seven, eight. Oh! One too many." The extra berry rolls back.
- Too few: "Five, six. Still hungry!" Then "Seven moonberries, please!"
- Later steps: the bowl already has k (counting on), or the bowl has 9 and Meg wants 6 (taking away).

**How it is checked:** only an exact fill hatches. The egg's mood shows the size and direction of a mistake. Red overflow dots show "too many", cold frosted cups show "too few", and Lumi names the difference ("Two too many.", "Three cups are still cold."). This is the start of counting on and counting back.

**Why it cannot be guessed cheaply**
- **No counting aloud before she commits.** Dots warm with a chime pitch ladder only. The only spoken counting is the focused hint (cold cups) and the baby eating after the commit.
- **No shape matching.** Stones never use the ten-frame layout, so the cold cups cannot be matched by shape.
- The bond is said once, after success, in the order she saw it.
- 4 stones with near misses gives a 25% blind first try. Hot and cold feedback makes narrowing down a more-and-fewer task, not a lottery.
- On two-stone eggs every first stone has a partner, so the first-try result measures the bond, not luck.
- Targets and stones are drawn fresh every night.
- A first-try hatch gives a shiny baby and a star. A guess costs both. Adaptation only uses first tries.
- The free-fill egg is gone, and so are the answer demos on idle and on the speaker button.
- The `canMake` and `unstick` checks stay, so a hint never shows a move that cannot finish the egg.

## Difficulty and adaptation

- **Two ladders**, Reading (R) and Maths (M), saved across sessions. Reading keeps two logs, spelling (naming) and reading (wish, bedtime). Each checked moment is logged as first try, after misses, or helped. A focused hint or the shown answer counts as helped. Tapping sound dots or pantry names is normal reading and does not count.
- **One rule, demo and night 1 included:**
  - M steps up after 3 first-try results in a row.
  - R steps up when both the spelling log and the reading log show 3 first-try results in a row.
  - Either ladder steps down after 2 helped results in a row (for R, in either log).
  - A golden egg is a next-level item. A first-try golden hatch moves M up by one.
  - A new level starts with its easiest form: dots before numerals, visible frame before blanket.
- **Placement:** before night 1, Tjitse asks the teacher which phase Emma is on. She starts at R1 if she is in Phase 2, R2 if she is at the end of Phase 2, R3 if she is in Phase 3. Maths starts at M2.
- **Full game rule:** a rolling window of the last 8 first tries per log, aiming for 75 to 85%. Step up at 7 of 8, with at least 8 items at the level. Step down at 5 of 8 or fewer. Missed graphemes, words and bonds go into a Leitner box, so they come back next night.
- **Within a night:** after 2 misses on one skill, the next item of that skill is one step easier.
- **Mix per night:** the night-1 egg at the current M level. From night 2, the speckled egg at the current M level and the golden egg one level higher. Wish, bedtime signs and cousins from the current R level. Bell names from the current level or lower.
- **Parent corner:** a 3-second two-finger hold in the top right corner. It shows both levels and first-try accuracy per log. Tjitse can set levels, skip to the next night, and reset. Reset needs a second hold-to-confirm with a 5-second countdown. The full game adds missed graphemes and bonds, a shiny toggle, mute, a second egg tonight, and export and import.

## Collection and rewards

**Per night**
- Each hatch brings a surprise colour scheme, possibly a shiny, speckled or golden trait, and a name Emma chose and spelled herself.
- Each fulfilled wish puts a sticker of that item on the baby's page.
- One moon star goes in the jar per first-try success, and two for a golden egg.

**Across nights**
- **The herd persists.** Every baby keeps its name, colours, traits, hearts and growth stage. The meadow shows up to 12 babies. Grown unicorns move to Castle Fields, which she can visit from the book.
- **Growth without decay.** A wish fulfilled, being put to bed and a cuddle each give a heart. Play time gives at most one heart per baby per night.
  - 3 hearts: the baby becomes a foal, with longer legs and a fuller mane.
  - 6 hearts: it becomes a young unicorn, with a glowing horn and a gold border in the book.
  - Each stage unlocks a trick, in order: buck, spin, rainbow sneeze, fly a loop over the meadow. Calling a baby from its book page (sliding along its name) makes it do its trick.
- **Nest Book (sticker book).** One page per baby with:
  - its portrait
  - its name in gem letters, with the crowned capital
  - its egg type and traits
  - its hatch date
  - its wish stickers
  - its growth stage
  - In the full game, egg types she has not found yet show as silhouettes on a Kinds page.
- **Egg types:** plain (night 1), speckled and golden (demo), then cloud (winged foal), sea (fin tail) and rare star egg as the M level rises. Each first find gets a celebration: "A cloud egg! I've never seen one!"
- **Star jar.** The first jar needs 5 stars, every jar after that 10. Each full jar brings a Queen's gift chosen by its label. The gift kinds come in a fixed, visible order: a meadow decoration, a baby accessory (bow, bell, blanket), a new egg type, a new meadow area.
- **Royal milestone.** After 5 grown unicorns the Queen holds a parade, and Emma becomes **Royal Nest Keeper**. Her crown badge gets a jewel, and from then on she can pick the next baby's mane colour.

## What is kept from v1 and what is cut

**Kept**
- The night meadow, music, moon and fireflies.
- The ten-frame moon cups, with each stone's dots in its own colour and pre-warmed cups for missing-piece tasks.
- The rising chime per dot.
- Egg moods: hot cheeks and steam, frost and shiver, and the wobble, crack, burst and confetti sequence.
- `unicornSVG(c)` with random colours, blinking and the head tilt. It is extended with traits (sparkle, speckles, golden mane) and growth stages.
- The gem tray: blue consonants, pink vowels and colour-locked slots, plus new twin gems for ss, ll, ff and ck.
- `attachBlend`. It now holds only stretchy consonants under the finger, plays only what was built, and never says the blended word first.
- Bushes, rustle and peek-and-hide, now with 4 bushes, cousins and a reshuffle on every miss.
- The tricks (buck, spin, rainbow sneeze), now unlocked by growth instead of fixed per baby index.
- The hint machinery: `canMake`, `unstick`, `demoEarned`, `ghostMove` and the idle loop, rewired to the hint ladder at 15 s.
- The `say` / `sayQueued` pipeline and `buildLines()` mirrored to `lines.json`, now playing real clips through Web Audio buffers.
- The fixed 1180 x 820 stage, letterbox bands, touch locks, and the `window.__game` hook. The hook gains `wish(word)`, `seek(name)`, `spell(name)`, `setLevel(r, m)`, `seed(n)`, `night()`, `save()`, `load()` and `jar(n)`.

**Cut**
- `speechSynthesis` and the `TTS_PHONEMES` map ("puh", "ah", "aw"). A missing clip gives silence and a console warning, never a wrong sound.
- `HTMLAudio` playback.
- The free-fill egg 1, its answer demos on idle and on the speaker button, and spoken counting of every dot.
- "N glows.", "glows", "light up" and "lit".
- Ten-frame dot layouts on stones.
- Gems playing their sound twice (now once, on drop).
- Free three-gem naming with no check, and the generated 144-name list. Own names now go through the approved list.
- "Where is" spliced with "Zob!". Clips are joined only at sentence boundaries.
- "As in pony" without a picture.
- Mixed case on gems and words. Names now get a consistent crowned capital.
- The 3-bush hide and seek with a forced last pick.
- Fixed stones and answers.
- The three-egg round, and the two-egg night.
- Replay wiping the meadow.
- The moon long press as a parent gesture.

## Audio needs

**Owner and dates (proposed)**
- Owner: Tjitse.
- By 2026-10-14: ask Emma's teacher (a) which SSP programme and phase Emma is on, and (b) whether the teacher or a colleague will record the pure sounds and stretched words.
- By 2026-10-17, if there is no yes: book a native British voice artist and brief them with the programme's own sound videos.
- The phoneme spike runs as soon as the first recordings exist. No game code is written before it passes.

**Pipeline**
- A script in `scripts/` loads `ELEVENLABS_API` from `.env` itself and generates every clip into `ideas/<slug>/audio/`. The key never reaches client code, git or logs.
- Voice settings are fixed (Elizabeth, stability, similarity, style, seed), so every clip sounds like the same person.
- The script writes `audio/manifest.json` and a `review.html` page, where Tjitse plays each clip and marks it approve or redo. The game loads only approved clips.
- Playback is Web Audio only. Letter sounds are decoded into buffers on the Start tap. Speech clips for the next step are fetched and decoded ahead of time.
- Letter sounds are stored as WAV (or AAC with the encoder padding trimmed), so loops do not click. Sustained sounds loop with `loopStart` and `loopEnd` inside the buffer.

**Phoneme spike (1 hour, first)**
- The 8 riskiest sounds: p t k b /æ/ /ɛ/ /ʌ/ /ɒ/.
- Record them human, convert with Speech-to-Speech, and compare both by ear with the programme's videos.
- If Speech-to-Speech drops the burst, adds breath or adds a vowel to a stop, use the human recording for all stops, cleaned and loudness-matched to the Elizabeth clips. A small change of voice on stops is accepted. The same applies to any vowel it shifts.

**Letter sounds**
- Demo: R1 to R3, 23 graphemes and 18 sounds (s a t p i n m d g o k e u r h b f l, with c, ck, ff, ll and ss sharing sounds). Full game: about 45 sounds, adding Phase 3 (j v w x y z qu ch sh th voiced and unvoiced, ng nk ai ee igh oa oo long and short, ar or ur ow oi ear air er).
- **Stretchy sounds** (f l m n r s v z sh th ng, and nk where the scheme stretches it) get a short clip of about 250 ms and a sustain loop of about 2 s for the slider.
- **Short vowels** play once, short. They are not held, because holding them drifts the vowel quality. Confirm with the school's scheme.
- **Stops** (p t k b d g ch j) and h get one short clip with no schwa: "p", not "puh".
- Text prompts ("mmmm", "ssss") are only a fallback for stretchy sounds and must pass the same check. Stops fall back to the human recording.
- Never cut sounds out of words. Never send letters as text.
- Every sound is compared with the school programme's sound videos before approval.
- **Stretched words** ("p-a-nnn", "sss-a-mmm") are recorded as one human take per wish word and per name, with stops short and vowels bouncy, then converted like the sounds. They are not built from separate clips.
- **Picture cards** for gem taps, about 20 words with images for R1 to R3 (pan, ant, tap, insect, nest, moon, dog, octopus, cat, kite, egg, umbrella, rabbit, hat, ball, fan, leaf, and so on).

**Instruction and feedback lines (about 90)**
- Every line in The round, with no pronouns for babies.
- Hint lines: "Let's count the cold cups.", "Let's peek under the blanket.", "Try a smaller stone.", "Try a bigger stone.", "Now one more stone.", "Look at the letters again.", "They moved!".
- First-session lines, the egg choice, the star jar lines, play time, the Queen's gift and the parade.
- 4 to 6 variants each of praise, "Too hot!" and "Brr! Still cold." to avoid repetition.

**Numbers and maths**
- "One" to "twenty".
- "One too many." to "Five too many."
- "One cup is still cold." to "Nine cups are still cold."
- "One cup is warm already." to "Nine cups are warm already."
- Bond lines in visual order: "One and nine make ten." to "Nine and one make ten.", plus the bonds to 7, 8 and 9 later.
- Berry lines (full game) as two sentences: "Meg is hungry." and "Seven moonberries, please!".

**Names**
- Curated names (45 for R1 to R3), 7 clips each: "pip." (neutral, for the bells), "Pip! That says Pip!", "Hello, Pip!", "Where is Pip?", "Night night, Pip.", "Off you go to the meadow, Pip!", and the human stretched take.
- The baby saying "Pip! Not me!" is the neutral clip pitched up, plus a separate "Not me!".
- Own-name list (about 200): one called clip each ("Tam!"), used with whole sentences at sentence boundaries ("Tam!" + "What a lovely name!", "Tam!" + "Where are you?").
- Generate with IPA phoneme tags (a = æ, e = e, i = ɪ, o = ɒ, u = ʌ) where the model supports them. Test 10 names first.

**Wish and gift words (about 45 for R1 to R3)**
- Per word: neutral ("A pin."), happy ("A pan! Lovely!") and question ("A pin? Hee hee!"), plus the stretched take. Shared: "No, thank you.".
- Pantry distractor pictures need only the neutral clip.

**Sound effects (ElevenLabs sound effects; chimes can stay in code):** dot chime ladder, fizz and steam, frost crackle, shiver, wobble, crack, burst, fanfare, munch, sniff, head-shake jingle, giggle, brush swish, cuddle hearts, gem click, gem pop-out, slot hum, crown flip, bell ring, tree shake, pantry tumble, bush rustle, yawn, moss-bed sigh, sticker peel and press, page flip, star clink, jar-full chime, chest creak, shooting star whoosh, the Queen's bells, the growth shimmer, rainbow sneeze.

**Music:** night meadow loop, hatch sting, play time loop, bedtime lullaby, short parade theme.

## Risks

1. **Phoneme quality is still the biggest risk.** Speech-to-Speech keeps the source accent, so a Dutch-accented /æ/ teaches the wrong vowel, and it may damage short stops. The spike decides the route before game work. The teacher, or a voice artist briefed with the school's videos, provides the source. Nothing ships without approval.
2. **School mismatch.** Ask the teacher which SSP programme and phase Emma is on, and align the grapheme order, stretchy and bouncy sounds, the tricky words and the sound articulation with it. If she is past Phase 3, the demo's R1 to R3 content is too easy and R4 must come forward.
3. **Vocabulary rather than decoding.** She may decode "fig" and not know what a fig is. Pantry items say their name when tapped, new words appear in play time the night before they are tested, and misses are logged per word.
4. **Dutch interference** (a/e, final d/t, j/y, w/v, ee and oo at R5). These pairs make useful distractors but are tracked separately, so one pair cannot block promotion.
5. **Naming feels less free.** The gold bell lets her make her own name from the approved list. If she builds names that are not on the list, log them and add the safe ones.
6. **Shiny babies may make helped babies feel lesser.** Never say "not shiny". The full game's parent corner can switch shiny traits off.
7. **Funny misreads become the game.** The funny reaction plays once per wish and costs the star. Check the logs for deliberate wrong gives.
8. **Too much reading or length creep.** The cap is 1 wish, 2 bedtime finds and 1 gift label per night. The debug timer measures real time per step. Skip the older baby's wish first if a night runs long.
9. **Losing the save.** Safari can clear storage after 7 days without a visit. Add the game to the Home Screen, put a two-step reset behind a two-finger hold, and plan export, import and a server save on odin for the full game. Losing the herd would break the whole hook.
10. **Guessing is never fully impossible.** Check the logs after the first sessions. If first-try accuracy sits near chance (8 to 25% on the pantry, 25% on eggs), the level is too high.
11. **Goal clarity has to be watched, not assumed.** If Emma hits the 15 s idle twice at the same step after she has also touched nothing, that step's line or picture needs work.
12. **Herd clutter.** Cap the meadow at 12 babies and keep touch targets at 72 px or larger in stage units.
13. **Review load.** About 900 clips for the demo. Letter sounds are reviewed one by one against the videos. Name and word clips can be reviewed quickly in batches on `review.html`.

## Demo scope

The demo answers three questions per step: is it clear, is it hard enough, and is it fun. It is a single file, `ideas/opus-5-5-unicorn-egg-nest-v2/index.html`, with inline SVG and no libraries. It has a `README.md`, `audio/` (approved clips plus `manifest.json`) and `review.html`, and gets a new row in IDEAS.md.

**The demo contains**
- Start screen, Queen Lumi with mouth movement and the horn spotlight (area spotlight on choice steps), and the crown badge.
- The night-1 flow, and the night-2 flow reached by playing again or by the "next night" button in the parent corner. State is saved in `localStorage`. Every read and write is wrapped in try/catch, and the demo still runs without storage.
- The night-1 egg at M2 (missing piece, 4 dice or scatter stones) with hot and cold feedback, red overflow dots, spoken difference lines and the hint ladder.
- The night-2 egg choice: speckled egg at the current level, golden egg one level up (M3 two stones with three pairs, then M4 blanket with a peek hint).
- Shiny, speckled and golden traits.
- Naming with 3 name bells, the gold own-name bell, a name tree (two shakes), a phoneme frame, a 7 to 8 gem tray with twin gems, the same-sound and blocked-word tray rules, read-back checking, the wrong-gem pop-out and the crowned capital on success.
- The 45 R1 to R3 names listed above, and the own-name list of about 200.
- One reading wish per night at R1 to R3, in a pantry of 8 to 12 items with a vowel-only distractor, a reshuffle on a miss, the once-per-wish funny miss, tap-to-name items and a sticker on success.
- About 10 s of care after the wish, and uncapped play time with brushing, cuddles, treats, tricks and the "One more egg?".
- Bedtime hide and seek with 4 bushes, curated cousins, crowned-capital signs, a reshuffle on every miss, no forced last pick, and the moss bed.
- The Nest Book: pages, wish stickers, trait marks and growth stage.
- Hearts and growth: baby, foal and young unicorn, with tricks unlocked per stage.
- The star jar (5 stars for the first jar), and a Queen's gift picked by label at her reading level.
- Adaptation by the one rule above, with separate spelling and reading logs.
- The parent corner (3 s two-finger hold, top right): levels, accuracy, set level, next night, and reset with a 5 s hold-to-confirm.
- `-webkit-touch-callout: none` and no text selection anywhere.
- A "turn the iPad" picture in portrait. Touch targets at 72 px or more in stage units.
- A debug timer per step, logged to the console.
- `window.__game` with `drop`, `spell`, `wish`, `seek`, `setLevel`, `seed`, `night`, `jar`, `save`, `load`, `debug.speed` and `debug.mute`.
- Audio: only approved Elizabeth clips (and approved human stops if the spike calls for them), through Web Audio, with silence and a console warning for any missing clip. No `speechSynthesis` and no `HTMLAudio` anywhere.
- Tested with `playwright-cli` at 1180 x 820 and 1080 x 810, and at 820 x 1180 for the turn picture.

**Only the full game adds**
- The rolling-8 adaptation and the Leitner item memory.
- Reading levels R4 to R6, phrase and sentence wishes, tricky words, and capital "crown letters" beyond names.
- Maths levels M1 and M5 to M8: small nests, snow stones, the twenty-frame and twin eggs.
- Numeral-only stones and berry wishes with counting on or taking away.
- Egg types beyond plain, speckled and golden, the Kinds page, Castle Fields, the parade and the Royal Nest Keeper title.
- A second bedtime variant (follow the sign path) that alternates with the bushes.
- Dress-up and accessories.
- Export and import, the shiny toggle, mute, and a server save on odin.

## Rejected critique

All 23 points are applied. Some are applied in part or in a different form, for these reasons:

- **1 (named person and date).** The design cannot name the recorder. It names Tjitse as owner, the teacher as first choice, a voice artist as fallback, and proposed dates.
- **2 (hint written "b-uuunnn").** Point 16 says short vowels must not be held, so stretched takes keep the vowel short and stretch only stretchy consonants ("p-a-nnn"). The one-take recording is applied.
- **3 (R1 wish list).** "man" is left out. A unicorn wishing for a man does not fit the world, and the 7 other words are enough. R1 vowel pairs use pictures that do not need to be decodable (top for tap, mop for map), which the critique's list did not allow for.
- **10 (free meadow after goodnight).** Play time comes before bedtime, not after goodnight. After goodnight the babies are asleep, and the night should end with tucking in. It is still uncapped and outside the timed round.
- **11 (six multiple-choice questions).** The egg is not a quiz item. Hot and cold feedback with sized differences turns a miss into a more-and-fewer task. With one egg on night 1, the night has three choice moments next to naming and play time. The pantry and the funny miss are applied. The sign path is kept for the full game, because the demo has to test the bushes first.
- **13 (signs may stay lowercase).** Signs get the crowned capital as well. Lowercase signs next to a capitalised tag would bring back the v1 "bob" against "Bob" mismatch.
- **19 (audio limited to R1 and R2).** The demo keeps R3. Emma is in Year 1 or 2 and "too easy" was one of the clearest lessons. If placement starts her at R2 or R3, R1 to R2 content alone would fail. The Nest Book pages and growth stay too, because collecting and nursing are what she loved, and the critique's own test is "is it fun".