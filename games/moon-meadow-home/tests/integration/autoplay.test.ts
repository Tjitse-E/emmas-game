import { describe, expect, it } from 'vitest';
import { autoplay, judgeLog } from '../../src/game/autoplay.ts';

const all = () => true;

describe('judgeLog', () => {
  it('passes when every scene said a goal and nothing stuck', () => {
    expect(judgeLog({ scenes: [{ id: 'nest', said: ['g-egg'], ms: 900 }, { id: 'naming', said: ['g-bells'], ms: 700 }], stuck: null }, all)).toEqual([]);
  });
  it('names a silent scene and a stuck scene', () => {
    expect(judgeLog({ scenes: [{ id: 'wish', said: [], ms: 500 }], stuck: 'stalls' }, all)).toEqual(['wish has no spoken goal', 'stuck in stalls']);
  });
  it('counts a goal only when its clip exists (R52), and the meadow needs a goal too (R54)', () => {
    const log = { scenes: [{ id: 'nest', said: ['g-egg'], ms: 900 }, { id: 'meadow', said: [], ms: 400 }], stuck: null };
    expect(judgeLog(log, (id) => id !== 'g-egg')).toEqual(['nest has no spoken goal', 'meadow has no spoken goal']);
  });
});

/**
 * A fake game on a fake clock. startHeartbeat() and each answer() move one step along `path` and say
 * that scene's goal; goodnight is its own scene and its answer ends the visit in the rest scene.
 * Like the router, it tells onScene listeners about a change before the new scene speaks.
 */
function fakeGame(path: string[], o: { stuckAt?: string; hangAt?: string } = {}) {
  let i = 0;
  let t = 0;
  let open = true;
  let scene = 'meadow';
  const said: string[] = [];
  const listeners = new Set<(id: string) => void>();
  const go = (id: string) => {
    scene = id;
    for (const fn of listeners) fn(id);
    if (!['hatch', 'stalls', 'rest'].includes(id)) said.push(`g-${id}`);
  };
  return {
    scene: () => scene,
    said: () => said,
    answer: async () => {
      if (scene === o.hangAt) return new Promise<void>(() => {});
      if (scene === o.stuckAt) return;
      if (scene === 'goodnight') { go('rest'); open = false; return; }
      if (scene === 'meadow' || scene === 'rest' || i >= path.length) throw new Error('no moment open');
      go(path[i++]);
    },
    startHeartbeat: async () => { go(path[i++]); },
    startGoodnight: async () => { go('goodnight'); },
    visitOpen: () => open,
    sleep: async (ms: number) => { t += ms; },
    now: () => t,
    onScene: (fn: (id: string) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    listeners,
  };
}

describe('autoplay', () => {
  it('plays a heartbeat and records what each scene said', async () => {
    const log = await autoplay(fakeGame(['nest', 'hatch', 'naming', 'wish', 'stalls', 'meadow']), { heartbeats: 1, goodnight: false });
    expect(log.stuck).toBeNull();
    expect(log.scenes.map((s) => s.id)).toEqual(['meadow', 'nest', 'hatch', 'naming', 'wish', 'stalls', 'meadow']);
    expect(log.scenes.find((s) => s.id === 'nest')?.said).toEqual(['g-nest']);
    expect(log.scenes.at(-1)?.said).toEqual(['g-meadow']);
    expect(judgeLog(log, all)).toEqual(['meadow has no spoken goal']); // the first meadow said nothing in the fake
  });

  it('plays two heartbeats, then goodnight ends the visit in the rest scene', async () => {
    const log = await autoplay(fakeGame(['nest', 'meadow', 'nest', 'meadow']), { heartbeats: 2, goodnight: true });
    expect(log.stuck).toBeNull();
    expect(log.scenes.map((s) => s.id)).toEqual(['meadow', 'nest', 'meadow', 'nest', 'meadow', 'goodnight', 'rest']);
    expect(log.scenes.find((s) => s.id === 'goodnight')?.said).toEqual(['g-goodnight']);
    expect(judgeLog(log, all)).toEqual(['meadow has no spoken goal']);
  });

  it('unsubscribes from scene changes when it ends', async () => {
    const g = fakeGame(['nest', 'meadow']);
    await autoplay(g, { heartbeats: 1, goodnight: false });
    expect(g.listeners.size).toBe(0);
  });

  it('finishes a place visit when there are no heartbeats', async () => {
    const g = fakeGame(['pond', 'meadow']);
    await g.startHeartbeat();
    const log = await autoplay({ ...g, onScene: undefined }, { heartbeats: 0, goodnight: false }); // polling only
    expect(log.stuck).toBeNull();
    expect(log.scenes.map((s) => s.id)).toEqual(['pond', 'meadow']);
  });

  it('records the scene it got stuck in', async () => {
    const log = await autoplay(fakeGame(['nest', 'wish', 'meadow'], { stuckAt: 'wish' }), { heartbeats: 1, goodnight: false, maxMs: 1000 });
    expect(log.stuck).toBe('wish');
    expect(judgeLog(log, all)).toContain('stuck in wish');
  });

  it('does not hang when an answer never settles', async () => {
    const log = await autoplay(fakeGame(['nest', 'wish', 'meadow'], { hangAt: 'wish' }), { heartbeats: 1, goodnight: false, maxMs: 1000 });
    expect(log.stuck).toBe('wish');
  });
});
