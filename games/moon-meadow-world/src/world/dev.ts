// The world lane's harness (dev/world.html): the whole world, a cone that walks routes to taps, buttons for every
// world call and a stats box. window.__world and window.__dev are there for playwright-cli.
import * as THREE from 'three';
import { BEAD_TREE, CORNER, HAY_RACK, MIST, NEST, PICNIC, PLACES, POND, SLIDE, STABLE, START, type Place, type Vec2 } from '../layout';
import { createWorld } from './index';
import { createActors, type ActorsImpl } from '../actors';
import type { SignWord, UnicornLook } from '../contracts';
import { EARTH, ellipse, patch } from './beds';
import { KIT, KIT_RADIUS } from './kit';

const world = createWorld(document.getElementById('world')!);

// The walker: a pink cone with a round head, about Princess Emma's height.
const marker = new THREE.Group();
const coneMat = new THREE.MeshLambertMaterial({ color: '#ff8fc0' });
const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 16), coneMat);
cone.position.y = 0.5;
const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshLambertMaterial({ color: '#ffe0c8' }));
head.position.y = 1.15;
marker.add(cone, head);
marker.position.set(START.x, 0, START.z);
world.scene.add(marker);
const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7a3cff' }));
routeLine.frustumCulled = false;
world.scene.add(routeLine);

let path: Vec2[] = [];
world.onFrame((dt) => {
  if (!path.length) return;
  const p = path[0];
  const dx = p.x - marker.position.x;
  const dz = p.z - marker.position.z;
  const d = Math.hypot(dx, dz);
  const step = 2.4 * dt;
  if (d <= step) {
    marker.position.set(p.x, 0, p.z);
    path.shift();
  } else {
    marker.position.x += (dx / d) * step;
    marker.position.z += (dz / d) * step;
  }
});
world.follow(() => ({ x: marker.position.x, z: marker.position.z }));

const walkTo = (to: Vec2): Vec2[] => {
  const r = world.route({ x: marker.position.x, z: marker.position.z }, to);
  routeLine.geometry.dispose();
  routeLine.geometry = new THREE.BufferGeometry().setFromPoints(r.map((p) => new THREE.Vector3(p.x, 0.15, p.z)));
  path = r.slice(1);
  return r;
};

// A tap (short press, little movement) picks and walks.
let down: { x: number; y: number; t: number } | null = null;
let lastPick: unknown = null;
world.canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
world.canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12 || performance.now() - down.t > 600) return;
  const hit = world.pick(e.clientX, e.clientY);
  lastPick = hit;
  if (hit && (hit.kind === 'ground' || hit.kind === 'pond')) walkTo(hit.at);
  if (hit?.kind === 'rack') walkTo(HAY_RACK.stand);
  if (hit?.kind === 'picnic') walkTo(PICNIC.stand);
  if (hit?.kind === 'door') {
    world.stable.glow(hit.door);
    void world.stable.rattle(hit.door);
  }
});

// Buttons.
const panel = document.getElementById('panel')!;
const section = (title: string): void => {
  const b = document.createElement('b');
  b.textContent = title;
  panel.append(b);
};
const button = (label: string, fn: () => void): void => {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', fn);
  panel.append(b);
};
const STABLE_FRAME: Vec2 = { x: 0, z: -11.8 };

/**
 * The game's frameAt (src/game/game.ts): frame `center` at `width` metres so that `point` shows at `frac` of the
 * screen height from the top.
 */
function frameAt(center: Vec2, width: number, point: THREE.Vector3, frac: number, ms = 900): Promise<void> {
  const cam = world.camera;
  const probe = new THREE.PerspectiveCamera(cam.fov, cam.aspect, cam.near, cam.far);
  const dist = width / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
  const pitch = THREE.MathUtils.degToRad(46);
  probe.position.set(center.x, Math.sin(pitch) * dist, center.z + Math.cos(pitch) * dist);
  probe.lookAt(center.x, 0, center.z);
  probe.updateMatrixWorld();
  const shiftY = THREE.MathUtils.clamp(frac - (1 - point.clone().project(probe).y) / 2, -0.35, 0.35);
  return world.frame(center, width, { ms, shiftY });
}
/** The picnic moment (design 2.2 section 5): the rug 0.6 m east of centre, 5.5 m wide, the babies' heads at 45%. */
const picnicFrame = (ms?: number): Promise<void> =>
  frameAt({ x: PICNIC.rug.center.x + 0.6, z: PICNIC.rug.center.z }, 5.5, new THREE.Vector3(PICNIC.seats[0].x, 0.9, PICNIC.seats[0].z), 0.45, ms);
