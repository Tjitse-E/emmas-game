// What core's v2 import needs from learning: grapheme splits, item ids and phonemes (V2ImportDeps).
// Shared by the start rule (I-2) and the importFixture hook.
import { content } from '../core/content/static.ts';
import { phonemesOf, splitUsual } from '../core/content/gpc.ts';
import { graphemeItem } from '../core/keys.ts';
import type { V2ImportDeps } from '../core/save/v2.ts';

export const v2Deps: V2ImportDeps = {
  splitGraphemes: (w: string) => splitUsual(w.toLowerCase(), content.gpcs) ?? [...w.toLowerCase()],
  graphemeItem,
  phonemes: (gems: readonly string[]) => {
    try { return phonemesOf(gems, content.gpcs).join(' '); } catch { return gems.join(' '); }
  },
};
