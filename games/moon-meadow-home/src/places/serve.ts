// The planner adapter (Task A1b, R21, R22): the only code in places that knows learning's planner shapes.
// Pure. Places ask for an item by place and slot kind, get a ServedItem with the short names their logic
// plans with ('ai', '-es', '6+4'), and log the planner's own item ids through `learnResultPayload` (R17).
// `src/places/plan.ts` binds this to the store; tests call `createPlaceAdapter` with a hand-made context.
import { graphemeItem } from '../core/keys.ts';
import { nextItem } from '../core/planner/select.ts';
import { learnResultPayload } from '../core/planner/result.ts';
import { isTired, visitStats, wantsLabelBubble } from '../core/planner/visit.ts';
import { currentStep, isPassedStep, isPlacedStep, isPlacing } from '../core/learning/status.ts';
import type { Content, Item, MomentKind, WordTag } from '../core/content/types.ts';
import type { Learner } from '../core/learning/types.ts';
import type { Carrier, ItemRequest, MathsTask, Pick as PlanPick, PlanContext } from '../core/planner/types.ts';
import type { ErrorTag, ItemResult, LearnerView, Result, Rng, ServedItem, StepId, Strand, WordView } from '../core/places/types.ts';
import type { PlaceAction } from '../core/places/actions.ts';
import type { PartAsk } from '../core/places/building.ts';
import { askAccepts } from '../core/places/building.ts';
import type { VisitRec } from '../core/places/state.ts';

export type PlannerMaths = MathsTask;
export type PlannerCarrier = Carrier;
export type PlannerPick = PlanPick;
export type PlannerItem = Pick<Item, 'id' | 'kind'> & Partial<Pick<Item, 'gpc' | 'ending' | 'affix' | 'pattern' | 'word'>>;

// ---- what each place slot asks the planner for (R22)

export type SlotRequest = { strand: Strand; moments: MomentKind[]; tags?: WordTag[] };

/** Place slot kinds to learning moment kinds. Meadow wishes, asking bubbles and two-state wishes are heartbeat's (R9). */
export const SLOT_REQUESTS: Record<string, SlotRequest> = {
  'toy-shelf/label': { strand: 's', moments: ['label', 'label-plural'] },
  'bath-pond/pond-word': { strand: 'r', moments: ['one-or-many', 'bath-wish'], tags: ['bath'] },
  'building/sum': { strand: 'm', moments: ['wall'] },
  'building/pattern': { strand: 'm', moments: ['trim'] },
  'building/sign': { strand: 's', moments: ['label'] },
  'post-box/sum': { strand: 'm', moments: ['post-sash'] },
  'post-box/fewest': { strand: 'm', moments: ['post-pin'] },
  'post-box/missing': { strand: 'm', moments: ['parcel'] },
  'post-box/note': { strand: 's', moments: ['note'] },
  'salon/salon-word': { strand: 'r', moments: ['salon-card'] },
  'salon/pattern': { strand: 'm', moments: ['beads'] },
  'letter-lane/letters': { strand: 's', moments: ['letter-order'] },
};

export function requestFor(place: string, kind: string): ItemRequest | null {
  const r = SLOT_REQUESTS[`${place}/${kind}`];
  return r ? { strand: r.strand, moments: [...r.moments], place, ...(r.tags ? { tags: [...r.tags] } : {}) } : null;
}

/** The planner request of one Building Day part ask (R38): the part's moments, the veto for its slot. */
export function requestForAsk(ask: PartAsk, place: string): ItemRequest {
  return { strand: ask.strand, moments: [...ask.moments], place, accept: askAccepts(ask) };
}

// ---- short names

/** Maths tasks as the carriers place code reads: '6+4' (a wall or a sash), 'fewest', a pattern unit. */
export function mathsCarrier(t: MathsTask): string | null {
  switch (t.op) {
    case 'pair': case 'add': return `${t.a}+${t.b}`;
    case 'missing': return `${t.part}+${t.whole - t.part}`;
    case 'compare': return t.want === 'fewest' ? 'fewest' : null;
    case 'pattern': return t.unit;
    default: return null;
  }
}

const MARKS: Record<string, string> = { stop: '.', '.': '.', q: '?', '?': '?', bang: '!', '!': '!' };

/** A planner item as place logic names it. */
export function canonicalItem(it: PlannerItem | undefined, gpcText: (id: string) => string): string | null {
  if (!it) return null;
  switch (it.kind) {
    case 'grapheme': return it.gpc ? gpcText(it.gpc) : null;
    case 'ending': return it.ending === 'none' ? 'none' : it.ending ? `-${it.ending}` : null;
    case 'mark': {
      const p = it.pattern ?? it.id.split(':').pop() ?? '';
      return MARKS[p] ? `mark-${MARKS[p]}` : null;
    }
    case 'capital': return 'capital-start';
    case 'and': return 'and';
    case 'sentence': return 'card-order';
    case 'tricky': return it.word ?? null;
    case 'prefix': return it.affix === 'un' ? 'un' : null;
    case 'letter': return it.pattern ?? null;
    case 'adjective': return 'adjective';
    default: return it.id;
  }
}

