// What the checked moments share: the layer context they draw into, the open-moment handle the layer keeps (replay,
// reset, the test snapshot) and a small life cycle so a reset stops every pending step. Since 2.3.0 this file is the
// integrator's (docs/v4/2.3.md section 22.2): the eggs, reading and patterns lanes all read it, so a change goes
// through the integrator.
import type { Ghost } from './ghost';
import type { HintRunner } from './ladder';
import { audio, type Sfx } from '../audio';
import { FX_WAIT_MS } from '../audio/sound';
import { boxOf, sleep } from './dom';
import type { Box } from './geometry';

/**
 * An effect that the line after it must not cut (2.3 section 20: Elizabeth's line waits for an effect, at most 1 s).
 * It waits a task first: a stop() just before lowers the speech count only once its promises settle, and the effect
 * is skipped while Elizabeth still counts as speaking. Resolves at the effect's end, at once when it was skipped.
 */
export async function effectFirst(name: Sfx): Promise<void> {
  await sleep(0);
  await Promise.race([audio.sfx(name), sleep(FX_WAIT_MS)]);
}

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
  /** The box a bubble keeps clear of now (layer.keepClear: Princess Emma in the afternoon), or null. */
  clear(): Box | null;
}

/** One touchable thing on screen, for the test hook and the flows. */
export interface UiTarget {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The kinds of checked moment the layer can have open ('sign': 2.4.0's signposts on the trail). */
export type MomentKind = 'egg' | 'naming' | 'wish' | 'beads' | 'sign';

export interface MomentSnapshot {
  kind: MomentKind;
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
  /**
   * Wish only: the words of the wrong items that carry a contrast tag after a miss (the tag cannot be touched). A
   * phrase item's word is its colour and thing ("brown sock").
   */
  tags?: string[];
  /** Egg only (2.3): which of the egg's three sums is on the panel, and how many hearts are lit. */
  round?: { index: number; of: number; lit: number };
  /** Beads only (2.3): the gap that takes a bead now (0 to 2). */
  gap?: number;
  /** Sign only (2.4): the card words in arm order, west, north, east. */
  cards?: string[];
  targets: UiTarget[];
}

export interface OpenMoment {
  readonly kind: MomentKind;
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
