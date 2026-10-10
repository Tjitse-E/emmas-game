# Emma's games v2 plan

For Tjitse, 2026-10-10. Nothing gets built until you have read this.

## 1. Decisions

- Three games go to v2, in Emma's order. Queen Emma's Letters and Moonbeam Stables stay dropped. What we learned from them is now in the shared rules (section 2.5).
- Audio comes first. No game code is written until the shared letter sounds pass your ear check.
- One shared foundation sits under `shared/`: the audio pipeline, the phonics library, the word bank, the UI rules, the slider and the naming board. The three games are built on top of it.
- There is no shared sticker book in v2. Each game keeps its own collection (section 2.8).
- Unicorn Egg Nest is built first. Word Wand and Fluffle Nursery follow in parallel.

**Unicorn Egg Nest (1st).** Emma is Queen Lumi's Nest Keeper. Each night she warms an egg with number stones, names and spells the baby that hatches, grants a written wish, and at bedtime finds the babies by reading the signs on the bushes. The herd stays, grows and fills her Nest Book, so the role play, naming, nursing and collecting she loved are what carry the reading and maths.

**Pippa's Word Wand (shared 2nd).** Emma is Pippa's wand apprentice. A visitor says the word it needs ("A hat. Hat."). She puts letter gems on the wand, slides her finger, and the thing appears and becomes a sticker. She also reads notes from Sizzle the dragon and the Queen, and fills number orders for Mrs Duck and Grandpa Goat.

**Fluffle Nursery (shared 2nd).** Emma is Nurse Emma and raises one baby Fluffle over four play days. She reads its written wishes to open a locked cupboard, fills its tummy with an exact plate of berries, and washes off mud with number-bond jugs. The baby grows each night, and when it is grown it moves into the Fluffle Tree, her growing family.

## 2. Shared foundations

### 2.1 Audio pipeline

- **Voice:** Elizabeth (`AXdMgz6evoL7OPd7eU12`) on `eleven_v4`, `language_code: en`. Settings are fixed for every clip in every game: stability 0.5, similarity 0.75, speed 0.9, one fixed seed. Elizabeth speaks every line. Characters on screen only make animal or creature sounds.
- **No browser speech.** `speechSynthesis`, the `TTS_PHONEMES` maps and `HTMLAudio` are removed from all games. Playback uses Web Audio only. Letter sounds are decoded on the Play tap. Each scene's clips are decoded before that scene starts.
- **Missing clips:** a missing or unapproved clip plays silence and logs a console warning. The playwright test fails on any such warning. There is never a fallback voice.
- **One script for all three games:** `scripts/generate-audio.py`. It replaces the gpt6 script and the per-game scripts the designs proposed. It uses the standard library plus ffmpeg.
  - It loads `ELEVENLABS_API` from `.env` itself, and never prints, embeds or commits it. It runs outside the sandbox, because the sandbox blocks `.env`.
  - It caches each clip by a sha256 of voice, model, text, settings, seed and method.
  - Flags: `--dry-run` (prints the character count), `--max-chars` (a hard budget) and `--force`. `takes: N` produces alternative takes for review.
  - ffmpeg converts everything to mono. Speech becomes mp3 at 96 kbps, normalised to -16 LUFS, with silence trimmed to 50 ms. Letter sounds become WAV peaking at -3 dBFS, with loop points for the sustained sounds. WAV avoids loop clicks.
  - Speech-to-text (`scribe_v2`) checks every word and sentence clip. A transcript that does not match the display text is flagged. For letter sounds the transcript should be empty: a real word such as "Sir" or "Ta" means a vowel was added, so the clip is flagged.
  - It writes `manifest.json` with the hash, the chosen take and an approved flag. Approved clips are never regenerated without `--force`.
- **`lines.json`:** one per game in `ideas/<slug>/audio/`, plus `shared/audio/phonics/lines.json`. Games refer to clips by `id` only. Numbers are written as words in `speak`. Names and words sit only at sentence boundaries and are never spliced into the middle of a sentence. `ipa` is a note for the listening sheet and is not sent to the API.

