// The checked content from tools/build-content.ts. Rebuild it with `node tools/build-content.ts`; never edit data.json.
import type { SignGroup, SignItem, SignWord } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import raw from './data.json' with { type: 'json' };

export interface NameData {
  name: string;
  clip: string;
}
export interface BellData extends NameData {
  gpcs: string[];
}
export interface WordData {
  word: string;
  gpcs: string[];
  /** Picture name in v3's art/words/ (made into a URL with wordPic() at call time). */
  pic: string;
  /** A greyscale picture's colour (v3's tint.default, multiplied over it), as v3 shows it. */
  tint?: string;
  clip: string;
  /** Grapheme tier of v3's word pack: 1 phase2, 2 phase3-4, 3 year1. */
  tier: number;
  /** Words whose pictures look like this one: they never share a basket. */
  alike?: string[];
  /** v3's twins of this word (content/pairs.json), such as seal and sail. */
  twins?: string[];
}

/** One wish kind's words. Every list holds words of `pool`; the targets passed the picture check and are strong. */
export interface KindData {
  pool: string[];
  /** Strong words with an 'ok' picture: the only words a wish asks for (2.2.md 3.1). */
  targets: string[];
  /** Reading level 1 targets: grapheme tier 1 or 2. */
  level1: string[];
  /** Reading level 3 targets: with a twin or a frame word in the pool. */
  level3: string[];
}

/**
 * A printed word of the phrase wish (2.3 section 18): its written graphemes, its grapheme tier, and, when they differ
 * from the graphemes, the letter sounds the hint plays (the o of gold and the ow of bow say oa).
 */
export interface PhraseWordData {
  word: string;
  gpcs: string[];
  sounds?: string[];
  tier: number;
}
export interface PhraseColourData extends PhraseWordData {
  /** Green, gold, blue and brown can be the wish; red and pink are only wrong pictures. */
  target: boolean;
}
export interface PhraseThingData extends PhraseWordData {
  /** Picture name in v3's art/words/ (a greyscale picture, tinted in the phrase's colour). */
  pic: string;
  clip: string;
  /** Things whose pictures look like this one: they never share a basket. */
  alike?: string[];
}

export interface ContentData {
  herd: NameData[];
  bells: BellData[];
  /** Every word any wish kind uses, once. */
  words: WordData[];
  kinds: { dress: KindData; bath: KindData; picnic: KindData };
  /** The picnic words a baby munches; the other picnic words are dishes and things it plays with. */
  foods: string[];
  freeFoods: string[];
  /** "the": printed in every phrase, never sounded out, never deciding an answer. */
  phraseThe: { word: string; gpcs: string[]; clip: string };
  phraseColours: PhraseColourData[];
  phraseThings: PhraseThingData[];
  /** Every pair ("green sock") that passed the tinted picture check, and who checked it: 'claude' or 'emma'. */
  phrasePairs: Record<string, string>;
  /**
   * The signposts' place words (2.4.0, docs/v4/2.4.md section 5.5) that passed their own picture check (`sign:<word>`),
   * in the order s, sh, b, p. `pic` is the picture's URL; pines has v3's pine picture and ends in the letter sound z.
   */
  signWords: SignItem[];
}

export const DATA: ContentData = {
  ...raw,
  signWords: raw.signWords.map((w) => ({
    ...w, word: w.word as SignWord, group: w.group as SignGroup, tier: w.tier as 1 | 2 | 3, pic: wordPic(w.pic),
  })),
};
