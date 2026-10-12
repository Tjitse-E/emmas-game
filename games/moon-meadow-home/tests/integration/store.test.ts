// The store in Node: memory backend, no window. Covers readiness, visits, dispatch, hearts and the rest scene.
import { describe, expect, it } from 'vitest';
import { game, ready, beginVisit } from '../../src/game.svelte.ts';
import { router } from '../../src/platform/router.svelte.ts';
import { openGameData } from '../../src/save/game-data.ts';
import { memoryBackend } from '../../src/save/backend.ts';
import { createGameFolder } from '../../src/core/world/index.ts';
import type { CoreState } from '../../src/core/world/index.ts';
import type { GameEvent, GameEventDraft } from '../../src/core/events.ts';
import type { Slice } from '../../src/core/fold/engine.ts';
import { hatch } from '../helpers/events.ts';

describe('the game store', () => {
  it('opens at module load and folds an empty world', async () => {
    await ready();
    expect(game.world.herd).toEqual([]);
    expect(game.visitOpen).toBe(false);
    expect(game.version).toBeGreaterThan(0);
  });

  it('opens a visit, writes events with it and builds the world after each fold', async () => {
    await ready();
    beginVisit();
    expect(game.visitOpen).toBe(true);
    const v = game.visit as string;
    expect(game.world.visit).toBe(v);
    expect(game.world.visitIndex).toBe(1);
    const before = game.version;
    game.dispatch({ type: 'hb.test-hatch', baby: 'b1', name: 'Pip' });
    expect(game.version).toBeGreaterThan(before);
    expect(game.world.herd.map((b) => b.name)).toEqual(['Pip']);
    const [care1] = game.dispatch({ type: 'place/care', baby: 'b1', station: 'bath' });
    const [care2] = game.dispatch({ type: 'place/care', baby: 'b1', station: 'brush' });
    expect(care1).toMatchObject({ heart: true });
    expect(care2).toMatchObject({ heart: false });
    const [idle] = game.dispatch({ type: 'place/idle', strand: 'r', step: 'R19', place: 'nest', level: 1 });
    expect(idle).toMatchObject({ visit: v });
  });

  it('the plan context carries the learner, the content and the asset checks', async () => {
    await ready();
    const ctx = game.planContext();
    expect(ctx.c).toBe(game.content);
    expect(ctx.l).toBe(game.learner);
    expect(ctx.assets.picture('no-such-picture')).toBe(false);
    expect(ctx.testScaffold).toBeUndefined();
  });

  it('writes place events on scene changes inside a visit', async () => {
    await ready();
    void router.reset('nest');
    void router.go('meadow');
    const types = game.data!.allEvents().slice(-3).map((e) => `${e.type}:${'place' in e ? e.place : ''}`);
    expect(types).toEqual(['place.enter:nest', 'place.leave:nest', 'place.enter:meadow']);
  });

  it('endVisit writes visit.end, closes the visit and rests on the night meadow (R45)', async () => {
    await ready();
    const v = game.visit;
    game.endVisit('goodnight');
    const tail = game.data!.allEvents().slice(-2);
    expect(tail.map((e) => e.type)).toEqual(['place.leave', 'visit.end']);
    expect(tail[1]).toMatchObject({ visit: v, reason: 'goodnight' });
    expect(game.visitOpen).toBe(false);
    expect(router.current?.id).toBe('rest');
    game.endVisit('idle');   // a second end is a no-op
    expect(game.data!.allEvents().at(-1)?.type).toBe('visit.end');
    expect(game.data!.allEvents().filter((e) => e.type === 'visit.end')).toHaveLength(1);
  });
});

// docs/v3/next/plan.md 3.3 and N9: the maths lift is a learn.override that reconcile returns. The store commits it
// next to the facts, once per round, and stops when the folded state shows it.
describe('the store commits the maths lift from reconcile', () => {
  type Lift = { overrides: number };
  const liftSlice: Slice<'lift', Lift> = {
    name: 'lift', version: 1,
    init: () => ({ overrides: 0 }),
    apply: (st, ev: GameEvent) => { if (ev.type === 'learn.override') st.overrides++; return st; },
  };
  const folder = createGameFolder([liftSlice]);
  type St = CoreState & { lift: Lift };
  const lift: GameEventDraft = { type: 'learn.override', op: 'set-current', strand: 'm', step: 'M12A', placed: ['M12'], side: [] };
  const passed: GameEventDraft = { type: 'step.passed', strand: 'm', step: 'M12' };
  const open = (reconcile: (s: St) => GameEventDraft[], backend = memoryBackend()) => {
    let t = 1_760_000_000_000;
    return openGameData<St>({ folder, contentHash: 'c1', codeVersion: 'b1', backend, now: () => (t += 1000), schedule: () => {}, reconcile });
  };
  const count = (evs: readonly GameEvent[], type: string) => evs.filter((e) => e.type === type).length;

  it('commits one override and one fact, then nothing more, also after a reopen', async () => {
    const reconcile = (s: St): GameEventDraft[] => [passed, ...(s.lift.overrides === 0 ? [lift] : [])];
    const backend = memoryBackend();
    const d = await open(reconcile, backend);
    const first = d.commit([hatch('b1')]);
    expect(first.map((e) => e.type)).toEqual(['egg.hatched', 'step.passed', 'learn.override']);
    expect(d.commit([hatch('b2')]).map((e) => e.type)).toEqual(['egg.hatched']);
    await d.flush();
    const again = await open(reconcile, backend);
    expect(again.commit([hatch('b3')]).map((e) => e.type)).toEqual(['egg.hatched']);
    expect(count(again.allEvents(), 'learn.override')).toBe(1);
    expect(count(again.allEvents(), 'step.passed')).toBe(1);
  });

  it('commits an override returned twice in one round once', async () => {
    const d = await open((s) => (s.lift.overrides === 0 ? [lift, { ...lift }] : []));
    d.commit([hatch('b1')]);
    expect(count(d.allEvents(), 'learn.override')).toBe(1);
  });
});
