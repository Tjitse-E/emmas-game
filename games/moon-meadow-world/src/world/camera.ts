// The raised camera: behind and above at a fixed angle, looking north. It follows a target with soft damping, eases
// to frame a spot for a moment, and opens the level with a sweep from high over the meadow.
import * as THREE from 'three';
import { START, type Vec2 } from '../layout';

export const FOV = 38;
/** Degrees below the horizon in follow mode. */
export const PITCH = 46;
/**
 * Metres of ground across a 4:3 screen at the target in follow mode. The follow distance is worked out for 4:3 (the
 * iPad Air 2) whatever the screen, so Princess Emma and the herd are the same size on every iPad and a wider screen
 * just sees a little more to the sides. At 1024 x 768 that is 76 px per metre: Princess Emma about 80 px tall.
 */
export const FOLLOW_WIDTH = 13.5;
const FOLLOW_ASPECT = 4 / 3;
/**
 * The follow target stays inside this box: near the fence she is almost centred, and the edge of the view shows the
 * hedges and the first trees of the woods beyond, never further out.
 */
const CLAMP = { minX: -23, maxX: 23, minZ: -19.5, maxZ: 13.5 };
const DAMP = 3.2;
/**
 * A frame with a pitch of SKY_PITCH or less and no shiftY is a sky shot: the camera stays where the pitch puts it and
 * tilts up until the top of the view is SKY_TOP degrees above the horizon, so the stars and the castle on its hill
 * show over whatever stands at the far side of the frame (the stable roofs at goodnight).
 */
export const SKY_PITCH = 30;
const SKY_TOP = 14;

/**
 * A camera pose: the ground point it looks at, its distance, its pitch (degrees), the frame shift and how far it then
 * tilts up (degrees, 0 except in sky shots).
 */
export interface Pose {
  x: number;
  z: number;
  dist: number;
  pitch: number;
  shift: number;
  look: number;
}

/** The opening shot: high over the south of the meadow, looking north over it to the castle and the sky. */
const INTRO = { camX: -1, camY: 21, camZ: 56, pitch: 11.5 };

type Then = 'follow' | 'hold';
interface Tween {
  from: Pose;
  goal: () => Pose;
  ms: number;
  t: number;
  then: Then;
  ease: (k: number) => number;
  resolve: () => void;
}

