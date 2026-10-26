# Actors lane: notes for the integrator

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
- The slide uses u as the arc-length fraction of `SLIDE_CURVE` (`getPointAt`). Riders sit at the curve's highest point (u about 0.36, a little past `climbEnd`) and slide with their bottom on the curve, so the world's chute surface should be at the curve. It is in the world lane's build.
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
- `showToy(url)`: a small picture (1 draw call each while shown). On land it lies on the grass at its front feet, a little to the side; while it swims it bobs beside it at head height. Textures are cached per URL.
- The egg: `place(at, kind)` takes the egg's centre (`NEST.eggY` in the nest). A point with y below 0.3 (the egg is 0.6 m tall) is lifted so it rests on the ground, so the wild egg can be placed with y = 0. `hatch()` cracks (3 stages), wobbles hard, pops the top and bursts in sparkles and hearts after about 1.9 s; it resolves at the burst and the egg hides itself 0.9 s later.
- `fx.starfall` resolves when the stars have landed (about 1.3 s). `fx.moonbeam` resolves after `ms`; it is warm (`#fff1c4`) with a soft glow and a breathing gold ring on the ground.
- The too-hot steam is 5 big, slightly warm white puffs per burst. The snow egg has a deeper blue edge so it shows on the sand.
- Princess Emma: a pale blonde (`#ffdf86`) with a deep warm gold crown (`#f5a623`, a light rim) about 1.3 times her first one. Her ponytails are tubes up to 8.5 cm thick that hang from close to the head; the chain keeps them out of her head and dress. The ribbon bows are 1.5 times bigger, with a light knot and two streamers, so `ribbons(colour)` reads at a glance at a 9 m frame.

## Look

- Every character is built in code from smooth shapes and drawn through one set of instanced meshes (bodies, heads, curls, legs, horns, eyes, lines, soft discs), so the whole herd costs a fixed number of draw calls. Princess Emma's dress, crown and ponytail tubes, the egg shell and the particles are their own meshes.
- Shading: the character material pulls the light 40 % towards the plain colour and adds a soft light rim. Under the shared lights this keeps faces and white coats clean instead of grey-green (the world lane bakes a similar lift into its south faces). Shiny unicorns get a stronger sheen.
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
