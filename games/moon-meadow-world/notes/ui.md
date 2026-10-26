# ui lane: notes for the integrator

The 2D layer lives in `src/ui/`. Entry: `createLayer(root, deps)` in `src/ui/index.ts`. It implements every member of `Layer` in `src/contracts.ts` as written. No contract change is needed.

## Wiring

1. Give the layer its own element above the canvas: `const layer = createLayer(document.getElementById('ui')!)`. The layer makes that element `position: fixed` over the whole viewport with `pointer-events: none`, so taps on empty space reach the canvas. `deps` is optional and not used.
2. `createLayer` also installs the touch guards (no pinch or double-tap zoom, no long-press callout, no text selection, `touch-action: none` on `html` and `body`), the Andika font, the home button (top right) and the turn-the-iPad picture for portrait.
3. Start: `await layer.start(() => void audio.unlock())`. The callback runs inside the Play button's `pointerdown`. Elizabeth's `platform-turn` line only plays after that tap.
4. Lumi starts hidden. Call `layer.lumi.show(true)` when she should appear. A tap on her calls the handler from `layer.lumi.onTap(fn)`; without a handler it calls `layer.replay()`.
5. Every moment closes its own panels before it resolves. Opening a new moment closes one that is still open.

## Anchors and camera framing

- `egg`: `hooks.anchor()` is the egg's centre on screen. A stone counts when it is dropped on the cups panel or within 170 design px of the anchor. The cups panel sits at the bottom, centred 96 design px left of the screen centre, and the stone tray is on the right edge. Frame the egg with `shiftY` around -0.12, so it sits above the cups panel.
- `naming` and `wish`: `hooks.anchor()` is the top of the baby's head. The layer treats a box 300 x 320 design px around it (from 110 above the head down) as the baby, for drops and the name tag. Naming puts the bells and later the name tag in the lower half, so frame the baby in the upper third (head top at about 25 to 30 percent of the screen height). The wish bubble sits above the head and the basket at the bottom centre, so the head top can be at about 40 percent.
- One design px is `min(width / 1180, height / 820)` CSS px.

## Reactions the layer asks for (`hooks.react`)

| Moment | When | Kind |
|---|---|---|
| egg | right stone, after the praise | `warm` |
| egg | warm stone too big, snow stone too small | `hot` |
| egg | warm stone too small, snow stone too big | `cold` |
| naming | a wrong build | `look` |
| naming | the name tag lands on the baby | `happy` |
| wish | the right item | `munch` (food) or `play` (bath) |
| wish | a wrong item, as it bumps into the baby | `shake` |

`hooks.log` gets `egg`, `egg-miss`, `name-chosen`, `naming`, `naming-miss`, `wish` and `wish-miss` events, and `tried` with `{ what }` once for every wrong stone, item and build (the game keeps them as `detail.tried`). The moment's promise resolves with `{ outcome, misses, ms }` (naming adds `name`).

## Behaviour worth knowing

