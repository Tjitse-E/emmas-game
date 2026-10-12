// G/tools/lib/sim.ts
// The simulated learner (learning Task A21): plays the real planner and learner fold for many weeks with a
// seeded child who answers right at a given rate, and reports how long each step takes to pass.
// Every asset counts as present, so the run measures the pace of the ladders, not asset coverage.
import type { Content, MomentKind, StepId, Strand } from '../../src/core/content/types.ts';
import { applyLearnEvent, createLearner } from '../../src/core/learning/fold.ts';
import {
  currentStep, isPlacing, isSchool, openSchoolSteps, pendingLearnFacts, sideSteps,
} from '../../src/core/learning/status.ts';
import type { EventBase, Learner, Result } from '../../src/core/learning/types.ts';
import { learnResultPayload } from '../../src/core/planner/result.ts';
import { nextItem } from '../../src/core/planner/select.ts';
import { nextNameReviews } from '../../src/core/planner/names.ts';
import { spellingShareLow } from '../../src/core/planner/visit.ts';
import type { AssetIndex, ItemRequest, Pick, PlanContext } from '../../src/core/planner/types.ts';
import { mulberry32 } from '../../src/core/rng.ts';

export type SimOptions = {
  content: Content;
  seed: number;
  accuracy: number;                          // chance of a first try on a normal moment
  weeks: number;
  visitsPerWeek: [number, number];           // inclusive range, drawn per week
  momentsPerVisit: [number, number];         // checked ladder moments per visit, inclusive range
  profile: string;                           // 'year1' or 'fresh'
  trueLevel?: Partial<Record<Strand, StepId>>;   // probe answers: at or below this step use `accuracy`, above it 0.2
  /** Record the 1.0.1 maths lift (a learn.override from pendingLearnFacts) as the store does. Default true. */
  lift?: boolean;
};
export type SimStepRecord = { strand: Strand; step: StepId; school: boolean; startT: number | null; passT: number | null; weeks: number | null };
export type SimReport = {
  startT: number; visits: number; events: number;
  steps: SimStepRecord[];                    // every step that was served as current, school or side, or passed
  passedCount: Record<Strand, number>;
  finalCurrent: Record<Strand, StepId | null>;
  levelTrace: Record<Strand, number[]>;      // scaffold of each current or school moment, in order
  servedPerVisit: Record<Strand, number[]>;  // current, school and side moments per visit
  stuck: Strand[];                           // strands with 5 visits in a row of 0 served moments while they had something to learn
  nullPicks: number;
  oneRatio: number | null;                   // share of R19 picks that showed one thing
};

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const START_T = Date.UTC(2026, 11, 1, 15, 0, 0);
const TZ = 120;
const MOMENT_GAP = 40_000;                   // time between two moments of a visit
const PROBE_MISS_ACCURACY = 0.2;
const STUCK_RUN = 5;
const NAME_POOL = 20;
const NAME_REVIEWS = 2;
const HERD_START = 30;
const CYCLE: readonly Strand[] = ['m', 's', 'r'];
const STRANDS: readonly Strand[] = ['r', 's', 'm'];
const ALL_ASSETS: AssetIndex = { clip: () => true, picture: () => true };

const between = (rng: () => number, [lo, hi]: [number, number]): number => lo + Math.floor(rng() * (hi - lo + 1));

/** The steps the strand is learning now: open school steps, the current step and side steps. */
function learningSteps(l: Learner, c: Content, strand: Strand): StepId[] {
  if (isPlacing(l, strand)) return [];
  const cur = currentStep(l, c, strand);
  return [...openSchoolSteps(l, c, strand), ...(cur ? [cur] : []), ...sideSteps(l, c, strand)];
}

/** True when one of those steps has a loaded moment kind, so some place could serve it. */
function hasPlaceToLearn(l: Learner, c: Content, strand: Strand, moments: readonly MomentKind[]): boolean {
  return learningSteps(l, c, strand).some(id => (c.steps[id]?.moments ?? []).some(m => moments.includes(m)));
}

