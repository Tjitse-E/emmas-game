# Moon Meadow Home

Unicorn Egg Nest v3. Spec: [docs/v3/spec.md](../../docs/v3/spec.md). Decisions: [docs/v3/decisions.md](../../docs/v3/decisions.md). Plans: [docs/v3/plan.md](../../docs/v3/plan.md) and [docs/v3/plan/](../../docs/v3/plan/), with the shared types in [docs/v3/plan/contracts.ts](../../docs/v3/plan/contracts.ts).

Svelte 5 + Vite + TypeScript on the DOM, a fixed 1180 x 820 stage scaled to fit, built for Safari 15 and later. Speech is pre-generated ElevenLabs audio played through [shared/audio.js](../../shared/audio.js). One Node script in [server/](server/) serves the repo, the build and (from Wave C) the save API.

## Play tonight

Emma's server runs on the Mac on port 8765. It serves `dist-emma`, release 1.0.1, promoted from commit 0c38970 on 13 October 2026 after the 1.0.1 gate passed.

- iPad: open http://MacBook-Pro-3.local:8765/ideas/opus-5-5-unicorn-egg-nest-v2/ in a Safari tab (not a home-screen icon) and tap the small moon button under the home button at the top right. That opens Moon Meadow Home on the same address as her v2 save, so her herd moves in.
- If the `.local` name does not open, use http://192.168.88.171:8765/ideas/opus-5-5-unicorn-egg-nest-v2/. Her save is stored per address, so use the address she used for v2 until now. The other address shows an empty herd.
- The LAN address can change after a router restart. `go-live.sh` prints the current one.
- Restart after a reboot or a sleep: `bash games/moon-meadow-home/tools/go-live.sh` from the repo root (outside the Claude Code sandbox).
- Log with each request's iPad version: `games/moon-meadow-home/.data/serve.log`.
- Fallback: if her herd does not move in (another address, or storage cleared), open `ideas/opus-5-5-unicorn-egg-nest-v2/move.html` on the address she used for v2, download the file, and import it in the parent corner under Backup.

## What is new in 1.0.1

First check for Tjitse: after the release, open the parent corner on Emma's iPad and look at Overrides. Maths must read "current M12A" (or a later step from M12B to M12F once she has played a few eggs). If it shows a step before M12A, tap "Make current" on M12A twice. The move to M12A was tested on a synthetic Wave A save only, unless the release notes say her real export was checked (plan section 15, step 6).

1.0.1 answers Emma's first play of Wave A (12 October 2026). It is live for her since 13 October 2026. Plan: [docs/v3/next/plan.md](../../docs/v3/next/plan.md).

- Harder maths. Each egg asks a different total, from 7 up to 15. Totals over 10 show a second nest of cups. Making 10 comes back only now and then.
- Feeding. The first wish is sometimes "I'm hungry!": she reads the food word and feeds the baby. In the meadow the treat button is a tray of three foods that say their names.
- The lantern walk. Goodnight starts in the meadow at dusk. She reads the name on the lantern and leads that baby along a glowing path into the stable. The others follow, lie down in the straw, and she can tuck them in.
- Feeding in the stable. Before bed one baby asks for a food, or the hay rack needs filling ("The hay rack needs fifteen bundles. Nine are in."). Then she can feed every baby. A long visit skips this, so bedtime stays short.
- Polish (live 13 October 2026). The babies lie down in the straw where she can see them, and the whole stable gets dark at bedtime. Babies in neighbouring stalls want different foods, a baby that refuses a food says the wanted food again, and the hay bundles are big enough to count by touch. Maths probes never repeat the same item twice in a row.

Her save moves up in maths once. On the first load, a year 1 save whose maths sits on bonds to 10 (M09 to M12) becomes current at M12A, pairs that make 7, 8 and 9. M09 to M12 count as placed and come back only as review. Her next eggs are a short check: two eggs a step from M12A up to M12F. Two right first tries move to the next step; two that are not first stop the check there, and that step becomes current. So a child who already knows 7, 8 and 9 reaches 11 and 12 on the first day. Once half of her current step is going well, one egg a visit comes from the next band (11 and 12, later 13 to 15) as a preview. The move happens one time only: a step set in the parent corner later always wins. To set it back, open Overrides and tap "Make current" twice on the step you want (for example M10).

