// The choice hub of 2.4.0 (docs/v4/2.4.md sections 5.2 and 5.6; docs/v4/2.4-plan.md Tasks 1 to 6): the play clock,
// its cutoffs and bedtime at 30 minutes; the refill, the play bubbles and done early; walking near, the nudge and the
// pond visit; the play's shape and the start options. The rules are pure (src/game/hub.ts, the pure parts of
// hub-part.ts and level.ts), so most tests drive them without a world.
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrincessMode } from '../src/contracts';
import { CORNER, NEST, PICNIC, SLIDE } from '../src/layout';
import { DEFAULT_LOOK } from '../src/wardrobe';

/** What Elizabeth (audio.sayAll) and Lumi (layer.lumi.speak) said, in order. */
const t = vi.hoisted(() => ({ said: [] as string[], speaking: false }));
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});
vi.mock('../src/audio', () => ({
  audio: {
    sfx: async () => {}, say: async () => {}, sayAll: async (ids: string[]) => void t.said.push(...ids), sayWhole: async (ids: string[]) => (t.said.push(...ids), true),
    preload: async () => [], fx: async () => {}, checked: () => {}, stop: () => {}, ambience: () => {},
    get speaking() {
      return t.speaking;
    },
  },
}));
// The places themselves are the other lanes' and 2.3's (tests/world-quests.test.ts): here each resolves at once.
vi.mock('../src/game/eggs-part', async (importOriginal) => ({ ...(await importOriginal<object>()), eggPlace: async () => () => {} }));
vi.mock('../src/game/quests', async (importOriginal) => ({
  ...(await importOriginal<object>()), picnicQuest: async () => () => {}, rackQuest: async () => () => {}, hungryHerd: () => {},
}));
vi.mock('../src/game/beads', () => ({ beadsQuest: async () => () => {} }));
vi.mock('../src/game/corner', () => ({ cornerQuest: async () => () => {}, trunkTap: () => false }));
vi.mock('../src/game/quest-kit', async (importOriginal) => ({ ...(await importOriginal<object>()), giveGift: async () => null }));

