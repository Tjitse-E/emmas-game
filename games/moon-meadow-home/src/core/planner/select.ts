// G/src/core/planner/select.ts
// nextItem (spec 3.5, 3.6): the placement probe, the 50/30/20 slot mix, the new-item and visit caps,
// the school share and the fallbacks. Returns null when nothing is servable; never throws on content gaps.
import type { ItemId, MomentKind, StepId } from '../content/types.ts';
import { newMemory, dueAt, isDue } from '../learning/leitner.ts';
import { nextProbe, searchList } from '../learning/placement.ts';
import {
  currentStep, isPassedStep, isPlacedStep, isPlacing, openSchoolSteps, schoolFn, sideSteps,
} from '../learning/status.ts';
import { localDay } from '../learning/time.ts';
import type { Slot } from '../learning/types.ts';
import type { Rng } from '../rng.ts';
import { shuffle } from '../rng.ts';
import { carrierChoices, newCarrierCache, type CarrierCache } from './carriers.ts';
import type { ItemRequest, Pick, PlanContext } from './types.ts';

/** R36: the display step whose tricky word ('the') is printed before a wish word once it is loaded. */
const DISPLAY_THE_STEP = 'R06';
const DISPLAY_THE_WORD = 'the';
const REVIEW_TRIES = 40;

type Session = {
  ctx: PlanContext;
  req: ItemRequest;
  rng: Rng;
  moments: MomentKind[];
  cache: CarrierCache;
};

const clampLevel = (n: number, top: 1 | 2 | 3): 1 | 2 | 3 => Math.max(1, Math.min(n, top)) as 1 | 2 | 3;

function scaffoldFor(s: Session, step: StepId, learned: boolean): 1 | 2 | 3 {
  const top = s.ctx.c.steps[step]?.top ?? 3;
  const forced = s.ctx.testScaffold?.[step];
  if (forced !== undefined) return clampLevel(forced, top);
  return learned ? clampLevel(s.ctx.l.steps[step]?.level ?? 1, top) : top;
}

/** The moments this request can host for a step. Station wishes only review a passed or placed step (R34). */
function stepMoments(s: Session, step: StepId, allowStation: boolean): MomentKind[] {
  const st = s.ctx.c.steps[step];
  if (!st || !st.loaded) return [];
  return st.moments.filter(m => s.moments.includes(m) && (allowStation || m !== 'station-wish'));
}

function withDisplay(s: Session, p: Pick): Pick {
  const { c, assets } = s.ctx;
  if (p.moment !== 'wish' || p.carrier.kind !== 'word') return p;
  if (c.words[p.carrier.word]?.kind !== 'thing') return p;
  if (c.steps[DISPLAY_THE_STEP]?.loaded !== true) return p;
  const the = c.words[DISPLAY_THE_WORD];
  if (!the || !assets.clip(the.clip)) return p;
  return s.rng() < 0.5 ? { ...p, display: [DISPLAY_THE_WORD] } : p;
}

function tryItem(
  s: Session, step: StepId, item: ItemId, slot: Slot, scaffold: 1 | 2 | 3, probe: boolean, allowStation: boolean, assumeBelow: boolean,
): Pick | null {
  const ms = stepMoments(s, step, allowStation);
  for (const moment of shuffle(ms, s.rng)) {
    const choices = carrierChoices(s.ctx, step, item, moment, scaffold, s.rng, s.req, assumeBelow, s.cache);
    for (const ch of choices) {
      if (ch.items.length === 0) continue;
      let p: Pick = {
        strand: s.req.strand, step, slot, moment, items: ch.items, carrier: ch.carrier, scaffold, probe,
        ...(ch.pair !== undefined ? { pair: ch.pair } : {}),
      };
      p = withDisplay(s, p);
      if (!s.req.accept || s.req.accept(p)) return p;
    }
  }
  return null;
}