const KIND: Record<string, ServedItem['kind']> = {
  current: 'current', school: 'school', side: 'side', review: 'review', mixed: 'mixed', probe: 'current', warmup: 'current', golden: 'current',
};

export type ServeDeps = { item(id: string): PlannerItem | undefined; gpcText(id: string): string; plural(word: string): 's' | 'es' | null; rng: Rng };

/** A planner pick as a ServedItem. Null for names, for no pick and for carriers places cannot show. */
export function toServed(p: PlannerPick | null, deps: ServeDeps, place?: string): ServedItem | null {
  if (!p || p.strand === 'name' || !p.step) return null;
  const c = p.carrier;
  let items = p.items.map((id) => canonicalItem(deps.item(id), deps.gpcText) ?? id);
  let carrier: string | null = null;
  let count: number | undefined;
  switch (c.kind) {
    case 'word': carrier = c.word; break;
    case 'plural': {
      carrier = c.word;
      count = c.count;
      const ending = deps.plural(c.word);
      if (c.form === 'many' && ending) items = [`-${ending}`];
      else items = p.step === 'S10' && ending ? [`-${ending}`] : ['none'];   // decision D11: a jar of one logs the word's ending
      break;
    }
    case 'maths': carrier = mathsCarrier(c.task); if (carrier) items = [carrier]; break;
    case 'phrase': carrier = c.phrase; break;
    case 'letters': carrier = c.letters.join(''); break;
    case 'spell': carrier = c.focus.join('+'); break;
    default: carrier = null;
  }
  if (carrier === null) return null;
  if (p.step === 'R37' && items[0] === 'un' && deps.rng() < 0.5) items = ['base'];
  return {
    strand: p.strand, step: p.step, items, carrier, scaffold: p.scaffold, probe: p.probe, kind: KIND[p.slot] ?? 'current', log: p.items,
    ...(count !== undefined ? { count } : {}),
    pick: p,
    ...(place !== undefined ? { place } : {}),
  };
}

// ---- logging (R17)

/**
 * The item results to log. `mine` holds place results under short names ('f', '-es'); each becomes the
 * planner's id (the served item's own short name maps to its log id, a grapheme through `toId`). Planner ids
 * no slot covered take the moment result. Without planner ids (unit tests) `mine` is returned as it is.
 */
export function logItems(served: ServedItem, mine: ItemResult[], result: Result, toId: (text: string) => string | null): ItemResult[] {
  if (!served.log) return mine;
  const own = new Map<string, string>();
  if (served.items.length === served.log.length) served.items.forEach((s, k) => own.set(s, served.log![k]));
  const out = new Map<string, Result>();
  for (const m of mine) {
    const id = own.get(m.id) ?? toId(m.id);
    if (id) out.set(id, m.r);
  }
  for (const id of served.log) if (!out.has(id)) out.set(id, result);
  return [...out].map(([id, r]) => ({ id, r }));
}

/** Maps a grapheme text of the served carrier word to its item id ('o' in 'fox' is 's:g:o'). */
export function graphemeToId(c: Content, served: Pick<ServedItem, 'strand' | 'carrier'>): (text: string) => string | null {
  if (served.strand === 'm') return () => null;
  const strand = served.strand;
  const w = c.words[served.carrier];
  const gpcs = w ? w.gpcs : [];
  return (text) => {
    const g = gpcs.find((id) => c.gpcs[id]?.text === text)
      ?? Object.values(c.gpcs).find((x) => x.text === text && c.items[graphemeItem(strand, x.id)] !== undefined)?.id;
    if (!g) return null;
    const id = graphemeItem(strand, g);
    return c.items[id] ? id : null;
  };
}

export type PlaceOutcome = { result: Result; ms: number | null; error?: ErrorTag | null; place?: string };

/** The `place/learn` action of any pick (sign slots, review picks) with the planner ids already in `slots`. */
export function learnAction(pick: PlanPick, o: PlaceOutcome & { place: string; slots?: ItemResult[] }, baby: string | null): PlaceAction {
  return { type: 'place/learn', payload: learnResultPayload(pick, { result: o.result, ms: o.ms, place: o.place, error: o.error ?? null, ...(o.slots ? { slots: o.slots } : {}) }), baby };
}

/** The `place/learn` action of a served moment. Null when the item did not come from the planner (nothing to log). */
export function resultAction(served: ServedItem, mine: ItemResult[], o: PlaceOutcome, baby: string | null, toId: (text: string) => string | null): PlaceAction | null {
  if (!served.pick) return null;
  const place = o.place ?? served.place ?? 'meadow';
  return learnAction(served.pick, { ...o, place, slots: logItems(served, mine, o.result, toId) }, baby);
}

