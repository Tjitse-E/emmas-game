import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkPin, DEFAULT_PIN, deviceList, exportReminder, fileEventIds, hatchedOutside, importMessage, keypadOrder, learningRows, nameLog,
  NUMBER_WORDS, overrideRows, pinOf, placedToggle, profileOverride, quarantineSummary, reportRows, settingsOf,
} from '../../src/parent/parent.ts';
import { report } from '../../src/core/report/criteria.ts';
import type { StrandReport } from '../../src/core/learning/report.ts';
import type { GameEvent, Payloads } from '../../src/core/events.ts';
import { DAY, ev, hatched, resetSeq, rng, T0 } from './helpers.ts';

beforeEach(resetSeq);

const built = (gems: string[], outcome: Payloads['name.built']['outcome'], t: number, strong = false, listName: string | null = null) =>
  ev('name.built', { visit: 'v1', baby: null, gems, phonemes: '', route: 'gold', outcome, listName, strong }, t);
const on = (e: GameEvent, dev: string): GameEvent => ({ ...e, dev });

describe('PIN gate', () => {
  it('uses 2468 until a PIN is set (decision D18)', () => {
    expect(DEFAULT_PIN).toBe('2468');
    expect(pinOf({})).toBe('2468');
    expect(pinOf({ 'parent-pin': '1357' })).toBe('1357');
    expect(pinOf({ 'parent-pin': '12' })).toBe('2468');
    expect(checkPin('2468', {})).toBe(true);
    expect(checkPin('2469', {})).toBe(false);
  });

  it('shuffles all ten digits on the keypad, each with its number word', () => {
    expect([...keypadOrder(rng(4))].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(NUMBER_WORDS[7]).toBe('seven');
  });

  it('reads the PIN from the latest settings.set', () => {
    const s = settingsOf([ev('settings.set', { key: 'parent-pin', value: '1111' }), ev('settings.set', { key: 'parent-pin', value: '1357' })]);
    expect(pinOf(s)).toBe('1357');
  });
});

describe('report section', () => {
  it('gives one row per criterion and the jewel share', () => {
    const rows = reportRows(report([ev('visit.start', { visit: 'v1', tz: 0 }, T0), hatched('a'), hatched('b'), ev('visit.end', { visit: 'v1', reason: 'goodnight' }, T0 + 60_000)], T0 + DAY));
    expect(rows.map((r) => r.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'C1', 'C2', 'L1', 'L2', 'L3', 'L4', 'L5', 'J']);
    expect(rows.find((r) => r.id === 'E1')?.value).toBe('week 1: 1');
    expect(rows.find((r) => r.id === 'E4')?.ok).toBe(true);
    expect(rows.find((r) => r.id === 'J')?.value).toBe('no openings yet');
  });
});

describe('names section', () => {
  it('groups name builds by outcome and lists strong words', () => {
    const out = nameLog([
      built(['t', 'a', 'm', 'o'], 'unknown', 1), built(['t', 'a', 'm', 'o'], 'unknown', 5), built(['l', 'i', 'l', 'i'], 'list', 2, false, 'Lily'),
      built(['b', 'u', 'm'], 'blocked', 3, true), built(['b', 'm'], 'no-vowel', 4),
    ]);
    expect(out.unknown).toEqual([{ name: 'Tamo', count: 2, first: 1, last: 5, route: 'gold' }]);
    expect(out.list.map((r) => r.name)).toEqual(['Lily']);
    expect(out.blocked.map((r) => r.name)).toEqual(['Bum']);
    expect(out.strong.map((r) => r.name)).toEqual(['Bum']);
    expect(out.noVowel).toBe(1);
  });
});

describe('learning section', () => {
  const base: StrandReport = {
    strand: 'r', placing: false, placement: null, current: 'R21', level: 2, ceiling: false, passed: ['R19'], placed: ['R01', 'R02'],
    secure: ['R01'], side: [], school: ['R19'], reopened: [], waiting: [], week: { moments: 10, firstTry: 0.8, helped: 0.1, dutch: 2 },
    dutchPairs: [{ pair: 'v-w', count: 2 }],
  };
  it('shows current, placing, ceiling, secure, school steps and Dutch-sound pairs per strand', () => {
    const [r, s, m] = learningRows([
      base,
      { ...base, strand: 's', placing: true, placement: { lo: 'S04', hi: 'S12', items: 3 }, current: null, level: null, dutchPairs: [], school: [] },
      { ...base, strand: 'm', current: null, level: null, ceiling: true, dutchPairs: [], school: [], week: { moments: 0, firstTry: null, helped: null, dutch: 0 } },
    ]);
    expect(r.title).toBe('Reading');
    expect(r.lines[0]).toBe('Current step R21, help level 2');
    expect(r.lines).toContain('Secure: R01');
    expect(r.lines).toContain('School steps open: R19');
    expect(r.lines).toContain('This week: 10 moments, first try 80%, helped 10%');
    expect(r.lines).toContain('Dutch-sound slips this week: v-w (2)');
    expect(s.lines[0]).toBe('Still placing between S04 and S12 (3 probes so far)');
    expect(m.lines[0]).toMatch(/^Ceiling reached/);
    expect(m.lines).toContain('This week: no moments yet');
  });
});

describe('overrides section', () => {
  it('builds rows per strand with status, school and the current step', () => {
    const steps = [{ id: 'R19', strand: 'r' as const, school: true }, { id: 'R21', strand: 'r' as const, school: false }, { id: 'S10', strand: 's' as const, school: true }];
    const status: Record<string, string> = { R19: 'passed', R21: 'current', S10: 'placed' };
    const rows = overrideRows(steps, (id) => status[id], { r: 'R21', s: 'S12', m: 'M10' });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ strand: 'r', current: 'R21', steps: [{ id: 'R19', status: 'passed', school: true, current: false }, { id: 'R21', status: 'current', school: false, current: true }] });
  });

  it('switches the profile and toggles placed steps through learning override shapes', () => {
    expect(profileOverride('fresh')).toEqual({ op: 'profile', profile: 'fresh' });
    expect(placedToggle('s', 'S10', 'placed')).toEqual({ op: 'unmark-placed', strand: 's', step: 'S10' });
    expect(placedToggle('s', 'S12', 'waiting')).toEqual({ op: 'mark-placed', strand: 's', step: 'S12' });
  });
});

