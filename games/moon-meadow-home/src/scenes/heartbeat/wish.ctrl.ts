// The wish moment (spec 2.5, 3.8, 3.10): a baby wishes for a printed word. Emma gives the right thing from the
// basket, or takes the baby to the right care station. A wrong give makes a funny event once per item; the
// word is said only after she acts. Twin wishes run one baby after the other.
import type { ErrorTag, StationId, WordEntry } from '../../core/heartbeat/types.ts';
import { STATIONS, type PrintUnit, type WishPart, type WishTask } from '../../core/heartbeat/wish.ts';
import { type Funny, judgeGive } from '../../core/phonics/basket.ts';
import { momentResult } from '../../core/heartbeat/result.ts';
import { gemSoundKey } from '../../core/naming/sounds.ts';
import { wordId } from '../../core/keys.ts';
import { learnLog } from './learn-bridge.ts';
import type { SceneDeps } from './deps.ts';

export type WishOutcome = 'ok' | 'next' | 'miss' | 'ignored';
export type WishFunny = Funny | 'wrong-station';
/**
 * How the wish starts and where its result is logged (docs/v3/next/plan.md F3). A hungry wish ("Pip is hungry!")
 * is a basket wish for a food word; the baby munches instead of cheering. The meadow logs it at 'feed', the
 * stable at 'manger'.
 */
export type WishOpts = { intro: 'wish' | 'hungry'; place: 'wish' | 'feed' | 'manger'; name: string | null };
const PLAIN: WishOpts = { intro: 'wish', place: 'wish', name: null };

/** The test hook's wrong moves (master 5.1 check 11). */
export type WrongKind = 'one-for-many' | 'many-for-one' | string;

/** Letter-sound key of a printed unit: '-s' plays s, '-es' the /iz/ ending, 'a-e' the long a. */
export function unitSoundKey(g: string): string | null {
  if (g === '-s') return 's';
  if (g === '-es') return 'iz';
  return gemSoundKey(g);
}

export class WishCtrl {
  part: 'first' | 'second' = 'first';
  lastFunny: WishFunny | null = null;
  glow = false;
  done = false;
  /** A hungry wish was answered: the baby is eating (set before the munch and the word are said). */
  fed = false;
  onchange: () => void = () => {};
  /** The scene shows the ghost hand on the answer before the level 3 hint gives it. */
  onghost: (key: string) => Promise<void> = async () => {};
  readonly task: WishTask;
  private misses = 0;
  private lastError: ErrorTag | null = null;
  private funnyShown = new Set<string>();
  private startedAt = 0;
  private firstTouch: number | null = null;
  private d: SceneDeps;
  private get: (w: string) => WordEntry | undefined;
  readonly opts: WishOpts;

  constructor(task: WishTask, d: SceneDeps, get: (w: string) => WordEntry | undefined, opts: Partial<WishOpts> = {}) {
    this.task = task;
    this.d = d;
    this.get = get;
    this.opts = { ...PLAIN, ...opts };
  }

  get hungry(): boolean { return this.opts.intro === 'hungry'; }
  /** The goal line: the plain wish, or "Read the wish, and feed your baby." */
  private get goalLine(): string { return this.hungry ? 'g-hungry' : 'g-wish'; }

  get current(): WishPart {
    return this.part === 'first' ? { baby: this.task.baby, served: this.task.served, word: this.task.word, units: this.task.units } : this.task.next!;
  }
  get units(): PrintUnit[] { return this.current.units; }
  /** R36: display-only words printed before the carrier ('the'). Only the first part has them. */
  get display(): string[] { return this.part === 'first' ? this.task.served.display ?? [] : []; }

  async begin(): Promise<void> {
    this.startedAt = this.d.now();
    this.firstTouch = null;
    this.misses = 0;
    this.lastError = null;
    this.d.hints.begin({
      step: this.current.served.step,
      repeat: () => this.d.audio.say(this.goalLine),
      focused: () => this.slowSounds(),
      answer: async () => {
        const k = this.answerKey();
        if (!k) return;
        await this.onghost(k);
        await this.act(k, true);
      },
      target: () => this.answerLabel(),
    });
    if (this.hungry && this.part === 'first') {
      // N14: "Pip!" (only when the name has a clip), the baby's "I'm hungry!", then Elizabeth's goal.
      const name = this.opts.name;
      if (name && this.d.audio.hasName(name)) await this.d.audio.sayName(name, '!');
      await this.d.audio.say('foal-hungry');
    }
    await this.d.audio.say(this.goalLine);
  }

  private async slowSounds(): Promise<void> {
    await this.d.audio.say('h-sounds');
    const seen = new Set<string>();
    for (const u of this.units) {
      if (u.silent || seen.has(u.g)) continue;
      seen.add(u.g);
      const k = unitSoundKey(u.g);
      if (k) { await this.d.audio.sound(k); await this.d.pause(this.task.dotsMs ?? 500); }
    }
  }

