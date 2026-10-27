// The two stable rows: cream walls with stone-trimmed arches, a coral tiled roof, a narrow balcony with a ramp, dark
// cosy stalls with straw, half doors that swing, gold number plaques and lanterns. The doors are one instanced mesh
// and the plaques one merged mesh, so twenty doors cost two draw calls. West of the yard stands the hay rack: its
// wood is stable scenery, its hay one small mesh that is only drawn while there is hay in it.
import '@fontsource/andika/700.css';
import * as THREE from 'three';
import { HAY_RACK, STABLE, doorCenter, doorColumn, doorIsUpper, doorRow } from '../layout';
import type { StableApi } from '../contracts';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Scenery, canvasTexture, matrixOf, merge, paint, paintBy, paintY, place, softDotTexture, type Geo } from './geo';
import { CRIB, RACK_YAW, hayDepth, hayGeometry, rackGeometry } from './hayrack';

const ROW_HALF = 3.9;
const STOREY = STABLE.upperFloorY;
const WALL_T = 0.24;
const OPEN_W = 1.3;
const ARCH_R = OPEN_W / 2;
const ARCH_SPRING = 1.18;
const BALCONY_D = 0.35;
const ROOF_Y = STOREY * 2;
const RIDGE_Y = ROOF_Y + 1.15;
const DOOR_T = 0.07;
/** Plaques lean back a little, so their numerals face the raised camera and read larger. */
const PLAQUE_TILT = 0.21;
const PLAQUE_W = 1.04;
const PLAQUE_H = 0.68;
const PLAQUE_Y = 0.48;
/** About 86 degrees: the open door lies along the stall's west partition. */
const OPEN_ANGLE = 1.5;

const CREAM = '#fbefdc';
const CREAM_SHADE = '#eedcc2';
const STONE = '#f3e2c8';
const WOOD = '#dda266';
const WOOD_DARK = '#b97b45';
const ROOF_A = '#f39383';
const ROOF_B = '#e98274';

const colX = (n: number): number => STABLE.rows[doorRow(n)].centerX + (doorColumn(n) - 2) * STABLE.doorWidth;
const floorY = (n: number): number => (doorIsUpper(n) ? STOREY : 0);

/**
 * The front wall of one storey: a cream slab whose outline dips up into five arched openings (one polygon, so the
 * openings reach the floor), extruded so the arches have depth.
 */
function frontWall(): Geo {
  const s = new THREE.Shape();
  s.moveTo(-ROW_HALF, 0);
  for (let c = 0; c < 5; c++) {
    const x = (c - 2) * STABLE.doorWidth;
    s.lineTo(x - ARCH_R, 0);
    s.lineTo(x - ARCH_R, ARCH_SPRING);
    s.absarc(x, ARCH_SPRING, ARCH_R, Math.PI, 0, true);
    s.lineTo(x + ARCH_R, 0);
  }
  s.lineTo(ROW_HALF, 0);
  s.lineTo(ROW_HALF, STOREY);
  s.lineTo(-ROW_HALF, STOREY);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -WALL_T / 2);
  return shadeReveals(paint(g, CREAM));
}

/** Paint the faces that do not face south (the arch reveals) a shade darker, for depth. */
function shadeReveals(g: Geo): Geo {
  const n = g.attributes.normal;
  const c = g.attributes.color;
  const shade = new THREE.Color(CREAM_SHADE);
  for (let i = 0; i < n.count; i++) if (n.getZ(i) < 0.5) c.setXYZ(i, shade.r, shade.g, shade.b);
  return g;
}

/** A stone trim around one arch: a half ring and two jambs, a little in front of the wall. */
function archTrim(): Geo[] {
  const ring = new THREE.RingGeometry(ARCH_R, ARCH_R + 0.13, 8, 1, 0, Math.PI);
  const parts = [place(paint(ring, STONE), { y: ARCH_SPRING, z: WALL_T / 2 + 0.012 })];
  for (const sx of [-1, 1]) {
    parts.push(place(paint(new THREE.PlaneGeometry(0.13, ARCH_SPRING), STONE), { x: sx * (ARCH_R + 0.065), y: ARCH_SPRING / 2, z: WALL_T / 2 + 0.012 }));
  }
  return parts;
}

/**
 * One stable row (static parts), built around its own origin: x along the front, z = 0 on the door plane. The stall
 * insides go to `inside`, a mesh of their own that glows warm when the lanterns are lit.
 */
