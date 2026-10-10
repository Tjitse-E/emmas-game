# opus-5-5: Pippa's Word Wand v2

## Pitch

Emma is Princess Pippa's wand apprentice in a tree house with a big Wishing Window. Visitors come to the window and say exactly what they need ("A hat. Hat."). Emma puts letter gems on her wand, slides her finger to the star, and the word turns into the real thing. She also has her own fluffy pet, a baby Bobbin that she colours and names herself.

## Game loop

One round takes about 4 minutes. A day has at most 2 rounds, then bedtime.

1. **First day only:** Pippa gives Emma the wand. A baby Bobbin climbs out of the sock basket. Emma picks its colour (mint, pink or lilac) and makes its name on a naming wheel (Bip, Bop, Fip, Fop, Tip or Top), then taps the heart to keep it or the round arrow to try again. Pippa then builds "mat" sound by sound to show how the wand works.
2. **Bobbin warm-up:** "Your Bobbin is hungry. What does it want? A bun. Bun." Emma builds the word. The Bobbin eats it or wears it.
3. **Maths visitor:** round 1 is Mrs Duck and her ducklings, round 2 is Grandpa Goat. Emma first builds the wish word, then puts a number stone on the wand and slides.
4. **Golden Scroll (bonus, not on day 1):** after two first-try wishes in a round, Dot the unicorn foal brings a tricky scroll. Emma can try it or wave bye bye.
5. **Sizzle's note:** Sizzle the baby dragon holds a note with one written word. Three things on the shelf are named aloud. Emma reads the note and gives Sizzle the right thing.
6. **The Queen's tea party:** "Put the cup on the dog." Emma reads the note and drags the thing onto the right pet. Then everything she made is read back, the Queen says thank you and a crown flies to the book.
7. **Stickers:** the sticker book opens with the new stickers.
8. After round 1: tap the wand for more magic or the moon for bedtime. After round 2: bedtime. The Bobbin falls asleep. One tap on the sun starts a new day.

What she wins: a sticker for each word (gold frame on a first try), rare unicorn stickers from Golden Scrolls, a crown per round, and a Bobbin that grows after 10 words.

## Reading

- **Spelling a spoken word (encoding).** Every wish says the word, so she never has to guess what is wanted. She only has to find the sounds. Racks have 6 gems (8 for the Golden Scroll), shuffled so the word never sits in reading order.
- **Pure letter sounds.** Each gem plays its sound when tapped and when it snaps into the wand.
- **Blending under her finger.** The slide plays the sounds in order as her finger reaches each socket. Long sounds (s, m, n, f, l, r) hold while her finger rests. Sounds never overlap.
- **Reading for meaning.** Sizzle's note and the Queen's note have sound buttons under each letter and a slide track. The whole word is never spoken before she acts.
- **Tricky words.** "Put" and "the" carry a heart. Tapping them says the word, for the first 5 times.
- **Wrong answers show in the world.** A wrong real word makes its thing (a bug instead of a bun), which then puffs away. A non-word fizzles. A wrong thing for Sizzle tips over and spills. A wrong pet giggles and the Queen laughs.
- **Hint ladder for a wish:** listen again with the word stretched, then right gems turn gold and lock, then the next empty socket pulses and plays its sound, then only two gems stay for each socket. No hint lights the answer before the two-choice. A word finished with help still gives a plain sticker.
- **Book.** Locked stickers show the word in grey with sound buttons. Sliding under it plays the sounds, never the whole word.

## Maths

- **Mrs Duck (default M3, counting on).** 3 to 7 ducklings are scattered on the grass. A sign on the hedge says how many more are coming ("Two more ducklings are coming!"). Every duckling needs the thing Emma just made. She puts a number stone (1 to 10) on the wand. Too few: a duckling without one shivers. Too many: the spare one lands on the Bobbin.
- **Grandpa Goat (default M4, bonds to 10).** His bag shows a numeral and the nuts are hidden inside. The tray has ten holes. How many more nuts fill it? Stones 0 to 10. Too few: an empty hole sparkles. Too many: a nut rolls to the Bobbin.
- The stone's number is never spoken. The scene resets before every new try.
- **Maths hints after a miss:** tap to count (a dot marks each one, no number spoken), then the hidden part is shown, then only two stones stay.

