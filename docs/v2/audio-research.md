# ElevenLabs speech and phonics sounds: research and prototype report

Elizabeth on `eleven_v4` is good for speech. No ElevenLabs phoneme feature produces a pure isolated letter sound. Every model either reads the markup aloud or adds a vowel ("suh"). Two cheap methods do work, judged by machine checks only:

- **Long sounds** (s, sh, f, z, th, v, m, n): write the sound out, such as `"Sssss."`, and generate it on v4.
- **Stops and short vowels:** generate a short carrier word ("Top.", "At.") and cut out its first sound with ffmpeg.

Tjitse must listen to every letter sound before it ships. The listening sheet is ready for that.

## Findings

**Voice.** Searching the voices API for Elizabeth finds `AXdMgz6evoL7OPd7eU12`, "Elizabeth - Professional British Narrator", accent british. It is a professional voice clone. The v3 guide says these clones are "not fully optimized for Eleven v3" and recommends v4.

**Models and pronunciation controls:**

| Model | Phoneme control | Audio tags | `<break>` | `language_code` |
|---|---|---|---|---|
| `eleven_v4` (newest) | IPA inline in slashes, `"/ˌsænfrənˈsɪskoʊ/"`; dictionary phoneme rules | yes | no, use `...` | yes |
| `eleven_v3` | dictionary phoneme rules | yes | no | yes |
| `eleven_multilingual_v2` (used by the gpt6 script) | aliases only | no | yes | not supported |
| `eleven_flash_v2` | SSML `<phoneme alphabet="ipa"|"cmu-arpabet">` | no | yes | yes |

- **Dictionaries:** phoneme rules only work on v4, v3 and flash_v2. Alias rules work on every model. They are created with `POST /v1/pronunciation-dictionaries/add-from-rules`.
- **CMU spelling:** it is American and has no British /ɒ/.
- **Useful TTS parameters:**
  - `seed`: makes output repeatable on a best-effort basis only.
  - `previous_text` / `next_text`: help continuity between clips.
  - `apply_text_normalization`: auto, on or off.
  - `voice_settings`: stability, similarity_boost, style, speed (0.7 to 1.2).
- **Pauses on v3 and v4:** use ellipses. Tags like `[warm, gentle]` work, but the docs warn that tags can be spoken aloud and that playful tags can misfire on a serious narrator voice.

**Cost.**
- API price per 1,000 characters:
  - v3 and multilingual v2: $0.08
  - v4: $0.08 normally, $0.022 at a 72% discount until 12 October
  - v4 Turbo and Flash: $0.04
- The account is on Starter, with a limit of 39,945 credits per month. Before this lab 3,123 were used. After everything (1,203 TTS characters plus speech-to-text) 3,505 were used, so the lab cost 382 credits.
- The usage counter updated with a delay.

