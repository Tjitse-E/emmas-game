import { describe, expect, it } from 'vitest';
import { chooseStart, decideStart, startFacts } from '../../src/game/start.ts';

const ev = (type: string, extra: Record<string, unknown> = {}) => ({ type, ...extra });

describe('decideStart (core K7, R46)', () => {
  it('a player who has hatched or learned goes to the meadow', () => {
    expect(decideStart({ played: true, imported: false, v2: null, movingDayDone: false })).toEqual({ id: 'meadow' });
  });
  it('a start with a v2 save on this origin and no play goes to the import', () => {
    expect(decideStart({ played: false, imported: false, v2: '{"herd":[]}', movingDayDone: false })).toEqual({ id: 'import-v2' });
  });
  it('a start without a v2 save and without play is a new player, also after a reload during the welcome', () => {
    expect(decideStart({ played: false, imported: false, v2: null, movingDayDone: false })).toEqual({ id: 'welcome' });
  });
  it('an imported herd that never had Moving Day plays it', () => {
    expect(decideStart({ played: true, imported: true, v2: null, movingDayDone: false })).toEqual({ id: 'moving-day' });
  });
  it('an imported herd after Moving Day goes to the meadow', () => {
    expect(decideStart({ played: true, imported: true, v2: null, movingDayDone: true })).toEqual({ id: 'meadow' });
  });
});

describe('startFacts', () => {
  it('only egg.hatched, import.v2 and learn.result count as play', () => {
    const f = startFacts([ev('visit.start'), ev('place.enter'), ev('audio.missing'), ev('opening.announced', { opening: 'welcome' }), ev('visit.end')]);
    expect(f).toEqual({ played: false, imported: false, nonV2Hatch: false });
  });
  it('a v2 import is play but not a non-v2 hatch, so a later v2 read is still skipped only by import.v2', () => {
    expect(startFacts([ev('import.v2'), ev('egg.hatched', { source: 'nest' })])).toEqual({ played: true, imported: true, nonV2Hatch: true });
  });
  it('a learning result alone is play', () => {
    expect(startFacts([ev('learn.result')])).toEqual({ played: true, imported: false, nonV2Hatch: false });
  });
});

describe('chooseStart', () => {
  const store = (events: { type: string; source?: string }[], status = 'imported', announced: string[] = []) => {
    const calls: string[] = [];
    return {
      calls,
      data: {
        allEvents: () => events,
        importText: async (t: string) => { calls.push(t); return { kind: 'v2', status }; },
      },
      world: { announced: new Set(announced) },
      markRefolded: () => { calls.push('refold'); },
    };
  };

  it('imports a v2 save found on this origin and plays Moving Day', async () => {
    const g = store([{ type: 'visit.start' }]);
    expect(await chooseStart(g, () => '{"v":2}')).toEqual({ id: 'moving-day' });
    expect(g.calls).toEqual(['{"v":2}', 'refold']);
  });
  it('an empty v2 save falls back to the welcome', async () => {
    expect(await chooseStart(store([], 'empty'), () => '{"v":2}')).toEqual({ id: 'welcome' });
  });
  it('a player who hatched in v3 first never reads v2 again', async () => {
    const g = store([{ type: 'egg.hatched', source: 'nest' }]);
    expect(await chooseStart(g, () => { throw new Error('read'); })).toEqual({ id: 'meadow' });
    expect(g.calls).toEqual([]);
  });
  it('a reload during Moving Day plays it again; after it, the meadow', async () => {
    expect(await chooseStart(store([{ type: 'import.v2' }]), () => null)).toEqual({ id: 'moving-day' });
    expect(await chooseStart(store([{ type: 'import.v2' }], 'imported', ['moving-day']), () => null)).toEqual({ id: 'meadow' });
  });
});
