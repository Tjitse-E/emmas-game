// The parent corner's pure helpers (Task A15, R56): PIN and keypad, the report table, names, the learning
// section, overrides, backup, devices and quarantine. Only Tjitse sees the corner; Emma never sees a score.
// No store import here, so it loads in a plain unit test. Store-bound parts are in src/parent/store.ts.
import type { GameEvent } from '../core/events.ts';
import type { Report } from '../core/report/criteria.ts';
import type { StrandReport } from '../core/learning/report.ts';
import type { LearnOverridePayload, Rng, StepId, Strand } from '../types/contracts.ts';

export const DEFAULT_PIN = '2468';
export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** How long the parent button is held before the keypad shows (decision D18). */
export const HOLD_MS = 3000;
const WEEK_MS = 7 * 24 * 3_600_000;

// ---- PIN (decision D18)

export const pinOf = (settings: Record<string, unknown>): string => {
  const pin = settings['parent-pin'];   // contracts SettingKey
  return typeof pin === 'string' && /^\d{4}$/.test(pin) ? pin : DEFAULT_PIN;
};
export const checkPin = (entered: string, settings: Record<string, unknown>): boolean => entered === pinOf(settings);

export function keypadOrder(rng: Rng): number[] {
  const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** The settings as the parent corner reads them: the latest settings.set per key, in log order. */
export function settingsOf(ev: readonly GameEvent[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const e of ev) if (e.type === 'settings.set') out[e.key] = e.value;
  return out;
}

// ---- report table (spec 1.3)

export type ReportRow = { id: string; measure: string; value: string; target: string; ok: boolean | null };

const pct = (x: number | null | undefined): string => (x === null || x === undefined ? 'no data' : `${Math.round(x * 100)}%`);
const lastWeeks = <T>(rec: Record<number, T>, n = 4): [number, T][] =>
  Object.entries(rec).map(([k, v]) => [Number(k), v] as [number, T]).sort((a, b) => a[0] - b[0]).slice(-n);
const STRAND_NAME: Record<Strand, string> = { r: 'reading', s: 'spelling', m: 'maths' };

/** One row per criterion, in words, with the last four play weeks where a criterion is weekly. */
export function reportRows(r: Report): ReportRow[] {
  const e1 = lastWeeks(r.E1);
  const e3 = lastWeeks(r.E3);
  const strandsVal = (f: (s: Strand) => string) => (['r', 's', 'm'] as Strand[]).map((s) => `${STRAND_NAME[s]} ${f(s)}`).join(', ');
  const c2 = (['r', 's', 'm'] as Strand[]).map((s) => r.C2[s]);
  const l1 = (['r', 's', 'm'] as Strand[]).flatMap((s) => lastWeeks(r.L1[s], 1).map(([, b]) => b));
  const flaggedC1 = r.C1.filter((x) => x.flagged);
  const l4 = r.L4.filter((x) => x.halved !== null);
  return [
    { id: 'E1', measure: 'Visits per week', value: e1.length ? e1.map(([w, n]) => `week ${w}: ${n}`).join(', ') : 'no visits yet', target: '3 or more a week in weeks 1 to 4', ok: e1.length ? e1.every(([, n]) => n >= 3) : null },
    { id: 'E2', measure: 'Eggs hatched per visit', value: r.E2.perVisit.length ? `median ${r.E2.median}, most ${r.E2.max}` : 'no visits yet', target: 'Median 3 or more', ok: r.E2.perVisit.length ? r.E2.median >= 3 : null },
    { id: 'E3', measure: 'Share of time in role play and free play', value: e3.length ? e3.map(([w, x]) => `week ${w}: ${pct(x)}`).join(', ') : 'no data', target: '25% or more from week 3', ok: e3.length ? e3.filter(([w]) => w >= 3).every(([, x]) => x >= 0.25) : null },
    { id: 'E4', measure: 'Names refused for another reason', value: String(r.E4), target: 'Zero', ok: r.E4 === 0 },
    { id: 'E5', measure: 'Fresh jewels dragged in their visit', value: r.E5.length ? `${r.E5.filter(Boolean).length} of ${r.E5.length}` : 'no jewels yet', target: '2 of her first 3', ok: r.E5.length >= 3 ? r.E5.filter(Boolean).length >= 2 : null },
    { id: 'C1', measure: 'Steps with idle flags', value: r.C1.length ? r.C1.map((x) => `${x.step} in ${x.visits} visits`).join(', ') : 'none', target: 'No step flagged in 3 or more visits', ok: flaggedC1.length === 0 },
    { id: 'C2', measure: 'Helped answers after placement', value: strandsVal((s) => pct(r.C2[s])), target: 'Below 15%', ok: c2.every((x) => x === null) ? null : c2.every((x) => x === null || x < 0.15) },
    { id: 'L1', measure: 'First-try accuracy, latest week', value: strandsVal((s) => { const w = lastWeeks(r.L1[s], 1)[0]; return w ? `${pct(w[1].rate)} of ${w[1].n}` : 'no data'; }), target: '70% to 90% (flag below 60% or above 92%)', ok: l1.length ? l1.every((b) => b.flag === null) : null },
    { id: 'L2', measure: 'Steps passed', value: strandsVal((s) => String(r.L2[s])), target: 'At least 1 per strand per 3 play weeks', ok: null },
    { id: 'L3', measure: 'Review accuracy', value: `ladder ${pct(r.L3.ladder)}, names ${pct(r.L3.names)}`, target: '80% or more', ok: r.L3.ladder === null ? null : r.L3.ladder >= 0.8 },
    { id: 'L4', measure: 'Dutch-sound slips after a contrast step', value: l4.length ? l4.map((x) => `${x.step}: ${pct(x.early)} then ${pct(x.late)}`).join(', ') : 'no data', target: 'Half or less', ok: l4.length ? l4.every((x) => x.halved) : null },
    { id: 'L5', measure: 'Spelling share of checked moments', value: pct(r.L5.mean), target: '20% or more on average', ok: r.L5.mean === null ? null : r.L5.mean >= 0.2 },
    { id: 'J', measure: 'Openings that came from jewels', value: r.J.share === null ? 'no openings yet' : `${r.J.jewel} of ${r.J.jewel + r.J.herd} (${pct(r.J.share)})`, target: 'For information', ok: null },
  ];
}

// ---- names

export type NameRow = { name: string; count: number; first: number; last: number; route: string };

export function nameLog(ev: readonly GameEvent[]): { unknown: NameRow[]; list: NameRow[]; blocked: NameRow[]; strong: NameRow[]; noVowel: number } {
  const groups: Record<'unknown' | 'list' | 'blocked' | 'strong', Map<string, NameRow>> = { unknown: new Map(), list: new Map(), blocked: new Map(), strong: new Map() };
  let noVowel = 0;
  const add = (g: keyof typeof groups, name: string, t: number, route: string) => {
    const row = groups[g].get(name);
    if (row) { row.count += 1; row.first = Math.min(row.first, t); row.last = Math.max(row.last, t); } else groups[g].set(name, { name, count: 1, first: t, last: t, route });
  };
  for (const e of ev) {
    if (e.type !== 'name.built') continue;
    const name = nameText(e.gems);
    if (e.outcome === 'no-vowel') { noVowel += 1; continue; }
    if (e.outcome === 'unknown') add('unknown', name, e.t, e.route);
    if (e.outcome === 'list' || e.outcome === 'chosen') add('list', e.listName ?? name, e.t, e.route);
    if (e.outcome === 'blocked') { add('blocked', name, e.t, e.route); if (e.strong) add('strong', name, e.t, e.route); }
  }
  const rows = (g: keyof typeof groups) => [...groups[g].values()];
  return { unknown: rows('unknown'), list: rows('list'), blocked: rows('blocked'), strong: rows('strong'), noVowel };
}

/** The gems she built as a name: 'tamo' becomes 'Tamo'. */
export function nameText(gems: readonly string[]): string {
  const s = gems.join('');
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

// ---- learning section (learning's learnerReport)

export type LearningRow = { strand: Strand; title: string; lines: string[] };

const list = (xs: readonly string[]): string => (xs.length ? xs.join(', ') : 'none');

export function learningRows(reports: readonly StrandReport[]): LearningRow[] {
  return reports.map((r) => {
    const lines: string[] = [];
    if (r.placing && r.placement) lines.push(`Still placing between ${r.placement.lo} and ${r.placement.hi} (${r.placement.items} probes so far)`);
    else if (r.ceiling) lines.push('Ceiling reached: every loaded step is passed or placed');
    else lines.push(`Current step ${r.current ?? 'none'}, help level ${r.level ?? '-'}`);
    lines.push(`Passed: ${list(r.passed)}`);
    lines.push(`Placed: ${list(r.placed)}`);
    lines.push(`Secure: ${list(r.secure)}`);
    if (r.side.length) lines.push(`Side steps: ${list(r.side)}`);
    if (r.school.length) lines.push(`School steps open: ${list(r.school)}`);
    if (r.reopened.length) lines.push(`Reopened: ${list(r.reopened)}`);
    const w = r.week;
    lines.push(w.moments ? `This week: ${w.moments} moments, first try ${pct(w.firstTry)}, helped ${pct(w.helped)}` : 'This week: no moments yet');
    if (r.dutchPairs.length) lines.push(`Dutch-sound slips this week: ${r.dutchPairs.map((p) => `${p.pair} (${p.count})`).join(', ')}`);
    return { strand: r.strand, title: STRAND_NAME[r.strand][0].toUpperCase() + STRAND_NAME[r.strand].slice(1), lines };
  });
}

// ---- overrides

export type OverrideStep = { id: StepId; strand: Strand; school: boolean };
export type OverrideRow = { strand: Strand; current: StepId | null; steps: { id: StepId; status: string; school: boolean; current: boolean }[] };

/** Per strand, the loaded steps with their status, so Tjitse can make one current or mark it placed. */
export function overrideRows(steps: readonly OverrideStep[], statusOf: (id: StepId) => string, current: Record<Strand, StepId | null>): OverrideRow[] {
  return (['r', 's', 'm'] as Strand[]).map((strand) => ({
    strand,
    current: current[strand],
    steps: steps.filter((s) => s.strand === strand).map((s) => ({ id: s.id, status: statusOf(s.id), school: s.school, current: current[strand] === s.id })),
  })).filter((r) => r.steps.length > 0);
}

export const PROFILES = ['year1', 'fresh'] as const;
export type ProfileId = (typeof PROFILES)[number];
export const profileOverride = (profile: ProfileId): LearnOverridePayload => ({ op: 'profile', profile });

/** Mark placed when it is not placed or passed, else take the mark away. */
export function placedToggle(strand: Strand, step: StepId, status: string): LearnOverridePayload {
  return { op: status === 'placed' ? 'unmark-placed' : 'mark-placed', strand, step };
}

// ---- backup, devices and quarantine

export type DeviceRow = { dev: string; events: number; visits: number; first: number; last: number; excluded: boolean };

/** Every device in the log with its counts. The latest exclude event per device decides. */
export function deviceList(ev: readonly GameEvent[]): DeviceRow[] {
  const excluded = new Map<string, boolean>();
  for (const e of ev) if (e.type === 'exclude') excluded.set(e.device, e.on);
  const by = new Map<string, DeviceRow>();
  for (const e of ev) {
    const row = by.get(e.dev) ?? { dev: e.dev, events: 0, visits: 0, first: e.t, last: e.t, excluded: excluded.get(e.dev) ?? false };
    row.events += 1;
    if (e.type === 'visit.start') row.visits += 1;
    row.first = Math.min(row.first, e.t);
    row.last = Math.max(row.last, e.t);
    by.set(e.dev, row);
  }
  return [...by.values()].sort((a, b) => a.first - b.first);
}

/** True when neither an export nor a sync happened in the last seven days. */
export function exportReminder(lastExport: number | null, lastSync: number | null, now: number): boolean {
  const newest = Math.max(lastExport ?? 0, lastSync ?? 0);
  return now - newest > WEEK_MS;
}

export type QuarantineRow = { id: string; type: string; reason: string };

/** The quarantine count, counts per event type (most first) and the first rows to show. */
export function quarantineSummary(rows: readonly QuarantineRow[], show = 20): { count: number; types: { type: string; count: number }[]; rows: QuarantineRow[] } {
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.type, (by.get(r.type) ?? 0) + 1);
  const types = [...by].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return { count: rows.length, types, rows: rows.slice(0, show) };
}

/** The ids of the events in a save file text, so the corner can tell what came from it. Empty when it is not a v3 file. */
export function fileEventIds(text: string): Set<string> {
  try {
    const f = JSON.parse(text) as { events?: { id?: unknown }[] };
    return new Set((f.events ?? []).map((e) => e?.id).filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

/** Hatches in the log that did not come from the restored file (the eviction flow: the fresh start hatched nothing). */
export function hatchedOutside(ev: readonly GameEvent[], fromFile: ReadonlySet<string>): number {
  return ev.filter((e) => e.type === 'egg.hatched' && !fromFile.has(e.id)).length;
}

/** "Added 12 events", "v2 herd of 9 imported" and so on, for the import result line. */
export function importMessage(o: { kind: 'v3'; added: number; duplicates: number; quarantined: number } | { kind: 'v2'; status: string; babies: number } | { kind: 'invalid'; reason: string }): string {
  if (o.kind === 'invalid') return `This file cannot be read (${o.reason}).`;
  if (o.kind === 'v2') {
    if (o.status === 'imported') return `v2 herd of ${o.babies} imported.`;
    if (o.status === 'already') return 'This v2 herd is already here.';
    return 'The v2 save has no babies.';
  }
  const extra = [o.duplicates ? `${o.duplicates} already here` : '', o.quarantined ? `${o.quarantined} set aside` : ''].filter(Boolean).join(', ');
  return `Added ${o.added} events${extra ? ` (${extra})` : ''}.`;
}

export const dateText = (t: number): string => {
  const d = new Date(t);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
