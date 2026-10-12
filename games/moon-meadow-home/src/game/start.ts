// Chooses the first scene of a visit (spec 2.9, core K7, R46): Moving Day, a new player's welcome, or the meadow.
import type { StartTarget } from '../platform/boot.svelte.ts';
import { readV2Local } from '../save/v2-local.ts';
import { v2Deps } from './v2-deps.ts';
import type { V2ImportDeps } from '../core/save/v2.ts';

type Ev = { type: string; source?: string };
export type StartFacts = { played: boolean; imported: boolean; v2: string | null; movingDayDone: boolean };

/** Only a hatch, an import or a learning result is play. place.enter, announcements and missing clips are not. */
export function startFacts(events: readonly Ev[]): { played: boolean; imported: boolean; nonV2Hatch: boolean } {
  const imported = events.some((e) => e.type === 'import.v2');
  const nonV2Hatch = events.some((e) => e.type === 'egg.hatched' && e.source !== 'v2');
  const played = imported || nonV2Hatch || events.some((e) => e.type === 'learn.result');
  return { played, imported, nonV2Hatch };
}

export function decideStart(f: StartFacts): { id: string } {
  if (f.imported && !f.movingDayDone) return { id: 'moving-day' };
  if (!f.imported && f.v2) return { id: 'import-v2' };
  return f.played ? { id: 'meadow' } : { id: 'welcome' };
}

type StartData = {
  allEvents(): readonly Ev[];
  importText(t: string, d: V2ImportDeps): Promise<{ kind: string; status?: string }>;
};
type StoreLike = { data: unknown; world: { announced: ReadonlySet<string> }; markRefolded(): void };

export async function chooseStart(game: StoreLike, readV2: () => string | null = readV2Local): Promise<StartTarget> {
  const data = game.data as StartData | null;
  if (!data) return { id: 'welcome' };
  const f = startFacts(data.allEvents());
  // K7: try her v2 save on every start while there is no import and no hatch that did not come from v2.
  const v2 = !f.imported && !f.nonV2Hatch ? readV2() : null;
  const next = decideStart({ played: f.played, imported: f.imported, v2, movingDayDone: game.world.announced.has('moving-day') });
  if (next.id !== 'import-v2') return next;
  try {
    const out = await data.importText(v2 as string, v2Deps);
    game.markRefolded();
    if (out.kind === 'v2' && out.status === 'imported') return { id: 'moving-day' };
  } catch (e) {
    console.warn('[start] the v2 save did not import', e);
  }
  // A failed or empty import: the parent corner's "import v2 from this browser again" retries it (places A15).
  return { id: f.played ? 'meadow' : 'welcome' };
}
