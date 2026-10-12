// Typed access to the place content. The release comes from learning's content/release.json, the only
// release file (R27). Later tasks add one export per content/places/*.json file they create.
import releaseJson from '../../../content/release.json' with { type: 'json' };
import openingsJson from '../../../content/places/openings.json' with { type: 'json' };
import plotsJson from '../../../content/places/plots.json' with { type: 'json' };
import type { OpeningDef } from './openings.ts';
import type { PlotDef, RowDef } from './building.ts';
import { RELEASES, type Release } from '../content/types.ts';

export const CURRENT_RELEASE: string = releaseJson.release;

/** Releases in order (learning's RELEASES). 'later' and unknown values are never released. */
export function released(release: string, current: string = CURRENT_RELEASE): boolean {
  const r = RELEASES.indexOf(release as Release), c = RELEASES.indexOf(current as Release);
  return release !== 'later' && r >= 0 && c >= 0 && r <= c;
}


/** The opening queue in its fixed order (decision D4). Welcome, Moving Day and the moon hint are not in it. */
export const openingDefs: readonly OpeningDef[] = openingsJson.order as OpeningDef[];
/** The first fresh jewel jumps the queue. */
export const jewelsOpening: OpeningDef = openingsJson.jewels as OpeningDef;

/** Building plots in the valley (Task A12). Rows are not listed: they are `row-<n>` plots (R26). */
export const plotDefs: readonly PlotDef[] = plotsJson.plots as PlotDef[];
/** Stable rows: full Building Days up to `fullUntil`, then a short build. */
export const rowDef: RowDef = plotsJson.rows;
