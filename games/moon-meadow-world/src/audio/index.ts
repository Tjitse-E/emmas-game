// The one audio entry point: shared/audio.js (window.EmmaAudio) with v3's clip packs and the demo's own pack, and
// (2.3.0) the game's own channel for sound effect files, the background loop and the music box (sound.ts).
// Every clip is pre-generated ElevenLabs audio. Nothing here ever uses browser speech.
import '@emma/audio-player';
import { V3 } from '../assets';
import { type Ambience, type FxOpts, type MusicBox, type SfxFile, type Speaker, createSound } from './sound';

export type { Ambience, FxOpts, MusicBox, SfxFile, Speaker };

export type Sfx = 'pop' | 'chime' | 'sparkle' | 'whoosh' | 'soft-no' | 'fanfare' | 'splash' | 'munch' | 'tick' | 'magic' | 'hatch';

interface EmmaAudioApi {
  init(o: { base: string; phonics: string }): void;
  unlock(): Promise<void>;
  preload(ids: string[]): Promise<string[]>;
  preloadSounds(graphemes?: string[]): Promise<string[]>;
  say(id: string, o?: { queue?: boolean }): Promise<void>;
  sayAll(ids: string[]): Promise<void>;
  sound(grapheme: string, o?: { overlap?: boolean }): Promise<void>;
  hold(grapheme: string): { stop(): void; done: Promise<void> };
  sfx(name: Sfx): Promise<void>;
  stop(): void;
  mute(on: boolean): boolean;
  has(id: string): Promise<boolean>;
  addPack(name: string, base: string, o?: { fresh?: boolean }): Promise<unknown>;
  onMissing(fn: (id: string) => void): () => void;
  readonly speaking: boolean;
  readonly missing: string[];
}

const A = (window as unknown as { EmmaAudio: EmmaAudioApi }).EmmaAudio;
// Step 0 counts all speech as Elizabeth's and misses letter sounds. The sound lane counts the pending say, sayAll,
// sound and hold calls here per speaker (sound.ts isStoryLine), so a letter sound counts as Elizabeth speaking.
const sound = createSound({ speaking: () => (A.speaking ? 'elizabeth' : null), sfx: (name) => A.sfx(name) });

/** v3 packs the demo speaks from, searched after the demo's own pack. */
export const V3_PACKS = ['core', 'numbers', 'names-t1', 'words-phase2', 'words-phase3-4', 'words-year1', 'places'] as const;

/** The demo's own clips: public/audio/v4demo/ (built to dist/audio/v4demo/). */
export const OWN_PACK_BASE = 'audio/v4demo/';

let ready = false;
/** Counts every call that cuts the speech that plays: say without queue, sayAll and stop. */
let cuts = 0;

function setup(): void {
  if (ready) return;
  ready = true;
  A.init({ base: OWN_PACK_BASE, phonics: V3 + 'audio/phonics/' });
  A.addPack('v4demo', OWN_PACK_BASE, { fresh: true });
  for (const p of V3_PACKS) A.addPack(p, V3 + 'audio/' + p + '/');
}

/** Letter-sound file names use the grapheme in lower case; a capital gem says the same sound. */
function soundKey(grapheme: string): string {
  return grapheme.toLowerCase();
}

export const audio = {
  /** Call once at boot, before anything else. */
  setup,
  /** Call inside the Play button's pointer handler (iOS). */
  unlock(): Promise<void> {
    setup();
    return A.unlock();
  },
  preload(ids: string[]): Promise<string[]> {
    setup();
    return A.preload(ids);
  },
  preloadSounds(graphemes?: string[]): Promise<string[]> {
    setup();
    return A.preloadSounds(graphemes?.map(soundKey));
  },
  /** Play one clip. Stops current speech first unless queue is set. Resolves when it ends or is stopped. */
  say(id: string, o?: { queue?: boolean }): Promise<void> {
    setup();
    if (!o?.queue) cuts++;
    return A.say(id, o);
  },
  /** Stop current speech, then play the clips in order. */
  sayAll(ids: string[]): Promise<void> {
    setup();
    cuts++;
    return A.sayAll(ids);
  },
  /**
   * sayAll, resolving true when the clips played to their end and false when later speech or stop() cut them (the
   * other calls resolve either way).
   */
  sayWhole(ids: string[]): Promise<boolean> {
    setup();
    const mine = ++cuts;
    return A.sayAll(ids).then(() => cuts === mine);
  },
  /** A pure letter sound (shared phonics clips). */
  sound(grapheme: string, o?: { overlap?: boolean }): Promise<void> {
    setup();
    return A.sound(soundKey(grapheme), o);
  },
  hold(grapheme: string): { stop(): void; done: Promise<void> } {
    setup();
    return A.hold(soundKey(grapheme));
  },
  sfx(name: Sfx): Promise<void> {
    setup();
    return A.sfx(name);
  },
  /**
   * An ElevenLabs effect on the game's own channel (sound.ts): never under Elizabeth, under a story line only with
   * `duck`. Resolves at its end (at most 1 s), so a line that follows it can wait for it.
   */
  fx(id: SfxFile, o?: FxOpts): Promise<void> {
    setup();
    return sound.fx(id, o);
  },
  /** The background loop (day, night or none). It keeps playing through stop() and is silent in checked moments. */
  ambience(kind: Ambience | null): void {
    sound.ambience(kind);
  },
  /** A checked moment opens or ends (game.ts checked()). */
  checked(on: boolean): void {
    sound.checked(on);
  },
  /** Load the effect files and the day loop, after the speech. */
  preloadFx(): Promise<void> {
    return sound.preloadFx();
  },
  /** The wardrobe's music box tune for `ms`. Only its own stop() ends it early. */
  musicBox(ms: number): MusicBox {
    setup();
    return sound.musicBox(ms);
  },
  /** The channel's state, for the test hook. */
  soundState() {
    return sound.state();
  },
  /** Stop speech, letter sounds and effects. The background loop and the music box play on. */
  stop(): void {
    cuts++;
    A.stop();
  },
  has(id: string): Promise<boolean> {
    setup();
    return A.has(id);
  },
  onMissing(fn: (id: string) => void): () => void {
    return A.onMissing(fn);
  },
  get speaking(): boolean {
    return A.speaking;
  },
  get missing(): string[] {
    return A.missing;
  },
};

export type Audio = typeof audio;