```json
{
  "defaults": {"model": "eleven_v4", "seed": 11, "language_code": "en",
               "settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 0.9}},
  "lines": [
    {"id": "nest.name-ask", "display": "Your baby needs a name.", "speak": "Your baby needs a name.", "takes": 2},
    {"id": "word.bun", "display": "bun", "speak": "Bun."},
    {"id": "snd.s", "kind": "phoneme", "ipa": "s", "method": "respell", "speak": "Sssss."},
    {"id": "snd.t", "kind": "phoneme", "ipa": "t", "method": "trim", "carrier": "Top.", "class": "stop"}
  ]
}
```

- **Listening sheet:** `shared/review.html`, built from all manifests. Each clip gets one row with play, takes, the speech-to-text flag, approve or redo, and a note. Each letter sound sits next to its carrier word and the school programme's own video for that sound. The videos stay local and are never shipped or committed. Only approved clips are copied into the games.
- **Cost:** about 25,000 to 40,000 characters for all of v2. That is roughly one month of the Starter plan, or $2 to $3.50 at the normal v4 price. Cost is not a constraint.

### 2.2 Pure letter sounds

The research shows that ElevenLabs cannot produce a pure single sound through IPA tags, SSML phonemes or dictionary rules. Each of them either reads the markup aloud or adds a vowel. Two methods passed the machine checks:

| Sound class | Method | Sounds |
|---|---|---|
| Long sounds | Written out on v4 ("Sssss."), with a sustain loop for the slider | s ss m n f ff v z zz sh th. Also l ll r, but only if they pass your ear. |
| Stops, h, j, ch, glides | A carrier word with its first sound cut out by ffmpeg, cut before the vowel | t p k c ck (from "Kit"), b d g (wider cut window), j ch qu h w y. x and ng come from the end of "Box" and "Sing". |
| Short vowels | Cut from a carrier word. Played once, never looped. | a (At), e (Etch), i (It), o (Ox), u (Up) |
| Long vowels and vowel teams | A real word or a letter name | ai ("A."), ee, igh, oa, oo, ar, or, ow, oi, ear, air. er comes from the end of "Hammer". |

If a sound fails your ear, try these in order:
1. More takes with other seeds.
2. Another carrier word, or a different cut window.
3. A native British speaker records the sound and the ElevenLabs Voice Changer turns it into Elizabeth. Emma's teacher is the first choice and a hired voice artist the second. You should not record these yourself, because a Dutch accent on /æ/ teaches the wrong vowel.
4. If the Voice Changer damages the sound, use the human recording directly, loudness-matched. A correct sound in a second voice is better than a wrong sound in Elizabeth's.

Rules for every sound: no letter names, no "puh", /a/ as in "apple" (not "ah"), /o/ as in "on" (not "aw"). Never send single letters as text.

**Spike (this is the gate).**
- Batch 1 is the 18 sounds for L1 to L3, plus z for Fluffle naming.
- The known weak sounds go first: b, d and g (the cuts are too short), l and r (written out, they were heard as "Ew" and with a vowel), and ai and ar (not tested yet).
- The spike also covers 10 test names and a slider test on sun, mop, bun, hat and pig on a real iPad.
- Batch 2 is the remaining sounds, about 26. It must pass before Fluffle or Word Wand use anything above L3.
- Your first listening pass can start now. The research lab's `listen.html` has 109 clips in `/private/tmp/claude-501/-Users-tjitse-sites-emmas-game/565f726c-09a6-4628-a14b-7e1060000709/scratchpad/audio-lab/`. That is a temporary folder, so copy it out before it is cleaned up.
- Clean-up: delete the test pronunciation dictionary "emma-phonics-lab" from the ElevenLabs account.

### 2.3 Slider (blending)

