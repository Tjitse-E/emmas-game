// Test helpers for the place logic. Task A1 adds the event helpers (ev, foldAll, baby, learner).
import { mulberry32 } from '../../src/core/rng.ts';
import type { Rng, ServedItem, StepId, WordView } from '../../src/core/places/types.ts';

export function rng(seed = 1): Rng {
  return mulberry32(seed);
}

export function word(id: string, graphemes: string[], extra: Partial<WordView> = {}): WordView {
  return { id, word: id, graphemes, picture: id, rStep: 'R05', sStep: 'S04', tags: [], ...extra };
}

export function served(strand: 'r' | 's' | 'm', step: StepId, carrier: string, items: string[], extra: Partial<ServedItem> = {}): ServedItem {
  return { strand, step, carrier, items, scaffold: 1, probe: false, kind: 'current', ...extra };
}
