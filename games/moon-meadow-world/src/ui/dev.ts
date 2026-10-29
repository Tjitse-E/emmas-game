// The ui lane's harness (dev/ui.html): a pastel stand-in for the 3D world with a drifting fake baby and egg as
// anchors, and dev buttons that run every part of the layer with real specs on v3 clip ids. Dev only; the
// buttons carry text because Tjitse and the flows use them, never Emma.
//
// 2.3.0: the wardrobe-ui lane owns this file, except two marked blocks: the eggs lane's (the egg and hay rack specs
// and their buttons) and the reading lane's (the naming and wish specs and their buttons). Each lane edits only its
// own block (docs/v4/2.3.md section 22.2). New EggSpec and WishSpec fields stay optional, so the blocks keep compiling.
import type {
  BoardSpec, EggSpec, EndMember, GiftItem, LookTab, MomentHooks, NameChoice, NamingSpec, Owned, Place, PrincessLook, ScreenPoint, WishItem, WishSpec,
} from '../contracts';
import { audio } from '../audio';
import { v3Art, wordPic } from '../assets';
import { DEFAULT_LOOK, GIFT_SETS, START_OWNED, crownOutline, giftChoices, stillToEarn, tabOf, withItem } from '../wardrobe';
import { eggSpec, rackSpec, seeded } from '../content';
import { DATA } from '../content/data';
import { createLayer } from './index';
import { wardrobeLayout } from './geometry';
import { crownBody, earringsBody, giftSwatchUrl, gownBody, headBody, necklaceBody, shoesBody, thingBody } from './swatches';

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
/* The customiser's stand-in for Princess Emma in 3D: a flat picture of her look, framed like the body or face frame. */
.fake-her { position: absolute; left: 0; top: 0; pointer-events: none; transform-origin: 50% 0; transition: transform 500ms ease-in-out; }
.fake-her.hidden { display: none; }
.fake-her .her-turn { width: 100%; height: 100%; transition: transform 300ms ease-out; }
.fake-her .her-turn.back { transition: transform 1500ms ease-in-out; }
.fake-her svg { display: block; width: 100%; height: 100%; }
.fake-her .pose { width: 100%; height: 100%; transform-origin: 50% 90%; }
.fake-her .pose.toss { animation: her-toss 1s ease-in-out; }
.fake-her .pose.blink { animation: her-blink 1.6s ease-in-out; }
.fake-her .pose.twirl { animation: her-twirl 1s ease-in-out; }
.fake-her .pose.show { animation: her-show 1.6s ease-in-out; }
.fake-her .pose.tilt { animation: her-tilt 1.2s ease-in-out; }
.fake-her .pose.wave, .fake-her .pose.curtsy { animation: her-hop 0.6s ease-in-out 2; }
@keyframes her-toss { 30% { rotate: 6deg; } 65% { rotate: -4deg; } }
@keyframes her-blink { 60% { scale: 1 0.96; } }
@keyframes her-twirl { 50% { transform: perspective(600px) rotateY(180deg); } 100% { transform: perspective(600px) rotateY(360deg); } }
@keyframes her-show { 25%, 45% { transform: perspective(600px) rotateY(60deg); } 70%, 85% { transform: perspective(600px) rotateY(-60deg); } }
@keyframes her-tilt { 40%, 70% { rotate: -7deg; } }
@keyframes her-hop { 50% { translate: 0 -4%; } }
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

