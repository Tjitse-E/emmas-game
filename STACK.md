# Stack

## Language and libraries

- JavaScript or TypeScript. Any library is allowed.
- Mockups in `ideas/` are single, self-contained `index.html` files so they open without a build step. Libraries load from a CDN with a pinned version.
- Chosen games may move to a proper build (for example Vite + TypeScript, with a game library such as Phaser or PixiJS where it helps).

## Target device: iPad

- Emma plays on an iPad in Safari, touch only, mostly landscape.
- Her iPad is an **iPad 8th generation (2020), 32 GB, iPadOS 26.5.2**: A12 chip, 3 GB memory, a 2160 x 1620 screen (2x). This is the device we build for.
- Design for landscape `1080 x 810` CSS pixels (her iPad), and about `1080 x 740` with Safari's bars showing. Check portrait `810 x 1080` and the larger `1180 x 820` (iPad 10th gen / iPad Air) as well.
- Touch targets at least 64 x 64 px. No hover states, no keyboard input, no double tap.
- Disable page zoom, text selection and pull-to-refresh during play.
- Audio on iOS only starts after a user tap, so every game starts with a big "Play" button.

## Testing

Browser testing uses `playwright-cli` with WebKit and iPad emulation. The config lives in `.playwright/cli.config.json` and is picked up automatically.

`playwright-cli` blocks `file:` URLs, so serve the repo over HTTP first. The Node server in `games/moon-meadow-home/server/` serves the whole repo and never serves dot files such as `.env`. Settings: `PORT`, `HOST` (use `127.0.0.1` for checks) and `MOON_DIST` (the v3 build folder, default `dist`). Run it outside the sandbox, from the repo root:

```sh
PORT=8770 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts &
playwright-cli -s=check open http://127.0.0.1:8770/ideas/<idea-slug>/index.html
playwright-cli -s=check screenshot --filename "$TMPDIR/shot.png"
playwright-cli -s=check resize 820 1180   # portrait check
playwright-cli -s=check close
```

Never use port 8765: it is Emma's live server. Use a free port that is not in `PORTS` in [docs/v3/plan/contracts.ts](docs/v3/plan/contracts.ts) (the example uses 8770). Stop the server when you are done.

Moon Meadow Home has scripted flows with their own runner: `MMH_LANE=<lane> MMH_PORT=<port> bash games/moon-meadow-home/flows/run.sh` (see its [README](games/moon-meadow-home/README.md)).

Notes:
- The browser does not start inside the Claude Code sandbox. Run `playwright-cli` outside it.
- WebKit emulation reports `navigator.maxTouchPoints = 0`. Do not use it to detect touch. Use pointer events, which work for both mouse and touch.

## Sound: ElevenLabs

- Speech: ElevenLabs text-to-speech. Voice **Elizabeth** (British English) is the narrator and speaks instructions, words, letter sounds and praise. Characters have their own voices, listed in [VOICES.md](VOICES.md).
- Sound effects and music: ElevenLabs sound effects and music generation, where needed.
- Audio is generated ahead of time and saved as files (for example `ideas/<idea-slug>/audio/*.mp3`). The game never calls the API from the browser, so the API key never reaches the client.
- The API key is `ELEVENLABS_API` in `.env` (gitignored). The generation script loads `.env` itself. It is never committed.

## Games with a build (`games/`)

- Chosen games move from `ideas/` to `games/<slug>/`: Vite 8 + Svelte 5 + TypeScript 6, exact versions in `package.json`, lock file committed. Moon Meadow Home is the first.
- The build uses a relative base, so `dist/` works at any path. It targets Safari 15 (iPad Air 2).
- Unit tests run with Vitest. Browser checks use the flows in `games/<slug>/flows/`.
- Sound still goes through `shared/audio.js`, bundled into the game. Clip packs live in `games/<slug>/public/audio/<pack>/`.
- npm cannot write its cache inside the Claude Code sandbox. `npm install`, `npm ci` and `npx` installs run outside it, or inside it with `--cache "$TMPDIR/npm-cache"` and `registry.npmjs.org` allowed.
- Parallel agents each work in their own git worktree `.worktrees/<lane>` on branch `lane/<lane>`, with `node_modules` linked to the main tree's. Never run `npm install` in a worktree. The integrator merges the lane branches into `main`.

## Hosting

- Now: Tjitse's Mac serves the repo on the home network on port 8765. Emma opens `http://<LocalHostName>.local:8765/` in Safari (`scutil --get LocalHostName` gives the name). v2 and v3 share that origin, so v3 can read the v2 herd.
- The server serves Moon Meadow Home from `games/moon-meadow-home/dist-emma`, a promoted copy of the build. `tools/promote.sh` builds and copies into it, only after a gate passed. Older hashed files stay, so an open tab keeps working.
- `tools/go-live.sh` (in `games/moon-meadow-home/`) starts the server, outside the sandbox, and checks it from the LAN address and the `.local` name. It is also the restart command after a reboot or a sleep.
- Plain http has no service worker and no `navigator.storage.persist()`. The game works without them and uses them on HTTPS.

## Deployment

- Online: https://emmas-games.vendic.cloud, its own hosting account (`emmasgames@odin.vendic.cloud`, SSH port 2222, web root `~/httpdocs`). No other app shares this domain, so no other service worker can take over its pages.
- `bash scripts/deploy.sh` uploads the picture menu (the game chooser at `/`), `menu-audio/`, `shared/`, the three v2 games in `ideas/` and the promoted Moon Meadow Home build (`dist-emma`) at `/games/moon-meadow-home/`. It never uploads dot files. Run it outside the sandbox, and only when Tjitse asks for a deploy.
- Every deploy is a new version in [CHANGELOG.md](CHANGELOG.md), which agents keep by hand: a new game bumps the major version, new levels or features the minor version, bug fixes the patch version. Add the entry at the top, commit, build, then deploy. `deploy.sh` reads the newest version, refuses one that was deployed before or uncommitted changes, uploads, and tags `v<version>`. The menu and the Moon Meadow World start screen show the version, bottom right. A pre-release that Emma plays before a version is finished gets its own entry and tag, `X.Y.Z-pre.N` (for example `2.3.0-pre.1`); the finished version's entry goes above it.
- A new game gets a card in `index.html` and a line in `scripts/deploy.sh`. A game that adds a service worker limits it to its own folder, caches only its own files and never sends pages outside its folder to its own start page.
- The vhost ignores `.htaccess`. Pages are served with `no-cache`.
- Saves live in the browser per domain. Progress made on the home server (port 8765) does not carry over to the online site.
