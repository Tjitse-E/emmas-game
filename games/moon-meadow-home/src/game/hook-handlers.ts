// window.__game handlers owned by the store (contracts C10). Test and dev builds only.
// said() and audioMissing() are platform's synchronous methods (P-A10); they are not registered here.
import { registerHook, registerState, sceneHook } from '../platform/hooks.ts';
import { clock } from '../platform/clock.ts';
import { isPlacing, setCurrentOverride } from '../core/learning/index.ts';
import type { Learner } from '../core/learning/index.ts';
import type { Content as LearnContent } from '../core/content/types.ts';
import type { game as Game } from '../game.svelte.ts';

type G = typeof Game;
type StrandId = 'r' | 's' | 'm';
export type HookOpts = {
  seed(n: number): void;
  ready(): Promise<void>;
  wake(): Promise<void>;
  setScaffold(step: string, level: 1 | 2 | 3): void;
};
/** Names from the name bank, so test babies say their names when the clips exist. */
const TEST_NAMES = ['Tam', 'Pip', 'Dot', 'Fen', 'Bex', 'Sam', 'Mia', 'Max', 'Kit', 'Lin'];
/** platform's test-hook.ts keeps the clock offset under this key, so a set time survives a reload. */
const NOW_KEY = 'mmh-test-now-offset';

export function registerGameHooks(game: G, o: HookOpts): void {
  /** R44: every handler that touches the store waits for it, so flows may call hooks before Play. */
  const after = <A extends unknown[]>(fn: (...a: A) => unknown) => async (...a: A) => { await o.ready(); return fn(...a); };
  const learner = () => game.learner as unknown as Learner;
  const content = () => game.content as unknown as LearnContent;

  registerState('herd', () => game.world?.herd.length ?? 0);
  registerState('visit', () => game.visit);
  registerState('visitIndex', () => game.world?.visitIndex ?? 0);
  registerState('lastLog', () => {
    const all = (game.data?.allEvents() ?? []) as readonly { type: string }[];
    for (let i = all.length - 1; i >= 0; i--) if (all[i].type === 'learn.result') return all[i];
    return null;
  });
  registerState('placement', () => (game.world
    ? { r: isPlacing(learner(), 'r'), s: isPlacing(learner(), 's'), m: isPlacing(learner(), 'm') }
    : null));

  registerHook('seed', (n: number) => o.seed(n));
  registerHook('setStep', after((strand: StrandId, step: string) =>
    game.dispatch({ type: 'game/override', payload: setCurrentOverride(learner(), content(), strand, step) })));
  registerHook('setScaffold', (_strand: StrandId, step: string, level: 1 | 2 | 3) => o.setScaffold(step, level));
  registerHook('pass', after((strand: StrandId, step: string) => game.dispatch({ type: 'game/pass', strand, step })));
  registerHook('announce', after((opening: string) => game.dispatch({ type: 'game/announce', opening })));

  // The current scene's hook. I-3b adds the activeMoment() fallback for answer, wrong and idle.
  const route = (name: 'answer' | 'wrong' | 'idle') => async (...args: unknown[]) => {
    await o.ready();
    const h = sceneHook(game.scene);
    if (h && typeof h[name] === 'function') return h[name](...args);
    throw new Error(`no scene hook ${name} in scene ${game.scene}`);
  };
  registerHook('answer', route('answer'));
  registerHook('wrong', route('wrong'));     // wrong(kind?): 'one-for-many', 'many-for-one', 'count-low', 'count-high', 'ending', ...
  registerHook('idle', route('idle'));
  /** aria-label of the right answer, for real taps in flows; null when the scene names none. */
  registerHook('target', async () => {
    await o.ready();
    const h = sceneHook(game.scene);
    return h && typeof h.target === 'function' ? ((await h.target()) ?? null) : null;
  });

  // Platform's importFixture loads tests/fixtures/<name>.json and calls this handler with (data, name).
  registerHook('importFixture', after(async (data: unknown) => {
    const { v2Deps } = await import('./v2-deps.ts');
    const d = game.data;
    if (!d) throw new Error('store not open');
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const out = await d.importText(text, v2Deps);
    game.markRefolded();
    return out;
  }));
  registerHook('herd', after(async (n: number) => {
    const stamp = clock.now().toString(36);
    for (let i = 0; i < n; i++) {
      game.dispatch({ type: 'hb.test-hatch', baby: `t${stamp}${i}`, name: TEST_NAMES[i % TEST_NAMES.length] });
    }
    return game.world.herd.length;
  }));
  /** Ends the visit as goodnight, the idle timeout or a long hide would (R45): visit.end, then the rest scene. */
  registerHook('endVisit', after((reason: 'goodnight' | 'idle' | 'hidden' = 'goodnight') => { game.endVisit(reason); return game.visit; }));
  /** visit.end, clock +6 h, then the next visit starts as the rest scene's moon would start it. */
  registerHook('newVisit', after(async () => {
    game.endVisit('goodnight');
    clock.advance(6 * 3_600_000);
    try { sessionStorage.setItem(NOW_KEY, String(clock.offset())); } catch { /* storage blocked */ }
    await o.wake();
    return game.visit;
  }));
}
