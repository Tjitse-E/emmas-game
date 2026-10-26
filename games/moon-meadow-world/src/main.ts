// Moon Meadow World, the v4 demo: one playable level (docs/v4/demo.md). Boots the world, the actors and the 2D
// layer, wires them together and plays the level after the Play tap.
// URL options: ?seed=<n> (the same level every time), ?at=<part> (start at a part, after Play), ?perf=1 (stats),
// ?pr=<n> (pixel ratio cap) and ?aa=0 (no antialias), both read by the world.
import { createWorld } from './world';
import { createActors } from './actors';
import { createLayer } from './ui';
import { audio } from './audio';
import { CLIPS, herd as startingHerd } from './content';
import { GRAZE_HOMES } from './layout';
import { createGame, isPart, sayWay } from './game/game';
import { installInput } from './game/input';
import { begin, installSlideWatch, installWayHelper } from './game/level';
import { installHook } from './test-hook';

// The script has started: index.html's 10 s fallback is only for a script that never runs (an old Safari, a failed
// load). A slow boot on the Air 2 must not be covered by the night picture.
(window as unknown as { __mmwStarted?: boolean }).__mmwStarted = true;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Date.now();
const at = params.get('at');

/** The fallback picture with the home button (index.html), for an iPad where WebGL 2 does not start. */
function noWorld(e?: unknown): void {
  console.warn('[mmw] no WebGL 2', e ?? '');
  (window as unknown as { __mmwFallback?: () => void }).__mmwFallback?.();
}

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function boot(): void {
  audio.setup();
  const world = createWorld(document.getElementById('world')!);
  const actors = createActors(world.scene, {
    route: (a, b) => world.route(a, b),
    isWalkable: (p) => world.isWalkable(p),
    nearestWalkable: (p) => world.nearestWalkable(p),
    heightAt: (p) => world.heightAt(p),
  });
  world.onFrame((dt, t) => actors.update(dt, t));
  world.follow(() => ({ x: actors.princess.position.x, z: actors.princess.position.z }));
  // A slow iPad: the world lowers its pixel ratio first (level 1), then the herd gets cheaper (levels 1 and 2).
  // The world logs each step as "[mmw] quality lowered".
  world.onSlow((level) => actors.setDetail(level));
  const layer = createLayer(document.getElementById('ui')!);

  // The herd of 12 grazes over the meadow.
  const herd = startingHerd();
  herd.forEach((h, i) => actors.herd.add({ id: h.id, name: h.name, look: h.look, at: GRAZE_HOMES[i] }).graze(GRAZE_HOMES[i]));
  // Every shader program now, behind the start screen: three.js would otherwise compile each one the first time it
  // draws it (the crown, the egg, the glows, the night), a stall on the Air 2 just as the moment starts.
  world.renderer.compile(world.scene, world.camera);

  const game = createGame({ world, actors, layer, seed, herd });
  installInput(game);
  installWayHelper(game);
  installSlideWatch(game);
  installHook(game);
  layer.lumi.onTap(() => {
    if (layer.replay()) return;
    if (game.door) return game.door.replay();
    // Lumi never talks over a line that plays.
    if (audio.speaking) return;
    if (!game.goal && game.part === 'free') return void audio.sayAll(CLIPS.basket);
    sayWay(game);
  });

  if (params.get('perf') === '1') {
    setInterval(() => {
      const p = world.perf();
      const s = actors.stats();
      layer.perf(
        `${p.fps} fps  ${p.calls} calls  ${(p.triangles / 1000).toFixed(1)}k tris  ${p.geometries} geo  ${p.textures} tex  ` +
          `unicorns ${s.full}/${s.cheap}/${s.culled}  pr ${p.pixelRatio}  q${p.quality}`,
      );
    }, 500);
  }

  console.info('[mmw] seed', seed);
  world.introStart();
  // The start screen covers the world: nothing is drawn until the Play tap.
  world.setPaused(true);
  world.start();
  void (async () => {
    await layer.start(() => {
      void audio.unlock();
      world.setPaused(false);
    });
    await begin(game, isPart(at) ? at : null);
  })();
}

if (!hasWebGL2()) noWorld();
else {
  try {
    boot();
  } catch (e) {
    noWorld(e);
  }
}
