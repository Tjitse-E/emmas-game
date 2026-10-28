// The maths lane (docs/v4/2.2.md section 4 and 8.1, docs/v4/2.3.md sections 12 and 19.1): the bands and their floor,
// the trays of 4 or 5 stones with real mistakes, that no place and no simple guess wins much more than a blind guess,
// the per-moment streams, no sum asked twice in a play, and that every clip a maths moment can say exists or waits in
// the line list. 2.3.0: an egg's three sums (easy, middle, hard), the guess rules per grade and per place in the egg,
// and that only the hard sum and the hay rack move the band.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EggSpec, MomentResult, Outcome, SumGrade } from '../src/contracts.ts';
import {
  type Band, type EggKind, RANGES, STONES, SUM_GRADES, TRAY, allEggClipIds, eggClipIds, eggCombos, eggSpec, eggSums,
  gradeCombos, gradeRanges, gradeReach, nearFiveShare, nextBand, placesFor, stoneCandidates, totalOf,
} from '../src/content/eggs.ts';
import { allRackClipIds, rackSpec } from '../src/content/rack.ts';
import { seeded, stream } from '../src/content/rand.ts';
import { startMaths } from '../src/game/band.ts';
import { noteMaths } from '../src/game/maths.ts';
import type { Game } from '../src/game/game.ts';
import { lineFor } from '../tools/lines.ts';

const here = resolve(import.meta.dirname, '..');
const v3 = resolve(here, '../moon-meadow-home');
interface Clip { ok?: boolean; file?: string }
/** The v3 packs the game speaks from (src/audio/index.ts V3_PACKS). */
const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'];
function okClips(dir: string): Set<string> {
  const path = join(dir, 'manifest.json');
  if (!existsSync(path)) return new Set();
  const clips = (JSON.parse(readFileSync(path, 'utf8')) as { clips: Record<string, Clip> }).clips;
  return new Set(Object.entries(clips).filter(([, c]) => c.ok === true && c.file && existsSync(join(dir, c.file))).map(([id]) => id));
}
const v3Clips = new Set(V3_PACKS.flatMap((p) => [...okClips(join(v3, 'public/audio', p))]));
const ownClips = okClips(join(here, 'public/audio/v4demo'));
const clipExists = (id: string): boolean => v3Clips.has(id) || ownClips.has(id);

const KINDS = ['warm', 'snow'] as const;
const BANDS = ['a', 'b'] as const;
/** The maths moments: the two eggs and the hay rack (a warm sum with skin 'hay'). */
type Moment = EggKind | 'rack';
const MOMENTS: Moment[] = ['warm', 'snow', 'rack'];
const make = (m: Moment, r: () => number, band: Band): EggSpec => (m === 'rack' ? rackSpec(r, { band }) : eggSpec(m, r, { band }));
const kindOf = (m: Moment): EggKind => (m === 'rack' ? 'warm' : m);

/** 10,000 specs of one moment and band, from one seeded stream. */
function many(m: Moment, band: Band, n = 10_000, seed = 1): EggSpec[] {
  const r = seeded(seed);
  return Array.from({ length: n }, () => make(m, r, band));
}

describe('2.2\'s one sum, the hay rack\'s: bands and ranges (4.2)', () => {
  it('has the sums of the design: 19 and 26 warm, 14 and 21 snow', () => {
    expect(eggCombos('warm', 'a')).toHaveLength(19);
    expect(eggCombos('warm', 'b')).toHaveLength(26);
    expect(eggCombos('snow', 'a')).toHaveLength(14);
    expect(eggCombos('snow', 'b')).toHaveLength(21);
  });

  it('keeps every sum inside its band and the floor: nothing adds or takes 1 or 2, none starts under 7, all cross ten', () => {
    for (const kind of KINDS) {
      for (const band of BANDS) {
        const r = RANGES[kind][band];
        for (const e of [...many(kind, band, 2000), ...(kind === 'warm' ? many('rack', band, 2000) : [])]) {
          expect(e.band).toBe(band);
          expect(e.need).toBeGreaterThanOrEqual(r.need[0]);
          expect(e.need).toBeLessThanOrEqual(r.need[1]);
          expect(e.have).toBeGreaterThanOrEqual(r.have[0]);
          expect(e.have).toBeLessThanOrEqual(r.have[1]);
          expect(e.answer).toBe(kind === 'warm' ? e.need - e.have : e.have - e.need);
          expect(e.answer).toBeGreaterThanOrEqual(Math.max(3, r.answer[0]));
          expect(e.answer).toBeLessThanOrEqual(r.answer[1]);
          expect(e.need).toBeGreaterThanOrEqual(7);
          // Adding goes from under ten to over ten; taking away goes from over ten down to ten or under.
          if (kind === 'warm') expect(e.have < 10 && e.need > 10).toBe(true);
          else expect(e.have > 10 && e.need <= 10).toBe(true);
        }
      }
    }
  });

  it('band A is the default, a first try moves to B, a helped answer back to A, a miss keeps the band', () => {
    expect(eggSpec('warm', seeded(1)).band).toBe('a');
    expect(eggSpec('warm', seeded(1)).stones).toHaveLength(4);
    expect(nextBand('a', 'first')).toBe('b');
    expect(nextBand('b', 'first')).toBe('b');
    expect(nextBand('b', 'helped')).toBe('a');
    expect(nextBand('a', 'helped')).toBe('a');
    expect(nextBand('a', 'miss')).toBe('a');
    expect(nextBand('b', 'miss')).toBe('b');
  });
});

