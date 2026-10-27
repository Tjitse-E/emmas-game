// The ui lane's harness (dev/ui.html): a pastel stand-in for the 3D world with a drifting fake baby and egg as
// anchors, and dev buttons that run every part of the layer with real specs on v3 clip ids. Dev only; the
// buttons carry text because Tjitse and the flows use them, never Emma.
import type { EggSpec, EndMember, MomentHooks, NameChoice, NamingSpec, Place, ScreenPoint, WishItem, WishSpec } from '../contracts';
import { audio } from '../audio';
import { wordPic } from '../assets';
import { createLayer } from './index';

const STYLE = `
html, body { margin: 0; height: 100%; overflow: hidden; background: #cfe8ff; }
#world { position: fixed; inset: 0; background: linear-gradient(180deg, #bfe3ff 0%, #dff1ff 34%, #e8f7d8 46%, #bfe6a2 60%, #a8d98c 100%); }
#world .flower { position: absolute; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 0 4px #fff8; }
.fake { position: absolute; left: 0; top: 0; pointer-events: none; transition: filter 300ms; }
.fake.hidden { display: none; }
.baby { width: 150px; height: 130px; margin: -10px 0 0 -75px; }
.baby .body { position: absolute; left: 20px; top: 56px; width: 110px; height: 66px; border-radius: 50%; background: #efe6ff; box-shadow: inset -8px -8px 0 #ddd0f5; }
.baby .head { position: absolute; left: 44px; top: 10px; width: 70px; height: 62px; border-radius: 50%; background: #f5efff; box-shadow: inset -6px -6px 0 #e2d6f7; }
.baby .mane { position: absolute; left: 34px; top: 4px; width: 40px; height: 56px; border-radius: 50% 40% 50% 50%; background: #ff9cc8; }
.baby .horn { position: absolute; left: 76px; top: -16px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 28px solid #ffd25e; }
.baby .eye { position: absolute; left: 88px; top: 32px; width: 12px; height: 15px; border-radius: 50%; background: #4a3560; }
.baby .cheek { position: absolute; left: 90px; top: 50px; width: 14px; height: 9px; border-radius: 50%; background: #ffb3c7; }
.egg3d { width: 120px; height: 150px; margin: -10px 0 0 -60px; border-radius: 50% 50% 46% 46% / 58% 58% 42% 42%; background: radial-gradient(circle at 36% 30%, #fff, #eadcff 60%, #cdb8f2); box-shadow: 0 16px 0 -6px #0001; }
.fake.hot { filter: sepia(.4) saturate(3) hue-rotate(-30deg); animation: dev-shake 200ms 4; }
.fake.cold { filter: saturate(.3) hue-rotate(160deg) brightness(1.1); animation: dev-shake 120ms 6; }
.fake.hop { animation: dev-hop 500ms 2; }
.fake.tilt { animation: dev-tilt 500ms 2; }
@keyframes dev-shake { 25% { translate: -6px 0; } 75% { translate: 6px 0; } }
@keyframes dev-hop { 50% { translate: 0 -24px; } }
@keyframes dev-tilt { 50% { rotate: 10deg; } }
#dev { position: fixed; left: 8px; bottom: 8px; z-index: 50; display: flex; flex-wrap: wrap; gap: 4px; max-width: 420px; font: 12px system-ui; }
#dev button { padding: 4px 7px; border-radius: 6px; border: 1px solid #8a7ab8; background: #fffd; }
#dev pre { width: 100%; max-height: 90px; overflow: auto; margin: 0; background: #fffc; font-size: 10px; }
body.clean #dev { display: none; }
`;

const style = document.createElement('style');
style.textContent = STYLE;
document.head.appendChild(style);

// ---- the stand-in world
const world = document.getElementById('world')!;
for (let i = 0; i < 40; i++) {
  const f = document.createElement('span');
  f.className = 'flower';
  f.style.left = `${(i * 37) % 100}%`;
  f.style.top = `${48 + ((i * 53) % 50)}%`;
  f.style.background = ['#ffc4e1', '#fff1a8', '#d8c8ff', '#ffffff'][i % 4];
  world.appendChild(f);
}
const baby = document.createElement('div');
baby.className = 'fake baby hidden';
baby.innerHTML = '<span class="body"></span><span class="mane"></span><span class="head"></span><span class="horn"></span><span class="eye"></span><span class="cheek"></span>';
world.appendChild(baby);
const egg = document.createElement('div');
egg.className = 'fake egg3d hidden';
world.appendChild(egg);

