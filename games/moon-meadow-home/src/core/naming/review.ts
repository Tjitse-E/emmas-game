// Whether a baby's name may be reviewed (spec 3.7): she can decode it at her reading step, or she has read it
// right before. Places' envelopes ask it; roll call uses learning's nextNameReviews, which applies the same rule.
import type { Content, GpcId } from '../content/types.ts';
import type { Learner } from '../learning/types.ts';
import { currentStep, isPassedStep, isPlacedStep } from '../learning/status.ts';
import { nameItemId, nameKey } from '../keys.ts';

/** GPC ids of a name: the name bank's split when the name is in the bank, else her gems read as usual GPCs. */
export function nameGpcs(c: Content, name: string, gems: readonly string[], listName: string | null): GpcId[] {
  const bank = c.names.find((n) => n.slug === nameKey(listName ?? name)) ?? c.names.find((n) => n.slug === nameKey(name));
  if (bank) return [...bank.gpcs];
  return gems.map((g) => g.toLowerCase()).filter((g) => Object.hasOwn(c.gpcs, g));
}

export function canReviewName(baby: { name: string | null; gems: readonly string[]; listName: string | null }, l: Learner, c: Content): boolean {
  if (!baby.name) return false;
  if ((l.items[nameItemId(baby.name)]?.firsts ?? 0) > 0) return true;
  const cur = currentStep(l, c, 'r');
  const known = (step: string) => step === cur || isPassedStep(l, step) || isPlacedStep(l, c, step);
  const gpcs = nameGpcs(c, baby.name, baby.gems, baby.listName);
  return gpcs.length > 0 && gpcs.every((g) => { const it = c.items[`r:g:${g}`]; return it !== undefined && known(it.step); });
}
