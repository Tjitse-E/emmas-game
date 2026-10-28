// Harness for the actors lane (dev/actors.html): a plain stage with the level's places, the shared lights, a game-like
// follow camera, a close-up camera and the wardrobe's body and face frames, a straight-line stub for routes, buttons for
// everything the actors do, and a look panel with every wardrobe option.
import * as THREE from 'three';
import type { ActorDeps, LookField, PrincessEmote, PrincessLook, UnicornEmote, UnicornLook, Vec2 } from '../contracts';
import {
  BOUNDS, GAZEBO, GRAZE_HOMES, NEST, OBSTACLES, POND, SLIDE, SLIDE_CURVE, STABLE, TREES, WILD_EGG, doorCenter, doorFront, doorIsUpper, inPond,
  inStableBuilding, v2,
} from '../layout';
import { COLOURS, DEFAULT_LOOK, OPTIONS } from '../wardrobe';
import { audio } from '../audio';
import { v3Art } from '../assets';
import { DATA } from '../content/data';
import { createActors } from './index';
import type { UnicornActor } from './unicorn';

// --- renderer, lights and the stage ------------------------------------------------------------------------------

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.info.autoReset = false;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cdeeff');
scene.fog = new THREE.Fog('#cdeeff', 32, 70);
scene.add(new THREE.HemisphereLight('#eaf6ff', '#a8d48f', 1.6));
const sun = new THREE.DirectionalLight('#fff3df', 1.7);
sun.position.set(-8, 14, 6);
scene.add(sun, sun.target);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
const lam = (c: string, o: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const stage = new THREE.Group();
stage.name = 'stage';
scene.add(stage);

// Ground with a hole for the pond.
{
  const shape = new THREE.Shape();
  shape.moveTo(BOUNDS.minX - 6, -(BOUNDS.maxZ + 6));
  shape.lineTo(BOUNDS.maxX + 6, -(BOUNDS.maxZ + 6));
  shape.lineTo(BOUNDS.maxX + 6, -(BOUNDS.minZ - 6));
  shape.lineTo(BOUNDS.minX - 6, -(BOUNDS.minZ - 6));
  const hole = new THREE.Path();
  hole.absellipse(POND.center.x, -POND.center.z, POND.rx, POND.rz, 0, Math.PI * 2, false, 0);
  shape.holes.push(hole);
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), lam('#a9db8f'));
  ground.rotation.x = -Math.PI / 2;
  stage.add(ground);
  const bank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 48, 1, true), lam('#e2d3a4', { side: THREE.BackSide }));
  bank.scale.set(POND.rx, 1, POND.rz);
  bank.position.set(POND.center.x, -0.4, POND.center.z);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 48), lam('#5eaed3'));
  bed.scale.set(POND.rx, POND.rz, 1);
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(POND.center.x, -0.8, POND.center.z);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), lam('#86d4f2', { transparent: true, opacity: 0.78, depthWrite: false }));
  water.scale.set(POND.rx, POND.rz, 1);
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND.center.x, POND.waterY, POND.center.z);
  stage.add(bank, bed, water);
}
// The slide: the chute just under the riders' path, a ladder and the top platform.
{
  const chute = new THREE.Mesh(new THREE.TubeGeometry(SLIDE_CURVE, 64, 0.24, 10), lam('#ff9fcd'));
  chute.position.y = -0.2;
  const rails = [-0.32, 0.32].map((dz) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), lam('#ffffff'));
    r.position.set(3.0, 1.0, 0.4 + dz);
    r.rotation.z = -0.56;
    return r;
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), lam('#ffd6ea'));
  top.position.copy(SLIDE.top).setY(SLIDE.top.y - 0.25);
  stage.add(chute, ...rails, top);
}
// Stable rows: open stalls at the front with half doors, a slab for the upper floor and the building behind.
{
  for (const row of STABLE.rows) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.2, STABLE.depth - 1.4), lam('#fbe6cf'));
    back.position.set(row.centerX, 2.1, STABLE.frontZ - 1.4 - (STABLE.depth - 1.4) / 2);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.12, 1.45), lam('#e9c9a5'));
    slab.position.set(row.centerX, STABLE.upperFloorY - 0.06, STABLE.frontZ - 0.72);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.25, STABLE.depth + 0.4), lam('#f39bb8'));
    roof.position.set(row.centerX, 4.3, STABLE.frontZ - STABLE.depth / 2 + 0.1);
    stage.add(back, slab, roof);
    for (let k = 0; k <= 5; k++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.2, 1.45), lam('#f5d8b8'));
      post.position.set(row.centerX + (k - 2.5) * STABLE.doorWidth, 2.1, STABLE.frontZ - 0.72);
      stage.add(post);
    }
  }
  for (let n = 1; n <= 20; n++) {
    const c = doorCenter(n);
    const door = new THREE.Mesh(new THREE.BoxGeometry(STABLE.doorWidth - 0.16, STABLE.lowerDoorH, 0.08), lam(n % 2 ? '#c98d63' : '#d49b70'));
    door.position.set(c.x, (doorIsUpper(n) ? STABLE.upperFloorY : 0) + STABLE.lowerDoorH / 2, STABLE.frontZ);
    door.name = 'door-' + n;
    stage.add(door);
  }
}
// Nest, gazebo, trees and the wild egg spot.
{
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), lam('#9ccf7f'));
  mound.scale.set(1.5, 0.28, 1.5);
  mound.position.set(NEST.center.x, 0, NEST.center.z);
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 10, 24), lam('#c9965d'));
  nest.rotation.x = -Math.PI / 2;
  nest.position.set(NEST.center.x, 0.3, NEST.center.z);
  const gazebo = new THREE.Mesh(new THREE.CylinderGeometry(GAZEBO.radius - 0.4, GAZEBO.radius - 0.2, 0.3, 24), lam('#ffffff'));
  gazebo.position.set(GAZEBO.center.x, 0.15, GAZEBO.center.z);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(GAZEBO.radius, 1.6, 24), lam('#ffb6d5'));
  roof.position.set(GAZEBO.center.x, 3.3, GAZEBO.center.z);
  stage.add(mound, nest, gazebo, roof);
  for (const o of TREES) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(o.radius, 16, 10), lam('#7cc46f'));
    crown.position.set(o.center.x, 2.2, o.center.z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.4, 8), lam('#b98559'));
    trunk.position.set(o.center.x, 0.7, o.center.z);
    stage.add(crown, trunk);
  }
}

