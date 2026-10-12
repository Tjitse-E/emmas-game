# Naming: let Emma pick any name

Research for v3 of Unicorn Egg Nest. Problem from the v2 verdict (2026-10-12): Emma picks real, valid names for her unicorns and the game answers "I don't know that name."

## Recommendation

Emma can give a baby any name. The game refuses only rude words, and it never says "I don't know that name" again. Four parts work together:

1. **Fix the v2 rules now (0 credits).** Allow duplicates, repeated letters, reserved names and wish words. Section 1 lists the v2 rules that refused real names.
2. **A big pre-generated name list.** About 1,000 names in the first month (about 16k credits), growing to about 2,000. Elizabeth says each one.
3. **Any other name is accepted at once.** The slider plays Emma's own letter sounds, which she already hears in v2. The name joins a wish list, and Tjitse runs the generator. The next night Lumi "has taught the Queen the new name" and Elizabeth says it for the first time. Waiting becomes a reward moment.
4. **Names she cannot spell yet (Rose, Lily, Sophie)** are picked by picture or by first sound. She spells them with "gift gems": the tricky part is placed for her, she fills the sounds she knows, and only her slots count.

A small server that generates missing names the same night (option c) is a good later upgrade. It changes the "generate ahead of time" rule, so Tjitse must decide on it. Emma's own voice recording (option e) cannot be the name voice. It can only be a role-play extra.

## 1. How naming works in v2, and why names were refused

Source: `ideas/opus-5-5-unicorn-egg-nest-v2/index.html` (lines 495 to 514, 1584 to 1740) and `docs/v2/design-unicorn-egg-nest.md` (step 4, "Baby names").

- **Name bells.** Three bells each speak a name from `BELL_NAMES` (28 names from R1 to R3, such as sam, tim, ken, tess). The name tree shakes twice for new bells. Emma drags a bell onto the baby and spells the name with gems. This is the checked spelling moment.
- **Gold bell, "Make any name you like!"** Three fixed slots (consonant, vowel, consonant) and a fixed tray of t, m, n, p, a, i, o. The result must be in `OWN_NAMES`, or Lumi says "I don't know that name. Try other gems!".
- `OWN_NAMES` is built from that tray: 36 combinations, minus every word whose first and last letter match, minus `BLOCKED`, minus `NOT_NAMES` (pan pin map mop tap top pot mat). **25 names remain. 23 combinations are refused.**
- Every name has one clip, for example `name-tam`: "Tam!". 56 name clips in total.

Why real names were refused:

| Rule | Real names it refused | Fix |
|------|----------------------|-----|
| First letter equals last letter | Nan, Mim, Pip, Pop, Mom, Tot, Nin | Drop the rule. The rude words it caught (tit) are already in the blocklist. |
| Name already in the herd | Any second Tim, Tom or Pam. After 10 or more hatches with only 25 own names, this happens often. | Allow it. Lumi says "Another Tim! Tim the Second!" A royal title fits the queen theme. Bedtime never hides two babies with the same name in one round. |
| `NOT_NAMES` (wish words) | Pan, Pin, Mat, Pip | Allow them. The wish planner skips a wish word while a baby has that name. |
| `BLOCKED` | Pom, Pon (Pon only because the voice said "pawn") | Pom stays reserved for the Fluffle. Pon gets an IPA clip (see 3.3). |
| Only 3 slots, only 7 letters | Every name she really wants: Luna, Lily, Rose, Sophie, Bella, Sparkle, friends' names | Free building with more slots and her full gem set (section 4). |
| The same message for every refusal | "I don't know that name" for a duplicate is untrue and confusing | Never refuse with that line. |

The v2 game does not log failed gold-bell attempts. We do not know exactly which names she tried. v3 should log every built name (in the parent corner), so the wish list and blocklist learn from real play.

## 2. What must stay true

- Elizabeth says every name Emma hears as a name. She is the only voice for words Emma learns from (VOICES.md).
- Every clip is a pre-generated ElevenLabs file. No browser speech. The key never reaches the client. Today the rules also say "generated ahead of time" (CLAUDE.md, STACK.md).
- Names sit at sentence boundaries: "Tam!" + "What a lovely name!", "Ken!" + "Where are you?". So one or two clips per name are enough.
- Budget: Starter plan, 39,945 credits a month. Elizabeth on `eleven_v4` costs 1 credit per character. The generator refuses to run below 8,000 credits left. v3 also needs credits for all its new game lines.
- The spelling check must stay fair: a name she could not possibly spell must not count as a miss.

