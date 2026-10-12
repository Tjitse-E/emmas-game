/**
 * Pure builders for the audio packs that audio writes (master plan R6): core, numbers, places, area-* and names-new.
 * Learning's packs (words-*, names-t1, phrases-*) are written by learning's npm run build:lines and never here.
 */
import { NARRATOR_ONLY_PREFIXES } from '../../src/core/keys.ts';
import { nameId } from '../../src/audio/ids.ts';
import type { PACKS } from '../../src/types/contracts.ts';

export type Speaker = 'narrator' | 'queen' | 'foal';
export type PackLine = { id: string; speaker: Speaker; text: string; note?: string; seed?: number; expect?: string[] };
/** Every pack the app loads (contracts C8). */
export type PackName = (typeof PACKS)[number];
/** The packs this tool writes. The others belong to learning (R6, R33). */
export const PACKS_BUILT = ['core', 'numbers', 'places', 'area-stable-yard', 'area-village-lane', 'names-new'] as const;
export type BuiltPack = (typeof PACKS_BUILT)[number];
/** Learning's packs: audio reads their lines.json (for duplicates) and generates their clips, but never writes them. */
export const LEARNING_PACKS = ['words-phase2', 'words-phase3-4', 'words-year1', 'phrases-meadow', 'phrases-notes', 'phrases-salon', 'names-t1'] as const;
/**
 * Preload units known before any line file names them (validation round 2: the scene field of the line files).
 * places.json lands in a later batch, so 'places' is listed here to keep its scene id stable.
 */
export const BASE_SCENES = ['common', 'start', 'moving-day', 'heartbeat', 'places'] as const;
export const NARRATOR_ONLY: readonly string[] = NARRATOR_ONLY_PREFIXES;

export type CatalogueLine = { id: string; speaker: Speaker; text: string; also?: string[]; note?: string; seed?: number; expect?: string[] };
export type SceneFile = { scene: string; pack?: string; lines: CatalogueLine[] };
/** One name Emma invented, from content/names/new.json (written by names:pull, Task B3). */
export type NewName = { name: string; graphemes: string[]; phonemes: string[]; firstSeen: string; count: number; nearest: string | null; distance: number | null; mode: 'ipa' | 'respell'; text: string };

const AREA: Readonly<Record<string, BuiltPack>> = {
  'post-box': 'area-stable-yard', 'letter-lane': 'area-stable-yard', salon: 'area-village-lane', valley: 'area-village-lane',
};

export function packForScene(scene: string): BuiltPack {
  return AREA[scene] ?? 'core';
}

function isBuilt(pack: string): pack is BuiltPack {
  return (PACKS_BUILT as readonly string[]).includes(pack);
}

/** Hand-written lines grouped by pack. A file's pack field wins over its scene. Throws on a pack audio does not write. */
export function catalogueLines(files: readonly SceneFile[]): Map<BuiltPack, PackLine[]> {
  const out = new Map<BuiltPack, PackLine[]>();
  for (const f of files) {
    const pack = f.pack ?? packForScene(f.scene);
    if (!isBuilt(pack) || pack === 'numbers' || pack === 'names-new') {
      throw new Error(`catalogueLines: scene ${f.scene} names pack ${pack}, which is not a hand-written line pack`);
    }
    const list = out.get(pack) ?? [];
    for (const l of f.lines) {
      const p: PackLine = { id: l.id, speaker: l.speaker, text: l.text };
      if (l.note) p.note = l.note;
      if (l.seed !== undefined) p.seed = l.seed;
      if (l.expect) p.expect = l.expect;
      list.push(p);
    }
    out.set(pack, list);
  }
  return out;
}

function namePair(name: string, called: string, asked: string, note?: string): PackLine[] {
  const x: PackLine = { id: nameId(name, '!'), speaker: 'narrator', text: called, expect: [name] };
  const q: PackLine = { id: nameId(name, '?'), speaker: 'narrator', text: asked, expect: [name] };
  if (note) { x.note = note; q.note = note; }
  return [x, q];
}

/** Names Emma invented, from content/names/new.json (written by names:pull), oldest first. */
export function newNameLines(names: readonly NewName[]): PackLine[] {
  return names.flatMap((n) => namePair(n.name, `${n.text}!`, `${n.text}?`, `invented, nearest ${n.nearest ?? 'none'}`));
}

/** The errors that would make the generator refuse a pack, found earlier so the build fails first. */
export function validatePack(lines: readonly PackLine[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const l of lines) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.id)) errors.push(`${l.id}: id must be lowercase kebab-case`);
    if (ids.has(l.id)) errors.push(`${l.id}: duplicate id`);
    ids.add(l.id);
    if (!['narrator', 'queen', 'foal'].includes(l.speaker)) errors.push(`${l.id}: unknown speaker ${l.speaker}`);
    if (NARRATOR_ONLY.some((p) => l.id.startsWith(p)) && l.speaker !== 'narrator') errors.push(`${l.id}: must be spoken by the narrator`);
    const plain = l.text.replace(/\[[^\]]*\]/g, '');
    if (/\d/.test(plain)) errors.push(`${l.id}: write numbers as words`);
    if (l.speaker !== 'foal' && plain !== l.text) errors.push(`${l.id}: audio tags are only for foal lines`);
    if (!l.text.trim()) errors.push(`${l.id}: empty text`);
    if (l.text.includes('—')) errors.push(`${l.id}: no em dashes`);
  }
  return errors;
}

/** Ids used in more than one pack. The player would only ever find the first. */
export function crossPackDuplicates(packs: ReadonlyMap<string, readonly PackLine[]>): string[] {
  const where = new Map<string, string>();
  const dups: string[] = [];
  for (const [pack, lines] of packs) for (const l of lines) {
    const prev = where.get(l.id);
    if (prev && prev !== pack) dups.push(`${l.id}: in ${prev} and ${pack}`);
    where.set(l.id, pack);
  }
  return dups;
}