export function simulate(o: SimOptions): SimReport {
  const c = o.content;
  const planRng = mulberry32(o.seed);
  const rng = mulberry32(o.seed + 1000);
  const l = createLearner(c);
  let n = 0;
  let events = 0;

  const momentsOf: Record<Strand, MomentKind[]> = { r: [], s: [], m: [] };
  for (const m of Object.values(c.moments)) {
    if (m.loaded && (m.strand === 'r' || m.strand === 's' || m.strand === 'm')) momentsOf[m.strand].push(m.id as MomentKind);
  }

  const served = new Set<StepId>();
  const passT: Record<StepId, number> = {};
  const levelTrace: Record<Strand, number[]> = { r: [], s: [], m: [] };
  const servedPerVisit: Record<Strand, number[]> = { r: [], s: [], m: [] };
  const emptyRun: Record<Strand, number> = { r: 0, s: 0, m: 0 };
  const stuck = new Set<Strand>();
  let nullPicks = 0;
  let r19 = 0;
  let r19One = 0;
  let herd = HERD_START;
  let visits = 0;

  // Every event goes through the fold, then the facts it discovered are recorded, as the store does.
  const record = (t: number, draft: Record<string, unknown>): void => {
    const e = { id: `sim:${++n}`, t, ...draft } as EventBase;
    events += 1;
    applyLearnEvent(l, e, c);
    if (draft.type === 'step.passed') passT[String(draft.step)] ??= t;
  };
  const emit = (t: number, draft: Record<string, unknown>): void => {
    record(t, draft);
    for (const f of pendingLearnFacts(l, c)) {
      if (f.type === 'learn.override' && o.lift === false) continue;
      record(t, { ...f });
    }
  };

  const answer = (p: Pick, strand: Strand): Result => {
    let acc = o.accuracy;
    if (p.probe && p.step) {
      const top = o.trueLevel?.[strand];
      const at = c.steps[p.step]?.index;
      const max = top !== undefined ? c.steps[top]?.index : undefined;
      if (at !== undefined && max !== undefined && at > max) acc = PROBE_MISS_ACCURACY;
    }
    if (rng() < acc) return 'first';
    return rng() < 0.5 ? 'miss' : 'helped';
  };
  const play = (t: number, p: Pick, strand: Strand): void => {
    const result = answer(p, strand);
    const ms = result === 'first' ? 900 + 2100 * rng() : null;
    emit(t, { ...learnResultPayload(p, { result, ms, place: 'sim' }) });
  };

  const names = c.names.slice(0, NAME_POOL).map((x, i) => ({ babyId: `sim-baby-${i}`, name: x.name, gpcs: x.gpcs }));

  if (o.profile !== l.profile) emit(START_T - 60_000, { type: 'learn.override', op: 'profile', profile: o.profile });

  for (let week = 0; week < o.weeks; week++) {
    const count = Math.min(7, between(rng, o.visitsPerWeek));
    const days: number[] = [];
    while (days.length < count) {
      const d = Math.floor(rng() * 7);
      if (!days.includes(d)) days.push(d);
    }
    days.sort((a, b) => a - b);

    for (const day of days) {
      let t = START_T + week * WEEK + day * DAY;
      visits += 1;
      emit(t, { type: 'visit.start', tz: TZ });
      const perVisit: Record<Strand, number> = { r: 0, s: 0, m: 0 };
      const hadPlace: Record<Strand, boolean> = { r: false, s: false, m: false };
      const moments = between(rng, o.momentsPerVisit);

      for (let i = 0; i < moments; i++) {
        t += MOMENT_GAP;
        const strand: Strand = spellingShareLow(l, c) ? 's' : CYCLE[i % CYCLE.length];
        if (hasPlaceToLearn(l, c, strand, momentsOf[strand])) hadPlace[strand] = true;
        const req: ItemRequest = {
          strand, moments: momentsOf[strand], place: 'sim',
          ...(strand === 'm' ? { doors: { built: herd, own: herd } } : {}),
        };
        const ctx: PlanContext = { c, l, now: t, assets: ALL_ASSETS };
        const p = nextItem(ctx, req, planRng);
        if (!p) {
          if (learningSteps(l, c, strand).length > 0) nullPicks += 1;
          continue;
        }
        if (p.step && (p.slot === 'current' || p.slot === 'school' || p.slot === 'side')) {
          served.add(p.step);
          perVisit[strand] += 1;
        }
        if (p.slot === 'current' || p.slot === 'school') levelTrace[strand].push(p.scaffold);
        if (p.step === 'R19') {
          r19 += 1;
          if (p.carrier.kind === 'plural' && p.carrier.form === 'one') r19One += 1;
        }
        play(t, p, strand);
        if (strand === 'm') herd += 1;
      }

      for (const p of nextNameReviews({ c, l, now: t, assets: ALL_ASSETS }, names, NAME_REVIEWS, 'roll-call', planRng)) {
        t += MOMENT_GAP;
        play(t, p, 'r');
      }

      for (const strand of STRANDS) {
        servedPerVisit[strand].push(perVisit[strand]);
        if (perVisit[strand] === 0 && hadPlace[strand]) {
          emptyRun[strand] += 1;
          if (emptyRun[strand] >= STUCK_RUN) stuck.add(strand);
        } else emptyRun[strand] = 0;
      }
    }
  }

  const steps: SimStepRecord[] = [];
  const passedCount: Record<Strand, number> = { r: 0, s: 0, m: 0 };
  for (const strand of STRANDS) {
    for (const id of c.order[strand]) {
      const pt = passT[id] ?? null;
      if (pt !== null) passedCount[strand] += 1;
      if (!served.has(id) && pt === null) continue;
      const st = l.steps[id]?.startT ?? null;
      steps.push({
        strand, step: id, school: isSchool(l, c, id), startT: st, passT: pt,
        weeks: st !== null && pt !== null ? (pt - st) / WEEK : null,
      });
    }
  }

  return {
    startT: START_T,
    visits,
    events,
    steps,
    passedCount,
    finalCurrent: { r: currentStep(l, c, 'r'), s: currentStep(l, c, 's'), m: currentStep(l, c, 'm') },
    levelTrace,
    servedPerVisit,
    stuck: STRANDS.filter(s => stuck.has(s)),
    nullPicks,
    oneRatio: r19 > 0 ? r19One / r19 : null,
  };
}

