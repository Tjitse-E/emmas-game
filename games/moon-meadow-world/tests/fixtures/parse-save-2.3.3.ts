// 2.3.3's save parser, as it was at main 00e8443 (git show 00e8443:games/moon-meadow-world/src/game/save.ts), with its
// imports pointed at ../../src/ and parseSave exported as parseSave233: the rollback test reads a 2.4 save with it.
// The save (docs/v4/2.2.md 2.7, 2.3.md section 15). Since 2.3.0 it lives under mmw.save2, next to 2.2's
// mmw.save, which is read only while mmw.save2 is missing or broken and is never written, so going back to 2.2.0
// finds its own save as it was. v3 shares the origin but keeps its own keys. Every read and write is in try/catch: a missing, blocked or
// broken entry gives the defaults and a first visit (the middle reading level, the first-visit wardrobe). Emma's home
// server, the test servers and a renamed host are separate origins, and Safari may clear the storage after 7 days
// without a visit; both start fresh (main.ts asks the browser to keep it, navigator.storage.persist()).
import type { Outcome, Owned, PrincessLook, Ribbon } from '../../src/contracts';
import { DEFAULT_LOOK, GIFT_ORDER, START_OWNED, copyOwned, fromLegacy, normaliseLook, parseOwned } from '../../src/wardrobe';
import { type ReadingLevel, type ReadingState, UP_AFTER, parseLevel, startReading } from '../../src/game/reading';
import { QUEST_IDS, type QuestId } from '../../src/game/options';

/** The 2.3.0 save. */
export const SAVE_KEY = 'mmw.save2';
/** 2.2.0's save: read when mmw.save2 is missing or broken (not a JSON object), never written or removed. */
export const SAVE_KEY_V1 = 'mmw.save';

export interface Save {
  v: 2;
  /** Her look, as ids. Only items she owns. */
  look: PrincessLook;
  /** The earned items she owns per field (the start items always). Colours are all hers. */
  owned: Owned;
  /** Ribbons earned at goodnight, in order. Pink is always owned and never listed. */
  ribbons: Ribbon[];
  /** Plays started (Play taps). */
  plays: number;
  /**
   * The first-visit wardrobe has been done; Lumi has given the crown (the crown tab shows); she has been to the bead
   * tree (its first gap is shown by the ghost only on her first visit).
   */
  seen: { wardrobe: boolean; crown: boolean; beads: boolean };
  reading: { level: ReadingLevel; recent: Outcome[] };
  /**
   * The phrase wish's own level (2.3 section 18), the same fold as the reading level, so a struggle with the new
   * two-word form never makes her word baskets easier. It starts at her word level.
   */
  phrases: { level: ReadingLevel; recent: Outcome[] };
  /** The bead tree's own pattern level (game/beads.ts), the same fold as the reading level. */
  patterns: { level: ReadingLevel; recent: Outcome[] };
  /** The last finished play's wish, picnic and phrase targets and maths totals, kept out of the next play while it can. */
  last: { words: string[]; totals: number[] };
  /** The last finished play's afternoon: its maths quest and the quests she finished (the rotation, quests.ts). */
  afternoon: { maths: 'rack' | 'beads' | null; done: QuestId[] };
}

/** How many words and totals `last` keeps. */
const LAST_MAX = 16;
const OUTCOMES: readonly Outcome[] = ['first', 'miss', 'helped'];

