/**
 * Checks every audio pack: no id is defined twice across all packs, narrator-only ids are Elizabeth's, each line has
 * a clip and a file, the clip says the current text, and learning clips passed speech-to-text.
 * Every line of common, start, moving-day, heartbeat and places (the core and places packs) must have a clip: those
 * are the goal lines (R51), and go-live depends on this check.
 * Run: npm run check:audio (from games/moon-meadow-home). Exit code 1 on any error.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NARRATOR_ONLY_PREFIXES } from '../../src/core/keys.ts';

export type AudioIssue = {
  pack: string; id: string; severity: 'error' | 'warn';
  kind: 'duplicate' | 'voice' | 'no-clip' | 'no-file' | 'stale' | 'stt' | 'excluded' | 'unchecked'; detail: string;
};
type Line = { id: string; speaker: string; text: string };
type Clip = { file: string; text: string; ok?: boolean; stt?: { text: string; match: boolean; how?: string } };

/** Packs whose every line must have a clip before a release. The others may stop at the budget. */
export const STATIC_PACKS: ReadonlySet<string> = new Set(['core', 'area-stable-yard', 'area-village-lane', 'places']);
const LEARNING = ['word-', 'phrase-', 'name-', 'num-', 'ord-', 'model-'];

export function checkAudio(audioRoot: string): AudioIssue[] {
  const issues: AudioIssue[] = [];
  const firstPack = new Map<string, string>();
  for (const pack of readdirSync(audioRoot).sort()) {
    const linesPath = join(audioRoot, pack, 'lines.json');
    if (!existsSync(linesPath)) continue;
    const lines = (JSON.parse(readFileSync(linesPath, 'utf8')) as { lines: Line[] }).lines;
    const manifestPath = join(audioRoot, pack, 'manifest.json');
    const clips: Record<string, Clip> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).clips ?? {} : {};
    const must = STATIC_PACKS.has(pack);
    for (const l of lines) {
      const add = (severity: AudioIssue['severity'], kind: AudioIssue['kind'], detail: string): void => {
        issues.push({ pack, id: l.id, severity, kind, detail });
      };
      const prev = firstPack.get(l.id);
      if (prev !== undefined) add('error', 'duplicate', prev === pack ? `defined twice in ${pack}` : `also in ${prev}`);
      else firstPack.set(l.id, pack);
      if (NARRATOR_ONLY_PREFIXES.some((p) => l.id.startsWith(p)) && l.speaker !== 'narrator') add('error', 'voice', `${l.speaker} may not say a learning clip`);
      const c = clips[l.id];
      if (!c) { add(must ? 'error' : 'warn', 'no-clip', l.text); continue; }
      if (!existsSync(join(audioRoot, pack, c.file))) { add('error', 'no-file', c.file); continue; }
      if (c.text !== l.text) add(must ? 'error' : 'warn', 'stale', `clip says "${c.text}", line says "${l.text}"`);
      if (c.ok === false) add('warn', 'excluded', `speech-to-text heard "${c.stt?.text ?? ''}"`);
      else if (l.speaker !== 'foal' && !c.stt) add(LEARNING.some((p) => l.id.startsWith(p)) ? 'error' : 'warn', 'unchecked', 'no speech-to-text result');
      else if (c.stt && !c.stt.match) add('warn', 'stt', `heard "${c.stt.text}"`);
    }
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'public/audio');
  const issues = checkAudio(root);
  const quiet = process.argv.includes('--errors');
  for (const i of issues) {
    if (quiet && i.severity !== 'error') continue;
    console.log(`${i.severity.padEnd(5)} ${i.pack.padEnd(18)} ${i.kind.padEnd(9)} ${i.id}: ${i.detail}`);
  }
  const errors = issues.filter((i) => i.severity === 'error').length;
  console.log(`${issues.length} issue(s), ${errors} error(s)`);
  process.exit(errors ? 1 : 0);
}
