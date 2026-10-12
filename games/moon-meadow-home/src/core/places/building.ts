// Building Days and plots (Task A12): stable rows, parts, ready plots, and the wall, trim and sign tasks.
// Rows built come from core's herd slice through world.rowsBuilt (R26); places never counts them itself.
// Each learning part asks for its strand's current item plus one review item, and for the items of a step
// that passed in this visit instead of the current step (R38, spec 2.4 "Building Days").
import type { ItemResult, LearnerView, Result, Rng, ServedItem, StepId, Strand } from './types.ts';
import type { MomentKind, Pick as PlanPick, Slot } from '../../types/contracts.ts';
import type { PlacesState } from './state.ts';
import { graphemeItem } from '../keys.ts';
import { plotDefs, released, rowDef } from './content.ts';

export type SignDef = { word: string; graphemes: string[]; clip: string; gifts?: number[] };
export type PlotDef = {
  id: string; area: 'meadow' | 'stable-yard' | 'village-lane' | 'castle-hill' | 'sky'; kind: 'herd' | 'place' | 'jewel';
  herd?: number; stones?: number; key?: string; release: string; breed?: string; sign?: SignDef; picture: string;
  map: number[]; opening?: string; lumi?: string;
};
export type RowDef = { fullUntil: number; lumi: string; picture: string; sign: SignDef };
/** Parts a Building Day can have. The contract event `building.part` logs all but `row-name` (that is `row.named`). */
export type PartId = 'walls' | 'trim' | 'sign' | 'ribbon' | 'circle' | 'row-name';

const ROW_SIZE = 10;

// ---- rows (R26)

export const rowPlotId = (row: number): string => `row-${row}`;

export function rowOfPlot(plot: string): number | null {
  const m = /^row-(\d+)$/.exec(plot);
  return m ? Number(m[1]) : null;
}

/** Rows a herd of this size has earned: row 1 from the start, one more at every ten babies. */
export const rowsEarned = (herd: number): number => 1 + Math.floor(herd / ROW_SIZE);

/**
 * The next row to build, one at a time (Review Focus 1). `rowsBuilt` is `world.rowsBuilt` (core's
 * `rowCount`, which counts imported rows as built). Null when no row is earned beyond those built.
 */
export function nextRow(s: PlacesState, rowsBuilt: number): number | null {
  const k = Math.max(1, rowsBuilt) + 1;
  return k <= rowsEarned(s.herd) ? k : null;
}

// ---- parts

export function partsFor(plot: string): PartId[] {
  const row = rowOfPlot(plot);
  if (row === null) return ['walls', 'trim', 'sign', 'ribbon', 'circle'];
  return row <= rowDef.fullUntil ? ['walls', 'trim', 'sign', 'ribbon', 'circle', 'row-name'] : ['walls', 'row-name'];
}

/** Parts already finished on this plot. A row's name part is done once the row has a name. */
export function partsDone(s: PlacesState, plot: string): PartId[] {
  const done = [...(s.buildings[plot]?.parts ?? [])] as PartId[];
  const row = rowOfPlot(plot);
  if (row !== null && s.rowNames[String(row)] !== undefined) done.push('row-name');
  return done;
}

/** The part to play next. Finished parts stay finished when she leaves halfway (Review Focus 3). */
export function nextPart(plot: string, done: readonly string[]): PartId | null {
  return partsFor(plot).find((p) => !done.includes(p)) ?? null;
}

// ---- plots

export function litStones(s: PlacesState, plot: string): string[] {
  return Object.entries(s.jewels).filter(([, p]) => p === plot).map(([step]) => step);
}

/**
 * Plots with a Building Day waiting: herd plots that are earned, announced and released; the next stable
 * row; jewel plots of this release with every stone lit. Built plots never come back.
 */
export function readyPlots(c: { s: PlacesState; release: string; rowsBuilt: number; plots?: readonly PlotDef[] }): string[] {
  const { s } = c;
  const plots = c.plots ?? plotDefs;
  const open = (p: PlotDef) => released(p.release, c.release) && !s.buildings[p.id]?.done;
  const out: string[] = [];
  for (const p of plots) {
    if (p.kind === 'herd' && open(p) && s.herd >= (p.herd ?? 0) && p.opening !== undefined && p.opening in s.announced) out.push(p.id);
  }
  const row = nextRow(s, c.rowsBuilt);
  if (row !== null) out.push(rowPlotId(row));
  for (const p of plots) {
    if (p.kind === 'jewel' && open(p) && litStones(s, p.id).length >= (p.stones ?? 0)) out.push(p.id);
  }
  return out;
}

