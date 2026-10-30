// The listening page (dev/sound.html): every effect of tools/audio/sfx.json, the day loop and the music box, and the
// rules of section 20 as small scenes, so Tjitse can hear each file before he approves it. It plays files that are
// not approved yet (?sfx=all) and is never part of the build.
import sfx from '../../tools/audio/sfx.json';
import { audio, SFX_BASE, type Sfx, type SfxFile } from './index';
import { loopWindow, type SfxEntry } from './sound';

// The channel reads ?sfx=all when the files load, so the page sets it before Start.
if (!/[?&]sfx=all(&|$)/.test(location.search)) {
  history.replaceState(null, '', location.pathname + (location.search ? location.search + '&' : '?') + 'sfx=all');
}

/** Where each effect plays in the game and its fallback while the file is missing (section 20). */
const USE: Record<SfxFile, { where: string; fallback?: Sfx }> = {
  'egg-crack': { where: 'the hatch, under Lumi\'s "It\'s hatching!"', fallback: 'hatch' },
  'nicker-1': { where: 'a baby\'s hop outside checked moments' },
  'nicker-2': { where: 'a baby\'s hop outside checked moments' },
  'stable-door': { where: 'a stable door opens' },
  'trunk-lid': { where: 'the treasure board opens' },
  'gift-paper': { where: 'the chosen gift card pops' },
  'dress-swish': { where: 'a gown or extra without a word' },
  'bead-clink': { where: 'a right bead lands on the string' },
  'crown-twinkle': { where: 'the crown at the welcome; a crown without a word' },
  'hay-rustle': { where: 'the hay bundles land' },
  'splash-1': { where: 'the slide splash (in turn with splash-2)', fallback: 'splash' },
  'splash-2': { where: 'the slide splash (in turn with splash-1)', fallback: 'splash' },
  'slide-whoosh': { where: 'the slide start', fallback: 'whoosh' },
  'bedtime-bell': { where: 'bedtime, before "the sun is going down"' },
  owl: { where: 'goodnight, before Lumi\'s ribbons line' },
  'heart-glow': { where: "an egg's third heart lights, before the hatch" },
};

const ELIZABETH = 'g4-ready'; // "Let's get you ready, Princess Emma!"
const LUMI = 'lumi4-another-egg'; // "Oh! Another egg!"

