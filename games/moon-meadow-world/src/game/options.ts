// The address options of the game (README "Address options"). The world reads its own (?pr=, ?aa=) at createWorld.
import { type Band, parseBand } from './band';
import { type ReadingLevel, parseLevel } from './reading';

export type QuestId = 'picnic' | 'rack';

export interface GameOptions {
  /** ?seed=<n>: the same level every time; otherwise the time of the page load. */
  seed: number;
  /** ?at=<part>: start at a part after Play (checked against PARTS by the caller). */
  at: string | null;
  /** ?fresh=1: the save lives in memory only, so every load is a first visit with the defaults. */
  fresh: boolean;
  /** ?rl=1|2|3: every reading moment at this level, no warm-up, and the level is not stored. */
  readingLevel: ReadingLevel | null;
  /** ?maths=a|b: the maths band never moves. */
  band: Band | null;
  /** ?contrast=0: a wrong wish item gives v3's focused hint at once instead of the light contrast. */
  contrast: boolean;
  /** ?quest=picnic|rack (with ?at=free): that side quest starts as free play begins. */
  quest: QuestId | null;
  /** ?portrait=0: the customiser keeps her normal detail (to compare the frame rate on the iPad). */
  portrait: boolean;
  /** ?perf=1: the stats box. */
  perf: boolean;
}

export function parseOptions(search: string, now = Date.now()): GameOptions {
  const p = new URLSearchParams(search);
  const quest = p.get('quest');
  return {
    seed: Number(p.get('seed')) || now,
    at: p.get('at'),
    fresh: p.get('fresh') === '1',
    readingLevel: parseLevel(p.get('rl')),
    band: parseBand(p.get('maths')),
    contrast: p.get('contrast') !== '0',
    quest: quest === 'picnic' || quest === 'rack' ? quest : null,
    portrait: p.get('portrait') !== '0',
    perf: p.get('perf') === '1',
  };
}
