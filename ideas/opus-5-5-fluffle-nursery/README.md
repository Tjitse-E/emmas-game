# opus-5-5: Fluffle Nursery

## Pitch

Emma looks after Pom, a baby Fluffle that cannot talk yet. Pom shows what it wants as a written word in a thought bubble, and Emma reads it to find out what to give Pom. A happy Pom grows up, changes colour and gets new things in its treehouse room.

## Game loop

1. A wicker basket sits by the door. Emma taps it and Pom wakes up and hops onto the rug.
2. Pom gets a need. A thought bubble shows a word (no picture) with a sound dot under each letter and a sliding arrow under the word.
3. Emma reads the word and acts on it in the room. She drags the right food from the pantry shelf, opens the toy box and drags the right toy, or picks Pom up and carries Pom to the right place.
4. Every met need fills one part of the happiness heart. A wrong choice is never punished, but it does not help either: Pom sniffs the item, gently shakes its head and the item flies back. Elizabeth says "Not that one. Read the bubble again" and the sound dots pulse.
5. When the heart is full, Pom grows a size, its fluff turns lilac and a new bed appears. Emma puts Pom to bed and the round ends with a collection screen: Pom's growth stages and the room items she has unlocked.

A round has four needs and takes two to four minutes. Between needs Emma can tickle Pom or drag Pom up and let go to see it bounce.

## Reading

- Letter sounds: each letter has a sound dot. Tapping it plays the pure sound (b, u, n, h, a, t, s).
- Blending: sliding a finger along the arrow (or tapping the star) plays the sounds in order: "b, u, n". The voice does not say the whole word. Emma blends it herself.
- Support fades in only when needed: after two wrong tries on the same need, the slide also says the whole word ("b, u, n, bun").
- Meaning: the word is the only clue. There is no picture in the bubble, and the room has several plausible choices: bun, jam, egg and nut on the shelf; hat, sock, cup and map in the toy box; and for "tub" the basket, the pantry, the toy box and the tub. Picking the right one shows that she understood the word.
- Words in this round: bun, hat, tub, buns (Phase 2 CVC words and a simple plural with s).

## Maths

- Number order in the bath: six soap bubbles rise, each with a number from 1 to 6 in a mixed-up place. Emma pops them in order. A wrong number wobbles and does not pop. After two wrong taps the next bubble glows. Each pop says the number.
- Numeral to quantity: the last need is "3 buns". Tapping the 3 says "three". A plate appears. Emma drags buns onto the plate (each one is counted aloud) and then drags the plate to Pom.
- Fewer than needed: Pom sniffs the plate, rubs its tummy and does not eat. "Pom is still hungry. Look at the number again." The buns stay on the plate, so she can add more.
- More than needed: Pom puffs its cheeks and shakes its head, and the buns go back to the shelf. "Too many buns for Pom. Look at the number again."
- After two wrong plates, Pom's tummy shows three empty spots as a visual hint. With the right plate, Pom eats the buns one by one and each fills a spot while Elizabeth counts.

## Sound

- Speech: ElevenLabs voice Elizabeth (British English), generated ahead of time. All lines, words, numbers and letter sounds are in `audio/lines.json`, keyed by id. The game plays `audio/<id>.mp3`.
- Letter sounds are not plain text. Their entries in `lines.json` describe the pure sound in square brackets (for example /æ/ as in ant, /b/ with no "uh"). These clips must be made separately (generated with a phoneme tag or recorded) and checked by ear before use.
- Pom never talks. It squeaks, purrs, giggles, munches, yawns and snores.
- Sound effects: soft and positive only. Pops, splashes, boings, chimes and sparkles. A wrong choice gets a soft "hmm", never a buzzer.
- Music: a short rising jingle when the heart is full and on the end screen.
- A big speaker button (top left) replays the current instruction and shows a pointing hand. After 8 seconds without a touch, the same hint plays by itself. Hints show how to do something (slide, lift Pom, use the plate), not which answer is right.

## Progression

- Words: from Phase 2 CVC words (bun, hat, tub, sock, bed, nap) to Phase 3 digraphs (fish, chip, bath).
- Blending support fades further. Later the slide only stretches the sounds ("bbb-uuu-nnn") and the whole word is never said before the right item is given.
- Two-word needs where both words matter: "red hat", "hot bun", "big cup". The room then has a red and a blue hat, and a big and a small cup.
- Short sentences with tricky words: "I want the big bun", "I was sad" (Emma hugs Pom by holding her finger on Pom), "I want to go to bed".
- Maths in needs: bigger numbers on the plate (up to 10, then 20), adding on ("I had 2, I want 5"), bubbles numbered beyond 10, and sharing buns with a second baby Fluffle (halves).
- Growth stages: every time Pom grows up it gets a new fluff colour and the room gets a new item (bed, swing, music box, garden door). The end screen shows the next stage as a silhouette, so Emma wants to come back.

## Mockup

`index.html` is one self-contained file and plays one full round: basket intro, the needs bun, hat, tub (with six numbered bubbles to pop in order) and 3 buns on a plate, then the grow-up reward, bedtime and the end screen. It is built for iPad landscape (1180 x 820) and scales to portrait and 1080 x 810. All input uses pointer events with pointer capture.

Placeholders:

- No ElevenLabs audio exists yet. `say(id)` tries `audio/<id>.mp3` first and falls back to the browser's en-GB speech voice. Browser voices are poor at pure letter sounds, so the dots only sound right once the real clips exist.
- Sound effects and music are simple tones generated in code.
- All art is inline SVG drawn for this mockup. Pom is our own character.
- The end screen shows the next room items as simple emoji silhouettes.

For testers, `window.__game.state` shows the current stage and progress, `window.__game.log` lists events, and `window.__game.fast(true)` skips speech waits.
