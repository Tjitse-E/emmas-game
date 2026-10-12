// The manger wish (docs/v3/next/plan.md F5, N20): one baby at its manger is hungry. It is the hungry wish of the
// meadow (WishCtrl, intro 'hungry', logged at 'manger'), but the food is dropped on that baby's manger. A food on
// another baby's manger gets "Not me!" and goes back; it is not a miss.
import type { WishTask } from '../../core/heartbeat/wish.ts';
import type { WordEntry } from '../../core/heartbeat/types.ts';
import { WishCtrl, type WishOutcome } from '../heartbeat/wish.ctrl.ts';
import type { SceneDeps } from '../heartbeat/deps.ts';
import type { MangerSpot, StageHook } from './types.ts';

/** The top band (y below 420) keeps the hungry manger clear of the basket drawer (3.7). */
export const TOP_ROW_MAX_Y = 420;

/** The manger that wishes: the first spot in the top row, else the first spot. */
export function chooseSpot(spots: readonly MangerSpot[]): MangerSpot | null {
  return spots.find((s) => s.y < TOP_ROW_MAX_Y) ?? spots[0] ?? null;
}

export type MangerOutcome = WishOutcome | 'not-me';

export class MangerCtrl {
  readonly wish: WishCtrl;
  readonly spot: MangerSpot;
  private d: SceneDeps;

  constructor(task: WishTask, spot: MangerSpot, d: SceneDeps, get: (w: string) => WordEntry | undefined, name: string | null) {
    this.spot = spot;
    this.d = d;
    this.wish = new WishCtrl(task, d, get, { intro: 'hungry', place: 'manger', name });
  }

  get done(): boolean { return this.wish.done; }
  get dropLabel(): string { return `manger ${this.spot.order}`; }

  begin(): Promise<void> { return this.wish.begin(); }

  /** A basket item dropped on the manger of door `order`. */
  async give(key: string, order: number): Promise<MangerOutcome> {
    if (this.wish.done) return 'ignored';
    if (order !== this.spot.order) {
      await this.d.audio.say('foal-notme');
      return 'not-me';
    }
    return this.wish.give(key);
  }

  /** The checked moment's test hook (3.7). */
  hook(): StageHook {
    return {
      answer: async () => { const k = this.wish.answerKey(); return k ? this.give(k, this.spot.order) : 'none'; },
      wrong: async (kind?: string) => { const k = this.wish.wrongKey(kind); return k ? this.give(k, this.spot.order) : 'none'; },
      idle: () => this.d.hints.idle(),
      target: () => (this.wish.done ? null : this.wish.answerLabel()),
      drop: () => (this.wish.done ? null : this.dropLabel),
    };
  }
}
