// Hatch rolls: the breed of an egg, the baby's colours and its traits.
// Colours come from art's palette (art Review Focus 3), so every colour stays light enough for the tinted layers.
import type { Rng } from '../rng.ts';
import { BREED_OF } from '../../types/contracts.ts';
import type { EggKind } from '../maths/eggs.ts';
import type { BreedId, Colours, Result, Traits } from './types.ts';
import { BODY_COLOURS, GOLDEN_BODY, MANE_COLOURS, randomColours } from '../../art/palette.ts';

export { BREED_OF, GOLDEN_BODY };
/** Art's body and mane palettes. Heartbeat keeps no palette of its own. */
export const BODY = BODY_COLOURS;
export const MANE = MANE_COLOURS;

export type HatchRoll = { breed: BreedId; colours: Colours; traits: Traits };

export function rollHatch(input: { kind: EggKind; result: Result; golden: boolean; speckled: boolean; rng: Rng }): HatchRoll {
  const { rng } = input;
  const colours = randomColours(rng);
  if (input.golden) colours.body = GOLDEN_BODY;
  const roll = rng(); // always drawn, so a seed gives the same colours for every result
  const traits: Traits = {
    shiny: input.result === 'first' && roll < 1 / 3,
    speckled: input.speckled,
    golden: input.golden,
    founder: false,
  };
  return { breed: BREED_OF[input.kind], colours, traits };
}
