// The test hook registry (contracts C10). Shipped in every build so scenes and the store can register freely.
// Only non-production builds read it (src/test-hook.ts installs window.__game).
import { timing } from './timing.ts';

export type HookFn = (...args: any[]) => unknown;
export type SceneHook = { answer(): unknown; wrong(): unknown; [k: string]: (...a: any[]) => unknown };

const handlers = new Map<string, HookFn>();
const states = new Map<string, () => unknown>();
const extensions = new Map<string, object>();
const sceneHooks = new Map<string, SceneHook>();
let seed: number | null = null;

export function registerHook(name: string, fn: HookFn): () => void {
  handlers.set(name, fn);
  return () => { if (handlers.get(name) === fn) handlers.delete(name); };
}

/** True when a handler with this name is registered. */
export const hasHook = (name: string): boolean => handlers.has(name);

export async function callHook(name: string, args: unknown[]): Promise<unknown> {
  const fn = handlers.get(name);
  if (!fn) throw new Error(`[hook] no handler for ${name}`);
  return await fn(...args);
}

export function registerState(key: string, fn: () => unknown): () => void {
  states.set(key, fn);
  return () => { if (states.get(key) === fn) states.delete(key); };
}

/** Every registered state value. A provider that throws reads as null, so state() always answers. */
export function hookStates(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, fn] of states) {
    try {
      out[k] = fn();
    } catch (e) {
      console.warn(`[hook] state ${k} failed`, e);
      out[k] = null;
    }
  }
  return out;
}

export function registerHookExtension(key: string, value: object): void {
  extensions.set(key, value);
  const g = (globalThis as { __game?: Record<string, unknown> }).__game;
  if (g) g[key] = value;
}

export const hookExtensions = (): Map<string, object> => extensions;

/** The current scene's answer and wrong (and any other method, such as idle or target). Scenes register on mount. */
export function registerSceneHook(scene: string, hook: SceneHook): () => void {
  sceneHooks.set(scene, hook);
  return () => { if (sceneHooks.get(scene) === hook) sceneHooks.delete(scene); };
}

export function sceneHook(scene: string): SceneHook | null {
  return sceneHooks.get(scene) ?? null;
}

/** The seed set by window.__game.seed(n). Null in production and until a flow sets one. */
export const testSeed = (): number | null => seed;

/** Called by src/test-hook.ts before it forwards seed(n) to the store's handler. */
export function setTestSeed(n: number | null): void {
  seed = n === null || !Number.isFinite(n) ? null : n;
}

/** True after window.__game.fast(true): the timing speed is 0. */
export const isFast = (): boolean => timing.speed === 0;
