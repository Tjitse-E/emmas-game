# opus-5-5: Unicorn Egg Nest v2

## Pitch

Emma is Queen Lumi's Nest Keeper in the Moon Meadow. Each night she warms a unicorn egg with number stones, names the baby that hatches and spells its name with letter gems, grants its written wish, plays with her herd and, at bedtime, finds her babies behind the bushes by reading their name signs. The herd stays from night to night, grows and fills her Nest Book. Role play, naming, nursing and collecting carry the reading and the maths.

## Game loop

One night takes about 4 to 5 minutes, plus play time, which has no limit.

| Step | What happens |
|---|---|
| 0 Start | A big pink egg with a play triangle. The tap unlocks audio and loads the clips and letter sounds. |
| 1 Arrival | Night 1: Queen Lumi says hello and asks Emma to be her Nest Keeper. The crown badge glows, Emma taps it and wears it. Later nights: the herd runs to the fence and Lumi says welcome back. |
| 2 Egg | Ten moon cups (2 x 5). The moon has warmed some. Emma drags one stone from the basket. Its dots fly into the cold cups with a chime, and nothing is counted aloud. Exact: "Every cup is warm!" and the bond ("Four and six make ten!"). Too many: red dots hang above the frame, the egg gets red cheeks and steam, "Too hot! Two too many. Try a smaller stone." Too few: frost and shivers, "Brr! Three cups are still cold. Try a bigger stone." From night 2 she picks a speckled egg (her level) or a golden egg (one level up, two stars). |
| 3 Hatch | Wobble, three cracks, burst. A first try with no hint gives a sparkly (shiny) baby. |
| 4 Name | The baby holds three name bells (pink, blue and purple, so she can remember which bell said which name) and a gold bell. Each bell says one name when tapped. Tapping the baby repeats the name while she spells. Emma drags her favourite onto the baby. Lumi says the name, and Emma fills one slot per sound from a tray of 6 to 8 gems. She slides the star to hear what she built. Right: the first gem flips to a crowned capital, the name tag clicks on and the baby says "Yay! Thank you!". The name tree gives two more sets of bells. The gold bell lets her build any name from a small tray. |
| 5 Wish | A baby (the new one on night 1, an older one later) shows a word in a cloud with sound dots, and no picture. The pantry has 8 or 10 items. Emma drags the right item to the baby. |
| 6 Reward | A shooting star, the Nest Book opens on the new page, the wish sticker presses onto its baby's page ("A new sticker for your Nest Book!"), and tonight's stars fly into the jar. A full jar (5 stars the first time, then 10) opens the Queen's chest: three wrapped presents with word labels. The chosen gift stays in the meadow. |
| 7 Play time | The herd comes forward into the meadow with name tags. "Play time! Drag the brush, the treats or the heart to a baby." The moonbeam shows the care tools, and the first time the ghost hand moves the brush towards a baby. Tap a baby for its trick. The little egg in the nest gives one more egg (steps 2 to 4). Tap the moon for bedtime. |
| 8 Bedtime | The babies hide behind four bushes with name signs. "Ken! Where are you?" Emma taps the bush or its sign (sliding along a sign plays its sounds) and drags the baby to the moss bed. Night 1 has one find, later nights two. |
| 9 Goodnight | The babies sleep. A big smiling moon starts the next night with one tap. There is no calendar lock. |

## Reading

- **Spelling (segmenting):** naming. The game says the name, Emma finds the letters. Blue slots take consonants, pink slots vowels, double slots two-letter gems (ss, ll, ff, ck). The slider plays only what she built. Stretchy sounds (s m n f l r and doubles) hold while her finger stays on the letter.
- **Blending for meaning:** the wish word. She sees print and hears only separate sounds (tap a letter, or slide along the dots). The word is spoken only after she gives an item.
- **Reading names:** the bedtime signs. Cousins behind the other bushes have names one sound away (Ken with Ren, Kin and Ked).
- **Capital letters:** every tag and sign has a crowned capital, the same gem she placed first.
- Distractors in the gem tray: m/n, t/d and a/i first, then b/p, e/i and a/u. Never a second spelling of a sound in the name (no c or ck with k). Never a gem that swaps the name into a blocked word. At levels 1 and 2 no Dutch-confusion pairs (a/e, u/o, final d/t, final g/k).
- Every pantry has a vowel-only distractor (pan with pin, cat with cot, cup with cap), plus an item with the same first sound and one with the same last sound when the picture set has one. Confusable pictures never share a pantry (hat/cap, pin/pen, pot/pan).
- Levels: L1 s a t p i n m d, L2 adds g o c k ck e u r, L3 adds h b f ff l ll ss. Reading and spelling start at L2.

## Maths