**Docs:**
- [Models](https://elevenlabs.io/docs/models)
- [TTS convert API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Controls](https://elevenlabs.io/docs/best-practices/prompting/controls)
- [v4 prompting](https://elevenlabs.io/docs/best-practices/prompting/eleven-v4)
- [v3 prompting](https://elevenlabs.io/docs/best-practices/prompting/eleven-v3)
- [Pronunciation dictionaries](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries)
- [Create from rules](https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/create-from-rules)
- [API pricing](https://elevenlabs.io/pricing/api)
- [Voice search](https://elevenlabs.io/docs/api-reference/voices/search)

## What I generated

Everything is in `/private/tmp/claude-501/-Users-tjitse-sites-emmas-game/565f726c-09a6-4628-a14b-7e1060000709/scratchpad/audio-lab/`:

- `samples/`: 109 clips, named `<sound>__<approach>.mp3`.
- `listen.html`: the listening sheet. It shows every clip grouped by sound, with what was sent, the measurements, what speech-to-text heard, a pick button and a note per sound. "Show my picks as JSON" exports the choices.
  - Open it with `python3 -m http.server 8799 --bind 127.0.0.1` in that folder.
  - I loaded it in playwright-cli at 1180 px: 35 sound groups, 109 players, no sideways scrolling.
- Scripts:
  - `lab.py`, `lab2.py`, `lab3.py`: generate the clips. They read the key from `.env` inside Python, cache by hash and stop at 3,000 characters.
  - `analyze.py`: measures the clips and does the ffmpeg trims.
  - `stt.py`: speech-to-text check with `scribe_v2`.
  - `build_sheet.py`: builds the listening sheet.
- Data: `report.json`, `stt.json`, `manifest.json`.
- `dictionary.json`: the id of a test pronunciation dictionary, "emma-phonics-lab", now in the ElevenLabs account. It can be deleted.

Results per approach. "Voiced ms" counts loud, voiced audio. For s, sh, t and p it should be about 0. A higher number means an added vowel.

| Approach | Result |
|---|---|
| A. v4 inline IPA `"/s/"` | Fails. Speech-to-text heard "Slash S slash" for s, t, p and m. Vowels came out as "Ah" and "Oh". |
| B. flash_v2 `<phoneme>` with IPA or CMU | Fails. It adds a vowel or says the letter name: sh became "Sure", o became "Uh", t became 470 ms voiced. |
| F. Dictionary phoneme rule on v4 or v3 | Fails. s was heard as "Sir" on both, t as "Ta", p as "Paul". Only sh on v3 came out clean (0 ms voiced). |
| C. Spelled out on v4 | Works for long sounds. "Sssss." gave 1,150 ms with 10 ms voiced, and speech-to-text heard nothing. "Shhhhh.", "Fffff." and "Zzzzz." were clean. "Mmmmm." and "Nnnnn." were heard as a hum ("うーん"). multilingual_v2 was worse ("S-s"). |
| C. Real words or letter names for vowel digraphs | Mostly correct: ee, igh, oa, oo, or, ow, oi, ear, air. **"Ay." was heard as "I"**, so use "A." for ai instead. ar came back empty, so check it by ear. |
| D then E. Carrier word with the first sound cut out | Speech-to-text heard no word in the t, p, k, s and sh cuts, and they had 0 ms voiced. The b, d and g cuts are only 30 ms and probably too short. The "Egg" cut includes the g, so use a word ending in a voiceless stop instead. Vowel cuts last 130 to 300 ms. Each vowel also has a version slowed to 60% (pitch kept). |
| l and r spelled out | Doubtful. l was heard as "Ew", and r has 120 ms of open vowel. |

**Speech.** "Can you make the word bun?" was transcribed correctly on multilingual_v2, v4, v4 Turbo and v3. v2 took 1.3 s. v4 with `[warm, gentle] ... bun?` and v3 took 2.2 s, which is slower and leaves room to listen. Which sounds most natural is for Tjitse to decide by ear in the sheet. A teacher-style "b... u... n... bun!" (`soundtalk-bun__*`) was attempted. Like the single sounds, its sounds are not pure, so build it from the approved single clips instead.

Only a human ear can judge purity. The measurements and speech-to-text can only flag clips that are clearly wrong.

## Recommended pipeline

**1. A shared phonics library.** Generate it once into `audio/phonics/<id>.mp3`, have Tjitse approve it with the sheet, and reuse it in all three games.

| Method | Sounds |
|---|---|
| `respell` on v4 | s ss m n f ff v z zz sh th; plus l ll r if they pass the ear test |
| `trim` (carrier word, ffmpeg cut) | t p k c ck (Kit), b d g (wider cut window), j (Jam), ch (Chip), qu (Queen), h (Hat), w (Wet), y (Yes); x and ng from the end of "Box" and "Sing"; a (At), e (Ex or Etch), i (It), o (Ox), u (Up); er from the end of "Hammer"; ure from "Pure" |
| `word` or letter name | ai "A.", ee, igh "Eye.", oa "Oh.", oo, ar, or, ow, oi, ear, air |

**2. `lines.json` per game, with separate display text and spoken text:**

```json
{
  "defaults": {"model": "eleven_v4", "seed": 11, "language_code": "en",
               "settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 0.9}},
  "lines": [
    {"id": "nest.name-ask", "display": "What will you call your baby unicorn?", "speak": "[warm] What will you call your baby unicorn?", "takes": 2},
    {"id": "word.bun", "display": "bun", "speak": "Bun."},
    {"id": "snd.s", "kind": "phoneme", "display": "s", "ipa": "s", "method": "respell", "speak": "Sssss."},
    {"id": "snd.t", "kind": "phoneme", "display": "t", "ipa": "t", "method": "trim", "carrier": "Top.", "class": "stop"}
  ]
}
```

- Numbers are written as words in `speak`.
- The game only ever refers to `id`.
- The `ipa` field is documentation for the listening sheet. It is not sent to the API.

**3. `scripts/generate-audio.py`.** Standard library plus ffmpeg, reusing the key loading from the gpt6 script.
- **Caching:** the hash is sha256 of voice id, model, speak text, settings, seed and method or trim settings. A clip whose hash matches is skipped.
- **Safety flags:** `--dry-run` prints the character count. `--max-chars` is a hard budget.
- **Takes:** `takes: N` writes `id.take2.mp3` and so on, for review.
- **Approval:** `audio/manifest.json` stores the hash, `approved` and the chosen take. Approved clips are never regenerated without `--force`.
- **Audio format:** the API returns `mp3_44100_128`. ffmpeg then converts it to mono 96 kbps, normalises loudness (speech `loudnorm I=-16`, letter sounds peak at -3 dBFS), and trims silence to 50 ms.
- **Key handling:**
  - The key stays in `.env`. It is never embedded and never printed, and the clips do not go into the HTML as base64.
  - The sandbox blocks reading `.env`, so the script runs outside it.

**4. Checks.**
- Automatic: speech-to-text on every word and sentence clip. A transcript that does not match `display` is flagged.
- For letter sounds, a pure sound should produce an empty or nonsense transcript. A transcript like "Sir" or "Ta" means a vowel was added.
- Then the listening sheet, built from the manifest, for Tjitse's final pick. Only approved clips are copied into the games.
- In the game, play letter sounds through Web Audio buffers, not `<audio>`, so they start without delay on the iPad.

**5. Fallbacks for a sound that fails.**
1. Generate more takes with other seeds.
2. Try a different carrier word, or change the cut window.
3. Tjitse records the pure sound himself and converts it to Elizabeth with ElevenLabs speech-to-speech (Voice Changer). This is untested.

**6. Cost for three games.**
- The v1 lines were Unicorn Egg Nest 3,329, Pippa's Word Wand 1,645 and Fluffle Nursery 1,405 characters, 6.4k in total.
- v2 with more speech and 2 takes on the instruction lines: about 25 to 40k characters. The phonics set is about 1k.
- That is roughly one month of the Starter plan, or $2 to $3.50 at the normal v4 price.

## Open risks

- **Purity is not confirmed.** No clip has been checked by a person. The cut points come from automatic thresholds and can be off by 10 to 30 ms.
- **b, d and g are probably too short.** They need a wider window and a fresh ear check.
- **l and r spelled out are doubtful.**
- **ai "A." and ar are not tested yet.**
- **v4 is new.** Its price goes up on 12 October. Model ids and features may still change.
- **Seeds do not guarantee the same audio.** Generated clips must be stored and approved, not regenerated freely.
- **Delay on iPad.** HTMLAudio playback on iOS Safari can lag when a letter is tapped. Web Audio is the plan, but it is not tested yet.
- **The test dictionary is still in the ElevenLabs account.** Its id is in `dictionary.json`.

Nothing was committed and no repo files were changed.