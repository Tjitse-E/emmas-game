// Contracts between the demo's parts. Each lane implements its side in its own folder and only depends on this file,
// src/layout.ts, src/wardrobe.ts, src/assets.ts and src/audio/index.ts. Changing a contract means changing every side
// that uses it.
//
//   world   src/world/    createWorld(container)          the three.js stage, scenery, stable, camera, routes
//   actors  src/actors/   createActors(scene, deps)       Princess Emma, the herd, the egg, effects
//   ui      src/ui/       createLayer(root, deps)         the 2D layer: learning moments, Lumi, arrows, ghost hand
//   content src/content/  content functions               names, words, egg numbers and clip ids for each moment
//   game    src/game/     the level script, input, test hook (built on top of all four)
import type * as THREE from 'three';
import type { Vec2, Place } from './layout';

export type { Vec2, Place };

/** A point on screen in CSS pixels, relative to the viewport. */
export interface ScreenPoint {
  x: number;
  y: number;
  /** False when the point is behind the camera or off screen. */
  visible: boolean;
}

/** A box on screen in CSS pixels, relative to the viewport. */
export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The result of one checked moment (v3 spec 3.2). */
export type Outcome = 'first' | 'miss' | 'helped';
export interface MomentResult {
  outcome: Outcome;
  misses: number;
  /** Decision time: from the moment an answer was possible to the first touch of the chosen object. */
  ms: number;
}

// ---------------------------------------------------------------------------------------------------------------
// world (src/world/index.ts exports createWorld)
// ---------------------------------------------------------------------------------------------------------------

export type WorldPick =
  | { kind: 'door'; door: number }
  | { kind: 'slide' }
  | { kind: 'nest' }
  | { kind: 'pond'; at: Vec2 }
  | { kind: 'gazebo' }
  | { kind: 'rack' } // the hay rack (2.2.0 side quest)
  | { kind: 'picnic' } // the picnic rug and hamper (2.2.0 side quest)
  | { kind: 'corner' } // the trunk and the mirror at the gazebo step (2.3.0 Dressing Corner)
  | { kind: 'beads' } // the bead tree (2.3.0 side quest)
  | { kind: 'sign' } // the saddle sign at the moon mist (2.3.0)
  | { kind: 'ground'; at: Vec2 };

export interface StableApi {
  /** Door n opens (swings) and closes again. Resolve when the swing is done. */
  open(n: number): Promise<void>;
  close(n: number): Promise<void>;
  /** A soft pulsing glow around door n, or none. Only one door glows at a time. */
  glow(n: number | null): void;
  /** A glow over a whole stable row (0 or 1), the focused hint for door numerals, or none. */
  glowRow(row: number | null): void;
  /** A short shake of a closed door (a wrong tap at roll call). */
  rattle(n: number): Promise<void>;
  /** Lanterns on the stable fronts, lit at dusk. */
  lanterns(on: boolean): void;
  /** The hay in the hay rack, from 0 (empty, not drawn) to 1 (full), eased over `ms`. It stays for the day. */
  hay(fill: number, ms?: number): void;
}

