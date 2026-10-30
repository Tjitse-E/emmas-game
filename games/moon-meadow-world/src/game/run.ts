// One run of the level script. A jump (or a new play) stops the run: every await that goes through it then throws
// Cancelled, so the old script ends at its next step instead of fighting the new one.

export class Cancelled extends Error {
  constructor() {
    super('run cancelled');
  }
}

type OnFrame = (fn: (dt: number, t: number) => void) => () => void;

export class Run {
  alive = true;
  private kill!: (e: Error) => void;
  private readonly killed: Promise<never>;
  private readonly cleanups: (() => void)[] = [];
  /** Timed waits that skip() may end early (the free-play timer, the pond timer). */
  private readonly skippable = new Set<() => void>();
  private readonly onFrame: OnFrame;

  constructor(onFrame: OnFrame) {
    this.onFrame = onFrame;
    this.killed = new Promise<never>((_, reject) => (this.kill = reject));
    // Handled here, so a stop with nothing waiting is not an unhandled rejection.
    this.killed.catch(() => {});
  }

  stop(): void {
    if (!this.alive) return;
    this.alive = false;
    this.kill(new Cancelled());
    for (const fn of this.cleanups.splice(0).reverse()) fn();
    this.skippable.clear();
  }

  /** How many cleanups wait for the run to stop (2.4.0: the long play checks that they stay level). */
  get deferred(): number {
    return this.cleanups.length;
  }

  /**
   * Run fn when the run stops (close a moment's timers, clear a door moment). Returns an undo that takes fn off the
   * list again, for a cleanup whose job ended before the run did (2.4.0: the ride hides the trail at getting off).
   */
  defer(fn: () => void): () => void {
    if (!this.alive) {
      fn();
      return () => {};
    }
    this.cleanups.push(fn);
    return () => {
      const k = this.cleanups.indexOf(fn);
      if (k >= 0) this.cleanups.splice(k, 1);
    };
  }

  /** Await p, unless the run stops first. */
  async w<T>(p: Promise<T>): Promise<T> {
    const v = await Promise.race([p, this.killed]);
    if (!this.alive) throw new Cancelled();
    return v;
  }

  sleep(ms: number): Promise<void> {
    return this.w(new Promise<void>((r) => setTimeout(r, ms)));
  }

  /**
   * Resolves true when pred() holds (checked every rendered frame), or false after `maxMs` of visible time (frames
   * stop while the page is hidden). skip() ends a timed wait at once.
   */
  until(pred: (ms: number) => boolean, maxMs = Infinity): Promise<boolean> {
    return this.w(
      new Promise<boolean>((resolve) => {
        let ms = 0;
        let done = false;
        // 2.4.0: a settled wait takes its cleanup off the run again, so a 36-minute play of many waits keeps the
        // run's deferred list level (the long play checks it).
        let undo: () => void = () => {};
        const finish = (v: boolean) => {
          if (done) return;
          done = true;
          off();
          undo();
          this.skippable.delete(skip);
          resolve(v);
        };
        const skip = () => finish(false);
        const off = this.onFrame((dt) => {
          ms += dt * 1000;
          if (pred(ms)) finish(true);
          else if (ms >= maxMs) finish(false);
        });
        if (Number.isFinite(maxMs)) this.skippable.add(skip);
        if (!done) undo = this.defer(() => finish(false));
      }),
    );
  }

  /** End every timed wait now (test hook). Returns how many were ended. */
  skip(): number {
    const list = [...this.skippable];
    for (const fn of list) fn();
    return list.length;
  }
}
