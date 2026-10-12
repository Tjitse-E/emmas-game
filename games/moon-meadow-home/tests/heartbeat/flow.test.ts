import { describe, it, expect } from 'vitest';
import { IDLE, type HbSignal, type HbState, step } from '../../src/core/heartbeat/flow.ts';

const off = { skipWishAfterThree: false };
const run = (sigs: HbSignal[], opts = off, from: HbState = IDLE) => sigs.reduce((s, sig) => step(s, sig, opts), from);
const start: HbSignal = { s: 'start', unnamedBaby: null, offerChoice: false };

describe('heartbeat flow', () => {
  it('runs egg, naming, wish, move-in and a door visit', () => {
    expect(run([start]).stage).toBe('egg');
    expect(run([start, { s: 'hatched', baby: 'b1' }])).toEqual({ stage: 'naming', baby: 'b1', eggsInRow: 1 });
    expect(run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }]).stage).toBe('wish');
    expect(run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }, { s: 'wish-done' }]).stage).toBe('move-in');
    const visit = run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }, { s: 'wish-done' }, { s: 'moved-in', visit: true }]);
    expect(visit.stage).toBe('door-visit');
    expect(step(visit, { s: 'visit-done' }, off).stage).toBe('done');
    expect(run([start, { s: 'hatched', baby: 'b1' }, { s: 'named' }, { s: 'wish-done' }, { s: 'moved-in', visit: false }]).stage).toBe('done');
  });
  it('offers the egg choice first when asked', () => {
    const s = run([{ s: 'start', unnamedBaby: null, offerChoice: true }]);
    expect(s.stage).toBe('egg-choice');
    expect(step(s, { s: 'egg-picked' }, off).stage).toBe('egg');
  });
  it('resumes at naming for a baby left without a name, and hatches no second egg', () => {
    const left = run([start, { s: 'hatched', baby: 'b1' }, { s: 'left' }]);
    expect(left.stage).toBe('done');
    const again = step(left, { s: 'start', unnamedBaby: 'b1', offerChoice: false }, off);
    expect(again).toMatchObject({ stage: 'naming', baby: 'b1' });
    expect(step(again, { s: 'hatched', baby: 'b2' }, off)).toEqual(again);
  });
  it('resumes at naming after a reload, from the idle state', () => {
    expect(step(IDLE, { s: 'start', unnamedBaby: 'v2-baby', offerChoice: true }, off)).toMatchObject({ stage: 'naming', baby: 'v2-baby' });
  });
  it('ignores a start while a heartbeat runs', () => {
    const s = run([start, { s: 'hatched', baby: 'b1' }]);
    expect(step(s, start, off)).toEqual(s);
  });
  it('skips the first wish from the fourth egg in a row only when the switch is on', () => {
    const egg = (n: string): HbSignal[] => [start, { s: 'hatched', baby: n }, { s: 'named' }];
    const on = { skipWishAfterThree: true };
    const three = run([...egg('a'), { s: 'wish-done' }, { s: 'moved-in', visit: false }, ...egg('b'), { s: 'wish-done' },
      { s: 'moved-in', visit: false }, ...egg('c'), { s: 'wish-done' }, { s: 'moved-in', visit: false }], on);
    expect(three.eggsInRow).toBe(3);
    expect(run(egg('d'), on, three).stage).toBe('move-in');
    expect(run(egg('d'), off, three).stage).toBe('wish');
    expect(run([{ s: 'other-activity' }, ...egg('d')], on, three).stage).toBe('wish');
  });
});
