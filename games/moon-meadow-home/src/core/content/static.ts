// G/src/core/content/static.ts  (Vite only: JSON imports without attributes; Node tools use tools/lib/read-content.ts)
import { buildContent } from './build.ts';
import { buildBlocklist, type RawBlocklist, type Blocklist } from './blocklist.ts';
import { canonicalJson, sha256Hex } from '../hash.ts';
import type { Content, RawContent, RawPhrasePack } from './types.ts';
import release from '../../../content/release.json';
import gpcs from '../../../content/gpcs.json';
import reading from '../../../content/ladders/reading.json';
import spelling from '../../../content/ladders/spelling.json';
import maths from '../../../content/ladders/maths.json';
import budget from '../../../content/ladders/budget.json';
import moments from '../../../content/moments.json';
import pairs from '../../../content/pairs.json';
import phase2 from '../../../content/words/phase2.json';
import phase34 from '../../../content/words/phase3-4.json';
import year1 from '../../../content/words/year1.json';
import names from '../../../content/names/tier1.json';
import rawBlocklist from '../../../../../shared/blocklist.json';

const phraseFiles = import.meta.glob<RawPhrasePack>('../../../content/phrases/*.json', { eager: true, import: 'default' });

/** The raw packs in the same shape and order as tools/lib/read-content.ts readRawContent(). */
export const raw = {
  release: release.release,
  gpcs: gpcs.gpcs,
  ladders: [reading, spelling, maths],
  words: [phase2, phase34, year1],
  names,
  pairs,
  moments,
  budget,
  phrases: Object.keys(phraseFiles).sort().map(k => phraseFiles[k]),
} as unknown as RawContent;

export const content: Content = buildContent(raw);
export const blocklist: Blocklist = buildBlocklist(rawBlocklist as RawBlocklist, content.gpcs);
/** sha256 of the canonical JSON of the raw content. It feeds the snapshot key, so a content change refolds the learner. */
export const CONTENT_HASH: string = sha256Hex(canonicalJson(raw));