/** The hay rack moment: 6 m wide, the top of the heap at 28% so the rack stays above the hay panel. */
const rackFrame = (ms?: number): Promise<void> =>
  frameAt(HAY_RACK.center, 6, new THREE.Vector3(HAY_RACK.center.x, 1.25, HAY_RACK.center.z), 0.28, ms);
/** The Corner's gate (2.3.0 section 17.4): the step at (-14, 3.0), 5.5 m wide, the babies' heads at 45%. */
const cornerFrame = (ms?: number): Promise<void> =>
  frameAt({ x: -14, z: 3.0 }, 5.5, new THREE.Vector3(CORNER.babies[0].x, 0.9, CORNER.babies[0].z), 0.45, ms);
/** The bead tree moment (2.3.0 section 19.2): 0.4 m west of the tree, 6 m wide, the tree top at 28%. */
const beadFrame = (ms?: number): Promise<void> =>
  frameAt({ x: BEAD_TREE.center.x - 0.4, z: BEAD_TREE.center.z }, 6, new THREE.Vector3(BEAD_TREE.center.x, 2.6, BEAD_TREE.center.z), 0.28, ms);

/**
 * The customiser's portrait camera (design 2.2 section 2.4) with Princess Emma at `her`: a low camera that looks
 * through a point `lookY` above her, with her at the middle of the space left of the wardrobe panel.
 */
const PORTRAIT = { body: { hvis: 2.08, lookY: 0.58, pitch: 8 }, face: { hvis: 1.05, lookY: 1.08, pitch: 6 } } as const;
function portrait(kind: keyof typeof PORTRAIT, her: Vec2 = START, ms = 900): Promise<void> {
  const { hvis, lookY, pitch } = PORTRAIT[kind];
  const w = innerWidth;
  const h = innerHeight;
  const unit = Math.min(w / 1180, h / 820);
  const panelLeft = w - (16 + 628) * unit;
  const xFrac = panelLeft / 2 / w;
  const tan = Math.tan(THREE.MathUtils.degToRad(19));
  const aspect = w / h;
  const p = THREE.MathUtils.degToRad(pitch);
  const d = hvis / (2 * tan);
  const ox = (1 - 2 * xFrac) * d * tan * aspect;
  const center = { x: her.x + ox, z: her.z - lookY / Math.tan(p) };
  const width = (d + lookY / Math.sin(p)) * 2 * tan * aspect;
  return world.frame(center, width, { pitch, shiftY: 0, ms });
}

