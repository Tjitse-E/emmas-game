// A unicorn's body plan and its drawing: every part is an instance of a shared shape, placed from the pose on the CPU.
// Babies and foals share the plan with their own proportions; breeds add their own touches (a fluffy chest, snowy
// socks and sparkles, extra curls).
import * as THREE from 'three';
import type { Breed, Stage, UnicornLook } from '../contracts';
import { B, PartList, Xf, col, mix } from './parts';

export interface Build {
  legLen: number;
  legR: number;
  hoofH: number;
  hoofR: number;
  legX: number;
  legZ: number;
  bodyY: number;
  body: [number, number, number];
  chest: [number, number, number, number, number, number];
  neckAt: [number, number];
  headAt: [number, number];
  headR: number;
  /** Metres walked per leg cycle. */
  stride: number;
  /** Raised straw bed in a stall so the head shows over the 0.9 m half door. */
  bed: number;
  /** Generous tap radius (at least 64 px at the game camera). */
  hit: number;
}

/** A build with every length times k (2.4.0's grown stub: the foal times 1.4, until the mount lane draws its own). */
function scaled(b: Build, k: number): Build {
  const m = (xs: readonly number[]) => xs.map((x) => x * k);
  return {
    legLen: b.legLen * k, legR: b.legR * k, hoofH: b.hoofH * k, hoofR: b.hoofR * k, legX: b.legX * k, legZ: b.legZ * k,
    bodyY: b.bodyY * k, body: m(b.body) as Build['body'], chest: m(b.chest) as Build['chest'],
    neckAt: m(b.neckAt) as Build['neckAt'], headAt: m(b.headAt) as Build['headAt'], headR: b.headR * k,
    stride: b.stride * k, bed: b.bed * k, hit: b.hit * k,
  };
}

const FOAL: Build = {
  legLen: 0.25, legR: 0.055, hoofH: 0.066, hoofR: 0.062, legX: 0.095, legZ: 0.15,
  bodyY: 0.44, body: [0.2, 0.175, 0.275],
  chest: [0, 0.52, 0.16, 0.14, 0.155, 0.13],
  neckAt: [0.56, 0.19], headAt: [0.18, 0.07], headR: 0.19,
  stride: 0.52, bed: 0.3, hit: 0.66,
};

export const BUILDS: Record<Stage, Build> = {
  baby: {
    legLen: 0.13, legR: 0.05, hoofH: 0.062, hoofR: 0.057, legX: 0.085, legZ: 0.115,
    bodyY: 0.3, body: [0.17, 0.155, 0.215],
    chest: [0, 0.37, 0.12, 0.125, 0.14, 0.12],
    neckAt: [0.4, 0.14], headAt: [0.15, 0.06], headR: 0.18,
    stride: 0.38, bed: 0.46, hit: 0.56,
  },
  foal: FOAL,
  // The mounts (2.4.0): a stub the mount lane replaces with its own build and saddle.
  grown: scaled(FOAL, 1.4),
};

export type Eyes = 'open' | 'blink' | 'happy' | 'sleepy' | 'closed';
export type Mouth = 'smile' | 'open' | 'chew' | 'grin';

/** Everything the drawing needs, set by the behaviour each frame. */
export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Extra height (hop, carried, straw bed) and depth (swimming). */
  lift: number;
  pitch: number;
  roll: number;
  squash: number;
  phase: number;
  /** 0 standing, 1 legs folded under (sitting, lying in the stall, hatching). */
  tuck: number;
  /** How much the legs swing (0 standing, 1 walking, more for a gallop). */
  swing: number;
  /** Legs hang down (carried) or paddle (swimming). */
  dangle: number;
  paddle: number;
  /** Climbing the ladder: legs reach alternately. */
  climb: number;
  neckPitch: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  tailYaw: number;
  tailLift: number;
  earL: number;
  earR: number;
  eyes: Eyes;
  mouth: Mouth;
  chew: number;
  nightcap: boolean;
  bed: number;
  /** 0..1 in water: the shadow becomes fainter and moves to the surface. */
  wet: number;
  shadowY: number;
  t: number;
}

