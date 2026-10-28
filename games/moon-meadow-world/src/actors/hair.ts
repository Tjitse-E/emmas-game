// Princess Emma's hair (docs/v4/2.3.md section 15): the eighteen colours and the twelve styles. The cap, the fringe
// and the side locks are drawn by the princess in these colours; this file owns the hanging hair: the verlet chains,
// the tubes (one HairTubes for two tails, built once), the plait lobes and the buns. A colour change repaints, a style
// change builds new chains. No style puts anything above head-space y 0.18 inside the crown ring (no top buns).
import * as THREE from 'three';
import type { HairColour, HairStyle } from '../contracts';
import { HAIR_HEX } from '../wardrobe';
import { B, type PartList, Xf, col } from './parts';
import { HairTubes, Ponytail, chainPoint } from './ponytail';
import { bow, type ThingColours } from './looks3d';

type V3 = readonly [number, number, number];

interface Style {
  /** Chains, mirrored on x for the second one (one chain uses x as given). `tie` and `flare` are pinned, in head space. */
  chains: number;
  links: number;
  seg: number;
  tie: V3;
  flare: V3;
  /** How the chains are drawn: tubes, plait lobes, or not at all (a bun with no tails). */
  draw: 'tubes' | 'plait' | 'none';
  /** Tube radius below the tie and at the tip, and the bulges along it. */
  peak: number;
  tip: number;
  bulge: number;
  waves: number;
  /** A bun at this point of the head (Fine), with twists round its base or not. */
  bun?: { at: V3; r: number; twists: boolean };
  /** The crown sits this much further forward, clear of a high tie. */
  crownForward?: number;
}

/** With one high ponytail the crown sits this much further forward, clear of the tie. */
const HIGH_FORWARD = 0.015;

/**
 * 2.2's four styles, six that are only data and two with a little code (2.3 section 15). Their outlines differ, as
 * ponytail variants look alike from the follow camera: two tails high, one tail high, two plaits, a bun with
 * ringlets, two tails at the nape, one tail at her left, two ringlet tails, two short flared bunches, two long straight
 * tails, one high ponytail of ringlets, one plait down the back, a bun at the nape.
 */
export const STYLES: Record<HairStyle, Style> = {
  ponytails: { chains: 2, links: 8, seg: 0.145, tie: [0.21, 0.11, -0.085], flare: [0.27, 0.0, -0.13], draw: 'tubes', peak: 0.085, tip: 0.025, bulge: 0.13, waves: 5 },
  high: { chains: 1, links: 9, seg: 0.13, tie: [0, 0.1, -0.26], flare: [0, 0.03, -0.34], draw: 'tubes', peak: 0.1, tip: 0.03, bulge: 0.13, waves: 5, crownForward: HIGH_FORWARD },
  plaits: { chains: 2, links: 6, seg: 0.12, tie: [0.2, -0.02, -0.1], flare: [0.24, -0.12, -0.14], draw: 'plait', peak: 0.075, tip: 0.05, bulge: 0, waves: 0 },
  bun: {
    chains: 2, links: 4, seg: 0.07, tie: [0.22, -0.06, 0.02], flare: [0.245, -0.12, 0.012], draw: 'tubes', peak: 0.03, tip: 0.018, bulge: 0.38, waves: 8,
    bun: { at: [0, 0.04, -0.26], r: 0.12, twists: true },
  },
  low: { chains: 2, links: 6, seg: 0.14, tie: [0.13, -0.13, -0.19], flare: [0.17, -0.21, -0.22], draw: 'tubes', peak: 0.075, tip: 0.025, bulge: 0.1, waves: 5 },
  side: { chains: 1, links: 8, seg: 0.14, tie: [0.25, -0.02, -0.1], flare: [0.33, -0.1, -0.12], draw: 'tubes', peak: 0.095, tip: 0.03, bulge: 0.13, waves: 5 },
  curly: { chains: 2, links: 7, seg: 0.14, tie: [0.22, 0.13, -0.07], flare: [0.3, 0.05, -0.11], draw: 'tubes', peak: 0.075, tip: 0.035, bulge: 0.34, waves: 9 },
  bunches: { chains: 2, links: 5, seg: 0.125, tie: [0.23, 0.05, -0.06], flare: [0.34, -0.02, -0.07], draw: 'tubes', peak: 0.095, tip: 0.055, bulge: 0.16, waves: 3 },
  // Tied low behind the ears, wide apart, and straight: low's wavy pigtails meet at the nape.
  long: { chains: 2, links: 5, seg: 0.12, tie: [0.21, -0.08, -0.12], flare: [0.28, -0.16, -0.15], draw: 'tubes', peak: 0.068, tip: 0.042, bulge: 0, waves: 0 },
  curls: { chains: 1, links: 9, seg: 0.13, tie: [0, 0.1, -0.26], flare: [0, 0.03, -0.34], draw: 'tubes', peak: 0.09, tip: 0.035, bulge: 0.34, waves: 9, crownForward: HIGH_FORWARD },
  plait: { chains: 1, links: 4, seg: 0.12, tie: [0, -0.05, -0.25], flare: [0, -0.14, -0.29], draw: 'plait', peak: 0.08, tip: 0.05, bulge: 0, waves: 0 },
  lowbun: { chains: 0, links: 0, seg: 0.1, tie: [0, 0, 0], flare: [0, 0, 0], draw: 'none', peak: 0.052, tip: 0, bulge: 0, waves: 0, bun: { at: [0, -0.1, -0.235], r: 0.115, twists: false } },
};

