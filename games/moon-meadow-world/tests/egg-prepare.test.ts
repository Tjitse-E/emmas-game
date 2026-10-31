// The egg plans' fitting at a refill in the browser (2.4.0, docs/v4/2.4.md section 5.3; src/game/maths.ts
// prepareEggPlans): one kind per idle task after the bubbles have popped in, never while she walks or a place runs, with
// what the play has asked at that time; a newer refill drops the older one's queue.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fits = vi.hoisted(() => [] as { kind: string; band: string; facts: number; at: number }[]);
vi.mock('../src/content/eggs', async (orig) => ({
  ...(await orig<typeof import('../src/content/eggs')>()),
  prepareEggPlan: (kind: string, band: string, asked?: { facts: string[] }) => void fits.push({ kind, band, facts: asked?.facts.length ?? -1, at: Math.round(performance.now()) }),
}));

const { prepareEggPlans } = await import('../src/game/maths');
const { startMaths } = await import('../src/game/band');
type Game = Parameters<typeof prepareEggPlans>[0];

function game(shown: string[]) {
  const princess = { moving: false };
  const hub = { shown, running: null as string | null };
  const g = { maths: startMaths(null), hub, actors: { princess } } as unknown as Game;
  return { g, princess, hub };
}
const run = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
  vi.stubGlobal('window', {});
  fits.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('preparing the egg plans at a refill', () => {
  it('fits one kind per task once the bubbles have popped in', async () => {
    const { g } = game(['egg', 'ride', 'shore', 'picnic']);
    prepareEggPlans(g);
    await run(1700);
    expect(fits).toEqual([]);
    await run(400);
    expect(fits.map((f) => f.kind)).toEqual(['warm', 'star', 'snow']);
    expect(new Set(fits.map((f) => f.at)).size).toBe(3);
  });

  it('never fits while she walks or a place runs, and fits with what the play asked by then', async () => {
    const { g, princess, hub } = game(['egg', 'ride']);
    prepareEggPlans(g);
    princess.moving = true;
    await run(6000);
    expect(fits).toEqual([]);
    princess.moving = false;
    hub.running = 'picnic';
    g.maths.asked.facts.push('num-take-9-5');
    await run(3000);
    expect(fits).toEqual([]);
    hub.running = null;
    await run(1000);
    expect(fits.map((f) => [f.kind, f.facts])).toEqual([['warm', 1], ['star', 1]]);
  });

  it('drops an older refill\'s queue when a newer refill comes', async () => {
    const { g, princess, hub } = game(['egg', 'ride']);
    prepareEggPlans(g);
    princess.moving = true;
    await run(2500);
    hub.shown = ['shore'];
    prepareEggPlans(g);
    princess.moving = false;
    await run(3000);
    expect(fits.map((f) => f.kind)).toEqual(['snow']);
  });
});
