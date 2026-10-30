# Sound: notes

The v4 sound channel lives in `src/audio/` (docs/v4/2.3.md sections 8, 20 and 21). `shared/audio.js` and v3 do not change.

| File | What it does |
|---|---|
| `src/audio/index.ts` | The one `audio` entry point. Every `say`, `sayAll`, `sound` and `hold` goes through the speaker count; `stop()` also stops the channel's effects |
| `src/audio/speakers.ts` | Counts pending speech per speaker. A clip of Lumi or a foal (`lumi…`, `foal…`) is a story line; every other clip and every letter sound is Elizabeth's. A `sayAll` with any line of hers counts as hers |
| `src/audio/sound.ts` | The channel: three buses, `fx()`, the background loop, the music box, the manifest and the loading |
| `src/audio/synth.ts` | The synthesised effects, copied from `shared/audio.js` (which keeps them private) so they play on the channel's effects bus and follow its rules: the fallbacks of `fx()` and every `audio.sfx()` |
| `src/audio/tune.ts` | The music box tune as data (`tunePlan(ms)`) |
| `src/audio/dev.ts`, `dev/sound.html` | The listening page |
| `tools/audio/gen-sfx.py`, `sfx.sh` | The generator |
| `public/audio/sfx/manifest.json` | The made files: the 16 effects and the day loop since 2026-10-29, none approved yet |
| `tests/sound.test.ts` | The channel on a fake shared player and a fake Web Audio graph, the tune, the list, and the generator with a fake HTTP layer |

## The rules (section 20)

| Bus | Level | Under Elizabeth | Under a story line | Checked moment |
|---|---|---|---|---|
| Effects | 0.8 | skipped; an effect still sounding fades out in 60 ms; back at once after her | skipped, or 0.3 with `duck` (down in 60 ms, back 400 ms after the line) | plays |
| `audio.sfx()` (tick, pop, chime and the others) | as loud as through `shared/audio.js` | skipped; one still sounding fades out in 60 ms | 0.3 | plays |
| Music box | 0.6 | 0.1 | 0.1 | plays |
| Background | 0.22 | 0.08 | 0.08 | 0 (out in 400 ms, back 1.5 s after the moment) |

- `fx()` resolves at the effect's end and never later than 1 s after it started (`FX_WAIT_MS`); at once when it is skipped, muted or has nothing to play. It never throws.
- `audio.sfx()` keeps its signature but plays on the channel (section 8: no effect over or under Elizabeth, letter sounds included). A synthesised sound and a line of hers in the same tick (a chime, then the name) gives only the first 60 ms of the sound. A caller that wants the whole sound awaits `audio.sfx()` before her line.
- Nothing starts while the audio context is suspended or interrupted: it would play whenever the context wakes, out of place. The first tap after an interruption can lose its tick or pop.
- The effects bus is back at once after Elizabeth (it goes to 0 under her), so an effect asked right after her line plays whole. After a story line it comes back in 400 ms.
- A failed manifest or file is tried again 10 s later, on the next `fx()` of that effect or `ambience()` of that loop, at most 3 times. `shared/audio.js` does not remember failures either: on an old iPad a decode can fail under memory pressure.
- `audio.stop()` stops speech, letter sounds and effects, and ends the count of a held letter sound. The background loop and the music box play on.
- The shared mute (`EmmaAudio.muted`) silences the whole channel.
- `checked(on)` nests. The background is silent while any checked moment is open.

## Wiring for the other lanes

Every lane calls `audio.fx(id, opts)`. A line by Elizabeth that must follow an effect awaits it:

```ts
await audio.fx('heart-glow'); // ui/egg.ts: the third heart lights
// then the hatch, with Lumi's "It's hatching!"
```

| Effect | Lane | Call |
|---|---|---|
| egg-crack | eggs | `audio.fx('egg-crack', { duck: true, fallback: 'hatch' })` with Lumi's "It's hatching!" |
| heart-glow | eggs | `await audio.fx('heart-glow')` as the third heart lights, then the hatch. Not between sums (2.3.2): there the heart lights as Elizabeth says the fact, with no effect |
| hay-rustle | eggs | `audio.fx('hay-rustle')` as the bundles land |
| splash-1, splash-2 | actors | in turn, `{ fallback: 'splash' }`, through `ctx.sounds()` |
| slide-whoosh | actors | `{ fallback: 'whoosh' }` |
| nicker-1, nicker-2 | actors | outside checked moments, at most one per 6 s for the whole herd |
| trunk-lid, gift-paper | wardrobe-ui | board opens; chosen card pops |
| dress-swish, crown-twinkle | wardrobe-ui | only for a pick that says no word |
| bead-clink | patterns | a right bead lands |
| stable-door, bedtime-bell, owl | quests-world | bedtime-bell from 1 s into the 3 s dusk fade, so it ends with the fade before `g-dusk` (docs/v4/2.3.md section 20); `await audio.fx('owl')` before Lumi's ribbons line |
| crown-twinkle | quests-world | the welcome, before Lumi's line |

The music box: `const box = audio.musicBox(limitMs)`; `await box.done` resolves at `limitMs` by a timer, also on a silent iPad. Only `box.stop()` ends the tune early (Done, or the wardrobe closing); the timer ends it at `limitMs`, so nothing is left to play when a suspended context wakes after the box. While the context is suspended no note is scheduled, and when it runs again the tune picks up where the timer is. The tune slows in its last four bars, and its last note (the tonic) rings out exactly at `limitMs`. It is laid out back from its end and begins on the first bar line after the box opens, with its bass note (a rest of less than one bar before it). A `limitMs` of NaN, 0 or less gives a silent box that is done at once; more than 10 minutes is cut to 10.

