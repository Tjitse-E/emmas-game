// Goodnight (spec 2.7, 3.7; docs/v3/next/plan.md N18): the stage machine
// walk -> herd-in -> manger -> free -> bed -> sky -> sky-name -> bye.
// The lantern walk leads named babies in at dusk, the rest of the herd trots in by itself, the babies eat at their
// mangers (lane feed's MangerFeed), she taps the moon when it is bedtime, the door pick and tucking in happen in
// bed, the window opens the sky with the herd count and a sky unicorn to name, then Lumi says goodnight.
// Stages skip when empty: an empty herd skips walk and herd-in, a long visit or no mangers skip manger and free.
import { goodnightCountLines, skyState } from '../../core/heartbeat/sky.ts';
import type { Named } from './naming.ctrl.ts';
import type { SceneDeps } from './deps.ts';
import { WalkCtrl, type WalkInput } from './walk.ctrl.ts';
import { StableCtrl, type StableInput } from './stable.ctrl.ts';

export type GoodnightStage = 'walk' | 'herd-in' | 'manger' | 'free' | 'bed' | 'sky' | 'sky-name' | 'bye';

export type GoodnightInput = {
  herdCount: number; skyNames: (string | null)[];
  /** The lantern walk, or null when no baby stands on the dusk meadow. */
  walk: WalkInput | null;
  stable: StableInput;
  /** The manger part runs: mangers on screen and not a long visit (N20). */
  mangers: boolean;
  /** A long visit: no g-tuck, and the window comes straight after the door pick (N20, N3). */
  long: boolean;
};

/** Pauses of the stages that need no input (scaled by the test speed, so fast mode makes them milliseconds). */
export const HERD_TROT_MS = 1600;
export const HERD_WALK_MS = 2200;
export const MOON_SAY_MS = 2600;
export const WINDOW_IDLE_MS = 8000;

/** The printed herd count: "41 unicorns", "1 unicorn". */
export function countText(n: number): string {
  return `${n} ${n === 1 ? 'unicorn' : 'unicorns'}`;
}

export class GoodnightCtrl {
  stage: GoodnightStage;
  /** Every stage entered this goodnight, in order. */
  readonly stages: GoodnightStage[] = [];
  /** herd-in: false while the others trot along the path, true once the stable is on screen. */
  inside = false;
  /** bed: the stable window is on screen. */
  windowShown = false;
  showCount = false;
  onchange: () => void = () => {};
  /** The scene shows the ghost hand on the moon or the window (idle level 3). It never presses it. */
  onghost: (label: string) => Promise<void> = async () => {};
  /** The scene lights the moon or the window with the moonbeam when the goal is said again (idle level 1). */
  onbeam: (label: string) => void = () => {};
  readonly walk: WalkCtrl | null;
  readonly stable: StableCtrl;
  readonly countText: string;
  private readonly i: GoodnightInput;
  private readonly d: SceneDeps;
  private windowSaid = false;
  private started = false;

  constructor(i: GoodnightInput, d: SceneDeps) {
    this.i = i;
    this.d = d;
    this.countText = countText(i.herdCount);
    this.walk = i.walk && i.walk.dusk.length ? new WalkCtrl(i.walk, d) : null;
    this.stable = new StableCtrl(i.stable, d);
    this.stage = this.walk ? 'walk' : 'bed';
    if (this.walk) {
      this.walk.onchange = () => this.onchange();
      this.walk.ondone = () => { void this.herdIn(); };
    }
    this.stable.onchange = () => this.onchange();
    this.stable.ondoor = () => { void this.afterDoor(); };
    this.stable.ontuck = () => { void this.firstTuck(); };
  }

  private enter(s: GoodnightStage): void {
    this.stage = s;
    if (this.stages[this.stages.length - 1] !== s) this.stages.push(s);
    this.onchange();
  }

