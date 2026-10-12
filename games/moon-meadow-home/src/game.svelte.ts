// The store: the one object scenes talk to (spec 4.2 Game store, contracts C7).
// It opens the save at module load (R44), folds every event into one state, builds the World view after
// every fold, turns scene actions into events through the actions router, and owns the visit (R45).
import { openGameData, attachLifecycle } from './save/game-data.ts';
import type { GameData } from './save/game-data.ts';
import { claimTab } from './save/tab-guard.ts';
import { createGameFolder } from './core/world/index.ts';
import { content, CONTENT_HASH } from './core/content/static.ts';
import { createLearnerSlice, pendingLearnFacts } from './core/learning/index.ts';
import { createPlacesSlice, titlesToGive, momentPinsDue } from './core/places/index.ts';
import { apply } from './core/actions.ts';
import type { Action } from './core/actions.ts';
import type { GameEvent, GameEventDraft } from './core/events.ts';
import { KEY_RE } from './core/keys.ts';
import { uuid4 } from './core/ids.ts';
import { mulberry32 } from './core/rng.ts';
import type { Rng } from './core/rng.ts';
import { worldView } from './game/world-view.ts';
import type { FullState, World } from './game/world-view.ts';
import { chooseStart } from './game/start.ts';
import type { Content, GameState, StepId } from './types/contracts.ts';
import type { PlanContext } from './core/planner/index.ts';
import { audio } from './audio/index.ts';
import { hasPicture } from './art/manifest.ts';
import { clock } from './platform/clock.ts';
import { router } from './platform/router.svelte.ts';
import { setStartHandler } from './platform/boot.svelte.ts';
import { VISIT_IDLE_MS, watchLifecycle } from './platform/lifecycle.ts';

/** Test and dev builds register the window.__game handlers; production drops them (same rule as main.ts). */
const TEST_HOOKS = import.meta.env.MODE !== 'production';
/** Scenes that are not a place in the game: no place.enter or place.leave for them. */
const NOT_A_PLACE = new Set(['rest']);

const folder = createGameFolder([createLearnerSlice(content), createPlacesSlice()]);
let data: GameData<FullState> | null = null;
let visit: string | null = null;
let state = $state.raw<FullState | null>(null);
let world = $state.raw<World | null>(null);
let version = $state(0);
let refoldedAt = $state(0);
let visitOpen = $state(false);
let rng: Rng = mulberry32(Date.now() >>> 0);
let testScaffold: Partial<Record<StepId, 1 | 2 | 3>> | undefined;   // R59, test builds only
const caredThisVisit = new Set<string>();
const missingLogged = new Set<string>();

/** Svelte 5 cannot export reassigned state, so flags live in one exported object. */
export const storeStatus = $state({ lostTab: false, open: false });

function firstSound(name: string, gems: readonly string[]): string | null {
  const lower = name.toLowerCase();
  const entry = content.names.find((n) => n.name.toLowerCase() === lower);
  if (entry) return entry.first;
  const g = gems[0];
  return g !== undefined && Object.hasOwn(content.gpcs, g) ? (content.gpcs[g].phonemes[0] ?? null) : null;
}

const viewDeps = { hasName: (n: string) => audio.hasName(n), firstSound };

function refresh(): void {
  if (!data) return;
  state = data.folded().state;
  world = worldView(state, viewDeps, visit);
  version++;
}

/** Facts the folded state has earned and the log does not hold yet: passed steps, placements, titles, moment pins. */
function reconcile(s: FullState): GameEventDraft[] {
  const w = worldView(s, viewDeps, visit);
  const g = s as unknown as GameState;
  return [...pendingLearnFacts(s.learner, content), ...titlesToGive(g, w), ...momentPinsDue(g, w)] as GameEventDraft[];
}

async function openStore(): Promise<void> {
  const d = await openGameData<FullState>({
    folder, contentHash: CONTENT_HASH, codeVersion: __BUILD_ID__, reconcile, now: () => clock.now(),
  });
  data = d;
  d.subscribe(() => refresh());
  try { claimTab(() => { storeStatus.lostTab = true; }); } catch (e) { console.warn('[store] no tab guard', e); }
  const browser = typeof window !== 'undefined' && typeof document !== 'undefined';   // false in Vitest's node runs
  if (browser) attachLifecycle(d);
  audio.onMissing((clip) => {
    if (!visit || missingLogged.has(clip) || !KEY_RE.test(clip)) return;
    missingLogged.add(clip);
    safeDispatch({ type: 'game/audio-missing', clip });
  });
  // R32: the store writes place.enter and place.leave on every scene change inside a visit.
  router.onChange((from, to) => {
    if (!visit) return;
    if (from && !NOT_A_PLACE.has(from.id)) safeDispatch({ type: 'game/leave', place: from.id });
    if (!NOT_A_PLACE.has(to.id)) safeDispatch({ type: 'game/enter', place: to.id });
  });
  // A long hide or 30 untouched minutes end the visit on the rest scene (R45).
  let longHide = false;
  if (browser) {
    watchLifecycle({
      onShow: (hiddenMs) => { longHide = hiddenMs >= VISIT_IDLE_MS; },
      onVisitTimeout: () => { game.endVisit(longHide ? 'hidden' : 'idle'); longHide = false; },
    });
  }
  refresh();
  storeStatus.open = true;
}

