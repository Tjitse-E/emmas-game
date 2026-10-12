// Roll call: how many names to ask, which babies may be asked, the picks per stable page and the logging rule.
import { type Rng, shuffle } from '../rng.ts';
import { type Door, type StableLayout, pageCount, pageDoors, pageOf } from './stables.ts';

export type RollCallPick = { kind: 'name'; baby: string; name: string } | { kind: 'door'; baby: string; number: number };

export function rollCallCount(input: { visitIndex: number; checkedThisVisit: number; due: number }): 1 | 2 | 3 {
  if (input.visitIndex <= 1 || input.checkedThisVisit >= 30) return 1;
  return input.due >= 3 ? 3 : 2;
}

// Spec 3.7: only names decodable at her reading step, or read with a first try before.
export function nameEligible(gems: string[], readable: Set<string>, firsts: number): boolean {
  return firsts > 0 || (gems.length > 0 && gems.every((g) => readable.has(g.toLowerCase())));
}

export function logRollCall(candidates: number): boolean {
  return candidates >= 3;
}

export function pickRollCall(input: {
  layout: StableLayout; names: Map<string, string | null>; count: number;
  eligible: (baby: string) => boolean; isDue: (baby: string) => boolean; door: number | null; rng: Rng;
}): { page: number; picks: RollCallPick[] } {
  const heads = (p: number): Door[] => pageDoors(input.layout, p).filter((d) => d.baby !== null);
  const askable = (p: number): Door[] => {
    const hs = heads(p);
    const count = new Map<string, number>();
    for (const d of hs) { const n = input.names.get(d.baby!)?.toLowerCase(); if (n) count.set(n, (count.get(n) ?? 0) + 1); }
    return hs.filter((d) => {
      const n = input.names.get(d.baby!)?.toLowerCase();
      return !!n && count.get(n) === 1 && input.eligible(d.baby!);
    });
  };
  const picks: RollCallPick[] = [];
  let page = 1;
  if (input.door !== null) {
    const d = input.layout.rows.flat().find((x) => x.number === input.door && x.baby !== null);
    if (d && heads(pageOf(d.number)).length >= 3) {
      page = pageOf(d.number);
      picks.push({ kind: 'door', baby: d.baby!, number: d.number });
    }
  }
  if (!picks.length) {
    let best = -1;
    for (let p = 1; p <= pageCount(input.layout); p++) {
      if (heads(p).length < 3) continue;
      const a = askable(p);
      const score = a.filter((d) => input.isDue(d.baby!)).length * 10 + a.length;
      if (score > best) { best = score; page = p; }
    }
    if (best < 0) return { page: 1, picks: [] };
  }
  const options = askable(page).filter((d) => !picks.some((x) => x.baby === d.baby));
  const due = shuffle(options.filter((d) => input.isDue(d.baby!)), input.rng);
  const rest = shuffle(options.filter((d) => !input.isDue(d.baby!)), input.rng);
  for (const d of [...due, ...rest]) {
    if (picks.length >= input.count) break;
    picks.push({ kind: 'name', baby: d.baby!, name: input.names.get(d.baby!)! });
  }
  return { page, picks };
}
