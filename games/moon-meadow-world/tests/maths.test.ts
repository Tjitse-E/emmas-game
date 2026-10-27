// The maths lane (docs/v4/2.2.md section 4 and 8.1): the bands and their floor, the trays of 4 or 5 stones with real
// mistakes, that no place and no simple guess wins much more than a blind guess, the per-moment streams, no sum asked
// twice in a play, and that every clip a maths moment can say exists or waits in the line list.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EggSpec } from '../src/contracts.ts';
import {
  type Band, type EggKind, RANGES, STONES, TRAY, allEggClipIds, eggClipIds, eggCombos, eggSpec, nearFiveShare, nextBand,
  placesFor, stoneCandidates, totalOf,
} from '../src/content/eggs.ts';
import { allRackClipIds, rackSpec } from '../src/content/rack.ts';
import { seeded, stream } from '../src/content/rand.ts';
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

describe('bands and ranges (4.2)', () => {
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

describe('clips', () => {
  /** Band B's take-away facts that are new lines (section 6), generated once after all lanes merge. */
  const NEW_FACTS = ['num-take-14-7', 'num-take-15-7', 'num-take-15-8', 'num-take-16-7', 'num-take-16-8', 'num-take-16-9'];

  it('every clip of every reachable sum and stone exists, except the six new take-away facts in the line list', () => {
    const all = [...new Set([...allEggClipIds(), ...allRackClipIds()])];
    const missing = all.filter((id) => !clipExists(id)).sort();
    expect(missing).toEqual([...NEW_FACTS].sort());
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
    for (const id of NEW_FACTS) {
      const [a, b] = id.split('-').slice(2).map(Number);
      expect(lineFor(id)?.text).toBe(`${words[a][0].toUpperCase()}${words[a].slice(1)} take away ${words[b]} is ${words[a - b]}!`);
    }
    // The new facts are band B only (section 6): band A snow needs no new audio.
    for (const c of eggCombos('snow', 'a')) expect(NEW_FACTS).not.toContain(`num-take-${c.have}-${c.answer}`);
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