export function restPose(): Pose {
  return {
    x: 0, y: 0, z: 0, yaw: 0, lift: 0, pitch: 0, roll: 0, squash: 1, phase: 0, tuck: 0, swing: 0, dangle: 0, paddle: 0,
    climb: 0, neckPitch: 0, headYaw: 0, headPitch: 0, headRoll: 0, tailYaw: 0, tailLift: 0, earL: 0, earR: 0,
    eyes: 'open', mouth: 'smile', chew: 0, nightcap: false, bed: 0, wet: 0, shadowY: 0, t: 0,
  };
}

/** The colours of one unicorn, worked out once from its look. */
export interface Coat {
  body: THREE.Color;
  belly: THREE.Color;
  muzzle: THREE.Color;
  mane: THREE.Color;
  mane2: THREE.Color;
  horn: THREE.Color;
  hoof: THREE.Color;
  sheen: number;
  breed: Breed;
}

const WHITE = col('#ffffff');
const IRIS = col('#7a4fc4');
/** Far away the iris is a plain disc: the colour of its middle. */
const IRIS_FAR = col('#4a2f86');
const LASH = col('#4b2c48');
const CHEEK = col('#ff8fb5');
const MOUTH = col('#c94f78');
const INNER_EAR = col('#ffb0c8');
const SHADOW = col('#2e4a2b');
const SHADOW_WATER = col('#1b4964');
const CAP = col('#8fb8ff');
const CAP_BAND = col('#ffffff');
const STRAW = col('#f4d27a');

export function coatOf(look: UnicornLook): Coat {
  return {
    body: col(look.body),
    belly: mix(look.body, '#ffffff', 0.3),
    muzzle: mix(look.body, '#ffd6e4', 0.45),
    mane: col(look.mane),
    mane2: col(look.mane2),
    horn: col(look.horn ?? '#ffc94a'),
    hoof: col('#f2b93c'),
    sheen: look.shiny ? 1 : 0.12,
    breed: look.breed,
  };
}

const m = new Xf();
const root = new Xf();
const body = new Xf();
const neck = new Xf();
const head = new Xf();
const k = new Xf();

/** The head's matrix for a pose (also used for headTop without drawing). */
export function headMatrix(p: Pose, b: Build, out: Xf): Xf {
  bodyMatrix(p, b, body);
  return out
    .from(body)
    .at(0, b.neckAt[0] - b.bodyY, b.neckAt[1])
    .tilt(p.neckPitch)
    .turn(p.headYaw * 0.4)
    .at(0, b.headAt[0], b.headAt[1])
    .turn(p.headYaw * 0.6)
    .tilt(p.headPitch)
    .roll(p.headRoll);
}

function bodyMatrix(p: Pose, b: Build, out: Xf): Xf {
  const sink = p.tuck * (b.legLen + b.hoofH * 0.4);
  root.identity().at(p.x, p.y + p.lift, p.z).turn(p.yaw);
  return out.from(root).at(0, b.bodyY - sink, 0).tilt(p.pitch).roll(p.roll).size(1, p.squash, 1 / Math.sqrt(p.squash));
}

/**
 * Write the unicorn's parts. `full` is the near detail; the far, cheap version uses rounder-but-coarser spheres and
 * leaves out details too small to see (nostrils, lash flicks, inner ears, the smallest curls).
 */
