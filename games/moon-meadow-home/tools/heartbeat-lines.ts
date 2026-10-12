// Writes content/lines/heartbeat.json from src/core/heartbeat/lines.ts. Run: npm run lines:heartbeat
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heartbeatLineFile } from '../src/core/heartbeat/lines.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'content/lines/heartbeat.json');
const file = heartbeatLineFile();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
const chars = file.lines.reduce((n, l) => n + l.text.length, 0);
console.log(`${file.lines.length} lines, ${chars} characters before cache hits on the v2 texts.`);
