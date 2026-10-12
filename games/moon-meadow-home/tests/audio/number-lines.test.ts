import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { numberLines } from '../../tools/audio/number-lines.ts';
import { HEARTBEAT_NUMBER_IDS } from '../../src/core/keys.ts';

const lines = numberLines();
const text = (id: string) => lines.find((l) => l.id === id)?.text;

describe('number lines', () => {
  it('has unique ids, narrator only, and no digits in the text', () => {
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    expect(lines.every((l) => l.speaker === 'narrator')).toBe(true);
    expect(lines.filter((l) => /\d/.test(l.text))).toEqual([]);
  });
  it('says the heartbeat numbers as full sentences', () => {
    expect(text('num-movein-41')).toBe('Baby number forty-one.');
    expect(text('num-visit-14')).toBe('Off to door fourteen!');
    expect(text('num-door-bed-12')).toBe('Door twelve, bedtime!');
    expect(text('num-herd-1')).toBe('One unicorn!');
    expect(text('num-herd-41')).toBe('Forty-one unicorns!');
    expect(text('num-sky-5')).toBe('Five sky unicorns!');
    expect(text('num-42')).toBe('Forty-two.');
    expect(text('num-count-3')).toBe('One, two, three.');
    expect(text('num-bond-4-2')).toBe('Four and two make six!');
    expect(text('num-tap-door-4')).toBe('Tap door four.');
    expect(text('ord-2')).toBe('The Second!');
  });
  it('covers the Wave A ranges', () => {
    expect(text('num-0')).toBeDefined();
    expect(text('num-60')).toBeDefined();
    expect(text('num-61')).toBeUndefined();
    expect(text('num-movein-60')).toBeDefined();
    expect(text('num-herd-60')).toBeDefined();
    expect(text('num-visit-20')).toBeDefined();
    expect(text('num-door-bed-20')).toBeDefined();
    expect(text('num-sky-12')).toBe('Twelve sky unicorns!');
    expect(text('num-warm-10')).toBe('Ten cups are warm already.');
    expect(text('ord-20')).toBeDefined();
    expect(lines.filter((l) => l.id.startsWith('num-bond-'))).toHaveLength(69);
  });
  it('has the 1.0.1 egg, hay-rack and bond lines (docs/v3/next/plan.md 11.2)', () => {
    const count = (p: RegExp) => lines.filter((l) => p.test(l.id)).length;
    expect(count(/^num-egg-\d+$/)).toBe(10);
    expect(count(/^num-rack-\d+$/)).toBe(10);
    expect(count(/^num-in-\d+$/)).toBe(9);
    const over10 = lines.filter((l) => /^num-bond-\d+-\d+$/.test(l.id)).filter((l) => { const [a, b] = l.id.split('-').slice(2).map(Number); return a + b > 10; });
    expect(over10).toHaveLength(30);
    expect(text('num-egg-6')).toBe('This egg needs six warm cups.');
    expect(text('num-egg-13')).toBe('This egg needs thirteen warm cups.');
    expect(text('num-egg-16')).toBeUndefined();
    expect(text('num-rack-15')).toBe('The hay rack needs fifteen bundles.');
    expect(text('num-in-1')).toBe('One bundle is in.');
    expect(text('num-in-9')).toBe('Nine bundles are in.');
    expect(text('num-bond-8-5')).toBe('Eight and five make thirteen!');
    expect(text('num-bond-2-9')).toBe('Two and nine make eleven!');
    expect(text('num-bond-6-9')).toBe('Six and nine make fifteen!');
    expect(text('num-bond-1-10')).toBeUndefined();
  });
  it('has every number line heartbeat asks for in its Wave A ranges', () => {
    const H = HEARTBEAT_NUMBER_IDS;
    const want: string[] = [];
    for (let n = 1; n <= 9; n++) want.push(H.over(n), H.cold(n), H.more(n));
    for (let n = 1; n <= 10; n++) want.push(H.warm(n));
    for (let a = 1; a <= 9; a++) want.push(H.bond(a, 10 - a));
    for (let n = 1; n <= 60; n++) want.push(H.baby(n), H.unicorns(n), H.num(n));
    for (let n = 1; n <= 20; n++) want.push(H.visit(n), H.doorBed(n), H.thatIs(n));
    for (let n = 1; n <= 12; n++) want.push(H.sky(n));
    for (let n = 2; n <= 20; n++) want.push(H.ordinal(n));
    expect(want.filter((id) => text(id) === undefined)).toEqual([]);
  });
  it('copies the v2 texts exactly, so those clips come from the raw cache', () => {
    const v2 = JSON.parse(readFileSync(new URL('../../../../ideas/opus-5-5-unicorn-egg-nest-v2/audio/lines.json', import.meta.url), 'utf8')).lines as Array<{ id: string; text: string }>;
    for (const id of ['num-1', 'num-10', 'num-bond-7-3', 'num-over-2', 'num-cold-3', 'num-warm-7']) {
      expect(text(id)).toBe(v2.find((l) => l.id === id)?.text);
    }
  });
});