/** Where the fake actor stands, as fractions of the screen (head top), and how far it drifts. */
let spot = { x: 0.5, y: 0.3, drift: 26 };
const unit = () => Math.min(innerWidth / 1180, innerHeight / 820);
const actorAt = (t: number) => ({
  x: innerWidth * spot.x + Math.sin(t / 1300) * spot.drift,
  y: innerHeight * spot.y + Math.cos(t / 900) * spot.drift * 0.25,
});
function frame(t: number) {
  const p = actorAt(t);
  for (const e of [baby, egg]) e.style.transform = `translate(${p.x}px, ${p.y}px)`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const anchor = (): ScreenPoint => ({ ...actorAt(performance.now()), visible: true });

function show(which: 'baby' | 'egg' | null, at?: { x: number; y: number }) {
  baby.classList.toggle('hidden', which !== 'baby');
  egg.classList.toggle('hidden', which !== 'egg');
  if (at) spot = { ...spot, ...at };
}

function react(kind: string) {
  const target = egg.classList.contains('hidden') ? baby : egg;
  const cls = kind === 'hot' ? 'hot' : kind === 'cold' ? 'cold' : kind === 'shake' ? 'cold' : kind === 'look' ? 'tilt' : 'hop';
  target.classList.remove('hot', 'cold', 'hop', 'tilt');
  void target.offsetWidth;
  target.classList.add(cls);
  setTimeout(() => target.classList.remove(cls), 1400);
  log(`react ${kind}`);
}

// ---- the layer
const layer = createLayer(document.getElementById('ui')!);
const results: unknown[] = [];
const logEl = document.createElement('pre');
function log(line: string) {
  logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 3000);
  console.log('[ui-dev]', line);
}
const hooks: MomentHooks = { anchor, react, log: (e, d) => log(`${e} ${JSON.stringify(d ?? {})}`) };