All three games use one shared slider.
- Each sound plays when the finger reaches its letter. A sound never starts before the previous one has ended. Sounds never overlap and are never crossfaded.
- Stretchy sounds hold while the finger rests on them ("mmm"). Stops and short vowels play once, short.
- The gap between sounds is set per sub-step: 500 ms, then 300 ms, then 0 ms (finger speed decides).
- **Reading moments** (wishes, notes, signs): the slider never says the word. The word is spoken only after Emma has acted.
- **Spelling moments** (naming, Word Wand wishes): the slider plays what she built. On a correct build, the whole word follows.
- Hints that stretch a word play the approved sound clips with a gap. The human stretched recording per word and per name (from the Egg Nest design) is dropped. That removes about 90 recordings, and every sound in a hint has then passed your ear check.
- Word Wand's continuous crossfaded blend is tested in the spike. It replaces the gap mode in Word Wand only if it passes your ear.

### 2.4 Phonics scheme, levels and word bank

The default scheme is Little Wandle Letters and Sounds Revised. Its order changes to the school's own scheme once the school confirms which one it uses. All three games now use these level labels:

| Level | Graphemes | Example words |
|---|---|---|
| L1 | s a t p i n m d | pan, pin, map, mat, tap, ant |
| L2 | g o c k ck e u r | cat, dog, pig, duck, hen, net, cup, rug, sun, pot |
| L3 | h b f ff l ll ss | bun, hat, bell, doll, fan, log, bag, bus |
| L4 | j v w x y z zz qu | jam, van, web, box, fox, zip |
| L5 | ch sh th ng nk | ship, fish, chick, king, ring, moth |
| L6 | ai ee igh oa oo ar or ur ow oi ear air er | rain, bee, light, boat, moon, star, fork, cow, coin, chair |
| L7 | Adjacent consonants | frog, crab, drum, nest, tent, lamp |
| L8 | Phrases, and sentences with tricky words | "red cap", "Put the hat on the pig." |

**Tricky words** follow the Little Wandle lists for Phases 2 to 4.

**Placement** follows the school phase. If the school does not answer, every game starts at reading L3 and spelling L2, with fast placement: in the first session, two first tries in a row skip a sub-step, until the first miss.

**Word bank (`shared/words.json`).** Each word has its graphemes, level, picture, one-sound neighbours, confusable pictures, per-game exclusions and picture-check status. These rules merge the three designs:
- Each word has one clear picture.
- Confusable pictures never share a scene: hat/cap, cup/mug, dog/pup, mat/rug, pin/pen, pot/pan, rock/stone, bed/cot.
- A tray never holds two spellings of one sound (c/k/ck, s/ss, l/ll, f/ff).
- Dutch-interference pairs stay out of the distractors at L1 and L2: a/e, u/o, final d/t and g/k, v/w, v/f, j/y, th, ee/i and oo/oa. They come back later as a "tricky pairs" step. They are logged separately and never block a level-up on their own.
- **Picture check (`shared/picture-check.html`).** You show each picture to Emma, tap it to hear the word, and mark it known or unknown. The result is exported into `words.json`, so all three games read it from there. A word that has not passed the check is used nowhere.

**Names.** One blocklist and one checker cover every name list.
- The blocklist joins the three designs: the English list, the Dutch words pik, pis, lul, kut and bom, and the book characters Zog and Mog.
- The build script lists every one-sound neighbour of every name and flags any neighbour that is a blocked word. Trays never offer the gem that would make it. Names that are too close to a blocked word are dropped.
- Cast names are reserved in all three games: Lumi, Pippa, Pip, Pom, Dot and Sizzle. That removes pip and dot from the Egg Nest name list.
- You review each name list once.

### 2.5 Shared UI rules

