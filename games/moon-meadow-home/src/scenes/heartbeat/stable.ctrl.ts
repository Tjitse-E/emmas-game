// Bedtime in the stable (docs/v3/next/plan.md N19, N22): the door pick ("Door seven, bedtime!") with the whole
// stall as one target, then tucking in. A right door closes the half-door and tucks that baby in too.
// Tucking is free play: one care.done nap per baby per goodnight, never a miss.
import type { Served } from '../../core/heartbeat/types.ts';
import { logRollCall } from '../../core/heartbeat/rollcall.ts';
import { lineId } from '../../core/heartbeat/lines.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { learnLog } from './learn-bridge.ts';
import type { SceneDeps } from './deps.ts';

export type StableInput = {
  /** The door pick of the bed stage (spec 3.7, M02 and M07 doors), or null. */
  doorPick: { baby: string; number: number } | null;
  doorServed: Served | null;
  /** The babies asleep in the stalls on screen, with their doors. */
  babies: { baby: string; door: number }[];
};

export type TapOutcome = 'ok' | 'miss' | 'ignored';
export type TuckOutcome = 'ok' | 'again' | 'ignored';

export class StableCtrl {
  /** True while the door pick waits for her tap. */
  doorOpen: boolean;
  /** The door the pick closed, for the half-door. */
  closed: number | null = null;
  /** The stall that said "Not me!" last. */
  poked: number | null = null;
  readonly tucked = new Set<string>();
  onchange: () => void = () => {};
  /** Called once when the door pick is answered. */
  ondoor: () => void = () => {};
  /** Called after each first tuck of a baby. */
  ontuck: (baby: string) => void = () => {};
  private readonly i: StableInput;
  private readonly d: SceneDeps;
  private misses = 0;
  private startedAt = 0;
  private firstTouch: number | null = null;

  constructor(i: StableInput, d: SceneDeps) {
    this.i = i;
    this.d = d;
    this.doorOpen = i.doorPick !== null && i.babies.some((b) => b.door === i.doorPick!.number);
  }

  get doorPick(): { baby: string; number: number } | null { return this.i.doorPick; }
  /** No door pick waits: a tap on a sleeping baby tucks it in. */
  tuckOpen(): boolean { return !this.doorOpen; }

  answerStall(): number | null { return this.doorOpen ? this.i.doorPick!.number : null; }
  wrongStall(): number | null {
    if (!this.doorOpen) return null;
    return this.i.babies.find((b) => b.door !== this.i.doorPick!.number)?.door ?? null;
  }

  /** Says the door pick and opens it. Does nothing without one. */
  async beginDoor(): Promise<void> {
    const p = this.i.doorPick;
    if (!p || !this.doorOpen) return;
    this.misses = 0;
    this.firstTouch = null;
    this.startedAt = this.d.now();
    const say = () => this.d.audio.say(lineId.doorBed(p.number));
    this.d.hints.begin({
      step: this.i.doorServed?.step ?? null,
      repeat: say, focused: say,
      answer: async () => { await this.tapStall(p.number, true); },
      target: () => (this.doorOpen ? `stall ${p.number}` : null),
    });
    this.onchange();
    await say();
  }

  /** A tap on a stall while the door pick is open. */
  async tapStall(n: number, ghost = false): Promise<TapOutcome> {
    const p = this.i.doorPick;
    if (!p || !this.doorOpen) return 'ignored';
    const stall = this.i.babies.find((b) => b.door === n);
    if (!stall) return 'ignored';
    if (!ghost) { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }
    this.d.audio.act();
    if (n === p.number) {
      const result = momentResult(this.misses, this.d.hints.level);
      const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
      const learn = logRollCall(this.i.babies.length)
        ? learnLog(this.i.doorServed, { result, ms, place: 'goodnight', error: result === 'first' ? null : 'other' }, p.baby)
        : null;
      this.d.dispatch({ type: 'hb.care', baby: p.baby, station: 'rollcall', learn });
      this.d.hints.end();
      this.doorOpen = false;
      this.closed = n;
      this.poked = null;
      this.onchange();
      await this.tuck(p.baby);
      this.ondoor();
      return 'ok';
    }
    this.misses++;
    this.poked = n;
    this.onchange();
    await this.d.audio.say('foal-notme');
    if (this.d.audio.hasClip(lineId.thatIs(n))) await this.d.audio.say(lineId.thatIs(n));
    await this.d.hints.miss();
    return 'miss';
  }

  /** A tap on a sleeping baby lays the blanket over it (N22). Ignored while the door pick is open. */
  async tuck(baby: string): Promise<TuckOutcome> {
    if (this.doorOpen) return 'ignored';
    if (this.tucked.has(baby)) {
      await this.d.audio.say('foal-yawn');
      return 'again';
    }
    this.tucked.add(baby);
    this.d.dispatch({ type: 'hb.care', baby, station: 'nap' });
    this.onchange();
    await this.d.audio.say('foal-yawn');
    this.ontuck(baby);
    return 'ok';
  }
}