function rowGeometry(side: -1 | 1, inside: Geo[]): Geo[] {
  const parts: Geo[] = [];
  const W = ROW_HALF * 2;
  const D = STABLE.depth;
  for (const y0 of [0, STOREY]) {
    parts.push(place(frontWall(), { y: y0 }));
    for (let c = 0; c < 5; c++) for (const t of archTrim()) parts.push(place(t, { x: (c - 2) * STABLE.doorWidth, y: y0 }));
    // The dark, cosy stall: a straw bed, a warm back panel and wooden partitions.
    const bedD = D - 0.35;
    inside.push(place(paintBy(new THREE.BoxGeometry(W - 0.1, 0.3, bedD, 1, 1, 4), (_x, y, z, out) => {
      out.set('#d8a85a').lerp(tmpC.set('#8a5f34'), THREE.MathUtils.clamp(0.5 - z / bedD, 0, 1) * 0.9);
      if (y < 0) out.multiplyScalar(0.8);
    }), { y: y0 + 0.15, z: -bedD / 2 - 0.12 }));
    inside.push(place(paintY(new THREE.PlaneGeometry(W - 0.1, STOREY), '#4f3427', '#7a5039', -STOREY / 2, STOREY / 2), { y: y0 + STOREY / 2, z: -D + 0.3 }));
    for (let k = 0; k <= 5; k++) {
      const x = (k - 2.5) * STABLE.doorWidth;
      const w = k === 0 || k === 5 ? 0.12 : 0.1;
      inside.push(place(paintY(new THREE.BoxGeometry(w, 1.5, D - 0.4), '#7a5038', '#a06d48', -0.75, 0.75), { x: k === 0 ? x + 0.1 : k === 5 ? x - 0.1 : x, y: y0 + 0.75, z: -(D - 0.4) / 2 - 0.12 }));
    }
    // Straw tufts at the back of each stall.
    for (let c = 0; c < 5; c++) {
      for (const [dx, dz, s] of [[-0.3, -1.9, 0.34], [0.25, -2.35, 0.38]]) {
        inside.push(place(paintY(new THREE.ConeGeometry(s, s * 0.9, 5, 1, true), '#e2b55f', '#f7dc8c', -s * 0.45, s * 0.45), { x: (c - 2) * STABLE.doorWidth + dx, y: y0 + 0.3 + s * 0.45, z: dz }));
      }
    }
    // A plinth along the bottom of the front.
    parts.push(place(paint(new THREE.BoxGeometry(W + 0.02, 0.16, 0.06), STONE), { y: y0 + 0.08, z: WALL_T / 2 + 0.02 }));
  }
  // Side and back walls, and corner pilasters.
  for (const sx of [-1, 1]) {
    parts.push(place(paintY(new THREE.BoxGeometry(0.24, ROOF_Y, D), CREAM_SHADE, CREAM, 0, ROOF_Y), { x: sx * (ROW_HALF - 0.12), y: ROOF_Y / 2, z: -D / 2 }));
    parts.push(place(paint(new THREE.BoxGeometry(0.3, ROOF_Y, 0.3), STONE), { x: sx * (ROW_HALF - 0.1), y: ROOF_Y / 2, z: WALL_T / 2 - 0.08 }));
  }
  parts.push(place(paint(new THREE.BoxGeometry(W, ROOF_Y, 0.24), CREAM_SHADE), { y: ROOF_Y / 2, z: -D + 0.12 }));
  // A ceiling over the top stalls, under the roof.
  parts.push(place(paint(new THREE.BoxGeometry(W, 0.1, D), '#7a5038'), { y: ROOF_Y - 0.05, z: -D / 2 }));

  // The roof: tile bands on the front slope (two shades), a plain back slope, gable ends and a ridge cap.
  const eave = 0.32;
  const frontRun = D / 2 + eave;
  const slope = Math.atan2(RIDGE_Y - ROOF_Y, frontRun);
  const slopeLen = Math.hypot(frontRun, RIDGE_Y - ROOF_Y);
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const mid = (t0 + t1) / 2;
    const zc = eave - mid * frontRun;
    const yc = ROOF_Y + mid * (RIDGE_Y - ROOF_Y);
    parts.push(place(paintY(new THREE.BoxGeometry(W + 0.5, 0.12, slopeLen / bands + 0.06), i % 2 ? ROOF_B : ROOF_A, i % 2 ? '#f29a8b' : '#f7a596', -0.06, 0.06), { y: yc + 0.06, z: zc, rx: slope }));
  }
  parts.push(place(paint(new THREE.BoxGeometry(W + 0.5, 0.12, slopeLen), ROOF_B), { y: (ROOF_Y + RIDGE_Y) / 2 + 0.06, z: -D - eave + frontRun / 2, rx: -slope }));
  parts.push(place(paint(new THREE.CylinderGeometry(0.13, 0.13, W + 0.6, 8), '#d96d61'), { y: RIDGE_Y + 0.12, z: -D / 2, rz: Math.PI / 2 }));
  for (const sx of [-1, 1]) {
    const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, RIDGE_Y - ROOF_Y)]);
    parts.push(place(paint(new THREE.ShapeGeometry(tri), CREAM), { x: sx * ROW_HALF, y: ROOF_Y, z: -D / 2, ry: sx * Math.PI / 2 }));
  }
  // A front gable over the middle door with a gold crescent moon (Moon Meadow's own sign).
  {
    const gw = 2.3;
    const gh = 1.05;
    const tri = new THREE.Shape([new THREE.Vector2(-gw / 2, 0), new THREE.Vector2(gw / 2, 0), new THREE.Vector2(0, gh)]);
    parts.push(place(paint(new THREE.ExtrudeGeometry(tri, { depth: 0.9, bevelEnabled: false }), CREAM), { y: ROOF_Y - 0.02, z: eave - 0.72 }));
    const half = Math.hypot(gw / 2, gh);
    const ang = Math.atan2(gh, gw / 2);
    for (const sx of [-1, 1]) {
      parts.push(place(paint(new THREE.BoxGeometry(half + 0.2, 0.12, 1.1), ROOF_A), { x: sx * (gw / 4 + 0.03), y: ROOF_Y + gh / 2 + 0.08, z: eave - 0.38, rz: -sx * ang }));
    }
    const moon = new THREE.Shape();
    moon.absarc(0, 0, 0.3, Math.PI * 0.3, Math.PI * 1.7, false);
    moon.absarc(0.14, 0, 0.24, Math.PI * 1.55, Math.PI * 0.45, true);
    parts.push(place(paint(new THREE.ExtrudeGeometry(moon, { depth: 0.05, bevelEnabled: false, curveSegments: 8 }), '#f5c84e'), { y: ROOF_Y + 0.4, z: eave + 0.2, rz: 0.4 }));
    parts.push(place(paint(new THREE.SphereGeometry(0.1, 8, 6), '#f5c84e'), { y: ROOF_Y + gh + 0.12, z: eave - 0.1 }));
  }

  // The balcony in front of the top storey: a narrow wooden walk with a railing and flower boxes.
  const balconyW = W + 0.75;
  const bx = side * 0.375;
  parts.push(place(paintY(new THREE.BoxGeometry(balconyW, 0.12, BALCONY_D + WALL_T / 2), WOOD_DARK, WOOD, -0.06, 0.06), { x: bx, y: STOREY - 0.06, z: (BALCONY_D + WALL_T / 2) / 2 }));
  // The rail stays low (30 cm): from the raised camera a taller one would cross the top row's numerals.
  parts.push(place(paint(new THREE.BoxGeometry(balconyW, 0.07, 0.07), WOOD), { x: bx, y: STOREY + 0.3, z: BALCONY_D + WALL_T / 2 - 0.04 }));
  for (let i = 0; i <= 12; i++) {
    const x = bx - balconyW / 2 + 0.05 + (i / 12) * (balconyW - 0.1);
    parts.push(place(paint(new THREE.BoxGeometry(0.06, 0.3, 0.06), WOOD), { x, y: STOREY + 0.15, z: BALCONY_D + WALL_T / 2 - 0.04 }));
  }
  for (let k = 0; k < 4; k++) {
    const x = (k - 1.5) * STABLE.doorWidth;
    parts.push(place(paint(new THREE.BoxGeometry(0.42, 0.12, 0.16), '#f4b183'), { x, y: STOREY + 0.39, z: BALCONY_D + WALL_T / 2 - 0.04 }));
    for (let f = 0; f < 3; f++) {
      parts.push(place(paint(new THREE.SphereGeometry(0.075, 5, 3), ['#ff8fbf', '#fff3a6', '#ffffff'][(f + k) % 3]), { x: x + (f - 1) * 0.13, y: STOREY + 0.49, z: BALCONY_D + WALL_T / 2 - 0.04 }));
    }
  }
  // Brackets under the balcony.
  for (let k = 0; k <= 5; k++) {
    parts.push(place(paint(new THREE.BoxGeometry(0.08, 0.22, BALCONY_D), WOOD_DARK), { x: (k - 2.5) * STABLE.doorWidth, y: STOREY - 0.22, z: BALCONY_D / 2 + WALL_T / 2 }));
  }
  // The ramp down the outer side wall, from the balcony to the grass behind.
  {
    const rx = side * (ROW_HALF + 0.42);
    const len = Math.hypot(D + 0.2, STOREY);
    const ang = Math.atan2(STOREY, D + 0.2);
    parts.push(place(paintY(new THREE.BoxGeometry(0.72, 0.1, len), WOOD_DARK, WOOD, -0.05, 0.05), { x: rx, y: STOREY / 2 - 0.02, z: WALL_T / 2 - (D + 0.2) / 2, rx: -ang }));
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      parts.push(place(paint(new THREE.BoxGeometry(0.72, 0.04, 0.05), WOOD_DARK), { x: rx, y: STOREY * (1 - t) + 0.04, z: WALL_T / 2 - (D + 0.2) * t, rx: -ang }));
    }
    parts.push(place(paint(new THREE.BoxGeometry(0.06, 0.06, len), WOOD), { x: rx + side * 0.36, y: STOREY / 2 + 0.5, z: WALL_T / 2 - (D + 0.2) / 2, rx: -ang }));
    for (const t of [0.15, 0.5, 0.85]) {
      parts.push(place(paint(new THREE.BoxGeometry(0.05, 0.5, 0.05), WOOD), { x: rx + side * 0.36, y: STOREY * (1 - t) + 0.25, z: WALL_T / 2 - (D + 0.2) * t }));
    }
  }
  return parts;
}

