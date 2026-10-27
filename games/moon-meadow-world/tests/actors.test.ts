// The actors: route following, follow slots, the slide queue and the pond helpers, and Princess Emma's looks
// (docs/v4/2.2.md 8.1): every option on her, seeded random looks, the default look against today's part list, the
// batch capacities with the herd, the dress shapes and the overflow warning.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrincessLook, UnicornLook } from '../src/contracts';
import { POND, SLIDE, dist2, inPond } from '../src/layout';
import { DEFAULT_LOOK, LOOK_ROWS } from '../src/wardrobe';
import { seeded } from '../src/content/rand';
import {
  FOLLOW_SLOTS, RouteWalker, SlideQueue, exitLanding, followTarget, headingOf, keepInPond, lineWalkable, nearestExit, queueSpot,
  turnTowards, wrap,
} from '../src/actors/motion';
import { B, CAPACITY, PartList, Parts, type BatchId } from '../src/actors/parts';
import { DRESS_ROWS, dressGeometry, type DressShape } from '../src/actors/shapes';
import { UnicornActor } from '../src/actors/unicorn';
import { fxStub, makePrincess, scenario, snapParts } from './princess-scenario';

// The actors play their own whoosh and splash; the audio module needs a browser.
vi.mock('../src/audio', () => ({ audio: { sfx: async () => {} } }));

describe('RouteWalker', () => {
  it('walks the points in order and stops at the end', () => {
    const at = { x: 0, z: 0 };
    const w = new RouteWalker([{ x: 3, z: 0 }, { x: 3, z: 4 }], at);
    expect(w.remaining(at)).toBeCloseTo(7);
    expect(w.step(at, 2)).toBeCloseTo(Math.PI / 2); // heading east
    expect(at).toEqual({ x: 2, z: 0 });
    // Turns the corner within one step.
    expect(w.step(at, 2)).toBeCloseTo(0); // heading south
    expect(at.x).toBeCloseTo(3);
    expect(at.z).toBeCloseTo(1);
    w.step(at, 10);
    expect(at).toEqual({ x: 3, z: 4 });
    expect(w.done).toBe(true);
    expect(w.step(at, 1)).toBeNull();
  });

  it('skips a first point where the walker already stands', () => {
    const w = new RouteWalker([{ x: 1, z: 1 }, { x: 2, z: 1 }], { x: 1, z: 1 });
    expect(w.points).toHaveLength(1);
    expect(w.next).toEqual({ x: 2, z: 1 });
  });

  it('is done at once for an empty route', () => {
    expect(new RouteWalker([], { x: 0, z: 0 }).done).toBe(true);
  });
});