Gate: `bash tools/gate.sh 1.0.1` from this folder, outside the sandbox. It needs `content/release.json` at `1.0.1`, runs the flows in `flows/gate-1.0.1.txt` and treats the flows in `flows/gate-1.0.1-warn.txt` as warnings, like Gate A. `flows/integration/upgrade.flow.sh` loads a Wave A save (`tests/fixtures/wave-a-save.json`, made by `node tools/make-wave-a-save.ts`) and checks the move to M12A.

## Watch Emma play

Sit next to her and note:

- Does she understand Lumi without help? Note each time she looks at you, and what Lumi had just said.
- Harder maths: which totals does she get right on the first try, and where does she stop? Note whether she uses the second nest of cups for totals over 10, and whether the missing-number eggs ("5 and ? make 8") stop her.
- Feeding: when a baby is hungry, does she read the food word herself, or wait for it to be spoken? Does she find the right food in the basket? Does she use the food tray in the meadow, and does she mix up look-alike foods?
- Lantern walk: does she read the name on the lantern and find that baby? Can she drag it along the glowing path to the stable gate? Does she tuck the babies in without being told?
- Feeding in the stable: does she understand what a baby at the manger wants? On a hay rack evening, does she work out how many bundles are missing? Does she find the moon to go to bed, or does the feeding feel too long?
- Does she name babies without a refused name? Note each name she tries and how she reacts when the bell does not take it.
- Where does she get stuck or bored? Note the scene and what she did just before.
- What does she ask for?
- Anything that breaks: a frozen screen, a missing sound, a wrong picture. Note the time, so it can be found in `serve.log`.

Afterwards, export the save:

1. Hold the small lock button at the top right, next to the home button, for 3 seconds.
2. Enter the PIN on the number-word keypad. The default PIN is 2468.
3. Scroll down to Backup and tap "Export the save". Safari downloads the file to Files, Downloads.
4. AirDrop it to the Mac and put it in `games/moon-meadow-home/.data/` (gitignored). `node tools/report.ts <file>` from this folder prints the report.

## Checks for Tjitse

The 1.0.1 gate passed all blocking checks: 1214 tests, `npm run check` clean, `check:audio` and `check:content` without errors, and every blocking flow at three iPad sizes. These checks need the iPad, odin or your ear, so this session could not run them:

- Real iPad: open `http://MacBook-Pro-3.local:8765/games/moon-meadow-home/stress.html` and read the verdict. The WebKit stress run on the Mac was fine (about 60 fps, 26 MB decoded).
- Real v2 save: watch Moving Day tonight. Only synthetic v2 saves were tested.
- Home screen and offline: plain http has no service worker or `persist()`. Export after each evening until Wave C brings the server copy.
- odin: nothing is deployed there yet. Emma plays from the Mac only.
- Ear check: listen to new clips on `shared/review.html`. Clips that failed the speech check are never served. `check:content` lists 116 missing pictures or clips (the game shows a fallback).

## Commands

Run from the repo root. `npm install` and `npm ci` run outside the Claude Code sandbox, because npm cannot write its cache inside it. In a lane worktree `node_modules` is a link to the main tree's: never install there.

| Command | What it does |
|---|---|
| `npm --prefix games/moon-meadow-home install` | Install the pinned dependencies (outside the sandbox, main tree only). |
| `npm --prefix games/moon-meadow-home run build` | Build Emma's version into `dist/`. |
| `npm --prefix games/moon-meadow-home run build:test -- --outDir dist-test-<lane>` | Build the test version (with `window.__game`) into `dist-test-<lane>/`. |
| `npm --prefix games/moon-meadow-home test` | Vitest. |
| `npm --prefix games/moon-meadow-home run check` | `svelte-check` and `tsc`, 0 errors expected. |
| `npm --prefix games/moon-meadow-home run check:content` | Validate the content packs. |
| `npm --prefix games/moon-meadow-home run check:audio` | Check every audio pack: each line has its clip, the clip says the current text and narrator-only lines are Elizabeth's. |
| `npm --prefix games/moon-meadow-home run audio:ids` | Regenerate `src/audio/clip-ids.generated.ts` from `content/lines/`. |
| `npm --prefix games/moon-meadow-home run serve:test` | Serve `dist-test` on `MMH_PORT` (default 8766) on 127.0.0.1. |
| `npm --prefix games/moon-meadow-home run flows` | Build the test version, serve it and run every playwright-cli flow at three iPad sizes (outside the sandbox). |
| `bash games/moon-meadow-home/tools/gate.sh A\|1.0.1\|B\|C` | Run a wave gate or the 1.0.1 gate (outside the sandbox). |
| `bash games/moon-meadow-home/tools/promote.sh` | Build and copy into `dist-emma`, Emma's build. Only after a gate passed. |
| `bash games/moon-meadow-home/tools/go-live.sh` | Start Emma's server on port 8765 and check it from the home network. Also the restart command after a reboot. |