## 3. Options and cost

### (a) A large pre-generated name list

**Sources**, each filtered for rude words, trademarks and confusing pronunciations:

| Group | Count | Notes |
|-------|-------|-------|
| UK popular names, top 100 girls and top 100 boys (ONS, England and Wales) | 200 | Her classmates at a British school |
| Dutch popular names, top 75 girls and boys (SVB) | 150 | Her home language. Pronunciation needs a decision (D2). |
| Cyprus and Greek names (Maria, Eleni, Andreas, Nikos, Sofia) | 40 | Her friends in Cyprus |
| Unicorn, fantasy and nature names (Luna, Star, Sparkle, Twinkle, Rainbow, Moonbeam, Daisy, Rose, Ruby, Pearl, Honey, Cookie, Snowy, Willow) | 300 | No trademarked characters: no Twilight Sparkle, Rainbow Dash, Pinkie Pie, Fluttershy, Celestia, Pikachu. Plain given names such as Elsa or Anna are fine, because the game never shows the film character. |
| Decodable CVC and CVCC names and words at R1 to R4 (Tam, Bex, Fizz, Jet, Pom-pom, Biff) | 300 | The v2 design already planned about 200 |
| Family, friends, pets, teachers | 20 to 40 | Tjitse supplies these |
| **Tier 1 total** | **about 1,000** | |
| Tier 2: UK top 500 girls and top 300 boys, Dutch top 200, more fantasy names | about 1,000 more | Month 2 |

**Characters and credits.** Popular names average 5 to 6 letters. A clip text like "Sophie!" is about 7 characters.

| Item | Per name | 1,000 names | 2,000 names |
|------|---------|-------------|-------------|
| Clip 1, called: "Sophie!" | 7 | 7,000 | 14,000 |
| Clip 2, wondering, for bells and bedtime: "Sophie?" | 7 | 7,000 | 14,000 |
| Regenerations after the speech-to-text check (about 15%) | 2 | 2,000 | 4,000 |
| **Total credits** | **about 16** | **about 16,000** | **about 32,000** |

Tier 1 fits in one month and leaves about 24k credits for the v3 game lines. Tier 2 goes in the second month. Storage: about 4,000 short mp3 files of 8 to 15 KB, so 30 to 60 MB. Load a name's clips when it is offered, not at start.

**Extra work per name** (no credits): a grapheme split (s|o|ph|ie), a phoneme string (/s əʊ f i/), a first-sound group and a picture tag where one fits. A script makes these from rules, and Tjitse spot checks. They power the gift gems, the near-match and the first-sound browsing.

**Limits.** No list covers everything a 6-year-old invents. A list alone does not solve the problem, but it makes the fallback rare.

### (b) Accept any letter string and play her own sounds

Emma builds any string with gems. The slider plays her own letter sounds from `shared/audio/phonics/` ("t-a-m-o"). This already exists in v2. The baby gets its name tag at once.

- Cost: 0 credits.
- What she hears is exactly what she built. This is the honest phonics answer to "what does my name say?".
- It is not the blended whole name. Splicing phonics clips into one fast word sounds robotic and was a v1 failure ("Zob"). So the sounds are used as sound-talk ("t-a-m-o"), never as the name.
- Until the real clip exists, lines that need the name skip it. The baby's tag glows instead, and the baby is left out of bedtime finds.
- Only rule: a name needs a pink (vowel) gem. "Every name needs a pink gem!" with the pink gem glowing. This teaches a real phonics rule and is not a refusal.

### (c) A small server that generates missing names

A tiny endpoint, for example `POST /name` on `odin.vendic.cloud`. The key lives in the server's environment, never in git or in the game.