// --- the straight-line stub for routes -----------------------------------------------------------------------------

function isWalkable(p: Vec2): boolean {
  if (p.x < BOUNDS.minX || p.x > BOUNDS.maxX || p.z < BOUNDS.minZ || p.z > BOUNDS.maxZ) return false;
  if (inPond(p) || inStableBuilding(p)) return false;
  return !OBSTACLES.some((o) => Math.hypot(p.x - o.center.x, p.z - o.center.z) < o.radius);
}

function nearestWalkable(p: Vec2): Vec2 {
  let q = { x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, p.x)), z: Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, p.z)) };
  if (inPond(q)) {
    const dx = (q.x - POND.center.x) / POND.rx;
    const dz = (q.z - POND.center.z) / POND.rz;
    const k = 1 / Math.max(1e-3, Math.hypot(dx, dz));
    q = { x: POND.center.x + dx * k * (POND.rx + 0.4), z: POND.center.z + dz * k * (POND.rz + 0.4) };
  }
  if (inStableBuilding(q)) q = { x: q.x, z: STABLE.frontZ + 0.4 };
  for (const o of OBSTACLES) {
    const dx = q.x - o.center.x;
    const dz = q.z - o.center.z;
    const d = Math.hypot(dx, dz);
    if (d < o.radius) q = { x: o.center.x + (dx / (d || 1)) * (o.radius + 0.3), z: o.center.z + (dz / (d || 1)) * (o.radius + 0.3) };
  }
  return q;
}