// ---- the learner as place logic reads it

/** Places' LearnerView over learning's slice. `visits` dates each pass to the visit it happened in. */
export function toLearnerView(l: Learner, c: Content, visits: readonly VisitRec[] = []): LearnerView {
  const strands: Strand[] = ['r', 's', 'm'];
  const current = Object.fromEntries(strands.map((s) => [s, currentStep(l, c, s)])) as Record<Strand, StepId | null>;
  const visitAt = (t: number): string => {
    let id = '';
    for (const v of visits) if (v.start <= t) id = v.id;
    return id;
  };
  const passed: LearnerView['passed'] = [];
  const placed: LearnerView['placed'] = [];
  for (const [step, st] of Object.entries(c.steps)) {
    if (isPassedStep(l, step)) {
      const t = l.steps[step]?.passedT ?? 0;
      passed.push({ step, strand: st.strand, t, visit: visitAt(t) });
    } else if (isPlacedStep(l, c, step)) placed.push({ step, strand: st.strand });
  }
  const passedOrPlaced = (step: StepId) => isPassedStep(l, step) || isPlacedStep(l, c, step);
  return {
    current, passed, placed,
    placementEnded: { r: !isPlacing(l, 'r'), s: !isPlacing(l, 's'), m: !isPlacing(l, 'm') },
    reached(step) {
      if (passedOrPlaced(step)) return true;
      const st = c.steps[step];
      const cur = st ? current[st.strand] : null;
      return !!st && cur !== null && st.index <= (c.steps[cur]?.index ?? -1);
    },
    scaffold: (_strand, step) => l.steps[step]?.level ?? 1,
    passedOrPlaced,
  };
}

// ---- the adapter over a plan context

export type AdapterSource = { ctx(): PlanContext; rng(): Rng; visits?(): readonly VisitRec[] };

export function contentDeps(c: Content, rng: Rng): ServeDeps {
  return {
    item: (id) => c.items[id],
    gpcText: (id) => c.gpcs[id]?.text ?? id,
    plural: (w) => c.words[w]?.plural?.ending ?? null,
    rng,
  };
}

/** Deterministic rng for a look ahead, so `canServeSlot` never moves the game's random sequence. */
function peekRng(): Rng {
  let a = 12345;
  return () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
}

export function createPlaceAdapter(src: AdapterSource) {
  const deps = (ctx: PlanContext) => contentDeps(ctx.c, src.rng());
  const run = (req: ItemRequest | null, strand?: Strand): ServedItem | null => {
    if (!req || (strand !== undefined && req.strand !== strand)) return null;
    const ctx = src.ctx();
    return toServed(nextItem(ctx, req, src.rng()), deps(ctx), req.place);
  };
  return {
    serve: (strand: Strand, place: string, kind: string): ServedItem | null => run(requestFor(place, kind), strand),
    /** One Building Day part ask (R38). */
    serveAsk: (ask: PartAsk, place = 'building-day'): ServedItem | null => run(requestForAsk(ask, place)),
    canServeSlot(place: string, kind: string): boolean {
      const req = requestFor(place, kind);
      return req ? nextItem(src.ctx(), req, peekRng()) !== null : false;
    },
    visitPlan(): { practised: Record<Strand, number>; moments: number; labelForced: boolean } {
      const { c, l } = src.ctx();
      const v = visitStats(l);
      return { practised: { r: v.r, s: v.s, m: v.m }, moments: isTired(l, c) ? Math.max(30, v.total) : v.total, labelForced: wantsLabelBubble(l, c) };
    },
    spellStepNow(): string | null {
      const { c, l } = src.ctx();
      return currentStep(l, c, 's');
    },
    wordViews(): WordView[] {
      const { c } = src.ctx();
      const text = (g: string) => c.gpcs[g]?.text ?? g;
      return Object.values(c.words).map((w) => ({
        id: w.w, word: w.w, graphemes: w.gpcs.map(text), picture: w.pic ?? '', rStep: w.rStep ?? '', sStep: w.sStep ?? '', tags: [...(w.tags ?? [])],
        ...(w.plural ? { plural: { word: w.plural.w, ending: w.plural.ending, graphemes: [...w.gpcs.map(text), w.plural.ending] } } : {}),
      }));
    },
    learnerView(): LearnerView {
      const { c, l } = src.ctx();
      return toLearnerView(l, c, src.visits?.() ?? []);
    },
    logFor(served: ServedItem, mine: ItemResult[], result: Result): ItemResult[] {
      return logItems(served, mine, result, graphemeToId(src.ctx().c, served));
    },
    resultAction(served: ServedItem, mine: ItemResult[], o: PlaceOutcome, baby: string | null = null): PlaceAction | null {
      return resultAction(served, mine, o, baby, graphemeToId(src.ctx().c, served));
    },
  };
}
export type PlaceAdapter = ReturnType<typeof createPlaceAdapter>;
