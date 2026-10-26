// Writes public/audio/v4demo/lines.json: a line for every clip id the demo can use that no v3 pack has.
// Run from games/moon-meadow-world after build-content: node tools/build-lines.ts
// The ids come from the content itself (allClipIds), so a new egg range or door range cannot miss its clip.
// Line rules: shared/README.md "Adding lines" and VOICES.md (Elizabeth for goals, hints and numbers; the queen
// for Lumi's story lines only).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// src/assets.ts reads the page location when it loads; give it one outside the browser.
(globalThis as { location?: unknown }).location ??= { pathname: '/' };
const { allClipIds } = await import('../src/content/index.ts');

const here = resolve(import.meta.dirname, '..');
const v3Audio = resolve(here, '../moon-meadow-home/public/audio');
const OUT = join(here, 'public/audio/v4demo/lines.json');
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1'];

interface Line { id: string; speaker: 'narrator' | 'queen'; text: string; note?: string; expect?: string[]; seed?: number }

/** The demo's own sentences, in the order of the level. */
const SENTENCES: Line[] = [
  { id: 'g4-walk', speaker: 'narrator', text: 'Tap the grass to walk.', note: 'Welcome: the ghost hand taps the grass.' },
  { id: 'g4-snow-egg', speaker: 'narrator', text: 'A snow egg! It hatches when it is just right.', note: 'First snow egg, before its goal.' },
  { id: 'g4-snow', speaker: 'narrator', text: 'Drag the snow stone that cools the extra cups.', note: 'Snow egg goal, after the numbers.' },
  { id: 'fb4-just-right', speaker: 'narrator', text: 'Just right!', note: 'Snow egg solved.' },
  { id: 'h4-count-extra', speaker: 'narrator', text: "Let's count the extra cups.", note: 'Snow egg hint, then the counting.' },
  { id: 'g4-give', speaker: 'narrator', text: 'Read the wish. Then give it to your baby.', note: 'Bath wish.' },
  { id: 'g4-pond', speaker: 'narrator', text: "Let's go to the pond!" },
  { id: 'g4-follow', speaker: 'narrator', text: 'Tap a unicorn, and it will follow you.' },
  { id: 'g4-slide-drag', speaker: 'narrator', text: 'Drag a unicorn to the top of the slide.' },
  { id: 'g4-slide-tap', speaker: 'narrator', text: 'Tap the slide, and slide down too!' },
  { id: 'g4-basket', speaker: 'narrator', text: 'Tap the basket, and feed your unicorns.', note: 'Free play.' },
  { id: 'g4-way-nest', speaker: 'narrator', text: 'The nest is this way.', note: 'After 20 s without progress.' },
  { id: 'g4-way-pond', speaker: 'narrator', text: 'The pond is this way.' },
  { id: 'g4-way-slide', speaker: 'narrator', text: 'The slide is this way.' },
  { id: 'g4-way-wildegg', speaker: 'narrator', text: 'The egg is this way.' },
  { id: 'g4-way-stable', speaker: 'narrator', text: 'The stable is this way.' },
  { id: 'g4-to-stable', speaker: 'narrator', text: 'Walk to the stable with your babies.', note: 'Bedtime.' },
  { id: 'h4-doors', speaker: 'narrator', text: 'Look at the numbers on the doors.', note: 'Door hint, while the row glows.' },
  { id: 'lumi4-another-egg', speaker: 'queen', text: 'Oh! Another egg!', note: 'The wild egg lands on the pond shore.' },
  { id: 'lumi4-ribbons', speaker: 'queen', text: 'You did so well today, Emma! Here are new ribbons for your hair.', note: 'Goodnight reward.' },
];

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

function word(n: number): string {
  if (!ONES[n]) throw new Error(`no number word for ${n}`);
  return ONES[n];
}
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/** The number lines, one pattern per id family. */
function numberLine(id: string): Line | null {
  let m = /^num-add-(\d+)-(\d+)$/.exec(id);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return { id, speaker: 'narrator', text: `${cap(word(a))} and ${word(b)} make ${word(a + b)}!`, note: 'Warm egg solved.' };
  }
  m = /^num-take-(\d+)-(\d+)$/.exec(id);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return { id, speaker: 'narrator', text: `${cap(word(a))} take away ${word(b)} is ${word(a - b)}!`, note: 'Snow egg solved.' };
  }
  m = /^num-toowarm-(\d+)$/.exec(id);
  if (m) return { id, speaker: 'narrator', text: `But ${word(Number(m[1]))} cups are warm!`, note: 'Snow egg goal.' };
  m = /^num-still-warm-(\d+)$/.exec(id);
  if (m) {
    const n = Number(m[1]);
    const text = n === 1 ? 'One cup is still too warm.' : `${cap(word(n))} cups are still too warm.`;
    return { id, speaker: 'narrator', text, note: 'Snow stone too small.' };
  }
  m = /^num-that-(\d+)$/.exec(id);
  if (m) {
    const w = word(Number(m[1]));
    return { id, speaker: 'narrator', text: `That is ${w}.`, expect: [`That's ${w}.`], note: 'After a wrong door.' };
  }
  return null;
}

/** Ids v3 already has as a usable clip. */
const v3Ok = new Set<string>();
for (const pack of V3_PACKS) {
  const path = join(v3Audio, pack, 'manifest.json');
  if (!existsSync(path)) continue;
  const clips = (JSON.parse(readFileSync(path, 'utf8')) as { clips: Record<string, { ok?: boolean }> }).clips;
  for (const [id, c] of Object.entries(clips)) if (c.ok === true) v3Ok.add(id);
}

/**
 * Clips the content promises but a level with near-miss stones never reaches: the snow egg's tooSmall(k) has a clip
 * for k up to 6, as v3's num-cold and num-over have up to 9, so a wider stone rule cannot hit a missing clip.
 */
const RESERVE = [3, 4, 5, 6].map((k) => `num-still-warm-${k}`);

const byId = new Map(SENTENCES.map((l) => [l.id, l]));
const lines: Line[] = [];
const missing: string[] = [];
const needed = [...new Set([...allClipIds(), ...RESERVE])].filter((id) => !v3Ok.has(id));
for (const id of needed) {
  const line = byId.get(id) ?? numberLine(id);
  if (line) lines.push(line);
  else missing.push(id);
}
const unused = SENTENCES.filter((l) => !needed.includes(l.id)).map((l) => l.id);
const clash = SENTENCES.filter((l) => v3Ok.has(l.id)).map((l) => l.id);
if (missing.length || unused.length || clash.length) {
  if (missing.length) console.error('build-lines: no line for ' + missing.join(', '));
  if (unused.length) console.error('build-lines: lines no content uses: ' + unused.join(', '));
  if (clash.length) console.error('build-lines: ids v3 already has: ' + clash.join(', '));
  process.exit(1);
}

// Sentences first in level order, then the numbers by family.
const order = (l: Line) => (byId.has(l.id) ? SENTENCES.indexOf(byId.get(l.id)!) : 1000);
lines.sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id, 'en', { numeric: true }));

const body = lines.map((l) => '    ' + JSON.stringify(l)).join(',\n');
writeFileSync(OUT, `{\n  "note": "Made by tools/build-lines.ts. The demo's own clips; every other clip comes from v3's packs.",\n  "lines": [\n${body}\n  ]\n}\n`);
const chars = lines.reduce((n, l) => n + l.text.length, 0);
console.log(`build-lines: wrote ${OUT.slice(here.length + 1)}: ${lines.length} lines, ${chars} characters`);
