// The afternoon's rules (docs/v4/2.3.md section 17): the free-play clocks of 17.3, the maths quest's rotation, which
// quest may start, gifts that are saved at the pick and kept on, a full set that keeps paying, every quest resolving
// framed with the gift picker before its release, the Dressing Corner's visit, and the trunk tap after it. A small
// fake game stands in for the world, the actors and the layer; the game code under test is the real one.
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiftItem, Owned, PrincessLook } from '../src/contracts';

vi.mock('../src/audio', () => ({
  audio: {
    sfx: async () => {}, say: async () => {}, sayAll: async () => {}, sayWhole: async () => true, preload: async () => [],
    fx: async () => {}, checked: () => {}, stop: () => {}, speaking: false,
  },
}));
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});

import { DEFAULT_LOOK, GIFT_SETS, START_OWNED, copyOwned, owns, stillToEarn, withItem } from '../src/wardrobe';
import { BEAD_TREE, CORNER, PICNIC } from '../src/layout';
import {
  CORNER_MAX_MS, CORNER_MIN_MS, FREE_PLAY_MS, QUEST_CUTOFF_MS, cornerLimitMs, fillsOwnSet, freePlayOver, giftOffer,
  giveGift, mathsQuestFor, pastCutoff, tickFree,
} from '../src/game/quest-kit';
import { type Game, startClock, startQuests } from '../src/game/game';
import { askQuest, badgeOf, canQuest, placeAt, runQuest } from '../src/game/quests';
import { cornerQuest, trunkTap } from '../src/game/corner';
import { createSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';
import { createStreams } from '../src/game/streams';
import { Followers } from '../src/game/followers';
import { Results } from '../src/game/results';
import { Run } from '../src/game/run';
import { startMaths } from '../src/game/band';
import type { QuestId } from '../src/game/options';

// ---- a fake game ---------------------------------------------------------------------------------------------------

function fakeUnicorn(id: string, x: number, z: number) {
  const u = {
    id, name: id, mode: 'follow', followSlot: null as number | null, position: new THREE.Vector3(x, 0, z),
    goTo: async (route: { x: number; z: number }[]) => {
      const end = route[route.length - 1];
      u.position.set(end.x, 0, end.z);
      return true;
    },
    place: (at: { x: number; z: number }) => void u.position.set(at.x, 0, at.z),
    lookAt: () => {}, emote: async () => {}, showToy: () => {}, graze: () => {},
    follow: (slot: number) => void (u.followSlot = slot),
    headTop: (out = new THREE.Vector3()) => out.set(u.position.x, 1, u.position.z),
  };
  return u;
}

interface Calls {
  order: string[];
  framed: boolean;
  wardrobe: Parameters<Game['layer']['wardrobe']>[0] | null;
}

function fakeGame(o: { search?: string; owned?: Owned } = {}): { g: Game; calls: Calls } {
  const calls: Calls = { order: [], framed: false, wardrobe: null };
  const her = {
    position: new THREE.Vector3(-9, 0, 3), mode: 'idle', look: { ...DEFAULT_LOOK } as PrincessLook,
    setLook(l: Partial<PrincessLook>) {
      her.look = { ...her.look, ...l };
    },
    walkTo: async (route: { x: number; z: number }[]) => {
      const end = route[route.length - 1];
      her.position.set(end.x, 0, end.z);
      return true;
    },
    face: () => {}, emote: async () => {}, hold: () => {}, portrait: () => {}, turnBy: () => {}, crown: () => {},
    point: (_p: string, out = new THREE.Vector3()) => out.set(her.position.x, 1, her.position.z),
  };
  const save = createSave(() => null, true);
  if (o.owned) save.write((s) => void (s.owned = copyOwned(o.owned!)));
  const options = parseOptions(o.search ?? '?seed=3');
  const streams = createStreams(options.seed);
  const babies = [fakeUnicorn('baby-13', -8, 4), fakeUnicorn('baby-14', -8, 5)];
  const g = {
    world: {
      camera: new THREE.PerspectiveCamera(38, 1080 / 740, 0.5, 700),
      route: (a: { x: number; z: number }, b: { x: number; z: number }) => [a, b],
      nearestWalkable: (p: { x: number; z: number }) => p,
      frame: vi.fn(async () => void (calls.framed = true)),
      releaseFrame: vi.fn(() => {
        calls.framed = false;
        calls.order.push('release');
      }),
      toScreen: () => ({ x: 500, y: 300, visible: true }),
      corner: { lid: vi.fn(async () => {}), open: 0 },
    },
    actors: {
      princess: her,
      fx: { sparkle: () => {}, hearts: () => {} },
      herd: { get: () => undefined },
      placePrincess: (at: { x: number; z: number }) => void her.position.set(at.x, 0, at.z),
    },
    layer: {
      lumi: { speak: async () => {}, show: vi.fn() },
      wish: vi.fn(async () => {
        calls.order.push('wish');
        return { outcome: 'first', misses: 0, ms: 900 };
      }),
      gift: vi.fn(async (go: { items: GiftItem[] }) => {
        calls.order.push(calls.framed ? 'gift framed' : 'gift unframed');
        return go.items[go.items.length - 1];
      }),
      wardrobe: vi.fn(async (wo: NonNullable<Calls['wardrobe']>) => {
        calls.wardrobe = wo;
        calls.order.push(calls.framed ? 'wardrobe framed' : 'wardrobe unframed');
        wo.onBox?.(true);
        tickFree(g, 5000);
        wo.onBox?.(false);
        return { look: wo.look, end: 'time' as const };
      }),
      board: vi.fn(async () => void calls.order.push('board')),
      offer: () => {},
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
    openSpec: null,
    herd: [],
    babies: babies.map((u, i) => ({ door: 13 + i, look: {}, unicorn: u, member: { id: u.id, name: i ? 'Pip' : 'Bo', clip: 'x', door: 13 + i, look: {} } })),
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
      const t = setInterval(() => fn(0.05, 0), 2);
      return () => clearInterval(t);
    }),
    slid: false,
    lastTouch: 0,
    entering: new Set(),
  } as unknown as Game;
  return { g, calls };
}

