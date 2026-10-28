// The address options of the game (README "Address options"). The world reads its own (?pr=, ?aa=) at createWorld.
import { type Band, parseBand } from './band';
import { type ReadingLevel, parseLevel } from './reading';

/** The afternoon's quests (2.3 Part 2, section 4): the picnic, the two maths quests in turn, the Dressing Corner. */
export type QuestId = 'picnic' | 'rack' | 'beads' | 'corner';
export const QUEST_IDS: readonly QuestId[] = ['picnic', 'rack', 'beads', 'corner'];

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
  /**
   * ?quest=picnic|rack|beads|corner (with ?at=free): that quest starts as free play begins (rack or beads also makes
   * it this play's maths quest; corner skips the first quest it waits for).
   */
  quest: QuestId | null;
  /** ?pl=1|2|3: every pattern at this level, and the pattern level is not stored. */
  patternLevel: ReadingLevel | null;
  /** ?box=<seconds>: the music box plays this long at the start mirror and the Corner (the flows use 5). */
  boxMs: number | null;
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
    quest: (QUEST_IDS as readonly string[]).includes(quest ?? '') ? (quest as QuestId) : null,
    patternLevel: parseLevel(p.get('pl')),
    boxMs: Number(p.get('box')) > 0 ? Math.round(Number(p.get('box')) * 1000) : null,
    portrait: p.get('portrait') !== '0',
    perf: p.get('perf') === '1',
  };
}
