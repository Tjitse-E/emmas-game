// Moon Meadow World's own sound channel (docs/v4/2.3.md section 20): ElevenLabs sound effects from files, a day
// background loop, and the music box tune made in code. It plays on the shared player's AudioContext
// (EmmaAudio.context) through its own gain nodes, so shared/audio.js and v3 do not change.
//
// Rules for learning. Nothing sounds under Elizabeth: while she speaks (her clips and every letter sound) an effect is
// skipped, and an effect still sounding when she starts fades out in 60 ms. Under a story line (Lumi, a foal) an
// effect may play ducked to 0.3 when it asks (`duck`). The music box goes down to 0.1 under any speech and the
// background loop to 0.08; the loop is silent during checked moments. A line that must follow an effect awaits fx(),
// which resolves at the effect's end and never later than FX_WAIT_MS after it started. audio.stop() stops neither
// the background loop nor the music box.
//
// Step 0 stub: the API is final, the sound lane builds it. Until then an effect plays its synthesised fallback (when
// one is given and nobody speaks), the background loop and the music box are silent, and the music box only keeps time.
import type { Sfx } from './index';

/** The ElevenLabs effects (tools/audio/sfx.json); each lives in public/audio/sfx/<id>.mp3. */
export type SfxFile =
  | 'egg-crack' | 'nicker-1' | 'nicker-2' | 'stable-door' | 'trunk-lid' | 'gift-paper' | 'dress-swish' | 'bead-clink'
  | 'crown-twinkle' | 'hay-rustle' | 'splash-1' | 'splash-2' | 'slide-whoosh' | 'bedtime-bell' | 'owl' | 'heart-glow';
/** The background loops. Night has no file in 2.3.0 (it waits for 2.3.1), so night is quiet. */
export type Ambience = 'day' | 'night';
/** Who speaks now: Elizabeth (her clips and every letter sound) or a story voice (Lumi, a foal). */
export type Speaker = 'elizabeth' | 'story';

/** fx() resolves at the effect's end, or this long after it started, whichever comes first. */
export const FX_WAIT_MS = 1000;

/** A story line is Lumi's or a foal's (VOICES.md: the queen and the foals); every other clip is Elizabeth's. */
export function isStoryLine(id: string): boolean {
  return /^(lumi|foal)/.test(id);
}

export interface FxOpts {
  /**
   * Play under a story line that is going on, ducked to 0.3, instead of skipping it (the hatch crack under "It's
   * hatching!"). It never plays under Elizabeth: while she speaks the effect is skipped.
   */
  duck?: boolean;
  /** The synthesised effect to play while the file is missing (not generated yet, or failed to load). */
  fallback?: Sfx;
}

export interface MusicBox {
  /** Fade the tune out now (Done, or the wardrobe closing). audio.stop() never stops it. */
  stop(): void;
  /** Resolves at `ms` by a timer (also while the audio context is suspended), or when stopped. */
  readonly done: Promise<void>;
}

export interface SoundDeps {
  /** Who speaks now, or null. index.ts counts pending say, sayAll, sound and hold calls per speaker. */
  speaking(): Speaker | null;
  sfx(name: Sfx): Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createSound(deps: SoundDeps) {
  let checkedDepth = 0;
  let loop: Ambience | null = null;
  return {
    /**
     * One effect. Skipped while Elizabeth speaks, and while a story line plays unless `duck`. Resolves at its end, at
     * most FX_WAIT_MS after it started, at once when it was skipped or has nothing to play.
     */
    fx(id: SfxFile, o: FxOpts = {}): Promise<void> {
      void id;
      const who = deps.speaking();
      if (who === 'elizabeth' || (who === 'story' && !o.duck) || !o.fallback) return Promise.resolve();
      return Promise.race([deps.sfx(o.fallback), wait(FX_WAIT_MS)]);
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
    /** The music box tune for `ms`, ending on its last note at `ms`; it goes down to 0.1 under speech. */
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