  private touch(): void { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }

  /** The basket key (or station id) that answers the wish on screen. */
  answerKey(): string | null {
    if (this.task.kind === 'station') return this.task.station;
    return this.task.basket.find((i) => judgeGive(this.current.word, i, this.get).ok)?.key ?? null;
  }
  /** aria-label of the right answer (contracts C7 Moment.target). */
  answerLabel(): string | null {
    const k = this.answerKey();
    if (!k) return null;
    if (this.task.kind === 'station') return `station ${k}`;
    return this.itemLabel(k);
  }
  itemLabel(key: string): string {
    const it = this.task.basket.find((i) => i.key === key);
    if (!it) return `item ${key}`;
    return `item ${it.heap ? this.get(it.word)?.plural ?? `${it.word}s` : it.word}`;
  }
  /** A wrong move of the given kind when it fits this wish, else any wrong move. */
  wrongKey(kind?: WrongKind): string | null {
    if (this.task.kind === 'station') return STATIONS.find((s) => s !== this.task.station && s !== 'bath') ?? null;
    const word = this.current.word;
    const stem = word.one ?? word.word;
    const wrong = this.task.basket.filter((i) => !judgeGive(word, i, this.get).ok);
    const want = kind === 'one-for-many' ? wrong.find((i) => i.word === stem && !i.heap)
      : kind === 'many-for-one' ? wrong.find((i) => i.word === stem && i.heap) : undefined;
    return (want ?? wrong.find((i) => i.word !== stem) ?? wrong[0])?.key ?? null;
  }

  /** A drop: a basket key on the baby, or the baby on a station. */
  act(key: string, ghost = false): Promise<WishOutcome> {
    return this.task.kind === 'station' ? this.toStation(key as StationId, ghost) : this.give(key, ghost);
  }

  async give(key: string, ghost = false): Promise<WishOutcome> {
    if (this.done || this.task.kind === 'station') return 'ignored';
    const item = this.task.basket.find((i) => i.key === key);
    if (!item) return 'ignored';
    if (!ghost) this.touch();
    this.d.audio.act();
    const v = judgeGive(this.current.word, item, this.get);
    if (!v.ok) return this.miss(v.funny, key, v.error);
    return this.success();
  }

  async toStation(st: StationId, ghost = false): Promise<WishOutcome> {
    if (this.done || this.task.kind !== 'station') return 'ignored';
    if (!ghost) this.touch();
    this.d.audio.act();
    if (st !== this.task.station) return this.miss('wrong-station', st, 'other');
    return this.success();
  }

  private async miss(funny: WishFunny, key: string, error: ErrorTag): Promise<WishOutcome> {
    this.misses++;
    this.lastError = error;
    this.lastFunny = this.funnyShown.has(key) ? null : funny;   // a funny event once per item (spec 2.5 rule 6)
    this.funnyShown.add(key);
    this.glow = true;
    this.onchange();
    if (this.lastFunny) await this.d.audio.say('foal-silly');
    await this.d.audio.say('fb-letters');
    await this.d.hints.miss();
    return 'miss';
  }

  private async success(): Promise<WishOutcome> {
    const cur = this.current;
    const result = momentResult(this.misses, this.d.hints.level);
    const ms = Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt);
    const error = result === 'first' ? null : this.lastError;
    const log = learnLog(cur.served, { result, ms, place: this.opts.place, error }, cur.baby);
    if (this.task.kind === 'station') this.d.dispatch({ type: 'hb.care', baby: cur.baby, station: this.task.station!, learn: log });
    else if (log) this.d.dispatch({ type: 'hb.learn', payload: log.payload, baby: cur.baby });
    this.d.hints.end();
    const display = this.display;
    this.glow = false;
    this.lastFunny = null;
    this.fed = this.hungry;
    this.onchange();
    if (this.hungry) await this.d.audio.sfx('munch');
    // Reading: the word is said only after she acts. Display words first, then the carrier: two sentences (R36, AD5).
    await this.d.audio.sayAll([...display.map((w) => wordId(w)), cur.word.clip]);
    if (this.task.plural) await this.d.audio.say(cur.word.one ? 'fb-more-than-one' : 'fb-just-one');
    await this.d.audio.say(this.task.kind === 'station' ? (this.task.station === 'swing' ? 'foal-wee' : this.task.station === 'hay' ? 'foal-yum' : 'foal-cuddle')
      : this.hungry ? 'foal-yum' : 'foal-yay');
    if (this.task.kind === 'twin' && this.part === 'first') {
      this.part = 'second';
      this.funnyShown.clear();
      this.onchange();
      await this.begin();
      return 'next';
    }
    this.done = true;
    this.onchange();
    return 'ok';
  }
}
