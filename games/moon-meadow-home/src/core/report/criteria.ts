// Report formulas for the success criteria (Task A14, spec 1.3). One named function per criterion, plus the
// jewel share of openings (spec 1.1, R56). Pure functions over the event log; `report` sorts the events in fold
// order and leaves out excluded devices first. The parent corner and `tools/report.ts` read the same numbers.
import { compareEvents, type GameEvent } from '../events.ts';
import { excludedDevices } from '../fold/engine.ts';
import type { Strand } from '../../types/contracts.ts';
import readingLadder from '../../../content/ladders/reading.json' with { type: 'json' };
import spellingLadder from '../../../content/ladders/spelling.json' with { type: 'json' };
import mathsLadder from '../../../content/ladders/maths.json' with { type: 'json' };

const WEEK = 7 * 24 * 3_600_000;
const STRANDS: readonly Strand[] = ['r', 's', 'm'];

/** Scenes of the heartbeat (E3). Everything else she plays in is role play or free play. */
export const HEARTBEAT_PLACES: ReadonlySet<string> = new Set(['nest', 'hatch', 'naming', 'wish', 'stalls', 'goodnight', 'egg-choice', 'welcome', 'moving-day']);
/** Scenes that are not Emma's play time (E3 leaves them out of the visit time). */
export const NOT_PLAY_PLACES: ReadonlySet<string> = new Set(['parent', 'rest']);
/** Contrast steps from the ladders (L4). */
type LadderStep = { id: string; contrast?: boolean };
export const CONTRAST_STEPS: ReadonlySet<string> = new Set(
  [readingLadder, spellingLadder, mathsLadder].flatMap((l) => (l.steps as LadderStep[]).filter((s) => s.contrast).map((s) => s.id)),
);
/** name.built outcomes that are not a refusal (E4): accepted names, plus "no vowel" and "blocked". */
export const NAME_OUTCOMES: ReadonlySet<string> = new Set(['no-vowel', 'blocked', 'list', 'unknown', 'chosen']);
/** Herd-opened places without a Building Day: they count as an opening when announced (jewel share). */
export const HERD_PLACE_OPENINGS: ReadonlySet<string> = new Set(['letter-lane']);

type Res = Extract<GameEvent, { type: 'learn.result' }>;
export type VisitSlice = { id: string; start: number; end: number; events: GameEvent[] };
export type Band = { n: number; rate: number; flag: 'low' | 'high' | null };

/** Fold order: hybrid clock, then device, then the sequence after the colon in the id (core's order). */
export function sortEvents(ev: readonly GameEvent[]): GameEvent[] {
  return [...ev].sort(compareEvents);
}

/** Leaves out the events of devices whose latest `exclude` event has `on: true`. Expects fold order. */
export function applyExclude(ev: readonly GameEvent[]): GameEvent[] {
  const out = new Set(excludedDevices(ev));
  return ev.filter((e) => e.type === 'exclude' || !out.has(e.dev));
}

/** Visits in log order. A visit runs from its visit.start to its visit.end, or to its last event. */
export function visitSlices(ev: readonly GameEvent[]): VisitSlice[] {
  const out: VisitSlice[] = [];
  let cur: VisitSlice | null = null;
  for (const e of ev) {
    if (e.type === 'visit.start') { cur = { id: e.visit, start: e.t, end: e.t, events: [] }; out.push(cur); continue; }
    if (!cur) continue;
    cur.events.push(e);
    cur.end = Math.max(cur.end, e.t);
    if (e.type === 'visit.end') cur = null;
  }
  return out;
}

export const playWeek = (first: number, t: number): number => 1 + Math.floor((t - first) / WEEK);
const firstStart = (ev: readonly GameEvent[]) => ev.find((e) => e.type === 'visit.start')?.t ?? ev[0]?.t ?? 0;
const results = (ev: readonly GameEvent[]): Res[] => ev.filter((e): e is Res => e.type === 'learn.result');
const isLadder = (strand: string): strand is Strand => (STRANDS as readonly string[]).includes(strand);

export function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** E1: visits per play week. */
export function visitsPerWeek(ev: readonly GameEvent[]): Record<number, number> {
  const f = firstStart(ev);
  const out: Record<number, number> = {};
  for (const v of visitSlices(ev)) { const w = playWeek(f, v.start); out[w] = (out[w] ?? 0) + 1; }
  return out;
}

/** E2: nest eggs hatched per visit (building and row eggs do not count). */
export function eggsPerVisit(ev: readonly GameEvent[]): { perVisit: number[]; median: number; max: number } {
  const perVisit = visitSlices(ev).map((v) => v.events.filter((e) => e.type === 'egg.hatched' && e.source === 'nest').length);
  return { perVisit, median: median(perVisit), max: perVisit.length ? Math.max(...perVisit) : 0 };
}

