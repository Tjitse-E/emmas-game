/** Writes src/audio/clip-ids.generated.ts from content/lines/*.json. Run: npm run audio:ids (from games/moon-meadow-home). */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderClipIds } from './clip-ids-lib.ts';
import type { SceneFile } from './lines-lib.ts';

const G = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(G, 'content/lines');
const files = existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as SceneFile)
  : [];
writeFileSync(join(G, 'src/audio/clip-ids.generated.ts'), renderClipIds(files));
console.log(`src/audio/clip-ids.generated.ts: ${files.reduce((n, f) => n + f.lines.length, 0)} clip ids in ${files.length} line files`);
