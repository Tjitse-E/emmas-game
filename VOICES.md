# Voices

ElevenLabs voices per character. Emma chose the character voices by ear on 2026-10-10.

| Character | Voice | Voice id | Model | Speaks |
|-----------|-------|----------|-------|--------|
| Narrator | Elizabeth | `AXdMgz6evoL7OPd7eU12` | `eleven_v4` | Instructions, hints, letter sounds, words, names, numbers |
| Princess Pippa | Amelia | `ZF6FPAbjXT4488VcRRnw` | `eleven_multilingual_v2` | Story lines in Pippa's Word Wand |
| The Queen | Posh | `3Drdg7QWqr45nZmYpXRP` | `eleven_multilingual_v2` | Queen lines in every game |
| Baby unicorns | Flicker, Cheerful Fairy | `piI8Kku0DcvcL6TTSeQt` | `eleven_v3` | Tiny words and giggles in Unicorn Egg Nest |
| Fluffles (Pom, Bobo) | Peanut | `rBkiq5ZQ43ogwd6i4uIQ` | `eleven_v3` with audio tags | Babble, giggles, coos. No real words |

## Rules

- Elizabeth is the only voice for anything Emma learns from: letter sounds, words she reads or spells, names she decodes and numbers. The generation script refuses any other voice for those lines.
- Letter sounds are pure British phonics sounds: no added "uh", short a as in apple, short o as in on. Tjitse checks them by ear before Emma plays.
- Fluffle babble must never sound like a real English word. In Fluffle Nursery the written word is the only clue to what the baby wants. Regenerate any clip that sounds like a word.
- One character has the same voice in every game.
- Elizabeth runs on `eleven_v4`. The audio research (docs/v2/audio-research.md) found it best for her professional voice clone and for written-out letter sounds.
- `shared/cast.json` holds the same voices for the generation script.
- The voices come from the ElevenLabs shared library and are used by id. They take no voice slots. Flicker costs 2 credits per character, the others cost 1.
- For `eleven_v3` lines, set a fixed seed per line, so a regenerated clip sounds the same.
- The API key lives in `.env` and is only read by the generation script. It is never committed or put in client code.
