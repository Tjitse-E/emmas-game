// The breed of an egg step: the egg of the step's first egg moment (learning's moments), else heartbeat's map.
import type { Content } from '../content/types.ts';
import { BREED_OF } from '../heartbeat/hatch.ts';
import { eggKindFor } from '../maths/eggs.ts';
import type { BreedId } from '../heartbeat/types.ts';

export function breedForStep(c: Pick<Content, 'steps' | 'moments'> | null, step: string | null): BreedId {
  if (!step) return 'moon';
  for (const m of c?.steps[step]?.moments ?? []) {
    const k = c?.moments[m]?.egg;
    if (k) return BREED_OF[k];
  }
  const k = eggKindFor(step);
  return k ? BREED_OF[k] : 'moon';
}
