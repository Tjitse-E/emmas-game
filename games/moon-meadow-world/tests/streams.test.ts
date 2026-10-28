// The game's random streams per moment (src/game/streams.ts) and the maths band (src/game/band.ts).
import { describe, expect, it } from 'vitest';
import { eggSpec, eggSums } from '../src/content/eggs';
import { createStreams } from '../src/game/streams';
import { nextBand, noteBand, startMaths, totalOf, useSum } from '../src/game/band';

const take = (r: () => number, n = 6): number[] => Array.from({ length: n }, () => r());

describe('g.randFor streams', () => {
  it('continues a label within a play and starts it again after a reset', () => {
    const s = createStreams(5);
    const first = take(s.for('egg1'), 3);
    const more = take(s.for('egg1'), 3);
    s.reset();
    expect(take(s.for('egg1'), 6)).toEqual([...first, ...more]);
  });

  it('gives a moment the same numbers whatever ran before it (?at=egg2 equals a full play)', () => {
    const full = createStreams(5);
    // A full play: the first egg, its baby, its naming, the dress-up wish and the pond wish all draw first.
    for (const label of ['egg1', 'hatch1', 'naming1', 'wish1', 'pond']) take(full.for(label), 40);
    const jumped = createStreams(5);
    const a = eggSpec('snow', full.for('egg2'), { first: true });
    const b = eggSpec('snow', jumped.for('egg2'), { first: true });
    expect({ ...a, clips: undefined }).toEqual({ ...b, clips: undefined });
  });

  it('gives an egg its three sums from its own stream, whatever ran before it (2.3)', () => {
    const full = createStreams(5);
    for (const label of ['egg1', 'hatch1', 'naming1', 'wish1', 'pond']) take(full.for(label), 40);
    const jumped = createStreams(5);
    const o = { first: true, used: { totals: [8, 11, 15], answers: [3, 5, 7] }, lastTotals: [] };
    const strip = (xs: ReturnType<typeof eggSums>) => xs.map((e) => ({ ...e, clips: undefined }));
    expect(strip(eggSums('snow', full.for('egg2'), o))).toEqual(strip(eggSums('snow', jumped.for('egg2'), o)));
    // Another egg's stream asks other sums.
    const other = eggSums('snow', createStreams(5).for('egg1'), o);
    expect(strip(other)).not.toEqual(strip(eggSums('snow', createStreams(5).for('egg2'), o)));
  });

  it('gives other numbers for another seed or label', () => {
    expect(take(createStreams(5).for('egg2'))).not.toEqual(take(createStreams(6).for('egg2')));
    expect(take(createStreams(5).for('egg2'))).not.toEqual(take(createStreams(5).for('rack')));
  });
});

describe('maths band', () => {
  it('starts in band A and moves with the results', () => {
    const m = startMaths(null);
    expect(m.band).toBe('a');
    noteBand(m, 'first');
    expect(m.band).toBe('b');
    noteBand(m, 'miss');
    expect(m.band).toBe('b');
    noteBand(m, 'helped');
    expect(m.band).toBe('a');
    expect([nextBand('a', 'first'), nextBand('b', 'helped'), nextBand('a', 'miss')]).toEqual(['b', 'a', 'a']);
  });

  it('never moves a fixed band', () => {
    const m = startMaths('b');
    noteBand(m, 'helped');
    expect(m.band).toBe('b');
    const a = startMaths('a');
    noteBand(a, 'first');
    expect(a.band).toBe('a');
  });

  it('remembers the totals and answers of the play', () => {
    const m = startMaths(null);
    useSum(m, { kind: 'warm', need: 13, have: 8, answer: 5 });
    useSum(m, { kind: 'snow', need: 9, have: 14, answer: 5 });
    expect(m.used).toEqual({ totals: [13, 14], answers: [5, 5] });
    expect(totalOf({ need: 12, have: 7 })).toBe(12);
    expect(totalOf({ need: 8, have: 15 })).toBe(15);
  });
});