## Sound

- Every spoken line is a pre-generated ElevenLabs clip, played through `shared/audio.js` (Web Audio). There is no browser speech. A missing clip is silence plus a console warning.
- Letter sounds come from the shared phonics library in `shared/audio/phonics/`.
- **Voices** (from `VOICES.md`):
  - Elizabeth (narrator): every goal line, every word, name, number and letter sound.
  - Pippa (Amelia): story lines, her demo on "mat", "Now it is your turn, Princess Emma!".
  - The Queen (Posh): welcome, "Oh, how funny!", thank you.
  - Dot the foal (Flicker): three tiny lines with giggles.
  - The Bobbin (Peanut): six babble lines with audio tags. No real English words.
- Mrs Duck, Grandpa Goat and Sizzle only make sound effects.
- `audio/lines.json` has 172 lines. All 172 clips are generated in `audio/` with `audio/manifest.json`. The first run sent 3,854 characters. Fixes after the speech-to-text check sent about 540 more.
- Speech-to-text fixes: "A pot!", "Fip!", "Do you like the name Bip?" and "Do you like the name Fop?" got a new take (`seed` in `lines.json`). "<Name> missed you!" became "<Name> is so happy to see you!", because the final p of the name was swallowed before "missed". Two Bobbin babble lines were rewritten, because speech-to-text heard "yum yum" and "oh baby".
- Known: speech-to-text hears "Bob" in "Bop is so happy to see you!" and "Night night, Bop." over three takes. The clips Emma decodes from ("Bop!", "Hello, Bop!", "Do you like the name Bop?") pass. "The." passes speech-to-text, but nobody has heard yet whether it says "thuh" or "thee".
- Sound effects are the synthesized set in `shared/audio.js` (pop, chime, sparkle, whoosh, soft-no, fanfare, splash, munch, tick, magic, hatch). No music yet.

## Progression