/** Time per place in one visit, from each place.enter to the next enter, its leave, or the end of the visit. */
function placeTimes(v: VisitSlice): Map<string, number> {
  const times = new Map<string, number>();
  let place: string | null = null;
  let since = 0;
  const close = (t: number) => {
    if (place !== null) times.set(place, (times.get(place) ?? 0) + Math.max(0, t - since));
    place = null;
  };
  for (const e of v.events) {
    if (e.type === 'place.enter') { close(e.t); place = e.place; since = e.t; }
    else if (e.type === 'place.leave' && e.place === place) close(e.t);
  }
  close(v.end);
  return times;
}

/** E3: per play week, the share of play time outside the heartbeat places. */
export function roleplayShare(ev: readonly GameEvent[]): Record<number, number> {
  const f = firstStart(ev);
  const acc: Record<number, [number, number]> = {};
  for (const v of visitSlices(ev)) {
    const w = playWeek(f, v.start);
    let outside = 0; let total = 0;
    for (const [place, ms] of placeTimes(v)) {
      if (NOT_PLAY_PLACES.has(place)) continue;
      total += ms;
      if (!HEARTBEAT_PLACES.has(place)) outside += ms;
    }
    const [o, l] = acc[w] ?? [0, 0];
    acc[w] = [o + outside, l + total];
  }
  return Object.fromEntries(Object.entries(acc).map(([w, [o, l]]) => [w, l ? o / l : 0]));
}

/** E4: name builds refused for any reason other than "no vowel" or "blocked". */
export function refusedNames(ev: readonly GameEvent[]): number {
  return ev.filter((e) => e.type === 'name.built' && !NAME_OUTCOMES.has(e.outcome)).length;
}

/** E5: for her first three fresh jewels (passed steps), whether she dragged it in that visit or the next. */
export function freshJewelsDragged(ev: readonly GameEvent[]): boolean[] {
  const slices = visitSlices(ev);
  const out: boolean[] = [];
  slices.forEach((v, i) => {
    for (const e of v.events) {
      if (e.type !== 'step.passed' || out.length >= 3) continue;
      const window = [...v.events, ...(slices[i + 1]?.events ?? [])];
      out.push(window.some((x) => x.type === 'jewel.placed' && x.jewel === e.step));
    }
  });
  return out;
}

/**
 * C1: steps with an idle flag (a second idle with no touch between, `learn.idle` level 2), counted in
 * visits. A step flagged in three or more visits fails the criterion.
 */
export function idleFlags(ev: readonly GameEvent[]): { step: string; visits: number; flagged: boolean }[] {
  const by = new Map<string, Set<string>>();
  for (const v of visitSlices(ev)) for (const e of v.events) {
    if (e.type !== 'learn.idle' || e.level !== 2) continue;
    const k = e.step ?? e.strand;
    if (!by.has(k)) by.set(k, new Set());
    by.get(k)!.add(v.id);
  }
  return [...by].map(([step, set]) => ({ step, visits: set.size, flagged: set.size >= 3 })).sort((a, b) => b.visits - a.visits);
}

/**
 * C2: helped share per strand over results that are not probes, after placement ended in that strand
 * (`placement.done` or a parent `set-current`); from the start for a strand that never placed.
 * `helped` follows R31: only after an idle-triggered hint or the ghost hand.
 */
export function helpedShare(ev: readonly GameEvent[]): Record<Strand, number | null> {
  const placedAt: Partial<Record<Strand, number>> = {};
  for (const e of ev) {
    if (e.type === 'placement.done' && placedAt[e.strand] === undefined) placedAt[e.strand] = e.t;
    if (e.type === 'learn.override' && e.op === 'set-current' && placedAt[e.strand] === undefined) placedAt[e.strand] = e.t;
  }
  const out = {} as Record<Strand, number | null>;
  for (const s of STRANDS) {
    const from = placedAt[s] ?? -Infinity;
    const rs = results(ev).filter((r) => r.strand === s && !r.probe && r.t >= from);
    out[s] = rs.length ? rs.filter((r) => r.result === 'helped').length / rs.length : null;
  }
  return out;
}

/** L1: first-try accuracy per strand and play week, without probes. Flagged below 0.6 or above 0.92 from five results. */
export function firstTryAccuracy(ev: readonly GameEvent[]): Record<Strand, Record<number, Band>> {
  const f = firstStart(ev);
  const out: Record<Strand, Record<number, Band>> = { r: {}, s: {}, m: {} };
  const firsts: Record<string, number> = {};
  for (const r of results(ev)) {
    if (r.probe || !isLadder(r.strand)) continue;
    const w = playWeek(f, r.t);
    const cell = (out[r.strand][w] ??= { n: 0, rate: 0, flag: null });
    cell.n += 1;
    const key = `${r.strand}:${w}`;
    firsts[key] = (firsts[key] ?? 0) + (r.result === 'first' ? 1 : 0);
    cell.rate = firsts[key] / cell.n;
    cell.flag = cell.n < 5 ? null : cell.rate < 0.6 ? 'low' : cell.rate > 0.92 ? 'high' : null;
  }
  return out;
}

/** L2: steps passed per strand, each once. */
export function stepsPassed(ev: readonly GameEvent[]): Record<Strand, number> {
  const seen = new Set<string>();
  const out: Record<Strand, number> = { r: 0, s: 0, m: 0 };
  for (const e of ev) {
    if (e.type !== 'step.passed' || seen.has(e.step)) continue;
    seen.add(e.step);
    out[e.strand] += 1;
  }
  return out;
}

