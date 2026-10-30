// The afternoon's rules (docs/v4/2.3.md section 17; 2.4.0 moved the clocks to the hub, tests/hub.test.ts): the maths quest's rotation, which
// quest may start, gifts that are saved at the pick and kept on, a full set that keeps paying, every quest resolving
// framed with the gift picker before its release, the Dressing Corner's visit (its gate with phrase wishes on a fresh
// device and word wishes with too few strong phrases), the trunk tap after it, and the start mirror's music box. A small fake game stands in for the world, the actors and the layer; the game code
// under test is the real one.
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiftItem, Owned, PrincessLook } from '../src/contracts';

/**
 * What the narrator said (audio.sayAll), and how the phrases answer the gate: 'real', 'word' (as with fewer than 6
 * strong phrases: gateKind says 'word' and the reading lane's planner gives a dress-up word wish), or 'throw' (no pair).
 */
const t = vi.hoisted(() => ({ said: [] as string[][], phrases: 'real' as 'real' | 'throw' | 'word' }));
vi.mock('../src/audio', () => ({
  audio: {
    sfx: async () => {}, say: async () => {}, sayAll: async (ids: string[]) => void t.said.push(ids), sayWhole: async () => true,
    preload: async () => [], fx: async () => {}, checked: () => {}, stop: () => {}, speaking: false,
  },
}));
// With fewer than 6 strong phrases the reading lane's planner gives the dress-up word wish itself (gateKind 'word'). A
// planner that finds no pair to pick from throws; the gate still opens.
vi.mock('../src/content/phrases', async (importOriginal) => {
  const m = await importOriginal<typeof import('../src/content/phrases')>();
  const gateKind: typeof m.gateKind = (o) => (t.phrases === 'word' ? 'word' : m.gateKind(o));
  return { ...m, gateKind };
});
vi.mock('../src/game/moments', async (importOriginal) => {
  const m = await importOriginal<typeof import('../src/game/moments')>();
  const planWish: typeof m.planWish = (g, kind, label, o) => {
    if (kind === 'phrase' && t.phrases === 'throw') throw new Error('pick from an empty list');
    return m.planWish(g, kind, label, o);
  };
  return { ...m, planWish };
});
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location ??= { pathname: '/games/moon-meadow-world/index.html' };
});