These rules answer "Queen Emma's Letters was unclear" and "Moonbeam was too easy".
- A big Play button unlocks audio. Every game starts there.
- **Replay button:** always visible, in the same place in all three games (top left), 88 px. It repeats the goal of the current moment and never gives the answer. Tapping the guide character does the same.
- **Every moment has one goal.** Elizabeth says one goal line and one "how" line, each of 8 words or fewer where possible. Exactly one target area glows or has the spotlight, and everything else is dimmed. The goal is always shown as a picture as well: cold cups, an empty name tag, a wish bubble, an empty bed.
- The first time a gesture appears, the ghost hand shows it once. It uses a blank gem or an object that is not the answer.
- **Idle hint:** the goal repeats after 10 s on reading steps and after 15 s on maths steps. Idle time never goes further than a focused hint. Only real attempts unlock the answer.
- **No answer before action.** No word is spoken before a reading choice. Nothing is counted aloud before a maths answer is handed in.
- **Wrong answers show in the world:** a too-hot egg, a bug instead of a bun, ghost berries. A funny reaction plays at most once per item. Right answers get the bigger celebration.
- **Only first tries count.** A helped result still finishes the step, so Emma is never stuck.
- No decay and no guilt. Creatures never get sick, sad or lost.
- **Print:** lowercase in Andika, self-hosted (single-storey a and g). Sound dots under letters, a bar under digraphs. Names get a capital.
- **Stage:** a fixed 1180 x 820 stage with letterbox bands. Touch targets are at least 72 px in stage units. In portrait, a "turn the iPad" picture shows. No text selection and no touch callout.
- **Parent corner:** a two-finger hold of 3 s in the top right. Reset sits behind an adult sum on a number pad.
- **Test hooks:** `window.__game` with at least `state`, `setLevel`, `seed`, `fast`, `mute`, `save`, `load` and `reset`.

### 2.6 Shared code

`shared/` holds the audio player, the slider, the naming board, the parent corner, the save, the stage and turn picture, the Andika font, `words.json`, the phonics clips, `review.html` and `picture-check.html`. The naming board has two modes: spell a spoken name, or build a name freely from an approved list. Each game's `index.html` loads these files by relative path, with no build step. STACK.md allows chosen games to move beyond a single self-contained file.

### 2.7 Shared adaptation rule

This one rule replaces the three different rules in the designs.
- Every checked moment is logged as first try, miss or helped. Using the replay button does not count against her.
- Each strand has its own staircase. 3 first tries in a row move it one sub-step up. One miss moves it one sub-step down, without announcement. This settles near 80% first-try success.
- Within a round, after 2 misses in a row, the next item is one sub-step easier. The level itself does not move.
- Fast placement applies in the first session (see 2.4).
- The full game adds a rolling window and Leitner boxes.

### 2.8 Shared sticker book: no, not in v2

Each game's collection is the spine of that game, and they are different kinds of thing: unicorn babies, word stickers and Fluffles. A shared book would need one save across three installed apps and one design for three worlds. We also do not know yet whether Emma plays more than one game regularly. The saves use one data shape (`collection: [{game, kind, id, word, shiny, date}]`), so a shared shelf can be added later.

### 2.9 Saves

- Each game saves to `localStorage` under its own versioned key. Every read and write is wrapped in try/catch, and the demo runs without storage.
- The game must be installed on the Home Screen before the first real session. Safari clears storage after 7 days without a visit, and Home Screen storage is separate from Safari's.
- A server save on odin comes with the full game. See question 5.

## 3. Per game

### 3.1 Unicorn Egg Nest v2

Folder: `ideas/opus-5-5-unicorn-egg-nest-v2/`

**Changes from its design:**
- The human stretched takes are replaced by the shared slider.
- pip and dot are removed from the name list.
- The shared adaptation rule replaces its own.
- The replay button moves to the shared top-left position, and the crown badge moves next to it.

**The night** takes about 4.5 minutes of timed play. Play time is extra and has no limit.

