// G/src/core/content/blocklist.ts
// The blocklist (shared/blocklist.json) checked by sound. It is never shown or played.
import { collapseRuns, phonemesOf, splitUsual } from './gpc.ts';
import type { GpcId, Phoneme, RawGpc } from './types.ts';

export type BlockLevel = 'strong' | 'rude' | 'toilet' | 'slur';
export type RawBlocklist = { version: 1; entries: { w: string; lang: 'en' | 'nl'; level: BlockLevel }[] };
export type Blocklist = { whole: Record<string, BlockLevel>; parts: { key: Phoneme[]; level: BlockLevel }[]; unsplit: string[] };
export type BlockHit = { level: BlockLevel; part: boolean };

export const phonemeKey = (p: readonly Phoneme[]): string => p.join('.');

/** Splits every entry into usual GPCs and collapses repeated sounds. Entries that do not split go to `unsplit`. */
export function buildBlocklist(raw: RawBlocklist, table: Record<GpcId, RawGpc>): Blocklist {
  const out: Blocklist = { whole: {}, parts: [], unsplit: [] };
  for (const e of raw.entries) {
    const gpcs = splitUsual(e.w, table);
    if (!gpcs) { out.unsplit.push(e.w); continue; }
    const key = collapseRuns(phonemesOf(gpcs, table));
    out.whole[phonemeKey(key)] ??= e.level;
    if ((e.level === 'strong' || e.level === 'slur') && key.length >= 3) out.parts.push({ key, level: e.level });
  }
  return out;
}

/** A whole-name hit wins over a part hit. Inside a longer name only strong and slur entries of 3 or more sounds count. */
export function checkBlocked(phonemes: readonly Phoneme[], list: Blocklist): BlockHit | null {
  const p = collapseRuns(phonemes);
  const whole = list.whole[phonemeKey(p)];
  if (whole) return { level: whole, part: false };
  for (const { key, level } of list.parts) {
    for (let i = 0; i + key.length <= p.length; i++) {
      if (key.every((k, j) => p[i + j] === k)) return { level, part: true };
    }
  }
  return null;
}
