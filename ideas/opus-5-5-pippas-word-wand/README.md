# opus-5-5: Pippa's Word Wand

## Pitch

Princess Pippa and her fluffy pet Bobo walk through Whisperwood to the Queen's party. A river, a hungry goat and a dark cave block the way. Emma builds words from magic letter gems on Pippa's wand, and every real word she blends turns into a real thing in the world.

## Game loop

1. Pippa and Bobo walk into a scene and stop at an obstacle. Bobo's thought bubble shows a picture of what they need (a log, a bun, the sun).
2. Emma drags letter gems onto the three slots of the wand. Each gem says its sound when she taps it or when it snaps in. The gem row is shuffled every time, and the needed word never sits in the row in reading order, so she must listen for the sounds rather than copy the row.
3. When the wand is full, a sparkly arrow appears. Emma slides her finger along it. Each letter lights up and says its sound, stretched, and then Elizabeth says the whole word.
4. The word appears on a glowing plaque and becomes a thing:
   - The right word solves the obstacle: a log drops across the river, the goat eats the bun or the jam and the gate opens, the sun lights up the cave.
   - Other real words do something funny: a cat joins the walk, Bobo naps in a cot, a cog spins, a hut appears, Bobo eats a nut.
   - Real words that are not things (got, tag, lag, man, jab) are named and praised as words, but the obstacle stays ("That is a word, but we still cannot cross the river!").
   - A made-up word gives a pink puff and a giggle ("Gol? That is a silly word!"). Nothing is ever marked wrong.
5. After three obstacles they reach the castle garden. Every thing Emma made pops onto the present table with its word under it, and Elizabeth reads the list back. The Queen thanks Emma, there is a fanfare and confetti, and a crown sticker flies into the sticker book.

What she wins: a crown sticker per round and a sticker for every word she has ever conjured. Empty silhouettes in the book show which things are still to be found, so she wants to play again.

## Reading

- **Letter sounds.** Every gem plays its pure sound (not the letter name) on tap and on snap. Vowel gems are always ruby red, so she learns to spot the vowel in the middle.
- **Blending.** The slide is the blend. Emma's finger drives the sounds in order, left to right, and hears them run together into a word. This is the core skill of the game.
- **Segmenting and spelling.** To get a log she must pick l, o, g in the right order from six gems. That is encoding, the reverse of reading.
- **Reading with meaning.** The word appears as text before it turns into a thing, and again on the party table and in the sticker book. Tapping a sticker in the book reads the word aloud.
- **Real words versus nonsense words.** She learns that some blends are words and some are not, without any penalty.
- Gentle hints: after two spells that do not solve the scene, the first letter gem glows. After four, Elizabeth says the sounds slowly while the matching gems light up. After about 8 seconds of no input, a hand shows the next move (drag a gem, or slide along the wand).

## Maths

This first round is about reading. Maths comes in through the same wand later:

- **Counting (light).** The things on the party table and the crowns in the sticker book are natural moments to count together. The crown total is shown as a number.
- **Number gems** (planned): a number gem in front of a word, for example "3 log" to fill three gaps in a wide river, or "5 bun" to feed five goats. This trains number recognition, counting to 20, and more, fewer and the same ("two more logs").
- **Adding and taking away** (planned): the river needs 7 logs, there are already 4, so how many more?

## Sound

- **Speech:** ElevenLabs, voice Elizabeth (British English). Every spoken line is in `audio/lines.json` with an id. The game plays `audio/<id>.mp3` and falls back to the browser's speech (en-GB) when the file is missing.
- **Lines:** the intro, one line per scene, the slide instruction, hints, a line for each thing that appears, "That is a word, but the goat is still hungry!" and the same for the river, the giggle and "That is a silly word!" lines for made-up words, the party list fragments ("You made", "a log", "and", "the sun"), the Queen's thank-you and the sticker line.
- **Letter sounds:** one file per phoneme (`sound-l`, `sound-o` and so on). The text in `lines.json` describes the sound for the voice actor ("o (short, as in on)"). The generated file must be trimmed to the pure sound only.
- **Words:** one file per real word (`word-log`) and one per made-up CVC word that the gem sets can make (`nonword-gol` says "Gol?"). Made-up words are only said out loud when they follow English spelling. Words that end in c, h or j (loc sounds like "lock", which is spelled with ck) and rude words get a giggle instead.
- **Sound effects:** generated in code for the mockup (gem chime, sparkle, pop, splash, goat bleat, munch, snore, gate creak, fanfare). For the real game these can be replaced by ElevenLabs sound effects.
- **Music:** none in the mockup. A soft forest loop would fit.

## Progression

- **Letters** follow the Phase 2 order (s a t p i n m d g o c k ck e u r h b f l), a few at a time. The gem pool grows from 5 or 6 gems to 8.
- **Hints fade.** Early on Bobo's bubble shows a picture. Later it shows a written word to read first (decoding before encoding), then a short sentence ("I want the sun") that uses the tricky words I, the, to, was and said.
- **Phase 3 digraphs:** sh, ch, th as one gem ("ship" to cross the sea, "chip" for a hungry duck). Then four-sound words (tent, milk, frog).
- **Two-word spells** where the first word changes the object: "big log" for a wide river, "red jam" for a picky goat.
- **Number gems** in front of a word for counting and more or fewer, then simple adding and taking away.
- **New chapters** on the map: the sea, the snowy hills, the unicorn meadow. The sticker book keeps every word she has ever conjured.

## Mockup

`index.html` is one playable round of about 2 to 4 minutes: start screen, river, gate, cave and the party, with the sticker book.

What works:

- Dragging gems with pointer events and pointer capture, tap to hear a sound, tap a slotted gem to send it back.
- Sliding along the wand to blend, with a wiggle and a hand demo when she taps instead of slides.
- All outcomes from the brief: log, cat, cot, cog, lot (river); bun, jam, and the "word, but still hungry" words (gate); sun, hut, nut (cave); the giggle puff for made-up words.
- Hints after 2 and 4 misses, an idle hint after about 8 seconds (the hand always drags the gem for the next sound she needs), and a big speaker button that repeats the current instruction. It stays quiet during the short story moments so it never cuts Elizabeth off.
- A shuffled gem row in every scene. In the dark cave, things she conjures glow so she can see them.
- The party table, the spoken list, confetti, the crown sticker and a sticker book that is kept in `localStorage` between sessions.
- Layout for 1180 x 820 landscape. The stage scales to fit 820 x 1180 portrait and 1080 x 810 (gems stay above 64 px).

What is placeholder:

- Speech uses the browser's speech synthesis until the ElevenLabs files exist. Letter sounds in that fallback are rough ("luh", "aw").
- Sound effects are simple WebAudio tones.
- Maths, number gems, the written-word hints and later chapters are described above but not in the mockup.

For testing, `window.__game` exposes `state`, `spell('log')`, `skipTo(0..3)`, `fast = true` and `resetBook()`.
