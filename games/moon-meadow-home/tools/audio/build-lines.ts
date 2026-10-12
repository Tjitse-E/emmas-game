/**
 * Writes public/audio/<pack>/lines.json for the packs audio owns (core, numbers, places, area-*, names-new), from
 * content/lines/*.json (hand-written lines), the number lines and Emma's invented names. Learning's packs
 * (words-*, names-t1, phrases-*) are written by npm run build:lines and only read here, to catch an id in two packs.
 * Run: npm run audio:lines (from games/moon-meadow-home). No network, no key.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { numberLines } from './number-lines.ts';
import {
  LEARNING_PACKS, PACKS_BUILT, catalogueLines, crossPackDuplicates, newNameLines, validatePack,
  type BuiltPack, type NewName, type PackLine, type SceneFile,
} from './lines-lib.ts';

const G = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AUDIO = join(G, 'public/audio');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const jsonFiles = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f)) : [];
const optional = <T>(path: string, fallback: T): T => (existsSync(path) ? readJson<T>(path) : fallback);

const scenes = jsonFiles(join(G, 'content/lines')).map((p) => readJson<SceneFile>(p));
const invented = optional<{ names: NewName[] }>(join(G, 'content/names/new.json'), { names: [] }).names;

const packs = new Map<BuiltPack, PackLine[]>(PACKS_BUILT.map((p) => [p, []]));
const add = (pack: BuiltPack, lines: readonly PackLine[]): void => { packs.get(pack)!.push(...lines); };
for (const [pack, lines] of catalogueLines(scenes)) add(pack, lines);
add('numbers', numberLines());
add('names-new', newNameLines(invented));

let errors = crossPackDuplicates(packs);
for (const [pack, lines] of packs) errors = errors.concat(validatePack(lines).map((e) => `${pack}: ${e}`));
if (errors.length) {
  for (const e of errors) console.error('error:', e);
  process.exit(1);
}

// Learning's packs: an id in one of them and in one of mine is reported here and fails npm run check:audio.
const all = new Map<string, readonly PackLine[]>(packs);
for (const p of LEARNING_PACKS) all.set(p, optional<{ lines: PackLine[] }>(join(AUDIO, p, 'lines.json'), { lines: [] }).lines);
for (const d of crossPackDuplicates(all)) console.warn('warning:', d);

// Every pack the app loads has a manifest.json, so the app never asks the server for a file that is not there
// (a 404 shows as a console error in the flows). Audio owns the manifests of learning's packs too.
const emptyManifest = JSON.stringify({ clips: {} }, null, 1) + '\n';
for (const p of LEARNING_PACKS) {
  const dir = join(AUDIO, p);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, 'manifest.json'))) writeFileSync(join(dir, 'manifest.json'), emptyManifest);
}

for (const [pack, lines] of packs) {
  const dir = join(AUDIO, pack);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'lines.json'), JSON.stringify({ pack, lines }, null, 1) + '\n');
  if (!existsSync(join(dir, 'manifest.json'))) writeFileSync(join(dir, 'manifest.json'), emptyManifest);
  const chars = lines.reduce((n, l) => n + l.text.length, 0);
  console.log(`${pack.padEnd(18)} ${String(lines.length).padStart(5)} lines ${String(chars).padStart(6)} characters`);
}
