// G/src/core/planner/names.ts
// Name review picks for roll call and envelopes (spec 3.7). A name is asked only when she can decode it,
// or when she has read it right before. One memory per name, so two babies called Tim share it.
import type { GpcId } from '../content/types.ts';
import { dueAt, isDue } from '../learning/leitner.ts';
import { nameItemId } from '../learning/ids.ts';
import { currentStep, isPassedStep, isPlacedStep } from '../learning/status.ts';
import { nameId } from '../keys.ts';
import type { Rng } from '../rng.ts';
import { shuffle } from '../rng.ts';
import type { Pick, PlanContext } from './types.ts';

export type NameCandidate = { babyId: string; name: string; gpcs: GpcId[] };

export function nextNameReviews(ctx: PlanContext, herd: NameCandidate[], n: number, moment: 'roll-call' | 'envelope', rng: Rng): Pick[] {
  const { c, l, now, assets } = ctx;
  const b = c.budget;
  const cur = currentStep(l, c, 'r');
  const stepKnown = (step: string) => step === cur || isPassedStep(l, step) || isPlacedStep(l, c, step);
  const decodable = (gpcs: GpcId[]) => gpcs.length > 0 && gpcs.every(g => {
    const it = c.items[`r:g:${g}`];
    return it !== undefined && stepKnown(it.step);
  });

  const seen = new Set<string>();
  const eligible: { cand: NameCandidate; item: string }[] = [];
  for (const cand of herd) {
    // One name key per round: 'Pip' and 'pip' (and 'Zoë' and 'Zoe') are the same name.
    const item = nameItemId(cand.name);
    if (seen.has(item)) continue;
    const mem = l.items[item];
    if (!decodable(cand.gpcs) && !((mem?.firsts ?? 0) > 0)) continue;
    // Elizabeth says the name after she reads it: never ask a name without its clip.
    if (!assets.clip(nameId(cand.name, '!'))) continue;
    seen.add(item);
    eligible.push({ cand, item });
  }

  const rank = (item: string): [number, number] => {
    const mem = l.items[item];
    if (!mem) return [1, 0];
    if (isDue(item, mem, now, l.visit, b)) return [0, dueAt(mem, b)];
    return [2, mem.lastT];
  };
  const order = shuffle(eligible, rng)
    .map((e, i) => ({ e, i, r: rank(e.item) }))
    .sort((x, y) => x.r[0] - y.r[0] || x.r[1] - y.r[1] || x.i - y.i);

  return order.slice(0, Math.max(0, n)).map(({ e }) => ({
    strand: 'name', step: null, slot: 'name', moment, items: [e.item],
    carrier: { kind: 'name', babyId: e.cand.babyId, name: e.cand.name }, scaffold: 3, probe: false,
  }));
}
