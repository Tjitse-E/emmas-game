// The two eggs of the demo (docs/v4/demo.md parts 2 and 8) within the v4 maths floor (spec 4.4): nothing adds or
// takes away 1 or 2, no egg needs fewer than 7 cups, and no stone shows 1 or 2. Both eggs always cross ten: the warm
// egg makes ten and some more (M21), the snow egg takes away across ten (M22).
import type { EggSpec } from '../contracts.ts';
import { type Rand, pick } from './rand.ts';

export type EggKind = EggSpec['kind'];

/** warm (adding across ten): need 11 to 15, have 6 to 9, at least 4 to add. */
export const WARM = { need: [11, 15], have: [6, 9], minAnswer: 4 } as const;
/** snow (taking away across ten): have 11 to 15, take away 4 to 6, need 7 to 9. */
export const SNOW = { have: [11, 15], answer: [4, 6], need: [7, 9] } as const;
/** The stones she can be shown: 3 to 9 (a 1 or a 2 would be adding or taking away 1 or 2). */
export const STONES = { min: 3, max: 9 } as const;

export interface EggCombo {
  need: number;
  have: number;
  answer: number;
}

/** Every egg the demo can ask, for picking, preloading, the audio lines and the tests. */
export function eggCombos(kind: EggKind): EggCombo[] {
  const out: EggCombo[] = [];
  if (kind === 'warm') {
    for (let need = WARM.need[0]; need <= WARM.need[1]; need++) {
      for (let have = WARM.have[0]; have <= WARM.have[1]; have++) {
        const answer = need - have;
        if (answer >= WARM.minAnswer && answer <= STONES.max) out.push({ need, have, answer });
      }
    }
  } else {
    for (let have = SNOW.have[0]; have <= SNOW.have[1]; have++) {
      for (let answer = SNOW.answer[0]; answer <= SNOW.answer[1]; answer++) {
        const need = have - answer;
        if (need >= SNOW.need[0] && need <= SNOW.need[1]) out.push({ need, have, answer });
      }
    }
  }
  return out;
}

/**
 * The fact after the right stone. v3's bond clips ("Eight and five make thirteen!") cover two parts of 1 to 9, which
 * is every warm egg now (have 6 to 9); ten and some more would be the demo's own num-add clip.
 */
export function addClip(have: number, answer: number): string {
  return have <= 9 ? `num-bond-${have}-${answer}` : `num-add-${have}-${answer}`;
}

export function takeClip(have: number, answer: number): string {
  return `num-take-${have}-${answer}`;
}

/** The highest k each miss line exists for: num-over and num-cold 1 to 9, num-still-warm 1 to 6. */
const OVER_MAX = 9;
const COLD_MAX = 9;
const STILL_WARM_MAX = 6;
const clampK = (k: number, max: number): number => Math.max(1, Math.min(max, Math.round(Math.abs(k))));

/**
 * Three stones: the answer and two near misses (1 or 2 away), ascending. The answer's place among the three is
 * drawn evenly from the places that fit in 3 to 9, so the middle stone is not always right.
 */
export function stonesFor(answer: number, rand: Rand): number[] {
  const inRange = (xs: number[]) => xs.every((x) => x >= STONES.min && x <= STONES.max);
  const lows = [[-2, -1]];
  const mids = [[-1, 1], [-1, 2], [-2, 1], [-2, 2]];
  const highs = [[1, 2]];
  const places = [lows, mids, highs]
    .map((offsets) => offsets.map((o) => o.map((d) => answer + d)).filter(inRange))
    .filter((options) => options.length > 0);
  const misses = pick(rand, pick(rand, places));
  return [answer, ...misses].sort((a, b) => a - b);
}

function count(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `num-${i + 1}`);
}

/**
 * The egg's numbers and clips. `first` adds the intro for the first egg of its kind (and, for the warm egg, the
 * spoken gesture after the goal); `avoidNeed` keeps two eggs in a row from asking the same total.
 */
export function eggSpec(kind: EggKind, rand: Rand, o: { first?: boolean; avoidNeed?: number } = {}): EggSpec {
  const all = eggCombos(kind);
  const fresh = all.filter((c) => c.need !== o.avoidNeed);
  const { need, have, answer } = pick(rand, fresh.length ? fresh : all);
  const stones = stonesFor(answer, rand);
  if (kind === 'warm') {
    return {
      kind, need, have, answer, stones,
      clips: {
        intro: o.first ? ['g-egg'] : [],
        goal: [`num-egg-${need}`, `num-warm-${have}`],
        // "Drag one stone to the nest." once, after the very first goal: Emma cannot read how the stones work.
        ...(o.first ? { afterGoal: ['g-stone'] } : {}),
        right: ['fb-warm', addClip(have, answer)],
        tooBig: (k) => ['fb-hot', `num-over-${clampK(k, OVER_MAX)}`],
        tooSmall: (k) => ['fb-brr', `num-cold-${clampK(k, COLD_MAX)}`],
        // The cold cups hide under a blanket: "Let's peek under the blanket.", then the ui counts them.
        hint: ['h-peek'],
        count: count(answer),
      },
    };
  }
  return {
    kind, need, have, answer, stones,
    clips: {
      intro: o.first ? ['g4-snow-egg'] : [],
      goal: [`num-egg-${need}`, `num-toowarm-${have}`, 'g4-snow'],
      right: ['fb4-just-right', takeClip(have, answer)],
      // The snow stone cooled too many cups, so the egg shivers; too few, and it is still too hot.
      tooBig: (k) => ['fb-brr', `num-over-${clampK(k, OVER_MAX)}`],
      tooSmall: (k) => ['fb-hot', `num-still-warm-${clampK(k, STILL_WARM_MAX)}`],
      hint: ['h4-count-extra'],
      count: count(answer),
    },
  };
}

/** Every clip an egg spec can say, with the miss lines of its wrong stones. */
export function eggClipIds(spec: EggSpec): string[] {
  const c = spec.clips;
  const misses = spec.stones
    .filter((s) => s !== spec.answer)
    .flatMap((s) => (s > spec.answer ? c.tooBig(s - spec.answer) : c.tooSmall(spec.answer - s)));
  return [...c.intro, ...c.goal, ...(c.afterGoal ?? []), ...c.right, ...misses, ...c.hint, ...c.count];
}
