// The maths lane (docs/v4/2.2.md section 4 and 8.1, docs/v4/2.3.md sections 12 and 19.1): the bands and their floor,
// the trays of 4 or 5 stones with real mistakes, that no place and no simple guess wins much more than a blind guess,
// the per-moment streams, no fact asked twice in a play, and that every clip a maths moment can say exists. 2.3.0: an
// egg's three sums (easy, middle, hard), the guess rules per grade and per place in the egg, and that only the hard sum
// and the hay rack move the band. Every number in every sum, and every stone, is 10 or less (Tjitse: "On her school
// everything is until the number 10"). 2.4.0 (docs/v4/2.4.md sections 5.3 and 5.5): the star egg's more and fewer, and
// no sum and no take-away fact twice in a play, with the guess rules on every second egg of a kind.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EggSpec, MomentResult, Outcome, SumGrade } from '../src/contracts.ts';
import {
  type AskedSums, type Band, type EggCombo, type EggKind, RANGES, STONES, SUM_GRADES, TRAY, allEggClipIds, eggClipIds, eggCombos,
  LIVE, eggPlanFit, eggSpec, eggSums, factClip, freshCombos, gradeCombos, gradeRanges, gradeReach, gradeTray, heardOf, liveEnd,
  nearFiveShare, nextBand, placesFor, prepareEggPlan, reachableStones, starCompares, stoneCandidates, totalOf,
} from '../src/content/eggs.ts';
import { allRackClipIds, rackSpec } from '../src/content/rack.ts';
import { seeded, stream } from '../src/content/rand.ts';
import { type MathsState, startMaths, useSum } from '../src/game/band.ts';
import { eggAsk, noteMaths, planEggs, prepareEggPlans } from '../src/game/maths.ts';
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

/** The other part of a sum: the warm cups of an adding sum, what is left of a take-away. */
const otherPart = (kind: EggKind, c: EggCombo): number => (kind === 'warm' ? c.have : c.need);

describe('every number within 10 (2.3 section 19.1)', () => {
  /** Every sum and every stone any tray of it can show, for the eggs' three grades and the one-sum moment. */
  function everyTray(): { label: string; kind: EggKind; c: EggCombo; stones: number[] }[] {
    const out: { label: string; kind: EggKind; c: EggCombo; stones: number[] }[] = [];
    for (const kind of KINDS) {
      for (const grade of SUM_GRADES) {
        for (const band of grade === 'hard' ? BANDS : (['a'] as const)) {
          const n = gradeTray(grade, band);
          for (const c of gradeCombos(kind, grade, band)) out.push({ label: `${kind} ${grade} ${band}`, kind, c, stones: [c.answer, ...reachableStones(kind, c, n)] });
        }
      }
      // The one-sum moment: the hay rack's (warm) and the ui harness's.
      for (const band of BANDS) for (const c of eggCombos(kind, band)) out.push({ label: `${kind} one sum ${band}`, kind, c, stones: [c.answer, ...reachableStones(kind, c, TRAY[band])] });
    }
    return out;
  }

  it('keeps the need, the warm cups, the answer and every stone any tray can show at 10 or less, in every grade, band and the hay rack', () => {
    const all = everyTray();
    // Graded: warm 5 + 4 + 5 + 5, snow 5 + 4 + 5 + 5. One sum: warm (the hay rack) 9 + 12, snow 9 + 5.
    expect(all).toHaveLength(19 + 19 + 21 + 14);
    for (const { label, kind, c, stones } of all) {
      const at = `${label} ${c.need}/${c.have}`;
      for (const v of [c.need, c.have, c.answer, ...stones]) expect(v, at).toBeLessThanOrEqual(10);
      expect(totalOf(c), at).toBeGreaterThanOrEqual(7);
      // The floor: nothing adds or takes away 1 or 2, so the answer and the other part are 3 or more.
      expect(c.answer, at).toBeGreaterThanOrEqual(3);
      expect(otherPart(kind, c), at).toBeGreaterThanOrEqual(3);
      expect(c.answer + otherPart(kind, c), at).toBe(totalOf(c));
      for (const s of stones) expect(s >= STONES.min && s <= STONES.max, `${at} stone ${s}`).toBe(true);
    }
    // The hay rack is the warm one-sum moment, and the eggs' trays reach every stone from 2 to 9.
    expect(rackSpec(seeded(1), { band: 'b' }).need).toBeLessThanOrEqual(10);
    expect(new Set(all.flatMap((t) => t.stones))).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9]));
    expect(STONES).toEqual({ min: 2, max: 9 });
  });

  it('shows a stone of 2 only as a wrong stone: no answer is under 3', () => {
    for (const { c, stones } of everyTray()) if (stones.includes(2)) expect(c.answer).toBeGreaterThanOrEqual(3);
  });

});