/** Lantern spots on a row (row-local): both ends of both storeys and one on the gable. */
function lanternSpots(): THREE.Vector3[] {
  const z = WALL_T / 2 + 0.2;
  return [
    new THREE.Vector3(-ROW_HALF + 0.12, 1.32, z), new THREE.Vector3(ROW_HALF - 0.12, 1.32, z),
    new THREE.Vector3(-ROW_HALF + 0.12, STOREY + 1.45, z), new THREE.Vector3(ROW_HALF - 0.12, STOREY + 1.45, z),
  ];
}

function lanternFrame(): Geo {
  const parts: Geo[] = [];
  parts.push(place(paint(new THREE.BoxGeometry(0.05, 0.05, 0.24), '#6a4a3a'), { y: 0.3, z: -0.12 }));
  parts.push(place(paint(new THREE.ConeGeometry(0.15, 0.14, 6), '#5c4a5a'), { y: 0.2 }));
  parts.push(place(paint(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 6), '#5c4a5a'), { y: -0.17 }));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    parts.push(place(paint(new THREE.BoxGeometry(0.025, 0.32, 0.025), '#5c4a5a'), { x: Math.cos(a) * 0.11, z: Math.sin(a) * 0.11 }));
  }
  return merge(parts);
}

// ---------------------------------------------------------------------------------------------------------------
// Doors and plaques
// ---------------------------------------------------------------------------------------------------------------

