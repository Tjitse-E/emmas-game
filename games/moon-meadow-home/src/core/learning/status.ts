// G/src/core/learning/status.ts
// Read-only views of the learner: step status, the current step, side and school steps, knowledge for the
// naming and task planners, overrides the parent corner writes, and the facts the store must record.
import type { Content, GpcId, ItemId, Profile, StepId, Strand } from '../content/types.ts';
import type { Learner, LearnFact, Payload, SetCurrentOverride } from './types.ts';
import { readyToPass } from './mastery.ts';
import { placementEnd } from './placement.ts';
import type { IsSchool } from './placement.ts';

export type StepStatus = 'passed' | 'placed' | 'display' | 'waiting' | 'side' | 'school' | 'current' | 'ahead';
export type ReadingKnowledge = { gpcs: GpcId[]; items: ItemId[]; pairs: string[]; current: StepId | null; level: 1 | 2 | 3 };
export type SpellingKnowledge = {
  own: GpcId[]; current: StepId | null; currentIndex: number; pairs: string[]; finalVoicedOk: boolean; capitals: boolean; level: 1 | 2 | 3;
};

export const STRANDS: readonly Strand[] = ['r', 's', 'm'];

export function profileOf(l: Learner, c: Content): Profile {
  return c.budget.profiles[l.profile] ?? c.budget.profiles[c.budget.defaultProfile];
}

export function isSchool(l: Learner, c: Content, step: StepId): boolean {
  const o = l.school[step];
  if (o !== undefined) return o;
  return !!c.steps[step]?.school && (profileOf(l, c)?.school ?? []).includes(step);
}

export const schoolFn = (l: Learner, c: Content): IsSchool => (step: StepId) => isSchool(l, c, step);

export function isPlacing(l: Learner, strand: Strand): boolean {
  return !l.placement[strand].done;
}

export function isPassedStep(l: Learner, step: StepId): boolean {
  return l.steps[step]?.passed === true;
}

/**
 * R35: a loaded step that the finished placement (placement.done or set-current) did not list, that is not a
 * contrast, school or display step, and that sits below the placement's current step, counts as placed.
 * It was loaded by a later release. Derived here, so no event is written and a stale snapshot still sees it.
 */
export function placedByRelease(l: Learner, c: Content, step: StepId): boolean {
  const s = c.steps[step];
  if (!s || !s.loaded || s.contrast || s.school || s.display) return false;
  const p = l.placement[s.strand];
  if (!p.done || p.current === null) return false;
  const cur = c.steps[p.current];
  if (!cur || cur.strand !== s.strand || s.index >= cur.index) return false;
  if ((p.listed ?? []).includes(step) || l.side[s.strand].includes(step)) return false;
  return true;
}

export function isPlacedStep(l: Learner, c: Content, step: StepId): boolean {
  return l.steps[step]?.placed === true || placedByRelease(l, c, step);
}

export function currentStep(l: Learner, c: Content, strand: Strand): StepId | null {
  if (isPlacing(l, strand)) return null;
  for (const id of c.loaded[strand]) {
    if (c.steps[id].display) continue;
    if (isPassedStep(l, id) || isPlacedStep(l, c, id)) continue;
    if (l.side[strand].includes(id)) continue;
    if (isSchool(l, c, id)) continue;
    return id;
  }
  return null;
}

export function openSchoolSteps(l: Learner, c: Content, strand: Strand): StepId[] {
  if (isPlacing(l, strand)) return [];
  return c.loaded[strand].filter(id => isSchool(l, c, id) && !isPassedStep(l, id) && !isPlacedStep(l, c, id));
}

export function sideSteps(l: Learner, c: Content, strand: Strand): StepId[] {
  return l.side[strand].filter(id => c.steps[id]?.loaded === true && !isPassedStep(l, id));
}

export function stepStatus(l: Learner, c: Content, step: StepId): StepStatus {
  const s = c.steps[step];
  if (!s) return 'waiting';
  if (isPassedStep(l, step)) return 'passed';
  if (isPlacedStep(l, c, step)) return 'placed';
  if (s.display) return 'display';
  if (!s.loaded) return 'waiting';
  if (l.side[s.strand].includes(step)) return 'side';
  if (isSchool(l, c, step)) return 'school';
  if (currentStep(l, c, s.strand) === step) return 'current';
  return 'ahead';
}