import {
  BEDTIME_MS, type HubCtx, type HubPlace, type HubState, KIND, LEARNING, LETTER, PLACE_LIMIT, STRANDS, bedtimeDue, cutoffs, isLeft, isPast,
  placeEnded, refill, startHub, tickPlay,
} from '../src/game/hub';
import { Run } from '../src/game/run';
import { randomHistory } from './hub-sim';
import { askPlace, firstLearning, hub, installPlayClock, nudgeDue, visitOver, walkEndStart, walkEnded } from '../src/game/hub-part';
import { type Game, startClock, startQuests } from '../src/game/game';
import { Followers } from '../src/game/followers';
import { Results } from '../src/game/results';
import { createSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';
import { createStreams } from '../src/game/streams';
import { startMaths } from '../src/game/band';
import { hubAt, opening, spotsOf } from '../src/game/level';
import { resolveStart } from '../src/game/options';
import { mathsQuestFor } from '../src/game/quest-kit';
import { parseSave } from '../src/game/save';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;

describe('the play clock', () => {
  it('cuts off rides at 26:00, eggs at 27:00 and everything at 29:00, checks done early last at 28:00 with a 2-minute wait, and scales a short ?bed=', () => {
    expect(cutoffs(BEDTIME_MS)).toEqual({ ride: 26 * 60_000, egg: 27 * 60_000, all: 29 * 60_000, early: 28 * 60_000, wait: 120_000, bed: 30 * 60_000 });
    expect(cutoffs(90_000)).toEqual({ ride: 78_300, egg: 81_000, all: 87_300, early: 83_700, wait: 6_300, bed: 90_000 });
    expect(cutoffs(5 * 60_000)).toMatchObject({ ride: 60_000, wait: 120_000 });
  });

  it('counts frame deltas capped at 1 s, and not while paused; the idle counts only in the hub with no place running', () => {
    const h = startHub();
    tickPlay(h, 16, { paused: false, hub: true });
    tickPlay(h, 5_000, { paused: false, hub: true });
    tickPlay(h, 500, { paused: true, hub: true });
    expect([h.playMs, h.idleMs, h.nudgeIdleMs]).toEqual([1016, 1016, 1016]);
    h.running = 'picnic';
    tickPlay(h, 1000, { paused: false, hub: true });
    tickPlay(h, 1000, { paused: false, hub: false });
    expect([h.playMs, h.idleMs, h.nudgeIdleMs]).toEqual([3016, 1016, 1016]);
  });

  it('bedtime waits for a place asked before its cutoff', () => {
    // Review Focus 1: a ride asked at 25:59.9 runs home in full, and bedtime waits for it and for the wardrobe.
    const h = startHub();
    h.playMs = 26 * 60_000 - 100;
    expect(isPast(h, 'ride')).toBe(false);
    h.running = 'ride';
    h.playMs = 31 * 60_000;
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    h.running = null;
    expect(bedtimeDue(h, { dressing: true })).toBe(false);
    expect(bedtimeDue(h, { dressing: false })).toBe(true);
    h.playMs = 26 * 60_000;
    expect(isPast(h, 'ride')).toBe(true);
  });

  it('starts bedtime before 30:00 only after done early', () => {
    const h = startHub();
    h.playMs = 29 * 60_000 + 59_000;
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
  });

  it('cuts the eggs at the egg cutoff and every other place at the last one', () => {
    const h = startHub(90_000);
    h.playMs = 81_000;
    expect([isPast(h, 'egg'), isPast(h, 'shore'), isPast(h, 'picnic'), isPast(h, 'pond')]).toEqual([true, true, false, false]);
    h.playMs = 87_300;
    expect([isPast(h, 'picnic'), isPast(h, 'corner'), isPast(h, 'wish')]).toEqual([true, true, true]);
  });

  it('leaves the start mirror, the Corner music box and the time before Play out of the play clock', () => {
    const frames: (() => void)[] = [];
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const g = { world: { onFrame: (fn: () => void) => frames.push(fn) }, part: 'start', hub: startHub(), clock: startClock(), quests: startQuests() } as unknown as Game;
    installPlayClock(g);
    const frame = (ms: number) => {
      now += ms;
      for (const f of frames) f();
    };
    frame(500);
    expect(g.hub.playMs).toBe(0);
    g.part = 'wardrobe';
    g.clock.mirror = true;
    frame(500);
    expect(g.hub.playMs).toBe(0);
    g.clock.mirror = false;
    g.part = 'welcome';
    frame(400);
    g.part = 'hub';
    g.quests.dressing = true;
    frame(600);
    expect([g.hub.playMs, g.clock.dressMs.corner]).toEqual([400, 600]);
    g.quests.dressing = false;
    frame(5_000);
    expect(g.hub.playMs).toBe(1400);
    vi.restoreAllMocks();
  });

  it("until() that resolves leaves the run's deferred list as it was", async () => {
    const frames = new Set<(dt: number, t: number) => void>();
    const run = new Run((fn) => (frames.add(fn), () => frames.delete(fn)));
    const before = run.deferred;
    const p = run.until(() => true);
    for (const f of frames) f(0.016, 0);
    await p;
    expect(run.deferred).toBe(before);
  });
});

const c = (o: Partial<HubCtx> = {}): HubCtx => ({ maths: 'beads', wishBaby: true, moments: { r: 0, m: 0 }, ...o });
/** In the hub, no place running, 1 s frames. */
const idle = (h: HubState, ms: number) => {
  for (let t = 0; t < ms; t += 1000) tickPlay(h, 1000, { paused: false, hub: true });
};
const visit = (h: HubState, p: HubPlace, ms: number) => {
  h.running = p;
  for (let t = 0; t < ms; t += 1000) tickPlay(h, 1000, { paused: false, hub: true });
  h.running = null;
  placeEnded(h, p, c());
};
const allButWish = (): HubState => {
  const h = startHub();
  h.done = ['egg', 'shore', 'ride', 'picnic', 'ride', 'beads', 'wish'];
  h.shoreLanded = true;
  h.playMs = 20 * 60_000;
  return h;
};

describe('the refill', () => {
  it('has the limits, the kinds, the strands and the letters of 5.2 and 5.8', () => {
    expect(PLACE_LIMIT).toEqual({ egg: 1, shore: 1, wish: 2, picnic: 1, beads: 1, rack: 1, ride: 2, corner: 1, pond: Infinity });
    expect([...LEARNING].sort()).toEqual(['beads', 'egg', 'picnic', 'rack', 'ride', 'shore', 'wish']);
    expect(KIND.egg).toBe(KIND.shore);
    expect(KIND.beads).toBe(KIND.rack);
    expect(STRANDS).toMatchObject({ egg: ['r', 'm'], ride: ['r', 'm'], picnic: ['r'], wish: ['r'], beads: ['m'], rack: ['m'], corner: [], pond: [] });
    expect(Object.values(LETTER).join('')).toBe('eswpbkrco');
  });

  it('opens play 2 with the nest egg, the ride and the picnic', () => expect(refill(startHub(), c())).toEqual(['egg', 'ride', 'picnic']));

  it("after the first play's forced egg shows the ride, the picnic, the bead tree and the Corner", () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    h.shown = refill(h, c({ moments: { r: 2, m: 3 } }));
    expect(h.shown).toEqual(['ride', 'picnic', 'beads', 'corner']);
  });

  it('shows the hay rack in its turn, and a herd baby wish only when one can wait', () => {
    const h = startHub();
    placeEnded(h, 'egg', c({ maths: 'rack' }));
    expect(refill(h, c({ maths: 'rack', moments: { r: 2, m: 3 } }))).toEqual(['ride', 'picnic', 'rack', 'corner']);
    const w = startHub();
    w.done = ['egg', 'ride', 'beads'];
    expect(refill(w, c())).toContain('wish');
    expect(refill(w, c({ wishBaby: false }))).not.toContain('wish');
  });

  it('lands the shore egg after the nest egg and one more learning place, between places', () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    expect(h.shoreLanded).toBe(false);
    placeEnded(h, 'pond', c());
    expect(h.shoreLanded).toBe(false);
    placeEnded(h, 'picnic', c());
    expect(h.shoreLanded).toBe(true);
  });

  it('lands the shore egg at once after the nest egg when no other learning place is left', () => {
    const h = startHub();
    h.done = ['ride', 'picnic', 'ride', 'beads', 'wish', 'wish'];
    placeEnded(h, 'egg', c());
    expect(h.shoreLanded).toBe(true);
    expect(refill(h, c())).toContain('shore');
    expect(h.early).toBeNull();
  });

  it('never brings back the kind just finished, and brings a missing strand first at the next refill', () => {
    const h = startHub();
    h.done = ['egg', 'shore', 'beads'];
    h.shoreLanded = true;
    placeEnded(h, 'ride', c());
    expect(refill(h, c())).not.toContain('ride');
    expect(isLeft(h, 'ride', c())).toBe(false);
    placeEnded(h, 'picnic', c());
    expect(refill(h, c())[0]).toBe('ride');
  });

  it('brings ride 2 or wish 2 back at once when it is the only learning place left', () => {
    const r = startHub();
    r.done = ['egg', 'shore', 'picnic', 'beads', 'wish', 'wish'];
    r.shoreLanded = true;
    placeEnded(r, 'ride', c());
    expect(refill(r, c())).toContain('ride');
    expect(r.early).toBeNull();
    const w = startHub();
    w.done = ['egg', 'shore', 'picnic', 'beads', 'ride', 'ride'];
    w.shoreLanded = true;
    placeEnded(w, 'wish', c());
    expect(refill(w, c())).toContain('wish');
    expect(w.early).toBeNull();
  });

  it("gives a waiting Corner bubble's place to the pond at the next learning place, and back, until she has been", () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    expect(h.play).toEqual(['corner']);
    placeEnded(h, 'picnic', c());
    expect(h.play).toEqual(['pond']);
    placeEnded(h, 'beads', c());
    expect(h.play).toEqual(['corner']);
    placeEnded(h, 'corner', c());
    placeEnded(h, 'ride', c());
    expect(h.play).toEqual(['pond']);
    placeEnded(h, 'wish', c());
    expect(h.play).toEqual(['pond']);
  });

  it('earns no play bubble from the pond or the Corner', () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    placeEnded(h, 'corner', c());
    expect(h.play).toEqual([]);
  });

  it("takes every bubble away at 29:00 and the ride's at 26:00 and the egg's at 27:00", () => {
    const h = startHub();
    h.playMs = 26 * 60_000;
    expect(refill(h, c())).not.toContain('ride');
    h.playMs = 27 * 60_000;
    expect(refill(h, c())).not.toContain('egg');
    h.playMs = 29 * 60_000;
    expect(refill(h, c())).toEqual([]);
  });

  it('keeps a shown learning bubble while it is left, and never shows a place twice', () => {
    const h = startHub();
    h.shown = refill(h, c());
    placeEnded(h, 'picnic', c());
    h.shown = h.shown.filter((p) => p !== 'picnic');
    const next = refill(h, c());
    expect(next.slice(0, 2)).toEqual(['egg', 'ride']);
    expect(new Set(next).size).toBe(next.length);
  });

  it('resets the nudge and done early counts when a place ends', () => {
    const h = startHub();
    idle(h, 50_000);
    placeEnded(h, 'picnic', c());
    expect([h.nudgeIdleMs, h.earlyIdleMs, h.done]).toEqual([0, 0, ['picnic']]);
  });

  it('done early after a learning place: the pond and the Corner, and the 2-minute wait starts again when a visit ends', () => {
    // 5.6
    const h = allButWish();
    placeEnded(h, 'wish', c());
    expect(h.early).toBe(20 * 60_000);
    expect(refill(h, c())).toEqual(['pond', 'corner']);
    idle(h, 30_000);
    visit(h, 'pond', 180_000); // the pond from 20:30 to 23:30
    expect(refill(h, c())).toEqual(['corner']);
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    idle(h, 119_000);
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    idle(h, 1_000);
    expect(bedtimeDue(h, { dressing: false })).toBe(true); // 25:30
  });

  it('done early: bedtime at once when no play bubble is left, and never while a place runs', () => {
    const h = allButWish();
    h.done.push('corner');
    placeEnded(h, 'wish', c());
    expect(refill(h, c())).toEqual(['pond']);
    h.running = 'pond';
    h.playMs += 60_000;
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    h.running = null;
    placeEnded(h, 'pond', c());
    expect(refill(h, c())).toEqual([]);
    expect(bedtimeDue(h, { dressing: false })).toBe(true);
  });

  it('done early after a play place shows no pond bubble, and is never checked from 28:00', () => {
    const p = startHub();
    p.done = ['egg', 'shore', 'ride', 'picnic', 'ride', 'beads', 'wish', 'wish'];
    p.shoreLanded = true;
    p.playMs = 20 * 60_000;
    placeEnded(p, 'pond', c());
    expect(p.early).toBe(20 * 60_000);
    expect(refill(p, c())).toEqual(['corner']);
    const late = allButWish();
    late.playMs = 28 * 60_000;
    placeEnded(late, 'wish', c());
    expect(late.early).toBeNull();
    expect(bedtimeDue(late, { dressing: false })).toBe(false);
  });

  it('counts a place past its cutoff as no longer left, so the cutoffs bring done early', () => {
    const h = startHub();
    h.done = ['egg', 'shore', 'beads', 'wish', 'wish', 'ride'];
    h.shoreLanded = true;
    h.playMs = 26.5 * 60_000; // ride 2 is past its cutoff
    placeEnded(h, 'picnic', c());
    expect(h.early).toBe(26.5 * 60_000);
  });

  it('keeps at most three learning bubbles, one of each kind, never two wishes, a learning bubble while one can start, and a reading and a maths place whenever both are left', () => {
    for (let seed = 1; seed <= 3000; seed++) {
      for (const step of randomHistory(seed)) {
        const learning = step.shown.filter((p) => LEARNING.includes(p));
        expect(learning.length).toBeLessThanOrEqual(3);
        expect(new Set(step.shown.map((p) => KIND[p])).size).toBe(step.shown.length);
        if (step.left.some((p) => LEARNING.includes(p))) expect(learning.length).toBeGreaterThan(0);
        const has = (s: 'r' | 'm') => step.shown.some((p) => STRANDS[p].includes(s));
        const left = (s: 'r' | 'm') => step.left.some((p) => STRANDS[p].includes(s));
        if (left('r') && left('m') && !step.afterSameKind) expect([has('r'), has('m')], `seed ${seed}`).toEqual([true, true]);
        // Shown learning bubbles never swap while they are left.
        expect(step.stayed.every((p) => step.shown.includes(p)), `seed ${seed}`).toBe(true);
      }
    }
  });
});