const $ = (id: string) => document.getElementById(id)!;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function button(parent: HTMLElement, text: string, fn: () => void | Promise<void>): HTMLButtonElement {
  const b = el('button', text);
  b.disabled = true;
  b.addEventListener('click', () => void fn());
  parent.append(b);
  return b;
}
const buttons: HTMLButtonElement[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let manifest: Record<string, SfxEntry> = {};

async function readManifest(): Promise<void> {
  try {
    const r = await fetch(SFX_BASE + 'manifest.json', { cache: 'no-cache' });
    manifest = r.ok ? ((await r.json()) as { clips: Record<string, SfxEntry> }).clips ?? {} : {};
  } catch {
    manifest = {};
  }
}

function status(id: string, fallback?: Sfx): HTMLElement {
  const td = el('td');
  const e = manifest[id];
  if (e) td.append(el('span', e.approved ? 'approved' : 'not approved yet', e.approved ? 'tag ok' : 'tag warn'));
  else td.append(el('span', fallback ? `no file: plays ${fallback}` : 'no file: silent', 'tag'));
  return td;
}

function effectsTable(): void {
  const t = $('fxtable');
  t.replaceChildren();
  const head = el('tr');
  for (const h of ['', 'Effect', 's', 'Status', 'Where it plays', 'Prompt']) head.append(el('th', h));
  t.append(head);
  for (const e of sfx.effects) {
    const id = e.id as SfxFile;
    const use = USE[id];
    const tr = el('tr');
    const td = el('td');
    buttons.push(button(td, 'Play', () => audio.fx(id, { fallback: use.fallback })));
    tr.append(td, el('td', id, 'id'), el('td', String(e.seconds)), status(id, use.fallback), el('td', use.where));
    const prompt = el('td', e.text, 'prompt');
    if ('core' in e && e.core) prompt.prepend(el('span', 'core', 'tag'));
    tr.append(prompt);
    t.append(tr);
  }
}

function rules(): void {
  const row = $('rulebtns');
  const note = $('rulenote');
  const scene = (label: string, hear: string, fn: () => Promise<void>) =>
    buttons.push(button(row, label, async () => {
      note.textContent = hear;
      await fn();
    }));
  scene('Effect, then Elizabeth', 'The bell starts, and fades out the moment Elizabeth starts.', async () => {
    void audio.fx('bedtime-bell');
    await wait(400);
    void audio.say(ELIZABETH);
  });
  scene('Elizabeth, then an effect', 'Only Elizabeth. The twinkle is skipped because she speaks.', async () => {
    void audio.say(ELIZABETH);
    await wait(300);
    void audio.fx('crown-twinkle');
  });
  scene('Letter sound, then an effect', 'Only the letter sound. A letter sound counts as Elizabeth.', async () => {
    void audio.sound('s');
    await wait(50);
    void audio.fx('bead-clink');
  });
  scene('Heart glow, then her line', 'The glow plays to its end (at most 1 s), then Elizabeth.', async () => {
    await audio.fx('heart-glow');
    void audio.say((await audio.has('g4-heart')) ? 'g4-heart' : 'fb-yes');
  });
  scene('Egg crack under Lumi', 'Lumi, with the crack under her at 0.3 (or the synthesised hatch).', async () => {
    void audio.say(LUMI);
    await wait(250);
    void audio.fx('egg-crack', { duck: true, fallback: 'hatch' });
  });
}

let checked = false;
let seam: AudioBufferSourceNode | null = null;

async function hearSeam(): Promise<void> {
  seam?.stop();
  seam = null;
  const e = manifest['amb-day'];
  const ctx = (window as unknown as { EmmaAudio: { context: AudioContext | null } }).EmmaAudio.context;
  if (!e || !ctx) {
    $('rulenote').textContent = 'The day loop has no file yet.';
    return;
  }
  audio.ambience(null);
  const data = await (await fetch(SFX_BASE + e.file)).arrayBuffer();
  const buffer = await ctx.decodeAudioData(data);
  const w = loopWindow(buffer.duration, e);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = w.start;
  src.loopEnd = w.end;
  src.connect(gain).connect(ctx.destination);
  src.start(0, Math.max(w.start, w.end - 2)); // 2 s before the seam
  seam = src;
  setTimeout(() => {
    if (seam === src) {
      src.stop();
      seam = null;
    }
  }, 5000);
}

function ambience(): void {
  const row = $('ambbtns');
  buttons.push(button(row, 'Day', () => audio.ambience('day')));
  buttons.push(button(row, 'Night (quiet)', () => audio.ambience('night')));
  buttons.push(button(row, 'Off', () => audio.ambience(null)));
  const c = button(row, 'Checked moment', () => {
    checked = !checked;
    audio.checked(checked);
    c.classList.toggle('on', checked);
  });
  buttons.push(c);
  buttons.push(button(row, 'Elizabeth speaks', () => void audio.say(ELIZABETH)));
  buttons.push(button(row, 'Hear the seam', hearSeam));
}

let box: { stop(): void; done: Promise<void> } | null = null;
let boxStart = 0;
let boxMs = 0;

function musicBox(): void {
  const row = $('boxbtns');
  const play = (ms: number) => {
    box?.stop();
    const b = audio.musicBox(ms);
    box = b;
    boxStart = performance.now();
    boxMs = ms;
    void b.done.then(() => {
      if (box === b) box = null;
    });
  };
  buttons.push(button(row, '45 s (start mirror)', () => play(45_000)));
  buttons.push(button(row, '60 s (Corner)', () => play(60_000)));
  buttons.push(button(row, '30 s (Corner, least)', () => play(30_000)));
  buttons.push(button(row, '10 s (the ending)', () => play(10_000)));
  buttons.push(button(row, 'Stop', () => {
    box?.stop();
    box = null;
  }));
  // Section 23: the box must stay soft under the colour words. They come with the one gen.sh run after the merge.
  buttons.push(button(row, 'Colour words over it', async () => {
    const words = ['word-green', 'word-pink', 'word-gold', 'word-blue'];
    const have = (await Promise.all(words.map((w) => audio.has(w)))).some(Boolean) ? words : [ELIZABETH];
    for (const w of have) {
      await audio.say(w);
      await wait(700);
    }
  }));
}

function tick(): void {
  $('state').textContent = JSON.stringify(audio.soundState());
  if (box) {
    const s = Math.min(boxMs, performance.now() - boxStart) / 1000;
    $('boxline').textContent = `Playing: ${s.toFixed(1)} s of ${boxMs / 1000} s`;
  } else {
    $('boxline').textContent = '';
  }
}

async function start(): Promise<void> {
  await audio.unlock();
  $('start').textContent = 'Loading…';
  await readManifest();
  await audio.preloadFx();
  const made = Object.keys(manifest).length;
  const approved = Object.values(manifest).filter((e) => e.approved).length;
  $('loaded').textContent = `${made} of ${sfx.effects.length + sfx.loops.length} files made, ${approved} approved.`;
  $('start').textContent = 'Started';
  effectsTable();
  for (const b of buttons) b.disabled = false;
}

audio.setup();
void readManifest().then(effectsTable);
rules();
ambience();
musicBox();
setInterval(tick, 250);
$('start').addEventListener('pointerdown', () => void start(), { once: true });
