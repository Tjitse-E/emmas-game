# opus-5-5: Unicorn Egg Nest

## Pitch

Emma warms unicorn eggs in a moonlit nest with glowing dice stones until each egg has exactly ten glows. A baby unicorn hatches, Emma gives it a name from letter gems, and it joins her herd in the meadow. At the end the babies play hide and seek, and Emma reads the name signs to find them.

## Game loop

1. A speckled egg sits in a nest. Ten moon cups on the nest rim form a ten-frame, so the ten is always visible.
2. Emma drags warm river stones (1 to 6 dots) from the basket into the nest. Each dot flows into a moon cup with a chime while Elizabeth counts on.
3. Exactly ten: the egg wobbles, cracks and a baby unicorn in a surprise colour pops out.
4. Over ten: the egg gets red cheeks and puffs steam ("Too hot!") and the last stone rolls back. Under ten on a one-stone or two-stone egg: the egg shivers ("Brr, still cold") and the stones roll back.
5. The baby looks up at Emma. She builds its name on a board with three slots: blue consonant gem, pink vowel gem, blue consonant gem. She slides a star along the arrow to read it: "Z-o-b... Zob! Hello, Zob!"
6. The baby gets a name tag and prances to the meadow. Three eggs per round.
7. Hide and seek: the babies hide behind three bushes in a new order, each bush with the baby's name sign. Elizabeth asks "Where is Zob?". Emma slides along a sign and hears its sounds. The right baby jumps out, says hello and does a trick (a buck, a spin, a rainbow sneeze). A wrong baby peeks out, says its own name ("Pim! Peekaboo! Not me.") and hides again.
8. Reward: when all three are found, a shooting star crosses the sky and a gold horseshoe lands on the nest. Emma can now slide along any sign to call that baby for a trick. After two tricks the replay button pulses and Elizabeth asks "Shall we hatch more eggs?".

A round takes three to four minutes.

## Reading

- Letter sounds: every gem says its pure sound and a picture word when tapped ("mmm, as in moon"). Gems say the pure sound when they land in a slot. Tapping one letter on a sign in the meadow says that sound, like a sound button.
- Blending CVC words: the name board always produces a decodable consonant-vowel-consonant word, because the pink middle slot takes only vowels and the blue outer slots take only consonants. The sound dots and arrow under the slots follow the UK phonics convention.
- Reading to make progress: in hide and seek she hears a name and must find the sign that says it. The babies hide in a shuffled order and only their gold horn tips show, so memory of place or colour does not help. A wrong sign costs nothing: that baby says its own name, so she hears the word she just looked at. After two wrong signs, or a long pause, a ghost hand slides along the right sign.
- Reading for meaning: the name she builds becomes the baby's real name, and the meadow uses it.
- Silly names are welcome. Nonsense words are good decoding practice, the same as the alien words in the Year 1 phonics check.

## Maths

- Number bonds to 10, shown on a ten-frame, which is the model British Reception and Year 1 classes use.
- Counting on from the total so far ("six, seven, eight") instead of counting from one.
- Subitising dice patterns 1 to 6.
- More and fewer: too hot means too many, still cold means not enough.
- Egg 1 is free (any combination that makes ten). Egg 2 has four glows already and needs one missing stone (4 + 6). Egg 3 needs an exact pair (4 + 6 or 5 + 5).

## Sound

- Elizabeth (ElevenLabs, British) speaks every instruction, the numbers one to ten, "X glows", "Too hot!", "Brr, still cold", the hatch line, letter sounds, the names and "Hello, ...". The full list is in `audio/lines.json`, including all 144 possible names.
- Sound effects: a rising chime per glow, a soft steam hiss, a gentle shiver, crack ticks, a hatch fanfare, plucks for gems, a sneeze.
- Music: soft night music with a slow bell melody and a low pad.
- No harsh fail sounds. A mistake gets a spoken hint and the empty moon cups pulse. A ghost hand only shows the answer after two mistakes or two idle hints (about eight seconds each), so the speaker button and waiting never give the answer away. Egg 1 is the drag tutorial and always shows a demo stone. The speaker button repeats the current instruction.
- Letter sounds are pure sounds, as British phonics teaches them: "p", not "puh". The `sound-*` lines in `audio/lines.json` hold only the letter. Do not send them to text to speech as they are. Record Elizabeth saying the matching `as-*` picture word (or a short CVC word) and cut the first sound. Vowels are the short sounds in apple, egg, insect and octopus. Listen to every cut before use.

## Progression

- Bonds: free fill, then one missing stone, then exact pairs, then three-stone eggs.
- Stones change from dice dots to numerals, so she must recall the bond instead of seeing it.
- Eggs that need 7, 8 or 9 (bonds within 10). Then big golden eggs that need 20, with two ten-frames (bonds to 20, and 10 plus some more).
- Twin eggs side by side that need the same stone in each (doubles). One big stone split across two eggs (halves).
- Reading: after a few self-named babies, babies arrive with a name tag written by the Unicorn Queen, and Emma blends it to welcome them (decoding). Later the tags use digraphs (Shim, Chad) and short sentences ("I am Zob").
- The meadow persists between sessions. Tapping a name tag to call a baby becomes a daily reading moment.

## Mockup

`index.html` covers one full round: three eggs (free nest, one missing stone, exact pair), the naming board after each hatch, the prance to the meadow, hide and seek with the name signs, and the meadow reward with tricks. It is one self-contained file with inline SVG art and no libraries. The Andika font loads from Google Fonts, and the page falls back to Chalkboard SE when offline.

Placeholders:

- Speech uses `speechSynthesis` (en-GB, rate 0.9) when `audio/<id>.mp3` is missing. No mp3 files exist yet. Generate them from `audio/lines.json` with ElevenLabs voice Elizabeth, except the `sound-*` clips (see Sound). The fallback voice cannot say pure sounds well: its vowels are close but not exact. Generate the mp3 files before Emma plays this mockup.
- Sound effects and music are WebAudio tones made in code.
- The meadow resets each round. Persistence is not built yet.

Debug hook for testing: `window.__game.state` shows progress. `__game.debug.mute = true` and `__game.debug.speed = 0.3` make a test run fast. `__game.drop(6)`, `__game.name('zob')`, `__game.blend()` and `__game.call(0)` (slide along the sign at bush 0) drive the game without touch. `__game.seekTarget()` returns the bush that hides the wanted baby.