section('Camera');
button('nest', () => void world.frame(NEST.center, 7, { shiftY: 0.08 }));
button('pond', () => void world.frame({ x: POND.center.x - 2, z: POND.center.z - 0.5 }, 17));
button('stable', () => void world.frame(STABLE_FRAME, 18));
button('picnic', () => void picnicFrame());
button('rack', () => void rackFrame());
button('portrait body', () => void portrait('body'));
button('portrait face', () => void portrait('face'));
button('corner', () => void cornerFrame());
button('corner portrait', () => void portrait('body', CORNER.stand));
button('bead tree', () => void beadFrame());
button('release', () => world.releaseFrame());
button('intro', () => void world.introSweep(4500));
section('Walk to');
button('picnic spot', () => void walkTo(PICNIC.stand));
button('rack stand', () => void walkTo(HAY_RACK.stand));
button('corner stand', () => void walkTo(CORNER.stand));
button('bead tree stand', () => void walkTo(BEAD_TREE.stand));
button('sign', () => void walkTo(MIST.signStand));
button('start', () => void walkTo(START));
section('Dressing Corner and sign (2.3.0)');
button('lid open', () => void world.corner.lid(true));
button('lid close', () => void world.corner.lid(false));
button('sign shimmer', () => world.sign.shimmer());
section('Hay rack');
button('hay 0', () => world.stable.hay(0));
button('hay ½', () => world.stable.hay(0.5));
button('hay 1', () => world.stable.hay(1));
button('fill slowly', () => (world.stable.hay(0, 0), world.stable.hay(1, 2500)));
section('Time of day');
for (const t of [0, 0.5, 1]) button(String(t), () => void world.setTimeOfDay(t, 2000));
section('Stable');
button('glow 13', () => world.stable.glow(13));
button('glow 9', () => world.stable.glow(9));
button('glow off', () => world.stable.glow(null));
button('open 13', () => void world.stable.open(13));
button('close 13', () => void world.stable.close(13));
button('open 7', () => void world.stable.open(7));
button('close 7', () => void world.stable.close(7));
button('rattle 12', () => void world.stable.rattle(12));
button('row 0', () => world.stable.glowRow(0));
button('row 1', () => world.stable.glowRow(1));
button('row off', () => world.stable.glowRow(null));
button('lanterns on', () => world.stable.lanterns(true));
button('lanterns off', () => world.stable.lanterns(false));
section('Goal');
for (const p of Object.keys(PLACES) as Place[]) button(p, () => world.markGoal(PLACES[p]));
button('none', () => world.markGoal(null));
button('nest glow', () => world.nestGlow(true));
button('nest off', () => world.nestGlow(false));
section('Speed');
// A busy frame callback makes the frame slow, to see the safety net lower the quality (console: '[mmw] quality lowered').
let busyMs = 0;
world.onFrame(() => {
  const end = performance.now() + busyMs;
  while (performance.now() < end) {
    // Spin.
  }
});
let slowLevel = 0;
world.onSlow((level) => (slowLevel = level));
button('slow 40 ms', () => (busyMs = 40));
button('fast', () => (busyMs = 0));
button('pause', () => world.setPaused(true));
button('resume', () => world.setPaused(false));
section('Stalls (actors)');
// The real actors in the real stable: a unicorn in every stall, to check the peeking heads and nightcaps.
let actors: ActorsImpl | null = null;
const LOOKS: UnicornLook[] = [
  { stage: 'baby', breed: 'moon', body: '#ffffff', mane: '#9fd3ff', mane2: '#c9b2ff' },
  { stage: 'foal', breed: 'nestling', body: '#fff1dc', mane: '#ff9ccc', mane2: '#ffd36b' },
  { stage: 'baby', breed: 'berry', body: '#e9d6ff', mane: '#ff5fb0', mane2: '#8fe0c0' },
  { stage: 'foal', breed: 'snow', body: '#eef7ff', mane: '#8fd0ff', mane2: '#ffffff' },
];
const stalled = (): ActorsImpl => {
  if (actors) return actors;
  const a = createActors(world.scene, {
    route: (p, q) => world.route(p, q),
    isWalkable: (p) => world.isWalkable(p),
    nearestWalkable: (p) => world.nearestWalkable(p),
    heightAt: (p) => world.heightAt(p),
  });
  world.onFrame((dt, t) => a.update(dt, t));
  a.placePrincess(STABLE.emmaStand, Math.PI);
  for (let n = 1; n <= 20; n++) {
    const u = a.herd.add({ id: 'u' + n, name: 'U' + n, look: LOOKS[n % LOOKS.length], at: STABLE.emmaStand });
    u.putInStall(n, true);
  }
  actors = a;
  return a;
};
let caps = false;
let peeking = true;
button('fill stalls', () => void stalled());
button('nightcaps', () => {
  caps = !caps;
  stalled().herd.all().forEach((u) => u.nightcap(caps));
});
button('duck/peek', () => {
  peeking = !peeking;
  stalled().herd.all().forEach((u) => u.peek(peeking));
});
section('Harness');
button('clean', () => document.body.classList.add('clean'));

