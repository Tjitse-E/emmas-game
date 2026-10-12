// G/tools/lib/read-content.ts
// Node file reader for content, blocklist, lines, manifests, picture ids and clip ids used in code.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent } from '../../src/core/content/build.ts';
import type { RawBlocklist } from '../../src/core/content/blocklist.ts';
import type {
  Budget, Content, RawContent, RawGpc, RawLadder, RawMoments, RawNameBank, RawPairs, RawPhrasePack, RawWordPack, Release,
  WordPackName,
} from '../../src/core/content/types.ts';
import type { LineEntry, ValidateInput } from './validate.ts';

export const GAME_ROOT: string = fileURLToPath(new URL('../..', import.meta.url));
export const REPO_ROOT: string = join(GAME_ROOT, '..', '..');

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const readJsonOr = <T>(path: string, fallback: T): T => (existsSync(path) ? readJson<T>(path) : fallback);
const content = (...p: string[]) => join(GAME_ROOT, 'content', ...p);

const WORD_FILES: [string, WordPackName][] = [['phase2', 'words-phase2'], ['phase3-4', 'words-phase3-4'], ['year1', 'words-year1']];

/** Reads every content file. Words, names and phrases files may be missing (empty packs), so data tasks land one at a time. */
export function readRawContent(release?: Release): RawContent {
  const rel = release ?? readJson<{ release: Release }>(content('release.json')).release;
  const ladder = (name: string) => readJson<RawLadder>(content('ladders', `${name}.json`));
  const phraseDir = content('phrases');
  const phrases = existsSync(phraseDir)
    ? readdirSync(phraseDir).filter(f => f.endsWith('.json')).sort().map(f => readJson<RawPhrasePack>(join(phraseDir, f)))
    : [];
  return {
    release: rel,
    gpcs: readJson<{ gpcs: RawGpc[] }>(content('gpcs.json')).gpcs,
    ladders: [ladder('reading'), ladder('spelling'), ladder('maths')],
    words: WORD_FILES.map(([file, pack]) => readJsonOr<RawWordPack>(content('words', `${file}.json`), { pack, words: [] })),
    names: readJsonOr<RawNameBank>(content('names', 'tier1.json'), { tier: 1, names: [] }),
    pairs: readJson<RawPairs>(content('pairs.json')),
    moments: readJson<RawMoments>(content('moments.json')),
    budget: readJson<Budget>(content('ladders', 'budget.json')),
    phrases,
  };
}

export function readContent(release?: Release): Content {
  return buildContent(readRawContent(release));
}

export function readRawBlocklist(): RawBlocklist {
  return readJsonOr<RawBlocklist>(join(REPO_ROOT, 'shared', 'blocklist.json'), { version: 1, entries: [] });
}

export function readPhonicsKeys(): string[] {
  const idx = readJsonOr<{ sounds?: Record<string, unknown> }>(join(REPO_ROOT, 'shared', 'audio', 'phonics', 'index.json'), {});
  return Object.keys(idx.sounds ?? {});
}

const audioDir = () => join(GAME_ROOT, 'public', 'audio');
const packDirs = (): string[] =>
  existsSync(audioDir()) ? readdirSync(audioDir(), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort() : [];

/** Every public/audio/<pack>/lines.json; the pack is the folder name. */
export function readLinePacks(): { pack: string; lines: LineEntry[] }[] {
  return packDirs()
    .filter(p => existsSync(join(audioDir(), p, 'lines.json')))
    .map(p => ({ pack: p, lines: readJson<{ lines?: LineEntry[] }>(join(audioDir(), p, 'lines.json')).lines ?? [] }));
}

/** Clip ids per pack. A clip marked `ok: false` (failed speech-to-text) counts as absent. */
export function readManifests(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of packDirs()) {
    const m = readJsonOr<{ clips?: Record<string, { ok?: boolean }> }>(join(audioDir(), p, 'manifest.json'), {});
    out[p] = Object.entries(m.clips ?? {}).filter(([, v]) => v?.ok !== false).map(([k]) => k);
  }
  return out;
}

export function readPictureIds(): string[] {
  const m = readJsonOr<{ pictures?: Record<string, unknown> }>(join(GAME_ROOT, 'public', 'art', 'manifest.json'), {});
  return Object.keys(m.pictures ?? {});
}

/** Ids in the hand-written line files (content/lines/*.json) that audio turns into packs. */
export function readSourceLineIds(): string[] {
  const dir = content('lines');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json'))
    .flatMap(f => (readJson<{ lines?: { id: string }[] }>(join(dir, f)).lines ?? []).map(l => l.id));
}

/** `say('<id>')` and `speak('<id>')` literals in src/**\/*.ts and src/**\/*.svelte. */
export function readCodeClipIds(): string[] {
  const src = join(GAME_ROOT, 'src');
  if (!existsSync(src)) return [];
  const files = (readdirSync(src, { recursive: true }) as string[]).filter(f => /\.(ts|svelte)$/.test(f));
  const ids = new Set<string>();
  const re = /\b(?:say|speak)\(\s*['"]([a-z0-9]+(?:-[a-z0-9]+)*)['"]/g;
  for (const f of files) {
    const text = readFileSync(join(src, f), 'utf8');
    for (const m of text.matchAll(re)) ids.add(m[1]);
  }
  return [...ids].sort();
}

export function readValidateInput(opts: { dataOnly: boolean; release?: Release; assets?: 'error' | 'warn' }): ValidateInput {
  return {
    raw: readRawContent(opts.release),
    blocklist: readRawBlocklist(),
    phonics: readPhonicsKeys(),
    lines: readLinePacks(),
    manifests: opts.dataOnly ? null : readManifests(),
    pictures: opts.dataOnly ? null : readPictureIds(),
    codeIds: readCodeClipIds(),
    sourceLineIds: readSourceLineIds(),
    assets: opts.assets ?? 'error',
  };
}
