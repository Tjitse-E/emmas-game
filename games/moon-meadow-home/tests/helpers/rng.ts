// A seeded random generator, so property tests are repeatable. The one generator is src/core/rng.ts (R25).
import { mulberry32 } from '../../src/core/rng.ts';

export { mulberry32 };

export function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}
