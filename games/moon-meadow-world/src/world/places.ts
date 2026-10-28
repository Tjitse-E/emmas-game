// Lumi's gazebo, the Dressing Corner at its step, the saddle sign, the royal picnic, the nest on its mound, the pond
// with its toys and the slide. Static parts go into the merged scenery; the water, the ducks and the boat are their own
// small meshes because they move. The trunk lid moves inside its merged region (cornerLid), with no mesh of its own.
import * as THREE from 'three';
import { CORNER, GAZEBO, MIST, NEST, PICNIC, POND, SLIDE, SLIDE_CURVE } from '../layout';
import { Scenery, blob, canvasTexture, faceUp, merge, paint, paintBy, paintY, place, rng, type Geo } from './geo';
import { MOUND, grassColour, groundHeight, moundHeight } from './terrain';

const tmp = new THREE.Color();

// ---------------------------------------------------------------------------------------------------------------
// Lumi's gazebo
// ---------------------------------------------------------------------------------------------------------------

function heartShape(s: number): THREE.Shape {
  const h = new THREE.Shape();
  h.moveTo(0, -0.9 * s);
  h.bezierCurveTo(-0.15 * s, -0.7 * s, -1.0 * s, -0.25 * s, -0.95 * s, 0.25 * s);
  h.bezierCurveTo(-0.9 * s, 0.85 * s, -0.15 * s, 0.95 * s, 0, 0.45 * s);
  h.bezierCurveTo(0.15 * s, 0.95 * s, 0.9 * s, 0.85 * s, 0.95 * s, 0.25 * s);
  h.bezierCurveTo(1.0 * s, -0.25 * s, 0.15 * s, -0.7 * s, 0, -0.9 * s);
  return h;
}

/** A heart standing up, facing south (the camera). */
function heart(size: number, depth: number, colour: string): Geo {
  const g = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: size * 0.08, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  return paint(g, colour);
}

export function buildGazebo(scenery: Scenery): void {
  const { x, z } = GAZEBO.center;
  const parts: Geo[] = [];
  const at = (g: Geo, o: Parameters<typeof place>[1]): void => void parts.push(place(g, { ...o, x: x + (o.x ?? 0), z: z + (o.z ?? 0) }));

  // Round floor with a pink step.
  at(paintY(new THREE.CylinderGeometry(2.95, 3.05, 0.14, 28), '#f2b5cc', '#f9cfe0', -0.07, 0.07), { y: 0.07 });
  at(paintY(new THREE.CylinderGeometry(2.6, 2.7, 0.2, 28), '#fbe7ee', '#fff8fa', -0.1, 0.1), { y: 0.24 });
  // Eight white pillars with gold rings.
  const PILLAR_R = 2.3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * PILLAR_R;
    const pz = Math.sin(a) * PILLAR_R;
    at(paintY(new THREE.CylinderGeometry(0.11, 0.13, 2.55, 8), '#fbe6f0', '#fffafc', -1.2, 1.2), { x: px, y: 1.6, z: pz });
    at(paint(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 8), '#f5d58e'), { x: px, y: 0.4, z: pz });
    at(paint(new THREE.CylinderGeometry(0.18, 0.14, 0.14, 8), '#f5d58e'), { x: px, y: 2.84, z: pz });
  }
  // The ring beam, and a candy-striped scalloped valance under the dome.
  at(paint(new THREE.CylinderGeometry(2.48, 2.48, 0.22, 28, 1, true), '#ffffff'), { y: 3.0 });
  {
    const N = 64;
    const p: number[] = [];
    const c: number[] = [];
    const idx: number[] = [];
    const pink = new THREE.Color('#f78fb8');
    const white = new THREE.Color('#fff7fb');
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const col = Math.floor(i / 4) % 2 === 0 ? pink : white;
      // Scallops: each stripe hangs down in a soft curve.
      const k0 = (i % 4) / 4;
      const k1 = ((i % 4) + 1) / 4;
      const drop = (k: number): number => -0.22 - 0.12 * Math.sin(k * Math.PI);
      const R = 2.62;
      const base = p.length / 3;
      p.push(Math.cos(a0) * R, 0, Math.sin(a0) * R, Math.cos(a1) * R, 0, Math.sin(a1) * R);
      p.push(Math.cos(a0) * R, drop(k0), Math.sin(a0) * R, Math.cos(a1) * R, drop(k1), Math.sin(a1) * R);
      for (let k = 0; k < 4; k++) c.push(col.r, col.g, col.b);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    at(g, { y: 3.1 });
  }
  // The pink dome with a gold finial and a heart on top.
  {
    const prof = [
      [2.75, 0], [2.62, 0.22], [2.3, 0.62], [1.8, 1.05], [1.2, 1.42], [0.7, 1.7], [0.35, 1.92], [0.12, 2.12], [0.001, 2.2],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const dome = new THREE.LatheGeometry(prof, 24);
    at(paintY(dome, '#f49ac0', '#ffd0e4', 0, 2.2), { y: 3.1 });
    at(paint(new THREE.SphereGeometry(0.16, 10, 8), '#f6d277'), { y: 5.35 });
    at(heart(0.32, 0.1, '#ff7fb0'), { y: 5.85 });
  }
  // A cushion inside. The lilac trunk moved out to the south step (2.3.0): the Dressing Corner, buildCorner below.
  at(paintY(new THREE.SphereGeometry(0.42, 10, 6), '#ff9cc4', '#ffc4dc', -0.2, 0.2), { x: -0.7, y: 0.42, z: 0.9, sy: 0.38 });
  // Pots of pink flowers round the step, moved out to 0.2 and 0.8 pi so the trunk and the mirror have the step.
  for (const a of [Math.PI * 0.2, Math.PI * 0.8]) {
    const px = Math.cos(a) * 3.15;
    const pz = Math.sin(a) * 3.15;
    at(paint(new THREE.CylinderGeometry(0.24, 0.18, 0.32, 10), '#f4b183'), { x: px, y: 0.16, z: pz });
    at(paintBy(blob(0.32, 1), (_x, y, _z, out) => out.set(y > 0.12 ? '#ff9cc8' : '#7fc77d')), { x: px, y: 0.5, z: pz });
  }
  for (const g of parts) scenery.add(g);
}

// ---------------------------------------------------------------------------------------------------------------
// The Dressing Corner (2.3.0) at the gazebo's south step: the lilac trunk and a standing mirror
// ---------------------------------------------------------------------------------------------------------------

/**
 * The trunk: body and lid sizes in metres, and its turn (towards the south-east, so its front faces her spot and the
 * camera). The lid is a half cylinder hinged along the body's back top edge; open, it stands up behind it.
 */
