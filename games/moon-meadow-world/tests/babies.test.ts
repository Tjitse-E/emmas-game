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
import { type EggSpot, firstOfKind, namingRules, newbornAt, snapBabies } from '../src/game/eggs-part';
import { guests } from '../src/game/guests';
import { canOfferWish, offerWish, planWish, wishKindFor, wishPlace, withdrawWish } from '../src/game/moments';
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
    layer: {
      arrow: () => {}, tag: () => {}, lumi: { speak: async () => {} },
      wish: vi.fn(async (_spec: WishSpec) => ({ outcome: 'first', misses: 0, ms: 1200 })),
    },
    seed: options.seed, options, save, streams, randFor: (label: string) => streams.for(label),
    maths: startMaths(options.band), today: { wishes: 0, words: [] as string[] }, clock: startClock(), quests: startQuests('beads'),
    openSpec: null, herd, babies: [] as Baby[], part: 'free', goal: null, free: false, bedtime: false, door: null, stalls: new Map(),
    followers: new Followers(), parked: [], results: new Results(), slid: false, lastTouch: 0,
    run: new Run((fn) => {
      const timer = setInterval(() => fn(0.05, 0), 2);
      return () => clearInterval(timer);
    }),
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

// ---- Task 9: guests, wish kinds and the herd baby's wish ------------------------------------------------------------

/** A herd unicorn of the fake game by name. */
const unicorn = (g: Game, id: string): FakeUnicorn => g.actors.herd.get(id) as unknown as FakeUnicorn;
/** Put a herd unicorn at a ground point. */
const put = (g: Game, id: string, x: number, z: number) => unicorn(g, id).position.set(x, 0, z);
/** The herd babies (not foals) of the starting herd. */
const herdBabies = (g: Game) => g.herd.filter((h) => h.look.stage === 'baby').map((h) => h.id);

describe('guests', () => {
  it('takes her babies in hatch order, then her baby followers, then the herd babies nearest the place', () => {
    const g = fakeGame();
    const at = { x: 30, z: 30 };
    // Everyone far away, two herd babies near the place.
    g.herd.forEach((h, k) => put(g, h.id, -20 - k, -20));
    const [a, b, c] = herdBabies(g);
    put(g, a, 31, 30);
    put(g, b, 33, 30);
    expect(guests(g, at, 2).map((u) => u.id)).toEqual([a, b]);
    // A follower comes before the herd, and a foal that follows is no guest.
    const foal = g.herd.find((h) => h.look.stage === 'foal')!.id;
    g.followers.add(unicorn(g, foal) as unknown as Baby['unicorn']);
    g.followers.add(unicorn(g, c) as unknown as Baby['unicorn']);
    expect(guests(g, at, 2).map((u) => u.id)).toEqual([c, a]);
    // A newborn comes first of all, the follower after it.
    const pip = fakeBaby();
    g.babies.push(pip);
    expect(guests(g, at, 2).map((u) => u.id)).toEqual(['baby-13', c]);
    expect(guests(g, at, 3).map((u) => u.id)).toEqual(['baby-13', c, a]);
    // A newborn that follows is taken once.
    g.followers.add(pip.unicorn, true);
    expect(guests(g, at, 3).map((u) => u.id)).toEqual(['baby-13', c, a]);
  });

  it('never takes a herd baby whose wish waits, a hay rack helper or one in a stall', () => {
    const g = fakeGame();
    const at = { x: 30, z: 30 };
    g.herd.forEach((h, k) => put(g, h.id, -20 - k, -20));
    const [a, b, c, d] = herdBabies(g);
    [a, b, c, d].forEach((id, k) => put(g, id, 30 + k, 30));
    g.waiting = unicorn(g, a) as unknown as Game['waiting'];
    g.quests.helpers = [b];
    unicorn(g, c).mode = 'stall';
    expect(guests(g, at, 1).map((u) => u.id)).toEqual([d]);
  });
});

