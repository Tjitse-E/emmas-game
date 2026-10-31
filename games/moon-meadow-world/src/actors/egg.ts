// The egg: a smooth lathe shell (bottom and top halves, split along a zigzag crack line) with a painted canvas
// texture, and a sleepy face drawn from the shared parts. It wobbles, steams, frosts and hatches, and glows more with
// each of its three hearts (docs/v4/2.3.md sections 12 and 19.1). 2.4.0: the trail's star egg has its own shell, a
// night lilac with gold stars and a crescent moon, and glows a starry gold.
import * as THREE from 'three';
import type { Egg3D, EggKind } from '../contracts';
import { B, PartList, Xf, col, rimLambert } from './parts';
import type { FxImpl } from './fx';
import { damp } from './motion';

const H = 0.6; // egg height
const R = 0.215; // widest radius
const CRACK = 0.62; // where the shell splits, as a fraction of the height
const TEETH = 8;
const RADIAL = 22;

/** Egg outline: s from 0 (bottom) to 1 (top). Wider low down, as a real egg. */
function outline(s: number): { r: number; y: number; dr: number; dy: number } {
  const a = Math.PI * s;
  const y = (H * (1 - Math.cos(a))) / 2;
  const dy = (H * Math.PI * Math.sin(a)) / 2;
  const shape = 1 - 0.2 * s;
  const r = R * Math.sin(a) * shape * 1.08;
  const dr = R * 1.08 * (Math.PI * Math.cos(a) * shape - 0.2 * Math.sin(a));
  return { r, y, dr, dy };
}

/** The crack line height (as s) at an angle: a zigzag round the egg. */
function crackS(th: number): number {
  const f = ((th / (Math.PI * 2)) * TEETH) % 1;
  return CRACK + (Math.abs(f - 0.5) * 2 - 0.5) * 0.09;
}