## Ports

Port 8765 is Emma's live server. It serves `dist-emma`, and only `tools/go-live.sh` starts or stops it. Agents and tests never use it. The integration flows and gates use 8766. Each lane has its own port (platform 8771, heartbeat 8772, places 8773, art 8774, audio 8775, learning 8776, sync 8799). The list is `PORTS` in [contracts.ts](../../docs/v3/plan/contracts.ts).

## Flows

A flow is a shell script `flows/<name>.flow.sh` or `flows/<folder>/<name>.flow.sh` that drives the test build with `playwright-cli` through the helpers in [flows/lib.sh](flows/lib.sh) and the test hook `window.__game`. Run them outside the sandbox:

```sh
MMH_LANE=platform MMH_PORT=8771 bash games/moon-meadow-home/flows/run.sh platform-smoke heartbeat/naming
```

`run.sh` builds `dist-test-<lane>`, starts the server on `MMH_PORT` (or reuses one that is up), and runs each flow at 1180 x 820, 1080 x 810 and 1024 x 768. `MMH_NO_BUILD=1` skips the build. Screenshots go to `$TMPDIR/mmh-shots/`, never into the repo.

## Serving

[server/README.md](server/README.md) has the settings (`PORT`, `HOST`, `MOON_DIST`, `MOON_BASE`, `MOON_DATA`), how Emma's server runs and what plain http means for the game. The server never serves dot files such as the key file, `.git` or `.data`.

Emma opens `http://<LocalHostName>.local:8765/` in Safari and taps the Moon Meadow Home card (or goes straight to `/games/moon-meadow-home/`). `scutil --get LocalHostName` on the Mac gives the name. v3 uses the same address as v2, so it can read her v2 herd from this origin's storage. Another host name or port shows an empty herd.

## Folders

| Folder | What is in it |
|---|---|
| `src/platform/` | Stage, scene router and registry, touch input, timing, clock, hooks, the Play gate, PWA status. |
| `src/ui/` | Shared interaction parts, including the ghost hand and the moonbeam. |
| `src/core/` | Pure rules: ids, hashes, the event log and its folds, learning, the planner, maths, phonics, naming and places. No DOM. |
| `src/save/` | IndexedDB storage, file export and import, `persist()`. |
| `src/audio/` | The typed facade over `shared/audio.js`. `clip-ids.generated.ts` is generated by `npm run audio:ids`. |
| `src/art/` | The art manifest loader, the unicorn and egg parts and their SVG fallbacks. |
| `src/game.svelte.ts`, `src/game/` | The store that joins the core, the scenes and the test hook. |
| `src/scenes/`, `src/<folder>/scenes.ts` | Scenes. A file `src/scenes/Nest.svelte` is scene `nest`. A plain-object export of `src/<folder>/scenes.ts` registers more scenes. |
| `src/places/` | The meadow places: navigation, the session plan and the places scenes. |
| `src/parent/` | The parent corner behind the PIN gate. |
| `src/types/` | A verbatim copy of `docs/v3/plan/contracts.ts`. |
| `src/stress/`, `stress.html` | The meadow stress test page. |
| `content/` | Learning content, lines and release settings as JSON. |
| `public/audio/<pack>/` | Clip packs made by `tools/audio/gen.sh` (which calls `scripts/generate-audio.py`). |
| `public/art/`, `art-src/` | The cut pictures with their `manifest.json`, and the generated source sheets they are cut from. |
| `server/` | The Node server: static files and, from Wave C, the save API. |
| `tools/` | Content, audio, art and gate scripts. |
| `flows/` | playwright-cli flows (`*.flow.sh`), their helpers and the gate lists. |
| `tests/` | Vitest suites. |

The letter sounds come from `shared/audio/phonics/`. `tools/vite-shared-audio.ts` serves them in dev and copies them into the build at `audio/phonics/`.