beforeEach(() => {
  vi.stubGlobal('innerWidth', 1080);
  vi.stubGlobal('innerHeight', 740);
  vi.stubGlobal('addEventListener', () => {});
  vi.stubGlobal('removeEventListener', () => {});
  vi.stubGlobal('fetch', () => Promise.resolve());
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---- the clocks (17.3) ---------------------------------------------------------------------------------------------

/** Run `ms` of afternoon in 50 ms frames, with a quest running or not, and the music box playing or not. */
function play(g: Game, ms: number, running: QuestId | null = null, dressing = false): void {
  g.quests.running = running;
  g.quests.dressing = dressing;
  for (let t = 0; t < ms; t += 50) tickFree(g, 50);
  g.quests.running = null;
  g.quests.dressing = false;
}

describe('the free-play clocks', () => {
  it('count free time only without a quest, and the Corner music box as both free time and dressing', () => {
    const { g } = fakeGame();
    play(g, 10_000);
    play(g, 96_000, 'picnic');
    expect(g.quests.freeMs).toBe(10_000);
    expect(g.quests.wallMs).toBe(106_000);
    play(g, 50_000, 'corner');
    expect(g.quests.freeMs).toBe(10_000);
    play(g, 60_000, 'corner', true);
    expect(g.quests.freeMs).toBe(70_000);
    expect(g.clock.dressMs.corner).toBe(60_000);
  });

  it('let the maths quest start after the picnic and a 60 s Corner', () => {
    const { g } = fakeGame();
    play(g, 15_000);
    play(g, 96_000, 'picnic');
    g.quests.done.add('picnic');
    expect(canQuest(g, 'corner')).toBe(true);
    expect(cornerLimitMs(g.quests.freeMs)).toBe(CORNER_MAX_MS);
    play(g, 60_000, 'corner');
    play(g, cornerLimitMs(g.quests.freeMs), 'corner', true);
    g.quests.done.add('corner');
    play(g, 5000);
    expect(g.quests.freeMs).toBe(80_000);
    expect(pastCutoff(g)).toBe(false);
    expect(canQuest(g, 'beads')).toBe(true);
    expect(canQuest(g, 'rack')).toBe(false);
  });

  it('stop new picnic and maths quests after 90 s of free time without dressing, but not the Corner', () => {
    const { g } = fakeGame();
    g.quests.done.add('picnic');
    play(g, QUEST_CUTOFF_MS - 50);
    expect(canQuest(g, 'beads')).toBe(true);
    play(g, 50);
    expect(canQuest(g, 'beads')).toBe(false);
    expect(canQuest(g, 'corner')).toBe(true);
  });

  it('never end free play while the Corner runs or its music box plays', () => {
    const { g } = fakeGame();
    play(g, FREE_PLAY_MS + 5000);
    expect(freePlayOver(g)).toBe(true);
    g.quests.running = 'corner';
    expect(freePlayOver(g)).toBe(false);
    g.quests.dressing = true;
    expect(freePlayOver(g)).toBe(false);
    g.quests.running = null;
    expect(freePlayOver(g)).toBe(false);
  });

  it('give the Corner 30 to 60 s of music box, so free time never passes 150 s', () => {
    for (let f = 0; f <= FREE_PLAY_MS; f += 500) {
      const limit = cornerLimitMs(f);
      expect(limit).toBeGreaterThanOrEqual(CORNER_MIN_MS);
      expect(limit).toBeLessThanOrEqual(CORNER_MAX_MS);
      expect(f + limit).toBeLessThanOrEqual(150_000);
      if (f <= FREE_PLAY_MS - CORNER_MIN_MS && f >= FREE_PLAY_MS - CORNER_MAX_MS) expect(f + limit).toBe(FREE_PLAY_MS);
    }
  });
});

// ---- rotation and offers (17.2) ------------------------------------------------------------------------------------

describe('the maths quest', () => {
  it('starts with the bead tree, comes again when she missed it, and takes turns when she finished it', () => {
    expect(mathsQuestFor({ maths: null, done: [] })).toBe('beads');
    expect(mathsQuestFor({ maths: 'beads', done: ['picnic'] })).toBe('beads');
    expect(mathsQuestFor({ maths: 'beads', done: ['beads', 'corner'] })).toBe('rack');
    expect(mathsQuestFor({ maths: 'rack', done: ['rack'] })).toBe('beads');
    expect(mathsQuestFor({ maths: 'rack', done: [] })).toBe('rack');
    expect(mathsQuestFor({ maths: 'beads', done: ['beads'] }, 'beads')).toBe('beads');
    expect(mathsQuestFor({ maths: null, done: [] }, 'rack')).toBe('rack');
  });

  it('is the one the game offers this play, from the save, with the picnic', () => {
    const { g } = fakeGame();
    expect(['picnic', 'rack', 'beads', 'corner'].filter((id) => canQuest(g, id as QuestId))).toEqual(['picnic', 'beads']);
    g.quests.maths = 'rack';
    expect(['picnic', 'rack', 'beads', 'corner'].filter((id) => canQuest(g, id as QuestId))).toEqual(['picnic', 'rack']);
  });
});

describe('the Dressing Corner and the bubbles', () => {
  it('opens after her first finished quest, once a play, and at once with ?quest=corner', () => {
    const { g } = fakeGame();
    expect(canQuest(g, 'corner')).toBe(false);
    g.quests.done.add('beads');
    expect(askQuest(g, 'corner')).toBe(true);
    g.quests.asked = null;
    g.quests.done.add('corner');
    expect(canQuest(g, 'corner')).toBe(false);
    expect(canQuest(fakeGame({ search: '?quest=corner' }).g, 'corner')).toBe(true);
  });

  it('needs both named babies, and nothing starts at bedtime or once free play is over', () => {
    const { g } = fakeGame();
    g.babies[1].member = null;
    expect(canQuest(g, 'picnic')).toBe(false);
    const b = fakeGame().g;
    b.bedtime = true;
    expect(canQuest(b, 'picnic')).toBe(false);
    const c = fakeGame().g;
    c.quests.over = true;
    expect(canQuest(c, 'picnic')).toBe(false);
  });

  it('start by walking near the nearest place: her Corner spot is the Corner, not the picnic rug 1.9 m away', () => {
    expect(placeAt(CORNER.stand)).toBe('corner');
    expect(placeAt(PICNIC.stand)).toBe('picnic');
    expect(placeAt(PICNIC.rug.center)).toBe('picnic');
    expect(placeAt(BEAD_TREE.stand)).toBe('beads');
    expect(placeAt({ x: -11, z: 1 })).toBeNull();
  });

  it('show a gift she can still earn on the quest bubbles, and none once every set is full', () => {
    const { g } = fakeGame();
    expect(badgeOf(g, 'picnic')).toMatch(/^data:image\/svg\+xml,/);
    expect(badgeOf(g, 'beads')).toMatch(/^data:image\/svg\+xml,/);
    expect(badgeOf(g, 'corner')).toBeUndefined();
    let all = copyOwned(START_OWNED);
    for (const s of Object.values(GIFT_SETS)) for (const i of s.items) all = withItem(all, i);
    expect(badgeOf(fakeGame({ owned: all }).g, 'picnic')).toBeUndefined();
  });
});

// ---- gifts (5, 17.2) -----------------------------------------------------------------------------------------------

describe('gifts', () => {
  it('come from the quest own set, then from the set with the most left, to the end of every set', () => {
    let owned = copyOwned(START_OWNED);
    const rand = createStreams(5).for('gift-picnic');
    const got: GiftItem[] = [];
    for (let k = 0; k < 40; k++) {
      const { set, items } = giftOffer('picnic', owned, rand);
      if (!set) break;
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(2);
      // Its own set while it has items left.
      if (stillToEarn('crowns', owned).length) expect(set).toBe('crowns');
      for (const i of items) expect(owns(owned, i)).toBe(false);
      owned = withItem(owned, items[0]);
      got.push(items[0]);
    }
    expect(got).toHaveLength(Object.values(GIFT_SETS).reduce((n, s) => n + s.items.length, 0));
    expect(giftOffer('picnic', owned, rand).items).toEqual([]);
  });

  it('are saved at the pick and kept on, and the full set gets its sticker line', async () => {
    const { g } = fakeGame();
    const item = await giveGift(g, 'beads');
    expect(item).not.toBeNull();
    expect(owns(g.save.data.owned, item!)).toBe(true);
    expect(g.save.data.look[item!.field]).toBe(item!.id);
    expect(g.actors.princess.look[item!.field]).toBe(item!.id);
    expect(g.quests.gifts).toEqual([item]);
    expect(fillsOwnSet('beads', g.save.data.owned)).toBe(false);
  });

  it('keep paying once the quest own set is full: the picnic then gives from the set with the most left', async () => {
    let owned = copyOwned(START_OWNED);
    for (const i of GIFT_SETS.crowns.items) owned = withItem(owned, i);
    const { g } = fakeGame({ owned });
    const item = await giveGift(g, 'picnic');
    // The hair set has 8 items left, the jewels 6 and the shoes 3.
    expect(GIFT_SETS.hair.items).toContainEqual(item);
    expect(fillsOwnSet('picnic', g.save.data.owned)).toBe(true);
  });

  it('give no picker when every set is full', async () => {
    let all = copyOwned(START_OWNED);
    for (const s of Object.values(GIFT_SETS)) for (const i of s.items) all = withItem(all, i);
    const { g } = fakeGame({ owned: all });
    expect(await giveGift(g, 'rack')).toBeNull();
    expect(g.layer.gift).not.toHaveBeenCalled();
  });
});

// ---- quests resolve framed (17.2) ----------------------------------------------------------------------------------

describe('every quest', () => {
  for (const id of ['picnic', 'rack', 'beads'] as const) {
    it(`${id}: the gift picker runs in the quest's frame, before its release`, async () => {
      const { g, calls } = fakeGame();
      await runQuest(g, id, async (gg) => {
        await gg.world.frame({ x: 0, z: 0 }, 6);
        calls.order.push('quest');
        return () => gg.world.releaseFrame();
      });
      expect(calls.order).toEqual(['quest', 'gift framed', 'release']);
    });
  }

  it('corner: runs its own picker, so the afternoon runs none after it', async () => {
    const { g, calls } = fakeGame();
    await runQuest(g, 'corner', async (gg) => {
      await gg.world.frame({ x: 0, z: 0 }, 6);
      return () => gg.world.releaseFrame();
    });
    expect(calls.order).toEqual(['release']);
    expect(g.layer.gift).not.toHaveBeenCalled();
  });
});

describe('the Corner visit', () => {
  it('gates with two reads, gives a hair gift she wears into the wardrobe, and resolves still framed', async () => {
    const { g, calls } = fakeGame({ search: '?seed=3&phrases=all' });
    g.quests.done.add('picnic');
    g.quests.freeMs = 70_000;
    const release = await cornerQuest(g);
    expect(calls.order).toEqual(['wish', 'wish', 'gift framed', 'wardrobe framed']);
    expect(g.results.lines.map((r) => r.part)).toEqual(['gate1', 'gate2']);
    expect(g.quests.gate).toEqual({ kind: 'phrase', first: 2 });
    const w = calls.wardrobe!;
    // The gift came from the hair set, and she wears it into the wardrobe.
    const gift = g.quests.gifts[0];
    expect(GIFT_SETS.hair.items).toContainEqual(gift);
    expect(w.look[gift.field]).toBe(gift.id);
    expect(owns(w.owned, gift)).toBe(true);
    // The music box gets the free time that is left; the board shows today's gift.
    expect(w.limitMs).toBe(50_000);
    expect(w.board?.fresh).toEqual([gift]);
    // Its music box time was free time and dressing time.
    expect(g.quests.freeMs).toBe(75_000);
    expect(g.clock.dressMs.corner).toBe(5000);
    expect(g.quests.dressing).toBe(false);
    expect(g.world.releaseFrame).not.toHaveBeenCalled();
    release();
    expect(g.world.releaseFrame).toHaveBeenCalledTimes(1);
    expect(g.followers.list.map((u) => u.id)).toEqual(['baby-13', 'baby-14']);
  });

  it('takes ?box= as the music box', async () => {
    const { g, calls } = fakeGame({ search: '?seed=4&box=5&phrases=all' });
    await cornerQuest(g);
    expect(calls.wardrobe!.limitMs).toBe(5000);
  });
});

describe('the trunk after her visit', () => {
  it('opens on the treasure board for 3.5 s, never refuses and never starts the Corner again', async () => {
    vi.useFakeTimers();
    const { g } = fakeGame();
    expect(trunkTap(g)).toBe(false);
    g.quests.done.add('corner');
    expect(trunkTap(g)).toBe(true);
    expect(g.layer.board).toHaveBeenCalledTimes(1);
    expect(vi.mocked(g.layer.board).mock.calls[0][1]).toBe(3500);
    expect(g.world.corner.lid).toHaveBeenCalledWith(true);
    // A second tap while it shows: still no refusal, one board.
    expect(trunkTap(g)).toBe(true);
    expect(g.layer.board).toHaveBeenCalledTimes(1);
    expect(canQuest(g, 'corner')).toBe(false);
    expect(g.quests.boards).toBe(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(g.world.corner.lid).toHaveBeenLastCalledWith(true);
    await vi.advanceTimersByTimeAsync(600);
    expect(g.world.corner.lid).toHaveBeenLastCalledWith(false);
    // Once it has folded away, the next tap opens it again.
    expect(trunkTap(g)).toBe(true);
    expect(g.layer.board).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('stands where the Corner is', () => {
    expect(Math.hypot(CORNER.trunk.x - CORNER.stand.x, CORNER.trunk.z - CORNER.stand.z)).toBeLessThan(2);
  });
});
