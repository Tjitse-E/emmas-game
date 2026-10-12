# Moon Meadow Home platform: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The skeleton every other v3 workstream builds on: the Svelte app shell on a fixed 1180 x 820 stage, scene router, touch input, audio integration, ghost hand and moonbeam, the test infrastructure, and one Node server that serves the repo and the save API on port 8765, so Emma can play v3 on her iPad over the home network tonight.

**Architecture:** A Vite + Svelte 5 + TypeScript app in `games/moon-meadow-home/`, built with a relative base (`./`) so the same `dist/` works at `/games/moon-meadow-home/` on the Mac and at `/unicorns/` on odin. Pure logic (geometry, drag tracking, router history, ids, hashing, clip-id generation, server storage and auth) lives in plain `.ts` files with Vitest tests. Svelte parts are thin and are checked with `playwright-cli` flows through a `window.__game` test hook. The server is Node 24 with type stripping and the standard library only.

**Tech Stack:** Node 24.19.0, npm 12, Vite 8.3.4, TypeScript 6.0.3, Svelte 5.57.2, @sveltejs/vite-plugin-svelte 7.3.1, svelte-check 4.7.6, Vitest 5.0.3, idb 8.0.3, vite-plugin-pwa 1.3.0, @fontsource/andika (latin 400 and 700), playwright-cli 0.1.8 (WebKit, iPad emulation), Python 3 with Pillow 12.3.0 (icons only).

**Spec:** `docs/v3/spec.md` (sections 4.1, 4.2, 4.5, 4.7, 4.8, 5.1 to 5.3, 6.1, 6.2, 7.1 item 1, 25, 26), with `docs/v3/decisions.md` winning on conflicts, and the lead's session decisions quoted in the task (Mac hosting on port 8765, Waves A to C, odin deploy note only).

## Reconciled with the master plan (binding)

`docs/v3/plan.md` (sections 2 and 3) and `docs/v3/plan/contracts.ts` are binding for this plan. Where a task below still shows another name, shape, port or owner, the master plan and `contracts.ts` win, and the builder changes this plan's code, never another stream's. Decisions are numbered R1 to R33 in master section 2.1.

**Dropped tasks.**
- A2 (ids and hashes): core owns `src/core/ids.ts` and `src/core/hash.ts` (R2). Platform code imports `uuid4`, `uuid5`, `newDeviceId` and `randomBytes` from `src/core/ids.ts` and `sha256Hex`, `sha1Hex` from `src/core/hash.ts` (there is no `uuidv5` or `randomBase32`).
- A6 and A7 (player additions, audio facade, phonics copy, clip id generation): the audio stream owns `shared/audio.js`, `shared/audio.d.ts` and all of `src/audio/` (R3). `tools/sync-phonics.ts` and `tools/gen-clip-ids.ts` are not written.
- A8 (static server): core Task A11 owns `server/` (R1).
- B3 (unknown names): core Task B2 and audio Task B3 (R29).
- C1, C2, C3, C4 (event log, tokens, save API, deploy note): core Tasks C2 to C6 (R1, R30).

**Changed tasks.**
- A1: write `package.json`, `tsconfig.json`, `vite.config.ts`, `src/core/rng.ts` (with `tests/core/rng.test.ts`), `content/release.json` and a placeholder `stress.html` exactly as master section 2.3. No `prepare:assets` script. `vite-plugin-pwa` waits for B1.
- A4: `src/platform/hooks.ts` also exports `registerSceneHook(scene, hook): () => void`, `sceneHook(scene)`, `testSeed(): number | null`, `isFast(): boolean` (true when `timing.speed === 0`) next to the existing `callHook(name, args)` (contracts C10). Add tests for each.
- A5: `KNOWN_SCENES` is `SCENE_IDS` from contracts C7.
- A10 test hook: `fast(on)` calls `setFast(on)` (timing) and `audio.setFast(on)`; `mute(on)` calls `audio.mute(on)`. Platform no longer owns a voice instance.
- A9: `src/main.ts` awaits `Promise.all([audio.init({ base: import.meta.env.BASE_URL + 'audio/' }), loadArtManifest()])` (audio `src/audio/index.ts`, art `src/art/manifest.ts`) before it shows Play. The Play button's pointerdown calls `audio.unlock()`. On a scene change the router calls `audio.stop()` only; scenes preload and release their own audio scene. `requestPersist` comes from core `src/save/persist.ts`; `src/platform/pwa.ts` keeps `platformStatus` and stores that result. `main.ts` imports `./game.svelte.ts` (integration Task I-1) through the eager glob until batch A4, then statically.
- A10: the test hook is contracts C10; the store registers the handlers (integration Task I-1). `flows/lib.sh` sets `MMH_URL="${MMH_URL:-http://127.0.0.1:${MMH_PORT:-8766}/games/moon-meadow-home/}"` (no `/test/` mount). `finish` checks `window.__game.audioMissing()` instead of `window.EmmaAudio.missing`. `flows/run.sh` builds `npm run build:test -- --outDir dist-test-${MMH_LANE:-gate}` unless `MMH_NO_BUILD=1`, starts core's server with `MOON_DIST=dist-test-${MMH_LANE:-gate} PORT=$MMH_PORT HOST=127.0.0.1 MOON_DATA=${TMPDIR}/mmh-${MMH_LANE:-gate}-data node server/serve.ts`, and runs each flow at 1180 x 820, 1080 x 810 and 1024 x 768. Flow files are `flows/<name>.flow.sh` or `flows/<folder>/<name>.flow.sh`. The insecure-context run starts the same server with `HOST=0.0.0.0` and opens `http://<LocalHostName>.local:$MMH_PORT/games/moon-meadow-home/`.
- A11: the controllers stay here and are the only ghost hand and moonbeam (R10). Places and heartbeat import `ghost`, `ghostTap`, `ghostMove`, `ghostStop` and `moonbeam`.
- A13: STACK.md "Testing" serves the repo with `node games/moon-meadow-home/server/serve.ts` (`PORT`, `HOST`, `MOON_DIST`), lanes never on 8765.
- B1: the service worker registers only on `https:` or on `127.0.0.1` with `?sw=1`; plain http on the home network never registers it.

**Batches (master 3.2, 3.3).** A0: A1. A1: A3, A4, A5. A2: A12, A13. A3: A9, A10, A11. B1: B1, B2, B4. Lane port 8771.

## Global Constraints

- Node 24.19.0 and npm 12. Exact versions in `package.json` (no `^` or `~`), `package-lock.json` committed.
- Vite 8.3.4, TypeScript 6.0.3, svelte 5.57.2, @sveltejs/vite-plugin-svelte 7.3.1, svelte-check 4.7.6, idb 8.0.3, vite-plugin-pwa 1.3.0, vitest 5.0.3. playwright-cli 0.1.8 as installed.
- Vite `build.target` is `safari15` (iPad Air 2 on its last iPadOS).
- A fixed 1180 x 820 stage scaled to fit, with bands in the scene colour. Landscape only. Portrait shows the turn-the-iPad picture. The parent corner works in both.
- Pointer events with `setPointerCapture`, `touch-action: none`, a drag threshold of 6 px, snap near a target. Targets at least 64 x 64 px. No hover, no double tap, no keyboard for Emma. Page zoom, text selection and pull-to-refresh are disabled.
- Animate only `transform`, `translate`, `scale` and `opacity`. No animated filters, shadows or SVG filters.
- Every interactive element has an `aria-label` (`egg`, `stone 3`, `door 19`).
- A repo hook refuses any shell command whose text names the key file. Check from the shell with the encoded path `%2eenv`; the unit tests cover the plain spelling.
- All speech is pre-generated ElevenLabs audio played through `shared/audio.js`. Never browser speech. The API key never reaches client code or git. Agents never read, print, source or copy `.env`.
- The app is fully British English. No Dutch anywhere. Unicorns only. No pressure mechanics.
- Tonight the app runs over plain `http://` on the home network. `crypto.randomUUID`, `crypto.subtle`, `navigator.storage` and service workers do not exist there. The app must work without them and use them when they exist.
- v3 must be opened on the same host name and port as v2 (`http://<LocalHostName>.local:8765/`), or it cannot read the v2 save from `localStorage`.
- Server: Node standard library only, run by Node type stripping: `.ts` import extensions, no enums, no namespaces, no parameter properties.
- `playwright-cli` runs outside the sandbox, from the repo root, with short session names without slashes. Screenshots go to `$TMPDIR/mmh-shots/`, never into the repo. On pulsing elements, use mouse move, down and up instead of `click`.
- Commits: small, plain English, no AI attribution. Platform owns only the files in the file map.

## Review Focus

1. A request for `/.env`, `/%2eenv`, `/ideas/../.env` or `/.git/config` on the home network. Expected: 404 every time, the key never leaves the Mac. Pinned in Task A8.
2. Opening `http://<mac>.local:8765/games/moon-meadow-home` without the trailing slash. Expected: a redirect to the slash URL, so relative asset and audio paths resolve. Pinned in Task A8.
3. The app on plain `http://` (an insecure context) on the iPad. Expected: no crash from missing `crypto.randomUUID`, `crypto.subtle`, `navigator.storage` or service worker. Pinned in Tasks A2 (pure ids and hashes), A9 (`requestPersist` returns `unavailable`) and A10 (the smoke flow run once against the LAN host name with `isSecureContext === false`).
4. A drag interrupted by a second finger, an iPad rotation or a system gesture (`pointercancel`). Expected: the item snaps back and nothing is stuck. Pinned in Task A3 (`DragTracker` cancel and second-pointer tests).
5. The Mac losing power while the server writes `events.jsonl`. Expected: on restart the torn last line is dropped, every complete event is kept and new events append cleanly. Pinned in Task C1.

---

## File map

All paths below `games/moon-meadow-home/` unless they start with a repo-root folder name (`shared/`, `docs/`, `menu-audio/`, `AGENTS.md`, `STACK.md`, `IDEAS.md`, `index.html` at the root, `.gitignore`).