// ---- a fake game the hub part runs on ------------------------------------------------------------------------------

interface Fake {
  g: Game;
  /** The bubbles on the layer, with their tap. */
  offers: Map<string, { onTap(): void }>;
  /** Frames (dt s) and the timers, `ms` of them, with the play clock moving as a play's would. */
  pump(ms: number): Promise<void>;
  tap(id: string): Promise<void>;
  stop(): void;
}

function fakeHub(search = '?seed=3'): Fake {
  const frames = new Set<(dt: number, t: number) => void>();
  const offers = new Map<string, { onTap(): void }>();
  const options = parseOptions(search);
  const streams = createStreams(options.seed);
  const her = {
    position: new THREE.Vector3(-9, 0, 3), mode: 'idle' as PrincessMode, look: { ...DEFAULT_LOOK }, point: (_p: string, out = new THREE.Vector3()) => out.set(-9, 1, 3),
    walkTo: async (route: { x: number; z: number }[]) => (her.position.set(route.at(-1)!.x, 0, route.at(-1)!.z), true),
  };
  const egg = { visible: false, position: new THREE.Vector3(), place: vi.fn((at: THREE.Vector3) => ((egg.visible = true), egg.position.copy(at))), hide: () => void (egg.visible = false) };
  const g = {
    world: {
      onFrame: (fn: (dt: number, t: number) => void) => (frames.add(fn), () => frames.delete(fn)),
      toScreen: () => ({ x: 500, y: 300, visible: true }),
      route: (a: { x: number; z: number }, b: { x: number; z: number }) => [a, b],
      nearestWalkable: (p: { x: number; z: number }) => p,
      markGoal: vi.fn(),
      nestGlow: vi.fn(),
      setTimeOfDay: async () => {},
      ducks: { set: vi.fn(), bob: vi.fn() },
    },
    actors: {
      princess: her,
      egg,
      fx: { sparkle: () => {}, moonbeam: async () => {}, starfall: async () => {}, hearts: () => {} },
      herd: { all: () => [], get: () => undefined },
      placePrincess: (at: { x: number; z: number }) => void her.position.set(at.x, 0, at.z),
    },
    layer: {
      offer: (id: string, o: { onTap(): void } | null) => (o ? offers.set(id, o) : offers.delete(id)),
      offerBob: vi.fn(),
      keepClear: () => {},
      foodBasket: () => {},
      lumi: { show: () => {}, speak: async (ids: string[]) => void t.said.push(...ids) },
      ghost: { glide: vi.fn(async () => {}), drag: async () => {} },
      snapshot: () => ({ moment: null }),
      sky: () => {},
      root: { querySelector: () => null },
    },
    options,
    save: createSave(() => null, true),
    seed: options.seed,
    streams,
    randFor: (label: string) => streams.for(label),
    maths: startMaths(null),
    today: { wishes: 0, words: [] as string[] },
    clock: startClock(),
    quests: startQuests('beads'),
    openSpec: null,
    herd: [],
    babies: [],
    part: 'hub',
    goal: null,
    free: true,
    bedtime: false,
    door: null,
    stalls: new Map(),
    followers: new Followers(),
    parked: [],
    results: new Results(),
    run: new Run((fn) => (frames.add(fn), () => frames.delete(fn))),
    slid: false,
    lastTouch: 0,
    entering: new Set(),
    hub: startHub(),
    ride: null,
    waiting: null,
    start: { last: { words: [], totals: [] }, afternoon: { maths: null, done: [] } },
    hubRefresh: null,
    signUse: { sets: [], targets: [] },
  } as unknown as Game;
  g.save.write((s) => void (s.seen.hub = true));
  const pump = async (ms: number) => {
    for (let k = 0; k < ms; k += 50) {
      for (const f of [...frames]) f(0.05, 0);
      tickPlay(g.hub, 50, { paused: false, hub: true });
      await vi.advanceTimersByTimeAsync(50);
    }
  };
  return {
    g, offers, pump,
    async tap(id) {
      const o = offers.get(id);
      if (!o) throw new Error(`no bubble ${id}: ${[...offers.keys()].join(',')}`);
      o.onTap();
      await pump(1000);
    },
    stop: () => g.run.stop(),
  };
}

