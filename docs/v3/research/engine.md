# Engine, art and platform choice for v3

Research date: 2026-10-12. Versions were read from the npm registry on that date.

## Decision

Build v3 as a **Svelte 5 + Vite + TypeScript app that renders to the DOM**, with layered raster art (WebP) animated by CSS transforms and the Web Animations API. Do not use Phaser 4 as the main engine. Keep `shared/audio.js` for all sound. Save to IndexedDB with export and import. Ship as a home-screen web app (PWA) from `odin.vendic.cloud`.

Keep one escape hatch: if a scene with many moving unicorns (the meadow) is too slow on Emma's iPad, render that one scene with **PixiJS v8** inside a Svelte component. Everything else stays DOM.

Reasons, in order of weight:

1. **The game is mostly touch UI, text and collection screens.** Naming, spelling with letter tiles, reading wishes, the sticker book, the herd book, dress-up and the level map are all "tap and drag big things, show crisp words" screens. The DOM does this natively. A canvas engine has to rebuild buttons, layout, scrolling lists and text.
2. **Agents must be able to test their own work.** `playwright-cli snapshot` sees every DOM element with a ref, so an agent can `click e12` or `drag e3 e7` and read the result. A canvas is one opaque element: every check needs a hand-written test hook and pixel coordinates.
3. **Text is the learning content.** Andika in the DOM is crisp at any size with no extra work. In Phaser, text is drawn to a texture and is blurry unless the canvas and every text object are set to the device pixel ratio (confirmed in the probe below).
4. **Maturity.** Phaser 4.0.0 shipped on 10 April 2026. It has a rewritten WebGL renderer and an open iPad text bug filed six days ago. Svelte 5 has been stable for two years.
5. **The game does not need what Phaser is good at.** No physics, no tilemaps, no fast action, no hundreds of sprites. It is a care and collection game with short scenes.

Main risk: **DOM animation performance with many layered unicorns on screen.** See "Main risk" at the end for the test that settles it in the first week.

## What v3 needs from the stack

- Months of play: dozens of scenes, levels, a growing herd (20 to 100 babies), collections, dress-up items.
- Hundreds to thousands of pre-generated speech clips, plus the phonics library with held sounds.
- iPad Safari, touch only, 1180 x 820 landscape, also 1080 x 810.
- Crisp Andika for letters and words.
- Art that looks like a real game, not a mockup (the v2 audit calls the current art placeholder art).
- Save data that survives for months, with a backup, and that can import the v2 herd.
- Works offline from the home screen.
- Most code is written and changed by AI agents, so the code must be easy for them to read, change and verify with `playwright-cli` in WebKit.

## Options compared

| | Plain DOM/SVG (v2) | Svelte 5 + Vite + TS, DOM | Phaser 4 | PixiJS v8 + DOM UI |
|---|---|---|---|---|
| Current version | n/a | svelte 5.57.2, vite 8.3.4 | 4.2.1 (9 Jul 2026) | 8.22.0 (1 Oct 2026) |
| Age of major | n/a | Svelte 5.0: Oct 2024 | 4.0.0: Apr 2026 | 8.0: Mar 2024 |
| Runtime size (gzip) | 0 | about 15 to 30 KB | 355 KB (`phaser.min.js` 4.2.1, measured) | up to 237 KB full build, less when tree-shaken |
| Crisp Andika text | Yes, native | Yes, native | Only with canvas at DPR size and `resolution: 2` on every text | Same issue as Phaser for canvas text; DOM labels are native |
| Touch drag | Pointer events, good | Same | Built-in drag and drop zones, good | Federated pointer events, good |
| Scenes, levels, menus | Hand-made | Components and a router store | Scene system | Hand-made in canvas, or DOM |
| Many moving sprites | Weak above about 30 to 50 animated layers | Same | Strong | Strong |
| Particles, glow, shaders | CSS only | CSS only | Strong (filters, particles) | Strong |
| Testing with playwright-cli | Snapshot refs, easy | Snapshot refs, easy | Test hook plus coordinates | Hook for canvas parts, refs for DOM parts |
| Agent fluency | High | High | High for Phaser 3, lower for 4 (API changed: FX became Filters, Pipelines became RenderNodes); the package ships 28 agent skill files | High |
| Maintainable at size | No: v2 is one 161 KB file | Yes | Yes | Yes, but two worlds |

**Plain DOM without a build** is what v2 is. It proved the mechanics but does not scale: 2,430 lines in one file, no modules, no types, no tests. Keep the rendering approach, add structure.

**UI framework choice.** Svelte 5 over Preact and Solid. Svelte has transitions, `animate:flip` and `crossfade` built in, which suit a sticker book, a herd book and items flying into a bag. Preact 11.0 is four days old (8 Oct 2026) and Solid 2.0 is still a release candidate. Svelte 5 runes are stable and agents write them well.

