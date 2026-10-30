// The mounts (2.4.0, docs/v4/2.4.md section 5.4): Bella and Hazel, two grown unicorns with saddles on, their looks,
// the seat Princess Emma takes side-saddle, and the travelled track a mount leaves on a ride, which the babies trot
// along 1.6, 3.0 and 4.4 m behind it (outside the herd's separation and routes).
import * as THREE from 'three';
import type { MountId, UnicornLook, Vec2 } from '../contracts';

/** Bella is moon white with a lilac mane; Hazel is honey with a rose mane and berry curls. */
export const MOUNT_LOOKS: Record<MountId, UnicornLook> = {
  bella: { stage: 'grown', breed: 'moon', body: '#fbf6ff', mane: '#a47be6', mane2: '#d8c4ff', horn: '#ffc94a' },
  hazel: { stage: 'grown', breed: 'berry', body: '#f6d8b4', mane: '#e0679a', mane2: '#ffb3cf', horn: '#ffd36a' },
};

/** The saddle's colours: a rose seat with a gold trim on a cream blanket. */
export const SADDLE_HEX = { seat: '#ff7fb2', trim: '#ffc94a', blanket: '#fff1dc' } as const;

/**
 * Where she sits, in the mount's frame: on its left side of the seat (`side` metres out from the spine), turned out
 * to that side, so both legs and the skirt hang down its left flank.
 */
export const SEAT = {
  /** Metres out from the spine, to the mount's left. */
  side: 0.13,
  /** Metres forward of the saddle's middle. */
  forward: 0.02,
  /** Her heading from the mount's: a right angle, out to its left. */
  turn: Math.PI / 2,
  /** Her hips in her own root space (feet at 0): they rest on the seat. */
  hips: 0.3,
  /** How far her root sinks while she sits (the slide's sit, so she looks seated the same way). */
  sink: 0.27,
  /** The gap the skirt keeps from the mount's flank. */
  clear: 0.045,
} as const;

/** A grown mount's body and chest as ellipsoids in its own frame: x out to its left, y up, z forward. */
export interface MountShape {
  /** Height of the seat's top (where her hips rest), and the saddle's place along the body. */
  seatY: number;
  seatZ: number;
  ellipsoids: { c: [number, number, number]; r: [number, number, number] }[];
}

/**
 * The side-saddle skirt: the dress geometry in her root space (y up from her feet, z forward, x to her left), with
 * every point that would sit inside the mount's body or chest pressed out to its flank (plus SEAT.clear). She faces
 * out to the mount's left, so her forward is out from the spine and her left is towards its tail. Built once per
 * dress shape; the vertex order stays, so paintDress repaints it as it paints the dress.
 */
