// The signposts on the trail (2.4.0, docs/v4/2.4.md section 5.5): thirteen place words in four first-sound groups, a
// trip's two sign sets at her sign level, and their clips. Every word has a v3 picture and an ok Elizabeth clip in a
// pack v4 already loads; the goal lines ("Bella wants to go to the pond.") are the demo's own (tools/lines.ts signLine).
// The signs-star lane fills the planner and the kit from v3's packs (docs/v4/2.4-plan.md Tasks 12 and 13); step 0's
// stub plans one fixed trip, so the ride plays through without it.
import type { MountId, SignGroup, SignItem, SignSpec, SignWord } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import type { Rand } from './rand.ts';

/** The 13 sign words by first-sound group, in this order: s, sh, b, p. */
export const SIGN_WORDS: readonly { word: SignWord; group: SignGroup }[] = [
  { word: 'sand', group: 's' }, { word: 'stump', group: 's' }, { word: 'swing', group: 's' }, { word: 'stone', group: 's' },
  { word: 'shed', group: 'sh' }, { word: 'ship', group: 'sh' }, { word: 'shell', group: 'sh' },
  { word: 'barn', group: 'b' }, { word: 'bench', group: 'b' }, { word: 'beach', group: 'b' },
  { word: 'pond', group: 'p' }, { word: 'pool', group: 'p' }, { word: 'pines', group: 'p' },
];

/** The goal line of a word for the mount she rides: "Bella wants to go to the pond." (g4-go-bella-pond). */
export function goalClip(m: MountId, w: SignWord): string {
  return `g4-go-${m}-${w}`;
}

/** Every clip the signposts can say: each word's v3 clip and both mounts' goal lines. */
export function allSignClipIds(): string[] {
  return SIGN_WORDS.flatMap(({ word }) => [`word-${word}`, goalClip('bella', word), goalClip('hazel', word)]);
}

/** Every letter sound a sign's focused hint can play (step 0: none; the kit's graphemes come with Task 12). */
export function allSignGraphemes(): string[] {
  return [];
}

/** What this play's trips have used: the sets (their words sorted and joined) and the targets. */
export interface SignUse {
  sets: string[];
  targets: SignWord[];
}

/** A trip's two signs, planned at saddle-up from the stream sign-<trip>. */
export interface TripPlan {
  trip: 1 | 2;
  /** The level the trip plays and logs at (a level 3 trip without two sets that share no word plays at 2). */
  level: 1 | 2 | 3;
  signs: [SignSpec, SignSpec];
}

/** The tier of each word's v3 pack (1 phase 2, 2 phases 3 and 4, 3 Year 1). */
const TIER: Record<SignWord, 1 | 2 | 3> = {
  sand: 2, stump: 2, swing: 1, stone: 3, shed: 1, ship: 1, shell: 2, barn: 2, bench: 2, beach: 3, pond: 2, pool: 2, pines: 3,
};

/** A sign word as a card: its print, its picture and its clip (step 0: no graphemes yet). */
function item(word: SignWord): SignItem {
  const group = SIGN_WORDS.find((w) => w.word === word)!.group;
  return { word, gpcs: [], clip: `word-${word}`, pic: wordPic(word === 'pines' ? 'pine' : word), tier: TIER[word], group };
}

function sign(n: 1 | 2, level: 1 | 2 | 3, mount: MountId, words: [SignWord, SignWord, SignWord], target: SignWord): SignSpec {
  const t = item(target);
  return {
    sign: n,
    level,
    cards: words.map(item) as [SignItem, SignItem, SignItem],
    target: t,
    clips: { intro: n === 1 ? ['g4-signs'] : [], goal: [goalClip(mount, target)], right: [t.clip, 'fb-yes'], hint: ['h-sounds'], again: ['fb-letters'] },
  };
}

/**
 * A trip's two sign sets at her level, from the trip's own stream. Step 0's stub: sign 1 sand, barn, pond (the target
 * sand) and sign 2 shed, bench, pool (the target bench), whatever the level and what the play has used.
 */
export function planTrip(_rand: Rand, o: { level: 1 | 2 | 3; mount: MountId; trip: 1 | 2; used: SignUse }): TripPlan {
  return {
    trip: o.trip,
    level: o.level,
    signs: [sign(1, o.level, o.mount, ['sand', 'barn', 'pond'], 'sand'), sign(2, o.level, o.mount, ['shed', 'bench', 'pool'], 'bench')],
  };
}
