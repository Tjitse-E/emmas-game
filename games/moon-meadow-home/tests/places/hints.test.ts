import { describe, expect, it } from 'vitest';
import { idleDelay, onAnswer, onIdle, onMiss, onTouch, openMoment } from '../../src/core/places/hints.ts';

describe('hint ladder', () => {
  it('waits 10 s on reading and 15 s elsewhere', () => {
    expect(idleDelay('r')).toBe(10_000);
    expect(idleDelay('s')).toBe(15_000);
    expect(idleDelay('m')).toBe(15_000);
    expect(idleDelay('name')).toBe(15_000);
  });

  it('repeats the goal on the first idle and gives the focused hint with an idle flag on the second', () => {
    let s = openMoment('m', 0);
    let fx;
    [s, fx] = onIdle(s);
    expect(s.level).toBe(1);
    expect(fx).toEqual([{ kind: 'repeat-goal' }]);
    [s, fx] = onIdle(s);
    expect(s.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }, { kind: 'idle-flag' }]);
  });

  it('never goes past level 2 on idle and flags only once', () => {
    let s = openMoment('s', 0);
    [s] = onIdle(s);
    [s] = onIdle(s);
    const [s3, fx] = onIdle(s);
    expect(s3.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }]);
  });

  it('does not flag idles with a touch between them', () => {
    let s = openMoment('r', 0);
    [s] = onIdle(s);
    s = onTouch(s);
    const [s2, fx] = onIdle(s);
    expect(s2.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }]);
  });

  it('gives the focused hint after one miss and the ghost hand after two', () => {
    let s = openMoment('m', 0);
    let fx;
    [s, fx] = onMiss(s);
    expect(s.level).toBe(2);
    expect(fx).toEqual([{ kind: 'focused' }]);
    [s, fx] = onMiss(s);
    expect(s.level).toBe(3);
    expect(fx).toEqual([{ kind: 'ghost-answer' }]);
  });

  it('does nothing on idle once the ghost hand has shown the answer', () => {
    let s = openMoment('m', 0);
    [s] = onMiss(s);
    [s] = onMiss(s);
    const [s2, fx] = onIdle(s);
    expect(s2.level).toBe(3);
    expect(fx).toEqual([]);
  });

  it('returns first on a clean answer, with the decision time', () => {
    const s = openMoment('r', 1_000);
    expect(onAnswer(s, 4_500)).toMatchObject({ result: 'first', ms: 3_500 });
  });

  it('returns miss after a miss without the ghost hand (decision D1)', () => {
    let s = openMoment('r', 0);
    [s] = onMiss(s);
    expect(onAnswer(s, 9_000).result).toBe('miss');
  });

  it('returns helped after an idle-triggered level 2 hint', () => {
    let s = openMoment('r', 0);
    [s] = onIdle(s);
    [s] = onIdle(s);
    expect(onAnswer(s, 30_000).result).toBe('helped');
  });

  it('returns first after only a level 1 goal repeat', () => {
    let s = openMoment('m', 0);
    [s] = onIdle(s);
    expect(onAnswer(s, 20_000).result).toBe('first');
  });

  it('returns helped after the ghost hand', () => {
    let s = openMoment('m', 0);
    [s] = onMiss(s);
    [s] = onMiss(s);
    expect(onAnswer(s, 9_000).result).toBe('helped');
  });

  it('closes the moment so later events change nothing', () => {
    const s = onAnswer(openMoment('m', 0), 2_000).state;
    expect(s.done).toBe(true);
    expect(onIdle(s)).toEqual([s, []]);
    expect(onMiss(s)).toEqual([s, []]);
  });

  it('never returns a negative decision time', () => {
    expect(onAnswer(openMoment('m', 5_000), 4_000).ms).toBe(0);
  });
});
