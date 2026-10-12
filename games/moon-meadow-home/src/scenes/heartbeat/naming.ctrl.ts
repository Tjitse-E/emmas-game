// The naming moment (spec 2.8): name bells, the name garden, first sounds and the gold bell. A bell or garden
// name is spelled with gems (own slots checked, gift slots given); the gold bell builds any name and checks it.
import type { Slot as PickSlot } from '../../types/contracts.ts';
import type { ErrorTag, NameEntry, NameRoute, NameTarget, Served } from '../../core/heartbeat/types.ts';
import { type GardenGroup, bellsFor, gardenNames, namesByFirstSound } from '../../core/naming/bells.ts';
import { type Blocklist, blockedName } from '../../core/naming/blocklist.ts';
import {
  MAX_SLOTS, MIN_SLOTS, START_SLOTS, canAddSlot, canRemoveSlot, checkBuild, displayName, judgeSlot, namingResults, ordinalFor, ordinalLine,
} from '../../core/naming/check.ts';
import { type Slot, type SpellCtx, giftSlots, ownCount } from '../../core/naming/gifts.ts';
import { type Phoneme, gemSoundKey, phonemeSoundKey } from '../../core/naming/sounds.ts';
import { capitalOf, goldTray, planNameTray } from '../../core/naming/tray.ts';
import { slugName } from '../../core/keys.ts';
import type { LearnLog } from '../../core/actions/heartbeat.ts';
import { learnLog, pickFor } from './learn-bridge.ts';
import type { SceneDeps } from './deps.ts';

export type NamingMode = 'pick' | 'spell' | 'gold' | 'done';
export type SlotState = { slot: Slot; gem: string | null; misses: number; ghost: boolean; hum: boolean };
/** The name she gave. clipKey: the name clip that says it, null for a name Elizabeth cannot say yet. */
export type Named = {
  name: string; gems: string[]; listName: string | null; clipKey: string | null; ordinal: number; route: NameRoute; unknown: boolean;
};
export type NamingInput = {
  target: NameTarget; served: Served; ctx: SpellCtx; bank: NameEntry[]; index: Map<string, NameEntry>;
  blocklist: Blocklist; herd: { id: string; name: string | null; gems: string[] }[]; spellingBehind: boolean;
  /** True when learning has this item id (spelled slots map to 's:g:<gpc>'). Default: every id. */
  hasItem?: (id: string) => boolean;
  /** The slot of the S11 capital result: 'current' while S11 is her step, else 'review'. */
  capitalSlot?: PickSlot;
};

const GRAPHEME = /^[a-z]+(-e)?$/;

export class NamingCtrl {
  mode: NamingMode = 'pick';
  bells: NameEntry[] = [];
  route: NameRoute = 'bell';
  chosen: NameEntry | null = null;
  slots: SlotState[] = [];
  tray: string[] = [];
  capital: { misses: number; ghost: boolean } | null = null;
  gold: (string | null)[] = Array(START_SLOTS).fill(null);
  readonly goldGems: string[];
  readonly goldFront: boolean;
  named: Named | null = null;
  onchange: () => void = () => {};
  /** The scene shows the ghost hand before the level 3 hint fills the slots. */
  onghost: (moves: { slot: number; gem: string }[]) => Promise<void> = async () => {};
  private readonly offered = new Set<string>();
  private lastError: ErrorTag | null = null;
  private startedAt = 0;
  private firstTouch: number | null = null;
  private i: NamingInput;
  private d: SceneDeps;

  constructor(i: NamingInput, d: SceneDeps) {
    this.i = i;
    this.d = d;
    this.goldFront = !i.spellingBehind;   // spec 3.6: bells and garden in front when spelling falls behind
    this.goldGems = goldTray(i.ctx, i.herd.map((b) => b.gems));
    this.shake();
  }