| Path | Responsibility |
|---|---|
| `package.json` | Pinned dependencies and every npm script of the game. |
| `package-lock.json` | Lock file. |
| `.gitignore` | `node_modules/`, `dist/`, `dist-test/`, `.data/`, `public/phonics/`. |
| `tsconfig.json` | One strict TypeScript config for app, tests, tools and server. |
| `vite.config.ts` | Vite build (relative base, `safari15`, `dist` or `dist-test`), dev server, Vitest config. B1 adds the PWA plugin. |
| `svelte.config.js` | Runes mode. |
| `index.html` | Vite entry page: viewport, iOS web-app metas, `#app`. |
| `README.md` | How to run, build, test and serve the game. |
| `src/main.ts` | Boot: font, CSS, guards, touch source, audio init, mount, test hook in non-production builds. |
| `src/App.svelte` | Composition: Stage, Router, Moonbeam, GhostHand, HomeButton, PlayGate. |
| `src/app.css` | Global CSS: no selection, no zoom, bands, button reset, `.press-down`. |
| `src/env.d.ts` | Vite client types and `VITE_MENU_URL`. |
| `src/test-hook.ts` | `window.__game` in non-production builds. |
| `src/platform/fit.ts` | Stage size constants, `computeFit`, `toStagePoint`. Pure. |
| `src/platform/geometry.ts` | `Point`, `Rect`, `distanceToRect`, `nearestTarget`, `pastThreshold`, `unionRect`, `beamPolygon`. Pure. |
| `src/platform/drag-tracker.ts` | `DragTracker`: the press, drag, tap, drop and cancel state machine. Pure. |
| `src/platform/timing.ts` | Speed factor for the test hook, `dur`, `sleep`, `frame`, `anim`. |
| `src/platform/clock.ts` | Game clock with a test offset. |
| `src/platform/touch.ts` | One global "Emma touched" signal: `onTouch`, `emitTouch`, `lastTouchAt`. |
| `src/platform/lifecycle.ts` | Hidden, shown and 30-minute visit timeout signals. |
| `src/platform/ids.ts` | `uuid4`, `uuidv5`, `sha1Hex`, `sha256Hex`, `randomBase32`, pure and usable on plain http, in Node and on the server. |
| `src/platform/hooks.ts` | Test hook registry (always shipped, tiny): `registerHook`, `registerState`, `registerHookExtension`, `callHook`. |
| `src/platform/scene-ids.ts` | Known scene ids, portrait-allowed scenes, `sceneIdFromPath`. Pure. |
| `src/platform/router-core.ts` | `RouterCore`: scene history and listeners. Pure. |
| `src/platform/router.svelte.ts` | Reactive router (`route`, `router`) over `RouterCore`, clears ghost, beam and speech on change. |
| `src/platform/registry.ts` | Scene id to component loader: file glob, `*/scenes.ts` maps, `registerScenes`. |
| `src/platform/Router.svelte` | Renders the current scene, reports when it mounted. |
| `src/platform/MissingScene.svelte` | Calm fallback for a scene that is not built. |
| `src/platform/stage.svelte.ts` | Reactive fit, bands, `stageEl`, `clientToStage`, `elementRect`. |
| `src/platform/Stage.svelte` | The scaled 1180 x 820 stage and the portrait turn picture. |
| `src/platform/TurnPicture.svelte` | The turn-the-iPad picture. |
| `src/platform/guards.ts` | Blocks pinch zoom, double-tap zoom, long-press menus, selection, multi-touch scroll. |
| `src/platform/input.ts` | Svelte actions `press`, `drag`, `dropTarget`. |
| `src/platform/boot.svelte.ts` | `bootState`, `setStartHandler`, `startGame`. |
| `src/platform/PlayGate.svelte` | The big Play button that unlocks audio and starts the game. |
| `src/platform/HomeButton.svelte` | Round home button to the picture menu. |
| `src/platform/pwa.ts` | `requestPersist`, `platformStatus`. B1 adds `canUseServiceWorker`, `registerServiceWorker`. |
| `src/platform/offline.ts` | B1: `isOnline`, `isCached`. |
| `src/platform/images.ts` | B2: `Lru`, `useBackground`, `preloadImages` (at most three full backgrounds decoded). |
| `src/platform/PlatformDemo.svelte` | Test-build-only scene that exercises press, drag, ghost hand and moonbeam. |
| `src/ui/targets.ts` | `Target` type, `findByLabel`, `rectOf`, `centreOf`. |
| `src/ui/ghost-hand.svelte.ts` | Ghost hand controller: `ghost.tap`, `ghost.drag`, `ghost.hide`, aliases `ghostTap`, `ghostMove`, `ghostStop`. |
| `src/ui/GhostHand.svelte` | Renders the ghost hand. |
| `src/ui/moonbeam.svelte.ts` | Moonbeam controller: `moonbeam.show`, `moonbeam.clear`. |
| `src/ui/Moonbeam.svelte` | Renders the moonbeam. |
| `src/audio/emma-audio.ts` | Loads `shared/audio.js` into the bundle, `emmaAudio()`. |
| `src/audio/voice.ts` | `createVoice(ea)`: typed facade with the v2 speech-order rules, `nameClipId`. |
| `src/audio/index.ts` | The app's voice instance, its named exports, `initAudio`, `audioReady`, `refreshNames`. |
| `src/audio/clip-ids.generated.ts` | Generated: `ClipId` union, `STATIC_PACKS`, `NAME_PACKS`, `CLIP_PACK`. |
| `tools/sync-phonics.ts` | Copies the letter sounds from `shared/audio/phonics/` into `public/phonics/`. |
| `tools/gen-clip-ids.ts` | Writes or checks `src/audio/clip-ids.generated.ts` from `public/audio/*/lines.json`. |
| `tools/make-icons.py` | B1: draws the home-screen icons with Pillow. |
| `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | B1: app icons. |
| `server/config.ts` | `parseArgs`: host, port, data dir, repo root, mounts. |
| `server/static.ts` | `safeJoin`, `serveFile`: safe static files with MIME, cache and CSP headers. |
| `server/http.ts` | `createAppServer`, `sendJson`, `healthOnly`: routes mounts, API and repo root. |
| `server/main.ts` | Entry: `node server/main.ts`. |
| `server/unknown-names.ts` | B3: `collectUnknownNames`, `eventsFromExport`. |
| `server/store.ts` | C1: `FamilyLog` (append-only `events.jsonl`, dedupe, paging, daily copies), `localDay`. |
| `server/tokens.ts` | C2: `Auth` (pair codes, device tokens, admin token, all hashed), `sha256`. |
| `server/ratelimit.ts` | C2: `RateLimiter`, `FailureLimiter`. |
| `server/admin.ts` | C2: CLI `pair`, `revoke`, `devices`, `admin-token`, `delete-family`. |
| `server/api.ts` | C3: `createApi`: `health`, `pair`, `sync`, `admin/unknown-names`. |
| `server/deploy/moon-meadow-home.service` | C4: systemd unit for odin. |
| `server/deploy/nginx-unicorns.conf` | C4: nginx reverse-proxy snippet for odin. |
| `server/deploy/nl.vendic.moon-meadow-home.plist` | C4: optional launchd job for the Mac. |
| `flows/lib.sh` | Shared flow helpers: `pw`, `val`, `hook`, `state`, `tap`, `drag_to`, `drag_by`, `shot`, `open_app`, `start_play`, `wait_for`, `finish`. B4 adds `reload_app`, `advance_hours`. |
| `flows/run.sh` | Builds the test app, starts the test server, runs flows at 1180 x 820, 1080 x 810 and 1024 x 768. |
| `flows/platform-smoke.flow.sh` | Gate, stage scale, Play, portrait turn picture, insecure-context check. |
| `flows/platform-input.flow.sh` | Press, drag to a target, drag to nowhere, ghost hand, moonbeam. |
| `flows/platform-offline.flow.sh` | B1: service worker on 127.0.0.1, offline reload. |
| `flows/platform-visits.flow.sh` | B4: clock offset survives a reload. |
| `tests/platform/*.test.ts`, `tests/audio/*.test.ts`, `tests/tools/*.test.ts`, `tests/server/*.test.ts` | Vitest suites for everything above. |
| `shared/audio.js` (repo root) | Additive only: `addPack`, `packClips`, `forget`, `stopSpeech`, `onMissing`. v2 behaviour unchanged. |
| `shared/audio.d.ts` (repo root) | Types for `shared/audio.js`. |
| `shared/README.md` (repo root) | Documents the new player functions. |
| `index.html` (repo root) | The picture menu gets a Moon Meadow Home card. |
| `menu-audio/lines.json` and `menu-audio/menu-moon-meadow-home.mp3` | Elizabeth says "Moon Meadow Home!". |
| `AGENTS.md`, `STACK.md`, `IDEAS.md`, `.gitignore` (repo root) | Docs and ignore rules for the `games/` folder and the Node server. |
| `docs/v3/deploy-odin.md` | C4: the odin deploy note. |

---

## Contracts I produce

Other workstreams code against these. Names and types are exact.

### Scenes and router

- A scene is a Svelte 5 component with props `{ params: Record<string, unknown> }`.
- Scene ids are plain strings. Three ways to register a scene, in this order of precedence:
  1. `registerScenes(map: Record<string, Component<any>>): void` from `src/platform/registry.ts`, called by any module before the first navigation.
  2. Any module `src/<folder>/scenes.ts` (one level below `src/`, for example `src/places/scenes.ts`) whose named exports include plain objects mapping scene id to component. These are found by an eager glob. Example: `export const placeScenes = { 'post-box': PostBox, salon: Salon }`.
  3. Any file `src/scenes/<PascalCase>.svelte` (top level of `src/scenes/` only): `BuildingDay.svelte` is `building-day`. `src/parent/ParentCorner.svelte` is `parent`.
- `router` from `src/platform/router.svelte.ts`: `go(id: string, params?: Record<string, unknown>): Promise<void>`, `replace(id, params?): Promise<void>`, `reset(id, params?): Promise<void>`, `back(): Promise<boolean>`, `onChange(fn: (from: SceneEntry | null, to: SceneEntry) => void): () => void`, `current: SceneEntry | null`. Promises resolve once the new scene is mounted. `route` (reactive) has `current` and `navKey`.
- On every scene change the router hides the ghost hand, clears the moonbeam, calls `stop()` on audio and `release(from.id)`.
- `PORTRAIT_OK` from `src/platform/scene-ids.ts`: scenes that may show in portrait (`parent`).
- Start: `setStartHandler(fn: () => StartTarget | Promise<StartTarget>)` from `src/platform/boot.svelte.ts`, with `StartTarget = { id: string; params?: Record<string, unknown> }`. The default goes to `meadow`. `startGame(): Promise<void>` unlocks audio, asks for persistent storage, awaits `audioReady`, calls the handler and resets the router to its scene.

### Stage and input

- `setBands(top: string, bottom?: string): void` from `src/platform/stage.svelte.ts`: colour of the letterbox bands. Each scene calls it on mount.
- `clientToStage(clientX, clientY): Point`, `elementRect(el: Element): Rect` (stage units), `stageEl(): HTMLElement | null`.
- `use:press={fn}` or `use:press={{ onPress, disabled }}`: fires on pointer up inside the element (16 px slop). Adds `.press-down` (`scale: .95`) while pressed.
- `use:drag={{ data, onDrop, onTap?, onStart?, onMove?, threshold? = 6, snap? = 48, disabled? }}`. `onDrop(info: { targetId: string | null; data: T; point: Point | null })`. With a target, the node's `translate` is cleared at once and the scene moves the item in its own state. With no target, the node glides back in 250 ms, then `onDrop` runs with `targetId: null`.
- `use:dropTarget={{ id: string, accepts?: (data: unknown) => boolean }}`.
- `onTouch(fn): () => void`, `emitTouch(): void`, `lastTouchAt(): number` from `src/platform/touch.ts`. Any pointer down on the page emits a touch. Test hook `answer()` and `wrong()` emit one first.
- `watchLifecycle({ onHide?, onShow?(hiddenMs), onVisitTimeout? }): () => void` and `visitTimedOut(lastActiveMs, nowMs, limitMs = 1_800_000)` from `src/platform/lifecycle.ts`.
- `timing.speed`, `setFast(on)`, `dur(ms)`, `sleep(ms, signal?)`, `frame()`, `anim(el, keyframes, options)` from `src/platform/timing.ts`. CSS can use `calc(300ms * var(--speed, 1))`; the test hook sets `--speed` on `<html>`.
- `clock.now()`, `clock.setNow(ms | null)`, `clock.advance(ms)`, `clock.offset()`, `clock.setOffset(ms)`, `clock.tzOffsetMinutes(at?)` from `src/platform/clock.ts`. Core and the store take `now` from `clock.now()`.

### Ghost hand and moonbeam

- `type Target = Element | string | Point` (a string is an `aria-label` inside the stage).
- `ghost.tap(target, times = 2): Promise<void>`, `ghost.drag(from, to, times = 1): Promise<void>`, `ghost.hide(): void`, `ghost.visible: boolean` from `src/ui/ghost-hand.svelte.ts`. Aliases: `ghostTap = ghost.tap`, `ghostMove = ghost.drag`, `ghostStop = ghost.hide`. Any touch hides the hand.
- `moonbeam.show(targets: Target | Target[], pad = 24): void`, `moonbeam.clear(): void`, `moonbeam.rect: Rect | null` from `src/ui/moonbeam.svelte.ts`. Several targets are lit as one area (choice steps).
- `GhostHand.svelte` and `Moonbeam.svelte` are mounted once in `App.svelte`. Scenes never mount them.

### Audio (`src/audio/index.ts`)

Named exports, all closures over one voice instance:

```ts
unlock(): Promise<void>
addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<boolean>
has(id: string): boolean                      // synchronous, true when a loaded manifest lists the id
hasName(name: string): boolean                // has(nameClipId(name, '!'))
knownNameIds(): Set<string>                   // every id in packs named names-*
say(id: ClipId, o?: { queue?: boolean }): Promise<void>
sayAll(ids: ClipId[]): Promise<void>
sayOptional(id: string): Promise<boolean>     // says only when has(id); never warns
sayName(name: string, mark: '!' | '?', o?: { queue?: boolean }): Promise<boolean>  // false and silent when no clip
sound(g: string): Promise<void>               // a letter sound the game plays
listen(g: string): Promise<void>              // a letter sound Emma asked for: instructions wait for it
hold(g: string): { stop(): void; done: Promise<void> }
sfx(n: SfxName): Promise<void>
act(): void                                   // Emma acted: stale instructions stop
stop(): void
mute(on: boolean): void
preloadScene(scene: string, ids?: string[]): Promise<string[]>   // resolves with missing ids
release(scene: string): void                  // forgets clips no other preloaded scene holds
onMissing(fn: (id: string) => void): () => void
nameClipId(name: string, mark: '!' | '?'): string                // 'name-bella' and 'name-bella-q'
initAudio(): Promise<void>; audioReady: Promise<void>; refreshNames(): Promise<Set<string>>
```

- Static packs are every folder in `public/audio/` with a `lines.json`, added at start. Packs named `names-*` are added with `fresh: true` (no-cache manifest fetch).
- Letter sounds are served from `./phonics/` (copied from `shared/audio/phonics/` at build time).

### Test hook (`window.__game`, non-production builds)

```ts
state(): { scene: string; params: Record<string, unknown>; fit: Fit; speed: number; muted: boolean; now: number;
           secure: boolean; ghost: boolean; moonbeam: Rect | null; missingClips: string[]; [key: string]: unknown }
play(): Promise<void>; jump(scene: string, params?: Record<string, unknown>): Promise<void>
fast(on: boolean): void; mute(on: boolean): void; setNow(ms: number | null): void
seed(n: number); setStep(strand: 'r' | 's' | 'm', step: string); answer(); wrong(); idle();
importFixture(name: string); syncNow(); herd(n: number); newVisit()      // all Promise<unknown>, forwarded to registered handlers
call(name: string, ...args: unknown[]): Promise<unknown>                  // any other registered handler
errors(): string[]                                                         // window errors, rejections, console.error, CSP violations
```

- `registerHook(name: string, fn: (...args: any[]) => unknown): () => void`, `registerState(key: string, fn: () => unknown): () => void` (merged into `state()`), `registerHookExtension(key: string, value: object): void` (sets `window.__game[key]`, for example `places`) from `src/platform/hooks.ts`. Shipped in production as a no-op-cheap registry.
- `importFixture(name)` loads `tests/fixtures/<name>.json` and calls the `importFixture` handler with `(data, name)`.
- `setNow` survives a reload in the same tab (sessionStorage).
- Console lines `[log]` and `[timer]` are written by their owners with `console.info`.

### Ids and hashing (`src/platform/ids.ts`)

`uuid4(): string`, `uuidv5(name: string, namespace: string): string`, `NS_DNS`, `NS_MOON_MEADOW = 'c2b6f3a0-6d1e-4b8a-9a52-3f0d7e1c5a41'`, `sha1Hex(text: string): string`, `sha256Hex(text: string): string`, `randomBase32(n: number): string` (alphabet `a-z2-7`). They need only `crypto.getRandomValues` and `TextEncoder`, which exist on plain http, in Node and in Vitest.

### Server HTTP API

Base: `<mount>api/`, for example `http://<mac>.local:8765/games/moon-meadow-home/api/` and `https://odin.vendic.cloud/unicorns/api/`. The client builds it with `new URL('api/', document.baseURI)`. JSON in and out, `Cache-Control: no-store`.

| Call | Request | Response |
|---|---|---|
| `GET api/health` | none | `200 {ok: true}` |
| `POST api/pair` | `{code: "123456", dev: "abcdefgh"}` (dev: 8 chars `a-z2-7`) | `200 {token: "<64 hex>", family: "emma"}`; `400 {error: "wrong code"}`; `429 {error: "too many tries"}` after 5 wrong codes per IP in 15 minutes |
| `POST api/sync` | Header `Authorization: Bearer <token>`. Body `{dev, after: number, events: Event[]}` with at most 1,000 events and 2 MB | `200 {rejected: {id, reason}[], events: Event[], cursor: number, more: boolean}`. Returned events are those after `after` from other devices, at most 2,000 scanned per call. `401` bad token, `403` dev is not the token's device, `400` bad body or over 1,000 events, `413` over 2 MB, `429` over 60 calls a minute |
| `GET api/admin/unknown-names?family=emma` | Header `Authorization: Bearer <admin token>` | `200 {names: {name, gems, phonemes, firstSeen, count}[]}` |

- Events are deduplicated by `id`. A duplicate is not a rejection. A rejected event never blocks the others.
- An event with a numeric `v` above the server's `EVENT_SCHEMA_VERSION` is stored without validation.
- Families: `emma` (default) and `test`. A token belongs to one family. Pair codes are made with `npm run server:pair -- --family test`.

### npm scripts (run with `npm --prefix games/moon-meadow-home run <name>` from the repo root)

`dev`, `build`, `build:test`, `test`, `check`, `check:content` (runs `tools/validate-content.ts`, owned by content), `names:pull` (runs `tools/pull-unknown-names.ts`, owned by names), `serve` (port 8765, `0.0.0.0`, repo root, data `.data`), `serve:test` (port 8766, `127.0.0.1`, temp data), `server:pair`, `flows`.

### Flows

- Flow files are `games/moon-meadow-home/flows/<name>.flow.sh` or `flows/<folder>/<name>.flow.sh`, and source `flows/lib.sh` (from a subfolder: `. "$(dirname "$0")/../lib.sh"`).
- `bash games/moon-meadow-home/flows/run.sh [name ...]` builds the test app, serves it at `http://127.0.0.1:8766/games/moon-meadow-home/test/` and runs each flow at the three sizes with `S`, `W` and `H` set.

---

## Contracts I need

Each line is an assumption. The integrator reconciles it if another plan says otherwise.

| From | Assumption |
|---|---|
| Core (events) | `src/core/events.ts` exports `EVENT_SCHEMA_VERSION: number` and `validate(e: unknown): { ok: true } \| { ok: false; reason: string }` (extra fields allowed). It and everything it imports load under Node type stripping (`.ts` import extensions, no enums). `server/main.ts` imports it in Task C3. |
| Core (events) | Device ids are 8 characters from `a-z2-7` (from `randomBase32(8)`). Every event has a string `id` and a numeric `t`. |
| Core (save, ids) | Core never calls `crypto.randomUUID` or `crypto.subtle` (both missing on plain http). It uses `uuid4`, `uuidv5`, `sha256Hex` and `randomBase32` from `src/platform/ids.ts`. It never calls `navigator.storage.persist()` itself; `startGame` does, and `platformStatus.persist` holds the result. |
| Core (store) | `src/game.svelte.ts` exists from Wave A. It calls `setStartHandler(...)` on import, registers the hook handlers `seed`, `setStep`, `answer`, `wrong`, `idle`, `importFixture`, `herd`, `newVisit` (and `syncNow` from Wave C) with `registerHook`, takes time from `clock.now()`, subscribes to `router.onChange` for `place.enter` and `place.leave`, and to `watchLifecycle` for the visit end. `src/main.ts` imports it with an eager glob, so the app builds before it exists. Its `game.go(scene, params)` calls `router.go`. |
| Core (store) | `audio.missing` events come from `onMissing` in `src/audio/index.ts`. |
| Core (fixtures) | Fixtures live in `tests/fixtures/<name>.json`. |
| Places | Places drops `src/ui/ghost.ts`, `src/ui/GhostHand.svelte` and `src/ui/Moonbeam.svelte` from its own file map and imports `ghostTap`, `ghostMove`, `ghostStop`, `moonbeam` from this plan. It registers its test API with `registerHookExtension('places', placesHook())` instead of editing `src/test-hook.ts`. Its `src/places/scenes.ts` export is picked up by the registry glob. Its flows are named `*.flow.sh` and use `MMH_URL` from `flows/lib.sh` (port 8766, `/test/`), not port 8765. Its `addPack('places', 'audio/places/')` call is allowed but not needed. |
| Places, heartbeat | `hasName(name)` and `has(id)` are synchronous and valid after `audioReady`. `sayName` resolves to a boolean. `preloadScene(scene, ids?)` takes the clip ids as a second argument; with one argument it preloads nothing. |
| Audio workstream | Packs live in `public/audio/<pack>/{lines.json, manifest.json, *.mp3}`, made by `scripts/generate-audio.py`. Name packs are named `names-*`. Name clips use `nameClipId`: `name-<slug>` says "Bella!", `name-<slug>-q` says "Bella?", slug = lower case ASCII with every other run of characters as `-`. `tools/build-name-lines.ts` imports `nameClipId` from `src/audio/voice.ts`. The `core` pack contains `platform-turn` (narrator: "Please turn the iPad on its side."). After changing any `lines.json`, the audio workstream runs `node tools/gen-clip-ids.ts` and commits `src/audio/clip-ids.generated.ts`. |
| Art workstream | Art lives in `public/art/<area>/` with `public/art/manifest.json`. The meadow area is `public/art/meadow/`. Art may replace `public/icons/*.png` with the same file names and sizes. Scenes call `useBackground(url)` from `src/platform/images.ts` before showing a full background (from Wave B). |
| Content | `tools/validate-content.ts` exists for `npm run check:content`. |
| Names | `tools/pull-unknown-names.ts` exists for `npm run names:pull`. For an exported save it uses `eventsFromExport` and `collectUnknownNames` from `server/unknown-names.ts`. From odin or the Mac server it calls `GET api/admin/unknown-names` with the admin token from `MMH_ADMIN_TOKEN`, which the script loads itself with `process.loadEnvFile()`. |
| Sync workstream (Wave C) | `src/sync/` speaks the API above, pushes in chunks of at most 1,000 events or 1 MB, and registers `syncNow` with `registerHook`. Two-browser sync flows use two sessions (`S=sync-a`, `S=sync-b`) against `serve:test`. |
| Parent corner | `src/parent/ParentCorner.svelte` is scene `parent`, allowed in portrait. It reads `platformStatus` from `src/platform/pwa.ts` for the "Add to Home Screen" warning. |
| v2 import | `move.html` and the v3 import read the v2 save from the same origin. Tjitse opens both at `http://<LocalHostName>.local:8765/`. The platform keeps that origin unchanged. |
| Everyone | Other workstreams add dependencies and scripts to `package.json` in their own small commits; the integrator resolves conflicts in that one file. |

---

## Wave A: first playable platform (spec 7.1 item 1 and the shared parts of items 6 to 13)

### Task A1: Project skeleton

**Files:**
- Create: `games/moon-meadow-home/package.json`, `package-lock.json`, `.gitignore`, `tsconfig.json`, `vite.config.ts`, `svelte.config.js`, `index.html`, `src/env.d.ts`, `src/main.ts` (first version), `src/App.svelte` (first version), `tests/platform/smoke.test.ts`
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm --prefix games/moon-meadow-home run build`, `test`, `check` work. `dist/index.html` exists.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "moon-meadow-home",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=24.19.0" },
  "scripts": {
    "prepare:assets": "node tools/sync-phonics.ts && node tools/gen-clip-ids.ts",
    "dev": "npm run prepare:assets && vite",
    "build": "npm run prepare:assets && vite build",
    "build:test": "npm run prepare:assets && vite build --mode test",
    "test": "vitest run",
    "check": "node tools/gen-clip-ids.ts --check && svelte-check --tsconfig ./tsconfig.json --threshold error",
    "check:content": "node tools/validate-content.ts",
    "names:pull": "node tools/pull-unknown-names.ts",
    "serve": "node server/main.ts --host 0.0.0.0 --port 8765 --data .data --repo-root ../..",
    "serve:test": "node server/main.ts --host 127.0.0.1 --port 8766 --data \"${MMH_TEST_DATA:-${TMPDIR:-/tmp}/mmh-test-data}\" --repo-root ../..",
    "server:pair": "node server/admin.ts pair --data .data",
    "flows": "bash flows/run.sh"
  }
}
```

The `prepare:assets` tools arrive in Task A7. Until then, run `vite build` directly in this task.

- [ ] **Step 2: Install pinned dependencies**

Run (sandbox, with `allowed_domains: ["registry.npmjs.org"]`):

```sh
npm --prefix games/moon-meadow-home install --save-exact --save-dev vite@8.3.4 typescript@6.0.3 svelte@5.57.2 @sveltejs/vite-plugin-svelte@7.3.1 svelte-check@4.7.6 vitest@5.0.3 @types/node@24
npm --prefix games/moon-meadow-home install --save-exact idb@8.0.3 @fontsource/andika
```

Expected: no `ERESOLVE`. Check `package.json`: every version is exact (no `^`). `@types/node` and `@fontsource/andika` are pinned to the exact version npm resolved today.

- [ ] **Step 3: Write the configs**

`games/moon-meadow-home/.gitignore`:

```
node_modules/
dist/
dist-test/
.data/
public/phonics/
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noUncheckedSideEffectImports": false
  },
  "include": ["src/**/*", "tests/**/*", "tools/**/*.ts", "server/**/*.ts", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte()],
  build: {
    target: 'safari15',
    outDir: mode === 'test' ? 'dist-test' : 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: mode === 'test',
  },
  server: { host: '127.0.0.1', port: 5173, fs: { allow: [repoRoot] } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
```

`svelte.config.js`:

```js
export default { compilerOptions: { runes: true } };
```

`src/env.d.ts`:

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MENU_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`index.html`:

```html
<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Moon Meadow">
<meta name="theme-color" content="#11163d">
<meta name="format-detection" content="telephone=no">
<title>Moon Meadow Home</title>
</head>
<body>
<div id="app"></div>
<script type="module" src="./src/main.ts"></script>
</body>
</html>
```

`src/App.svelte` (replaced in Task A9):

```svelte
<div id="stage" aria-label="stage"></div>
```

`src/main.ts` (replaced in Task A9):

```ts
import { mount } from 'svelte';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
```

Append to the repo-root `.gitignore`:

```
games/*/dist/
games/*/dist-test/
games/*/.data/
```

- [ ] **Step 4: Write a first test**

`tests/platform/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };

describe('package', () => {
  it('pins every dependency exactly', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    for (const [name, version] of Object.entries(all)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+/);
    }
  });
});
```

- [ ] **Step 5: Run tests, type check and build**

```sh
npm --prefix games/moon-meadow-home test
npx --prefix games/moon-meadow-home svelte-check --tsconfig games/moon-meadow-home/tsconfig.json --threshold error
npm --prefix games/moon-meadow-home exec vite build
```

Expected: 1 test passes, svelte-check reports 0 errors, `games/moon-meadow-home/dist/index.html` exists and its script tag points at `./assets/index-<hash>.js`.

- [ ] **Step 6: Commit**

```bash
git add .gitignore games/moon-meadow-home/package.json games/moon-meadow-home/package-lock.json games/moon-meadow-home/.gitignore games/moon-meadow-home/tsconfig.json games/moon-meadow-home/vite.config.ts games/moon-meadow-home/svelte.config.js games/moon-meadow-home/index.html games/moon-meadow-home/src games/moon-meadow-home/tests
git commit -m "Add the Moon Meadow Home project skeleton with pinned Vite, Svelte and Vitest"
```

### Task A2: Ids and hashes that work on plain http

**Files:**
- Create: `src/platform/ids.ts`
- Test: `tests/platform/ids.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `uuid4(): string`, `uuidv5(name: string, namespace: string): string`, `NS_DNS: string`, `NS_MOON_MEADOW: string`, `sha1Hex(text: string): string`, `sha256Hex(text: string): string`, `sha1Bytes(b: Uint8Array): Uint8Array`, `sha256Bytes(b: Uint8Array): Uint8Array`, `randomBase32(n: number): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha1Hex, sha256Hex, uuid4, uuidv5, randomBase32, NS_DNS } from '../../src/platform/ids.ts';

describe('ids', () => {
  it('hashes with SHA-1', () => {
    expect(sha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    const long = 'Lily and Pip '.repeat(100);
    expect(sha1Hex(long)).toBe(createHash('sha1').update(long, 'utf8').digest('hex'));
  });

  it('hashes with SHA-256, also UTF-8 text over several blocks', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    const text = 'Zoë 🦄 rides home. '.repeat(40);
    expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
  });

  it('makes name-based UUIDs (version 5)', () => {
    expect(uuidv5('python.org', NS_DNS)).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });

  it('makes random UUIDs (version 4) without crypto.randomUUID', () => {
    const a = uuid4();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuid4()).not.toBe(a);
  });

  it('makes base32 device ids', () => {
    expect(randomBase32(8)).toMatch(/^[a-z2-7]{8}$/);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/ids.test.ts`
Expected: FAIL, cannot find `../../src/platform/ids.ts`.

- [ ] **Step 3: Implement `src/platform/ids.ts`**

```ts
// Ids and hashes in pure TypeScript. crypto.randomUUID and crypto.subtle do not exist on plain http
// (the iPad on the home network), so nothing here uses them.

export const NS_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
export const NS_MOON_MEADOW = 'c2b6f3a0-6d1e-4b8a-9a52-3f0d7e1c5a41';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function padMessage(bytes: Uint8Array): DataView {
  const total = Math.ceil((bytes.length + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = bytes.length * 8;
  dv.setUint32(total - 8, Math.floor(bits / 2 ** 32));
  dv.setUint32(total - 4, bits >>> 0);
  return dv;
}

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const dv = padMessage(bytes);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < dv.byteLength; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
  return out;
}

export function sha1Bytes(bytes: Uint8Array): Uint8Array {
  const dv = padMessage(bytes);
  const H = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const W = new Uint32Array(80);
  const rotl = (x: number, n: number): number => (x << n) | (x >>> (32 - n));
  for (let off = 0; off < dv.byteLength; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) W[i] = rotl(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1) >>> 0;
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4];
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + W[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 5; i++) odv.setUint32(i * 4, H[i]);
  return out;
}

export const sha1Hex = (text: string): string => hex(sha1Bytes(utf8(text)));
export const sha256Hex = (text: string): string => hex(sha256Bytes(utf8(text)));

function uuidToBytes(u: string): Uint8Array {
  const h = u.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(h)) throw new Error(`not a uuid: ${u}`);
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return b;
}

function bytesToUuid(b: Uint8Array): string {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function uuidv5(name: string, namespace: string): string {
  const ns = uuidToBytes(namespace);
  const n = utf8(name);
  const all = new Uint8Array(16 + n.length);
  all.set(ns);
  all.set(n, 16);
  const h = sha1Bytes(all).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  return bytesToUuid(h);
}

export function uuid4(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return bytesToUuid(b);
}

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
export function randomBase32(n: number): string {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => B32[x & 31]).join('');
}
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/ids.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/platform/ids.ts games/moon-meadow-home/tests/platform/ids.test.ts
git commit -m "Add ids and hashes that work without crypto.subtle on plain http"
```

### Task A3: Stage fit, geometry and the drag state machine

**Files:**
- Create: `src/platform/fit.ts`, `src/platform/geometry.ts`, `src/platform/drag-tracker.ts`
- Test: `tests/platform/fit.test.ts`, `tests/platform/geometry.test.ts`, `tests/platform/drag-tracker.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `STAGE_W = 1180`, `STAGE_H = 820`, `type Fit = { scale: number; x: number; y: number; portrait: boolean; vw: number; vh: number }`, `computeFit(vw: number, vh: number): Fit`, `toStagePoint(clientX: number, clientY: number, f: Fit): Point`.
  - `type Point = { x: number; y: number }`, `type Rect = { x: number; y: number; w: number; h: number }`, `pastThreshold(dx, dy, threshold): boolean`, `distanceToRect(p: Point, r: Rect): number`, `nearestTarget(p: Point, targets: { id: string; rect: Rect }[], snap: number): string | null`, `unionRect(rects: Rect[], pad: number, bounds: Rect): Rect | null`, `beamPolygon(r: Rect): string`.
  - `class DragTracker { phase: 'idle' | 'pressed' | 'dragging'; constructor(threshold = 6); down(id, x, y): void; move(id, x, y): { kind: 'none' } | { kind: 'move'; dx: number; dy: number; first: boolean }; up(id, x, y): { kind: 'none' } | { kind: 'tap' } | { kind: 'drop'; dx: number; dy: number }; cancel(id): { kind: 'none' } | { kind: 'cancel' } }`.

- [ ] **Step 1: Write the failing tests**

`tests/platform/fit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeFit, toStagePoint } from '../../src/platform/fit.ts';

describe('computeFit', () => {
  it('fits the stage exactly at 1180 x 820', () => {
    expect(computeFit(1180, 820)).toEqual({ scale: 1, x: 0, y: 0, portrait: false, vw: 1180, vh: 820 });
  });
  it('letterboxes top and bottom on an iPad Air 2 (1024 x 768)', () => {
    const f = computeFit(1024, 768);
    expect(f.scale).toBeCloseTo(1024 / 1180, 6);
    expect(f.x).toBeCloseTo(0, 6);
    expect(f.y).toBeCloseTo((768 - 820 * (1024 / 1180)) / 2, 6);
  });
  it('fits 1080 x 810 by width', () => {
    const f = computeFit(1080, 810);
    expect(f.scale).toBeCloseTo(1080 / 1180, 6);
    expect(f.y).toBeCloseTo((810 - 820 * (1080 / 1180)) / 2, 6);
  });
  it('adds side bands on a wide screen', () => {
    const f = computeFit(1400, 820);
    expect(f.scale).toBe(1);
    expect(f.x).toBe(110);
  });
  it('reports portrait', () => {
    expect(computeFit(820, 1180).portrait).toBe(true);
  });
  it('maps a screen point back to stage units', () => {
    const f = computeFit(1024, 768);
    const p = toStagePoint(512, f.y + 410 * f.scale, f);
    expect(p.x).toBeCloseTo(590, 6);
    expect(p.y).toBeCloseTo(410, 6);
  });
});
```

`tests/platform/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pastThreshold, distanceToRect, nearestTarget, unionRect, beamPolygon } from '../../src/platform/geometry.ts';

const box = { x: 0, y: 0, w: 10, h: 10 };
const stage = { x: 0, y: 0, w: 1180, h: 820 };

describe('geometry', () => {
  it('starts a drag at 6 px, not before', () => {
    expect(pastThreshold(3, 4, 6)).toBe(false);
    expect(pastThreshold(6, 0, 6)).toBe(true);
  });
  it('measures the distance to a rectangle edge', () => {
    expect(distanceToRect({ x: 5, y: 5 }, box)).toBe(0);
    expect(distanceToRect({ x: 20, y: 5 }, box)).toBe(10);
    expect(distanceToRect({ x: 13, y: 14 }, box)).toBe(5);
  });
  it('picks the target under the point, the smaller one when nested', () => {
    const t = [{ id: 'nest', rect: { x: 0, y: 0, w: 200, h: 200 } }, { id: 'cup', rect: { x: 50, y: 50, w: 40, h: 40 } }];
    expect(nearestTarget({ x: 60, y: 60 }, t, 48)).toBe('cup');
    expect(nearestTarget({ x: 150, y: 150 }, t, 48)).toBe('nest');
  });
  it('snaps to a near target and ignores far ones', () => {
    const t = [{ id: 'door 3', rect: { x: 100, y: 100, w: 80, h: 80 } }];
    expect(nearestTarget({ x: 220, y: 140 }, t, 48)).toBe('door 3');
    expect(nearestTarget({ x: 300, y: 140 }, t, 48)).toBeNull();
  });
  it('joins rectangles with padding inside the stage', () => {
    expect(unionRect([{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 30, w: 10, h: 10 }], 5, stage)).toEqual({ x: 0, y: 0, w: 35, h: 45 });
    expect(unionRect([], 5, stage)).toBeNull();
  });
  it('draws the beam from the sky down to the area', () => {
    expect(beamPolygon({ x: 100, y: 200, w: 200, h: 100 })).toBe('polygon(160px 0px, 240px 0px, 300px 300px, 100px 300px)');
  });
});
```

`tests/platform/drag-tracker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DragTracker } from '../../src/platform/drag-tracker.ts';

describe('DragTracker', () => {
  it('a small wobble is still a tap', () => {
    const t = new DragTracker(6);
    t.down(1, 100, 100);
    expect(t.move(1, 103, 104)).toEqual({ kind: 'none' });
    expect(t.up(1, 103, 104)).toEqual({ kind: 'tap' });
    expect(t.phase).toBe('idle');
  });
  it('a move past the threshold is a drag and ends in a drop', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    expect(t.move(1, 10, 0)).toEqual({ kind: 'move', dx: 10, dy: 0, first: true });
    expect(t.move(1, 20, 5)).toEqual({ kind: 'move', dx: 20, dy: 5, first: false });
    expect(t.move(1, 2, 1)).toEqual({ kind: 'move', dx: 2, dy: 1, first: false });
    expect(t.up(1, 2, 1)).toEqual({ kind: 'drop', dx: 2, dy: 1 });
    expect(t.phase).toBe('idle');
  });
  it('ignores a second finger', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    t.down(2, 50, 50);
    expect(t.move(2, 90, 90)).toEqual({ kind: 'none' });
    expect(t.up(2, 90, 90)).toEqual({ kind: 'none' });
    expect(t.phase).toBe('pressed');
  });
  it('a cancel (rotation, system gesture) ends the drag', () => {
    const t = new DragTracker(6);
    t.down(1, 0, 0);
    t.move(1, 30, 0);
    expect(t.cancel(2)).toEqual({ kind: 'none' });
    expect(t.cancel(1)).toEqual({ kind: 'cancel' });
    expect(t.phase).toBe('idle');
    expect(t.up(1, 30, 0)).toEqual({ kind: 'none' });
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/fit.test.ts tests/platform/geometry.test.ts tests/platform/drag-tracker.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/platform/fit.ts`:

```ts
import type { Point } from './geometry.ts';

export const STAGE_W = 1180;
export const STAGE_H = 820;

export type Fit = { scale: number; x: number; y: number; portrait: boolean; vw: number; vh: number };

export function computeFit(vw: number, vh: number): Fit {
  const scale = Math.min(vw / STAGE_W, vh / STAGE_H);
  return { scale, x: (vw - STAGE_W * scale) / 2, y: (vh - STAGE_H * scale) / 2, portrait: vh > vw, vw, vh };
}

export function toStagePoint(clientX: number, clientY: number, f: Fit): Point {
  return { x: (clientX - f.x) / f.scale, y: (clientY - f.y) / f.scale };
}
```

`src/platform/geometry.ts`:

```ts
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export function pastThreshold(dx: number, dy: number, threshold: number): boolean {
  return dx * dx + dy * dy >= threshold * threshold;
}

export function distanceToRect(p: Point, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function nearestTarget(p: Point, targets: { id: string; rect: Rect }[], snap: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  let bestArea = Infinity;
  for (const t of targets) {
    const d = distanceToRect(p, t.rect);
    if (d > snap) continue;
    const area = t.rect.w * t.rect.h;
    if (d < bestD || (d === bestD && area < bestArea)) {
      best = t.id;
      bestD = d;
      bestArea = area;
    }
  }
  return best;
}

export function unionRect(rects: Rect[], pad: number, bounds: Rect): Rect | null {
  if (rects.length === 0) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
  }
  x1 = Math.max(bounds.x, x1 - pad);
  y1 = Math.max(bounds.y, y1 - pad);
  x2 = Math.min(bounds.x + bounds.w, x2 + pad);
  y2 = Math.min(bounds.y + bounds.h, y2 + pad);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function beamPolygon(r: Rect): string {
  const cx = r.x + r.w / 2;
  const half = Math.max(20, r.w * 0.2);
  const f = (n: number): string => `${Math.round(n * 10) / 10}px`;
  return `polygon(${f(cx - half)} 0px, ${f(cx + half)} 0px, ${f(r.x + r.w)} ${f(r.y + r.h)}, ${f(r.x)} ${f(r.y + r.h)})`;
}
```

`src/platform/drag-tracker.ts`:

```ts
import { pastThreshold } from './geometry.ts';

export type DragPhase = 'idle' | 'pressed' | 'dragging';
export type MoveResult = { kind: 'none' } | { kind: 'move'; dx: number; dy: number; first: boolean };
export type UpResult = { kind: 'none' } | { kind: 'tap' } | { kind: 'drop'; dx: number; dy: number };
export type CancelResult = { kind: 'none' } | { kind: 'cancel' };

/** One press on one element. Coordinates are stage units. Only the first pointer counts. */
export class DragTracker {
  phase: DragPhase = 'idle';
  #id = -1;
  #sx = 0;
  #sy = 0;
  #threshold: number;

  constructor(threshold = 6) {
    this.#threshold = threshold;
  }

  down(id: number, x: number, y: number): void {
    if (this.phase !== 'idle') return;
    this.phase = 'pressed';
    this.#id = id;
    this.#sx = x;
    this.#sy = y;
  }

  move(id: number, x: number, y: number): MoveResult {
    if (this.phase === 'idle' || id !== this.#id) return { kind: 'none' };
    const dx = x - this.#sx;
    const dy = y - this.#sy;
    if (this.phase === 'pressed') {
      if (!pastThreshold(dx, dy, this.#threshold)) return { kind: 'none' };
      this.phase = 'dragging';
      return { kind: 'move', dx, dy, first: true };
    }
    return { kind: 'move', dx, dy, first: false };
  }

  up(id: number, x: number, y: number): UpResult {
    if (this.phase === 'idle' || id !== this.#id) return { kind: 'none' };
    const was = this.phase;
    this.phase = 'idle';
    this.#id = -1;
    return was === 'dragging' ? { kind: 'drop', dx: x - this.#sx, dy: y - this.#sy } : { kind: 'tap' };
  }

  cancel(id: number): CancelResult {
    if (this.phase === 'idle' || id !== this.#id) return { kind: 'none' };
    this.phase = 'idle';
    this.#id = -1;
    return { kind: 'cancel' };
  }
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/platform/fit.ts games/moon-meadow-home/src/platform/geometry.ts games/moon-meadow-home/src/platform/drag-tracker.ts games/moon-meadow-home/tests/platform
git commit -m "Add stage fitting, drop target geometry and the drag state machine"
```

### Task A4: Timing, clock, touch signal, lifecycle and the hook registry

**Files:**
- Create: `src/platform/timing.ts`, `src/platform/clock.ts`, `src/platform/touch.ts`, `src/platform/lifecycle.ts`, `src/platform/hooks.ts`
- Test: `tests/platform/timing.test.ts`, `tests/platform/hooks.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the timing, clock, touch, lifecycle and hook signatures listed under "Contracts I produce".

- [ ] **Step 1: Write the failing tests**

`tests/platform/timing.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { timing, setFast, dur, sleep } from '../../src/platform/timing.ts';
import { clock } from '../../src/platform/clock.ts';
import { visitTimedOut } from '../../src/platform/lifecycle.ts';
import { onTouch, emitTouch, lastTouchAt } from '../../src/platform/touch.ts';

afterEach(() => { setFast(false); clock.setNow(null); });

describe('timing', () => {
  it('fast mode shortens every duration twenty times', () => {
    setFast(true);
    expect(timing.speed).toBe(0.05);
    expect(dur(1000)).toBe(50);
    setFast(false);
    expect(dur(1000)).toBe(1000);
  });
  it('sleep resolves early when aborted', async () => {
    const ac = new AbortController();
    const t0 = Date.now();
    const p = sleep(5000, ac.signal);
    ac.abort();
    await p;
    expect(Date.now() - t0).toBeLessThan(500);
  });
});

describe('clock', () => {
  it('moves to a set time and keeps running', () => {
    const target = Date.UTC(2026, 9, 13, 8, 0);
    clock.setNow(target);
    expect(Math.abs(clock.now() - target)).toBeLessThan(50);
    clock.advance(3_600_000);
    expect(Math.abs(clock.now() - target - 3_600_000)).toBeLessThan(50);
    clock.setNow(null);
    expect(Math.abs(clock.now() - Date.now())).toBeLessThan(50);
  });
  it('round-trips its offset', () => {
    clock.setOffset(12345);
    expect(clock.offset()).toBe(12345);
  });
});

describe('visit timeout', () => {
  it('ends a visit after 30 minutes without a touch', () => {
    expect(visitTimedOut(0, 29 * 60_000)).toBe(false);
    expect(visitTimedOut(0, 30 * 60_000)).toBe(true);
  });
});

describe('touch signal', () => {
  it('tells every listener and records the time', () => {
    const seen: number[] = [];
    const off = onTouch(() => seen.push(1));
    emitTouch();
    off();
    emitTouch();
    expect(seen).toEqual([1]);
    expect(Math.abs(lastTouchAt() - clock.now())).toBeLessThan(50);
  });
});
```

`tests/platform/hooks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { registerHook, callHook, registerState, hookStates } from '../../src/platform/hooks.ts';

describe('hook registry', () => {
  it('calls the registered handler with its arguments', async () => {
    const off = registerHook('answer', (x: number) => x + 1);
    expect(await callHook('answer', [41])).toBe(42);
    off();
  });
  it('throws a clear error when nothing is registered', async () => {
    await expect(callHook('wrong', [])).rejects.toThrow('[hook] no handler for wrong');
  });
  it('an old unregister does not remove a newer handler', async () => {
    const offOld = registerHook('idle', () => 'old');
    registerHook('idle', () => 'new');
    offOld();
    expect(await callHook('idle', [])).toBe('new');
  });
  it('merges state providers', () => {
    const off = registerState('demo', () => ({ presses: 2 }));
    expect(hookStates()).toEqual({ demo: { presses: 2 } });
    off();
    expect(hookStates()).toEqual({});
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/timing.test.ts tests/platform/hooks.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/platform/timing.ts`:

```ts
export const timing = { speed: 1 };

export function setFast(on: boolean): void {
  timing.speed = on ? 0.05 : 1;
  if (typeof document !== 'undefined') document.documentElement.style.setProperty('--speed', String(timing.speed));
}

export const dur = (ms: number): number => Math.round(ms * timing.speed);

/** Waits ms (scaled by the test speed). Resolves early, never rejects, when the signal aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const done = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, dur(ms));
    signal?.addEventListener('abort', done, { once: true });
  });
}

/** Resolves after the next painted frame. */
export function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Web Animations with the test speed. Always resolves. */
export function anim(el: Element, keyframes: Keyframe[], o: KeyframeAnimationOptions = {}): Promise<void> {
  try {
    const d = typeof o.duration === 'number' ? o.duration : 300;
    return el.animate(keyframes, { ...o, duration: dur(d) }).finished.then(() => undefined, () => undefined);
  } catch {
    return Promise.resolve();
  }
}
```

`src/platform/clock.ts`:

```ts
let offsetMs = 0;

export const clock = {
  now(): number { return Date.now() + offsetMs; },
  setNow(ms: number | null): void { offsetMs = ms === null ? 0 : ms - Date.now(); },
  advance(ms: number): void { offsetMs += ms; },
  offset(): number { return offsetMs; },
  setOffset(ms: number): void { offsetMs = Number.isFinite(ms) ? ms : 0; },
  /** Minutes east of UTC, as stored on visit.start. */
  tzOffsetMinutes(at?: number): number { return -new Date(at ?? clock.now()).getTimezoneOffset(); },
};
```

`src/platform/touch.ts`:

```ts
import { clock } from './clock.ts';

type Listener = () => void;
const listeners = new Set<Listener>();
let last = 0;

export function onTouch(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitTouch(): void {
  last = clock.now();
  for (const fn of [...listeners]) fn();
}

export const lastTouchAt = (): number => last;

/** Every pointer down anywhere counts as a touch (capture phase, before scene handlers). */
export function installTouchSource(target: EventTarget): () => void {
  const h = (): void => emitTouch();
  target.addEventListener('pointerdown', h, { capture: true, passive: true });
  return () => target.removeEventListener('pointerdown', h, { capture: true });
}
```

`src/platform/lifecycle.ts`:

```ts
import { clock } from './clock.ts';
import { lastTouchAt, onTouch } from './touch.ts';

export const VISIT_IDLE_MS = 30 * 60_000;

export function visitTimedOut(lastActiveMs: number, nowMs: number, limitMs = VISIT_IDLE_MS): boolean {
  return nowMs - lastActiveMs >= limitMs;
}

export interface LifecycleHandlers {
  onHide?(): void;
  onShow?(hiddenMs: number): void;
  onVisitTimeout?(): void;
}

/** Signals for the store: hidden, shown again, and the 30-minute visit end (hidden or untouched). */
export function watchLifecycle(h: LifecycleHandlers, doc: Document = document): () => void {
  let hiddenAt: number | null = null;
  let timedOut = false;
  const fire = (): void => { if (!timedOut) { timedOut = true; h.onVisitTimeout?.(); } };
  const offTouch = onTouch(() => { timedOut = false; });
  const onVis = (): void => {
    if (doc.visibilityState === 'hidden') {
      hiddenAt = clock.now();
      h.onHide?.();
    } else if (hiddenAt !== null) {
      const hiddenMs = clock.now() - hiddenAt;
      hiddenAt = null;
      h.onShow?.(hiddenMs);
      if (hiddenMs >= VISIT_IDLE_MS) fire();
    }
  };
  const onPageHide = (): void => h.onHide?.();
  doc.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', onPageHide);
  const timer = setInterval(() => {
    if (doc.visibilityState === 'visible' && lastTouchAt() > 0 && visitTimedOut(lastTouchAt(), clock.now())) fire();
  }, 60_000);
  return () => {
    offTouch();
    clearInterval(timer);
    doc.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onPageHide);
  };
}
```

`src/platform/hooks.ts`:

```ts
// The test hook registry. Shipped in every build so scenes and the store can register freely.
// Only non-production builds read it (src/test-hook.ts installs window.__game).

export type HookFn = (...args: any[]) => unknown;

const handlers = new Map<string, HookFn>();
const states = new Map<string, () => unknown>();
const extensions = new Map<string, object>();

export function registerHook(name: string, fn: HookFn): () => void {
  handlers.set(name, fn);
  return () => { if (handlers.get(name) === fn) handlers.delete(name); };
}

export async function callHook(name: string, args: unknown[]): Promise<unknown> {
  const fn = handlers.get(name);
  if (!fn) throw new Error(`[hook] no handler for ${name}`);
  return await fn(...args);
}

export function registerState(key: string, fn: () => unknown): () => void {
  states.set(key, fn);
  return () => { if (states.get(key) === fn) states.delete(key); };
}

export function hookStates(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, fn] of states) out[k] = fn();
  return out;
}

export function registerHookExtension(key: string, value: object): void {
  extensions.set(key, value);
  const g = (globalThis as { __game?: Record<string, unknown> }).__game;
  if (g) g[key] = value;
}

export const hookExtensions = (): Map<string, object> => extensions;
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/platform/timing.ts games/moon-meadow-home/src/platform/clock.ts games/moon-meadow-home/src/platform/touch.ts games/moon-meadow-home/src/platform/lifecycle.ts games/moon-meadow-home/src/platform/hooks.ts games/moon-meadow-home/tests/platform
git commit -m "Add the game clock, test speed, touch signal, visit timeout and test hook registry"
```

### Task A5: Router core and scene ids

**Files:**
- Create: `src/platform/router-core.ts`, `src/platform/scene-ids.ts`
- Test: `tests/platform/router-core.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type SceneEntry<Id extends string = string> = { id: Id; params: Record<string, unknown> }`, `class RouterCore<Id extends string>` with `current`, `depth`, `go`, `replace`, `reset`, `back(): boolean`, `onChange`. `KNOWN_SCENES: readonly string[]`, `PORTRAIT_OK: ReadonlySet<string>`, `sceneIdFromPath(path: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { RouterCore } from '../../src/platform/router-core.ts';
import { sceneIdFromPath, PORTRAIT_OK } from '../../src/platform/scene-ids.ts';

describe('RouterCore', () => {
  it('starts empty and goes forward', () => {
    const r = new RouterCore<string>();
    expect(r.current).toBeNull();
    r.go('meadow');
    r.go('nest', { egg: 1 });
    expect(r.current).toEqual({ id: 'nest', params: { egg: 1 } });
    expect(r.depth).toBe(2);
  });
  it('goes back and stops at the first scene', () => {
    const r = new RouterCore<string>();
    r.go('meadow');
    r.go('nest');
    expect(r.back()).toBe(true);
    expect(r.current?.id).toBe('meadow');
    expect(r.back()).toBe(false);
    expect(r.current?.id).toBe('meadow');
  });
  it('replace swaps the scene without history, reset clears history', () => {
    const r = new RouterCore<string>();
    r.go('meadow');
    r.go('nest');
    r.replace('hatch');
    expect(r.depth).toBe(2);
    expect(r.current?.id).toBe('hatch');
    r.reset('goodnight');
    expect(r.depth).toBe(1);
  });
  it('keeps at most maxHistory entries', () => {
    const r = new RouterCore<string>(3);
    for (const id of ['a', 'b', 'c', 'd']) r.go(id);
    expect(r.depth).toBe(3);
    r.back();
    r.back();
    expect(r.current?.id).toBe('b');
    expect(r.back()).toBe(false);
  });
  it('tells listeners where it came from and went to', () => {
    const r = new RouterCore<string>();
    const seen: string[] = [];
    const off = r.onChange((f, t) => seen.push(`${f?.id ?? '-'}>${t.id}`));
    r.go('meadow');
    r.go('nest');
    r.back();
    off();
    r.go('salon');
    expect(seen).toEqual(['->meadow', 'meadow>nest', 'nest>meadow']);
  });
});

describe('scene ids', () => {
  it('turns file names into kebab-case ids', () => {
    expect(sceneIdFromPath('../scenes/BuildingDay.svelte')).toBe('building-day');
    expect(sceneIdFromPath('../scenes/Nest.svelte')).toBe('nest');
    expect(sceneIdFromPath('./PlatformDemo.svelte')).toBe('platform-demo');
    expect(sceneIdFromPath('../parent/ParentCorner.svelte')).toBe('parent');
  });
  it('allows portrait only in the parent corner', () => {
    expect(PORTRAIT_OK.has('parent')).toBe(true);
    expect(PORTRAIT_OK.has('meadow')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/router-core.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/platform/router-core.ts`:

```ts
export type SceneEntry<Id extends string = string> = { id: Id; params: Record<string, unknown> };
export type RouteListener<Id extends string> = (from: SceneEntry<Id> | null, to: SceneEntry<Id>) => void;

export class RouterCore<Id extends string> {
  #stack: SceneEntry<Id>[] = [];
  #listeners = new Set<RouteListener<Id>>();
  #max: number;

  constructor(maxHistory = 20) {
    this.#max = Math.max(1, maxHistory);
  }

  get current(): SceneEntry<Id> | null { return this.#stack.at(-1) ?? null; }
  get depth(): number { return this.#stack.length; }

  go(id: Id, params: Record<string, unknown> = {}): void {
    const from = this.current;
    this.#stack.push({ id, params });
    if (this.#stack.length > this.#max) this.#stack.splice(0, this.#stack.length - this.#max);
    this.#emit(from);
  }

  replace(id: Id, params: Record<string, unknown> = {}): void {
    const from = this.current;
    if (this.#stack.length) this.#stack[this.#stack.length - 1] = { id, params };
    else this.#stack.push({ id, params });
    this.#emit(from);
  }

  reset(id: Id, params: Record<string, unknown> = {}): void {
    const from = this.current;
    this.#stack = [{ id, params }];
    this.#emit(from);
  }

  back(): boolean {
    if (this.#stack.length < 2) return false;
    const from = this.current;
    this.#stack.pop();
    this.#emit(from);
    return true;
  }

  onChange(fn: RouteListener<Id>): () => void {
    this.#listeners.add(fn);
    return () => { this.#listeners.delete(fn); };
  }

  #emit(from: SceneEntry<Id> | null): void {
    const to = this.current;
    if (!to) return;
    for (const fn of [...this.#listeners]) fn(from, to);
  }
}
```

`src/platform/scene-ids.ts`:

```ts
/** Scenes the spec names (section 4.2). Unknown ids still work; the registry only warns. */
export const KNOWN_SCENES: readonly string[] = [
  'start', 'moving-day', 'meadow', 'valley', 'nest', 'hatch', 'naming', 'wish', 'stalls', 'goodnight',
  'building-day', 'bath-pond', 'post-box', 'salon', 'dressing-corner', 'letter-lane', 'meadow-slate',
  'home-book', 'toy-shelf', 'parent', 'platform-demo',
];

export const PORTRAIT_OK: ReadonlySet<string> = new Set(['parent']);

export function sceneIdFromPath(path: string): string {
  const base = (path.split('/').pop() ?? '').replace(/\.svelte$/, '');
  if (base === 'ParentCorner') return 'parent';
  return base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/router-core.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/platform/router-core.ts games/moon-meadow-home/src/platform/scene-ids.ts games/moon-meadow-home/tests/platform/router-core.test.ts
git commit -m "Add the scene history router core and scene ids"
```

### Task A6: Additive pack support in shared/audio.js

**Files:**
- Modify: `shared/audio.js` (repo root): `warnMissing`, `loadClip`, the `has` entry, new private helpers, five new public functions
- Create: `shared/audio.d.ts`
- Modify: `shared/README.md` (the player table)
- Test: `games/moon-meadow-home/tests/audio/emma-audio.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `EmmaAudio.addPack(name, base, {fresh}?) -> Promise<boolean>`, `packClips(name) -> Promise<string[]>`, `forget(ids)`, `stopSpeech()`, `onMissing(fn) -> unsubscribe`. Without any `addPack` call the player behaves exactly as in v2. Types in `shared/audio.d.ts`: `EmmaAudioApi`, `EmmaAudioHold`, `SfxName`.

- [ ] **Step 1: Write the failing test**

`games/moon-meadow-home/tests/audio/emma-audio.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { EmmaAudioApi } from '../../../../shared/audio.js';

const files: Record<string, unknown> = {
  '/v2/manifest.json': { clips: { hello: { file: 'hello.mp3' } } },
  '/a/core/manifest.json': { clips: { hello: { file: 'hello.mp3' } } },
  '/a/words/manifest.json': { clips: { 'word-cat': { file: 'word-cat.mp3' } } },
  '/a/names-t1/manifest.json': { clips: { 'name-bella': { file: 'name-bella.mp3' }, 'name-bella-q': { file: 'name-bella-q.mp3' } } },
};
const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
  if (url in files) return { ok: true, json: async () => files[url] };
  if (url.endsWith('.mp3')) return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  return { ok: false, json: async () => null };
});
const count = (url: string): number => fetchMock.mock.calls.filter((c) => c[0] === url).length;

class FakeContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createGain() {
    return { gain: { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
  decodeAudioData(_b: ArrayBuffer, ok: (b: unknown) => void) {
    const buf = { duration: 0.01, length: 441, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(441) };
    ok(buf);
    return Promise.resolve(buf);
  }
  resume() { return Promise.resolve(); }
}

let EA: EmmaAudioApi;

beforeAll(async () => {
  const g = globalThis as Record<string, unknown>;
  g.window = globalThis;
  g.document = { addEventListener() {}, visibilityState: 'visible' };
  g.AudioContext = FakeContext;
  g.fetch = fetchMock;
  await import('../../../../shared/audio.js');
  EA = (globalThis as unknown as { EmmaAudio: EmmaAudioApi }).EmmaAudio;
});

describe('shared/audio.js packs', () => {
  it('without packs it behaves as in v2: the base manifest decides', async () => {
    EA.init({ base: '/v2/', phonics: '/ph/' });
    expect(await EA.preload(['hello', 'nope'])).toEqual(['nope']);
    expect(count('/v2/hello.mp3')).toBe(1);
    expect(await EA.has('hello')).toBe(true);
    expect(await EA.has('nope')).toBe(false);
  });

  it('resolves ids across packs once packs are added', async () => {
    expect(await EA.addPack('core', '/a/core/')).toBe(true);
    expect(await EA.addPack('words', '/a/words/')).toBe(true);
    expect(await EA.preload(['hello', 'word-cat', 'nope-2'])).toEqual(['nope-2']);
    expect(count('/a/core/hello.mp3')).toBe(1);
    expect(count('/a/words/word-cat.mp3')).toBe(1);
    expect(await EA.has('word-cat')).toBe(true);
    expect(await EA.packClips('words')).toEqual(['word-cat']);
    expect(await EA.packClips('unknown-pack')).toEqual([]);
  });

  it('reports a pack without a manifest as false', async () => {
    expect(await EA.addPack('names-new', '/a/names-new/')).toBe(false);
  });

  it('fetches a fresh manifest with no-cache', async () => {
    await EA.addPack('names-t1', '/a/names-t1/', { fresh: true });
    const call = fetchMock.mock.calls.find((c) => c[0] === '/a/names-t1/manifest.json');
    expect(call?.[1]).toEqual({ cache: 'no-cache' });
  });

  it('forget drops the decoded clip so the next preload fetches it again', async () => {
    const before = count('/a/words/word-cat.mp3');
    await EA.preload(['word-cat']);
    expect(count('/a/words/word-cat.mp3')).toBe(before);
    EA.forget(['word-cat']);
    await EA.preload(['word-cat']);
    expect(count('/a/words/word-cat.mp3')).toBe(before + 1);
  });

  it('onMissing reports each new missing id once', async () => {
    const seen: string[] = [];
    const off = EA.onMissing((id) => seen.push(id));
    await EA.preload(['gone-1', 'gone-1']);
    await EA.preload(['gone-1']);
    off();
    await EA.preload(['gone-2']);
    expect(seen).toEqual(['gone-1']);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/audio/emma-audio.test.ts`
Expected: FAIL (`EA.addPack is not a function`, or a type error that `shared/audio.d.ts` is missing).

- [ ] **Step 3: Write `shared/audio.d.ts`**

```ts
// Types for shared/audio.js (a classic script that sets window.EmmaAudio).
export type SfxName = 'pop' | 'chime' | 'sparkle' | 'whoosh' | 'soft-no' | 'fanfare' | 'splash' | 'munch' | 'tick' | 'magic' | 'hatch';

export interface EmmaAudioHold {
  stop(): void;
  done: Promise<void>;
}

export interface PhonicsEntry {
  id: string;
  file: string;
  sustain?: boolean;
  kind?: string;
  same_as?: string;
}

export interface EmmaAudioApi {
  init(o?: { base?: string; phonics?: string }): EmmaAudioApi;
  unlock(): Promise<void>;
  preload(ids: string[]): Promise<string[]>;
  preloadSounds(graphemes?: string[]): Promise<string[]>;
  say(id: string, o?: { queue?: boolean }): Promise<void>;
  sayAll(ids: string[]): Promise<void>;
  sound(grapheme: string, o?: { overlap?: boolean }): Promise<void>;
  hold(grapheme: string): EmmaAudioHold;
  sfx(name: SfxName): Promise<void>;
  stop(): void;
  stopSpeech(): void;
  mute(on?: boolean): boolean;
  playUrl(url: string): Promise<void>;
  has(id: string): Promise<boolean>;
  phonicsIndex(): Promise<{ sounds: Record<string, PhonicsEntry> }>;
  addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<boolean>;
  packClips(name: string): Promise<string[]>;
  forget(ids: string[]): void;
  onMissing(fn: (id: string) => void): () => void;
  readonly missing: string[];
  readonly speaking: boolean;
  readonly muted: boolean;
  readonly context: AudioContext | null;
}

declare global {
  interface Window {
    EmmaAudio: EmmaAudioApi;
  }
}
```

- [ ] **Step 4: Change `shared/audio.js`**

Below `var missing = [];` add:

```js
  var packs = [];             // [{name, base, manifest: Promise}] from addPack(); empty means v2 mode (opts.base)
  var clipUrls = {};          // id -> url it was loaded from, for forget()
  var missingListeners = [];
```

Replace `warnMissing`:

```js
  function warnMissing(id) {
    console.warn('[audio] missing ' + id);
    if (missing.indexOf(id) < 0) {
      missing.push(id);
      missingListeners.slice().forEach(function (fn) {
        try { fn(id); } catch (e) { /* a listener error never stops the audio */ }
      });
    }
  }
```

Replace `loadClip` with:

```js
  function fetchManifest(base, fresh) {
    return fetch(base + 'manifest.json', fresh ? { cache: 'no-cache' } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // The url of a clip, or null when no manifest lists it. Without packs this is the v2 rule.
  function clipLocation(id) {
    if (!packs.length) {
      return gameManifest().then(function (m) { return (m && m.clips && !m.clips[id]) ? null : clipUrl(id); });
    }
    return Promise.all(packs.map(function (p) { return p.manifest; })).then(function (ms) {
      for (var i = 0; i < packs.length; i++) {
        var m = ms[i];
        if (m && m.clips && m.clips[id]) return packs[i].base + (m.clips[id].file || id + '.mp3');
      }
      return null;
    });
  }

  function loadClip(id) {
    return clipLocation(id).then(function (url) {
      if (!url) return null;
      clipUrls[id] = url;
      return load(url);
    });
  }
```

In the public API object, replace the `has` entry and add the new entries after `phonicsIndex: phonicsIndex,`:

```js
    has: function (id) {
      if (!packs.length) {
        return gameManifest().then(function (m) { return !!(m && m.clips && m.clips[id]); });
      }
      return clipLocation(id).then(function (url) { return !!url; });
    },
    phonicsIndex: phonicsIndex,

    // Additions for games with several clip folders (Moon Meadow Home). Each pack has its own manifest.
    addPack: function (name, base, o) {
      packs = packs.filter(function (p) { return p.name !== name; });
      var entry = { name: name, base: base, manifest: fetchManifest(base, !!(o && o.fresh)) };
      packs.push(entry);
      return entry.manifest.then(function (m) { return !!m; });
    },
    packClips: function (name) {
      var p = packs.filter(function (x) { return x.name === name; })[0];
      if (!p) return Promise.resolve([]);
      return p.manifest.then(function (m) { return m && m.clips ? Object.keys(m.clips) : []; });
    },
    forget: function (ids) {
      (ids || []).forEach(function (id) {
        var url = clipUrls[id];
        if (url) { delete buffers[url]; delete clipUrls[id]; }
      });
    },
    stopSpeech: stopSpeech,
    onMissing: function (fn) {
      missingListeners.push(fn);
      return function () {
        var i = missingListeners.indexOf(fn);
        if (i >= 0) missingListeners.splice(i, 1);
      };
    },
```

Add to the header comment block: `EmmaAudio.addPack(name, base, {fresh}), packClips(name), forget(ids), stopSpeech(), onMissing(fn)`.

In `shared/README.md`, add rows to the "Additions beyond the shared contract" paragraph: `addPack(name, base, {fresh})` (one more clip folder with its own manifest; once a pack is added, only packs are searched, in the order added), `packClips(name)`, `forget(ids)` (drop decoded clips to free memory), `stopSpeech()`, `onMissing(fn)`.

- [ ] **Step 5: Run the test and see it pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/audio/emma-audio.test.ts`
Expected: 6 tests pass.

- [ ] **Step 6: Check v2 still plays**

Run outside the sandbox (any static server on 8765 works; Task A8 replaces it):

```sh
playwright-cli -s=v2check open http://127.0.0.1:8765/ideas/opus-5-5-unicorn-egg-nest-v2/index.html
playwright-cli -s=v2check eval "() => typeof window.EmmaAudio.addPack"
playwright-cli -s=v2check close
```

Expected: `"function"`, and the v2 page shows its Play button with no console errors (`playwright-cli -s=v2check console error` before closing prints none).

- [ ] **Step 7: Commit**

```bash
git add shared/audio.js shared/audio.d.ts shared/README.md games/moon-meadow-home/tests/audio/emma-audio.test.ts
git commit -m "Let the shared audio player read several clip packs, forget clips and report missing ones"
```

### Task A7: Audio facade, phonics copy and clip id generation

**Files:**
- Create: `src/audio/emma-audio.ts`, `src/audio/voice.ts`, `src/audio/index.ts`, `src/audio/clip-ids.generated.ts` (generated), `tools/sync-phonics.ts`, `tools/gen-clip-ids.ts`
- Test: `tests/audio/voice.test.ts`, `tests/tools/clip-ids.test.ts`, `tests/tools/sync-phonics.test.ts`

**Interfaces:**
- Consumes: `EmmaAudioApi` from Task A6.
- Produces: the audio exports under "Contracts I produce"; `renderClipIds(packs: PackLines[]): string`, `readPacks(audioDir: string): PackLines[]` with `PackLines = { name: string; ids: string[] }`; `phonicsFiles(names: string[]): string[]`, `syncPhonics(src: string, dest: string): number`.

- [ ] **Step 1: Write the failing tests**

`tests/audio/voice.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { EmmaAudioApi } from '../../../../shared/audio.js';
import { createVoice, nameClipId } from '../../src/audio/voice.ts';

function fakeEA(packs: Record<string, string[]> = {}) {
  const calls: string[] = [];
  let endSound: () => void = () => {};
  const ea = {
    unlock: vi.fn(async () => {}),
    say: vi.fn(async (id: string) => { calls.push('say:' + id); }),
    sayAll: vi.fn(async (ids: string[]) => { calls.push('sayAll:' + ids.join(',')); }),
    sound: vi.fn((g: string) => { calls.push('sound:' + g); return new Promise<void>((r) => { endSound = r; }); }),
    hold: vi.fn(() => ({ stop() {}, done: Promise.resolve() })),
    sfx: vi.fn(async () => {}),
    stop: vi.fn(() => { calls.push('stop'); }),
    stopSpeech: vi.fn(() => { calls.push('stopSpeech'); }),
    mute: vi.fn(() => true),
    preload: vi.fn(async () => [] as string[]),
    forget: vi.fn(),
    addPack: vi.fn(async (name: string) => name in packs),
    packClips: vi.fn(async (name: string) => packs[name] ?? []),
    onMissing: vi.fn(() => () => {}),
    has: vi.fn(async () => false),
  };
  return { ea: ea as unknown as EmmaAudioApi, raw: ea, calls, endSound: () => endSound() };
}

const flush = async (): Promise<void> => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe('voice', () => {
  it('makes name clip ids', () => {
    expect(nameClipId('Bella', '!')).toBe('name-bella');
    expect(nameClipId('Bella', '?')).toBe('name-bella-q');
    expect(nameClipId('Zoë', '!')).toBe('name-zoe');
  });

  it('knows which clips exist after a pack is added', async () => {
    const { ea } = fakeEA({ core: ['goal-egg'], 'names-t1': ['name-bella', 'name-bella-q'] });
    const v = createVoice(ea);
    expect(v.has('goal-egg')).toBe(false);
    await v.addPack('core', './audio/core/');
    await v.addPack('names-t1', './audio/names-t1/', { fresh: true });
    expect(v.has('goal-egg')).toBe(true);
    expect(v.hasName('Bella')).toBe(true);
    expect(v.hasName('Tamo')).toBe(false);
    expect([...v.knownNameIds()].sort()).toEqual(['name-bella', 'name-bella-q']);
  });

  it('an instruction waits for a sound Emma asked for', async () => {
    const { ea, calls, endSound } = fakeEA();
    const v = createVoice(ea);
    void v.listen('a');
    const p = v.say('goal-egg' as never);
    await flush();
    expect(calls).toEqual(['sound:a']);
    endSound();
    await p;
    expect(calls).toEqual(['sound:a', 'say:goal-egg']);
  });

  it('an act drops an instruction that was still waiting', async () => {
    const { ea, calls, endSound } = fakeEA();
    const v = createVoice(ea);
    void v.listen('a');
    const p = v.say('goal-egg' as never);
    v.act();
    endSound();
    await p;
    expect(calls).toEqual(['sound:a', 'stopSpeech']);
  });

  it('says a name only when its clip exists', async () => {
    const { ea, calls } = fakeEA({ 'names-t1': ['name-bella'] });
    const v = createVoice(ea);
    await v.addPack('names-t1', './audio/names-t1/');
    expect(await v.sayName('Bella', '!')).toBe(true);
    expect(await v.sayName('Tamo', '!')).toBe(false);
    expect(calls).toEqual(['say:name-bella']);
  });

  it('sayOptional is silent for a clip that does not exist', async () => {
    const { ea, calls } = fakeEA();
    const v = createVoice(ea);
    expect(await v.sayOptional('platform-turn')).toBe(false);
    expect(calls).toEqual([]);
  });

  it('release forgets only clips no other scene still holds', async () => {
    const { ea, raw } = fakeEA();
    const v = createVoice(ea);
    await v.preloadScene('nest', ['a', 'b']);
    await v.preloadScene('meadow', ['b', 'c']);
    v.release('nest');
    expect(raw.forget).toHaveBeenCalledWith(['a']);
  });
});
```

`tests/tools/clip-ids.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderClipIds } from '../../tools/gen-clip-ids.ts';

describe('renderClipIds', () => {
  it('lists static ids, static packs and name packs', () => {
    const out = renderClipIds([
      { name: 'words-phase2', ids: ['word-cat'] },
      { name: 'core', ids: ['b', 'a'] },
      { name: 'names-t1', ids: ['name-bella'] },
    ]);
    expect(out).toContain('export const STATIC_PACKS = ["core","words-phase2"] as const;');
    expect(out).toContain('export const NAME_PACKS = ["names-t1"] as const;');
    expect(out).toContain("export type ClipId =\n  | 'a'\n  | 'b'\n  | 'word-cat';");
    expect(out).not.toContain("'name-bella'");
  });
  it('refuses an id that is in two packs', () => {
    expect(() => renderClipIds([{ name: 'core', ids: ['x'] }, { name: 'words-year1', ids: ['x'] }]))
      .toThrow('clip id x is in pack core and pack words-year1');
  });
  it('has no ids before any pack exists', () => {
    expect(renderClipIds([])).toContain('export type ClipId = never;');
  });
});
```

`tests/tools/sync-phonics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { phonicsFiles } from '../../tools/sync-phonics.ts';

describe('phonicsFiles', () => {
  it('copies the chosen letter sounds and the index, never the takes', () => {
    expect(phonicsFiles(['index.json', 'snd-s.mp3', 'snd-ai.mp3', 'takes', 'snd-s.wav', 'README.md']))
      .toEqual(['index.json', 'snd-ai.mp3', 'snd-s.mp3']);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/audio/voice.test.ts tests/tools`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the tools**

`tools/sync-phonics.ts`:

```ts
// Copies the letter sounds (shared/audio/phonics/) into public/phonics/ so dev and build serve them
// next to the game, and dist/ is complete for odin. The takes/ folder is never copied.
import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function phonicsFiles(names: string[]): string[] {
  return names.filter((n) => n === 'index.json' || /^snd-[a-z-]+\.mp3$/.test(n)).sort();
}

export function syncPhonics(src: string, dest: string): number {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const files = phonicsFiles(readdirSync(src));
  for (const f of files) copyFileSync(path.join(src, f), path.join(dest, f));
  return files.length;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = path.resolve(here, '../../../shared/audio/phonics');
  const dest = path.resolve(here, '../public/phonics');
  if (!existsSync(path.join(src, 'index.json'))) {
    console.error(`No phonics index at ${src}`);
    process.exit(1);
  }
  console.log(`Copied ${syncPhonics(src, dest)} phonics files to public/phonics/`);
}
```

`tools/gen-clip-ids.ts`:

```ts
// Writes src/audio/clip-ids.generated.ts from public/audio/*/lines.json, so a missing static clip
// id is a type error. Packs named names-* are runtime packs and are not typed.
// Usage: node tools/gen-clip-ids.ts [--check]
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type PackLines = { name: string; ids: string[] };

export function renderClipIds(packs: PackLines[]): string {
  const sorted = [...packs].sort((a, b) => a.name.localeCompare(b.name));
  const staticPacks = sorted.filter((p) => !p.name.startsWith('names-'));
  const namePacks = sorted.filter((p) => p.name.startsWith('names-'));
  const seen = new Map<string, string>();
  for (const p of staticPacks) {
    for (const id of p.ids) {
      const prev = seen.get(id);
      if (prev) throw new Error(`clip id ${id} is in pack ${prev} and pack ${p.name}`);
      seen.set(id, p.name);
    }
  }
  const ids = [...seen.keys()].sort();
  const out = [
    '// Generated by tools/gen-clip-ids.ts from public/audio/*/lines.json. Do not edit.',
    '',
    `export const STATIC_PACKS = ${JSON.stringify(staticPacks.map((p) => p.name))} as const;`,
    `export const NAME_PACKS = ${JSON.stringify(namePacks.map((p) => p.name))} as const;`,
    ids.length ? `export type ClipId =\n${ids.map((id) => `  | '${id}'`).join('\n')};` : 'export type ClipId = never;',
    `export const CLIP_PACK: Record<string, string> = ${JSON.stringify(Object.fromEntries(ids.map((id) => [id, seen.get(id)])), null, 2)};`,
  ];
  return out.join('\n') + '\n';
}

export function readPacks(audioDir: string): PackLines[] {
  if (!existsSync(audioDir)) return [];
  return readdirSync(audioDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(audioDir, d.name, 'lines.json')))
    .map((d) => {
      const data = JSON.parse(readFileSync(path.join(audioDir, d.name, 'lines.json'), 'utf8')) as { lines?: { id?: unknown }[] };
      return { name: d.name, ids: (data.lines ?? []).map((l) => l.id).filter((id): id is string => typeof id === 'string') };
    });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.resolve(here, '../src/audio/clip-ids.generated.ts');
  const text = renderClipIds(readPacks(path.resolve(here, '../public/audio')));
  if (process.argv.includes('--check')) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (current !== text) {
      console.error('src/audio/clip-ids.generated.ts is out of date. Run: node tools/gen-clip-ids.ts');
      process.exit(1);
    }
    console.log('Clip ids are up to date.');
  } else {
    writeFileSync(out, text);
    console.log(`Wrote ${path.relative(process.cwd(), out)}`);
  }
}
```

- [ ] **Step 4: Implement the facade**

`src/audio/voice.ts`:

```ts
import type { EmmaAudioApi, EmmaAudioHold, SfxName } from '../../../../shared/audio.js';
import type { ClipId } from './clip-ids.generated.ts';

export type NameMark = '!' | '?';

export function nameSlug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** "Bella!" is name-bella, "Bella?" is name-bella-q. The name-line generator uses this too. */
export function nameClipId(name: string, mark: NameMark): string {
  const s = nameSlug(name);
  return mark === '!' ? `name-${s}` : `name-${s}-q`;
}

export interface Voice {
  unlock(): Promise<void>;
  addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<boolean>;
  has(id: string): boolean;
  hasName(name: string): boolean;
  knownNameIds(): Set<string>;
  say(id: ClipId, o?: { queue?: boolean }): Promise<void>;
  sayAll(ids: ClipId[]): Promise<void>;
  sayOptional(id: string): Promise<boolean>;
  sayName(name: string, mark: NameMark, o?: { queue?: boolean }): Promise<boolean>;
  sound(g: string): Promise<void>;
  listen(g: string): Promise<void>;
  hold(g: string): EmmaAudioHold;
  sfx(n: SfxName): Promise<void>;
  act(): void;
  stop(): void;
  mute(on: boolean): void;
  preloadScene(scene: string, ids?: string[]): Promise<string[]>;
  release(scene: string): void;
  onMissing(fn: (id: string) => void): () => void;
}

/**
 * Speech-order rules from v2: an instruction never cuts off a letter sound Emma asked for (it waits),
 * and an act by Emma stops instructions that are now stale.
 */
export function createVoice(ea: EmmaAudioApi): Voice {
  let gen = 0;
  let asked: Promise<void> = Promise.resolve();
  const packIds = new Map<string, Set<string>>();
  const sceneClips = new Map<string, Set<string>>();

  const has = (id: string): boolean => {
    for (const ids of packIds.values()) if (ids.has(id)) return true;
    return false;
  };

  async function speak(run: () => Promise<void>): Promise<boolean> {
    const mine = gen;
    await asked;
    if (mine !== gen) return false;
    await run();
    return true;
  }

  return {
    unlock: () => ea.unlock(),
    async addPack(name, base, o) {
      const ok = await ea.addPack(name, base, o);
      packIds.set(name, new Set(ok ? await ea.packClips(name) : []));
      return ok;
    },
    has,
    hasName: (name) => has(nameClipId(name, '!')),
    knownNameIds() {
      const out = new Set<string>();
      for (const [pack, ids] of packIds) if (pack.startsWith('names-')) for (const id of ids) out.add(id);
      return out;
    },
    async say(id, o) { await speak(() => ea.say(id, o)); },
    async sayAll(ids) { await speak(() => ea.sayAll(ids)); },
    async sayOptional(id) { return has(id) ? speak(() => ea.say(id)) : false; },
    async sayName(name, mark, o) {
      const id = nameClipId(name, mark);
      return has(id) ? speak(() => ea.say(id, o)) : false;
    },
    sound: (g) => ea.sound(g),
    listen(g) {
      const p = ea.sound(g);
      asked = p.then(() => undefined, () => undefined);
      return p;
    },
    hold: (g) => ea.hold(g),
    sfx: (n) => ea.sfx(n),
    act() { gen += 1; ea.stopSpeech(); },
    stop() { gen += 1; ea.stop(); },
    mute(on) { ea.mute(on); },
    preloadScene(scene, ids = []) {
      sceneClips.set(scene, new Set(ids));
      return ea.preload([...ids]);
    },
    release(scene) {
      const mine = sceneClips.get(scene);
      if (!mine) return;
      sceneClips.delete(scene);
      const still = new Set<string>();
      for (const s of sceneClips.values()) for (const id of s) still.add(id);
      const drop = [...mine].filter((id) => !still.has(id));
      if (drop.length) ea.forget(drop);
    },
    onMissing: (fn) => ea.onMissing(fn),
  };
}
```

`src/audio/emma-audio.ts`:

```ts
import '../../../../shared/audio.js';
import type { EmmaAudioApi } from '../../../../shared/audio.js';

/** The shared player, bundled into the game. It sets window.EmmaAudio when this module loads. */
export const emmaAudio = (): EmmaAudioApi => window.EmmaAudio;
```

`src/audio/index.ts`:

```ts
import { emmaAudio } from './emma-audio.ts';
import { createVoice } from './voice.ts';
import { STATIC_PACKS, NAME_PACKS } from './clip-ids.generated.ts';

const BASE = import.meta.env.BASE_URL; // './' in every build
export const voice = createVoice(emmaAudio());

export const {
  unlock, addPack, has, hasName, knownNameIds, say, sayAll, sayOptional, sayName,
  sound, listen, hold, sfx, act, stop, mute, preloadScene, release, onMissing,
} = voice;
export { nameClipId } from './voice.ts';
export type { NameMark } from './voice.ts';
export type { ClipId } from './clip-ids.generated.ts';

let resolveReady: () => void = () => {};
export const audioReady: Promise<void> = new Promise((r) => { resolveReady = r; });

/** Called once by main.ts. Letter sounds come from ./phonics/, clips from ./audio/<pack>/. */
export async function initAudio(): Promise<void> {
  emmaAudio().init({ base: `${BASE}audio/core/`, phonics: `${BASE}phonics/` });
  await Promise.all(STATIC_PACKS.map((p: string) => voice.addPack(p, `${BASE}audio/${p}/`)));
  await Promise.all(NAME_PACKS.map((p: string) => voice.addPack(p, `${BASE}audio/${p}/`, { fresh: true })));
  resolveReady();
}

/** Re-reads the name manifests from the network. Returns the name clip ids that are new. */
export async function refreshNames(): Promise<Set<string>> {
  const before = voice.knownNameIds();
  await Promise.all(NAME_PACKS.map((p: string) => voice.addPack(p, `${BASE}audio/${p}/`, { fresh: true })));
  const added = new Set<string>();
  for (const id of voice.knownNameIds()) if (!before.has(id)) added.add(id);
  return added;
}
```

- [ ] **Step 5: Generate the first files and run the tests**

```sh
node games/moon-meadow-home/tools/sync-phonics.ts
node games/moon-meadow-home/tools/gen-clip-ids.ts
npm --prefix games/moon-meadow-home test
npm --prefix games/moon-meadow-home run check
```

Expected: "Copied N phonics files" (every `snd-*.mp3` in `shared/audio/phonics/` plus `index.json`), the generated file written, all tests pass, svelte-check 0 errors.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/audio games/moon-meadow-home/tools games/moon-meadow-home/tests
git commit -m "Add the typed audio facade with speech-order rules, the phonics copy and clip id generation"
```

### Task A8: Node server for static files on port 8765

**Files:**
- Create: `server/config.ts`, `server/static.ts`, `server/http.ts`, `server/main.ts`
- Test: `tests/server/config.test.ts`, `tests/server/static.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Mount = { prefix: string; dir: string; app: boolean }`, `type ServerConfig = { host: string; port: number; dataDir: string; repoRoot: string | null; mounts: Mount[] }`, `parseArgs(argv: string[], cwd: string): ServerConfig`, `safeJoin(base: string, relPath: string): string | null`, `serveFile(req, res, baseDir, relPath, urlPath, o: { app: boolean }): Promise<void>`, `type ApiHandler = (req: IncomingMessage, res: ServerResponse, route: string) => Promise<void>`, `createAppServer(cfg: ServerConfig, api?: ApiHandler): http.Server`, `sendJson(res, status, body): void`, `healthOnly: ApiHandler`.

- [ ] **Step 1: Write the failing tests**

`tests/server/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseArgs } from '../../server/config.ts';

describe('parseArgs', () => {
  it('defaults to the two game mounts, longest first', () => {
    const c = parseArgs([], '/pkg');
    expect(c.host).toBe('127.0.0.1');
    expect(c.port).toBe(8765);
    expect(c.dataDir).toBe(path.resolve('/pkg', '.data'));
    expect(c.repoRoot).toBeNull();
    expect(c.mounts.map((m) => m.prefix)).toEqual(['/games/moon-meadow-home/test/', '/games/moon-meadow-home/']);
    expect(c.mounts[1].dir).toBe(path.resolve('/pkg', 'dist'));
  });
  it('reads every option and normalises a mount prefix', () => {
    const c = parseArgs(['--host', '0.0.0.0', '--port', '8766', '--data', 'd', '--repo-root', '../..', '--mount', 'unicorns=dist'], '/a/b/pkg');
    expect(c).toMatchObject({ host: '0.0.0.0', port: 8766, dataDir: '/a/b/pkg/d', repoRoot: '/a' });
    expect(c.mounts).toEqual([{ prefix: '/unicorns/', dir: '/a/b/pkg/dist', app: true }]);
  });
  it('refuses unknown options and bad ports', () => {
    expect(() => parseArgs(['--nope'], '/')).toThrow('unknown option --nope');
    expect(() => parseArgs(['--port', 'x'], '/')).toThrow('bad --port');
  });
});
```

`tests/server/static.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../../server/http.ts';
import { safeJoin } from '../../server/static.ts';

let root = '';
let server: http.Server;

function raw(p: string, method = 'GET', headers: Record<string, string> = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as AddressInfo).port;
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'mmh-static-'));
  const put = async (p: string, s: string): Promise<void> => {
    await mkdir(path.dirname(path.join(root, p)), { recursive: true });
    await writeFile(path.join(root, p), s);
  };
  await put('index.html', '<h1>menu</h1>');
  await put('.env', 'SECRET=1');
  await put('.git/config', 'SECRET=2');
  await put('ideas/v2/index.html', 'v2');
  await put('node_modules/x/index.js', 'x');
  await put('games/mmh/dist/index.html', 'v3');
  await put('games/mmh/dist/assets/app-abc123.js', 'console.log(1)');
  await put('games/mmh/dist-test/index.html', 'v3 test');
  server = createAppServer({
    host: '127.0.0.1', port: 0, dataDir: path.join(root, 'data'), repoRoot: root,
    mounts: [
      { prefix: '/games/moon-meadow-home/test/', dir: path.join(root, 'games/mmh/dist-test'), app: true },
      { prefix: '/games/moon-meadow-home/', dir: path.join(root, 'games/mmh/dist'), app: true },
    ],
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('static server', () => {
  it('serves the picture menu and v2 from the repo root', async () => {
    const r = await raw('/');
    expect(r.status).toBe(200);
    expect(r.body).toBe('<h1>menu</h1>');
    expect(r.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(r.headers['cache-control']).toBe('no-cache');
    expect((await raw('/ideas/v2/index.html')).body).toBe('v2');
  });

  it('never serves dot files, whatever the spelling', async () => {
    for (const p of ['/.env', '/%2eenv', '/%2Eenv', '/ideas/../.env', '/ideas/%2e%2e/.env', '/.git/config', '/ideas/..%2f.env']) {
      const r = await raw(p);
      expect(r.status, p).toBe(404);
      expect(r.body, p).not.toContain('SECRET');
    }
  });

  it('never serves node_modules', async () => {
    expect((await raw('/node_modules/x/index.js')).status).toBe(404);
  });

  it('serves the v3 build at its mount with a content security policy', async () => {
    const r = await raw('/games/moon-meadow-home/');
    expect(r.status).toBe(200);
    expect(r.body).toBe('v3');
    expect(r.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('redirects the mount without its trailing slash', async () => {
    const r = await raw('/games/moon-meadow-home');
    expect(r.status).toBe(301);
    expect(r.headers.location).toBe('/games/moon-meadow-home/');
    expect((await raw('/games/moon-meadow-home/test')).headers.location).toBe('/games/moon-meadow-home/test/');
  });

  it('serves the test build at /test/', async () => {
    expect((await raw('/games/moon-meadow-home/test/')).body).toBe('v3 test');
  });

  it('caches hashed assets for a year and answers 304 to a matching etag', async () => {
    const r = await raw('/games/moon-meadow-home/assets/app-abc123.js');
    expect(r.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(r.headers['content-type']).toBe('text/javascript; charset=utf-8');
    const again = await raw('/games/moon-meadow-home/assets/app-abc123.js', 'GET', { 'if-none-match': String(r.headers.etag) });
    expect(again.status).toBe(304);
  });

  it('answers health on both mounts', async () => {
    const r = await raw('/games/moon-meadow-home/api/health');
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ ok: true });
    expect((await raw('/games/moon-meadow-home/test/api/health')).status).toBe(200);
  });

  it('refuses other methods on files', async () => {
    expect((await raw('/', 'POST')).status).toBe(405);
  });

  it('safeJoin keeps paths inside the base', () => {
    expect(safeJoin('/srv', 'a/b.txt')).toBe('/srv/a/b.txt');
    expect(safeJoin('/srv', '../etc/passwd')).toBeNull();
    expect(safeJoin('/srv', 'a/.hidden')).toBeNull();
    expect(safeJoin('/srv', 'a\0b')).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm --prefix games/moon-meadow-home test -- tests/server`
Expected: FAIL, modules not found. (If `listen` fails with `EPERM` inside the sandbox, rerun outside it.)

- [ ] **Step 3: Implement**

`server/config.ts`:

```ts
import path from 'node:path';

export type Mount = { prefix: string; dir: string; app: boolean };
export type ServerConfig = { host: string; port: number; dataDir: string; repoRoot: string | null; mounts: Mount[] };

export function parseArgs(argv: string[], cwd: string): ServerConfig {
  const cfg: ServerConfig = { host: '127.0.0.1', port: 8765, dataDir: path.resolve(cwd, '.data'), repoRoot: null, mounts: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case '--host': cfg.host = next(); break;
      case '--port': {
        cfg.port = Number(next());
        if (!Number.isInteger(cfg.port) || cfg.port < 0 || cfg.port > 65535) throw new Error('bad --port');
        break;
      }
      case '--data': cfg.dataDir = path.resolve(cwd, next()); break;
      case '--repo-root': cfg.repoRoot = path.resolve(cwd, next()); break;
      case '--mount': {
        const v = next();
        const eq = v.indexOf('=');
        if (eq < 1) throw new Error('--mount needs /prefix/=dir');
        let prefix = v.slice(0, eq);
        if (!prefix.startsWith('/')) prefix = '/' + prefix;
        if (!prefix.endsWith('/')) prefix += '/';
        cfg.mounts.push({ prefix, dir: path.resolve(cwd, v.slice(eq + 1)), app: true });
        break;
      }
      default: throw new Error(`unknown option ${a}`);
    }
  }
  if (cfg.mounts.length === 0) {
    cfg.mounts = [
      { prefix: '/games/moon-meadow-home/test/', dir: path.resolve(cwd, 'dist-test'), app: true },
      { prefix: '/games/moon-meadow-home/', dir: path.resolve(cwd, 'dist'), app: true },
    ];
  }
  cfg.mounts.sort((x, y) => y.prefix.length - x.prefix.length);
  return cfg;
}
```

`server/static.ts`:

```ts
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "media-src 'self' blob:", "font-src 'self' data:", "connect-src 'self'", "worker-src 'self'", "manifest-src 'self'",
  "base-uri 'self'", "frame-ancestors 'none'",
].join('; ');

/** A path inside base, or null. Refuses dot segments (.env, .git, ..), node_modules and NUL. */
export function safeJoin(base: string, relPath: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(relPath); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const segs = decoded.split('/').filter((s) => s.length > 0);
  for (const s of segs) if (s.startsWith('.') || s === 'node_modules') return null;
  const full = path.resolve(base, ...segs);
  const rel = path.relative(base, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}

const statOrNull = (f: string): Promise<Stats | null> => stat(f).catch(() => null);

function notFound(res: ServerResponse, text = 'Not found'): void {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(text);
}

export async function serveFile(req: IncomingMessage, res: ServerResponse, baseDir: string, relPath: string, urlPath: string, o: { app: boolean }): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let file = safeJoin(baseDir, relPath);
  if (!file) return notFound(res);
  let st = await statOrNull(file);
  if (st?.isDirectory()) {
    if (relPath !== '' && !relPath.endsWith('/')) {
      res.writeHead(301, { Location: urlPath + '/' });
      res.end();
      return;
    }
    file = path.join(file, 'index.html');
    st = await statOrNull(file);
  }
  if (!st || !st.isFile()) {
    return notFound(res, o.app && relPath === '' ? 'Not built yet. Run: npm --prefix games/moon-meadow-home run build' : 'Not found');
  }
  const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
  const headers: Record<string, string> = {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': o.app && relPath.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  };
  if (o.app) headers['Content-Security-Policy'] = CSP;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  headers['Content-Length'] = String(st.size);
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  await pipeline(createReadStream(file), res);
}
```

`server/http.ts`:

```ts
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ServerConfig } from './config.ts';
import { serveFile } from './static.ts';

export type ApiHandler = (req: IncomingMessage, res: ServerResponse, route: string) => Promise<void>;

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

export const healthOnly: ApiHandler = async (_req, res, route) => {
  if (route === 'health') return sendJson(res, 200, { ok: true });
  sendJson(res, 404, { error: 'not found' });
};

export function createAppServer(cfg: ServerConfig, api: ApiHandler = healthOnly): http.Server {
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://local');
    const pathname = url.pathname;
    for (const m of cfg.mounts) {
      if (pathname + '/' === m.prefix) {
        res.writeHead(301, { Location: m.prefix + url.search });
        res.end();
        return;
      }
      if (pathname.startsWith(m.prefix)) {
        const rest = pathname.slice(m.prefix.length);
        if (rest.startsWith('api/')) return api(req, res, rest.slice(4));
        return serveFile(req, res, m.dir, rest, pathname, { app: m.app });
      }
    }
    if (cfg.repoRoot) return serveFile(req, res, cfg.repoRoot, pathname.slice(1), pathname, { app: false });
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
  return http.createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      console.error('[server]', err instanceof Error ? err.message : err);
      if (!res.headersSent) sendJson(res, 500, { error: 'server error' });
      else res.end();
    });
  });
}
```

`server/main.ts`:

```ts
// Moon Meadow Home server: the repo's static files (picture menu, v2 ideas, shared audio), the built
// game at its mounts, and the save API. Run from games/moon-meadow-home: npm run serve
import { parseArgs } from './config.ts';
import { createAppServer } from './http.ts';

const cfg = parseArgs(process.argv.slice(2), process.cwd());
const server = createAppServer(cfg);
server.listen(cfg.port, cfg.host, () => {
  console.log(`Moon Meadow Home server on http://${cfg.host}:${cfg.port}/`);
  console.log(`  repo root: ${cfg.repoRoot ?? 'not served'}`);
  for (const m of cfg.mounts) console.log(`  ${m.prefix} -> ${m.dir}`);
});
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/server`
Expected: all pass.

- [ ] **Step 5: Replace the python server on port 8765**

```sh
lsof -nP -iTCP:8765 -sTCP:LISTEN
```

If the listener is `python3 -m http.server`, stop it with `kill <pid>` (it is the server this replaces). If it is anything else, stop here and report it to the lead. Then, outside the sandbox, start the new server in the background (Bash `run_in_background`):

```sh
npm --prefix games/moon-meadow-home run serve
```

Check:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/%2eenv
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8765/ideas/opus-5-5-unicorn-egg-nest-v2/index.html
curl -s http://127.0.0.1:8765/games/moon-meadow-home/api/health
```

Expected: `200`, `404`, `200`, `{"ok":true}`.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/server games/moon-meadow-home/tests/server
git commit -m "Add a Node server that serves the repo and the game safely on port 8765"
```

### Task A9: App shell: stage, turn picture, input actions, router, Play gate, home button

**Files:**
- Create: `src/platform/stage.svelte.ts`, `src/platform/Stage.svelte`, `src/platform/TurnPicture.svelte`, `src/platform/guards.ts`, `src/platform/input.ts`, `src/platform/router.svelte.ts`, `src/platform/registry.ts`, `src/platform/Router.svelte`, `src/platform/MissingScene.svelte`, `src/platform/boot.svelte.ts`, `src/platform/PlayGate.svelte`, `src/platform/HomeButton.svelte`, `src/platform/pwa.ts`, `src/ui/targets.ts`, `src/ui/ghost-hand.svelte.ts` (first version, completed in A11), `src/ui/moonbeam.svelte.ts` (first version, completed in A11), `src/app.css`
- Modify: `src/main.ts`, `src/App.svelte`
- Test: `tests/platform/pwa.test.ts`

**Interfaces:**
- Consumes: `computeFit`, `toStagePoint`, `Fit` (A3), `DragTracker`, `nearestTarget`, `Point`, `Rect` (A3), `anim`, `sleep` (A4), `onTouch`, `installTouchSource` (A4), `RouterCore`, `SceneEntry`, `sceneIdFromPath`, `KNOWN_SCENES`, `PORTRAIT_OK` (A5), audio exports (A7).
- Produces: `stage`, `setBands`, `refit`, `stageEl`, `clientToStage`, `elementRect`; `press`, `drag`, `dropTarget`, `DragOptions`, `DropInfo`; `installGuards`; `route`, `router`; `registerScenes`, `loaderFor`, `builtScenes`; `bootState`, `setStartHandler`, `startGame`, `StartTarget`; `requestPersist(nav?): Promise<'granted' | 'denied' | 'unavailable'>`, `platformStatus: { persist: ...; sw: 'skipped' | 'registered' | 'failed'; secure: boolean }`.

- [ ] **Step 1: Write the failing test for `requestPersist`**

`tests/platform/pwa.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { requestPersist } from '../../src/platform/pwa.ts';

const nav = (storage: unknown): Navigator => ({ storage } as unknown as Navigator);

describe('requestPersist', () => {
  it('is unavailable on plain http, where navigator.storage does not exist', async () => {
    expect(await requestPersist(nav(undefined))).toBe('unavailable');
  });
  it('reports granted and denied', async () => {
    expect(await requestPersist(nav({ persist: async () => true }))).toBe('granted');
    expect(await requestPersist(nav({ persist: async () => false }))).toBe('denied');
  });
  it('never throws', async () => {
    expect(await requestPersist(nav({ persist: async () => { throw new Error('no'); } }))).toBe('unavailable');
  });
});
```

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/pwa.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Write `src/platform/pwa.ts`**

```ts
export type PersistResult = 'granted' | 'denied' | 'unavailable';

/** Read by the parent corner for its "Add to Home Screen" warning. */
export const platformStatus: { persist: PersistResult; sw: 'skipped' | 'registered' | 'failed'; secure: boolean } = {
  persist: 'unavailable',
  sw: 'skipped',
  secure: typeof window !== 'undefined' ? window.isSecureContext : false,
};

export async function requestPersist(nav: Navigator = navigator): Promise<PersistResult> {
  try {
    if (!nav.storage || typeof nav.storage.persist !== 'function') return 'unavailable';
    return (await nav.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
```

Run the test again. Expected: 3 pass.

- [ ] **Step 3: Stage, bands and the turn picture**

`src/platform/stage.svelte.ts`:

```ts
import { computeFit, toStagePoint, type Fit } from './fit.ts';
import type { Point, Rect } from './geometry.ts';

export const stage = $state<{ fit: Fit; bandTop: string; bandBottom: string; el: HTMLElement | null }>({
  fit: computeFit(1180, 820),
  bandTop: '#11163d',
  bandBottom: '#1d4a37',
  el: null,
});

export function refit(): void {
  stage.fit = computeFit(window.innerWidth, window.innerHeight);
}

/** Colour of the letterbox bands above and below (or beside) the stage. Scenes call it on mount. */
export function setBands(top: string, bottom: string = top): void {
  stage.bandTop = top;
  stage.bandBottom = bottom;
}

export const stageEl = (): HTMLElement | null => stage.el;
export const clientToStage = (x: number, y: number): Point => toStagePoint(x, y, stage.fit);

export function elementRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  const f = stage.fit;
  return { x: (r.left - f.x) / f.scale, y: (r.top - f.y) / f.scale, w: r.width / f.scale, h: r.height / f.scale };
}
```

`src/platform/Stage.svelte`:

```svelte
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { stage, refit } from './stage.svelte.ts';
  import TurnPicture from './TurnPicture.svelte';

  let { children, allowPortrait = false }: { children: Snippet; allowPortrait?: boolean } = $props();
  let el: HTMLDivElement | undefined = $state();

  onMount(() => {
    stage.el = el ?? null;
    refit();
    const later = (): void => { setTimeout(refit, 200); };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', later);
    window.visualViewport?.addEventListener('resize', refit);
    return () => {
      window.removeEventListener('resize', refit);
      window.removeEventListener('orientationchange', later);
      window.visualViewport?.removeEventListener('resize', refit);
    };
  });

  $effect(() => {
    document.body.style.setProperty('--band-top', stage.bandTop);
    document.body.style.setProperty('--band-bottom', stage.bandBottom);
  });
</script>

<div id="stage" bind:this={el} style:transform="translate({stage.fit.x}px, {stage.fit.y}px) scale({stage.fit.scale})">
  {@render children()}
</div>
{#if stage.fit.portrait && !allowPortrait}
  <TurnPicture />
{/if}
```

`src/platform/TurnPicture.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { sayOptional } from '../audio/index.ts';
  import { bootState } from './boot.svelte.ts';

  onMount(() => { if (bootState.started) void sayOptional('platform-turn'); });
</script>

<div class="turn" role="img" aria-label="Turn the iPad">
  <svg viewBox="0 0 200 200" width="320" height="320" aria-hidden="true">
    <rect x="62" y="30" width="76" height="110" rx="10" fill="#fff6fb" stroke="#ffd25e" stroke-width="6" opacity=".4" />
    <g class="tilt">
      <rect x="45" y="62" width="110" height="76" rx="10" fill="#fff6fb" stroke="#ffd25e" stroke-width="6" />
      <circle cx="146" cy="100" r="4" fill="#ffd25e" />
    </g>
    <path d="M150 40 A60 60 0 0 1 172 96" fill="none" stroke="#ff8fc7" stroke-width="8" stroke-linecap="round" />
    <path d="M160 92 L173 104 L182 88" fill="none" stroke="#ff8fc7" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</div>

<style>
  .turn { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; background: #1a1d52; }
  .tilt { transform-origin: 100px 100px; animation: tilt 2.4s ease-in-out infinite; }
  @keyframes tilt { 0%, 30% { transform: rotate(-90deg); } 60%, 100% { transform: rotate(0deg); } }
</style>
```

- [ ] **Step 4: Global CSS and guards**

`src/app.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; height: 100%; overflow: hidden; overscroll-behavior: none; touch-action: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%;
  font-family: 'Andika', 'Chalkboard SE', system-ui, sans-serif; color: #2a1b3d;
}
body { position: fixed; inset: 0; background: linear-gradient(var(--band-top, #11163d) 50%, var(--band-bottom, #1d4a37) 50%); }
#stage { position: absolute; left: 0; top: 0; width: 1180px; height: 820px; transform-origin: 0 0; overflow: hidden; }
button {
  font: inherit; color: inherit; border: 0; background: none; padding: 0; margin: 0; cursor: pointer;
  -webkit-appearance: none; appearance: none; touch-action: none;
}
.press-down { scale: .95; }
.dragging { z-index: 500; }
[data-allow-select] { -webkit-user-select: text; user-select: text; }
```

`src/platform/guards.ts`:

```ts
/** No pinch zoom, double-tap zoom, long-press menu, text selection or two-finger scroll during play. */
export function installGuards(doc: Document = document): () => void {
  const prevent = (e: Event): void => {
    const t = e.target as Element | null;
    if (t && typeof t.closest === 'function' && t.closest('[data-allow-select]')) return;
    e.preventDefault();
  };
  const types = ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart'];
  for (const t of types) doc.addEventListener(t, prevent, { passive: false });
  const multi = (e: TouchEvent): void => { if (e.touches.length > 1) e.preventDefault(); };
  doc.addEventListener('touchmove', multi, { passive: false });
  return () => {
    for (const t of types) doc.removeEventListener(t, prevent);
    doc.removeEventListener('touchmove', multi);
  };
}
```

- [ ] **Step 5: Input actions**

`src/platform/input.ts`:

```ts
import type { Action } from 'svelte/action';
import { DragTracker } from './drag-tracker.ts';
import { nearestTarget, type Point } from './geometry.ts';
import { clientToStage, elementRect } from './stage.svelte.ts';
import { anim } from './timing.ts';

export type PressOptions = { onPress: () => void; disabled?: boolean };

/** A tap: fires on pointer up inside the element (16 px slop), never on hover or click. */
export const press: Action<HTMLElement, PressOptions | (() => void)> = (node, param) => {
  const norm = (p: PressOptions | (() => void) | undefined): PressOptions => (typeof p === 'function' ? { onPress: p } : p ?? { onPress: () => {} });
  let opts = norm(param);
  let down = -1;
  const onDown = (e: PointerEvent): void => {
    if (opts.disabled || down !== -1) return;
    e.preventDefault();
    down = e.pointerId;
    node.classList.add('press-down');
    try { node.setPointerCapture(e.pointerId); } catch { /* element gone */ }
  };
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== down) return;
    down = -1;
    node.classList.remove('press-down');
    const r = node.getBoundingClientRect();
    const inside = e.clientX >= r.left - 16 && e.clientX <= r.right + 16 && e.clientY >= r.top - 16 && e.clientY <= r.bottom + 16;
    if (inside && !opts.disabled) opts.onPress();
  };
  const onCancel = (e: PointerEvent): void => {
    if (e.pointerId !== down) return;
    down = -1;
    node.classList.remove('press-down');
  };
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onCancel);
  return {
    update(p) { opts = norm(p); },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
    },
  };
};

type TargetEntry = { el: HTMLElement; accepts?: (data: unknown) => boolean };
const targets = new Map<string, TargetEntry>();

export type DropTargetOptions = { id: string; accepts?: (data: unknown) => boolean };

export const dropTarget: Action<HTMLElement, DropTargetOptions> = (node, param) => {
  let id = param.id;
  targets.set(id, { el: node, accepts: param.accepts });
  return {
    update(p) {
      targets.delete(id);
      id = p.id;
      targets.set(id, { el: node, accepts: p.accepts });
    },
    destroy() { if (targets.get(id)?.el === node) targets.delete(id); },
  };
};

export type DropInfo<T> = { targetId: string | null; data: T; point: Point | null };

export type DragOptions<T> = {
  data: T;
  onDrop: (info: DropInfo<T>) => void;
  onTap?: () => void;
  onStart?: () => void;
  onMove?: (p: Point, overId: string | null) => void;
  threshold?: number;
  snap?: number;
  disabled?: boolean;
};

function findTarget(p: Point, data: unknown, snap: number, self: HTMLElement): string | null {
  const list: { id: string; rect: ReturnType<typeof elementRect> }[] = [];
  for (const [id, t] of targets) {
    if (t.el === self || !t.el.isConnected) continue;
    if (t.accepts && !t.accepts(data)) continue;
    list.push({ id, rect: elementRect(t.el) });
  }
  return nearestTarget(p, list, snap);
}

/** Drag with a 6 px threshold. The node follows the finger with `translate`; a miss glides back. */
export const drag: Action<HTMLElement, DragOptions<any>> = (node, param) => {
  let o = param;
  const tracker = new DragTracker(o.threshold ?? 6);
  const pt = (e: PointerEvent): Point => clientToStage(e.clientX, e.clientY);

  async function finish(targetId: string | null, p: Point | null): Promise<void> {
    node.classList.remove('dragging');
    if (targetId) {
      node.style.translate = '';
      o.onDrop({ targetId, data: o.data, point: p });
      return;
    }
    const from = node.style.translate || '0px 0px';
    await anim(node, [{ translate: from }, { translate: '0px 0px' }], { duration: 250, easing: 'ease-out' });
    node.style.translate = '';
    o.onDrop({ targetId: null, data: o.data, point: p });
  }

  const onDown = (e: PointerEvent): void => {
    if (o.disabled) return;
    e.preventDefault();
    const p = pt(e);
    tracker.down(e.pointerId, p.x, p.y);
    try { node.setPointerCapture(e.pointerId); } catch { /* element gone */ }
  };
  const onMove = (e: PointerEvent): void => {
    const p = pt(e);
    const r = tracker.move(e.pointerId, p.x, p.y);
    if (r.kind !== 'move') return;
    if (r.first) { node.classList.add('dragging'); o.onStart?.(); }
    node.style.translate = `${r.dx}px ${r.dy}px`;
    o.onMove?.(p, findTarget(p, o.data, o.snap ?? 48, node));
  };
  const onUp = (e: PointerEvent): void => {
    const p = pt(e);
    const r = tracker.up(e.pointerId, p.x, p.y);
    if (r.kind === 'tap') o.onTap?.();
    else if (r.kind === 'drop') void finish(findTarget(p, o.data, o.snap ?? 48, node), p);
  };
  const onCancel = (e: PointerEvent): void => {
    if (tracker.cancel(e.pointerId).kind === 'cancel') void finish(null, null);
  };

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onCancel);
  return {
    update(p) { o = p; },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
    },
  };
};
```

- [ ] **Step 6: Targets, first ghost and moonbeam controllers**

`src/ui/targets.ts`:

```ts
import type { Point, Rect } from '../platform/geometry.ts';
import { elementRect, stageEl } from '../platform/stage.svelte.ts';

/** An element, an aria-label inside the stage, or a stage point. */
export type Target = Element | string | Point;

export function findByLabel(label: string): Element | null {
  const root = stageEl();
  return root ? root.querySelector(`[aria-label="${CSS.escape(label)}"]`) : null;
}

export function rectOf(t: Target): Rect | null {
  if (typeof t === 'string') {
    const el = findByLabel(t);
    if (!el) { console.warn(`[ui] no element with label ${t}`); return null; }
    return elementRect(el);
  }
  if (t instanceof Element) return elementRect(t);
  return { x: t.x - 40, y: t.y - 40, w: 80, h: 80 };
}

export function centreOf(t: Target): Point | null {
  const r = rectOf(t);
  return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null;
}
```

`src/ui/ghost-hand.svelte.ts` (first version; Task A11 replaces the body of `ghost` with the full animation):

```ts
export const ghostState = $state({ visible: false, pressed: false, x: 0, y: 0, moveMs: 0 });
export const ghost = {
  get visible(): boolean { return ghostState.visible; },
  hide(): void { ghostState.visible = false; ghostState.pressed = false; },
};
```

`src/ui/moonbeam.svelte.ts` (first version; Task A11 adds `show`):

```ts
import type { Rect } from '../platform/geometry.ts';

export const beamState = $state<{ rect: Rect | null }>({ rect: null });
export const moonbeam = {
  get rect(): Rect | null { return beamState.rect; },
  clear(): void { beamState.rect = null; },
};
```

- [ ] **Step 7: Router, registry and scene outlet**

`src/platform/router.svelte.ts`:

```ts
import { RouterCore, type SceneEntry, type RouteListener } from './router-core.ts';
import { ghost } from '../ui/ghost-hand.svelte.ts';
import { moonbeam } from '../ui/moonbeam.svelte.ts';
import { stop, release } from '../audio/index.ts';

const core = new RouterCore<string>(20);
export const route = $state<{ current: SceneEntry | null; navKey: number }>({ current: null, navKey: 0 });

let mountedKey = 0;
const waiting: { key: number; resolve: () => void }[] = [];

core.onChange((from, to) => {
  ghost.hide();
  moonbeam.clear();
  stop();
  if (from && from.id !== to.id) release(from.id);
  route.current = to;
  route.navKey += 1;
});

function settled(): Promise<void> {
  const key = route.navKey;
  if (mountedKey >= key) return Promise.resolve();
  return new Promise((resolve) => { waiting.push({ key, resolve }); });
}

export const router = {
  get current(): SceneEntry | null { return core.current; },
  go(id: string, params: Record<string, unknown> = {}): Promise<void> { core.go(id, params); return settled(); },
  replace(id: string, params: Record<string, unknown> = {}): Promise<void> { core.replace(id, params); return settled(); },
  reset(id: string, params: Record<string, unknown> = {}): Promise<void> { core.reset(id, params); return settled(); },
  async back(): Promise<boolean> { const moved = core.back(); await settled(); return moved; },
  onChange(fn: RouteListener<string>): () => void { return core.onChange(fn); },
  /** Router.svelte calls this when the scene for navKey is in the DOM. */
  mounted(key: number): void {
    mountedKey = Math.max(mountedKey, key);
    for (let i = waiting.length - 1; i >= 0; i--) {
      if (waiting[i].key <= mountedKey) { waiting[i].resolve(); waiting.splice(i, 1); }
    }
  },
};
```

`src/platform/registry.ts`:

```ts
import type { Component } from 'svelte';
import { KNOWN_SCENES, sceneIdFromPath } from './scene-ids.ts';

export type SceneProps = { params: Record<string, unknown> };
type SceneModule = { default: Component<SceneProps> };
type Loader = () => Promise<SceneModule>;

const loaders = new Map<string, Loader>();
const known = new Set(KNOWN_SCENES);

function add(id: string, load: Loader, from: string): void {
  if (!known.has(id)) console.warn(`[router] scene ${id} from ${from} is not in KNOWN_SCENES`);
  loaders.set(id, load);
}

// 3. Files: src/scenes/<PascalCase>.svelte and the parent corner (lazy).
const files: Record<string, Loader> = {
  ...import.meta.glob<SceneModule>('../scenes/*.svelte'),
  ...import.meta.glob<SceneModule>('../parent/ParentCorner.svelte'),
  ...(import.meta.env.MODE !== 'production' ? import.meta.glob<SceneModule>('./PlatformDemo.svelte') : {}),
};
for (const [path, load] of Object.entries(files)) add(sceneIdFromPath(path), load, path);

// 2. Maps: plain-object named exports of src/<folder>/scenes.ts (eager), for example placeScenes.
const maps = import.meta.glob<Record<string, unknown>>('../*/scenes.ts', { eager: true });
for (const [path, mod] of Object.entries(maps)) {
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) continue;
    for (const [id, comp] of Object.entries(value as Record<string, Component<SceneProps>>)) {
      add(id, async () => ({ default: comp }), path);
    }
  }
}

// 1. Explicit registration wins over both.
export function registerScenes(map: Record<string, Component<any>>): void {
  for (const [id, comp] of Object.entries(map)) add(id, async () => ({ default: comp as Component<SceneProps> }), 'registerScenes');
}

export const loaderFor = (id: string): Loader | null => loaders.get(id) ?? null;
export const builtScenes = (): string[] => [...loaders.keys()].sort();
```

`src/platform/MissingScene.svelte`:

```svelte
<script lang="ts">
  let { id }: { id: string } = $props();
  const dev = import.meta.env.MODE !== 'production';
</script>

<div class="missing" role="img" aria-label="scene not built">
  <svg viewBox="0 0 100 100" width="160" height="160" aria-hidden="true">
    <circle cx="50" cy="50" r="34" fill="#fffef2" />
    <circle cx="64" cy="42" r="30" fill="#26296b" />
  </svg>
  {#if dev}<p>Scene not built: {id}</p>{/if}
</div>

<style>
  .missing { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; background: #26296b; color: #fff6fb; font-size: 28px; }
</style>
```

`src/platform/Router.svelte`:

```svelte
<script lang="ts">
  import { tick, type Component } from 'svelte';
  import { route, router } from './router.svelte.ts';
  import { loaderFor, type SceneProps } from './registry.ts';
  import MissingScene from './MissingScene.svelte';

  let shown = $state<{ key: number; id: string; params: Record<string, unknown>; comp: Component<SceneProps> | null } | null>(null);

  $effect(() => {
    const cur = route.current;
    const key = route.navKey;
    if (!cur) { shown = null; return; }
    const load = loaderFor(cur.id);
    const done = (comp: Component<SceneProps> | null): void => {
      if (route.navKey !== key) return;
      shown = { key, id: cur.id, params: cur.params, comp };
      void tick().then(() => router.mounted(key));
    };
    if (!load) { done(null); return; }
    load().then((m) => done(m.default), (err: unknown) => { console.error('[router] cannot load', cur.id, err); done(null); });
  });
</script>

{#if shown}
  {#key shown.key}
    {#if shown.comp}
      {@const Scene = shown.comp}
      <Scene params={shown.params} />
    {:else}
      <MissingScene id={shown.id} />
    {/if}
  {/key}
{/if}
```

- [ ] **Step 8: Boot, Play gate, home button, App and main**

`src/platform/boot.svelte.ts`:

```ts
import { router } from './router.svelte.ts';
import { requestPersist, platformStatus } from './pwa.ts';
import { unlock, audioReady } from '../audio/index.ts';

export type StartTarget = { id: string; params?: Record<string, unknown> };

export const bootState = $state({ started: false, starting: false });

let handler: () => StartTarget | Promise<StartTarget> = () => ({ id: 'meadow' });

/** The store decides the first scene (Moving Day, a new player's welcome, or the meadow). */
export function setStartHandler(fn: () => StartTarget | Promise<StartTarget>): void {
  handler = fn;
}

export async function startGame(): Promise<void> {
  if (bootState.started || bootState.starting) return;
  bootState.starting = true;
  void unlock();
  void requestPersist().then((r) => { platformStatus.persist = r; });
  await audioReady;
  const first = await handler();
  bootState.started = true;
  bootState.starting = false;
  await router.reset(first.id, first.params ?? {});
}
```

`src/platform/PlayGate.svelte`:

```svelte
<script lang="ts">
  import { press } from './input.ts';
  import { startGame } from './boot.svelte.ts';
  import { unlock } from '../audio/index.ts';
</script>

<div class="gate">
  <button class="play" aria-label="Play" onpointerdown={() => { void unlock(); }} use:press={() => { void startGame(); }}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M30 18L84 50L30 82Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round" />
    </svg>
  </button>
</div>

<style>
  .gate { position: absolute; inset: 0; z-index: 950; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 30%, #5a3f9e, #26296b 60%, #11163d); }
  .play { width: 220px; height: 220px; border-radius: 50%; background: #ff5fae; box-shadow: 0 12px 0 #b4458a, 0 20px 40px rgba(0, 0, 0, .35); display: grid; place-items: center; animation: pulse 1.6s ease-in-out infinite; }
  .play svg { width: 120px; height: 120px; pointer-events: none; }
  @keyframes pulse { 50% { transform: scale(1.06); } }
</style>
```

`src/platform/HomeButton.svelte`:

```svelte
<script lang="ts">
  import { press } from './input.ts';
  import { stop } from '../audio/index.ts';

  const menu: string = import.meta.env.VITE_MENU_URL ?? '../../index.html';
  function goHome(): void {
    stop();
    window.location.href = menu;
  }
</script>

{#if menu}
  <button class="home" aria-label="Home" use:press={goHome}>
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6 L44 23 L38 23 L38 42 L10 42 L10 23 L4 23 Z" fill="#ff8fc7" stroke="#c2468a" stroke-width="3" stroke-linejoin="round" />
      <rect x="19" y="28" width="10" height="14" rx="3" fill="#fff6dd" stroke="#c2468a" stroke-width="2.5" />
      <circle cx="24" cy="19" r="3.2" fill="#ffd25e" />
    </svg>
  </button>
{/if}

<style>
  .home { position: absolute; right: 16px; top: 16px; width: 80px; height: 80px; z-index: 960; border-radius: 50%; background: #fff; border: 5px solid #ffd25e; box-shadow: 0 5px 0 #d9a23a, 0 8px 16px rgba(0, 0, 0, .18); display: flex; align-items: center; justify-content: center; }
  .home svg { width: 46px; height: 46px; pointer-events: none; }
</style>
```

`src/App.svelte`:

```svelte
<script lang="ts">
  import Stage from './platform/Stage.svelte';
  import Router from './platform/Router.svelte';
  import PlayGate from './platform/PlayGate.svelte';
  import HomeButton from './platform/HomeButton.svelte';
  import { route } from './platform/router.svelte.ts';
  import { bootState } from './platform/boot.svelte.ts';
  import { PORTRAIT_OK } from './platform/scene-ids.ts';

  const allowPortrait = $derived(route.current !== null && PORTRAIT_OK.has(route.current.id));
</script>

<Stage {allowPortrait}>
  <Router />
  <HomeButton />
  {#if !bootState.started}
    <PlayGate />
  {/if}
</Stage>
```

`src/main.ts`:

```ts
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { installGuards } from './platform/guards.ts';
import { installTouchSource } from './platform/touch.ts';
import { initAudio } from './audio/index.ts';

// The game store (src/game.svelte.ts, core workstream) registers its start handler and hooks on import.
import.meta.glob('./game.svelte.ts', { eager: true });

installGuards(document);
installTouchSource(document);
void initAudio();

const app = mount(App, { target: document.getElementById('app')! });

if (import.meta.env.MODE !== 'production') {
  // A glob, so the build works before src/test-hook.ts exists (Task A10). Production drops this branch.
  const hook = import.meta.glob<{ installTestHook(): void }>('./test-hook.ts');
  for (const load of Object.values(hook)) void load().then((m) => m.installTestHook());
}

export default app;
```

- [ ] **Step 9: Build and check in the browser**

```sh
npm --prefix games/moon-meadow-home test
npm --prefix games/moon-meadow-home run check
npm --prefix games/moon-meadow-home run build
```

Then outside the sandbox (the 8765 server from Task A8 is running):

```sh
playwright-cli -s=shell open http://127.0.0.1:8765/games/moon-meadow-home/
playwright-cli -s=shell snapshot
playwright-cli -s=shell screenshot --filename "$TMPDIR/mmh-shots/shell-gate.png"
playwright-cli -s=shell resize 820 1180
playwright-cli -s=shell eval "() => !!document.querySelector('[aria-label=\"Turn the iPad\"]')"
playwright-cli -s=shell resize 1180 820
playwright-cli -s=shell console error
playwright-cli -s=shell close
```

Expected: the snapshot shows buttons `Play` and `Home`; the screenshot shows the pink Play button centred on a full 1180 x 820 stage; portrait returns `true`; no console errors.

- [ ] **Step 10: Commit**

```bash
git add games/moon-meadow-home/src games/moon-meadow-home/tests/platform/pwa.test.ts
git commit -m "Add the stage with letterboxing, the turn picture, touch actions, the scene router and the Play gate"
```

### Task A10: Test hook and flow infrastructure

**Files:**
- Create: `src/test-hook.ts`, `flows/lib.sh`, `flows/run.sh`, `flows/platform-smoke.flow.sh`

**Interfaces:**
- Consumes: `route`, `router` (A9), `stage` (A9), `timing`, `setFast` (A4), `clock` (A4), `emitTouch` (A4), `callHook`, `hookStates`, `hookExtensions` (A4), `bootState`, `startGame` (A9), `ghostState` (A9), `beamState` (A9), `mute` (A7).
- Produces: `installTestHook(): void` and the `window.__game` API in "Contracts I produce"; the flow helpers in `flows/lib.sh`.

- [ ] **Step 1: Write the test hook**

`src/test-hook.ts`:

```ts
import { route, router } from './platform/router.svelte.ts';
import { stage } from './platform/stage.svelte.ts';
import { timing, setFast } from './platform/timing.ts';
import { clock } from './platform/clock.ts';
import { emitTouch } from './platform/touch.ts';
import { callHook, hookStates, hookExtensions } from './platform/hooks.ts';
import { bootState, startGame } from './platform/boot.svelte.ts';
import { ghostState } from './ui/ghost-hand.svelte.ts';
import { beamState } from './ui/moonbeam.svelte.ts';
import { mute as muteAudio } from './audio/index.ts';

const NOW_KEY = 'mmh-test-now-offset';
const fixtures = import.meta.glob<unknown>('../tests/fixtures/*.json', { import: 'default' });

export function installTestHook(): void {
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => errors.push(`unhandled: ${String(e.reason)}`));
  document.addEventListener('securitypolicyviolation', (e) => errors.push(`csp: ${e.violatedDirective} ${e.blockedURI}`));
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); consoleError(...args); };

  try {
    const saved = sessionStorage.getItem(NOW_KEY);
    if (saved !== null) clock.setOffset(Number(saved));
  } catch { /* storage blocked */ }

  let muted = false;
  const game: Record<string, unknown> = {
    state: () => ({
      scene: route.current?.id ?? 'gate',
      params: route.current?.params ?? {},
      fit: { ...stage.fit },
      speed: timing.speed,
      muted,
      now: clock.now(),
      secure: window.isSecureContext,
      ghost: ghostState.visible,
      moonbeam: beamState.rect,
      missingClips: [...window.EmmaAudio.missing],
      ...hookStates(),
    }),
    play: () => startGame(),
    jump: async (scene: string, params: Record<string, unknown> = {}) => {
      bootState.started = true;
      await router.reset(scene, params);
    },
    fast: (on: boolean) => { setFast(on); },
    mute: (on: boolean) => { muted = on; muteAudio(on); },
    setNow: (ms: number | null) => {
      clock.setNow(ms);
      try { sessionStorage.setItem(NOW_KEY, String(clock.offset())); } catch { /* storage blocked */ }
    },
    seed: (n: number) => callHook('seed', [n]),
    setStep: (strand: string, step: string) => callHook('setStep', [strand, step]),
    answer: () => { emitTouch(); return callHook('answer', []); },
    wrong: () => { emitTouch(); return callHook('wrong', []); },
    idle: () => callHook('idle', []),
    herd: (n: number) => callHook('herd', [n]),
    newVisit: () => callHook('newVisit', []),
    syncNow: () => callHook('syncNow', []),
    importFixture: async (name: string) => {
      const load = fixtures[`../tests/fixtures/${name}.json`];
      if (!load) throw new Error(`[hook] no fixture ${name}`);
      return callHook('importFixture', [await load(), name]);
    },
    call: (name: string, ...args: unknown[]) => callHook(name, args),
    errors: () => [...errors],
  };
  for (const [k, v] of hookExtensions()) game[k] = v;
  (globalThis as { __game?: Record<string, unknown> }).__game = game;
}
```

- [ ] **Step 2: Write `flows/lib.sh`**

```bash
#!/usr/bin/env bash
# Helpers for Moon Meadow Home flows. A flow sources this file and runs from the repo root.
# Env: S (session, short, no slashes), W and H (viewport), MMH_URL (test app), MMH_SHOTS (screenshots).
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
S="${S:-mmh}"
W="${W:-1180}"
H="${H:-820}"
MMH_URL="${MMH_URL:-http://127.0.0.1:${MMH_PORT:-8766}/games/moon-meadow-home/}"
MMH_SHOTS="${MMH_SHOTS:-${TMPDIR:-/tmp}/mmh-shots}"
mkdir -p "$MMH_SHOTS"

pw() { playwright-cli -s="$S" "$@"; }

# JSON-quote a string for use inside page code.
jsq() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }

# Print a page function's result: strings unquoted, everything else as JSON.
val() {
  pw --raw eval "$1" | node -e 'let s=require("fs").readFileSync(0,"utf8").trim();try{const v=JSON.parse(s);s=typeof v==="string"?v:JSON.stringify(v)}catch{}process.stdout.write(s)'
}

# Call a test hook method. Example: hook 'jump("nest")'
hook() { val "async () => (await window.__game.$1) ?? null"; }

# One field of window.__game.state(). Example: state scene
state() { val "() => window.__game.state()[$(jsq "$1")] ?? null"; }

shot() { pw screenshot --filename "$MMH_SHOTS/$S-${W}x$H-$1.png" >/dev/null || true; }

fail() { echo "FAIL [$S ${W}x$H]: $*" >&2; shot fail; exit 1; }

expect_eq() { [ "$1" = "$2" ] || fail "$3: expected '$2', got '$1'"; }

# Wait until a page predicate is true (8 s at most).
wait_for() {
  val "() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { let v = false; try { v = !!(($1)()); } catch {} if (v) { clearInterval(t); ok('ok'); } else if (Date.now() - t0 > 8000) { clearInterval(t); no(new Error('timeout')); } }, 50); })" >/dev/null || fail "timeout waiting for $1"
}

# Press an element by aria-label with mouse move, down and up at its centre (safe on pulsing elements).
tap() {
  local q; q="$(jsq "$1")"
  pw run-code "async page => { const b = await page.getByLabel($q, { exact: true }).first().boundingBox(); if (!b) throw new Error('no box for ' + $q); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up(); }" >/dev/null
}

# Drag from one labelled element to another.
drag_to() {
  local a b; a="$(jsq "$1")"; b="$(jsq "$2")"
  pw run-code "async page => { const f = await page.getByLabel($a, { exact: true }).first().boundingBox(); const t = await page.getByLabel($b, { exact: true }).first().boundingBox(); if (!f || !t) throw new Error('no box'); await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2); await page.mouse.down(); await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 }); await page.mouse.up(); }" >/dev/null
}

# Drag a labelled element by dx, dy CSS pixels.
drag_by() {
  local a; a="$(jsq "$1")"
  pw run-code "async page => { const f = await page.getByLabel($a, { exact: true }).first().boundingBox(); if (!f) throw new Error('no box'); const x = f.x + f.width / 2, y = f.y + f.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + ($2), y + ($3), { steps: 12 }); await page.mouse.up(); }" >/dev/null
}

open_app() {
  pw open "$MMH_URL" >/dev/null
  pw resize "$W" "$H" >/dev/null
  wait_for "() => window.__game"
  hook 'fast(true)' >/dev/null
}

start_play() {
  tap 'Play'
  wait_for "() => window.__game.state().scene !== 'gate'"
}

finish() {
  expect_eq "$(val '() => window.EmmaAudio.missing')" '[]' 'missing clips'
  expect_eq "$(hook 'errors()')" '[]' 'page errors'
  pw close >/dev/null
  echo "ok $S ${W}x$H"
}
```

- [ ] **Step 3: Write `flows/run.sh`**

```bash
#!/usr/bin/env bash
# Usage: bash games/moon-meadow-home/flows/run.sh [flow ...]
# A flow name is a path under flows/ without .flow.sh (platform-smoke, places/post-box).
# No names: every flows/*.flow.sh and flows/*/*.flow.sh. Each flow runs at 1180x820, 1080x810, 1024x768.
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
PKG=games/moon-meadow-home
PORT="${MMH_PORT:-8766}"
HEALTH="http://127.0.0.1:$PORT/games/moon-meadow-home/test/api/health"

npm --prefix "$PKG" run build:test >/dev/null

if ! curl -fsS "$HEALTH" >/dev/null 2>&1; then
  npm --prefix "$PKG" run serve:test >"${TMPDIR:-/tmp}/mmh-serve-test.log" 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
  curl -fsS --retry 30 --retry-delay 1 --retry-connrefused "$HEALTH" >/dev/null
fi

flows=("$@")
if [ ${#flows[@]} -eq 0 ]; then
  while IFS= read -r f; do flows+=("${f#"$PKG"/flows/}"); done < <(ls "$PKG"/flows/*.flow.sh "$PKG"/flows/*/*.flow.sh 2>/dev/null | sed 's/\.flow\.sh$//')
fi

passed=0; failed=0
for name in "${flows[@]}"; do
  short="$(basename "$name" | cut -c1-12)"
  for size in 1180x820 1080x810 1024x768; do
    w="${size%x*}"; h="${size#*x}"
    if S="$short$w" W="$w" H="$h" MMH_PORT="$PORT" bash "$PKG/flows/$name.flow.sh"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1)); echo "FAILED $name $size"
      playwright-cli -s="$short$w" close >/dev/null 2>&1 || true
    fi
  done
done
echo "flows: $passed passed, $failed failed (screenshots in ${MMH_SHOTS:-${TMPDIR:-/tmp}/mmh-shots})"
[ "$failed" -eq 0 ]
```

- [ ] **Step 4: Write `flows/platform-smoke.flow.sh`**

```bash
#!/usr/bin/env bash
# The gate, the stage scale at this size, Play, the portrait turn picture, and (on demand) an insecure context.
. "$(dirname "$0")/lib.sh"
open_app
expect_eq "$(state scene)" 'gate' 'scene before Play'
want="$(node -e "process.stdout.write(Math.min($W/1180,$H/820).toFixed(3))")"
expect_eq "$(val '() => window.__game.state().fit.scale.toFixed(3)')" "$want" 'stage scale'
shot gate
start_play
[ "$(state scene)" != 'gate' ] || fail 'Play did not start a scene'
shot played
pw resize 820 1180 >/dev/null
wait_for "() => !!document.querySelector('[aria-label=\"Turn the iPad\"]')"
shot portrait
pw resize "$W" "$H" >/dev/null
wait_for "() => !document.querySelector('[aria-label=\"Turn the iPad\"]')"
if [ "${MMH_EXPECT_INSECURE:-0}" = 1 ]; then
  expect_eq "$(state secure)" 'false' 'insecure context on the home network'
fi
finish
```

Make the scripts executable: `chmod +x games/moon-meadow-home/flows/*.sh`.

- [ ] **Step 5: Run the smoke flow at every size**

Outside the sandbox:

```sh
bash games/moon-meadow-home/flows/run.sh platform-smoke
```

Expected: `flows: 3 passed, 0 failed`. If `--raw` prints a quoted string, `val` already strips it; if `pw resize` is refused for the mobile context, report it to the lead with the exact error.

- [ ] **Step 6: Run the smoke flow on plain http with the LAN host name**

The 8765 server must be running and `dist-test/` must be built (run.sh built it):

```sh
MMH_URL="http://$(scutil --get LocalHostName).local:8765/games/moon-meadow-home/test/" MMH_EXPECT_INSECURE=1 S=lan W=1180 H=820 bash games/moon-meadow-home/flows/platform-smoke.flow.sh
```

Expected: `ok lan 1180x820`. This proves the app runs where `crypto.subtle`, `navigator.storage` and service workers are missing.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src/test-hook.ts games/moon-meadow-home/flows
git commit -m "Add the window.__game test hook and the playwright-cli flow runner with a smoke flow"
```

### Task A11: Ghost hand, moonbeam and the input demo flow

**Files:**
- Modify: `src/ui/ghost-hand.svelte.ts`, `src/ui/moonbeam.svelte.ts`, `src/App.svelte`
- Create: `src/ui/GhostHand.svelte`, `src/ui/Moonbeam.svelte`, `src/platform/PlatformDemo.svelte`, `flows/platform-input.flow.sh`

**Interfaces:**
- Consumes: `Target`, `centreOf`, `rectOf` (A9), `unionRect`, `beamPolygon` (A3), `STAGE_W`, `STAGE_H` (A3), `sleep`, `frame`, `dur` (A4), `onTouch` (A4), `press`, `drag`, `dropTarget` (A9), `registerState` (A4), `setBands` (A9).
- Produces: `ghost.tap`, `ghost.drag`, `ghost.hide`, `ghost.visible`, `ghostTap`, `ghostMove`, `ghostStop`, `moonbeam.show`, `moonbeam.clear`, `moonbeam.rect`; scene `platform-demo` in non-production builds.

- [ ] **Step 1: Write the flow first**

`flows/platform-input.flow.sh`:

```bash
#!/usr/bin/env bash
# Press, drag onto a target, drag to nowhere (glides back), ghost hand shown and hidden by a touch, moonbeam.
. "$(dirname "$0")/lib.sh"
open_app
start_play
hook 'jump("platform-demo")' >/dev/null
wait_for "() => window.__game.state().scene === 'platform-demo'"
tap 'demo button'
expect_eq "$(val '() => window.__game.state().demo.presses')" '1' 'press counted once'
drag_to 'demo token' 'demo target'
expect_eq "$(val '() => window.__game.state().demo.dropped')" 'demo target' 'drop on the target'
drag_by 'demo token' -300 0
wait_for "() => window.__game.state().demo.dropped === 'none'"
expect_eq "$(val '() => document.querySelector("[aria-label=\"demo token\"]").style.translate')" '' 'token back in place'
tap 'demo ghost'
wait_for "() => window.__game.state().ghost === true"
shot ghost
tap 'demo button'
wait_for "() => window.__game.state().ghost === false"
tap 'demo beam'
wait_for "() => window.__game.state().moonbeam !== null"
shot beam
finish
```

Run: `bash games/moon-meadow-home/flows/run.sh platform-input`
Expected: FAIL (`Scene not built: platform-demo`, so `demo button` has no box).

- [ ] **Step 2: Complete the ghost hand**

`src/ui/ghost-hand.svelte.ts`:

```ts
import { centreOf, type Target } from './targets.ts';
import { sleep, frame } from '../platform/timing.ts';
import type { Point } from '../platform/geometry.ts';

export const ghostState = $state({ visible: false, pressed: false, x: 0, y: 0, moveMs: 0 });
let token = 0;

async function place(p: Point): Promise<void> {
  ghostState.moveMs = 0;
  ghostState.x = p.x;
  ghostState.y = p.y;
  await frame();
}

async function glide(p: Point, ms: number, mine: number): Promise<boolean> {
  ghostState.moveMs = ms;
  ghostState.x = p.x;
  ghostState.y = p.y;
  await sleep(ms);
  return mine === token;
}

async function pause(ms: number, mine: number): Promise<boolean> {
  await sleep(ms);
  return mine === token;
}

export const ghost = {
  get visible(): boolean { return ghostState.visible; },

  /** Shows a tap on the target, `times` presses. Never on the answer (spec 2.11 rule 6): the caller picks the target. */
  async tap(target: Target, times = 2): Promise<void> {
    const p = centreOf(target);
    if (!p) return;
    const mine = ++token;
    await place({ x: p.x + 60, y: p.y + 90 });
    ghostState.pressed = false;
    ghostState.visible = true;
    if (!(await glide(p, 600, mine))) return;
    for (let i = 0; i < times; i++) {
      ghostState.pressed = true;
      if (!(await pause(180, mine))) return;
      ghostState.pressed = false;
      if (!(await pause(420, mine))) return;
    }
    ghostState.visible = false;
  },

  /** Shows a drag from one target to another, `times` runs. */
  async drag(from: Target, to: Target, times = 1): Promise<void> {
    const a = centreOf(from);
    const b = centreOf(to);
    if (!a || !b) return;
    const mine = ++token;
    for (let i = 0; i < times; i++) {
      await place(a);
      ghostState.pressed = false;
      ghostState.visible = true;
      if (!(await pause(300, mine))) return;
      ghostState.pressed = true;
      if (!(await pause(200, mine))) return;
      if (!(await glide(b, 900, mine))) return;
      ghostState.pressed = false;
      if (!(await pause(400, mine))) return;
    }
    ghostState.visible = false;
  },

  hide(): void {
    token += 1;
    ghostState.visible = false;
    ghostState.pressed = false;
  },
};

export const ghostTap = (target: Target, times?: number): Promise<void> => ghost.tap(target, times);
export const ghostMove = (from: Target, to: Target, times?: number): Promise<void> => ghost.drag(from, to, times);
export const ghostStop = (): void => ghost.hide();
```

`src/ui/GhostHand.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { ghostState, ghost } from './ghost-hand.svelte.ts';
  import { onTouch } from '../platform/touch.ts';
  import { dur } from '../platform/timing.ts';

  onMount(() => onTouch(() => ghost.hide()));
</script>

<div class="ghost" class:on={ghostState.visible} class:pressed={ghostState.pressed} aria-hidden="true"
  style:translate="{ghostState.x}px {ghostState.y}px" style:transition-duration="{dur(ghostState.moveMs)}ms, 200ms">
  <svg viewBox="0 0 64 96" width="64" height="96">
    <g fill="#ffffff" stroke="#6b4a8a" stroke-width="3" stroke-linejoin="round">
      <rect x="10" y="4" width="13" height="50" rx="6.5" />
      <rect x="22" y="30" width="12" height="30" rx="6" />
      <rect x="33" y="33" width="12" height="28" rx="6" />
      <rect x="44" y="37" width="11" height="26" rx="5.5" />
      <path d="M8 46 Q8 40 14 40 L56 44 Q58 70 50 84 Q44 92 30 92 Q14 92 10 78 Z" />
    </g>
  </svg>
</div>

<style>
  .ghost { position: absolute; left: -16px; top: -4px; z-index: 900; pointer-events: none; opacity: 0;
    transition-property: translate, opacity; transition-timing-function: ease-in-out; }
  .ghost.on { opacity: .92; }
  .ghost svg { display: block; transform-origin: 16px 4px; transition: scale .12s; }
  .ghost.pressed svg { scale: .85; }
</style>
```

- [ ] **Step 3: Complete the moonbeam**

`src/ui/moonbeam.svelte.ts`:

```ts
import { rectOf, type Target } from './targets.ts';
import { unionRect, type Rect } from '../platform/geometry.ts';
import { STAGE_W, STAGE_H } from '../platform/fit.ts';

export const beamState = $state<{ rect: Rect | null }>({ rect: null });

export const moonbeam = {
  get rect(): Rect | null { return beamState.rect; },
  /** Lights one area. Several targets are lit together, so a choice step never points at the answer. */
  show(targets: Target | Target[], pad = 24): void {
    const list = Array.isArray(targets) ? targets : [targets];
    const rects = list.map(rectOf).filter((r): r is Rect => r !== null);
    beamState.rect = unionRect(rects, pad, { x: 0, y: 0, w: STAGE_W, h: STAGE_H });
  },
  clear(): void { beamState.rect = null; },
};
```

`src/ui/Moonbeam.svelte`:

```svelte
<script lang="ts">
  import { beamState } from './moonbeam.svelte.ts';
  import { beamPolygon } from '../platform/geometry.ts';
</script>

{#if beamState.rect}
  {@const r = beamState.rect}
  <div class="beam" aria-hidden="true" style:clip-path={beamPolygon(r)}></div>
  <div class="pool" aria-hidden="true" style:left="{r.x}px" style:top="{r.y + r.h - 30}px" style:width="{r.w}px"></div>
{/if}

<style>
  .beam { position: absolute; inset: 0; z-index: 800; pointer-events: none;
    background: linear-gradient(rgba(255, 250, 214, 0), rgba(255, 250, 214, .42)); animation: glow 2.4s ease-in-out infinite; }
  .pool { position: absolute; height: 60px; z-index: 800; pointer-events: none; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(255, 250, 214, .55), rgba(255, 250, 214, 0)); animation: glow 2.4s ease-in-out infinite; }
  @keyframes glow { 50% { opacity: .6; } }
</style>
```

In `src/App.svelte`, import both and mount them inside `<Stage>` after `<Router />`:

```svelte
  import GhostHand from './ui/GhostHand.svelte';
  import Moonbeam from './ui/Moonbeam.svelte';
```

```svelte
  <Router />
  <Moonbeam />
  <GhostHand />
  <HomeButton />
```

- [ ] **Step 4: Write the demo scene**

`src/platform/PlatformDemo.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { press, drag, dropTarget } from './input.ts';
  import { registerState } from './hooks.ts';
  import { setBands } from './stage.svelte.ts';
  import { ghost } from '../ui/ghost-hand.svelte.ts';
  import { moonbeam } from '../ui/moonbeam.svelte.ts';

  let { params }: { params: Record<string, unknown> } = $props();
  let presses = $state(0);
  let dropped = $state('');

  onMount(() => {
    setBands('#26296b', '#2f6b4f');
    return registerState('demo', () => ({ presses, dropped, params }));
  });
</script>

<div class="demo">
  <button class="btn" aria-label="demo button" use:press={() => { presses += 1; }}>{presses}</button>
  <button class="btn" aria-label="demo ghost" use:press={() => { void ghost.tap('demo target', 3); }}>hand</button>
  <button class="btn" aria-label="demo beam" use:press={() => { moonbeam.show(['demo target', 'demo token']); }}>beam</button>
  <div class="token" role="button" tabindex="-1" aria-label="demo token"
    use:drag={{ data: 'token', onDrop: (i) => { dropped = i.targetId ?? 'none'; } }}></div>
  <div class="target" role="img" aria-label="demo target" use:dropTarget={{ id: 'demo target' }}></div>
</div>

<style>
  .demo { position: absolute; inset: 0; background: linear-gradient(#26296b, #2f6b4f); }
  .btn { position: absolute; top: 40px; width: 120px; height: 80px; border-radius: 20px; background: #fff6fb; font-size: 28px; }
  .btn:nth-child(1) { left: 40px; }
  .btn:nth-child(2) { left: 180px; }
  .btn:nth-child(3) { left: 320px; }
  .token { position: absolute; left: 360px; top: 400px; width: 96px; height: 96px; border-radius: 50%; background: #ff5fae; touch-action: none; }
  .target { position: absolute; left: 800px; top: 380px; width: 160px; height: 140px; border-radius: 30px; border: 6px dashed #ffd25e; }
</style>
```

- [ ] **Step 5: Run the flows**

```sh
npm --prefix games/moon-meadow-home run check
bash games/moon-meadow-home/flows/run.sh platform-smoke platform-input
```

Expected: `flows: 6 passed, 0 failed`. Look at the `ghost` and `beam` screenshots in `$TMPDIR/mmh-shots/`: the hand's fingertip sits on the dashed target, and the beam lights both the token and the target from the top of the stage.

- [ ] **Step 6: Check the production build has no demo**

```sh
npm --prefix games/moon-meadow-home run build
grep -l "demo token" games/moon-meadow-home/dist/assets/*.js || echo "no demo in production"
```

Expected: `no demo in production`.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/src games/moon-meadow-home/flows/platform-input.flow.sh
git commit -m "Add the ghost hand and the moonbeam with a test-only input demo and flow"
```

### Task A12: Moon Meadow Home on the picture menu

**Files:**
- Modify: `index.html` (repo root), `menu-audio/lines.json`
- Create: `menu-audio/menu-moon-meadow-home.mp3` (generated), updated `menu-audio/manifest.json` (generated)

**Interfaces:**
- Consumes: the built app at `/games/moon-meadow-home/` (A9).
- Produces: a menu card `aria-label="Moon Meadow Home"` with `data-href="games/moon-meadow-home/"`, first in the row.

- [ ] **Step 1: Add the menu line**

Add to `menu-audio/lines.json`, after `menu-welcome`:

```json
    {
      "id": "menu-moon-meadow-home",
      "speaker": "narrator",
      "text": "Moon Meadow Home!"
    },
```

- [ ] **Step 2: Generate the clip (about 20 credits)**

Outside the sandbox, from the repo root:

```sh
python3 scripts/generate-audio.py menu-audio/lines.json --only menu-moon-meadow-home --dry-run
python3 scripts/generate-audio.py menu-audio/lines.json --only menu-moon-meadow-home --max-chars 100 --stt
```

Expected: the dry run lists one line of 17 characters; the real run writes `menu-audio/menu-moon-meadow-home.mp3` and the speech-to-text check prints "Moon Meadow Home" (a mismatch is printed, not fatal; regenerate once with `--force` and a `"seed"` on the line if it reads differently).

- [ ] **Step 3: Add the card**

In `index.html`, add the card as the first child of `#cards`:

```html
    <div class="card moon" data-game="moon-meadow-home" data-href="games/moon-meadow-home/" role="button" aria-label="Moon Meadow Home">
      <div class="art moon-art">
        <svg viewBox="0 0 306 400" aria-hidden="true">
          <defs>
            <linearGradient id="mmhSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11163d"/><stop offset=".6" stop-color="#3b2f7a"/><stop offset="1" stop-color="#5a3f9e"/></linearGradient>
          </defs>
          <rect width="306" height="400" fill="url(#mmhSky)"/>
          <circle cx="226" cy="76" r="44" fill="#fffef2"/>
          <circle cx="250" cy="62" r="40" fill="#1f1d55"/>
          <g fill="#fff"><circle class="twk" cx="44" cy="50" r="2.5"/><circle class="twk" cx="120" cy="90" r="2"/><circle class="twk" cx="170" cy="40" r="2.5"/><circle class="twk" cx="80" cy="150" r="2"/></g>
          <path d="M150 120 L196 330" stroke="rgba(255,250,214,.35)" stroke-width="40" stroke-linecap="round"/>
          <path d="M0 270 C90 246 210 252 306 240 L306 400 L0 400 Z" fill="#3c8a5e"/>
          <path d="M0 312 C110 292 220 300 306 288 L306 400 L0 400 Z" fill="#2f6b4f"/>
          <g transform="translate(36 222)">
            <rect x="0" y="34" width="120" height="70" rx="6" fill="#ffd9ec" stroke="#c2468a" stroke-width="4"/>
            <path d="M-8 38 L60 0 L128 38 Z" fill="#ff8fc7" stroke="#c2468a" stroke-width="4" stroke-linejoin="round"/>
            <rect x="14" y="56" width="26" height="48" rx="12" fill="#7a4a1e"/>
            <rect x="47" y="56" width="26" height="48" rx="12" fill="#7a4a1e"/>
            <rect x="80" y="56" width="26" height="48" rx="12" fill="#7a4a1e"/>
          </g>
          <g class="bob" transform="translate(196 286)">
            <ellipse cx="34" cy="40" rx="36" ry="28" fill="#fff3fb" stroke="#ded3da" stroke-width="3"/>
            <circle cx="62" cy="14" r="22" fill="#fff3fb" stroke="#ded3da" stroke-width="3"/>
            <path d="M60 -6 L66 -34 L72 -6 Z" fill="#ffe58a" stroke="#eab243" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="40" cy="4" r="10" fill="#ff7fbf"/><circle cx="34" cy="20" r="9" fill="#9d7bff"/>
            <ellipse class="u-eye" cx="68" cy="12" rx="5" ry="6" fill="#2a1b3d"/>
          </g>
        </svg>
      </div>
      <div class="name">Moon Meadow Home</div>
    </div>
```

Add the card style next to the other card styles:

```css
.card.moon{box-shadow:0 12px 0 #5a3f9e,0 20px 40px rgba(0,0,0,.35)}
.card.moon .name{color:#5a3f9e}
.moon-art .u-eye{transform-box:fill-box;transform-origin:center;animation:eyeBlink 4.5s infinite}
```

Add the clip to `CLIPS`:

```js
const CLIPS = ['menu-welcome', 'menu-moon-meadow-home', 'menu-unicorn-egg-nest', 'menu-pippas-word-wand', 'menu-fluffle-nursery'];
```

Four cards of 330 px do not fit in one landscape row. In `fit()`, after the `rowGap` line, add:

```js
  // Four cards: one row at 80 percent in landscape, two rows of two in portrait.
  const four = cards.length > 3 && !portrait;
  cardsEl.style.flexWrap = four ? 'nowrap' : '';
  cardsEl.style.gap = four ? '30px' : '';
  cardsEl.style.left = four ? '50%' : '';
  cardsEl.style.right = four ? 'auto' : '';
  cardsEl.style.width = four ? '1460px' : '';
  cardsEl.style.transformOrigin = four ? '0 0' : '';
  cardsEl.style.transform = four ? 'translateX(-584px) scale(.8)' : '';
```

`cards` is defined before `fit()` is first called; move the line `const cards = [...document.querySelectorAll('.card')];` above `function fit()` if it is below it.

- [ ] **Step 4: Check the menu at every size**

Outside the sandbox:

```sh
for size in "1180 820" "1080 810" "1024 768" "820 1180"; do
  set -- $size
  playwright-cli -s=menu$1 open http://127.0.0.1:8765/
  playwright-cli -s=menu$1 resize $1 $2
  playwright-cli -s=menu$1 run-code "async page => { const b = await page.getByLabel('Play', { exact: true }).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(1200); }"
  playwright-cli -s=menu$1 screenshot --filename "$TMPDIR/mmh-shots/menu-$1x$2.png"
  playwright-cli -s=menu$1 eval "() => [...document.querySelectorAll('.card')].map(c => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })"
  playwright-cli -s=menu$1 eval "() => window.EmmaAudio.missing"
  playwright-cli -s=menu$1 close
done
```

Expected: every card is inside the screen (`[true,true,true,true]`) at each size, `missing` is `[]`, and the screenshots show the Moon Meadow Home card first. Then tap the card in one session and check that the URL becomes `http://127.0.0.1:8765/games/moon-meadow-home/`.

- [ ] **Step 5: Commit**

```bash
git add index.html menu-audio/lines.json menu-audio/manifest.json menu-audio/menu-moon-meadow-home.mp3
git commit -m "Add Moon Meadow Home to the picture menu with its spoken name"
```

### Task A13: Docs, game README and the iPad check

**Files:**
- Create: `games/moon-meadow-home/README.md`
- Modify: `AGENTS.md`, `STACK.md`, `IDEAS.md` (repo root)

**Interfaces:**
- Consumes: every Wave A task.
- Produces: docs that tell agents and Tjitse how to build, test and serve the game.

- [ ] **Step 1: Write `games/moon-meadow-home/README.md`**

```markdown
# Moon Meadow Home

Unicorn Egg Nest v3. Spec: [docs/v3/spec.md](../../docs/v3/spec.md). Decisions: [docs/v3/decisions.md](../../docs/v3/decisions.md). Plans: [docs/v3/plan/](../../docs/v3/plan/).

Svelte 5 + Vite + TypeScript on the DOM, a fixed 1180 x 820 stage, audio through [shared/audio.js](../../shared/audio.js).

## Commands

Run from the repo root.

| Command | What it does |
|---|---|
| `npm --prefix games/moon-meadow-home install` | Install the pinned dependencies. |
| `npm --prefix games/moon-meadow-home run build` | Build Emma's version into `dist/`. |
| `npm --prefix games/moon-meadow-home run build:test` | Build the test version (with `window.__game`) into `dist-test/`. |
| `npm --prefix games/moon-meadow-home test` | Vitest. |
| `npm --prefix games/moon-meadow-home run check` | Type check and stale clip id check. |
| `npm --prefix games/moon-meadow-home run serve` | Serve the whole repo and the save API on port 8765 for the home network. |
| `npm --prefix games/moon-meadow-home run flows` | Build the test version, serve it on port 8766 and run every playwright-cli flow at three iPad sizes (outside the sandbox). |
| `npm --prefix games/moon-meadow-home run server:pair` | Make a pairing code for a device (Wave C). |

## Playing on the iPad

1. On the Mac: `npm --prefix games/moon-meadow-home run build`, then `npm --prefix games/moon-meadow-home run serve`. Allow incoming connections for `node` if macOS asks.
2. On the iPad, in Safari: `http://<LocalHostName>.local:8765/`, where `<LocalHostName>` is the output of `scutil --get LocalHostName` on the Mac. Tap the Moon Meadow Home card.
3. Use the same address as v2. v3 reads Emma's v2 herd from this origin's storage, so a different host name or port shows an empty herd.
4. Play in a Safari tab for now. A home-screen icon has its own, empty storage.

## Folders

| Folder | What is in it |
|---|---|
| `src/platform/` | Stage, router, input, timing, clock, ids, hooks, Play gate. |
| `src/ui/` | Shared interaction parts, including the ghost hand and the moonbeam. |
| `src/audio/` | Typed facade over `shared/audio.js`; `clip-ids.generated.ts` is generated by `tools/gen-clip-ids.ts`. |
| `src/scenes/`, `src/<folder>/scenes.ts` | Scenes. A file `src/scenes/BathPond.svelte` is scene `bath-pond`. |
| `public/audio/<pack>/` | Clip packs made by `scripts/generate-audio.py`. |
| `public/phonics/` | Copied from `shared/audio/phonics/` at build time. Not in git. |
| `server/` | The Node server: static files, the save API, the admin CLI and the odin deploy files. |
| `flows/` | playwright-cli flows (`*.flow.sh`) and their helpers. |
| `tests/` | Vitest suites. |
```

- [ ] **Step 2: Update `AGENTS.md`**

After the rule "Every idea lives in `ideas/<idea-slug>/` ...", add:

```markdown
- A game chosen for a real build lives in `games/<slug>/` with its own `package.json`, tests and README. Moon Meadow Home (v3) is [games/moon-meadow-home/](games/moon-meadow-home/). Its row in IDEAS.md links there.
- Serve the repo with `npm --prefix games/moon-meadow-home run serve` (port 8765: the whole repo, the built v3 and its save API). Never use `python3 -m http.server`: it also serves `.env` to the home network.
```

- [ ] **Step 3: Update `STACK.md`**

Replace the code block in "Testing" with:

````markdown
`playwright-cli` blocks `file:` URLs, so serve the repo over HTTP first. The Node server in `games/moon-meadow-home/server/` serves the whole repo (and never dot files such as `.env`):

```sh
npm --prefix games/moon-meadow-home run serve &      # port 8765, outside the sandbox
playwright-cli open http://127.0.0.1:8765/ideas/<idea-slug>/index.html
playwright-cli screenshot --filename "$TMPDIR/shot.png"
playwright-cli resize 820 1180   # portrait check
playwright-cli close
```

Moon Meadow Home has scripted flows: `npm --prefix games/moon-meadow-home run flows` (see its README).
````

Add a section before "Deployment":

```markdown
## Games with a build (`games/`)

- Chosen games move from `ideas/` to `games/<slug>/`: Vite 8.3.4 + Svelte 5.57.2 + TypeScript 6.0.3, exact versions, lock file committed. Moon Meadow Home is the first.
- The build uses a relative base, so `dist/` works at any path. It targets Safari 15 (iPad Air 2).
- Unit tests run with Vitest. Browser checks use the flows in `games/<slug>/flows/`.
- Sound still goes through `shared/audio.js`, bundled into the game. Clip packs live in `games/<slug>/public/audio/<pack>/`.
```

Replace the "Deployment" section with:

```markdown
## Deployment

- Now: Tjitse's Mac serves the repo on the home network with `npm --prefix games/moon-meadow-home run serve` (port 8765). Emma opens `http://<LocalHostName>.local:8765/` in Safari. v2 and v3 share that origin, so v3 can read the v2 herd.
- Plain http has no service worker and no `navigator.storage.persist()`. The game works without them and uses them on HTTPS.
- Later: odin.vendic.cloud over HTTPS at `/unicorns/`. Agents do not deploy there; the deploy note is [docs/v3/deploy-odin.md](docs/v3/deploy-odin.md) (Wave C).
```

- [ ] **Step 4: Update `IDEAS.md`**

Add a row at the end of the table:

```markdown
| opus-5-5: Moon Meadow Home (v3) | [games/moon-meadow-home](games/moon-meadow-home/) | Spell the babies' names, read wishes (with plurals), label jars | Warm eggs with number stones (bonds to 10), door numbers | building | |
```

After the "Status values" line, add: `Games with status building live in games/<slug>/ instead of ideas/.`

- [ ] **Step 5: Final Wave A check on the real address**

```sh
npm --prefix games/moon-meadow-home test
npm --prefix games/moon-meadow-home run check
npm --prefix games/moon-meadow-home run build
bash games/moon-meadow-home/flows/run.sh
curl -s -o /dev/null -w '%{http_code}\n' "http://$(scutil --get LocalHostName).local:8765/games/moon-meadow-home/"
```

Expected: all tests pass, 0 type errors, every flow passes at three sizes, and `200` from the LAN address. Report the exact iPad URL (`http://<LocalHostName>.local:8765/`) to the lead.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md STACK.md IDEAS.md games/moon-meadow-home/README.md
git commit -m "Document the games folder, the Node server and how Emma plays v3 on the iPad"
```

---

## Wave B: release 1.1 platform support (items 14 to 19)

### Task B1: Home-screen app, service worker on HTTPS and offline checks

**Files:**
- Modify: `vite.config.ts`, `src/platform/pwa.ts`, `src/main.ts`, `package.json` (vite-plugin-pwa)
- Create: `src/platform/offline.ts`, `tools/make-icons.py`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png`, `flows/platform-offline.flow.sh`
- Test: `tests/platform/pwa.test.ts` (extend)

**Interfaces:**
- Consumes: `platformStatus`, `requestPersist` (A9).
- Produces: `canUseServiceWorker(env: { secure: boolean; hasSW: boolean; mode: string; search: string }): boolean`, `registerServiceWorker(): Promise<'registered' | 'skipped' | 'failed'>`, `isOnline(): boolean`, `isCached(url: string): Promise<boolean>`. `dist/sw.js` and `dist/manifest.webmanifest`.

- [ ] **Step 1: Write the failing test**

Append to `tests/platform/pwa.test.ts`:

```ts
import { canUseServiceWorker } from '../../src/platform/pwa.ts';

describe('canUseServiceWorker', () => {
  it('is off on plain http on the home network', () => {
    expect(canUseServiceWorker({ secure: false, hasSW: false, mode: 'production', search: '' })).toBe(false);
  });
  it('is on for production over HTTPS or localhost', () => {
    expect(canUseServiceWorker({ secure: true, hasSW: true, mode: 'production', search: '' })).toBe(true);
  });
  it('is off in test builds unless the URL asks for it', () => {
    expect(canUseServiceWorker({ secure: true, hasSW: true, mode: 'test', search: '' })).toBe(false);
    expect(canUseServiceWorker({ secure: true, hasSW: true, mode: 'test', search: '?sw=1' })).toBe(true);
  });
  it('is off when the browser has no service worker', () => {
    expect(canUseServiceWorker({ secure: true, hasSW: false, mode: 'production', search: '' })).toBe(false);
  });
});
```

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/pwa.test.ts`
Expected: FAIL, `canUseServiceWorker` is not exported.

- [ ] **Step 2: Implement in `src/platform/pwa.ts`**

Append:

```ts
export function canUseServiceWorker(env: { secure: boolean; hasSW: boolean; mode: string; search: string }): boolean {
  if (!env.secure || !env.hasSW) return false;
  if (env.mode === 'production') return true;
  return new URLSearchParams(env.search).has('sw');
}

/** Registers ./sw.js when allowed. A new version waits for the next start (no skipWaiting). */
export async function registerServiceWorker(): Promise<'registered' | 'skipped' | 'failed'> {
  const ok = canUseServiceWorker({
    secure: window.isSecureContext,
    hasSW: 'serviceWorker' in navigator,
    mode: import.meta.env.MODE,
    search: location.search,
  });
  if (!ok) { platformStatus.sw = 'skipped'; return 'skipped'; }
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
    platformStatus.sw = 'registered';
    return 'registered';
  } catch (e) {
    console.warn('[pwa] service worker failed', e);
    platformStatus.sw = 'failed';
    return 'failed';
  }
}
```

`src/platform/offline.ts`:

```ts
export const isOnline = (): boolean => (typeof navigator === 'undefined' ? true : navigator.onLine);

/** True when the service worker cache holds the url. Always false on plain http (no caches API). */
export async function isCached(url: string): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    return (await caches.match(new URL(url, document.baseURI).href)) !== undefined;
  } catch {
    return false;
  }
}
```

In `src/main.ts`, add after the `mount` line:

```ts
import { registerServiceWorker } from './platform/pwa.ts';
void registerServiceWorker();
```

(Put the import with the other imports.)

Run the tests. Expected: all pass.

- [ ] **Step 3: Icons**

`tools/make-icons.py`:

```python
#!/usr/bin/env python3
"""Draw the Moon Meadow Home home-screen icons (a moon over a meadow) with Pillow.

Run from the repo root: python3 games/moon-meadow-home/tools/make-icons.py
The art workstream may replace the files later with the same names and sizes.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'


def draw(size: int) -> Image.Image:
    s = size / 512
    im = Image.new('RGB', (size, size), (17, 22, 61))
    d = ImageDraw.Draw(im)
    d.ellipse([-80 * s, 330 * s, 592 * s, 760 * s], fill=(60, 138, 94))
    d.ellipse([-40 * s, 400 * s, 552 * s, 800 * s], fill=(47, 107, 79))
    d.ellipse([290 * s, 70 * s, 440 * s, 220 * s], fill=(255, 250, 214))
    d.ellipse([330 * s, 52 * s, 470 * s, 192 * s], fill=(17, 22, 61))
    for x, y, r in [(90, 90, 7), (170, 150, 5), (240, 70, 6), (120, 240, 5), (220, 210, 4)]:
        d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=(255, 255, 255))
    d.polygon([(236 * s, 330 * s), (256 * s, 230 * s), (276 * s, 330 * s)], fill=(255, 229, 138), outline=(234, 178, 67))
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180)]:
        draw(size).save(OUT / name)
        print(f'wrote {OUT / name}')


if __name__ == '__main__':
    main()
```

Run: `python3 games/moon-meadow-home/tools/make-icons.py` and look at `public/icons/icon-512.png` with the Read tool. Expected: a crescent moon top right, stars, a golden horn on a green hill.

Add to `index.html` in `<head>`:

```html
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
```

- [ ] **Step 4: Install and configure vite-plugin-pwa**

```sh
npm --prefix games/moon-meadow-home install --save-exact --save-dev vite-plugin-pwa@1.3.0
```

If npm refuses with `ERESOLVE` on the Vite peer range, rerun with `--legacy-peer-deps`, note that in the README "Commands" section, and continue; Step 6 proves the plugin works with Vite 8.

In `vite.config.ts`:

```ts
import { VitePWA } from 'vite-plugin-pwa';
```

and replace `plugins: [svelte()],` with:

```ts
  plugins: [
    svelte(),
    VitePWA({
      injectRegister: false,
      registerType: 'prompt',
      filename: 'sw.js',
      manifest: {
        name: 'Moon Meadow Home',
        short_name: 'Moon Meadow',
        lang: 'en-GB',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#11163d',
        theme_color: '#11163d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,webmanifest}', 'icons/*.png', 'phonics/*.{mp3,json}', 'audio/core/*.{mp3,json}', 'art/manifest.json', 'art/meadow/**/*.{webp,png}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: null,
        ignoreURLParametersMatching: [/^utm_/, /^sw$/],
        runtimeCaching: [
          { urlPattern: ({ url }) => /\/audio\/names-[^/]+\/manifest\.json$/.test(url.pathname), handler: 'NetworkFirst', options: { cacheName: 'name-manifests' } },
          { urlPattern: ({ url }) => /\/audio\/[^/]+\/[^/]+\.(mp3|json)$/.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'audio' } },
          { urlPattern: ({ url }) => /\/art\//.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'art' } },
          { urlPattern: ({ url }) => /\/api\//.test(url.pathname), handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
```

- [ ] **Step 5: Write `flows/platform-offline.flow.sh`**

```bash
#!/usr/bin/env bash
# On 127.0.0.1 (a secure context) the test build registers the service worker with ?sw=1,
# then the app reloads and starts with the network off.
. "$(dirname "$0")/lib.sh"
MMH_URL="${MMH_URL}?sw=1"
open_app
val "async () => { await navigator.serviceWorker.ready; return 'ready'; }" >/dev/null || fail 'service worker not ready'
pw reload >/dev/null
wait_for "() => !!navigator.serviceWorker.controller"
pw network-state-set offline >/dev/null
pw reload >/dev/null
wait_for "() => window.__game"
hook 'fast(true)' >/dev/null
start_play
pw network-state-set online >/dev/null
finish
```

- [ ] **Step 6: Build and run**

```sh
npm --prefix games/moon-meadow-home run build
ls games/moon-meadow-home/dist/sw.js games/moon-meadow-home/dist/manifest.webmanifest
bash games/moon-meadow-home/flows/run.sh platform-smoke platform-input platform-offline
```

Expected: both files exist; `flows: 9 passed, 0 failed`. The LAN smoke run from Task A10 Step 6 still passes (no service worker on plain http, no error).

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/vite.config.ts games/moon-meadow-home/package.json games/moon-meadow-home/package-lock.json games/moon-meadow-home/index.html games/moon-meadow-home/src games/moon-meadow-home/tools/make-icons.py games/moon-meadow-home/public/icons games/moon-meadow-home/flows/platform-offline.flow.sh games/moon-meadow-home/tests games/moon-meadow-home/README.md
git commit -m "Add the home-screen manifest, icons and a service worker that only runs on HTTPS"
```

### Task B2: At most three full backgrounds decoded

**Files:**
- Create: `src/platform/images.ts`
- Test: `tests/platform/images.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `class Lru<K> { constructor(max: number); touch(k: K): K[]; has(k: K): boolean; size: number }`, `FULL_BACKGROUNDS = 3`, `useBackground(url: string): Promise<string>`, `preloadImages(urls: string[]): Promise<string[]>` (resolves with the urls that failed).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Lru } from '../../src/platform/images.ts';

describe('Lru', () => {
  it('evicts the least recently used key past the limit', () => {
    const l = new Lru<string>(3);
    expect(l.touch('meadow')).toEqual([]);
    expect(l.touch('nest')).toEqual([]);
    expect(l.touch('stalls')).toEqual([]);
    expect(l.touch('meadow')).toEqual([]);
    expect(l.touch('salon')).toEqual(['nest']);
    expect(l.has('meadow')).toBe(true);
    expect(l.size).toBe(3);
  });
});
```

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/images.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement `src/platform/images.ts`**

```ts
export class Lru<K> {
  #max: number;
  #keys: K[] = [];

  constructor(max: number) {
    this.#max = Math.max(1, max);
  }

  /** Marks k as used now. Returns the keys that fell out. */
  touch(k: K): K[] {
    const i = this.#keys.indexOf(k);
    if (i >= 0) this.#keys.splice(i, 1);
    this.#keys.push(k);
    return this.#keys.length > this.#max ? this.#keys.splice(0, this.#keys.length - this.#max) : [];
  }

  has(k: K): boolean { return this.#keys.includes(k); }
  get size(): number { return this.#keys.length; }
}

/** Spec 5.2: at most three full 2360 x 1640 backgrounds decoded at once (about 46 MB). */
export const FULL_BACKGROUNDS = 3;
const decoded = new Map<string, HTMLImageElement>();
const lru = new Lru<string>(FULL_BACKGROUNDS);

/** Decodes a full background before a scene shows it and lets the oldest one go. */
export async function useBackground(url: string): Promise<string> {
  for (const old of lru.touch(url)) {
    const img = decoded.get(old);
    if (img) { img.src = ''; decoded.delete(old); }
  }
  if (!decoded.has(url)) {
    const img = new Image();
    img.src = url;
    decoded.set(url, img);
    try { await img.decode(); } catch { console.warn(`[art] cannot decode ${url}`); }
  }
  return url;
}

/** Fetches and decodes small images (items, word pictures). Resolves with the urls that failed. */
export async function preloadImages(urls: string[]): Promise<string[]> {
  const failed: string[] = [];
  await Promise.all(urls.map(async (u) => {
    const img = new Image();
    img.src = u;
    try { await img.decode(); } catch { failed.push(u); }
  }));
  return failed;
}
```

- [ ] **Step 3: Run the test and see it pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/platform/images.test.ts`
Expected: 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/src/platform/images.ts games/moon-meadow-home/tests/platform/images.test.ts
git commit -m "Keep at most three full backgrounds decoded at once"
```

### Task B3: Unknown names from an event log

**Files:**
- Create: `server/unknown-names.ts`
- Test: `tests/server/unknown-names.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type UnknownName = { name: string; gems: string[]; phonemes: string; firstSeen: number; count: number }`, `collectUnknownNames(events: ReadonlyArray<Record<string, unknown>>): UnknownName[]`, `eventsFromExport(json: unknown): Record<string, unknown>[]`. Used by `tools/pull-unknown-names.ts` (names workstream, release 1.1 item 19) and by `api/admin/unknown-names` (Task C3).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { collectUnknownNames, eventsFromExport } from '../../server/unknown-names.ts';

const built = (gems: string[], outcome: string, t: number, phonemes = 't a m o') => ({ id: `d:${t}`, type: 'name.built', gems, phonemes, route: 'gold', outcome, t });

describe('collectUnknownNames', () => {
  it('groups unknown builds by name, counts them and keeps the first time', () => {
    const out = collectUnknownNames([
      built(['T', 'a', 'm', 'o'], 'unknown', 200),
      built(['t', 'a', 'm', 'o'], 'unknown', 100),
      built(['L', 'i', 'l', 'y'], 'list', 50),
      built(['f', 'u', 'k'], 'blocked', 60),
      { id: 'x', type: 'egg.hatched', t: 10 },
    ]);
    expect(out).toEqual([{ name: 'Tamo', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o', firstSeen: 100, count: 2 }]);
  });
  it('accepts phonemes as a list', () => {
    const out = collectUnknownNames([{ type: 'name.built', gems: ['Z', 'u', 'b'], phonemes: ['z', 'u', 'b'], outcome: 'unknown', t: 5 }]);
    expect(out[0].phonemes).toBe('z u b');
  });
});

describe('eventsFromExport', () => {
  it('reads a save export and refuses anything else', () => {
    expect(eventsFromExport({ format: 'moon-meadow-save', v: 1, exportedAt: 0, events: [{ id: 'a' }] })).toEqual([{ id: 'a' }]);
    expect(() => eventsFromExport({ herd: [] })).toThrow('not a moon-meadow-save export');
  });
});
```

Run: `npm --prefix games/moon-meadow-home test -- tests/server/unknown-names.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement `server/unknown-names.ts`**

```ts
export type UnknownName = { name: string; gems: string[]; phonemes: string; firstSeen: number; count: number };

/** Names Emma built with the gold bell that are not on the list (name.built with outcome unknown). */
export function collectUnknownNames(events: ReadonlyArray<Record<string, unknown>>): UnknownName[] {
  const byKey = new Map<string, UnknownName>();
  for (const e of events) {
    if (e.type !== 'name.built' || e.outcome !== 'unknown' || !Array.isArray(e.gems)) continue;
    const raw = e.gems.filter((g): g is string => typeof g === 'string');
    if (raw.length === 0) continue;
    const joined = raw.join('');
    const key = joined.toLowerCase();
    const t = typeof e.t === 'number' ? e.t : 0;
    const phonemes = typeof e.phonemes === 'string' ? e.phonemes : Array.isArray(e.phonemes) ? e.phonemes.map(String).join(' ') : '';
    const cur = byKey.get(key);
    if (cur) {
      cur.count += 1;
      if (t < cur.firstSeen) { cur.firstSeen = t; cur.gems = raw.map((g) => g.toLowerCase()); cur.phonemes = phonemes || cur.phonemes; }
    } else {
      byKey.set(key, { name: key.charAt(0).toUpperCase() + key.slice(1), gems: raw.map((g) => g.toLowerCase()), phonemes, firstSeen: t, count: 1 });
    }
  }
  return [...byKey.values()].sort((a, b) => a.firstSeen - b.firstSeen || a.name.localeCompare(b.name));
}

export function eventsFromExport(json: unknown): Record<string, unknown>[] {
  const j = json as { format?: unknown; events?: unknown } | null;
  if (j && j.format === 'moon-meadow-save' && Array.isArray(j.events)) return j.events as Record<string, unknown>[];
  throw new Error('not a moon-meadow-save export');
}
```

- [ ] **Step 3: Run the test and see it pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/server/unknown-names.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/server/unknown-names.ts games/moon-meadow-home/tests/server/unknown-names.test.ts
git commit -m "Collect the names Emma invented from an event log or a save export"
```

### Task B4: Flow helpers for several visits

**Files:**
- Modify: `flows/lib.sh`
- Create: `flows/platform-visits.flow.sh`

**Interfaces:**
- Consumes: `setNow` hook persistence (A10).
- Produces: `reload_app` and `advance_hours <n>` in `flows/lib.sh`, for multi-day flows (placement, opening queue, Leitner reviews).

- [ ] **Step 1: Write the flow**

`flows/platform-visits.flow.sh`:

```bash
#!/usr/bin/env bash
# A set clock survives a reload in the same tab, and advance_hours moves it forward.
. "$(dirname "$0")/lib.sh"
open_app
hook 'setNow(1792396800000)' >/dev/null   # 2026-10-19 08:00 UTC
reload_app
[ "$(val '() => window.__game.state().now >= 1792396800000 && window.__game.state().now < 1792396860000')" = true ] || fail 'clock kept after reload'
advance_hours 26
[ "$(val '() => window.__game.state().now >= 1792490400000')" = true ] || fail 'clock moved 26 hours'
finish
```

Run: `bash games/moon-meadow-home/flows/run.sh platform-visits`
Expected: FAIL, `reload_app: command not found`.

- [ ] **Step 2: Add the helpers to `flows/lib.sh`**

```bash
# Reload the page in the same tab (IndexedDB, sessionStorage and the test clock stay).
reload_app() {
  pw reload >/dev/null
  wait_for "() => window.__game"
  hook 'fast(true)' >/dev/null
}

# Move the game clock forward by n hours.
advance_hours() {
  hook "setNow(window.__game.state().now + ($1) * 3600000)" >/dev/null
}
```

- [ ] **Step 3: Run it and see it pass**

Run: `bash games/moon-meadow-home/flows/run.sh platform-visits`
Expected: `flows: 3 passed, 0 failed`.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/flows/lib.sh games/moon-meadow-home/flows/platform-visits.flow.sh
git commit -m "Add flow helpers to reload the app and move the game clock across visits"
```

---

## Wave C: releases 1.2 and 1.3 platform support (items 20 to 26): the save server

### Task C1: Append-only family event log

**Files:**
- Create: `server/store.ts`
- Test: `tests/server/store.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type StoredEvent = { seq: number; from: string; at: number; e: { id: string; [k: string]: unknown } }`, `class FamilyLog { constructor(dataDir: string, family: string); load(): Promise<void>; append(from: string, events: StoredEvent['e'][], now: number): Promise<{ added: number; duplicates: number }>; since(after: number, excludeFrom: string, limit: number): { events: StoredEvent['e'][]; cursor: number; more: boolean }; cursor: number; has(id: string): boolean; all(): StoredEvent['e'][] }`, `localDay(ms: number): string`, `checkFamily(name: string): void`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, appendFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FamilyLog, localDay } from '../../server/store.ts';

let dir = '';
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), 'mmh-store-')); });

const ev = (id: string) => ({ id, v: 1, type: 'test', t: 0 });
const DAY1 = new Date(2026, 9, 12, 20, 0).getTime();
const DAY2 = new Date(2026, 9, 13, 9, 0).getTime();
const file = () => path.join(dir, 'families', 'emma', 'events.jsonl');

describe('FamilyLog', () => {
  it('appends, ignores duplicates by id and survives a restart', async () => {
    const log = new FamilyLog(dir, 'emma');
    await log.load();
    expect(await log.append('aaaaaaaa', [ev('a:1'), ev('a:2')], DAY1)).toEqual({ added: 2, duplicates: 0 });
    expect(await log.append('bbbbbbbb', [ev('a:2'), ev('b:1')], DAY1)).toEqual({ added: 1, duplicates: 1 });
    expect(log.cursor).toBe(3);
    const again = new FamilyLog(dir, 'emma');
    await again.load();
    expect(again.all().map((e) => e.id)).toEqual(['a:1', 'a:2', 'b:1']);
  });

  it('pages by cursor and leaves out the asking device', async () => {
    const log = new FamilyLog(dir, 'emma');
    await log.load();
    await log.append('aaaaaaaa', [1, 2, 3, 4, 5].map((n) => ev(`a:${n}`)), DAY1);
    await log.append('bbbbbbbb', [ev('b:1')], DAY1);
    expect(log.since(0, 'aaaaaaaa', 3)).toEqual({ events: [], cursor: 3, more: true });
    expect(log.since(3, 'aaaaaaaa', 3)).toEqual({ events: [ev('b:1')], cursor: 6, more: false });
    expect(log.since(99, 'cccccccc', 10)).toEqual({ events: [], cursor: 6, more: false });
  });

  it('drops a torn last line after a power cut and appends cleanly after it', async () => {
    const log = new FamilyLog(dir, 'emma');
    await log.load();
    await log.append('aaaaaaaa', [ev('a:1')], DAY1);
    await appendFile(file(), '{"seq":2,"from":"aaaaaaaa","e":{"id":"a:');
    const again = new FamilyLog(dir, 'emma');
    await again.load();
    expect(again.cursor).toBe(1);
    await again.append('aaaaaaaa', [ev('a:2')], DAY1);
    const third = new FamilyLog(dir, 'emma');
    await third.load();
    expect(third.all().map((e) => e.id)).toEqual(['a:1', 'a:2']);
    expect((await readFile(file(), 'utf8')).endsWith('\n')).toBe(true);
  });

  it('copies the log at the first write of each day and keeps 30 copies', async () => {
    const log = new FamilyLog(dir, 'emma');
    await log.load();
    await log.append('aaaaaaaa', [ev('a:1')], DAY1);
    await log.append('aaaaaaaa', [ev('a:2')], DAY2);
    const copy = await readFile(path.join(dir, 'families', 'emma', 'daily', `events-${localDay(DAY2)}.jsonl`), 'utf8');
    expect(copy.trim().split('\n')).toHaveLength(1);
    for (let d = 1; d <= 35; d++) await log.append('aaaaaaaa', [ev(`a:x${d}`)], DAY2 + d * 86_400_000);
    expect((await readdir(path.join(dir, 'families', 'emma', 'daily'))).length).toBe(30);
  });

  it('refuses a family name that could leave the data folder', () => {
    expect(() => new FamilyLog(dir, '../x')).toThrow('bad family name');
  });

  it('uses the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 2, 23, 59).getTime())).toBe('2026-01-02');
  });
});
```

Run: `npm --prefix games/moon-meadow-home test -- tests/server/store.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement `server/store.ts`**

```ts
import { mkdir, readFile, writeFile, open, readdir, copyFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

export type StoredEvent = { seq: number; from: string; at: number; e: { id: string; [k: string]: unknown } };

export function checkFamily(name: string): void {
  if (!/^[a-z0-9-]{1,32}$/.test(name)) throw new Error('bad family name');
}

const pad = (n: number): string => String(n).padStart(2, '0');
export function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const KEEP_DAILY = 30;

/** One family's append-only log: events.jsonl (fsync per write) and daily copies. */
export class FamilyLog {
  readonly family: string;
  readonly dir: string;
  #events: StoredEvent[] = [];
  #ids = new Set<string>();
  #chain: Promise<unknown> = Promise.resolve();
  #lastDay: string | null = null;

  constructor(dataDir: string, family: string) {
    checkFamily(family);
    this.family = family;
    this.dir = path.join(dataDir, 'families', family);
  }

  get file(): string { return path.join(this.dir, 'events.jsonl'); }
  get cursor(): number { return this.#events.length; }
  has(id: string): boolean { return this.#ids.has(id); }
  all(): StoredEvent['e'][] { return this.#events.map((s) => s.e); }

  async load(): Promise<void> {
    await mkdir(path.join(this.dir, 'daily'), { recursive: true });
    let text = '';
    try {
      text = await readFile(this.file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    if (text && !text.endsWith('\n')) {
      const keep = text.slice(0, text.lastIndexOf('\n') + 1);
      console.warn(`[store] ${this.family}: dropped a torn last line (${text.length - keep.length} bytes)`);
      await writeFile(this.file, keep);
      text = keep;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const s = JSON.parse(line) as StoredEvent;
        if (!s.e || typeof s.e.id !== 'string' || this.#ids.has(s.e.id)) continue;
        this.#events.push(s);
        this.#ids.add(s.e.id);
      } catch {
        console.warn(`[store] ${this.family}: skipped a line that is not JSON`);
      }
    }
  }

  append(from: string, events: StoredEvent['e'][], now: number): Promise<{ added: number; duplicates: number }> {
    const run = async (): Promise<{ added: number; duplicates: number }> => {
      const fresh: StoredEvent[] = [];
      let duplicates = 0;
      for (const e of events) {
        if (this.#ids.has(e.id) || fresh.some((f) => f.e.id === e.id)) { duplicates += 1; continue; }
        fresh.push({ seq: this.#events.length + fresh.length + 1, from, at: now, e });
      }
      if (fresh.length === 0) return { added: 0, duplicates };
      await this.#dailyCopy(localDay(now));
      const fh = await open(this.file, 'a');
      try {
        await fh.appendFile(fresh.map((s) => JSON.stringify(s)).join('\n') + '\n');
        await fh.sync();
      } finally {
        await fh.close();
      }
      for (const s of fresh) { this.#events.push(s); this.#ids.add(s.e.id); }
      return { added: fresh.length, duplicates };
    };
    const p = this.#chain.then(run, run);
    this.#chain = p.catch(() => undefined);
    return p;
  }

  since(after: number, excludeFrom: string, limit: number): { events: StoredEvent['e'][]; cursor: number; more: boolean } {
    const start = Math.max(0, Math.min(after, this.#events.length));
    const slice = this.#events.slice(start, start + limit);
    const cursor = start + slice.length;
    return { events: slice.filter((s) => s.from !== excludeFrom).map((s) => s.e), cursor, more: cursor < this.#events.length };
  }

  async #dailyCopy(day: string): Promise<void> {
    if (this.#lastDay === day) return;
    this.#lastDay = day;
    const target = path.join(this.dir, 'daily', `events-${day}.jsonl`);
    const exists = async (f: string): Promise<boolean> => stat(f).then(() => true, () => false);
    if (!(await exists(this.file)) || (await exists(target))) return;
    await copyFile(this.file, target);
    const copies = (await readdir(path.join(this.dir, 'daily'))).filter((f) => /^events-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort();
    for (const old of copies.slice(0, Math.max(0, copies.length - KEEP_DAILY))) {
      await rm(path.join(this.dir, 'daily', old), { force: true });
    }
  }
}
```

- [ ] **Step 3: Run the test and see it pass**

Run: `npm --prefix games/moon-meadow-home test -- tests/server/store.test.ts`
Expected: 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/server/store.ts games/moon-meadow-home/tests/server/store.test.ts
git commit -m "Add the server's append-only family event log with daily copies"
```

### Task C2: Pairing codes, device tokens, rate limits and the admin CLI

**Files:**
- Create: `server/tokens.ts`, `server/ratelimit.ts`, `server/admin.ts`
- Test: `tests/server/auth.test.ts`

**Interfaces:**
- Consumes: `checkFamily` (C1).
- Produces: `sha256(s: string): string`, `PAIR_CODE_MS = 900_000`, `type TokenRecord = { family: string; dev: string; created: number; revoked?: number }`, `class Auth { constructor(dataDir); createPairCode(family, now): Promise<string>; redeem(code, dev, now): Promise<{ token: string; family: string } | null>; check(token): Promise<TokenRecord | null>; revoke(dev, now): Promise<number>; listDevices(): Promise<TokenRecord[]>; createAdminToken(): Promise<string>; checkAdmin(token): Promise<boolean>; deleteFamily(family): Promise<void> }`, `class RateLimiter { constructor(limit, windowMs); hit(key, now): boolean }`, `class FailureLimiter { constructor(maxFails, windowMs, blockMs); blocked(key, now): boolean; fail(key, now): void }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Auth } from '../../server/tokens.ts';
import { RateLimiter, FailureLimiter } from '../../server/ratelimit.ts';

let dir = '';
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), 'mmh-auth-')); });
const T0 = Date.UTC(2026, 9, 12, 18);

describe('Auth', () => {
  it('a pairing code works once and gives a token for its family', async () => {
    const auth = new Auth(dir);
    const code = await auth.createPairCode('emma', T0);
    expect(code).toMatch(/^\d{6}$/);
    const r = await auth.redeem(code, 'abcdefgh', T0 + 1000);
    expect(r?.family).toBe('emma');
    expect(r?.token).toMatch(/^[0-9a-f]{64}$/);
    expect(await auth.redeem(code, 'zzzzzzzz', T0 + 2000)).toBeNull();
    expect(await auth.check(r!.token)).toMatchObject({ family: 'emma', dev: 'abcdefgh' });
  });

  it('a code expires after 15 minutes', async () => {
    const auth = new Auth(dir);
    const code = await auth.createPairCode('test', T0);
    expect(await auth.redeem(code, 'abcdefgh', T0 + 15 * 60_000 + 1)).toBeNull();
  });

  it('refuses a malformed device id', async () => {
    const auth = new Auth(dir);
    const code = await auth.createPairCode('emma', T0);
    expect(await auth.redeem(code, 'ABC', T0)).toBeNull();
  });

  it('stores only hashes of codes and tokens', async () => {
    const auth = new Auth(dir);
    const code = await auth.createPairCode('emma', T0);
    const r = await auth.redeem(code, 'abcdefgh', T0);
    const files = (await readFile(path.join(dir, 'tokens.json'), 'utf8')) + (await readFile(path.join(dir, 'pair-codes.json'), 'utf8'));
    expect(files).not.toContain(r!.token);
    expect(files).not.toContain(`"${code}"`);
  });

  it('a revoked device is refused', async () => {
    const auth = new Auth(dir);
    const r = await auth.redeem(await auth.createPairCode('emma', T0), 'abcdefgh', T0);
    expect(await auth.revoke('abcdefgh', T0 + 5)).toBe(1);
    expect(await auth.check(r!.token)).toBeNull();
  });

  it('checks the admin token', async () => {
    const auth = new Auth(dir);
    const t = await auth.createAdminToken();
    expect(await auth.checkAdmin(t)).toBe(true);
    expect(await auth.checkAdmin('0'.repeat(64))).toBe(false);
    expect(await auth.checkAdmin('')).toBe(false);
  });
});

describe('limits', () => {
  it('allows 60 calls a minute per key', () => {
    const l = new RateLimiter(60, 60_000);
    for (let i = 0; i < 60; i++) expect(l.hit('t', T0 + i)).toBe(true);
    expect(l.hit('t', T0 + 100)).toBe(false);
    expect(l.hit('other', T0 + 100)).toBe(true);
    expect(l.hit('t', T0 + 60_001)).toBe(true);
  });
  it('blocks an address for 15 minutes after 5 wrong codes', () => {
    const f = new FailureLimiter(5, 15 * 60_000, 15 * 60_000);
    for (let i = 0; i < 5; i++) { expect(f.blocked('ip', T0 + i)).toBe(false); f.fail('ip', T0 + i); }
    expect(f.blocked('ip', T0 + 10)).toBe(true);
    expect(f.blocked('ip', T0 + 4 + 15 * 60_000 + 1)).toBe(false);
  });
});
```

Run: `npm --prefix games/moon-meadow-home test -- tests/server/auth.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 2: Implement `server/ratelimit.ts`**

```ts
/** At most `limit` hits per key in a sliding window. */
export class RateLimiter {
  #limit: number;
  #windowMs: number;
  #hits = new Map<string, number[]>();

  constructor(limit: number, windowMs: number) {
    this.#limit = limit;
    this.#windowMs = windowMs;
  }

  hit(key: string, now: number): boolean {
    const list = (this.#hits.get(key) ?? []).filter((t) => now - t < this.#windowMs);
    if (list.length >= this.#limit) { this.#hits.set(key, list); return false; }
    list.push(now);
    this.#hits.set(key, list);
    return true;
  }
}

/** After `maxFails` failures in the window, a key is blocked for `blockMs` from its last failure. */
export class FailureLimiter {
  #max: number;
  #windowMs: number;
  #blockMs: number;
  #fails = new Map<string, number[]>();

  constructor(maxFails = 5, windowMs = 15 * 60_000, blockMs = 15 * 60_000) {
    this.#max = maxFails;
    this.#windowMs = windowMs;
    this.#blockMs = blockMs;
  }

  blocked(key: string, now: number): boolean {
    const list = (this.#fails.get(key) ?? []).filter((t) => now - t < Math.max(this.#windowMs, this.#blockMs));
    this.#fails.set(key, list);
    const recent = list.filter((t) => now - t < this.#windowMs);
    if (recent.length < this.#max) return false;
    return now - list[list.length - 1] <= this.#blockMs;
  }

  fail(key: string, now: number): void {
    const list = this.#fails.get(key) ?? [];
    list.push(now);
    this.#fails.set(key, list);
  }
}
```

- [ ] **Step 3: Implement `server/tokens.ts`**

```ts
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { checkFamily } from './store.ts';

export const PAIR_CODE_MS = 15 * 60_000;
export type TokenRecord = { family: string; dev: string; created: number; revoked?: number };
type PairCode = { hash: string; family: string; expires: number; used?: number };

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw e;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(tmp, file);
}

const sameHash = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Pair codes, device tokens and the admin token. Only SHA-256 hashes are stored. */
export class Auth {
  #dir: string;
  #chain: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.#dir = dataDir;
  }

  #file(name: string): string { return path.join(this.#dir, name); }

  #locked<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.#chain.then(fn, fn);
    this.#chain = p.catch(() => undefined);
    return p;
  }

  createPairCode(family: string, now: number): Promise<string> {
    checkFamily(family);
    return this.#locked(async () => {
      const codes = (await readJson<PairCode[]>(this.#file('pair-codes.json'), [])).filter((c) => c.expires >= now && !c.used);
      let code = '';
      do { code = String(randomInt(0, 1_000_000)).padStart(6, '0'); } while (codes.some((c) => c.hash === sha256(code)));
      codes.push({ hash: sha256(code), family, expires: now + PAIR_CODE_MS });
      await writeJson(this.#file('pair-codes.json'), codes);
      return code;
    });
  }

  redeem(code: string, dev: string, now: number): Promise<{ token: string; family: string } | null> {
    if (!/^\d{6}$/.test(code) || !/^[a-z2-7]{8}$/.test(dev)) return Promise.resolve(null);
    return this.#locked(async () => {
      const codes = await readJson<PairCode[]>(this.#file('pair-codes.json'), []);
      const c = codes.find((x) => x.hash === sha256(code) && !x.used && x.expires >= now);
      if (!c) return null;
      c.used = now;
      await writeJson(this.#file('pair-codes.json'), codes);
      const token = randomBytes(32).toString('hex');
      const tokens = await readJson<Record<string, TokenRecord>>(this.#file('tokens.json'), {});
      tokens[sha256(token)] = { family: c.family, dev, created: now };
      await writeJson(this.#file('tokens.json'), tokens);
      return { token, family: c.family };
    });
  }

  async check(token: string): Promise<TokenRecord | null> {
    if (!/^[0-9a-f]{64}$/.test(token)) return null;
    const tokens = await readJson<Record<string, TokenRecord>>(this.#file('tokens.json'), {});
    const rec = tokens[sha256(token)];
    return rec && !rec.revoked ? rec : null;
  }

  revoke(dev: string, now: number): Promise<number> {
    return this.#locked(async () => {
      const tokens = await readJson<Record<string, TokenRecord>>(this.#file('tokens.json'), {});
      let n = 0;
      for (const rec of Object.values(tokens)) if (rec.dev === dev && !rec.revoked) { rec.revoked = now; n += 1; }
      await writeJson(this.#file('tokens.json'), tokens);
      return n;
    });
  }

  async listDevices(): Promise<TokenRecord[]> {
    return Object.values(await readJson<Record<string, TokenRecord>>(this.#file('tokens.json'), {}));
  }

  async createAdminToken(): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await writeJson(this.#file('admin.json'), { hash: sha256(token) });
    return token;
  }

  async checkAdmin(token: string): Promise<boolean> {
    if (!/^[0-9a-f]{64}$/.test(token)) return false;
    const a = await readJson<{ hash?: string }>(this.#file('admin.json'), {});
    return typeof a.hash === 'string' && sameHash(a.hash, sha256(token));
  }

  deleteFamily(family: string): Promise<void> {
    checkFamily(family);
    return this.#locked(async () => {
      const tokens = await readJson<Record<string, TokenRecord>>(this.#file('tokens.json'), {});
      for (const [h, rec] of Object.entries(tokens)) if (rec.family === family) delete tokens[h];
      await writeJson(this.#file('tokens.json'), tokens);
    });
  }
}
```

- [ ] **Step 4: Implement `server/admin.ts`**

```ts
// Admin CLI for the save server. Run from games/moon-meadow-home:
//   node server/admin.ts pair [--family emma|test] [--data .data]
//   node server/admin.ts devices | revoke <device> | delete-family <family> --yes
//   node server/admin.ts admin-token    (Tjitse only: prints a secret once)
import { parseArgs } from 'node:util';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { Auth } from './tokens.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    data: { type: 'string', default: '.data' },
    family: { type: 'string', default: 'emma' },
    yes: { type: 'boolean', default: false },
  },
});
const dataDir = path.resolve(values.data);
const auth = new Auth(dataDir);
const [cmd, arg] = positionals;

switch (cmd) {
  case 'pair': {
    const code = await auth.createPairCode(values.family, Date.now());
    console.log(`Pairing code for family ${values.family}: ${code} (works once, for 15 minutes)`);
    break;
  }
  case 'devices':
    for (const d of await auth.listDevices()) {
      console.log(`${d.dev}  ${d.family}  paired ${new Date(d.created).toISOString()}${d.revoked ? '  revoked' : ''}`);
    }
    break;
  case 'revoke':
    if (!arg) throw new Error('usage: node server/admin.ts revoke <device id>');
    console.log(`Revoked ${await auth.revoke(arg, Date.now())} token(s) for ${arg}`);
    break;
  case 'admin-token': {
    const t = await auth.createAdminToken();
    console.log('Admin token. It is shown once. Put it in .env as MMH_ADMIN_TOKEN yourself:');
    console.log(t);
    break;
  }
  case 'delete-family':
    if (!arg || !values.yes) throw new Error('usage: node server/admin.ts delete-family <family> --yes');
    await auth.deleteFamily(arg);
    await rm(path.join(dataDir, 'families', arg), { recursive: true, force: true });
    console.log(`Deleted family ${arg} and its daily copies`);
    break;
  default:
    console.log('usage: node server/admin.ts pair|devices|revoke|admin-token|delete-family [--data dir] [--family name] [--yes]');
    process.exitCode = 1;
}
```

Agents never run `admin-token`: its output is a secret for Tjitse.

- [ ] **Step 5: Run the tests and try the CLI**

```sh
npm --prefix games/moon-meadow-home test -- tests/server/auth.test.ts
node games/moon-meadow-home/server/admin.ts pair --family test --data "$TMPDIR/mmh-cli-data"
node games/moon-meadow-home/server/admin.ts devices --data "$TMPDIR/mmh-cli-data"
```

Expected: 8 tests pass; the CLI prints a 6-digit code for family `test`; `devices` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/server/tokens.ts games/moon-meadow-home/server/ratelimit.ts games/moon-meadow-home/server/admin.ts games/moon-meadow-home/tests/server/auth.test.ts
git commit -m "Add pairing codes, hashed device tokens, rate limits and the server admin commands"
```

### Task C3: The save API (pair, sync, unknown names)

**Files:**
- Create: `server/api.ts`
- Modify: `server/main.ts`
- Test: `tests/server/api.test.ts`

**Interfaces:**
- Consumes: `FamilyLog`, `StoredEvent` (C1), `Auth`, `sha256`, `RateLimiter`, `FailureLimiter` (C2), `collectUnknownNames` (B3), `createAppServer`, `sendJson`, `ApiHandler` (A8), `validate` and `EVENT_SCHEMA_VERSION` from `src/core/events.ts` (core).
- Produces: `type ApiDeps = { dataDir: string; now(): number; validate(e: unknown): { ok: true } | { ok: false; reason: string }; schemaVersion: number }`, `createApi(deps: ApiDeps): ApiHandler`, `MAX_BODY = 2 * 1024 * 1024`, `MAX_PUSH = 1000`, `PAGE = 2000`. The HTTP API in "Contracts I produce".

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../../server/http.ts';
import { createApi } from '../../server/api.ts';
import { Auth } from '../../server/tokens.ts';

let dir = '';
let server: http.Server;
let base = '';
let now = Date.UTC(2026, 9, 12, 18);

type Res = { status: number; json: any };
async function call(route: string, body?: unknown, token?: string): Promise<Res> {
  const r = await fetch(base + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}

async function pairDevice(family: string, dev: string): Promise<string> {
  const code = await new Auth(dir).createPairCode(family, now);
  const r = await call('pair', { code, dev });
  expect(r.status).toBe(200);
  return r.json.token as string;
}

const ev = (id: string, extra: Record<string, unknown> = {}) => ({ id, v: 1, type: 'test', t: now, hlc: '0', dev: id.split(':')[0], ...extra });

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'mmh-api-'));
  now = Date.UTC(2026, 9, 12, 18);
  const api = createApi({
    dataDir: dir,
    now: () => now,
    validate: (e) => ((e as { type?: string }).type === 'bad' ? { ok: false, reason: 'unknown type bad' } : { ok: true }),
    schemaVersion: 1,
  });
  server = createAppServer({ host: '127.0.0.1', port: 0, dataDir: dir, repoRoot: null, mounts: [{ prefix: '/g/', dir, app: true }] }, api);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/g/api/`;
});

afterEach(() => new Promise<void>((r) => server.close(() => r())));

describe('save API', () => {
  it('pairs two devices and syncs their events both ways', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    const b = await pairDevice('emma', 'bbbbbbbb');
    const ra = await call('sync', { dev: 'aaaaaaaa', after: 0, events: [ev('aaaaaaaa:1'), ev('aaaaaaaa:2')] }, a);
    expect(ra.json).toEqual({ rejected: [], events: [], cursor: 2, more: false });
    const rb = await call('sync', { dev: 'bbbbbbbb', after: 0, events: [ev('bbbbbbbb:1')] }, b);
    expect(rb.json.events.map((e: { id: string }) => e.id)).toEqual(['aaaaaaaa:1', 'aaaaaaaa:2']);
    expect(rb.json.cursor).toBe(3);
    const ra2 = await call('sync', { dev: 'aaaaaaaa', after: 2, events: [] }, a);
    expect(ra2.json.events.map((e: { id: string }) => e.id)).toEqual(['bbbbbbbb:1']);
  });

  it('a duplicate push adds nothing and is not a rejection', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    await call('sync', { dev: 'aaaaaaaa', after: 0, events: [ev('aaaaaaaa:1')] }, a);
    const r = await call('sync', { dev: 'aaaaaaaa', after: 0, events: [ev('aaaaaaaa:1')] }, a);
    expect(r.json).toEqual({ rejected: [], events: [], cursor: 1, more: false });
  });

  it('refuses a missing or wrong token, and another device id', async () => {
    expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: [] })).status).toBe(401);
    expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: [] }, 'f'.repeat(64))).status).toBe(401);
    const a = await pairDevice('emma', 'aaaaaaaa');
    expect((await call('sync', { dev: 'bbbbbbbb', after: 0, events: [] }, a)).status).toBe(403);
  });

  it('rejects bad events one by one and keeps the rest', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    const r = await call('sync', { dev: 'aaaaaaaa', after: 0, events: [ev('aaaaaaaa:1'), ev('aaaaaaaa:2', { type: 'bad' }), { type: 'test' }, ev('aaaaaaaa:3')] }, a);
    expect(r.json.rejected).toEqual([{ id: 'aaaaaaaa:2', reason: 'unknown type bad' }, { id: '', reason: 'no id' }]);
    expect(r.json.cursor).toBe(2);
  });

  it('stores events with a newer schema version without validating them', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    const r = await call('sync', { dev: 'aaaaaaaa', after: 0, events: [ev('aaaaaaaa:1', { v: 2, type: 'bad' })] }, a);
    expect(r.json.rejected).toEqual([]);
    expect(r.json.cursor).toBe(1);
  });

  it('takes 20,000 events in chunks of 1,000 and pages them back 2,000 at a time', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    const b = await pairDevice('emma', 'bbbbbbbb');
    for (let c = 0; c < 20; c++) {
      const chunk = Array.from({ length: 1000 }, (_, i) => ev(`aaaaaaaa:${c * 1000 + i + 1}`));
      const r = await call('sync', { dev: 'aaaaaaaa', after: 0, events: chunk }, a);
      expect(r.status).toBe(200);
    }
    let after = 0;
    let got = 0;
    let calls = 0;
    for (;;) {
      const r = await call('sync', { dev: 'bbbbbbbb', after, events: [] }, b);
      got += r.json.events.length;
      after = r.json.cursor;
      calls += 1;
      if (!r.json.more) break;
    }
    expect(got).toBe(20_000);
    expect(after).toBe(20_000);
    expect(calls).toBe(10);
  });

  it('refuses over 1,000 events in one call and a body over 2 MB', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    const many = Array.from({ length: 1001 }, (_, i) => ev(`aaaaaaaa:${i + 1}`));
    expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: many }, a)).status).toBe(400);
    const big = [ev('aaaaaaaa:1', { blob: 'x'.repeat(2.1 * 1024 * 1024) })];
    expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: big }, a)).status).toBe(413);
  });

  it('limits a token to 60 calls a minute', async () => {
    const a = await pairDevice('emma', 'aaaaaaaa');
    for (let i = 0; i < 60; i++) expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: [] }, a)).status).toBe(200);
    expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: [] }, a)).status).toBe(429);
    now += 60_001;
    expect((await call('sync', { dev: 'aaaaaaaa', after: 0, events: [] }, a)).status).toBe(200);
  });

  it('blocks pairing after 5 wrong codes from one address', async () => {
    for (let i = 0; i < 5; i++) expect((await call('pair', { code: '000000', dev: 'aaaaaaaa' })).status).toBe(400);
    const code = await new Auth(dir).createPairCode('emma', now);
    expect((await call('pair', { code, dev: 'aaaaaaaa' })).status).toBe(429);
    now += 15 * 60_000 + 10;
    const fresh = await new Auth(dir).createPairCode('emma', now);
    expect((await call('pair', { code: fresh, dev: 'aaaaaaaa' })).status).toBe(200);
  });

  it('keeps the test family apart from Emma', async () => {
    const t = await pairDevice('test', 'tttttttt');
    const e = await pairDevice('emma', 'eeeeeeee');
    await call('sync', { dev: 'tttttttt', after: 0, events: [ev('tttttttt:1')] }, t);
    const r = await call('sync', { dev: 'eeeeeeee', after: 0, events: [] }, e);
    expect(r.json).toEqual({ rejected: [], events: [], cursor: 0, more: false });
  });

  it('lists unknown names for the admin only', async () => {
    const e = await pairDevice('emma', 'eeeeeeee');
    await call('sync', { dev: 'eeeeeeee', after: 0, events: [ev('eeeeeeee:1', { type: 'name.built', gems: ['T', 'a', 'm', 'o'], phonemes: 't a m o', outcome: 'unknown' })] }, e);
    expect((await call('admin/unknown-names?family=emma', undefined, e)).status).toBe(401);
    const admin = await new Auth(dir).createAdminToken();
    const r = await call('admin/unknown-names?family=emma', undefined, admin);
    expect(r.json.names).toEqual([{ name: 'Tamo', gems: ['t', 'a', 'm', 'o'], phonemes: 't a m o', firstSeen: now, count: 1 }]);
  });
});
```

Note: `call('admin/unknown-names?family=emma', ...)` puts the query in the URL; `http.ts` passes the route from the pathname only, and the API reads the query from `req.url`.

Run: `npm --prefix games/moon-meadow-home test -- tests/server/api.test.ts`
Expected: FAIL, `../../server/api.ts` not found.

- [ ] **Step 2: Implement `server/api.ts`**

```ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson, type ApiHandler } from './http.ts';
import { FamilyLog, type StoredEvent } from './store.ts';
import { Auth, sha256 } from './tokens.ts';
import { RateLimiter, FailureLimiter } from './ratelimit.ts';
import { collectUnknownNames } from './unknown-names.ts';

export type ApiDeps = {
  dataDir: string;
  now(): number;
  validate(e: unknown): { ok: true } | { ok: false; reason: string };
  schemaVersion: number;
};

export const MAX_BODY = 2 * 1024 * 1024;
export const MAX_PUSH = 1000;
export const PAGE = 2000;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  let tooBig = false;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    const b = c as Buffer;
    size += b.length;
    if (size > MAX_BODY) tooBig = true;
    else chunks.push(b);
  }
  if (tooBig) throw new HttpError(413, 'body too large');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'bad json');
  }
}

const bearer = (req: IncomingMessage): string => {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
};

function clientIp(req: IncomingMessage): string {
  const remote = req.socket.remoteAddress ?? '';
  const xff = req.headers['x-forwarded-for'];
  const local = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  return local && typeof xff === 'string' && xff ? xff.split(',')[0].trim() : remote;
}

export function createApi(deps: ApiDeps): ApiHandler {
  const auth = new Auth(deps.dataDir);
  const logs = new Map<string, Promise<FamilyLog>>();
  const calls = new RateLimiter(60, 60_000);
  const pairFails = new FailureLimiter(5, 15 * 60_000, 15 * 60_000);

  function logFor(family: string): Promise<FamilyLog> {
    let p = logs.get(family);
    if (!p) {
      const log = new FamilyLog(deps.dataDir, family);
      p = log.load().then(() => log);
      logs.set(family, p);
    }
    return p;
  }

  async function pair(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ip = clientIp(req);
    const now = deps.now();
    if (pairFails.blocked(ip, now)) return sendJson(res, 429, { error: 'too many tries' });
    const body = (await readBody(req)) as { code?: unknown; dev?: unknown } | null;
    const r = body && typeof body.code === 'string' && typeof body.dev === 'string' ? await auth.redeem(body.code, body.dev, now) : null;
    if (!r) {
      pairFails.fail(ip, now);
      return sendJson(res, 400, { error: 'wrong code' });
    }
    sendJson(res, 200, r);
  }

  async function sync(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const token = bearer(req);
    const rec = await auth.check(token);
    if (!rec) return sendJson(res, 401, { error: 'unauthorised' });
    if (!calls.hit(sha256(token), deps.now())) return sendJson(res, 429, { error: 'too many calls' });
    const body = (await readBody(req)) as { dev?: unknown; after?: unknown; events?: unknown } | null;
    if (!body || typeof body.dev !== 'string' || !Number.isInteger(body.after) || (body.after as number) < 0 || !Array.isArray(body.events)) {
      return sendJson(res, 400, { error: 'bad request' });
    }
    if (body.dev !== rec.dev) return sendJson(res, 403, { error: 'device mismatch' });
    if (body.events.length > MAX_PUSH) return sendJson(res, 400, { error: 'too many events' });
    const rejected: { id: string; reason: string }[] = [];
    const accepted: StoredEvent['e'][] = [];
    for (const e of body.events as unknown[]) {
      const id = e && typeof e === 'object' && typeof (e as { id?: unknown }).id === 'string' ? (e as { id: string }).id : '';
      if (!id) { rejected.push({ id: '', reason: 'no id' }); continue; }
      const v = (e as { v?: unknown }).v;
      if (typeof v === 'number' && v > deps.schemaVersion) { accepted.push(e as StoredEvent['e']); continue; }
      const check = deps.validate(e);
      if (check.ok) accepted.push(e as StoredEvent['e']);
      else rejected.push({ id, reason: check.reason });
    }
    const log = await logFor(rec.family);
    await log.append(rec.dev, accepted, deps.now());
    const page = log.since(body.after as number, rec.dev, PAGE);
    sendJson(res, 200, { rejected, events: page.events, cursor: page.cursor, more: page.more });
  }

  async function unknownNames(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!(await auth.checkAdmin(bearer(req)))) return sendJson(res, 401, { error: 'unauthorised' });
    const family = new URL(req.url ?? '', 'http://local').searchParams.get('family') ?? 'emma';
    let log: FamilyLog;
    try { log = await logFor(family); } catch { return sendJson(res, 400, { error: 'bad family' }); }
    sendJson(res, 200, { names: collectUnknownNames(log.all()) });
  }

  return async (req, res, route) => {
    try {
      if (route === 'health') return sendJson(res, 200, { ok: true });
      if (route === 'pair' && req.method === 'POST') return await pair(req, res);
      if (route === 'sync' && req.method === 'POST') return await sync(req, res);
      if (route === 'admin/unknown-names' && req.method === 'GET') return await unknownNames(req, res);
      sendJson(res, 404, { error: 'not found' });
    } catch (err) {
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      throw err;
    }
  };
}
```

`logs` caches a rejected promise for a bad family; `logFor` is only called with token families (always valid) and the admin query, where the `FamilyLog` constructor throws synchronously before caching. Keep it that way.

- [ ] **Step 3: Wire the API into `server/main.ts`**

Replace `server/main.ts` with:

```ts
// Moon Meadow Home server: the repo's static files (picture menu, v2 ideas, shared audio), the built
// game at its mounts, and the save API. Run from games/moon-meadow-home: npm run serve
import { parseArgs } from './config.ts';
import { createAppServer } from './http.ts';
import { createApi } from './api.ts';
import { validate, EVENT_SCHEMA_VERSION } from '../src/core/events.ts';

const cfg = parseArgs(process.argv.slice(2), process.cwd());
const api = createApi({ dataDir: cfg.dataDir, now: () => Date.now(), validate, schemaVersion: EVENT_SCHEMA_VERSION });
const server = createAppServer(cfg, api);
server.listen(cfg.port, cfg.host, () => {
  console.log(`Moon Meadow Home server on http://${cfg.host}:${cfg.port}/`);
  console.log(`  repo root: ${cfg.repoRoot ?? 'not served'}, data: ${cfg.dataDir}`);
  for (const m of cfg.mounts) console.log(`  ${m.prefix} -> ${m.dir}  (api at ${m.prefix}api/)`);
});
```

- [ ] **Step 4: Run the tests and a real start**

```sh
npm --prefix games/moon-meadow-home test -- tests/server
node games/moon-meadow-home/server/main.ts --port 8799 --data "$TMPDIR/mmh-smoke" &
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:8799/games/moon-meadow-home/api/health
kill %1
```

Expected: all server tests pass; `{"ok":true}`. If Node refuses to load `src/core/events.ts` (an import without `.ts`, or an enum), report the exact error to the core workstream; that is their contract.

- [ ] **Step 5: Restart Emma's server with the API**

Stop the running `npm run serve` (Task A8) and start it again outside the sandbox in the background. Check `curl -s http://127.0.0.1:8765/games/moon-meadow-home/api/health`. Expected: `{"ok":true}`. The data folder is `games/moon-meadow-home/.data/` (gitignored).

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/server/api.ts games/moon-meadow-home/server/main.ts games/moon-meadow-home/tests/server/api.test.ts
git commit -m "Add the save API: pairing, chunked sync with per-event checks, and the unknown names list"
```

### Task C4: Deploy note for odin and the Mac service

**Files:**
- Create: `server/deploy/moon-meadow-home.service`, `server/deploy/nginx-unicorns.conf`, `server/deploy/nl.vendic.moon-meadow-home.plist`, `docs/v3/deploy-odin.md`
- Modify: `STACK.md`, `games/moon-meadow-home/README.md`

**Interfaces:**
- Consumes: `server/main.ts` flags (A8, C3), `npm run build` (A1).
- Produces: files Tjitse uses to deploy. Agents never SSH to odin.

- [ ] **Step 1: Write the systemd unit**

`server/deploy/moon-meadow-home.service`:

```ini
[Unit]
Description=Moon Meadow Home (static game files and save API)
After=network.target

[Service]
Type=simple
User=unicorns
Group=unicorns
WorkingDirectory=/srv/moon-meadow-home
ExecStart=/usr/bin/node server/main.ts --host 127.0.0.1 --port 8765 --data /var/lib/moon-meadow-home --mount /unicorns/=dist
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/moon-meadow-home

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Write the nginx snippet**

`server/deploy/nginx-unicorns.conf`:

```nginx
# Inside the odin.vendic.cloud server block (HTTPS). The Node service listens on 127.0.0.1:8765 only.
location = /unicorns { return 301 /unicorns/; }
location /unicorns/ {
    proxy_pass http://127.0.0.1:8765;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 2m;
}
```

`X-Forwarded-For` is set to `$remote_addr` (not appended), so a client cannot fake its address for the pairing limit.

- [ ] **Step 3: Write the launchd job for the Mac**

`server/deploy/nl.vendic.moon-meadow-home.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>nl.vendic.moon-meadow-home</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "$HOME/sites/emmas-game/games/moon-meadow-home" &amp;&amp; exec npm run serve</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/moon-meadow-home.log</string>
  <key>StandardErrorPath</key><string>/tmp/moon-meadow-home.log</string>
</dict>
</plist>
```

- [ ] **Step 4: Write `docs/v3/deploy-odin.md`**

```markdown
# Deploying Moon Meadow Home to odin

Tjitse deploys. Agents do not SSH to odin. Spec: [spec.md](spec.md) sections 4.5, 4.8 and 5.3.

## What runs where

- One Node 24.19.0 process on odin, listening on `127.0.0.1:8765`, serves the built game at `/unicorns/` and the save API at `/unicorns/api/`.
- nginx terminates HTTPS for `odin.vendic.cloud` and proxies `/unicorns/` to it. Over HTTPS the service worker and `navigator.storage.persist()` work.
- Data: `/var/lib/moon-meadow-home/` (`families/<family>/events.jsonl`, 30 daily copies per family, hashed tokens). Back this folder up.

## First deploy

1. On the Mac: `VITE_MENU_URL= npm --prefix games/moon-meadow-home run build` (an empty `VITE_MENU_URL` hides the home button, because odin has no picture menu).
2. Copy to odin, into `/srv/moon-meadow-home/`: `games/moon-meadow-home/dist/`, `games/moon-meadow-home/server/`, `games/moon-meadow-home/package.json`, and `games/moon-meadow-home/src/core/` (the server imports `src/core/events.ts`).
   `rsync -a --delete games/moon-meadow-home/{dist,server,package.json} odin:/srv/moon-meadow-home/` and `rsync -a --delete games/moon-meadow-home/src/core/ odin:/srv/moon-meadow-home/src/core/`.
3. On odin: create the user `unicorns` and `/var/lib/moon-meadow-home` owned by it. Install `server/deploy/moon-meadow-home.service` into `/etc/systemd/system/`, then `systemctl daemon-reload && systemctl enable --now moon-meadow-home`.
4. Add `server/deploy/nginx-unicorns.conf` to the `odin.vendic.cloud` server block. Reload nginx.
5. Check: `curl https://odin.vendic.cloud/unicorns/api/health` gives `{"ok":true}`.
6. Pair Emma's iPad: on odin, in `/srv/moon-meadow-home`, `node server/admin.ts pair --data /var/lib/moon-meadow-home`. Type the 6 digits into the parent corner within 15 minutes. Test devices use `--family test`.
7. For `npm run names:pull` from odin: `node server/admin.ts admin-token --data /var/lib/moon-meadow-home`, and put the printed token in the repo's `.env` as `MMH_ADMIN_TOKEN` yourself.

## Updates

Always deploy the server before the app (spec 4.5). Copy `server/` and `src/core/`, restart the service, then copy `dist/`. Name packs can be deployed alone: copy `dist/audio/names-*/` (or the packs from `public/audio/`); the game fetches name manifests fresh at start.

## Moving from the Mac to odin

The Mac's save data is in `games/moon-meadow-home/.data/`. Copy `families/emma/events.jsonl` to `/var/lib/moon-meadow-home/families/emma/events.jsonl` before pairing the iPad with odin. Devices then pair again with odin codes; their logs merge by event id, so nothing is lost or doubled.

## Removing data

`node server/admin.ts delete-family emma --yes --data /var/lib/moon-meadow-home` removes the family's events, daily copies and tokens. `node server/admin.ts revoke <device id>` stops one device.

## On the Mac (home network)

`npm --prefix games/moon-meadow-home run serve` serves the repo on port 8765. To keep it running across logins, copy `games/moon-meadow-home/server/deploy/nl.vendic.moon-meadow-home.plist` to `~/Library/LaunchAgents/` and run `launchctl load ~/Library/LaunchAgents/nl.vendic.moon-meadow-home.plist`. Pairing codes for the Mac: `npm --prefix games/moon-meadow-home run server:pair`.
```

- [ ] **Step 5: Update `STACK.md` and the README**

In `STACK.md` "Deployment", replace the last bullet with: `- Later: odin.vendic.cloud over HTTPS at /unicorns/, see [docs/v3/deploy-odin.md](docs/v3/deploy-odin.md). Agents do not deploy there.`

In `games/moon-meadow-home/README.md`, add under "Playing on the iPad": `5. To sync a second device, run npm --prefix games/moon-meadow-home run server:pair and type the code in that device's parent corner. Deploying to odin: docs/v3/deploy-odin.md.`

- [ ] **Step 6: Check the systemd command line locally**

```sh
VITE_MENU_URL= npm --prefix games/moon-meadow-home run build
node games/moon-meadow-home/server/main.ts --host 127.0.0.1 --port 8798 --data "$TMPDIR/mmh-odin" --mount /unicorns/=games/moon-meadow-home/dist &
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8798/unicorns/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8798/%2eenv
kill %1
grep -c 'aria-label="Home"' games/moon-meadow-home/dist/assets/*.js || true
npm --prefix games/moon-meadow-home run build
```

Expected: `200` for `/unicorns/`, `404` for `/.env` (no repo root on odin), the home button absent from that build, then a normal build again for the Mac.

- [ ] **Step 7: Commit**

```bash
git add games/moon-meadow-home/server/deploy docs/v3/deploy-odin.md STACK.md games/moon-meadow-home/README.md
git commit -m "Add the odin deploy note, systemd unit, nginx snippet and a launchd job for the Mac"
```

---

## Self-review notes

- Spec coverage: item 1 (skeleton, static deploy, PWA install, `persist()`, docs) is A1, A8, A9, A13, B1, C4. Item 25 (save server, pairing, test family, names pull source) is B3, C1 to C3. Spec 5.2 (stage, touch, aria-labels, three backgrounds) is A3, A9, B2. Spec 6.2 (flows at three sizes, portrait, `window.__game`, `[log]` owners, missing clips and console errors empty) is A10, A11, B4. Spec 4.7 rows for offline and `persist()` refused are A9 and B1. The meadow stress test (item 2), the sync client and pairing UI (items 25 and 26 client side), the parent corner and the content validator are other workstreams; their seams are in "Contracts I need".
- The lead's decisions are kept: one Node server for static files and the API on port 8765 replaces `python3 -m http.server`; v3 at `/games/moon-meadow-home/` shares the v2 origin; the app works on plain http; odin is a deploy note only.
- Known gap left to the integrator: places.md plans its own `src/ui/ghost.ts`, `GhostHand.svelte`, `Moonbeam.svelte` and assumes core owns `src/test-hook.ts`, port 8765 for flows and `vitest.config.ts`. This plan owns those files and offers `ghostTap`, `ghostMove`, `ghostStop`, `registerHookExtension`, port 8766 for flows and the Vitest config inside `vite.config.ts`.