| Step | What happens | Skill |
|---|---|---|
| 0 Start | A big egg with a play triangle unlocks audio and decodes the letter sounds. | |
| 1 Arrival | First session: Queen Lumi gives Emma the Nest Keeper crown badge. Later sessions: the herd runs to the fence. | |
| 2 Egg | A 2 x 5 frame of moon cups, some already warm. Emma picks one of 4 stones, shown as dice dots or a loose scatter, never in a ten-frame layout. The dots fly into the cups with rising chimes, and nothing is counted aloud. Exact fill: it hatches. Too many: red overflow dots and "Too hot! Two too many." Too few: frost and "Brr! Three cups are still cold." From night 2 she chooses a speckled egg (her level) or a golden egg (one level up, two stars). | Bonds to 10, missing number |
| 3 Hatch | A first try with no hint gives a shiny baby. | |
| 4 Name and spell | Three name bells each say a name. The gold bell lets her build her own name from the approved list. Lumi says the chosen name, and Emma fills the sound slots from a tray of 7 or 8 gems: blue consonants, pink vowels, twin slots for ss, ll, ff and ck. Sliding the star plays back what she built. When it is right, the first gem flips to a crowned capital and the name tag clicks on. | Segmenting to spell |
| 5 Wish | A baby shows a printed word with sound dots and no picture. The pantry holds 8 to 12 items, including one that differs only in the vowel. The word is never spoken before she gives an item. A wrong give gets one funny reaction per wish, then the items reshuffle. Tapping an item says its name. | Blending for meaning |
| 6 Reward | A sticker for the baby's page, and a star in the jar for each first try. The first jar needs 5 stars and later jars 10. A full jar opens the Queen's chest of 3 gifts with word labels. | |
| 7 Play time | No limit. Brush, cuddle, treats, tricks, and "One more egg?". Each baby gets at most one heart per night from play time. | |
| 8 Bedtime | 4 bushes with name signs. Visiting cousins have names one sound away from the target. Every miss reshuffles the bushes, and the target is never the last sign left. Emma drags each baby to the moss bed. | Reading names |

**Reading.** L1 to L3 in the demo.
- Planned distractors: m/n, t/d and a/i first, then b/p, e/i and a/u. b and d share a tray only from L3.
- A random spelling of a 3-sound name works about 1 time in 60.
- Every pantry holds a vowel-only distractor, plus one item with the same first sound and one with the same last sound.

**Maths.** M1 to M8. The demo has M2 (missing piece) on night 1, and M3 (two stones make 10) and M4 (cups hidden under a blanket) on the golden egg.
- The bond is spoken only after success: "Four and six make ten!"
- Focused hint: Lumi counts the cold cups. After 2 misses, the ghost hand moves the right stone, and the result counts as helped.

**Difficulty.** Three strands: Maths, Spelling (naming) and Reading (wish and bedtime). They use the shared rule. The night-2 golden egg is one level up.

**Collection.**
- The herd persists, up to 12 babies in the meadow.
- Hearts grow each baby from baby to foal to young unicorn, and each stage unlocks a trick.
- The Nest Book has one page per baby, with its wish stickers, its traits (shiny, speckled, golden), its hatch date and its growth stage.
- The full game adds Castle Fields, more egg types, the parade and the Royal Nest Keeper title.

**Kept from v1:** the night meadow, the moon cups, the chime ladder, the egg moods, `unicornSVG`, the gem tray, the bushes, the tricks, the hint machinery (`canMake`, `unstick`, `ghostMove`), the line pipeline, the 1180 x 820 stage and `__game`.

**Cut from v1:**
- Browser TTS and `HTMLAudio`.
- The free-fill egg and the spoken count of every dot.
- The light words ("glows", "lit").
- Ten-frame dot layouts on stones.
- Unchecked free naming and the generated 144-name list.
- The spliced "Where is" lines.
- The 3-bush hide and seek with a forced last pick.
- Fixed answers.
- Replay wiping the meadow.
- The moon long-press as a parent gesture.

**Demo:**
- Nights 1 and 2: the egg choice, the shiny, speckled and golden traits, naming with bells, the gold bell and the name tree.
- 43 curated names and about 200 own-name entries.
- One wish per night, play time, bedtime with 4 bushes.
- The Nest Book, hearts and three growth stages, the star jar with the Queen's gift.
- The shared adaptation rule, the parent corner, the debug timer per step.
- About 800 clips.

### 3.2 Pippa's Word Wand v2

Folder: `ideas/opus-5-5-pippas-word-wand-v2/`

**Changes from its design:**
- Andika is self-hosted instead of loaded from Google Fonts.
- The continuous blend is used only if it passes the spike.
- The shared adaptation rule replaces the 4-item window.
- Its audio script is folded into the shared script.

**A round** takes about 4 minutes. A session has at most 2 rounds, and the first session adds about 2 minutes.