- The server accepts only strings of 1 to 8 graphemes from the game's gem set. It checks the same blocklist as the game. It returns the cached file when the name exists.
- A new name: generate "Name!" and "Name?" with Elizabeth on `eleven_v4`, using inline IPA built from her gems (`/tæmɒ/`). The v2 audio research found that v4 reads inline IPA for whole words. It failed only for single sounds. Then a speech-to-text check, then save and return the URL.
- Cost: about 16 credits per new name. Five new names a night is about 2,400 credits a month.
- Speed: a few seconds per name (to be measured). The game covers it with a short role-play moment: Lumi whispers the name to the moon.
- Abuse protection: a hard cap per day (for example 20 names) and per month (for example 3,000 credits). The endpoint is public, so a token in the client only slows abuse down. The caps are the real limit.
- Needs internet on the iPad. Today Tjitse serves the games from his Mac on the home network.
- Clips are not heard by a person before Emma hears them. Only the automatic speech-to-text check runs. v2 also ran without a human ear check, but its clips were made in advance.
- Rule impact: the key stays off the client, but "generate ahead of time" no longer holds. This is decision D1. Deployment to odin is for Tjitse. Agents may not SSH to odin.

### (d) A name wish list that Tjitse generates

Every unknown name goes into a wish list (`S.nameWishes`) with the gem sequence, the date and the baby.

- Tjitse gets the list from the parent corner and runs `scripts/generate-audio.py` with the new names (IPA built from the gems). Transport options: a "Send to Papa" button that posts to a small endpoint on the Mac or on odin (no key needed), or the list shown on screen to copy.
- Next session: "Lumi has a surprise! The Queen learned a new name." The baby hears its name for the first time, jumps and gets a heart. Emma waits one night, and the wait becomes a story moment that suits the role play.
- Cost: about 16 credits per name, the same as (c), but Tjitse controls when it runs and can listen first.
- Fits all current rules.

### (e) Emma says the name into the microphone

- Rules: Elizabeth must say every name. Emma's voice cannot be the name voice.
- Technical: iPad Safari allows the microphone only on HTTPS or localhost. `http://<mac-ip>:8765` on the home network is not a secure context, so it does not work with today's hosting.
- Privacy: a child's voice recording. Keep it on the device only and never upload it.
- Possible extra, later: "Teach your baby its name!" Emma speaks, and the baby repeats it in a squeaky pitched-up copy of her own recording. This is role play, not the name voice. Her recording could also sit next to the wish list entry, so Tjitse hears what she meant when the spelling is unclear (Lili or Lily). Decision D5.

### (f) Picking by picture or by first sound

These are ways to choose a list name without reading or spelling first.

- **By picture:** a name garden with picture groups. Flowers (Rose, Lily, Daisy, Poppy, Ivy, Holly, Violet), gems (Ruby, Pearl, Amber, Jade), sky (Luna, Star, Sunny, Sky, Stella), sweets (Honey, Cookie, Coco, Toffee), animals and family. Tap a picture to hear the name.
- **By first sound:** Emma taps a letter gem, and three bells ring names that start with that sound. The name tree gives more. Groups follow sounds, not letters. Charlotte goes under sh, Cassie under k. This is phonics practice in itself: hearing and matching a first sound.
- **By near match:** when her free build is close to a list name, the game offers it. She builds "lili", and a bell says "Lily!" next to her own bell, which plays her sounds. She picks either one. Her own spelling is always allowed.
- Cost: 0 extra credits. It uses list clips.

## 4. Names she cannot spell yet

Rose, Lily, Sophie and Charlotte use graphemes far above R1 to R3. The fix is **gift gems**.

- Every list name has a grapheme split: r|o_e|s, l|i|l|y, s|o|ph|ie.
- In the phoneme frame, graphemes above her current level arrive as sparkly gift gems, already placed. Lumi: "This bit is tricky. I'll help." Emma fills only the slots at her level.
  - Lily at R3: she fills l, i, l. The y is a gift.
  - Rose at R3: she fills r and s. The split o_e is a gift, with a little bridge drawn over the s.
  - Sophie at R3: she fills s. The rest are gifts.
- **Fair checking:** only her slots are checked and logged. If she fills fewer than two slots, the name is logged as free naming and does not move the spelling staircase. A miss on a gift gem cannot happen.
- **Learning:** when she taps a gift gem it says its sound ("y says ee here"). She sees real spellings of names she loves. As her level rises, fewer gems are gifts. A name she spelled with gifts in October can be spelled almost alone later. The Nest Book can show "You can spell Lily on your own now!" when that happens.
- Bell names and the spelling staircase stay as in v2, so the checked practice does not shrink.

The three ways to name a baby in v3:

