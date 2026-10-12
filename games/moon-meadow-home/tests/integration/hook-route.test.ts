// The test hook's answer, wrong, idle and target: the current scene's hook first, else the moment on screen (R14, I-3b).
import { afterEach, describe, expect, it } from 'vitest';
import { callHook, registerHook, registerSceneHook } from '../../src/platform/hooks.ts';
import { registerGameHooks } from '../../src/game/hook-handlers.ts';
import { activeMoment, createMoment, type MomentDeps } from '../../src/ui/moment.ts';

let scene = 'meadow';
const fakeGame = { get scene() { return scene; }, world: null, data: null } as never;
registerGameHooks(fakeGame, { seed: () => {}, ready: async () => {}, wake: async () => {}, setScaffold: () => {} });

const deps = (): MomentDeps => ({
  now: () => 0, setTimer: () => () => {}, say: async () => {}, act: () => {}, dispatch: () => {}, hasClip: () => true,
});

afterEach(() => { activeMoment()?.dispose(); scene = 'meadow'; });

describe('hook routing falls back to the active moment', () => {
  it('answer, wrong, idle and target reach the moment when the scene has no hook', async () => {
    const calls: string[] = [];
    const m = createMoment({
      place: 'bath-pond', goal: ['g-x'], target: () => 'hat',
      hookAnswer: () => calls.push('answer'), hookWrong: (k) => calls.push(`wrong:${k ?? ''}`),
    }, deps());
    await m.start();
    scene = 'bath-pond-no-hook';
    await callHook('answer', []);
    await callHook('wrong', ['count-low']);
    await callHook('idle', []);
    expect(calls).toEqual(['answer', 'wrong:count-low']);
    expect(m.state.level).toBeGreaterThan(0);
    expect(await callHook('target', [])).toBe('hat');
  });

  it('the scene hook wins over the moment', async () => {
    const calls: string[] = [];
    await createMoment({ place: 'nest', goal: [], hookAnswer: () => calls.push('moment') }, deps()).start();
    scene = 'routed';
    const off = registerSceneHook('routed', { answer: () => calls.push('scene'), wrong: () => {}, target: () => 'egg' });
    await callHook('answer', []);
    expect(calls).toEqual(['scene']);
    expect(await callHook('target', [])).toBe('egg');
    off();
  });

  it('a scene hook without a target leaves the target to the moment', async () => {
    await createMoment({ place: 'meadow', goal: [], target: () => 'nest' }, deps()).start();
    scene = 'routed2';
    const off = registerSceneHook('routed2', { answer: () => {}, wrong: () => {}, target: () => null });
    expect(await callHook('target', [])).toBe('nest');
    off();
  });

  it('answer throws and target is null when there is neither a scene hook nor a moment', async () => {
    scene = 'empty';
    await expect(callHook('answer', [])).rejects.toThrow(/no moment/);
    expect(await callHook('target', [])).toBeNull();
  });

  it('goodnight hands answer and target to its embedded sky naming while that naming is open', async () => {
    const calls: string[] = [];
    let stage = 'rollcall';
    scene = 'goodnight';
    const offs = [
      registerHook('goodnight.stage', () => stage),
      registerSceneHook('goodnight', { answer: () => calls.push('door'), wrong: () => {}, target: () => 'door 1' }),
      registerSceneHook('naming', { answer: () => calls.push('name'), wrong: () => {}, target: () => 'bell Sam' }),
    ];
    await callHook('answer', []);
    stage = 'sky-name';
    await callHook('answer', []);
    expect(calls).toEqual(['door', 'name']);
    expect(await callHook('target', [])).toBe('bell Sam');
    for (const off of offs) off();
  });
});
