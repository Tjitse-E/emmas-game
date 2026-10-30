// The demo world's fixed places, in metres. The world lane builds geometry to match these points, the actor lane
// moves characters by them, and the level script uses them for goals. Change a place here and nowhere else.
//
// Axes: +x is east (right on screen), +z is south (towards the camera), +y is up. The camera looks north (-z).
// The ground is flat at y = 0 everywhere except the pond (water surface at POND.waterY) and the nest mound.
import * as THREE from 'three';

export type Vec2 = { x: number; z: number };

export const v2 = (x: number, z: number): Vec2 => ({ x, z });
export const dist2 = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Inside this rectangle everything is walkable except the obstacles below. A fence and trees mark the edge. */
export const BOUNDS = { minX: -26, maxX: 26, minZ: -22, maxZ: 15 } as const;

/** Where Princess Emma stands when the level starts. */
export const START: Vec2 = v2(-9, 3);

/** Lumi's gazebo: a round white and pink gazebo. An obstacle. */
export const GAZEBO = { center: v2(-14, -1), radius: 2.8 } as const;

/** The nest on a low mound. The egg sits in it. Princess Emma stands at `stand` for the egg moment. */
export const NEST = {
  center: v2(-4, 3),
  radius: 1.1, // obstacle radius
  eggY: 0.55, // egg centre height
  stand: v2(-4, 5.2),
} as const;

/** The pond: an ellipse. Its water is not walkable. Unicorns swim in it. */
export const POND = {
  center: v2(10, 4),
  rx: 6.5,
  rz: 4.5,
  waterY: -0.2,
  /** Points on the shore where swimmers climb out (just outside the ellipse). */
  exits: [v2(10, -1.1), v2(17.1, 4), v2(10, 9.1), v2(4.6, 7.2)] as Vec2[],
} as const;

export function inPond(p: Vec2, margin = 0): boolean {
  const dx = (p.x - POND.center.x) / (POND.rx + margin);
  const dz = (p.z - POND.center.z) / (POND.rz + margin);
  return dx * dx + dz * dz < 1;
}

/** A random point on the water, at least `inset` metres from the shore. */
export function pondSpot(rand: () => number = Math.random, inset = 1): Vec2 {
  const a = rand() * Math.PI * 2;
  const r = Math.sqrt(rand());
  return v2(POND.center.x + Math.cos(a) * (POND.rx - inset) * r, POND.center.z + Math.sin(a) * (POND.rz - inset) * r);
}

/**
 * The slide on the pond's west shore. A rider walks to LADDER_BASE, climbs the ladder to the top platform, sits, and
 * slides down the chute into the water at SPLASH. SLIDE_CURVE runs from the ladder base (u = 0) over the top to the
 * splash point (u = 1). The world lane builds the ladder along the first part and the chute along the rest.
 */
export const SLIDE = {
  ladderBase: v2(2.4, 0.4),
  top: new THREE.Vector3(3.6, 1.9, 0.4),
  splash: v2(7.4, 2.2),
  /** u where the climb ends and the chute starts. */
  climbEnd: 0.28,
  /** Where followers wait for their turn, on the grass west of the ladder. */
  queue: [v2(1.2, -0.6), v2(0.6, 0.9), v2(1.4, 2.2)] as Vec2[],
  /** The rectangle (on the ground) that counts as "the top of the slide" when a unicorn is dropped there. */
  dropZone: { center: v2(3.4, 0.4), radius: 1.6 },
} as const;

export const SLIDE_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2.4, 0, 0.4), // ladder base
  new THREE.Vector3(3.0, 1.0, 0.4), // climbing
  new THREE.Vector3(3.6, 1.9, 0.4), // top platform
  new THREE.Vector3(4.6, 1.75, 0.55),
  new THREE.Vector3(5.6, 1.2, 1.0),
  new THREE.Vector3(6.6, 0.45, 1.7),
  new THREE.Vector3(7.4, POND.waterY + 0.05, 2.2), // splash
]);

/** Where the second (wild) egg lands, on the pond's south-east shore. */
export const WILD_EGG = { at: v2(15.2, 9.4), stand: v2(15.2, 11.2) } as const;

/**
 * Two stable rows along the north side of the yard, fronts facing south (towards the camera). Each row is a
 * two-storey ten-frame: five doors below, five above with a balcony. Row 1 holds doors 1 to 10 (1-5 below, 6-10
 * above), row 2 doors 11 to 20 (11-15 below, 16-20 above). Door width 1.5 m.
 */
