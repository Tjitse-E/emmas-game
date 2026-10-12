// The art manifest: types, the loader and the lookups (art stream Task A6, contracts C9).
// The loader never rejects (R49): a missing, unreadable or wrong-version manifest becomes an empty one,
// so every scene still draws, with its SVG fallbacks.
import type {
  ArtPack, BackgroundEntry, BreedId, OutfitSlot, PictureEntry, PictureKind, Stage,
} from '../types/contracts.ts';

export type { ArtPack, BackgroundEntry, BreedId, OutfitSlot, PictureEntry, PictureKind, Stage };

export type Rect = [x: number, y: number, w: number, h: number];
export type Point = [x: number, y: number];
export type Tint = 'body' | 'mane' | 'mane2' | 'none';
export type PartId = 'tail' | 'body' | 'lids' | 'head' | 'mane' | 'legFL' | 'legFR' | 'legBL' | 'legBR' | 'horn' | 'wings';
export type PartAnim = 'none' | 'tail' | 'blink' | 'head' | 'leg' | 'mane';
export interface UnicornLayer { src: string; tint: Tint; box: Rect }
export interface UnicornPart { id: PartId; box: Rect; pivot: Point; anim: PartAnim; hidden?: boolean; layers: UnicornLayer[] }
export type AnchorName = 'head' | 'hornBase' | 'eye' | 'neck' | 'back' | 'mane' | 'flank' | 'tailRoot' | 'feet';
export interface UnicornRendition { scale: number; parts: UnicornPart[] }
export interface UnicornEntry {
  breed: BreedId; stage: Stage; mode: 'sprite' | 'layers'; w: number; h: number;
  anchors: Record<AnchorName, Point>; headBox: Rect;
  renditions: { sm: UnicornRendition; lg: UnicornRendition }; sil: string; source: 'codex' | 'placeholder' | 'svg';
  /** Lite mode (R63): the whole unicorn in the default colours, one picture at the sm size. */
  flat?: string;
}
export interface LumiEntry { face: string; mouth: string; w: number; h: number; mouthBox: Rect }
export interface ArtManifest {
  v: 1; built: string; rigMode: 'sprite' | 'layers';
  pictures: Record<string, PictureEntry>; backgrounds: Record<string, BackgroundEntry>;
  unicorns: Record<string, UnicornEntry>; lumi: LumiEntry | null; patterns: { speckle: string } | null;
}

const LOAD_TIMEOUT_MS = 10000;

function emptyManifest(): ArtManifest {
  return { v: 1, built: '', rigMode: 'sprite', pictures: {}, backgrounds: {}, unicorns: {}, lumi: null, patterns: null };
}

const slash = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

let current: { m: ArtManifest; base: string } = { m: emptyManifest(), base: './' };
let warned = false;

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const own = <T>(r: Record<string, T>, k: string): T | undefined => (Object.prototype.hasOwnProperty.call(r, k) ? r[k] : undefined);
const sized = (e: unknown): boolean =>
  isRecord(e) && typeof e.src === 'string' && typeof e.w === 'number' && typeof e.h === 'number' && e.w > 0 && e.h > 0;

function keep<T>(x: unknown, ok: (e: unknown) => boolean): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isRecord(x)) return out;
  for (const [k, e] of Object.entries(x)) if (ok(e)) out[k] = e as T;
  return out;
}

/** Checks the parsed file and drops entries that cannot be drawn. Throws only on a file that is not a v1 manifest. */
function normalise(raw: unknown): ArtManifest {
  if (!isRecord(raw)) throw new Error('art manifest: not an object');
  if (raw.v !== 1) throw new Error(`art manifest: version ${String(raw.v)}`);
  return {
    v: 1,
    built: typeof raw.built === 'string' ? raw.built : '',
    rigMode: raw.rigMode === 'layers' ? 'layers' : 'sprite',
    pictures: keep<PictureEntry>(raw.pictures, sized),
    backgrounds: keep<BackgroundEntry>(raw.backgrounds, sized),
    unicorns: keep<UnicornEntry>(raw.unicorns, (e) => isRecord(e) && isRecord(e.renditions) && typeof e.w === 'number' && typeof e.h === 'number'),
    lumi: isRecord(raw.lumi) && typeof raw.lumi.face === 'string' ? (raw.lumi as unknown as LumiEntry) : null,
    patterns: isRecord(raw.patterns) && typeof raw.patterns.speckle === 'string' ? { speckle: raw.patterns.speckle } : null,
  };
}

/** Vite's base ('./' in this app). Outside Vite (Node tools) there is no env object, so './'. */
function defaultBase(): string {
  try {
    return import.meta.env?.BASE_URL ?? './';
  } catch {
    return './';
  }
}

async function fetchManifest(url: string): Promise<ArtManifest> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`art manifest: HTTP ${res.status}`);
  return normalise(JSON.parse(await res.text()));
}

/**
 * Loads `<base><file>` and makes it the current manifest. Never rejects and never waits longer than
 * LOAD_TIMEOUT_MS: on any failure it warns once and uses an empty manifest (R49).
 */
export async function loadArtManifest(base: string = defaultBase(), file = 'art/manifest.json'): Promise<ArtManifest> {
  const b = slash(base);
  let m: ArtManifest;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('art manifest: timed out')), LOAD_TIMEOUT_MS);
    });
    m = await Promise.race([fetchManifest(`${b}${file}`), timeout]);
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn('art manifest could not be loaded; drawing fallbacks instead.', err);
    }
    m = emptyManifest();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  setArtManifest(m, b);
  return m;
}

export function setArtManifest(m: ArtManifest, base: string): void {
  current = { m, base: slash(base) };
}

/** The current manifest; an empty one until a load has finished. */
export const artManifest = (): ArtManifest => current.m;
/** Takes an entry's `src`, not an id. */
export const artUrl = (src: string): string => `${current.base}art/${src}`;
export const hasPicture = (id: string): boolean => own(current.m.pictures, id) !== undefined;
export const picture = (id: string): PictureEntry | undefined => own(current.m.pictures, id);
export const background = (id: string): BackgroundEntry | undefined => own(current.m.backgrounds, id);

export function pictureIds(kind?: PictureKind): string[] {
  return Object.entries(current.m.pictures).filter(([, e]) => !kind || e.kind === kind).map(([k]) => k).sort();
}

/** The breed's entry, else the Moon breed at the same stage, else the Moon baby. Throws only when none exists. */
export function unicornEntry(breed: BreedId, stage: Stage): UnicornEntry {
  const u = current.m.unicorns;
  const e = own(u, `${breed}.${stage}`) ?? own(u, `moon.${stage}`) ?? own(u, 'moon.baby');
  if (!e) throw new Error('no unicorn art in the manifest');
  return e;
}

/** Like unicornEntry, but undefined instead of throwing (for components that draw a fallback). */
export function findUnicornEntry(breed: BreedId, stage: Stage): UnicornEntry | undefined {
  try {
    return unicornEntry(breed, stage);
  } catch {
    return undefined;
  }
}
