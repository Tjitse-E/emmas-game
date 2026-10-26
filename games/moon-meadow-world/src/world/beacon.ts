// The goal beacon (a soft column of light with rising sparkles, visible from far) and the nest's waiting glow.
import * as THREE from 'three';
import { NEST, type Vec2 } from '../layout';
import { canvasTexture, starTexture } from './geo';
import { groundHeight } from './terrain';

const COLUMN_H = 7.5;
const SPARKS = 22;
/** The colour of the glows on the ground (the nest and the beacon's spot). */
const GLOW = '#ffe6f0';
const NEST_GLOW = 3.0;

export interface Glows {
  markGoal(p: Vec2 | null): void;
  nestGlow(on: boolean): void;
  update(dt: number, t: number): void;
}

/** White fading upwards, with soft sides: the beam's look. */
function beamTexture(): THREE.CanvasTexture {
  return canvasTexture(64, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.12, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, true);
}

/** A soft ring: the nest glow and the beacon's spot on the ground. */
function ringTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.15)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, true);
}

export function buildGlows(scene: THREE.Scene): Glows {
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false } as const;
  // The glows on the ground blend normally (the ring is their alpha): added light on green grass turns it lime, a
  // pink-white veil lifts it.
  const veil = { transparent: true, depthWrite: false, fog: false } as const;

  // The beacon: a light column, a glowing ring on the ground and sparkles rising in a slow spiral.
  const beacon = new THREE.Group();
  beacon.name = 'beacon';
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffe2ee', map: beamTexture(), side: THREE.DoubleSide, opacity: 0, ...additive });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, COLUMN_H, 20, 1, true), beamMat);
  beam.position.y = COLUMN_H / 2;
  const spotMat = new THREE.MeshBasicMaterial({ color: GLOW, alphaMap: ringTexture(), opacity: 0, ...veil });
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), spotMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = 0.06;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkCol = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparkMat = new THREE.PointsMaterial({ map: starTexture(), size: 1.5, vertexColors: true, opacity: 0, ...additive });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  const palette = ['#ffe066', '#ff9ccc', '#fff6d6', '#c9b2ff'].map((c) => new THREE.Color(c));
  beacon.add(beam, spot, sparks);
  beacon.visible = false;

  // The nest glow: a soft ring that breathes on the mound. 3 m across, so it stays inside the mound and never reaches
  // her stand spot (NEST.stand, 2.2 m from the centre) or her skirt.
  const nestMat = new THREE.MeshBasicMaterial({ color: GLOW, alphaMap: ringTexture(), opacity: 0, ...veil });
  const nest = new THREE.Mesh(new THREE.PlaneGeometry(NEST_GLOW, NEST_GLOW), nestMat);
  nest.name = 'nest-glow';
  nest.rotation.x = -Math.PI / 2;
  nest.position.set(NEST.center.x, 0.4, NEST.center.z);
  nest.visible = false;

  scene.add(beacon, nest);

  let goal: Vec2 | null = null;
  let goalFade = 0;
  let nestOn = false;
  let nestFade = 0;

  return {
    markGoal(p) {
      if (p && (!goal || goal.x !== p.x || goal.z !== p.z)) {
        // A new goal: the beacon appears there fresh rather than sliding across the meadow.
        goalFade = 0;
        beacon.position.set(p.x, Math.max(0, groundHeight(p.x, p.z)), p.z);
      }
      goal = p ? { x: p.x, z: p.z } : null;
    },
    nestGlow(on) {
      nestOn = on;
    },
    update(dt, t) {
      goalFade = THREE.MathUtils.clamp(goalFade + (goal ? dt : -dt) * 2.5, 0, 1);
      beacon.visible = goalFade > 0;
      if (beacon.visible) {
        const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
        beamMat.opacity = goalFade * 0.45 * pulse;
        spotMat.opacity = goalFade * 0.75 * pulse;
        sparkMat.opacity = goalFade;
        for (let i = 0; i < SPARKS; i++) {
          const phase = i / SPARKS;
          const k = (t * 0.22 + phase * 1.618) % 1;
          const a = phase * Math.PI * 2 * 3 + t * 1.1;
          const rad = 0.35 + 0.35 * Math.sin(phase * 17);
          sparkPos.set([Math.cos(a) * rad, 0.2 + k * (COLUMN_H - 1), Math.sin(a) * rad], i * 3);
          // Fade in at the bottom and out at the top (additive: darker is fainter).
          const f = Math.min(1, k * 5) * (1 - k);
          const c = palette[i % palette.length];
          sparkCol.set([c.r * f, c.g * f, c.b * f], i * 3);
        }
        sparkGeo.attributes.position.needsUpdate = true;
        sparkGeo.attributes.color.needsUpdate = true;
      }
      nestFade = THREE.MathUtils.clamp(nestFade + (nestOn ? dt : -dt) * 1.5, 0, 1);
      nest.visible = nestFade > 0;
      nestMat.opacity = nestFade * (0.5 + 0.22 * Math.sin(t * 2.0));
      nest.scale.setScalar(1 + 0.04 * Math.sin(t * 2.0));
    },
  };
}
