// The actors: route following, follow slots, the slide queue and the pond helpers, Princess Emma's looks (docs/v4/2.3.md
// section 22.4): every option of every field and seeded random looks, every style on every gown, the busiest look
// against the triangle cap and the batches with 20 unicorns, the default look against 2.2's part list, the cached
// dress and crown shapes, the crown's outline on every hair, the toe tips and jewels, the egg's hearts and the actors'
// sound effects.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LookField, PrincessLook, UnicornLook } from '../src/contracts';
import { POND, RIDE, SLIDE, dist2, inPond } from '../src/layout';
import { COLOURS, DEFAULT_LOOK, GOWN_DRESS, HAIR_COLOURS, OPTIONS, PALETTE, crownOutline } from '../src/wardrobe';
import { seeded } from '../src/content/rand';
import {
  FOLLOW_SLOTS, RouteWalker, SlideQueue, exitLanding, followTarget, headingOf, keepInPond, lineWalkable, nearestExit, queueSpot,
  turnTowards, wrap,
} from '../src/actors/motion';
import { B, CAPACITY, PartList, Parts, Xf, type BatchId } from '../src/actors/parts';
import { DRESS_ROWS, dressGeometry, limb, type DressShape } from '../src/actors/shapes';
import { SLEEVE_MIX, accentOf, drawEarring, drawThing, mixHex, shoeExtras, skirtAt, skirtTable } from '../src/actors/looks3d';
import { UnicornActor } from '../src/actors/unicorn';
import { createEgg } from '../src/actors/egg';
import { createHerd } from '../src/actors/herd';
import { createHerdSounds } from '../src/actors/sounds';
import { MOUNT_LOOKS } from '../src/actors/mount';
import { BUILDS, bodyEllipsoids } from '../src/actors/unicornBody';
import { fxStub, makePrincess, scenario, snapParts } from './princess-scenario';

// The actors play their own whoosh, splashes and nickers; the audio module needs a browser. The fake records each
// effect and each synthesised sound, and says whether a checked moment is open and whether anyone speaks.
const sound = vi.hoisted(() => ({ fx: [] as { id: string; fallback?: string }[], sfx: [] as string[], checked: false, speaking: false }));
vi.mock('../src/audio', () => ({
  audio: {
    sfx: async (name: string) => {
      sound.sfx.push(name);
    },
    fx: async (id: string, o: { fallback?: string } = {}) => {
      sound.fx.push({ id, fallback: o.fallback });
    },
    soundState: () => ({ ambience: null, checked: sound.checked }),
    get speaking() {
      return sound.speaking;
    },
  },
}));

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

// --- Princess Emma's looks (docs/v4/2.3.md section 15) -----------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
});

type P = ReturnType<typeof makePrincess>;
const FIELDS = Object.keys(OPTIONS) as LookField[];
/** Her triangle cap (2.3 section 4: the 2.2 cap of 8,000 goes to 10,000) and her part list. */
const MAX_TRIANGLES = 10000;
const MAX_PARTS = 192;

/** Every option of every field on top of the default look, then 20 seeded random looks. */
function looksToTry(): PrincessLook[] {
  const out: PrincessLook[] = [];
  for (const f of FIELDS) for (const id of OPTIONS[f] as readonly string[]) out.push({ ...DEFAULT_LOOK, [f]: id });
  const rand = seeded(2026);
  for (let i = 0; i < 20; i++) {
    const look = { ...DEFAULT_LOOK } as Record<LookField, string>;
    for (const f of FIELDS) {
      const ids = OPTIONS[f] as readonly string[];
      look[f] = ids[Math.floor(rand() * ids.length)];
    }
    out.push(look as unknown as PrincessLook);
  }
  return out;
}

const count = (L: PartList, id: BatchId) => Array.from(L.id.subarray(0, L.n)).filter((x) => x === id).length;

type Measure = { parts: number; triangles: number; batch: (id: BatchId) => number };
const measured = new Map<string, Measure>();
/** Draw a look for a moment (crown on, after the crown has popped in) and measure it (once per look). */
function measure(look: PrincessLook, o: { rose?: boolean; portrait?: boolean } = {}): Measure {
  const key = JSON.stringify([look, !!o.rose, !!o.portrait]);
  const known = measured.get(key);
  if (known) return known;
  const p = makePrincess();
  p.setLook(look);
  p.crown(true);
  p.extra(o.rose ? 'rose' : null);
  p.portrait(!!o.portrait);
  const most = new Map<BatchId, number>();
  let parts = 0;
  let triangles = 0;
  for (let k = 0; k < 40; k++) {
    p.update(1 / 30, k / 30);
    parts = Math.max(parts, p.parts.n);
    triangles = Math.max(triangles, p.triangles());
    for (const id of Object.values(B) as BatchId[]) most.set(id, Math.max(most.get(id) ?? 0, count(p.parts, id)));
  }
  const m: Measure = { parts, triangles, batch: (id) => most.get(id) ?? 0 };
  measured.set(key, m);
  return m;
}

/**
 * The busiest look by one measure: each field takes the option that adds the most to it on top of the default look
 * (the parts of different fields add up), so the busiest look follows the catalogue as it grows.
 */
function busiest(by: (m: ReturnType<typeof measure>) => number, portrait = false): PrincessLook {
  const look = { ...DEFAULT_LOOK } as Record<LookField, string>;
  for (const f of FIELDS) {
    let best = -1;
    for (const id of OPTIONS[f] as readonly string[]) {
      const v = by(measure({ ...DEFAULT_LOOK, [f]: id }, { rose: true, portrait }));
      if (v > best) {
        best = v;
        look[f] = id;
      }
    }
  }
  return look as unknown as PrincessLook;
}

function finite(p: P): boolean {
  const L = p.parts;
  for (let i = 0; i < L.n * 16; i++) if (!Number.isFinite(L.mat[i])) return false;
  for (const c of p.hair.chains) for (const q of c.p) if (!Number.isFinite(q.x + q.y + q.z)) return false;
  return Number.isFinite(p.position.x + p.position.y + p.position.z);
}

/**
 * Walk, run, ride the slide and swim in a look, as a play does, and report the worst part count, triangle count, Horn
 * parts and hair point inside her head or gown on the way.
 */
function play(look: PrincessLook, rose = false): { parts: number; triangles: number; horn: number; hair: number; p: P } {
  const p = makePrincess();
  p.setLook(look);
  p.extra(rose ? 'rose' : null);
  p.crown(true);
  const dt = 1 / 60;
  let t = 0;
  const worst = { parts: 0, triangles: 0, horn: 0, hair: 0 };
  const step = (s: number) => {
    for (let k = 0; k < Math.round(s / dt); k++) {
      t += dt;
      p.update(dt, t);
      worst.parts = Math.max(worst.parts, p.parts.n);
      worst.triangles = Math.max(worst.triangles, p.triangles());
      worst.horn = Math.max(worst.horn, count(p.parts, B.Horn));
      // Once the chains have settled (and not in the first frames of a cut).
      if (t > 1) worst.hair = Math.max(worst.hair, p.hairPenetration());
    }
  };
  step(1.2);
  void p.walkTo([{ x: 0, z: 3 }]);
  step(2);
  void p.emote('twirl');
  step(1.5);
  void p.walkTo([{ x: -9, z: 8 }], { run: true });
  step(2);
  void p.rideSlide();
  for (let k = 0; k < 2400 && p.mode !== 'slide'; k++) step(dt);
  expect(p.mode, `${JSON.stringify(look)} reaches the slide`).toBe('slide');
  step(2);
  for (let k = 0; k < 2400 && p.mode !== 'swim'; k++) step(dt);
  expect(p.mode).toBe('swim');
  step(2);
  return { ...worst, p };
}

