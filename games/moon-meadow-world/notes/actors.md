# Actors: notes

The actors live in `src/actors/`. Entry: `createActors(scene, deps)` in `src/actors/index.ts`. It implements `Actors` from `src/contracts.ts` and adds a few optional extras (type `ActorsImpl`). The harness is `dev/actors.html` (with `src/actors/dev.ts`). Unit tests are in `tests/actors.test.ts`.

## Wiring

```ts
import { createActors } from './actors';
const actors = createActors(world.scene, {
  route: (a, b) => world.route(a, b),
  isWalkable: (p) => world.isWalkable(p),
  nearestWalkable: (p) => world.nearestWalkable(p),
  heightAt: (p) => world.heightAt(p), // optional extra: feet stay on the nest mound
});
world.onFrame((dt, t) => actors.update(dt, t));
world.follow(() => ({ x: actors.princess.position.x, z: actors.princess.position.z }));
// A tap: const u = actors.herd.pick(world.ray(x, y));
```

- Pass the world functions as closures (or bound), not as bare methods.
- The actors add no lights and need no camera. They see the camera that drew the last frame (through `onBeforeRender` of their shadow mesh) and use it to cull unicorns that are off screen and to choose the detail level. Nothing to wire.
- Checked at runtime inside the world harness (`dev/world.html` with the actors added from the console): walking, the slide with followers, swimming, the egg in the nest and stall moves all line up with the world's slide, nest and stable. Together: 38 to 40 draw calls, 63,000 to 71,000 triangles.

## Extras (optional, not in the contract)

- `actors.sounds` (default true): the actors play `audio.sfx('whoosh')` when a rider starts down the slide and `audio.sfx('splash')` when someone lands in the water, hops in or splashes a friend. The game should not play these again. Set it to false to keep all sound in the game.
- `actors.placePrincess(at, heading)` and `princess.place(at, heading)`: put her somewhere at once (for `jump()`). Followers line up behind that heading.
- `unicorn.place(at, yaw)`: put a unicorn somewhere at once, idle.
- `unicorn.putInStall(door, peek = true)`: put a unicorn straight into its stall, facing out (for `jump()` to bedtime).
- `unicorn.look` can be set: a new look recolours and resizes at once.
- `herd.add/get/all/pick` return `UnicornActor` (a `Unicorn` with the extras above).
- `actors.stats()`: how many unicorns were drawn in full detail, cheaply or culled last frame. Useful for `?perf=1`.
- `actors.setDetail(level)` (now in the contract): 0 full (5 unicorns in full detail, the rest posed every 3rd frame), 1 (3, every 4th), 2 (2, every 6th). Wire it to `world.onSlow`.
- `deps.heightAt(p)`: optional. Without it the ground is flat at y = 0.

## Behaviour to know