/** One half door, hinged at x = 0 and reaching to x = OPEN_W: honey planks on a dark backing, rails, hinges, a knob. */
function doorGeometry(): Geo {
  const parts: Geo[] = [];
  const H = STABLE.lowerDoorH;
  parts.push(place(paint(new THREE.BoxGeometry(OPEN_W - 0.04, H - 0.04, DOOR_T * 0.6), WOOD_DARK), { x: OPEN_W / 2, y: H / 2 }));
  const planks = 5;
  const pw = (OPEN_W - 0.06) / planks;
  for (let i = 0; i < planks; i++) {
    parts.push(place(paint(new THREE.BoxGeometry(pw - 0.025, H - 0.08, DOOR_T), i % 2 ? '#e4ad70' : '#dba062'), { x: 0.03 + pw * (i + 0.5), y: H / 2 }));
  }
  parts.push(place(paint(new THREE.BoxGeometry(OPEN_W, 0.09, DOOR_T + 0.03), WOOD_DARK), { x: OPEN_W / 2, y: H - 0.045 }));
  parts.push(place(paint(new THREE.BoxGeometry(OPEN_W, 0.08, DOOR_T + 0.02), WOOD_DARK), { x: OPEN_W / 2, y: 0.06 }));
  for (const y of [0.18, 0.72]) parts.push(place(paint(new THREE.BoxGeometry(0.22, 0.05, DOOR_T + 0.03), '#6b5a5a'), { x: 0.11, y }));
  parts.push(place(paint(new THREE.BoxGeometry(0.07, 0.07, 0.05), '#f3c95a'), { x: OPEN_W - 0.1, y: 0.5, z: DOOR_T / 2 + 0.02 }));
  return merge(parts);
}

