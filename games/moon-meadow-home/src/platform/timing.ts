// Test speed for every wait and animation. Fast mode (window.__game.fast(true)) sets the speed to 0 (contracts C10),
// so pauses and animations finish at once. CSS uses calc(300ms * var(--speed, 1)).

export const timing = { speed: 1 };

export function setFast(on: boolean): void {
  timing.speed = on ? 0 : 1;
  if (typeof document !== 'undefined') document.documentElement.style.setProperty('--speed', String(timing.speed));
}

export const dur = (ms: number): number => Math.round(ms * timing.speed);

/** Waits ms (scaled by the test speed). Resolves early, never rejects, when the signal aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const done = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, dur(ms));
    signal?.addEventListener('abort', done, { once: true });
  });
}

/** Resolves after the next painted frame. */
export function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Web Animations with the test speed. Always resolves, also when the animation is cancelled. */
export function anim(el: Element, keyframes: Keyframe[], o: KeyframeAnimationOptions = {}): Promise<void> {
  try {
    const d = typeof o.duration === 'number' ? o.duration : 300;
    return el.animate(keyframes, { ...o, duration: dur(d) }).finished.then(() => undefined, () => undefined);
  } catch {
    return Promise.resolve();
  }
}