const deps: ActorDeps = { route: (_from, to) => [nearestWalkable(to)], isWalkable, nearestWalkable };

// --- the actors ------------------------------------------------------------------------------------------------------

const actors = createActors(scene, deps);
const { princess, herd, egg, fx } = actors;

const BREED: Record<UnicornLook['breed'], Omit<UnicornLook, 'stage' | 'breed'>> = {
  moon: { body: '#f7f8ff', mane: '#7d9cf0', mane2: '#b9c8f8' },
  nestling: { body: '#fff0d4', mane: '#ff6fae', mane2: '#ffb0d2' },
  snow: { body: '#e4f3ff', mane: '#4fc3f0', mane2: '#bdeaff' },
  berry: { body: '#e3d2ff', mane: '#d02a96', mane2: '#ff7cc4' },
};
const HERD: [string, UnicornLook['stage'], UnicornLook['breed'], Partial<UnicornLook>?][] = [
  ['Rosie', 'baby', 'moon'],
  ['Pip', 'baby', 'nestling'],
  ['Meg', 'baby', 'snow'],
  ['Beth', 'baby', 'berry'],
  ['Luna', 'baby', 'moon', { body: '#ffe6f2', mane: '#8f9ff0' }],
  ['Daisy', 'baby', 'nestling', { body: '#fff7c9', mane: '#ff9a6b', mane2: '#ffd08a' }],
  ['Holly', 'baby', 'berry', { body: '#ffe0ef', shiny: true }],
  ['Fizz', 'baby', 'snow', { mane: '#9b8cf5', mane2: '#d9d2ff' }],
  ['Star', 'foal', 'moon'],
  ['Sunny', 'foal', 'nestling'],
  ['Frost', 'foal', 'snow', { shiny: true }],
  ['Plum', 'foal', 'berry'],
  ['Coco', 'foal', 'nestling', { body: '#ffe2cf', mane: '#ff6f9a', mane2: '#ffb8cf' }],
  ['Jewel', 'foal', 'berry', { body: '#dff0ff', mane: '#7b5cff', mane2: '#ff8fd2' }],
];
const homes = [...GRAZE_HOMES, v2(-6, 1), v2(-11, 1)];
HERD.forEach(([name, stage, breed, extra], i) => {
  const look: UnicornLook = { stage, breed, ...BREED[breed], ...extra };
  const u = herd.add({ id: 'u' + i, name, look, at: homes[i] });
  u.graze(homes[i]);
});

// --- cameras ---------------------------------------------------------------------------------------------------------

type View =
  | { kind: 'game' }
  | { kind: 'close'; subject: string; angle: number; dist: number; height: number }
  | { kind: 'portrait'; frame: 'body' | 'face' };

/**
 * The wardrobe's frames (2.4): the camera looks through a point lookY above her from a pitch, so the visible height
 * at her is hvis, and she stands at xFrac of the screen width (left of the panel).
 */
const FRAMES = {
  body: { hvis: 2.08, lookY: 0.58, pitch: 8 },
  face: { hvis: 1.05, lookY: 1.08, pitch: 6 },
} as const;
const PORTRAIT_FOV = 38;
/** Where she stands across the screen in the wardrobe: half the panel's left edge (491 of 1080 at 1080 x 810). */
const X_FRAC = 245 / 1080;
let view: View = { kind: 'game' };
const camTarget = new THREE.Vector3(princess.position.x, 0, princess.position.z);

function subjectPoint(id: string, out: THREE.Vector3): THREE.Vector3 {
  if (id === 'emma') return out.copy(princess.position).setY(princess.position.y + 0.75);
  if (id === 'egg') return out.copy(egg.position);
  if (id.startsWith('@')) return out.fromArray(id.slice(1).split(',').map(Number));
  const u = herd.get(id);
  if (!u) return out.copy(princess.position);
  u.headTop(out);
  out.y -= 0.35 * (u.look.stage === 'foal' ? 1.2 : 1);
  return out;
}

