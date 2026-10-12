import { describe, expect, it } from 'vitest';
import { activeMoment, createMoment, type MomentDeps, type MomentOpts } from '../../src/ui/moment.ts';
import type { PlaceAction } from '../../src/core/places/actions.ts';

function harness(o: { missing?: string[] } = {}) {
  let t = 0;
  const timers: { at: number; fn: () => void; dead: boolean }[] = [];
  const log: string[] = [];
  const actions: PlaceAction[] = [];
  const deps: MomentDeps = {
    now: () => t,
    setTimer: (fn, ms) => { const x = { at: t + ms, fn, dead: false }; timers.push(x); return () => { x.dead = true; }; },
    say: async (ids) => { log.push(`say:${ids.join(',')}`); },
    act: () => log.push('act'),
    dispatch: (a) => actions.push(a),
    hasClip: (id) => !(o.missing ?? []).includes(id),
    show: (target) => log.push(`beam:${String(target)}`),
    demo: async (target) => { log.push(`demo:${String(target)}`); },
    clear: () => log.push('clear'),
  };
  const advance = (ms: number) => {
    t += ms;
    for (const x of [...timers].sort((a, b) => a.at - b.at)) if (!x.dead && x.at <= t) { x.dead = true; x.fn(); }
  };
  return { deps, log, actions, advance, time: () => t };
}

const opts = (log: string[], extra: Partial<MomentOpts> = {}): MomentOpts => ({
  strand: 'r', step: 'R19', place: 'bath-pond', goal: ['pd-wish-goal'],
  focused: () => { log.push('focused'); }, ghost: () => { log.push('ghost'); },
  hookAnswer: () => log.push('hook-answer'), hookWrong: (kind) => log.push(`hook-wrong${kind ? `:${kind}` : ''}`),
  ...extra,
});

describe('moment controller', () => {
  it('says the goal on start and becomes the active moment', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    expect(h.log).toEqual(['say:pd-wish-goal']);
    expect(activeMoment()).toBe(m);
    m.dispose();
  });

  it('repeats the goal after 10 s idle on reading and flags the second idle', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    h.advance(10_000);
    h.advance(10_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'say:pd-wish-goal', 'focused']);
    expect(h.actions).toEqual([{ type: 'place/idle', strand: 'r', step: 'R19', place: 'bath-pond', level: 2 }]);
    m.dispose();
  });

  it('waits 15 s on spelling and maths', async () => {
    const h = harness();
    const m = createMoment(opts(h.log, { strand: 's', step: 'S10', place: 'toy-shelf' }), h.deps);
    await m.start();
    h.advance(10_000);
    expect(h.log).toEqual(['say:pd-wish-goal']);
    h.advance(5_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'say:pd-wish-goal']);
    m.dispose();
  });

  it('restarts the idle timer on a touch', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    h.advance(9_000);
    m.touch();
    h.advance(9_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'act']);
    m.dispose();
  });

  it('runs the focused hint on a miss and the ghost on a second miss', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    m.miss();
    m.miss();
    expect(h.log).toEqual(['say:pd-wish-goal', 'act', 'focused', 'act', 'ghost']);
    expect(m.answer().result).toBe('helped');
  });

  it('answers with the result and stops being active', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    h.advance(3_000);
    expect(m.answer()).toEqual({ result: 'first', ms: 3_000 });
    expect(activeMoment()).toBeNull();
    h.advance(60_000);
    expect(h.log).toEqual(['say:pd-wish-goal', 'act', 'clear']);
  });

  it('keeps a miss followed by a right answer as miss (L1)', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    m.miss();
    expect(m.answer().result).toBe('miss');
  });

  it('replays the goal without changing the result', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    await m.replay();
    expect(m.answer().result).toBe('first');
  });

  it('lets the test hook answer, miss and idle like a touch', async () => {
    const h = harness();
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    m.hookIdle();
    m.hookWrong('one-for-many');
    m.hookAnswer();
    expect(h.log).toEqual(['say:pd-wish-goal', 'say:pd-wish-goal', 'act', 'hook-wrong:one-for-many', 'act', 'hook-answer']);
    m.dispose();
  });

  it('counts a hook wrong as a miss when the scene gives no wrong of its own', async () => {
    const h = harness();
    const m = createMoment(opts(h.log, { hookWrong: undefined }), h.deps);
    await m.start();
    m.hookWrong();
    expect(h.log).toEqual(['say:pd-wish-goal', 'act', 'act', 'focused']);
    expect(m.answer().result).toBe('miss');
  });

  it('names the right answer for the test hook', async () => {
    const h = harness();
    const label = createMoment(opts(h.log, { target: () => 'baby Pip' }), h.deps);
    expect(label.target()).toBe('baby Pip');
    const point = createMoment(opts(h.log, { target: () => ({ x: 1, y: 2 }) }), h.deps);
    expect(point.target()).toBeNull();
    const none = createMoment(opts(h.log), h.deps);
    expect(none.target()).toBeNull();
  });

  it('points the moonbeam and taps the ghost on the target when the scene brings no hints of its own', async () => {
    const h = harness();
    const m = createMoment(opts(h.log, { focused: undefined, ghost: undefined, target: () => 'door 4' }), h.deps);
    await m.start();
    m.miss();
    m.miss();
    expect(h.log).toEqual(['say:pd-wish-goal', 'act', 'beam:door 4', 'act', 'demo:door 4']);
    m.dispose();
  });

  it('opens at the focused hint with one ghost demo when the goal clip is missing (R51)', async () => {
    const h = harness({ missing: ['pd-wish-goal'] });
    const m = createMoment(opts(h.log), h.deps);
    await m.start();
    expect(h.log).toEqual(['focused', 'ghost', 'say:pd-wish-goal']);
    expect(m.state.level).toBe(2);
    h.advance(10_000);
    expect(h.log.filter((x) => x === 'ghost')).toHaveLength(1);
    expect(m.answer().result).toBe('helped');
  });

  it('runs the ladder without a strand and never flags idle then', async () => {
    const h = harness();
    const m = createMoment({ place: 'moving-day', goal: ['num-tap-door-4'], target: () => 'door 4' }, h.deps);
    await m.start();
    h.advance(10_000);
    h.advance(10_000);
    expect(h.log).toEqual(['say:num-tap-door-4', 'say:num-tap-door-4', 'beam:door 4']);
    expect(h.actions).toEqual([]);
    m.dispose();
  });
});