describe('wish kinds', () => {
  it('picks the kind read least, never the last kind, never picnic next to the picnic', () => {
    expect(wishKindFor({ dress: 0, bath: 0, picnic: 0 }, null, false)).toBe('dress');
    expect(wishKindFor({ dress: 1, bath: 0, picnic: 0 }, 'dress', false)).toBe('bath');
    expect(wishKindFor({ dress: 1, bath: 1, picnic: 0 }, 'bath', true)).toBe('dress');
    expect(wishKindFor({ dress: 1, bath: 1, picnic: 0 }, 'bath', false)).toBe('picnic');
    // A tie goes dress, bath, picnic.
    expect(wishKindFor({ dress: 2, bath: 1, picnic: 1 }, null, false)).toBe('bath');
    expect(wishKindFor({ dress: 2, bath: 1, picnic: 1 }, 'bath', false)).toBe('picnic');
    for (let d = 0; d < 4; d++) for (let b = 0; b < 4; b++) for (let p = 0; p < 4; p++) {
      for (const last of ['dress', 'bath', 'picnic', null] as const) for (const near of [false, true]) {
        const k = wishKindFor({ dress: d, bath: b, picnic: p }, last, near);
        expect(k).not.toBe(last);
        if (near) expect(k).not.toBe('picnic');
      }
    }
  });

  it('leaves out the play\'s earlier basket words per kind, picnic too', () => {
    for (const kind of ['picnic', 'dress', 'bath'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const g = fakeGame([], seed);
        const one = planWish(g, kind, `${kind}-a`, { wish: false });
        const two = planWish(g, kind, `${kind}-b`, { wish: false });
        const words = (s: WishSpec) => [s.target.word, ...s.basket.map((b) => b.word)];
        expect(words(two).filter((w) => words(one).includes(w)), `${kind} seed ${seed}`).toEqual([]);
      }
    }
  });

  it('gives each newborn its naming and first wish: the nest egg\'s baby dresses up like her, the next wishes another kind', async () => {
    const g = fakeGame([], 5);
    const egg = () => ({ position: new THREE.Vector3(0, 0, 0), visible: true, hatch: async () => {}, hide: () => {} });
    Object.assign(g.actors, { egg: egg(), trailEgg: egg() });
    const gems: number[] = [];
    Object.assign(g.layer, {
      naming: vi.fn(async (spec: { bells: { distractors: string[] }[] }) => {
        gems.push(spec.bells[0].distractors.length);
        return { outcome: 'first', misses: 0, ms: 900, name: spec.bells[0] };
      }),
    });
    const one = await newbornAt(g, 'nest');
    const two = await newbornAt(g, 'shore');
    const three = await newbornAt(g, 'trail');
    expect([one, two, three].map((b) => `${b.door}:${b.spot}`)).toEqual(['13:nest', '14:shore', '15:trail']);
    expect(gems).toEqual([3, 4, 4]);
    expect(new Set([one, two, three].map((b) => b.member!.name)).size).toBe(3);
    const lines = g.results.lines.map((l) => `${l.part}:${l.strand}${l.detail.kind ? `:${l.detail.kind}` : ''}`);
    expect(lines).toEqual(['naming-1:s', 'wish-1:r:dress', 'naming-2:s', 'wish-2:r:bath', 'naming-3:s', 'wish-3:r:picnic']);
    // The dress-up line comes before the dress-up wish only.
    expect(t.said.filter((ids) => ids.includes('g4-dress-up'))).toHaveLength(1);
  });
});

describe('a herd baby\'s wish', () => {
  it('keeps a herd baby with a wish still, turned to her and waiting: the grazing herd baby nearest her', () => {
    const g = fakeGame();
    const her = g.actors.princess.position;
    g.herd.forEach((h, k) => put(g, h.id, her.x + 20 + k, her.z));
    const [a, b, c, d, e] = herdBabies(g);
    const foal = g.herd.find((h) => h.look.stage === 'foal')!.id;
    // Nearer than the one it takes: a foal, a follower, a hay rack helper and one that stepped aside for a place.
    put(g, foal, her.x + 1, her.z);
    put(g, a, her.x + 1.5, her.z);
    g.followers.add(unicorn(g, a) as unknown as Baby['unicorn']);
    put(g, b, her.x + 2, her.z);
    g.quests.helpers = [b];
    put(g, c, her.x + 2.5, her.z);
    g.parked.push(unicorn(g, c) as unknown as Baby['unicorn']);
    put(g, d, her.x + 3, her.z);
    put(g, e, her.x + 4, her.z);
    expect(canOfferWish(g)).toBe(true);
    const u = offerWish(g);
    expect(u?.id).toBe(d);
    expect(g.waiting).toBe(u);
    expect(unicorn(g, d).mode).toBe('idle');
    expect(unicorn(g, d).position.x).toBeCloseTo(her.x + 3);
    expect(unicorn(g, d).looking).toEqual({ x: her.x, z: her.z });
    expect(g.followers.list.map((x) => x.id)).toEqual([a]);
    // One waits at a time: asked again, the same baby.
    expect(offerWish(g)).toBe(u);
    // Its bubble went: it grazes again and nobody waits.
    withdrawWish(g, u!);
    expect(g.waiting).toBeNull();
    expect(unicorn(g, d).mode).toBe('graze');
    expect(unicorn(g, d).looking).toBeNull();
  });

  it('offers no wish when no herd baby grazes', () => {
    const g = fakeGame();
    for (const h of g.herd) unicorn(g, h.id).mode = 'stall';
    expect(canOfferWish(g)).toBe(false);
    expect(offerWish(g)).toBeNull();
    expect(g.waiting).toBeNull();
  });

  it('plays "Your baby has a wish!" once a wish, in its intro, and logs wish-herd-<k>', async () => {
    const g = fakeGame([], 4);
    t.said.length = 0;
    const u = offerWish(g)!;
    const release = await wishPlace(g, u);
    const spec = vi.mocked(g.layer.wish).mock.calls[0][0];
    expect(spec.clips.intro[0]).toBe('g-wish');
    expect(spec.clips.intro.filter((id) => id === 'g-wish')).toHaveLength(1);
    expect(t.said.flat()).not.toContain('g-wish');
    expect(g.results.lines.map((l) => `${l.part}:${l.strand}`)).toEqual(['wish-herd-1:r']);
    // Its baby still waits until the release; then it grazes again and nobody waits.
    expect(g.waiting).toBe(u);
    release();
    expect(g.waiting).toBeNull();
    expect(unicorn(g, u.id).mode).toBe('graze');
    // The second herd wish of the play logs as wish-herd-2, and a dress wish (read least, not the last) comes first.
    const v = offerWish(g)!;
    (await wishPlace(g, v))();
    expect(g.results.lines.map((l) => `${l.part}:${l.detail.kind}`)).toEqual(['wish-herd-1:dress', 'wish-herd-2:bath']);
  });
});
