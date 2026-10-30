// The maths moments (docs/v4/2.2.md section 4): the two eggs and, through rack.ts, the hay rack. All within the v4
// maths floor (spec 4.4): nothing adds or takes away 1 or 2 (the answer and the other part are 3 or more), and no
// sum's total is under 7. The wrong stones are real mistakes (4.1).
//
// Every sum stays within 10, as at her school (Tjitse, 29 October 2026; docs/v4/2.3.md sections 12 and 19.1): the
// need, the warm cups, the answer and every stone are 10 or less. Each egg asks three sums (eggSums): an easy one
// (total 7 or 8), a middle one (total 9) and a hard one, a bond to 10 (the warm egg's missing part to 10, the snow
// egg's take away from 10), with 4 stones (band A) or 5 (band B). Easy comes first, then middle and hard in either
// order. Easy and middle always show 4 stones. The hay rack asks one sum (eggSpec, RANGES: need 7 to 9 in band A,
// 8 to 10 in band B).
import type { EggKind, EggSpec, Outcome, StoneDecoy, SumGrade } from '../contracts.ts';
import { type Rand, pick } from './rand.ts';

export type { EggKind };
export type Band = 'a' | 'b';

type Span = readonly [number, number];
/** One kind's numbers in one band: the egg's need, the cups warm now and the stone that is right. */
interface Ranges { need: Span; have: Span; answer: Span }

/**
 * One sum per moment (2.2's eggSpec), within 10. Warm, the hay rack's: band A totals 7 to 9 with answers 3 to 6 (9
 * sums), band B totals 8 to 10 with the bonds to 10 and answers 3 to 7 (12 sums). Snow, which only the ui harness asks:
 * band A totals 7 to 9 with answers 3 to 6 (9 sums), band B the bonds to 10 (5 sums).
 */
export const RANGES: Record<EggKind, Record<Band, Ranges>> = {
  warm: {
    a: { need: [7, 9], have: [3, 6], answer: [3, 6] },
    b: { need: [8, 10], have: [3, 7], answer: [3, 7] },
  },
  snow: {
    a: { need: [3, 6], have: [7, 9], answer: [3, 6] },
    b: { need: [3, 7], have: [10, 10], answer: [3, 7] },
  },
  // 2.4.0's star egg (docs/v4/2.4.md section 5.5): the snow egg's numbers, read as the moon's stars (have) and the
  // egg's (need); the answer is the difference.
  star: {
    a: { need: [3, 6], have: [7, 9], answer: [3, 6] },
    b: { need: [3, 7], have: [10, 10], answer: [3, 7] },
  },
};
/** Stones in the tray per band. */
export const TRAY: Record<Band, 4 | 5> = { a: 4, b: 5 };
/**
 * The stones she can be shown: 2 to 9. The answer is 3 or more by the ranges, so nothing adds or takes away 1 or 2. A
 * wrong stone may be a 2 (the slip of a 3, or a near guess): within 10 the answers are small, and without a stone under
 * 3 an answer of 3 would always be the smallest stone and the biggest place could hardly be reached (docs/v4/2.3.md
 * section 19.1). A 1 is never needed.
 */
export const STONES = { min: 2, max: 9 } as const;

export interface EggCombo {
  need: number;
  have: number;
  answer: number;
}

const inSpan = (v: number, [lo, hi]: Span): boolean => v >= lo && v <= hi;

/** Every one-sum moment a kind can ask in a band (the hay rack's, warm), for picking, the lines and the tests. */
export function eggCombos(kind: EggKind, band: Band = 'a'): EggCombo[] {
  return combosIn(kind, RANGES[kind][band]);
}

/** Every sum inside one kind's ranges. */
function combosIn(kind: EggKind, r: Ranges): EggCombo[] {
  const out: EggCombo[] = [];
  for (let need = r.need[0]; need <= r.need[1]; need++) {
    for (let have = r.have[0]; have <= r.have[1]; have++) {
      const answer = kind === 'warm' ? need - have : have - need;
      if (inSpan(answer, r.answer)) out.push({ need, have, answer });
    }
  }
  return out;
}

/** The whole of a sum, its bigger number: the warm egg's or the rack's need, the snow egg's warm cups. */
export function totalOf(c: { need: number; have: number }): number {
  return Math.max(c.need, c.have);
}

/**
 * The totals and answers this play's maths moments already asked (g.maths.used), in the order asked: totals[i] and
 * answers[i] are one sum.
 */
export interface MathsUsed {
  totals: readonly number[];
  answers: readonly number[];
}

/**
 * The options every maths moment takes: the band and what this play asked. `lastTotals` (the last play's totals) is
 * read by nothing since the sums stay within 10: every play asks 9 and 10, so leaving the last play's totals out would
 * leave the rack almost nothing (docs/v4/2.3.md section 19.1).
 */
export interface MathsPick {
  band?: Band;
  used?: MathsUsed;
  lastTotals?: readonly number[];
  /** What this play has asked, for "no sum twice" (2.4.0). Read by nothing until the signs-star lane's Task 15. */
  asked?: AskedSums;
}

/** What this play has asked, for "no sum twice" (2.4 section 5.3). */
export interface AskedSums {
  /** Per kind and grade, the answers asked this play. The hay rack's sum counts as a warm sum of its grade. */
  answers: Record<EggKind, Record<SumGrade, number[]>>;
  /** Every take-away fact line said this play, by a snow or a star egg ('num-take-9-5'). */
  facts: string[];
  /**
   * Per kind, the sums asked this play as 'need/have' (the hay rack's under warm): what a grade leaves out when leaving
   * out its asked answers misses a guess bound (eggPlan's fallback).
   */
  sums?: Record<EggKind, string[]>;
}

/** Nothing asked yet: a play's start. */
export function emptyAsked(): AskedSums {
  const grades = (): Record<SumGrade, number[]> => ({ easy: [], middle: [], hard: [] });
  return { answers: { warm: grades(), snow: grades(), star: grades() }, facts: [], sums: { warm: [], snow: [], star: [] } };
}

/** A sum's grade by its total, the eggs' grades and the hay rack's: 7 or 8 easy, 9 middle, 10 hard. */
export function gradeOfTotal(total: number): SumGrade {
  return total >= 10 ? 'hard' : total === 9 ? 'middle' : 'easy';
}

const sumKey = (c: { need: number; have: number }): string => `${c.need}/${c.have}`;

/**
 * Note a sum this play asked (game/band.ts useSum): its answer under its kind and grade (the hay rack's as a warm sum
 * of its grade), the sum itself, and the take-away fact a snow or star sum says.
 */
export function noteAsked(a: AskedSums, spec: Pick<EggSpec, 'kind' | 'need' | 'have' | 'answer'>): void {
  a.answers[spec.kind][gradeOfTotal(totalOf(spec))].push(spec.answer);
  (a.sums ??= { warm: [], snow: [], star: [] })[spec.kind].push(sumKey(spec));
  if (spec.kind !== 'warm') a.facts.push(factClip(spec.kind, spec));
}

