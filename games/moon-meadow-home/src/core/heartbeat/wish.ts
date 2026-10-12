// Turns a served reading item into a basket, station, one-or-many or twin wish.
import type { Rng } from '../rng.ts';
import { type BasketItem, planBasket, planPluralBasket } from '../phonics/basket.ts';
import type { Served, StationId, StepState, WordEntry } from './types.ts';

export const STATIONS: StationId[] = ['hay', 'brush', 'hat', 'nap', 'swing', 'bath'];
export const TWIN_STEPS = new Set(['R04D', 'R11', 'R20', 'R38']);

export type PrintUnit = { g: string; text: string; silent: boolean };
export type WishPart = { baby: string; served: Served; word: WordEntry; units: PrintUnit[] };
export type WishTask = {
  kind: 'basket' | 'station' | 'twin';
  baby: string; served: Served; word: WordEntry;
  print: string; units: PrintUnit[]; dotsMs: 500 | 300 | null;
  basket: BasketItem[]; station: StationId | null; plural: boolean;
  next: WishPart | null;
};

const SPLIT = /^[a-z]-e$/;

export function printUnits(gr: string[], silent: (g: string) => boolean): PrintUnit[] {
  const out: PrintUnit[] = [];
  let pendingE: string | null = null;
  for (const g of gr) {
    const text = g.startsWith('-') ? g.slice(1) : SPLIT.test(g) ? g[0] : g;
    out.push({ g, text, silent: silent(g) });
    if (pendingE) { out.push({ g: pendingE, text: 'e', silent: silent(pendingE) }); pendingE = null; }
    if (SPLIT.test(g)) pendingE = g;
  }
  if (pendingE) out.push({ g: pendingE, text: 'e', silent: silent(pendingE) });
  return out;
}

export function soundedGraphemes(ladder: { id: string; items: string[] }[], status: (step: string) => StepState): Set<string> {
  const s = new Set<string>();
  for (const st of ladder) {
    const k = status(st.id);
    if (k === 'passed' || k === 'placed') st.items.forEach((i) => s.add(i));
  }
  return s;
}

export function buildWish(input: {
  served: Served; baby: string; babyName: string | null; twinBaby: string | null;
  words: Map<string, WordEntry>; bathPond: boolean; sounded: Set<string>; rng: Rng;
  /** The basket's other things. Feeding passes unicorn foods without look-alikes (docs/v3/next/plan.md F2); default every pictured thing. */
  pool?: WordEntry[];
}): WishTask | null {
  const { served } = input;
  const word = input.words.get(served.carrier);
  if (!word) return null;
  if (input.babyName && input.babyName.toLowerCase() === word.word) return null;
  const sc = served.scaffold;
  // Level 3: her slide plays only graphemes of passed steps; the rest are read from print (spec 3.3).
  const units = printUnits(word.gr, (g) => sc === 3 && !input.sounded.has(g));
  const base = {
    baby: input.baby, served, word, print: units.map((u) => u.text).join(''), units,
    dotsMs: (sc === 1 ? 500 : sc === 2 ? 300 : null) as 500 | 300 | null, next: null,
  };
  const plural = served.step === 'R19';
  if (word.station && !plural) {
    if (word.station === 'bath' && !input.bathPond) return null;
    return { ...base, kind: 'station', basket: [], station: word.station, plural: false };
  }
  const pool = input.pool ?? [...input.words.values()].filter((w) => w.basket && !w.one);
  if (plural) {
    const basket = planPluralBasket({ target: word, scaffold: sc, pool, get: (w) => input.words.get(w), rng: input.rng });
    return basket ? { ...base, kind: 'basket', basket, station: null, plural: true } : null;
  }
  const size = sc === 1 ? 3 : sc === 2 ? 4 : 6;
  if (TWIN_STEPS.has(served.step) && served.twin) {
    const partner = input.words.get(served.twin);
    if (!partner) return null;
    const basket = planBasket({ target: word, size, pool, rng: input.rng, must: [partner.word] });
    if (!basket) return null;
    const next: WishPart | null = input.twinBaby
      ? { baby: input.twinBaby, word: partner, units: printUnits(partner.gr, (g) => sc === 3 && !input.sounded.has(g)),
          served: { ...served, id: partner.word, carrier: partner.word, twin: word.word } }
      : null;
    return { ...base, kind: next ? 'twin' : 'basket', basket, station: null, plural: false, next };
  }
  const basket = planBasket({ target: word, size, pool, rng: input.rng });
  return basket ? { ...base, kind: 'basket', basket, station: null, plural: false } : null;
}
