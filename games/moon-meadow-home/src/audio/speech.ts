/**
 * Speech order rules, ported from v2 (ideas/opus-5-5-unicorn-egg-nest-v2/index.html, act/listen/sayAllRaw).
 * - act(): Emma did something that has its own answer. Running and queued instructions stop, so a stale
 *   instruction never talks over the answer.
 * - listen(): Emma asked to hear something (a bell, a basket item, a gem). It is never cut off: a running
 *   instruction sequence waits for it and then goes on. A replay of the goal stops instead.
 */
export interface SpeechPlayer {
  say(id: string): Promise<void>;
  sound(code: string): Promise<void>;
  stop(): void;
}

export interface Speech {
  /** Resolves true when every id played, false when act() or a listen (for a replay) cut the sequence short. */
  speak(ids: ReadonlyArray<string | null | undefined>, opts?: { replay?: boolean }): Promise<boolean>;
  listen(id: string): Promise<void>;
  listenSound(code: string): Promise<void>;
  act(): void;
  setSliding(on: boolean): void;
  readonly userBusy: boolean;
}

export function createSpeech(player: SpeechPlayer, sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Speech {
  let actN = 0;
  let listenN = 0;
  let userTalk = 0;
  let sliding = false;
  const busy = (): boolean => userTalk > 0 || sliding;
  const track = (p: Promise<void>): Promise<void> => {
    listenN++;
    userTalk++;
    return p.catch(() => undefined).then(() => { userTalk--; });
  };
  return {
    async speak(ids, opts = {}) {
      const a = actN;
      const l = listenN;
      const stale = (): boolean => actN !== a || (!!opts.replay && listenN !== l);
      for (const id of ids) {
        if (!id) continue;
        while (busy() && !stale()) await sleep(80);
        if (stale()) return false;
        await player.say(id).catch(() => undefined);
      }
      return !stale();
    },
    listen(id) { player.stop(); return track(player.say(id)); },
    listenSound(code) { player.stop(); return track(player.sound(code)); },
    act() { actN++; player.stop(); },
    setSliding(on) { sliding = on; },
    get userBusy() { return busy(); },
  };
}
