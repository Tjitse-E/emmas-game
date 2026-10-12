// G/src/core/content/gpc.ts
import type { GpcId, Phoneme, RawGpc } from './types.ts';

// R40: one name key for items and clips. No local copy.
export { slugName } from '../keys.ts';

export const PHONEMES: readonly Phoneme[] = [
  'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'th', 's', 'z', 'sh', 'zh', 'ch', 'j', 'h', 'm', 'n', 'ng', 'l', 'r', 'w', 'y',
  'a', 'e', 'i', 'o', 'u', 'uu', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', '@',
];

type Table = Record<GpcId, RawGpc>;

function get(id: GpcId, table: Table): RawGpc {
  const g = table[id];
  if (!g) throw new Error(`Unknown GPC ${id}`);
  return g;
}

/** The printed word for a GPC list. A split digraph prints its vowel, then the next GPC, then the e. */
export function spell(gpcs: readonly GpcId[], table: Table): string {
  let out = '';
  let pendingE = false;
  gpcs.forEach((id, i) => {
    const g = get(id, table);
    if (g.split) {
      if (i === gpcs.length - 1) throw new Error(`Split digraph ${id} needs a GPC after it`);
      out += g.text[0];
      pendingE = true;
      return;
    }
    out += g.text;
    if (pendingE) { out += 'e'; pendingE = false; }
  });
  return out;
}

export function phonemesOf(gpcs: readonly GpcId[], table: Table): Phoneme[] {
  return gpcs.flatMap(id => get(id, table).phonemes);
}

/** Greedy split over usual GPCs (no alternatives, no split digraphs), longest first. Null when a letter has no GPC. */
export function splitUsual(word: string, table: Table): GpcId[] | null {
  const usual = new Set(Object.values(table).filter(g => isUsual(g.id) && !g.split && g.id === g.text).map(g => g.id));
  const s = word.toLowerCase();
  const out: GpcId[] = [];
  let i = 0;
  while (i < s.length) {
    let hit: string | null = null;
    for (let len = 4; len >= 1 && !hit; len--) {
      const part = s.slice(i, i + len);
      if (part.length === len && usual.has(part)) hit = part;
    }
    if (!hit) return null;
    out.push(hit);
    i += hit.length;
  }
  return out;
}

export const baseText = (id: GpcId): string => id.split('.')[0];
export const isUsual = (id: GpcId): boolean => !id.includes('.');
export const soundKey = (id: GpcId, table: Table): string | null => table[id]?.sound ?? null;
export const collapseRuns = (p: readonly Phoneme[]): Phoneme[] => p.filter((x, i) => i === 0 || x !== p[i - 1]);
