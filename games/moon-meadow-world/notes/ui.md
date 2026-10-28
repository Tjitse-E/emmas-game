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

## The wardrobe (2.3.0, `layer.wardrobe`)

Files: `src/ui/wardrobe.ts` (the DOM), `src/ui/wardrobe-ctl.ts` (the rules without the DOM: `Rails`, `railPress`, `tabPress`, `WordVoice`, `pillOf`, `Fingers`, `boardRows`), `src/ui/musicbox.ts` (`BoxClock`: the tune, the beads, "Nearly ready!"), `src/ui/swatches.ts` (every picture as inline SVG from `src/wardrobe.ts`), `src/ui/board.ts`, `src/ui/gift.ts`, `src/ui/wardrobe.css`, and `wardrobeLayout(w, h)`, `railIn`, `boardLayout`, `giftCards` and `cellAt` in `src/ui/geometry.ts`. docs/v4/2.3.md section 16 is the design.

- Layout: `wardrobeLayout(w, h)` gives every box in CSS px: the panel (as 2.2), six tab tiles in the icon column, five rows, Done, the preview, the pill, the music box and its six beads. Place Princess Emma at x = `panel.x / 2`. A rail of n cells is `railIn(rows[spec.row], n)`.
- Tabs: hair, eyes, gown, crown, shoes, sparkles (`TABS`). A tab acts on pointerdown: the rails change while the finger is on it, and press() has already ended a palm on a rail as a release. The crown tab's place stays empty until `crownTab`. The panel opens on the hair tab, or at the Corner on the tab of today's newest gift (`board.fresh`).
- Rails: `railsOf(tab, owned)`; every field keeps its rows, so nothing moves when she earns an item. Only owned options show. A field whose only option is 'none' has no rail, and the jewel colour shows only with a jewel.
- `onLook(look, field)`: colours, eyes, extras and jewels at once on every new cell; gown, crown, shoes and style 150 ms after the finger rests on a cell. `onPicked(look, field)`: once at the end of every rail gesture, however it ends, and on a tab press (its first field), also when nothing changed. `onFocus(tab)`: on every touch of a tab or its rails that is not the framed tab; `onFocus(null)` 2.5 s after the last touch. The eyes and sparkles tabs use the face frame (`TABS[].frame`).
- The one sound of a pick: its word (`wordOf`) when it has one, at most one per 1.2 s, never over guidance; a pick that says a word plays no effect. A gown shape or extra without a word, or picked inside the 1.2 s word gap, plays `dress-swish`; its word is then not kept, and a word still waiting goes too (during a guidance line its word waits as usual). A crown shape without a word plays `crown-twinkle` (both through `audio.fx` with the `pop` fallback while the files do not exist), anything else without a word `pop`. `tick` and `pop` are skipped while Elizabeth speaks. A tap on what she wears hops and says its word again.
- The pill prints one-syllable words of at most five letters (`pillOf`), in the normal ink (`PRINT_INK`), never in the colour itself.
- The music box (`BoxClock`) starts when the rails take touches (after the slide-in and the board): `audio.musicBox(limitMs)`, `onBox(true)`, a bead fades every limitMs / 6, `clips.nearly` at limitMs - 15 s (it waits at most 3 s for speech, then it is skipped; a box of 15 s or less has none). At the end `onBox(false)`, the panel takes no new touch and says no more words; a finger still on a rail keeps its gesture. It waits until no finger is down (`Fingers`: window pointerdown, pointerup, pointercancel and lostpointercapture in the capture phase), at most 2 s, then resolves `{ look, end: 'time' }`. Done (pointerdown) resolves `end: 'done'` and stops the tune. Both stop speech, play `chime` and then `clips.done` when the chime is over (at most 1 s later, and only when no other speech has begun by then); the panel slides out by itself.
- First visit: after 8 s without a new touch (counted from the end of the guidance) the ghost taps the gown tab and slides along the gown colour rail over three colours and back. Only a finger on a rail or on the preview holds it and the idle line back, not a thumb resting elsewhere. Today's gifts on their rails glow four times, then stay still. She really changes (`onLook`, no `onPicked`). Any touch stops it and puts her look back at once. After 25 s without a touch `clips.idle` plays once. `layer.idleNow()` runs the next of the two at once.
- `reset()` closes the wardrobe at once and stops the tune; its promise stays pending.

## The treasure board (2.3.0, `board.ts`)