export function defaultSave(): Save {
  const reading: ReadingState = startReading();
  return {
    v: 2, look: { ...DEFAULT_LOOK }, owned: copyOwned(START_OWNED), ribbons: [], plays: 0, seen: { wardrobe: false, crown: false, beads: false },
    reading, phrases: { level: reading.level, recent: [] }, patterns: { level: 1, recent: [] }, last: { words: [], totals: [] },
    afternoon: { maths: null, done: [] },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const json = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const levelState = (raw: unknown, base: { level: ReadingLevel; recent: Outcome[] }) => {
  if (!isObj(raw)) return base;
  return {
    level: parseLevel(raw.level) ?? base.level,
    recent: list(raw.recent).filter((x): x is Outcome => OUTCOMES.includes(x as Outcome)).slice(-UP_AFTER),
  };
};

/**
 * A save from whatever the store held: a JSON string, an object, null or junk. Pure and tolerant: each field is
 * read on its own, so a newer or older shape keeps every field it understands and the rest falls back to the
 * defaults. A v1 save (2.2.0) is migrated: its look through fromLegacy, and Lumi gave the crown on its first play.
 * `fromV2` says the data came from mmw.save2 (or the game's own memory): then it is a 2.3 save unless it says v 1.
 * Without it, data without a `v` is taken as 2.2's.
 */
export function parseSave233(raw: unknown, fromV2 = false): Save {
  const r: unknown = typeof raw === 'string' ? json(raw) : raw;
  const s = defaultSave();
  if (!isObj(r)) return s;
  // 2.2.0 wrote v 1; a newer save is read as far as it is understood. Data from mmw.save2 without a v is 2.3's, so
  // its look and what she owns are never put through the 2.2 migration.
  const v1 = r.v === 1 || (!fromV2 && r.v === undefined);
  s.owned = v1 ? copyOwned(START_OWNED) : parseOwned(r.owned);
  s.look = v1 ? fromLegacy(r.look) : normaliseLook(r.look, DEFAULT_LOOK, s.owned);
  s.ribbons = [...new Set(list(r.ribbons).filter((x): x is Ribbon => GIFT_ORDER.includes(x as Ribbon)))];
  const plays = Number(r.plays);
  s.plays = Number.isFinite(plays) && plays > 0 ? Math.floor(plays) : 0;
  s.seen.wardrobe = isObj(r.seen) && r.seen.wardrobe === true;
  s.seen.crown = v1 ? s.plays > 0 : isObj(r.seen) && r.seen.crown === true;
  s.seen.beads = isObj(r.seen) && r.seen.beads === true;
  s.reading = levelState(r.reading, s.reading);
  s.phrases = levelState(r.phrases, { level: s.reading.level, recent: [] });
  s.patterns = levelState(r.patterns, s.patterns);
  if (isObj(r.last)) {
    s.last.words = list(r.last.words).filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 12).slice(-LAST_MAX);
    s.last.totals = list(r.last.totals).filter((x): x is number => Number.isInteger(x) && (x as number) > 0 && (x as number) < 100).slice(-LAST_MAX);
  }
  if (isObj(r.afternoon)) {
    const m = r.afternoon.maths;
    s.afternoon.maths = m === 'rack' || m === 'beads' ? m : null;
    s.afternoon.done = [...new Set(list(r.afternoon.done).filter((x): x is QuestId => QUEST_IDS.includes(x as QuestId)))];
  }
  return s;
}

/** Every ribbon colour she owns: pink, then her gifts in order. */
export function ownedRibbons(s: Save): Ribbon[] {
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
  readonly data: Save;
  /** True when it lives in memory only (?fresh=1). */
  readonly memoryOnly: boolean;
  /** Change the save and store it under SAVE_KEY. A store that throws keeps the change in memory for this play. */
  write(change: (s: Save) => void): void;
  /** Read the store again (the test hook's save()). */
  load(): Save;
  /**
   * Start again: the defaults are stored under SAVE_KEY (so the next load is a first visit and does not fall back to
   * 2.2's entry, which stays as it is).
   */
  clear(): void;
}

/**
 * The save for this page. `storage` is called on every read and write, inside try/catch, because Safari may throw on
 * the access itself (blocked storage). With `fresh` it never touches the storage. A missing or broken mmw.save2
 * starts from mmw.save (2.2.0) when there is one. Nothing here ever writes or removes mmw.save.
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
  const get = (key: string): string | null => {
    try {
      return store()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  // mmw.save2 wins whenever it holds a save. 2.2's mmw.save is read only without one: on her first 2.3 play, or when
  // mmw.save2 is broken, so a bad entry never costs her the look she made in 2.2.
  const read = (): Save => {
    const v2 = get(SAVE_KEY);
    return v2 !== null && isObj(json(v2)) ? parseSave233(v2, true) : parseSave233(get(SAVE_KEY_V1));
  };
  let data = read();
  return {
    get data() {
      return data;
    },
    memoryOnly: fresh,
    write(change) {
      const next = parseSave233(JSON.parse(JSON.stringify(data)), true);
      change(next);
      data = parseSave233(next, true);
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
        store()?.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        // Blocked: nothing to store.
      }
    },
  };
}
