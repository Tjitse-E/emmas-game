# Sound lane: requests for the integrator

## 1. `tools/audio/budget.json`: add `sfxPerSecond`

- **Done** (integrator, sound merge): `"sfxPerSecond": 40` added next to `sttPerCheck`. The probe (2026-10-29) took 20 credits for the 2 s bell, 10 a second, so sfxPerSecond stays at the floor of 40 and the pack does not shrink.

- Change: add `"sfxPerSecond": 40` next to `sttPerCheck`.
- Why: docs/v4/2.3.md section 22.1 says step 0 added it, but the file has only `sfxNote`. No lane owns budget.json, so I did not add it. Nothing breaks without it: `gen-sfx.py` plans a missing value as 40 and the probe writes it.

## 2. Integration step 5: approve the files after listening

- **Open, not declined:** this is integration step 5 (22.3), after the pack is made and Tjitse has listened. Nothing to do at the sound merge.

- Change: none in code. After `sfx.sh` and Tjitse's listening, run `sh games/moon-meadow-world/tools/audio/sfx.sh --approve <ids>` for every file he keeps.
- Why: the game plays only files the manifest marks `approved`, so Emma never hears a sound Tjitse has not heard (section 20: "approved is false until Tjitse has listened"). Without the approve step she hears only the fallbacks. `?sfx=all` plays the rest for listening in the game.

## 3. `README.md` (quests-world owns it): one line for the listening page

- **Deferred:** README.md belongs to quests-world, which merges last. The integrator adds the line after that merge, or quests-world adds it in its lane.

- Change: under the listening checks, add: "Listen to the 16 effects, the day loop and the music box on `dev/sound.html` (vite dev), then approve them (notes/sound.md)."
- Why: Tjitse's listening list in section 23 includes them, and the README is where he looks.

## 4. `CHANGELOG.md` 2.3.0

- **Deferred to step 8 (22.3):** CHANGELOG.md 2.3.0 is written once, after all lanes and Tjitse's check. The two lines are kept here for it.

- Suggested lines: "The day meadow sounds and ElevenLabs effects play on the game's own sound channel, which never sounds under Elizabeth or a letter sound." and "A music box tune plays while she dresses."

## 5. Section 20: `bedtime-bell` is 2.0 s, but `g-dusk` waits for it at most 1 s

- **Done, another way** (integrator, sound merge): the bell stays 2 s, so the probe is unchanged. A 2 s wait before `g-dusk` would break section 8 (her line waits for an effect at most 1 s), so section 20 now has level.ts start the bell 1 s into the 3 s dusk fade. The bell ends with the fade and `g-dusk` follows it. quests-world changes its `await g.run.w(audio.fx('bedtime-bell'))`. notes/sound.md's wiring row says the same.

- Change: decide in the doc before the probe is made (the probe is this effect). My suggestion: keep the 2 s bell, because a 2 s probe measures the rate better, and have quests-world wait the whole bell before `g-dusk` in level.ts: `await Promise.all([audio.fx('bedtime-bell'), wait(2000)])`. The other way is a 1.0 s bell with one ring (sfx.json is mine to change, but the table, the probe and the 20.1 s of section 21 are in the doc).
- Why: `fx()` resolves at most 1 s after it started (`FX_WAIT_MS`, frozen in step 0). When `g-dusk` starts then, Elizabeth's start fades the bell out in 60 ms, so the second ring of "a bell ringing twice" is cut to a click every bedtime.

## 6. Section 20: `audio.sfx()` follows the channel's rule

- **Done** (integrator, sound merge): section 20 has the line, with the callers in naming.ts (reading) and wardrobe.ts (wardrobe-ui).

- Change: one line in section 20: "`audio.sfx()` (tick, pop, chime and the other synthesised sounds) keeps its signature and plays on the channel by the rule of `fx()`: skipped while Elizabeth speaks or a letter sound plays, faded out in 60 ms when she starts, ducked to 0.3 under a story line, as loud as before otherwise."
- Why: section 8 says no effect plays over or under Elizabeth, letter sounds included, and quests-world's `fanfare` and `munch` go through `audio.sfx()`. Until now it went straight to `shared/audio.js`, outside the rule.
- For the owners: where a synthesised sound and a line of hers start in the same tick, Emma now hears only the first 60 ms of the sound. A caller that wants the whole sound awaits `audio.sfx()` before the line. The ones I found: `src/ui/naming.ts` (the chime before a bell's name, the sparkle before the chosen name), `src/ui/wardrobe.ts` (the chime on Done before `o.clips.done`), and the wardrobe picks that say a word (`wardrobe-ctl.ts`, which section 16 already says play no effect).