const stats = document.getElementById('stats')!;
setInterval(() => {
  const p = world.perf();
  stats.textContent = `fps ${p.fps}  calls ${p.calls}  tris ${p.triangles}\ngeo ${p.geometries}  tex ${p.textures}  tod ${world.timeOfDay.toFixed(2)}  hay ${world.hayFill.toFixed(2)}\npr ${p.pixelRatio}  quality ${p.quality}  onSlow ${slowLevel}\npick ${JSON.stringify(lastPick)}`;
}, 500);

/** Render once now and read the frame's cost. */
function measureNow(): { calls: number; triangles: number } {
  world.renderer.render(world.scene, world.camera);
  return { calls: world.renderer.info.render.calls, triangles: world.renderer.info.render.triangles };
}

/** The budget check: the named poses, then a sweep of follow positions over the meadow for the worst case. */
function measure(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const at = (p: Vec2): void => {
    marker.position.set(p.x, 0, p.z);
    path = [];
  };
  // The worst case: a full hay rack (one more mesh).
  const hayWas = world.hayFill;
  world.stable.hay(1, 0);
  const poses: [string, () => void][] = [
    ['start', () => (at(START), world.releaseFrame(), world.snapCamera())],
    ['picnicFollow', () => (at(PICNIC.stand), world.releaseFrame(), world.snapCamera())],
    ['picnicFrame', () => (void picnicFrame(0), world.snapCamera())],
    ['rackFollow', () => (at(HAY_RACK.stand), world.releaseFrame(), world.snapCamera())],
    ['rackFrame', () => (void rackFrame(0), world.snapCamera())],
    ['portraitBody', () => (at(START), void portrait('body', START, 0), world.snapCamera())],
    ['portraitFace', () => (at(START), void portrait('face', START, 0), world.snapCamera())],
    ['nest', () => (void world.frame(NEST.center, 7, { ms: 0 }), world.snapCamera())],
    ['slide', () => (at(SLIDE.ladderBase), world.releaseFrame(), world.snapCamera())],
    ['pond', () => (at(POND.center), world.releaseFrame(), world.snapCamera())],
    ['stableFollow', () => (at(STABLE.emmaStand), world.releaseFrame(), world.snapCamera())],
    ['stableFrame', () => (void world.frame(STABLE_FRAME, 18, { ms: 0 }), world.snapCamera())],
    ['cornerFollow', () => (at(CORNER.stand), world.releaseFrame(), world.snapCamera())],
    ['cornerFrame', () => (void cornerFrame(0), world.snapCamera())],
    ['cornerPortrait', () => (at(CORNER.stand), void portrait('body', CORNER.stand, 0), world.snapCamera())],
    ['beadFollow', () => (at(BEAD_TREE.stand), world.releaseFrame(), world.snapCamera())],
    ['beadFrame', () => (void beadFrame(0), world.snapCamera())],
    ['signFollow', () => (at(MIST.signStand), world.releaseFrame(), world.snapCamera())],
    ['intro', () => world.introStart()],
  ];
  for (const [name, set] of poses) {
    set();
    out[name] = measureNow();
  }
  let worst = { calls: 0, triangles: 0, callsAt: '', trisAt: '' };
  for (let x = -26; x <= 26; x += 4) {
    for (let z = -22; z <= 15; z += 4) {
      at({ x, z });
      world.releaseFrame();
      world.snapCamera();
      const m = measureNow();
      if (m.calls > worst.calls) worst = { ...worst, calls: m.calls, callsAt: `${x},${z}` };
      if (m.triangles > worst.triangles) worst = { ...worst, triangles: m.triangles, trisAt: `${x},${z}` };
    }
  }
  out.worstFollow = worst;
  world.stable.hay(hayWas, 0);
  at(START);
  world.releaseFrame();
  world.snapCamera();
  return out;
}