function placeCamera(dt: number): void {
  if (view.kind === 'game') {
    camera.fov = 40;
    const want = new THREE.Vector3(princess.position.x, 0, princess.position.z);
    camTarget.lerp(want, 1 - Math.exp(-4 * dt));
    camera.position.set(camTarget.x, camTarget.y + 11.9, camTarget.z + 11.0);
    camera.lookAt(camTarget);
  } else if (view.kind === 'portrait') {
    camera.fov = PORTRAIT_FOV;
    const f = FRAMES[view.frame];
    const tan = Math.tan(THREE.MathUtils.degToRad(PORTRAIT_FOV / 2));
    const d = f.hvis / (2 * tan);
    const ox = (1 - 2 * X_FRAC) * d * tan * camera.aspect;
    const p = THREE.MathUtils.degToRad(f.pitch);
    const look = new THREE.Vector3(princess.position.x + ox, f.lookY, princess.position.z);
    camTarget.lerp(look, 1 - Math.exp(-6 * dt));
    camera.position.set(camTarget.x, camTarget.y + d * Math.sin(p), camTarget.z + d * Math.cos(p));
    camera.lookAt(camTarget);
  } else {
    camera.fov = 30;
    const at = subjectPoint(view.subject, new THREE.Vector3());
    camTarget.lerp(at, 1 - Math.exp(-8 * dt));
    camera.position.set(camTarget.x + Math.sin(view.angle) * view.dist, camTarget.y + view.height, camTarget.z + Math.cos(view.angle) * view.dist);
    camera.lookAt(camTarget);
  }
  camera.updateProjectionMatrix();
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// --- input: tap to walk (twice to run), tap a unicorn to call it, drag a unicorn to carry it ----------------------

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function rayAt(x: number, y: number): THREE.Raycaster {
  raycaster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  return raycaster;
}
function groundAt(x: number, y: number): Vec2 | null {
  const hit = rayAt(x, y).ray.intersectPlane(groundPlane, new THREE.Vector3());
  return hit ? { x: hit.x, z: hit.z } : null;
}

let followers: UnicornActor[] = [];
let selected: UnicornActor = herd.all()[0];
let lastTap = { x: 0, z: 0, at: 0 };
let press: { x: number; y: number; u: UnicornActor | null; dragging: boolean } | null = null;

function callUnicorn(u: UnicornActor): void {
  selected = u;
  if (followers.includes(u)) return;
  if (followers.length >= 3) {
    const old = followers.shift()!;
    old.graze(deps.nearestWalkable({ x: old.position.x, z: old.position.z }));
  }
  followers.push(u);
  followers.forEach((f, i) => f.follow(i));
  void u.emote('happy');
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  void audio.unlock().catch(() => {});
  const u = herd.pick(rayAt(e.clientX, e.clientY));
  press = { x: e.clientX, y: e.clientY, u, dragging: false };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!press?.u) return;
  const g = groundAt(e.clientX, e.clientY);
  if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14) {
    press.dragging = true;
    followers = followers.filter((f) => f !== press!.u);
    followers.forEach((f, i) => f.follow(i));
    press.u.lift();
  }
  if (press.dragging && g) press.u.carryTo(g);
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const p = press;
  press = null;
  if (!p) return;
  const g = groundAt(e.clientX, e.clientY);
  if (p.u && p.dragging) {
    if (g) p.u.drop(g);
    return;
  }
  if (p.u) return callUnicorn(p.u);
  if (!g) return;
  if (Math.hypot(g.x - SLIDE.dropZone.center.x, g.z - SLIDE.dropZone.center.z) < 1.2) {
    void princess.rideSlide();
    return;
  }
  const now = performance.now();
  const run = now - lastTap.at < 1000 && Math.hypot(g.x - lastTap.x, g.z - lastTap.z) < 1.2;
  lastTap = { x: g.x, z: g.z, at: now };
  void princess.walkTo(deps.route({ x: princess.position.x, z: princess.position.z }, g), { run });
});