describe('the trays (4.1)', () => {
  it('shows 4 (A) or 5 (B) different stones from 3 to 9, ascending, with the answer, and logs why each wrong one is in', () => {
    for (const m of MOMENTS) {
      for (const band of BANDS) {
        for (const e of many(m, band, 3000)) {
          expect(e.stones).toHaveLength(TRAY[band]);
          expect(new Set(e.stones).size).toBe(e.stones.length);
          expect([...e.stones].sort((a, b) => a - b)).toEqual(e.stones);
          expect(e.stones).toContain(e.answer);
          for (const s of e.stones) {
            expect(s).toBeGreaterThanOrEqual(STONES.min);
            expect(s).toBeLessThanOrEqual(STONES.max);
          }
          const wrong = e.stones.filter((s) => s !== e.answer);
          expect(Object.keys(e.decoys ?? {}).map(Number).sort((a, b) => a - b)).toEqual(wrong);
        }
      }
    }
  });

  it('always holds a slip and the number she heard when it can, and labels each mistake by the table of 4.1', () => {
    for (const m of MOMENTS) {
      const kind = kindOf(m);
      for (const band of BANDS) {
        for (const e of many(m, band, 3000)) {
          const heard = kind === 'warm' ? e.have : e.need;
          if (heard >= 3 && heard <= 9 && heard !== e.answer) expect(e.stones).toContain(heard);
          expect(e.stones.some((s) => Math.abs(s - e.answer) === 1)).toBe(true);
          const table = new Map(stoneCandidates(kind, e).map((c) => [c.value, c.kind]));
          for (const [s, why] of Object.entries(e.decoys ?? {})) expect(why).toBe(table.get(Number(s)) ?? 'near');
        }
      }
    }
    // The example of 4.1: warm, need 14, have 6, answer 8.
    const table = Object.fromEntries(stoneCandidates('warm', { need: 14, have: 6, answer: 8 }).map((c) => [c.value, c.kind]));
    expect(table).toEqual({ 7: 'slip', 9: 'slip', 6: 'heard', 4: 'first-nest', 5: 'near' });
    // Snow, have 13, need 7, answer 6: heard 7 (a slip first), first-nest 3, second-nest 3 (taken), near 4, 8, 9.
    const snow = Object.fromEntries(stoneCandidates('snow', { need: 7, have: 13, answer: 6 }).map((c) => [c.value, c.kind]));
    expect(snow).toEqual({ 5: 'slip', 7: 'slip', 3: 'first-nest', 4: 'near', 8: 'near', 9: 'near' });
  });

  it('brings in a nest mistake (only the first ten, or only the second) most of the time it exists', () => {
    for (const m of MOMENTS) {
      for (const band of BANDS) {
        let valid = 0;
        let shown = 0;
        for (const e of many(m, band, 3000)) {
          const nests = stoneCandidates(kindOf(m), e).filter((c) => c.kind === 'first-nest' || c.kind === 'second-nest');
          if (!nests.length) continue;
          valid++;
          if (nests.some((c) => e.stones.includes(c.value))) shown++;
        }
        expect(shown / valid).toBeGreaterThan(0.6);
      }
    }
  });

  it('puts the answer evenly on every place a kind can show: 1/n ± 7 points over 10,000 eggs', () => {
    for (const m of MOMENTS) {
      for (const band of BANDS) {
        const n = TRAY[band];
        const counts = new Array<number>(n).fill(0);
        const eggs = many(m, band);
        for (const e of eggs) counts[e.stones.indexOf(e.answer)]++;
        const reach = [...new Set(eggCombos(kindOf(m), band).flatMap((c) => placesFor(kindOf(m), c, n)))];
        // Snow eggs in band A never show the answer as the biggest stone: the need she heard (7 to 9) is always in
        // and bigger than any answer (3 to 6). Every other kind and band reaches every place.
        expect(reach.length).toBe(m === 'snow' && band === 'a' ? n - 1 : n);
        for (const p of reach) expect(Math.abs(counts[p] / eggs.length - 1 / reach.length), `${m} ${band} place ${p}`).toBeLessThanOrEqual(0.07);
      }
    }
  });

  it('lets no simple guess win above 35% with 4 stones or 30% with 5: biggest, smallest, middle, nearest five', () => {
    const rules: Record<string, (stones: number[], answer: number) => number> = {
      biggest: (s, a) => Number(s[s.length - 1] === a),
      smallest: (s, a) => Number(s[0] === a),
      'lower middle': (s, a) => Number(s[Math.floor((s.length - 1) / 2)] === a),
      'upper middle': (s, a) => Number(s[Math.ceil((s.length - 1) / 2)] === a),
      'nearest five': nearFiveShare,
    };
    const check = (eggs: EggSpec[], limit: number, label: string) => {
      for (const [name, rule] of Object.entries(rules)) {
        const wins = eggs.reduce((t, e) => t + rule(e.stones, e.answer), 0) / eggs.length;
        expect(wins, `${label}: ${name}`).toBeLessThanOrEqual(limit);
      }
    };
    for (const band of BANDS) {
      const limit = band === 'a' ? 0.35 : 0.3;
      const byMoment = MOMENTS.map((m) => many(m, band, 10_000, 3));
      byMoment.forEach((eggs, i) => check(eggs, limit, `${MOMENTS[i]} ${band}`));
      check(byMoment.flat(), limit, `all ${band}`);
    }
  });
});

