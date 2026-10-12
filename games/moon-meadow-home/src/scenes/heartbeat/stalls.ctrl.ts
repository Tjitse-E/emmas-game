// Move-in and the door visit (spec 2.5, 2.7): the newborn's name and baby number at its door, a tent in the
// Moonbeam Camp when its row is not built yet, and sometimes a visit to a neighbour by door number.
import type { ErrorTag, Served } from '../../core/heartbeat/types.ts';
import { type StableLayout, hasDoor } from '../../core/heartbeat/stables.ts';
import { lineId } from '../../core/heartbeat/lines.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { learnLog } from './learn-bridge.ts';
import type { SceneDeps } from './deps.ts';

export type StallsInput = {
  baby: { id: string; order: number; name: string | null };
  layout: StableLayout; rowsBuilt: number;
  /** The planner's door pick for a visit (carrier door n), or null for no visit. */
  visit: Served | null;
};
export type Tapped = { number: number; who: 'neighbour' | 'sleepy' | 'empty' };

const doorOf = (s: Served | null): number | null => {
  const m = s ? /^m:num:(\d+)$/.exec(s.id) : null;
  return m ? Number(m[1]) : null;
};

export class StallsCtrl {
  readonly door: boolean;
  readonly target: number | null;
  tapped: Tapped | null = null;
  done = false;
  onchange: () => void = () => {};
  private occupants = new Map<number, string>();
  private misses = 0;
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;
  private i: StallsInput;
  private d: SceneDeps;

  constructor(i: StallsInput, d: SceneDeps) {
    this.i = i;
    this.d = d;
    for (const dr of i.layout.rows.flat()) if (dr.baby) this.occupants.set(dr.number, dr.baby);
    this.door = hasDoor(i.baby.order, i.rowsBuilt);
    // Review focus 2: a baby in the camp is never asked to visit; Review focus 1: a visit needs an occupied neighbour.
    const t = doorOf(i.visit);
    this.target = this.door && t !== null && t !== i.baby.order && this.occupants.has(t) ? t : null;
  }

  private async sayIfClip(id: string): Promise<void> {
    if (this.d.audio.hasClip(id)) await this.d.audio.say(id);
  }

  /** "Pip! Baby number nineteen." A camp baby gets the tent line instead of a door. */
  async moveIn(): Promise<void> {
    if (this.i.baby.name) await this.d.audio.sayName(this.i.baby.name, '!');
    await this.sayIfClip(lineId.baby(this.i.baby.order));
    if (!this.door) await this.d.audio.say('g-tent');
  }

  async beginVisit(): Promise<void> {
    const t = this.target;
    if (t === null) return;
    this.startedAt = this.d.now();
    this.firstTouch = null;
    this.d.hints.begin({
      step: this.i.visit?.step ?? null,
      repeat: () => this.d.audio.say(lineId.visit(t)),
      focused: () => this.d.audio.say(lineId.visit(t)),
      answer: async () => { await this.tapDoor(t, true); },
      target: () => `door ${t}`,
    });
    if (this.i.baby.name) await this.d.audio.sayName(this.i.baby.name, '!');
    await this.d.audio.say(lineId.visit(t));
  }

  wrongDoor(): number | null {
    if (this.target === null) return null;
    const occupied = [...this.occupants.keys()].filter((n) => n !== this.target && n !== this.i.baby.order);
    return occupied[0] ?? (this.target === 1 ? 2 : 1);
  }

  async tapDoor(n: number, ghost = false): Promise<'ok' | 'miss' | 'ignored'> {
    const t = this.target;
    if (t === null || this.done || n === this.i.baby.order) return 'ignored';
    if (!ghost) { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }
    this.d.audio.act();
    if (n === t) {
      const result = momentResult(this.misses, this.d.hints.level);
      const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
      const log = learnLog(this.i.visit, { result, ms, place: 'stalls', error: result === 'first' ? null : this.lastError }, this.i.baby.id);
      if (log) this.d.dispatch({ type: 'hb.learn', payload: log.payload, baby: log.baby });
      this.d.hints.end();
      this.tapped = { number: n, who: 'neighbour' };
      this.done = true;
      this.onchange();
      await this.d.audio.say('foal-hello');
      return 'ok';
    }
    this.misses++;
    const rev = n >= 10 && t >= 10 && String(n).split('').reverse().join('') === String(t);
    this.lastError = rev ? 'reversal' : Math.abs(n - t) === 1 ? 'off-by-one' : 'other';
    this.tapped = { number: n, who: this.occupants.has(n) ? 'sleepy' : 'empty' };
    this.onchange();
    if (this.occupants.has(n)) await this.d.audio.say('foal-notme');
    await this.sayIfClip(lineId.thatIs(n));
    await this.d.hints.miss();
    return 'miss';
  }
}
