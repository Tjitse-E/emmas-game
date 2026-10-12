// Visits: start, end and time zone, for day boundaries, the 4 hour rule and "days together".
import type { Slice } from '../fold/engine.ts';

export type VisitRec = { visit: string; dev: string; start: number; tz: number; end: number | null; reason: string | null };
export type VisitsState = { list: VisitRec[]; index: Record<string, number> };

export const visitsSlice: Slice<'visits', VisitsState> = {
  name: 'visits',
  version: '1',
  init: () => ({ list: [], index: {} }),
  apply(s, e) {
    if (e.type === 'visit.start' && !Object.hasOwn(s.index, e.visit)) {
      s.index[e.visit] = s.list.length;
      s.list.push({ visit: e.visit, dev: e.dev, start: e.t, tz: e.tz, end: null, reason: null });
    } else if (e.type === 'visit.end' && Object.hasOwn(s.index, e.visit)) {
      const rec = s.list[s.index[e.visit]];
      if (rec.end === null) { rec.end = e.t; rec.reason = e.reason; }
    }
    return s;
  },
};

/** The local calendar day of a moment, as YYYY-MM-DD, using a time zone offset in minutes east of UTC. */
export function localDay(t: number, tz: number): string {
  return new Date(t + tz * 60_000).toISOString().slice(0, 10);
}

export const visitCount = (s: VisitsState): number => s.list.length;
export const lastVisit = (s: VisitsState): VisitRec | null => s.list[s.list.length - 1] ?? null;
export function daysPlayed(s: VisitsState): number {
  return new Set(s.list.map(v => localDay(v.start, v.tz))).size;
}
