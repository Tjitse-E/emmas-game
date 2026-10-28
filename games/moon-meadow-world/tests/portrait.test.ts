// The customiser's camera (src/game/portrait.ts): the frame helper puts the camera where the design says, and she
// stands in the middle of the preview at every iPad size.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FOV } from '../src/world/camera';
import { START } from '../src/layout';
import { PORTRAIT, panelLeftOf, portraitFrame, portraitKind } from '../src/game/portrait';

const SIZES: [number, number][] = [[1080, 810], [1080, 740], [1024, 768], [1024, 690], [1180, 820], [1366, 1024]];

/** The camera as the world's rig places it for frame(center, width, { pitch, shiftY: 0 }). */
function rigCamera(f: ReturnType<typeof portraitFrame>, w: number, h: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(FOV, w / h, 0.5, 700);
  const dist = f.width / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * cam.aspect);
  const p = THREE.MathUtils.degToRad(f.pitch);
  cam.position.set(f.center.x, Math.sin(p) * dist, f.center.z + Math.cos(p) * dist);
  cam.lookAt(f.center.x, 0, f.center.z);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

/** A world point in CSS px. */
function onScreen(cam: THREE.PerspectiveCamera, x: number, y: number, z: number, w: number, h: number): { x: number; y: number } {
  const v = new THREE.Vector3(x, y, z).project(cam);
  return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
}

describe('portraitFrame', () => {
  it('puts the camera on the line of sight through the look point', () => {
    for (const [w, h] of SIZES) {
      for (const row of [null, 'eyes'] as const) {
        const f = portraitFrame(START, row, { w, h, panelLeft: panelLeftOf(w, h) });
        const cam = rigCamera(f, w, h);
        expect(cam.position.x).toBeCloseTo(f.camera.x, 6);
        expect(cam.position.y).toBeCloseTo(f.camera.y, 6);
        expect(cam.position.z).toBeCloseTo(f.camera.z, 6);
        const l = onScreen(cam, f.look.x, f.look.y, f.look.z, w, h);
        expect(l.x).toBeCloseTo(w / 2, 3);
        expect(l.y).toBeCloseTo(h / 2, 3);
      }
    }
  });

  it('stands her in the middle of the preview, left of the panel', () => {
    for (const [w, h] of SIZES) {
      const panelLeft = panelLeftOf(w, h);
      for (const row of ['hair', 'eyes', 'gown', 'crown', 'shoes', 'sparkles'] as const) {
        const f = portraitFrame(START, row, { w, h, panelLeft });
        const her = onScreen(rigCamera(f, w, h), START.x, PORTRAIT[f.kind].lookY, START.z, w, h);
        expect(Math.abs(her.x - panelLeft / 2)).toBeLessThan(0.5);
      }
    }
  });

  it('shows all of her in the body frame and her head in the face frame', () => {
    const [w, h] = [1080, 740];
    const body = portraitFrame(START, 'gown', { w, h, panelLeft: panelLeftOf(w, h) });
    const cam = rigCamera(body, w, h);
    const feet = onScreen(cam, START.x, 0, START.z, w, h);
    expect(feet.y / h).toBeGreaterThan(0.76);
    expect(feet.y / h).toBeLessThan(0.79);
    // About 356 px per metre at her (2.08 m seen top to bottom).
    const metre = onScreen(cam, START.x, 1, START.z, w, h);
    expect(feet.y - metre.y).toBeGreaterThan(345);
    expect(feet.y - metre.y).toBeLessThan(366);
    const face = portraitFrame(START, 'sparkles', { w, h, panelLeft: panelLeftOf(w, h) });
    const fc = rigCamera(face, w, h);
    const head = onScreen(fc, START.x, 1.08, START.z, w, h);
    expect(head.y).toBeCloseTo(h / 2, 1);
    // The camera stays well beyond the near plane (0.5 m).
    expect(Math.hypot(face.camera.x - face.look.x, face.camera.y - face.look.y, face.camera.z - face.look.z)).toBeGreaterThan(1.2);
  });

  it('picks the face frame for the eyes and sparkles tabs only', () => {
    expect(portraitKind(null)).toBe('body');
    const tabs = ['hair', 'eyes', 'gown', 'crown', 'shoes', 'sparkles'] as const;
    expect(tabs.map((t) => portraitKind(t))).toEqual(['body', 'face', 'body', 'body', 'body', 'face']);
  });

  it('places the panel where the ui lane draws it', () => {
    expect(Math.round(panelLeftOf(1080, 810))).toBe(491);
    expect(Math.round(panelLeftOf(1080, 740))).toBe(499);
  });
});