## Probe: Phaser 4.2.1 in WebKit at iPad size

A throwaway page in `$TMPDIR` loaded `phaser@4.2.1` from jsDelivr, drew 12 SVG eggs, a nest drop zone and three text labels (Phaser text at resolution 1, Phaser text at resolution 2, and a DOM label in Andika). It ran in `playwright-cli` WebKit with the repo's iPad config (1180 x 820, device scale 2, touch).

Results:

- Phaser booted as "WebGL | Web Audio" in 136 ms after fonts loaded, at 60 fps. It uses a WebGL 1 context.
- Drag works with Phaser's `draggable` and `setRectangleDropZone`. Three drags into the nest counted as drops, one drag that missed snapped back. 32 drag events over 4 drags of 8 steps.
- **Text needs work to be crisp.** With the canvas at 1180 x 820 CSS pixels, the canvas must be 2360 x 1640 and the camera zoomed by 2. Even then, text at `resolution: 1` is visibly soft at device scale. Text at `resolution: 2` is crisp. The DOM label is crisp with no settings.
- **SVG data URIs must be base64.** A `data:image/svg+xml;utf8,` URI crashed the loader with `InvalidCharacterError` in `atob`. Small, but typical of what agents will trip over.
- **Testing needs hooks.** The `playwright-cli` snapshot of the page shows only the DOM label. The eggs, the nest and the counter are invisible to it. The probe needed `window.__probe.eggs()` to report positions, and drags had to be done with `mousemove`/`mousedown`/`mouseup` at pixel coordinates.
- `playwright-cli screenshot` saves at CSS size (1180 x 820), so blur is hidden. Use `run-code` with `page.screenshot({ scale: 'device' })` to check text sharpness.
- Real multi-finger touch cannot be simulated in WebKit through `playwright-cli`. Drag quality must be checked on the iPad itself, whatever the stack.

## Phaser 4 in more detail

Facts:

- Releases: 4.0.0 "Caladan" 10 April 2026, 4.1.0 30 April, 4.2.0 19 June, 4.2.1 9 July 2026.
- The WebGL renderer was rewritten around a RenderNode graph. FX and BitmapMask became Filters. Mesh and Plane were removed. Canvas rendering still exists with fewer features.
- Sound: Web Audio sound manager with automatic unlock on first touch, audio sprites, markers. It has no way to hold a phoneme in a loop window, which `shared/audio.js` does. The v2 audit already says to keep `audio.js` whatever the engine.
- DOM: `DOMElement` game objects can place HTML over the canvas, but then two layout systems fight over the same screen.
- Context loss: the renderer listens for `webglcontextlost` and `webglcontextrestored`. iPadOS has a history of WebGL context loss after backgrounding Safari (WebKit bugs 261331, 289601) and of killing pages under memory pressure without a context-lost event (WebKit report on 384 MB canvas memory).
- Open issue #7392 (6 Oct 2026): `Phaser.Text` renders with opaque black boxes on iPadOS 16.4 and older in 4.2.1, caused by a divide by zero in the tint shader. No maintainer reply yet. Text is the core of this game.

When Phaser would be the right choice: a game with physics, tilemaps, many fast sprites or arcade play. If a later mini-game needs that (for example a unicorn flying through rings), it can be a separate Phaser page that reads and writes the same save. That keeps the core game simple.

## Recommended stack

Pin exact versions in `package.json` and commit the lock file.

| Part | Choice | Version on 2026-10-12 |
|---|---|---|
| Build | Vite | 8.3.4 |
| Language | TypeScript | 6.0.3 (not 7.x: `svelte-check` 4.7.6 supports TS 5 and 6 only) |
| UI | Svelte 5 with `@sveltejs/vite-plugin-svelte` | 5.57.2 and 7.3.1 |
| Canvas fallback for one scene | PixiJS | 8.22.0 |
| Save storage | idb-keyval (one JSON document) | 6.3.0 |
| Offline | vite-plugin-pwa (Workbox) | 1.3.0 (2.0.0 is 9 days old) |
| Audio | `shared/audio.js`, moved into a TS module with types | own code |
| Font | Andika, self-hosted woff2 (not Google Fonts, so it works offline) | OFL licence |
| Unit tests | Vitest for planners, phonics rules, progression, save migration | |
| Browser tests | `playwright-cli` WebKit with `.playwright/cli.config.json` | 0.1.8 installed |

### Shape of the code

