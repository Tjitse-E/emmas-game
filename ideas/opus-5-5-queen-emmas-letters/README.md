# opus-5-5: Queen Emma's Letters

## Pitch

Emma is the queen. Tilly the fluffy dove brings her letters from the animals of her kingdom, and every letter is a small wish that Emma grants on a living farm map. She can only find out what the animals want by reading the letter.

## Game loop

1. A big Play button, a fanfare, and Elizabeth says: "Good morning, Queen Emma! Your kingdom has sent you letters."
2. Tilly flies in and drops a rolled scroll on Queen Emma's velvet desk. Emma swipes or taps it open.
3. Emma reads the letter and then does what it asks on the farm map:
   - The pig: "Can the pig go in the mud?" or "Can the pig go in the pond?" (picked at random each round, so "pigs like mud" is no shortcut). Emma drags the pig to the mud, the pond or the hay. The right place gives a roll in the mud or a splash in the pond. A wrong place gets a funny reaction ("Splash! That is the pond.") that never says the right word.
   - The fox: "Send 6 apples to the fox." Emma opens the storehouse (a ten-frame of 10 apples), drags apples into her basket one by one (the basket counts aloud) and drags the basket to the fox's den. It floats over on a balloon. With 5 the basket comes back ("I have five. I want six!"). With 7 or more the fox tosses the extra apples back ("One too many!"). With 6 the fox counts them and says thank you.
   - The hen: "The hen is sad. I want a red hat." The wish is a red hat, a red cap or a red sock (picked at random). Emma opens the wardrobe hut, which holds all six (red and blue hat, cap and sock, in a shuffled order), and dresses the hen. A wrong item makes the hen giggle: "A blue sock? No, thank you!"
4. Each granted wish fills one of the farm's three hearts.
5. Reward: a rainbow, a white unicorn trots onto the farm, the animals cheer, a jewel flies into Queen Emma's crown and everybody has a royal feast. The crown keeps its jewels between rounds (three slots).

Nothing is ever marked wrong. A wrong move gets a funny reaction from the animal and a spoken hint to read the deciding word again. The animal then waits: the pig will not move and the wardrobe stays shut until Emma has slid her finger along the deciding word(s) again. Then the animal perks up and Elizabeth says "Now try again!" Guessing again without reading does nothing, so tapping at random does not win.

After each granted wish Elizabeth reads the whole letter aloud while the words light up, so Emma hears the sentence she just read.

A round takes about 2 to 4 minutes.

## Reading

- **Letter sounds and blending.** Tapping a decodable word shows sound buttons under it: a dot for each single letter sound and a dash for a digraph (as in UK phonics teaching). Emma slides her finger along the dots and hears each sound. For ordinary words she then hears the whole word. If she taps a word twice without sliding, Elizabeth models the blend for her.
- **She blends the deciding word herself.** The key words (mud or pond, red, hat or cap or sock) only give their sounds, not the whole word, so Emma has to put "m-u-d" together in her head and act on it. After two wrong tries Elizabeth models the full blend as help. Once the wish is granted the whole word is spoken.
- **Decodable words:** CVC words can, pig, in, mud, fox, hen, sad, red, hat, cap, sock (ck is one sound), is; CVCC words send and pond; and apples (pp and le are digraphs, a stretch word for Year 1).
- **Tricky words** (the, I, to, go, want, a) have a gold underline and are spoken whole on one tap.
- **Reading for meaning.** The last word decides the action (mud or pond, not the hay). In letter 3 she must read both "red" and the item word, because the wardrobe also has a blue one of each item.
- **Try first.** The help bell fills over about 10 seconds. Only a full bell can be rung. Elizabeth then reads the letter aloud while the words light up, but she leaves the deciding words out ("Can the pig go in the... where? Read the last word.") and they pulse. The bell helps with the tricky words and never reads the answer.

## Maths

