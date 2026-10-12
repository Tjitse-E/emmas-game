// The herd: babies, names, hearts, pins, stalls and the Moonbeam Camp.
import type { BreedId, Colours, EggLook, GameEvent, NameRoute, OutfitSlot, Traits } from '../events.ts';
import type { Slice } from '../fold/engine.ts';
import { isWinningFact } from './facts.ts';
import type { FactsState } from './facts.ts';

export const SASH_SIZE = 10;
export const ROW_SIZE = 10;

/** at: the event time e.t of the pin. */
export type PinRef = { pin: string; kind: 'star' | 'set' | 'moment' | 'sticker'; set: string | null; at: number };
export type Baby = {
  id: string;
  name: string | null;
  gems: string[];
  route: NameRoute | null;
  /** The name-bank name whose clip says this name (from baby.named). v2 babies use their own name. */
  listName: string | null;
  /** 1 for the first baby with this name, 2 for "the Second", and so on. 0 while unnamed. */
  ordinal: number;
  colours: Colours;
  traits: Traits;
  breed: BreedId;
  kind: string;
  egg: EggLook | 'v2';
  source: 'nest' | 'building' | 'row' | 'v2';
  hatchedAt: number;
  v2Night: number | null;
  /** Hearts brought from v2. hearts = v2Hearts + hearts earned in v3. */
  v2Hearts: number;
  hearts: number;
  sash: PinRef[];
  pouch: PinRef[];
  stickers: string[];
  outfit: Partial<Record<OutfitSlot, string | null>>;
  favourite: boolean;
  /** Set by ribbon.set from release 1.2 (Task C1); false until then. */
  comeAlong: boolean;
  /** True once Emma has heard the baby's name clip (name.clipHeard). */
  clipHeard: boolean;
};
export type HerdState = {
  babies: Record<string, Baby>;
  /** Baby ids in hatch order. Stall n holds order[n - 1]. */
  order: string[];
  rowsGranted: number;
  rowsBuilt: number;
  nameCounts: Record<string, number>;
};

const ROW_PLOT_RE = /^row-(\d+)$/;

function giveName(s: HerdState, b: Baby, name: string, gems: string[], route: NameRoute, listName: string | null): void {
  const k = name.toLowerCase();
  s.nameCounts[k] = (s.nameCounts[k] ?? 0) + 1;
  b.name = name; b.gems = [...gems]; b.route = route; b.listName = listName; b.ordinal = s.nameCounts[k];
}

function addPin(b: Baby, pin: PinRef): void {
  (b.sash.length < SASH_SIZE ? b.sash : b.pouch).push(pin);
}

function heart(s: HerdState, baby: string | null, on: boolean): void {
  if (on && baby && Object.hasOwn(s.babies, baby)) s.babies[baby].hearts++;
}

function applyImport(s: HerdState, e: Extract<GameEvent, { type: 'import.v2' }>): void {
  for (const v of e.babies) {
    const existing = Object.hasOwn(s.babies, v.baby) ? s.babies[v.baby] : null;
    if (existing) {
      const extra = Math.max(0, v.hearts - existing.v2Hearts);
      existing.v2Hearts += extra; existing.hearts += extra;
      const before = existing.stickers.filter(x => x === 'pin').length;
      if (v.stickers.length > existing.stickers.length) existing.stickers = [...v.stickers];
      const after = existing.stickers.filter(x => x === 'pin').length;
      for (let i = before; i < after; i++) addPin(existing, { pin: `v2-pin-${i + 1}`, kind: 'sticker', set: null, at: e.t });
      continue;
    }
    const b: Baby = {
      id: v.baby, name: null, gems: [], route: null, ordinal: 0, colours: { ...v.colours }, traits: { ...v.traits },
      breed: 'moon', kind: 'moon', egg: 'v2', source: 'v2', hatchedAt: e.t, v2Night: v.night,
      v2Hearts: v.hearts, hearts: v.hearts, sash: [], pouch: [], stickers: [...v.stickers], outfit: {}, favourite: false, clipHeard: false, listName: null, comeAlong: false,
    };
    if (v.name) giveName(s, b, v.name, v.gems, 'import', v.name);
    let pins = 0;
    for (const st of v.stickers) if (st === 'pin') addPin(b, { pin: `v2-pin-${++pins}`, kind: 'sticker', set: null, at: e.t });
    s.babies[b.id] = b;
    s.order.push(b.id);
  }
  s.rowsGranted = Math.max(s.rowsGranted, Math.ceil(s.order.length / ROW_SIZE));
}