/** Bookkeeping writes (place events, missing clips) never break a scene. */
function safeDispatch(action: Action): void {
  try { game.dispatch(action); } catch (e) { console.warn('[store] could not record', action.type, e); }
}

let opening: Promise<void> | null = null;
/** R44: opening starts at module load; the start handler and every store hook await it. */
export function ready(): Promise<void> {
  return (opening ??= openStore());
}

/** Opens a new visit: a visit.start event, and care hearts count again. */
export function beginVisit(): void {
  visit = `v-${uuid4().slice(0, 8)}`;
  visitOpen = true;
  caredThisVisit.clear();
  game.dispatch({ type: 'game/visit-start', visit, tz: clock.tzOffsetMinutes() });
}

/** R45: the rest scene's moon (and the newVisit hook) start the next visit without a reload. */
export async function wakeVisit(): Promise<void> {
  void audio.unlock();   // first, inside the tap's call stack: iOS unlocks audio only during the gesture
  await ready();
  if (!visit) beginVisit();
  const next = await chooseStart(game);
  await router.reset(next.id, next.params ?? {});
}

export const game = {
  get state(): FullState { return state as FullState; },
  get world(): World { return world as World; },
  get learner(): FullState['learner'] { return (state as FullState).learner; },
  get content(): typeof content { return content; },
  get version() { return version; },
  get refoldedAt() { return refoldedAt; },
  get scene() { return router.current?.id ?? ''; },
  get params() { return router.current?.params ?? {}; },
  get data() { return data; },
  get rng(): Rng { return rng; },
  set rng(r: Rng) { rng = r; },
  get visitOpen() { return visitOpen; },
  /** The current visit id, or null between visits. */
  get visit() { return visit; },
  ready,
  now: (): number => clock.now(),
  dispatch(action: Action): GameEvent[] {
    if (!data || !state || !world) throw new Error('store not open: await ready() first');
    const drafts = apply(action, {
      visit: visit ?? 'none', now: clock.now(), state: state as unknown as GameState, world, content: content as unknown as Content,
      heartedThisVisit: (b) => caredThisVisit.has(b),
    });
    for (const d of drafts) if (d.type === 'care.done' && d.heart && d.station !== 'rollcall') caredThisVisit.add(d.baby);
    return data.commit(drafts);
  },
  go: (scene: string, params?: Record<string, unknown>): Promise<void> => router.go(scene, params),
  planContext(): PlanContext {
    return {
      c: content, l: (state as FullState).learner, now: clock.now(),
      assets: { clip: (id) => audio.hasClip(id), picture: (id) => hasPicture(id) },
      ...(TEST_HOOKS && testScaffold ? { testScaffold } : {}),
    };
  },
  /** R45: writes visit.end and rests on the night meadow; the moon there starts the next visit. */
  endVisit(reason: 'goodnight' | 'idle' | 'hidden'): void {
    if (!visit) return;
    const here = router.current?.id;
    if (here && !NOT_A_PLACE.has(here)) safeDispatch({ type: 'game/leave', place: here });
    safeDispatch({ type: 'game/visit-end', reason });
    visit = null;
    visitOpen = false;
    world = state ? worldView(state, viewDeps, null) : world;
    void data?.flush();
    void router.reset('rest');
  },
  /** After a sync or an import refolds everything. */
  markRefolded(): void { refoldedAt = clock.now(); refresh(); },
};

setStartHandler(async () => {
  await ready();
  if (!visit) beginVisit();
  return chooseStart(game);
});

void ready().catch((e) => console.error('[store] the save did not open', e));

// Test builds only. A dynamic import behind a compile-time constant: production builds drop the hook code entirely.
if (TEST_HOOKS) {
  void import('./game/hook-handlers.ts').then((m) => m.registerGameHooks(game, {
    seed: (n) => { rng = mulberry32(n); },
    ready,
    wake: wakeVisit,
    setScaffold: (step, level) => { testScaffold = { ...testScaffold, [step]: level }; },
  }));
}
