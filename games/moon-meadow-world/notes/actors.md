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

- `actors.sounds` (default true): the actors play their own effects through `audio.fx` (`src/actors/sounds.ts`, docs/v4/2.3.md section 20): `slide-whoosh` when a rider starts down the slide (fallback: the synthesised whoosh), `splash-1` and `splash-2` in turn only when a rider lands from the slide (fallback: splash), and `nicker-1` and `nicker-2` in turn after a baby's hop or happy emote, at most once in 6 s for the whole herd. A nicker has no synthesised stand-in, so it is silent until its file exists. It waits one herd frame and plays only if nobody speaks then, so a tap that hops a baby and says its name gives no nicker under the name. A hop or a drop into the pond and a spray at a friend play the synthesised splash (`audio.sfx('splash')`, as in 2.2), at most once in 2 s for the whole herd. The nicker and the small splash never play in a checked moment (`audio.soundState().checked`) or while anyone speaks (`audio.speaking`). The slide sounds go through `fx()`, which skips them while Elizabeth speaks. None holds anything up. The game should not play these again. Set it to false to keep all sound in the game.
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
- The egg's hearts (`hearts(lit)`, 2.3 sections 12 and 19.1): with each lit heart the shell glows more and rocks a little at rest (`HEART_GLOW` in egg.ts), the warm egg in a warmer gold (its glow and rim), the snow egg in a frostier blue (its glow only: it keeps its deep blue rim, so it still shows on the sand). A heart that lights gives a happy wobble and a sparkle in the glow colour. The glow eases in and breathes gently. `place()` and `hide()` set it back to none. The game calls it (the eggs lane); the harness has `hearts +1`.
- Princess Emma: by default a pale blonde (`#ffdf86`) with Lumi's gold crown (gold's small shade `#ffb62e`, its rim line, gem and tips in dark gold, which crownOutline picks on sunny hair) about 1.3 times her first one. Her ponytails are tubes up to 8.5 cm thick that hang from close to the head; the chain keeps them out of her head and dress. The ribbon bows are 1.5 times bigger, with a light knot and two streamers, so a new ribbon colour reads at a glance at a 9 m frame. Her wardrobe is below.

## The mounts, side-saddle and riding a path (2.4.0, docs/v4/2.4.md section 5.4)