import { DEFAULT_LOOK, GIFT_SETS, START_OWNED, copyOwned, owns, stillToEarn, withItem } from '../src/wardrobe';
import { CORNER } from '../src/layout';
import { fillsSet, giftOffer, giveGift, mathsQuestFor } from '../src/game/quest-kit';
import { type Game, startClock, startQuests } from '../src/game/game';
import { badgeOf, playQuests, runQuest } from '../src/game/quests';
import { hubCtx } from '../src/game/hub-part';
import { secondWishKind } from '../src/game/moments';
import { cornerQuest, trunkTap } from '../src/game/corner';
import { MIRROR_MS, dressClips, wardrobe } from '../src/game/wardrobe-part';
import { gateKind as phraseGateKind } from '../src/content/phrases';
import { createSave } from '../src/game/save';
import { parseOptions } from '../src/game/options';
import { createStreams } from '../src/game/streams';
import { Followers } from '../src/game/followers';
import { Results } from '../src/game/results';
import { Run } from '../src/game/run';
import { startMaths } from '../src/game/band';
import { placeEnded, refill, startHub } from '../src/game/hub';
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
    face: () => {}, emote: async () => {}, hold: () => {}, portrait: () => {}, turnBy: () => {}, crown: () => {}, extra: () => {},
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
      stable: { hay: () => {} },
    },
    actors: {
      princess: her,
      fx: { sparkle: () => {}, hearts: () => {}, starfall: async () => {} },
      herd: { get: () => undefined },
      placePrincess: (at: { x: number; z: number }) => void her.position.set(at.x, 0, at.z),
    },
    layer: {
      lumi: {
        speak: vi.fn(async (ids: string[]) => void calls.order.push(`lumi ${ids.join(',')}`)),
        show: vi.fn(),
      },
      wish: vi.fn(async () => {
        calls.order.push(calls.framed ? 'wish framed' : 'wish unframed');
        return { outcome: 'first', misses: 0, ms: 900 };
      }),
      egg: vi.fn(async () => {
        calls.order.push(calls.framed ? 'sum framed' : 'sum unframed');
        return { outcome: 'first', misses: 0, ms: 1500 };
      }),
      gift: vi.fn(async (go: { items: GiftItem[] }) => {
        calls.order.push(calls.framed ? 'gift framed' : 'gift unframed');
        return go.items[go.items.length - 1];
      }),
      wardrobe: vi.fn(async (wo: NonNullable<Calls['wardrobe']>) => {
        calls.wardrobe = wo;
        calls.order.push(calls.framed ? 'wardrobe framed' : 'wardrobe unframed');
        wo.onBox?.(true);
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
    hub: startHub(),
    waiting: null,
  } as unknown as Game;
  return { g, calls };
}

beforeEach(() => {
  t.said.length = 0;
  t.phrases = 'real';
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

  it('is the one the hub offers this play, from the save, with the picnic (2.4.0: through the refill)', () => {
    const { g } = fakeGame();
    const offered = () => refill(g.hub, hubCtx(g)).filter((id) => ['picnic', 'rack', 'beads', 'corner'].includes(id));
    g.hub.done = ['egg'];
    expect(offered()).toEqual(['picnic', 'beads']);
    g.quests.maths = 'rack';
    expect(offered()).toEqual(['picnic', 'rack']);
  });

  it('offers the picnic on every play, so wish2 by the wild egg is a pond wish; without the picnic it would be a picnic wish (2.3.2)', () => {
    for (const maths of ['beads', 'rack'] as const) {
      const { g } = fakeGame();
      g.quests.maths = maths;
      expect(playQuests(g)).toEqual(['picnic', maths, 'corner']);
      expect(secondWishKind(playQuests(g))).toBe('bath');
    }
    expect(secondWishKind(['beads', 'corner'])).toBe('picnic');
  });
});

describe('the Dressing Corner and the bubbles', () => {
  it('opens after her first finished learning place, once a play (2.4.0: the play bubble of the hub)', () => {
    const { g } = fakeGame();
    expect(refill(g.hub, hubCtx(g))).not.toContain('corner');
    placeEnded(g.hub, 'beads', hubCtx(g));
    expect(refill(g.hub, hubCtx(g))).toContain('corner');
    placeEnded(g.hub, 'corner', hubCtx(g));
    placeEnded(g.hub, 'picnic', hubCtx(g));
    expect(refill(g.hub, hubCtx(g))).not.toContain('corner');
  });

  it('show a gift she can still earn on the quest bubbles, the trunk bubble too, and none once every set is full', () => {
    const { g } = fakeGame();
    expect(badgeOf(g, 'picnic')).toMatch(/^data:image\/svg\+xml,/);
    expect(badgeOf(g, 'beads')).toMatch(/^data:image\/svg\+xml,/);
    expect(badgeOf(g, 'corner')).toMatch(/^data:image\/svg\+xml,/);
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

  it('are saved at the pick and kept on', async () => {
    const { g } = fakeGame();
    const item = await giveGift(g, 'beads');
    expect(item).not.toBeNull();
    expect(owns(g.save.data.owned, item!)).toBe(true);
    expect(g.save.data.look[item!.field]).toBe(item!.id);
    expect(g.actors.princess.look[item!.field]).toBe(item!.id);
    expect(g.quests.gifts).toEqual([item]);
  });

  /** How often Lumi said the sticker line. */
  const stickers = (g: Game): number => vi.mocked(g.layer.lumi.speak).mock.calls.filter(([ids]) => ids.includes('lumi4-sticker')).length;

  it('give the sticker line once, on the pick that fills a set, and never again for that set', async () => {
    // The picnic's crowns, one play after another: the fake picker takes the last card each time.
    let owned = copyOwned(START_OWNED);
    const left = stillToEarn('crowns', owned).length;
    expect(left).toBeGreaterThan(1);
    for (let k = 1; k <= left + 2; k++) {
      const { g } = fakeGame({ owned });
      const item = await giveGift(g, 'picnic');
      expect(item).not.toBeNull();
      // Only the pick that took the last crown says it. The gifts after it come from the hair set: no line.
      expect(stickers(g), `picnic gift ${k}`).toBe(k === left ? 1 : 0);
      if (k > left) expect(GIFT_SETS.hair.items).toContainEqual(item);
      owned = g.save.data.owned;
    }
    expect(stillToEarn('crowns', owned)).toEqual([]);
  });

  it('say the sticker line for the set the gift came from, also when it is not the quest own set', async () => {
    // Every set full but the jewels, with one jewel left: the picnic pays from the jewels and fills them.
    let owned = copyOwned(START_OWNED);
    for (const s of Object.values(GIFT_SETS)) for (const i of s.items) owned = withItem(owned, i);
    const last = GIFT_SETS.jewels.items[GIFT_SETS.jewels.items.length - 1];
    owned = { ...copyOwned(owned), [last.field]: owned[last.field].filter((id) => id !== last.id) };
    expect(stillToEarn('jewels', owned)).toEqual([last]);
    const { g } = fakeGame({ owned });
    expect(await giveGift(g, 'picnic')).toEqual(last);
    expect(stickers(g)).toBe(1);
    expect(fillsSet('jewels', owned, g.save.data.owned)).toBe(true);
    expect(fillsSet('jewels', g.save.data.owned, g.save.data.owned)).toBe(false);
  });

  it('keep paying once the quest own set is full: the picnic then gives from the set with the most left', async () => {
    let owned = copyOwned(START_OWNED);
    for (const i of GIFT_SETS.crowns.items) owned = withItem(owned, i);
    const { g } = fakeGame({ owned });
    const item = await giveGift(g, 'picnic');
    // The hair set has 8 items left, the jewels 6 and the shoes 3.
    expect(GIFT_SETS.hair.items).toContainEqual(item);
    expect(stickers(g)).toBe(0);
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

/** Run a real quest of the table to its end; the run's sleeps and the walks' timers pass on fake timers. */
async function runReal(g: Game, id: QuestId): Promise<void> {
  vi.useFakeTimers();
  try {
    const done = runQuest(g, id);
    for (let k = 0; k < 40 && vi.mocked(g.world.releaseFrame).mock.calls.length === 0; k++) await vi.advanceTimersByTimeAsync(500);
    await done;
  } finally {
    vi.useRealTimers();
  }
}

describe('every quest', () => {
  it('picnic: two guest reads in its frame, then the gift picker in that frame, then the release', async () => {
    const { g, calls } = fakeGame();
    await runReal(g, 'picnic');
    expect(calls.order).toEqual(['wish framed', 'wish framed', 'lumi lumi4-picnic-done', 'gift framed', 'release']);
    expect(g.results.lines.map((r) => r.part)).toEqual(['picnic1', 'picnic2']);
    expect(GIFT_SETS.crowns.items).toContainEqual(g.quests.gifts[0]);
    expect(g.followers.list.map((u) => u.id)).toEqual(['baby-13', 'baby-14']);
  });

  it('rack: the sum in its frame, then the gift picker in that frame, then the release', async () => {
    const { g, calls } = fakeGame({ search: '?seed=3&quest=rack' });
    g.quests.maths = 'rack';
    await runReal(g, 'rack');
    expect(calls.order).toEqual(['sum framed', 'gift framed', 'release']);
    expect(g.results.lines.map((r) => r.part)).toEqual(['rack']);
    expect(GIFT_SETS.shoes.items).toContainEqual(g.quests.gifts[0]);
  });

  it('beads: the gift picker runs in the quest frame, before its release (the bead moment is the patterns lane)', async () => {
    const { g, calls } = fakeGame();
    await runQuest(g, 'beads', async (gg) => {
      await gg.world.frame({ x: 0, z: 0 }, 6);
      calls.order.push('quest');
      return () => gg.world.releaseFrame();
    });
    expect(calls.order).toEqual(['quest', 'gift framed', 'release']);
  });

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
    const release = await cornerQuest(g);
    expect(calls.order).toEqual(['lumi lumi4-corner', 'wish framed', 'wish framed', 'gift framed', 'wardrobe framed']);
    expect(g.results.lines.map((r) => r.part)).toEqual(['gate1', 'gate2']);
    expect(g.results.lines.map((r) => r.detail.kind)).toEqual(['phrase', 'phrase']);
    expect(g.quests.gate).toEqual({ kind: 'phrase', first: 2 });
    expect(t.said.flat()).not.toContain('g4-dress-up');
    const w = calls.wardrobe!;
    // The gift came from the hair set, and she wears it into the wardrobe.
    const gift = g.quests.gifts[0];
    expect(GIFT_SETS.hair.items).toContainEqual(gift);
    expect(w.look[gift.field]).toBe(gift.id);
    expect(owns(w.owned, gift)).toBe(true);
    // The music box plays 60 s whatever the play clock says (2.4.0: CORNER_BOX_MS, off the play clock); the board
    // shows today's gift.
    expect(w.limitMs).toBe(60_000);
    expect(w.board?.fresh).toEqual([gift]);
    expect(g.quests.dressing).toBe(false);
    expect(g.world.releaseFrame).not.toHaveBeenCalled();
    release();
    expect(g.world.releaseFrame).toHaveBeenCalledTimes(1);
    expect(g.followers.list.map((u) => u.id)).toEqual(['baby-13', 'baby-14']);
  });

  // On a fresh device without ?phrases= every ok pair plays, Claude's checks too (2.3 section 18).
  it('gates with two phrase reads on a fresh device without ?phrases=', async () => {
    const { g } = fakeGame({ search: '?seed=3' });
    g.quests.done.add('picnic');
    await cornerQuest(g);
    expect(g.results.lines.map((r) => `${r.part}:${String(r.detail.kind)}`)).toEqual(['gate1:phrase', 'gate2:phrase']);
    expect(g.quests.gate).toEqual({ kind: 'phrase', first: 2 });
    expect(t.said.flat()).not.toContain('g4-dress-up');
  });

  it('with ?phrases=emma, gates with two dress-up word wishes until Emma has checked enough', async () => {
    const { g } = fakeGame({ search: '?seed=3&phrases=emma' });
    g.quests.done.add('picnic');
    await cornerQuest(g);
    // The live data has no pair checked by Emma yet, so this is 'word' until her checks reach the file.
    const kind = phraseGateKind({ rule: 'emma' });
    const read = kind === 'word' ? 'dress' : 'phrase';
    expect(g.results.lines.map((r) => `${r.part}:${String(r.detail.kind)}`)).toEqual([`gate1:${read}`, `gate2:${read}`]);
    expect(g.quests.gate).toEqual({ kind, first: 2 });
  });

  // With fewer than 6 strong phrases (2.3 section 18): the gate plays two 2.2 dress-up word wishes and the Corner
  // still opens.
  for (const how of ['word', 'throw'] as const) {
    it(`gates with two dress-up word wishes when there is no phrase (${how === 'throw' ? 'no pair to pick' : 'the planner gives a dress-up wish'})`, async () => {
      t.phrases = how;
      const { g, calls } = fakeGame({ search: '?seed=3' });
      g.quests.done.add('picnic');
      await cornerQuest(g);
      expect(g.results.lines.map((r) => `${r.part}:${String(r.detail.kind)}`)).toEqual(['gate1:dress', 'gate2:dress']);
      expect(g.quests.gate).toEqual({ kind: 'word', first: 2 });
      // Each read's intro starts with "Your baby wants to dress up like you!", and the Corner says nothing of its own
      // before a read (17.4), so she hears it once per read, never twice.
      const intros = vi.mocked(g.layer.wish).mock.calls.map((c) => (c[0] as { clips: { intro: string[] } }).clips.intro);
      expect(intros).toHaveLength(2);
      for (const intro of intros) expect(intro.filter((id) => id === 'g4-dress-up')).toEqual(['g4-dress-up']);
      for (const intro of intros) expect(intro[0]).toBe('g4-dress-up');
      expect(t.said.flat()).not.toContain('g4-dress-up');
      expect(calls.order.slice(0, 4)).toEqual(['lumi lumi4-corner', 'wish framed', 'wish framed', 'gift framed']);
      expect(calls.wardrobe).not.toBeNull();
    });
  }

  it('plans the gate reads at the phrase level, and two misses move only the phrase level (14.4, 18)', async () => {
    const { g } = fakeGame({ search: '?seed=3&phrases=all' });
    g.save.write((s) => {
      s.reading = { level: 3, recent: [] };
      s.phrases = { level: 2, recent: [] };
    });
    vi.mocked(g.layer.wish).mockResolvedValue({ outcome: 'miss', misses: 1, ms: 900 });
    await cornerQuest(g);
    expect(g.results.lines.map((r) => `${String(r.detail.kind)}:${String(r.detail.level)}`)).toEqual(['phrase:2', 'phrase:2']);
    expect(g.save.data.reading).toEqual({ level: 3, recent: [] });
    expect(g.save.data.phrases.level).toBe(1);
  });

  it('says no "Let\'s get you ready" and no "tap play" in the Corner wardrobe: a pause is her dressing time', async () => {
    const { g, calls } = fakeGame({ search: '?seed=3&phrases=all' });
    await cornerQuest(g);
    expect(calls.wardrobe!.clips.idle).toEqual([]);
    expect(calls.wardrobe!.clips.ready).toEqual([]);
    expect(calls.wardrobe!.clips.nearly).toEqual(['g4-nearly']);
    expect(dressClips('mirror').idle).toEqual(['g4-ready-play']);
    expect(dressClips('mirror').ready).toEqual(['g4-ready']);
  });

  it('takes ?box= as the music box', async () => {
    const { g, calls } = fakeGame({ search: '?seed=4&box=5&phrases=all' });
    await cornerQuest(g);
    expect(calls.wardrobe!.limitMs).toBe(5000);
  });
});

describe('the start mirror', () => {
  it('plays its music box for 45 s, as decision 1 says, with no board; ?box= shortens it', async () => {
    expect(MIRROR_MS).toBe(45_000);
    const { g, calls } = fakeGame();
    await wardrobe(g);
    expect(calls.wardrobe!.limitMs).toBe(45_000);
    expect(calls.wardrobe!.board).toBeUndefined();
    expect(calls.wardrobe!.clips.idle).toEqual(['g4-ready-play']);
    const box = fakeGame({ search: '?seed=3&box=5' });
    await wardrobe(box.g);
    expect(box.calls.wardrobe!.limitMs).toBe(5000);
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
    expect([g.hub.asked, g.quests.asked]).toEqual([null, null]);
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
