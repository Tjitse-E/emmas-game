// The world lane's harness (dev/world.html): the whole world, a cone that walks routes to taps, buttons for every
// world call and a stats box. window.__world and window.__dev are there for playwright-cli.
import * as THREE from 'three';
import { NEST, PLACES, POND, SLIDE, STABLE, START, type Place, type Vec2 } from '../layout';
import { createWorld } from './index';
import { createActors, type ActorsImpl } from '../actors';
import type { UnicornLook } from '../contracts';

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
section('Camera');
button('nest', () => void world.frame(NEST.center, 7, { shiftY: 0.08 }));
button('pond', () => void world.frame({ x: POND.center.x - 2, z: POND.center.z - 0.5 }, 17));
button('stable', () => void world.frame(STABLE_FRAME, 18));
button('release', () => world.releaseFrame());
button('intro', () => void world.introSweep(4500));
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
  stats.textContent = `fps ${p.fps}  calls ${p.calls}  tris ${p.triangles}\ngeo ${p.geometries}  tex ${p.textures}  tod ${world.timeOfDay.toFixed(2)}\npr ${p.pixelRatio}  quality ${p.quality}  onSlow ${slowLevel}\npick ${JSON.stringify(lastPick)}`;
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
  const poses: [string, () => void][] = [
    ['start', () => (at(START), world.releaseFrame(), world.snapCamera())],
    ['nest', () => (void world.frame(NEST.center, 7, { ms: 0 }), world.snapCamera())],
    ['slide', () => (at(SLIDE.ladderBase), world.releaseFrame(), world.snapCamera())],
    ['pond', () => (at(POND.center), world.releaseFrame(), world.snapCamera())],
    ['stableFollow', () => (at(STABLE.emmaStand), world.releaseFrame(), world.snapCamera())],
    ['stableFrame', () => (void world.frame(STABLE_FRAME, 18, { ms: 0 }), world.snapCamera())],
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

Object.assign(window, { __world: world, __dev: { marker, walkTo, measure, numerals, place, stalled, THREE } });
world.start();
