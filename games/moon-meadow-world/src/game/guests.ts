// A place's guests (2.4.0, docs/v4/2.4.md section 5.3; moved out of quest-kit.ts): the picnic, the bead tree and the
// Dressing Corner's gate borrow babies, and they follow her again afterwards. No place waits for an egg any more: the
// guests are her newborns, then the babies that follow her, then the herd babies nearest the place.
import type { Vec2 } from '../contracts';
import type { UnicornActor } from '../actors';
import { dist2 } from '../layout';
import { type Game, flat } from './game';
import { isMount } from './ride';

/** A unicorn that can be borrowed: on the grass, not a mount, not the baby whose wish waits, not at the hay rack. */
function free(g: Game, u: UnicornActor): boolean {
  return u.mode !== 'stall' && !isMount(u) && u !== g.waiting && !g.quests.helpers.includes(u.id);
}

/**
 * Up to `n` guests for a place at `at`: they stop following until the place is over. Her babies first, in hatch order
 * (baby 13 first, as in 2.3.3), then the babies among her followers in slot order, then the grazing herd babies nearest
 * `at`. Foals that follow her stay followers: the places are made for babies (the picnic's cushions, the gate's wishes).
 */
export function guests(g: Game, at: Vec2, n: number): UnicornActor[] {
  const out: UnicornActor[] = [];
  const take = (u: UnicornActor) => {
    if (out.length < n && !out.includes(u)) out.push(u);
  };
  for (const b of g.babies) take(b.unicorn);
  // A fake game without followers (the step 0 contract's) has none to give.
  for (const u of g.followers?.list ?? []) if (u.look.stage === 'baby' && free(g, u)) take(u);
  if (out.length >= n) return out;
  const herd = g.herd
    .map((h) => g.actors.herd.get(h.id))
    .filter(
      (u): u is UnicornActor =>
        !!u && u.look.stage === 'baby' && (u.mode === 'graze' || u.mode === 'idle') && u.followSlot === null && free(g, u) && !out.includes(u),
    )
    .sort((a, b) => dist2(flat(a.position), at) - dist2(flat(b.position), at));
  for (const u of herd) take(u);
  return out;
}

/** After a place: the followers it parked follow again, and so do its guests (the first one in slot 0). */
export function followAgain(g: Game, babies: UnicornActor[]): void {
  for (const p of g.parked.splice(0)) g.followers.add(p);
  babies.forEach((u, k) => g.followers.add(u, k === 0));
}