- **M2 missing piece:** 2 to 7 cups are warm, four stones: the answer, one more, one less and the number already warm.
- **M3 two stones:** six stones in three pairs that make ten. Every first stone has a partner. A wrong second stone rolls back on its own.
- **M4 blanket:** a blanket hides the cups. "The blanket hides the cups. Six cups are warm already. Which stone makes ten?" The blanket lifts when a stone lands.
- Stones show dice dots or a loose scatter, never a ten-frame layout. The second sub-step of each level adds a numeral badge.
- The egg's mood shows the size and direction of a mistake. Lumi names the difference ("Two too many.", "Three cups are still cold.").

## Sound

- All speech is pre-generated ElevenLabs audio played by `shared/audio.js` (Web Audio). No browser speech anywhere. A missing clip is silence plus `console.warn('[audio] missing <id>')`.
- Voices per `VOICES.md` and `docs/v2/decisions.md`:
  - `narrator` (Elizabeth): every goal and instruction, hints, feedback, numbers, words and names.
  - `queen` (Posh): Queen Lumi's story lines (`lumi-*`). Her mouth moves only on these lines.
  - `foal` (Flicker): baby unicorn tiny words and giggles (`foal-*`).
- Letter sounds come from the shared phonics library (`shared/audio/phonics/`), not from `lines.json`.
- Names and words are their own clips and sit at sentence boundaries: "Ken!" + "Where are you?", "A pan." + "Lovely!".
- `audio/lines.json`: 246 lines since the patch of 2026-10-12 (201 before), foal lines cost double.
- Speech order: an instruction never cuts off a word Emma asked to hear (a bell, a pantry item, a gem). It waits and then goes on. When she acts (a stone, a give, a bush, a slide), older instructions and replays stop, so they never talk over the answer.
- Effects are the synthesized `EmmaAudio.sfx()` set (chime, pop, whoosh, hatch and so on).

## Progression

- Three strands, each with its own staircase (plan 2.7): Maths (egg), Spelling (naming), Reading (wish and bedtime). Each strand has six sub-steps: two per level.
- 3 first tries in a row move a strand up one sub-step. A miss or a helped result moves it down one sub-step, without announcement. A first-try golden egg moves maths up to the golden egg's level.
- Hint ladder per checked moment: idle (15 s for maths and naming, 10 s for reading) repeats the goal, a second idle or one miss gives a focused hint (Lumi counts the cold cups, the blanket lifts, or the letter sounds play slowly), two misses show the answer with the ghost hand (counts as helped). Idle never goes past the focused hint. A hint or a ghost-hand demo never locks the screen: Emma's first touch ends it, and the touch itself works. While Lumi counts the cold cups, the moonbeam moves to the cups and the ghost finger touches each one.
- Collection: each baby keeps its name, colours, traits (shiny, speckled, golden), hearts and wish stickers. 3 hearts make a foal (longer legs, buck and spin), 6 hearts a young unicorn (glowing horn, gold frame, rainbow sneeze). Hearts come from a wish, being tucked in and once per night from play time.
- Saved in `localStorage` under `emma-unicorn-egg-nest-v2`, every read and write in try/catch. The demo runs without storage. A night that reached goodnight continues with the next night after a reload, even if the next-night moon was not tapped.

## Mockup

`index.html` is the playable demo: one file with inline SVG, loading `../../shared/audio.js` and Andika from Google Fonts. Fixed 1180 x 820 stage, scaled with letterbox bands. Portrait shows a "turn the iPad" picture. Pointer events only, no hover, zoom, selection, callout or overscroll.

What it covers:
- Night 1 and later nights with the egg choice, all three egg kinds (M2, M3, M4), hatch with shiny, speckled and golden babies.
- Bells, the name tree, spelling with read-back, wrong gems popping out with the slot humming the sound it needs, the gold bell (any name since the patch of 2026-10-12).
- One wish per night with the once-per-wish funny miss and a reshuffle on every miss.
- Reward with the Nest Book, the star jar and the Queen's gift.
- Play time with tricks, brush, treats, cuddles and "one more egg".
- Bedtime with four bushes, cousins, reshuffle on a miss, the moss bed, goodnight and the next-night moon.
- The Nest Book (crown badge, top left, next to the replay button).

Test hook `window.__game`:
- `state`, `steps`, `jump(step)`, `setLevel(reading, spelling, maths)`, `fast(on)`, `mute(on)`, `seed(n)`, `save()`, `load()`, `reset()`, `play()`, `answer()`, `replay()`, `idle()`.
- Steps for `jump`: start, arrival, egg-choice, egg, golden-egg, hatch, bells, spell, gold, wish, reward, gift, play, extra-egg, bedtime, goodnight, next-night, book.
- Actions: `tapCrown()`, `pickEgg(type)`, `drop(value)`, `ring(i)`, `chooseBell(i)`, `shakeTree()`, `gold()`, `spell(list or name)`, `slide()`, `tapItem(word)`, `give(word)`, `wish(word)`, `pickGift(i)`, `care(kind, i)`, `trick(i)`, `extraEgg()`, `moon()`, `seek(name or index)`, `toBed()`, `openBook()`, `closeBook()`, `nextNight()`.
- Console: `[timer] <step>: <s> s` per step and `[log] <strand> <result>` per checked moment.
- Hook actions behave like a touch: they end a running hint or ghost hand first, as a real finger does.

