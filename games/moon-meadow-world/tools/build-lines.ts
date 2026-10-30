// Writes public/audio/v4demo/lines.json: a line for every clip id the demo can use that no v3 pack has.
// Run from games/moon-meadow-world after build-content: node tools/build-lines.ts
// The ids come from the content itself (allClipIds), so a new egg range or door range cannot miss its clip.
// The lines themselves are in tools/lines.ts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type Line, SENTENCES, lineFor } from './lines.ts';

// src/assets.ts reads the page location when it loads; give it one outside the browser.
(globalThis as { location?: unknown }).location ??= { pathname: '/' };
const { allClipIds } = await import('../src/content/index.ts');

const here = resolve(import.meta.dirname, '..');
const v3Audio = resolve(here, '../moon-meadow-home/public/audio');
const OUT = join(here, 'public/audio/v4demo/lines.json');
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'];

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
const STILL_WARM = [3, 4, 5, 6].map((k) => `num-still-warm-${k}`);

/**
 * The snow egg's goals and facts past ten, made for 2.2.0 and 2.3.0 (have 11 to 16). Since the sums stay within 10
 * (docs/v4/2.3.md section 19.1) no content asks them, but they stay in the pack for adding and taking away within 20
 * (GOAL.md): a line that leaves lines.json leaves the manifest at the next gen.sh run, and its paid clip with it.
 */
const PAST_TEN = [11, 12, 13, 14, 15, 16].flatMap((have) => {
  const from = Math.max(3, have - 10);
  return [`num-toowarm-${have}`, ...[0, 1, 2, 3].map((i) => `num-take-${have}-${from + i}`)];
});

/**
 * "A happy heart!", said between an egg's sums until 2.3.2, when the fact became the one line there (docs/v4/2.3.md
 * section 19.1). Its paid clip stays in the pack.
 */
const HEART = ['g4-heart'];

/** "Soon you can ride here!" at the saddle sign until 2.3.3; 2.4.0 no longer plays it, and its paid clip stays. */
const SOON = ['lumi4-soon'];

const RESERVE = [...STILL_WARM, ...PAST_TEN, ...HEART, ...SOON];

const byId = new Map(SENTENCES.map((l) => [l.id, l]));
const lines: Line[] = [];
const missing: string[] = [];
const needed = [...new Set([...allClipIds(), ...RESERVE])].filter((id) => !v3Ok.has(id));
for (const id of needed) {
  const line = lineFor(id);
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
