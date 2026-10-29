// The patterns lane's harness (dev/beads.html): the bead tree's pattern moment on its own, over a pastel stand-in for
// the 3D world (the tree, Princess Emma's spot and the baby as flat shapes where the tree frame puts them), with real
// strings from the planner at each level. Dev only; the buttons carry text because Tjitse and playwright-cli use them,
// never Emma. `?level=1|2|3&seed=<n>&demo=1` starts a moment at once (after the Play tap, which unlocks the audio).
import type { MomentResult, PatternSpec, ScreenPoint } from '../contracts';
import { audio } from '../audio';
import { patternSpec, beadKey, type PatternLevel } from '../content/patterns';
import { seeded } from '../content/rand';
import { createLayer } from './index';

const STYLE = `
html, body { margin: 0; height: 100%; overflow: hidden; background: #cfe8ff; }
#world { position: fixed; inset: 0; background: linear-gradient(180deg, #bfe3ff 0%, #dff1ff 30%, #e8f7d8 42%, #bfe6a2 58%, #a8d98c 100%); }
.tree { position: absolute; pointer-events: none; }
.tree .crown { position: absolute; left: 0; top: 0; width: 100%; height: 70%; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #b6ec9c, #6cc070 70%); box-shadow: inset -12px -10px 0 #5aa95e55; }
.tree .trunk { position: absolute; left: 44%; top: 62%; width: 12%; height: 38%; border-radius: 8px; background: #a8754f; }
.her { position: absolute; width: 70px; height: 160px; margin: -160px 0 0 -35px; border-radius: 35px 35px 12px 12px; background: linear-gradient(180deg, #ffe2d0 0 26%, #ffb7d8 26% 100%); pointer-events: none; }
.baby { position: absolute; width: 130px; height: 110px; margin: -110px 0 0 -65px; pointer-events: none; transition: filter 300ms; }
.baby .body { position: absolute; left: 14px; top: 46px; width: 100px; height: 58px; border-radius: 50%; background: #efe6ff; box-shadow: inset -8px -8px 0 #ddd0f5; }
.baby .head { position: absolute; left: 50px; top: 6px; width: 62px; height: 56px; border-radius: 50%; background: #f5efff; box-shadow: inset -6px -6px 0 #e2d6f7; }
.baby .mane { position: absolute; left: 40px; top: 0; width: 34px; height: 50px; border-radius: 50% 40% 50% 50%; background: #ff9cc8; }
.baby.hop { animation: dev-hop 500ms 2; }
.baby.look { animation: dev-tilt 500ms 2; }
@keyframes dev-hop { 50% { translate: 0 -24px; } }
@keyframes dev-tilt { 50% { rotate: 10deg; } }
#dev { position: fixed; left: 8px; bottom: 8px; z-index: 50; display: flex; flex-wrap: wrap; gap: 4px; max-width: 520px; font: 12px system-ui; }
#dev button { padding: 4px 7px; border-radius: 6px; border: 1px solid #8a7ab8; background: #fffd; }
#dev pre { width: 100%; max-height: 110px; overflow: auto; margin: 0; background: #fffc; font-size: 10px; }
body.clean #dev { display: none; }
`;

const style = document.createElement('style');
style.textContent = STYLE;
document.head.appendChild(style);

// ---- the stand-in world, laid out as the tree frame shows it (the tree right of the centre, her on the left)
const world = document.getElementById('world')!;
const tree = document.createElement('div');
tree.className = 'tree';
tree.innerHTML = '<span class="crown"></span><span class="trunk"></span>';
const her = document.createElement('div');
her.className = 'her';
const baby = document.createElement('div');
baby.className = 'baby';
baby.innerHTML = '<span class="body"></span><span class="mane"></span><span class="head"></span>';
world.append(tree, her, baby);
const unit = () => Math.min(innerWidth / 1180, innerHeight / 820);
function layout() {
  const k = unit();
  tree.style.left = `${innerWidth * 0.56 - 170 * k}px`;
  tree.style.top = `${innerHeight * 0.28}px`;
  tree.style.width = `${340 * k}px`;
  tree.style.height = `${360 * k}px`;
  her.style.left = `${innerWidth * 0.3}px`;
  her.style.top = `${innerHeight * 0.74}px`;
  baby.style.left = `${innerWidth * 0.45}px`;
  baby.style.top = `${innerHeight * 0.8}px`;
}
layout();
addEventListener('resize', layout);
const anchor = (): ScreenPoint => {
  const r = baby.getBoundingClientRect();
  return { x: r.left + r.width * 0.6, y: r.top, visible: true };
};

// ---- the layer
const layer = createLayer(document.getElementById('ui')!);
const results: unknown[] = [];
const logEl = document.createElement('pre');
function log(line: string) {
  logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 4000);
  console.log('[beads-dev]', line);
}
function react(kind: string) {
  const cls = kind === 'look' || kind === 'shake' ? 'look' : 'hop';
  baby.classList.remove('hop', 'look');
  void baby.offsetWidth;
  baby.classList.add(cls);
  setTimeout(() => baby.classList.remove(cls), 1100);
  log(`react ${kind}`);
}

let seed = 1;
let open: PatternSpec | null = null;
async function beads(level: PatternLevel, demo = false, s = seed++) {
  const spec = patternSpec(seeded(s), level);
  open = spec;
  log(`spec L${level} seed ${s} ${spec.kind} ${spec.string.map(beadKey).join(' ')} gaps ${spec.gaps} tray ${spec.tray.map(beadKey).join(' ')}`);
  const out: MomentResult[] = await layer.beads(spec, {
    anchor, react,
    log: (e, d) => log(`${e} ${JSON.stringify(d ?? {})}`),
    gap: (i, r) => {
      results.push({ gap: i, ...r });
      log(`gap ${i} ${JSON.stringify(r)}`);
    },
  }, { demo });
  open = null;
  results.push({ done: out });
  log(`beads done ${JSON.stringify(out)}`);
}

const start = () => layer.start(() => void audio.unlock()).then(() => layer.lumi.show(true));
const runs: Record<string, () => Promise<unknown> | void> = {
  start,
  'level 1': () => beads(1),
  'level 2': () => beads(2),
  'level 3': () => beads(3),
  'demo 1': () => beads(1, true),
  replay: () => log(`replay ${layer.replay()}`),
  idle: () => log(`idle ${layer.idleNow()}`),
  reset: () => {
    layer.reset();
    open = null;
  },
  clean: () => void document.body.classList.toggle('clean'),
};
const dev = document.getElementById('dev')!;
for (const name of Object.keys(runs)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.addEventListener('click', () => void runs[name]());
  dev.appendChild(b);
}
dev.appendChild(logEl);

Object.assign(window, {
  __ui: layer,
  __dev: { run: (n: string) => runs[n](), beads, results, anchor, spec: () => open },
});

const q = new URLSearchParams(location.search);
void start().then(() => {
  const level = Number(q.get('level'));
  if (level === 1 || level === 2 || level === 3) void beads(level, q.get('demo') === '1', Number(q.get('seed') ?? seed));
});