/**
 * L3 (decision D20): first-try share of results on steps that had passed before the result, without
 * probes. Name reviews are reported apart.
 */
export function reviewAccuracy(ev: readonly GameEvent[]): { ladder: number | null; names: number | null } {
  const passedAt = new Map<string, number>();
  let n = 0; let f = 0; let nn = 0; let nf = 0;
  for (const e of ev) {
    if (e.type === 'step.passed' && !passedAt.has(e.step)) passedAt.set(e.step, e.t);
    if (e.type !== 'learn.result' || e.probe) continue;
    if (e.strand === 'name') { nn += 1; nf += e.result === 'first' ? 1 : 0; continue; }
    const p = e.step === null ? undefined : passedAt.get(e.step);
    if (p !== undefined && p < e.t) { n += 1; f += e.result === 'first' ? 1 : 0; }
  }
  return { ladder: n ? f / n : null, names: nn ? nf / nn : null };
}

/**
 * L4: for each passed contrast step, the share of its errors tagged `dutch` in weeks 1 and 2 after the
 * pass (`early`) and in weeks 3 and 4 (`late`). `halved` when late is half of early or less.
 */
export function dutchShare(ev: readonly GameEvent[]): { step: string; early: number | null; late: number | null; halved: boolean | null }[] {
  const out: { step: string; early: number | null; late: number | null; halved: boolean | null }[] = [];
  const seen = new Set<string>();
  for (const p of ev) {
    if (p.type !== 'step.passed' || !CONTRAST_STEPS.has(p.step) || seen.has(p.step)) continue;
    seen.add(p.step);
    const errs = results(ev).filter((r) => r.step === p.step && r.result !== 'first');
    const share = (from: number, to: number) => {
      const w = errs.filter((r) => r.t >= p.t + from * WEEK && r.t < p.t + to * WEEK);
      return w.length ? w.filter((r) => r.error === 'dutch').length / w.length : null;
    };
    const early = share(0, 2);
    const late = share(2, 4);
    out.push({ step: p.step, early, late, halved: early === null || late === null || early === 0 ? null : late <= early / 2 });
  }
  return out;
}

/** L5: spelling share of checked ladder moments per visit with five or more of them (names left out). */
export function spellingShare(ev: readonly GameEvent[]): { perVisit: (number | null)[]; mean: number | null } {
  const perVisit = visitSlices(ev).map((v) => {
    const rs = results(v.events).filter((r) => isLadder(r.strand));
    return rs.length >= 5 ? rs.filter((r) => r.strand === 's').length / rs.length : null;
  });
  const ok = perVisit.filter((x): x is number => x !== null);
  return { perVisit, mean: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null };
}

/**
 * The share of openings that came from jewels (spec 1.1). An opening is a built plot (`building.done`,
 * each plot once) or a herd place without a Building Day when it is announced. A built plot that took a
 * jewel (`jewel.placed`) came from jewels; every other opening (Bath Pond, Post Box, rows) came from the herd.
 */
export function jewelShare(ev: readonly GameEvent[]): { jewel: number; herd: number; share: number | null } {
  const jewelled = new Set<string>();
  const opened = new Map<string, boolean>();
  for (const e of ev) {
    if (e.type === 'jewel.placed') jewelled.add(e.plot);
    else if (e.type === 'building.done' && !opened.has(e.plot)) opened.set(e.plot, jewelled.has(e.plot));
    else if (e.type === 'opening.announced' && HERD_PLACE_OPENINGS.has(e.opening) && !opened.has(e.opening)) opened.set(e.opening, false);
  }
  const jewel = [...opened.values()].filter(Boolean).length;
  const herd = opened.size - jewel;
  return { jewel, herd, share: opened.size ? jewel / opened.size : null };
}

export type Report = {
  E1: Record<number, number>; E2: ReturnType<typeof eggsPerVisit>; E3: Record<number, number>; E4: number; E5: boolean[];
  C1: ReturnType<typeof idleFlags>; C2: Record<Strand, number | null>; L1: ReturnType<typeof firstTryAccuracy>;
  L2: Record<Strand, number>; L3: ReturnType<typeof reviewAccuracy>; L4: ReturnType<typeof dutchShare>; L5: ReturnType<typeof spellingShare>;
  J: ReturnType<typeof jewelShare>;
  generatedAt: number;
};

export function report(all: readonly GameEvent[], now: number): Report {
  const ev = applyExclude(sortEvents(all));
  return {
    E1: visitsPerWeek(ev), E2: eggsPerVisit(ev), E3: roleplayShare(ev), E4: refusedNames(ev), E5: freshJewelsDragged(ev),
    C1: idleFlags(ev), C2: helpedShare(ev), L1: firstTryAccuracy(ev), L2: stepsPassed(ev), L3: reviewAccuracy(ev),
    L4: dutchShare(ev), L5: spellingShare(ev), J: jewelShare(ev), generatedAt: now,
  };
}