/** How much thicker than the first build's 0.052 m tubes a style's hair is: the chain keeps this much further out. */
export function hairExtra(style: HairStyle): number {
  return Math.max(0, STYLES[style].peak - 0.052);
}

/** How far forward the crown sits for a style. */
export function crownForward(style: HairStyle): number {
  return STYLES[style].crownForward ?? 0;
}

/** Lobes per plait. */
const LOBES = 9;
/** Twists round a bun's base. */
const TWISTS = 7;

export class Hair {
  readonly tubes: HairTubes;
  style: HairStyle = 'ponytails';
  colour: HairColour = 'sunny';
  chains: Ponytail[] = [];
  /** The cap and the side locks, its light tint (bands, twists, plait lobes) and the four fringe puffs. */
  readonly base = col(HAIR_HEX.sunny.base);
  readonly light = col(HAIR_HEX.sunny.light);
  readonly fringe = [0, 1, 2, 3].map(() => col(HAIR_HEX.sunny.base));
  readonly locks = [0, 1].map(() => col(HAIR_HEX.sunny.base));
  /** Rainbow hair's six colours (null for the others). */
  private bands: THREE.Color[] | null = null;
  private readonly rainbow = (HAIR_HEX.rainbow.bands ?? []).map((h) => col(h));
  private radius: (t: number) => number = () => 0;
  private def: Style = STYLES.ponytails;

  constructor(material: THREE.Material) {
    this.tubes = new HairTubes(2, material, this.base, this.light, 24, 12);
    this.setStyle('ponytails');
  }

  /** Whether this style hangs as tubes (for the tests and the sparkles). */
  get tubed(): boolean {
    return this.def.draw === 'tubes';
  }

  /** Repaint everything in a hair colour (no geometry is built). */
  setColour(id: HairColour): void {
    this.colour = id;
    const h = HAIR_HEX[id];
    this.base.set(h.base);
    this.light.set(h.light);
    this.bands = h.bands ? this.rainbow : null;
    this.fringe.forEach((c, i) => c.set(h.fringe?.[i] ?? h.base));
    // Rainbow: both side locks take the pink the tubes start with.
    this.locks.forEach((c) => c.set(h.bands ? h.bands[0] : h.base));
    this.paintTubes();
  }

  /** New chains for a style (they start hanging from the new ties), and the tubes it draws. */
  setStyle(id: HairStyle): void {
    this.style = id;
    const s = (this.def = STYLES[id]);
    this.chains = Array.from({ length: s.chains }, () => new Ponytail(s.links, s.seg));
    const { peak, tip } = s;
    this.radius = (t) => (t < 0.1 ? peak * (0.6 + 4 * t) : (peak - tip) * Math.pow(1 - (t - 0.1) / 0.9, 0.6) + tip);
    this.tubes.show(s.draw === 'tubes' ? s.chains : 0);
    this.paintTubes();
  }

  private paintTubes(): void {
    for (let k = 0; k < 2; k++) this.tubes.recolour(k, this.base, this.light, this.bands, this.def.waves || 5);
  }

  /** Forget the old positions (after a jump cut). */
  reset(): void {
    for (const c of this.chains) c.reset();
  }