/** A play's first maths moment is band A; a first try moves to B and a helped answer back to A (4.2). */
export function nextBand(band: Band, outcome: Outcome): Band {
  if (outcome === 'first') return 'b';
  if (outcome === 'helped') return 'a';
  return band;
}

/**
 * The sums still fresh (the hay rack's): none with the total and the answer of a sum this play asked, so the rack
 * never asks a fact she just did, in either direction (5 + 4 = 9 after 9 - 4 = 5 or 4 + 5 = 9 with the answer 4).
 * Within 10 every play asks the totals 9 and 10 in both eggs, so the rack's total or answer alone may come again
 * (docs/v4/2.3.md section 19.1). When nothing is fresh, every sum that is not the same sum of `kind` asked this play
 * (o.asked, 2.4.0); when nothing is left of those either, every sum.
 */
export function freshCombos(all: readonly EggCombo[], o: MathsPick = {}, kind: EggKind = 'warm'): EggCombo[] {
  const answers = o.used?.answers ?? [];
  const asked = new Set((o.used?.totals ?? []).map((t, i) => `${t} ${answers[i]}`));
  // 2.4.0: never a sum of this kind the play asked (for the hay rack: an egg's or the rack's warm sum), even when every
  // fact was asked (section 5.3).
  const sums = new Set(o.asked?.sums?.[kind] ?? []);
  const notAsked = all.filter((c) => !sums.has(sumKey(c)));
  const pool = notAsked.filter((c) => !asked.has(`${totalOf(c)} ${c.answer}`));
  return pool.length ? pool : notAsked.length ? notAsked : all.slice();
}

// ------------------------------------------------------------------------------------------------ the stones

/** A wrong stone the tray can hold, and why. */
export interface StoneCandidate {
  value: number;
  kind: StoneDecoy;
}

/**
 * The wrong stones of a sum, in the order of 4.1, each number once (the first kind that names it keeps it), only
 * 2 to 9 and never the answer. Warm (and the hay rack): the slip is answer ± 1, `heard` is the warm cups or bundles
 * she just heard, `first-nest` is 10 - have (the "fills to ten" mistake), `second-nest` is need - 10. Snow: heard is
 * the need, first-nest 10 - need (as if ten cups were warm), second-nest have - 10. Near is answer ± 2, then ± 3.
 * Within 10 there is no second nest, and in a bond to 10 the first nest is the answer itself, so neither shows.
 */
export function stoneCandidates(kind: EggKind, c: EggCombo): StoneCandidate[] {
  const { need, have, answer } = c;
  const warm = kind === 'warm';
  const raw: [number, StoneDecoy][] = [
    [answer - 1, 'slip'], [answer + 1, 'slip'],
    [warm ? have : need, 'heard'],
    [10 - (warm ? have : need), 'first-nest'],
    [warm ? need - 10 : have - 10, 'second-nest'],
    [answer - 2, 'near'], [answer + 2, 'near'], [answer - 3, 'near'], [answer + 3, 'near'],
  ];
  const seen = new Set([answer]);
  const out: StoneCandidate[] = [];
  for (const [value, k] of raw) {
    if (value < STONES.min || value > STONES.max || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, kind: k });
  }
  return out;
}

/**
 * Stones 4 or more away are not in the table of 4.1. They fill a tray only rarely: when a sum has too few mistakes
 * (a bond to 10 with 5 stones), or when the answer's place needs one more stone on a side.
 */
const FAR = 0.25;

/**
 * The weight of a nest mistake: 8 (5 before the sums stayed within 10). Within 10 the "fills to ten" stone is always
 * bigger than the answer and shares the one or two places above it with the slip and the near stones, so at 5 it
 * showed in only 58% of the trays with room for it (the tests: at least 60%).
 */
const NEST = 8;

/** How likely a wrong stone is picked for a free place of the tray: the two nest mistakes first, far guesses last. */
function stoneWeight(s: StoneCandidate, answer: number): number {
  if (s.kind === 'first-nest' || s.kind === 'second-nest') return NEST;
  if (s.kind !== 'near') return 2;
  const d = Math.abs(s.value - answer);
  return d === 2 ? 2 : d === 3 ? 1 : FAR;
}

/**
 * How often "take the stone nearest five" picks the answer in a tray: 1, 0, or a share on a tie. Small sums cluster
 * around five, so without care this guess would win about half the snow eggs.
 */
export function nearFiveShare(stones: readonly number[], answer: number): number {
  const best = Math.min(...stones.map((s) => Math.abs(s - 5)));
  const nearest = stones.filter((s) => Math.abs(s - 5) === best);
  return nearest.includes(answer) ? 1 / nearest.length : 0;
}
/** A tray where the stone nearest five is the answer is picked this much less often. */
const FIVE_DAMP = 0.05;

/** One pick from weighted options. */
function weighted<T>(rand: Rand, xs: readonly T[], w: (x: T) => number): T {
  const ws = xs.map(w);
  let r = rand() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < xs.length; i++) {
    r -= ws[i];
    if (r < 0) return xs[i];
  }
  return xs[xs.length - 1];
}

/** Every way to choose k of xs. */
function choose<T>(xs: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (xs.length < k) return [];
  const [head, ...tail] = xs;
  return [...choose(tail, k - 1).map((c) => [head, ...c]), ...choose(tail, k)];
}

/** One possible set of wrong stones, and how likely it is picked. */
interface TrayOption {
  wrong: StoneCandidate[];
  /** The whole tray, ascending. */
  stones: number[];
  weight: number;
}

const optionCache = new Map<string, TrayOption[][]>();

/**
 * Every tray of `n` stones a sum can show, by the answer's place (index 0 is the smallest stone). Each holds the
 * heard number and a slip when they are valid. The other numbers from 2 to 9 can fill in as far `near` stones,
 * rarely (FAR).
 */
export function trayOptions(kind: EggKind, c: EggCombo, n: number): TrayOption[][] {
  const key = `${kind} ${c.need} ${c.have} ${n}`;
  const cached = optionCache.get(key);
  if (cached) return cached;
  const pool = stoneCandidates(kind, c);
  for (let value = STONES.min; value <= STONES.max; value++) {
    if (value !== c.answer && !pool.some((s) => s.value === value)) pool.push({ value, kind: 'near' });
  }
  const heard = kind === 'warm' ? c.have : c.need;
  const heardIn = pool.some((s) => s.value === heard);
  const slipIn = pool.some((s) => Math.abs(s.value - c.answer) === 1);
  const byPlace: TrayOption[][] = Array.from({ length: n }, () => []);
  for (const wrong of choose(pool, n - 1)) {
    if (heardIn && !wrong.some((s) => s.value === heard)) continue;
    if (slipIn && !wrong.some((s) => Math.abs(s.value - c.answer) === 1)) continue;
    const place = wrong.filter((s) => s.value < c.answer).length;
    const stones = [c.answer, ...wrong.map((s) => s.value)].sort((a, b) => a - b);
    const weight = wrong.reduce((w, s) => w * stoneWeight(s, c.answer), 1) * (1 - nearFiveShare(stones, c.answer) * (1 - FIVE_DAMP));
    byPlace[place].push({ wrong, stones, weight });
  }
  optionCache.set(key, byPlace);
  return byPlace;
}

