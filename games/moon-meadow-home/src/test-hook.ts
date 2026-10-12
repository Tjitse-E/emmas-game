// window.__game (contracts C10). Only non-production builds load this file (main.ts).
// Platform owns the methods below; the store registers the handlers the forwards call (integration Task I-1).
import { route, router } from './platform/router.svelte.ts';
import { stage } from './platform/stage.svelte.ts';
import { timing, setFast } from './platform/timing.ts';
import { clock } from './platform/clock.ts';
import { emitTouch } from './platform/touch.ts';
import { callHook, hasHook, hookStates, hookExtensions, setTestSeed } from './platform/hooks.ts';
import { bootState, startGame } from './platform/boot.svelte.ts';
import { ghostState } from './ui/ghost-hand.svelte.ts';
import { beamState } from './ui/moonbeam.svelte.ts';
import { audio } from './audio/index.ts';
import type { HookState, TestHook } from './types/contracts.ts';

const NOW_KEY = 'mmh-test-now-offset';
const fixtures = import.meta.glob<unknown>('../tests/fixtures/*.json', { import: 'default' });

const text = (v: unknown): string => {
  if (v instanceof Error) return v.stack ?? v.message;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
};

export function installTestHook(): void {
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(`error: ${String(e.message)}`));
  window.addEventListener('unhandledrejection', (e) => errors.push(`unhandled: ${text(e.reason)}`));
  document.addEventListener('securitypolicyviolation', (e) => errors.push(`csp: ${e.violatedDirective} ${e.blockedURI}`));
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => { errors.push(args.map(text).join(' ')); consoleError(...args); };

  try {
    const saved = sessionStorage.getItem(NOW_KEY);
    if (saved !== null) clock.setOffset(Number(saved));
  } catch { /* storage blocked */ }

  let muted = false;
  const forward = (name: string) => (...args: unknown[]): Promise<unknown> => callHook(name, args);

  const game: TestHook & Record<string, unknown> = {
    state: (): HookState => ({
      scene: route.current?.id ?? 'gate',
      params: route.current?.params ?? {},
      fit: { ...stage.fit },
      speed: timing.speed,
      muted,
      now: clock.now(),
      secure: window.isSecureContext,
      ghost: ghostState.visible,
      moonbeam: beamState.rect ? { ...beamState.rect } : null,
      missingClips: [...audio.missing],
      herd: 0,
      lastLog: null,
      ready: bootState.ready,
      ...hookStates(),
    }),
    play: () => startGame(),
    jump: async (scene: string, params: Record<string, unknown> = {}) => {
      bootState.started = true;
      await router.reset(scene, params);
    },
    fast: (on: boolean) => { setFast(on); audio.setFast(on); },
    mute: (on: boolean) => { muted = on; audio.mute(on); },
    setNow: (ms: number | null) => {
      clock.setNow(ms);
      try { sessionStorage.setItem(NOW_KEY, String(clock.offset())); } catch { /* storage blocked */ }
    },
    /** testSeed() is set at once; the store's handler (when there is one) reseeds game.rng. */
    seed: async (n: number) => {
      setTestSeed(n);
      return hasHook('seed') ? callHook('seed', [n]) : null;
    },
    setStep: forward('setStep') as TestHook['setStep'],
    setScaffold: forward('setScaffold') as TestHook['setScaffold'],
    pass: forward('pass') as TestHook['pass'],
    answer: () => { emitTouch(); return callHook('answer', []); },
    wrong: (kind?: string) => { emitTouch(); return callHook('wrong', kind === undefined ? [] : [kind]); },
    idle: () => callHook('idle', []),
    target: forward('target') as TestHook['target'],
    pairForTest: forward('pairForTest') as TestHook['pairForTest'],
    herd: forward('herd') as TestHook['herd'],
    newVisit: forward('newVisit') as TestHook['newVisit'],
    announce: forward('announce') as TestHook['announce'],
    syncNow: forward('syncNow') as TestHook['syncNow'],
    importFixture: async (name: string) => {
      const load = fixtures[`../tests/fixtures/${name}.json`];
      if (!load) throw new Error(`[hook] no fixture ${name}`);
      return callHook('importFixture', [await load(), name]);
    },
    said: () => [...audio.said],
    audioMissing: () => [...audio.missing],
    errors: () => [...errors],
    call: (name: string, ...args: unknown[]) => callHook(name, args),
  };
  for (const [k, v] of hookExtensions()) game[k] = v;
  (globalThis as { __game?: unknown }).__game = game;
}