export interface World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  /** Register a per-frame callback (dt in seconds, clamped to 0.05; t = seconds since start). Returns an unsubscribe. */
  onFrame(fn: (dt: number, t: number) => void): () => void;
  /** Start the render loop. */
  start(): void;
  /** The camera follows this point with soft damping (the raised camera behind and above, fixed angle). */
  follow(target: () => Vec2): void;
  /**
   * Ease the camera to frame a spot for a moment: `center` on the ground, `width` metres of ground visible across
   * the screen, optional `shiftY` (fraction of screen height, positive moves the framed spot down on screen).
   * Resolves when the camera has arrived. The camera stays there until releaseFrame().
   */
  frame(center: Vec2, width: number, o?: { ms?: number; shiftY?: number }): Promise<void>;
  /** Go back to following, easing over about 0.8 s. */
  releaseFrame(): void;
  /** Opening shot: start high over the meadow and sweep down to the follow position over `ms`. */
  introSweep(ms: number): Promise<void>;
  /**
   * World things under a screen point, nearest first by priority: door, slide, nest, rack, picnic, corner, beads,
   * sign, gazebo, pond, ground.
   */
  pick(clientX: number, clientY: number): WorldPick | null;
  /** The ground point under a screen point (y = 0 plane), or null when the ray misses the ground. */
  groundAt(clientX: number, clientY: number): Vec2 | null;
  /** A world point on screen. */
  toScreen(p: THREE.Vector3): ScreenPoint;
  /** A ray from the camera through a screen point (for picking unicorns). */
  ray(clientX: number, clientY: number): THREE.Raycaster;
  /** A walking route from a to b around obstacles and the pond: a list of points ending at b (or the nearest walkable point to b). */
  route(from: Vec2, to: Vec2): Vec2[];
  isWalkable(p: Vec2): boolean;
  nearestWalkable(p: Vec2): Vec2;
  readonly stable: StableApi;
  /** The nest glows softly while an egg waits in it. */
  nestGlow(on: boolean): void;
  /** A sparkle beacon (a soft column of light with stars) over the current goal, or none. */
  markGoal(p: Vec2 | null): void;
  /** 0 = day, 0.5 = sunset, 1 = night (stars, lanterns, fireflies). Eases over ms. */
  setTimeOfDay(t: number, ms?: number): Promise<void>;
  /**
   * Skip renderer.render while on (frame callbacks keep running), for full-screen views that cover the world (the
   * start screen and the end screen).
   */
  setPaused(on: boolean): void;
  /**
   * Called once with 1 when the automatic fallback has lowered the pixel ratio, and once with 2 when the frame rate
   * is still low after that. URL options read at createWorld: ?pr=<n> (pixel ratio cap), ?aa=0 (no antialias).
   */
  onSlow(fn: (level: 1 | 2) => void): void;
  /** Frame stats for ?perf=1 and the flows. quality: 0 full, 1 lower pixel ratio, 2 still slow after that. */
  perf(): {
    fps: number;
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    pixelRatio: number;
    quality: 0 | 1 | 2;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// actors (src/actors/index.ts exports createActors)
// ---------------------------------------------------------------------------------------------------------------

export type Stage = 'baby' | 'foal';
export type Breed = 'moon' | 'nestling' | 'snow' | 'berry';

/** How a unicorn looks. Colours are CSS hex strings. */
export interface UnicornLook {
  stage: Stage;
  breed: Breed;
  body: string;
  mane: string;
  mane2: string; // second mane colour, for curls and the tail tip
  horn?: string; // default gold
  shiny?: boolean;
}

export type UnicornMode =
  | 'idle' // standing, small idle moves
  | 'graze' // wandering slowly around its home, nibbling
  | 'follow' // following Princess Emma
  | 'walk' // on a goTo route
  | 'slide' // on the slide (climbing or sliding)
  | 'swim' // paddling in the pond, climbs out by itself after a while
  | 'carried' // floating on a moonbeam (dragged)
  | 'stall' // inside its stall (head over the door when peeking)
  | 'hatching'; // just hatched, not walking yet

export type UnicornEmote = 'hop' | 'nuzzle' | 'shake' | 'munch' | 'happy' | 'shiver' | 'look' | 'yawn';

export interface Unicorn {
  readonly id: string;
  name: string;
  look: UnicornLook;
  /** Feet position (y follows the ground, the water or the slide). */
  readonly position: THREE.Vector3;
  readonly mode: UnicornMode;
  /** Top of the head in world space (for bubbles and name tags). */
  headTop(out?: THREE.Vector3): THREE.Vector3;
  /** Walk or trot along a route (from world.route). Resolves true on arrival, false when another command replaced it. */
  goTo(route: Vec2[], o?: { trot?: boolean }): Promise<boolean>;
  /** Follow Princess Emma, keeping slot 0, 1 or 2 behind her. Hops about and plays when she stands still. */
  follow(slot: number): void;
  /** Wander and graze around a home point. */
  graze(home: Vec2): void;
  /** Climb the slide, slide down into the water with a splash, then swim. Resolves at the splash. */
  rideSlide(): Promise<void>;
  /** Swim in the pond from where it is now, then climb out by itself after 6 to 12 s and graze near the shore. */
  swim(): void;
  /** Lift onto a moonbeam (start of a drag). */
  lift(): void;
  /** While carried: float to this ground point (about 1 m up). */
  carryTo(p: Vec2): void;
  /** End of a drag: settle at this point. In the slide drop zone it rides the slide, in the pond it swims. */
  drop(p: Vec2): void;
  /** Walk to the front of door n, then go in (float up on a moonbeam for an upper door) and turn to face out. */
  enterStall(door: number): Promise<void>;
  /** Inside the stall: poke the head out over the door (true) or duck down out of sight (false). */
  peek(on: boolean): void;
  /** A sleepy nightcap (for "Not me!" at a wrong door). */
  nightcap(on: boolean): void;
  /** Turn the head towards a point, or back to normal. */
  lookAt(p: Vec2 | null): void;
  /** One short animation. Resolves when it ends. */
  emote(kind: UnicornEmote): Promise<void>;
  /**
   * Show a small toy next to it in the water or on the grass (the bath wish), as a 3D floating picture, or with
   * `on: 'head'` on top of its head (the dress-up wish's 'wear'). `tint` colours a greyscale picture (WishItem.tint).
   * null takes it away.
   */
  showToy(pictureUrl: string | null, o?: { on?: 'ground' | 'head'; tint?: string }): void;
}

export interface Herd {
  /** Add a unicorn. It starts in 'idle' at `at`, facing south. */
  add(o: { id: string; name: string; look: UnicornLook; at: Vec2; mode?: 'idle' | 'hatching' }): Unicorn;
  get(id: string): Unicorn | undefined;
  all(): Unicorn[];
  /** The unicorn under a screen ray, with a generous hit radius (at least 64 px on screen). */
  pick(ray: THREE.Raycaster): Unicorn | null;
}

export type PrincessMode = 'idle' | 'walk' | 'run' | 'climb' | 'slide' | 'swim';

// Princess Emma's look (docs/v4/2.3.md section 15). Colour and shape are split: every coloured part takes one
// of the twelve palette colours, the hair also one of six natural shades. The ids, hex values, words and gift sets are
// in src/wardrobe.ts.
/** The shared palette: eleven colours and rainbow, two rails of six. */
export type Colour =
  | 'pink' | 'red' | 'orange' | 'gold' | 'green' | 'blue' | 'lilac' | 'purple' | 'white' | 'silver' | 'brown' | 'rainbow';
/** The six natural hair shades, then the palette: three rails of six. */
export type HairColour = 'sunny' | 'honey' | 'strawberry' | 'auburn' | 'chestnut' | 'midnight' | Colour;
export type EyeColour = 'blue' | 'green' | 'brown' | 'hazel' | 'grey' | 'violet';
/** The dress shapes: party, ball gown, ball gown with gloves (2.2's lilac gown), tutu. */
export type GownShape = 'party' | 'ball' | 'gala' | 'tutu';
/** Worn with any gown: 2.2's fairy wings and the ball gowns' back bow. */
export type GownExtra = 'none' | 'wings' | 'bow';
export type HairStyle =
  | 'ponytails' | 'high' | 'plaits' | 'bun' | 'low' | 'side' | 'curly' | 'bunches' | 'long' | 'curls' | 'plait' | 'lowbun';
export type CrownShape = 'lumi' | 'tiara' | 'star' | 'heart' | 'flower';
export type ShoeShape = 'slippers' | 'bows' | 'boots' | 'stars';
export type HairThing =
  | 'bows' | 'unicorn' | 'flowers' | 'stars' | 'butterflies' | 'hearts' | 'shells' | 'moons' | 'daisies' | 'cherries';
export type Earrings = 'none' | 'studs' | 'hearts' | 'stars' | 'drops';
export type Necklace = 'none' | 'pearls' | 'heart';
/** Lumi's goodnight ribbons (2.2.0): a set on the treasure board; each one is a palette colour for her hair things. */
export type Ribbon = 'pink' | 'lilac' | 'sky' | 'mint' | 'gold' | 'coral';
/** Ids only, never colours, so palettes can be tuned without breaking a save. */
export interface PrincessLook {
  hair: HairColour;
  style: HairStyle;
  eyes: EyeColour;
  gown: GownShape;
  gownColour: Colour;
  extra: GownExtra;
  crown: CrownShape;
  crownColour: Colour;
  shoes: ShoeShape;
  shoeColour: Colour;
  thing: HairThing;
  /** Her hair things' colour (2.2's ribbon colour). */
  thingColour: Colour;
  earrings: Earrings;
  necklace: Necklace;
  /** The earrings' and the necklace's colour. */
  jewelColour: Colour;
}
/** One field of the look: what one rail (or a run of colour rails) sets. */
export type LookField = keyof PrincessLook;
/** The wardrobe's six fixed tabs, in the icon column. */
export type LookTab = 'hair' | 'eyes' | 'gown' | 'crown' | 'shoes' | 'sparkles';
/** The look fields that are earned (2.3 section 5). Colours, eyes, gown shapes and extras are always all hers. */
export type OwnedField = 'crown' | 'shoes' | 'earrings' | 'necklace' | 'style' | 'thing';
/** The items she owns per earned field, in the order she got them. */
export type Owned = { [F in OwnedField]: PrincessLook[F][] };
/** One item of a gift set. */
export type GiftItem = { [F in OwnedField]: { field: F; id: PrincessLook[F] } }[OwnedField];
/** The four gift sets, each paid by one quest (2.3 section 5). */
export type GiftSet = 'crowns' | 'shoes' | 'jewels' | 'hair';
/** toss, blink, show, tilt and curtsy are the wardrobe's reactions (2.2.md 2.4). */
export type PrincessEmote = 'wave' | 'clap' | 'jump' | 'twirl' | 'toss' | 'blink' | 'show' | 'tilt' | 'curtsy';

export interface Princess {
  readonly position: THREE.Vector3;
  readonly mode: PrincessMode;
  /** Walk (or run) a route. Resolves true on arrival, false when replaced by another command. */
  walkTo(route: Vec2[], o?: { run?: boolean }): Promise<boolean>;
  stop(): void;
  /** Climb the slide, slide into the pond, swim to the nearest exit and climb out. Resolves when she stands on the grass again. */
  rideSlide(): Promise<void>;
  /** One short animation. Resolves when it ends. */
  emote(kind: PrincessEmote): Promise<void>;
  /** Turn towards a point. */
  face(p: Vec2): void;
  crown(on: boolean): void;
  readonly look: PrincessLook;
  /**
   * Change her look; missing fields keep what she wears. Cheap on every slider step: colours at once, cached dress,
   * crown and shoe geometry, new chains only on a style change. No new materials, programs, draw calls or per-frame
   * allocations. Goodnight gives a new hair-thing colour with setLook({ thingColour }).
   */
  setLook(look: Partial<PrincessLook>): void;
  /** Stand still for the portrait: no random look-around. */
  hold(on: boolean): void;
  /** Turn from the current heading (preview drag); face() eases back. */
  turnBy(rad: number): void;
  /** World points for sparkles and framing. */
  point(part: 'head' | 'eyes' | 'thing' | 'dress', out?: THREE.Vector3): THREE.Vector3;
  /** A day-only extra (the picnic rose), drawn beside her hair thing. Never saved. */
  extra(kind: 'rose' | null): void;
  /** Finer shapes while the camera is close (wardrobe only). */
  portrait(on: boolean): void;
}

export interface Egg3D {
  /** Show an egg at a point (resting in the nest or on the grass). `kind` decides the shell. */
  place(at: THREE.Vector3, kind: 'warm' | 'snow'): void;
  hide(): void;
  readonly position: THREE.Vector3;
  readonly visible: boolean;
  /** Small happy wobble (waiting, or a cup warmed). */
  wobble(): Promise<void>;
  /** Too hot: red cheeks and steam. */
  steam(): Promise<void>;
  /** Too cold: frost and a shiver. */
  frost(): Promise<void>;
  /** Cracks, a big wobble and a burst of sparkles. Resolves at the burst, when the baby should appear. */
  hatch(): Promise<void>;
  /**
   * How many of its three hearts are lit (2.3 sections 12 and 19.1): its idle wobble grows with each, and it glows
   * more: the warm egg a warmer gold, the snow egg a frostier blue (its story is that it is too warm). 0 is today's
   * egg. place() and hide() set it back to 0.
   */
  hearts(lit: 0 | 1 | 2 | 3): void;
}

export interface Fx {
  sparkle(at: THREE.Vector3, o?: { count?: number; colour?: string }): void;
  hearts(at: THREE.Vector3): void;
  splash(at: THREE.Vector3): void;
  /** Stars falling from the sky onto a point (the crown, the ribbons, the wild egg arriving). */
  starfall(at: THREE.Vector3): Promise<void>;
  /** A moonbeam from the sky to a point for `ms` (the wild egg landing). */
  moonbeam(at: THREE.Vector3, ms: number): Promise<void>;
}

export interface ActorDeps {
  /** World routing, so walkers go around obstacles. */
  route(from: Vec2, to: Vec2): Vec2[];
  isWalkable(p: Vec2): boolean;
  nearestWalkable(p: Vec2): Vec2;
}

export interface Actors {
  readonly princess: Princess;
  readonly herd: Herd;
  readonly egg: Egg3D;
  readonly fx: Fx;
  /** Advance every actor; call once per frame. */
  update(dt: number, t: number): void;
  /** Make the herd cheaper on a slow iPad: 0 full, 1 and 2 fewer full-detail unicorns, cheap ones posed less often. */
  setDetail(level: 0 | 1 | 2): void;
}

// ---------------------------------------------------------------------------------------------------------------
// content (src/content/index.ts): the data each moment needs, with its clip ids. Pure functions, unit tested.
// ---------------------------------------------------------------------------------------------------------------

export interface HerdMember {
  id: string;
  name: string;
  /** The Elizabeth clip of the name ("Rosie!"), from v3's names-t1 pack. */
  clip: string;
  door: number;
  look: UnicornLook;
}

/** Why a wrong stone is in the tray (2.2.0 section 4.1). */
export type StoneDecoy = 'slip' | 'heard' | 'first-nest' | 'second-nest' | 'near';
/**
 * An egg's three sums (2.3 sections 12 and 19.1): easy within 10 (total 7 to 10), middle just past 10 (total 11 or 12),
 * hard across ten at her band (total 13 and more). Only the hard sum and the hay rack move the band.
 */
export type SumGrade = 'easy' | 'middle' | 'hard';

/** An egg, or the hay rack: a 'warm' spec (adding across ten) with skin 'hay'. */
export interface EggSpec {
  kind: 'warm' | 'snow';
  /** Cups the egg needs to be warm. */
  need: number;
  /** Cups warm now (below need for 'warm', above need for 'snow'). */
  have: number;
  /** The stone that is right: need - have for 'warm', have - need for 'snow'. */
  answer: number;
  /**
   * Different stones from 3 to 9, ascending, the answer among them: 4 for band A and for every easy and middle sum,
   * 5 for band B's hard sum and hay rack.
   */
  stones: number[];
  /** The maths band the numbers come from (4.2). Absent for an easy or middle sum, which has no band. */
  band?: 'a' | 'b';
  /** Why each wrong stone is in the tray, by stone number, for the log. */
  decoys?: Record<number, StoneDecoy>;
  /** The panel's look: the egg and its cups (the default), or the hay rack's bundles and piles. */
  skin?: 'egg' | 'hay';
  /** Which of the egg's three sums this is (2.3 section 12). Absent for the hay rack. */
  grade?: SumGrade;
  /**
   * The egg's hearts: `index` are lit when the panel opens, the next one lights after the right stone. With index 1
   * or 2 the panel the sum before left on screen takes the new cups and stones (layer.egg does not close it).
   */
  round?: { index: 0 | 1 | 2; of: 3 };
  clips: {
    /** The first time this kind of egg is seen: how the egg works ("Make every cup warm, and the egg will hatch."). */
    intro: string[];
    /** The goal, said at the start, on idle and on a replay tap. */
    goal: string[];
    /** Said once after the first goal, when present: how to play ("Drag one stone to the nest."). */
    afterGoal?: string[];
    /** After the right stone: the praise and the fact ("Every cup is warm!", "Eight and five make thirteen!"). */
    right: string[];
    /** After a stone that is k too big. */
    tooBig(k: number): string[];
    /** After a stone that is k too small. */
    tooSmall(k: number): string[];
    /** The focused hint before counting ("Let's count the cold cups."). */
    hint: string[];
    /** Counting clips for the hint: count[i] says the number i + 1 ("One.", "Two.", ...). */
    count: string[];
  };
}

export interface NameChoice {
  name: string; // "Pip"
  /** Grapheme split, lower case ("p", "i", "p"); the first gem is shown as a capital ("P"). */
  gpcs: string[];
  /** Elizabeth's clip of the name ("Pip!"). */
  clip: string;
  /**
   * Wrong gems for the tray: 3 (naming 1: a near capital, a near vowel, a near consonant) or 4 (naming 2: a near
   * capital, both near vowels, a near consonant). The capital is a decoy for slot 1.
   */
  distractors: string[];
}

export interface NamingSpec {
  bells: NameChoice[]; // three
  clips: {
    bells: string[]; // "Your baby needs a name! Tap a bell to hear a name."
    drag: string[]; // "Drag the name you like to your baby."
    spell: string[]; // "Let's write the name on the tag. Listen." (then the name clip)
    gems: string[]; // "Put the gems in the slots."
    slide: string[]; // "Now slide the star, and listen."
    done: string[]; // "You wrote your baby's name!"
    again: string[]; // after a wrong build: "Hmm. Listen again."
  };
}

export interface WishItem {
  word: string; // "plum"
  gpcs: string[]; // ["p", "l", "u", "m"]
  pic: string; // picture URL (v3 word art)
  /** A greyscale picture's colour, multiplied over it (v3's tint.default): cup, mug, hat, dress... */
  tint?: string;
  clip: string; // "word-plum"
  /** Grapheme tier of v3's word pack: 1 phase2, 2 phase3-4, 3 year1. */
  tier: 1 | 2 | 3;
  /** How the baby takes it: munch (food), play (a toy, a dish, a mug), wear (on its head). Without it, by the kind. */
  react?: 'munch' | 'play' | 'wear';
  /**
   * A phrase wish's printed words in order ("the", the colour, the thing), each with its graphemes. `word` is then
   * the colour and the thing ("green sock", the log key), `gpcs` all graphemes of both, and `clip` the phrase's clip
   * ("The green sock."). "the" is printed but never sounded out and never decides an answer. `sounds` are the
   * letter sounds the hint plays when they differ from the written graphemes (the o of gold says oa, bow's ow says oa).
   */
  parts?: { word: string; gpcs: string[]; sounds?: string[] }[];
}

/** Why a wrong item is in the basket (3.1). */
export type WishDecoy = 'twin' | 'frame' | 'onset' | 'rhyme' | 'ending' | 'length' | 'other';

export interface WishSpec {
  /** 'phrase' (2.3): "the" + a colour + a thing, at the Dressing Corner gate. */
  kind: 'food' | 'bath' | 'picnic' | 'dress' | 'phrase';
  target: WishItem;
  /** The items in basket order (4 at reading level 1, 5 at 2 and 3), the target among them, no look-alikes. */
  basket: WishItem[];
  /** The reading level the basket was planned at, for the log. */
  level: 1 | 2 | 3;
  /** Why each wrong item is in the basket, by word, for the log. */
  decoys: Record<string, WishDecoy>;
  clips: {
    intro: string[]; // "Your baby has a wish!" "Read the wish, and feed your baby."
    goal: string[]; // the short repeat on idle and replay
    right: string[]; // "Yes!" (the word clip follows, said by the ui)
    hint: string[]; // "Listen to the sounds."
    /**
     * After a miss's contrast tag ("Look at the letters again."). Without it a miss keeps v3's rule (the focused
     * hint at once), which is how ?contrast=0 reaches the ui.
     */
    again?: string[];
  };
}

/** A bead on a pattern string (2.3 section 6): a shape in a colour. */
export type BeadShape = 'heart' | 'star' | 'moon' | 'round';
export interface Bead {
  shape: BeadShape;
  colour: Colour;
}
export type PatternKind = 'AAB' | 'ABB' | 'ABC' | 'AABB';
/** Why a wrong tray bead is wrong for a gap: the bead left of the gap, the other unit, its colour or its shape only, or nothing it shares (an ABC cross bead). */
export type PatternDecoy = 'copy' | 'unit' | 'colour' | 'shape' | 'other';

/** The bead tree's necklace: a string of 9 beads with 3 gaps, filled left to right, and one tray for every gap. */
export interface PatternSpec {
  kind: PatternKind;
  /** The pattern level (its own small level, 1 to 3) the string was planned at. */
  level: 1 | 2 | 3;
  /** The whole string, left to right, gaps included. */
  string: Bead[];
  /** The 3 gap places (indexes into `string`), ascending: the order she fills them in. */
  gaps: number[];
  /** The tray: 3 beads at level 1, 4 at levels 2 and 3. A tray bead never runs out. */
  tray: Bead[];
  /** Per gap (same order as `gaps`): why each wrong tray bead is wrong, by tray index. */
  decoys: Record<number, PatternDecoy>[];
  clips: {
    /** Once per play, before the first goal ("A necklace for your baby! Finish the pattern."). */
    intro: string[];
    /** The goal, said at the start, on idle and on a replay tap ("Finish the pattern."). */
    goal: string[];
    /** After a miss, with the light contrast ("Look at the pattern again."). */
    again: string[];
    /** The focused hint before the repeat lights up ("Let's look at the pattern."). */
    hint: string[];
    /** After the third gap ("What a pretty necklace!"). */
    done: string[];
  };
}

export interface DoorSpec {
  /** The door to tap. */
  door: number;
  /** What Elizabeth says ("Pip!", "Off to door nine!" or "Door twelve, bedtime!"). */
  goal: string[];
  /** After a wrong door d: what she says ("That is eleven."). */
  wrong(d: number): string[];
  /** The focused hint, said while the row glows ("Look at the numbers on the doors."). */
  hint?: string[];
}

// ---------------------------------------------------------------------------------------------------------------
// ui (src/ui/index.ts exports createLayer): the 2D layer over the canvas. Plain DOM, pointer events, no text to read
// except the printed words that are the learning (wish words, name gems, numerals on stones).
// ---------------------------------------------------------------------------------------------------------------

/** What a moment needs from the 3D world while it runs. */
export interface MomentHooks {
  /** Where the egg or the baby is on screen right now (called every frame). */
  anchor(): ScreenPoint;
  /**
   * A 3D reaction to show. The game maps it onto the egg or the baby. 'heart': an egg's next heart has lit on the
   * panel (the game calls Egg3D.hearts).
   */
  react(kind: 'hot' | 'cold' | 'warm' | 'right' | 'wrong' | 'munch' | 'play' | 'wear' | 'happy' | 'shake' | 'look' | 'heart'): void;
  /**
   * Log line for the results log. Every wrong choice is logged as log('tried', { what }) with what she chose as a
   * string (the stone number, the item word, the built name); the game keeps them in the result's detail.tried.
   */
  log?(event: string, data?: Record<string, unknown>): void;
}

export interface NamingHooks extends MomentHooks {
  /** She dropped a bell on the baby: this name is chosen. */
  chosen(name: NameChoice): void;
}

export interface Layer {
  readonly root: HTMLElement;
  /**
   * The start screen with the big Play button. `onTap` runs synchronously inside the button's pointerdown handler,
   * so the game can call audio.unlock() there (iOS). Resolves when the start screen has faded out.
   */
  start(onTap: () => void): Promise<void>;
  /** Fade the whole screen to a colour and back (between parts). */
  curtain(on: boolean, colour?: string): Promise<void>;
  /** Lumi's portrait in the moon, top left. `speak` shows her talking while the clips play (queen voice). */
  lumi: {
    show(on: boolean): void;
    speak(clips: string[]): Promise<void>;
    /** A tap on Lumi (the replay of the current goal). */
    onTap(fn: () => void): void;
  };
  /**
   * The checked moments. Each resolves when the moment is done (right answer given, or helped). An egg sum with
   * `round.index` 1 or 2 opens on the panel the sum before left on screen; every other moment closes the open one.
   */
  egg(spec: EggSpec, hooks: MomentHooks): Promise<MomentResult>;
  naming(spec: NamingSpec, hooks: NamingHooks): Promise<MomentResult & { name: NameChoice }>;
  wish(spec: WishSpec, hooks: MomentHooks): Promise<MomentResult>;
  /** Repeat the goal of the open moment (Lumi tap). Returns false when no moment is open. */
  replay(): boolean;
  /** The ghost hand: a tap at a point, or a drag from a to b. Resolves when the demonstration ends. */
  ghost: {
    tap(at: () => ScreenPoint): Promise<void>;
    drag(from: () => ScreenPoint, to: () => ScreenPoint): Promise<void>;
    hide(): void;
  };
  /** The glowing picture arrow at the screen edge for an off-screen goal. Tapping it calls onTap. */
  arrow(goal: { place: Place; at: () => ScreenPoint } | null, onTap?: () => void): void;
  /** A name tag over a unicorn for a moment (the printed name). */
  tag(name: string, at: () => ScreenPoint, ms?: number): void;
  /**
   * The wardrobe (2.3 section 16): six fixed tabs in the icon column, at most five rails of six per tab (wardrobe.ts
   * railsOf: every field keeps its own rows, so nothing moves when she earns an item), Princess Emma in 3D on the
   * left and a music box under her. Rails show only what she owns. Picking a palette colour says its name; a pick
   * that says a word plays no effect. `clips.ready` plays on every open, `clips.firstTime` after it on the first
   * visit, `clips.idle` once after 25 s without a touch, `clips.nearly` 15 s before the end, `clips.done` at the end.
   * The music box plays for `limitMs` while six moon beads fade; then the panel waits until no finger is down (read
   * from window, at most 2 s) and ends kindly. Done (pointerdown) ends it sooner. `onBox` says when the music box
   * starts and stops (the Corner's free time is the box's time). Resolves with her look and how it ended; the panel
   * then slides out by itself. With `board` the trunk lid's treasure board shows first.
   */
  wardrobe(o: {
    look: PrincessLook;
    owned: Owned;
    /** The crown tab shows only once Lumi has given the crown; until then its place stays empty. */
    crownTab: boolean;
    firstTime: boolean;
    limitMs: number;
    board?: BoardSpec;
    clips: { ready: string[]; firstTime: string[]; idle: string[]; nearly: string[]; done: string[] };
    onLook(look: PrincessLook, field: LookField): void;    // apply to 3D (gown, crown, shoes and style 150 ms after settle)
    onPicked(look: PrincessLook, field: LookField): void;  // gesture ended or tab tapped (also with no change): react, save
    onFocus(tab: LookTab | null): void;                     // face or body frame
    onTurn(dxPx: number, ended: boolean): void;             // preview drag
    onPreviewTap(): void;
    onBox?(on: boolean): void;                              // the music box started (true) or stopped (false)
  }): Promise<{ look: PrincessLook; end: 'done' | 'time' }>;
  /**
   * The gift picker (2.3 sections 5 and 17.2): one or two big cards with a gift each, after a quest. A card acts on
   * pointerdown; the other card fades, the chosen one pops open and its sparkles fly to `to` (Princess Emma on
   * screen, who puts it on and keeps it). `clips` play first ("Pick one present!"). Resolves with the chosen item once
   * the sparkles have landed (about 1.6 s after the pick); the caller saves it then. `items` is never empty: with no
   * items it rejects at once (no picker when every set is full).
   */
  gift(o: { items: GiftItem[]; look: PrincessLook; clips: string[]; to: () => ScreenPoint }): Promise<GiftItem>;
  /**
   * The trunk lid's treasure board on its own for `ms` (3.5 s), when she taps the trunk after her Corner visit. Not a
   * target, never a refusal. Resolves when it has folded away.
   */
  board(spec: BoardSpec, ms?: number): Promise<void>;
  /**
   * The bead tree's pattern moment (2.3 sections 6 and 19.2): the string over the baby, the tray below. Each gap is
   * its own checked choice with its own hint ladder; `gap` is called when a gap is filled. With `demo` (her first
   * visit ever) the ghost carries the right bead into the first gap before the tray wakes. Resolves with the three
   * results in gap order, after `clips.done`.
   */
  beads(spec: PatternSpec, hooks: MomentHooks & { gap(i: number, r: MomentResult): void }, o?: { demo?: boolean }): Promise<MomentResult[]>;
  /**
   * A side quest's offer bubble (2.2 section 5): a picture in a bubble that follows `at` every frame and acts on
   * pointerdown. `tint` colours a greyscale picture (the bead tree's bead). `badge` is a small picture on the
   * bubble's rim (2.3: the swatch of a gift the quest can still give, swatches.ts giftSwatchUrl). One per id; null
   * takes it away.
   */
  offer(id: string, o: { pic: string; tint?: string; badge?: string; at: () => ScreenPoint; onTap(): void } | null): void;
  /**
   * A box on screen that bubbles and cards keep clear of (2.3.0: Princess Emma in the afternoon): the offer bubbles
   * and a wish bubble move up above it, the gift cards move beside it when there is room. Called every frame; null
   * (or a call that returns null) keeps nothing clear. reset() clears it.
   */
  keepClear(box: (() => ScreenBox | null) | null): void;
  /** Free play: the food basket button (bottom right). A dragged food dropped on screen calls drop(word, x, y). */
  foodBasket(o: { show: boolean; foods?: WishItem[]; drop?(item: WishItem, x: number, y: number): boolean }): void;
  /**
   * The end of the level: stars, the herd as little pictures, and a big moon button to play again. Resolves when that
   * button is tapped. With `members`, each picture is tinted towards that member's coat and mane, and the new ones
   * come first, bigger, with their name tag.
   */
  theEnd(o: { herd: number; members?: EndMember[] }): Promise<void>;
  /**
   * A soft CSS colour wash for the time of day, eased over about 2 s, no draw calls: 0 day (none), 0.5 sunset (a
   * gentle pink-gold wash at the edges), 1 night (a faint deep-blue vignette).
   */
  sky(t: number): void;
  /** ?perf=1: a small stats box. */
  perf(text: string): void;
  /** Close everything that is open (for jump()). */
  reset(): void;
}

/** The trunk lid's treasure board (2.3 sections 3 and 16): every gift set, what she owns, what is new today. */
export interface BoardSpec {
  owned: Owned;
  /** Gifts she got today: they sparkle on the board and pop out of the trunk first. */
  fresh: GiftItem[];
  ribbons: Ribbon[];
  /** The picture of the quest that fills each set, shown in its empty places. */
  pics: Record<GiftSet, string>;
  /** A greyscale picture's colour (2.3.0: the bead tree's bead is pink, as on its bubble). */
  tints?: Partial<Record<GiftSet, string>>;
}

/** One unicorn of the herd on the end screen. Colours are CSS hex strings. */
export interface EndMember {
  name: string;
  body: string;
  mane: string;
  /** One of the two babies she hatched today. */
  isNew?: boolean;
}

export interface LayerDeps {
  /** Screen point to ground hit test for drops onto the world, if the ui needs it. */
  toScreen?(p: THREE.Vector3): ScreenPoint;
}
