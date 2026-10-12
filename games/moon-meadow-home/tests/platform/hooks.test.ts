import { describe, it, expect, afterEach } from 'vitest';
import {
  registerHook, callHook, registerState, hookStates, registerHookExtension, hookExtensions,
  registerSceneHook, sceneHook, testSeed, setTestSeed, isFast, hasHook,
} from '../../src/platform/hooks.ts';
import { setFast } from '../../src/platform/timing.ts';

afterEach(() => { setFast(false); setTestSeed(null); });

describe('hook registry', () => {
  it('calls the registered handler with its arguments', async () => {
    const off = registerHook('answer', (x: number) => x + 1);
    expect(await callHook('answer', [41])).toBe(42);
    off();
  });
  it('says whether a handler is registered', () => {
    expect(hasHook('herd')).toBe(false);
    const off = registerHook('herd', () => 1);
    expect(hasHook('herd')).toBe(true);
    off();
    expect(hasHook('herd')).toBe(false);
  });
  it('throws a clear error when nothing is registered', async () => {
    await expect(callHook('wrong', [])).rejects.toThrow('[hook] no handler for wrong');
  });
  it('an old unregister does not remove a newer handler', async () => {
    const offOld = registerHook('idle', () => 'old');
    const offNew = registerHook('idle', () => 'new');
    offOld();
    expect(await callHook('idle', [])).toBe('new');
    offNew();
  });
  it('merges state providers', () => {
    const off = registerState('demo', () => ({ presses: 2 }));
    expect(hookStates()).toEqual({ demo: { presses: 2 } });
    off();
    expect(hookStates()).toEqual({});
  });
  it('a state provider that throws does not break the others', () => {
    const offA = registerState('bad', () => { throw new Error('boom'); });
    const offB = registerState('good', () => 1);
    expect(hookStates()).toEqual({ bad: null, good: 1 });
    offA();
    offB();
  });
  it('sets an extension on window.__game when it exists, and remembers it for later', () => {
    const g = globalThis as { __game?: Record<string, unknown> };
    g.__game = {};
    const places = { open: () => 1 };
    registerHookExtension('places', places);
    expect(g.__game.places).toBe(places);
    expect(hookExtensions().get('places')).toBe(places);
    delete g.__game;
  });
});

describe('scene hooks', () => {
  it('finds the hook of a scene and forgets it on unregister', () => {
    const hook = { answer: () => 'yes', wrong: () => 'no' };
    const off = registerSceneHook('nest', hook);
    expect(sceneHook('nest')).toBe(hook);
    expect(sceneHook('meadow')).toBeNull();
    off();
    expect(sceneHook('nest')).toBeNull();
  });
  it('an old scene unregister does not remove a newer mount of the same scene', () => {
    const offOld = registerSceneHook('rest', { answer: () => 1, wrong: () => 0 });
    const fresh = { answer: () => 2, wrong: () => 0 };
    const offNew = registerSceneHook('rest', fresh);
    offOld();
    expect(sceneHook('rest')).toBe(fresh);
    offNew();
  });
});

describe('test seed and fast mode', () => {
  it('has no seed until the test hook sets one', () => {
    expect(testSeed()).toBeNull();
    setTestSeed(7);
    expect(testSeed()).toBe(7);
    setTestSeed(null);
    expect(testSeed()).toBeNull();
  });
  it('is fast only when the timing speed is zero', () => {
    expect(isFast()).toBe(false);
    setFast(true);
    expect(isFast()).toBe(true);
    setFast(false);
    expect(isFast()).toBe(false);
  });
});
