// Princess Emma's wardrobe in 3D (docs/v4/2.2.md 2.5): the colours of each gown by dress role, what else a gown
// changes (sleeves, shoes, legs, gloves, a back bow, wings), the six hair things, the ribbon tails and the picnic rose.
// The ids and the swatch colours live in src/wardrobe.ts; this file only draws. Everything is drawn from the shared
// instanced shapes, so a look costs no draw call and no new material.
import * as THREE from 'three';
import { GOWN_SHAPE, type LegacyGown as Gown, type LegacyThing as HairThing } from '../wardrobe-legacy';
import { B, type BatchId, type PartList, Xf, col } from './parts';
import type { DressRole, DressShape } from './shapes';

/** A gown's colours: each dress role (a tier graded from its lowest row to its highest), sleeves, shoes and legs. */
export interface Gown3D {
  shape: DressShape;
  trim: string;
  main: readonly [string, string];
  deep: readonly [string, string];
  sash: string;
  bodice: string;
  sleeve: string;
  /** null: no shoes and no legs are drawn (a floor-length gown: she glides). */
  shoe: string | null;
  /** Her legs: bare, or tights in a colour. */
  legs: 'skin' | string;
  /** White gloves (the lilac ball gown). */
  gloves?: boolean;
  /** A bow at the back of the sash, in this colour. */
  backBow?: string;
  /** Fairy wings: white feathers, the two outer ones in the gown's main colour. */
  wings?: boolean;
}

const one = (c: string): readonly [string, string] => [c, c];

/** The table in 2.5. The bodice takes the upper tier's colour unless the table names another. */
export const GOWN_3D: Record<Gown, Gown3D> = {
  rose: {
    shape: GOWN_SHAPE.rose, trim: '#fff4f9', main: one('#ffb7d8'), deep: one('#ff92c6'), sash: '#f0609f', bodice: '#ff92c6',
    sleeve: '#ffc6e1', shoe: '#ff6fa8', legs: 'skin',
  },
  rainbow: {
    shape: GOWN_SHAPE.rainbow, trim: '#fffaf4', main: ['#ffc9a3', '#ffe79a'], deep: ['#bdf0c8', '#b8dcff'], sash: '#d6c2ff',
    bodice: '#ffb7d8', sleeve: '#d6c2ff', shoe: '#ff9ccc', legs: 'skin',
  },
  lilac: {
    shape: GOWN_SHAPE.lilac, trim: '#faf5ff', main: one('#d9c6ff'), deep: one('#bfa0ff'), sash: '#ffb62e', bodice: '#bfa0ff',
    sleeve: '#e8dcff', shoe: null, legs: 'skin', gloves: true, backBow: '#bfa0ff',
  },
  moon: {
    shape: GOWN_SHAPE.moon, trim: '#f6f8ff', main: one('#dfe6fa'), deep: one('#c3cff0'), sash: '#ff8fbd', bodice: '#c3cff0',
    sleeve: '#ffc6e1', shoe: null, legs: 'skin', backBow: '#ff8fbd',
  },
  fairy: {
    shape: GOWN_SHAPE.fairy, trim: '#f2fff8', main: one('#c2f0da'), deep: one('#96e0bd'), sash: '#ff8fbd', bodice: '#96e0bd',
    sleeve: '#d9f7e8', shoe: '#ff8fbd', legs: 'skin', wings: true,
  },
  tutu: {
    shape: GOWN_SHAPE.tutu, trim: '#ffffff', main: one('#bfe2ff'), deep: one('#92c9ff'), sash: '#ff8fbd', bodice: '#bfe2ff',
    sleeve: '#ffffff', shoe: '#92c9ff', legs: '#ffffff',
  },
};

const _a = new THREE.Color();
/** The colour of a dress row (for paintDress). */
export function gownRowColour(g: Gown3D, role: DressRole, k: number, out: THREE.Color): THREE.Color {
  switch (role) {
    case 'trim':
      return out.set(g.trim);
    case 'main':
      return out.set(g.main[0]).lerp(_a.set(g.main[1]), k);
    case 'deep':
      return out.set(g.deep[0]).lerp(_a.set(g.deep[1]), k);
    case 'sash':
      return out.set(g.sash);
    case 'bodice':
      return out.set(g.bodice);
  }
}

/**
 * Sitting in the slide chute (radius 0.36): the dress is narrowed in x and z (`xz`), and only the party dress flares
 * out a little more as she sits, as it always did. It folds up by `y` and moves up by `lift` (in dress space) so the
 * hem stays at the seat: the floor-length gown folds up more, or its hem would poke through the slide.
 */
