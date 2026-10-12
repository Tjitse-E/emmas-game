// G/src/core/learning/placement.ts
// The hidden placement probe (spec 3.5): a bisection over the search list. Her current step is always `lo`.
import type { Content, Profile, StepId, Strand } from '../content/types.ts';
import type { PlacementState, Result } from './types.ts';

export type IsSchool = (step: StepId) => boolean;

export function searchList(c: Content, strand: Strand, isSchool: IsSchool): StepId[] {
  return c.loaded[strand].filter(id => {
    const s = c.steps[id];
    return !s.contrast && !s.display && !isSchool(id);
  });
}

function nearest(c: Content, list: StepId[], id: StepId): StepId {
  if (list.includes(id)) return id;
  const want = c.steps[id]?.index ?? 0;
  return list.find(x => c.steps[x].index >= want) ?? list[list.length - 1];
}

export function initPlacement(c: Content, strand: Strand, profile: Profile, isSchool: IsSchool): PlacementState {
  const start = profile[strand];
  const L = searchList(c, strand, isSchool);
  const p: PlacementState = {
    done: false, lo: L.length ? nearest(c, L, start.lo) : start.lo, hi: L[L.length - 1] ?? start.lo,
    floor: L.length ? nearest(c, L, start.floor) : start.floor,
    loVerified: false, hiFailed: false, openedDown: false, floorMissed: false,
    firstProbe: start.probe && L.length ? nearest(c, L, start.probe) : null,
    lastProbe: null, pending: null, items: 0, current: null, listed: [],
  };
  if (!p.firstProbe) p.done = true;
  return p;
}

export function recordProbe(p: PlacementState, step: StepId, r: Result, c: Content, strand: Strand, isSchool: IsSchool): void {
  if (p.done) return;
  p.items += 1;
  p.lastProbe = step;
  if (!p.pending || p.pending.step !== step) p.pending = { step, r: [] };
  p.pending.r.push(r);
  if (p.pending.r.length < c.budget.placement.itemsPerProbe) return;
  const ok = p.pending.r.every(x => x === 'first');
  p.pending = null;
  const L = searchList(c, strand, isSchool);
  const i = L.indexOf(step), lo = L.indexOf(p.lo), hi = L.indexOf(p.hi);
  if (i < 0) return;
  if (ok) {
    if (i >= lo) { p.lo = step; p.loVerified = true; }
    return;
  }
  if (i <= lo) {
    if (p.loVerified) return;
    const floor = L.indexOf(p.floor);
    if (!p.openedDown && floor >= 0 && floor < lo) {
      p.openedDown = true; p.hi = p.lo; p.hiFailed = true; p.lo = p.floor; p.loVerified = false;
    } else {
      p.floorMissed = true; p.hi = step; p.hiFailed = true;
    }
    return;
  }
  if (i <= hi) { p.hi = step; p.hiFailed = true; }
}

export function nextProbe(p: PlacementState, c: Content, strand: Strand, visitSeq: number, isSchool: IsSchool): StepId | null {
  if (p.done || p.floorMissed) return null;
  if (p.pending) return p.pending.step;
  if (!p.lastProbe) return p.firstProbe;
  const L = searchList(c, strand, isSchool);
  const lo = L.indexOf(p.lo), hi = L.indexOf(p.hi);
  const top = p.hiFailed ? hi - 1 : hi;
  if (top < lo) return null;
  if (top === lo) return p.loVerified ? null : L[lo];
  let target = p.loVerified ? lo + Math.ceil((top - lo) / 2) : lo + Math.floor((top - lo) / 2);
  if (visitSeq <= 1) {
    const last = L.indexOf(p.lastProbe);
    const j = c.budget.placement.visit1MaxJump;
    target = Math.min(Math.max(target, last - j), last + j);
    target = Math.min(Math.max(target, p.loVerified ? lo + 1 : lo), top);
  }
  return L[target];
}

export function placementEnd(p: PlacementState, c: Content, strand: Strand, visitSeq: number, isSchool: IsSchool): StepId | null {
  if (p.done) return null;
  if (p.floorMissed) return p.lo;
  if (p.items >= c.budget.placement.maxItems) return p.lo;
  if (visitSeq > c.budget.placement.maxVisits) return p.lo;
  if (nextProbe(p, c, strand, visitSeq, isSchool) === null) return p.lo;
  return null;
}
