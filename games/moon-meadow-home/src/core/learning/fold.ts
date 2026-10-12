// G/src/core/learning/fold.ts
// The learner fold: a pure fold over learning events into a JSON-serialisable Learner.
// Unknown event types, items and steps are skipped, never thrown on.
import type { Content, FluencyType, ItemId, LearnStrand, StepId, Strand } from '../content/types.ts';
import type {
  EventBase, ImportV2Event, Learner, LearnOverrideEvent, LearnResultEvent, PlacementDoneEvent, PlacementState,
  StepPassedEvent, StepState, VisitStartEvent, VisitState,
} from './types.ts';
import { emptyFluency, isFast, recordFirstTry } from './fluency.ts';
import { itemStrand, isNameItem } from './ids.ts';
import { newMemory, updateMemory } from './leitner.ts';
import { newStepState, pushWindow, recordReview } from './mastery.ts';
import { initPlacement, recordProbe } from './placement.ts';
import { moveScaffold } from './scaffold.ts';
import { isPlacedStep, isPassedStep, placedByRelease, profileOf, schoolFn, STRANDS } from './status.ts';
import { localDay } from './time.ts';
import { mathsTotal } from './egg-visit.ts';

/** Part of the snapshot key: change it whenever the fold logic changes. */
export const LEARNER_FOLD_VERSION = 3;   // 2: recent results keep the pair of a Dutch-tagged error; 3: visit eggs, overridden

const RECENT_MAX = 300;
const FLUENCY_TYPES: readonly FluencyType[] = ['grapheme', 'tricky', 'bond', 'fact', 'table'];
const LEARN_STRANDS: readonly LearnStrand[] = ['r', 's', 'm', 'name'];

function emptyVisit(seq: number, startT: number, tz: number): VisitState {
  return {
    seq, startT, tz, counts: { r: 0, s: 0, m: 0, name: 0 }, ladder: 0, spell: 0, golden: false, box0: {}, recent: [], eggs: [],
  };
}

export function createLearner(c: Content, profile: string = c.budget.defaultProfile): Learner {
  const l: Learner = {
    v: 1,
    profile,
    lastT: 0,
    items: {},
    steps: {},
    placement: {} as Record<Strand, PlacementState>,
    side: { r: [], s: [], m: [] },
    school: {},
    visit: emptyVisit(0, 0, 0),
    newToday: { r: { day: -1, ids: [] }, s: { day: -1, ids: [] }, m: { day: -1, ids: [] } },
    fluency: Object.fromEntries(FLUENCY_TYPES.map(f => [f, emptyFluency()])) as Learner['fluency'],
    imported: [],
    recent: { r: [], s: [], m: [], name: [] },
  };
  for (const strand of STRANDS) l.placement[strand] = initPlacement(c, strand, profileOf(l, c), schoolFn(l, c));
  return l;
}

function stepState(l: Learner, step: StepId): StepState {
  return (l.steps[step] ??= newStepState());
}

function seedPlacedItems(l: Learner, c: Content, step: StepId, t: number): void {
  for (const it of c.steps[step]?.items ?? []) {
    if (!c.items[it.id] || l.items[it.id]) continue;
    l.items[it.id] = { box: 2, lastT: t, lastVisit: l.visit.seq, seen: 0, firsts: 0, seeded: false, placedInit: true };
  }
}

function addListed(p: PlacementState, steps: readonly StepId[]): void {
  p.listed ??= [];
  for (const s of steps) if (!p.listed.includes(s)) p.listed.push(s);
}

const stepList = (x: unknown): StepId[] => (Array.isArray(x) ? x.filter((s): s is StepId => typeof s === 'string') : []);

function onVisitStart(l: Learner, e: VisitStartEvent): void {
  l.visit = emptyVisit(l.visit.seq + 1, e.t, Number.isFinite(e.tz) ? e.tz : 0);
}

/** The contrast pair a Dutch-tagged result is about: a pair item, or the twin pair of a twin carrier ('pan|pen'). */
function dutchPair(e: LearnResultEvent, c: Content): string | null {
  for (const { id } of Array.isArray(e.items) ? e.items : []) {
    const it = c.items[id];
    if (it?.kind === 'pair' && it.pair) return it.pair;
  }
  const words = String(e.carrier).split('|');
  if (words.length === 2) {
    for (const [pair, ts] of Object.entries(c.twins)) {
      if (ts.some(t => (t.a === words[0] && t.b === words[1]) || (t.a === words[1] && t.b === words[0]))) return pair;
    }
  }
  return null;
}