  get showBells(): boolean { return this.bells.length > 0; }
  get target(): NameTarget { return this.i.target; }
  private changed(): void { this.onchange(); }
  private touch(): void { if (this.firstTouch === null) this.firstTouch = this.d.now(); this.d.hints.touch(); }
  private ms(): number { return Math.max(0, (this.firstTouch ?? this.d.now()) - this.startedAt); }
  private herdKeys(): Set<string> { return new Set(this.i.herd.filter((b) => b.name).map((b) => slugName(b.name!))); }
  private hasClip = (k: string): boolean => this.d.audio.hasName(k);
  private babyId(): string | null { return this.i.target.kind === 'baby' ? this.i.target.baby : null; }
  private remember(list: NameEntry[]): void { for (const b of list) this.offered.add(b.key); }
  private goalLine(): string { return this.mode === 'gold' ? 'g-gold' : this.mode === 'spell' ? 'g-spell' : 'g-bells'; }

  shake(): void {
    if (this.mode !== 'pick') return;
    const prefer = GRAPHEME.test(this.i.served.id) ? this.i.served.id : null;
    this.bells = bellsFor({ bank: this.i.bank, ctx: this.i.ctx, herdNames: this.herdKeys(), offered: this.offered, hasClip: this.hasClip, rng: this.d.rng, prefer });
    if (!this.bells.length) {
      // Every bell name was offered once: offer them again rather than an empty row.
      this.offered.clear();
      this.bells = bellsFor({ bank: this.i.bank, ctx: this.i.ctx, herdNames: this.herdKeys(), offered: this.offered, hasClip: this.hasClip, rng: this.d.rng, prefer });
    }
    this.remember(this.bells);
    this.route = 'bell';
    this.changed();
  }
  garden(group: GardenGroup): void {
    if (this.mode !== 'pick') return;
    this.touch();
    this.bells = gardenNames({ bank: this.i.bank, group, hasClip: this.hasClip, offered: new Set(), rng: this.d.rng });
    this.remember(this.bells);
    this.route = 'garden-pic';
    this.changed();
  }
  firstSound(p: Phoneme): void {
    if (this.mode !== 'pick') return;
    this.touch();
    this.bells = namesByFirstSound({ bank: this.i.bank, first: p, hasClip: this.hasClip, offered: new Set(), rng: this.d.rng });
    this.remember(this.bells);
    this.route = 'garden-sound';
    this.changed();
  }

  async begin(): Promise<void> {
    this.startedAt = this.d.now();
    // Review focus 4: no bell names left, so the gold bell opens and the bell row is never empty.
    if (!this.showBells) this.openGold();
    this.d.hints.begin({
      step: this.i.served.step,
      repeat: () => this.d.audio.say(this.goalLine()),
      focused: async () => { if (this.mode === 'spell') await this.slowSounds(); else await this.d.audio.say(this.goalLine()); },
      answer: async () => {
        if (this.mode !== 'spell') return;
        const moves = this.answerMoves();
        await this.onghost(moves);
        for (const m of moves) this.dropGem(m.slot, m.gem, true);
      },
      target: () => (this.mode === 'pick' && this.bells[0] ? `bell ${this.bells[0].name}` : null),
    });
    await this.d.audio.say(this.goalLine());
  }

  /** A bell rings: Elizabeth asks the name ("Pip?"). Emma asked for it, so it is never cut off. */
  async ring(key: string): Promise<void> {
    const e = this.bells.find((b) => b.key === key);
    if (!e) return;
    this.touch();
    await this.d.audio.sayName(e.name, '?');
  }

