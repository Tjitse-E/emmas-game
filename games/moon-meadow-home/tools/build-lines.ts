// G/tools/build-lines.ts
// npm run build:lines -- [--names-limit <n>]
// Writes learning's packs only (R6): public/audio/{words-phase2,words-phase3-4,words-year1,names-t1}/lines.json,
// and a phrases-* pack once it has phrases. Never touches mp3 files or manifest.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_ROOT, readContent } from './lib/read-content.ts';
import { nameLines, phraseLines, wordLines } from './lib/lines.ts';
import type { LineEntry } from './lib/validate.ts';

const args = process.argv.slice(2);
const i = args.indexOf('--names-limit');
const limit = i >= 0 ? Number(args[i + 1]) : undefined;
if (limit !== undefined && !(Number.isInteger(limit) && limit >= 0)) {
  console.error('--names-limit needs a whole number');
  process.exit(1);
}

const c = readContent();
const packs: [string, LineEntry[]][] = [
  ...Object.entries(wordLines(c)),
  ['names-t1', nameLines(c, limit)],
  ...Object.entries(phraseLines(c)) as [string, LineEntry[]][],
];
for (const [pack, lines] of packs) {
  const dir = join(GAME_ROOT, 'public', 'audio', pack);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'lines.json'), JSON.stringify({ lines }, null, 2) + '\n');
  const chars = lines.reduce((n, l) => n + l.text.length, 0);
  console.log(`${pack.padEnd(16)} ${String(lines.length).padStart(5)} lines ${String(chars).padStart(7)} characters`);
}