| Step | What happens | Skill |
|---|---|---|
| 1 First session only | Pippa gives Emma the wand. A Bobbin climbs out of the sock basket, Emma picks its colour and names it on the wheel (Bip, Bop, Fip, Fop, Tip or Top). Pippa then builds "mat" sound by sound to show how it works. | |
| 2 Bobbin warm-up | An easy review word that she always wins: "Bop is hungry. What does Bop want? A bun. Bun." | Segmenting |
| 3 Maths visitor | First the wish, then a number. Round 1 is Mrs Duck at M3: 1 or 2 more ducklings hide behind a hedge with a numeral sign, and Emma works out how many hats. Round 2 is Grandpa Goat at M4: his bag shows a numeral, and Emma works out how many more nuts fill a ten-frame tray. She puts a number stone (0 to 10) on the wand. The stone's number is not spoken. A wrong number shows: a duckling with no hat, a spare hat, an empty hole. The scene resets before every retry. | Counting on, bonds to 10 |
| 3b Golden Scroll | A bonus, offered after two first-try wishes. Never in the first session, and she can wave it away. One sub-step harder. Gives a rare unicorn sticker. | |
| 4 Sizzle's note | A written word with sound buttons. The shelf holds 3 things that differ by one sound, named aloud as they arrive. The word is never said before she gives a thing. A wrong pick fails visibly (water spills into the cap), then the wrong thing is swapped and the shelf reshuffles. | Blending for meaning |
| 5 Queen's tea party | "Put the hat on the pig." "put" and "the" are heart words. | Sentence reading |
| 6 Stickers and bedtime | New stickers. After round 1, Emma taps the wand for another round or the moon for bedtime. | |

**Reading.**
- Racks hold 6 gems at L1 and L2, with red vowels as a scaffold. From L3 they hold 8 gems in one colour.
- A wrong build that makes a real word makes that thing for a moment (a bug instead of a bun). A non-word fizzles.
- The wish hint ladder has 6 steps. No gem lights up before the final two-choice. A finished word always gives at least a plain sticker.

**Maths.** M1 to M6, with M3 and M4 in the demo. Hints come only after a miss: tap to count, then the hidden part is shown, then a choice of two stones.

**Difficulty.** Four strands: Segmenting, Blending, Sentences and Maths. A level-up is shown as a wand upgrade:
- double-letter gems at L3
- two-letter gems at L5
- vowel-team gems at L6
- a fourth socket at L7
- the ten-stick stone at M6

**Collection.**
- The sticker book has 34 stickers in the demo and about 150 in the full game.
- A first try gives a shiny sticker. Golden Scrolls give rare unicorn stickers.
- Locked slots show their word in grey with sound buttons. Sliding under the word plays the sounds, never the word.
- The Bobbin grows by words made (it becomes "small" at 10 words). Each finished round gives a crown.

**Kept from v1:** the gem drag system, the octagonal gems, the slide gesture and rainbow track, `shuffledGems`, the word-becomes-a-thing payoff, the read-back at the party, Pippa, the goat, the Queen and `__game`.

**Cut from v1:**
- Picture-only goals and "Make a word".
- Browser TTS and the queued slow phoneme clips.
- Fixed scenes and answers, and needs with two possible answers.
- The idle hand dragging the correct gem.
- Words with two meanings or that she may not know (bat, cog, cot and others).

**Demo:** the first-session flow, both maths visitors, Sizzle's note, the Golden Scroll, the R1 tea party, the book and bedtime, all hint ladders, the parent corner and the save. About 400 clips.

### 3.3 Fluffle Nursery v2

Folder: `ideas/opus-5-5-fluffle-nursery-v2/`

**Changes from its design:**
- The picture check moves to `shared/` and writes into `words.json`.
- Names go through the shared checker.
- The slider is the shared one, which is its own design made general.
- The start level follows the shared placement.

**One day** takes about 4.5 minutes.

