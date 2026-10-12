// The egg moment (spec 2.6): drag stones to the nest until every cup is warm. A wrong stone gets steam or
// frost and its line; the egg hatches when the stones are right, and the result goes with the hatch.
import type { EggLook } from '../../types/contracts.ts';
import type { ErrorTag, Served } from '../../core/heartbeat/types.ts';
import { type EggKind, type EggTask, buildEggTask, focusedHintLines, goalLines, judgeStones, missLines, successLines } from '../../core/maths/eggs.ts';
import { type StoneSpec, planStones } from '../../core/maths/stones.ts';
import { BREED_OF, rollHatch } from '../../core/heartbeat/hatch.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { learnLog } from './learn-bridge.ts';
import type { SceneDeps } from './deps.ts';

export type NestView = { placed: string[]; warmNow: number; mood: 'hot' | 'cold' | null; diff: number; solved: boolean };
export type NestOpts = { golden: boolean; speckled: boolean; firstEver: boolean; free?: boolean };
export type PlaceOutcome = 'solved' | 'miss' | 'need-more' | 'ignored';

export class NestCtrl {
  readonly task: EggTask;
  readonly stones: StoneSpec[];
  babyId: string | null = null;
  onchange: () => void = () => {};
  /** The scene shows the ghost hand on these stones before the level 3 hint makes the moves. */
  onghost: (stoneIds: string[]) => Promise<void> = async () => {};
  private placed: StoneSpec[] = [];
  private misses = 0;
  private solved = false;
  private mood: 'hot' | 'cold' | null = null;
  private diff = 0;
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;

  readonly served: Served;
  readonly opts: NestOpts;
  private d: SceneDeps;

  constructor(served: Served, d: SceneDeps, opts: NestOpts) {
    this.served = served;
    this.d = d;
    this.opts = opts;
    this.task = buildEggTask(served);
    this.stones = planStones(this.task, d.rng);
  }

  get look(): EggLook {
    return this.opts.golden ? 'golden' : this.opts.speckled ? 'speckled' : 'plain';
  }

  async begin(): Promise<void> {
    this.startedAt = this.d.now();
    this.d.hints.begin({
      step: this.task.step,
      repeat: () => this.repeatGoal(),
      focused: () => this.d.audio.sayAll(focusedHintLines(this.task, this.placed.map((s) => s.value))),
      answer: async () => {
        const ids = this.answerIds();
        await this.onghost(ids);
        for (const id of ids) await this.place(id, true);
      },
      target: () => (this.answerIds()[0] ? `stone ${this.stones.find((s) => s.id === this.answerIds()[0])!.value}` : null),
    });
    await this.d.audio.sayAll(goalLines(this.task, this.opts.firstEver));
  }

  repeatGoal(): Promise<void> {
    return this.d.audio.sayAll(goalLines(this.task, false));
  }

  touch(): void {
    if (this.firstTouch === null) this.firstTouch = this.d.now();
    this.d.hints.touch();
  }

  /** The stones that solve the egg from here (two for a two-stone egg with none placed). */
  answerIds(): string[] {
    const free = this.stones.filter((s) => !this.placed.includes(s));
    if (this.task.stonesNeeded === 2) {
      if (this.placed.length === 1) {
        const p = free.find((s) => s.value === this.task.target - this.placed[0].value);
        return p ? [p.id] : [];
      }
      for (const a of free) {
        const b = free.find((s) => s !== a && s.value === this.task.target - a.value);
        if (b) return [a.id, b.id];
      }
      return [];
    }
    const s = free.find((x) => x.value === this.task.target);
    return s ? [s.id] : [];
  }

