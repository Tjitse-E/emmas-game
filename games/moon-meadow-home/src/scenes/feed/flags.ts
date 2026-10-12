// Feeding's test flags and state (docs/v3/next/plan.md 3.8). Imported by MeadowLife.svelte, so the hooks register
// at boot. Outside production builds it registers feed.hungry, feed.manger and feed.state.
import { registerHook } from '../../platform/hooks.ts';
import { game } from '../../game.svelte.ts';

/** Test flags: force (true) or forbid (false) the hungry first wish, force tonight's manger moment; null is free. */
export const feedFlags = { hungry: null as boolean | null, manger: null as 'wish' | 'rack' | null };

export type FeedState = {
  /** The last wish scene: hungry or plain, null before any wish. */
  wish: 'hungry' | 'plain' | null;
  /** Tonight's manger stage while the mangers are on screen. */
  manger: 'wish' | 'rack' | 'free' | null;
  /** The foods on the tray on screen (meadow or stable). */
  tray: string[];
  /** aria-label of where the checked manger moment's answer goes ('manger 7', 'hay rack'). */
  drop: string | null;
  /** Free feeding: door number to the food that baby wants. */
  wants: Record<string, string>;
};
export const feedState: FeedState = { wish: null, manger: null, tray: [], drop: null, wants: {} };

/** N11: never two hungry first wishes in a row. Kept for the page's life, like the planner's visit memory. */
export const feedMemory = { lastWasHungry: false };

function cares(): { baby: string; station: string }[] {
  const all = (game.data?.allEvents() ?? []) as readonly { type: string; baby?: string; station?: string }[];
  return all.filter((e) => e.type === 'care.done').map((e) => ({ baby: e.baby ?? '', station: e.station ?? '' }));
}

let installed = false;
function install(): void {
  if (installed) return;
  installed = true;
  registerHook('feed.hungry', (on: boolean | null) => { feedFlags.hungry = on ?? null; return feedFlags.hungry; });
  registerHook('feed.manger', (mode: 'wish' | 'rack' | null) => { feedFlags.manger = mode ?? null; return feedFlags.manger; });
  // Beyond 3.8's shape: `cares`, every care.done in the log ({ baby, station }), so flows can see a feed or a tuck land.
  registerHook('feed.state', () => ({ ...feedState, tray: [...feedState.tray], wants: { ...feedState.wants }, cares: cares() }));
}
if (import.meta.env.MODE !== 'production') install();
