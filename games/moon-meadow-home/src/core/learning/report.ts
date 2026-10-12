// G/src/core/learning/report.ts
// The parent corner's per-strand report (places A15): steps, placement, the ceiling and this week's accuracy.
// Only Tjitse sees it, behind the parent gate. Emma never sees a score.
import type { Content, StepId, Strand } from '../content/types.ts';
import type { Learner } from './types.ts';
import {
  currentStep, isPassedStep, isPlacedStep, isPlacing, openSchoolSteps, sideSteps, stepStatus, STRANDS,
} from './status.ts';
import { DAY_MS } from './time.ts';

export type StrandReport = {
  strand: Strand;
  placing: boolean;
  placement: { lo: StepId; hi: StepId; items: number } | null;   // null when not placing
  current: StepId | null;
  level: 1 | 2 | 3 | null;
  ceiling: boolean;                    // not placing and current is null
  passed: StepId[]; placed: StepId[]; secure: StepId[]; side: StepId[]; school: StepId[]; reopened: StepId[]; waiting: StepId[];
  week: { moments: number; firstTry: number | null; helped: number | null; dutch: number };
  /** This week's Dutch-tagged errors per contrast pair, most first (spec 3.8 rule 2). */
  dutchPairs: { pair: string; count: number }[];
};

/** Passed or placed, and every item in box 4 or higher. */
export function isSecure(l: Learner, c: Content, step: StepId): boolean {
  if (!c.steps[step]) return false;
  if (!isPassedStep(l, step) && !isPlacedStep(l, c, step)) return false;
  return c.steps[step].items.every(it => (l.items[it.id]?.box ?? 0) >= 4);
}

function strandReport(l: Learner, c: Content, strand: Strand, now: number): StrandReport {
  const placing = isPlacing(l, strand);
  const p = l.placement[strand];
  const current = currentStep(l, c, strand);
  const order = c.order[strand];
  const week = l.recent[strand].filter(x => x.t >= now - 7 * DAY_MS && x.slot !== 'probe');
  const n = week.length;
  const share = (k: number) => (n === 0 ? null : k / n);
  const pairs = new Map<string, number>();
  for (const x of week) if (x.err === 'dutch' && x.pair) pairs.set(x.pair, (pairs.get(x.pair) ?? 0) + 1);
  return {
    strand,
    placing,
    placement: placing ? { lo: p.lo, hi: p.hi, items: p.items } : null,
    current,
    level: current ? (l.steps[current]?.level ?? 1) : null,
    ceiling: !placing && current === null,
    passed: order.filter(id => isPassedStep(l, id)),
    placed: order.filter(id => !isPassedStep(l, id) && isPlacedStep(l, c, id)),
    secure: order.filter(id => isSecure(l, c, id)),
    side: sideSteps(l, c, strand),
    school: openSchoolSteps(l, c, strand),
    reopened: order.filter(id => l.steps[id]?.reopened === true),
    waiting: order.filter(id => c.steps[id].release !== 'later' && stepStatus(l, c, id) === 'waiting'),
    week: {
      moments: n,
      firstTry: share(week.filter(x => x.r === 'first').length),
      helped: share(week.filter(x => x.r === 'helped').length),
      dutch: week.filter(x => x.err === 'dutch').length,
    },
    dutchPairs: [...pairs].map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count || a.pair.localeCompare(b.pair)),
  };
}

/** One report per strand, in the order r, s, m. */
export function learnerReport(l: Learner, c: Content, now: number): StrandReport[] {
  return STRANDS.map(s => strandReport(l, c, s, now));
}