describe('backup section', () => {
  it('lists devices with their visits and whether they are excluded', () => {
    const a = on(ev('visit.start', { visit: 'v1', tz: 0 }, 10), 'aaaa1111');
    const b = on(hatched('x'), 'aaaa1111');
    const c = on(ev('visit.start', { visit: 'v2', tz: 0 }, 30), 'bbbb2222');
    const x = on(ev('exclude', { device: 'bbbb2222', on: true }, 40), 'aaaa1111');
    const rows = deviceList([a, { ...b, t: 20 }, c, x]);
    expect(rows).toEqual([
      { dev: 'aaaa1111', events: 3, visits: 1, first: 10, last: 40, excluded: false },
      { dev: 'bbbb2222', events: 1, visits: 1, first: 30, last: 30, excluded: true },
    ]);
    const back = on(ev('exclude', { device: 'bbbb2222', on: false }, 50), 'aaaa1111');
    expect(deviceList([a, c, x, back])[1].excluded).toBe(false);
  });

  it('reminds about a backup older than seven days', () => {
    expect(exportReminder(null, null, T0)).toBe(true);
    expect(exportReminder(T0 - 8 * DAY, null, T0)).toBe(true);
    expect(exportReminder(T0 - 2 * DAY, null, T0)).toBe(false);
    expect(exportReminder(null, T0 - DAY, T0)).toBe(false);
  });

  it('says what an import did', () => {
    expect(importMessage({ kind: 'v3', added: 12, duplicates: 0, quarantined: 0 })).toBe('Added 12 events.');
    expect(importMessage({ kind: 'v3', added: 3, duplicates: 2, quarantined: 1 })).toBe('Added 3 events (2 already here, 1 set aside).');
    expect(importMessage({ kind: 'v2', status: 'imported', babies: 9 })).toBe('v2 herd of 9 imported.');
    expect(importMessage({ kind: 'v2', status: 'already', babies: 0 })).toBe('This v2 herd is already here.');
    expect(importMessage({ kind: 'invalid', reason: 'not json' })).toMatch(/cannot be read/);
  });

  it('counts hatches that did not come from the restored file', () => {
    const h1 = hatched('a');
    const h2 = hatched('b');
    const text = JSON.stringify({ format: 'moon-meadow-home', events: [h1] });
    expect([...fileEventIds(text)]).toEqual([h1.id]);
    expect(fileEventIds('not json').size).toBe(0);
    expect(hatchedOutside([h1], fileEventIds(text))).toBe(0);
    expect(hatchedOutside([h1, h2], fileEventIds(text))).toBe(1);
  });
});

describe('quarantine section', () => {
  it('counts quarantined events per type and shows the first rows', () => {
    const rows = [
      { id: '1', type: 'learn.result', reason: 'missing visit' }, { id: '2', type: 'learn.result', reason: 'extra field' }, { id: '3', type: '?', reason: 'no type' },
    ];
    const q = quarantineSummary(rows, 2);
    expect(q.count).toBe(3);
    expect(q.types).toEqual([{ type: 'learn.result', count: 2 }, { type: '?', count: 1 }]);
    expect(q.rows).toHaveLength(2);
  });
});