export const SIT_SQUASH: Record<DressShape, { xz: number; flare: number; y: number; lift: number }> = {
  party: { xz: 1, flare: 1, y: 0.22, lift: 0.07 },
  ball: { xz: 0.8, flare: 0, y: 0.343, lift: 0.25 },
  tutu: { xz: 0.88, flare: 0, y: 0.22, lift: 0.07 },
};

/**
 * The dress radius at 32 heights from y 0 to 0.9 (root space, feet at 0), for keeping the hair outside it. Each entry is
 * the widest row near that height, with the scallops, plus a margin; above the waist her arms and puff sleeves count
 * (0.2, as before). The ball gown starts at y 0.02, the others at the lowest row, so the hair hangs outside a gown.
 */
export function skirtTable(shape: DressShape, rows: readonly { r: number; y: number; wave?: number }[]): Float32Array {
  const t = new Float32Array(SKIRT_N);
  const lowest = shape === 'ball' ? 0.02 : Math.min(...rows.filter((r) => r.r > 0.05).map((r) => r.y)) - 0.05;
  for (let i = 0; i < SKIRT_N; i++) {
    const y = (i / (SKIRT_N - 1)) * SKIRT_TOP;
    if (y < lowest) continue;
    let r = 0;
    for (let k = 0; k < rows.length - 1; k++) {
      const a = rows[k];
      const b = rows[k + 1];
      // The widest point of the surface between two rows within 4 cm of this height.
      if (Math.min(a.y, b.y) - 0.04 <= y && Math.max(a.y, b.y) + 0.04 >= y) {
        r = Math.max(r, a.r * (1 + (a.wave ?? 0) / 2), b.r * (1 + (b.wave ?? 0) / 2));
      }
    }
    t[i] = Math.max(r + 0.03, y > 0.58 ? 0.2 : 0);
  }
  return t;
}
export const SKIRT_N = 32;
export const SKIRT_TOP = 0.9;

/** The radius of a skirt table at height y (0 outside it). */
export function skirtAt(t: Float32Array, y: number): number {
  if (y < 0 || y > SKIRT_TOP) return 0;
  const f = (y / SKIRT_TOP) * (SKIRT_N - 1);
  const i = Math.min(SKIRT_N - 2, Math.floor(f));
  const a = t[i];
  const b = t[i + 1];
  // Never interpolate into an empty entry: the skirt ends there.
  if (!a || !b) return f - i < 0.5 ? a : b;
  return a + (b - a) * (f - i);
}

// --- hair things --------------------------------------------------------------------------------------------------

/** The colours a hair thing is drawn with: her ribbon colour and a light tint of it (knots, lower butterfly wings). */
export interface ThingColours {
  ribbon: THREE.Color;
  ribbonLight: THREE.Color;
}

const C = {
  white: col('#ffffff'),
  snout: col('#fff4fa'),
  gold: col('#ffc93a'),
  lash: col('#4a2a35'),
  cheek: col('#ff9ccc'),
  centre: col('#ffd23f'),
  leaf: col('#6cc070'),
  rose: col('#ff6fa8'),
  roseDeep: col('#e94f8e'),
};

/** The star clips' three stars: size, place along the arc (x towards her face) and turn. */
const STARS = [
  { size: 0.1, x: -0.005, y: 0, roll: 0 },
  { size: 0.08, x: 0.06, y: 0.055, roll: 0.35 },
  { size: 0.07, x: -0.06, y: 0.045, roll: -0.3 },
] as const;
/** The fairy wings' feathers, from the top one down: half-lengths in metres. */
const FEATHERS = [0.25, 0.27, 0.23, 0.17] as const;

/** Which side a thing leans to for the tilt reaction (+1 her left, x > 0): the unicorn clip sits on her left. */
export const THING_SIDE: Record<HairThing, 1 | -1> = { bows: 1, unicorn: 1, flowers: 1, stars: 1, butterflies: 1, hearts: 1 };

const _m = new Xf();
const _s = new Xf();

/**
 * Two ribbon tails hanging from under a hair thing, swaying a little (today's bow streamers). `at` is the thing's
 * anchor frame; `drop` lowers the tails below a bigger thing.
 */
function tails(L: PartList, at: Xf, sg: number, t: number, c: ThingColours, drop = 0): void {
  for (const lx of [-1, 1]) {
    const sway = Math.sin(t * 2.6 + lx + sg) * 0.06;
    _m.from(at).at(lx * 0.03, -0.012 - drop, -0.004).roll(lx * 0.32 + sway).at(0, -0.075, 0).size(0.024, 0.078, 0.014);
    L.push(B.Lo, _m, c.ribbon, 0.35);
  }
}