export const TRUNK = { w: 0.76, h: 0.4, d: 0.46, yaw: 0.75, openAngle: -1.95 } as const;
/** The mirror turns towards her spot from the east side of the step. */
export const MIRROR = { yaw: -0.75, y: 1.12, rx: 0.36, ry: 0.5 } as const;
/** The key of the lid among the scenery's movable parts. */
export const LID_KEY = 'trunk-lid';
/** The region the Corner is merged into (the meadow's middle west). */
export const CORNER_REGION = Scenery.regionOf(CORNER.trunk.x, CORNER.trunk.z);

const LILAC = { deep: '#a98ae0', base: '#c3a9f2', light: '#dccbff' } as const;
const GOLD = '#f2cf74';

/** The trunk's body, gold bands and heart clasp, in the trunk's own space (front towards +z). */
function trunkBody(): Geo[] {
  const { w, h, d } = TRUNK;
  const parts: Geo[] = [];
  // The top face is the pink satin inside, seen when the lid opens; the sides a lilac gradient.
  const body = paint(new THREE.BoxGeometry(w, h, d).toNonIndexed(), LILAC.base);
  parts.push(place(paintFaces(body, (_x, y, _z, out) => {
    if (y > h / 2 - 1e-3) out.set('#ffd2e6');
    else out.set(LILAC.deep).lerp(tmp.set(LILAC.light), THREE.MathUtils.clamp((y + h / 2) / h, 0, 1));
  }), { y: h / 2 }));
  for (const dx of [-0.25, 0.25]) parts.push(place(paint(new THREE.BoxGeometry(0.07, h + 0.01, d + 0.02), GOLD), { x: dx, y: h / 2 }));
  parts.push(place(heart(0.07, 0.03, '#f5c95c'), { y: h - 0.1, z: d / 2 + 0.015 }));
  // Little gold feet.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    parts.push(place(paint(new THREE.SphereGeometry(0.035, 5, 3), GOLD), { x: sx * (w / 2 - 0.05), y: 0.02, z: sz * (d / 2 - 0.05) }));
  }
  return parts;
}

/**
 * The lid in the hinge's own space: the hinge line is the x axis, the closed lid lies towards +z. A half cylinder
 * with its satin underside, the gold bands over it and a gold lip at the front.
 */
export function lidGeometry(): Geo {
  const { w, d } = TRUNK;
  const r = d / 2;
  const parts: Geo[] = [];
  // The half cylinder lies along x, its dome up (as 2.2's trunk lid).
  parts.push(place(paintY(new THREE.CylinderGeometry(r, r, w, 10, 1, false, 0, Math.PI), LILAC.base, LILAC.light, -r, r), { z: r, rz: Math.PI / 2 }));
  parts.push(place(paint(new THREE.PlaneGeometry(w, d), '#ffc4dc'), { y: 0.002, z: r, rx: Math.PI / 2 }));
  for (const dx of [-0.25, 0.25]) {
    parts.push(place(paint(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.07, 10, 1, true, 0, Math.PI), GOLD), { x: dx, z: r, rz: Math.PI / 2 }));
  }
  parts.push(place(paint(new THREE.BoxGeometry(0.14, 0.05, 0.025), GOLD), { y: 0.01, z: d + 0.01 }));
  return merge(parts);
}

/** Where the hinge stands in the world, and its turn. */
export function hingeMatrix(out = new THREE.Matrix4()): THREE.Matrix4 {
  const { h, d, yaw } = TRUNK;
  const m = new THREE.Matrix4().makeTranslation(CORNER.trunk.x, 0, CORNER.trunk.z).multiply(new THREE.Matrix4().makeRotationY(yaw));
  return out.copy(m.multiply(new THREE.Matrix4().makeTranslation(0, h, -d / 2)));
}

/** The standing mirror in its own space (glass towards +z): a base, a post, an oval gold frame and the glass. */
export function mirrorGeometry(): Geo[] {
  const { y, rx, ry } = MIRROR;
  const parts: Geo[] = [];
  parts.push(place(paintY(new THREE.CylinderGeometry(0.24, 0.29, 0.07, 10), '#e9c766', '#f8e3a0', -0.035, 0.035), { y: 0.035 }));
  parts.push(place(paint(new THREE.CylinderGeometry(0.032, 0.045, y - ry, 6), GOLD), { y: (y - ry) / 2 + 0.05 }));
  parts.push(place(paintBy(new THREE.TorusGeometry(1, 0.11, 5, 20), (px, py, _z, out) => {
    out.set('#f0c75c').lerp(tmp.set('#fff0b8'), THREE.MathUtils.clamp(0.5 + 0.5 * (py - px) * 0.7, 0, 1));
  }), { y, sx: rx, sy: ry, sz: 0.4 }));
  // The glass: a soft lilac sky with a white glint, and a lilac back.
  parts.push(place(paintBy(new THREE.CircleGeometry(1, 18), (px, py, _z, out) => {
    out.set('#d8e6ff').lerp(tmp.set('#f4ecff'), THREE.MathUtils.clamp(0.5 + py * 0.5, 0, 1));
    if (Math.abs(px + py * 0.6 + 0.25) < 0.16) out.set('#ffffff');
  }), { y, z: 0.01, sx: rx * 0.97, sy: ry * 0.97 }));
  parts.push(place(paint(new THREE.CircleGeometry(1, 12), LILAC.deep), { y, z: -0.012, ry: Math.PI, sx: rx, sy: ry }));
  parts.push(place(paint(new THREE.SphereGeometry(0.05, 6, 4), '#ff9cc8'), { y: y + ry + 0.06 }));
  return parts;
}

/**
 * The Dressing Corner's trunk and mirror, merged into the middle west region with the gazebo: no draw call of their
 * own. The lid is a movable part of that region (cornerLid moves it).
 */
export function buildCorner(scenery: Scenery): void {
  const trunk = new THREE.Matrix4().makeTranslation(CORNER.trunk.x, 0, CORNER.trunk.z).multiply(new THREE.Matrix4().makeRotationY(TRUNK.yaw));
  for (const g of trunkBody()) scenery.add(g.applyMatrix4(trunk), CORNER_REGION);
  scenery.addMovable(lidGeometry().applyMatrix4(hingeMatrix()), CORNER_REGION, LID_KEY);
  const mirror = new THREE.Matrix4().makeTranslation(CORNER.mirror.x, 0, CORNER.mirror.z).multiply(new THREE.Matrix4().makeRotationY(MIRROR.yaw));
  for (const g of mirrorGeometry()) scenery.add(g.applyMatrix4(mirror), CORNER_REGION);
}

