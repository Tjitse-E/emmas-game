// Boot and start. main.ts hands its start-up work (audio index, art manifest) to boot(); the Play button
// shows when that work has settled, or after BOOT_WAIT_MS at the latest, so a slow or failed load never hides Play (R49).
import { router } from './router.svelte.ts';
import { recordPersist } from './pwa.ts';
import { audio } from '../audio/index.ts';

export type StartTarget = { id: string; params?: Record<string, unknown> };

/** ready: Play can show. started: the first scene was chosen. starting: Play was tapped and the start runs. */
export const bootState = $state({ ready: false, started: false, starting: false });

export const BOOT_WAIT_MS = 8000;

let markReady: () => void = () => {};
const readyPromise = new Promise<void>((resolve) => { markReady = resolve; });
let settled: Promise<unknown> = Promise.resolve();

const later = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Starts the boot work. A task that fails is logged and ignored: every picture and clip has a fallback. */
export function boot(tasks: Promise<unknown>[], waitMs = BOOT_WAIT_MS): Promise<void> {
  settled = Promise.allSettled(tasks).then((results) => {
    for (const r of results) if (r.status === 'rejected') console.warn('[boot] a start-up task failed', r.reason);
  });
  void Promise.race([settled, later(waitMs)]).then(() => {
    bootState.ready = true;
    markReady();
  });
  return readyPromise;
}

/** Resolves when Play can show. */
export const whenReady = (): Promise<void> => readyPromise;

let handler: () => StartTarget | Promise<StartTarget> = () => ({ id: 'meadow' });

/** The store decides the first scene (Moving Day, a new player's welcome, or the meadow). */
export function setStartHandler(fn: () => StartTarget | Promise<StartTarget>): void {
  handler = fn;
}

/** Play: unlocks audio, asks for persistent storage, waits for boot, asks the store for the first scene and shows it. */
export async function startGame(): Promise<void> {
  if (bootState.started || bootState.starting) return;
  bootState.starting = true;
  try {
    void audio.unlock();
    void recordPersist();
    await readyPromise;
    // A load that was still running when Play showed gets a little more time before the first scene speaks.
    await Promise.race([settled, later(4000)]);
    let first: StartTarget;
    try {
      first = await handler();
    } catch (e) {
      console.error('[boot] the start handler failed; going to the meadow', e);
      first = { id: 'meadow' };
    }
    bootState.started = true;
    await router.reset(first.id, first.params ?? {});
  } finally {
    bootState.starting = false;
  }
}