describe('Princess Emma in every look', () => {
  it('stays inside her part list, never goes NaN, keeps her hair out of her head and gown, and stays under 10,000 triangles', { timeout: 120000 }, () => {
    const looks = looksToTry();
    expect(looks.length).toBe(FIELDS.reduce((n, f) => n + OPTIONS[f].length, 0) + 20);
    for (const look of looks) {
      const w = play(look, look === looks[looks.length - 1]);
      const what = JSON.stringify(look);
      expect(finite(w.p), what).toBe(true);
      expect(w.parts, what).toBeLessThan(MAX_PARTS);
      expect(w.triangles, what).toBeLessThanOrEqual(MAX_TRIANGLES);
      // The chain is solved a few times a step: a point may sit a hair's breadth inside.
      expect(w.hair, what).toBeLessThan(0.02);
      // No new part in the Horn batch: only 2.2's unicorn clip has a horn.
      expect(w.horn, what).toBe(look.thing === 'unicorn' ? 1 : 0);
    }
  });

  it('keeps every hair style outside her head and every gown, with each extra', { timeout: 60000 }, () => {
    for (const style of OPTIONS.style) {
      for (const gown of OPTIONS.gown) {
        const extra = OPTIONS.extra[(OPTIONS.style.indexOf(style) + OPTIONS.gown.indexOf(gown)) % OPTIONS.extra.length];
        const look = { ...DEFAULT_LOOK, style, gown, extra };
        const w = play(look);
        expect(finite(w.p), JSON.stringify(look)).toBe(true);
        expect(w.hair, JSON.stringify(look)).toBeLessThan(0.02);
      }
    }
  });

  it('draws the busiest look with the rose and the crown inside her part list and the triangle cap, also in the portrait', { timeout: 30000 }, () => {
    const look = busiest((m) => m.triangles);
    const parts = busiest((m) => m.parts);
    for (const l of [look, parts]) {
      for (const portrait of [false, true]) {
        const m = measure(l, { rose: true, portrait });
        expect(m.parts, JSON.stringify(l)).toBeLessThan(MAX_PARTS);
        if (!portrait) expect(m.triangles, JSON.stringify(l)).toBeLessThanOrEqual(MAX_TRIANGLES);
      }
    }
  });

  it("draws the default look as 2.2's Princess Emma: the same parts in the same places, in the palette's colours", async () => {
    // The fixture is 2.2's default look. 2.3 takes four of its colours from the palette (2.3 section 15): the
    // slippers in pink's small shade, the sleeves between pink's base and light, and the crown's gem and tips in the
    // outline crownOutline gives sunny hair under a gold crown. Everything else is as it was.
    const want = JSON.parse(readFileSync(new URL('./fixtures/princess-default.json', import.meta.url), 'utf8')) as Record<string, number[][]>;
    const lin = (hex: string) => new THREE.Color(hex).toArray().map((v) => +v.toFixed(5));
    const changed = new Map<string, number[]>([
      [lin('#ff6fa8').join(), lin(PALETTE.pink.small)],
      [lin('#ffc6e1').join(), lin(mixHex(PALETTE.pink.base, PALETTE.pink.light, SLEEVE_MIX))],
      [lin('#ff4f9a').join(), lin(crownOutline('sunny', 'gold'))],
      [lin('#ffb62e').join(), lin(crownOutline('sunny', 'gold'))],
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const p = makePrincess();
    p.setLook({ ...DEFAULT_LOOK });
    const got: Record<string, number[][]> = {};
    await scenario(p, (label) => (got[label] = snapParts(p)));
    expect(Object.keys(got)).toEqual(Object.keys(want));
    // The one part 2.2 added: the hair at her nape (Mid, in her hair colour) right after the cap, the second Fine part.
    for (const label of Object.keys(got)) {
      const capAt = got[label].findIndex((r, i) => r[0] === B.Fine && got[label][i - 1]?.[0] === B.Fine);
      const nape = got[label].splice(capAt + 1, 1)[0];
      expect(nape[0], label).toBe(B.Mid);
      expect(nape.slice(17, 20), label).toEqual(got[label][capAt].slice(17, 20));
    }
    let recoloured = 0;
    for (const label of Object.keys(want)) {
      expect(got[label].map((r) => r[0]), label).toEqual(want[label].map((r) => r[0]));
      got[label].forEach((row, i) => {
        const old = want[label][i];
        // The batch, the matrix and the sheen are 2.2's.
        for (const j of [...Array(17).keys(), 20]) expect(Math.abs(row[j] - old[j]), `${label} part ${i} value ${j}`).toBeLessThan(1e-4);
        const colour = changed.get(old.slice(17, 20).map((v) => +v.toFixed(5)).join()) ?? old.slice(17, 20);
        if (colour !== old.slice(17, 20)) recoloured++;
        for (let j = 0; j < 3; j++) expect(Math.abs(row[17 + j] - colour[j]), `${label} part ${i} colour ${j}`).toBeLessThan(1e-4);
      });
    }
    expect(recoloured).toBeGreaterThan(0);
  });

  it('keeps a colour attribute of item size 3 on every dress shape (no new program when she changes gown)', () => {
    for (const shape of ['party', 'ball', 'tutu'] as DressShape[]) {
      const g = dressGeometry(shape);
      expect(g.getAttribute('color').itemSize, shape).toBe(3);
      expect(DRESS_ROWS[shape].length, shape).toBe(22);
      expect(Object.keys(g.attributes).sort(), shape).toEqual(['color', 'normal', 'position']);
    }
  });

  it('changes look without new materials, and with one cached geometry per dress shape and per crown', () => {
    const p = makePrincess();
    const own = p as unknown as { dress: THREE.Mesh; crownMesh: THREE.Mesh };
    p.crown(true);
    const mats = [own.dress.material, own.crownMesh.material, p.hair.tubes.mesh.material];
    const tubes = p.hair.tubes.mesh.geometry;
    const dresses = new Map<string, Set<THREE.BufferGeometry>>();
    const crowns = new Map<string, Set<THREE.BufferGeometry>>();
    for (let round = 0; round < 2; round++) {
      for (const f of FIELDS) {
        for (const id of OPTIONS[f] as readonly string[]) {
          p.setLook({ ...DEFAULT_LOOK, [f]: id });
          p.update(1 / 60, 0);
          const shape = GOWN_DRESS[p.look.gown];
          dresses.set(shape, (dresses.get(shape) ?? new Set()).add(own.dress.geometry));
          crowns.set(p.look.crown, (crowns.get(p.look.crown) ?? new Set()).add(own.crownMesh.geometry));
        }
      }
    }
    expect([own.dress.material, own.crownMesh.material, p.hair.tubes.mesh.material]).toEqual(mats);
    expect(p.hair.tubes.mesh.geometry).toBe(tubes);
    // Four gown cells on three dress shapes (gala is the ball gown with gloves), five crowns: one geometry each.
    expect([...dresses.keys()].sort()).toEqual(['ball', 'party', 'tutu']);
    for (const [shape, set] of dresses) expect(set.size, shape).toBe(1);
    expect([...crowns.keys()].sort()).toEqual([...OPTIONS.crown].sort());
    for (const [shape, set] of crowns) expect(set.size, shape).toBe(1);
    expect(new Set([...crowns.values()].flatMap((s) => [...s])).size).toBe(OPTIONS.crown.length);
    // Every crown has the attributes of the first, so swapping one never compiles a program.
    for (const set of crowns.values()) {
      const g = [...set][0];
      expect(Object.keys(g.attributes).sort()).toEqual(['color', 'normal', 'position']);
      expect(g.getAttribute('color').itemSize).toBe(3);
    }
  });

  it('draws her Mid parts as Fine and her Lo parts as Mid in the portrait, within the Fine batch', () => {
    const p = makePrincess();
    p.setLook(busiest((m) => m.parts));
    p.extra('rose');
    p.update(1 / 60, 0);
    const lo = count(p.parts, B.Lo);
    const mid = count(p.parts, B.Mid);
    const fine = count(p.parts, B.Fine);
    p.portrait(true);
    p.update(1 / 60, 0.02);
    expect(count(p.parts, B.Lo)).toBe(0);
    expect(count(p.parts, B.Fine)).toBe(Math.min(CAPACITY[B.Fine], fine + mid));
    expect(count(p.parts, B.Mid)).toBe(lo + mid - (count(p.parts, B.Fine) - fine));
    p.portrait(false);
    p.update(1 / 60, 0.04);
    expect(count(p.parts, B.Lo)).toBe(lo);
  });
});

describe('the crown on her hair', () => {
  /** The parts the crown adds: a princess with the crown on against one without, the same frames, same time. */
  function crownParts(look: PrincessLook): { parts: number[][]; mesh: THREE.Mesh } {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const lists = [true, false].map((on) => {
      const p = makePrincess();
      p.setLook(look);
      p.crown(on);
      for (let k = 0; k < 3; k++) p.update(1 / 60, k / 60);
      return { rows: snapParts(p), mesh: (p as unknown as { crownMesh: THREE.Mesh }).crownMesh };
    });
    const [on, off] = lists.map((l) => l.rows);
    let k = 0;
    while (k < off.length && on[k].every((v, j) => v === off[k][j])) k++;
    const n = on.length - off.length;
    // Everything after the crown's parts is as without the crown.
    for (let i = k; i < off.length; i++) expect(on[i + n]).toEqual(off[i]);
    return { parts: on.slice(k, k + n), mesh: lists[0].mesh };
  }
  const lin = (hex: string) => new THREE.Color(hex).toArray();
  const close = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-5);

  it("draws every crown's gems and tips in crownOutline's colour, on every hair under every crown colour", { timeout: 30000 }, () => {
    for (const hair of HAIR_COLOURS) {
      for (const crownColour of COLOURS) {
        const crown = OPTIONS.crown[(HAIR_COLOURS.indexOf(hair) + COLOURS.indexOf(crownColour)) % OPTIONS.crown.length];
        const { parts, mesh } = crownParts({ ...DEFAULT_LOOK, hair, crownColour, crown });
        const outline = lin(crownOutline(hair, crownColour));
        const what = `${crown} ${crownColour} on ${hair}`;
        expect(parts.length, what).toBeGreaterThanOrEqual(5);
        for (const row of parts) {
          expect(row[0], what).toBe(B.Lo);
          expect(close(row.slice(17, 20), outline), what).toBe(true);
        }
        // The band takes the crown colour's small shade (a rainbow: all its bands), its rim line the outline.
        const c = mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
        const colours = new Set(Array.from({ length: c.count }, (_, i) => [c.getX(i), c.getY(i), c.getZ(i)].map((v) => v.toFixed(5)).join()));
        const band = PALETTE[crownColour].bands ?? [PALETTE[crownColour].small];
        expect(colours, what).toEqual(new Set([...band.map(lin), outline].map((v) => v.map((x) => x.toFixed(5)).join())));
      }
    }
  });

  it('gives each crown shape its own outline of gems and tips', () => {
    const shapes = OPTIONS.crown.map((crown) => crownParts({ ...DEFAULT_LOOK, crown }).parts.map((r) => r.slice(13, 16).map((v) => v.toFixed(3)).join()).join('|'));
    expect(new Set(shapes).size).toBe(OPTIONS.crown.length);
  });
});

describe('her shoes and jewels', () => {
  const settle = (look: Partial<PrincessLook>) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const p = makePrincess({ x: 0, z: 0 });
    p.setLook({ ...DEFAULT_LOOK, ...look });
    for (let k = 0; k < 30; k++) p.update(1 / 60, k / 60);
    return p;
  };
  /**
   * Her parts in a colour: where they are (world; she stands at the origin facing south), how far they reach along
   * their own z (front) and how high their top is (every shape reaches 1 up its own y axis).
   */
  const inColour = (p: P, hex: string) => {
    const want = new THREE.Color(hex);
    const out: { x: number; y: number; z: number; depth: number; top: number; id: number }[] = [];
    for (let i = 0; i < p.parts.n; i++) {
      const c = p.parts.col.subarray(i * 3, i * 3 + 3);
      if (Math.abs(c[0] - want.r) + Math.abs(c[1] - want.g) + Math.abs(c[2] - want.b) > 1e-5) continue;
      const e = p.parts.mat.subarray(i * 16, i * 16 + 16);
      out.push({ x: e[12], y: e[13], z: e[14], depth: Math.hypot(e[8], e[9], e[10]), top: e[13] + e[5], id: p.parts.id[i] });
    }
    return out;
  };

  it('shows two toe tips 1 to 5 cm out of the hem front under the ball and gala gowns, and none while she sits in the slide', () => {
    for (const gown of ['ball', 'gala'] as const) {
      for (const shoes of OPTIONS.shoes) {
        const p = settle({ gown, shoes, shoeColour: 'green' });
        const toes = inColour(p, PALETTE.green.small).filter((q) => q.id === B.Lo && q.y < 0.1);
        expect(toes.length, `${gown} ${shoes}`).toBe(2);
        for (const q of toes) {
          const out = q.z + q.depth - DRESS_ROWS.ball.reduce((r, row) => Math.max(r, row.y < 0.1 ? row.r : 0), 0);
          expect(out, `${gown} ${shoes}`).toBeGreaterThan(0.01);
          expect(out, `${gown} ${shoes}`).toBeLessThan(0.05);
        }
        void p.rideSlide();
        for (let k = 0; k < 4000 && p.mode !== 'slide'; k++) p.update(1 / 60, k / 60);
        for (let k = 0; k < 20; k++) p.update(1 / 60, k / 60);
        expect(inColour(p, PALETTE.green.small).filter((q) => q.id === B.Lo).length, `${gown} ${shoes} sitting`).toBe(0);
      }
    }
  });

  it('keeps the toe tips on the ground in the curtsy and the jump, and gives boots their own toe under the ball gowns', () => {
    const toesOf = (p: P) => inColour(p, PALETTE.green.small).filter((q) => q.id === B.Lo && q.y < 0.15);
    for (const gown of ['ball', 'gala'] as const) {
      for (const shoes of OPTIONS.shoes) {
        for (const kind of ['curtsy', 'jump'] as const) {
          const p = settle({ gown, shoes, shoeColour: 'green' });
          void p.emote(kind);
          let low = Infinity;
          let high = -Infinity;
          for (let k = 0; k < 150; k++) {
            p.update(1 / 60, 0.5 + k / 60);
            const toes = inColour(p, PALETTE.green.small).filter((q) => q.id === B.Lo);
            // In the jump's air time the toes go up with her; on the ground they stay at the grass.
            for (const q of toes) {
              low = Math.min(low, q.y);
              if (q.y < 0.15) high = Math.max(high, q.y);
            }
          }
          const what = `${gown} ${shoes} ${kind}`;
          expect(low, what).toBeGreaterThan(0.015);
          if (kind === 'curtsy') expect(high, what).toBeLessThan(0.06);
        }
      }
    }
    // Boots: a bigger, rounder toe with a strap in the cuff colour where it meets the hem.
    const boots = settle({ gown: 'ball', shoes: 'boots', shoeColour: 'green' });
    const slippers = settle({ gown: 'ball', shoes: 'slippers', shoeColour: 'green' });
    expect(toesOf(boots)[0].top).toBeGreaterThan(toesOf(slippers)[0].top + 0.005);
    const accent = accentOf('green');
    expect(inColour(boots, accent).filter((q) => q.y < 0.15)).toHaveLength(2);
    expect(inColour(slippers, accent).filter((q) => q.y < 0.15)).toHaveLength(0);
  });

  it('draws a rainbow on the small parts in several of its bands, as the swatch shows, never in one pink', () => {
    const bands = PALETTE.rainbow.bands!;
    /** The rainbow's bands in a look that the same look in pink does not have. */
    const extra = (look: Partial<PrincessLook>, field: 'thingColour' | 'shoeColour' | 'jewelColour') => {
      const shown = (colour: 'rainbow' | 'pink') => {
        const p = settle({ ...look, [field]: colour });
        return new Set(bands.filter((h) => inColour(p, h).length > 0));
      };
      const pink = shown('pink');
      return [...shown('rainbow')].filter((h) => !pink.has(h)).length;
    };
    // The things of many pieces show at least four bands; boots show four on her two feet (shoe and shaft).
    const many = new Set<string>(['flowers', 'daisies', 'shells', 'moons', 'butterflies', 'bows', 'unicorn']);
    for (const thing of OPTIONS.thing) expect(extra({ thing }, 'thingColour'), thing).toBeGreaterThanOrEqual(many.has(thing) ? 4 : 2);
    for (const gown of ['party', 'ball'] as const) {
      for (const shoes of OPTIONS.shoes) expect(extra({ gown, shoes }, 'shoeColour'), `${gown} ${shoes}`).toBeGreaterThanOrEqual(gown === 'party' && shoes === 'boots' ? 4 : 2);
    }
    for (const earrings of OPTIONS.earrings.filter((e) => e !== 'none')) expect(extra({ earrings }, 'jewelColour'), earrings).toBeGreaterThanOrEqual(2);
    for (const necklace of OPTIONS.necklace.filter((n) => n !== 'none')) expect(extra({ necklace }, 'jewelColour'), necklace).toBeGreaterThanOrEqual(4);
  });

  it('draws the shoes in their colour on both feet under the party dress and the tutu, with what stands out on them', () => {
    for (const gown of ['party', 'tutu'] as const) {
      for (const shoes of OPTIONS.shoes) {
        const p = settle({ gown, shoes, shoeColour: 'blue' });
        const feet = inColour(p, PALETTE.blue.small);
        expect(feet.some((q) => q.x < 0) && feet.some((q) => q.x > 0), `${gown} ${shoes}`).toBe(true);
        // Under the party dress's hem (0.16 m up): boots reach up the shin, the others stay at her feet.
        expect(Math.max(...feet.map((q) => q.top)), `${gown} ${shoes}`).toBeLessThan(shoes === 'boots' ? 0.2 : 0.1);
      }
    }
    const top = (shoes: PrincessLook['shoes']) => Math.max(...inColour(settle({ shoes, shoeColour: 'blue' }), PALETTE.blue.small).map((q) => q.top));
    expect(top('boots')).toBeGreaterThan(top('slippers') + 0.08);
  });

  it('wears each pair of earrings on both sides of her head and each necklace at the front of her bodice, in the jewel colour', () => {
    const jewel = PALETTE.purple.small;
    expect(inColour(settle({ jewelColour: 'purple' }), jewel)).toEqual([]);
    for (const earrings of OPTIONS.earrings.filter((e) => e !== 'none')) {
      const parts = inColour(settle({ earrings, jewelColour: 'purple' }), jewel);
      expect(parts.some((q) => q.x < -0.18) && parts.some((q) => q.x > 0.18), earrings).toBe(true);
      for (const q of parts) expect(q.y, earrings).toBeGreaterThan(0.9);
    }
    for (const necklace of OPTIONS.necklace.filter((n) => n !== 'none')) {
      const parts = inColour(settle({ necklace, jewelColour: 'purple' }), jewel);
      expect(parts.length, necklace).toBeGreaterThanOrEqual(7);
      for (const q of parts) {
        expect(q.z, necklace).toBeGreaterThan(0.05);
        expect(q.y, necklace).toBeGreaterThan(0.65);
        expect(q.y, necklace).toBeLessThan(0.86);
      }
    }
  });
});