  /** A stone that is not an answer (the first-egg demo and the test hook's wrong move). */
  wrongId(): string | null {
    if (this.task.stonesNeeded === 2 && this.placed.length === 1) {
      const right = new Set(this.answerIds());
      return this.stones.find((s) => !right.has(s.id) && !this.placed.includes(s))?.id ?? null;
    }
    if (this.task.stonesNeeded === 2) {
      // Two stones that together miss: a pair whose sum is not the target.
      return null;
    }
    const right = new Set(this.answerIds());
    return this.stones.find((s) => !right.has(s.id) && !this.placed.includes(s))?.id ?? null;
  }

  /** Two-stone eggs: two stones that do not make the target (first, second). */
  wrongPair(): [string, string] | null {
    const free = this.stones.filter((s) => !this.placed.includes(s));
    for (const a of free) for (const b of free) if (a !== b && a.value + b.value !== this.task.target) return [a.id, b.id];
    return null;
  }

  stoneOf(value: number): string | null {
    return this.stones.find((s) => s.value === value && !this.placed.includes(s))?.id ?? null;
  }

  view(): NestView {
    return {
      placed: this.placed.map((s) => s.id), warmNow: this.task.warm + this.placed.reduce((n, s) => n + s.value, 0),
      mood: this.mood, diff: this.diff, solved: this.solved,
    };
  }

  async place(stoneId: string, ghost = false): Promise<PlaceOutcome> {
    if (this.solved) return 'ignored';
    const s = this.stones.find((x) => x.id === stoneId);
    if (!s || this.placed.includes(s)) return 'ignored';
    if (!ghost) this.touch();
    this.d.audio.act();
    this.mood = null;
    this.placed.push(s);
    this.onchange();
    if (this.task.stonesNeeded === 2 && this.placed.length === 1) {
      await this.d.audio.say('g-one-more');
      return 'need-more';
    }
    const values = this.placed.map((x) => x.value);
    const v = judgeStones(this.task, values);
    if (!v.ok) {
      this.misses++;
      this.lastError = v.error ?? 'other';
      this.mood = v.diff > 0 ? 'hot' : 'cold';
      this.diff = v.diff;
      this.placed = this.task.stonesNeeded === 2 ? this.placed.slice(0, 1) : [];
      this.onchange();
      await this.d.audio.sayAll(missLines(this.task, v.diff));
      await this.d.hints.miss();
      return 'miss';
    }
    this.solved = true;
    const result = momentResult(this.misses, this.d.hints.level);
    this.d.hints.end();
    const roll = rollHatch({ kind: this.task.kind, result, golden: this.opts.golden, speckled: this.opts.speckled, rng: this.d.rng });
    this.babyId = this.d.uuid();
    const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
    this.d.dispatch({
      type: 'hb.hatched', baby: this.babyId, egg: this.look, kind: this.task.kind, breed: BREED_OF[this.task.kind],
      colours: roll.colours, traits: roll.traits, source: 'nest',
      // A free egg hatches without a learning result (learning decision 10).
      learn: this.opts.free ? null : learnLog(this.served, { result, ms, place: 'nest', error: result === 'first' ? null : this.lastError }, this.babyId),
    });
    this.onchange();
    await this.d.audio.sayAll(successLines(this.task, values));
    return 'solved';
  }
}

/** A free egg (learning decision 10: the planner had no pick) still has stones, but nothing is logged. */
const FREE_EGG: Partial<Record<EggKind, Served>> = {
  moon: { strand: 'm', step: 'M02', id: 'm:num:3', carrier: '', items: [], scaffold: 1, probe: false, source: 'review' },
  'small-nest': { strand: 'm', step: 'M05', id: 'm:miss:5-2', carrier: '', items: [], scaffold: 1, probe: false, source: 'review' },
  'two-stone': { strand: 'm', step: 'M10', id: 'm:pair:3+7', carrier: '', items: [], scaffold: 1, probe: false, source: 'review' },
  blanket: { strand: 'm', step: 'M11', id: 'm:hid:10-4', carrier: '', items: [], scaffold: 1, probe: false, source: 'review' },
};
export function freeEgg(kind: EggKind): Served {
  return FREE_EGG[kind] ?? FREE_EGG.moon!;
}
