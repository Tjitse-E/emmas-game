// G/tools/list-pictures.ts
// npm run list:pictures. Writes content/pictures-needed.json, the list the art stream draws word pictures from (R62).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_ROOT, readContent } from './lib/read-content.ts';
import { picturesNeeded } from './lib/lines.ts';

const pictures = picturesNeeded(readContent());
const body = `{\n  "pictures": [\n${pictures.map(p => '    ' + JSON.stringify(p)).join(',\n')}\n  ]\n}\n`;
writeFileSync(join(GAME_ROOT, 'content', 'pictures-needed.json'), body);
const by = [1, 2, 3].map(n => pictures.filter(p => p.priority === n).length);
console.log(`${pictures.length} pictures (priority 1: ${by[0]}, 2: ${by[1]}, 3: ${by[2]})`);