function onResult(l: Learner, e: LearnResultEvent, c: Content): void {
  const b = c.budget;
  const strand = e.strand;
  if (!LEARN_STRANDS.includes(strand)) return;
  const probe = e.probe === true || e.slot === 'probe';
  const ms = typeof e.ms === 'number' && Number.isFinite(e.ms) ? e.ms : null;
  const fast: Partial<Record<FluencyType, boolean>> = {};
  const firstTypes = new Set<FluencyType>();
  const touched = new Set<ItemId>();

  // 1. Item memories.
  for (const { id, r } of Array.isArray(e.items) ? e.items : []) {
    const item = c.items[id];
    if (!item && !isNameItem(id)) continue;
    const fl = item?.fluency;
    if (fl) fast[fl] ??= isFast(l.fluency[fl], ms, b);
    let mem = l.items[id];
    const wasNew = !mem || (mem.seen === 0 && !mem.seeded && !mem.placedInit);
    if (!mem) mem = l.items[id] = newMemory();
    updateMemory(mem, r, e.t, l.visit.seq, fl ? fast[fl] === true : false, !!fl, !probe);
    const own = itemStrand(id);
    if (wasNew && !probe && (own === 'r' || own === 's' || own === 'm')) {
      const day = localDay(e.t, l.visit.tz);
      const nt = l.newToday[own];
      if (nt.day !== day) { nt.day = day; nt.ids = []; }
      if (!nt.ids.includes(id)) nt.ids.push(id);
    }
    if (mem.box === 0) l.visit.box0[id] = 0;
    else delete l.visit.box0[id];
    if (fl && r === 'first') firstTypes.add(fl);
    touched.add(id);
  }

  // 2. Box 0 counters of the other items of this strand.
  for (const id of Object.keys(l.visit.box0)) {
    if (!touched.has(id) && itemStrand(id) === strand) l.visit.box0[id] += 1;
  }

  // 3. Fluency samples, once per type.
  if (ms !== null) for (const fl of firstTypes) recordFirstTry(l.fluency[fl], ms, e.t, b);

  // 4. Visit counts and recent results.
  const v = l.visit;
  v.counts[strand] += 1;
  if (strand !== 'name') v.ladder += 1;
  if (strand === 's') v.spell += 1;
  v.recent.push(String(e.carrier));
  if (v.recent.length > b.recentCarriers) v.recent.splice(0, v.recent.length - b.recentCarriers);
  const rec = l.recent[strand];
  const err = e.error ?? null;
  const pair = err === 'dutch' ? dutchPair(e, c) : null;
  rec.push(pair ? { t: e.t, r: e.result, err, slot: e.slot, pair } : { t: e.t, r: e.result, err, slot: e.slot });
  if (rec.length > RECENT_MAX) rec.splice(0, rec.length - RECENT_MAX);
  if (e.slot === 'golden') v.golden = true;
  if (strand === 'm' && e.place === 'nest') {
    const first = Array.isArray(e.items) ? e.items[0] : undefined;
    const task = first ? c.items[first.id]?.task : undefined;
    const total = task ? mathsTotal(task) : null;
    if (total !== null) (v.eggs ??= []).push({ total, moment: e.moment });
  }

  // 5. The step part.
  if (strand === 'name' || !e.step) return;
  const step = c.steps[e.step];
  if (!step || step.strand !== strand) return;
  // R34: a station wish moves item boxes only. It never starts, scaffolds, passes or reopens a step.
  if (e.moment === 'station-wish') return;
  if (probe) {
    const p = l.placement[strand];
    if (!p.done) recordProbe(p, step.id, e.result, c, strand, schoolFn(l, c));
    return;
  }
  const day = localDay(e.t, l.visit.tz);
  switch (e.slot) {
    case 'current': case 'school': case 'side': {
      const st = stepState(l, step.id);
      st.startT ??= e.t;
      moveScaffold(st, e.result, step.top, b);
      if (e.scaffold === step.top) pushWindow(st, e.result, day, b);
      break;
    }
    case 'golden': {
      if (e.scaffold === step.top) pushWindow(stepState(l, step.id), e.result, day, b);
      break;
    }
    case 'review': case 'mixed': {
      if (isPassedStep(l, step.id) || isPlacedStep(l, c, step.id)) recordReview(stepState(l, step.id), e.result, day, b);
      break;
    }
    default:
      break;   // warmup and name: nothing
  }
}

function onPassed(l: Learner, e: StepPassedEvent, c: Content): void {
  const step = c.steps[e.step];
  if (!step || step.strand !== e.strand) return;
  const st = stepState(l, e.step);
  if (st.passed) return;
  st.passed = true;
  st.passedT = e.t;
}