- `src/core/`: pure TypeScript with no DOM. Phonics rules, maths planners, the progression staircase, the herd model, the save schema and its migrations. This is where agents spend most time and where unit tests live.
- `src/scenes/`: one Svelte component per scene (nest, hatching, naming, meadow, stable, dress-up, level map, sticker book). Scenes read state from stores and call core functions.
- `src/art/`: the unicorn rig component (layers plus pivots) and item sprites.
- `src/audio/`: the audio player, the clip manifest and typed clip ids, so a missing clip is a compile error, not silence.
- `window.__game`: a small read-only test hook (current scene, herd size, last result), as the v2 audit asks. Most checks use the DOM snapshot instead.
- Every interactive element gets an accessible name (`aria-label="egg 3"`), which also makes snapshot refs readable for agents.

### Rendering rules for iPad Safari

- Animate only `transform` and `opacity`. No animated `filter`, `box-shadow` or SVG filters. These are what make DOM games stutter on iPad.
- Art is raster WebP at 2x, sized for its display size. Decoded images cost width x height x 4 bytes: one 2360 x 1640 background is about 15 MB in memory. Keep at most three full backgrounds loaded.
- Audio: decoded clips are uncompressed PCM. A 2-second mono clip at 44.1 kHz is about 350 KB decoded. Preload per scene and release clips when a scene ends. Never decode the whole library.
- Touch: pointer events with `setPointerCapture`, `touch-action: none` on the play area, drag start threshold of a few pixels, targets at least 64 x 64 px, and a generous drop area (snap when the item is near, not exact).
- Colour variants of the unicorns: draw each colourable layer as a white or greyscale shape and colour it with CSS `mask-image` and a background colour, or with a multiply blend. This keeps one set of art for every coat and mane colour. In the PixiJS fallback, `tint` does the same.

## Save data, offline and hosting

- **Storage.** One versioned JSON document in IndexedDB (`emma-unicorns`, key `save`), written after every meaningful change. Call `navigator.storage.persist()` on every start; WebKit grants it more readily to home-screen apps.
- **Eviction.** WebKit can delete script storage of sites that are not used for some time, and under storage pressure. Home-screen web apps count their own days of use, so daily play keeps the timer reset. Since Safari 17 an origin may use up to 60% of the disk, so the audio and art cache fits easily.
- **Install first.** A home-screen app has its own storage, separate from Safari tabs. Emma should only ever play from the home-screen icon, or her herd will seem to vanish when someone opens the game in a Safari tab.
- **Backup.** A parent corner button exports the save as a JSON file through the share sheet (Web Share API with files, falling back to a download), and imports one. Later, an optional small endpoint on odin can keep a server copy. The v2 herd lives in `localStorage` under the Mac's origin; it must be exported there once and imported into v3 (see the v2 audit, section 6).
- **Offline.** The service worker precaches the app shell, the font, the UI sounds and the current chapter. Chapter audio and art are cached when a chapter unlocks. Content-hashed file names from Vite make updates safe.
- **Hosting.** Static files on `odin.vendic.cloud` over HTTPS (needed for the service worker). Serve `.webp`, `.mp3` and `.woff2` with long cache headers, and `index.html` and `sw.js` with `no-cache`. Deploy is `vite build` plus an rsync of `dist/`.

## Art direction

Aim: a soft picture-book look, the kind of art a 6-year-old sees in a good bedtime book or a calm tablet game. Not flat icons, not glossy 3D.

- **Style:** painted 2D with soft gouache or watercolour texture, clean shapes, a warm outline in a darker shade of the fill (not black). Gentle light from the top left and soft shadows on the ground.
- **Characters:** big heads, big eyes with two highlights, short legs, round bodies. Baby unicorns read clearly at 120 px tall. Every baby is built from the same rig, so the herd varies by coat colour, mane and tail colour, markings, horn type and accessories. This keeps the "naming and collecting" pleasure while every baby looks like hers.
- **Palette:** pastel base (lilac, mint, peach, sky blue, cream), with saturated accent colours only for things to tap or collect. Night scenes in deep blue and violet with warm lamp light, so the nest and hatching feel cosy.
- **World:** a small valley around the nest with places that unlock over time: nest, meadow, stable, bath pond, dress-up wardrobe, bakery, market, castle. Each place is one painted background in 2360 x 1640 with separate foreground layers for depth.
- **Words in the world:** words Emma reads appear on signs, labels and name tags in Andika on a plain light panel, so reading never fights the art.
- **No trademark look-alikes.** Own designs only; no Furby, My Little Pony or Disney styling.

## Art pipeline

Who makes the art: there is no illustrator in the project, and agents cannot draw raster art by hand. The pipeline below lets an image-generation model make the pictures and agents do the rest. A human (Tjitse) approves the style once, at the start.