// ---- the customiser's fake Princess Emma: head, hair things and gown pictures from swatches.ts in one tall picture
const her = document.createElement('div');
her.className = 'fake-her hidden';
her.innerHTML = '<div class="her-turn"><div class="pose"></div></div>';
world.appendChild(her);
const herTurn = her.querySelector('.her-turn') as HTMLElement;
const herPose = her.querySelector('.pose') as HTMLElement;
let herLook: PrincessLook = { ...DEFAULT_LOOK };
let herHeading = 0;
let herFocus: LookTab | null = null;
let herCrown = true;
/** Her look as one flat picture from the swatch bodies: shoes, gown, head and hair, crown, hair things, jewels. */
function drawHer(next: PrincessLook) {
  herLook = next;
  const look = next;
  const ball = look.gown === 'ball' || look.gown === 'gala';
  const legs = ball ? '' : '<path d="M45 150 L45 176 M55 150 L55 176" stroke="#ffe2d0" stroke-width="7" stroke-linecap="round"/>';
  const shoes = ball ? `<g transform="translate(28 168) scale(0.44)">${shoesBody(look.shoes, look.shoeColour)}</g>` : `<g transform="translate(28 160) scale(0.44)">${shoesBody(look.shoes, look.shoeColour)}</g>`;
  const crown = herCrown ? `<g transform="translate(34 4) scale(0.32)">${crownBody(look.crown, look.crownColour, crownOutline(look.hair, look.crownColour))}</g>` : '';
  const ears = look.earrings === 'none' ? '' : `<g transform="translate(26 50) scale(0.48)">${earringsBody(look.earrings, look.jewelColour)}</g>`;
  const neck = look.necklace === 'none' ? '' : `<g transform="translate(38 66) scale(0.24)">${necklaceBody(look.necklace, look.jewelColour)}</g>`;
  herPose.innerHTML =
    '<svg viewBox="0 0 100 200" aria-hidden="true">' + legs + shoes +
    `<g transform="translate(0 62)">${gownBody(look.gown, look.gownColour, look.extra)}</g>` +
    '<rect x="45" y="64" width="10" height="22" rx="4" fill="#ffe2d0"/>' + neck +
    `<g>${headBody(look.style, look.hair, { eyes: look.eyes })}</g>` + ears + crown +
    `<g transform="translate(14 36) scale(0.2)">${thingBody(look.thing, look.thingColour)}</g>` +
    `<g transform="translate(66 36) scale(0.2)">${thingBody(look.thing, look.thingColour)}</g>` +
    '</svg>';
}
/** The body frame: feet at 77% and head top at 11% of the screen, at x = panel left / 2. The face frame zooms in. */
function frameHer() {
  const L = wardrobeLayout(innerWidth, innerHeight);
  const h = innerHeight * 0.66;
  her.style.width = `${h / 2}px`;
  her.style.height = `${h}px`;
  const face = herFocus === 'eyes' || herFocus === 'sparkles';
  const k = face ? 2.6 : 1;
  const x = L.panel.x / 2 - (h / 2) / 2;
  const y = face ? innerHeight * 0.2 - h * 0.14 * k : innerHeight * 0.11;
  her.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
}
function poseHer(kind: string) {
  herPose.classList.remove('toss', 'blink', 'twirl', 'show', 'tilt', 'wave', 'curtsy');
  void herPose.offsetWidth;
  herPose.classList.add(kind);
}
const REACT: Record<LookTab, string> = { hair: 'toss', eyes: 'blink', gown: 'twirl', crown: 'tilt', shoes: 'show', sparkles: 'tilt' };
addEventListener('resize', () => { if (!her.classList.contains('hidden')) frameHer(); });

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

// ==== eggs lane block: the egg and hay rack specs (2.3: three sums per egg) =========================================
// Real trays from the content: an egg's three sums on one panel (2.3, the hard one in band A or B), 2.2's one sum
// with 4 stones (band A) and 5 (band B), and the hay rack.
const warmEgg: EggSpec = eggSpec('warm', seeded(1), { first: true, band: 'a' });
const snowEgg: EggSpec = eggSpec('snow', seeded(2), { first: true, band: 'b' });
const hayRack: EggSpec = rackSpec(seeded(3), { band: 'a' });
/** An egg's three sums, one after another on the panel that stays (the fact between them, 2.3.2). */
async function threeSums(kind: EggSpec['kind'], band: 'a' | 'b', seed: number) {
  // Imported here, so the lane's lines stay inside this block.
  const { eggSums } = await import('../content/eggs');
  show('egg', { x: 0.5 - (96 * unit()) / innerWidth, y: 0.36 });
  for (const spec of eggSums(kind, seeded(seed), { first: true, band })) {
    const r = await layer.egg(spec, hooks);
    results.push({ egg: kind, grade: spec.grade, round: spec.round?.index, ...r });
    log(`egg ${kind} ${spec.grade} ${spec.need}/${spec.have} ${JSON.stringify(r)}`);
  }
}
const eggRuns: Record<string, () => Promise<unknown> | void> = {
  'egg warm 3': () => threeSums('warm', 'a', 4),
  'egg snow 3': () => threeSums('snow', 'b', 5),
  'egg warm': async () => { show('egg', { x: 0.5 - (96 * unit()) / innerWidth, y: 0.36 }); const r = await layer.egg(warmEgg, hooks); results.push({ egg: 'warm', ...r }); log(`egg warm ${JSON.stringify(r)}`); },
  'egg snow': async () => { show('egg', { x: 0.5 - (96 * unit()) / innerWidth, y: 0.36 }); const r = await layer.egg(snowEgg, hooks); results.push({ egg: 'snow', ...r }); log(`egg snow ${JSON.stringify(r)}`); },
  'hay rack': async () => { show(null); const r = await layer.egg(hayRack, hooks); results.push({ egg: 'hay', ...r }); log(`hay rack ${JSON.stringify(r)}`); },
};
// ==== end of the eggs lane block ====================================================================================

