// The sky and the time of day: a gradient dome, clouds, stars and fireflies, the castle on its misty hill far to the
// north, and the light, fog and sky colours for day (0), sunset (0.5) and night (1).
import * as THREE from 'three';
import { BOUNDS, MIST } from '../layout';
import { Scenery, canvasTexture, paint, paintY, place, rng, softDotTexture, starTexture, type Geo } from './geo';
import { CASTLE_HILL, groundHeight } from './terrain';

/**
 * Colours and light at day, sunset and night. Sunset keeps the green bounce from the grass and only warms the light,
 * so the meadow stays green and the paths sandy (the 2D layer adds the pink of the sky as a soft wash). Night is a
 * deep blue-violet with a cool moonlight from the sun's side, bright enough that Emma still sees every face and door.
 */
const KEYS = {
  skyTop: ['#6cbcf0', '#f49ac2', '#1c2470'],
  horizon: ['#d6f0ff', '#ffc7a1', '#4b4fa8'],
  hemiSky: ['#eaf6ff', '#fff0f4', '#6f6cff'],
  hemiGround: ['#a8d48f', '#c9d9a0', '#3b2f9a'],
  hemiI: [1.6, 1.5, 1.35],
  sun: ['#fff3df', '#ffd2b0', '#9aa6ff'],
  sunI: [1.7, 1.45, 1.0],
  cloud: ['#ffffff', '#ffd4e0', '#8593cc'],
  mist: ['#f4eeff', '#ffe3ef', '#9eaee0'],
} as const;

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function key(name: 'skyTop' | 'horizon' | 'hemiSky' | 'hemiGround' | 'sun' | 'cloud' | 'mist', t: number, out: THREE.Color): THREE.Color {
  const k = KEYS[name];
  const i = t < 0.5 ? 0 : 1;
  const f = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  return out.copy(tmpA.set(k[i])).lerp(tmpB.set(k[i + 1]), f);
}
function keyN(name: 'hemiI' | 'sunI', t: number): number {
  const k = KEYS[name];
  return t < 0.5 ? THREE.MathUtils.lerp(k[0], k[1], t / 0.5) : THREE.MathUtils.lerp(k[1], k[2], (t - 0.5) / 0.5);
}

const FOG_NEAR = 70;
/** Firefly size in CSS pixels (the soft dot's bright core is about half of it). */
const FLY_PX = 11;
export const FOG_FAR = 290;

export interface Sky {
  /** Apply a time of day right now. */
  apply(t: number): void;
  /** Night amount (0 to 1) of the last apply, for parts that glow at night. */
  readonly night: number;
  /** The renderer's pixel ratio: fireflies have a fixed size on screen. */
  setPixelRatio(pr: number): void;
  update(dt: number, t: number, camera: THREE.Camera): void;
}

function cloudTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 128, (ctx, w, h) => {
    const puffs: [number, number, number][] = [[0.28, 0.62, 0.22], [0.47, 0.5, 0.28], [0.68, 0.6, 0.21], [0.38, 0.68, 0.18], [0.58, 0.7, 0.2]];
    for (const [x, y, r] of puffs) {
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x * w, y * h, r * w, 0, Math.PI * 2);
      ctx.fill();
    }
  }, true);
}

/** Quads facing south (towards every camera this game uses), merged into one geometry with UVs. */
function quads(list: { x: number; y: number; z: number; w: number; h: number; tilt?: number }[]): THREE.BufferGeometry {
  const parts = list.map((q) => {
    const g = new THREE.PlaneGeometry(q.w, q.h);
    g.rotateX(q.tilt ?? 0);
    g.translate(q.x, q.y, q.z);
    return g;
  });
  const out = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (const g of parts) {
    const base = pos.length / 3;
    pos.push(...(g.attributes.position.array as Float32Array));
    uv.push(...(g.attributes.uv.array as Float32Array));
    for (const i of g.index!.array) idx.push(base + i);
    g.dispose();
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}

/**
 * The moon mist's banks (layout.ts MIST): five low quads over its 4.5 by 2.8 m ellipse, the far ones a little higher,
 * tilted like the far banks so the raised cameras look at them face on.
 */
export function meadowMist(): { x: number; y: number; z: number; w: number; h: number; tilt: number }[] {
  const r = rng(29);
  const out = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 4) * Math.PI;
    const x = MIST.center.x - Math.cos(a) * MIST.rx * 0.75 + (r() - 0.5) * 0.6;
    const z = MIST.center.z - Math.sin(a) * MIST.rz * 0.6 + (r() - 0.5) * 0.5;
    out.push({ x, y: 0.75 + r() * 0.35 + (MIST.center.z - z) * 0.1, z, w: 3.6 + r() * 1.2, h: 1.7 + r() * 0.5, tilt: -0.25 });
  }
  return out;
}