describe('the hub part', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    t.said.length = 0;
    t.speaking = false;
    vi.stubGlobal('fetch', () => Promise.resolve());
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts a place only when a walk ends within 2.5 m after its bubble shows, never a wish', () => {
    const at = (p: HubPlace) => (p === 'egg' ? NEST.center : p === 'pond' ? SLIDE.ladderBase : p === 'picnic' ? PICNIC.rug.center : null);
    const shownAt = { egg: 1_000, pond: 1_000, picnic: 5_000, wish: 0 };
    expect(walkEndStart({ at: { x: NEST.center.x + 2.4, z: NEST.center.z }, ms: 2_000 }, ['egg', 'pond', 'wish'], shownAt, at)).toBe('egg');
    expect(walkEndStart({ at: { x: NEST.center.x + 2.6, z: NEST.center.z }, ms: 2_000 }, ['egg'], shownAt, at)).toBeNull();
    expect(walkEndStart({ at: NEST.center, ms: 2_000 }, ['wish'], shownAt, () => NEST.center)).toBeNull();
  });

  it('never starts the picnic where the Corner left her, 1.9 m from the rug', () => {
    // 5.2, final check 4
    const at = (p: HubPlace) => (p === 'picnic' ? PICNIC.rug.center : null);
    expect(walkEndStart({ at: CORNER.stand, ms: 4_000 }, ['picnic'], { picnic: 5_000 }, at)).toBeNull(); // her last walk ended before the bubble
    expect(walkEndStart({ at: CORNER.stand, ms: 6_000 }, ['picnic'], { picnic: 5_000 }, at)).toBe('picnic'); // a new walk that ends there
  });

  it('ends a walk only when she stops, so a route past the nest to the ladder starts the pond', () => {
    const modes = ['walk', 'walk', 'walk', 'idle'] as const;
    const points = [CORNER.stand, NEST.center, { x: 1, z: 1 }, SLIDE.ladderBase];
    const ends = modes.map((m, i) => walkEnded(i ? modes[i - 1] : 'idle', m, points[i], i * 500)).filter(Boolean);
    expect(ends).toEqual([{ at: SLIDE.ladderBase, ms: 1_500 }]);
  });

  it('nudges 90 s after a place ends, not at once after a long ride, then every 90 s', () => {
    const tick = (h: HubState, ms: number) => {
      for (let k = 0; k < ms; k += 1000) tickPlay(h, 1000, { paused: false, hub: true });
    };
    const h = startHub();
    h.playMs = 10 * 60_000;
    h.nudgeIdleMs = 50_000;
    h.running = 'ride';
    tick(h, 300_000);
    expect(nudgeDue(h)).toBe(false); // no count while a place runs (a pond visit too)
    h.running = null;
    placeEnded(h, 'ride', c());
    expect(nudgeDue(h)).toBe(false);
    tick(h, 89_000);
    expect(nudgeDue(h)).toBe(false);
    tick(h, 1_000);
    expect(nudgeDue(h)).toBe(true);
    h.nudgeIdleMs = 0;
    tick(h, 90_000);
    expect(nudgeDue(h)).toBe(true);
  });

  it('nudges the nearest learning bubble, a tie to the one shown longest, never a play bubble', () => {
    const h = startHub();
    h.shown = ['egg', 'picnic', 'pond'];
    h.shownAt = { egg: 5, picnic: 1, pond: 0 };
    const route = (m: Record<string, number>) => (p: HubPlace) => m[p];
    expect(firstLearning(h, route({ egg: 20, picnic: 20, pond: 1 }))).toBe('picnic');
    expect(firstLearning(h, route({ egg: 19, picnic: 20, pond: 1 }))).toBe('egg');
  });

  it('pops the opening bubbles 0.4 s apart and asks a place only while its bubble shows', async () => {
    const f = fakeHub();
    void hub(f.g).catch(() => {});
    await f.pump(100);
    expect([...f.offers.keys()]).toEqual(['egg']);
    await f.pump(400);
    expect([...f.offers.keys()]).toEqual(['egg', 'ride']);
    await f.pump(400);
    expect([...f.offers.keys()]).toEqual(['egg', 'ride', 'picnic']);
    expect(t.said).toContain('g4-pick');
    expect(askPlace(f.g, 'beads')).toBe(false);
    f.g.hub.playMs = 26 * 60_000;
    expect(askPlace(f.g, 'ride')).toBe(false);
    f.g.hub.playMs = 0;
    f.g.bedtime = true;
    expect(askPlace(f.g, 'picnic')).toBe(false);
    f.g.bedtime = false;
    expect(askPlace(f.g, 'picnic')).toBe(true);
    expect(askPlace(f.g, 'egg')).toBe(false); // one asked at a time
    f.stop();
  });

  it("says lumi-dressing-open the first time the Corner's bubble shows and g4-pond the first time the pond's shows, once a play each", async () => {
    const f = fakeHub();
    void hub(f.g).catch(() => {});
    await f.pump(2000);
    await f.tap('picnic');
    await f.pump(2000);
    expect(f.g.hub.play).toEqual(['corner']);
    expect(f.offers.has('corner')).toBe(true);
    await f.tap('egg');
    await f.pump(2000);
    expect(f.offers.has('pond')).toBe(true);
    await f.tap('ride');
    await f.pump(2000);
    expect(f.offers.has('corner')).toBe(true);
    await f.tap('beads');
    await f.pump(2000);
    expect(f.offers.has('pond')).toBe(true);
    const lines = t.said.filter((id) => id === 'lumi-dressing-open' || id === 'g4-pond');
    expect(lines).toEqual(['lumi-dressing-open', 'g4-pond']);
    expect(f.g.hub.done).toEqual(['picnic', 'egg', 'ride', 'beads']);
    f.stop();
  });

  it('lands the shore egg between places with Lumi, and its bubble pops in', async () => {
    const f = fakeHub();
    void hub(f.g).catch(() => {});
    await f.pump(2000);
    await f.tap('egg');
    await f.pump(2000);
    expect(f.g.hub.shoreLanded).toBe(false);
    await f.tap('picnic');
    await f.pump(3000);
    expect(f.g.hub.shoreLanded).toBe(true);
    expect(t.said).toContain('lumi4-another-egg');
    expect(f.offers.has('shore')).toBe(true);
    expect(f.g.actors.egg.position.x).toBeGreaterThan(14);
    f.stop();
  });

  it('nudges after 90 s of hub time with no place running, with the bubble growing and its way line, and touches do not reset it', async () => {
    const f = fakeHub();
    void hub(f.g).catch(() => {});
    await f.pump(2000);
    t.said.length = 0;
    f.g.lastTouch = performance.now();
    await f.pump(88_000);
    expect(f.g.layer.offerBob).not.toHaveBeenCalledWith(expect.anything(), true);
    f.g.lastTouch = performance.now();
    await f.pump(2_000);
    expect(f.g.layer.offerBob).toHaveBeenCalledWith('egg', true);
    expect(t.said).toContain('g4-way-nest');
    expect(f.g.world.markGoal).toHaveBeenCalledWith(NEST.center);
    f.stop();
  });

  it('ends at bedtime once no place runs, and at 29:00 every bubble goes with the soon line once', async () => {
    const f = fakeHub();
    let ended = false;
    void hub(f.g).then(() => (ended = true), () => {});
    await f.pump(2000);
    f.g.hub.playMs = 29 * 60_000;
    await f.pump(500);
    expect([...f.offers.keys()]).toEqual([]);
    expect(t.said.filter((id) => id === 'g4-soon-bed')).toHaveLength(1);
    expect(ended).toBe(false);
    f.g.hub.playMs = 30 * 60_000;
    await f.pump(200);
    expect(ended).toBe(true);
    expect(f.g.hub.bedtimeAt).toBeGreaterThanOrEqual(30 * 60_000);
  });

  it('ends a visit at once on a learning bubble tap, and the picnic runs next', async () => {
    const f = fakeHub();
    void hub(f.g).catch(() => {});
    await f.pump(2000);
    await f.tap('egg');
    await f.pump(2000);
    await f.tap('picnic');
    await f.pump(3000);
    expect(f.g.hub.play).toEqual(['pond']);
    await f.tap('pond');
    await f.pump(2000);
    expect(f.g.hub.visit).not.toBeNull();
    expect(f.g.world.ducks.set).toHaveBeenLastCalledWith('far');
    // During a visit the learning bubbles stay on screen, and only they.
    expect([...f.offers.keys()].sort()).toEqual(['ride', 'shore', 'beads'].sort());
    await f.tap('beads');
    await f.pump(2000);
    expect(f.g.hub.visit).toBeNull();
    expect(f.g.world.ducks.set).toHaveBeenLastCalledWith('chute');
    expect(f.g.hub.done).toEqual(['egg', 'picnic', 'pond', 'beads']);
    expect(f.g.hub.pondMs).toBeGreaterThan(0);
    f.stop();
  });

  it('ends a visit by itself at 3 minutes of play time, and the first learning bubble grows with its line', async () => {
    const f = fakeHub();
    void hub(f.g).catch(() => {});
    await f.pump(2000);
    await f.tap('egg');
    await f.pump(2000);
    await f.tap('picnic');
    await f.pump(3000);
    await f.tap('pond');
    await f.pump(2000);
    t.said.length = 0;
    vi.mocked(f.g.layer.offerBob).mockClear();
    f.g.hub.playMs = f.g.hub.visit!.fromMs + 180_000;
    await f.pump(1000);
    expect(f.g.hub.visit).toBeNull();
    expect(f.g.hub.done.at(-1)).toBe('pond');
    expect(vi.mocked(f.g.layer.offerBob).mock.calls.some(([, grow]) => grow)).toBe(true);
    expect(t.said.some((id) => id.startsWith('g4-way-'))).toBe(true);
    f.stop();
  });
});

