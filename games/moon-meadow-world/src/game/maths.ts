// The maths side of the checked moments (moved out of moments.ts in 2.3.0, so the eggs lane owns it): what eggSpec and
// rackSpec read beyond `first`, planning a sum from its own stream in the current band, and noting a maths result (the
// results log with the tray, and the band move).
import type { EggSpec, MomentResult } from '../contracts';
import { eggSpec } from '../content';
import type { Game } from './game';
import type { MomentLog } from './moments';
import { type Band, noteBand, useSum } from './band';

/** What the maths lane's eggSpec and rackSpec read (docs/v4/2.2.md 4.2), beyond `first`. */
export interface EggAsk {
  /** The first egg of its kind: the intro (and the warm egg's spoken gesture). */
  first?: boolean;
  /** 4 stones and the narrower ranges (a), or 5 and the wider ones (b). */
  band: Band;
  /** Totals and answers asked earlier this play: never again while other sums are left. */
  used: { totals: number[]; answers: number[] };
  /** The last play's totals, left out while other sums are left. */
  lastTotals: number[];
}

export function eggAsk(g: Game, first = false): EggAsk {
  const used = { totals: [...g.maths.used.totals], answers: [...g.maths.used.answers] };
  return { first, band: g.maths.band, used, lastTotals: [...g.save.data.last.totals] };
}

/** An egg from the stream `label` in the current band; its sum is then used for this play. */
export function planEgg(g: Game, kind: EggSpec['kind'], label: string, first: boolean): EggSpec {
  const ask: EggAsk = eggAsk(g, first);
  const spec = eggSpec(kind, g.randFor(label), ask);
  useSum(g.maths, spec);
  return spec;
}

/** A maths result (an egg or the hay rack): the results log with the tray, and the band moves. */
export function noteMaths(g: Game, part: string, spec: EggSpec, r: MomentResult, t: MomentLog): void {
  g.results.add(part, 'm', r, {
    kind: spec.kind, grade: spec.grade, round: spec.round?.index, need: spec.need, have: spec.have, answer: spec.answer, band: spec.band ?? g.maths.band,
    stones: spec.stones, place: spec.stones.indexOf(spec.answer), decoys: spec.decoys ?? {}, tried: t.tried, ...t.flags,
  });
  noteBand(g.maths, r.outcome);
}
