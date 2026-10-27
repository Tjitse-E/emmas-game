// The world: renderer and loop, the camera rig, the meadow and its places, the stable, time of day, picking and
// routing. Static scenery shares one vertex-coloured Lambert material and is merged per region of the meadow.
import * as THREE from 'three';
import type { ScreenPoint, World } from '../contracts';
import type { Vec2 } from '../layout';
import { buildGlows } from './beacon';
import { CameraRig, FOV } from './camera';
import { Scenery } from './geo';
import { buildPicker } from './pick';
import { buildGazebo, buildNest, buildPicnic, buildPond, buildSlide, nestFlowerSpots, picnicHeight } from './places';
import { isWalkable, nearestWalkable, route } from './route';
import { FOG_FAR, buildSky } from './sky';
import { buildStable } from './stable';
import { buildFence, buildGround, buildGrowth, buildHedges, buildOverlays, buildTrees, groundHeight, moundHeight, type HedgeFlowers } from './terrain';

/** Optional extras on top of the World contract. */
export interface WorldExtras {
  /** Resolves when the door numerals are drawn in Andika (they show plain gold plaques until then). */
  readonly ready: Promise<void>;
  /** Jump the camera to where it is heading, without easing (for the test hook's jump(part)). */
  snapCamera(): void;
  /** Hold the opening shot of introSweep (behind the start screen). */
  introStart(): void;
  /** frame() with an extra pitch in degrees (default the follow pitch), for a shot that looks up at the sky. */
  frame(center: Vec2, width: number, o?: { ms?: number; shiftY?: number; pitch?: number }): Promise<void>;
  /** The current time of day (0 day, 0.5 sunset, 1 night). */
  readonly timeOfDay: number;
  /**
   * Ground height under p: 0 on the meadow, up to 0.3 m on the nest mound, below 0 on the pond's bank, 2 cm on the
   * picnic rug and about 10 cm on its two cushions (so the babies sit on them).
   */
  heightAt(p: Vec2): number;
  /** The hay rack's current fill (0 empty to 1 full), eased by stable.hay(). For flows and the harness. */
  readonly hayFill: number;
}

export type WorldWithExtras = World & WorldExtras;

/** The pixel ratio cap at full quality (1536 x 1152 on the iPad Air 2). */
const PIXEL_RATIO = 1.5;
/** The safety net for a slow iPad: after SLOW_GRACE s of live frames, SLOW_FOR s under SLOW_FPS lowers the quality. */
const SLOW_GRACE = 5;
const SLOW_FOR = 3;
const SLOW_FPS = 40;