| Route | Example | Spelling | Logged as |
|-------|---------|----------|-----------|
| Name bells (game picks at her level) | Ken | She spells all of it | Spelling, checked |
| Name garden or first sound (list name she picks) | Lily | Her slots only, the rest gift gems | Spelling, checked on her slots |
| Free build (gold bell, any gems) | Tamo, or Lili | She builds it, so it is her own encoding | Free naming, never a miss |

## 5. Rude words in English and Dutch

- **One shared blocklist** (`shared/blocklist.json`), used by the game, the generator and any server. Tjitse reviews it (D7).
- **Check by sound, not by letters.** Turn the built gems into phonemes first (c, k and ck become k; ss becomes s; ph and ff become f; x becomes ks), then compare. "fuk", "phuk" and "fuck" are all caught.
- **Whole name and parts.** The whole name is checked against the full list. Inside longer names, only the strong words are checked as parts, so innocent names such as Cassidy or Scarlett pass.
- **English:** the v2 list (tit, bum, poo, piss, cock, dick, fuck, shit and others) plus arse, crap, cunt, twat, wank, slag, slut, fanny, willy, nob and the common slurs.
- **Dutch:** the v2 list (pik, pis, lul, kut) plus tiet, kont, reet, poep, scheet, piemel, drol, stront, kak, hoer, slet, klote, kanker, tering, tyfus, sukkel, debiel, mongool, flikker and racist slurs.
- **The name list** gets the same check. Names that are rude in the other language are dropped (Fanny, Dick, Willy, Randy). Names that only sound close are flagged for Tjitse.
- **Toilet words** (poo, wee, fart, poep, plas) are funny, not bad, for a 6-year-old. They are blocked with a giggle: the baby shakes its head and laughs, and Lumi says "That's a silly name! Try other gems." Nothing is logged as wrong. Whether wee and fart are blocked is part of D7.
- **Strong words** get the same calm response, with no scolding and no repeat of the word. The parent corner logs them for Tjitse.
- **The tray planner** keeps the v2 rule: it never offers a gem that turns the target name into a blocked word.

## 6. The v3 naming flow

1. A baby hatches. It holds three name bells, the name tree, the name garden (picture) and the gold bell.
2. **Bells and garden:** Emma picks a name, Elizabeth says it, and Emma spells it, with gift gems where needed.
3. **Gold bell:** the frame starts with 3 slots, and Emma can add slots up to 6. Her full gem set for her level is in the tray, plus the letters she has met.
4. She slides the star and hears her own sounds.
5. The game checks, in this order:
   - No vowel: "Every name needs a pink gem!"
   - Blocked: a giggle and "That's a silly name! Try other gems."
   - Exact list match: Elizabeth says the name. "Tam! What a lovely name!"
   - Near list match: a bell offers the list name next to her own. She picks.
   - Otherwise: "A brand new name! I'll teach it to the Queen tonight." The tag goes on, and the name joins the wish list.
6. Duplicate: "Another Tim! Tim the Second!" (Elizabeth clips "the Second", "the Third").
7. Next session: new names are spoken for the first time, and the baby gets a heart.

New fixed lines for Elizabeth: about 10 lines, about 300 characters.

## 7. What the rules allow, and what Tjitse decides

Allowed now, with no rule change: the v2 rule fixes, the big list (a), own sounds (b), the wish list (d), picture and first-sound picking (f), gift gems, the shared blocklist.

Tjitse decides:

- **D1. On-demand server (c).** Generating at runtime on odin breaks "generate ahead of time", puts the key on a server and lets clips reach Emma without a person hearing them first. Recommendation: start with (d) and add (c) only if waiting a night bothers Emma.
- **D2. Dutch names.** Elizabeth is British. Sanne, Fenna, Noor and Joep will sound English unless we use IPA or `language_code: nl`. Emma will notice. Options: English-style on purpose, or Dutch-style with an ear check of the Dutch tier.
- **D3. Budget split.** About 16k credits for tier 1 in month 1, tier 2 in month 2, alongside the v3 game lines.
- **D4. Invented names.** Recommendation: allow any pronounceable string. Children invent names, and "what your letters say" is the phonics lesson.
- **D5. Microphone extra (e).** Needs HTTPS and a privacy choice. Not for v3 launch.
- **D6. Real people's names.** Which family, friend and teacher names go on the list.
- **D7. Blocklist review.** Including whether toilet words are blocked.
- **D8. Duplicates.** "Tim the Second", or a gentle "We have a Tim! Pick another name?". Recommendation: the royal number.