describe('the little stars and hearts', () => {
  /** The size of each part in a list along its own x, y and z. */
  const sizes = (L: PartList, id: BatchId) => {
    const out: number[][] = [];
    for (let i = 0; i < L.n; i++) {
      if (L.id[i] !== id) continue;
      const e = L.mat.subarray(i * 16, i * 16 + 16);
      out.push([Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])]);
    }
    return out;
  };
  const colours = { ribbon: new THREE.Color('#ff5c9d'), ribbonLight: new THREE.Color('#ffaacc'), bands: null };
  const paint = { main: new THREE.Color('#ff5c9d'), accent: new THREE.Color('#ffffff'), bands: null };

  it('draws every star with five points of one size: the moon clip, the star earrings and the star shoes', () => {
    const stars: [string, (L: PartList) => void][] = [
      ['moons', (L) => drawThing(L, 'moons', new Xf(), 1, 0, 0, colours)],
      ['moons on her right', (L) => drawThing(L, 'moons', new Xf(), -1, 0, 0, colours)],
      ['star earrings', (L) => drawEarring(L, 'stars', new Xf(), 1, 0, paint)],
      ['star shoes', (L) => shoeExtras(L, 'stars', new Xf(), paint, new THREE.Color('#ffc93a'))],
    ];
    for (const [what, draw] of stars) {
      const L = new PartList(64);
      draw(L);
      const cones = sizes(L, B.Cone);
      expect(cones.length, what).toBe(5);
      for (const c of cones) for (let a = 0; a < 3; a++) expect(c[a], what).toBeCloseTo(cones[0][a], 6);
      expect(cones[0][1], what).toBeGreaterThan(0.01);
    }
  });

  it('draws every heart with two round tops of one size', () => {
    for (const [what, draw] of [
      ['hearts', (L: PartList) => drawThing(L, 'hearts', new Xf(), 1, 0, 0, colours)],
      ['heart earrings', (L: PartList) => drawEarring(L, 'hearts', new Xf(), 1, 0, paint)],
    ] as const) {
      const L = new PartList(64);
      draw(L);
      const lobes = sizes(L, B.Lo).filter((s) => Math.abs(s[0] - s[1]) < 1e-6);
      expect(lobes.length, what).toBeGreaterThanOrEqual(2);
      expect(lobes[0][0], what).toBeCloseTo(lobes[1][0], 6);
    }
  });
});

