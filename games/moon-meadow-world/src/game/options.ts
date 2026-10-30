// The address options of the game (README "Address options"). The world reads its own (?pr=, ?aa=) at createWorld.
// 2.4.0 adds the hub's places and the jumps into them (docs/v4/2.4.md section 8): ?place= (and ?quest= as its alias),
// ?step=, ?babies=, ?bed=, ?sign= and ?mount=, and resolveStart, which turns ?at=, ?place= and ?step= into where a play
// starts.
import type { MountId } from '../contracts';
import { type Band, parseBand } from './band';
import { type ReadingLevel, parseLevel } from './reading';
import { type PhraseRule, parsePhraseRule } from '../content/phrase-device';

/** The afternoon's quests (2.3 section 17): the picnic, the two maths quests in turn, the Dressing Corner. */
export type QuestId = 'picnic' | 'rack' | 'beads' | 'corner';
export const QUEST_IDS: readonly QuestId[] = ['picnic', 'rack', 'beads', 'corner'];

/**
 * The hub's places (2.4.0, docs/v4/2.4.md section 5.2): the nest egg, the shore egg, a herd baby's wish, the four gift
 * quests (which keep QuestId, so the save and the rotation do not change), the ride and the pond.
 */
export type HubPlace = 'egg' | 'shore' | 'wish' | 'picnic' | 'beads' | 'rack' | 'ride' | 'corner' | 'pond';
export const HUB_PLACES: readonly HubPlace[] = ['egg', 'shore', 'wish', 'picnic', 'beads', 'rack', 'ride', 'corner', 'pond'];
/** A step inside a place: an egg place's naming or its baby's wish; a trip's sign 2, star egg, naming, wish or ride home. */
export type StartStep = 'naming' | 'wish' | 'sign2' | 'egg' | 'home';
export const START_STEPS: readonly StartStep[] = ['naming', 'wish', 'sign2', 'egg', 'home'];
/** Where a play starts: a part, the hub place asked as the hub opens, a step inside it, and the places counted as done before it. */
export interface StartAt {
  part: string;
  place: HubPlace | null;
  step: StartStep | null;
  done: HubPlace[];
}

const MOUNTS: readonly MountId[] = ['bella', 'hazel'];

export interface GameOptions {
  /** ?seed=<n>: the same level every time; otherwise the time of the page load. */
  seed: number;
  /** ?at=<part>: start at a part after Play (resolveStart turns it into a StartAt). */
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
   * it this play's maths quest; corner skips the first quest it waits for). 2.4.0: `place` when it is a QuestId, so
   * ?place=corner and ?quest=corner say the same.
   */
  quest: QuestId | null;
  /** ?pl=1|2|3: every pattern at this level, and the pattern level is not stored. */
  patternLevel: ReadingLevel | null;
  /**
   * ?phrases=emma|all: which tinted pictures the phrase wish uses. Without it every ok pair of the picture check plays,
   * Claude's too, minus the ones crossed on check.html on this device. emma: only the pairs Emma has checked (2.3.0's
   * rule). all: every ok pair whatever the device holds (the flows and dev). With fewer than 6 strong ones the gate
   * plays two dress-up word wishes.
   */
  phraseRule: PhraseRule;
  /** ?box=<seconds>: the music box plays this long at the start mirror and the Corner (the flows use 5). */
  boxMs: number | null;
  /** ?portrait=0: the customiser keeps her normal detail (to compare the frame rate on the iPad). */
  portrait: boolean;
  /** ?perf=1: the stats box. */
  perf: boolean;
  /** ?place=<hub place> (2.4.0), and ?quest= as its alias: that place starts as the hub opens, earned or not. */
  place: HubPlace | null;
  /** ?step=naming|wish|sign2|egg|home: a jump into that step of the place. */
  step: StartStep | null;
  /** ?babies=0..4: the play starts with this many named babies (the bedtime flow's doors). */
  babies: 0 | 1 | 2 | 3 | 4 | null;
  /** ?bed=<seconds>, over 0: bedtime comes this long after Play instead of at 30 minutes (the flows). */
  bedMs: number | null;
  /** ?sign=1|2|3: every signpost at this level, and the sign level is not stored. */
  signLevel: ReadingLevel | null;
  /** ?mount=bella|hazel: the mount a jump into a trip rides. */
  mount: MountId | null;
}