/** A ribbon bow at `at`, `k` times today's size: two loops (`loops`: Lo for the small ones) and a light knot. */
export function bow(L: PartList, at: Xf, k: number, c: ThingColours, loops: BatchId = B.Mid): void {
  for (const lx of [-1, 1]) {
    _m.from(at).at(lx * 0.075 * k, 0.018 * k, 0).roll(lx * 0.4).size(0.084 * k, 0.054 * k, 0.036 * k);
    L.push(loops, _m, c.ribbon, 0.35);
  }
  _m.from(at).at(0, 0, 0.016 * k).size(0.038 * k, 0.036 * k, 0.03 * k);
  L.push(B.Lo, _m, c.ribbonLight, 0.4);
}

/**
 * One side's hair thing at its anchor (onHead(±0.8, 0.45), facing out and a little forward). `sg` is the side (+1 her
 * left), `t` the time and `flutter` the butterflies' wing phase (they flap faster while she moves).
 */
export function drawThing(L: PartList, thing: HairThing, at: Xf, sg: number, t: number, flutter: number, c: ThingColours): void {
  // Forward (towards her face) along the anchor's x axis.
  const f = -sg;
  switch (thing) {
    case 'bows':
      bow(L, at, 1, c);
      tails(L, at, sg, t, c);
      return;
    case 'unicorn':
      if (sg > 0) unicornClip(L, at, f, c);
      else bow(L, at, 0.6, c);
      tails(L, at, sg, t, c, sg > 0 ? 0.04 : 0);
      return;
    case 'flowers':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        _m.from(at).at(Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0.012).roll(a - Math.PI / 2).size(0.034, 0.044, 0.014);
        L.push(B.Lo, _m, c.ribbon, 0.35);
      }
      _m.from(at).at(0, 0, 0.024).size(0.026, 0.026, 0.018);
      L.push(B.Lo, _m, C.centre, 0.5);
      for (const lx of [-1, 1]) {
        _m.from(at).at(lx * 0.05, -0.05, -0.002).roll(lx * 2.4).size(0.022, 0.05, 0.008);
        L.push(B.Cone, _m, C.leaf, 0.2);
      }
      tails(L, at, sg, t, c, 0.035);
      return;
    case 'stars': {
      // Three stars in an arc (0.10, 0.08 and 0.07 m), twinkling.
      for (let i = 0; i < 3; i++) {
        const st = STARS[i];
        const tw = 1 + 0.08 * Math.sin(t * Math.PI * 4 + i * 2.1 + sg);
        const r = (st.size / 2) * tw;
        _s.from(at).at(st.x * f, st.y, 0.01 + i * 0.002).roll(st.roll * f);
        for (let k = 0; k < 5; k++) {
          _m.from(_s).roll((k / 5) * Math.PI * 2).size(r * 0.34, r, 0.012);
          L.push(B.Cone, _m, C.gold, 0.7);
        }
        _m.from(_s).at(0, 0, 0.004).size(r * 0.4, r * 0.4, 0.014);
        L.push(B.Lo, _m, C.gold, 0.7);
      }
      tails(L, at, sg, t, c, 0.03);
      return;
    }
    case 'butterflies': {
      // Big upper wings rising out, small lower wings, a thin body and two feelers: an X, so it never reads as a bow.
      const flap = Math.sin(flutter + sg) * 0.45;
      for (const lx of [-1, 1]) {
        const w = _s.from(at).at(0, 0, 0.012).turn(lx * flap * 0.9);
        _m.from(w).at(lx * 0.042, 0.026, 0).roll(lx * 0.5).size(0.05, 0.034, 0.008);
        L.push(B.Mid, _m, c.ribbon, 0.4);
        _m.from(w).at(lx * 0.03, -0.024, 0.001).roll(lx * -0.55).size(0.03, 0.022, 0.008);
        L.push(B.Lo, _m, c.ribbonLight, 0.4);
      }
      _m.from(at).at(0, -0.032, 0.016).size(0.007, 0.064, 0.007);
      L.push(B.Limb, _m, C.lash, 0);
      for (const lx of [-1, 1]) {
        _m.from(at).at(0, 0.03, 0.017).roll(lx * -0.45).size(0.003, 0.034, 0.003);
        L.push(B.Limb, _m, C.lash, 0);
      }
      tails(L, at, sg, t, c, 0.04);
      return;
    }
    case 'hearts':
      for (const lx of [-1, 1]) {
        _m.from(at).at(lx * 0.035, 0.018, 0.012).size(0.04, 0.04, 0.022);
        L.push(B.Lo, _m, c.ribbon, 0.4);
      }
      _m.from(at).at(0, 0.008, 0.012).roll(Math.PI).size(0.066, 0.075, 0.022);
      L.push(B.Cone, _m, c.ribbon, 0.4);
      tails(L, at, sg, t, c, 0.06);
      return;
  }
}