describe('follow slots', () => {
  it('puts slot 0 straight behind her and slots 1 and 2 behind on either side', () => {
    const at = { x: 0, z: 0 };
    // Walking south (heading 0): behind is north (-z).
    const s0 = followTarget(at, 0, 0);
    expect(s0.x).toBeCloseTo(0);
    expect(s0.z).toBeCloseTo(-FOLLOW_SLOTS[0][0]);
    const s1 = followTarget(at, 0, 1);
    const s2 = followTarget(at, 0, 2);
    expect(s1.z).toBeLessThan(-1.2);
    expect(s2.z).toBeLessThan(-1.2);
    expect(Math.sign(s1.x)).toBe(-Math.sign(s2.x));
  });

  it('keeps every slot between 1.2 and 2.5 m from her, whichever way she walks', () => {
    for (let h = -Math.PI; h < Math.PI; h += 0.4) {
      for (let slot = 0; slot < 3; slot++) {
        const d = dist2({ x: 5, z: 5 }, followTarget({ x: 5, z: 5 }, h, slot));
        expect(d).toBeGreaterThanOrEqual(1.2);
        expect(d).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it('turns with her: walking east, the followers are to the west', () => {
    const s0 = followTarget({ x: 0, z: 0 }, Math.PI / 2, 0);
    expect(s0.x).toBeCloseTo(-FOLLOW_SLOTS[0][0]);
    expect(s0.z).toBeCloseTo(0);
  });

  it('clamps slot numbers', () => {
    expect(followTarget({ x: 0, z: 0 }, 0, 7)).toEqual(followTarget({ x: 0, z: 0 }, 0, 2));
    expect(followTarget({ x: 0, z: 0 }, 0, -1)).toEqual(followTarget({ x: 0, z: 0 }, 0, 0));
  });
});

describe('SlideQueue', () => {
  it('lets one rider at a time onto the ladder, in order', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.join('b');
    q.join('c');
    expect(q.mayGo('a')).toBe(true);
    expect(q.mayGo('b')).toBe(false);
    q.go('a');
    expect(q.rider).toBe('a');
    // b is first in line now but must wait until a starts sliding down.
    expect(q.place('b')).toBe(0);
    expect(q.mayGo('b')).toBe(false);
    q.free('a');
    expect(q.mayGo('b')).toBe(true);
    q.go('b');
    expect(q.waiting).toEqual(['c']);
  });

  it('puts Princess Emma at the front and ignores a second join', () => {
    const q = new SlideQueue<string>();
    q.join('u1');
    q.join('u2');
    q.join('emma', true);
    q.join('u1');
    expect(q.waiting).toEqual(['emma', 'u1', 'u2']);
  });

  it('frees the ladder when the rider leaves (another command)', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.join('b');
    q.go('a');
    q.leave('a');
    expect(q.rider).toBeNull();
    expect(q.mayGo('b')).toBe(true);
  });

  it('lets a dropped unicorn take the top straight away and holds the line until it slides', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.takeTop('dropped');
    expect(q.mayGo('a')).toBe(false);
    q.free('dropped');
    expect(q.mayGo('a')).toBe(true);
  });

  it('only the rider can free the ladder', () => {
    const q = new SlideQueue<string>();
    q.join('a');
    q.go('a');
    q.free('someone else');
    expect(q.rider).toBe('a');
  });
});

describe('queue spots', () => {
  it('uses SLIDE.queue first, then rows further west on walkable grass', () => {
    expect(queueSpot(0)).toEqual(SLIDE.queue[0]);
    expect(queueSpot(2)).toEqual(SLIDE.queue[2]);
    const spots = Array.from({ length: 9 }, (_, i) => queueSpot(i));
    for (const s of spots.slice(3)) expect(s.x).toBeLessThan(SLIDE.queue[0].x);
    for (const s of spots) expect(inPond(s)).toBe(false);
    // No two riders wait on the same spot.
    const keys = new Set(spots.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`));
    expect(keys.size).toBe(spots.length);
  });
});

describe('the pond', () => {
  it('finds the nearest exit and a landing point just inside the shore', () => {
    for (const e of POND.exits) {
      expect(nearestExit({ x: e.x * 0.98 + POND.center.x * 0.02, z: e.z * 0.98 + POND.center.z * 0.02 })).toEqual(e);
      const l = exitLanding(e);
      expect(inPond(l)).toBe(true);
      expect(dist2(l, e)).toBeLessThan(1.2);
    }
  });

  it('keeps swimmers on the water', () => {
    const p = keepInPond({ x: POND.center.x + POND.rx + 3, z: POND.center.z });
    expect(inPond(p, -0.3)).toBe(true);
    const inside = { x: POND.center.x, z: POND.center.z };
    expect(keepInPond(inside)).toEqual(inside);
  });
});

describe('helpers', () => {
  it('measures headings with 0 facing south and PI/2 facing east', () => {
    expect(headingOf(0, 1)).toBeCloseTo(0);
    expect(headingOf(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(headingOf(0, -1))).toBeCloseTo(Math.PI);
  });

  it('turns the short way round', () => {
    expect(turnTowards(3, -3, 0.1)).toBeCloseTo(wrap(3.1));
    expect(turnTowards(0, 0.05, 0.1)).toBeCloseTo(0.05);
  });

  it('checks a straight line for walkability', () => {
    const notPond = (p: { x: number; z: number }) => !inPond(p);
    expect(lineWalkable({ x: 0, z: 4 }, { x: 20, z: 4 }, notPond)).toBe(false);
    expect(lineWalkable({ x: 0, z: 12 }, { x: 20, z: 12 }, notPond)).toBe(true);
  });
});

// --- Princess Emma's looks ---------------------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
});

/** Every option of every row on top of the default look, then 20 seeded random looks. */
function looksToTry(): PrincessLook[] {
  const out: PrincessLook[] = [];
  for (const r of LOOK_ROWS) for (const o of r.options) out.push({ ...DEFAULT_LOOK, [r.row]: o.id });
  const rand = seeded(2026);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
  const ids = Object.fromEntries(LOOK_ROWS.map((r) => [r.row, r.options.map((o) => o.id)])) as Record<string, string[]>;
  for (let i = 0; i < 20; i++) {
    out.push({
      hair: pick(ids.hair), eyes: pick(ids.eyes), gown: pick(ids.gown), style: pick(ids.style), thing: pick(ids.thing),
      ribbon: pick(['pink', 'lilac', 'sky', 'mint', 'gold', 'coral'] as const),
    } as PrincessLook);
  }
  return out;
}

/** The busiest look (2.6): plaits, fairy wings, star clips, and the rose on top. */
const BUSIEST: PrincessLook = { hair: 'rainbow', eyes: 'violet', gown: 'fairy', style: 'plaits', thing: 'stars', ribbon: 'gold' };

function finite(p: ReturnType<typeof makePrincess>): boolean {
  const L = p.parts;
  for (let i = 0; i < L.n * 16; i++) if (!Number.isFinite(L.mat[i])) return false;
  for (const c of p.hair.chains) for (const q of c.p) if (!Number.isFinite(q.x + q.y + q.z)) return false;
  return Number.isFinite(p.position.x + p.position.y + p.position.z);
}

describe('Princess Emma in every look', () => {
  it('stays inside her part list, never goes NaN, keeps her hair out of her head and gown, and stays under 8,000 triangles', async () => {
    const looks = looksToTry();
    expect(looks.length).toBe(6 + 6 + 6 + 4 + 6 + 20);
    for (const look of looks) {
      const p = makePrincess();
      p.setLook(look);
      p.extra(look === looks[looks.length - 1] ? 'rose' : null);
      p.crown(true);
      const dt = 1 / 60;
      let t = 0;
      let worstParts = 0;
      let worstTris = 0;
      let worstHair = 0;
      const step = (s: number) => {
        for (let k = 0; k < Math.round(s / dt); k++) {
          t += dt;
          p.update(dt, t);
          worstParts = Math.max(worstParts, p.parts.n);
          worstTris = Math.max(worstTris, p.triangles());
          // Once the chains have settled (and not in the first frames of a cut).
          if (t > 1) worstHair = Math.max(worstHair, p.hairPenetration());
        }
      };
      step(1.5);
      void p.walkTo([{ x: 0, z: 3 }]);
      step(3);
      void p.walkTo([{ x: -9, z: 8 }], { run: true });
      step(3);
      void p.rideSlide();
      for (let k = 0; k < 2400 && p.mode !== 'slide'; k++) step(dt);
      expect(p.mode, `${JSON.stringify(look)} reaches the slide`).toBe('slide');
      step(3);
      for (let k = 0; k < 2400 && p.mode !== 'swim'; k++) step(dt);
      expect(p.mode).toBe('swim');
      step(3);
      const what = JSON.stringify(look);
      expect(finite(p), what).toBe(true);
      expect(worstParts, what).toBeLessThan(192);
      expect(worstTris, what).toBeLessThanOrEqual(8000);
      // The chain is solved a few times a step: a point may sit a hair's breadth inside.
      expect(worstHair, what).toBeLessThan(0.02);
    }
  });

  it('draws the busiest look with the rose inside her part list and the triangle limit', () => {
    const p = makePrincess();
    p.setLook(BUSIEST);
    p.extra('rose');
    p.crown(true);
    for (let k = 0; k < 120; k++) p.update(1 / 60, k / 60);
    expect(p.parts.n).toBeLessThan(192);
    expect(p.triangles()).toBeLessThanOrEqual(8000);
  });

  it("draws the default look as before the wardrobe: today's part list plus the hair at her nape", async () => {
    const want = JSON.parse(readFileSync(new URL('./fixtures/princess-default.json', import.meta.url), 'utf8')) as Record<string, number[][]>;
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const p = makePrincess();
    p.setLook({ ...DEFAULT_LOOK });
    const got: Record<string, number[][]> = {};
    await scenario(p, (label) => (got[label] = snapParts(p)));
    expect(Object.keys(got)).toEqual(Object.keys(want));
    // The one new part: the hair at her nape (Mid, in her hair colour) right after the cap, the second Fine part. Today
    // the back of her head showed skin below the cap when she turned round.
    for (const label of Object.keys(got)) {
      const capAt = got[label].findIndex((r, i) => r[0] === B.Fine && got[label][i - 1]?.[0] === B.Fine);
      const nape = got[label].splice(capAt + 1, 1)[0];
      expect(nape[0], label).toBe(B.Mid);
      expect(nape.slice(17, 20), label).toEqual(got[label][capAt].slice(17, 20));
    }
    for (const label of Object.keys(want)) {
      expect(got[label].map((r) => r[0]), label).toEqual(want[label].map((r) => r[0]));
      got[label].forEach((row, i) => row.forEach((v, j) => expect(Math.abs(v - want[label][i][j]), `${label} part ${i} value ${j}`).toBeLessThan(1e-4)));
    }
  });

  it('keeps a colour attribute of item size 3 on every dress shape (no new program when she changes gown)', () => {
    for (const shape of ['party', 'ball', 'tutu'] as DressShape[]) {
      const g = dressGeometry(shape);
      expect(g.getAttribute('color').itemSize, shape).toBe(3);
      expect(DRESS_ROWS[shape].length, shape).toBe(22);
      expect(Object.keys(g.attributes).sort(), shape).toEqual(['color', 'normal', 'position']);
    }
  });

  it('changes look without new materials, and with one cached geometry per dress shape', () => {
    const p = makePrincess();
    const dress = (p as unknown as { dress: THREE.Mesh }).dress;
    const mats = [dress.material, p.hair.tubes.mesh.material];
    const tubes = p.hair.tubes.mesh.geometry;
    const geos = new Set<THREE.BufferGeometry>();
    for (let round = 0; round < 2; round++) {
      for (const r of LOOK_ROWS) {
        for (const o of r.options) {
          p.setLook({ [r.row]: o.id });
          p.update(1 / 60, 0);
          geos.add(dress.geometry);
        }
      }
    }
    expect([dress.material, p.hair.tubes.mesh.material]).toEqual(mats);
    expect(p.hair.tubes.mesh.geometry).toBe(tubes);
    expect(geos.size).toBe(3);
  });

  it('draws her Mid parts as Fine and her Lo parts as Mid in the portrait, within the Fine batch', () => {
    const p = makePrincess();
    p.setLook(BUSIEST);
    p.extra('rose');
    p.update(1 / 60, 0);
    const count = (id: BatchId) => Array.from(p.parts.id.subarray(0, p.parts.n)).filter((x) => x === id).length;
    const lo = count(B.Lo);
    const mid = count(B.Mid);
    const fine = count(B.Fine);
    p.portrait(true);
    p.update(1 / 60, 0.02);
    expect(count(B.Lo)).toBe(0);
    expect(count(B.Fine)).toBe(Math.min(CAPACITY[B.Fine], fine + mid));
    expect(count(B.Mid)).toBe(lo + mid - (count(B.Fine) - fine));
    p.portrait(false);
    p.update(1 / 60, 0.04);
    expect(count(B.Lo)).toBe(lo);
  });
});

describe('the batches', () => {
  const BREEDS: UnicornLook[] = [
    { stage: 'baby', breed: 'moon', body: '#f7f8ff', mane: '#7d9cf0', mane2: '#b9c8f8' },
    { stage: 'baby', breed: 'nestling', body: '#fff0d4', mane: '#ff6fae', mane2: '#ffb0d2', shiny: true },
    { stage: 'foal', breed: 'snow', body: '#e4f3ff', mane: '#4fc3f0', mane2: '#bdeaff' },
    { stage: 'foal', breed: 'berry', body: '#e3d2ff', mane: '#d02a96', mane2: '#ff7cc4' },
  ];

  it('hold the busiest look (portrait or not) plus 20 unicorns as the herd draws them (5 in full detail)', () => {
    const p = makePrincess();
    p.setLook(BUSIEST);
    p.extra('rose');
    p.crown(true);
    const ctx = {
      deps: { route: (_a: unknown, b: { x: number; z: number }) => [b], isWalkable: () => true, nearestWalkable: (q: { x: number; z: number }) => q },
      fx: fxStub, queue: new SlideQueue<object>(), leader: p, scene: new THREE.Scene(), sounds: () => false,
      swimmers: () => [], toyTexture: () => new THREE.Texture(),
    };
    const herd = Array.from({ length: 20 }, (_, i) => {
      const u = new UnicornActor({ id: 'u' + i, name: 'U', look: BREEDS[i % 4], at: { x: i, z: 0 } }, ctx);
      u.nightcap(i % 2 === 0);
      return u;
    });
    for (const portrait of [false, true]) {
      p.portrait(portrait);
      const most = new Map<number, number>();
      for (let k = 0; k < 90; k++) {
        p.update(1 / 30, k / 30);
        const used = new Map<number, number>();
        const count = (L: PartList) => {
          for (let i = 0; i < L.n; i++) used.set(L.id[i], (used.get(L.id[i]) ?? 0) + 1);
        };
        count(p.parts);
        herd.forEach((u, i) => {
          u.update(1 / 30, k / 30);
          u.draw(i < 5);
          count(u.parts);
        });
        for (const [id, n] of used) most.set(id, Math.max(most.get(id) ?? 0, n));
      }
      // The egg (a list of 16) and the effects' beam glows (at most 8) come on top in the soft and flat batches.
      for (const [id, n] of most) {
        const room = id === B.Soft ? 24 : id === B.Arc ? 16 : 0;
        expect(n + room, `batch ${id}, portrait ${portrait}`).toBeLessThanOrEqual(CAPACITY[id as BatchId]);
      }
    }
  });

  it('warn once when a batch or a part list drops parts', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const L = new PartList(2);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < 5; i++) L.push(B.Lo, m, c);
    expect(L.n).toBe(2);
    expect(warn).toHaveBeenCalledTimes(1);
    const parts = new Parts();
    const big = new PartList(CAPACITY[B.Horn] + 3);
    for (let i = 0; i < CAPACITY[B.Horn] + 3; i++) big.push(B.Horn, m, c);
    parts.flush([big]);
    parts.flush([big]);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('Princess Emma in the wardrobe', () => {
  const run = (p: ReturnType<typeof makePrincess>, s: number, each?: () => void) => {
    for (let k = 0; k < Math.round(s * 60); k++) {
      p.update(1 / 60, k / 60);
      each?.();
    }
  };

  it('plays every reaction to its end', async () => {
    const p = makePrincess();
    for (const kind of ['toss', 'blink', 'show', 'tilt', 'curtsy', 'wave', 'clap', 'jump', 'twirl'] as const) {
      let done = false;
      void p.emote(kind).then(() => (done = true));
      run(p, 2.1);
      await Promise.resolve();
      expect(done, kind).toBe(true);
    }
  });

  it('never closes her eyes into the happy arcs in the blink reaction (the slow blink is the closed lid)', () => {
    const p = makePrincess();
    void p.emote('blink');
    let closedSeen = false;
    run(p, 1.6, () => {
      const L = p.parts;
      for (let i = 0; i < L.n; i++) {
        if (L.id[i] !== B.Arc) continue;
        const e = L.mat.subarray(i * 16, i * 16 + 16);
        // An eye's arc is 0.05 wide: the happy one points up, the closed lid down.
        if (Math.abs(Math.hypot(e[0], e[1], e[2]) - 0.05) > 0.002) continue;
        expect(e[5]).toBeLessThan(0);
        closedSeen = true;
      }
    });
    expect(closedSeen).toBe(true);
  });

  it('holds her head still for the portrait', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const drift = (hold: boolean) => {
      const p = makePrincess();
      p.hold(hold);
      let most = 0;
      // Her eyes against her head's centre: the look-around turns her head, the gentle idle sway does not move this.
      run(p, 8, () => (most = Math.max(most, Math.abs(p.point('eyes').x - p.point('head').x))));
      return most;
    };
    expect(drift(false)).toBeGreaterThan(0.05);
    expect(drift(true)).toBeLessThan(0.005);
  });

  it('stays turned while dragged and eases back in about 1.5 s', () => {
    const p = makePrincess();
    run(p, 0.5);
    p.turnBy(1.2);
    run(p, 0.5);
    expect(p.heading).toBeCloseTo(1.2, 2);
    p.face({ x: p.position.x, z: p.position.z + 5 });
    run(p, 0.3);
    expect(p.heading).toBeGreaterThan(0.4);
    run(p, 1.2);
    expect(Math.abs(p.heading)).toBeLessThan(0.03);
  });

  it('gives world points for her head, eyes, hair thing (on her left) and dress', () => {
    const p = makePrincess({ x: 0, z: 0 });
    run(p, 0.5);
    const head = p.point('head');
    const eyes = p.point('eyes');
    const thing = p.point('thing');
    const dress = p.point('dress');
    expect(head.y).toBeGreaterThan(1.0);
    // Facing south: her eyes are in front of her head, her left is +x.
    expect(eyes.z).toBeGreaterThan(head.z + 0.15);
    expect(thing.x).toBeGreaterThan(head.x + 0.12);
    expect(thing.y).toBeGreaterThan(eyes.y);
    expect(dress.y).toBeGreaterThan(0.3);
    expect(dress.y).toBeLessThan(0.6);
  });

  it('wears the rose for the day without changing her look', () => {
    const p = makePrincess();
    p.setLook({ thing: 'hearts' });
    run(p, 0.2);
    const n = p.parts.n;
    p.extra('rose');
    run(p, 0.2);
    expect(p.parts.n).toBe(n + 6);
    expect(p.look.thing).toBe('hearts');
    p.extra(null);
    run(p, 0.2);
    expect(p.parts.n).toBe(n);
  });

  it('draws one or no hair tubes for the styles that need fewer (setDrawRange, no new geometry)', () => {
    const p = makePrincess();
    const g = p.hair.tubes.mesh.geometry;
    const tris = (style: PrincessLook['style']) => {
      p.setLook({ style });
      run(p, 0.1);
      return p.hair.tubes.triangles;
    };
    const two = tris('ponytails');
    expect(two).toBe(2 * 23 * 12 * 2);
    expect(tris('high')).toBe(two / 2);
    expect(tris('plaits')).toBe(0);
    expect(tris('bun')).toBe(two);
    expect(p.hair.tubes.mesh.geometry).toBe(g);
  });
});

describe('a unicorn wearing a picture', () => {
  it('puts it on top of its head and keeps it there while it walks', () => {
    const scene = new THREE.Scene();
    const p = makePrincess();
    const ctx = {
      deps: { route: (_a: unknown, b: { x: number; z: number }) => [b], isWalkable: () => true, nearestWalkable: (q: { x: number; z: number }) => q },
      fx: fxStub, queue: new SlideQueue<object>(), leader: p, scene, sounds: () => false,
      swimmers: () => [], toyTexture: () => new THREE.Texture(),
    };
    const u = new UnicornActor({ id: 'u', name: 'U', look: { stage: 'baby', breed: 'moon', body: '#fff', mane: '#f9c', mane2: '#fcf' }, at: { x: 0, z: 0 } }, ctx);
    u.showToy('crown.webp', { on: 'head' });
    const toy = scene.getObjectByName('actors-toy')!;
    void u.goTo([{ x: 3, z: 0 }]);
    for (let k = 0; k < 60; k++) {
      u.update(1 / 60, k / 60);
      const top = u.headTop(new THREE.Vector3());
      expect(Math.hypot(toy.position.x - top.x, toy.position.z - top.z)).toBeLessThan(0.15);
      expect(toy.position.y).toBeGreaterThan(top.y - 0.15);
      expect(toy.position.y).toBeLessThan(top.y + 0.25);
    }
    u.showToy(null);
    expect(scene.getObjectByName('actors-toy')).toBeUndefined();
  });
});