/** The little pink castle on the hill far to the north: a teaser for later, half hidden in moon mist. */
function buildCastle(scenery: Scenery): THREE.Vector3 {
  const { x, z } = CASTLE_HILL;
  const y = groundHeight(x, z) - 0.6;
  const parts: Geo[] = [];
  const tower = (dx: number, dz: number, r: number, h: number, roof: string): void => {
    parts.push(place(paintY(new THREE.CylinderGeometry(r, r * 1.05, h, 10), '#f2b3cc', '#fbd6e4', -h / 2, h / 2), { x: x + dx, y: y + h / 2, z: z + dz }));
    parts.push(place(paintY(new THREE.ConeGeometry(r * 1.3, r * 2.6, 10), roof, '#e7d9ff', -r * 1.3, r * 1.3), { x: x + dx, y: y + h + r * 1.3, z: z + dz }));
    parts.push(place(paint(new THREE.SphereGeometry(r * 0.22, 6, 4), '#f7d272'), { x: x + dx, y: y + h + r * 2.65, z: z + dz }));
    const flag = new THREE.BufferGeometry();
    flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, r * 1.1, -r * 0.3, 0, 0, -r * 0.6, 0], 3));
    parts.push(place(paint(flag, '#ff8fbf'), { x: x + dx, y: y + h + r * 3.4, z: z + dz + 0.05 }));
    parts.push(place(paint(new THREE.CylinderGeometry(0.08, 0.08, r * 0.9, 4), '#f7d272'), { x: x + dx, y: y + h + r * 3.1, z: z + dz }));
  };
  tower(0, 0, 2.6, 11, '#b293e8');
  tower(-5.2, 2.2, 1.5, 7, '#e48fbd');
  tower(5.2, 2.2, 1.5, 7, '#e48fbd');
  tower(-3.8, -3, 1.3, 8, '#c4a6f0');
  tower(3.8, -3, 1.3, 8, '#c4a6f0');
  parts.push(place(paintY(new THREE.BoxGeometry(10.4, 4.2, 1.2), '#f0b9cf', '#f9d5e3', -2.1, 2.1), { x, y: y + 2.1, z: z + 2.2 }));
  // A dark arched gate and two windows, so the shape reads as a castle from far away.
  parts.push(place(paint(new THREE.CircleGeometry(1.0, 10, 0, Math.PI), '#8a6aa8'), { x, y: y + 1.6, z: z + 2.82 }));
  parts.push(place(paint(new THREE.PlaneGeometry(2.0, 1.6), '#8a6aa8'), { x, y: y + 0.8, z: z + 2.82 }));
  for (const dx of [-1, 1]) parts.push(place(paint(new THREE.CircleGeometry(0.45, 8), '#9b7bc0'), { x: x + dx * 1.1, y: y + 7.2, z: z + 2.62 }));
  // A small castle: the whole build scaled down around its base, so it reads as far away.
  const k = 0.75;
  for (const g of parts) scenery.add(g.translate(-x, -y, -z).scale(k, k, k).translate(x, y, z), 'far-n');
  return new THREE.Vector3(x, y, z);
}