/** The answer's places a sum can show with `n` stones. */
export function placesFor(kind: EggKind, c: EggCombo, n: number): number[] {
  return trayOptions(kind, c, n).flatMap((o, place) => (o.length ? [place] : []));
}

export interface Tray {
  /** Ascending, the answer among them. */
  stones: number[];
  /** Why each wrong stone is in, by stone number. */
  decoys: Record<number, StoneDecoy>;
}

/** The tray of `n` stones with the answer at `place`, or at the nearest place this sum can show. */
export function trayFor(kind: EggKind, c: EggCombo, n: number, place: number, rand: Rand): Tray {
  const options = trayOptions(kind, c, n);
  const reach = placesFor(kind, c, n);
  const gap = (p: number) => Math.abs(p - place);
  const best = Math.min(...reach.map(gap));
  const at = pick(rand, reach.filter((p) => gap(p) === best));
  const { wrong, stones } = weighted(rand, options[at], (o) => o.weight);
  const decoys: Record<number, StoneDecoy> = {};
  for (const s of wrong) decoys[s.value] = s.kind;
  return { stones: stones.slice(), decoys };
}

/** Every wrong stone a sum's trays can show with `n` stones (for the miss lines in the clip lists). */
export function reachableStones(kind: EggKind, c: EggCombo, n: number): number[] {
  const out = new Set<number>();
  for (const options of trayOptions(kind, c, n)) for (const o of options) for (const s of o.wrong) out.add(s.value);
  return [...out].sort((a, b) => a - b);
}

const planCache = new Map<string, Map<EggCombo, number[]>>();

/**
 * How likely each place of the answer is, per sum, so that over all sums of a kind and band every place the kind can
 * show comes up equally often while every sum stays equally likely. Iterative proportional fitting: start from each
 * sum's own places, then scale each place towards its share and renormalise each sum, until it settles.
 */
export function placePlan(kind: EggKind, band: Band): Map<EggCombo, number[]> {
  const key = `${kind} ${band}`;
  const cached = planCache.get(key);
  if (cached) return cached;
  const n = TRAY[band];
  const all = eggCombos(kind, band);
  const reach = all.map((c) => placesFor(kind, c, n));
  const places = [...new Set(reach.flat())];
  // Each sum starts out preferring the places where "the stone nearest five" misses; the fitting keeps those odds.
  let q = all.map((c, i) => {
    const options = trayOptions(kind, c, n);
    return Array.from({ length: n }, (_, p) => {
      if (!reach[i].includes(p)) return 0;
      const total = options[p].reduce((t, o) => t + o.weight, 0);
      const five = options[p].reduce((t, o) => t + o.weight * nearFiveShare(o.stones, c.answer), 0) / total;
      return 1 - five * (1 - FIVE_DAMP);
    });
  });
  for (let round = 0; round < 1000; round++) {
    const share = Array.from({ length: n }, (_, p) => q.reduce((t, row) => t + row[p], 0) / all.length);
    if (places.every((p) => Math.abs(share[p] - 1 / places.length) < 1e-6)) break;
    q = q.map((row) => {
      const scaled = row.map((v, p) => (share[p] > 0 ? (v / share[p]) / places.length : 0));
      const sum = scaled.reduce((t, v) => t + v, 0);
      return scaled.map((v) => v / sum);
    });
  }
  const plan = new Map(all.map((c, i) => [c, q[i]]));
  planCache.set(key, plan);
  return plan;
}

/**
 * A maths moment's sum and tray (4.1, 4.2): a fresh sum, then the answer's place from that sum's place plan, then a
 * tray with the answer there. Over a kind's sums every place it can show is right equally often, so no rule such as
 * "the biggest" or "the middle" wins much more than a blind guess.
 */
export function pickSum(kind: EggKind, rand: Rand, o: MathsPick = {}): { band: Band; combo: EggCombo } & Tray {
  const band = o.band ?? 'a';
  const plan = placePlan(kind, band);
  const combo = pick(rand, freshCombos([...plan.keys()], o, kind));
  const weights = plan.get(combo) ?? [];
  const place = weighted(rand, weights.map((_, p) => p), (p) => weights[p]);
  return { band, combo, ...trayFor(kind, combo, TRAY[band], place, rand) };
}

// ------------------------------------------------------------------------------------------------ three sums per egg

/** One grade's ranges for both kinds; the hard sum has one per band. */
interface GradeRanges { easy: Ranges; middle: Ranges; hard: Record<Band, Ranges> }

/**
 * The grade table of 2.3 section 19.1 (Claude's call, after Tjitse's "on her school everything is until the number
 * 10"). The total (totalOf) is the bigger number, and every number is 10 or less. Easy has the totals 7 and 8 (answers
 * 3 to 5, 5 sums), middle the total 9, hard the bonds to 10 (answers 3 to 7, 5 sums), so the grades never overlap and
 * the snow egg takes away from 10 only in its hard sum. The answer and the other part are 3 or more. Both bands ask the
 * same hard sums; band B is harder by its tray of 5. Both middle sums have the answers 3 to 6 (4 sums). The snow
 * egg's 9 - 6 = 3 came back in 2.3.1: Tjitse accepted the take of num-take-9-6 that speech-to-text heard as
 * "takeaway".
 */
export const GRADES: Record<EggKind, GradeRanges> = {
  warm: {
    easy: { need: [7, 8], have: [3, 5], answer: [3, 5] },
    middle: { need: [9, 9], have: [3, 6], answer: [3, 6] },
    hard: {
      a: { need: [10, 10], have: [3, 7], answer: [3, 7] },
      b: { need: [10, 10], have: [3, 7], answer: [3, 7] },
    },
  },
  snow: {
    easy: { need: [3, 5], have: [7, 8], answer: [3, 5] },
    middle: { need: [3, 6], have: [9, 9], answer: [3, 6] },
    hard: {
      a: { need: [3, 7], have: [10, 10], answer: [3, 7] },
      b: { need: [3, 7], have: [10, 10], answer: [3, 7] },
    },
  },
  // 2.4.0's star egg: the moon has 7 or 8 stars (easy), 9 (middle) or 10 (hard), the egg at least 3, the difference 3
  // to 7: 14 sums, the snow egg's grades with the moon's stars as `have` and the egg's as `need`.
  star: {
    easy: { need: [3, 5], have: [7, 8], answer: [3, 5] },
    middle: { need: [3, 6], have: [9, 9], answer: [3, 6] },
    hard: {
      a: { need: [3, 7], have: [10, 10], answer: [3, 7] },
      b: { need: [3, 7], have: [10, 10], answer: [3, 7] },
    },
  },
};

/** The grades in the order an egg can ask them: easy always first. */
export const SUM_GRADES: readonly SumGrade[] = ['easy', 'middle', 'hard'];

