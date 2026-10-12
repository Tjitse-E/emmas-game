import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { COMMON_LINE_IDS, heartbeatLineFile, heartbeatLines, lineId } from '../../src/core/heartbeat/lines.ts';
import { numberWord, ordinalWord } from '../../src/core/heartbeat/numbers.ts';
import { momentResult } from '../../src/core/heartbeat/result.ts';
import { HEARTBEAT_NUMBER_IDS } from '../../src/core/keys.ts';

describe('numberWord', () => {
  it('says British numbers', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(14)).toBe('fourteen');
    expect(numberWord(40)).toBe('forty');
    expect(numberWord(41)).toBe('forty-one');
    expect(numberWord(100)).toBe('one hundred');
    expect(numberWord(120)).toBe('one hundred and twenty');
  });
  it('rejects numbers it cannot say', () => {
    expect(() => numberWord(-1)).toThrow();
    expect(() => numberWord(1.5)).toThrow();
    expect(() => numberWord(1000)).toThrow();
  });
  it('says ordinals', () => {
    expect(ordinalWord(2)).toBe('second');
    expect(ordinalWord(12)).toBe('twelfth');
    expect(ordinalWord(20)).toBe('twentieth');
  });
});

describe('number line ids (R7, keys.ts)', () => {
  it('are the audio number ids', () => {
    expect(lineId).toBe(HEARTBEAT_NUMBER_IDS);
    expect(lineId.baby(19)).toBe('num-movein-19');
    expect(lineId.unicorns(41)).toBe('num-herd-41');
    expect(lineId.sky(4)).toBe('num-sky-4');
    expect(lineId.cold(3)).toBe('num-cold-3');
    expect(lineId.over(2)).toBe('num-over-2');
    expect(lineId.bond(7, 3)).toBe('num-bond-7-3');
    expect(lineId.visit(14)).toBe('num-visit-14');
    expect(lineId.thatIs(14)).toBe('num-14');
    expect(lineId.doorBed(12)).toBe('num-door-bed-12');
    expect(lineId.ordinal(2)).toBe('ord-2');
  });
});

describe('heartbeatLines', () => {
  const lines = heartbeatLines();
  const byId = new Map(lines.map((l) => [l.id, l]));
  it('has unique kebab-case ids', () => {
    expect(byId.size).toBe(lines.length);
    for (const l of lines) expect(l.id).toMatch(/^[a-z0-9-]+$/);
  });
  it('has no digits in any text', () => {
    for (const l of lines) expect(l.text).not.toMatch(/[0-9]/);
  });
  it('holds no number, word, name, sound or ordinal lines (audio and learning own those)', () => {
    for (const l of lines) expect(l.id).not.toMatch(/^(word|name|num|sound|ord|phrase|model)-/);
  });
  it('keeps Lumi and the babies on story ids only', () => {
    for (const l of lines.filter((x) => x.speaker !== 'narrator')) expect(l.id).toMatch(/^(lumi|foal)-/);
  });
  it('writes the key lines exactly', () => {
    expect(byId.get('fb-tricky')?.text).toBe("What a great name! It's a tricky one for me to say.");
    expect(byId.get('g-egg')?.text).toBe('Make every cup warm, and the egg will hatch.');
    expect(byId.get('g-moon')?.text).toBe("Tap the moon when it's bedtime.");
    expect(byId.get('lumi-moon-name')?.speaker).toBe('queen');
  });
});

describe('heartbeat.json', () => {
  const file = heartbeatLineFile();
  it('is an audio line file for the heartbeat scene without tiers', () => {
    expect(file.scene).toBe('heartbeat');
    for (const l of file.lines) expect(Object.keys(l).sort()).toEqual(['id', 'speaker', 'text']);
  });
  it('leaves out the ids common.json defines, while the code keeps them', () => {
    const ids = new Set(file.lines.map((l) => l.id));
    for (const id of COMMON_LINE_IDS) {
      expect(ids.has(id)).toBe(false);
      expect(heartbeatLines().some((l) => l.id === id)).toBe(true);
    }
  });
  it('matches the committed file', () => {
    const disk = JSON.parse(readFileSync(new URL('../../content/lines/heartbeat.json', import.meta.url), 'utf8'));
    expect(disk).toEqual(file);
  });
});

describe('momentResult', () => {
  it('is first only with no miss and no level 2 hint', () => {
    expect(momentResult(0, 0)).toBe('first');
    expect(momentResult(0, 1)).toBe('first');
    expect(momentResult(0, 2)).toBe('helped');
    expect(momentResult(1, 2)).toBe('helped'); // a miss, then an idle focused hint
    expect(momentResult(1, 1)).toBe('miss');
    expect(momentResult(2, 3)).toBe('helped');
  });
});
