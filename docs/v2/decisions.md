# v2 build decisions

These decisions override `plan.md` and the three `design-*.md` files where they conflict. Tjitse asked for the v2 demos to be built straight away, without approval gates, so Emma can play them tonight. There will be a v3.

## Scope

- Build the three demos: Unicorn Egg Nest v2, Pippa's Word Wand v2 and Fluffle Nursery v2. Folders: `ideas/opus-5-5-<slug>-v2/`.
- No human gates. No ear-check gate, no teacher, no picture check, no voice artist. Automatic checks only (speech-to-text and measurements). Tjitse and Emma listen while they play.
- One session must be fully playable in one sitting. Calendar locks are off in the demo: a new day or night starts after bedtime with one tap.
- Cut for the demo: the parent corner, `picture-check.html`, the name-neighbour checker, Leitner boxes, server saves. Names come from curated lists with no rude words in English or Dutch.
- Start levels: reading L2, spelling L2, maths as in each design. The shared staircase rule (plan 2.7) adapts from there.

## Voices

`VOICES.md` is the source of truth.

- Elizabeth is the narrator and the only voice for letter sounds, words Emma reads or spells, names she decodes and numbers. Model `eleven_v4`, because the audio research found it best for her professional voice clone and for written-out sounds.
- Characters speak with their own voices. They do not only make sounds:
  - Princess Pippa: Amelia.
  - Any queen (Queen Lumi, the Queen at the tea party): Posh.
  - Baby unicorns: Flicker, tiny words and giggles.
  - Fluffles and Bobbins: Peanut on `eleven_v3` with audio tags (babble, giggles, coos). Never real English words.
- Story and character lines move to the character voices. Goal lines ("what to do now") stay with Elizabeth, so the instruction voice is always the same.
- Every line in `lines.json` has a `speaker`. `shared/cast.json` maps speakers to voice id, model and settings.

## Audio

- Every spoken line is a pre-generated ElevenLabs clip. No `speechSynthesis` anywhere. A missing clip plays silence and logs `console.warn('[audio] missing <id>')`.
- Playback through Web Audio (`shared/audio.js`).
- Letter sounds: one shared phonics library in `shared/audio/phonics/`, made with the methods that passed the research (respell on v4 for long sounds, carrier-word trims for stops and short vowels, words or letter names for vowel teams).
- Budget: about 24,000 characters for all of v2. Each run of `scripts/generate-audio.py` has `--max-chars`, and the script refuses to run when fewer than 8,000 credits are left in the month.

## Hosting tonight

The games are static files. Tjitse serves the repo from his Mac on the home network and opens it on the iPad. A picture menu at `index.html` in the repo root links the three v2 games.