/** A grade's ranges. Only the hard sum has a band. */
export function gradeRanges(kind: EggKind, grade: SumGrade, band: Band = 'a'): Ranges {
  const g = GRADES[kind];
  return grade === 'hard' ? g.hard[band] : g[grade];
}

/** Stones in the tray: 4 for every easy and middle sum, 4 or 5 by band for the hard one. */
export function gradeTray(grade: SumGrade, band: Band = 'a'): 4 | 5 {
  return grade === 'hard' ? TRAY[band] : 4;
}

/** Every sum of a grade (in a band, for the hard one). */
export function gradeCombos(kind: EggKind, grade: SumGrade, band: Band = 'a'): EggCombo[] {
  return combosIn(kind, gradeRanges(kind, grade, band));
}

/** The answer's places a grade can show, over all its sums. */
export function gradeReach(kind: EggKind, grade: SumGrade, band: Band = 'a'): number[] {
  const n = gradeTray(grade, band);
  return [...new Set(gradeCombos(kind, grade, band).flatMap((c) => placesFor(kind, c, n)))].sort((a, b) => a - b);
}

/**
 * The number she heard that a stone can show (the 'heard' stone of 4.1): the warm cups, the snow egg's need, or the
 * star egg's own stars (its need).
 */
export function heardOf(kind: EggKind, c: { need: number; have: number }): number {
  return kind === 'warm' ? c.have : c.need;
}

/** One sum of a grade with its answer at one place of the tray: what the egg plan picks for each grade. */
interface Cell {
  place: number;
  combo: EggCombo;
  /** How often "the stone nearest five" wins over this sum's trays with its answer here. */
  five: number;
  /** How often the smallest and the biggest live stone win over this sum's trays with its answer here. */
  low: number;
  high: number;
  /** The plan's factor for this cell (fitted by eggPlan). */
  f: number;
}

/** A grade's sums and cells, the share the plan gives each place, and the sums a play can swap in for each cell. */
interface GradePlan {
  n: 4 | 5;
  combos: EggCombo[];
  cells: Cell[];
  places: number[];
  /**
   * Per cell, the cells with the same place and answer and the same number she heard as the answer or not (itself
   * among them). A play swaps between these to keep totals fresh (freshCell), so the swap never changes a guess rule
   * the plan keeps.
   */
  alike: Map<Cell, Cell[]>;
}

/** The answers a sum can have: 3 to 7 within 10, and room to 9. */
const ANSWERS = [3, 4, 5, 6, 7, 8, 9] as const;
const answerAt = (c: Cell): number => c.combo.answer - ANSWERS[0];

/** Within a grade, a sum and place where "the stone nearest five" picks the answer starts out this much less likely. */
const CELL_FIVE_DAMP = 0.5;

/** How often "the stone nearest five" wins over the trays a sum can show with its answer at `place`. */
function fiveAt(kind: EggKind, c: EggCombo, n: number, place: number): number {
  const options = trayOptions(kind, c, n)[place] ?? [];
  const total = options.reduce((t, o) => t + o.weight, 0);
  return total > 0 ? options.reduce((t, o) => t + o.weight * nearFiveShare(o.stones, c.answer), 0) / total : 0;
}

/**
 * The answers any sum can have within 10: 3 to 7. A stone of 2, 8 or 9 is only ever wrong, so a child who has seen
 * that could leave those stones out and then take the smallest or the biggest of the rest.
 */
export const LIVE = { min: 3, max: 7 } as const;
/** The answer is the smallest stone of 3 or more ('low') or the biggest stone of 7 or less ('high'). */
export function liveEnd(stones: readonly number[], answer: number, end: 'low' | 'high'): boolean {
  const live = stones.filter((s) => s >= LIVE.min && s <= LIVE.max);
  return (end === 'low' ? live[0] : live[live.length - 1]) === answer;
}

/** How often "the smallest (or biggest) live stone" wins over the trays a sum can show with its answer at `place`. */
function liveAt(kind: EggKind, c: EggCombo, n: number, place: number, end: 'low' | 'high'): number {
  const options = trayOptions(kind, c, n)[place] ?? [];
  const total = options.reduce((t, o) => t + o.weight, 0);
  return total > 0 ? options.reduce((t, o) => t + o.weight * Number(liveEnd(o.stones, c.answer, end)), 0) / total : 0;
}

/** The most any place is planned in a grade, by the tray's size. */
const PLACE_CAP: Record<4 | 5, number> = { 4: 0.3, 5: 0.25 };

/**
 * How often each place of the answer is planned, per kind and grade (Claude's call): even over the places the grade
 * can reach, so the biggest, the smallest and the middle stones each win about 1 in 4 (1 in 3 where a place cannot be
 * reached). A place only one or two sums can reach gets a third or two thirds of a share, so those sums are not a
 * quarter of their grade: the easy answer can only be the biggest stone as 8 = 3 + 5 (or 8 - 5 = 3) on stones 2, 3,
 * 4, 5, so easy plans 30%, 30%, 30% and 10%. The warm egg's middle answer is the smallest stone only as 9 = 6 + 3
 * and 5 + 4 and the biggest only as 9 = 4 + 5 and 3 + 6, so it plans 20%, 30%, 30% and 20%.
 *
 * No place is planned above PLACE_CAP (30% with 4 stones, 25% with 5); what is over goes to the other places by their
 * share. Since 2.3.1 no grade needs it: the snow egg's middle grade has four sums again (9 - 3 to 9 - 6) and plans
 * 20%, 30%, 30% and 20%, as the warm one. In 2.3.0 it had three, and the lower middle place, which all three reach,
 * would have got 37.5%, over the tests' 35%. The cap stays as a guard.
 */
export function gradePlaces(kind: EggKind, grade: SumGrade, band: Band = 'a', combos: readonly EggCombo[] = gradeCombos(kind, grade, band)): number[] {
  const n = gradeTray(grade, band);
  const sums = Array.from({ length: n }, () => 0);
  for (const c of combos) for (const p of placesFor(kind, c, n)) sums[p]++;
  const w = sums.map((k) => Math.min(1, k / 3));
  const total = w.reduce((t, v) => t + v, 0);
  const share = w.map((v) => v / total);
  const cap = PLACE_CAP[n];
  for (let round = 0; round < n && share.some((v) => v > cap + 1e-12); round++) {
    const over = share.reduce((t, v) => t + Math.max(0, v - cap), 0);
    const room = share.reduce((t, v) => t + (v < cap ? v : 0), 0);
    // 2.4.0: a grade left with too few places to stay under the cap (a sum or two after "no sum twice") keeps its shares.
    if (room <= 0) break;
    for (let p = 0; p < n; p++) share[p] = share[p] >= cap ? cap : share[p] + (over * share[p]) / room;
  }
  return share;
}

