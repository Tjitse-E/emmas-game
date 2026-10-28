# ui: notes

The 2D layer lives in `src/ui/`. Entry: `createLayer(root, deps)` in `src/ui/index.ts`. It implements every member of `Layer` in `src/contracts.ts`.

## Wiring

1. Give the layer its own element above the canvas: `const layer = createLayer(document.getElementById('ui')!)`. The layer makes that element `position: fixed` over the whole viewport with `pointer-events: none`, so taps on empty space reach the canvas. `deps` is optional and not used.
2. `createLayer` also installs the touch guards (no pinch or double-tap zoom, no long-press callout, no text selection, `touch-action: none` on `html` and `body`), the Andika font, the home button (top right) and the turn-the-iPad picture for portrait.
3. Start: `await layer.start(() => void audio.unlock())`. The callback runs inside the Play button's `pointerdown`. Elizabeth's `platform-turn` line only plays after that tap.
4. Lumi starts hidden. Call `layer.lumi.show(true)` when she should appear. The layer never shows Lumi or the food basket by itself. A tap on her calls the handler from `layer.lumi.onTap(fn)`; without a handler it calls `layer.replay()`.
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

- Word pictures (the wish basket, the food basket) go through `wordPicEl(item, cls)` in `dom.ts`: a plain img, or for a `tint` a box with v3's look (`tintedPicStyle` in `geometry.ts`: the colour multiplied over the picture and masked by it, with the `-webkit-mask-*` names for Safari 15). A flyer is a clone, so it keeps the colour. `dev/content.html` draws tinted pictures the same way.
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
- The home button needs a 1 s hold while a pink ring fills; a quick tap only wiggles it and sliding off cancels. The hold runs on `press()` (`src/ui/press.ts`): a release anywhere (the window hears it too), a cancel, a lost capture or another touch cancels it, so it can never finish by itself after a release that missed the button.
- Every simple tap (`onPress` in `dom.ts`: Lumi, the arrow, the food basket button, the play-again moon) runs on `press()`. A release that only the window hears still taps when it is on the element or within 12 px of it, and so does a lost capture with the finger last seen there. A pointercancel or a new touch elsewhere is no tap. It goes to `/index.html` under the path before `/games/moon-meadow-world/` (Emma's server, test servers, online). In `vite dev` it goes to `/`.
- `sky(t)` fades two alpha-only gradient layers over 2 s: a pink-gold sunset wash and a faint blue night vignette.
- `theEnd({ herd, members })` is a fully opaque night screen. Each member is a v3 moon baby tinted to its coat and mane on a canvas (`src/ui/tint.ts`, layer boxes copied from v3's `public/art/manifest.json`), with the flat pictures as a fallback after 1.5 s. The new babies sit alone in the first row, bigger, with name tags; the herd fills the second row.
- Clips used directly by the layer: `platform-turn` (v3 core). Sound effects: `tick`, `pop`, `chime`, `sparkle`. Letter sounds go through `audio.sound`, so `a-e` and capitals such as `Th` work.

## The customiser (2.2.0, `layer.wardrobe`)

Files: `src/ui/wardrobe.ts` (the DOM), `src/ui/wardrobe-ctl.ts` (the rules without the DOM: `Rails`, `WordVoice`, `railPress`), `src/ui/swatches.ts` (every picture as inline SVG from `src/wardrobe.ts`), `src/ui/wardrobe.css`, and `wardrobeLayout(w, h)` and `cellAt` in `src/ui/geometry.ts`.

- Layout: `wardrobeLayout(w, h)` gives every box in CSS px (panel, rows, tiles, rails, swatches, Done, preview, pill, home). Place Princess Emma at x = `panel.x / 2` (the design's `xFrac = (panel.x / 2) / w`). The DOM is placed from the same function, so the game, the tests and the screen agree.
- Call it after the sweep, with Lumi hidden (`layer.lumi.show(false)`) and `g.free` false. The panel slides in from the right (400 ms); the rails, tiles, preview and Done take touches only after that, and only then do `clips.ready` (and `clips.firstTime` on the first visit) play.
- The promise resolves on Done's pointerdown with her look. Any gown or style still waiting is applied through `onLook` first. The layer plays the `chime` sfx and `clips.done`, then the panel slides out and removes itself. Run the `curtsy` emote when it resolves; do not play the chime again.
- `onLook(look, row)`: hair, eyes and hair things at once on every new cell; gown and style 150 ms after the finger rests on a cell (a slide over four styles builds the hair once). A ribbon change also comes as `onLook(look, 'thing')`.
- `onPicked(look, row)`: once at the end of every rail gesture, however it ends (release anywhere, cancel, lost capture, a new touch), and on a row tile tap. It also comes when nothing changed (a tap on what she wears, a tile tap, the ribbon tap with only pink), so play the row's reaction and the 3D sparkle on that part every time, and save. The layer plays `pop` when the look changed, and `sparkle` plus a 2D sparkle on the swatch for the ribbon tap.
- The ribbon tap: a tap on the hair thing she wears, without leaving that cell, moves to the next colour she owns (`ribbons`, pink first, round again). With only pink it is just the sparkle.
- `onFocus(row)`: on every touch of a row's rail or tile that is not the focused row. `onFocus(null)` comes 2.5 s after the last rail or tile touch, for every row; a finger on the preview holds it. Map eyes and hair things to the face frame and the rest (and null) to the body frame.
- `onTurn(dxPx, ended)`: dx is the movement since the last call in CSS px (positive to the right), and the layer keeps the sum within 340 px (170 degrees). Use `princess.turnBy(dx * Math.PI / 360)` (1 degree per 2 px). The end comes once as `onTurn(0, true)`; then ease her back to face the camera. A touch that moves less than 10 px is a tap: `onPreviewTap()` (wave).
- Words: on every rail release the option's word clip plays (when it has one), at most one per 1.2 s, never over the guidance lines (only the newest waits), with the printed word in a pill above her for 1.5 s.
- First visit: after 8 s without a touch (counted from the end of the guidance) the ghost hand slides along the gown rail over three gowns and back. She really changes (`onLook`, no `onPicked`). Any touch stops it and puts her gown back at once, before the touch selects anything. After 25 s without a touch `clips.idle` plays once. `layer.idleNow()` runs the next of the two at once.
- `reset()` closes the customiser at once; its promise stays pending. Nothing is called after a reset.

## Offer bubbles (2.2.0, `layer.offer`)

`layer.offer(id, { pic, at, onTap })` shows a round picture bubble that follows `at()` every frame, above the point, kept on screen and out of the top corners. While the point is off screen (or behind the camera) the bubble waits at the screen edge in the point's direction, without its tail and clear of the food basket, so a waiting quest always shows (integration fix: from free play's first spot both places are off screen). It acts on pointerdown, then pops away by itself, so `offer(id, null)` after a tap is not needed (and does nothing). Calling `offer(id, …)` again replaces it. The bubbles sit under the moment panels; `reset()` removes them. Pictures used in the harness: `wordPic('picnic')` and `v3Art('items/item-hay-bundle.webp')`.

## Extras for the test hook (optional members on the returned object)

- `layer.snapshot()` returns `{ moment, wardrobe, targets }`. `wardrobe` is `{ open, focus }` while the customiser is on screen (`open` is true only while it takes touches, not while it slides) and null otherwise. `moment` is `{ kind, phase, level, misses, answer, targets }` or null; `answer` names the target that answers it now (`stone 5`, `gem P`, `star`, `item plum`). Each target is `{ name, x, y, w, h }` in CSS px (centre and size): `stone 5`, `cups`, `bell Pip`, `baby`, `gem P`, `slot 1`, `star`, `star end`, `item plum`, `bubble`, `dot 1 p`, plus `lumi`, `home`, `arrow`, `food basket`, `food plum`, `play`, `play again`. While the customiser takes touches: `row hair` (the tiles), `rail hair`, `swatch hair sunny`, `done` and `preview`. Offer bubbles: `offer picnic`.
- `layer.idleNow()` runs the open moment's next idle step at once (also while speech plays). In the customiser it runs the ghost slide (first visit), then the idle line. Returns false when there is nothing to run.
- To pick in a flow: press on a `swatch` centre and release (the rail reads the cell from x, so a release anywhere ends it). The `done` target appears once the panel has slid in.
- The egg moment's snapshot has `covered` (the blanket is down). `ghost.drag` takes the options `follow` and `ms`.
- To slide the star in a flow: press on `star`, move to the right end of `star end`, release.

## Harness

`dev/ui.html` with `src/ui/dev.ts`: a pastel stand-in world with a drifting fake baby and egg, and dev buttons for every part (hidden with the `clean` button or `document.body.classList.add('clean')`). `window.__ui` is the layer and `window.__dev.run(name)` runs a part. `wardrobe`, `wardrobe first` (with the ghost slide) and `wardrobe gifts` (three ribbons owned) open the customiser with a flat stand-in Princess Emma drawn from the swatch pictures; she twirls, tilts and zooms to her face like the game will. `__dev.look()` is her look. `offers` shows two drifting offer bubbles. Press Play first. In playwright-cli, do not return the promise of `__dev.run('wardrobe')` from `eval` (it waits for Done). Run `MMW_VITE_CACHE=node_modules/.vite-ui npx vite --port 8783 --strictPort --host 127.0.0.1` and open `http://127.0.0.1:8783/dev/ui.html`.
