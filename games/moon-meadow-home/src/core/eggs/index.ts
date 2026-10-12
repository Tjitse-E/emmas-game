// Heartbeat exports for places (contracts C7): the breed of her current egg, for the herd circle of a row
// Building Day (spec 2.4).
import type { Content } from '../content/types.ts';
import type { Learner } from '../learning/types.ts';
import { currentStep } from '../learning/status.ts';
import type { BreedId } from '../heartbeat/types.ts';
import { breedForStep } from './breed.ts';

export { breedForStep };
export { BREEDS } from '../heartbeat/hatch.ts';

export function currentEggBreed(_state: unknown, l: Learner, c: Content): BreedId {
  return breedForStep(c, currentStep(l, c, 'm'));
}