describe('variety', () => {
  it('draws each moment from its own stream, so other moments never shift its sum', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const alone = eggSpec('snow', stream(seed, 'egg2'), { band: 'b' });
      // A full play draws egg 1, a wish and the rack on their own streams first.
      const r1 = stream(seed, 'egg1');
      eggSpec('warm', r1);
      for (let i = 0; i < 40; i++) stream(seed, 'wish1')();
      rackSpec(stream(seed, 'rack'), { band: 'a' });
      const inPlay = eggSpec('snow', stream(seed, 'egg2'), { band: 'b' });
      expect({ ...inPlay, clips: null }).toEqual({ ...alone, clips: null });
    }
    const differ = Array.from({ length: 100 }, (_, i) => i + 1).filter((seed) => {
      const a = eggSpec('warm', stream(seed, 'egg1'));
      const b = eggSpec('warm', stream(seed, 'rack'));
      return a.need !== b.need || a.have !== b.have || a.stones.join() !== b.stones.join();
    });
    expect(differ.length).toBeGreaterThan(80);
  });

  it('never repeats a total or an answer within a play, and avoids the last play\'s totals while it can', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const pick = seeded(seed);
      const lastTotals = [11 + Math.floor(pick() * 5), 12 + Math.floor(pick() * 4)];
      const used = { totals: [] as number[], answers: [] as number[] };
      const note = (e: EggSpec) => {
        used.totals.push(totalOf(e));
        used.answers.push(e.answer);
      };
      // Egg 1 is band A; each moment's outcome moves the band for the next.
      let band: Band = 'a';
      const egg1 = eggSpec('warm', stream(seed, 'egg1'), { band, used, lastTotals });
      note(egg1);
      band = nextBand(band, pick() < 0.5 ? 'first' : 'helped');
      const egg2 = eggSpec('snow', stream(seed, 'egg2'), { band, used, lastTotals });
      note(egg2);
      band = nextBand(band, pick() < 0.5 ? 'first' : 'helped');
      const rack = rackSpec(stream(seed, 'rack'), { band, used, lastTotals });
      note(rack);
      expect(new Set(used.totals).size).toBe(3);
      expect(new Set(used.answers).size).toBe(3);
      expect(lastTotals).not.toContain(totalOf(egg1));
    }
  });

  it('falls back to a repeat only when nothing fresh is left', () => {
    const every = { totals: [11, 12, 13, 14, 15, 16], answers: [3, 4, 5, 6, 7, 8, 9] };
    const e = eggSpec('warm', seeded(4), { used: every, lastTotals: [11, 12, 13, 14, 15] });
    expect(e.stones).toContain(e.answer);
    // Only 15 is left after this play's totals: the last play's 15 is let go of first.
    const only15 = eggSpec('warm', seeded(4), { used: { totals: [11, 12, 13, 14], answers: [] }, lastTotals: [15] });
    expect(only15.need).toBe(15);
    // A used answer is let go of before a used total.
    const fresh = eggSpec('warm', seeded(4), { used: { totals: [11, 12, 13, 14], answers: [6, 7, 8] } });
    expect(fresh.need).toBe(15);
  });
});

