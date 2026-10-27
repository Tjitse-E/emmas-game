// Code-built geometry for the characters. Kept low in triangles (the actors' share of the iPad Air 2 budget is
// 35,000) and smooth-shaded, so the soft picture-book shading does the work. Flat (unlit) shapes carry white vertex
// colours, so the instance colour alone decides their colour.
import * as THREE from 'three';

const WHITE = new THREE.Color(1, 1, 1);

function withColour(g: THREE.BufferGeometry, c = WHITE): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

function lean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.deleteAttribute('uv');
  return g;
}

/**
 * Unit sphere made from a subdivided cube (n by n quads a face). Its triangles are spread evenly, so it gives a rounder
 * outline for the triangles than a latitude-longitude sphere: n = 4 is 192 triangles with a 16-sided outline.
 */
export function sphere(n: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)],
    [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
    [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)],
    [new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
    [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
    [new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)],
  ];
  const p = new THREE.Vector3();
  for (const [normal, u, v] of faces) {
    const base = pos.length / 3;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        // Equal-angle spacing keeps the cells the same size on the sphere.
        const a = Math.tan(((i / n) * 2 - 1) * (Math.PI / 4));
        const b = Math.tan(((j / n) * 2 - 1) * (Math.PI / 4));
        p.copy(normal).addScaledVector(u, a).addScaledVector(v, b).normalize();
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = base + j * (n + 1) + i;
        const c = a + n + 1;
        index.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.slice(), 3));
  g.setIndex(index);
  return g;
}