export const STABLE = {
  rows: [{ centerX: -4.5 }, { centerX: 4.5 }],
  frontZ: -13.5, // the door plane
  depth: 3.2, // the building goes north from frontZ
  doorWidth: 1.5,
  lowerDoorH: 0.9, // half door; a unicorn in its stall stands on a raised straw bed so its head shows over it
  upperFloorY: 1.95,
  standZ: -12.4, // where a unicorn stands in front of its door
  yard: { center: v2(0, -10), halfX: 10, halfZ: 2.6 },
  /** Where Princess Emma stands for the bedtime moments. */
  emmaStand: v2(0, -8.6),
} as const;

export function doorRow(n: number): number {
  return n <= 10 ? 0 : 1;
}
export function doorIsUpper(n: number): boolean {
  return ((n - 1) % 10) >= 5;
}
export function doorColumn(n: number): number {
  return (n - 1) % 5;
}
/** Ground point in front of door n. */
export function doorFront(n: number): Vec2 {
  const row = STABLE.rows[doorRow(n)];
  return v2(row.centerX + (doorColumn(n) - 2) * STABLE.doorWidth, STABLE.standZ);
}
/** Where a unicorn stands inside stall n (feet), facing south, so its head shows over the half door. */
export function stallSpot(n: number): THREE.Vector3 {
  const row = STABLE.rows[doorRow(n)];
  const x = row.centerX + (doorColumn(n) - 2) * STABLE.doorWidth;
  return new THREE.Vector3(x, doorIsUpper(n) ? STABLE.upperFloorY : 0, STABLE.frontZ - 0.75);
}
/** Centre of door n's opening (for the glow, the plaque and taps). */
export function doorCenter(n: number): THREE.Vector3 {
  const row = STABLE.rows[doorRow(n)];
  const x = row.centerX + (doorColumn(n) - 2) * STABLE.doorWidth;
  const y = (doorIsUpper(n) ? STABLE.upperFloorY : 0) + STABLE.lowerDoorH * 0.55;
  return new THREE.Vector3(x, y, STABLE.frontZ + 0.02);
}

/**
 * The hay rack west of the yard sand (side quest, docs/v4/2.2.md section 5): a slatted A-frame over a trough, outside
 * the door framing. An obstacle. She stands at `stand`; up to three hungry herd unicorns eat at `eat`.
 */
export const HAY_RACK = {
  center: v2(-12.6, -11.6),
  radius: 0.9,
  stand: v2(-12.6, -9.6),
  /** The middle spot sits 1.35 m south of the centre, just outside the walking margin (0.9 + 0.4 m). */
  eat: [v2(-13.8, -10.6), v2(-11.4, -10.6), v2(-12.6, -10.25)] as Vec2[],
} as const;

/**
 * The royal picnic south of the gazebo step (side quest, section 5): a rug of 2.4 x 1.8 m, two seats on it for the
 * babies, her spot east of it and the hamper at the rug's south-east corner beside her. Not an obstacle: the babies
 * walk onto the rug. 2.3.0 moved the hamper 0.9 m south and the seats 0.15 m south: the Dressing Corner's close-up
 * camera stands over the rug, and there the hamper and the east cushion's back edge stood in the bottom of the
 * picture.
 */
export const PICNIC = {
  rug: { center: v2(-14, 4.6), halfX: 1.2, halfZ: 0.9 },
  seats: [v2(-14.7, 4.25), v2(-13.3, 4.25)] as Vec2[],
  stand: v2(-12.2, 5.0),
  hamper: v2(-12.7, 5.3),
  /** Where her other followers wait during the picnic: west of the rug, clear of the cushions and the 5.5 m frame. */
  aside: [v2(-17, 4.0), v2(-17.3, 5.1), v2(-16.8, 2.9)] as Vec2[],
} as const;

/**
 * The Dressing Corner at the south step of Lumi's gazebo (docs/v4/2.3.md section 17.1). The lilac trunk moves out
 * of the gazebo to the step's west side and a standing mirror stands on its east side, where the two flower pots were
 * (they move round to 0.2 and 0.8 pi). She dresses at `stand`, 2.0 s from START; the babies stand at `babies` for the
 * gate's two phrase reads, in front of the trunk and the mirror; her other followers wait at `aside` (the picnic's
 * spots, west of the rug). The trunk and the mirror are small obstacles (`radius`). `herd`: the grazing homes near the
 * step and where those unicorns step aside to (quest-kit.ts herdAsideAt). `watch`: where the two babies watch her
 * dress, outside her close-up and clear of the followers' spots (west of the rug, and east of the mirror).
 */