const STRAND_NAMES: Record<Strand, string> = { r: 'Reading', s: 'Spelling', m: 'Maths' };
const fmtWeek = (t: number | null, from: number): string => (t === null ? '-' : ((t - from) / WEEK).toFixed(1));
const pad = (s: string, w: number): string => s.padEnd(w);

export function formatReport(r: SimReport): string {
  const out: string[] = [];
  for (const strand of STRANDS) {
    out.push(`${STRAND_NAMES[strand]}`);
    out.push(`  ${pad('step', 6)}${pad('start wk', 10)}${pad('pass wk', 10)}weeks`);
    for (const s of r.steps.filter(x => x.strand === strand)) {
      const label = s.school ? `${s.step}*` : s.step;
      const weeks = s.weeks === null ? '-' : s.weeks.toFixed(1);
      out.push(`  ${pad(label, 6)}${pad(fmtWeek(s.startT, r.startT), 10)}${pad(fmtWeek(s.passT, r.startT), 10)}${weeks}`);
    }
  }
  const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '-');
  out.push(`Visits ${r.visits}, events ${r.events}, empty picks ${r.nullPicks}`);
  out.push(`Passed: r ${r.passedCount.r}, s ${r.passedCount.s}, m ${r.passedCount.m}`);
  out.push(`Current now: r ${r.finalCurrent.r ?? '-'}, s ${r.finalCurrent.s ?? '-'}, m ${r.finalCurrent.m ?? '-'}`);
  out.push(`Learning moments per visit: r ${avg(r.servedPerVisit.r)}, s ${avg(r.servedPerVisit.s)}, m ${avg(r.servedPerVisit.m)}`);
  out.push(`Mean scaffold of the last 20: r ${avg(r.levelTrace.r.slice(-20))}, s ${avg(r.levelTrace.s.slice(-20))}, m ${avg(r.levelTrace.m.slice(-20))}`);
  out.push(`One-or-many showing one: ${r.oneRatio === null ? '-' : r.oneRatio.toFixed(2)}`);
  out.push(`Stuck strands: ${r.stuck.length ? r.stuck.join(', ') : 'none'}`);
  out.push('(* school step)');
  return out.join('\n');
}
