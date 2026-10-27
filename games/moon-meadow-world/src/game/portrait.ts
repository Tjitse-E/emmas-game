// The customiser's camera (docs/v4/2.2.md 2.4): Princess Emma close up on the left, the panel on the right. The world
// camera always looks at a ground point from the south, so this pure helper puts that ground point on the line of
// sight through a point `lookY` above her, behind her, and moves it east so she stands in the middle of the space left
// of the panel. world.frame(center, width, { pitch, shiftY: 0 }) then puts the camera at L + d (0, sin p, cos p),
// looking at L = (her.x + ox, lookY, her.z). shiftY 0 keeps frame() from making a low pitch into a sky shot.
import type { LookRow, Vec2 } from '../contracts';
import { FOV } from '../world/camera';

export type PortraitKind = 'body' | 'face';

/** hvis: metres seen top to bottom at her; lookY: the height at the middle of the screen; pitch in degrees. */
export const PORTRAIT: Record<PortraitKind, { hvis: number; lookY: number; pitch: number }> = {
  /** Hair colour, gown, style and the default: all of her, feet at about 77%. */
  body: { hvis: 2.08, lookY: 0.58, pitch: 8 },
  /** Eyes and hair things: her head about 390 px high. */
  face: { hvis: 1.05, lookY: 1.08, pitch: 6 },
};

/** The rows that bring the camera to her face. */
export const FACE_ROWS: readonly LookRow[] = ['eyes', 'thing'];
/** A face frame goes back to the body frame this long after the last touch on a face row. */
export const FACE_RETURN_MS = 2500;
/** The first move into the portrait, and every move between the frames. */
export const ENTER_MS = 900;
export const MOVE_MS = 500;

export const portraitKind = (row: LookRow | null): PortraitKind => (row && FACE_ROWS.includes(row) ? 'face' : 'body');

/**
 * The panel's left edge in CSS px: anchored 16 design px from the right, 628 wide (2.2). The ui lane's
 * wardrobeLayout(w, h).panel gives the same number; this copy keeps the helper pure until the lanes meet.
 */
export function panelLeftOf(w: number, h: number): number {
  const unit = Math.min(w / 1180, h / 820);
  return w - (16 + 628) * unit;
}

export interface PortraitFrame {
  kind: PortraitKind;
  /** For world.frame(center, width, { pitch, shiftY: 0 }). */
  center: Vec2;
  width: number;
  pitch: number;
  /** Where the camera ends up, and the point it looks through (world space). */
  camera: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
}

/**
 * The frame for a row (null: the body frame). `screen.panelLeft` is the panel's left edge: she stands at half of it,
 * the middle of the preview. `halfFov` is half the camera's vertical field of view in degrees.
 */
export function portraitFrame(her: Vec2, row: LookRow | null, screen: { w: number; h: number; panelLeft: number }, halfFov = FOV / 2): PortraitFrame {
  const kind = portraitKind(row);
  const { hvis, lookY, pitch } = PORTRAIT[kind];
  const t = Math.tan((halfFov * Math.PI) / 180);
  const p = (pitch * Math.PI) / 180;
  const aspect = screen.w / screen.h;
  const d = hvis / (2 * t);
  const xFrac = screen.panelLeft / 2 / screen.w;
  const ox = (1 - 2 * xFrac) * d * t * aspect;
  const look = { x: her.x + ox, y: lookY, z: her.z };
  return {
    kind,
    center: { x: look.x, z: her.z - lookY / Math.tan(p) },
    width: (d + lookY / Math.sin(p)) * 2 * t * aspect,
    pitch,
    camera: { x: look.x, y: lookY + d * Math.sin(p), z: her.z + d * Math.cos(p) },
    look,
  };
}