function gradePlan(kind: EggKind, grade: SumGrade, band: Band, out: readonly string[] = []): GradePlan {
  const n = gradeTray(grade, band);
  const combos = gradeCombos(kind, grade, band).filter((c) => !out.includes(sumKey(c)));
  const cells: Cell[] = [];
  for (const combo of combos) {
    for (const place of placesFor(kind, combo, n)) {
      const five = fiveAt(kind, combo, n, place);
      cells.push({ place, combo, five, low: liveAt(kind, combo, n, place, 'low'), high: liveAt(kind, combo, n, place, 'high'), f: 1 - CELL_FIVE_DAMP * five });
    }
  }
  const sameAs = (c: Cell) => `${c.place} ${c.combo.answer} ${heardOf(kind, c.combo) === c.combo.answer}`;
  const alike = new Map(cells.map((c) => [c, cells.filter((d) => sameAs(d) === sameAs(c))]));
  return { n, combos, cells, places: gradePlaces(kind, grade, band, combos), alike };
}

/**
 * The bounds the egg plan keeps per grade, under those its tests check (2.3 section 19.1) with room for chance:
 * - "the stone nearest five" wins at most 29% with 4 stones and 24% with 5 (the tests: 35% and 30%);
 * - the number she heard is the answer at most 21% with 4 stones and 15% with 5 (the tests: blind odds, 25% and
 *   20%), or dragging the number Elizabeth just said would win more than a blind guess (8 - 4 = 4, 10 = 5 + 5);
 * - no sum is planned more than 1.4 even shares of its grade (the tests: 1.5), so none comes back play after play;
 * - in the hard sum, the smallest stone of 3 or more and the biggest of 7 or less win at most 29% and 24%
 *   (PLAN_LIVE_CAP).
 * Within 10 the answer 5 always wins "nearest five" and comes in one sum per grade (8 = 3 + 5, 9 = 4 + 5, 10 = 5 + 5),
 * so the five cap and the spread cap meet on those sums; the fitting still settles in under 100 rounds.
 */
const PLAN_FIVE_CAP: Record<4 | 5, number> = { 4: 0.29, 5: 0.24 };
const PLAN_HEARD_CAP: Record<4 | 5, number> = { 4: 0.21, 5: 0.15 };
/**
 * The hard sum's cap on "the smallest live stone" and "the biggest live stone" (LIVE; the tests: 35% and 30%). Without
 * it the biggest stone under 8 won 47% of band A hard sums and 40% of band B, as the answer 7 is always the biggest
 * stone under 8. Easy and middle have no such cap: with only the answers 3 to 5 (or 3 to 6) a cap on the smallest
 * stone above 2 pushes "the 4" over half of the easy sums (docs/v4/2.3.md section 19.1).
 */
const PLAN_LIVE_CAP: Record<4 | 5, number> = { 4: 0.29, 5: 0.24 };
const PLAN_SUM_SPREAD = 1.4;
/** The fitting stops when every place and bound is within this, or after this many rounds. */
const FIT_TOLERANCE = 1e-5;
const FIT_ROUNDS = 3000;

/** One bound of a grade: the cells it counts, how much of each, and the cap on the share they are planned. */
interface Bound {
  cells: Cell[];
  part: number[];
  cap: number;
  /** The spread bound of one sum (variety), which a missed refit's last rounds let go of for the guess caps. */
  spread?: boolean;
}

interface EggPlan {
  grades: GradePlan[];
  /** The fitting's rounds, its largest miss when it stopped and each grade's (for the tests and the fallback). */
  fit: { rounds: number; off: number; offs: number[] };
}

const eggPlanCache = new Map<string, EggPlan>();

/** Per answer, the sum of a grade's cell factors. */
function answerWeights(g: GradePlan): number[] {
  const out = ANSWERS.map(() => 0);
  for (const c of g.cells) out[answerAt(c)] += c.f;
  return out;
}

/** Per answer of grade i, the weight of the other two grades' answers that differ from it and from each other. */
function othersFor(w: number[][], i: number): number[] {
  const [j, k] = [0, 1, 2].filter((x) => x !== i);
  return ANSWERS.map((_, a) => {
    let s = 0;
    for (let b = 0; b < ANSWERS.length; b++) {
      if (b === a || !w[j][b]) continue;
      for (let c = 0; c < ANSWERS.length; c++) if (c !== a && c !== b) s += w[j][b] * w[k][c];
    }
    return s;
  });
}

/**
 * The egg plan of a kind and band (2.3 section 19.1): for each grade (easy, middle, hard), how likely each of its sums
 * is with its answer at each place, given that the three answers of an egg differ. A plan is one cell per grade; its
 * weight is the product of the cells' factors, over the triples with three different answers. The factors are fitted
 * by iterative proportional fitting: each grade's places to gradePlaces, and its share of "nearest five" wins, of
 * answers she heard and of each sum under the bounds above. Easy, middle and the hard sum draw
 * from overlapping answers, so this is fitted over whole eggs: the guess rules then hold for every grade and every
 * place in the egg, whatever came before. A grade's share of a cell is its factor times the weight of the other two
 * grades' different answers (othersFor), so a round costs a few thousand steps and the fitting a few milliseconds.
 */
function eggPlan(kind: EggKind, band: Band, out: readonly (readonly string[])[] = [[], [], []]): EggPlan {
  const key = `${kind} ${band}${out.some((o) => o.length) ? ` ${out.map((o) => o.join(',')).join('|')}` : ''}`;
  const cached = eggPlanCache.get(key);
  if (cached) return cached;
  const grades = SUM_GRADES.map((grade, i) => gradePlan(kind, grade, band, out[i]));
  const bounds = grades.map((g, i): Bound[] => {
    const bound = (part: (c: Cell) => number, cap: number): Bound => {
      const cells = g.cells.filter((c) => part(c) > 0);
      return { cells, part: cells.map(part), cap };
    };
    return [
      bound((c) => c.five, PLAN_FIVE_CAP[g.n]),
      ...(SUM_GRADES[i] === 'hard' ? [bound((c) => c.low, PLAN_LIVE_CAP[g.n]), bound((c) => c.high, PLAN_LIVE_CAP[g.n])] : []),
      bound((c) => Number(heardOf(kind, c.combo) === c.combo.answer), PLAN_HEARD_CAP[g.n]),
      ...g.combos.map((x) => ({ ...bound((c) => Number(c.combo === x), PLAN_SUM_SPREAD / g.combos.length), spread: true })),
    ];
  });
  const w = grades.map(answerWeights);
  /** One round over the three grades: each grade's places (unless `bounds only`), then its bounds; each grade's miss. */
  const round = (places: boolean): number[] => grades.map((g, i) => {
    let off = 0;
    const others = othersFor(w, i);
    const mass = (c: Cell) => c.f * others[answerAt(c)];
    const total = () => g.cells.reduce((t, c) => t + mass(c), 0);
    let z = total();
    if (places) {
      const at = g.places.map(() => 0);
      for (const c of g.cells) at[c.place] += mass(c) / z;
      for (const c of g.cells) c.f *= g.places[c.place] / at[c.place];
      off = Math.max(off, ...at.map((v, p) => Math.abs(v - g.places[p])));
    }
    for (const b of bounds[i]) {
      if (!places && b.spread) continue;
      z = total();
      const share = b.cells.reduce((t, c, j) => t + b.part[j] * mass(c), 0) / z;
      if (share <= b.cap) continue;
      off = Math.max(off, share - b.cap);
      b.cells.forEach((c, j) => (c.f *= 1 + b.part[j] * (b.cap / share - 1)));
    }
    const sum = g.cells.reduce((t, c) => t + c.f, 0);
    for (const c of g.cells) c.f /= sum;
    w[i] = answerWeights(g);
    return off;
  });
  // A left-out set whose bounds cannot all be met (2.4.0) can drive some factors towards 0: the fitting then stops at
  // the last round whose factors were all usable, as a miss.
  let kept = grades.map((g) => g.cells.map((c) => c.f));
  const usable = () => grades.every((g) => g.cells.every((c) => Number.isFinite(c.f) && c.f > 1e-200));
  const restore = () => {
    grades.forEach((g, i) => g.cells.forEach((c, j) => (c.f = kept[i][j])));
    grades.forEach((g, i) => (w[i] = answerWeights(g)));
  };
  const fit = { rounds: 0, off: 1, offs: [1, 1, 1] };
  const refit = out.some((o) => o.length);
  while (fit.rounds < FIT_ROUNDS && fit.off > FIT_TOLERANCE) {
    fit.rounds++;
    const offs = round(true);
    if (!usable()) {
      restore();
      fit.offs = fit.offs.map((o) => (o > FIT_TOLERANCE ? Math.max(o, 1) : o));
      fit.off = Math.max(...fit.offs);
      break;
    }
    kept = grades.map((g) => g.cells.map((c) => c.f));
    fit.offs = offs;
    fit.off = Math.max(...fit.offs);
  }
  // A refit that missed lets the caps on the guesses win over even places and over the spread of its few sums: rounds
  // of the guess bounds alone (2.4.0). The miss stays in `fit`, so the fallback of plannedFor still sees it.
  if (fit.off > FIT_TOLERANCE && refit) {
    for (let r = 0; r < 600; r++) {
      const offs = round(false);
      if (!usable()) {
        restore();
        break;
      }
      kept = grades.map((g) => g.cells.map((c) => c.f));
      if (Math.max(...offs) <= FIT_TOLERANCE) break;
    }
  }
  const plan = { grades, fit };
  eggPlanCache.set(key, plan);
  return plan;
}

