// Goodnight (spec 2.7, 3.7): roll call at the doors (a name on the lantern, or a door number), the herd count
// printed while Elizabeth reads it, ten stars make a sky unicorn to name, then Lumi says goodnight.
import type { Served } from '../../core/heartbeat/types.ts';
import { type StableLayout, pageDoors } from '../../core/heartbeat/stables.ts';
import { type RollCallPick, logRollCall } from '../../core/heartbeat/rollcall.ts';
import { goodnightCountLines, skyState } from '../../core/heartbeat/sky.ts';
import { lineId } from '../../core/heartbeat/lines.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { learnLog } from './learn-bridge.ts';
import type { Named } from './naming.ctrl.ts';
import type { SceneDeps } from './deps.ts';

export type GoodnightInput = {
  layout: StableLayout; page: number; picks: RollCallPick[]; doorServed: Served | null; herdCount: number; skyNames: (string | null)[];
  /** The roll-call name pick of a baby (learning's name item), for its result. */
  nameServed: (baby: string, name: string) => Served | null;
};
export type GoodnightStage = 'rollcall' | 'sky' | 'sky-name' | 'bye';

/** The printed herd count: "41 unicorns", "1 unicorn". */
export function countText(n: number): string {
  return `${n} ${n === 1 ? 'unicorn' : 'unicorns'}`;
}

export class GoodnightCtrl {
  stage: GoodnightStage;
  index = 0;
  poked: number | null = null;
  showCount = false;
  onchange: () => void = () => {};
  readonly heads: Set<string>;
  readonly countText: string;
  private misses = 0;
  private startedAt = 0;
  private firstTouch: number | null = null;
  private i: GoodnightInput;
  private d: SceneDeps;

  constructor(i: GoodnightInput, d: SceneDeps) {
    this.i = i;
    this.d = d;
    this.heads = new Set(pageDoors(i.layout, i.page).filter((x) => x.baby).map((x) => x.baby!));
    this.stage = i.picks.length ? 'rollcall' : 'sky';
    this.countText = countText(i.herdCount);
  }

  get pick(): RollCallPick | null { return this.i.picks[this.index] ?? null; }

  private doorOf(baby: string): number | null {
    return pageDoors(this.i.layout, this.i.page).find((x) => x.baby === baby)?.number ?? null;
  }
  answerDoor(): number | null { const p = this.pick; return p ? this.doorOf(p.baby) : null; }
  wrongDoor(): number | null {
    const p = this.pick;
    const other = [...this.heads].find((b) => b !== p?.baby);
    return other ? this.doorOf(other) : null;
  }

  private repeat(): Promise<void> {
    const p = this.pick;
    return p?.kind === 'door' ? this.d.audio.say(lineId.doorBed(p.number)) : this.d.audio.say('g-rollcall');
  }

  async beginPick(): Promise<void> {
    const p = this.pick;
    if (!p || this.stage !== 'rollcall') return;
    this.misses = 0;
    this.firstTouch = null;
    this.startedAt = this.d.now();
    this.d.hints.begin({
      step: p.kind === 'door' ? this.i.doorServed?.step ?? null : null,
      repeat: () => this.repeat(), focused: () => this.repeat(),
      answer: async () => { const n = this.answerDoor(); if (n !== null) await this.tapDoor(n, true); },
      target: () => { const n = this.answerDoor(); return n === null ? null : `door ${n}`; },
    });
    this.onchange();
    if (p.kind === 'door') await this.d.audio.say(lineId.doorBed(p.number));
    else if (this.index === 0) await this.d.audio.say('g-rollcall');
  }

  async tapDoor(n: number, ghost = false): Promise<'ok' | 'miss' | 'ignored'> {
    const p = this.pick;
    if (!p || this.stage !== 'rollcall') return 'ignored';
    const door = pageDoors(this.i.layout, this.i.page).find((x) => x.number === n);
    if (!door?.baby || !this.heads.has(door.baby)) return 'ignored';
    if (!ghost) { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }
    this.d.audio.act();
    if (door.baby === p.baby) {
      // Spec 3.7: a pick among fewer than three heads is played but never logged.
      const logged = logRollCall(this.heads.size);
      const result = momentResult(this.misses, this.d.hints.level);
      const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
      const served = p.kind === 'door' ? this.i.doorServed : this.i.nameServed(p.baby, p.name);
      const learn = logged ? learnLog(served, { result, ms, place: 'goodnight', error: result === 'first' ? null : 'other' }, p.baby) : null;
      this.d.dispatch({ type: 'hb.care', baby: p.baby, station: 'rollcall', learn });
      this.d.hints.end();
      this.heads.delete(p.baby);
      this.poked = null;
      this.index++;
      if (!this.pick) this.stage = 'sky';
      this.onchange();
      await this.d.audio.say('lumi-night');
      if (this.pick) await this.beginPick();
      return 'ok';
    }
    this.misses++;
    this.poked = n;
    this.onchange();
    await this.d.audio.say('foal-notme');
    if (p.kind === 'door' && this.d.audio.hasClip(lineId.thatIs(n))) await this.d.audio.say(lineId.thatIs(n));
    await this.d.hints.miss();
    return 'miss';
  }

  /** The count, printed while it is read, and the sky. Returns the index of a sky unicorn to name, or null. */
  async sky(): Promise<number | null> {
    const st = skyState(this.i.herdCount, this.i.skyNames);
    const lines = goodnightCountLines(this.i.herdCount, st.unicorns);
    this.showCount = true;
    this.onchange();
    for (const id of [...lines.required, ...lines.optional]) if (this.d.audio.hasClip(id)) await this.d.audio.say(id);
    this.showCount = false;
    const next = st.unnamed[0] ?? null;
    this.stage = next === null ? 'bye' : 'sky-name';
    this.onchange();
    if (next !== null) await this.d.audio.say('g-sky-name');
    return next;
  }

  skyNamed(index: number, n: Named): void {
    this.d.dispatch({ type: 'hb.sky-named', index, name: n.name });
    this.stage = 'bye';
    this.onchange();
  }

  async bye(): Promise<void> {
    this.stage = 'bye';
    this.onchange();
    await this.d.audio.say('lumi-goodnight-emma');
  }
}