/** A row-by-row lathe around y, with the seam welded so the shading has no line. */
export function lathe(
  rows: { r: number; y: number; c?: THREE.Color; a?: number }[],
  radial: number,
  /** Radius change per row and angle (frills, the horn's spiral). */
  wobble?: (row: number, theta: number) => number,
  /** Height change per row and angle (a draped edge). */
  lift?: (row: number, theta: number) => number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const colour: number[] = [];
  const withAlpha = rows.some((r) => r.a !== undefined);
  rows.forEach((row, i) => {
    for (let k = 0; k < radial; k++) {
      const th = (k / radial) * Math.PI * 2;
      const r = row.r * (1 + (wobble ? wobble(i, th) : 0));
      pos.push(Math.sin(th) * r, row.y + (lift ? lift(i, th) : 0), Math.cos(th) * r);
      const c = row.c ?? WHITE;
      colour.push(c.r, c.g, c.b);
      if (withAlpha) colour.push(row.a ?? 1);
    }
  });
  const index: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k;
      const b = i * radial + ((k + 1) % radial);
      const c = a + radial;
      const d = b + radial;
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colour, withAlpha ? 4 : 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** A leaf-shaped ear (and the nightcap): base at y = 0, tip at y = 1, radius 1. */
export function ear(): THREE.BufferGeometry {
  return lathe(
    [
      { r: 0.0, y: -0.02 },
      { r: 0.95, y: 0.15 },
      { r: 0.72, y: 0.62 },
      { r: 0.0, y: 1.0 },
    ],
    6,
  );
}

/** A slightly tapered round limb from y = 0 (bottom, closed) to y = 1 (top, open: it sits inside a body). */
export function limb(): THREE.BufferGeometry {
  const g = lathe(
    [
      { r: 0.0, y: 0.0 },
      { r: 0.86, y: 0.0 },
      { r: 1.0, y: 1.0 },
    ],
    6,
  );
  return g;
}

/** The golden spiral horn: a cone with a helical ridge, base at y = 0, tip at y = 1. */
export function horn(): THREE.BufferGeometry {
  const rows = Array.from({ length: 8 }, (_, i) => {
    const y = i / 7;
    return { r: i === 7 ? 0 : Math.pow(1 - y, 0.85), y };
  });
  return lathe(rows, 7, (i, th) => 0.22 * Math.cos(th - (i / 7) * Math.PI * 2 * 2.6));
}

/** A disc facing +z with white vertex colours. */
export function disc(segments: number): THREE.BufferGeometry {
  return withColour(lean(new THREE.CircleGeometry(1, segments)));
}

/** The iris: a disc facing +z, dark in the middle (the pupil) and lighter towards the bottom, as picture-book eyes are. */
export function iris(): THREE.BufferGeometry {
  const seg = 12;
  const pos: number[] = [0, 0.06, 0];
  const colour: number[] = [0.05, 0.04, 0.08];
  for (const [r, dark, light] of [
    [0.52, 0.12, 0.42],
    [1.0, 0.7, 1.45],
  ] as const) {
    for (let k = 0; k < seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const x = Math.sin(th) * r;
      const y = Math.cos(th) * r;
      pos.push(x, y + (r < 1 ? 0.06 : 0), 0);
      const v = THREE.MathUtils.lerp(light, dark, (y / r + 1) / 2);
      colour.push(v, v, v);
    }
  }
  const index: number[] = [];
  for (let k = 0; k < seg; k++) {
    const a = 1 + k;
    const b = 1 + ((k + 1) % seg);
    index.push(0, b, a);
    index.push(a, b, a + seg, b, b + seg, a + seg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
  g.setIndex(index);
  return g;
}

/** A flat half ring (∩) facing +z, thicker in the middle: lash lines, closed eyes (scaled to ∪ by a flip), smiles. */
export function arc(): THREE.BufferGeometry {
  const seg = 10;
  const pos: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const th = Math.PI * (i / seg);
    const w = 0.08 + 0.14 * Math.sin(th);
    const cx = Math.cos(th);
    const cy = Math.sin(th);
    pos.push(cx * (1 + w), cy * (1 + w), 0, cx * (1 - w), cy * (1 - w), 0);
  }
  const index: number[] = [];
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return withColour(g);
}

/** A soft round disc facing +z that fades to nothing at the edge (blob shadows, rosy cheeks). */
export function softDisc(): THREE.BufferGeometry {
  const seg = 10;
  const pos: number[] = [0, 0, 0];
  const colour: number[] = [1, 1, 1, 1];
  for (const [r, a] of [
    [0.55, 0.85],
    [1, 0],
  ] as const) {
    for (let k = 0; k < seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      pos.push(Math.cos(th) * r, Math.sin(th) * r, 0);
      colour.push(1, 1, 1, a);
    }
  }
  const index: number[] = [];
  for (let k = 0; k < seg; k++) {
    const a = 1 + k;
    const b = 1 + ((k + 1) % seg);
    index.push(0, a, b, a, a + seg, b, b, a + seg, b + seg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colour, 4));
  g.setIndex(index);
  return g;
}

/** A flat ripple ring on the xz plane, radius 1, soft on both edges. */
export function ring(): THREE.BufferGeometry {
  const g = lathe(
    [
      { r: 0.72, y: 0, a: 0 },
      { r: 0.88, y: 0, a: 1 },
      { r: 1.0, y: 0, a: 0 },
    ],
    20,
  );
  g.deleteAttribute('normal');
  return g;
}

/** The moonbeam: an open column from y = 0 to y = 1, widening upwards, fading out towards the sky, with soft stripes that shimmer as it turns. */
export function beam(): THREE.BufferGeometry {
  const rows = [0, 0.08, 0.35, 0.7, 1].map((y) => ({ r: 1 + y * 0.5, y, a: y < 0.05 ? 0.35 : Math.pow(1 - y, 1.4) }));
  const g = lathe(rows, 18);
  const c = g.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < c.count; i++) {
    const th = ((i % 18) / 18) * Math.PI * 2;
    c.setW(i, c.getW(i) * (0.62 + 0.38 * Math.cos(th * 3)));
  }
  g.deleteAttribute('normal');
  return g;
}

/** A soft heap of straw: a flattened rounded mound, base at y = 0, top at y = 1. */
export function straw(): THREE.BufferGeometry {
  return lathe(
    [
      { r: 0, y: 0 },
      { r: 1, y: 0 },
      { r: 1.04, y: 0.35 },
      { r: 0.92, y: 0.75 },
      { r: 0.6, y: 0.97 },
      { r: 0, y: 1 },
    ],
    12,
    (i, th) => (i === 2 || i === 3 ? 0.06 * Math.cos(th * 7) : 0),
  );
}

/** The parts of a dress that take their own colour: the hem lace, the lower and upper tiers, the sash and the bodice. */
export type DressRole = 'trim' | 'main' | 'deep' | 'sash' | 'bodice';
export type DressShape = 'party' | 'ball' | 'tutu';

export interface DressRow {
  r: number;
  y: number;
  role: DressRole;
  /** Scallops: rounded bumps all round the edge (12 per turn), as a fraction of r. */
  wave?: number;
  /** Turns the scallops half a bump, so stacked ruffles interleave. */
  shift?: boolean;
  /** A draped edge: the hem rises at six gathers and hangs between them, in metres. */
  drape?: number;
}

/** The sash and the bodice, the same in every shape (feet at y = 0). */
const TOP: DressRow[] = [
  { r: 0.158, y: 0.6, role: 'sash' },
  { r: 0.162, y: 0.625, role: 'sash' },
  { r: 0.152, y: 0.655, role: 'sash' },
  { r: 0.15, y: 0.66, role: 'bodice' },
  { r: 0.162, y: 0.73, role: 'bodice' },
  { r: 0.158, y: 0.79, role: 'bodice' },
  { r: 0.125, y: 0.85, role: 'bodice' },
  { r: 0.07, y: 0.88, role: 'bodice' },
  { r: 0.0, y: 0.885, role: 'bodice' },
];

/**
 * The three dress shapes, 22 rows each (2.5). Party: today's lace hem, two scalloped tiers, sash and bodice. Ball:
 * floor length with a lace hem, an underskirt and a draped overskirt edge at 0.40. Tutu: four ruffles from 0.58 down
 * to 0.43, closed underneath at 0.41, so the legs show.
 */
export const DRESS_ROWS: Record<DressShape, readonly DressRow[]> = {
  party: [
    { r: 0.0, y: 0.17, role: 'trim' },
    { r: 0.3, y: 0.162, role: 'trim' },
    { r: 0.372, y: 0.172, role: 'trim', wave: 0.045 },
    { r: 0.374, y: 0.2, role: 'trim', wave: 0.045 },
    { r: 0.35, y: 0.21, role: 'main', wave: 0.03 },
    { r: 0.352, y: 0.232, role: 'main', wave: 0.03 },
    { r: 0.322, y: 0.31, role: 'main' },
    { r: 0.282, y: 0.39, role: 'main' },
    { r: 0.27, y: 0.4, role: 'deep' },
    { r: 0.322, y: 0.385, role: 'deep', wave: 0.04 },
    { r: 0.32, y: 0.41, role: 'deep', wave: 0.04 },
    { r: 0.262, y: 0.5, role: 'deep' },
    { r: 0.19, y: 0.585, role: 'deep' },
    ...TOP,
  ],
  ball: [
    { r: 0.0, y: 0.045, role: 'trim' },
    { r: 0.4, y: 0.035, role: 'trim' },
    { r: 0.44, y: 0.04, role: 'trim', wave: 0.04 },
    { r: 0.44, y: 0.09, role: 'trim', wave: 0.04 },
    { r: 0.425, y: 0.095, role: 'main' },
    { r: 0.395, y: 0.19, role: 'main' },
    { r: 0.36, y: 0.29, role: 'main' },
    { r: 0.325, y: 0.38, role: 'main' },
    { r: 0.3, y: 0.425, role: 'deep' },
    { r: 0.36, y: 0.39, role: 'deep', drape: 0.06 },
    { r: 0.355, y: 0.43, role: 'deep', drape: 0.05 },
    { r: 0.28, y: 0.51, role: 'deep' },
    { r: 0.19, y: 0.587, role: 'deep' },
    ...TOP,
  ],
  tutu: [
    { r: 0.0, y: 0.41, role: 'deep' },
    { r: 0.27, y: 0.405, role: 'deep' },
    { r: 0.41, y: 0.43, role: 'trim', wave: 0.06 },
    { r: 0.395, y: 0.452, role: 'main', wave: 0.06 },
    { r: 0.26, y: 0.47, role: 'deep' },
    { r: 0.38, y: 0.48, role: 'trim', wave: 0.06, shift: true },
    { r: 0.365, y: 0.502, role: 'main', wave: 0.06, shift: true },
    { r: 0.23, y: 0.52, role: 'deep' },
    { r: 0.34, y: 0.53, role: 'trim', wave: 0.06 },
    { r: 0.325, y: 0.552, role: 'main', wave: 0.06 },
    { r: 0.2, y: 0.57, role: 'deep' },
    { r: 0.3, y: 0.58, role: 'trim', wave: 0.06, shift: true },
    { r: 0.285, y: 0.598, role: 'main', wave: 0.06, shift: true },
    ...TOP,
  ],
};

/** Radial segments of every dress. */
export const DRESS_RADIAL = 24;

/**
 * One dress shape with white vertex colours (item size 3, so swapping shapes never compiles a new program); paint it
 * with `paintDress`. Scallops are rounded bumps all round the edge of a tier.
 */
export function dressGeometry(shape: DressShape): THREE.BufferGeometry {
  const rows = DRESS_ROWS[shape];
  return lathe(
    rows.map((r) => ({ r: r.r, y: r.y })),
    DRESS_RADIAL,
    (i, th) => (rows[i].wave ?? 0) * (Math.abs(Math.cos(th * 6 + (rows[i].shift ? Math.PI / 12 : 0))) - 0.5),
    (i, th) => (rows[i].drape ?? 0) * Math.pow(Math.abs(Math.cos(th * 3)), 3),
  );
}

/**
 * Write a dress's vertex colours row by row. `colourOf` gets the row's role and its place inside that role from 0 (the
 * lowest row) to 1 (the highest), for graded tiers.
 */
export function paintDress(g: THREE.BufferGeometry, shape: DressShape, colourOf: (role: DressRole, k: number, out: THREE.Color) => THREE.Color): void {
  const rows = DRESS_ROWS[shape];
  const a = g.getAttribute('color') as THREE.BufferAttribute;
  const span = new Map<DressRole, [number, number]>();
  for (const r of rows) {
    const s = span.get(r.role);
    span.set(r.role, s ? [Math.min(s[0], r.y), Math.max(s[1], r.y)] : [r.y, r.y]);
  }
  rows.forEach((r, i) => {
    const [lo, hi] = span.get(r.role)!;
    colourOf(r.role, hi > lo ? (r.y - lo) / (hi - lo) : 0, _c);
    for (let k = 0; k < DRESS_RADIAL; k++) a.setXYZ(i * DRESS_RADIAL + k, _c.r, _c.g, _c.b);
  });
  a.needsUpdate = true;
}

const _c = new THREE.Color();

/** A small crown: a band with five points, base at y = 0, radius 1 (it is scaled to the head). Double sided. */
export function crown(): THREE.BufferGeometry {
  const seg = 40;
  const pos: number[] = [];
  for (let k = 0; k < seg; k++) {
    const th = (k / seg) * Math.PI * 2;
    const f = ((k / seg) * 5) % 1;
    const spike = Math.max(0, 1 - Math.abs(f - 0.5) * 2.4);
    pos.push(Math.sin(th), 0, Math.cos(th), Math.sin(th) * 1.08, 0.42 + spike * 0.62, Math.cos(th) * 1.08);
  }
  const index: number[] = [];
  for (let k = 0; k < seg; k++) {
    const a = k * 2;
    const b = ((k + 1) % seg) * 2;
    index.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** The tips of the crown's five points (for the little gold balls), in the crown's own units. */
export function crownTips(): THREE.Vector3[] {
  return Array.from({ length: 5 }, (_, i) => {
    const th = ((i + 0.5) / 5) * Math.PI * 2;
    return new THREE.Vector3(Math.sin(th) * 1.08, 1.04, Math.cos(th) * 1.08);
  });
}