  /** Starts the first stage. Safe to call twice. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    if (this.walk) { this.enter('walk'); await this.walk.begin(); return; }
    await this.bed();
  }

  /** The rest of the herd trots in by itself, then every baby walks from the stable door to its stall. */
  async herdIn(): Promise<void> {
    if (this.stage !== 'walk') return;
    this.inside = false;
    this.enter('herd-in');
    if (this.i.herdCount > (this.walk?.led.length ?? 0)) await this.d.audio.say('g-herd-in');
    await this.d.pause(HERD_TROT_MS);
    this.inside = true;
    this.onchange();
    await this.d.pause(HERD_WALK_MS);
    if (this.i.mangers) this.enter('manger');
    else await this.bed();
  }

  /** Lane feed's checked manger moment is over (or there was none): free feeding until she taps the moon. */
  async mangerDone(): Promise<void> {
    if (this.stage !== 'manger') return;
    this.enter('free');
    const say = () => this.d.audio.say('g-moon');
    this.d.hints.begin({
      step: null, repeat: () => { this.onbeam('moon'); return say(); }, focused: say,
      // Idle level 3 only shows the moon (N3): she may still be feeding, so the ghost never ends free feeding.
      answer: async () => { await this.onghost('moon'); },
      target: () => (this.stage === 'free' ? 'moon' : null),
    });
    // After lane feed's g-feed-free. Not awaited, so a moon tap never waits for it.
    void this.d.pause(MOON_SAY_MS).then(() => (this.stage === 'free' ? say() : undefined));
  }

  /** Any touch during free feeding or bed keeps the idle hints quiet. */
  touch(): void { if (this.stage === 'free' || this.stage === 'bed') this.d.hints.touch(); }

  /** A tap on the moon: bedtime. */
  async moon(): Promise<'ok' | 'ignored'> {
    if (this.stage !== 'free') return 'ignored';
    this.d.audio.act();
    this.d.hints.end();
    await this.bed();
    return 'ok';
  }

  /** The lantern dims and the babies lie down; the door pick when there is one, then tucking and the window. */
  private async bed(): Promise<void> {
    this.enter('bed');
    if (this.stable.doorOpen) await this.stable.beginDoor();
    else await this.afterDoor();
  }

  private async afterDoor(): Promise<void> {
    if (this.stage !== 'bed' || this.windowShown) return;
    if (!this.i.long) await this.d.audio.say('g-tuck');
    this.windowShown = true;
    this.onchange();
    const say = () => this.d.audio.say('g-window');
    this.d.hints.begin({
      step: null, repeat: () => { this.onbeam('window'); return say(); }, focused: say,
      answer: async () => { await this.onghost('window'); },
      target: () => (this.stage === 'bed' && this.windowShown ? 'window' : null),
    });
    if (this.i.long) { await this.sayWindow(); return; }
    // g-window after the first tuck, or after 8 s without one. Not awaited, so a window tap never waits for it.
    void this.d.pause(WINDOW_IDLE_MS).then(() => this.sayWindow());
  }

  private async firstTuck(): Promise<void> {
    if (this.windowShown) await this.sayWindow();
  }

  private async sayWindow(): Promise<void> {
    if (this.windowSaid || this.stage !== 'bed') return;
    this.windowSaid = true;
    await this.d.audio.say('g-window');
  }

  /** A tap on the stable window: the sky. */
  async window(): Promise<'ok' | 'ignored'> {
    if (this.stage !== 'bed' || !this.windowShown) return 'ignored';
    this.d.audio.act();
    this.d.hints.end();
    this.enter('sky');
    return 'ok';
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
    this.enter(next === null ? 'bye' : 'sky-name');
    if (next !== null) await this.d.audio.say('g-sky-name');
    return next;
  }

  skyNamed(index: number, n: Named): void {
    this.d.dispatch({ type: 'hb.sky-named', index, name: n.name });
    this.enter('bye');
  }

  async bye(): Promise<void> {
    this.enter('bye');
    await this.d.audio.say('lumi-goodnight-emma');
  }
}
