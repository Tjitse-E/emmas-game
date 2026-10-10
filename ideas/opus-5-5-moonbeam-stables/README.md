# opus-5-5: Moonbeam Stables

## Pitch

Emma is the stable keeper of a sunny pony stable. She feeds hungry ponies the right number of carrots, shares carrots fairly between twin foals, then reads a pony's name to call it for a ride over fences.

## Game loop

1. Big Play button. A rooster crows, the ponies neigh, and Elizabeth says: "Good morning, stable keeper! The ponies are hungry."
2. **Stall 1, Jet.** The chalk slate on the door shows 5. Emma drags carrots from the basket (or taps the basket) into a ten-frame manger. Each carrot is counted aloud. She rings the brass bell when she thinks the count is right.
   - Exactly 5: Jet munches, shakes his glittery mane and a gold star appears on the door.
   - Too many: Jet eats them all, his tummy goes round, he burps and giggles. "Too many! Jet wanted five." The carrots come back and she takes some out.
   - Too few: Jet nudges the manger. "More, please!" Elizabeth counts the carrots that are there and repeats "Jet wants five carrots."
3. **Stall 2, Bob.** The slate shows 8 and the manger already holds 3. Counting continues from four.
4. **Stall 3, the twins Tim and Tom.** A box of 8 carrots, two small five-slot mangers. "They must have the same." 4 and 4 earns a shared star. With 5 and 3, the foal with fewer turns his back under a little rain cloud: "Tom has fewer!"
5. **Paddock.** The gates open and the four ponies trot into the field. Emma taps the pony she wants to ride. It glows and Elizabeth says: "Tom! Find Tom's name on the fence." Four name boards hang on the fence, in a new order every round. Emma slides her finger along a board. She hears only the letter sounds ("t", "o", "m"), so she has to blend them herself. The board then calls the pony whose name it shows.
   - Right board: the board turns pink, Elizabeth says "Tom!" and Tom gallops over.
   - Wrong board: that pony trots up to the fence. "That says Tim." It trots back to graze, Tom shakes his mane and Elizabeth repeats "Find Tom's name." After two wrong boards a hand slides along the right one.
6. **Ride.** A short side-scrolling gallop. Emma taps to jump three fences, counted aloud. A missed tap makes the pony trot around the fence. Nobody falls.
7. **Reward.** A big rosette on a podium, confetti and cheering fluffy fans. The rosette is then pinned to the door of the pony she rode. Rosettes stay on the doors between rounds, so the stable fills up with her prizes.

The pony only eats when Emma rings the bell. She decides when the count is right, so she cannot just keep adding carrots until something happens. Carrots can be dragged back out at any time.

## Reading

- **Blending CVC words.** Pony names are CVC words (Jet, Bob, Tim, Tom). In the paddock, each name board shows sound dots under its letters. Sliding a finger along a board plays each sound in order ("j", "e", "t"). The word itself is not spoken until the board has called its pony, so blending is the only way to call the pony she picked. Tim and Tom differ only in the middle sound, which trains careful reading of the vowel.
- **Word recognition.** The names are also on the stall doors. Tapping a name plate says the name, so she meets the same words again.
- Instructions are always spoken. The only text on screen is the words she is learning to read.

## Maths

- **Counting and numeral recognition to 10.** The slate shows the number as a numeral. Each carrot is counted aloud and a numeral pops up above it.
- **Ten-frames.** The manger is a 2 x 5 ten-frame, so she sees 5 as one full row and 8 as a full row and three more.
- **Counting on.** Bob's manger starts with 3 carrots. The count carries on from four.
- **More, fewer, the same.** Too many, too few and exactly right each give a different reaction. The twins stall is about fair sharing: 8 shared into two equal groups of 4 (halving, the start of doubles).
- **Counting jumps.** The three fences are counted as she jumps them.

## Sound

- Speech: ElevenLabs voice Elizabeth, generated ahead of time. All lines, numbers and letter sounds are in `audio/lines.json` (id to exact text). The game plays `audio/<id>.mp3` and falls back to the browser's en-GB speech voice when a file is missing.
- Letter sounds must be pure sounds, as taught in British phonics. In `lines.json` they use IPA phoneme tags (for example `<phoneme alphabet="ipa" ph="ɒ">o</phoneme>` for the o in "on"), which ElevenLabs supports on its Flash v2 and Turbo v2 models. Check every sound after generation: no "uh" after j, t and b, and "o" must not sound like "or" or "oh". Record a sound by hand if the voice cannot make it cleanly. The browser fallback cannot read phoneme tags and uses rough spellings ("juh", "aw"), so judge the phonics only with the generated files.
- Sound effects are generated in code for now: bell, carrot crunch, burp, giggle, neigh, rooster, hooves, chimes, fanfare and cheering. The full build should replace them with ElevenLabs sound effects, plus a soft music loop for the stable and a faster one for the ride.

## Progression

- **Bigger numbers.** Counting to 10, then to 20 with two ten-frame mangers per stall.
- **Counting on and taking away.** Part-filled mangers to count on from. Then "Jet ate 3. How many are left?", shown as carrots vanishing one by one, after which the slate asks for the original number again.
- **Comparing.** More, fewer and the same between neighbour ponies. Then doubles: "Tim wants double Tom."
- **Tens and ones.** A big Shire horse that eats from crates of ten, for counting in tens and ones towards 100.
- **More reading.** New ponies arrive with new CVC names (Meg, Dot, Ned), then digraph names (Shep, Chip) with a dash under the two-letter sound. Later the slate shows a written note ("Jet wants six") and the voice only helps when she taps a word. Tricky words (the, to, was) come in through these notes.
- **Grooming.** A reward step where she braids bead patterns into a mane (AB, ABB, ABC), and matches horseshoes and saddle blankets by shape.
- **Longer rides.** The paddock course grows, with more fences and water jumps. New ponies join the stable as she earns rosettes.

## Mockup

`index.html` is one full round of about 3 minutes: start screen, three stalls, paddock, ride, reward and the rosette on the door. It is built for iPad landscape (1180 x 820) and scales to fit portrait and smaller iPads.

- A big speaker button (top left) repeats the current instruction. After 8 seconds without a touch Elizabeth gives a hint and a hand shows what to do. The hint never says whether the count is right: it repeats the order on the slate and points at the bell.
- A bell rung too early makes the pony nudge the manger. Elizabeth counts the carrots that are there and repeats the order. Only after a second early bell do the missing slots light up.
- Placeholders: no ElevenLabs files yet, so speech uses the browser voice. Sound effects are simple generated tones. The ride is a short fixed course, and the round always uses the same numbers (5, 8 and 4 + 4).
- Rosettes are saved in the browser (localStorage), so they stay on the doors after a reload.
- Debug hook for testing: `window.__game` (`counts()`, `fill(n)` or `fill(a, b)`, `ring()`, `goStall(i)`, `pick(name)`, `blend(name)`, `jump()`, `rosettes()`).
