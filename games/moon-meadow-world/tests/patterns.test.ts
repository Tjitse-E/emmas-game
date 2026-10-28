// The bead tree's patterns (docs/v4/2.3.md sections 6 and 19.2, tests of 22.4): every string the planner makes is
// checked against the rules themselves (computed here from the string, the gaps and the tray, not from the planner's
// own helpers): a copier, a swapper, a colour-only and a shape-only matcher are each wrong at least once, and how often
// those matchers and a child who takes only beads she sees on the string fill a whole string at first try; the tray
// and the odds per gap; the decoy kinds; the full repeat the hints light, and a contrast whose lights do not show the
// answer; the level fold, the save after a visit and the first-visit demo.
import { describe, expect, it } from 'vitest';
import type { Bead, MomentResult, Outcome, PatternSpec } from '../src/contracts';
import {
  BEAD_COLOURS, BEAD_SHAPES, DEMO_RESULT, KINDS_AT, PATTERN_CLIPS, TRAY_SIZE, allPatternClipIds, beadsVisit, contrastFor, demoGap,
  levelOutcomes, patternSpec, repeatFor, saveVisit, type PatternLevel,
} from '../src/content/patterns';
import { seeded } from '../src/content/rand';
import { foldReading } from '../src/game/reading';
import { defaultSave } from '../src/game/save';

const LEVELS: readonly PatternLevel[] = [1, 2, 3];
const SEEDS = 4000;
const same = (a: Bead, b: Bead) => a.shape === b.shape && a.colour === b.colour;
const key = (b: Bead) => `${b.shape}-${b.colour}`;
const PERIOD: Record<PatternSpec['kind'], number> = { AAB: 3, ABB: 3, ABC: 3, AABB: 4 };

function* specs(level: PatternLevel, n = SEEDS): Generator<PatternSpec> {
  for (let s = 0; s < n; s++) yield patternSpec(seeded(s * 7919 + level), level);
}

/** The distinct beads of a string: its units. */
const unitsOf = (spec: PatternSpec): Bead[] => spec.string.filter((b, i) => spec.string.findIndex((c) => same(b, c)) === i);

describe('pattern strings', () => {
  it('are 9 beads that repeat the kind, with units that differ in both shape and colour', () => {
    for (const level of LEVELS) {
      for (const spec of specs(level)) {
        expect(spec.level).toBe(level);
        expect(KINDS_AT[level]).toContain(spec.kind);
        expect(spec.string).toHaveLength(9);
        const p = PERIOD[spec.kind];
        for (let i = 0; i + p < 9; i++) expect(same(spec.string[i], spec.string[i + p])).toBe(true);
        const units = unitsOf(spec);
        expect(units).toHaveLength(new Set(spec.kind).size);
        for (const a of units) {
          expect(BEAD_SHAPES).toContain(a.shape);
          expect(BEAD_COLOURS).toContain(a.colour);
          for (const b of units) if (a !== b) expect(a.shape !== b.shape && a.colour !== b.colour).toBe(true);
        }
        // One repeat holds each unit as often as the kind says (AAB: two of one, one of the other).
        const counts = units.map((u) => spec.string.slice(0, p).filter((b) => same(b, u)).length).sort();
        expect(counts).toEqual([...new Set(spec.kind)].map((c) => [...spec.kind].filter((d) => d === c).length).sort());
      }
    }
  });

  it('plays only AAB and ABB at level 1, and every kind at levels 2 and 3', () => {
    for (const spec of specs(1)) expect(['AAB', 'ABB']).toContain(spec.kind);
    for (const level of [2, 3] as const) expect(new Set([...specs(level, 500)].map((s) => s.kind))).toEqual(new Set(['AAB', 'ABB', 'ABC', 'AABB']));
  });

  it('has its three gaps at the end at levels 1 and 2, and spread at level 3', () => {
    for (const level of [1, 2] as const) for (const spec of specs(level)) expect(spec.gaps).toEqual([6, 7, 8]);
    const sets = new Set<string>();
    for (const spec of specs(3)) {
      const [a, b, c] = spec.gaps;
      expect(spec.gaps).toHaveLength(3);
      expect(a < b && b < c && c <= 8).toBe(true);
      expect(b - a >= 2 && c - b >= 2).toBe(true);
      expect(spec.gaps.some((g) => g <= 5)).toBe(true);
      sets.add(spec.gaps.join());
    }
    expect(sets.size).toBeGreaterThanOrEqual(6);
  });
});