export interface CornerLid {
  /** Open (true) or close the lid over `ms` (0.6 s). Resolves when it is there. */
  set(open: boolean, ms?: number): Promise<void>;
  /** 0 closed, 1 open. */
  readonly open: number;
  update(dt: number): void;
}

/**
 * The trunk lid's hinge: it rewrites the lid's vertices inside the merged region mesh (only that range is uploaded),
 * so opening it costs no draw call.
 */
export function cornerLid(scenery: Scenery): CornerLid {
  const part = scenery.movable(LID_KEY);
  const local = lidGeometry();
  const lp = local.attributes.position;
  const ln = local.attributes.normal;
  const hinge = hingeMatrix();
  const turn = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  let open = 0;
  let tween: { from: number; to: number; ms: number; t: number; done: () => void } | null = null;
  const pose = (k: number): void => {
    if (!part) return;
    const geo = part.mesh.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const nor = geo.attributes.normal as THREE.BufferAttribute;
    m.multiplyMatrices(hinge, turn.makeRotationX(TRUNK.openAngle * k));
    nm.getNormalMatrix(m);
    for (let i = 0; i < part.count; i++) {
      v.fromBufferAttribute(lp, i).applyMatrix4(m);
      pos.setXYZ(part.start + i, v.x, v.y, v.z);
      v.fromBufferAttribute(ln, i).applyMatrix3(nm).normalize();
      nor.setXYZ(part.start + i, v.x, v.y, v.z);
    }
    for (const a of [pos, nor]) {
      a.clearUpdateRanges();
      a.addUpdateRange(part.start * 3, part.count * 3);
      a.needsUpdate = true;
    }
  };
  const ease = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  return {
    get open() {
      return open;
    },
    set(on, ms = 600) {
      tween?.done();
      const to = on ? 1 : 0;
      if (ms <= 0 || to === open) {
        tween = null;
        open = to;
        pose(open);
        return Promise.resolve();
      }
      return new Promise((done) => {
        tween = { from: open, to, ms, t: 0, done };
      });
    },
    update(dt) {
      if (!tween) return;
      const tw = tween;
      tw.t += dt * 1000;
      const k = Math.min(1, tw.t / tw.ms);
      // Opening swings up with a little overshoot feel (ease), closing comes down softly.
      open = tw.from + (tw.to - tw.from) * ease(k);
      pose(open);
      if (k >= 1) {
        tween = null;
        tw.done();
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The saddle sign at the moon mist (2.3.0): what opens next
// ---------------------------------------------------------------------------------------------------------------

/** The sign's board, in metres: its picture's size and height. */
export const SIGN = { board: { w: 1.0, h: 0.78, y: 1.32 }, pic: { w: 0.86, h: 0.64 } } as const;

/** The sign's post and wooden board frame, merged into its region (the north-east). */
export function signGeometry(): Geo[] {
  const { board } = SIGN;
  const parts: Geo[] = [];
  parts.push(place(paintY(new THREE.BoxGeometry(0.1, board.y, 0.1), '#9b6a42', '#c08a5c', -board.y / 2, board.y / 2), { y: board.y / 2 }));
  parts.push(place(paintY(new THREE.BoxGeometry(board.w, board.h, 0.07), '#b57d4e', '#d9a46f', -board.h / 2, board.h / 2), { y: board.y }));
  // A little gold star on top: the sign of something new.
  parts.push(place(paint(new THREE.OctahedronGeometry(0.09), '#ffd36b'), { y: board.y + board.h / 2 + 0.1, sz: 0.4 }));
  return parts;
}

export interface SignBoard {
  readonly mesh: THREE.Mesh;
  /** A soft glow over the picture for a moment (a tap). */
  shimmer(): void;
  update(dt: number, t: number): void;
}

/**
 * The saddle sign at MIST.sign: the post and frame in the scenery, the picture (v3's saddle on a cream board) its
 * own small mesh, drawn only while in view. Its material has the stable plaques' features (a map, an emissive map and
 * an alpha test), so it compiles no new shader program.
 */
export function buildSign(scenery: Scenery, picUrl: string): SignBoard {
  const at = new THREE.Matrix4().makeTranslation(MIST.sign.x, 0, MIST.sign.z);
  for (const g of signGeometry()) scenery.add(g.applyMatrix4(at), Scenery.regionOf(MIST.sign.x, MIST.sign.z));
  const W = 256;
  const H = 192;
  const drawBoard = (ctx: CanvasRenderingContext2D, img?: HTMLImageElement): void => {
    ctx.fillStyle = '#fff6e2';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ff9cc8';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    if (img && img.naturalWidth) {
      const k = Math.min((W - 36) / img.naturalWidth, (H - 32) / img.naturalHeight);
      const iw = img.naturalWidth * k;
      const ih = img.naturalHeight * k;
      ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
    }
  };
  let ctx2d: CanvasRenderingContext2D | null = null;
  const tex = canvasTexture(W, H, (ctx) => {
    ctx2d = ctx;
    drawBoard(ctx);
  });
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => {
      if (!ctx2d) return;
      drawBoard(ctx2d, img);
      tex.needsUpdate = true;
    };
    img.src = picUrl;
  }
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIGN.pic.w, SIGN.pic.h), mat);
  mesh.name = 'sign-picture';
  mesh.position.set(MIST.sign.x, SIGN.board.y, MIST.sign.z + 0.037);
  mesh.updateMatrix();
  mesh.matrixAutoUpdate = false;
  let glow = 0;
  return {
    mesh,
    shimmer() {
      glow = 1;
    },
    update(dt, t) {
      if (glow <= 0) return;
      glow = Math.max(0, glow - dt / 1.6);
      mat.emissiveIntensity = 0.12 + glow * (0.45 + 0.25 * Math.sin(t * 14));
    },
  };
}

/** The rug's top, and the round-cornered square cushions on its two seats. */
const RUG_Y = 0.022;
const CUSHION = { half: 0.3, height: 0.12 } as const;
/** How far a superellipse of power 4 reaches at angle a (1 on the axes, 1.19 at the corners): a soft square. */
const squircle = (a: number): number => 1 / Math.pow(Math.cos(a) ** 4 + Math.sin(a) ** 4, 0.25);

/**
 * The ground under a picnic guest: the rug's top on the rug and a soft dome on each cushion (a little lower than the
 * cushion itself, as feet sink in), so the babies sit on their cushions. 0 elsewhere.
 */
