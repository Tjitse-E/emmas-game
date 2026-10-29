// The hay rack (docs/v4/2.2.md section 4.3): a third maths moment at the rack by the stable, the side quest "hungry
// herd". It is a 'warm' EggSpec with skin 'hay': one missing-part sum within 10 (eggs.ts RANGES: need 7 to 9 in band
// A, 8 to 10 in band B), the eggs' bands and stone rules, and never a fact the play already asked (freshCombos), told
// with v3's hay rack lines ("The hay rack needs nine bundles. Five bundles are in. Drag the hay that fills it up.").
// Every clip is v3's and checked ok; no new audio.
import type { EggSpec } from '../contracts.ts';
import { type EggCombo, type MathsPick, MISS_MAX, addClip, clampK, count, eggSpec, everySumClipIds } from './eggs.ts';
import type { Rand } from './rand.ts';

/** The rack's clips for one sum. */
function rackClips(c: EggCombo): EggSpec['clips'] {
  return {
    // The goal says everything, so there is no intro.
    intro: [],
    goal: [`num-rack-${c.need}`, `num-in-${c.have}`, 'g-hay-rack'],
    // "The hay rack is full!" "Eight and five make thirteen!"
    right: ['fb-rack-full', addClip(c.have, c.answer)],
    // "Too many!" "Two too many." The extra bundles tumble off and a foal munches them.
    tooBig: (k) => ['fb-too-many', `num-over-${clampK(k, MISS_MAX.over)}`],
    // "Two more, please!" The empty places wiggle.
    tooSmall: (k) => [`num-more-${clampK(k, MISS_MAX.more)}`],
    // "Let's count the empty spaces." The board lifts and the ui counts the gaps.
    hint: ['h-count-gaps'],
    count: count(c.answer),
  };
}

/**
 * The hay rack's numbers, stones and clips, from its own stream (g.randFor('rack')). Pass the band and the play's
 * used totals and answers as for the eggs; the result moves the band like an egg (part 'rack', strand 'm').
 */
export function rackSpec(rand: Rand, o: MathsPick = {}): EggSpec {
  const spec = eggSpec('warm', rand, o);
  return { ...spec, skin: 'hay', clips: rackClips(spec) };
}

/** Every clip the hay rack can say, in both bands, with every reachable miss line. */
export function allRackClipIds(): string[] {
  return everySumClipIds('warm', (c) => rackClips(c));
}
