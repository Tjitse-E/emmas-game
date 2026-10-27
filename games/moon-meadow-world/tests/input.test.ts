// The world touch (src/game/input.ts) always ends, so the world keeps taking taps: a release only the window hears
// still taps, a touch whose release went missing ends at the next touch without a tap, and a carried unicorn whose
// capture was lost lands where the finger last was (a lost capture has no point of its own). Fake event targets
// (fixtures/events.ts) stand in for the canvas, the window and the document; a small fake game for the rest.
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installInput } from '../src/game/input';
import type { Game } from '../src/game/game';
import { FakeElement, FakeTarget } from './fixtures/events';

// A carry starts with a sparkle sound; the audio module needs a browser. The picture paths read the page address.
vi.mock('../src/audio', () => ({ audio: { sfx: async () => {}, say: async () => {}, speaking: false } }));
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});

let win: FakeTarget;
beforeEach(() => {
  win = new FakeTarget();
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', new FakeTarget());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const canvas = new FakeElement();
  const unicorn = { mode: 'graze', lift: vi.fn(), carryTo: vi.fn(), drop: vi.fn() };
  const rideSlide = vi.fn();
  const w = { under: null as typeof unicorn | null, picked: { kind: 'slide' } as { kind: string } };
  const g = {
    world: {
      canvas,
      // A ray straight down through (x / 10, z = y / 10): the carry plane and the ground lie under the finger.
      ray: (x: number, y: number) => ({ ray: new THREE.Ray(new THREE.Vector3(x / 10, 10, y / 10), new THREE.Vector3(0, -1, 0)) }),
      pick: () => w.picked,
      toScreen: () => ({ x: -999, y: -999, visible: false }),
      groundAt: (x: number, y: number) => ({ x: x / 10, z: y / 10 }),
    },
    actors: { herd: { pick: () => w.under }, egg: { visible: false }, princess: { rideSlide } },
    layer: { snapshot: () => ({ moment: null }) },
    followers: { sync: () => {} },
    free: true,
    door: null,
    bedtime: false,
    goal: null,
  };
  installInput(g as unknown as Game);
  /** A finger down on the canvas: the window and the document see it first (capture phase). */
  const touch = (id: number, x = 100, y = 100) => {
    win.fire('pointerdown', id, x, y);
    (document as unknown as FakeTarget).fire('pointerdown', id, x, y);
    canvas.fire('pointerdown', id, x, y);
  };
  return { canvas, unicorn, rideSlide, w, touch };
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