// ---- what each part asks the planner for (R38)

/**
 * One planner request of a part. `want: 'current'` is her current (or school or side) step;
 * `want: 'review'` any passed or placed step; `want: 'passed'` the items of `step`, which passed in this visit.
 * The adapter (Task A1b) turns it into an `ItemRequest` with `accept: askAccepts(ask)`.
 */
export type PartAsk = { part: PartId; strand: Strand; moments: MomentKind[]; want: 'current' | 'review' | 'passed'; step: StepId | null };

/**
 * Planner moments per learning part. The sign part asks only for its current item (a small picture sign,
 * moment `label`); its review moment is the building's own name sign, checked slot by slot (`signTask`).
 */
export const PART_MOMENTS: Partial<Record<PartId, { strand: Strand; moments: MomentKind[]; review: boolean }>> = {
  walls: { strand: 'm', moments: ['wall'], review: true },
  trim: { strand: 'm', moments: ['trim'], review: true },
  sign: { strand: 's', moments: ['label'], review: false },
};

/** The step of this strand that passed most recently in this visit, if any. */
export function passedThisVisit(l: LearnerView, strand: Strand, visit: string | null): StepId | null {
  if (visit === null) return null;
  const hits = l.passed.filter((p) => p.strand === strand && p.visit === visit);
  if (!hits.length) return null;
  return hits.reduce((a, b) => (b.t >= a.t ? b : a)).step;
}

export function partAsks(part: PartId, l: LearnerView, visit: string | null): PartAsk[] {
  const def = PART_MOMENTS[part];
  if (!def) return [];
  const fresh = passedThisVisit(l, def.strand, visit);
  const first: PartAsk = fresh !== null
    ? { part, strand: def.strand, moments: [...def.moments], want: 'passed', step: fresh }
    : { part, strand: def.strand, moments: [...def.moments], want: 'current', step: l.current[def.strand] };
  if (!def.review) return [first];
  return [first, { part, strand: def.strand, moments: [...def.moments], want: 'review', step: null }];
}

const REVIEW_SLOTS: ReadonlySet<Slot> = new Set(['review', 'mixed']);

/** The veto the adapter passes as `ItemRequest.accept`, so the planner serves the slot the part asked for. */
export function askAccepts(ask: PartAsk): (p: PlanPick) => boolean {
  if (ask.want === 'passed') return (p) => p.step === ask.step;
  if (ask.want === 'review') return (p) => REVIEW_SLOTS.has(p.slot);
  return (p) => !REVIEW_SLOTS.has(p.slot);
}

// ---- walls (decision D7)

export type WallTask = { total: number; up: number; answer: number; served: ServedItem | null };

/** An `a+b` fact from the planner: the wall needs `a+b` planks and `a` are up. Otherwise a free wall of ten. */
export function wallTask(item: ServedItem | null, rng: Rng): WallTask {
  const m = item ? /^(\d+)\+(\d+)$/.exec(item.carrier) : null;
  if (item && m) {
    const a = Number(m[1]); const b = Number(m[2]);
    if (a >= 1 && b >= 1 && a + b <= 10) return { total: a + b, up: a, answer: b, served: item };
  }
  const up = 1 + Math.floor(rng() * 9);
  return { total: 10, up, answer: 10 - up, served: null };
}

export function wallOutcome(t: WallTask, dropped: number): { kind: 'done' | 'gap' | 'wobble'; diff: number } {
  if (dropped === t.answer) return { kind: 'done', diff: 0 };
  return dropped < t.answer ? { kind: 'gap', diff: t.answer - dropped } : { kind: 'wobble', diff: dropped - t.answer };
}