/** How a grade leaves out what the play asked: its asked answers (the rule), only its asked sums (the fallback), none. */
type LeaveOut = 'answers' | 'sums' | 'none';

/** The sums of each grade an egg leaves out for what the play asked, and the grades that fell back (section 5.3). */
interface Planned { plan: EggPlan; relaxed: SumGrade[] }
const plannedCache = new Map<string, Planned>();

/**
 * The egg plan for what the play has asked (2.4 section 5.3, "no sum twice"): each grade without the sums whose answer
 * this kind asked in that grade (leaving out an answer leaves out every sum with it), and a snow or star egg without
 * the sums whose take-away fact was said, whichever egg said it. The plan of a left-out set is fitted as eggPlan fits
 * the full one and cached. A grade whose fit misses a bound (fit.offs over FIT_TOLERANCE) leaves out only the sums
 * asked and the facts said, not their answers, so an answer can come again with its other total; a grade left with no
 * sum, or an egg left without three different answers, lets go of what it can (sums, then everything) until one fits.
 */
function plannedFor(kind: EggKind, band: Band, asked?: AskedSums): Planned {
  if (!asked) return { plan: eggPlan(kind, band), relaxed: [] };
  const answers = asked.answers[kind];
  const sums = asked.sums?.[kind] ?? [];
  const facts = kind === 'warm' ? [] : asked.facts;
  const key = `${kind} ${band} ${SUM_GRADES.map((g) => answers[g].join(',')).join('|')} ${sums.join(',')} ${facts.join(',')}`;
  const hit = plannedCache.get(key);
  if (hit) return hit;
  const mode: LeaveOut[] = ['answers', 'answers', 'answers'];
  const outOf = (i: number): string[] => gradeCombos(kind, SUM_GRADES[i], band).filter((c) => {
    if (mode[i] === 'none') return false;
    if (facts.includes(factClip(kind, c))) return true;
    return mode[i] === 'answers' ? answers[SUM_GRADES[i]].includes(c.answer) : sums.includes(sumKey(c));
  }).map(sumKey);
  const looser = (m: LeaveOut): LeaveOut => (m === 'answers' ? 'sums' : 'none');
  let planned: Planned | null = null;
  for (let round = 0; round < 7 && !planned; round++) {
    const out = [0, 1, 2].map(outOf);
    // Three different answers must still fit. An answer that is in no triple of different answers can never be picked
    // (pickCells), so its sums go too, and the fitting never meets a place no sum can fill.
    const left = [0, 1, 2].map((i) => new Set(gradeCombos(kind, SUM_GRADES[i], band).filter((c) => !out[i].includes(sumKey(c))).map((c) => c.answer)));
    for (let changed = true; changed;) {
      changed = false;
      for (const i of [0, 1, 2]) {
        const [j, k] = [0, 1, 2].filter((x) => x !== i);
        for (const a of [...left[i]]) {
          if ([...left[j]].some((b) => b !== a && [...left[k]].some((c) => c !== a && c !== b))) continue;
          left[i].delete(a);
          changed = true;
        }
      }
    }
    const triple = left.every((l) => l.size > 0);
    if (triple) {
      [0, 1, 2].forEach((i) => {
        for (const c of gradeCombos(kind, SUM_GRADES[i], band)) if (!left[i].has(c.answer) && !out[i].includes(sumKey(c))) out[i].push(sumKey(c));
      });
    }
    if (!triple) {
      const i = [0, 1, 2].filter((k) => mode[k] !== 'none').sort((x, y) => left[x].size - left[y].size)[0];
      if (i === undefined) break;
      mode[i] = looser(mode[i]);
      continue;
    }
    const plan = eggPlan(kind, band, out);
    const failing = [0, 1, 2].filter((i) => plan.fit.offs[i] > FIT_TOLERANCE && mode[i] === 'answers' && out[i].length > 0);
    if (plan.fit.off <= FIT_TOLERANCE || !failing.length) {
      planned = { plan, relaxed: SUM_GRADES.filter((_, i) => mode[i] !== 'answers') };
      break;
    }
    for (const i of failing) mode[i] = 'sums';
  }
  planned ??= { plan: eggPlan(kind, band), relaxed: [...SUM_GRADES] };
  plannedCache.set(key, planned);
  return planned;
}

/**
 * Fit the plan of an egg of `kind` for what the play has asked now (2.4.0: the hub calls it at each refill, through
 * game/maths.ts prepareEggPlans), so a refit never runs on the walk to the egg.
 */
export function prepareEggPlan(kind: EggKind, band: Band, asked?: AskedSums): void {
  plannedFor(kind, band, asked);
}

/**
 * How the egg plan's fitting ended for a kind and band, for what a play asked (for the tests): its rounds, its largest
 * miss, and the grades that fell back from leaving out the answers asked.
 */