export const CORNER = {
  stand: v2(-14, 2.7),
  trunk: v2(-15.5, 2.0),
  mirror: v2(-12.5, 2.0),
  radius: 0.45,
  babies: [v2(-15.2, 3.4), v2(-12.8, 3.4)] as Vec2[],
  aside: [v2(-17, 4.0), v2(-17.3, 5.1), v2(-16.8, 2.9)] as Vec2[],
  herd: [[v2(-12, 7), v2(-14, 12)], [v2(-7, 9), v2(-4, 12)], [v2(-16, -7), v2(-17, -13)]] as [Vec2, Vec2][],
  watch: [v2(-15.8, 4.5), v2(-11.6, 3.1)] as Vec2[],
} as const;

/**
 * The bead tree in the east yard (side quest, docs/v4/2.3.md section 17.1): a small tree with bead strings in its
 * branches, the mirror of the hay rack, outside the 19 m door framing, 8.6 s from the wild egg and 8.7 s from START.
 * Its trunk is an obstacle. She stands at `stand` (west of it, so the tree stays on the left of the screen); the baby
 * whose necklace it is stands at `baby`; her other followers wait at `aside`, west in the yard; `herd` as for the
 * Corner.
 */
export const BEAD_TREE = {
  center: v2(12.6, -9.6),
  radius: 0.8,
  stand: v2(10.2, -9.0),
  baby: v2(11.1, -8.1),
  aside: [v2(8.6, -10.4), v2(8.2, -8.8), v2(9.0, -7.4)] as Vec2[],
  herd: [[v2(12, -6), v2(15.5, -3.5)]] as [Vec2, Vec2][],
} as const;

/**
 * The moon mist in the north-east corner, with a saddle sign in front of it: what opens in 2.4 (2.3.md section 17.1). The mist
 * bank lies behind the stables' back line (z below -16.7), where nobody walks, so it needs no obstacle and the routes
 * do not change; the sign stands on the grass in front of it. Its post is a small obstacle (`signRadius`); `signStand`
 * is the grass in front of it, where she reads it.
 */
export const MIST = {
  center: v2(21.5, -19.8),
  rx: 4.5,
  rz: 2.8,
  sign: v2(19.4, -15.6),
  signRadius: 0.25,
  signStand: v2(19.4, -14.2),
} as const;

/**
 * Riding (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5): the paddock in the north-east corner, east of the grand tree at
 * (19, -7), so the follow camera sees the mounts past its crown. Her stand, the mounts' spots (both turned south-west
 * towards her stand), the back rail with its gap for the ride path, the trough and the tub at the back, the gate in
 * the north fence where the moon mist was, the fork with its signpost, the three clearing slots (west, north, east),
 * the trail speed, the followers' gaps behind the mount, the ride camera's clamp and its look-ahead. The trough and the
 * tub become obstacles with the trail lane.
 */
export const RIDE = {
  paddock: { minX: 21, maxX: 25.5, minZ: -16.3, maxZ: -10 },
  stand: v2(22.0, -11.2),
  mounts: { bella: v2(22.9, -13.6), hazel: v2(24.7, -12.6) },
  rail: { z: -16.5, minX: 21, maxX: 26, gapX: 22.5 },
  trough: { center: v2(24.0, -15.7), radius: 0.5 },
  tub: { center: v2(25.2, -15.0), radius: 0.5 },
  gate: v2(21.5, -22.7),
  fork: v2(21.5, -29),
  slots: [v2(11.5, -31), v2(21.5, -40), v2(31.5, -31)],
  speed: 4.2,
  gaps: [1.6, 3.0, 4.4],
  clamp: { minX: -23, maxX: 36, minZ: -44, maxZ: 13.5 },
  ahead: 1,
} as const;