describe('the one-sum moment, the hay rack\'s: bands and ranges (4.2)', () => {
  it('has the sums of the design: 9 and 12 warm (the hay rack), 9 and 5 snow (the ui harness)', () => {
    expect(eggCombos('warm', 'a')).toHaveLength(9);
    expect(eggCombos('warm', 'b')).toHaveLength(12);
    expect(eggCombos('snow', 'a')).toHaveLength(9);
    expect(eggCombos('snow', 'b')).toHaveLength(5);
    // The rack: band A has the totals 7 to 9, band B 8 to 10 with the bonds to 10. The snow one-sum moment, which only
    // the ui harness asks: band A 7 to 9, band B the bonds to 10.
    for (const kind of KINDS) expect(new Set(eggCombos(kind, 'a').map(totalOf))).toEqual(new Set([7, 8, 9]));
    expect(new Set(eggCombos('warm', 'b').map(totalOf))).toEqual(new Set([8, 9, 10]));
    expect(new Set(eggCombos('snow', 'b').map(totalOf))).toEqual(new Set([10]));
  });

  it('keeps every sum inside its band and the floor: nothing adds or takes 1 or 2, none starts under 7, all within 10', () => {
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
          expect(totalOf(e)).toBeGreaterThanOrEqual(7);
          expect(otherPart(kind, e)).toBeGreaterThanOrEqual(3);
          // Within 10, as at her school: the whole is 10 or less.
          expect(Math.max(e.need, e.have, ...e.stones)).toBeLessThanOrEqual(10);
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
  it('shows 4 (A) or 5 (B) different stones from 2 to 9, ascending, with the answer, and logs why each wrong one is in', () => {
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
    // Warm, need 8, have 3, answer 5: heard 3, "fills to ten" 7, no second nest, near 2 and 8 (3 and 7 taken).
    const table = Object.fromEntries(stoneCandidates('warm', { need: 8, have: 3, answer: 5 }).map((c) => [c.value, c.kind]));
    expect(table).toEqual({ 4: 'slip', 6: 'slip', 3: 'heard', 7: 'first-nest', 2: 'near', 8: 'near' });
    // Snow, have 10, need 4, answer 6 (a bond to 10): heard 4, the first nest 10 - 4 is the answer, near 8, 3 and 9.
    const snow = Object.fromEntries(stoneCandidates('snow', { need: 4, have: 10, answer: 6 }).map((c) => [c.value, c.kind]));
    expect(snow).toEqual({ 5: 'slip', 7: 'slip', 4: 'heard', 8: 'near', 3: 'near', 9: 'near' });
  });

  it('brings in the nest mistake ("fills to ten") most of the time it exists and the tray has room for it', () => {
    for (const m of MOMENTS) {
      for (const band of BANDS) {
        let valid = 0;
        let shown = 0;
        for (const e of many(m, band, 3000)) {
          const nests = stoneCandidates(kindOf(m), e).filter((c) => c.kind === 'first-nest' || c.kind === 'second-nest');
          if (!nests.length) continue;
          // Within 10 the nest stone (10 - the other part) is always bigger than the answer, so a tray whose biggest
          // stone is the answer, a quarter of band A's, has no room for it (2.3 section 19.1). 2.2 counted every tray.
          expect(nests.every((c) => c.value > e.answer)).toBe(true);
          if (e.stones[e.stones.length - 1] === e.answer) continue;
          valid++;
          if (nests.some((c) => e.stones.includes(c.value))) shown++;
        }
        // The snow one-sum moment's band B asks only bonds to 10, which have no nest mistake (10 - 4 is the answer).
        if (m === 'snow' && band === 'b') expect(valid).toBe(0);
        else expect(shown / valid, `${m} ${band}`).toBeGreaterThan(0.6);
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
        // Within 10 every kind and band reaches every place (2.2's snow egg in band A could not show its answer as the
        // biggest stone).
        expect(reach.length).toBe(n);
        for (const p of reach) expect(Math.abs(counts[p] / eggs.length - 1 / reach.length), `${m} ${band} place ${p}`).toBeLessThanOrEqual(0.07);
      }
    }
  });

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

  it('lets no simple guess win above 35% with 4 stones or 30% with 5: biggest, smallest, middle, nearest five', () => {
    for (const band of BANDS) {
      const limit = band === 'a' ? 0.35 : 0.3;
      const byMoment = MOMENTS.map((m) => many(m, band, 10_000, 3));
      byMoment.forEach((eggs, i) => check(eggs, limit, `${MOMENTS[i]} ${band}`));
      check(byMoment.flat(), limit, `all ${band}`);
    }
  });

  it('keeps the same bounds for the hay rack in whole plays, after both eggs asked their sums', () => {
    // The rack leaves out the facts the eggs asked (freshCombos), so its sums in a play are not its sums alone. 2.3.0
    // let "the biggest" win 47% of the rack in whole plays; this holds it.
    for (const band of BANDS) {
      const limit = band === 'a' ? 0.35 : 0.3;
      const racks = Array.from({ length: PLAYS[band].length / 2 }, (_, i) => {
        const sums = [...PLAYS[band][2 * i].sums, ...PLAYS[band][2 * i + 1].sums];
        const used = { totals: sums.map((e) => totalOf(e)), answers: sums.map((e) => e.answer) };
        return rackSpec(stream(i + 1, 'rack'), { band, used });
      });
      check(racks, limit, `rack in plays ${band}`);
    }
  });
});

describe('variety', () => {
  it('draws each moment from its own stream, so other moments never shift its sum', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const alone = eggSpec('snow', stream(seed, 'egg-shore'), { band: 'b' });
      // A full play draws egg 1, a wish and the rack on their own streams first.
      const r1 = stream(seed, 'egg-nest');
      eggSpec('warm', r1);
      for (let i = 0; i < 40; i++) stream(seed, 'wish-1')();
      rackSpec(stream(seed, 'rack'), { band: 'a' });
      const inPlay = eggSpec('snow', stream(seed, 'egg-shore'), { band: 'b' });
      expect({ ...inPlay, clips: null }).toEqual({ ...alone, clips: null });
    }
    const differ = Array.from({ length: 100 }, (_, i) => i + 1).filter((seed) => {
      const a = eggSpec('warm', stream(seed, 'egg-nest'));
      const b = eggSpec('warm', stream(seed, 'rack'));
      return a.need !== b.need || a.have !== b.have || a.stones.join() !== b.stones.join();
    });
    expect(differ.length).toBeGreaterThan(80);
  });

  it('never lets the hay rack ask a fact the eggs asked this play (the same total and answer, either way)', () => {
    let repeats = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const pick = seeded(seed);
      const used = { totals: [] as number[], answers: [] as number[] };
      const note = (e: EggSpec) => {
        used.totals.push(totalOf(e));
        used.answers.push(e.answer);
      };
      // Egg 1 is band A; each hard sum's outcome moves the band for the next moment.
      let band: Band = 'a';
      for (const [kind, label] of [['warm', 'egg-nest'], ['snow', 'egg-shore']] as const) {
        eggSums(kind, stream(seed, label), { band, used, first: true }).forEach(note);
        band = nextBand(band, pick() < 0.5 ? 'first' : 'helped');
      }
      const facts = used.totals.map((t, i) => `${t} ${used.answers[i]}`);
      const rack = rackSpec(stream(seed, 'rack'), { band, used });
      if (facts.includes(`${totalOf(rack)} ${rack.answer}`)) repeats++;
    }
    // Six facts per play, at most four of them in the rack's band: it always has a fresh one.
    expect(repeats).toBe(0);
  });

  it('lets go of the facts only when every sum was asked', () => {
    const all = eggCombos('warm', 'a');
    const asked = (cs: EggCombo[]) => ({ totals: cs.map(totalOf), answers: cs.map((c) => c.answer) });
    expect(freshCombos(all, { used: asked(all) })).toEqual(all);
    const [left, ...rest] = all;
    expect(freshCombos(all, { used: asked(rest) })).toEqual([left]);
    // A total or an answer alone does not make a sum stale: 9 and 3 were asked, but not 9 with the answer 3.
    expect(freshCombos(all, { used: { totals: [9, 7], answers: [4, 3] } })).toContainEqual({ need: 9, have: 6, answer: 3 });
    expect(freshCombos(all, { used: { totals: [9, 7], answers: [4, 3] } })).not.toContainEqual({ need: 9, have: 5, answer: 4 });
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
  warm: { easy: 5, middle: 4, 'hard a': 5, 'hard b': 5 },
  snow: { easy: 5, middle: 4, 'hard a': 5, 'hard b': 5 },
  star: { easy: 5, middle: 4, 'hard a': 5, 'hard b': 5 },
};
const gradeKey = (grade: SumGrade, band: Band) => (grade === 'hard' ? `hard ${band}` : grade);
const bandsOf = (grade: SumGrade): readonly Band[] => (grade === 'hard' ? BANDS : ['a']);

/**
 * Whole plays as the level asks them, one after another: egg 1 (warm) and egg 2 (snow), each with three sums from its
 * own stream, this play's sums carried from egg 1 to egg 2, and the play before's totals as the last play's. Both
 * eggs in `band`, so every kind gets 10,000 eggs per band.
 */
function plays(band: Band, n = 10_000): { kind: EggKind; sums: EggSpec[] }[] {
  const out: { kind: EggKind; sums: EggSpec[] }[] = [];
  let lastTotals: number[] = [];
  for (let seed = 1; seed <= n; seed++) {
    const used = { totals: [] as number[], answers: [] as number[] };
    for (const [kind, label] of [['warm', 'egg-nest'], ['snow', 'egg-shore']] as const) {
      const sums = eggSums(kind, stream(seed, label), { band, used, lastTotals, first: true });
      for (const e of sums) {
        used.totals.push(totalOf(e));
        used.answers.push(e.answer);
      }
      out.push({ kind, sums });
    }
    lastTotals = used.totals.slice();
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
            expect(otherPart(kind, c)).toBeGreaterThanOrEqual(3);
            expect(c.answer).toBe(kind === 'warm' ? c.need - c.have : c.have - c.need);
          }
        }
      }
    }
  });

  it('keeps easy at 7 or 8, middle at 9 and hard at 10, so the grades never overlap and all stay within 10', () => {
    for (const kind of KINDS) {
      for (const band of BANDS) {
        const totals = (g: SumGrade) => new Set(gradeCombos(kind, g, band).map(totalOf));
        expect(totals('easy')).toEqual(new Set([7, 8]));
        expect(totals('middle')).toEqual(new Set([9]));
        expect(totals('hard')).toEqual(new Set([10]));
      }
    }
    // The answers grow with the grade: easy 3 to 5, middle 3 to 6, hard 3 to 7.
    for (const kind of KINDS) {
      expect(new Set(gradeCombos(kind, 'easy').map((c) => c.answer))).toEqual(new Set([3, 4, 5]));
      expect(new Set(gradeCombos(kind, 'middle').map((c) => c.answer))).toEqual(new Set([3, 4, 5, 6]));
      for (const band of BANDS) expect(new Set(gradeCombos(kind, 'hard', band).map((c) => c.answer))).toEqual(new Set([3, 4, 5, 6, 7]));
    }
  });

  it('asks the bonds to 10 (GOAL.md) as the hard sum: the warm egg\'s missing part to 10, the snow egg\'s take away from 10', () => {
    for (const band of BANDS) {
      // Every bond to 10 with both parts 3 or more, in both bands: 3 + 7 to 7 + 3, 10 - 3 to 10 - 7.
      expect(gradeCombos('warm', 'hard', band)).toEqual([3, 4, 5, 6, 7].map((have) => ({ need: 10, have, answer: 10 - have })));
      expect(gradeCombos('snow', 'hard', band).map((c) => [c.have, c.answer])).toEqual([[10, 7], [10, 6], [10, 5], [10, 4], [10, 3]]);
    }
    // No easy or middle sum reaches 10.
    for (const kind of KINDS) for (const grade of ['easy', 'middle'] as const) for (const c of gradeCombos(kind, grade)) expect(totalOf(c)).toBeLessThan(10);
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

  it('lets every sum of every grade come up, and none more than 1.5 times its even share', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        for (const grade of SUM_GRADES) {
          if (grade !== 'hard' && band === 'b') continue;
          const counts = new Map<string, number>();
          const asked = eggsOf(kind, band).map((sums) => sums.find((s) => s.grade === grade) as EggSpec);
          for (const s of asked) counts.set(`${s.need}/${s.have}`, (counts.get(`${s.need}/${s.have}`) ?? 0) + 1);
          expect(counts.size, `${kind} ${grade} ${band}`).toBe(gradeCombos(kind, grade, band).length);
          const most = 1.5 / gradeCombos(kind, grade, band).length;
          for (const [sum, k] of counts) expect(k / asked.length, `${kind} ${grade} ${band} ${sum}`).toBeLessThanOrEqual(most);
        }
      }
    }
  });

  it('plans the same three sums from the same stream and options, whatever other streams drew', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const o = { band: 'b' as Band, used: { totals: [7, 9, 10], answers: [4, 5, 6] }, lastTotals: [8, 9, 10], first: true };
      const alone = eggSums('snow', stream(seed, 'egg-shore'), o);
      for (const label of ['egg-nest', 'hatch-1', 'naming-1', 'wish-1', 'pond']) for (let i = 0; i < 40; i++) stream(seed, label)();
      const inPlay = eggSums('snow', stream(seed, 'egg-shore'), o);
      expect(inPlay.map((s) => ({ ...s, clips: null }))).toEqual(alone.map((s) => ({ ...s, clips: null })));
    }
  });

  it('gives the snow egg\'s easy sum another total than the warm egg\'s while a sum just like it for the guess rules is left', () => {
    let shared = 0;
    for (const band of BANDS) {
      for (let i = 0; i < PLAYS[band].length; i += 2) {
        const [warm, snow] = [PLAYS[band][i].sums, PLAYS[band][i + 1].sums];
        // Within 10 both eggs ask the totals 9 and 10 (middle and hard), one adding and one taking away.
        for (const sums of [warm, snow]) expect(sums.slice(1).map(totalOf).sort()).toEqual([10, 9]);
        if (totalOf(warm[0]) === totalOf(snow[0])) shared++;
      }
    }
    // The easy sums have two totals, 7 and 8, so a blind pick shares one half of the time. A snow sum gives way only
    // to one with the same place and answer and the same heard number, so a third still shares (33% measured; the
    // bound was 20% of all snow sums when every grade had totals of its own, 2.3 section 19.1).
    expect(shared / 20_000).toBeLessThan(0.4);
  });

  it('leaves the last play\'s totals to the plan\'s spread: the same sums with or without them', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const o = { band: 'a' as Band, used: { totals: [8, 9, 10], answers: [5, 4, 6] }, first: true };
      const strip = (xs: EggSpec[]) => xs.map((s) => ({ ...s, clips: null }));
      expect(strip(eggSums('snow', stream(seed, 'egg-shore'), { ...o, lastTotals: [7, 8, 9, 10] }))).toEqual(strip(eggSums('snow', stream(seed, 'egg-shore'), o)));
    }
  });

  it('fits every egg plan within its bounds, in a few hundred rounds', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        const fit = eggPlanFit(kind, band);
        expect(fit.off, `${kind} ${band}`).toBeLessThanOrEqual(1e-5);
        expect(fit.rounds, `${kind} ${band}`).toBeLessThan(1000);
      }
    }
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

  it('shows different stones from 2 to 9, ascending, with the answer, a slip and the number she heard when it can', () => {
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

  it('brings in the "fills to ten" mistake (10 - the other part) most of the time it is its own stone and has room', () => {
    for (const kind of KINDS) {
      let valid = 0;
      let shown = 0;
      for (const sums of eggsOf(kind, 'a')) {
        for (const e of sums) {
          // Only where no slip or heard stone has the same number already: never in a bond to 10, where it is the
          // answer, nor at 9, where it is the slip above the answer.
          const fill = stoneCandidates(kind, e).find((c) => c.kind === 'first-nest');
          if (!fill) continue;
          expect(fill.value).toBe(10 - otherPart(kind, e));
          expect(totalOf(e)).toBeLessThan(9);
          // It is bigger than the answer, so a tray whose biggest stone is the answer has no room for it (a tenth of
          // the easy sums by the plan). 2.3.0 counted every tray.
          if (e.stones[e.stones.length - 1] === e.answer) continue;
          valid++;
          if (e.stones.includes(fill.value)) shown++;
        }
      }
      expect(valid, kind).toBeGreaterThan(5000);
      expect(shown / valid, kind).toBeGreaterThan(0.6);
    }
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

  it('keeps the hard sum\'s "leave out 2, 8 and 9, then take the smallest or the biggest" under 35% with 4 stones and 30% with 5', () => {
    // No answer is under 3 or over 7, so a child who has seen that a 2, 8 or 9 is never right could leave them out.
    // 2.3.0's first plan within 10 let the biggest stone under 8 win 47% of band A hard sums. Easy and middle keep
    // this open: with three answers there, a cap pushes "the 4" over half (docs/v4/2.3.md section 19.1).
    expect(LIVE).toEqual({ min: 3, max: 7 });
    for (const band of BANDS) {
      for (const kind of KINDS) {
        const hard = eggsOf(kind, band).map((sums) => sums.find((s) => s.grade === 'hard') as EggSpec);
        const limit = TRAY[band] === 5 ? 0.3 : 0.35;
        for (const end of ['low', 'high'] as const) {
          const wins = hard.filter((e) => liveEnd(e.stones, e.answer, end)).length / hard.length;
          expect(wins, `${kind} ${band} ${end}`).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  /** Drag the stone with the number she heard (the warm cups, the snow egg's need): it wins when that is the answer. */
  const heardWins = (sums: EggSpec[]) => sums.filter((e) => heardOf(e.kind, e) === e.answer).length / sums.length;

  it('lets "the number she just heard" win no more than a blind guess, per kind, grade and band and at every place in the egg', () => {
    for (const band of BANDS) {
      for (const kind of KINDS) {
        const eggs = eggsOf(kind, band);
        for (const grade of SUM_GRADES) {
          if (grade !== 'hard' && band === 'b') continue;
          const sums = eggs.map((s) => s.find((e) => e.grade === grade) as EggSpec);
          expect(heardWins(sums), `${kind} ${grade} ${band}`).toBeLessThanOrEqual(1 / sums[0].stones.length);
        }
        for (const i of [0, 1, 2]) {
          for (const n of [4, 5]) {
            const sums = eggs.map((s) => s[i]).filter((s) => s.stones.length === n);
            if (sums.length) expect(heardWins(sums), `${kind} ${band} sum ${i + 1} with ${n} stones`).toBeLessThanOrEqual(1 / n);
          }
        }
      }
    }
  });

  it('takes away from 10 in every snow egg\'s hard sum and in no other (the bond to 10 is the hard sum now)', () => {
    for (const band of BANDS) {
      for (const sums of eggsOf('snow', band)) for (const e of sums) expect(e.have === 10, `${e.grade} ${e.have}`).toBe(e.grade === 'hard');
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
        // Within 10 every place can be reached (2.3.0's snow egg in band A could not show its answer as the biggest).
        expect(reach.length).toBe(n);
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
    noteMaths(g, 'egg-nest', easy, result('first'), t);
    noteMaths(g, 'egg-nest', middle, result('first'), t);
    expect(g.maths.band).toBe('a');
    noteMaths(g, 'egg-nest', hard, result('first'), t);
    expect(g.maths.band).toBe('b');
    noteMaths(g, 'egg-shore', easy, result('helped'), t);
    noteMaths(g, 'egg-shore', middle, result('helped'), t);
    expect(g.maths.band).toBe('b');
    noteMaths(g, 'egg-shore', hard, result('helped'), t);
    expect(g.maths.band).toBe('a');
  });

  it('moves after the hay rack, and never when ?maths= fixes it', () => {
    const { g } = fakeGame();
    noteMaths(g, 'rack', rackSpec(seeded(4), { band: 'a' }), result('first'), t);
    expect(g.maths.band).toBe('b');
    const fixed = fakeGame('a').g;
    noteMaths(fixed, 'egg-nest', hard, result('first'), t);
    expect(fixed.maths.band).toBe('a');
  });

  it('logs every sum with its grade and heart, and a band only for the hard sum', () => {
    const { g, lines } = fakeGame();
    for (const s of [easy, hard, middle]) noteMaths(g, 'egg-nest', s, result('first'), t);
    expect(lines.map((l) => [l.part, l.detail.grade, l.detail.round])).toEqual([['egg-nest', 'easy', 0], ['egg-nest', 'hard', 1], ['egg-nest', 'middle', 2]]);
    // After the hard sum's first try the band is B, but the middle sum has no band and says none.
    expect(lines.map((l) => l.detail.band)).toEqual([undefined, 'a', undefined]);
  });
});

// ---------------------------------------------------------------------------------------------------- 2.4.0

describe('the star egg: more and fewer within 10 (2.4 section 5.5)', () => {
  it('has the 14 star sums within 10 and the floor: the moon 7 to 10, the egg at least 3, the difference 3 to 7', () => {
    const all = SUM_GRADES.flatMap((gr) => gradeCombos('star', gr, 'a'));
    expect(all).toHaveLength(14); expect(all.every((c) => c.have <= 10 && c.need >= 3 && c.answer >= 3 && c.answer <= 7)).toBe(true);
    expect(all.every((c) => c.answer === c.have - c.need && c.have >= 7)).toBe(true);
    expect(gradeCombos('star', 'hard', 'b')).toEqual(gradeCombos('star', 'hard', 'a'));
  });

  it('asks "more" and "fewer" at least once in every star egg, and says the fact num-take-<moon>-<egg>', () => {
    for (let s = 1; s <= 2000; s++) {
      const e = eggSums('star', seeded(s));
      expect(new Set(e.map((x) => x.compare)).size).toBe(2);
      for (const x of e) {
        expect(x.clips.right.at(-1)).toBe(`num-take-${x.have}-${x.need}`);
        expect(x.clips.goal).toEqual([`num-moon-${x.have}`, `num-eggstar-${x.need}`]);
        expect(x.clips.ask).toEqual([x.compare === 'fewer' ? 'g4-fewer-egg' : 'g4-more-moon']);
      }
    }
  });

  it('draws the questions evenly from the six orders that ask both', () => {
    const seen = new Map<string, number>();
    for (let s = 1; s <= 6000; s++) {
      const k = starCompares(seeded(s)).join(' ');
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    expect(seen.size).toBe(6);
    for (const [k, n] of seen) {
      expect(k.split(' ')).toContain('more'); expect(k.split(' ')).toContain('fewer');
      expect(Math.abs(n / 6000 - 1 / 6), k).toBeLessThan(0.02);
    }
  });

  it('keeps the warm and snow eggs\' sums as they were: the star egg\'s draws never shift them', () => {
    for (let s = 1; s <= 200; s++) {
      for (const kind of KINDS) for (const e of eggSums(kind, seeded(s), { band: 'b' })) expect(e.compare).toBeUndefined();
    }
  });
});

/** A play's maths through MathsState, as the game asks it (game/maths.ts planEggs and quests.ts rackQuest): any order. */
type Step = 'warm' | 'snow' | 'star' | 'rack';
const LABEL: Record<Step, string> = { warm: 'egg-nest', snow: 'egg-shore', star: 'egg-trail-1', rack: 'rack' };
function playOf(seed: number, steps: readonly Step[], band: Band): { m: MathsState; asked: { step: Step; sums: EggSpec[] }[] } {
  const m = startMaths(band);
  const out: { step: Step; sums: EggSpec[] }[] = [];
  steps.forEach((step, i) => {
    const r = stream(seed, `${LABEL[step]}-${i}`);
    const o = { band: m.band, used: { totals: [...m.used.totals], answers: [...m.used.answers] }, asked: m.asked };
    const sums = step === 'rack' ? [rackSpec(r, o)] : eggSums(step, r, { ...o, first: true });
    for (const x of sums) useSum(m, x);
    out.push({ step, sums });
  });
  return { m, asked: out };
}
const ORDERS: readonly (readonly Step[])[] = [
  ['warm', 'snow', 'star', 'star', 'rack'],
  ['star', 'rack', 'warm', 'star', 'snow'],
  ['rack', 'star', 'snow', 'star', 'warm'],
  ['snow', 'star', 'star', 'warm', 'rack'],
];

describe('no sum twice in a play (2.4 section 5.3)', () => {
  it('repeats no sum and no take-away fact across a play of a warm, a snow, two star eggs and the hay rack, for every seed and band', () => {
    for (const band of BANDS) {
      for (const order of ORDERS) {
        for (let seed = 1; seed <= 1000; seed++) {
          const { asked } = playOf(seed, order, band);
          const sums = asked.flatMap((a) => a.sums);
          // The hay rack's sum is a warm sum.
          const keys = sums.map((x) => `${x.kind} ${x.need} ${x.have}`);
          expect(new Set(keys).size, `${order} ${band} ${seed}`).toBe(keys.length);
          const facts = sums.filter((x) => x.kind !== 'warm').map((x) => factClip(x.kind, x));
          expect(new Set(facts).size, `${order} ${band} ${seed}`).toBe(facts.length);
          // Within each egg, three different answers and totals still.
          for (const a of asked.filter((x) => x.step !== 'rack')) {
            expect(new Set(a.sums.map((x) => x.answer)).size).toBe(3);
            expect(new Set(a.sums.map(totalOf)).size).toBe(3);
          }
        }
      }
    }
  }, 120_000);

  it('records each sum under its kind and grade, the hay rack\'s as a warm sum of its total, and the facts of snow and star', () => {
    const m = startMaths(null);
    useSum(m, { kind: 'warm', need: 9, have: 4, answer: 5, grade: 'middle' });
    useSum(m, { kind: 'warm', need: 10, have: 6, answer: 4, skin: 'hay' });
    useSum(m, { kind: 'snow', need: 3, have: 8, answer: 5, grade: 'easy' });
    useSum(m, { kind: 'star', need: 4, have: 9, answer: 5, grade: 'middle' });
    expect(m.asked.answers.warm).toEqual({ easy: [], middle: [5], hard: [4] });
    expect(m.asked.answers.snow.easy).toEqual([5]);
    expect(m.asked.answers.star.middle).toEqual([5]);
    expect(m.asked.facts).toEqual(['num-take-8-5', 'num-take-9-4']);
    expect(m.asked.sums).toEqual({ warm: ['9/4', '10/6'], snow: ['3/8'], star: ['4/9'] });
  });

  it('passes what the play asked to every egg through eggAsk, and prepares the plans of the eggs the bubbles can start', () => {
    const g = { maths: startMaths(null), randFor: (l: string) => stream(5, l), save: { data: { last: { totals: [] } } }, start: null, hub: { shown: ['egg', 'ride', 'picnic'] } } as unknown as Game;
    const nest = planEggs(g, 'warm', 'egg-nest', true);
    expect(eggAsk(g).asked).toBe(g.maths.asked);
    expect(g.maths.asked.answers.warm.easy).toEqual([nest.find((x) => x.grade === 'easy')!.answer]);
    expect(() => prepareEggPlans(g)).not.toThrow();
    const star = planEggs(g, 'star', 'egg-trail-1', true);
    for (const x of star) expect(x.kind).toBe('star');
  });
});

describe('no sum twice: the guess rules on a second egg (2.4 section 5.3, 2.3 section 19.1)', () => {
  const RULES: Record<string, (stones: number[], answer: number) => number> = {
    biggest: (s, a) => Number(s[s.length - 1] === a),
    smallest: (s, a) => Number(s[0] === a),
    'lower middle': (s, a) => Number(s[Math.floor((s.length - 1) / 2)] === a),
    'upper middle': (s, a) => Number(s[Math.ceil((s.length - 1) / 2)] === a),
    'nearest five': nearFiveShare,
  };
  /** The 19.1 bounds per grade: every simple guess, the number she heard, the hard sum's live ends and its places. */
  function bounds(eggs: EggSpec[][], label: string): void {
    for (const grade of SUM_GRADES) {
      const sums = eggs.map((e) => e.find((x) => x.grade === grade) as EggSpec);
      for (const n of [4, 5]) {
        const part = sums.filter((x) => x.stones.length === n);
        if (part.length < 1000) continue;
        const limit = n === 5 ? 0.3 : 0.35;
        for (const [name, rule] of Object.entries(RULES)) {
          expect(part.reduce((t, x) => t + rule(x.stones, x.answer), 0) / part.length, `${label} ${grade} ${n}: ${name}`).toBeLessThanOrEqual(limit);
        }
        expect(part.filter((x) => heardOf(x.kind, x) === x.answer).length / part.length, `${label} ${grade} ${n}: heard`).toBeLessThanOrEqual(1 / n);
        if (grade !== 'hard') continue;
        for (const end of ['low', 'high'] as const) {
          expect(part.filter((x) => liveEnd(x.stones, x.answer, end)).length / part.length, `${label} ${n}: live ${end}`).toBeLessThanOrEqual(limit);
        }
        // A second egg's hard grade often has three sums left, so some places can be reached by one sum only and its
        // places cannot all be within 7 points of even (notes/maths.md); no place wins more than a guess may.
        const counts = new Array<number>(n).fill(0);
        for (const x of part) counts[x.stones.indexOf(x.answer)]++;
        for (const k of counts) expect(k / part.length, `${label} ${n}: places ${counts}`).toBeLessThanOrEqual(limit);
      }
    }
  }
  /** 10,000 eggs of the last step's kind, each after the steps before it in its own play. */
  const second = (steps: readonly Step[], band: Band): EggSpec[][] =>
    Array.from({ length: 10_000 }, (_, i) => playOf(i + 1, steps, band).asked.at(-1)!.sums);
  const CASES: [string, readonly Step[]][] = [
    ['a second star egg after a snow egg and a star egg', ['snow', 'star', 'star']],
    ['a nest egg after the hay rack', ['rack', 'warm']],
    ['a shore egg after one star egg', ['star', 'snow']],
    ['a shore egg after two star eggs', ['star', 'star', 'snow']],
  ];

  it('meets the 19.1 guess bounds on the second egg of each kind', () => {
    for (const band of BANDS) for (const [label, steps] of CASES) bounds(second(steps, band), `${label} (${band})`);
    // The star egg's own plan, a first egg.
    for (const band of BANDS) bounds(Array.from({ length: 10_000 }, (_, i) => eggSums('star', stream(i + 1, 'egg-trail-1'), { band })), `the first star egg (${band})`);
  }, 120_000);

  it('fits every refit within 1e-5, or that grade leaves out only the sums and facts asked', () => {
    const keys = new Map<string, { kind: EggKind; band: Band; asked: AskedSums }>();
    for (const band of BANDS) {
      for (const [, steps] of CASES) {
        for (let seed = 1; seed <= 400; seed++) {
          const { m } = playOf(seed, steps.slice(0, -1), band);
          const kind = steps.at(-1) as EggKind;
          keys.set(`${kind} ${band} ${JSON.stringify(m.asked)}`, { kind, band, asked: structuredClone(m.asked) });
        }
      }
    }
    for (const { kind, band, asked } of keys.values()) {
      prepareEggPlan(kind, band, asked);
      const fit = eggPlanFit(kind, band, asked);
      expect(fit.off <= 1e-5 || fit.relaxed.length > 0, `${kind} ${band} ${JSON.stringify(asked)}`).toBe(true);
      // Whatever the fit, the egg still asks three sums of three different answers, none asked before.
      const sums = eggSums(kind, seeded(3), { band, asked });
      expect(new Set(sums.map((x) => x.answer)).size).toBe(3);
      for (const x of sums) expect(asked.sums?.[kind]).not.toContain(`${x.need}/${x.have}`);
    }
    for (const band of BANDS) for (const kind of ['warm', 'snow', 'star'] as const) expect(eggPlanFit(kind, band).off).toBeLessThanOrEqual(1e-5);
    // Leaving out a grade's asked answers, or falling back to its asked sums, never brings back a sum asked.
    const asked = { answers: { warm: { easy: [4], middle: [], hard: [] }, snow: { easy: [], middle: [], hard: [] }, star: { easy: [], middle: [], hard: [] } }, facts: [], sums: { warm: ['8/4'], snow: [], star: [] } };
    expect(eggPlanFit('warm', 'a', asked).relaxed).toContain('easy');
    for (let s = 1; s <= 300; s++) expect(eggSums('warm', seeded(s), { asked }).some((x) => x.need === 8 && x.have === 4)).toBe(false);
  }, 60_000);
});

describe('clips', () => {
  /**
   * The number lines the sums within 10 brought (2.3 section 19.1), made with gen.sh --stt on 29 October 2026. The
   * fifth, num-take-9-6, failed speech-to-text twice ("takeaway"); Tjitse accepted its take and it came in 2.3.1.
   */
  const NEW_10 = ['num-egg-3', 'num-take-7-4', 'num-take-8-5', 'num-take-9-6', 'num-take-10-7'];
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

  it('every clip of every reachable sum and stone exists as an ok clip, the new lines of the sums within 10 too', () => {
    const all = [...new Set([...allEggClipIds(), ...allRackClipIds()])];
    // 2.4.0's star egg lines have a line and wait for gen.sh (docs/v4/2.4-plan.md Task 27); every other clip is made.
    const star = /^(g4-star-egg|g4-more-moon|g4-fewer-egg|h4-line-up|num-moon-\d+|num-eggstar-\d+)$/;
    for (const id of all) expect(clipExists(id) || (star.test(id) && !!lineFor(id)), id).toBe(true);
    for (const id of NEW_10) expect(all, id).toContain(id);
    for (const id of all.filter((x) => x.startsWith('num-take-'))) {
      const [a, b] = id.split('-').slice(2).map(Number);
      expect(lineFor(id)?.text, id).toBe(`${cap(words[a])} take away ${words[b]} is ${words[a - b]}!`);
    }
    expect(lineFor('num-egg-3')?.text).toBe('This egg needs three warm cups.');
    expect(lineFor('g4-hearts')?.text).toBe('Fill all three hearts, and the egg will hatch.');
    // The warm egg and the hay rack need no new audio: v3 has every bond, every goal and every rack line within 10.
    for (const grade of SUM_GRADES) {
      for (const band of bandsOf(grade)) {
        for (const c of gradeCombos('warm', grade, band)) {
          for (const id of [`num-egg-${c.need}`, `num-warm-${c.have}`, `num-bond-${c.have}-${c.answer}`]) expect(v3Clips.has(id), id).toBe(true);
        }
      }
    }
    for (const id of allRackClipIds()) expect(v3Clips.has(id), id).toBe(true);
  });

  it('says no number over 10 in any sum: every goal and fact clip names numbers of 10 or less', () => {
    const all = [...new Set([...allEggClipIds(), ...allRackClipIds()])];
    for (const id of all) {
      const m = /^num-(egg|warm|toowarm|rack|in|bond|take)-(\d+)(?:-(\d+))?$/.exec(id);
      if (!m) continue;
      const [a, b] = [Number(m[2]), Number(m[3] ?? 0)];
      expect(m[1] === 'bond' ? a + b : a, id).toBeLessThanOrEqual(10);
    }
    // Counting goes to the answer, at most 7.
    expect(all.filter((id) => /^num-\d+$/.test(id)).map((id) => Number(id.slice(4))).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('lists every clip an egg\'s three sums can say', () => {
    const all = new Set(allEggClipIds());
    for (const band of BANDS) {
      for (const kind of KINDS) for (const sums of eggsOf(kind, band).slice(0, 2000)) for (const s of sums) for (const id of eggClipIds(s)) expect(all.has(id), id).toBe(true);
    }
  });

  it('lists every clip a spec can say, with miss lines for too many by up to 6 and too few by up to 5', () => {
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
    // Within 10 a stone is at most 6 too many (9 for an answer of 3) and at most 5 too few (2 for an answer of 7);
    // 2.2's sums reached 6 both ways. Every miss line up to 6 is made, so a wider tray cannot hit a missing clip.
    for (const k of [1, 2, 3, 4, 5, 6]) {
      for (const id of [`num-over-${k}`, `num-cold-${k}`, `num-still-warm-${k}`, `num-more-${k}`]) expect(clipExists(id), id).toBe(true);
      expect(all.has(`num-over-${k}`), `num-over-${k}`).toBe(true);
    }
    for (const k of [1, 2, 3, 4, 5]) for (const id of [`num-cold-${k}`, `num-still-warm-${k}`, `num-more-${k}`]) expect(all.has(id), id).toBe(true);
    for (const id of ['num-cold-6', 'num-still-warm-6', 'num-more-6']) expect(all.has(id), id).toBe(false);
  });
});
