/**
 * The audio facade over shared/audio.js (contracts C8). Pure: the player is passed in, so tests use a fake.
 * - Dynamic ids (word-, phrase-, name-, num-, ord-) are played only when a usable clip exists. A missing one is
 *   skipped; it is recorded in `missing` unless it is a name (an unknown name is normal: sayName returns false).
 * - A static id always goes to the player, which records it as missing when it has no file. In fast mode nothing
 *   plays, but a static id with no clip is still recorded (R52).
 * - At most DYNAMIC_CLIP_LIMIT decoded dynamic clips are kept (least recently used out first), and release(scene)
 *   also forgets the dynamic clips that scene played (R64).
 */
import { ClipIndex, type ClipManifest } from './clip-index.ts';
import { createSpeech } from './speech.ts';
import { isDynamic, nameId, type NameMark } from './ids.ts';
import type { EmmaAudioApi, HoldHandle, SfxName } from './emma-audio.ts';

export type PlayerLike = Pick<EmmaAudioApi, 'init' | 'unlock' | 'addPack' | 'preload' | 'forget' | 'say' | 'sound'
  | 'hold' | 'sfx' | 'stop' | 'mute' | 'onMissing' | 'reportMissing' | 'missing' | 'speaking'>;
export type PackSpec = { readonly name: string; readonly fresh?: boolean };

/** Decoded dynamic clips kept in memory at most (R64). */
export const DYNAMIC_CLIP_LIMIT = 60;

/**
 * A literal id must be one of `Id`; a computed string (numId(...), wordId(...)) passes, because only the clip index
 * knows at runtime whether it exists. So a misspelt literal such as 'g-eg' is a type error in speak, numId('n', 3) is not.
 * (The example is not written as a call, because tools/lib/read-content.ts scans the source for literal speak calls.)
 */
export type Checked<T extends string, Id extends string> = string extends T ? T : T extends Id ? T : never;
type Arg<T extends string, Id extends string> = (T & Checked<T, Id>) | null | undefined;

export interface Audio<Id extends string = string, Scene extends string = string> {
  init(opts: { base: string }): Promise<void>;
  unlock(): Promise<void>;
  hasClip(id: string): boolean;
  has(id: string): boolean;
  hasName(name: string): boolean;
  nameClip(name: string, mark: NameMark): `name-${string}` | null;
  say<T extends string>(id: Arg<T, Id>): Promise<void>;
  speak<T extends string>(...ids: Array<Arg<T, Id>>): Promise<void>;
  sayAll<T extends string>(ids: ReadonlyArray<Arg<T, Id>>): Promise<void>;
  replay<T extends string>(...ids: Array<Arg<T, Id>>): Promise<void>;
  /** True when a clip for the name exists (and played, unless act() cut it). False and silent when there is none. */
  sayName(name: string, mark: NameMark): Promise<boolean>;
  listen<T extends string>(id: Arg<T, Id>): Promise<void>;
  listenSound(code: string): Promise<void>;
  sound(code: string): Promise<void>;
  hold(code: string): HoldHandle;
  sfx(name: SfxName): Promise<void>;
  act(): void;
  /** Stops what plays and ends every running sequence (the router calls it on a scene change). */
  stop(): void;
  mute(on: boolean): void;
  setSliding(on: boolean): void;
  preload(ids: readonly string[]): Promise<string[]>;
  preloadScene<T extends string>(scene: T & Checked<T, Scene>): Promise<string[]>;
  release<T extends string>(scene: T & Checked<T, Scene>): void;
  preloadAll(): Promise<string[]>;
  refreshNames(): Promise<void>;
  onMissing(cb: (id: string) => void): () => void;
  onTalk(cb: (id: string | null) => void): () => void;
  setFast(on: boolean): void;
  readonly said: readonly string[];
  readonly speaking: boolean;
  readonly missing: readonly string[];
}

/** A player that plays nothing: used before init and where there is no window (Node tests). */
export function silentPlayer(): PlayerLike {
  const missing: string[] = [];
  const listeners = new Set<(id: string) => void>();
  const none = (): Promise<void> => Promise.resolve();
  const p: PlayerLike = {
    init: () => p as never,
    unlock: none,
    addPack: () => Promise.resolve(null),
    preload: () => Promise.resolve([]),
    forget: () => {},
    say: none,
    sound: none,
    hold: () => ({ stop() {}, done: Promise.resolve() }),
    sfx: none,
    stop: () => {},
    mute: (on) => !!on,
    onMissing: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    reportMissing: (id) => {
      if (missing.includes(id)) return;
      missing.push(id);
      for (const fn of [...listeners]) fn(id);
    },
    missing,
    speaking: false,
  };
  return p;
}

