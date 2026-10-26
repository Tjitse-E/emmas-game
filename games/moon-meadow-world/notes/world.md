# World lane: notes for the integrator

The world lives in `src/world/`. Entry: `createWorld(container)` in `src/world/index.ts`. It implements `World` from `src/contracts.ts` exactly and adds a few optional extras (type `WorldWithExtras`). The harness is `dev/world.html` (with `src/world/dev.ts`). Routing tests are in `tests/world-route.test.ts`.

## Wiring

```ts
import { createWorld } from './world';
const world = createWorld(document.getElementById('app')!); // the container must fill the screen
const actors = createActors(world.scene, { route: world.route, isWalkable: world.isWalkable, nearestWalkable: world.nearestWalkable });
world.onFrame((dt, t) => actors.update(dt, t));
world.follow(() => ({ x: actors.princess.position.x, z: actors.princess.position.z }));
world.introStart();            // optional: hold the opening shot behind the Play screen
world.start();
await world.ready;             // optional: the door numerals are drawn in Andika once the font has loaded
```

- `onFrame` callbacks run before the camera update, so the follow camera uses this frame's positions.
- The canvas gets `touch-action: none`. Attach pointer handlers to `world.canvas` (or a layer over it).
- The world sets `scene.fog` and adds its own lights. Actors should not add lights.

## Recommended framings

| Moment | Call |
|---|---|
| Egg in the nest | `world.frame(NEST.center, 7, { shiftY: 0.08 })` |
| Door moments (all 20 doors and numerals) | `world.frame({ x: 0, z: -11.6 }, 19)` |
| Pond and slide | `world.frame({ x: 8, z: 3.5 }, 17)` |
| Goodnight shot with stars | `world.frame({ x: 0, z: -12.5 }, 19, { pitch: 25 })` at night: a sky shot (see below), the stars and the castle over the stable roofs |

At width 19 the numerals measure 30 to 34 px tall at 1180 x 820 and 27.5 to 31 px at 1080 x 810. At width 18 the outer doors touch the screen edges, so 19 fits better.

## Extras (optional members, not in the contract)

- `ready: Promise<void>`: resolves when the plaques have their Andika numerals.
- `snapCamera()`: jump to where the camera is heading, without easing. Use it in `jump(part)`.
- `introStart()`: hold the first frame of `introSweep` (high over the south of the meadow, castle and sky in view).
- `frame(center, width, { ms, shiftY, pitch })`: `pitch` in degrees (default 46, the follow pitch). A lower pitch shows more of the far side. A frame with a pitch of 30 or less and no `shiftY` is a sky shot: the camera stays where the pitch puts it and tilts up until the top of the view is 14 degrees above the horizon (`SKY_PITCH`, `SKY_TOP` in `src/world/camera.ts`). Pass a `shiftY` (even 0) for a low-pitch frame on the ground.
- `setPaused(on)` (now in the contract): skips `renderer.render` while on; frame callbacks keep running.
- `onSlow(fn)` (now in the contract): the safety net for a slow iPad. After 5 s of drawn frames, 3 s under 40 fps caps the pixel ratio at 1 and calls `fn(1)`; 3 more seconds under 40 fps call `fn(2)`. It logs `[mmw] quality lowered`. A late listener hears the levels already reached. Paused frames do not count.
- URL options read in `createWorld`: `?pr=<n>` caps the pixel ratio (default 1.5), `?aa=0` turns antialiasing off.
- `perf()` also returns `pixelRatio` and `quality` (0, 1 or 2).
- The harness (`dev/world.html`) has buttons to make frames slow (a 40 ms busy callback), pause and resume, and to fill every stall with real unicorns (peek, duck, nightcaps).
- `timeOfDay`: the current value.
- `heightAt(p)`: ground height under p. 0 on the meadow, up to 0.3 m on the nest mound, below 0 on the pond bank. The mound reaches 2.1 m from the nest centre, so walkers on its rim sink up to about 7 cm at y = 0.

## Behaviour to know