describe('pattern guessers', () => {
  it('copying the bead left of the gap is wrong at least once', () => {
    for (const level of LEVELS) for (const spec of specs(level)) expect(spec.gaps.some((g) => g > 0 && !same(spec.string[g - 1], spec.string[g]))).toBe(true);
  });

  it('swapping between the last two beads is wrong at least once', () => {
    for (const level of LEVELS) for (const spec of specs(level)) expect(spec.gaps.some((g) => g > 1 && !same(spec.string[g - 2], spec.string[g]))).toBe(true);
  });

  it('matching only the colour, or only the shape, is wrong at least once', () => {
    for (const level of LEVELS) {
      for (const spec of specs(level)) {
        const wants = spec.gaps.map((g) => spec.string[g]);
        expect(wants.some((w) => spec.tray.some((t) => !same(t, w) && t.colour === w.colour))).toBe(true);
        expect(wants.some((w) => spec.tray.some((t) => !same(t, w) && t.shape === w.shape))).toBe(true);
      }
    }
  });

  it('repeating her last right bead is wrong at least once (the gaps never all take one bead)', () => {
    for (const level of LEVELS) for (const spec of specs(level)) expect(new Set(spec.gaps.map((g) => key(spec.string[g]))).size).toBeGreaterThan(1);
  });

  // How often a guesser fills all three gaps at first try (three first tries in a row move the level up), as the exact
  // chance over each string: a colour-only matcher takes any tray bead in the gap's colour, a shape-only matcher any in
  // its shape, and an on-string guesser any tray bead she can see on the string. The ceilings are what the doc's trays
  // give (19.2): at level 1 the one cross bead leaves A the only bead in its colour and B the only one in its shape,
  // and at levels 2 and 3 an ABC tray has room for one cross bead only (requests-patterns.md asks for a better tray).
  const CEILING: Record<PatternLevel, { colour: number; shape: number; string: number; blind: number }> = {
    1: { colour: 0.4, shape: 0.4, string: 0.14, blind: 0.04 },
    2: { colour: 0.24, shape: 0.24, string: 0.12, blind: 0.02 },
    3: { colour: 0.24, shape: 0.24, string: 0.12, blind: 0.02 },
  };
  it('lets a colour-only, a shape-only or an on-string guesser fill a whole string at first try only within the ceilings', () => {
    for (const level of LEVELS) {
      const sum = { colour: 0, shape: 0, string: 0, blind: 0 };
      let n = 0;
      let answerLeftOut = 0;
      for (const spec of specs(level)) {
        n++;
        const units = unitsOf(spec);
        const odds = (ok: (t: Bead, want: Bead) => boolean) =>
          spec.gaps.reduce((p, g) => {
            const want = spec.string[g];
            const picks = spec.tray.filter((t) => ok(t, want));
            if (!picks.some((t) => same(t, want))) answerLeftOut++;
            return p / picks.length;
          }, 1);
        sum.colour += odds((t, w) => t.colour === w.colour);
        sum.shape += odds((t, w) => t.shape === w.shape);
        sum.string += odds((t) => units.some((u) => same(u, t)));
        sum.blind += odds(() => true);
      }
      expect(answerLeftOut).toBe(0);
      for (const k of ['colour', 'shape', 'string', 'blind'] as const) expect(sum[k] / n, `level ${level} ${k}`).toBeLessThan(CEILING[level][k]);
    }
  });
});