export function knownSteps(l: Learner, c: Content, strand: Strand, served: StepId | null, assumeBelow: boolean): Record<StepId, true> {
  const out: Record<StepId, true> = {};
  for (const id of c.order[strand]) if (isPassedStep(l, id) || isPlacedStep(l, c, id)) out[id] = true;
  const cur = currentStep(l, c, strand);
  if (cur) out[cur] = true;
  for (const id of openSchoolSteps(l, c, strand)) out[id] = true;
  if (served && c.steps[served]?.strand === strand) {
    out[served] = true;
    if (assumeBelow) {
      const at = c.steps[served].index;
      for (const id of c.order[strand]) if (c.steps[id].index <= at) out[id] = true;
    }
  }
  return out;
}

export function pairsAllowed(l: Learner, c: Content, strand: Strand): string[] {
  return Object.values(c.pairs).filter(p => {
    const step = p.unlock[strand];
    return step !== undefined && isPassedStep(l, step);
  }).map(p => p.id);
}

function knownFor(l: Learner, c: Content, strand: Strand, extra: StepId[]): StepId[] {
  const cur = currentStep(l, c, strand);
  return c.order[strand].filter(id =>
    isPassedStep(l, id) || isPlacedStep(l, c, id) || id === cur || extra.includes(id));
}

function graphemesOf(c: Content, steps: StepId[], prefix: 'r:g:' | 's:g:'): { gpcs: GpcId[]; items: ItemId[] } {
  const gpcs: GpcId[] = [];
  const items: ItemId[] = [];
  for (const id of steps) {
    for (const it of c.steps[id].items) {
      if (it.kind !== 'grapheme' || !it.gpc || !it.id.startsWith(prefix)) continue;
      if (!items.includes(it.id)) items.push(it.id);
      if (!gpcs.includes(it.gpc)) gpcs.push(it.gpc);
    }
  }
  return { gpcs, items };
}

function levelAt(l: Learner, step: StepId | null): 1 | 2 | 3 {
  return step === null ? 3 : (l.steps[step]?.level ?? 1);
}

export function readingKnowledge(l: Learner, c: Content): ReadingKnowledge {
  const current = currentStep(l, c, 'r');
  const { gpcs, items } = graphemesOf(c, knownFor(l, c, 'r', []), 'r:g:');
  return { gpcs, items, pairs: pairsAllowed(l, c, 'r'), current, level: levelAt(l, current) };
}

export function spellingKnowledge(l: Learner, c: Content): SpellingKnowledge {
  const current = currentStep(l, c, 's');
  const open = [...sideSteps(l, c, 's'), ...openSchoolSteps(l, c, 's')];
  const { gpcs } = graphemesOf(c, knownFor(l, c, 's', open), 's:g:');
  return {
    own: gpcs,
    current,
    currentIndex: current ? c.steps[current].index : c.order.s.length,
    pairs: pairsAllowed(l, c, 's'),
    finalVoicedOk: isPassedStep(l, 'S06'),
    capitals: isPassedStep(l, 'S11') || current === 'S11',
    level: levelAt(l, current),
  };
}

/** The placed and side lists for a placement that ends at `current`: loaded steps below it that are not passed. */
export function placementLists(l: Learner, c: Content, strand: Strand, current: StepId): { placed: StepId[]; side: StepId[] } {
  const at = c.steps[current]?.index ?? -1;
  const placed: StepId[] = [];
  const side: StepId[] = [];
  for (const id of c.loaded[strand]) {
    const s = c.steps[id];
    if (s.index >= at || isPassedStep(l, id)) continue;
    if (s.contrast) side.push(id);
    else if (s.display || isSchool(l, c, id)) continue;
    else placed.push(id);
  }
  return { placed, side };
}

export function setCurrentOverride(l: Learner, c: Content, strand: Strand, step: StepId): Payload<SetCurrentOverride> {
  return { type: 'learn.override', op: 'set-current', strand, step, ...placementLists(l, c, strand, step) };
}

