// G/src/core/content/types.ts
// Content types for the learning workstream. The shared subset matches contracts section 4.
export type Strand = 'r' | 's' | 'm';
export type LearnStrand = Strand | 'name';
export type StepId = string;      // "R01", "R04D", "S10", "M09"
export type GpcId = string;       // "ai", "ow.oa", "a-e", "y.ee"
export type Phoneme = string;     // one of PHONEMES in gpc.ts
export type ItemId = string;      // "r:g:ai", "s:end:es", "m:miss:10-7", "name:<key>"

export type Release = '1.0' | '1.1' | '1.2' | '1.3' | 'later';
export const RELEASES: readonly Release[] = ['1.0', '1.1', '1.2', '1.3', 'later'];
/** True when something marked `r` is part of a build of release `build`. 'later' is never part of a build. */
export function releaseAtMost(r: Release, build: Release): boolean {
  return r !== 'later' && RELEASES.indexOf(r) <= RELEASES.indexOf(build);
}

export type FluencyType = 'grapheme' | 'tricky' | 'bond' | 'fact' | 'table';
export type ItemKind =
  | 'grapheme' | 'tricky' | 'ending' | 'pair' | 'cluster' | 'pattern' | 'suffix' | 'prefix'
  | 'mark' | 'capital' | 'and' | 'sentence' | 'adjective' | 'letter' | 'first-sound'
  | 'subitise' | 'numeral' | 'compare' | 'bond' | 'fact' | 'm-pattern';

/** Contracts C2 MomentKind, with `wall` (R22) and `station-wish` (R34). */
export type MomentKind =
  | 'wish' | 'bath-wish' | 'twin-wish' | 'one-or-many' | 'tricky-act' | 'basket-and' | 'basket-adj'
  | 'salon-card' | 'asking-bubble' | 'two-state-wish'
  | 'first-sound' | 'naming-bells' | 'naming-garden' | 'label' | 'label-plural' | 'sign' | 'note' | 'letter-order'
  | 'egg-moon' | 'egg-small-nest' | 'egg-two-stone' | 'egg-blanket' | 'egg-berry' | 'egg-snow'
  | 'door-visit' | 'roll-call-door' | 'trim' | 'beads' | 'post-pin' | 'post-sash' | 'parcel' | 'wall'
  | 'roll-call' | 'envelope'
  | 'station-wish';
export const MOMENT_KINDS: readonly MomentKind[] = [
  'wish', 'bath-wish', 'twin-wish', 'one-or-many', 'tricky-act', 'basket-and', 'basket-adj',
  'salon-card', 'asking-bubble', 'two-state-wish',
  'first-sound', 'naming-bells', 'naming-garden', 'label', 'label-plural', 'sign', 'note', 'letter-order',
  'egg-moon', 'egg-small-nest', 'egg-two-stone', 'egg-blanket', 'egg-berry', 'egg-snow',
  'door-visit', 'roll-call-door', 'trim', 'beads', 'post-pin', 'post-sash', 'parcel', 'wall',
  'roll-call', 'envelope',
  'station-wish',
];
export type EggKind = 'moon' | 'small-nest' | 'two-stone' | 'blanket' | 'berry' | 'snow';