describe('pattern tray', () => {
  it('has 3 beads at level 1 and 4 at levels 2 and 3, all different, with every unit and every answer', () => {
    for (const level of LEVELS) {
      for (const spec of specs(level)) {
        expect(spec.tray).toHaveLength(TRAY_SIZE[level]);
        expect(TRAY_SIZE[level]).toBe(level === 1 ? 3 : 4);
        expect(new Set(spec.tray.map(key)).size).toBe(spec.tray.length);
        for (const u of unitsOf(spec)) expect(spec.tray.some((t) => same(t, u))).toBe(true);
        for (const g of spec.gaps) expect(spec.tray.filter((t) => same(t, spec.string[g]))).toHaveLength(1);
      }
    }
  });

  it("level 1's third bead is A's shape in B's colour", () => {
    for (const spec of specs(1)) {
      const [a, b] = unitsOf(spec);
      const cross = spec.tray.filter((t) => !same(t, a) && !same(t, b));
      expect(cross).toEqual([{ shape: a.shape, colour: b.colour }]);
    }
  });

  it('gives a blind pick 1 in 3 or 1 in 4 per gap, with the answer spread over the tray places', () => {
    for (const level of LEVELS) {
      const n = TRAY_SIZE[level];
      const at = Array.from({ length: 3 }, () => new Array<number>(n).fill(0));
      let total = 0;
      for (const spec of specs(level)) {
        total++;
        spec.gaps.forEach((g, i) => at[i][spec.tray.findIndex((t) => same(t, spec.string[g]))]++);
      }
      for (const gap of at) for (const c of gap) expect(Math.abs(c / total - 1 / n)).toBeLessThan(0.05);
    }
  });
});

describe('pattern decoys', () => {
  it('names why each wrong tray bead is wrong for each gap', () => {
    for (const level of LEVELS) {
      for (const spec of specs(level)) {
        const units = unitsOf(spec);
        expect(spec.decoys).toHaveLength(3);
        spec.gaps.forEach((g, i) => {
          const want = spec.string[g];
          spec.tray.forEach((t, k) => {
            const kind = spec.decoys[i][k];
            if (same(t, want)) return expect(kind).toBeUndefined();
            if (g > 0 && same(t, spec.string[g - 1])) return expect(kind).toBe('copy');
            if (units.some((u) => same(u, t))) return expect(kind).toBe('unit');
            if (t.colour === want.colour) return expect(kind).toBe('colour');
            if (t.shape === want.shape) return expect(kind).toBe('shape');
            // Only in ABC can a cross bead share nothing with the gap's bead.
            expect(spec.kind).toBe('ABC');
            expect(kind).toBeUndefined();
          });
        });
      }
    }
  });

  it('has a colour and a shape decoy at level 1, and every cross bead is a near miss somewhere', () => {
    for (const spec of specs(1)) {
      const kinds = spec.decoys.flatMap((d) => Object.values(d));
      expect(kinds).toContain('colour');
      expect(kinds).toContain('shape');
    }
  });
});