  async choose(key: string): Promise<void> {
    const e = this.bells.find((b) => b.key === key);
    if (!e || this.mode !== 'pick') return;
    this.touch();
    this.d.audio.act();
    this.chosen = e;
    const slots = giftSlots(e.split, this.i.ctx);
    this.capital = this.i.ctx.reached('S11') && slots[0]?.own ? { misses: 0, ghost: false } : null;
    this.slots = slots.map((slot) => ({ slot, gem: slot.own ? null : slot.g, misses: 0, ghost: false, hum: false }));
    this.tray = planNameTray({
      slots, scaffold: this.i.served.scaffold, ctx: this.i.ctx, blocked: (g) => blockedName(g, this.i.blocklist) !== null, rng: this.d.rng,
    });
    this.mode = 'spell';
    this.lastError = null;
    this.changed();
    if (ownCount(slots) === 0) { await this.finishSpelled(); return; }   // every gem is a gift: she just picks the name
    this.startedAt = this.d.now();
    this.firstTouch = null;
    this.d.hints.begin({
      step: this.i.served.step,
      repeat: async () => { await this.d.audio.say('g-spell'); await this.d.audio.sayName(e.name, '!'); },
      focused: () => this.slowSounds(),
      answer: async () => {
        const moves = this.answerMoves();
        await this.onghost(moves);
        for (const m of moves) this.dropGem(m.slot, m.gem, true);
      },
      target: () => { const m = this.answerMoves()[0]; return m ? `gem ${m.gem}` : 'star'; },
    });
    // Spelling always says the target first.
    await this.d.audio.say('g-spell');
    await this.d.audio.sayName(e.name, '!');
  }

  private soundOf(s: SlotState): string | null {
    return !s.slot.own && s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(s.gem ?? s.slot.g);
  }

  private async slowSounds(): Promise<void> {
    await this.d.audio.say('h-sounds');
    for (const s of this.slots) {
      const k = s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(s.slot.g);
      if (k) { await this.d.audio.sound(k); await this.d.pause(500); }
    }
  }

  dropGem(slot: number, gem: string, ghost = false): boolean {
    const s = this.slots[slot];
    if (!s || !s.slot.own || this.mode !== 'spell') return false;
    if (!ghost) this.touch();
    s.gem = gem;
    s.hum = false;
    if (ghost) { s.ghost = true; if (slot === 0 && this.capital) this.capital.ghost = true; }
    this.changed();
    return true;
  }
  clearSlot(slot: number): void {
    const s = this.slots[slot];
    if (s?.slot.own && this.mode === 'spell') { s.gem = null; this.changed(); }
  }

  /** The gems that spell the name from here, slot by slot (the capital in slot one from S11). */
  answerMoves(): { slot: number; gem: string }[] {
    return this.slots
      .filter((s) => s.slot.own)
      .map((s) => ({ slot: s.slot.index, gem: s.slot.index === 0 && this.capital ? capitalOf(s.slot.g) : s.slot.g.toLowerCase() }))
      .filter((m) => this.slots[m.slot].gem !== m.gem);
  }

  private lastSounding(): number {
    let last = -1;
    this.slots.forEach((s, idx) => { if (s.slot.ph.length) last = idx; });
    return last;
  }

  async slide(): Promise<'incomplete' | 'wrong' | 'right'> {
    if (this.mode !== 'spell' || !this.chosen) return 'incomplete';
    this.touch();
    this.d.audio.act();
    if (this.slots.some((s) => s.slot.own && s.gem === null)) { await this.d.audio.say('g-gems'); return 'incomplete'; }
    for (const s of this.slots) { const k = this.soundOf(s); if (k) await this.d.audio.sound(k); }
    const last = this.lastSounding();
    let wrong = false;
    const said = this.slots.map((s) => s.gem);
    for (const s of this.slots) {
      if (!s.slot.own) continue;
      const j = judgeSlot(s.slot, s.gem!, this.capital !== null, s.slot.index === last);
      if (j.ok) continue;
      wrong = true;
      if (j.capitalMiss) this.capital!.misses++;
      else { s.misses++; this.lastError = j.error; }
      s.gem = null;
      s.hum = true;
    }
    this.changed();
    if (!wrong) { await this.finishSpelled(); return 'right'; }
    // Spec 2.5: "That says p, i, t. Listen: Pip." Then each humming slot plays the sound it needs.
    await this.d.audio.say('fb-that-says');
    for (const [i, s] of this.slots.entries()) {
      const g = said[i] ?? s.slot.g;
      const k = !s.slot.own && s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(g);
      if (k) await this.d.audio.sound(k);
    }
    await this.d.audio.say('g-listen');
    await this.d.audio.sayName(this.chosen.name, '!');
    for (const s of this.slots) {
      if (!s.hum) continue;
      const k = s.slot.ph.length === 1 ? phonemeSoundKey(s.slot.ph[0]) : gemSoundKey(s.slot.g);
      if (k) await this.d.audio.sound(k);
    }
    await this.d.hints.miss();
    return 'wrong';
  }