export function createWorld(container: HTMLElement): WorldWithExtras {
  // URL options for trying a cheaper renderer on the iPad without a rebuild: ?pr=<n> caps the pixel ratio, ?aa=0 turns
  // antialiasing off. The automatic fallback below can lower the cap further.
  const params = new URLSearchParams(location.search);
  const prParam = Number(params.get('pr'));
  let prCap = prParam > 0 ? prParam : PIXEL_RATIO;
  const pixelRatio = (): number => Math.min(window.devicePixelRatio || 1, prCap);
  const renderer = new THREE.WebGLRenderer({ antialias: params.get('aa') !== '0', powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 700);
  const rig = new CameraRig(camera);

  const hemi = new THREE.HemisphereLight('#eaf6ff', '#a8d48f', 1.6);
  const sun = new THREE.DirectionalLight('#fff3df', 1.7);
  sun.position.set(-8, 14, 6);
  sun.target.position.set(0, 0, 0);
  scene.add(hemi, sun, sun.target);

  // Everything static that shares the vertex-colour material is merged per region.
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const scenery = new Scenery();
  buildGround(scenery);
  buildOverlays(scenery);
  buildFence(scenery);
  const hedgeFlowers: HedgeFlowers = { at: [] };
  buildHedges(scenery, hedgeFlowers);
  buildGazebo(scenery);
  buildPicnic(scenery);
  buildNest(scenery);
  buildSlide(scenery);
  const pond = buildPond(scenery, material);
  const stable = buildStable(scene, scenery, material);
  const sky = buildSky(scene, scenery, hemi, sun);
  buildGrowth(scenery, hedgeFlowers, nestFlowerSpots());
  for (const mesh of scenery.build(material, 'scenery')) scene.add(mesh);
  for (const mesh of buildTrees(material)) scene.add(mesh);
  scene.add(pond.water, ...pond.toys);
  const glows = buildGlows(scene);
  const picker = buildPicker();

  // Time of day: eased between calls; lanterns follow dusk unless the level says otherwise.
  let tod = 0;
  let todTween: { from: number; to: number; ms: number; t: number; resolve: () => void } | null = null;
  const applyTod = (t: number): void => {
    const was = tod;
    tod = t;
    sky.apply(t);
    pond.setNight(sky.night);
    stable.setNight(sky.night);
    if (was < 0.6 && t >= 0.6) stable.api.lanterns(true);
    if (was > 0.4 && t <= 0.4) stable.api.lanterns(false);
  };
  applyTod(0);

  // Size: the canvas fills the container and follows resizes and turns. The canvas rect is kept here, so toScreen and
  // taps (called many times a frame for tags, arrows and bubbles) never force a layout.
  let rect = canvas.getBoundingClientRect();
  const resize = (): void => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h, false);
    sky.setPixelRatio(renderer.getPixelRatio());
    rig.resize(w, h);
    rig.update(0);
    rect = canvas.getBoundingClientRect();
  };
  resize();
  new ResizeObserver(resize).observe(container);
  window.addEventListener('resize', () => (rect = canvas.getBoundingClientRect()));
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));

  // The safety net for a slow iPad. Level 1 caps the pixel ratio at 1; level 2 tells the game (onSlow) to make the
  // herd cheaper too. Only frames that are drawn count, after a grace period for shader compiles and the first loads.
  let paused = false;
  let quality: 0 | 1 | 2 = 0;
  let liveTime = 0;
  let slowTime = 0;
  const slowFns = new Set<(level: 1 | 2) => void>();
  const lowerQuality = (): void => {
    if (quality >= 2) return;
    quality = quality === 0 ? 1 : 2;
    if (quality === 1) {
      prCap = Math.min(prCap, 1);
      resize();
    }
    console.info('[mmw] quality lowered', { level: quality, pixelRatio: renderer.getPixelRatio(), fps: Math.round(fps) });
    const level = quality;
    for (const fn of slowFns) fn(level);
  };
  const watchSpeed = (raw: number): void => {
    if (paused || quality >= 2) return;
    liveTime += Math.min(raw, 0.25);
    if (liveTime < SLOW_GRACE) return;
    slowTime = fps < SLOW_FPS ? slowTime + Math.min(raw, 0.25) : 0;
    if (slowTime >= SLOW_FOR) {
      slowTime = 0;
      lowerQuality();
    }
  };

  // The loop: callbacks first (actors move), then the world (the camera follows where they are now), then render.
  const callbacks = new Set<(dt: number, t: number) => void>();
  let elapsed = 0;
  let last = -1;
  let fps = 60;
  const frame = (now: number): void => {
    if (document.hidden) {
      last = -1;
      return;
    }
    const raw = last < 0 ? 1 / 60 : (now - last) / 1000;
    last = now;
    if (raw > 0) fps += (1 / raw - fps) * 0.05;
    watchSpeed(raw);
    const dt = Math.min(raw, 0.05);
    elapsed += dt;
    for (const fn of callbacks) fn(dt, elapsed);
    if (todTween) {
      const tw = todTween;
      tw.t += dt * 1000;
      const k = Math.min(1, tw.t / tw.ms);
      applyTod(tw.from + (tw.to - tw.from) * (0.5 - 0.5 * Math.cos(Math.PI * k)));
      if (k >= 1) {
        todTween = null;
        tw.resolve();
      }
    }
    rig.update(dt);
    sky.update(dt, elapsed, camera);
    pond.update(dt, elapsed);
    stable.update(dt, elapsed);
    glows.update(dt, elapsed);
    if (!paused) renderer.render(scene, camera);
  };

  const ndc = (x: number, y: number): THREE.Vector2 => {
    const r = rect;
    return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  };
  const ray = (x: number, y: number): THREE.Raycaster => {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc(x, y), camera);
    rc.far = FOG_FAR * 2;
    return rc;
  };
  const projected = new THREE.Vector3();

  const world: WorldWithExtras = {
    renderer,
    scene,
    camera,
    canvas,
    ready: stable.ready,
    get timeOfDay() {
      return tod;
    },
    get hayFill() {
      return stable.hayFill;
    },
    onFrame(fn) {
      callbacks.add(fn);
      return () => void callbacks.delete(fn);
    },
    start() {
      renderer.setAnimationLoop(frame);
    },
    follow(target) {
      rig.follow(target);
    },
    frame(center, width, o) {
      return rig.frame(center, width, o);
    },
    releaseFrame() {
      rig.releaseFrame();
    },
    introSweep(ms) {
      return rig.introSweep(ms);
    },
    introStart() {
      rig.introStart();
      rig.update(0);
    },
    snapCamera() {
      rig.snap();
      rig.update(0);
    },
    pick(x, y) {
      return picker.pick(ray(x, y).ray);
    },
    groundAt(x, y) {
      return picker.ground(ray(x, y).ray);
    },
    toScreen(p): ScreenPoint {
      projected.copy(p).project(camera);
      const r = rect;
      const inFront = projected.z > -1 && projected.z < 1;
      const x = r.left + ((projected.x + 1) / 2) * r.width;
      const y = r.top + ((1 - projected.y) / 2) * r.height;
      return { x, y, visible: inFront && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom };
    },
    ray,
    route,
    isWalkable,
    nearestWalkable,
    heightAt(p) {
      return Math.max(groundHeight(p.x, p.z), moundHeight(p.x, p.z), picnicHeight(p.x, p.z));
    },
    stable: stable.api,
    nestGlow(on) {
      glows.nestGlow(on);
    },
    markGoal(p) {
      glows.markGoal(p);
    },
    setTimeOfDay(t, ms = 2500) {
      todTween?.resolve();
      const to = THREE.MathUtils.clamp(t, 0, 1);
      if (ms <= 0) {
        todTween = null;
        applyTod(to);
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        todTween = { from: tod, to, ms, t: 0, resolve };
      });
    },
    setPaused(on) {
      paused = on;
      // The frame rate while paused says nothing about the 3D cost: start measuring afresh.
      slowTime = 0;
    },
    onSlow(fn) {
      slowFns.add(fn);
      // A listener that comes late still hears the levels already reached.
      if (quality >= 1) fn(1);
      if (quality >= 2) fn(2);
    },
    perf() {
      const info = renderer.info;
      return {
        fps: Math.round(fps),
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        pixelRatio: renderer.getPixelRatio(),
        quality,
      };
    },
  };
  return world;
}
