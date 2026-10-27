// The save (docs/v4/2.2.md 2.7): one localStorage key, mmw.save. v3 shares the origin but keeps its own keys. Every
// read and write is in try/catch: a missing, blocked or broken entry gives the defaults and a first visit (the
// middle reading level, the first-visit customiser). Emma's home server, the test servers and a renamed host are
// separate origins, and Safari may clear the storage after 7 days without a visit; both start fresh.
import type { Outcome, PrincessLook, Ribbon } from '../contracts';
import { DEFAULT_LOOK, GIFT_ORDER, normaliseLook } from '../wardrobe';
import { type ReadingLevel, type ReadingState, UP_AFTER, parseLevel, startReading } from './reading';

export const SAVE_KEY = 'mmw.save';

export interface SaveV1 {
  v: 1;
  /** Her look, as ids. */
  look: PrincessLook;
  /** Ribbon colours earned at goodnight, in order. Pink is always owned and never listed. */
  ribbons: Ribbon[];
  /** Plays started (Play taps). */
  plays: number;
  seen: { wardrobe: boolean };
  reading: { level: ReadingLevel; recent: Outcome[] };
  /** The last finished play's wish and picnic targets and maths totals, kept out of the next play while it can. */
  last: { words: string[]; totals: number[] };
}

/** How many words and totals `last` keeps. */
const LAST_MAX = 16;
const OUTCOMES: readonly Outcome[] = ['first', 'miss', 'helped'];

export function defaultSave(): SaveV1 {
  const reading: ReadingState = startReading();
  return { v: 1, look: { ...DEFAULT_LOOK }, ribbons: [], plays: 0, seen: { wardrobe: false }, reading, last: { words: [], totals: [] } };
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * A save from whatever the store held: a JSON string, an object, null or junk. Pure and tolerant: each field is
 * read on its own, so a newer or older shape keeps every field it understands and the rest falls back to the
 * defaults. A later version migrates from `v` here.
 */
export function parseSave(raw: unknown): SaveV1 {
  let r: unknown = raw;
  if (typeof raw === 'string') {
    try {
      r = JSON.parse(raw);
    } catch {
      r = null;
    }
  }
  const s = defaultSave();
  if (!isObj(r)) return s;
  s.look = normaliseLook(r.look);
  s.ribbons = [...new Set(list(r.ribbons).filter((x): x is Ribbon => GIFT_ORDER.includes(x as Ribbon)))];
  const plays = Number(r.plays);
  s.plays = Number.isFinite(plays) && plays > 0 ? Math.floor(plays) : 0;
  s.seen.wardrobe = isObj(r.seen) && r.seen.wardrobe === true;
  if (isObj(r.reading)) {
    s.reading.level = parseLevel(r.reading.level) ?? s.reading.level;
    s.reading.recent = list(r.reading.recent).filter((x): x is Outcome => OUTCOMES.includes(x as Outcome)).slice(-UP_AFTER);
  }
  if (isObj(r.last)) {
    s.last.words = list(r.last.words).filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 12).slice(-LAST_MAX);
    s.last.totals = list(r.last.totals).filter((x): x is number => Number.isInteger(x) && (x as number) > 0 && (x as number) < 100).slice(-LAST_MAX);
  }
  return s;
}

/** Every ribbon colour she owns: pink, then her gifts in order. */
export function ownedRibbons(s: SaveV1): Ribbon[] {
  return ['pink', ...s.ribbons];
}

/** The part of the Storage interface the save uses. */
export type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** A store that lives only as long as the page (?fresh=1, and the tests). */
export function memoryStore(): KeyStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  };
}

export interface SaveStore {
  /** The save the game plays with. Change it only through write(). */
  readonly data: SaveV1;
  /** True when it lives in memory only (?fresh=1). */
  readonly memoryOnly: boolean;
  /** Change the save and store it. A store that throws keeps the change in memory for this play. */
  write(change: (s: SaveV1) => void): void;
  /** Read the store again (the test hook's save()). */
  load(): SaveV1;
  /** Remove the entry; the game goes on with the defaults. */
  clear(): void;
}

/**
 * The save for this page. `storage` is called on every read and write, inside try/catch, because Safari may throw on
 * the access itself (blocked storage). With `fresh` it never touches the storage.
 */
export function createSave(storage: () => KeyStore | null, fresh = false): SaveStore {
  const memory = memoryStore();
  const store = (): KeyStore | null => {
    if (fresh) return memory;
    try {
      return storage();
    } catch {
      return null;
    }
  };
  const read = (): SaveV1 => {
    try {
      return parseSave(store()?.getItem(SAVE_KEY) ?? null);
    } catch {
      return defaultSave();
    }
  };
  let data = read();
  return {
    get data() {
      return data;
    },
    memoryOnly: fresh,
    write(change) {
      const next = parseSave(JSON.parse(JSON.stringify(data)));
      change(next);
      data = parseSave(next);
      try {
        store()?.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        // Full or blocked: the change stays for this play.
      }
    },
    load: read,
    clear() {
      data = defaultSave();
      try {
        store()?.removeItem(SAVE_KEY);
      } catch {
        // Blocked: nothing to remove.
      }
    },
  };
}
