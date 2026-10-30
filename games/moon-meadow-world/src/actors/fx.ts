// Effects: one pooled Points cloud for every particle kind (sparkles, hearts, droplets, steam, stars), with the
// sprites drawn once on a small canvas atlas, plus ripple rings and moonbeams drawn as instanced parts.
import * as THREE from 'three';
import type { Fx } from '../contracts';
import { B, PartList, Xf, col } from './parts';

const MAX = 720;

/** Atlas cells. */
const STAR4 = 0;
const HEART = 1;
const DOT = 2;
const STAR5 = 3;

/**
 * The sprite atlas: alpha is the shape, red how much of the particle's colour shows (0 keeps white, for the bright
 * cores), green the brightness (a slightly darker rim, as the picture-book outlines).
 */
function drawAtlas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const cell = (k: number, draw: () => void) => {
    g.save();
    g.translate((k % 2) * 128 + 64, Math.floor(k / 2) * 128 + 64);
    draw();
    g.restore();
  };
  const star = (points: number, outer: number, inner: number) => {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  };
  cell(STAR4, () => {
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 60);
    glow.addColorStop(0, 'rgba(255,255,0,0.55)');
    glow.addColorStop(1, 'rgba(255,255,0,0)');
    g.fillStyle = glow;
    g.fillRect(-64, -64, 128, 128);
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const b = a + Math.PI / 4;
      if (i === 0) g.moveTo(Math.cos(a) * 58, Math.sin(a) * 58);
      g.quadraticCurveTo(Math.cos(b) * 9, Math.sin(b) * 9, Math.cos(a + Math.PI / 2) * 58, Math.sin(a + Math.PI / 2) * 58);
    }
    g.fillStyle = 'rgb(255,255,0)';
    g.fill();
    g.beginPath();
    g.arc(0, 0, 11, 0, Math.PI * 2);
    g.fillStyle = 'rgb(0,255,0)';
    g.fill();
  });
  const heart = () => {
    g.beginPath();
    g.moveTo(0, 40);
    g.bezierCurveTo(-58, 2, -42, -46, 0, -22);
    g.bezierCurveTo(42, -46, 58, 2, 0, 40);
    g.closePath();
  };
  cell(HEART, () => {
    heart();
    g.fillStyle = 'rgb(255,150,0)';
    g.fill();
    g.scale(0.84, 0.84);
    g.translate(0, -2);
    heart();
    g.fillStyle = 'rgb(255,255,0)';
    g.fill();
    g.beginPath();
    g.ellipse(-20, -16, 9, 6, -0.6, 0, Math.PI * 2);
    g.fillStyle = 'rgb(0,255,0)';
    g.fill();
  });
  cell(DOT, () => {
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 60);
    r.addColorStop(0, 'rgba(255,255,0,1)');
    r.addColorStop(0.55, 'rgba(255,255,0,0.75)');
    r.addColorStop(1, 'rgba(255,255,0,0)');
    g.fillStyle = r;
    g.fillRect(-64, -64, 128, 128);
  });
  cell(STAR5, () => {
    star(5, 58, 26);
    g.fillStyle = 'rgb(255,140,0)';
    g.fill();
    star(5, 48, 21);
    g.fillStyle = 'rgb(255,255,0)';
    g.fill();
    g.beginPath();
    g.ellipse(-10, -16, 8, 5, -0.5, 0, Math.PI * 2);
    g.fillStyle = 'rgb(0,255,0)';
    g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; // channels are masks, not colours
  // Premultiplied, so the masks stay smooth where the sprites fade out (no speckles at the soft edges).
  t.premultiplyAlpha = true;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

const VERT = /* glsl */ `
attribute vec3 pcolor;
attribute float psize;
attribute float palpha;
attribute float pframe;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
varying float vFrame;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min( psize * uScale / max( 0.1, - mv.z ), 220.0 );
  vColor = pcolor;
  vAlpha = palpha;
  vFrame = pframe;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
varying vec3 vColor;
varying float vAlpha;
varying float vFrame;
void main() {
  vec2 cell = vec2( mod( vFrame, 2.0 ), floor( vFrame / 2.0 ) );
  vec2 uv = vec2( ( gl_PointCoord.x + cell.x ) * 0.5, 1.0 - ( gl_PointCoord.y + cell.y ) * 0.5 );
  vec4 t = texture2D( uAtlas, uv );
  vec2 mask = t.rg / max( t.a, 0.002 );
  vec3 c = mix( vec3( 1.0 ), vColor, mask.r ) * ( 0.62 + 0.38 * mask.g );
  gl_FragColor = vec4( c, t.a * vAlpha );
  if ( gl_FragColor.a < 0.01 ) discard;
  #include <colorspace_fragment>
}`;

interface Particle {
  frame: number;
  life: number;
  age: number;
  s0: number;
  s1: number;
  g: number; // vertical acceleration (negative falls)
  drag: number;
  twinkle: number;
  /** Homing particles fly from `from` to `to` with an ease-in instead of physics (starfall). */
  home: boolean;
  from: THREE.Vector3;
  to: THREE.Vector3;
  p: THREE.Vector3;
  v: THREE.Vector3;
  c: THREE.Color;
  sway: number;
  onEnd?: () => void;
}

interface Ripple {
  at: THREE.Vector3;
  r0: number;
  r1: number;
  life: number;
  age: number;
  alpha: number;
}

export interface Beam {
  at: THREE.Vector3;
  radius: number;
  height: number;
  /** Target opacity; the beam eases to it. 0 with `done` set removes it. */
  alpha: number;
  shown: number;
  done: boolean;
  /** Its colour (a cool white for carrying, warm for the wild egg's moonbeam). */
  colour: THREE.Color;
  /** A small glowing ring on the ground where it lands. */
  ring: boolean;
}

export interface FxImpl extends Fx {
  readonly parts: PartList;
  /** A puff of steam (the hot egg). */
  steam(at: THREE.Vector3): void;
  /** Frost flakes (the cold egg). */
  frost(at: THREE.Vector3): void;
  /** Droplets thrown from one swimmer at another. */
  spray(from: THREE.Vector3, to: THREE.Vector3): void;
  /** One soft ripple ring on the water. */
  ripple(at: THREE.Vector3, r0?: number, r1?: number, life?: number): void;
  /** A moonbeam its owner moves and fades (a carried unicorn, an upper-door lift). */
  beam(at: THREE.Vector3, radius?: number): Beam;
  update(dt: number, t: number): void;
  /** Its particles' points with their material (and the sprite atlas), for the actors' start-up draw (2.4.0). */
  warmables(): { geometry: THREE.BufferGeometry; material: THREE.Material; points: true }[];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function createFx(scene: THREE.Scene): FxImpl {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const colour = new Float32Array(MAX * 3);
  const size = new Float32Array(MAX);
  const alpha = new Float32Array(MAX);
  const frame = new Float32Array(MAX);
  const attrs = [
    ['position', pos, 3],
    ['pcolor', colour, 3],
    ['psize', size, 1],
    ['palpha', alpha, 1],
    ['pframe', frame, 1],
  ] as const;
  for (const [name, arr, n] of attrs) geo.setAttribute(name, new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uAtlas: { value: drawAtlas() }, uScale: { value: 600 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'actors-fx';
  points.frustumCulled = false;
  points.renderOrder = 4;
  const drawSize = new THREE.Vector2();
  points.onBeforeRender = (renderer, _s, cam) => {
    renderer.getDrawingBufferSize(drawSize);
    mat.uniforms.uScale.value = drawSize.y * 0.5 * (cam as THREE.PerspectiveCamera).projectionMatrix.elements[5];
    mat.uniformsNeedUpdate = true;
  };
  scene.add(points);

  const live: Particle[] = [];
  const ripples: Ripple[] = [];
  const beams: Beam[] = [];
  const parts = new PartList(64);
  const m = new Xf();
  const rippleColour = col('#ffffff');
  const beamColour = col('#eef4ff');
  /** The wild egg's moonbeam: warm, so it shows on the green meadow by day. */
  const moonColour = col('#fff1c4');
  const ringColour = col('#ffe08a');
  const glowColour = col('#fff4d6');

  function spawn(o: Partial<Particle> & { p: THREE.Vector3; frame: number; life: number; c: THREE.Color }): Particle | null {
    if (live.length >= MAX) return null;
    const q: Particle = {
      age: 0, s0: 0.2, s1: 0.2, g: 0, drag: 0, twinkle: 0, home: false, sway: 0,
      from: o.p.clone(), to: o.p.clone(), v: new THREE.Vector3(), ...o,
      p: o.p.clone(),
    };
    live.push(q);
    return q;
  }

  function sparkle(at: THREE.Vector3, o: { count?: number; colour?: string } = {}): void {
    const c = col(o.colour ?? '#ffd75e');
    const n = o.count ?? 14;
    for (let i = 0; i < n; i++) {
      const dir = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize();
      spawn({
        p: at.clone().addScaledVector(dir, 0.1), v: dir.multiplyScalar(rand(0.8, 2.0)), frame: i % 3 ? STAR4 : STAR5,
        life: rand(0.8, 1.3), c, s0: rand(0.16, 0.28), s1: 0.02, drag: 2.6, g: 0.4, twinkle: rand(10, 18),
      });
    }
  }

  function hearts(at: THREE.Vector3): void {
    const c = col('#ff6fae');
    for (let i = 0; i < 5; i++) {
      spawn({
        p: at.clone().add(new THREE.Vector3(rand(-0.25, 0.25), rand(0, 0.15), rand(-0.1, 0.1))),
        v: new THREE.Vector3(rand(-0.15, 0.15), rand(0.7, 1.1), 0), frame: HEART, life: rand(1.3, 1.8), c,
        s0: rand(0.22, 0.3), s1: rand(0.3, 0.36), drag: 0.6, sway: rand(2, 3.5),
      });
    }
  }

  function ripple(at: THREE.Vector3, r0 = 0.15, r1 = 1.1, life = 1.0): void {
    if (ripples.length > 40) ripples.shift();
    ripples.push({ at: at.clone(), r0, r1, life, age: 0, alpha: 0.75 });
  }

  function splash(at: THREE.Vector3): void {
    const c = col('#dff3ff');
    for (let i = 0; i < 28; i++) {
      const a = rand(0, Math.PI * 2);
      const out = rand(0.6, 1.9);
      spawn({
        p: at.clone().add(new THREE.Vector3(Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2)),
        v: new THREE.Vector3(Math.cos(a) * out, rand(2.4, 4.2), Math.sin(a) * out), frame: DOT, life: rand(0.7, 1.0), c,
        s0: rand(0.1, 0.17), s1: 0.06, g: -9, drag: 0.4,
      });
    }
    ripple(at, 0.3, 1.6, 1.1);
    ripple(at, 0.1, 0.9, 0.8);
  }

  /** A playful spray of droplets from one swimmer towards another. */
  function spray(from: THREE.Vector3, to: THREE.Vector3): void {
    const c = col('#dff3ff');
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < 14; i++) {
      const sp = rand(1.4, 2.6);
      spawn({
        p: from.clone().add(new THREE.Vector3((dx / d) * 0.3, 0.1, (dz / d) * 0.3)),
        v: new THREE.Vector3((dx / d) * sp + rand(-0.4, 0.4), rand(1.8, 3), (dz / d) * sp + rand(-0.4, 0.4)), frame: DOT,
        life: rand(0.6, 0.85), c, s0: rand(0.08, 0.13), s1: 0.05, g: -9,
      });
    }
    ripple(from, 0.15, 0.7, 0.8);
  }

  function starfall(at: THREE.Vector3): Promise<void> {
    const c = col('#ffd24a');
    let last = 0;
    return new Promise((resolve) => {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const r = rand(0.6, 1.6);
        const life = rand(0.9, 1.25) + i * 0.025;
        last = Math.max(last, life);
        const q = spawn({
          p: at.clone().add(new THREE.Vector3(Math.cos(a) * r, rand(5, 7), Math.sin(a) * r * 0.6)), frame: i % 2 ? STAR5 : STAR4,
          life, c, s0: rand(0.28, 0.4), s1: 0.18, home: true, twinkle: 12,
        });
        if (!q) continue;
        q.to.copy(at).add(new THREE.Vector3(rand(-0.15, 0.15), rand(-0.05, 0.1), rand(-0.15, 0.15)));
        if (life === last) q.onEnd = () => sparkle(at, { count: 16 });
      }
      setTimeout(resolve, last * 1000 + 60);
    });
  }

  function beam(at: THREE.Vector3, radius = 0.55): Beam {
    const b: Beam = { at: at.clone(), radius, height: 16, alpha: 0.55, shown: 0, done: false, colour: beamColour, ring: false };
    beams.push(b);
    return b;
  }

  function moonbeam(at: THREE.Vector3, ms: number): Promise<void> {
    const b = beam(at, 0.8);
    b.alpha = 0.7;
    b.colour = moonColour;
    b.ring = true;
    let left = ms / 1000;
    const glitter = () => {
      if (b.done) return;
      for (let i = 0; i < 2; i++) {
        const a = rand(0, Math.PI * 2);
        spawn({
          p: at.clone().add(new THREE.Vector3(Math.cos(a) * rand(0, 0.6), rand(0.1, 1.5), Math.sin(a) * rand(0, 0.6))),
          v: new THREE.Vector3(0, rand(0.4, 0.9), 0), frame: STAR4, life: rand(0.9, 1.4), c: col('#fff4c8'),
          s0: rand(0.12, 0.2), s1: 0.02, twinkle: 14,
        });
      }
      left -= 0.12;
      if (left > 0.3) setTimeout(glitter, 120);
    };
    glitter();
    return new Promise((resolve) =>
      setTimeout(() => {
        b.alpha = 0;
        b.done = true;
        resolve();
      }, ms),
    );
  }

  /** Steam puffs: a slightly warm white, big and many, so the too-hot egg is a clear, funny event. */
  const steamColour = col('#fff3f6');
  function steam(at: THREE.Vector3): void {
    for (let i = 0; i < 5; i++) {
      spawn({
        p: at.clone().add(new THREE.Vector3(rand(-0.16, 0.16), rand(0, 0.08), rand(-0.1, 0.1))),
        v: new THREE.Vector3(rand(-0.18, 0.18), rand(0.45, 0.7), 0), frame: DOT, life: rand(1.0, 1.4), c: steamColour,
        s0: rand(0.14, 0.2), s1: rand(0.45, 0.6), drag: 0.8, sway: rand(1.5, 2.5),
      });
    }
  }

  function frost(at: THREE.Vector3): void {
    const c = col('#bfe4ff');
    for (let i = 0; i < 4; i++) {
      const a = rand(0, Math.PI * 2);
      spawn({
        p: at.clone().add(new THREE.Vector3(Math.cos(a) * 0.32, rand(-0.2, 0.25), Math.sin(a) * 0.32)),
        v: new THREE.Vector3(Math.cos(a) * 0.2, rand(-0.1, 0.25), Math.sin(a) * 0.2), frame: STAR4, life: rand(0.9, 1.3), c,
        s0: rand(0.12, 0.2), s1: 0.03, drag: 1.5, twinkle: 9,
      });
    }
  }

  const tmp = new THREE.Vector3();
  function update(dt: number, t: number): void {
    let n = 0;
    for (let i = live.length - 1; i >= 0; i--) {
      const q = live[i];
      q.age += dt;
      if (q.age >= q.life) {
        q.onEnd?.();
        live.splice(i, 1);
      }
    }
    for (const q of live) {
      const k = q.age / q.life;
      if (q.home) {
        q.p.lerpVectors(q.from, q.to, k * k);
      } else {
        q.v.multiplyScalar(Math.exp(-q.drag * dt));
        q.v.y += q.g * dt;
        q.p.addScaledVector(q.v, dt);
        if (q.sway) q.p.x += Math.sin((t + q.life * 10) * q.sway) * 0.25 * dt;
      }
      tmp.copy(q.p);
      tmp.toArray(pos, n * 3);
      q.c.toArray(colour, n * 3);
      size[n] = q.s0 + (q.s1 - q.s0) * k;
      const fadeIn = Math.min(1, q.age / 0.12);
      const fadeOut = Math.min(1, (1 - k) / 0.35);
      alpha[n] = fadeIn * fadeOut * (q.twinkle ? 0.7 + 0.3 * Math.sin(t * q.twinkle + q.life * 50) : 1);
      frame[n] = q.frame;
      n++;
    }
    geo.setDrawRange(0, n);
    points.visible = n > 0;
    for (const [name, , w] of attrs) {
      const a = geo.getAttribute(name) as THREE.BufferAttribute;
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(1, n) * w);
      a.needsUpdate = true;
    }

    parts.clear();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      if (r.age >= r.life) {
        ripples.splice(i, 1);
        continue;
      }
      const k = r.age / r.life;
      const radius = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k));
      m.identity().at(r.at.x, r.at.y + 0.02, r.at.z).size(radius, 1, radius * 0.92);
      parts.push(B.Ripple, m, rippleColour, r.alpha * (1 - k));
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.shown += (b.alpha - b.shown) * Math.min(1, dt * 6);
      if (b.done && b.shown < 0.01) {
        beams.splice(i, 1);
        continue;
      }
      m.identity().at(b.at.x, b.at.y - 0.05, b.at.z).turn(t * 0.7).size(b.radius, b.height, b.radius);
      parts.push(B.Beam, m, b.colour, b.shown);
      if (b.ring) {
        // A soft glow on the ground and a ring that breathes, where the beam lands.
        const pulse = 1 + 0.08 * Math.sin(t * 3.2);
        m.identity().at(b.at.x, b.at.y + 0.015, b.at.z).tilt(-Math.PI / 2).size(b.radius * 1.5 * pulse);
        parts.push(B.Soft, m, glowColour, b.shown * 0.75);
        m.identity().at(b.at.x, b.at.y + 0.03, b.at.z).size(b.radius * 1.15 * pulse, 1, b.radius * 1.15 * pulse);
        parts.push(B.Ripple, m, ringColour, b.shown * 1.2);
      }
    }
  }

  const warmables = () => [{ geometry: geo, material: mat, points: true as const }];
  return { sparkle, hearts, splash, starfall, moonbeam, steam, frost, spray, ripple, beam, parts, update, warmables };
}