export function buildSky(scene: THREE.Scene, scenery: Scenery, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight): Sky {
  // The dome follows the camera and is drawn first, behind everything.
  const uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  const domeMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizon, top, pow(smoothstep(0.0, 0.75, h), 0.7)), 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), domeMat);
  dome.name = 'sky';
  dome.renderOrder = -10;
  dome.frustumCulled = false;

  // Soft clouds over the far hills (seen in the opening shot).
  const r = rng(17);
  const cloudList = [];
  for (let i = 0; i < 9; i++) {
    const w = 50 + r() * 50;
    cloudList.push({ x: -230 + i * 55 + r() * 20, y: 34 + r() * 46, z: -300 - r() * 40, w, h: w * 0.5 });
  }
  const cloudMat = new THREE.MeshBasicMaterial({ alphaMap: cloudTexture(), transparent: true, depthWrite: false, fog: false });
  const clouds = new THREE.Mesh(quads(cloudList), cloudMat);
  clouds.name = 'clouds';

  // Moon mist around the castle hill, tilted to face the raised cameras.
  const castle = buildCastle(scenery);
  const mistList = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI - Math.PI;
    // Low around the castle's feet: the towers rise out of it and the hill still shows below.
    mistList.push({
      x: castle.x + Math.cos(a) * 12 + (r() - 0.5) * 8, y: castle.y - 1 + r() * 1.5, z: castle.z + 8 + Math.sin(a) * 5 + r() * 3,
      w: 24 + r() * 12, h: 6 + r() * 2, tilt: -0.25,
    });
  }
  // Low banks of mist on the hills beyond the meadow, where the world opens up later.
  for (const [mx, mz] of [[-62, -60], [60, -55], [-30, -78], [38, -84], [-85, -30], [86, -24]]) {
    mistList.push({ x: mx, y: groundHeight(mx, mz) + 3, z: mz, w: 46, h: 10, tilt: -0.25 });
  }
  // 2.3.0: the moon mist over the empty north-east of the meadow, behind the stables' back line, where the meadow
  // opens with riding in 2.4. Low soft banks in the same mesh, so it costs no draw call and no shader of its own.
  for (const m of meadowMist()) mistList.push(m);
  const mistMat = new THREE.MeshBasicMaterial({ alphaMap: softDotTexture(), transparent: true, depthWrite: false, opacity: 0.65 });
  const mist = new THREE.Mesh(quads(mistList), mistMat);
  mist.name = 'mist';

  // Stars on the upper sky: a points cloud that rides with the camera.
  const starPos: number[] = [];
  const starCol: number[] = [];
  for (let i = 0; i < 460; i++) {
    const az = r() * Math.PI * 2;
    // Most stars sit low: the game's sky shots (the intro, goodnight over the stable roofs) only see a band of sky
    // about 10 degrees high above the hills. The first 160 fill that band.
    const el = i < 160 ? 0.035 + r() * 0.15 : 0.03 + Math.pow(r(), 1.8) * 1.3;
    starPos.push(Math.cos(az) * Math.cos(el) * 280, Math.sin(el) * 280, Math.sin(az) * Math.cos(el) * 280);
    const b = 0.55 + r() * 0.45;
    starCol.push(b, b, b * (0.9 + r() * 0.1));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({ map: starTexture(), size: 9, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  stars.name = 'stars';
  stars.frustumCulled = false;
  stars.renderOrder = -9;

  // Fireflies over the meadow, the pond and the stable yard at night: small warm yellow points of a fixed size on
  // screen, so a close-up does not blow them up into pale balls.
  const FLIES = 40;
  const flyBase: THREE.Vector3[] = [];
  for (let i = 0; i < FLIES; i++) {
    flyBase.push(new THREE.Vector3(BOUNDS.minX + 2 + r() * (BOUNDS.maxX - BOUNDS.minX - 4), 0.5 + r() * 1.3, BOUNDS.minZ + 2 + r() * (BOUNDS.maxZ - BOUNDS.minZ - 4)));
  }
  const flyGeo = new THREE.BufferGeometry();
  const flyPos = new Float32Array(FLIES * 3);
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = new THREE.PointsMaterial({ color: '#fff27a', map: softDotTexture(), size: FLY_PX, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
  let flyPx = FLY_PX;
  const flies = new THREE.Points(flyGeo, flyMat);
  flies.name = 'fireflies';
  flies.frustumCulled = false;
  flies.visible = false;

  scene.add(dome, clouds, mist, stars, flies);
  scene.fog = new THREE.Fog('#ffffff', FOG_NEAR, FOG_FAR);
  const fog = scene.fog as THREE.Fog;
  let night = 0;

  const sky: Sky = {
    get night() {
      return night;
    },
    setPixelRatio(pr) {
      flyPx = FLY_PX * pr;
    },
    apply(t) {
      key('skyTop', t, uniforms.top.value);
      key('horizon', t, uniforms.horizon.value);
      fog.color.copy(uniforms.horizon.value);
      key('hemiSky', t, hemi.color);
      key('hemiGround', t, hemi.groundColor);
      hemi.intensity = keyN('hemiI', t);
      key('sun', t, sun.color);
      sun.intensity = keyN('sunI', t);
      key('cloud', t, cloudMat.color);
      cloudMat.opacity = 1 - 0.45 * THREE.MathUtils.smoothstep(t, 0.5, 1);
      key('mist', t, mistMat.color);
      night = THREE.MathUtils.smoothstep(t, 0.5, 1);
      starMat.opacity = night;
      stars.visible = night > 0.01;
      flies.visible = night > 0.3;
    },
    update(_dt, t, camera) {
      dome.position.copy(camera.position);
      stars.position.copy(camera.position);
      if (stars.visible) starMat.size = 9 * (0.9 + 0.1 * Math.sin(t * 3));
      if (flies.visible) {
        flyMat.opacity = THREE.MathUtils.smoothstep(night, 0.3, 1) * 0.95;
        for (let i = 0; i < FLIES; i++) {
          const b = flyBase[i];
          const k = i * 1.7;
          flyPos[i * 3] = b.x + Math.sin(t * 0.35 + k) * 1.6 + Math.sin(t * 0.9 + k * 2) * 0.3;
          flyPos[i * 3 + 1] = b.y + Math.sin(t * 0.7 + k) * 0.35;
          flyPos[i * 3 + 2] = b.z + Math.cos(t * 0.3 + k * 1.3) * 1.4;
        }
        flyGeo.attributes.position.needsUpdate = true;
        // Each firefly blinks on its own rhythm: sizes are shared, so the blink is a gentle global flicker.
        flyMat.size = flyPx * (0.85 + 0.15 * Math.sin(t * 2.3));
      }
    },
  };
  return sky;
}