export type MathsTask =
  | { op: 'subitise'; n: number }
  | { op: 'numeral'; n: number }
  | { op: 'compare'; want: 'fewest' | 'most' }
  | { op: 'more'; n: number }                       // one more than n
  | { op: 'less'; n: number }                       // one less than n
  | { op: 'missing'; whole: number; part: number }  // part is shown, she places whole - part
  | { op: 'pair'; a: number; b: number }            // a + b = 10, a <= b
  | { op: 'add'; a: number; b: number }             // a >= b, she counts on from a
  | { op: 'take'; a: number; b: number }            // a - b
  | { op: 'pattern'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB' };

export type RawGpc = {
  id: GpcId;
  text: string;          // letters on the gem; a split digraph is "a-e"
  phonemes: Phoneme[];
  vowel: boolean;        // pink gem
  sound: string | null;  // key in shared/audio/phonics/index.json "sounds", or null
  fluency: boolean;      // Phase 2 and 3 graphemes are fluency items
  split?: boolean;       // split digraph a-e, i-e, o-e, u-e, e-e
};

export type RawItem = {
  id: ItemId;
  kind: ItemKind;
  fluency?: FluencyType;
  gpc?: GpcId;                       // grapheme and first-sound items
  pair?: string;                     // pair items: id in pairs.json
  cluster?: string;                  // "-st", "fr-"
  ending?: 's' | 'es' | 'none';      // ending items
  affix?: 'ing' | 'ed' | 'est' | 'er' | 'un';
  pattern?: string;                  // pattern, mark, capital, sentence, adjective and letter items
  word?: string;                     // tricky items
  task?: MathsTask;                  // maths items
};

export type RawStep = {
  id: StepId;
  title: string;
  release: Release;                  // the earliest release of its moments, or 'later'
  levels: 1 | 2 | 3;                 // scaffold levels it declares; top = levels
  moments: MomentKind[];
  face: string[];                    // what its jewel shows: gem texts, marks or numbers
  school?: boolean;
  contrast?: boolean;
  display?: boolean;                 // shown, never checked; never the current step
  items: RawItem[];
};
export type RawLadder = { strand: Strand; steps: RawStep[] };

export type WordKind = 'thing' | 'station' | 'adjective' | 'other';
/** Word tags used across streams: bath (Bath Pond), found (toy shelf), toy, food, clothes, care, salon. */
export type WordTag = 'bath' | 'found' | 'toy' | 'food' | 'clothes' | 'care' | 'salon';
export type WordPackName = 'words-phase2' | 'words-phase3-4' | 'words-year1';
export type RawWord = {
  w: string;                         // lowercase, as printed
  gpcs: GpcId[];
  pic: string | null;                // the bare word ("hat"), or null when the word is never pictured (R13)
  kind: WordKind;
  prompt?: string;                   // subject for the art prompt, "a toy fox"
  tags?: WordTag[];
  syllables?: number;                // default 1
  compound?: boolean;
  affix?: 'ing' | 'ed' | 'est' | 'er' | 'un';
  plural?: { w: string; ending: 's' | 'es' };
  irregular?: { w: string };         // mouse -> mice, read only
  /** R36: indexes into `gpcs` of the heart-part graphemes of a tricky word ('the': [1]). */
  heart?: number[];
};
export type RawWordPack = { pack: WordPackName; words: RawWord[] };

export type NameSource = 'uk' | 'cyprus' | 'fantasy' | 'nature' | 'decodable' | 'v2';
export type RawName = {
  name: string;                      // "Bella", capital first
  gpcs: GpcId[];
  source: NameSource;
  priority: 1 | 2 | 3;               // 1 is generated first
  pic?: 'flowers' | 'gems' | 'sky' | 'sweets';
  respell?: string;                  // what the generator sends instead of the name, when Elizabeth mispronounces it
};
export type RawNameBank = { tier: 1; names: RawName[] };

export type PairKind = 'vowel' | 'voicing' | 'consonant' | 'letter-value' | 'magic-e' | 'number';
export type RawPair = {
  id: string;
  gpcs: GpcId[];
  position: 'any' | 'initial' | 'final';
  kind: PairKind;
  unlock: Partial<Record<Strand, StepId>>;   // the step whose pass allows the pair as a distractor
};
export type RawTwin = { pair: string; a: string; b: string; model?: { a: string; b: string } };
export type RawPairs = { pairs: RawPair[]; twins: RawTwin[] };

export type RawMoment = { id: MomentKind; strand: LearnStrand; release: Release; needs: ('pic' | 'clip')[]; egg?: EggKind };
export type RawMoments = { moments: RawMoment[] };

export type PhraseAct =
  | { kind: 'give'; target: string[]; options: string[] }   // picture ids
  | { kind: 'choose-speaker'; speakers: { text: string; mark: 'stop' | 'q' | 'bang' }[]; answer: number }
  | { kind: 'toggle'; thing: string; to: 'on' | 'off' }
  | { kind: 'push-pull'; to: 'push' | 'pull' }
  | { kind: 'his-her'; to: 'he' | 'she'; thing: string }
  | { kind: 'gate'; to: 'go' | 'no' }
  | { kind: 'put'; thing: string; where: 'on' | 'in' }
  | { kind: 'note'; cards: string[]; mark: 'stop' | 'q' | 'bang'; spell: number; answer: string | null }
  | { kind: 'beads'; unit: 'AB' | 'ABB' | 'ABC' | 'AAB'; colours: string[] };
export type PhrasePackName = 'phrases-notes' | 'phrases-salon' | 'phrases-meadow';
export type RawPhrase = {
  id: string;                        // kebab-case, unique across packs
  moment: MomentKind;
  text: string;                      // British English, as printed
  items: ItemId[];
  words: string[];                   // word ids whose pictures the act needs
  act: PhraseAct;
  clip: boolean;                     // Elizabeth reads it: line "phrase-<id>"
};
export type RawPhrasePack = { pack: PhrasePackName; phrases: RawPhrase[] };

export type ProfileStart = { lo: StepId; probe: StepId | null; floor: StepId };
export type Profile = { r: ProfileStart; s: ProfileStart; m: ProfileStart; school: StepId[] };
export type Budget = {
  share: { current: number; review: number; mixed: number };
  oneShare: number;
  newPerStrandPerDay: number;
  strandVisitCap: number;
  visitCap: number;
  tiredEggMinBox: number;
  spellShareMin: number;
  spellShareAfter: number;
  box0Gap: number;
  box1MinHours: number;
  boxDays: [number, number, number, number];
  retiredDays: number;
  fluencyWindow: number;
  fluencyCeilingMs: number;
  fluencyRecomputeDays: number;
  fluencyMinSamples: number;
  scaffoldUp: number;
  scaffoldDown: number;
  passWindow: number;
  passFirst: number;
  passDays: number;
  reopenWindow: number;
  reopenMinFirst: number;
  closeWindow: number;
  closeFirst: number;
  reopenWeight: number;
  placement: { maxItems: number; maxVisits: number; itemsPerProbe: number; visit1MaxJump: number };
  defaultProfile: string;
  profiles: Record<string, Profile>;
  doorRanges: { step: StepId; max: number }[];
  visitSecureEvery: number;
  recentCarriers: number;
};

export type RawContent = {
  release: Release;
  gpcs: RawGpc[];
  ladders: RawLadder[];
  words: RawWordPack[];
  names: RawNameBank;
  pairs: RawPairs;
  moments: RawMoments;
  budget: Budget;
  phrases: RawPhrasePack[];
};

export type Step = RawStep & { strand: Strand; index: number; loaded: boolean; top: 1 | 2 | 3 };
/** carriers: for reading items, how many carriers this build has that can serve the item at its own step
 *  (null for spelling, maths and name items, which are always servable). An item with 0 never blocks a pass. */
export type Item = RawItem & { strand: Strand; step: StepId; carriers: number | null };
export type Word = RawWord & {
  pack: WordPackName;
  clip: string;                      // "word-<w>"
  pluralClip: string | null;         // "word-<plural>"
  rItems: ItemId[];
  sItems: ItemId[];
  rStep: StepId | null;              // highest reading step among rItems; null when a GPC has no reading item
  sStep: StepId | null;
};
export type NameEntry = RawName & { slug: string; phonemes: Phoneme[]; first: Phoneme };
export type Moment = RawMoment & { loaded: boolean };
export type Phrase = RawPhrase & { pack: PhrasePackName; clipId: string | null; loaded: boolean };
export type Content = {
  release: Release;
  budget: Budget;
  gpcs: Record<GpcId, RawGpc>;
  steps: Record<StepId, Step>;
  order: Record<Strand, StepId[]>;   // every step in ladder order
  loaded: Record<Strand, StepId[]>;  // steps with loaded === true, in order
  items: Record<ItemId, Item>;
  words: Record<string, Word>;
  wordsByItem: Record<ItemId, string[]>;
  names: NameEntry[];
  pairs: Record<string, RawPair>;
  twins: Record<string, RawTwin[]>;
  moments: Record<string, Moment>;
  phrases: Record<string, Phrase>;
  phrasesByItem: Record<ItemId, string[]>;
};
