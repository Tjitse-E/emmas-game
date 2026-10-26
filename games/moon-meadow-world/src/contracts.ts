// Contracts between the demo's parts. Each lane implements its side in its own folder and only depends on this file,
// src/layout.ts, src/assets.ts and src/audio/index.ts. Changing a contract means changing every side that uses it.
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
  /** World things under a screen point, nearest first by priority: door, slide, nest, gazebo, pond, ground. */
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
  /** Show a small toy next to it in the water or on the grass (the bath wish), as a 3D floating picture. */
  showToy(pictureUrl: string | null): void;
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

export interface Princess {
  readonly position: THREE.Vector3;
  readonly mode: PrincessMode;
  /** Walk (or run) a route. Resolves true on arrival, false when replaced by another command. */
  walkTo(route: Vec2[], o?: { run?: boolean }): Promise<boolean>;
  stop(): void;
  /** Climb the slide, slide into the pond, swim to the nearest exit and climb out. Resolves when she stands on the grass again. */
  rideSlide(): Promise<void>;
  emote(kind: 'wave' | 'clap' | 'jump' | 'twirl'): Promise<void>;
  /** Turn towards a point. */
  face(p: Vec2): void;
  crown(on: boolean): void;
  /** Ribbon colour in her ponytails (CSS hex). */
  ribbons(colour: string): void;
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

export interface EggSpec {
  kind: 'warm' | 'snow';
  /** Cups the egg needs to be warm. */
  need: number;
  /** Cups warm now (below need for 'warm', above need for 'snow'). */
  have: number;
  /** The stone that is right: need - have for 'warm', have - need for 'snow'. */
  answer: number;
  /** Three different stones from 3 to 9, ascending, the answer among them. */
  stones: number[];
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
  /** Two wrong gems for the tray (plausible: a near vowel, a near consonant). */
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
  clip: string; // "word-plum"
}

export interface WishSpec {
  kind: 'food' | 'bath';
  target: WishItem;
  /** Three items in basket order, the target among them, no look-alikes. */
  basket: WishItem[];
  clips: {
    intro: string[]; // "Your baby has a wish!" "Read the wish, and feed your baby."
    goal: string[]; // the short repeat on idle and replay
    right: string[]; // "Yes!" (the word clip follows, said by the ui)
    hint: string[]; // "Listen to the sounds."
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
  /** A 3D reaction to show. The game maps it onto the egg or the baby. */
  react(kind: 'hot' | 'cold' | 'warm' | 'right' | 'wrong' | 'munch' | 'play' | 'happy' | 'shake' | 'look'): void;
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
  /** The checked moments. Each resolves when the moment is done (right answer given, or helped). */
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