  /**
   * Step the chains from their ties on the head (world matrix) and rebuild the tubes. `collide` keeps a point out of
   * her head and dress.
   */
  update(dt: number, head: THREE.Matrix4, collide: (q: THREE.Vector3) => void, ground: number, water: number | null): void {
    const s = this.def;
    for (let i = 0; i < this.chains.length; i++) {
      const sg = s.chains === 1 ? 0 : i ? 1 : -1;
      const x = sg === 0 ? 1 : sg;
      _tie.set(x * s.tie[0], s.tie[1], s.tie[2]).applyMatrix4(head);
      _flare.set(x * s.flare[0], s.flare[1], s.flare[2]).applyMatrix4(head);
      const c = this.chains[i];
      c.update(dt, _tie, _flare, collide, ground, water);
      if (s.draw === 'tubes') this.tubes.set(i, c.p, this.radius, s.bulge, s.waves);
    }
  }

  /**
   * Draw the parts of the styles that are not tubes: the plait lobes (9 a plait, flattened, rolled left and right, in
   * the base and light colours) with a small bow at each tip, and a bun (with its twists or not). `head` is her head's
   * matrix.
   */
  draw(L: PartList, head: Xf, c: ThingColours): void {
    const s = this.def;
    if (s.draw === 'plait') {
      for (let i = 0; i < this.chains.length; i++) {
        const p = this.chains[i].p;
        // A plait at the side lies flat side out to that side; one plait down the back lies flat side to the back.
        const sg = s.chains === 1 ? 0 : i ? 1 : -1;
        const turn = sg || 1;
        for (let k = 0; k < LOBES; k++) {
          const t = (k + 0.5) / LOBES;
          chainPoint(p, t * 0.94 + 0.03, _p, _tan);
          // Flat side out, away from her (towards the camera in the portrait): the side of the head the plait hangs on.
          if (sg) _out.set(sg, 0, 0.35).transformDirection(head);
          else _out.set(0, 0, -1).transformDirection(head);
          _x.crossVectors(_tan, _out).normalize();
          _z.crossVectors(_x, _tan).normalize();
          _m.makeBasis(_x, _tan, _z).setPosition(_p);
          const w = THREE.MathUtils.lerp(0.075, 0.05, t);
          _m.roll((k % 2 ? 0.45 : -0.45) * turn).size(w, 0.06, 0.045 * (w / 0.075));
          // Lo, not Mid: 18 lobes in Mid would take the busiest look over 8,000 triangles. The portrait draws them Mid.
          L.push(B.Lo, _m, this.lobeColour(k), 0.25);
        }
        // A small ribbon bow at the tip, facing out.
        chainPoint(p, 1, _p, _tan);
        if (sg) _out.set(sg, 0, 0.6).transformDirection(head);
        else _out.set(0, 0, -1).transformDirection(head);
        _x.crossVectors(_up, _out).normalize();
        _y.crossVectors(_out, _x).normalize();
        _m.makeBasis(_x, _y, _out).setPosition(_p);
        bow(L, _m, 0.6, c, B.Lo);
      }
    }
    const bun = s.bun;
    if (bun) {
      const [x, y, z] = bun.at;
      _m.from(head).at(x, y, z).size(bun.r, bun.r * 0.96, bun.r * 0.9);
      L.push(B.Fine, _m, this.base, 0.2);
      if (!bun.twists) return;
      // The twists sit round the bun where it meets her head, facing back along the bun.
      for (let k = 0; k < TWISTS; k++) {
        const a = (k / TWISTS) * Math.PI * 2;
        _m.from(head).at(x, y + 0.004, z - 0.03).tilt(0.15)
          .at(Math.cos(a) * bun.r * 0.883, Math.sin(a) * bun.r * 0.883, 0).roll(a + 0.6).size(0.042, 0.024, 0.03);
        L.push(B.Lo, _m, this.bands ? this.bands[k % this.bands.length] : this.light, 0.3);
      }
    }
  }

  private lobeColour(k: number): THREE.Color {
    if (this.bands) return this.bands[k % this.bands.length];
    return k % 2 ? this.light : this.base;
  }

  /** The middle of chain i in world space (sparkles halfway down a tail), or null. */
  mid(i: number, out: THREE.Vector3): THREE.Vector3 | null {
    const c = this.chains[i];
    if (!c) return null;
    chainPoint(c.p, 0.5, out, _tan);
    return out;
  }
}

const _m = new Xf();
const _tie = new THREE.Vector3();
const _flare = new THREE.Vector3();
const _p = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _out = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
