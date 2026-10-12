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

/**
 * Test builds only: `feed.preview(spots)` mounts the mangers layer over the current scene with these spots, so the
 * feeding can be seen and driven before the goodnight stable mounts it; `feed.preview(null)` removes it.
 * `feed.previewHook(method, ...args)` calls the checked moment's StageHook; `feed.previewState()` tells whether
 * onchecked ran.
 */
type Spot = { baby: string; order: number; x: number; y: number };
type Hook = Record<string, (...a: unknown[]) => unknown>;
const preview: { off: (() => void) | null; hook: Hook | null; checked: boolean } = { off: null, hook: null, checked: false };
/** The stable row's manger spots (plan N3 StableRow: stalls at x = 40 + i * 224, rows at y 140 and 480, manger at (x + 56, y + 270)). */
function herdSpots(n: number): Spot[] {
  return game.world.herd.slice(0, Math.min(10, n)).map((b, i) => {
    const x = 40 + (i % 5) * 224, y = i < 5 ? 140 : 480;
    return { baby: b.id, order: i + 1, x: x + 56, y: y + 270 };
  });
}
async function mountPreview(arg: Spot[] | number | null): Promise<string> {
  const spots = typeof arg === 'number' ? herdSpots(arg) : arg;
  preview.off?.();
  preview.off = null;
  preview.hook = null;
  preview.checked = false;
  if (!spots) return 'off';
  const [{ mount, unmount }, mod] = await Promise.all([import('svelte'), import('./MangerFeed.svelte')]);
  const target = document.getElementById('stage');
  if (!target) throw new Error('no stage');
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;inset:0;z-index:50;pointer-events:none';
  target.appendChild(host);
  const app = mount(mod.default, {
    target: host,
    props: { spots, onhook: (h: unknown) => { preview.hook = h as unknown as Hook | null; }, onchecked: () => { preview.checked = true; } },
  });
  preview.off = () => { void unmount(app); host.remove(); };
  return 'on';
}

let installed = false;
function install(): void {
  if (installed) return;
  installed = true;
  registerHook('feed.hungry', (on: boolean | null) => { feedFlags.hungry = on ?? null; return feedFlags.hungry; });
  registerHook('feed.manger', (mode: 'wish' | 'rack' | null) => { feedFlags.manger = mode ?? null; return feedFlags.manger; });
  // Beyond 3.8's shape: `cares`, every care.done in the log ({ baby, station }), so flows can see a feed or a tuck land.
  registerHook('feed.state', () => ({ ...feedState, tray: [...feedState.tray], wants: { ...feedState.wants }, cares: cares() }));
  registerHook('feed.preview', (spots: Spot[] | number | null) => mountPreview(spots ?? null));
  registerHook('feed.previewHook', async (method: string, ...args: unknown[]) => {
    const fn = preview.hook?.[method];
    return fn ? await fn(...args) : null;
  });
  registerHook('feed.previewState', () => ({ hook: preview.hook !== null, checked: preview.checked }));
}
if (import.meta.env.MODE !== 'production') install();
