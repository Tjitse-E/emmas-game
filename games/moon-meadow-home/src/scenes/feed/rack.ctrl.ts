// The hay rack (docs/v3/next/plan.md F5, N21): "The hay rack needs fifteen bundles. Nine bundles are in. Drag the
// hay that fills it up." One pile of hay is the answer, like the nest's single stone. A wrong pile says how far
// off it was and goes back; the right pile fills the rack and the result is logged like an egg, with no baby.
import type { ErrorTag, Served } from '../../core/heartbeat/types.ts';
import type { EggTask } from '../../core/maths/eggs.ts';
import { judgeStones } from '../../core/maths/eggs.ts';
import { type StoneSpec, planStones } from '../../core/maths/stones.ts';
import { rackGoalLines, rackHintLines, rackMissLines, rackSuccessLines, rackTask } from '../../core/heartbeat/feed.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { learnLog } from '../heartbeat/learn-bridge.ts';
import type { SceneDeps } from '../heartbeat/deps.ts';
import type { StageHook } from './types.ts';

export type RackOutcome = 'solved' | 'miss' | 'ignored';
export type RackView = { filled: number | null; mood: 'over' | 'short' | null; diff: number; solved: boolean };

export class RackCtrl {
  readonly task: EggTask;
  /** The hay piles to choose from (planned like the nest's single stones, 1 to 9). */
  readonly choices: StoneSpec[];
  readonly served: Served;
  onchange: () => void = () => {};
  /** True once the success lines are said: the scene may move on. */
  finished = false;
  /** The scene shows the ghost hand dragging this pile before the level 3 hint places it. */
  onghost: (choiceId: string) => Promise<void> = async () => {};
  private d: SceneDeps;
  private misses = 0;
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;
  private v: RackView = { filled: null, mood: null, diff: 0, solved: false };

  /** Throws when the served pick is not a hay-rack task (MangerFeed only builds it from bridge.rack()). */
  constructor(served: Served, d: SceneDeps) {
    const t = served.pick ? rackTask(served.pick) : null;
    if (!t) throw new Error(`Not a hay-rack task: ${served.id}`);
    this.task = t;
    this.served = served;
    this.d = d;
    this.choices = planStones(t, d.rng);
  }

  view(): RackView { return { ...this.v }; }

  answerId(): string | null {
    return this.choices.find((c) => c.value === this.task.target)?.id ?? null;
  }
  wrongId(): string | null {
    return this.choices.find((c) => c.value !== this.task.target)?.id ?? null;
  }
  label(id: string): string {
    const c = this.choices.find((x) => x.id === id);
    return `hay ${c ? c.value : id}`;
  }

  async begin(): Promise<void> {
    this.startedAt = this.d.now();
    this.d.hints.begin({
      step: this.task.step,
      repeat: () => this.d.audio.sayAll(rackGoalLines(this.task)),
      focused: () => this.d.audio.sayAll(rackHintLines(this.task)),
      answer: async () => {
        const id = this.answerId();
        if (!id) return;
        await this.onghost(id);
        await this.place(id, true);
      },
      target: () => { const id = this.answerId(); return id ? this.label(id) : null; },
    });
    await this.d.audio.sayAll(rackGoalLines(this.task));
  }

  async place(choiceId: string, ghost = false): Promise<RackOutcome> {
    if (this.v.solved) return 'ignored';
    const c = this.choices.find((x) => x.id === choiceId);
    if (!c) return 'ignored';
    if (!ghost) {
      if (this.firstTouch === null) this.firstTouch = this.d.now();
      this.d.hints.touch();
    }
    this.d.audio.act();
    const j = judgeStones(this.task, [c.value]);
    if (!j.ok) {
      this.misses++;
      this.lastError = j.error ?? 'other';
      // The pile shows in the rack for a moment (too full or a gap left), then the scene sends it back.
      this.v = { filled: c.value, mood: j.diff > 0 ? 'over' : 'short', diff: j.diff, solved: false };
      this.onchange();
      await this.d.audio.sayAll(rackMissLines(j.diff));
      this.v = { ...this.v, filled: null };
      this.onchange();
      await this.d.hints.miss();
      return 'miss';
    }
    const result = momentResult(this.misses, this.d.hints.level);
    this.d.hints.end();
    this.v = { filled: c.value, mood: null, diff: 0, solved: true };
    this.onchange();
    const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
    const log = learnLog(this.served, { result, ms, place: 'manger', error: result === 'first' ? null : this.lastError }, null);
    if (log) this.d.dispatch({ type: 'hb.learn', payload: log.payload, baby: null });
    await this.d.audio.sayAll(rackSuccessLines(this.task));
    this.finished = true;
    this.onchange();
    return 'solved';
  }

  /** The checked moment's test hook (3.7): drag a pile of hay to the hay rack. */
  hook(): StageHook {
    return {
      answer: async () => { const id = this.answerId(); return id ? this.place(id) : 'none'; },
      wrong: async () => { const id = this.wrongId(); return id ? this.place(id) : 'none'; },
      idle: () => this.d.hints.idle(),
      target: () => { if (this.v.solved) return null; const id = this.answerId(); return id ? this.label(id) : null; },
      drop: () => (this.v.solved ? null : 'hay rack'),
    };
  }
}