const ATLAS_COLS = 4;
const CELL_W = 256;
const CELL_H = Math.round((CELL_W * PLAQUE_H) / PLAQUE_W);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Twenty gold plaques with their numerals in one texture (Andika bold, dark brown on gold). */
function drawPlaques(ctx: CanvasRenderingContext2D, withNumerals: boolean): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let n = 1; n <= 20; n++) {
    const x = ((n - 1) % ATLAS_COLS) * CELL_W;
    const y = Math.floor((n - 1) / ATLAS_COLS) * CELL_H;
    const g = ctx.createLinearGradient(x, y, x + CELL_W * 0.4, y + CELL_H);
    g.addColorStop(0, '#fff0b0');
    g.addColorStop(0.45, '#f7d36a');
    g.addColorStop(1, '#e2ac3f');
    roundRect(ctx, x + 4, y + 4, CELL_W - 8, CELL_H - 8, 26);
    ctx.fillStyle = '#b9822f';
    ctx.fill();
    roundRect(ctx, x + 10, y + 10, CELL_W - 20, CELL_H - 20, 20);
    ctx.fillStyle = g;
    ctx.fill();
    if (!withNumerals) continue;
    const text = String(n);
    ctx.font = '700 196px Andika, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(text);
    const maxW = CELL_W - 44;
    const sx = Math.min(1, maxW / m.width);
    // Centre the digits' ink box vertically (digits have no descenders).
    const ascent = m.actualBoundingBoxAscent || 140;
    ctx.save();
    ctx.translate(x + CELL_W / 2, y + CELL_H / 2 + ascent / 2);
    ctx.scale(sx, 1);
    ctx.fillStyle = '#6a3d1c';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Glows
// ---------------------------------------------------------------------------------------------------------------

/** A soft halo in the shape of an arched doorway: a bright blurred edge and a faint middle (a mask for additive glow). */
function archGlowTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 160, (ctx, w, h) => {
    const r = w / 2 - 22;
    ctx.beginPath();
    ctx.moveTo(22, h - 10);
    ctx.lineTo(22, r + 22);
    ctx.arc(w / 2, r + 22, r, Math.PI, 0);
    ctx.lineTo(w - 22, h - 10);
    ctx.fillStyle = 'rgb(80,80,80)';
    ctx.fill();
    // Blur by shadow (Safari 15 has no canvas filters): stroke a few times for a soft, bright rim.
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    for (let i = 0; i < 4; i++) ctx.stroke();
  }, true);
}

/** A soft rounded rectangle halo for a whole row (a mask for additive glow). */
function rowGlowTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 128, (ctx, w, h) => {
    roundRect(ctx, 24, 24, w - 48, h - 48, 26);
    ctx.fillStyle = 'rgb(46,46,46)';
    ctx.fill();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 8;
    for (let i = 0; i < 3; i++) ctx.stroke();
  }, true);
}

export interface Stable {
  api: StableApi;
  /** Resolves when the numerals are drawn in Andika. */
  ready: Promise<void>;
  /** Plaques glow a little at night so the numerals stay clear. */
  setNight(n: number): void;
  /** The hay rack's current (eased) fill, 0 to 1. */
  readonly hayFill: number;
  update(dt: number, t: number): void;
}

type Anim = { from: number; to: number; ms: number; t: number; done: () => void; rattle?: boolean };

