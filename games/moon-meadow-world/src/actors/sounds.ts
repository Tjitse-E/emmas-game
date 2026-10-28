// The actors' own sound effects (docs/v4/2.3.md section 20), for things only they know the timing of: the slide
// whoosh, the splashes (splash-1 and splash-2 in turn) and a baby's happy nicker. They play on the game's channel
// (audio.fx), so none sounds while Elizabeth speaks, and a file that is not there yet plays its synthesised fallback or
// nothing. None of them waits for anything.
import type { SfxFile } from '../audio';
import { audio } from '../audio';

/** At most one nicker every this many seconds, for the whole herd. */
export const NICKER_GAP_S = 6;

let splashTurn = 0;

/** The slide's sounds, shared by Princess Emma and the herd so the two splash files take turns. */
export const slideSounds = {
  whoosh(): void {
    void audio.fx('slide-whoosh', { fallback: 'whoosh' });
  },
  splash(): void {
    const id: SfxFile = splashTurn++ % 2 ? 'splash-2' : 'splash-1';
    void audio.fx(id, { fallback: 'splash' });
  },
};

/**
 * A baby's happy nicker after a hop or a happy emote: never in a checked moment, at most one per NICKER_GAP_S for the
 * whole herd, nicker-1 and nicker-2 in turn. There is no synthesised nicker, so a missing file stays silent.
 */
export function createNickers(): { tick(t: number): void; nicker(): boolean } {
  let now = 0;
  let last = -Infinity;
  let turn = 0;
  return {
    /** The herd's clock in seconds (from its update). */
    tick(t: number): void {
      now = t;
    },
    /** Play one if it may now; true when it was asked for. */
    nicker(): boolean {
      if (now - last < NICKER_GAP_S || audio.soundState().checked) return false;
      last = now;
      void audio.fx(turn++ % 2 ? 'nicker-2' : 'nicker-1');
      return true;
    },
  };
}
