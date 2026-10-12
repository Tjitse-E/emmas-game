import { makeRng } from '../rng.ts';

export const MAX_PATCHES = 60;
export type FlowerPatch = { x: number; y: number; density: 1 | 2 | 3; hue: number };

// Spec 2.7: one flower per hatch; above 60 new flowers join existing patches as denser sprites.
export function moonflowerLayout(count: number, seed: number): FlowerPatch[] {
  const rng = makeRng(seed);
  const patches = Math.min(count, MAX_PATCHES);
  const out: FlowerPatch[] = [];
  for (let i = 0; i < patches; i++) {
    const x = Math.round(40 + rng() * 1100);
    const y = Math.round(600 + rng() * 190);
    const hue = Math.floor(rng() * 6);
    const flowers = Math.floor(count / MAX_PATCHES) + (i < count % MAX_PATCHES ? 1 : 0);
    out.push({ x, y, density: Math.min(3, Math.max(1, flowers)) as 1 | 2 | 3, hue });
  }
  return out;
}
