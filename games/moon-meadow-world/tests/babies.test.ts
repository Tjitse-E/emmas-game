// The babies lane of 2.4.0 (docs/v4/2.4.md sections 5.3, 5.6, 5.8 and 7; docs/v4/2.4-plan.md Tasks 8 to 11): up to four
// babies a play in any hatch order, each with its door, look, name and first wish; guests and wishes; bedtime with no
// baby up to four; and the record after each place. A small fake game stands in for the world, the actors and the
// layer; the game code under test is the real one.
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { HerdMember, UnicornLook, WishSpec } from '../src/contracts';

/** What the narrator said (audio.sayAll), in order. */
const t = vi.hoisted(() => ({ said: [] as string[][] }));
vi.mock('../src/audio', () => ({
  audio: {
    sfx: async () => {}, say: async () => {}, sayAll: async (ids: string[]) => void t.said.push(ids), sayWhole: async () => true,
    preload: async () => [], fx: async () => {}, checked: () => {}, stop: () => {}, speaking: false, soundState: () => ({}), missing: [],
  },
}));
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});

import { START } from '../src/layout';
import { herd as startHerd } from '../src/content';
import { newborn } from '../src/content/doors';
import { type Baby, type Game, startClock, startQuests } from '../src/game/game';
import { type EggSpot, firstOfKind, namingRules, snapBabies } from '../src/game/eggs-part';
import { createSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';
import { createStreams } from '../src/game/streams';
import { Followers } from '../src/game/followers';
import { Results } from '../src/game/results';
import { Run } from '../src/game/run';
import { startMaths } from '../src/game/band';
import { startHub } from '../src/game/hub';

// ---- a fake game ---------------------------------------------------------------------------------------------------

type FakeUnicorn = ReturnType<typeof fakeUnicorn>;

function fakeUnicorn(id: string, x: number, z: number, look: Partial<UnicornLook> = { stage: 'baby' }) {
  const u = {
    id, name: id, look: look as UnicornLook, mode: 'graze' as string, followSlot: null as number | null, position: new THREE.Vector3(x, 0, z),
    looking: null as { x: number; z: number } | null,
    goTo: async (route: { x: number; z: number }[]) => {
      const end = route[route.length - 1];
      u.position.set(end.x, 0, end.z);
      u.mode = 'idle';
      return true;
    },
    place: (at: { x: number; z: number }) => void u.position.set(at.x, 0, at.z),
    lookAt: (p: { x: number; z: number } | null) => void (u.looking = p),
    emote: async () => {}, showToy: () => {},
    graze: () => {
      u.followSlot = null;
      u.mode = 'graze';
    },
    follow: (slot: number) => {
      u.followSlot = slot;
      u.mode = 'follow';
    },
    headTop: (out = new THREE.Vector3()) => out.set(u.position.x, 1, u.position.z),
  };
  return u;
}

/** A fake game of `seed` whose babies already carry these names (in hatch order, the nest's egg first). */
function fakeGame(names: string[] = [], seed = 3, search = '') {
  const options = parseOptions(`?seed=${seed}${search}`);
  const streams = createStreams(options.seed);
  const save = createSave(() => null, true);
  const herd = startHerd();
  const unicorns = new Map<string, FakeUnicorn>();
  herd.forEach((h, k) => unicorns.set(h.id, fakeUnicorn(h.id, -10 + k * 2, 6, h.look)));
  const her = {
    position: new THREE.Vector3(START.x, 0, START.z), mode: 'idle', mountedOn: null,
    walkTo: async (route: { x: number; z: number }[]) => {
      const end = route[route.length - 1];
      her.position.set(end.x, 0, end.z);
      return true;
    },
    face: () => {}, emote: async () => {}, point: (_p: string, out = new THREE.Vector3()) => out.set(her.position.x, 1, her.position.z),
  };
  const g = {
    world: {
      camera: new THREE.PerspectiveCamera(38, 1080 / 740, 0.5, 700),
      route: (a: { x: number; z: number }, b: { x: number; z: number }) => [a, b],
      nearestWalkable: (p: { x: number; z: number }) => p,
      frame: async () => {}, releaseFrame: vi.fn(), toScreen: () => ({ x: 500, y: 300, visible: true }), markGoal: () => {}, nestGlow: () => {},
    },
    actors: {
      princess: her,
      herd: {
        get: (id: string) => unicorns.get(id),
        all: () => [...unicorns.values()],
        add: (o: { id: string; name: string; look: UnicornLook; at: { x: number; z: number } }) => {
          const u = fakeUnicorn(o.id, o.at.x, o.at.z, o.look);
          u.mode = 'idle';
          unicorns.set(o.id, u);
          return u;
        },
      },
      fx: { sparkle: () => {}, hearts: () => {} },
    },
    layer: { arrow: () => {}, tag: () => {}, lumi: { speak: async () => {} } },
    seed: options.seed, options, save, streams, randFor: (label: string) => streams.for(label),
    maths: startMaths(options.band), today: { wishes: 0, words: [] as string[] }, clock: startClock(), quests: startQuests('beads'),
    openSpec: null, herd, babies: [] as Baby[], part: 'free', goal: null, free: false, bedtime: false, door: null, stalls: new Map(),
    followers: new Followers(), parked: [], results: new Results(), run: new Run(() => () => {}), slid: false, lastTouch: 0,
    entering: new Set(), hub: startHub(), ride: null, waiting: null,
    start: { last: { words: [] as string[], totals: [] as number[] }, afternoon: { maths: null, done: [] } }, hubRefresh: null,
    signUse: { sets: [], targets: [] },
  };
  const game = g as unknown as Game;
  names.forEach((name, i) => game.babies.push(fakeBaby({ door: 13 + i, name })));
  return game;
}

/** A named baby of the play (by default the nest's). */
function fakeBaby(o: { spot?: EggSpot; door?: number; name?: string } = {}): Baby {
  const door = o.door ?? 13;
  const name = o.name ?? 'Pip';
  const look: UnicornLook = { stage: 'baby', breed: 'berry', body: '#ffe0ef', mane: '#ff5f8f', mane2: '#c46bff' };
  const u = fakeUnicorn(`baby-${door}`, 0, 0, look);
  const member: HerdMember = newborn({ name, gpcs: [], clip: `name-${name.toLowerCase()}`, distractors: [] }, look, door);
  return { door, spot: o.spot ?? 'nest', look, unicorn: u as unknown as Baby['unicorn'], member };
}

/** Every order of a list (repeats kept: two trail eggs give each order twice). */
function permutationsOf<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [xs.slice()];
  return xs.flatMap((x, i) => permutationsOf([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

// ---- Task 8: babies in hatch order and the egg places --------------------------------------------------------------

describe('babies in any order', () => {
  it('gives any hatch order doors 13 to 16 in order, looks that differ and names never repeated', () => {
    for (const order of permutationsOf(['nest', 'shore', 'trail', 'trail'] as const)) {
      for (const n of [1, 2, 3, 4]) {
        for (const seed of [3, 7, 11]) {
          const g = fakeGame([], seed);
          snapBabies(g, order.slice(0, n), START, true);
          // The order given is the hatch order.
          expect(g.babies.map((b) => b.spot)).toEqual(order.slice(0, n));
          expect(g.babies.map((b) => b.door)).toEqual([13, 14, 15, 16].slice(0, n));
          expect(new Set(g.babies.map((b) => `${b.look.body}/${b.look.mane}/${b.look.mane2}`)).size).toBe(n);
          expect(new Set(g.babies.map((b) => b.member!.name)).size).toBe(n);
          expect(g.babies.map((b) => b.member!.door)).toEqual([13, 14, 15, 16].slice(0, n));
        }
      }
    }
  });

  it('gives each egg its breed: warm babies of the warm breeds, snow babies snow, star babies moon', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = fakeGame([], seed);
      snapBabies(g, ['nest', 'shore', 'trail', 'trail'], START, true);
      expect(['nestling', 'berry', 'moon']).toContain(g.babies[0].look.breed);
      expect(g.babies.map((b) => b.look.breed).slice(1)).toEqual(['snow', 'moon', 'moon']);
    }
  });

  it('has 3 wrong gems at the play\'s first naming and 4 at every later one, and leaves out the names given', () => {
    expect(namingRules(fakeGame([]))).toEqual({ exclude: [], decoys: 3 });
    expect(namingRules(fakeGame(['Pip']))).toEqual({ exclude: ['Pip'], decoys: 4 });
    expect(namingRules(fakeGame(['Pip', 'Meg', 'Bud']))).toEqual({ exclude: ['Pip', 'Meg', 'Bud'], decoys: 4 });
    // A baby hatched but not named yet does not count.
    const g = fakeGame(['Pip']);
    g.babies.push({ ...fakeBaby({ door: 14 }), member: null });
    expect(namingRules(g)).toEqual({ exclude: ['Pip'], decoys: 4 });
  });

  it('says a kind\'s intro only on its first egg of the play', () => {
    const g = fakeGame([]);
    expect(firstOfKind(g, 'star')).toBe(true);
    g.babies.push(fakeBaby({ spot: 'trail' }));
    expect(firstOfKind(g, 'star')).toBe(false);
    expect(firstOfKind(g, 'snow')).toBe(true);
    expect(firstOfKind(g, 'warm')).toBe(true);
  });
});
