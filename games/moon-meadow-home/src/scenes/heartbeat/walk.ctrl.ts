// The lantern walk (docs/v3/next/plan.md N16, N17): the lantern shows a name, she finds that baby on the dusk
// meadow and drags it along the glowing path to the stable gate. Without a name to ask the walk runs free: she
// leads one to three babies in. A right lead is the roll-call result of spec 3.7 (logged while three heads are left).
import type { Served } from '../../core/heartbeat/types.ts';
import { logRollCall } from '../../core/heartbeat/rollcall.ts';
import { freeLeads, type WalkPick } from '../../core/heartbeat/walk.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { learnLog } from './learn-bridge.ts';
import type { SceneDeps } from './deps.ts';

export type WalkInput = {
  /** The lantern's names in order. Empty: a free walk (N16). */
  picks: WalkPick[];
  /** Babies on the dusk meadow that are not led in yet. */
  heads: Set<string>;
  /** The number in a baby's label ('walk baby 7'): its door, or its order for a camp baby (the same number). */
  doorOf: (baby: string) => number;
  /** The roll-call name pick of a baby (learning's name item), for its result. */
  nameServed: (baby: string, name: string) => Served | null;
  /** Every baby on the dusk meadow, in screen order. */
  dusk: string[];
};

export type LeadOutcome = 'ok' | 'miss' | 'ignored';

export class WalkCtrl {
  readonly free: boolean;
  index = 0;
  readonly led: string[] = [];
  done = false;
  /** The baby that just lifted its head after a tap (the scene steps it towards the path). */
  nudged: string | null = null;
  /** The baby that said "Not me!" last. */
  refused: string | null = null;
  onchange: () => void = () => {};
  ondone: () => void = () => {};
  /** The scene shows the ghost hand dragging this baby to the gate before the level 3 hint leads it. */
  onghost: (baby: string) => Promise<void> = async () => {};
  private readonly i: WalkInput;
  private readonly d: SceneDeps;
  private misses = 0;
  private startedAt = 0;
  private firstTouch: number | null = null;
  private taps = 0;
  private pathSaid = false;

  constructor(i: WalkInput, d: SceneDeps) {
    this.i = i;
    this.d = d;
    this.free = i.picks.length === 0;
  }

  get pick(): WalkPick | null { return this.free ? null : this.i.picks[this.index] ?? null; }
  get heads(): ReadonlySet<string> { return this.i.heads; }
  private get goalLine(): string { return this.free ? 'g-lead-free' : 'g-lantern-walk'; }

  /** The baby to lead now: the lantern's baby, or in a free walk the first one not led yet. */
  rightBaby(): string | null {
    if (this.done) return null;
    if (!this.free) return this.pick?.baby ?? null;
    return this.i.dusk.find((b) => this.i.heads.has(b)) ?? null;
  }
  /** Another baby still on the meadow (picks only: a free walk has no wrong baby). */
  wrongBaby(): string | null {
    const right = this.rightBaby();
    if (this.free || right === null) return null;
    return this.i.dusk.find((b) => b !== right && this.i.heads.has(b)) ?? null;
  }
  target(): string | null {
    const b = this.rightBaby();
    return b === null ? null : `walk baby ${this.i.doorOf(b)}`;
  }

  async begin(): Promise<void> {
    await this.d.audio.say('g-dusk');
    this.beginPick();
    await this.d.audio.say(this.goalLine);
  }

  private beginPick(): void {
    if (this.done) return;
    this.misses = 0;
    this.taps = 0;
    this.pathSaid = false;
    this.firstTouch = null;
    this.startedAt = this.d.now();
    this.d.hints.begin({
      step: null,
      repeat: () => this.d.audio.say(this.goalLine),
      focused: () => this.d.audio.say(this.goalLine),
      answer: async () => {
        const b = this.rightBaby();
        if (b === null) return;
        await this.onghost(b);
        await this.lead(b, true);
      },
      target: () => this.target(),
    });
    this.onchange();
  }

  private touched(ghost: boolean): void {
    if (ghost) return;
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
  }

  /** A baby dropped on the stable gate. */
  async lead(baby: string, ghost = false): Promise<LeadOutcome> {
    if (this.done || !this.i.heads.has(baby)) return 'ignored';
    this.touched(ghost);
    this.d.audio.act();
    const right = this.rightBaby();
    if (this.free || baby === right) {
      const p = this.pick;
      let learn = null;
      if (p) {
        // Spec 3.7: a pick among fewer than three heads is played but never logged.
        const result = momentResult(this.misses, this.d.hints.level);
        const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
        learn = logRollCall(this.i.heads.size)
          ? learnLog(this.i.nameServed(p.baby, p.name), { result, ms, place: 'goodnight', error: result === 'first' ? null : 'other' }, p.baby)
          : null;
      }
      this.d.dispatch({ type: 'hb.care', baby, station: 'rollcall', learn });
      this.d.hints.end();
      this.i.heads.delete(baby);
      this.led.push(baby);
      this.nudged = null;
      this.refused = null;
      if (!this.free) this.index++;
      const finished = this.free ? this.led.length >= freeLeads(this.i.dusk.length) || this.i.heads.size === 0 : this.pick === null;
      if (finished) this.done = true;
      this.onchange();
      await this.d.audio.say('lumi-night');
      if (this.done) { this.ondone(); return 'ok'; }
      if (!this.free) await this.d.audio.sfx('chime');   // a new name on the lantern
      this.beginPick();
      return 'ok';
    }
    this.misses++;
    this.refused = baby;
    this.onchange();
    await this.d.audio.say('foal-notme');
    await this.d.hints.miss();
    return 'miss';
  }

  /** The right baby dropped short of the gate glides back; Elizabeth explains the path once per pick. No miss. */
  async missedDrop(baby: string): Promise<boolean> {
    if (this.done || baby !== this.rightBaby() && !(this.free && this.i.heads.has(baby))) return false;
    this.touched(false);
    return this.sayPath();
  }

  /** A tap lifts the baby's head and steps it towards the path. The second tap in one pick explains the path. */
  async tapBaby(baby: string): Promise<'nudge' | 'ignored'> {
    if (this.done || !this.i.heads.has(baby)) return 'ignored';
    this.touched(false);
    this.taps++;
    this.nudged = baby;
    this.onchange();
    if (this.taps === 2) await this.sayPath();
    return 'nudge';
  }

  private async sayPath(): Promise<boolean> {
    if (this.pathSaid) return false;
    this.pathSaid = true;
    await this.d.audio.say('h-path');
    return true;
  }
}
