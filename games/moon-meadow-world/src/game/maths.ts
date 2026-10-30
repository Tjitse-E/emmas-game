// The maths side of the checked moments (moved out of moments.ts in 2.3.0, so the eggs lane owns it): what eggSums and
// rackSpec read beyond `first`, planning an egg's three sums (or the hay rack's one) from its own stream in the
// current band, and noting a maths result (the results log with the tray, and the band move).
import type { EggKind, EggSpec, MomentResult } from '../contracts';
import { type AskedSums, eggSums, fitEggPlans, prepareEggPlan } from '../content/eggs';
import type { HubPlace } from './options';
import type { Game } from './game';
import type { MomentLog } from './moments';
import { type Band, noteBand, useSum } from './band';

/** What the maths lane's eggSums and rackSpec read (docs/v4/2.2.md 4.2), beyond `first`. */
export interface EggAsk {
  /** The first egg of its kind: the intro (and the warm egg's spoken gesture). */
  first?: boolean;
  /** The hard sum's and the hay rack's band: 4 stones (a), or 5 (b; the hay rack's sums reach 10 too). */
  band: Band;
  /**
   * Totals and answers asked earlier this play, one pair per sum. The hay rack never asks a fact (a total with its
   * answer) again while other sums are left. An egg's sum gives way to one just like it whose total was not asked, while
   * there is one; its answers differ only within the egg (eggSums).
   */
  used: { totals: number[]; answers: number[] };
  /** The last play's totals. Nothing reads them since the sums stay within 10 (every play asks 9 and 10). */
  lastTotals: number[];
  /**
   * What this play asked (2.4.0, "no sum twice", docs/v4/2.4.md section 5.3): an egg leaves out the answers its kind
   * asked per grade and, for snow and star, every take-away fact said; the hay rack leaves out the warm sums asked.
   */
  asked: AskedSums;
}

export function eggAsk(g: Game, first = false): EggAsk {
  const used = { totals: [...g.maths.used.totals], answers: [...g.maths.used.answers] };
  // The last play's totals as this play read them at its start (2.4.0: the save's `last` is written after each place).
  return { first, band: g.maths.band, used, lastTotals: [...(g.start ?? g.save.data).last.totals], asked: g.maths.asked };
}

/** The egg a hub place can start: the nest egg is warm, the shore egg snow, a ride's trail egg a star egg. */
const EGG_OF: Partial<Record<HubPlace, EggKind>> = { egg: 'warm', shore: 'snow', ride: 'star' };

/** In a browser the fitting waits until the bubbles have popped in (4 bubbles 0.4 s apart), so it never stalls a pop. */
const PREPARE_DELAY_MS = 1800;

/**
 * Fit the egg plans the shown bubbles can start, with what this play has asked left out (2.4.0: the hub calls it at
 * each refill, never during a walk), in the band now: a band moves only inside a place, so it is the band the egg
 * opens with. A plan fitted once is cached, so a later refill costs nothing; an egg that starts first fits its own.
 */
export function prepareEggPlans(g: Game): void {
  // A test's small game may have no maths state or no hub; there is then nothing to prepare.
  if (!g.maths) return;
  const kinds = [...new Set((g.hub?.shown ?? []).map((p) => EGG_OF[p]).filter((k) => k !== undefined))];
  if (!kinds.length) return;
  const band = g.maths.band;
  const asked = g.maths.asked ? structuredClone(g.maths.asked) : undefined;
  const fit = () => kinds.forEach((kind) => prepareEggPlan(kind, band, asked));
  if (typeof window === 'undefined') fit();
  else setTimeout(fit, PREPARE_DELAY_MS);
}

/**
 * An egg's three sums from the stream `label` (2.3 section 19.1), all planned when the egg opens: the hard sum takes
 * the band now, so a band move inside the egg never changes its sums. Each is then used for this play.
 */
export function planEggs(g: Game, kind: EggSpec['kind'], label: string, first: boolean): EggSpec[] {
  const specs = eggSums(kind, g.randFor(label), eggAsk(g, first));
  for (const spec of specs) useSum(g.maths, spec);
  return specs;
}

/**
 * A maths result (an egg sum or the hay rack): the results log with the tray, the grade and the heart. Only a hard
 * sum and the hay rack move the band (2.3 section 19.1): her easy sum is nearly always a first try and would push
 * every hard sum into band B.
 */
export function noteMaths(g: Game, part: string, spec: EggSpec, r: MomentResult, t: MomentLog): void {
  g.results.add(part, 'm', r, {
    // An easy or a middle sum has no band (19.1), so its line has none either.
    kind: spec.kind, grade: spec.grade, round: spec.round?.index, need: spec.need, have: spec.have, answer: spec.answer, band: spec.band,
    stones: spec.stones, place: spec.stones.indexOf(spec.answer), decoys: spec.decoys ?? {}, tried: t.tried, ...t.flags,
  });
  if (movesBand(spec)) noteBand(g.maths, r.outcome);
}

/** True for the sums that move the maths band: an egg's hard sum and the hay rack (no grade). */
export function movesBand(spec: Pick<EggSpec, 'grade'>): boolean {
  return !spec.grade || spec.grade === 'hard';
}

/**
 * The egg plans are fitted once the page is idle after its start, so the fitting never runs on the walk to an egg
 * (docs/v4/2.3.md section 19.1; a few milliseconds per kind and band). Only in a browser.
 */
if (typeof window !== 'undefined') {
  const idle = (window as { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback;
  if (idle) idle.call(window, fitEggPlans);
  else setTimeout(fitEggPlans, 400);
}
