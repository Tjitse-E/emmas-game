// The wishes (docs/v4/demo.md parts 5 and 10) and the free-play food basket (part 11). Every word obeys spec 4.3
// (one syllable, at most five letters, pictured, with an Elizabeth clip); tools/build-content.ts checks that.
import type { WishDecoy, WishItem, WishSpec } from '../contracts.ts';
import { wordPic } from '../assets.ts';
import { DATA, type WordData } from './data.ts';
import { type Rand, pick, shuffle } from './rand.ts';

/** The kinds the demo's words cover. The reading lane adds 'picnic' and 'dress' (contracts: WishSpec['kind']). */
export type WishKind = Extract<WishSpec['kind'], 'food' | 'bath'>;

export const WISH_CLIPS: Record<WishKind, WishSpec['clips']> = {
  food: { intro: ['g-wish', 'g-hungry'], goal: ['g-hungry'], right: ['fb-yes'], hint: ['h-sounds'] },
  bath: { intro: ['g-wish', 'g4-give'], goal: ['g4-give'], right: ['fb-yes'], hint: ['h-sounds'] },
};

const BASKET_SIZE = 3;

// data.json has no tiers yet (the reading lane adds them), so every word counts as tier 1 for now.
function item(w: WordData): WishItem {
  return { word: w.word, gpcs: w.gpcs, pic: wordPic(w.pic), clip: w.clip, tier: 1 };
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
  const decoys: Record<string, WishDecoy> = {};
  const fits = (w: WordData) => !chosen.some((c) => c.word === w.word || c.group === w.group);
  const sameStart = others.filter((w) => w.gpcs[0] === target.gpcs[0]);
  for (const w of shuffle(rand, sameStart)) {
    if (fits(w)) {
      chosen.push(w);
      decoys[w.word] = 'onset';
      break;
    }
  }
  for (const w of shuffle(rand, others)) {
    if (chosen.length >= BASKET_SIZE) break;
    if (fits(w)) {
      chosen.push(w);
      decoys[w.word] = 'other';
    }
  }
  // The demo's basket of three is easier than any 2.2.0 level; it logs as level 1.
  const basket = shuffle(rand, chosen).map(item);
  return { kind, target: item(target), basket, level: 1, decoys, clips: WISH_CLIPS[kind] };
}

const KINDS = Object.keys(WISH_CLIPS) as WishKind[];

/** Every clip a wish can say: each kind's lines and every word of its pool. */
export function allWishClipIds(): string[] {
  return KINDS.flatMap((k) => [...wishWords(k).map((w) => w.clip), ...Object.values(WISH_CLIPS[k]).flat()]);
}

/** Every letter sound a wish word can play. */
export function allWishGraphemes(): string[] {
  return KINDS.flatMap((k) => wishWords(k).flatMap((w) => w.gpcs));
}

/** The four foods of the free-play basket. Tapping one says its clip; dropping it on a unicorn feeds it. */
export function foods(): WishItem[] {
  return DATA.freeFoods.map((word) => item(DATA.food.find((w) => w.word === word)!));
}
