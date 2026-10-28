// The content lane (contracts.ts): names, words, egg numbers and clip ids for each moment of the level in
// docs/v4/demo.md. Pure functions; randomness only through a passed `rand` (use seeded() for a repeatable level).
// The data comes from src/content/data.json, built and checked against v3 by tools/build-content.ts.
import type { HerdMember } from '../contracts.ts';
import { DATA } from './data.ts';
import { HERD_LOOKS } from './looks.ts';

export { type Rand, seeded, stream } from './rand.ts';
export { babyLook } from './looks.ts';
export { eggSpec, eggClipIds, eggCombos, nextBand, totalOf, type Band, type MathsUsed, type MathsPick } from './eggs.ts';
export { rackSpec, allRackClipIds } from './rack.ts';
export { namingSpec } from './naming.ts';
export { wishSpec, foods, wishTargets, planBasket, reactOf, BASKET_SIZE, type WishOpts, type WordKind } from './wishes.ts';
export { phraseSpec, allPhraseClipIds } from './phrases.ts';
export { patternSpec, allPatternClipIds, type PatternLevel } from './patterns.ts';
export { moveIn, doorVisit, rollCall, newborn, NEWBORN_DOORS, type DoorAsk } from './doors.ts';
export { CLIPS, wayTo, allClipIds, allGraphemes, namingClipIds, wishClipIds, doorClipIds } from './clips.ts';

/** The starting herd of 12 in doors 1 to 12: 8 babies and 4 foals of all four breeds, each with its name clip. */
export function herd(): HerdMember[] {
  return DATA.herd.map((h, i) => {
    const look = HERD_LOOKS.find((l) => l.name === h.name)?.look;
    if (!look) throw new Error(`herd: no look for ${h.name}`);
    return { id: h.name.toLowerCase(), name: h.name, clip: h.clip, door: i + 1, look: { ...look } };
  });
}
