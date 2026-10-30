// A place's guests (2.4.0, docs/v4/2.4.md section 5.3; moved out of quest-kit.ts): the picnic, the bead tree and the
// Dressing Corner's gate borrow babies, and they follow her again afterwards. The babies lane fills guests() with
// her newest named babies, then her followers, then the herd babies nearest the place (docs/v4/2.4-plan.md Task 9).
import type { Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import type { Game } from './game';

/**
 * Up to `n` guests for a place at `at`: they stop following until the place is over. Step 0 gives 2.3.3's two newborns,
 * as quest-kit.ts did.
 */
export function guests(g: Game, _at: Vec2, _n: number): UnicornActor[] {
  return g.babies.slice(0, 2).map((b) => b.unicorn);
}

/** After a place: the followers it parked follow again, and so do its guests (the first one in slot 0). */
export function followAgain(g: Game, babies: UnicornActor[]): void {
  for (const p of g.parked.splice(0)) g.followers.add(p);
  babies.forEach((u, k) => g.followers.add(u, k === 0));
}
