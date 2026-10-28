// Moon Meadow World's own sound channel (docs/v4/2.3.md Part 2, section 7): ElevenLabs sound effects from files, a day
// and a night background loop, and the music box tune made in code. It plays on the shared player's AudioContext
// (EmmaAudio.context) through its own gain nodes, so shared/audio.js and v3 do not change. Rules for learning: an
// effect never starts while speech plays unless it may duck under a story line, everything ducks under speech, and
// the background loop is silent during checked moments and survives audio.stop().
//
// Step 0 stub: the API is final, the sound lane builds it. Until then an effect plays its synthesised fallback (when
// one is given and nobody speaks), the background loop and the music box are silent, and the music box only keeps time.
import type { Sfx } from './index';

/** The ElevenLabs effects (tools/audio/sfx.json); each lives in public/audio/sfx/<id>.mp3. */
export type SfxFile =
  | 'egg-crack' | 'nicker-1' | 'nicker-2' | 'stable-door' | 'trunk-lid' | 'gift-paper' | 'dress-swish' | 'bead-clink'
  | 'crown-twinkle' | 'hay-rustle' | 'splash-1' | 'splash-2' | 'slide-whoosh' | 'bedtime-bell' | 'owl' | 'heart-glow';
export type Ambience = 'day' | 'night';

export interface FxOpts {
  /**
   * Play under speech that is going on, ducked, instead of skipping it. Only for a story line by Lumi or a foal (the
   * hatch crack under "It's hatching!"), never while Elizabeth speaks.
   */
  duck?: boolean;
  /** The synthesised effect to play while the file is missing (not generated yet, or failed to load). */
  fallback?: Sfx;
}

export interface MusicBox {
  /** Fade the tune out now (Done). */
  stop(): void;
  /** Resolves when the tune has ended by itself or was stopped. */
  readonly done: Promise<void>;
}

export interface SoundDeps {
  speaking(): boolean;
  sfx(name: Sfx): Promise<void>;
}

export function createSound(deps: SoundDeps) {
  let checkedDepth = 0;
  let loop: Ambience | null = null;
  return {
    /** One effect. Skipped while speech plays, unless `duck`. */
    fx(id: SfxFile, o: FxOpts = {}): void {
      void id;
      if (deps.speaking() && !o.duck) return;
      if (o.fallback) void deps.sfx(o.fallback);
    },
    /** The background loop: day, night, or none. It fades over 2 s and keeps playing through audio.stop(). */
    ambience(kind: Ambience | null): void {
      loop = kind;
    },
    /** A checked moment opens (true) or ends (false); while any is open the background loop is silent. Nests. */
    checked(on: boolean): void {
      checkedDepth = Math.max(0, checkedDepth + (on ? 1 : -1));
    },
    /** Load and decode the effects and the day loop. Call after the speech preloads. */
    preloadFx(): Promise<void> {
      return Promise.resolve();
    },
    /** The music box tune for `ms`, ending on its last note at `ms`; it ducks under speech. */
    musicBox(ms: number): MusicBox {
      let stop: () => void = () => undefined;
      const done = new Promise<void>((resolve) => {
        const t = setTimeout(resolve, Math.max(0, ms));
        stop = () => {
          clearTimeout(t);
          resolve();
        };
      });
      return { stop: () => stop(), done };
    },
    /** For the test hook: the loop asked for and whether a checked moment silences it. */
    state(): { ambience: Ambience | null; checked: boolean } {
      return { ambience: loop, checked: checkedDepth > 0 };
    },
  };
}

export type Sound = ReturnType<typeof createSound>;
