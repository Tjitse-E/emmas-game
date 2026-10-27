// The checked content from tools/build-content.ts. Rebuild it with `node tools/build-content.ts`; never edit data.json.
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

export interface ContentData {
  herd: NameData[];
  bells: BellData[];
  /** Every word any wish kind uses, once. */
  words: WordData[];
  kinds: { dress: KindData; bath: KindData; picnic: KindData };
  /** The picnic words a baby munches; the other picnic words are dishes and things it plays with. */
  foods: string[];
  freeFoods: string[];
}

export const DATA: ContentData = raw;