/** An arc-length path at y 0 through ground points (CatmullRom, centripetal so a sharp corner does not loop). */
function groundPath(points: readonly Vec2[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal');
}

/**
 * The set paths of a trip, arc-length curves at y 0: each mount's spot to the fork through the rail gap and the gate,
 * the fork to each slot (west, north, east), and the fork home to her stand. Step 0's curves are straight-ish
 * polylines through the points of RIDE; the trail lane gives them their bends.
 */
export const RIDE_PATHS: {
  out: { bella: THREE.CatmullRomCurve3; hazel: THREE.CatmullRomCurve3 };
  roads: [THREE.CatmullRomCurve3, THREE.CatmullRomCurve3, THREE.CatmullRomCurve3];
  home: THREE.CatmullRomCurve3;
} = {
  out: {
    bella: groundPath([RIDE.mounts.bella, v2(RIDE.rail.gapX, RIDE.rail.z), RIDE.gate, RIDE.fork]),
    hazel: groundPath([RIDE.mounts.hazel, v2(RIDE.rail.gapX, RIDE.rail.z + 0.6), v2(RIDE.rail.gapX, RIDE.rail.z), RIDE.gate, RIDE.fork]),
  },
  roads: [
    groundPath([RIDE.fork, v2(16.5, -30.5), RIDE.slots[0]]),
    groundPath([RIDE.fork, v2(21.5, -34.5), RIDE.slots[1]]),
    groundPath([RIDE.fork, v2(26.5, -30.5), RIDE.slots[2]]),
  ],
  home: groundPath([RIDE.fork, RIDE.gate, v2(RIDE.rail.gapX, RIDE.rail.z), RIDE.stand]),
};

/**
 * The night views of bedtime and goodnight (moved from level.ts in 2.4.0, unchanged, so the trail lane's night-view test
 * and bedtime.ts read the same poses). "Fourteen unicorns!": the camera tilts up so the stars and the castle rise above
 * the stable roofs. The star band and the castle sit 2 to 11 degrees above the horizon, so the view looks only 12
 * degrees down and its window is shifted up (shiftY), which puts the top edge about 15 degrees above the horizon.
 */
export const NIGHT_SKY = { center: { x: 0, z: -12 }, width: 19, pitch: 12, shiftY: 0.2 };
/** The bedtime frame of both stable rows. */
export const STABLE_FRAME = { center: { x: 0, z: -11.6 }, width: 19 };

/** The big trees inside the fence (the world draws one on each). Obstacles. */
export const TREES: { center: Vec2; radius: number }[] = [
  { center: v2(-20, -9), radius: 1.6 },
  { center: v2(19, -7), radius: 1.6 },
  { center: v2(-21, 10), radius: 1.6 },
  { center: v2(21, 12), radius: 1.4 },
  { center: v2(-8, -18), radius: 1.4 },
  { center: v2(14, -17), radius: 1.4 },
];

/**
 * Round obstacles for walking (the gazebo, the nest, the trees, the hay rack, the Corner's trunk and mirror, the bead
 * tree, the saddle sign's post). The pond is handled by inPond.
 */
export const OBSTACLES: { center: Vec2; radius: number }[] = [
  { center: GAZEBO.center, radius: GAZEBO.radius },
  { center: NEST.center, radius: NEST.radius },
  ...TREES,
  { center: HAY_RACK.center, radius: HAY_RACK.radius },
  { center: CORNER.trunk, radius: CORNER.radius },
  { center: CORNER.mirror, radius: CORNER.radius },
  { center: BEAD_TREE.center, radius: BEAD_TREE.radius },
  { center: MIST.sign, radius: MIST.signRadius },
];

/** Stable buildings as rectangles (obstacles): x from centerX - 3.9 to + 3.9, z from frontZ - depth to frontZ. */
export function inStableBuilding(p: Vec2, margin = 0): boolean {
  if (p.z > STABLE.frontZ + margin || p.z < STABLE.frontZ - STABLE.depth - margin) return false;
  return STABLE.rows.some((r) => Math.abs(p.x - r.centerX) < 3.9 + margin);
}

/** Grazing homes for the starting herd of 12 (one each), spread over the meadow, clear of the picnic rug. */
export const GRAZE_HOMES: Vec2[] = [
  v2(-12, 7), v2(-19, 8), v2(-7, 9), v2(-1, 8), v2(2, -4), v2(-9, -6),
  v2(-16, -7), v2(18, -2), v2(20, 7), v2(6, 11), v2(-3, -7), v2(12, -6),
];

/** Places the level points at (goal beacons, edge arrows and "this way" lines). */
export type Place = 'nest' | 'pond' | 'slide' | 'wildEgg' | 'stable' | 'gazebo' | 'rack' | 'picnic' | 'corner' | 'beads' | 'saddle';
export const PLACES: Record<Place, Vec2> = {
  nest: NEST.center,
  pond: POND.center,
  slide: SLIDE.ladderBase,
  wildEgg: WILD_EGG.at,
  stable: STABLE.emmaStand,
  gazebo: GAZEBO.center,
  rack: HAY_RACK.center,
  picnic: PICNIC.rug.center,
  corner: CORNER.stand,
  beads: BEAD_TREE.center,
  saddle: RIDE.stand,
};