// --- buttons -----------------------------------------------------------------------------------------------------

const panel = document.getElementById('panel')!;
document.getElementById('toggle')!.addEventListener('click', () => panel.classList.toggle('hidden'));
function section(title: string, buttons: [string, () => void][]): void {
  const h = document.createElement('h3');
  h.textContent = title;
  panel.appendChild(h);
  for (const [label, fn] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', fn);
    panel.appendChild(b);
  }
}
const at = (y = 0.6) => princess.position.clone().setY(princess.position.y + y);
let door = 13;
let ribbon = 0;
let crowned = false;
let detail: 0 | 1 | 2 = 0;
section('Princess Emma', [
  ['wave', () => void princess.emote('wave')],
  ['clap', () => void princess.emote('clap')],
  ['jump', () => void princess.emote('jump')],
  ['twirl', () => void princess.emote('twirl')],
  ['slide', () => void princess.rideSlide()],
  ['crown', () => princess.crown((crowned = !crowned))],
  ['ribbons', () => princess.setLook({ thingColour: COLOURS[++ribbon % COLOURS.length] })],
  ['to pond', () => void princess.walkTo(deps.route(princess.position, v2(1, 3)))],
  ['to stable', () => void princess.walkTo(deps.route(princess.position, STABLE.emmaStand))],
]);
const emotes: UnicornEmote[] = ['hop', 'nuzzle', 'shake', 'munch', 'happy', 'shiver', 'look', 'yawn'];
section('Selected unicorn', [
  ['next', () => (selected = herd.all()[(herd.all().indexOf(selected) + 1) % herd.all().length])],
  ...emotes.map((k) => [k, () => void selected.emote(k)] as [string, () => void]),
  ['follow', () => callUnicorn(selected)],
  ['graze', () => selected.graze(deps.nearestWalkable(selected.position))],
  ['slide', () => void selected.rideSlide()],
  ['swim', () => selected.swim()],
  ['stall', () => void selected.enterStall(door)],
  ['door +1', () => (door = (door % 20) + 1)],
  ['peek on', () => selected.peek(true)],
  ['peek off', () => selected.peek(false)],
  ['nightcap', () => selected.nightcap(!selected.pose.nightcap)],
  ['toy', () => selected.showToy(v3Art('words/duck.webp'))],
  ['wear', () => selected.showToy(v3Art('words/crown.webp'), { on: 'head' })],
  // The cape is a greyscale picture: it shows in v3's tint, as in the game.
  ['wear cape', () => selected.showToy(v3Art('words/cape.webp'), { on: 'head', tint: DATA.words.find((w) => w.word === 'cape')?.tint })],
  ['toy mug', () => selected.showToy(v3Art('words/mug.webp'), { tint: DATA.words.find((w) => w.word === 'mug')?.tint })],
  ['no toy', () => selected.showToy(null)],
  ['look at Emma', () => selected.lookAt(princess.position)],
]);
// The wardrobe: every option of every field, the reactions and the portrait.
const REACTION: Partial<Record<LookField, PrincessEmote>> = { hair: 'toss', eyes: 'blink', gown: 'twirl', style: 'show', thing: 'tilt' };
let held = false;
let portraitOn = false;
let rose = false;
let react = true;
function pick(field: LookField, id: string): void {
  princess.setLook({ [field]: id } as Partial<PrincessLook>);
  if (react) void princess.emote(REACTION[field] ?? 'twirl');
}
const FIELDS = Object.keys(OPTIONS) as LookField[];
for (const f of FIELDS) {
  section('Look: ' + f, (OPTIONS[f] as readonly string[]).map((id) => [id, () => pick(f, id)] as [string, () => void]));
}
section('Look: more', [
  ['default', () => princess.setLook({ ...DEFAULT_LOOK })],
  ['random', () => {
    const any = (f: LookField) => (OPTIONS[f] as readonly string[])[Math.floor(Math.random() * OPTIONS[f].length)];
    princess.setLook(Object.fromEntries(FIELDS.map((f) => [f, any(f)])) as Partial<PrincessLook>);
  }],
  ['react on/off', () => (react = !react)],
  ...(['toss', 'blink', 'show', 'tilt', 'curtsy'] as PrincessEmote[]).map((k) => [k, () => void princess.emote(k)] as [string, () => void]),
  ['hold', () => princess.hold((held = !held))],
  ['turn +', () => princess.turnBy(0.5)],
  ['turn -', () => princess.turnBy(-0.5)],
  ['face cam', () => princess.face({ x: princess.position.x, z: princess.position.z + 5 })],
  ['rose', () => princess.extra((rose = !rose) ? 'rose' : null)],
  ['portrait', () => princess.portrait((portraitOn = !portraitOn))],
  ['body', () => portraitView('body')],
  ['face', () => portraitView('face')],
  ['run', () => void princess.walkTo(deps.route(princess.position, v2(princess.position.x > -6 ? -12 : 2, 5)), { run: true })],
]);
/** Stand her facing the camera in a wardrobe frame. */
function portraitView(frame: 'body' | 'face'): void {
  princess.stop();
  princess.face({ x: princess.position.x, z: princess.position.z + 5 });
  view = { kind: 'portrait', frame };
}
section('Egg', [
  ['warm in nest', () => egg.place(new THREE.Vector3(NEST.center.x, NEST.eggY, NEST.center.z), 'warm')],
  ['snow on grass', () => egg.place(new THREE.Vector3(WILD_EGG.at.x, 0, WILD_EGG.at.z), 'snow')],
  ['wobble', () => void egg.wobble()],
  ['steam', () => void egg.steam()],
  ['frost', () => void egg.frost()],
  ['hatch', () => {
    void egg.hatch().then(() => {
      const n = herd.all().length;
      const u = herd.add({ id: 'u' + n, name: 'New', look: { stage: 'baby', breed: 'nestling', ...BREED.nestling }, at: { x: egg.position.x, z: egg.position.z + 0.05 }, mode: 'hatching' });
      selected = u;
    });
  }],
  ['hide', () => egg.hide()],
]);
section('Effects', [
  ['sparkle', () => fx.sparkle(at(1.0))],
  ['hearts', () => fx.hearts(at(1.3))],
  ['splash', () => fx.splash(new THREE.Vector3(POND.center.x - 3, POND.waterY, POND.center.z))],
  ['starfall', () => void fx.starfall(at(1.4))],
  ['moonbeam', () => void fx.moonbeam(at(0), 2500)],
]);
section('View', [
  ['game', () => (view = { kind: 'game' })],
  ['close Emma', () => (view = { kind: 'close', subject: 'emma', angle: 0, dist: 3.6, height: 0.9 })],
  ['close selected', () => (view = { kind: 'close', subject: selected.id, angle: 0.5, dist: 2.6, height: 0.8 })],
  ['turn', () => view.kind === 'close' && (view.angle += Math.PI / 4)],
  ['detail 0/1/2', () => actors.setDetail((detail = ((detail + 1) % 3) as 0 | 1 | 2))],
  ['panel off', () => panel.classList.add('hidden')],
]);

