// The store in Node: memory backend, no window. Covers readiness, visits, dispatch, hearts and the rest scene.
import { describe, expect, it } from 'vitest';
import { game, ready, beginVisit } from '../../src/game.svelte.ts';
import { router } from '../../src/platform/router.svelte.ts';

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
