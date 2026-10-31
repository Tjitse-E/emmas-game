// The ride place (docs/v4/2.4.md sections 5.4 and 5.5, docs/v4/2.4-plan.md Task 24): who rides along, the roads and
// the slots drawn only from getting on to getting off, a trip left halfway that changes no sign level, the sign level
// folded after each trip (and never with ?sign=), and the slots dressed only while the mount stands at the fork and
// none of them is on screen. A small fake game stands in for the world, the actors and the layer; the ride code under
// test is the real one, on fake timers.
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MomentResult, Outcome, SignSpec, Vec2 } from '../src/contracts';

const t = vi.hoisted(() => ({ said: [] as string[], fx: [] as string[] }));
vi.mock('../src/audio', () => ({
  audio: {
    sfx: async () => {}, say: async (id: string) => void t.said.push(id), sayAll: async (ids: string[]) => void t.said.push(...ids),
    sayWhole: async () => true, preload: async () => [], fx: async (id: string) => void t.fx.push(id), checked: () => {}, stop: () => {},
    speaking: false,
  },
}));
// The star egg and its baby are the babies lane's: here they only record that they ran, and the baby is a fake one.
vi.mock('../src/game/eggs-part', () => ({
  runEggSums: vi.fn(async () => void t.said.push('[egg sums]')),
  newbornAt: vi.fn(async (g: { babies: unknown[] }) => {
    const u = fakeUnicorn(`baby-${13 + g.babies.length}`, { x: 20, z: -38 });
    const b = { door: 13 + g.babies.length, spot: 'trail', look: u.look, unicorn: u, member: null };
    g.babies.push(b);
    return b;
  }),
}));
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});

