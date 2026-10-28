// The actors' own sound effects (docs/v4/2.3.md section 20), for things only they know the timing of: the slide
// whoosh, the slide splash (splash-1 and splash-2 in turn), a baby's happy nicker and the herd's small splashes in the
// pond. The effect files play on the game's channel (audio.fx), so none sounds while Elizabeth speaks, and a file that
// is not there yet plays its synthesised fallback or nothing. None of them waits for anything.
import type { SfxFile } from '../audio';
import { audio } from '../audio';

/** At most one nicker every this many seconds, for the whole herd. */
export const NICKER_GAP_S = 6;
/** At most one small splash (a hop in, a drop in, a spray at a friend) every this many seconds, for the whole herd. */
export const SMALL_SPLASH_GAP_S = 2;

let splashTurn = 0;

/** The slide's sounds, shared by Princess Emma and the herd so the two splash files take turns. */
export const slideSounds = {
  whoosh(): void {
    void audio.fx('slide-whoosh', { fallback: 'whoosh' });
  },
  /** Only the slide's landing: the two big splash files are for that (section 20). */
  splash(): void {
    const id: SfxFile = splashTurn++ % 2 ? 'splash-2' : 'splash-1';
    void audio.fx(id, { fallback: 'splash' });
  },
};

/** Nothing of the herd's own sounds in a checked moment or under any speech (her thinking time, a name, a line). */
const quiet = (): boolean => audio.soundState().checked || audio.speaking;

/**
 * The herd's own sounds, on the herd's clock:
 * - a baby's happy nicker after a hop or a happy emote, nicker-1 and nicker-2 in turn, at most one per NICKER_GAP_S.
 *   It waits one herd frame, so a tap that hops a baby and says its name in the same moment gives no nicker under
 *   the name. There is no synthesised nicker, so a missing file stays silent.
 * - the small splash of a hop or a drop into the pond and of a spray at a friend: the synthesised splash, at most one
 *   per SMALL_SPLASH_GAP_S, never the slide's splash files.
 * Neither plays in a checked moment or while anyone speaks.
 */
export function createHerdSounds(): { tick(t: number): void; nicker(): void; splash(): void } {
  let now = 0;
  let lastNicker = -Infinity;
  let lastSplash = -Infinity;
  let turn = 0;
  let wantNicker = false;
  return {
    /** The herd's clock in seconds (from its update); a nicker asked for in the last frame plays now if it may. */
    tick(t: number): void {
      now = t;
      if (!wantNicker) return;
      wantNicker = false;
      if (now - lastNicker < NICKER_GAP_S || quiet()) return;
      lastNicker = now;
      void audio.fx(turn++ % 2 ? 'nicker-2' : 'nicker-1');
    },
    /** Ask for a nicker (it plays on the next tick, or not at all). */
    nicker(): void {
      wantNicker = true;
    },
    splash(): void {
      if (now - lastSplash < SMALL_SPLASH_GAP_S || quiet()) return;
      lastSplash = now;
      void audio.sfx('splash');
    },
  };
}