| Step | What happens | Skill |
|---|---|---|
| 1 Arrival | A cloud leaves a basket at the window. Three taps and the baby pops out. | |
| 2 Naming | For the first baby only, Pom shows how to build "Pom". Emma then picks one gem from each of three trays: p m b z, then a i o u, then p n g m. Blocked combinations are greyed out. She slides the star to hear the name and taps the heart to keep it. 28 names are allowed. Later babies arrive with a free name already filled in. | Free blending |
| 3 Wish 1 | A written word in a thought bubble, with sound dots. The cupboard stays locked until she has slid the star. Inside are 6 silent items, among them items that differ only in the first sound, the vowel or the last sound. She carries her choice to the baby. | Blending for meaning |
| 4 Feeding | The tummy is a ten-frame with some spots already full. Emma puts berries from a messy heap onto a plate, with no voice counting. The baby eats only an exact plate. Too few or too many shows ghost berries in the tummy. Elizabeth counts on aloud only as the baby eats a right plate. | Counting out, gap to 10 |
| 5 Wish 2 | If wish 1 was right first time, wish 2 is a golden wish one level up. Otherwise it is a normal wish. | |
| 6 Bath | Emma fills a rinse jug to the star with two numbered bubbles. There are 3 right pairs and 2 bubbles with no partner. Each right pour washes off one mud splat. After each pour Elizabeth says the sum ("Seven and three make ten!"). Free bubble popping follows. | Bonds to 10 |
| 7 Bedtime | A cuddly-toy word at review level opens the toy basket. Emma drags the baby to its cot. | Review |
| 8 Night | The book opens with new stickers and the Fluffle Tree page. "Come back tomorrow." | |

On days 2 to 4 the baby wakes up bigger. On day 4 it is grown: its fur pattern appears, and its crown gets one sparkle gem per golden heart. It moves into the Tree, leaves a room gift, and the next basket arrives.

**Reading.**
- The help ladder has three steps: the bubble pulses and she must slide again; then the sounds play with shrinking gaps while the filler items fade out; then "It says cap." with no sticker.
- Blend sub-steps (a) to (d): gaps of 500 ms, then 300 ms, then 8 items on the shelf, then sound dots only with no slider.

**Maths.** Feeding levels F1 to F4 (the demo starts at F3). Bath levels B1 to B3 (the demo starts at B2). The baby's body shows the result of every hand-in.

**Difficulty.** Three strands: Blend, Count and Bonds, using the shared rule. Inside a round: the golden wish is the only need above her level, and bedtime always ends the day on a success.

**Collection.**
- 5 hearts per day. A first try makes the heart golden.
- Four growth stages, and the Fluffle Tree with 8 kinds.
- A sticker book per baby: shiny for a first try, plain after misses, none after full help. Tapping a sticker says its word.
- Room gifts.

**Kept from v1:** `pomSVG` and the recolouring, the treehouse room, day and night, the basket arrival, the plate and berry eating, sniff and head shake, tickle and bounce, the stage, the hint hand and the replay button.

**Cut from v1:**
- Browser TTS.
- The fixed name "Pom" (Pom is now the grown Fluffle in the Tree).
- Popping bubbles 1 to 6 in order.
- Voice counting while she places berries, and eating part of a plate.
- Category hints ("Look on the shelf").
- Fixed order and positions.
- Emoji.
- `location.reload()` as replay.

**Demo:** day 1 and the growth on the morning of day 2. Later days are reached with `__game.setDay()`. R1 to R4 word sets, F1 to F4, B1 to B3, one Fluffle kind in all 4 stages plus Pom. About 600 clips.

## 4. Emma's feedback, point by point