describe('the wings on any gown', () => {
  it('keep every feather outside the skirt of the ball and gala gowns while they flap', () => {
    for (const gown of ['party', 'ball', 'gala', 'tutu'] as const) {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const p = makePrincess({ x: 0, z: 0 });
      p.hold(true);
      p.setLook({ ...DEFAULT_LOOK, gown, extra: 'wings', gownColour: 'green' });
      const skirt = skirtTable(GOWN_DRESS[gown], DRESS_ROWS[GOWN_DRESS[gown]]);
      const feather = new Set([new THREE.Color('#ffffff'), new THREE.Color(PALETTE.green.base)].map((c) => c.toArray().map((v) => v.toFixed(5)).join()));
      let seen = 0;
      for (let k = 0; k < 120; k++) {
        p.update(1 / 60, k / 60);
        for (let i = 0; i < p.parts.n; i++) {
          if (p.parts.id[i] !== B.Mid) continue;
          if (!feather.has(Array.from(p.parts.col.subarray(i * 3, i * 3 + 3)).map((v) => v.toFixed(5)).join())) continue;
          const e = p.parts.mat.subarray(i * 16, i * 16 + 16);
          // Feathers are behind her; the sleeves and eye whites are not.
          if (e[14] > -0.08) continue;
          seen++;
          // Both ends of the feather along its length; below the waist (y 0.58) the skirt is there, above it her back.
          for (const end of [-1, 1]) {
            const x = e[12] + end * e[4];
            const y = e[13] + end * e[5];
            const z = e[14] + end * e[6];
            if (y < 0.58) expect(Math.hypot(x, z), `${gown} feather end at y ${y.toFixed(2)}`).toBeGreaterThan(skirtAt(skirt, y) - 0.03);
          }
        }
      }
      expect(seen, gown).toBeGreaterThan(0);
      vi.restoreAllMocks();
    }
  });
});

