# Shared audio

Everything the games need to speak and play letter sounds. All speech is pre-generated with ElevenLabs. The browser never calls the API and never uses `speechSynthesis` or `HTMLAudio`.

| Path | What it is |
|---|---|
| `cast.json` | Speaker to ElevenLabs voice: voice id, model, settings, seed. Source: `VOICES.md`. |
| `audio.js` | The player (`window.EmmaAudio`). Web Audio only. |
| `audio/phonics/` | The letter sounds (`snd-<grapheme>.mp3`), `index.json`, and every take in `takes/`. |
| `review.html` | Listening sheet for every clip and letter sound, grouped by game, plus the picture menu. |
| `home.js` | The round home button (top right, 80 px) that every game loads. It stops all sound and opens the picture menu (`/index.html`). |
| `test.html`, `test-audio/` | A small test page for the player. |
| `../scripts/generate-audio.py` | Makes the clips of one game from its `lines.json`. |
| `../scripts/generate-phonics.py` | Makes the letter sounds. |

## Speakers

| Speaker | Voice | Model | Use it for |
|---|---|---|---|
| `narrator` | Elizabeth | `eleven_v4` | Goal and instruction lines, and everything Emma learns from: words she reads or spells, names she decodes, numbers, sounds. |
| `pippa` | Amelia | `eleven_multilingual_v2` | Princess Pippa's story lines. |
| `queen` | Posh | `eleven_multilingual_v2` | Any queen. |
| `foal` | Flicker | `eleven_v3` | Baby unicorns: tiny words and giggles. Costs 2 credits per character. |
| `fluffle` | Peanut | `eleven_v3` | Fluffles and Bobbins: babble with audio tags. Never real English words. |

## Adding lines

Each game has `ideas/<dir>/audio/lines.json`:

```json
{
  "lines": [
    {"id": "goal-make-word", "speaker": "narrator", "text": "Can you make the word?"},
    {"id": "word-bun", "speaker": "narrator", "text": "Bun."},
    {"id": "pippa-hello", "speaker": "pippa", "text": "Hello, Emma! Will you help me?"},
    {"id": "fluffle-happy", "speaker": "fluffle", "text": "[giggles] Mibba boo! [happy squeak]", "note": "after a meal"}
  ]
}
```

- `id`: lowercase kebab-case, `[a-z0-9-]`, unique in the game. The file becomes `<id>.mp3`.
- Ids starting with `word-`, `name-`, `num-` or `sound-` must use `narrator`. The script refuses anything else.
- Write numbers as words ("three", not "3"). The script warns about digits.
- Audio tags such as `[giggles]` work on `foal` and `fluffle` (`eleven_v3`). Keep them out of narrator lines.
- `note` is optional and is only shown on the listening sheet.
- Optional `seed` overrides the speaker's seed for one line, to get a different take.
- Put a name or a word at the start or end of a sentence, or in its own clip. Clips are never spliced.

## Generating clips

Run from the repo root, outside the sandbox (the script reads the key file and calls the API):

```sh
python3 scripts/generate-audio.py ideas/<dir>/audio/lines.json --dry-run       # what would be made, and the cost
python3 scripts/generate-audio.py ideas/<dir>/audio/lines.json --max-chars 4000
python3 scripts/generate-audio.py ideas/<dir>/audio/lines.json --stt           # also check narrator clips with speech-to-text
python3 scripts/generate-audio.py ideas/<dir>/audio/lines.json --only word-bun,word-hat --force
```

- Each clip is cached by a sha256 of voice id, model, text, settings, seed and language code. Unchanged clips are skipped, so rerunning is free. Raw API audio is kept in `.cache/tts/` (gitignored), so a change in processing never costs credits.
- `--max-chars` is a hard budget for the run. Lines over the budget are listed and skipped.
- The script refuses to call the API when fewer than 8,000 credits are left this month.
- Up to 4 requests run at once. 429 and 5xx answers are retried with backoff.
- Processing: mono, silence trimmed to about 50 ms, loudness about -16 LUFS with peaks limited to -1 dBFS, mp3 96 kbps.
- `manifest.json` next to the clips holds per clip: hash, speaker, text, model, seed, duration and the speech-to-text result. The player uses it to know which clips exist.
- `--stt` uses `scribe_v2`. Mismatches are printed and stored, but never fail the run. Character voices are not checked.

## Letter sounds

`python3 scripts/generate-phonics.py` builds `audio/phonics/`. It covers the Little Wandle phase 2 and 3 graphemes: s a t p i n m d g o c k ck e u r h b f ff l ll ss j v w x y z zz qu ch sh th ng nk ai ee igh oa oo ar or ur ow oi ear air er.