- Hint ladder (`src/ui/ladder.ts`, ported from v3): 15 s idle (10 s for the wish) repeats the goal, a second idle or one miss gives the focused hint, two misses bring the ghost hand. An idle step waits while speech plays. Any answer after the focused hint (level 2) is `helped`, whether a miss or idling brought it, and so is an answer after the ghost. As the focused hint always runs right after a miss, `miss` no longer happens in eggs, wishes or naming.
- `ms` runs from the moment input is on to the first touch of the object she then chose. `restartIdle()` after the goal speech makes the idle wait count from the end of the goal.
- Egg: on the warm egg a quilted blanket covers every place after the warm cups (a whole nest gets one blanket). A dropped stone lifts it, so its effect shows, and the focused hint lifts it and counts the cold cups (`clips.count`) while each pulses. On the snow egg the extra cups look like the other warm cups until a miss or the focused hint marks and counts them. `clips.afterGoal` is said once: after the first goal, at her first stone tap if she was already touching, or with the first idle repeat.
- Naming: after two misses the ghost sends wrong gems home, drags the right gem into every empty slot and slides the star, so each sound plays; the moment ends `helped`. The bells line repeats after 20 s, 25 s and then every 30 s; after every second repeat the ghost taps a bell and it rings its name.
- Wish: a wrong item shakes the baby and plays `foal-silly`; the hint waits for the giggle.
- A touch on a stone, gem, star, dot or basket item stops speech first, then plays its sound. The dots ignore touches while the moment is busy.
- The egg and gem demos are skipped once she has touched anything, or while the moment is busy.
- Turning the iPad back to landscape replays the goal when a moment is open and not busy.
- First-time memory (egg intro per kind, the egg drag demo, the bell tap and drag demos, the gem demo, the slider demo) lives in the layer. `reset()` clears it, so every new play is the first day again.
- `reset()` closes the open moment, the arrow, the tags, the food tray, the curtain and any full screen, and stops all sound. A moment's promise stays pending after a reset; the game should drop its awaits with its own run token.
- `ghost.tap` and `ghost.drag` never start while a finger is on the screen, and any touch hides the hand at once.
- `foodBasket({ show, foods, drop })`: passing `foods` again with a new array rebuilds the tray; `{ show: false }` hides it and keeps the foods.
- `arrow(goal, onTap)` follows `goal.at()` every frame. It hides while the point is on screen or less than 40 CSS px past an edge. Points behind the camera (not visible but projected inside the screen) point the other way. It keeps clear of Lumi, the home button and the food basket.
- `tag(name, at, ms)` follows `at()` every frame and hides while `at().visible` is false. Several tags can show at once.
- The home button needs a 1 s hold while a pink ring fills; a quick tap only wiggles it and sliding off cancels. It goes to `/index.html` under the path before `/games/moon-meadow-world/` (Emma's server, test servers, online). In `vite dev` it goes to `/`.
- `sky(t)` fades two alpha-only gradient layers over 2 s: a pink-gold sunset wash and a faint blue night vignette.
- `theEnd({ herd, members })` is a fully opaque night screen. Each member is a v3 moon baby tinted to its coat and mane on a canvas (`src/ui/tint.ts`, layer boxes copied from v3's `public/art/manifest.json`), with the flat pictures as a fallback after 1.5 s. The new babies sit alone in the first row, bigger, with name tags; the herd fills the second row.
- Clips used directly by the layer: `platform-turn` (v3 core). Sound effects: `tick`, `pop`, `chime`, `sparkle`. Letter sounds go through `audio.sound`, so `a-e` and capitals such as `Th` work.

## Extras for the test hook (optional members on the returned object)

- `layer.snapshot()` returns `{ moment, targets }`. `moment` is `{ kind, phase, level, misses, answer, targets }` or null; `answer` names the target that answers it now (`stone 5`, `gem P`, `star`, `item plum`). Each target is `{ name, x, y, w, h }` in CSS px (centre and size): `stone 5`, `cups`, `bell Pip`, `baby`, `gem P`, `slot 1`, `star`, `star end`, `item plum`, `bubble`, `dot 1 p`, plus `lumi`, `home`, `arrow`, `food basket`, `food plum`, `play`, `play again`.
- `layer.idleNow()` runs the open moment's next idle step at once (also while speech plays). Returns false when no checked step is open.
- The egg moment's snapshot has `covered` (the blanket is down). `ghost.drag` takes the options `follow` and `ms`.
- To slide the star in a flow: press on `star`, move to the right end of `star end`, release.

## Harness

`dev/ui.html` with `src/ui/dev.ts`: a pastel stand-in world with a drifting fake baby and egg, and dev buttons for every part (hidden with the `clean` button or `document.body.classList.add('clean')`). `window.__ui` is the layer and `window.__dev.run(name)` runs a part. Run `MMW_VITE_CACHE=node_modules/.vite-ui npx vite --port 8783 --strictPort --host 127.0.0.1` and open `http://127.0.0.1:8783/dev/ui.html`.

## Not done

- No new packages were installed.
- The integrator decides when to show the food basket and Lumi; the layer never shows them by itself.