// ==== reading lane block: the naming and wish specs (2.3: the phrase wish) ==========================================
const bells: NameChoice[] = [
  { name: 'Pip', gpcs: ['p', 'i', 'p'], clip: 'name-pip', distractors: ['o', 'b'] },
  { name: 'Meg', gpcs: ['m', 'e', 'g'], clip: 'name-meg', distractors: ['a', 'n'] },
  { name: 'Beth', gpcs: ['b', 'e', 'th'], clip: 'name-beth', distractors: ['a', 'f'] },
];
const naming: NamingSpec = {
  bells,
  clips: { bells: ['g-bells'], drag: ['g-bell-drag'], spell: ['g-spell'], gems: ['g-gems'], slide: ['g-slide'], done: ['fb-spelled'], again: ['fb-listen'] },
};
/** A wish item; a greyscale picture (cup, hat, coat...) gets its tint from the content data, as in the game. */
const item = (word: string, gpcs: string[]): WishItem => {
  const tint = DATA.words.find((w) => w.word === word)?.tint;
  return { word, gpcs, pic: wordPic(word), ...(tint ? { tint } : {}), clip: `word-${word}`, tier: 1 };
};
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
/** The dress-up wish with five greyscale pictures, all in their tints. */
const dressWish: WishSpec = {
  kind: 'dress', target: item('coat', ['c', 'oa', 't']),
  basket: [item('hat', ['h', 'a', 't']), item('coat', ['c', 'oa', 't']), item('dress', ['d', 'r', 'e', 'ss']), item('sock', ['s', 'o', 'ck']), item('bead', ['b', 'ea', 'd'])],
  level: 2, decoys: { hat: 'ending', dress: 'other', sock: 'other', bead: 'other' },
  clips: { intro: ['g-wish', 'g4-dress-up'], goal: ['g4-dress-up'], right: ['fb-yes'], hint: ['h-sounds'], again: ['fb-letters'] },
};
/**
 * The phrase wish (2.3) at a level, from the real planner with every ok pair (as ?phrases=all). Loaded on
 * the tap, so this block needs no import of its own.
 */
const phraseRun = (level: 1 | 2 | 3) => async () => {
  const { phraseSpec } = await import('../content/phrases');
  show('baby', { x: 0.5, y: 0.42 });
  const spec = phraseSpec(seeded(40 + level + results.length), { level, rule: 'all' });
  log(`phrase ${spec.target.word} level ${spec.level}: ${spec.basket.map((b) => b.word).join(', ')}`);
  const r = await layer.wish(spec, hooks);
  results.push({ wish: 'phrase', word: spec.target.word, level: spec.level, ...r });
  log(`wish phrase ${JSON.stringify(r)}`);
};
const readingRuns: Record<string, () => Promise<unknown> | void> = {
  'wish phrase 1': phraseRun(1),
  'wish phrase 2': phraseRun(2),
  'wish phrase 3': phraseRun(3),
  naming: async () => {
    show('baby', { x: 0.5, y: 0.26 });
    const r = await layer.naming(naming, { ...hooks, chosen: (n) => log(`chosen ${n.name}`) });
    results.push({ naming: r.name.name, outcome: r.outcome, misses: r.misses, ms: r.ms });
    log(`naming ${r.name.name} ${r.outcome}`);
    layer.tag(r.name.name, () => ({ ...anchor(), y: anchor().y - 14 }), 3000);
  },
  'wish food': async () => { show('baby', { x: 0.5, y: 0.42 }); const r = await layer.wish(foodWish, hooks); results.push({ wish: 'food', ...r }); log(`wish food ${JSON.stringify(r)}`); },
  'wish dress': async () => { show('baby', { x: 0.5, y: 0.42 }); const r = await layer.wish(dressWish, hooks); results.push({ wish: 'dress', ...r }); log(`wish dress ${JSON.stringify(r)}`); },
  'wish bath': async () => { show('baby', { x: 0.42, y: 0.4 }); const r = await layer.wish(bathWish, hooks); results.push({ wish: 'bath', ...r }); log(`wish bath ${JSON.stringify(r)}`); },
};
// ==== end of the reading lane block =================================================================================