  /** Learning item id of a spelled slot ('s:g:k'; at S01 the first sound 's:fs:k'). Null when learning has none. */
  private itemOf(slot: Slot): string | null {
    const gpc = this.chosen?.split[slot.index]?.gpc ?? slot.g.toLowerCase();
    const id = this.i.served.step === 'S01' ? `s:fs:${gpc}` : `s:g:${gpc}`;
    return (this.i.hasItem ?? (() => true))(id) ? id : null;
  }

  /** The learning results of what she spelled: one with an item per own slot, and the S11 capital as its own. */
  private logs(outcomes: { slot: Slot; misses: number; ghost: boolean }[], capital: { misses: number; ghost: boolean } | null): LearnLog[] {
    const drafts = namingResults({
      carrier: this.chosen!.name, served: this.i.served, slots: outcomes, capital,
      hintLevel: this.d.hints.level, ms: this.ms(), error: this.lastError,
    });
    const baby = this.babyId();
    const out: LearnLog[] = [];
    for (const dr of drafts) {
      if (dr.step === 'S11' && capital) {
        const p = this.i.served.pick;
        if (!p) continue;
        const cap = { ...this.i.served, pick: pickFor(p, 'S11', ['s:cap:name'], this.i.capitalSlot ?? 'review') };
        const log = learnLog(cap, { result: dr.result, ms: dr.ms, place: 'naming' }, baby);
        if (log) out.push(log);
        continue;
      }
      const slots = outcomes.filter((o) => o.slot.own).map((o, k) => ({ id: this.itemOf(o.slot), r: dr.items[k]?.result ?? dr.result }))
        .filter((x): x is { id: string; r: typeof dr.result } => x.id !== null);
      if (!slots.length) continue;
      const log = learnLog(this.i.served, { result: dr.result, ms: dr.ms, place: 'naming', error: dr.error ?? null, slots }, baby);
      if (log) out.push(log);
    }
    return out;
  }

  private async finishSpelled(): Promise<void> {
    const e = this.chosen!;
    const gems = this.slots.map((s) => s.gem ?? s.slot.g);
    const learn = this.logs(this.slots.map((s) => ({ slot: s.slot, misses: s.misses, ghost: s.ghost })), this.capital);
    const route = this.route === 'gold' ? 'bell' : this.route;
    this.d.dispatch({ type: 'naming.spelled', target: this.i.target, route, gems, phonemes: e.ph, listName: e.name, learn });
    this.d.hints.end();
    await this.d.audio.say('fb-spelled');
    await this.assign(e.name, gems, e.name, route, false);
  }

  openGold(keep?: (string | null)[]): void {
    if (this.mode === 'done') return;
    this.mode = 'gold';
    const k = (keep ?? []).slice(0, MAX_SLOTS);
    this.gold = k.length >= MIN_SLOTS ? [...k] : [...k, ...Array(START_SLOTS - k.length).fill(null)];
    this.changed();
  }