// ---- sample specs on v3 clips (new v4 ids warn as missing, which is fine)
const count = Array.from({ length: 20 }, (_, i) => `num-${i + 1}`);
const warmEgg: EggSpec = {
  kind: 'warm', need: 13, have: 8, answer: 5, stones: [3, 5, 7],
  clips: {
    intro: ['g-egg'], goal: ['num-egg-13', 'num-warm-8'], afterGoal: ['g-stone'], right: ['fb-warm', 'v4-eight-and-five'],
    tooBig: (k) => ['fb-hot', `num-over-${k}`], tooSmall: (k) => ['fb-brr', `num-cold-${k}`], hint: ['h-count'], count,
  },
};
const snowEgg: EggSpec = {
  kind: 'snow', need: 9, have: 13, answer: 4, stones: [3, 4, 6],
  clips: {
    intro: ['v4-snow-intro'], goal: ['num-egg-9', 'v4-but-13-warm'], right: ['v4-just-right', 'v4-thirteen-take-four'],
    tooBig: (k) => ['fb-brr', `v4-too-cold-${k}`], tooSmall: (k) => ['fb-hot', `num-over-${k}`], hint: ['v4-count-extra'], count,
  },
};
const bells: NameChoice[] = [
  { name: 'Pip', gpcs: ['p', 'i', 'p'], clip: 'name-pip', distractors: ['o', 'b'] },
  { name: 'Meg', gpcs: ['m', 'e', 'g'], clip: 'name-meg', distractors: ['a', 'n'] },
  { name: 'Beth', gpcs: ['b', 'e', 'th'], clip: 'name-beth', distractors: ['a', 'f'] },
];
const naming: NamingSpec = {
  bells,
  clips: { bells: ['g-bells'], drag: ['g-bell-drag'], spell: ['g-spell'], gems: ['g-gems'], slide: ['g-slide'], done: ['fb-spelled'], again: ['fb-listen'] },
};
const item = (word: string, gpcs: string[]): WishItem => ({ word, gpcs, pic: wordPic(word), clip: `word-${word}`, tier: 1 });
const foodWish: WishSpec = {
  kind: 'food', target: item('plum', ['p', 'l', 'u', 'm']),
  basket: [item('corn', ['c', 'or', 'n']), item('plum', ['p', 'l', 'u', 'm']), item('cake', ['c', 'a-e', 'k'])],
  level: 1, decoys: { corn: 'other', cake: 'other' },
  clips: { intro: ['g-wish', 'g-hungry'], goal: ['g-hungry'], right: ['fb-yes'], hint: ['h-sounds'] },
};
const bathWish: WishSpec = {
  kind: 'bath', target: item('duck', ['d', 'u', 'ck']),
  basket: [item('boat', ['b', 'oa', 't']), item('shell', ['sh', 'e', 'll']), item('duck', ['d', 'u', 'ck'])],
  level: 1, decoys: { boat: 'other', shell: 'other' },
  clips: { intro: ['g-wish', 'v4-bath-wish'], goal: ['v4-bath-wish'], right: ['fb-yes'], hint: ['h-sounds'] },
};
const foods = ['plum', 'corn', 'cake', 'bun', 'apple'].map((w) => item(w, [...w]));
/** The goodnight herd: her two new babies among twelve, in v3's coat and mane colours. */
const BODIES = ['#ffe0ef', '#e6dcff', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf', '#ffffff', '#f5d9ff'];
const MANES = ['#ff7fbf', '#9d7bff', '#4fc3ff', '#ffbf3f', '#3fd69a', '#ff8f6b', '#c46bff', '#ff5f8f'];
const HERD_NAMES = ['Rosie', 'Luna', 'Daisy', 'Willow', 'Poppy', 'Isla', 'Lily', 'Ruby', 'Bonnie', 'Evie', 'Mabel', 'Hazel'];
const members: EndMember[] = [
  ...HERD_NAMES.map((name, i) => ({ name, body: BODIES[i % BODIES.length], mane: MANES[(i * 3) % MANES.length] })),
  { name: 'Pip', body: '#fff3c4', mane: '#3fd69a', isNew: true },
  { name: 'Nell', body: '#ffffff', mane: '#4fc3ff', isNew: true },
];

// ---- the dev buttons
const places: Place[] = ['nest', 'pond', 'slide', 'wildEgg', 'stable', 'gazebo'];
let placeIx = 0;
const runs: Record<string, () => Promise<unknown> | void> = {
  start: () => layer.start(() => void audio.unlock()).then(() => layer.lumi.show(true)),
  lumi: () => layer.lumi.speak(['g-egg']),
  'egg warm': async () => { show('egg', { x: 0.5 - (96 * unit()) / innerWidth, y: 0.36 }); const r = await layer.egg(warmEgg, hooks); results.push({ egg: 'warm', ...r }); log(`egg warm ${JSON.stringify(r)}`); },
  'egg snow': async () => { show('egg', { x: 0.5 - (96 * unit()) / innerWidth, y: 0.36 }); const r = await layer.egg(snowEgg, hooks); results.push({ egg: 'snow', ...r }); log(`egg snow ${JSON.stringify(r)}`); },
  naming: async () => {
    show('baby', { x: 0.5, y: 0.26 });
    const r = await layer.naming(naming, { ...hooks, chosen: (n) => log(`chosen ${n.name}`) });
    results.push({ naming: r.name.name, outcome: r.outcome, misses: r.misses, ms: r.ms });
    log(`naming ${r.name.name} ${r.outcome}`);
    layer.tag(r.name.name, () => ({ ...anchor(), y: anchor().y - 14 }), 3000);
  },
  'wish food': async () => { show('baby', { x: 0.5, y: 0.42 }); const r = await layer.wish(foodWish, hooks); results.push({ wish: 'food', ...r }); log(`wish food ${JSON.stringify(r)}`); },
  'wish bath': async () => { show('baby', { x: 0.42, y: 0.4 }); const r = await layer.wish(bathWish, hooks); results.push({ wish: 'bath', ...r }); log(`wish bath ${JSON.stringify(r)}`); },
  'ghost tap': () => layer.ghost.tap(() => ({ x: innerWidth * 0.3, y: innerHeight * 0.6, visible: true })),
  'ghost drag': () => layer.ghost.drag(() => ({ x: innerWidth * 0.3, y: innerHeight * 0.7, visible: true }), anchor),
  arrow: () => {
    const place = places[placeIx++ % places.length];
    const t0 = performance.now();
    // The goal circles round outside the screen, so the arrow walks along the edges.
    layer.arrow({ place, at: () => { const a = (performance.now() - t0) / 4000; return { x: innerWidth / 2 + Math.cos(a) * innerWidth, y: innerHeight / 2 + Math.sin(a) * innerHeight, visible: false }; } }, () => log(`arrow ${place} tapped`));
  },
  'arrow off': () => layer.arrow(null),
  tag: () => { show('baby'); layer.tag('Pip', () => ({ ...anchor(), y: anchor().y - 14 })); },
  food: () => {
    show('baby', { x: 0.5, y: 0.4 });
    layer.foodBasket({ show: true, foods, drop: (f, x, y) => { const a = anchor(); const hit = Math.hypot(x - a.x, y - a.y - 60) < 160; log(`drop ${f.word} ${hit}`); if (hit) react('munch'); return hit; } });
  },
  'food off': () => layer.foodBasket({ show: false }),
  'the end': async () => { await layer.theEnd({ herd: 14, members }); log('play again'); },
  'the end plain': async () => { await layer.theEnd({ herd: 14 }); log('play again'); },
  day: () => layer.sky(0),
  sunset: () => layer.sky(0.5),
  night: () => layer.sky(1),
  curtain: async () => { await layer.curtain(true, '#fff4fb'); await new Promise((r) => setTimeout(r, 400)); await layer.curtain(false); },
  perf: () => layer.perf('60 fps  42 calls  61k tris'),
  replay: () => log(`replay ${layer.replay()}`),
  idle: () => log(`idle ${layer.idleNow()}`),
  reset: () => { layer.reset(); layer.sky(0); show(null); },
  clean: () => { document.body.classList.toggle('clean'); },
};
const dev = document.getElementById('dev')!;
for (const name of Object.keys(runs)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.addEventListener('click', () => void runs[name]());
  dev.appendChild(b);
}
dev.appendChild(logEl);

Object.assign(window, { __ui: layer, __dev: { run: (n: string) => runs[n](), results, show, anchor } });
void runs.start();