| Feedback | Game | Change |
|---|---|---|
| The speech was really bad (browser TTS) | All | Pre-generated Elizabeth clips through Web Audio. No browser speech. A missing clip is silence, a warning and a failed test. |
| The letter sounds were really bad | All | One shared phonics library made by the methods that passed testing, checked by your ear against the school's own sound videos, with a native British speaker as fallback. No game code until it passes. |
| Role play and fantasy | Egg Nest | Nest Keeper for Queen Lumi, who is on screen. A crown badge, eggs sent by the Queen. |
| Naming | Egg Nest | Name bells, then she spells the name herself. A gold bell for her own name. A crowned capital on the tag. |
| Nursing | Egg Nest | Wishes, care, untimed play time, tucking in at bedtime. Hearts and growth across nights. |
| It was unclear which word they wanted | Word Wand | Every wish says the word ("A hat. Hat."). Exactly one word is accepted. No confusable pictures in one scene. |
| Say the word, so she can focus on the letters | Word Wand, Egg Nest | Word Wand dictates every wish. Egg Nest naming works the same way. |
| The sticker book is a really good idea, she loves collecting | All | Word Wand: shiny, rare and grey-word stickers. Egg Nest: the Nest Book and the herd. Fluffle: the Tree and stickers per baby. Nothing is ever wiped. |
| Caring for the fluffy animals | Fluffle | A four-day baby: feed it, bath it, put it to bed. It grows overnight and joins the Tree. |
| She likes the challenges | Fluffle | Locked wish cupboard, exact plates, rinse-jug bonds. The staircase keeps them real. |
| Queen Emma's Letters was unclear | All | One goal per moment, spoken and shown as a picture. One glowing target. The ghost hand on first use. A replay button in the same place in every game. |
| Moonbeam was too easy, no felt maths or reading | All | No counting or word before she commits. Distractors one sound away. Hidden amounts. Only first tries move her up. A staircase near 80%. |
| The reading and maths must be felt | All | Wrong answers change the world: a too-hot egg, a bug instead of a bun, ghost berries, mud that stays. |

## 5. Build order and verification

1. **You, by 2026-10-14:** ask Emma's teacher which phonics programme and phase she is on, and whether the teacher will record or listen to the pure sounds. If there is no yes by 2026-10-17, book a native British voice artist.
2. **Shared pipeline:** `generate-audio.py`, the `lines.json` format, `review.html`, `words.json` with the name checker and blocklist, and `picture-check.html`.
3. **Phonics spike:** batch 1 of the sounds, 10 test names, and the slider on a real iPad. **Gate:** you approve every sound against the school videos.
4. **Shared code:** the audio player, slider, naming board, parent corner, save and stage. Then the picture check with Emma.
5. **Egg Nest v2:** generate its lines, you review them, build the game, test it, and then Emma plays.
6. **Word Wand v2 and Fluffle v2 in parallel,** with phonics batch 2 approved first.
7. Emma plays. Update IDEAS.md with three v2 rows and her verdicts.

**Verification for every demo**
- `playwright-cli`, run outside the sandbox and served over `python3 -m http.server 8765`, at 1180 x 820 and 1080 x 810. Also at 820 x 1180 to check the turn picture.
- Scripted runs through `window.__game` reach every step, every right path and every wrong path.
- The test fails on any missing-clip warning, any `speechSynthesis` or `HTMLAudio` in the code, any touch target under 72 stage px, or any horizontal scroll.
- The debug timer logs real time per step. A timed round must stay under 5 minutes.
- On a real iPad: audio starts on the Play tap, the slider has no audible lag, and the Home Screen install keeps the save.
- **Listening check before Emma plays:** you approve every clip in `review.html`. Letter sounds are checked one by one against the videos. Words and names can be checked in batches after the speech-to-text pre-check.
- **After her first sessions, read the logs:**
  - two idle repeats at the same step mean that goal is unclear
  - first-try rates near chance mean the level is too high
  - all first tries mean it is too easy

## 6. Open questions for you

1. **School:** which phonics programme and phase is Emma on, and will her teacher record or listen to the pure sounds? Until you know, the defaults are Little Wandle, reading L3, spelling L2 and fast placement.
2. **Voice artist:** if the teacher says no, may I plan for a paid native British voice artist to record the sounds that fail? You would not record them yourself, because of the accent risk.
3. **Review load:** the three demos have about 1,800 clips for you to approve. Is that acceptable, or should I cut Egg Nest's own-name list from 200 to about 60 and Fluffle's names from 28 to 20? That would save about 180 clips.
4. **Daily limits:** Fluffle unlocks one day per calendar day, Word Wand allows 2 rounds, and Egg Nest has one timed night plus unlimited play time. Keep these different limits, or use one rule for all three?
5. **Hosting:** may the demos go on odin now, so Emma can install them on the Home Screen and her herd, Bobbin and Fluffles survive Safari's 7-day storage clearing?
6. **Overlap:** all three games now have a named creature to care for. Do we accept that for v2 and decide after Emma has played, or do you want Word Wand's Bobbin removed now?