/**
 * The unicorn clip: a white unicorn head in profile looking forward, a gold horn up and forward, ears, a mane in her
 * ribbon colour, a closed happy eye and a pink cheek. About 0.17 m with the horn, so it reads as her unicorn button.
 */
function unicornClip(L: PartList, at: Xf, f: number, c: ThingColours): void {
  const h = _s.from(at).at(0, 0.0, 0.012);
  // Mane puffs behind the head, then the ears, so the head covers their roots.
  for (let i = 0; i < 3; i++) {
    _m.from(h).at(-f * (0.044 + i * 0.004), 0.034 - i * 0.03, -0.004).size(0.026, 0.024, 0.02);
    L.push(B.Lo, _m, c.ribbon, 0.35);
  }
  for (const k of [0, 1]) {
    _m.from(h).at(-f * (0.012 + k * 0.022), 0.04, -0.002 - k * 0.004).roll(f * (0.15 + k * 0.3)).size(0.018, 0.042, 0.012);
    L.push(B.Cone, _m, C.white, 0.5);
  }
  _m.from(h).size(0.052, 0.048, 0.03);
  L.push(B.Mid, _m, C.white, 0.5);
  _m.from(h).at(f * 0.048, -0.02, 0.006).roll(f * 0.25).size(0.036, 0.027, 0.024);
  L.push(B.Lo, _m, C.snout, 0.4);
  _m.from(h).at(f * 0.022, 0.036, 0.004).roll(f * -0.55).size(0.011, 0.07, 0.011);
  L.push(B.Horn, _m, C.gold, 0.8);
  _m.from(h).at(f * 0.012, 0.004, 0.031).roll(Math.PI).size(0.013, 0.01, 1);
  L.push(B.Arc, _m, C.lash, 0);
  _m.from(h).at(f * 0.03, -0.018, 0.029).size(0.013, 0.01, 1);
  L.push(B.Soft, _m, C.cheek, 0.6);
}

/** The picnic rose: five pink petals cupped round each other and a leaf. `at` faces out. */
export function drawRose(L: PartList, at: Xf): void {
  _m.from(at).at(0.035, -0.035, -0.004).roll(-2.3).size(0.022, 0.05, 0.008);
  L.push(B.Cone, _m, C.leaf, 0.2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    _m.from(at).at(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.008).roll(a - Math.PI / 2).size(0.03, 0.034, 0.02);
    L.push(B.Lo, _m, C.rose, 0.45);
  }
  _m.from(at).at(0, 0, 0.022).size(0.024, 0.024, 0.018);
  L.push(B.Lo, _m, C.roseDeep, 0.5);
}

// --- the gown's extras ----------------------------------------------------------------------------------------------

/** A bow at the back of the sash (ball gowns): two loops, a knot and two tails, in `colour`. */
export function backBow(L: PartList, root: Xf, colour: THREE.Color, t: number): void {
  const at = _s.from(root).at(0, 0.628, -0.16).turn(Math.PI);
  for (const lx of [-1, 1]) {
    _m.from(at).at(lx * 0.07, 0.012, 0).roll(lx * 0.35).size(0.075, 0.05, 0.034);
    L.push(B.Mid, _m, colour, 0.35);
  }
  _m.from(at).at(0, 0, 0.018).size(0.036, 0.034, 0.028);
  L.push(B.Lo, _m, colour, 0.45);
  for (const lx of [-1, 1]) {
    const sway = Math.sin(t * 2.2 + lx) * 0.05;
    _m.from(at).at(lx * 0.028, -0.014, -0.004).roll(lx * 0.22 + sway).at(0, -0.1, 0).size(0.026, 0.1, 0.014);
    L.push(B.Lo, _m, colour, 0.35);
  }
}

/**
 * Fairy wings on her back: four feathers a side fanned 0.4 rad apart from up and out to just below level, rooted at
 * (±0.06, 0.74, -0.12). They reach about 0.5 m out on each side, so they show past her hair from the front. `flap` is
 * the flap angle; `fold` (0 to 1) folds them flat against her back (swimming).
 */
export function wings(L: PartList, root: Xf, flap: number, fold: number, white: THREE.Color, edge: THREE.Color): void {
  for (const sg of [-1, 1]) {
    const w = _s.from(root).at(sg * 0.06, 0.74, -0.12).turn(sg * ((0.15 + flap) * (1 - fold) + 1.2 * fold));
    for (let k = 0; k < 4; k++) {
      // Folded, they close up into a narrow fan along her back.
      const a = (0.5 + k * 0.4) * (1 - fold * 0.7);
      const len = FEATHERS[k];
      _m.from(w).roll(-sg * a).at(0, len * 0.96, -0.006 * k).size(0.07 - k * 0.006, len, 0.018);
      L.push(B.Mid, _m, k === 0 || k === 3 ? edge : white, 0.6);
    }
  }
}
