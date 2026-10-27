// What the three checked moments share: the layer context they draw into, the open-moment handle the layer keeps
// (replay, reset, the test snapshot) and a small life cycle so a reset stops every pending step.
import type { Ghost } from './ghost';
import type { HintRunner } from './ladder';
import { boxOf } from './dom';

/**
 * A first touch of an item or a stone this soon after input opened (with no look at the word, for a wish) is a quick
 * pick, a likely guess (the log).
 */
export const QUICK_MS = 1500;

export interface LayerCtx {
  /** Where moment panels go. */
  readonly moments: HTMLElement;
  /** Where flyers go while dragged (above everything but the ghost). */
  readonly drag: HTMLElement;
  readonly ghost: Ghost;
  /** First-time memory for this play ('egg-intro:warm', 'egg-demo', 'slide-demo', ...). Cleared by reset(). */
  readonly seen: Set<string>;
  screen(): { w: number; h: number };
}

/** One touchable thing on screen, for the test hook and the flows. */
export interface UiTarget {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MomentSnapshot {
  kind: 'egg' | 'naming' | 'wish';
  /** 'bells', 'spell', 'busy', 'open' ... */
  phase: string;
  level: number;
  misses: number;
  /** The name of the target that answers it now, when there is one (for flows). */
  answer: string | null;
  /**
   * Egg only: true while the answer cannot be counted off the cups (the warm egg's blanket is on, the snow egg's
   * extra cups are not marked yet).
   */
  covered?: boolean;
  /** Wish only: the words of the wrong items that carry a contrast tag after a miss (the tag cannot be touched). */
  tags?: string[];
  targets: UiTarget[];
}

export interface OpenMoment {
  readonly kind: 'egg' | 'naming' | 'wish';
  /** Repeat the goal (Lumi tap). */
  replay(): void;
  /** Remove everything at once (reset). The moment's promise stays pending. */
  close(): void;
  readonly ladder: HintRunner | null;
  snapshot(): MomentSnapshot;
}

/** A moment's life: steps check `alive` after each await; `own` collects what close() must undo. */
export class Life {
  alive = true;
  private undo: (() => void)[] = [];
  own(fn: () => void): void {
    this.undo.push(fn);
  }
  end(): void {
    this.alive = false;
    for (const fn of this.undo.splice(0).reverse()) fn();
  }
}

/**
 * The moment is done: its panels slide away, then it closes. Resolves false when a reset closed it on the way, so
 * the moment's promise stays pending (the game has moved on).
 */
export async function leave(root: HTMLElement, life: Life, setOpen: (m: OpenMoment | null) => void): Promise<boolean> {
  root.classList.add('leaving');
  await new Promise((r) => setTimeout(r, 450));
  if (!life.alive) return false;
  life.end();
  setOpen(null);
  return true;
}

export function target(name: string, e: Element): UiTarget {
  const b = boxOf(e);
  return { name, x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2), w: Math.round(b.w), h: Math.round(b.h) };
}