const easeInOut = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeSweep = (k: number): number => 0.5 - 0.5 * Math.cos(Math.PI * k);

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private target: () => Vec2 = () => START;
  private current: Pose;
  private mode: 'follow' | 'tween' | 'hold' = 'follow';
  private tween: Tween | null = null;
  private holdGoal: (() => Pose) | null = null;
  private appliedShift = 0;
  private size = { w: 1, h: 1 };

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.current = this.followPose();
  }

  /** Distance that shows `width` metres of ground across the screen at the look-at point (at `aspect`, default the screen's). */
  distFor(width: number, aspect = this.camera.aspect): number {
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return width / (2 * halfH * aspect);
  }

  resize(w: number, h: number): void {
    this.size = { w, h };
    this.camera.aspect = w / h;
    this.appliedShift = NaN;
  }

  follow(target: () => Vec2): void {
    this.target = target;
  }

  followPose(): Pose {
    const p = this.target();
    return {
      x: THREE.MathUtils.clamp(p.x, CLAMP.minX, CLAMP.maxX),
      z: THREE.MathUtils.clamp(p.z, CLAMP.minZ, CLAMP.maxZ),
      // Narrower than 4:3 (portrait, behind the turn picture) keeps at least FOLLOW_WIDTH across.
      dist: this.distFor(FOLLOW_WIDTH, Math.min(this.camera.aspect, FOLLOW_ASPECT)),
      pitch: PITCH,
      shift: 0,
      look: 0,
    };
  }

  introPose(): Pose {
    const pitch = THREE.MathUtils.degToRad(INTRO.pitch);
    const dist = INTRO.camY / Math.sin(pitch);
    return { x: INTRO.camX, z: INTRO.camZ - Math.cos(pitch) * dist, dist, pitch: INTRO.pitch, shift: 0, look: 0 };
  }

  private start(from: Pose, goal: () => Pose, ms: number, then: Then, ease = easeInOut): Promise<void> {
    this.tween?.resolve();
    return new Promise((resolve) => {
      if (ms <= 0) {
        this.current = goal();
        this.tween = null;
        this.mode = then;
        this.holdGoal = then === 'hold' ? goal : null;
        resolve();
        return;
      }
      this.tween = { from: { ...from }, goal, ms, t: 0, then, ease, resolve };
      this.holdGoal = then === 'hold' ? goal : null;
      this.mode = 'tween';
    });
  }

  frame(center: Vec2, width: number, o: { ms?: number; shiftY?: number; pitch?: number } = {}): Promise<void> {
    const c = { x: center.x, z: center.z };
    const pitch = o.pitch ?? PITCH;
    const sky = pitch <= SKY_PITCH && o.shiftY === undefined;
    const goal = (): Pose => ({
      x: c.x, z: c.z, dist: this.distFor(width), pitch, shift: o.shiftY ?? 0,
      look: sky ? Math.max(0, SKY_TOP - this.camera.fov / 2 + pitch) : 0,
    });
    return this.start(this.current, goal, o.ms ?? 900, 'hold');
  }

  releaseFrame(): void {
    void this.start(this.current, () => this.followPose(), 800, 'follow');
  }

  /** The ground point of the frame the camera holds or is heading to, or null while it follows (or goes back to it). */
  get framedAt(): Vec2 | null {
    const holding = this.mode === 'hold' || (this.mode === 'tween' && this.tween?.then === 'hold');
    if (!holding || !this.holdGoal) return null;
    const g = this.holdGoal();
    return { x: g.x, z: g.z };
  }

  /** Hold the opening shot (behind the start screen). */
  introStart(): void {
    void this.start(this.current, () => this.introPose(), 0, 'hold');
  }

  introSweep(ms: number): Promise<void> {
    return this.start(this.introPose(), () => this.followPose(), ms, 'follow', easeSweep);
  }

  /** Jump to where the camera is heading, without easing (for jumps between parts of the level). */
  snap(): void {
    if (this.tween) {
      const t = this.tween;
      this.tween = null;
      this.current = t.goal();
      this.mode = t.then;
      t.resolve();
    } else if (this.mode === 'follow') {
      this.current = this.followPose();
    }
  }

  update(dt: number): void {
    if (this.mode === 'tween' && this.tween) {
      const tw = this.tween;
      tw.t += dt * 1000;
      const k = tw.ease(Math.min(1, tw.t / tw.ms));
      const g = tw.goal();
      this.current = lerpPose(tw.from, g, k);
      if (tw.t >= tw.ms) {
        this.tween = null;
        this.mode = tw.then;
        tw.resolve();
      }
    } else if (this.mode === 'hold' && this.holdGoal) {
      this.current = this.holdGoal();
    } else if (this.mode === 'follow') {
      const g = this.followPose();
      this.current = lerpPose(this.current, g, 1 - Math.exp(-dt * DAMP));
    }
    this.apply();
  }

  private apply(): void {
    const { x, z, dist, shift, look } = this.current;
    const pitch = THREE.MathUtils.degToRad(this.current.pitch);
    this.camera.position.set(x, Math.sin(pitch) * dist, z + Math.cos(pitch) * dist);
    this.camera.lookAt(x, 0, z);
    if (look) this.camera.rotateX(THREE.MathUtils.degToRad(look));
    if (shift !== this.appliedShift) {
      const { w, h } = this.size;
      // A shifted view window keeps the angle but moves the framed spot down on screen (positive shift).
      if (Math.abs(shift) > 1e-4) this.camera.setViewOffset(w, h, 0, -shift * h, w, h);
      else this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
      this.appliedShift = shift;
    }
  }
}

function lerpPose(a: Pose, b: Pose, k: number): Pose {
  return {
    x: a.x + (b.x - a.x) * k,
    z: a.z + (b.z - a.z) * k,
    dist: a.dist + (b.dist - a.dist) * k,
    pitch: a.pitch + (b.pitch - a.pitch) * k,
    shift: a.shift + (b.shift - a.shift) * k,
    look: a.look + (b.look - a.look) * k,
  };
}