- **Number recognition:** the numeral 6 in the letter.
- **Counting:** each apple is counted aloud as it drops into the basket, and the basket shows the numeral. The fox counts the apples again when they arrive.
- **More and fewer:** 5 is not enough, 7 is one too many, with the difference spoken.
- **Ten-frame and take away:** the storehouse holds 10 apples in 2 rows of 5. After the delivery the ten-frame tells the story: "You had ten apples. Six went to the fox. Four are left." The sum 10 − 6 = 4 builds up beside it.

## Sound

- All speech is Elizabeth (ElevenLabs, British English): the intro, every word, every letter sound, the full letters (one per wish), the help-bell versions with the key words left out, the animal reactions, counting one to ten, the take-away story and the finale. All lines are listed in `audio/lines.json` (id to exact text). The same object is inlined in `index.html`.
- Letter sounds must be pure sounds as taught in UK phonics. The texts in `lines.json` are only spelling hints. The target sounds are: a as in ant, e as in egg, i as in in, o as in on, u as in up. m, n, s, f, r and z are held ("mmm"), not followed by "uh". k, p, g, d, t and h are short and clipped, with no "uh" after them. x is "ks" and le is "ul".
- Animal reactions are spoken by Elizabeth too. The placeholder voice changes pitch a little for the pig, fox and hen.
- Sound effects: fanfare, oink, quack, cluck, fox yip, splash, pops, chimes, a bell ding, a giggle, a neigh and clinking cups.
- A speaker button on the desk repeats the last instruction at any time. After about 8 seconds without a tap, a hint is spoken and a hand shows what to do.

## Progression

- Letters grow from 3 to 5 words with sound dots, to two sentences without dots, to adjectives and prepositions that decide the action ("Put the cat on the bed", "the big pig, not the small one").
- Tricky words come back in every letter until Emma knows them: the, I, to, said, was, then my, you, they.
- Maths in letters: counting to 10, then to 20 (two ten-frames in the storehouse), "The cow wants 3 more hay" (adding on), "The goat has 8 nuts. Take 2 away" (take away), "Give the duck the same as the hen" (same), and later shapes ("a round window", "a square flag").
- New regions unlock as the hearts fill: pond, forest, village and stables. Each region has its own animals and an upgrade (a stable, a bridge, a unicorn moving in).
- Later Queen Emma writes replies by dragging word tiles into a sentence, a first step towards writing.

## Mockup

`index.html` is one self-contained file with one complete round: the intro, all three letters, every success and wrong-move reaction, the take-away story and the feast. It works in landscape (1180 x 820, 1080 x 810) and portrait (820 x 1180). It was tested with `playwright-cli` in WebKit at all three sizes.

Placeholder parts:

- **Speech.** `say(id)` first tries `audio/<id>.mp3`. These files do not exist yet, so the mockup falls back to the browser's en-GB speech synthesis, which sounds robotic. Generate the mp3 files from `audio/lines.json` with ElevenLabs (voice Elizabeth).
- **Letter sounds.** `lines.json` spells the sounds as short approximations ("sss", "mmm", "ah", "puh"). Text-to-speech is poor at single phonemes (the fallback says "ah" and "aw" for short a and o, which is wrong), so these clips need careful generation or a human recording, with stop sounds kept short ("p", not "puh"). See Sound for the target sounds.
- **Art.** All characters are our own inline SVG drawings. The feast uses a few emoji for food.
- **Font.** Andika (single-storey a, as used in UK schools) loads from Google Fonts, with a system font as fallback.
- **Progression.** Only the farm round exists. Other regions, the longer letters and reply writing are not in the mockup.
- **Random wishes.** `?pig=mud` or `?pig=pond` and `?hen=hat`, `?hen=cap` or `?hen=sock` fix the wishes for testing.
- **Debug hook.** `window.__game.state` shows progress and `__game.goals` shows the picked wishes. `__game.fast()` speeds up animations and skips speech, `__game.open()` opens a waiting scroll, and `__game.solve()` does the right action for the current letter.