The background: `audio.ambience('day' | 'night' | null)` crossfades over 2 s. Step 0 already wires day at Play, night at dusk and the right one on a jump. Night has no file in 2.3.0, so at dusk the day loop fades out and the night is quiet. A loop asked for before its file has loaded starts when it has loaded.

## Made files and approved files

2.3.0 plays every made file, also one the manifest does not mark `approved` yet, so the first build has its effects before Tjitse has listened (the integrator's call for the morning build, `listenAll` in `src/audio/index.ts`). `?sfx=approved` on the game address plays only the approved files, as section 20 planned; every other effect then plays its fallback or nothing. A sound he does not like is retaken (`--retake`) or its file removed. The listening page plays every made file.

## The listening page

`dev/sound.html` in `vite dev` (any port but 8765), for example from the game folder: `npx vite --port 8792`, then `http://127.0.0.1:8792/dev/sound.html`. Tap Start (the iPad needs a tap before it plays sound). It has:

- every effect with its status (approved, not approved, or its fallback), where it plays and its prompt;
- the rules as small scenes: an effect that fades when Elizabeth starts, an effect skipped under her and under a letter sound, heart-glow before her line, the egg crack ducked under Lumi;
- the day loop with a checked-moment switch, speech over it and "Hear the seam" (2 s before the loop point);
- the music box at 45, 60, 30 and 10 s, with speech over it.

## The generator: probe and pack

Run outside the sandbox, from the main tree's root (`/Users/tjitse/sites/emmas-game`, where the key file is), after the sound lane is merged. Each command reads the cap, the floor and the rate from `tools/audio/budget.json` and books into `tools/audio/ledger.jsonl` with the speech.

1. The plan, which calls nothing: `sh games/moon-meadow-world/tools/audio/sfx.sh --dry-run`
   It shows 16 effects and the day loop: 1,404 credits at 40 a second. Add `--left N` to check the floor against the credits the ElevenLabs site shows.
2. The probe: `sh games/moon-meadow-world/tools/audio/sfx.sh --probe`
   Run it with 10 quiet minutes before it: no other generation run (speech or effects) in that time, because the account counter lags a few minutes. It first reads the counter until two reads 60 s apart agree (it gives up after 10 minutes and spends nothing). Then it makes only `bedtime-bell` (2 s, booked at 80) and reads the counter every 30 s for up to 10 minutes until it moves. It writes `sfxProbe` and `sfxPerSecond` into budget.json, never below 40, and books what the probe really took when that is more than 80. A counter that has not moved gives no rate. When the probe cost more than 50 credits a second (or 200 for the call), it says so.
3. The plan at the measured rate: `sh games/moon-meadow-world/tools/audio/sfx.sh --dry-run`
4. The pack:
   - normally: `sh games/moon-meadow-world/tools/audio/sfx.sh`
   - when the probe said more than 50 a second: `sh games/moon-meadow-world/tools/audio/sfx.sh --core` (the eight `core` effects and the day loop; the rest waits for 2.3.1). A plain run is then refused; `--full` makes the whole pack anyway, only on Tjitse's word.
5. Tjitse listens on `dev/sound.html`, then: `sh games/moon-meadow-world/tools/audio/sfx.sh --approve egg-crack,trunk-lid,…` (calls nothing).
6. A sound he does not like: `sh games/moon-meadow-world/tools/audio/sfx.sh --retake owl` (it costs again; the old file is kept in `.cache/sfx/old/`).

How it spends:

- A file that exists is never made again without `--retake`, because the API has no seed. Every raw file stays in `.cache/sfx/`. When a run stopped after a POST that worked (ffmpeg failed), the next run processes that raw file without a call and without booking.
- It refuses the whole run when the ledger plus the plan passes the cap, or when the credits left minus the plan fall under the floor (10,000).
- `POST /v1/sound-generation` goes through the speech script's `http()` with `tries=1`: one attempt per call. Every attempt is booked before its call, also one that fails, and a failure stops the run.
- The run has one ledger line (`"lines": "sfx"`, `made`, `seconds`, `credits`, `credits_before`, `attempts`, `ids`, `run`), written before the first call and rewritten after each attempt.
- ffmpeg: mono, 44.1 kHz, 96 kbps. Effects: trailing silence under -50 dB trimmed (50 ms kept), a 5 ms fade-in, the peak at -3 dBFS. Loops: one gain to -20 LUFS (no limiter, so the seam stays), not trimmed.
- The loop points (Claude's call, against section 20's "from the decoder delay"). Browsers keep different amounts of the MP3 encoder delay in front of the sound: Chrome none, WebKit 576 samples (measured in playwright-cli's WebKit), a plain decoder 1105. One fixed `loopStart` is wrong in at least one of them, and the loop would then run 12 to 25 ms into the padding at every seam. So the file holds the loop twice (30 s, about 360 kB) and the window is the middle period, from 7.5 s to 22.5 s. It is exactly one period long and lies inside the sound whatever the decoder keeps in front. Checked in WebKit on a synthetic loop: the samples on both sides of the seam correlate at 0.98.

## Known limits

- A held letter sound counts as Elizabeth until its `done` resolves, its `stop()`, `audio.stop()`, or the next letter sound without overlap or the next hold (the cuts the shared player makes). When that next letter sound is missing, the shared player does not cut the hold, but the count of the hold has ended. Nothing in 2.3.0 calls `audio.hold`.
- The tune starts on a bar line, but not always on bar 1: the last four bars have a fixed place at the end, and 92 a minute leaves no room to fit whole loops into every length.
- The fallbacks in `synth.ts` are copies. A change to `shared/audio.js`'s effects does not reach them.
- The channel counts a queued line as Elizabeth's from the moment it is queued, so an effect after a queued line is skipped early. That errs on the side of her words.
