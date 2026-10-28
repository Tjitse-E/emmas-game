// Who speaks now (docs/v4/2.3.md section 20). index.ts sends every say, sayAll, sound and hold of the shared player
// through countSpeakers(), which counts the calls that have not resolved yet per speaker. A story line is a clip of
// Lumi or a foal (isStoryLine); every other clip and every letter sound is Elizabeth's. A sayAll with any line of
// Elizabeth's counts as hers for its whole length, so nothing can start under her in the middle of it.
import { isStoryLine, type Speaker } from './sound';

/** The part of the shared player (shared/audio.js) that speaks. */
export interface Speech {
  say(id: string, o?: { queue?: boolean }): Promise<void>;
  sayAll(ids: string[]): Promise<void>;
  sound(grapheme: string, o?: { overlap?: boolean }): Promise<void>;
  hold(grapheme: string): { stop(): void; done: Promise<void> };
}

/** The speaker of a clip or a run of clips. */
export function speakerOf(ids: readonly string[]): Speaker {
  return ids.length > 0 && ids.every(isStoryLine) ? 'story' : 'elizabeth';
}

export interface Speakers {
  /** Elizabeth while any call of hers is pending, else a story voice while one is, else null. */
  now(): Speaker | null;
  /** Count `p` for `who` until it settles. */
  track<T>(who: Speaker, p: Promise<T>): Promise<T>;
}

/** The pending count. `onChange` runs when now() changes, after the count has moved. */
export function createSpeakers(onChange: (who: Speaker | null) => void = () => undefined): Speakers {
  const pending: Record<Speaker, number> = { elizabeth: 0, story: 0 };
  let last: Speaker | null = null;
  const now = (): Speaker | null => (pending.elizabeth > 0 ? 'elizabeth' : pending.story > 0 ? 'story' : null);
  const changed = () => {
    const who = now();
    if (who === last) return;
    last = who;
    onChange(who);
  };
  return {
    now,
    track<T>(who: Speaker, p: Promise<T>): Promise<T> {
      pending[who]++;
      changed();
      let open = true;
      const end = () => {
        if (!open) return;
        open = false;
        pending[who] = Math.max(0, pending[who] - 1);
        changed();
      };
      return p.then(
        (v) => {
          end();
          return v;
        },
        (e: unknown) => {
          end();
          throw e;
        },
      );
    },
  };
}

/** The shared player's speech counted per speaker, with the cuts the shared player makes on its own. */
export interface CountedSpeech extends Speech {
  /**
   * End the count of every held letter sound. The shared player cuts a held sound on stop() and when the next letter
   * sound starts, but resolves the done of a sustained hold (and of a missing one) only when its stop() is called. So a
   * hold that something else cut would keep counting as Elizabeth, and every effect would be skipped from then on.
   */
  cutHolds(): void;
}

/**
 * The shared player's speech, counted per speaker. A held letter sound counts until its done resolves, until
 * audio.stop() (index.ts calls cutHolds), or until the next letter sound without overlap or the next hold.
 */
export function countSpeakers(player: Speech, speakers: Speakers): CountedSpeech {
  const holds = new Set<() => void>();
  const cutHolds = () => {
    for (const end of [...holds]) end();
  };
  return {
    say: (id, o) => speakers.track(speakerOf([id]), player.say(id, o)),
    sayAll: (ids) => speakers.track(speakerOf(ids), player.sayAll(ids)),
    sound(g, o) {
      const p = speakers.track('elizabeth', player.sound(g, o));
      if (!o?.overlap) cutHolds(); // counted first, so the speaker stays Elizabeth and nothing flickers up
      return p;
    },
    hold(g) {
      const h = player.hold(g);
      let end!: () => void;
      const counted = speakers.track('elizabeth', new Promise<void>((r) => (end = r)));
      cutHolds(); // the hold before this one
      const settle = () => {
        holds.delete(settle);
        end();
      };
      holds.add(settle);
      void h.done.then(settle, settle);
      return {
        stop() {
          h.stop();
          settle();
        },
        done: counted.then(() => h.done),
      };
    },
    cutHolds,
  };
}
