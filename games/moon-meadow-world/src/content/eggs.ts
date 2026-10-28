// The maths moments (docs/v4/2.2.md section 4): the two eggs and, through rack.ts, the hay rack. All within the v4
// maths floor (spec 4.4): nothing adds or takes away 1 or 2, no sum's total is under 7, no stone shows 1 or 2. The
// wrong stones are real mistakes (4.1).
//
// 2.3.0 (docs/v4/2.3.md sections 12 and 19.1): each egg asks three sums (eggSums). An easy one within 10, as at her
// school; a middle one just past 10; a hard one across ten at her band (A: 4 stones, B: 5 and wider sums). Easy comes
// first, then middle and hard in either order. Easy and middle always show 4 stones. The hay rack keeps 2.2's one sum
// (eggSpec, RANGES: need 11 to 15 in both bands).
import type { EggSpec, Outcome, StoneDecoy, SumGrade } from '../contracts.ts';
import { type Rand, pick } from './rand.ts';

export type EggKind = EggSpec['kind'];
export type Band = 'a' | 'b';

type Span = readonly [number, number];
/** One kind's numbers in one band: the egg's need, the cups warm now and the stone that is right. */
interface Ranges { need: Span; have: Span; answer: Span }

/** The ranges of 4.2. Warm (and the hay rack): need 11 to 15. Snow: have 11 to 15 (A) or 16 (B), need 7 to 10. */
export const RANGES: Record<EggKind, Record<Band, Ranges>> = {
  warm: {
    a: { need: [11, 15], have: [5, 9], answer: [4, 8] },
    b: { need: [11, 15], have: [3, 9], answer: [4, 9] },
  },
  snow: {
    a: { need: [7, 10], have: [11, 15], answer: [3, 6] },
    b: { need: [7, 10], have: [11, 16], answer: [3, 9] },
  },
};
/** Stones in the tray per band. */
export const TRAY: Record<Band, 4 | 5> = { a: 4, b: 5 };
/** The stones she can be shown: 3 to 9 (a 1 or a 2 would be adding or taking away 1 or 2). */
export const STONES = { min: 3, max: 9 } as const;

export interface EggCombo {
  need: number;
  have: number;
  answer: number;
}

const inSpan = (v: number, [lo, hi]: Span): boolean => v >= lo && v <= hi;

/** Every 2.2 sum a kind can ask in a band (the hay rack's, warm), for picking, preloading, the lines and the tests. */
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

/** The number above ten in a sum (the warm egg's or the rack's need, the snow egg's warm cups): what must not repeat. */
export function totalOf(c: { need: number; have: number }): number {
  return Math.max(c.need, c.have);
}

/** The totals and answers this play's maths moments already asked (g.maths.used). */
export interface MathsUsed {
  totals: readonly number[];
  answers: readonly number[];
}

/** The options every maths moment takes: the band and what this play and the last one asked. */
export interface MathsPick {
  band?: Band;
  used?: MathsUsed;
  lastTotals?: readonly number[];
}

/** A play's first maths moment is band A; a first try moves to B and a helped answer back to A (4.2). */
export function nextBand(band: Band, outcome: Outcome): Band {
  if (outcome === 'first') return 'b';
  if (outcome === 'helped') return 'a';
  return band;
}

/**
 * The sums still fresh: no total or answer this play has used, and none of the last play's totals while sums are
 * left. When none are left it lets go of the last play first, then of the used answers, then of everything.
 */
export function freshCombos(all: readonly EggCombo[], o: MathsPick = {}): EggCombo[] {
  const totals = new Set(o.used?.totals ?? []);
  const answers = new Set(o.used?.answers ?? []);
  const last = new Set(o.lastTotals ?? []);
  const freshTotal = (c: EggCombo) => !totals.has(totalOf(c));
  const fresh = (c: EggCombo) => freshTotal(c) && !answers.has(c.answer);
  for (const keep of [(c: EggCombo) => fresh(c) && !last.has(totalOf(c)), fresh, freshTotal]) {
    const pool = all.filter(keep);
    if (pool.length) return pool;
  }
  return all.slice();
}

// ------------------------------------------------------------------------------------------------ the stones

/** A wrong stone the tray can hold, and why. */
export interface StoneCandidate {
  value: number;
  kind: StoneDecoy;
}