/** Ends placement with fixed lists (placement.done, or set-current when `replace` is true). */
function endPlacement(l: Learner, c: Content, strand: Strand, current: StepId, placed: StepId[], side: StepId[], t: number, replace: boolean): void {
  const p = l.placement[strand];
  p.done = true;
  p.current = current;
  p.pending = null;
  if (replace) {
    p.listed = [];
    for (const id of c.order[strand]) {
      const st = l.steps[id];
      if (st?.placed && !placed.includes(id)) st.placed = false;
    }
    l.side[strand] = side.filter(id => c.steps[id]?.strand === strand);
  } else {
    for (const id of side) if (c.steps[id]?.strand === strand && !l.side[strand].includes(id)) l.side[strand].push(id);
  }
  addListed(p, [...placed, ...side]);
  for (const id of placed) {
    if (c.steps[id]?.strand !== strand) continue;
    stepState(l, id).placed = true;
    seedPlacedItems(l, c, id, t);
  }
  // R35: steps a later release loaded below her placement start in box 2 like the rest.
  for (const id of c.loaded[strand]) if (placedByRelease(l, c, id)) seedPlacedItems(l, c, id, t);
}

function onPlacementDone(l: Learner, e: PlacementDoneEvent, c: Content): void {
  const p = l.placement[e.strand];
  if (!p || p.done || !c.steps[e.current]) return;
  endPlacement(l, c, e.strand, e.current, stepList(e.placed), stepList(e.side), e.t, false);
}

function onOverride(l: Learner, e: LearnOverrideEvent, c: Content): void {
  switch (e.op) {
    case 'profile': {
      if (typeof e.profile !== 'string') return;
      l.profile = e.profile;
      for (const strand of STRANDS) {
        const p = l.placement[strand];
        if (p.items === 0 && p.current === null) l.placement[strand] = initPlacement(c, strand, profileOf(l, c), schoolFn(l, c));
      }
      return;
    }
    case 'set-current': {
      if (!l.placement[e.strand] || c.steps[e.step]?.strand !== e.strand) return;
      endPlacement(l, c, e.strand, e.step, stepList(e.placed), stepList(e.side), e.t, true);
      l.placement[e.strand].overridden = true;
      return;
    }
    case 'mark-placed': case 'unmark-placed': {
      if (!l.placement[e.strand] || c.steps[e.step]?.strand !== e.strand) return;
      const on = e.op === 'mark-placed';
      stepState(l, e.step).placed = on;
      if (on) seedPlacedItems(l, c, e.step, e.t);
      addListed(l.placement[e.strand], [e.step]);
      return;
    }
    case 'school': {
      if (!c.steps[e.step]) return;
      l.school[e.step] = e.on === true;
      return;
    }
    default:
      return;
  }
}

function onImport(l: Learner, e: ImportV2Event, c: Content): void {
  if (typeof e.hash !== 'string' || l.imported.includes(e.hash)) return;
  l.imported.push(e.hash);
  for (const seed of Array.isArray(e.seeds) ? e.seeds : []) {
    if (!c.items[seed.item]) continue;
    const mem = l.items[seed.item];
    if (mem && mem.seen > 0) continue;
    l.items[seed.item] = { box: seed.box === 1 ? 1 : 0, lastT: e.t, lastVisit: 0, seen: 0, firsts: 0, seeded: true, placedInit: false };
  }
}

export function applyLearnEvent(l: Learner, e: EventBase, c: Content): void {
  if (typeof e.t === 'number' && Number.isFinite(e.t)) l.lastT = Math.max(l.lastT, e.t);
  switch (e.type) {
    case 'visit.start': onVisitStart(l, e as VisitStartEvent); return;
    case 'learn.result': onResult(l, e as LearnResultEvent, c); return;
    case 'step.passed': onPassed(l, e as StepPassedEvent, c); return;
    case 'placement.done': onPlacementDone(l, e as PlacementDoneEvent, c); return;
    case 'learn.override': onOverride(l, e as LearnOverrideEvent, c); return;
    case 'import.v2': onImport(l, e as ImportV2Event, c); return;
    default: return;
  }
}

export function foldLearner(events: readonly EventBase[], c: Content, profile?: string): Learner {
  const l = createLearner(c, profile);
  for (const e of events) applyLearnEvent(l, e, c);
  return l;
}

/** The learner as a core slice (contracts C3, C5): init is a fresh learner, apply folds one event in place. */
export function createLearnerSlice(c: Content): { name: 'learner'; version: number; init(): Learner; apply(s: Learner, e: EventBase): Learner } {
  return {
    name: 'learner',
    version: LEARNER_FOLD_VERSION,
    init: () => createLearner(c),
    apply(s: Learner, e: EventBase): Learner {
      applyLearnEvent(s, e, c);
      return s;
    },
  };
}
