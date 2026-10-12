// G/tools/propose-splits.ts
// Authoring helper. Reads one word or name per line on standard input and prints draft JSON rows.
// Usage: node tools/propose-splits.ts words < list.txt   or   node tools/propose-splits.ts names < list.txt
// The split uses only usual GPCs (splitUsual). Fix alternatives (ow.oa, oo.uu, y.ee) by hand. Nothing is written to disk.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitUsual } from '../src/core/content/gpc.ts';
import { GAME_ROOT } from './lib/read-content.ts';
import type { RawGpc } from '../src/core/content/types.ts';

const mode = process.argv[2];
if (mode !== 'words' && mode !== 'names') {
  console.error('Usage: node tools/propose-splits.ts words|names < list.txt');
  process.exit(1);
}
const rows = (JSON.parse(readFileSync(join(GAME_ROOT, 'content', 'gpcs.json'), 'utf8')) as { gpcs: RawGpc[] }).gpcs;
const table: Record<string, RawGpc> = Object.fromEntries(rows.map(g => [g.id, g]));

const entries = readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
for (const entry of entries) {
  const gpcs = splitUsual(entry.toLowerCase(), table);
  if (!gpcs) { console.log(JSON.stringify({ unsplit: entry })); continue; }
  if (mode === 'words') console.log(JSON.stringify({ w: entry.toLowerCase(), gpcs, pic: entry.toLowerCase(), kind: 'thing' }));
  else console.log(JSON.stringify({ name: entry[0].toUpperCase() + entry.slice(1).toLowerCase(), gpcs, source: 'uk', priority: 3 }));
}
