// The slide ride shared by Princess Emma and the unicorns: climb the ladder along SLIDE_CURVE to SLIDE.climbEnd, step
// onto the top platform, sit, and slide down to the splash. u is the arc-length fraction (curve.getPointAt).
import * as THREE from 'three';
import { SLIDE, SLIDE_CURVE } from '../layout';
import { headingOf } from './motion';

export const CURVE_LEN = SLIDE_CURVE.getLength();
/** Where riders sit on the top platform before sliding (the highest point of the curve). */
export const SEAT_U = findSeat();
/** Climbing speed along the ladder, metres a second. */
export const CLIMB_SPEED = 1.0;
/** Sliding: start speed and how fast it gains speed (m/s, m/s²), and the top speed. */
export const SLIDE_V0 = 0.9;
export const SLIDE_ACCEL = 5.5;
export const SLIDE_VMAX = 6.5;

function findSeat(): number {
  let best = SLIDE.climbEnd;
  let y = -Infinity;
  for (let u = SLIDE.climbEnd; u < 0.6; u += 0.005) {
    const p = SLIDE_CURVE.getPointAt(u);
    if (p.y > y) {
      y = p.y;
      best = u;
    }
  }
  return best;
}

export function slideAt(u: number, out = new THREE.Vector3()): THREE.Vector3 {
  return SLIDE_CURVE.getPointAt(Math.min(1, Math.max(0, u)), out);
}

const _tan = new THREE.Vector3();
/** Heading (yaw) and slope (radians, positive going down) of the curve at u. */
export function slideDir(u: number): { heading: number; slope: number } {
  SLIDE_CURVE.getTangentAt(Math.min(1, Math.max(0, u)), _tan);
  return { heading: headingOf(_tan.x, _tan.z), slope: Math.atan2(-_tan.y, Math.hypot(_tan.x, _tan.z)) };
}

/** Advance a slider: returns the new [u, v]. */
export function slideStep(u: number, v: number, dt: number): [number, number] {
  const nv = Math.min(SLIDE_VMAX, v + SLIDE_ACCEL * dt);
  return [u + (nv * dt) / CURVE_LEN, nv];
}
