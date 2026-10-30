// The world touch (src/game/input.ts) always ends, so the world keeps taking taps: a release only the window hears
// still taps, a touch whose release went missing ends at the next touch without a tap, and a carried unicorn whose
// capture was lost lands where the finger last was (a lost capture has no point of its own). Fake event targets
// (fixtures/events.ts) stand in for the canvas, the window and the document; a small fake game for the rest. 2.3.0: a
// tap on the Dressing Corner after her visit opens the trunk on its board and never asks for the Corner again. 2.4.0
// (the hub): the herd baby whose wish waits is never carried and never follows, and a tap on it asks its wish; the
// slide runs only during a pond visit, and a unicorn dropped on the resting slide lands beside the ladder.
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installInput } from '../src/game/input';
import type { Game } from '../src/game/game';
import { FakeElement, FakeTarget } from './fixtures/events';
import { startQuests } from '../src/game/game';
import { defaultSave } from '../src/game/save';
import { startHub } from '../src/game/hub';
import { Followers } from '../src/game/followers';
import type { UnicornActor } from '../src/actors';

// The hub's ask is the hub part's rule (tests/hub.test.ts); here it is a spy, so a test sees which place a tap asks.
const asked = vi.hoisted(() => ({ places: [] as string[] }));
vi.mock('../src/game/hub-part', async (importOriginal) => {
  const m = await importOriginal<typeof import('../src/game/hub-part')>();
  return { ...m, askPlace: (_g: unknown, p: string) => (asked.places.push(p), false) };
});

// A carry starts with a sparkle sound; the audio module needs a browser. The picture paths read the page address.
vi.mock('../src/audio', () => ({ audio: { sfx: async () => {}, say: async () => {}, speaking: false } }));
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});

