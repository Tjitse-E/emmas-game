// The naming blocklist (R23). Learning owns the shape and the check (src/core/content/blocklist.ts); this file
// re-exports them and adds the naming reading: a build of gems is read the way Elizabeth would say it.
import { buildBlocklist, checkBlocked, type BlockLevel, type Blocklist, type RawBlocklist } from '../content/blocklist.ts';
import { phonemeKey } from '../content/blocklist.ts';
import { collapseRuns } from '../content/gpc.ts';
import { builtPhonemes, normalPhonemes, spellingToGems, GPC_TABLE } from './sounds.ts';

export { buildBlocklist, checkBlocked };
export type { BlockLevel, Blocklist, RawBlocklist };
/** Heartbeat's name for learning's level. 'slur' counts as strong in name.built. */
export type BlockKind = BlockLevel;

const SEVERITY: Record<BlockLevel, number> = { toilet: 1, rude: 2, strong: 3, slur: 4 };

/**
 * Learning's list plus a second key per entry: the entry read as a built name (a final y as ee, a magic e,
 * doubled letters as one), so 'fani' is caught as 'fanny'. Both keys use the naming normalisation.
 */
export function compileBlocklist(raw: RawBlocklist): Blocklist {
  const base = buildBlocklist(raw, GPC_TABLE);
  const out: Blocklist = { whole: {}, parts: [], unsplit: base.unsplit };
  const seen = new Set<string>();
  const add = (ph: string[], level: BlockLevel) => {
    const key = collapseRuns(normalPhonemes(ph));
    if (!key.length) return;
    const k = phonemeKey(key);
    const had = out.whole[k];
    if (!had || SEVERITY[level] > SEVERITY[had]) out.whole[k] = level;
    // Inside a longer name only strong and slur entries of 3 or more sounds count (learning's rule).
    if ((level === 'strong' || level === 'slur') && key.length >= 3 && !seen.has(`${level}:${k}`)) {
      seen.add(`${level}:${k}`);
      out.parts.push({ key, level });
    }
  };
  for (const k of Object.keys(base.whole)) add(k.split('.'), base.whole[k]);
  for (const p of base.parts) add(p.key, p.level);
  for (const e of raw.entries) add(builtPhonemes(spellingToGems(e.w)), e.level);
  return out;
}

/** The level of a built name, or null when it is fine. A whole-name hit wins over a part hit. */
export function blockedName(gems: string[], list: Blocklist): BlockLevel | null {
  return checkBlocked(normalPhonemes(builtPhonemes(gems)), list)?.level ?? null;
}
