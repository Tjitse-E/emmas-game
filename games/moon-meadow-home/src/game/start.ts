// Chooses the first scene of a visit. Task I-2 (batch A6) replaces this with the start rule
// (Moving Day, a new player's welcome, or the meadow). Until then every visit starts at the nest.
import type { StartTarget } from '../platform/boot.svelte.ts';

export async function chooseStart(_game: unknown): Promise<StartTarget> {
  return { id: 'nest' };
}