1. **Style sheet.** Write a short style guide (the section above) and generate 10 to 20 candidate images of one baby unicorn and one background. Tjitse and Emma pick one. That image becomes the style reference for everything after.
2. **Character model sheet.** From the reference, generate the baby unicorn in a few fixed poses (stand, sit, sleep, happy jump) on a plain background, with an image model that accepts reference images. Keep the same seed, prompt and reference across all generations.
3. **Cut-out parts.** Split the standing pose into layers: body, head, two eyes (open and closed), mane, tail, four legs, horn, cheeks. Clean edges, remove the background, export each part as a greyscale or white WebP for colourable parts, and a full-colour WebP for fixed parts. Record pivots (neck, tail root, hips) in a JSON rig file.
4. **Code animation.** Idle breathing, blinking, tail swish, ear twitch, head tilt, hop, happy wiggle and sleep are tweens on the rig parts (CSS or Web Animations). Agents can read and change these. Accessories (bows, crowns, saddles, pins) attach to named anchor points in the rig.
5. **Items and stickers.** Generated in the same style on a plain background, cut out, exported at 2x. One WebP atlas per chapter keeps requests low.
6. **Backgrounds.** Generated at 2360 x 1640 or larger, painted over where the image model makes mistakes, split into back and front layers.
7. **Checks.** A contact sheet page shows every asset at its real size on the iPad viewport, for a picture check by Tjitse, and a script checks size, transparency and file weight.

Animation tools considered:

- **Code tweens on a cut-out rig (recommended).** Text-based, agents can change it, no licences, works in the DOM and in PixiJS.
- **Rive** (`@rive-app/canvas` 2.44.2, `@rive-app/webgl2` 2.44.2). Best quality for interactive characters, with state machines and runtime data binding for colours. But `.riv` files are made in the Rive editor by a person, agents cannot edit them, the free plan shows a splash screen ($9 per seat per month removes it) and each instance is a canvas. Consider it later for one hero character (Queen Lumi) if a human animator joins.
- **Spine** (`spine-pixi-v8` and `spine-phaser-v4` 4.3.13). Strong skeletal animation, but needs a paid editor licence ($69 Essential, $379 Professional) to use the runtimes, and a person to rig and animate.
- **Lottie** (`lottie-web` 5.13.0, last release May 2025). Made in After Effects, weak at interaction and runtime colour changes. Fine for a one-off celebration burst at most.
- **Inline SVG and CSS (v2).** Agents can draw it, but it looks like a mockup. Keep SVG for icons and UI shapes only.

## Main risk

**The DOM may not keep 60 fps on Emma's iPad when a scene shows many rigged unicorns at once.** Ten babies with about 12 animated layers each is 120 composited layers, plus the images in memory. The herd grows past 20 within weeks.

How to settle it in week one, before any other scene is built:

1. Build one rigged baby unicorn from real generated art.
2. Make a stress page: the meadow background with 24 babies, all idling (breathe, blink, tail), 4 of them walking, and one being dragged.
3. Test it on Emma's iPad in Safari, with Safari Web Inspector on the Mac (Timelines, frames and memory).
4. Pass: steady 60 fps (at worst short drops to 45) and no page reload after 10 minutes. Fail: move the meadow scene to a PixiJS v8 canvas inside the Svelte app, keep all other scenes in the DOM.

Smaller risks:

- Generated art drifting off-model. Mitigate with one locked reference sheet, a fixed rig and a picture check of every new asset batch.
- Storage eviction. Mitigate with home-screen install, `persist()`, and export as a routine (for example the parent corner reminds once a week).
- Audio memory with a large clip library. Mitigate with per-scene preload and release.

## Sources

- Phaser 4 releases: https://phaser.io/download/phaser4
- Phaser 4.2.1 package on npm (README, `skills/`, `dist/` sizes measured locally): https://www.npmjs.com/package/phaser
- Phaser issue #7392, black text boxes on older iOS: https://github.com/phaserjs/phaser/issues/7392
- WebKit storage policy (Safari 17): https://webkit.org/blog/14403/updates-to-storage-policy/
- Home-screen apps and the 7-day rule: https://developer.apple.com/forums/thread/710157 and https://bugs.webkit.org/show_bug.cgi?id=237350
- WebGL context loss on iPadOS: https://bugs.webkit.org/show_bug.cgi?id=261331 and https://bugs.webkit.org/show_bug.cgi?id=289601
- Canvas memory limit on iOS: https://bugs.webkit.org/show_bug.cgi?id=217581
- PixiJS updates: https://pixijs.com/blog/june-2026
- Rive web runtime and parameters: https://rive.app/docs/runtimes/web/ and https://rive.app/docs/runtimes/web/rive-parameters
- Rive pricing: https://rive.app/pricing
- Spine licensing: https://esotericsoftware.com/spine-purchase
- Lottie vs Rive on mobile: https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation
- Reference-locked character generation: https://sorceress.games/blog/ai-character-generator-stay-on-model-with-reference-images-2026
- npm registry for all version numbers and dates: https://registry.npmjs.org/