describe('pattern hints', () => {
  it('can light one full repeat she can see at every gap, with a place that matches the gap', () => {
    for (const level of LEVELS) {
      for (const spec of specs(level)) {
        spec.gaps.forEach((g, i) => {
          const r = repeatFor(spec, i);
          expect(r).not.toBeNull();
          const { places, match } = r!;
          const p = PERIOD[spec.kind];
          expect(places).toHaveLength(p);
          places.forEach((x, k) => expect(x).toBe(places[0] + k));
          // Every place of the repeat shows a bead: no gap from this one on (the earlier gaps are filled by then).
          for (const x of places) expect(spec.gaps.slice(i)).not.toContain(x);
          // The repeat holds every unit, and the matching place holds the gap's bead.
          for (const u of unitsOf(spec)) expect(places.some((x) => same(spec.string[x], u))).toBe(true);
          expect(places).toContain(match);
          expect(same(spec.string[match], spec.string[g])).toBe(true);
        });
      }
    }
  });

  it('lights a contrast repeat she can see, whose lights do not show the answer by their order', () => {
    for (const level of LEVELS) {
      // For each place in the lit order: how often the bead lit there is the gap's bead, over every repeat the contrast
      // can choose (each as likely).
      const hits = [0, 0, 0, 0];
      const lights = [0, 0, 0, 0];
      const bad: string[] = [];
      for (const spec of specs(level)) {
        const units = unitsOf(spec);
        spec.gaps.forEach((g, i) => {
          // Four rand values reach every choice of up to four repeats.
          const options = new Map<string, { places: number[]; match: number }>();
          for (let k = 0; k < 4; k++) {
            const r = contrastFor(spec, i, () => (k + 0.5) / 4);
            if (!r) bad.push(`${spec.kind} gap ${g}: no repeat`);
            else options.set(r.places.join(), r);
          }
          for (const { places, match } of options.values()) {
            const ok = places.length === PERIOD[spec.kind] && places.every((x, k) => x === places[0] + k && !spec.gaps.slice(i).includes(x))
              && units.every((u) => places.some((x) => same(spec.string[x], u))) && places.includes(match) && same(spec.string[match], spec.string[g]);
            if (!ok) bad.push(`${spec.kind} gap ${g}: ${places.join()} match ${match}`);
            places.forEach((x, k) => {
              lights[k] += 1 / options.size;
              if (same(spec.string[x], spec.string[g])) hits[k] += 1 / options.size;
            });
          }
          // With the gaps at the end the match can take at least three places in the order (AABB's first gap has
          // only three repeats left of it).
          if (level < 3 && options.size < 3) bad.push(`${spec.kind} gap ${g}: ${options.size} choices`);
        });
      }
      expect(bad).toEqual([]);
      lights.forEach((n, k) => {
        if (n) expect(hits[k] / n, `level ${level}, lit place ${k + 1}`).toBeLessThan(0.6);
      });
    }
  });

  it('says the bead tree lines', () => {
    expect(allPatternClipIds().sort()).toEqual(['fb4-necklace', 'fb4-pattern', 'g4-beads', 'g4-pattern', 'h4-pattern']);
    for (const spec of specs(2, 50)) expect(spec.clips).toEqual(PATTERN_CLIPS);
  });

  it('plays the same string for the same stream', () => {
    for (const level of LEVELS) expect(patternSpec(seeded(42), level)).toEqual(patternSpec(seeded(42), level));
  });
});