let win: FakeTarget;
beforeEach(() => {
  asked.places.length = 0;
  win = new FakeTarget();
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', new FakeTarget());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(extra: { game?: Record<string, unknown>; world?: Record<string, unknown>; layer?: Record<string, unknown> } = {}) {
  const canvas = new FakeElement();
  const unicorn = { mode: 'graze', lift: vi.fn(), carryTo: vi.fn(), drop: vi.fn(), emote: vi.fn(async () => {}), lookAt: vi.fn() };
  const rideSlide = vi.fn();
  // The slide runs during a pond visit (2.4.0); the tests that slide have one under way.
  const hub = startHub();
  hub.visit = { fromMs: 0, slides: 0 };
  const bob = vi.fn();
  const speak = vi.fn(async () => {});
  const w = { under: null as typeof unicorn | null, picked: { kind: 'slide' } as { kind: string } };
  const g = {
    world: {
      canvas,
      // A ray straight down through (x / 10, z = y / 10): the carry plane and the ground lie under the finger.
      ray: (x: number, y: number) => ({ ray: new THREE.Ray(new THREE.Vector3(x / 10, 10, y / 10), new THREE.Vector3(0, -1, 0)) }),
      pick: () => w.picked,
      toScreen: () => ({ x: -999, y: -999, visible: false }),
      groundAt: (x: number, y: number) => ({ x: x / 10, z: y / 10 }),
      ducks: { bob, set: () => {} },
      ...extra.world,
    },
    actors: { herd: { pick: () => w.under }, egg: { visible: false }, trailEgg: { visible: false }, princess: { rideSlide } },
    layer: { snapshot: () => ({ moment: null }), lumi: { speak }, ...extra.layer },
    followers: { sync: () => {}, add: vi.fn() },
    free: true,
    door: null,
    bedtime: false,
    goal: null,
    hub,
    waiting: null as unknown,
    ...extra.game,
  };
  installInput(g as unknown as Game);
  /** A finger down on the canvas: the window and the document see it first (capture phase). */
  const touch = (id: number, x = 100, y = 100) => {
    win.fire('pointerdown', id, x, y);
    (document as unknown as FakeTarget).fire('pointerdown', id, x, y);
    canvas.fire('pointerdown', id, x, y);
  };
  return { canvas, unicorn, rideSlide, w, touch, g, bob, speak };
}

describe('the world touch', () => {
  it('taps on a release only the window hears, and the next tap works too', () => {
    const p = setup();
    p.touch(1);
    win.fire('pointerup', 1, 100, 100);
    expect(p.rideSlide).toHaveBeenCalledTimes(1);
    p.touch(1);
    win.fire('pointerup', 1, 102, 101);
    p.canvas.fire('pointerup', 1, 102, 101);
    p.canvas.fire('lostpointercapture', 1);
    expect(p.rideSlide).toHaveBeenCalledTimes(2);
  });

  it('ends a touch whose release went missing at the next touch, without a tap, and takes the next tap', () => {
    const p = setup();
    p.touch(1);
    p.touch(2);
    expect(p.rideSlide).not.toHaveBeenCalled();
    win.fire('pointerup', 2, 100, 100);
    expect(p.rideSlide).toHaveBeenCalledTimes(1);
    // The same pointer id again (a mouse): the stale touch ends the same way.
    p.touch(1);
    p.touch(1);
    win.fire('pointerup', 1, 100, 100);
    expect(p.rideSlide).toHaveBeenCalledTimes(2);
  });

  it('never taps on a cancel or a lost capture', () => {
    const p = setup();
    p.touch(1);
    win.fire('pointercancel', 1, 100, 100);
    p.touch(2);
    p.canvas.fire('lostpointercapture', 2, 100, 100);
    win.fire('pointerup', 2, 100, 100);
    expect(p.rideSlide).not.toHaveBeenCalled();
  });

  it('sets a carried unicorn down where the finger last was when the capture is lost', () => {
    const p = setup();
    p.w.under = p.unicorn;
    p.w.picked = { kind: 'ground' };
    p.touch(1, 100, 100);
    p.canvas.fire('pointermove', 1, 300, 200);
    expect(p.unicorn.lift).toHaveBeenCalledTimes(1);
    expect(p.unicorn.carryTo).toHaveBeenLastCalledWith({ x: 30, z: 20 });
    p.canvas.fire('lostpointercapture', 1, 0, 0);
    expect(p.unicorn.drop).toHaveBeenCalledTimes(1);
    expect(p.unicorn.drop.mock.calls[0][0].x).toBeCloseTo(30);
    expect(p.unicorn.drop.mock.calls[0][0].z).toBeCloseTo(20);
    win.fire('pointerup', 1, 0, 0);
    expect(p.unicorn.drop).toHaveBeenCalledTimes(1);
    expect(p.rideSlide).not.toHaveBeenCalled();
  });

  it('sets a carried unicorn down at its last point when another touch comes first', () => {
    const p = setup();
    p.w.under = p.unicorn;
    p.w.picked = { kind: 'ground' };
    p.touch(1, 100, 100);
    p.canvas.fire('pointermove', 1, 250, 120);
    p.w.under = null;
    p.touch(2, 600, 600);
    expect(p.unicorn.drop).toHaveBeenCalledTimes(1);
    expect(p.unicorn.drop.mock.calls[0][0].x).toBeCloseTo(25);
    expect(p.unicorn.drop.mock.calls[0][0].z).toBeCloseTo(12);
  });
});


describe('a tap on the Dressing Corner after her visit (2.3.0)', () => {
  it('opens the trunk on the treasure board, and never starts the Corner again', () => {
    const quests = startQuests('beads');
    quests.done.add('picnic');
    quests.done.add('corner');
    const board = vi.fn(async () => {});
    const lid = vi.fn(async () => {});
    const p = setup({
      game: { quests, save: { data: defaultSave() }, part: 'free', babies: [] },
      world: { corner: { lid, open: 0 }, route: (a: unknown, b: unknown) => [a, b] },
      layer: { board },
    });
    p.w.picked = { kind: 'corner' };
    p.touch(1);
    win.fire('pointerup', 1, 100, 100);
    expect(board).toHaveBeenCalledTimes(1);
    expect(lid).toHaveBeenCalledWith(true);
    expect(quests.asked).toBeNull();
  });
});

describe('the herd baby whose wish waits (2.4.0)', () => {
  it('never carries a herd baby whose wish waits, and a tap on it asks its wish', () => {
    const p = setup();
    p.g.waiting = p.unicorn;
    p.w.under = p.unicorn;
    p.w.picked = { kind: 'ground' };
    p.touch(1, 100, 100);
    p.canvas.fire('pointermove', 1, 300, 200);
    win.fire('pointerup', 1, 300, 200);
    expect(p.unicorn.lift).not.toHaveBeenCalled();
    p.touch(2, 100, 100);
    win.fire('pointerup', 2, 100, 100);
    expect(asked.places).toEqual(['wish']);
    expect(p.g.followers.add).not.toHaveBeenCalled();
    expect(p.unicorn.emote).toHaveBeenCalledWith('hop');
  });

  it('never lets a herd baby with a waiting wish follow, and stops it following when its wish is offered', () => {
    const u = (id: string) => ({ id, mode: 'graze', followSlot: null as number | null, follow(slot: number) { this.followSlot = slot; }, graze() {} });
    const f = new Followers();
    const g = { waiting: null as unknown };
    f.refuse = (x) => x === g.waiting;
    const a = u('a');
    const b = u('b');
    f.add(a as unknown as UnicornActor);
    f.add(b as unknown as UnicornActor);
    g.waiting = b;
    f.sync();
    expect(f.list.map((x) => x.id)).toEqual(['a']);
    expect(b.followSlot).toBeNull();
    expect(f.add(b as unknown as UnicornActor)).toBeNull();
    expect(f.list.map((x) => x.id)).toEqual(['a']);
    f.set([a, b] as unknown as UnicornActor[]);
    expect(f.list.map((x) => x.id)).toEqual(['a']);
  });
});

describe('the resting slide (2.4.0)', () => {
  it("lets the slide run only during a visit; a drop on the resting slide's top lands beside the ladder", () => {
    const p = setup();
    p.g.hub.visit = null;
    p.touch(1);
    win.fire('pointerup', 1, 100, 100);
    expect(p.rideSlide).not.toHaveBeenCalled();
    expect(p.bob).toHaveBeenCalledTimes(1);
    // Lumi says why once a play, never as a refusal.
    p.touch(2);
    win.fire('pointerup', 2, 100, 100);
    expect(p.bob).toHaveBeenCalledTimes(2);
    expect(p.speak).toHaveBeenCalledTimes(1);
    expect(p.speak).toHaveBeenCalledWith(['lumi4-ducks']);
    // A unicorn carried to the resting slide's top lands on the grass beside the ladder.
    p.w.under = p.unicorn;
    p.touch(3, 100, 100);
    p.canvas.fire('pointermove', 3, 300, 200);
    win.fire('pointerup', 3, 300, 200);
    expect(p.unicorn.drop).toHaveBeenCalledTimes(1);
    const at = p.unicorn.drop.mock.calls[0][0] as { x: number; z: number };
    expect(Math.hypot(at.x - 2.4, at.z - 0.4)).toBeLessThan(2);
    expect(Math.hypot(at.x - 3.4, at.z - 0.4)).toBeGreaterThan(1.6);
    // During a visit it slides.
    p.g.hub.visit = { fromMs: 0, slides: 0 };
    p.w.under = null;
    p.touch(4);
    win.fire('pointerup', 4, 100, 100);
    expect(p.rideSlide).toHaveBeenCalledTimes(1);
  });
});