export const herdSlice: Slice<'herd', HerdState> = {
  name: 'herd',
  version: '2',
  init: () => ({ babies: {}, order: [], rowsGranted: 0, rowsBuilt: 0, nameCounts: {} }),
  apply(s, e, ctx) {
    const facts = ctx.get<FactsState>('facts');
    switch (e.type) {
      case 'egg.hatched':
        if (!Object.hasOwn(s.babies, e.baby)) {
          s.babies[e.baby] = {
            id: e.baby, name: null, gems: [], route: null, ordinal: 0, colours: { ...e.colours }, traits: { ...e.traits },
            breed: e.breed, kind: e.kind, egg: e.egg, source: e.source, hatchedAt: e.t, v2Night: null,
            v2Hearts: 0, hearts: 0, sash: [], pouch: [], stickers: [], outfit: {}, favourite: false, clipHeard: false, listName: null, comeAlong: false,
          };
          s.order.push(e.baby);
        }
        break;
      case 'baby.named':
        if (isWinningFact(facts, e) && Object.hasOwn(s.babies, e.baby) && s.babies[e.baby].name === null) {
          giveName(s, s.babies[e.baby], e.name, e.gems, e.route, e.listName);
        }
        break;
      case 'import.v2':
        if (isWinningFact(facts, e)) applyImport(s, e);
        break;
      case 'learn.result': heart(s, e.baby, e.heart); break;
      case 'care.done': heart(s, e.baby, e.heart); break;
      case 'name.clipHeard':
        if (Object.hasOwn(s.babies, e.baby)) { s.babies[e.baby].clipHeard = true; heart(s, e.baby, e.heart); }
        break;
      case 'pin.given':
        if (Object.hasOwn(s.babies, e.baby)) addPin(s.babies[e.baby], { pin: e.pin, kind: e.kind, set: e.set, at: e.t });
        break;
      case 'outfit.saved':
        if (Object.hasOwn(s.babies, e.baby)) s.babies[e.baby].outfit = { ...e.outfit };
        break;
      case 'favourite.set':
        if (Object.hasOwn(s.babies, e.baby)) s.babies[e.baby].favourite = e.on;
        break;
      case 'building.done': {
        const m = ROW_PLOT_RE.exec(e.plot);
        if (m) s.rowsBuilt = Math.max(s.rowsBuilt, Number(m[1]));
        break;
      }
      default:
        break;
    }
    return s;
  },
};

export const herdSize = (h: HerdState): number => h.order.length;
export const rowCount = (h: HerdState): number => Math.max(1, h.rowsGranted, h.rowsBuilt);
export const doorCount = (h: HerdState): number => rowCount(h) * ROW_SIZE;

/** The stall door (1-based) of a baby, or null when it sleeps in the Moonbeam Camp or is unknown. */
export function stallOf(h: HerdState, baby: string): number | null {
  const i = h.order.indexOf(baby);
  return i >= 0 && i < doorCount(h) ? i + 1 : null;
}

export function babyAtDoor(h: HerdState, door: number): Baby | null {
  if (!Number.isInteger(door) || door < 1 || door > doorCount(h)) return null;
  const id = h.order[door - 1];
  return id ? h.babies[id] : null;
}

export function campBabies(h: HerdState): Baby[] {
  return h.order.slice(doorCount(h)).map(id => h.babies[id]);
}

export function babiesInOrder(h: HerdState): Baby[] {
  return h.order.map(id => h.babies[id]);
}