- Routes: walkers follow the points from `deps.route`. A first point where the walker already stands is skipped (the world's routes start with `a`).
- Princess Emma: `walkTo` resolves true on arrival and false when replaced. `rideSlide()` walks to `SLIDE.ladderBase`, waits for the ladder (she goes to the front of the line), climbs, sits, slides, splashes, swims to the nearest `POND.exits` point and climbs out; it resolves when she stands on the grass. A `walkTo` during the climb, slide or swim is kept and done after she has climbed out (its promise resolves then). `stop()` is ignored in that part.
- Her followers (unicorns in mode `follow`) join the slide line behind her when she starts a ride, ride one by one, swim 4 to 7 s (shorter than the 6 to 12 s of other swimmers, so they catch up) and go back to following.
- The Herd does not enforce three followers: the game decides who follows and in which slot. Followers play when she has stood still for 1.5 s: little circles in front of her, hops, or one comes for a nuzzle with hearts.
- The slide uses u as the arc-length fraction of `SLIDE_CURVE` (`getPointAt`). Riders sit at the curve's highest point (u about 0.36, a little past `climbEnd`) and slide with their bottom on the curve, so the world's chute surface should be at the curve. It is in the world's build.
- One rider is on the ladder or the top at a time: the next one starts climbing when the rider before starts sliding down. A unicorn dropped in `SLIDE.dropZone` is put on the top at once and slides, even if someone is climbing (they can meet on top for a moment).
- `drop(p)`: in `SLIDE.dropZone` it slides; in the pond it swims; anywhere else it lands on `nearestWalkable(p)` and grazes there, and that ends following. After a slide or pond drop a follower goes back to following.
- `swim()` from the grass: it trots to the nearest shore and hops in. Any command for the grass given while a unicorn swims (goTo, follow, graze, enterStall, rideSlide) waits until it has swum to the nearest exit and climbed out; the promise resolves after that. `lift()` works at once.
- `enterStall(door)`: walks to `doorFront(door)`, then steps in through the door (lower) or floats up on a moonbeam (upper), turns to face south and resolves. The game opens and closes the door. After entering it peeks (stands on a straw heap the actors draw, head over the half door).
- `peek(false)`: it lies down, shuffles 0.5 m back into the stall and is then not drawn and not pickable. A 45 degree camera sees over a half door, so lying down alone does not hide it. `peek(true)` brings it back up.
- Peeking in a lower stall it steps 0.45 m forward (0.3 m behind the door) onto a straw bed 0.18 m higher, so the balcony and the arch do not hide its face from the raised camera: the whole head shows over the half door at the stable framing, also with a nightcap (which droops to the side). Upper stalls are unchanged.
- `mode` is `walk` while a unicorn walks to its stall door and `stall` once it steps in.
- `hatching`: added with `mode: 'hatching'`, it sits with closed eyes, wobbles, blinks open and stands up after about 2.6 s, then is idle. Any command ends it earlier.
- `headTop()` is just above the horn tip, for bubbles and name tags.
- `herd.pick(ray)`: a sphere of 0.56 m (baby) or 0.66 m (foal) around a point between the body and the head, or a tap within 32 CSS px of that point on screen, whichever is bigger (so far unicorns are never under 64 px). The one the finger is most squarely on wins, then the nearer one. The screen test needs a ray from `setFromCamera` (`world.ray` gives one); the canvas size comes from the renderer each frame.
- `emote()` plays on top of whatever it does and resolves at the end. `happy` and `nuzzle` send up hearts.
- `showToy(url)`: a small picture (1 draw call each while shown). On land it lies on the grass at its front feet, a little to the side; while it swims it bobs beside it at head height. Textures are cached per URL. `{ tint }` colours a greyscale picture through the material colour (a uniform, so no new program). Each unicorn keeps its toy sprite between toys: disposing it would free the sprite program and the next toy would link it again. `main.ts` compiles that program at boot with a toy on the first herd unicorn. `showToy(url, { on: 'head' })` (the dress-up wish's `wear`): a 0.4 m picture worn on top of its head, a little behind the horn, following every nod, walk and swim until `showToy(null)` or another picture.
- The egg: `place(at, kind)` takes the egg's centre (`NEST.eggY` in the nest). A point with y below 0.3 (the egg is 0.6 m tall) is lifted so it rests on the ground, so the wild egg can be placed with y = 0. `hatch()` cracks (3 stages), wobbles hard, pops the top and bursts in sparkles and hearts after about 1.9 s; it resolves at the burst and the egg hides itself 0.9 s later.
- `fx.starfall` resolves when the stars have landed (about 1.3 s). `fx.moonbeam` resolves after `ms`; it is warm (`#fff1c4`) with a soft glow and a breathing gold ring on the ground.
- The too-hot steam is 5 big, slightly warm white puffs per burst. The snow egg has a deeper blue edge so it shows on the sand.
- Princess Emma: by default a pale blonde (`#ffdf86`) with a deep warm gold crown (`#f5a623`, a light rim) about 1.3 times her first one. Her ponytails are tubes up to 8.5 cm thick that hang from close to the head; the chain keeps them out of her head and dress. The ribbon bows are 1.5 times bigger, with a light knot and two streamers, so a new ribbon colour reads at a glance at a 9 m frame. Her wardrobe is below.

## The wardrobe on Princess Emma (2.2.0, docs/v4/2.2.md 2.4 to 2.6)

Files: `src/actors/princess.ts` (the actor), `hair.ts` (colours and styles: chains, tubes, plaits, bun), `looks3d.ts` (gown colours by dress role, sit squash, skirt tables, the six hair things, ribbon tails, wings, back bow, rose), `shapes.ts` (the three dress shapes by role), `ponytail.ts` (HairTubes: recolour, draw range, 12 sides; `chainPoint`), `parts.ts` (capacities, the overflow warning, `shapeTriangles`). Ids and swatch colours stay in `src/wardrobe.ts`.

### The API (src/contracts.ts Princess)

- `setLook(partial)`: missing fields keep what she wears; unknown ids fall back (normaliseLook). Colours change at once (cap, fringe, side locks, nape, tubes, plait lobes, bun, iris, ribbon). A gown swaps the dress mesh's geometry to its shape (built once, the first time a shape is worn) and repaints its vertex colours; same material, colour item size 3, so no program compiles. A style builds new chains and covers the pop with a sparkle in the hair colour (only after her first drawn frame, so setting the saved look at boot sparkles nowhere). Goodnight: `setLook({ ribbon })`.
- `emote(kind)`: the wardrobe's reactions are `toss` (1.0 s), `blink` (1.6 s), `show` (1.6 s), `tilt` (1.2 s) and `curtsy` (1.2 s), as the table in 2.4. The actor makes these sparkles itself, so the game should not add its own for them: `toss` in the hair colour at her head and halfway down each chain, `tilt` in her ribbon colour at her hair thing, `twirl` in the gown's main colour. `blink` and `show` have no sparkle. `blink` never draws the happy arcs (the slow blink is the closed lid); `toss`, `blink`, `show` and `tilt` keep her eyes open with a wide smile; `curtsy` closes them happily at the bottom of the bow.
- `hold(true)`: no random look-around (the idle breathing sway stays). Call it for the whole wardrobe part, `hold(false)` after Done.
- `turnBy(rad)`: turns from her current heading at once and stays there (the preview drag). It does not clamp: the game clamps to ±170°. The next `face(p)` then eases her back in about 1.5 s instead of turning at the walking speed. A walk or `place()` ends it.
- `point(part, out?)`: from the last drawn frame. `head` is her head's centre, `eyes` the point between her eyes on the face, `thing` the hair thing on her left (x > 0 when she faces south; the unicorn clip sits there), `dress` 0.45 m above her feet.
- `extra('rose')`: the picnic rose, tucked in just under the hair thing on her right. Not part of `look`, never saved; `extra(null)` removes it.
- `portrait(true)`: her Mid parts draw as Fine (while the Fine batch, hers only, has room: 48) and her Lo parts as Mid. Measured, see the budget below: it fits, so it can ship. Call `portrait(false)` when the wardrobe closes.
- To show a side clip or a ponytail (2.4: she turns 25° for hair things and styles): `turnBy(-0.44)` turns her left side (the unicorn clip) towards a camera in the south, then `face(camera)`.

### What each option draws

- Hair: six colours from `HAIR_HEX`. Rainbow: cream cap and nape, fringe puffs pink, lilac, sky, mint, both side locks pink, the tubes fade through the six bands, plait lobes and bun twists cycle them.
- Eyes: the iris colour only.
- Gowns (`GOWN_3D` in looks3d.ts): party (rose, rainbow graded tiers, fairy), ball (lilac with white gloves and a back bow in its deep colour, moon with a pink back bow; no legs or shoes, sleeves 1.2 times), tutu (four scalloped ruffles, white tights, blue slippers, a leotard part in the bodice colour under the ruffles). Fairy wings: four feathers a side, white with the outer two in mint, flapping 1.5 Hz idle and 5 Hz running or sliding, folding flat while she swims.
- Styles: ponytails (today's), high (one tube, the crown 1.5 cm forward), plaits (no tubes; 9 flattened lobes a plait, rolled left and right, base and light colours, a small bow at each tip), bun (a Fine bun low at the back with 7 twists round its base, and two short curly ringlets in the tube slots).
- Hair things on both side anchors (`onHead(±0.8, 0.45)`), each with two ribbon tails in her ribbon colour: bows (today's), unicorn (a white unicorn head in profile on her left with a gold horn, ears, a mane in her ribbon colour, a closed eye and a pink cheek, about 0.17 m; a small bow on her right), flowers (five petals in the ribbon colour, a yellow centre, two leaves), stars (three gold stars of 0.10, 0.08 and 0.07 m, twinkling at 2 Hz), butterflies (upper wings in the ribbon colour, light lower wings, a thin body and two feelers; 2.5 Hz idle, 6 Hz on the move), hearts.
- Nothing sits on top of her head: with the crown on, every thing and style stays clear of it (checked in the harness).
- The back of her head: a hair part at the nape (new in every look, also the default) so she has no bald patch when she turns round.

### Hair against head and gown

`collide()` keeps every free chain point outside her head sphere (0.29 m plus how much thicker the style's hair is than the first build) and outside the dress: a 32-entry radius table over y 0 to 0.9 built from the shape's rows (widest row within 4 cm, scallops included, plus 3 cm; at least 0.2 m above y 0.58 for her arms). The ball gown's table starts at y 0.02, so the hair hangs outside it. The table follows the dress's flare, twirl and sit squash each frame. A unit test checks every option and 20 random looks walking, running, sliding and swimming (within 2 cm).

### Sitting in the slide

The dress narrows in x and z while she sits: 1.0 (party, which also flares a little as before), 0.80 (ball), 0.88 (tutu). The ball gown also folds up more (y 0.66, lifted 0.25 in dress space), so its hem sits where the party dress's lace does instead of poking through the slide.

### Budget

- Her parts: the default look without the crown is 47 parts (today's 46 plus the nape) and 5,450 triangles (the 12-sided tubes add 368, the nape 108). The busiest look (rainbow plaits, fairy wings, star clips, the rose, the crown): 121 parts, 7,846 triangles. Every option and 20 random looks stay under 8,000 triangles and 192 parts (unit test).
- No new draw calls: everything is in the existing batches, the dress mesh and the hair tubes. The tubes draw 0, 1 or 2 tails with setDrawRange.
- The wardrobe frames at 1080 x 740, measured in `dev/world.html` (today's world, before the hay rack and the picnic rug) with the frames of 2.4: body frame 37 calls and 60,000 to 62,000 triangles, face frame 37 to 38 calls and 57,700 to 59,700, with `portrait(true)` 36 to 37 calls and at most 70,700 triangles (busiest look). Well inside 80 and 100,000, so the portrait detail ships. Run `budget wardrobe` in the flows to confirm with the whole 2.2.0 world.
- Follow view with 14 unicorns gathered round her in the busiest look: actors 13 calls, 29,600 triangles (harness).
- Capacities (parts.ts `CAPACITY`): Mid 224, Lo 640, Cone 112, Fine 48. A unit test draws the busiest look (with and without the portrait) plus 20 unicorns as the herd draws them (5 in full detail) under every capacity. A batch or a part list that is full now logs `[mmw] actors: … is full, parts are dropped` once (console.warn, also in the build).

### The harness

`dev/actors.html` has a look panel: every option of every row (each plays its reaction; `react on/off`), the ribbon colours, `default`, `random`, the five new reactions, `hold`, `turn +/-`, `face cam`, `rose`, `portrait`, the wardrobe's `body` and `face` frames (2.4, she stands left of where the panel would be), and `run`. The selected unicorn has `wear` and `wear cape` (a picture on its head). `window.__actors` adds `setLook(partial)`, `portraitView('body' | 'face')` and `emma()` (parts, triangles, look, mode).

## Look

- Every character is built in code from smooth shapes and drawn through one set of instanced meshes (bodies, heads, curls, legs, horns, eyes, lines, soft discs), so the whole herd costs a fixed number of draw calls. Princess Emma's dress, crown and ponytail tubes, the egg shell and the particles are their own meshes.
- Shading: the character material pulls the light 40 % towards the plain colour and adds a soft light rim. Under the shared lights this keeps faces and white coats clean instead of grey-green (the world bakes a similar lift into its south faces). Shiny unicorns get a stronger sheen.
- Breeds: moon (standard curls), nestling (a fluffy collar), snow (longer curls, white fluffy socks, twinkles in the mane), berry (bigger, extra curls). The colours come from the look; the harness uses moon white with a silver-blue mane, nestling cream with pink, snow white-blue with icy blue, berry lilac with magenta.

## Budget (renderer.info, actors only, harness at 1180 x 820)

| View | Draw calls | Triangles |
|---|---|---|
| 20 unicorns, Princess Emma, the egg, a moonbeam, ripples and particles, all on screen | 18 | 34,300 |
| 14 unicorns gathered round her | 13 | 28,000 to 31,000 |
| Normal follow view | 13 to 17 | 20,000 to 24,000 |

- The 5 unicorns nearest the camera are drawn and animated in full. The others use coarser shapes, fewer curls and no small details, and pose every third frame. Unicorns off screen are not drawn.
- CPU: `actors.update` takes 0.5 to 0.8 ms a frame on the Mac with 20 unicorns. Expect several ms on the iPad Air 2; it needs checking there.

## Known issues

- The far (cheap) unicorns animate at 20 fps. At the follow distance this does not show; up close it might.
- Culling uses the camera of the previous frame (with a 1.4 m margin). A camera cut can show a missing unicorn for one frame.
- A command given while a unicorn is in the middle of its 0.7 s hop into the pond applies at once.
- Toy pictures that fail to load show nothing (the TextureLoader logs the error).
- Hair is kept out of her head and dress only: it can pass through the fairy wings and through an arm raised in a wave.
- The dress hem shows a little under the slide's top platform while she sits there before sliding (the party dress did this before 2.2.0; the ball gown now does no more than that).
- `dev/world.html` has its own stand-in princess (a cone and a sphere at START) that draws over her head when both stand there; it is only in that harness.
