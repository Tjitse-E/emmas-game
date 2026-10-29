// The picture check page (check.html, docs/v4/2.3.md section 18): Emma's check of the 30 tinted phrase pictures on her
// own iPad, without a rebuild. Each picture is drawn as the game's basket draws it (phraseItem's picture and tint,
// wordPicEl, the basket cell), with its two words printed small for Tjitse and a tick and a cross that he taps after
// Emma names it. The verdicts stay on this device (phrase-device.ts, never the game's save), and the game's phrase
// rule reads them: a tick checks a pair, a cross turns it off. The page has no sound: hearing the phrase would tell her
// the answer.
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import './check.css';
import { DATA } from './content/data.ts';
import { MIN_PHRASES, phraseItem, phraseKey, phraseTargets } from './content/phrases.ts';
import { type DeviceVerdict, checkOrder, readDeviceChecks, toggled, writeDeviceChecks } from './content/phrase-device.ts';
import { el, wordPicEl } from './ui/dom.ts';

const TICK = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 21 L17 30 L33 11" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 10 L30 30 M30 10 L10 30" fill="none" stroke-width="6" stroke-linecap="round"/></svg>';

const root = document.getElementById('check')!;
const pairs: Record<string, string> = DATA.phrasePairs ?? {};
// Gold first: its flat tint is a deep mustard, and Emma may call it yellow.
const colours = DATA.phraseColours.map((c) => c.word).sort((a, b) => Number(b === 'gold') - Number(a === 'gold'));
const order = checkOrder(colours, DATA.phraseThings.map((t) => t.word)).filter(([c, t]) => phraseKey(c, t) in pairs);
let verdicts = readDeviceChecks();
let saved = true;

el('h1', '', root).textContent = 'Picture check';
el('p', 'note', root).textContent = 'Ask Emma what each picture is: its colour and its thing. Tap the tick when she names both right, '
  + 'the cross when she does not. Tap a lit button again to clear it. The verdicts stay on this iPad and the game uses them '
  + 'at once: a tick lets that picture into the Dressing Corner\'s phrase wish, a cross keeps it out.';
const status = el('p', 'status', root);
const grid = el('div', 'grid', root);

const cards = order.map(([c, t]) => {
  const key = phraseKey(c, t);
  const card = el('div', 'card', grid);
  card.dataset.pair = key;
  wordPicEl(phraseItem(c, t), 'pic', el('div', 'cell', card));
  const words = el('div', 'words', card);
  words.textContent = key;
  if (pairs[key] === 'emma') el('span', 'file', words).textContent = 'checked before';
  const row = el('div', 'buttons', card);
  const button = (cls: string, v: DeviceVerdict, svg: string, label: string) => {
    const b = el('button', cls, row);
    b.type = 'button';
    b.innerHTML = svg;
    b.setAttribute('aria-label', `${label}: ${key}`);
    b.addEventListener('click', () => {
      verdicts = toggled(verdicts, key, v);
      saved = writeDeviceChecks(verdicts);
      render();
    });
    return b;
  };
  return { key, card, yes: button('yes', 'tick', TICK, 'Right'), no: button('no', 'cross', CROSS, 'Not right') };
});

const foot = el('div', 'foot', root);
const clear = el('button', '', foot);
clear.type = 'button';
clear.textContent = 'Clear all verdicts';
clear.addEventListener('click', () => {
  if (!Object.keys(verdicts).length || !window.confirm('Clear every tick and cross on this iPad?')) return;
  verdicts = {};
  saved = writeDeviceChecks(verdicts);
  render();
});
const back = el('a', '', foot);
back.href = './index.html';
back.textContent = 'Back to the game';
const list = el('div', 'list', foot);

function render(): void {
  for (const { key, card, yes, no } of cards) {
    const v = verdicts[key];
    card.classList.toggle('tick', v === 'tick');
    card.classList.toggle('cross', v === 'cross');
    yes.classList.toggle('on', v === 'tick');
    no.classList.toggle('on', v === 'cross');
    yes.setAttribute('aria-pressed', String(v === 'tick'));
    no.setAttribute('aria-pressed', String(v === 'cross'));
  }
  const ticks = cards.filter((x) => verdicts[x.key] === 'tick').length;
  const crosses = cards.filter((x) => verdicts[x.key] === 'cross').length;
  // The game's own rule over the file's checks and this device's verdicts.
  const strong = phraseTargets({ device: verdicts }).length;
  // Green and gold are each other's partner colour, and blue and brown are shown next to one of them at level 1, so
  // without both nothing is ready.
  const known = (c: string) => cards.filter((x) => x.key.startsWith(`${c} `)).some((x) => verdicts[x.key] === 'tick' || (pairs[x.key] === 'emma' && verdicts[x.key] !== 'cross'));
  const gate = strong >= MIN_PHRASES
    ? `The Dressing Corner plays phrase wishes with ${strong} phrases.`
    : `${strong} phrases are ready; the Dressing Corner plays phrase wishes from ${MIN_PHRASES}. Until then it plays word wishes.`
      + (known('green') && known('gold') ? '' : ' Green and gold are needed most: without both, no phrase is ready.');
  status.textContent = `${ticks} right, ${crosses} not right, ${cards.length - ticks - crosses} to go. ${gate}`
    + (saved ? '' : ' This browser cannot save the verdicts (a private tab?), so the game will not see them.');
  status.classList.toggle('warn', !saved);
  const right = cards.filter((x) => verdicts[x.key] === 'tick').map((x) => x.key);
  list.textContent = right.length ? `Right on this iPad: ${right.join(', ')}.` : '';
}
render();
(window as unknown as { __check?: unknown }).__check = { pairs: cards.length, verdicts: () => ({ ...verdicts }) };