/** One piece of the shell between s0 and s1 (either may follow the crack). UVs wrap the canvas round the egg. */
function shellPiece(from: (th: number) => number, to: (th: number) => number, rows: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i <= rows; i++) {
    for (let k = 0; k <= RADIAL; k++) {
      const th = (k / RADIAL) * Math.PI * 2;
      const s = from(th) + (to(th) - from(th)) * (i / rows);
      const o = outline(s);
      pos.push(Math.sin(th) * o.r, o.y - H / 2, Math.cos(th) * o.r);
      const n = new THREE.Vector3(o.dy * Math.sin(th), -o.dr, o.dy * Math.cos(th));
      if (n.lengthSq() < 1e-8) n.set(0, s < 0.5 ? -1 : 1, 0);
      n.normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(k / RADIAL, s);
    }
  }
  const index: number[] = [];
  const w = RADIAL + 1;
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < RADIAL; k++) {
      const a = i * w + k;
      index.push(a, a + 1, a + w, a + 1, a + w + 1, a + w);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

/** Paint the shell: a soft gradient with gold stars (warm and star) or snowflake dots (snow), plus cracks so far. */
function paint(g: CanvasRenderingContext2D, kind: EggKind, cracks: number): void {
  const W = g.canvas.width;
  const Hh = g.canvas.height;
  const grad = g.createLinearGradient(0, Hh, 0, 0);
  if (kind === 'warm') {
    grad.addColorStop(0, '#ffd2b8');
    grad.addColorStop(0.55, '#ffd0cf');
    grad.addColorStop(1, '#ffc0dc');
  } else if (kind === 'star') {
    // A night sky at dusk: deep lilac at the bottom to a soft periwinkle at the top.
    grad.addColorStop(0, '#9f86e8');
    grad.addColorStop(0.6, '#b9a6f4');
    grad.addColorStop(1, '#d6ccff');
  } else {
    grad.addColorStop(0, '#bfe0fb');
    grad.addColorStop(1, '#e2f2ff');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, W, Hh);
  // Fixed pattern (a seeded walk), so the egg looks the same every time.
  let seed = kind === 'warm' ? 7 : kind === 'star' ? 23 : 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = Hh * (0.12 + rnd() * 0.8);
    // Leave the face (front, middle height) clear.
    const u = x / W;
    if (Math.abs(u - 0) < 0.12 || Math.abs(u - 1) < 0.12) {
      if (y > Hh * 0.35 && y < Hh * 0.75) continue;
    }
    const s = 7 + rnd() * 7;
    g.save();
    g.translate(x, y);
    g.rotate(rnd() * Math.PI);
    if (kind === 'warm' || kind === 'star') {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? s * 0.45 : s;
        const a = (k / 10) * Math.PI * 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fillStyle = kind === 'star' ? '#ffe27a' : '#ffc93f';
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = kind === 'star' ? '#f0b53a' : '#e8a52a';
      g.stroke();
    } else {
      g.lineCap = 'round';
      // A soft blue edge under each white flake so it shows on the pale shell.
      for (const [colour, w] of [['#9ccbf0', 4.2], ['#ffffff', 2.2]] as const) {
        g.strokeStyle = colour;
        g.lineWidth = w;
        for (let k = 0; k < 3; k++) {
          g.rotate(Math.PI / 3);
          g.beginPath();
          g.moveTo(-s, 0);
          g.lineTo(s, 0);
          g.stroke();
        }
      }
      g.beginPath();
      g.arc(0, 0, 2.4, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
    }
    g.restore();
  }
  if (kind === 'star') {
    // A small gold crescent moon on its back, away from the face.
    g.save();
    g.translate(W * 0.5, Hh * 0.5);
    g.beginPath();
    g.arc(0, 0, 18, 0, Math.PI * 2);
    g.arc(7, -5, 15, 0, Math.PI * 2, true);
    g.fillStyle = '#ffe27a';
    g.fill('evenodd');
    g.restore();
  }
  // Cracks grow from the crack line: 1 small, 2 more, 3 all the way round.
  if (cracks > 0) {
    g.strokeStyle = '#a0624a';
    g.lineWidth = 3;
    g.lineJoin = 'round';
    const y0 = Hh * (1 - CRACK);
    const spans = cracks === 1 ? [[0.03, 0.14]] : cracks === 2 ? [[0.88, 1.0], [0.0, 0.2], [0.42, 0.55]] : [[0, 1]];
    for (const [a, b] of spans) {
      g.beginPath();
      const n = Math.round((b - a) * TEETH * 2);
      for (let i = 0; i <= n; i++) {
        const u = a + ((b - a) * i) / n;
        const f = (u * TEETH) % 1;
        g.lineTo(u * W, y0 - (Math.abs(f - 0.5) * 2 - 0.5) * 0.09 * Hh);
      }
      g.stroke();
    }
  }
}

export interface EggImpl extends Egg3D {
  readonly parts: PartList;
  update(dt: number, t: number): void;
  /** Its two shell pieces with their material (and the shell's texture), for the actors' start-up draw (2.4.0). */
  warmables(): { geometry: THREE.BufferGeometry; material: THREE.Material }[];
}

/**
 * The glow and the idle rock of each number of lit hearts: the warm egg glows a warmer gold, the snow egg a frostier
 * blue (its story is that it is too warm, so a heart makes it more of a snow egg). `glow` is the shell's emissive
 * strength, `edge` how much of the warm egg's rim takes the glow colour, `rock` the idle rocking in radians.
 */
export const HEART_GLOW = {
  colour: { warm: '#ffb52e', snow: '#9fd6ff', star: '#ffd86b' },
  glow: [0, 0.14, 0.26, 0.4],
  edge: [0, 0.25, 0.4, 0.55],
  rock: [0, 0.03, 0.055, 0.085],
} as const;
/**
 * The snow egg's own blue rim (deeper, so the pale egg shows on the sand). It keeps it with every heart: the frost
 * shows through the glow only, so the egg never goes pale-rimmed on pale ground.
 */
const SNOW_EDGE = '#5d9ee6';

export function createEgg(scene: THREE.Scene, fx: FxImpl): EggImpl {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  const mat = rimLambert({ map: tex, side: THREE.DoubleSide }, 0.35);
  // The snow egg gets a deeper blue edge (towards its outline), so the pale egg stands out on the pale sand.
  const edge = { value: new THREE.Vector4(0, 0, 0, 0) };
  const rim = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, renderer) => {
    rim.call(mat, sh, renderer);
    sh.uniforms.uEdge = edge;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uEdge;').replace(
      '#include <opaque_fragment>',
      `outgoingLight = mix( outgoingLight, uEdge.rgb, uEdge.a * pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 1.6 ) );
      #include <opaque_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => 'egg-shell';
  const snowEdge = new THREE.Color(SNOW_EDGE);
  const heartColour = new THREE.Color();
  const bottom = new THREE.Mesh(shellPiece(() => 0, crackS, 12), mat);
  const top = new THREE.Mesh(shellPiece(crackS, () => 1, 6), mat);
  for (const m of [bottom, top]) {
    m.name = 'actors-egg';
    m.matrixAutoUpdate = false;
    m.visible = false;
    scene.add(m);
  }

  const parts = new PartList(16);
  const position = new THREE.Vector3();
  let kind: EggKind = 'warm';
  let shown = false;
  let cracks = 0;
  let wobbleAmp = 0;
  let wobbleRate = 9;
  let heat = 0; // red cheeks
  let cold = 0; // frosty tint
  let steamLeft = 0;
  let frostLeft = 0;
  let popT = -1; // seconds since the top popped off
  let burst = 1; // bottom shell scale after the burst
  let breathe = 0;
  /** Hearts lit (0 to 3), and the glow easing towards them. */
  let lit = 0;
  let glow = 0;
  const frostTint = col('#bfe0ff');
  const white = col('#ffffff');
  const lash = col('#6b3c3a');
  const cheek = col('#ff9ab8');
  const hotCheek = col('#ff4f6a');
  const shadow = col('#2e4a2b');
  const m = new Xf();
  const base = new Xf();
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  function repaint(): void {
    paint(g, kind, cracks);
    tex.needsUpdate = true;
  }

  const egg: EggImpl = {
    parts,
    position,
    warmables: () => [bottom, top].map((m) => ({ geometry: m.geometry, material: mat })),
    get visible() {
      return shown;
    },
    place(at, k: EggKind) {
      kind = k;
      cracks = 0;
      popT = -1;
      burst = 1;
      heat = cold = 0;
      lit = 0;
      glow = 0;
      repaint();
      // `at` is the egg's centre; a point on the grass (y near 0) lifts it so it rests on the ground.
      position.set(at.x, Math.max(at.y, H / 2), at.z);
      shown = true;
      bottom.visible = top.visible = true;
    },
    hide() {
      shown = false;
      lit = 0;
      glow = 0;
      bottom.visible = top.visible = false;
    },
    async wobble() {
      wobbleAmp = 0.16;
      wobbleRate = 10;
      await wait(800);
    },
    // A heart lights: a happy wobble and a sparkle in the glow colour, then it glows and rocks a little more.
    hearts(n) {
      const next = Math.max(0, Math.min(3, Math.round(n)));
      if (next > lit && shown) {
        wobbleAmp = 0.12;
        wobbleRate = 10;
        fx.sparkle(position.clone().setY(position.y + 0.15), { count: 10 + next * 4, colour: HEART_GLOW.colour[kind] });
      }
      lit = next;
    },
    async steam() {
      heat = 1;
      wobbleAmp = 0.1;
      wobbleRate = 14;
      steamLeft = 1.5;
      await wait(1700);
    },
    async frost() {
      cold = 1;
      frostLeft = 1.5;
      await wait(1700);
    },
    async hatch() {
      cracks = 1;
      repaint();
      wobbleAmp = 0.14;
      wobbleRate = 11;
      await wait(550);
      cracks = 2;
      repaint();
      wobbleAmp = 0.18;
      await wait(550);
      cracks = 3;
      repaint();
      wobbleAmp = 0.32;
      wobbleRate = 13;
      await wait(800);
      popT = 0;
      fx.sparkle(position.clone().setY(position.y + 0.1), { count: 30 });
      fx.sparkle(position.clone().setY(position.y + 0.25), { count: 16, colour: '#ff9fd0' });
      fx.hearts(position.clone().setY(position.y + 0.3));
    },
    update(dt, t) {
      parts.clear();
      if (!shown) return;
      breathe = Math.sin(t * 2.2) * 0.012;
      wobbleAmp = damp(wobbleAmp, 0, 2.2, dt);
      heat = damp(heat, 0, steamLeft > 0 ? 0 : 1.2, dt);
      cold = damp(cold, 0, frostLeft > 0 ? 0 : 1.0, dt);
      if (steamLeft > 0) {
        steamLeft -= dt;
        if (Math.random() < dt * 5) fx.steam(position.clone().setY(position.y + H * 0.45));
      }
      if (frostLeft > 0) {
        frostLeft -= dt;
        if (Math.random() < dt * 10) fx.frost(position);
      }
      mat.color.copy(white).lerp(frostTint, cold * 0.75);
      // The hearts' glow breathes gently, so the egg looks alive and warm (or frosty) inside.
      glow = damp(glow, lit, 3, dt);
      const g = glowAt(HEART_GLOW.glow, glow) * (1 + 0.15 * Math.sin(t * 3.1));
      heartColour.set(HEART_GLOW.colour[kind]);
      mat.emissive.copy(heartColour);
      mat.emissiveIntensity = g;
      const e = glowAt(HEART_GLOW.edge, glow);
      if (kind === 'snow') edge.value.set(snowEdge.r, snowEdge.g, snowEdge.b, 0.6);
      else edge.value.set(heartColour.r, heartColour.g, heartColour.b, e);
      const shiver = frostLeft > 0 ? Math.sin(t * 60) * 0.02 * cold : 0;
      const rock = Math.sin(t * wobbleRate) * wobbleAmp + Math.sin(t * 3.4) * glowAt(HEART_GLOW.rock, glow);
      if (popT >= 0) {
        popT += dt;
        burst = Math.max(0, 1 - popT / 0.25);
        if (popT > 0.9) egg.hide();
      }
      // Rock about the bottom of the egg.
      base
        .identity()
        .at(position.x + shiver, position.y - H / 2, position.z)
        .roll(rock)
        .tilt(rock * 0.4)
        .at(0, H / 2, 0)
        .size(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
      bottom.matrix.copy(base).multiply(_s.makeScale(burst, burst, burst));
      bottom.matrixWorldNeedsUpdate = true;
      if (popT >= 0) {
        const k = popT;
        top.matrix
          .copy(base)
          .multiply(_s.makeTranslation(0.2 * k, 2.6 * k - 4.9 * k * k + 0.1, 0.1 * k))
          .multiply(_s.makeRotationZ(-k * 5))
          .multiply(_s.makeScale(Math.max(0, 1 - k / 0.9), Math.max(0, 1 - k / 0.9), Math.max(0, 1 - k / 0.9)));
      } else top.matrix.copy(base);
      top.matrixWorldNeedsUpdate = true;
      bottom.visible = burst > 0.01;

      // Shadow and the sleepy face (closed happy eyes, cheeks, a tiny smile).
      m.identity().at(position.x, position.y - H / 2 + 0.012, position.z).tilt(-Math.PI / 2).size(0.26 * burst + 0.001);
      parts.push(B.Soft, m, shadow, 0.3);
      if (popT >= 0) return;
      for (const sx of [-1, 1]) {
        const s = 0.44;
        const o = outline(s);
        const th = sx * 0.36;
        const eye = m
          .from(base)
          .at(Math.sin(th) * o.r, o.y - H / 2, Math.cos(th) * o.r)
          .turn(th);
        const squeeze = cold > 0.3 ? 0.6 : 1;
        eye.at(0, 0, 0.004).roll(Math.PI).size(0.042, 0.026 * squeeze, 1);
        parts.push(B.Arc, m, lash, 0);
        const so = outline(0.36);
        const ct = sx * 0.62;
        m.from(base)
          .at(Math.sin(ct) * so.r, so.y - H / 2, Math.cos(ct) * so.r)
          .turn(ct)
          .at(0, 0, 0.006)
          .size(0.04 + heat * 0.012, 0.03 + heat * 0.01, 1);
        parts.push(B.Soft, m, heat > 0.2 ? hotCheek : cheek, 0.55 + heat * 0.35);
      }
      const mo = outline(0.37);
      m.from(base)
        .at(0, mo.y - H / 2, mo.r + 0.004)
        .tilt(-0.25)
        .roll(Math.PI)
        .size(0.022 + Math.sin(t * 50) * 0.003 * cold, 0.014, 1);
      parts.push(B.Arc, m, lash, 0);
    },
  };
  return egg;
}

const _s = new THREE.Matrix4();

/** A table of four values (0 to 3 hearts) at a fractional number of hearts. */
function glowAt(table: readonly number[], at: number): number {
  const i = Math.min(2, Math.floor(at));
  return table[i] + (table[i + 1] - table[i]) * (at - i);
}
