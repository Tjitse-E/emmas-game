import { describe, it, expect } from 'vitest';
import { applyHeartbeat, HEARTBEAT_SAMPLE_ACTIONS, type LearnPayload } from '../../src/core/actions/heartbeat.ts';
import { applyNaming, NAMING_SAMPLE_ACTIONS } from '../../src/core/actions/naming.ts';
import { BANK } from '../naming/fixtures.ts';

const payload: LearnPayload = {
  type: 'learn.result', strand: 'm', step: 'M10', carrier: 'egg:two-stone', items: [{ id: 'm:pair:3-7', r: 'first' }],
  result: 'first', ms: 1200, scaffold: 2, error: null, place: 'nest', moment: 'egg-two-stone', slot: 'current', probe: false,
};
const colours = { body: '#ffffff', mane: '#ff7fbf', mane2: '#4fc3ff' };

describe('applyHeartbeat', () => {
  it('passes a learning payload through with its baby', () => {
    expect(applyHeartbeat({ type: 'hb.learn', payload, baby: 'b1' })).toEqual([{ ...payload, baby: 'b1' }]);
    expect(applyHeartbeat({ type: 'hb.learn', payload, baby: null })).toEqual([{ ...payload, baby: null }]);
  });
  it('turns a solved egg into its result and a hatch with all four traits', () => {
    const d = applyHeartbeat({ type: 'hb.hatched', baby: 'b1', egg: 'plain', kind: 'two-stone', breed: 'pebble', colours,
      traits: { shiny: true } as never, source: 'nest', learn: { payload, baby: 'b1' } });
    expect(d).toEqual([
      { ...payload, baby: 'b1' },
      { type: 'egg.hatched', baby: 'b1', egg: 'plain', kind: 'two-stone', breed: 'pebble', colours,
        traits: { shiny: true, speckled: false, golden: false, founder: false }, source: 'nest' },
    ]);
  });
  it('hatches a free egg without a result', () => {
    const d = applyHeartbeat({ type: 'hb.hatched', baby: 'b2', egg: 'building', kind: 'building', breed: 'bubble', colours,
      traits: { shiny: false, speckled: false, golden: false, founder: false }, source: 'building' });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ type: 'egg.hatched', kind: 'building', source: 'building' });
  });
  it('logs care by station and leaves the heart to the router', () => {
    expect(applyHeartbeat({ type: 'hb.care', baby: 'b1', station: 'brush' })).toEqual([{ type: 'care.done', baby: 'b1', station: 'brush' }]);
    const rc = applyHeartbeat({ type: 'hb.care', baby: 'b3', station: 'rollcall', learn: { payload: { ...payload, strand: 'name', step: null }, baby: 'b3' } });
    expect(rc.map((x) => x.type)).toEqual(['learn.result', 'care.done']);
  });
  it('names sky unicorns 1-based, rows and stall decorations', () => {
    expect(applyHeartbeat({ type: 'hb.sky-named', index: 0, name: 'Rose' })).toEqual([{ type: 'sky.named', sky: 1, name: 'Rose' }]);
    expect(applyHeartbeat({ type: 'hb.row-named', row: 2, name: 'Pip' })).toEqual([{ type: 'row.named', row: 2, name: 'Pip' }]);
    expect(applyHeartbeat({ type: 'hb.decor', decor: 'lantern', item: 'door-1', x: 10, y: 20 }))
      .toEqual([{ type: 'decor.placed', decor: 'lantern', item: 'door-1', area: 'stalls', x: 10, y: 20 }]);
  });
  it('hatches and names a test baby with route gold', () => {
    const d = applyHeartbeat({ type: 'hb.test-hatch', baby: 'b7', name: 'Lily-Rose' });
    expect(d[0]).toMatchObject({ type: 'egg.hatched', baby: 'b7', source: 'nest' });
    expect(d[1]).toEqual({ type: 'baby.named', baby: 'b7', name: 'Lily-Rose', gems: ['l', 'i', 'l', 'y', 'r', 'o', 's', 'e'], route: 'gold', listName: 'Lily-Rose' });
  });
  it('has one sample per action type', () => {
    const types = HEARTBEAT_SAMPLE_ACTIONS.map((a) => a.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types.sort()).toEqual(['hb.care', 'hb.decor', 'hb.hatched', 'hb.learn', 'hb.row-named', 'hb.sky-named', 'hb.test-hatch']);
  });
});

describe('applyNaming', () => {
  const target = { kind: 'baby' as const, baby: 'b1' };
  it('logs every gold bell slide with its outcome and lowercase gems', () => {
    const lily = BANK.find((b) => b.key === 'lily')!;
    expect(applyNaming({ type: 'naming.gold', target, gems: ['L', 'i', 'l', 'i'], outcome: { outcome: 'list', entry: lily } }))
      .toEqual([{ type: 'name.built', visit: null, baby: 'b1', route: 'gold', gems: ['l', 'i', 'l', 'i'], phonemes: 'l i l ee',
        outcome: 'list', listName: 'Lily', strong: false }]);
    expect(applyNaming({ type: 'naming.gold', target, gems: ['f', 'u', 'k'], outcome: { outcome: 'blocked', kind: 'strong' } })[0])
      .toMatchObject({ outcome: 'blocked', strong: true, listName: null });
    expect(applyNaming({ type: 'naming.gold', target, gems: ['p', 'oo'], outcome: { outcome: 'blocked', kind: 'toilet' } })[0])
      .toMatchObject({ outcome: 'blocked', strong: false });
    expect(applyNaming({ type: 'naming.gold', target: { kind: 'sky', index: 0 }, gems: ['T', 'a', 'm', 'o'], outcome: { outcome: 'unknown' } })[0])
      .toMatchObject({ baby: null, outcome: 'unknown' });
  });
  it('logs a spelled bell or garden name with its results', () => {
    const learn = [{ payload: { ...payload, strand: 's' as const, step: 'S03', moment: 'naming-bells' as const }, baby: 'b1' }];
    const d = applyNaming({ type: 'naming.spelled', target, route: 'garden-pic', listName: 'Ken', phonemes: ['k', 'e', 'n'], gems: ['K', 'e', 'n'], learn });
    expect(d).toEqual([{ ...learn[0].payload, baby: 'b1' }, { type: 'name.built', visit: null, baby: 'b1', route: 'garden', gems: ['k', 'e', 'n'],
      phonemes: 'k e n', outcome: 'chosen', listName: 'Ken', strong: false }]);
  });
  it('names the baby, logs a partial spelling and a clip heard', () => {
    expect(applyNaming({ type: 'naming.assign', baby: 'b1', name: 'Tamo', gems: ['T', 'a', 'm', 'o'], route: 'gold', listName: null }))
      .toEqual([{ type: 'baby.named', baby: 'b1', name: 'Tamo', gems: ['t', 'a', 'm', 'o'], route: 'gold', listName: null }]);
    expect(applyNaming({ type: 'naming.clip-heard', baby: 'b1' })).toEqual([{ type: 'name.clipHeard', baby: 'b1', heart: true }]);
    expect(applyNaming({ type: 'naming.partial', learn: [] })).toEqual([]);
  });
  it('has one sample per action type', () => {
    const types = NAMING_SAMPLE_ACTIONS.map((a) => a.type);
    expect(types.sort()).toEqual(['naming.assign', 'naming.clip-heard', 'naming.gold', 'naming.partial', 'naming.spelled']);
  });
  it('refuses an unknown action type', () => {
    expect(() => applyNaming({ type: 'naming.nope' } as never)).toThrow();
    expect(() => applyHeartbeat({ type: 'hb.nope' } as never)).toThrow();
  });
});
