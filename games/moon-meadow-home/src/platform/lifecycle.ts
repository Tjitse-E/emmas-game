import { clock } from './clock.ts';
import { lastTouchAt, onTouch } from './touch.ts';

export const VISIT_IDLE_MS = 30 * 60_000;

export function visitTimedOut(lastActiveMs: number, nowMs: number, limitMs = VISIT_IDLE_MS): boolean {
  return nowMs - lastActiveMs >= limitMs;
}

export interface LifecycleHandlers {
  onHide?(): void;
  onShow?(hiddenMs: number): void;
  onVisitTimeout?(): void;
}

/**
 * Signals for the store: hidden, shown again, and the 30-minute visit end (hidden that long, or untouched that long).
 * The visit end fires once until the next touch.
 */
export function watchLifecycle(h: LifecycleHandlers, doc: Document = document): () => void {
  const win: EventTarget | null = doc.defaultView;
  let hiddenAt: number | null = null;
  let timedOut = false;
  const fire = (): void => { if (!timedOut) { timedOut = true; h.onVisitTimeout?.(); } };
  const offTouch = onTouch(() => { timedOut = false; });
  const onVis = (): void => {
    if (doc.visibilityState === 'hidden') {
      if (hiddenAt === null) hiddenAt = clock.now();
      h.onHide?.();
    } else if (hiddenAt !== null) {
      const hiddenMs = clock.now() - hiddenAt;
      hiddenAt = null;
      h.onShow?.(hiddenMs);
      if (hiddenMs >= VISIT_IDLE_MS) fire();
    }
  };
  const onPageHide = (): void => h.onHide?.();
  doc.addEventListener('visibilitychange', onVis);
  win?.addEventListener('pagehide', onPageHide);
  const timer = setInterval(() => {
    if (doc.visibilityState === 'visible' && lastTouchAt() > 0 && visitTimedOut(lastTouchAt(), clock.now())) fire();
  }, 60_000);
  return () => {
    offTouch();
    clearInterval(timer);
    doc.removeEventListener('visibilitychange', onVis);
    win?.removeEventListener('pagehide', onPageHide);
  };
}