export function drapeDress(src: THREE.BufferGeometry, shape: MountShape): THREE.BufferGeometry {
  const g = src.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const m = SEAT.clear;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // In the mount's frame: out to its left, up, forward.
    let X = SEAT.side + z;
    const Y = shape.seatY + (y - SEAT.hips);
    const Z = shape.seatZ + SEAT.forward - x;
    for (const e of shape.ellipsoids) {
      const ry = e.r[1] + m;
      const rz = e.r[2] + m;
      const k = 1 - ((Y - e.c[1]) / ry) ** 2 - ((Z - e.c[2]) / rz) ** 2;
      if (k <= 0) continue;
      const need = e.c[0] + (e.r[0] + m) * Math.sqrt(k);
      if (X < need) X = need;
    }
    pos.setZ(i, X - SEAT.side);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** How fast she hops up and down (s), and the hop's height above the higher end (m). */
export const HOP_S = 0.55;
export const HOP_UP = 0.35;

/** How far out to the side the followers step while their mount turns round and passes them. */
export const ASIDE = 1.1;

/**
 * Where a mount turned round on its track (a clearing): the track's length there, the point, the unit side its
 * followers step out to (the mount's free side once it has turned), and a number that is new for every turn.
 */
export interface TrackTurn {
  at: number;
  x: number;
  z: number;
  sx: number;
  sz: number;
  id: number;
}

/**
 * The ground track a mount has travelled on a ride: points every few centimetres with their running distance. Going
 * forward adds to it; backing up takes it back, so a follower steps back with the mount. A point `gap` metres back
 * along it is where a follower stands. Where the mount turns round, the track folds back on itself, so it notes the
 * turn: a follower whose place is still on the way in steps aside and waits until the mount has passed it.
 */
export class Track {
  private xs: number[] = [];
  private zs: number[] = [];
  private ds: number[] = [];
  private turnNow: TrackTurn | null = null;
  private turns = 0;

  /** Metres from the start of the track to its end (the mount). */
  get length(): number {
    return this.ds.length ? this.ds[this.ds.length - 1] : 0;
  }

  get empty(): boolean {
    return this.ds.length === 0;
  }

  /** The last turn, while the track still reaches past it. */
  get turned(): Readonly<TrackTurn> | null {
    return this.turnNow;
  }

  clear(): void {
    this.xs.length = this.zs.length = this.ds.length = 0;
    this.turnNow = null;
  }

  /** The mount turns round at (x, z), the end of the track; its followers step out to `side` (a unit vector). */
  turn(x: number, z: number, side: Vec2): void {
    const n = Math.hypot(side.x, side.z) || 1;
    this.turnNow = { at: this.length, x, z, sx: side.x / n, sz: side.z / n, id: ++this.turns };
  }

  /** Start a track along these points (the lead-in a follower walks onto before the mount sets off). */
  seed(points: readonly Vec2[]): void {
    this.clear();
    for (const p of points) this.add(p.x, p.z, 0);
  }

  /** The mount went forward to (x, z). */
  add(x: number, z: number, min = 0.04): void {
    const n = this.ds.length;
    if (!n) {
      this.xs.push(x);
      this.zs.push(z);
      this.ds.push(0);
      return;
    }
    const d = Math.hypot(x - this.xs[n - 1], z - this.zs[n - 1]);
    if (d < min && min > 0) {
      // Too short for a new point: move the end point, so the track's end is always where the mount is.
      if (n > 1) {
        const back = Math.hypot(x - this.xs[n - 2], z - this.zs[n - 2]);
        this.xs[n - 1] = x;
        this.zs[n - 1] = z;
        this.ds[n - 1] = this.ds[n - 2] + back;
      }
      return;
    }
    if (d < 1e-6) return;
    this.xs.push(x);
    this.zs.push(z);
    this.ds.push(this.ds[n - 1] + d);
  }

  /** The mount backed up to (x, z), `by` metres: the track loses its last `by` metres and ends there. */
  back(x: number, z: number, by: number): void {
    const keep = Math.max(0, this.length - by);
    while (this.ds.length > 1 && this.ds[this.ds.length - 1] > keep) {
      this.xs.pop();
      this.zs.pop();
      this.ds.pop();
    }
    const n = this.ds.length;
    // Backed up past its last turn: there is no fold on the track any more.
    if (this.turnNow && keep < this.turnNow.at) this.turnNow = null;
    if (!n) return this.add(x, z, 0);
    const d = Math.hypot(x - this.xs[n - 1], z - this.zs[n - 1]);
    this.xs.push(x);
    this.zs.push(z);
    this.ds.push(this.ds[n - 1] + Math.max(d, 1e-4));
  }

  /** The point `gap` metres back from the end along the track (its first point when the track is shorter), and the heading there. */
  pointBack(gap: number, out: { x: number; z: number; heading: number }): { x: number; z: number; heading: number } {
    const n = this.ds.length;
    if (!n) return out;
    const at = this.length - gap;
    if (n === 1 || at <= 0) {
      out.x = this.xs[0];
      out.z = this.zs[0];
      out.heading = n > 1 ? Math.atan2(this.xs[1] - this.xs[0], this.zs[1] - this.zs[0]) : out.heading;
      return out;
    }
    // Binary search for the segment holding `at`.
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.ds[mid] < at) lo = mid;
      else hi = mid;
    }
    const k = (at - this.ds[lo]) / Math.max(1e-6, this.ds[hi] - this.ds[lo]);
    out.x = this.xs[lo] + (this.xs[hi] - this.xs[lo]) * k;
    out.z = this.zs[lo] + (this.zs[hi] - this.zs[lo]) * k;
    out.heading = Math.atan2(this.xs[hi] - this.xs[lo], this.zs[hi] - this.zs[lo]);
    return out;
  }
}