  /** She leaves a bell name for the gold bell: her gems stay, and what she spelled so far is logged. */
  async switchToGold(): Promise<void> {
    if (this.mode !== 'spell') { this.openGold(); return; }
    const filled = this.slots.filter((s) => s.slot.own && s.gem !== null);
    if (filled.length >= 2) {
      const last = this.lastSounding();
      const outcomes = this.slots.filter((s) => s.slot.own && s.gem !== null).map((s) => {
        const j = judgeSlot(s.slot, s.gem!, false, s.slot.index === last);
        return { slot: s.slot, misses: s.misses + (j.ok ? 0 : 1), ghost: s.ghost };
      });
      const learn = this.logs(outcomes, null);
      if (learn.length) this.d.dispatch({ type: 'naming.partial', learn });
    }
    this.d.hints.end();
    this.openGold(this.slots.map((s) => s.gem));
  }

  goldDrop(slot: number, gem: string): void {
    if (this.mode !== 'gold' || slot < 0 || slot >= this.gold.length) return;
    this.touch();
    this.gold[slot] = gem;
    this.changed();
  }
  goldClear(slot: number): void {
    if (this.mode === 'gold' && slot >= 0 && slot < this.gold.length) { this.gold[slot] = null; this.changed(); }
  }
  addSlot(): boolean {
    if (this.mode !== 'gold' || !canAddSlot(this.gold.length)) return false;
    this.gold.push(null);
    this.changed();
    return true;
  }
  removeSlot(slot: number): boolean {
    if (this.mode !== 'gold' || !canRemoveSlot(this.gold.length) || this.gold[slot] !== null) return false;
    this.gold.splice(slot, 1);
    this.changed();
    return true;
  }

  async goldSlide(): Promise<'incomplete' | 'no-vowel' | 'blocked' | 'list' | 'unknown'> {
    if (this.mode !== 'gold') return 'incomplete';
    this.touch();
    this.d.audio.act();
    const gems = this.gold.filter((g): g is string => g !== null);
    if (gems.length < MIN_SLOTS) { await this.d.audio.say('g-gems'); return 'incomplete'; }
    const outcome = checkBuild(gems, this.i.index, this.i.blocklist);
    this.d.dispatch({ type: 'naming.gold', target: this.i.target, gems, outcome });
    // A blocked build is never played back: its gems shake out with a giggle.
    if (outcome.outcome !== 'blocked') for (const g of gems) { const k = gemSoundKey(g); if (k) await this.d.audio.sound(k); }
    switch (outcome.outcome) {
      case 'no-vowel':
        await this.d.audio.say('fb-no-vowel');
        return 'no-vowel';
      case 'blocked':
        this.gold = this.gold.map(() => null);
        this.changed();
        await this.d.audio.say('foal-silly');
        await this.d.audio.say('fb-silly');
        return 'blocked';
      case 'list':
        this.d.hints.end();
        if (this.d.audio.hasName(outcome.entry.name)) { await this.d.audio.sayName(outcome.entry.name, '!'); await this.d.audio.say('fb-gold-yes'); }
        else await this.d.audio.say('fb-tricky');
        await this.assign(displayName(gems), gems, outcome.entry.name, 'gold', false);
        return 'list';
      case 'unknown':
        this.d.hints.end();
        await this.d.audio.say('fb-tricky');
        await this.assign(displayName(gems), gems, null, 'gold', true);
        return 'unknown';
    }
  }

  private async assign(name: string, gems: string[], listName: string | null, route: NameRoute, unknown: boolean): Promise<void> {
    const self = this.babyId();
    const ordinal = self ? ordinalFor(name, this.i.herd, self) : 1;
    const clipKey = listName && this.d.audio.hasName(listName) ? slugName(listName) : null;
    this.named = { name, gems, listName, clipKey, ordinal, route, unknown };
    if (self) this.d.dispatch({ type: 'naming.assign', baby: self, name, gems, route, listName });
    this.mode = 'done';
    this.changed();
    if (route !== 'gold' && listName) await this.d.audio.sayName(listName, '!');
    const ol = ordinalLine(ordinal);
    if (ol) await this.d.audio.say(ol);
    if (self) await this.d.audio.say('foal-yay');
  }
}