export function drawUnicorn(L: PartList, p: Pose, b: Build, c: Coat, full: boolean): void {
  L.clear();
  const H = full ? B.Hi : B.Mid;
  const M = full ? B.Mid : B.Lo;
  const R = b.headR;
  const s = R / 0.18;
  const [bx, by, bz] = b.body;
  bodyMatrix(p, b, body);

  // Blob shadow: on the grass, on the slide, or fainter on the water. Smaller and fainter when lifted.
  const up = Math.max(0, p.y + p.lift - p.shadowY);
  m.identity().at(p.x, p.shadowY + 0.012, p.z).turn(p.yaw).tilt(-Math.PI / 2).size((bx + 0.12) / (1 + up), (bz + 0.14) / (1 + up), 1);
  L.push(B.Soft, m, p.wet > 0.5 ? SHADOW_WATER : SHADOW, (p.wet > 0.5 ? 0.17 : 0.3) / (1 + up * 1.5));

  if (p.bed > 0.01) {
    m.identity().at(p.x, p.y + p.lift - p.bed, p.z).turn(p.yaw).size(bx + 0.2, p.bed + 0.02, bz + 0.16);
    L.push(B.Straw, m, STRAW, 0);
  }

  // Body and chest.
  m.from(body).size(bx, by, bz);
  L.push(H, m, c.body, c.sheen);
  const [cx, cy, cz, crx, cry, crz] = b.chest;
  m.from(body).at(cx, cy - b.bodyY, cz).size(crx, cry, crz);
  L.push(M, m, c.body, c.sheen);

  // Short legs with golden hooves. Diagonal pairs move together; folded under when sitting.
  const hipY = b.bodyY - by * 0.45;
  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const sx = i % 2 ? 1 : -1;
    const diag = (i === 0 || i === 3 ? 0 : Math.PI) + (front ? 0 : 0.25);
    let swing = Math.sin(p.phase + diag) * 0.6 * p.swing;
    swing += p.dangle * (Math.sin(p.t * 3 + i * 1.7) * 0.18 + (front ? -0.3 : 0.3));
    swing += p.paddle * Math.sin(p.t * 9 + i * 1.6) * 0.6;
    swing += p.climb * (Math.sin(p.phase + (front ? 0 : Math.PI) + (sx > 0 ? Math.PI / 2 : 0)) * 0.5 + (front ? -0.6 : 0.3));
    const fold = p.tuck * (front ? -1.4 : 1.4);
    const hip = k.from(body).at(sx * b.legX, -by * 0.45, front ? b.legZ : -b.legZ).tilt(swing + fold);
    const len = hipY - b.hoofH + 0.02;
    m.from(hip).at(0, -hipY + b.hoofH - 0.02, 0).size(b.legR, len, b.legR);
    L.push(B.Limb, m, c.body, c.sheen);
    m.from(hip).at(0, -hipY, 0).size(b.hoofR, b.hoofH, b.hoofR);
    L.push(B.Limb, m, c.hoof, 0.7);
    if (c.breed === 'snow') {
      m.from(hip).at(0, -hipY + b.hoofH + 0.012, 0).size(b.legR * 1.45, b.hoofH * 0.75, b.legR * 1.45);
      L.push(B.Lo, m, WHITE, 0.3);
    }
  }
  if (c.breed === 'nestling' && full) {
    // A soft fluffy collar under the chin.
    for (let i = 0; i < 3; i++) {
      m.from(body).at((i - 1) * crx * 0.42, cy - b.bodyY + cry * 0.3 - (i % 2) * 0.02, cz + crz * 0.78).size(crx * 0.36, cry * 0.3, crz * 0.3);
      L.push(B.Lo, m, c.belly, 0.3);
    }
  }

  // Tail: a curly chain of puffs that swishes.
  const tail = k.from(body).at(0, by * 0.4, -bz * 0.9).turn(p.tailYaw).tilt(-0.5 - p.tailLift);
  const curl = c.breed === 'berry' ? 1.15 : 1;
  const tailPuffs: [number, number, number, number][] = [
    [0, 0.02, -0.03, 0.065],
    [0, -0.01, -0.11, 0.08],
    [0.01, -0.09, -0.16, 0.075],
    [0, -0.17, -0.13, 0.06],
  ];
  tailPuffs.forEach(([x, y, z, r], i) => {
    if (!full && (i === 0 || i === 3)) return;
    const sway = Math.sin(p.t * 2.2 + i * 0.7) * 0.02 * i;
    m.from(tail).at((x + sway) * s, y * s, z * s).size(r * s * curl, r * s * curl * (c.breed === 'snow' ? 1.25 : 1), r * s * curl);
    L.push(B.Lo, m, i % 2 ? c.mane2 : c.mane, 0.25);
  });

  // Neck and head.
  neck.from(body).at(0, b.neckAt[0] - b.bodyY, b.neckAt[1]).tilt(p.neckPitch).turn(p.headYaw * 0.4);
  headMatrix(p, b, head);
  m.from(head).size(R * 1.02, R * 0.97, R);
  L.push(H, m, c.body, c.sheen);
  // Muzzle, chewing when munching.
  const chew = 1 + Math.sin(p.chew) * 0.12 * (p.mouth === 'chew' ? 1 : 0);
  m.from(head).at(0, -0.4 * R, 0.66 * R).size(0.6 * R, 0.44 * R * chew, 0.52 * R);
  L.push(M, m, c.muzzle, c.sheen);
  if (full) {
    for (const sx of [-1, 1]) {
      m.from(head).at(sx * 0.19 * R, -0.33 * R, 1.165 * R).turn(sx * 0.4).tilt(-0.2).size(0.045 * R, 0.032 * R, 1);
      L.push(B.Dot, m, MOUTH, 0);
    }
  }
  // The mouth (too small to see far away): a smile, or open when giggling, yawning or sliding.
  if (full && (p.mouth === 'open' || p.mouth === 'grin')) {
    const big = p.mouth === 'open' ? 1 : 0.75;
    m.from(head).at(0, -0.56 * R, 1.08 * R).tilt(-0.55).size(0.17 * R * big, 0.15 * R * big, 1);
    L.push(B.Dot, m, MOUTH, 0);
  } else if (full) {
    m.from(head).at(0, -0.56 * R, 1.06 * R).tilt(-0.65).roll(Math.PI).size(0.15 * R, 0.09 * R, 1);
    L.push(B.Arc, m, LASH, 0);
  }

  // Eyes: big, with two highlights and lashes. Closed eyes are a curved line (happy ^ or sleepy ∪).
  for (const sx of [-1, 1]) {
    const eye = k.from(head).onSphere(R, sx * 0.43, 0.1, -0.02 * R);
    const eyes = p.eyes;
    if (eyes === 'happy') {
      m.from(eye).at(0, -0.02 * R, 0.06 * R).size(0.24 * R, 0.2 * R, 1);
      L.push(B.Arc, m, LASH, 0);
    } else if (eyes === 'blink' || eyes === 'closed') {
      m.from(eye).at(0, 0, 0.06 * R).roll(Math.PI).size(0.24 * R, 0.13 * R, 1);
      L.push(B.Arc, m, LASH, 0);
    } else {
      const open = eyes === 'sleepy' ? 0.55 : 1;
      const lid = (1 - open) * 0.14 * R;
      // Far away the white is too small to see: the dark iris with its highlight reads as the eye.
      if (full) {
        m.from(eye).at(0, -lid, 0).size(0.29 * R, 0.36 * R * open, 0.065 * R);
        L.push(B.Mid, m, WHITE, 0);
      }
      m.from(eye).at(0, -0.02 * R - lid, 0.066 * R).size(0.24 * R, 0.3 * R * open, 1);
      L.push(full ? B.Iris : B.Dot, m, full ? IRIS : IRIS_FAR, 0);
      m.from(eye).at(-0.085 * R, 0.1 * R * open - lid, 0.07 * R).size(0.085 * R, 0.095 * R * open, 1);
      L.push(B.Dot, m, WHITE, 0);
      if (full) {
        m.from(eye).at(0.075 * R, -0.13 * R * open - lid, 0.07 * R).size(0.038 * R);
        L.push(B.Dot, m, WHITE, 0);
      }
      // Lash line along the top of the eye (lower for sleepy eyes), and two flicks at the outer corner.
      m.from(eye).at(0, -0.02 * R - lid * 1.6, 0.068 * R).size(0.285 * R, 0.33 * R * open, 1);
      L.push(B.Arc, m, LASH, 0);
      if (full) {
        m.from(eye).at(sx * 0.3 * R, 0.13 * R * open - lid, 0.06 * R).roll(sx * -0.7).size(0.1 * R, 0.032 * R, 1);
        L.push(B.Dot, m, LASH, 0);
        m.from(eye).at(sx * 0.24 * R, 0.25 * R * open - lid, 0.06 * R).roll(sx * -0.3).size(0.085 * R, 0.028 * R, 1);
        L.push(B.Dot, m, LASH, 0);
      }
    }
    if (full) {
      m.from(head).onSphere(R, sx * 0.64, -0.28, 0.01 * R).size(0.19 * R, 0.14 * R, 1);
      L.push(B.Soft, m, CHEEK, 0.65);
    }
  }

  // Ears, flicking now and then.
  for (const sx of [-1, 1]) {
    const flick = sx < 0 ? p.earL : p.earR;
    const ear = k.from(head).at(sx * 0.48 * R, 0.74 * R, -0.12 * R).roll(sx * -(0.42 + flick)).tilt(-0.15);
    m.from(ear).size(0.24 * R, 0.52 * R, 0.14 * R);
    L.push(B.Cone, m, c.body, c.sheen);
    if (full) {
      m.from(ear).at(0, 0.22 * R, 0.1 * R).tilt(-0.1).size(0.11 * R, 0.2 * R, 1);
      L.push(B.Dot, m, INNER_EAR, 0);
    }
  }

  // The golden spiral horn, or a sleepy nightcap over it, drooping to the side (so it stays low under a balcony).
  if (p.nightcap) {
    const cap = k.from(head).at(0.08 * R, 0.58 * R, -0.05 * R).roll(-0.62);
    m.from(cap).size(0.62 * R, 1.25 * R, 0.62 * R);
    L.push(B.Cone, m, CAP, 0.1);
    m.from(cap).at(0, 0.05 * R, 0).size(0.66 * R, 0.16 * R, 0.66 * R);
    L.push(M, m, CAP_BAND, 0.1);
    m.from(cap).at(0, 1.25 * R, 0).size(0.16 * R);
    L.push(B.Lo, m, CAP_BAND, 0.1);
  } else {
    m.from(head).at(0, 0.8 * R, 0.33 * R).tilt(0.38).size(0.15 * R, 0.8 * R, 0.15 * R);
    L.push(B.Horn, m, c.horn, 0.8);
  }

  // Mane: a big forelock with a curl over the brow, curls framing one side of the face, down the back of the head
  // and along the neck on that side.
  const big = c.breed === 'berry' ? 1.12 : 1;
  const long = c.breed === 'snow' ? 1.3 : 1;
  const headPuffs: [number, number, number, number][] = [
    [-0.25, 0.8, 0.47, 0.31],
    [0.24, 0.83, 0.41, 0.28],
    [-0.54, 0.48, 0.6, 0.23],
    [0.03, 0.88, -0.18, 0.3],
    [-0.72, 0.28, -0.22, 0.25],
    [-0.62, -0.12, -0.42, 0.23],
    [0.1, 0.56, -0.62, 0.31],
  ];
  if (c.breed === 'berry') headPuffs.push([-0.4, 0.66, -0.4, 0.27]);
  headPuffs.forEach(([x, y, z, r], i) => {
    if (!full && i !== 0 && i !== 1 && i !== 6) return;
    m.from(head).at(x * R, y * R, z * R).size(r * R * big, r * R * big * (i > 2 ? long : 1), r * R * big);
    // The forelock is what the eye meets first: it gets the rounder shape.
    L.push(i < 3 ? M : B.Lo, m, i % 2 ? c.mane2 : c.mane, 0.25);
  });
  const neckPuffs: [number, number, number, number][] = [
    [-0.04, 0.13, -0.08, 0.08],
    [-0.06, 0.03, -0.1, 0.078],
    [-0.04, -0.07, -0.09, 0.068],
  ];
  if (c.breed === 'berry') neckPuffs.push([-0.08, 0.08, -0.03, 0.062]);
  if (full) neckPuffs.forEach(([x, y, z, r], i) => {
    m.from(neck).at(x * s, y * s, z * s).size(r * s * big, r * s * big * long, r * s * big);
    L.push(B.Lo, m, i % 2 ? c.mane : c.mane2, 0.25);
  });

  // Snow unicorns twinkle with a few tiny sparkles in the mane.
  if (c.breed === 'snow' && full) {
    for (let i = 0; i < 3; i++) {
      const tw = 0.5 + 0.5 * Math.sin(p.t * 3 + i * 2.1);
      m.from(head).at((i - 1) * 0.35 * R, (0.95 + (i % 2) * 0.22) * R, (-0.25 - i * 0.12) * R).size(0.06 * R * tw);
      L.push(B.Dot, m, WHITE, 0);
    }
  }
}