describe('the hay rack (4.3)', () => {
  it('is a warm sum with the hay skin and v3\'s hay rack lines', () => {
    for (const band of BANDS) {
      for (const e of many('rack', band, 500)) {
        expect(e.kind).toBe('warm');
        expect(e.skin).toBe('hay');
        expect(e.clips.intro).toEqual([]);
        expect(e.clips.goal).toEqual([`num-rack-${e.need}`, `num-in-${e.have}`, 'g-hay-rack']);
        expect(e.clips.afterGoal).toBeUndefined();
        expect(e.clips.right).toEqual(['fb-rack-full', `num-bond-${e.have}-${e.answer}`]);
        expect(e.clips.hint).toEqual(['h-count-gaps']);
        expect(e.clips.count).toEqual(Array.from({ length: e.answer }, (_, i) => `num-${i + 1}`));
      }
    }
    const e = rackSpec(seeded(2));
    expect(e.clips.tooBig(2)).toEqual(['fb-too-many', 'num-over-2']);
    expect(e.clips.tooSmall(3)).toEqual(['num-more-3']);
    expect(eggSpec('warm', seeded(2)).skin).toBe('egg');
  });

  it('every hay rack clip is an ok v3 clip, and both hay pictures exist', () => {
    for (const id of allRackClipIds()) expect(v3Clips.has(id), id).toBe(true);
    // The pictures src/ui/hay.ts shows (HAY_PIC).
    for (const rel of ['items/item-hay-bundle.webp', 'items/item-straw-pile.webp']) expect(existsSync(join(v3, 'public/art', rel)), rel).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------- 2.3.0

/** The grade table of 2.3 section 19.1, as the doc writes it: the number of sums per grade (and band for hard). */
const SUM_COUNT: Record<EggKind, Record<string, number>> = {
  warm: { easy: 9, middle: 7, 'hard a': 12, 'hard b': 15 },
  snow: { easy: 10, middle: 8, 'hard a': 9, 'hard b': 16 },
};
const gradeKey = (grade: SumGrade, band: Band) => (grade === 'hard' ? `hard ${band}` : grade);
const bandsOf = (grade: SumGrade): readonly Band[] => (grade === 'hard' ? BANDS : ['a']);

/**
 * Whole plays as the level asks them: egg 1 (warm) and egg 2 (snow), each with three sums from its own stream, this
 * play's sums carried from egg 1 to egg 2, and the last play's totals drawn from what a play can ask. Both eggs in
 * `band`, so every kind gets 10,000 eggs per band.
 */
function plays(band: Band, n = 10_000): { kind: EggKind; sums: EggSpec[] }[] {
  const out: { kind: EggKind; sums: EggSpec[] }[] = [];
  for (let seed = 1; seed <= n; seed++) {
    const pick = seeded(seed * 31 + 7);
    const lastTotals = Array.from({ length: 6 }, () => 7 + Math.floor(pick() * 10));
    const used = { totals: [] as number[], answers: [] as number[] };
    for (const [kind, label] of [['warm', 'egg1'], ['snow', 'egg2']] as const) {
      const sums = eggSums(kind, stream(seed, label), { band, used, lastTotals, first: true });
      for (const e of sums) {
        used.totals.push(totalOf(e));
        used.answers.push(e.answer);
      }
      out.push({ kind, sums });
    }
  }
  return out;
}
const PLAYS: Record<Band, { kind: EggKind; sums: EggSpec[] }[]> = { a: plays('a'), b: plays('b') };
const eggsOf = (kind: EggKind, band: Band) => PLAYS[band].filter((p) => p.kind === kind).map((p) => p.sums);

describe('three sums per egg: the grade table (2.3 section 19.1)', () => {
  it('has the sums of the table, each inside the floor: no total under 7, nothing adds or takes away 1 or 2', () => {
    for (const kind of KINDS) {
      for (const grade of SUM_GRADES) {
        for (const band of bandsOf(grade)) {
          const all = gradeCombos(kind, grade, band);
          expect(all, `${kind} ${grade} ${band}`).toHaveLength(SUM_COUNT[kind][gradeKey(grade, band)]);
          for (const c of all) {
            expect(totalOf(c)).toBeGreaterThanOrEqual(7);
            expect(c.answer).toBeGreaterThanOrEqual(3);
            expect(c.answer).toBe(kind === 'warm' ? c.need - c.have : c.have - c.need);
          }
        }
      }
    }
  });

  it('keeps easy within 10, middle at 11 or 12 and hard at 13 and more, so the grades never overlap', () => {
    for (const kind of KINDS) {
      for (const band of BANDS) {
        const totals = (g: SumGrade) => gradeCombos(kind, g, band).map(totalOf);
        expect(Math.max(...totals('easy'))).toBeLessThanOrEqual(10);
        expect(new Set(totals('middle'))).toEqual(new Set([11, 12]));
        expect(Math.min(...totals('hard'))).toBeGreaterThanOrEqual(13);
      }
    }
    // Easy is within 10 on both sides of the sum, as at her school: the warm egg needs 7 to 9, the snow egg starts at
    // 7 to 10 and ends under 10.
    for (const c of gradeCombos('warm', 'easy')) expect(c.need).toBeLessThanOrEqual(9);
    for (const c of gradeCombos('snow', 'easy')) expect(c.need).toBeLessThan(10);
  });

  it('never ends an easy or a middle sum at a bond to 10 she knows, except the snow egg\'s take-away from 10', () => {
    for (const kind of KINDS) {
      for (const grade of ['easy', 'middle'] as const) {
        for (const c of gradeCombos(kind, grade)) {
          const bond = kind === 'warm' ? c.need === 10 : c.need === 10 || (c.have === 10 && grade !== 'easy');
          expect(bond, `${kind} ${grade} ${c.need}/${c.have}`).toBe(false);
        }
      }
    }
    expect(gradeCombos('snow', 'easy').filter((c) => c.have === 10).map((c) => c.answer)).toEqual([6, 5, 4, 3]);
  });
});

describe('three sums per egg: the egg', () => {
  it('asks easy first, then middle and hard in either order, each with its heart', () => {
    let middleSecond = 0;
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const sums of eggsOf(kind, band)) {
          expect(sums.map((s) => s.grade)[0]).toBe('easy');
          expect(new Set(sums.map((s) => s.grade))).toEqual(new Set(SUM_GRADES));
          expect(sums.map((s) => s.round)).toEqual([{ index: 0, of: 3 }, { index: 1, of: 3 }, { index: 2, of: 3 }]);
          if (sums[1].grade === 'middle') middleSecond++;
        }
      }
    }
    // Drawn from the egg's stream: about half of the eggs ask the middle sum second.
    expect(middleSecond / 40_000).toBeGreaterThan(0.45);
    expect(middleSecond / 40_000).toBeLessThan(0.55);
  });

  it('never asks a total or an answer twice in one egg, so "the same stone as last time" never wins', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const sums of eggsOf(kind, band)) {
          expect(new Set(sums.map(totalOf)).size).toBe(3);
          expect(new Set(sums.map((s) => s.answer)).size).toBe(3);
        }
      }
    }
  });

  it('keeps every sum inside its grade\'s ranges; only the hard sum has a band', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const sums of eggsOf(kind, band).slice(0, 3000)) {
          for (const s of sums) {
            const grade = s.grade as SumGrade;
            const r = gradeRanges(kind, grade, band);
            expect(s.need >= r.need[0] && s.need <= r.need[1] && s.have >= r.have[0] && s.have <= r.have[1]).toBe(true);
            expect(s.band).toBe(grade === 'hard' ? band : undefined);
            expect(s.kind).toBe(kind);
            expect(s.skin).toBe('egg');
          }
        }
      }
    }
  });

  it('shows 4 stones for every easy and middle sum, and 4 (A) or 5 (B) for the hard one', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const sums of eggsOf(kind, band)) {
          for (const s of sums) expect(s.stones, `${kind} ${s.grade} ${band}`).toHaveLength(s.grade === 'hard' ? TRAY[band] : 4);
        }
      }
    }
  });

  it('lets every sum of every grade come up, and none come back much more often than the others', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const grade of SUM_GRADES) {
          if (grade !== 'hard' && band === 'b') continue;
          const counts = new Map<string, number>();
          const asked = eggsOf(kind, band).map((sums) => sums.find((s) => s.grade === grade) as EggSpec);
          for (const s of asked) counts.set(`${s.need}/${s.have}`, (counts.get(`${s.need}/${s.have}`) ?? 0) + 1);
          expect(counts.size, `${kind} ${grade} ${band}`).toBe(gradeCombos(kind, grade, band).length);
          for (const [sum, k] of counts) expect(k / asked.length, `${kind} ${grade} ${band} ${sum}`).toBeLessThanOrEqual(0.3);
        }
      }
    }
  });

  it('plans the same three sums from the same stream and options, whatever other streams drew', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const o = { band: 'b' as Band, used: { totals: [8, 12, 14], answers: [5, 4, 6] }, lastTotals: [9, 11], first: true };
      const alone = eggSums('snow', stream(seed, 'egg2'), o);
      for (const label of ['egg1', 'hatch1', 'naming1', 'wish1', 'pond']) for (let i = 0; i < 40; i++) stream(seed, label)();
      const inPlay = eggSums('snow', stream(seed, 'egg2'), o);
      expect(inPlay.map((s) => ({ ...s, clips: null }))).toEqual(alone.map((s) => ({ ...s, clips: null })));
    }
  });

  it('avoids this play\'s totals across the eggs while it can', () => {
    let shared = 0;
    for (const band of BANDS) {
      for (let i = 0; i < PLAYS[band].length; i += 2) {
        const warm = new Set(PLAYS[band][i].sums.map(totalOf));
        shared += PLAYS[band][i + 1].sums.filter((s) => warm.has(totalOf(s))).length;
      }
    }
    // Middle sums are 11 or 12 for both eggs, so the snow egg's middle sum takes the total the warm egg left. A
    // repeat is rare, when a place in the egg plan has no other sum.
    expect(shared / 20_000).toBeLessThan(0.25);
  });
});