const stepItems = (s: Session, step: StepId): ItemId[] =>
  (s.ctx.c.steps[step]?.items ?? []).map(it => it.id).filter(id => s.ctx.c.items[id] !== undefined);

const boxOf = (s: Session, id: ItemId): number => s.ctx.l.items[id]?.box ?? 0;

function isNewItem(s: Session, id: ItemId): boolean {
  const m = s.ctx.l.items[id];
  return !m || (m.seen === 0 && !m.seeded && !m.placedInit);
}

/** The 3-new-items-a-day cap, on the local day of the visit's time zone. */
function newAllowed(s: Session, id: ItemId): boolean {
  if (!isNewItem(s, id)) return true;
  const { l, c, now } = s.ctx;
  const nt = l.newToday[s.req.strand];
  const ids = nt.day === localDay(now, l.visit.tz) ? nt.ids : [];
  return ids.includes(id) || ids.length < c.budget.newPerStrandPerDay;
}

// ---- placement

function placingPick(s: Session): Pick | null {
  const { c, l } = s.ctx;
  const strand = s.req.strand;
  const p = l.placement[strand];
  const isSch = schoolFn(l, c);
  const probe = nextProbe(p, c, strand, l.visit.seq, isSch);
  if (probe !== null) {
    for (const id of shuffle(stepItems(s, probe), s.rng)) {
      const pick = tryItem(s, probe, id, 'probe', scaffoldFor(s, probe, false), true, false, true);
      if (pick) return pick;
    }
  }
  const list = searchList(c, strand, isSch);
  const from = probe !== null ? list.indexOf(probe) - 1 : list.indexOf(p.lo);
  for (let i = Math.min(from, list.length - 1); i >= 0; i--) {
    const step = list[i];
    if (stepMoments(s, step, false).length === 0) continue;
    for (const id of shuffle(stepItems(s, step), s.rng)) {
      const pick = tryItem(s, step, id, 'warmup', scaffoldFor(s, step, false), false, false, true);
      if (pick) return pick;
    }
  }
  return null;
}

// ---- slots

function serveStep(s: Session, step: StepId, slot: Slot, minBox: number): Pick | null {
  const { l, c, now } = s.ctx;
  const b = c.budget;
  const items = stepItems(s, step);
  const order = new Map(items.map((id, i) => [id, i]));
  const ok = items.filter(id => boxOf(s, id) >= minBox && newAllowed(s, id));
  const rank = (id: ItemId) => {
    const m = l.items[id];
    return m && m.box === 0 && isDue(id, m, now, l.visit, b) ? 0 : 1;
  };
  const last = (id: ItemId) => l.items[id]?.lastT ?? -Infinity;
  ok.sort((x, y) => rank(x) - rank(y) || last(x) - last(y) || (order.get(x) ?? 0) - (order.get(y) ?? 0));
  const none = ok.indexOf('r:end:none');
  if (none >= 0) {
    ok.splice(none, 1);
    if (s.rng() < b.oneShare) ok.unshift('r:end:none');
    else ok.push('r:end:none');
  }
  for (const id of ok) {
    const p = tryItem(s, step, id, slot, scaffoldFor(s, step, true), false, false, false);
    if (p) return p;
  }
  return null;
}

function currentPick(s: Session, minBox: number): Pick | null {
  const { l, c } = s.ctx;
  const strand = s.req.strand;
  for (const step of openSchoolSteps(l, c, strand)) {
    if (stepMoments(s, step, false).length === 0) continue;
    const p = serveStep(s, step, 'school', minBox);
    if (p) return p;
  }
  const cur = currentStep(l, c, strand);
  if (cur && stepMoments(s, cur, false).length > 0) return serveStep(s, cur, 'current', minBox);
  return null;
}

/** Loaded steps of the strand that are passed or placed and not a side step. */
function reviewSteps(s: Session): StepId[] {
  const { l, c } = s.ctx;
  const strand = s.req.strand;
  return c.loaded[strand].filter(id => (isPassedStep(l, id) || isPlacedStep(l, c, id)) && !l.side[strand].includes(id));
}