export function picnicHeight(x: number, z: number): number {
  const { center, halfX, halfZ } = PICNIC.rug;
  if (Math.abs(x - center.x) > halfX || Math.abs(z - center.z) > halfZ) return 0;
  let h = RUG_Y;
  for (const s of PICNIC.seats) {
    const dx = x - s.x;
    const dz = z - s.z;
    const r = Math.hypot(dx, dz) / (CUSHION.half * squircle(Math.atan2(dz, dx)));
    if (r < 1) h = Math.max(h, RUG_Y + CUSHION.height * 0.85 * Math.sqrt(1 - r * r));
  }
  return h;
}

const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const turn = new THREE.Quaternion();
/** Turn a part built along +y (a cone, a strand) so it points along (x, y, z). */
export function aim(g: Geo, x: number, y: number, z: number): Geo {
  return g.applyQuaternion(turn.setFromUnitVectors(UP, dir.set(x, y, z).normalize()));
}

/** Colour every triangle of a non-indexed part by its centre (crisp checks and weaves). */
function paintFaces(g: Geo, fn: (x: number, y: number, z: number, out: THREE.Color) => void): Geo {
  const p = g.attributes.position;
  const c = g.attributes.color;
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    fn(x, y, z, tmp);
    for (let k = 0; k < 3; k++) c.setXYZ(i + k, tmp.r, tmp.g, tmp.b);
  }
  return g;
}

/** Pink gingham, nx by nz checks: white, light pink where one stripe runs, deep pink where two cross. */
const GINGHAM = ['#fff8fb', '#ffc4dc', '#ff8fbd'];
function gingham(w: number, d: number, nx: number, nz: number): Geo {
  const g = paint(new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2).toNonIndexed(), GINGHAM[0]);
  return paintFaces(g, (x, _y, z, out) => {
    const i = Math.floor(((x + w / 2) / w) * nx);
    const j = Math.floor(((z + d / 2) / d) * nz);
    out.set(GINGHAM[(i % 2) + (j % 2)]);
  });
}

/** A plump cushion with a soft square outline, a button and a gold pompom on each corner. */
function cushion(colour: string, light: string, button: string): Geo[] {
  const g = new THREE.SphereGeometry(1, 16, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = Math.hypot(x, z) > 1e-6 ? squircle(Math.atan2(z, x)) : 1;
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  g.computeVertexNormals();
  const parts = [place(paintY(g, colour, light, 0, 1), { y: RUG_Y, sx: CUSHION.half, sy: CUSHION.height, sz: CUSHION.half })];
  parts.push(place(paint(new THREE.SphereGeometry(0.035, 5, 3), button), { y: RUG_Y + CUSHION.height - 0.005, sy: 0.6 }));
  const corner = CUSHION.half * squircle(Math.PI / 4) * Math.SQRT1_2 * 0.96;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    // A gold pompom on each corner.
    parts.push(place(paint(new THREE.SphereGeometry(0.04, 5, 3), '#f5c84e'), { x: sx * (corner + 0.02), y: RUG_Y + 0.04, z: sz * (corner + 0.02) }));
  }
  return parts;
}

/** A wicker hamper like v3's hamper picture: woven sides, a lid, an arched handle and a pink napkin. */
function hamper(): Geo[] {
  const W = 0.5;
  const H = 0.28;
  const D = 0.34;
  const parts: Geo[] = [];
  const body = paint(new THREE.BoxGeometry(W, H, D, 5, 3, 3).toNonIndexed(), '#e3a256');
  parts.push(place(paintFaces(body, (x, y, z, out) => {
    // A basket weave: strands that swap over and under from cell to cell, a little darker at the bottom.
    const across = Math.abs(x) > W / 2 - 1e-3 ? Math.floor((z + D / 2) / (D / 3)) : Math.floor((x + W / 2) / (W / 5));
    const row = Math.floor((y + H / 2) / (H / 3));
    out.set((across + row) % 2 === 0 ? '#eab06a' : '#cf8b40');
    if (row === 0) out.multiplyScalar(0.92);
  }), { y: H / 2 }));
  parts.push(place(paintY(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), '#c98538', '#f0bb72', -0.025, 0.025), { y: H + 0.025 }));
  // The handle: an arch from side to side over the lid.
  parts.push(place(paint(new THREE.TorusGeometry(0.17, 0.022, 4, 10, Math.PI), '#c98538'), { y: H + 0.05 }));
  // A gold clasp and a pink gingham napkin peeking out under the lid at the front.
  parts.push(place(paint(new THREE.BoxGeometry(0.06, 0.07, 0.02), '#f5c84e'), { y: H - 0.01, z: D / 2 + 0.012 }));
  const napkin = paint(new THREE.PlaneGeometry(0.2, 0.12, 2, 2).toNonIndexed(), GINGHAM[0]);
  paintFaces(napkin, (x, y, _z, out) => out.set(GINGHAM[(x > 0 ? 1 : 0) + (y > 0 ? 0 : 1)]));
  parts.push(place(napkin, { x: -0.12, y: H - 0.04, z: D / 2 + 0.012, rz: 0.12 }));
  return parts;
}

/** A flat gold crown sewn on the rug: Lumi's royal sign. */
function crownMotif(): Geo[] {
  const s = new THREE.Shape();
  s.moveTo(-0.17, 0);
  s.lineTo(0.17, 0);
  s.lineTo(0.2, 0.22);
  s.lineTo(0.09, 0.11);
  s.lineTo(0, 0.26);
  s.lineTo(-0.09, 0.11);
  s.lineTo(-0.2, 0.22);
  s.closePath();
  // Lying flat with its points to the north, so it stands upright on screen.
  const parts = [place(paint(new THREE.ShapeGeometry(s), '#f5c84e'), { rx: -Math.PI / 2 })];
  for (const [x, y, c] of [[-0.2, 0.22, '#ff8fbd'], [0, 0.26, '#b9a0ff'], [0.2, 0.22, '#ff8fbd']] as const) {
    parts.push(place(paint(new THREE.CircleGeometry(0.035, 6), c), { x, y: 0.002, z: -y, rx: -Math.PI / 2 }));
  }
  return parts;
}

/**
 * The royal picnic south of Lumi's gazebo: a pink gingham rug with a gold border, tassels and a gold crown, two plump
 * cushions for the babies and a wicker hamper by her spot. Merged into the meadow's south-west region.
 */
