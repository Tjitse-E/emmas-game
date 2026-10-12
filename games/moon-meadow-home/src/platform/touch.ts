// One global "Emma touched" signal. The ghost hand hides on it and the visit timeout restarts on it.
import { clock } from './clock.ts';

type Listener = () => void;
const listeners = new Set<Listener>();
let last = 0;

export function onTouch(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitTouch(): void {
  last = clock.now();
  for (const fn of [...listeners]) fn();
}

export const lastTouchAt = (): number => last;

/** Every pointer down anywhere counts as a touch (capture phase, before scene handlers). */
export function installTouchSource(target: EventTarget): () => void {
  const h = (): void => emitTouch();
  target.addEventListener('pointerdown', h, { capture: true, passive: true });
  return () => target.removeEventListener('pointerdown', h, { capture: true });
}