Files: `src/actors/mount.ts` (Bella's and Hazel's looks, the saddle's colours, the seat, the travelled `Track`, the side-saddle skirt `drapeDress`), `unicornBody.ts` (`BUILDS.grown`, the saddle, `saddlePoint`, `bodyEllipsoids`, `mountShape`), `unicorn.ts` (graze radius, `ridePath`, `trackBehind`, `seedTrack`, `trackPoint`, `faceTo`), `herd.ts` (`setFocus`), `princess.ts` (`mount`, `dismount`, `mountedOn`, `seated`), `egg.ts` (the star shell). Tests in `tests/actors.test.ts` ('the grown mounts', 'side-saddle', 'riding a path').

- **The grown build.** A foal times 1.4 with a smaller head on a longer neck: the back at 0.86 m, the seat's top (`saddleTop`) at about 0.89 m. Its gallop stride is 1.1 m, so at 4.2 m/s its legs cycle about 4 times a second. Walking speeds 1.25 times a baby's.
- **The saddle** is drawn on every grown unicorn from the Mid and Lo spheres it already uses (a cream blanket with side flaps, a rose seat, a gold pommel and trim, a raised back): no new batch, no new draw call, no Horn part (tested).
- **A mount never** follows, is lifted, slides, swims or goes into a stall (those calls do nothing on a grown unicorn); in the herd's separation it stands its ground, also on its ride path (the others step aside for it), and a mount standing by gives way only to the other mount on its way (a path or a walk back to its spot); nobody is pushed away from Princess Emma while she sits on a mount. `graze(home, { radius: 0.6 })` keeps it within 0.6 m of its spot.
- **`setFocus(ids)`** ranks those ids first, in that order, for full detail (the mount, then its riders nearest it); `[]` goes back to distance alone.
- **Side-saddle.** `mount(u)` hops her up (0.55 s, a sparkle) onto its left, turned out to that side, and resolves as she sits (mode `mounted`, `mountedOn`). Each frame she sits at its saddle point (the actors update the herd before her while she rides, so she never lags a frame). Both legs hang forward and down its flank; her dress swaps to its side-saddle skirt (`drapeDress`: the dress pressed out of the mount's body and chest by 4.5 cm, built once per dress shape, painted as the dress), and the hair keeps out of the mount's body as well as her head and dress. Her own twirl, turn, jump and knee bend stay off on a mount (arms still wave and clap). Faster than a trot the hair loses up to 70% of its weight, so the tails fly out behind her at a gallop. `walkTo` resolves false and `rideSlide` at once while she is mounted; `dismount(at)` hops her down (a sparkle). The test runs the busiest look in all four gown shapes at walk, trot and gallop and through her reactions: no dress or limb vertex inside the body or chest, the hair within 2 cm, the feet off the ground.
- **Riding a path.** `ridePath(path, fromM, toM, { speed, backwards })` moves by arc length, eases off near the end (about 5 m/s² of braking) and stops there; it faces along its way, or with `backwards` backs up and keeps its heading. 10 m at 4.2 m/s takes between 2.2 and 2.9 s (tested). The ground it covers is its `Track` (points every 4 cm with their running distance; backing up takes the track back). `trackBehind(lead, gap)` keeps a unicorn `gap` metres back along the lead's track, walking onto it first (straight, outside the herd's separation and routes) at up to its gallop; mode `walk`, never `follow`, so the herd's follower play leaves it alone. `seedTrack(points)` gives a track its lead-in (the ride starts it behind her stand, so the riders line up there). **Turning round** at a clearing folds the track back on itself, so `turnRound(side)` notes the turn: each follower whose place is still on the way in steps 1.1 m (`ASIDE`) out to `side` and waits there, watching the mount, until its place has come round the turn and back level with it; then it falls in behind. The ride gives `side` as her side before the turn, which is the mount's free right side once it has turned, and gives the riders their gaps in the opposite order. Backing up past the turn forgets it (`trackTurn()` null). Tested: nobody comes within 0.9 m of the mount, nobody passes on her side, and all end at their gaps.
- **The star egg** has its own shell: a dusk lilac with gold stars and a gold crescent on its back, and a starry gold glow (`HEART_GLOW.colour.star`).
- **The start-up draw** (`actors/index.ts`). three.js counts a geometry or a texture only the first time it draws it, and the long play checks that `renderer.info.memory` stays level from place to place. So `createActors` builds every dress shape, every side-saddle skirt and every crown at once (`princess.warmables()`), adds them with both eggs' shells (`egg.warmables()`, their canvas textures too) and the effects' points (`fx.warmables()`, the sprite atlas) to the scene as meshes shrunk to nothing, and `parts.prime` makes every empty batch draw one instance shrunk to nothing (the moonbeam's, the egg face's arcs). The world draws nothing behind the start screen, so they stay until it has drawn a frame with them (`onAfterRender`), then go. Measured in the ride flow: 58 geometries and 8 textures from the paddock to getting off. No call in `main.ts` is needed.
- **The harness** (`dev/actors.html`) has a "Mounts (2.4.0)" section: add mounts, get on, gallop (followers track 1.6 m behind), back up, get off, star egg.

## The wardrobe on Princess Emma (2.3.0, docs/v4/2.3.md section 15)

Files: `src/actors/princess.ts` (the actor), `hair.ts` (the twelve styles: chains, tubes, plaits, buns), `looks3d.ts` (a gown shape in a palette colour by dress role, sit squash, skirt tables, the ten hair things, ribbon tails, wings, back bow, rose, shoes, toe tips, earrings, necklace), `shapes.ts` (the three dress shapes by role, the five crowns), `ponytail.ts` (HairTubes: recolour, draw range, 12 sides; `chainPoint`), `parts.ts` (capacities, the overflow warning, `shapeTriangles`), `sounds.ts` (the actors' effects). Ids, hex values and `crownOutline` stay in `src/wardrobe.ts`; nothing here imports `wardrobe-legacy.ts`.

### The API (src/contracts.ts Princess)

- `setLook(partial)`: missing fields keep what she wears; unknown ids fall back (normaliseLook, without ownership: the game passes looks she owns). Colours change at once. A gown shape or colour swaps the dress mesh's geometry to its shape (built once, at start-up since 2.4.0; gala uses the ball gown's) and repaints its vertex colours. A crown swaps the crown mesh's geometry the same way and repaints its band and rim line. Same materials, colour item size 3, so no program compiles. A style builds new chains and covers the pop with a sparkle in the hair colour (only after her first drawn frame, so setting the saved look at boot sparkles nowhere). Goodnight: `setLook({ thingColour })`.
- `emote(kind)`: the wardrobe's reactions are `toss` (1.0 s), `blink` (1.6 s), `show` (1.6 s), `tilt` (1.2 s) and `curtsy` (1.2 s), as the table in 2.2.md 2.4. The actor makes these sparkles itself, so the game should not add its own: `toss` in the hair colour at her head and halfway down each chain, `tilt` in the hair things' colour at her hair thing, `twirl` in the gown's main colour. `blink` and `show` have no sparkle.
- `hold`, `turnBy`, `point`, `extra('rose')` and `portrait` are as in 2.2.0 (below, "Behaviour to know").
- `Egg3D.hearts(lit)`: see "The egg's hearts".

### What each option draws

- **Colours.** Every coloured part takes `PALETTE` from wardrobe.ts. The gown: trim light, main base, deep deep, sash sash, bodice deep, sleeves between base and light (`SLEEVE_MIX` 0.35 in looks3d.ts, as 2.2's sleeves sat between the two). Rainbow grades the tiers through its bands as 2.2's rainbow dress (main bands[1] to base, deep bands[3] to deep, bodice bands[0] towards light, sleeves sash). The crown band, the shoes, the hair things (and their ribbon tails) and the jewels take the colour's `small` shade. Rainbow on these small parts draws its six bands (`PALETTE.rainbow.bands`), as the swatch does, never its `small` pink alone: the crown band runs through them twice by angle (so the front shows all six) and its star or heart motif round its points; each piece of a hair thing takes its own band (petals, loops, ribs, the crescent, the tails); a rainbow star has five bands and a rainbow heart three; the necklace beads run through them; the left shoe or ear starts at the first band and the right at the fourth (a boot's shaft takes the next). A rainbow crown glows white. The hair takes `HAIR_HEX` (18 colours; rainbow keeps 2.2's bands). The eyes take `EYE_HEX`.
- **Gowns** (`gownOf` in looks3d.ts): party, ball, gala (the ball gown with white gloves), tutu (white tights and a leotard in the bodice colour). The ball and gala gowns hide her legs: two toe tips in the shoe colour peek 3 cm out of the hem front, with their bow or star, and step a little in turn while she glides. Boots show a bigger, rounder toe with a strap in the cuff colour where it meets the hem. The toes go with her but never below the ground under her, so they stay in sight in the curtsy, a jump's crouch and landing, and the run's lean. They hide while she sits in the slide.
- **Extras**, on any gown: `wings` (2.2's fairy wings, the outer feathers in the gown's base, 1.5 Hz idle, 5 Hz running or sliding, folding flat while she swims) or `bow` (the back bow at the sash, in the sash shade).
- **Crowns** (`crownBuild` in shapes.ts): lumi (2.2's five points), tiara (a low arch with three small points; the rim line keeps outside its band where the band is low at the back), star (low scallops and a flat star at the front), heart (low scallops and a flat heart at the front), flower (five round petals). Each is one double-sided band with a rim line round its foot, cached on first use, on one material: one draw call, as before. The band is the crown colour's small shade; the rim line, the gems and the tips (Lo parts) are `crownOutline(hair, crownColour)`. It glows a little in its own colour.
- **Shoes**, in the small shade: slippers (2.2's), bows (a bow on each toe), boots (a bigger foot, a shaft up the shin to just under the party dress's hem, a cuff), stars (a star on each toe). A bow, a cuff and a star take the first of white (gold for a star), the colour's sash or deep shade that stands out on the shoe (`accentOf`, contrast 1.4).
- **Hair styles** (`STYLES` in hair.ts), with different outlines: ponytails, high (one tail, the crown 1.5 cm forward), plaits, bun (with two ringlets), low (two tails at the nape), side (one tail tied at her left, +x), curly (two high ringlet tails), bunches (two short flared tails), long (two straight tails to the waist, tied low behind the ears and wide apart, where low's wavy tails meet at the nape), curls (one high ringlet ponytail, the crown forward as for high), plait (one plait down the back to the waist, so it hangs clear of the skirt), lowbun (a bun at the nape, no ringlets). No style puts anything inside the crown ring.
- **Hair things**, on both side anchors (`onHead(±0.8, 0.45)`), each with two ribbon tails in the things' colour: 2.2's six, and shells (two scallops each side, ribs in the colour and its light tint), moons (a crescent with a small star), daisies (ten thin petals round a yellow middle), cherries (two cherries on green stalks with a leaf).
- **Earrings** at `onHead(±0.88, -0.2)`, hanging straight down whatever her head does: studs, hearts, stars (five points, the star clip's star at 40%), drops (a stud and a drop that swings a little).
- **Necklace** at the bodice top, following the dress when it flares or folds up as she sits: pearls (9 beads on an arc that dips at the front) or heart (7 beads and a heart pendant).
- Nothing sits on top of her head: with the crown on, every thing and style stays clear of it.

### Hair against head and gown

`collide()` keeps every free chain point outside her head sphere (0.29 m plus how much thicker the style's hair is than the first build) and outside the dress: a 32-entry radius table over y 0 to 0.9 built from the shape's rows (widest row within 4 cm, scallops included, plus 3 cm; at least 0.2 m above y 0.58 for her arms). The ball gown's table starts at y 0.02, so the hair hangs outside it. The table follows the dress's flare, twirl and sit squash each frame. Unit tests check every option of every field, 20 random looks and every style on every gown (with the extras) walking, running, twirling, sliding and swimming (within 2 cm). The wings stay clear of every skirt (tested).

### Sitting in the slide

The dress narrows in x and z while she sits: 1.0 (party, which also flares a little as before), 0.80 (ball and gala), 0.88 (tutu). The ball gown also folds up more (y 0.66, lifted 0.25 in dress space), so its hem sits where the party dress's lace does instead of poking through the slide.

### Budget

- Her default look is 2.2's part list (tested against the 2.2 fixture: the same parts in the same places; the slippers, the sleeves and the crown's gem and tips now take their palette colours). With the crown and the rose: 6,174 triangles, 59 parts.
- What the options add (triangles / parts, on the default, crown and rose on): wings 864 / 8, back bow 360 / 5; bun 768 / 8, plaits 48 / 24; stars clips 840 / 30, shells 624 / 18, moons 600 / 20, daisies 528 / 16; star shoes 360 / 10, bow shoes 288 / 6, boots 144 / 4; star earrings 360 / 10, heart earrings 264 / 6; heart necklace 468 / 10, pearls 432 / 9; the heart crown 24, the star crown 10. One-tail styles take 552 off, the tutu adds 48, the ball gowns take 48 off.
- The busiest look (bun, tutu, wings, heart crown, star shoes, star clips, star earrings, heart necklace, the rose): 9,906 triangles under the cap of 10,000, and 136 parts of 192. Boot toes under a ball gown add 2 Lo parts, under the star shoes' 10. The tests find the busiest look per measure from the catalogue (each field's heaviest option), so it follows the catalogue as it grows.
- No new draw calls: everything is in the existing batches, the dress mesh, the crown mesh and the hair tubes. No new part uses the Horn batch (only 2.2's unicorn clip; tested).
- Capacities (parts.ts `CAPACITY`) are unchanged: the busiest look for each batch plus 20 unicorns as the herd draws them stays inside every one (tested). The portrait run picks its own busiest look, since the portrait draws Mid parts as Fine and Lo parts as Mid.
- The wardrobe frames at 1080 x 740 with the busiest look and `portrait(true)`, measured in the game on the dev server (the flow server in a lane worktree has no v3 build to serve): 35 draw calls and at most 70,559 triangles in the body and face frames. Inside 80 and 100,000.

### The harness

`dev/actors.html` has a look panel: every option of every field (each plays its reaction; `react on/off`), `default`, `random`, the five reactions, `hold`, `turn +/-`, `face cam`, `rose`, `portrait`, the wardrobe's `body` and `face` frames (2.2.md 2.4, she stands left of where the panel would be), and `run`. The egg has `hearts +1`. The selected unicorn has `wear` and `wear cape` (a picture on its head). `window.__actors` adds `setLook(partial)`, `portraitView('body' | 'face')`, `emma()` (parts, triangles, look, mode), `lineup(kind, gown?, turn?)` and `lineupCast()`.

### Tuning the shades (the line-up)

The integrator tunes the palette once after this lane merges (docs/v4/2.3.md 22.3). The line-up shows every colour at once, on shelves far south of the meadow against a plain wall, each princess labelled.

1. Serve the game folder on a free port (never 8765): `npx vite --port <port> --host 127.0.0.1` from `games/moon-meadow-world`, and open `http://127.0.0.1:<port>/dev/actors.html?lineup=gowns` at 1080 x 740 (`playwright-cli resize 1080 740`).
2. The views (`?lineup=`, or the "Line-up" buttons, which hide the panel; `panel` brings it back):
   - `gowns`: the twelve palette colours, each on the gown, the crown, the shoes, the hair things and the jewels (earrings and a necklace are put on), full length.
   - `small`: the same twelve close up: the crown band and its rim line, the hair things, the earrings and the necklace.
   - `hair`: the eighteen hair colours, the rest as the main princess wears it. Each label gives the outline `crownOutline` picks on that hair under her crown colour.
   - `styles`, `things`, `jewels`: the twelve styles, the ten hair things, the five crowns with each earring and necklace.
3. `&gown=party|ball|gala|tutu` (or the shape buttons) sets the gown shape; `&turn=side|back` (or `front`, `side`, `back`) turns them. Shapes, the hair colour and the style come from the main princess: pick them with the look buttons, then press a line-up button again.
4. Change hex values in `src/wardrobe.ts` only. The dev server in the sandbox may not see the change: reload the page, and restart the server if it still shows the old colours.
5. Run `npx vitest run tests/wardrobe.test.ts tests/actors.test.ts` after tuning: the crown outline test and the default-look test take their colours from the palette.

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
- One tail hanging down the back (high, curls) rests on the skirt and can slide off to one side as she moves, as 2.2's high ponytail did. The single plait ends at the waist, so it does not.
- The earrings are small (2 to 4 cm): in the follow view they are a glint, in the face frame they show.
- The dress hem shows a little under the slide's top platform while she sits there before sliding (the party dress did this before 2.2.0; the ball gown now does no more than that).
- `dev/world.html` has its own stand-in princess (a cone and a sphere at START) that draws over her head when both stand there; it is only in that harness.