describe('three sums per egg: the trays and the guess rules (2.3 section 19.1)', () => {
  const RULES: Record<string, (stones: number[], answer: number) => number> = {
    biggest: (s, a) => Number(s[s.length - 1] === a),
    smallest: (s, a) => Number(s[0] === a),
    'lower middle': (s, a) => Number(s[Math.floor((s.length - 1) / 2)] === a),
    'upper middle': (s, a) => Number(s[Math.ceil((s.length - 1) / 2)] === a),
    'nearest five': nearFiveShare,
  };
  const check = (sums: EggSpec[], label: string) => {
    const limit = sums[0].stones.length === 5 ? 0.3 : 0.35;
    for (const [name, rule] of Object.entries(RULES)) {
      const wins = sums.reduce((t, e) => t + rule(e.stones, e.answer), 0) / sums.length;
      expect(wins, `${label}: ${name}`).toBeLessThanOrEqual(limit);
    }
  };

  it('shows different stones from 3 to 9, ascending, with the answer, a slip and the number she heard when it can', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const sums of eggsOf(kind, band).slice(0, 3000)) {
          for (const e of sums) {
            expect(new Set(e.stones).size).toBe(e.stones.length);
            expect([...e.stones].sort((a, b) => a - b)).toEqual(e.stones);
            expect(e.stones).toContain(e.answer);
            for (const s of e.stones) expect(s >= STONES.min && s <= STONES.max).toBe(true);
            const heard = kind === 'warm' ? e.have : e.need;
            if (heard >= 3 && heard <= 9 && heard !== e.answer) expect(e.stones).toContain(heard);
            expect(e.stones.some((s) => Math.abs(s - e.answer) === 1)).toBe(true);
            const table = new Map(stoneCandidates(kind, e).map((c) => [c.value, c.kind]));
            const wrong = e.stones.filter((s) => s !== e.answer);
            expect(Object.keys(e.decoys ?? {}).map(Number).sort((a, b) => a - b)).toEqual(wrong);
            for (const [s, why] of Object.entries(e.decoys ?? {})) expect(why).toBe(table.get(Number(s)) ?? 'near');
          }
        }
      }
    }
  });

  it('brings in the "fills to ten" mistake (10 - the warm cups) of an easy warm sum most of the time it is its own stone', () => {
    let valid = 0;
    let shown = 0;
    for (const sums of eggsOf('warm', 'a')) {
      const e = sums[0];
      // Only where no slip or heard stone has the same number already.
      const fill = stoneCandidates('warm', e).find((c) => c.kind === 'first-nest');
      if (!fill) continue;
      expect(fill.value).toBe(10 - e.have);
      valid++;
      if (e.stones.includes(fill.value)) shown++;
    }
    expect(valid).toBeGreaterThan(1000);
    expect(shown / valid).toBeGreaterThan(0.6);
  });

  it('lets no simple guess win above 35% with 4 stones or 30% with 5, per kind, grade and band', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const grade of SUM_GRADES) {
          if (grade !== 'hard' && band === 'b') continue;
          check(eggsOf(kind, band).map((sums) => sums.find((s) => s.grade === grade) as EggSpec), `${kind} ${grade} ${band}`);
        }
      }
    }
  });

  it('lets no simple guess win above 35% with 4 stones or 30% with 5 at any place in the egg (first, second, third)', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        const eggs = eggsOf(kind, band);
        for (const i of [0, 1, 2]) {
          for (const n of [4, 5]) {
            const sums = eggs.map((s) => s[i]).filter((s) => s.stones.length === n);
            if (sums.length) check(sums, `${kind} ${band} sum ${i + 1} with ${n} stones`);
          }
        }
      }
    }
  });

  it('puts the hard sum\'s answer evenly on every place it can show: 1/n ± 7 points', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        const n = TRAY[band];
        const hard = eggsOf(kind, band).map((sums) => sums.find((s) => s.grade === 'hard') as EggSpec);
        const counts = new Array<number>(n).fill(0);
        for (const e of hard) counts[e.stones.indexOf(e.answer)]++;
        const reach = gradeReach(kind, 'hard', band);
        // As in 2.2: the snow egg in band A never shows its answer as the biggest stone (the need she heard is bigger).
        expect(reach.length).toBe(kind === 'snow' && band === 'a' ? n - 1 : n);
        for (const p of reach) expect(Math.abs(counts[p] / hard.length - 1 / reach.length), `${kind} ${band} place ${p}`).toBeLessThanOrEqual(0.07);
      }
    }
  });
});