export function eggPlanFit(kind: EggKind, band: Band, asked?: AskedSums): { rounds: number; off: number; relaxed: SumGrade[] } {
  const { plan, relaxed } = plannedFor(kind, band, asked);
  return { rounds: plan.fit.rounds, off: plan.fit.off, relaxed: [...relaxed] };
}

/** One egg's three cells (easy, middle, hard) from its plan: first the three answers, then each grade's cell. */
function pickCells(grades: GradePlan[], rand: Rand): Cell[] {
  const w = grades.map(answerWeights);
  const triples: [number, number, number][] = [];
  for (let a = 0; a < ANSWERS.length; a++) {
    if (!w[0][a]) continue;
    for (let b = 0; b < ANSWERS.length; b++) {
      if (b === a || !w[1][b]) continue;
      for (let c = 0; c < ANSWERS.length; c++) if (c !== a && c !== b && w[2][c]) triples.push([a, b, c]);
    }
  }
  const answers = weighted(rand, triples, ([a, b, c]) => w[0][a] * w[1][b] * w[2][c]);
  return grades.map((g, i) => weighted(rand, g.cells.filter((c) => answerAt(c) === answers[i]), (c) => c.f));
}

/**
 * The planned cell, or, when its total was asked earlier this play (the warm egg's, for the snow egg), a cell just
 * like it (alike) whose total was not, while there is one. Within 10 only the easy sum can swap: both eggs ask the
 * totals 9 and 10, one adding and one taking away. The last play's totals are not left out: every play asks 9 and 10,
 * and the plan's spread bound already keeps a sum from coming back play after play.
 */
function freshCell(g: GradePlan, cell: Cell, used: readonly number[], rand: Rand): Cell {
  const asked = new Set(used);
  const fresh = (c: Cell) => !asked.has(totalOf(c.combo));
  if (fresh(cell)) return cell;
  const pool = (g.alike.get(cell) ?? []).filter(fresh);
  return pool.length ? weighted(rand, pool, (c) => c.f) : cell;
}

/**
 * Fit every egg plan now, so the fitting (a few milliseconds the first time a kind and band is asked) never runs in
 * the middle of a walk. Band A first: a play's first egg is band A.
 */
export function fitEggPlans(): void {
  for (const band of ['a', 'b'] as const) for (const kind of EGG_KINDS) eggPlan(kind, band);
}

/** Every egg kind: the nest egg's warm, the shore egg's snow and the trail's star (2.4.0). */
export const EGG_KINDS: readonly EggKind[] = ['warm', 'snow', 'star'];

type Compare = 'more' | 'fewer';
/** The six orders of an egg's three questions that ask both "more" and "fewer". */
const STAR_ORDERS: readonly [Compare, Compare, Compare][] = [
  ['more', 'more', 'fewer'], ['more', 'fewer', 'more'], ['fewer', 'more', 'more'],
  ['more', 'fewer', 'fewer'], ['fewer', 'more', 'fewer'], ['fewer', 'fewer', 'more'],
];

/**
 * The star egg's question per sum, in the order asked (2.4.0, section 5.5): one of the six orders that ask both "How
 * many more has the moon?" and "How many fewer has the egg?", drawn evenly from the egg's stream.
 */
export function starCompares(rand: Rand): [Compare, Compare, Compare] {
  return [...pick(rand, STAR_ORDERS)];
}

/**
 * An egg's three sums (2.3 section 19.1), all planned when the egg opens, from the egg's own stream: easy first, then
 * middle and hard in either order. The egg plan (eggPlan) picks each sum and its answer's place; then a sum whose
 * total was asked earlier this play gives way to one just like it for the guess rules (freshCell), while there is
 * one. Then the tray. No total and no answer comes twice in one egg. The hard sum takes the band; easy and middle
 * have none and show 4 stones. `lastTotals` is not used (freshCell says why). `first` adds the kind's intro (and the
 * warm egg's spoken gesture) to the first sum; every egg's first sum carries "Fill all three hearts, and the egg will
 * hatch.", which ui/egg.ts says before the play's first egg only.
 */
export function eggSums(kind: EggKind, rand: Rand, o: MathsPick & { first?: boolean } = {}): EggSpec[] {
  const band = o.band ?? 'a';
  const { grades } = plannedFor(kind, band, o.asked).plan;
  const order = rand() < 0.5 ? [0, 1, 2] : [0, 2, 1];
  const planned = pickCells(grades, rand);
  const used = [...(o.used?.totals ?? [])];
  // Drawn after the sums, so a star egg's questions never shift its sums, and only for the star egg.
  const compares = kind === 'star' ? starCompares(rand) : null;
  return order.map((g, index): EggSpec => {
    const grade = SUM_GRADES[g];
    const { combo, place } = freshCell(grades[g], planned[g], used, rand);
    used.push(totalOf(combo));
    const { stones, decoys } = trayFor(kind, combo, grades[g].n, place, rand);
    const compare = compares?.[index];
    return {
      kind, ...combo, stones, ...(grade === 'hard' ? { band } : {}), decoys, skin: 'egg', grade, ...(compare ? { compare } : {}),
      round: { index: index as 0 | 1 | 2, of: 3 }, clips: sumClips(kind, combo, (o.first ?? false) && index === 0, index, compare),
    };
  });
}

// ------------------------------------------------------------------------------------------------ the clips

/**
 * The fact after the right stone. v3's bond clips ("Three and four make seven!") cover two parts of 1 to 9, which is
 * every warm egg and hay rack (have 3 to 7); ten and some more would be the demo's own num-add clip.
 */
export function addClip(have: number, answer: number): string {
  return have <= 9 ? `num-bond-${have}-${answer}` : `num-add-${have}-${answer}`;
}

/** "Ten take away seven is three!" Each fact is a line in tools/lines.ts (the num-take pattern) until gen.sh makes it. */
export function takeClip(have: number, answer: number): string {
  return `num-take-${have}-${answer}`;
}

/**
 * The fact line a sum says after its right stone: num-bond for warm, num-take-have-answer for snow, num-take-have-need
 * for star ("Nine take away five is four!": the moon's stars take away the egg's). All 14 star facts were made for the
 * snow egg, so they cost nothing (2.4 section 5.5).
 */
export function factClip(kind: EggKind, c: { need: number; have: number; answer: number }): string {
  if (kind === 'warm') return addClip(c.have, c.answer);
  return kind === 'snow' ? takeClip(c.have, c.answer) : takeClip(c.have, c.need);
}

/** The highest k each miss line exists for: num-over, num-cold and num-more 1 to 9, num-still-warm 1 to 6. */
export const MISS_MAX = { over: 9, cold: 9, more: 9, stillWarm: 6 } as const;
export const clampK = (k: number, max: number): number => Math.max(1, Math.min(max, Math.round(Math.abs(k))));

export function count(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `num-${i + 1}`);
}

