// Test builds only: plays whole heartbeats by answering every moment, and records what each scene said.
// Spec 7.3 check 10 ("no dead end, every screen has one spoken goal") as a scripted run.
// I-3b wires the dependencies in the `autoplay` test hook (src/game/hook-handlers.ts).
export type AutoplayLog = { scenes: { id: string; said: string[]; ms: number }[]; stuck: string | null };
/** Scenes that speak through the scene before or after them. The meadow is not here: it has an arrival goal (R54). */
export const SILENT_OK = new Set(['hatch', 'stalls', 'rest']);

/** The problems in a log: every scene without a spoken goal that has a clip (R52), and the scene it got stuck in. */
export function judgeLog(log: AutoplayLog, hasClip: (id: string) => boolean): string[] {
  const out = log.scenes
    .filter((s) => !SILENT_OK.has(s.id) && !s.said.some((id) => hasClip(id)))
    .map((s) => `${s.id} has no spoken goal`);
  if (log.stuck) out.push(`stuck in ${log.stuck}`);
  return out;
}

export type AutoplayDeps = {
  scene(): string;
  /** Every clip id spoken so far, in order (audio.said). */
  said(): readonly string[];
  /** Answers the open moment right. Throws or rejects when no moment is open yet. */
  answer(): Promise<unknown>;
  startHeartbeat(): Promise<void>;
  startGoodnight(): Promise<void>;
  visitOpen(): boolean;
  sleep(ms: number): Promise<void>;
  now(): number;
  /**
   * Optional: calls `fn` on every scene change, at the moment the router changes (router.onChange).
   * Without it autoplay polls every 50 ms, and a goal the new scene speaks before the next poll counts for the
   * scene before it. Returns the unsubscribe function.
   */
  onScene?(fn: (id: string) => void): () => void;
};

/**
 * The longest one settle may take. 1.0.1 goodnight has seven stages (the lantern walk, the herd trotting in, the
 * mangers, free feeding, bed, the sky and goodbye) in one settle, so it gets 30 s (docs/v3/next/plan.md G4).
 */
export const SETTLE_MAX_MS = 30_000;
export type AutoplayOptions = { heartbeats: number; goodnight: boolean; maxMs?: number };

export async function autoplay(d: AutoplayDeps, o: AutoplayOptions): Promise<AutoplayLog> {
  const log: AutoplayLog = { scenes: [], stuck: null };
  const limit = o.maxMs ?? SETTLE_MAX_MS;
  let lastScene = '';
  let saidAt = 0;
  let enteredAt = d.now();
  /** The answer still running. A new one starts only when it settled, so a hung one cannot block the time check. */
  let pending: Promise<void> | null = null;

  const close = () => {
    if (lastScene) log.scenes.push({ id: lastScene, said: d.said().slice(saidAt), ms: d.now() - enteredAt });
  };
  const track = (id: string = d.scene()) => {
    if (id === lastScene) return;
    close();
    lastScene = id; saidAt = d.said().length; enteredAt = d.now();
  };
  const answer = () => {
    if (pending) return;
    const p: Promise<void> = Promise.resolve()
      .then(() => d.answer())
      .then(() => undefined, () => undefined) // no moment open yet
      .finally(() => { if (pending === p) pending = null; });
    pending = p;
  };
  /** Answers every open moment until `until` holds. Returns false and records the scene when it takes too long. */
  const settle = async (until: () => boolean) => {
    const start = d.now();
    while (!until()) {
      track();
      if (d.now() - start > limit) { log.stuck = d.scene(); return false; }
      answer();
      await d.sleep(50);
    }
    track();
    return true;
  };

  const play = async (): Promise<boolean> => {
    for (let i = 0; i < o.heartbeats; i++) {
      if (d.scene() === 'meadow') {
        void d.startHeartbeat().catch(() => undefined);
        if (!(await settle(() => d.scene() !== 'meadow'))) return false;
      }
      if (!(await settle(() => d.scene() === 'meadow'))) return false;
    }
    if (o.heartbeats === 0 && d.scene() !== 'meadow') {
      // A single place visit: answer until the place sends her back to the meadow.
      if (!(await settle(() => d.scene() === 'meadow'))) return false;
    }
    if (o.goodnight) {
      void d.startGoodnight().catch(() => undefined);
      if (!(await settle(() => d.scene() === 'goodnight'))) return false;
      if (!(await settle(() => !d.visitOpen()))) return false;
    }
    return true;
  };

  track();
  const off = d.onScene?.((id) => track(id));
  try {
    if (await play()) {
      track();
      close();
    }
  } finally {
    off?.();
  }
  return log;
}