describe('the pond visit', () => {
  it('ends a visit at 3 minutes of play time, at 6 slides and at 30:00', () => {
    const h = startHub();
    h.visit = { fromMs: 0, slides: 5 };
    h.playMs = 179_000;
    expect(visitOver(h, { sliding: false })).toBe(false);
    h.visit.slides = 6;
    expect(visitOver(h, { sliding: false })).toBe(true);
    h.visit = { fromMs: 0, slides: 0 };
    h.playMs = 180_000;
    expect(visitOver(h, { sliding: false })).toBe(true);
    h.visit = { fromMs: 29.5 * 60_000, slides: 0 };
    h.playMs = 30 * 60_000;
    expect(visitOver(h, { sliding: false })).toBe(true);
  });

  it('lets a slide under way finish first', () => {
    const h = startHub();
    h.visit = { fromMs: 0, slides: 2 };
    h.playMs = 181_000;
    expect(visitOver(h, { sliding: true })).toBe(false);
    expect(visitOver(h, { sliding: false })).toBe(true);
  });
});

describe("the play's shape and the start options", () => {
  it('maps the old part names to the hub', () => {
    const at = (s: string) => resolveStart(parseOptions(s));
    expect(at('?at=egg1')).toEqual({ part: 'hub', place: 'egg', step: null, done: [] });
    expect(at('?at=naming2')).toEqual({ part: 'hub', place: 'shore', step: 'naming', done: ['egg'] });
    expect(at('?at=pond')).toEqual({ part: 'hub', place: 'pond', step: null, done: [] });
    expect(at('?at=free')).toEqual({ part: 'hub', place: null, step: null, done: ['egg', 'shore'] });
    expect(at('?at=free&quest=corner')).toEqual({ part: 'hub', place: 'corner', step: null, done: ['egg', 'shore'] });
    expect(at('?at=hub&place=ride&step=sign2')).toEqual({ part: 'hub', place: 'ride', step: 'sign2', done: [] });
    expect(at('?at=bedtime')?.part).toBe('bedtime');
    expect(at('?at=wardrobe')?.part).toBe('wardrobe');
    expect(at('?at=hub&step=naming')).toEqual({ part: 'hub', place: null, step: null, done: [] });
    expect(at('?place=ride')).toBeNull();
    expect(at('?at=nowhere')).toBeNull();
  });

  it('her 2.3 save opens the hub', () => {
    // Review Focus 4
    const save = parseSave(readFileSync(join(here, 'fixtures/save-2.3.3.json'), 'utf8'), true);
    expect(opening({ plays: save.plays + 1, seen: save.seen })).toBeNull(); // no forced egg
    expect(mathsQuestFor(save.afternoon)).toBe('rack');
    expect(save.seen.hub).toBe(false); // explanation and glide
    expect(save.seen.ride).toBe(false); // the long first-ride intro
    expect(refill(startHub(), { maths: 'rack', wishBaby: true, moments: { r: 0, m: 0 } })).toEqual(['egg', 'ride', 'picnic']);
  });

  it('forces the nest egg on the first play ever, and on a save without the crown', () => {
    expect(opening({ plays: 1, seen: { crown: false } })).toBe('egg');
    expect(opening({ plays: 4, seen: { crown: false } })).toBe('egg');
    expect(opening({ plays: 1, seen: { crown: true } })).toBe('egg');
  });

  it('forces the place ?place= names, the Corner and the pond too, without an earned bubble', () => {
    // the flows' starts
    for (const s of ['?at=hub&place=corner', '?at=free&quest=corner', '?at=pond', '?at=hub&place=pond']) {
      const h = hubAt(resolveStart(parseOptions(s))!, BEDTIME_MS);
      expect(h.asked, s).toBe(h.play[0]);
      expect(['corner', 'pond']).toContain(h.asked);
    }
    expect(hubAt(resolveStart(parseOptions('?at=hub&place=shore'))!, BEDTIME_MS)).toMatchObject({ asked: 'shore', shoreLanded: true });
    expect(hubAt(resolveStart(parseOptions('?at=free'))!, 90_000)).toMatchObject({ asked: null, shoreLanded: true, done: ['egg', 'shore'], bedMs: 90_000 });
  });

  it('snaps the done eggs as babies in hatch order, and ?babies= overrides the count', () => {
    expect(spotsOf(['egg', 'picnic', 'ride', 'shore'], null)).toEqual(['nest', 'trail', 'shore']);
    expect(spotsOf(['egg', 'shore'], 4)).toEqual(['nest', 'shore', 'trail', 'trail']);
    expect(spotsOf(['egg', 'shore'], 0)).toEqual([]);
  });

  it('runs a forced place first as the hub opens, then the bubbles of what is left', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', () => Promise.resolve());
    vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const f = fakeHub();
      f.g.hub = hubAt(resolveStart(parseOptions('?at=hub&place=corner'))!, BEDTIME_MS);
      void hub(f.g).catch(() => {});
      await f.pump(3000);
      expect(f.g.hub.done).toEqual(['corner']);
      expect(f.g.hub.play).toEqual([]);
      expect([...f.offers.keys()]).toEqual(['egg', 'ride', 'picnic']);
      f.stop();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
