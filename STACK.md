# Stack

## Language and libraries

- JavaScript or TypeScript. Any library is allowed.
- Mockups in `ideas/` are single, self-contained `index.html` files so they open without a build step. Libraries load from a CDN with a pinned version.
- Chosen games may move to a proper build (for example Vite + TypeScript, with a game library such as Phaser or PixiJS where it helps).

## Target device: iPad

- Emma plays on an iPad in Safari, touch only, mostly landscape.
- Design for landscape `1180 x 820` CSS pixels (iPad 10th gen / iPad Air). Check portrait `820 x 1180` and the smaller `1080 x 810` (older iPads) as well.
- Touch targets at least 64 x 64 px. No hover states, no keyboard input, no double tap.
- Disable page zoom, text selection and pull-to-refresh during play.
- Audio on iOS only starts after a user tap, so every game starts with a big "Play" button.

## Testing

Browser testing uses `playwright-cli` with WebKit and iPad emulation. The config lives in `.playwright/cli.config.json` and is picked up automatically.

`playwright-cli` blocks `file:` URLs, so serve the repo over HTTP first:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 &
playwright-cli open http://127.0.0.1:8765/ideas/<idea-slug>/index.html
playwright-cli screenshot
playwright-cli resize 820 1180   # portrait check
playwright-cli close
```

Notes:
- The browser does not start inside the Claude Code sandbox. Run `playwright-cli` outside it.
- WebKit emulation reports `navigator.maxTouchPoints = 0`. Do not use it to detect touch. Use pointer events, which work for both mouse and touch.

## Sound: ElevenLabs

- Speech: ElevenLabs text-to-speech. Voice **Elizabeth** (British English) is the narrator and speaks instructions, words, letter sounds and praise. Characters have their own voices, listed in [VOICES.md](VOICES.md).
- Sound effects and music: ElevenLabs sound effects and music generation, where needed.
- Audio is generated ahead of time and saved as files (for example `ideas/<idea-slug>/audio/*.mp3`). The game never calls the API from the browser, so the API key never reaches the client.
- The API key is `ELEVENLABS_API` in `.env` (gitignored). The generation script loads `.env` itself. It is never committed.

## Deployment

- Target: dedicated bare metal server `odin.vendic.cloud`.
- The games are static files (HTML, JS, audio), served by a plain web server.
- Deployment details to be decided when the first game is chosen.