// --- loop, stats and the test hook ---------------------------------------------------------------------------------

const perfBox = document.getElementById('perf')!;
let fps = 60;
let last = performance.now();
let time = 0;
/** Slow motion for screenshots of quick moments (1 = normal). */
let timeScale = 1;
/** Average milliseconds actors.update takes (CPU cost of the actors). */
let updateMs = 0;
/** Draw calls and triangles of the actors alone (every mesh named actors-*). */
function actorStats(): { calls: number; triangles: number; points: number } {
  let calls = 0;
  let triangles = 0;
  let points = 0;
  scene.traverse((o) => {
    if (!o.name.startsWith('actors-') || !o.visible) return;
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g) return;
    if ((o as THREE.Points).isPoints) {
      calls++;
      points += g.drawRange.count;
      return;
    }
    const n = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    const inst = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1;
    if (inst <= 0) return;
    calls++;
    triangles += n * inst;
  });
  return { calls, triangles: Math.round(triangles), points };
}

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const real = Math.min(0.05, (now - last) / 1000);
  const dt = real * timeScale;
  last = now;
  time += dt;
  fps = fps * 0.95 + (1 / Math.max(1e-3, real)) * 0.05;
  const t0 = performance.now();
  actors.update(dt, time);
  updateMs = updateMs * 0.95 + (performance.now() - t0) * 0.05;
  placeCamera(real);
  renderer.info.reset();
  renderer.render(scene, camera);
  if (Math.floor(time * 4) !== Math.floor((time - dt) * 4)) {
    const a = actorStats();
    const s = actors.stats();
    perfBox.textContent =
      `fps ${fps.toFixed(0)}  update ${updateMs.toFixed(2)} ms  all: calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}\n` +
      `actors: calls ${a.calls} tris ${a.triangles} points ${a.points}\n` +
      `unicorns full ${s.full} cheap ${s.cheap} culled ${s.culled}  emma ${princess.mode}`;
  }
});

