// The wishes (docs/v4/demo.md parts 5 and 10) and the free-play food basket (part 11). Every word obeys spec 4.3
// (one syllable, at most five letters, pictured, with an Elizabeth clip); tools/build-content.ts checks that.
import type { WishItem, WishSpec } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import { DATA, type WordData } from './data.ts';
import { type Rand, pick, shuffle } from './rand.ts';

export type WishKind = WishSpec['kind'];

export const WISH_CLIPS: Record<WishKind, WishSpec['clips']> = {
  food: { intro: ['g-wish', 'g-hungry'], goal: ['g-hungry'], right: ['fb-yes'], hint: ['h-sounds'] },
  bath: { intro: ['g-wish', 'g4-give'], goal: ['g4-give'], right: ['fb-yes'], hint: ['h-sounds'] },
};

const BASKET_SIZE = 3;

function item(w: WordData): WishItem {
  return { word: w.word, gpcs: w.gpcs, pic: wordPic(w.pic), clip: w.clip };
}

export function wishWords(kind: WishKind): WordData[] {
  return kind === 'food' ? DATA.food : DATA.bath;
}

/**
 * A wish and its basket of three. As v2's pantry, the basket tries a thing that starts with the same sound first,
 * so she reads past the first letter, then any other. Never two look-alikes. `exclude` keeps words of an earlier
 * wish out of the target and, while enough words are left, out of the basket.
 */
export function wishSpec(kind: WishKind, rand: Rand, exclude: string[] = []): WishSpec {
  const words = wishWords(kind);
  const fresh = words.filter((w) => !exclude.includes(w.word));
  const target = pick(rand, fresh.length ? fresh : words);
  const others = fresh.length >= BASKET_SIZE ? fresh : words;
  const chosen: WordData[] = [target];
  const fits = (w: WordData) => !chosen.some((c) => c.word === w.word || c.group === w.group);
  const sameStart = others.filter((w) => w.gpcs[0] === target.gpcs[0]);
  for (const w of shuffle(rand, sameStart)) {
    if (fits(w)) {
      chosen.push(w);
      break;
    }
  }
  for (const w of shuffle(rand, others)) {
    if (chosen.length >= BASKET_SIZE) break;
    if (fits(w)) chosen.push(w);
  }
  return { kind, target: item(target), basket: shuffle(rand, chosen).map(item), clips: WISH_CLIPS[kind] };
}

/** The four foods of the free-play basket. Tapping one says its clip; dropping it on a unicorn feeds it. */
export function foods(): WishItem[] {
  return DATA.freeFoods.map((word) => item(DATA.food.find((w) => w.word === word)!));
}