ElevenLabs cannot say a pure sound when asked directly, so each sound comes from a carrier clip (see `docs/v2/audio-research.md`):

- Long sounds are written out on v4 ("Sssss.") and used whole.
- Stops, h, j, ch and qu are cut from the start of a carrier word, before the vowel. b, d and g keep the full burst and 25 ms of voicing, without the hum v4 puts in front.
- l, r, w and y are cut from a word up to where the vowel opens. "Llllleg." gives a long clean l. Written out, v4 rolls the r, so r comes from "Rug.".
- Short vowels are cut from a word that starts with the vowel ("At.").
- x comes from the end of "Box.", ng from the end of "Sing.", er from the end of "Letter.", nk is ng plus k.
- Vowel teams are a word or letter name ("A.", "Oh.", "Air.").

Weak sounds get two to five takes. Each take is measured and checked with speech-to-text, and the best is chosen automatically. `index.json` records the chosen take and every take with its cut and numbers. All takes are in `audio/phonics/takes/` and on the listening sheet, so a better take can be picked by ear: change the order of takes in `SOUNDS` in the script, or add a take, and rerun.

`index.json`, keyed by grapheme:

```json
{"sounds": {"s": {"id": "snd-s", "file": "snd-s.mp3", "sustain": true, "kind": "consonant", "chosen": 1, "method": "respell", "takes": []},
            "ss": {"id": "snd-ss", "file": "snd-s.mp3", "sustain": true, "same_as": "s"}}}
```

Doubled letters (ff ll ss zz) and c, k, ck share one clip. Each alias also has its own copy (`snd-ss.mp3`), so the id works as a file name too. `sustain` is true for s m n f v z sh th l r and their doubles.

## The player

```html
<script src="../../shared/audio.js"></script>
<script>
  EmmaAudio.init({ base: 'audio/', phonics: '../../shared/audio/phonics/' }); // relative to the game page
  playButton.addEventListener('pointerdown', () => {
    EmmaAudio.unlock();                                   // inside the tap, for iOS
    EmmaAudio.preloadSounds(['s', 'a', 't']);             // or no argument for all sounds
    EmmaAudio.preload(['goal-make-word', 'word-bun']).then(start);
  });
</script>
```

| Call | Result |
|---|---|
| `init({base, phonics})` | Sets the folders. Both default to the values above. |
| `unlock()` | Resumes the AudioContext. Call it inside the Play button's pointer handler. Also sets the iOS audio session to playback, so the silent switch does not mute the game. Returns a Promise. |
| `preload(ids)` | Fetches and decodes game clips. Resolves with the list of missing ids. |
| `preloadSounds(graphemes)` | Same for letter sounds. Without an argument it loads all of them. |
| `say(id, {queue})` | Plays a clip. Resolves when it ends or is stopped. By default it stops the current speech first. With `queue: true` it waits for the speech before it. |
| `sayAll(ids)` | Stops current speech, then plays the clips in order. |
| `sound(grapheme)` | Plays a letter sound once. Stops the previous letter sound unless called with `{overlap: true}`. |
| `hold(grapheme)` | Returns `{stop(), done}`. A long sound loops its steady middle until `stop()`, then fades out over 40 ms. A short sound plays once. `done` resolves when it ends. |
| `sfx(name)` | Synthesized effect, no file: pop, chime, sparkle, whoosh, soft-no, fanfare, splash, munch, tick, magic, hatch. Resolves when it ends. |
| `stop()` | Stops speech, letter sounds and effects. Every pending promise resolves. |
| `mute(bool)` | Mutes or unmutes everything. Timing stays the same. |
| `speaking` | True from a `say()` call until its promise resolves. |
| `missing` | Ids of missing clips, each listed once. |

Additions beyond the shared contract: `playUrl(url)` (used by the listening sheet), `has(id)` (Promise, is the clip in the manifest), `phonicsIndex()` (Promise with `index.json`), `muted` and `context`.

Missing clips: when `manifest.json` does not list an id, or the file does not load, `say()` logs `console.warn('[audio] missing <id>')`, adds the id to `missing` and resolves after 300 ms. A missing letter sound does the same with its `snd-` id. All promises resolve, also when the AudioContext is still locked.

## Checking

- `shared/review.html` (served from the repo root, for example `http://127.0.0.1:8755/shared/review.html`) lists every clip with a play button.
- `shared/test.html` unlocks audio and plays letter sounds, holds, effects and a missing clip.