/** For playwright-cli: state, screen points and shortcuts. */
const hook = {
  actors, renderer, camera, scene, deps,
  stats: () => ({ ...actorStats(), all: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }, fps, updateMs, ...actors.stats() }),
  screen(p: THREE.Vector3) {
    const v = p.clone().project(camera);
    return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
  },
  unicornScreen(id: string) {
    const u = herd.get(id);
    return u ? hook.screen(u.hitCentre(new THREE.Vector3())) : null;
  },
  view(v: View) {
    view = v;
  },
  slow(k: number) {
    timeScale = k;
  },
  /** Resolve when `cond` holds (checked every frame), or false after `ms`. */
  until(cond: () => boolean, ms = 20000): Promise<boolean> {
    const end = performance.now() + ms;
    return new Promise((resolve) => {
      const tick = () => (cond() ? resolve(true) : performance.now() > end ? resolve(false) : requestAnimationFrame(tick));
      tick();
    });
  },
  /** The unicorn a tap at (x, y) would pick, or null. */
  pickAt(x: number, y: number) {
    return herd.pick(rayAt(x, y))?.id ?? null;
  },
  select(id: string) {
    selected = herd.get(id) ?? selected;
  },
  call: callUnicorn,
  get followers() {
    return followers.map((f) => f.id);
  },
  /** Stand a unicorn (or 'emma') still, facing south, and look at it from `angle` (0 = straight from the front). */
  portrait(id: string, angle = 0.5, dist = 2.2, height = 0.55) {
    if (id === 'emma') {
      princess.stop();
      princess.face({ x: princess.position.x, z: princess.position.z + 5 });
    } else {
      const u = herd.get(id)!;
      u.place({ x: u.position.x, z: u.position.z }, 0);
      selected = u;
    }
    view = { kind: 'close', subject: id, angle, dist, height };
  },
  /** Bring every unicorn into the game view around Princess Emma (budget check). */
  gather() {
    herd.all().forEach((u, i) => {
      const a = (i / herd.all().length) * Math.PI * 2;
      const p = deps.nearestWalkable({ x: princess.position.x + Math.cos(a) * (2 + (i % 3)), z: princess.position.z + Math.sin(a) * (1.6 + (i % 3) * 0.8) });
      u.place(p, a);
      u.graze(p);
    });
  },
  doorFront,
  /** Wear a look (missing fields keep what she wears). */
  setLook(l: Partial<PrincessLook>) {
    princess.setLook(l);
    return princess.look;
  },
  portraitView,
  /** The triangles and parts Princess Emma draws now. */
  emma() {
    return { parts: princess.parts.n, triangles: princess.triangles(), look: princess.look, mode: princess.mode };
  },
};
(window as unknown as { __actors: typeof hook }).__actors = hook;