- `route(a, b)` returns `[a, ...waypoints, end]`. The first point is always `a` itself. When `a` is blocked (a swimmer), the second point is the nearest walkable point. `end` is `b`, or `nearestWalkable(b)` when `b` is blocked, or the reachable point nearest to `b` when `b` cannot be reached.
- Deviation: routing also blocks a small box around the slide's platform posts and first chute support (`SLIDE_BLOCK` in `src/world/route.ts`, x 2.65 to 5.05, z -0.3 to 1.1 with its margin). Without it, walkers pass through the posts. `SLIDE.ladderBase`, the queue spots and the pond exits stay walkable. `isWalkable` is false for points on the platform, so check `SLIDE.dropZone` before `isWalkable` when a unicorn is dropped there.
- `pick()` priority: door, slide, nest, gazebo, the rest of the stable buildings, pond, ground. Doors are found where the tap ray meets the stable fronts, so every door gets its full 1.5 m width and its storey. A tap on the ground up to 0.7 m in front of a lower door counts as that door. A tap on a roof, a side wall or a ramp (an invisible box per building) is a `door` pick for the nearest door of that building (upper storey above 1.95 m), so it never walks her behind the stables. The pond's `at` is the hit on the y = 0 plane (the water is at -0.2).
- Routing treats the stables as one block from the door fronts back (both buildings, the gap between them and the ramps, x ±9.2, `STABLE_BLOCK` in `src/world/route.ts`), and nothing north of the back walls (`BEHIND_Z`, z < -16.7) is walkable. `nearestWalkable` of a point there (a roof drop, a route target behind) lands in front of the doors, or beside the stables when the point is over a ramp.
- `frame()`, `introSweep()` and `setTimeOfDay()` resolve when they arrive. A new camera move resolves the one it replaces at once.
- `stable.open(n)` swings the half door inwards (into the stall, along its west partition), so nothing sticks out into the yard. `rattle(n)` is a 0.46 s shake. A call on a door that is still moving replaces that move.
- `setTimeOfDay` lights the lanterns when it passes 0.6 and puts them out when it passes 0.4. `stable.lanterns(on)` overrides that at any time. Call `lanterns(true)` yourself at dusk (0.5). Lit lanterns warm the stall insides, add halos and light pools on the yard (at night).
- Stars sit low on the sky dome (160 of them in a band 2 to 10 degrees above the horizon), so they show in the intro pose and in sky shots. In the follow view the night reads through blue-violet moonlight, lit stalls, lantern pools and fireflies (small warm yellow points of a fixed 11 CSS px).
- The follow camera keeps 13.5 m across a 4:3 screen at any aspect, so characters are the same share of the screen height on every iPad: 76 px per metre at 1024 x 768 (Princess Emma 79 px), 68 at 1024 x 690, 81 at 1180 x 820. Its target is clamped to x ±23 and z -19.5 to 13.5: near the fence she is almost centred and the view edge shows the hedges and the first trees beyond.
- Ground glows (the nest glow, 3 m across, and the beacon's spot) are a pink-white veil with normal blending, not additive light, so the grass is lifted, not turned lime. The nest glow stays inside the mound and never reaches her stand spot.
- No rendering while `document.hidden`. dt is clamped to 0.05 s.

## Look

Pastel picture-book style with the shared lights. Under those lights, faces that look south (at the camera) get little sun and a green bounce, so cream walls read khaki. The world bakes a warm fill into the vertex colours of south-facing faces (`fillSouth` in `src/world/geo.ts`). Characters will show the same dull fronts under these lights. The actors lane may want a similar lift (brighter, warmer front colours) to match.

## Budget (renderer.info in the harness, 1180 x 820)

| View | Draw calls | Triangles |
|---|---|---|
| Start (follow at START) | 25 | 52,277 |
| Nest framing (7 m) | 23 | 51,893 |
| Slide / pond (follow) | 26 / 26 | 53,021 / 48,813 |
| Stable follow / door framing (19 m) | 25 / 23 | 50,600 / 46,088 |
| Intro start | 28 | 55,532 |
| Worst follow position (4 m grid over the meadow) | 28 | 55,532 |
| Night, with beacon, door glow, row glow and nest glow all on (worst) | 39 | 55,628 |

Static scenery (ground, paths, fence, hedges, places, stable shell, grass and flowers) is merged per region into one mesh each with one shared Lambert material. Trees are four instanced meshes. Doors are one instanced mesh, the plaques one mesh with a texture atlas. Memory: 39 geometries, 10 textures.

## Requests for other lanes

- None for the contract. If the actors lane wants feet on the mound, `heightAt` is there as an extra; adding it to `World` would make it official.
