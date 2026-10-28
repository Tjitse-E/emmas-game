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

/** The shared player's speech, counted per speaker. A held letter sound counts until its done resolves. */
export function countSpeakers(player: Speech, speakers: Speakers): Speech {
  return {
    say: (id, o) => speakers.track(speakerOf([id]), player.say(id, o)),
    sayAll: (ids) => speakers.track(speakerOf(ids), player.sayAll(ids)),
    sound: (g, o) => speakers.track('elizabeth', player.sound(g, o)),
    hold(g) {
      const h = player.hold(g);
      return { stop: () => h.stop(), done: speakers.track('elizabeth', h.done) };
    },
  };
}