export function buildPicnic(scenery: Scenery): void {
  const { center, halfX, halfZ } = PICNIC.rug;
  const region = Scenery.regionOf(center.x, center.z);
  const add = (g: Geo, o: Parameters<typeof place>[1], ox = center.x, oz = center.z): void =>
    scenery.add(place(g, { ...o, x: ox + (o.x ?? 0), z: oz + (o.z ?? 0) }), region);

  // The rug: 8 x 6 checks of 30 cm, a gold border a little above it and a tassel at each front corner. The back
  // corners have none: the Dressing Corner's portrait camera stands over the rug, and the north-east tassel showed as
  // a gold blob under the wardrobe panel.
  add(gingham(halfX * 2, halfZ * 2, 8, 6), { y: RUG_Y });
  const BORDER = 0.06;
  for (const sz of [-1, 1]) add(paintY(new THREE.BoxGeometry(halfX * 2 + BORDER, 0.03, BORDER), '#e9b543', '#f8d778', -0.015, 0.015), { y: 0.016, z: sz * halfZ });
  for (const sx of [-1, 1]) add(paintY(new THREE.BoxGeometry(BORDER, 0.03, halfZ * 2 - BORDER), '#e9b543', '#f8d778', -0.015, 0.015), { x: sx * halfX, y: 0.016 });
  for (const [sx, sz] of [[-1, 1], [1, 1]]) {
    // A tassel on each front corner: a gold knot and a skirt fanning out on the grass.
    add(paint(new THREE.SphereGeometry(0.05, 5, 3), '#f8d778'), { x: sx * (halfX + 0.03), y: 0.04, z: sz * (halfZ + 0.03) });
    add(aim(paint(new THREE.ConeGeometry(0.06, 0.14, 5), '#f0c24f'), -sx, 0.3, -sz), { x: sx * (halfX + 0.11), y: 0.045, z: sz * (halfZ + 0.11) });
  }
  // The crown, in front between the two cushions.
  const crownZ = PICNIC.seats[0].z + CUSHION.half + 0.42 - center.z;
  for (const g of crownMotif()) add(g, { y: RUG_Y + 0.002, z: crownZ });

  // The cushions: lilac on the left, mint on the right.
  const looks: [string, string, string][] = [['#c4a8f5', '#e6dbff', '#f5c84e'], ['#93dcc0', '#d2f5e6', '#f5c84e']];
  PICNIC.seats.forEach((s, i) => {
    for (const g of cushion(...looks[i])) add(g, { ry: (i ? 1 : -1) * 0.12 }, s.x, s.z);
  });

  // The hamper, turned a little towards her spot.
  for (const g of hamper()) add(g, { ry: 0.35 }, PICNIC.hamper.x, PICNIC.hamper.z);
}

// ---------------------------------------------------------------------------------------------------------------
// The nest
// ---------------------------------------------------------------------------------------------------------------

/** Spots around the nest mound for extra daisies. */
export function nestFlowerSpots(): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const r = rng(5);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3;
    const d = 1.3 + r() * 0.55;
    const y = moundHeight(NEST.center.x + d, NEST.center.z) + 0.01;
    out.push(new THREE.Vector3(NEST.center.x + Math.cos(a) * d, y, NEST.center.z + Math.sin(a) * d));
  }
  return out;
}

export function buildNest(scenery: Scenery): void {
  const { x, z } = NEST.center;
  const parts: Geo[] = [];
  const at = (g: Geo, o: Parameters<typeof place>[1]): void => void parts.push(place(g, { ...o, x: x + (o.x ?? 0), z: z + (o.z ?? 0) }));
  // A soft grassy mound whose edge melts into the meadow's own colour.
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const r = MOUND.radius * (1 - i / 8);
    prof.push(new THREE.Vector2(Math.max(r, 0.001), moundHeight(x + r, z)));
  }
  const top = new THREE.Color('#c4ec8e');
  at(faceUp(paintBy(new THREE.LatheGeometry(prof, 28), (px, py, pz, out) => {
    grassColour(x + px, z + pz, out).lerp(top, THREE.MathUtils.clamp(py / MOUND.height, 0, 1) * 0.8);
  })), { y: -0.01 });
  // Hay lining, lighter in the middle where the egg sits.
  at(paintBy(new THREE.CircleGeometry(0.66, 20), (px, py, _pz, out) => {
    out.set('#fbe6a6').lerp(tmp.set('#e2b765'), Math.hypot(px, py) / 0.66);
  }).rotateX(-Math.PI / 2), { y: 0.34 });
  // The braided rim: a torus with three twisting strands in two straw shades.
  const rim = new THREE.TorusGeometry(0.76, 0.24, 9, 36);
  {
    const p = rim.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const u = Math.atan2(v.y, v.x);
      const cx = Math.cos(u) * 0.76;
      const cy = Math.sin(u) * 0.76;
      const tube = Math.atan2(v.z, Math.hypot(v.x, v.y) - 0.76);
      const bump = 1 + 0.16 * Math.max(0, Math.sin(u * 18 + tube * 3));
      p.setXYZ(i, cx + (v.x - cx) * bump, cy + (v.y - cy) * bump, v.z * bump);
    }
    rim.computeVertexNormals();
  }
  rim.rotateX(-Math.PI / 2);
  at(paintBy(rim, (px, py, pz, out) => {
    const u = Math.atan2(pz, px);
    const strand = Math.sin(u * 18 - Math.atan2(py - 0.0, Math.hypot(px, pz) - 0.76) * 3);
    out.set(strand > 0.2 ? '#f2c776' : strand > -0.5 ? '#ddaa5c' : '#c48f4a');
    if (py > 0.15) out.lerp(tmp.set('#fbe0a0'), 0.45);
  }), { y: 0.42, sy: 0.85 });
  // Twigs poking out of the rim.
  const r = rng(31);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r() * 0.3;
    const len = 0.3 + r() * 0.25;
    at(paint(new THREE.BoxGeometry(0.035, 0.035, len), r() < 0.5 ? '#b98552' : '#d4a466'), {
      x: Math.cos(a) * 0.95, y: 0.5 + r() * 0.12, z: Math.sin(a) * 0.95, ry: -a + Math.PI / 2 + (r() - 0.5) * 1.4, rx: -0.3 - r() * 0.4,
    });
  }
  // Soft feathers on the rim: pink, white and lilac.
  const feathers: [number, string][] = [[0.5, '#ffb3d1'], [2.3, '#ffffff'], [4.0, '#d9c6ff'], [5.4, '#fff1b0']];
  for (const [a, col] of feathers) {
    at(paintY(new THREE.SphereGeometry(0.16, 8, 5), col, '#ffffff', -0.1, 0.16), {
      x: Math.cos(a) * 0.84, y: 0.7, z: Math.sin(a) * 0.84, sx: 0.5, sy: 0.32, sz: 1.25, ry: -a + Math.PI / 2 + 0.5, rx: 0.35,
    });
  }
  for (const g of parts) scenery.add(g);
}