function reviewPick(s: Session, minBox: number): Pick | null {
  const { l, c, now } = s.ctx;
  const b = c.budget;
  const due: { id: ItemId; step: StepId; at: number }[] = [];
  const reopened: { id: ItemId; step: StepId; at: number }[] = [];
  for (const step of reviewSteps(s)) {
    if (stepMoments(s, step, true).length === 0) continue;
    const reop = l.steps[step]?.reopened === true;
    for (const id of stepItems(s, step)) {
      const m = l.items[id] ?? newMemory();
      if (m.box < minBox) continue;
      if (isDue(id, m, now, l.visit, b)) due.push({ id, step, at: dueAt(m, b) });
      else if (reop) reopened.push({ id, step, at: m.lastT });
    }
  }
  due.sort((x, y) => x.at - y.at);
  reopened.sort((x, y) => x.at - y.at);
  let order = due;
  if (reopened.length > 0) {
    const first = s.rng() < b.reopenWeight / (b.reopenWeight + 1);
    order = first ? [...reopened, ...due] : [...due, ...reopened];
  }
  for (const x of order.slice(0, REVIEW_TRIES)) {
    const p = tryItem(s, x.step, x.id, 'review', scaffoldFor(s, x.step, false), false, true, false);
    if (p) return p;
  }
  return null;
}

function mixedPick(s: Session, minBox: number): Pick | null {
  const { l, c } = s.ctx;
  const side = sideSteps(l, c, s.req.strand);
  const steps = [
    ...reviewSteps(s).map(step => ({ step, side: false })),
    ...side.map(step => ({ step, side: true })),
  ].filter(x => stepMoments(s, x.step, !x.side).length > 0);
  for (const { step, side: isSide } of shuffle(steps, s.rng)) {
    const items = stepItems(s, step).filter(id => boxOf(s, id) >= minBox && (!isSide || newAllowed(s, id)));
    for (const id of shuffle(items, s.rng)) {
      const p = isSide
        ? tryItem(s, step, id, 'side', scaffoldFor(s, step, true), false, false, false)
        : tryItem(s, step, id, 'mixed', scaffoldFor(s, step, false), false, true, false);
      if (p) return p;
    }
  }
  return null;
}

export function nextItem(ctx: PlanContext, req: ItemRequest, rng: Rng): Pick | null {
  const { c, l } = ctx;
  const strand = req.strand;
  const moments = req.moments.filter(m => c.moments[m]?.loaded === true && c.moments[m].strand === strand);
  if (moments.length === 0) return null;
  const s: Session = { ctx, req, rng, moments, cache: newCarrierCache() };
  if (isPlacing(l, strand)) return placingPick(s);

  const b = c.budget;
  const counts = l.visit.counts;
  const total = counts.r + counts.s + counts.m + counts.name;
  const tired = total >= b.visitCap;
  const eggOnly = moments.every(m => c.moments[m]?.egg !== undefined);
  const capped = counts[strand] >= b.strandVisitCap;
  const minBox = tired && eggOnly ? b.tiredEggMinBox : capped ? 1 : 0;
  const reviewOnly = tired && (eggOnly || req.firstWish === true);

  type Kind = 'current' | 'review' | 'mixed';
  let order: Kind[];
  if (reviewOnly) order = ['review', 'mixed'];
  else {
    const x = rng();
    if (x < b.share.current) order = ['current', 'review', 'mixed'];
    else if (x < b.share.current + b.share.review) order = ['review', 'current', 'mixed'];
    else order = ['mixed', 'current', 'review'];
  }
  for (const k of order) {
    const p = k === 'current' ? currentPick(s, minBox) : k === 'review' ? reviewPick(s, minBox) : mixedPick(s, minBox);
    if (p) return p;
  }
  return null;
}