const oneOf = <T extends string>(xs: readonly T[], v: string | null): T | null => ((xs as readonly string[]).includes(v ?? '') ? (v as T) : null);

export function parseOptions(search: string, now = Date.now()): GameOptions {
  const p = new URLSearchParams(search);
  const place = oneOf(HUB_PLACES, p.get('place') ?? p.get('quest'));
  const babies = p.get('babies');
  const bed = Number(p.get('bed'));
  return {
    seed: Number(p.get('seed')) || now,
    at: p.get('at'),
    fresh: p.get('fresh') === '1',
    readingLevel: parseLevel(p.get('rl')),
    band: parseBand(p.get('maths')),
    contrast: p.get('contrast') !== '0',
    quest: oneOf(QUEST_IDS, place),
    patternLevel: parseLevel(p.get('pl')),
    phraseRule: parsePhraseRule(p.get('phrases')),
    boxMs: Number(p.get('box')) > 0 ? Math.round(Number(p.get('box')) * 1000) : null,
    portrait: p.get('portrait') !== '0',
    perf: p.get('perf') === '1',
    place,
    step: oneOf(START_STEPS, p.get('step')),
    babies: babies !== null && /^[0-4]$/.test(babies) ? (Number(babies) as 0 | 1 | 2 | 3 | 4) : null,
    bedMs: Number.isFinite(bed) && bed > 0 ? Math.round(bed * 1000) : null,
    signLevel: parseLevel(p.get('sign')),
    mount: oneOf(MOUNTS, p.get('mount')),
  };
}

/** 2.3.3's parts, which step 0 keeps (the hub lane replaces them with wardrobe, welcome, hub, bedtime, goodnight). */
const OLD_PARTS = ['wardrobe', 'welcome', 'egg1', 'naming1', 'wish1', 'pond', 'egg2', 'naming2', 'wish2', 'free', 'bedtime', 'goodnight'];

/** The egg part of a 2.3.3 play for an egg place and its step: egg1, naming1, wish1 (the nest) or the shore's. */
function eggPart(place: 'egg' | 'shore', step: StartStep | null): string {
  const n = place === 'egg' ? 1 : 2;
  return step === 'naming' ? `naming${n}` : step === 'wish' ? `wish${n}` : `egg${n}`;
}

/**
 * Where a play starts from ?at=, ?place= and ?step=, or null for a play from the start (the sweep, then the wardrobe;
 * a ?place= or ?quest= without ?at= only forces the maths quest, as in 2.3.3). Step 0 keeps 2.3.3's parts: ?at=hub and ?at=free give free play; ?place=egg gives egg1 (with ?step=naming naming1,
 * with wish wish1), shore egg2 (naming2, wish2), pond the pond, any other place free play with that place; an old part
 * name gives itself. `done` is empty. A place given by ?place= (or ?quest=) is forced: it starts as the hub opens, even
 * without an earned bubble. The hub lane gives the final rules (docs/v4/2.4-plan.md Task 6).
 */
export function resolveStart(o: Pick<GameOptions, 'at' | 'place' | 'step'>): StartAt | null {
  const { at, place, step } = o;
  if (at === 'hub' || at === 'free') {
    if (place === 'egg' || place === 'shore') return { part: eggPart(place, step), place, step, done: [] };
    if (place === 'pond') return { part: 'pond', place, step: null, done: [] };
    return { part: 'free', place, step: place ? step : null, done: [] };
  }
  if (!at || !OLD_PARTS.includes(at)) return null;
  // The old part names say which place and step they stand for.
  const egg = /^(egg|naming|wish)([12])$/.exec(at);
  if (egg) {
    const p: HubPlace = egg[2] === '1' ? 'egg' : 'shore';
    return { part: at, place: p, step: egg[1] === 'egg' ? null : (egg[1] as StartStep), done: [] };
  }
  if (at === 'pond') return { part: at, place: 'pond', step: null, done: [] };
  return { part: at, place: null, step: null, done: [] };
}