// ---------------------------------------------------------------------------------------------------------------
// The pond
// ---------------------------------------------------------------------------------------------------------------

export interface Pond {
  water: THREE.Mesh;
  toys: THREE.Object3D[];
  update(dt: number, t: number): void;
  /** 0 day to 1 night: the shimmer softens. */
  setNight(n: number): void;
}

function shimmerTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const r = rng(9);
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      const len = 18 + r() * 46;
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + r() * 0.45})`;
      ctx.lineWidth = 2 + r() * 3;
      // Draw each ripple at its wrapped positions so the texture tiles.
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          ctx.beginPath();
          ctx.moveTo(x + ox - len / 2, y + oy);
          ctx.quadraticCurveTo(x + ox, y + oy - 5, x + ox + len / 2, y + oy);
          ctx.stroke();
        }
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2);
  return tex;
}

function duckGeometry(): Geo {
  const parts: Geo[] = [];
  parts.push(place(paintY(new THREE.SphereGeometry(0.22, 10, 6), '#ffd23f', '#ffe680', -0.2, 0.2), { y: 0.1, sx: 1.25, sy: 0.85 }));
  parts.push(place(paintY(new THREE.SphereGeometry(0.14, 8, 6), '#ffd23f', '#ffec94', -0.14, 0.14), { x: 0.14, y: 0.34 }));
  parts.push(place(paint(new THREE.ConeGeometry(0.06, 0.14, 8), '#ff9a3c'), { x: 0.3, y: 0.32, rz: -Math.PI / 2, sz: 0.6 }));
  parts.push(place(paint(new THREE.SphereGeometry(0.1, 6, 4), '#ffc928'), { x: -0.26, y: 0.2, sy: 0.6, rz: 0.5 }));
  for (const sz of [-1, 1]) parts.push(place(paint(new THREE.SphereGeometry(0.026, 4, 3), '#3a2a2a'), { x: 0.22, y: 0.38, z: sz * 0.09 }));
  return merge(parts);
}

function boatGeometry(): Geo {
  const parts: Geo[] = [];
  const hull = new THREE.SphereGeometry(0.42, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  parts.push(place(paintY(hull, '#5aa9e6', '#8fd0ff', -0.42, 0), { y: 0.14, sx: 1.4, sy: 0.55, sz: 0.75 }));
  parts.push(place(paint(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14), '#fff3df'), { y: 0.14, sx: 1.4, sz: 0.75 }));
  parts.push(place(paint(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), '#c98a55'), { y: 0.62 }));
  // Two sails: a big pink one and a small white jib.
  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.2, 0, 0, 1.08, 0, -0.5, 0.22, 0, 0, 0.2, 0, -0.5, 0.22, 0, 0, 1.08, 0], 3));
  parts.push(place(paint(sail, '#ff8fc0'), { x: -0.03 }));
  const jib = new THREE.BufferGeometry();
  jib.setAttribute('position', new THREE.Float32BufferAttribute([0.04, 0.24, 0, 0.42, 0.24, 0, 0.04, 0.9, 0, 0.04, 0.24, 0, 0.04, 0.9, 0, 0.42, 0.24, 0], 3));
  parts.push(paint(jib, '#fffaf2'));
  parts.push(place(heartFlag(), { y: 1.16 }));
  return merge(parts);
}

function heartFlag(): Geo {
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.22, -0.06, 0, 0, -0.12, 0, 0, 0, 0, 0, -0.12, 0, 0.22, -0.06, 0], 3));
  return paint(flag, '#ffd23f');
}

export function buildPond(scenery: Scenery, material: THREE.Material): Pond {
  const { x: cx, z: cz } = POND.center;
  const r = rng(13);

  // Water: a slightly larger ellipse than the pond, its edge hidden under the shore. Deeper blue in the middle.
  const wgeo = new THREE.CircleGeometry(1, 64);
  wgeo.rotateX(-Math.PI / 2);
  wgeo.scale(POND.rx + 0.6, 1, POND.rz + 0.6);
  {
    const p = wgeo.attributes.position;
    const c = new Float32Array(p.count * 3);
    const deep = new THREE.Color('#5cc0ea');
    const shallow = new THREE.Color('#a6e6f6');
    const col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const d = Math.hypot(p.getX(i) / POND.rx, p.getZ(i) / POND.rz);
      col.copy(deep).lerp(shallow, THREE.MathUtils.smoothstep(d, 0.35, 1.0));
      c.set([col.r, col.g, col.b], i * 3);
    }
    wgeo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  const shimmer = shimmerTexture();
  const waterMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffffff', emissiveMap: shimmer, emissiveIntensity: 0.32 });
  const water = new THREE.Mesh(wgeo, waterMat);
  water.position.set(cx, POND.waterY, cz);
  water.name = 'water';

  // Lily pads with flowers, kept clear of the slide's splash, the exits and the toys' paths.
  const pads: [number, number, number, string | null][] = [
    [-3.2, 2.6, 0.55, '#ffb3d1'], [-2.3, 3.2, 0.4, null], [4.3, -1.6, 0.5, '#ffffff'], [5.0, -0.6, 0.38, null],
    [3.4, 2.7, 0.5, '#ff9cc8'], [-4.6, -0.6, 0.42, null], [1.0, -3.0, 0.45, '#ffffff'],
  ];
  for (const [dx, dz, s, flower] of pads) {
    const pad = new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.7);
    pad.rotateX(-Math.PI / 2);
    scenery.add(place(paintY(pad, '#7cc96e', '#9ad987', -1, 1), { x: cx + dx, y: POND.waterY + 0.015, z: cz + dz, s, ry: r() * 6 }));
    if (flower) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        scenery.add(place(paintY(new THREE.SphereGeometry(0.1, 6, 4), flower, '#ffffff', -0.1, 0.1), {
          x: cx + dx + Math.cos(a) * 0.08, y: POND.waterY + 0.1, z: cz + dz + Math.sin(a) * 0.08, sx: 0.55, sz: 1.3, sy: 0.6, ry: -a, rx: -0.5,
        }));
      }
      scenery.add(place(paint(new THREE.SphereGeometry(0.06, 6, 4), '#ffd84a'), { x: cx + dx, y: POND.waterY + 0.13, z: cz + dz }));
    }
  }

  // Reeds with cattails in clumps on the north and east shore (away from the exits and the slide).
  // Angles are ellipse parameters: 0 east, -pi/2 north, pi/2 south.
  for (const ang of [-0.85, 0.4, -2.0, 2.05]) {
    const ex = cx + Math.cos(ang) * (POND.rx + 0.15);
    const ez = cz + Math.sin(ang) * (POND.rz + 0.15);
    for (let k = 0; k < 6; k++) {
      const ox = (r() - 0.5) * 0.8;
      const oz = (r() - 0.5) * 0.5;
      const h = 0.8 + r() * 0.6;
      const lean = (r() - 0.5) * 0.25;
      const y0 = Math.max(groundHeight(ex + ox, ez + oz), POND.waterY);
      scenery.add(place(paintY(new THREE.CylinderGeometry(0.018, 0.03, h, 5), '#6fb85e', '#9bd77c', -h / 2, h / 2), { x: ex + ox, y: y0 + h / 2, z: ez + oz, rz: lean }));
      if (k % 2 === 0) {
        scenery.add(place(paint(new THREE.CapsuleGeometry(0.045, 0.16, 2, 6), '#a8693f'), { x: ex + ox - lean * h * 0.5, y: y0 + h - 0.02, z: ez + oz, rz: lean }));
      }
      if (k < 3) {
        const leaf = new THREE.ConeGeometry(0.06, h * 0.8, 4);
        scenery.add(place(paint(leaf, '#86c96c'), { x: ex + ox + 0.08, y: y0 + h * 0.4, z: ez + oz, rz: lean - 0.3, sz: 0.25 }));
      }
    }
  }
  // Soft lilac-grey boulders on the shore, as in v3's bath pond.
  // Half in the water, clear of the exits, the slide and the wild egg.
  const rocks: [number, number, number][] = [[-0.4, 1.3, 0.55], [-1.2, 1, 0.42], [1.95, 1.1, 0.4], [0.75, 0.9, 0.34]];
  for (const [ang, s, sy] of rocks) {
    const ex = cx + Math.cos(ang) * (POND.rx - 0.05);
    const ez = cz + Math.sin(ang) * (POND.rz - 0.05);
    scenery.add(place(paintY(blob(1, 1), '#c9c2d6', '#ebe6f2', -0.6, 1), { x: ex, y: groundHeight(ex, ez) + 0.05, z: ez, sx: s * 0.6, sy, sz: s * 0.5, ry: ang }));
  }

  // Two rubber ducks paddling in slow circles, and a toy sailing boat drifting and bobbing.
  const ducks = new THREE.InstancedMesh(duckGeometry(), material, 2);
  ducks.name = 'ducks';
  ducks.frustumCulled = false;
  const boat = new THREE.Mesh(boatGeometry(), material);
  boat.name = 'boat';
  const duckPaths = [
    { x: cx + 2.4, z: cz + 1.4, r: 1.1, speed: 0.22, phase: 0 },
    { x: cx - 0.6, z: cz + 2.1, r: 0.9, speed: -0.18, phase: 2 },
  ];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  let night = 0;

  return {
    water,
    toys: [ducks, boat],
    update(_dt, t) {
      shimmer.offset.set(t * 0.012, Math.sin(t * 0.35) * 0.04);
      waterMat.emissiveIntensity = (0.26 + 0.08 * Math.sin(t * 1.3)) * (1 - night * 0.55);
      duckPaths.forEach((d, i) => {
        const a = d.phase + t * d.speed;
        pos.set(d.x + Math.cos(a) * d.r, POND.waterY + 0.02 + Math.sin(t * 2.1 + i) * 0.025, d.z + Math.sin(a) * d.r * 0.7);
        // Face along the circle: the duck's beak points along +x in its own space.
        const heading = Math.atan2(-Math.cos(a) * d.r * 0.7 * Math.sign(d.speed), -Math.sin(a) * d.r * Math.sign(d.speed));
        e.set(Math.sin(t * 2.1 + i) * 0.06, heading, Math.sin(t * 1.7 + i) * 0.08, 'YXZ');
        m.compose(pos, q.setFromEuler(e), one);
        ducks.setMatrixAt(i, m);
      });
      ducks.instanceMatrix.needsUpdate = true;
      boat.position.set(cx + 3.1 + Math.sin(t * 0.13) * 0.5, POND.waterY + 0.02 + Math.sin(t * 1.6) * 0.03, cz - 1.6 + Math.cos(t * 0.11) * 0.3);
      boat.rotation.set(Math.sin(t * 1.3) * 0.05, 0.6 + Math.sin(t * 0.2) * 0.2, Math.sin(t * 1.6 + 1) * 0.06);
    },
    setNight(n) {
      night = n;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The slide
// ---------------------------------------------------------------------------------------------------------------

/** Where the chute starts: just past the top of SLIDE_CURVE (its third control point). */
const CHUTE_START = 2 / 6;

/**
 * The slide on the pond's west shore. The ladder and the candy-striped chute both follow SLIDE_CURVE, because the
 * riders follow it exactly: the ladder from the base to the top platform, the chute from the platform into the water.
 */
export function buildSlide(scenery: Scenery): void {
  const curve = SLIDE_CURVE;
  const top = SLIDE.top;
  const white = '#fffaf6';
  const pink = '#ff8fbf';
  const parts: Geo[] = [];

  // Ladder: two white rails along the curve (offset north and south), pink rungs every 30 cm.
  const ladderEnd = CHUTE_START;
  const RAIL = 0.34;
  for (const side of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const p = curve.getPoint((i / 12) * ladderEnd);
      pts.push(new THREE.Vector3(p.x - 0.05, p.y, p.z + side * RAIL));
    }
    // The rails rise past the platform as handrails.
    pts.push(new THREE.Vector3(top.x - 0.12, top.y + 0.75, top.z + side * RAIL));
    const rail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.06, 5, false);
    parts.push(paint(rail, white));
  }
  let ladderLen = 0;
  for (let i = 1; i <= 20; i++) ladderLen += curve.getPoint((i / 20) * ladderEnd).distanceTo(curve.getPoint(((i - 1) / 20) * ladderEnd));
  const rungs = Math.floor(ladderLen / 0.3);
  for (let i = 1; i <= rungs; i++) {
    const p = curve.getPoint((i / (rungs + 0.6)) * ladderEnd);
    parts.push(place(paint(new THREE.CylinderGeometry(0.05, 0.05, RAIL * 2, 6), pink), { x: p.x - 0.05, y: p.y, z: p.z, rx: Math.PI / 2 }));
  }

  // The top platform: a deck just under the curve's top, four posts, a low rail with a heart sign at the back.
  const deckY = top.y - 0.06;
  parts.push(place(paintY(new THREE.BoxGeometry(0.9, 0.12, 0.95), '#f5d9e6', '#fff6fa', -0.06, 0.06), { x: top.x + 0.05, y: deckY, z: top.z }));
  for (const [dx, dz] of [[-0.38, -0.42], [0.42, -0.42], [-0.38, 0.42], [0.42, 0.42]]) {
    parts.push(place(paintY(new THREE.CylinderGeometry(0.07, 0.08, deckY, 8), '#f4e9ef', white, -deckY / 2, deckY / 2), { x: top.x + 0.05 + dx, y: deckY / 2, z: top.z + dz }));
  }
  // Side rails on the platform (north and south), so riders sit safely.
  for (const dz of [-0.46, 0.46]) {
    parts.push(place(paint(new THREE.BoxGeometry(0.85, 0.06, 0.06), pink), { x: top.x + 0.05, y: deckY + 0.42, z: top.z + dz }));
    for (const dx of [-0.38, 0.0, 0.42]) {
      parts.push(place(paint(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), white), { x: top.x + 0.05 + dx, y: deckY + 0.21, z: top.z + dz }));
    }
  }
  // The heart sign on a post at the platform's north-west corner, facing the camera.
  parts.push(place(paint(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), white), { x: top.x - 0.38, y: deckY + 0.55, z: top.z - 0.46 }));
  parts.push(place(heart(0.3, 0.08, '#ff6fa8'), { x: top.x - 0.38, y: deckY + 1.3, z: top.z - 0.44 }));
  parts.push(place(heart(0.21, 0.09, '#ffd1e4'), { x: top.x - 0.38, y: deckY + 1.31, z: top.z - 0.39 }));

  // The chute: a candy-striped half-pipe whose lowest line is the curve, with pink lips along both edges.
  const N = 40;
  const SEG = 8;
  const R = 0.36;
  const THICK = 0.05;
  const inner: number[] = [];
  const outer: number[] = [];
  const cIn: number[] = [];
  const cOut: number[] = [];
  const alongAt: number[] = [];
  const pinkC = new THREE.Color(pink);
  const whiteC = new THREE.Color('#fff6fb');
  const pinkOut = new THREE.Color('#ff9fca');
  const T = new THREE.Vector3();
  const S = new THREE.Vector3();
  const Nn = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const P = new THREE.Vector3();
  const lips: THREE.Vector3[][] = [[], []];
  const stripe = 0.32;
  let along = 0;
  let prev = curve.getPoint(CHUTE_START - 0.01);
  for (let i = 0; i <= N; i++) {
    const u = CHUTE_START - 0.01 + (i / N) * (1 - CHUTE_START + 0.01);
    curve.getPoint(u, P);
    along += P.distanceTo(prev);
    prev = P.clone();
    curve.getTangent(u, T);
    S.crossVectors(T, up).normalize();
    Nn.crossVectors(S, T).normalize();
    alongAt.push(along);
    for (let k = 0; k <= SEG; k++) {
      const phi = (k / SEG) * Math.PI;
      const cx = P.x + Nn.x * R - Nn.x * R * Math.sin(phi) + S.x * R * Math.cos(phi);
      const cy = P.y - 0.02 + Nn.y * R - Nn.y * R * Math.sin(phi) + S.y * R * Math.cos(phi);
      const cz = P.z + Nn.z * R - Nn.z * R * Math.sin(phi) + S.z * R * Math.cos(phi);
      inner.push(cx, cy, cz);
      cIn.push(1, 1, 1);
      const ox = P.x + Nn.x * R - Nn.x * (R + THICK) * Math.sin(phi) + S.x * (R + THICK) * Math.cos(phi);
      const oy = P.y - 0.02 + Nn.y * R - Nn.y * (R + THICK) * Math.sin(phi) + S.y * (R + THICK) * Math.cos(phi);
      const oz = P.z + Nn.z * R - Nn.z * (R + THICK) * Math.sin(phi) + S.z * (R + THICK) * Math.cos(phi);
      outer.push(ox, oy, oz);
      cOut.push(pinkOut.r, pinkOut.g, pinkOut.b);
      if (k === 0) lips[0].push(new THREE.Vector3(cx + S.x * 0.025, cy + 0.01, cz + S.z * 0.025));
      if (k === SEG) lips[1].push(new THREE.Vector3(cx - S.x * 0.025, cy + 0.01, cz - S.z * 0.025));
    }
  }
  const sheet = (pos: number[], col: number[], flip: boolean): Geo => {
    const idx: number[] = [];
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < SEG; k++) {
        const a = i * (SEG + 1) + k;
        const b = a + SEG + 1;
        if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  // Candy stripes: each segment gets one flat colour (unshared vertices), so the bands stay crisp.
  const smoothInner = sheet(inner, cIn, false);
  orientUp(smoothInner, true);
  const innerSheet = smoothInner.toNonIndexed();
  smoothInner.dispose();
  {
    const col = innerSheet.attributes.color;
    const perSegment = SEG * 2 * 3;
    for (let v = 0; v < col.count; v++) {
      const i = Math.floor(v / perSegment);
      const mid = (alongAt[i] + alongAt[i + 1]) / 2;
      // Bands of 32 cm alternate pink and white.
      const band = Math.floor(mid / stripe) % 2 === 0 ? pinkC : whiteC;
      col.setXYZ(v, band.r, band.g, band.b);
    }
    innerSheet.setIndex([...Array(col.count).keys()]);
  }
  const outerSheet = sheet(outer, cOut, true);
  orientUp(outerSheet, false);
  parts.push(innerSheet, outerSheet);
  for (const lip of lips) parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lip), N, 0.045, 4, false), pink));

  // Supports: white posts under the chute, the last one standing in the water.
  for (const u of [0.5, 0.66, 0.82]) {
    const p = curve.getPoint(u);
    const base = Math.max(groundHeight(p.x, p.z), POND.waterY - 0.1);
    const h = p.y - 0.02 - base;
    parts.push(place(paintY(new THREE.CylinderGeometry(0.06, 0.07, h, 8), '#f1e3ea', white, -h / 2, h / 2), { x: p.x, y: base + h / 2, z: p.z }));
    parts.push(place(paint(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 8), pink), { x: p.x, y: base + 0.03, z: p.z }));
  }

  for (const g of parts) scenery.add(g, Scenery.regionOf(SLIDE.top.x, SLIDE.top.z));
}

/** Make a sheet's triangles face up (the inside of the chute) or down (its outside). */
function orientUp(g: Geo, up: boolean): void {
  const n = g.attributes.normal;
  let sum = 0;
  for (let i = 0; i < n.count; i++) sum += n.getY(i);
  if (sum >= 0 === up) return;
  const idx = g.index!;
  for (let i = 0; i < idx.count; i += 3) {
    const t = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, t);
  }
  g.computeVertexNormals();
}
