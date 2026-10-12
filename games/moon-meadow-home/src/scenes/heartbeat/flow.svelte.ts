// The heartbeat runtime (contracts C7): egg, hatch, naming, first wish, move-in and a door visit, then home.
// The pure state machine is src/core/heartbeat/flow.ts; this file routes the scenes for each stage.
import { game } from '../../game.svelte.ts';
import { audio } from '../../audio/index.ts';
import { IDLE, moonHintDue, step, type HbSignal, type HbState } from '../../core/heartbeat/flow.ts';
import { findByLabel } from '../../ui/targets.ts';
import { ghost } from '../../ui/ghost-hand.svelte.ts';
import { sleep } from '../../platform/timing.ts';
import { pendingMoonNames } from './moon-name.ts';

export const heartbeatHooks: { onMovedIn: ((babyId: string) => void)[] } = { onMovedIn: [] };

/** Where the heartbeat goes home to. The meadow is places' scene (Task PL-A7). */
export const HOME_SCENE = 'meadow';

const rt = $state<{ state: HbState }>({ state: IDLE });
let moonVisit: string | null = null;   // the visit in which the moon's new name last played

const opts = () => ({ skipWishAfterThree: game.world?.settings.skipWishAfterThree ?? false });

/** Nest hatches since this visit started. */
function hatchesThisVisit(): number {
  const visits = game.state?.visits.list ?? [];
  const start = visits.length ? visits[visits.length - 1].start : 0;
  return game.world.herd.filter((b) => b.source === 'nest' && b.hatchedAt >= start).length;
}

function pendingMoon(): string[] {
  if (moonVisit !== null && moonVisit === game.visit) return [];
  return pendingMoonNames(game.world.herd, (n) => audio.hasName(n));
}

/** R54: once ever, in visit 1 after the third hatch, the ghost hand taps toward the moon button. */
async function moonHint(): Promise<void> {
  const w = game.world;
  if (!moonHintDue({ visitIndex: w.visitIndex, hatchesThisVisit: hatchesThisVisit(), announced: w.announced })) return;
  await sleep(600);
  const moon = findByLabel('moon');
  if (!moon || game.scene !== HOME_SCENE) return;   // no moon on screen: try again after the next heartbeat
  game.dispatch({ type: 'game/announce', opening: 'moon-hint' });
  void ghost.tap(moon, 2);
  await audio.say('g-moon');
}

async function route(): Promise<void> {
  const s = rt.state;
  switch (s.stage) {
    case 'egg-choice': await game.go('egg-choice'); break;
    case 'egg': if (game.scene !== 'nest') await game.go('nest'); break;
    case 'naming': await game.go('naming', { target: { kind: 'baby', baby: s.baby }, then: 'heartbeat' }); break;
    case 'wish': await game.go('wish', { baby: s.baby, then: 'heartbeat' }); break;
    case 'move-in': await game.go('stalls', { baby: s.baby, mode: 'move-in' }); break;
    case 'door-visit': break;   // the stables scene runs the visit itself
    case 'done': {
      const pending = pendingMoon();
      if (pending.length) {
        moonVisit = game.visit;
        await game.go('stalls', { baby: pending[0], mode: 'moon-name' });
        return;
      }
      await game.go(HOME_SCENE);
      await moonHint();
    }
  }
}

function send(sig: HbSignal): Promise<void> {
  const before = rt.state;
  rt.state = step(rt.state, sig, opts());
  return rt.state === before ? Promise.resolve() : route();
}

function firstUnnamed(): string | null {
  return game.world.herd.find((b) => b.name === null)?.id ?? null;
}

export const heartbeat = {
  get state(): HbState { return rt.state; },
  /** Starts a heartbeat: naming for a baby still without a name (R55, Review focus 3), else a new egg. */
  async start(): Promise<void> {
    await game.ready();
    if (rt.state.stage !== 'done') rt.state = { ...rt.state, stage: 'done', baby: null };
    await send({ s: 'start', unnamedBaby: firstUnnamed(), offerChoice: false });   // Task 25 sets offerChoice
  },
  /**
   * The nest scene calls this on mount. A visit that opens straight at the nest starts the heartbeat here.
   * Returns false when an unnamed baby was found and naming took over.
   */
  atNest(): boolean {
    if (rt.state.stage === 'egg') return true;
    const unnamed = firstUnnamed();
    if (unnamed) {
      rt.state = { ...IDLE, eggsInRow: rt.state.eggsInRow };
      void send({ s: 'start', unnamedBaby: unnamed, offerChoice: false });
      return false;
    }
    rt.state = { stage: 'egg', baby: null, eggsInRow: rt.state.stage === 'done' ? rt.state.eggsInRow : 0 };
    return true;
  },
  eggPicked(): Promise<void> { return send({ s: 'egg-picked' }); },
  hatched(baby: string): Promise<void> { return send({ s: 'hatched', baby }); },
  named(): Promise<void> { return send({ s: 'named' }); },
  wishDone(): Promise<void> { return send({ s: 'wish-done' }); },
  movedIn(baby: string, visit: boolean): Promise<void> {
    for (const f of heartbeatHooks.onMovedIn) {
      try { f(baby); } catch (e) { console.warn('[heartbeat] onMovedIn', e); }
    }
    return send({ s: 'moved-in', visit });
  },
  visitDone(): Promise<void> { return send({ s: 'visit-done' }); },
  left(): void { rt.state = step(rt.state, { s: 'left' }, opts()); },
  noteOtherActivity(): void { rt.state = step(rt.state, { s: 'other-activity' }, opts()); },
  /** A wish from the meadow (an asking bubble): the baby's wish, then back home. */
  async startWish(babyId: string): Promise<void> { await game.go('wish', { baby: babyId, then: HOME_SCENE }); },
  async startGoodnight(): Promise<void> { await game.go('goodnight'); },
  async nameBaby(babyId: string, onDone: () => void): Promise<void> {
    await game.go('naming', { target: { kind: 'baby', baby: babyId }, then: onDone });
  },
  /** A tap on a meadow baby whose invented name now has a clip plays the moon's new name (spec 2.8). */
  async tapBaby(babyId: string): Promise<boolean> {
    if (!pendingMoon().includes(babyId)) return false;
    moonVisit = game.visit;
    await game.go('stalls', { baby: babyId, mode: 'moon-name' });
    return true;
  },
};