/** The clips of one egg. `compare` is the star egg's question ("How many more has the moon?" when not given). */
function eggClips(kind: EggKind, c: EggCombo, first: boolean, compare?: 'more' | 'fewer'): EggSpec['clips'] {
  const { need, have, answer } = c;
  if (kind === 'star') {
    // 2.4.0: the moon's stars and the egg's, then the question; neither group changes, she drags the difference.
    return {
      intro: first ? ['g4-star-egg'] : [],
      goal: [`num-moon-${have}`, `num-eggstar-${need}`],
      ask: [compare === 'fewer' ? 'g4-fewer-egg' : 'g4-more-moon'],
      right: ['fb-yes', factClip('star', c)],
      tooBig: (k) => [`num-over-${clampK(k, MISS_MAX.over)}`],
      tooSmall: (k) => [`num-more-${clampK(k, MISS_MAX.more)}`],
      hint: ['h4-line-up'],
      count: count(answer),
    };
  }
  if (kind === 'warm') {
    return {
      intro: first ? ['g-egg'] : [],
      goal: [`num-egg-${need}`, `num-warm-${have}`],
      // "Drag one stone to the nest." once, after the very first goal: Emma cannot read how the stones work.
      ...(first ? { afterGoal: ['g-stone'] } : {}),
      right: ['fb-warm', addClip(have, answer)],
      tooBig: (k) => ['fb-hot', `num-over-${clampK(k, MISS_MAX.over)}`],
      tooSmall: (k) => ['fb-brr', `num-cold-${clampK(k, MISS_MAX.cold)}`],
      // The cold cups hide under a blanket: "Let's peek under the blanket.", then the ui counts them.
      hint: ['h-peek'],
      count: count(answer),
    };
  }
  return {
    intro: first ? ['g4-snow-egg'] : [],
    // The stones wake when the two numbers are said; how to cool the egg follows with them awake (2.3.2).
    goal: [`num-egg-${need}`, `num-toowarm-${have}`],
    ask: ['g4-snow'],
    right: ['fb4-just-right', takeClip(have, answer)],
    // The snow stone cooled too many cups, so the egg shivers; too few, and it is still too hot.
    tooBig: (k) => ['fb-brr', `num-over-${clampK(k, MISS_MAX.over)}`],
    tooSmall: (k) => ['fb-hot', `num-still-warm-${clampK(k, MISS_MAX.stillWarm)}`],
    hint: ['h4-count-extra'],
    count: count(answer),
  };
}

/**
 * An egg's numbers, stones and clips. `first` adds the intro for the first egg of its kind (and, for the warm egg,
 * the spoken gesture after the goal). The band sets the ranges and the tray size (A when not given).
 */
export function eggSpec(kind: EggKind, rand: Rand, o: MathsPick & { first?: boolean } = {}): EggSpec {
  const { band, combo, stones, decoys } = pickSum(kind, rand, o);
  const compare = kind === 'star' ? ('more' as const) : undefined;
  return { kind, ...combo, stones, band, decoys, skin: 'egg', ...(compare ? { compare } : {}), clips: eggClips(kind, combo, o.first ?? false, compare) };
}

/** Every clip an egg or hay rack spec can say, with the miss lines of its wrong stones. */
export function eggClipIds(spec: EggSpec): string[] {
  const c = spec.clips;
  const misses = spec.stones
    .filter((s) => s !== spec.answer)
    .flatMap((s) => (s > spec.answer ? c.tooBig(s - spec.answer) : c.tooSmall(spec.answer - s)));
  return [...new Set([...c.intro, ...c.goal, ...(c.ask ?? []), ...(c.afterGoal ?? []), ...c.right, ...misses, ...c.hint, ...c.count])];
}

/**
 * Every clip of every sum in both bands with every wrong stone its tray can show, built through `clipsFor` (the
 * spec's own clip builder), so the list cannot drift from the specs.
 */
export function everySumClipIds(kind: EggKind, clipsFor: (c: EggCombo, first: boolean) => EggSpec['clips']): string[] {
  const out = new Set<string>();
  for (const band of ['a', 'b'] as const) {
    for (const c of eggCombos(kind, band)) {
      const stones = [c.answer, ...reachableStones(kind, c, TRAY[band])].sort((a, b) => a - b);
      for (const first of [true, false]) eggClipIds({ kind, ...c, stones, clips: clipsFor(c, first) }).forEach((id) => out.add(id));
    }
  }
  return [...out];
}

/**
 * "Fill all three hearts, and the egg will hatch.", in every egg's first sum; ui/egg.ts says it before the play's first
 * egg only (2.3.2). The id is CLIPS.hearts's
 * (tests/maths.test.ts checks it): clips.ts imports this file, so this file cannot import CLIPS.
 */
export const HEARTS_CLIP = 'g4-hearts';

/**
 * The clips of one of an egg's three sums. The first sum adds "Fill all three hearts" after the kind's intro (the first
 * egg of a kind) and, on the first warm egg, the spoken gesture. The hearts line is always the last clip of the first
 * sum's intro: ui/egg.ts says the kind's intro once per layer, and this line once per layer too, before the play's
 * first egg (2.3.2). The second and third skip the intro: the panel and the hearts stay on screen, so only the goal is
 * new. After the right stone of the first and the second sum she hears one line, the fact; the third keeps the praise
 * before it (2.3.2).
 */
function sumClips(kind: EggKind, c: EggCombo, first: boolean, index: number, compare?: 'more' | 'fewer'): EggSpec['clips'] {
  const clips = eggClips(kind, c, first && index === 0, compare);
  const fact = factClip(kind, c);
  return { ...clips, intro: index === 0 ? [...clips.intro, HEARTS_CLIP] : [], right: index < 2 ? [fact] : clips.right };
}

/** The questions a kind can ask: the star egg's two (2.4.0), none for the others. */
const comparesOf = (kind: EggKind): readonly ('more' | 'fewer' | undefined)[] => (kind === 'star' ? ['more', 'fewer'] : [undefined]);

/** Every clip of every graded sum, in every band, at every place in an egg, with every wrong stone its tray can show. */
function everyGradedClipIds(kind: EggKind): string[] {
  const out = new Set<string>();
  for (const grade of SUM_GRADES) {
    for (const band of grade === 'hard' ? (['a', 'b'] as const) : (['a'] as const)) {
      const n = gradeTray(grade, band);
      for (const c of gradeCombos(kind, grade, band)) {
        const stones = [c.answer, ...reachableStones(kind, c, n)].sort((a, b) => a - b);
        for (const [first, index] of [[true, 0], [false, 0], [false, 1], [false, 2]] as const) {
          for (const compare of comparesOf(kind)) eggClipIds({ kind, ...c, stones, clips: sumClips(kind, c, first, index, compare) }).forEach((id) => out.add(id));
        }
      }
    }
  }
  return [...out];
}

/**
 * Every clip any egg can say: the lines, every sum's goal and fact, the counting and every reachable miss line, for
 * the three graded sums of 2.3 and for the one-sum moment (eggSpec, the hay rack's and the ui harness's).
 */
export function allEggClipIds(): string[] {
  return [...new Set(EGG_KINDS.flatMap((kind) => [
    ...everyGradedClipIds(kind),
    ...comparesOf(kind).flatMap((compare) => everySumClipIds(kind, (c, first) => eggClips(kind, c, first, compare))),
  ]))];
}