/** Numeral heights on screen (CSS px) at the stable framing: the plaque's projected height times the glyph share. */
function numerals(): { min: number; max: number } {
  const plaques = world.scene.getObjectByName('plaques') as THREE.Mesh;
  const pos = plaques.geometry.attributes.position;
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = '700 196px Andika';
  const cellH = Math.round((256 * 0.68) / 1.04);
  const share = ctx.measureText('0').actualBoundingBoxAscent / cellH;
  let min = Infinity;
  let max = 0;
  for (let n = 0; n < 20; n++) {
    const bl = world.toScreen(new THREE.Vector3().fromBufferAttribute(pos, n * 4));
    const tl = world.toScreen(new THREE.Vector3().fromBufferAttribute(pos, n * 4 + 3));
    const h = Math.abs(bl.y - tl.y) * share;
    min = Math.min(min, h);
    max = Math.max(max, h);
  }
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

/** Put the walker somewhere and snap the camera to follow it. */
function place(x: number, z: number): void {
  marker.position.set(x, 0, z);
  path = [];
  world.releaseFrame();
  world.snapCamera();
}

Object.assign(window, { __world: world, __dev: { marker, walkTo, measure, numerals, place, stalled, frameAt, picnicFrame, rackFrame, cornerFrame, beadFrame, portrait, THREE } });
world.start();

/**
 * ?view=clearings: the contact sheet of the 13 clearing kinds (2.4.0, docs/v4/2.4.md 5.5 and 9 step 4), each on a bare
 * clearing in a grid with its word under it, in the world's light and from the follow camera's angle, for Tjitse's
 * look. The world stops drawing; the sheet draws with its renderer.
 */
function clearingsSheet(): void {
  world.setPaused(true);
  document.body.classList.add('clean');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6f0ff');
  const sun = new THREE.DirectionalLight('#fff3df', 1.7);
  sun.position.set(-8, 14, 6);
  scene.add(new THREE.HemisphereLight('#eaf6ff', '#a8d48f', 1.6), sun, sun.target);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshLambertMaterial({ color: '#a3d97b' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const words = Object.keys(KIT) as SignWord[];
  const cols = 5;
  const gap = 4.6;
  const rowGap = 6;
  const labels: { el: HTMLElement; at: THREE.Vector3 }[] = [];
  words.forEach((w, i) => {
    const x = ((i % cols) - (cols - 1) / 2) * gap;
    const z = (Math.floor(i / cols) - 1) * rowGap;
    scene.add(new THREE.Mesh(patch(ellipse({ x, z }, KIT_RADIUS + 0.3, KIT_RADIUS + 0.3, 28), { x, z }, 0.3, 0.01, EARTH), material));
    const m = new THREE.Mesh(KIT[w](), material);
    m.position.set(x, 0, z);
    scene.add(m);
    const el = document.createElement('div');
    el.textContent = w;
    el.style.cssText = 'position:fixed;transform:translate(-50%,0);font:600 18px system-ui,sans-serif;color:#3a2a4a;background:rgba(255,255,255,0.8);padding:1px 8px;border-radius:8px;pointer-events:none';
    document.body.append(el);
    labels.push({ el, at: new THREE.Vector3(x, 0, z + KIT_RADIUS + 0.2) });
  });
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 200);
  const place = (): void => {
    camera.aspect = innerWidth / innerHeight;
    // About the follow camera's pitch, far enough back for the whole grid.
    const pitch = THREE.MathUtils.degToRad(42);
    const dist = 26 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * Math.min(camera.aspect, 4 / 3));
    camera.position.set(0, Math.sin(pitch) * dist, 0.6 + Math.cos(pitch) * dist);
    camera.lookAt(0, 0.6, 0.6);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };
  const v = new THREE.Vector3();
  const draw = (): void => {
    place();
    world.renderer.setSize(innerWidth, innerHeight, false);
    world.renderer.render(scene, camera);
    for (const l of labels) {
      v.copy(l.at).project(camera);
      l.el.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
      l.el.style.top = `${((1 - v.y) / 2) * innerHeight}px`;
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
if (new URLSearchParams(location.search).get('view') === 'clearings') clearingsSheet();
