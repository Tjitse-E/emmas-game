# Moon Meadow server

One Node script serves the whole repo on the home network, the v3 build under `/games/moon-meadow-home/`, and (from release 1.3) the save API. It replaces `python3 -m http.server`. No dependencies: Node 24 runs the TypeScript directly.

## Play on the iPad tonight

Emma's server is started by `tools/go-live.sh` (integration), which serves the promoted build in `dist-emma`. By hand:

1. Build the game: `cd games/moon-meadow-home && npm run build`, then copy `dist` to `dist-emma` (or run `tools/promote.sh`).
2. Stop any `python3 -m http.server 8765` that still runs. Both want port 8765.
3. From the repo root: `MOON_DIST=dist-emma PORT=8765 HOST=0.0.0.0 node games/moon-meadow-home/server/serve.ts`. It prints one start line with both addresses: the `.local` name and the LAN address.
4. On the iPad, in the same Safari as always:
   - v2: `http://<mac>.local:8765/ideas/opus-5-5-unicorn-egg-nest-v2/`
   - v3: `http://<mac>.local:8765/games/moon-meadow-home/`
   - Moving Day file: `http://<mac>.local:8765/ideas/opus-5-5-unicorn-egg-nest-v2/move.html`
5. Allow incoming connections for `node` when macOS asks.

Keep the address and the port the same. v2 and v3 share this origin, so v3 reads Emma's v2 save directly, and Safari keeps one storage for both.

Each request prints one line: ISO time, method, path, status and the browser's User-Agent. The User-Agent shows which iPad and Safari version reached the server.

## Agent tests

Port 8765 is Emma's. Agents build with `npm run build:test -- --outDir dist-test-<lane>` and serve it on their lane port (contracts `PORTS`):

```sh
MOON_DIST=dist-test-core PORT=8799 HOST=127.0.0.1 node games/moon-meadow-home/server/serve.ts
```

## What plain http means

- No service worker, no `navigator.storage.persist()`, no share sheet, no `crypto.randomUUID`, no `crypto.subtle`. The game works without them: ids and hashes are pure code, export is a download.
- IndexedDB and localStorage work. Safari deletes a site's storage after 7 days of Safari use without a visit. Playing v2 or v3 counts as a visit for both.
- Until a device is paired with the save API, export in the parent corner is the backup.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8765` | Port |
| `HOST` | `0.0.0.0` | Interface. Use `127.0.0.1` for tests and behind odin's proxy |
| `MOON_DIST` | `dist` | Build folder inside `games/moon-meadow-home/`: `dist-emma` for Emma, `dist-test-<lane>` for tests |
| `MOON_BASE` | `/games/moon-meadow-home/` | Base path of the v3 build and the API (`/unicorns/` on odin) |
| `MOON_CSP` | on | `off` drops the Content-Security-Policy header, only to debug a blocked script |
| `MOON_DATA` | `<repo>/.data/moon-meadow` | Save server data (release 1.3) |
| `TRUST_PROXY` | off | `1` behind odin's reverse proxy |

The server never serves dotfiles or dot folders (the key file, `.git`, `.data`) or `node_modules`. Under the base path it serves the build folder. Only paths that start with `art-src/` or `flows/` and are missing from the build fall back to the game folder (read only), so the art contact page and the flow pages load from a lane server. Source files are never served.
