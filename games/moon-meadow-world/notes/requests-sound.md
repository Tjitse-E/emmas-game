# Sound lane: requests for the integrator

## 1. `tools/audio/budget.json`: add `sfxPerSecond`

- Change: add `"sfxPerSecond": 40` next to `sttPerCheck`.
- Why: docs/v4/2.3.md section 22.1 says step 0 added it, but the file has only `sfxNote`. No lane owns budget.json, so I did not add it. Nothing breaks without it: `gen-sfx.py` plans a missing value as 40 and the probe writes it.

## 2. Integration step 5: approve the files after listening

- Change: none in code. After `sfx.sh` and Tjitse's listening, run `sh games/moon-meadow-world/tools/audio/sfx.sh --approve <ids>` for every file he keeps.
- Why: the game plays only files the manifest marks `approved`, so Emma never hears a sound Tjitse has not heard (section 20: "approved is false until Tjitse has listened"). Without the approve step she hears only the fallbacks. `?sfx=all` plays the rest for listening in the game.

## 3. `README.md` (quests-world owns it): one line for the listening page

- Change: under the listening checks, add: "Listen to the 16 effects, the day loop and the music box on `dev/sound.html` (vite dev), then approve them (notes/sound.md)."
- Why: Tjitse's listening list in section 23 includes them, and the README is where he looks.

## 4. `CHANGELOG.md` 2.3.0

- Suggested lines: "The day meadow sounds and ElevenLabs effects play on the game's own sound channel, which never sounds under Elizabeth or a letter sound." and "A music box tune plays while she dresses."