describe('the batches', () => {
  const BREEDS: UnicornLook[] = [
    { stage: 'baby', breed: 'moon', body: '#f7f8ff', mane: '#7d9cf0', mane2: '#b9c8f8' },
    { stage: 'baby', breed: 'nestling', body: '#fff0d4', mane: '#ff6fae', mane2: '#ffb0d2', shiny: true },
    { stage: 'foal', breed: 'snow', body: '#e4f3ff', mane: '#4fc3f0', mane2: '#bdeaff' },
    { stage: 'foal', breed: 'berry', body: '#e3d2ff', mane: '#d02a96', mane2: '#ff7cc4' },
  ];

  it('keep every batch under its capacity with the busiest look (portrait or not), 20 unicorns (12 herd, 4 babies, 2 mounts, 2 spare) as the herd draws them (5 in full detail) and two eggs', { timeout: 60000 }, () => {
    const p = makePrincess();
    const ctx = {
      deps: { route: (_a: unknown, b: { x: number; z: number }) => [b], isWalkable: () => true, nearestWalkable: (q: { x: number; z: number }) => q },
      fx: fxStub, queue: new SlideQueue<object>(), leader: p, scene: new THREE.Scene(), sounds: () => false,
      swimmers: () => [], toyTexture: () => new THREE.Texture(),
    };
    // 2.4.0: Bella and Hazel with their saddles come first, so they are drawn in full detail as while riding.
    const looks = [MOUNT_LOOKS.bella, MOUNT_LOOKS.hazel, ...Array.from({ length: 18 }, (_, i) => BREEDS[i % 4])];
    const herd = looks.map((look, i) => {
      const u = new UnicornActor({ id: 'u' + i, name: 'U', look, at: { x: i, z: 0 } }, ctx);
      u.nightcap(i % 2 === 0);
      return u;
    });
    const unicorns = new Map<number, number>();
    for (let k = 0; k < 90; k++) {
      const used = new Map<number, number>();
      herd.forEach((u, i) => {
        u.update(1 / 30, k / 30);
        u.draw(i < 5);
        for (let j = 0; j < u.parts.n; j++) used.set(u.parts.id[j], (used.get(u.parts.id[j]) ?? 0) + 1);
      });
      for (const [id, n] of used) unicorns.set(id, Math.max(unicorns.get(id) ?? 0, n));
    }
    for (const id of Object.values(B) as BatchId[]) {
      for (const portrait of [false, true]) {
        // The busiest look is picked for the view it is measured in: the portrait draws Mid as Fine and Lo as Mid.
        const look = busiest((m) => m.batch(id), portrait);
        const hers = measure(look, { rose: true, portrait }).batch(id);
        // The egg (a list of 16) and the effects' beam glows (at most 8) come on top in the soft and flat batches; 2.4.0
        // has two egg actors (the home egg and the trail egg), so the soft batch keeps room for both.
        const room = id === B.Soft ? 40 : id === B.Arc ? 16 : 0;
        expect(hers + (unicorns.get(id) ?? 0) + room, `batch ${id}, portrait ${portrait}, ${JSON.stringify(look)}`).toBeLessThanOrEqual(CAPACITY[id]);
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

  it('draws two, one or no hair tubes as each style needs (setDrawRange, no new geometry)', () => {
    const p = makePrincess();
    const g = p.hair.tubes.mesh.geometry;
    const tris = (style: PrincessLook['style']) => {
      p.setLook({ style });
      run(p, 0.1);
      return p.hair.tubes.triangles;
    };
    const two = tris('ponytails');
    expect(two).toBe(2 * 23 * 12 * 2);
    // Two tails (the bun's two are its ringlets), one tail, or plaits and buns with no tubes (2.3 section 15).
    const tails: Record<PrincessLook['style'], number> = {
      ponytails: 2, high: 1, plaits: 0, bun: 2, low: 2, side: 1, curly: 2, bunches: 2, long: 2, curls: 1, plait: 0, lowbun: 0,
    };
    for (const style of OPTIONS.style) expect(tris(style), style).toBe((two / 2) * tails[style]);
    expect(p.hair.tubes.mesh.geometry).toBe(g);
  });

  it('puts the side ponytail on her left and the single plait down her back', () => {
    const p = makePrincess({ x: 0, z: 0 });
    p.hold(true);
    // Standing still, facing south: her left is +x, her back -z.
    const hang = (style: PrincessLook['style']) => {
      p.setLook({ style });
      p.place({ x: 0, z: 0 }, 0);
      run(p, 1.5);
      const tip = p.hair.chains[0]?.p.at(-1) ?? p.position;
      return { x: tip.x - p.position.x, z: tip.z - p.position.z, n: p.hair.chains.length };
    };
    const side = hang('side');
    expect(side.n).toBe(1);
    expect(side.x).toBeGreaterThan(0.2);
    const plait = hang('plait');
    expect(plait.n).toBe(1);
    expect(Math.abs(plait.x)).toBeLessThan(0.05);
    expect(plait.z).toBeLessThan(-0.15);
    expect(hang('lowbun').n).toBe(0);
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

describe("the egg's hearts", () => {
  /** A canvas stand-in for node: the shell's painting calls do nothing. */
  function fakeDocument(): void {
    const ctx = new Proxy({}, { get: (_t, k) => (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'canvas' ? { width: 512, height: 256 } : () => {}) });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  }

  /** The glow (emissive strength and colour) and the largest rock of the shell over 3 s at each number of hearts. */
  function look(kind: 'warm' | 'snow', reset?: 'place' | 'hide') {
    fakeDocument();
    const sparkles: { colour?: string }[] = [];
    const fx = { ...fxStub, sparkle: (_at: unknown, o: { colour?: string } = {}) => sparkles.push(o) } as unknown as typeof fxStub;
    const scene = new THREE.Scene();
    const egg = createEgg(scene, fx);
    const shell = scene.getObjectByName('actors-egg') as THREE.Mesh;
    const mat = shell.material as THREE.MeshLambertMaterial;
    egg.place(new THREE.Vector3(0, 0.3, 0), kind);
    let t = 0;
    const out: { glow: number; colour: THREE.Color; rock: number }[] = [];
    for (const lit of [0, 1, 2, 3] as const) {
      egg.hearts(lit);
      let rock = 0;
      let glow = 0;
      for (let k = 0; k < 180; k++) {
        t += 1 / 60;
        egg.update(1 / 60, t);
        // After the heart's happy wobble has calmed down: the idle rock and the glow it keeps.
        if (k > 120) {
          const up = new THREE.Vector3().setFromMatrixColumn(shell.matrix, 1).normalize();
          rock = Math.max(rock, Math.acos(Math.min(1, up.y)));
          glow = Math.max(glow, mat.emissiveIntensity);
        }
      }
      out.push({ glow, colour: mat.emissive.clone(), rock });
    }
    if (reset === 'place') egg.place(new THREE.Vector3(0, 0.3, 0), kind);
    if (reset === 'hide') {
      egg.hide();
      egg.place(new THREE.Vector3(0, 0.3, 0), kind);
    }
    if (reset) for (let k = 0; k < 120; k++) egg.update(1 / 60, (t += 1 / 60));
    vi.unstubAllGlobals();
    return { out, sparkles, after: mat.emissiveIntensity };
  }

  it('glows more and rocks more with every heart: the warm egg a warmer gold, the snow egg a frostier blue', () => {
    for (const kind of ['warm', 'snow'] as const) {
      const { out, sparkles } = look(kind);
      expect(out[0].glow, kind).toBe(0);
      expect(out[0].rock, kind).toBeLessThan(0.01);
      for (let i = 1; i < 4; i++) {
        expect(out[i].glow, `${kind} ${i}`).toBeGreaterThan(out[i - 1].glow + 0.05);
        expect(out[i].rock, `${kind} ${i}`).toBeGreaterThan(out[i - 1].rock + 0.01);
      }
      const c = out[3].colour;
      if (kind === 'warm') {
        expect(c.r).toBeGreaterThan(c.g);
        expect(c.g).toBeGreaterThan(c.b);
      } else {
        expect(c.b).toBeGreaterThan(c.r);
        expect(c.b).toBeGreaterThanOrEqual(c.g);
      }
      // Each heart that lights sends up a sparkle in the egg's glow colour.
      expect(sparkles.length, kind).toBe(3);
    }
  });

  it('goes back to no hearts when it is placed again or hidden', () => {
    for (const kind of ['warm', 'snow'] as const) {
      expect(look(kind, 'place').after, kind).toBe(0);
      expect(look(kind, 'hide').after, kind).toBe(0);
    }
  });
});

describe("the actors' sound effects", () => {
  afterEach(() => {
    sound.fx.length = 0;
    sound.sfx.length = 0;
    sound.checked = false;
    sound.speaking = false;
  });

  it('whooshes at the top of the slide and splashes with the two splash files in turn, with synthesised fallbacks', () => {
    const p = makePrincess();
    (p as unknown as { ctx: { sounds: () => boolean } }).ctx.sounds = () => true;
    for (let ride = 0; ride < 2; ride++) {
      void p.rideSlide();
      for (let k = 0; k < 6000 && p.mode !== 'swim'; k++) p.update(1 / 60, k / 60);
      for (let k = 0; k < 6000 && p.mode === 'swim'; k++) p.update(1 / 60, k / 60);
    }
    const ids = sound.fx.map((f) => f.id);
    expect(ids.filter((id) => id === 'slide-whoosh')).toHaveLength(2);
    const splashes = sound.fx.filter((f) => f.id.startsWith('splash'));
    expect(splashes.map((f) => f.id).sort()).toEqual(['splash-1', 'splash-2']);
    for (const f of sound.fx) expect(f.fallback).toBe(f.id === 'slide-whoosh' ? 'whoosh' : 'splash');
  });

  it("lets a baby nicker after a hop or a happy emote, at most once in 6 s for the whole herd and never in a checked moment", () => {
    const p = makePrincess();
    const herd = createHerd({
      deps: { route: (_a, b) => [b], isWalkable: () => true, nearestWalkable: (q) => q }, fx: fxStub, queue: new SlideQueue<object>(),
      leader: p, scene: new THREE.Scene(), sounds: () => true,
    });
    const baby = herd.add({ id: 'b', name: 'B', look: { stage: 'baby', breed: 'moon', body: '#fff', mane: '#f9c', mane2: '#fcf' }, at: { x: 0, z: 0 } });
    const foal = herd.add({ id: 'f', name: 'F', look: { stage: 'foal', breed: 'snow', body: '#fff', mane: '#9cf', mane2: '#cff' }, at: { x: 2, z: 0 } });
    const nickers = () => sound.fx.filter((f) => f.id.startsWith('nicker')).map((f) => f.id);
    let t = 0;
    const at = (s: number) => herd.update(s - t, (t = s), null);
    /** One herd frame: a nicker asked for plays on the herd's next tick. */
    const frame = () => at(t + 1 / 60);
    at(10);
    void foal.emote('happy');
    frame();
    expect(nickers()).toEqual([]);
    void baby.emote('hop');
    void baby.emote('happy');
    expect(nickers(), 'it waits one herd frame').toEqual([]);
    frame();
    expect(nickers()).toEqual(['nicker-1']);
    at(15);
    void baby.emote('hop');
    frame();
    expect(nickers()).toHaveLength(1);
    at(16.5);
    sound.checked = true;
    void baby.emote('happy');
    frame();
    expect(nickers()).toHaveLength(1);
    sound.checked = false;
    void baby.emote('look');
    frame();
    expect(nickers()).toHaveLength(1);
    // A tap hops her baby and says its name in the same moment: no nicker under the name, and none after it.
    void baby.emote('hop');
    sound.speaking = true;
    frame();
    sound.speaking = false;
    frame();
    expect(nickers()).toHaveLength(1);
    void baby.emote('happy');
    frame();
    expect(nickers()).toEqual(['nicker-1', 'nicker-2']);
    for (const f of sound.fx) expect(f.fallback, 'a nicker has no synthesised stand-in').toBeUndefined();
  });

  it('plays the small pond splashes synthesised, at most once in 2 s for the herd, never in a checked moment or under speech', () => {
    const s = createHerdSounds();
    s.tick(1);
    s.splash();
    s.splash();
    expect(sound.sfx).toEqual(['splash']);
    s.tick(2.5);
    s.splash();
    expect(sound.sfx).toHaveLength(1);
    s.tick(3.1);
    sound.checked = true;
    s.splash();
    sound.checked = false;
    sound.speaking = true;
    s.splash();
    sound.speaking = false;
    expect(sound.sfx).toHaveLength(1);
    s.splash();
    expect(sound.sfx).toEqual(['splash', 'splash']);
    expect(sound.fx, 'the splash files are for the slide').toEqual([]);
  });

  it('gives a hop into the pond and a spray at a friend the small splash, never the slide splash files', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const small = vi.fn();
    const friend = new THREE.Vector3();
    let u: UnicornActor | null = null;
    const ctx = {
      deps: { route: (_a: unknown, b: { x: number; z: number }) => [b], isWalkable: () => true, nearestWalkable: (q: { x: number; z: number }) => q },
      fx: { ...fxStub, spray() {} } as unknown as typeof fxStub, queue: new SlideQueue<object>(), leader: makePrincess(), scene: new THREE.Scene(),
      sounds: () => true, smallSplash: small,
      swimmers: () => (u ? [{ position: friend.copy(u.position).setX(u.position.x + 1) }] : []), toyTexture: () => new THREE.Texture(),
    };
    u = new UnicornActor({ id: 'u', name: 'U', look: { stage: 'baby', breed: 'moon', body: '#fff', mane: '#f9c', mane2: '#fcf' }, at: { x: 10, z: -3 } }, ctx);
    u.swim();
    for (let k = 0; k < 60 * 12; k++) u.update(1 / 60, k / 60);
    // The hop in, then at least one spray.
    expect(small.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(sound.fx.filter((f) => f.id.startsWith('splash'))).toEqual([]);
  });
});

// ---- 2.4.0: the mounts, side-saddle and riding a path (docs/v4/2.4.md section 5.4, docs/v4/2.4-plan.md Tasks 21 to 23)

/** A herd context for unicorns made one by one (no herd, no world): flat walkable ground, routes in a straight line. */
function unicornCtx(leader = makePrincess()) {
  return {
    deps: { route: (_a: unknown, b: { x: number; z: number }) => [b], isWalkable: () => true, nearestWalkable: (q: { x: number; z: number }) => q },
    fx: fxStub, queue: new SlideQueue<object>(), leader, scene: new THREE.Scene(), sounds: () => false,
    swimmers: () => [], toyTexture: () => new THREE.Texture(),
  };
}
const BABY: UnicornLook = { stage: 'baby', breed: 'moon', body: '#f7f8ff', mane: '#7d9cf0', mane2: '#b9c8f8' };
const idsOf = (L: PartList) => Array.from(L.id.subarray(0, L.n));
/** A straight ground path from a to b (a curve with arc length, as RIDE_PATHS are). */
const line = (a: { x: number; z: number }, b: { x: number; z: number }) => new THREE.LineCurve3(new THREE.Vector3(a.x, 0, a.z), new THREE.Vector3(b.x, 0, b.z));

describe('the grown mounts', () => {
  it("stands a grown unicorn's back at about 0.85 m and draws its saddle in no new batch", () => {
    const ctx = unicornCtx();
    const b = BUILDS.grown;
    expect(b.bodyY + b.body[1]).toBeGreaterThan(0.8);
    expect(b.bodyY + b.body[1]).toBeLessThan(0.9);
    for (const m of ['bella', 'hazel'] as const) {
      const look = MOUNT_LOOKS[m];
      const u = new UnicornActor({ id: `mount-${m}`, name: m, look, at: RIDE.mounts[m] }, ctx);
      const foal = new UnicornActor({ id: 'foal', name: 'F', look: { ...look, stage: 'foal' }, at: RIDE.mounts[m] }, ctx);
      u.update(1 / 60, 0);
      foal.update(1 / 60, 0);
      const top = u.saddleTop(new THREE.Vector3());
      expect(top.y, m).toBeGreaterThanOrEqual(0.8);
      expect(top.y, m).toBeLessThanOrEqual(0.9);
      expect(Math.hypot(top.x - RIDE.mounts[m].x, top.z - RIDE.mounts[m].z), m).toBeLessThan(0.25);
      for (const full of [true, false]) {
        u.draw(full);
        foal.draw(full);
        const own = new Set(idsOf(foal.parts));
        // The saddle adds parts, all in batches a foal already uses, and none in the Horn batch.
        expect(u.parts.n, `${m} ${full}`).toBeGreaterThan(foal.parts.n);
        expect(idsOf(u.parts).every((id) => own.has(id)), `${m} ${full}`).toBe(true);
        expect(idsOf(u.parts).filter((id) => id === B.Horn)).toHaveLength(1);
      }
    }
    expect(MOUNT_LOOKS.bella.body).not.toBe(MOUNT_LOOKS.hazel.body);
  });

  it('ranks the focus first for full detail: the mount and one follower at level 2', () => {
    const p = makePrincess({ x: 0, z: 0 });
    const herd = createHerd({
      deps: { route: (_a, b) => [b], isWalkable: () => true, nearestWalkable: (q) => q }, fx: fxStub, queue: new SlideQueue<object>(),
      leader: p, scene: new THREE.Scene(), sounds: () => false,
    });
    const bella = herd.add({ id: 'mount-bella', name: 'Bella', look: MOUNT_LOOKS.bella, at: { x: 9, z: 0 } });
    const baby = herd.add({ id: 'baby-13', name: 'Pip', look: BABY, at: { x: 7, z: 2 } });
    const near = [herd.add({ id: 'luna', name: 'Luna', look: BABY, at: { x: 1, z: 0 } }), herd.add({ id: 'evie', name: 'Evie', look: BABY, at: { x: 0, z: 1.5 } })];
    const fine = (u: UnicornActor) => idsOf(u.parts).includes(B.Hi);
    herd.setDetail(2);
    herd.setFocus(['mount-bella', 'baby-13']);
    herd.update(1 / 30, 0, null);
    expect([fine(bella), fine(baby)]).toEqual([true, true]);
    expect(near.map(fine)).toEqual([false, false]);
    expect(herd.stats.full).toBe(2);
    // An empty focus goes back to distance alone: the two nearest her.
    herd.setFocus([]);
    herd.update(1 / 30, 1 / 30, null);
    expect(near.map(fine)).toEqual([true, true]);
  });

  it('grazes a mount within 0.6 m of its spot, and it never follows, is never lifted, never slides, swims or goes into a stall', async () => {
    const ctx = unicornCtx();
    const spot = RIDE.mounts.bella;
    const u = new UnicornActor({ id: 'mount-bella', name: 'Bella', look: MOUNT_LOOKS.bella, at: spot }, ctx);
    u.graze(spot, { radius: 0.6 });
    let most = 0;
    for (let k = 0; k < 120 * 30; k++) {
      u.update(1 / 30, k / 30);
      most = Math.max(most, Math.hypot(u.position.x - spot.x, u.position.z - spot.z));
    }
    expect(most).toBeLessThanOrEqual(0.6);
    expect(most).toBeGreaterThan(0.1);
    // A herd baby still grazes as wide as before.
    const b = new UnicornActor({ id: 'b', name: 'B', look: BABY, at: spot }, ctx);
    b.graze(spot);
    let wide = 0;
    for (let k = 0; k < 120 * 30; k++) {
      b.update(1 / 30, k / 30);
      wide = Math.max(wide, Math.hypot(b.position.x - spot.x, b.position.z - spot.z));
    }
    expect(wide).toBeGreaterThan(1);
    u.follow(0);
    expect(u.mode).toBe('graze');
    u.lift();
    expect(u.mode).toBe('graze');
    await u.rideSlide();
    u.swim();
    await u.enterStall(5);
    expect(u.mode).toBe('graze');
  });

  it('paints the star egg its own shell', () => {
    const stops: string[] = [];
    const ctx = new Proxy({}, {
      get: (_t, k) => (k === 'createLinearGradient' ? () => ({ addColorStop: (_o: number, c: string) => stops.push(c) }) : k === 'canvas' ? { width: 512, height: 256 } : () => {}),
      set: () => true,
    });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const scene = new THREE.Scene();
    const egg = createEgg(scene, fxStub);
    const mat = (scene.getObjectByName('actors-egg') as THREE.Mesh).material as THREE.MeshLambertMaterial;
    const shell = (kind: 'warm' | 'snow' | 'star') => {
      stops.length = 0;
      egg.place(new THREE.Vector3(0, 0.3, 0), kind);
      egg.hearts(3);
      for (let k = 0; k < 120; k++) egg.update(1 / 60, k / 60);
      return { stops: stops.join(','), glow: mat.emissive.getHexString() };
    };
    const warm = shell('warm');
    const snow = shell('snow');
    const star = shell('star');
    vi.unstubAllGlobals();
    expect(star.stops).not.toBe(snow.stops);
    expect(star.stops).not.toBe(warm.stops);
    expect(star.glow).not.toBe(snow.glow);
    expect(star.glow).not.toBe(warm.glow);
  });
});

describe('side-saddle', () => {
  const _q = new THREE.Vector3();
  /** The mount's body and chest ellipsoids now, as matrices that take a world point into each unit sphere. */
  const unitOf = (u: UnicornActor) => bodyEllipsoids(u.pose, u.build).map((m) => m.clone().invert());
  /** How far inside the body or the chest a world point is, as a fraction of its radius (0 outside). */
  function inside(units: THREE.Matrix4[], v: THREE.Vector3): number {
    let worst = 0;
    for (const m of units) worst = Math.max(worst, 1 - _q.copy(v).applyMatrix4(m).length());
    return worst;
  }
  const LIMB = limb().getAttribute('position');
  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();

  /** Mount a grown unicorn and wait until she sits. */
  async function seat(p: ReturnType<typeof makePrincess>, u: UnicornActor, frame: () => void): Promise<void> {
    let seated = false;
    void p.mount(u).then(() => (seated = true));
    for (let k = 0; k < 90 && !seated; k++) {
      frame();
      await Promise.resolve();
    }
    expect(seated).toBe(true);
    expect(p.mode).toBe('mounted');
    expect(p.mountedOn).toBe(u);
  }

  it('sits the busiest look side-saddle on a grown unicorn in all four gown shapes, nothing through the body', { timeout: 60000 }, async () => {
    const busy = busiest((m) => m.triangles);
    for (const gown of ['party', 'ball', 'gala', 'tutu'] as const) {
      const scene = new THREE.Scene();
      const p = makePrincess({ x: 0.9, z: 0 }, scene);
      p.setLook({ ...busy, gown });
      p.crown(true);
      p.extra('rose');
      const u = new UnicornActor({ id: 'mount-bella', name: 'Bella', look: MOUNT_LOOKS.bella, at: { x: 0, z: 0 } }, unicornCtx(p));
      const dress = scene.getObjectByName('actors-dress') as THREE.Mesh;
      let t = 0;
      const dt = 1 / 60;
      const worst = { dress: 0, legs: 0, hair: 0, feet: Infinity };
      const check = () => {
        const units = unitOf(u);
        const pos = dress.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) worst.dress = Math.max(worst.dress, inside(units, _v.fromBufferAttribute(pos, i).applyMatrix4(dress.matrix)));
        const L = p.parts;
        for (let i = 0; i < L.n; i++) {
          if (L.id[i] !== B.Limb) continue;
          _m.fromArray(L.mat, i * 16);
          for (let k = 0; k < LIMB.count; k++) {
            _v.fromBufferAttribute(LIMB, k).applyMatrix4(_m);
            worst.legs = Math.max(worst.legs, inside(units, _v));
            worst.feet = Math.min(worst.feet, _v.y);
          }
        }
        worst.hair = Math.max(worst.hair, p.hairPenetration());
      };
      let k = 0;
      const frame = () => {
        t += dt;
        u.update(dt, t);
        p.update(dt, t);
        if (p.mode === 'mounted' && p.mountedOn && k++ % 3 === 0 && t > 1.2) check();
      };
      await seat(p, u, frame);
      const run = (s: number) => {
        for (let i = 0; i < Math.round(s / dt); i++) frame();
      };
      run(1.5);
      void u.goTo([{ x: 0, z: -5 }]);
      run(2.5);
      void u.goTo([{ x: 5, z: -5 }], { trot: true });
      run(2.5);
      void u.ridePath(line({ x: 5, z: -5 }, { x: 5, z: -40 }), 0, 35, { speed: 4.2 });
      run(3);
      // Her reactions on the mount (a right answer's twirl or jump) keep the skirt where it lies.
      for (const e of ['twirl', 'jump', 'curtsy', 'show'] as const) {
        void p.emote(e);
        run(1.7);
      }
      const what = JSON.stringify({ gown, worst });
      expect(worst.dress, what).toBeLessThan(0.01);
      expect(worst.legs, what).toBeLessThan(0.01);
      expect(worst.hair, what).toBeLessThan(0.02);
      // Her feet are off the ground, and she sits on the saddle, not beside it.
      expect(worst.feet, what).toBeGreaterThan(0.25);
      const top = u.saddleTop(new THREE.Vector3());
      expect(Math.hypot(p.position.x - top.x, p.position.z - top.z), what).toBeLessThan(0.35);
    }
  });

  it('hops up and down with a sparkle, and refuses a walk or the slide while mounted', async () => {
    const sparkles: unknown[] = [];
    const p = makePrincess({ x: 0.9, z: 0 });
    (p as unknown as { ctx: { fx: unknown } }).ctx.fx = { ...fxStub, sparkle: (at: unknown) => sparkles.push(at) };
    const u = new UnicornActor({ id: 'mount-hazel', name: 'Hazel', look: MOUNT_LOOKS.hazel, at: { x: 0, z: 0 } }, unicornCtx(p));
    let t = 0;
    const frame = () => {
      t += 1 / 60;
      u.update(1 / 60, t);
      p.update(1 / 60, t);
    };
    await seat(p, u, frame);
    expect(sparkles.length).toBeGreaterThanOrEqual(1);
    expect(await p.walkTo([{ x: 3, z: 3 }])).toBe(false);
    await p.rideSlide();
    expect(p.mode).toBe('mounted');
    let down = false;
    void p.dismount({ x: 1, z: 0.5 }).then(() => (down = true));
    for (let k = 0; k < 90 && !down; k++) {
      frame();
      await Promise.resolve();
    }
    expect(down).toBe(true);
    expect([p.mode, p.mountedOn]).toEqual(['idle', null]);
    expect(p.position.x).toBeCloseTo(1, 2);
    expect(p.position.y).toBeCloseTo(0, 2);
    expect(sparkles.length).toBeGreaterThanOrEqual(2);
  });

  it('flies the ponytails while the mount moves faster than a trot', async () => {
    // No look-around: her head faces where she sits, so the tails show the wind alone.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const trail = async (speed: number) => {
      const p = makePrincess({ x: 0.9, z: 0 });
      p.setLook({ style: 'ponytails' });
      const u = new UnicornActor({ id: 'mount-bella', name: 'Bella', look: MOUNT_LOOKS.bella, at: { x: 0, z: 0 } }, unicornCtx(p));
      let t = 0;
      const frame = () => {
        t += 1 / 60;
        u.update(1 / 60, t);
        p.update(1 / 60, t);
      };
      await seat(p, u, frame);
      void u.ridePath(line({ x: 0, z: 0 }, { x: 0, z: -80 }), 0, 80, { speed });
      let sum = 0;
      let n = 0;
      for (let k = 0; k < 240; k++) {
        frame();
        if (k < 90) continue;
        // Riding north (-z): how far the tails swing up from hanging, behind her (+z), in radians.
        for (const c of p.hair.chains) {
          const tip = c.p.at(-1)!;
          sum += Math.atan2(tip.z - c.p[1].z, c.p[1].y - tip.y);
          n++;
        }
      }
      return sum / n;
    };
    const walk = await trail(1.4);
    const trot = await trail(2.3);
    const gallop = await trail(4.2);
    expect(gallop).toBeGreaterThan(trot + 0.25);
    expect(trot).toBeGreaterThan(walk);
  });
});

describe('riding a path', () => {
  async function until(u: UnicornActor[], p: Promise<boolean>, maxS: number): Promise<{ v: boolean | null; s: number }> {
    let v: boolean | null = null;
    void p.then((x) => (v = x));
    let k = 0;
    for (; k < maxS * 60 && v === null; k++) {
      for (const x of u) x.update(1 / 60, k / 60);
      await Promise.resolve();
    }
    return { v, s: k / 60 };
  }

  it('rides a path at its speed by arc length, forward or backing up', async () => {
    const u = new UnicornActor({ id: 'mount-bella', name: 'Bella', look: MOUNT_LOOKS.bella, at: { x: 0, z: 0 } }, unicornCtx());
    const path = line({ x: 0, z: 0 }, { x: 0, z: -10 });
    const go = await until([u], u.ridePath(path, 0, 10, { speed: 4.2 }), 6);
    expect(go.v).toBe(true);
    expect(go.s).toBeGreaterThan(2.2);
    expect(go.s).toBeLessThan(2.9);
    expect(u.position.z).toBeCloseTo(-10, 2);
    expect(Math.abs(wrap(u.yaw - Math.PI))).toBeLessThan(0.05);
    // Two steps back: it keeps facing along the path.
    const back = await until([u], u.ridePath(path, 10, 8, { speed: 1, backwards: true }), 6);
    expect(back.v).toBe(true);
    expect(u.position.z).toBeCloseTo(-8, 2);
    expect(Math.abs(wrap(u.yaw - Math.PI))).toBeLessThan(0.05);
    // Back along the path the other way it turns round; another command replaces the ride.
    let r: boolean | null = null;
    void u.ridePath(path, 8, 0, { speed: 4.2 }).then((x) => (r = x));
    for (let k = 0; k < 40; k++) u.update(1 / 60, k / 60);
    expect(Math.abs(wrap(u.yaw))).toBeLessThan(0.3);
    u.graze({ x: 0, z: -5 });
    await Promise.resolve();
    expect(r).toBe(false);
  });

  it('keeps followers 1.6, 3.0 and 4.4 m behind the mount along its track', async () => {
    const ctx = unicornCtx();
    const lead = new UnicornActor({ id: 'mount-bella', name: 'Bella', look: MOUNT_LOOKS.bella, at: { x: 0, z: 0 } }, ctx);
    // The lead-in behind it: where she stood with her babies when she got on.
    lead.seedTrack([{ x: 0, z: 6 }, { x: 0, z: 0 }]);
    const gaps = [1.6, 3.0, 4.4];
    const fs = gaps.map((gap, i) => {
      const b = new UnicornActor({ id: 'b' + i, name: 'B', look: BABY, at: { x: 1.5 + i, z: 3 } }, ctx);
      b.trackBehind(lead, gap);
      return b;
    });
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -12), new THREE.Vector3(8, 0, -20), new THREE.Vector3(8, 0, -40)]);
    void lead.ridePath(path, 0, path.getLength(), { speed: 4.2 });
    const q = { x: 0, z: 0, heading: 0 };
    for (let k = 0; k < 5 * 60; k++) {
      lead.update(1 / 60, k / 60);
      for (const f of fs) f.update(1 / 60, k / 60);
    }
    fs.forEach((f, i) => {
      lead.trackPoint(gaps[i], q);
      expect(Math.hypot(f.position.x - q.x, f.position.z - q.z), `gap ${gaps[i]}`).toBeLessThan(0.3);
    });
    // Off the herd's separation: they are not on the grass to be nudged, and they never count as following her.
    expect(fs.every((f) => !f.onLand && f.mode !== 'follow')).toBe(true);
    fs[0].trackBehind(null, 0);
    expect(fs[0].mode).toBe('idle');
  });
});