import { DRESS_WAIT_MS, JOIN_M, MOUNTS, ridePlace, rideFollowers } from '../src/game/ride';
import { SADDLE_ICON } from '../src/ui/saddle';
import { type Game, startClock, startQuests } from '../src/game/game';
import { createSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';
import { createStreams } from '../src/game/streams';
import { Followers } from '../src/game/followers';
import { Results } from '../src/game/results';
import { Run } from '../src/game/run';
import { startMaths } from '../src/game/band';
import { startHub } from '../src/game/hub';
import { MOUNT_LOOKS } from '../src/actors/mount';
import { GRAZE_HOMES, RIDE } from '../src/layout';

// ---- a fake game ---------------------------------------------------------------------------------------------------

interface Fake {
  id: string;
  look: object;
  mode: string;
  position: THREE.Vector3;
  tracking: { lead: string; gap: number } | null;
  /** What it was told, in order: 'goTo', 'track <gap>', 'place', 'turn'. */
  did: string[];
  [k: string]: unknown;
}
function fakeUnicorn(id: string, at: Vec2, look: object = { stage: 'baby', breed: 'moon', body: '#fff', mane: '#f9c', mane2: '#fcf' }): Fake {
  const u = {
    id, name: id, look, mode: 'graze', followSlot: null as number | null, yaw: 0, speed: 0, position: new THREE.Vector3(at.x, 0, at.z),
    speeds: { graze: 0.4, walk: 1.2, trot: 2.3, gallop: 5 },
    tracking: null as { lead: string; gap: number } | null,
    did: [] as string[],
    goTo: async (route: Vec2[]) => {
      u.did.push('goTo');
      const end = route[route.length - 1];
      u.position.set(end.x, 0, end.z);
      return true;
    },
    ridePath: async (path: THREE.Curve<THREE.Vector3>, _from: number, to: number) => {
      const len = path.getLength();
      const p = path.getPointAt(len ? Math.min(1, Math.max(0, to / len)) : 0);
      u.position.set(p.x, 0, p.z);
      return true;
    },
    trackBehind: (lead: Fake | null, gap: number) => {
      if (lead) u.did.push(`track ${gap}`);
      u.tracking = lead ? { lead: lead.id, gap } : null;
      u.mode = lead ? 'walk' : 'idle';
      u.followSlot = null;
    },
    seedTrack: () => {}, trackPoint: () => ({ x: u.position.x, z: u.position.z, heading: 0 }),
    turnRound: () => void u.did.push('turn'),
    faceTo: () => {
      u.mode = 'idle';
      u.followSlot = null;
    },
    place: (p: Vec2) => {
      u.did.push('place');
      u.position.set(p.x, 0, p.z);
    },
    graze: () => {
      u.mode = 'graze';
      u.followSlot = null;
    },
    follow: (slot: number) => {
      u.followSlot = slot;
      u.mode = 'follow';
    },
    lookAt: () => {}, emote: async () => {}, showToy: () => {},
    headTop: (out = new THREE.Vector3()) => out.set(u.position.x, 1.4, u.position.z),
    saddleTop: (out = new THREE.Vector3()) => out.set(u.position.x, 0.88, u.position.z),
  };
  return u;
}

interface Opts {
  search?: string;
  /** What each sign answers (default: first tries); a promise that never settles keeps the sign open. */
  sign?: (spec: SignSpec) => MomentResult | Promise<MomentResult>;
  /** Whether slot i is on screen now (the fake camera). */
  onScreen?: (i: number) => boolean;
}

function fakeGame(o: Opts = {}) {
  const log: string[] = [];
  let frameT = 0;
  const frames = new Set<(dt: number, t: number) => void>();
  // While `hidden` the page draws no frame (Safari has it in the background); the timers still run.
  const page = { hidden: false };
  const tick = setInterval(() => {
    if (page.hidden) return;
    frameT += 0.05;
    for (const f of [...frames]) f(0.05, frameT);
  }, 50);
  const words: (string | null)[] = [null, null, null];
  const trail = {
    shown: false,
    dresses: [] as { words: readonly string[] | null; step: string | null; onScreen: boolean[]; shown: boolean }[],
    show(on: boolean) {
      trail.shown = on;
      log.push(`show ${on}`);
    },
    dress(w: readonly string[] | null) {
      trail.dresses.push({ words: w, step: g.ride?.step ?? null, onScreen: [0, 1, 2].map((i) => o.onScreen?.(i) ?? false), shown: trail.shown });
      for (let i = 0; i < 3; i++) words[i] = w ? w[i] : null;
    },
    slots: () => words.map((word, i) => ({ word, onScreen: o.onScreen?.(i) ?? false })),
    arm: (i: number) => new THREE.Vector3(RIDE.fork.x + (i - 1), 1.3, RIDE.fork.z),
    gate: vi.fn(async () => {}),
  };
  const bella = fakeUnicorn(MOUNTS.bella.id, RIDE.mounts.bella, MOUNT_LOOKS.bella);
  const hazel = fakeUnicorn(MOUNTS.hazel.id, RIDE.mounts.hazel, MOUNT_LOOKS.hazel);
  const herdBabies = GRAZE_HOMES.slice(0, 4).map((h, i) => fakeUnicorn(`h${i}`, h));
  const all: Fake[] = [bella, hazel, ...herdBabies];
  const her = {
    position: new THREE.Vector3(-9, 0, 3), mode: 'idle', mountedOn: null as Fake | null,
    walkTo: async (route: Vec2[]) => {
      if (her.mountedOn) return false;
      const end = route[route.length - 1];
      her.position.set(end.x, 0, end.z);
      return true;
    },
    mount: async (u: Fake) => {
      log.push('mount');
      her.mode = 'mounted';
      her.mountedOn = u;
    },
    dismount: async (at: Vec2) => {
      log.push('dismount');
      her.mode = 'idle';
      her.mountedOn = null;
      her.position.set(at.x, 0, at.z);
    },
    face: () => {}, emote: async () => {}, stop: () => {},
    point: (_p: string, out = new THREE.Vector3()) => out.set(her.position.x, 1.9, her.position.z),
  };
  const options = parseOptions(o.search ?? '?seed=3');
  const streams = createStreams(options.seed);
  const save = createSave(() => null, true);
  let saddles: { onTap(m: 'bella' | 'hazel'): void } | null = null;
  const g = {
    world: {
      camera: new THREE.PerspectiveCamera(38, 1080 / 740, 0.5, 700),
      route: (a: Vec2, b: Vec2) => [a, b],
      // As the real walk grid: nothing north of the fence (z -22) is walkable.
      nearestWalkable: (p: Vec2) => ({ x: p.x, z: Math.max(-22, p.z) }),
      isWalkable: () => true,
      frame: vi.fn(async () => {}),
      releaseFrame: vi.fn(),
      follow: vi.fn(),
      cameraClamp: vi.fn((k: string) => log.push(`clamp ${k}`)),
      toScreen: () => ({ x: 500, y: 300, visible: true }),
      onFrame: (fn: (dt: number, t: number) => void) => {
        frames.add(fn);
        return () => frames.delete(fn);
      },
      trail,
      ray: () => ({}),
    },
    actors: {
      princess: her,
      herd: { get: (id: string) => all.find((u) => u.id === id), all: () => all.slice(), pick: () => null, setFocus: vi.fn() },
      fx: { sparkle: vi.fn(), hearts: () => {}, moonbeam: async () => {} },
      trailEgg: { visible: false, position: new THREE.Vector3(), place: vi.fn(), hide: vi.fn(), wobble: async () => {} },
      placePrincess: (at: Vec2) => void her.position.set(at.x, 0, at.z),
    },
    layer: {
      lumi: { speak: vi.fn(async (ids: string[]) => void t.said.push(...ids)) },
      saddles: vi.fn((s: typeof saddles) => {
        saddles = s;
        log.push(s ? 'saddles' : 'saddles off');
      }),
      sign: vi.fn(async (spec: SignSpec, _hooks: unknown) => o.sign?.(spec) ?? { outcome: 'first' as Outcome, misses: 0, ms: 900 }),
      ghost: { tap: vi.fn(async () => {}) },
      tag: () => {},
    },
    options,
    save,
    seed: options.seed,
    streams,
    randFor: (label: string) => streams.for(label),
    maths: startMaths(null),
    today: { wishes: 0, words: [] as string[] },
    clock: startClock(),
    quests: startQuests('beads'),
    hub: startHub(),
    ride: null,
    waiting: null,
    signUse: { sets: [] as string[], targets: [] as string[] },
    openSpec: null,
    herd: herdBabies.map((u, i) => ({ id: u.id, name: u.id, clip: `name-${u.id}`, door: i + 1, look: u.look })),
    babies: [] as { door: number; spot: string; look: object; unicorn: Fake; member: null }[],
    part: 'free',
    goal: null,
    free: true,
    bedtime: false,
    door: null,
    stalls: new Map(),
    followers: new Followers(),
    parked: [],
    results: new Results(),
    run: new Run((fn) => {
      frames.add(fn);
      return () => frames.delete(fn);
    }),
    lastTouch: 0,
    entering: new Set(),
  } as unknown as Game & { ride: Game['ride'] };
  return {
    g,
    log,
    trail,
    her,
    mounts: { bella, hazel },
    herdBabies,
    page,
    tapSaddle: (m: 'bella' | 'hazel') => saddles?.onTap(m),
    get saddlesUp() {
      return !!saddles;
    },
    stop: () => clearInterval(tick),
  };
}

/** Advance the fake clock in steps until `pred` holds (or fail after `maxMs`). */
async function until(pred: () => boolean, maxMs = 120_000): Promise<void> {
  for (let ms = 0; ms < maxMs && !pred(); ms += 100) await vi.advanceTimersByTimeAsync(100);
  expect(pred()).toBe(true);
}

/** The whole trip: she taps Bella's saddle, the trip plays out, and the place resolves with its release. */
async function wholeTrip(f: ReturnType<typeof fakeGame>, trip: 1 | 2 = 1): Promise<() => void> {
  let release: (() => void) | null = null;
  void ridePlace(f.g, trip).then((r) => (release = r));
  await until(() => f.saddlesUp);
  f.tapSaddle('bella');
  await until(() => release !== null, 600_000);
  return release!;
}

beforeEach(() => {
  vi.useFakeTimers();
  t.said.length = 0;
  t.fx.length = 0;
  vi.stubGlobal('innerWidth', 1080);
  vi.stubGlobal('innerHeight', 740);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the ride place', () => {
  it('takes newborns first, then followers, else the two herd babies nearest the paddock, at most two, and sends the other followers to graze', () => {
    const f = fakeGame();
    const [a, b, c, d] = f.herdBabies;
    // Three followers (the nearest the paddock is c) and one newborn that does not follow yet.
    for (const [u, at] of [[a, { x: 0, z: 0 }], [b, { x: 5, z: 5 }], [c, { x: 18, z: -8 }]] as const) {
      u.position.set(at.x, 0, at.z);
      f.g.followers.add(u as never);
    }
    const newborn = fakeUnicorn('baby-13', { x: 2, z: 2 });
    f.g.babies.push({ door: 13, spot: 'nest', look: newborn.look, unicorn: newborn, member: null } as never);
    const pick = rideFollowers(f.g);
    expect(pick.ride.map((u) => u.id)).toEqual(['baby-13', c.id]);
    expect(pick.graze.map((u) => u.id).sort()).toEqual([a.id, b.id].sort());
    // Nobody follows and no baby has hatched: the two herd babies nearest the paddock come.
    const g2 = fakeGame();
    g2.herdBabies.forEach((u, i) => u.position.set(RIDE.stand.x - 2 - i * 3, 0, RIDE.stand.z));
    expect(rideFollowers(g2.g).ride.map((u) => u.id)).toEqual([g2.herdBabies[0].id, g2.herdBabies[1].id]);
    expect(rideFollowers(g2.g).graze).toEqual([]);
    // A herd baby whose wish waits never comes along.
    (g2.g as { waiting: unknown }).waiting = g2.herdBabies[0];
    expect(rideFollowers(g2.g).ride.map((u) => u.id)).toEqual([g2.herdBabies[1].id, g2.herdBabies[2].id]);
    void d;
    f.stop();
    g2.stop();
  });

  it('shows the roads, slots and kit only from getting on to getting off, and leaves the run as it found it', async () => {
    const f = fakeGame();
    const deferred = f.g.run.deferred;
    const release = await wholeTrip(f);
    const order = f.log.filter((e) => e === 'mount' || e === 'dismount' || e.startsWith('show'));
    expect(order).toEqual(['mount', 'show true', 'dismount', 'show false']);
    expect(f.trail.shown).toBe(false);
    expect(f.g.ride).toBeNull();
    expect(f.log.filter((e) => e.startsWith('clamp'))).toEqual(['clamp ride', 'clamp meadow']);
    release();
    expect(f.g.free).toBe(true);
    // The mount is back by its spot, the trail egg's baby follows her, and the herd babies it called graze again.
    expect(Math.hypot(f.mounts.bella.position.x - RIDE.mounts.bella.x, f.mounts.bella.position.z - RIDE.mounts.bella.z)).toBeLessThan(0.7);
    expect(f.g.followers.list.map((u) => u.id)).toContain('baby-13');
    expect(f.g.clock.rideMs).toBeGreaterThan(0);
    expect(f.g.run.deferred).toBe(deferred);
    // The star egg lies at clearing 2 beside the mount, out on the trail (never pulled back inside the fence).
    const egg = (f.g.actors.trailEgg.place as unknown as { mock: { calls: [THREE.Vector3, string][] } }).mock.calls[0];
    expect(egg[1]).toBe('star');
    expect(egg[0].z).toBeLessThan(-28);
    f.stop();
  });

  it('hides the roads, slots and kit again when the run stops in the middle of a trip', async () => {
    const f = fakeGame({ sign: () => new Promise<MomentResult>(() => {}) });
    void ridePlace(f.g, 1).catch(() => {});
    await until(() => f.saddlesUp);
    f.tapSaddle('hazel');
    await until(() => f.g.ride?.step === 'sign1');
    expect(f.trail.shown).toBe(true);
    f.g.run.stop();
    await vi.advanceTimersByTimeAsync(200);
    expect(f.trail.shown).toBe(false);
    expect(f.g.ride).toBeNull();
    expect(f.log.at(-1)).not.toBe('show true');
    f.stop();
  });

  it('a trip left halfway changes no sign level', async () => {   // Review Focus 3
    // Sign 1 is answered; sign 2 stays open until the run stops (a reload, a jump).
    const f = fakeGame({ sign: (spec) => (spec.sign === 1 ? { outcome: 'first', misses: 0, ms: 900 } : new Promise<MomentResult>(() => {})) });
    f.g.save.write((s) => void (s.signs = { level: 2, recent: ['first'] }));
    const before = JSON.stringify(f.g.save.data.signs);
    void ridePlace(f.g, 1).catch(() => {});
    await until(() => f.saddlesUp);
    f.tapSaddle('bella');
    // Sign 1 answered (its line noted), then the run stops on the way to sign 2.
    await until(() => f.g.results.lines.some((l) => l.part === 'sign-1'));
    await until(() => f.g.ride?.step === 'sign2');
    f.g.run.stop();
    await vi.advanceTimersByTimeAsync(200);
    expect(JSON.stringify(f.g.save.data.signs)).toBe(before);
    expect(f.g.save.data.seen.ride).toBe(true);
    f.stop();
  });

  it('folds the sign level after each trip, with ?sign= not stored', async () => {
    const f = fakeGame();
    await wholeTrip(f);
    const lines = f.g.results.lines.filter((l) => l.part === 'sign-1');
    expect(lines.map((l) => [l.strand, l.detail.read, l.detail.trip, l.detail.kind])).toEqual([['r', 1, 1, 'sign'], ['r', 2, 1, 'sign']]);
    expect(f.g.save.data.signs).toEqual({ level: 1, recent: ['first', 'first'] });
    // The two sets and targets go into the play's sign use, for trip 2's planner.
    expect(f.g.signUse.sets).toHaveLength(2);
    expect(f.g.signUse.targets).toHaveLength(2);
    f.stop();
    const s = fakeGame({ search: '?seed=3&sign=3' });
    await wholeTrip(s);
    expect(s.g.save.data.signs).toEqual({ level: 1, recent: [] });
    expect(s.g.results.lines.filter((l) => l.part === 'sign-1').every((l) => l.detail.level === 3)).toBe(true);
    s.stop();
  });

  it('dresses the slots only while the mount stands at the fork and none is on screen', async () => {
    // The west slot is on screen for the first 3 s at each fork stop; the trip waits before it dresses.
    let at: number | null = null;
    const f = fakeGame({
      onScreen: (i) => {
        const step = f.g.ride?.step;
        if (step !== 'sign1' && step !== 'sign2') return i === 0;
        at ??= Date.now();
        return i === 0 && Date.now() - at < 3000;
      },
    });
    const specs: SignSpec[] = [];
    const slotsAtSign: (string | null)[][] = [];
    f.g.layer.sign = vi.fn(async (spec: SignSpec) => {
      specs.push(spec);
      slotsAtSign.push(f.trail.slots().map((x) => x.word));
      at = null;
      return { outcome: 'first' as Outcome, misses: 0, ms: 900 };
    }) as never;
    await wholeTrip(f);
    const dressed = f.trail.dresses.filter((d) => d.words);
    expect(dressed).toHaveLength(2);
    for (const d of dressed) {
      expect(['sign1', 'sign2']).toContain(d.step);
      expect(d.onScreen).toEqual([false, false, false]);
    }
    // Each sign's cards are its slots' words (sign 2 never keeps sign 1's), and the slots are bared only once the
    // trail is hidden.
    expect(specs.map((x) => x.sign)).toEqual([1, 2]);
    specs.forEach((spec, i) => {
      expect(dressed[i].words).toEqual(spec.cards.map((c) => c.word));
      expect(slotsAtSign[i]).toEqual(spec.cards.map((c) => c.word));
    });
    const bare = f.trail.dresses.filter((d) => !d.words);
    expect(bare.length).toBeGreaterThan(0);
    expect(bare.every((d) => !d.shown)).toBe(true);
    f.stop();
  });
  it('still dresses a slot that stays on screen past the wait, with a sparkle and a warning, so each sign shows its own words', async () => {
    // The north slot never leaves the screen at the fork (a fork frame that shows it).
    const f = fakeGame({ onScreen: (i) => i === 1 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const specs: SignSpec[] = [];
    const dressedAt: number[] = [];
    let forkAt = 0;
    f.g.layer.sign = vi.fn(async (spec: SignSpec) => {
      specs.push(spec);
      dressedAt.push(Date.now() - forkAt);
      return { outcome: 'first' as Outcome, misses: 0, ms: 900 };
    }) as never;
    const steps = setInterval(() => {
      if ((f.g.ride?.step === 'sign1' || f.g.ride?.step === 'sign2') && !forkAt) forkAt = Date.now();
      if (f.g.ride?.step !== 'sign1' && f.g.ride?.step !== 'sign2') forkAt = 0;
    }, 10);
    await wholeTrip(f);
    clearInterval(steps);
    const dressed = f.trail.dresses.filter((d) => d.words);
    expect(dressed.map((d) => d.words)).toEqual(specs.map((spec) => spec.cards.map((c) => c.word)));
    // It waited the whole DRESS_WAIT_MS first, then said so and sparkled the slot in view.
    // (to the fake's frame of 50 ms)
    expect(dressedAt.every((ms) => ms >= DRESS_WAIT_MS - 100)).toBe(true);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('still on screen'))).toHaveLength(2);
    const sparkles = (f.g.actors.fx.sparkle as unknown as { mock: { calls: [THREE.Vector3][] } }).mock.calls.map((c) => c[0]);
    expect(sparkles.filter((p) => Math.hypot(p.x - RIDE.slots[1].x, p.z - RIDE.slots[1].z) < 0.1)).toHaveLength(2);
    f.stop();
  });

  it("sends the mount down the road of the target's card, whichever object the target is", async () => {
    const f = fakeGame();
    const ends: Vec2[] = [];
    const ride = f.mounts.bella.ridePath as (p: THREE.Curve<THREE.Vector3>, a: number, b: number) => Promise<boolean>;
    f.mounts.bella.ridePath = async (p: THREE.Curve<THREE.Vector3>, a: number, b: number) => {
      const r = await ride(p, a, b);
      ends.push({ x: f.mounts.bella.position.x, z: f.mounts.bella.position.z });
      return r;
    };
    const specs: SignSpec[] = [];
    f.g.layer.sign = vi.fn(async (spec: SignSpec) => {
      specs.push(spec);
      return { outcome: 'first' as Outcome, misses: 0, ms: 900 };
    }) as never;
    await wholeTrip(f);
    // Each clearing it stops at is the target card's slot, 3 m before its middle, and no other slot.
    const near = (i: number) => ends.some((e) => Math.hypot(e.x - RIDE.slots[i].x, e.z - RIDE.slots[i].z) < 3.5);
    for (const spec of specs) {
      const i = spec.cards.findIndex((c) => c.word === spec.target.word);
      expect(near(i), `sign ${spec.sign} ${spec.target.word}`).toBe(true);
    }
    const targets = specs.map((spec) => spec.cards.findIndex((c) => c.word === spec.target.word));
    for (const i of [0, 1, 2].filter((k) => !targets.includes(k))) expect(near(i)).toBe(false);
    f.stop();
  });

  it('walks a far rider to its place by the paths before it trots on the track, and sparkles one that never comes', async () => {
    const f = fakeGame();
    // A newborn left grazing by the pond rides along (newborns first), and a second one whose walk never arrives.
    const pond = fakeUnicorn('baby-13', { x: -12, z: 6 });
    const stuck = fakeUnicorn('baby-14', { x: -14, z: 8 });
    stuck.goTo = async () => {
      stuck.did.push('goTo');
      return new Promise<boolean>(() => {});
    };
    f.g.babies.push({ door: 13, spot: 'nest', look: pond.look, unicorn: pond, member: null } as never);
    f.g.babies.push({ door: 14, spot: 'shore', look: stuck.look, unicorn: stuck, member: null } as never);
    let release: (() => void) | null = null;
    void ridePlace(f.g, 1).then((r) => (release = r));
    await until(() => f.saddlesUp);
    f.tapSaddle('bella');
    await until(() => release !== null, 600_000);
    // Neither went straight onto the track from across the meadow: each walked by the paths first.
    for (const u of [pond, stuck]) expect(u.did.indexOf('goTo'), u.id).toBeGreaterThanOrEqual(0);
    expect(pond.did.indexOf('goTo')).toBeLessThan(pond.did.indexOf('track 3'));
    expect(pond.did).not.toContain('place');
    // The one that never came was put at its place with a sparkle, then joined the track.
    expect(stuck.did.indexOf('place')).toBeGreaterThan(stuck.did.indexOf('goTo'));
    expect(stuck.did.indexOf('place')).toBeLessThan(stuck.did.indexOf('track 1.6'));
    f.stop();
  });

  it("turns round at each clearing with the riders aside and in the opposite order, the newborn last on the way home", async () => {
    const f = fakeGame();
    const [a, b] = f.herdBabies;
    for (const u of [a, b]) {
      u.position.set(RIDE.stand.x + 1, 0, RIDE.stand.z + 1);
      f.g.followers.add(u as never);
    }
    const steps: string[] = [];
    let hazelWhileOut: string | null = null;
    const watch = setInterval(() => {
      const st = f.g.ride?.step;
      if (st && steps.at(-1) !== st) steps.push(st);
      if (st === 'sign1') hazelWhileOut ??= f.mounts.hazel.mode;
    }, 10);
    await wholeTrip(f);
    clearInterval(watch);
    const baby = f.g.babies[0].unicorn as unknown as Fake;
    // Out: a then b; after clearing 1 the order is reversed, and home it reverses again with the newborn last.
    const gapsOf = (u: Fake) => u.did.filter((d) => d.startsWith('track ')).map((d) => Number(d.slice(6)));
    expect(f.mounts.bella.did.filter((d) => d === 'turn')).toHaveLength(2);
    expect(gapsOf(a)).toEqual([1.6, 3, 1.6]);
    expect(gapsOf(b)).toEqual([3, 1.6, 3]);
    // The newborn stays at its hatch spot until the mount turns for home (never walked past her on the mount).
    expect(gapsOf(baby)).toEqual([4.4]);
    // The mount she did not choose grazed by its spot all the while.
    expect(hazelWhileOut).toBe('graze');
    f.stop();
  });

  it("lets the ghost tap the middle of the saddle icon, which floats over the saddle point", async () => {
    const f = fakeGame();
    await wholeTrip(f);
    const tap = f.g.layer.ghost.tap as unknown as { mock: { calls: [() => { x: number; y: number }][] } };
    expect(tap.mock.calls.length).toBeGreaterThan(0);
    // toScreen gives (500, 300) for the saddle point; the 120 px icon stands 8 px over it.
    expect(tap.mock.calls[0][0]()).toMatchObject({ x: 500, y: 300 - SADDLE_ICON / 2 - 8 });
    f.stop();
  });

  it('keeps the sign level of a trip that reached home when the run stops while the mount walks back', async () => {
    const f = fakeGame();
    // The walk back to its spot takes its full 3 s.
    f.mounts.bella.goTo = async () => new Promise<boolean>(() => {});
    void ridePlace(f.g, 1).catch(() => {});
    await until(() => f.saddlesUp);
    f.tapSaddle('bella');
    await until(() => f.log.includes('dismount'), 600_000);
    await vi.advanceTimersByTimeAsync(500);
    f.g.run.stop();
    await vi.advanceTimersByTimeAsync(200);
    expect(f.g.save.data.signs).toEqual({ level: 1, recent: ['first', 'first'] });
    f.stop();
  });

  it('counts her mounted time in visible frames only', async () => {
    const f = fakeGame({ sign: () => new Promise<MomentResult>(() => {}) });
    void ridePlace(f.g, 1).catch(() => {});
    await until(() => f.saddlesUp);
    f.tapSaddle('bella');
    await until(() => f.g.ride?.step === 'sign1');
    const before = f.g.clock.rideMs;
    // A minute with the page in the background, then two seconds on screen.
    f.page.hidden = true;
    await vi.advanceTimersByTimeAsync(60_000);
    f.page.hidden = false;
    await vi.advanceTimersByTimeAsync(2000);
    expect(f.g.clock.rideMs - before).toBeGreaterThan(1500);
    expect(f.g.clock.rideMs - before).toBeLessThan(2500);
    f.g.run.stop();
    f.stop();
  });
});