/** Servable items of a step: an item with no carrier in this build never blocks a pass. */
export function servableItems(c: Content, step: StepId): ItemId[] {
  return (c.steps[step]?.items ?? []).map(it => it.id).filter(id => c.items[id]?.carriers !== 0);
}

/** 1.0.1 (decisions 2026-10-12): her maths moves above bonds to 10, once. */
export const MATHS_LIFT_FROM: readonly StepId[] = ['M09', 'M10', 'M11', 'M12'];
export const MATHS_LIFT_TO: StepId = 'M12A';
export const LIFT_NEW_STEPS: readonly StepId[] = ['M12A', 'M12B', 'M12C', 'M12D', 'M12E', 'M12F'];

/**
 * The maths lift (docs/v3/next/plan.md N9): a year 1 maths placement that ended in M09 to M12 and never measured
 * the 1.0.1 steps is set to M12A, once. Any set-current override (this lift, a parent, a flow) stops it.
 */
export function mathsLift(l: Learner, c: Content): Payload<SetCurrentOverride> | null {
  if (l.profile !== 'year1') return null;
  const p = l.placement.m;
  if (!p?.done || p.overridden === true) return null;
  if (c.steps[MATHS_LIFT_TO]?.loaded !== true) return null;
  // A placement that already measured the new steps keeps what it measured.
  if (LIFT_NEW_STEPS.some(id => (c.steps[id]?.items ?? []).some(it => (l.items[it.id]?.seen ?? 0) > 0))) return null;
  const cur = currentStep(l, c, 'm');
  if (cur === null || !MATHS_LIFT_FROM.includes(cur)) return null;
  return setCurrentOverride(l, c, 'm', MATHS_LIFT_TO);
}

/** The step the re-probe after the lift probes now, or null when no re-probe runs (review 2026-10-13). */
export function reprobeStep(l: Learner, c: Content): StepId | null {
  const rp = l.placement.m?.reprobe;
  if (!rp || rp.closed || rp.landed !== null) return null;
  return c.steps[rp.at]?.loaded === true ? rp.at : null;
}

/** The step after `step` the re-probe climbs to, or null at the top of the 1.0.1 steps. */
export function reprobeNext(l: Learner, c: Content, step: StepId): StepId | null {
  const at = LIFT_NEW_STEPS.indexOf(step);
  if (at < 0) return null;
  for (const id of LIFT_NEW_STEPS.slice(at + 1)) {
    const s = c.steps[id];
    if (s?.loaded && !s.display && !s.contrast && !isSchool(l, c, id)) return id;
  }
  return null;
}

/** The re-probe has found her step: one set-current there, unless it is already her current step. */
export function reprobeLanding(l: Learner, c: Content): Payload<SetCurrentOverride> | null {
  const rp = l.placement.m?.reprobe;
  if (!rp || rp.closed || rp.landed === null) return null;
  if (currentStep(l, c, 'm') === rp.landed) return null;
  return setCurrentOverride(l, c, 'm', rp.landed);
}

/**
 * Facts the fold has discovered. The store records each one once as an event, so a merge never takes them back.
 * The maths lift comes last, or the re-probe's landing after it; these are the only learn.override drafts here,
 * and folding one stops it (placement.overridden, reprobe.closed).
 */
export function pendingLearnFacts(l: Learner, c: Content): LearnFact[] {
  const out: LearnFact[] = [];
  const isSch = schoolFn(l, c);
  for (const strand of STRANDS) {
    const p = l.placement[strand];
    if (!p.done) {
      const end = placementEnd(p, c, strand, l.visit.seq, isSch);
      if (end !== null) out.push({ type: 'placement.done', strand, current: end, ...placementLists(l, c, strand, end) });
    }
    for (const id of c.order[strand]) {
      const st = l.steps[id];
      if (!st || st.passed) continue;
      if (readyToPass(st, servableItems(c, id), l.items, c.steps[id].top, c.budget)) out.push({ type: 'step.passed', strand, step: id });
    }
  }
  const lift = mathsLift(l, c) ?? reprobeLanding(l, c);
  if (lift) out.push(lift);
  return out;
}