const foods = ['plum', 'corn', 'cake', 'bun', 'apple', 'cup'].map((w) => item(w, [...w]));
/** The goodnight herd: her two new babies among twelve, in v3's coat and mane colours. */
const BODIES = ['#ffe0ef', '#e6dcff', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf', '#ffffff', '#f5d9ff'];
const MANES = ['#ff7fbf', '#9d7bff', '#4fc3ff', '#ffbf3f', '#3fd69a', '#ff8f6b', '#c46bff', '#ff5f8f'];
const HERD_NAMES = ['Rosie', 'Luna', 'Daisy', 'Willow', 'Poppy', 'Isla', 'Lily', 'Ruby', 'Bonnie', 'Evie', 'Mabel', 'Hazel'];
const members: EndMember[] = [
  ...HERD_NAMES.map((name, i) => ({ name, body: BODIES[i % BODIES.length], mane: MANES[(i * 3) % MANES.length] })),
  { name: 'Pip', body: '#fff3c4', mane: '#3fd69a', isNew: true },
  { name: 'Nell', body: '#ffffff', mane: '#4fc3ff', isNew: true },
];

/** Owned with every item of these gift sets, as after many quests. */
function ownedWith(...items: GiftItem[]): Owned {
  return items.reduce((o, i) => withItem(o, i), START_OWNED as Owned);
}
const SOME_GIFTS: GiftItem[] = [
  { field: 'crown', id: 'tiara' }, { field: 'crown', id: 'heart' }, { field: 'shoes', id: 'boots' }, { field: 'earrings', id: 'hearts' },
  { field: 'necklace', id: 'pearls' }, { field: 'style', id: 'long' }, { field: 'thing', id: 'cherries' },
];
const ALL_GIFTS: GiftItem[] = Object.values(GIFT_SETS).flatMap((s) => [...s.items]);
const PICS = { crowns: wordPic('picnic'), shoes: v3Art('items/item-hay-bundle.webp'), jewels: wordPic('bead'), hair: v3Art('items/place-dressing.webp') };
/** A board after a picnic and a bead tree today: two fresh gifts and three ribbons. */
const board = (owned: Owned, fresh: GiftItem[]): BoardSpec => ({ owned, fresh, ribbons: ['lilac', 'sky', 'mint'], pics: PICS });

/** The start mirror or the Dressing Corner, as in the game: no Lumi, Princess Emma on the left, the music box. */
async function dress(o: { firstTime?: boolean; owned?: Owned; crownTab?: boolean; limitMs?: number; board?: BoardSpec } = {}) {
  show(null);
  layer.lumi.show(false);
  herCrown = o.crownTab ?? true;
  drawHer(herLook);
  herFocus = null;
  frameHer();
  her.classList.remove('hidden');
  const { look, end } = await layer.wardrobe({
    look: herLook, owned: o.owned ?? START_OWNED, crownTab: herCrown, firstTime: !!o.firstTime, limitMs: o.limitMs ?? 45_000, board: o.board,
    clips: { ready: ['g4-ready'], firstTime: ['g4-look-tap'], idle: ['g4-ready-play'], nearly: ['g4-nearly'], done: ['fb-lovely'] },
    onLook: (l, field) => { drawHer(l); log(`look ${field} ${l[field]}`); },
    onPicked: (l, field) => { poseHer(REACT[tabOf(field)]); log(`picked ${field} ${l[field]}`); },
    onFocus: (row) => { herFocus = row; frameHer(); log(`focus ${row}`); },
    onTurn: (dx, ended) => {
      herHeading = ended ? 0 : herHeading + dx / 2;
      herTurn.classList.toggle('back', ended);
      herTurn.style.transform = `perspective(600px) rotateY(${herHeading}deg)`;
      if (ended) log('turn ended');
    },
    onPreviewTap: () => { poseHer('wave'); log('preview tap'); },
    onBox: (on) => log(`box ${on}`),
  });
  results.push({ wardrobe: look, end });
  log(`wardrobe ${end} ${JSON.stringify(look)}`);
  poseHer('curtsy');
  herFocus = null;
  frameHer();
  setTimeout(() => {
    her.classList.add('hidden');
    layer.lumi.show(true);
  }, 1400);
}

/** The gift picker after a quest: the cards, then the sparkles fly to the stand-in Princess Emma, who wears it. */
async function gift(items: GiftItem[]) {
  show(null);
  drawHer(herLook);
  her.classList.remove('hidden');
  frameHer();
  const item = await layer.gift({
    items, look: herLook, clips: ['g4-gift'],
    to: () => ({ x: wardrobeLayout(innerWidth, innerHeight).panel.x / 2, y: innerHeight * 0.3, visible: true }),
  });
  drawHer({ ...herLook, [item.field]: item.id });
  poseHer('twirl');
  results.push({ gift: `${item.field}:${item.id}` });
  log(`gift ${item.field}:${item.id}`);
}

/** Two offer bubbles over drifting points, as over the picnic rug and the hay rack. */
function offers(on: boolean) {
  if (!on) {
    layer.offer('picnic', null);
    layer.offer('rack', null);
    return;
  }
  const drift = (fx: number, fy: number) => () => ({ x: innerWidth * fx + Math.sin(performance.now() / 1500) * 40, y: innerHeight * fy + Math.cos(performance.now() / 1100) * 10, visible: true });
  // 2.3: each quest bubble carries the badge of a gift it can still give.
  const badge = (set: keyof typeof GIFT_SETS) => giftSwatchUrl(stillToEarn(set, START_OWNED)[0], herLook);
  layer.offer('picnic', { pic: wordPic('picnic'), badge: badge('crowns'), at: drift(0.3, 0.6), onTap: () => log('offer picnic') });
  layer.offer('rack', { pic: v3Art('items/item-hay-bundle.webp'), badge: badge('shoes'), at: drift(0.7, 0.5), onTap: () => log('offer rack') });
}

// ---- the dev buttons
const places: Place[] = ['nest', 'pond', 'slide', 'wildEgg', 'stable', 'gazebo'];
let placeIx = 0;
const runs: Record<string, () => Promise<unknown> | void> = {
  start: () => layer.start(() => void audio.unlock()).then(() => layer.lumi.show(true)),
  lumi: () => layer.lumi.speak(['g-egg']),
  ...eggRuns,
  ...readingRuns,
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
  wardrobe: () => dress(),
  'wardrobe first': () => dress({ firstTime: true, crownTab: false }),
  'wardrobe corner': () => dress({ owned: ownedWith(...SOME_GIFTS), limitMs: 60_000, board: board(ownedWith(...SOME_GIFTS), SOME_GIFTS.slice(-2)) }),
  'wardrobe all': () => dress({ owned: ownedWith(...ALL_GIFTS), limitMs: 60_000, board: board(ownedWith(...ALL_GIFTS), []) }),
  'wardrobe short': () => dress({ limitMs: 8000 }),
  gift: () => gift(giftChoices('hair', START_OWNED, seeded(4))),
  'gift one': () => gift([{ field: 'necklace', id: 'heart' }]),
  board: () => layer.board(board(ownedWith(...SOME_GIFTS), SOME_GIFTS.slice(-1))),
  offers: () => offers(true),
  'offers off': () => offers(false),
  'the end': async () => { await layer.theEnd({ herd: 14, members }); log('play again'); },
  'the end plain': async () => { await layer.theEnd({ herd: 14 }); log('play again'); },
  day: () => layer.sky(0),
  sunset: () => layer.sky(0.5),
  night: () => layer.sky(1),
  curtain: async () => { await layer.curtain(true, '#fff4fb'); await new Promise((r) => setTimeout(r, 400)); await layer.curtain(false); },
  perf: () => layer.perf('60 fps  42 calls  61k tris'),
  replay: () => log(`replay ${layer.replay()}`),
  idle: () => log(`idle ${layer.idleNow()}`),
  reset: () => { layer.reset(); layer.sky(0); show(null); her.classList.add('hidden'); },
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

Object.assign(window, { __ui: layer, __dev: { run: (n: string) => runs[n](), results, show, anchor, look: () => herLook } });
void runs.start();