/**
 * The wrong stones of a sum, in the order of 4.1, each number once (the first kind that names it keeps it), only
 * 3 to 9 and never the answer. Warm (and the hay rack): the slip is answer ± 1, `heard` is the warm cups or bundles
 * she just heard, `first-nest` is 10 - have (only the first ten), `second-nest` is need - 10. Snow: heard is the need,
 * first-nest 10 - need, second-nest have - 10. Near is answer ± 2, then ± 3.
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
 * (the snow egg 13 - 3 with 5 stones), or when the answer's place needs one more stone on a side.
 */
const FAR = 0.25;

/** How likely a wrong stone is picked for a free place of the tray: the two nest mistakes first, far guesses last. */
function stoneWeight(s: StoneCandidate, answer: number): number {
  if (s.kind === 'first-nest' || s.kind === 'second-nest') return 5;
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
 * heard number and a slip when they are valid. The other numbers from 3 to 9 can fill in as far `near` stones,
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
 * "the biggest" or "the middle" wins much more than a blind guess. Snow eggs in band A never show the answer as the
 * biggest stone: the need she just heard (7 to 9) is always in the tray and bigger than any answer (3 to 6).
 */
export function pickSum(kind: EggKind, rand: Rand, o: MathsPick = {}): { band: Band; combo: EggCombo } & Tray {
  const band = o.band ?? 'a';
  const plan = placePlan(kind, band);
  const combo = pick(rand, freshCombos([...plan.keys()], o));
  const weights = plan.get(combo) ?? [];
  const place = weighted(rand, weights.map((_, p) => p), (p) => weights[p]);
  return { band, combo, ...trayFor(kind, combo, TRAY[band], place, rand) };
}

// ------------------------------------------------------------------------------------------------ three sums per egg

/** One grade's ranges for both kinds; the hard sum has one per band. */
interface GradeRanges { easy: Ranges; middle: Ranges; hard: Record<Band, Ranges> }

/**
 * The grade table of 2.3 section 19.1. The total (totalOf) is the bigger number. Easy stays within 10 (warm totals 7
 * to 9, snow 7 to 10), middle is 11 or 12, hard 13 and more, so they never overlap. Easy and middle never end at a
 * bond to 10 she already knows (4 + 6, 5 + 5), except the snow egg's easy take-away from 10. Their answers are 3 to 6,
 * which reach all four places of a tray of 4. The hard sums keep 2.2's answers.
 */
export const GRADES: Record<EggKind, GradeRanges> = {
  warm: {
    easy: { need: [7, 9], have: [3, 6], answer: [3, 6] },
    middle: { need: [11, 12], have: [6, 9], answer: [3, 6] },
    hard: {
      a: { need: [13, 15], have: [5, 9], answer: [4, 8] },
      b: { need: [13, 15], have: [3, 9], answer: [4, 9] },
    },
  },
  snow: {
    easy: { need: [4, 7], have: [7, 10], answer: [3, 6] },
    middle: { need: [5, 9], have: [11, 12], answer: [3, 6] },
    hard: {
      a: { need: [7, 10], have: [13, 15], answer: [3, 6] },
      b: { need: [7, 10], have: [13, 16], answer: [3, 9] },
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

/** The number she heard that a stone can show (the 'heard' stone of 4.1): the warm cups, or the snow egg's need. */
export function heardOf(kind: EggKind, c: { need: number; have: number }): number {
  return kind === 'warm' ? c.have : c.need;
}

/** One sum of a grade with its answer at one place of the tray: what the egg plan picks for each grade. */
interface Cell {
  place: number;
  combo: EggCombo;
  /** How often "the stone nearest five" wins over this sum's trays with its answer here. */
  five: number;
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
   * Per cell, the cells with the same place and answer, the same number she heard as the answer or not, and the same
   * take-away from 10 or not (itself among them). A play swaps between these to keep totals fresh (freshCell), so
   * the swap never changes a guess rule the plan keeps.
   */
  alike: Map<Cell, Cell[]>;
}

/** The answers a sum can have: 3 to 9. */
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
 * How often each place of the answer is planned, per kind and grade (Claude's call): even over the places the grade
 * can reach, so the biggest, the smallest and the middle stones each win about 1 in 4 (1 in 3 where a place cannot be
 * reached). A place only one or two sums can reach gets a third or two thirds of a share, so those sums are not a
 * quarter of their grade: the warm egg's easy answer can only be the biggest stone as 9 = 3 + 6 on stones 3, 4, 5, 6,
 * and the snow egg's easy one only as 10 - 4.
 */
export function gradePlaces(kind: EggKind, grade: SumGrade, band: Band = 'a'): number[] {
  const n = gradeTray(grade, band);
  const sums = Array.from({ length: n }, () => 0);
  for (const c of gradeCombos(kind, grade, band)) for (const p of placesFor(kind, c, n)) sums[p]++;
  const w = sums.map((k) => Math.min(1, k / 3));
  const total = w.reduce((t, v) => t + v, 0);
  return w.map((v) => v / total);
}

function gradePlan(kind: EggKind, grade: SumGrade, band: Band): GradePlan {
  const n = gradeTray(grade, band);
  const combos = gradeCombos(kind, grade, band);
  const cells: Cell[] = [];
  for (const combo of combos) {
    for (const place of placesFor(kind, combo, n)) {
      const five = fiveAt(kind, combo, n, place);
      cells.push({ place, combo, five, f: 1 - CELL_FIVE_DAMP * five });
    }
  }
  const sameAs = (c: Cell) => `${c.place} ${c.combo.answer} ${heardOf(kind, c.combo) === c.combo.answer} ${c.combo.have === 10}`;
  const alike = new Map(cells.map((c) => [c, cells.filter((d) => sameAs(d) === sameAs(c))]));
  return { n, combos, cells, places: gradePlaces(kind, grade, band), alike };
}

/**
 * The bounds the egg plan keeps per grade, under those its tests check (2.3 section 19.1) with room for chance:
 * - "the stone nearest five" wins at most 29% with 4 stones and 24% with 5 (the tests: 35% and 30%);
 * - the number she heard is the answer at most 21% with 4 stones and 15% with 5 (the tests: blind odds, 25% and
 *   20%), or dragging the number Elizabeth just said would win more than a blind guess (8 - 4 = 4, 12 = 6 + 6);
 * - at most 36% of the snow egg's easy sums take away from 10, the bond she knows (the tests: 40%, the table's 4 in
 *   10);
 * - no sum is planned more than 1.4 even shares of its grade (the tests: 1.5), so none comes back play after play.
 * Tighter bounds leave the snow egg's easy sums no plan: only 10 - 4 can show its answer as the biggest stone, and
 * only 9 - 4, 10 - 5 and 10 - 4 as the upper middle one.
 */
const PLAN_FIVE_CAP: Record<4 | 5, number> = { 4: 0.29, 5: 0.24 };
const PLAN_HEARD_CAP: Record<4 | 5, number> = { 4: 0.21, 5: 0.15 };
const PLAN_TEN_CAP = 0.36;
const PLAN_SUM_SPREAD = 1.4;
/** The fitting stops when every place and bound is within this, or after this many rounds. */
const FIT_TOLERANCE = 1e-5;
const FIT_ROUNDS = 3000;

/** One bound of a grade: the cells it counts, how much of each, and the cap on the share they are planned. */
interface Bound {
  cells: Cell[];
  part: number[];
  cap: number;
}

interface EggPlan {
  grades: GradePlan[];
  /** The fitting's rounds and its largest miss when it stopped (for the tests). */
  fit: { rounds: number; off: number };
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
 * answers she heard, of take-aways from 10 and of each sum under the bounds above. Easy, middle and the hard sum draw
 * from overlapping answers, so this is fitted over whole eggs: the guess rules then hold for every grade and every
 * place in the egg, whatever came before. A grade's share of a cell is its factor times the weight of the other two
 * grades' different answers (othersFor), so a round costs a few thousand steps and the fitting a few milliseconds.
 */
function eggPlan(kind: EggKind, band: Band): EggPlan {
  const key = `${kind} ${band}`;
  const cached = eggPlanCache.get(key);
  if (cached) return cached;
  const grades = SUM_GRADES.map((grade) => gradePlan(kind, grade, band));
  const bounds = grades.map((g, i): Bound[] => {
    const bound = (part: (c: Cell) => number, cap: number): Bound => {
      const cells = g.cells.filter((c) => part(c) > 0);
      return { cells, part: cells.map(part), cap };
    };
    return [
      bound((c) => c.five, PLAN_FIVE_CAP[g.n]),
      bound((c) => Number(heardOf(kind, c.combo) === c.combo.answer), PLAN_HEARD_CAP[g.n]),
      ...(kind === 'snow' && SUM_GRADES[i] === 'easy' ? [bound((c) => Number(c.combo.have === 10), PLAN_TEN_CAP)] : []),
      ...g.combos.map((x) => bound((c) => Number(c.combo === x), PLAN_SUM_SPREAD / g.combos.length)),
    ];
  });
  const w = grades.map(answerWeights);
  const fit = { rounds: 0, off: 1 };
  while (fit.rounds < FIT_ROUNDS && fit.off > FIT_TOLERANCE) {
    fit.rounds++;
    let off = 0;
    grades.forEach((g, i) => {
      const others = othersFor(w, i);
      const mass = (c: Cell) => c.f * others[answerAt(c)];
      const total = () => g.cells.reduce((t, c) => t + mass(c), 0);
      let z = total();
      const at = g.places.map(() => 0);
      for (const c of g.cells) at[c.place] += mass(c) / z;
      for (const c of g.cells) c.f *= g.places[c.place] / at[c.place];
      off = Math.max(off, ...at.map((v, p) => Math.abs(v - g.places[p])));
      for (const b of bounds[i]) {
        z = total();
        const share = b.cells.reduce((t, c, j) => t + b.part[j] * mass(c), 0) / z;
        if (share <= b.cap) continue;
        off = Math.max(off, share - b.cap);
        b.cells.forEach((c, j) => (c.f *= 1 + b.part[j] * (b.cap / share - 1)));
      }
      const sum = g.cells.reduce((t, c) => t + c.f, 0);
      for (const c of g.cells) c.f /= sum;
      w[i] = answerWeights(g);
    });
    fit.off = off;
  }
  const out = { grades, fit };
  eggPlanCache.set(key, out);
  return out;
}

/** How the egg plan's fitting ended for a kind and band (for the tests): its rounds and its largest miss. */
export function eggPlanFit(kind: EggKind, band: Band): { rounds: number; off: number } {
  return { ...eggPlan(kind, band).fit };
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
 * like it (alike) whose total was not, while there is one. The last play's totals are not left out: leaving them out
 * as well pushed the snow egg's sums onto the totals the warm egg can never ask (16 - 10 twice its even share), and
 * the plan's spread bound already keeps a sum from coming back play after play.
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
  for (const band of ['a', 'b'] as const) for (const kind of ['warm', 'snow'] as const) eggPlan(kind, band);
}

/**
 * An egg's three sums (2.3 section 19.1), all planned when the egg opens, from the egg's own stream: easy first, then
 * middle and hard in either order. The egg plan (eggPlan) picks each sum and its answer's place; then a sum whose
 * total was asked earlier this play gives way to one just like it for the guess rules (freshCell), while there is
 * one. Then the tray. No total and no answer comes twice in one egg. The hard sum takes the band; easy and middle
 * have none and show 4 stones. `lastTotals` is not used (freshCell says why). `first` adds the kind's intro (and the
 * warm egg's spoken gesture) to the first sum; every egg's first sum says "Fill all three hearts, and the egg will
 * hatch."
 */
export function eggSums(kind: EggKind, rand: Rand, o: MathsPick & { first?: boolean } = {}): EggSpec[] {
  const band = o.band ?? 'a';
  const { grades } = eggPlan(kind, band);
  const order = rand() < 0.5 ? [0, 1, 2] : [0, 2, 1];
  const planned = pickCells(grades, rand);
  const used = [...(o.used?.totals ?? [])];
  return order.map((g, index): EggSpec => {
    const grade = SUM_GRADES[g];
    const { combo, place } = freshCell(grades[g], planned[g], used, rand);
    used.push(totalOf(combo));
    const { stones, decoys } = trayFor(kind, combo, grades[g].n, place, rand);
    return {
      kind, ...combo, stones, ...(grade === 'hard' ? { band } : {}), decoys, skin: 'egg', grade,
      round: { index: index as 0 | 1 | 2, of: 3 }, clips: sumClips(kind, combo, (o.first ?? false) && index === 0, index),
    };
  });
}

// ------------------------------------------------------------------------------------------------ the clips

/**
 * The fact after the right stone. v3's bond clips ("Eight and five make thirteen!") cover two parts of 1 to 9, which
 * is every warm egg and hay rack (have 3 to 9); ten and some more would be the demo's own num-add clip.
 */
export function addClip(have: number, answer: number): string {
  return have <= 9 ? `num-bond-${have}-${answer}` : `num-add-${have}-${answer}`;
}

/** "Fourteen take away seven is seven!" Band B's six new facts are lines in tools/lines.ts until gen.sh runs. */
export function takeClip(have: number, answer: number): string {
  return `num-take-${have}-${answer}`;
}

/** The highest k each miss line exists for: num-over, num-cold and num-more 1 to 9, num-still-warm 1 to 6. */
export const MISS_MAX = { over: 9, cold: 9, more: 9, stillWarm: 6 } as const;
export const clampK = (k: number, max: number): number => Math.max(1, Math.min(max, Math.round(Math.abs(k))));

export function count(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `num-${i + 1}`);
}

/** The clips of one egg. */
function eggClips(kind: EggKind, c: EggCombo, first: boolean): EggSpec['clips'] {
  const { need, have, answer } = c;
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
    goal: [`num-egg-${need}`, `num-toowarm-${have}`, 'g4-snow'],
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
  return { kind, ...combo, stones, band, decoys, skin: 'egg', clips: eggClips(kind, combo, o.first ?? false) };
}

/** Every clip an egg or hay rack spec can say, with the miss lines of its wrong stones. */
export function eggClipIds(spec: EggSpec): string[] {
  const c = spec.clips;
  const misses = spec.stones
    .filter((s) => s !== spec.answer)
    .flatMap((s) => (s > spec.answer ? c.tooBig(s - spec.answer) : c.tooSmall(spec.answer - s)));
  return [...new Set([...c.intro, ...c.goal, ...(c.afterGoal ?? []), ...c.right, ...misses, ...c.hint, ...c.count])];
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
 * "Fill all three hearts, and the egg will hatch.", before an egg's first sum. The id is CLIPS.hearts's
 * (tests/maths.test.ts checks it): clips.ts imports this file, so this file cannot import CLIPS.
 */
export const HEARTS_CLIP = 'g4-hearts';

/**
 * The clips of one of an egg's three sums. The first sum adds "Fill all three hearts" after the kind's intro (the first
 * egg of a kind) and, on the first warm egg, the spoken gesture. The hearts line is always the last clip of the first
 * sum's intro: ui/egg.ts says the kind's intro once per layer, and this line for every egg. The second and third skip
 * the intro: the panel and the hearts stay on screen, so only the goal is new.
 */
function sumClips(kind: EggKind, c: EggCombo, first: boolean, index: number): EggSpec['clips'] {
  const clips = eggClips(kind, c, first && index === 0);
  return { ...clips, intro: index === 0 ? [...clips.intro, HEARTS_CLIP] : [] };
}

/** Every clip of every graded sum, in every band, at every place in an egg, with every wrong stone its tray can show. */
function everyGradedClipIds(kind: EggKind): string[] {
  const out = new Set<string>();
  for (const grade of SUM_GRADES) {
    for (const band of grade === 'hard' ? (['a', 'b'] as const) : (['a'] as const)) {
      const n = gradeTray(grade, band);
      for (const c of gradeCombos(kind, grade, band)) {
        const stones = [c.answer, ...reachableStones(kind, c, n)].sort((a, b) => a - b);
        for (const [first, index] of [[true, 0], [false, 0], [false, 1]] as const) {
          eggClipIds({ kind, ...c, stones, clips: sumClips(kind, c, first, index) }).forEach((id) => out.add(id));
        }
      }
    }
  }
  return [...out];
}

/**
 * Every clip any egg can say: the lines, every sum's goal and fact, the counting and every reachable miss line, for
 * the three graded sums of 2.3 and for 2.2's one sum (eggSpec, still the hay rack's and the ui harness's).
 */
export function allEggClipIds(): string[] {
  return [...new Set((['warm', 'snow'] as const).flatMap((kind) => [
    ...everyGradedClipIds(kind),
    ...everySumClipIds(kind, (c, first) => eggClips(kind, c, first)),
  ]))];
}