`showBoard(parent, spec, ms, { look, screen })` and `layer.board(spec, ms = 3500)`: the trunk lid on the preview side, a row per gift set (4, 3, 6, 8 places) and the five goodnight ribbons. An owned item shows `giftSwatch`, an empty place the quest's picture (`spec.pics`, the moon for ribbons) at 40%, a full row a gold star sticker; `fresh` items sparkle. It opens with `trunk-lid` and folds away after `ms`. Nothing on it is a target. `layer.board` draws the gifts in the look of the last wardrobe or gift picker.

## The gift picker (2.3.0, `layer.gift`)

One or two cards of 220 x 260 design px, centred, 60 apart (`giftCards`). `clips` play first; the cards take touches after their pop-in (420 ms). A card acts on pointerdown: speech stops, `gift-paper` plays a task later (once the cut line has let go of the speech count), the other card fades, the chosen one pops and nine sparkles fly to `to()`; it resolves with the item when they have landed. No pick: the line again after 12 s, the ghost taps a card after 24 s. Targets: `gift <id>`. Never a checked moment. `items: []` rejects at once (no picker when every set is full).

## Offer bubbles (2.2.0, `layer.offer`)

`layer.offer(id, { pic, tint, badge, at, onTap })` shows a round picture bubble that follows `at()` every frame, above the point, kept on screen and out of the top corners. While the point is off screen (or behind the camera) the bubble waits at the screen edge in the point's direction, without its tail and clear of the food basket. It acts on pointerdown, then pops away by itself. `badge` (2.3.0) is a small round picture on the bubble's rim: `giftSwatchUrl(item, look)` of a gift the quest can still give. Calling `offer(id, …)` again replaces it. The bubbles sit under the moment panels; `reset()` removes them.

## Extras for the test hook (optional members on the returned object)

- `layer.snapshot()` returns `{ moment, wardrobe, targets }`. `wardrobe` is `{ open, tab, focus, box: { limitMs, leftMs } }` while the wardrobe is on screen (`open` is true only while it takes touches: not while it slides, shows the board or waits at the end) and null otherwise. `moment` is `{ kind, phase, level, misses, answer, targets }` or null; `answer` names the target that answers it now (`stone 5`, `gem P`, `star`, `item plum`). Each target is `{ name, x, y, w, h }` in CSS px (centre and size): `stone 5`, `cups`, `bell Pip`, `baby`, `gem P`, `slot 1`, `star`, `star end`, `item plum`, `bubble`, `dot 1 p`, plus `lumi`, `home`, `arrow`, `food basket`, `food plum`, `play`, `play again`. While the wardrobe takes touches: `tab hair`, `rail gownColour 1` (the field's second rail), `swatch gownColour green`, `done` and `preview`. The gift picker: `gift tiara`. Offer bubbles: `offer picnic`.
- `layer.idleNow()` runs the open moment's next idle step at once (also while speech plays). In the wardrobe it runs the ghost slide (first visit), then the idle line; in the gift picker the line again, then the ghost tap. Returns false when there is nothing to run.
- To pick in a flow: press on a `swatch` centre and release (the rail reads the cell from x, so a release anywhere ends it). Tap `tab gown` first for another tab. The `done` target appears once the panel takes touches.
- The egg moment's snapshot has `covered` (the blanket is down). `ghost.drag` takes the options `follow` and `ms`.
- To slide the star in a flow: press on `star`, move to the right end of `star end`, release.

## Harness

`dev/ui.html` with `src/ui/dev.ts`: a pastel stand-in world with a drifting fake baby and egg, and dev buttons for every part (hidden with the `clean` button or `document.body.classList.add('clean')`). `window.__ui` is the layer and `window.__dev.run(name)` runs a part. The wardrobe runs draw a flat stand-in Princess Emma from the swatch pictures; she twirls, tilts and zooms to her face like the game will: `wardrobe` (the start mirror, 45 s), `wardrobe first` (no crown tab, the ghost slide), `wardrobe corner` (some gifts owned, the board, 60 s), `wardrobe all` (every gift), `wardrobe short` (8 s, to see the kind ending). `gift` and `gift one` open the gift picker, `board` the board on its own, `offers` two drifting bubbles with gift badges. `__dev.look()` is her look. Press Play first. In playwright-cli, do not return the promise of `__dev.run('wardrobe')` from `eval` (it waits for Done). Run `MMW_VITE_CACHE=node_modules/.vite-ui npx vite --port 8783 --strictPort --host 127.0.0.1` and open `http://127.0.0.1:8783/dev/ui.html` (a lane uses its own port).