describe('three sums per egg: the band (2.3 section 19.1)', () => {
  /** The smallest game noteMaths needs: the band and the results log. */
  function fakeGame(fixed: Band | null = null) {
    const lines: { part: string; detail: Record<string, unknown> }[] = [];
    const g = { maths: startMaths(fixed), results: { add: (part: string, _s: string, _r: MomentResult, detail: Record<string, unknown>) => lines.push({ part, detail }) } };
    return { g: g as unknown as Game, lines };
  }
  const result = (outcome: Outcome): MomentResult => ({ outcome, misses: outcome === 'first' ? 0 : 1, ms: 4000 });
  const t = { tried: [] as string[], flags: {}, log: () => {} };
  const [easy, middle, hard] = (() => {
    const sums = eggSums('warm', seeded(3), { band: 'a' });
    return SUM_GRADES.map((g) => sums.find((s) => s.grade === g) as EggSpec);
  })();

  it('moves only after the hard sum: a first try to B, a helped answer back to A', () => {
    const { g } = fakeGame();
    noteMaths(g, 'egg1', easy, result('first'), t);
    noteMaths(g, 'egg1', middle, result('first'), t);
    expect(g.maths.band).toBe('a');
    noteMaths(g, 'egg1', hard, result('first'), t);
    expect(g.maths.band).toBe('b');
    noteMaths(g, 'egg2', easy, result('helped'), t);
    noteMaths(g, 'egg2', middle, result('helped'), t);
    expect(g.maths.band).toBe('b');
    noteMaths(g, 'egg2', hard, result('helped'), t);
    expect(g.maths.band).toBe('a');
  });

  it('moves after the hay rack, and never when ?maths= fixes it', () => {
    const { g } = fakeGame();
    noteMaths(g, 'rack', rackSpec(seeded(4), { band: 'a' }), result('first'), t);
    expect(g.maths.band).toBe('b');
    const fixed = fakeGame('a').g;
    noteMaths(fixed, 'egg1', hard, result('first'), t);
    expect(fixed.maths.band).toBe('a');
  });

  it('logs every sum with its grade and heart', () => {
    const { g, lines } = fakeGame();
    for (const s of [easy, hard, middle]) noteMaths(g, 'egg1', s, result('first'), t);
    expect(lines.map((l) => [l.part, l.detail.grade, l.detail.round])).toEqual([['egg1', 'easy', 0], ['egg1', 'hard', 1], ['egg1', 'middle', 2]]);
  });
});