export function createAudio<Id extends string = string, Scene extends string = string>(
  source: PlayerLike | (() => Promise<PlayerLike>),
  packs: readonly PackSpec[],
  sceneClips: Readonly<Record<Scene, readonly string[]>>,
): Audio<Id, Scene> {
  let player: PlayerLike = typeof source === 'function' ? silentPlayer() : source;
  const early = player;   // missing ids and listeners from before init move to the real player
  const index = new ClipIndex();
  const said: string[] = [];
  const talkers = new Set<(id: string | null) => void>();
  const missingCbs = new Set<(id: string) => void>();
  const unsubs = new Map<(id: string) => void, () => void>();
  const loaded: string[] = [];                         // scenes preloaded and not released, oldest first
  const dynamicLru = new Map<string, string | null>(); // decoded dynamic id -> scene that played it, oldest first
  const clipsOf = (scene: string): readonly string[] => (sceneClips as Record<string, readonly string[]>)[scene] ?? [];
  let base = '';
  let fast = false;

  const talk = (id: string | null): void => { for (const cb of [...talkers]) cb(id); };
  const markMissing = (id: string): void => player.reportMissing(id);
  const usable = (id: string): boolean => {
    if (!isDynamic(id) || index.has(id)) return true;
    if (!id.startsWith('name-')) markMissing(id);
    return false;
  };
  const clean = (ids: ReadonlyArray<string | null | undefined>): string[] => ids.filter((id): id is string => !!id && usable(id));

  /** Marks a dynamic clip as just used and forgets the oldest beyond the limit. */
  const touch = (id: string): void => {
    if (!isDynamic(id)) return;
    dynamicLru.delete(id);
    dynamicLru.set(id, loaded.at(-1) ?? null);
    while (dynamicLru.size > DYNAMIC_CLIP_LIMIT) {
      const oldest = dynamicLru.keys().next().value as string;
      dynamicLru.delete(oldest);
      player.forget([oldest]);
    }
  };

  const sayOne = async (id: string): Promise<void> => {
    said.push(id);
    if (fast) {
      if (!isDynamic(id) && !index.has(id)) markMissing(id);
      return;
    }
    touch(id);
    talk(id);
    try { await player.say(id); } finally { talk(null); }
  };
  const speech = createSpeech({
    say: sayOne,
    sound: (code) => (fast ? Promise.resolve() : player.sound(code)),
    stop: () => player.stop(),
  });
  const nameClip = (name: string, mark: NameMark): `name-${string}` | null => {
    const want = nameId(name, mark) as `name-${string}`;
    if (index.has(want)) return want;
    const called = nameId(name, '!') as `name-${string}`;
    return index.has(called) ? called : null;
  };
  const subscribe = (cb: (id: string) => void): void => { unsubs.set(cb, player.onMissing(cb)); };

  return {
    async init(opts) {
      if (typeof source === 'function') {
        player = await source();
        if (player !== early) {
          for (const id of early.missing) player.reportMissing(id);
          for (const cb of missingCbs) { unsubs.get(cb)?.(); subscribe(cb); }
        }
      }
      base = opts.base;
      player.init({ base: `${base}core/`, phonics: `${base}phonics/` });
      const manifests = await Promise.all(packs.map((p) => player.addPack(p.name, `${base}${p.name}/`, { fresh: !!p.fresh })));
      packs.forEach((p, i) => index.set(p.name, manifests[i] as ClipManifest | null));
    },
    unlock: () => player.unlock(),
    hasClip: (id) => index.has(id),
    has: (id) => index.has(id),
    hasName: (name) => nameClip(name, '!') !== null,
    nameClip,
    async say(id) { await speech.speak(clean([id])); },
    async speak(...ids) { await speech.speak(clean(ids)); },
    async sayAll(ids) { await speech.speak(clean(ids)); },
    async replay(...ids) { await speech.speak(clean(ids), { replay: true }); },
    async sayName(name, mark) {
      const id = nameClip(name, mark);
      if (!id) return false;
      await speech.speak([id]);
      return true;
    },
    listen: (id) => (id && usable(id) ? speech.listen(id) : Promise.resolve()),
    listenSound: (code) => speech.listenSound(code),
    sound: (code) => (fast ? Promise.resolve() : player.sound(code)),
    hold: (code) => (fast ? { stop() {}, done: Promise.resolve() } : player.hold(code)),
    sfx: (name) => (fast ? Promise.resolve() : player.sfx(name)),
    act: () => speech.act(),
    stop: () => speech.act(),
    mute: (on) => { player.mute(on); },
    setSliding: (on) => speech.setSliding(on),
    preload(ids) {
      const ok = clean(ids);
      for (const id of ok) touch(id);
      return player.preload(ok);
    },
    preloadScene(scene) {
      const i = loaded.indexOf(scene);
      if (i >= 0) loaded.splice(i, 1);
      loaded.push(scene);
      return player.preload(clean(clipsOf(scene)));
    },
    release(scene) {
      const i = loaded.indexOf(scene);
      if (i >= 0) loaded.splice(i, 1);
      const played: string[] = [];
      for (const [id, s] of dynamicLru) if (s === scene) played.push(id);
      for (const id of played) dynamicLru.delete(id);
      const keep = new Set<string>([...clipsOf('common'), ...loaded.flatMap((s) => clipsOf(s))]);
      const ids = [...played, ...clipsOf(scene).filter((id) => !keep.has(id))];
      if (ids.length) player.forget(ids);
    },
    preloadAll: () => player.preload(index.ids()),
    async refreshNames() {
      for (const p of packs) if (p.fresh) index.set(p.name, await player.addPack(p.name, `${base}${p.name}/`, { fresh: true }) as ClipManifest | null);
    },
    onMissing(cb) {
      missingCbs.add(cb);
      subscribe(cb);
      return () => { missingCbs.delete(cb); unsubs.get(cb)?.(); unsubs.delete(cb); };
    },
    onTalk(cb) {
      talkers.add(cb);
      return () => { talkers.delete(cb); };
    },
    setFast(on) { fast = on; },
    get said() { return said; },
    get speaking() { return !fast && player.speaking; },
    get missing() { return player.missing; },
  };
}
