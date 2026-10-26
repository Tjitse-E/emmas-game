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
  /** Look-alike group: two words with the same group never share a basket. */
  group: string;
}

export interface ContentData {
  herd: NameData[];
  bells: BellData[];
  food: WordData[];
  bath: WordData[];
  freeFoods: string[];
}

export const DATA: ContentData = raw;
