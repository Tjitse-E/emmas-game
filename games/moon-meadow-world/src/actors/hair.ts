// Princess Emma's hair (docs/v4/2.2.md 2.5): the six colours and the four styles. The cap, the fringe and the side
// locks are drawn by the princess in these colours; this file owns the hanging hair: the verlet chains, the tubes
// (one HairTubes for two tails, built once), the plait lobes and the bun. A colour change repaints, a style change
// builds new chains. No style puts anything above head-space y 0.18 inside the crown ring.
import * as THREE from 'three';
import { HAIR_HEX, type LegacyHairColour as HairColour, type LegacyStyle as HairStyle } from '../wardrobe-legacy';
import { B, type PartList, Xf, col } from './parts';
import { HairTubes, Ponytail, chainPoint } from './ponytail';
import { bow, type ThingColours } from './looks3d';

type V3 = readonly [number, number, number];

interface Style {
  /** Chains, mirrored on x for the second one. `tie` and `flare` are the two pinned points in head space. */
  chains: number;
  links: number;
  seg: number;
  tie: V3;
  flare: V3;
  /** Drawn as tubes (else as plait lobes). */
  tubes: boolean;
  /** Tube radius below the tie and at the tip, and the bulges along it. */
  peak: number;
  tip: number;
  bulge: number;
  waves: number;
}

/** 2.5: ponytails (today's), one high ponytail, two plaits, a bun with two ringlets. */
export const STYLES: Record<HairStyle, Style> = {
  ponytails: { chains: 2, links: 8, seg: 0.145, tie: [0.21, 0.11, -0.085], flare: [0.27, 0.0, -0.13], tubes: true, peak: 0.085, tip: 0.025, bulge: 0.13, waves: 5 },
  high: { chains: 1, links: 9, seg: 0.13, tie: [0, 0.1, -0.26], flare: [0, 0.03, -0.34], tubes: true, peak: 0.1, tip: 0.03, bulge: 0.13, waves: 5 },
  plaits: { chains: 2, links: 6, seg: 0.12, tie: [0.2, -0.02, -0.1], flare: [0.24, -0.12, -0.14], tubes: false, peak: 0.075, tip: 0.05, bulge: 0, waves: 0 },
  bun: { chains: 2, links: 4, seg: 0.07, tie: [0.22, -0.06, 0.02], flare: [0.245, -0.12, 0.012], tubes: true, peak: 0.03, tip: 0.018, bulge: 0.38, waves: 8 },
};

/** How much thicker than the first build's 0.052 m tubes a style's hair is: the chain keeps this much further out. */
export function hairExtra(style: HairStyle): number {
  return Math.max(0, STYLES[style].peak - 0.052);
}

/** Lobes per plait. */
const LOBES = 9;
/** The bun: a sphere of 0.12 m low on the back of her head, with seven twists round its base. */
const BUN_AT: V3 = [0, 0.04, -0.26];
const BUN_R = 0.12;
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
    this.tubes.show(s.tubes ? s.chains : 0);
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
      if (s.tubes) this.tubes.set(i, c.p, this.radius, s.bulge, s.waves);
    }
  }

  /**
   * Draw the parts of the styles that are not tubes: the plait lobes (9 a plait, flattened, rolled left and right, in
   * the base and light colours) with a small bow at each tip, or the bun and its twists. `head` is her head's matrix.
   */
  draw(L: PartList, head: Xf, c: ThingColours): void {
    if (this.style === 'plaits') {
      for (let i = 0; i < this.chains.length; i++) {
        const p = this.chains[i].p;
        const sg = i ? 1 : -1;
        for (let k = 0; k < LOBES; k++) {
          const t = (k + 0.5) / LOBES;
          chainPoint(p, t * 0.94 + 0.03, _p, _tan);
          // Flat side out, away from her (towards the camera in the portrait): the side of the head the plait hangs on.
          _out.set(sg, 0, 0.35).transformDirection(head);
          _x.crossVectors(_tan, _out).normalize();
          _z.crossVectors(_x, _tan).normalize();
          _m.makeBasis(_x, _tan, _z).setPosition(_p);
          const w = THREE.MathUtils.lerp(0.075, 0.05, t);
          _m.roll((k % 2 ? 0.45 : -0.45) * sg).size(w, 0.06, 0.045 * (w / 0.075));
          // Lo, not Mid: 18 lobes in Mid would take the busiest look over 8,000 triangles. The portrait draws them Mid.
          L.push(B.Lo, _m, this.lobeColour(k), 0.25);
        }
        // A small ribbon bow at the tip, facing out.
        chainPoint(p, 1, _p, _tan);
        _out.set(sg, 0, 0.6).transformDirection(head);
        _x.crossVectors(_up, _out).normalize();
        _y.crossVectors(_out, _x).normalize();
        _m.makeBasis(_x, _y, _out).setPosition(_p);
        bow(L, _m, 0.6, c, B.Lo);
      }
    } else if (this.style === 'bun') {
      _m.from(head).at(BUN_AT[0], BUN_AT[1], BUN_AT[2]).size(BUN_R, BUN_R * 0.96, BUN_R * 0.9);
      L.push(B.Fine, _m, this.base, 0.2);
      // The twists sit round the bun where it meets her head, facing back along the bun.
      for (let k = 0; k < TWISTS; k++) {
        const a = (k / TWISTS) * Math.PI * 2;
        _m.from(head).at(BUN_AT[0], BUN_AT[1] + 0.004, BUN_AT[2] - 0.03).tilt(0.15)
          .at(Math.cos(a) * 0.106, Math.sin(a) * 0.106, 0).roll(a + 0.6).size(0.042, 0.024, 0.03);
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