Placeholders and cuts:
- Cut for the demo: the parent corner, the calendar lock, the 200-name own-name list (the gold bell uses a fixed tray of t m n p and a i o; see the patch below), human stretched takes (hints use the approved letter sounds), the picture card on gem taps, the 10 s free care after the wish (care lives in play time), berry wishes.
- Pictures are simple inline SVG drawings. They need a check with Emma (does she know peg, cot, hut?).
- The chime per dot uses the shared `chime` effect, so it does not rise in pitch yet.

## Patch 2026-10-12

Emma's real names were refused with "I don't know that name". This patch removes every refusal while v3 is built. The save format did not change (still `v: 2` under `emma-unicorn-egg-nest-v2`), so her herd keeps loading.

- **Gold bell.** Every build from the tray is a name. Gems stay in the tray, so a letter can be used twice (Nan, Pip, Mom). All 48 builds were checked: 45 are names, each with an Elizabeth clip. Only `tit`, `nit` and `nip` (an ethnic slur in English) are turned down: the gems shake out and Elizabeth says "Let's pick a different name. Try other gems!". The blocklist is `NAME_BLOCK` (rude or unkind words in English and Dutch). Wish words (Pan, Pin, Mop) and Pom are names now. A baby is never wished the word that is its own name.
- **Pronunciation fixes.** Pon is "Ponn." (Pon! came out as "pawn"), Non is "Nonn" with seed 53, Tot uses inline IPA, Pap is "Papp!", Dat is "Datt!". The notes are in `lines.json`.
- **Shared names.** A second Tam is accepted: "Tam!" and "Another one! Now you have two." (up to five, then "lots"). At bedtime only one bush ever shows a name, so a shared name can always be found. The second find prefers a name no other baby has.
- **Names without a clip.** Accepted, and the name goes on the tag. Elizabeth says "What a great name! It's a tricky one for me to say." The name is logged with `[name-wish]` in the console and in the optional save field `nameWishes`, so the generator can add it later. Such a baby is not called at bedtime.
- **Bell names.** Level 1 has 50 bell names (was 12), so three full bell sets stay free for a herd of 40 at level 1. Nip is not one of them. A baby already called Nip in an old save keeps its name. If the pool ever runs short, the bells fill up from other levels and then from names the herd already has.
- **Herd cap.** The little egg works up to 50 babies (was 12). At 50 it sleeps, and a tap makes Lumi say "The meadow is full, so no more eggs tonight. A new egg comes tomorrow night!" The nightly egg still comes.
- **Big herds.** The fence shows the newest 60 babies in rows, play time shows them in a grid that shrinks to fit, and goodnight shows them in rows. The Nest Book has an overview button (four squares) with 40 babies per spread. A tap on a baby opens its page.
- **New clips:** 38 names and 8 lines, about 760 credits including the pronunciation trials.
- **Test hook additions:** `herd(n)`, `forgetClip(name)`, `bookAll(on)`, `bookTap(i)`. `state` shows `nameWishes`, `herdCap`, `herdFull` and `book`.
- **Ear check needed:** `name-mam` (speech-to-text hears "Ma'am"), and the respelled names above.

## Changes from v1

| Emma's feedback | What v2 does |
|---|---|
| The speech was really bad | Pre-generated ElevenLabs clips through Web Audio. No browser speech and no fallback voice. |
| The letter sounds were really bad | Pure British phonics sounds from the shared library. Stretchy sounds hold, stops play once. The game never builds a sound from text. |
| Ranked 1st: role play and fantasy | Queen Lumi is on screen, gives Emma a crown badge and sends the eggs. Her moonbeam shows where to touch. |
| Naming | Name bells, a name tree, a gold bell for her own name, then she spells the name herself. The name gets a crowned capital and stays on the baby. |
| Nursing | Wishes, brushing, treats, cuddles, tucking in at bedtime. Hearts make babies grow into foals and young unicorns across nights. |
| Collecting (from the Pippa feedback) | The Nest Book with a page per baby, wish stickers, traits and growth. Shiny, speckled and golden babies. The star jar and the Queen's gifts. Nothing is wiped. |
| "Say the word" (Pippa) | Naming works that way: Lumi says the name, Emma finds the letters. |
| Queen Emma's Letters was unclear | One goal per moment, spoken and shown with the moonbeam and a gold outline. The replay button (top left) and a tap on Lumi repeat the goal and never give the answer. Goal words use warmth only and never "read". |
| Moonbeam Stables was too easy | Nothing is counted aloud before she commits, stones are not ten-frame shapes, words are never said before she gives an item, distractors are one sound away, pantries and bushes reshuffle after a miss, and only first tries move her up. |
| v1 "Zob" spliced lines and forced last pick | Names are separate clips at sentence boundaries. Four bushes, the target is never the last sign left. |