function shuffle<T>(a: readonly T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** Three or four different plank stacks from 1 to 9, the answer among them. */
export function wallStones(t: WallTask, rng: Rng): number[] {
  const set = new Set<number>([t.answer]);
  for (const v of [t.answer + 1, t.answer - 1, t.up, t.answer + 2, t.answer - 2, t.answer + 3, t.answer - 3]) {
    if (v >= 1 && v <= 9) set.add(v);
  }
  return shuffle([...set].slice(0, 4), rng);
}

/** "The wall needs ten planks." then "Six are up." (audio's number line `num-up-<n>`). */
export const wallLines = (t: WallTask): string[] => [`bd-needs-${t.total}`, `num-up-${t.up}`];
/** A gap: "Three more, please!" (`num-more-<n>`). A wobble: "Two too many." (`num-over-<n>`). */
export const wallMistakeLines = (o: { kind: 'gap' | 'wobble'; diff: number }): string[] =>
  (o.kind === 'gap' ? [`num-more-${o.diff}`] : [`num-over-${o.diff}`]);

// ---- trim

export type TrimTask = { checked: false; colours: string[] } | { checked: true; shown: string[]; answer: string; options: string[]; served: ServedItem };
export const BEAD_COLOURS: readonly string[] = ['pink', 'blue', 'gold', 'green', 'purple'];

/** A pattern to continue when the maths queue served an M08 pattern (`AB`, `ABB`, `ABC`, `AAB`); else free colours. */
export function trimTask(item: ServedItem | null, rng: Rng): TrimTask {
  const pattern = item?.carrier ?? '';
  if (!item || !/^[ABC]{2,3}$/.test(pattern) || new Set(pattern).size < 2) return { checked: false, colours: [...BEAD_COLOURS] };
  const letters = [...new Set(pattern.split(''))];
  const pick = shuffle(BEAD_COLOURS, rng);
  const colourOf: Record<string, string> = Object.fromEntries(letters.map((l, i) => [l, pick[i]]));
  const len = pattern.length * 2 + 1;
  const seq = Array.from({ length: len + 1 }, (_, i) => colourOf[pattern[i % pattern.length]]);
  const shown = seq.slice(0, len);
  const answer = seq[len];
  const others = pick.filter((c) => c !== answer);
  const distractors = [...new Set([...shown.filter((c) => c !== answer), ...others])].slice(0, 2);
  return { checked: true, shown, answer, options: shuffle([answer, ...distractors], rng), served: item };
}

// ---- sign (R38, replaces decision D9)

export function signFor(plot: string): SignDef {
  if (rowOfPlot(plot) !== null) return rowDef.sign;
  const def = plotDefs.find((p) => p.id === plot);
  if (!def?.sign) throw new Error(`no sign for ${plot}`);
  return def.sign;
}

/** One slot of the name sign. `slot` null: a gift gem she places but that is not checked. */
export type SignSlot = { index: number; grapheme: string; step: StepId | null; slot: 'review' | 'mixed' | null };
export type SignTask = { sign: SignDef; slots: SignSlot[]; own: boolean[]; checked: boolean };

/**
 * The building's name sign. `steps[i]` is the spelling step of grapheme i (from content; null when none).
 * A slot is checked when its step is passed (`review`) or placed (`mixed`); every other slot, and every
 * listed gift (a grapheme that does not make its usual sound), is given. Never `current` (R38).
 */
export function signTask(sign: SignDef, steps: readonly (StepId | null)[], l: Pick<LearnerView, 'passed' | 'placed'>): SignTask {
  const passed = new Set(l.passed.map((p) => p.step));
  const placed = new Set(l.placed.map((p) => p.step));
  const slots = sign.graphemes.map((grapheme, index): SignSlot => {
    const step = steps[index] ?? null;
    let slot: SignSlot['slot'] = null;
    if (step !== null && !(sign.gifts ?? []).includes(index)) slot = passed.has(step) ? 'review' : placed.has(step) ? 'mixed' : null;
    return { index, grapheme, step, slot };
  });
  const own = slots.map((s) => s.slot !== null);
  return { sign, slots, own, checked: own.some(Boolean) };
}

/**
 * The learn.result picks of a finished sign: one per step, logged under that step with its own slots.
 * `results[i]` is the result of slot i (ignored for given slots). The adapter passes `outcome` to
 * `learnResultPayload(pick, outcome)`.
 */
export function signResults(t: SignTask, results: readonly (Result | null)[]): { pick: PlanPick; outcome: { result: Result; slots: ItemResult[] } }[] {
  const byStep = new Map<StepId, SignSlot[]>();
  for (const s of t.slots) {
    if (s.slot === null || s.step === null) continue;
    byStep.set(s.step, [...(byStep.get(s.step) ?? []), s]);
  }
  const out: { pick: PlanPick; outcome: { result: Result; slots: ItemResult[] } }[] = [];
  for (const [step, slots] of byStep) {
    const items = slots.map((s): ItemResult => ({ id: graphemeItem('s', s.grapheme), r: results[s.index] ?? 'first' }));
    const result: Result = items.some((i) => i.r === 'miss') ? 'miss' : items.some((i) => i.r === 'helped') ? 'helped' : 'first';
    const pick: PlanPick = {
      strand: 's', step, slot: slots[0].slot as Slot, moment: 'sign', items: items.map((i) => i.id),
      carrier: { kind: 'spell', focus: slots.map((s) => s.grapheme) }, scaffold: 3, probe: false,
    };
    out.push({ pick, outcome: { result, slots: items } });
  }
  return out;
}
