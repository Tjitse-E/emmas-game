import { describe, it, expect } from 'vitest';
import { EGG_STEPS, buildEggTask, eggKindFor, focusedHintLines, goalLines, judgeStones, maxStone, missLines, parseMathsItem, successLines } from '../../src/core/maths/eggs.ts';
import { BREED_OF } from '../../src/types/contracts.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';

const served = (step: string, id: string, scaffold: 1 | 2 | 3 = 1): Served =>
  ({ strand: 'm', step, id, carrier: '', items: [id], scaffold, probe: false, source: 'current' });

describe('parseMathsItem', () => {
  it('reads every learning item id (contracts C12)', () => {
    expect(parseMathsItem('m:sub:4')).toEqual({ op: 'subitise', n: 4 });
    expect(parseMathsItem('m:num:14')).toEqual({ op: 'numeral', n: 14 });
    expect(parseMathsItem('m:miss:10-3')).toEqual({ op: 'missing', whole: 10, part: 3 });
    expect(parseMathsItem('m:hid:10-6')).toEqual({ op: 'missing', whole: 10, part: 6 });
    expect(parseMathsItem('m:pair:3+7')).toEqual({ op: 'pair', a: 3, b: 7 });
    expect(parseMathsItem('m:add:6+2')).toEqual({ op: 'add', a: 6, b: 2 });
    expect(parseMathsItem('m:take:8-3')).toEqual({ op: 'take', a: 8, b: 3 });
    expect(parseMathsItem('m:more:4')).toEqual({ op: 'more', n: 4 });
    expect(parseMathsItem('m:less:4')).toEqual({ op: 'less', n: 4 });
    expect(() => parseMathsItem('seven')).toThrow();
    expect(() => parseMathsItem('r:g:a')).toThrow();
  });
});

describe('buildEggTask', () => {
  it('maps steps to egg kinds with a breed each', () => {
    expect(eggKindFor('M10')).toBe('two-stone');
    expect(eggKindFor('M05')).toBe('small-nest');
    expect(eggKindFor('M03')).toBeNull();
    for (const kind of Object.values(EGG_STEPS)) expect(BREED_OF[kind]).toBeDefined();
  });
  it('builds a moon egg for M01 and M02', () => {
    expect(buildEggTask(served('M01', 'm:sub:4'))).toMatchObject({ kind: 'moon', mode: 'stars-flash', shown: 4, target: 4, stonesNeeded: 1 });
    expect(buildEggTask(served('M02', 'm:num:7'))).toMatchObject({ kind: 'moon', mode: 'stars', shown: 7, target: 7 });
  });
  it('builds cup eggs', () => {
    expect(buildEggTask(served('M09', 'm:miss:10-3'))).toMatchObject({ kind: 'moon', mode: 'cups', cups: 10, warm: 3, target: 7 });
    expect(buildEggTask(served('M05', 'm:miss:5-2'))).toMatchObject({ kind: 'small-nest', mode: 'cups', cups: 5, warm: 2, target: 3 });
    expect(buildEggTask(served('M12', 'm:miss:7-4'))).toMatchObject({ kind: 'small-nest', mode: 'cups', cups: 7, warm: 4, target: 3 });
    expect(buildEggTask(served('M11', 'm:hid:10-6'))).toMatchObject({ kind: 'blanket', mode: 'blanket', cups: 10, warm: 6, target: 4 });
  });
  it('builds a two-stone egg that needs a pair to ten', () => {
    expect(buildEggTask(served('M10', 'm:pair:3+7'))).toMatchObject({ kind: 'two-stone', mode: 'two-stone', cups: 10, warm: 0, target: 10, stonesNeeded: 2 });
  });
  it('refuses an item that does not fit the step', () => {
    expect(() => buildEggTask(served('M01', 'm:miss:10-3'))).toThrow();
    expect(() => buildEggTask(served('M03', 'm:num:3'))).toThrow();
    expect(() => buildEggTask(served('M10', 'm:pair:3+6'))).toThrow();
  });
});

describe('judging and lines', () => {
  const cups = buildEggTask(served('M09', 'm:miss:10-3'));
  const two = buildEggTask(served('M10', 'm:pair:3+7'));
  const stars = buildEggTask(served('M02', 'm:num:4'));
  const blanket = buildEggTask(served('M11', 'm:hid:10-6'));
  const small = buildEggTask(served('M05', 'm:miss:5-2'));
  it('keeps stones inside the nest', () => {
    expect(maxStone(small)).toBe(5);
    expect(maxStone(cups)).toBe(9);
    expect(maxStone(stars)).toBe(10);
  });
  it('judges single and paired stones', () => {
    expect(judgeStones(cups, [7])).toEqual({ ok: true, diff: 0 });
    expect(judgeStones(cups, [8])).toEqual({ ok: false, diff: 1, error: 'off-by-one' });
    expect(judgeStones(cups, [4])).toEqual({ ok: false, diff: -3, error: 'other' });
    expect(judgeStones(two, [4, 6])).toEqual({ ok: true, diff: 0 });
    expect(judgeStones(two, [3, 6])).toEqual({ ok: false, diff: -1, error: 'off-by-one' });
  });
  it('picks the mistake lines by mode and size', () => {
    expect(missLines(cups, 2)).toEqual(['fb-hot', 'num-over-2']);
    expect(missLines(cups, -3)).toEqual(['fb-brr', 'num-cold-3']);
    expect(missLines(stars, 1)).toEqual(['fb-too-many', 'num-over-1']);
    expect(missLines(stars, -2)).toEqual(['num-more-2']);
    expect(missLines(cups, 12)).toEqual(['fb-hot', 'num-over-9']);
  });
  it('says the goal once, with the blanket count', () => {
    expect(goalLines(blanket, false)).toEqual(['g-blanket', 'num-warm-6', 'g-egg']);
    expect(goalLines(cups, true)).toEqual(['g-egg', 'g-stone']);
    expect(goalLines(two, false)).toEqual(['g-two-stones']);
    expect(goalLines(stars, false)).toEqual(['g-count-stars']);
  });
  it('says the bond after a full ten', () => {
    expect(successLines(two, [4, 6])).toEqual(['fb-warm', 'num-bond-4-6']);
    expect(successLines(cups, [7])).toEqual(['fb-warm', 'num-bond-3-7']);
    expect(successLines(small, [3])).toEqual(['fb-warm', 'num-bond-2-3']);
    expect(successLines(stars, [4])).toEqual(['fb-lovely', 'num-4']);
  });
  it('counts the cold cups or the stars in the focused hint', () => {
    expect(focusedHintLines(cups, [])).toEqual(['h-count', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7']);
    expect(focusedHintLines(two, [3])).toEqual(['h-count', 'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7']);
    expect(focusedHintLines(blanket, [])).toEqual(['h-peek', 'h-count', 'num-1', 'num-2', 'num-3', 'num-4']);
    expect(focusedHintLines(stars, [])).toEqual(['h-stars', 'num-1', 'num-2', 'num-3', 'num-4']);
  });
});