describe('clips', () => {
  /** Band B's take-away facts that are new lines (section 6), generated in 2.2.0. */
  const NEW_FACTS = ['num-take-14-7', 'num-take-15-7', 'num-take-15-8', 'num-take-16-7', 'num-take-16-8', 'num-take-16-9'];
  /** The 19 number lines of 2.3 section 19.1 (the grade table's last column), and the hearts line, for gen.sh. */
  const NEW_23 = [
    'g4-hearts', 'num-egg-4', 'num-egg-5', 'num-toowarm-7', 'num-toowarm-8', 'num-toowarm-9', 'num-toowarm-10',
    'num-take-7-3', 'num-take-8-3', 'num-take-8-4', 'num-take-9-3', 'num-take-9-4', 'num-take-9-5', 'num-take-10-3',
    'num-take-10-4', 'num-take-10-5', 'num-take-10-6', 'num-take-11-5', 'num-take-11-6', 'num-take-12-6',
  ];
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

  it('every clip of every reachable sum and stone exists or has a line, and only 2.3\'s new lines wait for gen.sh', () => {
    const all = [...new Set([...allEggClipIds(), ...allRackClipIds()])];
    for (const id of all) expect(clipExists(id) || !!lineFor(id), id).toBe(true);
    // Once gen.sh has run, this list is empty.
    expect(all.filter((id) => !clipExists(id)).every((id) => NEW_23.includes(id))).toBe(true);
    for (const id of NEW_23) expect(all, id).toContain(id);
    for (const id of NEW_FACTS) expect(clipExists(id), id).toBe(true);
    for (const id of [...NEW_FACTS, ...NEW_23.filter((x) => x.startsWith('num-take-'))]) {
      const [a, b] = id.split('-').slice(2).map(Number);
      expect(lineFor(id)?.text).toBe(`${cap(words[a])} take away ${words[b]} is ${words[a - b]}!`);
    }
    expect(lineFor('num-egg-4')?.text).toBe('This egg needs four warm cups.');
    expect(lineFor('num-toowarm-7')?.text).toBe('But seven cups are warm!');
    expect(lineFor('g4-hearts')?.text).toBe('Fill all three hearts, and the egg will hatch.');
    // The warm egg's easy and middle sums need no new audio: v3 has every bond and every goal.
    for (const grade of ['easy', 'middle'] as const) {
      for (const c of gradeCombos('warm', grade)) {
        for (const id of [`num-egg-${c.need}`, `num-warm-${c.have}`, `num-bond-${c.have}-${c.answer}`]) expect(clipExists(id), id).toBe(true);
      }
    }
  });

  it('lists every clip an egg\'s three sums can say', () => {
    const all = new Set(allEggClipIds());
    for (const band of BANDS) {
      for (const kind of KINDS) for (const sums of eggsOf(kind, band).slice(0, 2000)) for (const s of sums) for (const id of eggClipIds(s)) expect(all.has(id), id).toBe(true);
    }
  });

  it('lists every clip a spec can say, with miss lines for every distance up to 6', () => {
    const all = new Set([...allEggClipIds(), ...allRackClipIds()]);
    for (const m of MOMENTS) {
      for (const band of BANDS) {
        const r = seeded(9);
        for (let i = 0; i < 1500; i++) {
          const e = m === 'rack' ? rackSpec(r, { band }) : eggSpec(m, r, { band, first: i % 2 === 0 });
          for (const id of eggClipIds(e)) expect(all.has(id), id).toBe(true);
        }
      }
    }
    for (const k of [1, 2, 3, 4, 5, 6]) {
      for (const id of [`num-over-${k}`, `num-cold-${k}`, `num-still-warm-${k}`, `num-more-${k}`]) {
        expect(all.has(id), id).toBe(true);
        expect(clipExists(id), id).toBe(true);
      }
    }
  });
});
