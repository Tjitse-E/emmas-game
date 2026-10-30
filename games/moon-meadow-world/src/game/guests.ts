// A place's guests (2.4.0, docs/v4/2.4.md section 5.3; moved out of quest-kit.ts): the picnic, the bead tree and the
// Dressing Corner's gate borrow babies, and they follow her again afterwards. The babies lane fills guests() with
// her newest named babies, then her followers, then the herd babies nearest the place (docs/v4/2.4-plan.md Task 9).
import type { Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { dist2 } from '../layout';
import { type Game, flat } from './game';
import { isMount } from './ride';

/**
 * Up to `n` guests for a place at `at`: they stop following until the place is over. Step 0 gives her babies in hatch
 * order (2.3.3's two newborns, baby 13 first, as quest-kit.ts did), then the grazing herd babies nearest `at`, so a
 * place the hub starts before any egg hatched still has its guests.
 */
export function guests(g: Game, at: Vec2, n: number): UnicornActor[] {
  const out = g.babies.map((b) => b.unicorn).slice(0, n);
  if (out.length >= n) return out;
  const herd = g.herd
    .map((h) => g.actors.herd.get(h.id))
    .filter(
      (u): u is UnicornActor =>
        !!u &&
        u.look.stage === 'baby' &&
        (u.mode === 'graze' || u.mode === 'idle') &&
        u.followSlot === null &&
        !isMount(u) &&
        u !== g.waiting &&
        !g.quests.helpers.includes(u.id),
    )
    .sort((a, b) => dist2(flat(a.position), at) - dist2(flat(b.position), at));
  return [...out, ...herd.slice(0, n - out.length)];
}

/** After a place: the followers it parked follow again, and so do its guests (the first one in slot 0). */
export function followAgain(g: Game, babies: UnicornActor[]): void {
  for (const p of g.parked.splice(0)) g.followers.add(p);
  babies.forEach((u, k) => g.followers.add(u, k === 0));
}