describe('pattern level', () => {
  const r = (outcome: Outcome): MomentResult => ({ outcome, misses: outcome === 'first' ? 0 : 1, ms: 900 });
  const fold = (start: PatternLevel, plays: { results: Outcome[]; demo: boolean }[]) => {
    let s = { level: start, recent: [] as Outcome[] };
    for (const p of plays) for (const o of levelOutcomes(p.results.map(r), p.demo)) s = foldReading(s, o);
    return s.level;
  };

  it('moves up after three first tries in a row and down after two struggles, from 1 to 3', () => {
    expect(fold(1, [{ results: ['first', 'first', 'first'], demo: false }])).toBe(2);
    expect(fold(2, [{ results: ['first', 'first', 'first'], demo: false }, { results: ['first', 'first', 'first'], demo: false }])).toBe(3);
    expect(fold(3, [{ results: ['first', 'first', 'first'], demo: false }])).toBe(3);
    expect(fold(2, [{ results: ['miss', 'helped', 'first'], demo: false }])).toBe(1);
    expect(fold(1, [{ results: ['helped', 'helped', 'helped'], demo: false }])).toBe(1);
    expect(fold(1, [{ results: ['first', 'miss', 'first'], demo: false }])).toBe(1);
  });

  it('never counts the demo gap the ghost filled', () => {
    // The demo gap is logged helped; it must not pull the level down or break a run of first tries.
    expect(levelOutcomes(['helped', 'first', 'first'].map((o) => r(o as Outcome)), true)).toEqual(['first', 'first']);
    expect(fold(2, [{ results: ['helped', 'miss', 'first'], demo: true }])).toBe(2);
    expect(fold(1, [{ results: ['helped', 'first', 'first'], demo: true }, { results: ['first', 'first', 'first'], demo: false }])).toBe(2);
    expect(levelOutcomes(['helped', 'first', 'first'].map((o) => r(o as Outcome)), false)).toEqual(['helped', 'first', 'first']);
  });

  it('plays at ?pl= without storing it, else at her own level', () => {
    expect(beadsVisit({ seen: true, level: 2, forced: null })).toEqual({ level: 2, demo: false, store: true });
    expect(beadsVisit({ seen: true, level: 2, forced: 3 })).toEqual({ level: 3, demo: false, store: false });
    expect(beadsVisit({ seen: true, level: 1 })).toMatchObject({ level: 1, store: true });
  });

  it('shows the demo gap only on her first visit ever', () => {
    expect(beadsVisit({ seen: false, level: 1 }).demo).toBe(true);
    expect(beadsVisit({ seen: true, level: 1 }).demo).toBe(false);
    expect(beadsVisit({ seen: false, level: 3, forced: 2 }).demo).toBe(true);
    expect(beadsVisit({ seen: true, level: 3, forced: 2 }).demo).toBe(false);
    const demo = beadsVisit({ seen: false, level: 1 });
    expect([0, 1, 2].map((i) => demoGap(demo, i))).toEqual([true, false, false]);
    expect([0, 1, 2].map((i) => demoGap(beadsVisit({ seen: true, level: 1 }), i))).toEqual([false, false, false]);
    expect(DEMO_RESULT).toEqual({ outcome: 'helped', misses: 0, ms: 0 });
  });

  // The save step game/beads.ts runs after the moment, on a real default save.
  const visitSave = (save: ReturnType<typeof defaultSave>, forced: PatternLevel | null, outcomes: Outcome[]) => {
    const visit = beadsVisit({ seen: save.seen.beads, level: save.patterns.level, forced });
    const results = outcomes.map((o, i) => (demoGap(visit, i) ? { ...DEMO_RESULT } : r(o)));
    saveVisit(save, results, visit, foldReading);
    return visit;
  };

  it('saves the visit: seen, the level folded without the demo gap, nothing at ?pl=, and nothing else', () => {
    const save = defaultSave();
    // Everything but seen.beads and the pattern level: the reading and phrase levels, the look, the last totals.
    const rest = () => JSON.stringify({ ...save, seen: { ...save.seen, beads: null }, patterns: null });
    const before = rest();
    expect(save.seen.beads).toBe(false);
    expect(save.patterns).toEqual({ level: 1, recent: [] });
    // Her first visit: the ghost's gap is left out, so two first tries count, not a struggle.
    expect(visitSave(save, null, ['first', 'first', 'first']).demo).toBe(true);
    expect(save.seen.beads).toBe(true);
    expect(save.patterns).toEqual({ level: 1, recent: ['first', 'first'] });
    // At ?pl= nothing is stored, not even three first tries; seen stays.
    expect(visitSave(save, 3, ['first', 'first', 'first'])).toMatchObject({ level: 3, demo: false, store: false });
    expect(save.patterns).toEqual({ level: 1, recent: ['first', 'first'] });
    // Back at her level the run goes on: one more first try moves her up.
    visitSave(save, null, ['first', 'miss', 'first']);
    expect(save.patterns.level).toBe(2);
    visitSave(save, null, ['helped', 'helped', 'first']);
    expect(save.patterns).toEqual({ level: 1, recent: ['first'] });
    expect(rest()).toBe(before);
  });
});