- Four strands with their own staircase (plan 2.7): spelling, reading (Sizzle), sentences (the Queen) and maths. 3 first tries in a row move a strand up one sub-step, one miss moves it down, without any announcement. On day 1, 2 first tries in a row are enough (fast placement) until the first miss.
- **Spelling sub-steps:** L1, L2 with far distractors (start), L2 with close distractors, L3 with close distractors, L3 with 8 gems in one colour. Red vowels are a scaffold up to L3. Distractors come from taught letters only, never two spellings of one sound, and Dutch-speaker pairs (a/e, u/o, final d/t) stay out at L1 and L2.
- **Reading:** L2 (start) and L3 decide which note words are used.
- **Maths:** M2 (no hidden ducklings, bag 6 to 8), M3/M4 (start), and a harder step (two hidden ducklings, bag 2 to 8).
- Missed words come back as the Bobbin's warm-up. No word repeats within a day where another word fits.
- Words: bun, nut, hat, rug, cup, mug (wishes), pot, pen, net, bed, log, bus (Golden Scroll), mat (Pippa's demo). Shelf partners: bug, sun, hut, cat, pup, cap, cub, jug. Confusable pictures (hat/cap, cup/mug, dog/pup, mat/rug) never share a round.

## Mockup

`index.html` is the playable demo. It runs at a fixed 1180 x 820 stage, scaled to fit with letterbox bands, and shows a "turn the iPad" picture in portrait.

What it covers:
- The whole first session (wand, Bobbin, colour, naming wheel, Pippa's turn, Pippa's first number stone) and both rounds.
- Next day after bedtime with one tap: the Bobbin wakes up ("Fip is so happy to see you!"), and the Golden Scroll can appear.
- All wrong paths and hint ladders for wishes, maths, Sizzle's note and the Queen's note.
- Sticker book with plain, shiny and rare stickers, grey words with slide-for-sounds, crowns and the Bobbin's name.
- Save in `localStorage` under `pww2-save-v1` (every access in try/catch). The game runs without storage.
- Replay button top left (88 px): repeats the goal of the current moment. It stays quiet while a story line plays.
- Test hooks on `window.__game`: `state`, `steps`, `answer`, `fast`, `mute()`, `seed()`, `save()`, `load()`, `reset()`, `setLevel(strand, n)`, `set(path, value)`, `play()`, `jump(step, {visitor, round, warm, wish})`, and actions `spell(word)`, `number(n)`, `give(word)`, `put(thing, animal)`, `colour(c)`, `like(bool)`, `scroll(bool)`, `choose('wand'|'moon')`, `closeBook()`, `newDay()`, `waitFor(modes)`. Steps: gift, colour, naming, pippa, greet, warmup, wish, numdemo, count, scroll, sizzle, party, stickers, choice, bedtime.

What is placeholder:
- Sound effects are synthesized. Knocks, quacks and bleats are generic effects.
- Art is simple inline SVG. Nuts reuse the v1 acorn.

## Changes from v1

| Emma's feedback | v2 answer |
|---|---|
| The speech was really bad | Real ElevenLabs clips through Web Audio. The browser voice is gone. |
| The letter sounds were really bad | Pure British phonics sounds from the shared library. The slide plays them one after the other, never as "buh" or "luh". |
| Sometimes unclear which word they want | Every wish says the word twice ("A bun. Bun."), shows its picture in a bubble, and only that word is accepted. The replay button repeats it. |
| She loves the sticker book and collecting | Each finished word sends its sticker flying into the book button straight away, and the badge counts up. Gold frames and a gold star for first tries, rare unicorn stickers, grey words to read in the book, crowns, a Bobbin that grows. |
| Shared 2nd: a good idea that needs work | One goal per moment, said by Elizabeth and shown as a picture. Pippa shows the wand once on her own word. The hint hand only drags a blank gem. |
| From Unicorn Egg Nest: she loves role play, naming and nursing | She is Pippa's apprentice, is called Princess Emma, and colours, names, feeds and puts to bed her own Bobbin. |
| From Fluffle Nursery: she likes challenges | Maths with hidden amounts, close distractors in the racks, and only first tries move her up. |
| From Moonbeam Stables: too easy, no felt reading or maths | Numbers are never said before she answers. A wrong number leaves a cold duckling or an empty hole. A wrong word makes the wrong thing. |

## Decisions made for the demo

- Cut to stay under the audio budget: the book has 12 words instead of 34. The Bobbin's name is only spoken in five lines per name (the name itself, "Do you like the name ...?", hello, "... is so happy to see you!" and good night). Need lines say "Your Bobbin". The "Right sound! This word uses this letter." line is dropped, because racks never hold two spellings of one sound.
- Cut by `decisions.md`: parent corner, calendar lock, picture check, Leitner boxes, server save.
- Cut for time: the wand upgrade animation at L3 (Pippa showing "sock"), Olly the owl, Hettie the hen, the Bobbin wardrobe, music.
- The slide uses a short gap (90 ms) between sounds, not the continuous crossfaded blend, because the crossfade has not passed an ear check yet.
- Shelf items that look like the Queen's pets (pup next to the dog) are left out, so "cub" and "jug" were added as shelf partners.
- Audio pass fixes: the first session skipped Pippa's "mat" demo, because naming the Bobbin made the intro check false before the `pippa` step. The `pippa` step now also runs straight after naming. Grandpa Goat's count step no longer preloads duck lines that do not exist.

## Test pass (2026-10-10)

Played through with `playwright-cli` (WebKit, iPad) with real pointer input: day 1 with both rounds, every wrong path and hint ladder, bedtime, reload with the save, day 2 with the Golden Scroll, and two scripted days with real audio timing. No missing clips and no console errors. Layout checked at 1180 x 820, 1080 x 810 and 820 x 1180 (turn picture).

Fixed in this pass:
- The number socket in the star was hidden by a CSS rule, so the stone had no visible target. It now shows and pulses.
- The green ticks in the visitor queue were clipped to a sliver.
- An idle goal repeat and the reaction to Emma's tap could play at the same time and cut into each other (for example "bug... rug... Oh no!"). A tap now stops any goal repeat.
- After a wrong pick on Sizzle's shelf, a new thing arrived without its name and the replay still named the old shelf. The new thing is now named and the replay follows the shelf.
- Sizzle's note now prefers a word from an earlier round or day. A word she made a minute ago could be matched from memory instead of read.
- The party read-back said "things you made today" over things she had not made.
- The Queen's note words get a soft background each, so word gaps are clear next to the spaced letters.
- After the sticker book opened, nothing said how to go on. A new line "Tap the cross to close your book." plays, the cross glows, and it repeats after 15 s.
- The name she made shows as a big name tag while she chooses the heart or the round arrow.
- Pippa's "mat" demo shows a mat picture in a bubble.
- Count targets are now at least 72 stage px (ducklings 76, tray holes 72). The note's sound buttons are 72 px tall.
- The start screen Bobbin sleeps at bedtime.
- b and d no longer share a rack below L3 (plan 2.5).

## Review pass (2026-10-10)

An adversarial review against Emma's feedback, played with `playwright-cli` (scripted three-day runs with right and wrong paths, real mouse drags on the wand, screenshots at 1180 x 820, 1080 x 810 and portrait). No missing clips and no console errors. No spoken line changed, so no audio was regenerated.

Fixed:
- The sticker book covered the replay button. The replay button now sits above the book.
- Stickers only appeared at the end of a round. Now each finished word (and a Golden Scroll's rare sticker) flies into the book button at once, with sparkles, and the badge counts up. Shiny stickers also get a gold star in the book.
- "Look! New stickers for your book!" played when nothing was new. It now plays only when there is a new sticker.
- The visitor's wish could repeat a word from earlier that day (for example nut as the warm-up in round 1 and as Grandpa Goat's wish in round 2). The wish is now picked first, so it is fresh whenever a word fits. The warm-up stays a review word, as designed.
- Sizzle's note could be a word whose picture is confusable with one made in the same round (mug on the note, cup on the party table). It now skips those. It also no longer repeats the previous note when another word fits.
- In Pippa's number demo the stone "1" jumped to the top left corner while it pulsed. In the party read-back the table things jumped to the corner while they bounced, and so did the fixed "p" gem on the naming wheel. A CSS animation on `transform` overrode their position. The inner picture now bounces instead.
- The Queen's note had no hint of what to do with the things. The first party now shows a hand that taps the table and then sweeps over all three pets (it points at no answer), and the replay button says "The Queen sent you a note. Do what it says!" before "Read the note...".
- The replay button repeated the previous moment's goal at the start of a visitor, Sizzle or the party. Each step now sets its goal first.
- `seenNote`, `seenParty` and `lastNote` were not in the default save, so a reload dropped them. They are now kept.
- The net picture looked like a magnifying glass. It now has a clear mesh bag.
- The night stars formed diagonal lines. They are now a fixed scatter.
- In fast test mode the blank ghost gem stayed on screen at the top left.

Still open:
- After the first wrong slide, hint 1 plays the target's pure sounds one after the other. That is oral segmenting, which a teacher would do too, but it makes the second try much easier. Only first tries count, so the level is not affected.
- Sizzle's shelf can be passed by a guess 1 time in 3 (1 in 2 after a miss on "nut", which has only two shelf partners).
- At spelling L2 the wish pool is small (nut, rug, cup, mug), so warm-ups repeat within a day until she climbs to L3.
- Andika loads from Google Fonts, not self-hosted. The iPad needs internet on the first load.
- On day 1, round 1 only has words she made that round, so Sizzle's note is easier then.
- One maths miss drops the maths strand to M2 (no hidden ducklings). With two maths items a day it takes about two days to climb back.