export function buildStable(scene: THREE.Scene, scenery: Scenery, material: THREE.Material): Stable {
  const inside: Geo[] = [];
  STABLE.rows.forEach((r, i) => {
    const before = inside.length;
    for (const g of rowGeometry(i === 0 ? -1 : 1, inside)) scenery.add(place(g, { x: r.centerX, z: STABLE.frontZ }), 'stable');
    for (const g of inside.slice(before)) place(g, { x: r.centerX, z: STABLE.frontZ });
  });
  // The hay rack's wood goes with the stable scenery (no draw call of its own). Its hay is one mesh with the shared
  // material, scaled up from the crib's bottom: hidden at 0, so it costs a draw call only while there is hay.
  for (const g of rackGeometry()) scenery.add(place(g, { x: HAY_RACK.center.x, z: HAY_RACK.center.z, ry: RACK_YAW }), 'stable');
  const hay = new THREE.Mesh(hayGeometry(), material);
  hay.name = 'hay';
  hay.position.set(HAY_RACK.center.x, CRIB.y0 + 0.01, HAY_RACK.center.z);
  hay.rotation.y = RACK_YAW;
  hay.visible = false;
  let hayFill = 0;
  let hayTween: { from: number; to: number; ms: number; t: number } | null = null;
  const setHay = (f: number): void => {
    hayFill = f;
    hay.visible = f > 0.001;
    hay.scale.set(1, Math.max(f, 1e-3), hayDepth(Math.max(f, 1e-3)));
  };
  // The stalls: their own material, so they can glow warm inside when the lanterns are lit.
  const stallMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#b8661c', emissiveIntensity: 0 });
  const stalls = new THREE.Mesh(merge(inside), stallMat);
  stalls.name = 'stalls';
  stalls.matrixAutoUpdate = false;

  // Doors: one instance each, posed by their hinge angle.
  const doors = new THREE.InstancedMesh(doorGeometry(), material, 20);
  doors.name = 'doors';
  const angle = new Float32Array(20);
  const jiggle = new Float32Array(20);
  const hinge = (n: number): THREE.Vector3 => new THREE.Vector3(colX(n) - OPEN_W / 2, floorY(n), STABLE.frontZ);
  const doorMatrix = (n: number, out: THREE.Matrix4): THREE.Matrix4 => {
    const h = hinge(n);
    // Doors swing inwards, into the stall, so nothing sticks out into the yard.
    return matrixOf({ x: h.x, y: h.y, z: h.z, ry: angle[n - 1] + jiggle[n - 1] }, out);
  };

  // Plaques: twenty quads in door space, re-posed only while their door moves.
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = CELL_W * ATLAS_COLS;
  atlasCanvas.height = CELL_H * Math.ceil(20 / ATLAS_COLS);
  const atlasCtx = atlasCanvas.getContext('2d')!;
  drawPlaques(atlasCtx, false);
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  // Premultiplied upload: the clear corners filter to a soft dark rim instead of colour noise.
  atlas.premultiplyAlpha = true;
  atlas.anisotropy = 4;
  const plaqueLocal: THREE.Vector3[] = [];
  {
    const hw = PLAQUE_W / 2;
    const hh = PLAQUE_H / 2;
    const cz = DOOR_T / 2 + 0.012 + Math.sin(PLAQUE_TILT) * hh;
    for (const [px, py] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
      plaqueLocal.push(new THREE.Vector3(OPEN_W / 2 + px, PLAQUE_Y + py * Math.cos(PLAQUE_TILT), cz - py * Math.sin(PLAQUE_TILT)));
    }
  }
  const plaqueNormal = new THREE.Vector3(0, Math.sin(PLAQUE_TILT), Math.cos(PLAQUE_TILT));
  const pPos = new Float32Array(20 * 4 * 3);
  const pNor = new Float32Array(20 * 4 * 3);
  const pUv = new Float32Array(20 * 4 * 2);
  const pIdx: number[] = [];
  const W = atlasCanvas.width;
  const Hh = atlasCanvas.height;
  for (let n = 1; n <= 20; n++) {
    const u0 = (((n - 1) % ATLAS_COLS) * CELL_W) / W;
    const u1 = u0 + CELL_W / W;
    // Canvas rows run down; texture v runs up (flipY).
    const v1 = 1 - (Math.floor((n - 1) / ATLAS_COLS) * CELL_H) / Hh;
    const v0 = v1 - CELL_H / Hh;
    pUv.set([u0, v0, u1, v0, u1, v1, u0, v1], (n - 1) * 8);
    const b = (n - 1) * 4;
    pIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const plaqueGeo = new THREE.BufferGeometry();
  plaqueGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  plaqueGeo.setAttribute('normal', new THREE.BufferAttribute(pNor, 3));
  plaqueGeo.setAttribute('uv', new THREE.BufferAttribute(pUv, 2));
  plaqueGeo.setIndex(pIdx);
  const plaqueMat = new THREE.MeshLambertMaterial({ map: atlas, alphaTest: 0.5, emissive: '#ffffff', emissiveMap: atlas, emissiveIntensity: 0 });
  const plaques = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaques.name = 'plaques';

  const m = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const tv = new THREE.Vector3();
  const pose = (n: number): void => {
    doorMatrix(n, m);
    doors.setMatrixAt(n - 1, m);
    nm.getNormalMatrix(m);
    tv.copy(plaqueNormal).applyMatrix3(nm).normalize();
    for (let k = 0; k < 4; k++) {
      const i = ((n - 1) * 4 + k) * 3;
      const p = plaqueLocal[k].clone().applyMatrix4(m);
      pPos.set([p.x, p.y, p.z], i);
      pNor.set([tv.x, tv.y, tv.z], i);
    }
  };
  for (let n = 1; n <= 20; n++) pose(n);
  plaqueGeo.computeBoundingSphere();
  doors.computeBoundingSphere();

  const ready = (async () => {
    try {
      await document.fonts.load('700 96px Andika');
    } catch {
      // Draw with the fallback font rather than leave the plaques blank.
    }
    drawPlaques(atlasCtx, true);
    atlas.needsUpdate = true;
  })();

  // Glow for one door (an arch halo) and for a whole row.
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffbf3a', map: archGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(OPEN_W + 0.6, ARCH_SPRING + ARCH_R + 0.55), glowMat);
  doorGlow.name = 'door-glow';
  doorGlow.visible = false;
  const rowMat = new THREE.MeshBasicMaterial({ color: '#ffd77a', map: rowGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
  const rowGlow = new THREE.Mesh(new THREE.PlaneGeometry(ROW_HALF * 2 + 1.2, ROOF_Y + 0.9), rowMat);
  rowGlow.name = 'row-glow';
  rowGlow.visible = false;
  let glowDoor: number | null = null;
  let glowRowN: number | null = null;
  let glowFade = 0;
  let rowFade = 0;

  // Lanterns: frames are scenery; the glass is one mesh that lights up; the halos are points.
  const frame = lanternFrame();
  const glass: Geo[] = [];
  const haloPos: number[] = [];
  const pools: THREE.BufferGeometry[] = [];
  STABLE.rows.forEach((r) => {
    for (const s of lanternSpots()) {
      const p = { x: r.centerX + s.x, y: s.y, z: STABLE.frontZ + s.z };
      scenery.add(place(frame.clone(), p), 'stable');
      glass.push(place(new THREE.CylinderGeometry(0.085, 0.085, 0.27, 6), p));
      haloPos.push(p.x, p.y, p.z + 0.05);
      // Warm pools of light on the yard under the lower lanterns: what makes the night yard cosy.
      if (s.y < STOREY) pools.push(new THREE.PlaneGeometry(4.4, 3.4).rotateX(-Math.PI / 2).translate(p.x, 0.06, p.z + 1.2));
    }
  });
  const poolMat = new THREE.MeshBasicMaterial({ color: '#ff9a3a', map: softDotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
  const poolGeo = mergeGeometries(pools);
  const lightPools = new THREE.Mesh(poolGeo, poolMat);
  lightPools.name = 'lantern-pools';
  lightPools.visible = false;
  frame.dispose();
  const glassMat = new THREE.MeshBasicMaterial({ color: '#c9b9a0' });
  const lanternGlass = new THREE.Mesh(merge(glass.map((g) => paint(g, '#ffffff'))), glassMat);
  lanternGlass.name = 'lantern-glass';
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(haloPos, 3));
  const haloMat = new THREE.PointsMaterial({ color: '#ffb54d', map: softDotTexture(), size: 2.8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
  const halos = new THREE.Points(haloGeo, haloMat);
  halos.name = 'lantern-halos';
  halos.visible = false;
  let lit = false;
  let litFade = 0;
  let night = 0;

  scene.add(stalls, doors, plaques, doorGlow, rowGlow, lanternGlass, halos, lightPools, hay);

  const anims = new Map<number, Anim>();
  const animate = (n: number, a: Omit<Anim, 't' | 'done'>): Promise<void> =>
    new Promise((resolve) => {
      anims.get(n)?.done();
      anims.set(n, { ...a, t: 0, done: resolve });
    });
  const valid = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 20;

  const api: StableApi = {
    open(n) {
      if (!valid(n)) return Promise.resolve();
      return animate(n, { from: angle[n - 1], to: OPEN_ANGLE, ms: 600 });
    },
    close(n) {
      if (!valid(n)) return Promise.resolve();
      return animate(n, { from: angle[n - 1], to: 0, ms: 480 });
    },
    glow(n) {
      glowDoor = n !== null && valid(n) ? n : null;
      if (glowDoor !== null) {
        const c = doorCenter(glowDoor);
        doorGlow.position.set(c.x, floorY(glowDoor) + (ARCH_SPRING + ARCH_R) / 2 + 0.05, STABLE.frontZ + WALL_T / 2 + 0.06);
        doorGlow.visible = true;
      }
    },
    glowRow(row) {
      glowRowN = row === 0 || row === 1 ? row : null;
      if (glowRowN !== null) {
        rowGlow.position.set(STABLE.rows[glowRowN].centerX, ROOF_Y / 2, STABLE.frontZ + WALL_T / 2 + BALCONY_D + 0.1);
        rowGlow.visible = true;
      }
    },
    rattle(n) {
      if (!valid(n)) return Promise.resolve();
      return animate(n, { from: angle[n - 1], to: angle[n - 1], ms: 460, rattle: true });
    },
    lanterns(on) {
      lit = on;
    },
    hay(fill, ms = 900) {
      const to = Number.isFinite(fill) ? THREE.MathUtils.clamp(fill, 0, 1) : 0;
      if (ms <= 0 || to === hayFill) {
        hayTween = null;
        setHay(to);
        return;
      }
      hayTween = { from: hayFill, to, ms, t: 0 };
    },
  };

  const ease = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  /** Hay going in rises a little past the goal and settles: a soft, happy plop. */
  const easeBack = (x: number): number => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

  return {
    api,
    ready,
    get hayFill() {
      return hayFill;
    },
    setNight(n) {
      night = n;
      plaqueMat.emissiveIntensity = 0.38 * n;
    },
    update(dt, t) {
      const moved = anims.size > 0;
      for (const [n, a] of anims) {
        a.t += dt * 1000;
        const k = Math.min(1, a.t / a.ms);
        if (a.rattle) {
          // A short shake: quick small swings that die down.
          jiggle[n - 1] = Math.sin(k * Math.PI * 9) * 0.09 * (1 - k);
        } else {
          angle[n - 1] = a.from + (a.to - a.from) * ease(k);
        }
        pose(n);
        if (k >= 1) {
          jiggle[n - 1] = 0;
          pose(n);
          anims.delete(n);
          a.done();
        }
      }
      if (hayTween) {
        const h = hayTween;
        h.t += dt * 1000;
        const k = Math.min(1, h.t / h.ms);
        setHay(h.from + (h.to - h.from) * (h.to > h.from ? easeBack(k) : ease(k)));
        if (k >= 1) {
          hayTween = null;
          setHay(h.to);
        }
      }
      if (moved) {
        doors.instanceMatrix.needsUpdate = true;
        plaqueGeo.attributes.position.needsUpdate = true;
        plaqueGeo.attributes.normal.needsUpdate = true;
      }
      // Glows fade in and out and pulse softly while on.
      glowFade = THREE.MathUtils.clamp(glowFade + (glowDoor !== null ? dt : -dt) * 3, 0, 1);
      glowMat.opacity = glowFade * (0.8 + 0.2 * Math.sin(t * 4.2));
      doorGlow.visible = glowFade > 0;
      rowFade = THREE.MathUtils.clamp(rowFade + (glowRowN !== null ? dt : -dt) * 2.5, 0, 1);
      rowMat.opacity = rowFade * (0.32 + 0.14 * Math.sin(t * 2.6));
      rowGlow.visible = rowFade > 0;
      litFade = THREE.MathUtils.clamp(litFade + (lit ? dt : -dt) * 1.4, 0, 1);
      glassMat.color.set('#c9b9a0').lerp(tmpGlass.set('#ffe39a'), litFade);
      const flicker = 0.92 + 0.05 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 11.1);
      haloMat.opacity = litFade * 0.7 * flicker * (0.5 + 0.5 * night);
      halos.visible = litFade > 0;
      poolMat.opacity = litFade * 0.8 * flicker * night;
      lightPools.visible = poolMat.opacity > 0.01;
      // Lit lanterns warm the stalls from inside: cosy at dusk and night.
      stallMat.emissiveIntensity = litFade * (0.15 + 0.35 * night) * flicker;
    },
  };
}
const tmpGlass = new THREE.Color();
const tmpC = new THREE.Color();
